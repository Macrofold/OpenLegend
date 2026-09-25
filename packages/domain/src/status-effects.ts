import { current, isDraft } from 'immer';
import { statusDefinitions } from './status-capabilities.js';
import { draftWorld, cloneValue } from './draft.js';
import { emit, finish, outcome, canonicalJson } from './events.js';
import { finishPlanAction } from './agency.js';
import { nextId } from './data.js';
import { attributeDefinition, readAttribute, setAttribute } from './world-modules.js';
import { setWildernessNeed } from './worlds/base/needs.js';
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
}
export interface StatusEffectPolicy {
  revision: number;
  clockOffsetHours: number;
  definitions: StatusEffectDefinition[];
}
export interface StatusEffectInstance {
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
export function matchesStatusCondition(
  world: WorldState,
  bindings: EffectBindings,
  condition: StatusCondition,
): boolean {
  if ('all' in condition)
    return condition.all.every((c) => matchesStatusCondition(world, bindings, c));
  if ('any' in condition)
    return condition.any.some((c) => matchesStatusCondition(world, bindings, c));
  if ('compare' in condition) {
    const c = condition.compare;
    return compare(
      readEntityAttribute(world, resolve(c.target, bindings), c.attribute),
      c.operator,
      c.value,
    );
  }
  if ('field' in condition) {
    const c = condition.field,
      e = resolve(c.target, bindings);
    if (!e) return false;
    const value =
      c.name === 'kind'
        ? e.kind
        : c.name === 'grounded'
          ? e.spatial.supportSurfaceId !== null
          : c.name === 'activeWork'
            ? !!e.actor?.action || e.spatial.supportSurfaceId === null || !!e.animal?.fleeSeconds
            : e.actor?.[c.name];
    return compare(value, c.operator, c.value);
  }
  if ('dailyWindow' in condition) {
    const c = condition.dailyWindow,
      hour = (world.simTime / 3600 + world.statusEffectPolicy.clockOffsetHours) % 24;
    return c.start < c.end ? hour >= c.start && hour < c.end : hour >= c.start || hour < c.end;
  }
  const c = condition.statusActive,
    e = resolve(c.target, bindings);
  return !!e && !!e.statusEffects?.[c.definitionId]?.active === c.value;
}
export function canActivateStatusEffect(
  world: WorldState,
  bindings: EffectBindings,
  definition: StatusEffectDefinition,
): boolean {
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
    !bindings.subject.statusEffects?.[definition.id]?.active &&
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
function transitionEvent(
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
  const text = operation.emit.narration.replace(
    /\{(subject|source|actionTarget)\.name\}/g,
    (_, key: keyof EffectBindings) => bindings[key]?.name ?? 'Unknown',
  );
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
  (entity.statusEffects ??= {})[definition.id] = {
    active: true,
    episode,
    elapsedSeconds: 0,
    automaticAfter: 0,
    sourceId: bindings.source?.id ?? entity.id,
    actionTargetId: bindings.actionTarget?.id ?? entity.id,
  };
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
  transitionEvent(world, definition, bindings, events, true, reason);
  return true;
}
export function deactivateStatusEffect(
  world: WorldState,
  entity: Entity,
  definition: StatusEffectDefinition,
  events: WorldEvent[],
  reason: string,
): void {
  const state = entity.statusEffects?.[definition.id];
  if (!state?.active) return;
  state.active = false;
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
  transitionEvent(world, definition, effectBindings(world, entity, state), events, false, reason);
}
export function interruptStatusEffects(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
  reason: string,
): void {
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
  if (d.implementation === 'native-energy-v1') setWildernessNeed(entity.actor!, 'energy', value);
  else if (d.implementation === 'native-fullness-v1')
    setWildernessNeed(entity.actor!, 'fullness', value);
  else setAttribute(world, entity, d, value, events);
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
export function advanceStatusEffects(
  world: WorldState,
  entity: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  for (const d of statusDefinitions(world)) {
    const state = entity.statusEffects?.[d.id];
    if (!state?.active && (!d.enabled || !d.automaticActivation)) continue;
    let bindings = effectBindings(world, entity, state);
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
  // Resolve transitions before rates so newly completed states don't consume two
  // mutually exclusive rates for the same interval. docs/status-effects.md#transitions
  for (const d of statusDefinitions(world)) {
    const state = entity.statusEffects?.[d.id];
    if (!state?.active) continue;
    const bindings = effectBindings(world, entity, state);
    if (
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
    state.elapsedSeconds += seconds;
    for (const op of d.whileActive)
      if ('changeRate' in op && (!op.when || matchesStatusCondition(world, bindings, op.when))) {
        const target = resolve(op.changeRate.target, bindings)!;
        applyRate(world, target, op.changeRate.attribute, op.changeRate.amount * seconds, events);
      }
    if (
      state.active &&
      d.automaticDeactivation &&
      matchesStatusCondition(world, bindings, d.automaticDeactivation)
    )
      deactivateStatusEffect(world, entity, d, events, 'completed');
  }
}
export function admitStatusEffectPolicy(
  input: WorldState,
  proposed: unknown,
  expectedRevision: number,
): Transition {
  try {
    validateStatusEffectPolicy(input, proposed);
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
} from './status-capabilities.js';
