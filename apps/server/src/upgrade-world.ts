import {
  BASE_ITEM_HANDLING,
  DEFAULT_STATUS_EFFECT_POLICY,
  DEFAULT_COGNITION_POLICY,
 */
export function upgradeWorldState(world: WorldState): void {
  // Earlier pending requests had no explicit target/mode scope. Preserve the request;
  // a stored alternative retains its mode, otherwise queueing grants no replace authority.
