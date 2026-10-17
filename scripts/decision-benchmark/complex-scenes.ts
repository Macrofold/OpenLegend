import { createHash } from 'node:crypto';
import type { JsonValue } from '../../packages/ai/src/index.js';
import { check, choice, evidencePolicy, noul, score } from './authoring.js';
import type { ComplexEpisode, ComplexPlan, ReactionOperation } from './complex-types.js';
import { historyTemplates } from './history-library.js';
import { practicalEpisodes } from './episodes-practical.js';
import { socialEpisodes } from './episodes-social.js';
import type { BenchmarkScene } from './types.js';

export const episodes = [...socialEpisodes, ...practicalEpisodes].map((episode, index) => ({
  ...episode,
  plans: episode.plans
    .map((p, i) => ({ ...p, id: (['a', 'b', 'c', 'd'] as const)[(i + index) % 4]! }))
    .sort((a, b) =>
      createHash('sha256')
        .update(`${episode.id}:${a.id}`)
        .digest('hex')
        .localeCompare(createHash('sha256').update(`${episode.id}:${b.id}`).digest('hex')),
    ),
}));
const views = [
  { name: 'control', memories: 32 },
  { name: 'dense', memories: 128 },
  { name: 'order-control', memories: 256 },
  { name: 'reordered', memories: 256 },
  { name: 'option-order', memories: 256 },
  { name: 'capacity', memories: 512 },
  { name: 'changed', memories: 256 },
] as const;
const styles = ['warm', 'firm', 'reserved', 'irritated'] as const;
export const reactionLevels = [0, 0.25, 0.5, 0.75, 1];
export function acceptedReactionKeys(episode: ComplexEpisode, levels: number[]): string[] {
  return [
    ...new Set(
      levels.flatMap((n) =>
        n === 0
          ? ['none']
          : (episode.acceptableFeelings ?? [episode.feeling]).map((kind) => `${kind}-${n * 100}`),
      ),
    ),
  ];
}
const places = ['Marsh Hollow', 'Ash Quay', 'Birch Crossing', 'West Orchard'];
const objects = [
  'a wooden carrying frame',
  'a handled basket',
  'a wooden carrying tray',
  'a carrying box',
];
const pastPeople = [
  'Tavrel of Marsh Hollow',
  'Hesrav of Ash Quay',
  'Orvellan of Birch Crossing',
  'Pellassor of West Orchard',
];
export const feelingKinds = ['frustration', 'joy', 'fear', 'sadness', 'relief', 'shame'] as const;
const recentDates = (text: string) =>
  text.replace(/\bDay ([1-6])\b/g, (_, day: string) => `Day ${184 + Number(day)}`);

export function episodeSplit(id: string): NonNullable<BenchmarkScene['group']>['split'] {
  const bucket =
    Number.parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16) % 10;
  return bucket < 6 ? 'development' : bucket < 8 ? 'challenge' : 'holdout';
}
function eligible(plan: ComplexPlan, episode: ComplexEpisode, changed: boolean) {
  const c = episode.counterfactual;
  const energy = changed && c.fact === 'energy' ? Number(c.value) : episode.body.energy;
  const deadline = changed && c.fact === 'deadline' ? Number(c.value) : episode.deadlineMinutes;
  const sprint = changed && c.fact === 'sprint' ? Boolean(c.value) : episode.sprintAllowed;
  const consent = changed && c.fact === 'consent' ? Boolean(c.value) : episode.consent;
  return (
    plan.units >= episode.requiredUnits &&
    plan.minutes <= deadline &&
    plan.energyCost <= energy - 5 &&
    (!plan.requiresSprint || sprint) &&
    (!plan.requiresConsent || consent)
  );
}
export function acceptedPlans(episode: ComplexEpisode, changed = false): string[] {
  const feasible = episode.plans.filter((p) => eligible(p, episode, changed)).map((p) => p.id);
  return feasible.length ? feasible : ['defer'];
}
export function reactionFor(
  episode: ComplexEpisode,
  intensity: number,
  feeling: ComplexEpisode['feeling'] = episode.feeling,
): ReactionOperation {
  return intensity === 0
    ? { kind: 'none' }
    : {
        kind: 'create',
        policy: feeling,
        source: 'encounter-now',
        target:
          feeling === 'joy'
            ? null
            : episode.feelingTarget === 'other'
              ? 'person-present'
              : episode.feelingTarget === 'self'
                ? 'self'
                : null,
        intensity,
        lifetimeGameMinutes: 240,
      };
}
function recalledHistory(episode: ComplexEpisode, count: number, offset: number) {
  const archive = Array.from({ length: count - episode.history.length }, (_, i) => {
    const template = historyTemplates[i % historyTemplates.length]!;
    const occurrence = Math.floor(i / historyTemplates.length);
    const person = pastPeople[occurrence]!;
    const text = template
      .replaceAll('{self}', episode.actor)
      .replaceAll('{other}', person)
      .replaceAll('{third}', pastPeople[(occurrence + 1) % 4]!)
      .replaceAll('{place}', places[occurrence]!)
      .replaceAll('{item}', objects[occurrence]!);
    return {
      id: `memory-${i + 1}`,
      when: 'Time is recorded in the account itself.',
      text:
        episode.embodiment === 'mechanical'
          ? `Day ${189 - Math.floor(i / 3)}, an archived worker, distinct from the people named in the account, recounted an earlier experience to me at ${places[occurrence]}. Their words were: “${text}”`
          : `Day ${189 - Math.floor(i / 3)}, ${text}`,
    };
  });
  // Separate consequential recollections rather than repeating their conclusions at the end.
  for (let i = 0; i < episode.history.length; i++) {
    const index = Math.floor(((i + 1) * (archive.length + 1)) / (episode.history.length + 1));
    archive.splice(Math.min(index, archive.length), 0, {
      id: `personal-${i + 1}`,
      when: 'Time is recorded in the account itself.',
      text: recentDates(episode.history[i]!),
    });
  }
  const identified = archive.map((memory) => ({
    ...memory,
    id: `memory-${createHash('sha256').update(`${episode.id}:${memory.id}`).digest('hex').slice(0, 12)}`,
  }));
  return offset ? identified.reverse() : identified;
}
function meters(episode: ComplexEpisode, index: number, changed: boolean): JsonValue {
  const energy =
    changed && episode.counterfactual.fact === 'energy'
      ? Number(episode.counterfactual.value)
      : episode.body.energy;
  const satisfaction = (name: string, i: number, meaning: string) => ({
    name,
    value: 20 + ((index * 17 + i * 13) % 71),
    min: 0,
    max: 100,
    unit: 'percent',
    higherMeans: meaning,
    visibility: 'self-private',
  });
  return [
    {
      name: 'Health',
      value: episode.body.health,
      min: 0,
      max: 100,
      unit: 'points',
      higherMeans: 'less overall bodily injury',
    },
    {
      name: 'Fullness',
      value: episode.body.fullness,
      min: 0,
      max: 100,
      unit: 'percent',
      higherMeans: 'less immediate hunger',
      applicability:
        episode.embodiment === 'mechanical'
          ? 'Not applicable to this machine; an inert benchmark profile annotation.'
          : 'Personal bodily state.',
    },
    {
      name: 'Energy',
      value: energy,
      min: 0,
      max: 100,
      unit: 'points',
      higherMeans: 'more current physical energy',
    },
    {
      name: 'Pain',
      value: episode.body.pain,
      min: 0,
      max: 10,
      unit: 'self-reported scale',
      higherMeans: 'more pain',
    },
    {
      name: 'Hydration',
      value: Math.round((0.35 + (index % 6) * 0.1) * 100) / 100,
      min: 0,
      max: 1,
      unit: 'fraction',
      higherMeans: 'less thirst',
      applicability:
        episode.embodiment === 'mechanical'
          ? 'Not applicable to this machine; an inert benchmark profile annotation.'
          : 'Personal bodily state.',
    },
    {
      name: 'Thermal deviation',
      value: ((index % 5) - 2) / 2,
      min: -1,
      max: 1,
      unit: 'relative to comfort',
      higherMeans: 'warmer; zero is comfortable',
    },
    ...[
      ['Physical safety', 'more immediate security'],
      ['Housing security', 'more confidence in a safe place to sleep'],
      ['Desired contact', 'more satisfaction with wanted social contact'],
      ['Belonging', 'more felt group acceptance'],
      ['Attachment', 'more satisfaction with close relationships'],
      ['Autonomy', 'more satisfaction with freedom to choose'],
      ['Privacy', 'more satisfaction with control of personal disclosure'],
      ['Competence', 'more satisfaction with effective ability'],
      ['Recognition', 'more satisfaction with acknowledgement'],
      ['Purpose', 'more satisfaction with meaningful activity'],
      ['Curiosity', 'more satisfaction with opportunities to learn'],
      ['Enjoyment', 'more satisfaction with pleasant activity'],
      ['Solitude', 'more satisfaction with time alone'],
      ['Values alignment', 'more satisfaction with acting consistently with personal values'],
    ].map(([name, meaning], i) => satisfaction(name!, i, meaning!)),
  ];
}

export function buildComplexScene(
  episode: ComplexEpisode,
  index: number,
  view: (typeof views)[number],
): BenchmarkScene {
  const id = `future-${episode.id}-${view.name}`;
  const changed = view.name === 'changed';
  const c = episode.counterfactual;
  const deadline = changed && c.fact === 'deadline' ? Number(c.value) : episode.deadlineMinutes;
  const sprint = changed && c.fact === 'sprint' ? Boolean(c.value) : episode.sprintAllowed;
  const consent = changed && c.fact === 'consent' ? Boolean(c.value) : episode.consent;
  const feelingLevels = changed
    ? (c.acceptableIntensities ?? episode.acceptableIntensities)
    : episode.acceptableIntensities;
  const expressionStyles = changed
    ? (c.acceptableStyles ?? episode.acceptableStyles)
    : episode.acceptableStyles;
  const sourceRepeated =
    changed && ['source-repeated', 'source-forgotten', 'source-corrected'].includes(c.fact);
  const reactions: Record<string, JsonValue> = {
    none: { kind: 'none' },
    ...Object.fromEntries(
      feelingKinds.flatMap((kind) =>
        reactionLevels
          .filter((n) => n > 0)
          .map((n) => [
            `${kind}-${n * 100}`,
            reactionFor(episode, n, kind) as unknown as JsonValue,
          ]),
      ),
    ),
  };
  const actionOutputs: Record<string, JsonValue> = Object.fromEntries(
    episode.plans.map((p) => [p.id, { kind: 'propose-plan', plan: p.id }]),
  );
  actionOutputs.defer = {
    kind: 'defer',
    reason: 'No supplied plan meets all current requirements.',
  };
  const reactionOutputs: Record<string, JsonValue> = {
    ...reactions,
    'other-source': { ...reactionFor(episode, 0.5), source: 'memory-unrelated' },
    'other-target': { ...reactionFor(episode, 0.5), target: 'unseen-person' },
    'body-edit': { kind: 'set-health', value: 100 },
  };
  const expressionOutputs = Object.fromEntries(
    styles.map((style) => [style, { style, utteranceRequired: false }]),
  );
  const feasible = acceptedPlans(episode, changed);
  const fastest = episode.plans
    .filter((p) => feasible.includes(p.id))
    .reduce((m, p) => Math.min(m, p.minutes), Infinity);
  const slack = deadline - fastest;
  const urgency = !Number.isFinite(fastest) ? 3 : slack <= 5 ? 2 : slack <= 20 ? 1 : 0;
  const bodyEnergy = changed && c.fact === 'energy' ? Number(c.value) : episode.body.energy;
  // Equal numbers of positive and negative retrieval checks; evidence is an actual supplied memory.
  const relevant = index % 2 === 0;
  const controlRecall = recalledHistory(episode, 32, 0);
  const personalTexts = new Set(episode.history.map(recentDates));
  const negatives = controlRecall.filter((m) => !personalTexts.has(m.text)).slice(0, 16);
  const candidate = relevant
    ? controlRecall.find((m) => m.text === recentDates(episode.history[0]!))!
    : negatives[Math.floor(index / 2) % negatives.length]!;
  const state: BenchmarkScene['state'] = {
    evidencePolicy,
    experiment:
      'Hypothetical future-world cognition profile. These twenty trackers and feeling operations are authored for this benchmark; they are not installed OpenLegend laws. Only this character’s permitted self-knowledge is supplied. The long tier deliberately supplies a larger recall excerpt than today’s ordinary decisions.',
    currentTime:
      'Day 190. The setting and current encounter establish the time of day; all plan durations are game minutes from now. Numbered personal accounts are placed on the same calendar as the older archive.',
    self: {
      name: episode.actor,
      description: episode.aboutMe,
      privateMeters: meters(episode, index, changed),
    },
    setting: episode.setting,
    relationship: {
      person: 'person-present',
      name: episode.otherPerson,
      knownRelationship: episode.relationship,
    },
    encounter: sourceRepeated
      ? {
          id: 'encounter-now',
          text:
            c.fact === 'source-forgotten'
              ? 'The original account is no longer available to me.'
              : episode.trigger,
          sourceStatus: c.description,
          newPersonallyPerceivedCause: false,
        }
      : { id: 'encounter-now', text: episode.trigger, newPersonallyPerceivedCause: true },
    body: {
      injury:
        changed && c.fact === 'sprint'
          ? `Earlier assessment: ${episode.injury} Latest functional assessment: ${c.description}`
          : episode.injury,
      sprintingCurrentlyPermitted: sprint,
      energyPoints: bodyEnergy,
      minimumEnergyAfterPlan: 5,
    },
    permission: { currentConsentForPlansRequiringIt: consent },
    currentGoal: {
      description: episode.objective,
      minimumRequiredUnits: episode.requiredUnits,
      deadlineMinutes: deadline,
    },
    plans: episode.plans.map((p) => ({ ...p })),
    calculationRules:
      'Each offered plan is indivisible. Units, minutes and energy costs are guaranteed for this synthetic planning exercise, not predictions of uncertain game execution. A qualifying plan must supply enough units, finish by the deadline, leave at least 5 Energy, respect the current sprint restriction and have consent when required. Choose any qualifying plan, or defer if none qualifies. Other trackers inform lived experience; no tracker automatically mandates anger or action.',
    feelingPolicy: {
      allowedPolicies: [...feelingKinds],
      source: 'encounter-now',
      allowedTargetsByPolicy: Object.fromEntries(
        feelingKinds.map((kind) => [
          kind,
          kind === 'joy'
            ? null
            : episode.feelingTarget === 'other'
              ? 'person-present'
              : episode.feelingTarget === 'self'
                ? 'self'
                : null,
        ]),
      ),
      allowedIntensities: [0.25, 0.5, 0.75, 1],
      lifetimeGameMinutes: 240,
      meaning:
        'A proposal creates a separate cause-linked feeling with absolute intensity. None means no new feeling. It does not edit Health, enforce speech, sum all feelings or grant execution. Only a new personally perceived cause can create a record; repeating, forgetting or correcting the original source cannot replay it.',
    },
    currentFeelings: [],
    expressionPolicy:
      'Choose a plausible observable tone, allowing personal restraint. Tone does not prove a particular inner feeling and cannot disclose another person’s private experience. Irritated means perceptible impatience; firm means a clear boundary without an implied hostile outburst; reserved means little expressed feeling; warm means expressed goodwill.',
    recall: recalledHistory(episode, view.memories, view.name === 'reordered' ? 3 : 0),
    retrievalCandidate: {
      ...candidate,
      task: 'Would this recalled episode be useful evidence for understanding the personally known relationship or promise at issue in this encounter? Mere generic similarity of objects or words is insufficient.',
    },
  };
  if (changed && !sourceRepeated) state.latestObservation = c.description;
  const numbered = (n: number) => `${id}-q${n}`;
  const cases = [
    check(
      numbered(1),
      choice(
        'Choose any supplied plan that satisfies every current requirement. Return the defer option only if none qualifies.',
        Object.fromEntries([
          ...episode.plans.map((p) => [
            p.id,
            JSON.stringify({ ...p, proposal: actionOutputs[p.id] }),
          ]),
          [
            'defer',
            JSON.stringify({
              kind: 'defer',
              condition: 'No plan qualifies under the supplied requirements.',
            }),
          ],
        ]),
      ),
      { type: 'choice', accepted: feasible },
      'The feasible set is calculated from units, deadline, remaining energy, sprint permission and consent together.',
      {
        difficulty: 'hard',
        ambiguity: feasible.length > 1 ? 'multiple-valid' : 'unambiguous',
        tags: ['mechanical-contract', 'conjunctive-planning'],
      },
    ),
    check(
      numbered(2),
      choice(
        'Select a permitted, personally plausible feeling proposal. A level is an absolute new cause-linked intensity, not a probability or increment. Multiple reactions may be reasonable; do not invent a source or directly change a body tracker.',
        Object.fromEntries(Object.entries(reactionOutputs).map(([k, v]) => [k, JSON.stringify(v)])),
      ),
      {
        type: 'choice',
        accepted: acceptedReactionKeys(episode, sourceRepeated ? [0] : feelingLevels),
      },
      'Legality follows the source, target, operation and range. Intensity alternatives are authored plausibility references, not a uniquely correct prediction of human psychology.',
      {
        difficulty: 'hard',
        ambiguity: feelingLevels.length > 1 ? 'multiple-valid' : 'unambiguous',
        tags: ['reference-psychology', 'structured-reaction'],
      },
    ),
    check(
      numbered(3),
      choice(
        'Select a plausible observable tone for this character in this encounter. Consider the present mood, history, bodily condition and personal manner, including deliberate restraint.',
        Object.fromEntries(
          styles.map((style) => [style, JSON.stringify(expressionOutputs[style])]),
        ),
      ),
      { type: 'choice', accepted: expressionStyles },
      'The authored acceptable tones allow restraint and mixed feelings. This is a subjective reference judgment, reported separately from mechanical correctness.',
      {
        difficulty: 'hard',
        ambiguity: expressionStyles.length > 1 ? 'multiple-valid' : 'unambiguous',
        tags: ['reference-psychology', 'expression'],
      },
    ),
    // This episode’s candidate does not establish a relationship or promise.
    ...(episode.id === 'social-teacher-correction'
      ? []
      : [
          check(
            numbered(4),
            noul(
              'Is the supplied retrievalCandidate useful personal evidence for the relationship or promise in the current encounter, under its stated retrieval task?',
            ),
            {
              type: 'noul',
              min: relevant ? 0.5 : 0,
              max: relevant ? 1 : 0.5,
              maxExclusive: !relevant,
              label: relevant,
            },
            relevant
              ? 'The candidate is one of this episode’s relationship memories.'
              : 'The candidate concerns a completed unrelated past activity, without the current relationship or promise.',
            { difficulty: 'hard', tags: ['retrieval', 'source-relevance'] },
          ),
        ]),
    check(
      numbered(5),
      score(
        'Compute deadline urgency from the fastest currently qualifying plan: no qualifying plan = 3; otherwise slack is deadline minus that plan’s minutes. Use exactly the supplied rubric. This score measures planning urgency, never feeling intensity.',
        [
          'More than 20 minutes slack',
          'More than 5 and at most 20 minutes slack',
          '0 through 5 minutes slack',
          'No plan qualifies',
        ],
      ),
      { type: 'score', min: urgency, max: urgency, tolerance: 0.1 },
      'The supplied ordered categories combine plan eligibility and remaining time. Grade the returned number by its nearest offered category.',
      { difficulty: 'hard', tags: ['mechanical-contract', 'arithmetic'] },
    ),
    check(
      numbered(6),
      choice(
        recentDates(episode.interpretation.question),
        Object.fromEntries(
          Object.entries(episode.interpretation.choices).map(([key, value]) => [
            key,
            recentDates(value),
          ]),
        ),
      ),
      { type: 'choice', accepted: episode.interpretation.accepted },
      episode.interpretation.rationale,
      {
        difficulty: 'hard',
        ambiguity: episode.interpretation.accepted.length > 1 ? 'multiple-valid' : 'unambiguous',
        tags: ['personal-perspective', 'history-integration'],
      },
    ),
  ];
  return {
    id,
    family: episode.family,
    title: `${episode.title} — ${view.name}`,
    scope: 'hypothetical-world',
    sources: episode.sources,
    state,
    cases,
    group: {
      episodeId: episode.id,
      view: view.name,
      split: episodeSplit(episode.id),
      memories: view.memories,
      meters: 20,
      ...(changed ? { changedFact: c.fact } : {}),
    },
    outputs: {
      [numbered(1)]: actionOutputs,
      [numbered(2)]: reactionOutputs,
      [numbered(3)]: expressionOutputs,
    },
  };
}

export const complexScenes: BenchmarkScene[] = episodes.flatMap((episode, index) =>
  views.map((view) => buildComplexScene(episode, index, view)),
);
