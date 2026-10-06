import { namePhrase, type Named } from '@open-legend/language';
import type { StrikeDefinition } from '../../strikes.js';

export function weaponStrikeWording(weapon: Named | string, target?: Named | string) {
  return {
    label: target
      ? `Attack ${namePhrase(target)} with ${namePhrase(weapon)}`
      : `Strike with ${namePhrase(weapon)}`,
    pastTense: `struck with ${namePhrase(weapon, 'definite')}`,
  };
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
    requiredBodyPlan: 'biped',
  }),
});
