import type { ExpressionDefinition } from '../../expression-definitions.js';
import { BASE_ACTION_DEFAULTS } from './action-defaults.js';

export const BASE_EXPRESSIONS: readonly ExpressionDefinition[] = [
  ...['nod', 'smile', 'frown', 'wave', 'shrug'].map((id) => ({
    id,
    label: id[0]!.toUpperCase() + id.slice(1),
    verb: id,
    description: `${id[0]!.toUpperCase() + id.slice(1)}.`,
    target: 'optional' as const,
    targetJoiner: ' toward ',
  })),
  {
    id: 'shake_head',
    label: 'Shake head',
    verb: 'shake',
    possessiveSuffix: ' head',
    target: 'optional',
    targetJoiner: ' toward ',
    description: 'Shake your head.',
  },
  {
    id: 'slap',
    label: 'Slap',
    verb: 'slap',
    target: 'required',
    targetJoiner: ' ',
    reach: BASE_ACTION_DEFAULTS.interactionRadius,
    description: 'Expressive slap within reach; no felt contact or injury.',
  },
  {
    id: 'tickle',
    label: 'Tickle',
    verb: 'tickle',
    target: 'required',
    targetJoiner: ' ',
    reach: 1.5,
    contact: { kind: 'tickle', felt: 'felt a brief tickling touch' },
    description:
      'Briefly tickle someone within reach. This makes contact once; their reaction is their own.',
  },
];
