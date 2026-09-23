import type { NavigationRequest, NavigationResult, SpatialMap } from '@open-legend/spatial';
export type NavigationMessage = {
  id: number;
  key: string;
  map?: SpatialMap;
  request?: NavigationRequest;
};
export interface NavigationReply {
  id: number;
  key: string;
  result?: NavigationResult;
  buildMs: number;
  queryMs: number;
  error?: string;
}
