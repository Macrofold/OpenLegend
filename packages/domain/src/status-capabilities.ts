import { entityGet, entityValues } from './entity-collection.js';
import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';
import type { Capability, StatusEffectDefinition, StatusPresentation } from './status-effects.js';
import { objectAncestors, directChildIds, parentOf } from './objects.js';
import { isImmutableData } from './records.js';
import { activelyParticipates } from './participation-state.js';
import { chargeWork } from './work-budget.js';
import { readOnlyDraftView } from './draft.js';
import { countDomainWork } from './diagnostic-counters.js';

// Definitions are replaced only at admission; never traverse readonly rules through draft proxies.
// docs/status-effects.md#admission-and-persistence
export function statusDefinitions(world: WorldState): StatusEffectDefinition[] {
  const policy = readOnlyDraftView(world).statusEffectPolicy;
  return (isDraft(policy) ? original(policy)! : policy).definitions;
}
const restrictionDefinitions = new WeakMap<StatusEffectDefinition[], Map<Capability, string[]>>();
function restrictions(world: WorldState, capability: Capability): string[] {
  const definitions = statusDefinitions(world);
  const reusable = isImmutableData(definitions);
  let compiled = reusable ? restrictionDefinitions.get(definitions) : undefined;
  if (!compiled) {
    compiled = new Map();
    if (reusable) restrictionDefinitions.set(definitions, compiled);
  }
  let ids = compiled.get(capability);
  if (!ids) {
    ids = definitions
      .filter((definition) =>
        definition.whileActive.some(
          (operation) =>
            'restrictCapabilities' in operation &&
            operation.restrictCapabilities.capabilities.includes(capability),
        ),
      )
      .map((definition) => definition.id);
    compiled.set(capability, ids);
  }
  return ids;
}

type States = NonNullable<Entity['statusEffects']>;
type SourceBinding = { targetId: string; contributionId: string };
type SourceIndex = Map<string, readonly SourceBinding[]>;
const sourceIndexes = new WeakMap<WorldState['entities'], SourceIndex>();
const pendingSources = new WeakMap<WorldState, Set<string>>();
function sourceBindings(entity: Entity | undefined): Array<[string, SourceBinding]> {
  return Object.entries(entity?.statusEffects ?? {}).flatMap(([contributionId, state]) =>
    state.active && state.contribution
      ? [[state.sourceId, { targetId: entity!.id, contributionId }] as [string, SourceBinding]]
      : [],
  );
}
function sources(entities: WorldState['entities']): SourceIndex {
  const cached = isImmutableData(entities) ? sourceIndexes.get(entities) : undefined;
  if (cached) return cached;
  const index = new Map<string, SourceBinding[]>();
  for (const entity of entityValues(entities)) {
    chargeWork({ candidates: 1 });
    for (const [source, binding] of sourceBindings(entity)) {
      let bindings = index.get(source);
      if (!bindings) index.set(source, (bindings = []));
      bindings.push(binding);
    }
  }
  if (isImmutableData(entities)) sourceIndexes.set(entities, index);
  return index;
}
/** Source changes can alter a sustained restriction on an unchanged target.
 * Changed participation or custody also affects sources contained below it. */
export function* contributionDependentIds(
  world: WorldState,
  baseline: WorldState,
  changed: ReadonlySet<string>,
): Generator<string> {
  if (!changed.size || !statusDefinitions(world).some((definition) => definition.contribution))
    return;
  const sourceIds = new Set(changed),
    hierarchyChanges: string[] = [],
    currentEntities = readOnlyDraftView(world).entities;
  for (const id of changed) {
    const before = entityGet(baseline.entities, id),
      after = entityGet(currentEntities, id);
    if (
      activelyParticipates(before) === activelyParticipates(after) &&
      parentOf(before) === parentOf(after)
    )
      continue;
    hierarchyChanges.push(id);
  }
  for (const snapshot of [baseline, world]) {
    const pending = [...hierarchyChanges],
      seen = new Set<string>();
    while (pending.length) {
      const parent = pending.pop()!;
      if (seen.has(parent)) continue;
      seen.add(parent);
      for (const child of directChildIds(snapshot, parent)) {
        sourceIds.add(child);
        pending.push(child);
      }
    }
  }
  const base = isDraft(world) ? original(world)! : world;
  const index = sources(base.entities);
  for (const id of sourceIds) for (const binding of index.get(id) ?? []) yield binding.targetId;
  for (const targetId of pendingSources.get(world) ?? [])
    if (sourceBindings(entityGet(world.entities, targetId)).some(([id]) => sourceIds.has(id)))
      yield targetId;
}
/** Reverse membership is derived once, then maintained from the authoritative write
 * set. Carried sources cannot be merged away merely because their target owns the state. */
export function contributionSourceBound(world: WorldState, sourceId: string): boolean {
  const base = isDraft(world) ? original(world)! : world;
  const matches = (binding: SourceBinding) => {
    const state = entityGet(world.entities, binding.targetId)?.statusEffects?.[
      binding.contributionId
    ];
    return !!state?.active && !!state.contribution && state.sourceId === sourceId;
  };
  if (sources(base.entities).get(sourceId)?.some(matches)) return true;
  for (const targetId of pendingSources.get(world) ?? [])
    if (sourceBindings(entityGet(world.entities, targetId)).some(([id]) => id === sourceId))
      return true;
  return false;
}
export function captureContributionSources(
  draft: WorldState,
): (result: WorldState, changed: ReadonlySet<string>) => void {
  const base = original(draft)!;
  const prior = sourceIndexes.get(base.entities);
  pendingSources.delete(draft);
  return (result, changed) => {
    if (!prior || base.entities === result.entities) return;
    const changes = new Map<string, { removed: Set<string>; added: SourceBinding[] }>();
    const change = (source: string) => {
      let entry = changes.get(source);
      if (!entry) changes.set(source, (entry = { removed: new Set(), added: [] }));
      return entry;
    };
    for (const id of changed) {
      if (
        entityGet(base.entities, id)?.statusEffects ===
        entityGet(result.entities, id)?.statusEffects
      )
        continue;
      for (const [source] of sourceBindings(entityGet(base.entities, id)))
        change(source).removed.add(id);
      for (const [source, binding] of sourceBindings(entityGet(result.entities, id)))
        change(source).added.push(binding);
    }
    const index = changes.size ? new Map(prior) : prior;
    for (const [source, delta] of changes) {
      const bindings = [
        ...(prior.get(source) ?? []).filter((binding) => !delta.removed.has(binding.targetId)),
        ...delta.added,
      ];
      if (bindings.length) index.set(source, bindings);
      else index.delete(source);
    }
    if (isImmutableData(result.entities)) sourceIndexes.set(result.entities, index);
  };
}
function effectiveContribution(world: WorldState, state: States[string] | undefined): boolean {
  state = state && readOnlyDraftView(state);
  if (!state?.active) return false;
  const contribution = state.contribution && readOnlyDraftView(state.contribution);
  const storedLifetime = contribution?.lifetime;
  const lifetime = storedLifetime && readOnlyDraftView(storedLifetime);
  if (lifetime?.kind === 'fixed') return world.simTime < lifetime.expiresAt;
  if (lifetime?.kind !== 'source-sustained') return true;
  const storedSource = entityGet(readOnlyDraftView(world.entities), state.sourceId);
  const source = storedSource && readOnlyDraftView(storedSource);
  const actor = source?.actor && readOnlyDraftView(source.actor);
  return (
    !!source &&
    !source.retirement &&
    actor?.alive !== false &&
    activelyParticipates(objectAncestors(world, source.id).at(-1))
  );
}
const contributionIndexes = new WeakMap<States, Map<string, string[]>>();
/** Index membership only. Active state is always read from the current draft. */
function contributionIndex(states: States): Map<string, string[]> {
  const cached = contributionIndexes.get(states);
  if (cached) return cached;
  const index = new Map<string, string[]>();
  const view = readOnlyDraftView(states);
  for (const id in view) {
    const state = readOnlyDraftView(view[id]!);
    const contribution = state.contribution && readOnlyDraftView(state.contribution);
    const definition = contribution?.definitionId;
    if (!definition) continue;
    const keys = index.get(definition) ?? [];
    keys.push(id);
    index.set(definition, keys);
  }
  if (isDraft(states) || isImmutableData(states)) contributionIndexes.set(states, index);
  return index;
}
export function invalidateContributionIndex(entity: Entity, world?: WorldState): void {
  if (entity.statusEffects) contributionIndexes.delete(entity.statusEffects);
  if (world) {
    if (isDraft(world)) {
      let pending = pendingSources.get(world);
      if (!pending) pendingSources.set(world, (pending = new Set()));
      pending.add(entity.id);
    } else sourceIndexes.delete(world.entities);
  }
}
function definitionActive(
  states: States,
  id: string,
  independent: Map<string, string[]>,
  world?: WorldState,
): boolean {
  const view = readOnlyDraftView(states);
  const stored = view[id];
  const native = stored && readOnlyDraftView(stored);
  if (native?.active && !native.contribution) return true;
  return (
    independent.get(id)?.some((key) => {
      const state = view[key];
      return world ? effectiveContribution(world, state) : state && readOnlyDraftView(state).active;
    }) ?? false
  );
}
export function activeContributionId(
  entity: Entity,
  definitionId: string,
  sourceId: string,
): string | undefined {
  const states = readOnlyDraftView(entity).statusEffects;
  return states
    ? contributionIndex(states)
        .get(definitionId)
        ?.find((id) => {
          const stored = readOnlyDraftView(states)[id];
          const state = stored && readOnlyDraftView(stored);
          return state?.active && state.sourceId === sourceId;
        })
    : undefined;
}
export function isStatusDefinitionActive(
  entity: Entity,
  definitionId: string,
  world?: WorldState,
): boolean {
  const states = readOnlyDraftView(entity).statusEffects;
  return !!states && definitionActive(states, definitionId, contributionIndex(states), world);
}
const capabilityBits: Record<Capability, number> = {
  actions: 1,
  locomotion: 2,
  speech: 4,
  perception: 8,
};
type CapabilityPreparation = {
  from: number;
  until: number;
  mask: number;
  active: StatusEffectDefinition[];
  dynamic: boolean;
  public?: Array<{ id: string; label: string } & StatusPresentation>;
  owner?: Array<{ id: string; label: string } & StatusPresentation>;
};
const capabilityPreparations = new WeakMap<
  States,
  WeakMap<StatusEffectDefinition[], CapabilityPreparation>
>();
function currentStatusPreparation(world: WorldState, entity: Entity): CapabilityPreparation {
  const states = readOnlyDraftView(readOnlyDraftView(entity).statusEffects!),
    definitions = statusDefinitions(world),
    reusable = isImmutableData(states) && isImmutableData(definitions),
    cached = reusable ? capabilityPreparations.get(states)?.get(definitions) : undefined;
  if (cached && world.simTime >= cached.from && world.simTime < cached.until) {
    countDomainWork('nativeCapabilityReuses');
    return cached;
  }
  const independent = contributionIndex(states);
  let until = Infinity,
    dynamic = false,
    mask = 0;
  for (const stored of Object.values(states)) {
    const state = readOnlyDraftView(stored);
    if (!state.active) continue;
    const contribution = state.contribution && readOnlyDraftView(state.contribution),
      lifetime = contribution && readOnlyDraftView(contribution.lifetime);
    if (lifetime?.kind === 'source-sustained') dynamic = true;
    if (lifetime?.kind === 'fixed' && lifetime.expiresAt > world.simTime)
      until = Math.min(until, lifetime.expiresAt);
  }
  const active = definitions.filter((d) => definitionActive(states, d.id, independent, world));
  for (const definition of active)
    for (const operation of definition.whileActive)
      if ('restrictCapabilities' in operation)
        for (const capability of operation.restrictCapabilities.capabilities)
          mask |= capabilityBits[capability];
  Object.freeze(active);
  const result: CapabilityPreparation = { from: world.simTime, until, mask, active, dynamic };
  if (reusable && !dynamic) {
    let entries = capabilityPreparations.get(states);
    if (!entries) capabilityPreparations.set(states, (entries = new WeakMap()));
    entries.set(definitions, result);
  }
  countDomainWork('nativeCapabilityPreparations');
  return result;
}
/** Installed restrictions determine eligibility. The same preparation supplies
 * current display facts; foreign sustained sources deliberately remain current.
 * docs/projects/performance-overhaul/animal-execution.md#43-capabilities-and-bodily-dependencies */
export function capabilityBlocked(
  world: WorldState,
  entity: Entity | undefined,
  capability: Capability,
): boolean {
  entity = entity ? (entityGet(readOnlyDraftView(world.entities), entity.id) ?? entity) : undefined;
  const states = entity && readOnlyDraftView(entity).statusEffects;
  if (!states) return false;
  if (!isImmutableData(readOnlyDraftView(states)) || !isImmutableData(statusDefinitions(world))) {
    const independent = contributionIndex(states);
    return restrictions(world, capability).some((id) =>
      definitionActive(states, id, independent, world),
    );
  }
  return !!(currentStatusPreparation(world, entity!).mask & capabilityBits[capability]);
}
/** Dependency token, never authority: includes all active restrictions, expires
 * with fixed contributions, and is intentionally fresh for foreign lifetimes. */
export function statusEffectsReadToken(world: WorldState, entity: Entity): object | undefined {
  const current = entityGet(readOnlyDraftView(world.entities), entity.id) ?? entity;
  return readOnlyDraftView(current).statusEffects
    ? currentStatusPreparation(world, current)
    : undefined;
}

export function activeStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
): StatusEffectDefinition[] {
  entity = entity ? (entityGet(readOnlyDraftView(world.entities), entity.id) ?? entity) : undefined;
  entity = entity && readOnlyDraftView(entity);
  if (!entity?.statusEffects) return [];
  return currentStatusPreparation(world, entity).active;
}
export function projectStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
  audience: 'owner' | 'public' = 'public',
): Array<{ id: string; label: string } & StatusPresentation> {
  entity = entity ? (entityGet(readOnlyDraftView(world.entities), entity.id) ?? entity) : undefined;
  if (!entity || !readOnlyDraftView(entity).statusEffects) return [];
  const prepared = currentStatusPreparation(world, entity);
  const retained = prepared[audience];
  if (retained) return retained;
  const result = prepared.active
    .filter(
      (d) =>
        (d.presentation || d.actions || (audience === 'owner' && d.contribution)) &&
        (!d.contribution || audience === 'owner' || d.contribution.disclosure === 'public'),
    )
    .map((d) => {
      const count =
        d.contribution && entity?.statusEffects
          ? (contributionIndex(entity.statusEffects)
              .get(d.id)
              ?.filter((id) => effectiveContribution(world, entity.statusEffects![id])).length ?? 0)
          : 1;
      return {
        id: d.id,
        label: count > 1 ? `${d.label} (${count} sources)` : d.label,
        ...d.presentation,
      };
    });
  for (const row of result) Object.freeze(row);
  Object.freeze(result);
  prepared[audience] = result;
  return result;
}
