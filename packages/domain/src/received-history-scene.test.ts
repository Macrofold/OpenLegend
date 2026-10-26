import { expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID } from './data.js';
import { emptyEntities, entityGet, entitySet } from './entity-collection.js';
import { setSpatialPosition } from './spatial-state.js';
import { initializePerception } from './kernel.js';
import { currentBodyObservation } from './perception-evidence.js';
import { currentReceivedGeometry } from './received-geometry.js';
import { captureTemporalReceiptPrefix, selectTemporalHistory } from './temporal-evidence.js';
import { historicalSpatialMeasurements } from './received-history-scene.js';
import { BASE_TERRAIN } from './worlds/base/spatial-definitions.js';

function scene() {
  const world = createWorld(117),
    player = entityGet(world.entities, PLAYER_ID)!,
    prototype = entityGet(world.entities, NPC_ID)!;
  world.map = {
    width: 42,
    height: 5,
    tiles: Array.from({ length: 5 }, () => Array(42).fill('grass')),
    terrain: structuredClone(BASE_TERRAIN),
    spatial: {
      revision: 1,
      version: 1,
      disclosure: 'public',
      levels: [{ id: 'level', name: 'Private level', focusY: 0 }],
      surfaces: [
        {
          id: 'high',
          name: 'Private high ground',
          levelId: 'level',
          minX: -5,
          maxX: 20,
          minZ: 0,
          maxZ: 4,
          y: 2,
          slopeX: 0,
          slopeZ: 0,
          thickness: 0.1,
          material: 'stone',
          acousticTransmission: 0,
        },
        {
          id: 'low',
          name: 'Private low ground',
          levelId: 'level',
          minX: 20,
          maxX: 40,
          minZ: 0,
          maxZ: 4,
          y: 0,
          slopeX: 0,
          slopeZ: 0,
          thickness: 0.1,
          material: 'stone',
          acousticTransmission: 0,
        },
      ],
      blockers: [],
    },
  };
  world.entities = emptyEntities();
  entitySet(world.entities, PLAYER_ID, player);
  setSpatialPosition(world, player, { x: 25, y: 2, z: 2 }, null);
  const bodies = [15, 16].map((x, index) => {
    const entity = structuredClone(prototype);
    entity.id = `history-person-${index}`;
    entitySet(world.entities, entity.id, entity);
    setSpatialPosition(world, entity, { x, y: 2, z: 2 }, null);
    return entity;
  });
  initializePerception(world, []);
  return { world, bodies };
}

it('measures retained body/edge history only through actually captured support intervals', () => {
  const { world, bodies } = scene(),
    anchor = bodies[0]!,
    other = bodies[1]!;
  const subject = currentBodyObservation(world, PLAYER_ID, anchor.id)!.exposure.episodeId;
  const second = currentBodyObservation(world, PLAYER_ID, other.id)!.exposure.episodeId;
  expect(
    currentReceivedGeometry(world, PLAYER_ID).observations.some((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
    ),
  ).toBe(true);
  world.simTime = 2;
  setSpatialPosition(world, anchor, { x: 18, y: 2, z: 2 }, null, 'physical');
  initializePerception(world, []);
  const before = captureTemporalReceiptPrefix(world, PLAYER_ID);
  world.simTime = 3;
  world.map.spatial.revision++;
  setSpatialPosition(world, other, { x: 100, y: 2, z: 2 }, null, 'physical');
  initializePerception(world, []);
  expect(currentReceivedGeometry(world, PLAYER_ID).observations).toEqual([]);
  const query = {
    subjects: [subject, second],
    measurements: { from: 0, through: 2 },
    through: 3,
    bytes: 1024 * 1024,
    limit: 1000,
  };
  const history = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
  const result = historicalSpatialMeasurements(
    history,
    { anchor: subject, other: second, from: 0, through: 2, radius: 30 },
    128,
  );
  expect(result.visited).toBeLessThanOrEqual(128);
  const last = result.samples.find((sample) => sample.at === 2)!;
  expect(last).toBeDefined();
  expect(last.other?.status).toBe('complete');
  expect(last.boundaries.length).toBeGreaterThan(0);
  expect(
    last.boundaries.some((edge) => (edge.measurement.endpointChange?.decreaseLower ?? 0) > 2),
  ).toBe(true);
  const support = last.boundaries[0]!.support;
  expect(history.entries[support.entry]!.receipt.at).toBe(3);
  expect(history.entries[support.entry]!.receipt.facets[support.facet]).toMatchObject({
    measuredFrom: 0,
    measuredThrough: 0,
    acquiredAt: 0,
    confirmedThrough: 2,
  });
  const earlierCut = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    ...query,
    cut: before,
  });
  const earlier = historicalSpatialMeasurements(
    earlierCut,
    { anchor: subject, from: 2, through: 2, radius: 30 },
    128,
  );
  expect(earlier.samples.find((sample) => sample.at === 2)!.boundaries).toEqual([]);
  const restored = JSON.parse(JSON.stringify(world));
  expect(
    historicalSpatialMeasurements(
      selectTemporalHistory(restored.experience.temporal, PLAYER_ID, query),
      { anchor: subject, other: second, from: 0, through: 2, radius: 30 },
      128,
    ),
  ).toEqual(result);
  const exhausted = historicalSpatialMeasurements(
    history,
    { anchor: subject, other: second, from: 0, through: 2, radius: 30 },
    1,
  );
  expect(exhausted.visited).toBeLessThanOrEqual(1);
  expect(exhausted.status).toBe('partial');
  expect(exhausted.coverage).toBe('partial');
});
