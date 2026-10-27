import { describe, expect, it } from 'vitest';
import {
  clearConvexView,
  clearSegment,
  type SpatialMap,
  type WalkableSurface,
} from '@open-legend/spatial';
import { createWorld, PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { BASE_TERRAIN } from './worlds/base/spatial-definitions.js';
import { entityGet, entitySet, emptyEntities } from './entity-collection.js';
import { worldPlacement, setSpatialPosition } from './spatial-state.js';
import { initializePerception } from './kernel.js';
import { currentAttentionCues, currentDetailedAttention, setAttentionFocus } from './attention.js';
import { observationDependencies, observationLearningSources } from './experience-manifest.js';
import {
  perceptionEvidenceOwner,
  currentBodyObservation,
  captureCurrentGeometrySupport,
} from './perception-evidence.js';
import {
  selectTemporalHistory,
  retireTemporalChunks,
  clearTemporalCaptureReferences,
} from './temporal-evidence.js';
import { validateTemporalEvidenceState } from './temporal-validation.js';
import type { WorldState } from './types.js';
import {
  currentReceivedGeometry,
  refreshReceivedGeometry,
  revokeReceivedGeometryEvidence,
  validateReceivedGeometryState,
} from './received-geometry.js';

function surface(id: string, minX: number, maxX: number, y: number): WalkableSurface {
  return {
    id,
    name: 'Private map label',
    levelId: 'level',
    minX,
    maxX,
    minZ: 0,
    maxZ: 4,
    y,
    slopeX: 0,
    slopeZ: 0,
    thickness: 0.1,
    material: 'stone',
    acousticTransmission: 0,
  };
}
function map(surfaces = [surface('terrain', 0, 4, 0)]): SpatialMap {
  return {
    width: 5,
    height: 5,
    terrain: structuredClone(BASE_TERRAIN),
    tiles: Array.from({ length: 5 }, () => Array(5).fill('grass')),
    spatial: {
      version: 1,
      revision: 1,
      disclosure: 'public',
      levels: [{ id: 'level', name: 'A map label', focusY: 0 }],
      surfaces,
      blockers: [],
    },
  };
}
function worldWithGeometry(value: SpatialMap, position = { x: 1, y: 0, z: 1 }) {
  const world = createWorld();
  world.map = value;
  const observer = entityGet(world.entities, PLAYER_ID)!;
  observer.placement = worldPlacement(position, null);
  const owner = perceptionEvidenceOwner(world, observer);
  delete owner.geometry;
  return { world, owner };
}

describe('certified received planar geometry', () => {
  it('rejects an occluded interior even when all corner rays are clear', () => {
    const value = map([surface('terrain', 0, 4, 0)]);
    const eye = { x: 2, y: 3, z: -3 };
    const corners = [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
      { x: 4, y: 0, z: 4 },
      { x: 0, y: 0, z: 4 },
    ];
    value.spatial.blockers.push({
      id: 'centre-only-obstacle',
      bounds: { min: { x: 1.9, y: 0.1, z: -0.5 }, max: { x: 2.1, y: 2, z: -0.2 } },
      movement: true,
      sight: true,
      acousticTransmission: 0,
      material: 'opaque',
    });
    expect(corners.every((point) => clearSegment(value, eye, point))).toBe(true);
    expect(clearConvexView(value, eye, corners)).toBe(false);
    const behind = structuredClone(value);
    behind.spatial.blockers[0]!.bounds = {
      min: { x: 1.9, y: 0, z: 5 },
      max: { x: 2.1, y: 3, z: 6 },
    };
    expect(clearConvexView(behind, eye, corners)).toBe(true);
  });

  it('records exact visible fragments without map names and retires stale geometry immediately', () => {
    const { world, owner } = worldWithGeometry(map());
    const measured = refreshReceivedGeometry(world, PLAYER_ID);
    expect(measured.acquired.length).toBeGreaterThan(0);
    expect(
      measured.acquired.every(
        (observation) => observation.facets[0]?.value.kind === 'surface-patch',
      ),
    ).toBe(true);
    expect(JSON.stringify(measured.acquired)).not.toContain('Private map label');
    expect(owner.geometry!.visited).toBeLessThanOrEqual(128);
    validateReceivedGeometryState(world, PLAYER_ID, owner.geometry!);
    const restored = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(currentReceivedGeometry(restored, PLAYER_ID)).toEqual(
      currentReceivedGeometry(world, PLAYER_ID),
    );
    world.map.spatial.revision++;
    expect(currentReceivedGeometry(world, PLAYER_ID).observations).toHaveLength(0);
    world.simTime = 15;
    expect(refreshReceivedGeometry(world, PLAYER_ID).acquired.length).toBeGreaterThan(0);
    expect(currentReceivedGeometry(world, PLAYER_ID).observations[0]!.id).not.toBe(
      measured.acquired[0]!.id,
    );
  });

  it('receives a physical drop only from actual visible adjacent near and far patches', () => {
    const { world } = worldWithGeometry(map([surface('high', 0, 2, 2), surface('low', 2, 4, 0)]), {
      x: 3.5,
      y: 2,
      z: 2,
    });
    refreshReceivedGeometry(world, PLAYER_ID);
    const boundaries = currentReceivedGeometry(world, PLAYER_ID).observations.flatMap(
      (observation) =>
        observation.facets.flatMap((facet) =>
          facet.value.kind === 'physical-boundary' ? [facet.value.boundary] : [],
        ),
    );
    expect(boundaries.length).toBeGreaterThan(0);
    const observations = currentReceivedGeometry(world, PLAYER_ID).observations.filter(
      (observation) => observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
    );
    const dependencies = observationDependencies(observations);
    const sources = observationLearningSources(observations);
    for (const boundary of boundaries)
      for (const support of [boundary.nearSurface.support, boundary.farSurface.support]) {
        expect(dependencies).toContainEqual({
          source: support.source,
          ordinal: support.ordinal,
          aliases: [JSON.stringify(['perception-fact', support.source.id, support.ordinal])],
        });
        expect(sources).toContainEqual(support.source);
      }

    expect(
      boundaries.every(
        (boundary) =>
          boundary.dropLower >= 1.75 &&
          boundary.nearSurface.support.source.id !== boundary.farSurface.support.source.id,
      ),
    ).toBe(true);
    const corrupt = structuredClone(world);
    const edge = corrupt.perceptionEvidence![PLAYER_ID]!.geometry!.boundaries[0]!.facets[0]!.value;
    if (edge.kind === 'physical-boundary')
      edge.boundary.farSurface.support.source.observer.actorId = 'someone-else';
    expect(() =>
      validateReceivedGeometryState(
        corrupt,
        PLAYER_ID,
        corrupt.perceptionEvidence![PLAYER_ID]!.geometry!,
      ),
    ).toThrow('owned received surface');
    const hidden = map([surface('high', 0, 2, 2)]);
    const other = worldWithGeometry(hidden, { x: 3.5, y: 2, z: 2 });
    refreshReceivedGeometry(other.world, PLAYER_ID);
    expect(
      currentReceivedGeometry(other.world, PLAYER_ID).observations.some((observation) =>
        observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
      ),
    ).toBe(false);
  });

  it('revokes exact current support and restores only through new actual reception', () => {
    const { world, owner } = worldWithGeometry(map());
    refreshReceivedGeometry(world, PLAYER_ID);
    const original = currentReceivedGeometry(world, PLAYER_ID).observations[0]!;
    const before = currentReceivedGeometry(world, PLAYER_ID).observations.length;
    revokeReceivedGeometryEvidence(world, PLAYER_ID, new Set([original.id]));
    expect(currentReceivedGeometry(world, PLAYER_ID).observations).toHaveLength(before - 1);
    expect(
      currentReceivedGeometry(world, PLAYER_ID).observations.some(
        (value) => value.id === original.id,
      ),
    ).toBe(false);
    world.simTime = 15;
    const next = refreshReceivedGeometry(world, PLAYER_ID);
    expect(next.acquired.length).toBeGreaterThan(0);
    expect(next.acquired.some((value) => value.id === original.id)).toBe(false);
    expect(currentReceivedGeometry(world, PLAYER_ID).observations).toHaveLength(before);
    validateReceivedGeometryState(world, PLAYER_ID, owner.geometry!);
  });

  it('leaves finite preparation and fragment exhaustion explicitly incomplete', () => {
    const huge = map([surface('broad', -100, 100, 0)]);
    huge.spatial.surfaces[0]!.minZ = -100;
    huge.spatial.surfaces[0]!.maxZ = 100;
    const { world, owner } = worldWithGeometry(huge);
    for (let index = 0; index < 40; index++) {
      world.simTime = index * 15;
      refreshReceivedGeometry(world, PLAYER_ID);
    }
    expect(
      owner.geometry!.fragments.length + owner.geometry!.boundaries.length,
    ).toBeLessThanOrEqual(256);
    expect(owner.geometry!.pending.length).toBeLessThanOrEqual(512);
    expect(currentReceivedGeometry(world, PLAYER_ID).complete).toBe(false);
    expect(owner.geometry!.visited).toBeLessThanOrEqual(128);
    validateReceivedGeometryState(world, PLAYER_ID, owner.geometry!);
  });
});

function nativeScene(
  count: number,
  value: SpatialMap,
  observerPoint = { x: 1, y: 0, z: 2 },
  capacity = 10,
) {
  const world = createWorld(117),
    player = entityGet(world.entities, PLAYER_ID)!,
    prototype = entityGet(world.entities, NPC_ID)!;
  world.map = value;
  world.entities = emptyEntities();
  player.actor!.attentionCapacity = capacity;
  entitySet(world.entities, PLAYER_ID, player);
  setSpatialPosition(world, player, observerPoint, null);
  const people = [];
  for (let i = 0; i < count; i++) {
    const person = structuredClone(prototype);
    person.id = `received-person-${i}`;
    person.name = `Secret person ${i}`;
    person.placement = worldPlacement({ x: 5 + i / 2, y: observerPoint.y, z: 2 }, null);
    entitySet(world.entities, person.id, person);
    people.push(person);
  }
  initializePerception(world, []);
  return { world, player, people };
}

describe('native received relation producers', () => {
  it('seals an actually held geometry interval at a cognition cut without sensing or duplicate confirmation', () => {
    const { world, people } = nativeScene(1, map());
    const original = currentReceivedGeometry(world, PLAYER_ID).observations[0]!;
    const subject = currentBodyObservation(world, PLAYER_ID, people[0]!.id)!.exposure.episodeId;
    world.simTime = 2;
    setSpatialPosition(world, people[0]!, { x: 6, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const before = world.experience!.temporal!.actors[PLAYER_ID]!.count;
    captureCurrentGeometrySupport(world, PLAYER_ID);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.count).toBeGreaterThan(before);
    const sealed = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      from: 2,
      through: 2,
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.find((entry) =>
      entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
    )!;
    expect(sealed.receipt.facets[0]).toMatchObject({
      measuredThrough: 0,
      acquiredAt: 0,
      confirmedThrough: 2,
    });
    expect(currentReceivedGeometry(world, PLAYER_ID).observations[0]!.id).toBe(original.id);
    const count = world.experience!.temporal!.actors[PLAYER_ID]!.count;
    captureCurrentGeometrySupport(world, PLAYER_ID);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.count).toBe(count);
    validateTemporalEvidenceState(world);
  });
  it('rebaselines a still-attended unchanged view after its old recorded support is actually retired', () => {
    const { world, player, people } = nativeScene(1, map());
    people[0]!.actor!.capabilities!.memory = false;
    world.simTime = 15;
    setSpatialPosition(world, player, { x: 1.25, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const original = currentReceivedGeometry(world, PLAYER_ID).observations[0]!;
    const subject = currentBodyObservation(world, PLAYER_ID, people[0]!.id)!.exposure.episodeId;
    const oldBlock = world.experience!.temporal!.actors[PLAYER_ID]!.captures[original.id]!.blockId;
    world.simTime = 21610;
    setSpatialPosition(world, people[0]!, { x: 6, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    world.simTime = 21616;
    const temporal = world.experience!.temporal!;
    for (const [actorId, history] of Object.entries(temporal.actors)) {
      const old = history.chunks.filter((chunk) => chunk.throughAt <= 15);
      retireTemporalChunks(
        world,
        actorId,
        old.map((chunk) => chunk.id),
        {
          bytes: old.reduce((n, chunk) => n + chunk.bytes, 0),
          count: old.reduce((n, chunk) => n + chunk.count, 0),
        },
        null,
        15,
      );
    }
    expect(
      Object.values(temporal.actors)
        .flatMap((actor) => actor.chunks.flatMap((chunk) => chunk.receipts))
        .some((receipt) => receipt.facets.some((facet) => facet.blockId === oldBlock)),
    ).toBe(false);
    clearTemporalCaptureReferences(world, new Set([oldBlock]));
    delete temporal.sources[oldBlock];
    expect(temporal.actors[PLAYER_ID]!.capturesInvalidated).toBe(true);
    initializePerception(world, []);
    const recent = selectTemporalHistory(temporal, PLAYER_ID, {
      subject,
      from: 21600,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    expect(
      recent.entries.some(
        (entry) =>
          entry.receipt.at === 21610 && entry.values.some((value) => value.kind === 'body'),
      ),
    ).toBe(true);
    const rebase = recent.entries.find((entry) =>
      entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
    )!;
    expect(rebase.receipt.at).toBe(21616);
    expect(rebase.receipt.facets[0]).toMatchObject({
      acquiredAt: 15,
      measuredThrough: 15,
      confirmedThrough: 21616,
    });
    expect(currentReceivedGeometry(world, PLAYER_ID).observations[0]!.id).toBe(original.id);
    expect(temporal.actors[PLAYER_ID]!.capturesInvalidated).toBeUndefined();
    validateTemporalEvidenceState(world);
  });
  it('retains contemporaneous received terrain without an alarm and never substitutes a later view', () => {
    const { world, player, people } = nativeScene(1, map());
    const person = people[0]!,
      subject = currentBodyObservation(world, PLAYER_ID, person.id)!.exposure.episodeId;
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(0);
    const original = currentReceivedGeometry(world, PLAYER_ID).observations[0]!;
    const first = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    expect(
      first.entries.some(
        (entry) =>
          entry.receipt.contextSubjects?.includes(subject) &&
          entry.values.some((value) => value.kind === 'surface-patch'),
      ),
    ).toBe(true);
    const unchangedCount = world.experience!.temporal!.actors[PLAYER_ID]!.count;
    initializePerception(world, []);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.count).toBe(unchangedCount);
    world.simTime = 15;
    setSpatialPosition(world, player, { x: 2, y: 0, z: 2 }, null, 'physical');
    setSpatialPosition(world, person, { x: 7, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    world.simTime = 30;
    world.map.spatial.surfaces[0]!.y = -2;
    world.map.spatial.revision++;
    initializePerception(world, []);
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(0);
    const old = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      through: 15,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    const patches = old.entries
      .flatMap((entry) => entry.values)
      .filter((value) => value.kind === 'surface-patch');
    expect(patches.length).toBeGreaterThan(0);
    expect(
      patches.every(
        (value) =>
          value.kind === 'surface-patch' && value.patch.vertices.every((point) => point.y === 0),
      ),
    ).toBe(true);
    expect(
      old.entries.some((entry) =>
        entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
      ),
    ).toBe(true);
    validateTemporalEvidenceState(world);
    const history = world.experience!.temporal!.actors[PLAYER_ID]!;
    const released = history.chunks.filter((chunk) => chunk.throughAt <= 15);
    retireTemporalChunks(
      world,
      PLAYER_ID,
      released.map((chunk) => chunk.id),
      {
        bytes: released.reduce((n, chunk) => n + chunk.bytes, 0),
        count: released.reduce((n, chunk) => n + chunk.count, 0),
      },
      null,
      15,
    );
    const expired = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      through: 15,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    expect(expired.entries).toEqual([]);
    expect(expired.incomplete).toBe(true);
  });
  it('shares one original-time terrain receipt across outgoing and entering attention through cold retrieval and retirement', () => {
    const { world, people } = nativeScene(3, map(), { x: 1, y: 0, z: 2 }, 2);
    const previous = currentDetailedAttention(world, PLAYER_ID);
    const outgoing = previous.map((entry) => entry.exposure.episodeId);
    const selected = new Set(previous.map((entry) => entry.sourceId));
    const other = people.find((person) => !selected.has(person.id))!;
    const exposure = currentBodyObservation(world, PLAYER_ID, other.id)!.exposure.episodeId;
    const observation = currentReceivedGeometry(world, PLAYER_ID).observations[0]!;
    expect(
      selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
        subject: exposure,
        bytes: 1024 * 1024,
      }).entries.some((entry) => entry.values.some((value) => value.kind === 'surface-patch')),
    ).toBe(false);
    const key = Object.entries(world.perceptionEvidence![PLAYER_ID]!.attention!.candidates).find(
      ([, candidate]) => candidate.sourceId === other.id,
    )![0];
    world.simTime = 1;
    initializePerception(world, []);
    expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toEqual(
      previous.map((entry) => entry.sourceId),
    );
    expect(currentReceivedGeometry(world, PLAYER_ID).supportedThrough).toBe(1);
    const restored = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(setAttentionFocus(world, PLAYER_ID, [key])).toBe(true);
    expect(setAttentionFocus(restored, PLAYER_ID, [key])).toBe(true);
    expect(JSON.parse(JSON.stringify(world.experience!.temporal))).toEqual(
      restored.experience!.temporal,
    );
    const baseline = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject: exposure,
      bytes: 1024 * 1024,
    });
    const terrain = baseline.entries.find((entry) =>
      entry.values.some((value) => value.kind === 'surface-patch'),
    )!;
    expect(terrain).toBeDefined();
    expect(terrain.receipt.change).toBe('baseline');
    expect(terrain.receipt.facets[0]!.acquiredAt).toBe(observation.acquiredAt);
    expect(terrain.receipt.at).toBe(1);
    expect(new Set(terrain.receipt.contextSubjects)).toEqual(new Set([...outgoing, exposure]));
    expect(terrain.receipt.facets[0]!.confirmedThrough).toBe(1);
    const history = world.experience!.temporal!.actors[PLAYER_ID]!;
    expect(
      history.chunks
        .flatMap((chunk) => chunk.receipts)
        .filter(
          (receipt) =>
            receipt.at === 1 &&
            receipt.facets.some((facet) => facet.original?.source.id === observation.id),
        ),
    ).toHaveLength(1);
    for (const subject of outgoing)
      expect(
        selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
          subject,
          from: 1,
          through: 1,
          bytes: 1024 * 1024,
        }).entries.some((entry) => entry.receipt.id === terrain.receipt.id),
      ).toBe(true);
    const earlier = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      through: 0,
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.find((entry) => entry.values.some((value) => value.kind === 'surface-patch'))!;
    expect(terrain.receipt.facets[0]!.blockId).toBe(earlier.receipt.facets[0]!.blockId);
    expect(terrain.receipt.facets[0]!.valueOrdinal).toBe(earlier.receipt.facets[0]!.valueOrdinal);
    validateTemporalEvidenceState(world);
    const retired = history.chunks.filter((chunk) => chunk.throughAt === 0);
    retireTemporalChunks(
      world,
      PLAYER_ID,
      retired.map((chunk) => chunk.id),
      {
        bytes: retired.reduce((sum, chunk) => sum + chunk.bytes, 0),
        count: retired.reduce((sum, chunk) => sum + chunk.count, 0),
      },
      null,
      0,
    );
    const cold = JSON.parse(JSON.stringify(world)) as WorldState;
    for (const subject of [...outgoing, exposure]) {
      const query = { subject, from: 1, through: 1, bytes: 1024 * 1024 };
      const retained = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
      expect(retained).toEqual(selectTemporalHistory(cold.experience!.temporal, PLAYER_ID, query));
      expect(retained.entries.some((entry) => entry.receipt.id === terrain.receipt.id)).toBe(true);
    }
    validateTemporalEvidenceState(world);
  });
  it('closes an actual held terrain interval when a later view replaces it, without resampling each body movement', () => {
    const value = map([surface('high', -5, 20, 2), surface('low', 20, 40, 0)]);
    value.width = 42;
    value.tiles = Array.from({ length: 5 }, () => Array(42).fill('grass'));
    const { world, people } = nativeScene(1, value, { x: 25, y: 2, z: 2 });
    const person = people[0]!;
    const subject = currentBodyObservation(world, PLAYER_ID, person.id)!.exposure.episodeId;
    const original = currentReceivedGeometry(world, PLAYER_ID).observations.find((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
    )!;
    expect(original).toBeDefined();
    const before = world.experience!.temporal!.actors[PLAYER_ID]!.count;
    world.simTime = 2;
    setSpatialPosition(world, person, { x: 6, y: 2, z: 2 }, null, 'physical');
    initializePerception(world, []);
    expect(currentReceivedGeometry(world, PLAYER_ID).supportedThrough).toBe(2);
    const atMovement = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    expect(
      atMovement.entries.filter((entry) =>
        entry.values.some((value) => value.kind === 'physical-boundary'),
      ),
    ).toHaveLength(1);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.count).toBeGreaterThan(before);
    world.simTime = 3;
    world.map.spatial.revision++;
    initializePerception(world, []);
    const historical = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      bytes: 1024 * 1024,
      limit: 1000,
    });
    const edges = historical.entries.filter((entry) =>
      entry.receipt.facets.some((facet) => facet.original?.source.id === original.id),
    );
    expect(edges).toHaveLength(2);
    const closed = edges.find((entry) => entry.receipt.at === 3)!;
    const first = edges.find((entry) => entry.receipt.at === 0)!;
    expect(closed.receipt.at).toBe(3);
    expect(closed.receipt.facets[0]).toMatchObject({
      measuredFrom: 0,
      measuredThrough: 0,
      acquiredAt: 0,
      confirmedThrough: 2,
      blockId: first.receipt.facets[0]!.blockId,
      valueOrdinal: first.receipt.facets[0]!.valueOrdinal,
    });
    expect(currentAttentionCues(world, PLAYER_ID)).toHaveLength(0);
    expect(currentReceivedGeometry(world, PLAYER_ID).observations).toHaveLength(0);
    validateTemporalEvidenceState(world);
  });
  it('keeps fifteen unfamiliar people present while an attended person approaches an actually received drop', () => {
    const value = map([surface('high', -5, 20, 2), surface('low', 20, 40, 0)]);
    value.width = 42;
    value.tiles = Array.from({ length: 5 }, () => Array(42).fill('grass'));
    // A supported airborne observation from the far side sees both actual surfaces;
    // no authored cliff label or private destination is supplied to the observer.
    const { world, people } = nativeScene(16, value, { x: 25, y: 2, z: 2 });
    const daughter = people[0]!;
    setSpatialPosition(world, daughter, { x: 15, y: 2, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const owner = world.perceptionEvidence![PLAYER_ID]!;
    const anchor = Object.entries(owner.attention!.candidates).find(
      ([, candidate]) => candidate.sourceId === daughter.id,
    )!;
    expect(setAttentionFocus(world, PLAYER_ID, [anchor[0]])).toBe(true);
    expect(
      Object.values(owner.current).filter((lease) => lease.value.kind === 'body'),
    ).toHaveLength(16);
    expect(currentDetailedAttention(world, PLAYER_ID)).toHaveLength(10);
    expect(
      currentReceivedGeometry(world, PLAYER_ID).observations.some((observation) =>
        observation.facets.some((facet) => facet.value.kind === 'physical-boundary'),
      ),
    ).toBe(true);
    world.simTime = 15;
    setSpatialPosition(world, daughter, { x: 16, y: 2, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const cue = currentAttentionCues(world, PLAYER_ID).find(
      (entry) => entry.sourceId === daughter.id && entry.family === 'closing-drop',
    );
    expect(cue).toBeDefined();
    expect(
      cue!.proof.some((fact) =>
        currentReceivedGeometry(world, PLAYER_ID).observations.some(
          (observation) => observation.id === fact.source.id,
        ),
      ),
    ).toBe(true);
    expect(JSON.stringify(owner.attention)).not.toContain('Secret person');
    expect(
      world.experience!.temporal!.actors[PLAYER_ID]!.chunks.some((chunk) =>
        chunk.receipts.some((receipt) => receipt.at === 15),
      ),
    ).toBe(true);
  });
  it('evaluates a stationary attended person when a received neighbor moves, without treating loss as clear evidence', () => {
    const { world, people } = nativeScene(2, map([surface('ground', -5, 25, 0)]));
    const anchor = people[0]!,
      neighbor = people[1]!;
    setSpatialPosition(world, anchor, { x: 5, y: 0, z: 2 }, null, 'physical');
    setSpatialPosition(world, neighbor, { x: 11, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const key = Object.entries(world.perceptionEvidence![PLAYER_ID]!.attention!.candidates).find(
      ([, candidate]) => candidate.sourceId === anchor.id,
    )![0];
    setAttentionFocus(world, PLAYER_ID, [key]);
    world.simTime = 15;
    setSpatialPosition(world, neighbor, { x: 7, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    const cue = currentAttentionCues(world, PLAYER_ID).find(
      (entry) => entry.sourceId === anchor.id && entry.family === 'closing-body',
    );
    expect(cue).toBeDefined();
    world.simTime = 30;
    setSpatialPosition(world, neighbor, { x: 100, y: 0, z: 2 }, null, 'physical');
    initializePerception(world, []);
    world.simTime = 180;
    initializePerception(world, []);
    expect(
      currentAttentionCues(world, PLAYER_ID).find((entry) => entry.id === cue!.id),
    ).toBeDefined();
  });
});
