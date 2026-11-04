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
  const subject = currentBodyObservation(world, PLAYER_ID, anchor.id)!.exposure.track;
  const second = currentBodyObservation(world, PLAYER_ID, other.id)!.exposure.track;
  expect(
    currentReceivedGeometry(world, PLAYER_ID).observations.some((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
    ),
  ).toBe(true);
  world.simTime = 2;
  setSpatialPosition(world, anchor, { x: 18, y: 2, z: 2 }, null, { continuity: 'physical' });
  initializePerception(world, []);
  const before = captureTemporalReceiptPrefix(world, PLAYER_ID);
  world.simTime = 3;
  world.map.spatial.revision++;
  setSpatialPosition(world, other, { x: 100, y: 2, z: 2 }, null, { continuity: 'physical' });
  initializePerception(world, []);
  expect(currentReceivedGeometry(world, PLAYER_ID).observations).toEqual([]);
  const query = {
    subjects: [subject, second],
    measurements: { from: 0, through: 2 },
    through: 3,
    bytes: 1024 * 1024,
    limit: 1000,
  };
  const history = selectTemporalHistory(world, PLAYER_ID, query);
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
  if (!('entry' in support)) throw new Error('Expected the original received terrain interval.');
  expect(history.entries[support.entry]!.receipt.at).toBe(0);
  expect(history.entries[support.entry]!.receipt.facets[support.facet]).toMatchObject({
    measuredFrom: 0,
    measuredThrough: 0,
    acquiredAt: 0,
    confirmedThrough: 2,
  });
  const earlierCut = selectTemporalHistory(world, PLAYER_ID, {
    ...query,
    cut: before,
  });
  const earlier = historicalSpatialMeasurements(
    earlierCut,
    { anchor: subject, from: 2, through: 2, radius: 30 },
    128,
  );
  const capturedBoundary = earlier.samples.find((sample) => sample.at === 2)!.boundaries[0];
  expect(capturedBoundary).toBeDefined();
  const capturedSupport = capturedBoundary!.support;
  if (!('entry' in capturedSupport)) throw new Error('Expected captured received geometry.');
  expect(earlierCut.entries[capturedSupport.entry]!.receipt.at).toBe(0);
  expect(
    earlierCut.entries[capturedSupport.entry]!.receipt.facets[capturedSupport.facet]!
      .confirmedThrough,
  ).toBe(2);
  const restored = JSON.parse(JSON.stringify(world));
  expect(
    historicalSpatialMeasurements(
      selectTemporalHistory(restored, PLAYER_ID, query),
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

it('uses an ongoing received geometry interval at the decision cut without looking again', () => {
  const { world, bodies } = scene();
  const anchor = bodies[0]!,
    subject = currentBodyObservation(world, PLAYER_ID, anchor.id)!.exposure.track;
  world.simTime = 2;
  setSpatialPosition(world, anchor, { x: 18, y: 2, z: 2 }, null, { continuity: 'physical' });
  initializePerception(world, []);

  const prefix = captureTemporalReceiptPrefix(world, PLAYER_ID);
  const count = world.experience!.temporal!.actors[PLAYER_ID]!.count;

  const history = selectTemporalHistory(world, PLAYER_ID, {
    subjects: [subject],
    cut: prefix,
    measurements: { from: 1, through: 2 },
    kinds: ['body', 'location', 'physical-boundary', 'surface-patch'],
    bytes: 1024 * 1024,
  });
  const result = historicalSpatialMeasurements(
    history,
    { anchor: subject, from: 1, through: 2, radius: 30 },
    128,
  );
  const sample = result.samples.find((sample) => sample.at === 2)!;
  expect(sample.boundaries.length).toBeGreaterThan(0);
  const source = sample.boundaries[0]!.support;
  if (!('entry' in source)) throw new Error('Expected the original received terrain interval.');
  expect(history.entries[source.entry]!.receipt.at).toBe(0);
  expect(world.experience!.temporal!.actors[PLAYER_ID]!.count).toBe(count);
  expect(history.entries[source.entry]!.receipt.facets[source.facet]).toMatchObject({
    acquiredAt: 0,
    measuredFrom: 0,
    measuredThrough: 0,
    confirmedThrough: 2,
  });
});

it('pairs an actual common received phase and refuses unrelated same-time competing positions', () => {
  const { world, bodies } = scene();
  const anchor = bodies[0]!,
    other = bodies[1]!;
  const first = currentBodyObservation(world, PLAYER_ID, anchor.id)!.exposure.track;
  const second = currentBodyObservation(world, PLAYER_ID, other.id)!.exposure.track;
  world.simTime = 2;
  setSpatialPosition(world, anchor, { x: 18, y: 2, z: 2 }, null, { continuity: 'physical' });
  setSpatialPosition(world, other, { x: 17, y: 2, z: 2 }, null, { continuity: 'physical' });
  initializePerception(world, []);
  setSpatialPosition(world, other, { x: 19, y: 2, z: 2 }, null, { continuity: 'physical' });
  initializePerception(world, []);
  const history = selectTemporalHistory(world, PLAYER_ID, {
    subjects: [first, second],
    measurements: { from: 2, through: 2 },
    bytes: 1024 * 1024,
  });
  const positions = history.entries
    .filter((entry) => entry.receipt.subject === second)
    .flatMap((entry) =>
      entry.values.flatMap((value) =>
        value.kind === 'location' && value.location.kind === 'point' ? value.location.point.x : [],
      ),
    );
  expect(positions).toContain(17);
  expect(positions).toContain(19);
  const result = historicalSpatialMeasurements(
    history,
    { anchor: first, other: second, from: 2, through: 2, radius: 30 },
    128,
  );
  expect(result.samples.find((sample) => sample.at === 2)!.other?.status).toBe('complete');
  // Removing the common phase from the supplied read product must restore
  // uncertainty; sorting two same-time positions cannot establish a relationship.
  const independent = {
    ...history,
    entries: history.entries.map((entry) =>
      entry.receipt.subject === second
        ? { ...entry, receipt: { ...entry.receipt, acquisition: entry.receipt.acquisition + 1000 } }
        : entry,
    ),
  };
  const ambiguous = historicalSpatialMeasurements(
    independent,
    { anchor: first, other: second, from: 2, through: 2, radius: 30 },
    128,
  );
  expect(ambiguous.samples.find((sample) => sample.at === 2)!.other?.status).toBe('unavailable');
});
