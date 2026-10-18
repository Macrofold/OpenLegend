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
    if (key !== message.key || message.map) {
      planner?.destroy();
      planner = undefined;
      key = message.key;
      if (!message.map) throw new Error('Navigation geometry is not prepared.');
      planner = new RecastPlanner(message.map, { profiling });
      if (timing) timing.prepareMapMs = planner.prepareMapMs;
      if (message.request) planner.prepare(message.request.body, 'map');
      else if (message.warmBody) {
        try {
          planner.prepare(message.warmBody, 'map');
        } catch {
          // This speculative build cannot deny a later real request or hide its own failure.
          if (timing) timing.warmupFailed = true;
        }
      }
    }
    if (!planner) throw new Error('Navigation is unavailable.');
    if (message.request) {
      const start = profiling ? performance.now() : undefined;
      reply.result = planner.route(message.request);
      if (timing && start !== undefined) timing.queryMs = performance.now() - start;
    }
  } catch {
    reply.error = 'Navigation preparation failed.';
    reply.result = { status: 'unavailable', path: [] };
  }
  if (timing) {
    timing.builds = planner?.takeBuilds() ?? [];
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
