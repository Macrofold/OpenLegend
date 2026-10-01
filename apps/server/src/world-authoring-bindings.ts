import { z } from 'zod';
import {
  editActorAttributes,
  HOST_IMPLEMENTATIONS,
  type Transition,
  type WorldState,
} from '@open-legend/domain';
import { fingerprint } from './relationship-index.js';

export const attributeReferenceId = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const attributeBindingSchema = z
  .object({
    entityId: attributeReferenceId,
    attributeIds: z
      .array(attributeReferenceId)
      .min(1)
      .max(16)
      .refine((ids) => new Set(ids).size === ids.length, 'Choose each attribute once.'),
  })
  .strict();

/** Bind identity, not changing values: ordinary reservoir draining must not stale an addition.
 * docs/invention-composition.md#reviewed-custom-attribute-binding
 */
export function attributeBindingTarget(world: WorldState, payload: unknown) {
  const parsed = attributeBindingSchema.safeParse(payload);
  return authoringBodyTarget(world, parsed.success ? parsed.data.entityId : '');
}
export function authoringBodyTarget(world: WorldState, entityId: string) {
  const entity = Object.hasOwn(world.entities, entityId) ? world.entities[entityId] : undefined;
  return {
    entityId,
    digest: fingerprint(entity?.actor ? [entity.id, entity.kind, entity.actor.bornAt] : null),
  };
}

/** Adds admitted custom attributes at their declared initial values through the existing owner.
 * No native physiology replacement, arbitrary value setter, removal or second sparse-state writer.
 */
export function bindAuthoringAttributes(
  world: WorldState,
  payload: unknown,
  receiptId: string,
): Transition {
  const reject = (message: string): Transition => ({
    world,
    events: [],
    outcome: { ok: false, code: 'attribute-binding-rejected', message },
  });
  const parsed = attributeBindingSchema.safeParse(payload);
  if (!parsed.success) return reject('Choose a body and one to sixteen distinct attribute IDs.');
  const { entityId, attributeIds } = parsed.data;
  if (!Object.hasOwn(world.entities, entityId) || !world.entities[entityId]?.actor)
    return reject('The selected entity has no supported body attribute owner.');
  const definitions = new Map(world.moduleManifest.definitions.map((d) => [d.id, d]));
  const changes: { attributeId: string; expectedRevision: null; value: number | string }[] = [];
  for (const attributeId of attributeIds) {
    const definition = definitions.get(attributeId);
    if (!definition || HOST_IMPLEMENTATIONS[definition.implementation].storage !== 'attributes')
      return reject('Only installed custom reservoir or category attributes can be attached.');
    if (Object.hasOwn(world.entities[entityId]!.actor!.attributes ?? {}, attributeId))
      return reject(
        'An attribute is already attached. This operation never resets existing values.',
      );
    changes.push({ attributeId, expectedRevision: null, value: definition.schema.initial });
  }
  return editActorAttributes(world, {
    id: receiptId,
    actorId: entityId,
    expectedManifestRevision: world.moduleManifest.revision,
    changes,
  });
}

/** Resolve the initial state for human review from pinned definitions, not from model prose. */
export function attributeBindingSummary(world: WorldState, payload: unknown): string {
  const parsed = attributeBindingSchema.safeParse(payload);
  if (!parsed.success) return 'Attach admitted custom attributes without changing existing values.';
  const entity = Object.hasOwn(world.entities, parsed.data.entityId)
    ? world.entities[parsed.data.entityId]
    : undefined;
  const definitions = new Map(world.moduleManifest.definitions.map((d) => [d.id, d]));
  const additions = parsed.data.attributeIds.map((id) => {
    const d = definitions.get(id);
    return d
      ? `${d.name} = ${d.schema.initial}${d.schema.kind === 'number' ? ` ${d.schema.unit}` : ''}`
      : `${id} (unavailable)`;
  });
  return `Attach to ${entity?.name ?? 'the selected body'}: ${additions.join('; ')}. Existing values, native physiology, senses, controller and work are unchanged. New reservoirs use their admitted drain and recharge rules.`;
}
export function attributeBindingImpact(world: WorldState, payload: unknown) {
  const parsed = attributeBindingSchema.safeParse(payload);
  const target = attributeBindingTarget(world, payload);
  const actor = Object.hasOwn(world.entities, target.entityId)
    ? world.entities[target.entityId]?.actor
    : undefined;
  return {
    token: fingerprint([
      target,
      parsed.success
        ? parsed.data.attributeIds.map((id) => [id, Object.hasOwn(actor?.attributes ?? {}, id)])
        : [],
    ]),
    affected: actor ? 1 : 0,
  };
}
