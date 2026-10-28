import { entityGet } from './entity-collection.js';
import { outcome } from './events.js';
import {
  advanceKnowledgeRevision,
  characterCount,
  knowledgeDocument,
  editKnowledge,
} from './knowledge.js';
import { isSafeRecordId, hasRecordFields } from './records.js';
import type { Outcome, WorldState } from './types.js';
import { isPresentationArtPath } from './presentation-art.js';

/** Installed artwork describes a map, not live perception or a navigation grant. */
export interface MapArtDefinition {
  path: string;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  northDegrees: number;
  markerIcons: Array<{ id: string; label: string; icon: string }>;
  maxMarkers: number;
  labelCharacters: number;
}
export interface MapMarker {
  id: string;
  x: number;
  z: number;
  label: string;
  icon: string;
}
export type MapMarkerEdit = {
  expectedRevision: number;
  id: string;
} & ({ remove: true } | { x: number; z: number; label: string; icon: string });

/** The existing actor knowledge revision fences the whole collection. Deletion can
 * remove a marker without an unbounded tombstone set or allowing old creates to revive it. */
export function editMapMarker(world: WorldState, actorId: string, edit: MapMarkerEdit): Outcome {
  const art = world.presentation?.mapArt;
  if (!art || !entityGet(world.entities, actorId)?.actor)
    return outcome(false, 'map-unavailable', 'This world has no map.');
  if (
    !isSafeRecordId(edit.id) ||
    !Number.isSafeInteger(edit.expectedRevision) ||
    edit.expectedRevision !== (world.knowledgeRevisions?.[actorId] ?? 0)
  )
    return outcome(false, 'stale-map', 'Your notes changed. Refresh the map before editing.');
  if (!Number.isSafeInteger(edit.expectedRevision + 1))
    return outcome(false, 'knowledge-exhausted', 'Your map cannot be edited further.');
  const markers = world.mapMarkers?.[actorId] ?? {};
  const previous = markers[edit.id];
  if ('remove' in edit) {
    if (!previous) return outcome(true, 'marker-absent', 'The marker is already removed.');
    const note = knowledgeDocument(world, actorId, { kind: 'map-marker', markerId: edit.id });
    if (note?.text) {
      const cleared = editKnowledge(
        world,
        actorId,
        {
          subjectId: { kind: 'map-marker', markerId: edit.id },
          expectedRevision: note.revision,
          text: '',
        },
        [{ kind: 'map-marker', markerId: edit.id }],
      );
      if (!cleared.ok) return cleared;
    }
    delete markers[edit.id];
    if (!note?.text) advanceKnowledgeRevision(world, actorId);
    return outcome(true, 'marker-deleted', 'Marker removed.');
  }
  const b = art.bounds;
  if (
    !Number.isFinite(edit.x) ||
    !Number.isFinite(edit.z) ||
    edit.x < b.minX ||
    edit.x > b.maxX ||
    edit.z < b.minZ ||
    edit.z > b.maxZ ||
    typeof edit.label !== 'string' ||
    !edit.label.trim() ||
    characterCount(edit.label.trim()) > art.labelCharacters ||
    !art.markerIcons.some((icon) => icon.id === edit.icon)
  )
    return outcome(
      false,
      'invalid-marker',
      `Choose a point on the map, an offered icon and a label within ${art.labelCharacters} characters.`,
    );
  if (!previous && Object.keys(markers).length >= art.maxMarkers)
    return outcome(
      false,
      'map-full',
      `Your map has ${art.maxMarkers} markers. Remove one to add another.`,
    );
  if (
    previous &&
    previous.x === edit.x &&
    previous.z === edit.z &&
    previous.label === edit.label.trim() &&
    previous.icon === edit.icon
  )
    return outcome(true, 'marker-unchanged', 'Your marker is already current.');
  ((world.mapMarkers ??= {})[actorId] ??= {})[edit.id] = {
    id: edit.id,
    x: edit.x,
    z: edit.z,
    label: edit.label.trim(),
    icon: edit.icon,
  };
  advanceKnowledgeRevision(world, actorId);
  return outcome(true, 'marker-saved', 'Marker saved.');
}

export function validateCartography(world: WorldState): void {
  const record = (value: unknown) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  if (world.mapMarkers !== undefined && !record(world.mapMarkers))
    throw new Error('Invalid map marker collection.');
  const art = world.presentation?.mapArt;
  if (art) {
    const b = art.bounds;
    if (
      !hasRecordFields(art, [
        'path',
        'bounds',
        'northDegrees',
        'markerIcons',
        'maxMarkers',
        'labelCharacters',
      ]) ||
      !isPresentationArtPath(art.path) ||
      !hasRecordFields(b, ['minX', 'minZ', 'maxX', 'maxZ']) ||
      !Object.values(b).every((v) => typeof v === 'number' && Number.isFinite(v)) ||
      !(b.minX < b.maxX && b.minZ < b.maxZ) ||
      !Number.isFinite(art.northDegrees) ||
      !Number.isSafeInteger(art.maxMarkers) ||
      art.maxMarkers < 1 ||
      !Number.isSafeInteger(art.labelCharacters) ||
      art.labelCharacters < 1 ||
      !Array.isArray(art.markerIcons) ||
      !art.markerIcons.length ||
      art.markerIcons.some(
        (icon) =>
          !hasRecordFields(icon, ['id', 'label', 'icon']) ||
          !isSafeRecordId(icon.id) ||
          !icon.label ||
          typeof icon.label !== 'string' ||
          !icon.icon ||
          typeof icon.icon !== 'string',
      ) ||
      new Set(art.markerIcons.map((icon) => icon.id)).size !== art.markerIcons.length
    )
      throw new Error('Invalid installed map artwork.');
  }
  for (const [actorId, markers] of Object.entries(world.mapMarkers ?? {})) {
    if (
      !record(markers) ||
      !art ||
      !entityGet(world.entities, actorId)?.actor ||
      Object.keys(markers).length > art.maxMarkers
    )
      throw new Error('Invalid map marker owner or capacity.');
    for (const [id, marker] of Object.entries(markers)) {
      const b = art.bounds;
      if (
        !hasRecordFields(marker, ['id', 'x', 'z', 'label', 'icon']) ||
        id !== marker.id ||
        !isSafeRecordId(id) ||
        !Number.isFinite(marker.x) ||
        !Number.isFinite(marker.z) ||
        marker.x < b.minX ||
        marker.x > b.maxX ||
        marker.z < b.minZ ||
        marker.z > b.maxZ ||
        typeof marker.label !== 'string' ||
        !marker.label.trim() ||
        characterCount(marker.label) > art.labelCharacters ||
        !art.markerIcons.some((icon) => icon.id === marker.icon)
      )
        throw new Error('Invalid saved map marker.');
    }
  }
}
