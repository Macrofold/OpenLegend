import { z } from 'zod';
import {
  ACTIVITY_LIMITS,
  SPEECH_VOLUMES,
  validContributionTerms,
  validManufactureTools,
  isMaterialInputRole,
} from '@open-legend/domain';
import {
  constructionPlanSchema,
  gateUsePlanSchema,
  boundaryImpactPlanSchema,
  hearthPlanSchema,
} from './construction.js';
import { workBatchRequestSchema } from './work-batches.js';
import { knownPlaceReference } from './known-places.js';

/** Wire shape validation only. Current permissions, resources and physical
 * preconditions remain with command admission and the authoritative domain. */
const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const commandInputSchema = z
  .object({
    primaryAction: z
      .object({
        targetId: id,
        actionId: z.string().min(1),
        reference: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict()
      .optional(),
    type: z.enum([
      'encounter-preference',
      'construction',
      'operate-gate',
      'impact-boundary',
      'place-hearth',
      'repeat-work',
      'construction-rest',
      'activity',
      'activity-request',
      'say',
      'pickup',
      'drop',
      'transfer-item',
      'split-item',
      'merge-item',
      'unequip',
      'move',
      'evade',
      'follow',
      'confirm-attempt',
      'withdraw-attempt',
      'gather',
      'craft',
      'equip',
      'guard',
      'strike',
      'hunt',
      'aim',
      'shoot-once',
      'release-shot',
      'practice-shot',
      'coaching',
      'harvest',
      'cook',
      'fish',
      'tend-fire',
      'handover',
      'outing',
      'eat',
      'status-effect',
      'replenish',
      'inspect-inventory',
      'inspect-activities',
      'cancel',
      'resume-work',
      'recover',
      'respawn',
      'treat-scar',
      'teach',
      'learn-record',
    ]),
    encounterPreference: z
      .object({
        operation: z.enum(['speak', 'stop']),
        reference: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict()
      .optional(),
    constructionPlan: constructionPlanSchema.optional(),
    gateUse: gateUsePlanSchema.optional(),
    boundaryImpact: boundaryImpactPlanSchema.optional(),
    hearthPlan: hearthPlanSchema.optional(),
    workBatch: workBatchRequestSchema.optional(),
    workBatchDigest: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    bay: z.number().int().nonnegative().optional(),
    purpose: z.string().trim().min(1).max(120).optional(),
    activityFamilyId: id.optional(),
    activityArguments: z
      .record(id, z.union([z.string().min(1).max(120), z.number().finite(), z.boolean()]))
      .refine((value) => Object.keys(value).length <= 16)
      .optional(),
    methodId: id.optional(),
    bindings: z
      .record(
        id,
        z.union([
          z.string().min(1).max(1500),
          z
            .object({
              x: z.number().finite(),
              y: z.number().finite(),
              z: z.number().finite(),
              surfaceId: id,
            })
            .strict(),
        ]),
      )
      .refine((value) => Object.keys(value).length <= ACTIVITY_LIMITS.nodes)
      .optional(),
    resume: z.boolean().optional(),
    historyAfter: z.number().int().min(-1).optional(),
    methodAfter: z.number().int().min(0).max(ACTIVITY_LIMITS.acquisitions).optional(),
    after: id.optional(),
    containerId: id.optional(),
    expectedScope: z.string().max(16000).optional(),
    text: z.string().trim().min(1).max(1500).optional(),
    volume: z.enum(SPEECH_VOLUMES).optional(),
    facing: z.number().finite().optional(),
    aimId: id.optional(),
    autoEquip: z.boolean().optional(),
    effectOperation: z.enum(['activate', 'deactivate']).optional(),
    fireOperation: z.enum(['light', 'fuel', 'extinguish']).optional(),
    coachingOperation: z.enum(['request', 'accept', 'decline', 'withdraw', 'feedback']).optional(),
    episodeId: id.optional(),
    contributionPermissionId: z.string().optional(),
    handoverOperation: z
      .enum(['offer', 'counter', 'accept', 'decline', 'withdraw', 'withdraw-use'])
      .optional(),
    constructionUse: z
      .custom<import('@open-legend/domain').ConstructionContributionTerms>(validContributionTerms)
      .optional(),
    opponentId: id.optional(),
    compactKind: z.enum(['alliance', 'ceasefire']).optional(),
    compactId: id.optional(),
    outingOperation: z
      .enum([
        'compact-propose',
        'compact-revise',
        'compact-accept',
        'compact-decline',
        'compact-withdraw',
        'compact-leave',
        'help',
        'invite',
        'propose',
        'work',
        'revise',
        'withdraw',
        'conclude',
        'accept',
        'decline',
        'leave',
      ])
      .optional(),
    cooperationKind: z.enum(['guide', 'help', 'hunt']).optional(),
    quarryId: id.optional(),
    cooperationTask: z
      .discriminatedUnion('kind', [
        z
          .object({
            kind: z.literal('prepare'),
            recipeId: id,
            outputPort: id,
            quantity: z.number().int().positive().safe(),
          })
          .strict(),
        z
          .object({
            kind: z.literal('carry'),
            offerId: id,
            offerRevision: z.number().int().positive().safe(),
            destinationId: id,
          })
          .strict(),
        z.object({ kind: z.literal('construction'), plan: constructionPlanSchema }).strict(),
      ])
      .optional(),
    cooperation: z
      .object({ id: z.string().min(1), revision: z.number().int().positive() })
      .strict()
      .optional(),
    amendmentRevision: z.number().int().positive().optional(),
    outingId: id.optional(),
    outingMode: z.enum(['enqueue', 'replace', 'interrupt']).optional(),
    destinationId: id.optional(),
    offerId: id.optional(),
    expectedOfferRevision: z.number().int().nonnegative().safe().optional(),
    requestedItem: z
      .object({
        itemId: id,
        quantity: z.number().int().positive().safe(),
        expectedRevision: z.number().int().nonnegative().safe().optional(),
        placementRevision: z.number().int().nonnegative().safe().optional(),
        expectedContentsRevision: z.number().int().nonnegative().safe().optional(),
      })
      .strict()
      .optional(),
    inventoryGroup: z.string().min(1).max(4096).optional(),
    targetId: id.optional(),
    definitionId: id.optional(),
    distance: z.number().finite().positive().optional(),
    completeFollow: z.literal(true).optional(),
    followUntil: z.number().finite().nonnegative().optional(),
    attemptId: id.optional(),
    scarId: id.optional(),
    lethalReviewId: id.optional(),
    itemId: id.optional(),
    recipeId: id.optional(),
    recordPin: z
      .object({ id, version: z.number().int().positive(), digest: z.string().min(1).max(128) })
      .strict()
      .optional(),
    attributeId: id.optional(),
    ammunitionId: id.optional(),
    position: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        surfaceId: id,
      })
      .strict()
      .optional(),
    knownPlace: knownPlaceReference.optional(),
    expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    expectedActionId: id.optional(),
    planId: id.optional(),
    placementRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    expectedContentsRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    targetRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
    tools: z.record(id, id).refine(validManufactureTools).optional(),
    preparationId: id.optional(),
    preparationVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    preparationDigest: z.string().min(1).max(128).optional(),
    inputs: z
      .record(z.string().refine(isMaterialInputRole), id)
      .refine((value) => JSON.stringify(value).length <= ACTIVITY_LIMITS.recordBytes)
      .optional(),
  })
  .strict();
export const requestIdSchema = id;
