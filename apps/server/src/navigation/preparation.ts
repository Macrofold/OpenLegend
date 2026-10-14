import { Worker } from 'node:worker_threads';
import type { NavigationRequest, NavigationResult, SpatialMap } from '@open-legend/spatial';
import { OverloadError, WorkLane } from '../work-lane.js';
import { recordDuration } from '../performance.js';
import type { NavigationMessage, NavigationReply } from './messages.js';

// Explicit candidate preparation shares one bounded lane; live gameplay retains
// its existing coordinator. Limits match its 64-request/20-second/128-MiB work envelope.
const preparationLane = new WorkLane('navigation.preparation', 8);
const maximumRequests = 64;
const deadlineMs = 20_000;
let serial = 0;
const unavailable = (): NavigationResult => ({ status: 'unavailable', path: [] });

/** Isolated native preparation owns one worker per admitted batch, with no AI,
 * gameplay mutation or publication. Its caller fences the exact draft after awaiting.
 */
export async function prepareCandidateNavigation(
  map: SpatialMap,
  requests: ReadonlyArray<{ id: string; request: NavigationRequest }>,
): Promise<ReadonlyMap<string, NavigationResult>> {
  if (!requests.length) return new Map();
  const failed = () => new Map(requests.map(({ id }) => [id, unavailable()]));
  if (
    requests.length > maximumRequests ||
    new Set(requests.map(({ id }) => id)).size !== requests.length
  )
    return failed();
  try {
    return await preparationLane.run(async () => {
      const started = performance.now();
      const results = failed();
      const key = `candidate-preparation:${++serial}`;
      let worker: Worker | undefined;
      let outstanding: { id: number; resolve: (reply: NavigationReply | null) => void } | undefined;
      let failedWorker = false;
      let timer: NodeJS.Timeout | undefined;
      const fail = () => {
        failedWorker = true;
        const pending = outstanding;
        outstanding = undefined;
        pending?.resolve(null);
      };
      try {
        worker = new Worker(new URL('./worker.mjs', import.meta.url), {
          execArgv: [],
          env: {},
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        });
        worker.on('error', fail);
        worker.on('exit', fail);
        worker.on('message', (reply: NavigationReply) => {
          if (!outstanding || reply.id !== outstanding.id || reply.key !== key) return;
          const pending = outstanding;
          outstanding = undefined;
          pending.resolve(reply);
        });
        timer = setTimeout(fail, deadlineMs);
        for (let index = 0; index < requests.length && !failedWorker; index++) {
          const task = requests[index]!;
          const id = index + 1;
          const reply = await new Promise<NavigationReply | null>((resolve) => {
            outstanding = { id, resolve };
            const message: NavigationMessage = {
              id,
              key,
              ...(index === 0 ? { map } : {}),
              request: task.request,
            };
            try {
              worker!.postMessage(message);
            } catch {
              fail();
            }
          });
          if (!reply || reply.error || !reply.result) break;
          results.set(task.id, reply.result);
          recordDuration('navigation.preparation.query', reply.queryMs);
          recordDuration('navigation.preparation.build', reply.buildMs);
        }
      } catch {
        fail();
      } finally {
        clearTimeout(timer);
        outstanding = undefined;
        if (worker) await worker.terminate();
        recordDuration('navigation.preparation.batch', performance.now() - started);
      }
      return results;
    });
  } catch (error) {
    if (!(error instanceof OverloadError)) throw error;
    return failed();
  }
}
