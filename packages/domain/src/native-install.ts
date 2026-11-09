import { INVOCATION_LIMITS } from './action-capabilities.js';
import { MOVEMENT, SPATIAL_LIMITS } from '@open-legend/spatial';
import { ACTIVITY_DISPLAY_BYTES, ACTIVITY_LIMITS } from './action-experience.js';
import { MAX_CHANGE_SCOPES } from './dependencies.js';
import { NATIVE_RESPONSE_LIMITS } from './native-response.js';
import { immutableDataSnapshot } from './records.js';
import { TIME_EPSILON } from './simulation-time.js';
import { WORK_LIMITS } from './work-budget.js';
import { validateBodyPolicy } from './body-policy.js';
import { nativeResponseProfileKey, validateNativeResponseProfile } from './native-response.js';
import { validateStatusEffectDefinitions } from './status-effect-validation.js';
import {
  definitionPin,
  validateModuleManifest,
  validateWorldPresentation,
} from './world-modules.js';
import type { WorldState } from './types.js';
import { PERSONAL_EVIDENCE_PREPARATION } from './experience-source.js';
import { MIND_LIMITS } from './mind.js';
import { AGENCY_LIMITS } from './agency.js';
import { AUTOMATIC_ENCOUNTER_BATCH_ENTRIES } from './event-batch-limits.js';
import { RESPONSE_LIMITS, RESPONSE_RECEIPT_LIMIT } from './response-settings.js';

export { selectedNativeLawDefinitions } from './world-composition.js';
export { navigationResultProblem } from './navigation-result.js';

/** Immutable definitions retain their existing validation owner. Installation
 * supplies these finite records once; runtime reads and mutations never call
 * back through TypeScript or reconstruct a WorldState to run this validation.
 */
export function validateNativeDefinitions(
  selected: Pick<
    WorldState,
    | 'moduleManifest'
    | 'statusEffectPolicy'
    | 'nativeResponseProfiles'
    | 'itemDefinitions'
    | 'presentation'
  >,
): void {
  const manifest = selected.moduleManifest;
  validateModuleManifest(manifest);
  validateStatusEffectDefinitions(selected, selected.statusEffectPolicy);
  validateWorldPresentation(selected);
  validateBodyPolicy(
    manifest.bodyPolicy,
    manifest.definitions,
    new Set(selected.statusEffectPolicy.definitions.map(({ id }) => id)),
    selected.itemDefinitions,
  );
  for (const [key, profile] of Object.entries(selected.nativeResponseProfiles ?? {})) {
    validateNativeResponseProfile(profile);
    if (key !== nativeResponseProfileKey(definitionPin(profile)))
      throw new Error('Invalid installed native response definition identity.');
  }
}

/** Native execution installs the same operational limits as the source runtime.
 * Keep their semantic owners above; this is a detached installation descriptor,
 * not another set of gameplay defaults.
 */
export const nativeSetupSettings = immutableDataSnapshot({
  work: WORK_LIMITS,
  maximumChangeScopes: MAX_CHANGE_SCOPES,
  spatial: SPATIAL_LIMITS,
  movement: MOVEMENT,
  timeEpsilon: TIME_EPSILON,
  activity: ACTIVITY_LIMITS,
  activityDisplayBytes: ACTIVITY_DISPLAY_BYTES,
  nativeResponse: NATIVE_RESPONSE_LIMITS,
  personalEvidencePreparation: PERSONAL_EVIDENCE_PREPARATION,
  mind: MIND_LIMITS,
  agency: AGENCY_LIMITS,
  encounterBatchEntries: AUTOMATIC_ENCOUNTER_BATCH_ENTRIES,
  actorResponse: {
    ...RESPONSE_LIMITS,
    receipts: RESPONSE_RECEIPT_LIMIT,
    invocation: INVOCATION_LIMITS,
  },
});
