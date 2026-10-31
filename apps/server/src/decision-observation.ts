import { supplyOpportunityContext } from './supply-opportunities.js';
import {
  boundActionItemIds,
  activityEntityReferences,
  type ActivityNode,
  type ActivityBinding,
  entityGet,
  possessionItems,
  equippedItems,
  recentLearnedRecipeIds,
} from '@open-legend/domain';
import {
  inspectPossessions,
  currentInventoryInspection,
  inspectedContainer,
  observeActor,
  currentDetailedAttention,
  type WorldState,
} from '@open-legend/domain';
import { RETRIEVAL_ROWS, CONTEXT_CANDIDATE_LIMIT } from './memory-repository.js';

/** Current and queued native work share one dependency walk for context selection. */
function* boundWork(world: WorldState, actorId: string) {
  const actor = entityGet(world.entities, actorId)?.actor;
  if (actor?.action) yield actor.action;
  for (const step of actor?.agency.plan?.steps ?? [])
    if (step.status === 'queued' || step.status === 'running') yield step.command;
}
/** Tools bound by admitted actions/plans remain required on every context path. */
export function requiredItemIds(world: WorldState, actorId: string): Set<string> {
  const ids = new Set(equippedItems(world, actorId).map((item) => item.id));
  const addActivityItems = (
    root: ActivityNode | undefined,
    bindings: Record<string, ActivityBinding>,
  ) => {
    if (!root) return;
    for (const id of activityEntityReferences(root, bindings))
      if (entityGet(world.entities, id)?.item) ids.add(id);
  };
  for (const action of boundWork(world, actorId)) {
    for (const id of boundActionItemIds(action)) ids.add(id);
    if (action.type === 'activity')
      addActivityItems(world.actionExperience.methods[action.methodId]?.root, action.bindings);
  }
  const plan = entityGet(world.entities, actorId)?.actor?.agency.plan;
  const activity = plan?.activity;
  if ((plan?.status === 'active' || plan?.status === 'blocked') && activity && !activity.terminal)
    addActivityItems(
      activity.request?.root ?? world.actionExperience.methods[activity.methodId ?? '']?.root,
      activity.bindings,
    );
  return ids;
}
/** A bound method must survive both body preparation and optional relevance selection. */
export function requiredRecipeIds(world: WorldState, actorId: string): Set<string> {
  const ids = new Set<string>();
  for (const action of boundWork(world, actorId))
    if ('recipeId' in action && typeof action.recipeId === 'string') ids.add(action.recipeId);
  return ids;
}

/** Preserve an inspection route when optional inventory would exhaust preparation.
 * Required action references remain explicit; this is a disclosed page, not semantic search.
 * docs/limits/cognition.md#cg04 */
export function decisionObservation(
  world: WorldState,
  actorId: string,
  expanded: readonly string[] = [],
) {
  // Broad surroundings are prepared separately from received bounds. Copy private
  // authority records only for subjects actually expanded for this decision.
  const visibleEntityIds = new Set([
    ...currentDetailedAttention(world, actorId).map((entry) => entry.sourceId),
    ...expanded,
  ]);
  // Count scalar possession metadata before the observation owner's deep copy.
  // Supply uses the complete accessible stock, independently of the selected page.
  const stock = [...possessionItems(world, actorId)];
  const available = stock.length;
  const otherRows =
    visibleEntityIds.size +
    Math.min(CONTEXT_CANDIDATE_LIMIT, world.knowledge[actorId]?.length ?? 0);
  const paged = available + otherRows > RETRIEVAL_ROWS;
  let inventoryIds: Set<string> | undefined;
  if (paged) {
    const cursor = currentInventoryInspection(world, actorId);
    inventoryIds = requiredItemIds(world, actorId);
    for (const id of cursor && !cursor.containerId
      ? cursor.itemIds
      : inspectPossessions(world, actorId).itemIds)
      inventoryIds.add(id);
  }
  const methodCount = world.knowledge[actorId]?.length ?? 0;
  const methodsPaged =
    methodCount + (inventoryIds?.size ?? available) + visibleEntityIds.size > RETRIEVAL_ROWS;
  const recipeIds = methodsPaged
    ? new Set(recentLearnedRecipeIds(world, actorId, CONTEXT_CANDIDATE_LIMIT))
    : undefined;
  if (recipeIds) for (const id of requiredRecipeIds(world, actorId)) recipeIds.add(id);
  const observed = observeActor(world, actorId, {
    includeMemories: false,
    visibleEntityIds,
    inventoryIds,
    recipeIds,
  });
  if (!observed) return null;
  const supplyOpportunities = supplyOpportunityContext(world, actorId, stock);
  return {
    ...observed,
    supplyOpportunities,
    inspectedContainer: inspectedContainer(world, actorId),
    methodCoverage: {
      available: methodCount,
      considered: observed.knownRecipes.length,
      paged: methodsPaged,
    },
    inventoryCoverage: { available, considered: observed.inventory.length, paged },
  };
}
