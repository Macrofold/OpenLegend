import type { AssemblyCoverProfile, FlexibleBayFamily } from './assembly-types.js';
import type { DefinitionPin } from './world-modules.js';
import type { WorldState } from './types.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { entityGet } from './entity-collection.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { SPATIAL_LIMITS } from '@open-legend/spatial';

export function validateAssemblyCoverProfiles(
  value: unknown,
): asserts value is AssemblyCoverProfile[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Missing covering profiles.');
  const ids = new Set<string>();
  for (const profile of value) {
    if (
      !hasRecordFields(profile, [
        'id',
        'version',
        'implementation',
        'name',
        'width',
        'length',
        'thickness',
        'edge',
        'transmission',
      ]) ||
      !isSafeRecordId(profile.id) ||
      ids.has(profile.id) ||
      !Number.isSafeInteger(profile.version) ||
      Number(profile.version) <= 0 ||
      profile.implementation !== 'flexible-sheet' ||
      typeof profile.name !== 'string' ||
      !profile.name.trim() ||
      ![profile.width, profile.length, profile.thickness].every(
        (v) =>
          typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= SPATIAL_LIMITS.maxExtent,
      ) ||
      typeof profile.edge !== 'number' ||
      !Number.isFinite(profile.edge) ||
      profile.edge < 0 ||
      typeof profile.transmission !== 'number' ||
      !Number.isFinite(profile.transmission) ||
      profile.transmission < 0 ||
      profile.transmission > 1
    )
      throw new Error('Invalid exact covering profile.');
    ids.add(profile.id);
  }
}
export function assemblyCoverProfile(
  family: FlexibleBayFamily,
  pin: DefinitionPin,
): AssemblyCoverProfile | undefined {
  return family.coverProfiles.find((profile) => sameDefinitionPin(pin, definitionPin(profile)));
}
export function defaultCoverProfile(family: FlexibleBayFamily): AssemblyCoverProfile {
  return assemblyCoverProfile(family, family.defaultCover)!;
}
/** The physical item selects its sheet. A family default is only an unselected layout preview. */
export function materialCoverProfile(
  world: WorldState,
  itemId: string,
): AssemblyCoverProfile | undefined {
  const item = entityGet(world.entities, itemId)?.item;
  const material = item && world.itemDefinitions[item.definitionPin.id]?.assemblyMaterial;
  const family = material && world.assemblyFamilies?.[material.familyId];
  return material &&
    family?.implementation === 'four-corner-flexible-bays' &&
    material.role === 'cover' &&
    material.coverProfile
    ? assemblyCoverProfile(family, material.coverProfile)
    : undefined;
}
