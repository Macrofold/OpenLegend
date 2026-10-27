import { toolRemote as execute, toolSequence, toolDelay, remoteErrorMatches } from '../network.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { assetInfrastructureOutputs, type AssetInfrastructureOptions } from './infrastructure.js';

const awsExecutable = join(homedir(), '.local/bin/aws');
const privateStudyPrefix = '/restricted/curated-private/';

export interface AssetStudyLoginOptions extends AssetInfrastructureOptions {
  /** Exact retained page on the isolated tooling distribution. */
  page: string;
  /** Exact named-page/current-SQL admission, retained across ticket issuance. */
  authorize: () => Promise<void>;
}
export interface AssetStudyLogin {
  /** A 60-second credential. Never persist, log or use this as a citation. */
  entryUrl: string;
  expiresAt: number;
  studyHost: string;
  page: string;
}

/** Issue through authenticated direct Lambda Invoke. The public HTTP exchange
 * cannot mint credentials. Temporary files are owner-only and always removed. */
export async function createAssetStudyLogin(
  options: AssetStudyLoginOptions,
): Promise<AssetStudyLogin> {
  return toolSequence(300000, async () => {
    const { outputs } = await assetInfrastructureOutputs(options);
    const host = outputs['StudyDistributionDomain'];
    const functionName = outputs['StudyAccessFunctionName'];
    if (!host || !/^[a-z0-9]+\.cloudfront\.net$/.test(host) || !functionName)
      throw new Error('The project study portal has not been provisioned.');
    if (
      !options.page.startsWith(privateStudyPrefix) ||
      /[\\?#\u0000-\u0020\u007f]/.test(options.page)
    )
      throw new Error('Choose an exact retained private study page under ' + privateStudyPrefix);
    const decoded = decodeURIComponent(options.page);
    if (
      /[\\?#\u0000-\u0020\u007f]/.test(decoded) ||
      decoded.split('/').some((part) => part === '.' || part === '..')
    )
      throw new Error('Unsafe study page.');
    await options.authorize();
    const temporary = await mkdtemp(join(tmpdir(), 'openlegend-study-login-'));
    try {
      const input = join(temporary, 'invocation.json');
      const output = join(temporary, 'receipt.json');
      await writeFile(
        input,
        JSON.stringify({ operation: 'issue', viewerHost: host, destination: options.page }),
        { mode: 0o600 },
      );
      const result = await execute(
        awsExecutable,
        [
          'lambda',
          'invoke',
          '--function-name',
          functionName,
          '--invocation-type',
          'RequestResponse',
          '--log-type',
          'None',
          '--payload',
          'fileb://' + input,
          '--profile',
          'openlegend',
          '--region',
          'us-east-2',
          '--output',
          'json',
          '--no-cli-pager',
          '--cli-connect-timeout',
          '10',
          '--cli-read-timeout',
          '60',
          output,
        ],
        {
          maxBuffer: 128 * 1024,
          env: { ...process.env, AWS_MAX_ATTEMPTS: '1' },
        },
      );
      const status: unknown = JSON.parse(result.stdout);
      if (
        typeof status !== 'object' ||
        status === null ||
        !('StatusCode' in status) ||
        status.StatusCode !== 200 ||
        'FunctionError' in status
      )
        throw new Error('The operator access issuer failed. No alternate access was enabled.');
      const value: unknown = JSON.parse(await readFile(output, 'utf8'));
      if (
        typeof value !== 'object' ||
        value === null ||
        !('entryUrl' in value) ||
        typeof value.entryUrl !== 'string' ||
        !('expiresAt' in value) ||
        typeof value.expiresAt !== 'number' ||
        !Number.isSafeInteger(value.expiresAt)
      )
        throw new Error('The operator access issuer returned no valid login receipt.');
      const entry = new URL(value.entryUrl);
      if (
        entry.origin !== 'https://' + host ||
        entry.pathname !== '/access' ||
        entry.hash ||
        entry.username ||
        entry.password ||
        !entry.searchParams.has('ticket') ||
        [...entry.searchParams.keys()].some((key) => key !== 'ticket')
      )
        throw new Error('The access issuer returned an unexpected destination.');
      await options.authorize();
      return {
        entryUrl: entry.href,
        expiresAt: value.expiresAt,
        studyHost: host,
        page: options.page,
      };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
}

/** Open the credential internally; callers receive only a durable page URL and
 * expiry. Nothing logs a bearer ticket, signed cookie or private signing key. */
export async function openAssetStudy(options: AssetStudyLoginOptions) {
  return toolSequence(300000, async () => {
    const result = await createAssetStudyLogin(options);
    try {
      if (process.platform === 'darwin') await execute('/usr/bin/open', [result.entryUrl]);
      else if (process.platform === 'win32')
        await execute('rundll32', ['url.dll,FileProtocolHandler', result.entryUrl]);
      else await execute('xdg-open', [result.entryUrl]);
    } catch {
      // execFile's default error embeds all arguments, including the credential.
      throw new Error(
        'The study login was created, but this machine could not open a browser. Run the asset login command on an interactive desktop.',
      );
    }
    return { url: 'https://' + result.studyHost + result.page, expiresAt: result.expiresAt };
  });
}
