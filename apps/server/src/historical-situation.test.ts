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
} from '@open-legend/domain';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { captureSituation, expandSituation } from './situation-context.js';
import { permittedSourceHandle } from './entity-references.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

it('retrieves one shared terrain boundary from cold storage for both outgoing and entering attention', async () => {
  const store = await testRepository(),
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
    const player = entityGet(world.entities, PLAYER_ID)!,
      prototype = entityGet(world.entities, NPC_ID)!;
    player.actor!.attentionCapacity = 2;
    setSpatialPosition(world, player, { x: 10, y: 0, z: 12 }, 'terrain');
    for (let index = 0; index < 3; index++) {
      const person = structuredClone(prototype);
      person.id = `terrain-context-person-${index}`;
      entitySet(world.entities, person.id, person);
      setSpatialPosition(world, person, { x: 12 + index, y: 0, z: 12 }, 'terrain');
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
  // Later actual selected movement creates two newer chunks, so the terrain
  // boundary is read through the repository rather than the resident tail.
  for (const at of [17, 18])
    await editWorld(service, (world) => {
      world.simTime = at;
      const person = entityGet(world.entities, entering[1].sourceId)!;
      setSpatialPosition(world, person, { x: at - 1, y: 0, z: 12 }, 'terrain', {
        continuity: 'physical',
      });
      initializePerception(world, []);
    });
  await service.flushMemorySources(PLAYER_ID);
  const scope = {
    worldId: service.world.id,
    actorId: PLAYER_ID,
    generation: (await store.records.head())!.generation,
  };
  const subjects = [...previous.map((entry) => entry.exposure.episodeId), subject];
  const ids = new Set<string>();
  const resident = new Set(
    service.world.experience!.temporal!.actors[PLAYER_ID]!.chunks.flatMap((chunk) =>
      chunk.receipts.map((receipt) => receipt.id),
    ),
  );
  for (const subject of subjects) {
    const history = await store.memories.temporalHistory(
      scope,
      {
        subjects: [subject],
        from: 16,
        through: 16,
        bytes: 65536,
        limit: 128,
      },
      service.world,
    );
    const matches = history.entries.filter((entry) =>
      entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
    );
    expect(matches).toHaveLength(1);
    const entry = matches[0]!;
    expect(new Set(entry.receipt.contextSubjects)).toEqual(new Set(subjects));
    expect(entry.receipt.facets[0]).toMatchObject({
      acquiredAt: original.acquiredAt,
      measuredThrough: original.facets[0]!.measuredThrough,
      confirmedThrough: 16,
    });
    expect(resident.has(entry.receipt.id)).toBe(false);
    ids.add(entry.receipt.id);
  }
  expect(ids.size).toBe(1);
});

it('reads historical native distances through cold actor receipts, including a later issued held confirmation', async () => {
  const store = await testRepository(),
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
    world.simTime = 1;
    const player = entityGet(world.entities, PLAYER_ID)!,
      anchor = entityGet(world.entities, NPC_ID)!,
      other = structuredClone(anchor);
    other.id = 'historical-other';
    entitySet(world.entities, other.id, other);
    setSpatialPosition(world, player, { x: 10, y: 0, z: 12 }, worldSupport(player));
    setSpatialPosition(world, anchor, { x: 12, y: 0, z: 12 }, worldSupport(anchor));
    setSpatialPosition(world, other, { x: 14, y: 0, z: 12 }, worldSupport(other));
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
    world.simTime = 2;
    const body = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, body, { x: 13, y: 0, z: 12 }, worldSupport(body), {
      continuity: 'physical',
    });
    initializePerception(world, []);
  });
  await editWorld(service, (world) => {
    world.simTime = 3;
    const body = entityGet(world.entities, 'historical-other')!;
    setSpatialPosition(world, body, { x: 100, y: 0, z: 12 }, worldSupport(body), {
      continuity: 'physical',
    });
    world.map.spatial.revision++;
    initializePerception(world, []);
  });
  for (let index = 0; index < 3; index++)
    await editWorld(service, (world) => {
      appendMemory(world, PLAYER_ID, {
        kind: 'episode',
        source: 'self_thought',
        summary: `Separate fixture thought ${index}.`,
        entityIds: [],
        importance: 1,
      });
    });
  await service.flushMemorySources(PLAYER_ID);
  const head = await store.records.head(),
    scope = { worldId: service.world.id, actorId: PLAYER_ID, generation: head!.generation };
  const query = {
    subjects: [anchor, other],
    kinds: ['body', 'location', 'physical-boundary', 'surface-patch'] as const,
    measurements: { from: 1, through: 2 },
    through: 3,
    bytes: 8192,
    limit: 128,
  };
  const history = await store.memories.temporalHistory(scope, query, service.world);
  expect(
    history.entries.some(
      (entry) =>
        entry.receipt.subject === other &&
        entry.receipt.at === 3 &&
        entry.receipt.facets.some((facet) => facet.measuredThrough === 2),
    ),
  ).toBe(true);
  const residentIds = new Set(
    service.world.experience!.temporal!.actors[PLAYER_ID]!.chunks.flatMap((chunk) =>
      chunk.receipts.map((receipt) => receipt.id),
    ),
  );
  expect(history.entries.some((entry) => !residentIds.has(entry.receipt.id))).toBe(true);
  const captured = captureSituation(service.world, PLAYER_ID, 'cold-historical-spatial', history);
  const response = await expandSituation(
    captured,
    [
      {
        kind: 'historical-spatial',
        anchor: permittedSourceHandle(service.world, PLAYER_ID, ['received-subject', anchor]),
        other: permittedSourceHandle(service.world, PLAYER_ID, ['received-subject', other]),
        from: 1,
        through: 2,
        radius: 20,
      },
    ],
    (query) => store.memories.temporalHistory(scope, query, service.world),
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
  const atTwo = result.samples.find((sample) => sample.at === 2)!;
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
    await store.memories.temporalSelectionsCurrent(scope, Object.values(captured.receiptDetails)),
  ).toBe(true);
  const { expandedIds: _, ...wire } = response;
  expect(Buffer.byteLength(JSON.stringify(wire))).toBeLessThanOrEqual(8192);
  expect(JSON.stringify(wire)).not.toContain('historical-other');
});
