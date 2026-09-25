import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';
import type { Capability, StatusEffectDefinition, StatusPresentation } from './status-effects.js';

// Definitions are replaced only at admission; never traverse readonly rules through draft proxies.
// docs/status-effects.md#admission-and-persistence
export function statusDefinitions(world: WorldState): StatusEffectDefinition[] {
  const policy = world.statusEffectPolicy;
  return (isDraft(policy) ? original(policy)! : policy).definitions;
}
const restrictionDefinitions = new WeakMap<StatusEffectDefinition[], Map<Capability, string[]>>();
function restrictions(world: WorldState, capability: Capability): string[] {
  const definitions = statusDefinitions(world);
  const reusable = Object.isFrozen(definitions);
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
export function capabilityBlocked(
  world: WorldState,
  entity: Entity | undefined,
  capability: Capability,
): boolean {
  entity = entity ? (world.entities[entity.id] ?? entity) : undefined;
  const states = entity?.statusEffects;
  if (!states) return false;
  // Compile immutable rule membership, never live effect state. Sleep/wake and interrupts
  // remain visible immediately within a step. docs/status-effects.md#admission-and-persistence
  for (const id of restrictions(world, capability)) if (states[id]?.active) return true;
  return false;
}
export function activeStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
): StatusEffectDefinition[] {
  entity = entity ? (world.entities[entity.id] ?? entity) : undefined;
  return entity?.statusEffects
    ? statusDefinitions(world).filter((d) => entity.statusEffects?.[d.id]?.active)
    : [];
}
export function projectStatusEffects(
  world: WorldState,
  entity: Entity | undefined,
): Array<{ id: string; label: string } & StatusPresentation> {
  return activeStatusEffects(world, entity)
    .filter((d) => d.presentation || d.actions)
    .map((d) => ({ id: d.id, label: d.label, ...d.presentation }));
}
