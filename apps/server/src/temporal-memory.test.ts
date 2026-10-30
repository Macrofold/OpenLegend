import { appendTemporalReceipt } from '../../../packages/domain/src/temporal-evidence.js';
import { temporalHistoryWindow } from './temporal-storage.js';
import { temporalChunkReceipts, temporalChunkReferences } from '@open-legend/domain';
import { validateTemporalEvidenceState } from '../../../packages/domain/src/temporal-validation.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as worldComposition from '../../../packages/domain/src/world-composition.js';
import {
  selectedTemporalPolicy,
  PLAYER_ID,
  NPC_ID,
  entityGet,
  experiences,
  experienceEntryKey,
  experienceSourceReference,
  acceptConsolidation,
  learnRecipe,
  executeCommand,
  temporalReceiptId,
  retainTemporalSupport,
  entitySet,
  initializePerception,
  setAttentionFocus,
  currentBodyLocalSubject,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  selectedRecognitionSupportSourceIds,
  selectedRecognitionMaintenanceDue,
  adjustRetainedKnowledgeAccounting,
  entityValues,
  createItemLot,
  seedAgency,
  advanceWorld,
  currentBodyObservation,
  type Command,
  type TemporalChunk,
  type TemporalReceiptLocator,
} from '@open-legend/domain';
import { appendMemory, acquireExposure } from '../../../packages/domain/src/events.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld, useNearCampSight } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { temporalHistoryForModel } from './situation-context.js';
import { memoryHistory } from './memory-history.js';
import { routineSensePolicy } from '../../../packages/domain/src/perception.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function setup() {
  const store = await testRepository();
  await store.ready;
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
  it('can forget a corrected impression of an actual inspection while keeping actor ownership', async () => {
    const { store, service } = await setup();
    const itemId = await editWorld(service, (world) =>
      createItemLot(world, PLAYER_ID, 'wood', 1, 'corrected-inspection-wood'),
    );
    expect(
      (
        await service.transition((world) =>
          executeCommand(world, {
            id: 'corrected-inspection',
            actorId: PLAYER_ID,
            type: 'inspect-inventory',
            itemId,
          }),
        )
      ).ok,
    ).toBe(true);
    const sourceId = service.world.experience!.awareness[PLAYER_ID]!.find(
      (entry) => entry.eventType === 'inventory-inspected',
    )!.eventId;
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).aftermathSeconds + 1;
    });
    const stored = () =>
      store.db
        .prepare(
          'SELECT payload FROM mind_memories WHERE world_id=? AND actor_id=? AND source_id=?',
        )
        .get(service.world.id, PLAYER_ID, sourceId);
    expect(JSON.parse(String((await stored())!['payload'])).kind).toBe('impression');
    expect((await service.forgetMemory(NPC_ID, sourceId)).ok).toBe(false);
    expect(
      (
        await service.say(
          'correct-inspection-impression',
          PLAYER_ID,
          'I correct my earlier recollection of inspecting the wood.',
        )
      ).ok,
    ).toBe(true);
    const correctionId = service.world.events.filter((event) => event.type === 'speech').at(-1)!.id;
    expect((await service.correctMemory(PLAYER_ID, sourceId, correctionId)).ok).toBe(true);
    expect(await stored()).toBeDefined();
    expect((await service.forgetMemory(PLAYER_ID, sourceId)).ok).toBe(true);
    expect(await stored()).toBeUndefined();
    for (const [table, field] of [
      ['recall_sources', 'id'],
      ['mind_source_versions', 'source_id'],
      ['mind_source_dependencies', 'derived_id'],
      ['mind_impression_spans', 'owner_id'],
    ] as const)
      expect(
        Number(
          (await store.db
            .prepare(
              `SELECT COUNT(*)AS count FROM ${table} WHERE world_id=? AND actor_id=? AND ${field}=?`,
            )
            .get(service.world.id, PLAYER_ID, sourceId))!['count'],
        ),
      ).toBe(0);
    validateTemporalEvidenceState((await store.records.load(true))!.state.world);
  });

  it('reclaims a revoked shared source after its last receipt while preserving another witness and a later append', async () => {
    const { store, service } = await setup();
    await useNearCampSight(service);
    await editWorld(service, (world) => {
      for (const entity of entityValues(world.entities))
        if (entity.actor && entity.id !== PLAYER_ID && entity.id !== NPC_ID) {
          entity.actor.senses = [];
          setSpatialPosition(world, entity, { x: 100, y: 0, z: 100 }, 'terrain');
        }
      setSpatialPosition(
        world,
        entityGet(world.entities, PLAYER_ID)!,
        { x: 20, y: 0, z: 5.5 },
        'terrain',
      );
      setSpatialPosition(
        world,
        entityGet(world.entities, NPC_ID)!,
        { x: 22, y: 0, z: 5.5 },
        'terrain',
      );
      initializePerception(world, []);
      world.simTime += 1;
    });
    expect(
      (
        await service.say(
          'shared-block-words',
          PLAYER_ID,
          'We both heard these exact words.',
          NPC_ID,
        )
      ).ok,
    ).toBe(true);
    const eventId = service.world.events.filter((event) => event.type === 'speech').at(-1)!.id;
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: (await store.records.head())!.generation,
    };
    const received = (actorId: string) => {
      const locator = service.world.experience!.awareness[actorId]!.find(
        (entry) => entry.eventId === eventId,
      )!.sourceReceipt!;
      expect(locator).toBeDefined();
      return service.world
        .experience!.temporal!.actors[
          actorId
        ]!.chunks.flatMap((chunk) => temporalChunkReceipts(chunk))
        .find((receipt) => receipt.epoch === locator.epoch && receipt.ordinal === locator.ordinal)!;
    };
    const own = received(PLAYER_ID),
      witness = received(NPC_ID);
    expect(own).toBeDefined();
    expect(witness).toBeDefined();
    const block = own.facets.find((reference) =>
      witness.facets.some((other) => other.blockId === reference.blockId),
    )!.blockId;
    const owners = async () =>
      (
        await store.db
          .prepare(
            'SELECT payload FROM mind_temporal_chunks_read WHERE world_id=? AND source_refs @> ARRAY[?]::text[]',
          )
          .all(service.world.id, block)
      ).flatMap((row) => {
        const chunk = JSON.parse(String(row['payload'])) as TemporalChunk;
        return temporalChunkReceipts(chunk).filter((receipt) =>
          receipt.facets.some((reference) => reference.blockId === block),
        );
      });
    const address = (receipt: TemporalReceiptLocator): TemporalReceiptLocator => ({
      actorId: receipt.actorId,
      physicalLife: receipt.physicalLife,
      epoch: receipt.epoch,
      ordinal: receipt.ordinal,
    });
    expect((await service.forgetRecentObservation(address(own))).ok).toBe(true);
    expect((await owners()).some((receipt) => receipt.actorId === NPC_ID)).toBe(true);
    expect(
      await store.db
        .prepare('SELECT source_id FROM mind_perception_values WHERE world_id=? AND source_id=?')
        .get(service.world.id, block),
    ).toBeDefined();
    await editWorld(service, (world) => {
      world.simTime += 1;
    });
    expect(
      (
        await service.say(
          'later-independent-words',
          PLAYER_ID,
          'A later independent statement.',
          NPC_ID,
        )
      ).ok,
    ).toBe(true);
    for (let limit = 0; limit < 32; limit++) {
      const [receipt] = await owners();
      if (!receipt) break;
      expect((await service.forgetRecentObservation(address(receipt))).ok).toBe(true);
    }
    expect(await owners()).toEqual([]);
    expect(
      await store.db
        .prepare('SELECT source_id FROM mind_perception_values WHERE world_id=? AND source_id=?')
        .get(service.world.id, block),
    ).toBeUndefined();
    expect(service.world.receivedValues!.sources[block]).toBeUndefined();
    const cold = (await store.records.load(true))!.state.world;
    validateTemporalEvidenceState(cold);
    const remaining = await store.memories.temporalHistory(
      scope,
      { limit: 128, bytes: 262144 },
      cold,
    );
    expect(JSON.stringify(remaining)).toContain('A later independent statement.');
  });

  it('retains the newest whole operations under recent-recording pressure without replacing movement with endpoints', async () => {
    const { store, service } = await setup();
    await useNearCampSight(service);
    await editWorld(service, (world) => {
      for (const entity of entityValues(world.entities))
        if (entity.actor && entity.id !== PLAYER_ID) {
          entity.actor.controller = 'player';
          entity.actor.senses = [];
          setSpatialPosition(world, entity, { x: 100, y: 0, z: 100 }, 'terrain');
        }
      const observer = entityGet(world.entities, PLAYER_ID)!,
        person = entityGet(world.entities, NPC_ID)!;
      setSpatialPosition(world, observer, { x: 1, y: 0, z: 2 }, 'terrain');
      setSpatialPosition(world, person, { x: 3, y: 0, z: 2 }, 'terrain');
      world.simTime += routineSensePolicy(world, observer).sight?.seconds ?? 0;
      initializePerception(world, []);
      const [key] = Object.entries(
        world.perceptionEvidence![PLAYER_ID]!.attention!.candidates,
      ).find(([, candidate]) => candidate.sourceId === NPC_ID)!;
      expect(setAttentionFocus(world, PLAYER_ID, [key])).toBe(true);
    });
    const subject = currentBodyObservation(service.world, PLAYER_ID, NPC_ID)!.exposure.episodeId,
      firstAt = service.world.simTime,
      installed = selectedTemporalPolicy(service.world);
    // This receiving operation includes nineteen held-field confirmations and one
    // position change. Fit several whole operations while still forcing a prefix
    // release, without changing the bundled world's production allowance.
    const policy = vi.spyOn(worldComposition, 'selectedTemporalPolicy').mockReturnValue({
      ...installed,
      recent: { ...installed.recent, maxChanges: 64 },
    });
    try {
      for (const x of [4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 5, 6, 7, 8])
        await editWorld(service, (world) => {
          world.simTime +=
            routineSensePolicy(world, entityGet(world.entities, PLAYER_ID)!).sight?.detailSeconds ??
            0;
          setSpatialPosition(
            world,
            entityGet(world.entities, NPC_ID)!,
            { x, y: 0, z: 2 },
            'terrain',
            { continuity: 'physical' },
          );
          initializePerception(world, []);
        });
      const scope = {
        worldId: service.world.id,
        actorId: PLAYER_ID,
        generation: (await store.records.head())!.generation,
      };
      const recent = await store.memories.temporalHistory(
        scope,
        { subjects: [subject], limit: 128, bytes: 32768 },
        service.world,
      );
      const positions = recent.entries.flatMap(({ values }) =>
        values.flatMap((value) => (value.kind === 'body' ? [value.body.position.x] : [])),
      );
      expect(recent.incomplete).toBe(true);
      expect(positions.at(-1)).toBe(8);
      expect(positions).toContain(7);
      expect(positions).not.toContain(3);
      expect(
        service.world.experience!.temporal!.actors[PLAYER_ID]!.releasedThrough,
      ).toBeGreaterThanOrEqual(firstAt);
      expect(
        Number(
          (await store.db
            .prepare(
              'SELECT COALESCE(SUM(receipt_count),0) AS count FROM mind_temporal_chunks WHERE world_id=? AND actor_id=?',
            )
            .get(service.world.id, PLAYER_ID))!['count'],
        ),
      ).toBeLessThanOrEqual(64);
      expect(currentBodyObservation(service.world, PLAYER_ID, NPC_ID)!.value.kind).toBe('body');
      validateTemporalEvidenceState((await store.records.load(true))!.state.world);
    } finally {
      policy.mockRestore();
    }
  });

  it('holds a whole native speech-and-obligation batch before installation when required support cannot fit', async () => {
    const { store, service } = await setup();
    const installed = selectedTemporalPolicy(service.world);
    const policy = vi.spyOn(worldComposition, 'selectedTemporalPolicy').mockReturnValue({
      ...installed,
      required: { ...installed.required, maxRecords: 1 },
    });
    try {
      expect(
        (await service.say('first-required-promise', PLAYER_ID, 'I promise to gather wood.')).ok,
      ).toBe(true);
      const before = service.world,
        encoded = JSON.stringify(before),
        head = await store.records.head();
      expect(
        before.memories[PLAYER_ID]!.filter(
          (record) => record.kind === 'commitment' && !record.resolved,
        ),
      ).toHaveLength(1);
      const refused = await service.say(
        'overflow-required-promise',
        PLAYER_ID,
        'I promise to gather berries.',
      );
      expect(refused.ok).toBe(false);
      expect(service.storageError).not.toBeNull();
      expect(service.world).toBe(before);
      expect(JSON.stringify(service.world)).toBe(encoded);
      expect(await store.records.head()).toEqual(head);
      const stored = (await store.records.load(true))!.state.world;
      expect(
        stored.memories[PLAYER_ID]!.filter(
          (record) => record.kind === 'commitment' && !record.resolved,
        ),
      ).toHaveLength(1);
      expect(JSON.stringify(stored.experience!.awareness[PLAYER_ID])).not.toContain(
        'I promise to gather berries.',
      );
    } finally {
      policy.mockRestore();
    }
  });

  it('keeps an unknown person’s actual move, work, meal and words in order without inventing a destination', async () => {
    const { store, service } = await setup();
    await useNearCampSight(service);
    const strangerId = 'sequence-stranger';
    const hiddenName = 'Confidential Rowan';
    const foodId = await editWorld(service, (world) => {
      for (const entity of entityValues(world.entities))
        if (entity.actor && entity.id !== PLAYER_ID && entity.id !== NPC_ID) {
          entity.actor.controller = 'player';
          entity.actor.senses = [];
          setSpatialPosition(world, entity, { x: 90, y: 0, z: 90 }, 'terrain');
        }
      const player = entityGet(world.entities, PLAYER_ID)!,
        witness = entityGet(world.entities, NPC_ID)!;
      witness.actor!.controller = 'player';
      setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, 'terrain');
      setSpatialPosition(world, witness, { x: 1, y: 0, z: 3 }, 'terrain');
      const stranger = structuredClone(witness);
      stranger.id = strangerId;
      stranger.name = hiddenName;
      stranger.actor!.agency = seedAgency([]);
      delete stranger.actor!.voiceProfile;
      entitySet(world.entities, stranger.id, stranger);
      setSpatialPosition(world, stranger, { x: 3, y: 0, z: 2 }, 'terrain');
      const branches = entityGet(world.entities, 'branches')!;
      setSpatialPosition(world, branches, { x: 6, y: 0, z: 2 }, 'terrain');
      const anvil = structuredClone(
        entityValues(world.entities).find((entity) => entity.kind === 'practice-target')!,
      );
      anvil.id = 'ambiguous-anvil';
      anvil.name = 'Anvil';
      anvil.description = 'An ironworking block beside the plant.';
      entitySet(world.entities, anvil.id, anvil);
      setSpatialPosition(world, anvil, { x: 5.5, y: 0, z: 3 }, 'terrain');
      const plant = entityGet(world.entities, 'berries-west')!;
      setSpatialPosition(world, plant, { x: 6, y: 0, z: 1 }, 'terrain');
      const food = createItemLot(world, strangerId, 'berries', 1, 'sequence-food');
      world.simTime += routineSensePolicy(world, player).sight?.seconds ?? 0;
      initializePerception(world, []);
      for (const observerId of [PLAYER_ID, NPC_ID]) {
        const key = Object.entries(
          world.perceptionEvidence![observerId]!.attention!.candidates,
        ).find(([, candidate]) => candidate.sourceId === strangerId)![0];
        expect(setAttentionFocus(world, observerId, [key])).toBe(true);
      }
      return food;
    });
    const exposure = currentBodyObservation(service.world, PLAYER_ID, strangerId)!.exposure
      .episodeId;
    const npcExposure = currentBodyObservation(service.world, NPC_ID, strangerId)!.exposure
      .episodeId;
    const command = async (input: Command, seconds = 0) => {
      const result = await service.transition((world) => {
        const started = executeCommand(world, input);
        expect(started.outcome.ok, started.outcome.message).toBe(true);
        if (!seconds) return started;
        const completed = advanceWorld(started.world, seconds);
        return { ...completed, events: [...started.events, ...completed.events] };
      });
      expect(result.ok, result.message).toBe(true);
    };
    const points: number[] = [];
    expect(
      (
        await service.transition((world) => {
          const started = executeCommand(world, {
            id: 'sequence-walk',
            actorId: strangerId,
            type: 'move',
            destination: { x: 5, y: 0, z: 2, surfaceId: 'terrain' },
          });
          expect(started.outcome.ok, started.outcome.message).toBe(true);
          let next = started.world;
          const events = [...started.events];
          for (
            let step = 0;
            step < 30 && entityGet(next.entities, strangerId)!.actor!.action;
            step++
          ) {
            const moved = advanceWorld(next, 4);
            next = moved.world;
            events.push(...moved.events);
            points.push(worldPosition(entityGet(next.entities, strangerId)!).x);
          }
          expect(entityGet(next.entities, strangerId)!.actor!.action).toBeNull();
          return { ...started, world: next, events };
        })
      ).ok,
    ).toBe(true);
    expect(new Set(points).size).toBeGreaterThan(2);
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: (await store.records.head())!.generation,
    };
    const walking = await store.memories.temporalHistory(
      scope,
      { subjects: [exposure], bytes: 262144, limit: 128 },
      service.world,
    );
    const walkingText = JSON.stringify(temporalHistoryForModel(service.world, PLAYER_ID, walking));
    expect(walkingText).not.toContain(hiddenName);
    // Received nearby state may identify visible objects. The actual movement
    // sequence must not turn that context into an invented destination.
    const movementText = JSON.stringify(walking.entries);
    expect(movementText).not.toContain('Anvil');
    expect(movementText).not.toContain('Berry bush');
    expect(walkingText).not.toMatch(/going to|intends to|destinationLabel/);
    const receivedPoints = walking.entries.flatMap(({ values }) =>
      values.flatMap((value) => (value.kind === 'body' ? [value.body.position.x] : [])),
    );
    expect(new Set(receivedPoints).size).toBeGreaterThan(2);
    const workAt = service.world.simTime;
    await command(
      { id: 'sequence-work', actorId: strangerId, type: 'gather', targetId: 'branches' },
      entityGet(service.world.entities, 'branches')!.resource!.workSeconds + 1,
    );
    const mealAt = service.world.simTime;
    await command({ id: 'sequence-meal', actorId: strangerId, type: 'eat', itemId: foodId });
    const words = 'The wood is ready. I ate the berries.';
    await command({
      id: 'sequence-words',
      actorId: strangerId,
      type: 'say',
      volume: 'normal',
      text: words,
    });
    expect(
      service.world.events.find(
        (event) => event.type === 'gathered' && event.actorId === strangerId,
      )?.data,
    ).toMatchObject({ definitionId: 'wood', quantity: 1 });
    const page = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
    expect(JSON.stringify(page)).toContain(words);
    expect(JSON.stringify(page)).not.toContain(hiddenName);
    for (const [observerId, subject] of [
      [PLAYER_ID, exposure],
      [NPC_ID, npcExposure],
    ] as const) {
      const allReceived = await store.memories.temporalHistory(
        { ...scope, actorId: observerId },
        { bytes: 262144, limit: 128 },
        service.world,
      );
      expect(
        allReceived.entries.some(({ values }) =>
          values.some((value) => value.kind === 'event' && value.eventType === 'gathered'),
        ),
      ).toBe(true);
      const history = await store.memories.temporalHistory(
        { ...scope, actorId: observerId },
        { subjects: [subject], bytes: 262144, limit: 128 },
        service.world,
      );
      const events = history.entries.flatMap(({ receipt, values }) =>
        values.flatMap((value) =>
          value.kind === 'event' ? [{ at: receipt.at, type: value.eventType }] : [],
        ),
      );
      expect(events.some((event) => event.type === 'gathered' && event.at > workAt)).toBe(true);
      expect(events.some((event) => event.type === 'ate' && event.at >= mealAt)).toBe(true);
      expect(
        history.entries.some(({ values }) =>
          values.some(
            (value) => value.kind === 'speech' && JSON.stringify(value.speech).includes(words),
          ),
        ),
      ).toBe(true);
      const projected = JSON.stringify(temporalHistoryForModel(service.world, observerId, history));
      expect(projected).not.toContain(hiddenName);
      expect(projected).not.toContain(strangerId);
      expect(history.entries.map((entry) => entry.receipt.at)).toEqual(
        [...history.entries.map((entry) => entry.receipt.at)].sort((a, b) => a - b),
      );
    }
    await command(
      {
        id: 'sequence-leave',
        actorId: strangerId,
        type: 'move',
        destination: { x: 30, y: 0, z: 2, surfaceId: 'terrain' },
      },
      600,
    );
    expect(currentBodyObservation(service.world, PLAYER_ID, strangerId)).toBeUndefined();
    const lost = await store.memories.temporalHistory(
      scope,
      { subjects: [exposure], from: mealAt, bytes: 262144, limit: 128 },
      service.world,
    );
    expect(lost.incomplete).toBe(true);
    const loss = lost.entries.find(({ receipt }) => receipt.change === 'loss');
    expect(loss).toBeDefined();
    expect(loss!.receipt.facets.some((fact) => fact.measuredThrough < loss!.receipt.at)).toBe(true);
    expect(JSON.stringify(temporalHistoryForModel(service.world, PLAYER_ID, lost))).not.toMatch(
      /stopped|arrived at|destinationLabel/,
    );
    const cold = (await store.records.load(true))!.state.world;
    validateTemporalEvidenceState(cold);
    expect(
      (
        await store.memories.temporalHistory(
          scope,
          { subjects: [exposure], from: mealAt, bytes: 262144, limit: 128 },
          cold,
        )
      ).entries,
    ).toEqual(lost.entries);
  });
  it('refuses an incompatible development database before changing its marker or tables', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'ol-current-format-'));
    const first = await testRepository(directory);
    await first.ready;
    const before = await first.db
      .prepare(
        "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='open_legend'",
      )
      .get();
    await first.db.prepare("UPDATE meta SET value='22' WHERE key='schema'").run();
    await first.close();
    const refused = await testRepository(directory);
    cleanup.push(async () => {
      await refused.close();
      rmSync(directory, { recursive: true, force: true });
    });
    await expect(refused.ready).rejects.toThrow('Unsupported database schema');
    expect(
      (await refused.db.prepare("SELECT value FROM meta WHERE key='schema'").get())!['value'],
    ).toBe('22');
    expect(
      (await refused.db
        .prepare(
          "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='open_legend'",
        )
        .get())!['count'],
    ).toBe(before!['count']);
  });
  it('reclaims retired exact summary leaves when only a fallible impression remains', async () => {
    const { store, service } = await setup();
    const ids = await editWorld(service, (world) =>
      [1, 2].map(
        (index) =>
          appendMemory(world, PLAYER_ID, {
            kind: 'episode',
            source: 'felt',
            summary: `Exact original outcome ${index}.`,
            eventType: 'fixture-outcome',
            entityIds: [],
            importance: 1,
          })!,
      ),
    );
    const sources = experiences(service.world, PLAYER_ID, true).filter((entry) =>
      ids.includes(entry.id),
    );
    const prepared = ids.map((id) => {
      const value = service.world.memories[PLAYER_ID]!.find((value) => value.id === id)!;
      const entry = { source: 'memory' as const, value };
      return { entry, ref: experienceSourceReference(entry) };
    });
    expect(
      (
        await service.transition((world) =>
          acceptConsolidation(
            world,
            PLAYER_ID,
            'fixture-exact-summary',
            prepared.map((source) => source.entry),
            [
              {
                sourceKeys: prepared.map(({ entry }) => experienceEntryKey(entry)),
                text: 'Two personal outcomes.',
              },
            ],
            prepared,
          ),
        )
      ).ok,
    ).toBe(true);
    expect(
      Number(
        (await store.db
          .prepare(
            'SELECT COUNT(*) AS count FROM mind_source_versions WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .get(service.world.id, PLAYER_ID, ids))!['count'],
      ),
    ).toBe(2);
    expect(
      (await store.records.load(true))!.state.world.experience!.temporal!.actors[PLAYER_ID]!
        .accounts!.archives!.required.count,
    ).toBe(2);
    const saveId = randomUUID();
    await service.createSave('Exact source closure', saveId);
    const saved = await store.saves.read(service.world.id, saveId);
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).aftermathSeconds + 1;
    });
    expect(
      Number(
        (await store.db
          .prepare(
            'SELECT COUNT(*) AS count FROM mind_source_versions WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .get(service.world.id, PLAYER_ID, ids))!['count'],
      ),
    ).toBe(0);
    expect((await service.forgetMemory(PLAYER_ID, ids[0]!)).ok).toBe(true);
    await service.restoreSave(saveId, randomUUID(), saved);
    expect(
      Number(
        (await store.db
          .prepare(
            'SELECT COUNT(*)AS count FROM mind_source_versions WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .get(service.world.id, PLAYER_ID, ids))!['count'],
      ),
    ).toBe(0);
    expect(
      (await store.records.load(true))!.state.world.experience!.temporal!.actors[PLAYER_ID]!
        .accounts!.archives!.required.count,
    ).toBe(0);
  });
  it('keeps minimum exact learned-place support after its account expires and revokes it on forgetting', async () => {
    const { store, service } = await setup();
    const result = await editWorld(service, (world) => {
      const learned = new Set(
        (world.experience?.awareness[PLAYER_ID] ?? []).flatMap((entry) =>
          entry.exposure?.kind === 'place' ? [entry.exposure.id] : [],
        ),
      );
      const place = Object.values(world.places).find((place) => !learned.has(place.id))!;
      if (!place) throw new Error('Fixture requires an independently unvisited authored place.');
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
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, locators)).toBe(true);
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
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, [locators[2]!])).toBe(false);
    expect(
      (
        await store.memories.temporalHistory(
          scope,
          { subjects: ['fixture-animal'], bytes: 32768 },
          service.world,
        )
      ).entries,
    ).toHaveLength(4);
    expect(
      (
        await service.say(
          'temporal-correction-words',
          PLAYER_ID,
          'That earlier location was mistaken.',
        )
      ).ok,
    ).toBe(true);
    const correcting = service.world
      .experience!.awareness[PLAYER_ID]!.filter((entry) => entry.eventType === 'speech')
      .at(-1)!;
    expect((await service.correctRecentObservation(locators[3]!, correcting.eventId)).ok).toBe(
      true,
    );
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, [locators[3]!])).toBe(false);
    expect(
      service.world.experience!.awareness[PLAYER_ID]!.some(
        (entry) => entry.eventId === correcting.eventId,
      ),
    ).toBe(true);
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 2;
    });
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, locators)).toBe(false);
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
    expect(() =>
      store.saves.validatePayload({
        ...saved,
        format: 'development-2026-10-26-receipt-backed-knowledge',
      }),
    ).toThrow('Unsupported save format');
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
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, [first])).toBe(true);
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
  it('retains an exactly supported taught method through ordinary expiry and removes it when its sole proof is explicitly forgotten', async () => {
    const { store, service } = await setup();
    const recipeId = service.world.itemDefinitions['field-sling-record']!.recipeRecord!.method.id;
    await editWorld(service, (world) => {
      expect(learnRecipe(world, NPC_ID, recipeId, 'record', 'fixture-teacher-method')).toBe(
        'acquired',
      );
    });
    expect(
      (
        await service.transition((world) =>
          executeCommand(world, {
            id: 'fixture-taught-method',
            type: 'teach',
            actorId: NPC_ID,
            targetId: PLAYER_ID,
            recipeId,
          }),
        )
      ).ok,
    ).toBe(true);
    const learned = service.world.knowledge[PLAYER_ID]!.find(
      (record) => record.recipeId === recipeId,
    )!;
    const receiptId = temporalReceiptId(learned.sourceReceipt!);
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).aftermathSeconds + 1;
    });
    expect(service.world.knowledge[PLAYER_ID]!.some((record) => record.recipeId === recipeId)).toBe(
      true,
    );
    expect(
      service.world.experience!.temporal!.actors[PLAYER_ID]!.supports![receiptId]!.required,
    ).toBe(true);
    const cold = (await store.records.load(true))!.state.world;
    expect(
      cold.knowledge[PLAYER_ID]!.find((record) => record.recipeId === recipeId)!.sourceReceipt,
    ).toEqual(learned.sourceReceipt);
    expect((await service.forgetRecentObservation(learned.sourceReceipt!)).ok).toBe(true);
    expect(service.world.knowledge[PLAYER_ID]!.some((record) => record.recipeId === recipeId)).toBe(
      false,
    );
    expect(
      await store.db
        .prepare(
          'SELECT id FROM mind_temporal_supports WHERE world_id=? AND actor_id=? AND source_id=?',
        )
        .get(service.world.id, PLAYER_ID, receiptId),
    ).toBeUndefined();
    expect(service.world.knowledge[PLAYER_ID]!.some((record) => record.source === 'authored')).toBe(
      true,
    );
  });
  it('expires a lone unnamed body encounter without letting its familiarity proof pin itself forever', async () => {
    const { store, service } = await setup();
    await useNearCampSight(service);
    const contact = await editWorld(service, (world) => {
      const visitor = structuredClone(entityGet(world.entities, NPC_ID)!);
      visitor.id = 'fixture-brief-visitor';
      entitySet(world.entities, visitor.id, visitor);
      const player = entityGet(world.entities, PLAYER_ID)!;
      const at = worldPosition(player);
      setSpatialPosition(world, visitor, { ...at, x: at.x + 2 }, worldSupport(player));
      world.simTime += routineSensePolicy(world, player).sight?.seconds ?? 0;
      initializePerception(world, []);
      const subject = currentBodyLocalSubject(world, PLAYER_ID, visitor.id)!;
      expect(subject.kind).toBe('individual');
      const [key] = Object.entries(
        world.perceptionEvidence![PLAYER_ID]!.attention!.candidates,
      ).find(([, candidate]) => candidate.sourceId === visitor.id)!;
      expect(setAttentionFocus(world, PLAYER_ID, [key])).toBe(true);
      world.simTime += routineSensePolicy(world, player).sight?.detailSeconds ?? 0;
      initializePerception(world, []);
      if (subject.kind !== 'individual') throw new Error('Expected encounter-local person.');
      const identity = world.observerIdentities![PLAYER_ID]![subject.individualId]!;
      expect(identity.givenName).toBe('');
      expect(identity.familiarity?.roots.length).toBeGreaterThan(0);
      return {
        individualId: subject.individualId,
        proofs: selectedRecognitionSupportSourceIds(
          world,
          identity.familiarity!.roots.flatMap((root) => [root.sourceKey, ...root.support]),
        ),
      };
    });
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 2;
    });
    const after = service.world.observerIdentities?.[PLAYER_ID]?.[contact.individualId];
    expect(after?.familiarity?.roots ?? []).toHaveLength(0);
    for (const proof of contact.proofs)
      expect(
        service.world.experience!.temporal!.actors[PLAYER_ID]!.supports?.[proof],
      ).toBeUndefined();
    expect(
      Number(
        (await store.db
          .prepare(
            'SELECT COUNT(*)AS count FROM mind_temporal_supports WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .get(service.world.id, PLAYER_ID, contact.proofs))!['count'],
      ),
    ).toBe(0);
    await editWorld(service, (world) => {
      const visitor = entityGet(world.entities, 'fixture-brief-visitor')!;
      const destination = entityGet(world.entities, 'riverside-workshop')!;
      setSpatialPosition(world, visitor, worldPosition(destination), worldSupport(destination));
      world.simTime +=
        routineSensePolicy(world, entityGet(world.entities, PLAYER_ID)!).sight?.seconds ?? 0;
      initializePerception(world, []);
    });
    expect(service.world.observerIdentities?.[PLAYER_ID]?.[contact.individualId]).toBeUndefined();
  });
  it('expires a provisional heard introduction at its scheduled deadline without another utterance', async () => {
    const { store, service } = await setup();
    await editWorld(service, (world) => {
      for (const [key, identity] of Object.entries(world.observerIdentities![PLAYER_ID]!)) {
        if (identity.retained && !identity.authored)
          adjustRetainedKnowledgeAccounting(world, PLAYER_ID, identity, undefined, {
            revocation: true,
          });
        delete world.observerIdentities![PLAYER_ID]![key];
      }
      const player = entityGet(world.entities, PLAYER_ID)!,
        speaker = entityGet(world.entities, NPC_ID)!;
      const at = worldPosition(player);
      setSpatialPosition(world, speaker, { ...at, x: at.x + 2 }, worldSupport(player));
      world.map.spatial.blockers.push({
        id: 'fixture-seed-sight-screen',
        bounds: {
          min: { x: at.x + 0.9, y: at.y, z: at.z - 1 },
          max: { x: at.x + 1.1, y: at.y + 3, z: at.z + 1 },
        },
        movement: false,
        sight: true,
        acousticTransmission: 1,
        material: 'cloth',
      });
      world.map.spatial.revision++;
      initializePerception(world, []);
    });
    expect(
      (
        await service.transition((world) =>
          executeCommand(world, {
            id: 'fixture-provisional-name',
            actorId: NPC_ID,
            type: 'say',
            targetId: PLAYER_ID,
            text: 'My name is Orin.',
            selfIntroduction: 'Orin',
          }),
        )
      ).ok,
    ).toBe(true);
    const [key, seed] = Object.entries(service.world.observerIdentities![PLAYER_ID]!).find(
      ([, identity]) => identity.seedOnly && identity.givenName === 'Orin',
    )!;
    expect(seed.seedOnly).toBe(true);
    const source = service.world
      .experience!.awareness[PLAYER_ID]!.filter((entry) => entry.eventType === 'speech')
      .at(-1)!.eventId;
    const proofs = Object.values(service.world.experience!.temporal!.actors[PLAYER_ID]!.supports!)
      .filter((capsule) => capsule.receipt.sourceIds.includes(source))
      .map((capsule) => capsule.receipt.id);
    expect(proofs.length).toBeGreaterThan(0);
    const due = selectedRecognitionMaintenanceDue(service.world, PLAYER_ID)!;
    expect(due).toBeGreaterThan(service.world.simTime);
    await editWorld(service, (world) => {
      world.simTime = due;
    });
    expect(service.world.observerIdentities![PLAYER_ID]![key]).toBeUndefined();
    expect(
      service.world.experience!.awareness[PLAYER_ID]!.some((entry) => entry.eventId === source),
    ).toBe(true);
    expect(
      Number(
        (await store.db
          .prepare(
            'SELECT COUNT(*)AS count FROM mind_temporal_supports WHERE world_id=? AND actor_id=? AND source_id=ANY(?::text[])',
          )
          .get(service.world.id, PLAYER_ID, proofs))!['count'],
      ),
    ).toBe(0);
    expect(
      await store.db
        .prepare('SELECT id FROM mind_recognition WHERE world_id=? AND id=?')
        .get(service.world.id, JSON.stringify(['world', 'observerIdentities', PLAYER_ID, key])),
    ).toBeUndefined();
  });
  it('continues past a whole oversized receipt without truncating it or hiding older observations', async () => {
    const { store, service } = await setup();
    const words = 'Received inscription '.repeat(800);
    await editWorld(service, (world) => {
      for (const [index, text] of [
        'Earlier short observation',
        'Later short observation',
        words,
        'Unrelated newer one',
        'Unrelated newer two',
      ].entries()) {
        world.simTime++;
        const receipt = appendTemporalReceipt(
          world,
          PLAYER_ID,
          {
            subject: index < 3 ? 'fixture-large-source' : 'fixture-unrelated-source',
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
                  id: `fixture-large-${index}`,
                  text,
                },
              },
            ],
          },
          selectedTemporalPolicy(world).recent,
        );
        expect(
          receipt,
          'The paging fixture must acquire each complete personal receipt.',
        ).toBeDefined();
      }
    });
    await service.flush();
    await store.memories.synchronizeSources();
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: String(
        (await store.db
          .prepare('SELECT generation FROM world_head WHERE world_id=?')
          .get(service.world.id))!['generation'],
      ),
    };
    const first = await store.memories.temporalHistory(
      scope,
      { subjects: ['fixture-large-source'], limit: 1, bytes: 1024 },
      service.world,
    );
    // Packed chunks can skip an oversized receipt and return an older complete
    // one in the same page; the cursor still must reach the remaining history.
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0]!.values[0]).toMatchObject({ text: 'Later short observation' });
    expect(first.incomplete).toBe(true);
    expect(first.hasMore).toBe(true);
    expect(first.nextBefore).toBeDefined();
    const older = await store.memories.temporalHistory(
      scope,
      { subjects: ['fixture-large-source'], limit: 1, bytes: 1024, before: first.nextBefore },
      service.world,
    );
    expect(older.entries).toHaveLength(1);
    expect(older.entries[0]!.values[0]).toMatchObject({ text: 'Earlier short observation' });
    const complete = await store.memories.temporalHistory(
      scope,
      { subjects: ['fixture-large-source'], bytes: 32768 },
      service.world,
    );
    expect(complete.entries.at(-1)!.values[0]).toMatchObject({ text: words });
  });
  it('rejects a pending full observation after expiry even when one sparse fact still has lawful support', async () => {
    const { store, service } = await setup();
    const locator = await editWorld(service, (world) => {
      world.simTime++;
      const at = world.simTime,
        policy = selectedTemporalPolicy(world);
      const receipt = appendTemporalReceipt(
        world,
        PLAYER_ID,
        {
          subject: 'fixture-partial-proof',
          change: 'occurrence',
          facets: [
            {
              role: 'direct',
              asOf: at,
              measuredFrom: at,
              measuredThrough: at,
              acquiredAt: at,
              value: {
                kind: 'location',
                location: { kind: 'point', point: { x: 2, y: 0, z: 2 }, errorRadius: 0 },
                frame: { positionAtObservation: { x: 0, y: 0, z: 0 } },
              },
            },
            {
              role: 'direct',
              asOf: at,
              measuredFrom: at,
              measuredThrough: at,
              acquiredAt: at,
              value: {
                kind: 'personal-account',
                source: 'memory',
                id: 'fixture-expiring-words',
                text: 'These exact words are not retained by the location proof.',
              },
            },
          ],
        },
        policy.recent,
      )!;
      expect(
        retainTemporalSupport(world, receipt, {
          facetOrdinals: [0],
          required: true,
          maxBytes: policy.required.maxBytes,
          maxRecords: policy.required.maxRecords,
        }),
      ).toBeDefined();
      return receipt;
    });
    await service.flush();
    await store.memories.synchronizeSources();
    const scope = {
      worldId: service.world.id,
      actorId: PLAYER_ID,
      generation: String(
        (await store.db
          .prepare('SELECT generation FROM world_head WHERE world_id=?')
          .get(service.world.id))!['generation'],
      ),
    };
    const full = (
      await store.memories.temporalHistory(
        scope,
        { subjects: ['fixture-partial-proof'] },
        service.world,
      )
    ).entries;
    expect(full).toHaveLength(1);
    expect(full[0]!.values).toHaveLength(2);
    expect(
      await store.memories.temporalSelectionsCurrent(scope, full, () =>
        temporalHistoryWindow(service.world),
      ),
    ).toBe(true);
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = delayed.then(() =>
      store.memories.temporalSelectionsCurrent(scope, full, () =>
        temporalHistoryWindow(service.world),
      ),
    );
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 1;
    });
    expect(await store.memories.temporalReceiptLocatorsCurrent(scope, [locator])).toBe(true);
    release();
    expect(await pending).toBe(false);
    const selected = full[0]!;
    expect(
      await store.memories.temporalSelectionsCurrent(
        scope,
        [
          {
            receipt: { ...selected.receipt, facets: [selected.receipt.facets[0]!] },
            values: [selected.values[0]!],
          },
        ],
        () => temporalHistoryWindow(service.world),
      ),
    ).toBe(true);
    expect(
      await store.memories.temporalSelectionsCurrent(
        scope,
        [
          {
            receipt: { ...selected.receipt, facets: [selected.receipt.facets[0]!] },
            values: [
              {
                kind: 'personal-account',
                source: 'memory',
                id: 'forged',
                text: 'Different value at the same address.',
              },
            ],
          },
        ],
        () => temporalHistoryWindow(service.world),
      ),
    ).toBe(false);
  });
});
