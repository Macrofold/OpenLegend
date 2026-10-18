import { entityGet } from '@open-legend/domain';
import {
  itemFor,
  inventoryFor,
  accessiblePossession,
  preparationDefinition,
} from '@open-legend/domain';
import { currentGoal, isFuel, NATIVE_PREPARATIONS } from '@open-legend/domain';
import {
  activeStimuli,
  STIMULUS_POLICY,
  type StimulusPolicy,
  capabilityBlocked,
  entityVisionQuery,
  bodyReconsiderationInputs,
  attributeConcernActive,
  readAttribute,
  spatialQuery,
  visionRadius,
  worldPosition,
  hasMemory,
  entityChangesBetween,
} from '@open-legend/domain';
import type { WorldState } from '@open-legend/domain';
import { digest } from './store.js';
import type { AttentionCandidate } from './recall.js';
import type { IntakeInputs, IntakeReason } from './actor-work.js';
import { nativeProtectionReason } from './native-protection.js';

/** The reason each autonomous-thought wake input represents, in input order. */
const THOUGHT_INPUT_REASONS: readonly IntakeReason[] = [
  'state', // controller
  'state', // incapacitation
  'state', // goal
  'state', // plan revision
  'state', // native protection (for example sleep)
  'condition', // body condition episodes
  'state', // possessions
  'condition', // named configured body restrictions
  'state', // installed body/attribute policy
  'state', // action capability
  'condition', // reservoir concerns
  'exposure', // visible entities
  'exposure', // visible kinds and resource definitions
  'state', // known recipes
  'evidence', // memories
  'evidence', // awareness
  'evidence', // summaries
  'state', // accepted mind
  'state', // cognition policy
];
interface ThoughtExposure {
  people: unknown;
  objects: unknown;
  position: unknown;
  definitions: unknown;
  map: unknown;
  body: unknown;
  footprint: unknown;
  radius: number;
  ids: string[];
}
interface ThoughtNativeInputs {
  radius: number;
  protection: string | undefined;
  reconsideration: string;
  actionsBlocked: boolean;
  concerns: string;
}
const personalThoughtRoots = [
  'memories',
  'minds',
  'innerWorlds',
  'appraisals',
  'knowledge',
  'knowledgeRevisions',
  'visiblePeople',
  'visibleObjects',
] as const;
const personalExperienceRoots = [
  'awareness',
  'summaries',
  'corrections',
  'forgotten',
  'consolidatedAt',
] as const;
const personalExperienceFields = new Set<string>(personalExperienceRoots);
const personalPublicationRoots = new Set([
  ...personalThoughtRoots,
  'experience',
  'sequence',
  'nextId',
  // finishWorld discards the previous native prediction after a semantic edit;
  // the prediction is not an input to thought. Current native values are a
  // separate root and deliberately require complete reconciliation.
  'nativeInterval',
]);
/** These additional publications do not directly enter the thought input tuple or
 * ActorWork's captured dependencies. Entity/local-native inputs are checked below.
 * Every future root remains conservative until its actual readers are audited. */
const activePublicationRoots = new Set([
  ...personalPublicationRoots,
  'entities',
  'simTime',
  'pendingNativeIntegration',
  'rngState',
  'workState',
  'events',
  'archivedEventCount',
  'commandReceipts',
  'perceptionFeatures',
  'perceptionEpisodes',
  'objectState',
  'actionExperience',
  'actorKnowledge',
  'visiblePlaces',
  'appraisalProcesses',
]);
function sameOutside<T extends object>(before: T, after: T, allowed: ReadonlySet<string>): boolean {
  for (const key in before) if (!allowed.has(key) && before[key] !== after[key]) return false;
  for (const key in after) if (!allowed.has(key) && before[key] !== after[key]) return false;
  return true;
}

/** Exact narrowing for personal-only publications between the service's deeply
 * frozen snapshots. Unknown roots always fall back, including future fields.
 * No semantic-change hint is assumed complete and no new mutation feed is added.
 * docs/verification/performance/overhaul-presentation-implementation.md#which-character-thinking-work-is-reused
 */
export function personalThoughtChanges(
  before: WorldState,
  after: WorldState,
): Set<string> | undefined {
  return ownerThoughtChanges(before, after, personalPublicationRoots);
}
function ownerThoughtChanges(
  before: WorldState,
  after: WorldState,
  allowed: ReadonlySet<string>,
): Set<string> | undefined {
  if (!Object.isFrozen(before) || !Object.isFrozen(after) || !sameOutside(before, after, allowed))
    return;
  const population = after.minds ?? {};
  if (before.minds !== after.minds) {
    const previous = Object.keys(before.minds ?? {});
    if (
      previous.length !== Object.keys(population).length ||
      previous.some((id) => !Object.hasOwn(population, id))
    )
      return;
  }
  const affected = new Set<string>();
  const changedOwners = (
    previous: Readonly<Record<string, unknown>> | undefined,
    current: Readonly<Record<string, unknown>> | undefined,
  ): boolean => {
    if (previous === current) return true;
    if ((previous && !Object.isFrozen(previous)) || (current && !Object.isFrozen(current)))
      return false;
    for (const id of new Set([...Object.keys(previous ?? {}), ...Object.keys(current ?? {})]))
      if (previous?.[id] !== current?.[id] && Object.hasOwn(population, id)) affected.add(id);
    return true;
  };
  for (const key of personalThoughtRoots) if (!changedOwners(before[key], after[key])) return;
  if (before.experience !== after.experience) {
    if (
      !before.experience ||
      !after.experience ||
      !Object.isFrozen(before.experience) ||
      !Object.isFrozen(after.experience) ||
      !sameOutside(before.experience, after.experience, personalExperienceFields)
    )
      return;
    for (const key of personalExperienceRoots)
      if (!changedOwners(before.experience[key], after.experience[key])) return;
  }
  return affected;
}
/** Shared publication proof for the two existing cognition schedulers. Callers
 * still check their own time-dependent predicates and additional local inputs. */
export function activeIntakeChanges(
  before: WorldState,
  after: WorldState,
): { owners: Set<string>; entities: ReadonlySet<string> } | undefined {
  const owners = ownerThoughtChanges(before, after, activePublicationRoots);
  if (!owners) return;
  const entities = entityChangesBetween(before.entities, after.entities);
  return entities ? { owners, entities } : undefined;
}
/** Change-fed wake inputs for autonomous thought (EPR05). Every input is a cheap identity or
 * value, and each character's visible set is recomputed only when its own native exposure
 * lists, pose, sight geometry/radius or definitions changed. Compact target kinds are read
 * currently. The cache retains IDs and immutable query inputs, never entities, and is
 * discarded with the restore generation.
 * docs/events-perception-and-reactions.md#extend-actorwork-instead-of-replacing-the-scheduler */
export class ThoughtIntakeInputs {
  private scope?: string;
  private readonly exposure = new Map<string, ThoughtExposure>();
  /** Highest awareness sequence already weighed for urgency, per character. Separate from the
   * visibility cache so an incomplete query cannot reset it. */
  private readonly weighed = new Map<string, number>();
  private readonly incompleteExposure = new Set<string>();
  private concernDefinitions?: WorldState['moduleManifest']['definitions'];
  private immutableConcerns = false;
  private reconsidered: WorldState['moduleManifest']['definitions'] = [];
  private readonly nativeBaseline = new Map<string, ThoughtNativeInputs>();
  private nativeWorld?: WorldState;
  private readonly preparedNative = new Map<string, ThoughtNativeInputs>();
  /** Current-predicate probes remain linear during moving/ticking publications. */
  nativeInputReads = 0;
  /** Visible-set recomputations, for EPR00 accounting. */
  visibilityQueries = 0;
  /** World policy for ongoing perceived conditions; fixtures may install a review cadence. */
  stimulusPolicy: StimulusPolicy = STIMULUS_POLICY;

  /** Due reviews of ongoing salient stimuli (EPR06) on the simulation clock. `key` changes
   * exactly when a review falls due, making a fresh opportunity; `nextAt` is the next
   * deadline for the intake. Without a review cadence there is no key and no deadline. */
  stimulusReview(world: WorldState, id: string): { key?: string; due: string[]; nextAt: number } {
    if (!this.stimulusPolicy.reviewSeconds) return { due: [], nextAt: Infinity };
    // Deadlines cover every salient source; the cue limit bounds context, not reviews, and a
    // cut or reordering must not change the key.
    const { stimuli } = activeStimuli(world, id, { ...this.stimulusPolicy, limit: Infinity });
    const due = stimuli.filter((stimulus) => stimulus.reviews > 0);
    return {
      ...(due.length
        ? {
            key: due
              .map((stimulus) => `${stimulus.sourceId}:${stimulus.reviews}`)
              .sort()
              .join('|'),
          }
        : {}),
      due: due.map((stimulus) => stimulus.sourceId),
      nextAt: Math.min(Infinity, ...stimuli.map((stimulus) => stimulus.reviewAt ?? Infinity)),
    };
  }

  reset(scope?: string): void {
    if (scope !== undefined && this.scope === scope) return;
    this.scope = scope;
    this.exposure.clear();
    this.weighed.clear();
    this.incompleteExposure.clear();
    this.nativeBaseline.clear();
    this.preparedNative.clear();
    this.nativeWorld = undefined;
    this.concernDefinitions = undefined;
    this.immutableConcerns = false;
    this.reconsidered = [];
  }
  /** The last complete visible set; undefined while this character's query is incomplete. */
  visible(id: string): string[] | undefined {
    return this.exposure.get(id)?.ids;
  }
  pendingExposure(): Iterable<string> {
    return this.incompleteExposure;
  }
  reconcile(world: WorldState): void {
    for (const id of new Set([
      ...this.exposure.keys(),
      ...this.weighed.keys(),
      ...this.incompleteExposure,
      ...this.nativeBaseline.keys(),
    ]))
      if (!entityGet(world.entities, id)?.actor?.alive || !hasMemory(entityGet(world.entities, id)))
        this.retire(id);
  }
  private retire(id: string): void {
    this.exposure.delete(id);
    this.weighed.delete(id);
    this.incompleteExposure.delete(id);
    this.nativeBaseline.delete(id);
    this.preparedNative.delete(id);
  }
  /** Exact narrowing of the existing input reader, not a new observation feed.
   * Comparing the last inspected snapshot with the current one covers skipped
   * publications; missing entity ancestry and unknown roots rebuild completely.
   * Time/native/source effects still read current predicates for every thinker.
   */
  affected(before: WorldState, after: WorldState): Set<string> | undefined {
    const changes = activeIntakeChanges(before, after);
    if (!changes) return;
    const { owners: affected, entities: changed } = changes;
    this.nativeWorld = after;
    this.preparedNative.clear();
    for (const id of changed) {
      if (Object.hasOwn(after.minds ?? {}, id)) affected.add(id);
      const entity = entityGet(after.entities, id);
      if (!entity?.actor?.alive || !hasMemory(entity)) this.retire(id);
    }
    const classifications = new Set<string>();
    for (const id of changed) {
      const previous = entityGet(before.entities, id),
        current = entityGet(after.entities, id);
      if (
        previous?.kind !== current?.kind ||
        previous?.resource?.definitionId !== current?.resource?.definitionId
      )
        classifications.add(id);
    }
    for (const id of Object.keys(after.minds ?? {})) {
      const entity = entityGet(after.entities, id);
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      if (affected.has(id)) continue;
      const previous = this.nativeBaseline.get(id),
        current = this.readNative(after, id);
      if (
        !previous ||
        previous.radius !== current.radius ||
        previous.protection !== current.protection ||
        previous.reconsideration !== current.reconsideration ||
        previous.actionsBlocked !== current.actionsBlocked ||
        previous.concerns !== current.concerns ||
        (classifications.size > 0 &&
          this.exposure.get(id)?.ids.some((sourceId) => classifications.has(sourceId)))
      )
        affected.add(id);
    }
    for (const id of this.incompleteExposure) affected.add(id);
    // Preserve the full reader's participant order, including generation
    // allocation when several people change in the same publication.
    return new Set(Object.keys(after.minds ?? {}).filter((id) => affected.has(id)));
  }

  /** Release operation-owned predicate preparation before any storage/provider
   * wait. Verification after a wait reads current predicates independently. */
  refreshed(): void {
    this.nativeWorld = undefined;
    this.preparedNative.clear();
  }

  private readNative(world: WorldState, id: string, radius?: number): ThoughtNativeInputs {
    const reusable = this.nativeWorld === world;
    const cached = reusable ? this.preparedNative.get(id) : undefined;
    if (cached) return cached;
    this.nativeInputReads++;
    const entity = entityGet(world.entities, id)!;
    // Installed definitions are immutable in published worlds. Mutable authoring
    // inputs deliberately rebuild rather than certifying identity-only reuse.
    if (this.concernDefinitions !== world.moduleManifest.definitions || !this.immutableConcerns) {
      this.concernDefinitions = world.moduleManifest.definitions;
      this.immutableConcerns =
        Object.isFrozen(this.concernDefinitions) &&
        this.concernDefinitions.every(
          (definition) =>
            Object.isFrozen(definition) &&
            (!definition.concern || Object.isFrozen(definition.concern)),
        );
      this.reconsidered = world.moduleManifest.definitions.filter(
        (definition) => definition.concern?.reconsider,
      );
    }
    const prepared = {
      radius: radius ?? visionRadius(world, entity),
      protection: nativeProtectionReason(world, id),
      reconsideration: JSON.stringify(bodyReconsiderationInputs(world, entity)),
      actionsBlocked: capabilityBlocked(world, entity, 'actions'),
      // Read exact current values, including retained arithmetic, without
      // rendering unused meter descriptions or concern wording.
      concerns: this.reconsidered
        .filter((definition) =>
          attributeConcernActive(entity, definition, readAttribute(world, entity, definition)),
        )
        .map((definition) => definition.id)
        .join('|'),
    };
    if (reusable) this.preparedNative.set(id, prepared);
    return prepared;
  }
  /** `verify` compares an inspection's captured inputs and must not consume the urgency of
   * awareness that arrived meanwhile; only refresh reads advance that baseline. */
  read(world: WorldState, id: string, verify = false): IntakeInputs {
    const entity = entityGet(world.entities, id)!,
      actor = entity.actor!;
    const position = worldPosition(entity);
    const preparedNative = this.nativeWorld === world ? this.preparedNative.get(id) : undefined;
    const radius = preparedNative?.radius ?? visionRadius(world, entity);
    const policyToken = installedThinkingToken(world);
    let seen = this.exposure.get(id);
    if (
      !seen ||
      seen.people !== world.visiblePeople?.[id] ||
      seen.objects !== world.visibleObjects?.[id] ||
      seen.position !== position ||
      seen.map !== world.map ||
      seen.body !== entity.spatial.body ||
      seen.footprint !== entity.spatial.softFootprint ||
      seen.radius !== radius ||
      seen.definitions !== world.itemDefinitions
    ) {
      this.visibilityQueries++;
      const query = spatialQuery(world, position, radius);
      if (query.status !== 'complete') {
        this.exposure.delete(id);
        this.incompleteExposure.add(id);
        return { values: [query.status], reasons: ['exposure'] };
      }
      this.incompleteExposure.delete(id);
      const sees = entityVisionQuery(world, entity);
      const ids = query.values.filter((other) => other.id !== id && sees(other)).map((o) => o.id);
      seen = {
        people: world.visiblePeople?.[id],
        objects: world.visibleObjects?.[id],
        position,
        definitions: world.itemDefinitions,
        map: world.map,
        body: entity.spatial.body,
        footprint: entity.spatial.softFootprint,
        radius,
        ids,
      };
      this.exposure.set(id, seen);
    }
    const native = preparedNative ?? this.readNative(world, id, radius);
    if (!verify) this.nativeBaseline.set(id, native);
    // A resource edit need not change visible membership. Read these compact facts
    // currently without repeating the geometric query or retaining old entities.
    const kinds = JSON.stringify(
      seen.ids.map((id) => {
        const other = entityGet(world.entities, id);
        return [other?.kind, other?.resource?.definitionId];
      }),
    );
    // Awareness newer than the last weighed sequence orders urgent work first; it never
    // admits anything. Sequences, not array positions, survive consolidation removing entries.
    const entries = world.experience?.awareness[id] ?? [];
    const last = entries.at(-1)?.sequence ?? 0;
    const since = this.weighed.get(id);
    let urgency = 0;
    if (since === undefined) {
      // A new character starts from its current history, not its whole retained past.
      if (!verify) this.weighed.set(id, last);
    } else if (last > since) {
      let newest = since;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]!;
        if (entry.sequence <= since) break;
        urgency = Math.max(urgency, entry.urgency ?? 0);
        newest = Math.max(newest, entry.sequence);
      }
      if (!verify) this.weighed.set(id, newest);
    }
    return {
      values: [
        actor.controller,
        actor.incapacitated,
        currentGoal(actor),
        actor.agency.plan?.revision,
        native.protection,
        actor.conditions,
        entity.inventoryRevision,
        native.reconsideration,
        policyToken,
        native.actionsBlocked,
        native.concerns,
        seen.ids.join('\0'),
        kinds,
        world.recipes,
        world.memories[id],
        world.experience?.awareness[id],
        world.experience?.summaries[id],
        world.innerWorlds?.[id],
        world.cognitionPolicy,
      ],
      reasons: THOUGHT_INPUT_REASONS,
      urgency,
    };
  }
}

/** The installed-policy token is shared by thought and maintenance intake. */
const installedTokens = new WeakMap<WorldState['moduleManifest'], string>();
export function installedThinkingToken(world: WorldState): string {
  const manifest = world.moduleManifest;
  let token = installedTokens.get(manifest);
  if (token === undefined) {
    token = JSON.stringify([manifest.revision, manifest.bodyPolicyPin, manifest.pins]);
    if (
      Object.isFrozen(manifest) &&
      Object.isFrozen(manifest.pins) &&
      manifest.pins.every((pin) => Object.isFrozen(pin)) &&
      (!manifest.bodyPolicyPin || Object.isFrozen(manifest.bodyPolicyPin))
    )
      installedTokens.set(manifest, token);
  }
  return token;
}
export interface InterestSubscription {
  version: 1;
  goal: string;
  mindRevision: number;
  knowledgeRevision?: number;
  expiresAt: number;
  properties: string[];
  entityKinds: string[];
  definitions: string[];
}
/** Native prerequisites are actor-owned knowledge; no goal-prose inference or hidden-world scan. */
function planDefinitions(world: WorldState, actorId: string): string[] {
  const actor = entityGet(world.entities, actorId)?.actor;
  const plan = actor?.agency.plan;
  if (
    !plan ||
    !['active', 'blocked'].includes(plan.status) ||
    (plan.goalId &&
      !actor!.agency.goals.some((goal) => goal.id === plan.goalId && goal.status === 'active'))
  )
    return [];
  return [
    ...new Set(
      plan.steps
        .filter((step) => !['completed', 'cancelled'].includes(step.status))
        .flatMap(({ command }) => {
          if (command.type === 'prepare') return [NATIVE_PREPARATIONS[command.preparation].input];
          if (command.type === 'craft')
            return world.knowledge[actorId]?.some((entry) => entry.recipeId === command.recipeId)
              ? (world.recipes[command.recipeId]?.inputs.map((input) => input.definitionId) ?? [])
              : [];
          if (command.type === 'cook') {
            const { preparationId, preparationVersion, preparationDigest } = command;
            if (!preparationId || !preparationVersion || !preparationDigest) return [];
            return (
              preparationDefinition(world, {
                preparationId,
                preparationVersion,
                preparationDigest,
              })?.inputs.map((input) => input.definitionId) ?? []
            );
          }
          if (command.type === 'tend-fire' && command.operation === 'fuel')
            return Object.values(world.itemDefinitions)
              .filter(isFuel)
              .map((definition) => definition.id);
          return [];
        }),
    ),
  ];
}
/** Preserve all actor-permitted interests; truncating here would hide later valid matches.
 * docs/architecture.md#content-counts-and-request-limits */
export function compileInterests(
  world: WorldState,
  actorId: string,
  selected: AttentionCandidate[],
): InterestSubscription {
  const definitions = new Set<string>(planDefinitions(world, actorId));
  const kinds = new Set<string>();
  for (const c of selected) {
    if (c.kind === 'possession') {
      const item = itemFor(world, c.id.slice(5));
      if (item) definitions.add(item.definitionId);
    }
    if (c.kind === 'entity') {
      const entity = entityGet(world.entities, c.id.slice(7));
      if (entity?.resource) definitions.add(entity.resource.definitionId);
      if (entity) kinds.add(entity.kind);
    }
  }
  return {
    version: 1,
    goal: digest(currentGoal(entityGet(world.entities, actorId)!.actor!)),
    knowledgeRevision: world.knowledgeRevisions?.[actorId] ?? 0,
    mindRevision: world.innerWorlds?.[actorId]?.revision ?? 0,
    expiresAt: world.simTime + 7200,
    properties: [
      ...new Set([...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? [])),
    ],
    entityKinds: [...kinds],
    definitions: [...definitions],
  };
}
export function interestMatches(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
  visibleIds: string[],
): string[] {
  const valid =
    subscription &&
    subscription.version === 1 &&
    subscription.goal === digest(currentGoal(entityGet(world.entities, actorId)!.actor!)) &&
    (subscription.knowledgeRevision ?? 0) === (world.knowledgeRevisions?.[actorId] ?? 0) &&
    subscription.mindRevision === (world.innerWorlds?.[actorId]?.revision ?? 0) &&
    world.simTime < subscription.expiresAt;
  const definitions = new Set([
    ...(valid ? subscription.definitions : []),
    ...planDefinitions(world, actorId),
  ]);
  const kinds = valid ? subscription.entityKinds : [];
  const properties = new Set([
    ...(valid ? subscription.properties : []),
    ...[...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? []),
  ]);
  return visibleIds.filter((id) => {
    const entity = entityGet(world.entities, id);
    const definition = entity?.resource && world.itemDefinitions[entity.resource.definitionId];
    return (
      !!entity &&
      (kinds.includes(entity.kind) ||
        (!!definition &&
          (definitions.has(definition.id) || definition.properties.some((p) => properties.has(p)))))
    );
  });
}

/** Inventory changes only wake decisions for semantically selected interests or explicit prerequisites.
 * Custody/access are checked again; a changed hidden or unrelated object supplies no cue. */
export function relevantPossessions(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
): string[] {
  const valid =
    subscription &&
    subscription.version === 1 &&
    subscription.goal === digest(currentGoal(entityGet(world.entities, actorId)!.actor!)) &&
    subscription.knowledgeRevision === (world.knowledgeRevisions?.[actorId] ?? 0) &&
    subscription.mindRevision === (world.innerWorlds?.[actorId]?.revision ?? 0) &&
    world.simTime < subscription.expiresAt;
  const definitions = new Set([
    ...planDefinitions(world, actorId),
    ...(valid ? subscription.definitions : []),
  ]);
  const properties = new Set(valid ? subscription.properties : []);
  if (!definitions.size && !properties.size) return [];
  return inventoryFor(world, actorId)
    .filter((item) => {
      const definition = world.itemDefinitions[item.definitionId];
      return (
        accessiblePossession(world, actorId, item.id) &&
        definition &&
        (definitions.has(definition.id) || definition.properties.some((p) => properties.has(p)))
      );
    })
    .map((item) => `${item.id}:${item.revision}:${item.quantity}`)
    .sort();
}
