import type { NavigationRequest, NavigationResult, SpatialMap } from '@open-legend/spatial';
export type NavigationMessage = {
  id: number;
  key: string;
  map?: SpatialMap;
  request?: NavigationRequest;
};
/** Worker-side attribution (SW06.2a): durations only, never cross-thread timestamps. */
export interface NavigationTiming {
  /** Worker module load plus Recast and Rapier initialization, on its first reply only. */
  startupMs?: number;
  /** Geometry validation and navigation-triangle export for a new map. */
  prepareMapMs?: number;
  /** Profile meshes built for this message, including first use inside a route. */
  builds: Array<{ profile: string; ms: number; reason: 'map' | 'first-use' }>;
}
export interface NavigationReply {
  id: number;
  key: string;
  result?: NavigationResult;
  /** All mesh construction for this message, including first-use profile builds. */
  buildMs: number;
  /** Route query time excluding mesh construction. */
  queryMs: number;
  timing?: NavigationTiming;
  error?: string;
}
