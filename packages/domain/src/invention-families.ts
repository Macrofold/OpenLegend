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

/** Native wilderness consumer summaries, not a universal property/effects interpreter.
 * docs/architecture.md#invention-workshop-tools
 */
export function describeInvention(draft: DeclarationDraft): string {
  const family = inventionFamily(draft);
  const output = draft.output;
  if (output.launcher)
    return `${family} launcher; ${output.launcher.ammunitionKind} ammunition; range ${output.launcher.range}; damage ${output.launcher.damage}; accuracy ${output.launcher.accuracy}; ${draft.workSeconds} game seconds to craft`;
  if (output.gatheringTool)
    return `Carried gathering tool; up to ${output.gatheringTool.quantity} ${output.gatheringTool.resourceId} per batch, limited by remaining supply; tools do not stack; ${draft.workSeconds} game seconds to craft`;
  if (output.ammunition)
    return `Arrow ammunition; damage bonus ${output.ammunition.damageBonus}; one projectile per craft; ${draft.workSeconds} game seconds to craft`;
  return 'No supported native effect.';
}

/** Discovery metadata only; these labels are not installable host registrations or proof of effect closure. */
export const INVENTION_FAMILY_INTERFACES = {
  swing: {
    nativeConsumer: 'kernel:craft/equip/hunt',
    uses: ['craft', 'equip', 'hunt'],
    effects: ['finite-ammunition-consumption', 'body-injury'],
    reads: ['known-recipe', 'inventory', 'target-body', 'spatial-reach'],
    limitation: 'Native animal hunting only; not a general projectile or combat engine.',
  },
  flex: {
    nativeConsumer: 'kernel:craft/equip/hunt',
    uses: ['craft', 'equip', 'hunt'],
    effects: ['finite-ammunition-consumption', 'body-injury'],
    reads: ['known-recipe', 'inventory', 'target-body', 'spatial-reach'],
    limitation: 'Uses compatible native arrows; no generated trajectory solver.',
  },
  arrow: {
    nativeConsumer: 'kernel:craft/hunt',
    uses: ['craft', 'hunt'],
    effects: ['finite-crafted-item'],
    reads: ['known-recipe', 'inventory'],
    limitation: 'Consumed by a compatible launcher; cannot define new damage operators.',
  },
  'gathering-tool': {
    nativeConsumer: 'gathering:gatheringYield',
    uses: ['craft', 'gather'],
    effects: ['finite-resource-transfer'],
    reads: ['known-recipe', 'inventory', 'resource-remaining'],
    limitation: 'Best compatible carried tool only; no stacking, wear, or container state.',
  },
} as const satisfies Record<
  InventionFamily,
  {
    nativeConsumer: string;
    uses: readonly string[];
    effects: readonly string[];
    reads: readonly string[];
    limitation: string;
  }
>;
