import type { WorldPoint } from '@open-legend/spatial';
import { nextRandom } from '../../data.js';
import type { WorldState } from '../../types.js';

/** Bundled straight-flight tuning. See docs/worlds/base/ranged-counterplay.md. */
export const BASE_PROJECTILE_SPEED = { stone: 0.5, arrow: 0.75 } as const;

/** The current native launcher families use this world's two-radius, uniformly angled
 * release error. The flight owner retains only its chosen direction; alternate error
 * laws need a qualified family/profile binding, not a second collision executor.
 * docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md#flight-accuracy-and-effects */
export function baseShotDirection(
  world: WorldState,
  aim: WorldPoint,
  targetRadius: number,
  steadiness: number,
): WorldPoint {
  const length = Math.hypot(aim.x, aim.y, aim.z);
  if (length <= 1e-12) throw new Error('A ranged target must have a distinct aim point.');
  const direction = { x: aim.x / length, y: aim.y / length, z: aim.z / length };
  if (nextRandom(world) >= steadiness) {
    const delta = { ...aim };
    const angle = nextRandom(world) * 2 * Math.PI;
    const axis = Math.abs(direction.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const cross = {
      x: direction.y * axis.z - direction.z * axis.y,
      y: direction.z * axis.x - direction.x * axis.z,
      z: direction.x * axis.y - direction.y * axis.x,
    };
    const scale = Math.hypot(cross.x, cross.y, cross.z);
    const u = { x: cross.x / scale, y: cross.y / scale, z: cross.z / scale };
    const v = {
      x: direction.y * u.z - direction.z * u.y,
      y: direction.z * u.x - direction.x * u.z,
      z: direction.x * u.y - direction.y * u.x,
    };
    const error = 2 * targetRadius;
    for (const key of ['x', 'y', 'z'] as const)
      delta[key] += error * (Math.cos(angle) * u[key] + Math.sin(angle) * v[key]);
    const deviated = Math.hypot(delta.x, delta.y, delta.z);
    for (const key of ['x', 'y', 'z'] as const) direction[key] = delta[key] / deviated;
  }
  return direction;
}

export const BASE_RANGED_TEXT = {
  keywords: ['shoot', 'aim', 'ranged', 'attack'],
  aimName: 'Aim',
  cancelName: 'Cancel aim',
  prepared: 'finished preparing aim. Shoot or cancel remains a choice.',
  shotName: 'Shoot once',
  shootingName: 'Shoot',
  aimingActivity: 'aiming a ranged tool',
  shootingActivity: 'preparing one shot',
  aimingLabel: 'Aiming',
  shootingLabel: 'Preparing a shot',
  aimDescription:
    'Approach a perceived opponent and prepare an aim with the selected tool and one held projectile. Aim stays ready until you shoot, cancel or lose sight or range. Holding longer gives no accuracy bonus.',
  shotDescription:
    'Approach a perceived opponent and release one projectile after preparation. The projectile travels straight until a body or solid cover stops it. Only the selected opponent can be injured.',
  releaseDescription:
    'Release the projectile held by this prepared aim. The shot travels independently; later movement or cancellation does not recall it.',
  released: 'released one shot. One projectile was spent; its outcome is not yet known.',
  stopped: 'could not observe where the released shot ended.',
  ready: 'Aim is prepared. Shoot releases one projectile; cancel spends none.',
  readyLabel: 'Aim ready',
  notReady: 'The selected aim is still preparing.',
  cancelled: 'Aim ended without firing. No projectile was spent.',
  ammunitionUnavailable: 'The selected ammunition is unavailable.',
  reservationUnavailable: 'One projectile could not be reserved.',
  selectedChanged: 'The selected body, tool or ammunition changed.',
  targetLost: 'The selected target is no longer perceived.',
  distinctTarget: 'Choose a target with a distinct aim point.',
  practiceChanged: 'The practice target changed.',
  rangeLost: 'The target left firing range. Choose a new approach.',
  handlingChanged: 'The selected handling rule changed.',
  handlingUnavailable: 'The selected handling record is unavailable.',
  releaseUnavailable: 'The held projectile could not be released.',
  aimChanged: 'That prepared aim is no longer current.',
  releaseAvailable: 'This prepared shot can be released.',
  releaseCompleted: 'One projectile was released; its outcome is not yet known.',
  contactHit: 'was contacted by a projectile.',
  contactStopped: 'stopped a projectile without injury.',
  observedHit: 'hit ',
  observedNoInjury: 'did not injure ',
  observedCover: 'saw the projectile stop against solid cover.',
  observedRangeEnd: 'saw the projectile finish its range without contact.',
  injuryInterrupted: 'Injury interrupted preparation; no shot was released.',
  reviewedAttackChanged: 'The reviewed attack changed after release.',
  concurrentLethal: 'Concurrent injury made this unreviewed shot potentially lethal.',
};

export const BASE_EVASION_KEYWORDS = ['evade', 'dodge'];
export const BASE_EVASION_TEXT = {
  description:
    'Choose a short supported evasive movement. Current distance, duration and repeat limits are disclosed with the action.',
  activity: 'making a short evasive movement',
  destinationScope:
    'Other supported short destinations are not listed; ordinary movement remains available.',
  unavailable: 'This body cannot make that evasive movement.',
  recovery: (label: string, seconds: number) =>
    `${label} is ready in ${seconds} game seconds. Walking remains available.`,
  distance: (maximum: number) => `Choose a distinct supported destination within ${maximum} m.`,
  blockedPath: 'That short path is blocked or unsupported.',
  interrupted: 'The chosen movement was interrupted.',
  obstructed: 'The chosen movement stopped at a physical obstruction.',
  finished: 'finished the chosen evasive movement.',
  completed: 'The chosen movement ended.',
  injuryInterrupted: 'Injury interrupted the chosen movement.',
};

export function rangedChoiceLabel(
  type: 'aim' | 'shoot-once',
  target: string,
  tool: string,
): string {
  return `${type === 'aim' ? BASE_RANGED_TEXT.aimName : BASE_RANGED_TEXT.shotName} at ${target} with ${tool}`;
}

/** Small local choices are examples, not an assertion that other destinations are impossible. */
export const BASE_EVASION_DIRECTIONS = [
  { label: 'north', x: 0, z: -1 },
  { label: 'east', x: 1, z: 0 },
  { label: 'south', x: 0, z: 1 },
  { label: 'west', x: -1, z: 0 },
] as const;
