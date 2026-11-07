import { validAppearanceRecipeShape, type AppearanceRecipe } from '@open-legend/domain';
import { z } from 'zod';
import {
  ACTIVITY_LIMITS,
  validEncounterExposure,
  validatePerceivedSound,
  type PerceivedSound,
} from '@open-legend/domain';
import { requestIdSchema } from './command-input-schema.js';

export const godPersonCreation = z
  .object({
    name: z.string().trim().min(1).max(80),
    personality: z.string().trim().max(1000),
    backstory: z.string().trim().max(4000),
    traitIds: z.array(requestIdSchema).max(8),
    initialGoals: z.array(z.string().trim().min(1).max(500)).max(8),
    appearance: z.custom<AppearanceRecipe>(validAppearanceRecipeShape).optional(),
    initialOutfit: z.array(requestIdSchema).optional(),
  })
  .strict();

export const godPersonEditor = z
  .object({
    appearance: z
      .object({
        revision: z.number().int().safe().min(0),
        physicalLife: z.number().int().safe().min(0),
        recipe: z.custom<AppearanceRecipe>(validAppearanceRecipeShape),
      })
      .strict()
      .optional(),
    inventory: z
      .array(
        z
          .object({
            definitionId: requestIdSchema,
            quantity: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
          })
          .strict(),
      )
      .optional(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(2000),
    personality: z.string().trim().max(1000),
    backstory: z.string().trim().max(4000),
    traitIds: z.array(requestIdSchema).max(8),
    goals: z.array(z.string().trim().min(1).max(500)).max(8),
    meters: z.record(requestIdSchema, z.number().finite()),
  })
  .strict();
const godAwareness = z
  .object({
    retentionClass: z.literal('memory'),
    sound: z
      .custom<PerceivedSound>((value) => {
        try {
          validatePerceivedSound(value);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    exposure: z
      .custom<import('@open-legend/domain').EncounterExposure>(validEncounterExposure)
      .optional(),
    change: z.enum(['onset', 'detail', 'end']).optional(),
    eventType: z.string().max(200).optional(),
    sourceId: requestIdSchema.optional(),
    targetId: requestIdSchema.optional(),
    triggerKind: z
      .enum([
        'addressed_speech',
        'overheard_speech',
        'self_event',
        'directed_action',
        'observed_event',
      ])
      .optional(),
    content: z.string().max(20_000).optional(),
    eventId: requestIdSchema,
    actorId: requestIdSchema,
    text: z.string().max(20_000),
    at: z.number().finite().min(0),
    sequence: z.number().int().min(0),
    modality: z.enum(['heard', 'observed', 'felt', 'internal']),
    recognized: z.boolean(),
    intelligible: z.boolean(),
    entityIds: z.array(requestIdSchema).max(100),
    importance: z.number().finite(),
    urgency: z.number().finite().min(0).max(10).optional(),
  })
  // Preserve the current native speech, reference and observer-fact payload. The
  // domain edit owner permits only prose/importance differences from the exact hash.
  .passthrough();
const godMemory = z
  .object({
    activityId: requestIdSchema.optional(),
    obligation: z
      .object({
        revision: z.number().int().min(0),
        status: z.enum(['active', 'fulfilled', 'cancelled', 'overdue']),
        dueAt: z.number().finite().min(0).optional(),
        completion: z
          .object({ eventType: z.string().max(200), targetId: requestIdSchema.optional() })
          .strict()
          .optional(),
        evidenceId: requestIdSchema,
      })
      .strict()
      .optional(),
    eventType: z.string().max(200).optional(),
    speakerId: requestIdSchema.optional(),
    sequence: z.number().int().min(0).optional(),
    id: requestIdSchema,
    actorId: requestIdSchema,
    kind: z.enum(['episode', 'belief', 'commitment', 'reflection']),
    source: z.enum(['observed', 'heard', 'felt', 'internal', 'inferred', 'self_thought']),
    responseId: requestIdSchema.optional(),
    // A native result can fill its existing 32 KiB source allowance. Do not reject
    // an unchanged result merely because the creator edits its importance.
    summary: z.string().max(ACTIVITY_LIMITS.recordBytes),
    at: z.number().finite().min(0),
    entityIds: z.array(requestIdSchema).max(100),
    eventId: requestIdSchema.optional(),
    importance: z.number().finite(),
    resolved: z.boolean().optional(),
  })
  .passthrough();
const godExperienceSource = z
  .object({
    kind: z.enum(['awareness', 'memory', 'summary']),
    id: requestIdSchema,
    revision: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const godSpeechAttribution = z
  .object({
    version: z.literal(1),
    groups: z
      .array(
        z
          .object({
            speakerId: requestIdSchema.nullable(),
            targetId: requestIdSchema.nullable(),
            addressing: z.enum(['ambient', 'directed']).nullable(),
            observerRelation: z.enum(['self', 'addressed', 'overheard', 'ambient', 'seen']),
            acquisition: z.enum(['self', 'heard', 'seen']),
            intelligibility: z.enum(['none', 'partial', 'clear']),
            firstAt: z.number().finite().min(0),
            lastAt: z.number().finite().min(0),
            sourceCount: z.number().int().positive(),
            supportKey: z.string().regex(/^[a-f0-9]{64}$/),
            sources: z.array(godExperienceSource).max(8192),
          })
          .strict(),
      )
      .max(8192),
  })
  .strict();
const godSummary = z
  .object({
    id: requestIdSchema,
    text: z.string().max(20_000),
    sequence: z.number().int().min(0).optional(),
    from: z.number().finite().min(0),
    to: z.number().finite().min(0),
    sources: z.array(godExperienceSource).max(8192),
    attribution: godSpeechAttribution,
    entityIds: z.array(requestIdSchema).max(100),
    importance: z.number().finite(),
    revision: z.number().int().min(0).optional(),
  })
  .strict();
export const godMemoryEdit = z.discriminatedUnion('source', [
  z.object({ source: z.literal('awareness'), value: godAwareness }).strict(),
  z.object({ source: z.literal('memory'), value: godMemory }).strict(),
  z.object({ source: z.literal('summary'), value: godSummary }).strict(),
]);
export const editorHash = z.string().regex(/^[a-f0-9]{64}$/);
export const godWorldEvent = z
  .object({
    id: requestIdSchema,
    sequence: z.number().int().min(0),
    at: z.number().finite().min(0),
    type: z.string().trim().min(1).max(200),
    text: z.string().max(20_000),
    actorId: requestIdSchema.optional(),
    targetId: requestIdSchema.optional(),
    audience: z.array(requestIdSchema).max(1000),
    importance: z.number().finite().min(0).max(10).optional(),
    urgency: z.number().finite().min(0).max(10).optional(),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  // Current events also carry native order, origin and structured narration. Their
  // mutation owner rejects changes to every field except supported text correction.
  .passthrough();

/** Insertion is explicit about source and observers; it never accepts an executable
 * action or provider output as authority. Full native admission remains in domain. */
export const authoredHistory: z.ZodType<import('@open-legend/domain').AuthoredHistory> =
  z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('memory'),
        actorId: requestIdSchema,
        memory: godMemory
          .omit({ id: true, actorId: true, sequence: true })
          .pick({
            kind: true,
            source: true,
            summary: true,
            at: true,
            importance: true,
            entityIds: true,
            eventId: true,
          })
          .extend({
            kind: z.literal('episode'),
            source: z.enum(['observed', 'heard', 'felt', 'internal', 'self_thought']),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        kind: z.literal('event'),
        event: godWorldEvent
          .pick({
            type: true,
            text: true,
            at: true,
            actorId: true,
            targetId: true,
            importance: true,
            urgency: true,
            data: true,
          })
          .strict(),
        perspectives: z
          .array(godAwareness.omit({ eventId: true, at: true, sequence: true }))
          .max(1000),
      })
      .strict(),
  ]);
