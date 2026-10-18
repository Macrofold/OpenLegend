import { toolRemote, toolSequence } from '../network.js';
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
  const result = await toolRemote(
    process.execPath,
    [
      '--import',
      'tsx',
      '--env-file-if-exists=.env',
      join(assetRepositoryRoot, 'scripts/assets.ts'),
      ...args,
    ],
    { cwd: assetRepositoryRoot, timeoutMs: 300_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const text = result.stdout;
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
  return toolSequence(1800000, async () => {
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
  });
}
