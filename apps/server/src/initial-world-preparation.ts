import {
  selectedSocialPolicy,
  validateSocialPolicy,
  selectedCreationProfileForCandidate,
  defaultStoryPolicy,
  freezeWorld,
  hasMemory,
  initializeActorTraits,
  initializePerception,
  migrateCognition,
  mindFor,
  reconcileConditions,
  reconcileConstructionAuthority,
  updateWorld,
  validateStoryPolicy,
  type WorldCreationCandidate,
  type InitialWorldPreparation,
  type ConstructionPermission,
} from '@open-legend/domain';
import type { AccountBinding } from './authority.js';
import type { AppConfig } from './config.js';
import type { CreationStartupPreparation } from './creation-target.js';
import type { SavedWorld } from './store.js';
import { validateCurrentWorldState } from './upgrade-world.js';
import { prepareOpeningReadiness } from './world-opening-authoring.js';

/** Shared deterministic startup preparation. Fresh observations are requested only by
 * an ordinary newly assembled world; the creation builder already records its own.
 * docs/save-and-load.md#loading-as-an-authority-transition
 */
export function prepareWorldForStartup(
  saved: SavedWorld,
  config: AppConfig,
  actorOwners: ReadonlyMap<string, string>,
  constructionPermissions: readonly ConstructionPermission[],
  fresh: boolean,
): SavedWorld {
  const world = updateWorld(saved.world, (world) => {
    world.storyPolicy ??= defaultStoryPolicy();
    validateStoryPolicy(world.storyPolicy);
    world.minds ??= {};
    for (const entity of Object.values(world.entities))
      if (hasMemory(entity)) world.minds[entity.id] ??= mindFor(world, entity.id);
    migrateCognition(world);
    // Explicit authored traits, including an empty list, remain unchanged.
    initializeActorTraits(world);
    validateSocialPolicy(world);
    world.socialPolicy = { ...selectedSocialPolicy(world) };
    if (config.conversationInactivitySeconds !== undefined)
      world.socialPolicy.conversationInactivitySeconds = config.conversationInactivitySeconds;
    for (const [actorId, accountId] of actorOwners) {
      const actor = world.entities[actorId]?.actor;
      if (!actor) continue;
      actor.controller = 'player';
      world.authorship.playerAccountIds[actorId] = accountId;
    }
    if (fresh) {
      initializePerception(world, []);
      for (const entity of Object.values(world.entities)) reconcileConditions(world, entity, []);
    }
    world.paused = true;
    reconcileConstructionAuthority(world, constructionPermissions);
  });
  validateCurrentWorldState(world);
  return { ...saved, world };
}

/** Prepare the exact native starting world before its destination publishes a receipt.
 * The callback receives compact authored circumstances, never the source's saved world.
 */
export async function prepareCreatedWorld(
  initial: InitialWorldPreparation,
  binding: AccountBinding,
  config: AppConfig,
  candidate: WorldCreationCandidate,
): Promise<CreationStartupPreparation> {
  const selected = selectedCreationProfileForCandidate(candidate);
  if (!binding.actorId || binding.actorId !== selected.profile.controlledActor(selected.candidate))
    throw new Error('The prepared account must control the selected starting person.');
  const authorityOwners = new Map([[binding.actorId, binding.accountId]]);
  const savedWorld = prepareWorldForStartup(
    { world: initial.world, speed: 1, manuallyPaused: true },
    config,
    authorityOwners,
    initial.constructionSeeds,
    false,
  );
  freezeWorld(savedWorld.world);
  const readiness = await prepareOpeningReadiness(candidate, savedWorld.world);
  return {
    savedWorld,
    authorityBindings: [binding],
    authorityOwners,
    constructionSeeds: initial.constructionSeeds,
    ready: readiness.findings.every((finding) => finding.status === 'ready'),
    findings: readiness.findings.map((finding) => finding.message),
  };
}
