import { assetTemplateWire, parseAssetTemplate } from './template.js';
import { toolRemote as execute, toolSequence, toolDelay, remoteErrorMatches } from '../network.js';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const projectAccount = '027677879749';
const projectRegion = 'us-east-2';
const profile = 'openlegend';
const cli = join(homedir(), '.local/bin/aws');
const templatePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../infrastructure/assets/template.json',
);

export interface AssetInfrastructureOptions {
  stackName?: string;
  resourcePrefix?: string;
  signerSecretArn?: string;
  publicKeyPath?: string;
  allowedConsumerOrigins?: string[];
  cookieSeconds?: number;
  progress?: (message: string) => void;
}
interface Stack {
  StackName: string;
  StackStatus: string;
  Outputs?: { OutputKey: string; OutputValue: string }[];
}
interface ChangeSet {
  ChangeSetId: string;
  StackName: string;
  Status: string;
  ExecutionStatus: string;
  StatusReason?: string;
  Changes?: {
    ResourceChange?: {
      Action: string;
      LogicalResourceId: string;
      ResourceType: string;
      Replacement?: string;
      [key: string]: unknown;
    };
  }[];
}
interface LogDelivery {
  id: string;
  deliverySourceName: string;
  deliveryDestinationArn: string;
  recordFields?: string[];
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => JSON.stringify(key) + ':' + canonical(entry))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

async function aws<T>(service: string, args: string[], region = projectRegion): Promise<T> {
  const result = await execute(
    cli,
    [
      service,
      ...args,
      '--profile',
      profile,
      '--region',
      region,
      '--output',
      'json',
      '--no-cli-pager',
      '--cli-connect-timeout',
      '10',
      '--cli-read-timeout',
      '60',
    ],
    {
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '1' },
    },
  );
  return (result.stdout.trim() ? JSON.parse(result.stdout) : undefined) as T;
}
async function verifiedProject(): Promise<void> {
  const identity = await aws<{ Account: string }>('sts', ['get-caller-identity']);
  if (identity.Account !== projectAccount)
    throw new Error(
      'The openlegend profile is not authenticated to the selected OpenLegend AWS project.',
    );
}
function selectedStack(options: AssetInfrastructureOptions): string {
  const value = options.stackName ?? 'openlegend-assets';
  if (!/^[A-Za-z][A-Za-z0-9-]{2,63}$/.test(value)) throw new Error('Invalid asset stack name.');
  return value;
}
async function stackByName(name: string): Promise<Stack | undefined> {
  try {
    const result = await aws<{ Stacks: Stack[] }>('cloudformation', [
      'describe-stacks',
      '--stack-name',
      name,
    ]);
    return result.Stacks[0];
  } catch (error) {
    if (remoteErrorMatches(error, /Stack with id .+ does not exist/)) return;
    throw error;
  }
}
function assertSafeChanges(change: ChangeSet): void {
  for (const entry of change.Changes ?? []) {
    const resource = entry.ResourceChange;
    if (
      resource?.Action === 'Remove' ||
      (resource?.Replacement && resource.Replacement !== 'False')
    )
      throw new Error(
        'This change set removes or may replace ' +
          resource.LogicalResourceId +
          '; no deletion/replacement is authorized by the asset provisioning command.',
      );
  }
}
async function preparedTemplate() {
  const value: unknown = JSON.parse(await readFile(templatePath, 'utf8'));
  const compact = assetTemplateWire(value);
  if (Buffer.byteLength(compact) > 51200)
    throw new Error(
      'The asset template exceeds the inline CloudFormation limit. Review and reduce it before planning.',
    );
  return { value, compact, sha256: digest(value) };
}

/** Create an unexecuted change set. The caller reviews the actual changes and
 * passes both its immutable ID and template digest to the separate apply step. */
export async function planAssetInfrastructure(options: AssetInfrastructureOptions = {}) {
  return toolSequence(1800000, async () => {
    await verifiedProject();
    const name = selectedStack(options);
    const found = await stackByName(name);
    const existing = found?.StackStatus === 'REVIEW_IN_PROGRESS' ? undefined : found;
    const template = await preparedTemplate();
    const parameters: {
      ParameterKey: string;
      ParameterValue?: string;
      UsePreviousValue?: boolean;
    }[] = [];
    const put = (key: string, value?: string) => {
      if (value !== undefined) parameters.push({ ParameterKey: key, ParameterValue: value });
      else if (existing) parameters.push({ ParameterKey: key, UsePreviousValue: true });
    };
    if (!existing && (!options.signerSecretArn || !options.publicKeyPath))
      throw new Error(
        'First provisioning requires the approved signing-secret ARN and matching PUBLIC key file.',
      );
    if (
      options.signerSecretArn &&
      !options.signerSecretArn.startsWith(
        'arn:aws:secretsmanager:' + projectRegion + ':' + projectAccount + ':secret:',
      )
    )
      throw new Error('The signing secret must belong to the selected project and Region.');
    const publicKey = options.publicKeyPath
      ? await readFile(options.publicKeyPath, 'utf8')
      : undefined;
    if (
      publicKey &&
      (!publicKey.includes('-----BEGIN PUBLIC KEY-----') || /PRIVATE KEY/.test(publicKey))
    )
      throw new Error('Provide the RSA2048 public key only.');
    const origins = options.allowedConsumerOrigins?.map((value) => {
      const url = new URL(value);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.origin !== value ||
        url.username ||
        url.password
      )
        throw new Error('Consumer origins must be exact credential-free HTTP(S) origins.');
      return value;
    });
    put('ResourcePrefix', options.resourcePrefix);
    put('SignerSecretArn', options.signerSecretArn);
    put('SignerPublicKeyPem', publicKey);
    put('AllowedConsumerOrigins', origins?.join(','));
    put('CookieSeconds', options.cookieSeconds?.toString());
    const temporary = await mkdtemp(join(tmpdir(), 'openlegend-asset-infrastructure-'));
    try {
      const bodyPath = join(temporary, 'template.yaml');
      const parametersPath = join(temporary, 'parameters.json');
      await writeFile(bodyPath, template.compact, { mode: 0o600 });
      await writeFile(parametersPath, JSON.stringify(parameters), { mode: 0o600 });
      await aws('cloudformation', ['validate-template', '--template-body', 'file://' + bodyPath]);
      const changeName = 'assets-' + randomUUID();
      options.progress?.('Asset change-set identity: ' + name + '/' + changeName);
      const change = await aws<{ Id: string }>('cloudformation', [
        'create-change-set',
        '--stack-name',
        name,
        '--change-set-name',
        changeName,
        '--change-set-type',
        existing ? 'UPDATE' : 'CREATE',
        '--template-body',
        'file://' + bodyPath,
        '--parameters',
        'file://' + parametersPath,
        '--capabilities',
        'CAPABILITY_IAM',
        '--description',
        'Reviewed asset template sha256 ' + template.sha256,
      ]);
      let current: ChangeSet;
      let previous = '';
      const deadline = Date.now() + 5 * 60_000;
      for (;;) {
        current = await aws<ChangeSet>('cloudformation', [
          'describe-change-set',
          '--change-set-name',
          change.Id,
          '--include-property-values',
        ]);
        if (current.Status !== previous) options.progress?.('Asset change set: ' + current.Status);
        previous = current.Status;
        if (!['CREATE_PENDING', 'CREATE_IN_PROGRESS'].includes(current.Status)) break;
        if (Date.now() >= deadline)
          throw new Error(
            'Change-set preparation is still running; inspect the returned stack before another plan.',
          );
        await toolDelay(5000);
      }
      if (
        current.Status === 'FAILED' &&
        /didn.t contain changes|No updates are to be performed/i.test(current.StatusReason ?? '')
      )
        return {
          noChanges: true,
          stackName: name,
          templateSha256: template.sha256,
          changeSet: current,
        };
      if (current.Status !== 'CREATE_COMPLETE')
        throw new Error(
          'Asset change-set validation failed: ' + (current.StatusReason ?? current.Status),
        );
      assertSafeChanges(current);
      return {
        noChanges: false,
        stackName: name,
        templateSha256: template.sha256,
        changeSet: current,
      };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
}

export async function assetInfrastructureOutputs(options: AssetInfrastructureOptions = {}) {
  return toolSequence(1800000, async () => {
    await verifiedProject();
    const stack = await stackByName(selectedStack(options));
    if (!stack) throw new Error('The asset stack has not been created.');
    return {
      stackName: stack.StackName,
      status: stack.StackStatus,
      outputs: Object.fromEntries(
        (stack.Outputs ?? []).map((entry) => [entry.OutputKey, entry.OutputValue]),
      ),
    };
  });
}

export async function applyAssetInfrastructure(
  changeSetId: string,
  expectedTemplateSha256: string,
  options: AssetInfrastructureOptions = {},
) {
  return toolSequence(1800000, async () => {
    await verifiedProject();
    const change = await aws<ChangeSet>('cloudformation', [
      'describe-change-set',
      '--change-set-name',
      changeSetId,
      '--include-property-values',
    ]);
    if (
      change.StackName !== selectedStack(options) ||
      change.Status !== 'CREATE_COMPLETE' ||
      change.ExecutionStatus !== 'AVAILABLE'
    )
      throw new Error('The selected asset change set is not available for this stack.');
    assertSafeChanges(change);
    const original = await aws<{ TemplateBody: unknown }>('cloudformation', [
      'get-template',
      '--change-set-name',
      changeSetId,
      '--template-stage',
      'Original',
    ]);
    const body =
      typeof original.TemplateBody === 'string'
        ? parseAssetTemplate(original.TemplateBody)
        : original.TemplateBody;
    if (
      !/^[a-f0-9]{64}$/.test(expectedTemplateSha256) ||
      digest(body) !== expectedTemplateSha256 ||
      (await preparedTemplate()).sha256 !== expectedTemplateSha256
    )
      throw new Error(
        'The planned, deployed and current template contents do not match the reviewed digest.',
      );
    const initial = await stackByName(change.StackName);
    const creating = initial?.StackStatus === 'REVIEW_IN_PROGRESS';
    await aws('cloudformation', ['execute-change-set', '--change-set-name', changeSetId]);
    for (;;) {
      const execution = await aws<ChangeSet>('cloudformation', [
        'describe-change-set',
        '--change-set-name',
        changeSetId,
      ]);
      const current = await stackByName(change.StackName);
      if (
        execution.ExecutionStatus === 'EXECUTE_COMPLETE' &&
        current?.StackStatus === (creating ? 'CREATE_COMPLETE' : 'UPDATE_COMPLETE')
      )
        break;
      if (
        execution.ExecutionStatus === 'EXECUTE_FAILED' ||
        /FAILED|ROLLBACK/.test(current?.StackStatus ?? '')
      )
        throw new Error(
          'The original asset change set did not complete. Inspect its existing stack and change-set identity before further changes.',
        );
      await toolDelay(5000);
    }
    const result = await assetInfrastructureOutputs(options);
    const logging = await configureAssetInfrastructureLogging(options);
    return { ...result, logging };
  });
}

/** CloudFront logging's control API requires us-east-1. Its retained S3
 * destination remains in the selected project Region; this creates no other
 * regional workload, Lambda, S3 bucket or replication destination. */
export async function configureAssetInfrastructureLogging(
  options: AssetInfrastructureOptions = {},
) {
  return toolSequence(1800000, async () => {
    const { outputs } = await assetInfrastructureOutputs(options);
    const prefix = options.resourcePrefix ?? 'openlegend-assets';
    if (!/^[a-z][a-z0-9-]{2,31}$/.test(prefix)) throw new Error('Invalid logging resource prefix.');
    const bucket = outputs['LogsBucket'];
    if (!bucket) throw new Error('The created log bucket is absent from stack outputs.');
    const recordFields = [
      'date',
      'time',
      'x-edge-location',
      'sc-bytes',
      'c-ip',
      'cs-method',
      'cs(Host)',
      'cs-uri-stem',
      'sc-status',
    ];
    const destination = await aws<{ deliveryDestination: { arn: string } }>(
      'logs',
      [
        'put-delivery-destination',
        '--name',
        prefix + '-cdn',
        '--delivery-destination-configuration',
        'destinationResourceArn=arn:aws:s3:::' + bucket + '/cloudfront',
        '--output-format',
        'json',
      ],
      'us-east-1',
    );
    const existing: LogDelivery[] = [];
    let token: string | undefined;
    do {
      const page = await aws<{ deliveries: typeof existing; nextToken?: string }>(
        'logs',
        [
          'describe-deliveries',
          '--limit',
          '50',
          '--no-paginate',
          ...(token ? ['--next-token', token] : []),
        ],
        'us-east-1',
      );
      existing.push(...page.deliveries);
      token = page.nextToken;
      if (token && existing.length >= 1000)
        throw new Error('Log-delivery inventory exceeds the admitted provisioning envelope.');
    } while (token);
    const deliveries: { name: string; id: string }[] = [];
    for (const kind of ['RuntimeDistribution', 'NonproductionDistribution', 'StudyDistribution']) {
      const id = outputs[kind + 'Id'];
      if (!id) throw new Error('A required distribution is absent from stack outputs.');
      const name = prefix + '-' + kind.replace('Distribution', '').toLowerCase();
      await aws(
        'logs',
        [
          'put-delivery-source',
          '--name',
          name,
          '--resource-arn',
          'arn:aws:cloudfront::' + projectAccount + ':distribution/' + id,
          '--log-type',
          'ACCESS_LOGS',
        ],
        'us-east-1',
      );
      const prior = existing.find(
        (entry) =>
          entry.deliverySourceName === name &&
          entry.deliveryDestinationArn === destination.deliveryDestination.arn,
      );
      if (prior) {
        // Reusing a source/destination pair does not prove that credential-bearing
        // query/cookie/referrer fields were omitted by its earlier configuration.
        const current = await aws<{ delivery: LogDelivery }>(
          'logs',
          ['get-delivery', '--id', prior.id],
          'us-east-1',
        );
        const fields = current.delivery.recordFields;
        if (
          current.delivery.id !== prior.id ||
          current.delivery.deliverySourceName !== name ||
          current.delivery.deliveryDestinationArn !== destination.deliveryDestination.arn ||
          !Array.isArray(fields) ||
          fields.length !== recordFields.length ||
          fields.some((field, index) => field !== recordFields[index])
        )
          throw new Error(
            `Log delivery ${prior.id} does not match the reviewed minimal field selection. Inspect and explicitly reconcile its fields before retrying; no credential-omission result can be reported.`,
          );
        deliveries.push({ name, id: prior.id });
      } else {
        const created = await aws<{ delivery: { id: string } }>(
          'logs',
          [
            'create-delivery',
            '--delivery-source-name',
            name,
            '--delivery-destination-arn',
            destination.deliveryDestination.arn,
            '--record-fields',
            ...recordFields,
            '--s3-delivery-configuration',
            JSON.stringify({ suffixPath: '/{DistributionId}/{yyyy}/{MM}/{dd}' }),
          ],
          'us-east-1',
        );
        deliveries.push({ name, id: created.delivery.id });
      }
    }
    return {
      controlRegion: 'us-east-1',
      destinationBucket: bucket,
      deliveries,
      omittedCredentialFields: ['cs-uri-query', 'cs(Cookie)', 'cs(Referer)'],
    };
  });
}

export interface AssetAlarmOptions extends AssetInfrastructureOptions {
  /** Per-bucket retained-byte alarm; an alarm never deletes retained files. */
  storageBytes?: number;
  notificationTopicArn?: string;
}

/** Daily storage metrics are an operating warning, not an enforced spending
 * ceiling. Immediate per-operation byte/concurrency limits remain in admission.
 * No paid WAF, Shield Advanced, detailed S3 metrics or periodic scanner is added. */
export async function planAssetOperationalAlarms(options: AssetAlarmOptions = {}) {
  return toolSequence(1800000, async () => {
    const { outputs } = await assetInfrastructureOutputs(options);
    const prefix = options.resourcePrefix ?? 'openlegend-assets';
    const threshold = options.storageBytes ?? 20 * 1024 ** 3;
    if (
      !/^[a-z][a-z0-9-]{2,31}$/.test(prefix) ||
      !Number.isSafeInteger(threshold) ||
      threshold <= 0
    )
      throw new Error('Invalid asset operating alarm configuration.');
    const topic = options.notificationTopicArn;
    if (topic && !/^arn:aws:sns:us-east-2:027677879749:[A-Za-z0-9_-]+$/.test(topic))
      throw new Error('Alarm delivery must use a named topic in the selected project and Region.');
    const actions = topic ? [topic] : [];
    const alarms: Record<string, unknown>[] = [];
    for (const kind of [
      'LibraryBucket',
      'StudiesBucket',
      'RuntimeBucket',
      'NonproductionRuntimeBucket',
      'IntakeBucket',
      'RecoveryBucket',
      'LogsBucket',
      'ExternalRuntimeBucket',
    ]) {
      const bucket = outputs[kind];
      if (!bucket) throw new Error('A required asset storage boundary is missing from the stack.');
      alarms.push({
        AlarmName: prefix + '-' + kind.replace('Bucket', '').toLowerCase() + '-retained-bytes',
        AlarmDescription:
          'Daily retained storage exceeds the selected asset envelope. Pause optional uploads and review; never automatically delete pinned content.',
        Namespace: 'AWS/S3',
        MetricName: 'BucketSizeBytes',
        Dimensions: [
          { Name: 'BucketName', Value: bucket },
          { Name: 'StorageType', Value: 'StandardStorage' },
        ],
        Period: 86400,
        Statistic: 'Maximum',
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Threshold: threshold,
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'missing',
        ActionsEnabled: !!topic,
        AlarmActions: actions,
        OKActions: actions,
        Tags: [{ Key: 'Project', Value: 'OpenLegend' }],
      });
    }
    const issuer = outputs['StudyAccessFunctionName'];
    if (!issuer) throw new Error('The study access issuer is missing from the stack.');
    alarms.push({
      AlarmName: prefix + '-study-issuer-errors',
      AlarmDescription:
        'Study login issuer failed. Inspect scoped diagnostic logs without logging tickets or keys.',
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      Dimensions: [{ Name: 'FunctionName', Value: issuer }],
      Period: 300,
      Statistic: 'Sum',
      EvaluationPeriods: 1,
      DatapointsToAlarm: 1,
      Threshold: 0,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'notBreaching',
      ActionsEnabled: !!topic,
      AlarmActions: actions,
      Tags: [{ Key: 'Project', Value: 'OpenLegend' }],
    });
    return {
      region: projectRegion,
      alarms,
      notifications:
        topic ?? 'Console alarms only; no external notification destination configured.',
      limits:
        'Daily delayed storage warnings and issuer failure detection; no hard bill cap or unmeasured capacity promise.',
    };
  });
}

export async function configureAssetOperationalAlarms(options: AssetAlarmOptions = {}) {
  return toolSequence(1800000, async () => {
    const plan = await planAssetOperationalAlarms(options);
    const temporary = await mkdtemp(join(tmpdir(), 'openlegend-asset-alarms-'));
    try {
      for (let index = 0; index < plan.alarms.length; index++) {
        const path = join(temporary, String(index) + '.json');
        await writeFile(path, JSON.stringify(plan.alarms[index]), { mode: 0o600 });
        await aws('cloudwatch', ['put-metric-alarm', '--cli-input-json', 'file://' + path]);
      }
      return { ...plan, configured: plan.alarms.length };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      stack: { type: 'string' },
      prefix: { type: 'string' },
      'secret-arn': { type: 'string' },
      'public-key': { type: 'string' },
      origins: { type: 'string' },
      'cookie-seconds': { type: 'string' },
      'change-set': { type: 'string' },
      digest: { type: 'string' },
    },
  });
  const options: AssetInfrastructureOptions = {
    stackName: values.stack,
    resourcePrefix: values.prefix,
    signerSecretArn: values['secret-arn'],
    publicKeyPath: values['public-key'],
    allowedConsumerOrigins: values.origins?.split(','),
    cookieSeconds: values['cookie-seconds'] ? Number(values['cookie-seconds']) : undefined,
    progress: (message) => process.stderr.write(message + '\n'),
  };
  let result: unknown;
  switch (positionals[0]) {
    case 'plan':
      result = await planAssetInfrastructure(options);
      break;
    case 'apply':
      if (!values['change-set'] || !values.digest)
        throw new Error('Apply requires the exact reviewed --change-set and --digest.');
      result = await applyAssetInfrastructure(values['change-set'], values.digest, options);
      break;
    case 'outputs':
      result = await assetInfrastructureOutputs(options);
      break;
    case 'logging':
      result = await configureAssetInfrastructureLogging(options);
      break;
    default:
      throw new Error('Use plan, apply, outputs or logging. No deletion command is provided.');
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  void main().catch((error: unknown) => {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n');
    process.exitCode = 1;
  });
