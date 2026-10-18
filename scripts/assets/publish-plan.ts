import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  assetRepositoryRoot,
  readAssetManifestText,
} from '../../apps/server/src/asset-configuration.js';
import { prepareAssetManifest } from '../../apps/server/src/asset-publication.js';
import { assertAssetManifest } from '@open-legend/assets';
import type { AssetDomain } from '../../apps/server/src/asset-repository.js';

async function invoke(args: string[]): Promise<unknown> {
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      '--env-file-if-exists=.env',
      join(assetRepositoryRoot, 'scripts/assets.ts'),
      ...args,
    ],
    { cwd: assetRepositoryRoot, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const finished = once(child, 'close');
  void finished.catch(() => undefined);
  let text = '';
  for await (const bytes of child.stdout) {
    text += String(bytes);
    if (Buffer.byteLength(text) > 4 * 1024 * 1024) {
      child.kill();
      throw new Error('Publication receipt exceeded its allowance.');
    }
  }
  const [code] = await finished;
  if (code !== 0)
    throw new Error('A publication-plan operation failed; rerun the same frozen plan to resume.');
  return JSON.parse(text) as unknown;
}

/** Sequential bounded orchestration. Every child still uses the sole publication
 * and independently protected rights owners; a plan is no alternative catalog. */
export async function publishAssetPlan(options: {
  planPath: string;
  sourcesPath: string;
  directory: string;
  destination: AssetDomain;
  uses: string;
  evidence: string;
  configPath?: string;
  publicReviewed: boolean;
}): Promise<{ publications: number; directory: string }> {
  const plan = JSON.parse(
    await readAssetManifestText(resolve(options.planPath), 4 * 1024 * 1024),
  ) as {
    publishOrder: string[];
    parts?: { manifestPath: string; hostingPath?: string }[];
  };
  if (
    !Array.isArray(plan.publishOrder) ||
    !plan.publishOrder.length ||
    plan.publishOrder.length > 100 ||
    plan.publishOrder.some((path) => typeof path !== 'string')
  )
    throw new Error('Invalid bounded publication plan.');
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const common = [
    '--boundary',
    options.destination.boundary,
    '--domain',
    options.destination.accessDomain,
    ...(options.configPath ? ['--config', options.configPath] : []),
  ];
  for (const path of plan.publishOrder) {
    const manifest: unknown = JSON.parse(
      await readAssetManifestText(resolve(path), 4 * 1024 * 1024),
    );
    assertAssetManifest(manifest);
    const prepared = prepareAssetManifest(manifest, options.destination);
    const shared = ['--manifest', path, ...common];
    await invoke(['initialize', ...shared]);
    await invoke(['approve', ...shared, '--use', options.uses, '--evidence', options.evidence]);
    const hosting = plan.parts?.find(
      (part) => resolve(part.manifestPath) === resolve(path),
    )?.hostingPath;
    const receipt = await invoke([
      'publish',
      ...shared,
      '--operation',
      'publish-' + prepared.reference.manifestSha256.slice(0, 48),
      '--sources',
      options.sourcesPath,
      ...(hosting ? ['--hosting', hosting] : []),
      ...(options.publicReviewed ? ['--public-reviewed'] : []),
    ]);
    const receiptPath = join(options.directory, prepared.reference.manifestSha256 + '.json');
    const text = JSON.stringify(receipt, null, 2) + '\n';
    try {
      await writeFile(receiptPath, text, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
        (await readFile(receiptPath, 'utf8')) !== text
      )
        throw error;
    }
    console.error(
      JSON.stringify({
        published: manifest.identity.assetId,
        revision: prepared.reference.manifestSha256,
      }),
    );
  }
  return { publications: plan.publishOrder.length, directory: options.directory };
}
