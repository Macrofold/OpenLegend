import { assetRevisionKey, type AssetRevisionReference } from '@open-legend/assets';
import { canStand, validateBodyProfile, type BodyProfile } from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { recordSemanticChange } from './dependencies.js';
import { draftWorld } from './draft.js';
import { canonicalJson, finish, outcome } from './events.js';
import { spatialMap, worldPosition, worldSupport } from './spatial-state.js';
import { equippedItems } from './equipment.js';
import { getOwn, isSafeRecordId } from './records.js';
import {
  resolveAppearanceRecipe,
  sameAppearanceFamily,
  validateAppearanceFamily,
  validAppearanceRecipeShape,
  type AppearanceFamilyDefinition,
  type AppearanceRecipe,
} from './appearance.js';
import type { Entity, WorldState, Transition } from './types.js';

export interface AppearanceState {
  physicalLife: number;
  revision: number;
  recipe: AppearanceRecipe;
}
export interface WearableAppearance {
  family: AssetRevisionReference;
  partId: string;
  /** Initial creator intent only; actually worn lots remain equipment-owned. */
  defaultForCreation?: boolean;
}
export interface AppearanceDefinitions {
  families: Record<string, AppearanceFamilyDefinition>;
  /** Actual item definitions select presentation parts; the recipe saves no worn list. */
  wearables: Record<string, WearableAppearance>;
  /** Selected-world physical policy, separate from cosmetic family control meaning. */
  stature: Record<string, { controlId: string; referenceBody: BodyProfile }>;
}

export function appearanceFamily(world: WorldState, reference: AssetRevisionReference) {
  const families = world.appearanceDefinitions?.families;
  const key = assetRevisionKey(reference);
  // Asset tuples use the asset owner's namespace/size envelope, not gameplay IDs.
  const family = families && Object.hasOwn(families, key) ? families[key] : undefined;
  return family && sameAppearanceFamily(family.reference, reference) ? family : undefined;
}
export function appearanceFor(world: WorldState, entity: Entity): AppearanceState | undefined {
  const state = world.appearanceRecipes && getOwn(world.appearanceRecipes, entity.id);
  return state && state.physicalLife === (entity.actor?.physicalLife ?? 0) ? state : undefined;
}

export function appearanceBodyProfile(
  world: WorldState,
  recipe: AppearanceRecipe,
  fallback: BodyProfile,
): BodyProfile {
  const profiles = world.appearanceDefinitions?.stature;
  const key = assetRevisionKey(recipe.family);
  const profile = profiles && Object.hasOwn(profiles, key) ? profiles[key] : undefined;
  if (!profile) return fallback;
  const height = recipe.controls[profile.controlId];
  if (height === undefined || !Number.isFinite(height) || height <= 0)
    throw new Error('Choose a supported height.');
  const body = profile.referenceBody,
    ratio = height / body.height;
  return {
    ...body,
    height,
    eyeHeight: body.eyeHeight * ratio,
    earHeight: body.earHeight * ratio,
    interactionHeight: body.interactionHeight * ratio,
  };
}

/** Called within creation/edit's existing draft. Cosmetic saves touch only the
 * sparse row; physical stature changes additionally notify the native body owner. */
export function setAppearance(
  world: WorldState,
  entity: Entity,
  recipe: AppearanceRecipe,
  expectedRevision: number,
  expectedLife: number,
): void {
  if ((entity.actor?.physicalLife ?? 0) !== expectedLife)
    throw new Error('This person has changed. Refresh before saving.');
  const previous = appearanceFor(world, entity);
  if ((previous?.revision ?? 0) !== expectedRevision)
    throw new Error('This appearance changed. Refresh before saving.');
  const family = appearanceFamily(world, recipe.family);
  if (!family || !family.compiled)
    throw new Error('This appearance collection is not ready to use.');
  const resolved = resolveAppearanceRecipe(family, recipe);
  if (!resolved.ok) throw new Error(resolved.message);
  if (
    (!previous || !sameAppearanceFamily(previous.recipe.family, resolved.recipe.family)) &&
    equippedItems(world, entity.id).some((item) => {
      const part = world.appearanceDefinitions?.wearables[item.definitionId];
      return part && !sameAppearanceFamily(part.family, resolved.recipe.family);
    })
  )
    throw new Error('Remove clothing that does not fit the selected body before saving.');
  const stature = world.appearanceDefinitions?.stature[assetRevisionKey(recipe.family)];
  // Once installed, the physical body remains authoritative. A cosmetic edit must
  // not reapply a profile after an independent physical owner has changed it.
  const statureChanged =
    stature &&
    (!previous ||
      !sameAppearanceFamily(previous.recipe.family, resolved.recipe.family) ||
      previous.recipe.controls[stature.controlId] !== resolved.recipe.controls[stature.controlId]);
  const body = statureChanged
    ? appearanceBodyProfile(world, resolved.recipe, entity.spatial.body)
    : entity.spatial.body;
  const resized = JSON.stringify(body) !== JSON.stringify(entity.spatial.body);
  if (resized) {
    if (
      !entity.actor?.alive ||
      entity.actor.action ||
      entity.spatial.localPose ||
      entity.spatial.flight
    )
      throw new Error('Stop current movement or work before changing height.');
    const support = worldSupport(entity);
    if (
      !support ||
      !canStand(spatialMap(world), { ...worldPosition(entity), surfaceId: support }, body)
    )
      throw new Error('There is not enough room for the selected height.');
    entity.spatial.body = body;
    if (entity.actor.body) entity.actor.body.revision++;
    recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'body' });
  }
  if (previous && canonicalJson(previous.recipe) === canonicalJson(resolved.recipe)) return;
  (world.appearanceRecipes ??= {})[entity.id] = {
    physicalLife: entity.actor?.physicalLife ?? 0,
    revision: (previous?.revision ?? 0) + 1,
    recipe: resolved.recipe,
  };
}

/** Visual-only editor writes do not normalize biography or run cognition owners. */
export function editAppearance(
  original: WorldState,
  actorId: string,
  appearance: { revision: number; physicalLife: number; recipe: AppearanceRecipe },
): Transition {
  const current = entityGet(original.entities, actorId);
  if (!current?.actor)
    return { world: original, events: [], outcome: outcome(false, 'actor', 'Choose a person.') };
  const world = draftWorld(original);
  const person = entityGet(world.entities, actorId);
  if (!person?.actor)
    return { world: original, events: [], outcome: outcome(false, 'actor', 'Choose a person.') };
  try {
    setAppearance(world, person, appearance.recipe, appearance.revision, appearance.physicalLife);
    return finish(world, [], outcome(true, 'appearance-saved', 'Appearance saved.'));
  } catch (error) {
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'appearance',
        error instanceof Error ? error.message : 'This appearance could not be saved.',
      ),
    };
  }
}

export function appearanceOutfit(world: WorldState, wearerId: string) {
  const entity = entityGet(world.entities, wearerId),
    state = entity && appearanceFor(world, entity);
  if (!state) return [];
  return equippedItems(world, wearerId).flatMap((item) => {
    const part =
      world.appearanceDefinitions &&
      getOwn(world.appearanceDefinitions.wearables, item.definitionId);
    return part && sameAppearanceFamily(part.family, state.recipe.family)
      ? [
          {
            itemId: item.id,
            definitionId: item.definitionId,
            partId: part.partId,
            revision: item.revision ?? 0,
          },
        ]
      : [];
  });
}

export function validateAppearanceState(world: WorldState): void {
  const definitions = world.appearanceDefinitions;
  if (definitions) {
    if (!definitions.families || !definitions.wearables || !definitions.stature)
      throw new Error('Incomplete appearance definitions.');
    for (const [key, family] of Object.entries(definitions.families)) {
      validateAppearanceFamily(family);
      if (key !== assetRevisionKey(family.reference))
        throw new Error('Invalid appearance collection identity.');
    }
    for (const [key, profile] of Object.entries(definitions.stature)) {
      const family = Object.hasOwn(definitions.families, key)
        ? definitions.families[key]
        : undefined;
      if (
        !family?.controls.some(
          (control) =>
            control.id === profile.controlId && control.kind === 'stature' && control.minimum > 0,
        )
      )
        throw new Error('Invalid physical appearance profile.');
      validateBodyProfile(profile.referenceBody);
    }
    const defaultPorts = new Map<string, Set<string>>();
    for (const [id, part] of Object.entries(definitions.wearables)) {
      const equipment = getOwn(world.itemDefinitions, id)?.equipment;
      if (
        !equipment ||
        !appearanceFamily(world, part.family) ||
        !isSafeRecordId(part.partId) ||
        (part.defaultForCreation !== undefined && typeof part.defaultForCreation !== 'boolean')
      )
        throw new Error('Invalid wearable appearance definition.');
      if (!part.defaultForCreation) continue;
      const familyKey = assetRevisionKey(part.family);
      let occupied = defaultPorts.get(familyKey);
      if (!occupied) {
        occupied = new Set();
        defaultPorts.set(familyKey, occupied);
      }
      for (const port of equipment.ports) {
        if (occupied.has(port))
          throw new Error('Default clothing uses the same equipment slot twice.');
        occupied.add(port);
      }
    }
  }
  for (const [id, state] of Object.entries(world.appearanceRecipes ?? {})) {
    const entity = entityGet(world.entities, id);
    if (
      !entity?.actor ||
      !Number.isSafeInteger(state.physicalLife) ||
      state.physicalLife !== (entity.actor.physicalLife ?? 0) ||
      !Number.isSafeInteger(state.revision) ||
      state.revision < 1 ||
      !validAppearanceRecipeShape(state.recipe)
    )
      throw new Error('Invalid saved appearance.');
    const family = appearanceFamily(world, state.recipe.family);
    if (!family) throw new Error('Missing saved appearance collection.');
    const resolved = resolveAppearanceRecipe(family, state.recipe);
    if (
      !resolved.ok ||
      Object.keys(state.recipe.controls).length !== family.controls.length ||
      Object.keys(state.recipe.selections).length !== family.selections.length
    )
      throw new Error('Incomplete or unsupported saved appearance.');
  }
}
