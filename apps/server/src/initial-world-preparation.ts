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
  spatialMap,
  migrateCognition,
  mindFor,
  reconcileConditions,
  reconcileConstructionAuthority,
  reconcileCampAssetAuthority,
  updateWorld,
  validateStoryPolicy,
  type WorldCreationCandidate,
  type WorldState,
  type InitialWorldPreparation,
  type ConstructionPermission,
  type CampAssetPermission,
  type AppearanceFamilyDefinition,
} from '@open-legend/domain';
import type { AccountBinding } from './authority.js';
import type { SavedWorld } from './saved-world.js';
import type { AssetRevisionReference } from '@open-legend/assets';
import { validateCurrentWorldState } from './upgrade-world.js';
import type { AssetPrincipal } from './asset-repository.js';
import { fingerprint } from './relationship-index.js';
import { countMetric } from './performance.js';
import { prepareCandidateNavigation } from './navigation/preparation.js';

export interface CreationStartupPreparation {
  savedWorld: SavedWorld;
  authorityBindings: readonly AccountBinding[];
  authorityOwners: ReadonlyMap<string, string>;
  constructionSeeds: readonly ConstructionPermission[];
  ready: boolean;
  findings: readonly string[];
}

/** Initial selection only; the publication transaction still checks current
 * permission and retains this exact release through AssetRepository.bindWorld. */
export function initialWorldArtwork(reference: AssetRevisionReference) {
  return {
    presentationRelease: structuredClone(reference),
    presentationReleaseRevision: 1,
  };
}

/** Apply only the selected opening's transient trusted installation policy. The
 * participant-facing descriptor and compiled file are admitted by the asset owner;
 * numerical correspondence remains the publication/renderer admission contract.
 * docs/projects/people-from-parts-authoring-contract.md#external-family-package
 */
export async function prepareInitialAppearance(
  initial: Pick<
    InitialWorldPreparation,
    'world' | 'useInstalledArtwork' | 'installAppearanceFamilies'
  >,
  principal: AssetPrincipal,
  appearanceFamilies?: (
    principal: AssetPrincipal,
  ) => Promise<readonly AppearanceFamilyDefinition[]>,
): Promise<WorldState> {
  const install = initial.useInstalledArtwork && initial.installAppearanceFamilies;
  if (!install || !appearanceFamilies) return initial.world;
  const families = await appearanceFamilies(principal);
  return families.length
    ? updateWorld(initial.world, (world) => install(world, families))
    : initial.world;
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

// One recent physical batch can serve repeated checks and wording-only edits. Its
// key covers native geometry, body, endpoints and policy; no private actor history.
// Incomplete native work is evicted so an explicit check can retry it honestly.
let recentRoutes: { key: string; value: ReturnType<typeof prepareCandidateNavigation> } | undefined;

/** Validate authored readiness and share only an identical geometry/body/navigation
 * batch. It may prepare routes off-thread and hold their result until completion.
 * Callers retain independent grants and any exact opening approval. */
export async function prepareOpeningReadiness(
  candidate: WorldCreationCandidate,
  world: WorldState,
) {
  const { profile } = selectedCreationProfileForCandidate(candidate);
  const initial = profile.readiness(candidate, world);
  if (!initial.navigation.length) return initial;
  const map = spatialMap(world);
  const key = fingerprint([map, initial.navigation]);
  let batch = recentRoutes;
  if (batch?.key === key) countMetric('creation.navigation.reused');
  else {
    countMetric('creation.navigation.prepared');
    batch = { key, value: prepareCandidateNavigation(map, initial.navigation) };
    recentRoutes = batch;
  }
  let routes: Awaited<typeof batch.value>;
  try {
    routes = await batch.value;
  } catch (error) {
    if (recentRoutes === batch) recentRoutes = undefined;
    throw error;
  }
  if (
    [...routes.values()].some(
      (route) => route.status === 'unavailable' || route.status === 'budget-exceeded',
    ) &&
    recentRoutes === batch
  )
    recentRoutes = undefined;
  return profile.readiness(candidate, world, routes);
}

/** Prepare the exact native starting world before its destination publishes a receipt.
 * The callback receives compact authored circumstances, never the source's saved world.
 */
export async function prepareCreatedWorld(
  initial: InitialWorldPreparation,
  binding: AccountBinding,
  candidate: WorldCreationCandidate,
  installedRelease: AssetRevisionReference,
  appearanceFamilies?: (
    principal: AssetPrincipal,
  ) => Promise<readonly AppearanceFamilyDefinition[]>,
): Promise<CreationStartupPreparation> {
  if (!binding.actorId)
    throw new Error('The prepared account must control the selected starting person.');
  const authorityOwners = new Map([[binding.actorId, binding.accountId]]);
  const world = await prepareInitialAppearance(
    initial,
    { accountId: binding.accountId },
    appearanceFamilies,
  );
  return {
    ...(await prepareReviewedOpening({ ...initial, world }, authorityOwners, candidate, installedRelease)),
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
