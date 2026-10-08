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
      'Use the sling with compatible ammunition and a clear target in range. Hits and misses both provide practice; handling improves future accuracy, not damage or range.',
    improvedText:
      'Practiced with slings. Your later shots reduce the tool-related miss chance by one quarter. Ammunition, range, damage and animal conditions still apply; a hit is never guaranteed.',
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
