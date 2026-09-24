import { NATIVE_STRIKES } from './worlds/base/strikes.js';
export { NATIVE_STRIKES } from './worlds/base/strikes.js';
/** Trusted targeted-strike definitions; data selects only this finite native family.
 * docs/targeted-actions.md#targeted-strikes
 */
export interface StrikeDefinition {
  readonly id: string;
  readonly version: number;
  readonly label: string;
  readonly pastTense: string;
  readonly range: number;
  readonly autoMoveToRange: boolean;
  readonly workSeconds: number;
  readonly damage: number;
  readonly animation: 'punch';
}
export function strikeDefinition(id: string | undefined): StrikeDefinition | undefined {
  return id && Object.hasOwn(NATIVE_STRIKES, id) ? NATIVE_STRIKES[id] : undefined;
}
