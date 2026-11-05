import type { Position } from './types.js';
import { isDefinitionPin } from './definition-pins.js';
import type {
  EvidenceSource,
  ObservedLocation,
  ObservationExposure,
  ObservationOrigin,
  ObserverLife,
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
/** Bind a common successful check to its declared member without changing source family/version type. */
export function evidenceSourceWithIdentity(
  source: EvidenceSource,
  identity?: Omit<EvidenceSource, 'revision'>,
  minimumRevision = 0,
): EvidenceSource {
  if (identity && identity.family !== source.family)
    throw new Error('A received check changed its evidence source family.');
  const id = identity?.id ?? source.id,
    observer = identity?.observer ?? source.observer;
  switch (source.family) {
    case 'native-exposure':
    case 'native-response':
      return {
        family: source.family,
        id,
        observer,
        revision: Math.max(source.revision, minimumRevision),
      };
    case 'private-condition':
      return {
        family: source.family,
        id,
        observer,
        revision:
          typeof source.revision === 'number'
            ? Math.max(source.revision, minimumRevision)
            : source.revision,
      };
    case 'awareness':
    case 'memory':
    case 'action-result':
      return { family: source.family, id, observer, revision: source.revision };
  }
}
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
/** Acquired observations and selected history retain the same origin semantics.
 * docs/save-and-load.md#current-format-validation */
export function validateObservationOrigin(
  origin: ObservationOrigin,
  observer: ObserverLife,
  acquiredAt: number,
): void {
  if (!origin || typeof origin !== 'object') throw new Error('Invalid perception origin.');
  if (origin.kind === 'occurrence') {
    if (
      typeof origin.eventId !== 'string' ||
      !origin.eventId ||
      !Number.isFinite(origin.at) ||
      origin.at < 0 ||
      origin.at > acquiredAt ||
      !Number.isSafeInteger(origin.order) ||
      origin.order < 0
    )
      throw new Error('Invalid perception occurrence binding.');
  } else if (
    origin.kind !== 'exposure' ||
    typeof origin.episodeId !== 'string' ||
    !origin.episodeId ||
    typeof origin.detectorId !== 'string' ||
    !origin.detectorId ||
    !Number.isFinite(origin.measuredFrom) ||
    !Number.isFinite(origin.measuredThrough) ||
    origin.measuredFrom < 0 ||
    origin.measuredThrough < origin.measuredFrom ||
    origin.measuredThrough > acquiredAt
  )
    throw new Error('Invalid perception exposure binding.');
  if (origin.kind === 'exposure' && origin.source !== undefined) {
    validateEvidenceSource(origin.source);
    if (
      origin.source.observer.actorId !== observer.actorId ||
      origin.source.observer.physicalLife !== observer.physicalLife
    )
      throw new Error('Foreign physical support root.');
  }
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
