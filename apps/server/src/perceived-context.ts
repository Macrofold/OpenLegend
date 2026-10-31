import { assemblyPhaseLabel } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import {
  worldPosition,
  observedBodyHealth,
  fireFuelDescription,
  BASE_GUARD_TEXT,
  BASE_RANGED_TEXT,
  BASE_EVASION_TEXT,
  observedCombatActivity,
  speechPresentation,
  speechPerspective,
  perceivedEventType,
  soundExperience,
  type ExperienceEntry,
  type NarrationPerspective,
  type ExperienceSourceReference,
  validExperienceSummary,
  canonicalJson,
  type AppraisalEvidence,
  type Awareness,
} from '@open-legend/domain';
import { entityLabel, experienceEntityReferences } from './entity-references.js';
import type { Action, Entity, ItemDefinition, ItemInstance, WorldState } from '@open-legend/domain';
import type { AttentionCandidate } from './recall.js';
import { digest } from './content-digest.js';

export interface ExperienceModelBindings {
  /** Request-local source handle; its exact key/revision stays with the caller. */
  source: string;
  ownerId: string;
  perspective: NarrationPerspective;
  entities: ReadonlyMap<string, string>;
  sourceReferences: ReadonlyMap<string, string>;
}

/** Request-owned references into the complete character.experience array. The
 * private source key/revision is checked before replacing a duplicate payload. */
export interface SharedModelExperience {
  index: number;
  revision: string;
  experience: ReturnType<typeof experienceForModel>;
  /** Captured native metadata, independent of the readable occurrence shape. */
  acquisition: AppraisalEvidence['coverage'];
  subjectIds: readonly string[];
  occurrence: { id: string; sequence: number } | null;
}

export interface ModelEvidenceSource {
  /** Complete source kind/identity inside the caller's captured actor/view scope. */
  key: string;
  revision: string;
  experience: SharedModelExperience['experience'];
  acquisition: SharedModelExperience['acquisition'];
  subjectIds: readonly string[];
  occurrence: SharedModelExperience['occurrence'];
}

export function modelEvidenceSource(
  entry: ExperienceEntry,
  revision: string,
  experience: ModelEvidenceSource['experience'],
): Omit<ModelEvidenceSource, 'key'> {
  return {
    revision,
    experience,
    acquisition:
      entry.source === 'awareness'
        ? entry.value.modality
        : entry.source === 'memory'
          ? entry.value.source
          : 'inferred',
    subjectIds: [...entry.value.entityIds],
    occurrence:
      entry.source === 'awareness'
        ? { id: entry.value.eventId, sequence: entry.value.sequence }
        : null,
  };
}

/** One complete account per exact occurrence. This does not join similar text or
 * alias a summary to its covered original events. The caller retains source guards.
 * docs/technical/situation-aware-cognition-context.md#one-complete-evidence-occurrence */
export function assembleModelEvidence(entries: Iterable<ModelEvidenceSource>) {
  const experience: SharedModelExperience['experience'][] = [];
  const sources = new Map<string, SharedModelExperience>();
  for (const entry of entries) {
    const previous = sources.get(entry.key);
    if (previous) {
      if (
        previous.revision !== entry.revision ||
        previous.experience.owner !== entry.experience.owner ||
        previous.experience.source !== entry.experience.source ||
        canonicalJson({ ...previous.experience, handle: null }) !==
          canonicalJson({ ...entry.experience, handle: null }) ||
        previous.acquisition !== entry.acquisition ||
        canonicalJson(previous.subjectIds) !== canonicalJson(entry.subjectIds)
      )
        throw new Error('Selected evidence has conflicting source versions or perspectives.');
      continue;
    }
    const index = experience.length;
    experience.push(entry.experience);
    const { key: _key, ...source } = entry;
    sources.set(entry.key, { index, ...source });
  }
  return { experience, sources };
}

export const modelEvidenceReference = (index: number): string => `character.experience[${index}]`;

/** Shared meaning for every existing reader of the typed occurrence view. */
export const MODEL_EXPERIENCE_MEANING = `An experience.owner is the experiencer, not necessarily who acted. In speech awareness, sourceId is the acquired speaker and targetId the acquired addressee; speech participant labels are from that occurrence. Read exact heard words once in speech.segments; an unintelligible segment is a gap, and seen-only speech supplies no words. Quoted "I" and "you" belong to that speaker and addressee. Speech establishes what was said, not that its claimed event or announced action occurred. Other eventData keeps its native role names. Acquisition, chronology, uncertainty, summary coverage and observed versus inferred accounts retain their supplied meaning.`;

/** Derived older coverage precedes literal turns; the conversation owner uses
 * native occurrence sequence and exact ID ties, never rendered time or wording. */
export function chronologicalModelSources(sources: readonly ModelEvidenceSource[]) {
  return [...sources].sort((a, b) =>
    a.occurrence && b.occurrence
      ? a.occurrence.sequence - b.occurrence.sequence ||
        a.occurrence.id.localeCompare(b.occurrence.id)
      : a.occurrence
        ? 1
        : b.occurrence
          ? -1
          : 0,
  );
}

export function candidateModelSources(
  candidates: readonly AttentionCandidate[],
  revisions?: ReadonlyMap<string, string>,
): ModelEvidenceSource[] {
  return candidates.flatMap((candidate) => {
    if (candidate.experience?.length && !candidate.modelSources?.length)
      throw new Error('A complete personal experience has no exact source binding.');
    return (candidate.modelSources ?? []).map((source) => ({
      ...source,
      revision: revisions?.get(source.key) ?? source.revision,
    }));
  });
}

// Only typed reference fields are rewritten. Literal notes, labels and quotations
// are never scanned for ID-looking words. Definition IDs identify content, not people.
const eventEntityFields = new Set([
  'actorId',
  'targetId',
  'sourceId',
  'subjectId',
  'contactSourceId',
  'itemId',
  'weaponItemId',
  'assemblyId',
  'changedMaterialId',
  'endingActorId',
  'destinationId',
  'containerId',
  'recipientId',
  'giverId',
  'receiverId',
]);
const eventAuthorityFields = new Set([
  'responseId',
  'requestId',
  'commandId',
  'jobId',
  'utteranceId',
  'contactSourceLife',
  'sourceLife',
  'targetLife',
  'physicalLife',
]);

export function experienceEntityIds(entry: ExperienceEntry, ownerId: string): Set<string> {
  const ids = new Set([ownerId, ...entry.value.entityIds]);
  if (entry.source === 'awareness') {
    const value = entry.value;
    for (const id of [value.sourceId, value.targetId]) if (id) ids.add(id);
    for (const reference of value.references ?? []) ids.add(reference.id);
    for (const [key, field] of Object.entries(value.eventData ?? {}))
      if (eventEntityFields.has(key) && typeof field === 'string') ids.add(field);
    const exposure = value.exposure;
    if (exposure) {
      if (exposure.kind === 'place') {
        ids.add(exposure.landmarkId);
        if (exposure.reportedBy) ids.add(exposure.reportedBy);
      } else {
        ids.add(exposure.id);
        if (exposure.observedLocation?.kind === 'world')
          ids.add(exposure.observedLocation.containerId);
      }
    }
  } else if (entry.source === 'memory') {
    if (entry.value.speakerId) ids.add(entry.value.speakerId);
    if (entry.value.obligation?.completion?.targetId)
      ids.add(entry.value.obligation.completion.targetId);
  } else {
    for (const group of entry.value.attribution.groups) {
      if (group.speakerId) ids.add(group.speakerId);
      if (group.targetId) ids.add(group.targetId);
    }
  }
  return ids;
}

export function experienceModelBindings(
  world: WorldState,
  ownerId: string,
  entry: ExperienceEntry,
  source: string,
): ExperienceModelBindings {
  return {
    source,
    ownerId,
    perspective:
      entry.source === 'awareness'
        ? speechPerspective(entry.value)
        : { selfId: ownerId, names: new Map() },
    entities: experienceEntityReferences(world, ownerId, experienceEntityIds(entry, ownerId)),
    sourceReferences: experienceModelSources(entry, ownerId),
  };
}
const sourceReferenceKey = (reference: ExperienceSourceReference) =>
  JSON.stringify([reference.kind, reference.id, reference.revision]);
function experienceModelSources(entry: ExperienceEntry, ownerId: string) {
  return new Map(
    (entry.source === 'summary' ? entry.value.sources : []).map((reference) => [
      sourceReferenceKey(reference),
      `source-${digest([ownerId, reference])}`,
    ]),
  );
}

/** Source-stable index serializer. Its native field order and wording deliberately
 * remain independent of task presentation: unchanged source revisions keep their
 * existing embedding input. This is not a reader for an earlier request format. */
function experienceIndexRecord(entry: ExperienceEntry, bindings: ExperienceModelBindings) {
  const ref = (id: string): string => {
    const handle = bindings.entities.get(id);
    if (!handle) throw new Error('A selected experience participant has no permitted binding.');
    return handle;
  };
  const entities = entry.value.entityIds.map(ref);
  const owner = ref(bindings.ownerId);
  let value: Record<string, unknown>;
  if (entry.source === 'awareness') {
    const {
      actorId,
      eventId: _eventId,
      eventType: _eventType,
      entityEpisodes: _episodes,
      sourceId,
      targetId,
      entityIds: _ids,
      references,
      eventData,
      exposure,
      sound,
      ...meaning
    } = entry.value;
    if (actorId !== bindings.ownerId)
      throw new Error('Experience owner disagrees with its binding.');
    const eventType = perceivedEventType(entry.value);
    value = {
      ...meaning,
      ...(eventType ? { eventType } : {}),
      ...(sound ? { sound: soundExperience(sound, ref) } : {}),
      actorId: owner,
      entityIds: entities,
      ...(sourceId ? { sourceId: ref(sourceId) } : {}),
      ...(targetId ? { targetId: ref(targetId) } : {}),
      ...(references
        ? { references: references.map((reference) => ({ ...reference, id: ref(reference.id) })) }
        : {}),
      ...(eventData ? { eventData: modelEventData(eventData, ref) } : {}),
      ...(exposure ? { exposure: modelExposure(exposure, ref) } : {}),
      ...(entry.value.speech
        ? { prose: speechPresentation(entry.value, bindings.perspective, 'personal')!.personalText }
        : {}),
    };
  } else if (entry.source === 'memory') {
    const {
      id: _id,
      actorId,
      responseId: _responseId,
      activityId: _activityId,
      eventId: _eventId,
      speakerId,
      entityIds: _ids,
      obligation,
      ...meaning
    } = entry.value;
    if (actorId !== bindings.ownerId)
      throw new Error('Experience owner disagrees with its binding.');
    value = {
      ...meaning,
      actorId: owner,
      entityIds: entities,
      ...(speakerId ? { speakerId: ref(speakerId) } : {}),
      ...(obligation
        ? {
            obligation: {
              status: obligation.status,
              ...(obligation.dueAt !== undefined ? { dueAt: obligation.dueAt } : {}),
              ...(obligation.fulfilledAt !== undefined
                ? { fulfilledAt: obligation.fulfilledAt }
                : {}),
              ...(obligation.completion
                ? {
                    completion: {
                      ...obligation.completion,
                      ...(obligation.completion.targetId
                        ? { targetId: ref(obligation.completion.targetId) }
                        : {}),
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
  } else {
    if (!validExperienceSummary(entry.value, bindings.ownerId))
      throw new Error('Selected summary attribution is unavailable.');
    const {
      id: _id,
      revision: _revision,
      sources,
      attribution,
      entityIds: _ids,
      ...meaning
    } = entry.value;
    const source = (reference: ExperienceSourceReference) => {
      const handle = bindings.sourceReferences.get(sourceReferenceKey(reference));
      if (!handle) throw new Error('A summary source has no permitted binding.');
      return { kind: reference.kind, handle };
    };
    value = {
      ...meaning,
      entityIds: entities,
      sources: sources.map(source),
      attribution: {
        version: attribution.version,
        groups: attribution.groups.map((group) => ({
          ...group,
          speakerId: group.speakerId ? ref(group.speakerId) : null,
          targetId: group.targetId ? ref(group.targetId) : null,
          sources: group.sources.map(source),
        })),
      },
    };
  }
  return { source: entry.source, handle: bindings.source, owner, timeUnit: 'game seconds', value };
}

/** Complete permitted occurrence, constructed by source kind rather than spreading
 * a storage envelope. Field inventory (all source guards stay in native bindings):
 * awareness: at/sequence/modality/recognized and acquired roles; speech owns exact
 * segments/acquisition, other events own text/content/eventData/exposure/sound.
 * memory: complete account, acquisition/time, subjects, resolution and obligation.
 * summary: complete attributed account, interval, coverage and acquired subjects.
 * Retention, scheduling scores, receipt IDs and revision authority are not opinions.
 * docs/technical/situation-aware-cognition-context.md#76-implementing-the-occurrence-projector-and-readable-layout */
export function experienceForModel(entry: ExperienceEntry, bindings: ExperienceModelBindings) {
  const ref = (id: string): string => {
    const handle = bindings.entities.get(id);
    if (!handle) throw new Error('A selected experience participant has no permitted binding.');
    return handle;
  };
  const owner = ref(bindings.ownerId);
  const base = { handle: bindings.source, owner, timeUnit: 'game seconds' as const };
  const entities = entry.value.entityIds.map(ref);
  if (entry.source === 'awareness') {
    const native = entry.value;
    if (native.actorId !== bindings.ownerId)
      throw new Error('Experience owner disagrees with its binding.');
    const roles = {
      ...(native.sourceId ? { sourceId: ref(native.sourceId) } : {}),
      ...(native.targetId ? { targetId: ref(native.targetId) } : {}),
      ...(native.references?.length
        ? {
            references: native.references.map(({ id, label, role }) => ({
              id: ref(id),
              label,
              role,
            })),
          }
        : {}),
    };
    const acquisition = {
      at: native.at,
      sequence: native.sequence,
      modality: native.modality,
      recognized: native.recognized,
    };
    if (native.speech) {
      const speech = native.speech;
      const participant = (value: typeof speech.speaker, id: string | undefined) =>
        value ? { ...value, ...(id ? { reference: ref(id) } : {}) } : null;
      // No prose/text/content copy accompanies the exact heard segments. Seen-only
      // speech has no quotation; a gap never becomes a reconstructed complete quote.
      const common = {
        ...acquisition,
        ...roles,
        // Participant roles already carry their handles; retain only additional
        // acquired subjects instead of another copy of those same identities.
        ...(native.entityIds.some((id) => id !== native.sourceId && id !== native.targetId)
          ? {
              entityIds: native.entityIds
                .filter((id) => id !== native.sourceId && id !== native.targetId)
                .map(ref),
            }
          : {}),
        ...(native.sound ? { sound: soundExperience(native.sound, ref) } : {}),
      };
      const speechAcquisition = {
        speaker: participant(speech.speaker, native.sourceId),
        delivery: speech.delivery,
        direction: speech.direction,
        listenerPosition: { ...speech.listenerPosition },
      };
      return speech.perception === 'seen'
        ? {
            ...base,
            source: 'awareness' as const,
            value: {
              ...common,
              speech: {
                ...speechAcquisition,
                perception: 'seen' as const,
                addressing: null,
                intelligibility: 'none' as const,
                segments: [],
                addressee: null,
              },
            },
          }
        : {
            ...base,
            source: 'awareness' as const,
            value: {
              ...common,
              speech: {
                ...speechAcquisition,
                perception: speech.perception,
                addressing: speech.addressing,
                intelligibility: speech.intelligibility,
                segments: speech.segments.map((segment) => ({ ...segment })),
                addressee: participant(speech.addressee, native.targetId),
              },
            },
          };
    }
    const eventType = perceivedEventType(native);
    return {
      ...base,
      source: 'awareness' as const,
      value: {
        ...acquisition,
        ...roles,
        text: native.text,
        intelligible: native.intelligible,
        ...(native.content !== undefined && native.content !== native.text
          ? { content: native.content }
          : {}),
        ...(native.change ? { change: native.change } : {}),
        ...(eventType ? { eventType } : {}),
        ...(entities.length ? { entityIds: entities } : {}),
        ...(native.sound ? { sound: soundExperience(native.sound, ref) } : {}),
        ...(native.eventData ? { eventData: modelEventData(native.eventData, ref) } : {}),
        ...(native.exposure ? { exposure: modelExposure(native.exposure, ref) } : {}),
      },
    };
  }
  if (entry.source === 'memory') {
    const native = entry.value;
    if (native.actorId !== bindings.ownerId)
      throw new Error('Experience owner disagrees with its binding.');
    return {
      ...base,
      source: 'memory' as const,
      value: {
        kind: native.kind,
        source: native.source,
        summary: native.summary,
        at: native.at,
        ...(native.sequence !== undefined ? { sequence: native.sequence } : {}),
        ...(native.eventType ? { eventType: native.eventType } : {}),
        ...(native.speakerId ? { speakerId: ref(native.speakerId) } : {}),
        ...(entities.length ? { entityIds: entities } : {}),
        ...(native.resolved !== undefined ? { resolved: native.resolved } : {}),
        ...(native.obligation
          ? {
              obligation: {
                status: native.obligation.status,
                ...(native.obligation.dueAt !== undefined
                  ? { dueAt: native.obligation.dueAt }
                  : {}),
                ...(native.obligation.fulfilledAt !== undefined
                  ? { fulfilledAt: native.obligation.fulfilledAt }
                  : {}),
                ...(native.obligation.completion
                  ? {
                      completion: {
                        ...native.obligation.completion,
                        ...(native.obligation.completion.targetId
                          ? { targetId: ref(native.obligation.completion.targetId) }
                          : {}),
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    };
  }
  if (entry.source === 'summary') {
    const native = entry.value;
    if (!validExperienceSummary(native, bindings.ownerId))
      throw new Error('Selected summary attribution is unavailable.');
    const source = (reference: ExperienceSourceReference) => {
      const handle = bindings.sourceReferences.get(sourceReferenceKey(reference));
      if (!handle) throw new Error('A summary source has no permitted binding.');
      return { kind: reference.kind, handle };
    };
    return {
      ...base,
      source: 'summary' as const,
      value: {
        text: native.text,
        from: native.from,
        to: native.to,
        sources: native.sources.map(source),
        ...(entities.length ? { entityIds: entities } : {}),
        attribution: {
          version: native.attribution.version,
          groups: native.attribution.groups.map((group) => ({
            speakerId: group.speakerId ? ref(group.speakerId) : null,
            targetId: group.targetId ? ref(group.targetId) : null,
            addressing: group.addressing,
            observerRelation: group.observerRelation,
            acquisition: group.acquisition,
            intelligibility: group.intelligibility,
            firstAt: group.firstAt,
            lastAt: group.lastAt,
            sourceCount: group.sourceCount,
            sources: group.sources.map(source),
          })),
        },
      },
    };
  }
  const unsupported: never = entry;
  throw new Error(`Unsupported personal experience: ${String(unsupported)}`);
}

/** Event-family scalar facts are owned by the native event, not a new taxonomy. */
function modelEventData(data: NonNullable<Awareness['eventData']>, ref: (id: string) => string) {
  return Object.fromEntries(
    Object.entries(data).flatMap(([key, value]) =>
      eventAuthorityFields.has(key)
        ? []
        : [[key, eventEntityFields.has(key) && typeof value === 'string' ? ref(value) : value]],
    ),
  ) as NonNullable<Awareness['eventData']>;
}
function modelExposure(exposure: NonNullable<Awareness['exposure']>, ref: (id: string) => string) {
  return exposure.kind === 'place'
    ? {
        ...exposure,
        landmarkId: ref(exposure.landmarkId),
        ...(exposure.reportedBy ? { reportedBy: ref(exposure.reportedBy) } : {}),
      }
    : {
        ...exposure,
        id: ref(exposure.id),
        ...(exposure.observedLocation?.kind === 'world'
          ? {
              observedLocation: {
                ...exposure.observedLocation,
                containerId: ref(exposure.observedLocation.containerId),
              },
            }
          : {}),
      };
}

/** Index meaning stays source-stable; it never incorporates current location, a
 * later name, or a temporary visible-body reference. */
export function experienceEmbeddingText(entry: ExperienceEntry, ownerId: string): string {
  return JSON.stringify(
    experienceIndexRecord(entry, {
      source: 'remembered-source',
      ownerId,
      perspective:
        entry.source === 'awareness'
          ? speechPerspective(entry.value)
          : { selfId: ownerId, names: new Map() },
      entities: new Map(
        [...experienceEntityIds(entry, ownerId)].map((id) => [
          id,
          digest(['remembered-participant', ownerId, id]),
        ]),
      ),
      sourceReferences: experienceModelSources(entry, ownerId),
    }),
  );
}

const propertyDescriptions: Record<ItemDefinition['properties'][number], string> = {
  fiber: 'fibrous material',
  binding: 'suitable for tying',
  flexible: 'flexible',
  rigid: 'rigid',
  shaft: 'usable as a shaft',
  pouch: 'usable as a pouch',
  point: 'has a point',
  projectile: 'usable as a projectile',
  food: 'edible',
  fuel: 'usable as fuel',
};

const activities: Record<Action['type'], string | undefined> = {
  feed: undefined,
  assemble: undefined,
  'operate-gate': undefined,
  'impact-boundary': undefined,
  'place-hearth': undefined,
  pickup: 'picking up items',
  follow: 'following',
  move: 'moving',
  evade: BASE_EVASION_TEXT.activity,
  gather: 'gathering',
  craft: 'crafting',
  'practice-shot': 'practicing a shot',
  coaching: 'participating in guided feedback',
  hunt: 'hunting',
  aim: BASE_RANGED_TEXT.aimingActivity,
  'shoot-once': BASE_RANGED_TEXT.shootingActivity,
  harvest: 'harvesting',
  cook: 'cooking',
  fish: 'fishing',
  strike: 'striking',
  guard: BASE_GUARD_TEXT.activity,
  replenish: 'replenishing a supply',
  'tend-fire': 'tending a fire',
  'treat-scar': 'treating an injury',
  // The internal effect identifier is not itself an observable activity description.
  'status-effect': undefined,
};

/** Describe only the permitted observation, never a private route or inferred intent.
 * docs/memory-architecture.md#3-one-compact-model-facing-context
 */
export function perceivedEntityText(
  entity: Entity,
  definitions: Map<string, ItemDefinition>,
  world: WorldState,
  observerId: string,
  contents: readonly ItemInstance[] = [],
) {
  const facts = [
    `I can see ${entityLabel(world, entity, observerId, 'indefinite')}.${entity.actor ? ` Species: ${entity.actor.species ?? 'unknown'}.` : ''}`,
  ];
  const combat =
    entityGet(world.entities, observerId) &&
    observedCombatActivity(world, entityGet(world.entities, observerId)!, entity);
  if (combat) facts.push(combat.text);
  const health = observedBodyHealth(world, observerId, entity.id);
  if (health) facts.push(health);
  if (entity.actor && !entity.actor.alive) facts.push('It is dead.');
  // Same coarse outward state that ranks a fallen being earlier in attention (EPR06).
  else if (entity.actor?.incapacitated) facts.push('It has collapsed and is not moving.');
  else if (entity.actor?.action) {
    const action = entity.actor.action;
    // No action record is not evidence of stillness: native movement uses other state.
    const activity =
      action.stage === 'approaching'
        ? 'moving'
        : action.assemblyPhase
          ? assemblyPhaseLabel(world, action.assemblyPhase).toLowerCase()
          : action.hearthWork
            ? world.hearthDefinitions?.[action.hearthWork.definition.id]?.activityText
            : activities[action.type];
    if (activity && combat?.actionId !== action.id) facts.push(`It is ${activity}.`);
  }
  if (entity.resource?.cast) {
    const definition = world.castDefinitions[entity.resource.cast.definitionId];
    if (definition)
      facts.push(
        definition.description,
        entity.resource.quantity > 0 ? definition.supplyUnknownText : definition.exhaustedText,
      );
  } else if (entity.resource) {
    const item = definitions.get(entity.resource.definitionId);
    facts.push(
      `${entity.resource.quantity} units of ${item?.name ?? 'unidentified material'} remain.`,
    );
  }
  if (entity.kind === 'item-pile')
    facts.push(
      `Contents: ${contents.map((item) => `${item.quantity} × ${definitions.get(item.definitionId)?.name ?? 'unidentified item'}`).join('; ')}.`,
    );
  if (entity.heat)
    facts.push(
      `The fire is ${entity.heat.lit ? 'lit' : 'unlit'}, with ${fireFuelDescription(entity.heat)}.`,
    );
  return facts.join(' ');
}

/** One shared frame explanation serves both structured judgment and prose response inputs. */
export const OBSERVER_SPATIAL_PERSPECTIVE =
  "Current position and facing, and I/my in present surroundings, belong to this observing person. Left/right/ahead/behind are relative to this person's facing, never the listener's. Quoted speech retains its speaker's frame; another person's frame needs their own supported position and facing.";

/** Relative geometry is observed location, not proof of a traversable route. */
export function relativeLocation(observer: Entity, target: Entity): string {
  const dx = worldPosition(target).x - worldPosition(observer).x;
  const dz = worldPosition(target).z - worldPosition(observer).z;
  const dy = worldPosition(target).y - worldPosition(observer).y;
  const horizontal = Math.hypot(dx, dz);
  const directions = [
    'ahead of me',
    'ahead and to my right',
    'to my right',
    'behind and to my right',
    'behind me',
    'behind and to my left',
    'to my left',
    'ahead and to my left',
  ];
  // Right-handed, Y-up: facing +Z puts the right hand at -X, so clockwise bearing is
  // heading minus the target's angle (the same frame as actor-relative movement).
  const bearing = observer.spatial.heading - Math.atan2(dx, dz);
  const direction = directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8];
  const height =
    Math.abs(dy) < 0.1
      ? 'at roughly my elevation'
      : `about ${Math.abs(dy).toFixed(1)} m ${dy > 0 ? 'above' : 'below'} me`;
  return `${horizontal < 0.1 ? 'At my horizontal position' : `About ${horizontal.toFixed(1)} m horizontally ${direction}`}, ${height}.`;
}

export { describePossession as possessionText } from '@open-legend/domain';

/** Shared character-view presentation order, independent of the caller's task.
 * Preserve every field/value and unknown extension order; this selects no evidence.
 * docs/technical/situation-aware-cognition-context.md#76-implementing-the-occurrence-projector-and-readable-layout */
export function orderedDecisionContext(context: Record<string, unknown>) {
  const ordered: Record<string, unknown> = {};
  for (const key of [
    'decisionRequirements',
    'triggerFacts',
    'stimulus',
    'identity',
    'aboutMe',
    'body',
    'feelings',
    'carryingConcern',
    'capabilities',
    'now',
    'simTime',
    'currentPosition',
    'currentFacing',
    'currentSupport',
    'spatialPerspective',
    'goal',
    'agency',
    'commitments',
    'outing',
    'experience',
    'conversation',
    'recall',
  ])
    if (Object.hasOwn(context, key)) ordered[key] = context[key];
  // Remaining means, consequences and extension data retain their relative order.
  for (const [key, value] of Object.entries(context))
    if (key !== 'references' && !Object.hasOwn(ordered, key)) ordered[key] = value;
  if (Object.hasOwn(context, 'references')) ordered['references'] = context['references'];
  return ordered;
}

/** The same category names reach attention and the final actor context; metadata stays server-side. */
export function contextSections(
  candidates: AttentionCandidate[],
  sharedSources?: ReadonlyMap<string, SharedModelExperience>,
): Record<string, unknown[]> {
  const names: Record<AttentionCandidate['kind'], string> = {
    conversation: 'conversation',
    memory: 'recall',
    entity: 'surroundings',
    possession: 'possessions',
    knowledge: 'knowledge',
    action: 'actions',
  };
  const sections: Record<string, unknown[]> = {};
  const evidence = sharedSources
    ? undefined
    : assembleModelEvidence(candidateModelSources(candidates));
  const sources = sharedSources ?? evidence!.sources;
  for (const candidate of candidates) {
    const section = (sections[names[candidate.kind]] ??= []);
    if (candidate.experience?.length) {
      for (const key of candidate.sourceKeys ?? []) {
        const source = sources.get(key);
        if (!source) throw new Error('A selected personal experience has no supplied array slot.');
        section.push(modelEvidenceReference(source.index));
      }
    } else section.push(candidate.text);
  }
  if (evidence?.experience.length) sections['experience'] = evidence.experience;
  return sections;
}
