import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  rmdir,
  statfs,
} from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import {
  artifactReferenceKey,
  assertAssetIndex,
  sameArtifact,
  sameAssetRevision,
  type ArtifactReference,
  type AssetIndex,
} from '@open-legend/assets';
import { readAssetManifestText } from '../../apps/server/src/asset-configuration.js';
import { externalAssetPath } from '../../apps/server/src/asset-directories.js';
import type { AssetResolver } from '../../apps/server/src/asset-runtime.js';
import { hashAssetFile } from '../../apps/server/src/asset-storage.js';

/** Read the exact bounded index and resolve the separate private mount path
 * before the operator opens a reader or prepares file bytes.
 */
export async function readRuntimeMountInput(release: string, requestedOutput: string) {
  const directory = await realpath(release);
  const indexPath = join(directory, 'assets.json');
  const browser = join(directory, 'browser');
  const publicDirectory = await realpath(browser).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return browser;
    throw error;
  });
  const output = await externalAssetPath(requestedOutput);
  const within = (path: string, parent: string) =>
    path === parent || path.startsWith(parent.endsWith(sep) ? parent : parent + sep);
  if (within(output, publicDirectory) || within(publicDirectory, output))
    throw new Error('The runtime asset mount must be separate from the public browser build.');
  const manifest: unknown = JSON.parse(
    await readAssetManifestText(join(directory, 'manifest.json'), 64 * 1024),
  );
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('assetsSha256' in manifest) ||
    typeof manifest.assetsSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(manifest.assetsSha256) ||
    !('assetMaxObjectBytes' in manifest) ||
    typeof manifest.assetMaxObjectBytes !== 'number' ||
    !Number.isSafeInteger(manifest.assetMaxObjectBytes) ||
    manifest.assetMaxObjectBytes < 1
  )
    throw new Error('The Rust release has an invalid runtime asset pin.');
  const text = await readAssetManifestText(indexPath, 4 * 1024 * 1024);
  const actual = await hashAssetFile(indexPath);
  if (
    actual.sha256 !== manifest.assetsSha256 ||
    createHash('sha256').update(text).digest('hex') !== actual.sha256 ||
    actual.bytes !== Buffer.byteLength(text)
  )
    throw new Error('The runtime asset index does not match the Rust release pin.');
  const index: unknown = JSON.parse(text);
  assertAssetIndex(index);
  return { indexPath, index, output, maximumObjectBytes: manifest.assetMaxObjectBytes };
}

type Authorize = (reference?: ArtifactReference) => Promise<void>;

/** Copy and hash each distinct object while its verified cache file is pinned.
 * The mount is separate from the reusable cache and contains read-only copies.
 * Nothing under its Rust-visible path is published until the whole selection
 * fits and the existing exact release authority has been checked again.
 * docs/asset-workflow.md#prepare-the-rust-runtime-asset-mount
 */
export async function prepareRuntimeMount(input: {
  index: AssetIndex;
  maximumObjectBytes: number;
  maximumBytes: number;
  maximumFiles: number;
  output: string;
  resolver: AssetResolver;
  authorize?: Authorize;
}) {
  const { index, resolver, authorize, output } = input;
  if (!sameAssetRevision(resolver.release, index.release))
    throw new Error('The file resolver selected a different asset release.');
  const selected = Object.entries(index.files);
  // Rust loads at most 20,000 members from its 4 MiB release index.
  if (selected.length > Math.min(20_000, input.maximumFiles))
    throw new Error('The runtime mount exceeds the selected release file allowance.');
  const unique = new Map<string, [string, ArtifactReference]>();
  let bytes = 0;
  for (const [path, reference] of selected) {
    if (reference.boundary !== 'runtime' || reference.bytes > input.maximumObjectBytes)
      throw new Error('The Rust release includes a file outside its runtime asset allowance.');
    if (!sameArtifact(reference, resolver.reference(path)))
      throw new Error('The file resolver selected different exact asset bytes.');
    const key = artifactReferenceKey(reference);
    const previous = unique.get(key);
    if (previous) {
      if (!sameArtifact(previous[1], reference))
        throw new Error('The selected release has conflicting descriptions of the same file.');
      continue;
    }
    bytes += reference.bytes;
    if (!Number.isSafeInteger(bytes) || bytes > input.maximumBytes)
      throw new Error('The runtime mount exceeds the selected release byte allowance.');
    unique.set(key, [path, reference]);
  }
  const parent = dirname(output);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const disk = await statfs(parent, { bigint: true });
  if (BigInt(bytes) > disk.bavail * disk.bsize)
    throw new Error('The runtime mount exceeds available disk space.');

  // A new destination cannot reuse partial or stale files. Keep private
  // staging beside it so publishing the runtime subtree is one local rename.
  await mkdir(output, { mode: 0o700 });
  let staging: string | undefined;
  try {
    staging = await mkdtemp(join(parent, '.openlegend-runtime-assets-'));
    for (const [path, reference] of unique.values()) {
      await authorize?.(reference);
      const file = await resolver(path);
      try {
        if (!sameArtifact(reference, file.reference))
          throw new Error('The acquired asset does not match the exact runtime reference.');
        const directory = join(staging, reference.accessDomain);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const target = join(directory, reference.sha256);
        await copyFile(file.path, target, constants.COPYFILE_EXCL);
        const observed = await hashAssetFile(target);
        if (observed.sha256 !== reference.sha256 || observed.bytes !== reference.bytes)
          throw new Error('A staged runtime asset failed exact byte verification.');
        await chmod(target, 0o444);
        await authorize?.(reference);
      } finally {
        await file.release();
      }
    }
    if ((await realpath(output)) !== output)
      throw new Error('The runtime mount destination changed during preparation.');
    // Exact-file authorization also checks the complete release closure in
    // the current grant generation, including assets staged earlier.
    await authorize?.(unique.values().next().value?.[1]);
    await rename(staging, join(output, 'runtime'));
  } catch (error) {
    try {
      if (staging) await rm(staging, { recursive: true, force: true });
    } finally {
      // Remove only the empty directory created above. It cannot contain
      // anything belonging to a previous mount or a different operator.
      await rmdir(output);
    }
    throw error;
  }
  return { output, files: unique.size, bytes };
}
