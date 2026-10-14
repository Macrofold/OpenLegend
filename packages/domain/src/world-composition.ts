import { RESERVOIR_ACTIVITY_HOST } from './worlds/reservoir-demo/activity.js';
import {
  nativeActivityView as baseActivityView,
  sharedNativeActivityName as baseActivityName,
} from './worlds/base/action-views.js';
import type { Command } from './types.js';
import type { ActivityHostDescriptor } from './activity-hosts.js';
import type { RecipeFamilyDescriptor } from './invention-families.js';
import { BASE_CANOPY_ACTIVITY_HOST } from './worlds/base/canopies.js';
import { BASE_FIRE_ACTIVITY_HOST } from './worlds/base/fire-activity.js';
import { BASE_CAMP_ACTIVITY_HOST } from './worlds/base/camp-activity.js';
import { BASE_OUTING_HOST } from './worlds/base/outing.js';
import { BASE_NATIVE_ACTIVITY_HOSTS } from './worlds/base/native-activities.js';
import { BASE_RECIPE_FAMILIES } from './worlds/base/recipe-families.js';
import { BASE_CREATION_PROFILE } from './worlds/base/creation-profile.js';
import { BASE_SOCIAL_POLICY } from './worlds/base/social.js';
import { BASE_COMMAND_DESCRIPTIONS } from './worlds/base/action-descriptions.js';
import { baseTypedRequestVocabulary } from './worlds/base/typed-requests.js';
import { STOCK_ACTIVITY_HOST } from './stock-activity.js';
import type { WorldCreationCandidate, WorldCreationProfile } from './world-creation.js';
import type { WorldState } from './types.js';
import { isSafeRecordId } from './records.js';

/** Explicit application composition: trusted implementations are linked here, never
 * loaded from world data. The installed manifest remains the only capability selector.
 * docs/engine-and-world-boundaries.md#intentional-v1-specificity */
let activityHosts: readonly ActivityHostDescriptor[] | undefined;
export function trustedActivityHosts(): readonly ActivityHostDescriptor[] {
  return (activityHosts ??= [
    STOCK_ACTIVITY_HOST,
    RESERVOIR_ACTIVITY_HOST,
    ...BASE_NATIVE_ACTIVITY_HOSTS,
    BASE_FIRE_ACTIVITY_HOST,
    BASE_CAMP_ACTIVITY_HOST,
    BASE_OUTING_HOST,
    BASE_CANOPY_ACTIVITY_HOST,
  ]);
}
export function trustedRecipeImplementations(): readonly RecipeFamilyDescriptor[] {
  return BASE_RECIPE_FAMILIES;
}
export function selectedCreationProfile(id: string): WorldCreationProfile {
  if (id !== BASE_CREATION_PROFILE.id) throw new Error('Unsupported selected creation profile.');
  return BASE_CREATION_PROFILE;
}
export function selectedCreationProfileForCandidate(value: unknown): {
  profile: WorldCreationProfile;
  candidate: WorldCreationCandidate;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('An opening candidate must select a supported profile.');
  const envelope = value as Partial<WorldCreationCandidate>;
  if (
    !envelope.profile ||
    typeof envelope.profile.id !== 'string' ||
    !isSafeRecordId(envelope.worldId)
  )
    throw new Error('An opening candidate must carry its profile and world identity.');
  const profile = selectedCreationProfile(envelope.profile.id);
  if (envelope.profile.version !== profile.version)
    throw new Error('Incompatible selected creation profile.');
  return { profile, candidate: profile.validate(value) };
}
export function selectedCreationProfileForWorld(world: WorldState): WorldCreationProfile {
  if (world.profile.id !== 'grounded-wilderness' || world.profile.version !== 1)
    throw new Error('This world has no supported initial creation profile.');
  return BASE_CREATION_PROFILE;
}
export function selectedSocialDefaults(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_SOCIAL_POLICY;
}
export function selectedTypedRequestVocabulary(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return baseTypedRequestVocabulary(world);
}

export function commandDescriptions(): Readonly<Record<string, string>> {
  return BASE_COMMAND_DESCRIPTIONS;
}

export function nativeActivityView(world: WorldState, command: Command) {
  selectedCreationProfileForWorld(world);
  return baseActivityView(world, command);
}
export function sharedNativeActivityName(world: WorldState, command: Command) {
  selectedCreationProfileForWorld(world);
  return baseActivityName(world, command);
}
