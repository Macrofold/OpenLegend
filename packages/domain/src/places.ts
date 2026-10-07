import { readOnlyDraftView } from './draft.js';
import { resolveSupport, finitePoint, type SurfacePoint } from '@open-legend/spatial';
import { worldPosition, worldSupport, spatialMap } from './spatial-state.js';
import { getOwn, isSafeRecordId, hasRecordFields } from './records.js';
import type { Entity, WorldState } from './types.js';

/** Authored static areas refer to physical support and a perceptible landmark, never art.
 * docs/limits/parallel-batch-04-expeditions-and-exchange.md#px-l02--static-named-places-learned-information-only */
export interface PlaceDefinition {
  id: string;
  revision: number;
  label: string;
  description: string;
  point: SurfacePoint;
  landmarkId: string;
  exposure: { kind: 'arrive-and-see'; radius: number; importance: number };
  mechanismFields?: Record<string, Record<string, number>>;
}

export type EncounterExposure =
  | {
      kind: 'place';
      id: string;
      revision: number;
      label: string;
      description: string;
      point: SurfacePoint;
      locationLabel: string;
      landmarkId: string;
      mechanismFields?: Record<string, Record<string, number>>;
    }
  | {
      kind: 'inventory-item';
      id: string;
      definition: { id: string; version: number };
      label: string;
      description: string;
      introductionKey: string;
      mechanismFields?: Record<string, Record<string, number>>;
    };

const indexes = new WeakMap<object, Map<string, PlaceDefinition[]>>();
const text = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && !!value.trim() && value.length <= maximum;
function validFields(value: unknown): boolean {
  return (
    value === undefined ||
    (!!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.entries(value).every(
        ([id, fields]) =>
          isSafeRecordId(id) &&
          !!fields &&
          typeof fields === 'object' &&
          !Array.isArray(fields) &&
          Object.entries(fields).every(
            ([key, number]) =>
              isSafeRecordId(key) && typeof number === 'number' && Number.isFinite(number),
          ),
      ))
  );
}
/** Current-format evidence must remain usable for private display and movement even
 * when its original place/definition no longer exists. Never validate it against live facts. */
export function validEncounterExposure(value: unknown): value is EncounterExposure {
  if (!value || typeof value !== 'object') return false;
  const exposure = value as EncounterExposure;
  if (
    !isSafeRecordId(exposure.id) ||
    !text(exposure.label, 160) ||
    !text(exposure.description, 8000) ||
    !validFields(exposure.mechanismFields)
  )
    return false;
  return exposure.kind === 'place'
    ? hasRecordFields(
        exposure,
        ['kind', 'id', 'revision', 'label', 'description', 'point', 'locationLabel', 'landmarkId'],
        ['mechanismFields'],
      ) &&
        Number.isSafeInteger(exposure.revision) &&
        exposure.revision > 0 &&
        finitePoint(exposure.point) &&
        isSafeRecordId(exposure.point.surfaceId) &&
        text(exposure.locationLabel, 160) &&
        isSafeRecordId(exposure.landmarkId)
    : exposure.kind === 'inventory-item' &&
        hasRecordFields(
          exposure,
          ['kind', 'id', 'definition', 'label', 'description', 'introductionKey'],
          ['mechanismFields'],
        ) &&
        hasRecordFields(exposure.definition, ['id', 'version']) &&
        isSafeRecordId(exposure.definition.id) &&
        Number.isSafeInteger(exposure.definition.version) &&
        exposure.definition.version > 0 &&
        [
          `inventory-item:${exposure.id}`,
          `inventory-definition:${exposure.definition.id}`,
        ].includes(exposure.introductionKey);
}
export function placeLandmarkIndex(definitions: WorldState['places']) {
  const source = readOnlyDraftView(definitions);
  let index = indexes.get(source);
  if (!index) {
    index = new Map();
    for (const definition of Object.values(source)) {
      const rows = index.get(definition.landmarkId) ?? [];
      rows.push(definition);
      index.set(definition.landmarkId, rows);
    }
    if (Object.isFrozen(source)) indexes.set(source, index);
  }
  return index;
}

/** A moved landmark cannot establish that its old authored site is present here. */
function landmarkAtPlace(world: WorldState, place: PlaceDefinition): boolean {
  const landmark = getOwn(world.entities, place.landmarkId);
  if (!landmark || landmark.actor || landmark.placement?.mode !== 'world') return false;
  const position = worldPosition(landmark);
  return (
    worldSupport(landmark) === place.point.surfaceId &&
    Math.hypot(
      position.x - place.point.x,
      position.y - place.point.y,
      position.z - place.point.z,
    ) <= place.exposure.radius
  );
}

/** The perception owner supplies its already-permitted visible objects. Work follows
 * visible landmarks and their places, not every place in the world. */
export function exposedPlaces(
  world: WorldState,
  observer: Entity,
  visible: readonly string[],
  index = placeLandmarkIndex(world.places),
) {
  const position = worldPosition(observer),
    support = worldSupport(observer);
  const result: PlaceDefinition[] = [];
  for (const id of visible)
    for (const place of index.get(id) ?? [])
      if (
        support === place.point.surfaceId &&
        Math.hypot(
          position.x - place.point.x,
          position.y - place.point.y,
          position.z - place.point.z,
        ) <= place.exposure.radius &&
        landmarkAtPlace(world, place)
      )
        result.push(place);
  return result;
}

/** Pending prose may not describe a replacement definition. Remembered snapshots stay
 * historical; this check neither updates them nor discloses live place conditions. */
export function currentPlaceObservation(
  world: WorldState,
  exposure: Extract<EncounterExposure, { kind: 'place' }>,
): boolean {
  const place = getOwn(world.places, exposure.id);
  return (
    !!place &&
    place.revision === exposure.revision &&
    place.landmarkId === exposure.landmarkId &&
    landmarkAtPlace(world, place) &&
    place.label === exposure.label &&
    place.description === exposure.description &&
    place.point.surfaceId === exposure.point.surfaceId &&
    place.point.x === exposure.point.x &&
    place.point.y === exposure.point.y &&
    place.point.z === exposure.point.z
  );
}

export function validatePlaces(world: WorldState): void {
  if (!world.places || Array.isArray(world.places) || typeof world.places !== 'object')
    throw new Error('Missing current authored place definitions.');
  if (
    !validFields(world.visiblePlaces) ||
    Object.values(world.visiblePlaces ?? {}).some((places) =>
      Object.values(places).some((revision) => !Number.isSafeInteger(revision) || revision < 1),
    )
  )
    throw new Error('Invalid saved place exposure baseline.');
  for (const [id, place] of Object.entries(world.places)) {
    if (
      !hasRecordFields(
        place,
        ['id', 'revision', 'label', 'description', 'point', 'landmarkId', 'exposure'],
        ['mechanismFields'],
      )
    )
      throw new Error('Invalid static authored place.');
    // Native custody/retirement can remove the marker without removing its authored
    // site. Keep that valid saved definition inactive; exposure/movement require a
    // present world marker through landmarkAtPlace, not through save validation.
    // docs/spatial-world.md#static-named-places-and-known-places
    const landmark = getOwn(world.entities, place.landmarkId);
    if (
      !hasRecordFields(place.exposure, ['kind', 'radius', 'importance']) ||
      !isSafeRecordId(id) ||
      id !== place.id ||
      !Number.isSafeInteger(place.revision) ||
      place.revision < 1 ||
      typeof place.label !== 'string' ||
      !place.label.trim() ||
      place.label.length > 160 ||
      typeof place.description !== 'string' ||
      !place.description.trim() ||
      place.description.length > 2000 ||
      !finitePoint(place.point) ||
      typeof place.point.surfaceId !== 'string' ||
      !resolveSupport(spatialMap(world), place.point, place.point.surfaceId) ||
      !isSafeRecordId(place.landmarkId) ||
      landmark?.actor ||
      place.exposure?.kind !== 'arrive-and-see' ||
      !Number.isFinite(place.exposure.importance) ||
      place.exposure.importance < 0 ||
      place.exposure.importance > 10 ||
      !Number.isFinite(place.exposure.radius) ||
      place.exposure.radius <= 0 ||
      !validFields(place.mechanismFields)
    )
      throw new Error('Invalid static authored place.');
  }
  for (const entries of Object.values(world.experience?.awareness ?? {}))
    for (const entry of entries)
      if (entry.exposure !== undefined && !validEncounterExposure(entry.exposure))
        throw new Error('Invalid saved encounter evidence.');
}
