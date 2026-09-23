import {
  validateDeclaration,
  type ActorObservation,
  type DeclarationDraft,
} from '@open-legend/domain';
import type { WorldService } from './world-service.js';

/** Shared by cognition, authoring and tool previews; never broaden materials through a god view.
 * docs/architecture.md#invention-workshop-tools
 */
export function inventionMaterials(observed: ActorObservation) {
  const owned = new Set(observed.inventory.map((item) => item.definitionId));
  return observed.itemDefinitions
    .filter((definition) => !definition.recipeId || owned.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      version: definition.version,
      name:
        [...definition.name].length <= 40
          ? definition.name
          : `${[...definition.name].slice(0, 39).join('')}…`,
      properties: definition.properties,
      native: !definition.recipeId,
      ...(definition.nutrition !== undefined ? { nutrition: definition.nutrition } : {}),
      ...(definition.cooked !== undefined ? { cooked: definition.cooked } : {}),
      ...(definition.launcher ? { launcher: definition.launcher } : {}),
      ...(definition.ammunition ? { ammunition: definition.ammunition } : {}),
      ...(definition.gatheringTool ? { gatheringTool: definition.gatheringTool } : {}),
    }));
}

/** Validate the actor's references before privileged native validation can describe unknown inputs. */
export function scopedInventionErrors(
  service: WorldService,
  actorId: string,
  candidate: unknown,
): string[] {
  const observed = service.observe(actorId);
  if (!observed) return ['The inventor is unavailable.'];
  const materials = new Set(inventionMaterials(observed).map((material) => material.id));
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const value = candidate as Record<string, unknown>;
    if (
      Array.isArray(value.inputs) &&
      value.inputs.some((input: unknown) => {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
        const id = (input as Record<string, unknown>).definitionId;
        return typeof id === 'string' && !materials.has(id);
      })
    )
      return ['The proposal uses materials unavailable to this inventor.'];
    const output = value.output as DeclarationDraft['output'] | undefined;
    if (
      typeof output?.gatheringTool?.resourceId === 'string' &&
      !materials.has(output.gatheringTool.resourceId)
    )
      return ['The proposal targets a resource unavailable to this inventor.'];
  }
  return validateDeclaration(service.world, candidate);
}

/** Follow-ups retain their first workshop allocation; current config can tighten it. */
export function inventionAttemptBudget(
  service: WorldService,
  scope: import('./store.js').JobRecord['request']['invention'],
) {
  if (scope?.episodeBudgetUsd === undefined) return undefined;
  return {
    id: `invention:${scope.worldId}:${scope.rootId}`,
    limitUsd: Math.min(scope.episodeBudgetUsd, service.config.inventionWorkshopUsd),
  };
}
