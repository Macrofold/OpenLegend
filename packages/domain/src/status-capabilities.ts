import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';
import type { Capability, StatusEffectDefinition, StatusPresentation } from './status-effects.js';

// Definitions are replaced only at admission; never traverse readonly rules through draft proxies.
// docs/status-effects.md#admission-and-persistence
export function statusDefinitions(world: WorldState): StatusEffectDefinition[] {
  const policy = world.statusEffectPolicy;
  return (isDraft(policy) ? original(policy)! : policy).definitions;
}
export function capabilityBlocked(
  world: WorldState,
  entity: Entity | undefined,
  capability: Capability,
): boolean {
  entity = entity ? (world.entities[entity.id] ?? entity) : undefined;
  if (!entity?.statusEffects) return false;
  return statusDefinitions(world).some(
    (d) =>
      entity.statusEffects?.[d.id]?.active &&
      d.whileActive.some(
        (op) =>
          'restrictCapabilities' in op && op.restrictCapabilities.capabilities.includes(capability),
      ),
  );
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
