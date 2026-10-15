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
/** Ordered upper rectangle, extruded by its normal thickness into a finite prism.
 * Corners wind toward the upper normal; bounds are only its broad phase. */
export interface FinitePanel {
  corners: [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
  thickness: number;
}
/** Authored identifiers; their meaning is supplied by the map, never inferred from the name. */
export type Terrain = string;
export interface TerrainDefinition {
  walkable: boolean;
  solid?: {
    height: number;
    movement: boolean;
    sight: boolean;
    acousticTransmission: number;
    material: string;
    name: string;
  };
  presentation: {
    style: 'ground' | 'earth' | 'liquid';
    color: string;
    overviewColor: string;
    patternColors?: string[];
    bankColors?: [string, string];
    glintColors?: [string, string];
  };
}

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
  /** Apply the map's authored cell walkability to this support patch. */
  terrain?: boolean;
  material: string;
}
export interface SpatialBlocker {
  /** A finite panel is collision geometry and can never become a supporting floor. */
  nonWalkable?: boolean;
  id: string;
  bounds: Bounds3;
  panel?: FinitePanel;
  movement: boolean;
  sight: boolean;
  acousticTransmission: number;
  material: string;
}
export interface SpatialLayout {
  version: 1;
  revision: number;
  /** This first provider is for explicitly public starter geometry, not hidden world topology. */
  disclosure: 'public';
  surfaces: WalkableSurface[];
  blockers: SpatialBlocker[];
  levels: Array<{ id: string; name: string; focusY: number }>;
  /** Public static artwork only. Native support/blockers remain the physical authority. */
  scenery?: SceneryInstance[];
}
export interface SceneryInstance {
  id: string;
  appearance: string;
  seed: number;
  position: WorldPoint;
  width: number;
  height: number;
  castShadows: boolean;
}
export interface SpatialMap {
  width: number;
  /** Number of cells along Z, retained from the map contract; not world-space Y. */
  height: number;
  tiles: Terrain[][];
  terrain: Record<string, TerrainDefinition>;
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
/** World units are metres; these are tolerances, not position quantization. The navmesh
 * is approximate; its output is reprojected onto an identified physical support.
 */
export const MOVEMENT = {
  skin: 0.01,
  // Eight-centimetre rasterization preserves the measured person-width passage; not placement snapping.
  cellSize: 0.08,
  cellHeight: 0.05,
  contourError: 0.1,
  projectionTolerance: 0.2,
  arrivalTolerance: 0.02,
  maxStepHeight: 0,
  maxReplans: 2,
} as const;
export interface NavigationRequest {
  from: SurfacePoint;
  destinations: SurfacePoint[];
  body: BodyProfile;
  geometryRevision: number;
}
export type NavigationResult =
  | { status: 'reached'; path: SurfacePoint[]; length: number }
  | {
      status: 'no-route' | 'invalid-endpoint' | 'budget-exceeded' | 'unsafe-route' | 'unavailable';
      path: [];
      reason?: string;
    };
export type RoutePlan =
  | { status: 'reached'; path: SurfacePoint[]; length: number; expanded: number }
  | { status: 'pending'; path: []; request: NavigationRequest; expanded: number }
  | { status: 'invalid-endpoint' | 'no-route' | 'budget-exceeded'; path: []; expanded: number };
export const SPATIAL_LIMITS = {
  epsilon: 1e-5,
  supportTolerance: 0.015,
  maxExtent: 512,
  maxSurfaces: 32,
  maxBlockers: 128,
  maxScenery: 4096,
  maxGraphNodes: 16384,
  maxPathPoints: 2048,
} as const;
export interface RayHit {
  id: string;
  kind: 'surface' | 'blocker';
  fraction: number;
  exitFraction: number;
  point: WorldPoint;
  transmission: number;
}
