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
import { perceptionEvidenceOwner } from './perception-evidence.js';
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
    const restored = structuredClone(world);
    expect(
      currentReceivedGeometry(restored, PLAYER_ID).observations.map((value) => value.id),
    ).toEqual(currentReceivedGeometry(world, PLAYER_ID).observations.map((value) => value.id));
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
    const observations = currentReceivedGeometry(world, PLAYER_ID).observations.filter((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'physical-boundary'));
    const dependencies = observationDependencies(observations);
    const sources = observationLearningSources(observations);
    for (const boundary of boundaries)
      for (const support of [boundary.nearSurface.support, boundary.farSurface.support]) {
        expect(dependencies).toContainEqual({ source: support.source, ordinal: support.ordinal,
          aliases: [JSON.stringify(['perception-fact', support.source.id, support.ordinal])] });
        expect(sources).toContainEqual(support.source);
      }

    expect(
      boundaries.every(
        (boundary) =>
          boundary.dropLower >= 1.75 &&
          boundary.nearSurface.support.source.id !== boundary.farSurface.support.source.id,
      ),
    ).toBe(true);
    const corrupt=structuredClone(world);
    const edge=corrupt.perceptionEvidence![PLAYER_ID]!.geometry!.boundaries[0]!.facets[0]!.value;
    if(edge.kind==='physical-boundary')edge.boundary.farSurface.support.source.observer.actorId='someone-else';
    expect(()=>validateReceivedGeometryState(corrupt,PLAYER_ID,corrupt.perceptionEvidence![PLAYER_ID]!.geometry!)).toThrow('owned received surface');
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

function nativeScene(count: number, value: SpatialMap, observerPoint = { x: 1, y: 0, z: 2 }) {
  const world = createWorld(117),
    player = entityGet(world.entities, PLAYER_ID)!,
    prototype = entityGet(world.entities, NPC_ID)!;
  world.map = value;
  world.entities = emptyEntities();
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
