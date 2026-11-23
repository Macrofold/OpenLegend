import { entityGet, entityValues } from '@open-legend/domain';
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
  reconcileCampAssetAuthority,
  updateWorld,
  validateStoryPolicy,
  type WorldCreationCandidate,
  type InitialWorldPreparation,
  type ConstructionPermission,
  type CampAssetPermission,
} from '@open-legend/domain';
import type { AccountBinding } from './authority.js';
import type { CreationStartupPreparation } from './creation-target.js';
import type { SavedWorld } from './saved-world.js';
import type { AssetRevisionReference } from '@open-legend/assets';
import { validateCurrentWorldState } from './upgrade-world.js';
import { prepareOpeningReadiness } from './world-opening-authoring.js';

/** Initial selection only; the publication transaction still checks current
 * permission and retains this exact release through AssetRepository.bindWorld. */
export function initialWorldArtwork(reference: AssetRevisionReference) {
  return {
    presentationRelease: structuredClone(reference),
    presentationReleaseRevision: 1,
  };
}

/** Shared deterministic startup preparation. Fresh observations are requested only by
 * an ordinary newly assembled world; the creation builder already records its own.
 * docs/save-and-load.md#loading-as-an-authority-transition
 */
export function prepareWorldForStartup(
  saved: SavedWorld,
  actorOwners: ReadonlyMap<string, string>,
  constructionPermissions: readonly ConstructionPermission[],
  fresh: boolean,
  campAssetPermissions: readonly CampAssetPermission[],
): SavedWorld {
  const before = saved.world;
  // Only an already initialized world can treat startup as bookkeeping. A new
  // mind, policy, trait set or controller still needs the ordinary full barrier.
  // docs/save-and-load.md#continuation-and-identity
  const retainNativeValues =
    !fresh &&
    before.storyPolicy !== undefined &&
    before.socialPolicy !== undefined &&
    before.identity !== undefined &&
    before.minds !== undefined &&
    before.experience !== undefined &&
    before.innerWorlds !== undefined &&
    entityValues(before.entities).every(
      (entity) =>
        !hasMemory(entity) ||
        (!!before.minds?.[entity.id] &&
          Object.hasOwn(before.experience!.awareness, entity.id) &&
          !!before.innerWorlds?.[entity.id] &&
          entity.actor?.traits !== undefined),
    ) &&
    [...actorOwners.keys()].every((id) => {
      const actor = entityGet(before.entities, id)?.actor;
      return !actor || actor.controller === 'player';
    });
  const world = updateWorld(
    before,
    (world) => {
      // Own the unchanged header before callbacks: an actual permission revocation
      // may retire it and must never have its old progress copied back afterward.
      if (retainNativeValues && before.nativeInterval)
        world.nativeInterval = { ...before.nativeInterval };
      world.storyPolicy ??= defaultStoryPolicy();
      validateStoryPolicy(world.storyPolicy);
      world.minds ??= {};
      for (const entity of entityValues(world.entities))
        if (hasMemory(entity)) world.minds[entity.id] ??= mindFor(world, entity.id);
      migrateCognition(world);
      // Explicit authored traits, including an empty list, remain unchanged.
      initializeActorTraits(world);
      validateSocialPolicy(world);
      world.socialPolicy = { ...selectedSocialPolicy(world) };
      for (const [actorId, accountId] of actorOwners) {
        const actor = entityGet(world.entities, actorId)?.actor;
        if (!actor) continue;
        actor.controller = 'player';
        world.authorship.playerAccountIds[actorId] = accountId;
      }
      if (fresh) {
        initializePerception(world, []);
        for (const entity of entityValues(world.entities)) reconcileConditions(world, entity, []);
      }
      world.paused = true;
      reconcileConstructionAuthority(world, constructionPermissions);
      reconcileCampAssetAuthority(world, campAssetPermissions);
    },
    { retainNativeValues },
  );
  validateCurrentWorldState(world);
  // Seal this completed transition before another startup edit uses its entity
  // branches; an editable predecessor cannot certify unchanged sensory inputs.
  // docs/save-and-load.md#continuation-and-identity
  return { ...saved, world: freezeWorld(world, { completedTransition: true }) };
}

/** Prepare the exact native starting world before its destination publishes a receipt.
 * The callback receives compact authored circumstances, never the source's saved world.
 */
export async function prepareCreatedWorld(
  initial: InitialWorldPreparation,
  binding: AccountBinding,
  candidate: WorldCreationCandidate,
  installedRelease: AssetRevisionReference,
): Promise<CreationStartupPreparation> {
  if (!binding.actorId)
    throw new Error('The prepared account must control the selected starting person.');
  const authorityOwners = new Map([[binding.actorId, binding.accountId]]);
  return {
    ...(await prepareReviewedOpening(initial, authorityOwners, candidate, installedRelease)),
    authorityBindings: [binding],
    authorityOwners,
    constructionSeeds: initial.constructionSeeds,
  };
}

/** Compile an authored opening and verify its physical readiness without a live
 * world or destination account access. Callers separately authenticate and
 * commit any actual grant. */
export async function prepareReviewedOpening(
  initial: InitialWorldPreparation,
  authorityOwners: ReadonlyMap<string, string>,
  candidate: WorldCreationCandidate,
  installedRelease: AssetRevisionReference,
) {
  const selected = selectedCreationProfileForCandidate(candidate);
  const actor = selected.profile.controlledActor(selected.candidate);
  if (authorityOwners.size !== 1 || !authorityOwners.has(actor))
    throw new Error('The prepared account must control the selected starting person.');
  const savedWorld = prepareWorldForStartup(
    {
      world: initial.world,
      speed: 1,
      manuallyPaused: true,
      ...(initial.useInstalledArtwork ? initialWorldArtwork(installedRelease) : {}),
    },
    authorityOwners,
    initial.constructionSeeds,
    false,
    [],
  );
  const readiness = await prepareOpeningReadiness(candidate, savedWorld.world);
  return {
    savedWorld,
    ready: readiness.findings.every((finding) => finding.status === 'ready'),
    findings: readiness.findings.map((finding) => finding.message),
  };
}
