import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setMaxListeners } from 'node:events';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { NetworkError } from '@open-legend/network';
import type { ApiResult, GameView } from '@open-legend/protocol';
import type { WorldPoint } from '@open-legend/spatial';
import {
  movementIntervalMs,
  movementOffsetMs,
  type ScheduleObservation,
  type SustainedAttempt,
  type SustainedClientMessage,
  type SustainedClockReceipt,
  type SustainedClockSample,
  type SustainedHostMessage,
  type SustainedMove,
  type SustainedPlayer,
  type SustainedPlayerResult,
  type SustainedStart,
  type SustainedStreamClose,
  type SustainedStreamStats,
} from './witness-sustained-client-contract.js';
import { createSustainedHttp } from './witness-sustained-http.js';

interface ArchivedStreamReader {
  preparePlayerStream(root: string): Promise<unknown>;
  connectPlayerStream(input: {
    root: string;
    base: string;
    cookie: string;
    scope: string;
    clientId: string;
    maxActions: number;
    timeoutMs: number;
    now: () => number;
    onView(view: GameView, receipt: { receivedAtMs: number; frame: 'reset' | 'patch' }): void;
  }): Promise<{
    stats(): SustainedStreamStats;
    closed: Promise<SustainedStreamClose>;
    disconnect(): Promise<SustainedStreamClose>;
  }>;
}

const ipc = process.send?.bind(process);
assert(ipc, 'The signed workload needs its parent process.');
const send = (message: SustainedClientMessage) => ipc(message);
const now = () => performance.timeOrigin + performance.now();
const stopSignal = new AbortController();
let stoppedAt: number | undefined;
let phase: SustainedStart | undefined;
function stop() {
  stoppedAt ??= now();
  stopSignal.abort();
}
process.on('message', (message: SustainedHostMessage) => {
  if ('stop' in message) stop();
});
process.once('disconnect', stop);

function receive<K extends KeysOfUnion<SustainedHostMessage>>(key: K) {
  return new Promise<Extract<SustainedHostMessage, Record<K, unknown>>>((resolve, reject) => {
    function dispose() {
      process.off('message', accept);
      process.off('disconnect', disconnected);
    }
    function disconnected() {
      dispose();
      reject(new Error('The workload parent disconnected.'));
    }
    function accept(message: SustainedHostMessage) {
      if (!(key in message)) return;
      dispose();
      resolve(message as Extract<SustainedHostMessage, Record<K, unknown>>);
    }
    process.on('message', accept);
    process.once('disconnect', disconnected);
  });
}
type KeysOfUnion<T> = T extends unknown ? keyof T : never;

const setup = receive('players');
send({ booted: true });
const settings = await setup;
// One timer for each movement and presence schedule, plus the window cutoff.
setMaxListeners(settings.players.length * 2 + 1, stopSignal.signal);
const { preparePlayerStream, connectPlayerStream }: ArchivedStreamReader = await import(
  pathToFileURL(join(settings.driverDirectory, 'stream.mts')).href
);
await preparePlayerStream(settings.root);

const { request, stop: stopHttp } = createSustainedHttp(
  settings.base,
  'sustained-workload-client',
  settings.players.length * 4,
  15_000,
);
type Authority = { scope: string; generation: string };

function distance(a: WorldPoint, b: WorldPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
const changed = (a: WorldPoint, b: WorldPoint) => distance(a, b) > 0.001;

function authorityFor(view: GameView, player: SustainedPlayer) {
  const access = view.access;
  const generation = view.historyEpoch?.split(':')[0];
  assert(
    access?.actorId === player.actorId && access.accountId === player.accountId && generation,
    'The signed tab must view the requested player.',
  );
  return { scope: access.scope, generation, access };
}

const clock: SustainedClockSample[] = [];
let latestClock: SustainedClockReceipt | undefined;
let nextClockBoundary: number | undefined;
let firstProgressSent = false;

function recordClockAt(boundary: number, clockEnd: number) {
  clock.push({ boundary, receipt: latestClock });
  nextClockBoundary = boundary === clockEnd ? undefined : Math.min(boundary + 10_000, clockEnd);
}

function observeClock(value: GameView['clock'], at: number) {
  if (!firstProgressSent && value.seconds >= 1) {
    firstProgressSent = true;
    send({ clockStarted: { receivedAt: at, gameSeconds: value.seconds } });
  }
  if (phase) {
    const cutoff = Math.min(phase.end, stoppedAt ?? Infinity);
    while (nextClockBoundary !== undefined && nextClockBoundary < at && nextClockBoundary <= cutoff)
      recordClockAt(nextClockBoundary, phase.end);
    if (at > cutoff) return;
  }
  latestClock = {
    at,
    gameSeconds: value.seconds,
    paused: value.paused,
    pauseReason: value.pauseReason,
    speed: value.speed,
    preparingNavigation: value.preparingNavigation,
  };
}

function completeClock(cutoff: number, window: SustainedStart) {
  while (nextClockBoundary !== undefined && nextClockBoundary <= cutoff)
    recordClockAt(nextClockBoundary, window.end);
  if (cutoff >= window.start && clock.at(-1)?.boundary !== cutoff)
    clock.push({ boundary: cutoff, receipt: latestClock });
}

async function waitUntil(at: number) {
  while (!stopSignal.signal.aborted && now() < at) {
    try {
      await delay(Math.max(1, at - now()), undefined, { signal: stopSignal.signal });
    } catch (error) {
      if (!stopSignal.signal.aborted) throw error;
    }
  }
}

interface PendingMovement {
  attempt: SustainedMove;
  awaitingReply: boolean;
  // Only the current in-flight request can need poses from before its reply.
  // Keep the first position change for each candidate action, never frame history.
  positionsByAction?: Map<string, number>;
  reachedDestination?: number;
}

function matchMovement(movement: PendingMovement) {
  const { attempt, positionsByAction, reachedDestination } = movement;
  if (!attempt.ok || attempt.firstStreamMovementAt !== undefined) return;
  const byId =
    attempt.actionId !== undefined ? positionsByAction?.get(attempt.actionId) : undefined;
  if (byId !== undefined && (reachedDestination === undefined || byId <= reachedDestination)) {
    attempt.firstStreamMovementAt = byId;
    attempt.firstStreamMovementMatchedBy = 'action-id';
  } else if (reachedDestination !== undefined) {
    attempt.firstStreamMovementAt = reachedDestination;
    attempt.firstStreamMovementMatchedBy = 'destination';
  }
}

async function attemptRequest<T extends SustainedAttempt>(
  player: SustainedPlayer,
  path: string,
  authority: Authority,
  body: object,
  attempt: T,
  end: number,
  onDispatch?: () => void,
): Promise<ApiResult | undefined> {
  try {
    const response = await request<ApiResult>(player, path, {
      authority,
      body,
      onResponse(status) {
        attempt.status = status;
      },
      async publication(start) {
        // Admit transport at the cutoff without cancelling requests already sent.
        const at = now();
        if (stoppedAt !== undefined) throw new NetworkError('cancelled', 'connect');
        if (at >= end) throw new NetworkError('deadline_exceeded', 'connect');
        const result = start();
        attempt.sent = true;
        attempt.at = at;
        onDispatch?.();
        return { result };
      },
    });
    attempt.code = response.result.code;
    attempt.ok = response.status < 300 && response.result.ok === true;
    return response.result;
  } catch (error) {
    if (error instanceof NetworkError) attempt.status ??= error.status;
    attempt.error = error instanceof Error ? error.message : String(error);
  } finally {
    attempt.completedAt = now();
  }
}

async function connectPlayer(player: SustainedPlayer, index: number) {
  const initial = await request<GameView>(player, '/api/state');
  assert.equal(initial.status, 200);
  const authority = authorityFor(initial.result, player);
  const selected = await request<ApiResult>(player, '/api/embodiment', {
    authority,
    body: {
      id: randomUUID(),
      operation: 'replace',
      expectedGeneration: authority.access.controlGeneration,
    },
  });
  assert(selected.status === 200 && selected.result.ok, 'Control refused: ' + player.actorId);
  const controlled = await request<GameView>(player, '/api/state');
  assert.equal(controlled.status, 200);
  const binding = authorityFor(controlled.result, player);
  const epoch = controlled.result.commandEpoch;
  assert(binding.access.controlling && epoch, 'Control missing: ' + player.actorId);
  const heartbeat = await request<ApiResult>(player, '/api/presence', {
    authority: binding,
    body: { clientId: player.clientId, visible: true, sequence: 1 },
  });
  assert(heartbeat.status === 200 && heartbeat.result.ok, 'Presence refused: ' + player.actorId);

  const commands: SustainedMove[] = [];
  const presence: SustainedAttempt[] = [];
  const lateness: ScheduleObservation[] = [];
  let latest: GameView['player'] = controlled.result.player;
  let streamObservedPositionChange = false;
  let measuredPatchFrames = 0;
  let playerSeen = false;
  let movement: PendingMovement | undefined;
  let finishing = false;
  const stream = await connectPlayerStream({
    root: settings.root,
    base: settings.base,
    cookie: player.cookie,
    clientId: player.clientId,
    scope: binding.scope,
    now,
    maxActions: 2048,
    timeoutMs: 30_000,
    onView(view, receipt) {
      assert(
        view.access?.actorId === player.actorId && view.access.controlling,
        'The signed stream must stay on its controlling player.',
      );
      const at = receipt.receivedAtMs;
      const subject = view.player;
      if (index === 0) observeClock(view.clock, at);
      if (
        phase &&
        at >= phase.start &&
        at < Math.min(phase.end, stoppedAt ?? Infinity) &&
        receipt.frame === 'patch'
      )
        measuredPatchFrames++;
      if (playerSeen && !streamObservedPositionChange && changed(latest.position, subject.position))
        streamObservedPositionChange = true;
      playerSeen = true;
      latest = subject;
      if (!movement || !phase || at >= Math.min(phase.end, stoppedAt ?? Infinity)) return;
      const { attempt } = movement;
      if (
        !attempt.sent ||
        attempt.firstStreamMovementAt !== undefined ||
        at < attempt.at ||
        !changed(attempt.before, subject.position)
      )
        return;
      const actionId = subject.action?.id;
      const reachedDestination =
        !attempt.beforeActionId && distance(attempt.target, subject.position) < 0.01;
      if (movement.awaitingReply) {
        if (actionId && actionId !== attempt.beforeActionId) {
          const candidates = (movement.positionsByAction ??= new Map());
          if (!candidates.has(actionId)) candidates.set(actionId, at);
        }
        if (reachedDestination) movement.reachedDestination ??= at;
      } else if (attempt.ok) {
        const newAction =
          actionId && actionId === attempt.actionId && actionId !== attempt.beforeActionId;
        if (newAction || reachedDestination) {
          attempt.firstStreamMovementAt = at;
          attempt.firstStreamMovementMatchedBy = newAction ? 'action-id' : 'destination';
        }
      }
    },
  });
  void stream.closed.then((streamClose) => {
    if (streamClose.reason === 'failure' && !finishing) {
      send({ streamFailure: { pocket: index, error: streamClose.error, streamClose } });
      stop();
    }
  });

  async function offer(
    window: SustainedStart,
    kind: ScheduleObservation['kind'],
    interval: number,
    offset: number,
    run: (slot: number, at: number) => Promise<SustainedAttempt>,
  ) {
    let slot = 0;
    const scheduled = () => window.began + offset + slot * interval;
    function record(disposition: ScheduleObservation['disposition'], at: number) {
      const observation = { kind, slot, scheduledAt: scheduled(), at, disposition };
      lateness.push(observation);
      slot++;
      return observation;
    }
    // One in-flight request per kind and player, on an absolute schedule.
    // Missed slots stay visible and never turn into a burst of overdue requests.
    while (stoppedAt === undefined && scheduled() < window.end) {
      await waitUntil(scheduled());
      const at = now();
      if (stoppedAt !== undefined || at >= window.end) break;
      while (scheduled() + interval <= at) record('late-skipped', at);
      const observation = record('offered', at);
      if ((await run(observation.slot, observation.scheduledAt)).error !== undefined)
        observation.disposition = 'failed';
      const completed = Math.min(now(), window.end, stoppedAt ?? Infinity);
      while (scheduled() < completed) record('late-skipped', completed);
    }
    const cutoff = Math.min(stoppedAt ?? Infinity, window.end);
    while (scheduled() < window.end)
      record(scheduled() < cutoff ? 'late-skipped' : 'stopped-skipped', cutoff);
  }

  function newAttempt(slot: number, scheduledAt: number): SustainedAttempt {
    const at = now();
    return { slot, scheduledAt, at, completedAt: at, sent: false, ok: false };
  }

  return {
    epoch,
    run: (window: SustainedStart) =>
      Promise.all([
        offer(window, 'presence', 5000, (index * 137) % 5000, async (slot, scheduledAt) => {
          const attempt = newAttempt(slot, scheduledAt);
          presence.push(attempt);
          await attemptRequest(
            player,
            '/api/presence',
            binding,
            { clientId: player.clientId, visible: true, sequence: slot + 2 },
            attempt,
            window.end,
          );
          return attempt;
        }),
        offer(
          window,
          'movement',
          movementIntervalMs,
          movementOffsetMs(index),
          async (slot, scheduledAt) => {
            const target = player.destinations[slot % player.destinations.length];
            assert(target, 'Each controlled player needs an authored route.');
            const attempt: SustainedMove = {
              ...newAttempt(slot, scheduledAt),
              commandId: randomUUID(),
              target,
              before: latest.position,
            };
            commands.push(attempt);
            const current: PendingMovement = { attempt, awaitingReply: true };
            const response = await attemptRequest(
              player,
              '/api/command',
              binding,
              {
                commandId: attempt.commandId,
                commandEpoch: epoch,
                command: { type: 'move', position: target },
              },
              attempt,
              window.end,
              () => {
                // A request refused before dispatch cannot end the previous
                // action's window for observing movement.
                movement = current;
                attempt.before = latest.position;
                attempt.beforeActionId = latest.action?.id;
              },
            );
            current.awaitingReply = false;
            attempt.actionId = response?.actionId;
            matchMovement(current);
            // Any subsequent frame needs only the acknowledged action ID or destination.
            current.positionsByAction = undefined;
            return attempt;
          },
        ),
      ]),
    async close(): Promise<SustainedPlayerResult> {
      finishing = true;
      return {
        actorId: player.actorId,
        commands,
        presence,
        lateness,
        measuredPatchFrames,
        streamObservedPositionChange,
        stream: { ...stream.stats(), close: await stream.disconnect() },
      };
    },
  };
}

const players: Awaited<ReturnType<typeof connectPlayer>>[] = [];
let finished = false;
try {
  // Take control and open that player's stream before joining the next tab.
  // A lease with no attached stream can expire during a large sequential setup.
  for (const [index, player] of settings.players.entries()) {
    stopSignal.signal.throwIfAborted();
    players.push(await connectPlayer(player, index));
  }
  const go = receive('go');
  send({ ready: true, commandEpochs: players.map(({ epoch }) => epoch) });
  const window = (phase = await go);
  assert(
    window.began < window.start && window.start < window.end && now() < window.began,
    'The workload needs armed monotonic phase boundaries.',
  );
  nextClockBoundary = window.start;

  async function reachEnd() {
    await waitUntil(window.end);
    const cutoff = Math.min(stoppedAt ?? Infinity, window.end);
    const sampled = settings.measuring ? receive('finalResourceCutTaken') : undefined;
    send({ offeredEnd: { offeredAtUnixMs: cutoff, observedAtUnixMs: now() } });
    await sampled;
    return cutoff;
  }
  const [cutoff] = await Promise.all([reachEnd(), ...players.map((player) => player.run(window))]);
  completeClock(cutoff, window);
  finished = true;
} finally {
  try {
    const pockets = await Promise.all(players.map((player) => player.close()));
    if (finished)
      await new Promise<void>((resolve, reject) => {
        const message: SustainedClientMessage = { result: { pockets, clock } };
        ipc(message, (error) => (error ? reject(error) : resolve()));
      });
  } finally {
    stopHttp();
    if (process.connected) process.disconnect();
  }
}
