import { experienceReading, type ExperienceEntry } from '@open-legend/domain';
import type { NativeGeometryQueries } from '@open-legend/native-simulation';

export interface NativeConsolidationFormatRequest {
  readonly binding: NativeGeometryQueries['binding'];
  readonly actorId: string;
  readonly sources: readonly ExperienceEntry[];
}

/** Shared Source wording over exact admitted native bodies. Native owns
 * coverage, original references, grouping, protection and source retirement. */
export function nativeConsolidationReadings(request: NativeConsolidationFormatRequest) {
  return {
    binding: request.binding,
    readings: request.sources.map((source) => experienceReading(source, request.actorId).summary),
  };
}
