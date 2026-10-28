export * from './observed-animation.js';
export * from './entity-collection.js';
export * from './ordered-record.js';
export * from './world-creation.js';
export * from './world-composition.js';
export { itemIllustration, type ItemArt } from './presentation-art.js';
export type {
  EventCategory,
  EventPresentation,
  EventPresentationPolicy,
} from './event-presentation.js';
export * from './social-policy.js';
export * from './ranged-policy.js';
export * from './native-command-contracts.js';
export * from './types.js';
export { headingFrame } from './follow.js';
export * from './perception-evidence.js';
export * from './received-values.js';
export * from './perception-support.js';
export * from './worlds/base/initial-opening.js';
export * from './worlds/base/opening-readiness.js';
export * from './worlds/base/starting-worlds.js';
export { BASE_SOCIAL_POLICY } from './worlds/base/social.js';
export { baseWorldInitialConstructionSeeds } from './worlds/base/world.js';
export * from './recipe-records.js';
export * from './food-preparation.js';
export * from './finite-casts.js';
export { BASE_DEATH_COMMAND_DESCRIPTIONS } from './worlds/base/death.js';
export * from './reincarnation.js';
export * from './combat-consent.js';
export { attackSubject } from './combat-execution.js';
export * from './combat-encounters.js';
export * from './combat-means.js';
export * from './native-response.js';
export * from './native-response-navigation.js';
export { reconcileNativeControl } from './native-response-controller.js';
export * from './ranged.js';
export * from './worlds/base/ranged-counterplay.js';
export { BASE_SKILLED_TEXT } from './worlds/base/skilled-execution.js';
export { describeBodyRemains } from './worlds/base/bodies.js';
export {
  activeStimuli,
  stimulusSalience,
  type ActiveStimulus,
  type StimulusPolicy,
} from './stimuli.js';
export { STIMULUS_POLICY } from './worlds/base/senses.js';
export {
  DOMAIN_COUNTERS,
  domainCountersEnabled,
  observeDomainCounters,
  type DomainCounter,
  type DomainCounters,
} from './diagnostic-counters.js';
export * from './action-experience.js';
export * from './activity-learning.js';
export * from './activity-execution.js';
export {
  BASE_FOOD_ACTION_WORDING,
  equippedTargetAction,
  preferredTargetEquipment,
  nativeCatalogueView,
  nativeActivityViews,
  nativeHuntCatalogueLabel,
} from './worlds/base/action-views.js';
export {
  BASE_ACTION_DESCRIPTIONS,
  nativeActionIcon,
  nativeGatherShortcut,
  prepareNativeInventoryActions,
} from './worlds/base/presentation.js';
export * from './item-handling.js';
export { BASE_ITEM_HANDLING } from './worlds/base/item-handling.js';
export {
  canSee,
  canHear,
  PERCEPTION_RULES,
  sensesFor,
  seesEntity,
  entityVisionQuery,
  pointVisionQuery,
  hearsEntity,
  speechPerception,
  visionRadius,
  visionFieldOfView,
  contactViews,
  bodiesTouch,
  DEFAULT_SENSES,
  COARSE_TOUCH,
} from './perception.js';
export {
  createWorld,
  createActor,
  initializeActorTraits,
  NATIVE_ITEMS,
  PLAYER_ID,
  NPC_ID,
  TRAIT_BANK,
} from './data.js';
export {
  MARA_ID,
  MARA_STARTING_BELIEFS,
  MISSING_BELONGING_LOCATIONS,
  TAVIN_ID,
  TAVIN_STARTING_BELIEFS,
} from './worlds/base/missing-belonging.js';
export {
  GOD_SPAWN_OPTIONS,
  editPerson,
  editWorldEvents,
  reviveActor,
  enableActorCognition,
  spawnWorldEntity,
} from './god-tools.js';
export {
  canRecoverAtCamp,
  executeCommand,
  lethalAttackOffer,
  nativeOperationAvailable,
  prepareNativeChoice,
  type PreparedNativeChoice,
  advanceWorld,
  projectWorldHistory,
  navigationBlocked,
  navigationPending,
  observeActor,
  initializePerception,
  queryMemories,
  remember,
  inventoryFor,
  quantityOf,
  SIMULATION_RULES,
} from './kernel.js';
export { admitDeclaration, validateDeclaration, installFixedTransform } from './declarations.js';
export {
  distance,
  distance3D,
  findPath,
  hasLineOfSight,
  hasLineOfEffect,
  canReachEntity,
  findApproachPath,
  findPhysicalWorkApproach,
  physicalWorkPointAvailable,
  isWalkable,
  nearbyEntities,
  sameSurfacePoint,
  spatialCandidateMembershipKey,
} from './spatial.js';

export * from './mind.js';

export * from './experience.js';
export * from './experience-manifest.js';
export * from './known-place-evidence.js';
export * from './experience-sources.js';
export * from './status-effects.js';
export * from './status-condition-references.js';
export * from './status-effect-removal.js';
export { DEFAULT_STATUS_EFFECT_POLICY } from './worlds/base/status-effects.js';
export * from './cognition-policy.js';
export * from './commitments.js';
export * from './response.js';

export {
  updateWorld,
  appendedEventCount,
  appendedRecordCount,
  freezeWorld,
  entityChangesBetween,
  recordMapChangesBetween,
} from './draft.js';

export * from './living.js';

export * from './worlds/base/family.js';

export * from './identity.js';
export * from './story-selection.js';

export * from './world-modules.js';
export * from './state-owners.js';
export * from './resource-claims.js';
export * from './state-contributions.js';
export * from './worlds/base/needs.js';
export * from './world-presets.js';
export { admitAttributeDeclaration, type AttributeDeclarationRequest } from './declarations.js';
export { editActorAttributes, type AttributeEditRequest } from './god-tools.js';

export * from './agency.js';
export * from './typed-requests.js';
export * from './action-capabilities.js';

export * from './invention-policy.js';

export * from './invention-attribution.js';

export * from './invention-families.js';
export * from './manufacture.js';
export * from './manufacture-limits.js';
export { BASE_RECIPE_FAMILIES } from './worlds/base/recipe-families.js';
export { gatheringYield, carriedGatheringChoices } from './gathering.js';
export { gatheringDescription } from './worlds/base/actions.js';
export { recordInventionFeedback } from './invention-feedback.js';

export * from './spatial-state.js';
export * from './spatial-mutations.js';

export {
  strikeDefinition,
  availableStrikes,
  describeAttack,
  validMelee,
  type StrikeDefinition,
  type MeleeProfile,
} from './strikes.js';

export { canonicalJson, isConversationEvent } from './events.js';

export * from './knowledge.js';
export * from './worlds/base/knowledge.js';
export { BASE_HUNTING, huntingDescription, observedBodyHealth } from './worlds/base/hunting.js';
export * from './handover.js';
export { BASE_HANDOVER } from './worlds/base/handover.js';
export {
  BASE_FIRE_CARE,
  FIRE_OPERATIONS,
  fireCareProblem,
  fireFuelDescription,
  isFireCareCommand,
  isFuel,
  type FireOperation,
} from './worlds/base/fire.js';
export {
  personalText,
  person,
  presentVerb,
  subjectNarration,
  renderNarration,
  renderNarrationParts,
  type NarrationPerspective,
  narrationTemplate,
  validateNarration,
  type Narration,
  type NarrationPart,
} from './narration.js';

export * from './participation.js';
export { isSafeRecordId, isImmutableData, jsonText } from './records.js';
export { BASE_PARTICIPATION_POLICY } from './worlds/base/participation.js';

export {
  itemFor,
  inventoryTotals,
  allItems,
  directChildIds,
  objectAncestors,
  mergeCompatible,
  declareObjectOwner,
  custodian,
  effectivePosition,
  createItemLot,
  moveLot,
  itemMoveReason,
  itemPackingLoad,
  splitLot,
  equipLot,
  retireItem,
  retiredObjectIds,
  markPartialObjectHistory,
  completeObjectHistory,
  setItemQuantity,
  validateObjects,
} from './objects.js';
export * from './equipment.js';
export * from './contact-defense.js';
export {
  guardDescription,
  guardWorkLabel,
  guardChoiceLabel,
  BASE_GUARD_TEXT,
  equipmentChangeDescription,
} from './worlds/base/shield-defense.js';

export * from './dependencies.js';
export { worldRootEntities } from './entity-index.js';
export * from './work-budget.js';
export * from './queries.js';
export { initializeNativeWork, installedWorkAllocation } from './native-work.js';

export * from './appraisals.js';
export { markPartialAppraisals, completeAppraisalHistory } from './appraisal-residency.js';
export { BASE_APPRAISAL_POLICY, appraiseEvent } from './worlds/base/appraisals.js';

export { MAX_CONTAINMENT_DEPTH, ITEM_COUNT_PIN } from './objects.js';
export type { ObjectLineage, ObjectRetirement } from './objects.js';
export * from './contribution-residency.js';

export * from './object-access.js';

export { advanceWorldSlices, ammoFor } from './kernel.js';
export {
  completeNavigation,
  completeNavigationBatch,
  type NavigationCompletion,
} from './kernel.js';

export * from './action-targets.js';
export * from './acoustics.js';
export {
  speechExposure,
  soundOrigin,
  hearingReferenceRadius,
  perceptionGuide,
} from './perception.js';
export * from './speech.js';
export * from './sound.js';
export * from './conditions.js';
export * from './inventory-inspection.js';
export * from './places.js';
export * from './activity-hosts.js';
export * from './stock-transfer.js';
export * from './item-characteristics.js';
export { availableItemQuantity } from './resource-claims.js';

export * from './body-policy.js';
export { baseCognitionPolicy } from './worlds/base/cognition.js';

export { basePlaytestMilestones } from './worlds/base/playtest.js';

export * from './outings.js';
export { BASE_OUTING, BASE_COMBAT_HELP } from './worlds/base/outing-policy.js';
export * from './practical-competence.js';
export * from './coaching.js';
export {
  SLING_HANDLING,
  SLING_TARGET,
  BASE_PRACTICE_COMMAND_DESCRIPTIONS,
} from './worlds/base/practical-competence.js';
export * from './assembly-types.js';
export * from './boundary-types.js';
export {
  compileBoundaryActivity,
  boundaryPlanShapes,
  boundaryEditCandidates,
  boundaryMaterialIntact,
  pendingBoundaryExitPreparation,
  boundaryRemovalOperations,
  boundaryReleasedMaterials,
  boundaryRepairState,
  boundaryIntegrityState,
  boundaryMaterialWorkQuery,
  prepareBoundaryPlan,
} from './boundary-assemblies.js';
export { boundaryPostSlot } from './boundary-phase.js';
export type {
  BoundaryExitBatch,
  BoundaryExitPreparations,
  PreparedBoundaryExits,
} from './boundary-exits.js';
export * from './assembly-cover.js';
export * from './construction-permissions.js';
export * from './camp-asset-permissions.js';
export * from './boundary-impacts.js';
export * from './gate-operations.js';
export * from './hearths.js';
export * from './work-batches.js';
export * from './assemblies.js';
export * from './assembly-geometry.js';
export * from './assembly-presentation.js';
export { BASE_CANOPY_SCENE } from './worlds/base/canopies.js';

export * from './material-exposure.js';

export * from './assembly-validation.js';

export * from './assembly-use.js';
export * from './construction-scene.js';
export { BASE_CONSTRUCTION_DESCRIPTIONS } from './worlds/base/canopies.js';

export * from './evasion.js';

export * from './worlds/base/combat-views.js';

export * from './worlds/base/watchpost.js';
export * from './native-values.js';

export type { ResponsePurposeBinding } from './action-capabilities.js';
export type { NativeChoicePreparation } from './kernel.js';
export type {
  PreparedResponseProfile,
  PreparedResponseSituation,
  PreparedResponseMethod,
  PreparedResponsePurpose,
  PreparedResponseOption,
} from './prepared-responses.js';

export * from './worlds/base/recognition.js';

export { normalSpeedSeconds } from './simulation-time.js';
export * from './temporal-evidence.js';
export * from './remembered-impressions.js';
export * from './attention.js';
export * from './semantic-opportunities.js';
export * from './received-scene.js';
export * from './received-geometry.js';

export * from './received-history-scene.js';
export { tracksMaterialOrigins } from './material-inventory.js';

export * from './meals.js';

export * from './craft-catalogue.js';

export * from './rain.js';
export * from './contents-exposure.js';
export * from './construction-contributions.js';

export * from './social-offer-policy.js';
export * from './social-offers.js';

export * from './cooperation.js';

export * from './social-compacts.js';

export * from './native-foraging.js';

export * from './native-feeding.js';

export * from './personal-social.js';

export { personallyKnownPlaceReports } from './outings.js';

export { activityHostRequests } from './activity-hosts.js';

export { isNativeInputField, isMaterialInputRole } from './native-inputs.js';
export { BOUNDARY_REPAIR_INPUT_LIMIT } from './boundary-repair-inputs.js';
export * from './execution-input.js';
export { canSteer } from './player-steering.js';

export { itemContainerCapacity } from './objects.js';

export * from './cartography.js';
