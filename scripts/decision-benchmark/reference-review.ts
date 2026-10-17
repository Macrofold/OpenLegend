import { permittedReaction } from './reaction-policy.js';
import { complexScenes } from './complex-scenes.js';
import { gradeGenerated, type GeneratedValue } from './generation.js';
import type { ComplexEpisode } from './complex-types.js';
import type { BenchmarkCase, BenchmarkScene, Gold } from './types.js';

export interface ReferenceJudgment {
  gold: Gold;
  ambiguity: BenchmarkCase['ambiguity'];
  includedInDecisiveAccuracy: boolean;
}

export interface ReferenceAmendment {
  questionId: string;
  kind: 'broaden';
  reason: string;
  before: ReferenceJudgment;
  after: ReferenceJudgment;
}

export interface ReviewedReferences {
  scenes: readonly BenchmarkScene[];
  excludedIds: readonly string[];
  amendments: readonly ReferenceAmendment[];
}

const views = [
  'control',
  'dense',
  'order-control',
  'reordered',
  'option-order',
  'capacity',
  'changed',
];
const ids = (episode: string, question: number) =>
  views.map((view) => `future-${episode}-${view}-q${question}`);

const rules = [
  {
    questionIds: ids('social-prize-mourning', 3),
    operation: 'firm',
    reason:
      'Talin prefers choosing whether private family stories become public, and Mira is awaiting that consent. The offered firm tone explicitly means a clear boundary without hostility. A calm definite answer about disclosure is therefore plausible alongside warmth or restraint; no boundary violation or angry reaction is assumed.',
  },
  {
    questionIds: ids('social-carver-credit', 3),
    operation: 'firm',
    reason:
      'Edda enjoys lively criticism, dislikes public pleading and remains wary about Bram’s descriptions of shared work. A clear professional acknowledgment or boundary is plausible alongside warmth or restraint. Withdrawal of the specific trolley help in the changed view also permits a firm practical response without requiring hostility.',
  },
  {
    questionIds: ids('social-actor-return', 2),
    operation: 'frustration',
    reason:
      'Ashen’s authored biography explicitly describes impatience with slow recovery. The current encounter combines praise with a question about jumping while the ankle restriction remains. Moderate frustration about that limitation can coexist with joy or relief; the review adds only the offered quarter- and half-intensity proposals that satisfy this hypothetical profile’s source, target and lifetime rules.',
  },
] as const;

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const fail = (id: string, reason: string): never => {
  throw new Error(`Reference review requires renewed inspection: ${id}: ${reason}.`);
};

function copyGold(gold: Gold): Gold {
  if (gold.type === 'choice') {
    const accepted = [...gold.accepted];
    Object.freeze(accepted);
    return Object.freeze({ ...gold, accepted });
  }
  return Object.freeze({ ...gold });
}

function judgment(test: BenchmarkCase, included: boolean): ReferenceJudgment {
  return Object.freeze({
    gold: copyGold(test.gold),
    ambiguity: test.ambiguity,
    includedInDecisiveAccuracy: included,
  });
}

function broaden(
  scene: BenchmarkScene,
  test: BenchmarkCase,
  operation: 'firm' | 'frustration',
): Gold {
  if (test.question.type !== 'choice' || test.gold.type !== 'choice')
    return fail(test.id, 'the reviewed question must remain a choice');
  const outputs = scene.outputs?.[test.id];
  if (!outputs) return fail(test.id, 'missing decoded structured outputs');
  const criteria = test.question.criteria;
  const offered = Object.entries(outputs).filter(([key]) => Object.hasOwn(criteria, key));
  const before = test.gold.accepted.map((key) => outputs[key]);
  let additions: string[];
  if (operation === 'firm') {
    const priorStyles = before.map((output) => (object(output) ? output.style : undefined));
    if (
      priorStyles.length !== 2 ||
      !priorStyles.includes('warm') ||
      !priorStyles.includes('reserved')
    )
      return fail(test.id, 'the frozen warm/reserved reference changed');
    additions = offered
      .filter(([, output]) => object(output) && output.style === 'firm')
      .map(([key]) => key);
    if (additions.length !== 1) return fail(test.id, 'expected one offered firm expression');
  } else {
    const expected = new Set([
      'joy:0.25',
      'joy:0.5',
      'joy:0.75',
      'relief:0.25',
      'relief:0.5',
      'relief:0.75',
    ]);
    const prior = before.map((output) =>
      object(output) ? `${String(output.policy)}:${String(output.intensity)}` : 'invalid',
    );
    if (prior.length !== 6 || new Set(prior).size !== 6 || prior.some((key) => !expected.has(key)))
      return fail(test.id, 'the frozen joy/relief reference changed');
    const proposals = offered.filter(
      ([, output]) =>
        object(output) &&
        output.kind === 'create' &&
        output.policy === 'frustration' &&
        (output.intensity === 0.25 || output.intensity === 0.5),
    );
    if (
      proposals.length !== 2 ||
      new Set(proposals.map(([, output]) => (object(output) ? output.intensity : undefined)))
        .size !== 2
    )
      return fail(test.id, 'expected the two offered moderate frustration proposals');
    const encounter = scene.state.encounter;
    for (const [, output] of proposals)
      if (
        !permittedReaction(
          scene.state.feelingPolicy,
          output,
          object(encounter) && encounter.newPersonallyPerceivedCause === true,
        )
      )
        return fail(test.id, 'the added feeling is not permitted by the supplied profile');
    additions = proposals.map(([key]) => key);
  }
  if (additions.some((key) => test.gold.type === 'choice' && test.gold.accepted.includes(key)))
    return fail(test.id, 'the proposed amendment is already present');
  return copyGold({ type: 'choice', accepted: [...test.gold.accepted, ...additions] });
}

/** A separate reviewed interpretation that broadens the authored subjective references.
 * The current corpus contains no excluded questions. Selected
 * episodes require all seven explicit views; wholly unselected episodes are left alone.
 * Only changed scene/case/gold containers are copied/frozen. Large evidence archives and
 * decoded offers are shared read-only, and no input object is mutated or newly frozen.
 */
export function reviewedReferenceScenes(scenes: readonly BenchmarkScene[]): ReviewedReferences {
  const wanted = new Set<string>(rules.flatMap((rule) => rule.questionIds));
  const located = new Map<string, { scene: BenchmarkScene; test: BenchmarkCase }>();
  for (const scene of scenes)
    for (const test of scene.cases)
      if (wanted.has(test.id)) {
        if (located.has(test.id)) fail(test.id, 'duplicate reviewed question');
        located.set(test.id, { scene, test });
      }
  const replacements = new Map<string, BenchmarkCase>();
  const excludedIds: string[] = [];
  const amendments: ReferenceAmendment[] = [];
  for (const rule of rules) {
    const present = rule.questionIds.filter((id) => located.has(id));
    const selected =
      present.length > 0 ||
      scenes.some((scene) =>
        rule.questionIds.some((id) => id.slice(0, id.lastIndexOf('-q')) === scene.id),
      );
    if (!selected) continue;
    if (present.length !== rule.questionIds.length)
      fail(rule.questionIds[0]!, `expected all ${rule.questionIds.length} reviewed questions`);
    for (const questionId of rule.questionIds) {
      const { scene, test } = located.get(questionId)!;
      const replacement = Object.freeze<BenchmarkCase>({
        ...test,
        gold: broaden(scene, test, rule.operation),
      });
      replacements.set(questionId, replacement);
      amendments.push(
        Object.freeze({
          questionId,
          kind: 'broaden',
          reason: rule.reason,
          before: judgment(test, true),
          after: judgment(replacement, true),
        }),
      );
    }
  }
  const reviewed = scenes.map((scene) => {
    if (!scene.cases.some((test) => replacements.has(test.id))) return scene;
    const cases = scene.cases.map((test) => replacements.get(test.id) ?? test);
    Object.freeze(cases);
    return Object.freeze({ ...scene, cases });
  });
  return Object.freeze({
    scenes: Object.freeze(reviewed),
    excludedIds: Object.freeze(excludedIds),
    amendments: Object.freeze(amendments),
  });
}

/** Both live and external generation use the dense evidence, even when the native
 * experiment selected only compound views. Keep their disclosed references identical.
 */
export function reviewedGenerationReferences(episodeIds: ReadonlySet<string>) {
  const review = reviewedReferenceScenes(
    complexScenes.filter((scene) => episodeIds.has(scene.group!.episodeId)),
  );
  const denseByEpisode = new Map(
    review.scenes
      .filter((scene) => scene.group?.view === 'dense')
      .map((scene) => [scene.group!.episodeId, scene]),
  );
  const reviewedQuestionIds = new Set(
    [...denseByEpisode.values()].flatMap((scene) => [`${scene.id}-q2`, `${scene.id}-q3`]),
  );
  return {
    denseByEpisode,
    amendments: review.amendments.filter((amendment) =>
      reviewedQuestionIds.has(amendment.questionId),
    ),
  };
}

/** Reuse generation shape/plan/authority grading; only its subjective references change.
 * Matching complete offered operations retains intensity-specific amendments rather than
 * accidentally accepting every intensity once a feeling kind has been broadened.
 */
export function gradeGeneratedReviewed(
  episode: ComplexEpisode,
  output: unknown,
  reviewedDenseScene: BenchmarkScene,
) {
  if (
    reviewedDenseScene.group?.episodeId !== episode.id ||
    reviewedDenseScene.group.view !== 'dense'
  )
    fail(episode.id, 'generation references require this episode’s dense view');
  const base = gradeGenerated(episode, output);
  if (!base.schemaValid) return base;
  // The shared generation grader has already established the complete schema.
  const value = output as GeneratedValue;
  const acceptedOutputs = (question: number) => {
    const id = `${reviewedDenseScene.id}-q${question}`;
    const test = reviewedDenseScene.cases.find((test) => test.id === id);
    if (!test || test.gold.type !== 'choice') return fail(id, 'missing choice reference');
    const offers = reviewedDenseScene.outputs?.[id];
    if (!offers || test.gold.accepted.some((key) => !Object.hasOwn(offers, key)))
      return fail(id, 'missing accepted structured output');
    return test.gold.accepted.map((key) => offers[key]);
  };
  const reactionKeys = [
    'kind',
    'policy',
    'source',
    'target',
    'intensity',
    'lifetimeGameMinutes',
  ] as const;
  return {
    ...base,
    referenceFeeling:
      base.reactionLegal &&
      acceptedOutputs(2).some(
        (offer) =>
          object(offer) &&
          (offer.kind === 'none'
            ? value.reaction.kind === 'none'
            : reactionKeys.every((key) => offer[key] === value.reaction[key])),
      ),
    referenceExpression: acceptedOutputs(3).some(
      (offer) => object(offer) && offer.style === value.expression,
    ),
  };
}
