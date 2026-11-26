import { createBaseDiagnosticWorld } from '../../packages/domain/src/worlds/base/world.js';
import type { WorldCreationAccounts } from '../../packages/domain/src/invention-attribution.js';
import { installFixedTransform } from '../../packages/domain/src/declarations.js';
import { learnRecipe } from '../../packages/domain/src/knowledge.js';
import { recipeMechanicalPin } from '../../packages/domain/src/invention-families.js';
import { validateSocialOfferPolicy } from '../../packages/domain/src/social-offer-policy.js';
import socialOffers from '../../packages/domain/src/worlds/base/config/social-offers.generated.json' with { type: 'json' };
import type { WorldState } from '../../packages/domain/src/types.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { prepareBaseInitialWorldState } from '../../packages/domain/src/worlds/base/initial-opening.js';

// Browser fixtures construct their opening before the server can initialize physics.
await initializeCollisionRuntime();

/** Explicit supplied camp for isolated native-action examples. The real ordinary
 * Main is empty handed; these specimens need chosen stock and the small diagnostic opening. */
export function stockedCamp(seed = 73, accounts?: WorldCreationAccounts) {
  const world = createBaseDiagnosticWorld(seed, accounts);
  // This is fresh authored state, not a restored world. Stored fixtures need the
  // same actual starting reception and bodily concerns as ordinary creation.
  prepareBaseInitialWorldState(world);
  // These isolated action specimens start running rather than awaiting review
  // of a newly created playable opening.
  world.paused = false;
  return world;
}

/** Selected authored cooperation in the small native fixture, without the full Main
 * content bundle. This does not change ordinary startup or diagnostic defaults. */
export function cooperativeCamp(seed = 73, accounts?: WorldCreationAccounts) {
  const world = stockedCamp(seed, accounts);
  const policy = structuredClone(socialOffers.firstPlayable);
  validateSocialOfferPolicy(policy);
  world.socialOfferPolicy = policy;
  return world;
}

/** Real trusted-method admission for multi-output role/binding fixtures. */
export function installFixtureMultiOutputMethod(
  world: WorldState,
  actorId: string,
  id = 'fixture:shared-input',
  name = 'Shared-input method',
) {
  const recipe = installFixedTransform(
    world,
    {
      id,
      version: 1,
      name,
      description: 'A trusted fixture conversion with two distinct output ports.',
      workSeconds: 60,
      inputs: [{ definitionId: 'wood', quantity: 2, role: 'material' }],
      retainedTools: [{ role: 'instrument', quantity: 1, allowedDefinitionIds: ['cord'] }],
      outputs: [
        { port: 'first', definitionId: 'prepared_fiber', quantity: 1 },
        { port: 'second', definitionId: 'cord', quantity: 2 },
      ],
    },
    { source: 'authored-world', profile: { ...world.profile } },
  ).recipe;
  learnRecipe(world, actorId, recipe.id, 'authored', `${id}:learned`);
  world.socialOfferPolicy!.cooperation!.helpMethods = [
    ...(world.socialOfferPolicy!.cooperation!.helpMethods ?? []),
    recipeMechanicalPin(recipe),
  ];
  return recipe;
}
