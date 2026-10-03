import {
  activityRequestChoices,
  activityRequestDescriptors,
  clockDeadline,
  namedClockTimes,
  type WorldState,
} from '@open-legend/domain';
import type { ActivityRequestsView } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';

/** The ordinary result contains no detailed child-step debugger or another person's work. */
export function activityStatus(
  service: WorldService,
  scope: RequestScope,
): Pick<ActivityRequestsView, 'ok' | 'scope' | 'simTime' | 'status'> {
  service.assertScope(scope);
  return {
    ok: true,
    scope: scopeKey(scope),
    simTime: service.world.simTime,
    status: projectActivityStatus(service.world, scope.actorId),
  };
}
export function projectActivityStatus(
  world: WorldState,
  actorId: string,
): ActivityRequestsView['status'] {
  const plan = world.entities[actorId]?.actor?.agency.plan,
    execution = plan?.activity;
  if (!execution) return undefined;
  const waiting =
    plan!.status === 'active' &&
    !world.entities[actorId]!.actor!.action &&
    execution.pending.at(-1)?.node.kind === 'wait'
      ? execution.pending.at(-1)!.node.name
      : undefined;
  return {
    name: execution.request?.name ?? 'My selected method',
    status: waiting ? 'waiting' : plan!.status,
    ...(execution.reason || waiting ? { reason: execution.reason ?? waiting } : {}),
    ...(execution.control
      ? {
          spent: execution.spent ?? 0,
          attempts: execution.attempts ?? 0,
          interrupted: execution.interrupted ?? false,
          deadline: execution.control.deadline,
        }
      : {}),
  };
}
export function activityRequests(service: WorldService, scope: RequestScope): ActivityRequestsView {
  const requests = activityRequestDescriptors(service.world);
  const timing = requests
    .flatMap((request) => Object.values(request.fields))
    .filter(
      (field) =>
        field.type === 'time' &&
        field.minimumDuration !== undefined &&
        field.maximumDuration !== undefined,
    );
  return {
    ...activityStatus(service, scope),
    requests,
    ...(timing.length
      ? {
          timeOptions: {
            minimumDuration: Math.max(...timing.map((field) => field.minimumDuration!)),
            maximumDuration: Math.min(...timing.map((field) => field.maximumDuration!)),
            namedDeadlines: namedClockTimes(service.world).map((name) => ({
              name,
              at: clockDeadline(service.world, name)!,
            })),
          },
        }
      : {}),
    ...activityRequestChoices(service.world, scope.actorId),
  };
}
