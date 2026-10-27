import {
  validateNativeForagingProfile,
  type NativeForagingProfile,
} from '../../native-foraging.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import type { ItemDefinition } from '../../types.js';
import type { StrikeDefinition } from '../../strikes.js';

export interface BaseEcologyConfiguration {
  profiles: NativeForagingProfile[];
  territories: Array<{
    profileId: string;
    policy: Omit<import('../../territorial-threat.js').TerritorialPolicy, 'home' | 'refuge'>;
  }>;
  assignments: Array<{
    species: string;
    profileId: string;
    packId?: string;
    home?: [number, number];
    nearestAnchors?: number;
    anchors: Array<[number, number]>;
    initialById: Record<string, number>;
  }>;
  pasture: { definition: ItemDefinition; units: number; anchors: Array<[number, number]> };
  strikes: StrikeDefinition[];
  pursuitLocomotion: Record<string, { travel: number; escape: number }>;
}
export function compileBaseEcologyConfiguration(value: unknown): BaseEcologyConfiguration {
  const fail = (): never => {
    throw new Error('Invalid authored first-playable ecology.');
  };
  if (
    !hasRecordFields(value, [
      'profiles',
      'territories',
      'assignments',
      'pasture',
      'strikes',
      'pursuitLocomotion',
    ]) ||
    !Array.isArray(value.profiles) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.strikes)
  )
    fail();
  const data = value as unknown as BaseEcologyConfiguration;
  if (
    !Array.isArray(data.territories) ||
    data.territories.some(
      (row) =>
        !hasRecordFields(row, ['profileId', 'policy']) ||
        !data.profiles.some((profile) => profile.id === row.profileId),
    )
  )
    fail();
  for (const profile of data.profiles) validateNativeForagingProfile(profile);
  if (new Set(data.profiles.map((row) => row.id)).size !== data.profiles.length) fail();
  const point = (value: unknown) =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n));
  for (const row of data.assignments) {
    if (
      !hasRecordFields(
        row,
        ['species', 'profileId', 'anchors', 'initialById'],
        ['packId', 'home', 'nearestAnchors'],
      ) ||
      !isSafeRecordId(row.species) ||
      !data.profiles.some((profile) => profile.id === row.profileId) ||
      (row.packId !== undefined && !isSafeRecordId(row.packId)) ||
      (row.home !== undefined && !point(row.home)) ||
      (row.nearestAnchors !== undefined &&
        (!Number.isSafeInteger(row.nearestAnchors) ||
          row.nearestAnchors < 2 ||
          row.nearestAnchors > row.anchors.length)) ||
      !Array.isArray(row.anchors) ||
      row.anchors.length < 2 ||
      row.anchors.length > 4 ||
      !row.anchors.every(point) ||
      !row.initialById ||
      typeof row.initialById !== 'object' ||
      Array.isArray(row.initialById) ||
      Object.entries(row.initialById).some(
        ([id, n]) => !isSafeRecordId(id) || !Number.isFinite(n) || n < 0,
      )
    )
      fail();
  }
  if (
    new Set(data.assignments.map((row) => row.species)).size !== data.assignments.length ||
    !hasRecordFields(data.pasture, ['definition', 'units', 'anchors']) ||
    !Number.isSafeInteger(data.pasture.units) ||
    data.pasture.units <= 0 ||
    !Array.isArray(data.pasture.anchors) ||
    !data.pasture.anchors.every(point) ||
    !isSafeRecordId(data.pasture.definition?.id) ||
    !(data.pasture.definition.nutrition! > 0) ||
    data.pasture.definition.portable !== false ||
    !data.pursuitLocomotion ||
    typeof data.pursuitLocomotion !== 'object' ||
    Array.isArray(data.pursuitLocomotion)
  )
    fail();
  for (const [id, row] of Object.entries(data.pursuitLocomotion))
    if (
      !isSafeRecordId(id) ||
      !hasRecordFields(row, ['travel', 'escape']) ||
      ![row.travel, row.escape].every((n) => Number.isFinite(n) && n > 0)
    )
      fail();
  return structuredClone(data);
}
