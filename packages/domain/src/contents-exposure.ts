import { definitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, worldSupport } from './spatial-state.js';
import type { Entity, ItemDefinition, WorldState } from './types.js';

/** One admitted open level. A name, capacity or arbitrary transmission grants no shelter. */
export interface ContentsExposureProfile {
  id: string;
  version: number;
  implementation: 'open-single-level';
  transmission: 1;
  eligibleMaterialRoles: ['cover', 'fiber'];
  footprint: 'container-body-top';
  carriedHeight: 'carrier-handling-height';
  labels: { name: string; description: string };
}
export function validateContentsExposureProfile(
  value: unknown,
): asserts value is ContentsExposureProfile {
  if (
    !hasRecordFields(value, [
      'id',
      'version',
      'implementation',
      'transmission',
      'eligibleMaterialRoles',
      'footprint',
      'carriedHeight',
      'labels',
    ]) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    value.implementation !== 'open-single-level' ||
    value.transmission !== 1 ||
    !Array.isArray(value.eligibleMaterialRoles) ||
    value.eligibleMaterialRoles.length !== 2 ||
    value.eligibleMaterialRoles[0] !== 'cover' ||
    value.eligibleMaterialRoles[1] !== 'fiber' ||
    value.footprint !== 'container-body-top' ||
    value.carriedHeight !== 'carrier-handling-height' ||
    !hasRecordFields(value.labels, ['name', 'description']) ||
    Object.values(value.labels).some((t) => typeof t !== 'string' || !t.trim() || t.length > 700)
  )
    throw new Error('Invalid open contents-exposure profile.');
}
export function contentsExposureProfile(
  world: WorldState,
  pin: unknown,
): ContentsExposureProfile | undefined {
  if (!isDefinitionPin(pin)) return;
  const profile = getOwn(world.contentsExposureProfiles ?? {}, pin.id);
  return profile && sameDefinitionPin(pin, definitionPin(profile)) ? profile : undefined;
}
export function openContentsProfile(
  world: WorldState,
  container: Entity,
): ContentsExposureProfile | undefined {
  const definition = container.item && world.itemDefinitions[container.item.definitionPin.id];
  return (
    definition?.contentsExposure &&
    contentsExposureProfile(world, definition.contentsExposure.profile)
  );
}
export function exposedContentsMaterial(world: WorldState, definition: ItemDefinition): boolean {
  const material = definition.assemblyMaterial;
  return (
    !!material &&
    world.assemblyFamilies?.[material.familyId]?.implementation === 'four-corner-flexible-bays' &&
    (material.role === 'cover' || material.role === 'fiber')
  );
}
/** Read proposed outer custody without mutating it; movement and restore share this contract. */
export function openContentsRoot(
  world: WorldState,
  container: Entity,
  parentId?: string,
): Entity | undefined {
  const placement = container.placement;
  const id = parentId ?? (placement?.mode === 'contained' ? placement.parentEntityId : undefined);
  const root = id && entityGet(world.entities, id);
  if (
    !root ||
    root.retirement ||
    root.placement?.mode !== 'world' ||
    (!root.actor && root.kind !== 'item-pile') ||
    worldSupport(root) === null
  )
    return;
  const body = bodyProfile(container);
  return body.radius > 0 && body.height > 0 ? root : undefined;
}
export function validateContentsExposureDefinitions(world: WorldState): void {
  for (const [id, profile] of Object.entries(world.contentsExposureProfiles ?? {})) {
    validateContentsExposureProfile(profile);
    if (id !== profile.id) throw new Error('Conflicting contents-exposure identity.');
  }
  for (const definition of Object.values(world.itemDefinitions))
    if (
      definition.contentsExposure !== undefined &&
      (!definition.container ||
        !hasRecordFields(definition.contentsExposure, ['profile']) ||
        !contentsExposureProfile(world, definition.contentsExposure.profile))
    )
      throw new Error('A container needs its exact installed contents-exposure profile.');
}

export function materialContainerAllowed(
  world: WorldState,
  definition: ItemDefinition,
  container: Entity,
): boolean {
  return (
    exposedContentsMaterial(world, definition) &&
    !!openContentsProfile(world, container) &&
    !!openContentsRoot(world, container)
  );
}
