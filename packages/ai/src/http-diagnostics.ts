import { record } from './validation.js';
import type { AiReceipt } from './types.js';

const safeCount = (value: string | null): number | undefined => {
  if (!value || value.length > 32 || !/^\d+$/.test(value)) return undefined;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : undefined;
};
const safeDelay = (value: number): number | undefined =>
  Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.ceil(value))
    ? Math.ceil(value)
    : undefined;
function resetDelay(value: string | null): number | undefined {
  if (!value || value.length > 128) return undefined;
  const units: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const parts = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)];
  if (!parts.length || parts.map((part) => part[0]).join('') !== value) return undefined;
  return safeDelay(parts.reduce((total, part) => total + Number(part[1]) * units[part[2]!]!, 0));
}
function retryDelay(value: string | null, now: number): number | undefined {
  if (!value || value.length > 128) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(value)) return safeDelay(Number(value) * 1000);
  // Require the HTTP-date form; Date.parse also accepts unrelated numeric strings.
  if (!/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value))
    return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) && new Date(date).toUTCString() === value
    ? safeDelay(Math.max(0, date - now))
    : undefined;
}
/** Scalar evidence only; reading headers neither schedules nor repeats a provider request. */
export function captureResponseRateLimits(
  receipt: AiReceipt,
  headers: Headers,
  now = Date.now(),
): void {
  receipt.retryAfterMs = retryDelay(headers.get('retry-after'), now);
  const rates = {
    remainingRequests: safeCount(headers.get('x-ratelimit-remaining-requests')),
    remainingTokens: safeCount(headers.get('x-ratelimit-remaining-tokens')),
    resetRequestsMs: resetDelay(headers.get('x-ratelimit-reset-requests')),
    resetTokensMs: resetDelay(headers.get('x-ratelimit-reset-tokens')),
  };
  if (Object.values(rates).some((value) => value !== undefined)) receipt.providerRateLimit = rates;
}

/** Retain bounded error identifiers, never raw provider messages.
 * This only observes a failed body; its caller retains outcome and retry policy.
 */
export function captureHttpErrorDiagnostics(raw: string, receipt: AiReceipt): void {
  try {
    if (Buffer.byteLength(raw) > 8192) return;
    const data: unknown = JSON.parse(raw);
    if (!record(data) || !record(data.error)) return;
    const identifier = (value: unknown) =>
      typeof value === 'string' && /^[a-z][a-z0-9_]{0,127}$/.test(value) ? value : undefined;
    receipt.providerErrorCode = identifier(data.error.code);
    receipt.providerErrorType = identifier(data.error.type);
  } catch {
    // Diagnostic parsing cannot replace the already known HTTP refusal.
  }
}
