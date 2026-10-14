import type { ItemDefinition, WorldState } from './types.js';
import { getOwn } from './records.js';

/** Only existing scalar component values are readable; authored metadata cannot traverse state. */
const scalarFields = {
  packingLoad: (item: ItemDefinition) => item.packingLoad,
  'launcher.damage': (item: ItemDefinition) => item.launcher?.damage,
  'launcher.range': (item: ItemDefinition) => item.launcher?.range,
  'launcher.accuracy': (item: ItemDefinition) => item.launcher?.accuracy,
  'launcher.ammunitionKind': (item: ItemDefinition) => item.launcher?.ammunitionKind,
  'melee.damage': (item: ItemDefinition) => item.melee?.damage,
  'melee.range': (item: ItemDefinition) => item.melee?.range,
  'melee.accuracy': (item: ItemDefinition) => item.melee?.accuracy,
  'melee.windupSeconds': (item: ItemDefinition) => item.melee?.windupSeconds,
  'melee.recoverySeconds': (item: ItemDefinition) => item.melee?.recoverySeconds,
  'ammunition.damageBonus': (item: ItemDefinition) => item.ammunition?.damageBonus,
  'container.capacity': (item: ItemDefinition) => item.container?.capacity,
  'container.maximumDepth': (item: ItemDefinition) => item.container?.maximumDepth,
  'gatheringTool.quantity': (item: ItemDefinition) => item.gatheringTool?.quantity,
  'gatheringTool.resourceId': (item: ItemDefinition) => item.gatheringTool?.resourceId,
};
export type ItemCharacteristicPath = keyof typeof scalarFields;
export interface ItemCharacteristicDescriptor {
  key: string;
  label: string;
  path: ItemCharacteristicPath;
  unit?: string;
}
export interface ItemCharacteristic {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string;
}
const text = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
export function validateItemCharacteristics(definition: ItemDefinition): void {
  const metadata: unknown = definition.characteristics;
  if (metadata === undefined) return;
  if (!Array.isArray(metadata)) throw new Error('Invalid item characteristic metadata.');
  const keys = new Set<string>(),
    paths = new Set<string>();
  for (const entry of metadata) {
    const row: unknown = entry;
    if (
      !record(row) ||
      Object.keys(row).some((key) => !['key', 'label', 'path', 'unit'].includes(key)) ||
      !text(row.key, 120) ||
      !text(row.label, 160) ||
      typeof row.path !== 'string' ||
      !Object.hasOwn(scalarFields, row.path) ||
      (row.unit !== undefined && !text(row.unit, 80)) ||
      keys.has(row.key) ||
      paths.has(row.path)
    )
      throw new Error('Invalid item characteristic metadata.');
    keys.add(row.key);
    paths.add(row.path);
  }
}

/** Callers apply their existing knowledge/access checks before presenting these definition facts. */
export function itemCharacteristics(
  world: WorldState,
  definition: ItemDefinition,
): ItemCharacteristic[] {
  if (definition.recipeId) {
    const recipe = getOwn(world.recipes, definition.recipeId);
    return recipe?.outputDefinitionId === definition.id
      ? recipe.facts.map(({ id: key, ...fact }) => ({ key, ...fact }))
      : [];
  }
  return (definition.characteristics ?? []).map(({ path, ...metadata }) => {
    const value = scalarFields[path](definition);
    return {
      ...metadata,
      value:
        typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
          ? value
          : null,
    };
  });
}
