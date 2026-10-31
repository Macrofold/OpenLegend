import type { Position } from './types.js';
import { isDefinitionPin } from './definition-pins.js';
import type {
  EvidenceSource,
  ObservedLocation,
  ObservationExposure,
} from './perception-evidence.js';

/** Canonical compound track identity is not a primitive record ID. Validate the
 * installed pin's parts without imposing the primitive ID limit on the tuple. */
export function validReceivedTrackKey(value: unknown, exposure?: string): value is string {
  if (typeof value !== 'string') return false;
  try {
    const parts: unknown = JSON.parse(value);
    return (
      Array.isArray(parts) &&
      parts.length === 4 &&
      typeof parts[0] === 'string' &&
      !!parts[0] &&
      (exposure === undefined || parts[0] === exposure) &&
      isDefinitionPin({ id: parts[1], version: parts[2], digest: parts[3] }) &&
      JSON.stringify(parts) === value
    );
  } catch {
    return false;
  }
}
export function validObservationExposure(value: unknown): value is ObservationExposure {
  if (!value || typeof value !== 'object') return false;
  const exposure = value as ObservationExposure;
  return (
    !!exposure.observer &&
    typeof exposure.observer.actorId === 'string' &&
    !!exposure.observer.actorId &&
    Number.isSafeInteger(exposure.observer.physicalLife) &&
    exposure.observer.physicalLife >= 0 &&
    typeof exposure.episodeId === 'string' &&
    !!exposure.episodeId &&
    validReceivedTrackKey(exposure.track, exposure.episodeId)
  );
}

export const validPerceivedPoint = (value: unknown): value is Position =>
  !!value &&
  typeof value === 'object' &&
  'x' in value &&
  'y' in value &&
  'z' in value &&
  [value.x, value.y, value.z].every(Number.isFinite);
export function validateEvidenceSource(source: EvidenceSource): void {
  if (
    !source ||
    typeof source.id !== 'string' ||
    !source.id ||
    !source.observer ||
    typeof source.observer.actorId !== 'string' ||
    !Number.isSafeInteger(source.observer.physicalLife) ||
    source.observer.physicalLife < 0
  )
    throw new Error('Invalid evidence source binding.');
  const numeric =
    typeof source.revision === 'number' &&
    Number.isSafeInteger(source.revision) &&
    source.revision >= 1;
  const textual = typeof source.revision === 'string' && source.revision.length > 0;
  if (
    (['awareness', 'memory', 'action-result'].includes(source.family) && textual) ||
    (source.family === 'private-condition' && (numeric || textual)) ||
    (['native-exposure', 'native-response'].includes(source.family) && numeric)
  )
    return;
  throw new Error('Invalid evidence family revision.');
}
export function validateObservedLocation(location: ObservedLocation): void {
  if (!location || typeof location !== 'object') throw new Error('Invalid perceived location.');
  if (
    location.kind === 'point' &&
    validPerceivedPoint(location.point) &&
    Number.isFinite(location.errorRadius) &&
    location.errorRadius >= 0
  )
    return;
  if (
    location.kind === 'region' &&
    validPerceivedPoint(location.center) &&
    Number.isFinite(location.radius) &&
    location.radius >= 0
  )
    return;
  if (
    location.kind === 'bearing' &&
    validPerceivedPoint(location.from) &&
    Number.isSafeInteger(location.sector) &&
    location.sector >= 0 &&
    location.sector < 8 &&
    ['above', 'level', 'below'].includes(location.elevation) &&
    Number.isFinite(location.spread) &&
    location.spread > 0
  )
    return;
  throw new Error('Invalid perceived location precision.');
}
