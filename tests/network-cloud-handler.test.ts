import { describe, expect, it } from 'vitest';
import * as crypto from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { studyAccessCode } from '../scripts/generate-study-access.js';
import { assetTemplateWire, parseAssetTemplate } from '../scripts/assets/template.js';

const key = crypto
  .generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' });
const secret = { SecretString: JSON.stringify({ privateKeyPem: key }) };
const request = {
  operation: 'issue',
  viewerHost: 'fixture.cloudfront.net',
  destination: '/restricted/curated-private/fixture/page.html',
};
type Handler = (
  event: unknown,
  context: { getRemainingTimeInMillis(): number },
) => Promise<unknown>;

async function generatedHandler(
  send: (command: unknown, options: { abortSignal: AbortSignal }) => Promise<unknown>,
): Promise<Handler> {
  const module: { exports: unknown } = { exports: {} };
  runInNewContext(await studyAccessCode(), {
    module,
    exports: module.exports,
    require(name: string) {
      if (name === 'node:crypto') return crypto;
      if (name === '@aws-sdk/client-secrets-manager')
        return {
          SecretsManagerClient: class {
            constructor(options: { maxAttempts: number }) {
              expect(options.maxAttempts).toBe(1);
            }
            send = send;
          },
          GetSecretValueCommand: class {
            constructor(readonly input: unknown) {}
          },
        };
      throw new Error('Unexpected generated handler dependency.');
    },
    process: {
      env: {
        COOKIE_SECONDS: '600',
        SIGNER_SECRET_ARN: 'fixture-secret',
        PUBLIC_KEY_ID: 'fixture-key',
      },
    },
    Buffer,
    performance,
    AbortController,
    AbortSignal,
    TextDecoder,
    TextEncoder,
    URL,
    setTimeout,
    clearTimeout,
    fetch: () => {
      throw new Error('External fetch is blocked in this generated-artifact fixture.');
    },
  });
  const value = module.exports;
  if (
    !value ||
    typeof value !== 'object' ||
    !('handler' in value) ||
    typeof value.handler !== 'function'
  )
    throw new Error('Generated artifact has no handler.');
  return value.handler as Handler;
}

describe('the exact generated study-access artifact', () => {
  it('preserves JSON strings under CloudFormation YAML 1.1 scalar rules', () => {
    const shared = { value: 'yes' };
    const value = {
      strings: ['yes', 'on', '012', '12:34:56', '2026-10-18', 'commas, spaces', 'quotes: \'"'],
      flags: [true, false],
      numbers: [0, 12.5],
      reference: { Ref: 'on' },
      substitution: { 'Fn::Sub': 'commas, ${Name}' },
      attribute: { 'Fn::GetAtt': ['Resource', 'Nested.Attribute'] },
      repeated: [shared, shared],
    };
    expect(parseAssetTemplate(assetTemplateWire(value))).toEqual(value);
  });

  it('fits the existing inline allowance and preserves every approved template value', async () => {
    const template = JSON.parse(
      await readFile(new URL('../infrastructure/assets/template.json', import.meta.url), 'utf8'),
    );
    template.Resources.StudyAccess.Properties.Code.ZipFile = await studyAccessCode();
    const wire = assetTemplateWire(template);
    expect(Buffer.byteLength(wire)).toBeLessThanOrEqual(51200);
    expect(parseAssetTemplate(wire)).toEqual(template);
    expect(wire).toContain('!Sub');
    expect(wire).toContain('!GetAtt');
    expect(wire).toContain('!Ref');
  });

  it('issues and verifies an existing signed ticket, sharing a bounded cached key', async () => {
    let calls = 0;
    const handler = await generatedHandler(async (_command, options) => {
      calls++;
      expect(options.abortSignal.aborted).toBe(false);
      return secret;
    });
    const issued = (await handler(request, { getRemainingTimeInMillis: () => 10_000 })) as {
      entryUrl: string;
    };
    const ticket = new URL(issued.entryUrl).searchParams.get('ticket');
    const result = await handler(
      {
        requestContext: { http: { method: 'GET' } },
        rawPath: '/access',
        headers: { 'x-openlegend-viewer-host': request.viewerHost },
        queryStringParameters: { ticket },
      },
      { getRemainingTimeInMillis: () => 10_000 },
    );
    expect(result).toMatchObject({ statusCode: 303, headers: { location: request.destination } });
    expect(calls).toBe(1);
  });

  it('ends ignored SDK waiting, retains capacity and never publishes a late signing key', async () => {
    let release: ((value: typeof secret) => void) | undefined;
    let calls = 0;
    const handler = await generatedHandler(async () => {
      calls++;
      if (calls > 1) return secret;
      return new Promise<typeof secret>((resolve) => {
        release = resolve;
      });
    });
    await expect(handler(request, { getRemainingTimeInMillis: () => 1010 })).rejects.toMatchObject({
      kind: 'deadline_exceeded',
    });
    for (let attempt = 0; attempt < 20; attempt++)
      await expect(
        handler(request, { getRemainingTimeInMillis: () => 10_000 }),
      ).rejects.toMatchObject({ kind: 'capacity_unavailable' });
    expect(calls).toBe(1);
    release?.(secret);
    // Drain the losing SDK fulfillment and its once-only resource accounting.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(await handler(request, { getRemainingTimeInMillis: () => 10_000 })).toHaveProperty(
      'entryUrl',
    );
    expect(calls).toBe(2);
  });

  it('reserves response time and refuses before SDK dispatch when invocation time is exhausted', async () => {
    let calls = 0;
    const handler = await generatedHandler(async () => {
      calls++;
      return secret;
    });
    await expect(handler(request, { getRemainingTimeInMillis: () => 999 })).rejects.toThrow(
      'deadline',
    );
    expect(calls).toBe(0);
  });
});
