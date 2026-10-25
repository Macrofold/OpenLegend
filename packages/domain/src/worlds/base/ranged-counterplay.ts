import { quadraticRoots, SPATIAL_LIMITS, type WorldPoint } from '@open-legend/spatial';
import { bodyCenter } from '../../spatial.js';
import type { Entity, WorldState } from '../../types.js';

/** Subject-directed shots choose center mass; hands and other interaction anchors remain separate. */
export function baseRangedTargetPoint(world: WorldState, target: Entity): WorldPoint {
  return bodyCenter(world, target);
}

/** Predict from a personally observed executed segment, never the target's route.
 * No feasible intercept inside existing range means ordinary observed-point aim. */
export function baseObservedAimPoint(
  origin: WorldPoint,
  point: WorldPoint,
  motion: { fromAt: number; at: number; from: WorldPoint; to: WorldPoint } | undefined,
  now: number,
  speed: number,
  range: number,
): WorldPoint {
  if (!motion || motion.at !== now || motion.at <= motion.fromAt) return point;
  if (
    Math.hypot(point.x - motion.to.x, point.y - motion.to.y, point.z - motion.to.z) >
    SPATIAL_LIMITS.epsilon
  )
    return point;
  const elapsed = motion.at - motion.fromAt;
  const v = {
    x: (motion.to.x - motion.from.x) / elapsed,
    y: (motion.to.y - motion.from.y) / elapsed,
    z: (motion.to.z - motion.from.z) / elapsed,
  };
  const d = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const a = v.x * v.x + v.y * v.y + v.z * v.z - speed * speed,
    b = 2 * (d.x * v.x + d.y * v.y + d.z * v.z),
    c = d.x * d.x + d.y * d.y + d.z * d.z;
  const roots: number[] = [];
  quadraticRoots(a, b, c, roots);
  const t = roots.filter((time) => time > 0 && time <= range / speed).sort((x, y) => x - y)[0];
  return t === undefined
    ? point
    : { x: point.x + v.x * t, y: point.y + v.y * t, z: point.z + v.z * t };
}

/** Bundled straight-flight tuning. See docs/worlds/base/ranged-counterplay.md. */
export const BASE_PROJECTILE_SPEED = { stone: 0.5, arrow: 3 } as const;
export const BASE_PROJECTILE_CONTACT_WARNING =
  'This shot can injure any body in its path, including someone other than your target. Once fired, it cannot be recalled.';

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
    'Prepare one shot with the selected tool. A selected target must be visible and in range when you shoot; the shot leads movement you have seen, but later turns can still make it miss. In attack mode, you can keep holding and choose a ground point if the target leaves sight. Ordinary Aim ends if its target leaves sight or range. Holding longer gives no accuracy bonus.',
  shotDescription: `Approach a perceived opponent and release one projectile after preparation, leading motion you have actually seen. Later turns can make it miss. The projectile travels straight until a body or solid cover stops it. ${BASE_PROJECTILE_CONTACT_WARNING}`,
  releaseDescription: `Release the prepared projectile. A selected target is led using movement you have actually seen; a chosen point is fired at exactly. Later turns can make a target shot miss. ${BASE_PROJECTILE_CONTACT_WARNING}`,
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
  contactSource: ' The projectile came from ',
  observedHit: 'hit ',
  observedNoInjury: 'did not injure ',
  observedCover: 'saw the projectile stop against solid cover.',
  observedRangeEnd: 'saw the projectile finish its range without contact.',
  injuryInterrupted: 'Injury interrupted preparation; no shot was released.',
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
  type: 'aim' | 'shoot-once' | 'release-shot',
  target: string,
  tool: string,
): string {
  return `${type === 'aim' ? BASE_RANGED_TEXT.aimName : type === 'release-shot' ? BASE_RANGED_TEXT.shootingName : BASE_RANGED_TEXT.shotName} at ${target} with ${tool}`;
}

/** Small local choices are examples, not an assertion that other destinations are impossible. */
export const BASE_EVASION_DIRECTIONS = [
  { label: 'north', x: 0, z: -1 },
  { label: 'east', x: 1, z: 0 },
  { label: 'south', x: 0, z: 1 },
  { label: 'west', x: -1, z: 0 },
] as const;
