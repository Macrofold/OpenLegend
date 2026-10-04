import { namePhrase, type Named } from '@open-legend/language';
import { seesEntity } from '../../perception.js';
import type { WorldState } from '../../types.js';

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
