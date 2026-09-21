import type { Entity, ItemDefinition } from '@open-legend/domain';
/** Called only for entities in the player's permitted observation. No private mind. */
export function describeEntity(
  entity: Entity,
  definitions: Record<string, ItemDefinition>,
): string {
  if (entity.resource)
    return `${entity.name}. ${definitions[entity.resource.definitionId]?.description ?? 'A source of gathering materials.'} ${entity.resource.quantity} units remain.`;
  if (entity.actor && !entity.animal)
    return `${entity.actor.description?.trim() || `${entity.name} is a person in the clearing.`} ${entity.actor.alive ? 'Select Talk to begin a conversation.' : 'Their life has ended.'}`;
  if (entity.remains)
    return entity.remains.harvested
      ? `The remains of ${entity.name} have been harvested.`
      : `${entity.name}. These remains can be harvested for ${entity.remains.yields.map((y) => `${y.quantity} ${definitions[y.definitionId]?.name ?? 'materials'}`).join(', ')}.`;
  if (entity.animal)
    return `A ${entity.actor!.species!} of the clearing. ${entity.actor!.alive ? (entity.animal.fleeSeconds > 0 ? 'It is fleeing.' : 'It is foraging nearby.') : 'It is no longer alive.'}`;
  if (entity.heat)
    return entity.heat.lit
      ? 'A banked fire that provides heat for cooking raw meat.'
      : 'A cold campfire. It cannot cook food without heat.';
  return entity.name;
}
