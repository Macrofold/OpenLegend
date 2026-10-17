import type { JsonValue } from '../../packages/ai/src/index.js';
import { grade } from './evaluate.js';
import type { BenchmarkScene } from './types.js';

function numbers(value: JsonValue): number {
  if (typeof value === 'number') return 1;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + numbers(v), 0);
  if (value && typeof value === 'object')
    return Object.values(value).reduce<number>((n, v) => n + numbers(v), 0);
  return 0;
}
const quantile = (values: number[], fraction: number) =>
  [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * fraction) - 1)] ?? 0;
/** Diagnostics expose shortcuts; they are not model predictions or external validation. */
export function auditCorpus(corpus: BenchmarkScene[]) {
  const cases = corpus.flatMap((s) => s.cases);
  const long = corpus.flatMap((s) =>
    s.cases
      .filter((t) => t.question.type === 'choice')
      .map((t) => {
        if (t.question.type !== 'choice' || t.gold.type !== 'choice')
          throw new Error('Mismatched choice');
        const keys = Object.keys(t.question.criteria).sort();
        const selected = keys.reduce(
          (a, b) =>
            t.question.type === 'choice' &&
            t.question.criteria[b]!.length > t.question.criteria[a]!.length
              ? b
              : a,
          keys[0]!,
        );
        return {
          pass: t.gold.accepted.includes(selected),
          ties: keys.filter(
            (k) =>
              t.question.type === 'choice' &&
              t.question.criteria[k]!.length === t.question.criteria[selected]!.length,
          ).length,
        };
      }),
  );
  const shortcut = corpus.flatMap((s) =>
    s.cases.map((t) => {
      if (t.question.type === 'choice') {
        const q = t.question;
        const keys = Object.keys(q.criteria).sort();
        const selected = keys.reduce(
          (a, b) => (q.criteria[b]!.length > q.criteria[a]!.length ? b : a),
          keys[0]!,
        );
        return grade(s, t, {
          type: 'choice',
          choice: selected,
          probabilities: Object.fromEntries(keys.map((k) => [k, Number(k === selected)])),
        });
      }
      return grade(
        s,
        t,
        t.question.type === 'noul'
          ? { type: 'noul', noul: 0 }
          : { type: 'score', score: 0, legend: {}, probabilities: {} },
      );
    }),
  );
  const memories = corpus.map((s) => (Array.isArray(s.state.recall) ? s.state.recall.length : 0));
  const bytes = corpus.map((s) => Buffer.byteLength(JSON.stringify(s.state)));
  return {
    scenes: corpus.length,
    questions: cases.length,
    independentEpisodeGroups: new Set(corpus.map((s) => s.group?.episodeId ?? s.id)).size,
    types: Object.fromEntries(
      ['choice', 'noul', 'score'].map((type) => [
        type,
        cases.filter((t) => t.question.type === type).length,
      ]),
    ),
    scopes: Object.fromEntries(
      ['current-contract', 'selected-design', 'hypothetical-world'].map((scope) => [
        scope,
        corpus.filter((s) => s.scope === scope).length,
      ]),
    ),
    recallEntries: {
      total: memories.reduce((n, v) => n + v, 0),
      median: quantile(memories, 0.5),
      max: Math.max(...memories),
    },
    stateBytes: {
      median: quantile(bytes, 0.5),
      p90: quantile(bytes, 0.9),
      max: Math.max(...bytes),
    },
    numericValues: corpus.reduce((n, s) => n + numbers(s.state), 0),
    twentyMeterScenes: corpus.filter((s) => s.group?.meters === 20).length,
    structuredSelectionQuestions: corpus.reduce(
      (n, s) => n + Object.keys(s.outputs ?? {}).length,
      0,
    ),
    ambiguity: Object.fromEntries(
      ['unambiguous', 'multiple-valid', 'insufficient-evidence'].map((kind) => [
        kind,
        cases.filter((t) => t.ambiguity === kind).length,
      ]),
    ),
    longestDescription: {
      passed: long.filter((r) => r.pass).length,
      total: long.length,
      tiedMaximum: long.filter((r) => r.ties > 1).length,
    },
    noContextHeuristic: {
      description:
        'Longest choice description (semantic key order breaks ties), Noul 0, Score 0. Diagnostic only; no model call.',
      passed: shortcut.filter((r) => r.pass).length,
      total: shortcut.length,
      accuracy: shortcut.filter((r) => r.pass).length / shortcut.length,
    },
    alwaysFalseNoul: {
      passed: cases.filter((t) => t.gold.type === 'noul' && t.gold.min === 0).length,
      total: cases.filter((t) => t.gold.type === 'noul').length,
    },
    splitGroups: Object.fromEntries(
      ['development', 'challenge', 'holdout'].map((split) => [
        split,
        new Set(corpus.filter((s) => s.group?.split === split).map((s) => s.group!.episodeId)).size,
      ]),
    ),
    limitations: [
      'Authored synthetic labels are not independently human-validated.',
      'Related views are correlated; episode counts, not question instances, describe independent coverage.',
      'Twenty supplied trackers do not mean all twenty are decisive in every decision.',
      'Bytes are not tokens; provider capacity and effective use of long recall require live measurements.',
      'Free text requires separate human review; fixtures cannot establish model quality.',
    ],
  };
}
