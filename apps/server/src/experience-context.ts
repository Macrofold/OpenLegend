import {
  subjectLabel,
  type WorldState,
  type ObserverSubject,
  type ObservationContribution,
  type EvidenceParticipant,
  type ObservationFactKey,
  type ExperienceManifest,
  type MemoryRecord,
  type SensoryFacet,
} from '@open-legend/domain';
import { entityHandle, permittedSourceHandle, subjectHandle } from './entity-references.js';

/** The native source tuple stays in the binding. Models receive the same permitted
 * meaning with opaque roles, never the private producer/exposure routing key.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding */
export function subjectForModel(world: WorldState, actorId: string, subject: ObserverSubject) {
  return { reference: subjectHandle(world, actorId, subject), label: subjectLabel(world, actorId, subject) };
}
const supportForModel = (world: WorldState, actorId: string, key: ObservationFactKey) => ({
  source: permittedSourceHandle(world, actorId, key.source), ordinal: key.ordinal,
});
function participantForModel(world: WorldState, actorId: string, participant: EvidenceParticipant) {
  switch (participant.kind) {
    case 'individual': return { kind: participant.kind, ...subjectForModel(world, actorId, participant.subject),
      ...(participant.association ? { association: supportForModel(world, actorId, participant.association) } : {}) };
    case 'exposure': return { kind: participant.kind,
      reference: permittedSourceHandle(world, actorId, ['exposure', participant.exposure]) };
    case 'described': return { ...participant };
  }
}
/** Only already-permitted event fields reach this adapter; definition IDs are literals. */
function eventFieldsForModel(world: WorldState, actorId: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map(entry => eventFieldsForModel(world, actorId, entry));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, field]) => [key,
    typeof field === 'string' && /^(entityId|actorId|targetId|sourceId|recipientId)$/.test(key)
      ? entityHandle(world, actorId, field) : eventFieldsForModel(world, actorId, field),
  ]));
}
function facetValueForModel(world: WorldState, actorId: string, value: SensoryFacet): unknown {
  switch (value.kind) {
    case 'association': return { kind: value.kind, strength: value.strength,
      subject: subjectForModel(world, actorId, value.subject) };
    case 'contact': return { kind: value.kind, detail: value.detail,
      reference: permittedSourceHandle(world, actorId, ['exposure', value.exposure]) };
    case 'claim': return { kind: value.kind, claim: value.claim,
      speaker: participantForModel(world, actorId, value.speaker), wordsAsHeard: value.wordsAsHeard,
      support: value.support.map(key => supportForModel(world, actorId, key)) };
    case 'event': return { kind: value.kind, eventType: value.eventType, text: value.text,
      data: eventFieldsForModel(world, actorId, value.data), references: value.references.map(ref => ({
        reference: permittedSourceHandle(world, actorId, ['historical-reference', value, ref.id]), label: ref.label, role: ref.role,
      })) };
    case 'confirmation': {
      const snapshot = value.snapshot;
      return { kind: value.kind, snapshot: {
        source: permittedSourceHandle(world, actorId, snapshot.original), ordinal: snapshot.originalOrdinal,
        confirmation: permittedSourceHandle(world, actorId, snapshot.confirmation),
        modality: snapshot.modality, value: facetValueForModel(world, actorId, snapshot.value),
        measuredFrom: snapshot.valueMeasuredFrom, measuredThrough: snapshot.valueMeasuredThrough,
        acquiredAt: snapshot.valueAcquiredAt,
        confirmedFrom: snapshot.confirmedFrom, confirmedThrough: snapshot.confirmedThrough,
      } };
    }
    // Physical feature vectors and intensity margins are native matching inputs.
    // The model gets acquired roles/associations, never a reusable fingerprint.
    case 'perceived-feature': return { kind: value.kind, modality: value.sample.modality };
    case 'sound': return { kind: value.kind, sound: { kind: value.sound.kind,
      direction: value.sound.direction, listenerPosition: value.sound.listenerPosition } };
    case 'pile-contents': return { kind: value.kind, items: value.items.map(item => ({
      ...item, id: entityHandle(world, actorId, item.id),
    })) };
    default: return eventFieldsForModel(world, actorId, value);
  }
}
export function observationForModel(world: WorldState, actorId: string, observation: ObservationContribution) {
  if (observation.observer.actorId !== actorId) throw new Error('Foreign personal observation.');
  return {
    source: permittedSourceHandle(world, actorId, ['native-exposure', observation.id, observation.revision]),
    acquiredAt: observation.acquiredAt, modality: observation.modality,
    temporalRole: 'historical',
    facets: observation.facets.map(facet => ({
      ordinal: facet.ordinal, role: facet.role, asOf: facet.asOf,
      measuredFrom: facet.measuredFrom, measuredThrough: facet.measuredThrough,
      acquiredAt: facet.acquiredAt, value: facetValueForModel(world, actorId, facet.value),
    })),
  };
}
export function experienceManifestForModel(world: WorldState, actorId: string, manifest: ExperienceManifest) {
  return {
    coverage: manifest.coverage.map(source => ({ kind: source.kind,
      reference: permittedSourceHandle(world, actorId, source) })),
    observations: manifest.observations.map(observation => observationForModel(world, actorId, observation)),
    speech: manifest.speech.map(group => ({
      sources: group.sources.map(source => permittedSourceHandle(world, actorId, source)),
      speaker: group.speaker, addressee: group.addressee, addressing: group.addressing,
      observerRelation: group.observerRelation, acquisition: group.acquisition,
      intelligibility: group.intelligibility, firstAt: group.firstAt, lastAt: group.lastAt,
      sourceCount: group.sourceCount,
      ...(group.sourceSubject ? { subject: subjectForModel(world, actorId, group.sourceSubject) } : {}),
    })),
  };
}
export function memoryMeaningForModel(world: WorldState, actorId: string, memory: MemoryRecord) {
  const evidence = memory.evidence;
  return {
    ...(evidence ? { experience: {
      eventType: evidence.eventType, text: evidence.text, content: evidence.content,
      modality: evidence.modality, speech: evidence.speech,
      ...(evidence.sourceId ? { source: entityHandle(world, actorId, evidence.sourceId) } : {}),
      ...(evidence.targetId ? { target: entityHandle(world, actorId, evidence.targetId) } : {}),
      ...(evidence.sourceSubject ? { subject: subjectForModel(world, actorId, evidence.sourceSubject) } : {}),
      data: eventFieldsForModel(world, actorId, evidence.eventData),
      references: evidence.references?.map(ref => ({ reference: entityHandle(world, actorId, ref.id), label: ref.label, role: ref.role })),

    } } : {}),
    ...(memory.observation ? { observation: observationForModel(world, actorId, memory.observation) } : {}),
    ...(memory.observations ? { observations: memory.observations.map(observation => observationForModel(world, actorId, observation)) } : {}),
    ...(memory.manifest ? { retained: experienceManifestForModel(world, actorId, memory.manifest) } : {}),
  };
}
