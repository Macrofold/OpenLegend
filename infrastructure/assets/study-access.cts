import { createPrivateKey, createPublicKey, randomBytes, sign, verify } from 'node:crypto';
import { createSdkOwner } from '@open-legend/network/sdk';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const secrets = new SecretsManagerClient({
  maxAttempts: 1,
  requestHandler: { connectionTimeout: 5000, requestTimeout: 5000 },
});
const secretNetwork = createSdkOwner({ role: 'study-access-secret', capacity: 1 });
let cached;
async function signingKey(context) {
  if (cached && cached.__until >= Date.now()) return cached;
  const remaining = context.getRemainingTimeInMillis() - 1000;
  if (remaining <= 0) throw new Error('The signing-key preparation deadline has expired.');
  return secretNetwork.run({ timeoutMs: Math.min(5000, remaining) }, async (operation) => {
    const result = await operation.wait('credentials', (signal) =>
      secrets.send(new GetSecretValueCommand({ SecretId: process.env.SIGNER_SECRET_ARN }), {
        abortSignal: signal,
      }),
    );
    if (typeof result.SecretString !== 'string' || Buffer.byteLength(result.SecretString) > 1048576)
      throw new Error('The configured signing key is unavailable.');
    const secret = JSON.parse(result.SecretString);
    if (typeof secret.privateKeyPem !== 'string')
      throw new Error('Invalid configured signing key.');
    const privateKey = createPrivateKey(secret.privateKeyPem);
    if (
      privateKey.asymmetricKeyType !== 'rsa' ||
      privateKey.asymmetricKeyDetails.modulusLength !== 2048
    )
      throw new Error('The configured signing key must be RSA2048.');
    operation.throwIfStopped();
    cached = {
      __privateKey: privateKey,
      __publicKey: createPublicKey(privateKey),
      __until: Date.now() + 60000,
    };
    return cached;
  });
}
const prefix = '/restricted/curated-private/';
const validHost = (value) =>
  typeof value === 'string' && /^[a-z0-9]+\.cloudfront\.net$/.test(value);
function safePath(value) {
  if (
    typeof value !== 'string' ||
    value.length > 4096 ||
    !value.startsWith(prefix) ||
    /[\\?#\u0000-\u0020\u007f]/.test(value)
  )
    throw new Error('The destination must be a named private study path.');
  const decoded = decodeURIComponent(value);
  if (
    /[\\?#\u0000-\u0020\u007f]/.test(decoded) ||
    decoded.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error('Unsafe private study path.');
  return value;
}
function cfBase64(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');
}
function unavailable() {
  return {
    statusCode: 403,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    },
    body: 'This study needs a fresh project-operator login. Run the documented asset login command.',
  };
}
exports.handler = async (event, context) => {
  const now = Math.floor(Date.now() / 1000);
  const keys = await signingKey(context);
  if (!event?.requestContext?.http) {
    if (event?.operation !== 'issue' || !validHost(event.viewerHost))
      throw new Error('Unsupported operator request.');
    const destination = safePath(event.destination);
    const expires = now + Number(process.env.COOKIE_SECONDS);
    const payload = Buffer.from(
      JSON.stringify({
        host: event.viewerHost,
        destination,
        issued: now,
        ticketExpires: now + 60,
        cookieExpires: expires,
        nonce: randomBytes(24).toString('hex'),
      }),
    );
    const ticket =
      payload.toString('base64url') +
      '.' +
      sign('RSA-SHA256', payload, keys.__privateKey).toString('base64url');
    return {
      entryUrl: 'https://' + event.viewerHost + '/access?ticket=' + encodeURIComponent(ticket),
      expiresAt: expires,
    };
  }
  try {
    if (event.requestContext.http.method !== 'GET' || event.rawPath !== '/access')
      return unavailable();
    const ticket = event.queryStringParameters?.ticket;
    if (typeof ticket !== 'string' || ticket.length > 8192) return unavailable();
    const parts = ticket.split('.');
    if (parts.length !== 2) return unavailable();
    const payload = Buffer.from(parts[0], 'base64url');
    if (!verify('RSA-SHA256', payload, keys.__publicKey, Buffer.from(parts[1], 'base64url')))
      return unavailable();
    const claim = JSON.parse(payload.toString('utf8'));
    const host = event.headers?.['x-openlegend-viewer-host'];
    if (
      !validHost(host) ||
      host !== claim.host ||
      !Number.isSafeInteger(claim.issued) ||
      claim.issued > now ||
      !Number.isSafeInteger(claim.ticketExpires) ||
      claim.ticketExpires < now ||
      claim.ticketExpires !== claim.issued + 60 ||
      !Number.isSafeInteger(claim.cookieExpires) ||
      claim.cookieExpires !== claim.issued + Number(process.env.COOKIE_SECONDS)
    )
      return unavailable();
    const destination = safePath(claim.destination);
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: 'https://' + host + prefix + '*',
          Condition: { DateLessThan: { 'AWS:EpochTime': claim.cookieExpires } },
        },
      ],
    });
    const values = {
      'CloudFront-Policy': cfBase64(policy),
      'CloudFront-Signature': cfBase64(sign('RSA-SHA256', Buffer.from(policy), keys.__privateKey)),
      'CloudFront-Key-Pair-Id': process.env.PUBLIC_KEY_ID,
      'CloudFront-Hash-Algorithm': 'SHA256',
    };
    return {
      statusCode: 303,
      headers: {
        location: destination,
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      },
      cookies: Object.entries(values).map(
        ([name, value]) =>
          name +
          '=' +
          value +
          '; Path=' +
          prefix +
          '; Max-Age=' +
          (claim.cookieExpires - now) +
          '; Secure; HttpOnly; SameSite=Lax',
      ),
      body: '',
    };
  } catch {
    return unavailable();
  }
};
