import { validateTemporalEvidenceState } from '../../../packages/domain/src/temporal-validation.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendTemporalReceipt,
  selectedTemporalPolicy,
  PLAYER_ID,
  NPC_ID,
  entityGet,
} from '@open-legend/domain';
import { appendMemory, acquireExposure } from '../../../packages/domain/src/events.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { randomUUID } from 'node:crypto';

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
  it('keeps minimum exact learned-place support after its account expires and revokes it on forgetting', async () => {
    const { store, service } = await setup();
    const result = await editWorld(service, (world) => {
      const place = Object.values(world.places)[0]!;
      const event = acquireExposure(
        world,
        [],
        entityGet(world.entities, PLAYER_ID)!,
        place.landmarkId,
        {
          kind: 'place',
          id: place.id,
          revision: place.revision,
          label: place.label,
          description: place.description,
          point: { ...place.point },
          locationLabel: place.label,
          landmarkId: place.landmarkId,
        },
      );
      return { eventId: event.id, placeId: place.id, label: place.label };
    });
    expect(
      Object.values(service.world.experience!.temporal!.actors[PLAYER_ID]!.supports ?? {}).some(
        (support) => support.receipt.sourceIds.includes(result.eventId),
      ),
    ).toBe(true);
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).aftermathSeconds + 1;
    });
    expect(
      await store.db
        .prepare('SELECT id FROM mind_awareness WHERE world_id=? AND actor_id=? AND source_id=?')
        .get(service.world.id, PLAYER_ID, result.eventId),
    ).toBeUndefined();
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: String(
        (await store.db
          .prepare('SELECT generation FROM world_head WHERE world_id=?')
          .get(service.world.id))!['generation'],
      ),
    };
    expect(
      (await store.memories.knownPlaces(scope, { placeId: result.placeId, limit: 20, scan: 128 }))
        .entries,
    ).toHaveLength(1);
    expect(
      (await store.memories.prepareKnownPlaceEvidence(scope)).labels.get(result.label),
    ).toHaveLength(1);
    expect(
      (await store.records.load(true))!.state.world.experience!.temporal!.actors[PLAYER_ID]!
        .supports,
    ).toBeDefined();
    expect((await service.forgetMemory(PLAYER_ID, result.eventId)).ok).toBe(true);
    expect(
      (await store.memories.knownPlaces(scope, { placeId: result.placeId, limit: 20, scan: 128 }))
        .entries,
    ).toHaveLength(0);
  });
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
    expect((await store.records.load(true))?.state.world.experience?.temporal).toBeDefined();
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
    expect((await service.forgetRecentObservation(locators[2]!)).ok).toBe(true);
    expect(await store.memories.temporalReceiptsCurrent(scope,[locators[2]!])).toBe(false);
    expect((await store.memories.temporalHistory(scope,{subjects:['fixture-animal'],bytes:32768},service.world)).entries).toHaveLength(4);
    expect((await service.say('temporal-correction-words',PLAYER_ID,'That earlier location was mistaken.')).ok).toBe(true);
    const correcting=service.world.experience!.awareness[PLAYER_ID]!.filter((entry)=>entry.eventType==='speech').at(-1)!;
    expect((await service.correctRecentObservation(locators[3]!,correcting.eventId)).ok).toBe(true);
    expect(await store.memories.temporalReceiptsCurrent(scope,[locators[3]!])).toBe(false);
    expect(service.world.experience!.awareness[PLAYER_ID]!.some((entry)=>entry.eventId===correcting.eventId)).toBe(true);
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

  it('restores exact retained receipt addresses and starts a distinct future address space', async () => {
    const { store, service } = await setup();
    const first = await editWorld(
      service,
      (world) =>
        appendTemporalReceipt(
          world,
          PLAYER_ID,
          {
            subject: 'restore-proof',
            change: 'occurrence',
            facets: [
              {
                role: 'direct',
                asOf: world.simTime,
                measuredFrom: world.simTime,
                measuredThrough: world.simTime,
                acquiredAt: world.simTime,
                value: {
                  kind: 'personal-account',
                  source: 'memory',
                  id: 'restore-source',
                  text: 'An actual retained source.',
                },
              },
            ],
          },
          selectedTemporalPolicy(world).recent,
        )!,
    );
    const saveId = randomUUID();
    await service.createSave('Exact recent observations', saveId);
    const saved = await store.saves.read(service.world.id, saveId);
    const oldNamespace = service.world.experience!.temporal!.namespace;
    await service.restoreSave(saveId, randomUUID(), saved);
    expect(service.world.experience!.temporal!.namespace).not.toBe(oldNamespace);
    const stored = (await store.records.load(true))!.state.world;
    validateTemporalEvidenceState(stored);
    const scope = {
      worldId: stored.id,
      actorId: PLAYER_ID,
      generation: String(
        (await store.db
          .prepare('SELECT generation FROM world_head WHERE world_id=?')
          .get(stored.id))!['generation'],
      ),
    };
    expect(await store.memories.temporalReceiptsCurrent(scope, [first])).toBe(true);
    expect((await service.control({ paused: false, clientId: 'temporal-memory-fixture' })).ok).toBe(
      true,
    );
    const second = await editWorld(
      service,
      (world) =>
        appendTemporalReceipt(
          world,
          PLAYER_ID,
          {
            subject: 'restore-proof',
            change: 'occurrence',
            facets: [
              {
                role: 'direct',
                asOf: world.simTime,
                measuredFrom: world.simTime,
                measuredThrough: world.simTime,
                acquiredAt: world.simTime,
                value: {
                  kind: 'personal-account',
                  source: 'memory',
                  id: 'later-source',
                  text: 'A new received source.',
                },
              },
            ],
          },
          selectedTemporalPolicy(world).recent,
        )!,
    );
    expect(second.epoch).not.toBe(first.epoch);
    expect(
      (
        await store.memories.temporalHistory(
          scope,
          { subjects: ['restore-proof'], bytes: 32768 },
          service.world,
        )
      ).entries.map((entry) => entry.receipt.epoch),
    ).toContain(first.epoch);
  });

  it('bounds optional search data without deleting the character account or its literal search fallback', async () => {
    const { store, service } = await setup();
    const id = await editWorld(
      service,
      (world) =>
        appendMemory(world, PLAYER_ID, {
          kind: 'episode',
          source: 'felt',
          summary: 'Distinctive zincbell account.',
          eventType: 'fixture-outcome',
          entityIds: [],
          importance: 5,
        })!,
    );
    await service.flush();
    const source = await store.db
      .prepare(
        "SELECT revision FROM recall_sources WHERE world_id=? AND actor_id=? AND id=? AND source_kind='memory'",
      )
      .get(service.world.id, PLAYER_ID, id);
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: String(
        (await store.db
          .prepare('SELECT generation FROM world_head WHERE world_id=?')
          .get(service.world.id))!['generation'],
      ),
    };
    await store.memories.annotate(
      scope,
      { kind: 'memory', id, revision: String(source!['revision']) },
      'fixture',
      0,
      { optional: 'x'.repeat(selectedTemporalPolicy(service.world).derivedMaxBytes + 100) },
    );
    expect(await store.memories.derivedUsage(scope)).toBeLessThanOrEqual(
      selectedTemporalPolicy(service.world).derivedMaxBytes,
    );
    expect(
      await store.db
        .prepare('SELECT id FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?')
        .get(scope.worldId, PLAYER_ID, id),
    ).toBeDefined();
    await store.db
      .prepare(
        "UPDATE recall_sources SET search_text='' WHERE world_id=? AND actor_id=? AND id=? AND source_kind='memory'",
      )
      .run(scope.worldId, PLAYER_ID, id);
    expect(
      (
        await store.memories.browse(scope, { terms: ['zincbell'], limit: 20, scan: 128 })
      ).entries.some((entry) => entry.memory.id === id),
    ).toBe(true);
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
