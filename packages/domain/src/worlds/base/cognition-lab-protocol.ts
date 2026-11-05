/** Authored bindings for the bundled world's portable cognition study protocols.
 * Tooling consumes this selected map; other worlds supply their own bindings. */
export const BASE_COGNITION_LAB_ACTION_TYPES = Object.freeze({
  contact: 'express',
  attack: 'strike',
  pickup: 'pickup',
  drop: 'drop',
  move: 'move',
  moveOutcome: 'moved',
  inspect: 'inspect-inventory',
  acceptOffer: 'handover',
  healthMeter: 'wilderness:health',
  attackOutcome: 'struck',
  independentWork: 'gather',
  independentWorkOutcome: 'gathered',
});
