import { entityGet } from '../../entity-collection.js';
import type {
  ActivityHostDescriptor,
  ActivityRequestDescriptor,
  ActivityRequestObservation,
} from '../../activity-hosts.js';
import { attackPermissionProblem } from '../../combat-consent.js';
import { seesEntity } from '../../perception.js';
import { outcome } from '../../events.js';
import { observeActor } from '../../kernel.js';
import { observerDescription } from './knowledge.js';
import { outingDestination, outingInvitationProblem } from '../../outings.js';
import { BASE_OUTING, BASE_COMBAT_HELP } from './outing-policy.js';
import {
  cooperationRequestDescriptors,
  cooperationRequestChoices,
  bindCooperationRequest,
  COOPERATION_REQUESTS,
} from './cooperation-requests.js';

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
    version: 3,
    interface: 'activity-host-v1',
    implementationVersion: 3,
    commands: ['outing'],
    deadlineSafeCommands: [],
    requests: [
      {
        id: BASE_COMBAT_HELP.family,
        label: BASE_COMBAT_HELP.label,
        submitLabel: 'Ask for help',
        description: BASE_COMBAT_HELP.description,
        presentation: {
          kind: 'cooperation-proposal',
          target: 'recipientId',
          opponent: 'opponentId',
        },
        fields: {
          recipientId: { ...fields.recipientId!, label: 'Potential helper' },
          opponentId: {
            type: 'entity',
            label: 'Opponent',
            required: true,
            dependencies: ['recipientId'],
            discovery: { source: 'spatial' },
          },
        },
      },
      {
        id: BASE_OUTING.family,
        label: BASE_OUTING.label,
        presentation: {
          kind: 'outing-invitation',
          target: 'recipientId',
          destination: 'destinationId',
          workMode: 'mode',
        },
        purposeLabel: 'Stated purpose (optional)',
        submitLabel: 'Send invitation',
        description: BASE_OUTING.description,
        fields,
      },
    ],
  },
  requestDescriptors(world, actorId) {
    return [
      ...(BASE_OUTING_HOST.definition.requests ?? []),
      ...cooperationRequestDescriptors(world, actorId),
    ];
  },
  compileRequest(world, actorId, id, request, permitted) {
    if (Object.values(COOPERATION_REQUESTS).some((family) => family === request.family))
      return bindCooperationRequest(world, actorId, id, request, permitted);
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
  requestChoice(world, actorId, requestId, fieldId, candidateId, arguments_ = {}) {
    if (Object.values(COOPERATION_REQUESTS).some((family) => family === requestId)) {
      let observed: ActivityRequestObservation | undefined;
      if (fieldId === 'recipientId' || fieldId === 'quarryId') {
        const actor = entityGet(world.entities, actorId),
          candidate = entityGet(world.entities, candidateId);
        if (
          !actor?.actor ||
          !candidate ||
          candidate.id === actorId ||
          candidate.placement?.mode !== 'world' ||
          !seesEntity(world, actor, candidate)
        )
          return;
        observed = { actor, visibleEntities: [candidate], inventory: [] };
      }
      return cooperationRequestChoices(world, actorId, observed, {
        family: requestId,
        field: fieldId,
        arguments: arguments_,
      }).choices.find((choice) => choice.id === candidateId);
    }
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
          ? candidateId !== arguments_.recipientId &&
            !!entityGet(world.entities, candidateId)?.actor &&
            seesEntity(
              world,
              entityGet(world.entities, actorId)!,
              entityGet(world.entities, candidateId)!,
            ) &&
            !attackPermissionProblem(
              world,
              entityGet(world.entities, actorId)!,
              entityGet(world.entities, candidateId),
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
  requestChoices(world, actorId, observed, query, families) {
    if (query && Object.values(COOPERATION_REQUESTS).some((family) => family === query.family))
      return cooperationRequestChoices(world, actorId, observed, query);
    const observation = observed ?? observeActor(world, actorId, { includeMemories: false });
    const choices =
      observation?.visibleEntities.flatMap((entity) => {
        const roles = [
          { family: BASE_OUTING.family, field: entity.actor ? 'recipientId' : 'destinationId' },
          ...(entity.actor
            ? [
                { family: BASE_COMBAT_HELP.family, field: 'recipientId' },
                { family: BASE_COMBAT_HELP.family, field: 'opponentId' },
              ]
            : []),
        ].filter(
          (role) =>
            (!families || families.includes(role.family)) &&
            (!query || (query.family === role.family && query.field === role.field)),
        );
        return roles.flatMap(({ family, field }) => {
          const choice = BASE_OUTING_HOST.requestChoice!(
            world,
            actorId,
            family,
            field,
            entity.id,
            query?.arguments,
          );
          return choice ? [choice] : [];
        });
      }) ?? [];
    return {
      choices: [
        ...choices,
        ...(!query
          ? cooperationRequestChoices(world, actorId, observation ?? undefined, undefined, families)
              .choices
          : []),
      ],
      warnings: [],
    };
  },
};
