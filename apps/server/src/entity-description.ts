import { namePhrase } from '@open-legend/language';
import { fireFuelDescription, type Entity, type ItemDefinition } from '@open-legend/domain';
/** Called only for entities in the player's permitted observation. No private mind. */
export function describeEntity(
  entity: Entity,
  definitions: Record<string, ItemDefinition>,
): string {
  if (entity.resource)
    return `${namePhrase(entity, 'indefinite', { capitalize: true })}. ${definitions[entity.resource.definitionId]?.description ?? 'A source of gathering materials.'} ${entity.resource.quantity} units remain.`;
  if (entity.actor && !entity.animal)
    return `${entity.actor.description?.trim() || `${namePhrase(entity, 'definite', { capitalize: true })} is here.`} ${entity.actor.alive ? 'Select Talk to begin a conversation.' : 'Their life has ended.'}`;
  if (entity.remains)
    return entity.remains.harvested
      ? `The remains of ${namePhrase(entity, 'definite')} have been harvested.`
      : `${namePhrase(entity, 'indefinite', { capitalize: true })}. These remains can be harvested for ${entity.remains.yields.map((y) => `${y.quantity} ${definitions[y.definitionId]?.name ?? 'materials'}`).join(', ')}.`;
  if (entity.animal)
    return `${namePhrase(entity, 'indefinite', { capitalize: true })} of the clearing. ${entity.actor!.alive ? (entity.animal.fleeSeconds > 0 ? 'It is fleeing.' : 'It is foraging nearby.') : 'It is no longer alive.'}`;
  if (entity.heat)
    return entity.heat.lit
      ? `A burning fire that provides heat for cooking raw meat, with ${fireFuelDescription(entity.heat)}.`
      : `A cold campfire with ${fireFuelDescription(entity.heat)}. It cannot cook food until it is lit.`;
  return entity.name;
}
