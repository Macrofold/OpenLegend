import { describe, expect, it } from 'vitest';
import { modelInput, scenes, sha256 } from '../scripts/decision-benchmark/corpus.js';
import { grade, summarize, type RunRecord } from '../scripts/decision-benchmark/evaluate.js';
import { choiceBindings } from '../scripts/decision-benchmark/options.js';
import { permittedReaction } from '../scripts/decision-benchmark/reaction-policy.js';
import {
  gradeGeneratedReviewed,
  reviewedReferenceScenes,
} from '../scripts/decision-benchmark/reference-review.js';
import { episodes } from '../scripts/decision-benchmark/complex-scenes.js';
import { generationFixture, gradeGenerated } from '../scripts/decision-benchmark/generation.js';
import { reviewedReferenceReport } from '../scripts/decision-benchmark/reference-report.js';
import type { JudgmentAnswer } from '../packages/ai/src/index.js';
import type { BenchmarkCase, BenchmarkScene } from '../scripts/decision-benchmark/types.js';

const viewNames = [
  'control',
  'dense',
  'order-control',
  'reordered',
  'option-order',
  'capacity',
  'changed',
];
const originalById = new Map(scenes.map((scene) => [scene.id, scene]));
const sceneFor = (id: string) => {
  const scene = originalById.get(id);
  if (!scene) throw new Error(`Missing corpus fixture ${id}`);
  return scene;
};
const caseFor = (scene: BenchmarkScene, suffix: string) => {
  const test = scene.cases.find((test) => test.id === `${scene.id}-${suffix}`);
  if (!test) throw new Error(`Missing corpus question ${scene.id}-${suffix}`);
  return test;
};
function replaceScene(original: BenchmarkScene, replacement: BenchmarkScene) {
  return scenes.map((scene) => (scene === original ? replacement : scene));
}

describe('separate reviewed benchmark references', () => {
  it('records exactly 21 explicit amendments while preserving the frozen corpus and large evidence archives', () => {
    const originalReferences = JSON.stringify(
      scenes.map((scene) =>
        scene.cases.map((test) => ({ gold: test.gold, ambiguity: test.ambiguity })),
      ),
    );
    const originalFrozen = scenes.map((scene) => Object.isFrozen(scene.state));
    const reviewed = reviewedReferenceScenes(scenes);
    expect(reviewed.scenes).toHaveLength(scenes.length);
    expect(reviewed.amendments).toHaveLength(21);
    expect(reviewed.excludedIds).toHaveLength(0);
    expect(
      reviewed.scenes.reduce((sum, scene) => sum + scene.cases.length, 0) -
        reviewed.excludedIds.length,
    ).toBe(4_000);
    expect(reviewed.scenes.filter((scene, i) => scene !== scenes[i])).toHaveLength(21);
    expect(
      JSON.stringify(
        scenes.map((scene) =>
          scene.cases.map((test) => ({ gold: test.gold, ambiguity: test.ambiguity })),
        ),
      ),
    ).toEqual(originalReferences);
    expect(scenes.map((scene) => Object.isFrozen(scene.state))).toEqual(originalFrozen);
    for (let i = 0; i < scenes.length; i++) {
      expect(reviewed.scenes[i]!.state).toBe(scenes[i]!.state);
      expect(reviewed.scenes[i]!.outputs).toBe(scenes[i]!.outputs);
      const amended = reviewed.scenes[i] !== scenes[i];
      if (amended) {
        expect(Object.isFrozen(reviewed.scenes[i])).toBe(true);
        expect(Object.isFrozen(reviewed.scenes[i]!.cases)).toBe(true);
      }
    }
    expect(Object.isFrozen(reviewed)).toBe(true);
    expect(Object.isFrozen(reviewed.scenes)).toBe(true);
    expect(Object.isFrozen(reviewed.excludedIds)).toBe(true);
    expect(Object.isFrozen(reviewed.amendments)).toBe(true);
    for (const amendment of reviewed.amendments) {
      expect(Object.isFrozen(amendment)).toBe(true);
      expect(Object.isFrozen(amendment.before.gold)).toBe(true);
      expect(Object.isFrozen(amendment.after.gold)).toBe(true);
      expect(amendment.reason).not.toMatch(/models? (?:voted|agreed|chose)|majority/i);
      if (amendment.after.gold.type === 'choice')
        expect(Object.isFrozen(amendment.after.gold.accepted)).toBe(true);
    }
  });

  it('removes the nine unusable questions instead of retaining unscored questions', () => {
    const removedIds = [
      ...viewNames.map((view) => `future-social-teacher-correction-${view}-q4`),
      'act-route-running-q3',
      'world-institution-envoy-q3',
    ];
    const offered = new Set(scenes.flatMap((scene) => scene.cases.map((test) => test.id)));
    for (const id of removedIds) expect(offered.has(id)).toBe(false);
    const reviewed = reviewedReferenceScenes(scenes);
    expect(reviewed.excludedIds).toEqual([]);
    expect(reviewed.amendments.every((entry) => entry.kind === 'broaden')).toBe(true);
    const envoy = sceneFor('world-institution-envoy');
    expect(envoy.cases.map((test) => test.id)).toEqual([
      'world-institution-envoy-q1',
      'world-institution-envoy-q2',
    ]);
    const injury = scenes
      .flatMap((scene) => scene.cases)
      .find((test) => test.id === 'future-social-carver-credit-compound-q7')!;
    expect(injury.gold).toEqual({ type: 'choice', accepted: ['low'] });
    expect(injury.tags).toContain('injury');
    expect(sceneFor('future-social-carver-credit-compound').state.body).toMatchObject({
      injury:
        'A stiff left wrist prevents lifting a rail overhead; the offered low carrying handles remain usable.',
    });
  });

  it.each(['social-prize-mourning', 'social-carver-credit'])(
    'adds the offered firm expression across exactly seven %s views',
    (episode) => {
      const reviewed = reviewedReferenceScenes(scenes);
      for (const view of viewNames) {
        const scene = reviewed.scenes.find((scene) => scene.id === `future-${episode}-${view}`)!;
        const test = caseFor(scene, 'q3');
        expect(test.gold).toEqual({ type: 'choice', accepted: ['warm', 'reserved', 'firm'] });
        const amendment = reviewed.amendments.find((entry) => entry.questionId === test.id)!;
        expect(amendment.kind).toBe('broaden');
        expect(amendment.before.gold).toEqual({ type: 'choice', accepted: ['warm', 'reserved'] });
        expect(amendment.after.includedInDecisiveAccuracy).toBe(true);
      }
    },
  );

  it('adds only the two moderate frustration proposals permitted in each actor-return view', () => {
    const reviewed = reviewedReferenceScenes(scenes);
    for (const view of viewNames) {
      const scene = reviewed.scenes.find(
        (scene) => scene.id === `future-social-actor-return-${view}`,
      )!;
      const test = caseFor(scene, 'q2');
      if (test.gold.type !== 'choice') throw new Error('Fixture');
      const original = caseFor(sceneFor(scene.id), 'q2');
      if (original.gold.type !== 'choice') throw new Error('Fixture');
      const originalAccepted = original.gold.accepted;
      const added = test.gold.accepted.filter((key) => !originalAccepted.includes(key));
      expect(new Set(added)).toEqual(new Set(['frustration-25', 'frustration-50']));
      const encounter = scene.state.encounter as { newPersonallyPerceivedCause: boolean };
      for (const key of added)
        expect(
          permittedReaction(
            scene.state.feelingPolicy,
            scene.outputs?.[test.id]?.[key],
            encounter.newPersonallyPerceivedCause,
          ),
        ).toBe(true);
      expect(test.gold.accepted).not.toContain('frustration-75');
      expect(test.gold.accepted).not.toContain('frustration-100');
    }
  });

  it('finds a proposed tone by decoded output semantics rather than assuming its option key', () => {
    const original = sceneFor('future-social-prize-mourning-control');
    const test = caseFor(original, 'q3');
    if (test.question.type !== 'choice') throw new Error('Fixture');
    const rename = <T>(entries: Record<string, T>) =>
      Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [
          key === 'firm' ? 'boundary_statement' : key,
          value,
        ]),
      );
    const changed: BenchmarkCase = {
      ...test,
      question: { ...test.question, criteria: rename(test.question.criteria) },
    };
    const replacement: BenchmarkScene = {
      ...original,
      cases: original.cases.map((item) => (item === test ? changed : item)),
      outputs: { ...original.outputs, [test.id]: rename(original.outputs![test.id]!) },
    };
    const reviewed = reviewedReferenceScenes(replaceScene(original, replacement));
    const result = caseFor(reviewed.scenes.find((scene) => scene.id === original.id)!, 'q3');
    expect(result.gold).toEqual({
      type: 'choice',
      accepted: ['warm', 'reserved', 'boundary_statement'],
    });
  });

  it('refuses an amendment if a changed profile would make the added feeling illegal', () => {
    const original = sceneFor('future-social-actor-return-changed');
    const policy = original.state.feelingPolicy;
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('Fixture');
    const replacement = {
      ...original,
      state: {
        ...original.state,
        feelingPolicy: { ...policy, allowedPolicies: ['joy', 'relief'] },
      },
    };
    expect(() => reviewedReferenceScenes(replaceScene(original, replacement))).toThrow(
      'not permitted',
    );
  });

  it('requires all seven explicit questions for every selected reviewed episode', () => {
    const original = sceneFor('future-social-prize-mourning-capacity');
    expect(() => reviewedReferenceScenes(scenes.filter((scene) => scene !== original))).toThrow(
      'expected all 7',
    );
    const replacement = {
      ...original,
      cases: original.cases.filter((test) => !test.id.endsWith('-q3')),
    };
    expect(() => reviewedReferenceScenes(replaceScene(original, replacement))).toThrow(
      'expected all 7',
    );
  });

  it('rejects duplicate reviewed questions and missing or changed decoded offers', () => {
    const original = sceneFor('future-social-carver-credit-control');
    expect(() => reviewedReferenceScenes([...scenes, original])).toThrow(
      'duplicate reviewed question',
    );
    const outputs = { ...original.outputs };
    Reflect.deleteProperty(outputs, `${original.id}-q3`);
    expect(() => reviewedReferenceScenes(replaceScene(original, { ...original, outputs }))).toThrow(
      'missing decoded',
    );
  });

  it('leaves wholly unselected episodes alone and shares unchanged scenes read-only', () => {
    const original = sceneFor('future-social-queue-blame-control');
    const result = reviewedReferenceScenes([original]);
    expect(result.scenes[0]).toBe(original);
    expect(result.excludedIds).toEqual([]);
    expect(result.amendments).toEqual([]);
  });

  it('decodes q6 from its actual memory-order question position after q4 is removed', () => {
    const original = sceneFor('future-social-teacher-correction-order-control');
    const test = caseFor(original, 'q6');
    const bindings = choiceBindings(original, test);
    const reviewed = reviewedReferenceScenes(scenes);
    const amendedScene = reviewed.scenes.find((scene) => scene.id === original.id)!;
    expect(amendedScene.cases.indexOf(test)).toBe(4);
    for (const [wire, semantic] of bindings) {
      const requestId = `fixture-reference-${wire}`;
      const record: RunRecord = {
        sceneId: original.id,
        model: 'typesafe/jev-1.13',
        requestId,
        inputDigest: 'a'.repeat(64),
        result: {
          outcome: 'value',
          value: {
            answers: {
              [test.id]: {
                type: 'choice',
                choice: wire,
                probabilities: Object.fromEntries(
                  [...bindings.keys()].map((key) => [key, Number(key === wire)]),
                ),
              },
            },
          },
          receipt: {
            requestId,
            provider: 'macrofold',
            requestedModel: 'typesafe/jev-1.13',
            model: 'typesafe/jev-1.13',
            modelVersionStatus: 'unavailable',
            contextDigest: 'b'.repeat(64),
            startedAt: '2026-10-15T00:00:00Z',
            completedAt: '2026-10-15T00:00:00Z',
            latencyMs: 0,
            dispatched: true,
            completionUncertain: false,
          },
        },
      };
      const frozen = summarize([original], [record], [record.model]).models[0]!;
      const audited = summarize(
        [amendedScene],
        [record],
        [record.model],
        new Set(reviewed.excludedIds),
      ).models[0]!;
      const frozenAnswer = frozen.cases.find((row) => row.id === test.id)!;
      const auditedAnswer = audited.cases.find((row) => row.id === test.id)!;
      expect(auditedAnswer.predicted).toBe(semantic);
      expect(auditedAnswer).toEqual(frozenAnswer);
      expect(frozen.total).toBe(5);
      expect(audited.total).toBe(5);
      expect(audited.cases.some((row) => row.id.endsWith('-q4'))).toBe(false);
    }
  });

  it.each(['social-prize-mourning', 'social-carver-credit'])(
    'uses the same reviewed firm expression for actual %s generation',
    (id) => {
      const episode = episodes.find((episode) => episode.id === id)!;
      const output = { ...generationFixture(episode), expression: 'firm' };
      const scene = reviewedReferenceScenes(scenes).scenes.find(
        (scene) => scene.id === `future-${id}-dense`,
      )!;
      const original = gradeGenerated(episode, output);
      const audited = gradeGeneratedReviewed(episode, output, scene);
      expect(original.referenceExpression).toBe(false);
      expect(audited).toEqual({ ...original, referenceExpression: true });
      expect(gradeGenerated(episode, output)).toEqual(original);
    },
  );

  it.each([
    [0.25, true],
    [0.5, true],
    [0.75, false],
  ] as const)(
    'reviews generated frustration at intensity %s without broadening its other intensities',
    (intensity, accepted) => {
      const episode = episodes.find((episode) => episode.id === 'social-actor-return')!;
      const fixture = generationFixture(episode);
      const output = {
        ...fixture,
        reaction: { ...fixture.reaction, policy: 'frustration', target: 'self', intensity },
      };
      const scene = reviewedReferenceScenes(scenes).scenes.find(
        (scene) => scene.id === 'future-social-actor-return-dense',
      )!;
      const original = gradeGenerated(episode, output);
      expect(original.reactionLegal).toBe(true);
      expect(original.referenceFeeling).toBe(false);
      expect(gradeGeneratedReviewed(episode, output, scene)).toEqual({
        ...original,
        referenceFeeling: accepted,
      });
      expect(gradeGenerated(episode, output)).toEqual(original);
    },
  );

  it.each([
    { source: 'unavailable-private-memory' },
    { target: 'person-present' },
    { lifetimeGameMinutes: 120 },
  ])('retains generation authority failures for an otherwise reviewed feeling: %j', (patch) => {
    const episode = episodes.find((episode) => episode.id === 'social-actor-return')!;
    const fixture = generationFixture(episode);
    const output = {
      ...fixture,
      reaction: {
        ...fixture.reaction,
        policy: 'frustration',
        target: 'self',
        intensity: 0.5,
        ...patch,
      },
    };
    const scene = reviewedReferenceScenes(scenes).scenes.find(
      (scene) => scene.id === 'future-social-actor-return-dense',
    )!;
    const original = gradeGenerated(episode, output);
    expect(original.schemaValid).toBe(true);
    expect(original.reactionLegal).toBe(false);
    expect(gradeGeneratedReviewed(episode, output, scene)).toEqual(original);
  });

  it('matches the offered none operation while preserving its all-null authority requirement', () => {
    const episode = episodes.find((episode) => episode.id === 'social-supper-refusal')!;
    const fixture = generationFixture(episode);
    const scene = reviewedReferenceScenes(scenes).scenes.find(
      (scene) => scene.id === 'future-social-supper-refusal-dense',
    )!;
    expect(fixture.reaction.kind).toBe('none');
    expect(gradeGeneratedReviewed(episode, fixture, scene).referenceFeeling).toBe(true);
    const invalid = { ...fixture, reaction: { ...fixture.reaction, source: 'encounter-now' } };
    expect(gradeGeneratedReviewed(episode, invalid, scene)).toEqual(
      gradeGenerated(episode, invalid),
    );
    expect(gradeGeneratedReviewed(episode, invalid, scene).referenceFeeling).toBe(false);
  });

  it('preserves invalid-schema, invalid-plan and prose-review outcomes', () => {
    const episode = episodes.find((episode) => episode.id === 'social-actor-return')!;
    const scene = reviewedReferenceScenes(scenes).scenes.find(
      (scene) => scene.id === 'future-social-actor-return-dense',
    )!;
    expect(gradeGeneratedReviewed(episode, { unexpected: true }, scene)).toEqual(
      gradeGenerated(episode, { unexpected: true }),
    );
    const output = {
      ...generationFixture(episode),
      plan: 'defer',
      thought: 'I want time to recover.',
    };
    const result = gradeGeneratedReviewed(episode, output, scene);
    expect(result.planValid).toBe(false);
    expect(result.proseReview).toBe('required');
    expect(result).toEqual(gradeGenerated(episode, output));
  });

  it('uses and discloses dense generation references when native selection contains only a compound view', () => {
    const episode = episodes.find((episode) => episode.id === 'social-actor-return')!;
    const compound = sceneFor('future-social-actor-return-compound');
    const fixture = generationFixture(episode);
    const models = ['openai/gpt-6-luna:low', 'openai/gpt-6-luna:high'];
    const records: RunRecord[] = [0.5, 0.75].map((intensity, index) => {
      const requestId = `fixture-compound-generation-${intensity}`;
      return {
        sceneId: `generate-${episode.id}`,
        model: models[index]!,
        requestId,
        inputDigest: 'a'.repeat(64),
        generation: {
          ...fixture,
          reaction: { ...fixture.reaction, policy: 'frustration', target: 'self', intensity },
        },
        result: {
          outcome: 'value',
          value: { answers: {} },
          receipt: {
            requestId,
            provider: 'openai',
            requestedModel: 'gpt-6-luna',
            model: 'gpt-6-luna',
            modelVersionStatus: 'reported',
            contextDigest: 'b'.repeat(64),
            startedAt: '2026-10-15T00:00:00Z',
            completedAt: '2026-10-15T00:00:00Z',
            latencyMs: 0,
            dispatched: true,
            completionUncertain: false,
          },
        },
      };
    });
    const report = reviewedReferenceReport([compound], records, models);
    expect(report.amendments).toEqual([]);
    expect(report.excludedQuestionIds).toEqual([]);
    expect(report.models.map((model) => model.total)).toEqual([6, 6]);
    expect(report.generation.referenceAmendments.map((amendment) => amendment.questionId)).toEqual([
      'future-social-actor-return-dense-q2',
    ]);
    expect(
      report.generation.rows.map((row) => ({
        schemaValid: row.schemaValid,
        planValid: row.planValid,
        reactionLegal: row.reactionLegal,
        referenceFeeling: row.referenceFeeling,
      })),
    ).toEqual([
      { schemaValid: true, planValid: true, reactionLegal: true, referenceFeeling: true },
      { schemaValid: true, planValid: true, reactionLegal: true, referenceFeeling: false },
    ]);
    expect(report.generation.models.map((model) => model.allReferencesPass)).toEqual([1, 0]);
  });

  it('reports native as-run and reviewed scores with unchanged original inputs and option decoding', () => {
    const episodeScenes = scenes.filter(
      (scene) =>
        scene.group?.episodeId === 'social-prize-mourning' && scene.group.view !== 'compound',
    );
    const original = sceneFor('future-social-prize-mourning-order-control');
    const inputDigest = sha256(modelInput(original));
    const answers: Record<string, JudgmentAnswer> = {};
    for (const test of original.cases) {
      if (test.question.type === 'choice' && test.gold.type === 'choice') {
        const bindings = choiceBindings(original, test);
        const semantic = test.id.endsWith('-q3') ? 'firm' : test.gold.accepted[0];
        const wire = [...bindings].find(([, choice]) => choice === semantic)?.[0];
        if (!wire) throw new Error('Missing fixture handle.');
        answers[test.id] = {
          type: 'choice',
          choice: wire,
          probabilities: Object.fromEntries(
            [...bindings.keys()].map((key) => [key, Number(key === wire)]),
          ),
        };
      } else if (test.question.type === 'score' && test.gold.type === 'score') {
        const score = test.gold.min;
        answers[test.id] = {
          type: 'score',
          score,
          legend: Object.fromEntries(
            test.question.criteria.map((value, index) => [String(index), value]),
          ),
          probabilities: Object.fromEntries(
            test.question.criteria.map((_, index) => [
              String(index),
              Number(index === Math.round(score)),
            ]),
          ),
        };
      } else if (test.gold.type === 'noul')
        answers[test.id] = { type: 'noul', noul: (test.gold.min + test.gold.max) / 2 };
      else throw new Error('Mismatched fixture question.');
    }
    const requestId = 'fixture-original-native-handles';
    const record: RunRecord = {
      sceneId: original.id,
      model: 'typesafe/jev-1.13',
      requestId,
      inputDigest,
      result: {
        outcome: 'value',
        value: { answers },
        receipt: {
          requestId,
          provider: 'macrofold',
          requestedModel: 'typesafe/jev-1.13',
          model: 'typesafe/jev-1.13',
          modelVersionStatus: 'unavailable',
          contextDigest: 'b'.repeat(64),
          startedAt: '2026-10-15T00:00:00Z',
          completedAt: '2026-10-15T00:00:00Z',
          latencyMs: 0,
          dispatched: true,
          completionUncertain: false,
        },
      },
    };
    const frozen = summarize(episodeScenes, [record], [record.model]).models[0]!;
    const reviewed = reviewedReferenceReport(episodeScenes, [record], [record.model]).models[0]!;
    expect(frozen.cases.find((row) => row.id === `${original.id}-q3`)).toMatchObject({
      predicted: 'firm',
      pass: false,
    });
    expect(reviewed.cases.find((row) => row.id === `${original.id}-q3`)).toMatchObject({
      predicted: 'firm',
      pass: true,
    });
    expect(reviewed.cases.find((row) => row.id === `${original.id}-q6`)).toEqual(
      frozen.cases.find((row) => row.id === `${original.id}-q6`),
    );
    expect(reviewed.passed).toBe(frozen.passed + 1);
    expect(sha256(modelInput(original))).toBe(inputDigest);
    expect(summarize(episodeScenes, [record], [record.model]).models[0]!.passed).toBe(
      frozen.passed,
    );
  });
});
