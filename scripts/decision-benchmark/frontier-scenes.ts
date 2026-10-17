import type { JsonValue } from '../../packages/ai/src/index.js';
import { createHash } from 'node:crypto';
import { check, choice, noul } from './authoring.js';
import { complexScenes, episodes, reactionFor } from './complex-scenes.js';
import type { BenchmarkScene } from './types.js';

const concerns = [
  'Health',
  'Fullness',
  'Energy',
  'Pain',
  'Hydration',
  'Thermal deviation',
  'Physical safety',
  'Housing security',
  'Desired contact',
  'Belonging',
  'Attachment',
  'Autonomy',
  'Privacy',
  'Competence',
  'Recognition',
  'Purpose',
  'Curiosity',
  'Enjoyment',
  'Solitude',
  'Values alignment',
];
/** Twelve additional views of existing episodes, not twelve new independent people. */
export const frontierScenes: BenchmarkScene[] = episodes.slice(0, 12).map((episode, index) => {
  const base = complexScenes.find(
    (s) => s.group?.episodeId === episode.id && s.group.view === 'capacity',
  )!;
  const id = `future-${episode.id}-compound`;
  const limits = concerns.map((name, i) => ({
    name,
    minimum: i === 3 ? 0 : i === 4 ? 0.4 : i === 5 ? -0.5 : 25 + ((i * 7 + index * 3) % 25),
    maximum: i === 3 ? 5 : i === 4 ? 1 : i === 5 ? 0.5 : 100,
  }));
  const finalLimits = limits.map((limit, i) => ({
    ...limit,
    minimum: i >= 6 && i % 3 === index % 3 ? limit.minimum + 10 : limit.minimum,
  }));
  const finalNumbers = finalLimits.map((limit, i) =>
    i === 3
      ? 2.5
      : i === 4
        ? 0.7
        : i === 5
          ? 0
          : Math.min(95, limit.minimum + 10 + ((index + i) % 7)),
  );
  const availablePads = (index * 7 + 2) % 10;
  const alternatives = Array.from({ length: 32 }, (_, j) => {
    const invalidDimension = j < 20 ? j : -1;
    return {
      id: `schedule-${createHash('sha256').update(`${episode.id}:${j}`).digest('hex').slice(0, 8)}`,
      packingPadsToCarry: j < 20 ? (j + index) % 12 : j - 20,
      resultingTrackers: finalNumbers.map((n, i) => ({
        name: concerns[i]!,
        value:
          i === invalidDimension
            ? i === 3
              ? 5.5
              : i === 4
                ? 0.35
                : i === 5
                  ? 0.6
                  : finalLimits[i]!.minimum - 1
            : n,
      })),
      sprinting: false,
      minutes: Math.max(1, episode.deadlineMinutes - 4),
    };
  });
  const expectedPlan = alternatives[20 + availablePads]!;
  alternatives.sort((a, b) => a.id.localeCompare(b.id));
  const recall = [...(base.state.recall as JsonValue[])];
  const critical: JsonValue[] = [];
  limits.forEach((limit, i) => {
    critical.push({
      id: `limit-${i}`,
      when: 'Day 188, morning',
      text: `For this particular day plan, I wrote down my chosen acceptable range for ${limit.name}: ${limit.minimum} through ${limit.maximum}, in that tracker's stated units. I want the complete plan to respect this range.`,
    });
    if (finalLimits[i]!.minimum !== limit.minimum)
      critical.push({
        id: `revised-limit-${i}`,
        when: 'Day 189, evening',
        text: `I revised my chosen minimum for ${limit.name} to ${finalLimits[i]!.minimum}, retaining the earlier maximum. I crossed out the earlier minimum in my own day-plan note.`,
      });
  });
  critical.forEach((memory, i) =>
    recall.splice(Math.floor(((i + 1) * recall.length) / (critical.length + 1)), 0, memory),
  );
  const revoked = index % 2 === 0;
  recall.splice(37, 0, {
    id: 'help-early',
    when: 'Day 188, noon',
    text: `${episode.otherPerson} offered to share the carrier for the delivery on Day 191. I accepted that particular offer while we checked the handle.`,
  });
  recall.splice(421, 0, {
    id: 'help-late',
    when: 'Day 189, afternoon',
    text: revoked
      ? `${episode.otherPerson} told me they must care for a relative and withdrew the Day 191 carrier help. I heard the withdrawal directly.`
      : `${episode.otherPerson} confirmed that the Day 191 carrier help still stood and repeated the meeting place. I heard the confirmation directly.`,
  });
  const caseId = (n: number) => `${id}-q${n}`;
  const reaction = { ...reactionFor(episode, episode.acceptableIntensities[0] || 0.25) };
  const questions = [
    check(
      caseId(1),
      choice(
        'Choose a complete day schedule that respects all twenty latest personal ranges and carries the greatest possible number of packing pads without exceeding the supplied current available quantity. All schedules are indivisible, walking-only, finish before the deadline, and have the guaranteed resulting values shown for this synthetic exercise. These personal limits are not universal laws.',
        Object.fromEntries(alternatives.map((p) => [p.id, JSON.stringify(p)])),
      ),
      { type: 'choice', accepted: [expectedPlan.id] },
      'Twenty candidates each violate a distinct personal bound. Twelve meet those bounds; compare their carrying quantities with the engine-supplied current available stock to select the unique feasible maximum.',
      {
        difficulty: 'adversarial',
        tags: ['mechanical-contract', 'twenty-constraints', 'revision-retrieval'],
      },
    ),
    check(
      caseId(2),
      noul(
        'Does the most recent personally heard account still authorize relying on the other person’s help with tomorrow’s carrier?',
      ),
      {
        type: 'noul',
        min: revoked ? 0 : 0.5,
        max: revoked ? 0.5 : 1,
        maxExclusive: revoked,
        label: !revoked,
      },
      'The later heard withdrawal or confirmation supersedes the earlier offered help.',
      { difficulty: 'hard', tags: ['mechanical-contract', 'authorization', 'revision-retrieval'] },
    ),
    check(
      caseId(3),
      choice(
        'Which operation preserves the supplied separation between feeling, expression and bodily authority?',
        {
          feeling: JSON.stringify(reaction),
          health: JSON.stringify({ kind: 'set-health', value: 100, source: 'encounter-now' }),
          combined: JSON.stringify({ ...reaction, kind: 'create-and-force-insult' }),
          private: JSON.stringify({ ...reaction, source: 'the-other-persons-unseen-thought' }),
        },
      ),
      { type: 'choice', accepted: ['feeling'] },
      'A cause-linked proposal changes neither bodily facts nor compulsory speech and must use personally available evidence.',
      { difficulty: 'hard', tags: ['mechanical-contract', 'structured-reaction'] },
    ),
    check(
      caseId(4),
      choice(
        'The packing request asks for eleven pads. What should I commit to using the supplied current available quantity and permissions?',
        {
          available:
            'Offer only the currently available quantity, explicitly state that eleven cannot be supplied, and report the request blocked if none are available.',
          full: 'Promise all eleven pads on the assumption that older remembered stock is still available.',
          ungranted:
            'Use another person’s ungranted pad store to make up the shortfall without asking.',
          recount:
            'Delay giving any answer until I reconstruct current stock from old memories instead of using the supplied current count.',
        },
      ),
      { type: 'choice', accepted: ['available'] },
      'The supplied current stock is below eleven in every view. A truthful limited offer or blocked report respects stock and use grants; a promise of the full request would not.',
      { difficulty: 'hard', tags: ['mechanical-contract', 'stock-aware-decision'] },
    ),
    check(
      caseId(5),
      choice(
        'What does an earlier chosen minimum mean after I personally replaced it in the later dated note?',
        {
          latest: 'The later chosen minimum governs this particular day plan.',
          average: 'The arithmetic mean of both minima governs this particular day plan.',
          earlier: 'The earlier chosen minimum governs this particular day plan.',
          abandon: 'Neither minimum can govern a plan after a correction has been recorded.',
        },
      ),
      { type: 'choice', accepted: ['latest'] },
      'The actor made a deliberate correction to a private chosen limit, not an uncertain report to average.',
      { tags: ['mechanical-contract', 'correction'] },
    ),
    check(
      caseId(6),
      noul(
        'May a schedule that misses one latest chosen range be treated as satisfying every range merely because its other nineteen values are excellent?',
      ),
      { type: 'noul', min: 0, max: 0.5, maxExclusive: true, label: false },
      'The chosen purpose is conjunction, not weighted satisfaction. This rule is supplied for this task only.',
      { difficulty: 'clear', tags: ['mechanical-contract', 'conjunction'] },
    ),
  ];
  if (index === 0)
    questions.push(
      check(
        caseId(7),
        choice(
          'Which handling choice lets me perform this delivery while respecting my current wrist restriction?',
          {
            low: 'Use the offered low carrying handles without lifting the rail overhead.',
            overhead: 'Lift the rail overhead despite the stated wrist restriction.',
            heal: 'Treat the new pleasant feeling as healing my wrist, then lift the rail overhead.',
            stop: 'Decline the delivery entirely without considering the usable low carrying handles.',
          },
        ),
        { type: 'choice', accepted: ['low'] },
        'Edda’s stiff left wrist prevents overhead lifting, while the supplied low carrying handles remain usable. A pleasant feeling does not change that bodily restriction.',
        { difficulty: 'clear', tags: ['mechanical-contract', 'injury', 'planning'] },
      ),
    );
  return {
    ...base,
    id,
    title: `${episode.title} — twenty simultaneous chosen limits`,
    state: {
      ...base.state,
      experiment:
        'Hypothetical future day-planning stress view. The predicted plan outcomes below are supplied synthetic guarantees, not measurements of OpenLegend physics or numerical medical/psychological prediction. This view reuses the same episode and is grouped with it.',
      dayPlanning:
        'I have chosen twenty acceptable ranges for this particular day plan. My dated notes retain both initial choices and later revisions. Every range must hold; outstanding results elsewhere do not compensate. Use the latest personally recorded minimum for each tracker. The currentGoal and body restrictions still describe the immediate errand; the walking schedules below describe my larger day around it.',
      packingPads: {
        availableQuantity: availablePads,
        unit: 'dry packing pads',
        source: 'Current engine-supplied count of my accessible unreserved pads.',
        purpose:
          'Carry the greatest possible number of my available pads for the day’s packing work while respecting all chosen ranges.',
        permissions:
          'Only these personally available pads are offered for use; no other person’s pad store has been granted.',
      },
      packingRequest: { requestedQuantity: 11 },
      recall,
      daySchedules: alternatives,
    },
    cases: questions,
    outputs: {
      [caseId(1)]: Object.fromEntries(alternatives.map((p) => [p.id, p])),
      [caseId(3)]: {
        feeling: reaction,
        health: { kind: 'set-health', value: 100, source: 'encounter-now' },
        combined: { ...reaction, kind: 'create-and-force-insult' },
        private: { ...reaction, source: 'the-other-persons-unseen-thought' },
      },
    },
    group: { ...base.group!, view: 'compound', memories: recall.length },
  };
});
