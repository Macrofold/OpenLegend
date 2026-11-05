import { createHash } from 'node:crypto';
import { z } from 'zod';

const identity = z.string().min(1).max(240);
const revision = z.string().regex(/^[a-f0-9]{40}$/);
const checksum = z.string().regex(/^[a-f0-9]{64}$/);
const role = z.string().min(1).max(100);
const point = z.union([
  z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      z: z.number().finite(),
      surfaceId: identity.optional(),
    })
    .strict(),
  z.object({ savedPoint: role }).strict(),
]);
const addressing = { actor: role.optional(), target: role.optional() };
const action = {
  query: z.string().max(2000).optional(),
  match: z.record(z.string(), z.json()).optional(),
};
export const nativeStepSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('command'),
      actor: role.optional(),
      command: z.record(z.string(), z.json()),
    })
    .strict(),
  z.object({ kind: z.literal('say'), ...addressing, text: z.string().max(20000) }).strict(),
  z
    .object({ kind: z.literal('contact'), ...addressing, ...action, type: identity.optional() })
    .strict(),
  z
    .object({
      kind: z.literal('attack'),
      ...addressing,
      ...action,
      requireInjury: z.boolean().optional(),
      completeBeforeResponse: z.boolean().optional(),
    })
    .strict(),
  z.object({ kind: z.literal('action'), ...addressing, ...action, type: identity }).strict(),
  z.object({ kind: z.literal('drop'), ...addressing, ...action }).strict(),
  z.object({ kind: z.literal('pickup'), ...addressing, ...action }).strict(),
  z.object({ kind: z.literal('wait'), seconds: z.number().finite().nonnegative() }).strict(),
  z
    .object({
      kind: z.literal('move'),
      ...addressing,
      position: point,
      completion: z.literal('arrived').optional(),
      captureStartAs: role.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('moveAway'),
      ...addressing,
      metres: z.number().finite().positive(),
      completion: z.literal('arrived').optional(),
      captureStartAs: role.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('moveToward'),
      ...addressing,
      metres: z.number().finite().positive(),
      completion: z.literal('arrived').optional(),
      captureStartAs: role.optional(),
    })
    .strict(),
]);
export type NativeStep = z.infer<typeof nativeStepSchema>;

export const episodeSpecSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/),
    scope: z.enum(['primary', 'busy', 'sample']),
    runtimeTarget: z.enum(['lab', 'game']).default('lab'),
    autonomousActorIds: z.array(identity).optional(),
    conditionId: identity,
    sourceRevision: revision,
    historical: z
      .object({ episodeSha256: checksum, executionSourceRevision: revision, cohort: identity })
      .strict()
      .optional(),
    origin: z
      .object({
        path: z.string().min(1).max(2000),
        sha256: checksum,
        savedId: z.string().uuid(),
        actorIds: z.record(role, identity),
        sourceRevision: revision,
        // The immutable native origin owns saved randomness. Null means that its
        // numeric seed is recorded by preparation, never replaced by today's default.
        seed: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    model: z
      .object({
        id: identity,
        model: identity,
        revision: identity,
        effort: z.enum(['none', 'low', 'medium', 'high']).optional(),
        maxOutputTokens: z.number().int().positive().max(8192),
      })
      .strict(),
    judgmentModel: identity,
    judgmentRevision: identity,
    embeddingMode: z.enum(['normal', 'disabled']),
    embeddingModel: identity.optional(),
    embeddingDimensions: z.number().int().positive().optional(),
    directoryOnlyActivities: z
      .array(z.object({ actorId: identity, familyIds: z.array(identity) }).strict())
      .optional(),
    limits: z
      .object({
        simulationSeconds: z.number().finite().positive(),
        maximumCalls: z.number().int().positive(),
        activeWallSeconds: z.number().finite().positive(),
        observationWallSeconds: z.number().finite().positive(),
      })
      .strict(),
    protocol: z
      .object({
        nativeSetup: z.array(nativeStepSchema).max(64).optional(),
        postlude: z
          .object({
            kind: z.literal('accept-observed-native-offer'),
            phase: z.literal('after-primary-capture'),
            actor: role,
            maximumNativeWallSeconds: z.number().finite().positive(),
            inferenceCalls: z.literal(0),
            primaryRecipeUnchanged: z.literal(true),
          })
          .strict()
          .optional(),
        mechanismControl: z
          .object({
            sourceRevision: revision,
            inferenceCalls: z.literal(0),
            proofOfAutonomousInitiation: z.literal(false),
            setupSimulationSeconds: z.number().finite().nonnegative(),
            setupWallSeconds: z.number().finite().nonnegative(),
          })
          .strict()
          .optional(),
        profileEdits: z
          .array(
            z
              .object({
                actor: role,
                expected: z
                  .object({
                    name: z.string(),
                    description: z.string(),
                    personality: z.string(),
                    backstory: z.string(),
                  })
                  .strict(),
                values: z
                  .object({
                    name: z.string().optional(),
                    description: z.string().optional(),
                    personality: z.string().optional(),
                    backstory: z.string().optional(),
                  })
                  .strict(),
              })
              .strict(),
          )
          .optional(),
        prelude: z
          .object({
            kind: z.enum(['requiredIndependentWork', 'requiredCompletedIndependentWork']),
            purpose: z.string().max(2000).optional(),
            partialProgressRequired: z.boolean().optional(),
            actionType: identity.optional(),
            completedEventType: identity.optional(),
          })
          .strict()
          .nullable()
          .optional(),
        opening: nativeStepSchema,
        changes: z.array(nativeStepSchema).max(64),
        nativeActionTypes: z.record(z.string(), identity).optional(),
      })
      .strict(),
    randomization: z
      .object({
        seed: z.number().int().nonnegative(),
        replicate: z.number().int().positive(),
        ordinal: z.number().int().nonnegative(),
        block: identity,
      })
      .strict(),
    outputs: z
      .object({
        result: z.literal('episode.json'),
        exportDirectory: z.literal('runs'),
        admissionTraceBytes: z
          .number()
          .int()
          .nonnegative()
          .max(1024 * 1024)
          .default(0),
      })
      .strict(),
  })
  .strict();
export type EpisodeSpec = z.infer<typeof episodeSpecSchema>;
export const parseEpisodeSpec = (value: unknown): EpisodeSpec => episodeSpecSchema.parse(value);
export const hash = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
export const episodeId = (
  scope: string,
  condition: string,
  model: string,
  replicate: number,
): string => `cog-${hash(JSON.stringify([scope, condition, model, replicate])).slice(0, 32)}`;

export interface MatrixPosition {
  id: string;
  runtimeTarget: 'lab' | 'game';
  scope: string;
  conditionId: string;
  modelId: string;
  replicate: number;
  ordinal: number;
  selected: boolean;
  disposition: 'planned' | 'not-selected' | 'blocked';
  reason?: string;
  episodeSha256?: string;
  originSha256?: string;
  sourceRevision: string;
  model?: { id: string; model: string; revision: string; effort?: string; maxOutputTokens: number };
  seed: number;
  historical?: {
    executionSourceRevision: string;
    originalEpisodeSha256: string;
    rawEpisodeStatus: string;
    cohort: string;
  };
}

/** A comparison may declare the ordinary population; historical focal-only Lab
 * episodes retain their original policy. This never grants game autonomy. */
export const episodeAutonomousActors = (spec: EpisodeSpec): string[] =>
  spec.autonomousActorIds ?? [spec.origin.actorIds['focal']!];
