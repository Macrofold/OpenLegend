import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { advanceWorldWork, type WorldState } from '@open-legend/domain';
import { countMetric, recordDuration } from './performance.js';

/** The caller retains the existing mutation lane until the whole candidate commits.
 * Yielding serves I/O against the previous snapshot, never partially observed world state.
 * docs/architecture.md#cooperative-native-burst-handling
 */
export async function advanceNativeStep(world: WorldState) {
  if (!Object.isFrozen(world))
    throw new Error('Cooperative native work requires an owned frozen snapshot.');
  const work = advanceWorldWork(world, 1);
  const started = performance.now();
  let sliceStarted = started;
  let cpuMs = 0;
  let yields = 0;
  let maxSliceMs = 0;
  let completed = false;
  try {
    while (true) {
      const result = work.next();
      const now = performance.now();
      const sliceMs = now - sliceStarted;
      if (result.done || sliceMs >= 8) {
        cpuMs += sliceMs;
        maxSliceMs = Math.max(maxSliceMs, sliceMs);
        recordDuration('native.slice', sliceMs);
        if (result.done) {
          completed = true;
          recordDuration('native.stepWall', now - started);
          countMetric('native.cooperativeYields', yields);
          return { transition: result.value, cpuMs, yields, maxSliceMs };
        }
        yields++;
        await yieldToEventLoop();
        sliceStarted = performance.now();
      }
    }
  } finally {
    // Discard an unfinished private candidate; no partial events or effects escape.
    if (!completed) work.return(undefined as never);
  }
}
