import type { SpatialLayout, WalkableSurface } from '@open-legend/spatial';
import type { FlightRoute } from '../../spatial-state.js';

export function starterSpatialLayout(width: number, depth: number): SpatialLayout {
  return {
    version: 1,
    revision: 1,
    disclosure: 'public',
    levels: [
      { id: 'ground', name: 'Clearing', focusY: 0 },
      { id: 'lookout', name: 'Lookout deck', focusY: 3 },
    ],
    surfaces: [
      ...starterGroundSurfaces(width, depth),
      {
        id: 'lookout-deck',
        name: 'Lookout deck',
        levelId: 'lookout',
        minX: 18,
        maxX: 25,
        minZ: 4,
        maxZ: 7,
        y: 3,
        slopeX: 0,
        slopeZ: 0,
        thickness: 0.35,
        acousticTransmission: 0.45,
        material: 'timber',
      },
      {
        id: 'lookout-ramp',
        name: 'Lookout ramp',
        levelId: 'ground',
        minX: 23,
        maxX: 25,
        minZ: 7,
        maxZ: 13,
        y: 3,
        slopeX: 0,
        slopeZ: -0.5,
        thickness: 0.25,
        solidBase: 0,
        acousticTransmission: 0.25,
        material: 'stone',
      },
    ],
    blockers: [
      {
        id: 'lookout-pillar-west',
        bounds: { min: { x: 18.15, y: 0, z: 4.15 }, max: { x: 18.55, y: 2.65, z: 4.55 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
      {
        id: 'lookout-pillar-east',
        bounds: { min: { x: 24.45, y: 0, z: 4.15 }, max: { x: 24.85, y: 2.65, z: 4.55 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
      {
        id: 'lookout-wall',
        bounds: { min: { x: 18, y: 3, z: 4 }, max: { x: 21, y: 4.4, z: 4.2 } },
        movement: true,
        sight: true,
        acousticTransmission: 0.4,
        material: 'timber',
      },
    ],
  };
}
export function starterFlightRoutes(): Record<string, FlightRoute> {
  return {
    'clearing-bird-loop': {
      id: 'clearing-bird-loop',
      speed: 0.12,
      climbSpeed: 0.06,
      points: [
        { position: { x: 22, y: 3, z: 5.5 }, landingSurfaceId: 'lookout-deck', waitSeconds: 180 },
        { position: { x: 22, y: 5.5, z: 5.5 }, waitSeconds: 0 },
        { position: { x: 15, y: 5.5, z: 9 }, waitSeconds: 0 },
        { position: { x: 10, y: 4.5, z: 15 }, waitSeconds: 0 },
        { position: { x: 20, y: 5.5, z: 16 }, waitSeconds: 0 },
        { position: { x: 22, y: 5.5, z: 5.5 }, waitSeconds: 0 },
      ],
    },
  };
}

/** Continuous, low authored rises built from the existing planar support family.
 * Adjacent heights agree exactly; no visual-only hill can conceal a flat physical floor. */
function starterGroundSurfaces(width: number, depth: number): WalkableSurface[] {
  const xs = [0, 32, 40, 48, 56, width - 1].filter(
    (n, i, a) => n <= width - 1 && a.indexOf(n) === i,
  );
  const zs = [0, 26, 34, 42, 48, depth - 1].filter(
    (n, i, a) => n <= depth - 1 && a.indexOf(n) === i,
  );
  const rise = (p: number, points: number[], heights: number[]) => {
    for (let i = 1; i < points.length; i++)
      if (p <= points[i]!)
        return (
          heights[i - 1]! +
          ((heights[i]! - heights[i - 1]!) * (p - points[i - 1]!)) / (points[i]! - points[i - 1]!)
        );
    return heights.at(-1)!;
  };
  const xHeight = (x: number) => rise(x, [0, 32, 40, 48, 56], [0, 0, 1.4, 1.4, 0.1]);
  const zHeight = (z: number) => rise(z, [0, 26, 34, 42, 48], [0, 0, 0.6, 0.6, 0]);
  const result: WalkableSurface[] = [];
  for (let zi = 1; zi < zs.length; zi++)
    for (let xi = 1; xi < xs.length; xi++) {
      const x = xs[xi - 1]!,
        z = zs[zi - 1]!,
        x1 = xs[xi]!,
        z1 = zs[zi]!;
      result.push({
        id: xi === 1 && zi === 1 ? 'terrain' : `terrain-${xi}-${zi}`,
        name: 'Woodland ground',
        levelId: 'ground',
        minX: x,
        maxX: x1,
        minZ: z,
        maxZ: z1,
        y: xHeight(x) + zHeight(z),
        slopeX: (xHeight(x1) - xHeight(x)) / (x1 - x),
        slopeZ: (zHeight(z1) - zHeight(z)) / (z1 - z),
        thickness: 1,
        solidBase: -16,
        acousticTransmission: 0,
        material: 'ground',
      });
    }
  return result;
}
