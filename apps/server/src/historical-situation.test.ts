import { temporalHistoryWindow } from './temporal-storage.js';
import { temporalChunkReceipts, temporalChunkReferences } from '@open-legend/domain';
import { afterEach, expect, it } from 'vitest';
import {
  NPC_ID,
  PLAYER_ID,
  entityGet,
  entitySet,
  initializePerception,
  currentBodyObservation,
  setAttentionFocus,
  setSpatialPosition,
  worldSupport,
  currentDetailedAttention,
  currentReceivedGeometry,
  projectWorldHistory,
  type WorldState,
} from '@open-legend/domain';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { captureSituation, expandSituation } from './situation-context.js';
import { permittedSourceHandle } from './entity-references.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';

/** Evict committed receipt placement explicitly; timestamps no longer force chunks. */
function coldReceiptWorld(world: WorldState): WorldState {
  const temporal = world.experience!.temporal!;
  return projectWorldHistory(world, {
    temporal: {
      ...temporal,
      actors: Object.fromEntries(
        Object.entries(temporal.actors).map(([id, actor]) => [id, { ...actor, chunks: [] }]),
      ),
    },
  });
}

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

const HISTORY_FLOOR = 'historical-fixture-floor';
/** Unobstructed authored support isolates cold evidence from Main's terrain and
 * scenery coverage. The real Main acquisition is qualified separately. */
function prepareHistoryFloor(world: WorldState): void {
  world.map.width = Math.max(64, world.map.width);
  world.map.tiles = world.map.tiles.map((row) => [
    ...row,
    ...Array(world.map.width - row.length).fill('grass'),
  ]);
  world.map.spatial.surfaces.push({
    id: HISTORY_FLOOR,
    name: 'Unpublished fixture support',
    levelId: world.map.spatial.levels[0]!.id,
    minX: 38,
    maxX: 58,
    minZ: 0,
    maxZ: 10,
    y: 0,
    slopeX: 0,
    slopeZ: 0,
    thickness: 0.1,
    material: 'stone',
    acousticTransmission: 0,
  });
  world.map.spatial.revision++;
}

it('retrieves independent shared terrain from cold storage for both outgoing and entering attention', async () => {
  const store = await testRepository(undefined, stockedCamp()),
    service = new WorldService(
      store,
      readConfig({ AI_BUDGET_USD: '0', OPENAI_EMBEDDING_API_KEY: '' }),
    );
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('terrain-context-fixture', true);
  await editWorld(service, (world) => {
    prepareHistoryFloor(world);
    const player = entityGet(world.entities, PLAYER_ID)!,
      prototype = entityGet(world.entities, NPC_ID)!;
    player.actor!.attentionCapacity = 2;
    setSpatialPosition(world, player, { x: 40, y: 0, z: 2 }, HISTORY_FLOOR);
    for (let index = 0; index < 3; index++) {
      const person = structuredClone(prototype);
      person.id = `terrain-context-person-${index}`;
      entitySet(world.entities, person.id, person);
      setSpatialPosition(world, person, { x: 42 + index, y: 0, z: 2 }, HISTORY_FLOOR);
    }
    world.simTime = 15;
    initializePerception(world, []);
  });
  const previous = currentDetailedAttention(service.world, PLAYER_ID),
    selected = new Set(previous.map((entry) => entry.sourceId)),
    entering = Object.entries(
      service.world.perceptionEvidence![PLAYER_ID]!.attention!.candidates,
    ).find(
      ([, candidate]) =>
        candidate.sourceId.startsWith('terrain-context-person-') &&
        !selected.has(candidate.sourceId),
    )!,
    subject = currentBodyObservation(service.world, PLAYER_ID, entering[1].sourceId)!.exposure
      .episodeId,
    original = currentReceivedGeometry(service.world, PLAYER_ID).observations[0]!;
  expect(original).toBeDefined();
  await editWorld(service, (world) => {
    world.simTime = 16;
    initializePerception(world, []);
    expect(setAttentionFocus(world, PLAYER_ID, [entering[0]])).toBe(true);
  });
  // Later actual movement extends the shared chronology before an explicit cold read.
  for (const at of [18, 24])
    await editWorld(service, (world) => {
      world.simTime = at;
      const person = entityGet(world.entities, entering[1].sourceId)!;
      setSpatialPosition(world, person, { x: 46 + (at - 18) / 6, y: 0, z: 2 }, HISTORY_FLOOR, {
        continuity: 'physical',
      });
      initializePerception(world, []);
    });
  await service.prepareCognitionEvidence(PLAYER_ID);
  await service.flushMemorySources(PLAYER_ID);
  const scope = {
    worldId: service.world.id,
    actorId: PLAYER_ID,
    generation: (await store.records.head())!.generation,
  };
  const coldWorld = coldReceiptWorld(service.world);
  const subjects = [...previous.map((entry) => entry.exposure.episodeId), subject];
  const ids = new Set<string>();
  const resident = new Set(
    coldWorld.experience!.temporal!.actors[PLAYER_ID]!.chunks.flatMap((chunk) =>
      temporalChunkReceipts(chunk).map((receipt) => receipt.id),
    ),
  );
  for (const subject of subjects) {
    const history = await store.memories.temporalHistory(
      scope,
      {
        subjects: [subject],
        includeGeometry: true,
        kinds: ['surface-patch', 'physical-boundary'],
        measurements: { from: 16, through: 16 },
        through: 24,
        bytes: 65536,
        limit: 128,
      },
      coldWorld,
    );
    const matches = history.entries.filter((entry) =>
      entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
    );
    expect(matches).toHaveLength(1);
    const entry = matches[0]!;
    // A feature's own timeline serves either body query; changing focus does not
    // manufacture a personal terrain receipt for the new attention membership.
    expect(entry.receipt.subject).toBe(original.id);
    expect(entry.receipt.contextSubjects ?? []).toEqual([]);
    expect(entry.receipt.facets[0]).toMatchObject({
      acquiredAt: original.acquiredAt,
      measuredThrough: original.facets[0]!.measuredThrough,
      confirmedThrough: 24,
    });
    expect(resident.has(entry.receipt.id)).toBe(false);
    ids.add(entry.receipt.id);
  }
  expect(ids.size).toBe(1);
});

it('reads historical native distances through cold actor receipts, including a later issued held confirmation', async () => {
  const store = await testRepository(undefined, stockedCamp()),
    service = new WorldService(
      store,
      readConfig({ AI_BUDGET_USD: '0', OPENAI_EMBEDDING_API_KEY: '' }),
    );
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('historical-spatial-fixture', true);
  await editWorld(service, (world) => {
    prepareHistoryFloor(world);
    world.simTime = 15;
    const player = entityGet(world.entities, PLAYER_ID)!,
      anchor = entityGet(world.entities, NPC_ID)!,
      other = structuredClone(anchor);
    other.id = 'historical-other';
    entitySet(world.entities, other.id, other);
    setSpatialPosition(world, player, { x: 40, y: 0, z: 2 }, HISTORY_FLOOR);
    setSpatialPosition(world, anchor, { x: 42, y: 0, z: 2 }, HISTORY_FLOOR);
    setSpatialPosition(world, other, { x: 44, y: 0, z: 2 }, HISTORY_FLOOR);
    initializePerception(world, []);
    const keys = Object.entries(world.perceptionEvidence![PLAYER_ID]!.attention!.candidates)
      .filter(([, candidate]) => [NPC_ID, other.id].includes(candidate.sourceId))
      .map(([key]) => key);
    expect(setAttentionFocus(world, PLAYER_ID, keys)).toBe(true);
  });
  const anchor = currentBodyObservation(service.world, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  const other = currentBodyObservation(service.world, PLAYER_ID, 'historical-other')!.exposure
    .episodeId;
  await editWorld(service, (world) => {
    world.simTime = 18;
    const body = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, body, { x: 43, y: 0, z: 2 }, worldSupport(body), {
      continuity: 'physical',
    });
    initializePerception(world, []);
  });
  await editWorld(service, (world) => {
    world.simTime = 30;
    const body = entityGet(world.entities, 'historical-other')!;
    setSpatialPosition(world, body, { x: 10, y: 0, z: 12 }, 'terrain', {
      continuity: 'physical',
    });
    world.map.spatial.revision++;
    initializePerception(world, []);
  });
  await service.prepareCognitionEvidence(PLAYER_ID);
  await service.flushMemorySources(PLAYER_ID);
  const head = await store.records.head(),
    scope = { worldId: service.world.id, actorId: PLAYER_ID, generation: head!.generation };
  const query = {
    subjects: [anchor, other],
    // This initial pair-distance read needs body samples, not every associated terrain patch.
    kinds: ['body', 'location'] as const,
    measurements: { from: 15, through: 18 },
    through: 30,
    bytes: 8192,
    limit: 128,
  };
  const coldWorld = coldReceiptWorld(service.world);
  const history = await store.memories.temporalHistory(scope, query, coldWorld);
  expect(
    history.entries.some(
      (entry) =>
        entry.receipt.subject === other &&
        entry.receipt.at === 30 &&
        entry.receipt.facets.some(
          (facet) =>
            facet.measuredThrough === 15 &&
            (facet.support?.confirmedThrough ?? facet.confirmedThrough) === 18,
        ),
    ),
    JSON.stringify({
      incomplete: history.incomplete,
      hasMore: history.hasMore,
      entries: history.entries.map(({ receipt, values }) => ({
        at: receipt.at,
        subject: receipt.subject,
        facets: receipt.facets.map((f, i) => ({
          kind: values[i]?.kind,
          from: f.measuredFrom,
          through: f.measuredThrough,
          confirmed: f.support?.confirmedThrough ?? f.confirmedThrough,
        })),
      })),
    }),
  ).toBe(true);
  const residentIds = new Set(
    coldWorld.experience!.temporal!.actors[PLAYER_ID]!.chunks.flatMap((chunk) =>
      temporalChunkReceipts(chunk).map((receipt) => receipt.id),
    ),
  );
  expect(history.entries.some((entry) => !residentIds.has(entry.receipt.id))).toBe(true);
  const captured = captureSituation(coldWorld, PLAYER_ID, 'cold-historical-spatial', history);
  const response = await expandSituation(
    captured,
    [
      {
        kind: 'historical-spatial',
        anchor: permittedSourceHandle(service.world, PLAYER_ID, ['received-subject', anchor]),
        other: permittedSourceHandle(service.world, PLAYER_ID, ['received-subject', other]),
        from: 15,
        through: 18,
        radius: 20,
      },
    ],
    (query) => store.memories.temporalHistory(scope, query, coldWorld),
  );
  const result = (
    response.results[0] as {
      result: {
        samples: Array<{
          at: number;
          other?: { status: string; lower?: number; endpointChange?: { decreaseLower: number } };
          support: Array<{ reference: string }>;
        }>;
      };
    }
  ).result;
  expect(response.visited).toBeLessThanOrEqual(128);
  const atTwo = result.samples.find((sample) => sample.at === 18)!;
  expect(
    atTwo,
    JSON.stringify({
      result,
      history: history.entries.map((entry) => ({
        id: entry.receipt.id,
        subject: entry.receipt.subject,
        at: entry.receipt.at,
        facets: entry.receipt.facets.map((f, i) => ({
          kind: entry.values[i]!.kind,
          from: f.measuredFrom,
          through: f.measuredThrough,
          confirmed: f.confirmedThrough,
        })),
      })),
    }),
  ).toBeDefined();
  expect(atTwo.other?.status).toBe('complete');
  // The finite cold page can omit an older endpoint. Exact distance remains
  // useful, but a movement change requires both retained endpoint measurements.
  if (atTwo.other?.endpointChange)
    expect(atTwo.other.endpointChange.decreaseLower).toBeGreaterThan(0.5);
  expect(atTwo.support.every((support) => captured.receiptDetails[support.reference])).toBe(true);
  expect(
    await store.memories.temporalSelectionsCurrent(
      scope,
      Object.values(captured.receiptDetails),
      () => temporalHistoryWindow(service.world),
    ),
  ).toBe(true);
  const { expandedIds: _, ...wire } = response;
  expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(8192);
  expect(JSON.stringify(wire)).not.toContain('historical-other');
});
