import {
  ordinaryActivityView,
  type OrdinaryActivityViewInput,
} from './worlds/base/ordinary-activity-view.js';
import { BASE_HANDOVER } from './worlds/base/handover.js';
import { BASE_SIMULATION_TIME_RULES } from './worlds/base/time.js';
import { baseOutwardActivity, changedOutwardNotice } from './worlds/base/senses.js';
import {
  recognizePromise,
  allowsCommitmentCompletion,
  BASE_PROMISE_RULES,
  nativePromiseDefinitions,
} from './worlds/base/promises.js';
import { BASE_WORK_ACTIVITY_HOST } from './worlds/base/work-activity.js';
import { BASE_MEAL_ACTIVITY_HOST } from './worlds/base/meal-activity.js';
import { RESERVOIR_ACTIVITY_HOST } from './worlds/reservoir-demo/activity.js';
import {
  BASE_EVENT_DISCLOSURE,
  BASE_EVENT_DISCLOSURE_DATA,
} from './worlds/base/event-disclosure.js';
import { BASE_EVENT_PRESENTATION } from './worlds/base/event-presentation.js';
import { BASE_ACTION_DEFAULTS, BASE_SPEECH_ACTION } from './worlds/base/actions.js';
import { BASE_ORDINARY_ACTION_RULES } from './worlds/base/ordinary-action-rules.js';
import { BASE_STRIKE_BODY_RULES } from './worlds/base/strikes.js';
import { BASE_OBSERVATION_RULES } from './worlds/base/observation-rules.js';
import { BASE_EVENT_APPRAISAL_RULES } from './worlds/base/appraisals.js';
import { baseAnimalActivity } from './worlds/base/animal-response-profile.js';
import {
  baseAssemblyPresentation,
  baseObservedBodyKind,
  basePlayerWorkLabels,
  basePlayerControlCanUseInactive,
  BASE_PLAYER_VIEW_RULES,
  type BasePlayerWorkContext,
} from './worlds/base/presentation.js';
import type { AssemblyFamily } from './assembly-types.js';
import { baseContextActions } from './worlds/base/context-actions.js';
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
import type { Entity, WorldEvent, WorldState } from './types.js';
import { isSafeRecordId } from './records.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { BASE_THREAT_RESPONSE_PROFILE } from './worlds/base/threat-response-profile.js';
import {
  basePreparedThreatResponses,
  basePreparedThreatOpportunity,
  basePreparedThreatResult,
  baseThreatObservation,
} from './worlds/base/threat-responses.js';
import type { Awareness } from './experience.js';
import type {
  PreparedResponseSituation,
  PreparedResponseObservation,
} from './prepared-responses.js';
import {
  ordinaryWarningPlace,
  ordinaryWarningDurationSeconds,
  BASE_VOICE_FEATURE_FAMILY,
  BASE_PERCEPTION_POLICY,
  receivedVoiceFeatures,
  perceiveVoice,
  recognitionSupportSourceIds,
  validRecognitionSupportKey,
  retainRecognitionEvidence,
  recognitionMaintenanceDue,
  expireRecognitionSeeds,
  individualFamiliarityContactAt,
} from './worlds/base/recognition.js';
import { hasMemory } from './living.js';
import { currentBodyObservation, observationFactKey } from './perception-evidence.js';
import {
  BASE_PERSONAL_NAME_RULES,
  ensureBodyIndividual,
  outwardBodyName,
  associateBodyFamiliarity,
  pruneObserverIndividuals,
  retainedIndividualEvidenceKeys,
  captureSubjectLabelReader,
} from './worlds/base/knowledge.js';
import { DETECTION_SUPPORT_POLICY } from './worlds/base/senses.js';
import { normalSpeedSeconds } from './simulation-time.js';
import {
  BASE_ATTENTION_POLICY,
  BASE_ACCOUNT_RULES,
  baseActivityResultEventType,
  baseAttentionCapacity,
  baseAttributeAffectsObservation,
  baseRecordingReason,
  baseAccountRetentionSelection,
  baseAccountAfterRelease,
  baseRoutineMovement,
} from './worlds/base/attention.js';
import type { AccountRecordingInput, RecordingInput } from './attention.js';
import { sightingNarration } from './worlds/base/event-presentation.js';
import { baseEventSalience, BASE_OCCURRENCE_RULES } from './worlds/base/cognition.js';
import type { ObserverSubject } from './knowledge.js';
import {
  subjectFamiliarity,
  subjectFamiliarityContactDue,
  creditSubjectFamiliarity,
} from './worlds/base/recognition.js';

export function selectedAttentionPolicy(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_ATTENTION_POLICY;
}
export function selectedTemporalPolicy(world: Pick<WorldState, 'profile'>) {
  return selectedAttentionPolicy(world).retention;
}
export function selectedAccountRetentionSelection(
  world: WorldState,
  entry: import('./types.js').ExperienceEntry,
) {
  selectedCreationProfileForWorld(world);
  return baseAccountRetentionSelection(entry);
}
export function selectedRecordingReason(world: WorldState, input: RecordingInput) {
  selectedCreationProfileForWorld(world);
  return baseRecordingReason(world, input);
}
export function selectedAccountAfterRelease(world: WorldState, input: AccountRecordingInput) {
  selectedCreationProfileForWorld(world);
  return baseAccountAfterRelease(input);
}
export function selectedAgreementEvent(
  world: Pick<WorldState, 'profile'>,
  eventType: string,
): boolean {
  selectedCreationProfileForWorld(world);
  return BASE_ACCOUNT_RULES.agreementEvents.includes(eventType);
}
export function selectedActivityResultMetadata(
  world: WorldState,
  actorId: string,
  commandType: string,
) {
  selectedCreationProfileForWorld(world);
  const eventType = baseActivityResultEventType(commandType);
  return eventType ? { eventType, speakerId: actorId } : {};
}
export function selectedRoutineMovement(
  world: WorldState,
  actorId: string,
  activity: import('./attention.js').ActivityRecordingContext | undefined,
  phase: 'departure' | 'arrival' | 'result',
): boolean {
  selectedCreationProfileForWorld(world);
  return baseRoutineMovement(world, actorId, activity, phase);
}

export function selectedEventSalience(world: WorldState, type: string, data: WorldEvent['data']) {
  selectedCreationProfileForWorld(world);
  return baseEventSalience(type, data);
}
export function selectedOccurrenceRules(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_OCCURRENCE_RULES;
}
export function selectedSightingNarration(
  world: WorldState,
  observerId: string,
  subjectId: string,
  detail?: string,
  departed = false,
) {
  selectedCreationProfileForWorld(world);
  return sightingNarration(observerId, subjectId, detail, departed);
}
export function selectedAttentionCapacity(
  world: WorldState,
  observer: import('./types.js').Entity,
) {
  selectedCreationProfileForWorld(world);
  return baseAttentionCapacity(world, observer);
}
export function selectedAttributeAffectsObservation(
  world: WorldState,
  observer: Entity,
  attributeId: string,
): boolean {
  selectedCreationProfileForWorld(world);
  return hasMemory(observer) && baseAttributeAffectsObservation(observer, attributeId);
}
export function selectedAttentionFamiliarity(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject | undefined,
): number {
  selectedCreationProfileForWorld(world);
  return subject ? subjectFamiliarity(world, observerId, subject) : 0;
}
export function selectedCreditAttentionContact(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
  input: { sourceKey: string; at: number; order: number; support?: readonly string[] },
): boolean {
  selectedCreationProfileForWorld(world);
  return creditSubjectFamiliarity(world, observerId, subject, {
    ...input,
    key: JSON.stringify(['contact', input.sourceKey, input.at]),
    support: input.support ?? [],
  });
}
export function selectedAttentionContactDue(
  world: WorldState,
  observerId: string,
  subject: ObserverSubject,
  at: number,
): boolean {
  selectedCreationProfileForWorld(world);
  return subjectFamiliarityContactDue(world, observerId, subject, at);
}
export function selectedAttentionContactAt(
  world: WorldState,
  observerId: string,
  individualId: string,
  confirmedThrough: number,
): number | undefined {
  selectedCreationProfileForWorld(world);
  return individualFamiliarityContactAt(world, observerId, individualId, confirmedThrough);
}
export function selectedAssociateBodyFamiliarity(
  world: WorldState,
  observerId: string,
  sourceId: string,
): void {
  selectedCreationProfileForWorld(world);
  associateBodyFamiliarity(world, observerId, sourceId);
}

export function selectedPruneObserverIndividuals(
  world: WorldState,
  actorId: string,
  input: Parameters<typeof pruneObserverIndividuals>[2],
): number {
  selectedCreationProfileForWorld(world);
  return pruneObserverIndividuals(world, actorId, input);
}

export function selectedDetectionSupportPolicy(world: Pick<WorldState, 'profile' | 'timePolicy'>) {
  selectedCreationProfileForWorld(world);
  return {
    ...DETECTION_SUPPORT_POLICY,
    fullRatePerGameSecond:
      1 / normalSpeedSeconds(world, DETECTION_SUPPORT_POLICY.fullStrengthSeconds),
    decayPerGameSecond: 1 / normalSpeedSeconds(world, DETECTION_SUPPORT_POLICY.decaySeconds),
    graceSeconds: normalSpeedSeconds(world, DETECTION_SUPPORT_POLICY.decaySeconds),
  };
}

export function selectedRecognitionSupportSourceIds(
  world: WorldState,
  keys: readonly string[],
): string[] {
  selectedCreationProfileForWorld(world);
  return recognitionSupportSourceIds(keys);
}
/** Capture the installed pure source interpretation without retaining its world. */
export function selectedRecognitionSupportReader(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return recognitionSupportSourceIds;
}
export function selectedSubjectLabelReader(
  world: WorldState,
  observerId: string,
  subjects?: Iterable<import('./knowledge.js').ObserverSubject>,
) {
  selectedCreationProfileForWorld(world);
  return captureSubjectLabelReader(world, observerId, subjects);
}
export function selectedRetainedIndividualEvidenceKeys(
  world: WorldState,
  actorId: string,
): string[] {
  selectedCreationProfileForWorld(world);
  return retainedIndividualEvidenceKeys(world, actorId);
}
/** Closed source-key grammar for the currently linked recognition family. */
export const validReceivedRecognitionSupportKey = validRecognitionSupportKey;
export function selectedRetainRecognitionEvidence(world: WorldState, evidence: Awareness): void {
  selectedCreationProfileForWorld(world);
  retainRecognitionEvidence(world, evidence);
}
export function selectedRecognitionMaintenanceDue(
  world: WorldState,
  actorId: string,
): number | null {
  selectedCreationProfileForWorld(world);
  return recognitionMaintenanceDue(world, actorId);
}
export function selectedExpireRecognitionSeeds(world: WorldState, actorId: string): number {
  selectedCreationProfileForWorld(world);
  return expireRecognitionSeeds(world, actorId);
}

/** Personal naming vocabulary stays with the selected world. */
export function selectedPersonalNameRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_PERSONAL_NAME_RULES;
}
/** Current direct-path voice interpretation is selected world behavior. Future
 * acoustic producers supply their own admitted received feature evidence. */
export function selectedVoiceReception(
  world: WorldState,
  observer: import('./types.js').Entity,
  source: import('./types.js').Entity,
  event: import('./types.js').WorldEvent,
  clarityMarginDb: number,
  visibleSourceId?: string,
) {
  selectedCreationProfileForWorld(world);
  if (!hasMemory(observer) || !observer.actor?.individualRecognition || !source.actor?.voiceProfile)
    return undefined;
  const features = receivedVoiceFeatures(source.actor.voiceProfile);
  const body = visibleSourceId
    ? currentBodyObservation(world, observer.id, visibleSourceId)
    : undefined;
  return {
    family: BASE_VOICE_FEATURE_FAMILY,
    features,
    recognition: perceiveVoice(
      world,
      observer.id,
      event,
      features,
      clarityMarginDb,
      body ? visibleSourceId : undefined,
      body ? body.original : undefined,
    ),
  };
}

/** Outward category wording belongs to the selected world and is sampled with the body. */
export function selectedOutwardBodyName(world: WorldState, entity: import('./types.js').Entity) {
  selectedCreationProfileForWorld(world);
  return outwardBodyName(world, entity);
}
export function selectedBodyIndividual(
  world: WorldState,
  observerId: string,
  subjectId: string,
  received: import('./perception-current.js').CurrentFacetGrant,
) {
  selectedCreationProfileForWorld(world);
  return ensureBodyIndividual(world, observerId, subjectId, received);
}

/** The selected world owns understood warning grammar and its stated duration. */
export function selectedOrdinaryWarning(
  world: WorldState,
  segments: readonly import('./speech.js').SpeechSegment[],
) {
  selectedCreationProfileForWorld(world);
  const label = ordinaryWarningPlace(segments);
  return label === undefined
    ? undefined
    : { label, duration: ordinaryWarningDurationSeconds(world) };
}

/** A selected pin chooses linked trusted native templates. It cannot load code or
 * silently reinterpret a saved profile after the authored definition changes. */
export function preparedResponseProfile(pin: DefinitionPin | null) {
  if (pin === null) return null;
  return isDefinitionPin(pin) && sameDefinitionPin(pin, definitionPin(BASE_THREAT_RESPONSE_PROFILE))
    ? BASE_THREAT_RESPONSE_PROFILE
    : undefined;
}
export function preparedResponseObservation(
  pin: DefinitionPin,
  change: PreparedResponseObservation,
  label: string,
  range?: number,
): string {
  if (!preparedResponseProfile(pin))
    throw new Error('The response observation profile is unavailable.');
  return baseThreatObservation(change, label, range);
}
export function compilePreparedResponses(world: WorldState, input: PreparedResponseSituation) {
  const profile = preparedResponseProfile(world.cognitionPolicy.preparedResponses);
  if (profile === undefined) throw new Error('The selected response profile is unavailable.');
  return profile ? basePreparedThreatResponses(world, profile, input) : null;
}
export function preparedResponseOpportunity(
  world: WorldState,
  actorId: string,
  evidence: readonly Awareness[],
  causeIds: readonly string[],
): boolean {
  const profile = preparedResponseProfile(world.cognitionPolicy.preparedResponses);
  if (profile === undefined) throw new Error('The selected response profile is unavailable.');
  return !!profile && basePreparedThreatOpportunity(world, profile, actorId, evidence, causeIds);
}

export function preparedResponseResult(
  world: WorldState,
  actorId: string,
  causeIds: readonly string[],
): boolean {
  const profile = preparedResponseProfile(world.cognitionPolicy.preparedResponses);
  if (profile === undefined) throw new Error('The selected response profile is unavailable.');
  return !!profile && basePreparedThreatResult(world, profile, actorId, causeIds);
}

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
    BASE_MEAL_ACTIVITY_HOST,
    BASE_WORK_ACTIVITY_HOST,
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
export function selectedCreationProfileForWorld(world: {
  profile: { id: string; version: number };
}): WorldCreationProfile {
  if (world.profile.id !== 'grounded-wilderness' || world.profile.version !== 1)
    throw new Error('This world has no supported initial creation profile.');
  return BASE_CREATION_PROFILE;
}

/** Finite authored definitions for the resident implementation. The selected
 * world remains their one source; native installation carries data and pins,
 * never executable TypeScript policy functions or a reconstructed world.
 */
export function selectedNativeLawDefinitions(
  world: Pick<WorldState, 'profile' | 'timePolicy' | 'itemDefinitions'>,
) {
  selectedCreationProfileForWorld(world);
  return {
    attention: BASE_ATTENTION_POLICY,
    accountRules: BASE_ACCOUNT_RULES,
    nameRules: BASE_PERSONAL_NAME_RULES,
    recognition: { ...BASE_PERCEPTION_POLICY, voiceFeatureFamily: BASE_VOICE_FEATURE_FAMILY },
    occurrenceRules: BASE_OCCURRENCE_RULES,
    socialDefaults: BASE_SOCIAL_POLICY,
    speechAction: BASE_SPEECH_ACTION,
    ordinaryActions: BASE_ORDINARY_ACTION_RULES,
    observationRules: BASE_OBSERVATION_RULES,
    eventAppraisalRules: BASE_EVENT_APPRAISAL_RULES,
    promises: { ...BASE_PROMISE_RULES, definitions: nativePromiseDefinitions(world) },
    eventDisclosure: BASE_EVENT_DISCLOSURE_DATA,
    detectionSupport: selectedDetectionSupportPolicy(world),
    preparedResponses: BASE_THREAT_RESPONSE_PROFILE,
    movement: selectedMovementRules(world),
    timeRules: selectedTimeRules(world),
  };
}
export function selectedTimeRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_SIMULATION_TIME_RULES;
}
export function selectedMovementRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return {
    movementTilesPerSecond: BASE_ACTION_DEFAULTS.movementTilesPerSecond,
    interactionRadius: BASE_ACTION_DEFAULTS.interactionRadius,
    directProbeMaxDistance: BASE_ACTION_DEFAULTS.directProbeMaxDistance,
  };
}
export function selectedSocialDefaults(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_SOCIAL_POLICY;
}
export function selectedSpeechAction(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_SPEECH_ACTION;
}
export function selectedObservationRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_OBSERVATION_RULES;
}
export function selectedObservedBodyKind(world: Pick<WorldState, 'profile'>, kind: string) {
  selectedCreationProfileForWorld(world);
  return baseObservedBodyKind(kind);
}
export function selectedTradeViewTitle(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_HANDOVER.text.title;
}
export function selectedPlayerViewRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_PLAYER_VIEW_RULES;
}
export function selectedPlayerControlCanUseInactive(
  world: Pick<WorldState, 'profile'>,
  command: { type: string; coachingOperation?: string },
) {
  selectedCreationProfileForWorld(world);
  return basePlayerControlCanUseInactive(command);
}
export function selectedNaturalStrikeBodyPlans(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_STRIKE_BODY_RULES.unrestrictedBodyPlans;
}
export function selectedPlayerWorkLabels(
  world: Pick<WorldState, 'profile'>,
  input: BasePlayerWorkContext,
) {
  selectedCreationProfileForWorld(world);
  return basePlayerWorkLabels(input);
}
export function selectedOrdinaryActionRules(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_ORDINARY_ACTION_RULES;
}
export function selectedTypedRequestVocabulary(
  world: import('./activity-hosts.js').ActivityDefinitionScope & Pick<WorldState, 'profile'>,
) {
  selectedCreationProfileForWorld(world);
  return baseTypedRequestVocabulary(world);
}

export function commandDescriptions(): Readonly<Record<string, string>> {
  return BASE_COMMAND_DESCRIPTIONS;
}

/** Pure selected-world presentation of an already permitted native capture. */
export function formatOrdinaryActivityView(
  profile: { id: string; version: number },
  input: OrdinaryActivityViewInput,
) {
  selectedCreationProfileForWorld({ profile });
  return ordinaryActivityView(input);
}
export type { OrdinaryActivityViewInput } from './worlds/base/ordinary-activity-view.js';

export function nativeActivityView(world: WorldState, command: Command) {
  selectedCreationProfileForWorld(world);
  return baseActivityView(world, command);
}
export function sharedNativeActivityName(world: WorldState, command: Command) {
  selectedCreationProfileForWorld(world);
  return baseActivityName(world, command);
}

export function selectedEventDisclosure(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_EVENT_DISCLOSURE;
}

export function selectedEventPresentation(world: Pick<WorldState, 'profile'>) {
  selectedCreationProfileForWorld(world);
  return BASE_EVENT_PRESENTATION;
}

export function selectedAnimalActivity(world: WorldState, entity: Entity) {
  selectedCreationProfileForWorld(world);
  return baseAnimalActivity(entity);
}

export function selectedAssemblyPresentation(world: WorldState, family: AssemblyFamily) {
  selectedCreationProfileForWorld(world);
  return baseAssemblyPresentation(family);
}

/** A requested object's menu and direct shortcut use the same selected world preference. */
export function selectedContextActions(world: WorldState, actorId: string, targetId?: string) {
  selectedCreationProfileForWorld(world);
  return baseContextActions(world, actorId, targetId);
}

/** Selected speech grammar supplies a proposal; the native obligation owner admits it. */
export function selectedSpokenPromise(world: WorldState, event: import('./types.js').WorldEvent) {
  selectedCreationProfileForWorld(world);
  const promise = recognizePromise(world, event);
  return (
    promise && {
      ...promise,
      limit: BASE_PROMISE_RULES.limit,
      importance: BASE_PROMISE_RULES.importance,
      summaryPrefix: BASE_PROMISE_RULES.summaryPrefix,
      speechEvent: BASE_PROMISE_RULES.speechEvent,
    }
  );
}

export function selectedCommitmentCompletionAllowed(world: WorldState, eventType: string): boolean {
  selectedCreationProfileForWorld(world);
  return allowsCommitmentCompletion(eventType);
}

export function selectedOutwardBodyActivity(world: WorldState, entity: Entity) {
  selectedCreationProfileForWorld(world);
  return baseOutwardActivity(entity);
}

export function selectedCommitmentLimit(world: WorldState): number {
  selectedCreationProfileForWorld(world);
  return BASE_PROMISE_RULES.limit;
}

/** Meaningful notices use the same selected reality as acquired activity details. */
export function selectedOutwardBodyNotice(
  world: WorldState,
  before: import('./perception-evidence.js').ObservedBody,
  after: import('./perception-evidence.js').ObservedBody,
) {
  selectedCreationProfileForWorld(world);
  return changedOutwardNotice(before, after);
}
