import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { loadavg } from 'node:os';
import { NPC_ID, entityValues, EXPERIENCE_LIMITS } from '@open-legend/domain';
import type { CognitionLabReceipt, CognitionLabWorkspace, GameView } from '@open-legend/protocol';
import { createBaseStartingWorld } from '../../packages/domain/src/worlds/base/starting-worlds.js';
import { nextId } from '../../packages/domain/src/data.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { startCognitionLabFixture } from '../../tests/fixtures/cognition-lab.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { observeDurations, startPerformanceCapture } from '../../apps/server/src/performance.js';
import { toolHttp, toolStream } from '../network.js';

/** Actual HTTP owners, two disposable databases per size, no provider or .env.
 * OPENLEGEND_TEST_DATABASE_URL=postgresql://127.0.0.1/postgres AI_BUDGET_USD=0
 * pnpm exec tsx scripts/performance/cognition-lab-runtime.ts /tmp/new-runtime-report.json */
const output = process.argv[2];
const sizes = process.argv[3] ? process.argv[3].split(',').map(Number) : [100, 10000];
if (!sizes.length || sizes.some((size) => ![100, 10000].includes(size)))
  throw new Error('Select the 100 and/or 10,000 native history workload.');
if (!output || process.env['AI_BUDGET_USD'] !== '0')
  throw new Error('Choose a new external report path and AI_BUDGET_USD=0.');
const percentile = (values: number[], quantile: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered.length
    ? ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * quantile) - 1)]!
    : null;
};
const distribution = (values: number[]) => ({
  count: values.length,
  medianMs: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  maximumMs: values.length ? Math.max(...values) : null,
});
const expected = (workspace: CognitionLabWorkspace) => ({
  runtimeGeneration: workspace.runtimeGeneration,
  scenarioRevision: workspace.scenarioRevision,
});
const report = {
  startedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  variant: process.argv[4] ?? 'batched-native-owners',
  sourceSha256: Object.fromEntries(
    await Promise.all(
      [
        'apps/server/src/cognition-lab.ts',
        'apps/server/src/cognition-lab-saves.ts',
        'apps/server/src/http-json.ts',
        'apps/server/src/game-saves.ts',
        'apps/server/src/history.ts',
        'apps/server/src/store.ts',
        'apps/server/src/world-records.ts',
        'apps/server/src/world-service.ts',
        'scripts/performance/cognition-lab-runtime.ts',
        'tests/fixtures/cognition-lab.ts',
      ].map(async (path) => [
        path,
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex'),
      ]),
    ),
  ),
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    loadAverage: loadavg(),
    database: 'two fresh disposable loopback PostgreSQL databases per size',
  },
  scope:
    'Complete native HTTP operations and consumed JSON, same-process game server/client, native game tick/SSE/presence, sequential lab operations plus one game state poll every 25 ms after completion and ordinary presence heartbeat every 3 s. No providers, OS-cache eviction, naturally aged-world or constant-memory claim.',
  workload: {
    sizes,
    restoresPerSize: 5,
    eventPaddingBytes: 100,
    memoryPaddingBytes: 100,
    seed: 73,
    historyAtSeconds: 0,
    authoredClockSeconds: EXPERIENCE_LIMITS.rawHours * 3600 + 120,
    budgetUsd: 0,
  },
  phases: [] as unknown[],
};
await initializeCollisionRuntime();
const capture = startPerformanceCapture({ runtimeMonitoring: true });
try {
  for (const size of report.workload.sizes) {
    const start = performance.now();
    const opening: { entities?: number; events?: number; memories?: number; preset?: string } = {};
    const fixture = await startCognitionLabFixture({
      tick: true,
      prepareGame: async (store, config) => {
        const world = structuredClone(
          createBaseStartingWorld(config.worldPreset, 73, {
            creatorAccountIds: ['local-player'],
            playerAccountId: 'local-player',
          }).world,
        );
        opening.entities = entityValues(world.entities).length;
        opening.events = world.events.length;
        opening.memories = Object.values(world.memories).reduce(
          (count, entries) => count + entries.length,
          0,
        );
        opening.preset = config.worldPreset;
        // Authored diagnostic history needs an old native timestamp to exercise cold
        // residency. Keep every ordinary opening entity, definition and physical value.
        world.simTime = report.workload.authoredClockSeconds;
        const memories = (world.memories[NPC_ID] ??= []);
        for (let index = 0; index < size; index++) {
          const eventId = nextId(world, 'event');
          world.events.push({
            id: eventId,
            type: 'authored-profile-event',
            text: `Historical occurrence ${index}: ` + 'e'.repeat(100),
            at: 0,
            sequence: world.nextId,
            order: world.nextId,
            audience: [],
          });
          memories.push({
            id: nextId(world, 'memory'),
            actorId: NPC_ID,
            kind: 'episode',
            source: 'internal',
            summary: `Historical personal memory ${index}: ` + 'm'.repeat(100),
            at: 0,
            sequence: world.nextId,
            importance: 1,
            entityIds: [],
          });
        }
        await store.commit(0, { world, speed: 1, manuallyPaused: false });
      },
    });
    const labDb = new PostgresDatabase(fixture.labDatabaseUrl, true);
    const gameDb = new PostgresDatabase(fixture.gameDatabaseUrl, true);
    const streamAbort = new AbortController();
    let streamDone: Promise<void> | undefined;
    let polling = true;
    let poll: Promise<void> | undefined;
    let heartbeat: Promise<void> | undefined;
    let pollFailure: unknown;
    const pollSamples: Array<{ at: number; ms: number }> = [];
    const operations: unknown[] = [];
    const phase = {
      size,
      setupMs: performance.now() - start,
      opening,
      operations,
      status: 'running',
      game: {} as unknown,
      storage: {} as unknown,
    };
    report.phases.push(phase);
    try {
      const client = 'cognition-runtime-profile';
      const gameHeaders = { Cookie: fixture.cookie, 'X-OL-Client': client };
      const getGame = async () => {
        const response = await toolHttp(
          fixture.base + '/api/state',
          { headers: gameHeaders },
          { timeoutMs: 120000 },
        );
        if (!response.ok) throw new Error('Game state read failed.');
        return response.json<GameView>();
      };
      let view = await getGame();
      const gamePost = async (path: string, body: unknown) => {
        const response = await toolHttp(
          fixture.base + path,
          {
            method: 'POST',
            headers: {
              ...gameHeaders,
              Origin: fixture.base,
              'Content-Type': 'application/json',
              'X-OL-Scope': view.access!.scope,
              'X-OL-Generation': view.historyEpoch?.split(':')[0] ?? '',
            },
            body: JSON.stringify(body),
          },
          { timeoutMs: 120000 },
        );
        const result = await response.json<{ ok: boolean; message?: string }>();
        if (!response.ok || !result.ok) throw new Error(result.message ?? 'Game control failed.');
      };
      await gamePost('/api/embodiment', {
        id: randomUUID(),
        expectedGeneration: view.access!.controlGeneration,
        operation: 'replace',
      });
      view = await getGame();
      let streamBytes = 0;
      const stream = toolStream(
        `${fixture.base}/api/events?client=${client}&scope=${encodeURIComponent(view.access!.scope)}&revision=${view.revision}`,
        { headers: gameHeaders, signal: streamAbort.signal },
        (bytes) => {
          streamBytes += bytes.byteLength;
        },
        // Keep presence valid for the complete finite campaign, including every
        // supported outcome check. The stream is aborted in fixture cleanup.
        40 * 60_000,
      );
      streamDone = stream.done
        .then(() => {
          if (!streamAbort.signal.aborted)
            throw new Error('The game event stream ended before campaign shutdown.');
        })
        .catch((error: unknown) => {
          if (!streamAbort.signal.aborted) pollFailure = error;
        });
      await stream.ready;
      await gamePost('/api/control', { paused: false, clientId: client, presenceSequence: 1 });
      await gamePost('/api/presence', { visible: true, clientId: client, sequence: 2 });
      let presenceSequence = 2;
      heartbeat = (async () => {
        while (polling) {
          await delay(3000);
          if (!polling) break;
          await gamePost('/api/presence', {
            visible: true,
            clientId: client,
            sequence: ++presenceSequence,
          });
        }
      })().catch((error: unknown) => {
        pollFailure = error;
      });
      const gameBefore = fixture.game.service.world.simTime;
      const nativeCounts = {
        events: await gameDb
          .prepare('SELECT COUNT(*) AS n FROM history_events WHERE world_id=?')
          .get(fixture.game.service.world.id),
        memories: await gameDb
          .prepare('SELECT COUNT(*) AS n FROM mind_memories WHERE world_id=?')
          .get(fixture.game.service.world.id),
        residentEvents: fixture.game.service.world.events.length,
        residentMemories: Object.values(fixture.game.service.world.memories).reduce(
          (count, entries) => count + entries.length,
          0,
        ),
      };
      poll = (async () => {
        while (polling) {
          const at = performance.now();
          await getGame();
          pollSamples.push({ at, ms: performance.now() - at });
          await delay(25);
        }
      })().catch((error: unknown) => {
        pollFailure = error;
      });
      const baselineMonitor = monitorEventLoopDelay({ resolution: 10 });
      baselineMonitor.enable();
      await delay(1000);
      baselineMonitor.disable();
      const baselineGame = {
        stateReads: distribution(pollSamples.map((sample) => sample.ms)),
        maximumEventLoopMs: baselineMonitor.max / 1e6,
      };
      let workspace = fixture.workspace;
      if (workspace.provider.available) throw new Error('The profile must not enable providers.');
      const operation = async (name: string, body: Record<string, unknown>) => {
        const memoryBefore = process.memoryUsage();
        const gameClockStart = fixture.game.service.world.simTime;
        const pollStart = pollSamples.length;
        const monitor = monitorEventLoopDelay({ resolution: 10 });
        const stages = new Map<string, { count: number; maximumMs: number; samples: number[] }>();
        const stop = observeDurations((stage, ms) => {
          if (
            !/^(?:save\.|persistence\.|history\.|records\.|load\.|gc\.|mutation\.)|(?:\.wait$|Wait$|waitExpired$)/.test(
              stage,
            )
          )
            return;
          let values = stages.get(stage);
          if (!values) stages.set(stage, (values = { count: 0, maximumMs: 0, samples: [] }));
          values.count++;
          values.maximumMs = Math.max(values.maximumMs, ms);
          if (values.samples.length < 1000) values.samples.push(ms);
        });
        const stageSummary = () =>
          Object.fromEntries(
            [...stages].map(([stage, values]) => [
              stage,
              {
                ...distribution(values.samples),
                count: values.count,
                maximumMs: values.maximumMs,
                percentileSampleCount: values.samples.length,
                percentileSamplePolicy: 'first 1000 completed spans at most',
              },
            ]),
          );
        monitor.enable();
        await delay(12);
        const at = performance.now();
        const commandId = randomUUID();
        let receipt: CognitionLabReceipt | undefined;
        const outcomeChecks: unknown[] = [];
        try {
          // One immutable envelope also owns a possible receipt-repair check. The
          // native load/stimulus identity and its original expected cut never change.
          const envelope = JSON.stringify({ commandId, expected: expected(workspace), ...body });
          const submit = async () => {
            const response = await toolHttp(
              fixture.base + '/api/cognition-lab/operations',
              {
                method: 'POST',
                headers: {
                  Cookie: fixture.cookie,
                  Origin: fixture.base,
                  'X-OL-Lab-Owner': workspace.operationOwnerScope,
                  'Content-Type': 'application/json',
                },
                body: envelope,
              },
              { timeoutMs: 120000 },
            );
            const result = await response.json<CognitionLabReceipt>();
            receipt = result;
            outcomeChecks.push({
              elapsedMs: performance.now() - at,
              status: response.status,
              ok: result.ok,
              code: result.code,
              unconfirmed: result.unconfirmed ?? false,
              commandId: result.commandId,
            });
            return { response, result };
          };
          let outcome = await submit();
          if (outcome.response.ok && outcome.result.ok && outcome.result.unconfirmed)
            outcome = await submit();
          const { result, response } = outcome;
          if (!response.ok || !result.ok || result.unconfirmed)
            throw new Error(
              `${name} failed: ${result.unconfirmed ? 'unconfirmed' : (result.code ?? response.status)} ${result.message ?? ''}`,
            );
          const elapsedMs = performance.now() - at;
          if (result.workspace) workspace = result.workspace;
          else {
            const current = await toolHttp(fixture.base + '/api/cognition-lab/workspace', {
              headers: { Cookie: fixture.cookie },
            });
            workspace = await current.json<CognitionLabWorkspace>();
          }
          await delay(12);
          const selectedPolls = pollSamples.slice(pollStart);
          const gaps = selectedPolls
            .slice(1)
            .map((sample, index) => sample.at - selectedPolls[index]!.at);
          operations.push({
            name,
            elapsedMs,
            savedId: result.savedId,
            outcomeChecks,
            eventLoop: {
              samples: monitor.count,
              meanMs: monitor.count ? monitor.mean / 1e6 : null,
              maximumMs: monitor.max / 1e6,
              p95Ms: monitor.percentile(95) / 1e6,
            },
            gameReads: distribution(selectedPolls.map((sample) => sample.ms)),
            gamePollStartGaps: distribution(gaps),
            gameClockStart,
            gameClockEnd: fixture.game.service.world.simTime,
            gameProgressedSeconds: fixture.game.service.world.simTime - gameClockStart,
            gamePauseReason: fixture.game.service.pauseReason,
            memoryBefore,
            memoryAfter: process.memoryUsage(),
            processMaximumRssKiB: process.resourceUsage().maxRSS,
            stages: stageSummary(),
          });
          process.stdout.write(
            JSON.stringify({
              size,
              operation: name,
              elapsedMs,
              gameReads: selectedPolls.length,
              maximumEventLoopMs: monitor.max / 1e6,
            }) + '\n',
          );
          return result;
        } catch (error) {
          operations.push({
            name,
            status: 'failed',
            commandId,
            elapsedMs: performance.now() - at,
            receipt,
            outcomeChecks,
            eventLoop: { samples: monitor.count, maximumMs: monitor.max / 1e6 },
            gameReads: distribution(pollSamples.slice(pollStart).map((sample) => sample.ms)),
            gameClockStart,
            gameClockEnd: fixture.game.service.world.simTime,
            gameProgressedSeconds: fixture.game.service.world.simTime - gameClockStart,
            gamePauseReason: fixture.game.service.pauseReason,
            memoryBefore,
            memoryAfter: process.memoryUsage(),
            stages: stageSummary(),
          });
          throw error;
        } finally {
          monitor.disable();
          stop();
        }
      };
      await operation('importGameSnapshot', { kind: 'importGameSnapshot' });
      await operation('applyNativeOnlyIntervalPolicy', {
        kind: 'applySettings',
        settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
      });
      await operation('firstRunOriginCaptureAndNativeInterval', {
        kind: 'controlRun',
        action: 'advanceTime',
        durationSeconds: 1,
      });
      const originId = workspace.run?.originId;
      if (!originId) throw new Error('The first native interval did not publish a run origin.');
      for (let index = 0; index < 5; index++)
        await operation(`restoreWithRecovery${index + 1}`, {
          kind: 'restoreCheckpoint',
          savedId: originId,
        });
      polling = false;
      await poll;
      if (pollFailure) throw pollFailure;
      if (fixture.calls.length)
        throw new Error('The runtime profile dispatched fixture inference.');
      phase.game = {
        nativeCounts,
        baselineGame,
        clockBefore: gameBefore,
        clockAfter: fixture.game.service.world.simTime,
        progressedSeconds: fixture.game.service.world.simTime - gameBefore,
        pauseReason: fixture.game.service.pauseReason,
        streamBytes,
        stateReads: distribution(pollSamples.map((sample) => sample.ms)),
        pollStartGaps: distribution(
          pollSamples.slice(1).map((sample, index) => sample.at - pollSamples[index]!.at),
        ),
        storageError: fixture.game.service.storageError ?? null,
        fixtureInferenceCalls: fixture.calls.length,
      };
      phase.storage = await labDb
        .prepare(
          'SELECT used_bytes,reserved_bytes,allowance_bytes,(SELECT COUNT(*) FROM cognition_lab.checkpoints) AS native_checkpoints FROM cognition_lab.storage WHERE singleton=1',
        )
        .get();
      if (fixture.game.service.pauseReason !== null)
        throw new Error('The game was not continuously present at the final measurement boundary.');
      phase.status = 'complete';
    } catch (error) {
      phase.status = 'failed';
      throw error;
    } finally {
      polling = false;
      streamAbort.abort();
      const cleanup = await Promise.allSettled([poll, heartbeat, streamDone]);
      cleanup.push(...(await Promise.allSettled([labDb.close(), gameDb.close()])));
      cleanup.push(...(await Promise.allSettled([fixture.close()])));
      const failure = cleanup.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') {
        phase.status = 'failed';
        throw failure.reason;
      }
    }
  }
} finally {
  capture.stop();
  await writeFile(
    output,
    JSON.stringify({ ...report, completedAt: new Date().toISOString() }, null, 2) + '\n',
    { flag: 'wx' },
  );
}
