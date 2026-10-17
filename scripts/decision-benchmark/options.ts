import { createHash } from 'node:crypto';
import type { JudgmentAnswer } from '../../packages/ai/src/index.js';
import type { BenchmarkCase, BenchmarkScene } from './types.js';

/** Re-keying survives the transport's canonical key sorting; object insertion order does not. */
export function choiceBindings(scene: BenchmarkScene, test: BenchmarkCase): Map<string, string> {
  if (test.question.type !== 'choice') return new Map();
  const seed =
    scene.group && ['order-control', 'reordered'].includes(scene.group.view)
      ? `${scene.group.episodeId}:memory-order:${scene.questionOrder ? scene.questionOrder.indexOf(test.id) : scene.cases.indexOf(test)}`
      : `${scene.id}:${test.id}`;
  const rank = (key: string) => createHash('sha256').update(`${seed}:${key}`).digest('hex');
  return new Map(
    Object.keys(test.question.criteria)
      .map((key) => ({ key, rank: rank(key) }))
      .sort((a, b) => a.rank.localeCompare(b.rank))
      .map(({ key }, index) => [`option_${String(index).padStart(3, '0')}`, key]),
  );
}

export function decodeAnswer(
  scene: BenchmarkScene,
  test: BenchmarkCase,
  answer?: JudgmentAnswer,
): JudgmentAnswer | undefined {
  if (answer?.type !== 'choice') return answer;
  const bindings = choiceBindings(scene, test);
  const wireKeys = [...bindings.keys()];
  const available = wireKeys.filter((k) => Number.isFinite(answer.probabilities[k]));
  const selected = available.length
    ? available.reduce(
        (best, k) => (answer.probabilities[k]! > answer.probabilities[best]! ? k : best),
        available[0]!,
      )
    : answer.choice;
  const key = bindings.get(selected);
  if (!key) return undefined;
  return {
    ...answer,
    choice: key,
    probabilities: Object.fromEntries(
      Object.entries(answer.probabilities).flatMap(([wire, value]) => {
        const semantic = bindings.get(wire);
        return semantic ? [[semantic, value]] : [];
      }),
    ),
  };
}
