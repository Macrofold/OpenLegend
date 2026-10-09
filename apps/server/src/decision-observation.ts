import { equippedItems } from '@open-legend/domain';
import {
  inspectPossessions,
  currentInventoryInspection,
  inspectedContainer,
  observeActor,
  type WorldState,
} from '@open-legend/domain';
import { RETRIEVAL_ROWS } from './memory-repository.js';

/** Preserve an inspection route when optional inventory would exhaust preparation.
 * Required action references remain explicit; this is a disclosed page, not semantic search.
 * docs/limits/cognition.md#cg04 */
export function decisionObservation(world: WorldState, actorId: string) {
  const observed = observeActor(world, actorId, { includeMemories: false });
  if (!observed) return null;
  const available = observed.inventory.length;
  const otherRows =
    observed.visibleEntities.length +
    observed.knownRecipes.length +
    Object.keys(world.actorKnowledge?.[actorId] ?? {}).length;
  const paged = available + otherRows > RETRIEVAL_ROWS;
  if (paged) {
    const actor = observed.actor.actor!;
    const cursor = currentInventoryInspection(world, actorId);
    const ids = new Set(
      cursor && !cursor.containerId ? cursor.itemIds : inspectPossessions(world, actorId).itemIds,
    );
    // Never drop tools already bound to admitted work when switching to a page.
    for (const item of equippedItems(world, actorId)) ids.add(item.id);
    for (const action of [
      actor.action,
      ...(actor.agency.plan?.steps ?? [])
        .filter((step) => ['queued', 'running'].includes(step.status))
        .map((step) => step.command),
    ]) {
      if (!action) continue;
      for (const field of ['itemId', 'weaponItemId', 'ammoItemId'] as const) {
        const id = (action as unknown as Record<string, unknown>)[field];
        if (typeof id === 'string') ids.add(id);
      }
    }
    observed.inventory = observed.inventory.filter((item) => ids.has(item.id));
  }
  return {
    ...observed,
    inspectedContainer: inspectedContainer(world, actorId),
    inventoryCoverage: { available, considered: observed.inventory.length, paged },
  };
}
