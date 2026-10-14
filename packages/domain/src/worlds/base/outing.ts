import type { ActivityHostDescriptor, ActivityRequestDescriptor } from '../../activity-hosts.js';
import { attackPermissionProblem } from '../../combat-consent.js';
import { seesEntity } from '../../perception.js';
import { outcome } from '../../events.js';
import { observeActor } from '../../kernel.js';
import { observerDescription } from './knowledge.js';
import { outingDestination, outingInvitationProblem } from '../../outings.js';
import { BASE_OUTING, BASE_COMBAT_HELP } from './outing-policy.js';

const fields: ActivityRequestDescriptor['fields'] = {
  recipientId: {
    type: 'entity',
    label: 'Travel companion',
    required: true,
    discovery: { source: 'spatial' },
  },
  destinationId: {
    type: 'entity',
    label: 'Destination',
    required: true,
    discovery: { source: 'spatial' },
  },
  mode: {
    type: 'mode',
    label: 'My current work if accepted',
    required: true,
    modeLabels: {
      enqueue: 'Start only if I am still idle',
      replace: 'Replace the work I have now',
      interrupt: 'Pause the work I have now, then resume it',
    },
  },
};
export const BASE_OUTING_HOST: ActivityHostDescriptor = {
  definition: {
    id: 'base:outings',
    version: 2,
    interface: 'activity-host-v1',
    implementationVersion: 2,
    commands: ['outing'],
    deadlineSafeCommands: [],
    requests: [
      {
        id: BASE_COMBAT_HELP.family,
        label: BASE_COMBAT_HELP.label,
        submitLabel: 'Ask for help',
        description: BASE_COMBAT_HELP.description,
        fields: {
          recipientId: { ...fields.recipientId!, label: 'Potential helper' },
          opponentId: {
            type: 'entity',
            label: 'Opponent',
            required: true,
            discovery: { source: 'spatial' },
          },
        },
      },
      {
        id: BASE_OUTING.family,
        label: BASE_OUTING.label,
        purposeLabel: 'Stated purpose (optional)',
        submitLabel: 'Send invitation',
        description: BASE_OUTING.description,
        fields,
      },
    ],
  },
  compileRequest(world, actorId, id, request, permitted) {
    if (request.family === BASE_COMBAT_HELP.family) {
      const { recipientId, opponentId } = request.arguments;
      if (
        Object.keys(request.arguments).sort().join(',') !== 'opponentId,recipientId' ||
        typeof recipientId !== 'string' ||
        typeof opponentId !== 'string' ||
        (permitted && (!permitted.includes(recipientId) || !permitted.includes(opponentId)))
      )
        return outcome(false, 'activity-choices', BASE_COMBAT_HELP.opponent);
      return { id, actorId, type: 'outing', operation: 'help', recipientId, opponentId };
    }
    const { recipientId, destinationId, mode } = request.arguments;
    if (
      Object.keys(request.arguments).sort().join(',') !== 'destinationId,mode,recipientId' ||
      typeof recipientId !== 'string' ||
      typeof destinationId !== 'string' ||
      (mode !== 'enqueue' && mode !== 'replace' && mode !== 'interrupt') ||
      (permitted && (!permitted.includes(recipientId) || !permitted.includes(destinationId)))
    )
      return outcome(false, 'activity-choices', BASE_OUTING.messages.terms);
    return { id, actorId, type: 'outing', operation: 'invite', recipientId, destinationId, mode };
  },
  requestChoice(world, actorId, requestId, fieldId, candidateId) {
    if (requestId !== BASE_OUTING.family && requestId !== BASE_COMBAT_HELP.family) return;
    const allowed =
      fieldId === 'recipientId'
        ? !outingInvitationProblem(
            world,
            actorId,
            candidateId,
            requestId === BASE_COMBAT_HELP.family ? 'combat-help' : 'travel',
          )
        : fieldId === 'opponentId' && requestId === BASE_COMBAT_HELP.family
          ? !!world.entities[candidateId]?.actor &&
            seesEntity(world, world.entities[actorId]!, world.entities[candidateId]!) &&
            !attackPermissionProblem(
              world,
              world.entities[actorId]!,
              world.entities[candidateId],
              {},
            )
          : fieldId === 'destinationId' && !!outingDestination(world, actorId, candidateId);
    if (!allowed) return;
    return {
      id: candidateId,
      label: observerDescription(world, actorId, candidateId, 'definite'),
      kind: 'entity',
      roles: [fieldId],
      requestIds: [requestId],
      accessible: true,
    };
  },
  requestChoices(world, actorId, observed) {
    const observation = observed ?? observeActor(world, actorId, { includeMemories: false });
    const choices =
      observation?.visibleEntities.flatMap((entity) =>
        [
          BASE_OUTING_HOST.requestChoice!(
            world,
            actorId,
            BASE_OUTING.family,
            entity.actor ? 'recipientId' : 'destinationId',
            entity.id,
          ),
          ...(entity.actor
            ? [
                BASE_OUTING_HOST.requestChoice!(
                  world,
                  actorId,
                  BASE_COMBAT_HELP.family,
                  'recipientId',
                  entity.id,
                ),
                BASE_OUTING_HOST.requestChoice!(
                  world,
                  actorId,
                  BASE_COMBAT_HELP.family,
                  'opponentId',
                  entity.id,
                ),
              ]
            : []),
        ].filter((choice): choice is NonNullable<typeof choice> => !!choice),
      ) ?? [];
    return { choices, warnings: [] };
  },
};
