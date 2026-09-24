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
  },
  {
    id: 'wilderness:fullness',
    version: 1,
    implementation: 'native-fullness-v1',
    name: 'Food',
    disclosure: 'owner',
    presentation: 'food',
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    concern: { below: 30, text: 'I am very hungry.' },
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
