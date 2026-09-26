import { itemFor } from '@open-legend/domain';
import { currentGoal, NATIVE_PREPARATIONS } from '@open-legend/domain';
import type { WorldState } from '@open-legend/domain';
import { digest } from './store.js';
import type { AttentionCandidate } from './recall.js';
export interface InterestSubscription {
  version: 1;
  goal: string;
  mindRevision: number;
  knowledgeRevision?: number;
  expiresAt: number;
  properties: string[];
  entityKinds: string[];
  definitions: string[];
}
/** Native prerequisites are actor-owned knowledge; no goal-prose inference or hidden-world scan. */
function planDefinitions(world: WorldState, actorId: string): string[] {
  const actor = world.entities[actorId]?.actor;
  const plan = actor?.agency.plan;
  if (
    !plan ||
    !['active', 'blocked'].includes(plan.status) ||
    (plan.goalId &&
      !actor!.agency.goals.some((goal) => goal.id === plan.goalId && goal.status === 'active'))
  )
    return [];
  return [
    ...new Set(
      plan.steps
        .filter((step) => !['completed', 'cancelled'].includes(step.status))
        .flatMap(({ command }) => {
          if (command.type === 'prepare') return [NATIVE_PREPARATIONS[command.preparation].input];
          if (command.type === 'craft')
            return world.knowledge[actorId]?.some((entry) => entry.recipeId === command.recipeId)
              ? (world.recipes[command.recipeId]?.inputs.map((input) => input.definitionId) ?? [])
              : [];
          if (command.type === 'cook') return ['raw_meat'];
          return [];
        }),
    ),
  ];
}
/** Preserve all actor-permitted interests; truncating here would hide later valid matches.
 * docs/architecture.md#content-counts-and-request-limits */
export function compileInterests(
  world: WorldState,
  actorId: string,
  selected: AttentionCandidate[],
): InterestSubscription {
  const definitions = new Set<string>(planDefinitions(world, actorId));
  const kinds = new Set<string>();
  for (const c of selected) {
    if (c.kind === 'possession') {
      const item = itemFor(world, c.id.slice(5));
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
    goal: digest(currentGoal(world.entities[actorId]!.actor!)),
    knowledgeRevision: world.knowledgeRevisions?.[actorId] ?? 0,
    mindRevision: world.innerWorlds?.[actorId]?.revision ?? 0,
    expiresAt: world.simTime + 7200,
    properties: [
      ...new Set([...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? [])),
    ],
    entityKinds: [...kinds],
    definitions: [...definitions],
  };
}
export function interestMatches(
  world: WorldState,
  actorId: string,
  subscription: InterestSubscription | undefined,
  visibleIds: string[],
): string[] {
  const valid =
    subscription &&
    subscription.version === 1 &&
    subscription.goal === digest(currentGoal(world.entities[actorId]!.actor!)) &&
    (subscription.knowledgeRevision ?? 0) === (world.knowledgeRevisions?.[actorId] ?? 0) &&
    subscription.mindRevision === (world.innerWorlds?.[actorId]?.revision ?? 0) &&
    world.simTime < subscription.expiresAt;
  const definitions = new Set([
    ...(valid ? subscription.definitions : []),
    ...planDefinitions(world, actorId),
  ]);
  const kinds = valid ? subscription.entityKinds : [];
  const properties = new Set([
    ...(valid ? subscription.properties : []),
    ...[...definitions].flatMap((id) => world.itemDefinitions[id]?.properties ?? []),
  ]);
  return visibleIds.filter((id) => {
    const entity = world.entities[id];
    const definition = entity?.resource && world.itemDefinitions[entity.resource.definitionId];
    return (
      !!entity &&
      (kinds.includes(entity.kind) ||
        (!!definition &&
          (definitions.has(definition.id) || definition.properties.some((p) => properties.has(p)))))
    );
  });
}
