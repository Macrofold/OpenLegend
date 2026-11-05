import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NPC_ID, entityGet } from '@open-legend/domain';
import type { CognitionLabReceipt, CognitionLabWorkspace } from '@open-legend/protocol';
import { startCognitionLabFixture } from '../../../tests/fixtures/cognition-lab.js';
import { PostgresDatabase } from './postgres.js';
import { GameSaves } from './game-saves.js';

describe('native world replacement through Cognition Lab', () => {
  it('prepares native NPC options and publishes a real reply after importing another world', async () => {
    const h = await startCognitionLabFixture({ withAi: true });
    try {
      let workspace = h.workspace;
      const gameSequence = h.game.service.world.sequence;
      const post = async (value: object) => {
        const response = await fetch(`${h.base}/api/cognition-lab/operations`, {
          method: 'POST',
          headers: {
            Cookie: h.cookie,
            Origin: h.base,
            'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commandId: randomUUID(),
            expected: {
              runtimeGeneration: workspace.runtimeGeneration,
              scenarioRevision: workspace.scenarioRevision,
            },
            ...value,
          }),
          signal: AbortSignal.timeout(60000),
        });
        const receipt = (await response.json()) as CognitionLabReceipt;
        expect(receipt, JSON.stringify(receipt)).toMatchObject({ ok: true });
        expect(response.status).toBe(200);
        if (receipt.workspace) workspace = receipt.workspace;
        return receipt;
      };
      const oldWorldId = workspace.worldId;
      await post({ kind: 'importGameSnapshot' });
      expect(workspace.worldId).not.toBe(oldWorldId);
      expect(workspace.worldId).toBe(h.game.service.world.id);
      const targetId = workspace.defaults.targetId!;
      const accepted = await post({
        kind: 'submitStimulus',
        policy: {
          ...workspace.settings.policy,
          focalActorId: targetId,
          autonomousActorIds: [targetId],
        },
        stimulus: {
          kind: 'say',
          actorId: workspace.defaults.actorId!,
          targetId,
          volume: workspace.defaults.volume,
          text: 'Would you like to talk here?',
        },
      });
      expect(accepted.sourceAccepted).toBe(true);
      await expect
        .poll(
          async () => {
            const response = await fetch(`${h.base}/api/cognition-lab/workspace`, {
              headers: { Cookie: h.cookie },
            });
            workspace = (await response.json()) as CognitionLabWorkspace;
            return workspace.state;
          },
          { timeout: 30000 },
        )
        .toBe('held');
      expect(h.calls.some((call) => 'questions' in call)).toBe(true);
      expect(h.calls.some((call) => 'task' in call && call.task === 'npc_response')).toBe(true);
      expect(workspace.run?.reason).not.toContain('failed');
      const response = await fetch(`${h.base}/api/cognition-lab/events?kind=speech`, {
        headers: { Cookie: h.cookie },
      });
      const speech = (await response.json()) as {
        items: Array<{ actorId?: string; text: string; runId?: string }>;
      };
      expect(
        speech.items.filter(
          (item) =>
            item.actorId === targetId &&
            item.runId === accepted.runId &&
            item.text.includes('Yes, let us talk.'),
        ),
      ).toHaveLength(1);
      expect(h.game.service.world.sequence).toBe(gameSequence);
    } finally {
      await h.close();
    }
  }, 120000);
  it('keeps restored native history current while later imported run evidence stays historical', async () => {
    const h = await startCognitionLabFixture({ withAi: true });
    try {
      let workspace = h.workspace;
      const post = async (operation: object) => {
        const response = await fetch(`${h.base}/api/cognition-lab/operations`, {
          method: 'POST',
          headers: {
            Cookie: h.cookie,
            Origin: h.base,
            'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commandId: randomUUID(),
            expected: {
              runtimeGeneration: workspace.runtimeGeneration,
              scenarioRevision: workspace.scenarioRevision,
            },
            ...operation,
          }),
        });
        const receipt = (await response.json()) as CognitionLabReceipt;
        expect(receipt, JSON.stringify(receipt)).toMatchObject({ ok: true });
        workspace = receipt.workspace!;
        return receipt;
      };
      const get = async <T>(path: string): Promise<T> => {
        const response = await fetch(`${h.base}/api/cognition-lab${path}`, {
          headers: { Cookie: h.cookie },
        });
        expect(response.status).toBe(200);
        return response.json() as Promise<T>;
      };
      const settle = async () => {
        await expect
          .poll(
            async () => {
              workspace = await get<CognitionLabWorkspace>('/workspace');
              return workspace.state;
            },
            { timeout: 30000 },
          )
          .toBe('held');
      };
      const say = async (text: string) => {
        await post({
          kind: 'submitStimulus',
          policy: {
            ...workspace.settings.policy,
            autonomousActorIds: [workspace.defaults.targetId!],
          },
          stimulus: {
            kind: 'say',
            actorId: workspace.defaults.actorId,
            targetId: workspace.defaults.targetId,
            volume: workspace.defaults.volume,
            text,
          },
        });
        await settle();
      };
      await say('Checkpoint opening still belongs to this current scenario.');
      const origin = await post({ kind: 'saveCheckpoint', name: 'Current zero-time opening' });
      await post({ kind: 'controlRun', action: 'advanceTime', durationSeconds: 100 });
      await say('Later one-hundred-second run must remain historical.');
      const futureRun = workspace.run!.id;
      await post({ kind: 'restoreCheckpoint', savedId: origin.savedId });
      expect(workspace.gameTime).toBe(0);
      const timeline = workspace.timeline;
      const exported = await fetch(`${h.base}/api/cognition-lab/exports/run/${futureRun}`, {
        headers: { Cookie: h.cookie },
      });
      expect(exported.status).toBe(200);
      const bundle = await exported.text();
      const query = new URLSearchParams({
        commandId: randomUUID(),
        validateOnly: 'true',
        runtimeGeneration: workspace.runtimeGeneration,
        scenarioRevision: String(workspace.scenarioRevision),
      });
      const imported = await fetch(`${h.base}/api/cognition-lab/imports?${query}`, {
        method: 'POST',
        headers: {
          Cookie: h.cookie,
          Origin: h.base,
          'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
          'Content-Type': 'application/x-ndjson',
        },
        body: bundle,
      });
      const importReceipt = (await imported.json()) as CognitionLabReceipt;
      expect(importReceipt, JSON.stringify(importReceipt)).toMatchObject({ ok: true });
      workspace = await get<CognitionLabWorkspace>('/workspace');
      expect(workspace.timeline).toBe(timeline);
      expect(workspace.gameTime).toBe(0);
      const current = await get<{ items: Array<{ text: string; gameTime: number }> }>(
        '/events?kind=speech',
      );
      expect(current.items.some((event) => event.text.includes('Checkpoint opening'))).toBe(true);
      expect(current.items.some((event) => event.text.includes('Later one-hundred'))).toBe(false);
      expect(current.items.every((event) => event.gameTime === 0)).toBe(true);
      const historical = await get<{ items: Array<{ summary: { text?: string } }> }>(
        `/runs/${futureRun}/records?kind=event`,
      );
      expect(JSON.stringify(historical)).toContain('Later one-hundred');
      await post({
        kind: 'applySettings',
        settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
      });
      const mixed = await get<{ items: Array<{ kind: string; runId?: string }> }>(
        '/events?limit=1',
      );
      expect(mixed.items[0]).toMatchObject({ kind: 'intervention' });
      expect(mixed.items[0]?.runId).toBeUndefined();
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await get<{ items: Array<{ id: string }>; nextCursor?: string }>(
          `/events?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        );
        ids.push(...page.items.map((event) => event.id));
        cursor = page.nextCursor;
      } while (cursor);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(2);
    } finally {
      await h.close();
    }
  }, 120000);
  it('imports an independent game cut without remapping IDs and restores either world with exact recovery pointers', async () => {
    const h = await startCognitionLabFixture();
    const db = new PostgresDatabase(h.labDatabaseUrl, true);
    const saves = new GameSaves(db, join(h.config.cognitionLab.dataDirectory, 'saves'));
    try {
      let workspace = h.workspace;
      const originalLabWorld = workspace.worldId;
      const gameWorld = h.game.service.world.id;
      const gameSequence = h.game.service.world.sequence;
      const gameName = entityGet(h.game.service.world.entities, NPC_ID)!.name;
      const post = async (value: object) => {
        const response = await fetch(`${h.base}/api/cognition-lab/operations`, {
          method: 'POST',
          headers: {
            Cookie: h.cookie,
            Origin: h.base,
            'X-OL-Lab-Owner': h.workspace.operationOwnerScope,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commandId: randomUUID(),
            expected: {
              runtimeGeneration: workspace.runtimeGeneration,
              scenarioRevision: workspace.scenarioRevision,
            },
            ...value,
          }),
          signal: AbortSignal.timeout(60000),
        });
        const result = (await response.json()) as CognitionLabReceipt;
        expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
        expect(response.status).toBe(200);
        workspace = result.workspace!;
        return result;
      };
      const initial = await post({ kind: 'saveCheckpoint', name: 'Independent lab origin' });
      expect(originalLabWorld).not.toBe(gameWorld);
      await post({ kind: 'importGameSnapshot' });
      expect(workspace.worldId).toBe(gameWorld);
      expect(
        (await db.prepare('SELECT world_id FROM world_head WHERE id=1').get())?.['world_id'],
      ).toBe(gameWorld);
      expect((await saves.read(gameWorld, 'before-load')).state.world.id).toBe(originalLabWorld);
      const recovery = await saves.metadata(gameWorld, 'before-load');
      expect(recovery.worldId).toBe(originalLabWorld);
      await expect(saves.read(gameWorld, recovery.id)).rejects.toThrow('unavailable');
      const gameCopy = await post({ kind: 'saveCheckpoint', name: 'Exact imported game' });
      await post({ kind: 'restoreCheckpoint', savedId: initial.savedId });
      expect(workspace.worldId).toBe(originalLabWorld);
      expect((await saves.read(originalLabWorld, 'before-load')).state.world.id).toBe(gameWorld);
      await post({ kind: 'restoreCheckpoint', savedId: gameCopy.savedId });
      expect(workspace.worldId).toBe(gameWorld);
      const row = await db
        .prepare('SELECT payload FROM sim_entities WHERE world_id=? AND entity_id=?')
        .get(gameWorld, NPC_ID);
      expect(JSON.parse(String(row?.['payload']))['name']).toBe(gameName);
      expect(h.game.service.world.sequence).toBe(gameSequence);
      expect(entityGet(h.game.service.world.entities, NPC_ID)?.name).toBe(gameName);
      expect(h.calls).toHaveLength(0);
    } finally {
      await saves.close();
      await db.close();
      await h.close();
    }
  }, 120000);
});
