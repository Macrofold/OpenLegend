import { namePhrase, type Named } from '@open-legend/language';
import { seesEntity } from '../../perception.js';
import { projectAttributes } from '../../world-modules.js';
import type { WorldState } from '../../types.js';
import type { RangedPolicy } from '../../ranged-policy.js';
import { BASE_RANGED_TEXT } from './ranged-counterplay.js';
import { BASE_ACTION_DEFAULTS } from './actions.js';

export const BASE_RANGED_POLICY: RangedPolicy = {
  id: 'base:ranged-actions',
  version: 1,
  implementation: 'finite-shot',
  targetRule: 'living-actor',
  conditionAdjustment: 'none',
  conditionAccuracyFactor: 0.85,
  windupSeconds: BASE_ACTION_DEFAULTS.shotSeconds,
  approachBuffer:
    BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond * BASE_ACTION_DEFAULTS.shotSeconds + 0.25,
  minimumApproachRange: 0.5,
  invalidTargetText: 'Choose a living permitted target.',
  unavailableText: 'the target or ranged tool is no longer available.',
  targetLabel: 'a living permitted target',
  actionLabel: BASE_RANGED_TEXT.shotName,
  activityLabel: BASE_RANGED_TEXT.shootingLabel,
  description: BASE_RANGED_TEXT.shotDescription,
  scope:
    'One finite projectile travels until contact or the end of its range; contact does not promise injury or death.',
  accuracyExplanation: 'Movement and solid cover determine projectile contact.',
};

/** Bundled-world intent and eligible methods, not a hunger-to-action policy.
 * docs/worlds/base/survival.md#embodied-survival-and-authored-start
 */
export const BASE_HUNTING = {
  label: 'Hunt',
  purpose: 'for meat',
  scope: 'One attack.',
  knownPrey: ['hare', 'deer', 'bird'] as readonly string[],
  methods: { melee: true, launcher: true, unarmed: true },
  unarmedTool: 'bare hands',
};

export function huntingDescription(
  species: string | undefined,
  method: keyof typeof BASE_HUNTING.methods,
  target: Named | string,
  tool?: Named | string,
): string | undefined {
  if (!species || !BASE_HUNTING.knownPrey.includes(species) || !BASE_HUNTING.methods[method])
    return;
  return `${BASE_HUNTING.label} ${namePhrase(target)} with ${tool ? namePhrase(tool) : BASE_HUNTING.unarmedTool} ${BASE_HUNTING.purpose}. ${BASE_HUNTING.scope}`;
}

/** Readable visible body condition follows its installed meter's disclosure; private needs and unseen bodies do not.
 * docs/worlds/base/survival.md#embodied-survival-and-authored-start
 */
export function observedBodyHealth(
  world: WorldState,
  observerId: string,
  targetId: string,
): string {
  const target = world.entities[targetId];
  const observer = world.entities[observerId];
  if (!observer || !target?.actor || !seesEntity(world, observer, target)) return '';
  const health = projectAttributes(
    world,
    target,
    observer.id === target.id ? 'owner' : 'public',
  ).find((attribute) => attribute.bodyHealth);
  if (!health || typeof health.value !== 'number') return '';
  const range =
    health.max === undefined
      ? ''
      : health.min !== undefined && health.min !== 0
        ? ` (range ${health.min}–${health.max})`
        : `/${health.max}`;
  return `${health.name}: ${Number(health.value.toPrecision(4))}${range}.`;
}
