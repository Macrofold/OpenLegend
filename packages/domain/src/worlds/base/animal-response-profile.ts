import type { NativeResponseProfile } from '../../native-response.js';
import { installNativeResponseProfile, type NativeResponseState } from '../../native-response.js';
import type { Entity, WorldState } from '../../types.js';
import { namePhrase } from '@open-legend/language';

/** Observable activity only; no danger identities or private needs. */
export function baseAnimalActivity(entity: Entity): { status: string; description: string } {
  const describe = (status: string, activity: string) => ({
    status,
    description: `${namePhrase(entity, 'indefinite', { capitalize: true })} of the clearing. ${activity}`,
  });
  if (!entity.actor?.alive) return describe('Dead', 'It is no longer alive.');
  if (entity.animal?.episode?.mode === 'escaping' && !entity.animal.episode.proposal)
    return describe('Fleeing', 'It is fleeing.');
  if (entity.animal?.episode) return describe('Alert', 'It remains alert.');
  if (entity.actor?.action?.type === 'feed') return describe('Feeding', 'It is eating.');
  if (entity.animal?.foraging?.mode === 'resting') return describe('Resting', 'It is resting.');
  return describe('Foraging', 'It is foraging nearby.');
}

export function baseAnimalResponse(
  world: WorldState,
  locomotion: string,
  remainingSeconds: number,
  aerialRouteId?: string,
  profile = BASE_ANIMAL_SOUND_PROFILES[locomotion],
): NativeResponseState {
  if (!profile) throw new Error('No authored animal response profile for this locomotion.');
  return {
    acousticPatterns: {},
    profile: installNativeResponseProfile(world, profile),
    locomotion,
    physicalLife: 0,
    ...(aerialRouteId === undefined ? {} : { aerialRouteId }),
    wander: { remainingSeconds },
  };
}

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
    attackPreparation: false,
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
  soundAlarmMinimumBand: 0,
  acousticChangeBandDb: 6,
  acousticPatternIdleSeconds: 900,
  candidates: {
    distance: { minimum: 10, maximum: 15 },
    angles: [0, 5, -5, 30, -30, 60, -60, 90, -90, 180],
    preferredProgress: 0.75,
    minimumProgress: 0.5,
    minimumAttempts: 3,
    maximumDetourFactor: 1.5,
    navigationWait: 'entity',
    maximumRouteLength: 24,
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
  movementFactors: { injuryPerUnit: 1 / 200, scars: true },
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

const STEADIER_ANIMAL_RESPONSE_PROFILE: NativeResponseProfile = {
  ...BASE_ANIMAL_RESPONSE_PROFILE,
  id: 'wilderness:steadier-animal-responses',
  soundAlarmMinimumBand: 2,
};
export const BASE_TERRITORIAL_RESPONSE_PROFILE: NativeResponseProfile = {
  ...BASE_ANIMAL_RESPONSE_PROFILE,
  id: 'wilderness:territorial-animal-responses',
  soundAlarmMinimumBand: null,
};
const BASE_ANIMAL_SOUND_PROFILES: Record<string, NativeResponseProfile> = {
  hare: BASE_ANIMAL_RESPONSE_PROFILE,
  deer: BASE_ANIMAL_RESPONSE_PROFILE,
  bird: BASE_ANIMAL_RESPONSE_PROFILE,
  wolf: STEADIER_ANIMAL_RESPONSE_PROFILE,
  bear: STEADIER_ANIMAL_RESPONSE_PROFILE,
};
