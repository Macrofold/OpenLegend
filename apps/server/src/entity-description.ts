import { namePhrase } from '@open-legend/language';
import {
  describeBodyRemains,
  fireFuelDescription,
  selectedAnimalActivity,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
/** Called only for entities in the player's permitted observation. No private mind. */
export function describeEntity(world: WorldState, entity: Entity): string {
  const definitions = world.itemDefinitions,
    castDefinitions = world.castDefinitions;
  const remains = describeBodyRemains(entity, definitions);
  if (remains) return remains;
  if (entity.threat)
    return entity.actor?.action?.strikePhase === 'windup'
      ? entity.threat.policy.windupText
      : entity.threat.mode === 'return'
        ? entity.threat.policy.withdrawalText
        : entity.threat.relinquished
          ? entity.threat.policy.stopText
          : (entity.description ?? entity.name);
  if (entity.resource?.cast) {
    const definition = castDefinitions[entity.resource.cast.definitionId];
    return `${entity.description ?? entity.name} ${definition?.description ?? ''}${entity.resource.quantity === 0 ? ` ${definition?.exhaustedText ?? ''}` : ''}`;
  }
  if (entity.description) return entity.description;
  if (entity.resource)
    return `${namePhrase(entity, 'indefinite', { capitalize: true })}. ${definitions[entity.resource.definitionId]?.description ?? 'A source of gathering materials.'} ${entity.resource.quantity} units remain.`;
  if (entity.actor && !entity.animal)
    return `${entity.actor.description?.trim() || `${namePhrase(entity, 'definite', { capitalize: true })} is here.`}${entity.actor.alive ? '' : ' Their life has ended.'}`;
  if (entity.animal) return selectedAnimalActivity(world, entity).description;
  if (entity.heat)
    return entity.heat.lit
      ? `A burning fire that provides heat for food preparation, with ${fireFuelDescription(entity.heat)}.`
      : `A cold campfire with ${fireFuelDescription(entity.heat)}. It cannot cook food until it is lit.`;
  return entity.name;
}
