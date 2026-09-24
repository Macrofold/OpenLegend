import type { StrikeDefinition } from '../../strikes.js';

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
