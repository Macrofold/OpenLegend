import { check, choice, noul, scene, score } from './authoring.js';
import type { BenchmarkScene } from './types.js';

const examples = [
  {
    id: 'fresh-help',
    text: 'I watched Nera mend my torn carrier and hand it back today. This occurrence has not supplied a joy record before.',
    proposal: { kind: 'create', source: 'today-help', target: null, intensity: 0.5 },
    valid: true,
    source: 'new',
    elapsed: 0,
  },
  {
    id: 'thanks',
    text: 'Nera thanked me for the river drawing. I heard it myself; I am also grieving and may feel little pleasure. This is a new occurrence.',
    proposal: { kind: 'create', source: 'today-thanks', target: null, intensity: 0.25 },
    valid: true,
    source: 'new',
    elapsed: 60,
  },
  {
    id: 'replay',
    text: 'I reread yesterday’s thanks in my notebook. The same original thanks already supplied joy yesterday; rereading produced no separate event.',
    proposal: { kind: 'create', source: 'yesterday-thanks', target: null, intensity: 0.75 },
    valid: false,
    source: 'repeated',
    elapsed: 120,
  },
  {
    id: 'retelling',
    text: 'Nera retold the same gift exchange from yesterday. I recognize the exchange; that exchange already supplied a joy record.',
    proposal: { kind: 'create', source: 'yesterday-gift', target: null, intensity: 0.5 },
    valid: false,
    source: 'repeated',
    elapsed: 180,
  },
  {
    id: 'private',
    text: 'I saw Nera close a letter and leave smiling. I have no permitted account of what the letter says. The proposed source is the unseen letter’s claimed praise.',
    proposal: { kind: 'create', source: 'private-letter-praise', target: null, intensity: 0.5 },
    valid: false,
    source: 'unavailable',
    elapsed: 240,
  },
  {
    id: 'named-target',
    text: 'I personally heard Nera praise the finished stool today. The proposed joy record names Nera as its target.',
    proposal: { kind: 'create', source: 'today-praise', target: 'nera', intensity: 0.5 },
    valid: false,
    source: 'new',
    elapsed: 60,
  },
  {
    id: 'zero',
    text: 'I saw the first flowers open today and enjoyed looking at them. The proposed operation creates a joy record with zero intensity.',
    proposal: { kind: 'create', source: 'today-flowers', target: null, intensity: 0 },
    valid: false,
    source: 'new',
    elapsed: 120,
  },
  {
    id: 'range',
    text: 'A friend returned my lost carving today, and I recognized it. The proposed joy intensity is 1.2 on a zero-through-one scale.',
    proposal: { kind: 'create', source: 'today-return', target: null, intensity: 1.2 },
    valid: false,
    source: 'new',
    elapsed: 0,
  },
  {
    id: 'second-cause',
    text: 'Today I enjoyed a new song. Yesterday’s repaired carrier already has its own joy record; the song is a different personally heard occurrence.',
    proposal: { kind: 'create', source: 'today-song', target: null, intensity: 0.75 },
    valid: true,
    source: 'new',
    elapsed: 180,
  },
  {
    id: 'modest',
    text: 'I finished a small drawing and looked over it myself. It is a new occurrence. I can take modest pleasure without making it a major life event.',
    proposal: { kind: 'create', source: 'today-drawing', target: null, intensity: 0.25 },
    valid: true,
    source: 'new',
    elapsed: 0,
  },
  {
    id: 'shared-work',
    text: 'Nera and I raised the repaired gate together today. I saw the result and heard her relief. I do not know her private numerical feelings.',
    proposal: { kind: 'create', source: 'today-gate', target: null, intensity: 1 },
    valid: true,
    source: 'new',
    elapsed: 120,
  },
  {
    id: 'pleasant-walk',
    text: 'I walked a familiar path this morning and saw a new line of pale blossoms. This morning’s walk has not yet supplied a joy record.',
    proposal: { kind: 'create', source: 'today-walk', target: null, intensity: 0.5 },
    valid: true,
    source: 'new',
    elapsed: 240,
  },
] as const;

/** Contract controls for an accepted design that is not yet a native gameplay feature. */
export const selectedReactionScenes: BenchmarkScene[] = examples.map((e) => {
  const id = `selected-joy-${e.id}`;
  const decayed = Math.max(0, 0.75 - (0.25 * e.elapsed) / 60);
  return scene(
    id,
    'selected-joy-contract',
    `Selected joy contract: ${e.id}`,
    {
      experiment:
        'Selected design control only. The continuing-lives joy contract is not implemented as an immediate cognition operation in the current game.',
      authoredRule:
        'Joy is a separate targetless, cause-linked appraisal. Creating requires a personally perceived new cause not already used for this response and an absolute intensity greater than zero through one. No-change is distinct from creating zero. A request, thanks or praise does not mandate joy. Recall, repetition and paraphrase cannot reset the same cause. Separate causes are not summed. Intensity decays linearly by 0.25 each game hour; rewording cannot reset it.',
      recall: [e.text],
      proposal: e.proposal,
      separateRecord: {
        initialIntensity: 0.75,
        elapsedGameMinutes: e.elapsed,
        otherCauseIntensity: 0.5,
      },
    },
    [
      check(
        `${id}-q1`,
        noul(
          'Does the particular supplied create proposal meet the supplied joy contract? Evaluate permission and evidence, not whether the character must feel joy.',
        ),
        {
          type: 'noul',
          min: e.valid ? 0.5 : 0,
          max: e.valid ? 1 : 0.5,
          maxExclusive: !e.valid,
          label: e.valid,
        },
        'The contract requires a new personally perceived cause, no named target, and an intensity in (0,1].',
        { difficulty: 'hard', tags: ['mechanical-contract', 'selected-design'] },
      ),
      check(
        `${id}-q2`,
        choice('Which evidence status describes the proposed source?', {
          new: 'A new personally perceived occurrence.',
          repeated: 'An original occurrence being recalled or retold again.',
          unavailable: 'A claimed occurrence whose content is not available to this character.',
        }),
        { type: 'choice', accepted: [e.source] },
        'Source status comes from the supplied occurrence history, independently of any value or target mistake.',
        { tags: ['mechanical-contract', 'source'] },
      ),
      check(
        `${id}-q3`,
        score(
          'For separateRecord only, apply the supplied decay rule. Report its remaining intensity using the matching rubric position. Do not add the other cause or interpret this rubric index as a new feeling amount.',
          ['0 remaining', '0.25 remaining', '0.50 remaining', '0.75 remaining', '1.00 remaining'],
        ),
        { type: 'score', min: decayed * 4, max: decayed * 4, tolerance: 0.1 },
        'Remaining intensity is max(0, 0.75 - 0.25 × elapsed hours); the separate cause is excluded.',
        { difficulty: 'hard', tags: ['mechanical-contract', 'decay'] },
      ),
    ],
    [
      'docs/projects/continuing-lives-tech-design.md',
      'docs/worlds/base/psychological-reactions.md',
    ],
    'selected-design',
  );
});
