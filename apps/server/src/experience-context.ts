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
  type CapturedCurrentFacet,
} from '@open-legend/domain';
import { entityHandle, permittedSourceHandle, subjectHandle, evidenceSourceHandle } from './entity-references.js';

/** The native source tuple stays in the binding. Models receive the same permitted
 * meaning with opaque roles, never the private producer/exposure routing key.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding */
export function subjectForModel(world: WorldState, actorId: string, subject: ObserverSubject) {
  return {
    reference: subjectHandle(world, actorId, subject),
    label: subjectLabel(world, actorId, subject),
  };
}
const supportForModel = (world: WorldState, actorId: string, key: ObservationFactKey) => ({
  source: evidenceSourceHandle(world, actorId, key.source),
  ordinal: key.ordinal,
});
function participantForModel(world: WorldState, actorId: string, participant: EvidenceParticipant) {
  switch (participant.kind) {
    case 'individual':
      return {
        kind: participant.kind,
        ...subjectForModel(world, actorId, participant.subject),
        ...(participant.association
          ? { association: supportForModel(world, actorId, participant.association) }
          : {}),
      };
    case 'exposure':
      return {
        kind: participant.kind,
        reference: permittedSourceHandle(world, actorId, ['exposure', participant.exposure]),
      };
    case 'described':
      return { ...participant };
  }
}
/** Only already-permitted event fields reach this adapter; definition IDs are literals. */
function eventFieldsForModel(world: WorldState, actorId: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => eventFieldsForModel(world, actorId, entry));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      typeof field === 'string' && /^(entityId|actorId|targetId|sourceId|recipientId)$/.test(key)
        ? entityHandle(world, actorId, field)
        : eventFieldsForModel(world, actorId, field),
    ]),
  );
}
function facetValueForModel(world: WorldState, actorId: string, value: SensoryFacet): unknown {
  switch (value.kind) {
    case 'association':
      return {
        kind: value.kind,
        strength: value.strength,
        subject: subjectForModel(world, actorId, value.subject),
      };
    case 'contact':
      return {
        kind: value.kind,
        detail: value.detail,
        reference: permittedSourceHandle(world, actorId, ['exposure', value.exposure]),
      };
    case 'claim':
      return {
        kind: value.kind,
        claim: value.claim,
        supportStatus: value.supportAliases?.some(alias=>world.experience?.forgotten[actorId]?.includes(alias.id)) ? 'forgotten' : value.supportAliases?.some(alias=>world.experience?.corrections?.[actorId]?.[alias.id]) ? 'disputed' : 'retained',
      speaker: participantForModel(world, actorId, value.speaker),
        wordsAsHeard: value.wordsAsHeard,
        support: value.support.map((key) => supportForModel(world, actorId, key)),
      };
    case 'event':
      return {
        kind: value.kind,
        eventType: value.eventType,
        text: value.text,
        data: eventFieldsForModel(world, actorId, value.data),
        references: value.references.map((ref) => ({
          reference: permittedSourceHandle(world, actorId, ['historical-reference', value, ref.id]),
          label: ref.label,
          role: ref.role,
        })),
      };
    case 'confirmation': return {kind:value.kind,snapshot:currentFacetForModel(world,actorId,value.snapshot)};
    case 'observed-motion': return {kind:value.kind,
      exposure:permittedSourceHandle(world,actorId,['exposure',value.exposure]),
      earlier:currentFacetForModel(world,actorId,value.earlier),
      later:currentFacetForModel(world,actorId,value.later),correspondence:value.correspondence};
    // Physical feature vectors and intensity margins are native matching inputs.
    // The model gets acquired roles/associations, never a reusable fingerprint.
    case 'perceived-feature':
      return { kind: value.kind, modality: value.sample.modality };
    case 'sound':
      return {
        kind: value.kind,
        sound: {
          kind: value.sound.kind,
          direction: value.sound.direction,
          listenerPosition: value.sound.listenerPosition,
        },
      };
    case 'pile-contents':
      return {
        kind: value.kind,
        items: value.items.map((item) => ({
          ...item,
          id: entityHandle(world, actorId, item.id),
        })),
      };
    default:
      return eventFieldsForModel(world, actorId, value);
  }
}
function currentFacetForModel(world:WorldState,actorId:string,snapshot:CapturedCurrentFacet) {
  return {source:evidenceSourceHandle(world,actorId,{family:'native-exposure',observer:snapshot.original.observer,id:snapshot.original.id,revision:snapshot.original.revision}),
    ordinal:snapshot.originalOrdinal,confirmation:evidenceSourceHandle(world,actorId,snapshot.confirmation),
    modality:snapshot.modality,value:facetValueForModel(world,actorId,snapshot.value),
    measuredFrom:snapshot.valueMeasuredFrom,measuredThrough:snapshot.valueMeasuredThrough,
    acquiredAt:snapshot.valueAcquiredAt,confirmedFrom:snapshot.confirmedFrom,confirmedThrough:snapshot.confirmedThrough};
}
export function observationForModel(
  world: WorldState,
  actorId: string,
  observation: ObservationContribution,
) {
  if (observation.observer.actorId !== actorId) throw new Error('Foreign personal observation.');
  const first = observation.facets[0];
  const defaults = first ? {role:first.role,asOf:first.asOf,measuredFrom:first.measuredFrom,
    measuredThrough:first.measuredThrough,acquiredAt:first.acquiredAt} : undefined;
  return {
    source: evidenceSourceHandle(world, actorId, {family:'native-exposure',observer:observation.observer,id:observation.id,revision:observation.revision}),
    acquiredAt: observation.acquiredAt, modality: observation.modality,
    temporalRole: 'historical', timeUnit: 'simulation-seconds',
    // Equal metadata is encoded once; each facet inherits these exact values.
    // Overrides retain independent times/roles rather than normalizing them away.
    facetDefaults: defaults,
    facets: observation.facets.map(facet => ({
      ordinal:facet.ordinal,
      ...Object.fromEntries(Object.entries({role:facet.role,asOf:facet.asOf,
        measuredFrom:facet.measuredFrom,measuredThrough:facet.measuredThrough,acquiredAt:facet.acquiredAt})
        .filter(([key,value])=>!defaults || value!==defaults[key as keyof typeof defaults])),
      value:facetValueForModel(world,actorId,facet.value),
    })),
  };
}
export function experienceManifestForModel(
  world: WorldState,
  actorId: string,
  manifest: ExperienceManifest,
) {
  return {
    coverage: manifest.coverage.map((source) => ({
      kind: source.kind,
      reference: permittedSourceHandle(world, actorId, source),
    })),
    observations: manifest.observations.map((observation) =>
      observationForModel(world, actorId, observation),
    ),
    speech: manifest.speech.map((group) => ({
      sources: group.sources.map((source) => permittedSourceHandle(world, actorId, source)),
      speaker: group.speaker,
      addressee: group.addressee,
      addressing: group.addressing,
      observerRelation: group.observerRelation,
      acquisition: group.acquisition,
      intelligibility: group.intelligibility,
      firstAt: group.firstAt,
      lastAt: group.lastAt,
      sourceCount: group.sourceCount,
      ...(group.sourceSubject
        ? { subject: subjectForModel(world, actorId, group.sourceSubject) }
        : {}),
    })),
  };
}
export function memoryMeaningForModel(world: WorldState, actorId: string, memory: MemoryRecord) {
  const evidence = memory.evidence;
  const historyHandle=(id:string)=>permittedSourceHandle(world,actorId,['historical-participant',memory.id,id]);
  const nativeSpeech = evidence?.speech && memory.observation?.facets.find(facet=>
    facet.value.kind==='speech' && JSON.stringify(facet.value.speech)===JSON.stringify(evidence.speech));
  return {
    ...(evidence
      ? {
          experience: {
            eventType: evidence.eventType,
            ...(!evidence.speech ? {text:evidence.text,content:evidence.content} : {}),
            modality: evidence.modality,
            ...(nativeSpeech ? {speechFacet:nativeSpeech.ordinal} : {speech:evidence.speech}),
            ...(evidence.sourceId
              ? { source: historyHandle(evidence.sourceId) }
              : {}),
            ...(evidence.targetId
              ? { target: historyHandle(evidence.targetId) }
              : {}),
            ...(evidence.sourceSubject
              ? { subject: subjectForModel(world, actorId, evidence.sourceSubject) }
              : {}),
            data: eventFieldsForModel(world, actorId, evidence.eventData),
            references: evidence.references?.map((ref) => ({
              reference: historyHandle(ref.id),
              label: ref.label,
              role: ref.role,
            })),
          },
        }
      : {}),
    ...(memory.observation
      ? { observation: observationForModel(world, actorId, memory.observation) }
      : {}),
    ...(memory.observations
      ? {
          observations: memory.observations.map((observation) =>
            observationForModel(world, actorId, observation),
          ),
        }
      : {}),
    ...(memory.manifest
      ? { retained: experienceManifestForModel(world, actorId, memory.manifest) }
      : {}),
  };
}
