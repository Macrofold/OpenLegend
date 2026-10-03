import type { ActivityHostDescriptor } from '../../activity-hosts.js';
import { seesEntity } from '../../perception.js';
import { capabilityBlocked } from '../../status-capabilities.js';
import { BASE_LOW_FUEL_SECONDS } from './fire-rules.js';

/** The same visible band used by ordinary fire inspection; exact burn time is
 * scheduler-private and never part of the actor's observation. */
export { BASE_LOW_FUEL_SECONDS } from './fire-rules.js';
export const BASE_FIRE_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'base:fire-care',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: ['tend-fire'],
    deadlineSafeCommands: ['tend-fire'],
    spending: {
      command: 'tend-fire',
      requiredArguments: { operation: 'fuel' },
      maximumPerAttempt: 1,
      unit: 'fuel units',
    },
    condition: {
      label: 'fuel is visibly low',
      targetRequirement: 'an observed burning fire',
      rules: { belowSeconds: BASE_LOW_FUEL_SECONDS },
      dependencies: [
        'actor-body',
        'actor-position',
        'actor-senses',
        'fire-lit',
        'fire-fuel',
        'perception',
        'installed-support',
      ],
    },
  },
  acceptsTarget: (world, targetId) =>
    !!world.entities[targetId]?.heat && !world.entities[targetId]?.retirement,
  evaluateCondition(world, actorId, targetId) {
    const actor = world.entities[actorId],
      target = world.entities[targetId];
    const depends = [actorId, targetId];
    if (
      !actor?.actor?.alive ||
      actor.actor.incapacitated ||
      capabilityBlocked(world, actor, 'actions') ||
      !target?.heat?.lit ||
      target.retirement ||
      !seesEntity(world, actor, target)
    )
      return { value: undefined, depends };
    const threshold = BASE_LOW_FUEL_SECONDS;
    const value = target.heat.fuelSeconds < threshold;
    const boundary = world.simTime + Math.max(0, target.heat.fuelSeconds - threshold);
    return {
      value,
      depends,
      ...(!value
        ? { nextBoundary: boundary + Math.max(1e-9, Math.abs(boundary) * Number.EPSILON) }
        : {}),
    };
  },
};
