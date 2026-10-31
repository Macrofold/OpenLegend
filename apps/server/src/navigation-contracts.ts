import { z } from 'zod';
import {
  FOLLOW_RULES,
  INTENT_LIMITS,
  namedClockTimes,
  activityRequestDescriptors,
  type WorldState,
  type ActionInvocation,
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

/** Sparse model invocation; native binding receives its own explicit command shape. */
export type ModelActionInvocation = Pick<ActionInvocation, 'family'> &
  Partial<Omit<ActionInvocation, 'family'>>;

interface InvocationReferences {
  entityId?: z.ZodType<string>;
  until?: z.ZodType<string | null>;
}

/** One branch per supported meaning, including each installed family's own fields. */
export function actionInvocationSchema(
  requests: InstalledActivityRequests = [],
  references: InvocationReferences = {},
): z.ZodType<ModelActionInvocation> {
  const entityId = references.entityId ?? z.string().min(1).max(120);
  const until = references.until ?? z.string().min(1).max(24).nullable();
  const quantity = z.number().int().min(1).max(INTENT_LIMITS.quantity).nullable();
  const variants: z.ZodType<ModelActionInvocation>[] = [
    z
      .object({
        family: z.literal('move'),
        frame: z.literal('world'),
        x: z.number().finite(),
        z: z.number().finite(),
        surfaceId: z.string().min(1).max(120).nullable(),
      })
      .strict(),
    z
      .object({
        family: z.literal('move'),
        frame: z.literal('actor'),
        x: z.number().finite(),
        z: z.number().finite(),
        surfaceId: z.null(),
      })
      .strict(),
    z
      .object({
        family: z.literal('move'),
        place: z.enum(['target', 'last-seen']),
        targetEntityId: entityId,
      })
      .strict(),
    z
      .object({
        family: z.literal('follow'),
        targetEntityId: entityId,
        distance: z
          .number()
          .min(FOLLOW_RULES.minimumDistance)
          .max(FOLLOW_RULES.maximumDistance)
          .nullable(),
        relation: z.enum(['near', 'behind', 'beside', 'left', 'right']).nullable(),
        onLost: z.enum(['stop', 'last-seen']).nullable(),
        until,
      })
      .strict(),
    z
      .object({
        family: z.literal('pickup'),
        targetEntityId: entityId,
        itemId: entityId.nullable(),
        quantity,
      })
      .strict(),
    z.object({ family: z.literal('drop'), itemId: entityId, quantity }).strict(),
  ];
  for (const request of requests) {
    // A closed required enum with no declared values has no executable binding.
    if (
      Object.values(request.fields).some(
        (field) => field.type === 'choice' && !field.choices.length,
      )
    )
      continue;
    const fields: Record<string, z.ZodType<string | number | boolean>> = {};
    for (const [key, field] of Object.entries(request.fields)) {
      if (field.type === 'integer') {
        let amount = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
        if (field.minimum !== undefined) amount = amount.min(field.minimum);
        if (field.maximum !== undefined) amount = amount.max(field.maximum);
        fields[key] = amount;
      } else if (field.type === 'time') {
        let deadline = z.number().finite();
        if (field.minimum !== undefined) deadline = deadline.min(field.minimum);
        if (field.maximum !== undefined) deadline = deadline.max(field.maximum);
        fields[key] = deadline;
      } else if (field.type === 'mode') fields[key] = z.enum(['enqueue', 'replace', 'interrupt']);
      else if (field.type === 'choice')
        fields[key] = z.enum(field.choices.map((choice) => choice.value));
      else if (field.type === 'entity') fields[key] = entityId;
      else fields[key] = z.string().min(1).max(120);
    }
    variants.push(
      z.object({ family: z.literal(request.id), parameters: z.object(fields).strict() }).strict(),
    );
  }
  return z.union(variants);
}

/** This is a model-to-native projection, not acceptance of an older wire format.
 * The strict sparse schema validates first; native admission still checks effects. */
export function nativeActionInvocation(value: ModelActionInvocation): ActionInvocation {
  return {
    x: null,
    z: null,
    surfaceId: null,
    frame: null,
    place: null,
    targetEntityId: null,
    distance: null,
    relation: null,
    onLost: null,
    until: null,
    itemId: null,
    quantity: null,
    ...value,
  };
}

/** A stopping-time field limited to this world's names; null only when it names none. */
export function namedTimeSchema(world: WorldState) {
  const names = namedClockTimes(world);
  return names.length ? z.enum(names as [string, ...string[]]).nullable() : z.null();
}
/** Built per world: the stopping-time names come from the world's own clock policy. */
export function navigationInstructions(
  world: WorldState,
  {
    includeActivityRequests = true,
    actorId,
  }: { includeActivityRequests?: boolean; actorId?: string } = {},
): string {
  const times = namedClockTimes(world);
  const navigation = NAVIGATION_TEXT.replace(
    '{until}',
    times.length ? `, until ${times.join('/')} to end it` : '',
  );
  // Decision context already carries the typed catalog and its current choices.
  // Standalone action grounding still needs the complete installed catalog here.
  const requests = includeActivityRequests ? activityRequestDescriptors(world, actorId) : [];
  return requests.length
    ? `${navigation}\nOptional installed activity requests: ${JSON.stringify(requests)}. To explicitly choose one, set invocation.family to its exact id and invocation.parameters to all its selected closed fields. Include only its parameters, with no navigation fields. If it declares a work mode, keep that value equal to act.mode. These are requested activities, never evidence that a method is learned. Choosing no new work and ordinary actions remain available; a request alone creates no goal or completed work.`
    : navigation;
}
const NAVIGATION_TEXT =
  'For movement or item handling not listed in suggestions use act.kind=invoke with only the fields declared for that family in the schema. Pickup: targetEntityId is a visible pile, itemId one stack in it or null for everything, quantity an exact count or null. Drop: itemId a possession, quantity exact or null for the whole stack as it is now. Move: world X/Z (not height) with frame world; or frame actor with x metres right and z metres forward of your own facing; or place target (near a visible target now) or place last-seen (where you last saw that target) with targetEntityId. Follow: targetEntityId, optional distance, relation near/behind/beside/left/right (behind/beside use the direction you saw them travel), onLost stop or last-seen{until}. Follow stops on lost sight unless onLost last-seen, on cancellation or native interruption; it has no stealth. Put a request with unsupported qualifiers in kind=proposal instead, preserving its text and optional targetEntityId, so fulfillment can be reviewed. Never silently drop a requirement by choosing a direct invocation.';
