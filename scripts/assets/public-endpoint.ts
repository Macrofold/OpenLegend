import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { assetInfrastructureOutputs, type AssetInfrastructureOptions } from './infrastructure.js';

const execute = promisify(execFile);
const account = '027677879749';
const hostname = 'assets.openlegend.ai';
interface Origin {
  Id: string;
  DomainName: string;
  [key: string]: unknown;
}
interface Behavior {
  PathPattern: string;
  TargetOriginId: string;
  [key: string]: unknown;
}
interface DistributionConfiguration {
  Aliases: { Items?: string[]; [key: string]: unknown };
  Origins: { Quantity: number; Items: Origin[] };
  CacheBehaviors?: { Quantity: number; Items?: Behavior[] };
  DefaultCacheBehavior: {
    TargetOriginId: string;
    FunctionAssociations?: { Quantity: number; Items?: FunctionAssociation[] };
    LambdaFunctionAssociations?: { Items?: { EventType: string }[] };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
interface FunctionAssociation {
  EventType: string;
  FunctionARN: string;
}
interface PolicyStatement {
  Sid?: string;
  [key: string]: unknown;
}
interface BucketPolicy {
  Statement: PolicyStatement[];
  [key: string]: unknown;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
async function aws<T>(service: string, args: string[]): Promise<T> {
  const result = await execute(
    join(homedir(), '.local/bin/aws'),
    [
      service,
      ...args,
      '--profile',
      'openlegend',
      '--region',
      'us-east-2',
      '--output',
      'json',
      '--no-cli-pager',
    ],
    {
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, AWS_MAX_ATTEMPTS: '1' },
    },
  );
  return (result.stdout.trim() ? JSON.parse(result.stdout) : undefined) as T;
}
async function bucketPolicy(bucket: string): Promise<BucketPolicy> {
  const result = await aws<{ Policy: string }>('s3api', [
    'get-bucket-policy',
    '--bucket',
    bucket,
    '--expected-bucket-owner',
    account,
  ]);
  return JSON.parse(result.Policy) as BucketPolicy;
}
export interface PublicAssetEndpointPlan {
  hostname: 'assets.openlegend.ai';
  distributionId: string;
  distributionETag: string;
  beforeSha256: string;
  configuration: DistributionConfiguration;
  runtimeBucket: string;
  bucketPolicyBeforeSha256: string;
  bucketPolicy: BucketPolicy;
  configurationChanged: boolean;
  bucketPolicyChanged: boolean;
  changes: string[];
}

function installPublicRoute(
  config: DistributionConfiguration,
  source: DistributionConfiguration,
  route: { prefix: string; originId: string; bucket: string },
  rewrite: string,
): void {
  const behavior = source.CacheBehaviors?.Items?.find(
    (item) => item.PathPattern === 'public/*' || item.PathPattern === '/public/*',
  );
  const origin = source.Origins.Items.find((item) => item.Id === behavior?.TargetOriginId);
  if (!behavior || !origin || origin.DomainName !== route.bucket + '.s3.us-east-2.amazonaws.com')
    throw new Error('The managed public origin no longer matches its selected storage boundary.');
  const priorOrigin = config.Origins.Items.find((item) => item.Id === route.originId);
  if (priorOrigin && priorOrigin.DomainName !== origin.DomainName)
    throw new Error('Another configuration owns the proposed public origin name.');
  const selectedOrigin = { ...origin, Id: route.originId };
  config.Origins.Items = priorOrigin
    ? config.Origins.Items.map((item) => (item.Id === route.originId ? selectedOrigin : item))
    : [...config.Origins.Items, selectedOrigin];
  config.Origins.Quantity = config.Origins.Items.length;
  const pathPattern = '/' + route.prefix + '/public/*';
  const priorBehaviors = config.CacheBehaviors?.Items ?? [];
  if (
    priorBehaviors.some(
      (item) =>
        (item.PathPattern.startsWith('/' + route.prefix + '/') ||
          item.PathPattern.startsWith(route.prefix + '/')) &&
        !(item.PathPattern === pathPattern && item.TargetOriginId === route.originId),
    )
  )
    throw new Error('Another configuration owns this public route; reconcile it before applying.');
  const selectedBehavior = {
    ...behavior,
    PathPattern: pathPattern,
    TargetOriginId: route.originId,
    FunctionAssociations: {
      Quantity: 2,
      Items: [
        { EventType: 'viewer-request', FunctionARN: rewrite },
        { EventType: 'viewer-response', FunctionARN: rewrite },
      ],
    },
  };
  const prior = priorBehaviors.find((item) => item.PathPattern === pathPattern);
  const items = prior
    ? priorBehaviors.map((item) => (item.PathPattern === pathPattern ? selectedBehavior : item))
    : [...priorBehaviors, selectedBehavior];
  config.CacheBehaviors = { Quantity: items.length, Items: items };
}

/** Preserve the independently installed certificate, runtime origin and other
 * CDN settings. Only the named public study/development behaviors and immutable-write rule
 * are proposed. No private library or private-study permission is introduced. */
export async function planPublicAssetEndpoint(
  options: AssetInfrastructureOptions = {},
): Promise<PublicAssetEndpointPlan> {
  const { outputs } = await assetInfrastructureOutputs(options);
  const distributionId = outputs['ExternalDistributionId'];
  const runtimeBucket = outputs['ExternalRuntimeBucket'];
  const rewrite = outputs['StudyPublicPrefixRewriteArn'];
  const studyId = outputs['StudyDistributionId'];
  const developmentId = outputs['NonproductionDistributionId'];
  if (!distributionId || !runtimeBucket || !rewrite || !studyId || !developmentId)
    throw new Error(
      'Apply the reviewed custom-hostname stack integration before planning its public CDN behavior.',
    );
  const existing = await aws<{ ETag: string; DistributionConfig: DistributionConfiguration }>(
    'cloudfront',
    ['get-distribution-config', '--id', distributionId],
  );
  const config = structuredClone(existing.DistributionConfig);
  if (
    !config.Aliases?.Items?.includes(hostname) ||
    !config.Origins?.Items?.some(
      (origin) => origin.DomainName === runtimeBucket + '.s3.us-east-2.amazonaws.com',
    )
  )
    throw new Error(
      'The selected custom CDN no longer has the reviewed hostname and production origin.',
    );
  const runtimeOrigin = config.Origins.Items.find(
    (item) => item.DomainName === runtimeBucket + '.s3.us-east-2.amazonaws.com',
  )!;
  for (const behavior of [config.DefaultCacheBehavior, ...(config.CacheBehaviors?.Items ?? [])]) {
    if (behavior.TargetOriginId !== runtimeOrigin.Id) continue;
    const functions = behavior.FunctionAssociations as
      | { Items?: FunctionAssociation[] }
      | undefined;
    const lambda = behavior.LambdaFunctionAssociations as
      | { Items?: { EventType: string }[] }
      | undefined;
    if (
      functions?.Items?.some(
        (item) => item.EventType === 'viewer-response' && item.FunctionARN !== rewrite,
      ) ||
      lambda?.Items?.some((item) => item.EventType === 'viewer-response')
    )
      throw new Error('Another function owns production response headers; reconcile it first.');
    const items = [
      ...(functions?.Items ?? []).filter((item) => item.EventType !== 'viewer-response'),
      { EventType: 'viewer-response', FunctionARN: rewrite },
    ];
    behavior.FunctionAssociations = { Quantity: items.length, Items: items };
  }
  for (const route of [
    {
      id: studyId,
      prefix: 'studies',
      originId: 'openlegend-study-public',
      bucket: outputs['StudiesBucket'],
    },
    {
      id: developmentId,
      prefix: 'development',
      originId: 'openlegend-development-public',
      bucket: outputs['NonproductionRuntimeBucket'],
    },
  ]) {
    if (!route.bucket) throw new Error('Missing selected public storage boundary.');
    const source = await aws<{ DistributionConfig: DistributionConfiguration }>('cloudfront', [
      'get-distribution-config',
      '--id',
      route.id,
    ]);
    installPublicRoute(
      config,
      source.DistributionConfig,
      { ...route, bucket: route.bucket },
      rewrite,
    );
  }
  // CORS must be applied at the viewer boundary. S3 headers can be cached from
  // another Origin because the independent default cache policy does not vary it.
  // Keep that default intact and own only the explicitly public runtime prefix.
  const publicBehavior = config.CacheBehaviors?.Items?.find(
    (item) => item.PathPattern === '/studies/public/*',
  );
  if (!publicBehavior) throw new Error('Missing managed public delivery policy.');
  const existingPublic = config.CacheBehaviors?.Items?.find(
    (item) => item.PathPattern === '/public/*' || item.PathPattern === 'public/*',
  );
  if (existingPublic && existingPublic.TargetOriginId !== runtimeOrigin.Id)
    throw new Error('Another origin owns the public runtime prefix; reconcile it first.');
  const runtimePublic = {
    ...publicBehavior,
    PathPattern: '/public/*',
    TargetOriginId: runtimeOrigin.Id,
    FunctionAssociations: {
      Quantity: 1,
      Items: [{ EventType: 'viewer-response', FunctionARN: rewrite }],
    },
  };
  const publicItems = existingPublic
    ? config.CacheBehaviors!.Items!.map((item) => (item === existingPublic ? runtimePublic : item))
    : [...(config.CacheBehaviors?.Items ?? []), runtimePublic];
  config.CacheBehaviors = { Quantity: publicItems.length, Items: publicItems };
  const before = await bucketPolicy(runtimeBucket);
  const policy = structuredClone(before);
  const conditional = {
    Sid: 'OpenLegendImmutablePublicAssets',
    Effect: 'Deny',
    Principal: '*',
    Action: 's3:PutObject',
    Resource: 'arn:aws:s3:::' + runtimeBucket + '/public/*',
    Condition: {
      Null: { 's3:if-none-match': 'true' },
      Bool: { 's3:ObjectCreationOperation': 'true' },
    },
  };
  const prior = policy.Statement.find((item) => item.Sid === conditional.Sid);
  if (prior && digest(prior) !== digest(conditional))
    throw new Error('An existing immutable-write rule requires explicit reconciliation.');
  if (!prior) policy.Statement.push(conditional);
  const configurationChanged = digest(config) !== digest(existing.DistributionConfig);
  const bucketPolicyChanged = digest(policy) !== digest(before);
  return {
    hostname,
    distributionId,
    distributionETag: existing.ETag,
    beforeSha256: digest(existing.DistributionConfig),
    configuration: config,
    runtimeBucket,
    bucketPolicyBeforeSha256: digest(before),
    bucketPolicy: policy,
    configurationChanged,
    bucketPolicyChanged,
    changes: [
      ...(configurationChanged
        ? [
            'Serve explicit public runtime/study/development prefixes with managed CORS headers; strip only matching study/development prefixes and retain the independent default behavior.',
            'Canonical HTML/SVG/XML blobs download with a sandbox policy; reviewed named viewers retain inline rendering.',
          ]
        : []),
      ...(bucketPolicyChanged
        ? [
            'Require absent-only writes under production public/*; preserve existing log delivery and read permissions.',
          ]
        : []),
    ],
  };
}

/** CloudFront supplies atomic ETag admission. S3 bucket policies have no CAS API,
 * so compare the complete current policy immediately before its guarded write;
 * callers must avoid concurrent bucket-policy administration during apply. */
export async function applyPublicAssetEndpoint(
  plan: PublicAssetEndpointPlan,
  options: AssetInfrastructureOptions = {},
) {
  const proposed = await planPublicAssetEndpoint(options);
  if (digest(plan) !== digest(proposed))
    throw new Error(
      'The endpoint, stack resources or reviewed plan changed. Review a fresh plan before applying.',
    );
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-public-endpoint-'));
  try {
    const policy = join(directory, 'bucket-policy.json');
    const distribution = join(directory, 'distribution.json');
    await writeFile(policy, JSON.stringify(plan.bucketPolicy), { mode: 0o600 });
    await writeFile(distribution, JSON.stringify(plan.configuration), { mode: 0o600 });
    if (plan.bucketPolicyChanged)
      await aws('s3api', [
        'put-bucket-policy',
        '--bucket',
        plan.runtimeBucket,
        '--expected-bucket-owner',
        account,
        '--policy',
        'file://' + policy,
      ]);
    const result = plan.configurationChanged
      ? await aws<{ ETag: string }>('cloudfront', [
          'update-distribution',
          '--id',
          plan.distributionId,
          '--if-match',
          plan.distributionETag,
          '--distribution-config',
          'file://' + distribution,
        ])
      : { ETag: plan.distributionETag };
    return {
      hostname,
      distributionId: plan.distributionId,
      eTag: result.ETag,
      runtimeBaseUrl: 'https://' + hostname,
      studyBaseUrl: 'https://' + hostname + '/studies',
      developmentBaseUrl: 'https://' + hostname + '/development',
      status: plan.configurationChanged
        ? 'Deployment is asynchronous; qualify the deployed behavior before publishing links.'
        : 'The reviewed endpoint configuration is already current.',
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
