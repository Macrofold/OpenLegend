import type { NativeRefugeBatch } from '@open-legend/domain';
import type {
  BodyProfile,
  NavigationRequest,
  NavigationResult,
  SpatialMap,
} from '@open-legend/spatial';
export type NavigationMessage = {
  id: number;
  key: string;
  map?: SpatialMap;
  request?: NavigationRequest;
  requests?: NavigationRequest[];
  /** Private physical alternatives, processed serially by the same bounded worker. */
  variants?: Array<{ map: SpatialMap; requests: NavigationRequest[] }>;
  /** One existing body for optional idle map warmup; never replaces a real request body. */
  warmBody?: BodyProfile;
};
/** Worker-side attribution (SW06.2a): durations only, never cross-thread timestamps. */
export interface NavigationTiming {
  /** All mesh construction for this message, including first-use profile builds. */
  buildMs: number;
  /** Route query time excluding mesh construction. */
  queryMs: number;
  /** Worker module load plus Recast and Rapier initialization, on its first reply only. */
  startupMs?: number;
  /** Geometry validation and navigation-triangle export for a new map. */
  prepareMapMs?: number;
  /** A failed speculative body build leaves the valid map available for a later real query. */
  warmupFailed?: true;
  /** Profile meshes built for this message, including first use inside a route. */
  builds: Array<{ profile: string; ms: number; reason: 'map' | 'first-use' }>;
}
export interface NavigationReply {
  id: number;
  key: string;
  result?: NavigationResult;
  results?: NavigationResult[];
  timing?: NavigationTiming;
  error?: string;
}

/** Ordered derived answers; current action/proposal identity is checked at publication. */
export type PreparedNavigationPublication = {
  actorId: string;
} & (
  | { kind: 'action'; actionId: string; request: NavigationRequest; result: NavigationResult }
  | {
      kind: 'native-refuge';
      batch: NativeRefugeBatch;
      results: NavigationResult[];
    }
);
