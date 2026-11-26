import { namePhrase, type Named } from '@open-legend/language';
import type { StrikeDefinition } from '../../strikes.js';
import display from './config/ordinary-activity-display.json' with { type: 'json' };

export const BASE_STRIKE_BODY_RULES = {
  unrestrictedBodyPlans: ['biped'],
} as const;

export function weaponStrikeWording(weapon: Named | string, target?: Named | string) {
  const words = display.strike;
  return {
    label: target
      ? words.weaponTarget.replace(/\{(target|weapon)\}/g, (_, role) =>
          namePhrase(role === 'target' ? target : weapon),
        )
      : words.weaponName.replace('{weapon}', () => namePhrase(weapon)),
    pastTense: words.weaponPast.replace('{weapon}', () => namePhrase(weapon, 'definite')),
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
