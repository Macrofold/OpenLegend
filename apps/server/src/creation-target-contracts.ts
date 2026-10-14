import { z } from 'zod';
import {
  isSafeRecordId,
  selectedCreationProfileForCandidate,
  type WorldCreationCandidate,
} from '@open-legend/domain';
import { capabilitySchema } from './authority.js';

const id = z.string().min(1).max(100).refine(isSafeRecordId);
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const generation = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const intakeKey = z.string().regex(/^[A-Za-z0-9._~-]{32,512}$/);
const address = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    );
  }, 'Creation addresses require a root HTTPS or loopback HTTP address without credentials.');

export const creationProfileSchema = z
  .object({ id, revision: generation, description: z.string().trim().min(1).max(1000) })
  .strict();
export type CreationProfile = z.infer<typeof creationProfileSchema>;

/** Operator-held transport/account policy. None of this schema accepts browser authority. */
export const configuredCreationTargetSchema = z
  .object({
    id,
    label: z.string().trim().min(1).max(128),
    intakeUrl: address,
    entryUrl: address,
    intakeKey,
    allowedCreatorAccountIds: z.array(id).min(1).max(256),
    profile: creationProfileSchema,
  })
  .strict();
export type ConfiguredCreationTarget = z.infer<typeof configuredCreationTargetSchema>;

const initialAccountSchema = z
  .object({
    issuer: z.string().url(),
    subject: z.string().min(1).max(512),
    accountId: id,
    capabilities: z.array(capabilitySchema).min(1).max(6),
  })
  .strict()
  .refine(
    (account) => account.capabilities.includes('play'),
    'The initial account must permit play.',
  );
export const creationDestinationSchema = z
  .object({
    id,
    label: z.string().trim().min(1).max(128),
    entryUrl: address,
    profile: creationProfileSchema,
    sources: z
      .array(z.object({ installationId: id, intakeKey }).strict())
      .min(1)
      .max(256),
    creators: z
      .array(
        z
          .object({ sourceInstallationId: id, creatorAccountId: id, account: initialAccountSchema })
          .strict(),
      )
      .min(1)
      .max(256),
  })
  .strict()
  .superRefine((target, context) => {
    const sources = new Set(target.sources.map((source) => source.installationId));
    const serviceKeys = new Set(target.sources.map((source) => source.intakeKey));
    const creators = new Set(
      target.creators.map((creator) =>
        JSON.stringify([creator.sourceInstallationId, creator.creatorAccountId]),
      ),
    );
    if (
      sources.size !== target.sources.length ||
      serviceKeys.size !== target.sources.length ||
      creators.size !== target.creators.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Creation source and creator mappings must be unique.',
      });
    if (target.creators.some((creator) => !sources.has(creator.sourceInstallationId)))
      context.addIssue({
        code: 'custom',
        message: 'Every creation account mapping needs a configured source.',
      });
  });
export type CreationDestinationConfig = z.infer<typeof creationDestinationSchema>;

const candidateSchema = z.unknown().transform((value, context): WorldCreationCandidate => {
  try {
    if (Buffer.byteLength(JSON.stringify(value) ?? '') > 24000)
      throw new Error('Candidate exceeds the existing authoring UTF-8 byte allowance.');
    return selectedCreationProfileForCandidate(value).candidate;
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid opening candidate.',
    });
    return z.NEVER;
  }
});

const source = { sourceInstallationId: id, creatorAccountId: id, targetId: id };
export const creationCheckRequestSchema = z
  .object({
    ...source,
    candidate: candidateSchema.optional(),
    candidateDigest: fingerprint.optional(),
  })
  .strict()
  .refine(
    (request) => (request.candidate === undefined) === (request.candidateDigest === undefined),
    'Candidate and its exact digest must be supplied together.',
  );
export type CreationCheckRequest = z.infer<typeof creationCheckRequestSchema>;

const activationIdentity = {
  ...source,
  operationId: id,
  approvalId: id,
  targetGeneration: generation,
  targetProfileDigest: fingerprint,
  candidateDigest: fingerprint,
  compiledWorldDigest: fingerprint,
};
export const creationReceiptRequestSchema = z.object(activationIdentity).strict();
export type CreationReceiptRequest = z.infer<typeof creationReceiptRequestSchema>;
export const creationActivationRequestSchema = z
  .object({
    ...activationIdentity,
    expiresAt: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    candidate: candidateSchema,
  })
  .strict();
export type CreationActivationRequest = z.infer<typeof creationActivationRequestSchema>;

export const creationRegistrationSchema = z
  .object({
    targetId: id,
    generation,
    configurationDigest: fingerprint,
    profileDigest: fingerprint,
  })
  .strict();
export type CreationRegistration = z.infer<typeof creationRegistrationSchema>;

export const creationActivationReceiptSchema = z
  .object({
    ...activationIdentity,
    worldId: id,
    controlAccountId: id,
    creatorAccountIdAtDestination: id,
    entryUrl: address,
    committedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type CreationActivationReceipt = z.infer<typeof creationActivationReceiptSchema>;

export const creationCheckResultSchema = z
  .object({
    targetId: id,
    targetGeneration: generation,
    targetProfileDigest: fingerprint,
    label: z.string().min(1).max(128),
    entryUrl: address,
    profile: creationProfileSchema,
    controlAccountId: id,
    creatorAccountIdAtDestination: id,
    controlCapabilities: z.array(capabilitySchema).max(6),
    operatingConfiguration: z.record(
      z.string().min(1).max(100),
      z.union([z.string().max(1000), z.number().finite(), z.boolean()]),
    ),
    status: z.enum(['ready', 'occupied', 'blocked']),
    message: z.string().min(1).max(2000),
    compiledWorldDigest: fingerprint.optional(),
    findings: z.array(z.string().max(2000)).max(256),
  })
  .strict();
export type CreationCheckResult = z.infer<typeof creationCheckResultSchema>;

export const creationHostStatusSchema = z.discriminatedUnion('status', [
  z
    .object({ status: z.literal('awaiting-creation'), message: z.string().min(1).max(2000) })
    .strict(),
  z
    .object({
      status: z.literal('host-unavailable'),
      worldId: id,
      message: z.string().min(1).max(2000),
    })
    .strict(),
  z
    .object({ status: z.literal('ready'), worldId: id, message: z.string().min(1).max(2000) })
    .strict(),
]);
export type CreationHostStatus = z.infer<typeof creationHostStatusSchema>;
export const creationActivationResultSchema = z
  .object({ receipt: creationActivationReceiptSchema.nullable(), host: creationHostStatusSchema })
  .strict()
  .superRefine((result, context) => {
    if (
      result.receipt === null
        ? result.host.status !== 'awaiting-creation'
        : result.host.status === 'awaiting-creation' ||
          result.host.worldId !== result.receipt.worldId
    )
      context.addIssue({
        code: 'custom',
        message: 'Host availability must describe the exact committed world.',
      });
  });
export type CreationActivationResult = z.infer<typeof creationActivationResultSchema>;

export const CREATION_TARGET_TABLES = [
  'creation_target_registration',
  'creation_activation_receipts',
] as const;
