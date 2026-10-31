import { z } from 'zod';
import type { CognitionLabOperation, CognitionLabSettings } from '@open-legend/protocol';
import { COGNITION_LAB_MAX_COMPARISON_VARIANTS } from '@open-legend/protocol';
import { requestIdSchema } from './command-input-schema.js';

const id = requestIdSchema;
const json = z.json();
export const labExpectedSchema = z
  .object({
    runtimeGeneration: id,
    scenarioRevision: z.number().int().nonnegative(),
  })
  .strict();
export const labPolicySchema = z
  .object({
    mode: z.enum(['oneResponse', 'untilCondition', 'forDuration', 'continuous']),
    focalActorId: id.optional(),
    autonomousActorIds: z.array(id),
    durationSeconds: z.number().finite().positive(),
    maximumCalls: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    activeWallSeconds: z.number().finite().positive(),
    stopCondition: z
      .union([
        z.object({ kind: z.enum(['actionOutcome', 'nextDecision']), id }).strict(),
        z.object({ kind: z.enum(['nextEvent', 'nextStage']), id: id.optional() }).strict(),
      ])
      .optional(),
  })
  .strict();
export const labSettingsSchema: z.ZodType<CognitionLabSettings> = z
  .object({
    policy: labPolicySchema,
    models: z.record(id, z.string().min(1).max(240)),
    effort: z.string().min(1).max(80).optional(),
    maxOutputTokens: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    storageAllowanceBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    runCaptureAllowanceBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export const labSettingsPatchSchema = z
  .object({
    policy: labPolicySchema.optional(),
    models: z.record(id, z.string().min(1).max(240)).optional(),
    effort: z.string().min(1).max(80).nullable().optional(),
    maxOutputTokens: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
    storageAllowanceBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    runCaptureAllowanceBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .strict();
export const labCustomFieldSchema = z
  .object({
    id,
    label: z.string().trim().min(1).max(200),
    datatype: z.enum(['text', 'number', 'boolean', 'meter']),
    description: z.string().max(4000),
    value: z.union([z.string(), z.number().finite(), z.boolean()]),
    subject: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('person'), actorId: id }).strict(),
      z.object({ kind: z.literal('relation'), fromActorId: id, toActorId: id }).strict(),
      z.object({ kind: z.literal('object'), objectId: id }).strict(),
      z.object({ kind: z.literal('scene') }).strict(),
    ]),
    enabled: z.boolean(),
    recipientActorIds: z.array(id),
    placement: z.literal('experimentalContext'),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
    unit: z.string().max(80).optional(),
  })
  .strict()
  .superRefine((field, context) => {
    const wanted =
      field.datatype === 'meter' ? 'number' : field.datatype === 'text' ? 'string' : field.datatype;
    if (typeof field.value !== wanted)
      context.addIssue({ code: 'custom', path: ['value'], message: `Use a ${wanted} value.` });
    if (field.minimum !== undefined && field.maximum !== undefined && field.minimum > field.maximum)
      context.addIssue({
        code: 'custom',
        path: ['maximum'],
        message: 'Maximum must be at least the minimum.',
      });
  });
export const labEditSchema = z
  .object({
    actorId: id.optional(),
    fieldId: z.string().min(1).max(2048),
    owner: z.enum([
      'person',
      'memory',
      'worldEvent',
      'attribute',
      'appraisal',
      'knowledge',
      'custom',
    ]),
    value: json,
    baseValue: json,
    token: json.optional(),
    hold: z.boolean().optional(),
  })
  .strict();
const stimulus = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('say'),
      actorId: id,
      targetId: id.optional(),
      text: z.string().trim().min(1),
      volume: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({ kind: z.literal('act'), actorId: id, text: z.string(), command: json.optional() })
    .strict(),
  z.object({ kind: z.literal('event'), actorId: id.optional(), event: json }).strict(),
]);
const current = { commandId: id, expected: labExpectedSchema };
const record = { commandId: id };
export const labOperationSchema: z.ZodType<CognitionLabOperation> = z.discriminatedUnion('kind', [
  z.object({ ...current, kind: z.literal('setParticipants'), actorIds: z.array(id) }).strict(),
  z
    .object({ ...current, kind: z.literal('createCharacter'), values: z.record(z.string(), json) })
    .strict(),
  z
    .object({
      ...current,
      kind: z.literal('requestMaintenance'),
      actorId: id,
      policy: labPolicySchema,
    })
    .strict(),
  z
    .object({ ...current, kind: z.literal('applyEdits'), edits: z.array(labEditSchema).min(1) })
    .strict(),
  z
    .object({ ...current, kind: z.literal('applySettings'), settings: labSettingsPatchSchema })
    .strict(),
  z.object({ ...current, kind: z.literal('setCustomField'), field: labCustomFieldSchema }).strict(),
  z.object({ ...current, kind: z.literal('removeCustomField'), fieldId: id }).strict(),
  ...(['submitStimulus', 'prepareAndHold'] as const).map((kind) =>
    z
      .object({
        ...current,
        kind: z.literal(kind),
        stimulus,
        policy: labPolicySchema,
        stagePurpose: z.string().max(200).optional(),
      })
      .strict(),
  ),
  z
    .object({
      ...current,
      kind: z.literal('newScenario'),
      name: z.string().min(1).max(80).optional(),
      preset: id.optional(),
    })
    .strict(),
  ...(['saveScenario', 'saveCheckpoint'] as const).map((kind) =>
    z
      .object({
        ...current,
        kind: z.literal(kind),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(1000).optional(),
      })
      .strict(),
  ),
  ...(['loadScenario', 'restoreCheckpoint'] as const).map((kind) =>
    z
      .object({
        ...current,
        kind: z.literal(kind),
        savedId: id,
        keepCurrentModels: z.boolean().optional(),
      })
      .strict(),
  ),
  z.object({ ...current, kind: z.literal('importGameSnapshot'), saveId: id.optional() }).strict(),
  z.object({ ...current, kind: z.literal('submitPrepared'), handleId: id, request: json }).strict(),
  z.object({ ...current, kind: z.literal('continueOriginal'), handleId: id }).strict(),
  z
    .object({ ...current, kind: z.literal('retryResponse'), sourceId: id, policy: labPolicySchema })
    .strict(),
  z
    .object({
      ...current,
      kind: z.literal('continueCheckpoint'),
      savedId: id,
      stageId: id,
      policy: labPolicySchema,
    })
    .strict(),
  z
    .object({
      ...current,
      kind: z.literal('runComparison'),
      originId: id,
      variants: z
        .array(
          z
            .object({
              name: z.string().trim().min(1).max(80),
              settings: labSettingsPatchSchema.optional(),
              edits: z.array(labEditSchema).optional(),
              stimulus,
            })
            .strict(),
        )
        .min(2)
        .max(COGNITION_LAB_MAX_COMPARISON_VARIANTS),
      policy: labPolicySchema,
      recipeId: id.optional(),
    })
    .strict(),
  z
    .object({
      ...record,
      kind: z.literal('controlRun'),
      expected: labExpectedSchema.partial({ scenarioRevision: true }),
      runId: id.optional(),
      action: z.enum([
        'continue',
        'hold',
        'step',
        'run',
        'advanceTime',
        'advanceToOutcome',
        'pause',
        'resume',
        'cancelAttempt',
        'stop',
      ]),
      durationSeconds: z.number().finite().positive().optional(),
      attemptId: id.optional(),
    })
    .strict(),
  z
    .object({
      ...record,
      kind: z.literal('retainRun'),
      runId: id,
      name: z.string().trim().min(1).max(80).optional(),
    })
    .strict(),
  z
    .object({
      ...record,
      kind: z.literal('annotateRun'),
      runId: id,
      recordId: id.optional(),
      text: z.string().max(20000),
      tags: z.array(z.string().max(100)).optional(),
    })
    .strict(),
  z.object({ ...record, kind: z.literal('removeSaved'), savedIds: z.array(id).min(1) }).strict(),
  z
    .object({
      ...record,
      kind: z.literal('rerunRequest'),
      runId: id,
      stageId: id,
      request: json.optional(),
      settings: labSettingsPatchSchema.optional(),
    })
    .strict(),
]);

export const labPageSchema = z
  .object({
    query: z.string().max(200).optional(),
    cursor: z.string().max(4096).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
