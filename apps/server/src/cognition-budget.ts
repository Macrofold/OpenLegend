import { JUDGMENT_MAX_CHARACTERS, type AiReceipt, type TokenUsage } from '@open-legend/ai';
import { MIND_LIMITS, RESPONSE_LIMITS } from '@open-legend/domain';
import { LEVEL_LIMITS } from './cognition-contracts.js';
import type { AppConfig } from './config.js';
import { CONTEXT_BYTE_LIMIT } from './context.js';

/** Same conservative allowance for cheap preflight and authoritative paid admission. */
export function decisionAllowance(config: AppConfig, provider: 'jev' | 'openai'): number {
  if (config.macrofoldKey)
    return provider === 'jev' ? config.jevReserveUsd : config.macrofoldRunUsd;
  const prices = provider === 'jev' ? config.jevPrices : config.llmPrices;
  return Math.max(
    provider === 'jev' ? config.jevReserveUsd : Math.max(0.25, config.llmReserveUsd),
    (500000 *
      Math.max(
        prices.inputUsdPerMillion,
        provider === 'openai' ? config.llmPrices.cacheWriteInputUsdPerMillion : 0,
      ) +
      8192 * prices.outputUsdPerMillion) /
      1e6,
  );
}
/** Reserve one interactive response plus optional native interpretation, attention and embeddings. */
export function interactiveAllowance(config: AppConfig): number {
  // Strict typed-only operation cannot spend on generation or embeddings. Holding
  // those allowances would starve eligible idle learning despite available funds.
  if (config.jevOnly) return 3 * decisionAllowance(config, 'jev');
  if (config.macrofoldKey)
    return 2 * config.macrofoldRunUsd + 3 * config.jevReserveUsd + config.embeddingReserveUsd;
  const inputPrice = Math.max(
    config.llmPrices.inputUsdPerMillion,
    config.llmPrices.cacheWriteInputUsdPerMillion,
  );
  const generation = Math.max(
    0.25,
    config.llmReserveUsd,
    (120000 * inputPrice + 8192 * config.llmPrices.outputUsdPerMillion) / 1e6,
  );
  const judgment = Math.max(
    config.jevReserveUsd,
    (120000 * config.jevPrices.inputUsdPerMillion) / 1e6,
  );
  return 2 * generation + 3 * judgment + config.embeddingReserveUsd;
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
  reasoning: { effort: 'none' | 'low' | 'high' | 'xhigh'; allowanceTokens: number };
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
  const llm = decisionAllowance(config, 'openai');
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
    requestsPerDecision: 10,
    decisionUsd: 10 * llm,
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
      requestsPerDecision: 20,
      decisionUsd: 20 * jev,
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
      requestsPerDecision: 1,
      decisionUsd: config.macrofoldKey ? config.macrofoldRunUsd : llm,
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
    const committed = prior.reduce((sum, e) => sum + e.reservedUsd, 0);
    if (committed + reserveUsd > limits.decisionUsd + 1e-9)
      return {
        ok: false,
        reason: `Level ${level} decision allowance of $${limits.decisionUsd.toFixed(6)} cannot cover another $${reserveUsd.toFixed(6)} reservation.`,
      };
    return { ok: true };
  }

  record(entry: LedgerEntry): void {
    this.entries.push(entry);
  }

  settle(requestId: string, receipt: AiReceipt, outcome: string): void {
    const entry = this.entries.find((e) => e.requestId === requestId);
    if (!entry) return;
    // Missing usage or uncertain completion is not free: the reservation stays charged.
    const uncertain =
      receipt.dispatched && (receipt.completionUncertain || receipt.estimatedCostUsd === undefined);
    entry.settledUsd = !receipt.dispatched
      ? 0
      : uncertain
        ? entry.reservedUsd
        : receipt.estimatedCostUsd;
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
    const total = (entries: LedgerEntry[]) => ({
      requests: entries.length,
      inputBytes: entries.reduce((s, e) => s + e.size.instructions + e.size.context, 0),
      schemaBytes: entries.reduce((s, e) => s + e.size.schema, 0),
      inputTokens: entries.reduce((s, e) => s + (e.usage?.inputTokens ?? 0), 0),
      outputTokens: entries.reduce((s, e) => s + (e.usage?.outputTokens ?? 0), 0),
      reasoningTokens: entries.reduce((s, e) => s + (e.usage?.reasoningOutputTokens ?? 0), 0),
      usageMissing: entries.some((e) => e.usage === undefined && e.settledUsd !== 0),
      reservedUsd: entries.reduce((s, e) => s + e.reservedUsd, 0),
      settledUsd: entries.reduce((s, e) => s + (e.settledUsd ?? e.reservedUsd), 0),
      uncertain: entries.some((e) => e.uncertain || e.settledUsd === undefined),
    });
    return {
      groups: Object.fromEntries([...groups].map(([key, entries]) => [key, total(entries)])),
      total: total(this.entries),
    };
  }
}
