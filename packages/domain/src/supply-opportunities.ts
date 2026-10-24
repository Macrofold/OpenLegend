import { hasRecordFields, isSafeRecordId } from './records.js';
import { entityGet } from './entity-collection.js';
import type { WorldState } from './types.js';

/** Optional authored reasons, never goals, permissions or an action sequence. */
export interface SupplyOpportunityProfile {
  id: string;
  version: number;
  foodBelow: number;
  ammunitionBelow: number;
  maximumCandidates: number;
  descriptions: {
    motive: string;
    food: string;
    ammunition: string;
    material: string;
    alternatives: string;
  };
  places: Array<{
    id: string;
    purposes: Array<'food' | 'ammunition' | 'material'>;
    materialIds: string[];
  }>;
}
export function validateSupplyOpportunityProfile(
  value: unknown,
): asserts value is SupplyOpportunityProfile {
  if (
    !hasRecordFields(value, [
      'id',
      'version',
      'foodBelow',
      'ammunitionBelow',
      'maximumCandidates',
      'descriptions',
      'places',
    ]) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    typeof value.foodBelow !== 'number' ||
    !Number.isFinite(value.foodBelow) ||
    value.foodBelow < 0 ||
    !Number.isSafeInteger(value.ammunitionBelow) ||
    Number(value.ammunitionBelow) < 0 ||
    !Number.isSafeInteger(value.maximumCandidates) ||
    Number(value.maximumCandidates) < 1 ||
    Number(value.maximumCandidates) > 64 ||
    !hasRecordFields(value.descriptions, [
      'motive',
      'food',
      'ammunition',
      'material',
      'alternatives',
    ]) ||
    Object.values(value.descriptions).some(
      (text) => typeof text !== 'string' || !text.trim() || text.length > 2000,
    ) ||
    !Array.isArray(value.places)
  )
    throw new Error('Invalid installed optional supply considerations.');
  for (const row of value.places)
    if (
      !hasRecordFields(row, ['id', 'purposes', 'materialIds']) ||
      !isSafeRecordId(row.id) ||
      !Array.isArray(row.purposes) ||
      row.purposes.some((purpose) => !['food', 'ammunition', 'material'].includes(purpose)) ||
      !Array.isArray(row.materialIds) ||
      row.materialIds.some((id) => !isSafeRecordId(id))
    )
      throw new Error('Invalid optional known supply place.');
}
export function validateSupplyOpportunities(world: WorldState): void {
  const rows = world.supplyOpportunities;
  if (rows === undefined) return;
  if (!rows || typeof rows !== 'object' || Array.isArray(rows))
    throw new Error('Invalid installed supply opportunities.');
  for (const [actorId, profile] of Object.entries(rows)) {
    validateSupplyOpportunityProfile(profile);
    if (
      !entityGet(world.entities, actorId)?.actor ||
      profile.places.some((place) => place.materialIds.some((id) => !world.itemDefinitions[id]))
    )
      throw new Error('Unresolved personal supply consideration.');
  }
}
