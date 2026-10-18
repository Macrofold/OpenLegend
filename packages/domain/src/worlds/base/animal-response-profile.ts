import type { NativeResponseProfile } from '../../native-response.js';

/** Selected world rules, not measured biomechanics or a second movement owner.
 * docs/worlds/base/animal-responses.md */
export const BASE_ANIMAL_RESPONSE_PROFILE: NativeResponseProfile = {
  id: 'wilderness:animal-responses',
  version: 1,
  implementation: 'local-refuge',
  dangers: {
    species: ['human', 'construct', 'wolf', 'bear'],
    bodyPlans: ['biped'],
    currentNaturalAttack: true,
  },
  retentionSeconds: 480,
  uncertaintyPerSecond: 0.025,
  maximumUncertainty: 6,
  avoidanceDistance: 12,
  clearanceMargin: 3,
  settlingSeconds: 240,
  reviewSeconds: 12,
  blockedReviewSeconds: 60,
  passageDistance: 1.5,
  candidates: {
    rings: [
      { count: 8, distance: 12 },
      { count: 4, distance: 24 },
    ],
    maximumRouteLength: 24,
    frontierMargin: 0.25,
    minimumAdvance: 0.5,
    worseningSlack: 0.25,
    arrivalMarginCap: 6,
    continuityImprovement: 2,
    tieMargin: 1,
    distanceWeightScale: 12,
  },
  locomotion: {
    hare: { travel: 0.055, escape: 0.24 },
    deer: { travel: 0.07, escape: 0.2 },
    wolf: { travel: 0.08, escape: 0.22 },
    bear: { travel: 0.06, escape: 0.2 },
    bird: { travel: 0.04, escape: 0.075, flightEscape: 0.25 },
  },
  wander: { distance: 0.4, minimumWaitSeconds: 120, waitChoices: 120 },
  wake: { attributeId: 'wilderness:energy', above: 0, reason: 'perceived-danger' },
  presentation: {
    alarmed: 'became alert to danger.',
    escaping: 'is moving away from perceived danger.',
    settling: 'stopped and remains alert.',
    blocked: 'remains alert but has no usable escape route.',
    routine: 'settled and resumed its ordinary activity.',
  },
};
