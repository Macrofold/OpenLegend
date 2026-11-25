// Bound active work and retain every failure; a failed item never leaves siblings unobserved.
export async function mapBounded(values, concurrency, work) {
  const results = new Array(values.length),
    failures = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= values.length) return;
        try {
          results[index] = await work(values[index], index);
        } catch (error) {
          failures.push(error);
        }
      }
    }),
  );
  if (failures.length === 1) throw failures[0];
  if (failures.length)
    throw new AggregateError(
      failures,
      `${failures.length} worker operations failed: ${failures[0].message}`,
    );
  return results;
}
