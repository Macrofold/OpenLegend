import { parentPort, workerData } from 'node:worker_threads';
import { RecastPlanner, initializeNavigationRuntime } from './backend.js';
import type { NavigationMessage, NavigationReply } from './messages.js';
if (!parentPort) throw new Error('Navigation requires a worker thread.');
const { profiling } = workerData as { profiling: boolean };
await initializeNavigationRuntime();
// From the bootstrap's first statement through loader and runtime initialization.
let startupMs: number | undefined = profiling
  ? performance.now() -
    ((globalThis as { navigationWorkerStartedAt?: number }).navigationWorkerStartedAt ?? 0)
  : undefined;
let planner: RecastPlanner | undefined,
  key = '';
parentPort.on('message', (message: NavigationMessage) => {
  const reply: NavigationReply = { id: message.id, key: message.key };
  const timing: NavigationReply['timing'] = profiling
    ? { builds: [], buildMs: 0, queryMs: 0 }
    : undefined;
  if (timing && startupMs !== undefined) {
    timing.startupMs = startupMs;
    startupMs = undefined;
  }
  try {
    if (message.variants) {
      if (
        message.request ||
        message.requests ||
        message.warmBody ||
        !message.variants.length ||
        message.variants.length > 64 ||
        message.variants.some((group) => !group.requests.length) ||
        message.variants.reduce((count, group) => count + group.requests.length, 0) > 64
      )
        throw new Error('Invalid complete navigation alternatives.');
      reply.results = [];
      // One planner at a time, under the coordinator's one batch deadline and
      // memory limit. A private opened-gate cut never replaces gameplay geometry.
      for (const group of message.variants) {
        planner?.destroy();
        planner = undefined;
        key = '';
        planner = new RecastPlanner(group.map, { profiling });
        if (timing) timing.prepareMapMs = (timing.prepareMapMs ?? 0) + (planner.prepareMapMs ?? 0);
        planner.prepare(group.requests[0]!.body, 'map');
        const start = profiling ? performance.now() : undefined;
        reply.results.push(...group.requests.map((request) => planner!.route(request)));
        if (timing && start !== undefined) {
          timing.queryMs += performance.now() - start;
          timing.builds.push(...(planner.takeBuilds() ?? []));
        }
      }
      planner?.destroy();
      planner = undefined;
    } else {
      if (
        message.requests &&
        (message.request || !message.requests.length || message.requests.length > 64)
      )
        throw new Error('Invalid complete navigation batch.');
      if (key !== message.key || message.map) {
        planner?.destroy();
        planner = undefined;
        key = message.key;
        if (!message.map) throw new Error('Navigation geometry is not prepared.');
        planner = new RecastPlanner(message.map, { profiling });
        if (timing) timing.prepareMapMs = planner.prepareMapMs;
        if (message.request ?? message.requests?.[0])
          planner.prepare((message.request ?? message.requests![0]!).body, 'map');
      }
      if (!planner) throw new Error('Navigation is unavailable.');
      if (message.warmBody) {
        try {
          planner.prepare(message.warmBody, 'map');
        } catch {
          if (timing) timing.warmupFailed = true;
        }
      }
      if (message.request) {
        const start = profiling ? performance.now() : undefined;
        reply.result = planner.route(message.request);
        if (timing && start !== undefined) timing.queryMs = performance.now() - start;
      }
      if (message.requests) {
        const start = profiling ? performance.now() : undefined;
        reply.results = message.requests.map((request) => planner!.route(request));
        if (timing && start !== undefined) timing.queryMs = performance.now() - start;
      }
    }
  } catch {
    reply.error = 'Navigation preparation failed.';
    reply.result = { status: 'unavailable', path: [] };
    const requests = message.variants?.flatMap((group) => group.requests) ?? message.requests;
    if (requests) reply.results = requests.map(() => ({ status: 'unavailable', path: [] }));
  }
  if (timing) {
    timing.builds.push(...(planner?.takeBuilds() ?? []));
    // First-use profile builds happen inside route(); attribute them to construction.
    timing.buildMs = timing.builds.reduce((total, build) => total + build.ms, 0);
    timing.queryMs = Math.max(
      0,
      timing.queryMs -
        timing.builds.filter((b) => b.reason === 'first-use').reduce((t, b) => t + b.ms, 0),
    );
    reply.timing = timing;
  }
  parentPort!.postMessage(reply);
});
