import { z } from 'zod';
import { SPEECH_VOLUMES } from '@open-legend/domain';
import { requestIdSchema } from './command-input-schema.js';

/** Shared browser grammar; recipient authority remains with the actual reader. */
export const playerInteractionRequest = z
  .object({
    volume: z.enum(SPEECH_VOLUMES).default('normal'),
    candidate: z.unknown().optional(),
    requestId: requestIdSchema,
    text: z.string().trim().min(1).max(1000),
    npcId: requestIdSchema.optional(),
  })
  .strict();
