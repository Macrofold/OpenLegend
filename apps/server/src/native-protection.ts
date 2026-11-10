import { entityGet } from '@open-legend/domain';
import { capabilityBlocked, activeStatusEffects, type WorldState } from '@open-legend/domain';

/** Conscious hunger permits choice. Only actual action-blocking states protect native work.
 * docs/worlds/base/survival.md */
export function nativeProtectionReason(world: WorldState, actorId: string): string | undefined {
  const entity = entityGet(world.entities, actorId);
  if (!entity?.actor || !capabilityBlocked(world, entity, 'actions')) return;
  return nativeProtectionReasonFromRead(
    true,
    activeStatusEffects(world, entity).map((definition) => definition.label),
  );
}

/** The same selected active labels can come from a scoped native owner read. */
export function nativeProtectionReasonFromRead(
  blocked: boolean,
  labels: readonly string[],
): string | undefined {
  return blocked ? labels.join(', ') || 'Actions unavailable' : undefined;
}
