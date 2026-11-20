import { digest, identifier, integer, jsonFile, list, object, sha256, text } from './contract.js';
import type { FrozenPlan } from './plan.js';
import type { CaseResult } from './report-evidence.js';

export function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function statistics(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return {
    n: values.length,
    min: ordered[0]!,
    median: ordered.length % 2 ? ordered[middle]! : (ordered[middle - 1]! + ordered[middle]!) / 2,
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    p95: ordered[Math.ceil(ordered.length * 0.95) - 1]!,
    max: ordered.at(-1)!,
  };
}

export function value(run: CaseResult, field: string) {
  return finite(run.workload?.[field] ?? run.resources?.[field]);
}

function checks(run: CaseResult) {
  return object(run.workload?.checks ?? {}, 'completed workload assertions');
}

function completeWork(run: CaseResult) {
  const asserted = checks(run);
  return (
    run.status === 'completed' &&
    Boolean(run.instanceId && run.database && run.executable) &&
    run.workload?.commandsOffered === run.plan.expectedWork.walks &&
    run.workload.commandsCompleted === run.plan.expectedWork.walks &&
    run.workload.heldSteeringCompleted === run.plan.expectedWork.heldSteering &&
    run.workload.conversationsCompleted === run.plan.expectedWork.conversations &&
    Object.keys(asserted).length > 0 &&
    Object.values(asserted).every((value) => value === true) &&
    (run.plan.mode !== 'sampled' ||
      (run.diagnostic?.data.status === 'sampled' &&
        run.diagnostic.data.executableSha256 === run.executable)) &&
    (run.plan.mode !== 'sql' || run.diagnostic?.data.status === 'measured') &&
    !(
      run.metrics &&
      (!run.metrics.complete ||
        run.metrics.lost ||
        run.metrics.traceLost ||
        run.metrics.metrics.some(
          (metric) => metric.status === 'not-exercised' || metric.status === 'censored',
        ))
    )
  );
}

const replayChecks = [
  'admittedOrder',
  'savedRandomness',
  'durableEffects',
  'privateInputs',
  'coldContinuation',
];

type FixedWorkPair = {
  control: Record<string, unknown>;
  candidate: Record<string, unknown>;
};

export type FixedWork = {
  identity: string;
  repetitions: Map<number, FixedWorkPair>;
  sha256: string;
};

export async function readFixedWork(campaign: string, comparisonId: string): Promise<FixedWork> {
  const envelope = object(
    await jsonFile(
      campaign,
      `ownership/safety/${text(comparisonId, 'comparison ID', identifier)}.json`,
    ),
  );
  const proof = object(envelope.proof, 'fixed-work proof');
  const checksum = text(envelope.sha256, 'fixed-work proof digest', sha256);
  if (proof.schema !== 1 || digest(proof) !== checksum || proof.comparisonId !== comparisonId)
    throw new Error('Fixed-work proof checksum or comparison identity differs.');
  const repetitions = new Map<number, FixedWorkPair>();
  for (const row of list(proof.repetitions, 'fixed-work repetitions', 3)) {
    const pair = object(row, 'fixed-work pair');
    const repetition = integer(pair.repetition, 'fixed-work repetition', 1, 3);
    if (repetitions.has(repetition)) throw new Error('Duplicate fixed-work repetition.');
    const observed = object(pair.checks, 'fixed-work checks');
    if (
      !replayChecks.every((key) => observed[key] === true) ||
      Object.values(observed).some((value) => value !== true)
    )
      throw new Error('Fixed-work semantic checks are incomplete.');
    const control = object(pair.control, 'control fixed-work record');
    const candidate = object(pair.candidate, 'candidate fixed-work record');
    for (const field of ['inputSha256', 'canonicalSha256'] as const) {
      const pinned = text(control[field], field, sha256);
      if (candidate[field] !== pinned) throw new Error(`Fixed-work ${field} differs.`);
    }
    repetitions.set(repetition, { control, candidate });
  }
  return {
    identity: text(proof.comparisonIdentity, 'fixed-work pairing identity', sha256),
    repetitions,
    sha256: checksum,
  };
}

function fixedProof(a: CaseResult, b: CaseResult, proof: FixedWork | undefined) {
  if (!proof || proof.identity !== a.plan.comparisonIdentity) return false;
  const pair = proof.repetitions.get(a.plan.repetition);
  if (!pair || a.plan.repetition !== b.plan.repetition) return false;
  function matches(run: CaseResult, arm: FixedWorkPair['control']) {
    return (
      arm.source === run.plan.source &&
      arm.mode === run.plan.mode &&
      typeof run.executable === 'string' &&
      arm.executableSha256 === run.executable &&
      arm.samplingProbability === run.plan.samplingProbability &&
      JSON.stringify(arm.probeIds) === JSON.stringify(run.plan.probeIds)
    );
  }
  return matches(a, pair.control) && matches(b, pair.candidate);
}

export function compare(
  plan: FrozenPlan['comparisons'][number],
  runs: CaseResult[],
  proof?: FixedWork,
  proofError?: string,
) {
  const reasons = new Set<string>();
  if (proofError) reasons.add(proofError);
  if (runs.length !== 6 || !runs.every(completeWork))
    reasons.add('Missing checks, coverage, or promised work.');
  if (new Set(runs.map((run) => run.database)).size !== 6)
    reasons.add('Fresh databases not verified for all cases.');
  if (new Set(runs.map((run) => run.instanceId)).size !== 1)
    reasons.add('Matched cases did not use the same assigned worker.');
  const pairs = [];
  for (const repetition of [1, 2, 3]) {
    const a = runs.find(
      (run) => run.plan.repetition === repetition && run.plan.mode === plan.baseline,
    );
    const b = runs.find(
      (run) => run.plan.repetition === repetition && run.plan.mode === plan.measured,
    );
    if (!a || !b) {
      reasons.add('Three matched repetitions required.');
      continue;
    }
    if (!fixedProof(a, b, proof))
      reasons.add('Fixed-work equivalence not verified for the timed binaries and selections.');
    if (a.plan.comparisonIdentity !== b.plan.comparisonIdentity)
      reasons.add('Frozen pairing identity differs.');
    if (b.plan.sharedBuild && a.executable !== b.executable)
      reasons.add('Observer off/on executables differ.');
    const timeA = value(a, 'completedGameSeconds'),
      timeB = value(b, 'completedGameSeconds');
    if (!timeA || !timeB || Math.abs(timeB - timeA) > plan.workToleranceGameSeconds)
      reasons.add('Completed game-time difference exceeds the frozen tolerance.');
    for (const [key, tolerance] of Object.entries(plan.internalWorkTolerance)) {
      const x = finite(object(a.workload?.internalWork ?? {})[key]);
      const y = finite(object(b.workload?.internalWork ?? {})[key]);
      if (x === null || y === null || Math.abs(x - y) > tolerance)
        reasons.add(`Internal work counter ${key} exceeds tolerance or is unavailable.`);
    }
    const cpu = (run: CaseResult, gameSeconds: number | null, includePg: boolean) => {
      const server = value(run, 'serverCpuMs');
      const postgres = includePg ? value(run, 'postgresCpuMs') : 0;
      return gameSeconds && server !== null && postgres !== null
        ? (server + postgres) / gameSeconds
        : null;
    };
    const increase = (base: number | null, measured: number | null) =>
      base && measured !== null ? measured / base - 1 : null;
    const server = increase(cpu(a, timeA, false), cpu(b, timeB, false));
    const owned = increase(cpu(a, timeA, true), cpu(b, timeB, true));
    const commandA = value(a, 'commandP95Ms'),
      commandB = value(b, 'commandP95Ms');
    const commandIncreaseMs = commandA !== null && commandB !== null ? commandB - commandA : null;
    if (
      commandA === null ||
      commandIncreaseMs === null ||
      commandIncreaseMs > Math.max(2, commandA * 0.05)
    )
      reasons.add('A paired command p95 is missing or exceeds max(5%, 2 ms).');
    if (server === null || owned === null)
      reasons.add('Complete owned CPU accounting is required.');
    pairs.push({
      repetition,
      baseline: a.plan.id,
      measured: b.plan.id,
      server,
      owned,
      commandIncreaseMs,
      completedBefore: timeA,
      completedAfter: timeB,
    });
  }
  const server = statistics(pairs.flatMap((row) => (row.server === null ? [] : [row.server])));
  const owned = statistics(pairs.flatMap((row) => (row.owned === null ? [] : [row.owned])));
  if ((server?.median ?? 0) > 0.03 || (owned?.median ?? 0) > 0.03)
    reasons.add('Median paired CPU per completed game-second exceeds 3% overhead.');
  return {
    id: plan.id,
    status: reasons.size ? 'unqualified-overhead' : 'qualified',
    replayProofSha256: proof?.sha256 ?? null,
    reasons: [...reasons],
    server,
    owned,
    pairs,
  };
}
