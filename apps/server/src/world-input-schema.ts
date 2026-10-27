import { z } from 'zod';
const token = z.string().min(1).max(200);
const sequence = z.number().int().positive().safe();
const origin = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
const identity = { inputEpoch: token, attackInputToken: token, gestureSequence: sequence };
export const releaseInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ordinary') }).strict(),
  z
    .object({
      kind: z.literal('timed-release'),
      phase: z.number().finite().min(0).lt(1),
    })
    .strict(),
]);
export const executionControlSchema = z.discriminatedUnion('operation', [
  z
    .object({
      ...identity,
      operation: z.literal('begin'),
    })
    .strict(),
  z
    .object({
      ...identity,
      operation: z.literal('release'),
      beginCommandId: origin,
      input: releaseInputSchema,
    })
    .strict(),
  z.object({ ...identity, operation: z.literal('confirm-review') }).strict(),
  z.object({ ...identity, operation: z.literal('cancel'), beginCommandId: origin }).strict(),
]);
export const worldInputSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('steer'),
        inputEpoch: token,
        movementInputToken: token,
        movementSequence: sequence,
        direction: z
          .object({ x: z.number().finite(), z: z.number().finite() })
          .strict()
          .refine((value) => {
            const length = Math.hypot(value.x, value.z);
            return length === 0 || Math.abs(length - 1) <= 16 * Number.EPSILON;
          }, 'Movement must be a normalized direction or zero.'),
      })
      .strict(),
    z
      .object({
        kind: z.literal('renew'),
        inputEpoch: token,
        renewalSequence: sequence,
        movement: z
          .object({ movementInputToken: token, movementSequence: sequence })
          .strict()
          .optional(),
        pendingRelease: z
          .object({
            attackInputToken: token,
            gestureSequence: sequence,
            beginCommandId: origin,
            actionId: origin,
          })
          .strict()
          .optional(),
      })
      .strict(),
  ])
  .refine(
    (value) => value.kind !== 'renew' || !!value.movement || !!value.pendingRelease,
    'Renew one actual input lane.',
  );
