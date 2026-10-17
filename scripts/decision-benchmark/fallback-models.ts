/** Explicit paid experiment; importing this entry point never changes gameplay policy. */
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelInput, scenes as corpus, sha256 } from './corpus.js';
import { episodes } from './complex-scenes.js';
import { reviewedReferenceScenes } from './reference-review.js';
import { compileQualityPolicy, summarizeQuality } from './quality.js';
import { summarize, type RunRecord } from './evaluate.js';
import { runBenchmark } from './run.js';
import { recordedJevMisses } from './fallback-cohort.js';
import { fallbackTaskAdapter } from './fallback-task.js';
import type { BenchmarkManifest } from './journal.js';
import type { BenchmarkScene } from './types.js';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match) throw new Error('Use --name=value arguments.');
    return [match[1]!, match[2]!] as const;
  }),
);
if (args.size !== process.argv.length - 2) throw new Error('Repeated argument.');
for (const flag of ['live', 'report'])
  if (args.has(flag) && !['true', 'false'].includes(args.get(flag)!))
    throw new Error(`--${flag} must be true or false.`);
if (
  args.has('max-new') &&
  (!Number.isSafeInteger(Number(args.get('max-new'))) || Number(args.get('max-new')) < 0)
)
  throw new Error('--max-new must be a nonnegative integer.');
for (const key of args.keys())
  if (
    ![
      'out',
      'live',
      'prior-commitment-usd',
      'cap-usd',
      'max-new',
      'workers',
      'report',
      'focus-source',
      'corpus-source',
    ].includes(key)
  )
    throw new Error(`Unknown option: ${key}`);
const directory = args.get('out');
const prior = Number(args.get('prior-commitment-usd'));
const cap = Number(args.get('cap-usd'));
if (
  !directory ||
  !isAbsolute(directory) ||
  !Number.isFinite(prior) ||
  prior < 0 ||
  !Number.isFinite(cap) ||
  cap <= prior ||
  cap > 10
)
  throw new Error(
    'An absolute private --out, prior exposure and an aggregate cap <= $10 are required.',
  );
await mkdir(directory, { recursive: true, mode: 0o700 });
const repositoryRoot = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const location = relative(repositoryRoot, await realpath(directory));
if (!location.startsWith('../') && !isAbsolute(location))
  throw new Error('Private provider evidence must be outside the repository.');

// Round-robin across authored families, independent of all old/new model predictions.
// One question per independent episode avoids correlated variants dominating the score.
const referenceReview = reviewedReferenceScenes(corpus);
const reviewed = referenceReview.scenes;
if (args.has('focus-source') && args.has('corpus-source'))
  throw new Error('Choose either a repeated sample or all recorded corpus misses.');
const corpusSource = args.get('corpus-source');
if (corpusSource && !isAbsolute(corpusSource))
  throw new Error('--corpus-source must be an absolute directory.');
const cohort = corpusSource ? await recordedJevMisses(corpusSource, corpus, reviewed) : undefined;
function sampleScenes(): BenchmarkScene[] {
  const families = new Map<string, typeof episodes>();
  const eligible = episodes.filter((episode) =>
    reviewed.some(
      (scene) =>
        scene.group?.episodeId === episode.id &&
        scene.group.view === 'control' &&
        [2, 3, 4, 6].every((n) => scene.cases.some((test) => test.id === `${scene.id}-q${n}`)),
    ),
  );
  if (eligible.length < 48) throw new Error('The fixed experiment requires 48 eligible episodes.');
  for (const episode of [...eligible].sort((a, b) => sha256(a.id).localeCompare(sha256(b.id)))) {
    const family = families.get(episode.family) ?? [];
    family.push(episode);
    families.set(episode.family, family);
  }
  const selectedEpisodes: typeof episodes = [];
  while (selectedEpisodes.length < 48)
    for (const family of families.values()) {
      const episode = family.shift();
      if (episode && selectedEpisodes.length < 48) selectedEpisodes.push(episode);
    }
  return selectedEpisodes.map((episode, index) => {
    const view = ['control', 'dense', 'changed'][index % 3]!;
    const scene = reviewed.find((s) => s.group?.episodeId === episode.id && s.group.view === view)!;
    const questionNumber = [2, 3, 4, 6][index % 4]!;
    const test = scene.cases.find((test) => test.id === `${scene.id}-q${questionNumber}`);
    if (!test) throw new Error(`Missing selected semantic question: ${scene.id}`);
    return { ...scene, cases: [test] };
  });
}
let selected = cohort?.selected ?? sampleScenes();
let focusSourceDigest: string | undefined;
if (args.has('focus-source')) {
  // A separately requested repeat study preserves exact questions/options; it
  // cannot silently become a retry of an unfinished paid admission.
  const source = args.get('focus-source')!;
  if (!isAbsolute(source) || (await realpath(source)) === (await realpath(directory)))
    throw new Error('Focus requires a separate completed source directory.');
  const summaryText = await readFile(join(source, 'summary.json'), 'utf8');
  const comparisonText = await readFile(join(source, 'fallback-comparison.json'), 'utf8');
  const summary = JSON.parse(summaryText) as {
    unattemptedCalls: number;
    pendingAdmissions: unknown[];
    unpricedOrUncertainRuns: number;
    conservativeCommittedUsd: number;
  };
  const comparison = JSON.parse(comparisonText) as {
    primaryMisses: string[];
    description: { cases: { id: string; inputDigest: string }[]; rubricDigest: string };
  };
  if (
    summary.unattemptedCalls !== 0 ||
    summary.pendingAdmissions.length !== 0 ||
    summary.unpricedOrUncertainRuns !== 0 ||
    !Number.isFinite(summary.conservativeCommittedUsd) ||
    summary.conservativeCommittedUsd < 0 ||
    prior < summary.conservativeCommittedUsd
  )
    throw new Error('The source must be completed, priced and included in the prior exposure.');
  if (
    !Array.isArray(comparison.primaryMisses) ||
    !comparison.primaryMisses.length ||
    new Set(comparison.primaryMisses).size !== comparison.primaryMisses.length ||
    comparison.description.rubricDigest !== compileQualityPolicy(selected).digest ||
    comparison.primaryMisses.some((id) => !selected.some((scene) => scene.cases[0]!.id === id)) ||
    selected.some(
      (scene) =>
        comparison.description.cases.find((entry) => entry.id === scene.id)?.inputDigest !==
        sha256(modelInput(scene)),
    )
  )
    throw new Error('The source must match the exact original selection.');
  const wanted = new Set(comparison.primaryMisses);
  selected = selected.filter((scene) => wanted.has(scene.cases[0]!.id));
  focusSourceDigest = sha256({ summaryText, comparisonText });
}
const qualityPolicy = compileQualityPolicy(selected);
const selectedQuestionIds = new Set(
  selected.flatMap((scene) => scene.cases.map((test) => test.id)),
);
const adapter = fallbackTaskAdapter(
  {
    review: {
      scenes: selected,
      excludedIds: [],
      amendments: referenceReview.amendments.filter((amendment) =>
        selectedQuestionIds.has(amendment.questionId),
      ),
    },
    qualityPolicy,
  },
  !!cohort,
);
const description = {
  purpose:
    'Fallback candidate comparison; no runtime trigger or gameplay effects. Latency is per scenario request, which may contain multiple missed questions.',
  selection: cohort
    ? `Every ${cohort.source.originalMisses} recorded Jev miss from ${cohort.source.originalQuestions} answered corpus questions, across ${selected.length} original contexts; no context-length or severity sampling.`
    : focusSourceDigest
      ? 'Exact contexts from observed Jev reference misses in the completed source; explicit repeat study, not population accuracy or a runtime trigger.'
      : '48 independent episodes, family round-robin after SHA-256 ordering; 12 questions per semantic kind; 16 contexts per memory tier.',
  ...(cohort ? { corpusSource: cohort.source } : {}),
  ...(focusSourceDigest ? { focusSourceDigest } : {}),
  references:
    'Existing reviewed references frozen before paid execution; multiple valid answers receive equal full credit.',
  cases: selected.map((scene) => ({
    id: scene.id,
    questionIds: scene.cases.map((test) => test.id),
    memories: scene.group?.memories,
    meters: scene.group?.meters,
    inputDigest: sha256(modelInput(scene)),
  })),
  rubricDigest: qualityPolicy.digest,
};
// Persist exact grading/input material, outside model requests, before any paid admission.
const selectionPath = join(directory, 'selection.json');
const frozen = JSON.stringify({ description, selected }, null, 2) + '\n';
try {
  await writeFile(selectionPath, frozen, { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (
    (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
    (await readFile(selectionPath, 'utf8')) !== frozen
  )
    throw error;
}
const options = new Map(args);
options.set('models', 'jev,microsoft,luna-decision,luna-none,luna-low,luna-medium');
options.set('billing-mode', 'byok');
options.set('concurrency', '4');
options.set('workers', args.get('workers') ?? '4');
options.set('timeout-ms', '60000');
options.set('per-call-usd', '0.1');
if (args.get('report') !== 'true' && args.get('live') !== 'true') {
  for (const scene of selected) adapter.prepare(scene);
  console.log(JSON.stringify({ ...description, prepared: selected.length, dryRun: true }));
  process.exit(0);
}
if (args.get('live') === 'true' && args.get('report') !== 'true' && args.get('max-new') !== '0') {
  // An offline local control plane cannot serve either native comparison arm.
  // Refuse before paid admission rather than accumulating avoidable uncertain calls.
  const health = await fetch(
    new URL('/health', process.env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210'),
    {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    },
  ).catch(() => undefined);
  void health?.body?.cancel();
  if (!health?.ok)
    throw new Error(
      'Start Macrofold and its database before live comparison; no paid requests were admitted.',
    );
}
await runBenchmark(
  args.get('report') === 'true' ? 'report' : 'run',
  directory,
  options,
  selected,
  () => description,
  undefined,
  undefined,
  adapter,
);
const journal = (await readFile(join(directory, 'journal.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as { record?: RunRecord });
const records = journal.flatMap((event) => (event.record ? [event.record] : []));
const models = options.get('models')!.split(',');
// The journal uses exact model IDs, not CLI aliases.
const manifest = JSON.parse(
  await readFile(join(directory, 'manifest.json'), 'utf8'),
) as BenchmarkManifest;
const ids = manifest.models;
const grades = summarize(selected, records, ids);
const quality = summarizeQuality(qualityPolicy, grades.models, records);
const byModel = new Map(grades.models.map((model) => [model.model, model]));
const primary = byModel.get(ids[0]!)!;
const primaryMisses = new Set(
  primary.cases.filter((row) => row.answered && !row.pass).map((row) => row.id),
);
const primaryCorrect = new Set(primary.cases.filter((row) => row.pass).map((row) => row.id));
const rows = quality.models.map((model) => {
  const graded = byModel.get(model.model)!;
  const runs = records.filter((record) => record.model === model.model);
  const latencyByScene = new Map(runs.map((run) => [run.sceneId, run.result.receipt.latencyMs]));
  // Fast refusals must not make a model look quicker at supplying usable decisions.
  const answeredScenes = new Set(
    graded.cases.filter((row) => row.answered).map((row) => row.sceneId),
  );
  const times = runs
    .filter((run) => answeredScenes.has(run.sceneId))
    .map((run) => run.result.receipt.latencyMs)
    .sort((a, b) => a - b);
  const costs = runs.flatMap((run) =>
    run.result.receipt.estimatedCostUsd === undefined ? [] : [run.result.receipt.estimatedCostUsd],
  );
  const timely = (limit: number) =>
    graded.cases.filter((row) => row.pass && (latencyByScene.get(row.sceneId) ?? Infinity) <= limit)
      .length;
  return {
    model: model.model,
    attempted: runs.length,
    requestsWithAnswers: times.length,
    requestsWithoutAnswers: runs.length - times.length,
    requestOutcomes: graded.outcomes,
    answered: model.answeredQuestions,
    correct: graded.cases.filter((row) => row.pass).length,
    accuracyPercent: model.answeredQuestions
      ? (100 * graded.cases.filter((row) => row.pass).length) / model.answeredQuestions
      : null,
    earnedPoints: model.earnedPoints,
    possibleAnsweredPoints: 100 * model.answeredQuestions,
    pointsPercent: model.answeredOnlyMean,
    meanMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    p95Ms: times[Math.ceil(times.length * 0.95) - 1] ?? null,
    maxMs: times.at(-1) ?? null,
    correctWithin1s: timely(1000),
    correctWithin2s: timely(2000),
    correctWithin5s: timely(5000),
    correctedPrimaryMisses: graded.cases.filter((row) => primaryMisses.has(row.id) && row.pass)
      .length,
    answeredPrimaryMisses: graded.cases.filter((row) => primaryMisses.has(row.id) && row.answered)
      .length,
    regressions: graded.cases.filter(
      (row) => primaryCorrect.has(row.id) && row.answered && !row.pass,
    ).length,
    estimatedCostUsd: costs.reduce((a, b) => a + b, 0),
    pricedCalls: costs.length,
    missingCostObservations: runs.length - costs.length,
    breakdown: Object.fromEntries(
      [
        'all',
        'engine-calculation',
        'judgment',
        'structured-reaction',
        'expression',
        'source-relevance',
        'history-integration',
      ].map((tag) => {
        const isCalculation = (row: (typeof graded.cases)[number]) =>
          row.tags.includes('arithmetic') || row.tags.includes('decay');
        const questions = graded.cases.filter(
          (row) =>
            tag === 'all' ||
            (tag === 'engine-calculation'
              ? isCalculation(row)
              : tag === 'judgment'
                ? !isCalculation(row)
                : row.tags.includes(tag)),
        );
        const questionIds = new Set(questions.map((row) => row.id));
        const points = model.cases.filter((row) => questionIds.has(row.id));
        return [
          tag,
          {
            answered: questions.filter((row) => row.answered).length,
            correct: questions.filter((row) => row.pass).length,
            total: questions.length,
            earnedPoints: points.reduce((sum, row) => sum + (row.points ?? 0), 0),
          },
        ];
      }),
    ),
  };
});
const output = {
  description,
  sourceCommit: manifest.gitCommit,
  aliases: models,
  totalQuestions: selectedQuestionIds.size,
  totalScenarioRequestsPerModel: selected.length,
  primaryMisses: [...primaryMisses],
  rows,
  quality,
  limitations: [
    'No production effects or queue/publication overhead measured.',
    'All candidates see the same evidence and alternatives; LLMs use the production fallback contract, native APIs their native question protocol.',
    'Authored subjective references are not unique psychological truth; probability closeness is not gameplay utility.',
    'Offline correction of observed Jev misses does not prove those misses can be detected during play.',
  ],
};
await writeFile(
  join(directory, 'fallback-comparison.json'),
  JSON.stringify(output, null, 2) + '\n',
  { mode: 0o600 },
);
console.log(
  JSON.stringify(
    { totalQuestions: selectedQuestionIds.size, primaryMisses: primaryMisses.size, rows },
    null,
    2,
  ),
);
