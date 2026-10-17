import { open, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { MacrofoldTransport } from '../../packages/ai/src/macrofold.js';
import { armById } from './arms.js';
import { sha256 } from './corpus.js';
import { summarize } from './evaluate.js';
import { preparedArmInput } from './execute.js';
import { gradeGenerated } from './generation.js';
import { episodes } from './complex-scenes.js';
import { assertValidManifest, parseJournal, validateJournal } from './journal.js';
import {
  buildRecoveryPlan,
  mergeRecoveryResults,
  type MacrofoldRecoveryProof,
} from './recovery.js';
import { committedMicroUsd, prepareBenchmarkTasks, runBenchmark } from './run.js';
import type { BenchmarkScene } from './types.js';
import { reviewedReferenceReport } from './reference-report.js';

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
async function freezeFile(path: string, value: unknown) {
  const text = json(value);
  try {
    const file = await open(path, 'wx', 0o600);
    try {
      await file.writeFile(text);
      await file.sync();
    } finally {
      await file.close();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if ((await readFile(path, 'utf8')) !== text)
      throw new Error('Recovery evidence changed; refusing a different recovery plan.');
  }
}

/** Explicit repair of an integration admission defect. This is never called by `run`.
 * Hold the source writer lock through proof collection, funding and final reporting:
 * recovery cannot race the original runner for the same task-wide spending allowance.
 */
export async function recoverBudgetAdmissions(
  directory: string,
  options: Map<string, string>,
  scenes: BenchmarkScene[],
  describe: () => unknown,
) {
  const source = options.get('source');
  if (!source || !isAbsolute(source) || !isAbsolute(directory))
    throw new Error('Recovery needs distinct absolute source and output directories.');
  if (options.get('live') !== 'true') throw new Error('Explicit --live is required for recovery.');
  const sourceDirectory = await realpath(source),
    recoveryDirectory = await realpath(directory);
  if (sourceDirectory === recoveryDirectory)
    throw new Error('Recovery source and output must be distinct physical directories.');
  const lockPath = join(source, 'RUNNING.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  try {
    // One source may fund only one recovery lane, even after that lane exits.
    const claimPath = join(sourceDirectory, 'recovery-claim.json');
    try {
      const claim: unknown = JSON.parse(await readFile(claimPath, 'utf8'));
      if (
        !claim ||
        typeof claim !== 'object' ||
        Array.isArray(claim) ||
        !('directory' in claim) ||
        claim.directory !== recoveryDirectory
      )
        throw new Error('Source is already bound to a different recovery directory.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const manifest: unknown = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'));
    assertValidManifest(manifest);
    if ((process.env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210') !== manifest.baseUrl)
      throw new Error('Recovery cannot change the source Macrofold host.');
    if (
      manifest.billingMode === 'byok' &&
      (process.env['MACROFOLD_JEV_CONNECTION_ID'] ||
        process.env['MACROFOLD_PROVIDER_CONNECTION_ID']) !== manifest.providerConnectionId
    )
      throw new Error('Recovery cannot change the source funding connection.');
    const sourceText = await readFile(join(source, 'journal.jsonl'), 'utf8');
    let preparation = prepareBenchmarkTasks(scenes, true);
    let generation = true;
    if (preparation.corpusDigest !== manifest.corpusDigest) {
      preparation = prepareBenchmarkTasks(scenes, false);
      generation = false;
    }
    if (preparation.corpusDigest !== manifest.corpusDigest)
      throw new Error('Recovery corpus differs from the frozen source.');
    const expected = new Map<string, string>();
    for (const task of preparation.taskById.values())
      for (const model of manifest.models) {
        const arm = armById.get(model)!;
        if (!task.generation || !arm.transport.endsWith('decision'))
          expected.set(`${model}:${task.id}`, sha256({ arm, input: preparedArmInput(arm, task) }));
      }
    const events = validateJournal(parseJournal(sourceText), manifest, expected);
    const originals = events.flatMap((event) => (event.record ? [event.record] : []));
    if (events.filter((event) => event.event === 'admitted').length !== originals.length)
      throw new Error('Source admissions must all finish before recovery.');
    const candidates = originals.filter(
      (record) =>
        armById.get(record.model)?.transport === 'macrofold-generation' &&
        record.result.outcome === 'failed' &&
        record.result.reason === 'provider_failed' &&
        !record.result.receipt.completionUncertain &&
        record.result.receipt.estimatedCostUsd === 0,
    );
    const proofPath = join(directory, 'recovery-proofs.json');
    let proofs: MacrofoldRecoveryProof[];
    try {
      const saved: unknown = JSON.parse(await readFile(proofPath, 'utf8'));
      if (!Array.isArray(saved)) throw new Error('Invalid saved recovery proofs.');
      proofs = saved.map((value: unknown) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !('runId' in value) ||
          typeof value.runId !== 'string' ||
          !('status' in value) ||
          !('result' in value)
        )
          throw new Error('Invalid saved recovery proof.');
        return { runId: value.runId, status: value.status, result: value.result };
      });
      const candidatesByRun = new Set(
        candidates.map((record) => record.result.receipt.providerRequestId),
      );
      if (
        proofs.length !== candidates.length ||
        proofs.some((proof) => !candidatesByRun.has(proof.runId))
      )
        throw new Error('Saved recovery proofs do not match the frozen source candidates.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const api = new MacrofoldTransport(manifest.baseUrl, process.env['MACROFOLD_API_KEY'] ?? '');
      proofs = [];
      // GET only. The final never-invoked proof is frozen and reused on lane resume.
      for (const record of candidates) {
        const runId = record.result.receipt.providerRequestId;
        if (!runId) throw new Error('Recovery candidate lacks its accepted Run.');
        const [status, result] = await Promise.all([
          api.request(
            `/v1/runs/${encodeURIComponent(runId)}`,
            undefined,
            undefined,
            AbortSignal.timeout(manifest.timeoutMs),
          ),
          api.request(
            `/v1/runs/${encodeURIComponent(runId)}/result`,
            undefined,
            undefined,
            AbortSignal.timeout(manifest.timeoutMs),
          ),
        ]);
        proofs.push({ runId, status, result });
      }
    }
    const plan = buildRecoveryPlan(manifest, events, expected, proofs);
    await freezeFile(proofPath, proofs);
    await freezeFile(join(directory, 'recovery-plan.json'), plan);
    // Persist the exclusive lane before any new funded admission.
    await freezeFile(claimPath, {
      directory: recoveryDirectory,
      sourceManifestDigest: plan.sourceManifestDigest,
      sourceJournalDigest: plan.sourceJournalDigest,
      planDigest: sha256(plan),
    });
    const recoveryOptions = new Map<string, string>([
      ['live', 'true'],
      ['models', 'spark-contributor'],
      ['billing-mode', manifest.billingMode],
      [
        'stream-generation',
        options.get('stream-generation') ?? String(manifest.streamGeneration === true),
      ],
      ['generation', String(generation)],
      ['cap-usd', String(manifest.capUsd)],
      ['per-call-usd', String(manifest.maxCostUsd)],
      ['timeout-ms', String(manifest.timeoutMs)],
      ['workers', options.get('workers') ?? '16'],
    ]);
    if (options.has('max-new')) recoveryOptions.set('max-new', options.get('max-new')!);
    await runBenchmark('run', directory, recoveryOptions, scenes, describe, plan);
    if ((await readFile(join(source, 'journal.jsonl'), 'utf8')) !== sourceText)
      throw new Error('Source journal changed while recovery held its lock.');
    const recoveryManifest: unknown = JSON.parse(
      await readFile(join(directory, 'manifest.json'), 'utf8'),
    );
    assertValidManifest(recoveryManifest);
    const selectedInputs = new Map(
      plan.selections.map((selection) => [selection.key, selection.inputDigest]),
    );
    const recoveryEvents = validateJournal(
      parseJournal(await readFile(join(directory, 'journal.jsonl'), 'utf8')),
      recoveryManifest,
      selectedInputs,
    );
    const recovered = recoveryEvents.flatMap((event) => (event.record ? [event.record] : []));
    const merged = mergeRecoveryResults(originals, recovered, plan);
    const episodeById = new Map(episodes.map((episode) => [episode.id, episode]));
    const generationRows = merged.comparisonRecords
      .filter((record) => record.sceneId.startsWith('generate-'))
      .map((record) => ({
        caseId: record.sceneId,
        model: record.model,
        outcome: record.result.outcome,
        ...(record.result.outcome === 'value'
          ? gradeGenerated(episodeById.get(record.sceneId.slice(9))!, record.generation)
          : {}),
      }));
    const output = {
      sourceRunId: manifest.runId,
      sourceManifestDigest: plan.sourceManifestDigest,
      sourceJournalDigest: plan.sourceJournalDigest,
      replacedNeverInvokedCalls: merged.replacedNeverInvokedCalls,
      pendingRecoveryCalls: merged.pendingRecoveryCalls,
      serviceAttempts: merged.serviceAttempts.length,
      conservativeCommittedUsd: committedMicroUsd(recoveryEvents, plan.priorCommitmentUsd) / 1e6,
      usageBasedEstimatedCostUsd: merged.serviceAttempts.reduce(
        (sum, record) => sum + (record.result.receipt.estimatedCostUsd ?? 0),
        0,
      ),
      providerReportedCostUsd: merged.serviceAttempts.reduce(
        (sum, record) => sum + (record.result.receipt.providerReportedCostUsd ?? 0),
        0,
      ),
      ...summarize(
        scenes,
        merged.comparisonRecords.filter((record) => !record.sceneId.startsWith('generate-')),
        manifest.models,
      ),
      referenceReview: reviewedReferenceReport(scenes, merged.comparisonRecords, manifest.models),
      generation: { cases: preparation.generationTasks.length, rows: generationRows },
    };
    await writeFile(join(directory, 'comparison-records.json'), json(merged.comparisonRecords), {
      mode: 0o600,
    });
    await writeFile(join(directory, 'combined-summary.json'), json(output), { mode: 0o600 });
    console.log(
      json({
        recovery: {
          planned: plan.selections.length,
          completed: recovered.length,
          pending: merged.pendingRecoveryCalls,
        },
      }),
    );
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
