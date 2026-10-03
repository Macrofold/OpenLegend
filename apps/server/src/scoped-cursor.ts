import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { HistoryCursorError } from './perceived-events.js';

// Internal traversal positions can contain private IDs. A live continuation is opaque,
// authenticated and invalid after restart; the caller separately binds current scope.
const key = randomBytes(32);
export function sealCursor(value: unknown): string {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function openCursor(value: string): unknown {
  try {
    const bytes = Buffer.from(value, 'base64url'),
      decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
    );
  } catch {
    throw new HistoryCursorError('Invalid or expired search page. Refresh the search.');
  }
}
