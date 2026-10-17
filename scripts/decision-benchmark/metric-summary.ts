import type { RunRecord } from './evaluate.js';
import type { QualityAggregate } from './quality-types.js';

export interface CostMetrics {
  /** Number of included supplied amounts. */
  count: number;
  /** No supplied amount; can overlap with uncertain. */
  missing: number;
  /** All calls with uncertain completion, including those missing an amount. */
  uncertain: number;
  /** Known sample sum, not a complete bill; null when no amount is usable. */
  sumUsd: number | null;
  meanUsd: number | null;
  p75Usd: number | null;
  p95Usd: number | null;
  maxUsd: number | null;
}

export interface RequestMetrics {
  model: string;
  calls: number;
  /** A value was returned; correctness and complete question coverage are separate. */
  successfulCalls: number;
  latency: {
    count: number;
    meanMs: number | null;
    p95Ms: number | null;
    maxMs: number | null;
  };
  /** Usage-based estimates exclude calls whose completion remains uncertain. */
  estimatedCostUsd: CostMetrics;
  /** Every supplied upstream amount, including uncertain calls; never added to
   * the usage-based estimate or represented as a settled complete bill. */
  providerReportedCostUsd: CostMetrics;
}

export interface RequestMetricCohorts {
  nativeAttempts: RequestMetrics[];
  nativeSuccessful: RequestMetrics[];
  commonNative: RequestMetrics[];
  generationAttempts: RequestMetrics[];
  generationSuccessful: RequestMetrics[];
}

// Descriptive arithmetic retains the supplied sub-micro-dollar values. The
// financial admission owner's upward rounding is intentionally not used here.
function sum(values: readonly number[]): number {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const next = total + value;
    correction += Math.abs(total) >= Math.abs(value) ? total - next + value : value - next + total;
    total = next;
  }
  return total + correction;
}

function distribution(values: number[]) {
  if (!values.length) return { sum: null, mean: null, p75: null, p95: null, max: null };
  const total = sum(values);
  // Each owned sample array is sorted once. Match the existing report's nearest
  // rank convention rather than interpolating between two observed calls.
  values.sort((a, b) => a - b);
  return {
    sum: total,
    mean: total / values.length,
    p75: values[Math.ceil(values.length * 0.75) - 1]!,
    p95: values[Math.ceil(values.length * 0.95) - 1]!,
    max: values[values.length - 1]!,
  };
}

function costMetrics(values: number[], missing: number, uncertain: number): CostMetrics {
  const stats = distribution(values);
  return {
    count: values.length,
    missing,
    uncertain,
    sumUsd: stats.sum,
    meanUsd: stats.mean,
    p75Usd: stats.p75,
    p95Usd: stats.p95,
    maxUsd: stats.max,
  };
}

function summarize(model: string, records: readonly RunRecord[]): RequestMetrics {
  const latencies: number[] = [];
  const estimates: number[] = [];
  const reported: number[] = [];
  let missingEstimates = 0;
  let missingReported = 0;
  let uncertain = 0;
  let successfulCalls = 0;
  for (const record of records) {
    const receipt = record.result.receipt;
    latencies.push(receipt.latencyMs);
    successfulCalls += Number(record.result.outcome === 'value');
    uncertain += Number(receipt.completionUncertain);
    if (receipt.estimatedCostUsd === undefined) missingEstimates++;
    else if (!receipt.completionUncertain) estimates.push(receipt.estimatedCostUsd);
    if (receipt.providerReportedCostUsd === undefined) missingReported++;
    else reported.push(receipt.providerReportedCostUsd);
  }
  const latency = distribution(latencies);
  return {
    model,
    calls: records.length,
    successfulCalls,
    latency: {
      count: latencies.length,
      meanMs: latency.mean,
      p95Ms: latency.p95,
      maxMs: latency.max,
    },
    estimatedCostUsd: costMetrics(estimates, missingEstimates, uncertain),
    providerReportedCostUsd: costMetrics(reported, missingReported, uncertain),
  };
}

/** Offline complete-cohort work, with each scene call counted once, not once per
 * question. The caller owns cohort selection; original service attempts and
 * normalized comparison records must not be silently mixed or deduplicated.
 */
export function summarizeRequestMetrics(
  records: readonly RunRecord[],
  models: readonly string[],
  commonSceneIds: ReadonlySet<string>,
): RequestMetricCohorts {
  const byModel = new Map<string, RunRecord[]>(models.map((model) => [model, []]));
  for (const record of records) byModel.get(record.model)?.push(record);
  const output: RequestMetricCohorts = {
    nativeAttempts: [],
    nativeSuccessful: [],
    commonNative: [],
    generationAttempts: [],
    generationSuccessful: [],
  };
  for (const model of models) {
    const native: RunRecord[] = [];
    const generation: RunRecord[] = [];
    for (const record of byModel.get(model)!)
      (record.sceneId.startsWith('generate-') ? generation : native).push(record);
    output.nativeAttempts.push(summarize(model, native));
    output.nativeSuccessful.push(
      summarize(
        model,
        native.filter((record) => record.result.outcome === 'value'),
      ),
    );
    output.commonNative.push(
      summarize(
        model,
        native.filter((record) => commonSceneIds.has(record.sceneId)),
      ),
    );
    output.generationAttempts.push(summarize(model, generation));
    output.generationSuccessful.push(
      summarize(
        model,
        generation.filter((record) => record.result.outcome === 'value'),
      ),
    );
  }
  return output;
}

export function weightedPointTotals(aggregate: QualityAggregate) {
  const possiblePoints = aggregate.eligibleQuestions * 100;
  const answeredPossiblePoints = aggregate.answeredQuestions * 100;
  return {
    earnedPoints: aggregate.earnedPoints,
    possiblePoints,
    percentage: possiblePoints ? (100 * aggregate.earnedPoints) / possiblePoints : null,
    answeredPossiblePoints,
    answeredPercentage: answeredPossiblePoints
      ? (100 * aggregate.earnedPoints) / answeredPossiblePoints
      : null,
  };
}
