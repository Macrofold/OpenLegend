import { writeFile } from 'node:fs/promises';
import {
  readAssetConfiguration,
  type AssetConfiguration,
} from '../../apps/server/src/asset-configuration.js';
import { assetInfrastructureOutputs } from './infrastructure.js';

/** Deployment mapping is derived once from the verified stack, rather than
 * maintaining duplicate limits and unrelated bucket/role settings per environment. */
export async function writeAssetEnvironment(options: {
  configuration: AssetConfiguration;
  environment: 'production' | 'development';
  output: string;
}) {
  const { outputs } = await assetInfrastructureOutputs();
  const development = options.environment === 'development';
  const selected = configurationFromAssetStack(options.configuration, outputs, options.environment);
  const bucket = selected.buckets.runtime!;
  // Configuration files contain deployment addresses only; credentials remain
  // in the named AWS session. Never overwrite an existing operator configuration.
  await writeFile(options.output, JSON.stringify(selected, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  await readAssetConfiguration(options.output);
  return {
    environment: options.environment,
    configuration: options.output,
    bucket,
    runtimeBaseUrl: 'https://assets.openlegend.ai' + (development ? '/development' : ''),
  };
}

function requiredOutput(outputs: Record<string, string>, key: string): string {
  const value = outputs[key];
  if (!value) throw new Error('Asset infrastructure is missing output ' + key);
  return value;
}

/** A development checkout explicitly uses nonproduction delivery. These pure
 * mappings never change credentials, files or the approved spend/cache limits. */
export function configurationFromAssetStack(
  previous: AssetConfiguration,
  outputs: Record<string, string>,
  environment: 'development' | 'production',
): AssetConfiguration {
  return {
    ...previous,
    runtimeEnvironment: environment,
    roleArns: {
      authoring: requiredOutput(outputs, 'AuthoringRoleArn'),
      publication: requiredOutput(outputs, 'PublicationRoleArn'),
      runtime: requiredOutput(
        outputs,
        environment === 'production' ? 'RuntimeReadRoleArn' : 'NonproductionReadRoleArn',
      ),
      study: requiredOutput(outputs, 'StudyReadRoleArn'),
      'recovery-writer': requiredOutput(outputs, 'RecoveryWriterRoleArn'),
      'recovery-restore': requiredOutput(outputs, 'RecoveryRestoreRoleArn'),
      withdrawal: requiredOutput(outputs, 'WithdrawalRoleArn'),
    },
    buckets: {
      'art-library': requiredOutput(outputs, 'LibraryBucket'),
      'art-studies': requiredOutput(outputs, 'StudiesBucket'),
      runtime: requiredOutput(
        outputs,
        environment === 'production' ? 'ExternalRuntimeBucket' : 'NonproductionRuntimeBucket',
      ),
      intake: requiredOutput(outputs, 'IntakeBucket'),
      'asset-recovery': requiredOutput(outputs, 'RecoveryBucket'),
    },
  };
}
