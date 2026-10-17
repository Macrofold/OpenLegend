import type { detailedBenchmarkReport } from './followup-report.js';

type DetailedReport = ReturnType<typeof detailedBenchmarkReport>;

const names: Record<string, string> = {
  'typesafe/jev-1.13': 'Jev 1.13',
  'microsoft/microsoft-decision-1': 'Microsoft Decision 1',
  'openai/gpt-6-luna:decisions': 'Luna Decisions',
  'openai/gpt-6-luna:low': 'Luna low effort',
  'openai/gpt-6-luna:medium': 'Luna medium effort',
  'openai/gpt-6-luna:high': 'Luna high effort',
  'meta/muse-spark-1.3-contributor': 'Spark 1.3 Contributor',
};
const count = (value: number) => value.toLocaleString('en-US');
const decimal = (value: number | null) => (value === null ? '—' : value.toFixed(2));
const percent = (value: number | null) => (value === null ? '—' : `${decimal(value)}%`);
const seconds = (value: number | null | undefined) => decimal(value == null ? null : value / 1_000);
const perThousand = (value: number | null | undefined) =>
  value == null ? '—' : `$${decimal(value * 1_000)}`;
const label = (model: string) => (names[model] ?? model).replaceAll('|', '\\|');

/** Format the existing complete comparison, without regrading or rescanning
 * individual answers. Keep raw JSON precise; human-facing values use two decimals.
 */
export function renderMasterReport(report: DetailedReport): string {
  const requests = new Map(report.requestMetrics.nativeSuccessful.map((row) => [row.model, row]));
  const lines = [
    '# Decision benchmark: master comparison',
    '',
    'Every model is evaluated against the same question set. Accuracy is correct answers divided by answers received; an unanswered question is not a wrong answer. Answer counts show how much of the set each model completed. Missing hard questions can still make an incomplete model look better.',
    '',
    '| Model | Answered / question set | Correct / answered (accuracy) | Points / 100 | Factual mistakes / checked | Average / 95th-percentile seconds | Estimated cost / 1,000 requests |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const row of report.models) {
    const timing = requests.get(row.model);
    const checked = row.assessedAnswerErrorFree.denominator;
    const errors = checked
      ? `${count(row.clearErrorCount)} / ${count(checked)} (${percent((100 * row.clearErrorCount) / checked)})`
      : '—';
    lines.push(
      `| ${label(row.model)} | ${count(row.answered.numerator)} / ${count(row.answered.denominator)} | ${count(row.strict.numerator)} / ${count(row.strict.denominator)} (${percent(row.strict.percent)}) | ${decimal(row.weighted.percentage)} | ${errors} | ${seconds(timing?.latency.meanMs)} / ${seconds(timing?.latency.p95Ms)} | ${perThousand(timing?.estimatedCostUsd.meanUsd)} |`,
    );
  }
  lines.push(
    '',
    '**Accuracy:** the accepted answer or any accepted alternative. Ordered numerical ratings use the nearest offered category, so 1.11 becomes 1. Actual probability questions retain their probability grading.',
    '',
    '**Points:** partial credit, summed across received answers and divided by their possible points. It is not the percentage correct. **Factual mistakes:** contradictions of supplied facts or constraints; the denominator excludes subjective questions that this additional check cannot judge. All questions still count toward accuracy and points when answered.',
    '',
    '**Time and cost:** successful request measurements only. A request contains several questions. Times include the complete integration call. The 95th percentile is the time at or below which 95% of measured requests finished. Cost per 1,000 is the measured per-request average multiplied by 1,000, not a separate batch price. Different completed inputs and execution dates/concurrency affect comparisons. Failed-attempt costs and unresolved charges remain separate financial evidence.',
    '',
    '## Detailed totals and request distributions',
    '',
    '| Model | Earned / possible points | Requests measured | Slowest seconds | Cost observations / measured requests | 75th / 95th-percentile cost, scaled to 1,000 requests |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  );
  for (const row of report.models) {
    const timing = requests.get(row.model);
    lines.push(
      `| ${label(row.model)} | ${decimal(row.weighted.earnedPoints)} / ${decimal(row.weighted.possiblePoints)} | ${count(timing?.calls ?? 0)} | ${seconds(timing?.latency.maxMs)} | ${count(timing?.estimatedCostUsd.count ?? 0)} / ${count(timing?.calls ?? 0)} | ${perThousand(timing?.estimatedCostUsd.p75Usd)} / ${perThousand(timing?.estimatedCostUsd.p95Usd)} |`,
    );
  }
  lines.push(
    '',
    'A dash means no usable measurement. Full-precision scores, original numbers, model responses and financial evidence remain in the JSON artifacts.',
    '',
  );
  return lines.join('\n');
}
