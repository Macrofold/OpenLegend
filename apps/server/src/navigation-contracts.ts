import { z } from 'zod';
import {
  FOLLOW_RULES,
  INTENT_LIMITS,
  namedClockTimes,
  activityRequestDescriptors,
  type WorldState,
} from '@open-legend/domain';

export type InstalledActivityRequests = ReturnType<typeof activityRequestDescriptors>;

/** Provider mirror of the domain IntentSlots validator; references are request-scoped. */
export const intentSlotsSchema = z
  .object({
    itemId: z.string().min(1).max(120).nullable(),
    instrumentId: z.string().min(1).max(120).nullable(),
    recipientId: z.string().min(1).max(120).nullable(),
    quantity: z.number().int().min(1).max(INTENT_LIMITS.quantity).nullable(),
    quantityMode: z.enum(['exact', 'held']).nullable(),
    // Clock names belong to the world; admission checks the name against the world's list.
    until: z.string().min(1).max(24).nullable(),
    method: z.string().trim().min(1).max(INTENT_LIMITS.method).nullable(),
  })
  .strict();

export const navigationInvocationSchema = z
  .object({
    family: z.string().min(1).max(120),
    parameters: z
      .record(
        z.string().min(1).max(120),
        z.union([z.string().max(120), z.number().finite(), z.boolean()]),
      )
      .nullable()
      .optional(),
    x: z.number().finite().nullable(),
    z: z.number().finite().nullable(),
    surfaceId: z.string().min(1).max(120).nullable(),
    frame: z.enum(['world', 'actor']).nullable(),
    place: z.enum(['target', 'last-seen']).nullable(),
    targetEntityId: z.string().min(1).max(120).nullable(),
    distance: z
      .number()
      .min(FOLLOW_RULES.minimumDistance)
      .max(FOLLOW_RULES.maximumDistance)
      .nullable(),
    relation: z.enum(['near', 'behind', 'beside', 'left', 'right']).nullable(),
    onLost: z.enum(['stop', 'last-seen']).nullable(),
    until: z.string().min(1).max(24).nullable(),
    itemId: z.string().min(1).max(120).nullable(),
    quantity: z.number().int().min(1).max(INTENT_LIMITS.quantity).nullable(),
  })
  .strict();

/** Transport advertises installed closed request shapes; the trusted native builder
 * still validates the chosen family, scoped references and current mechanical support. */
export function actionInvocationSchema(requests: InstalledActivityRequests = []) {
  const requestSchemas = requests.map((request) => {
    const fields: Record<string, z.ZodType<string | number | boolean>> = {};
    for (const [key, field] of Object.entries(request.fields)) {
      if (field.type === 'integer') {
        let amount = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
        if (field.minimum !== undefined) amount = amount.min(field.minimum);
        if (field.maximum !== undefined) amount = amount.max(field.maximum);
        fields[key] = amount;
      } else if (field.type === 'time') {
        // Selected requests bind an absolute simulation deadline once, before admission.
        let deadline = z.number().finite();
        if (field.minimum !== undefined) deadline = deadline.min(field.minimum);
        if (field.maximum !== undefined) deadline = deadline.max(field.maximum);
        fields[key] = deadline;
      } else if (field.type === 'mode') fields[key] = z.enum(['enqueue', 'replace', 'interrupt']);
      else fields[key] = z.string().min(1).max(120);
    }
    return z.object(fields).strict();
  });
  const first = requestSchemas[0];
  const parameters = !first
    ? z.null()
    : requestSchemas.length === 1
      ? first
      : z.union(requestSchemas);
  return navigationInvocationSchema.extend({
    family: z.enum([
      'move',
      'follow',
      'pickup',
      'drop',
      ...requests.map((request) => request.id),
    ] as [string, ...string[]]),
    parameters: parameters.nullable(),
  });
}

/** A stopping-time field limited to this world's names; null only when it names none. */
export function namedTimeSchema(world: WorldState) {
  const names = namedClockTimes(world);
  return names.length ? z.enum(names as [string, ...string[]]).nullable() : z.null();
}
/** Built per world: the stopping-time names come from the world's own clock policy. */
export function navigationInstructions(world: WorldState): string {
  const times = namedClockTimes(world);
  const navigation = NAVIGATION_TEXT.replace(
    '{until}',
    times.length ? `, until ${times.join('/')} to end it` : '',
  );
  const requests = activityRequestDescriptors(world);
  return requests.length
    ? `${navigation}\nOptional installed activity requests: ${JSON.stringify(requests)}. To explicitly choose one, set invocation.family to its exact id and invocation.parameters to all its selected closed fields. Every navigation field must be null. Keep its selected mode equal to act.mode. These are requested activities, never evidence that a method is learned. Choosing no new work and ordinary actions remain available; a request alone creates no goal or completed work.`
    : navigation;
}
const NAVIGATION_TEXT =
  'For movement or item handling not listed in suggestions use act.kind=invoke with invocation fields family, parameters, x, z, surfaceId, frame, place, targetEntityId, distance, relation, onLost, until, itemId, quantity (unused fields null). Navigation uses parameters null. Pickup: targetEntityId is a visible pile, itemId one stack in it or null for everything, quantity an exact count or null. Drop: itemId a possession, quantity exact or null for the whole stack as it is now. Move: world X/Z (not height) with frame world; or frame actor with x metres right and z metres forward of your own facing; or place target (near a visible target now) or place last-seen (where you last saw that target) with targetEntityId. Follow: targetEntityId, optional distance, relation near/behind/beside/left/right (behind/beside use the direction you saw them travel), onLost stop or last-seen{until}. Follow stops on lost sight unless onLost last-seen, on cancellation or native interruption; it has no stealth. Put a request with unsupported qualifiers in kind=proposal instead, preserving its text and optional targetEntityId, so fulfillment can be reviewed. Never silently drop a requirement by choosing a direct invocation. For any non-invoke act, invocation is null.';
