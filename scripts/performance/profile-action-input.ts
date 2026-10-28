/** Disposable SQL-backed input/catch-up measurement. No listener or AI worker.
 * OPENLEGEND_TEST_DATABASE_URL=... pnpm exec tsx scripts/performance/profile-action-input.ts /tmp/new-report.json
 */
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { cpus, loadavg, platform, release } from 'node:os';
import {
  createItemLot,
  entityGet,
  entityValues,
  PLAYER_ID,
  NPC_ID,
  worldPosition,
  worldSupport,
  setSpatialPosition,
  observeDomainCounters,
  type DomainCounters,
} from '../../packages/domain/src/index.js';
import { WorldService } from '../../apps/server/src/world-service.js';
import { commandInputSchema } from '../../apps/server/src/command-input-schema.js';
import {
  startPerformanceCapture,
  performanceSnapshot,
  observeDurations,
} from '../../apps/server/src/performance.js';
import { testRepository, readConfig, closeTestDatabases } from '../../tests/fixtures/database.js';
import { stockedCamp } from '../../tests/fixtures/world.js';
import { enterLocalWorld, editWorld } from '../../tests/fixtures/service.js';
import type { CommandInput, WorldInputScope } from '../../packages/protocol/src/index.js';

const output = process.argv[2];
if (!output) throw new Error('Supply a new output JSON path outside the repository.');
function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? null;
  return {
    count: values.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted.at(-1) ?? null,
  };
}
const report: unknown[] = [];
const environment = {
  node: process.version,
  platform: platform(),
  release: release(),
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  loadAtStart: loadavg(),
};
let service: WorldService | undefined;
try {
  for (const speed of [0.5, 1, 3, 8]) {
    const store = await testRepository(undefined, stockedCamp());
    service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
    await enterLocalWorld(service);
    await service.setPresence('profile', true);
    let itemId = '';
    await editWorld(service, (world) => {
      itemId = createItemLot(world, PLAYER_ID, 'spear', 1, 'input-profile');
      const actor = entityGet(world.entities, PLAYER_ID)!,
        target = entityGet(world.entities, NPC_ID)!,
        point = worldPosition(actor);
      setSpatialPosition(
        world,
        target,
        { x: point.x + 1.5, y: point.y, z: point.z },
        worldSupport(actor)!,
      );
    });
    const send = (id: string, input: CommandInput) =>
      service!.command(
        id,
        commandInputSchema.parse(input),
        undefined,
        service!.commandEpoch,
        service!.localScope,
      );
    const equipped = await send('equip', { type: 'equip', itemId });
    if (!equipped.ok) throw new Error(equipped.message);
    await service.control({ paused: true, speed });
    await service.control({ paused: false });
    let scope = service.inputScope(service.localScope);
    const steer = (
      current: WorldInputScope,
      sequence: number,
      direction: { x: number; z: number },
    ) =>
      service!.updateWorldInput(
        {
          kind: 'steer',
          inputEpoch: current.inputEpoch,
          movementInputToken: current.movementInputToken,
          movementSequence: sequence,
          direction,
        },
        service!.localScope,
      );
    await service.settleBackgroundSaves();
    await store.db.synchronizeProjection?.();
    if (!(await steer(scope, 1, { x: 0, z: 1 })).ok) throw new Error('Movement admission failed.');
    let commits = 0;
    const originalCommit = store.commit.bind(store);
    store.commit = (...args) => {
      commits++;
      return originalCommit(...args);
    };
    const counters: DomainCounters = {};
    observeDomainCounters(counters);
    const capture = startPerformanceCapture({ runtimeMonitoring: false });
    let sqlQueries = 0;
    const stopSqlCount = observeDurations((stage) => {
      if (stage === 'postgres.statement') sqlQueries++;
    });
    const renewals: number[] = [];
    let accepted = 0;
    for (let sequence = 1; sequence <= 1000; sequence++) {
      const start = performance.now();
      const result = await service.updateWorldInput(
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: sequence,
          movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
        },
        service.localScope,
      );
      renewals.push(performance.now() - start);
      if (result.movementAccepted) accepted++;
    }
    const renewalMetrics = performanceSnapshot();
    stopSqlCount();
    capture.stop();
    observeDomainCounters();
    const renewalCommits = commits;
    store.commit = originalCommit;
    await steer(scope, 2, { x: 0, z: 0 });
    if (accepted !== 1000 || renewalCommits || sqlQueries)
      throw new Error(
        `Renewal correctness failed (${accepted}, commits ${renewalCommits}, SQL ${sqlQueries}).`,
      );

    // Reset through the real clock owner; no synthetic time or lease extension.
    await service.control({ paused: true });
    await service.control({ paused: false });
    scope = service.inputScope(service.localScope);
    const debtBefore = service.world.simTime;
    await delay(500);
    const admittedAt = performance.now();
    await steer(scope, 1, { x: 0, z: 1 });
    await delay(100);
    const debtTickAt = performance.now();
    await service.tick((debtTickAt - service.clockStartedAt) / 1000, 0, {
      offeredUntil: debtTickAt,
      drain: false,
    });
    const debt = {
      preInputRealMs: admittedAt - service.clockStartedAt,
      oldSimulationSeconds:
        ((admittedAt - service.clockStartedAt) / 1000) * service.config.baseRatio * speed,
      tickMs: performance.now() - debtTickAt,
      advancedSimulationSeconds: service.world.simTime - debtBefore,
      movementTokenExpired:
        service.inputScope(service.localScope).movementInputToken !== scope.movementInputToken,
    };
    await service.control({ paused: true });
    await service.control({ paused: false });
    await service.setPresence('profile', true);
    scope = service.inputScope(service.localScope);
    const identity = {
      inputEpoch: scope.inputEpoch,
      attackInputToken: scope.attackInputToken,
      gestureSequence: 1,
    };
    const begun = await send('begin', {
      type: 'strike',
      definitionId: 'spear',
      itemId,
      targetId: NPC_ID,
      execution: { operation: 'begin', ...identity },
    });
    if (!begun.ok || !begun.actionId) throw new Error(begun.message);
    const released = await send('release', {
      type: 'release-strike',
      expectedActionId: begun.actionId,
      execution: {
        operation: 'release',
        ...identity,
        beginCommandId: 'begin',
        input: { kind: 'ordinary' },
      },
    });
    if (!released.ok) throw new Error(released.message);
    await steer(scope, 1, { x: 0, z: 1 });
    const before = {
      time: service.world.simTime,
      position: { ...worldPosition(entityGet(service.world.entities, PLAYER_ID)!) },
    };
    let offeredUntil = performance.now(),
      pending = !!released.execution?.releaseRequested,
      expired = false;
    const ticks: number[] = [];
    for (let step = 1; step <= 20; step++) {
      await delay(100);
      const now = performance.now(),
        start = now;
      await service.tick((now - offeredUntil) / 1000, 0, { offeredUntil: now, drain: false });
      ticks.push(performance.now() - start);
      offeredUntil = now;
      const renewed = await service.updateWorldInput(
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: step,
          movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
          ...(pending
            ? {
                pendingRelease: {
                  attackInputToken: scope.attackInputToken,
                  gestureSequence: 1,
                  beginCommandId: 'begin',
                  actionId: begun.actionId,
                },
              }
            : {}),
        },
        service.localScope,
      );
      if (pending && !renewed.releaseAccepted) pending = false;
      if (!renewed.movementAccepted) {
        expired = true;
        break;
      }
    }
    const action = entityGet(service.world.entities, PLAYER_ID)?.actor?.action;
    const after = {
      time: service.world.simTime,
      position: { ...worldPosition(entityGet(service.world.entities, PLAYER_ID)!) },
      actionId: action?.id ?? null,
      phase: action?.strikePhase ?? null,
      pending: !!action?.attackExecution?.pendingRelease,
    };
    await service.control({ paused: true });
    const instance = service;
    report.push({
      speed,
      population: entityValues(service.world.entities).filter((entity) => entity.actor?.alive)
        .length,
      renewal: {
        ...distribution(renewals),
        accepted,
        commits: renewalCommits,
        sqlQueries,
        nativeCounters: counters,
        stages: renewalMetrics,
      },
      live: { before, after, ticks: distribution(ticks), expired },
      debt,
      providerDispatches: 0,
      providerScope: 'No provider coordinator started; fixture credentials empty and budget zero.',
    });
    await instance.settleBackgroundSaves();
    instance.releaseHostWork();
    await store.close();
    service = undefined;
  }
  await writeFile(
    output,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        environment: { ...environment, loadAtEnd: loadavg() },
        scope:
          'Actual WorldService callers and disposable PostgreSQL; no HTTP/SSE/browser. Real monotonic input expiry remains enabled; a slow candidate may correctly expire.',
        samples: report,
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
  console.log(JSON.stringify({ output, speeds: report.length }));
} finally {
  observeDomainCounters();
  if (service) {
    await service.settleBackgroundSaves();
    service.releaseHostWork();
    await service.store.close();
  }
  await closeTestDatabases();
}
