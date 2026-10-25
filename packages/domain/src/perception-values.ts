import type { Position } from './types.js';
import type { EvidenceSource, ObservedLocation } from './perception-evidence.js';

export const validPerceivedPoint = (value: Position | undefined) =>
  !!value && [value.x, value.y, value.z].every(Number.isFinite);
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
