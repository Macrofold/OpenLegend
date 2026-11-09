/** Optional synchronous observation only. This module owns no clock, buffer,
 * world reference or decision. The host's existing capture owns the sink.
 * docs/performance/hierarchical-profiling.md#4-instrumentation-with-bounded-disturbance */
export type MeasurementOutcome =
  | 'success'
  | 'refused'
  | 'error'
  | 'cancelled'
  | 'timeout'
  | 'stale';
export interface MeasurementSink {
  readonly selectedScopeCount: number;
  selected(scope: number): boolean;
  begin(scope: number, units: number, parent: number): number;
  pause(token: number): void;
  resume(token: number, ifPaused: boolean): void;
  end(token: number, outcome: MeasurementOutcome): void;
  count(scope: number, amount: number, dimension: number): void;
  work(token: number, amount: number, dimension: number): void;
  failure?(): void;
}
let sink: MeasurementSink | undefined;
function failed(value: MeasurementSink): void {
  if (sink === value) sink = undefined;
  try {
    value.failure?.();
  } catch {
    /* Observation cannot replace a gameplay result. */
  }
}

/** Only the current host owner can detach itself; an old cleanup cannot remove
 * a later capture. Installation is explicit and refuses simultaneous owners. */
export function installMeasurementSink(value: MeasurementSink): () => void {
  if (sink) throw new Error('A diagnostic measurement sink is already installed.');
  sink = value;
  return () => {
    if (sink === value) sink = undefined;
  };
}
export function measurementSelected(scope: number): boolean {
  const value = sink;
  if (!value) return false;
  try {
    return value.selected(scope);
  } catch {
    failed(value);
    return false;
  }
}
export function measurementsEnabled(): boolean {
  return sink !== undefined && sink.selectedScopeCount > 0;
}
export function beginMeasurement(scope: number, units = 1, parent = 0): number {
  const value = sink;
  if (!value) return 0;
  try {
    return value.begin(scope, units, parent);
  } catch {
    failed(value);
    return 0;
  }
}
export function pauseMeasurement(token: number): void {
  const value = sink;
  if (token && value)
    try {
      value.pause(token);
    } catch {
      failed(value);
    }
}
export function resumeMeasurement(token: number): void {
  const value = sink;
  if (token && value)
    try {
      value.resume(token, false);
    } catch {
      failed(value);
    }
}
export function resumeMeasurementIfPaused(token: number): void {
  const value = sink;
  if (token && value)
    try {
      value.resume(token, true);
    } catch {
      failed(value);
    }
}
export function endMeasurement(token: number, outcome: MeasurementOutcome = 'success'): void {
  const value = sink;
  if (token && value)
    try {
      value.end(token, outcome);
    } catch {
      failed(value);
    }
}
export function countMeasurement(scope: number, amount = 1, dimension = 0): void {
  const value = sink;
  if (value)
    try {
      value.count(scope, amount, dimension);
    } catch {
      failed(value);
    }
}
export function countMeasurementWork(token: number, amount = 1, dimension = 0): void {
  const value = sink;
  if (token && value)
    try {
      value.work(token, amount, dimension);
    } catch {
      failed(value);
    }
}
/** Preserve expression value and evaluation order around an actual await. */
export function pauseMeasurementValue<T>(token: number, value: T): T {
  pauseMeasurement(token);
  return value;
}
export function resumeMeasurementValue<T>(token: number, value: T): T {
  resumeMeasurementIfPaused(token);
  return value;
}
/** Bind only to source-known plain array outputs; no arbitrary result-property
 * inspection and no repeated enumeration of the returned collection. */
export function measurementOutputValue<T>(token: number, value: T): T {
  if (token && Array.isArray(value)) {
    countMeasurementWork(token, value.length, 2);
    if (!value.length) countMeasurementWork(token, 1, 5);
  }
  return value;
}
export type MeasurementResultKind = 'api-result' | 'transition' | 'boolean' | 'http-status';
/** Apply only at source-audited plain result owners. No arbitrary field walking
 * or private content is needed to distinguish an accepted action from refusal. */
export function measurementResultOutcome(
  value: unknown,
  kind: MeasurementResultKind,
  previous: MeasurementOutcome = 'success',
): MeasurementOutcome {
  try {
    if (kind === 'http-status')
      return typeof value === 'number'
        ? value >= 500
          ? 'error'
          : value >= 400
            ? 'refused'
            : 'success'
        : previous;
    const result =
      kind === 'transition'
        ? (value as { outcome?: { ok?: boolean; code?: string } } | null)?.outcome
        : (value as { ok?: boolean; code?: string } | null);
    const accepted = kind === 'boolean' ? value : result?.ok;
    if (accepted === true) return 'success';
    if (accepted !== false) return previous;
    const code = kind === 'boolean' ? undefined : result?.code;
    if (typeof code === 'string') {
      if (code === 'stale' || code.startsWith('stale-')) return 'stale';
      if (code === 'cancelled') return 'cancelled';
      if (code === 'timeout') return 'timeout';
    }
    return 'refused';
  } catch {
    const owner = sink;
    if (owner) failed(owner);
    return previous;
  }
}
/** Observe a native promise without replacing it or adding a rejection path to
 * gameplay. The derived observer promise always resolves; it is never awaited. */
export function observeMeasurementSettlement<T>(
  token: number,
  promise: Promise<T>,
  outcome: () => MeasurementOutcome,
  resultKind?: MeasurementResultKind,
): Promise<T> {
  if (!token) return promise;
  try {
    void promise.then(
      (result) => {
        try {
          const previous = outcome();
          endMeasurement(
            token,
            resultKind ? measurementResultOutcome(result, resultKind, previous) : previous,
          );
        } catch {
          const value = sink;
          if (value) failed(value);
        }
      },
      () => endMeasurement(token, 'error'),
    );
  } catch {
    const value = sink;
    if (value) failed(value);
  }
  return promise;
}

/** Finish an in-place async body without introducing another async function or
 * awaiting its returned value. These source-bound owners return ordinary values
 * or same-isolate native promises; probing an arbitrary thenable's `then` would
 * execute it a second time and is deliberately unsupported. */
export function finishMeasurementReturn(
  token: number,
  value: unknown,
  outcome: () => MeasurementOutcome,
  resultKind?: MeasurementResultKind,
): void {
  if (!token) return;
  try {
    if (value instanceof Promise) {
      observeMeasurementSettlement(token, value, outcome, resultKind);
      return;
    }
    const previous = outcome();
    endMeasurement(
      token,
      resultKind ? measurementResultOutcome(value, resultKind, previous) : previous,
    );
  } catch {
    const owner = sink;
    if (owner) failed(owner);
  }
}

/** Instrument a real delegated iterator without replacing its protocol. The
 * surrounding operation owns the token: a delegation may finish while its
 * caller continues, so this adapter never ends that operation. */
export function segmentMeasurementIterator<T, R, N>(
  token: number,
  iterable: Iterable<T, R, N>,
): Iterable<T, R, N> {
  if (!token) return iterable;
  const iterator = iterable[Symbol.iterator]();
  const next = iterator.next;
  const invoke = <Args extends unknown[]>(
    operation: (...args: Args) => IteratorResult<T, R>,
    args: Args,
  ) => {
    resumeMeasurementIfPaused(token);
    // Call the actual method with its original receiver and argument count.
    // A missing throw/return must remain missing to yield*'s own protocol.
    try {
      return Reflect.apply(operation, iterator, args);
    } finally {
      pauseMeasurement(token);
    }
  };
  const measured: IterableIterator<T, R, N> = {
    next: (...args: [] | [N]) => invoke(next, args),
    get return() {
      const operation = iterator.return;
      return operation == null ? undefined : (...args: [] | [R]) => invoke(operation, args);
    },
    get throw() {
      const operation = iterator.throw;
      return operation == null ? undefined : (...args: [] | [unknown]) => invoke(operation, args);
    },
    [Symbol.iterator]() {
      return this;
    },
  };
  return measured;
}

/** for-await's implicit await has no source AwaitExpression. Bracket only the
 * synchronous iterator invocation here; the injected body/loop-finally resumes
 * at the caller's actual continuation. Do not resume in a Promise callback. */
export function segmentMeasurementAsyncIterable<T, R = unknown, N = unknown>(
  token: number,
  iterable: AsyncIterable<T, R, N> | Iterable<T, R, N>,
): AsyncIterable<T, R, N> | Iterable<T, R, N> {
  if (!token) return iterable;
  const asynchronous = (iterable as AsyncIterable<T, R, N>)[Symbol.asyncIterator];
  if (asynchronous == null) return segmentMeasurementIterator(token, iterable as Iterable<T, R, N>);
  const iterator = Reflect.apply(asynchronous, iterable, []);
  const next = iterator.next;
  const invoke = <Args extends unknown[]>(
    operation: (...args: Args) => Promise<IteratorResult<T, R>>,
    args: Args,
  ) => {
    resumeMeasurementIfPaused(token);
    try {
      return Reflect.apply(operation, iterator, args);
    } finally {
      pauseMeasurement(token);
    }
  };
  return {
    [Symbol.asyncIterator]() {
      return {
        next: (...args: [] | [N]) => invoke(next, args),
        get return() {
          const operation = iterator.return;
          return operation == null
            ? undefined
            : (...args: [] | [R | PromiseLike<R>]) => invoke(operation, args);
        },
        get throw() {
          const operation = iterator.throw;
          return operation == null
            ? undefined
            : (...args: [] | [unknown]) => invoke(operation, args);
        },
      };
    },
  };
}

/** Existing source counters already computed this amount. Forward it once,
 * retaining its value for the original counter and avoiding a second scan. */
export function measurementWorkValue<T extends number>(
  token: number,
  value: T,
  dimension: number,
): T {
  countMeasurementWork(token, value, dimension);
  return value;
}
