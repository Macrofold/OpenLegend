import { open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ARTIFACT_BOUNDARIES, assertAssetIndex, type AssetIndex } from '@open-legend/assets';

export const assetRepositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const ASSET_STORAGE_PURPOSES = [
  'authoring',
  'publication',
  'runtime',
  'study',
  'recovery-writer',
  'recovery-restore',
  'withdrawal',
] as const;
export type AssetStoragePurpose = (typeof ASSET_STORAGE_PURPOSES)[number];
const schema = z
  .object({
    profile: z.string().min(1),
    accountId: z.string().regex(/^\d{12}$/),
    region: z.string().min(1),
    runtimeEnvironment: z.enum(['production', 'development']).optional(),
    buckets: z.partialRecord(
      z.enum(ARTIFACT_BOUNDARIES),
      z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    ),
    roleArns: z
      .partialRecord(
        z.enum(ASSET_STORAGE_PURPOSES),
        z.string().regex(/^arn:aws:iam::\d{12}:role\/[A-Za-z0-9_+=,.@/-]+$/),
      )
      .optional(),
    maxObjectBytes: positive,
    transferTimeoutMs: positive.optional(),
    cache: z.object({
      root: z.string().min(1).optional(),
      maxBytes: positive,
      maxEntries: positive,
      maxConcurrent: positive,
    }),
    publication: z.object({
      maxRevisions: positive,
      maxFiles: positive,
      maxBytes: positive,
      maxDepth: positive,
      maxManifestBytes: positive,
    }),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [purpose, arn] of Object.entries(value.roleArns ?? {})) {
      if (arn && !arn.startsWith(`arn:aws:iam::${value.accountId}:role/`))
        context.addIssue({
          code: 'custom',
          path: ['roleArns', purpose],
          message: 'Asset roles must belong to the selected AWS project.',
        });
    }
  });
export type AssetConfiguration = z.infer<typeof schema>;
export async function readAssetRetentionLimits() {
  return z
    .object({
      maxRetainedBytes: positive,
      maxRetainedFiles: positive,
      maxPublicationOperations: positive,
    })
    .strict()
    .parse(await smallJson(join(assetRepositoryRoot, 'assets/operating-envelope.json'), 4096));
}
async function smallText(path: string, limit: number): Promise<string> {
  const file = await open(path, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit)
      throw new Error(`Asset metadata exceeds its byte allowance: ${path}`);
    // Read through the same descriptor under the same byte limit. A file growing
    // after stat must not turn a bounded configuration read into an allocation.
    const parts: Buffer[] = [];
    let size = 0;
    for (;;) {
      const buffer = Buffer.allocUnsafe(Math.min(65536, limit + 1 - size));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      size += bytesRead;
      if (size > limit) throw new Error(`Asset metadata exceeds its byte allowance: ${path}`);
      parts.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(parts, size).toString('utf8');
  } finally {
    await file.close();
  }
}
async function smallJson(path: string, limit: number): Promise<unknown> {
  return JSON.parse(await smallText(path, limit)) as unknown;
}
export async function readAssetConfiguration(
  path = process.env['OPEN_LEGEND_ASSET_CONFIG'] ?? join(assetRepositoryRoot, 'assets/config.json'),
): Promise<AssetConfiguration> {
  return schema.parse(await smallJson(resolve(path), 128 * 1024));
}
export async function readAssetIndex(
  path = join(assetRepositoryRoot, 'assets/locks/development.json'),
): Promise<AssetIndex> {
  const value = await smallJson(resolve(path), 4 * 1024 * 1024);
  assertAssetIndex(value);
  return value;
}
export function assetCacheRoot(configuration: AssetConfiguration): string {
  if (configuration.cache.root) return resolve(configuration.cache.root);
  const base =
    process.platform === 'darwin'
      ? join(homedir(), 'Library/Caches')
      : (process.env['XDG_CACHE_HOME'] ?? join(homedir(), '.cache'));
  return join(base, 'OpenLegend/assets', configuration.accountId);
}
/** Byte-exact metadata read for publication; callers retain the original serialization. */
export async function readAssetManifestText(path: string, maxBytes: number): Promise<string> {
  const text = await smallText(path, maxBytes);
  JSON.parse(text);
  return text;
}
