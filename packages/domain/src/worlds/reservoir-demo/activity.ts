import type { ActivityHostDescriptor } from '../../activity-hosts.js';
import { outcome } from '../../events.js';
import { getOwn, isSafeRecordId } from '../../records.js';
import { seesEntity } from '../../perception.js';
import {
  attributeDefinition,
  readAttribute,
  RESERVOIR_CONSUMER_GUIDE,
} from '../../world-modules.js';
import { observerDescription } from '../base/knowledge.js';

/** A constructed body's finite recharge session composes the existing replenish operation.
 * No electrical model, free resource source, deadline budget or item stock is invented. */
export const RESERVOIR_ACTIVITY_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'reservoir-demo:recharge',
    version: 1,
    interface: 'activity-host-v1',
    implementationVersion: 1,
    commands: ['replenish'],
    deadlineSafeCommands: [],
    requests: [
      {
        id: 'reservoir-demo:recharge-session',
        label: 'Recharge from this supply',
        description:
          'Approach this compatible supply and recharge for one native work session. The session ends when its work time finishes, your reservoir fills or the finite supply is exhausted. Stopping retains only the amount already transferred.',
        presentation: { kind: 'replenish-session', target: 'sourceId', workMode: 'mode' },
        fields: {
          sourceId: {
            type: 'entity',
            label: 'Recharge supply',
            required: true,
            discovery: { source: 'spatial' },
          },
          mode: { type: 'mode', label: 'Current work', required: true },
        },
      },
    ],
  },
  compileRequest(world, actorId, id, request, permitted) {
    const args = request.arguments;
    if (
      request.family !== 'reservoir-demo:recharge-session' ||
      !args ||
      Object.keys(args).sort().join(',') !== 'mode,sourceId' ||
      typeof args.sourceId !== 'string' ||
      !isSafeRecordId(args.sourceId) ||
      (args.mode !== 'enqueue' && args.mode !== 'replace' && args.mode !== 'interrupt')
    )
      return outcome(
        false,
        'activity-choices',
        'Choose a recharge supply and how to handle current work.',
      );
    const actor = getOwn(world.entities, actorId),
      source = getOwn(world.entities, args.sourceId);
    const definition =
      source?.replenisher && attributeDefinition(world, source.replenisher.attributeId);
    if (
      !actor?.actor ||
      !source ||
      source.retirement ||
      !definition?.reservoir ||
      definition.schema.kind !== 'number' ||
      typeof readAttribute(actor.actor, definition) !== 'number' ||
      permitted?.includes(source.id) === false ||
      !seesEntity(world, actor, source)
    )
      return outcome(
        false,
        'activity-choices',
        'Choose a currently perceived supply compatible with your reservoir.',
      );
    return {
      id,
      actorId,
      type: 'compose',
      mode: args.mode,
      name: `${definition.reservoir.actionLabel} from ${observerDescription(world, actorId, source.id)}`,
      bindings: { supply: source.id },
      root: {
        kind: 'invoke',
        key: 'recharge',
        name: definition.reservoir.actionLabel,
        command: 'replenish',
        args: { targetId: { role: 'supply' }, attributeId: { literal: definition.id } },
      },
    };
  },
  requestChoice(world, actorId, requestId, fieldId, candidateId) {
    if (requestId !== 'reservoir-demo:recharge-session' || fieldId !== 'sourceId') return;
    const source = world.entities[candidateId],
      actor = world.entities[actorId]?.actor;
    const definition =
      source?.replenisher && attributeDefinition(world, source.replenisher.attributeId);
    if (
      !source ||
      source.retirement ||
      !actor ||
      !definition?.reservoir ||
      typeof readAttribute(actor, definition) !== 'number'
    )
      return;
    return {
      id: source.id,
      label: observerDescription(world, actorId, source.id),
      kind: 'entity',
      roles: [fieldId],
      requestIds: [requestId],
      accessible: true,
      reason: `${definition.reservoir.workSeconds} seconds of game time, plus approach. ${RESERVOIR_CONSUMER_GUIDE.drain}`,
    };
  },
  reviewRequest(world, _actorId, request) {
    const source = world.entities[String(request.arguments.sourceId)];
    const definition =
      source?.replenisher && attributeDefinition(world, source.replenisher.attributeId);
    return definition?.reservoir
      ? [
          `One session lasts at most ${definition.reservoir.workSeconds} seconds of game time after approach; capacity and the finite supply can end it earlier.`,
          RESERVOIR_CONSUMER_GUIDE.drain,
          'Review reserves nothing. Work rechecks the selected supply and keeps completed transfers if stopped.',
        ]
      : [];
  },
};
