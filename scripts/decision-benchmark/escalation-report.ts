import { escalationSeed, type EscalationEpisode } from './escalation-episodes.js';
import { createHash } from 'node:crypto';

export interface EscalationObservation {
  id: string;
  episodeId: string;
  primaryChoice?: string;
  finalChoice?: string;
  triggered: boolean;
  admitted: boolean;
  completed: boolean;
  delivered: boolean;
  primaryDelivered: boolean;
  primaryKnownCostUsd: number;
  primaryHeldUsd: number;
  immediateMs?: number;
  finalMs?: number;
  knownCostUsd: number;
  heldUsd: number;
  end?: string;
}
export function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction: number) =>
    sorted.length ? sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)]! : null;
  return {
    mean: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null,
    median: percentile(0.5),
    p75: percentile(0.75),
    p95: percentile(0.95),
    max: percentile(1),
  };
}
/** Paired whole-episode bootstrap: all related views travel together. No per-question sampling. */
export function escalationReport(
  episodes: EscalationEpisode[],
  observations: EscalationObservation[],
  live: boolean,
) {
  const byId = new Map(episodes.map((episode) => [episode.id, episode]));
  const points = (observation: EscalationObservation, choice?: string) =>
    choice === undefined ? undefined : byId.get(observation.id)!.reference.points[choice];
  const accepted = (row: EscalationObservation, choice?: string) => points(row, choice) === 100;
  const summary = (final: boolean) => {
    const answered = observations.filter(
      (row) => points(row, final ? row.finalChoice : row.primaryChoice) !== undefined,
    );
    const earned = answered.reduce(
      (sum, row) =>
        sum +
        points(row, final ? row.finalChoice : row.primaryChoice)! *
          byId.get(row.id)!.reference.weight,
      0,
    );
    const possible = answered.reduce(
      (sum, row) => sum + 100 * byId.get(row.id)!.reference.weight,
      0,
    );
    return {
      answered: answered.length,
      total: episodes.length,
      correct: answered.filter((row) => accepted(row, final ? row.finalChoice : row.primaryChoice))
        .length,
      earned,
      possible,
      accuracyPct: answered.length
        ? (answered.filter((row) => accepted(row, final ? row.finalChoice : row.primaryChoice))
            .length /
            answered.length) *
          100
        : null,
      pointsPct: possible ? (earned / possible) * 100 : null,
      answerCoveragePct: (answered.length / episodes.length) * 100,
    };
  };
  const paired = observations.filter(
    (row) =>
      points(row, row.primaryChoice) !== undefined && points(row, row.finalChoice) !== undefined,
  );
  const groups = new Map<string, { gain: number; possible: number }>();
  for (const row of paired) {
    const weight = byId.get(row.id)!.reference.weight,
      group = groups.get(row.episodeId) ?? { gain: 0, possible: 0 };
    group.gain += (points(row, row.finalChoice)! - points(row, row.primaryChoice)!) * weight;
    group.possible += 100 * weight;
    groups.set(row.episodeId, group);
  }
  const wholeEpisodes = [...groups.values()],
    samples: number[] = [];
  let seed = createHash('sha256').update(escalationSeed).digest().readUInt32LE(0);
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x1_0000_0000;
  };
  if (wholeEpisodes.length >= 2)
    for (let repetition = 0; repetition < 5000; repetition++) {
      let gain = 0,
        possible = 0;
      for (let index = 0; index < wholeEpisodes.length; index++) {
        const group = wholeEpisodes[Math.floor(random() * wholeEpisodes.length)]!;
        gain += group.gain;
        possible += group.possible;
      }
      samples.push((gain / possible) * 100);
    }
  samples.sort((a, b) => a - b);
  const interval = samples.length
    ? {
        lower: samples[124]!,
        upper: samples[4874]!,
        episodes: wholeEpisodes.length,
        pairedQuestions: paired.length,
        repetitions: 5000,
        seed: escalationSeed,
      }
    : null;
  const immediate = observations.filter((row) => byId.get(row.id)!.immediateOnly);
  const timely = immediate.filter(
    (row) => row.delivered && row.finalMs !== undefined && row.finalMs < 1000,
  );
  const corrections = observations.filter(
    (row) =>
      row.primaryChoice !== undefined &&
      !accepted(row, row.primaryChoice) &&
      accepted(row, row.finalChoice),
  ).length;
  const regressions = observations.filter(
    (row) =>
      accepted(row, row.primaryChoice) &&
      row.finalChoice !== undefined &&
      !accepted(row, row.finalChoice),
  ).length;
  const baseline = summary(false),
    policy = summary(true);
  const baselineDelivered = observations.filter((row) => row.primaryDelivered).length;
  const triggeredAnswered = observations.filter(
    (row) => row.triggered && points(row, row.primaryChoice) !== undefined,
  );
  const triggeredCorrect = triggeredAnswered.filter((row) => accepted(row, row.primaryChoice));
  const primaryErrors = observations.filter(
    (row) => points(row, row.primaryChoice) !== undefined && !accepted(row, row.primaryChoice),
  );
  const detectedErrors = primaryErrors.filter((row) => row.triggered);
  const knownCostUsd = observations.reduce((sum, row) => sum + row.knownCostUsd, 0);
  const heldUsd = observations.reduce((sum, row) => sum + row.heldUsd, 0);
  const costSummary = (primary: boolean) => {
    const complete = observations.filter(
      (row) => (primary ? row.primaryHeldUsd : row.heldUsd) === 0,
    );
    return {
      complete: complete.length,
      knownUsd: observations.reduce(
        (sum, row) => sum + (primary ? row.primaryKnownCostUsd : row.knownCostUsd),
        0,
      ),
      heldUsd: observations.reduce(
        (sum, row) => sum + (primary ? row.primaryHeldUsd : row.heldUsd),
        0,
      ),
      distribution: distribution(
        complete.map((row) => (primary ? row.primaryKnownCostUsd : row.knownCostUsd)),
      ),
    };
  };
  return {
    evidence: live ? 'live-model policy experiment' : 'controlled fixtures; no model-quality claim',
    baseline,
    policy,
    baselineMeaning:
      'The primary proposal is its highest-rated offered alternative, including an interpretable ranking that the suitability policy deferred. Raw ratings remain in the journal. Delivery is measured separately.',
    attempted: observations.length,
    missingImmediateTiming: observations.filter((row) => row.immediateMs === undefined).length,
    missingDeliveredTiming: observations.filter((row) => row.delivered && row.finalMs === undefined)
      .length,
    unattempted: episodes.length - observations.length,
    triggered: observations.filter((row) => row.triggered).length,
    admitted: observations.filter((row) => row.admitted).length,
    higherCompleted: observations.filter((row) => row.completed).length,
    delivered: observations.filter((row) => row.delivered).length,
    baselineDelivered,
    costsByConfiguration: { primary: costSummary(true), policy: costSummary(false) },
    corrections,
    regressions,
    recoveredAnswers: observations.filter(
      (row) => row.primaryChoice === undefined && accepted(row, row.finalChoice),
    ).length,
    triggeredPrimaryCorrect: observations.filter(
      (row) => row.triggered && accepted(row, row.primaryChoice),
    ).length,
    unnecessaryEscalation: {
      correct: triggeredCorrect.length,
      answeredTriggered: triggeredAnswered.length,
      percentage: triggeredAnswered.length
        ? (triggeredCorrect.length / triggeredAnswered.length) * 100
        : null,
    },
    errorDetection: {
      detected: detectedErrors.length,
      totalErrors: primaryErrors.length,
      percentage: primaryErrors.length
        ? (detectedErrors.length / primaryErrors.length) * 100
        : null,
    },
    unflaggedPrimaryErrors: observations.filter(
      (row) =>
        !row.triggered && row.primaryChoice !== undefined && !accepted(row, row.primaryChoice),
    ).length,
    nativeCalculationsResolved: 0,
    invalidCommittedEffects: null,
    effectScope:
      'This experiment returns scoped judgments; native action/feeling effects are qualified separately through the server acceptance fixtures.',
    pairedPointGain95Pct: interval,
    immediateOnly: {
      resolvedWithinOneSecond: timely.length,
      total: immediate.length,
      percentage: immediate.length ? (timely.length / immediate.length) * 100 : null,
      correctWithinOneSecond: timely.filter((row) => accepted(row, row.finalChoice)).length,
    },
    immediateMs: distribution(
      observations.flatMap((row) => (row.immediateMs === undefined ? [] : [row.immediateMs])),
    ),
    eventualMs: distribution(
      observations.flatMap((row) => (row.finalMs === undefined ? [] : [row.finalMs])),
    ),
    knownCostUsd,
    heldUsd,
    costPerCorrectionUsd: corrections && !heldUsd ? knownCostUsd / corrections : null,
    completeCostObservations: observations.filter((row) => row.heldUsd === 0).length,
    costsUsd: distribution(
      observations.filter((row) => row.heldUsd === 0).map((row) => row.knownCostUsd),
    ),
    endings: Object.fromEntries(
      [...new Set(observations.map((row) => row.end ?? 'resolved'))].map((end) => [
        end,
        observations.filter((row) => (row.end ?? 'resolved') === end).length,
      ]),
    ),
    qualified: false,
    promotion: {
      qualityGate: !!(
        live &&
        observations.length === episodes.length &&
        interval &&
        interval.lower > 0 &&
        corrections > regressions &&
        policy.answered >= baseline.answered &&
        observations.filter((row) => row.delivered).length >= baselineDelivered
      ),
      immediateGate: immediate.length > 0 && timely.length / immediate.length >= 0.95,
      remaining: [
        'Live response/appraisal samples and operator review of character behavior are separate required promotion evidence. Default runtime activation stays off.',
      ],
    },
  };
}
export function escalationMarkdown(report: ReturnType<typeof escalationReport>) {
  const pct = (n: number | null) => (n === null ? 'Unavailable' : n.toFixed(2) + '%');
  const number = (n: number | null, scale = 1) =>
    n === null ? 'Unavailable' : (n / scale).toFixed(2);
  const money = (n: number | null) =>
    n === null ? 'Unavailable' : n > 0 && n < 0.01 ? '<$0.01' : '$' + n.toFixed(2);
  const comparison = [
    {
      name: 'Fast model',
      quality: report.baseline,
      delivered: report.baselineDelivered,
      costs: report.costsByConfiguration.primary,
    },
    {
      name: 'Fast model plus one Luna attempt',
      quality: report.policy,
      delivered: report.delivered,
      costs: report.costsByConfiguration.policy,
    },
  ];
  const quality = [
    '| Configuration | Correct / answered | Accuracy | Earned / possible points | Points | Answered / full workload | Delivered / full workload |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...comparison.map(
      ({ name, quality: row, delivered }) =>
        `| ${name} | ${row.correct}/${row.answered} | ${pct(row.accuracyPct)} | ${row.earned}/${row.possible} | ${pct(row.pointsPct)} | ${row.answered}/${row.total} | ${delivered}/${row.total} |`,
    ),
  ].join('\n');
  const times = [
    '| Measurement | Average | Median | 95th percentile | Maximum |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...[
      ['Immediate disposition, seconds', report.immediateMs],
      ['Delivered result, seconds', report.eventualMs],
    ].map(([name, raw]) => {
      const row = raw as typeof report.immediateMs;
      return `| ${name} | ${[row.mean, row.median, row.p95, row.max].map((n) => number(n, 1000)).join(' | ')} |`;
    }),
  ].join('\n');
  const costs = [
    '| Cost per 1,000 decisions, USD | Complete costs / attempted | Average | Median | 75th percentile | 95th percentile | Maximum |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...comparison.map(
      ({ name, costs: row }) =>
        `| ${name} | ${row.complete}/${report.attempted} | ${[row.distribution.mean, row.distribution.median, row.distribution.p75, row.distribution.p95, row.distribution.max].map((n) => money(n === null ? null : n * 1000)).join(' | ')} |`,
    ),
  ].join('\n');
  return (
    [
      '# Decision fallback experiment',
      `${report.evidence}. This report does not approve activation. ${report.baselineMeaning}`,
      quality,
      'Accuracy and points use each configuration’s answered questions. An answered question remains graded even if its proposed action was rejected or arrived too late. Answer and delivery coverage use the entire frozen workload.',
      `${report.corrections} corrected answers; ${report.regressions} regressions; ${report.recoveredAnswers} recovered unanswered questions. Triggered ${report.triggered}; admitted ${report.admitted}; completed higher calls ${report.higherCompleted}. Unattempted ${report.unattempted}.`,
      `Already-correct primary answers sent for reconsideration: ${report.unnecessaryEscalation.correct}/${report.unnecessaryEscalation.answeredTriggered} answered triggering questions (${pct(report.unnecessaryEscalation.percentage)}). Primary errors that triggered reconsideration: ${report.errorDetection.detected}/${report.errorDetection.totalErrors} (${pct(report.errorDetection.percentage)}). Unflagged primary errors: ${report.unflaggedPrimaryErrors}.`,
      `Immediate-only choices resolved within one second: ${report.immediateOnly.resolvedWithinOneSecond}/${report.immediateOnly.total} (${pct(report.immediateOnly.percentage)}); ${report.immediateOnly.correctWithinOneSecond} were also correct. A timely deferral does not count as a resolved choice.`,
      times,
      `Missing timing observations: immediate ${report.missingImmediateTiming}; delivered ${report.missingDeliveredTiming}. Delivery uses elapsed time through confirmed saving.`,
      `Known total cost: ${money(report.knownCostUsd)}. Outstanding conservative commitments: ${money(report.heldUsd)}. Uncertain costs are excluded from the distributions, never treated as free.`,
      `Whole-policy cost per corrected answer: ${money(report.costPerCorrectionUsd)}. This includes all attempted questions, not only the successful corrections.`,
      costs,
      `Costs are scaled to 1,000 decisions so small amounts remain readable with two decimals. Exact observations remain in report.json and attempts.jsonl. End reasons: ${Object.entries(
        report.endings,
      )
        .map(([reason, count]) => `${reason}: ${count}`)
        .join('; ')}.`,
      `Whole-episode 95% point-gain interval: ${report.pairedPointGain95Pct ? `${number(report.pairedPointGain95Pct.lower)} to ${number(report.pairedPointGain95Pct.upper)} percentage points, using ${report.pairedPointGain95Pct.pairedQuestions} questions with interpretable answers from both routes across ${report.pairedPointGain95Pct.episodes} episode families` : 'insufficient paired evidence'}. Recovered answers are counted separately above.`,
      `${report.effectScope} Native calculation questions scored: 0. Invalid committed gameplay effects are unassessed by this experiment.`,
      report.promotion.remaining.join(' '),
    ].join('\n\n') + '\n'
  );
}
