import { parentPort } from 'node:worker_threads';
import { RecastPlanner, initializeNavigationRuntime } from './backend.js';
import type { NavigationMessage, NavigationReply } from './messages.js';
if (!parentPort) throw new Error('Navigation requires a worker thread.');
await initializeNavigationRuntime();
let planner: RecastPlanner | undefined,
  key = '';
parentPort.on('message', (message: NavigationMessage) => {
  let buildMs = 0,
    queryMs = 0;
  const reply: NavigationReply = { id: message.id, key: message.key, buildMs, queryMs };
  try {
    if (key !== message.key || message.map) {
      planner?.destroy();
      planner = undefined;
      key = message.key;
      if (!message.map) throw new Error('Navigation geometry is not prepared.');
      const started = performance.now();
      planner = new RecastPlanner(message.map);
      planner.prepare(message.request?.body);
      buildMs = performance.now() - started;
    }
    if (!planner) throw new Error('Navigation is unavailable.');
    if (message.request) {
      const start = performance.now();
      reply.result = planner.route(message.request);
      queryMs = performance.now() - start;
    }
  } catch {
    reply.error = 'Navigation preparation failed.';
    reply.result = { status: 'unavailable', path: [] };
  }
  reply.buildMs = buildMs;
  reply.queryMs = queryMs;
  parentPort!.postMessage(reply);
});
