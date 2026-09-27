import { capabilityBlocked, activeStatusEffects, type WorldState } from '@open-legend/domain';

/** Conscious hunger permits choice. Only actual action-blocking states protect native work.
 * docs/worlds/base/survival.md */
export function nativeProtectionReason(world: WorldState, actorId: string): string | undefined {
  const entity = world.entities[actorId];
  if (!entity?.actor || !capabilityBlocked(world, entity, 'actions')) return;
  return (
    activeStatusEffects(world, entity)
      .map((definition) => definition.label)
      .join(', ') || 'Actions unavailable'
  );
}
