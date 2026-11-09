import type {
  MeasurementOutcome,
  MeasurementSink,
} from '@open-legend/domain/diagnostic-measurements';

/** Storage for a campaign belongs only to performance.ts' existing Capture.
 * This helper has no singleton, service, export I/O or gameplay inputs. Its
 * optional drain owns one deadline timer, outside measured work.
 * docs/performance/hierarchical-profiling.md#4-instrumentation-with-bounded-disturbance */
export type CampaignMeasurementKind =
  | 'sync'
  | 'active-segments'
  | 'async-latency'
  | 'queue-wait'
  | 'counter'
  | 'gauge'
  | 'sampled-cpu';
export interface CampaignMeasurementDefinition {
  scope: number;
  id: string;
  parent?: string;
  label?: string;
  kind: CampaignMeasurementKind;
  unit: string;
  dimensions?: readonly string[];
  shared?: boolean;
}
export interface CampaignWindow {
  startMs: number;
  endMs: number;
  drainUntilMs: number;
}
export interface CampaignDrainResult {
  status: 'drained' | 'deadline' | 'failed' | 'stopped';
  pendingAtStart: number;
  pendingAtEnd: number;
  deadlineMs: number;
  endedAtMs: number;
}
export interface CampaignCaptureOptions {
  captureId?: string;
  definitions: readonly CampaignMeasurementDefinition[];
  selectedScopes: readonly number[];
  samplingProbability?: 1 | 0.125 | 0.015625;
  samplingSeed?: number;
  window?: CampaignWindow;
  sql?: boolean;
  /** Optional correlated trace, separate from the 8 MiB aggregate allowance. */
  traceBytes?: number;
  isolate?: string;
}
const slots = 4096;
const maximumSeries = 32;
const aggregateLimitBytes = 8 * 1024 * 1024;
const maximumTraceBytes = 64 * 1024 * 1024;
const traceColumns = 7;
const outcomes: readonly MeasurementOutcome[] = [
  'success',
  'refused',
  'error',
  'cancelled',
  'timeout',
  'stale',
];
// Global generations fence numerical tokens across stopped/restarted captures.
let nextGeneration = 1;
let bounds: number[] | undefined;
function histogramBounds(): number[] {
  if (bounds) return bounds;
  bounds = [];
  for (let upper = 0.001; upper < 3_600_000; upper *= 1.01) bounds.push(upper);
  bounds.push(3_600_000);
  return bounds;
}

interface Distribution {
  bins: Float64Array;
  count: number;
  sum: number;
  min: number;
  max: number;
}
function distribution(): Distribution {
  return {
    bins: new Float64Array(histogramBounds().length + 1),
    count: 0,
    sum: 0,
    min: Infinity,
    max: -Infinity,
  };
}
function add(value: Distribution, milliseconds: number): void {
  const bounds = histogramBounds();
  let low = 0,
    high = bounds.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (milliseconds <= bounds[mid]!) high = mid;
    else low = mid + 1;
  }
  value.bins[low] = value.bins[low]! + 1;
  value.count++;
  value.sum += milliseconds;
  value.min = Math.min(value.min, milliseconds);
  value.max = Math.max(value.max, milliseconds);
}
function quantile(value: Distribution, fraction: number) {
  const bounds = histogramBounds();
  if (!value.count) return null;
  const target = Math.ceil(value.count * fraction);
  let total = 0;
  for (let index = 0; index < value.bins.length; index++) {
    total += value.bins[index]!;
    if (total < target) continue;
    return {
      lowerMs: index ? bounds[index - 1]! : 0,
      upperMs: bounds[index] ?? null,
      estimateMs: bounds[index] ?? null,
      overflow: index === bounds.length,
      belowClockFloor: index === 0,
    };
  }
  return null;
}
function describe(value: Distribution) {
  const bounds = histogramBounds();
  return {
    count: value.count,
    totalMs: value.sum,
    meanMs: value.count ? value.sum / value.count : null,
    minMs: value.count ? value.min : null,
    maxMs: value.count ? value.max : null,
    p50: quantile(value, 0.5),
    p95: quantile(value, 0.95),
    p99: quantile(value, 0.99),
    provisionalP95: value.count < 100,
    provisionalP99: value.count < 1000,
    histogram: {
      counts: [...value.bins],
      upperBoundsMs: [...bounds],
      overflow: value.bins.at(-1)!,
    },
  };
}
interface Series {
  definition: CampaignMeasurementDefinition;
  eligible: number;
  timed: number;
  completed: number;
  failed: number;
  carryIn: number;
  carryInUnfinishedAtCutoff: number;
  carryInCompletedInDrain: number;
  carryInCensored: number;
  unfinishedAtCutoff: number;
  completedInDrain: number;
  censored: number;
  omitted: number;
  units: number;
  windowActiveMs: number;
  windowExclusiveMs: number;
  outcomes: Float64Array;
  work: Float64Array;
  startedWork: Float64Array;
  censoredLowerBounds: number[];
  omittedCensoredBounds: number;
  active: Distribution;
  latency: Distribution;
  exclusive: Distribution;
}

/** One capture-local bounded numerical token table. Public methods never throw
 * after construction; an observer fault detaches only measurement. */
export class CampaignMeasurements implements MeasurementSink {
  readonly sql: boolean;
  readonly selectedScopeCount: number;
  private alive = true;
  private window?: CampaignWindow;
  private readonly series = new Map<number, Series>();
  private readonly definitions = new Map<number, CampaignMeasurementDefinition>();
  private readonly namedScopes = new Map<string, number>();
  private readonly tokens = new Float64Array(slots);
  private readonly starts = new Float64Array(slots);
  private readonly segmentStarts = new Float64Array(slots);
  private readonly activeMs = new Float64Array(slots);
  private readonly childMs = new Float64Array(slots);
  private readonly childWindowMs = new Float64Array(slots);
  private readonly exclusiveMs = new Float64Array(slots);
  private readonly unitCounts = new Float64Array(slots);
  private readonly parents = new Float64Array(slots);
  private readonly scopeIds = new Float64Array(slots);
  private readonly active = new Uint8Array(slots);
  private readonly occupied = new Uint8Array(slots);
  private readonly stack = new Int32Array(slots);
  private readonly free = new Int32Array(slots);
  private freeCount = slots;
  private depth = 0;
  private seed: number;
  private readonly probability: number;
  private readonly trace: Float64Array;
  private traceCount = 0;
  private traceOmitted = 0;
  private tokenOmitted = 0;
  private readonly failures: string[] = [];
  private omittedFailures = 0;
  private stoppedAt?: number;
  private lastAt = 0;
  private detach?: () => void;
  private drainState?: {
    pending: Set<number>;
    pendingAtStart: number;
    deadlineMs: number;
    finished: boolean;
    resolve: (result: CampaignDrainResult) => void;
    timer?: ReturnType<typeof setTimeout>;
  };
  private drainPromise?: Promise<CampaignDrainResult>;
  private readonly isolate: string;
  private readonly configuration: Omit<
    CampaignCaptureOptions,
    'definitions' | 'selectedScopes' | 'window'
  >;

  constructor(options: CampaignCaptureOptions) {
    const bounds = histogramBounds();
    this.sql = options.sql ?? false;
    this.selectedScopeCount = options.selectedScopes.length;
    this.configuration = {
      captureId: options.captureId,
      samplingProbability: options.samplingProbability,
      samplingSeed: options.samplingSeed,
      sql: options.sql,
      traceBytes: options.traceBytes,
      isolate: options.isolate,
    };
    this.isolate = options.isolate ?? 'main';
    this.seed = (options.samplingSeed ?? 1) >>> 0 || 1;
    this.probability = options.samplingProbability ?? 1;
    if (![1, 0.125, 0.015625].includes(this.probability))
      throw new Error('Invalid measurement sampling probability.');
    if (options.definitions.length > 4096)
      throw new Error('Measurement definition allowance exceeded.');
    const identifiers = new Set<string>();
    for (const original of options.definitions) {
      const definition = {
        ...original,
        dimensions: original.dimensions ? [...original.dimensions] : undefined,
      };
      if (
        !Number.isSafeInteger(definition.scope) ||
        definition.scope <= 0 ||
        this.definitions.has(definition.scope) ||
        identifiers.has(definition.id)
      )
        throw new Error('Measurement scopes must be unique positive integers.');
      if ((definition.dimensions?.length ?? 0) > 32)
        throw new Error('Measurement dimension allowance exceeded.');
      this.definitions.set(definition.scope, definition);
      identifiers.add(definition.id);
    }
    if (
      new Set(options.selectedScopes).size !== options.selectedScopes.length ||
      options.selectedScopes.length > maximumSeries
    )
      throw new Error('Split measurement selections exceeding 32 series.');
    for (const scope of options.selectedScopes) {
      const definition = this.definitions.get(scope);
      if (!definition) throw new Error('Selected measurement scope has no definition.');
      this.series.set(scope, {
        definition,
        eligible: 0,
        timed: 0,
        completed: 0,
        failed: 0,
        carryIn: 0,
        carryInUnfinishedAtCutoff: 0,
        carryInCompletedInDrain: 0,
        carryInCensored: 0,
        unfinishedAtCutoff: 0,
        completedInDrain: 0,
        censored: 0,
        omitted: 0,
        units: 0,
        windowActiveMs: 0,
        windowExclusiveMs: 0,
        outcomes: new Float64Array(outcomes.length),
        work: new Float64Array(Math.max(1, definition.dimensions?.length ?? 0)),
        startedWork: new Float64Array(Math.max(1, definition.dimensions?.length ?? 0)),
        censoredLowerBounds: [],
        omittedCensoredBounds: 0,
        active: distribution(),
        latency: distribution(),
        exclusive: distribution(),
      });
      this.namedScopes.set(definition.id, scope);
    }
    const aggregateBytes =
      slots * (10 * 8 + 2 + 2 * 4) +
      this.series.size * (3 * (bounds.length + 1) * 8 + (outcomes.length + 32) * 8);
    if (aggregateBytes > aggregateLimitBytes)
      throw new Error('Measurement aggregate memory allowance exceeded.');
    const traceBytes = options.traceBytes ?? 0;
    if (!Number.isSafeInteger(traceBytes) || traceBytes < 0 || traceBytes > maximumTraceBytes)
      throw new Error('Invalid measurement trace allowance.');
    this.trace = new Float64Array(Math.floor(traceBytes / (traceColumns * 8)) * traceColumns);
    for (let index = 0; index < slots; index++) this.free[index] = slots - index - 1;
    if (options.window) this.setWindow(options.window);
  }
  bindDetach(detach: () => void): void {
    this.detach = detach;
  }
  selected(scope: number): boolean {
    return this.alive && this.series.has(scope);
  }
  get enabled(): boolean {
    return this.alive;
  }
  workerConfiguration(): CampaignCaptureOptions {
    return {
      ...this.configuration,
      definitions: [...this.definitions.values()].map((definition) => ({
        ...definition,
        dimensions: definition.dimensions ? [...definition.dimensions] : undefined,
      })),
      selectedScopes: [...this.series.keys()],
      window: this.window ? { ...this.window } : undefined,
    };
  }
  scope(id: string): number {
    return this.alive ? (this.namedScopes.get(id) ?? 0) : 0;
  }
  beginNamed(id: string, units = 1, parent = 0): number {
    const scope = this.scope(id);
    return scope ? this.begin(scope, units, parent) : 0;
  }
  setWindow(window: CampaignWindow): void {
    if (this.window) throw new Error('The capture window is already fixed.');
    if (
      !Number.isFinite(window.startMs) ||
      !(window.endMs > window.startMs) ||
      !(window.drainUntilMs >= window.endMs) ||
      this.lastAt > window.startMs
    )
      throw new Error('Invalid campaign window.');
    this.window = { ...window };
  }
  /** A fixed-work barrier may set an initially open end before results export. */
  cutoff(endMs: number, drainUntilMs: number): void {
    if (
      !this.window ||
      this.window.endMs !== Infinity ||
      !Number.isFinite(endMs) ||
      endMs < this.window.startMs ||
      drainUntilMs < endMs ||
      this.lastAt > endMs
    ) {
      this.fail('Invalid fixed-work measurement cutoff.');
      return;
    }
    this.window.endMs = endMs;
    this.window.drainUntilMs = drainUntilMs;
  }
  private fail(reason: string): void {
    if (this.failures.length < 16) this.failures.push(reason);
    else this.omittedFailures++;
    this.alive = false;
    this.stoppedAt ??= this.lastAt;
    this.finishDrain('failed');
    const detach = this.detach;
    this.detach = undefined;
    try {
      detach?.();
    } catch {
      if (this.failures.length < 16)
        this.failures.push('Measurement cleanup could not detach an optional probe.');
      else this.omittedFailures++;
    }
  }
  private now(): number {
    const now = performance.now();
    if (!Number.isFinite(now)) this.fail('Non-finite measurement clock.');
    else if (now < this.lastAt) this.fail('Measurement clock moved backwards.');
    else this.lastAt = now;
    return now;
  }
  /** At cutoff, take one bounded census of outstanding selected operations.
   * Their ordinary end notices release this waiter; no recurring scan or IPC is
   * added to the measured operation. Carry-in tokens retain their own accounting. */
  drain(deadlineMs = this.window?.drainUntilMs): Promise<CampaignDrainResult> {
    if (this.drainPromise) return this.drainPromise;
    const now = this.now();
    if (
      !this.window ||
      !Number.isFinite(this.window.endMs) ||
      now < this.window.endMs ||
      deadlineMs === undefined ||
      !Number.isFinite(deadlineMs) ||
      deadlineMs < this.window.endMs ||
      deadlineMs > this.window.drainUntilMs
    )
      throw new Error('Drain requires a completed measurement window and its admitted deadline.');
    const pending = new Set<number>();
    for (let slot = 0; slot < slots; slot++)
      if (this.occupied[slot]) pending.add(this.tokens[slot]!);
    this.drainPromise = new Promise<CampaignDrainResult>((resolve) => {
      this.drainState = {
        pending,
        pendingAtStart: pending.size,
        deadlineMs,
        finished: false,
        resolve,
      };
      if (!this.alive) this.finishDrain(this.failures.length ? 'failed' : 'stopped');
      else if (!pending.size) this.finishDrain('drained');
      else if (now >= deadlineMs) this.finishDrain('deadline');
      else {
        const checkDeadline = () => {
          const state = this.drainState;
          if (!state || state.finished) return;
          const remaining = state.deadlineMs - this.now();
          if (state.finished) return;
          if (remaining <= 0) {
            this.finishDrain('deadline');
            return;
          }
          // Host timers can wake before a fractional monotonic deadline.
          // Keep one timer armed; an early callback does not censor work yet.
          state.timer = setTimeout(checkDeadline, Math.max(1, Math.ceil(remaining)));
          state.timer.unref();
        };
        checkDeadline();
      }
    });
    return this.drainPromise;
  }
  private finishDrain(status: CampaignDrainResult['status']): void {
    const state = this.drainState;
    if (!state || state.finished) return;
    state.finished = true;
    if (state.timer) clearTimeout(state.timer);
    const pendingAtEnd = state.pending.size;
    state.pending.clear();
    state.resolve({
      status,
      pendingAtStart: state.pendingAtStart,
      pendingAtEnd,
      deadlineMs: state.deadlineMs,
      endedAtMs: performance.now(),
    });
  }
  private inside(at: number): boolean {
    return !!this.window && at >= this.window.startMs && at < this.window.endMs;
  }
  windowStarted(at: number): boolean {
    return !!this.window && at >= this.window.startMs;
  }
  withinWindow(at: number): boolean {
    return this.inside(at);
  }
  withinDrain(at: number): boolean {
    return !!this.window && at <= this.window.drainUntilMs;
  }
  clipInterval(start: number, end: number): number {
    return this.clipped(start, end);
  }
  private clipped(start: number, end: number): number {
    const window = this.window;
    return window ? Math.max(0, Math.min(end, window.endMs) - Math.max(start, window.startMs)) : 0;
  }
  private event(kind: number, slot: number, at: number, outcome = 0): void {
    const offset = this.traceCount * traceColumns;
    if (offset + traceColumns > this.trace.length) {
      if (this.trace.length) this.traceOmitted++;
      return;
    }
    this.trace[offset] = kind;
    this.trace[offset + 1] = this.tokens[slot]!;
    this.trace[offset + 2] = this.scopeIds[slot]!;
    this.trace[offset + 3] = this.parents[slot]!;
    this.trace[offset + 4] = at;
    this.trace[offset + 5] = outcome;
    this.trace[offset + 6] = this.unitCounts[slot]!;
    this.traceCount++;
  }
  private slot(token: number): number {
    const slot = token % slots;
    return this.occupied[slot] && this.tokens[slot] === token ? slot : -1;
  }
  begin(scope: number, units: number, parent: number): number {
    if (!this.alive) return 0;
    const series = this.series.get(scope);
    if (!series) return 0;
    const now = this.now();
    if (!this.alive || (this.window && now >= this.window.endMs)) return 0;
    if (!Number.isFinite(units) || units < 0 || units > Number.MAX_SAFE_INTEGER) {
      this.fail('Invalid measurement unit count.');
      return 0;
    }
    if (this.inside(now)) {
      if (series.eligible >= Number.MAX_SAFE_INTEGER) {
        this.fail('Measurement count precision exhausted.');
        return 0;
      }
      series.eligible++;
    }
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >>> 17;
    this.seed ^= this.seed << 5;
    if ((this.seed >>> 0) / 0x100000000 >= this.probability) return 0;
    if (!this.freeCount) {
      this.tokenOmitted++;
      series.omitted++;
      return 0;
    }
    if (nextGeneration > Math.floor(Number.MAX_SAFE_INTEGER / slots) - 1) {
      this.fail('Measurement token precision exhausted.');
      return 0;
    }
    const slot = this.free[--this.freeCount]!;
    const token = nextGeneration++ * slots + slot;
    this.tokens[slot] = token;
    this.occupied[slot] = 1;
    this.starts[slot] = now;
    this.segmentStarts[slot] = now;
    this.activeMs[slot] = 0;
    this.childMs[slot] = 0;
    this.childWindowMs[slot] = 0;
    this.exclusiveMs[slot] = 0;
    this.scopeIds[slot] = scope;
    this.unitCounts[slot] = units;
    this.parents[slot] = parent || (this.depth ? this.tokens[this.stack[this.depth - 1]!]! : 0);
    this.active[slot] =
      series.definition.kind === 'sync' || series.definition.kind === 'active-segments' ? 1 : 0;
    if (this.active[slot]) this.stack[this.depth++] = slot;
    if (this.inside(now)) {
      series.timed++;
      series.units += units;
      if (series.units > Number.MAX_SAFE_INTEGER) {
        this.fail('Measurement unit precision exhausted.');
        return 0;
      }
    }
    this.event(1, slot, now);
    return token;
  }
  private closeSegment(slot: number, now: number): void {
    if (this.stack[this.depth - 1] !== slot) {
      this.fail('Unbalanced active measurement scopes.');
      return;
    }
    const start = this.segmentStarts[slot]!;
    if (now < start) {
      this.fail('Measurement clock moved backwards.');
      return;
    }
    const elapsed = now - start;
    const exclusive = Math.max(0, elapsed - this.childMs[slot]!);
    const clipped = this.clipped(start, now);
    const series = this.series.get(this.scopeIds[slot]!)!;
    this.activeMs[slot] = this.activeMs[slot]! + elapsed;
    this.exclusiveMs[slot] = this.exclusiveMs[slot]! + exclusive;
    series.windowActiveMs += clipped;
    // Child windows are accumulated independently; the residual remains gross
    // elapsed minus same-stack child elapsed, never an async CPU attribution.
    series.windowExclusiveMs += Math.max(0, clipped - this.childWindowMs[slot]!);
    this.childMs[slot] = 0;
    this.childWindowMs[slot] = 0;
    this.active[slot] = 0;
    this.depth--;
    if (this.depth) {
      const parent = this.stack[this.depth - 1]!;
      this.childMs[parent] = this.childMs[parent]! + elapsed;
      this.childWindowMs[parent] = this.childWindowMs[parent]! + clipped;
    }
  }
  pause(token: number): void {
    if (!this.alive) return;
    const slot = this.slot(token);
    if (slot < 0) return;
    const kind = this.series.get(this.scopeIds[slot]!)!.definition.kind;
    if (kind !== 'sync' && kind !== 'active-segments') return;
    if (!this.active[slot]) {
      this.fail('Measurement scope was paused twice.');
      return;
    }
    const now = this.now();
    if (!this.alive) return;
    if (now < this.starts[slot]!) {
      this.fail('Measurement clock moved backwards.');
      return;
    }
    this.closeSegment(slot, now);
    this.event(2, slot, now);
  }
  resume(token: number, ifPaused: boolean): void {
    if (!this.alive) return;
    const slot = this.slot(token);
    if (slot < 0) return;
    const kind = this.series.get(this.scopeIds[slot]!)!.definition.kind;
    if (kind !== 'sync' && kind !== 'active-segments') return;
    if (this.active[slot]) {
      if (!ifPaused) this.fail('Measurement scope was resumed twice.');
      return;
    }
    const now = this.now();
    if (!this.alive) return;
    this.segmentStarts[slot] = now;
    this.active[slot] = 1;
    this.stack[this.depth++] = slot;
    this.event(3, slot, now);
  }
  end(token: number, outcome: MeasurementOutcome): void {
    if (!this.alive) return;
    const slot = this.slot(token);
    if (slot < 0) return;
    const now = this.now();
    if (!this.alive) return;
    if (now < this.starts[slot]!) {
      this.fail('Measurement clock moved backwards.');
      return;
    }
    if (this.active[slot]) this.closeSegment(slot, now);
    if (!this.alive) return;
    const series = this.series.get(this.scopeIds[slot]!)!;
    const start = this.starts[slot]!;
    const window = this.window;
    if (window && start < window.startMs && now >= window.startMs) {
      series.carryIn++;
      if (now >= window.endMs) series.carryInUnfinishedAtCutoff++;
      if (now >= window.endMs && now <= window.drainUntilMs) series.carryInCompletedInDrain++;
      if (now > window.drainUntilMs) series.carryInCensored++;
    }
    if (this.inside(start)) {
      if (now >= window!.endMs) series.unfinishedAtCutoff++;
      if (now > window!.drainUntilMs) {
        series.censored++;
        if (series.censoredLowerBounds.length < 32)
          series.censoredLowerBounds.push(window!.drainUntilMs - start);
        else series.omittedCensoredBounds++;
      } else {
        series.completed++;
        const outcomeIndex = outcomes.indexOf(outcome);
        if (outcomeIndex < 0) {
          this.fail('Unknown measurement outcome.');
          return;
        }
        series.outcomes[outcomeIndex] = series.outcomes[outcomeIndex]! + 1;
        if (outcome !== 'success') series.failed++;
        if (now >= window!.endMs) series.completedInDrain++;
        add(series.latency, now - start);
        if (series.definition.kind === 'sync' || series.definition.kind === 'active-segments') {
          add(series.active, this.activeMs[slot]!);
          add(series.exclusive, this.exclusiveMs[slot]!);
        }
      }
    }
    this.event(4, slot, now, outcomes.indexOf(outcome));
    this.occupied[slot] = 0;
    this.tokens[slot] = 0;
    this.free[this.freeCount++] = slot;
    if (this.drainState?.pending.delete(token) && !this.drainState.pending.size)
      this.finishDrain(now <= this.drainState.deadlineMs ? 'drained' : 'deadline');
  }
  count(scope: number, amount: number, dimension: number): void {
    if (!this.alive) return;
    const series = this.series.get(scope);
    if (!series || !this.inside(this.now())) return;
    if (
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(dimension) ||
      dimension < 0 ||
      dimension >= series.work.length
    ) {
      this.fail('Invalid measurement work notice.');
      return;
    }
    const value = series.work[dimension]! + amount;
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      this.fail('Measurement count precision exhausted.');
      return;
    }
    series.work[dimension] = value;
    if (series.definition.kind === 'counter' || series.definition.kind === 'gauge') {
      if (series.eligible >= Number.MAX_SAFE_INTEGER) {
        this.fail('Measurement count precision exhausted.');
        return;
      }
      series.eligible++;
      if (series.definition.kind === 'gauge') series.work[dimension] = amount;
    }
  }
  work(token: number, amount: number, dimension: number): void {
    if (!this.alive) return;
    const slot = this.slot(token);
    if (slot < 0) return;
    const series = this.series.get(this.scopeIds[slot]!)!;
    const now = this.now();
    if (
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(dimension) ||
      dimension < 0 ||
      dimension >= series.work.length
    ) {
      this.fail('Invalid measurement work notice.');
      return;
    }
    if (this.inside(now)) series.work[dimension] = series.work[dimension]! + amount;
    if (this.inside(this.starts[slot]!) && now <= this.window!.drainUntilMs)
      series.startedWork[dimension] = series.startedWork[dimension]! + amount;
    if (
      Math.abs(series.work[dimension]!) > Number.MAX_SAFE_INTEGER ||
      Math.abs(series.startedWork[dimension]!) > Number.MAX_SAFE_INTEGER
    )
      this.fail('Measurement count precision exhausted.');
  }
  failure(): void {
    this.fail('A measurement sink callback failed.');
  }
  stop(): number {
    let discarded = 0;
    for (const value of this.occupied) discarded += value;
    if (this.stoppedAt === undefined) this.stoppedAt = performance.now();
    this.alive = false;
    this.finishDrain('stopped');
    const detach = this.detach;
    this.detach = undefined;
    try {
      detach?.();
    } catch {
      if (this.failures.length < 16)
        this.failures.push('Measurement cleanup could not detach an optional probe.');
      else this.omittedFailures++;
    }
    this.tokens.fill(0);
    this.occupied.fill(0);
    this.active.fill(0);
    this.depth = 0;
    this.series.clear();
    this.definitions.clear();
    this.namedScopes.clear();
    return discarded;
  }
  snapshot() {
    const now = this.stoppedAt ?? performance.now();
    const pending = new Map<
      number,
      {
        carry: number;
        carryCutoff: number;
        carryCensored: number;
        cutoff: number;
        censored: number;
        pending: number;
        lower: number[];
        activeMs: number;
        exclusiveMs: number;
      }
    >();
    for (let slot = 0; slot < slots; slot++) {
      if (!this.occupied[slot] || !this.window) continue;
      const scope = this.scopeIds[slot]!;
      const entry = pending.get(scope) ?? {
        carry: 0,
        carryCutoff: 0,
        carryCensored: 0,
        cutoff: 0,
        censored: 0,
        pending: 0,
        lower: [],
        activeMs: 0,
        exclusiveMs: 0,
      };
      if (this.starts[slot]! < this.window.startMs && now >= this.window.startMs) {
        entry.carry++;
        if (now >= this.window.endMs) entry.carryCutoff++;
        if (this.stoppedAt !== undefined || now >= this.window.drainUntilMs) entry.carryCensored++;
      }
      if (this.inside(this.starts[slot]!)) {
        if (now >= this.window.endMs) entry.cutoff++;
        entry.pending++;
        if (this.stoppedAt !== undefined || now >= this.window.drainUntilMs) entry.censored++;
        if (entry.lower.length < 32)
          entry.lower.push(
            Math.max(0, Math.min(now, this.window.drainUntilMs) - this.starts[slot]!),
          );
      }
      pending.set(scope, entry);
    }
    for (let index = 0; index < this.depth; index++) {
      const slot = this.stack[index]!;
      const entry = pending.get(this.scopeIds[slot]!);
      if (!entry) continue;
      const elapsed = this.clipped(this.segmentStarts[slot]!, now);
      const child =
        index + 1 < this.depth ? this.clipped(this.segmentStarts[this.stack[index + 1]!]!, now) : 0;
      entry.activeMs += elapsed;
      entry.exclusiveMs += Math.max(0, elapsed - this.childWindowMs[slot]! - child);
    }
    return {
      isolate: this.isolate,
      captureId: this.configuration.captureId ?? null,
      clock: { kind: 'monotonic-performance', timeOriginUnixMs: performance.timeOrigin },
      active: this.alive,
      window: this.window ? { ...this.window } : null,
      samplingProbability: this.probability,
      bounds: {
        aggregateBytes: aggregateLimitBytes,
        timingSeries: maximumSeries,
        tokens: slots,
        traceBytes: this.trace.byteLength,
      },
      failures: [...this.failures],
      omittedFailures: this.omittedFailures,
      omittedTokens: this.tokenOmitted,
      trace: {
        columns: ['kind', 'token', 'scope', 'parent', 'atMs', 'outcome', 'units'],
        values: [...this.trace.subarray(0, this.traceCount * traceColumns)],
        omitted: this.traceOmitted,
      },
      metrics: [...this.definitions.values()].map((definition) => {
        const series = this.series.get(definition.scope);
        if (!series)
          return {
            ...definition,
            status: ['disabled'],
            reason: 'Not selected in this capture.',
            latency: null,
            active: null,
          };
        const waiting = pending.get(definition.scope);
        const censored = series.censored + (waiting?.censored ?? 0);
        const status = [
          ...(this.failures.length ? ['failed'] : []),
          ...(censored ? ['censored'] : []),
          ...(series.omitted ? ['failed'] : []),
          this.probability < 1
            ? 'sampled'
            : series.eligible || series.windowActiveMs || waiting?.activeMs
              ? 'measured'
              : 'not-exercised',
          'unqualified-overhead',
        ];
        return {
          ...definition,
          status,
          reason: !this.window
            ? 'Measurement window was not established.'
            : series.eligible
              ? null
              : 'No eligible invocation was observed.',
          eligible: series.eligible,
          timed: series.timed,
          completed: series.completed,
          failed: series.failed,
          carryIn: series.carryIn + (waiting?.carry ?? 0),
          carryInUnfinishedAtCutoff: series.carryInUnfinishedAtCutoff + (waiting?.carryCutoff ?? 0),
          carryInCompletedInDrain: series.carryInCompletedInDrain,
          carryInCensored: series.carryInCensored + (waiting?.carryCensored ?? 0),
          unfinishedAtCutoff: series.unfinishedAtCutoff + (waiting?.cutoff ?? 0),
          completedInDrain: series.completedInDrain,
          censored,
          omitted: series.omitted,
          unfinishedAtSnapshot: waiting?.pending ?? 0,
          lowerBoundLatenciesMs: [...series.censoredLowerBounds, ...(waiting?.lower ?? [])],
          omittedCensoredBounds: series.omittedCensoredBounds,
          units: series.units,
          windowActivity: {
            activeMs: series.windowActiveMs + (waiting?.activeMs ?? 0),
            derivedExclusiveResidualMs: series.windowExclusiveMs + (waiting?.exclusiveMs ?? 0),
          },
          outcomes: Object.fromEntries(
            outcomes.map((outcome, index) => [outcome, series.outcomes[index]!]),
          ),
          work: [...series.work],
          startedOperationWork: [...series.startedWork],
          workDimensions: definition.dimensions ?? [],
          workSampling:
            this.probability < 1
              ? 'Only timed invocations contribute token-bound work; eligible calls are counted separately.'
              : 'Exact observed notices; completion-known work stays with its operation.',
          active: describe(series.active),
          latency: describe(series.latency),
          derivedExclusiveResidual: describe(series.exclusive),
          estimatedLatencyTotalMs:
            this.probability < 1 && series.latency.count
              ? (series.eligible * series.latency.sum) / series.latency.count
              : null,
          observedTailComplete:
            !censored &&
            !waiting?.pending &&
            !series.omitted &&
            !this.failures.length &&
            series.latency.bins.at(-1) === 0,
          tailQualified: false,
          qualificationReason:
            'Overhead qualification belongs to matched collected comparisons, not this capture.',
          sharedNote: definition.shared
            ? 'Measured shared scope; divide by completed recipients only as an amortized cost, never a recipient percentile.'
            : null,
          overlapNote:
            'Latency and active/residual durations are distinct; nested and asynchronous latencies overlap. Residual includes probe overhead.',
        };
      }),
    };
  }
}
