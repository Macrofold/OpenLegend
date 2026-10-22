/** Explicit synthetic evaluation; never imported by game startup or ordinary test commands. */
import { execFileSync } from 'node:child_process';
import { mkdir, open, readFile, writeFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve, relative, sep } from 'node:path';
import {
  corpusVersion,
  modelInput,
  scenes as allScenes,
  sha256,
  validateCorpus,
} from './corpus.js';
import { auditCorpus } from './audit.js';
import {
  generationCases as allGenerationCases,
  gradeGenerated,
  nativeCapabilities,
  type GenerationSubmission,
} from './generation.js';
import { episodes } from './complex-scenes.js';
import { runBenchmark } from './run.js';
import { recoverBudgetAdmissions } from './recover-budget.js';
import {
  gradeGeneratedReviewed,
  reviewedGenerationReferences,
  reviewedReferenceScenes,
} from './reference-review.js';
import { armById, resolveArm } from './arms.js';
import { compileQualityPolicy, summarizeQuality } from './quality.js';
import { readQualityRecords } from './quality-records.js';
import { summarize } from './evaluate.js';
import { compileClearErrorPolicy } from './clear-errors.js';
import { detailedBenchmarkReport, prepareDetailedBenchmarkReport } from './followup-report.js';
import { renderMasterReport } from './master-report.js';
const args = process.argv.slice(2);
const command = args.shift() ?? 'validate';
const options = new Map<string, string>();
for (const arg of args) {
  const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
  if (!match || options.has(match[1]!)) throw new Error(`Invalid or repeated argument: ${arg}`);
  options.set(match[1]!, match[2] ?? 'true');
}
for (const key of options.keys())
  if (
    ![
      'out',
      'live',
      'cap-usd',
      'concurrency',
      'models',
      'timeout-ms',
      'max-new',
      'billing-mode',
      'input',
      'suite',
      'split',
      'per-call-usd',
      'generation',
      'stream-generation',
      'workers',
      'source',
      'prior-commitment-usd',
      'model-experiment',
      'online-preflight',
      'max-output-tokens',
    ].includes(key)
  )
    throw new Error(`Unknown argument: --${key}`);
for (const flag of ['live', 'generation', 'stream-generation'])
  if (options.has(flag) && !['true', 'false'].includes(options.get(flag)!))
    throw new Error(`--${flag} must be true or false.`);
if (
  options.has('max-new') &&
  (!Number.isSafeInteger(Number(options.get('max-new'))) || Number(options.get('max-new')) < 0)
)
  throw new Error('--max-new must be a nonnegative integer.');
validateCorpus();
const suite = options.get('suite') ?? 'all';
if (!['all', 'baseline', 'complex', 'selected', 'frontier'].includes(suite))
  throw new Error('Unknown suite.');
const split = options.get('split') ?? 'all';
if (!['all', 'development', 'challenge', 'holdout'].includes(split))
  throw new Error('Unknown split.');
const scenes = allScenes.filter(
  (s) =>
    (suite === 'all' ||
      (suite === 'baseline' && !s.group && s.scope !== 'selected-design') ||
      (suite === 'selected' && s.scope === 'selected-design') ||
      (suite === 'complex' && s.group && s.group.view !== 'compound') ||
      (suite === 'frontier' && s.group?.view === 'compound')) &&
    (split === 'all' || s.group?.split === split),
);
if (!scenes.length) throw new Error('Suite/split selection contains no scenes.');
const selectedEpisodeIds = new Set(scenes.flatMap((s) => (s.group ? [s.group.episodeId] : [])));
const generationCases = allGenerationCases.filter((c) => selectedEpisodeIds.has(c.episodeId));
const preparedInputs = new Map(scenes.map((s) => [s.id, modelInput(s)]));
const inputFor = (scene: { id: string }) => preparedInputs.get(scene.id)!;
const stateSizes = scenes.map((s) => Buffer.byteLength(JSON.stringify(s.state)));
const inputSizes = scenes.map((s) => Buffer.byteLength(JSON.stringify(inputFor(s))));
const digest = sha256(scenes);
const count = scenes.reduce((n, s) => n + s.cases.length, 0);
const describe = () => ({
  corpusVersion,
  suite,
  split,
  corpusDigest: digest,
  scenes: scenes.length,
  cases: count,
  families: new Set(scenes.map((s) => s.family)).size,
  largestChoice: Object.keys(
    scenes
      .flatMap((s) => s.cases)
      .filter((c) => c.question.type === 'choice')
      .sort(
        (a, b) =>
          Object.keys(b.question.criteria ?? {}).length -
          Object.keys(a.question.criteria ?? {}).length,
      )[0]!.question.criteria ?? {},
  ).length,
  types: Object.fromEntries(
    ['noul', 'choice', 'score'].map((type) => [
      type,
      scenes.flatMap((s) => s.cases).filter((c) => c.question.type === type).length,
    ]),
  ),
  contextBytes: {
    min: Math.min(...stateSizes),
    max: Math.max(...stateSizes),
  },
  inputBytes: {
    min: Math.min(...inputSizes),
    max: Math.max(...inputSizes),
  },
});
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
/** Export complete bounded scenes without retaining another whole corpus string
 * and its UTF-8 buffer. Keep the existing pretty JSON bytes and exclusive writes.
 */
async function writeExportArray(
  path: string,
  rows: Iterable<object>,
  envelope?: { metadata: Record<string, unknown>; key: string },
) {
  const file = await open(path, 'wx', 0o600);
  try {
    let header = '[';
    let suffix = '';
    if (envelope) {
      const document = JSON.stringify({ ...envelope.metadata, [envelope.key]: [] }, null, 2);
      // Replacing a count with its rows retains that property's original position.
      // A root property has exactly two spaces; nested data cannot match this line.
      const marker = `\n  ${JSON.stringify(envelope.key)}: []`;
      const end = document.indexOf(marker) + marker.length;
      header = document.slice(0, end - 1);
      suffix = document.slice(end);
    }
    await file.writeFile(header);
    const indent = envelope ? '    ' : '  ';
    let first = true;
    for (const row of rows) {
      const text = JSON.stringify(row, null, 2).replaceAll('\n', `\n${indent}`);
      await file.writeFile(`${first ? '\n' : ',\n'}${indent}${text}`);
      first = false;
    }
    await file.writeFile(`${first ? '' : `\n${envelope ? '  ' : ''}`}]${suffix}\n`);
  } finally {
    await file.close();
  }
}
if (command === 'validate' || command === 'audit') {
  console.log(
    json({
      ...describe(),
      generationCases: generationCases.length,
      ...(command === 'audit' ? { audit: auditCorpus(scenes) } : {}),
    }),
  );
} else {
  const directory = options.get('out');
  if (!directory || !isAbsolute(directory)) throw new Error('--out=/absolute/path is required.');
  // Generated raw responses, even synthetic ones, are intentionally kept out of the repository.
  const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const within = relative(repo, resolve(directory));
  if (within !== '..' && !within.startsWith(`..${sep}`))
    throw new Error('Use an output directory outside the repository.');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const physicalWithin = relative(await realpath(repo), await realpath(directory));
  if (physicalWithin !== '..' && !physicalWithin.startsWith(`..${sep}`))
    throw new Error('Output symlink resolves inside the repository.');
  if (command === 'rank-clear-errors') {
    const references = reviewedReferenceScenes(scenes);
    const policy = compileClearErrorPolicy(references.scenes, new Set(references.excludedIds));
    await writeFile(join(directory, 'clear-error-policy.json'), json(policy), {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(json({ ...describe(), clearErrorPolicyDigest: policy.digest, directory }));
  } else if (command === 'analyze') {
    const input = options.get('input');
    const source = options.get('source');
    if (!input || !isAbsolute(input) || !source || !isAbsolute(source))
      throw new Error(
        '--input=/absolute/records.json and --source=/absolute/policy.json are required.',
      );
    const frozen: unknown = JSON.parse(await readFile(source, 'utf8'));
    // Check the policy before opening predictions, matching grade-points.
    const preparation = prepareDetailedBenchmarkReport(scenes, frozen);
    const { records, recordsFileDigest } = await readQualityRecords(input, scenes);
    const models = [...new Set(records.map((record) => record.model))];
    if (!models.length) throw new Error('No comparison records supplied.');
    const report = {
      description: describe(),
      recordsFileDigest,
      ...detailedBenchmarkReport(scenes, records, models, preparation),
    };
    await writeFile(join(directory, 'detailed-metrics.json'), json(report), {
      flag: 'wx',
      mode: 0o600,
    });
    await writeFile(join(directory, 'summary.md'), renderMasterReport(report), {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(
      json({
        ...describe(),
        recordsFileDigest,
        clearErrorPolicyDigest: preparation.clearPolicy.digest,
        directory,
      }),
    );
  } else if (command === 'rank-answers' || command === 'grade-points') {
    const references = reviewedReferenceScenes(scenes);
    const excluded = new Set(references.excludedIds);
    const policy = compileQualityPolicy(references.scenes, excluded);
    if (command === 'rank-answers') {
      await writeFile(join(directory, 'answer-points-policy.json'), json(policy), {
        flag: 'wx',
        mode: 0o600,
      });
      console.log(json({ ...describe(), policyDigest: policy.digest, directory }));
    } else {
      const input = options.get('input');
      const source = options.get('source');
      if (!input || !isAbsolute(input) || !source || !isAbsolute(source))
        throw new Error(
          '--input=/absolute/records.json and --source=/absolute/policy.json are required.',
        );
      const frozenPolicy: unknown = JSON.parse(await readFile(source, 'utf8'));
      if (sha256(frozenPolicy) !== sha256(policy))
        throw new Error('Frozen answer-points policy differs from the selected source policy.');
      const { records, recordsFileDigest } = await readQualityRecords(input, scenes);
      const models = [...new Set(records.map((record) => record.model))];
      if (!models.length) throw new Error('No comparison records supplied.');
      const comparison = summarize(
        [...references.scenes],
        records.filter((record) => !record.sceneId.startsWith('generate-')),
        models,
        excluded,
      );
      const report = {
        description: describe(),
        recordsFileDigest,
        referencePolicyDigest: sha256(references.amendments),
        ...summarizeQuality(policy, comparison.models, records),
      };
      await writeFile(join(directory, 'answer-points-summary.json'), json(report), {
        flag: 'wx',
        mode: 0o600,
      });
      console.log(
        json({ ...describe(), policyDigest: policy.digest, recordsFileDigest, directory }),
      );
    }
  } else if (command === 'export') {
    await writeExportArray(join(directory, 'corpus.json'), scenes, {
      metadata: describe(),
      key: 'scenes',
    });
    await writeExportArray(
      join(directory, 'model-inputs.json'),
      scenes.map((s) => ({ sceneId: s.id, input: inputFor(s) })),
    );
    await writeExportArray(
      join(directory, 'generation-corpus.json'),
      generationCases.map((c) => ({ ...c, inputDigest: sha256(c.input) })),
      { metadata: { corpusVersion, nativeCapabilities }, key: 'cases' },
    );
    await writeFile(join(directory, 'audit.json'), json(auditCorpus(scenes)), {
      flag: 'wx',
      mode: 0o600,
    });
    const references = reviewedReferenceScenes(scenes);
    await writeFile(
      join(directory, 'reference-review.json'),
      json({
        policyDigest: sha256(references.amendments),
        amendments: references.amendments,
        excludedQuestionIds: references.excludedIds,
      }),
      { flag: 'wx', mode: 0o600 },
    );
    console.log(json({ ...describe(), directory }));
  } else if (command === 'grade-generated') {
    const input = options.get('input');
    if (!input || !isAbsolute(input))
      throw new Error('--input=/absolute/submissions.json is required.');
    const text = await readFile(input, 'utf8');
    if (Buffer.byteLength(text) > 20_000_000) throw new Error('Generation submissions exceed20MB.');
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Generation submissions must be an array.');
    const known = new Map(generationCases.map((c) => [c.id, c]));
    const episodeById = new Map(episodes.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const submissions: GenerationSubmission[] = [];
    const rows = parsed.map((raw: unknown) => {
      if (!raw || typeof raw !== 'object') throw new Error('Invalid generation submission.');
      const r = raw as GenerationSubmission;
      const c = known.get(r.caseId);
      const armId = typeof r.model === 'string' ? resolveArm(r.model) : undefined;
      const arm = armId ? armById.get(armId) : undefined;
      const model = arm?.id ?? r.model;
      const key = JSON.stringify([model, r.caseId]);
      if (
        !c ||
        typeof r.model !== 'string' ||
        !r.model.trim() ||
        r.inputDigest !== sha256(c.input) ||
        seen.has(key) ||
        !['supported', 'unsupported'].includes(r.capability)
      )
        throw new Error('Unknown, duplicate or mismatched generation submission.');
      seen.add(key);
      if (
        r.capability === 'supported' &&
        (arm?.transport === 'macrofold-decision' || arm?.transport === 'openai-decision')
      )
        throw new Error(
          'The bound native decision models cannot submit arbitrary JSON generation as a supported capability.',
        );
      submissions.push({ ...r, model });
      if (r.capability === 'unsupported')
        return { caseId: r.caseId, model, outcome: 'unsupported-capability' };
      return {
        caseId: r.caseId,
        model,
        outcome: 'graded',
        ...gradeGenerated(episodeById.get(c.episodeId)!, r.output),
      };
    });
    const references = reviewedGenerationReferences(
      new Set(submissions.map((submission) => known.get(submission.caseId)!.episodeId)),
    );
    const output = {
      corpusVersion,
      corpusDigest: digest,
      capabilityLane: 'arbitrary-json-generation',
      rows,
      referenceReview: {
        postRunReview: true,
        policyDigest: sha256(references.amendments),
        referenceAmendments: references.amendments,
        rows: submissions.map((submission) => {
          if (submission.capability === 'unsupported')
            return {
              caseId: submission.caseId,
              model: submission.model,
              outcome: 'unsupported-capability',
            };
          const episodeId = known.get(submission.caseId)!.episodeId;
          return {
            caseId: submission.caseId,
            model: submission.model,
            outcome: 'graded',
            ...gradeGeneratedReviewed(
              episodeById.get(episodeId)!,
              submission.output,
              references.denseByEpisode.get(episodeId)!,
            ),
          };
        }),
      },
      models: [...new Set(rows.map((r) => r.model))].map((model) => ({
        model,
        submitted: rows.filter((r) => r.model === model).length,
        unsubmitted: generationCases.length - rows.filter((r) => r.model === model).length,
        unsupported: rows.filter((r) => r.model === model && r.outcome === 'unsupported-capability')
          .length,
      })),
      limitation:
        'No provider is called. Free text is flagged for human review, not automatically judged as factual or natural.',
    };
    await writeFile(join(directory, 'generation-summary.json'), json(output), {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(json(output));
  } else if (command === 'report' || command === 'run' || command === 'prepare') {
    await runBenchmark(command, directory, options, scenes, describe);
  } else if (command === 'recover-budget') {
    await recoverBudgetAdmissions(directory, options, scenes, describe);
  } else
    throw new Error(
      'Use validate, audit, export, rank-answers, grade-points, rank-clear-errors, analyze, grade-generated, run, report or recover-budget.',
    );
}
