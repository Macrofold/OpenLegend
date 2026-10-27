/** Existing private evidence envelope, also bounding retained study preparation before expansion. */
export const PRIVATE_BENCHMARK_EVIDENCE_BYTES = 20_000_000;

/** Pairwise comparisons are required output, so refuse a provably oversized matrix before
 * preparing it or funding its study. This is a byte envelope, not a fixed model-count limit. */
export function assertPairwiseReportFits(modelCount: number, encodedIdBytes = 0): void {
  const pairs = (modelCount * (modelCount - 1)) / 2;
  const rowBytes = Buffer.byteLength(
    JSON.stringify({
      first: '',
      second: '',
      commonAnswered: 0,
      firstPass: 0,
      secondPass: 0,
      bothPass: 0,
      firstOnly: 0,
      secondOnly: 0,
      bothFail: 0,
    }),
  );
  if (
    pairs * rowBytes + Math.max(0, pairs - 1) + encodedIdBytes * Math.max(0, modelCount - 1) + 2 >
    PRIVATE_BENCHMARK_EVIDENCE_BYTES
  )
    throw new Error('Required pairwise report exceeds the 20MB private evidence envelope.');
}
