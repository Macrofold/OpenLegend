import { renderNameTemplate } from '@open-legend/language';
import { reconcileConditions } from './conditions.js';
import { admitStatusWork, chargeStatusWork } from './native-work.js';
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
import { draftWorld, cloneValue } from './draft.js';
import { emit, finish, outcome, canonicalJson, contentLabel } from './events.js';
import { finishPlanAction } from './agency.js';
import { nextId } from './data.js';
import { attributeDefinition, readAttribute, setAttribute } from './world-modules.js';
import { setBodyHealth } from './body-state.js';
import { reconcileBody } from './living.js';
import { validateBodyPolicy } from './body-policy.js';
import { validateStatusEffectPolicy } from './status-effect-validation.js';
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
  | { compare: { target: EntityReference; attribute: string; operator: Comparison; value: number } }
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
  | { restrictCapabilities: { target: '$subject'; capabilities: Capability[] } };
export interface StatusPresentation {
  pose?: 'horizontal';
  particle?: { text: string; anchor: 'head'; motion: 'floatAway' };
}
export interface StatusEffectDefinition {
  id: string;
  type: 'statusEffect';
  target: '$subject';
  label: string;
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
  actions?: { activate: string; deactivate: string; allowOther: boolean; activateOther: boolean };
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
    source: state.sourceId === entity.id ? entity : world.entities[state.sourceId],
    actionTarget:
      state.actionTargetId === entity.id ? entity : world.entities[state.actionTargetId],
  };
}
export function readEntityAttribute(
  world: WorldState,
  entity: Entity | undefined,
  id: string,
): number | string | undefined {
  const definition = attributeDefinition(world, id);
  if (!entity || !definition) return undefined;
  return entity.actor ? readAttribute(entity.actor, definition) : entity.attributes?.[id]?.value;
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
    const { target, attribute, operator, value } = c;
    matches = (world, bindings) =>
      compare(readEntityAttribute(world, resolve(target, bindings), attribute), operator, value);
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
                !!e.actor?.action || worldSupport(e) === null || !!e.animal?.fleeSeconds
            : (e: Entity) => e.actor?.[name];
    matches = (_world, bindings) => {
      const entity = resolve(target, bindings);
      return !!entity && compare(read(entity), operator, value);
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
    definition.whileActive.every(
      (op) =>
        !('changeRate' in op) ||
        typeof readEntityAttribute(
          world,
          resolve(op.changeRate.target, bindings),
          op.changeRate.attribute,
        ) === 'number',
    )
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
  const text = renderNameTemplate(operation.emit.narration, { ...bindings });
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
): void {
  const d = attributeDefinition(world, attributeId)!,
    prior = readEntityAttribute(world, entity, attributeId);
  if (d.schema.kind !== 'number' || typeof prior !== 'number') return;
  const value = Math.max(d.schema.min, Math.min(d.schema.max, prior + amount));
  if (value === prior) return;
  setAttribute(world, entity, d, value, events);
  reconcileConditions(world, entity, events);
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
        definition.whileActive.every(
          (operation) =>
            !('changeRate' in operation) ||
            typeof readEntityAttribute(world, entity, operation.changeRate.attribute) === 'number',
        )),
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
  for (const d of statusDefinitions(world)) {
    const state = entity.statusEffects?.[d.id];
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
      d.whileActive.some(
        (op) =>
          'changeRate' in op &&
          typeof readEntityAttribute(
            world,
            resolve(op.changeRate.target, bindings),
            op.changeRate.attribute,
          ) !== 'number',
      )
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
}
/** Conditions use one starting state, including cross-target rate predicates. */
export function prepareStatusRates(world: WorldState, entity: Entity): StatusRateInterval[] {
  const result: StatusRateInterval[] = [];
  if (!activelyParticipates(entity)) return result;
  for (const definition of statusDefinitions(world)) {
    const state = entity.statusEffects?.[definition.id];
    if (!state?.active) continue;
    const bindings = effectBindings(world, entity, state);
    const rates: StatusRateInterval['rates'] = [];
    for (const op of definition.whileActive) {
      if (!('changeRate' in op) || (op.when && !matchesStatusCondition(world, bindings, op.when)))
        continue;
      const target = resolve(op.changeRate.target, bindings);
      if (target && typeof readEntityAttribute(world, target, op.changeRate.attribute) === 'number')
        rates.push({
          targetId: target.id,
          attribute: op.changeRate.attribute,
          rate: op.changeRate.amount,
        });
    }
    result.push({ entityId: entity.id, episode: state.episode, definition, rates });
  }
  return result;
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
    for (const state of Object.values(world.entities[id]?.statusEffects ?? {}))
      if (state.active) {
        if (state.sourceId !== id) referenced.add(state.sourceId);
        if (state.actionTargetId !== id) referenced.add(state.actionTargetId);
      }
  for (const interval of status)
    for (const { targetId } of interval.rates)
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
}
export function applyBodyRate(
  world: WorldState,
  rate: BodyRateInterval,
  events: WorldEvent[],
): void {
  const target = world.entities[rate.targetId],
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
  const prior = readAttribute(actor, definition);
  if (typeof prior !== 'number') return;
  const value = Math.max(
    definition.schema.min,
    Math.min(definition.schema.max, prior + rate.amount),
  );
  if (value === prior) return;
  setBodyHealth(
    actor,
    Math.max(
      0,
      Math.min(
        actor.body.maxHealth,
        actor.health +
          rate.amount * (actor.body.maxHealth / (definition.schema.max - definition.schema.min)),
      ),
    ),
  );
  reconcileBody(
    world,
    target,
    events,
    rate.causes.length === 1 ? rate.causes[0]! : 'combined-status-rates',
  );
}
export function integrateStatusRates(
  world: WorldState,
  intervals: readonly StatusRateInterval[],
  seconds: number,
  events: WorldEvent[],
  drains: readonly NativeDrain[] = [],
  deferBodyRates = false,
): BodyRateInterval[] {
  const active = intervals.filter((interval) => {
    const state = world.entities[interval.entityId]?.statusEffects?.[interval.definition.id];
    return state?.active && state.episode === interval.episode;
  });
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
    const key = `${targetId}\0${attribute}`;
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
  // Finish captured accounting before health can end any source/target episode.
  for (const interval of active) {
    const entity = world.entities[interval.entityId]!;
    const state = entity.statusEffects![interval.definition.id]!;
    chargeStatusWork(world, entity, interval.definition, state);
    chargeWork({ effects: interval.definition.whileActive.length });
    state.elapsedSeconds += seconds;
  }
  for (const interval of active) {
    for (const { targetId, attribute, rate } of interval.rates) {
      const target = world.entities[targetId];
      if (target && !net.has(`${targetId}\0${attribute}`))
        applyRate(world, target, attribute, rate * seconds, events);
    }
  }
  const health: BodyRateInterval[] = [];
  for (const key of net) {
    const flow = flows.get(key)!,
      target = world.entities[flow.targetId];
    if (!target) continue;
    const definition = attributeDefinition(world, flow.attribute)!;
    if (definition.implementation === 'native-health-v1') {
      // Collect causes with their rates, rather than rescanning every subject for each
      // body. Sorting preserves lifecycle attribution (docs/status-effects.md#transitions).
      health.push({
        targetId: target.id,
        attribute: flow.attribute,
        amount: flow.rate * seconds,
        causes: [...flow.causes!].sort(),
      });
    } else applyRate(world, target, flow.attribute, flow.rate * seconds, events);
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
    Object.values(input.entities).some(
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
    Object.values(input.entities).some((entity) =>
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
  for (const entity of Object.values(world.entities))
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
