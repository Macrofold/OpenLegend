import { BASE_LOCAL_AVOIDANCE } from './skilled-execution.js';
import { entityGet } from '../../entity-collection.js';
import { namePhrase, type Named } from '@open-legend/language';
import {
  prepareCurrentBodyReadScope,
  currentObservedFacetValues,
} from '../../perception-evidence.js';
import { projectAttributes, type AttributeView } from '../../world-modules.js';
import type { WorldState } from '../../types.js';
import type { RangedPolicy } from '../../ranged-policy.js';
import { BASE_RANGED_TEXT } from './ranged-counterplay.js';
import { BASE_ACTION_DEFAULTS } from './actions.js';

export const BASE_RANGED_POLICY: RangedPolicy = {
  id: 'base:ranged-actions',
  version: 1,
  implementation: 'finite-shot',
  targetRule: 'living-actor',
  pointFire: true,
  localAvoidance: BASE_LOCAL_AVOIDANCE,
  conditionAdjustment: 'none',
  conditionAccuracyFactor: 0.85,
  windupSeconds: BASE_ACTION_DEFAULTS.shotSeconds,
  approachBuffer: 3.5,
  // Short ranged weapons must not demand a stance inside ordinary body/aim clearance.
  minimumApproachRange: 2,
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
  methods: { melee: true, rangedWeapon: true, unarmed: true },
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
  return formatObservedBodyHealth(observedBodyHealthValue(world, observerId, targetId));
}
export function observedBodyHealthValue(
  world: WorldState,
  observerId: string,
  targetId: string,
): AttributeView | undefined {
  const own = observerId === targetId,
    target = own ? entityGet(world.entities, targetId) : undefined;
  if (own && !target?.actor) return undefined;
  const reads = own ? undefined : prepareCurrentBodyReadScope(world, observerId);
  if (!own && !reads?.nativeBody(targetId)) return undefined;
  const attributes = own
    ? projectAttributes(world, target!, 'owner')
    : currentObservedFacetValues(world, observerId, targetId, ['public-attributes'], reads).flatMap(
        (facet) => (facet.value.kind === 'public-attributes' ? facet.value.attributes : []),
      );
  return attributes.find((attribute) => attribute.bodyHealth);
}
export function formatObservedBodyHealth(health: AttributeView | undefined): string {
  if (!health || typeof health.value !== 'number') return '';
  const range =
    health.max === undefined
      ? ''
      : health.min !== undefined && health.min !== 0
        ? ` (range ${health.min}–${health.max})`
        : `/${health.max}`;
  return `${health.name}: ${Number(health.value.toPrecision(4))}${range}.`;
}
