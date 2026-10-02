import { parentPort } from 'node:worker_threads';
import { RecastPlanner, initializeNavigationRuntime } from './backend.js';
import type { NavigationMessage, NavigationReply } from './messages.js';
if (!parentPort) throw new Error('Navigation requires a worker thread.');
await initializeNavigationRuntime();
// From the bootstrap's first statement through loader and runtime initialization.
let startupMs: number | undefined =
  performance.now() -
  ((globalThis as { navigationWorkerStartedAt?: number }).navigationWorkerStartedAt ?? 0);
let planner: RecastPlanner | undefined,
  key = '';
parentPort.on('message', (message: NavigationMessage) => {
  const reply: NavigationReply = { id: message.id, key: message.key, buildMs: 0, queryMs: 0 };
  const timing: NonNullable<NavigationReply['timing']> = { builds: [] };
  if (startupMs !== undefined) {
    timing.startupMs = startupMs;
    startupMs = undefined;
  }
  try {
    if (key !== message.key || message.map) {
      planner?.destroy();
      planner = undefined;
      key = message.key;
      if (!message.map) throw new Error('Navigation geometry is not prepared.');
      planner = new RecastPlanner(message.map);
      timing.prepareMapMs = planner.prepareMapMs;
      planner.prepare(message.request?.body, 'map');
    }
    if (!planner) throw new Error('Navigation is unavailable.');
    if (message.request) {
      const start = performance.now();
      reply.result = planner.route(message.request);
      reply.queryMs = performance.now() - start;
    }
  } catch {
    reply.error = 'Navigation preparation failed.';
    reply.result = { status: 'unavailable', path: [] };
  }
  timing.builds = planner?.takeBuilds() ?? [];
  // First-use profile builds happen inside route(); attribute them to construction.
  reply.buildMs = timing.builds.reduce((total, build) => total + build.ms, 0);
  reply.queryMs = Math.max(
    0,
    reply.queryMs -
      timing.builds.filter((b) => b.reason === 'first-use').reduce((t, b) => t + b.ms, 0),
  );
  reply.timing = timing;
  parentPort!.postMessage(reply);
});
