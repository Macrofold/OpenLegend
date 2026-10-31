import { nativeText } from '@open-legend/domain';
import {
  subjectLabel,
  personalFactAlias,
  sameSubject,
  type WorldState,
  type ObserverSubject,
  type ObservationContribution,
  type EvidenceParticipant,
  type ObservationFactKey,
  type ExperienceManifest,
  mindFor,
  type MemoryRecord,
  type SensoryFacet,
  type CapturedCurrentFacet,
  type CurrentBodyPoseSupport,
  type CurrentDescriptionSupport,
  type ReceivedLocationSample,
  type ReceivedFacetProof,
  type PerceivedSpeech,
  type PerceivedSound,
  soundExperience,
  selectedSubjectLabelReader,
} from '@open-legend/domain';
import {
  entityHandle,
  permittedSourceHandle,
  subjectHandle,
  evidenceSourceHandle,
  personalSourceHandle,
  historicalAccountText,
  receivedSubjectHandle,
} from './entity-references.js';
import {
  captureModelSpatialFrame,
  modelSpatialPoint,
  modelSpatialVector,
  modelObservedLocation,
  modelObservationFrame,
  type ModelSpatialFrame,
} from './perceived-context.js';

// Optional received details must be absent in both JSON text and structured Jev state.
// Strict provider serialization rejects a present field whose value is undefined.
const suppliedFields = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

/** Finite request-owned presentation. No resolver may close over an old world. */
export interface CapturedExperienceContext {
  readonly kind: 'captured-experience';
  readonly id: string;
  readonly actorId: string;
  readonly frame: ModelSpatialFrame;
  readonly ownerHandle: string;
  readonly subjectLabel: (subject: ObserverSubject) => string;
  readonly forgotten: ReadonlySet<string>;
  readonly corrected: ReadonlySet<string>;
}
export type ExperiencePresentation = WorldState | CapturedExperienceContext;

/** Visit the already admitted finite DTO, not the actor's entire identity/history catalogue. */
function presentationSubjects(values: readonly unknown[]): ObserverSubject[] {
  const subjects: ObserverSubject[] = [],
    seen = new WeakSet<object>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (
      'kind' in value &&
      value.kind === 'entity' &&
      'entityId' in value &&
      typeof value.entityId === 'string'
    )
      subjects.push({ kind: 'entity', entityId: value.entityId });
    else if (
      'kind' in value &&
      value.kind === 'individual' &&
      'individualId' in value &&
      typeof value.individualId === 'string'
    )
      subjects.push({ kind: 'individual', individualId: value.individualId });
    for (const child of Object.values(value)) visit(child);
  };
  for (const value of values) visit(value);
  return subjects;
}

export function captureExperienceContext(
  world: WorldState,
  actorId: string,
  frame = captureModelSpatialFrame(world, actorId),
  values: readonly unknown[] = [],
): CapturedExperienceContext {
  return {
    kind: 'captured-experience',
    id: world.id,
    actorId,
    frame,
    ownerHandle: entityHandle(world, actorId, actorId),
    subjectLabel: selectedSubjectLabelReader(world, actorId, [
      { kind: 'entity', entityId: actorId },
      ...presentationSubjects(values),
    ]),
    forgotten: new Set(world.experience?.forgotten[actorId] ?? []),
    corrected: new Set(Object.keys(world.experience?.corrections?.[actorId] ?? {})),
  };
}
export function capturedExperience(
  source: ExperiencePresentation,
): source is CapturedExperienceContext {
  return 'kind' in source && source.kind === 'captured-experience';
}
function evidenceFrame(source: ExperiencePresentation, actorId: string) {
  if (!capturedExperience(source)) return captureModelSpatialFrame(source, actorId);
  if (source.actorId !== actorId) throw new Error('Foreign captured experience.');
  return source.frame;
}
function evidenceOwnerHandle(source: ExperiencePresentation, actorId: string) {
  if (!capturedExperience(source)) return entityHandle(source, actorId, actorId);
  if (source.actorId !== actorId) throw new Error('Foreign captured experience.');
  return source.ownerHandle;
}
function sourceCorrected(source: ExperiencePresentation, actorId: string, id: string) {
  return capturedExperience(source)
    ? source.actorId !== actorId || source.corrected.has(id)
    : !!source.experience?.corrections?.[actorId]?.[id];
}

function soundForModel(
  frame: ModelSpatialFrame,
  sound: PerceivedSound,
  reference: (id: string) => string,
) {
  return {
    ...soundExperience(sound, reference),
    listenerPosition: modelSpatialPoint(frame, sound.listenerPosition),
    direction: sound.direction
      ? {
          ...modelSpatialVector(frame, {
            x: Math.cos((sound.direction.sector * Math.PI) / 4),
            y: 0,
            z: Math.sin((sound.direction.sector * Math.PI) / 4),
          }),
          elevation: sound.direction.elevation,
        }
      : null,
  };
}

function speechForModel(frame: ModelSpatialFrame, speech: PerceivedSpeech | undefined) {
  if (!speech) return undefined;
  return {
    ...speech,
    listenerPosition: modelSpatialPoint(frame, speech.listenerPosition),
    direction: speech.direction
      ? {
          ...modelSpatialVector(frame, {
            x: Math.cos((speech.direction.sector * Math.PI) / 4),
            y: 0,
            z: Math.sin((speech.direction.sector * Math.PI) / 4),
          }),
          elevation: speech.direction.elevation,
        }
      : null,
  };
}

/** The native source tuple stays in the binding. Models receive the same permitted
 * meaning with opaque roles, never the private producer/exposure routing key.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding */
export function subjectForModel(
  world: ExperiencePresentation,
  actorId: string,
  subject: ObserverSubject,
) {
  return {
    reference: subjectHandle(world, actorId, subject),
    label: capturedExperience(world)
      ? world.subjectLabel(subject)
      : subjectLabel(world, actorId, subject),
  };
}
const supportForModel = (
  world: ExperiencePresentation,
  actorId: string,
  key: ObservationFactKey,
) => ({
  source: evidenceSourceHandle(world, actorId, key.source),
  ordinal: key.ordinal,
});
function participantForModel(
  world: ExperiencePresentation,
  actorId: string,
  participant: EvidenceParticipant,
) {
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
        receivedSubject: receivedSubjectHandle(world, actorId, participant.exposure.episodeId),
      };
    case 'described':
      return { ...participant };
  }
}
/** Only already-permitted event fields reach this adapter. Native physical routing
 * positions still need occurrence-scoped references; authored definition/recipe IDs
 * remain literal facts even when their spelling happens to match an entity ID. */
export function eventFieldsForModel(
  world: ExperiencePresentation,
  actorId: string,
  value: unknown,
  sourceScope: unknown,
): unknown {
  if (Array.isArray(value))
    return value.map((entry) => eventFieldsForModel(world, actorId, entry, sourceScope));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      typeof field === 'string' &&
      /^(entityId|actorId|targetId|sourceId|recipientId|itemId|weaponItemId|ammoItemId|assemblyId|changedMaterialId|endingActorId|destinationId|contactSourceId)$/.test(
        key,
      )
        ? permittedSourceHandle(world, actorId, ['historical-participant', sourceScope, field])
        : eventFieldsForModel(world, actorId, field, sourceScope),
    ]),
  );
}
export function facetValueForModel(
  world: ExperiencePresentation,
  actorId: string,
  value: SensoryFacet,
  sourceScope: unknown,
  frame = evidenceFrame(world, actorId),
): unknown {
  switch (value.kind) {
    case 'description':
      return { kind: value.kind, text: value.text };
    case 'body':
      return {
        kind: value.kind,
        body: suppliedFields({
          label: suppliedFields({ ...value.body.label }),
          position: modelSpatialPoint(frame, value.body.position),
          facing: modelSpatialVector(frame, {
            x: Math.sin(value.body.heading),
            y: 0,
            z: Math.cos(value.body.heading),
          }),
          radius: value.body.radius,
          height: value.body.height,
          outward: value.body.outward,
          description: value.body.description,
          quantity: value.body.quantity,
          heatLit: value.body.heatLit,
          remainsPhase: value.body.remainsPhase,
          storage: value.body.storage ? { present: true } : undefined,
        }),
      };
    case 'public-attributes':
      return {
        kind: value.kind,
        attributes: value.attributes.map(({ id, name, value, status, min, max, unit, critical }) =>
          suppliedFields({
            id,
            name,
            value,
            status,
            min,
            max,
            unit,
            critical,
          }),
        ),
      };
    case 'surface-patch':
      return {
        kind: value.kind,
        patch: {
          ...value.patch,
          vertices: value.patch.vertices.map((point) => modelSpatialPoint(frame, point)),
          normal: modelSpatialVector(frame, value.patch.normal),
          frame: modelObservationFrame(frame, value.patch.frame),
        },
      };
    case 'location':
      return {
        kind: value.kind,
        location: modelObservedLocation(frame, value.location),
        frame: modelObservationFrame(frame, value.frame),
      };
    case 'physical-boundary':
      return {
        kind: value.kind,
        boundary: {
          ...value.boundary,
          a: modelSpatialPoint(frame, value.boundary.a),
          b: modelSpatialPoint(frame, value.boundary.b),
          nearSurface: {
            ...value.boundary.nearSurface,
            point: modelSpatialPoint(frame, value.boundary.nearSurface.point),
            normal: modelSpatialVector(frame, value.boundary.nearSurface.normal),
            support: supportForModel(world, actorId, value.boundary.nearSurface.support),
          },
          farSurface: {
            ...value.boundary.farSurface,
            point: modelSpatialPoint(frame, value.boundary.farSurface.point),
            normal: modelSpatialVector(frame, value.boundary.farSurface.normal),
            support: supportForModel(world, actorId, value.boundary.farSurface.support),
          },
        },
      };
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
        receivedSubject: receivedSubjectHandle(world, actorId, value.exposure.episodeId),
      };
    case 'claim':
      return {
        kind: value.kind,
        claim: { ...value.claim, where: modelObservedLocation(frame, value.claim.where) },
        supportStatus: value.supportAliases?.some((alias) =>
          sourceForgotten(world, actorId, alias.id),
        )
          ? 'forgotten'
          : value.supportAliases?.some((alias) => sourceCorrected(world, actorId, alias.id))
            ? 'disputed'
            : 'retained',
        speaker: participantForModel(world, actorId, value.speaker),
        wordsAsHeard: value.wordsAsHeard,
        support: value.support.map((key) => supportForModel(world, actorId, key)),
      };
    case 'event': {
      const participants = new Map(
        value.participants?.map(({ referenceOrdinal, participant }) => [
          referenceOrdinal,
          receivedSubjectHandle(world, actorId, participant.exposure.episodeId),
        ]),
      );
      return {
        kind: value.kind,
        eventType: value.eventType,
        text: value.eventType === 'speech' ? value.text : historicalAccountText(value.text),
        data: eventFieldsForModel(world, actorId, value.data, sourceScope),
        references: value.references.map((ref, ordinal) => ({
          reference: permittedSourceHandle(world, actorId, [
            'historical-participant',
            sourceScope,
            ref.id,
          ]),
          label: ref.label,
          role: ref.role,
          ...(participants.has(ordinal) ? { receivedSubject: participants.get(ordinal) } : {}),
        })),
      };
    }
    case 'encounter-exposure':
      return {
        kind: value.kind,
        exposure: exposureForModel(
          value.exposure,
          (id) =>
            permittedSourceHandle(world, actorId, ['historical-participant', sourceScope, id]),
          frame,
        ),
      };
    case 'observed-motion':
      return {
        kind: value.kind,
        receivedSubject: receivedSubjectHandle(world, actorId, value.exposure.episodeId),
        earlier: motionSampleForModel(world, actorId, value.earlier, frame),
        later: motionSampleForModel(world, actorId, value.later, frame),
        correspondence: value.correspondence,
      };
    // Physical feature vectors and intensity margins are native matching inputs.
    // The model gets acquired roles/associations, never a reusable fingerprint.
    case 'perceived-feature':
      return { kind: value.kind, modality: value.sample.modality };
    case 'sound':
      return {
        kind: value.kind,
        ...(value.source ? { source: participantForModel(world, actorId, value.source) } : {}),
        sound: soundForModel(frame, value.sound, (id) =>
          permittedSourceHandle(world, actorId, ['historical-participant', sourceScope, id]),
        ),
      };
    case 'speech':
      return eventFieldsForModel(
        world,
        actorId,
        {
          kind: value.kind,
          speech: speechForModel(frame, value.speech),
          ...(value.participants
            ? {
                participants: Object.fromEntries(
                  Object.entries(value.participants).flatMap(([role, participant]) =>
                    participant ? [[role, participantForModel(world, actorId, participant)]] : [],
                  ),
                ),
              }
            : {}),
        },
        sourceScope,
      );
    case 'pile-contents':
      return {
        kind: value.kind,
        items: value.items.map((item) => ({
          ...item,
          id: permittedSourceHandle(world, actorId, [
            'historical-participant',
            sourceScope,
            item.id,
          ]),
        })),
      };
    default:
      return eventFieldsForModel(world, actorId, value, sourceScope);
  }
}
const forgottenIndexes = new WeakMap<readonly string[], ReadonlySet<string>>();
function sourceForgotten(world: ExperiencePresentation, actorId: string, id: string): boolean {
  if (capturedExperience(world)) return world.actorId !== actorId || world.forgotten.has(id);
  const values = world.experience?.forgotten[actorId];
  if (!values?.length) return false;
  let index = Object.isFrozen(values) ? forgottenIndexes.get(values) : undefined;
  if (!index) {
    index = new Set(values);
    if (Object.isFrozen(values)) forgottenIndexes.set(values, index);
  }
  return index.has(id);
}
function factSupportStatus(
  world: ExperiencePresentation,
  actorId: string,
  id: string,
  ordinal: number,
) {
  const alias = personalFactAlias(id, ordinal);
  return sourceForgotten(world, actorId, alias)
    ? 'unavailable'
    : sourceCorrected(world, actorId, alias)
      ? 'disputed'
      : 'retained';
}
function motionSampleForModel(
  world: ExperiencePresentation,
  actorId: string,
  sample: ReceivedLocationSample,
  frame: ModelSpatialFrame,
) {
  return {
    source: evidenceSourceHandle(world, actorId, sample.original.source),
    ordinal: sample.original.ordinal,
    confirmation: evidenceSourceHandle(world, actorId, sample.confirmation),
    location: modelObservedLocation(frame, sample.location),
    ...modelObservationFrame(frame, sample.frame),
    measuredFrom: sample.measuredFrom,
    measuredThrough: sample.measuredThrough,
    acquiredAt: sample.acquiredAt,
    confirmedFrom: sample.confirmedFrom,
    confirmedThrough: sample.confirmedThrough,
  };
}
export function bodyPoseSupportForModel(
  world: ExperiencePresentation,
  actorId: string,
  support: CurrentBodyPoseSupport,
  frame: ModelSpatialFrame,
  decorate: (value: object, frame: unknown) => object = (value, frame) => ({ ...value, frame }),
) {
  return decorate(
    {
      proof: facetSupportForModel(world, actorId, support),
      measuredFrom: support.poseMeasuredFrom,
      measuredThrough: support.poseMeasuredThrough,
      acquiredAt: support.poseAcquiredAt,
    },
    modelObservationFrame(frame, support.frame),
  );
}
export function bodyDescriptionSupportForModel(
  world: ExperiencePresentation,
  actorId: string,
  support: CurrentDescriptionSupport,
) {
  return {
    proof: facetSupportForModel(world, actorId, support),
    measuredFrom: support.descriptionMeasuredFrom,
    measuredThrough: support.descriptionMeasuredThrough,
    acquiredAt: support.descriptionAcquiredAt,
  };
}

export function currentFacetForModel(
  world: ExperiencePresentation,
  actorId: string,
  snapshot: CapturedCurrentFacet,
  frame = evidenceFrame(world, actorId),
) {
  return {
    source: evidenceSourceHandle(world, actorId, snapshot.original.source),
    ordinal: snapshot.original.ordinal,
    supportStatus: factSupportStatus(
      world,
      actorId,
      snapshot.original.source.id,
      snapshot.original.ordinal,
    ),
    confirmation: evidenceSourceHandle(world, actorId, snapshot.confirmation),
    modality: snapshot.modality,
    ...(snapshot.localSubject
      ? {
          bodyLocalSubject: {
            ...subjectForModel(world, actorId, snapshot.localSubject),
            temporalRole: 'historical',
            currentBody: false,
          },
        }
      : {}),
    value: facetValueForModel(world, actorId, snapshot.value, snapshot.original.source.id, frame),
    ...(snapshot.poseSupport
      ? { positionSupport: bodyPoseSupportForModel(world, actorId, snapshot.poseSupport, frame) }
      : {}),
    ...(snapshot.descriptionSupport
      ? {
          descriptionSupport: bodyDescriptionSupportForModel(
            world,
            actorId,
            snapshot.descriptionSupport,
          ),
        }
      : {}),
    measuredFrom: snapshot.valueMeasuredFrom,
    measuredThrough: snapshot.valueMeasuredThrough,
    acquiredAt: snapshot.valueAcquiredAt,
    confirmedFrom: snapshot.confirmedFrom,
    confirmedThrough: snapshot.confirmedThrough,
  };
}

/** These defaults encode equal metadata, never a normalized time or inferred
 * continuity. A differing or absent optional confirmation stays facet-local. */
export function facetSupportForModel(
  world: ExperiencePresentation,
  actorId: string,
  support: ReceivedFacetProof,
) {
  return {
    original: supportForModel(world, actorId, support.original),
    confirmation: evidenceSourceHandle(world, actorId, support.confirmation),
    confirmedFrom: support.confirmedFrom,
    confirmedThrough: support.confirmedThrough,
    supportStatus: factSupportStatus(
      world,
      actorId,
      support.original.source.id,
      support.original.ordinal,
    ),
  };
}
export function modelFacetMetadata(
  facets: readonly {
    role: string;
    asOf: number;
    measuredFrom: number;
    measuredThrough: number;
    acquiredAt: number;
    confirmedThrough?: number;
    support?: ReceivedFacetProof;
  }[],
) {
  const keys = [
    'role',
    'asOf',
    'measuredFrom',
    'measuredThrough',
    'acquiredAt',
    'confirmedThrough',
  ] as const;
  const defaults: Record<string, string | number> = {};
  for (const key of keys) {
    const value = facets[0]?.[key];
    if (value !== undefined && facets.every((facet) => facet[key] === value)) defaults[key] = value;
  }
  return {
    defaults,
    overrides: facets.map((facet) =>
      Object.fromEntries(
        keys.flatMap((key) =>
          facet[key] !== undefined && facet[key] !== defaults[key] ? [[key, facet[key]]] : [],
        ),
      ),
    ),
  };
}
export function observationForModel(
  world: ExperiencePresentation,
  actorId: string,
  observation: ObservationContribution,
  frame = evidenceFrame(world, actorId),
) {
  if (observation.observer.actorId !== actorId) throw new Error('Foreign personal observation.');
  const metadata = modelFacetMetadata(observation.facets);
  return {
    source: evidenceSourceHandle(world, actorId, {
      family: 'native-exposure',
      observer: observation.observer,
      id: observation.id,
      revision: observation.revision,
    }),
    acquiredAt: observation.acquiredAt,
    modality: observation.modality,
    temporalRole: 'historical',
    timeUnit: 'simulation-seconds',
    // Equal metadata is encoded once; each facet inherits these exact values.
    // Overrides retain independent times/roles rather than normalizing them away.
    facetDefaults: { ...metadata.defaults, supportStatus: 'retained' },
    facets: observation.facets.map((facet, index) => ({
      ordinal: facet.ordinal,
      ...(factSupportStatus(world, actorId, observation.id, facet.ordinal) !== 'retained'
        ? { supportStatus: factSupportStatus(world, actorId, observation.id, facet.ordinal) }
        : {}),
      ...metadata.overrides[index],
      ...(facet.support ? { support: facetSupportForModel(world, actorId, facet.support) } : {}),
      value: facetValueForModel(world, actorId, facet.value, observation.id, frame),
    })),
  };
}
function subjectRelationForModel(
  world: ExperiencePresentation,
  actorId: string,
  subject: ObserverSubject,
  observations: readonly ObservationContribution[],
) {
  const supports = observations.flatMap((observation) =>
    observation.facets.flatMap((facet) =>
      facet.value.kind === 'association' && sameSubject(facet.value.subject, subject)
        ? [
            {
              ...supportForModel(world, actorId, {
                source: {
                  family: 'native-exposure',
                  observer: observation.observer,
                  id: observation.id,
                  revision: observation.revision,
                },
                ordinal: facet.ordinal,
              }),
              status: factSupportStatus(world, actorId, observation.id, facet.ordinal),
            },
          ]
        : [],
    ),
  );
  return {
    ...subjectForModel(world, actorId, subject),
    temporalRole: 'historical',
    currentBody: false,
    supportStatus: !supports.length
      ? 'not-supplied'
      : supports.every((support) => support.status === 'retained')
        ? 'retained'
        : supports.every((support) => support.status === 'unavailable')
          ? 'unavailable'
          : supports.every((support) => support.status === 'disputed')
            ? 'disputed'
            : 'mixed',
    support: supports,
  };
}
export function experienceManifestForModel(
  world: ExperiencePresentation,
  actorId: string,
  manifest: ExperienceManifest,
  frame = evidenceFrame(world, actorId),
) {
  return {
    coverage: manifest.coverage.map((source) => ({
      kind: source.kind,
      reference: personalSourceHandle(world, actorId, source),
    })),
    observations: manifest.observations.map((observation) =>
      observationForModel(world, actorId, observation, frame),
    ),
    speech: manifest.speech.map((group) => ({
      sources: group.sources.map((source) => personalSourceHandle(world, actorId, source)),
      utterances: group.utterances.map((utterance) => ({
        source: personalSourceHandle(world, actorId, utterance.source),
        at: utterance.at,
        speech: speechForModel(frame, utterance.speech),
      })),
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
        ? {
            subject: subjectRelationForModel(
              world,
              actorId,
              group.sourceSubject,
              manifest.observations,
            ),
          }
        : {}),
    })),
  };
}
function exposureForModel(
  exposure: NonNullable<MemoryRecord['evidence']>['exposure'],
  reference: (id: string) => string,
  frame: ModelSpatialFrame,
) {
  if (!exposure) return undefined;
  if (exposure.kind === 'place')
    return suppliedFields({
      kind: exposure.kind,
      reference: reference(exposure.id),
      revision: exposure.revision,
      label: exposure.label,
      description: exposure.description,
      point: modelSpatialPoint(frame, exposure.point),
      locationLabel: exposure.locationLabel,
      landmarkReference: reference(exposure.landmarkId),
      mechanismFields: exposure.mechanismFields,
      ...(exposure.reportedBy ? { reportedBy: reference(exposure.reportedBy) } : {}),
    });
  const location = exposure.observedLocation;
  return suppliedFields({
    kind: exposure.kind,
    reference: reference(exposure.id),
    definition: exposure.definition,
    label: exposure.label,
    description: exposure.description,
    introduction: reference(exposure.introductionKey),
    inscription: exposure.inscription,
    mechanismFields: exposure.mechanismFields,
    observedLocation:
      location?.kind === 'world'
        ? {
            ...location,
            point: modelSpatialPoint(frame, location.point),
            containerId: reference(location.containerId),
          }
        : location,
  });
}
export function memoryMeaningForModel(
  world: ExperiencePresentation,
  actorId: string,
  memory: MemoryRecord,
  frame = evidenceFrame(world, actorId),
) {
  const evidence = memory.evidence;
  const historyHandle = (id: string) =>
    id === actorId
      ? evidenceOwnerHandle(world, actorId)
      : permittedSourceHandle(world, actorId, [
          'historical-participant',
          memory.observation?.id ?? memory.id,
          id,
        ]);
  const nativeSpeech =
    evidence?.speech &&
    memory.observation?.facets.find(
      (facet) =>
        facet.value.kind === 'speech' &&
        JSON.stringify(facet.value.speech) === JSON.stringify(evidence.speech),
    );
  const nativeExposure =
    evidence?.exposure &&
    memory.observation?.facets.find(
      (facet) =>
        facet.value.kind === 'encounter-exposure' &&
        JSON.stringify(facet.value.exposure) === JSON.stringify(evidence.exposure),
    );
  return {
    temporalRole: 'historical',
    ...(memory.impression
      ? {
          rememberedImpression: {
            precision: 'reduced',
            epistemicStatus: 'fallible-recollection',
            from: memory.impression.from,
            through: memory.impression.through,
            weakened: memory.impression.weakened,
            claims: memory.impression.claims.map((claim) =>
              claim.kind === 'occurrence'
                ? {
                    ...claim,
                    ...(claim.subject
                      ? { subject: subjectForModel(world, actorId, claim.subject) }
                      : {}),
                  }
                : claim,
            ),
          },
        }
      : {}),
    ...(evidence
      ? {
          experience: suppliedFields({
            eventType: evidence.eventType,
            ...(!evidence.speech
              ? {
                  text: nativeText(evidence.text),
                  ...(evidence.content !== undefined
                    ? { content: nativeText(evidence.content) }
                    : {}),
                }
              : {}),
            modality: evidence.modality,
            ...(evidence.sound
              ? { sound: soundForModel(frame, evidence.sound, historyHandle) }
              : {}),
            ...(nativeSpeech
              ? { speechFacet: nativeSpeech.ordinal }
              : { speech: speechForModel(frame, evidence.speech) }),
            ...(evidence.sourceId ? { source: historyHandle(evidence.sourceId) } : {}),
            ...(evidence.targetId ? { target: historyHandle(evidence.targetId) } : {}),
            ...(evidence.sourceSubject
              ? {
                  subject: subjectRelationForModel(world, actorId, evidence.sourceSubject, [
                    ...(memory.observation ? [memory.observation] : []),
                    ...(memory.observations ?? []),
                  ]),
                }
              : {}),
            data: eventFieldsForModel(
              world,
              actorId,
              evidence.eventData,
              memory.observation?.id ?? memory.id,
            ),
            ...(evidence.exposure
              ? nativeExposure
                ? { exposureFacet: nativeExposure.ordinal }
                : { exposure: exposureForModel(evidence.exposure, historyHandle, frame) }
              : {}),
            references: evidence.references?.map((ref) => ({
              reference: historyHandle(ref.id),
              label: ref.label,
              role: ref.role,
            })),
          }),
        }
      : {}),
    ...(memory.observation
      ? { observation: observationForModel(world, actorId, memory.observation, frame) }
      : {}),
    ...(memory.observations
      ? {
          observations: memory.observations.map((observation) =>
            observationForModel(world, actorId, observation, frame),
          ),
        }
      : {}),
    ...(memory.manifest
      ? { retained: experienceManifestForModel(world, actorId, memory.manifest, frame) }
      : {}),
  };
}

/** A remembered occurrence keeps its own participant references. A later sighting
 * cannot turn an old unknown participant into today's body by native ID equality. */
export function memoryForModel(
  world: ExperiencePresentation,
  actorId: string,
  memory: MemoryRecord,
  frame = evidenceFrame(world, actorId),
) {
  const source = permittedSourceHandle(world, actorId, ['experience', memory.id]);
  const participant = (id: string) =>
    id === actorId
      ? evidenceOwnerHandle(world, actorId)
      : permittedSourceHandle(world, actorId, [
          'historical-participant',
          memory.observation?.id ?? memory.id,
          id,
        ]);
  return {
    id: source,
    at: memory.at,
    kind: memory.kind,
    source: memory.source,
    // Canonical routing annotations in old prose are not retained recognition.
    // Participant IDs below keep their own source scope after a stranger returns.
    summary: historicalAccountText(memory.summary),
    entityIds: memory.entityIds.map(participant),
    ...(memory.speakerId ? { speakerId: participant(memory.speakerId) } : {}),
    ...(memory.eventType ? { eventType: memory.eventType } : {}),
    ...(memory.resolved !== undefined ? { resolved: memory.resolved } : {}),
    ...memoryMeaningForModel(world, actorId, memory, frame),
  };
}

/** Accepted prose is private to its author. Its structured subject and evidence
 * references are still scoped before another reasoning request receives them. */
export function acceptedMindForModel(world: WorldState, actorId: string) {
  const mind = mindFor(world, actorId);
  const evidence = (links: (typeof mind.documents)[number]['evidence']) =>
    links.map((link) => ({
      ...link,
      id: permittedSourceHandle(world, actorId, ['experience', link.id]),
    }));
  return {
    revision: mind.revision,
    documents: mind.documents.map((document) => ({
      ...document,
      evidence: evidence(document.evidence),
    })),
    records: mind.records.map((record) => ({
      ...record,
      subjectId: record.subjectId ? subjectHandle(world, actorId, record.subjectId) : null,
      ...(record.subjectId ? { subject: subjectForModel(world, actorId, record.subjectId) } : {}),
      evidence: evidence(record.evidence),
    })),
  };
}
