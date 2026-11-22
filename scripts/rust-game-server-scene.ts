import { createHash } from 'node:crypto';
import {
  BASE_GUARD_TEXT,
  BASE_SKILLED_TEXT,
  canonicalJson,
  nativeCommandSupported,
  selectedNaturalStrikeBodyPlans,
  selectedPlayerViewRules,
  selectedPlayerWorkLabels,
  selectedTradeViewTitle,
  selectedTypedRequestVocabulary,
  type WorldState,
} from '../packages/domain/src/index.js';
import {
  ACTIVITY_DISPLAY_BYTES,
  ACTIVITY_LIMITS,
} from '../packages/domain/src/action-experience.js';
import { SIGHT_BODY_FRACTIONS } from '../packages/domain/src/perception.js';
import { talkUnavailableReason } from '../apps/server/src/observed-body-view.js';
import { practiceEvidenceHeader } from '../apps/server/src/player-self-view.js';
import { authoredRecipeView } from '../apps/server/src/recipe-view.js';

const pin = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');

/** Build-time view names and static presentation from the same installed
 * definition owner used by the existing server. No player data enters it. */
export function rustGameServerScenePolicy(world: WorldState) {
  const rules = selectedPlayerViewRules(world);
  const body = world.moduleManifest.bodyPolicy;
  const reincarnation = body?.reincarnation;
  const vocabulary = selectedTypedRequestVocabulary(world);
  const melee = Object.values(world.nativeStrikes ?? {}).filter((strike) => !strike.weaponItemId);
  const { nodes, depth, facts, detailEntries, text } = ACTIVITY_LIMITS;
  return {
    selfView: {
      defaultAppearance: rules.defaultAppearance,
      portraits: world.presentation?.portraits,
      departureNotice: world.participationPolicy?.exitDescription,
      // Current Rust carried-inventory installation requires an empty stock.
      // The live actor grant is selected independently from these definitions.
      authoredRecipes: Object.fromEntries(
        Object.values(world.recipes)
          .filter((recipe) => recipe.provenance.source === 'authored-world')
          .map((recipe) => [recipe.id, authoredRecipeView(world, recipe, () => 0)]),
      ),
      acoustics: world.moduleManifest.acoustics,
      sightBodyFractions: SIGHT_BODY_FRACTIONS,
      evasionLabel: body?.evasion?.label,
      reincarnation: reincarnation
        ? {
            message: reincarnation.deathText,
            retainedLabel: reincarnation.retainedLabel,
            lostLabel: reincarnation.lostLabel,
            scars: reincarnation.scars.map(({ id, name, description }) => ({
              id,
              name,
              description,
            })),
          }
        : undefined,
      actionWording: { examples: vocabulary.examples, placeholder: vocabulary.placeholder },
      action: {
        preparingRoute: rules.preparingRoute,
        working: rules.working,
        statusTypes: rules.actionStatusTypes,
        workingStatusTypes: rules.workingStatusTypes,
        noProgressTypes: rules.noProgressTypes,
        labels: selectedPlayerWorkLabels(world, {
          waitingForFeedback: false,
          rangedReady: false,
          evasionLabel: body?.evasion?.label,
        }),
        statusLabels: Object.fromEntries(
          world.statusEffectPolicy.definitions.map(({ id, label }) => [id, label]),
        ),
        replenishmentLabels: Object.fromEntries(
          world.moduleManifest.definitions.flatMap(({ id, reservoir }) =>
            reservoir ? [[id, reservoir.actionLabel]] : [],
          ),
        ),
        statusType: 'status-effect',
        replenishmentType: 'replenish',
        targetLabels: Object.entries(rules.targetActionLabels).map(
          ([action, { label, lowercase }]) => ({
            action,
            prefix: `${label} `,
            suffix: '',
            lowercase,
          }),
        ),
      },
      practice: {
        definitions: world.moduleManifest.definitions.flatMap(({ id, name, practice }) =>
          practice ? [{ id, name, profile: practice }] : [],
        ),
        evidenceHeader: practiceEvidenceHeader,
        displayLimits: {
          nodes,
          depth,
          facts,
          detailEntries,
          text,
          displayBytes: ACTIVITY_DISPLAY_BYTES,
        },
      },
      melee: {
        definitions: melee.map(({ id, label, requiredBodyPlan }) => ({
          id,
          label,
          requiredBodyPlan,
        })),
        unrestrictedBodyPlans: selectedNaturalStrikeBodyPlans(world),
        supported: nativeCommandSupported(world, 'strike'),
        unavailable: BASE_SKILLED_TEXT.sourceUnavailable,
        recovering: BASE_GUARD_TEXT.recovery,
      },
      trade: {
        definitions: pin([
          world.itemDefinitions,
          world.presentation?.itemArt,
          world.itemHandling,
          world.constructionProfile,
        ]),
        bodyDefinitions: pin({
          bodyPolicy: world.moduleManifest.bodyPolicyPin,
          attributes: world.moduleManifest.pins,
          status: world.statusEffectPolicy.revision,
          cognition: world.cognitionPolicy,
        }),
      },
    },
    observed: {
      bodyKinds: rules.observedBodyKinds,
      fallbackBodyKind: rules.observedBodyFallback,
      portraits: world.presentation?.portraits,
      itemArt: world.presentation?.itemArt,
      talkUnavailable: talkUnavailableReason,
      tradeTitle: selectedTradeViewTitle(world),
    },
  };
}
