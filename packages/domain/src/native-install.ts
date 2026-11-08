import { MOVEMENT, SPATIAL_LIMITS } from '@open-legend/spatial';
import { ACTIVITY_DISPLAY_BYTES, ACTIVITY_LIMITS } from './action-experience.js';
import { MAX_CHANGE_SCOPES } from './dependencies.js';
import { NATIVE_RESPONSE_LIMITS } from './native-response.js';
import { immutableDataSnapshot } from './records.js';
import { TIME_EPSILON } from './simulation-time.js';
import { WORK_LIMITS } from './work-budget.js';

export { selectedNativeLawDefinitions } from './world-composition.js';

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
});
