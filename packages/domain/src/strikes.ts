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
export const NATIVE_STRIKES: Readonly<Record<string, StrikeDefinition>> = Object.freeze({
  punch: Object.freeze({
    id: 'punch',
    version: 1,
    label: 'Punch',
    pastTense: 'punched',
    range: 1.3,
    autoMoveToRange: true,
    workSeconds: 30,
    damage: 5,
    animation: 'punch',
  }),
});
export function strikeDefinition(id: string | undefined): StrikeDefinition | undefined {
  return id && Object.hasOwn(NATIVE_STRIKES, id) ? NATIVE_STRIKES[id] : undefined;
}
