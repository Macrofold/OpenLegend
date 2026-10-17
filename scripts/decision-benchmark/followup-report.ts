import { sha256 } from './corpus.js';
import { compileClearErrorPolicy, summarizeClearErrors } from './clear-errors.js';
import { summarizeRequestMetrics, weightedPointTotals } from './metric-summary.js';
import { prepareReferenceReport, reviewedReferenceReport } from './reference-report.js';
import type { RunRecord } from './evaluate.js';
import type { QualityAggregate } from './quality-types.js';
import type { BenchmarkScene } from './types.js';

const fraction = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  percent: denominator ? (numerator / denominator) * 100 : null,
});

function pointViews(aggregate: QualityAggregate) {
  const totals = weightedPointTotals(aggregate);
  return {
    returned: {
      earnedPoints: totals.earnedPoints,
      possiblePoints: totals.answeredPossiblePoints,
      percentage: totals.answeredPercentage,
    },
    delivery: {
      earnedPoints: totals.earnedPoints,
      possiblePoints: totals.possiblePoints,
      percentage: totals.percentage,
    },
  };
}

/** Reuse native decoding, reviewed references and request receipts. This report
 * describes benchmark decisions, not effects admitted or executed by the game.
 */
export function prepareDetailedBenchmarkReport(
  scenes: BenchmarkScene[],
  frozenClearPolicy: unknown,
) {
  const prepared = prepareReferenceReport(scenes);
  const clearPolicy = compileClearErrorPolicy(
    prepared.review.scenes,
    new Set(prepared.review.excludedIds),
  );
  if (sha256(clearPolicy) !== sha256(frozenClearPolicy))
    throw new Error('Frozen clear-error policy differs from the selected source policy.');
  return { prepared, clearPolicy };
}

export function detailedBenchmarkReport(
  scenes: BenchmarkScene[],
  records: RunRecord[],
  models: string[],
  preparation: ReturnType<typeof prepareDetailedBenchmarkReport>,
) {
  const { prepared, clearPolicy } = preparation;
  const reviewed = reviewedReferenceReport(scenes, records, models, prepared);
  const clearErrors = summarizeClearErrors(clearPolicy, reviewed.models, records);
  const points = new Map(reviewed.answerPoints.models.map((model) => [model.model, model]));
  const commonPoints = new Map(
    reviewed.answerPoints.commonAnswered.models.map((model) => [model.model, model]),
  );
  const commonQuestionIds = new Set(reviewed.answerPoints.commonAnswered.questionIds);
  const excluded = new Set(prepared.review.excludedIds);
  const commonScenes = new Set(
    scenes
      .filter((scene) => {
        const included = scene.cases.filter((test) => !excluded.has(test.id));
        return included.length > 0 && included.every((test) => commonQuestionIds.has(test.id));
      })
      .map((scene) => scene.id),
  );
  const commonClear = new Map(
    clearErrors.commonAnswered.models.map((model) => [model.model, model]),
  );
  if (
    clearErrors.commonAnswered.questionIds.length !== commonQuestionIds.size ||
    clearErrors.commonAnswered.questionIds.some((id) => !commonQuestionIds.has(id))
  )
    throw new Error('Clear-error and quality reports disagree on common answered coverage.');
  return {
    qualityPolicyDigest: prepared.qualityPolicy.digest,
    referencePolicyDigest: sha256(prepared.review.amendments),
    clearErrorPolicyDigest: clearPolicy.digest,
    limitation:
      'No game effects executed. Clear errors are source-authored benchmark judgments after the disclosed handling, not measured gameplay harm or proof that native admission would reject an answer.',
    metricInterpretation: {
      primaryQuality: 'Strict accuracy and answer points use returned usable answers only.',
      assessedAnswerErrorFree:
        'Returned, actually assessed answers without a detected clear error divided by all returned, actually assessed answers. Unassessed answers supply no quality credit.',
      deliveryDiagnostics:
        'Complete-workload strict/points figures include undelivered answers and describe delivery, not returned-answer quality. Coverage and service outcomes remain separate.',
    },
    models: reviewed.models.map((model) => {
      const quality = points.get(model.model)!;
      const clear = clearErrors.models.find((entry) => entry.model === model.model)!;
      const common = commonPoints.get(model.model)!;
      const decodedCommon = model.cases.filter((row) => commonQuestionIds.has(row.id));
      const weighted = pointViews(quality);
      return {
        model: model.model,
        answered: fraction(model.answeredQuality.total, model.total),
        strict: fraction(model.answeredQuality.passed, model.answeredQuality.total),
        weighted: weighted.returned,
        deliveryDiagnostics: {
          strict: fraction(model.passed, model.total),
          weighted: weighted.delivery,
        },
        clearErrorCount: clear.clearErrors,
        assessedAnswerErrorFree: clear.assessedAnswerErrorFree,
        clearErrorClassificationCoverage: clear.classificationCoverage,
        commonAnswered: {
          strict: fraction(decodedCommon.filter((row) => row.pass).length, decodedCommon.length),
          weighted: pointViews(common).returned,
          clearErrorCount: commonClear.get(model.model)!.clearErrors,
          assessedAnswerErrorFree: commonClear.get(model.model)!.assessedAnswerErrorFree,
        },
        types: Object.fromEntries(
          ['choice', 'noul', 'score'].map((type) => {
            const rows = model.cases.filter((row) => row.type === type);
            const returned = rows.filter((row) => row.answered);
            const weighted = pointViews(quality.types[type]!);
            return [
              type,
              {
                strict: fraction(returned.filter((row) => row.pass).length, returned.length),
                answered: fraction(returned.length, rows.length),
                weighted: weighted.returned,
                deliveryDiagnostics: {
                  strict: fraction(rows.filter((row) => row.pass).length, rows.length),
                  weighted: weighted.delivery,
                },
              },
            ];
          }),
        ),
        scoreHighestLevel: model.scoreLevelAgreement,
        numericalHandling: clear.numeric,
        serviceOutcomes: model.outcomes,
      };
    }),
    commonCoverage: {
      questions: commonQuestionIds.size,
      whollyCommonSceneCallsPerModel: commonScenes.size,
      includedByView: Object.fromEntries(
        [...new Set(scenes.map((scene) => scene.group?.view ?? 'ungrouped'))].map((view) => {
          const questions = scenes
            .filter((scene) => (scene.group?.view ?? 'ungrouped') === view)
            .flatMap((scene) => scene.cases)
            .filter((test) => !excluded.has(test.id));
          return [
            view,
            fraction(
              questions.filter((test) => commonQuestionIds.has(test.id)).length,
              questions.length,
            ),
          ];
        }),
      ),
    },
    requestMetrics: summarizeRequestMetrics(records, models, commonScenes),
    generation: reviewed.generation,
    clearErrors,
  };
}
