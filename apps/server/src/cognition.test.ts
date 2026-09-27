import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commitCognition, mindFor, type MindProposal } from '@open-legend/domain';
import { validateMacrofoldValue } from '@open-legend/ai';
import { readConfig } from '../../../tests/fixtures/database.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import {
  cognitionContext,
  cognitionOpportunity,
  fullCognitionJsonSchema,
  COGNITION_INSTRUCTIONS,
  proposalSchema,
  thoughtOnlySchema,
  thoughtProposal,
} from './cognition.js';
import { MacrofoldBackend } from './macrofold.js';
import { inspectGodMind } from './god-mind.js';
import { projectView } from './view.js';
const opened: SqlGameRepository[] = [];
const dirs: string[] = [];
afterEach(async () => {
  for (const s of opened.splice(0))
    try {
      await s.close();
    } catch {}
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.unstubAllGlobals();
});
async function service(path: string | undefined = undefined, god = true) {
  const store = await testRepository(path);
  opened.push(store);
  const config = readConfig({
    AI_BUDGET_USD: '100',
    MACROFOLD_API_KEY: 'fixture-only-key',
    MACROFOLD_WORKER_ID: 'fixture-worker',
    OPEN_LEGEND_GOD_MODE: String(god),
  });
  const service = new WorldService(store, config, () => 10000);
  await enterLocalWorld(service);
  await service.setPresence('fixture', true, 1);
  await service.control({ paused: false });
  await service.say('fixture-encounter', PLAYER_ID, 'I would like to share berries.', NPC_ID);
  return service;
}
function proposal(s: WorldService, id = 'fixture-decision') {
  const prepared = cognitionContext(s, NPC_ID, id, 'thought', 'full');
  const e = prepared.context.recall.entries[0]!.id;
  const p: MindProposal = {
    policy: 'mind-v1',
    decisionId: id,
    expectedRevision: prepared.context.expectedRevision,
    thought: 'I am cautiously interested.',
    actionId: null,
    documents: [
      {
        id: 'newcomer',
        title: 'A possible ally',
        text: 'I think the newcomer may be helpful.',
        expectedRevision: 0,
        evidence: [{ id: e, relation: 'supports' }],
      },
    ],
    removeDocuments: [],
    records: [
      {
        id: 'relationship',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'relationship',
        subjectId: PLAYER_ID,
        source: 'inferred',
        confidence: 0.6,
        trust: 0.2,
        status: 'active',
        evidence: [{ id: e, relation: 'derived-from' }],
      },
      {
        id: 'belief',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'belief',
        subjectId: PLAYER_ID,
        source: 'inferred',
        confidence: 0.5,
        trust: null,
        status: 'active',
        evidence: [{ id: e, relation: 'supports' }],
      },
    ],
    removeRecords: [],
  };
  return { prepared, p };
}
describe('fixture: cognition vertical slice', () => {
  it('accepts schema-valid bundles, survives PostgreSQL restart, and supplies accepted mind to later decisions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ol-mind-'));
    dirs.push(dir);
    const path = dir;
    const s = await service(path);
    const { prepared, p } = proposal(s);
    expect(validateMacrofoldValue(fullCognitionJsonSchema, p)).toEqual(p);
    expect(
      (await s.transition((w) => commitCognition(w, prepared.binding, proposalSchema.parse(p)))).ok,
    ).toBe(true);
    await s.store.close();
    const reopened = await service(path);
    const next = cognitionContext(reopened, NPC_ID, 'next', 'thought', 'full');
    expect(next.context.acceptedMind.records.find((r) => r.kind === 'belief')?.documentId).toBe(
      'newcomer',
    );
    expect(next.context.acceptedMind.documents.some((d) => d.text.includes('helpful'))).toBe(true);
    expect(JSON.stringify(next.context)).not.toContain('I am cautiously interested.');
  });

  it('offers reflection after evidence and suppresses it after accepted consolidation', async () => {
    const s = await service();
    expect(cognitionOpportunity(s, NPC_ID)).toBe('reflection');
    const { prepared, p } = proposal(s);
    prepared.binding.purpose = 'reflection';
    expect((await s.transition((w) => commitCognition(w, prepared.binding, p))).ok).toBe(true);
    expect(cognitionOpportunity(s, NPC_ID)).toBeNull();
  });
  it('offers dream consolidation once and lets rest continue', async () => {
    const s = await service();
    await s.command(
      'rest',
      {
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        targetId: NPC_ID,
        effectOperation: 'activate',
      },
      NPC_ID,
    );
    expect(cognitionOpportunity(s, NPC_ID)).toBe('dream');
    const prepared = cognitionContext(s, NPC_ID, 'dream', 'dream', 'full');
    const p = thoughtProposal(
      prepared.binding,
      prepared.context.expectedRevision,
      'An imagined river carries the conversation.',
      null,
    );
    expect((await s.transition((w) => commitCognition(w, prepared.binding, p))).ok).toBe(true);
    expect(s.world.entities[NPC_ID]!.actor!.action?.type).toBe('status-effect');
    expect(cognitionOpportunity(s, NPC_ID)).toBeNull();
    expect(mindFor(s.world, NPC_ID).thoughts[0]?.source).toBe('imagined');
  });
  it('enforces backend god access and excludes thoughts from ordinary state', async () => {
    const s = await service();
    const { prepared, p } = proposal(s);
    await s.transition((w) => commitCognition(w, prepared.binding, p));
    expect((await inspectGodMind(s, NPC_ID)).legacyThoughts?.[0]?.text).toBe(p.thought);
    expect(JSON.stringify(await projectView(s, 'test-fixture'))).not.toContain(p.thought);
    const disabled = await service(undefined, false);
    await expect(inspectGodMind(disabled, NPC_ID)).rejects.toThrow('disabled');
  });
  it('rejects covert mind changes in fast schemas', () => {
    expect(
      thoughtOnlySchema.safeParse({
        thought: 'hello',
        actionId: null,
        needsDeliberation: false,
        documents: [],
      }).success,
    ).toBe(false);
  });
  it('fresh full harness sessions reuse an actor worktree on the selected Worker and inject current instructions', async () => {
    const s = await service();
    const requests: Array<{ path: string; body: Record<string, unknown>; key: string | null }> = [];
    let run = 0;
    let currentProposal: MindProposal;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init: RequestInit) => {
        const path = new URL(input).pathname;
        const body = init.body ? JSON.parse(String(init.body)) : {};
        requests.push({ path, body, key: new Headers(init.headers).get('Idempotency-Key') });
        let data: unknown;
        if (path === '/v1/models')
          data = {
            data: [
              {
                id: 'meta/muse-spark-1.3-contributor',
                enabled: true,
                harnesses: ['opencode'],
                billing_modes: ['byok'],
              },
            ],
          };
        else if (path === '/v1/workspaces')
          data = { id: 'fixture-workspace', default_worktree_id: 'fixture-worktree' };
        else if (path === '/v1/runs') {
          run++;
          const prompt = JSON.parse(body.prompt);
          expect(prompt.instructions).toContain(COGNITION_INSTRUCTIONS);
          expect(body.permissions.files.read.include).toEqual([]);
          data = {
            run_id: `fixture-run-${run}`,
            session_id: `fixture-session-${run}`,
            worker_id: 'fixture-worker',
            worktree_id: 'fixture-worktree',
            urls: {
              status: `http://localhost:3210/v1/runs/fixture-run-${run}`,
              result: `http://localhost:3210/v1/runs/fixture-run-${run}/result`,
            },
          };
        } else if (path.endsWith('/result'))
          data = {
            run_id: `fixture-run-${run}`,
            final: true,
            execution_outcome: 'success',
            persistence_status: 'verified',
            artifact_ids: [],
            output_text: JSON.stringify(currentProposal),
          };
        else if (path.startsWith('/v1/runs/'))
          data = {
            id: `fixture-run-${run}`,
            status: 'succeeded',
            cost_micro_usd: '100',
            persistence_status: 'verified',
          };
        else throw new Error(`Unexpected fixture request ${path}`);
        return new Response(JSON.stringify(data), { status: 200 });
      }),
    );
    const backend = new MacrofoldBackend(s);
    for (let i = 0; i < 2; i++) {
      const { prepared, p } = proposal(s, `fixture-${i}`);
      if (i) {
        p.documents = [];
        p.records = [];
      }
      currentProposal = p;
      const result = await backend.generate({
        requestId: `fixture-${i}`,
        actorScope: NPC_ID,
        execution: 'full',
        task: 'npc_cognition',
        instructions: COGNITION_INSTRUCTIONS,
        context: prepared.context,
        schema: fullCognitionJsonSchema,
      });
      expect(result.outcome, result.outcome === 'value' ? '' : result.reason).toBe('value');
      if (result.outcome === 'value')
        expect(
          (
            await s.transition((w) =>
              commitCognition(w, prepared.binding, proposalSchema.parse(result.value)),
            )
          ).ok,
        ).toBe(true);
    }
    const native = requests.filter((r) => r.path === '/v1/runs');
    expect(native).toHaveLength(2);
    expect(
      native.every(
        (r) =>
          r.body.session_id === undefined &&
          r.body.worker_id === 'fixture-worker' &&
          r.body.worktree_id === 'fixture-worktree',
      ),
    ).toBe(true);
    expect(requests.filter((r) => /^\/v1\/(workers|sandboxes)/.test(r.path))).toHaveLength(0);
    expect(requests.filter((r) => r.path === '/v1/workspaces')).toHaveLength(1);
    expect(native[0]!.key).not.toBe(native[1]!.key);
  });
});
