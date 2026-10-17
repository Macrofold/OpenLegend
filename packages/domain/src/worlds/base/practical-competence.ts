import type { AttributeDefinition } from '../../world-modules.js';
import { canonicalJson, contentLabel } from '../../events.js';
import { BASE_RECIPE_FAMILIES } from './recipe-families.js';
import { BASE_ACTION_DEFAULTS } from './actions.js';

export const SLING_HANDLING: AttributeDefinition = {
  id: 'wilderness:sling-handling',
  version: 1,
  implementation: 'finite-practice-v1',
  name: 'Sling handling',
  disclosure: 'owner',
  presentation: { icon: 'meter.energy', color: 'meter.energy' },
  schema: { kind: 'number', min: 0, max: 1, initial: 0, unit: 'rank' },
  meaning:
    'Beginners can already hunt. Actual released sling shots, including misses, improve handling once; a willing practiced coach can reduce the remaining practice. This grants no recipe, personality trait or guaranteed hit.',
  practice: {
    coachingEligibility: { communication: 'spoken', manualWork: true },
    presentation: {
      ranks: ['Beginner', 'Practiced'],
      unavailableRank: 'unavailable',
      effect:
        '{missReductionPercent}% reduction of the tool-related miss chance; later shots only.',
      progress: '{releases}/{independentRequired} real releases; Completed coaching: {coached}',
      authoredStarting: 'Practiced starting competence was explicitly authored.',
      evidenceHeading: 'Supporting releases',
      evidenceItem: 'Release {number}: {description}',
      evidenceFallback:
        'Retained released-shot evidence; inspect the recorded action for its historical details.',
      laneOutOfReach: 'The practice target is outside a clear firing range. No shot was released.',
      laneBlocked: 'The firing lane is blocked. No shot was released.',
      laneUnsafe: 'The firing lane is not safely clear. No shot was released.',
      practiceDescription:
        '{label} at {target}. {tool} {windupSeconds} game seconds of preparation after approach; one real projectile is consumed only on release. {chance}{scope} No automatic next shot. The firing lane must remain safely clear; stopping before release spends no projectile and earns no practice.',
      practiceActivityLabel: 'Practicing a shot',
      coachingActivityLabel: 'Giving/receiving guided feedback',
      selectedTool: 'Tool: {toolName}.',
      missingTool: 'Select a compatible tool and ammunition first.',
      targetChance: 'Known inert-target chance: {accuracyPercent}%. ',
      requestLabel: 'Ask {target} for {skill} coaching',
      requestDescription:
        'Ask {target} to observe one actual release and, if both later choose, give guided feedback. They may decline or lack the applicable competence. {scope} Completed help does not stack or disclose a private recipe.',
      acceptLabel: 'Agree to observe {target}',
      acceptDescription:
        "Choose to observe {target}'s next eligible release for {skill} coaching. Speaking agreement alone does not start observation; choose this action if willing. This promises no future shot or feedback and does not transfer a recipe. I can decline or later withdraw.",
      declineLabel: 'Decline coaching {target}',
      declineDescription:
        "Decline {target}'s request. They keep their independent practice route; nothing is taught or transferred.",
      feedbackDescription:
        'Choose {feedbackSeconds} game seconds of guided feedback with {target} about the shot actually observed in this episode. Speaking advice alone does not complete feedback; both must choose this activity and remain able to communicate. {guidance} A completed episode helps once; it grants no recipe or personality trait.',
      withdrawLabel: 'Withdraw from this coaching episode',
      withdrawDescription:
        'End this unfinished episode now. Actual released shots remain; incomplete feedback earns no coaching benefit.',
      unavailable:
        'This coaching episode is unavailable. Actual releases still count independently.',
      observationRequired:
        'Feedback requires a shot actually observed during this agreed episode, and each person must choose feedback once.',
      requestResult: 'Requested one coaching episode. The other person can accept or decline.',
      requestEventSuffix:
        ' for {skill} coaching. Agreement does not choose any future shot or feedback.',
      acceptResult: 'Agreed to observe. The learner still chooses each real shot.',
      acceptEventSuffix: '. Both still choose feedback after an actual observed shot.',
      endResult: 'Coaching ended without completed feedback; actual shots remain.',
      observedEvent:
        'The agreed coach observed a released shot and its visible result. Each person can now choose the guided feedback activity.',
      completeResult:
        '{guidance} Completed coaching is retained once. {remaining} further real releases remain for the coached route.',
      cancelResult: 'Feedback ended without completion. Actual shots remain.',
      endedEvent:
        'The coaching episode {reason}. No completed lesson was credited; actual shots remain.',
    },
    family: {
      id: 'base:swing',
      version: 1,
      digest: contentLabel(
        canonicalJson(
          BASE_RECIPE_FAMILIES.find((f) => f.definition.id === 'base:swing')!.definition,
        ),
      ),
    },
    independentReleases: 6,
    coachedReleases: 3,
    missReduction: 0.25,
    windupSeconds: BASE_ACTION_DEFAULTS.shotSeconds,
    feedbackSeconds: 30,
    communicationRange: BASE_ACTION_DEFAULTS.interactionRadius,
    laneMargin: 0.25,
    practiceLabel: 'Practice one sling shot',
    coachingLabel: 'Give/receive sling coaching',
    scope:
      'Supported sling mechanisms only; hunting and inert-target releases can mix. Six real releases, or three and one completed coaching episode. Bows, watching and recipe teaching do not count.',
    guidance:
      'Use the sling with compatible ammunition and a clear target in range. Hits and misses both provide practice; handling improves future aim steadiness, not damage or range.',
    improvedText:
      'Practiced with slings. Your later shots reduce the chance of deviated aim by one quarter. Ammunition, range, damage, moving bodies and solid cover still apply; a hit is never guaranteed.',
  },
};
export const SLING_TARGET = {
  id: 'sling-practice-target',
  name: 'Inert sling practice target',
  description:
    'A reusable nonliving mark for one chosen sling shot at a time. Use a clear firing lane; each released hit or miss spends one real projectile. No damage, loot or ammunition recovery.',
  attributeId: SLING_HANDLING.id,
  position: { x: 15, y: 0, z: 16 },
};

export const BASE_PRACTICE_COMMAND_DESCRIPTIONS = {
  'practice-shot':
    'Choose one sling shot at an inert target. The real projectile is spent on release, hit or miss; six releases, or three plus one completed coaching episode, improve later accuracy once.',
  coaching:
    'Request, accept, decline or withdraw from sling coaching. A practiced coach must actually observe a release; both separately choose and complete feedback. This shares no recipe and never forces another person to agree.',
};
