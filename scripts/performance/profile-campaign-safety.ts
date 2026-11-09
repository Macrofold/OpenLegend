import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { digest } from './profiling-plan.js';
import { canonicalReplay, PROFILER_SAFETY_CHECK_NAMES } from './profiling-qualification.js';
import type { ProfilingDefinition } from './profiling-registry.js';

type Capture = ReturnType<
  (typeof import('../../apps/server/src/performance.js'))['startPerformanceCapture']
>;
type Snapshot = NonNullable<
  ReturnType<(typeof import('../../apps/server/src/performance.js'))['performanceCampaignSnapshot']>
>;
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const save = (path: string, value: unknown) =>
  writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const sameIds = (left: readonly string[], right: readonly string[]) =>
  digest([...left].sort()) === digest([...right].sort());
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
async function frozenInputs(directory: string) {
  const plan = await json(join(directory, 'plan.json'));
  const { hash, ...body } = plan;
  if (typeof hash !== 'string' || digest(body) !== hash) throw Error('Frozen safety plan changed.');
  const inventory: ProfilingDefinition[] = await json(join(directory, 'inventory.json'));
  const safety: ProfilingDefinition[] = await json(
    join(directory, 'source', 'safety-inventory.json'),
  );
  if (
    !Array.isArray(inventory) ||
    digest(inventory) !== plan.registryHash ||
    !Array.isArray(safety) ||
    !safety.length ||
    digest(safety) !== plan.safetyRegistryHash
  )
    throw Error('Frozen safety inventory changed.');
  if (
    !Array.isArray(plan.safetyCases) ||
    plan.safetyCases.length !== 5 ||
    new Set(plan.safetyCases.map((item: { configuration: string }) => item.configuration)).size !==
      5
  )
    throw Error('Frozen plan needs five distinct focused safety configurations.');
  return { plan, inventory, safety };
}
async function detailedStage(
  directory: string,
  plan: Awaited<ReturnType<typeof frozenInputs>>['plan'],
) {
  const stage = await json(join(directory, 'ownership', 'stage-details.json'));
  const { hash, ...body } = stage;
  if (
    digest(body) !== hash ||
    stage.planHash !== plan.hash ||
    stage.sourceConfigurationHash !== digest(plan.configurations)
  )
    throw Error('Safety detailed selection changed.');
  for (const key of ['I05', 'I06']) {
    const selection = stage.groups?.[key];
    if (
      !selection ||
      !Array.isArray(selection.probeIds) ||
      !selection.probeIds.length ||
      selection.probeIds.length > 32 ||
      new Set(selection.probeIds).size !== selection.probeIds.length ||
      !selection.reason ||
      selection.probeIds.some((id: string) => !plan.candidateProbeIds.includes(id))
    )
      throw Error('Safety stage does not select unique frozen candidates.');
  }
  if (sameIds(stage.groups.I05.probeIds, stage.groups.I06.probeIds))
    throw Error('Safety detailed groups must differ.');
  return stage;
}
/** A replay that never exercised its selected source hooks cannot certify them.
 * Legitimate application error outcomes differ from a failed recorder. */
function checkedSnapshot(
  capture: Capture,
  selected: readonly string[],
  allPositive: boolean,
): Snapshot {
  const snapshot = capture.snapshot().runtime.campaign;
  if (!snapshot || snapshot.failures.length || snapshot.omittedTokens)
    throw Error('Safety measurement capture failed or omitted tokens.');
  const rows = snapshot.metrics.filter((row) => !row.status.includes('disabled'));
  if (
    !sameIds(
      rows.map((row) => row.id),
      selected,
    ) ||
    rows.some((row) => row.status.includes('failed'))
  )
    throw Error('Safety capture selection differs or failed.');
  const positive = rows.filter(
    (row) =>
      'eligible' in row &&
      Number(row.eligible) > 0 &&
      'completed' in row &&
      Number(row.completed) > 0,
  );
  if (
    allPositive ? positive.length !== selected.length : selected.length > 0 && positive.length === 0
  )
    throw Error('Safety replay did not exercise its selected probes.');
  return snapshot;
}

/** Non-timing execution is separately authorized; planning/summarization never
 * calls this command. Every failure closes captures and remains failed evidence. */
export async function runSafetyCase(
  directory: string,
  configuration: string,
  output: string,
  signal?: AbortSignal,
) {
  if (!process.env.OPENLEGEND_VERIFICATION_MANIFEST || !process.env.OPENLEGEND_JOB_INPUTS)
    throw Error('Safety execution requires the owned verification worker.');
  if (!['control', 'disabled', 'selected', 'I05', 'I06'].includes(configuration))
    throw Error('Unknown profiler safety configuration.');
  const { plan, inventory, safety: safetyDefinitions } = await frozenInputs(directory);
  const safetyCase = plan.safetyCases?.find(
    (item: { configuration: string }) => item.configuration === configuration,
  );
  const source =
    plan.configurations[configuration === 'control' ? 'control' : 'instrumented'].commit;
  if (!safetyCase || safetyCase.source !== source)
    throw Error('Safety configuration differs from the frozen plan.');
  if (process.env.OPENLEGEND_PROFILE_SOURCE_SHA !== source)
    throw Error('Safety source differs from the frozen plan.');
  let ids: string[] = configuration === 'selected' ? plan.selectedParentIds : [];
  let stageHash: string | null = null;
  if (configuration === 'I05' || configuration === 'I06') {
    const stage = await detailedStage(directory, plan);
    ids = stage.groups[configuration].probeIds;
    stageHash = stage.hash;
  }
  await mkdir(output, { recursive: true, mode: 0o700 });
  if ((await readdir(output)).length)
    throw Error('Safety output must be empty; previous evidence is preserved.');
  const enabled = !['control', 'disabled'].includes(configuration);
  const specimenIds = safetyDefinitions.map((definition) => definition.id);
  const definitions = [...inventory, ...safetyDefinitions].map((definition) => ({
    scope: definition.numericId,
    id: definition.id,
    parent: definition.parent,
    kind: definition.kind,
    unit: definition.unit,
    dimensions: definition.dimensions,
  }));
  const start = async (selected: string[], sql = false): Promise<Capture | undefined> => {
    if (!enabled) return undefined;
    const { startPerformanceCapture } = await import('../../apps/server/src/performance.js');
    return startPerformanceCapture({
      runtimeMonitoring: false,
      campaign: {
        definitions,
        selectedScopes: selected.map((id) => {
          const definition = [...inventory, ...safetyDefinitions].find((value) => value.id === id);
          if (!definition) throw Error(`Unknown safety probe ${id}.`);
          return definition.numericId;
        }),
        window: { startMs: performance.now(), endMs: Infinity, drainUntilMs: Infinity },
        sql,
      },
    });
  };
  const measurements: Snapshot[] = [];
  const stopSummaries: Array<ReturnType<Capture['stop']>> = [];
  let capture: Capture | undefined;
  let phase = 'specimens';
  try {
    const safety = await import('./profiling-safety.js');
    capture = await start(specimenIds);
    let specimens: Awaited<ReturnType<typeof safety.runMeasurementSafetySpecimens>>;
    try {
      specimens = await safety.runMeasurementSafetySpecimens();
      if (capture) measurements.push(checkedSnapshot(capture, specimenIds, true));
    } finally {
      if (capture) stopSummaries.push(capture.stop());
      capture = undefined;
    }
    if (stopSummaries.some((summary) => summary.discardedMeasurementTokens !== 0))
      throw Error('Completed safety specimens left open measurement tokens.');
    phase = 'recorder';
    const recorder = enabled
      ? await (await import('./profiling-recorder-safety.js')).runRecorderSafety()
      : null;
    phase = 'native';
    capture = await start(ids, true);
    let native: Awaited<ReturnType<typeof safety.runProfilerSafety>>;
    try {
      const harness = await import('./profile-server.mjs');
      native = await harness.runCampaignSafety(plan.seed, safety.runProfilerSafety, signal);
      if (capture) measurements.push(checkedSnapshot(capture, ids, false));
    } finally {
      if (capture) stopSummaries.push(capture.stop());
      capture = undefined;
    }
    const checks = [...specimens!.checks, ...native!.checks, ...(recorder?.checks ?? [])];
    if (!checks.length || checks.some((check) => check.passed !== true))
      throw Error('Safety replay contains failed or missing assertions.');
    const replay = canonicalReplay({ specimens: specimens!.replay, native: native!.replay });
    const result = {
      planHash: plan.hash,
      caseId: safetyCase.id,
      sourceConfigurationHash: digest(plan.configurations),
      configuration,
      source,
      stageHash,
      nativeProbeIds: enabled ? ids : [],
      specimenProbeIds: enabled ? specimenIds : [],
      status: 'passed',
      checks,
      replay,
      canonicalHash: digest(replay),
      rawNativeReplay: native.rawReplay,
      referenceWitness: native.referenceWitness,
      measurements,
      stopSummaries,
    };
    await save(join(output, 'safety.json'), result);
    return { path: join(output, 'safety.json'), canonicalHash: result.canonicalHash };
  } catch (error) {
    if (capture) {
      stopSummaries.push(capture.stop());
      capture = undefined;
    }
    await save(join(output, 'safety.json'), {
      planHash: plan.hash,
      caseId: safetyCase.id,
      sourceConfigurationHash: digest(plan.configurations),
      configuration,
      source,
      stageHash,
      status: 'failed',
      phase,
      reason: error instanceof Error ? error.message : 'Safety replay failed.',
      measurements,
      stopSummaries,
    });
    throw error;
  }
}

/** Consumes actual raw replay outputs only. It does not execute a missing case. */
export async function qualifySafety(directory: string) {
  const { plan, safety } = await frozenInputs(directory);
  const stage = await detailedStage(directory, plan);
  const { createCampaignArtifactReader } = await import('./profiling-report.js');
  const readCase = await createCampaignArtifactReader(directory, plan.hash, plan.safetyCases);
  const discovery = plan.cases.filter((item: { group: string }) =>
    ['I01', 'I02', 'I03', 'I04'].includes(item.group),
  );
  if (
    !Array.isArray(stage.evidence) ||
    stage.evidence.length !== discovery.length ||
    new Set(stage.evidence.map((row: { caseId: string }) => row.caseId)).size !== discovery.length
  )
    throw Error('Safety stage lacks complete discovery provenance.');
  for (const item of discovery) {
    const artifacts = await readCase(item);
    if (
      !stage.evidence.some(
        (row: { caseId: string; completionHash: string }) =>
          row.caseId === item.id && row.completionHash === artifacts.completionHash,
      )
    )
      throw Error('Safety stage discovery evidence changed.');
  }
  const configurations = ['control', 'disabled', 'selected', 'I05', 'I06'];
  const files = await Promise.all(
    configurations.map(async (configuration) => {
      const { path, raw, result } = await readCase.safety(configuration);
      const source =
        plan.configurations[configuration === 'control' ? 'control' : 'instrumented'].commit;
      if (
        result.planHash !== plan.hash ||
        result.configuration !== configuration ||
        result.source !== source ||
        result.sourceConfigurationHash !== digest(plan.configurations) ||
        result.status !== 'passed' ||
        !Array.isArray(result.checks) ||
        !result.checks.length ||
        result.checks.some((check: { passed: boolean }) => check.passed !== true) ||
        result.canonicalHash !== digest(result.replay)
      )
        throw Error(`Missing, changed or failed safety evidence: ${configuration}`);
      if (
        !stringArray(result.nativeProbeIds) ||
        !stringArray(result.specimenProbeIds) ||
        !Array.isArray(result.measurements)
      )
        throw Error('Safety probe selections and measurement snapshots must be arrays.');
      const enabled = !['control', 'disabled'].includes(configuration),
        ids =
          configuration === 'selected'
            ? plan.selectedParentIds
            : configuration === 'I05' || configuration === 'I06'
              ? stage.groups[configuration].probeIds
              : [];
      if ((configuration === 'I05' || configuration === 'I06') && result.stageHash !== stage.hash)
        throw Error('Safety replay used a different adaptive selection.');
      if (enabled) {
        if (
          !sameIds(result.nativeProbeIds, ids) ||
          !sameIds(
            result.specimenProbeIds,
            safety.map((definition) => definition.id),
          ) ||
          !Array.isArray(result.measurements) ||
          result.measurements.length !== 2
        )
          throw Error('Selected safety measurement evidence is missing.');
        for (const snapshot of result.measurements) {
          if (
            !snapshot ||
            !Array.isArray(snapshot.failures) ||
            snapshot.failures.length ||
            snapshot.omittedTokens !== 0 ||
            snapshot.metrics.some((row: { status: string[] }) => row.status.includes('failed'))
          )
            throw Error('Selected safety capture failed.');
        }
        const required: readonly [readonly string[], readonly string[]] = [
          safety.map((definition) => definition.id),
          ids,
        ];
        for (let index = 0; index < 2; index++) {
          const requiredIds = required[index]!;
          const rows = result.measurements[index].metrics.filter(
            (row: { status: string[] }) => !row.status.includes('disabled'),
          );
          if (
            !sameIds(
              rows.map((row: { id: string }) => row.id),
              requiredIds,
            )
          )
            throw Error('Safety capture did not select the frozen probes.');
          const positive = rows.filter(
            (row: { eligible: number; completed: number }) => row.eligible > 0 && row.completed > 0,
          );
          if (
            index === 0
              ? positive.length !== requiredIds.length
              : ids.length > 0 && positive.length === 0
          )
            throw Error('Safety hooks were not exercised.');
        }
      } else if (
        result.measurements?.length ||
        result.specimenProbeIds?.length ||
        result.nativeProbeIds?.length
      )
        throw Error('Disabled/control safety evidence unexpectedly enables hooks.');
      const verifiedChecks = result.checks.map((check: { name: unknown; passed: unknown }) => {
        if (typeof check.name !== 'string' || check.passed !== true)
          throw Error('Safety check is malformed.');
        return { name: check.name, passed: true };
      });
      return {
        configuration,
        path,
        sha256: digest(raw),
        result: { ...result, checks: verifiedChecks, canonicalHash: digest(result.replay) },
      };
    }),
  );
  const nativeChecks = (names: string[]) =>
    files.every(({ result }) =>
      names.every((name) =>
        result.checks.some(
          (check: { name: string; passed: boolean }) => check.name === name && check.passed,
        ),
      ),
    );
  const same = (names: string[]) =>
    new Set(
      files
        .filter((file) => names.includes(file.configuration))
        .map((file) => file.result.canonicalHash),
    ).size === 1;
  const selected = files.filter((file) => !['control', 'disabled'].includes(file.configuration));
  const recordedRequirements: Record<string, readonly string[]> = {
    'capture-lifecycle': [
      'stale-token-cannot-close-new-capture',
      'unselected-scope-has-no-token',
      'capture-has-no-recorder-failures',
    ],
    'sql-histogram-phase': [
      'carry-in-not-started-latency',
      'unfinished-cutoff-recorded',
      'unresolved-operation-is-censored',
      'token-work-count-is-actual',
      'whole-window-histogram-counts',
      'statement-count-not-adapter-count',
      'unknown-parameter-bytes-are-not-zero',
    ],
  };
  const nativeRequirements: Record<string, string[]> = {
    'return-throw-cancel': [
      'synchronous return identity',
      'synchronous throw identity',
      'cancellation accepted',
      'late cancelled value has no native effects',
    ],
    'async-generators': [
      'async return and for-await close',
      'async rejection and finally',
      'delegated generator chronology',
      'return forwards through yielding finally',
      'throw forwards through yielding finally',
    ],
    'current-save-restore': [
      'cold restoration preserves native and personal state',
      'cold restoration does not revive corrected/forgotten evidence',
    ],
    'cognition-inputs-effects': [
      'actual context and supplied response pipeline ran',
      'supplied response produces a native publication',
    ],
    'privacy-correction': [
      'unknown person receives a local subject',
      'unknown identity does not disclose authored name',
      'permitted cognition excludes another person private history',
      'correction accepted by semantic owner',
      'correction revokes the pending evidence cut',
      'forgetting accepted by semantic owner',
      'forgetting revokes the pending evidence cut',
    ],
  };
  const checks = PROFILER_SAFETY_CHECK_NAMES.map((name) => {
    const recorded = recordedRequirements[name];
    const passed =
      name === 'disabled-equivalence'
        ? same(['control', 'disabled'])
        : name === 'selected-equivalence'
          ? same(configurations)
          : recorded
            ? selected.every((file) =>
                recorded.every((required) =>
                  file.result.checks.some(
                    (check: { name: string; passed: boolean }) =>
                      check.name === required && check.passed,
                  ),
                ),
              )
            : !!nativeRequirements[name] && nativeChecks(nativeRequirements[name]!);
    return { name, passed };
  });
  const body = {
    planHash: plan.hash,
    sourceConfigurationHash: digest(plan.configurations),
    status: checks.every((check) => check.passed) ? 'passed' : 'failed',
    checks,
    evidence: files.map(({ configuration, path, sha256 }) => ({ configuration, path, sha256 })),
  };
  const result = { ...body, hash: digest(body) };
  await mkdir(join(directory, 'checks'), { recursive: true, mode: 0o700 });
  await save(join(directory, 'checks', 'profiler-safety.json'), result);
  return result;
}
