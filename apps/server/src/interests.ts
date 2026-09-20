import type { WorldState } from '@open-legend/domain';
import { digest } from './store.js';
import type { AttentionCandidate } from './recall.js';
export interface InterestSubscription {
  version: 1;
  goal: string;
  mindRevision: number;
  expiresAt: number;
  properties: string[];
  entityKinds: string[];
  definitions: string[];
}
/** A finite derived subscription from candidates actually included by attention. No executable predicates. */
export function compileInterests(
  world: WorldState,
  actorId: string,
  selected: AttentionCandidate[],
): InterestSubscription {
  const definitions = new Set<string>();
  const kinds = new Set<string>();
  for (const c of selected) {
    if (c.kind === 'possession') {
      const item = world.items[c.id.slice(5)];
      if (item) definitions.add(item.definitionId);
    }
    if (c.kind === 'entity') {
      const entity = world.entities[c.id.slice(7)];
      if (entity?.resource) definitions.add(entity.resource.definitionId);
      if (entity) kinds.add(entity.kind);
    }
  }
  return {
    version: 1,
    goal: digest(world.entities[actorId]!.actor!.goal),
    mindRevision: world.innerWorlds?.[actorId]?.revision ?? 0,
    expiresAt: world.simTime + 7200,
    properties: [
      ...new Set([...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? [])),
    ].slice(0, 16),
    entityKinds: [...kinds].slice(0, 8),
    definitions: [...definitions].slice(0, 24),
  };
}
export function interestMatches(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
  visibleIds: string[],
): string[] {
  if (
    !subscription ||
    subscription.version !== 1 ||
    subscription.goal !== digest(world.entities[actorId]!.actor!.goal) ||
    subscription.mindRevision !== (world.innerWorlds?.[actorId]?.revision ?? 0) ||
    world.simTime >= subscription.expiresAt
  )
    return [];
  return visibleIds
    .filter((id) => {
      const entity = world.entities[id];
      const definition = entity?.resource && world.itemDefinitions[entity.resource.definitionId];
      return (
        !!entity &&
        (subscription.entityKinds.includes(entity.kind) ||
          (!!definition &&
            (subscription.definitions.includes(definition.id) ||
              definition.properties.some((p) => subscription.properties.includes(p)))))
      );
    })
    .slice(0, 32);
}
