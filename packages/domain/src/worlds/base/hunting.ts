import { namePhrase, type Named } from '@open-legend/language';
import { seesEntity } from '../../perception.js';
import type { WorldState } from '../../types.js';
import type { RangedPolicy } from '../../ranged-policy.js';
import { BASE_ACTION_DEFAULTS } from './actions.js';

export const BASE_RANGED_POLICY: RangedPolicy = {
  id: 'base:ranged-actions',
  version: 1,
  implementation: 'finite-shot',
  targetRule: 'living-animal',
  conditionAdjustment: 'danger-or-return',
  conditionAccuracyFactor: 0.85,
  windupSeconds: BASE_ACTION_DEFAULTS.shotSeconds,
  approachBuffer:
    BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond * BASE_ACTION_DEFAULTS.shotSeconds + 0.25,
  minimumApproachRange: 0.5,
  invalidTargetText: 'Choose a living animal.',
  unavailableText: 'the target or ranged tool is no longer available.',
  targetLabel: 'a living animal',
  actionLabel: 'Hunt',
  activityLabel: 'Hunting',
  description:
    'Approach a living animal and attempt one shot with your equipped ranged tool. Each attempt consumes ammunition and can miss. A killed animal leaves harvestable remains.',
  scope:
    'A shot can miss or wound the animal without killing it. Killed animals leave remains to harvest.',
  accuracyExplanation: 'Animal conditions still affect the final chance.',
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

/** This world's visible animal condition is readable; private needs and unseen bodies are not.
 * docs/worlds/base/survival.md#embodied-survival-and-authored-start
 */
export function observedAnimalHealth(
  world: WorldState,
  observerId: string,
  targetId: string,
): string {
  const target = world.entities[targetId];
  const observer = world.entities[observerId];
  if (!observer || !target?.animal || !target.actor || !seesEntity(world, observer, target))
    return '';
  const maximum = target.actor.body?.maxHealth;
  return `Health: ${Number(target.actor.health.toPrecision(4))}${maximum ? `/${maximum}` : ''}; 0 means dead.`;
}
