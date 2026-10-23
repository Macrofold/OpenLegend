import {
  usdToMicroUsd,
  sumSafeIntegers,
  type AiResult,
  type JudgeValue,
  type JudgmentAnswer,
  type JsonValue,
} from '../../packages/ai/src/index.js';
import type { BenchmarkCase, BenchmarkScene } from './types.js';
import { decodeAnswer } from './options.js';
import { permittedReaction } from './reaction-policy.js';
import { armById, type BenchmarkArm } from './arms.js';
import { nearestOfferedCategory } from './numeric-interpretation.js';
import { assertPairwiseReportFits } from './evidence-limits.js';

export interface GradedCase {
  id: string;
  sceneId: string;
  family: string;
  scope: string;
  difficulty: string;
  ambiguity: string;
  type: string;
  tags: string[];
  answered: boolean;
  structuredOutput?: JsonValue;
  reactionLegal?: boolean;
  pass: boolean;
  predicted: string | number | null;
  /** The raw scalar remains in predicted; Score accuracy uses this offered category. */
  interpretedScore?: number;
  rawReferencePass?: boolean;
  normalizedError: number;
  probabilityValid?: boolean;
  scoreTopLevel?: number;
  scoreTopLevelPass?: boolean;
  brier?: number;
  logLoss?: number;
}
export function grade(
  scene: BenchmarkScene,
  test: BenchmarkCase,
  answer?: JudgmentAnswer,
): GradedCase {
  const row: GradedCase = {
    id: test.id,
    sceneId: scene.id,
    family: scene.family,
    scope: scene.scope,
    difficulty: test.difficulty,
    ambiguity: test.ambiguity,
    type: test.question.type,
    tags: test.tags,
    answered: answer !== undefined && answer.type === test.gold.type,
    pass: false,
    predicted: null,
    normalizedError: 1,
  };
  if (!answer || answer.type !== test.gold.type) return row;
  const gold = test.gold;
  if (answer.type === 'choice' && gold.type === 'choice' && test.question.type === 'choice') {
    row.predicted = answer.choice;
    const output = scene.outputs?.[test.id]?.[answer.choice];
    if (output !== undefined) row.structuredOutput = output;
    if (output !== undefined && test.tags.includes('structured-reaction')) {
      const encounter = scene.state.encounter as
        | { newPersonallyPerceivedCause?: boolean }
        | undefined;
      row.reactionLegal = permittedReaction(
        scene.state.feelingPolicy,
        output,
        encounter?.newPersonallyPerceivedCause === true,
      );
    }
    row.pass = gold.accepted.includes(answer.choice);
    row.normalizedError = row.pass ? 0 : 1;
    // Raw finite decision scores remain useful for selection even when they are not probabilities.
    const keys = Object.keys(test.question.criteria);
    const values = keys.map((key) => answer.probabilities[key]);
    row.probabilityValid =
      values.every((p) => p !== undefined && Number.isFinite(p) && p >= 0 && p <= 1) &&
      Math.abs(values.reduce<number>((sum, p) => sum + (p ?? 0), 0) - 1) <= 0.001;
    if (gold.accepted.length === 1 && test.ambiguity === 'unambiguous' && row.probabilityValid) {
      row.brier = keys.reduce(
        (sum, key) =>
          sum + ((answer.probabilities[key] ?? 0) - (key === gold.accepted[0] ? 1 : 0)) ** 2,
        0,
      );
      row.logLoss = -Math.log(Math.max(1e-15, answer.probabilities[gold.accepted[0]!] ?? 0));
    }
  } else if (answer.type !== 'choice' && gold.type !== 'choice') {
    const value = answer.type === 'noul' ? answer.noul : answer.score;
    row.predicted = value;
    const tolerance = gold.type === 'score' ? (gold.tolerance ?? 0) : 0;
    const withinReference = (candidate: number) =>
      Number.isFinite(candidate) &&
      candidate >= 0 &&
      candidate <= (test.question.type === 'score' ? test.question.criteria.length - 1 : 1) &&
      candidate >= gold.min - tolerance &&
      (gold.type === 'noul' && gold.maxExclusive
        ? candidate < gold.max
        : candidate <= gold.max + tolerance);
    const interpreted =
      answer.type === 'score' && test.question.type === 'score'
        ? nearestOfferedCategory(value, test.question.criteria.length - 1)
        : value;
    row.pass = withinReference(interpreted);
    if (answer.type === 'score' && test.question.type === 'score') {
      row.interpretedScore = interpreted;
      row.rawReferencePass = withinReference(value);
      const indices = test.question.criteria.map((_, index) => index);
      if (indices.every((index) => Number.isFinite(answer.probabilities[String(index)]))) {
        // Ranking remains separate from the fixed nearest-category interpretation.
        // Complete finite vectors suffice; their sum does not affect the greatest level.
        row.scoreTopLevel = indices.reduce((best, index) =>
          answer.probabilities[String(index)]! > answer.probabilities[String(best)]! ? index : best,
        );
        row.scoreTopLevelPass = withinReference(row.scoreTopLevel);
      }
    }
    const scale = test.question.type === 'score' ? test.question.criteria.length - 1 : 1;
    // Preserve the returned scalar's distance independently of interpreted accuracy.
    row.normalizedError = Math.min(1, Math.max(gold.min - value, value - gold.max, 0) / scale);
    if (answer.type === 'noul' && gold.type === 'noul' && gold.label !== undefined) {
      row.probabilityValid = Number.isFinite(value) && value >= 0 && value <= 1;
      if (row.probabilityValid && test.ambiguity === 'unambiguous') {
        row.brier = (value - Number(gold.label)) ** 2;
        row.logLoss = -Math.log(Math.max(1e-15, gold.label ? value : 1 - value));
      }
    }
  }
  return row;
}

export interface RunRecord {
  sceneId: string;
  model: string;
  requestId: string;
  inputDigest: string;
  /** Explicit wire-mode provenance; omission means nonstreaming delivery. */
  stream?: true;
  result: AiResult<JudgeValue>;
  generation?: JsonValue;
  outputMode?: 'json_schema' | 'json_object' | 'prompted_json';
  executionPhase?: string;
  /** Complete study attempt: capability preparation, admission persistence and inference. */
  attemptLatencyMs?: number;
}
/** Reports reuse this index rather than scanning every replicate's complete history. */
export function groupByModel<T extends { model: string }>(records: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const rows = groups.get(record.model);
    if (rows) rows.push(record);
    else groups.set(record.model, [record]);
  }
  return groups;
}
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;
function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : null;
}
function summarizeCases(rows: GradedCase[]) {
  return {
    total: rows.length,
    passed: rows.filter((r) => r.pass).length,
    accuracy: mean(rows.map((r) => Number(r.pass))),
    meanNormalizedError: mean(rows.map((r) => r.normalizedError)),
  };
}
function summarizeCoverage(rows: GradedCase[]) {
  return {
    ...summarizeCases(rows),
    answeredQuality: summarizeCases(rows.filter((row) => row.answered)),
  };
}
function groups(rows: GradedCase[], key: 'family' | 'scope' | 'difficulty' | 'ambiguity' | 'type') {
  return Object.fromEntries(
    [...new Set(rows.map((r) => r[key]))]
      .sort()
      .map((value) => [value, summarizeCoverage(rows.filter((r) => r[key] === value))]),
  );
}
export function summarize(
  corpus: BenchmarkScene[],
  records: RunRecord[],
  models: string[],
  excludedIds: ReadonlySet<string> = new Set(),
  availableArms: ReadonlyMap<string, BenchmarkArm> = armById,
) {
  assertPairwiseReportFits(
    models.length,
    models.reduce((bytes, model) => bytes + Buffer.byteLength(JSON.stringify(model)) - 2, 0),
  );
  // Keep the complete original scene when decoding: memory-order choice handles
  // depend on the original question position. Exclusion changes grading only.
  const includedCases = (scene: BenchmarkScene) =>
    scene.cases.filter((test) => !excludedIds.has(test.id));
  const sceneById = new Map(corpus.map((s) => [s.id, s]));
  const recordsByModel = groupByModel(records);
  const summaries = models.map((model) => {
    const runs = recordsByModel.get(model) ?? [];
    const byScene = new Map(runs.map((r) => [r.sceneId, r]));
    const rows = corpus.flatMap((scene) =>
      includedCases(scene).map((test) => {
        const result = byScene.get(scene.id)?.result;
        return grade(
          scene,
          test,
          decodeAnswer(
            scene,
            test,
            result?.outcome === 'value' ? result.value.answers[test.id] : undefined,
          ),
        );
      }),
    );
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const scoreRows = rows.filter((row) => row.type === 'score' && row.answered);
    const completeScores = scoreRows.filter((row) => row.scoreTopLevelPass !== undefined);
    const priced = runs.filter(
      (r) =>
        r.result.receipt.estimatedCostUsd !== undefined && !r.result.receipt.completionUncertain,
    );
    const sumCost =
      (sumSafeIntegers(
        priced.map((r) => usdToMicroUsd(r.result.receipt.estimatedCostUsd) ?? NaN),
      ) ?? NaN) / 1e6;
    return {
      model,
      probabilitySource:
        availableArms.get(model)?.transport.includes('generation') ||
        availableArms.get(model)?.transport === 'openai-response'
          ? 'llm-self-reported'
          : 'native-decision',
      reportedModels: [...new Set(runs.map((r) => r.result.receipt.model))].map((reported) => ({
        model: reported,
        runs: runs.filter((r) => r.result.receipt.model === reported).length,
        versionReported: runs.filter(
          (r) =>
            r.result.receipt.model === reported &&
            r.result.receipt.modelVersionStatus === 'reported',
        ).length,
      })),
      ...summarizeCases(rows),
      answeredQuality: summarizeCases(rows.filter((r) => r.answered)),
      questionRefusals: {
        questions: runs.reduce(
          (count, run) =>
            count +
            (run.result.receipt.questionRefusals ?? []).filter((id) => !excludedIds.has(id)).length,
          0,
        ),
        scenes: runs.filter((run) => (run.result.receipt.questionRefusals?.length ?? 0) > 0).length,
      },
      scoreLevelAgreement: {
        answered: scoreRows.length,
        completeVectors: completeScores.length,
        topLevelPassed: completeScores.filter((row) => row.scoreTopLevelPass).length,
        topLevelAgreement: mean(completeScores.map((row) => Number(row.scoreTopLevelPass))),
        strictScorePassedOnCompleteVectors: completeScores.filter((row) => row.pass).length,
        strictFailTopPass: completeScores.filter((row) => !row.pass && row.scoreTopLevelPass)
          .length,
        strictPassTopFail: completeScores.filter((row) => row.pass && !row.scoreTopLevelPass)
          .length,
      },
      unattemptedScenes: corpus.filter((s) => !byScene.has(s.id)).length,
      attemptedScenes: runs.length,
      strictScenePasses: corpus.filter((s) =>
        includedCases(s).every((test) => rowsById.get(test.id)?.pass),
      ).length,
      outcomes: Object.fromEntries(
        [...new Set(runs.map((r) => r.result.outcome))].map((outcome) => [
          outcome,
          runs.filter((r) => r.result.outcome === outcome).length,
        ]),
      ),
      families: groups(rows, 'family'),
      scopes: groups(rows, 'scope'),
      difficulties: groups(rows, 'difficulty'),
      ambiguities: groups(rows, 'ambiguity'),
      types: groups(rows, 'type'),
      evidenceKinds: Object.fromEntries(
        ['mechanical-contract', 'reference-psychology'].map((tag) => [
          tag,
          summarizeCoverage(rows.filter((r) => r.tags.includes(tag))),
        ]),
      ),
      reactionLegality: {
        answered: rows.filter((r) => r.reactionLegal !== undefined).length,
        legal: rows.filter((r) => r.reactionLegal === true).length,
        illegal: rows.filter((r) => r.reactionLegal === false).length,
      },
      moodComparisons: corpus
        // A missed-question subset does not contain complete matched experiments.
        .filter((s) => !s.questionOrder && s.group?.view === 'mood-rested')
        .flatMap((rested) => {
          const strained = corpus.find(
            (s) =>
              s.group?.episodeId === rested.group?.episodeId && s.group?.view === 'mood-strained',
          );
          if (!strained || strained.questionOrder) return [];
          const a = rowsById.get(rested.cases[1]!.id)!,
            b = rowsById.get(strained.cases[1]!.id)!;
          const selectedFeeling = (row: GradedCase) => {
            const value = row.structuredOutput as
              | { kind?: string; policy?: string; intensity?: number }
              | undefined;
            return value?.kind === 'none'
              ? { policy: 'none', intensity: 0 }
              : { policy: value?.policy ?? null, intensity: value?.intensity ?? null };
          };
          const av = selectedFeeling(a),
            bv = selectedFeeling(b);
          return [
            {
              episodeId: rested.group!.episodeId,
              bothAnswered: a.answered && b.answered,
              restedFeeling: av.policy,
              strainedFeeling: bv.policy,
              restedIntensity: av.intensity,
              strainedIntensity: bv.intensity,
              sameFeelingIntensityDifference:
                av.policy !== bv.policy || av.intensity === null || bv.intensity === null
                  ? null
                  : bv.intensity - av.intensity,
              frustrationIntensityDifference:
                [av.policy, bv.policy].every((p) => p === 'none' || p === 'frustration') &&
                av.intensity !== null &&
                bv.intensity !== null
                  ? bv.intensity - av.intensity
                  : null,
              restedTone: rowsById.get(rested.cases[2]!.id)?.predicted,
              strainedTone: rowsById.get(strained.cases[2]!.id)?.predicted,
            },
          ];
        }),
      splits: Object.fromEntries(
        ['development', 'challenge', 'holdout'].map((split) => [
          split,
          summarizeCoverage(rows.filter((r) => sceneById.get(r.sceneId)?.group?.split === split)),
        ]),
      ),
      robustness: corpus
        .filter((s) => !s.questionOrder && s.group?.view === 'control')
        .map((control) => {
          const variants = corpus.filter((s) => s.group?.episodeId === control.group?.episodeId);
          const unchanged = variants.filter((s) =>
            ['control', 'dense', 'order-control', 'reordered', 'option-order', 'capacity'].includes(
              s.group!.view,
            ),
          );
          const fullyAnswered = unchanged.every((s) =>
            includedCases(s).every((t) => rowsById.get(t.id)?.answered),
          );
          return {
            episodeId: control.group!.episodeId,
            fullyAnswered,
            allUnchangedViewsPass:
              fullyAnswered &&
              unchanged.every((s) => includedCases(s).every((t) => rowsById.get(t.id)?.pass)),
            stableSelections: fullyAnswered
              ? control.cases
                  .flatMap((test, i) =>
                    excludedIds.has(test.id)
                      ? []
                      : [unchanged.map((s) => rowsById.get(s.cases[i]!.id)?.predicted)],
                  )
                  .every((values) => values.every((v) => v === values[0]))
              : null,
            changedViewPass: variants
              .filter((s) => s.group?.view === 'changed')
              .some((s) => includedCases(s).every((t) => rowsById.get(t.id)?.pass)),
          };
        }),
      latencyMs: {
        p50: percentile(
          runs.map((r) => r.result.receipt.latencyMs),
          0.5,
        ),
        p95: percentile(
          runs.map((r) => r.result.receipt.latencyMs),
          0.95,
        ),
        max: percentile(
          runs.map((r) => r.result.receipt.latencyMs),
          1,
        ),
      },
      attemptLatencyMs: {
        p50: percentile(
          runs.flatMap((r) => (r.attemptLatencyMs === undefined ? [] : [r.attemptLatencyMs])),
          0.5,
        ),
        p95: percentile(
          runs.flatMap((r) => (r.attemptLatencyMs === undefined ? [] : [r.attemptLatencyMs])),
          0.95,
        ),
      },
      providerLatencyMs: {
        p50: percentile(
          runs.flatMap((r) =>
            r.result.receipt.providerLatencyMs === undefined
              ? []
              : [r.result.receipt.providerLatencyMs],
          ),
          0.5,
        ),
        p95: percentile(
          runs.flatMap((r) =>
            r.result.receipt.providerLatencyMs === undefined
              ? []
              : [r.result.receipt.providerLatencyMs],
          ),
          0.95,
        ),
      },
      executionPhases: Object.fromEntries(
        [...new Set(runs.map((r) => r.executionPhase ?? 'initial'))].map((phase) => {
          const selected = runs.filter((r) => (r.executionPhase ?? 'initial') === phase);
          return [
            phase,
            {
              runs: selected.length,
              p50LatencyMs: percentile(
                selected.map((r) => r.result.receipt.latencyMs),
                0.5,
              ),
              p95LatencyMs: percentile(
                selected.map((r) => r.result.receipt.latencyMs),
                0.95,
              ),
            },
          ];
        }),
      ),
      usageBasedEstimatedCostUsd: sumCost,
      providerReportedCostUsd: runs.reduce(
        (sum, r) => sum + (r.result.receipt.providerReportedCostUsd ?? 0),
        0,
      ),
      providerInvoiceMissingRuns: runs.filter(
        (r) => r.result.receipt.providerReportedCostUsd === undefined,
      ).length,
      pricedRuns: priced.length,
      unpricedOrUncertainRuns: runs.length - priced.length,
      inputTokens: runs.reduce((sum, r) => sum + (r.result.receipt.usage?.inputTokens ?? 0), 0),
      usageMissingRuns: runs.filter((r) => !r.result.receipt.usage).length,
      calibration: Object.fromEntries(
        ['noul', 'choice'].map((type) => {
          const selected = rows.filter((r) => r.type === type);
          return [
            type,
            {
              scoredCases: selected.filter((r) => r.brier !== undefined).length,
              meanBrier: mean(selected.flatMap((r) => (r.brier === undefined ? [] : [r.brier]))),
              meanLogLoss: mean(
                selected.flatMap((r) => (r.logLoss === undefined ? [] : [r.logLoss])),
              ),
              invalidProbabilityCases: selected.filter((r) => r.probabilityValid === false).length,
            },
          ];
        }),
      ),
      failures: rows.filter((r) => !r.pass),
      cases: rows,
    };
  });
  const [a, b] = summaries;
  const paired =
    a && b
      ? {
          bothPass: a.cases.filter((r, i) => r.pass && b.cases[i]?.pass).length,
          firstOnly: a.cases.filter((r, i) => r.pass && !b.cases[i]?.pass).length,
          secondOnly: a.cases.filter((r, i) => !r.pass && b.cases[i]?.pass).length,
          bothFail: a.cases.filter((r, i) => !r.pass && !b.cases[i]?.pass).length,
          disagreements: a.cases.filter((r, i) => r.predicted !== b.cases[i]?.predicted).length,
        }
      : null;
  const rowMaps = summaries.map((s) => new Map(s.cases.map((r) => [r.id, r])));
  const common = corpus
    .flatMap(includedCases)
    .map((t) => t.id)
    .filter((id) => rowMaps.every((rows) => rows.get(id)?.answered));
  const commonSet = new Set(common);
  const commonCalibration = Object.fromEntries(
    ['noul', 'choice'].map((type) => {
      const ids = new Set(
        common.filter((id) => rowMaps.every((rows) => rows.get(id)?.brier !== undefined)),
      );
      return [
        type,
        summaries.map((s) => {
          const rows = s.cases.filter((r) => r.type === type && ids.has(r.id));
          return {
            model: s.model,
            cases: rows.length,
            meanBrier: mean(rows.map((r) => r.brier!)),
            meanLogLoss: mean(rows.map((r) => r.logLoss!)),
          };
        }),
      ];
    }),
  );
  return {
    models: summaries,
    paired,
    commonAnswered: summaries.map((s) => ({
      model: s.model,
      ...summarizeCases(s.cases.filter((r) => commonSet.has(r.id))),
    })),
    commonCalibration,
    pairwise: models.flatMap((first, i) =>
      models.slice(i + 1).map((second, offset) => {
        const a = summaries[i]!,
          bm = rowMaps[i + offset + 1]!;
        const common = a.cases.filter((r) => r.answered && bm.get(r.id)?.answered);
        return {
          first,
          second,
          commonAnswered: common.length,
          firstPass: common.filter((r) => r.pass).length,
          secondPass: common.filter((r) => bm.get(r.id)!.pass).length,
          bothPass: common.filter((r) => r.pass && bm.get(r.id)!.pass).length,
          firstOnly: common.filter((r) => r.pass && !bm.get(r.id)!.pass).length,
          secondOnly: common.filter((r) => !r.pass && bm.get(r.id)!.pass).length,
          bothFail: common.filter((r) => !r.pass && !bm.get(r.id)!.pass).length,
        };
      }),
    ),
  };
}
