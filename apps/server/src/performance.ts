import { monitorEventLoopDelay, PerformanceObserver } from 'node:perf_hooks';
/** Bounded, value-free local attribution; never writes measured spans to the database. */
const samples = new Map<
  string,
  { count: number; values: number[]; next: number; totalMs: number; maxMs: number }
>();
export function recordDuration(stage: string, milliseconds: number): void {
  let sample = samples.get(stage);
  if (!sample) {
    if (samples.size >= 64) return;
    samples.set(stage, (sample = { count: 0, values: [], next: 0, totalMs: 0, maxMs: 0 }));
  }
  sample.count++;
  sample.totalMs += milliseconds;
  sample.maxMs = Math.max(sample.maxMs, milliseconds);
  sample.values[sample.next] = milliseconds;
  sample.next = (sample.next + 1) % 256;
}
export function timedSync<T>(stage: string, operation: () => T): T {
  const started = performance.now();
  try {
    return operation();
  } finally {
    recordDuration(stage, performance.now() - started);
  }
}
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
export function countMetric(name: string, amount = 1): void {
  if (counters.has(name) || counters.size < 32)
    counters.set(name, (counters.get(name) ?? 0) + amount);
}
export function gaugeMetric(name: string, value: number): void {
  if (gauges.has(name) || gauges.size < 32) gauges.set(name, value);
}
/** Process attribution only; bounded local metrics (docs/architecture.md#performance-critical-path). */
export function startRuntimeMonitoring(): () => void {
  const delay = monitorEventLoopDelay({ resolution: 20 });
  delay.enable();
  const gc = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) recordDuration('gc.pause', entry.duration);
  });
  gc.observe({ entryTypes: ['gc'] });
  let lastCpu = process.cpuUsage();
  let lastAt = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    const cpu = process.cpuUsage();
    gaugeMetric(
      'process.cpuPercent',
      ((cpu.user - lastCpu.user + cpu.system - lastCpu.system) / 1000 / (now - lastAt)) * 100,
    );
    gaugeMetric('process.heapUsedBytes', process.memoryUsage().heapUsed);
    gaugeMetric('eventLoop.p95Ms', delay.count ? delay.percentile(95) / 1e6 : 0);
    gaugeMetric('eventLoop.maxMs', delay.count ? delay.max / 1e6 : 0);
    lastCpu = cpu;
    lastAt = now;
    delay.reset();
  }, 1000);
  timer.unref();
  return () => {
    clearInterval(timer);
    delay.disable();
    gc.disconnect();
  };
}
export async function timed<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    recordDuration(stage, performance.now() - started);
  }
}
export function performanceSnapshot() {
  return {
    runtime: {
      uptimeSeconds: process.uptime(),
      counters: Object.fromEntries(counters),
      gauges: Object.fromEntries(gauges),
    },
    ...Object.fromEntries(
      [...samples].map(([stage, sample]) => {
        const sorted = [...sample.values].sort((a, b) => a - b);
        const percentile = (p: number) =>
          sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
        return [
          stage,
          {
            count: sample.count,
            totalMs: sample.totalMs,
            maxMs: sample.maxMs,
            retained: sorted.length,
            p50: percentile(0.5),
            p95: percentile(0.95),
            p99: percentile(0.99),
            recentMs: [...sample.values],
          },
        ];
      }),
    ),
  };
}
