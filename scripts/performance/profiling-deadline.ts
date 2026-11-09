import { setTimeout as delay } from 'node:timers/promises';

/** A profiling batch has several cases but the managed owner has one job
 * deadline. Bound each disposable case so a hung owner cannot consume its
 * siblings' allowance. The supervisor remains the process/resource owner. */
export function installProfilingDeadline(seconds: number, emergency: () => Promise<void>) {
  if (!Number.isFinite(seconds) || seconds < 60)
    throw Error('A finite profiling case allowance is required.');
  const abort = new AbortController();
  const soft = setTimeout(() => abort.abort(), (seconds - 30) * 1000);
  const hard = setTimeout(
    () => {
      abort.abort();
      void Promise.race([emergency().catch(() => {}), delay(5000)]).finally(() => process.exit(1));
    },
    (seconds - 5) * 1000,
  );
  return {
    signal: abort.signal,
    stop() {
      clearTimeout(soft);
      clearTimeout(hard);
    },
  };
}
