import { describe, expect, it } from 'vitest';
import { accessSync } from 'node:fs';
import { scenes, modelInput, sha256 } from '../scripts/decision-benchmark/corpus.js';
import {
  acceptedPlans,
  complexScenes,
  episodes,
} from '../scripts/decision-benchmark/complex-scenes.js';
import { frontierScenes } from '../scripts/decision-benchmark/frontier-scenes.js';
import {
  generationCases,
  generationFixture,
  gradeGenerated,
  nativeCapabilities,
} from '../scripts/decision-benchmark/generation.js';
import { choiceBindings, decodeAnswer } from '../scripts/decision-benchmark/options.js';
import { summarize, type RunRecord } from '../scripts/decision-benchmark/evaluate.js';
import { permittedReaction } from '../scripts/decision-benchmark/reaction-policy.js';
import type { JudgmentAnswer } from '../packages/ai/src/index.js';
import type { BenchmarkScene } from '../scripts/decision-benchmark/types.js';

function fixtureRun(scene: BenchmarkScene, model = 'fixture-a'): RunRecord {
  const answers: Record<string, JudgmentAnswer> = {};
  for (const t of scene.cases) {
    const g = t.gold;
    if (g.type === 'choice') {
      const entries = [...choiceBindings(scene, t)];
      const wire = entries.find(([, semantic]) => semantic === g.accepted[0])![0];
      answers[t.id] = {
        type: 'choice',
        choice: wire,
        probabilities: Object.fromEntries(entries.map(([key]) => [key, Number(key === wire)])),
      };
    } else if (g.type === 'noul') answers[t.id] = { type: 'noul', noul: (g.min + g.max) / 2 };
    else answers[t.id] = { type: 'score', score: g.min, legend: {}, probabilities: {} };
  }
  return {
    sceneId: scene.id,
    model,
    requestId: `fixture-${scene.id}`,
    inputDigest: sha256(modelInput(scene)),
    result: {
      outcome: 'value',
      value: { answers },
      receipt: {
        requestId: `fixture-${scene.id}`,
        provider: 'macrofold',
        requestedModel: model,
        model,
        modelVersionStatus: 'unavailable',
        contextDigest: 'fixture',
        startedAt: '2026-10-15T00:00:00Z',
        completedAt: '2026-10-15T00:00:00Z',
        latencyMs: 0,
        dispatched: false,
        completionUncertain: false,
        estimatedCostUsd: 0,
      },
    },
  };
}

describe('rich decision corpus and structured outputs', () => {
  it('never treats a mechanically illegal structured reaction as an acceptable reference', () => {
    for (const s of scenes)
      for (const t of s.cases)
        if (t.tags.includes('structured-reaction') && t.gold.type === 'choice') {
          const encounter = s.state.encounter as { newPersonallyPerceivedCause: boolean };
          for (const key of t.gold.accepted)
            expect(
              permittedReaction(
                s.state.feelingPolicy,
                s.outputs?.[t.id]?.[key],
                encounter.newPersonallyPerceivedCause,
              ),
              `${t.id}:${key}`,
            ).toBe(true);
        }
  });
  it('contains80 independent seeds with seven grouped views and meaningful counterfactuals', () => {
    expect(episodes).toHaveLength(80);
    expect(new Set(episodes.map((e) => e.id)).size).toBe(80);
    expect(complexScenes).toHaveLength(560);
    for (const e of episodes) {
      expect(e.history.length).toBeGreaterThanOrEqual(6);
      expect(e.body.pain).toBeGreaterThanOrEqual(0);
      expect(e.body.pain).toBeLessThanOrEqual(10);
      expect(acceptedPlans(e)).not.toEqual(['defer']);
      expect(acceptedPlans(e, true), e.id).not.toEqual(acceptedPlans(e));
      const group = complexScenes.filter((s) => s.group?.episodeId === e.id);
      expect(new Set(group.map((s) => s.group!.split)).size).toBe(1);
      for (const s of group) {
        const self = s.state.self as {
          privateMeters: Array<{ value: number; min: number; max: number }>;
        };
        expect(self.privateMeters).toHaveLength(20);
        for (const m of self.privateMeters)
          expect(m.value >= m.min && m.value <= m.max, `${s.id}: ${JSON.stringify(m)}`).toBe(true);
        expect((s.state.recall as unknown[]).length).toBe(s.group!.memories);
        expect(JSON.stringify(s.state)).not.toMatch(/\{(?:self|other|third|place|item)\}/);
      }
    }
  });
  it('reverses the same256 memories and re-keys options without changing semantic evidence', () => {
    let changedOrders = 0;
    for (const e of episodes) {
      const a = complexScenes.find(
        (s) => s.group?.episodeId === e.id && s.group.view === 'order-control',
      )!;
      const b = complexScenes.find(
        (s) => s.group?.episodeId === e.id && s.group.view === 'reordered',
      )!;
      const options = complexScenes.find(
        (s) => s.group?.episodeId === e.id && s.group.view === 'option-order',
      )!;
      expect([...choiceBindings(a, a.cases[0]!)].map(([k, v]) => [k, v])).toEqual(
        [...choiceBindings(b, b.cases[0]!)].map(([k, v]) => [k, v]),
      );
      expect(options.state).toEqual(a.state);
      expect({ ...b.state, recall: [...(b.state.recall as unknown[])].reverse() }).toEqual(a.state);
      if (
        JSON.stringify([...choiceBindings(a, a.cases[0]!).values()]) !==
        JSON.stringify([...choiceBindings(options, options.cases[0]!).values()])
      )
        changedOrders++;
      expect(b.cases.map((t) => t.gold)).toEqual(a.cases.map((t) => t.gold));
    }
    expect(changedOrders).toBeGreaterThan(60);
  });
  it('retains probability omissions instead of manufacturing complete calibration vectors', () => {
    const s = complexScenes[0]!,
      t = s.cases[0]!;
    const wire = [...choiceBindings(s, t).keys()][0]!;
    const decoded = decodeAnswer(s, t, {
      type: 'choice',
      choice: wire,
      probabilities: { [wire]: 1 },
    });
    expect(decoded?.type === 'choice' ? Object.keys(decoded.probabilities) : []).toHaveLength(1);
  });
  it('joins twenty revised personal limits with supplied current stock over thirty-two schedules', () => {
    expect(frontierScenes).toHaveLength(12);
    for (const s of frontierScenes) {
      expect(s.group!.memories).toBeGreaterThan(530);
      const recall = s.state.recall as Array<{ id: string; when: string; text: string }>;
      const limits = new Map<string, { min: number; max: number }>();
      for (const memory of recall) {
        const initial = /range for (.+): ([\d.-]+) through ([\d.-]+)/.exec(memory.text);
        if (initial) limits.set(initial[1]!, { min: Number(initial[2]), max: Number(initial[3]) });
      }
      for (const memory of recall) {
        const revision = /minimum for (.+) to ([\d.-]+),/.exec(memory.text);
        if (revision) limits.get(revision[1]!)!.min = Number(revision[2]);
      }
      expect(limits.size).toBe(20);

      const stockFact = s.state.packingPads as { availableQuantity: number; source: string };
      const stock = stockFact.availableQuantity;
      expect(stockFact.source).toContain('engine-supplied');
      expect(stock).toBeGreaterThanOrEqual(0);
      expect(stock).toBeLessThanOrEqual(9);
      expect(s.state).not.toHaveProperty('packingPadAccount');
      expect(recall.some((memory) => memory.id.startsWith('ledger-'))).toBe(false);
      expect(s.state.packingRequest).toEqual({ requestedQuantity: 11 });

      const plans = s.state.daySchedules as Array<{
        id: string;
        packingPadsToCarry: number;
        minutes: number;
        sprinting: boolean;
        resultingTrackers: Array<{ name: string; value: number }>;
      }>;
      expect(plans).toHaveLength(32);
      expect(new Set(plans.map((plan) => plan.id)).size).toBe(32);
      const rangeValid = plans.filter((p) =>
        p.resultingTrackers.every(
          (v) => v.value >= limits.get(v.name)!.min && v.value <= limits.get(v.name)!.max,
        ),
      );
      expect(rangeValid).toHaveLength(12);
      expect(rangeValid.map((plan) => plan.packingPadsToCarry).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 12 }, (_, i) => i),
      );
      const feasible = rangeValid.filter((plan) => plan.packingPadsToCarry <= stock);
      const maximum = Math.max(...feasible.map((plan) => plan.packingPadsToCarry));
      const winners = feasible.filter((plan) => plan.packingPadsToCarry === maximum);
      expect(winners).toHaveLength(1);
      expect(maximum).toBe(stock);
      expect(s.cases[0]!.gold).toEqual({ type: 'choice', accepted: [winners[0]!.id] });
      const stockQuestion = s.cases.find((test) => test.id === `${s.id}-q4`)!;
      expect(stockQuestion.question.type).toBe('choice');
      expect(stockQuestion.gold).toEqual({ type: 'choice', accepted: ['available'] });
      expect(stockQuestion.question.instructions).toContain('commit to');
      const invalid = plans.filter((plan) => !rangeValid.includes(plan));
      expect(invalid).toHaveLength(20);
      for (const plan of invalid)
        expect(
          plan.resultingTrackers.filter(
            (v) => v.value < limits.get(v.name)!.min || v.value > limits.get(v.name)!.max,
          ),
        ).toHaveLength(1);
      expect(
        new Set(
          invalid.map(
            (p) =>
              p.resultingTrackers.find(
                (v) => v.value < limits.get(v.name)!.min || v.value > limits.get(v.name)!.max,
              )!.name,
          ),
        ).size,
      ).toBe(20);
    }
  });
  it('runs all native-shaped fixtures through wire decoding, structured mapping and paired reports', () => {
    const records = scenes.map((s) => fixtureRun(s));
    const report = summarize(scenes, records, ['fixture-a', 'fixture-b']);
    expect(report.models[0]!.passed).toBe(4000);
    expect(report.models[0]!.cases.filter((c) => c.structuredOutput !== undefined)).toHaveLength(
      1824,
    );
    expect(report.models[0]!.unattemptedScenes).toBe(0);
    expect(report.models[1]!.unattemptedScenes).toBe(724);
    expect(report.models[1]!.answeredQuality.total).toBe(0);
    expect(report.models[0]!.evidenceKinds['mechanical-contract']!.answeredQuality.accuracy).toBe(
      1,
    );
    expect(report.models[1]!.evidenceKinds['mechanical-contract']!.answeredQuality.total).toBe(0);
    expect(report.models[1]!.types['score']!.answeredQuality.accuracy).toBeNull();
    expect(report.commonAnswered.every((r) => r.total === 0)).toBe(true);
    const paired = summarize(
      scenes.slice(0, 1),
      [fixtureRun(scenes[0]!, 'fixture-a'), fixtureRun(scenes[0]!, 'fixture-b')],
      ['fixture-a', 'fixture-b'],
    );
    expect(paired.commonAnswered.every((r) => r.total === 3)).toBe(true);
    expect(Object.keys(paired.models[0]!.calibration).sort()).toEqual(['choice', 'noul']);
  });
  it('evaluates true schema-generated fields independently of optional speech', () => {
    expect(generationCases).toHaveLength(80);
    for (const e of episodes) {
      const output = generationFixture(e);
      expect(gradeGenerated(e, output)).toEqual({
        schemaValid: true,
        planValid: true,
        reactionLegal: true,
        referenceFeeling: true,
        referenceExpression: true,
        proseReview: 'not-supplied',
      });
      expect(
        gradeGenerated(e, {
          ...output,
          speech: 'A natural utterance still needs perspective and quality review.',
        }).proseReview,
      ).toBe('required');
      expect(gradeGenerated(e, { ...output, secretHealth: 100 }).schemaValid).toBe(false);
      expect(
        gradeGenerated(e, {
          ...output,
          reaction: { ...output.reaction, source: 'unavailable-private-evidence' },
        }).reactionLegal,
      ).toBe(false);
      expect(
        gradeGenerated(e, {
          ...output,
          reaction: { ...output.reaction, kind: 'create', intensity: 0 },
        }).reactionLegal,
      ).toBe(false);
    }
    for (const capability of Object.values(nativeCapabilities))
      expect(capability.arbitraryJsonGeneration).toBe(false);
    expect(nativeCapabilities['openai/gpt-6-luna:decisions'].freeText).toBe(false);
  });
  it('references existing source documents and keeps evaluation metadata outside native inputs', () => {
    for (const s of scenes) {
      for (const source of s.sources)
        expect(() => accessSync(source.split('#')[0]!), `${s.id}: ${source}`).not.toThrow();
      expect(Object.keys(modelInput(s)).sort()).toEqual(['questions', 'state']);
    }
  });
});
