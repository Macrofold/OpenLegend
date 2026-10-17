import { sha256 } from './corpus.js';
import type { GradedCase, RunRecord } from './evaluate.js';
import { baselineChoiceQuality } from './quality-baseline.js';
import { scenarioChoiceQuality } from './quality-scenarios.js';
import { nearestOfferedCategory } from './numeric-interpretation.js';
import type {
  ModelQualityReport,
  QualityAggregate,
  QualityCase,
  QualityConcern,
  QualityOption,
  QualityPolicy,
  QualityQuery,
  QualityReport,
  QualityStatus,
} from './quality-types.js';
import type { BenchmarkScene } from './types.js';

const numericFormula =
  'Score: bound a finite scalar to the offered rubric range and round to the nearest position, with exact halves upward. Noul remains continuous. Reference pass: 100. Otherwise: 100 * (1 - interpretedDistanceToToleratedBand / fullDeclaredSpan). Invalid numeric output: 0.';
const numericInterpretation =
  'Score accuracy and points use the same nearest offered category; the original scalar remains recorded. Probability points use the continuous supplied reference band. These are not calibrated correctness or gameplay utility. An excluded open probability endpoint can have zero distance and 100 closeness while remaining a strict boundary miss.';
const aggregateInterpretation =
  'Equal-question means combine source-authored categorical credits with numerical reference closeness. Compare their separate breakdowns and labeled binary decision mistakes; the combined mean is not a measure of decision safety or gameplay utility.';
const concerns = new Set<QualityConcern>([
  'constraint',
  'unsupported-evidence',
  'subjective',
  'goal-shortfall',
  'irrelevant',
]);

/** Grading-only metadata: no additions to frozen scenes, inputs, references or receipts. */
export function compileQualityPolicy(
  scenes: readonly BenchmarkScene[],
  excludedIds: ReadonlySet<string> = new Set(),
): QualityPolicy {
  const seen = new Set<string>();
  const sceneContextDigests: Record<string, string> = Object.create(null);
  for (const scene of scenes) {
    if (Object.hasOwn(sceneContextDigests, scene.id))
      throw new Error(`Duplicate quality scene: ${scene.id}`);
    sceneContextDigests[scene.id] = sha256(scene.state);
  }
  const queries = scenes.flatMap((scene) =>
    scene.cases.map((test): QualityQuery => {
      if (seen.has(test.id)) throw new Error(`Duplicate quality question: ${test.id}`);
      seen.add(test.id);
      const base = {
        id: test.id,
        sceneId: scene.id,
        family: scene.family,
        scope: scene.scope,
        tags: [...test.tags],
        questionType: test.question.type,
        question: test.question,
        referenceRationale: test.rationale,
      };
      if (excludedIds.has(test.id))
        return { ...base, kind: 'excluded', reason: 'Excluded by the disclosed reference review.' };
      if (test.gold.type === 'choice' && test.question.type === 'choice') {
        const baseline = baselineChoiceQuality(scene, test);
        const scenario = scenarioChoiceQuality(scene, test);
        if (baseline && scenario) throw new Error(`Multiple quality owners: ${test.id}`);
        const authored = baseline ?? scenario;
        const offered = Object.keys(test.question.criteria);
        if (
          !authored ||
          Object.keys(authored).length !== offered.length ||
          offered.some((key) => !Object.hasOwn(authored, key))
        )
          throw new Error(`Incomplete authored quality rubric: ${test.id}`);
        const options: Record<string, QualityOption> = Object.fromEntries(
          offered.map((key) => {
            const option = authored[key];
            if (
              !option ||
              !Number.isFinite(option.points) ||
              option.points < 0 ||
              option.points > 100 ||
              !option.reason.trim() ||
              (option.concern !== undefined && !concerns.has(option.concern)) ||
              (test.gold.type === 'choice' &&
                test.gold.accepted.includes(key) !== (option.points === 100))
            )
              throw new Error(`Invalid authored quality credit: ${test.id}:${key}`);
            return [key, { ...option }];
          }),
        );
        return { ...base, kind: 'categorical', accepted: [...test.gold.accepted], options };
      }
      if (test.gold.type === 'choice' || test.gold.type !== test.question.type)
        throw new Error(`Mismatched quality reference: ${test.id}`);
      const maximum = test.question.type === 'score' ? test.question.criteria.length - 1 : 1;
      const tolerance = test.gold.type === 'score' ? (test.gold.tolerance ?? 0) : 0;
      if (!Number.isFinite(tolerance) || tolerance < 0 || maximum <= 0)
        throw new Error(`Invalid numeric quality range: ${test.id}`);
      return {
        ...base,
        kind: 'numeric-reference-closeness',
        domain: { min: 0, max: maximum },
        reference: {
          min: test.gold.min,
          max: test.gold.max,
          tolerance,
          maxExclusive: test.gold.type === 'noul' && test.gold.maxExclusive === true,
          ...(test.gold.type === 'noul' && test.gold.label !== undefined
            ? { label: test.gold.label }
            : {}),
        },
        toleratedBand: {
          min: Math.max(0, test.gold.min - tolerance),
          max: Math.min(maximum, test.gold.max + tolerance),
        },
      };
    }),
  );
  if ([...excludedIds].some((id) => !seen.has(id)))
    throw new Error('Excluded quality question is outside the selected corpus.');
  const policy = {
    scope: 'native-shaped-questions' as const,
    weighting: 'equal-per-included-question' as const,
    postRunReview: true as const,
    sceneContextDigests,
    numericFormula,
    numericInterpretation,
    aggregateInterpretation,
    excludedQuestionIds: [...excludedIds].sort(),
    queries,
  };
  return { ...policy, digest: sha256(policy) };
}

function scoreAnswer(
  query: QualityQuery,
  row: GradedCase,
): Pick<QualityCase, 'points' | 'reason' | 'concern' | 'numeric' | 'status'> {
  if (query.kind === 'categorical' && typeof row.predicted === 'string') {
    const option = Object.hasOwn(query.options, row.predicted)
      ? query.options[row.predicted]
      : undefined;
    if (option) return { status: 'answered', ...option };
  } else if (query.kind === 'numeric-reference-closeness' && typeof row.predicted === 'number') {
    const value =
      query.questionType === 'score'
        ? nearestOfferedCategory(row.predicted, query.domain.max)
        : row.predicted;
    if (Number.isFinite(value) && value >= query.domain.min && value <= query.domain.max) {
      const distance = Math.max(
        query.toleratedBand.min - value,
        value - query.toleratedBand.max,
        0,
      );
      const normalizedDistance = distance / (query.domain.max - query.domain.min);
      const boundaryMiss =
        !row.pass && query.reference.maxExclusive && value === query.reference.max;
      const positiveDecision = value >= 0.5;
      return {
        status: 'answered',
        points: row.pass ? 100 : 100 * (1 - normalizedDistance),
        reason: row.pass
          ? query.questionType === 'score'
            ? 'The nearest offered category matches the supplied reference.'
            : 'Within the supplied reference and its published tolerance.'
          : boundaryMiss
            ? 'Exactly on an excluded reference endpoint: zero numerical distance, but a strict failure.'
            : 'Partial numerical reference closeness, measured against the full supplied scale; not gameplay utility or calibration.',
        numeric: {
          ...(query.questionType === 'score' ? { interpretedScore: value } : {}),
          distance,
          normalizedDistance,
          boundaryMiss,
          ...(query.reference.label === undefined
            ? {}
            : { labelDecisionCorrect: positiveDecision === query.reference.label }),
        },
      };
    }
  }
  return {
    status: 'invalid-answer',
    points: 0,
    reason:
      'The answer is not an offered categorical choice or a finite value within its declared numeric domain.',
  };
}

const mean = (rows: readonly QualityCase[]) =>
  rows.length ? rows.reduce((sum, row) => sum + (row.points ?? 0), 0) / rows.length : null;
function frequencies(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = Object.create(null);
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
function aggregate(rows: readonly QualityCase[]): QualityAggregate {
  const eligible = rows.filter((row) => row.status !== 'excluded');
  const categorical = eligible.filter((row) => row.kind === 'categorical');
  const categoricalAnswers = categorical.filter((row) => row.status === 'answered');
  const categoricalMisses = categorical.filter((row) => row.answered && row.strictPass === false);
  const numeric = eligible.filter((row) => row.kind === 'numeric-reference-closeness');
  const numericAnswers = numeric.filter((row) => row.numeric !== undefined);
  const numericMisses = numeric.filter((row) => row.answered && row.strictPass === false);
  const numericDistanceMisses = numericAnswers.filter((row) => row.strictPass === false);
  const coverage: Record<QualityStatus, number> = {
    answered: 0,
    'invalid-answer': 0,
    'invalid-output': 0,
    'missing-answer': 0,
    'question-refusal': 0,
    'service-outcome': 0,
    unattempted: 0,
    excluded: 0,
  };
  for (const row of rows) coverage[row.status]++;
  const averageDistance = (selected: readonly QualityCase[]) =>
    selected.length
      ? selected.reduce((sum, row) => sum + (row.numeric?.normalizedDistance ?? 0), 0) /
        selected.length
      : null;
  return {
    eligibleQuestions: eligible.length,
    answeredQuestions: eligible.filter((row) => row.answered).length,
    earnedPoints: eligible.reduce((sum, row) => sum + (row.points ?? 0), 0),
    answeredOnlyMean: mean(eligible.filter((row) => row.answered)),
    wholeWorkloadMean: mean(eligible),
    coverage,
    strictDecisionMisses: eligible.filter((row) => row.answered && row.strictPass === false).length,
    categorical: {
      questions: categorical.length,
      answeredOnlyMean: mean(categorical.filter((row) => row.answered)),
      wholeWorkloadMean: mean(categorical),
      pointTiers: frequencies(categoricalAnswers.map((row) => String(row.points))),
      strictMissConcerns: frequencies(
        categoricalMisses.map((row) =>
          row.status === 'invalid-answer' ? 'invalid-answer' : (row.concern ?? 'unspecified'),
        ),
      ),
      strictMissPointTiers: frequencies(categoricalMisses.map((row) => String(row.points))),
    },
    numeric: {
      questions: numeric.length,
      answeredOnlyReferenceCloseness: mean(numeric.filter((row) => row.answered)),
      wholeWorkloadReferenceCloseness: mean(numeric),
      strictMisses: numericMisses.length,
      boundaryMisses: numericAnswers.filter((row) => row.numeric?.boundaryMiss).length,
      labeledBinaryAnswers: numericAnswers.filter(
        (row) => row.numeric?.labelDecisionCorrect !== undefined,
      ).length,
      labeledBinaryDecisionMistakes: numericAnswers.filter(
        (row) => row.numeric?.labelDecisionCorrect === false,
      ).length,
      meanNormalizedDistance: averageDistance(numericAnswers),
      strictMissMeanNormalizedDistance: averageDistance(numericDistanceMisses),
      strictMissMaximumNormalizedDistance: numericDistanceMisses.length
        ? numericDistanceMisses.reduce(
            (maximum, row) => Math.max(maximum, row.numeric?.normalizedDistance ?? 0),
            0,
          )
        : null,
    },
  };
}

function groups(rows: readonly QualityCase[], key: 'family' | 'type' | 'scope') {
  const byGroup = new Map<string, QualityCase[]>();
  for (const row of rows) {
    const selected = byGroup.get(row[key]) ?? [];
    if (!byGroup.has(row[key])) byGroup.set(row[key], selected);
    selected.push(row);
  }
  return Object.fromEntries(
    [...byGroup]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, selected]) => [name, aggregate(selected)]),
  );
}

/** Caller supplies the existing decoded grades for this reference policy.
 * Build compact model/scene indexes once; never repeat input serialization or
 * reinterpret wire handles, score probabilities, generation output or invoices.
 */
export function summarizeQuality(
  policy: QualityPolicy,
  summaries: readonly { model: string; cases: readonly GradedCase[] }[],
  records: readonly RunRecord[],
): QualityReport {
  const selectedModels = new Set(summaries.map((summary) => summary.model));
  if (selectedModels.size !== summaries.length) throw new Error('Duplicate quality model.');
  const selectedScenes = new Set(policy.queries.map((query) => query.sceneId));
  const recordsByModel = new Map<
    string,
    Map<string, { record: RunRecord; refusals: Set<string> }>
  >();
  for (const record of records) {
    if (
      record.sceneId.startsWith('generate-') ||
      !selectedModels.has(record.model) ||
      !selectedScenes.has(record.sceneId)
    )
      continue;
    let byScene = recordsByModel.get(record.model);
    if (!byScene) {
      byScene = new Map();
      recordsByModel.set(record.model, byScene);
    }
    if (byScene.has(record.sceneId)) throw new Error('Duplicate quality comparison record.');
    byScene.set(record.sceneId, {
      record,
      refusals: new Set(record.result.receipt.questionRefusals ?? []),
    });
  }
  const models: ModelQualityReport[] = summaries.map((summary) => {
    const grades = new Map(summary.cases.map((row) => [row.id, row]));
    if (grades.size !== summary.cases.length) throw new Error('Duplicate quality grade.');
    const cases = policy.queries.map((query): QualityCase => {
      const base = {
        id: query.id,
        sceneId: query.sceneId,
        family: query.family,
        scope: query.scope,
        type: query.questionType,
        kind: query.kind,
        answered: false,
        strictPass: null,
        predicted: null,
      };
      if (query.kind === 'excluded')
        return { ...base, status: 'excluded', points: null, reason: query.reason };
      const row = grades.get(query.id);
      if (!row || row.sceneId !== query.sceneId || row.type !== query.questionType)
        throw new Error(`Missing or mismatched decoded quality grade: ${query.id}`);
      const observed = recordsByModel.get(summary.model)?.get(query.sceneId);
      if (!observed)
        return {
          ...base,
          status: 'unattempted',
          points: 0,
          reason: 'No comparison attempt exists for this scene.',
        };
      const { result } = observed.record;
      if (result.outcome !== 'value')
        return {
          ...base,
          status:
            result.outcome === 'refused' && observed.refusals.has(query.id)
              ? 'question-refusal'
              : result.outcome === 'invalid'
                ? 'invalid-output'
                : 'service-outcome',
          serviceOutcome: result.outcome,
          points: 0,
          reason: `No substantive answer: ${result.outcome} (${result.reason}).`,
        };
      if (!row.answered)
        return {
          ...base,
          status: observed.refusals.has(query.id)
            ? 'question-refusal'
            : Object.hasOwn(result.value.answers, query.id)
              ? 'invalid-answer'
              : 'missing-answer',
          points: 0,
          reason: 'No usable decoded answer was supplied for this question.',
        };
      return {
        ...base,
        answered: true,
        strictPass: row.pass,
        predicted: row.predicted,
        ...scoreAnswer(query, row),
      };
    });
    return {
      model: summary.model,
      ...aggregate(cases),
      families: groups(cases, 'family'),
      types: groups(cases, 'type'),
      scopes: groups(cases, 'scope'),
      cases,
    };
  });
  const rowMaps = models.map((model) => new Map(model.cases.map((row) => [row.id, row])));
  const included = policy.queries.filter((query) => query.kind !== 'excluded');
  const commonIds = included
    .filter((query) => rowMaps.length > 0 && rowMaps.every((rows) => rows.get(query.id)?.answered))
    .map((query) => query.id);
  return {
    scope: policy.scope,
    policyDigest: policy.digest,
    numericInterpretation: policy.numericInterpretation,
    aggregateInterpretation: policy.aggregateInterpretation,
    excludedQuestionIds: [...policy.excludedQuestionIds],
    models,
    commonAnswered: {
      questionIds: commonIds,
      models: models.map((model, index) => ({
        model: model.model,
        ...aggregate(commonIds.map((id) => rowMaps[index]!.get(id)!)),
      })),
    },
    pairwise: models.flatMap((first, index) =>
      models.slice(index + 1).map((second, offset) => {
        const a = rowMaps[index]!,
          b = rowMaps[index + offset + 1]!;
        const common = included.filter(
          (query) => a.get(query.id)?.answered && b.get(query.id)?.answered,
        );
        return {
          first: first.model,
          second: second.model,
          commonAnsweredQuestions: common.length,
          firstMean: mean(common.map((query) => a.get(query.id)!)),
          secondMean: mean(common.map((query) => b.get(query.id)!)),
        };
      }),
    ),
  };
}
