import { sha256 } from './corpus.js';
import type { GradedCase, RunRecord } from './evaluate.js';
import { baselineChoiceQuality } from './quality-baseline.js';
import { scenarioChoiceQuality } from './quality-scenarios.js';
import { nearestOfferedCategory } from './numeric-interpretation.js';
import type { BenchmarkCase, BenchmarkScene } from './types.js';
import type {
  ClearErrorAggregate,
  ClearErrorCase,
  ClearErrorFraction,
  ClearErrorPolicy,
  ClearErrorQuery,
  ClearErrorReport,
  ClearErrorStatus,
  ModelClearErrorReport,
} from './clear-error-types.js';

const interpretation =
  'Among returned answers that this benchmark policy actually assesses, report the fraction without a detected clear objective error. Unassessed and undelivered answers are outside this quality fraction; coverage and delivery remain separate. This is not confirmed correctness, observed gameplay harm or proven engine protection. Related episode views are correlated.';
const numericProtocol =
  'Hypothetical benchmark consumer: clamp finite numeric answers to the declared domain. Objective predicates use the declared 0.5 truth threshold. Only explicitly authored count/arithmetic/time/decay Score tasks then round to the nearest integer rubric anchor, with exact halves rounded upward. Raw Score, clamped Score, rounded anchor and highest-scored anchor remain separate diagnostics; only fixed rounding determines the headline. Runtime scoped ratings have separate task contracts; this benchmark does not execute gameplay effects. No confidence clamping or per-answer choice of the most favorable interpretation.';
const denominator =
  'Only returned, actually assessed answers. Numerator: those answers without a detected clear error. Exclude unassessed, missing, refused, invalid and unattempted answers; retain their separate counts and coverage.';

// These exact baseline tasks ask for a count, quantity category or elapsed time.
// Evidence-strength, prerequisite, semantic-completeness and objective-status
// rubrics remain unassessed: rounding their labels would invent a consumer.
const baselineArithmetic = new Set([
  'act-ground-recipient-q3',
  'act-ground-follow-q3',
  'act-ground-request-control-q3',
  'act-revise-deadline-q3',
  'act-revise-style-q3',
  'act-revise-gift-q3',
  'act-revise-price-q3',
  'world-exchange-bread-q3',
  'world-exchange-reserve-q3',
  'world-institution-quorum-q3',
  'world-ecology-harvest-q3',
  'world-unusual-warmth-q3',
  'world-unusual-garden-q3',
  'world-technology-charge-q3',
]);
const optionalEvidence = new Set([
  'mem-relevance-cord-q1',
  'mem-relevance-cord-q2',
  'mem-relevance-company-q1',
  'mem-relevance-fire-q1',
  'mem-source-dream-q2',
  'mem-correction-rumor-q2',
  'mem-place-old-spring-q1',
  'mem-inspection-bag-q2',
  'mem-inspection-page-q2',
  'mem-ambiguity-signal-q2',
  'mem-adversarial-candidates-q1',
  'mem-adversarial-candidates-q2',
  'mem-continuity-rival-q1',
]);

function unassessedReason(scene: BenchmarkScene, test: BenchmarkCase): string | undefined {
  if (test.tags.includes('immediate-route'))
    return 'Reasoning route and relative inference cost do not establish an incorrect gameplay decision.';
  if (test.tags.includes('lasting-significance'))
    return 'Optional background reflection is not a factual or executable outcome.';
  if (
    test.tags.includes('action-retrieval') ||
    test.tags.includes('retrieval') ||
    optionalEvidence.has(test.id)
  )
    return 'Optional evidence/action retrieval can omit useful material or include redundant material without proving an incorrect eventual decision.';
  if (test.tags.includes('authored-action-guidance'))
    return 'Independent action-suitability ratings do not establish which action wins after ranking and the current game’s 0.7 selection threshold.';
  if (test.tags.includes('expression'))
    return 'These noncompulsory expression styles differ in authored subjective suitability, not objective legality.';
  if (test.id === 'mem-ambiguity-probability-q1')
    return 'An exact stated chance is a probability/calibration task, not a known binary outcome.';
  if (test.question.type === 'score') {
    const explicitArithmetic =
      baselineArithmetic.has(test.id) ||
      (scene.group && scene.group.view !== 'compound' && test.id === `${scene.id}-q5`) ||
      (scene.family === 'selected-joy-contract' && test.id === `${scene.id}-q3`);
    if (!explicitArithmetic)
      return 'No fixed nearest-anchor consumer is declared for this evidence, prerequisite, semantic-completeness or status rubric.';
  }
  return undefined;
}

/** Source-only compilation. Freeze/export this policy before deriving new model totals. */
export function compileClearErrorPolicy(
  scenes: readonly BenchmarkScene[],
  excludedIds: ReadonlySet<string> = new Set(),
): ClearErrorPolicy {
  const seen = new Set<string>();
  const sceneContextDigests: Record<string, string> = Object.create(null);
  const queries = scenes.flatMap((scene) => {
    if (Object.hasOwn(sceneContextDigests, scene.id))
      throw new Error(`Duplicate clear-error scene: ${scene.id}`);
    sceneContextDigests[scene.id] = sha256(scene.state);
    return scene.cases.map((test): ClearErrorQuery => {
      if (seen.has(test.id)) throw new Error(`Duplicate clear-error question: ${test.id}`);
      seen.add(test.id);
      const base = {
        id: test.id,
        sceneId: scene.id,
        episodeId: scene.group?.episodeId ?? scene.id,
        view: scene.group?.view ?? 'standalone',
        family: scene.family,
        scope: scene.scope,
        question: test.question,
        rationale: test.rationale,
        engineEnforcement:
          scene.scope === 'current-contract'
            ? ('not-demonstrated' as const)
            : ('hypothetical' as const),
        actualGameHandling:
          test.question.type === 'score'
            ? 'Runtime scoped ratings have separate task contracts; clamping and nearest-anchor rounding here are benchmark interpretation, not proof of gameplay admission.'
            : scene.outputs?.[test.id]
              ? 'Benchmark proposal bindings do not execute game effects or demonstrate native admission.'
              : 'Game consumers separately apply contextual selection/confidence gates and current native admission. This benchmark truth judgment does not simulate those callers.',
      };
      if (excludedIds.has(test.id))
        return {
          ...base,
          kind: 'reference-excluded',
          reason: 'Existing disclosed reference-review exclusion; outside this denominator.',
        };
      const reason = unassessedReason(scene, test);
      if (reason) return { ...base, kind: 'not-assessed', reason };
      if (test.question.type !== test.gold.type)
        throw new Error(`Mismatched clear-error reference: ${test.id}`);
      if (test.question.type === 'choice' && test.gold.type === 'choice') {
        const acceptedOptions = test.gold.accepted;
        const baseline = baselineChoiceQuality(scene, test),
          scenario = scenarioChoiceQuality(scene, test);
        if (baseline && scenario)
          throw new Error(`Multiple clear-error semantic owners: ${test.id}`);
        const annotations = baseline ?? scenario;
        const offered = Object.keys(test.question.criteria);
        if (
          !annotations ||
          Object.keys(annotations).length !== offered.length ||
          offered.some((key) => !Object.hasOwn(annotations, key))
        )
          throw new Error(`Incomplete clear-error semantic dispositions: ${test.id}`);
        const options = Object.fromEntries(
          offered.map((key) => {
            const annotation = annotations[key]!;
            // Reuse authored semantic distinctions, never the answer-points number.
            // A zero-point subjective judgment is not an objective contradiction;
            // safe incomplete progress remains outside this conservative error set.
            const accepted = acceptedOptions.includes(key);
            const clearError =
              !accepted &&
              (annotation.concern === 'constraint' ||
                annotation.concern === 'unsupported-evidence');
            if (!annotation.reason.trim() || (!accepted && !annotation.concern))
              throw new Error(`Missing clear-error semantic reason: ${test.id}:${key}`);
            return [
              key,
              {
                clearError,
                reason: annotation.reason,
                ...(annotation.concern ? { concern: annotation.concern } : {}),
              },
            ];
          }),
        );
        return { ...base, kind: 'choice', options };
      }
      if (test.question.type === 'noul' && test.gold.type === 'noul') {
        if (test.gold.label === undefined)
          throw new Error(`Undeclared binary clear-error label: ${test.id}`);
        return {
          ...base,
          kind: 'predicate',
          expected: test.gold.label,
          threshold: 0.5,
          domain: { min: 0, max: 1 },
          reference: {
            min: test.gold.min,
            max: test.gold.max,
            maxExclusive: test.gold.maxExclusive === true,
          },
        };
      }
      if (test.question.type === 'score' && test.gold.type === 'score') {
        const reference = test.gold,
          tolerance = reference.tolerance ?? 0,
          max = test.question.criteria.length - 1;
        const acceptedAnchors = test.question.criteria.flatMap((_, index) =>
          index >= reference.min - tolerance && index <= reference.max + tolerance ? [index] : [],
        );
        if (!acceptedAnchors.length || !Number.isFinite(tolerance) || tolerance < 0 || max <= 0)
          throw new Error(`Invalid objective rubric anchors: ${test.id}`);
        return {
          ...base,
          kind: 'rubric-anchor',
          domain: { min: 0, max },
          acceptedAnchors,
          reference: { min: reference.min, max: reference.max, tolerance },
        };
      }
      throw new Error(`Unreviewed clear-error question: ${test.id}`);
    });
  });
  if ([...excludedIds].some((id) => !seen.has(id)))
    throw new Error('Unknown clear-error reference exclusion.');
  const policy = {
    postRunReview: true as const,
    interpretation,
    numericProtocol,
    denominator,
    sceneContextDigests,
    referenceExcludedQuestionIds: [...excludedIds].sort(),
    queries,
  };
  return { ...policy, digest: sha256(policy) };
}

function classify(
  query: ClearErrorQuery,
  row: GradedCase,
): Pick<ClearErrorCase, 'clearError' | 'reason' | 'numeric'> {
  if (query.kind === 'not-assessed' || query.kind === 'reference-excluded')
    return { clearError: null, reason: query.reason };
  if (query.kind === 'choice') {
    const option =
      typeof row.predicted === 'string' && Object.hasOwn(query.options, row.predicted)
        ? query.options[row.predicted]
        : undefined;
    if (!option) throw new Error(`Unoffered decoded clear-error choice: ${query.id}`);
    return option;
  }
  if (typeof row.predicted !== 'number' || !Number.isFinite(row.predicted))
    throw new Error(`Invalid decoded clear-error scalar: ${query.id}`);
  const raw = row.predicted,
    clamped = Math.max(query.domain.min, Math.min(query.domain.max, raw));
  const within = (value: number) =>
    value >= query.domain.min &&
    value <= query.domain.max &&
    value >=
      query.reference.min - (query.kind === 'rubric-anchor' ? query.reference.tolerance : 0) &&
    (query.kind === 'predicate' && query.reference.maxExclusive
      ? value < query.reference.max
      : value <=
        query.reference.max + (query.kind === 'rubric-anchor' ? query.reference.tolerance : 0));
  const numeric = {
    raw,
    clamped,
    rawReferencePass: within(raw),
    clampedReferencePass: within(clamped),
  };
  if (query.kind === 'predicate') {
    const positive = clamped >= query.threshold;
    const correct = positive === query.expected;
    return {
      clearError: !correct,
      reason: correct
        ? 'The bounded answer gives the source-supported truth decision.'
        : 'The bounded answer gives the opposite of the source-supported truth decision.',
      numeric,
    };
  }
  const roundedAnchor = nearestOfferedCategory(raw, query.domain.max),
    roundedAnchorPass = query.acceptedAnchors.includes(roundedAnchor);
  return {
    clearError: !roundedAnchorPass,
    reason: roundedAnchorPass
      ? 'The fixed nearest-anchor interpretation gives a source-supported count or level.'
      : 'The fixed nearest-anchor interpretation gives an incorrect source-defined count or level.',
    numeric: {
      ...numeric,
      roundedAnchor,
      roundedAnchorPass,
      ...(row.scoreTopLevel === undefined
        ? {}
        : {
            highestScoredAnchor: row.scoreTopLevel,
            highestScoredAnchorPass: query.acceptedAnchors.includes(row.scoreTopLevel),
          }),
    },
  };
}

const fraction = (numerator: number, denominator: number): ClearErrorFraction => ({
  numerator,
  denominator,
  percent: denominator ? (100 * numerator) / denominator : null,
});
/** Also usable for an already selected common-covered subset. */
export function summarizeClearErrorCases(rows: readonly ClearErrorCase[]): ClearErrorAggregate {
  const eligible = rows.filter((row) => row.kind !== 'reference-excluded');
  const answered = eligible.filter((row) => row.answered);
  const classified = eligible.filter((row) => row.kind !== 'not-assessed'),
    answeredClassified = classified.filter((row) => row.answered && row.clearError !== null);
  const errors = answeredClassified.filter((row) => row.clearError === true);
  const numeric = answered.flatMap((row) => (row.numeric ? [row.numeric] : []));
  const coverage: Record<ClearErrorStatus, number> = {
    answered: 0,
    'invalid-answer': 0,
    'invalid-output': 0,
    'missing-answer': 0,
    'question-refusal': 0,
    'service-outcome': 0,
    unattempted: 0,
    'reference-excluded': 0,
  };
  for (const row of rows) coverage[row.status]++;
  return {
    totalQuestions: eligible.length,
    answeredQuestions: answered.length,
    unansweredQuestions: eligible.length - answered.length,
    classifiedQuestions: classified.length,
    answeredClassifiedQuestions: answeredClassified.length,
    notAssessedQuestions: eligible.length - classified.length,
    notAssessedAnswers: answered.length - answeredClassified.length,
    clearErrors: errors.length,
    clearErrorEpisodeGroups: new Set(errors.map((row) => row.episodeId)).size,
    assessedAnswerErrorFree: fraction(
      answeredClassified.length - errors.length,
      answeredClassified.length,
    ),
    classificationCoverage: fraction(classified.length, eligible.length),
    answeredClassificationCoverage: fraction(answeredClassified.length, answered.length),
    coverage,
    numeric: {
      answered: numeric.length,
      rawReferenceErrors: numeric.filter((row) => !row.rawReferencePass).length,
      clampedReferenceErrors: numeric.filter((row) => !row.clampedReferencePass).length,
      roundedAnchorAnswers: numeric.filter((row) => row.roundedAnchorPass !== undefined).length,
      roundedAnchorErrors: numeric.filter((row) => row.roundedAnchorPass === false).length,
      highestScoredAnchorAnswers: numeric.filter((row) => row.highestScoredAnchorPass !== undefined)
        .length,
      highestScoredAnchorErrors: numeric.filter((row) => row.highestScoredAnchorPass === false)
        .length,
    },
  };
}

function groups(rows: readonly ClearErrorCase[], field: 'scope' | 'family' | 'type' | 'episodeId') {
  const grouped = new Map<string, ClearErrorCase[]>();
  for (const row of rows) {
    let selected = grouped.get(row[field]);
    if (!selected) {
      selected = [];
      grouped.set(row[field], selected);
    }
    selected.push(row);
  }
  return Object.fromEntries(
    [...grouped]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, selected]) => [key, summarizeClearErrorCases(selected)]),
  );
}

/** Uses existing decoded grades and retained outcomes; never reads predictions during compilation. */
export function summarizeClearErrors(
  policy: ClearErrorPolicy,
  summaries: readonly { model: string; cases: readonly GradedCase[] }[],
  records: readonly RunRecord[],
): ClearErrorReport {
  const models = new Set(summaries.map((summary) => summary.model));
  if (models.size !== summaries.length) throw new Error('Duplicate clear-error model.');
  const scenes = new Set(policy.queries.map((query) => query.sceneId));
  const byModel = new Map<string, Map<string, { record: RunRecord; refusals: Set<string> }>>();
  for (const record of records) {
    if (
      !models.has(record.model) ||
      !scenes.has(record.sceneId) ||
      record.sceneId.startsWith('generate-')
    )
      continue;
    let selected = byModel.get(record.model);
    if (!selected) {
      selected = new Map();
      byModel.set(record.model, selected);
    }
    if (selected.has(record.sceneId)) throw new Error('Duplicate clear-error comparison record.');
    selected.set(record.sceneId, {
      record,
      refusals: new Set(record.result.receipt.questionRefusals ?? []),
    });
  }
  const results: ModelClearErrorReport[] = summaries.map((summary) => {
    const grades = new Map(summary.cases.map((row) => [row.id, row]));
    if (grades.size !== summary.cases.length)
      throw new Error('Duplicate decoded clear-error grade.');
    const cases = policy.queries.map((query): ClearErrorCase => {
      const base = {
        id: query.id,
        sceneId: query.sceneId,
        episodeId: query.episodeId,
        family: query.family,
        scope: query.scope,
        type: query.question.type,
        kind: query.kind,
        answered: false,
        clearError: null,
        predicted: null,
        engineEnforcement: query.engineEnforcement,
      };
      if (query.kind === 'reference-excluded')
        return { ...base, status: 'reference-excluded', reason: query.reason };
      const row = grades.get(query.id);
      if (!row || row.sceneId !== query.sceneId || row.type !== query.question.type)
        throw new Error(`Mismatched decoded clear-error grade: ${query.id}`);
      const observed = byModel.get(summary.model)?.get(query.sceneId);
      if (!observed)
        return { ...base, status: 'unattempted', reason: 'No attempt exists for this scene.' };
      const result = observed.record.result;
      if (result.outcome !== 'value')
        return {
          ...base,
          status:
            result.outcome === 'refused' && observed.refusals.has(query.id)
              ? 'question-refusal'
              : result.outcome === 'invalid'
                ? 'invalid-output'
                : 'service-outcome',
          reason: `No substantive answer: ${result.outcome}.`,
        };
      if (!row.answered)
        return {
          ...base,
          status: observed.refusals.has(query.id)
            ? 'question-refusal'
            : Object.hasOwn(result.value.answers, query.id)
              ? 'invalid-answer'
              : 'missing-answer',
          reason: 'No usable decoded answer was supplied.',
        };
      return {
        ...base,
        status: 'answered',
        answered: true,
        predicted: row.predicted,
        ...classify(query, row),
      };
    });
    return {
      model: summary.model,
      ...summarizeClearErrorCases(cases),
      scopes: groups(cases, 'scope'),
      families: groups(cases, 'family'),
      types: groups(cases, 'type'),
      episodeGroups: groups(cases, 'episodeId'),
      cases,
    };
  });
  const indexes = results.map((model) => new Map(model.cases.map((row) => [row.id, row])));
  const commonIds = policy.queries
    .filter(
      (query) =>
        query.kind !== 'reference-excluded' &&
        indexes.length > 0 &&
        indexes.every((index) => index.get(query.id)?.answered),
    )
    .map((query) => query.id);
  return {
    policyDigest: policy.digest,
    interpretation: policy.interpretation,
    numericProtocol: policy.numericProtocol,
    denominator: policy.denominator,
    referenceExcludedQuestionIds: policy.referenceExcludedQuestionIds,
    models: results,
    commonAnswered: {
      questionIds: commonIds,
      models: results.map((model, index) => ({
        model: model.model,
        ...summarizeClearErrorCases(commonIds.map((id) => indexes[index]!.get(id)!)),
      })),
    },
  };
}
