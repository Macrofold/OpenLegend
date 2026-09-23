import { describe, expect, it } from 'vitest';
import {
  BODY_PROFILES,
  canFlySegment,
  canStand,
  canWalkSegment,
  clearSegment,
  distance3D,
  findSurfaceRoute,
  pickSurfaces,
  rayHits,
  resolveSupport,
  soundTransmission,
  validateSpatialMap,
  type SpatialMap,
  type SurfacePoint,
} from './index.js';

function fixture(): SpatialMap {
  return {
    width: 10,
    height: 10,
    tiles: Array.from({ length: 10 }, () => Array(10).fill('grass')),
    spatial: {
      version: 1,
      revision: 1,
      disclosure: 'public',
      levels: [
        { id: 'ground', name: 'Ground', focusY: 0 },
        { id: 'deck', name: 'Deck', focusY: 3 },
      ],
      blockers: [],
      surfaces: [
        {
          id: 'terrain',
          name: 'Ground',
          levelId: 'ground',
          minX: 0,
          maxX: 9,
          minZ: 0,
          maxZ: 9,
          y: 0,
          slopeX: 0,
          slopeZ: 0,
          thickness: 1,
          solidBase: -16,
          acousticTransmission: 0,
          material: 'ground',
        },
        {
          id: 'deck',
          name: 'Deck',
          levelId: 'deck',
          minX: 2,
          maxX: 8,
          minZ: 1,
          maxZ: 3,
          y: 3,
          slopeX: 0,
          slopeZ: 0,
          thickness: 0.35,
          acousticTransmission: 0.45,
          material: 'timber',
        },
        {
          id: 'ramp',
          name: 'Ramp',
          levelId: 'ground',
          minX: 6,
          maxX: 8,
          minZ: 3,
          maxZ: 9,
          y: 3,
          slopeX: 0,
          slopeZ: -0.5,
          thickness: 0.2,
          solidBase: 0,
          acousticTransmission: 0.2,
          material: 'stone',
        },
      ],
    },
  };
}
const point = (x: number, y: number, z: number, surfaceId = 'terrain'): SurfacePoint => ({
  x,
  y,
  z,
  surfaceId,
});

describe('bounded 3D geometry and layered navigation', () => {
  it('separates same-XZ supports and refuses wrong-floor snapping', () => {
    const map = fixture();
    validateSpatialMap(map);
    expect(distance3D(point(4, 0, 2), point(4, 3, 2, 'deck'))).toBe(3);
    expect(resolveSupport(map, point(4, 3, 2), 'terrain')).toBeNull();
    expect(resolveSupport(map, point(4, 2.5, 2))).toBeNull();
    expect(canStand(map, point(4, 0, 2))).toBe(true);
    expect(canStand(map, point(4, 3, 2, 'deck'))).toBe(true);
  });
  it('follows a real ramp in both directions without connecting adjacent floors', () => {
    const map = fixture(),
      start = point(4, 0, 8),
      target = point(4, 3, 2, 'deck');
    for (const [from, to] of [
      [start, target],
      [target, start],
    ]) {
      const route = findSurfaceRoute(map, from!, to!);
      expect(route.status).toBe('reached');
      expect(route.path.at(-1)).toEqual(to);
      expect(route.path.some((p) => p.surfaceId === 'ramp' && p.y > 0 && p.y < 3)).toBe(true);
      let previous = from!;
      for (const next of route.path) {
        expect(canWalkSegment(map, previous, next)).toBe(true);
        previous = next;
      }
    }
    expect(canWalkSegment(map, point(4, 0, 2), target)).toBe(false);
  });
  it('does not let a ramp seam exception bypass its filled interior', () => {
    const map = fixture();
    expect(canWalkSegment(map, point(5, 0, 6), point(9, 0, 6))).toBe(false);
    expect(canStand(map, point(7, 0, 6))).toBe(false);
    expect(canWalkSegment(map, point(7, 3, 3, 'deck'), point(7, 3, 3, 'ramp'))).toBe(true);
  });
  it('checks headroom and thin obstacles with swept volume, not just endpoints', () => {
    const map = fixture();
    map.spatial.blockers.push({
      id: 'thin-wall',
      bounds: { min: { x: 4.49, y: 0, z: 5 }, max: { x: 4.51, y: 2, z: 7 } },
      movement: true,
      sight: true,
      acousticTransmission: 0.2,
      material: 'stone',
    });
    expect(canWalkSegment(map, point(3, 0, 6), point(6, 0, 6))).toBe(false);
    expect(canFlySegment(map, point(3, 1, 6), point(6, 1, 6), BODY_PROFILES.bird)).toBe(false);
    expect(canFlySegment(map, point(3, 2.1, 6), point(6, 2.1, 6), BODY_PROFILES.bird)).toBe(true);
    const low = fixture();
    low.spatial.surfaces[1]!.y = 1.2;
    expect(canStand(low, point(4, 0, 2), BODY_PROFILES.person)).toBe(false);
    expect(canStand(low, point(4, 0, 2), BODY_PROFILES.hare)).toBe(true);
  });
  it('retains a single acoustic contribution per slab and distinguishes sound from sight', () => {
    const map = fixture(),
      from = point(4, 1.5, 2),
      to = point(4, 4, 2);
    expect(clearSegment(map, from, to)).toBe(false);
    expect(rayHits(map, from, to, 'sound').map((hit) => hit.id)).toEqual(['deck']);
    expect(soundTransmission(map, from, to)).toBe(0.45);
  });
  it('picks the intended floor without mutating physical geometry for a cutaway', () => {
    const map = fixture(),
      from = point(4, 8, 2),
      to = point(4, -2, 2);
    expect(pickSurfaces(map, from, to, null).map((hit) => hit.point.surfaceId)).toEqual([
      'deck',
      'terrain',
    ]);
    expect(pickSurfaces(map, from, to, 'ground')[0]!.point.surfaceId).toBe('terrain');
    expect(clearSegment(map, point(4, 1, 2), point(4, 4, 2))).toBe(false);
  });
  it('reports finite search exhaustion and never reports a disconnected deck reached', () => {
    const map = fixture(),
      from = point(4, 0, 8),
      to = point(4, 3, 2, 'deck');
    expect(findSurfaceRoute(map, from, to, BODY_PROFILES.person, 1).status).toBe('budget-exceeded');
    const disconnected = fixture();
    disconnected.spatial.surfaces.pop();
    expect(findSurfaceRoute(disconnected, from, to).status).toBe('no-route');
    expect(findSurfaceRoute(map, from, { ...to, y: NaN }).status).toBe('invalid-endpoint');
  });
  it('invalidates changed immutable geometry rather than reusing a route through a wall', () => {
    const map = fixture(),
      from = point(0, 0, 5),
      to = point(3, 0, 5);
    expect(findSurfaceRoute(map, from, to).status).toBe('reached');
    const next = structuredClone(map);
    next.spatial.revision++;
    next.spatial.blockers.push({
      id: 'closed-wall',
      bounds: { min: { x: 1.5, y: 0, z: 0 }, max: { x: 1.6, y: 8, z: 9 } },
      movement: true,
      sight: true,
      acousticTransmission: 0,
      material: 'stone',
    });
    expect(findSurfaceRoute(next, from, to).status).toBe('no-route');
  });
  it('rejects unbounded geometry and unsafe semantic IDs', () => {
    const map = fixture();
    map.spatial.surfaces[1]!.id = '__proto__';
    expect(() => validateSpatialMap(map)).toThrow();
    const oversized = fixture();
    oversized.width = 100000;
    expect(() => validateSpatialMap(oversized)).toThrow();
  });
});
