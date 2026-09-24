import { capabilityBlocked, activeStatusEffects } from '@open-legend/domain';
import { inventoryFor, nativeNeedBelow, seesEntity, type WorldState } from '@open-legend/domain';

/** Protect an actual native solution, not a hunger number that could strand a conscious actor.
 * docs/architecture.md#actor-agency-foundation
 */
export function nativeProtectionReason(world: WorldState, actorId: string): string | undefined {
  const entity = world.entities[actorId];
  const actor = entity?.actor;
  if (!entity || !actor) return;
  if (capabilityBlocked(world, entity, 'actions'))
    return activeStatusEffects(world, entity)
      .map((d) => d.label)
      .join(', ');
  const hungry = nativeNeedBelow(actor, 'fullness', 20);
  const exhausted = nativeNeedBelow(actor, 'energy', 10);
  if (!hungry && !exhausted) return;
  if (hungry) {
    const carriedFood = inventoryFor(world, actorId).some(
      (item) => !!world.itemDefinitions[item.definitionId]?.nutrition,
    );
    const target =
      actor.action?.type === 'gather' ? world.entities[actor.action.targetId ?? ''] : undefined;
    const gatheringFood =
      target?.resource?.definitionId === 'berries' &&
      target.resource.quantity > 0 &&
      seesEntity(world, entity, target);
    if (!carriedFood && !gatheringFood) return;
  }
  if (exhausted && actor.action?.type !== 'status-effect') return;
  return 'Native urgent protection';
}
