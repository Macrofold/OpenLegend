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
  type PerceivedSpeech,
  type PerceivedSound,
  soundExperience,
} from '@open-legend/domain';
import {
  entityHandle,
  permittedSourceHandle,
  subjectHandle,
  evidenceSourceHandle,
  personalSourceHandle,
  historicalAccountText,
} from './entity-references.js';
import {
  captureModelSpatialFrame,
  modelSpatialPoint,
  modelSpatialVector,
  modelObservedLocation,
  modelObservationFrame,
  type ModelSpatialFrame,
} from './perceived-context.js';

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
/** Only already-permitted event fields reach this adapter. Native physical routing
 * positions still need occurrence-scoped references; authored definition/recipe IDs
 * remain literal facts even when their spelling happens to match an entity ID. */
export function eventFieldsForModel(
  world: WorldState,
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
  world: WorldState,
  actorId: string,
  value: SensoryFacet,
  sourceScope: unknown,
  frame = captureModelSpatialFrame(world, actorId),
): unknown {
  switch (value.kind) {
    case 'body':
      return {
        kind: value.kind,
        body: {
          label: value.body.label,
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
        },
      };
    case 'public-attributes':
      return {
        kind: value.kind,
        attributes: value.attributes.map(
          ({ id, name, value, status, min, max, unit, critical }) => ({
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
        reference: permittedSourceHandle(world, actorId, ['exposure', value.exposure]),
      };
    case 'claim':
      return {
        kind: value.kind,
        claim: { ...value.claim, where: modelObservedLocation(frame, value.claim.where) },
        supportStatus: value.supportAliases?.some((alias) =>
          sourceForgotten(world, actorId, alias.id),
        )
          ? 'forgotten'
          : value.supportAliases?.some(
                (alias) => world.experience?.corrections?.[actorId]?.[alias.id],
              )
            ? 'disputed'
            : 'retained',
        speaker: participantForModel(world, actorId, value.speaker),
        wordsAsHeard: value.wordsAsHeard,
        support: value.support.map((key) => supportForModel(world, actorId, key)),
      };
    case 'event':
      return {
        kind: value.kind,
        eventType: value.eventType,
        text: value.eventType === 'speech' ? value.text : historicalAccountText(value.text),
        data: eventFieldsForModel(world, actorId, value.data, sourceScope),
        references: value.references.map((ref) => ({
          reference: permittedSourceHandle(world, actorId, [
            'historical-participant',
            sourceScope,
            ref.id,
          ]),
          label: ref.label,
          role: ref.role,
        })),
      };
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
    case 'confirmation':
      return {
        kind: value.kind,
        snapshot: currentFacetForModel(world, actorId, value.snapshot, frame),
      };
    case 'observed-motion':
      return {
        kind: value.kind,
        exposure: permittedSourceHandle(world, actorId, ['exposure', value.exposure]),
        earlier: currentFacetForModel(world, actorId, value.earlier, frame),
        later: currentFacetForModel(world, actorId, value.later, frame),
        correspondence: value.correspondence,
      };
    // Physical feature vectors and intensity margins are native matching inputs.
    // The model gets acquired roles/associations, never a reusable fingerprint.
    case 'perceived-feature':
      return { kind: value.kind, modality: value.sample.modality };
    case 'sound':
      return {
        kind: value.kind,
        sound: soundForModel(frame, value.sound, (id) =>
          permittedSourceHandle(world, actorId, ['historical-participant', sourceScope, id]),
        ),
      };
    case 'speech':
      return eventFieldsForModel(
        world,
        actorId,
        { kind: value.kind, speech: speechForModel(frame, value.speech) },
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
function sourceForgotten(world: WorldState, actorId: string, id: string): boolean {
  const values = world.experience?.forgotten[actorId];
  if (!values?.length) return false;
  let index = Object.isFrozen(values) ? forgottenIndexes.get(values) : undefined;
  if (!index) {
    index = new Set(values);
    if (Object.isFrozen(values)) forgottenIndexes.set(values, index);
  }
  return index.has(id);
}
function factSupportStatus(world: WorldState, actorId: string, id: string, ordinal: number) {
  const alias = personalFactAlias(id, ordinal);
  return sourceForgotten(world, actorId, alias)
    ? 'unavailable'
    : world.experience?.corrections?.[actorId]?.[alias]
      ? 'disputed'
      : 'retained';
}
export function currentFacetForModel(
  world: WorldState,
  actorId: string,
  snapshot: CapturedCurrentFacet,
  frame = captureModelSpatialFrame(world, actorId),
) {
  return {
    source: evidenceSourceHandle(world, actorId, {
      family: 'native-exposure',
      observer: snapshot.original.observer,
      id: snapshot.original.id,
      revision: snapshot.original.revision,
    }),
    ordinal: snapshot.originalOrdinal,
    supportStatus: factSupportStatus(
      world,
      actorId,
      snapshot.original.id,
      snapshot.originalOrdinal,
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
    value: facetValueForModel(world, actorId, snapshot.value, snapshot.original.id, frame),
    measuredFrom: snapshot.valueMeasuredFrom,
    measuredThrough: snapshot.valueMeasuredThrough,
    acquiredAt: snapshot.valueAcquiredAt,
    confirmedFrom: snapshot.confirmedFrom,
    confirmedThrough: snapshot.confirmedThrough,
  };
}
export function observationForModel(
  world: WorldState,
  actorId: string,
  observation: ObservationContribution,
  frame = captureModelSpatialFrame(world, actorId),
) {
  if (observation.observer.actorId !== actorId) throw new Error('Foreign personal observation.');
  const first = observation.facets[0];
  const defaults = first
    ? {
        role: first.role,
        asOf: first.asOf,
        measuredFrom: first.measuredFrom,
        measuredThrough: first.measuredThrough,
        acquiredAt: first.acquiredAt,
      }
    : undefined;
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
    facetDefaults: { ...defaults, supportStatus: 'retained' },
    facets: observation.facets.map((facet) => ({
      ordinal: facet.ordinal,
      ...(factSupportStatus(world, actorId, observation.id, facet.ordinal) !== 'retained'
        ? { supportStatus: factSupportStatus(world, actorId, observation.id, facet.ordinal) }
        : {}),
      ...Object.fromEntries(
        Object.entries({
          role: facet.role,
          asOf: facet.asOf,
          measuredFrom: facet.measuredFrom,
          measuredThrough: facet.measuredThrough,
          acquiredAt: facet.acquiredAt,
        }).filter(([key, value]) => !defaults || value !== defaults[key as keyof typeof defaults]),
      ),
      value: facetValueForModel(world, actorId, facet.value, observation.id, frame),
    })),
  };
}
function subjectRelationForModel(
  world: WorldState,
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
  world: WorldState,
  actorId: string,
  manifest: ExperienceManifest,
  frame = captureModelSpatialFrame(world, actorId),
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
    return {
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
    };
  const location = exposure.observedLocation;
  return {
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
  };
}
export function memoryMeaningForModel(world: WorldState, actorId: string, memory: MemoryRecord) {
  const frame = captureModelSpatialFrame(world, actorId);
  const evidence = memory.evidence;
  const historyHandle = (id: string) =>
    id === actorId
      ? entityHandle(world, actorId, actorId)
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
          experience: {
            eventType: evidence.eventType,
            ...(!evidence.speech ? { text: evidence.text, content: evidence.content } : {}),
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
          },
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
export function memoryForModel(world: WorldState, actorId: string, memory: MemoryRecord) {
  const source = permittedSourceHandle(world, actorId, ['experience', memory.id]);
  const participant = (id: string) =>
    id === actorId
      ? entityHandle(world, actorId, actorId)
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
    summary: memory.summary,
    entityIds: memory.entityIds.map(participant),
    ...(memory.speakerId ? { speakerId: participant(memory.speakerId) } : {}),
    ...(memory.eventType ? { eventType: memory.eventType } : {}),
    ...(memory.resolved !== undefined ? { resolved: memory.resolved } : {}),
    ...memoryMeaningForModel(world, actorId, memory),
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
