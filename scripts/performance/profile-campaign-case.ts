import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { setTimeout as delay } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { digest } from './profiling-plan.js';
import { installProfilingDeadline } from './profiling-deadline.js';
import { observeDefaultHeap } from './profiling-heap.js';
import type { ProfilingDefinition } from './profiling-registry.js';
import {
  sampleOwnedResources,
  resourceDeltas,
  collectDatabaseWindowStats,
  collectStorageCensus,
  startCpuCapture,
  startAllocationCapture,
} from './profile-resources.js';
import type { ProfilingCase } from './profiling-types.js';
import type { DetailedStage } from './profiling-plan.js';
import type { OwnedResourceOptions } from './profile-resources.js';
import type { SqlDatabase } from '../../apps/server/src/store.js';
import type { ProfileLoadResult } from './profile-server.mjs';

/** The capture is installed before application imports/worker construction. The
 * offline plan/report entry points never import this function's game module. */
export async function importProfileServer() {
  return await import('./profile-server.mjs');
}
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const save = (path: string, value: unknown) =>
  writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });

export async function resolveCaseSelection(
  item: ProfilingCase,
  campaignDirectory: string,
): Promise<{ item: ProfilingCase; stageHash: string | null }> {
  if (item.selection !== 'pending') return { item, stageHash: null };
  const stage = (await json(
    join(campaignDirectory, 'ownership', 'stage-details.json'),
  )) as DetailedStage;
  const plan = await json(join(campaignDirectory, 'plan.json'));
  const { hash, ...body } = stage;
  if (
    digest(body) !== hash ||
    stage.planHash !== plan.hash ||
    stage.sourceConfigurationHash !== digest(plan.configurations)
  )
    throw Error('Detailed selection does not match the frozen source/plan.');
  const group = stage.groups[item.group as 'I05' | 'I06'];
  if (
    !group?.probeIds.length ||
    group.probeIds.length > 32 ||
    group.probeIds.some((id) => !plan.candidateProbeIds.includes(id))
  )
    throw Error('Detailed selection is not a frozen candidate group.');
  return { item: { ...item, probeIds: group.probeIds, selection: 'resolved' }, stageHash: hash };
}

/** Future managed execution only. Nothing calls this from plan/summarize.
 * Resource identity comes from the maintained runner, never a guessed local host. */
export async function runCampaignCase(
  original: ProfilingCase,
  output: string,
  campaignDirectory: string,
) {
  if (!process.env.OPENLEGEND_VERIFICATION_MANIFEST || !process.env.OPENLEGEND_JOB_INPUTS)
    throw Error(
      'Speed cases require the owned AWS verification worker; local execution is disabled.',
    );
  if (process.env.OPENLEGEND_PROFILE_SOURCE_SHA !== original.source)
    throw Error('Worker source differs from the frozen case.');
  const frozenPlan = await json(join(campaignDirectory, 'plan.json'));
  const { hash: planHash, ...planBody } = frozenPlan;
  if (
    digest(planBody) !== planHash ||
    !frozenPlan.cases.some(
      (candidate: ProfilingCase) =>
        candidate.id === original.id && digest(candidate) === digest(original),
    )
  )
    throw Error('Case input does not belong to the unchanged frozen plan.');
  const inventory = (await json(
    join(campaignDirectory, 'inventory.json'),
  )) as ProfilingDefinition[];
  if (digest(inventory) !== frozenPlan.registryHash)
    throw Error('Frozen source-bound measurement definitions changed.');
  const { item, stageHash } = await resolveCaseSelection(original, campaignDirectory);
  await mkdir(output, { recursive: true, mode: 0o700 });
  if ((await readdir(output)).length)
    throw Error('A case output directory must be empty; prior failures are preserved.');
  await mkdir(join(output, 'profiles'), { mode: 0o700 });
  const timeline: Array<{ phase: string; atMs: number; unixMs: number; detail: unknown }> = [];
  const phase = (name: string, detail: unknown = {}) =>
    timeline.push({
      phase: name,
      atMs: performance.now(),
      unixMs: performance.timeOrigin + performance.now(),
      detail,
    });
  const started = performance.now();
  let status = 'failed',
    reason: string | null = null,
    cleanup = 'unconfirmed';
  let capture:
    | ReturnType<(typeof import('../../apps/server/src/performance.js'))['startPerformanceCapture']>
    | undefined;
  let captureOwner: typeof import('../../apps/server/src/performance.js') | undefined;
  let measurementDrain: unknown = null;
  let stopSummary: unknown = null,
    workers: unknown[] = [],
    main: unknown = null,
    sql: unknown = null;
  let environment: unknown = null;
  let workload: unknown = null,
    resources: Record<string, unknown> = { status: 'missing' },
    driverPid: number | undefined;
  let cpu: Awaited<ReturnType<typeof startCpuCapture>> | undefined,
    allocation: Awaited<ReturnType<typeof startAllocationCapture>> | undefined;
  const deadline = installProfilingDeadline(item.hardDeadlineSeconds, async () => {
    phase('hard-deadline');

    const writeIfAbsent = async (path: string, value: unknown) => {
      try {
        await save(join(output, path), value);
      } catch {
        /* Preserve an existing artifact. */
      }
    };
    await writeIfAbsent('interrupted.json', {
      caseId: item.id,
      planHash: frozenPlan.hash,
      phase: timeline.at(-2)?.phase,
      reason: 'Absolute case deadline reached.',
    });
    await writeIfAbsent('timeline.json', timeline);
    await writeIfAbsent('metrics.json', {
      episodes: [{ episode: 0, main: capture?.snapshot().runtime.campaign ?? main, workers }],
      status: 'incomplete',
    });
    await writeIfAbsent('completion.json', {
      caseId: item.id,
      planHash: frozenPlan.hash,
      source: item.source,
      configurationHash: item.configurationHash,
      status: 'failed',
      reason: 'Absolute case deadline reached; partial artifacts retained.',
      cleanup: 'supervisor-required',
      checksums: {},
    });
  });
  const definitions = inventory.map((definition) => ({
    scope: definition.numericId,
    id: definition.id,
    parent: definition.parent,
    label: definition.label,
    kind: definition.kind,
    unit: definition.unit,
    dimensions: definition.dimensions,
    shared: definition.shared,
  }));
  try {
    phase('setup');
    const workerSource = await json(process.env.OPENLEGEND_VERIFICATION_MANIFEST!);
    const execution = workerSource.execution;
    if (
      workerSource.commit !== item.source ||
      execution?.caseId !== item.id ||
      typeof execution.runId !== 'string' ||
      !Number.isSafeInteger(execution.generation)
    )
      throw Error('Trusted worker source/execution identity differs from this case.');
    const postgresProof = process.env.OPENLEGEND_JOB_POSTGRES_OWNERSHIP
      ? await json(process.env.OPENLEGEND_JOB_POSTGRES_OWNERSHIP)
      : null;
    if (
      postgresProof?.status === 'verified' &&
      (postgresProof.runId !== execution.runId ||
        postgresProof.generation !== execution.generation ||
        postgresProof.caseId !== execution.caseId)
    )
      throw Error('PostgreSQL ownership proof belongs to another execution.');
    environment = {
      heapProof: item.group === 'I01' ? await observeDefaultHeap() : null,
      nodeOptions: process.env.NODE_OPTIONS ?? null,
      effectiveHeapLimitBytes: getHeapStatistics().heap_size_limit,
      workerSource,
      postgresOwnership: postgresProof,
    };
    if (item.hardware.id !== 'H0') {
      const heap = await json(join(campaignDirectory, 'ownership', 'h0-heap-proof.json'));
      if (
        heap.planHash !== frozenPlan.hash ||
        heap.defaultHeapLimitBytes !== getHeapStatistics().heap_size_limit ||
        heap.explicitHeapLimitBytes !== heap.defaultHeapLimitBytes ||
        process.env.NODE_OPTIONS !== `--max-old-space-size=${heap.nodeHeapMiB}`
      )
        throw Error('Actual hardware comparison heap differs from the checksum-bound H0 setting.');
    }
    if (item.mode !== 'control' && item.mode !== 'disabled') {
      captureOwner = await import('../../apps/server/src/performance.js');
      capture = captureOwner.startPerformanceCapture({
        runtimeMonitoring: false,
        campaign: {
          definitions,
          selectedScopes: item.probeIds.map((id) => {
            const definition = inventory.find((value) => value.id === id);
            if (!definition) throw Error(`Unknown probe ${id}.`);
            return definition.numericId;
          }),
          samplingProbability: item.samplingProbability,
          samplingSeed: item.samplingSeed,
          sql: item.mode === 'sql',
          isolate: 'server-main',
        },
        workerInstruments: { cpu: item.mode === 'cpu', allocation: item.mode === 'allocation' },
      });
    }
    const harness = await importProfileServer();
    workload = await harness.runCampaignHarness(item, {
      phase,
      signal: deadline.signal,
      driver(pid: number, diagnostics: unknown) {
        driverPid = pid;
        phase('driver-ready', { pid, diagnostics });
      },
      async measure(
        operation: (startUnixMs: number) => Promise<ProfileLoadResult>,
        service: import('../../apps/server/src/world-service.js').WorldService,
        database: SqlDatabase,
      ) {
        const options: OwnedResourceOptions = {
          ownedPids: driverPid ? [{ pid: driverPid, role: 'driver' }] : [],
          driverRosterComplete: driverPid !== undefined,
          postgresRosterComplete: false,
        };
        if (postgresProof?.status === 'verified' && postgresProof.exclusiveCluster === true) {
          options.postgresRoot = {
            pid: postgresProof.postgresMainPid,
            startTimeTicks: postgresProof.postgresStartTimeTicks,
            exclusiveOwnership: true,
          };
        }
        // Only the current database's explicitly owned backend PIDs are read.
        // Missing cluster/background PID ownership keeps total CPU unqualified.
        try {
          const pids = await database
            .prepare('SELECT pid FROM pg_stat_activity WHERE datname = current_database()')
            .all();
          options.ownedPids = [
            ...(options.ownedPids ?? []),
            ...pids.map(({ pid }) => {
              if (typeof pid !== 'number')
                throw Error('PostgreSQL roster returned no numeric process identity.');
              return { pid, role: 'postgres' as const };
            }),
          ];
          const ticks = await promisify(execFile)('getconf', ['CLK_TCK']);
          options.clockTicksPerSecond = Number(ticks.stdout.trim());
        } catch {
          phase('resource-roster-incomplete');
        }
        const beforeDatabase = await collectDatabaseWindowStats(database);
        const beforeStorage = await collectStorageCensus(database);
        const nativeState = () => ({
          observedAtMs: performance.now(),
          unixMs: performance.timeOrigin + performance.now(),
          simTime: service.world.simTime,
          paused: service.paused,
          pendingSimSeconds: service.pendingSimSeconds,
          quotaGaps: Object.values(service.world.experience?.temporal?.actors ?? {}).filter(
            (actor) => actor.recordingGap,
          ).length,
        });
        const nativeBefore = nativeState();
        const before = await sampleOwnedResources({ ...options, requestedAtMs: performance.now() });
        const start = performance.now() + 100,
          end = start + item.measureSeconds! * 1000,
          drainUntil = end + item.drainSeconds * 1000;
        capture?.setWindow({ startMs: start, endMs: end, drainUntilMs: drainUntil });
        await delay(Math.max(0, start - performance.now()));
        if (item.mode === 'cpu')
          cpu = await startCpuCapture(join(output, 'profiles', 'main.cpuprofile'));
        if (item.mode === 'allocation')
          allocation = await startAllocationCapture(join(output, 'profiles', 'main.heapprofile'));
        phase('measure', {
          intendedStartMs: start,
          intendedEndMs: end,
          observedStartMs: performance.now(),
        });
        let after: Awaited<ReturnType<typeof sampleOwnedResources>> | undefined;
        let afterDatabase: Awaited<ReturnType<typeof collectDatabaseWindowStats>> | undefined;
        let edgeFailure: unknown;
        let nativeEdge: ReturnType<typeof nativeState> | undefined;
        let edgeStarted = false;
        let edgeResolve: () => void = () => {};
        const edge = new Promise<void>((resolve) => {
          edgeResolve = resolve;
        });
        const timer = setTimeout(
          () => {
            edgeStarted = true;
            void (async () => {
              phase('drain', { intendedCutoffMs: end, observedCutoffMs: performance.now() });
              nativeEdge = nativeState();
              // Begin every window-edge observation here, rather than after
              // request drain. Their actual read times retain boundary lag.
              const cuts = await Promise.allSettled([
                sampleOwnedResources({ ...options, requestedAtMs: end }),
                collectDatabaseWindowStats(database),
                cpu?.stop(),
                allocation?.stop(),
              ]);
              if (cuts[0].status === 'fulfilled') after = cuts[0].value;
              if (cuts[1].status === 'fulfilled') afterDatabase = cuts[1].value;
              cpu = undefined;
              allocation = undefined;
              const failures = cuts.flatMap((cut) =>
                cut.status === 'rejected' ? [cut.reason] : [],
              );
              if (failures.length)
                throw new AggregateError(failures, 'Measurement boundary collection failed.');
            })()
              .catch((error) => {
                edgeFailure = error;
              })
              .finally(edgeResolve);
          },
          Math.max(0, end - performance.now()),
        );
        const pending = operation(performance.timeOrigin + start);
        pending.catch(() => {});
        let drainTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            pending,
            new Promise<never>((_, reject) => {
              drainTimer = setTimeout(
                () => reject(Error('Offered work remained unresolved at the drain deadline.')),
                Math.max(0, drainUntil - performance.now()),
              );
            }),
          ]);
          await edge;
          if (edgeFailure) throw edgeFailure;
          const delta = resourceDeltas(before, after!);
          const rawExternal = result as { offeredWindow?: unknown; measured?: unknown };
          const external = { measured: rawExternal.offeredWindow ?? rawExternal.measured } as {
            measured?: {
              commands?: { count: number; p95Ms: number | null };
              errorCount?: number;
              skippedIntervals?: number;
            };
          };
          resources = {
            before,
            after,
            ...delta,
            expectedWindowSeconds: item.measureSeconds,
            advancedGameSeconds: nativeEdge ? nativeEdge.simTime - nativeBefore.simTime : null,
            commandP95Ms: external.measured?.commands?.p95Ms ?? null,
            commandLatencyApplicable: true,
            workUnits: external.measured?.commands?.count ?? 0,
            stalled: nativeEdge ? nativeEdge.simTime <= nativeBefore.simTime : null,
            paused: nativeEdge?.paused ?? null,
            failures: external.measured?.errorCount ?? null,
            quotaCrossings: nativeEdge
              ? Math.max(0, nativeEdge.quotaGaps - nativeBefore.quotaGaps)
              : null,
            nativeBefore,
            nativeEdge,
            nativeIntervalSeconds: nativeEdge
              ? (nativeEdge.observedAtMs - nativeBefore.observedAtMs) / 1000
              : null,
            database: {
              before: beforeDatabase,
              after: afterDatabase,
              requestedEndMs: end,
            },
            storage: {
              before: beforeStorage,
              after: await collectStorageCensus(database),
              phase: 'after-request-drain',
            },
            limitation:
              'Boundary resource reads have recorded lateness. PostgreSQL backend roster alone is not complete cluster CPU; absent cluster ownership remains unknown.',
          };
          return result;
        } finally {
          clearTimeout(timer);
          if (drainTimer) clearTimeout(drainTimer);
          // An already-started edge owns its reads and sampler shutdown. Do not
          // close the game/database underneath it after a driver failure.
          if (edgeStarted) await edge;
          if (!after) {
            after = await sampleOwnedResources({ ...options, requestedAtMs: end });
            resources = {
              before,
              after,
              ...resourceDeltas(before, after),
              status: 'incomplete',
              reason: 'Measurement/drain failed.',
            };
          }
          if (captureOwner) {
            if (performance.now() >= end) {
              [measurementDrain, workers] = await Promise.all([
                capture!.drain(drainUntil),
                captureOwner.collectPerformanceWorkers(
                  Math.ceil(Math.max(0, drainUntil - performance.now())) + 10000,
                  drainUntil,
                ),
              ]);
            } else workers = await captureOwner.collectPerformanceWorkers();
            const snapshot = capture?.snapshot();
            main = snapshot?.runtime.campaign;
            sql = snapshot?.runtime.database;
          }
          stopSummary = capture?.stop();
          capture = undefined;
        }
      },
    });
    status = 'completed';
    cleanup = 'completed';
  } catch (error) {
    reason = error instanceof Error ? error.message : 'Case execution failed.';
    phase('failed', { reason });
  } finally {
    try {
      try {
        await cpu?.stop();
        await allocation?.stop();
      } catch {
        status = 'failed';
        reason = 'Sampling instrument finalization failed.';
      }
      if (capture) {
        try {
          main = capture.snapshot().runtime.campaign;
          stopSummary = capture.stop();
        } catch {
          status = 'failed';
        }
      }
      phase('export', { status });
      await save(join(output, 'manifest.json'), {
        caseId: item.id,
        planHash: frozenPlan.hash,
        source: item.source,
        gameSource: item.gameSource,
        toolSource: item.toolSource,
        sourceArchiveHash: item.sourceArchiveHash,
        instrumentationPatchHash: item.instrumentationPatchHash,
        fixtureHash: item.fixtureHash,
        configurationHash: item.configurationHash,
        probeIds: item.probeIds,
        stageHash,
        samplingSeed: item.samplingSeed,
        requestedHardware: item.hardware,
        environment,
        actualWorkerManifest: process.env.OPENLEGEND_VERIFICATION_MANIFEST ?? null,
        node: process.version,
        startedAtUnixMs: performance.timeOrigin + started,
        privacy: 'Private local artifacts; no real providers or secrets.',
      });
      await save(join(output, 'timeline.json'), timeline);
      await save(join(output, 'metrics.json'), {
        episodes: [{ episode: 0, main, workers, drain: measurementDrain }],
        stopSummary,
        status,
      });
      await save(join(output, 'resources.json'), resources);
      await save(
        join(output, 'workload.json'),
        workload ?? { outcome: 'failed-startup-or-warmup', checks: [], reason },
      );
      if (item.mode === 'sql')
        await save(
          join(output, 'sql.json'),
          sql ?? { status: 'missing', reason: 'No completed SQL capture.' },
        );
      const checksums: Record<string, string> = {};
      for (const artifact of item.requiredArtifacts.filter((path) => path !== 'completion.json'))
        try {
          checksums[artifact] = digest(await readFile(join(output, artifact)));
        } catch {
          status = 'failed';
          reason ??= `Required artifact missing: ${artifact}`;
        }
      await save(join(output, 'completion.json'), {
        caseId: item.id,
        planHash: frozenPlan.hash,
        source: item.source,
        configurationHash: item.configurationHash,
        status,
        reason,
        cleanup,
        elapsedSeconds: (performance.now() - started) / 1000,
        checksums,
        spending: {
          providerCalls: 0,
          cloudCharges:
            'Recorded by the existing managed-runner allocation, not inferred by the game case.',
        },
      });
    } finally {
      deadline.stop();
    }
  }

  if (status !== 'completed') throw Error(reason ?? 'Campaign case failed.');
}
