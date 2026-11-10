import { recordMapChangesBetween, nativeThinkingTimeChanges } from '@open-legend/domain';
import { entityGet } from '@open-legend/domain';
import { currentGoal } from '@open-legend/domain';
import {
  activeStimuli,
  STIMULUS_POLICY,
  type StimulusPolicy,
  type ActiveStimulus,
  capabilityBlocked,
  currentObservedBodyClassifications,
  bodyReconsiderationInputs,
  attributeConcernActive,
  readAttribute,
  hasMemory,
  entityChangesBetween,
  currentAttentionCues,
} from '@open-legend/domain';
import type { WorldState } from '@open-legend/domain';
import type { IntakeInputs, IntakeReason } from './actor-work.js';
import { nativeProtectionReason } from './native-protection.js';

/** The reason each autonomous-thought wake input represents, in input order. */
export const THOUGHT_INPUT_REASONS: readonly IntakeReason[] = [
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
  'evidence', // newly supported native physical relation generation
  'state', // actual saved free interval, never a recurring thought timer
];
interface ThoughtNativeInputs {
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
  'perceptionEvidence',
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
  const mindChanges =
    before.minds === after.minds
      ? new Set<string>()
      : before.minds && after.minds
        ? recordMapChangesBetween(before.minds, after.minds)
        : undefined;
  if (!mindChanges) return;
  for (const id of mindChanges)
    if (Object.hasOwn(before.minds ?? {}, id) !== Object.hasOwn(population, id)) return;
  const affected = new Set<string>();
  const changedOwners = (
    previous: Readonly<Record<string, unknown>> | undefined,
    current: Readonly<Record<string, unknown>> | undefined,
  ): boolean => {
    if (previous === current) return true;
    if ((previous && !Object.isFrozen(previous)) || (current && !Object.isFrozen(current)))
      return false;
    const changed =
      previous === before.minds && current === after.minds
        ? mindChanges
        : previous && current
          ? recordMapChangesBetween(previous, current)
          : undefined;
    for (const id of changed ??
      new Set([...Object.keys(previous ?? {}), ...Object.keys(current ?? {})]))
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
/** Thought wake inputs consume current personal reception and native condition
 * changes. Only acquisition owns sight geometry; reads never measure the world.
 * docs/events-perception-and-reactions.md#extend-actorwork-instead-of-replacing-the-scheduler */
export class ThoughtIntakeInputs {
  private scope?: string;
  /** Highest awareness sequence already weighed for urgency, per character. Separate from the
   * native preparation so verification cannot consume urgency. */
  private readonly weighed = new Map<string, number>();
  private concernDefinitions?: WorldState['moduleManifest']['definitions'];
  private immutableConcerns = false;
  private reconsidered: WorldState['moduleManifest']['definitions'] = [];
  private readonly nativeBaseline = new Map<string, ThoughtNativeInputs>();
  private nativeWorld?: WorldState;
  private readonly preparedNative = new Map<string, ThoughtNativeInputs>();
  private populationOrder?: ReadonlyMap<string, number>;
  /** Diagnostic count of actual native predicate preparations. */
  nativeInputReads = 0;
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
    return stimulusReviewFromRead(stimuli);
  }

  reset(scope?: string): void {
    if (scope !== undefined && this.scope === scope) return;
    this.scope = scope;
    this.weighed.clear();
    this.nativeBaseline.clear();
    this.preparedNative.clear();
    this.nativeWorld = undefined;
    this.populationOrder = undefined;
    this.concernDefinitions = undefined;
    this.immutableConcerns = false;
    this.reconsidered = [];
  }
  reconcile(world: WorldState): void {
    this.populationOrder = new Map(Object.keys(world.minds ?? {}).map((id, order) => [id, order]));
    for (const id of new Set([...this.weighed.keys(), ...this.nativeBaseline.keys()]))
      if (!entityGet(world.entities, id)?.actor?.alive || !hasMemory(entityGet(world.entities, id)))
        this.retire(id);
  }
  private retire(id: string): void {
    this.weighed.delete(id);
    this.nativeBaseline.delete(id);
    this.preparedNative.delete(id);
  }
  /** Exact narrowing of the existing input reader, not a new observation feed.
   * Comparing the last inspected snapshot with the current one covers skipped
   * publications; missing entity ancestry and unknown roots rebuild completely.
   * Covered time/native effects read only their affected owners; unknown coverage rebuilds.
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
    const timeChanged = nativeThinkingTimeChanges(before, after);
    for (const id of timeChanged ?? Object.keys(after.minds ?? {})) {
      const entity = entityGet(after.entities, id);
      if (!entity?.actor?.alive || !hasMemory(entity)) continue;
      if (affected.has(id)) continue;
      if (
        before.simTime === after.simTime &&
        before.pendingNativeIntegration === after.pendingNativeIntegration
      )
        continue;
      const previous = this.nativeBaseline.get(id),
        current = this.readNative(after, id);
      if (
        !previous ||
        previous.protection !== current.protection ||
        previous.reconsideration !== current.reconsideration ||
        previous.actionsBlocked !== current.actionsBlocked ||
        previous.concerns !== current.concerns
      )
        affected.add(id);
    }
    // Preserve the full reader's participant order, including generation
    // allocation when several people change in the same publication.
    const order = (this.populationOrder ??= new Map(
      Object.keys(after.minds ?? {}).map((id, index) => [id, index]),
    ));
    return new Set(
      [...affected].filter((id) => order.has(id)).sort((a, b) => order.get(a)! - order.get(b)!),
    );
  }

  /** Release operation-owned predicate preparation before any storage/provider
   * wait. Verification after a wait reads current predicates independently. */
  refreshed(): void {
    this.nativeWorld = undefined;
    this.preparedNative.clear();
  }

  private readNative(world: WorldState, id: string): ThoughtNativeInputs {
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
    const preparedNative = this.nativeWorld === world ? this.preparedNative.get(id) : undefined;
    const native = preparedNative ?? this.readNative(world, id);
    const policyToken = installedThinkingToken(world);
    // Read the same eligible received cut as context. No read-triggered sight query,
    // classification from hidden entities, or parallel geometric visibility cache.
    const subjects = currentObservedBodyClassifications(world, id);
    const seen = { ids: subjects.map((subject) => subject.id) };
    if (!verify) this.nativeBaseline.set(id, native);
    const kinds = JSON.stringify(subjects.map(({ kind, subtype }) => [kind, subtype]));
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
        JSON.stringify(
          currentAttentionCues(world, id).map((cue) => [cue.id, cue.descriptionRevision]),
        ),
        JSON.stringify([
          actor.agency.semantic?.interval,
          actor.agency.semantic?.discovery,
          actor.agency.semantic?.occupiedPurpose,
        ]),
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

/** Pure review formatting shared by actual Source and finite native intake. */
export function stimulusReviewFromRead(stimuli: readonly ActiveStimulus[]): { key?: string; due: string[]; nextAt: number } {
  const due = stimuli.filter((stimulus) => stimulus.reviews > 0);
  return {
    ...(due.length ? { key: due.map((stimulus) => `${stimulus.sourceId}:${stimulus.reviews}`).sort().join('|') } : {}),
    due: due.map((stimulus) => stimulus.sourceId),
    nextAt: Math.min(Infinity, ...stimuli.map((stimulus) => stimulus.reviewAt ?? Infinity)),
  };
}
