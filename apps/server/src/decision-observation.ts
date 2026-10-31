import { supplyOpportunityContext } from './supply-opportunities.js';
import {
  accessiblePossession,
  activityCommandFields,
  activityEntityReferences,
  entityGet,
  equippedItems,
  nativeBindingKind,
  resolvePlanCommand,
} from '@open-legend/domain';
import {
  inspectPossessions,
  currentInventoryInspection,
  inspectedContainer,
  observeActor,
  type WorldState,
} from '@open-legend/domain';
import { RETRIEVAL_ROWS } from './memory-repository.js';

/** Current native work owns exact object bindings. Paging and hard-query
 * selection must protect the same accessible items; a text/place role grants none. */
export function decisionBoundItemIds(world: WorldState, actorId: string): ReadonlySet<string> {
  const actor = entityGet(world.entities, actorId)?.actor;
  if (!actor) return new Set<string>();
  const ids = new Set(equippedItems(world, actorId).map((item) => item.id));
  const addObjects = (fields: object) => {
    for (const [field, id] of Object.entries(fields))
      if (nativeBindingKind(field) === 'object' && typeof id === 'string') ids.add(id);
  };
  if (actor.action) {
    addObjects(actor.action);
    for (const tool of actor.action.manufactureTools ?? []) ids.add(tool.itemId);
    for (const id of Object.values(actor.action.foodPreparation?.inputs ?? {})) ids.add(id);
  }
  for (const plan of [actor.agency.plan, actor.agency.suspended]) {
    if (!plan) continue;
    for (const step of plan.steps) {
      if (!['queued', 'running'].includes(step.status)) continue;
      const command = resolvePlanCommand(plan, step);
      addObjects(command ? activityCommandFields(command) : step.command);
    }
    const activity = plan.activity;
    if (!activity) continue;
    for (const { node } of activity.pending)
      for (const id of activityEntityReferences(node, activity.bindings, activity.outputs))
        ids.add(id);
  }
  return new Set([...ids].filter((id) => accessiblePossession(world, actorId, id)));
}

/** Preserve an inspection route when optional inventory would exhaust preparation.
 * Required action references remain explicit; this is a disclosed page, not semantic search.
 * docs/limits/cognition.md#cg04 */
export function decisionObservation(world: WorldState, actorId: string) {
  let available = 0;
  let paged = false;
  let supplyOpportunities: ReturnType<typeof supplyOpportunityContext> = [];
  const observed = observeActor(world, actorId, {
    includeMemories: false,
    selectInventory(inventory, counts) {
      available = inventory.length;
      // Supply considerations need complete permitted quantities, not a shown page.
      supplyOpportunities = supplyOpportunityContext(world, actorId, inventory);
      const otherRows =
        counts.visibleEntities +
        counts.knownRecipes +
        Object.keys(world.actorKnowledge?.[actorId] ?? {}).length;
      paged = available + otherRows > RETRIEVAL_ROWS;
      if (!paged) return undefined;
      const cursor = currentInventoryInspection(world, actorId);
      const ids = new Set(
        cursor && !cursor.containerId ? cursor.itemIds : inspectPossessions(world, actorId).itemIds,
      );
      for (const id of decisionBoundItemIds(world, actorId)) ids.add(id);
      return ids;
    },
  });
  if (!observed) return null;
  return {
    ...observed,
    supplyOpportunities,
    inspectedContainer: inspectedContainer(world, actorId),
    inventoryCoverage: { available, considered: observed.inventory.length, paged },
  };
}
