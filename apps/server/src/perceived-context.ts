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

/** Complete selected observer meaning, without database/receipt authority. No fetching,
 * world lookup, prose replacement or inference occurs in this projector.
 * docs/projects/speech-and-social-perception-tech-design.md#structured-evidence-is-primary-prose-is-a-view */
export function experienceForModel(entry: ExperienceEntry, bindings: ExperienceModelBindings) {
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
      ...(eventData
        ? {
            eventData: Object.fromEntries(
              Object.entries(eventData).flatMap(([key, value]) =>
                eventAuthorityFields.has(key)
                  ? []
                  : [
                      [
                        key,
                        eventEntityFields.has(key) && typeof value === 'string'
                          ? ref(value)
                          : value,
                      ],
                    ],
              ),
            ),
          }
        : {}),
      ...(exposure
        ? {
            exposure: {
              ...exposure,
              ...(exposure.kind === 'place'
                ? { landmarkId: ref(exposure.landmarkId) }
                : { id: ref(exposure.id) }),
              ...(exposure.kind === 'place' && exposure.reportedBy
                ? { reportedBy: ref(exposure.reportedBy) }
                : {}),
              ...(exposure.kind === 'inventory-item' && exposure.observedLocation?.kind === 'world'
                ? {
                    observedLocation: {
                      ...exposure.observedLocation,
                      containerId: ref(exposure.observedLocation.containerId),
                    },
                  }
                : {}),
            },
          }
        : {}),
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

/** Index meaning stays source-stable; it never incorporates current location, a
 * later name, or a temporary visible-body reference. */
export function experienceEmbeddingText(entry: ExperienceEntry, ownerId: string): string {
  return JSON.stringify(
    experienceForModel(entry, {
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
  if (combat) facts.push(combat);
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
    if (activity) facts.push(`It is ${activity}.`);
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

/** The same category names reach attention and the final actor context; metadata stays server-side. */
export function contextSections(candidates: AttentionCandidate[]): Record<string, unknown[]> {
  const names: Record<AttentionCandidate['kind'], string> = {
    conversation: 'conversation',
    memory: 'recall',
    entity: 'surroundings',
    possession: 'possessions',
    knowledge: 'knowledge',
    action: 'actions',
  };
  const sections: Record<string, unknown[]> = {};
  for (const candidate of candidates) {
    (sections[names[candidate.kind]] ??= []).push(candidate.text);
    if (candidate.experience) (sections['experience'] ??= []).push(...candidate.experience);
  }
  return sections;
}
