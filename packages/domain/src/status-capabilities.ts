import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';
import type { Capability, StatusEffectDefinition, StatusPresentation } from './status-effects.js';
import { objectAncestors } from './objects.js';
import { activelyParticipates } from './participation-state.js';
import { chargeWork } from './work-budget.js';

// Definitions are replaced only at admission; never traverse readonly rules through draft proxies.
// docs/status-effects.md#admission-and-persistence
export function statusDefinitions(world: WorldState): StatusEffectDefinition[] {
  const policy = world.statusEffectPolicy;
  return (isDraft(policy) ? original(policy)! : policy).definitions;
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
  let index = Object.isFrozen(entities) ? sourceIndexes.get(entities) : undefined;
  if (index) return index;
  index = new Map();
  for (const entity of Object.values(entities)) {
    chargeWork({ candidates: 1 });
    for (const [source, binding] of sourceBindings(entity))
      index.set(source, [...(index.get(source) ?? []), binding]);
  }
  if (Object.isFrozen(entities)) sourceIndexes.set(entities, index);
  return index;
}
/** Reverse membership is derived once, then maintained from the authoritative write
 * set. Carried sources cannot be merged away merely because their target owns the state. */
export function contributionSourceBound(world: WorldState, sourceId: string): boolean {
  const base = isDraft(world) ? original(world)! : world;
  const matches = (binding: SourceBinding) => {
    const state = world.entities[binding.targetId]?.statusEffects?.[binding.contributionId];
    return !!state?.active && !!state.contribution && state.sourceId === sourceId;
  };
  if (sources(base.entities).get(sourceId)?.some(matches)) return true;
  for (const targetId of pendingSources.get(world) ?? [])
    if (sourceBindings(world.entities[targetId]).some(([id]) => id === sourceId)) return true;
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
    let index = prior;
    for (const id of changed) {
      if (base.entities[id]?.statusEffects === result.entities[id]?.statusEffects) continue;
      const before = sourceBindings(base.entities[id]),
        after = sourceBindings(result.entities[id]);
      if (!before.length && !after.length) continue;
      if (index === prior) index = new Map(prior);
      for (const source of new Set(before.map(([source]) => source))) {
        const bindings = (index.get(source) ?? []).filter((binding) => binding.targetId !== id);
        if (bindings.length) index.set(source, bindings);
        else index.delete(source);
      }
      for (const [source, binding] of after)
        index.set(source, [...(index.get(source) ?? []), binding]);
    }
    sourceIndexes.set(result.entities, index);
  };
}
function effectiveContribution(world: WorldState, state: States[string] | undefined): boolean {
  if (!state?.active) return false;
  const lifetime = state.contribution?.lifetime;
  if (lifetime?.kind === 'fixed') return world.simTime < lifetime.expiresAt;
  if (lifetime?.kind !== 'source-sustained') return true;
  const source = world.entities[state.sourceId];
  return (
    !!source &&
    !source.retirement &&
    source.actor?.alive !== false &&
    activelyParticipates(objectAncestors(world, source.id).at(-1))
  );
}
const contributionIndexes = new WeakMap<States, Map<string, string[]>>();
/** Index membership only. Active state is always read from the current draft. */
function contributionIndex(states: States): Map<string, string[]> {
  const cached = contributionIndexes.get(states);
  if (cached) return cached;
  const index = new Map<string, string[]>();
  for (const id in states) {
    const definition = states[id]!.contribution?.definitionId;
    if (!definition) continue;
    const keys = index.get(definition) ?? [];
    keys.push(id);
    index.set(definition, keys);
  }
  if (isDraft(states) || Object.isFrozen(states)) contributionIndexes.set(states, index);
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
  const native = states[id];
  if (native?.active && !native.contribution) return true;
  return (
    independent
      .get(id)
      ?.some((key) => (world ? effectiveContribution(world, states[key]) : states[key]?.active)) ??
    false
  );
}
export function activeContributionId(
  entity: Entity,
  definitionId: string,
  sourceId: string,
): string | undefined {
  const states = entity.statusEffects;
  return states
    ? contributionIndex(states)
        .get(definitionId)
        ?.find((id) => states[id]?.active && states[id]?.sourceId === sourceId)
    : undefined;
}
export function isStatusDefinitionActive(
  entity: Entity,
  definitionId: string,
  world?: WorldState,
): boolean {
  const states = entity.statusEffects;
  return !!states && definitionActive(states, definitionId, contributionIndex(states), world);
}
export function capabilityBlocked(
  world: WorldState,
  entity: Entity | undefined,
  capability: Capability,
): boolean {
  entity = entity ? (world.entities[entity.id] ?? entity) : undefined;
  if (!entity?.statusEffects) return false;
  const independent = contributionIndex(entity.statusEffects);
  // This is a frequent native read. Do not allocate a derived set for every
  // capability check or cache mutable draft state across contribution changes.
  for (const definition of statusDefinitions(world)) {
    if (
      definitionActive(entity.statusEffects, definition.id, independent, world) &&
      definition.whileActive.some(
        (op) =>
          'restrictCapabilities' in op && op.restrictCapabilities.capabilities.includes(capability),
      )
    )
      return true;
  }
  return false;
}
export function activeStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
): StatusEffectDefinition[] {
  entity = entity ? (world.entities[entity.id] ?? entity) : undefined;
  if (!entity?.statusEffects) return [];
  const independent = contributionIndex(entity.statusEffects);
  return statusDefinitions(world).filter((d) =>
    definitionActive(entity.statusEffects!, d.id, independent, world),
  );
}
export function projectStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
  audience: 'owner' | 'public' = 'public',
): Array<{ id: string; label: string } & StatusPresentation> {
  return activeStatusEffects(world, entity)
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
}
