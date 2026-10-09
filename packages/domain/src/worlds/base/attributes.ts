import { SLING_HANDLING } from './practical-competence.js';
import type { AttributeDefinition } from '../../world-modules.js';

export const DEFAULT_ATTRIBUTES: AttributeDefinition[] = [
  SLING_HANDLING,
  {
    id: 'wilderness:health',
    version: 2,
    implementation: 'native-health-v1',
    name: 'Health',
    disclosure: 'public',
    presentation: { icon: 'meter.health', color: 'meter.health' },
    critical: { compare: { operator: 'lessThanOrEqual', value: 20, rounding: 'nearest-integer' } },
    editorCritical: { compare: { operator: 'lessThan', value: 40, rounding: 'none' } },
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    concern: {
      below: 40,
      text: '{subject.subject} {subject.verb:be} seriously injured.',
      mode: 'instant',
      notify: false,
      reconsider: false,
    },
    meaning:
      'Health measures bodily integrity. Severe injury can prevent action. At zero, ordinary living activity ends: NPCs die, with no assured return to life. Human-controlled people can recover from collapse.',
  },
  {
    id: 'wilderness:fullness',
    version: 1,
    implementation: 'number-v1',
    name: 'Food',
    disclosure: 'owner',
    presentation: { icon: 'meter.food', color: 'meter.food' },
    critical: { compare: { operator: 'lessThanOrEqual', value: 20, rounding: 'nearest-integer' } },
    editorCritical: { compare: { operator: 'lessThan', value: 30, rounding: 'none' } },
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    meaning:
      'Fullness measures nourishment; lower means hungrier. Edible food restores fullness. At zero, lack of nourishment continuously damages health and can kill this body.',
    condition: {
      bands: [
        { below: 40, text: '{subject.subject} {subject.verb:be} hungry.' },
        { below: 30, text: '{subject.subject} {subject.verb:be} very hungry.' },
        { below: 20, text: '{subject.subject} {subject.verb:be} famished.' },
        { below: 10, text: '{subject.subject} {subject.verb:be} starving.' },
        {
          below: 0,
          inclusive: true,
          text: '{subject.subject} {subject.verb:have} no nourishment left. Starvation is damaging {subject.possessive} health.',
        },
      ],
      clearText: '{subject.subject} {subject.verb:be} not currently hungry.',
      recoveryMargin: 2,
      criticalSeverity: 3,
      reviewSeconds: 3600,
    },
  },
  {
    id: 'wilderness:energy',
    version: 1,
    implementation: 'number-v1',
    name: 'Energy',
    disclosure: 'owner',
    presentation: { icon: 'meter.energy', color: 'meter.energy' },
    critical: { compare: { operator: 'lessThanOrEqual', value: 20, rounding: 'nearest-integer' } },
    editorCritical: { compare: { operator: 'lessThan', value: 25, rounding: 'none' } },
    schema: { kind: 'number', min: 0, max: 100, initial: 85, unit: '%' },
    concern: {
      below: 25,
      text: '{subject.subject} {subject.verb:be} exhausted.',
      mode: 'instant',
      notify: false,
      reconsider: false,
    },
  },
];
