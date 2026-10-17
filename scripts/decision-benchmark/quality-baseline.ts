import type { QualityOption } from './quality-types.js';
import type { BenchmarkCase, BenchmarkScene } from './types.js';
import { actionChoiceQuality } from './quality-baseline-actions.js';
import { memoryChoiceQuality } from './quality-baseline-memory.js';
import { worldChoiceQuality } from './quality-baseline-worlds.js';

/** Explicit author judgments about semantic offers, never model-visible input. */
export type BaselineQualityRows = Record<
  string,
  Record<
    string,
    readonly [points: number, concern: NonNullable<QualityOption['concern']>, reason: string]
  >
>;

const annotations: BaselineQualityRows = {
  ...actionChoiceQuality,
  ...memoryChoiceQuality,
  ...worldChoiceQuality,
};

export function baselineChoiceQuality(
  scene: BenchmarkScene,
  test: BenchmarkCase,
): Record<string, QualityOption> | undefined {
  if (test.question.type !== 'choice' || test.gold.type !== 'choice') return undefined;
  const rows = annotations[test.id];
  if (!rows) return undefined;
  const accepted = new Set(test.gold.accepted);
  return Object.fromEntries(
    Object.keys(test.question.criteria).map((key) => {
      if (accepted.has(key)) return [key, { points: 100, reason: test.rationale }];
      const row = rows[key];
      if (!row)
        throw new Error(`Missing baseline quality annotation: ${scene.id}/${test.id}/${key}`);
      const [points, concern, reason] = row;
      return [key, { points, concern, reason }];
    }),
  );
}
