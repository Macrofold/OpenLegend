import { entityGet, entityValues } from './entity-collection.js';
import { countDomainWork, domainCountersEnabled } from './diagnostic-counters.js';
import { narrationTemplate } from './narration.js';
import { admitStatusWork, chargeStatusWork, statusWork } from './native-work.js';
import {
  currentAttributeState,
  retainNativeIntegration,
  NATIVE_VALUE_SEGMENTS,
  type NativeValueBinding,
  type NativeValueAttribute,
} from './native-values.js';
import { releaseWork } from './work-budget.js';
import { recordSemanticChange } from './dependencies.js';
import { chargeWork } from './work-budget.js';
import { worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import {
  statusDefinitions,
  activeContributionId,
  isStatusDefinitionActive,
  invalidateContributionIndex,
} from './status-capabilities.js';
import { advanceCapabilityContributions } from './state-contributions.js';
import { completeContributionHistory } from './contribution-residency.js';
import { current, isDraft } from 'immer';
import { draftWorld, cloneValue, readOnlyDraftView } from './draft.js';
import { emit, finish, outcome, canonicalJson, contentLabel } from './events.js';
import { finishPlanAction } from './agency.js';
import { nextId } from './data.js';
import {
  attributeDefinition,
  attributeRange,
  attributeThreshold,
  readAttribute,
  setAttribute,
  type AttributeDefinition,
} from './world-modules.js';
import { commitHealthChange } from './living.js';
import { validateBodyPolicy } from './body-policy.js';
import { validateStatusEffectPolicy } from './status-effect-validation.js';
import { TIME_EPSILON } from './simulation-time.js';
import { statusDefinitionConditions, visitStatusCondition } from './status-condition-references.js';
import { getOwn, isImmutableData } from './records.js';
import type { Entity, WorldState, WorldEvent, Transition } from './types.js';

export type EntityReference = '$subject' | '$source' | '$actionTarget';
export type Capability = 'actions' | 'locomotion' | 'speech' | 'perception';
export type Comparison =
  | 'equal'
  | 'notEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThanOrEqual';
export type StatusCondition =
  | { all: StatusCondition[] }
  | { any: StatusCondition[] }
  | {
      compare: {
        target: EntityReference;
        attribute: string;
        operator: Comparison;
        value: number;
        unit?: 'fractionOfRange';
      };
    }
  | {
      field: {
        target: EntityReference;
        name: 'controller' | 'alive' | 'incapacitated' | 'grounded' | 'activeWork' | 'kind';
        operator: 'equal' | 'notEqual';
        value: string | boolean;
      };
    }
  | { dailyWindow: { target: '$world'; clock: 'localTime'; start: number; end: number } }
  | { hasAttribute: { target: EntityReference; attribute: string } }
  | { statusActive: { target: EntityReference; definitionId: string; value: boolean } };
export type StatusOperation =
  | {
      changeRate: { target: EntityReference; attribute: string; amount: number; per: 'gameSecond' };
      when?: StatusCondition;
    }
  | {
      changeEvery: {
        target: EntityReference;
        attribute: string;
        amount: number;
        everyGameSeconds: number;
        unit: 'attribute' | 'fractionOfRange';
      };
      when?: StatusCondition;
    }
  | { restrictCapabilities: { target: '$subject'; capabilities: Capability[] } };

/** Numeric operations share applicability, target dependencies and condition ownership. */
export function statusNumericChange(operation: StatusOperation) {
  return 'changeRate' in operation
    ? operation.changeRate
    : 'changeEvery' in operation
      ? operation.changeEvery
      : undefined;
}
export interface StatusPresentation {
  pose?: 'horizontal';
  particle?: { text: string; anchor: 'head'; motion: 'floatAway' };
}
export interface StatusEffectDefinition {
  id: string;
  type: 'statusEffect';
  target: '$subject';
  label: string;
  /** World-authored explanation for perceived consequences and status UI. */
  meaning?: string;
  lifecycleCause?: string;
  enabled: boolean;
  requires: StatusCondition;
  activationCondition?: StatusCondition;
  automaticActivation?: StatusCondition;
  automaticDeactivation?: StatusCondition;
  reactivationDelaySeconds: number;
  occupiesAction: boolean;
  interruptOn: string[];
  whileActive: StatusOperation[];
  presentation?: StatusPresentation;
  onActivate?: { emit: { target: EntityReference; type: 'stateChanged'; narration: string } };
  onDeactivate?: { emit: { target: EntityReference; type: 'stateChanged'; narration: string } };
  actions?: {
    activate: string;
    deactivate: string;
    activateIcon?: string;
    deactivateIcon?: string;
    allowOther: boolean;
    activateOther: boolean;
  };
  contribution?: {
    disclosure: 'owner' | 'public';
  } & (
    | { lifetime: 'explicit-removal' | 'source-sustained' }
    | { lifetime: 'fixed'; seconds: number }
  );
}
export interface StatusEffectPolicy {
  revision: number;
  clockOffsetHours: number;
  /** Clock hours this world lets a request name as a stopping time ("dawn": 6). */
  namedTimes: Record<string, number>;
  definitions: StatusEffectDefinition[];
}
export interface StatusEffectInstance {
  /** Independent capability contributions share this store with native statuses. */
  contribution?: {
    definitionId: string;
    definitionDigest: string;
    revision: number;
    lifetime: import('./state-contributions.js').ContributionLifetime;
  };
  active: boolean;
  episode: string;
  elapsedSeconds: number;
  automaticAfter: number;
  sourceId: string;
  actionTargetId: string;
}
export interface EffectBindings {
  subject: Entity;
  source?: Entity;
  actionTarget?: Entity;
}
function resolve(ref: EntityReference, bindings: EffectBindings): Entity | undefined {
  return ref === '$subject'
    ? bindings.subject
    : ref === '$source'
      ? bindings.source
      : bindings.actionTarget;
}
export function effectBindings(
  world: WorldState,
  entity: Entity,
  state?: StatusEffectInstance,
): EffectBindings {
  if (!state) return { subject: entity, source: entity, actionTarget: entity };
  return {
    subject: entity,
    source: state.sourceId === entity.id ? entity : entityGet(world.entities, state.sourceId),
    actionTarget:
      state.actionTargetId === entity.id ? entity : entityGet(world.entities, state.actionTargetId),
  };
}
export function readEntityAttribute(
  world: WorldState,
  entity: Entity | undefined,
  id: string,
): number | string | undefined {
  const definition = attributeDefinition(world, id);
  if (!entity || !definition) return undefined;
  const current = readOnlyDraftView(entity);
  if (current.actor) return readAttribute(world, current, definition);
  const state = current.attributes && readOnlyDraftView(current.attributes)[id];
  return state ? readOnlyDraftView(state).value : undefined;
}
export function statusComparisonValue(
  world: WorldState,
  bindings: EffectBindings,
  comparison: Extract<StatusCondition, { compare: unknown }>['compare'],
): number {
  if (comparison.unit !== 'fractionOfRange') return comparison.value;
  const target = resolve(comparison.target, bindings),
    definition = attributeDefinition(world, comparison.attribute);
  if (!target || !definition || definition.schema.kind !== 'number') return comparison.value;
  return attributeThreshold(target.actor, definition, comparison.value, comparison.unit);
}
function compare(
  a: number | string | boolean | undefined,
  operator: Comparison,
  b: number | string | boolean,
): boolean {
  // Missing values are inapplicable, including for inequality. docs/status-effects.md#targets-and-attributes
  if (a === undefined) return false;
  switch (operator) {
    case 'equal':
      return a === b;
    case 'notEqual':
      return a !== b;
    case 'lessThan':
      return typeof a === 'number' && typeof b === 'number' && a < b;
    case 'lessThanOrEqual':
      return typeof a === 'number' && typeof b === 'number' && a <= b;
    case 'greaterThanOrEqual':
      return typeof a === 'number' && typeof b === 'number' && a >= b;
  }
}
type StatusPredicate = (world: WorldState, bindings: EffectBindings) => boolean;
const predicates = new WeakMap<StatusCondition, StatusPredicate>();
/** Prepare the trusted condition operators, never generated code or a cached truth value.
 * Freeze checks include nested data: authoring may supply only shallow-frozen input.
 * Every invocation reads current bindings/time; an earlier effect can change the next result.
 * docs/status-effects.md#transitions */
function prepareCondition(condition: StatusCondition): {
  matches: StatusPredicate;
  immutable: boolean;
} {
  const cached = predicates.get(condition);
  if (cached) return { matches: cached, immutable: true };
  let immutable = Object.isFrozen(condition);
  let matches: StatusPredicate;
  if ('all' in condition || 'any' in condition) {
    const all = 'all' in condition;
    const conditions = 'all' in condition ? condition.all : condition.any;
    const children = conditions.map(prepareCondition);
    immutable &&= Object.isFrozen(conditions) && children.every((c) => c.immutable);
    const compiled = children.map((c) => c.matches);
    matches = all
      ? (world, bindings) => compiled.every((match) => match(world, bindings))
      : (world, bindings) => compiled.some((match) => match(world, bindings));
  } else if ('compare' in condition) {
    const c = condition.compare;
    immutable &&= Object.isFrozen(c);
    const { target, attribute, operator } = c;
    matches = (world, bindings) =>
      compare(
        readEntityAttribute(world, resolve(target, bindings), attribute),
        operator,
        statusComparisonValue(world, bindings, c),
      );
  } else if ('hasAttribute' in condition) {
    const c = condition.hasAttribute;
    immutable &&= Object.isFrozen(c);
    const { target, attribute } = c;
    matches = (world, bindings) =>
      readEntityAttribute(world, resolve(target, bindings), attribute) !== undefined;
  } else if ('field' in condition) {
    const c = condition.field;
    immutable &&= Object.isFrozen(c);
    const { target, name, operator, value } = c;
    const read =
      name === 'kind'
        ? (e: Entity) => e.kind
        : name === 'grounded'
          ? (e: Entity) => worldSupport(e) !== null
          : name === 'activeWork'
            ? (e: Entity) =>
                !!(e.actor && readOnlyDraftView(e.actor).action) ||
                worldSupport(e) === null ||
                !!(e.animal && readOnlyDraftView(e.animal).danger)
            : (e: Entity) => (e.actor ? readOnlyDraftView(e.actor)[name] : undefined);
    matches = (_world, bindings) => {
      const entity = resolve(target, bindings);
      return !!entity && compare(read(readOnlyDraftView(entity)), operator, value);
    };
  } else if ('dailyWindow' in condition) {
    const c = condition.dailyWindow;
    immutable &&= Object.isFrozen(c);
    const { start, end } = c;
    matches = (world) => {
      const hour = localHour(world);
      return start < end ? hour >= start && hour < end : hour >= start || hour < end;
    };
  } else {
    const c = condition.statusActive;
    immutable &&= Object.isFrozen(c);
    const { target, definitionId, value } = c;
    matches = (world, bindings) => {
      const entity = resolve(target, bindings);
      return !!entity && isStatusDefinitionActive(entity, definitionId, world) === value;
    };
  }
  const evaluate = matches;
  matches = (world, bindings) => {
    chargeWork({ tests: 1 });
    if (reuseNegativeCondition(world, bindings, condition)) return false;
    return evaluate(world, bindings);
  };
  if (immutable) predicates.set(condition, matches);
  return { matches, immutable };
}
/** Local hour in [0, 24). The daily-window matcher and its forecast share this expression so
 * a floating-point residue cannot put the forecast on an edge the matcher has not reached. */
export function localHour(world: WorldState): number {
  const hour = (world.simTime / 3600 + world.statusEffectPolicy.clockOffsetHours) % 24;
  return hour < 0 ? hour + 24 : hour;
}
export function matchesStatusCondition(
  world: WorldState,
  bindings: EffectBindings,
  condition: StatusCondition,
): boolean {
  return (predicates.get(condition) ?? prepareCondition(condition).matches)(world, bindings);
}

interface NegativeCondition {
  entityId: string;
  definition: AttributeDefinition;
  anchorValue: number;
  anchorRevision: number;
  threshold: number;
  from: number;
  rate: number;
  segmentCount: number;
  segment: WeakRef<object>;
  remaining: number;
}
// One weakly owned answer per retained arithmetic operation/immutable condition.
// No world, draft, episode history, or second current-value authority is retained.
const negativeConditions = new WeakMap<
  StatusCondition,
  WeakMap<NativeValueAttribute, NegativeCondition>
>();
function conditionArithmetic(
  world: WorldState,
  bindings: EffectBindings,
  comparison: Extract<StatusCondition, { compare: unknown }>['compare'],
) {
  const target = resolve(comparison.target, bindings);
  if (!target) return;
  const entity = readOnlyDraftView(target),
    definition = attributeDefinition(world, comparison.attribute),
    attributes = entity.actor ? readOnlyDraftView(entity.actor).attributes : entity.attributes,
    stored = attributes && getOwn(readOnlyDraftView(attributes), comparison.attribute),
    anchor = stored && readOnlyDraftView(stored),
    pending = readOnlyDraftView(world).pendingNativeIntegration,
    window = pending && readOnlyDraftView(pending),
    subject = window && getOwn(readOnlyDraftView(window.byEntity), entity.id),
    episode = subject && getOwn(readOnlyDraftView(subject), comparison.attribute),
    storedBinding = window && episode && getOwn(readOnlyDraftView(window.bindings), episode),
    binding = storedBinding && readOnlyDraftView(storedBinding),
    storedOperation =
      binding && getOwn(readOnlyDraftView(binding.attributes), comparison.attribute),
    operation = storedOperation && readOnlyDraftView(storedOperation);
  if (
    !anchor ||
    typeof anchor.value !== 'number' ||
    !Object.isFrozen(anchor) ||
    !entity.actor ||
    !definition ||
    definition.schema.kind !== 'number' ||
    (definition.implementation !== 'number-v1' && definition.implementation !== 'reservoir-v1') ||
    !isImmutableData(definition) ||
    !window ||
    !binding ||
    binding.entityId !== entity.id ||
    !operation ||
    !isImmutableData(operation) ||
    operation.rates.length !== 1 ||
    operation.min !== definition.schema.min ||
    operation.max !== definition.schema.max
  )
    return;
  const segments = readOnlyDraftView(window.segments);
  return { entity, definition, anchor, anchorValue: anchor.value, binding, operation, segments };
}
function reuseNegativeCondition(
  world: WorldState,
  bindings: EffectBindings,
  condition: StatusCondition,
): boolean {
  if (!('compare' in condition)) return false;
  const answers = negativeConditions.get(condition);
  if (!answers) return false;
  const input = conditionArithmetic(world, bindings, condition.compare);
  if (!input) return false;
  const cached = answers.get(input.operation);
  if (!cached) return false;
  const { entity, definition, anchor, binding, operation, segments } = input;
  if (
    cached.entityId !== entity.id ||
    cached.definition !== definition ||
    cached.anchorValue !== anchor.value ||
    cached.anchorRevision !== anchor.revision ||
    cached.threshold !== statusComparisonValue(world, bindings, condition.compare) ||
    cached.from !== binding.from ||
    cached.rate !== operation.rates[0] ||
    segments.length < cached.segmentCount ||
    cached.segment.deref() !== readOnlyDraftView(segments[cached.segmentCount - 1]!)
  )
    return false;
  // The saved arithmetic owner only appends segments; replacing/materializing a
  // binding or restoring JSON loses this exact prefix/operation witness. A fork
  // behind the cursor therefore evaluates normally instead of sharing a cursor.
  let remaining = cached.remaining;
  for (let index = cached.segmentCount; index < segments.length; index++)
    remaining -= readOnlyDraftView(segments[index]!).seconds;
  if (!(remaining > 0)) return false;
  const segment = readOnlyDraftView(segments[segments.length - 1]!);
  if (isDraft(segment)) return false;
  cached.remaining = remaining;
  cached.segmentCount = segments.length;
  cached.segment = new WeakRef(segment);
  return true;
}
/** Share the existing forecast's negative leaf answer with later reconciliation.
 * This never changes a physical deadline. Activity/status/clock predicates remain
 * live, and every earlier ordered effect still passes the exact witnesses above.
 */
export function retainNegativeStatusCondition(
  world: WorldState,
  bindings: EffectBindings,
  condition: Extract<StatusCondition, { compare: unknown }>,
  value: number,
  threshold: number,
  rate: number,
  afterSeconds: number,
): void {
  if (!predicates.has(condition)) return;
  const input = conditionArithmetic(world, bindings, condition.compare);
  if (!input || input.operation.rates[0] !== rate) return;
  const { entity, definition, anchor, binding, operation, segments } = input,
    segment = segments.length && readOnlyDraftView(segments[segments.length - 1]!);
  if (!segment || isDraft(segment) || value < operation.min || value > operation.max) return;
  let remaining = Infinity;
  if (afterSeconds === Infinity) {
    // Infinity can also result from overflowing a very distant crossing time.
    // Retain it only with a separate monotonic/no-change proof, never merely
    // because the predictor's numeric division returned Infinity.
    const stationary =
        !rate || (value === operation.min && rate < 0) || (value === operation.max && rate > 0),
      away =
        (value < threshold && rate < 0) ||
        (value > threshold && rate > 0) ||
        (value === threshold && condition.compare.operator === 'lessThan' && rate > 0);
    if (!stationary && !away) return;
  } else {
    const distance = Math.abs(value - threshold),
      scale = Math.max(
        1,
        Math.abs(value),
        Math.abs(threshold),
        Math.abs(operation.min),
        Math.abs(operation.max),
      ),
      slack = 32 * (NATIVE_VALUE_SEGMENTS + 1) * Number.EPSILON * scale;
    // A single monotone rate has at most 64 multiply/add roundings before its
    // owner materializes. Keep three quarters of the measured gap unused, and
    // require that gap to exceed a conservative bound on all their rounding.
    // Near a threshold, serial/clamped rate mixtures and unknown data use the
    // original current-value reader; a tolerance never decides predicate truth.
    if (!Number.isFinite(distance) || !(distance > slack) || !rate) return;
    remaining = Math.min(afterSeconds, distance / Math.abs(rate)) / 4;
    if (!(remaining > 0) || !Number.isFinite(remaining)) return;
  }
  let answers = negativeConditions.get(condition);
  if (!answers) negativeConditions.set(condition, (answers = new WeakMap()));
  answers.set(operation, {
    entityId: entity.id,
    definition,
    anchorValue: input.anchorValue,
    anchorRevision: anchor.revision,
    threshold,
    from: binding.from,
    rate,
    segmentCount: segments.length,
    segment: new WeakRef(segment),
    remaining,
  });
}
export function canActivateStatusEffect(
  world: WorldState,
  bindings: EffectBindings,
  definition: StatusEffectDefinition,
): boolean {
  if (definition.contribution && !bindings.subject.actor) return false;
  // The current rate family advances exposed objects. Contained processing needs
  // its own admitted continuation; accepting it here would silently omit its work.
  if (!activelyParticipates(bindings.subject)) return false;
  const occupying = bindings.subject.actor?.action;
  if (
    definition.occupiesAction &&
    occupying?.type === 'status-effect' &&
    !statusDefinitions(world)
      .find((d) => d.id === occupying.definitionId)
      ?.interruptOn.includes('new-action')
  )
    return false;
  return (
    definition.enabled &&
    !(definition.contribution
      ? activeContributionId(
          bindings.subject,
          definition.id,
          bindings.source?.id ?? bindings.subject.id,
        )
      : bindings.subject.statusEffects?.[definition.id]?.active) &&
    (!definition.occupiesAction || !!bindings.subject.actor) &&
    matchesStatusCondition(world, bindings, definition.requires) &&
    (!definition.activationCondition ||
      matchesStatusCondition(world, bindings, definition.activationCondition)) &&
    definition.whileActive.every((op) => {
      const change = statusNumericChange(op);
      return (
        !change ||
        typeof readEntityAttribute(world, resolve(change.target, bindings), change.attribute) ===
          'number'
      );
    })
  );
}
export function statusEffectChoiceOutcome(
  definition: StatusEffectDefinition,
  operation: 'activate' | 'deactivate',
) {
  return outcome(
    true,
    'status-effect',
    `${definition.label}: ${operation === 'activate' ? 'activated' : 'deactivated'}.`,
  );
}
export function statusTransitionEvent(
  world: WorldState,
  definition: StatusEffectDefinition,
  bindings: EffectBindings,
  events: WorldEvent[],
  active: boolean,
  reason: string,
): void {
  const operation = active ? definition.onActivate : definition.onDeactivate;
  if (!operation) return;
  const target = resolve(operation.emit.target, bindings);
  if (!target) return;
  // Lifecycle invalidation has its own truthful event; don't announce successful recovery.
  if (!active && reason === 'body-unavailable') return;
  const text = narrationTemplate(operation.emit.narration, { ...bindings });
  emit(world, events, 'state-changed', text, target, undefined, {
    definitionId: definition.id,
    active,
    reason,
    conversationRelevant: true,
  });
}
/** All activation, interruption and expiry use this owner. docs/status-effects.md#transitions */
export function activateStatusEffect(
  world: WorldState,
  definition: StatusEffectDefinition,
  bindings: EffectBindings,
  events: WorldEvent[],
  reason: string,
): boolean {
  if (!canActivateStatusEffect(world, bindings, definition)) return false;
  const entity = bindings.subject,
    actor = entity.actor;
  if (definition.occupiesAction && actor) {
    interruptStatusEffects(world, entity, events, 'new-action');
    if (actor.action)
      finishPlanAction(
        world,
        entity.id,
        actor.action.id,
        outcome(false, 'interrupted', `${definition.label} interrupted the activity.`),
      );
  }
  const episode = nextId(world, 'effect');
  admitStatusWork(world, entity, definition, episode);
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'contribution' });
  (entity.statusEffects ??= {})[definition.contribution ? episode : definition.id] = {
    active: true,
    episode,
    elapsedSeconds: 0,
    automaticAfter: 0,
    sourceId: bindings.source?.id ?? entity.id,
    actionTargetId: bindings.actionTarget?.id ?? entity.id,
    ...(definition.contribution
      ? {
          contribution: {
            definitionId: definition.id,
            definitionDigest: contentLabel(canonicalJson(definition)),
            revision: 1,
            lifetime:
              definition.contribution.lifetime === 'fixed'
                ? {
                    kind: 'fixed' as const,
                    expiresAt: world.simTime + definition.contribution.seconds,
                  }
                : { kind: definition.contribution.lifetime },
          },
        }
      : {}),
  };
  if (definition.contribution) invalidateContributionIndex(entity, world);
  if (definition.occupiesAction && actor) {
    actor.action = {
      id: episode,
      type: 'status-effect',
      definitionId: definition.id,
      stage: 'working',
      remainingSeconds: 0,
      totalSeconds: 0,
      path: [],
      consumed: [],
    };
    actor.planGeneration++;
  }
  statusTransitionEvent(world, definition, bindings, events, true, reason);
  return true;
}
export function deactivateStatusEffect(
  world: WorldState,
  entity: Entity,
  definition: StatusEffectDefinition,
  events: WorldEvent[],
  reason: string,
  sourceId?: string,
): void {
  const key = definition.contribution
    ? activeContributionId(entity, definition.id, sourceId ?? entity.id)
    : definition.id;
  const state = key ? entity.statusEffects?.[key] : undefined;
  if (!state?.active) return;
  releaseWork(world, state.episode);
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'contribution' });
  state.active = false;
  if (state.contribution) state.contribution.revision++;
  state.automaticAfter = world.simTime + definition.reactivationDelaySeconds;
  const actor = entity.actor;
  if (actor?.action?.id === state.episode) {
    finishPlanAction(
      world,
      entity.id,
      state.episode,
      outcome(reason === 'completed', reason === 'completed' ? 'completed' : 'interrupted', reason),
    );
    actor.action = null;
    actor.planGeneration++;
  }
  statusTransitionEvent(
    world,
    definition,
    effectBindings(world, entity, state),
    events,
    false,
    reason,
  );
}
export function interruptStatusEffects(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
  reason: string,
): void {
  for (const state of Object.values(entity.statusEffects ?? {})) {
    if (!state.active || !state.contribution) continue;
    const definition = statusDefinitions(world).find(
      (d) => d.id === state.contribution!.definitionId,
    );
    if (reason === 'body-unavailable' || definition?.interruptOn.includes(reason)) {
      releaseWork(world, state.episode);
      recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'contribution' });
      state.active = false;
      state.contribution.revision++;
    }
  }
  for (const d of statusDefinitions(world))
    if (d.interruptOn.includes(reason) || reason === 'body-unavailable')
      deactivateStatusEffect(world, entity, d, events, reason);
}
function applyRate(
  world: WorldState,
  entity: Entity,
  attributeId: string,
  amount: number,
  events: WorldEvent[],
  feedback: { silent?: boolean; cause?: string } = { silent: true },
): void {
  const d = attributeDefinition(world, attributeId)!,
    prior = readEntityAttribute(world, entity, attributeId);
  if (d.schema.kind !== 'number' || typeof prior !== 'number') return;
  const value = Math.max(d.schema.min, Math.min(d.schema.max, prior + amount));
  if (value === prior) return;
  // The sparse-value writer records condition crossings immediately after this write.
  setAttribute(world, entity, d, value, events, 'now', feedback);
}
/** A conservative participation check, not a condition evaluator. Native rate operations
 * cannot add an absent attribute or actor component; every active instance still runs.
 * Bindings for a new automatic instance all point to its subject. If a new operation can
 * create these capabilities, extend this broad phase before admitting that operation.
 * docs/status-effects.md#native-participation
 */
const statusEligibility = new WeakMap<
  Entity,
  { definitions: StatusEffectDefinition[]; manifest: object; eligible: boolean }
>();
interface AutomaticStatusRoster {
  rules: Array<{ definition: StatusEffectDefinition; order: number }>;
  definitions: StatusEffectDefinition[];
  excluded: ReadonlyMap<string, { definition: StatusEffectDefinition; order: number }>;
}
const automaticRosters = new WeakMap<
  StatusEffectDefinition[],
  Map<string | undefined, Map<string, AutomaticStatusRoster>>
>();
/** Only controller/kind facts can prune this static roster. Every current status operation
 * leaves them unchanged; numeric/body/clock/status inputs remain live and all active rules
 * are merged back below. No second predicate compiler or cached negative meter is added. */
function automaticStatusRoster(world: WorldState, entity: Entity): AutomaticStatusRoster {
  const definitions = statusDefinitions(world),
    actor = readOnlyDraftView(entity).actor;
  const controller = actor && readOnlyDraftView(actor).controller,
    kind = readOnlyDraftView(entity).kind;
  let controllers = automaticRosters.get(definitions);
  const cached = controllers?.get(controller)?.get(kind);
  if (cached) return cached;
  const rules: AutomaticStatusRoster['rules'] = [],
    excluded = new Map<string, AutomaticStatusRoster['rules'][number]>();
  const bindings = effectBindings(world, entity);
  for (let order = 0; order < definitions.length; order++) {
    const definition = definitions[order]!;
    let possible =
      definition.enabled &&
      !!definition.automaticActivation &&
      (!definition.occupiesAction || !!actor);
    for (const { condition, sourcePath } of statusDefinitionConditions(definition)) {
      if (!['requires', 'activationCondition', 'automaticActivation'].includes(sourcePath))
        continue;
      visitStatusCondition(condition, sourcePath, (part, path) => {
        if (
          !possible ||
          path.includes('.any[') ||
          !('field' in part) ||
          !['controller', 'kind'].includes(part.field.name)
        )
          return;
        if (!matchesStatusCondition(world, bindings, part)) possible = false;
      });
    }
    const entry = { definition, order };
    if (possible) rules.push(entry);
    else excluded.set(definition.id, entry);
  }
  const roster = { rules, definitions: rules.map((entry) => entry.definition), excluded };
  if (isImmutableData(definitions)) {
    if (!controllers) automaticRosters.set(definitions, (controllers = new Map()));
    let kinds = controllers.get(controller);
    if (!kinds) controllers.set(controller, (kinds = new Map()));
    kinds.set(kind, roster);
  }
  return roster;
}
function statusReconciliationRules(world: WorldState, entity: Entity): StatusEffectDefinition[] {
  const roster = automaticStatusRoster(world, entity);
  const stored = readOnlyDraftView(entity).statusEffects;
  const states = stored && readOnlyDraftView(stored);
  let merged: AutomaticStatusRoster['rules'] | undefined;
  // Iterate installed excluded definitions, never potentially growing retained
  // contribution history merely to find a current native singleton.
  for (const [id, entry] of roster.excluded) {
    const value = states?.[id];
    if (value && readOnlyDraftView(value).active) (merged ??= [...roster.rules]).push(entry);
  }
  const result = merged ? merged.sort((a, b) => a.order - b.order) : roster.rules;
  if (domainCountersEnabled())
    countDomainWork('statusDormantRulesExcluded', statusDefinitions(world).length - result.length);
  return merged ? result.map((entry) => entry.definition) : roster.definitions;
}
export function mayAdvanceStatusEffects(world: WorldState, entity: Entity): boolean {
  if (entity.actor) return true;
  if (Object.values(entity.statusEffects ?? {}).some((state) => state.active)) return true;
  const definitions = statusDefinitions(world),
    manifest = isDraft(world.moduleManifest) ? current(world.moduleManifest) : world.moduleManifest;
  const reusable =
    Object.isFrozen(entity) && Object.isFrozen(definitions) && Object.isFrozen(manifest);
  const previous = reusable ? statusEligibility.get(entity) : undefined;
  if (previous?.definitions === definitions && previous.manifest === manifest)
    return previous.eligible;
  const eligible = definitions.some(
    (definition) =>
      entity.statusEffects?.[definition.id]?.active ||
      (definition.enabled &&
        !!definition.automaticActivation &&
        (!definition.occupiesAction || !!entity.actor) &&
        definition.whileActive.every((operation) => {
          const change = statusNumericChange(operation);
          return (
            !change || typeof readEntityAttribute(world, entity, change.attribute) === 'number'
          );
        })),
  );
  if (reusable) statusEligibility.set(entity, { definitions, manifest, eligible });
  return eligible;
}
/** Resolve due states without borrowing time from the next interval.
 * docs/simulation-time.md#native-interval-contract */
export function reconcileStatusEffects(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
): void {
  advanceCapabilityContributions(world, entity, events);
  if (!activelyParticipates(entity)) return;
  for (const d of statusReconciliationRules(world, entity)) {
    countDomainWork('statusRulesConsidered');
    // Checking a dormant rule does not need a writable draft. Re-read the latest
    // table each iteration because an earlier rule may activate another status.
    const states = readOnlyDraftView(entity).statusEffects;
    const stored = states && readOnlyDraftView(states)[d.id];
    const state = stored && readOnlyDraftView(stored);
    // An occupying effect requires an actor by the admission contract. Avoid evaluating
    // automatic conditions on every inert object, while still reconciling active states.
    if (
      !state?.active &&
      (!d.enabled || !d.automaticActivation || (d.occupiesAction && !entity.actor))
    )
      continue;
    let bindings = effectBindings(world, entity, state);
    if (
      state?.active &&
      d.whileActive.some((op) => {
        const change = statusNumericChange(op);
        return (
          !!change &&
          typeof readEntityAttribute(world, resolve(change.target, bindings), change.attribute) !==
            'number'
        );
      })
    ) {
      deactivateStatusEffect(world, entity, d, events, 'target-unavailable');
      continue;
    }
    if (state?.active) {
      const reason =
        !d.enabled || !matchesStatusCondition(world, bindings, d.requires)
          ? 'inapplicable'
          : d.automaticDeactivation &&
              matchesStatusCondition(world, bindings, d.automaticDeactivation)
            ? 'completed'
            : undefined;
      if (reason) {
        deactivateStatusEffect(world, entity, d, events, reason);
        continue;
      }
    } else {
      if (!d.automaticActivation || world.simTime < (state?.automaticAfter ?? 0)) continue;
      bindings = effectBindings(world, entity);
      if (
        !matchesStatusCondition(world, bindings, d.automaticActivation) ||
        !activateStatusEffect(world, d, bindings, events, 'automatic')
      )
        continue;
    }
  }
}
export interface StatusRateInterval {
  entityId: string;
  episode: string;
  definition: StatusEffectDefinition;
  rates: Array<{ targetId: string; attribute: string; rate: number }>;
  periodic: Array<{
    targetId: string;
    attribute: string;
    amount: number;
    everyGameSeconds: number;
    unit: 'attribute' | 'fractionOfRange';
  }>;
}

/** Cadence is measured by the saved episode, independent of publication and motion slices.
 * Use the same progress tolerance as the native interval owner at exact endpoints. */
export function periodicChangeCount(elapsed: number, every: number): number {
  return Math.floor((elapsed + TIME_EPSILON) / every);
}
/** Recheck every current predicate and binding, but retain the ordered calculation when
 * its complete selected operations are unchanged. A character starting work therefore
 * cannot reuse an old activeWork answer; unrelated characters avoid new rate objects.
 * Only admitted immutable definitions can supply this derived preparation. */
export function prepareStatusRates(
  world: WorldState,
  entity: Entity,
  previous?: StatusRateInterval[],
): StatusRateInterval[] {
  const result: StatusRateInterval[] = [];
  entity = readOnlyDraftView(entity);
  if (!activelyParticipates(entity)) return previous?.length === 0 ? previous : result;
  const states = entity.statusEffects && readOnlyDraftView(entity.statusEffects);
  for (const definition of statusDefinitions(world)) {
    const stored = states?.[definition.id];
    const state = stored && readOnlyDraftView(stored);
    if (!state?.active) continue;
    const prior = previous?.[result.length];
    const sameEpisode =
      prior?.entityId === entity.id &&
      prior.episode === state.episode &&
      prior.definition === definition &&
      isImmutableData(definition);
    const bindings = effectBindings(world, entity, state);
    let rates: StatusRateInterval['rates'] | undefined = sameEpisode ? undefined : [];
    let periodic: StatusRateInterval['periodic'] | undefined = sameEpisode ? undefined : [];
    let rateCount = 0,
      periodicCount = 0;
    for (const op of definition.whileActive) {
      const change = statusNumericChange(op);
      if (!change || ('when' in op && op.when && !matchesStatusCondition(world, bindings, op.when)))
        continue;
      const target = resolve(change.target, bindings);
      if (!target || typeof readEntityAttribute(world, target, change.attribute) !== 'number')
        continue;
      if ('changeRate' in op) {
        const old = prior?.rates[rateCount];
        if (
          !rates &&
          (!old ||
            old.targetId !== target.id ||
            old.attribute !== change.attribute ||
            old.rate !== op.changeRate.amount)
        )
          rates = prior!.rates.slice(0, rateCount);
        rates?.push({
          targetId: target.id,
          attribute: change.attribute,
          rate: op.changeRate.amount,
        });
        rateCount++;
      } else if ('changeEvery' in op) {
        const old = prior?.periodic[periodicCount],
          every = op.changeEvery;
        if (
          !periodic &&
          (!old ||
            old.targetId !== target.id ||
            old.attribute !== every.attribute ||
            old.amount !== every.amount ||
            old.everyGameSeconds !== every.everyGameSeconds ||
            old.unit !== every.unit)
        )
          periodic = prior!.periodic.slice(0, periodicCount);
        periodic?.push({ ...every, targetId: target.id });
        periodicCount++;
      }
    }
    if (!rates && prior!.rates.length !== rateCount) rates = prior!.rates.slice(0, rateCount);
    if (!periodic && prior!.periodic.length !== periodicCount)
      periodic = prior!.periodic.slice(0, periodicCount);
    if (sameEpisode && !rates && !periodic) result.push(prior!);
    else
      result.push({
        entityId: entity.id,
        episode: state.episode,
        definition,
        rates: rates ?? prior!.rates,
        periodic: periodic ?? prior!.periodic,
      });
  }
  const reused =
    previous &&
    result.length === previous.length &&
    result.every((interval, index) => interval === previous[index]);
  countDomainWork(reused ? 'nativeStatusParticipantsReused' : 'nativeStatusParticipantsPrepared');
  return reused && previous ? previous : result;
}
/** Entities that another participant's active status binds as source or action target, or
 * whose attribute another entity's status changes. A change concerning only one entity can be
 * re-predicted locally only when no other entity's conditions or rates depend on it. */
export function crossStatusReferences(
  world: WorldState,
  statusIds: readonly string[],
  status: readonly StatusRateInterval[],
): Set<string> {
  const referenced = new Set<string>();
  for (const id of statusIds)
    for (const state of Object.values(entityGet(world.entities, id)?.statusEffects ?? {}))
      if (state.active) {
        if (state.sourceId !== id) referenced.add(state.sourceId);
        if (state.actionTargetId !== id) referenced.add(state.actionTargetId);
      }
  for (const interval of status)
    for (const { targetId } of [...interval.rates, ...interval.periodic])
      if (targetId !== interval.entityId) referenced.add(targetId);
  return referenced;
}
/** A native linear drain that a coupled status rate folds into one net flow (PF13.12). */
export interface NativeDrain {
  targetId: string;
  attribute: string;
  rate: number;
  kind: 'reservoir';
}
/** Integrate captured status rates. A value changed by one rate, or by several of one sign
 * with no native drain, keeps its serial clamp exactly. A value with opposing rates or a
 * folded native drain follows their sum as one projected net flow: the continuous limit of
 * serial clamps as the step shrinks, pinned at a schema bound while the sum points outward.
 * Serial clamps there depended on how an interval was divided and could shrink boundaries
 * toward zero (docs/worlds/base/time.md#physiology-and-effects). */
export interface BodyRateInterval {
  targetId: string;
  attribute: string;
  amount: number;
  causes: string[];
  /** Separate actual occurrences share the existing body-before-action phase. */
  periodicChanges?: Array<{
    amount: number;
    cause: string;
    causeLabel: string;
    causeMeaning?: string;
  }>;
}
export function applyBodyRate(
  world: WorldState,
  rate: BodyRateInterval,
  events: WorldEvent[],
): void {
  const target = entityGet(world.entities, rate.targetId),
    actor = target?.actor,
    definition = attributeDefinition(world, rate.attribute);
  if (
    !target ||
    !actor?.body ||
    !actor.alive ||
    actor.incapacitated ||
    !definition ||
    definition.schema.kind !== 'number'
  )
    return;
  const prior = readAttribute(world, target, definition);
  if (typeof prior !== 'number') return;
  const range = attributeRange(actor, definition);
  const value = Math.max(range.min, Math.min(range.max, prior + rate.amount));
  if (value !== prior) {
    commitHealthChange(
      world,
      target,
      rate.amount * (actor.body.maxHealth / (range.max - range.min)),
      rate.causes.length === 1 ? rate.causes[0]! : 'combined-status-rates',
      events,
    );
  }
  for (const change of rate.periodicChanges ?? []) {
    if (!actor.alive || actor.incapacitated) break;
    commitHealthChange(
      world,
      target,
      change.amount,
      change.cause,
      events,
      change.causeLabel,
      change.causeMeaning,
    );
  }
}
/** Arithmetic grouping belongs to one captured interval. The caller revalidates the active
 * episode subset before reuse; time, ranges, periodic occurrences and accounting stay live.
 * docs/projects/performance-overhaul/simulation.md#pf1710--prepare-status-operations-and-net-flows-once */
export function prepareStatusIntegration(
  world: WorldState,
  active: readonly StatusRateInterval[],
  drains: readonly NativeDrain[] = [],
) {
  countDomainWork('statusFlowPreparations');
  const flows = new Map<
    string,
    {
      targetId: string;
      attribute: string;
      rate: number;
      signs: Set<number>;
      drained: boolean;
      causes?: Set<string>;
    }
  >();
  const add = (
    targetId: string,
    attribute: string,
    rate: number,
    drained: boolean,
    cause?: string,
  ) => {
    const key = JSON.stringify([targetId, attribute]);
    let flow = flows.get(key);
    if (!flow) {
      flow = { targetId, attribute, rate: 0, signs: new Set(), drained: false };
      if (attributeDefinition(world, attribute)?.implementation === 'native-health-v1')
        flow.causes = new Set();
      flows.set(key, flow);
    }
    flow.rate += rate;
    if (rate) flow.signs.add(Math.sign(rate));
    if (rate && cause !== undefined) flow.causes?.add(cause);
    flow.drained ||= drained;
  };
  if (
    drains.length ||
    active.some(
      (interval) =>
        interval.rates.length > 1 ||
        interval.rates.some(
          (rate) =>
            attributeDefinition(world, rate.attribute)?.implementation === 'native-health-v1',
        ),
    ) ||
    active.length > 1
  ) {
    for (const interval of active) {
      const cause = interval.definition.lifecycleCause ?? interval.definition.id;
      for (const { targetId, attribute, rate } of interval.rates)
        add(targetId, attribute, rate, false, cause);
    }
    for (const drain of drains) add(drain.targetId, drain.attribute, drain.rate, true);
  }
  const net = new Set(
    [...flows]
      .filter(([, flow]) => flow.drained || flow.signs.size > 1 || flow.causes !== undefined)
      .map(([key]) => key),
  );
  // Writer membership is part of this captured active subset, just like net-flow
  // grouping. Preserve repeated same-episode operations without rebuilding this
  // map on every integration; a duplicate interval remains a competing occurrence.
  const writers = new Map<string, number | null>();
  for (let index = 0; index < active.length; index++) {
    const interval = active[index]!;
    for (const rate of interval.rates) {
      const key = JSON.stringify([rate.targetId, rate.attribute]);
      if (!writers.has(key)) writers.set(key, index);
      else if (writers.get(key) !== index) writers.set(key, null);
    }
    for (const change of interval.periodic)
      writers.set(JSON.stringify([change.targetId, change.attribute]), null);
  }
  for (const drain of drains) writers.set(JSON.stringify([drain.targetId, drain.attribute]), null);
  const arithmetic = active.map((interval, index) => {
    const requirements = statusArithmeticRequirements(interval.definition);
    if (interval.periodic.length || !interval.rates.length || !requirements.linear) return;
    const attributes: Record<string, NativeValueAttribute> = {};
    const values: Array<{ id: string; thresholds: number[]; conditionVersion?: number }> = [];
    for (const rate of interval.rates) {
      const key = JSON.stringify([rate.targetId, rate.attribute]);
      if (rate.targetId !== interval.entityId || writers.get(key) !== index || net.has(key)) return;
      let attribute = attributes[rate.attribute];
      if (!attribute) {
        const definition = attributeDefinition(world, rate.attribute);
        if (
          !definition ||
          definition.implementation !== 'number-v1' ||
          definition.schema.kind !== 'number' ||
          definition.reservoir
        )
          return;
        const thresholds = statusArithmeticThresholds(definition);
        values.push({
          id: definition.id,
          thresholds,
          ...(definition.condition ? { conditionVersion: definition.version } : {}),
        });
        attributes[definition.id] = attribute = {
          rates: [],
          min: definition.schema.min,
          max: definition.schema.max,
          changed: true,
        };
      }
      attribute.rates.push(rate.rate);
    }
    return { attributes, values, requirements };
  });
  return {
    active,
    drains,
    arithmetic,
    manifest: isDraft(world.moduleManifest) ? current(world.moduleManifest) : world.moduleManifest,
    policy: isDraft(world.statusEffectPolicy)
      ? current(world.statusEffectPolicy)
      : world.statusEffectPolicy,
    flows,
    net,
    healthCauses: new Map([...flows].map(([key, flow]) => [key, [...(flow.causes ?? [])].sort()])),
    serial: active.flatMap((interval) =>
      interval.rates.filter(
        ({ targetId, attribute }) => !net.has(JSON.stringify([targetId, attribute])),
      ),
    ),
  };
}
interface StatusArithmeticRequirements {
  linear: boolean;
  source: boolean;
  actionTarget: boolean;
}
const exactLinearDefinitions = new WeakMap<StatusEffectDefinition, StatusArithmeticRequirements>();
function statusArithmeticRequirements(
  definition: StatusEffectDefinition,
): StatusArithmeticRequirements {
  const cached = exactLinearDefinitions.get(definition);
  if (cached) return cached;
  const requirements = { linear: true, source: false, actionTarget: false };
  const reference = (target: EntityReference) => {
    if (target === '$source') requirements.source = true;
    if (target === '$actionTarget') requirements.actionTarget = true;
  };
  for (const operation of definition.whileActive) {
    if ('changeRate' in operation) reference(operation.changeRate.target);
    else if (!('restrictCapabilities' in operation)) requirements.linear = false;
  }
  for (const { condition, sourcePath } of statusDefinitionConditions(definition))
    visitStatusCondition(condition, sourcePath, (part) => {
      if ('compare' in part) reference(part.compare.target);
      if ('field' in part) reference(part.field.target);
      if ('hasAttribute' in part) reference(part.hasAttribute.target);
      if ('statusActive' in part) reference(part.statusActive.target);
    });
  if (isImmutableData(definition)) exactLinearDefinitions.set(definition, requirements);
  return requirements;
}
/** The same exact boundaries govern runtime retention and cold saved continuation.
 * Ordinary numeric attributes have definition-owned ranges; health stays eager. */
export function statusArithmeticThresholds(
  definition: import('./world-modules.js').AttributeDefinition,
): number[] {
  if (definition.schema.kind !== 'number') throw new Error('Native arithmetic needs a number.');
  const thresholds = [definition.schema.min, definition.schema.max];
  if (definition.concern) {
    const below = attributeThreshold(
      undefined,
      definition,
      definition.concern.below,
      definition.concern.unit,
    );
    thresholds.push(
      below,
      Math.min(definition.schema.max, below + (definition.concern.recoveryMargin ?? 0)),
    );
  }
  if (definition.condition)
    for (const band of definition.condition.bands)
      thresholds.push(
        band.below,
        Math.min(definition.schema.max, band.below + definition.condition.recoveryMargin),
      );
  return thresholds;
}
/** Validate captured operations against their admitted meaning, not today's predicate
 * truth: a new action at the endpoint may legitimately select a different next rate.
 * The existing invocation definition pin protects the complete installed definition.
 * Conditional selections are saved history, not an authenticated historical proof,
 * just as an ordinary saved meter cannot prove which earlier actions earned it. */
export function validateRetainedStatusArithmetic(
  world: WorldState,
  entity: Entity,
  state: StatusEffectInstance,
  definition: StatusEffectDefinition,
  attributes: Readonly<Record<string, NativeValueAttribute>>,
  demand: import('./work-budget.js').WorkDemand,
): void {
  const fail: () => never = () => {
    throw new Error('Invalid saved native arithmetic meaning.');
  };
  const requirements = statusArithmeticRequirements(definition);
  if (
    !requirements.linear ||
    state.contribution ||
    !state.active ||
    !entity.actor ||
    (requirements.source && state.sourceId !== entity.id) ||
    (requirements.actionTarget && state.actionTargetId !== entity.id)
  )
    fail();
  const cost = statusWork(definition);
  if (
    Object.keys(demand).length !== 2 ||
    demand.tests !== cost.tests ||
    demand.effects !== cost.effects
  )
    fail();
  const operations = new Map<string, Array<{ rate: number; optional: boolean }>>();
  const bindings = effectBindings(world, entity, state);
  for (const operation of definition.whileActive) {
    if (!('changeRate' in operation)) continue;
    const change = operation.changeRate;
    const target = resolve(change.target, bindings);
    if (target?.id !== entity.id) fail();
    const values = operations.get(change.attribute) ?? [];
    values.push({ rate: change.amount, optional: operation.when !== undefined });
    operations.set(change.attribute, values);
  }
  for (const [id, choices] of operations) {
    const actual = attributes[id]?.rates ?? [];
    // At most 32 admitted operations: preserve mandatory operations and original
    // order while allowing conditional operations that were inactive then.
    let positions = new Set([0]);
    for (const choice of choices) {
      const next = choice.optional ? new Set(positions) : new Set<number>();
      for (const position of positions)
        if (actual[position] === choice.rate) next.add(position + 1);
      positions = next;
    }
    if (!positions.has(actual.length)) fail();
  }
  for (const [id, captured] of Object.entries(attributes)) {
    const attribute = attributeDefinition(world, id);
    if (
      !operations.has(id) ||
      !attribute ||
      attribute.implementation !== 'number-v1' ||
      attribute.schema.kind !== 'number' ||
      attribute.reservoir ||
      captured.min !== attribute.schema.min ||
      captured.max !== attribute.schema.max ||
      new Set(captured.rates.filter((rate) => rate !== 0).map(Math.sign)).size > 1
    )
      fail();
  }
}
export function integrateStatusRates(
  world: WorldState,
  intervals: readonly StatusRateInterval[],
  seconds: number,
  events: WorldEvent[],
  drains: readonly NativeDrain[] = [],
  deferBodyRates = false,
  preparation?: ReturnType<typeof prepareStatusIntegration>,
  retainValues = false,
): BodyRateInterval[] {
  const active = intervals.filter((interval) => {
    const state = entityGet(world.entities, interval.entityId)?.statusEffects?.[
      interval.definition.id
    ];
    return state?.active && state.episode === interval.episode;
  });
  const manifest = isDraft(world.moduleManifest)
      ? current(world.moduleManifest)
      : world.moduleManifest,
    policy = isDraft(world.statusEffectPolicy)
      ? current(world.statusEffectPolicy)
      : world.statusEffectPolicy;
  const reuse =
    preparation &&
    isImmutableData(manifest) &&
    isImmutableData(policy) &&
    preparation.manifest === manifest &&
    preparation.policy === policy &&
    preparation.drains === drains &&
    preparation.active.length === active.length &&
    active.every((interval, index) => preparation.active[index] === interval);
  const prepared = reuse ? preparation : prepareStatusIntegration(world, active, drains);
  if (reuse) countDomainWork('statusFlowReuses');
  const { flows, net } = prepared;
  // Independent ordinary meters share one episode's elapsed/accounting continuation.
  // Preserve every same-sign addition and clamp; opposite/netted flows and actual
  // threshold side effects remain in their existing eager owners.
  const lazy: Omit<NativeValueBinding, 'from'>[] = [];
  if (retainValues) {
    for (let index = 0; index < active.length; index++) {
      const interval = active[index]!;
      const arithmetic = prepared.arithmetic[index];
      if (!arithmetic) continue;
      const { requirements } = arithmetic;
      const entity = entityGet(readOnlyDraftView(world.entities), interval.entityId)!;
      const state = entity.statusEffects![interval.definition.id]!;
      // Recurrence/ownership fields change only through work mutations, which first
      // materialize pending charges. Counters are projected once at charge preflight.
      const workState = readOnlyDraftView(world).workState;
      const workRecords = workState && readOnlyDraftView(workState).invocations;
      const storedWork = workRecords && readOnlyDraftView(workRecords)[interval.episode];
      const work = storedWork && readOnlyDraftView(storedWork);
      if (
        !entity.actor ||
        state.contribution ||
        (requirements.source && state.sourceId !== entity.id) ||
        (requirements.actionTarget && state.actionTargetId !== entity.id) ||
        !work?.recurrence ||
        work.parentId ||
        work.children ||
        work.rootId !== work.id
      )
        continue;
      let attributes = arithmetic.attributes;
      let eligible = true;
      for (const prepared of arithmetic.values) {
        const attribute = attributes[prepared.id]!;
        const currentValue = currentAttributeState(world, entity, prepared.id)?.value;
        if (typeof currentValue !== 'number') {
          eligible = false;
          break;
        }
        if (prepared.conditionVersion !== undefined) {
          const condition = entity.actor.conditions?.[prepared.id];
          if (
            condition?.version !== prepared.conditionVersion ||
            condition.pending ||
            (condition.nextReviewAt !== undefined && condition.nextReviewAt <= world.simTime)
          ) {
            eligible = false;
            break;
          }
        }
        let value = currentValue;
        let changed = false;
        for (const rate of attribute.rates) {
          const next = Math.max(attribute.min, Math.min(attribute.max, value + rate * seconds));
          if (
            next !== value &&
            prepared.thresholds.some(
              (threshold) =>
                Math.min(value, next) <= threshold && Math.max(value, next) >= threshold,
            )
          ) {
            eligible = false;
            break;
          }
          changed ||= next !== value;
          value = next;
        }
        if (!eligible) break;
        if (!changed) {
          if (attributes === arithmetic.attributes) attributes = { ...attributes };
          attributes[prepared.id] = { ...attribute, changed: false };
        }
      }
      if (!eligible) continue;
      const cost = statusWork(interval.definition);
      lazy.push({
        entityId: entity.id,
        statusId: interval.definition.id,
        episode: interval.episode,
        attributes,
        demand: { tests: cost.tests, effects: cost.effects },
      });
    }
  }
  const retained = retainNativeIntegration(world, lazy, seconds);
  const retainedRates = new Set(
    lazy.flatMap((binding) =>
      Object.keys(binding.attributes).map((id) => JSON.stringify([binding.entityId, id])),
    ),
  );
  const due: Array<{
    interval: StatusRateInterval;
    change: StatusRateInterval['periodic'][number];
    count: number;
  }> = [];
  // Finish captured accounting before health can end any source/target episode.
  for (const interval of active) {
    if (retained.has(interval.episode)) {
      chargeWork({ effects: interval.definition.whileActive.length });
      continue;
    }
    const entity = entityGet(world.entities, interval.entityId)!;
    const state = entity.statusEffects![interval.definition.id]!;
    chargeStatusWork(world, entity, interval.definition, interval.definition.id, state);
    chargeWork({ effects: interval.definition.whileActive.length });
    for (const change of interval.periodic) {
      const count =
        periodicChangeCount(state.elapsedSeconds + seconds, change.everyGameSeconds) -
        periodicChangeCount(state.elapsedSeconds, change.everyGameSeconds);
      if (count > 0) due.push({ interval, change, count });
    }
    state.elapsedSeconds += seconds;
  }
  for (const { targetId, attribute, rate } of prepared.serial) {
    if (retainedRates.has(JSON.stringify([targetId, attribute]))) continue;
    const target = entityGet(world.entities, targetId);
    if (target) applyRate(world, target, attribute, rate * seconds, events);
  }
  const health: BodyRateInterval[] = [];
  for (const key of net) {
    const flow = flows.get(key)!,
      target = entityGet(world.entities, flow.targetId);
    if (!target) continue;
    const definition = attributeDefinition(world, flow.attribute)!;
    if (definition.implementation === 'native-health-v1') {
      // Collect causes with their rates, rather than rescanning every subject for each
      // body. Sorting preserves lifecycle attribution (docs/status-effects.md#transitions).
      health.push({
        targetId: target.id,
        attribute: flow.attribute,
        amount: flow.rate * seconds,
        causes: prepared.healthCauses.get(key)!,
      });
    } else applyRate(world, target, flow.attribute, flow.rate * seconds, events);
  }
  const healthByTarget = new Map(health.map((rate) => [rate.targetId, rate]));
  for (const { interval, change, count } of due) {
    const target = entityGet(world.entities, change.targetId),
      definition = attributeDefinition(world, change.attribute);
    if (!target || !definition || definition.schema.kind !== 'number') continue;
    const bounds = target.actor ? attributeRange(target.actor, definition) : definition.schema;
    const range = bounds.max - bounds.min;
    const amount = change.amount * (change.unit === 'fractionOfRange' ? range : 1);
    const cause = interval.definition.lifecycleCause ?? interval.definition.id;
    if (definition.implementation === 'native-health-v1' && target.actor?.body) {
      let rate = healthByTarget.get(target.id);
      if (!rate) {
        rate = { targetId: target.id, attribute: change.attribute, amount: 0, causes: [] };
        healthByTarget.set(target.id, rate);
        health.push(rate);
      }
      const rawAmount =
        change.unit === 'fractionOfRange'
          ? change.amount * target.actor.body.maxHealth
          : (amount * target.actor.body.maxHealth) / range;
      for (let occurrence = 0; occurrence < count; occurrence++) {
        chargeWork({ effects: 1 });
        (rate.periodicChanges ??= []).push({
          amount: rawAmount,
          cause,
          causeLabel: interval.definition.label,
          ...(interval.definition.meaning ? { causeMeaning: interval.definition.meaning } : {}),
        });
      }
    } else {
      for (let occurrence = 0; occurrence < count; occurrence++) {
        chargeWork({ effects: 1 });
        applyRate(world, target, change.attribute, amount, events, { cause });
      }
    }
  }
  // The kernel applies body rates in its existing ordered body/action phase. Captured
  // accounting above cannot recreate a live invocation after another body's death.
  if (!deferBodyRates) for (const rate of health) applyBodyRate(world, rate, events);
  return health;
}
/** Explicit effect-only advancement; the kernel captures all subjects before integrating. */
export function advanceStatusEffects(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  reconcileStatusEffects(world, entity, events);
  integrateStatusRates(world, prepareStatusRates(world, entity), seconds, events);
  reconcileStatusEffects(world, entity, events);
}
export function admitStatusEffectPolicy(
  input: WorldState,
  proposed: unknown,
  expectedRevision: number,
): Transition {
  try {
    validateStatusEffectPolicy(input, proposed);
    validateBodyPolicy(
      input.moduleManifest.bodyPolicy,
      input.moduleManifest.definitions,
      new Set(proposed.definitions.map((d) => d.id)),
      input.itemDefinitions,
    );
    if (
      input.cognitionPolicy.dream &&
      !proposed.definitions.some((d) => d.id === input.cognitionPolicy.dream?.statusEffectId)
    )
      throw new Error('Status definition is required by cognition policy.');
  } catch (error) {
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'invalid-policy',
        error instanceof Error ? error.message : 'Invalid status effect policy.',
      ),
    };
  }
  if (
    input.statusEffectPolicy.revision !== expectedRevision ||
    proposed.revision !== expectedRevision + 1
  )
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'stale-policy',
        'Status effect policy changed; refresh before editing.',
      ),
    };
  const world = draftWorld(input),
    events: WorldEvent[] = [];
  // End affected instances under their old definition before replacing its semantics.
  const changed = world.statusEffectPolicy.definitions.filter(
    (old) =>
      canonicalJson(old) !==
      canonicalJson(proposed.definitions.find((d) => d.id === old.id) ?? null),
  );
  const retained = new Set(proposed.definitions.map((d) => d.id));
  // Ending a contribution does not erase its exact historical definition pin.
  const changedIds = new Set(changed.map((d) => d.id));
  if (
    changed.length &&
    entityValues(input.entities).some(
      (entity) => !completeContributionHistory(entity.statusEffects),
    )
  )
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'history-unavailable',
        'Materialize contribution history before replacing definitions.',
      ),
    };
  if (
    entityValues(input.entities).some((entity) =>
      Object.values(entity.statusEffects ?? {}).some(
        (state) => state.contribution && changedIds.has(state.contribution.definitionId),
      ),
    )
  )
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'pinned-contribution',
        'Retained contributions require their exact definition.',
      ),
    };
  for (const entity of entityValues(world.entities))
    for (const old of changed) {
      deactivateStatusEffect(world, entity, old, events, 'policy-changed');
      if (!retained.has(old.id) && entity.statusEffects) delete entity.statusEffects[old.id];
    }
  world.statusEffectPolicy = cloneValue(proposed);
  return finish(world, events, outcome(true, 'policy-admitted', 'Status effect policy updated.'));
}
export { validateStatusEffectPolicy };

export {
  capabilityBlocked,
  activeStatusEffects,
  projectStatusEffects,
  activeContributionId,
  isStatusDefinitionActive,
} from './status-capabilities.js';
