import { startCognitionLabFixture } from '../../../tests/fixtures/cognition-lab.js';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CognitionLabCurrent,
  CognitionLabReceipt,
  CognitionLabRun,
  CognitionLabWorkspace,
} from '@open-legend/protocol';
import type { AiReceipt } from '@open-legend/ai';
import { entityGet } from '@open-legend/domain';
import pg from 'pg';
import { WorldService } from './world-service.js';
import { CognitionLabRunController } from './cognition-lab-control.js';
import type { AppConfig } from './config.js';
import { performanceSnapshot } from './performance.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
  vi.unstubAllGlobals();
}, 120_000);
async function start(
  withAi = false,
  withMacrofold = false,
  configure?: (config: AppConfig) => void,
) {
  const fixture = await startCognitionLabFixture({
    withAi,
    ...(withMacrofold || configure
      ? {
          prepareGame: async (_store, config) => {
            if (withMacrofold) {
              config.macrofoldKey = 'fixture-only-key';
              config.macrofoldUrl = 'https://macrofold.fixture.invalid';
            }
            configure?.(config);
          },
        }
      : {}),
  });
  cleanup.push(fixture.close);
  const { base, cookie } = fixture;
  const get = async <T>(path: string, authorizationCookie = cookie) => {
    const response = await fetch(`${base}/api/cognition-lab${path}`, {
      headers: { Cookie: authorizationCookie },
    });
    const body = (await response.json()) as T;
    expect(response.status, JSON.stringify(body)).toBe(200);
    return body;
  };
  const post = async (body: unknown, authorizationCookie = cookie) => {
    const response = await fetch(`${base}/api/cognition-lab/operations`, {
      method: 'POST',
      headers: {
        Cookie: authorizationCookie,
        Origin: base,
        'X-OL-Lab-Owner': fixture.workspace.operationOwnerScope,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as CognitionLabReceipt };
  };
  return { ...fixture, get, post };
}

const expected = (workspace: CognitionLabWorkspace) => ({
  runtimeGeneration: workspace.runtimeGeneration,
  scenarioRevision: workspace.scenarioRevision,
});

describe('isolated lab HTTP journey', () => {
  it.each(['How is your day?', 'Ada, shall we share the berries while we talk?'])(
    'uses ordinary speech once, captures the actual native calls, and can repeat after restoring its origin (%s)',
    async (text) => {
      const inspectReceipt = text === 'How is your day?';
      const nativeFetch = fetch;
      const providerReads: string[] = [];
      let holdFirstReceiptResult = false;
      let releaseOldReceipt: (() => void) | undefined;
      let firstReceiptResultReady: () => void;
      const firstReceiptResult = new Promise<void>((resolve) => {
        firstReceiptResultReady = resolve;
      });
      if (inspectReceipt)
        vi.stubGlobal(
          'fetch',
          vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input));
            if (url.hostname !== 'macrofold.fixture.invalid') return nativeFetch(input, init);
            providerReads.push(url.pathname);
            expect(init?.method).toBe('GET');
            if (url.pathname === '/v1/runs/receipt-fixture')
              return Response.json({ id: 'receipt-fixture', kind: 'inference', status: 'failed' });
            if (url.pathname === '/v1/runs/receipt-fixture/result') {
              const result = (providerOutcome: 'uncertain' | 'responded') =>
                Response.json({
                  run_id: 'receipt-fixture',
                  final: true,
                  execution_outcome: 'failure',
                  inference: {
                    outcome: 'failed',
                    provider_outcome: providerOutcome,
                    usage: { completeness: 'missing' },
                  },
                });
              if (holdFirstReceiptResult) {
                holdFirstReceiptResult = false;
                return new Promise<Response>((resolve) => {
                  releaseOldReceipt = () => resolve(result('uncertain'));
                  firstReceiptResultReady();
                });
              }
              return result('responded');
            }
            if (
              url.pathname === '/v1/runs/receipt-fixture/events' ||
              url.pathname === '/v1/billing/usage'
            )
              return Response.json({ data: [], next_cursor: null });
            throw new Error(`Unexpected fixture provider read: ${url.pathname}`);
          }),
        );
      const h = await start(true, inspectReceipt);
      const stimulus = {
        kind: 'say',
        actorId: h.workspace.defaults.actorId!,
        targetId: h.workspace.defaults.targetId!,
        text,
        volume: h.workspace.defaults.volume,
      };
      const operation = {
        commandId: randomUUID(),
        kind: 'submitStimulus',
        expected: expected(h.workspace),
        stimulus,
        policy: {
          ...h.workspace.settings.policy,
          focalActorId: stimulus.targetId,
          autonomousActorIds: [stimulus.targetId],
        },
      };
      const beforeGame = h.game.service.world.sequence;
      const accepted = await h.post(operation);
      expect(accepted.body, JSON.stringify(accepted)).toMatchObject({
        ok: true,
        sourceAccepted: true,
      });
      await expect
        .poll(async () => (await h.get<CognitionLabWorkspace>('/workspace')).state, {
          timeout: 30_000,
        })
        .toBe('held');
      expect(
        h.calls.length,
        JSON.stringify(await h.get<CognitionLabWorkspace>('/workspace')),
      ).toBeGreaterThan(0);
      expect(h.calls.some((call) => 'task' in call && call.task === 'npc_response')).toBe(true);
      const settledCalls = h.calls.length;
      const repeated = await h.post(operation);
      expect(repeated.body.sourceId).toBe(accepted.body.sourceId);
      expect(h.calls).toHaveLength(settledCalls);
      expect(h.game.service.world.sequence).toBe(beforeGame);
      let latest = await h.get<CognitionLabWorkspace>('/workspace');
      const run = latest.run!;
      expect(run.reason).not.toContain('limit reached');
      const speech = await h.get<{
        items: Array<{ runId?: string; actorId?: string; text: string }>;
      }>('/events?kind=speech');
      expect(
        speech.items.filter(
          (event) =>
            event.runId === run.id &&
            event.actorId === stimulus.targetId &&
            event.text.includes('Yes, let us talk.'),
        ),
      ).toHaveLength(1);
      const roots = await h.get<{ items: Array<{ id: string; kind: string }> }>(
        `/runs/${run.id}/records?kind=root`,
      );
      expect(roots.items).toHaveLength(1);
      expect(roots.items[0]?.kind).toBe('root');
      const calls = await h.get<{
        items: Array<{ id: string; kind: string; artifacts: Array<{ id: string }> }>;
      }>(`/runs/${run.id}/records?kind=stage&rootId=${roots.items[0]!.id}`);
      expect(calls.items.length).toBeGreaterThan(0);
      if (inspectReceipt) {
        const client = new pg.Client({ connectionString: h.labDatabaseUrl });
        await client.connect();
        try {
          await client.query('SET search_path TO open_legend');
          const stageId = calls.items[0]!.id;
          const stage = await client.query<{ source_id: string }>(
            'SELECT source_id FROM cognition_lab.records WHERE id=$1',
            [stageId],
          );
          const attemptId = stage.rows[0]!.source_id;
          const native = await client.query<{ receipt: string; reserved: string }>(
            'SELECT receipt,reserved FROM attempts WHERE id=$1',
            [attemptId],
          );
          const uncertain: AiReceipt = {
            ...JSON.parse(native.rows[0]!.receipt),
            providerRequestId: 'receipt-fixture',
            macrofoldBillingMode: 'byok',
            estimatedCostUsd: undefined,
            completionUncertain: true,
          };
          // This owned fixture models interrupted receipt delivery; no provider was invoked.
          await client.query(
            "UPDATE attempts SET status='uncertain',receipt=$2,spent=reserved WHERE id=$1",
            [attemptId, JSON.stringify(uncertain)],
          );
          await client.query(
            'UPDATE cognition_lab.attempts SET payload=$2,cost_usd=NULL,completion_uncertain=true WHERE attempt_id=$1',
            [attemptId, JSON.stringify(uncertain)],
          );
          await client.query(
            'UPDATE cognition_lab.costs SET unknown_count=unknown_count+1,uncertain_count=uncertain_count+1 WHERE run_id=$1',
            [run.id],
          );
          const refresh = () =>
            fetch(`${h.base}/api/cognition-lab/runs/${run.id}/stages/${stageId}/receipt`, {
              method: 'POST',
              headers: {
                Cookie: h.cookie,
                Origin: h.base,
                'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
                'Content-Type': 'application/json',
              },
              body: '{}',
            });
          // Imported claims cannot redirect a locally owned receipt to a foreign Run.
          await client.query('UPDATE cognition_lab.attempts SET payload=$2 WHERE attempt_id=$1', [
            attemptId,
            JSON.stringify({ ...uncertain, providerRequestId: 'foreign-run' }),
          ]);
          expect((await refresh()).status).toBe(404);
          expect(providerReads).toHaveLength(0);
          await client.query('UPDATE cognition_lab.attempts SET payload=$2 WHERE attempt_id=$1', [
            attemptId,
            JSON.stringify(uncertain),
          ]);
          holdFirstReceiptResult = true;
          const olderRefresh = refresh();
          await firstReceiptResult;
          const response = await refresh();
          // An older uncertain observation arrives after definitive unpriced
          // completion. Neither the ledger nor the captured mirror may regress.
          releaseOldReceipt?.();
          const olderResponse = await olderRefresh;
          expect(olderResponse.status).toBe(200);
          expect(await olderResponse.json()).toMatchObject({
            receipt: { completionUncertain: false },
            run: { accounting: { uncertainAttempts: 0 } },
          });
          const refreshed = (await response.json()) as {
            ok: boolean;
            receipt: AiReceipt;
            run: CognitionLabRun;
            message: string;
          };
          expect(response.status, JSON.stringify(refreshed)).toBe(200);
          expect(refreshed).toMatchObject({
            ok: true,
            receipt: { requestId: attemptId, completionUncertain: false },
            run: { accounting: { uncertainAttempts: 0 } },
            message: expect.stringContaining('price is still unknown'),
          });
          expect(refreshed.receipt.estimatedCostUsd).toBeUndefined();
          const retained = await client.query<{ spent: string; receipt: string }>(
            'SELECT spent,receipt FROM attempts WHERE id=$1',
            [attemptId],
          );
          expect(retained.rows[0]!.spent).toBe(native.rows[0]!.reserved);
          expect(JSON.parse(retained.rows[0]!.receipt).completionUncertain).toBe(false);
          expect(providerReads).toEqual([
            '/v1/runs/receipt-fixture',
            '/v1/runs/receipt-fixture/result',
            '/v1/runs/receipt-fixture',
            '/v1/runs/receipt-fixture/result',
          ]);
          expect(h.calls).toHaveLength(settledCalls);
        } finally {
          releaseOldReceipt?.();
          await client.end();
        }
      }
      const person = await h.get<CognitionLabCurrent>(
        `/current/${stimulus.targetId}?category=person`,
      );
      const name = person.fields.items.find((field) => field.id === 'person.name')!;
      const intervention = await h.post({
        kind: 'applyEdits',
        commandId: randomUUID(),
        expected: expected(latest),
        edits: [
          {
            actorId: stimulus.targetId,
            fieldId: name.id,
            owner: name.owner,
            value: 'Held native guest',
            baseValue: name.value,
            token: name.token,
          },
        ],
      });
      expect(intervention.body, JSON.stringify(intervention)).toMatchObject({ ok: true });
      const interventions = await h.get<{
        items: Array<{ kind: string; status: string; runId: string }>;
      }>(`/runs/${run.id}/records?kind=intervention`);
      expect(interventions.items).toEqual([
        expect.objectContaining({
          kind: 'timeline',
          status: 'applied',
          runId: run.id,
        }),
      ]);
      latest = intervention.body.workspace!;
      const restored = await h.post({
        commandId: randomUUID(),
        kind: 'loadScenario',
        savedId: run.originId,
        expected: expected(latest),
      });
      expect(restored.body, JSON.stringify(restored)).toMatchObject({ ok: true });
      const again = await h.post({
        ...operation,
        commandId: randomUUID(),
        expected: expected(restored.body.workspace!),
      });
      expect(again.body, JSON.stringify(again)).toMatchObject({ ok: true, sourceAccepted: true });
      await expect
        .poll(async () => (await h.get<CognitionLabWorkspace>('/workspace')).state, {
          timeout: 30_000,
        })
        .toBe('held');
      expect(h.calls.length).toBeGreaterThan(settledCalls);
      expect(again.body.sourceId).not.toBe(accepted.body.sourceId);
      const after = await h.get<CognitionLabWorkspace>('/workspace');
      expect(after.run?.reason).not.toContain('limit reached');
      const repeatedSpeech = await h.get<{
        items: Array<{ runId?: string; actorId?: string; text: string }>;
      }>('/events?kind=speech');
      expect(
        repeatedSpeech.items.filter(
          (event) =>
            event.runId === after.run!.id &&
            event.actorId === stimulus.targetId &&
            event.text.includes('Yes, let us talk.'),
        ),
      ).toHaveLength(1);
    },
    120_000,
  );
  it('opens held from the current initializer and applies native edits without touching the game', async () => {
    const h = await start();
    expect(h.workspace.state).toBe('ready');
    expect(h.workspace.worldId).not.toBe(h.game.service.world.id);
    expect(h.workspace.provider.available).toBe(false);
    const actorId = h.workspace.defaults.inspectedActorId!;
    expect(actorId).toBeTruthy();
    const current = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=person`);
    const name = current.fields.items.find((field) => field.id === 'person.name')!;
    const operation = {
      commandId: randomUUID(),
      kind: 'applyEdits',
      expected: expected(h.workspace),
      edits: [
        {
          actorId,
          fieldId: name.id,
          owner: 'person',
          value: 'Laboratory guest',
          baseValue: name.value,
          token: name.token,
        },
      ],
    };
    const [one, two] = await Promise.all([h.post(operation), h.post(operation)]);
    expect(one.body, JSON.stringify(one)).toMatchObject({
      ok: true,
      commandId: operation.commandId,
    });
    expect(two.body).toMatchObject({ ok: true, commandId: operation.commandId });
    expect(entityGet(h.game.service.world.entities, actorId)?.name).toBe(name.value);
    const changed = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=person`);
    expect(changed.fields.items.find((field) => field.id === name.id)?.value).toBe(
      'Laboratory guest',
    );
    const stale = await h.post({ ...operation, commandId: randomUUID() });
    expect(stale.body).toMatchObject({ ok: false, code: 'conflict' });
    const repeated = await h.post(operation);
    expect(repeated.body).toMatchObject({ ok: true, commandId: operation.commandId });
    const switched = await h.post({
      ...operation,
      edits: [{ ...operation.edits[0], value: 'Another name' }],
    });
    expect(switched.status).toBe(409);
  }, 120_000);

  it('loads an unavailable-model origin only when current inference settings are explicitly kept', async () => {
    const h = await start(false, false, (config) => {
      config.miniModel = 'saved-model-fixture';
      config.complexModel = 'current-model-fixture';
    });
    const savedSettings = await h.post({
      kind: 'applySettings',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      settings: { effort: 'high', maxOutputTokens: 777 },
    });
    expect(savedSettings.body).toMatchObject({ ok: true });
    const saved = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(savedSettings.body.workspace!),
      name: 'Reusable model-independent world',
    });
    expect(saved.body).toMatchObject({ ok: true });
    const current = await h.post({
      kind: 'applySettings',
      commandId: randomUUID(),
      expected: expected(saved.body.workspace!),
      settings: {
        models: { responseFast: 'current-model-fixture' },
        effort: null,
        maxOutputTokens: null,
      },
    });
    expect(current.body).toMatchObject({ ok: true });
    const currentInference = current.body.workspace!.settings;
    const client = new pg.Client({ connectionString: h.labDatabaseUrl });
    await client.connect();
    const original = (
      await client.query('SELECT payload FROM cognition_lab.records WHERE id=$1', [
        saved.body.savedId,
      ])
    ).rows[0].payload;
    await client.end();
    h.config.miniModel = 'current-model-fixture';
    await h.restart();
    const reopened = await h.get<CognitionLabWorkspace>('/workspace');
    const refused = await h.post({
      kind: 'loadScenario',
      commandId: randomUUID(),
      expected: expected(reopened),
      savedId: saved.body.savedId,
    });
    expect(refused.body).toMatchObject({
      ok: false,
      message: 'Choose an installed configured model for this purpose.',
    });
    const afterRefusal = await h.get<CognitionLabWorkspace>('/workspace');
    expect(afterRefusal.runtimeGeneration).toBe(reopened.runtimeGeneration);
    const loaded = await h.post({
      kind: 'loadScenario',
      commandId: randomUUID(),
      expected: expected(afterRefusal),
      savedId: saved.body.savedId,
      keepCurrentModels: true,
    });
    expect(loaded.body, JSON.stringify(loaded)).toMatchObject({ ok: true });
    expect(loaded.body.workspace!.settings.models).toEqual(currentInference.models);
    expect(Object.keys(loaded.body.workspace!.settings.models)).toHaveLength(6);
    expect(loaded.body.workspace!.settings.effort).toBeUndefined();
    expect(loaded.body.workspace!.settings.maxOutputTokens).toBeUndefined();
    const verify = new pg.Client({ connectionString: h.labDatabaseUrl });
    await verify.connect();
    expect(
      (
        await verify.query('SELECT payload FROM cognition_lab.records WHERE id=$1', [
          saved.body.savedId,
        ])
      ).rows[0].payload,
    ).toBe(original);
    await verify.end();
    expect(h.calls).toHaveLength(0);
  }, 120_000);

  it.each([
    [false, 'workspace', false],
    [true, 'workspace', false],
    [false, 'customField', false],
    [true, 'customField', false],
    [false, 'customField', true],
  ] as const)(
    'recovers the applied native/custom pair after a post-install metadata failure (restart=%s, owner=%s)',
    async (restart, failedKind, rejectAfterNativeCommit) => {
      const h = await start();
      const keepCurrentModels = restart && failedKind === 'workspace';
      const field = {
        id: 'private-interest',
        label: 'Private interest',
        datatype: 'text',
        description: 'An explicit model-only experiment.',
        value: 'Bird watching',
        subject: { kind: 'person', actorId: h.workspace.defaults.inspectedActorId! },
        recipientActorIds: [h.workspace.defaults.inspectedActorId!],
        placement: 'experimentalContext',
        enabled: true,
      };
      const applied = await h.post({
        commandId: randomUUID(),
        kind: 'setCustomField',
        expected: expected(h.workspace),
        field,
      });
      expect(applied.body, JSON.stringify(applied)).toMatchObject({ ok: true });
      const now = await h.get<CognitionLabWorkspace>('/workspace');
      const saved = await h.post({
        commandId: randomUUID(),
        kind: 'saveScenario',
        expected: expected(now),
        name: 'Combined experiment',
      });
      expect(saved.body).toMatchObject({ ok: true });
      const removed = await h.post({
        commandId: randomUUID(),
        kind: 'removeCustomField',
        expected: expected(saved.body.workspace!),
        fieldId: field.id,
      });
      expect(removed.body).toMatchObject({ ok: true });
      const restoreOperation = {
        commandId: randomUUID(),
        kind: 'loadScenario',
        expected: expected(removed.body.workspace!),
        savedId: saved.body.savedId,
        keepCurrentModels,
      };
      const client = new pg.Client({ connectionString: h.labDatabaseUrl });
      await client.connect();
      let clientClosed = false;
      cleanup.unshift(async () => {
        if (!clientClosed) await client.end();
      });
      await client.query(
        `CREATE FUNCTION fixture_reject_workspace() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM open_legend.meta WHERE key='integration:load-request:${restoreOperation.commandId}') THEN RAISE EXCEPTION 'fixture workspace write failed'; END IF; RETURN NEW; END $$`,
      );
      await client.query(
        `CREATE TRIGGER fixture_reject_workspace BEFORE INSERT OR UPDATE ON cognition_lab.records FOR EACH ROW WHEN (NEW.kind='${failedKind}') EXECUTE FUNCTION fixture_reject_workspace()`,
      );
      const nativeRestore = WorldService.prototype.restoreSave;
      const spy = rejectAfterNativeCommit
        ? vi.spyOn(WorldService.prototype, 'restoreSave').mockImplementationOnce(async function (
            this: WorldService,
            ...args: Parameters<WorldService['restoreSave']>
          ) {
            await nativeRestore.apply(this, args);
            throw new Error('Fixture post-commit native cleanup failed.');
          })
        : undefined;
      if (spy)
        cleanup.unshift(async () => {
          spy.mockRestore();
        });
      const restored = await h.post(restoreOperation);
      expect(restored.body, JSON.stringify(restored)).toMatchObject({ ok: true });
      expect(restored.body.unconfirmed).toBe(true);
      if (keepCurrentModels) {
        const pending = (
          await client.query(
            "SELECT payload::jsonb->'pendingReplacement' AS intent FROM cognition_lab.records WHERE kind='workspace'",
          )
        ).rows[0].intent;
        expect(pending).toMatchObject({
          keepCurrentModels: true,
          inferenceSettings: {
            models: removed.body.workspace!.settings.models,
            effort: null,
            maxOutputTokens: null,
          },
        });
      }
      const installed = await h.get<CognitionLabWorkspace>('/workspace');
      expect(installed.runtimeGeneration).not.toBe(removed.body.workspace!.runtimeGeneration);
      const blocked = await h.post({
        kind: 'setParticipants',
        commandId: randomUUID(),
        expected: expected(installed),
        actorIds: [],
      });
      expect(blocked.body).toMatchObject({ ok: false, code: 'conflict' });
      await client.query('DROP TRIGGER fixture_reject_workspace ON cognition_lab.records');
      if (keepCurrentModels)
        await client.query(
          `UPDATE cognition_lab.records SET payload=jsonb_set(jsonb_set(payload::jsonb,'{settings,effort}','"low"'::jsonb),'{settings,maxOutputTokens}','321'::jsonb)::text WHERE kind='workspace'`,
        );
      if (restart && failedKind === 'workspace')
        await client.query(
          'UPDATE cognition_lab.storage SET allowance_bytes=used_bytes+reserved_bytes',
        );
      await client.end();
      clientClosed = true;
      if (restart) await h.restart();
      const repaired = await Promise.all([
        h.post(restoreOperation),
        h.post(restoreOperation),
        h.post(restoreOperation),
      ]);
      for (const result of repaired) {
        expect(result.body, JSON.stringify(result)).toMatchObject({
          ok: true,
          savedId: saved.body.savedId,
        });
        expect(result.body.unconfirmed).not.toBe(true);
      }
      const settled = await h.get<CognitionLabWorkspace>('/workspace');
      if (keepCurrentModels) {
        expect(settled.settings.models).toEqual(removed.body.workspace!.settings.models);
        expect(settled.settings.effort).toBeUndefined();
        expect(settled.settings.maxOutputTokens).toBeUndefined();
      }
      if (spy) expect(spy).toHaveBeenCalledTimes(1);
      expect(settled.timeline).toBe(installed.timeline);
      if (!restart) expect(settled.runtimeGeneration).toBe(installed.runtimeGeneration);
      expect(settled.scenarioRevision).toBe(removed.body.workspace!.scenarioRevision + 1);
      const current = await h.get<CognitionLabCurrent>(
        `/current/${field.subject.actorId}?category=custom`,
      );
      expect(current.fields.items).toHaveLength(1);
      const forbidden = await fetch(`${h.base}/api/cognition-lab/operations`, {
        method: 'POST',
        headers: {
          Cookie: h.cookie,
          Origin: 'https://unrelated.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      expect(forbidden.status).toBe(403);
      const invalid = await h.post({
        commandId: randomUUID(),
        kind: 'applySettings',
        expected: expected(settled),
        settings: { databaseUrl: 'postgresql://unrelated.invalid/other' },
      });
      expect(invalid.status).toBe(400);
    },
    120_000,
  );
  it('keeps a proven-unsent replacement recoverable until its failed terminal receipt is durable', async () => {
    const h = await start();
    const saved = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      name: 'Unsent replacement origin',
    });
    expect(saved.body, JSON.stringify(saved)).toMatchObject({ ok: true });
    const operation = {
      kind: 'loadScenario',
      commandId: randomUUID(),
      expected: expected(saved.body.workspace!),
      savedId: saved.body.savedId,
    };
    const client = new pg.Client({ connectionString: h.labDatabaseUrl });
    await client.connect();
    cleanup.unshift(() => client.end());
    await client.query(
      `CREATE FUNCTION fixture_reject_failed_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failed receipt write'; END $$`,
    );
    await client.query(
      `CREATE TRIGGER fixture_reject_failed_receipt BEFORE UPDATE ON cognition_lab.receipts FOR EACH ROW WHEN (NEW.state='failed') EXECUTE FUNCTION fixture_reject_failed_receipt()`,
    );
    const restore = vi
      .spyOn(WorldService.prototype, 'restoreSave')
      .mockRejectedValueOnce(new Error('Fixture refused before native install.'));
    cleanup.unshift(async () => {
      restore.mockRestore();
    });
    const refused = await h.post(operation);
    expect(refused.body, JSON.stringify(refused)).toMatchObject({ ok: false, unconfirmed: true });
    const before = await h.get<CognitionLabWorkspace>('/workspace');
    await h.restart();
    const unavailable = await fetch(`${h.base}/api/cognition-lab/workspace`, {
      headers: { Cookie: h.cookie },
    });
    expect(unavailable.ok).toBe(false);
    const marker = await client.query(
      "SELECT payload::jsonb->'pendingReplacement' AS intent FROM cognition_lab.records WHERE kind='workspace'",
    );
    expect(marker.rows[0]?.intent).toMatchObject({ ownerCommandId: operation.commandId });
    await client.query('DROP TRIGGER fixture_reject_failed_receipt ON cognition_lab.receipts');
    await h.restart();
    const recovered = await h.post(operation);
    expect(recovered.body, JSON.stringify(recovered)).toMatchObject({
      ok: false,
      code: 'interrupted',
    });
    expect(recovered.body.unconfirmed).not.toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    const after = await h.get<CognitionLabWorkspace>('/workspace');
    expect(after.timeline).toBe(before.timeline);
    const cleared = await client.query(
      "SELECT payload::jsonb->'pendingReplacement' AS intent FROM cognition_lab.records WHERE kind='workspace'",
    );
    expect(cleared.rows[0]?.intent).toBeNull();
  }, 120_000);

  it('repairs a partial comparison without dispatching later variants and allows removal of its group', async () => {
    const h = await start(true);
    const saved = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      name: 'Interrupted comparison origin',
    });
    expect(saved.body, JSON.stringify(saved)).toMatchObject({ ok: true });
    const client = new pg.Client({ connectionString: h.labDatabaseUrl });
    await client.connect();
    cleanup.unshift(() => client.end());
    await client.query(
      `CREATE FUNCTION fixture_reject_comparison_context() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM open_legend.meta WHERE key LIKE 'integration:load-request:%') THEN RAISE EXCEPTION 'fixture comparison context failed'; END IF; RETURN NEW; END $$`,
    );
    await client.query(
      `CREATE TRIGGER fixture_reject_comparison_context BEFORE INSERT OR UPDATE ON cognition_lab.records FOR EACH ROW WHEN (NEW.kind='workspace') EXECUTE FUNCTION fixture_reject_comparison_context()`,
    );
    const stimulus = {
      kind: 'say',
      actorId: h.workspace.defaults.actorId!,
      targetId: h.workspace.defaults.targetId!,
      text: 'Shall we explore together?',
      volume: h.workspace.defaults.volume,
    };
    const operation = {
      kind: 'runComparison',
      commandId: randomUUID(),
      expected: expected(saved.body.workspace!),
      originId: saved.body.savedId,
      policy: h.workspace.settings.policy,
      variants: [
        { name: 'First', stimulus },
        { name: 'Never dispatched', stimulus },
      ],
    };
    const failed = await h.post(operation);
    expect(failed.body, JSON.stringify(failed)).toMatchObject({
      ok: false,
      unconfirmed: true,
      comparisonRunIds: [],
    });
    expect(h.calls).toHaveLength(0);
    const installed = await h.get<CognitionLabWorkspace>('/workspace');
    await client.query('DROP TRIGGER fixture_reject_comparison_context ON cognition_lab.records');
    const checked = await h.post(operation);
    expect(checked.body, JSON.stringify(checked)).toMatchObject({
      ok: false,
      comparisonRunIds: [],
    });
    expect(checked.body.unconfirmed).not.toBe(true);
    expect(h.calls).toHaveLength(0);
    const current = await h.get<CognitionLabWorkspace>('/workspace');
    expect(current.timeline).toBe(installed.timeline);
    const groups = await h.get<{ items: Array<{ id: string; completeness: string }> }>(
      '/scenarios?kind=comparison',
    );
    expect(groups.items).toHaveLength(1);
    expect(groups.items[0]?.completeness).toBe('partial');
    const removed = await h.post({
      kind: 'removeSaved',
      commandId: randomUUID(),
      savedIds: [groups.items[0]!.id],
    });
    expect(removed.body, JSON.stringify(removed)).toMatchObject({ ok: true });
    expect((await h.get<{ items: unknown[] }>('/scenarios?kind=comparison')).items).toHaveLength(0);
  }, 120_000);

  it('repairs an accepted replacement through a new same-account login without reinstalling its world', async () => {
    const h = await start();
    const saved = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      name: 'Session repair origin',
    });
    expect(saved.body).toMatchObject({ ok: true });
    const operation = {
      kind: 'loadScenario',
      commandId: randomUUID(),
      expected: expected(saved.body.workspace!),
      savedId: saved.body.savedId,
    };
    const client = new pg.Client({ connectionString: h.labDatabaseUrl });
    await client.connect();
    cleanup.unshift(() => client.end());
    await client.query(
      `CREATE FUNCTION fixture_session_context() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM open_legend.meta WHERE key='integration:load-request:${operation.commandId}') THEN RAISE EXCEPTION 'fixture session context'; END IF; RETURN NEW; END $$`,
    );
    await client.query(
      `CREATE TRIGGER fixture_session_context BEFORE INSERT OR UPDATE ON cognition_lab.records FOR EACH ROW WHEN (NEW.kind='workspace') EXECUTE FUNCTION fixture_session_context()`,
    );
    const nativeRestore = vi.spyOn(WorldService.prototype, 'restoreSave');
    cleanup.unshift(async () => {
      nativeRestore.mockRestore();
    });
    const accepted = await h.post(operation);
    expect(accepted.body).toMatchObject({ ok: true, unconfirmed: true });
    const installed = await h.get<CognitionLabWorkspace>('/workspace');
    await client.query('DROP TRIGGER fixture_session_context ON cognition_lab.records');
    const authority = h.game.service.store.authority!;
    const old = await authority.authenticate(h.cookie.split('=')[1], Date.now());
    const replacement = await authority.login(
      { issuer: 'https://local.openlegend.invalid', subject: 'local-player' },
      Date.now(),
      60_000,
    );
    await authority.revokeSession(old.id, Date.now());
    const checked = await h.post(operation, `ol_session=${replacement.token}`);
    expect(checked.body, JSON.stringify(checked)).toMatchObject({ ok: true });
    expect(checked.body.unconfirmed).not.toBe(true);
    const refreshed = await h.get<CognitionLabWorkspace>(
      '/workspace',
      `ol_session=${replacement.token}`,
    );
    expect(refreshed.timeline).toBe(installed.timeline);
    expect(refreshed.disclosureRevision).not.toBe(installed.disclosureRevision);
    expect(nativeRestore).toHaveBeenCalledTimes(1);
  }, 120_000);

  it.each([false, true])(
    'preserves an accepted game import when temporary-save cleanup fails (restart=%s)',
    async (restart) => {
      const h = await start();
      const originalWorld = h.workspace.worldId;
      const remove = WorldService.prototype.deleteSave;
      let fail = true;
      const deletion = vi
        .spyOn(WorldService.prototype, 'deleteSave')
        .mockImplementation(async function (
          this: WorldService,
          ...args: Parameters<WorldService['deleteSave']>
        ) {
          if (fail) throw new Error('Fixture temporary game-save cleanup failed.');
          return remove.apply(this, args);
        });
      cleanup.unshift(async () => {
        deletion.mockRestore();
      });
      const operation = {
        kind: 'importGameSnapshot',
        commandId: randomUUID(),
        expected: expected(h.workspace),
      };
      const accepted = await h.post(operation);
      expect(accepted.body, JSON.stringify(accepted)).toMatchObject({
        ok: true,
        unconfirmed: true,
      });
      const installed = await h.get<CognitionLabWorkspace>('/workspace');
      expect(installed.worldId).not.toBe(originalWorld);
      fail = false;
      const activeGame = restart ? await h.restart() : h.game;
      const checked = await h.post(operation);
      expect(checked.body, JSON.stringify(checked)).toMatchObject({
        ok: true,
        savedId: accepted.body.savedId,
      });
      expect(checked.body.unconfirmed).not.toBe(true);
      const current = await h.get<CognitionLabWorkspace>('/workspace');
      expect(current.timeline).toBe(installed.timeline);
      const temporary = await activeGame.service.store.saves!.list(activeGame.service.world.id);
      expect(temporary.some((save) => save.label === 'Point-in-time lab import')).toBe(false);
    },
    120_000,
  );

  it('preserves a saved continuation checkpoint when binding its held-stage metadata fails', async () => {
    const h = await start(true);
    const prepared = await h.post({
      kind: 'prepareAndHold',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      stimulus: {
        kind: 'say',
        actorId: h.workspace.defaults.actorId!,
        targetId: h.workspace.defaults.targetId!,
        text: 'Shall we talk?',
        volume: h.workspace.defaults.volume,
      },
      policy: h.workspace.settings.policy,
      stagePurpose: 'nextDecision',
    });
    expect(prepared.body).toMatchObject({ ok: true });
    await expect
      .poll(async () => (await h.get<CognitionLabWorkspace>('/workspace')).run?.prepared?.id, {
        timeout: 30_000,
      })
      .toBeTruthy();
    const held = await h.get<CognitionLabWorkspace>('/workspace');
    const callsBeforeSave = h.calls.length;
    const bind = CognitionLabRunController.prototype.bindContinuationCheckpoint;
    let fail = true;
    const binding = vi
      .spyOn(CognitionLabRunController.prototype, 'bindContinuationCheckpoint')
      .mockImplementation(async function (
        this: CognitionLabRunController,
        ...args: Parameters<CognitionLabRunController['bindContinuationCheckpoint']>
      ) {
        if (fail) throw new Error('Fixture held-stage binding failed.');
        return bind.apply(this, args);
      });
    cleanup.unshift(async () => {
      binding.mockRestore();
    });
    const operation = {
      kind: 'saveCheckpoint',
      commandId: randomUUID(),
      expected: expected(held),
      name: 'Held receipt checkpoint',
    };
    const saved = await h.post(operation);
    expect(saved.body, JSON.stringify(saved)).toMatchObject({ ok: true, unconfirmed: true });
    expect(saved.body.savedId).toBeTruthy();
    fail = false;
    const checked = await h.post(operation);
    expect(checked.body, JSON.stringify(checked)).toMatchObject({
      ok: true,
      savedId: saved.body.savedId,
    });
    expect(checked.body.unconfirmed).not.toBe(true);
    const checkpoints = await h.get<{ items: Array<{ id: string; name: string }> }>(
      '/scenarios?kind=checkpoint&query=Held',
    );
    expect(checkpoints.items.filter((row) => row.name === operation.name)).toEqual([
      expect.objectContaining({ id: saved.body.savedId }),
    ]);
    expect(h.calls).toHaveLength(callsBeforeSave);
  }, 120_000);

  it('streams current bundles, binds retries to their bytes, and installs only after complete validation', async () => {
    const h = await start();
    const beforeGame = h.game.service.world.sequence;
    const actorId = h.workspace.defaults.inspectedActorId!;
    const first = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      name: 'Bundle baseline',
    });
    expect(first.body).toMatchObject({ ok: true });
    const exportFile = async (id: string) => {
      const response = await fetch(`${h.base}/api/cognition-lab/exports/scenario/${id}`, {
        headers: { Cookie: h.cookie },
      });
      expect(response.status).toBe(200);
      return response.text();
    };
    const original = await exportFile(first.body.savedId!);
    expect(original).not.toContain(h.cookie.split('=')[1]);
    const second = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(first.body.workspace!),
      name: 'A different bundle',
    });
    const different = await exportFile(second.body.savedId!);
    const upload = async (
      text: string,
      commandId: string,
      validateOnly: boolean,
      workspace: CognitionLabWorkspace,
    ) => {
      const query = new URLSearchParams({
        commandId,
        validateOnly: String(validateOnly),
        ...Object.fromEntries(
          Object.entries(expected(workspace)).map(([key, value]) => [key, String(value)]),
        ),
      });
      const response = await fetch(`${h.base}/api/cognition-lab/imports?${query}`, {
        method: 'POST',
        headers: {
          Cookie: h.cookie,
          Origin: h.base,
          'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
          'Content-Type': 'application/x-ndjson',
        },
        body: text,
      });
      return { status: response.status, body: (await response.json()) as CognitionLabReceipt };
    };
    const commandId = randomUUID();
    const imported = await upload(original, commandId, true, second.body.workspace!);
    expect(imported, JSON.stringify(imported)).toMatchObject({
      status: 200,
      body: { ok: true, commandId },
    });
    const repeated = await upload(original, commandId, true, second.body.workspace!);
    expect(repeated.body.savedId).toBe(imported.body.savedId);
    const changed = await upload(different, commandId, true, second.body.workspace!);
    expect(changed, JSON.stringify(changed)).toMatchObject({ status: 409 });
    const before = await h.get<CognitionLabWorkspace>('/workspace');
    const truncated = await upload(
      original.split('\n').slice(0, -2).join('\n') + '\n',
      randomUUID(),
      false,
      before,
    );
    expect(truncated.status, JSON.stringify(truncated)).toBe(400);
    expect((await h.get<CognitionLabWorkspace>('/workspace')).runtimeGeneration).toBe(
      before.runtimeGeneration,
    );
    const current = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=person`);
    const name = current.fields.items.find((field) => field.id === 'person.name')!;
    const edited = await h.post({
      kind: 'applyEdits',
      commandId: randomUUID(),
      expected: expected(before),
      edits: [
        {
          actorId,
          fieldId: name.id,
          owner: name.owner,
          value: 'After export',
          baseValue: name.value,
          token: name.token,
        },
      ],
    });
    expect(edited.body).toMatchObject({ ok: true });
    const installed = await upload(original, randomUUID(), false, edited.body.workspace!);
    expect(installed, JSON.stringify(installed)).toMatchObject({ status: 200, body: { ok: true } });
    const restored = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=person`);
    expect(restored.fields.items.find((field) => field.id === name.id)?.value).toBe(name.value);
    expect(h.game.service.world.sequence).toBe(beforeGame);
  }, 120_000);
  it('runs matched native numeric factors from one origin and retains each named result', async () => {
    const h = await start(true);
    const beforeGame = h.game.service.world.sequence;
    const actorId = h.workspace.defaults.inspectedActorId!;
    const body = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=body`);
    const meter = body.fields.items.find(
      (field) => field.holdable && field.editable && typeof field.value === 'number',
    )!;
    expect(meter, JSON.stringify(body)).toBeTruthy();
    const value =
      Number(meter.value) > (meter.minimum ?? 0)
        ? Number(meter.value) - 1
        : Number(meter.value) + 1;
    const saved = await h.post({
      kind: 'saveScenario',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      name: 'Matched native origin',
    });
    expect(saved.body).toMatchObject({ ok: true });
    const stimulus = {
      kind: 'say',
      actorId: h.workspace.defaults.actorId!,
      targetId: actorId,
      text: 'How are you feeling?',
      volume: h.workspace.defaults.volume,
    };
    const comparison = await h.post({
      kind: 'runComparison',
      commandId: randomUUID(),
      expected: expected(saved.body.workspace!),
      originId: saved.body.savedId,
      policy: {
        ...h.workspace.settings.policy,
        focalActorId: actorId,
        autonomousActorIds: [actorId],
      },
      variants: [
        { name: 'Original', stimulus },
        {
          name: 'Changed native meter',
          stimulus,
          edits: [
            {
              actorId,
              fieldId: meter.id,
              owner: meter.owner,
              value,
              baseValue: meter.value,
              token: meter.token,
              hold: true,
            },
          ],
        },
      ],
    });
    expect(comparison.body, JSON.stringify(comparison)).toMatchObject({ ok: true });
    expect(comparison.body.comparisonRunIds).toHaveLength(2);
    const current = await h.get<CognitionLabCurrent>(`/current/${actorId}?category=body`);
    expect(current.fields.items.find((field) => field.id === meter.id)).toMatchObject({
      value,
      held: true,
    });
    for (const [index, id] of comparison.body.comparisonRunIds!.entries()) {
      const run = await h.get<{ name: string; retained: boolean }>(`/runs/${id}`);
      expect(run).toMatchObject({
        retained: true,
        name: index === 0 ? 'Original' : 'Changed native meter',
      });
    }
    expect(h.calls.length).toBeGreaterThan(1);
    expect(h.game.service.world.sequence).toBe(beforeGame);
  }, 180_000);

  it('adds a real native character once even when its terminal HTTP receipt cannot be stored', async () => {
    const h = await start();
    const failuresBefore = performanceSnapshot().runtime.backgroundFailures.observed;
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = new pg.Client({ connectionString: h.labDatabaseUrl });
    await client.connect();
    try {
      await client.query(
        `CREATE FUNCTION fixture_reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture terminal write failed'; END $$`,
      );
      await client.query(
        `CREATE TRIGGER fixture_reject_receipt BEFORE UPDATE ON cognition_lab.receipts FOR EACH ROW WHEN (NEW.state='completed') EXECUTE FUNCTION fixture_reject_receipt()`,
      );
      const values = Object.fromEntries(
        h.workspace.characterCreation!.fields.map((field) => [field.id, field.value]),
      );
      values['name'] = 'Mira receipt fixture';
      const operation = {
        kind: 'createCharacter',
        commandId: randomUUID(),
        expected: expected(h.workspace),
        values,
      };
      const accepted = await h.post(operation);
      expect(accepted.body, JSON.stringify(accepted)).toMatchObject({
        ok: true,
        unconfirmed: true,
      });
      const repeated = await h.post(operation);
      expect(repeated.body).toMatchObject({
        ok: true,
        unconfirmed: true,
        actorId: accepted.body.actorId,
      });
      const failures = performanceSnapshot().runtime.backgroundFailures;
      expect(failures.observed).toBe(failuresBefore + 2);
      const reported = errors.mock.calls
        .filter(([message]) => message === 'Background operation failed.')
        .map(([, details]) => JSON.parse(String(details)) as unknown);
      expect(reported).toEqual([
        expect.objectContaining({ operation: 'lab-command-completion', errorClass: 'Error' }),
        expect.objectContaining({ operation: 'lab-command-completion', errorClass: 'Error' }),
      ]);
      expect(JSON.stringify(reported)).not.toContain('fixture terminal write failed');
      expect(JSON.stringify(reported)).not.toContain('Mira receipt fixture');
      await client.query('DROP TRIGGER fixture_reject_receipt ON cognition_lab.receipts');
      const repaired = await h.post(operation);
      expect(repaired.body, JSON.stringify(repaired)).toMatchObject({
        ok: true,
        actorId: accepted.body.actorId,
      });
      expect(repaired.body.unconfirmed).not.toBe(true);
      const actors = await h.get<{ items: Array<{ id: string; name: string }> }>(
        '/actors?query=Mira',
      );
      expect(actors.items).toEqual([
        expect.objectContaining({ id: accepted.body.actorId, name: values['name'] }),
      ]);
    } finally {
      errors.mockRestore();
      await client.end();
    }
  }, 120_000);
  it('keeps declared physical participation independent and permits a native return after departure', async () => {
    const h = await start();
    const actorId = h.workspace.defaults.actorId!;
    expect(h.workspace.participantActorIds).toContain(actorId);
    const removed = await h.post({
      kind: 'setParticipants',
      commandId: randomUUID(),
      expected: expected(h.workspace),
      actorIds: [],
    });
    expect(removed.body).toMatchObject({ ok: true });
    expect(removed.body.workspace?.participantActorIds).toEqual([]);
    const advanced = await h.post({
      kind: 'controlRun',
      commandId: randomUUID(),
      expected: expected(removed.body.workspace!),
      action: 'advanceTime',
      durationSeconds: 5,
    });
    expect(advanced.body, JSON.stringify(advanced)).toMatchObject({ ok: true });
    const now = await h.get<CognitionLabWorkspace>('/workspace');
    const returned = await h.post({
      kind: 'setParticipants',
      commandId: randomUUID(),
      expected: expected(now),
      actorIds: [actorId],
    });
    expect(returned.body).toMatchObject({ ok: true });
    expect(returned.body.workspace?.participantActorIds).toEqual([actorId]);
    const resumed = await h.post({
      kind: 'controlRun',
      commandId: randomUUID(),
      expected: expected(returned.body.workspace!),
      action: 'advanceTime',
      durationSeconds: 5,
    });
    expect(resumed.body).toMatchObject({ ok: true });
    const actors = await h.get<{ items: Array<{ id: string; participation: string }> }>(
      `/actors?id=${actorId}`,
    );
    expect(actors.items[0]).toMatchObject({ id: actorId, participation: 'active' });
  }, 120_000);
});
