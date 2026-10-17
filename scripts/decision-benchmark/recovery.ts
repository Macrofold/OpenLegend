import { macrofoldInferenceEvidence } from '../../packages/ai/src/index.js';
import { armById } from './arms.js';
import { sha256 } from './corpus.js';
import type { RunRecord } from './evaluate.js';
import { validateJournal, type BenchmarkManifest } from './journal.js';
import { committedMicroUsd } from './run.js';

export interface MacrofoldRecoveryProof {
  runId: string;
  status: unknown;
  result: unknown;
}
export interface RecoverySelection {
  key: string;
  model: string;
  sceneId: string;
  inputDigest: string;
  originalRequestId: string;
  originalRunId: string;
  proofDigest: string;
  originalRecordDigest: string;
}
export interface BenchmarkRecoveryPlan {
  sourceRunId: string;
  sourceManifestDigest: string;
  sourceJournalDigest: string;
  /** Includes earlier reservations, actual charges and uncertain commitments exactly once. */
  priorCommitmentUsd: number;
  capUsd: number;
  selections: RecoverySelection[];
}
const keyOf = (record: RunRecord) => `${record.model}:${record.sceneId}`;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Recovery proof must contain an object.');
  return value as Record<string, unknown>;
}
function requireProof(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`Unsafe benchmark recovery: ${reason}.`);
}

/** Only an explicit terminal, zero-charge, never-invoked budget refusal permits a new call.
 * The caller must freeze/lock the source journal before acting on this read-only selection.
 * A local "dispatched" receipt alone describes admission to Macrofold, not model execution.
 */
export function buildRecoveryPlan(
  manifest: BenchmarkManifest,
  journal: unknown[],
  expectedInputs: Map<string, string>,
  proofs: MacrofoldRecoveryProof[],
): BenchmarkRecoveryPlan {
  const events = validateJournal(journal, manifest, expectedInputs);
  const records = events.flatMap((event) => (event.record ? [event.record] : []));
  const byKey = new Map(records.map((record) => [keyOf(record), record]));
  requireProof(
    events.every((event) => event.event !== 'admitted' || byKey.has(event.key)),
    'source journal has unfinished admissions',
  );
  const accepted = new Map(
    events.flatMap((event) =>
      event.event === 'accepted' ? [[event.runId!, event.key] as const] : [],
    ),
  );
  const seen = new Set<string>();
  const selections = proofs.map((proof): RecoverySelection => {
    requireProof(!seen.has(proof.runId), 'duplicate original Run proof');
    seen.add(proof.runId);
    const key = accepted.get(proof.runId);
    requireProof(key, 'Run is not an accepted source admission');
    const record = byKey.get(key)!;
    const arm = armById.get(record.model);
    const { result } = record;
    const receipt = result.receipt;
    requireProof(arm?.transport === 'macrofold-generation', 'not a Macrofold generation call');
    requireProof(
      result.outcome === 'failed' && result.reason === 'provider_failed',
      'original is not a failed provider admission',
    );
    requireProof(
      receipt.dispatched &&
        !receipt.completionUncertain &&
        receipt.providerRequestId === proof.runId &&
        receipt.estimatedCostUsd === 0 &&
        (receipt.providerReportedCostUsd === undefined || receipt.providerReportedCostUsd === 0) &&
        receipt.usage !== undefined &&
        Object.values(receipt.usage).every((value) => value === undefined || value === 0),
      'original may have incurred execution or spending',
    );
    const status = object(proof.status),
      terminalResult = object(proof.result),
      inference = object(terminalResult.inference);
    const evidence = macrofoldInferenceEvidence(proof.runId, status, terminalResult);
    requireProof(
      status.status === 'failed' &&
        status.failure_code === 'run_budget_exhausted' &&
        status.model === arm.model &&
        status.cost_micro_usd === '0' &&
        !evidence.completionUncertain &&
        evidence.uninvokedInferenceChargeUsd === 0 &&
        inference.model === arm.model &&
        inference.outcome === 'failed' &&
        inference.provider_outcome === 'not_invoked' &&
        inference.provider_request_digest === null &&
        (inference.provider_request_id === undefined || inference.provider_request_id === null) &&
        object(inference.validation).status === 'not_run',
      'authoritative Run does not prove a zero-charge budget refusal before model invocation',
    );
    return {
      key,
      model: record.model,
      sceneId: record.sceneId,
      inputDigest: record.inputDigest,
      originalRequestId: record.requestId,
      originalRunId: proof.runId,
      proofDigest: sha256(proof),
      originalRecordDigest: sha256(record),
    };
  });
  return {
    sourceRunId: manifest.runId,
    sourceManifestDigest: sha256(manifest),
    sourceJournalDigest: sha256(events),
    priorCommitmentUsd: committedMicroUsd(events, manifest.priorCommitmentUsd) / 1_000_000,
    capUsd: manifest.capUsd,
    selections,
  };
}

/** Service attempts remain intact; comparison removes only proven never-invoked originals.
 * A missing recovery stays absent from that view, rather than becoming a fabricated answer.
 * Recoveries must first pass their own durable journal validation at the execution boundary.
 */
export function mergeRecoveryResults(
  source: RunRecord[],
  recovery: RunRecord[],
  plan: BenchmarkRecoveryPlan,
) {
  const originals = new Map<string, RunRecord>();
  for (const record of source) {
    requireProof(!originals.has(keyOf(record)), 'duplicate source result');
    originals.set(keyOf(record), record);
  }
  const selected = new Map<string, RecoverySelection>();
  for (const selection of plan.selections) {
    const original = originals.get(selection.key);
    requireProof(!selected.has(selection.key), 'duplicate recovery selection');
    requireProof(
      original &&
        sha256(original) === selection.originalRecordDigest &&
        original.inputDigest === selection.inputDigest &&
        original.requestId === selection.originalRequestId &&
        original.result.receipt.providerRequestId === selection.originalRunId &&
        original.result.outcome === 'failed' &&
        !original.result.receipt.completionUncertain,
      'source result differs from the proven original',
    );
    selected.set(selection.key, selection);
  }
  const seen = new Set<string>();
  for (const record of recovery) {
    const key = keyOf(record),
      selection = selected.get(key);
    requireProof(selection && !seen.has(key), 'unselected or duplicate recovery result');
    requireProof(
      record.inputDigest === selection.inputDigest &&
        record.requestId !== selection.originalRequestId &&
        record.result.receipt.providerRequestId !== selection.originalRunId,
      'recovery changed input or reused the original invocation identity',
    );
    seen.add(key);
  }
  return {
    serviceAttempts: [...source, ...recovery],
    comparisonRecords: [...source.filter((record) => !selected.has(keyOf(record))), ...recovery],
    replacedNeverInvokedCalls: recovery.length,
    pendingRecoveryCalls: plan.selections.length - recovery.length,
  };
}
