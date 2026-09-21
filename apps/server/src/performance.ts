/** Bounded, value-free local attribution; never writes measured spans to the database. */
const samples = new Map<string, { count: number; values: number[]; next: number }>();
export function recordDuration(stage: string, milliseconds: number): void {
  let sample = samples.get(stage);
  if (!sample) {
    if (samples.size >= 32) return;
    samples.set(stage, (sample = { count: 0, values: [], next: 0 }));
  }
  sample.count++;
  sample.values[sample.next] = milliseconds;
  sample.next = (sample.next + 1) % 256;
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
  return Object.fromEntries(
    [...samples].map(([stage, sample]) => {
      const sorted = [...sample.values].sort((a, b) => a - b);
      const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
      return [
        stage,
        {
          count: sample.count,
          retained: sorted.length,
          p50: percentile(0.5),
          p95: percentile(0.95),
          p99: percentile(0.99),
          recentMs: [...sample.values],
        },
      ];
    }),
  );
}
