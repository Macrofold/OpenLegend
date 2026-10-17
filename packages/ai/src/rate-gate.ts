import type { AiReceipt } from './types.js';

export interface RateGateDecision {
  waitMs: number;
  blockedReason?: string;
}

interface Counter {
  remaining: number;
  resetAt: number;
}
interface Allowance extends Counter {
  following?: Counter;
}

const temporaryCodes = new Set(['rate_limit_exceeded', 'slow_down']);
const temporaryTypes = new Set(['tokens', 'requests']);
const permanentLimit = (identifier: string | undefined) =>
  identifier !== undefined &&
  /(?:^|_)(?:quota|credits?|billing|spend|spending|budget)(?:_|$)/.test(identifier);
const safeCount = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** Caller-owned pacing for one direct OpenAI account/model pool.
 * Successful headers are useful evidence too. This gate neither retries a failed task
 * nor guarantees upstream admission: remaining capacity is an observed, conservative
 * estimate, not an authorization. Official header meanings:
 * https://developers.openai.com/api/docs/guides/rate-limits#rate-limits-in-headers
 *
 * beforeNext claims capacity for its exact requestId when it returns waitMs=0
 * without blockedReason; observe releases that claim without treating its byte
 * estimate as tokens actually spent. At most sixteen claims may be in flight.
 * Call it only for a prospective dispatch, never for passive status. Waiting checks
 * do not claim. The caller owns durable spending, task identity, abortable waiting
 * and actual dispatch. The map, scalar deadlines and two windows per counter bound retention;
 * the caller's durable journal, rather than this gate, prevents task resubmission.
 */
export class OpenAiRateGate {
  private retryAt = 0;
  private requests: Allowance | undefined;
  private tokens: Allowance | undefined;
  private blockedReason: string | undefined;
  private readonly claims = new Map<string, number>();
  private claimedTokens = 0n;

  get stopReason(): string | undefined {
    return this.blockedReason;
  }

  constructor(history: readonly AiReceipt[] = []) {
    // Reopening a journal must preserve a quota stop and the original arrival
    // clocks; treating old cooldowns as new would extend them on every resume.
    for (const receipt of history) {
      const arrival = Date.parse(receipt.completedAt);
      if (!safeCount(arrival)) throw new Error('Invalid stored rate observation timestamp.');
      this.observe(receipt, arrival);
    }
  }

  /** Bounded nonfinancial observations; callers keep dispatch/financial authority separately. */
  snapshot() {
    return structuredClone({
      retryAt: this.retryAt,
      requests: this.requests,
      tokens: this.tokens,
      blockedReason: this.blockedReason,
    });
  }
  restore(value: unknown): void {
    const record = (v: unknown): v is Record<string, unknown> =>
      !!v && typeof v === 'object' && !Array.isArray(v);
    const counter = (v: unknown, following = false): v is Allowance => {
      if (
        !record(v) ||
        !safeCount(Number(v['remaining'])) ||
        !safeCount(Number(v['resetAt'])) ||
        typeof v['remaining'] !== 'number' ||
        typeof v['resetAt'] !== 'number'
      )
        return false;
      if (
        Object.keys(v).some(
          (key) => !['remaining', 'resetAt', ...(following ? [] : ['following'])].includes(key),
        )
      )
        return false;
      return v['following'] === undefined || (!following && counter(v['following'], true));
    };
    if (
      !record(value) ||
      typeof value['retryAt'] !== 'number' ||
      !safeCount(value['retryAt']) ||
      Object.keys(value).some(
        (key) => !['retryAt', 'requests', 'tokens', 'blockedReason'].includes(key),
      ) ||
      (value['requests'] !== undefined && !counter(value['requests'])) ||
      (value['tokens'] !== undefined && !counter(value['tokens'])) ||
      (value['blockedReason'] !== undefined &&
        (typeof value['blockedReason'] !== 'string' ||
          !/^openai_[a-z_]+(?::[a-z_]{1,80})?$/.test(value['blockedReason'])))
    )
      throw new Error('Invalid current rate observation.');
    this.retryAt = value['retryAt'];
    this.requests = value['requests'];
    this.tokens = value['tokens'];
    this.blockedReason = value['blockedReason'];
  }
  /** Passive admission inspection does not reserve provider capacity. */
  status(now: number): RateGateDecision {
    const requests = this.current(this.requests, now),
      tokens = this.current(this.tokens, now);
    return {
      waitMs: Math.max(
        0,
        this.retryAt - now,
        requests?.remaining === 0 ? requests.resetAt - now : 0,
        tokens?.remaining === 0 ? tokens.resetAt - now : 0,
      ),
      ...(this.blockedReason ? { blockedReason: this.blockedReason } : {}),
    };
  }
  release(requestId: string): void {
    const bound = this.claims.get(requestId);
    if (bound !== undefined) {
      this.claims.delete(requestId);
      this.claimedTokens -= BigInt(bound);
    }
  }

  private current(previous: Allowance | undefined, now: number): Allowance | undefined {
    if (!previous || previous.resetAt > now) return previous;
    return previous.following && previous.following.resetAt > now ? previous.following : undefined;
  }

  private deadline(now: number, delay: number): number | undefined {
    if (delay > Number.MAX_SAFE_INTEGER - now) {
      this.blockedReason = 'openai_rate_limit_clock_overflow';
      return undefined;
    }
    return now + delay;
  }

  private allowance(
    previous: Allowance | undefined,
    remaining: number | undefined,
    resetMs: number | undefined,
    now: number,
  ): Allowance | undefined {
    const active = this.current(previous, now);
    if (remaining === undefined) {
      if (!active || resetMs === undefined) return active;
      const resetAt = this.deadline(now, resetMs);
      return resetAt === undefined
        ? active
        : { ...active, resetAt: Math.max(active.resetAt, resetAt) };
    }
    // Without a supplied clock, sixty seconds is an explicit pacing
    // fallback. Anchor it once to the observation, not to each subsequent check.
    const resetAt = this.deadline(now, resetMs ?? 60_000);
    if (resetAt === undefined) return active;
    // A slow in-flight reply may describe older provider capacity. Keep the
    // lowest provider count within this window, independently of local claims.
    // A more generous new window must not prolong an exhausted old window.
    if (active && remaining > active.remaining) {
      if (resetAt <= active.resetAt) return active;
      return {
        ...active,
        following: {
          remaining: Math.min(active.following?.remaining ?? remaining, remaining),
          resetAt: Math.max(active.following?.resetAt ?? 0, resetAt),
        },
      };
    }
    const nextReset = Math.max(active?.resetAt ?? 0, resetAt);
    const following = active?.following;
    return {
      remaining,
      resetAt: nextReset,
      ...(following && following.resetAt > nextReset
        ? {
            following: {
              ...following,
              remaining:
                resetAt > (active?.resetAt ?? 0)
                  ? Math.min(following.remaining, remaining)
                  : following.remaining,
            },
          }
        : {}),
    };
  }

  observe(receipt: AiReceipt, now: number): void {
    if (receipt.provider !== 'openai') return;
    if (!safeCount(now))
      throw new Error('Rate gate arrival time must be a nonnegative safe integer.');
    const released = this.claims.get(receipt.requestId);
    if (released !== undefined) {
      this.claims.delete(receipt.requestId);
      this.claimedTokens -= BigInt(released);
    }
    if (this.blockedReason) return;
    const code = receipt.providerErrorCode;
    const type = receipt.providerErrorType;
    if (permanentLimit(code) || permanentLimit(type)) {
      this.blockedReason = `openai_permanent_limit:${permanentLimit(code) ? code : type}`;
      return;
    }
    if (
      receipt.httpStatus === 429 &&
      !temporaryCodes.has(code ?? '') &&
      !temporaryTypes.has(type ?? '')
    ) {
      this.blockedReason = 'openai_unclassified_429';
      return;
    }
    const rates = receipt.providerRateLimit;
    const values = [
      receipt.retryAfterMs,
      rates?.remainingRequests,
      rates?.remainingTokens,
      rates?.resetRequestsMs,
      rates?.resetTokensMs,
    ];
    if (values.some((value) => value !== undefined && !safeCount(value))) {
      this.blockedReason = 'openai_invalid_rate_metadata';
      return;
    }
    this.requests = this.allowance(
      this.requests,
      rates?.remainingRequests,
      rates?.resetRequestsMs,
      now,
    );
    this.tokens = this.allowance(this.tokens, rates?.remainingTokens, rates?.resetTokensMs, now);
    const delays = [receipt.retryAfterMs ?? 0];
    if (receipt.httpStatus === 429) {
      const untyped = !temporaryTypes.has(type ?? '');
      if (untyped || type === 'requests' || rates?.remainingRequests === 0)
        delays.push(rates?.resetRequestsMs ?? 0);
      if (untyped || type === 'tokens' || rates?.remainingTokens === 0)
        delays.push(rates?.resetTokensMs ?? 0);
      // Known temporary refusals with no usable timing evidence receive one
      // thirty-second cooldown. Unknown refusals were stopped above, not guessed.
      if (!delays.some((delay) => delay > 0)) delays.push(30_000);
    }
    const retryAt = this.deadline(now, Math.max(...delays));
    if (retryAt !== undefined) this.retryAt = Math.max(this.retryAt, retryAt);
  }

  beforeNext(inputByteUpperBound: number, now: number, requestId: string): RateGateDecision {
    if (!safeCount(inputByteUpperBound) || !safeCount(now))
      throw new Error('Rate gate byte bound and time must be nonnegative safe integers.');
    if (typeof requestId !== 'string' || !requestId || requestId.length > 256)
      throw new Error('Rate gate requires a bounded request identity.');
    if (this.blockedReason) return { waitMs: 0, blockedReason: this.blockedReason };
    if (this.claims.has(requestId))
      return { waitMs: 0, blockedReason: 'openai_duplicate_rate_claim' };
    if (this.claims.size >= 16) return { waitMs: 0, blockedReason: 'openai_rate_claim_limit' };
    this.requests = this.current(this.requests, now);
    this.tokens = this.current(this.tokens, now);
    const waitUntil = Math.max(
      this.retryAt,
      this.requests && this.requests.remaining <= this.claims.size ? this.requests.resetAt : 0,
      this.tokens &&
        BigInt(this.tokens.remaining) < this.claimedTokens + BigInt(inputByteUpperBound)
        ? this.tokens.resetAt
        : 0,
    );
    const waitMs = Math.max(0, waitUntil - now);
    if (waitMs > 0) return { waitMs };
    // JavaScript callers share this synchronous claim before they await dispatch.
    // BigInt adds at most sixteen safe byte bounds without losing precision.
    this.claims.set(requestId, inputByteUpperBound);
    this.claimedTokens += BigInt(inputByteUpperBound);
    return { waitMs: 0 };
  }
}
