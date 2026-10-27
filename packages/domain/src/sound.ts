import { namePhrase, type Named } from '@open-legend/language';
import { finitePoint } from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { hasMemory } from './living.js';
import { worldPosition } from './spatial-state.js';
import { soundPerception, type AcousticEmission } from './perception.js';
import { outwardBodyName } from './worlds/base/knowledge.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { ensurePerceptionEpisode } from './encounter-cache.js';
import type { Awareness } from './experience.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

export interface AcousticDirection {
  sector: number;
  elevation: 'above' | 'level' | 'below';
}
export interface PerceivedSound {
  kind?: 'voice-like';
  acquisition: 'self' | 'external';
  physicalLife: number;
  acquiredAt: number;
  listenerPosition: Position;
  receivedLevelDbSpl: number;
  clarityMarginDb: number;
  detectThresholdDb: number;
  direction: AcousticDirection | null;
  visibleSource: {
    entityId: string;
    physicalLife: number;
    episodeId: string | null;
    description: Named;
  } | null;
}
/** Saved body/episode bindings protect native continuation; they do not teach
 * listeners hidden life history or become model/client authority references. */
export function soundExperience(sound: PerceivedSound, reference: (id: string) => string) {
  const { physicalLife: _life, visibleSource, ...meaning } = sound;
  return {
    ...meaning,
    visibleSource: visibleSource
      ? {
          entityId: reference(visibleSource.entityId),
          description: visibleSource.description,
        }
      : null,
  };
}

/** Saved world-axis bearing, shared with speech. It never supplies a source point. */
export function acousticDirection(source: Position, listener: Position): AcousticDirection | null {
  const dx = source.x - listener.x,
    dz = source.z - listener.z,
    dy = source.y - listener.y;
  return Math.hypot(dx, dz) >= Math.max(0.25, Math.abs(dy))
    ? {
        sector: (Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) + 8) % 8,
        elevation: dy > 2 ? 'above' : dy < -2 ? 'below' : 'level',
      }
    : null;
}
export function validAcousticDirection(value: unknown): value is AcousticDirection | null {
  if (value === null) return true;
  if (!hasRecordFields(value, ['sector', 'elevation']) || Object.keys(value).length !== 2)
    return false;
  const direction = value as unknown as AcousticDirection;
  return (
    Number.isInteger(direction.sector) &&
    direction.sector >= 0 &&
    direction.sector <= 7 &&
    ['above', 'level', 'below'].includes(direction.elevation)
  );
}
export function validatePerceivedSound(value: unknown): asserts value is PerceivedSound {
  if (
    !hasRecordFields(
      value,
      [
        'acquisition',
        'physicalLife',
        'acquiredAt',
        'listenerPosition',
        'receivedLevelDbSpl',
        'clarityMarginDb',
        'detectThresholdDb',
        'direction',
        'visibleSource',
      ],
      ['kind'],
    )
  )
    throw new Error('Invalid acquired sound fields.');
  const sound = value as unknown as PerceivedSound;
  if (
    (sound.kind !== undefined && sound.kind !== 'voice-like') ||
    !['self', 'external'].includes(sound.acquisition) ||
    !Number.isSafeInteger(sound.physicalLife) ||
    sound.physicalLife < 0 ||
    !Number.isFinite(sound.acquiredAt) ||
    sound.acquiredAt < 0 ||
    !finitePoint(sound.listenerPosition) ||
    Object.keys(sound.listenerPosition).length !== 3 ||
    ![sound.receivedLevelDbSpl, sound.clarityMarginDb, sound.detectThresholdDb].every(
      Number.isFinite,
    ) ||
    sound.clarityMarginDb < sound.detectThresholdDb ||
    !validAcousticDirection(sound.direction) ||
    (sound.acquisition === 'self' && (sound.direction !== null || sound.visibleSource !== null))
  )
    throw new Error('Invalid acquired sound.');
  const source = sound.visibleSource;
  if (
    source !== null &&
    (!hasRecordFields(source, ['entityId', 'physicalLife', 'episodeId', 'description']) ||
      Object.keys(source).length !== 4 ||
      !isSafeRecordId(source.entityId) ||
      !Number.isSafeInteger(source.physicalLife) ||
      source.physicalLife < 0 ||
      (source.episodeId !== null && !isSafeRecordId(source.episodeId)) ||
      !source.description ||
      typeof source.description.name !== 'string' ||
      !source.description.name.trim() ||
      !['count', 'mass', 'plural'].includes(source.description.nameForm ?? '') ||
      Object.keys(source.description).some(
        (key) => !['name', 'nameForm', 'indefiniteArticle'].includes(key),
      ) ||
      (source.description.indefiniteArticle !== undefined &&
        !['a', 'an'].includes(source.description.indefiniteArticle)))
  )
    throw new Error('Invalid visible sound source.');
}
export function soundDescription(sound: PerceivedSound): string {
  const source =
    sound.acquisition === 'self'
      ? ' from my own body'
      : sound.visibleSource
        ? ` from ${namePhrase(sound.visibleSource.description, 'indefinite')}`
        : '';
  const bearing = sound.direction
    ? ` to the ${['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][sound.direction.sector]}${sound.direction.elevation === 'level' ? '' : ` and ${sound.direction.elevation}`}`
    : '';
  return `I heard a sound${source}${bearing}.`;
}

export function soundEvidenceProjection(actorId: string, sound: PerceivedSound) {
  const self = sound.acquisition === 'self';
  const sourceId = self ? actorId : sound.visibleSource?.entityId;
  return {
    text: soundDescription(sound),
    modality: 'heard' as const,
    recognized: !!sourceId,
    intelligible: false,
    entityIds: sourceId ? [sourceId] : [],
    ...(sourceId ? { sourceId } : {}),
    references: sourceId
      ? [
          {
            id: sourceId,
            label: self ? 'me' : namePhrase(sound.visibleSource!.description, 'indefinite'),
            role: 'actor' as const,
          },
        ]
      : [],
    triggerKind: self ? ('self_event' as const) : ('observed_event' as const),
  };
}

/** One typed intake accepts speech or a native emitter; no linguistic fields are read. */
export function perceiveSound(
  world: WorldState,
  observer: Entity,
  event: WorldEvent,
  emission: AcousticEmission,
  contact = soundPerception(world, observer, emission),
): Awareness | null {
  if (
    !contact ||
    contact.detail === 'undetected' ||
    contact.receivedLevelDbSpl === null ||
    contact.clarityMarginDb === null
  )
    return null;
  const self = emission.emitterId === observer.id;
  const source = emission.emitterId ? entityGet(world.entities, emission.emitterId) : undefined;
  const visible = source && !self && contact.sees(source);
  const listener = worldPosition(observer);
  const sound: PerceivedSound = {
    acquisition: self ? 'self' : 'external',
    physicalLife: observer.actor?.physicalLife ?? 0,
    acquiredAt: event.at,
    listenerPosition: { ...listener },
    receivedLevelDbSpl: contact.receivedLevelDbSpl,
    clarityMarginDb: contact.clarityMarginDb,
    detectThresholdDb: world.moduleManifest.acoustics.thresholdsDb.detect,
    direction: self
      ? null
      : acousticDirection(source ? worldPosition(source) : emission.origin, listener),
    visibleSource: visible
      ? {
          entityId: source.id,
          physicalLife: source.actor?.physicalLife ?? 0,
          episodeId: ensurePerceptionEpisode(world, observer.id, source.id),
          description: outwardBodyName(world, source),
        }
      : null,
  };
  const retentionClass = 'sensory' as const;
  return {
    retentionClass,
    ...(retentionClass === 'sensory'
      ? { expiresAt: event.at + world.moduleManifest.acoustics.sensoryLifetimeSeconds }
      : {}),
    eventId: event.id,
    actorId: observer.id,
    at: event.at,
    sequence: event.order ?? event.sequence,
    eventType: event.type,
    sound,
    ...soundEvidenceProjection(observer.id, sound),
    importance: 3,
    urgency: event.urgency ?? 4,
  };
}
