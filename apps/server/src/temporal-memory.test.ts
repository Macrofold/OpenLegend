import { validateTemporalEvidenceState } from '../../../packages/domain/src/temporal-validation.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendTemporalReceipt,
  selectedTemporalPolicy,
  PLAYER_ID,
  NPC_ID,
} from '@open-legend/domain';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function setup() {
  const store = await testRepository();
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('temporal-memory-fixture', true);
  return { store, service };
}

describe('bounded personal temporal storage', () => {
  it('selects original actor receipts from cold chunks and fences expired receipt membership', async () => {
    const { store, service } = await setup();
    const locators = await editWorld(service, (world) => {
      const result = [];
      for (let index = 0; index < 5; index++) {
        world.simTime += 1;
        const receipt = appendTemporalReceipt(
          world,
          PLAYER_ID,
          {
            subject: 'fixture-animal',
            change: 'change',
            facets: [
              {
                role: 'direct',
                asOf: world.simTime,
                measuredFrom: world.simTime,
                measuredThrough: world.simTime,
                acquiredAt: world.simTime,
                value: {
                  kind: 'location',
                  location: { kind: 'point', point: { x: index, y: 0, z: 1 }, errorRadius: 0 },
                  frame: { positionAtObservation: { x: 0, y: 0, z: 0 } },
                },
              },
            ],
          },
          selectedTemporalPolicy(world).recent,
        )!;
        result.push({
          actorId: receipt.actorId,
          physicalLife: receipt.physicalLife,
          epoch: receipt.epoch,
          ordinal: receipt.ordinal,
        });
      }
      return result;
    });
    await service.flush();
    const head = await store.db
      .prepare('SELECT generation FROM world_head WHERE world_id=?')
      .get(service.world.id);
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: String(head!['generation']),
    };
    const selected = await store.memories.temporalHistory(
      scope,
      { subjects: ['fixture-animal'], limit: 128, bytes: 32768 },
      service.world,
    );
    expect(
      selected.entries
        .filter((entry) => entry.receipt.subject === 'fixture-animal')
        .map((entry) => entry.values[0]),
    ).toHaveLength(5);
    expect(await store.memories.temporalReceiptsCurrent(scope, locators)).toBe(true);
    expect(
      (
        await store.memories.temporalHistory(
          { ...scope, actorId: NPC_ID },
          { subjects: ['fixture-animal'], bytes: 32768 },
          service.world,
        )
      ).entries,
    ).toHaveLength(0);
    const last = selected.entries.at(-1)!.receipt;
    expect(
      (
        await store.memories.temporalHistory(
          scope,
          {
            subjects: ['fixture-animal'],
            before: { epoch: last.epoch, ordinal: last.ordinal, at: last.at, order: last.order },
            bytes: 32768,
          },
          service.world,
        )
      ).entries,
    ).toHaveLength(4);
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 2;
    });
    expect(await store.memories.temporalReceiptsCurrent(scope, locators)).toBe(false);
    expect(
      (
        await store.memories.temporalHistory(
          scope,
          { subjects: ['fixture-animal'], bytes: 32768 },
          service.world,
        )
      ).entries,
    ).toHaveLength(0);
    validateTemporalEvidenceState(service.world);
  });

  it('coarsens a warranted own outcome, physically removes its exact body and later fades and expires', async () => {
    const { store, service } = await setup();
    const id = await editWorld(
      service,
      (world) =>
        appendMemory(world, PLAYER_ID, {
          kind: 'episode',
          source: 'felt',
          summary: 'My left arm hurt after the fall.',
          eventType: 'fixture-fall',
          entityIds: [],
          importance: 7,
        })!,
    );
    const original = service.world.memories[PLAYER_ID]!.find((entry) => entry.id === id)!;
    expect(original.retention?.receipt).toBeDefined();
    const after = selectedTemporalPolicy(service.world).aftermathSeconds;
    await editWorld(service, (world) => {
      world.simTime += after + 1;
    });
    const impression = JSON.parse(
      String(
        (await store.db
          .prepare(
            'SELECT payload FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?',
          )
          .get(service.world.id, PLAYER_ID, id))!['payload'],
      ),
    ) as typeof original;
    expect(impression.kind).toBe('impression');
    expect(impression.evidence).toBeUndefined();
    expect(impression.impression?.claims.some((claim) => claim.kind === 'interpretation')).toBe(
      true,
    );
    const versions = await store.db
      .prepare(
        'SELECT COUNT(*) AS count FROM mind_source_versions WHERE world_id=? AND actor_id=? AND source_id=?',
      )
      .get(service.world.id, PLAYER_ID, id);
    expect(Number(versions!['count'])).toBe(0);
    const exact = await store.db
      .prepare('SELECT payload FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?')
      .get(service.world.id, PLAYER_ID, id);
    expect(JSON.parse(String(exact!['payload'])).kind).toBe('impression');
    await editWorld(service, (world) => {
      world.simTime = impression.impression!.weakenAt;
    });
    const weakened = JSON.parse(
      String(
        (await store.db
          .prepare(
            'SELECT payload FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?',
          )
          .get(service.world.id, PLAYER_ID, id))!['payload'],
      ),
    ) as typeof original;
    expect(weakened.summary).toBe('');
    expect(weakened.impression?.claims).toEqual([
      { kind: 'occurrence', eventType: 'fixture-fall', role: 'direct' },
    ]);
    await editWorld(service, (world) => {
      world.simTime = weakened.impression!.expiresAt;
    });
    expect(service.world.memories[PLAYER_ID]!.some((entry) => entry.id === id)).toBe(false);
    expect(
      await store.db
        .prepare('SELECT id FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?')
        .get(service.world.id, PLAYER_ID, id),
    ).toBeUndefined();
    expect(service.world.experience!.forgotten[PLAYER_ID] ?? []).not.toContain(id);
  });
});
