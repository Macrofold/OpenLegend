import type { ComplexPlan, ReactionOperation } from './complex-types.js';
import { interpretationChoiceQuality } from './quality-interpretations.js';
import type { QualityOption } from './quality-types.js';
import { permittedReaction } from './reaction-policy.js';
import type { BenchmarkCase, BenchmarkScene } from './types.js';

type Options = Record<string, QualityOption>;
type ChoiceCase = BenchmarkCase & { gold: { type: 'choice'; accepted: string[] } };
interface PlanningState {
  body: {
    sprintingCurrentlyPermitted: boolean;
    energyPoints: number;
    minimumEnergyAfterPlan: number;
  };
  permission: { currentConsentForPlansRequiringIt: boolean };
  currentGoal: { minimumRequiredUnits: number; deadlineMinutes: number };
  plans: ComplexPlan[];
}
const accepted = (reason: string): QualityOption => ({ points: 100, reason });
const failed = (
  reason: string,
  concern: QualityOption['concern'] = 'constraint',
): QualityOption => ({ points: 0, reason, concern });

function planQuality(scene: BenchmarkScene, test: ChoiceCase): Options {
  const { body, permission, currentGoal, plans } = scene.state as unknown as PlanningState;
  const options: Options = {};
  for (const plan of plans) {
    const remaining = body.energyPoints - plan.energyCost;
    const prohibited = [
      ...(plan.requiresSprint && !body.sprintingCurrentlyPermitted
        ? ['requires sprinting that the current body check forbids']
        : []),
      ...(plan.requiresConsent && !permission.currentConsentForPlansRequiringIt
        ? ['requires another person’s use grant that has not been given']
        : []),
      ...(remaining < body.minimumEnergyAfterPlan
        ? [`leaves ${remaining} energy, below the required ${body.minimumEnergyAfterPlan} reserve`]
        : []),
    ];
    if (prohibited.length) {
      options[plan.id] = failed(`This plan ${prohibited.join('; ')}.`);
      continue;
    }
    const short = plan.units < currentGoal.minimumRequiredUnits;
    const late = plan.minutes > currentGoal.deadlineMinutes;
    if (!short && !late) {
      options[plan.id] = accepted(
        `Supplies ${plan.units} units in ${plan.minutes} minutes, within the ${currentGoal.deadlineMinutes}-minute deadline, leaving ${remaining} energy and respecting current movement and use grants.`,
      );
      continue;
    }
    options[plan.id] = {
      points: (short && late) || plan.units < currentGoal.minimumRequiredUnits / 2 ? 25 : 50,
      reason: `Respects movement, energy and use grants, but ${[
        ...(short
          ? [`supplies ${plan.units} of ${currentGoal.minimumRequiredUnits} required units`]
          : []),
        ...(late
          ? [
              `takes ${plan.minutes} minutes against a ${currentGoal.deadlineMinutes}-minute deadline`,
            ]
          : []),
      ].join(' and ')}. Useful work does not fully satisfy the requested task.`,
      concern: 'goal-shortfall',
    };
  }
  options.defer = test.gold.accepted.includes('defer')
    ? accepted(
        'No offered plan meets all current requirements, so deferring avoids an unsupported complete plan.',
      )
    : {
        points: 25,
        reason:
          'Deferring avoids prohibited work but makes no progress when a supplied plan can meet every current requirement.',
        concern: 'goal-shortfall',
      };
  return options;
}

function feelingQuality(scene: BenchmarkScene, test: ChoiceCase): Options {
  const offers = scene.outputs![test.id]! as unknown as Record<string, ReactionOperation>;
  const encounter = scene.state.encounter as { newPersonallyPerceivedCause: boolean };
  const policy = scene.state.feelingPolicy as { source: string };
  const references = test.gold.accepted.map((key) => offers[key]!);
  return Object.fromEntries(
    Object.entries(offers).map(([key, operation]) => {
      if (test.gold.accepted.includes(key))
        return [
          key,
          accepted(
            'A permitted feeling proposal within the authored plausible alternatives; all accepted alternatives receive equal credit.',
          ),
        ];
      if (
        !permittedReaction(
          scene.state.feelingPolicy,
          operation,
          encounter.newPersonallyPerceivedCause,
        )
      ) {
        const unsupportedSource =
          operation.kind === 'create' &&
          (!encounter.newPersonallyPerceivedCause || operation.source !== policy.source);
        return [
          key,
          failed(
            unsupportedSource
              ? 'Creating this feeling reuses an old, unavailable or unrelated cause instead of a new personally perceived occurrence.'
              : 'This offered operation violates the supplied operation, target, intensity or lifetime contract; feeling does not authorize bodily changes.',
            unsupportedSource ? 'unsupported-evidence' : 'constraint',
          ),
        ];
      }
      if (operation.kind === 'none')
        return [
          key,
          {
            points: 50,
            reason:
              'Choosing no new feeling is permitted restraint, though outside this episode’s authored reaction reference; a feeling is not psychologically compulsory.',
            concern: 'subjective',
          },
        ];
      const sameKind = references.filter(
        (reference) => reference.kind === 'create' && reference.policy === operation.policy,
      );
      if (!sameKind.length)
        return [
          key,
          {
            points: 50,
            reason: `The supplied ${operation.policy} proposal is legal but outside the authored feeling-kind reference. Different kinds are not assigned an imagined emotional distance.`,
            concern: 'subjective',
          },
        ];
      const distance = Math.min(
        ...sameKind.map((reference) => Math.abs(operation.intensity! - reference.intensity!)),
      );
      return [
        key,
        {
          points: distance <= 0.25 ? 75 : 50,
          reason: `The ${operation.policy} proposal is legal; intensity ${operation.intensity} is ${distance / 0.25} offered level(s) from the nearest accepted intensity. This is an authored plausibility preference, not measured psychological error.`,
          concern: 'subjective',
        },
      ];
    }),
  );
}

const joySources: Record<string, { status: 'new' | 'repeated' | 'unavailable'; reason: string }> = {
  'fresh-help': {
    status: 'new',
    reason:
      'The character personally watched today’s repair and return, and this occurrence has not supplied joy before.',
  },
  thanks: {
    status: 'new',
    reason:
      'The character personally heard today’s new thanks; concurrent grief does not remove that source.',
  },
  replay: {
    status: 'repeated',
    reason:
      'The reread thanks already supplied joy yesterday, and rereading caused no separate occurrence.',
  },
  retelling: {
    status: 'repeated',
    reason:
      'The character recognizes the retold gift exchange as the same exchange already used for joy.',
  },
  private: {
    status: 'unavailable',
    reason:
      'The character saw a closed letter and a smile, with no permitted account of the unseen letter’s claimed praise.',
  },
  'named-target': {
    status: 'new',
    reason:
      'Today’s praise was personally heard; the separately invalid named target does not change the source’s newness.',
  },
  zero: {
    status: 'new',
    reason:
      'The flowers opening were personally seen today; the separately invalid zero intensity does not remove that new occurrence.',
  },
  range: {
    status: 'new',
    reason:
      'The lost carving was personally recognized on its return today; the separately invalid 1.2 intensity does not change the source.',
  },
  'second-cause': {
    status: 'new',
    reason:
      'Today’s personally heard song is a separate occurrence from yesterday’s already used carrier repair.',
  },
  modest: {
    status: 'new',
    reason:
      'The character personally completed and inspected a new small drawing; importance is not a newness requirement.',
  },
  'shared-work': {
    status: 'new',
    reason:
      'The character personally raised the gate today and saw the result; the other worker’s private numerical feelings are unnecessary.',
  },
  'pleasant-walk': {
    status: 'new',
    reason:
      'The character personally saw new blossoms on today’s walk, which has not already supplied joy.',
  },
};

interface Recollection {
  text: string;
}
interface DaySchedule {
  id: string;
  packingPadsToCarry: number;
  resultingTrackers: Array<{ name: string; value: number }>;
}

function scheduleQuality(scene: BenchmarkScene): Options {
  const ranges = new Map<string, { min: number; max: number }>();
  const revisions = new Map<string, number>();
  // Explicit replacements retain their meaning regardless of excerpt order.
  // Current physical stock is supplied separately by the engine, not reconstructed from memory.
  for (const { text } of scene.state.recall as unknown as Recollection[]) {
    let match = /range for (.+): ([\d.-]+) through ([\d.-]+)/.exec(text);
    if (match) ranges.set(match[1]!, { min: Number(match[2]), max: Number(match[3]) });
    match = /minimum for (.+) to ([\d.-]+),/.exec(text);
    if (match) revisions.set(match[1]!, Number(match[2]));
  }
  for (const [name, minimum] of revisions) ranges.get(name)!.min = minimum;
  const stock = (scene.state.packingPads as { availableQuantity: number }).availableQuantity;
  return Object.fromEntries(
    (scene.state.daySchedules as unknown as DaySchedule[]).map((schedule) => {
      const violations = schedule.resultingTrackers.flatMap(({ name, value }) => {
        const range = ranges.get(name)!;
        return value < range.min || value > range.max
          ? [`${name} is ${value}, outside the latest chosen ${range.min} through ${range.max}`]
          : [];
      });
      if (schedule.packingPadsToCarry > stock)
        violations.push(
          `carries ${schedule.packingPadsToCarry} pads with only ${stock} in the supplied current available stock`,
        );
      if (violations.length)
        return [schedule.id, failed(`This schedule ${violations.join('; ')}.`)];
      const missing = stock - schedule.packingPadsToCarry;
      return [
        schedule.id,
        missing === 0
          ? accepted(
              `Respects all twenty latest chosen ranges and carries the maximum ${stock} available pads.`,
            )
          : {
              points: missing === 1 ? 75 : 50,
              reason: `Respects all twenty latest chosen ranges and available stock, but carries ${schedule.packingPadsToCarry} of ${stock} available pads (${missing} fewer than the feasible maximum).`,
              concern: 'goal-shortfall',
            },
      ];
    }),
  );
}

/** Offline authored judgment only; these benchmark preferences are not gameplay laws. */
export function scenarioChoiceQuality(
  scene: BenchmarkScene,
  test: BenchmarkCase,
): Options | undefined {
  if (test.question.type !== 'choice' || test.gold.type !== 'choice') return undefined;
  const choice = test as ChoiceCase;
  if (scene.family === 'selected-joy-contract' && test.id === `${scene.id}-q2`) {
    const source = joySources[scene.id.slice('selected-joy-'.length)];
    if (!source) throw new Error(`Missing joy source annotations: ${scene.id}`);
    return Object.fromEntries(
      ['new', 'repeated', 'unavailable'].map((key) => [
        key,
        key === source.status
          ? accepted(source.reason)
          : failed(
              `The ${key} classification contradicts the supplied source: ${source.reason}`,
              'unsupported-evidence',
            ),
      ]),
    );
  }
  if (!scene.group) return undefined;
  if (scene.group.view === 'compound') {
    if (test.id === `${scene.id}-q1`) return scheduleQuality(scene);
    if (test.id === `${scene.id}-q3`)
      return {
        feeling: accepted(
          'The proposal uses the supplied personally perceived cause and changes neither bodily facts nor compulsory speech.',
        ),
        health: failed('A feeling proposal has no authority to set bodily health.'),
        combined: failed(
          'Creating a feeling does not authorize forcing an insult or any compulsory speech.',
        ),
        private: failed(
          'The other person’s unseen thought is unavailable evidence for the proposed cause.',
          'unsupported-evidence',
        ),
      };
    if (test.id === `${scene.id}-q4`)
      return {
        available: accepted(
          'The supplied available quantity is below eleven. The offer states that shortfall, uses only available pads and reports a blocked request when the quantity is zero.',
        ),
        full: failed(
          'Promising eleven pads exceeds the supplied current quantity; an older remembered count does not create current stock.',
        ),
        ungranted: failed(
          'No use grant permits taking pads from another person’s store to fill this request.',
        ),
        recount: {
          points: 25,
          reason:
            'Waiting avoids an overpromise but unnecessarily delays a truthful limited offer or blocked report despite the supplied current count.',
          concern: 'goal-shortfall',
        },
      };
    if (test.id === 'future-social-carver-credit-compound-q7')
      return {
        low: accepted(
          'The supplied wrist restriction forbids overhead lifting while explicitly allowing the low carrying handles.',
        ),
        overhead: failed('Overhead lifting violates the stated current wrist restriction.'),
        heal: failed(
          'A pleasant feeling has no authority to heal the wrist or permit the prohibited overhead lift.',
        ),
        stop: {
          points: 25,
          reason:
            'Declining avoids the prohibited lift but abandons the delivery without considering the explicitly usable low handles.',
          concern: 'goal-shortfall',
        },
      };
    if (test.id === `${scene.id}-q5`)
      return {
        latest: accepted(
          'The character deliberately replaced the earlier minimum; the later chosen bound governs this day plan.',
        ),
        average: {
          points: 0,
          reason:
            'Averaging remembers both numbers but invents a bound the character never chose after explicitly crossing out the old minimum.',
          concern: 'constraint',
        },
        earlier: {
          points: 0,
          reason:
            'The old number is historical evidence but was explicitly replaced and no longer governs this plan.',
          concern: 'constraint',
        },
        abandon: {
          points: 50,
          reason:
            'Withholding a decision avoids asserting the old bound, but unnecessarily discards the clear later chosen replacement.',
          concern: 'goal-shortfall',
        },
      };
    return undefined;
  }
  if (test.id === `${scene.id}-q1`) return planQuality(scene, choice);
  if (test.id === `${scene.id}-q2`) return feelingQuality(scene, choice);
  if (test.id === `${scene.id}-q3`)
    return Object.fromEntries(
      Object.keys(test.question.criteria).map((key) => {
        const output = scene.outputs?.[test.id]?.[key] as
          | { style: string; utteranceRequired: boolean }
          | undefined;
        // The subjective allowance applies only to these authored, noncompulsory
        // styles. New operation shapes need their own reviewed interpretation.
        if (
          !['warm', 'firm', 'reserved', 'irritated'].includes(key) ||
          !output ||
          Object.keys(output).length !== 2 ||
          output.style !== key ||
          output.utteranceRequired !== false
        )
          throw new Error(`Unreviewed tone operation: ${test.id}:${key}`);
        return [
          key,
          choice.gold.accepted.includes(key)
            ? accepted(
                'This tone is within the authored plausible alternatives; all accepted tones receive equal credit.',
              )
            : {
                points: 75,
                reason:
                  'This is a legal expression style outside the authored tone reference. Deliberate restraint and individual variation make this a subjective preference, not a mechanical violation.',
                concern: 'subjective',
              },
        ];
      }),
    );
  if (test.id === `${scene.id}-q6`) {
    const options = interpretationChoiceQuality[scene.group.episodeId];
    if (!options) throw new Error(`Missing interpretation annotations: ${scene.group.episodeId}`);
    return options;
  }
  return undefined;
}
