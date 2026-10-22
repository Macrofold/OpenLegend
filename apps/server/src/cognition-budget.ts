import {
  JUDGMENT_MAX_CHARACTERS,
  modelTokenPrices,
  usdToMicroUsd,
  microUsdToUsd,
  sumSafeIntegers,
  type AiReceipt,
  type TokenPrices,
  type TokenUsage,
} from '@open-legend/ai';
import { MIND_LIMITS, RESPONSE_LIMITS } from '@open-legend/domain';
import { LEVEL_LIMITS } from './cognition-contracts.js';
import type { AppConfig } from './config.js';
import { CONTEXT_BYTE_LIMIT } from './context.js';
import {
  assertAttemptReceiptContinuity,
  retainKnownAttemptCost,
  uncertainAttemptMicroUsd,
} from './attempt-budget.js';

/** Reserve from the same model catalogue used to settle supported usage. Missing prices
 * retain the caller's conservative unknown-cost floor, never an invented zero rate. */
export function generationAllowance(
  config: AppConfig,
  model?: string,
  inputTokens = 500_000,
  outputTokens = 8192,
  minimumUsd = Math.max(0.25, config.llmReserveUsd),
  transport: 'openai' | 'macrofold' = config.macrofoldKey ? 'macrofold' : 'openai',
): number {
  if (transport === 'macrofold') return config.macrofoldRunUsd;
  const models = model
    ? [model]
    : [config.llmModel, config.miniModel, config.complexModel, config.summaryModel];
  const prices: TokenPrices[] = models.flatMap(
    (selected) => modelTokenPrices(config.llmModelPrices, selected) ?? [],
  );
  return Math.max(
    minimumUsd,
    ...prices.map(
      (rates) =>
        (inputTokens *
          Math.max(
            rates.inputUsdPerMillion,
            rates.cachedInputUsdPerMillion ?? 0,
            rates.cacheWriteInputUsdPerMillion ?? 0,
          ) +
          outputTokens * rates.outputUsdPerMillion) /
        1e6,
    ),
  );
}
/** Same conservative allowance for cheap preflight and authoritative paid admission. */
export function decisionAllowance(
  config: AppConfig,
  provider: 'jev' | 'openai',
  model?: string,
): number {
  if (provider === 'openai') return generationAllowance(config, model);
  // Macrofold reserves its prepared input as bytes plus padding before invoking Jev.
  // The configured minimum cannot replace the supported request's price bound.
  // docs/ai-providers.md#configuration-and-interface
  return Math.max(
    config.jevReserveUsd,
    ((500_000 + (config.macrofoldKey ? 1024 : 0)) * config.jevPrices.inputUsdPerMillion) / 1e6,
  );
}
/** Each request rounds separately at reservation; adding raw USD can lose headroom. */
export function sumRequestCosts(allowances: readonly number[]): number {
  const total = sumSafeIntegers(allowances.map((amount) => usdToMicroUsd(amount) ?? NaN));
  const usd = total === undefined ? undefined : microUsdToUsd(String(total));
  if (usd === undefined) throw new Error('Decision allowance exceeds safe arithmetic.');
  return usd;
}
/** Reserve one interactive response plus optional native interpretation, attention and embeddings. */
export function interactiveAllowance(config: AppConfig): number {
  const judgment = decisionAllowance(config, 'jev');
  // Strict typed-only operation cannot spend on generation or embeddings. Holding
  // those allowances would starve eligible idle learning despite available funds.
  if (config.jevOnly) return sumRequestCosts([judgment, judgment, judgment]);
  // The eventual route is not selected yet: hold the most expensive configured model.
  const generation = config.macrofoldKey
    ? config.macrofoldRunUsd
    : generationAllowance(config, undefined, 120_000);
  return sumRequestCosts([
    generation,
    generation,
    judgment,
    judgment,
    judgment,
    config.embeddingReserveUsd,
  ]);
}

/** Semantic levels with their own limits. Level 0 is native and spends nothing.
 * docs/memory-architecture.md#2-semantic-levels-and-triggers */
export type CognitionLevel = 1 | 2 | 3 | 4 | 5;

/** Independent per-level limits; one table so routing, admission and inspection agree.
 * docs/limits/cognition.md#cg08 */
export interface LevelLimits {
  level: CognitionLevel;
  executor: 'jev' | 'mini-llm' | 'complex-llm' | 'harness';
  /** Instructions plus context (LLM, UTF-8 bytes) or serialized state plus questions (Jev,
   * characters as the Jev client estimates them). */
  inputSize: number;
  /** Response schema bytes, counted separately from context. */
  schemaBytes: number;
  /** Provider output ceiling. Current adapters count reasoning inside this ceiling. */
  outputTokens: number;
  /** Validated response size, the envelope advertised to the model; larger output is rejected
   * without paid repair. The provider output ceiling normally binds first. */
  visibleOutputBytes: number;
  /** Effort is forwarded; reasoning tokens beyond the allowance are reported, not refunded:
   * no current adapter exposes a separate hard reasoning cap. */
  reasoning: { effort: 'none' | 'low' | 'medium' | 'high' | 'xhigh'; allowanceTokens: number };
  toolRounds: number;
  /** Paid requests of this level's own work per decision. A runaway-loop stop, deliberately well
   * above current use (3 Jev requests and 1 generation per attempt, at most 2 attempts) so later
   * pipeline steps fit without retuning. */
  requestsPerDecision: number;
  /** Monetary ceiling for this level's own work per decision; reservations count toward it. */
  decisionUsd: number;
}

// Engineering starting points, not measured optima: docs/limits/cognition.md#cg08.
export function levelLimits(config: AppConfig): Record<CognitionLevel, LevelLimits> {
  const jev = decisionAllowance(config, 'jev');
  const llm = decisionAllowance(config, 'openai', config.llmModel);
  // Each SQL reservation rounds upward separately. Multiplying the raw USD first
  // would refuse the final advertised request for fractional-microdollar bounds.
  const requestAllowance = (requestsPerDecision: number, reserveUsd: number) => {
    return {
      requestsPerDecision,
      decisionUsd: sumRequestCosts(Array.from({ length: requestsPerDecision }, () => reserveUsd)),
    };
  };
  const generative = (level: 2 | 3 | 4): LevelLimits => ({
    level,
    executor: level === 2 ? 'mini-llm' : 'complex-llm',
    inputSize: CONTEXT_BYTE_LIMIT,
    schemaBytes: 65_536,
    // Actor-invention proposals widen level 2 to 1,800 tokens at the call site.
    outputTokens: LEVEL_LIMITS[level].outputTokens,
    visibleOutputBytes: RESPONSE_LIMITS.bytes,
    reasoning: {
      effort: LEVEL_LIMITS[level].effort,
      allowanceTokens: level === 2 ? 512 : level === 3 ? 2_048 : 6_144,
    },
    toolRounds: 0,
    ...requestAllowance(
      10,
      decisionAllowance(config, 'openai', level === 2 ? config.miniModel : config.complexModel),
    ),
  });
  return {
    1: {
      level: 1,
      executor: 'jev',
      inputSize: JUDGMENT_MAX_CHARACTERS,
      schemaBytes: 0,
      outputTokens: 16_384,
      visibleOutputBytes: 1_000_000,
      reasoning: { effort: 'none', allowanceTokens: 0 },
      toolRounds: 0,
      ...requestAllowance(20, jev),
    },
    2: generative(2),
    3: generative(3),
    4: generative(4),
    5: {
      level: 5,
      executor: 'harness',
      inputSize: CONTEXT_BYTE_LIMIT,
      schemaBytes: 65_536,
      outputTokens: 16_384,
      visibleOutputBytes: MIND_LIMITS.proposalBytes,
      reasoning: { effort: 'xhigh', allowanceTokens: 16_384 },
      // Enforced by the reflection harness adapter, which rejects runs above eight tool rounds.
      toolRounds: 8,
      ...requestAllowance(1, config.macrofoldKey ? config.macrofoldRunUsd : llm),
    },
  };
}

/** Which part of a decision a paid request served. Only `level` work is capped here;
 * preparation and grounding keep their own bounds and are recorded in the total. */
export type LedgerCategory = 'level' | 'preparation' | 'grounding';

export interface LedgerEntry {
  requestId: string;
  stage: string;
  category: LedgerCategory;
  level?: CognitionLevel;
  provider: 'jev' | 'openai';
  /** Instructions, context/state and schema/questions sizes as submitted, in UTF-8 bytes. */
  size: { instructions: number; context: number; schema: number };
  reservedUsd: number;
  providerRequestId?: string;
  macrofoldBillingMode?: AiReceipt['macrofoldBillingMode'];
  macrofoldDeployment?: AiReceipt['macrofoldDeployment'];
  macrofoldCostAttribution?: AiReceipt['macrofoldCostAttribution'];
  dispatched?: boolean;
  /** Known price is separate from the possibly larger conservative spending hold. */
  estimatedCostUsd?: number;
  settledUsd?: number;
  uncertain?: boolean;
  outcome?: string;
  usage?: TokenUsage;
  reasoningOverAllowance?: boolean;
}

/** One decision's paid work: every Jev attention/routing/selection call, generation,
 * grounding and preparation request, with its bytes, reservation and settlement. */
export class DecisionLedger {
  readonly entries: LedgerEntry[] = [];
  constructor(readonly limits: Record<CognitionLevel, LevelLimits>) {}

  /** Refuse before dispatch when this level's own work would exceed its decision limits. */
  admit(
    category: LedgerCategory,
    level: CognitionLevel | undefined,
    reserveUsd: number,
  ): { ok: true } | { ok: false; reason: string } {
    if (category !== 'level' || level === undefined) return { ok: true };
    const limits = this.limits[level];
    const prior = this.entries.filter((e) => e.category === 'level' && e.level === level);
    if (prior.length + 1 > limits.requestsPerDecision)
      return {
        ok: false,
        reason: `Level ${level} already made ${prior.length} of ${limits.requestsPerDecision} requests for this decision.`,
      };
    // Reservations, not settlements: a provider cost reported above its reservation must not
    // refuse work that the request count still allows.
    const committed = sumSafeIntegers(prior.map((e) => usdToMicroUsd(e.reservedUsd) ?? NaN));
    const additional = usdToMicroUsd(reserveUsd);
    const ceiling = usdToMicroUsd(limits.decisionUsd);
    const combined = sumSafeIntegers([committed ?? NaN, additional ?? NaN]);
    if (combined === undefined || ceiling === undefined || combined > ceiling)
      return {
        ok: false,
        reason: `Level ${level} decision allowance of $${limits.decisionUsd.toFixed(6)} cannot cover another $${reserveUsd.toFixed(6)} reservation.`,
      };
    return { ok: true };
  }

  record(entry: LedgerEntry): void {
    this.entries.push(entry);
  }

  settle(requestId: string, receipt: AiReceipt, outcome?: string): void {
    const entry = this.entries.find((e) => e.requestId === requestId);
    if (!entry) return;
    if (receipt.requestId !== requestId) throw new Error('Spending receipt identity mismatch.');
    assertAttemptReceiptContinuity(entry, receipt);
    if (entry.settledUsd !== undefined && entry.uncertain === false) return;
    receipt = retainKnownAttemptCost(receipt, entry.estimatedCostUsd);
    const charge = usdToMicroUsd(receipt.estimatedCostUsd);
    const uncertain = receipt.dispatched && (receipt.completionUncertain || charge === undefined);
    const spent = !receipt.dispatched
      ? 0
      : uncertain
        ? uncertainAttemptMicroUsd(
            usdToMicroUsd(entry.reservedUsd) ?? NaN,
            usdToMicroUsd(entry.settledUsd ?? 0) ?? NaN,
            receipt.estimatedCostUsd,
          )
        : charge!;
    const settledUsd = microUsdToUsd(String(spent));
    if (settledUsd === undefined) throw new Error('Decision spending exceeds safe arithmetic.');
    entry.settledUsd = settledUsd;
    entry.providerRequestId = receipt.providerRequestId;
    entry.macrofoldBillingMode = receipt.macrofoldBillingMode;
    entry.macrofoldDeployment = receipt.macrofoldDeployment ?? entry.macrofoldDeployment;
    entry.macrofoldCostAttribution =
      receipt.macrofoldCostAttribution ?? entry.macrofoldCostAttribution;
    entry.dispatched = receipt.dispatched;
    entry.estimatedCostUsd = charge === undefined ? undefined : receipt.estimatedCostUsd;
    entry.uncertain = uncertain;
    entry.outcome = outcome;
    if (receipt.usage) entry.usage = receipt.usage;
    const allowance = entry.level ? this.limits[entry.level].reasoning.allowanceTokens : undefined;
    if (
      allowance !== undefined &&
      entry.level !== 1 &&
      (receipt.usage?.reasoningOutputTokens ?? 0) > allowance
    )
      entry.reasoningOverAllowance = true;
  }

  summary() {
    const groups = new Map<string, LedgerEntry[]>();
    for (const entry of this.entries) {
      const key = entry.category === 'level' ? `level${entry.level}` : entry.category;
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    const amountUsd = (entries: LedgerEntry[], settled: boolean): number => {
      const amounts = entries.map(
        (entry) =>
          usdToMicroUsd(settled ? (entry.settledUsd ?? entry.reservedUsd) : entry.reservedUsd) ??
          NaN,
      );
      const sum = sumSafeIntegers(amounts);
      const usd = sum === undefined ? undefined : microUsdToUsd(String(sum));
      if (usd === undefined) throw new Error('Decision spending exceeds safe arithmetic.');
      return usd;
    };
    const total = (entries: LedgerEntry[]) => ({
      requests: entries.length,
      inputBytes: entries.reduce((s, e) => s + e.size.instructions + e.size.context, 0),
      schemaBytes: entries.reduce((s, e) => s + e.size.schema, 0),
      inputTokens: entries.reduce((s, e) => s + (e.usage?.inputTokens ?? 0), 0),
      outputTokens: entries.reduce((s, e) => s + (e.usage?.outputTokens ?? 0), 0),
      reasoningTokens: entries.reduce((s, e) => s + (e.usage?.reasoningOutputTokens ?? 0), 0),
      usageMissing: entries.some((e) => e.usage === undefined && e.dispatched),
      reservedUsd: amountUsd(entries, false),
      settledUsd: amountUsd(entries, true),
      uncertain: entries.some((e) => e.uncertain || e.settledUsd === undefined),
    });
    return {
      groups: Object.fromEntries([...groups].map(([key, entries]) => [key, total(entries)])),
      total: total(this.entries),
    };
  }
}
