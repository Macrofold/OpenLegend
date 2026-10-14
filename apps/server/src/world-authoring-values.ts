import { z } from 'zod';
import { namePhrase } from '@open-legend/language';
import {
  editActorAttributes,
  HOST_IMPLEMENTATIONS,
  type Transition,
  type WorldState,
} from '@open-legend/domain';
import { authoringBodyTarget, attributeReferenceId } from './world-authoring-bindings.js';
import { fingerprint } from './relationship-index.js';

export const attributeValueSchema = z
  .object({
    entityId: attributeReferenceId,
    changes: z
      .array(
        z
          .object({
            attributeId: attributeReferenceId,
            expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
            value: z.union([z.number().finite(), z.string().min(1).max(200)]),
          })
          .strict(),
      )
      .min(1)
      .max(16)
      .refine(
        (changes) => new Set(changes.map((c) => c.attributeId)).size === changes.length,
        'Choose each attribute once.',
      ),
  })
  .strict();

export function attributeValueTarget(world: WorldState, payload: unknown) {
  const parsed = attributeValueSchema.safeParse(payload);
  return authoringBodyTarget(world, parsed.success ? parsed.data.entityId : '');
}

/** State identity shared by review freshness and its scoped dependency projection. */
export function authoringAttributeValue(world: WorldState, entityId: string, attributeId: string) {
  const actor = Object.hasOwn(world.entities, entityId)
    ? world.entities[entityId]?.actor
    : undefined;
  return Object.hasOwn(actor?.attributes ?? {}, attributeId)
    ? actor?.attributes?.[attributeId]
    : actor?.practice?.[attributeId]
      ? {
          value: actor.practice[attributeId]!.starting,
          revision: actor.practice[attributeId]!.revision,
        }
      : undefined;
}

/** Exact current-value edits are creator interventions, never a native recharge or an NPC power.
 * The native owner validates revisions/ranges and emits concern changes atomically.
 * docs/world-agent-inspection-and-edits.md#reviewed-custom-attribute-values
 */
export function editAuthoringAttributeValues(
  world: WorldState,
  payload: unknown,
  receiptId: string,
): Transition {
  const reject = (message: string): Transition => ({
    world,
    events: [],
    outcome: {
      ok: false,
      code: 'attribute-values-rejected',
      message,
    },
  });
  const parsed = attributeValueSchema.safeParse(payload);
  if (!parsed.success)
    return reject('Choose one body and up to sixteen distinct, revision-bound attribute values.');
  const { entityId, changes } = parsed.data;
  const actor = Object.hasOwn(world.entities, entityId)
    ? world.entities[entityId]?.actor
    : undefined;
  if (!actor) return reject('The selected entity has no supported body attribute owner.');
  const definitions = new Map(world.moduleManifest.definitions.map((d) => [d.id, d]));
  for (const change of changes) {
    const definition = definitions.get(change.attributeId);
    if (
      !definition ||
      !['attributes', 'practice'].includes(
        HOST_IMPLEMENTATIONS[definition.implementation].storage,
      ) ||
      (!Object.hasOwn(actor.attributes ?? {}, change.attributeId) &&
        !Object.hasOwn(actor.practice ?? {}, change.attributeId))
    )
      return reject(
        'Only attached custom values or authored starting competence can be edited. Earned practice is retained; this does not attach attributes or change native physiology.',
      );
  }
  return editActorAttributes(world, {
    id: receiptId,
    actorId: entityId,
    expectedManifestRevision: world.moduleManifest.revision,
    changes,
  });
}

export function attributeValueImpact(world: WorldState, payload: unknown) {
  const parsed = attributeValueSchema.safeParse(payload);
  const target = attributeValueTarget(world, payload);
  return {
    token: fingerprint([
      target,
      parsed.success
        ? parsed.data.changes.map((c) => {
            const value = authoringAttributeValue(world, target.entityId, c.attributeId);
            return [c.attributeId, value?.revision ?? null, value?.value ?? null];
          })
        : [],
    ]),
    affected:
      Object.hasOwn(world.entities, target.entityId) && world.entities[target.entityId]?.actor
        ? 1
        : 0,
  };
}

export function attributeValueSummary(world: WorldState, payload: unknown): string {
  const parsed = attributeValueSchema.safeParse(payload);
  if (!parsed.success)
    return 'Review an explicit world-owner intervention on existing custom attribute values.';
  const entity = Object.hasOwn(world.entities, parsed.data.entityId)
    ? world.entities[parsed.data.entityId]
    : undefined;
  const definitions = new Map(world.moduleManifest.definitions.map((d) => [d.id, d]));
  const changes = parsed.data.changes.map((c) => {
    const definition = definitions.get(c.attributeId);
    const current = authoringAttributeValue(world, parsed.data.entityId, c.attributeId);
    return `${definition?.name ?? c.attributeId}${definition?.practice ? ' (authored starting competence; earned evidence is retained)' : ''}: ${JSON.stringify(current?.value ?? null)} -> ${JSON.stringify(c.value)}${definition?.schema.kind === 'number' ? ` ${definition.schema.unit}` : ''}`;
  });
  return `Creator intervention on ${entity ? namePhrase(entity, 'definite') : 'the selected body'}: ${changes.join('; ')}. This may create or remove fictional reservoir quantity without a source or work. It is not ordinary recharge, learning, or a change to the definition. Existing native state and unrelated attributes are preserved; normal concern and reservoir rules still apply. Changed values require a fresh revision and review.`;
}
