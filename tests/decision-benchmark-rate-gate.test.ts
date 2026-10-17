import { describe, expect, it } from 'vitest';
import type { AiReceipt } from '../packages/ai/src/index.js';
import { OpenAiRateGate } from '../packages/ai/src/rate-gate.js';

const receipt = (patch: Partial<AiReceipt> = {}): AiReceipt => ({
  requestId: 'observation',
  provider: 'openai',
  requestedModel: 'gpt-6-luna',
  model: 'gpt-6-luna',
  modelVersionStatus: 'reported',
  contextDigest: 'a'.repeat(64),
  startedAt: '2026-10-15T00:00:00Z',
  completedAt: '2026-10-15T00:00:00Z',
  latencyMs: 0,
  dispatched: true,
  completionUncertain: false,
  httpStatus: 200,
  ...patch,
});

describe('shared direct OpenAI benchmark pacing', () => {
  it('restores quota and unknown429 stops when reopening a journal', () => {
    for (const patch of [
      { httpStatus: 429, providerErrorCode: 'insufficient_quota' },
      { httpStatus: 429 },
    ]) {
      const gate = new OpenAiRateGate([receipt(patch)]);
      expect(
        gate.beforeNext(100, Date.parse('2026-10-16T00:00:00Z'), 'new').blockedReason,
      ).toBeTruthy();
    }
  });

  it('restores a temporary wait at its recorded completion clock without restarting it', () => {
    const arrival = Date.parse('2026-10-15T00:00:00Z');
    const history = [
      receipt({ httpStatus: 429, providerErrorCode: 'rate_limit_exceeded', retryAfterMs: 10_000 }),
    ];
    expect(new OpenAiRateGate(history).beforeNext(100, arrival + 4_000, 'new')).toEqual({
      waitMs: 6_000,
    });
    expect(new OpenAiRateGate(history).beforeNext(100, arrival + 11_000, 'new')).toEqual({
      waitMs: 0,
    });
    expect(() => new OpenAiRateGate([receipt({ completedAt: 'invalid' })])).toThrow('timestamp');
  });

  it('allows fresh work before rate evidence exists and does not mix another provider’s limits', () => {
    const gate = new OpenAiRateGate();
    expect(gate.beforeNext(100, 1_000, 'a')).toEqual({ waitMs: 0 });
    gate.observe(
      receipt({
        requestId: 'a',
        provider: 'macrofold',
        httpStatus: 429,
        providerErrorCode: 'insufficient_quota',
        retryAfterMs: 60_000,
      }),
      1_100,
    );
    expect(gate.beforeNext(100, 1_100, 'b')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(100, 1_100, 'a')).toMatchObject({
      blockedReason: 'openai_duplicate_rate_claim',
    });
    gate.observe(receipt({ requestId: 'a' }), 1_200);
    expect(gate.beforeNext(100, 1_200, 'a')).toEqual({ waitMs: 0 });
  });

  it('anchors successful request-reset headers to arrival instead of restarting each wait check', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({ providerRateLimit: { remainingRequests: 0, resetRequestsMs: 5_000 } }),
      1_000,
    );
    expect(gate.beforeNext(100, 1_500, 'next')).toEqual({ waitMs: 4_500 });
    expect(gate.beforeNext(100, 3_000, 'next')).toEqual({ waitMs: 3_000 });
    expect(gate.beforeNext(100, 6_000, 'next')).toEqual({ waitMs: 0 });
  });

  it('claims the last known request synchronously so two workers cannot both consume it', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({ providerRateLimit: { remainingRequests: 1, resetRequestsMs: 10_000 } }),
      0,
    );
    expect(gate.beforeNext(100, 0, 'worker-a')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(100, 0, 'worker-b')).toEqual({ waitMs: 10_000 });
    gate.observe(
      receipt({
        requestId: 'worker-a',
        providerRateLimit: { remainingRequests: 0, resetRequestsMs: 9_000 },
      }),
      1_000,
    );
    expect(gate.beforeNext(100, 1_000, 'worker-b')).toEqual({ waitMs: 9_000 });
    expect(gate.beforeNext(100, 10_000, 'worker-b')).toEqual({ waitMs: 0 });
  });

  it('checks exact token capacity, independent reset clocks and non-claiming wait checks', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({
        providerRateLimit: {
          remainingRequests: 1,
          resetRequestsMs: 1_000,
          remainingTokens: 499,
          resetTokensMs: 5_000,
        },
      }),
      1_000,
    );
    expect(gate.beforeNext(500, 1_000, 'too-large')).toEqual({ waitMs: 5_000 });
    expect(gate.beforeNext(499, 1_000, 'fits')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(1, 1_000, 'future')).toEqual({ waitMs: 5_000 });
    expect(gate.beforeNext(1, 2_000, 'future')).toEqual({ waitMs: 4_000 });
    gate.observe(receipt({ requestId: 'fits' }), 2_100);
    expect(gate.beforeNext(499, 2_100, 'future')).toEqual({ waitMs: 0 });
  });

  it('releases a completed byte reservation rather than charging it as actual token use until reset', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({ providerRateLimit: { remainingTokens: 1_000, resetTokensMs: 10_000 } }),
      0,
    );
    expect(gate.beforeNext(800, 0, 'a')).toEqual({ waitMs: 0 });
    gate.observe(
      receipt({
        requestId: 'a',
        providerRateLimit: { remainingTokens: 900, resetTokensMs: 9_900 },
      }),
      100,
    );
    expect(gate.beforeNext(800, 100, 'b')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(101, 100, 'c')).toEqual({ waitMs: 9_900 });
  });

  it('does not replenish provider capacity from an older, more generous reply arriving last', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({ providerRateLimit: { remainingTokens: 1_000, resetTokensMs: 60_000 } }),
      0,
    );
    expect(gate.beforeNext(400, 0, 'a')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(400, 0, 'b')).toEqual({ waitMs: 0 });
    gate.observe(
      receipt({
        requestId: 'b',
        providerRateLimit: { remainingTokens: 600, resetTokensMs: 59_900 },
      }),
      100,
    );
    expect(gate.beforeNext(201, 100, 'c')).toEqual({ waitMs: 59_900 });
    gate.observe(
      receipt({
        requestId: 'a',
        providerRateLimit: { remainingTokens: 900, resetTokensMs: 59_800 },
      }),
      200,
    );
    expect(gate.beforeNext(601, 200, 'c')).toEqual({ waitMs: 59_800 });
    expect(gate.beforeNext(600, 200, 'c')).toEqual({ waitMs: 0 });
  });

  it('does not prolong an exhausted old window because a new reply reports a larger allowance', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({ providerRateLimit: { remainingRequests: 0, resetRequestsMs: 1_000 } }),
      0,
    );
    gate.observe(
      receipt({ providerRateLimit: { remainingRequests: 1, resetRequestsMs: 60_000 } }),
      100,
    );
    expect(gate.beforeNext(100, 100, 'a')).toEqual({ waitMs: 900 });
    expect(gate.beforeNext(100, 1_000, 'a')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(100, 1_000, 'b')).toEqual({ waitMs: 59_100 });
  });

  it('honors the longest applicable reset and Retry-After minimum without claiming early', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({
        httpStatus: 429,
        providerErrorCode: 'rate_limit_exceeded',
        providerErrorType: 'requests',
        retryAfterMs: 10_000,
        providerRateLimit: {
          remainingRequests: 0,
          resetRequestsMs: 5_000,
          remainingTokens: 0,
          resetTokensMs: 20_000,
        },
      }),
      1_000,
    );
    expect(gate.beforeNext(100, 1_000, 'a')).toEqual({ waitMs: 20_000 });
    expect(gate.beforeNext(100, 20_999, 'a')).toEqual({ waitMs: 1 });
    expect(gate.beforeNext(100, 21_000, 'a')).toEqual({ waitMs: 0 });
  });

  it.each([
    { providerErrorCode: 'rate_limit_exceeded' },
    { providerErrorCode: 'slow_down' },
    { providerErrorType: 'tokens' },
    { providerErrorType: 'requests' },
    { providerErrorCode: 'vendor_specific', providerErrorType: 'tokens' },
  ])('uses one thirty-second fallback only for an explicitly temporary429: %j', (patch) => {
    const gate = new OpenAiRateGate();
    gate.observe(receipt({ httpStatus: 429, ...patch }), 1_000);
    expect(gate.beforeNext(1, 1_000, 'a')).toEqual({ waitMs: 30_000 });
    expect(gate.beforeNext(1, 30_000, 'a')).toEqual({ waitMs: 1_000 });
    expect(gate.beforeNext(1, 31_000, 'a')).toEqual({ waitMs: 0 });
  });

  it('uses sixty seconds for an exhausted successful counter whose reset clock is absent', () => {
    const gate = new OpenAiRateGate();
    gate.observe(receipt({ providerRateLimit: { remainingRequests: 0 } }), 1_000);
    expect(gate.beforeNext(100, 20_000, 'a')).toEqual({ waitMs: 41_000 });
    expect(gate.beforeNext(100, 61_000, 'a')).toEqual({ waitMs: 0 });
  });

  it('honors overload cooldowns and does not shorten an existing provider minimum', () => {
    const gate = new OpenAiRateGate();
    gate.observe(receipt({ httpStatus: 503, retryAfterMs: 10_000 }), 0);
    gate.observe(receipt({ retryAfterMs: 1_000 }), 2_000);
    expect(gate.beforeNext(100, 2_000, 'a')).toEqual({ waitMs: 8_000 });
    expect(gate.beforeNext(100, 10_000, 'a')).toEqual({ waitMs: 0 });
  });

  it.each([
    'insufficient_quota',
    'insufficient_credit',
    'credits_exhausted',
    'billing_hard_limit_reached',
    'project_spend_limit_exceeded',
    'organization_spending_limit_exceeded',
    'budget_exhausted',
  ])('stops all direct arms for permanent %s despite a temporary type or retry header', (code) => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({
        httpStatus: 429,
        providerErrorCode: code,
        providerErrorType: 'tokens',
        retryAfterMs: 1_000,
      }),
      0,
    );
    const blocked = gate.beforeNext(100, 10_000, 'luna-low');
    expect(blocked).toEqual({ waitMs: 0, blockedReason: `openai_permanent_limit:${code}` });
    gate.observe(
      receipt({ providerRateLimit: { remainingRequests: 100, resetRequestsMs: 1 } }),
      20_000,
    );
    expect(gate.beforeNext(100, 20_000, 'luna-high')).toEqual(blocked);
  });

  it('recognizes permanent error types before a temporary error code', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({
        httpStatus: 429,
        providerErrorCode: 'slow_down',
        providerErrorType: 'insufficient_quota',
      }),
      0,
    );
    expect(gate.beforeNext(1, 100_000, 'a')).toMatchObject({
      blockedReason: 'openai_permanent_limit:insufficient_quota',
    });
  });

  it.each([undefined, 'unrecognized_error'])(
    'stops an unclassified429 (%s), even when Retry-After exists',
    (code) => {
      const gate = new OpenAiRateGate();
      gate.observe(receipt({ httpStatus: 429, providerErrorCode: code, retryAfterMs: 60_000 }), 0);
      expect(gate.beforeNext(1, 100_000, 'a')).toEqual({
        waitMs: 0,
        blockedReason: 'openai_unclassified_429',
      });
    },
  );

  it('bounds in-flight identities and releases only their matching reservations', () => {
    const gate = new OpenAiRateGate();
    for (let i = 0; i < 16; i++)
      expect(gate.beforeNext(100, 0, `request-${i}`)).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(100, 0, 'request-16')).toMatchObject({
      blockedReason: 'openai_rate_claim_limit',
    });
    gate.observe(receipt({ requestId: 'unrelated' }), 1);
    expect(gate.beforeNext(100, 1, 'request-16')).toMatchObject({
      blockedReason: 'openai_rate_claim_limit',
    });
    gate.observe(receipt({ requestId: 'request-3' }), 2);
    expect(gate.beforeNext(100, 2, 'request-16')).toEqual({ waitMs: 0 });
  });

  it('compares safe-integer token bounds exactly even when their sum exceeds Number precision', () => {
    const gate = new OpenAiRateGate();
    gate.observe(
      receipt({
        providerRateLimit: { remainingTokens: Number.MAX_SAFE_INTEGER, resetTokensMs: 1_000 },
      }),
      0,
    );
    expect(gate.beforeNext(Number.MAX_SAFE_INTEGER, 0, 'a')).toEqual({ waitMs: 0 });
    expect(gate.beforeNext(1, 0, 'b')).toEqual({ waitMs: 1_000 });
    gate.observe(receipt({ requestId: 'a' }), 1);
    expect(gate.beforeNext(Number.MAX_SAFE_INTEGER, 1, 'b')).toEqual({ waitMs: 0 });
  });

  it('returns the complete safe wait and stops instead of shortening an overflowing deadline', () => {
    const gate = new OpenAiRateGate();
    gate.observe(receipt({ retryAfterMs: Number.MAX_SAFE_INTEGER }), 0);
    expect(gate.beforeNext(1, 0, 'a')).toEqual({ waitMs: Number.MAX_SAFE_INTEGER });
    expect(gate.beforeNext(1, Number.MAX_SAFE_INTEGER - 1, 'a')).toEqual({ waitMs: 1 });
    const overflow = new OpenAiRateGate();
    overflow.observe(receipt({ retryAfterMs: 10 }), Number.MAX_SAFE_INTEGER - 5);
    expect(overflow.beforeNext(1, Number.MAX_SAFE_INTEGER - 5, 'a')).toMatchObject({
      blockedReason: 'openai_rate_limit_clock_overflow',
    });
  });

  it.each([-1, 0.5, NaN, Infinity])('stops invalid timing/counter metadata %s', (value) => {
    const gate = new OpenAiRateGate();
    gate.observe(receipt({ providerRateLimit: { remainingTokens: value } }), 0);
    expect(gate.beforeNext(1, 0, 'a')).toMatchObject({
      blockedReason: 'openai_invalid_rate_metadata',
    });
  });

  it('rejects invalid caller clocks, byte bounds and unbounded identities before claiming', () => {
    const gate = new OpenAiRateGate();
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => gate.beforeNext(value, 0, 'a')).toThrow('safe integers');
      expect(() => gate.beforeNext(1, value, 'a')).toThrow('safe integers');
      expect(() => gate.observe(receipt(), value)).toThrow('safe integer');
    }
    expect(() => gate.beforeNext(1, 0, '')).toThrow('identity');
    expect(() => gate.beforeNext(1, 0, 'x'.repeat(257))).toThrow('identity');
    expect(gate.beforeNext(1, 0, 'valid')).toEqual({ waitMs: 0 });
  });
});
