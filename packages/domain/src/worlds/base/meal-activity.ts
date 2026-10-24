import type { ActivityHostDescriptor } from '../../activity-hosts.js';
import { entityGet } from '../../entity-collection.js';
import { applicableConsumption } from '../../body-policy.js';
import { attributeDefinition, readAttribute } from '../../world-modules.js';

/** Own-body condition only: no other person's private meter can end this meal. */
export const BASE_MEAL_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'base:chosen-meal',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: [],
    deadlineSafeCommands: [],
    condition: {
      label: 'my consumption meter is full',
      targetRequirement: 'my own living body',
      rules: {},
      dependencies: ['actor-body', 'installed-support'],
    },
  },
  acceptsTarget: (world, targetId) => !!entityGet(world.entities, targetId)?.actor?.alive,
  evaluateCondition(world, actorId, targetId) {
    const actor = entityGet(world.entities, actorId),
      depends = [actorId];
    if (actorId !== targetId || !actor?.actor?.alive || actor.actor.incapacitated)
      return { value: undefined, depends };
    const consumption = applicableConsumption(world, actor),
      meter = consumption && attributeDefinition(world, consumption.attributeId),
      value = meter && readAttribute(world, actor, meter);
    return {
      value:
        meter?.schema.kind === 'number' && typeof value === 'number'
          ? value >= meter.schema.max
          : undefined,
      depends,
    };
  },
};
