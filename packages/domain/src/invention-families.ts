import type { DeclarationDraft } from './types.js';

/** This is a finite mechanical envelope, not a claim to validate arbitrary physics. */
export const DECLARATION_CONTRACT = {
  schemaVersion: 1,
  outputKinds: ['launcher', 'ammunition', 'gathering-tool'],
  gatheringTool: { requiredRoles: ['body', 'binding'], quantity: [2, 4] },
  workSeconds: { minimum: 48, maximum: 480 },
  inputQuantity: { minimum: 1, maximum: 8, maximumTotal: 20 },
  mechanisms: {
    swing: {
      ammunitionKind: 'stone',
      requiredRoles: ['binding', 'pouch'],
      damage: [10, 20],
      range: [3, 7],
      accuracy: [0.6, 0.9],
    },
    flex: {
      ammunitionKind: 'arrow',
      requiredRoles: ['body', 'binding'],
      damage: [16, 28],
      range: [4, 10],
      accuracy: [0.6, 0.9],
    },
    arrow: { requiredRoles: ['shaft', 'point', 'fletching'], damageBonus: [0, 5] },
  },
  roleProperties: {
    binding: 'binding',
    body: 'flexible',
    pouch: 'pouch',
    shaft: 'shaft',
    point: 'point',
    fletching: 'fiber',
  },
  notes:
    'Choose actual registered materials and quantities, a fitting name, mechanism and bounded parameters. Finished recipes are generated during play. Properties cannot invent effects. No scripts, free sources, nutrition, fuel or unregistered operations are supported. Arrow ammunition produces one projectile per completed craft.',
} as const;

// These are finite native consumers, not a plugin interpreter.
// docs/architecture.md#shared-invention-workflow
export const SUPPORTED_INVENTION_FAMILIES = {
  'gathering-tool': {
    description:
      'A rigid body bound with cord improves gathering one registered resource; carried tools do not stack.',
  },
  swing: {
    description: 'A physical sling-like stone launcher using binding and a flexible pouch.',
  },
  flex: {
    description:
      'A physical bow-like launcher with a flexible rigid body and binding, using arrows.',
  },
  arrow: {
    description:
      'A physical arrow with shaft, point and fiber fletching, requiring a compatible bow.',
  },
} as const;
export type InventionFamily = keyof typeof SUPPORTED_INVENTION_FAMILIES;
export function inventionFamily(draft: DeclarationDraft): InventionFamily | undefined {
  if (draft.output.kind === 'gathering-tool') return 'gathering-tool';
  return draft.output.kind === 'launcher'
    ? draft.output.launcher?.mechanism
    : draft.output.ammunition?.kind === 'arrow'
      ? 'arrow'
      : undefined;
}
