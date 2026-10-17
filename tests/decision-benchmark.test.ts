import { describe, expect, it } from 'vitest';
import { actionScenes } from '../scripts/decision-benchmark/corpus-actions.js';
import {
  baselineScenes,
  scenes,
  modelInput,
  validateCorpus,
} from '../scripts/decision-benchmark/corpus.js';
import { grade, summarize, type RunRecord } from '../scripts/decision-benchmark/evaluate.js';
import { check, choice, scene, score } from '../scripts/decision-benchmark/authoring.js';
import { compileQualityPolicy, summarizeQuality } from '../scripts/decision-benchmark/quality.js';

describe('synthetic decision benchmark', () => {
  it('contains exactly 4000 scored questions across the revised corpus', () => {
    expect(() => validateCorpus()).not.toThrow();
    expect(baselineScenes).toHaveLength(100);
    expect(baselineScenes.flatMap((s) => s.cases)).toHaveLength(298);
    expect(scenes).toHaveLength(724);
    expect(scenes.flatMap((s) => s.cases)).toHaveLength(4000);
  });
  it('exports only state and native questions to models', () => {
    for (const s of scenes) {
      const input = modelInput(s);
      expect(Object.keys(input).sort()).toEqual(['questions', 'state']);
      for (const q of Object.values(input.questions)) {
        expect(
          Object.keys(q).every((key) => ['type', 'instructions', 'criteria'].includes(key)),
        ).toBe(true);
      }
      expect(modelInput(s)).toEqual(input);
    }
  });
  it('keeps the non-speech trigger question meaningful', () => {
    const s = actionScenes.find((s) => s.id === 'act-route-food')!;
    expect(s.cases[2]!.question.instructions).not.toContain('this speech');
  });
  const q = check(
    'fixture-case',
    choice('Select a supported alternative.', {
      a: 'One valid alternative.',
      b: 'Another valid alternative.',
      c: 'Unsupported assertion.',
    }),
    { type: 'choice', accepted: ['a', 'b'] },
    'Two alternatives are allowed.',
    { ambiguity: 'multiple-valid' },
  );
  const s = scene('fixture-scene', 'fixture', 'Fixture', {}, [q], ['docs/ai-providers.md']);
  it('accepts defensible alternatives without inventing a probability target', () => {
    const row = grade(s, q, {
      type: 'choice',
      choice: 'b',
      probabilities: { a: 0.2, b: 0.7, c: 0.1 },
      confidence: 0.8,
    });
    expect(row.pass).toBe(true);
    expect(row.brier).toBeUndefined();
  });
  it('counts absent and failed answers as failed cases', () => {
    expect(grade(s, q).pass).toBe(false);
    expect(grade(s, q, { type: 'noul', noul: 1 }).pass).toBe(false);
  });
  it('does not normalize raw decision scores to fabricate calibration', () => {
    const row = grade(s, q, {
      type: 'choice',
      choice: 'b',
      probabilities: { a: 2, b: 7, c: 1 },
      confidence: 1,
    });
    expect(row.pass).toBe(true);
    expect(row.probabilityValid).toBe(false);
    expect(row.brier).toBeUndefined();
  });
  it('uses the nearest offered category with upward half ties and bounded endpoints', () => {
    const q = check(
      'score-fixture',
      score('Count supplied completed deliveries.', ['None', 'One', 'Two']),
      { type: 'score', min: 2, max: 2 },
      'Exactly two deliveries were completed.',
    );
    const answer = {
      type: 'score' as const,
      score: 1.8,
      legend: {},
      probabilities: {},
      confidence: 0.9,
    };
    expect(q.gold).toEqual({ type: 'score', min: 2, max: 2, tolerance: 0.25 });
    expect(grade(s, q, answer).pass).toBe(true);
    expect(grade(s, q, { ...answer, score: 1.5 }).pass).toBe(true);
    expect(grade(s, q, { ...answer, score: 1.49 }).pass).toBe(false);
    expect(grade(s, q, { ...answer, score: 2.1 }).pass).toBe(true);
    expect(grade(s, q, { ...answer, score: Infinity }).pass).toBe(false);
    expect(grade(s, q, { ...answer, score: NaN }).pass).toBe(false);
    const zero = { ...q, gold: { type: 'score' as const, min: 0, max: 0, tolerance: 0.25 } };
    expect(grade(s, zero, { ...answer, score: -0.1 }).pass).toBe(true);
  });
  it('keeps actual probability estimates continuous rather than rounding to yes or no', () => {
    const chance = {
      ...q,
      question: { type: 'noul' as const, instructions: 'Estimate the supplied chance.' },
      gold: { type: 'noul' as const, min: 0.78, max: 0.82 },
    };
    expect(grade(s, chance, { type: 'noul', noul: 0.8 }).pass).toBe(true);
    expect(grade(s, chance, { type: 'noul', noul: 0.76 }).pass).toBe(false);
  });
  it('calculates calibration only for a unique clear expected choice', () => {
    const clear = {
      ...q,
      ambiguity: 'unambiguous' as const,
      gold: { type: 'choice' as const, accepted: ['a'] },
    };
    const row = grade(s, clear, {
      type: 'choice',
      choice: 'a',
      probabilities: { a: 0.8, b: 0.1, c: 0.1 },
      confidence: 0.01,
    });
    expect(row.pass).toBe(true);
    expect(row.brier).toBeCloseTo(0.06);
    expect(row.logLoss).toBeCloseTo(-Math.log(0.8));
  });

  const levelCase = check(
    'score-level-fixture',
    score('Classify deadline slack using the offered urgency levels.', [
      'More than twenty minutes',
      'Six through twenty minutes',
      'Zero through five minutes',
      'No plan qualifies',
    ]),
    { type: 'score', min: 1, max: 1, tolerance: 0.1 },
    'The supplied qualifying plan leaves ten minutes.',
  );
  const levelAnswer = (value: number, probabilities: Record<string, number>) => ({
    type: 'score' as const,
    score: value,
    probabilities,
    legend: {},
  });
  const bestLevelCorrect = levelAnswer(1.11, { '0': 0.04, '1': 0.86, '2': 0.05, '3': 0.05 });
  const weightedCorrect = levelAnswer(0.97, { '0': 0.37, '1': 0.36, '2': 0.2, '3': 0.07 });

  it('uses a fixed rounded category while retaining the raw scalar and its reference result', () => {
    expect(grade(s, levelCase, bestLevelCorrect)).toMatchObject({
      pass: true,
      predicted: 1.11,
      interpretedScore: 1,
      rawReferencePass: false,
      scoreTopLevel: 1,
      scoreTopLevelPass: true,
    });
  });

  it('preserves a passing nearest category when the greatest scored category disagrees', () => {
    expect(grade(s, levelCase, weightedCorrect)).toMatchObject({
      pass: true,
      predicted: 0.97,
      scoreTopLevel: 0,
      scoreTopLevelPass: false,
    });
  });

  const incompleteVectors: Record<string, number>[] = [
    {},
    { '0': 0.1, '1': 0.9 },
    { '0': 0, '1': 1, '2': NaN, '3': 0 },
  ];
  it.each(incompleteVectors)(
    'does not invent best-level agreement from an incomplete or nonfinite vector: %j',
    (probabilities) => {
      const row = grade(s, levelCase, levelAnswer(1, probabilities));
      expect(row.pass).toBe(true);
      expect(row).not.toHaveProperty('scoreTopLevel');
      expect(row).not.toHaveProperty('scoreTopLevelPass');
    },
  );

  it('uses the first offered level for tied finite scores without requiring a unit sum', () => {
    expect(grade(s, levelCase, levelAnswer(1, { '0': 5, '1': 5, '2': 1, '3': 0 }))).toMatchObject({
      pass: true,
      scoreTopLevel: 0,
      scoreTopLevelPass: false,
    });
  });

  it('summarizes both disagreement directions over complete vectors and reports missing coverage', () => {
    const cases = Array.from({ length: 4 }, (_, index) => ({
      ...levelCase,
      id: `score-level-${index}`,
    }));
    const fixture = scene('score-level-scene', 'fixture', 'Fixture', {}, cases, [
      'docs/ai-providers.md',
    ]);
    const model = 'microsoft/microsoft-decision-1';
    const record: RunRecord = {
      sceneId: fixture.id,
      model,
      requestId: 'score-level-run',
      inputDigest: 'a'.repeat(64),
      result: {
        outcome: 'value',
        value: {
          answers: {
            'score-level-0': bestLevelCorrect,
            'score-level-1': weightedCorrect,
            'score-level-2': levelAnswer(1, {}),
          },
        },
        receipt: {
          requestId: 'score-level-run',
          provider: 'macrofold',
          requestedModel: model,
          model,
          modelVersionStatus: 'unavailable',
          contextDigest: 'b'.repeat(64),
          startedAt: '2026-10-15T10:00:00.000Z',
          completedAt: '2026-10-15T10:00:00.001Z',
          latencyMs: 1,
          dispatched: true,
          completionUncertain: false,
        },
      },
    };
    expect(summarize([fixture], [record], [model]).models[0]!.scoreLevelAgreement).toEqual({
      answered: 3,
      completeVectors: 2,
      topLevelPassed: 1,
      topLevelAgreement: 0.5,
      strictScorePassedOnCompleteVectors: 2,
      strictFailTopPass: 0,
      strictPassTopFail: 1,
    });
    expect(summarize([fixture], [], [model]).models[0]!.scoreLevelAgreement).toMatchObject({
      answered: 0,
      completeVectors: 0,
      topLevelAgreement: null,
    });
    const points = summarizeQuality(
      compileQualityPolicy([fixture]),
      summarize([fixture], [record], [model]).models,
      [record],
    );
    expect(points.models[0]!.cases[0]).toMatchObject({
      predicted: 1.11,
      strictPass: true,
      points: 100,
      numeric: { interpretedScore: 1, distance: 0 },
    });
  });
});
