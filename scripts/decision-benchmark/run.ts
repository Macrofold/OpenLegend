import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { usdToMicroUsd, type AiReceipt } from '../../packages/ai/src/index.js';
import {
  benchmarkArms,
  experimentalArms,
  outputTokens,
  reservationForInputUsd,
  resolveArm,
} from './arms.js';
import { modelInput, sha256, corpusVersion } from './corpus.js';
import { groupByModel, summarize, type RunRecord } from './evaluate.js';
import {
  armSupportsTask,
  executeArm,
  preparedArmInput,
  benchmarkDeploymentPreparation,
  deploymentPreparationFailure,
  type PreparedDeploymentArm,
  type PreparedTask,
} from './execute.js';
import { generationCases, gradeGenerated } from './generation.js';
import { episodes } from './complex-scenes.js';
import {
  assertValidManifest,
  BenchmarkAccounting,
  parseJournal,
  validateJournal,
  knownReceiptMicroUsd,
  type BenchmarkManifest,
  type BenchmarkJournalEvent,
} from './journal.js';
import type { BenchmarkScene } from './types.js';
import {
  applyExperimentOptions,
  experimentArms,
  experimentReport,
  readModelExperiment,
  resolveModelExperiment,
  type ResolvedModelExperiment,
} from './model-experiment.js';
import type { BenchmarkRecoveryPlan } from './recovery.js';
import { prepareReferenceReport, reviewedReferenceReport } from './reference-report.js';
import { OpenAiRateGate } from '../../packages/ai/src/rate-gate.js';
import { PRIVATE_BENCHMARK_EVIDENCE_BYTES } from './evidence-limits.js';

/** A complete new experiment after an integration repair, retaining the paid
 * predecessor and its uncertain holds. This asserts no never-invoked proof.
 */
export interface BenchmarkSupplementaryPlan {
  kind: 'new-cohort';
  sourceDigests: string[];
  priorCommitmentUsd: number;
  capUsd: number;
  selections: Array<{ key: string; inputDigest: string }>;
  /** Earlier validated cohorts share this account's cooldowns and remaining capacity. */
  rateHistory?: readonly AiReceipt[];
}

/** An actual caller's prompt/schema and decoding, with the existing paid execution owner. */
export interface BenchmarkTaskAdapter {
  prepare(scene: BenchmarkScene): PreparedTask;
  decode(task: PreparedTask, execution: Awaited<ReturnType<typeof executeArm>>): void;
  /** Subsets of a reviewed corpus retain that already-reviewed policy. */
  referenceReport?: ReturnType<typeof prepareReferenceReport>;
}

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const micro = (v: number) => {
  const n = usdToMicroUsd(v);
  if (n === undefined) throw new Error('Invalid benchmark accounting amount.');
  return n;
};
export function committedMicroUsd(events: BenchmarkJournalEvent[], priorUsd: number): number {
  return new BenchmarkAccounting(priorUsd, events).committedMicroUsd;
}
export function executionWorkers(value: string | undefined, fallback: number): number {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 16)
    throw new Error('Execution workers must be1–16.');
  return n;
}
export function prepareBenchmarkTasks(scenes: BenchmarkScene[], generated: boolean) {
  const baseTasks: PreparedTask[] = scenes.map((s) => ({ id: s.id, input: modelInput(s) }));
  const episodeIds = new Set(scenes.flatMap((s) => (s.group ? [s.group.episodeId] : [])));
  const generationTasks: PreparedTask[] = generated
    ? generationCases
        .filter((c) => episodeIds.has(c.episodeId))
        .map((c) => ({
          id: c.id,
          input: { state: c.input.state, questions: {} },
          generation: {
            instructions: c.input.instructions,
            schema: c.input.schema,
            state: c.input.state,
          },
        }))
    : [];
  const taskById = new Map([...baseTasks, ...generationTasks].map((t) => [t.id, t]));
  const corpusDigest = sha256({ scenes, generation: generated ? generationTasks : [] });
  return { taskById, generationTasks, corpusDigest };
}
export async function runBenchmark(
  command: 'run' | 'report' | 'prepare',
  directory: string,
  options: Map<string, string>,
  scenes: BenchmarkScene[],
  describe: () => unknown,
  recovery?: BenchmarkRecoveryPlan | BenchmarkSupplementaryPlan,
  parentSignal?: AbortSignal,
  adapter?: BenchmarkTaskAdapter,
) {
  const planPath = options.get('model-experiment');
  const plan = planPath ? await readModelExperiment(planPath) : undefined;
  if (plan) applyExperimentOptions(plan, options);
  if (
    options.has('online-preflight') &&
    !['true', 'false'].includes(options.get('online-preflight')!)
  )
    throw new Error('--online-preflight must be true or false.');
  const preparedReferenceReport =
    adapter?.referenceReport ??
    prepareReferenceReport(plan ? scenes.filter((scene) => plan.cases.includes(scene.id)) : scenes);
  const supplementary = recovery && 'kind' in recovery && recovery.kind === 'new-cohort';
  let rateStopReason: string | undefined;
  const priorCommitmentUsd =
    recovery?.priorCommitmentUsd ?? Number(options.get('prior-commitment-usd') ?? 0.04);
  if (
    options.has('stream-generation') &&
    !['true', 'false'].includes(options.get('stream-generation')!)
  )
    throw new Error('--stream-generation must be true or false.');
  const streamGeneration = options.get('stream-generation') === 'true';
  if (options.has('workers')) executionWorkers(options.get('workers'), 4);
  const { taskById, generationTasks, corpusDigest } = prepareBenchmarkTasks(
    scenes,
    options.get('generation') === 'true' ||
      plan?.cases.some((id) => id.startsWith('generate-')) === true,
  );
  if (adapter) for (const scene of scenes) taskById.set(scene.id, adapter.prepare(scene));
  if (plan) {
    for (const id of plan.cases)
      if (!taskById.has(id)) throw new Error(`Unknown experiment case: ${id}`);
    for (const id of taskById.keys()) if (!plan.cases.includes(id)) taskById.delete(id);
    scenes = scenes.filter((scene) => taskById.has(scene.id));
    for (let i = generationTasks.length - 1; i >= 0; i--)
      if (!taskById.has(generationTasks[i]!.id)) generationTasks.splice(i, 1);
  }
  let experiment: ResolvedModelExperiment | undefined =
    plan && command !== 'report'
      ? resolveModelExperiment(plan, preparedReferenceReport)
      : undefined;
  const executionDigest = (streamGeneration: boolean, models: readonly string[]) =>
    sha256({
      arms: experiment?.arms ?? benchmarkArms,
      ...(experiment ? { modelExperiment: experiment } : {}),
      ...(models.some((id) => experimentalArms.some((arm) => arm.id === id))
        ? { experimentalArms: experimentalArms.filter((arm) => models.includes(arm.id)) }
        : {}),
      tasks: [...taskById.values()].map((task) => ({
        id: task.id,
        byArm: (experiment?.arms ?? [...benchmarkArms, ...experimentalArms])
          .filter((a) => !experimentalArms.some((e) => e.id === a.id) || models.includes(a.id))
          .filter((a) => armSupportsTask(a, task))
          .map((arm) => ({ id: arm.id, inputDigest: sha256(preparedArmInput(arm, task)) })),
      })),
      outputTokens,
      spending: 'complete-usage-or-reservation',
      priorCommitmentUsd,
      ...(streamGeneration ? { streamGeneration: true } : {}),
      ...(recovery
        ? supplementary
          ? { supplementaryPlanDigest: sha256(recovery) }
          : { recoveryPlanDigest: sha256(recovery) }
        : {}),
    });
  const manifestPath = join(directory, 'manifest.json'),
    journalPath = join(directory, 'journal.jsonl');
  let exists = false;
  try {
    await access(manifestPath);
    exists = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  let manifest: BenchmarkManifest;
  if (exists) {
    const value: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
    assertValidManifest(value);
    manifest = value;
    if (manifest.modelExperiment && !plan)
      throw new Error(
        'Supply the original --model-experiment plan when resuming or reporting this study.',
      );
    if (plan && sha256(plan) !== manifest.modelExperiment?.planDigest)
      throw new Error('Cannot change model experiment on resume.');
    if (experiment && sha256(experiment.arms) !== sha256(manifest.modelExperiment?.arms))
      throw new Error('Configured baseline changed; the original study remains frozen.');
    experiment = manifest.modelExperiment;
    if (experiment) applyExperimentOptions(experiment.plan, options);
    if (
      options.has('stream-generation') &&
      streamGeneration !== (manifest.streamGeneration === true)
    )
      throw new Error('Cannot change generation streaming on resume.');
    if (
      manifest.corpusDigest !== corpusDigest ||
      manifest.version !== corpusVersion ||
      manifest.executionDigest !==
        executionDigest(manifest.streamGeneration === true, manifest.models)
    )
      throw new Error(
        'Corpus, prompt, arms or selected task lane changed; use a fresh output directory.',
      );
    if (manifest.priorCommitmentUsd !== priorCommitmentUsd)
      throw new Error('Prior task commitment changed.');
    if (
      options.has('models') &&
      JSON.stringify(options.get('models')!.split(',').map(resolveArm)) !==
        JSON.stringify(manifest.models)
    )
      throw new Error('Cannot change models on resume.');
    for (const [option, field] of [
      ['cap-usd', 'capUsd'],
      ['concurrency', 'concurrency'],
      ['timeout-ms', 'timeoutMs'],
      ['per-call-usd', 'maxCostUsd'],
    ] as const)
      if (options.has(option) && Number(options.get(option)) !== manifest[field])
        throw new Error(`Cannot change ${option} on resume.`);
    if (options.has('billing-mode') && options.get('billing-mode') !== manifest.billingMode)
      throw new Error('Cannot change billing on resume.');
  } else {
    if (command === 'report') throw new Error('No manifest exists.');
    const models = experiment
      ? experiment.arms.map((arm) => arm.id)
      : (
          options.get('models') ??
          'jev,microsoft,luna-decision,luna-low,luna-medium,luna-high,spark-contributor'
        )
          .split(',')
          .map(resolveArm);
    if (models.some((m) => !m) || !models.length || new Set(models).size !== models.length)
      throw new Error('Select unique known benchmark model aliases.');
    const billing = options.get('billing-mode') ?? 'managed';
    if (billing !== 'managed' && billing !== 'byok') throw new Error('Unknown billing mode.');
    const connection =
      billing === 'byok'
        ? process.env['MACROFOLD_JEV_CONNECTION_ID'] ||
          process.env['MACROFOLD_PROVIDER_CONNECTION_ID']
        : undefined;
    manifest = {
      version: corpusVersion,
      corpusDigest,
      executionDigest: executionDigest(streamGeneration, models as string[]),
      priorCommitmentUsd,
      gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      runId: randomUUID(),
      models: models as BenchmarkManifest['models'],
      ...(experiment ? { modelExperiment: experiment } : {}),
      maxCostUsd: Number(options.get('per-call-usd') ?? 0.1),
      capUsd: Number(options.get('cap-usd') ?? 50),
      concurrency: Number(options.get('concurrency') ?? 4),
      timeoutMs: Number(options.get('timeout-ms') ?? 180000),
      baseUrl: process.env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210',
      ...(streamGeneration ? { streamGeneration: true } : {}),
      billingMode: billing,
      ...(connection ? { providerConnectionId: connection } : {}),
      startedAt: new Date().toISOString(),
    };
    assertValidManifest(manifest);
    if (command === 'run' && options.get('live') !== 'true')
      throw new Error('Explicit --live required before paid admission.');
    await writeFile(manifestPath, json(manifest), { flag: 'wx', mode: 0o600 });
  }
  const availableArms = experimentArms(manifest);
  const modelIndexes = new Map(manifest.models.map((model, index) => [model, index]));
  const recoveryKeys = recovery && new Set(recovery.selections.map((selection) => selection.key));
  const selectedTasks = [...taskById.values()].flatMap((task, index) => {
    const order = [
      ...manifest.models.slice(index % manifest.models.length),
      ...manifest.models.slice(0, index % manifest.models.length),
    ];
    return order
      .filter((model) => armSupportsTask(availableArms.get(model)!, task))
      .filter((model) => !recoveryKeys || recoveryKeys.has(`${model}:${task.id}`))
      .map((model) => {
        const arm = availableArms.get(model)!;
        const input = preparedArmInput(arm, task);
        return {
          task,
          arm,
          key: `${model}:${task.id}`,
          digest: sha256({ arm, input }),
          reserve: reservationForInputUsd(arm, input),
        };
      });
  });
  const preparedDeployments = new Map<string, PreparedDeploymentArm>();
  if (experiment) {
    const metadataBytes = selectedTasks.reduce(
      (bytes, { key, digest, reserve }, index) =>
        bytes + Buffer.byteLength(JSON.stringify({ key, digest, reserve })) + (index > 0 ? 1 : 0),
      Buffer.byteLength(JSON.stringify(experiment)) + 2,
    );
    if (metadataBytes > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
      throw new Error(
        'Resolved model experiment metadata exceeds the 20MB private evidence envelope.',
      );
  }
  const onlinePreflight = options.get('online-preflight') === 'true';
  if (command === 'report' && onlinePreflight)
    throw new Error('Reports are offline; use prepare --online-preflight=true for passive checks.');
  if (recovery) {
    if (manifest.capUsd !== recovery.capUsd || selectedTasks.length !== recoveryKeys!.size)
      throw new Error('Recovery task selection or aggregate cap changed.');
    const inputs = new Map(selectedTasks.map((task) => [task.key, task.digest]));
    for (const selected of recovery.selections)
      if (inputs.get(selected.key) !== selected.inputDigest)
        throw new Error('Recovery input differs from the proven never-invoked admission.');
  }
  const expected = new Map(selectedTasks.map((t) => [t.key, t.digest]));
  let events: BenchmarkJournalEvent[] = [];
  let journalSnapshot: string | undefined;
  try {
    journalSnapshot = await readFile(journalPath, 'utf8');
    events = validateJournal(parseJournal(journalSnapshot), manifest, expected);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new Error('Journal invalid; never retry uncertain admissions.', { cause: e });
  }
  const accounting = new BenchmarkAccounting(manifest.priorCommitmentUsd, events);
  const attempted = new Set(events.filter((e) => e.event === 'admitted').map((e) => e.key));
  const deploymentPreparation =
    (command === 'run' && options.get('live') === 'true') || onlinePreflight
      ? benchmarkDeploymentPreparation(manifest)
      : undefined;
  if (deploymentPreparation) {
    if ((process.env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210') !== manifest.baseUrl)
      throw new Error('Cannot change Macrofold host on resume.');
    if (command === 'prepare')
      for (const task of selectedTasks) {
        if (attempted.has(task.key)) continue;
        const prepared = await deploymentPreparation.prepare(task.arm, task.task);
        if (prepared) preparedDeployments.set(task.key, prepared);
      }
  }

  const rateGate = manifest.models.some((model) =>
    availableArms.get(model)!.transport.startsWith('openai'),
  )
    ? new OpenAiRateGate([
        ...(supplementary ? (recovery.rateHistory ?? []) : []),
        ...events.flatMap((event) => (event.record ? [event.record.result.receipt] : [])),
      ])
    : undefined;
  const records = () => events.flatMap((e) => (e.record ? [e.record] : []));
  const report = async () => {
    const allRecords = records();
    const comparison = summarize(
      scenes,
      allRecords.filter((r) => !r.sceneId.startsWith('generate-')),
      manifest.models,
      new Set(),
      availableArms,
    );
    const episodeById = new Map(episodes.map((e) => [e.id, e]));
    const generationRows = allRecords
      .filter((r) => r.sceneId.startsWith('generate-'))
      .map((r) => ({
        caseId: r.sceneId,
        model: r.model,
        outcome: r.result.outcome,
        ...(r.result.outcome === 'value'
          ? gradeGenerated(episodeById.get(r.sceneId.slice(9))!, r.generation)
          : {}),
      }));
    const recordsByModel = groupByModel(allRecords);
    const generationRowsByModel = groupByModel(generationRows);
    const output = {
      executionPhases: await readFile(join(directory, 'execution-phases.jsonl'), 'utf8')
        .then((text) =>
          text
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as unknown),
        )
        .catch((e: NodeJS.ErrnoException) => {
          if (e.code === 'ENOENT') return [];
          throw e;
        }),
      description: describe(),
      manifest,
      totalPlannedCalls: selectedTasks.length,
      admittedCalls: accounting.admittedCalls,
      unattemptedCalls: selectedTasks.length - accounting.admittedCalls,
      pendingAdmissions: accounting.pendingAdmissions,
      conservativeCommittedUsd: accounting.committedMicroUsd / 1e6,
      usageBasedEstimatedCostUsd: allRecords.reduce(
        (n, r) => n + (r.result.receipt.estimatedCostUsd ?? 0),
        0,
      ),
      providerReportedCostUsd: allRecords.reduce(
        (n, r) => n + (r.result.receipt.providerReportedCostUsd ?? 0),
        0,
      ),
      providerInvoiceMissingRuns: allRecords.filter(
        (r) => r.result.receipt.providerReportedCostUsd === undefined,
      ).length,
      unpricedOrUncertainRuns: allRecords.filter(
        (r) =>
          r.result.receipt.estimatedCostUsd === undefined || r.result.receipt.completionUncertain,
      ).length,
      ...comparison,
      ...(experiment
        ? {
            modelExperiment: experimentReport(experiment, allRecords, selectedTasks.length, events),
          }
        : {}),
      ...(rateGate
        ? {
            rateControl: {
              workers: options.get('workers') ?? String(manifest.concurrency),
              stoppedReason: rateStopReason ?? rateGate.stopReason ?? null,
            },
          }
        : {}),
      referenceReview: reviewedReferenceReport(
        scenes,
        allRecords,
        manifest.models,
        preparedReferenceReport,
        availableArms,
      ),
      generation: {
        planned: generationTasks.length,
        rows: generationRows,
        models: manifest.models.map((model) => {
          const rows = generationRowsByModel.get(model) ?? [];
          const runs = (recordsByModel.get(model) ?? []).filter((r) =>
            r.sceneId.startsWith('generate-'),
          );
          const times = runs.map((r) => r.result.receipt.latencyMs).sort((a, b) => a - b);
          const attemptTimes = runs
            .flatMap((r) => (r.attemptLatencyMs === undefined ? [] : [r.attemptLatencyMs]))
            .sort((a, b) => a - b);
          return {
            model,
            supported: !availableArms.get(model)!.transport.endsWith('decision'),
            answered: rows.filter((r) => r.outcome === 'value').length,
            submitted: rows.length,
            schemaValid: rows.filter((r) => r.schemaValid === true).length,
            planValid: rows.filter((r) => r.planValid === true).length,
            reactionLegal: rows.filter((r) => r.reactionLegal === true).length,
            strictFieldsPass: rows.filter((r) => r.schemaValid && r.planValid && r.reactionLegal)
              .length,
            referenceFeeling: rows.filter((r) => r.referenceFeeling === true).length,
            referenceExpression: rows.filter((r) => r.referenceExpression === true).length,
            allReferencesPass: rows.filter(
              (r) =>
                r.schemaValid &&
                r.planValid &&
                r.reactionLegal &&
                r.referenceFeeling &&
                r.referenceExpression,
            ).length,
            proseReviewRequired: rows.filter((r) => r.proseReview === 'required').length,
            p50LatencyMs: times[Math.max(0, Math.ceil(times.length * 0.5) - 1)] ?? null,
            p95LatencyMs: times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? null,
            p50AttemptLatencyMs:
              attemptTimes[Math.max(0, Math.ceil(attemptTimes.length * 0.5) - 1)] ?? null,
            p95AttemptLatencyMs:
              attemptTimes[Math.max(0, Math.ceil(attemptTimes.length * 0.95) - 1)] ?? null,
            usageBasedEstimatedCostUsd: runs.reduce(
              (n, r) => n + (r.result.receipt.estimatedCostUsd ?? 0),
              0,
            ),
            providerReportedCostUsd: runs.reduce(
              (n, r) => n + (r.result.receipt.providerReportedCostUsd ?? 0),
              0,
            ),
            unattempted: availableArms.get(model)!.transport.endsWith('decision')
              ? 0
              : generationTasks.length - rows.length,
          };
        }),
      },
      limitations: [
        'Ordinary LLM probabilities are self-reported estimates, not native decision-head probabilities.',
        'Failed/refused/capacity-limited and unattempted requests remain separate from answered quality.',
        'Free speech and thought fields require human review.',
        'Final provider invoices may differ from usage-based estimates; missing costs retain reservations.',
      ],
    };
    await writeFile(join(directory, 'summary.json'), json(output), { mode: 0o600 });
    console.log(
      json({
        manifest,
        totalPlannedCalls: output.totalPlannedCalls,
        admittedCalls: output.admittedCalls,
        unattemptedCalls: output.unattemptedCalls,
        conservativeCommittedUsd: output.conservativeCommittedUsd,
        usageBasedEstimatedCostUsd: output.usageBasedEstimatedCostUsd,
        providerReportedCostUsd: output.providerReportedCostUsd,
        unpricedOrUncertainRuns: output.unpricedOrUncertainRuns,
        models: comparison.models.map((m) => ({
          model: m.model,
          total: m.total,
          passed: m.passed,
          answeredQuality: m.answeredQuality,
          outcomes: m.outcomes,
          latencyMs: m.latencyMs,
        })),
        generation: output.generation.models,
      }),
    );
    return output;
  };
  if (command === 'prepare') {
    console.log(
      json({
        manifest,
        totalPlannedCalls: selectedTasks.length,
        preparedOffline: !onlinePreflight,
        preparedDeploymentRequests: preparedDeployments.size,
      }),
    );
    return;
  }
  if (command === 'report') {
    await report();
    return;
  }
  if (options.get('live') !== 'true') throw new Error('Explicit --live is required.');
  if ((process.env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210') !== manifest.baseUrl)
    throw new Error('Cannot change Macrofold host on resume.');
  if (
    manifest.models.some((m) => availableArms.get(m)!.transport.startsWith('macrofold')) &&
    !process.env['MACROFOLD_API_KEY']?.trim()
  )
    throw new Error('Missing Macrofold key.');
  if (
    manifest.models.some((m) => availableArms.get(m)!.transport.startsWith('openai')) &&
    !process.env['OPENAI_API_KEY']?.trim()
  )
    throw new Error('Missing OpenAI key.');
  const tasks = selectedTasks.filter((t) => !attempted.has(t.key));
  tasks.splice(Number(options.get('max-new') ?? tasks.length));
  console.log(
    json({
      preflight: {
        plannedCalls: selectedTasks.length,
        remainingCalls: tasks.length,
        sumConservativeReservationsUsd: tasks.reduce((n, t) => n + t.reserve, 0),
        largestReservationUsd: Math.max(0, ...tasks.map((t) => t.reserve)),
        capUsd: manifest.capUsd,
        priorCommitmentUsd: manifest.priorCommitmentUsd,
      },
    }),
  );
  const workers = executionWorkers(options.get('workers'), manifest.concurrency);
  const lock = await open(join(directory, 'RUNNING.lock'), 'wx', 0o600);
  try {
    const lockedSnapshot = await readFile(journalPath, 'utf8').catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      },
    );
    // A preceding writer can finish between preparation and lock acquisition.
    // Its durable admissions must never be repeated from our older snapshot.
    if (lockedSnapshot !== journalSnapshot)
      throw new Error('Journal changed before the writer lock; resume from its latest admissions.');
    await access(join(directory, 'recovery-claim.json'));
    throw new Error('The source ledger is frozen by its supplementary recovery lane.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      await lock.close();
      await unlink(join(directory, 'RUNNING.lock'));
      throw error;
    }
  }
  const journal = await open(journalPath, 'a', 0o600).catch(async (error) => {
    await lock.close();
    await unlink(join(directory, 'RUNNING.lock'));
    throw error;
  });
  const cleanup = async () => {
    await journal.close();
    await lock.close();
    await unlink(join(directory, 'RUNNING.lock'));
  };
  const executionPhase = randomUUID();
  try {
    // Runtime fallback comparisons import the server's prompt and decoder. Their
    // uncommitted code belongs in the same reproducible execution snapshot.
    const sourcePaths = [
      'packages/ai',
      'scripts/decision-benchmark',
      ...(adapter || experiment ? ['apps/server'] : []),
    ];
    const untrackedSource = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '-z', '--', ...sourcePaths],
      { encoding: 'utf8' },
    )
      .split('\0')
      .filter(
        (path) =>
          /\.(?:[cm]?[jt]sx?|json|wasm)$/.test(path) &&
          !/(?:^|\/)(?:tests?|__tests__|fixtures|__fixtures__)\//.test(path) &&
          !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path),
      );
    // The retained diff includes staged new files, but Git omits untracked
    // implementation files. Refuse before funding an unreproducible phase.
    if (untrackedSource.length)
      throw new Error(
        `Untracked benchmark source is missing from the phase snapshot; add or commit it first: ${untrackedSource.join(', ')}`,
      );
    const sourceDiff = execFileSync(
      'git',
      ['diff', '--no-ext-diff', '--no-textconv', 'HEAD', '--', ...sourcePaths],
      {
        encoding: 'utf8',
      },
    );
    await writeFile(join(directory, `source-diff-${executionPhase}.patch`), sourceDiff, {
      flag: 'wx',
      mode: 0o600,
    });
    const phases = await open(join(directory, 'execution-phases.jsonl'), 'a', 0o600);
    try {
      await phases.write(
        JSON.stringify({
          id: executionPhase,
          runId: manifest.runId,
          startedAt: new Date().toISOString(),
          workers,
          sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
          sourceDiffDigest: sha256(sourceDiff),
        }) + '\n',
      );
      await phases.sync();
    } finally {
      await phases.close();
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
  const cancellation = new AbortController();
  const stop = () => cancellation.abort();
  // Preparation performs asynchronous file work before local signal handlers exist.
  // Retain a parent cancellation received during that interval before any admission.
  parentSignal?.addEventListener('abort', stop, { once: true });
  if (parentSignal?.aborted) stop();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  let journalTail = Promise.resolve();
  const append = (e: BenchmarkJournalEvent) => {
    journalTail = journalTail.then(async () => {
      await journal.write(`${JSON.stringify(e)}\n`);
      await journal.sync();
      events.push(e);
      accounting.apply(e);
    });
    return journalTail;
  };
  let next = 0,
    inFlightMicro = 0;
  const blockedArms = new Set<string>();
  const resourceKey = (arm: (typeof selectedTasks)[number]['arm']) => {
    const deployment = arm.macrofoldDeployment;
    // Deployment authorization and funding belong to the workspace/service, regardless
    // of an arm's revision pin or unused catalog billing/connection defaults.
    return deployment
      ? JSON.stringify([
          'macrofold-deployment',
          deployment.workspaceId,
          deployment.modelBinding.deployment_id,
        ])
      : JSON.stringify([
          arm.transport,
          arm.model,
          arm.billingMode ?? manifest.billingMode,
          arm.providerConnectionId ?? manifest.providerConnectionId ?? null,
        ]);
  };
  const worker = async () => {
    taskLoop: while (!cancellation.signal.aborted) {
      const task = tasks[next++];
      if (!task) return;
      if (blockedArms.has(resourceKey(task.arm))) continue;
      if (rateGate?.stopReason && task.arm.transport.startsWith('openai')) {
        rateStopReason = rateGate.stopReason;
        continue;
      }
      const requestId = `olbench:${manifest.runId}:${task.task.id}:${modelIndexes.get(task.arm.id)}`;
      const stopped = () =>
        cancellation.signal.aborted ||
        blockedArms.has(resourceKey(task.arm)) ||
        (task.arm.transport.startsWith('openai') && rateGate?.stopReason !== undefined);
      const reserved = micro(task.reserve);
      if (task.reserve > manifest.maxCostUsd)
        throw new Error(`Credible reservation exceeds per-call ceiling: ${task.task.id}`);
      const hasHeadroom = () =>
        accounting.committedMicroUsd + inFlightMicro + reserved <= micro(manifest.capUsd);
      if (!hasHeadroom() || cancellation.signal.aborted) return;
      if (stopped()) continue taskLoop;
      if (rateGate && task.arm.transport.startsWith('openai')) {
        // Rate capacity includes the complete Responses output allowance, while
        // native decisions consume only input tokens. Reuse this bound while waiting.
        const tokenUpperBound =
          Buffer.byteLength(JSON.stringify(preparedArmInput(task.arm, task.task))) +
          4096 +
          (task.arm.transport === 'openai-response' ? outputTokens : 0);
        for (;;) {
          // Budget can change during a cooldown. Never claim rate capacity for
          // a request that will immediately stop for lack of funded headroom.
          if (!hasHeadroom() || cancellation.signal.aborted) return;
          if (stopped()) continue taskLoop;
          const admission = rateGate.beforeNext(tokenUpperBound, Date.now(), requestId);
          if (admission.blockedReason) {
            rateStopReason = admission.blockedReason;
            continue taskLoop;
          }
          if (admission.waitMs === 0) break;
          console.log(JSON.stringify({ rateWaitMs: admission.waitMs, model: task.arm.id }));
          await new Promise<void>((resolve) => {
            const timer = setTimeout(done, Math.min(admission.waitMs, 60_000));
            function done() {
              clearTimeout(timer);
              cancellation.signal.removeEventListener('abort', done);
              resolve();
            }
            cancellation.signal.addEventListener('abort', done, { once: true });
          });
          if (cancellation.signal.aborted) return;
        }
      }
      // Resolve only selected new work. Later requests can refresh after an actual
      // revision/unsupported receipt; in-flight and already admitted attempts keep theirs.
      const started = Date.now(),
        monotonicStart = performance.now();
      const deadlineMs = started + manifest.timeoutMs;
      let prepared: PreparedDeploymentArm | undefined;
      let preparationFailure: ReturnType<typeof deploymentPreparationFailure> | undefined;
      try {
        prepared = await deploymentPreparation?.prepare(task.arm, task.task, {
          signal: cancellation.signal,
          deadlineMs,
        });
      } catch (error) {
        preparationFailure = deploymentPreparationFailure(
          error,
          task.arm,
          task.task,
          requestId,
          started,
        );
      }
      if (!hasHeadroom() || cancellation.signal.aborted) return;
      if (stopped()) continue taskLoop;
      // Claim headroom synchronously before awaiting the serialized journal write.
      inFlightMicro += reserved;
      await append({
        event: 'admitted',
        key: task.key,
        requestId,
        reservedUsd: task.reserve,
        at: new Date().toISOString(),
      });
      inFlightMicro -= reserved;
      const remainingMs = Math.max(0, manifest.timeoutMs - (performance.now() - monotonicStart));
      const result =
        preparationFailure ??
        (await executeArm(
          task.arm,
          task.task,
          manifest,
          requestId,
          task.reserve,
          // The synced admission already includes this reserve. Another worker may
          // have settled above its reserve during that await; do not fund a new call.
          stopped() || accounting.committedMicroUsd + inFlightMicro > micro(manifest.capUsd)
            ? AbortSignal.abort()
            : cancellation.signal,
          async (runId) => {
            await append({
              event: 'accepted',
              key: task.key,
              requestId,
              runId,
              at: new Date().toISOString(),
            });
          },
          prepared,
          {
            deadlineMs: Math.min(deadlineMs, Date.now() + remainingMs),
            timeoutMs: Math.max(1, Math.floor(remainingMs)),
          },
        ));
      deploymentPreparation?.observeReceipt(task.arm, result.result.receipt);
      adapter?.decode(task.task, result);
      if (rateGate && task.arm.transport.startsWith('openai'))
        rateGate.observe(result.result.receipt, Date.now());
      const record: RunRecord = {
        executionPhase,
        sceneId: task.task.id,
        model: task.arm.id,
        requestId,
        inputDigest: task.digest,
        attemptLatencyMs: performance.now() - monotonicStart,
        ...(prepared ? { outputMode: prepared.macrofoldOutputMode } : {}),
        ...(manifest.streamGeneration && task.arm.transport === 'macrofold-generation'
          ? { stream: true }
          : {}),
        ...result,
      };
      if ([401, 402, 403, 404].includes(record.result.receipt.httpStatus ?? 0))
        blockedArms.add(resourceKey(task.arm));
      // A sibling may be waiting for admission persistence ahead of this result.
      // Preserve newly known excess cost immediately; release no headroom until synced.
      const excess = Math.max(0, knownReceiptMicroUsd(record.result.receipt) - reserved);
      inFlightMicro += excess;
      try {
        await append({
          event: 'result',
          key: task.key,
          requestId,
          record,
          at: new Date().toISOString(),
        });
      } finally {
        inFlightMicro -= excess;
      }
      const count = accounting.completedCalls;
      if (count % 10 === 0 || record.result.outcome !== 'value')
        console.log(
          JSON.stringify({
            completed: count,
            total: selectedTasks.length,
            model: task.arm.id,
            sceneId: task.task.id,
            outcome: record.result.outcome,
            ...(record.result.outcome === 'value' ? {} : { reason: record.result.reason }),
            conservativeCommittedUsd: accounting.committedMicroUsd / 1e6,
          }),
        );
    }
  };
  try {
    const results = await Promise.allSettled(Array.from({ length: workers }, worker));
    await journalTail;
    await report();
    for (const r of results) if (r.status === 'rejected') throw r.reason;
  } finally {
    cancellation.abort();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    parentSignal?.removeEventListener('abort', stop);
    await cleanup();
  }
}
