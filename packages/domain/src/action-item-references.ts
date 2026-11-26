import type { Action } from './types.js';
import type { PlannedCommand } from './agency.js';

/** Exact identities held by native work, distinct from an action's spatial targets. */
export function boundActionItemIds(action: Action | PlannedCommand | null | undefined): string[] {
  if (!action) return [];
  const ids: string[] = [];
  for (const field of ['itemId', 'weaponItemId', 'ammoItemId'] as const) {
    const value = (action as Partial<Record<typeof field, string>>)[field];
    if (typeof value === 'string') ids.push(value);
  }
  if ('inputs' in action) ids.push(...Object.values(action.inputs ?? {}));
  if ('tools' in action) ids.push(...Object.values(action.tools ?? {}));
  if ('foodPreparation' in action) ids.push(...Object.values(action.foodPreparation?.inputs ?? {}));
  if ('manufactureTools' in action)
    ids.push(...(action.manufactureTools ?? []).map((tool) => tool.itemId));
  return ids;
}
