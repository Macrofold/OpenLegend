const ACTIVE_READS = 4;
const WAITING_READS = 32;

/** One document-scoped lane for the lab's mounted read owners. Two inspectors,
 * current values and a modal otherwise exceed the browser's shared read owner
 * during replacement. Commands and the single changes reader never enter it.
 * docs/limits/cognition-lab.md#cll09 */
export function createLabReadAdmission() {
  let active = 0;
  const waiting = new Set<() => void>();
  const drain = () => {
    while (active < ACTIVE_READS && waiting.size) {
      const next = waiting.values().next().value!;
      waiting.delete(next);
      next();
    }
  };
  return function admit<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cancel = () => {
        waiting.delete(start);
        signal.removeEventListener('abort', cancel);
        reject(signal.reason ?? new DOMException('The read was cancelled.', 'AbortError'));
      };
      const start = () => {
        signal.removeEventListener('abort', cancel);
        active++;
        void Promise.resolve()
          .then(() => {
            signal.throwIfAborted();
            return work();
          })
          .then(resolve, reject)
          .finally(() => {
            active--;
            drain();
          });
      };
      if (signal.aborted) return cancel();
      if (waiting.size >= WAITING_READS)
        return reject(new Error('Too many lab views are waiting. Close a view and refresh.'));
      signal.addEventListener('abort', cancel, { once: true });
      waiting.add(start);
      drain();
    });
  };
}
