/** Right-handed, Y-up metres. These data contracts contain no rendering or physics SDK objects. */
export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}
export interface SurfacePoint extends WorldPoint {
  surfaceId: string;
}
export interface Bounds3 {
  min: WorldPoint;
  max: WorldPoint;
}
export type Terrain = 'grass' | 'sand' | 'water' | 'rock';

/** A finite rectangular support patch. Its top is a plane, not a camera-facing image.
 * Additional geometry families belong behind this boundary, not in consumers' coordinate math.
 * archive/07-technical-architecture/spatial-world-runtime.md#initial-native-provider
 */
export interface WalkableSurface {
  id: string;
  name: string;
  levelId: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  slopeX: number;
  slopeZ: number;
  thickness: number;
  /** Filled ramp/terrain down to this height; absent means a finite parallel-sided slab. */
  solidBase?: number;
  acousticTransmission: number;
  material: 'ground' | 'timber' | 'stone';
}
export interface SpatialBlocker {
  id: string;
  bounds: Bounds3;
  movement: boolean;
  sight: boolean;
  acousticTransmission: number;
  material: 'stone' | 'timber';
}
export interface SpatialLayout {
  version: 1;
  revision: number;
  /** This first provider is for explicitly public starter geometry, not hidden world topology. */
  disclosure: 'public';
  surfaces: WalkableSurface[];
  blockers: SpatialBlocker[];
  levels: Array<{ id: string; name: string; focusY: number }>;
}
export interface SpatialMap {
  width: number;
  /** Number of cells along Z, retained from the map contract; not world-space Y. */
  height: number;
  tiles: Terrain[][];
  spatial: SpatialLayout;
}
export interface BodyProfile {
  id: string;
  radius: number;
  height: number;
  eyeHeight: number;
  earHeight: number;
  interactionHeight: number;
  maxSlope: number;
}
/** Compiled default-world profiles, not image-derived anatomy or universal biological laws. */
export const BODY_PROFILES = {
  person: {
    id: 'person',
    radius: 0.28,
    height: 1.75,
    eyeHeight: 1.58,
    earHeight: 1.52,
    interactionHeight: 0.85,
    maxSlope: 0.8,
  },
  hare: {
    id: 'hare',
    radius: 0.18,
    height: 0.45,
    eyeHeight: 0.35,
    earHeight: 0.4,
    interactionHeight: 0.25,
    maxSlope: 0.8,
  },
  deer: {
    id: 'deer',
    radius: 0.35,
    height: 1.55,
    eyeHeight: 1.3,
    earHeight: 1.4,
    interactionHeight: 0.8,
    maxSlope: 0.65,
  },
  bird: {
    id: 'bird',
    radius: 0.18,
    height: 0.4,
    eyeHeight: 0.3,
    earHeight: 0.3,
    interactionHeight: 0.2,
    maxSlope: 0.8,
  },
  object: {
    id: 'object',
    radius: 0.2,
    height: 0.7,
    eyeHeight: 0.4,
    earHeight: 0.4,
    interactionHeight: 0.4,
    maxSlope: 0.8,
  },
} as const satisfies Record<string, BodyProfile>;
export type BodyProfileId = keyof typeof BODY_PROFILES;
export const SPATIAL_LIMITS = {
  epsilon: 1e-5,
  supportTolerance: 0.015,
  maxExtent: 512,
  maxSurfaces: 32,
  maxBlockers: 128,
  maxGraphNodes: 16384,
  maxPathPoints: 2048,
  maxSearchExpansions: 32768,
  maxConnectorDistance: 1.6,
} as const;
export interface RayHit {
  id: string;
  kind: 'surface' | 'blocker';
  fraction: number;
  exitFraction: number;
  point: WorldPoint;
  transmission: number;
}
export type RouteResult =
  | { status: 'reached'; path: SurfacePoint[]; length: number; expanded: number }
  | { status: 'invalid-endpoint' | 'no-route' | 'budget-exceeded'; path: []; expanded: number };
