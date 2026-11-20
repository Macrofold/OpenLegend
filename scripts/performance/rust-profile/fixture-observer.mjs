import assert from 'node:assert/strict';
import { createNetworkOwner, requestBytes } from '@open-legend/network';
import { once } from 'node:events';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

const at = () => performance.timeOrigin + performance.now();
const prefix = 'OpenLegend profile ';

export function connectObserver(server) {
  // Only the opted-in child has an open input pipe. Neither gameplay nor
  // another case can select probes through its ordinary HTTP routes.
  const pending = new Map();
  const lines = createInterface({ input: server.stdout });
  let failure;
  function fail(error) {
    failure ??= error;
    for (const response of pending.values()) response.reject(failure);
  }
  lines.on('line', (line) => {
    if (!line.startsWith(prefix)) return;
    try {
      const reply = JSON.parse(line.slice(prefix.length));
      if (reply.type === 'error') throw new Error('The Rust recorder refused a control message.');
      pending.get(reply.type === 'pong' ? `pong:${reply.id}` : reply.type)?.resolve(reply);
    } catch (error) {
      fail(error);
    }
  });
  server.stdin.on('error', fail);
  lines.on('close', () => fail(new Error('The Rust recorder closed its response channel.')));
  async function send(message, expect) {
    if (failure) throw failure;
    assert(!pending.has(expect));
    const waiter = Promise.withResolvers();
    pending.set(expect, waiter);
    let timeout;
    try {
      const answer = Promise.race([
        waiter.promise,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`The Rust recorder did not return ${expect}.`)),
            3000,
          );
        }),
      ]);
      server.stdin.write(JSON.stringify(message) + '\n');
      return await answer;
    } finally {
      clearTimeout(timeout);
      pending.delete(expect);
    }
  }
  return {
    async arm(plan) {
      const clocks = [];
      for (let id = 0; id < 4; id++) {
        const sentAt = at();
        const reply = await send({ type: 'ping', id }, `pong:${id}`);
        const receivedAt = at();
        assert(Number.isSafeInteger(reply.nowNs) && reply.nowNs >= 0);
        clocks.push({ sentAt, receivedAt, serverNowNs: reply.nowNs });
      }
      const width = (sample) => sample.receivedAt - sample.sentAt;
      const clock = clocks.reduce((best, sample) => (width(sample) < width(best) ? sample : best));
      // Keep epoch milliseconds on the Node side. Send elapsed nanoseconds
      // relative to the receiver's monotonic epoch, within JSON's integer range.
      const began = Math.ceil(at()) + 1000;
      const startAt = began + plan.warmupSeconds * 1000;
      const endAt = startAt + plan.measureSeconds * 1000;
      const drainAt = endAt + plan.drainSeconds * 1000;
      const instant = (time) =>
        clock.serverNowNs + Math.round((time - (clock.sentAt + clock.receivedAt) / 2) * 1e6);
      const bounds = {
        startNs: instant(startAt),
        endNs: instant(endAt),
        drainNs: instant(drainAt),
      };
      assert(Object.values(bounds).every(Number.isSafeInteger));
      const armed = await send(
        {
          type: 'arm',
          sites: plan.probeIds,
          ...bounds,
          seed: plan.seed,
          every: 1 / plan.samplingProbability,
          traceBytes: 8 * 1024 ** 2,
        },
        'armed',
      );
      assert(at() < began, 'Profiler arming missed the shared input start.');
      return {
        began,
        startAt,
        endAt,
        drainAt,
        generation: armed.generation,
        mappingUncertaintyMs: width(clock) / 2,
        ...bounds,
      };
    },
    async stop(window, artifact) {
      // The server keeps the ordinary clock and saves running while drain
      // finishes. Its monotonic cutoff governs eligible completions.
      await delay(Math.max(0, window.drainAt + window.mappingUncertaintyMs - at()));
      const stopped = await send({ type: 'stop' }, 'stopped');
      assert.equal(stopped.generation, window.generation);
      assert.equal(stopped.complete, true);
      const written = await lstat(artifact);
      assert(written.isFile() && written.size > 0, 'Missing recorder output.');
      server.stdin.end();
      return stopped;
    },
  };
}

export async function captureAddressMap(server, directory) {
  await writeFile(
    join(directory, 'memory-map.txt'),
    await readFile('/proc/' + server.pid + '/maps'),
    {
      mode: 0o600,
    },
  );
}

/** Cold gameplay read after the measured process and its observer exit.
 * Keep the original authenticated session in memory because receipt recovery
 * is bound to that session. Obtain a fresh permitted scope from the reopened server.
 */
export async function coldContinuation({
  start,
  cookie,
  clientId,
  actorId,
  acceptedGameSecond,
  commandEpoch,
  lastCommand,
}) {
  assert(cookie, 'The fixture has no original authenticated session for recovery.');
  const child = start();
  const network = createNetworkOwner({ role: 'rust-profile-cold-caller', capacity: 1 });
  const spawnedAt = at();
  const exited = once(child, 'close');
  exited.catch(() => {});
  let stdout = '';
  try {
    const found = Promise.withResolvers();
    child.stdout.on('data', (bytes) => {
      stdout = (stdout + bytes.toString()).slice(-8192);
      const address = /OpenLegend listening on (127\.0\.0\.1:\d+)\n/.exec(stdout)?.[1];
      if (address) found.resolve('http://' + address);
    });
    const timer = setTimeout(
      () => found.reject(new Error('The cold server did not listen.')),
      60_000,
    );
    const base = await Promise.race([
      found.promise,
      exited.then(() => {
        throw new Error('The cold server exited before listening.');
      }),
    ]).finally(() => clearTimeout(timer));
    const request = (path, init, bodyPolicy) =>
      network.run({ timeoutMs: 10_000 }, (operation) =>
        requestBytes(operation, { url: base + path, init, bodyPolicy }),
      );
    const state = await request(
      '/api/state',
      {
        headers: { Cookie: cookie, 'X-OL-Client': clientId },
      },
      { kind: 'complete-projection', owner: 'browser-api' },
    );
    assert.equal(state.status, 200);
    const view = JSON.parse(Buffer.from(state.bytes).toString());
    assert.equal(view.access?.actorId, actorId);
    assert(Object.values(view.player?.position ?? {}).length >= 3);
    const viewedAt = at();
    assert(
      Number.isFinite(view.clock?.seconds) && view.clock.seconds >= acceptedGameSecond,
      'The reopened world predates the observed accepted cut.',
    );
    assert(lastCommand?.ok && lastCommand.actionId);
    const receipt = await request(
      '/api/command/receipt',
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: base,
          'X-OL-Client': clientId,
          'X-OL-Scope': view.access.scope,
          'X-OL-Generation': view.historyEpoch.split(':')[0],
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commandId: lastCommand.commandId,
          commandEpoch,
          command: { type: 'move', position: lastCommand.target },
        }),
      },
      { kind: 'complete-projection', owner: 'browser-api' },
    );
    assert.equal(receipt.status, 200, 'The reopened server rejected the walk receipt request.');
    let recovered;
    try {
      recovered = JSON.parse(Buffer.from(receipt.bytes).toString());
    } catch {
      throw new Error('The reopened server did not return a valid walk receipt.');
    }
    const status = ['resolved', 'unavailable', 'expired', 'unknown'].includes(recovered?.status)
      ? recovered.status
      : 'invalid';
    assert(
      status === 'resolved' &&
        recovered.ok === true &&
        recovered.result?.actionId === lastCommand.actionId,
      `The reopened server could not return the exact saved walk receipt (${status}).`,
    );
    return {
      verified: true,
      receiptRecovered: true,
      receiptStatus: status,
      spawnedAt,
      viewedAt,
      wallMs: viewedAt - spawnedAt,
    };
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    const force = setTimeout(() => child.kill('SIGKILL'), 30_000);
    try {
      const [networkClosed, exit] = await Promise.allSettled([
        network.shutdown({ timeoutMs: 2000 }),
        exited,
      ]);
      if (exit.status === 'rejected') throw exit.reason;
      if (networkClosed.status === 'rejected') throw networkClosed.reason;
      assert.equal(networkClosed.value.unresolved, 0);
      assert.deepEqual(exit.value, [0, null], 'The restarted server did not close cleanly.');
    } finally {
      clearTimeout(force);
    }
  }
}
