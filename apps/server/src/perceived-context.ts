import { entityLabel } from './entity-references.js';
import type { Action, Entity, ItemDefinition, ItemInstance, WorldState } from '@open-legend/domain';
import type { AttentionCandidate } from './recall.js';

const propertyDescriptions: Record<ItemDefinition['properties'][number], string> = {
  fiber: 'fibrous material',
  binding: 'suitable for tying',
  flexible: 'flexible',
  rigid: 'rigid',
  shaft: 'usable as a shaft',
  pouch: 'usable as a pouch',
  point: 'has a point',
  projectile: 'usable as a projectile',
  food: 'edible',
  fuel: 'usable as fuel',
};

const activities: Record<Action['type'], string | undefined> = {
  move: 'moving',
  gather: 'gathering',
  prepare: 'preparing materials',
  craft: 'crafting',
  hunt: 'hunting',
  harvest: 'harvesting',
  cook: 'cooking',
  strike: 'striking',
  replenish: 'replenishing a supply',
  // The internal effect identifier is not itself an observable activity description.
  'status-effect': undefined,
};

/** Describe only the permitted observation, never a private route or inferred intent.
 * docs/memory-architecture.md#3-one-compact-model-facing-context
 */
export function perceivedEntityText(
  entity: Entity,
  definitions: Map<string, ItemDefinition>,
  world: WorldState,
) {
  const facts = [
    `I can see ${entityLabel(world, entity)}.${entity.actor ? ` Species: ${entity.actor.species ?? 'unknown'}.` : ''}`,
  ];
  if (entity.actor && !entity.actor.alive) facts.push('It is dead.');
  else if (entity.actor?.action) {
    const action = entity.actor.action;
    // No action record is not evidence of stillness: native movement uses other state.
    const activity = action.stage === 'approaching' ? 'moving' : activities[action.type];
    if (activity) facts.push(`It is ${activity}.`);
  }
  if (entity.resource) {
    const item = definitions.get(entity.resource.definitionId);
    facts.push(
      `${entity.resource.quantity} units of ${item?.name ?? 'unidentified material'} remain.`,
    );
  }
  if (entity.heat) facts.push(entity.heat.lit ? 'The fire is lit.' : 'The fire is unlit.');
  return facts.join(' ');
}

/** Relative geometry is observed location, not proof of a traversable route. */
export function relativeLocation(observer: Entity, target: Entity): string {
  const dx = target.position.x - observer.position.x;
  const dz = target.position.z - observer.position.z;
  const dy = target.position.y - observer.position.y;
  const horizontal = Math.hypot(dx, dz);
  const directions = [
    'ahead of me',
    'ahead and to my right',
    'to my right',
    'behind and to my right',
    'behind me',
    'behind and to my left',
    'to my left',
    'ahead and to my left',
  ];
  const bearing = Math.atan2(dx, dz) - observer.spatial.heading;
  const direction = directions[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8];
  const height =
    Math.abs(dy) < 0.1
      ? 'at roughly my elevation'
      : `about ${Math.abs(dy).toFixed(1)} m ${dy > 0 ? 'above' : 'below'} me`;
  return `${horizontal < 0.1 ? 'At my horizontal position' : `About ${horizontal.toFixed(1)} m horizontally ${direction}`}, ${height}.`;
}

export function possessionText(item: ItemInstance, definition: ItemDefinition, equipped: boolean) {
  const properties = definition.properties.map((property) => propertyDescriptions[property]);
  return `${item.quantity} × ${definition.name}${equipped ? ', equipped' : ''}.${properties.length ? ` Properties: ${properties.join(', ')}.` : ''}`;
}

/** The same category names reach attention and the final actor context; metadata stays server-side. */
export function contextSections(candidates: AttentionCandidate[]): Record<string, string[]> {
  const names: Record<AttentionCandidate['kind'], string> = {
    conversation: 'conversation',
    memory: 'recall',
    entity: 'surroundings',
    possession: 'possessions',
    knowledge: 'knowledge',
    action: 'actions',
  };
  const sections: Record<string, string[]> = {};
  for (const candidate of candidates) (sections[names[candidate.kind]] ??= []).push(candidate.text);
  return sections;
}
