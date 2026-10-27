import {
  accessiblePossession,
  canAccessContainer,
  availableItemQuantity,
  applicableConsumption,
  equippedItems,
  entityGet,
  manufactureInputQuantities,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';

/** Prepared once from the same permitted inventory before decision paging. No
 * hidden stock, new goals, private destination query or paid-call scheduling. */
export function supplyOpportunityContext(
  world: WorldState,
  actorId: string,
  stock: readonly ItemInstance[],
): Array<{ placeId: string; text: string }> {
  const profile = world.supplyOpportunities?.[actorId];
  if (!profile) return [];
  const actor = entityGet(world.entities, actorId),
    consumption = actor && applicableConsumption(world, actor);
  if (!actor?.actor || !consumption) return [];
  const incomplete = stock.some(
      (item) => item.container && !canAccessContainer(world, actorId, item.id),
    ),
    bow = equippedItems(world, actorId)
      .map((item) => world.itemDefinitions[item.definitionId]?.rangedWeapon)
      .find(Boolean),
    quantities = new Map<string, number>();
  let food = 0,
    ammunition = 0;
  for (const item of stock) {
    if (!accessiblePossession(world, actorId, item.id)) continue;
    const quantity = availableItemQuantity(world, item.id),
      definition = world.itemDefinitions[item.definitionId]!;
    quantities.set(definition.id, (quantities.get(definition.id) ?? 0) + quantity);
    if (!consumption.refusals.some((refusal) => refusal.itemType === definition.id))
      food += quantity * (definition.nutrition ?? 0);
    if (bow && definition.ammunition?.kind === bow.ammunitionKind) ammunition += quantity;
  }
  // Running crafts already spent their inputs. Only unstarted chosen work can
  // still need them; completion never charges those materials a second time.
  const commands = (actor.actor.agency.plan?.steps ?? [])
      .filter((step) => step.status === 'queued')
      .map((step) => step.command),
    needed = new Set<string>();
  for (const command of commands)
    if (command?.type === 'craft' && command.recipeId) {
      const recipe = world.recipes[command.recipeId];
      if (!recipe) continue;
      for (const [definitionId, quantity] of manufactureInputQuantities(recipe))
        if ((quantities.get(definitionId) ?? 0) < quantity) needed.add(definitionId);
    }
  const candidates: Array<{ placeId: string; text: string }> = [];
  for (const place of profile.places) {
    const reasons = [
      ...(!incomplete && food < profile.foodBelow && place.purposes.includes('food')
        ? [profile.descriptions.food.replaceAll('{available}', String(food))]
        : []),
      ...(!incomplete &&
      bow &&
      ammunition < profile.ammunitionBelow &&
      place.purposes.includes('ammunition')
        ? [profile.descriptions.ammunition.replaceAll('{available}', String(ammunition))]
        : []),
      ...(place.purposes.includes('material') && place.materialIds.some((id) => needed.has(id))
        ? [profile.descriptions.material]
        : []),
    ];
    for (const reason of reasons)
      candidates.push({
        placeId: place.id,
        text: `${reason} ${profile.descriptions.alternatives}`,
      });
  }
  if (!candidates.length) return [];
  const offset = actor.actor.planGeneration % candidates.length;
  const selected = Array.from(
    { length: Math.min(profile.maximumCandidates, candidates.length) },
    (_, index) => candidates[(offset + index) % candidates.length]!,
  );
  return selected.map((row, index) =>
    index === 0 ? { ...row, text: profile.descriptions.motive + ' ' + row.text } : row,
  );
}

/** Resolve only the named personal places through the existing indexed memory
 * reader. Current world positions and unretained history never enter this input. */
export async function prepareSupplyOpportunityContext(
  repository: import('./memory-repository.js').MemoryRepository | undefined,
  scope: import('./memory-repository.js').MemoryScope | undefined,
  candidates: ReturnType<typeof supplyOpportunityContext>,
): Promise<Map<string, string>> {
  if (!repository || !scope || !candidates.length) return new Map();
  const known = new Map<string, string>();
  for (const id of new Set(candidates.map((row) => row.placeId))) {
    const result = await repository.knownPlaces(scope, { placeId: id, limit: 1, scan: 1 });
    const entry = result.entries[0];
    if (entry && !entry.correctionId) known.set(id, entry.place.capsule.label);
  }
  return known;
}

export function renderSupplyOpportunityContext(
  candidates: ReturnType<typeof supplyOpportunityContext>,
  known: ReadonlyMap<string, string>,
): string[] {
  return candidates.flatMap((row) =>
    known.has(row.placeId)
      ? [
          `${row.text} Personally retained place: ${known.get(row.placeId)} (${row.placeId}); current supplies and inhabitants remain unknown.`,
        ]
      : [],
  );
}
