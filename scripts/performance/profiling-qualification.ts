import { digest } from './profiling-plan.js';

export const PROFILER_SAFETY_CHECK_NAMES = [
  'disabled-equivalence',
  'selected-equivalence',
  'return-throw-cancel',
  'capture-lifecycle',
  'async-generators',
  'privacy-correction',
  'sql-histogram-phase',
  'current-save-restore',
  'cognition-inputs-effects',
] as const;

export interface OverheadRun {
  id: string;
  repetition: number;
  nodeCpuMs: number | null;
  ownedCpuMs: number | null;
  workUnits: number;
  commandP95Ms: number | null;
  commandLatencyApplicable: boolean;
  stalled: boolean;
  paused: boolean;
  failures: number;
  quotaCrossings: number;
  canonicalHash?: string;
  inputHash?: string;
  comparisonIdentity: string;
  completed: boolean;
  artifactIntegrity: boolean;
  assertionsPassed: boolean;
  sourceVerified: boolean;
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
const finiteNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const range = (values: number[]) =>
  values.length ? { minimum: Math.min(...values), maximum: Math.max(...values) } : null;

/** Pure reporting/admission support. Calling this never runs a missing comparison.
 * Artifact-derived evidence is mandatory: absence must not become false or zero. */
export function qualifyOverhead(
  pairs: Array<{ baseline: OverheadRun; measured: OverheadRun }>,
  fixedWork: boolean,
  semanticsVerified: boolean,
) {
  const reasons: string[] = [];
  if (semanticsVerified !== true)
    reasons.push('The matching profiler-safety proof has not passed.');
  if (
    pairs.length !== 3 ||
    new Set(pairs.map(({ measured }) => measured.repetition)).size !== 3 ||
    pairs.some(
      ({ baseline, measured }) =>
        baseline.repetition !== measured.repetition || ![1, 2, 3].includes(measured.repetition),
    )
  )
    reasons.push('Three distinct matched repetitions 1, 2 and 3 are required.');
  const observations = pairs.map(({ baseline, measured }) => {
    for (const run of [baseline, measured]) {
      if (
        run.completed !== true ||
        run.artifactIntegrity !== true ||
        run.assertionsPassed !== true ||
        run.sourceVerified !== true
      )
        reasons.push(
          `${run.id}: completed, checksum-verified, source-matched positive workload evidence is required.`,
        );
      if (!finiteNonnegative(run.workUnits) || run.workUnits === 0)
        reasons.push(`${run.id}: no demonstrated completed work.`);
      if (
        typeof run.stalled !== 'boolean' ||
        typeof run.paused !== 'boolean' ||
        !finiteNonnegative(run.failures) ||
        !finiteNonnegative(run.quotaCrossings)
      )
        reasons.push(`${run.id}: stall, pause, failure or quota evidence is missing.`);
    }
    if (!baseline.comparisonIdentity || baseline.comparisonIdentity !== measured.comparisonIdentity)
      reasons.push(
        `${measured.id}: the frozen workload, phases, sources or machine do not form a matched pair.`,
      );
    if (baseline.workUnits !== measured.workUnits)
      reasons.push(
        `${measured.id}: completed useful-work counts differ; overhead is inconclusive.`,
      );
    if (
      fixedWork &&
      (!baseline.canonicalHash ||
        baseline.canonicalHash !== measured.canonicalHash ||
        !baseline.inputHash ||
        baseline.inputHash !== measured.inputHash)
    )
      reasons.push(
        `${measured.id}: identical admitted fixed work, ordering and canonical effects are not demonstrated.`,
      );
    if (
      (measured.stalled && !baseline.stalled) ||
      (measured.paused && !baseline.paused) ||
      measured.failures > baseline.failures ||
      measured.quotaCrossings > baseline.quotaCrossings
    )
      reasons.push(`${measured.id}: new stall, pause, failure or quota crossing.`);
    if (
      baseline.commandLatencyApplicable !== measured.commandLatencyApplicable ||
      typeof measured.commandLatencyApplicable !== 'boolean'
    )
      reasons.push(`${measured.id}: command latency applicability is unknown or differs.`);
    const cpu = (value: number | null, units: number) =>
      finiteNonnegative(value) && units > 0 ? value / units : null;
    const baseNode = cpu(baseline.nodeCpuMs, baseline.workUnits),
      nextNode = cpu(measured.nodeCpuMs, measured.workUnits);
    const baseOwned = cpu(baseline.ownedCpuMs, baseline.workUnits),
      nextOwned = cpu(measured.ownedCpuMs, measured.workUnits);
    const ratio = (a: number | null, b: number | null) =>
      a !== null && b !== null && a > 0 ? b / a - 1 : null;
    const commandApplicable =
      baseline.commandLatencyApplicable === true || measured.commandLatencyApplicable === true;
    const latencyKnown =
      finiteNonnegative(baseline.commandP95Ms) && finiteNonnegative(measured.commandP95Ms);
    return {
      repetition: measured.repetition,
      baseline: baseline.id,
      measured: measured.id,
      nodeCpuIncrease: ratio(baseNode, nextNode),
      ownedCpuIncrease: ratio(baseOwned, nextOwned),
      commandApplicable,
      commandIncreaseMs: latencyKnown ? measured.commandP95Ms! - baseline.commandP95Ms! : null,
      commandAllowedIncreaseMs: finiteNonnegative(baseline.commandP95Ms)
        ? Math.max(2, baseline.commandP95Ms * 0.05)
        : null,
      baselineWorkUnits: baseline.workUnits,
      measuredWorkUnits: measured.workUnits,
    };
  });
  const node = observations.flatMap((row) =>
    row.nodeCpuIncrease === null ? [] : [row.nodeCpuIncrease],
  );
  const owned = observations.flatMap((row) =>
    row.ownedCpuIncrease === null ? [] : [row.ownedCpuIncrease],
  );
  if (node.length !== 3 || owned.length !== 3)
    reasons.push('Node and total owned CPU accounting are both required.');
  const medianNode = median(node),
    medianOwned = median(owned);
  if ((medianNode !== null && medianNode > 0.03) || (medianOwned !== null && medianOwned > 0.03))
    reasons.push('Median CPU per completed work unit exceeds the 3% threshold.');
  if (
    observations.some(
      (row) =>
        row.commandApplicable &&
        (row.commandIncreaseMs === null ||
          row.commandAllowedIncreaseMs === null ||
          row.commandIncreaseMs > row.commandAllowedIncreaseMs),
    )
  )
    reasons.push('Applicable command latency is missing or exceeds max(5%, 2 ms).');
  return {
    status: reasons.length ? 'unqualified-overhead' : 'qualified',
    reasons: [...new Set(reasons)],
    observations,
    medianNodeCpuIncrease: medianNode,
    medianOwnedCpuIncrease: medianOwned,
    nodeCpuIncreaseRange: range(node),
    ownedCpuIncreaseRange: range(owned),
    limitation:
      'Three pairs and these thresholds are engineering acceptance, not statistical certainty. Preserve all individual results; realtime admitted-work differences are not semantic equivalence.',
  };
}

const operationalKeys = new Set([
  'transportId',
  'attemptId',
  'jobId',
  'requestId',
  'externalStartedAtUnixMs',
  'externalCompletedAtUnixMs',
  'operationalReceiptId',
]);
/** Only transport identities explicitly named here are normalized; fictional time/order/private content remain. */
export function canonicalReplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalReplay);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !operationalKeys.has(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalReplay(child)]),
  );
}
export function compareCognitionReplay(reference: unknown, measured: unknown) {
  const referenceHash = digest(canonicalReplay(reference)),
    measuredHash = digest(canonicalReplay(measured));
  return {
    equal: referenceHash === measuredHash,
    referenceHash,
    measuredHash,
    normalization: [...operationalKeys],
    requirement:
      'Permitted subjects/details, freshness, fictional timestamps/order, offers, missing content, correction and effects must match. A live model quality conclusion is excluded.',
  };
}

export function admissionForCampaign(input: {
  limitUsd: number;
  alreadyChargedUsd: number;
  outstandingUsd: number;
  maximumNextCommitmentUsd: number | null;
  pricesObservedAt?: string[];
  now: number;
}) {
  const reasons: string[] = [];
  if (
    !finiteNonnegative(input.limitUsd) ||
    input.limitUsd === 0 ||
    !finiteNonnegative(input.alreadyChargedUsd) ||
    !finiteNonnegative(input.outstandingUsd) ||
    !finiteNonnegative(input.now) ||
    (input.maximumNextCommitmentUsd !== null && !finiteNonnegative(input.maximumNextCommitmentUsd))
  )
    reasons.push(
      'Campaign allowance, commitments and current time must be finite nonnegative values.',
    );
  if (input.maximumNextCommitmentUsd === null)
    reasons.push('Maximum commitment has not been priced.');
  if (
    !input.pricesObservedAt?.length ||
    input.pricesObservedAt.some(
      (value) =>
        !Number.isFinite(Date.parse(value)) ||
        Date.parse(value) > input.now ||
        input.now - Date.parse(value) > 86400000,
    )
  )
    reasons.push('Current official hardware/storage prices are required.');
  const allowance = input.limitUsd * 0.9;
  if (
    input.maximumNextCommitmentUsd !== null &&
    input.alreadyChargedUsd + input.outstandingUsd + input.maximumNextCommitmentUsd > allowance
  )
    reasons.push('Commitment exceeds the campaign allowance after its 10% uncertainty reserve.');
  return {
    admitted: reasons.length === 0,
    reasons,
    executionAllowanceUsd: allowance,
    uncertaintyReserveUsd: input.limitUsd - allowance,
  };
}
