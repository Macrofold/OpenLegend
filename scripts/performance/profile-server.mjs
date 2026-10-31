import { evidenceStorageStats } from './evidence-storage.ts';
import { toolHttp, toolStream } from '../network.ts';
import { createNetworkOwner } from '@open-legend/network';
import { profilingOptions } from './profiling-options.ts';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, cpus, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { Session } from 'node:inspector/promises';
import { setTimeout as delay } from 'node:timers/promises';
import {
  parseScenario,
  populateScenario,
  prepareNativePressure,
  applyNativePressure,
  prepareWalkingRoute,
} from './scenario.ts';
import {
  worldPosition,
  worldSupport,
  worldRootEntities,
  sensesFor,
  executeCommand,
  setSpatialPosition,
  updateWorld,
  observeDomainCounters,
  entityGet,
  entityKeys,
  entityValues,
  selectedAttentionPolicy,
} from '../../packages/domain/src/index.js';
import { routineSensePolicy } from '../../packages/domain/src/perception.js';
import {
  beginCommandBatch,
  draftWorld,
  finishTransitionWorld,
} from '../../packages/domain/src/draft.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { createGameServer } from '../../apps/server/src/http.ts';
import { WorldService } from '../../apps/server/src/world-service.ts';
import { OverloadError } from '../../apps/server/src/work-lane.ts';
import { readConfig } from '../../apps/server/src/config.ts';
import {
  performanceSnapshot,
  observeDurations,
  startPerformanceCapture,
} from '../../apps/server/src/performance.ts';
import { SqlGameRepository } from '../../apps/server/src/store.ts';
import { PostgresDatabase } from '../../apps/server/src/postgres.ts';
import { validateCurrentWorldState } from '../../apps/server/src/upgrade-world.ts';
import { createDisposableDatabase } from '../disposable-postgres.mjs';

const percentile = (values, p) =>
  values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
const distribution = (values) => ({
  count: values.length,
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
  maxMs: values.length ? Math.max(...values) : null,
});

/** Required workload census, separate from optional timing/counters. */
function nativePopulation(world, cohortIds) {
  const result = { animals: 0, alarms: 0, cohortAnimals: 0, cohortAlarms: 0 };
  for (const entity of entityValues(world.entities)) {
    if (!entity.animal || !entity.actor?.alive || entity.actor.controller !== 'native') continue;
    result.animals++;
    if (entity.animal.episode) result.alarms++;
    if (cohortIds.has(entity.id)) {
      result.cohortAnimals++;
      if (entity.animal.episode) result.cohortAlarms++;
    }
  }
  return result;
}

function populationCensus(world) {
  const roots = worldRootEntities(world);
  return {
    people: roots.filter((entity) => entity.actor && entity.kind !== 'animal').length,
    animals: roots.filter((entity) => entity.kind === 'animal').length,
    objects: roots.filter((entity) => !entity.actor).length,
    controlled: roots.filter((entity) => entity.actor?.controller === 'player').length,
    eligibleHumanObservers: roots.filter(
      (entity) =>
        entity.actor?.alive &&
        entity.kind !== 'animal' &&
        sensesFor(world, entity).some(
          (sense) => sense.implementation === 'vision-geometry-v1' && sense.radius > 0,
        ),
    ).length,
  };
}

/** Capture installed resolution once before timing. Throughput comparisons must
 * distinguish encoding/copy reductions from a world's changed sampling policy. */
function evidenceSettings(world) {
  const sight = new Map();
  for (const entity of worldRootEntities(world, true)) {
    if (!entity.actor?.alive) continue;
    const policy = routineSensePolicy(world, entity).sight;
    if (!policy) continue;
    const timing = {
      mode: policy.mode,
      broadGameSeconds: policy.seconds ?? null,
      detailGameSeconds: policy.detailSeconds ?? null,
    };
    const key = JSON.stringify(timing);
    const group = sight.get(key);
    if (group) group.actors++;
    else sight.set(key, { ...timing, actors: 1 });
  }
  const attention = selectedAttentionPolicy(world);
  return {
    sight: [...sight.values()],
    geometryIntervalGameSeconds: attention.geometry.intervalSeconds,
    relationIntervalGameSeconds: attention.relation.intervalSeconds,
    recent: { ...attention.retention.recent },
  };
}

/** Cached logical ownership only: no receipt traversal, decoding or hydration. */
function recentOwnerCensus(world) {
  const actors = Object.entries(world.experience?.temporal?.actors ?? {}).map(([id, actor]) => ({
    id,
    bytes: actor.bytes,
    count: actor.count,
    residentChunks: actor.chunks.length,
    releasedThrough: actor.releasedThrough ?? null,
    recordingGap: actor.recordingGap ? { ...actor.recordingGap } : null,
  }));
  const totals = { actors: actors.length, bytes: 0, count: 0, residentChunks: 0 };
  for (const actor of actors) {
    totals.bytes += actor.bytes;
    totals.count += actor.count;
    totals.residentChunks += actor.residentChunks;
  }
  return { actors, totals };
}

/** Finite authored diagnostic work uses the same commands as a selected NPC plan.
 * It is an activity workload, not a claim about unscripted/model-driven behavior. */
function prepareResidents(input, controlled) {
  const people = worldRootEntities(input).filter(
    (entity) => entity.actor && entity.kind !== 'animal' && !controlled.has(entity.id),
  );
  const resources = worldRootEntities(input).filter(
    (entity) => entity.resource && entity.id.startsWith('profile-near-object-'),
  );
  const actors = people.map((entity, index) => ({
    id: entity.id,
    origin: { ...worldPosition(entity), surfaceId: worldSupport(entity) },
    destinations: prepareWalkingRoute(input, entity.id),
    ...(index % 3 === 0 && resources[index / 3] ? { resourceId: resources[index / 3].id } : {}),
  }));
  const world = updateWorld(input, (draft) => {
    for (const actor of actors)
      if (actor.resourceId) {
        const resource = entityGet(draft.entities, actor.resourceId);
        setSpatialPosition(
          draft,
          resource,
          { x: actor.origin.x, y: actor.origin.y, z: actor.origin.z },
          actor.origin.surfaceId,
        );
      }
  });
  return { world, fixture: { actors } };
}
/** Actual displacement is a lower bound between finite workload samples; command
 * admission alone never certifies that crowded actors really moved or worked. */
function activityDelta(before = [], after = []) {
  const prior = new Map(before.map((actor) => [actor.id, actor]));
  return after.map((actor) => {
    const old = prior.get(actor.id);
    return {
      ...actor,
      ...Object.fromEntries(
        ['samples', 'activeSamples', 'movementSamples', 'workSamples', 'metres', 'gathered'].map(
          (key) => [key, actor[key] - (old?.[key] ?? 0)],
        ),
      ),
    };
  });
}

async function startResidents(service, fixture, phase) {
  const actors = fixture?.actors ?? [];
  const controller = new AbortController();
  const stats = {
    kind: 'scripted-native-residents',
    scope: 'whole speed including warmup',
    actors: actors.length,
    attempts: 0,
    admitted: 0,
    working: 0,
    walking: 0,
    skippedBusy: 0,
    missedAdmissions: 0,
    rejected: {},
    speechAccepted: 0,
    speechRejected: 0,
    pressureSamples: 0,
  };
  const perActor = new Map(
    actors.map((actor) => [actor.id, { commands: 0, work: 0, movement: 0, rejected: 0 }]),
  );
  const before = new Map(
    actors.map((actor) => [
      actor.id,
      { ...worldPosition(entityGet(service.world.entities, actor.id)) },
    ]),
  );
  const activity = new Map(
    worldRootEntities(service.world)
      .filter((entity) => entity.actor)
      .map((entity) => [
        entity.id,
        {
          id: entity.id,
          kind: entity.kind,
          controlled: entity.actor.controller === 'player',
          position: { ...worldPosition(entity) },
          samples: 0,
          activeSamples: 0,
          movementSamples: 0,
          workSamples: 0,
          metres: 0,
        },
      ]),
  );
  const resources = new Map(
    actors
      .filter((actor) => actor.resourceId)
      .map((actor) => [
        actor.id,
        {
          resourceId: actor.resourceId,
          initial: entityGet(service.world.entities, actor.resourceId)?.resource?.quantity ?? 0,
        },
      ]),
  );
  const sample = () => {
    stats.pressureSamples++;
    for (const own of activity.values()) {
      const entity = entityGet(service.world.entities, own.id);
      if (!entity?.actor) continue;
      const position = worldPosition(entity),
        action = entity.actor.action;
      own.metres += Math.hypot(
        position.x - own.position.x,
        position.y - own.position.y,
        position.z - own.position.z,
      );
      own.position = { ...position };
      own.samples++;
      if (action) own.activeSamples++;
      if (action?.type === 'move') own.movementSamples++;
      if (action?.type === 'gather') own.workSamples++;
    }
  };
  let failure;
  const task = (async () => {
    for (let step = 0; !controller.signal.aborted; step++) {
      sample();
      const ready = actors.filter((actor) => {
        const entity = entityGet(service.world.entities, actor.id);
        return entity?.actor?.alive && !entity.actor.action;
      });
      stats.skippedBusy += actors.length - ready.length;
      if (ready.length) {
        let entered = false;
        try {
          const result = await service.transition((initial) => {
            entered = true;
            let world = draftWorld(initial, { retainNativeValues: true });
            beginCommandBatch(world);
            for (const actor of ready) {
              const entity = entityGet(world.entities, actor.id);
              if (!entity?.actor?.alive || entity.actor.action) {
                stats.skippedBusy++;
                continue;
              }
              const own = perActor.get(actor.id);
              const resource = actor.resourceId && entityGet(world.entities, actor.resourceId);
              const command =
                resource?.resource?.quantity > 0
                  ? { type: 'gather', targetId: resource.id }
                  : {
                      type: 'move',
                      destination: actor.destinations[own.commands % 2],
                    };
              stats.attempts++;
              const result = executeCommand(world, {
                ...command,
                id: `profile-resident:${phase}:${step}:${actor.id}`,
                actorId: actor.id,
              });
              world = result.world;
              if (result.outcome.ok) {
                stats.admitted++;
                own.commands++;
                if (command.type === 'gather') {
                  stats.working++;
                  own.work++;
                } else {
                  stats.walking++;
                  own.movement++;
                }
              } else {
                own.rejected++;
                stats.rejected[result.outcome.code] =
                  (stats.rejected[result.outcome.code] ?? 0) + 1;
              }
            }
            world = finishTransitionWorld(world);
            return {
              world,
              events: world.events.slice(initial.events.length),
              outcome: { ok: true, code: 'profile-residents', message: 'Scripted native work' },
            };
          });
          if (!result.ok) throw Error(`Resident workload refused: ${result.code}`);
        } catch (error) {
          // A refused queue admission executed no native command. Record the
          // missed opportunity; the next ordinary sample reads actual action
          // state before offering a fresh batch. Never retry an entered batch.
          if (!(error instanceof OverloadError) || entered) throw error;
          stats.missedAdmissions++;
        }
      }
      if (step % 10 === 0) {
        const speakers = worldRootEntities(service.world).filter(
          (entity) => entity.actor?.controller === 'npc' && entity.actor.alive,
        );
        const speaker = speakers[Math.floor(step / 10) % speakers.length];
        if (speaker) {
          const speech = await service.say(
            `profile-speech:${phase}:${step}`,
            speaker.id,
            'I will keep watching this path.',
          );
          if (speech.ok) stats.speechAccepted++;
          else stats.speechRejected++;
        }
      }
      try {
        await delay(500, undefined, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      }
    }
  })().catch((error) => {
    failure = error;
  });
  return {
    snapshot: () => ({
      ...stats,
      activity: [...activity.values()].map((own) => ({
        ...own,
        gathered: resources.has(own.id)
          ? Math.max(
              0,
              resources.get(own.id).initial -
                (entityGet(service.world.entities, resources.get(own.id).resourceId)?.resource
                  ?.quantity ?? 0),
            )
          : 0,
      })),
      perActor: actors.map((actor) => ({
        id: actor.id,
        ...perActor.get(actor.id),
        start: before.get(actor.id),
        end: { ...worldPosition(entityGet(service.world.entities, actor.id)) },
        action: entityGet(service.world.entities, actor.id)?.actor?.action?.type ?? null,
      })),
      failure: failure ? String(failure) : null,
    }),
    async stop() {
      controller.abort();
      await task;
      sample();
      if (failure) throw failure;
    },
  };
}

/** Workload ownership is independent of optional timing. At most one edit can
 * occupy the writer; cancellation drains it before server/database teardown. */
async function startNativePressure(service, fixture, phase) {
  if (!fixture) return;
  const positions = () =>
    fixture.kind === 'converging-people'
      ? fixture.walkers.map(({ id }) => ({
          id,
          point: { ...worldPosition(entityGet(service.world.entities, id)) },
          action: entityGet(service.world.entities, id)?.actor?.action?.type ?? null,
        }))
      : [];
  const before = positions(),
    stats = {
      kind: fixture.kind,
      scope: 'whole speed including warmup',
      attempts: 0,
      admitted: 0,
      skippedOccupied: 0,
    };
  const controller = new AbortController();
  let failure;
  const apply = async (step) => {
    stats.attempts++;
    let changed = false;
    const result = await service.transition((world) => {
      const next = applyNativePressure(world, fixture, phase, step);
      changed = next !== world;
      return {
        world: next,
        events: next.events.slice(world.events.length),
        outcome: { ok: true, code: 'profile-pressure', message: 'Explicit diagnostic workload' },
      };
    });
    if (!result.ok) throw Error(`Native pressure publication refused: ${result.code}.`);
    if (changed) stats.admitted++;
    else stats.skippedOccupied++;
  };
  if (fixture.kind === 'converging-people') await apply(0);
  const task = (async () => {
    if (fixture.kind !== 'geometry-edits') return;
    for (let step = 0; !controller.signal.aborted; step++) {
      try {
        await delay(500, undefined, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      }
      if (!controller.signal.aborted) await apply(step);
    }
  })().catch((error) => {
    failure = error;
  });
  return {
    snapshot: () => ({
      ...stats,
      before,
      after: positions(),
      ...(fixture.kind === 'geometry-edits'
        ? {
            screen: {
              id: fixture.screen.id,
              initialBounds: fixture.screen.bounds,
              finalBounds: service.world.map.spatial.blockers.find(
                (b) => b.id === fixture.screen.id,
              )?.bounds,
              geometryRevision: service.world.map.spatial.revision,
            },
          }
        : {}),
      failure: failure ? String(failure) : null,
    }),
    async stop() {
      controller.abort();
      await task;
      if (failure) throw failure;
    },
  };
}

// Drive presence/control with the measured login's current lease. The process-local
// setup lease can become stale when HTTP entry or a restart replaces control.
async function controlWorld(base, cookie, input, clientId = 'local-internal') {
  const view = await (
    await toolHttp(base + '/api/state', { headers: { cookie, 'x-ol-client': clientId } })
  ).json();
  const response = await toolHttp(base + '/api/control', {
    method: 'POST',
    headers: {
      cookie,
      origin: base,
      'content-type': 'application/json',
      'x-ol-scope': view.access.scope,
      'x-ol-client': clientId,
    },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw Error(result.message ?? 'Could not control profiling world');
}
async function resumeWorld(base, cookie, clientId = 'local-internal') {
  const view = await (
    await toolHttp(base + '/api/state', { headers: { cookie, 'x-ol-client': clientId } })
  ).json();
  const response = await toolHttp(base + '/api/embodiment', {
    method: 'POST',
    headers: {
      cookie,
      origin: base,
      'content-type': 'application/json',
      'x-ol-scope': view.access.scope,
      'x-ol-client': clientId,
    },
    body: JSON.stringify({
      id: randomUUID(),
      expectedGeneration: view.access.controlGeneration,
      operation: 'replace',
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw Error(result.message ?? 'Could not take control of profiling fixture');
  return (
    await toolHttp(base + '/api/state', { headers: { cookie, 'x-ol-client': clientId } })
  ).json();
}

// A separate process keeps a busy server event loop from silently delaying the load generator.
// This is a bounded profiling workload, not a browser or live-cognition acceptance suite.
async function clientLoad() {
  const settingsReady = once(process, 'message');
  process.send({ booted: true });
  const [settings] = await settingsReady;
  const timestamp = () => performance.timeOrigin + performance.now();
  const timing = { measuredAt: undefined, end: Infinity };
  const beginMeasurement = (at) => {
    timing.measuredAt = at;
    timing.end = at - performance.timeOrigin + settings.seconds * 1000;
  };
  const measurementMessage = (message) => {
    if (message.measureAt !== undefined) beginMeasurement(message.measureAt);
  };
  process.on('message', measurementMessage);
  let begin;
  const started = new Promise((resolve) => {
    begin = resolve;
  });
  let connected = 0;
  const clients = settings.clients ?? [
    {
      cookie: settings.cookie,
      scope: settings.scope,
      position: settings.position,
      actorId: settings.actorId,
      clientId: 'local-internal',
    },
  ];
  // Fixed whole-run owners bound all simulated clients together. A client retains
  // one stream and at most three burst commands, one presence and one state read.
  // This workload does not change the actual server's admission capacities.
  const owner = createNetworkOwner({ role: 'profile-clients', capacity: 100 });
  const requests = createNetworkOwner({ role: 'profile-client-requests', capacity: 500 });
  const run = async (client) => {
    return owner.run(
      { timeoutMs: (settings.seconds + settings.warmupSeconds + 180) * 1000 },
      async (operation) => {
        const headers = { cookie: client.cookie, 'x-ol-client': client.clientId };
        const request = (path, init = {}) =>
          requests.run({ timeoutMs: 15000, parent: operation }, (child) =>
            toolHttp(
              settings.base + path,
              { ...init, headers: { ...headers, ...init.headers } },
              { parent: child },
            ),
          );
        const chunks = [],
          commands = [],
          reads = [],
          late = [],
          errors = [],
          skipped = [];
        const streamAbort = new AbortController();
        const stream = toolStream(
          settings.base + '/api/events',
          { headers, signal: streamAbort.signal },
          (chunk) => chunks.push({ at: timestamp(), bytes: chunk.byteLength }),
          (settings.seconds + settings.warmupSeconds + 180) * 1000,
          operation,
        );
        const reading = stream.done.catch((error) => {
          if (!streamAbort.signal.aborted) {
            // Traffic loops can continue until their offered deadline. Preserve
            // the actual disconnect time, rather than calling all that time slow
            // simulation if loss of the viewer subsequently pauses the world.
            if (process.connected)
              process.send({
                streamFailure: {
                  atUnixMs: timestamp(),
                  actorId: client.actorId,
                  clientId: client.clientId,
                  error: String(error),
                },
              });
            throw error;
          }
        });
        // Attach before awaiting admission, so an early refused stream is not an unhandled rejection.
        void reading.catch(() => {});
        try {
          await stream.ready;
          if (++connected === clients.length) process.send({ ready: true });
          await started;
          const start = performance.now();
          const periodic = async (interval, task) => {
            if (!interval) return;
            let due = start,
              index = 0;
            while (performance.now() < timing.end) {
              await delay(Math.max(0, due - performance.now()));
              if (performance.now() >= timing.end) break;
              const at = timestamp();
              late.push({ at, ms: Math.max(0, performance.now() - due) });
              try {
                await task(index++);
              } catch (error) {
                errors.push({ at, error: String(error) });
              }
              due += interval;
              if (due < performance.now()) {
                const missed = Math.floor((performance.now() - due) / interval);
                skipped.push({ at: timestamp(), count: missed });
                due += missed * interval;
              }
            }
          };
          const command = async (index) => {
            const at = performance.now();
            const value = settings.continuousMovement
              ? {
                  type: 'move',
                  position: client.destinations[index % 2],
                }
              : index % 3 === 2
                ? { type: 'cancel' }
                : {
                    type: 'move',
                    position: { ...client.position, x: client.position.x + (index % 2 ? 0 : 0.5) },
                  };
            const response = await request('/api/command', {
              method: 'POST',
              headers: {
                origin: settings.base,
                'content-type': 'application/json',
                'x-ol-scope': client.scope,
              },
              body: JSON.stringify({
                commandId: randomUUID(),
                commandEpoch: settings.epoch,
                command: value,
              }),
              signal: AbortSignal.timeout(15000),
            });
            const result = await response.json();
            commands.push({
              at: performance.timeOrigin + at,
              completedAt: timestamp(),
              ms: performance.now() - at,
              ok: response.ok && result.ok === true,
              code: result.code ?? response.status,
            });
          };
          await Promise.all([
            periodic(3000, async (index) => {
              const response = await request('/api/presence', {
                method: 'POST',
                headers: {
                  origin: settings.base,
                  'content-type': 'application/json',
                  'x-ol-scope': client.scope,
                },
                body: JSON.stringify({
                  clientId: client.clientId,
                  visible: true,
                  sequence: index + 2,
                }),
                signal: AbortSignal.timeout(15000),
              });
              const result = await response.json();
              if (!response.ok || !result.ok) throw Error('Presence heartbeat failed');
            }),
            periodic(settings.commandIntervalMs ?? 500, (index) =>
              settings.burst && index % 30 === 10
                ? Promise.all([0, 1, 2].map((offset) => command(index + offset)))
                : command(index),
            ),
            periodic(settings.readIntervalMs ?? 250, async () => {
              const at = performance.now();
              const response = await request('/api/state', { signal: AbortSignal.timeout(15000) });
              await response.arrayBuffer();
              if (!response.ok) throw Error('State read ' + response.status);
              reads.push({
                at: performance.timeOrigin + at,
                completedAt: timestamp(),
                ms: performance.now() - at,
              });
            }),
          ]);
          return {
            actorId: client.actorId,
            clientId: client.clientId,
            start: performance.timeOrigin + start,
            completedAt: timestamp(),
            commands,
            reads,
            late,
            errors,
            skipped,
            chunks,
          };
        } finally {
          streamAbort.abort();
          await reading;
        }
      },
    );
  };
  const pending = Promise.all(clients.map(run));
  const go = once(process, 'message');
  const [first] = await Promise.race([
    go,
    pending.then(() => {
      throw Error('Load ended before start.');
    }),
  ]);
  if (first.measureAt !== undefined) beginMeasurement(first.measureAt);
  begin();
  const samples = await pending;
  process.off('message', measurementMessage);
  const completedAt = Math.max(...samples.map((sample) => sample.completedAt));
  const summarize = (rows, from, until) => {
    const during = (key) =>
      rows.flatMap((row) => row[key]).filter((value) => value.at >= from && value.at < until);
    const commands = during('commands'),
      errors = during('errors'),
      stream = during('chunks');
    const codes = {};
    for (const command of commands) codes[command.code] = (codes[command.code] ?? 0) + 1;
    return {
      elapsedSeconds: (until - from) / 1000,
      connectedActors: rows.length,
      commands: distribution(commands.filter((value) => value.ok).map((value) => value.ms)),
      rejectedCommands: distribution(
        commands.filter((value) => !value.ok).map((value) => value.ms),
      ),
      commandCodes: codes,
      reads: distribution(during('reads').map((value) => value.ms)),
      requestTimerLateness: distribution(during('late').map((value) => value.ms)),
      skippedIntervals: during('skipped').reduce((sum, value) => sum + value.count, 0),
      streamBytes: stream.reduce((sum, value) => sum + value.bytes, 0),
      streamChunks: stream.length,
      errorCount: errors.length,
      errors: errors.slice(0, 12).map((value) => value.error),
    };
  };
  const measured = summarize(samples, timing.measuredAt, completedAt);
  const result = {
    measurementStartsAtUnixMs: timing.measuredAt,
    measured: {
      ...measured,
      offeredSeconds: settings.seconds,
      requestDrainSeconds: Math.max(0, (completedAt - timing.measuredAt) / 1000 - settings.seconds),
      requestsStartedBeforeMeasurementAndCompletedAfter: samples
        .flatMap((row) => [...row.commands, ...row.reads])
        .filter((value) => value.at < timing.measuredAt && value.completedAt >= timing.measuredAt)
        .length,
      actors: samples.map((row) => ({
        actorId: row.actorId,
        clientId: row.clientId,
        ...summarize([row], timing.measuredAt, completedAt),
      })),
    },
    ...(settings.warmupSeconds
      ? {
          warmup: summarize(
            samples,
            Math.min(...samples.map((row) => row.start)),
            timing.measuredAt,
          ),
        }
      : {}),
  };
  await new Promise((done) => process.send({ result }, done));
  process.disconnect();
}

async function startLoad(settings) {
  const child = fork(fileURLToPath(import.meta.url), ['--client'], {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  const diagnostics = {};
  let readyResolve, resultResolve, reject;
  const ready = new Promise((resolve, fail) => {
    readyResolve = resolve;
    reject = fail;
  });
  const result = new Promise((resolve, fail) => {
    resultResolve = resolve;
    child.on('error', fail);
    child.on('exit', (code) => {
      if (code !== 0) {
        diagnostics.exitedAtUnixMs = performance.timeOrigin + performance.now();
        fail(Error('Load generator exited ' + code));
      }
    });
  });
  result.catch(() => {}); // The startup path can fail before the caller awaits the result.
  child.on('message', (message) => {
    if (message.booted) child.send(settings);
    if (message.ready) readyResolve();
    if (message.result) resultResolve(message.result);
    if (message.streamFailure && !diagnostics.streamFailure)
      diagnostics.streamFailure = message.streamFailure;
  });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code !== 0) reject(Error('Load generator exited ' + code));
  });
  const timeout = setTimeout(() => {
    reject(Error('Load generator startup timeout'));
    child.kill();
  }, 120000);
  try {
    await ready;
  } finally {
    clearTimeout(timeout);
  }
  return { child, result, diagnostics };
}

function metricDelta(before, after) {
  const metrics = {};
  for (const [name, value] of Object.entries(after)) {
    if (name === 'runtime' || typeof value !== 'object' || value === null || !('count' in value))
      continue;
    const count = value.count - (before[name]?.count ?? 0);
    if (!count) continue;
    metrics[name] = {
      count,
      totalMs: value.totalMs - (before[name]?.totalMs ?? 0),
      cumulativeMaxMs: value.maxMs,
    };
  }
  const counters = {};
  for (const [name, value] of Object.entries(after.runtime?.counters ?? {}))
    counters[name] = value - (before.runtime?.counters?.[name] ?? 0);
  return { counters, gauges: after.runtime?.gauges, metrics };
}

async function main() {
  const toolOptions = profilingOptions(process.argv.slice(2));
  const appProfiling = toolOptions.enabled;
  const collectCpu = process.env.OPENLEGEND_CPU_PROFILE === '1';
  if (collectCpu && !appProfiling) throw Error('CPU capture requires application profiling.');
  const workload = process.env.OPENLEGEND_PROFILE_WORKLOAD;
  if (workload && !['standard', 'substantial', 'larger'].includes(workload))
    throw Error('Unsupported selected workload.');
  const controlledPeople = Number(
    process.env.OPENLEGEND_PROFILE_PLAYERS ?? (workload === 'larger' ? 100 : 1),
  );
  if (
    !Number.isInteger(controlledPeople) ||
    controlledPeople < 1 ||
    controlledPeople > 100 ||
    (workload === 'standard' && controlledPeople !== 1) ||
    (workload === 'substantial' && ![1, 25].includes(controlledPeople)) ||
    (workload === 'larger' && controlledPeople !== 100)
  )
    throw Error('Controlled people do not match the selected workload.');
  const [
    scenarioPath,
    output,
    secondsText = '15',
    speedText = '1,3,8',
    intervalText = workload ? '1000' : '500',
  ] = toolOptions.arguments;
  const seconds = Number(secondsText),
    warmupSeconds = Number(process.env.OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS ?? '0'),
    commandIntervalMs = Number(intervalText),
    speeds = speedText.split(',').map(Number);
  if (
    toolOptions.arguments.length > 5 ||
    !scenarioPath ||
    !output ||
    !Number.isInteger(seconds) ||
    seconds < 5 ||
    seconds > 1800 ||
    !Number.isInteger(warmupSeconds) ||
    warmupSeconds < 0 ||
    warmupSeconds > 60 ||
    !Number.isInteger(commandIntervalMs) ||
    commandIntervalMs < 25 ||
    commandIntervalMs > 1000 ||
    !speeds.length ||
    speeds.length > 3 ||
    speeds.some((n) => ![1, 1.25, 3, 8].includes(n)) ||
    (speeds.includes(1.25) && speeds.length !== 1)
  )
    throw Error(
      'Usage: node --import tsx scripts/performance/profile-server.mjs SCENARIO.json NEW_REPORT.json [5..1800 seconds per phase] [1,1.25,3,8; 1.25 alone] [25..1000 command interval ms] [--app-profiling=on|off]',
    );
  let scenario = parseScenario(JSON.parse(await readFile(scenarioPath, 'utf8')));
  if (scenario.input)
    throw Error('This disposable server profile takes generated scenarios, not a user save.');
  const dir = await mkdtemp(join(tmpdir(), 'openlegend-server-profile-'));
  const config = readConfig({
    ...process.env,
    OPEN_LEGEND_DATA_DIR: dir,
    OPEN_LEGEND_PROFILING: appProfiling ? 'on' : 'off',
    OPEN_LEGEND_DATABASE_URL: process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL,
    AI_BUDGET_USD: '0',
    DECISION_ESCALATION_JSON: '{"mode":"off","origins":[],"reasons":[]}',
    OPENAI_API_KEY: '',
    JEV_API_KEY: '',
    MACROFOLD_API_KEY: '',
    // Speed selection is a creator capability. Ordinary 1x players keep the
    // configured access/defaults; diagnostics at other game speeds need it.
    OPEN_LEGEND_GOD_MODE: speeds.some((speed) => speed === 3 || speed === 8) ? 'true' : 'false',
  });
  const nominalBaseRatio = config.baseRatio;
  const diagnosticClockFactor = speeds[0] === 1.25 ? 1.25 : 1;
  config.baseRatio *= diagnosticClockFactor;
  config.budgetUsd = 0;
  config.llmKey = '';
  config.jevKey = '';
  config.macrofoldKey = '';
  config.embeddingKey = '';
  const report = {
    scope:
      'Real server timer, explicit database adapter, SSE and separate-process HTTP load with presence heartbeats; no browser or live model calls. Warm-up and measurement use continuous load without an intervening pause. The warm-up ends at the next server event-loop opportunity; client metrics are attributed by request-start timestamps. Measurement includes outstanding-request drain and can overlap a request started during warm-up. Later speeds reuse the world. Metric cumulative maxima are since startup; stageMaximaMs, stageDistributions and eventLoop belong to the reported phase.',
    node: process.version,
    cpu: cpus()[0]?.model,
    run: process.env.GITHUB_RUN_ID,
    secondsPerPhase: seconds,
    warmupSecondsPerSpeed: warmupSeconds,
    commandIntervalMs,
    requestedSpeeds: speeds,
    scenario,
    workload: workload ?? 'custom',
    controlledPeople,
    nominalBaseRatio,
    diagnosticClockFactor,
    paidModelCalls: 0,
    artwork:
      'Native depiction in an isolated database; renderer and published asset delivery are not measured.',
    source: process.env.OPENLEGEND_PROFILE_SOURCE ?? null,
    instrumentation: {
      appProfiling: appProfiling ? 'on' : 'off',
      cpuSampling: collectCpu,
      runtimeMonitoring: appProfiling,
      domainCounters: appProfiling,
      externalProcessCuts: true,
      externalEventLoop: appProfiling,
    },
    warmups: [],
    phases: [],
  };
  let game, load, database, stopPhaseObserving, observedLoop, activePhase, capture, cpuProfiler;
  let cpuRecording = false;
  const saveCpuProfile = async () => {
    if (!cpuRecording) return;
    cpuRecording = false;
    report.cpuProfileWindow.stopBeforeUs = Number(process.hrtime.bigint() / 1000n);
    const { profile } = await cpuProfiler.post('Profiler.stop');
    report.cpuProfileWindow.stopAfterUs = Number(process.hrtime.bigint() / 1000n);
    await writeFile(resolve(output) + '.cpuprofile', JSON.stringify(profile), {
      flag: 'wx',
      mode: 0o600,
    });
  };
  let pressureFixture, pressureRun;
  let cohortIds = new Set();
  const participantBindings = [];
  let residentFixture;
  // Retain the resource until the factory returns a closeable server. An initialization
  // failure otherwise leaves the database socket/worker alive with no returned handle.
  const startGame = async (tick) => {
    const store = new SqlGameRepository(
      config.dataDirectory,
      new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups),
    );
    try {
      if (!tick) {
        // This disposable native/server workload owns no asset publication catalogue.
        // Seed through the normal world service before HTTP, preserving initial
        // observations, condition effects, construction grants and Main content.
        const opening = new WorldService(store, config);
        try {
          await opening.ready;
        } finally {
          opening.releaseHostWork();
          await opening.settleBackgroundSaves();
        }
      }
      return await createGameServer({ config, production: true, tick, store });
    } catch (error) {
      await store.close().catch(() => {});
      throw error;
    }
  };
  const beginPhase = () => {
    const nativeStart = nativePopulation(game.service.world, cohortIds);
    const recentStart = recentOwnerCensus(game.service.world);
    const nativeCounters = {},
      stages = {};
    if (appProfiling) observeDomainCounters(nativeCounters);
    if (appProfiling)
      stopPhaseObserving = observeDurations((stage, milliseconds) => {
        const sample = (stages[stage] ??= { count: 0, totalMs: 0, maxMs: 0, values: [] });
        sample.values[sample.count % 256] = milliseconds;
        sample.count++;
        sample.totalMs += milliseconds;
        sample.maxMs = Math.max(sample.maxMs, milliseconds);
      });
    const loop = appProfiling
      ? (observedLoop = monitorEventLoopDelay({ resolution: 10 }))
      : undefined;
    loop?.enable();
    return {
      before: performanceSnapshot(),
      nativeStart,
      recentStart,
      nativeCounters,
      stages,
      loop,
      startingHostLoad: loadavg(),
      startingMemory: process.memoryUsage(),
      activityStart: pressureRun?.snapshot().activity,
      sim: game.service.world.simTime,
      cpu: process.cpuUsage(),
      threadCpu: typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage() : null,
      start: performance.now(),
      ...(collectCpu ? { cpuStartedUs: Number(process.hrtime.bigint() / 1000n) } : {}),
      startedAtUnixMs: performance.timeOrigin + performance.now(),
    };
  };
  const finishPhase = (phase) => {
    stopPhaseObserving?.();
    stopPhaseObserving = undefined;
    observeDomainCounters();
    phase.loop?.disable();
    observedLoop = undefined;
    const end = performance.now(),
      cpuEndedUs = collectCpu ? Number(process.hrtime.bigint() / 1000n) : undefined,
      used = process.cpuUsage(phase.cpu),
      threadUsed = phase.threadCpu ? process.threadCpuUsage(phase.threadCpu) : null,
      after = performanceSnapshot(),
      pressure = pressureRun?.snapshot();
    const elapsed = (end - phase.start) / 1000,
      advanced = game.service.world.simTime - phase.sim;
    return {
      startingSimTime: phase.sim,
      ...(collectCpu
        ? {
            cpuWindow: {
              fromUs: phase.cpuStartedUs,
              throughUs: cpuEndedUs,
            },
          }
        : {}),
      elapsedSeconds: elapsed,
      advancedSimSeconds: advanced,
      expectedSimSeconds: elapsed * config.baseRatio * game.service.speed,
      achievedSpeed: advanced / elapsed / nominalBaseRatio,
      achievedFraction: advanced / (elapsed * config.baseRatio * game.service.speed),
      // Endpoint state is not a measurement of how long a phase was paused.
      paused: game.service.paused,
      pauseReason: game.service.pauseReason,
      ...(load?.diagnostics.streamFailure ? { loadFailure: { ...load.diagnostics } } : {}),
      population: populationCensus(game.service.world),
      controlledActivity: phase.controlledStarts?.map((actor) => ({
        ...actor,
        end: { ...worldPosition(entityGet(game.service.world.entities, actor.actorId)) },
        action: entityGet(game.service.world.entities, actor.actorId)?.actor?.action?.type ?? null,
      })),
      nativeStart: phase.nativeStart,
      nativeEnd: nativePopulation(game.service.world, cohortIds),
      recentOwners: {
        scope: 'Cached ownership metadata at phase boundaries, outside measured timing/CPU.',
        start: phase.recentStart,
        end: recentOwnerCensus(game.service.world),
      },
      geometry: game.service.geometryStatistics,
      ...(pressure
        ? {
            nativePressure: pressure,
            activity: activityDelta(phase.activityStart, pressure.activity),
          }
        : {}),
      serverCpuMs: (used.user + used.system) / 1000,
      mainThreadCpuMs: threadUsed ? (threadUsed.user + threadUsed.system) / 1000 : null,
      startingHostLoad: phase.startingHostLoad,
      endingHostLoad: loadavg(),
      nativeCounters: appProfiling ? phase.nativeCounters : null,
      stageMaximaMs: appProfiling
        ? Object.fromEntries(Object.entries(phase.stages).map(([name, s]) => [name, s.maxMs]))
        : null,
      stageDistributions: appProfiling
        ? Object.fromEntries(
            Object.entries(phase.stages).map(([name, s]) => [
              name,
              {
                count: s.count,
                totalMs: s.totalMs,
                maxMs: s.maxMs,
                recent: distribution(s.values),
              },
            ]),
          )
        : null,
      eventLoop: phase.loop
        ? {
            p50Ms: phase.loop.percentile(50) / 1e6,
            p95Ms: phase.loop.percentile(95) / 1e6,
            maxMs: phase.loop.max / 1e6,
          }
        : null,
      startingHeapUsedBytes: phase.startingMemory.heapUsed,
      startingRssBytes: phase.startingMemory.rss,
      heapUsedBytes: process.memoryUsage().heapUsed,
      rssBytes: process.memoryUsage().rss,
      storageError: game.service.storageError,
      backgroundFailures: after.runtime.backgroundFailures,
      memoryBacklog: game.service.memoryBacklog,
      attribution: appProfiling
        ? { status: 'collected', ...metricDelta(phase.before, after) }
        : { status: 'disabled' },
    };
  };
  try {
    capture = appProfiling ? startPerformanceCapture({ runtimeMonitoring: true }) : undefined;
    await initializeCollisionRuntime();
    database = await createDisposableDatabase(process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL);
    config.databaseUrl = database.url;
    report.database = database.details;
    // Preserve only the generated fixture identity if an external watchdog ends
    // this process before the final report; never print the connection string.
    console.error(JSON.stringify({ fixtureDatabase: database.details.database }));
    const openingStarted = performance.now();
    game = await startGame(false);
    report.coldOpeningMs = performance.now() - openingStarted;
    await new Promise((done) => game.server.listen(0, config.host, done));
    let base = 'http://' + config.host + ':' + game.server.address().port;
    let response = await toolHttp(base + '/api/state');
    let cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No local session');
    await resumeWorld(base, cookie);
    await controlWorld(base, cookie, {
      paused: false,
      clientId: 'profile-setup',
      presenceSequence: 1,
    });
    const setup = await game.service.transition((world) => {
      if (workload) {
        const current = populationCensus(world),
          target =
            workload === 'standard'
              ? current
              : {
                  people: workload === 'larger' ? 200 : 100,
                  animals: 100,
                  objects: 200,
                };
        if (
          current.people > target.people ||
          current.animals > target.animals ||
          current.objects > target.objects
        )
          throw Error('Selected population cannot discard authored opening content.');
        scenario = parseScenario({
          seed: scenario.seed,
          layout: 'crowded',
          people: target.people - current.people,
          animals: target.animals - current.animals,
          objects:
            target.objects > current.objects
              ? [
                  {
                    count: target.objects - current.objects,
                    name: 'Scene material',
                    properties: ['rigid'],
                    quantity: 1000,
                    workSeconds: 60,
                  },
                ]
              : [],
        });
        report.scenario = scenario;
        report.targetPopulation = target;
      }
      const population = populateScenario(structuredClone(world), scenario);
      const pressure = prepareNativePressure(population.world, scenario, population.addedAnimalIds);
      pressureFixture = pressure.fixture;
      cohortIds = new Set(population.addedAnimalIds);
      const roots = worldRootEntities(pressure.world);
      const people = roots.filter((entity) => entity.actor && entity.kind !== 'animal');
      const player = game.service.controlledEntityId;
      const controlled = [
        player,
        ...people.filter((entity) => entity.id !== player).map((entity) => entity.id),
      ].slice(0, controlledPeople);
      if (controlled.length !== controlledPeople)
        throw Error('Not enough distinct controlled people.');
      participantBindings.push(
        ...controlled.map((actorId, index) => ({
          actorId,
          index,
          issuer: 'https://profile.openlegend.invalid',
          subject: `player-${index}`,
          accountId: `profile-player-${index}`,
        })),
      );
      let preparedWorld = pressure.world;
      if (workload && workload !== 'standard') {
        const prepared = prepareResidents(preparedWorld, new Set(controlled));
        residentFixture = prepared.fixture;
        preparedWorld = prepared.world;
      }
      validateCurrentWorldState(preparedWorld);
      return {
        world: preparedWorld,
        events: [],
        outcome: { ok: true, code: 'profile-setup', message: 'Disposable profiling scene' },
      };
    });
    if (!setup.ok || cohortIds.size !== scenario.animals * (scenario.groupDistance ? 2 : 1))
      throw Error('Generated native cohort did not match the requested workload.');
    report.initialPopulation = populationCensus(game.service.world);
    for (const binding of participantBindings.slice(1))
      await game.service.authenticationMutation(() =>
        game.service.store.authority.provision(game.service.world.id, {
          issuer: binding.issuer,
          subject: binding.subject,
          accountId: binding.accountId,
          actorId: binding.actorId,
          capabilities: ['play'],
        }),
      );
    await controlWorld(base, cookie, { paused: true });
    await game.service.flush();
    await game.close();
    game = undefined;
    // Start the actual timer only after scene construction: first acquisition belongs
    // to profiled load (warmup when configured), not an incidental setup timer callback.
    const restoreStarted = performance.now();
    game = await startGame(true);
    report.coldRestoreMs = performance.now() - restoreStarted;
    await new Promise((done) => game.server.listen(0, config.host, done));
    base = 'http://' + config.host + ':' + game.server.address().port;
    response = await toolHttp(base + '/api/state');
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No restarted local session');
    // The reopened fixture has a new login, while its setup login may still hold
    // control. Take control explicitly through the same endpoint used by a player.
    const participants = [];
    for (const binding of participantBindings) {
      const token =
        binding.index === 0
          ? cookie
          : 'ol_session=' +
            (
              await game.service.authenticationMutation(() =>
                game.service.store.authority.login(
                  { issuer: binding.issuer, subject: binding.subject },
                  Date.now(),
                  (seconds + warmupSeconds + 600) * 1000,
                ),
              )
            ).token;
      const actor = entityGet(game.service.world.entities, binding.actorId);
      if (actor?.actor?.controller !== 'player')
        throw Error('Configured participant did not acquire a distinct player body.');
      participants.push({
        actorId: binding.actorId,
        cookie: token,
        position: { ...worldPosition(actor), surfaceId: worldSupport(actor) },
        ...(workload ? { destinations: prepareWalkingRoute(game.service.world, actor.id) } : {}),
      });
    }
    // Creator access is needed only to select a diagnostic game speed. All
    // workload streams and warmup/measurement use ordinary permitted views.
    config.godMode = false;
    report.activePopulation = populationCensus(game.service.world);
    const authoredClockRate = game.service.world.timePolicy.normalGameSecondsPerSecond;
    if (diagnosticClockFactor !== 1 && authoredClockRate !== nominalBaseRatio)
      throw Error('Diagnostic host pacing must preserve the authored normal clock rate.');
    report.effectiveSettings = {
      worldPreset: config.worldPreset,
      worldSeed: game.service.world.seed,
      baseRatio: config.baseRatio,
      nominalBaseRatio,
      diagnosticClockFactor,
      godMode: config.godMode,
      authoredClockRate,
      evidence: evidenceSettings(game.service.world),
    };
    if (collectCpu) {
      cpuProfiler = new Session();
      cpuProfiler.connect();
      await cpuProfiler.post('Profiler.enable');
      report.cpuProfileWindow = { startBeforeUs: Number(process.hrtime.bigint() / 1000n) };
      await cpuProfiler.post('Profiler.start');
      cpuRecording = true;
      report.cpuProfileWindow.startAfterUs = Number(process.hrtime.bigint() / 1000n);
    }
    // Keep warm-up and measured work continuous: an intervening pause can itself
    // fail the normal busy-admission gate in precisely the overloaded case measured here.
    // docs/maintainers/performance-profiling.md#full-server-workload
    for (const [index, speed] of speeds.entries()) {
      const clients = [];
      for (const [person, participant] of participants.entries()) {
        const clientId = `profile-${index}-${person}`;
        const state = await resumeWorld(base, participant.cookie, clientId);
        if (
          state.player?.id !== participant.actorId &&
          state.access.actorId !== participant.actorId
        )
          throw Error('A profile stream selected the wrong player body.');
        const presence = await toolHttp(base + '/api/presence', {
          method: 'POST',
          headers: {
            cookie: participant.cookie,
            origin: base,
            'content-type': 'application/json',
            'x-ol-scope': state.access.scope,
            'x-ol-client': clientId,
          },
          body: JSON.stringify({ clientId, visible: true, sequence: 1 }),
        });
        if (!presence.ok || !(await presence.json()).ok)
          throw Error('Participant presence refused.');
        clients.push({ ...participant, clientId, scope: state.access.scope });
      }
      const connectingStarted = performance.now();
      if (speed !== 1 && speed !== 1.25) {
        config.godMode = true;
        try {
          await controlWorld(base, cookie, { speed }, clients[0].clientId);
        } finally {
          config.godMode = false;
        }
      } else if (index > 0 && speeds[index - 1] !== 1 && speeds[index - 1] !== 1.25) {
        // A multi-speed custom run may return to normal after a faster phase.
        config.godMode = true;
        try {
          await controlWorld(base, cookie, { speed: 1 }, clients[0].clientId);
        } finally {
          config.godMode = false;
        }
      }
      load = await startLoad({
        base,
        clients,
        epoch: game.service.commandEpoch,
        seconds,
        warmupSeconds,
        commandIntervalMs,
        continuousMovement: !!workload,
        readIntervalMs: workload ? 0 : 250,
        burst: !!workload,
      });
      (report.streamConnections ??= []).push({
        speed,
        actors: clients.length,
        milliseconds: performance.now() - connectingStarted,
      });
      activePhase = beginPhase();
      activePhase.controlledStarts = clients.map((client) => ({
        actorId: client.actorId,
        position: { ...worldPosition(entityGet(game.service.world.entities, client.actorId)) },
        destinations: client.destinations,
      }));
      await controlWorld(base, cookie, { paused: false }, clients[0].clientId);
      pressureRun = workload
        ? await startResidents(game.service, residentFixture, index)
        : await startNativePressure(game.service, pressureFixture, index);
      activePhase.activityStart = pressureRun?.snapshot().activity;
      load.child.send({
        go: true,
        ...(warmupSeconds ? {} : { measureAt: activePhase.startedAtUnixMs }),
      });
      let warmup;
      if (warmupSeconds) {
        await delay(warmupSeconds * 1000);
        warmup = finishPhase(activePhase);
        activePhase = beginPhase();
        activePhase.controlledStarts = clients.map((client) => ({
          actorId: client.actorId,
          position: { ...worldPosition(entityGet(game.service.world.entities, client.actorId)) },
          destinations: client.destinations,
        }));
        load.child.send({ measureAt: activePhase.startedAtUnixMs });
      }
      const client = await load.result;
      await pressureRun?.stop();
      if (warmup) report.warmups.push({ speed, ...warmup, client: client.warmup });
      const finished = finishPhase(activePhase);
      const intended = workload
        ? finished.activity.filter(
            (actor) => actor.kind !== 'animal' && (workload !== 'standard' || actor.controlled),
          )
        : [];
      const inactive = intended
        .filter((actor) => actor.metres <= 0.01 && actor.gathered === 0)
        .map((actor) => actor.id);
      report.phases.push({
        speed,
        ...finished,
        client: client.measured,
        workloadCoverage: workload
          ? {
              intendedHumans: intended.length,
              humansWithActualMovementOrWork: intended.length - inactive.length,
              inactiveHumans: inactive,
              complete: !inactive.length,
              animalMetres: finished.activity
                .filter((actor) => actor.kind === 'animal')
                .reduce((sum, actor) => sum + actor.metres, 0),
            }
          : undefined,
      });
      pressureRun = undefined;
      activePhase = undefined;
      load.child.kill();
      load = undefined;
      if (client.measured.errorCount || client.warmup?.errorCount) {
        report.error = 'Load generator reported failed requests; see retained phase evidence.';
        process.exitCode = 1;
        break;
      }
      if (finished.storageError || finished.backgroundFailures.observed > 0) {
        report.error = 'Server background work failed; see retained phase evidence.';
        process.exitCode = 1;
        break;
      }
      // Between speeds retain ordinary pause admission; final shutdown already stops
      // the server's own timer before draining and saving, so no last pause is needed.
      if (index + 1 < speeds.length) {
        await controlWorld(base, cookie, { paused: true }, clients[0].clientId);
        await game.service.flush();
      }
    }
    await saveCpuProfile();
    report.evidenceStorage = await evidenceStorageStats(
      game.service.store.db,
      game.service.world.id,
    );
    report.finalCounts = {
      entities: entityKeys(game.service.world.entities).length,
      events: game.service.world.events.length,
      awareness: Object.values(game.service.world.experience?.awareness ?? {}).reduce(
        (n, rows) => n + rows.length,
        0,
      ),
    };
    if (game.service.world.timePolicy.normalGameSecondsPerSecond !== authoredClockRate)
      throw Error('The workload changed the authored normal clock rate.');
    // Explicit --expose-gc opts into a post-measurement retained-heap sample.
    // Keep the server/world alive; do not confuse cleanup or a phase-end heap with
    // retained runtime memory. Collection is outside every measured workload window.
    if (typeof globalThis.gc === 'function') {
      const started = performance.now();
      globalThis.gc();
      globalThis.gc();
      report.retainedMemory = {
        status: 'collected',
        scope:
          'Main isolate after two requested full collections, before server shutdown; includes resident world, in-flight work and profiling records. RSS includes worker memory and is not a retained-heap or peak measurement.',
        collectionMs: performance.now() - started,
        simTime: game.service.world.simTime,
        ...process.memoryUsage(),
      };
    } else report.retainedMemory = { status: 'unavailable', reason: 'Run Node with --expose-gc.' };
  } catch (error) {
    if (activePhase) report.incompletePhase = finishPhase(activePhase);
    report.error = String(error);
    process.exitCode = 1;
  } finally {
    // An overloaded warm-up is evidence too. Stop before cleanup, retaining its
    // CPU trace without replacing the original workload failure if capture fails.
    try {
      await saveCpuProfile();
    } catch (error) {
      report.cpuProfileError = String(error);
      process.exitCode = 1;
    }
    cpuProfiler?.disconnect();
    stopPhaseObserving?.();
    observedLoop?.disable();
    observeDomainCounters();
    load?.child.kill();
    const cleanupErrors = [];
    for (const [name, cleanup] of [
      ['native pressure', () => pressureRun?.stop()],
      ['server', () => game?.close()],
      ['database', () => database?.close()],
      ['directory', () => rm(dir, { recursive: true, force: true })],
    ]) {
      try {
        await cleanup();
      } catch {
        cleanupErrors.push(`${name} cleanup failed`);
      }
    }
    if (cleanupErrors.length) {
      report.cleanupErrors = cleanupErrors;
      process.exitCode = 1;
    }
    try {
      await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    } finally {
      capture?.stop();
    }
  }
  console.log(
    JSON.stringify({
      output,
      phases: report.phases.map((p) => ({
        speed: p.speed,
        achievedSpeed: p.achievedSpeed,
        commands: p.client.commands,
        eventLoop: p.eventLoop,
        storageError: p.storageError,
        memoryBacklog: p.memoryBacklog,
      })),
      error: report.error,
    }),
  );
}
if (process.argv[2] === '--client') await clientLoad();
else await main();
