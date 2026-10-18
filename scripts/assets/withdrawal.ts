import { toolRemote as execute, toolSequence, toolDelay, remoteErrorMatches } from '../network.js';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AssetRevisionReference, ArtifactReference } from '@open-legend/assets';
import type { AssetConfiguration } from '../../apps/server/src/asset-configuration.js';
import { S3AssetStorage, withAssetStorageOperation } from '../../apps/server/src/asset-storage.js';
import {
  assetPhysicalKey,
  type AssetControlledRemovalPlan,
  type AssetPrincipal,
  type AssetRepository,
} from '../../apps/server/src/asset-repository.js';
import { assetInfrastructureOutputs } from './infrastructure.js';
import { mutateAssetAuthority } from './authority-workflows.js';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Exact controlled views of an origin. A new distribution must be registered in
 * the deployment owner before a withdrawal can claim its caches were purged. */
export function controlledInvalidations(
  plan: AssetControlledRemovalPlan,
  outputs: Record<string, string>,
): Map<string, string[]> {
  const groups = new Map<string, Set<string>>();
  for (const location of plan.files) {
    const targets: {
      bucket: string | undefined;
      distribution: string | undefined;
      prefix: string;
    }[] = [
      {
        bucket: outputs['RuntimeBucket'],
        distribution: outputs['RuntimeDistributionId'],
        prefix: '',
      },
      {
        bucket: outputs['NonproductionRuntimeBucket'],
        distribution: outputs['NonproductionDistributionId'],
        prefix: '',
      },
      {
        bucket: outputs['NonproductionRuntimeBucket'],
        distribution: outputs['ExternalDistributionId'],
        prefix: '/development',
      },
      {
        bucket: outputs['ExternalRuntimeBucket'],
        distribution: outputs['ExternalDistributionId'],
        prefix: '',
      },
      {
        bucket: outputs['StudiesBucket'],
        distribution: outputs['StudyDistributionId'],
        prefix: '',
      },
      {
        bucket: outputs['StudiesBucket'],
        distribution: outputs['ExternalDistributionId'],
        prefix: '/studies',
      },
    ].filter((target) => target.bucket === location.bucket);
    if (!targets.length || targets.some((target) => !target.distribution))
      throw new Error(
        'A recorded public origin lacks a known controlled CDN mapping; its withdrawal remains pending.',
      );
    for (const target of targets) {
      let paths = groups.get(target.distribution!);
      if (!paths) {
        paths = new Set();
        groups.set(target.distribution!, paths);
      }
      paths.add(target.prefix + '/' + location.key.split('/').map(encodeURIComponent).join('/'));
    }
  }
  return new Map([...groups].map(([distribution, paths]) => [distribution, [...paths].sort()]));
}
async function cloudfront(
  configuration: AssetConfiguration,
  args: string[],
): Promise<{ Invalidation?: { Id?: string; Status?: string } }> {
  const result = await execute(
    join(homedir(), '.local/bin/aws'),
    [
      'cloudfront',
      ...args,
      '--profile',
      configuration.profile,
      '--region',
      configuration.region,
      '--output',
      'json',
      '--no-cli-pager',
      '--cli-connect-timeout',
      '10',
      '--cli-read-timeout',
      '60',
    ],
    { maxBuffer: 2 * 1024 * 1024, env: { ...process.env, AWS_MAX_ATTEMPTS: '1' } },
  );
  return JSON.parse(result.stdout) as { Invalidation?: { Id?: string; Status?: string } };
}
async function purge(
  configuration: AssetConfiguration,
  plan: AssetControlledRemovalPlan,
  groups: Map<string, string[]>,
  directory: string,
  progress?: (value: unknown) => void,
): Promise<{ completed: true; receipt: string }> {
  const outcomes: {
    distributionId: string;
    invalidationId: string;
    pathsSha256: string;
    completed: true;
  }[] = [];
  for (const [distributionId, paths] of groups)
    for (let start = 0; start < paths.length; start += 1000) {
      const batch = paths.slice(start, start + 1000),
        pathsSha256 = digest(batch);
      const file = join(directory, `invalidation-${digest([distributionId, batch])}.json`);
      await writeFile(
        file,
        JSON.stringify({
          Paths: { Quantity: batch.length, Items: batch },
          CallerReference: 'openlegend-withdraw-' + digest([plan.id, distributionId, batch]),
        }),
        { flag: 'wx', mode: 0o600 },
      );
      const created = await cloudfront(configuration, [
        'create-invalidation',
        '--distribution-id',
        distributionId,
        '--invalidation-batch',
        'file://' + file,
      ]);
      const invalidationId = created.Invalidation?.Id;
      if (!invalidationId)
        throw new Error('Controlled CDN did not return an invalidation identity.');
      let status = created.Invalidation?.Status;
      for (let attempt = 0; status !== 'Completed' && attempt < 90; attempt++) {
        if (attempt === 0)
          progress?.({
            phase: 'cache-removal',
            distributionId,
            invalidationId,
            paths: batch.length,
          });
        await toolDelay(2000);
        status = (
          await cloudfront(configuration, [
            'get-invalidation',
            '--distribution-id',
            distributionId,
            '--id',
            invalidationId,
          ])
        ).Invalidation?.Status;
      }
      if (status !== 'Completed')
        throw new Error(
          'Controlled CDN removal is still pending; origin outcomes and the publication fence were retained for retry.',
        );
      outcomes.push({ distributionId, invalidationId, pathsSha256, completed: true });
    }
  return { completed: true, receipt: JSON.stringify(outcomes) };
}
export async function withdrawAssetRevision(options: {
  repository: AssetRepository;
  configuration: AssetConfiguration;
  sourceConfigurations: AssetConfiguration[];
  principal: AssetPrincipal;
  authorityDomain: string;
  operationId: string;
  reference: AssetRevisionReference;
  reason: string;
  prohibited?: ArtifactReference[];
  progress?: (value: unknown) => void;
}) {
  return toolSequence(1800000, (operation) =>
    withAssetStorageOperation(operation, async () => {
      const change = <T>(phase: string, details: unknown, mutation: () => Promise<T>) =>
        mutateAssetAuthority(
          {
            repository: options.repository,
            configuration: options.configuration,
            principal: options.principal,
            domain: options.authorityDomain,
            operationId: 'withdraw-' + digest([options.operationId, phase]).slice(0, 40),
            change: { phase, operationId: options.operationId, ...(details as object) },
            bootstrap: false,
            operation,
          },
          mutation,
        );
      const affected = await change(
        'logical',
        {
          reference: options.reference,
          reason: options.reason,
          prohibited: options.prohibited ?? [],
        },
        () =>
          options.prohibited
            ? options.repository.prohibitArtifacts(
                options.principal,
                options.prohibited,
                options.reason,
              )
            : options.repository.withdraw(options.principal, options.reference, options.reason),
      );
      // Logical denial commits first. Failure to prepare or purge a physical copy must
      // never roll that denial back or make an old page selected again.
      await change('plan', { references: affected }, async () => {
        const plan = await options.repository.planControlledRemoval(
          options.principal,
          options.operationId,
          affected,
        );
        return { id: plan.id, generation: plan.generation };
      });
      operation.throwIfStopped();
      const plan = await options.repository.controlledRemoval(
        options.principal,
        options.operationId,
      );
      if (plan.status === 'complete')
        return change('complete', { plan: plan.id }, async () => ({
          id: plan.id,
          status: plan.status,
          removed: plan.files.length,
          preservedShared: plan.keptShared.length,
        }));
      const configurations = [options.configuration, ...options.sourceConfigurations];
      const adapters = new Map<string, S3AssetStorage>();
      const directory = await mkdtemp(join(tmpdir(), 'openlegend-asset-withdrawal-'));
      try {
        const { outputs } = await assetInfrastructureOutputs();
        const groups = controlledInvalidations(plan, outputs);
        for (const location of plan.files) {
          const configuration = configurations.find(
            (configuration) =>
              configuration.accountId === location.accountId &&
              configuration.region === location.region &&
              configuration.buckets[location.reference.boundary] === location.bucket,
          );
          if (!configuration)
            throw new Error(
              'No trusted deployment configuration covers a recorded removal location.',
            );
          const key = digest([
            configuration.accountId,
            configuration.region,
            configuration.buckets,
          ]);
          if (!adapters.has(key)) {
            const adapter = new S3AssetStorage(configuration, 'withdrawal');
            // Own it before identity discovery, which can reject or expire.
            adapters.set(key, adapter);
            if ((await adapter.principal()) !== options.principal.accountId) {
              throw new Error('Withdrawal storage identity differs from admitted operator.');
            }
          }
        }
        operation.throwIfStopped();
        const prior = await options.repository.controlledRemovalReceipts(
          options.principal,
          plan.id,
        );
        const removed = new Set(prior.map((receipt) => assetPhysicalKey(receipt, receipt.key)));
        let count = removed.size;
        for (const location of plan.files) {
          if (removed.has(assetPhysicalKey(location, location.key))) continue;
          operation.throwIfStopped();
          await options.repository.assertControlledRemovalLocation(
            options.principal,
            plan.id,
            location,
          );
          const configuration = configurations.find(
            (configuration) =>
              configuration.accountId === location.accountId &&
              configuration.region === location.region &&
              configuration.buckets[location.reference.boundary] === location.bucket,
          )!;
          const adapter = adapters.get(
            digest([configuration.accountId, configuration.region, configuration.buckets]),
          )!;
          const receipt = await adapter.removeCurrent(location.reference, location.key);
          operation.throwIfStopped();
          await options.repository.recordControlledRemoval(options.principal, plan.id, receipt);
          count++;
          options.progress?.({
            phase: 'origin-removal',
            completed: count,
            total: plan.files.length,
          });
        }
        const cache = await purge(options.configuration, plan, groups, directory, options.progress);
        const result = await change('complete', { plan: plan.id }, async () => {
          const receipts = await options.repository.controlledRemovalReceipts(
            options.principal,
            plan.id,
          );
          operation.throwIfStopped();
          const completed = await options.repository.completeControlledRemoval(
            options.principal,
            plan.id,
            receipts,
            cache,
          );
          return {
            id: completed.id,
            status: completed.status,
            removed: completed.files.length,
            preservedShared: completed.keptShared.length,
          };
        });
        return result;
      } finally {
        for (const adapter of adapters.values()) adapter.close();
        await rm(directory, { recursive: true, force: true });
      }
    }),
  );
}
