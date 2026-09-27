import type { AttributeDefinition } from '../../world-modules.js';

export const DEFAULT_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: 'wilderness:health',
    version: 1,
    implementation: 'native-health-v1',
    name: 'Health',
    disclosure: 'owner',
    presentation: 'health',
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    concern: { below: 40, text: 'I am seriously injured.' },
    meaning:
      'Health measures bodily integrity. Severe injury can prevent action. At zero, ordinary living activity ends: NPCs die, with no assured return to life. Human-controlled people can recover from collapse.',
  },
  {
    id: 'wilderness:fullness',
    version: 1,
    implementation: 'native-fullness-v1',
    name: 'Food',
    disclosure: 'owner',
    presentation: 'food',
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    meaning:
      'Fullness measures nourishment; lower means hungrier. Edible food restores fullness. At zero, lack of nourishment continuously damages health and can kill this body.',
    condition: {
      bands: [
        { below: 40, text: 'I am hungry.' },
        { below: 30, text: 'I am very hungry.' },
        { below: 20, text: 'I am famished.' },
        { below: 10, text: 'I am starving.' },
        {
          below: 0,
          inclusive: true,
          text: 'I have no nourishment left. Starvation is damaging my health.',
        },
      ],
      clearText: 'I am not currently hungry.',
      recoveryMargin: 2,
      criticalSeverity: 3,
      reviewSeconds: 3600,
    },
  },
  {
    id: 'wilderness:energy',
    version: 1,
    implementation: 'native-energy-v1',
    name: 'Energy',
    disclosure: 'owner',
    presentation: 'energy',
    schema: { kind: 'number', min: 0, max: 100, initial: 85, unit: '%' },
    concern: { below: 25, text: 'I am exhausted.' },
  },
];
