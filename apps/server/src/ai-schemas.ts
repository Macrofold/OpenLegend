import type { JsonSchema } from '@open-legend/ai';

const text = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength });
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const nullable = (schema: unknown) => ({ anyOf: [schema, { type: 'null' }] });
/** Provider shape is strict and total; the application removes null, inapplicable components. */
export const declarationSchema: JsonSchema = object({
  schemaVersion: { type: 'integer', const: 1 },
  name: text(80),
  description: text(700),
  inputs: {
    type: 'array',
    minItems: 2,
    maxItems: 6,
    items: object({
      definitionId: text(120),
      quantity: { type: 'integer', minimum: 1, maximum: 8 },
      role: { type: 'string', enum: ['binding', 'body', 'pouch', 'shaft', 'point', 'fletching'] },
    }),
  },
  workSeconds: { type: 'integer', minimum: 48, maximum: 480 },
  output: object({
    kind: { type: 'string', enum: ['launcher', 'ammunition', 'gathering-tool'] },
    gatheringTool: nullable(
      object({ resourceId: text(120), quantity: { type: 'integer', minimum: 2, maximum: 4 } }),
    ),
    name: text(80),
    description: text(700),
    properties: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'string',
        enum: ['fiber', 'binding', 'flexible', 'rigid', 'shaft', 'pouch', 'point', 'projectile'],
      },
    },
    launcher: nullable(
      object({
        mechanism: { type: 'string', enum: ['swing', 'flex'] },
        ammunitionKind: { type: 'string', enum: ['stone', 'arrow'] },
        damage: { type: 'number', minimum: 10, maximum: 28 },
        range: { type: 'number', minimum: 3, maximum: 10 },
        accuracy: { type: 'number', minimum: 0.6, maximum: 0.9 },
      }),
    ),
    ammunition: nullable(
      object({
        kind: { type: 'string', const: 'arrow' },
        damageBonus: { type: 'number', minimum: 0, maximum: 5 },
      }),
    ),
  }),
});
