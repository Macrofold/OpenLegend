import { z } from 'zod';
import { FOLLOW_RULES, INTENT_LIMITS, namedClockTimes, type WorldState } from '@open-legend/domain';

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
    family: z.enum(['move', 'follow', 'pickup', 'drop']),
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

/** A stopping-time field limited to this world's names; null only when it names none. */
export function namedTimeSchema(world: WorldState) {
  const names = namedClockTimes(world);
  return names.length ? z.enum(names as [string, ...string[]]).nullable() : z.null();
}
/** Built per world: the stopping-time names come from the world's own clock policy. */
export function navigationInstructions(world: WorldState): string {
  const times = namedClockTimes(world);
  return NAVIGATION_TEXT.replace(
    '{until}',
    times.length ? `, until ${times.join('/')} to end it` : '',
  );
}
const NAVIGATION_TEXT =
  'For movement or item handling not listed in suggestions use act.kind=invoke with invocation fields family, x, z, surfaceId, frame, place, targetEntityId, distance, relation, onLost, until, itemId, quantity (unused fields null). Pickup: targetEntityId is a visible pile, itemId one stack in it or null for everything, quantity an exact count or null. Drop: itemId a possession, quantity exact or null for the whole stack as it is now. Move: world X/Z (not height) with frame world; or frame actor with x metres right and z metres forward of your own facing; or place target (near a visible target now) or place last-seen (where you last saw that target) with targetEntityId. Follow: targetEntityId, optional distance, relation near/behind/beside/left/right (behind/beside use the direction you saw them travel), onLost stop or last-seen{until}. Follow stops on lost sight unless onLost last-seen, on cancellation or native interruption; it has no stealth. Put a request with unsupported qualifiers in kind=proposal instead, preserving its text and optional targetEntityId, so fulfillment can be reviewed. Never silently drop a requirement by choosing a direct invocation. For any non-invoke act, invocation is null.';
