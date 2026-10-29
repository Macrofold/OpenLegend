import { BASE_WORK_ACTIVITY_HOST } from './worlds/base/work-activity.js';
import { BASE_MEAL_ACTIVITY_HOST } from './worlds/base/meal-activity.js';
import { RESERVOIR_ACTIVITY_HOST } from './worlds/reservoir-demo/activity.js';
import { BASE_EVENT_DISCLOSURE } from './worlds/base/event-disclosure.js';
import { BASE_EVENT_PRESENTATION } from './worlds/base/event-presentation.js';
import { baseAnimalActivity } from './worlds/base/animal-response-profile.js';
import { baseAssemblyPresentation } from './worlds/base/presentation.js';
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
import type { Entity, WorldState } from './types.js';
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
  baseAttentionCapacity,
  baseRecordingReason,
} from './worlds/base/attention.js';
import type { RecordingInput } from './attention.js';
import type { ObserverSubject } from './knowledge.js';
import {
  subjectFamiliarity,
  subjectFamiliarityContactDue,
  creditSubjectFamiliarity,
} from './worlds/base/recognition.js';

export function selectedAttentionPolicy(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_ATTENTION_POLICY;
}
export function selectedTemporalPolicy(world: WorldState) {
  return selectedAttentionPolicy(world).retention;
}
export function selectedRecordingReason(world: WorldState, input: RecordingInput) {
  selectedCreationProfileForWorld(world);
  return baseRecordingReason(world, input);
}
export function selectedAttentionCapacity(
  world: WorldState,
  observer: import('./types.js').Entity,
) {
  selectedCreationProfileForWorld(world);
  return baseAttentionCapacity(world, observer);
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

export function selectedDetectionSupportPolicy(world: WorldState) {
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
export function selectedBodyIndividual(world: WorldState, observerId: string, subjectId: string) {
  selectedCreationProfileForWorld(world);
  return ensureBodyIndividual(world, observerId, subjectId);
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

export function selectedEventDisclosure(world: WorldState) {
  selectedCreationProfileForWorld(world);
  return BASE_EVENT_DISCLOSURE;
}

export function selectedEventPresentation(world: WorldState) {
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
