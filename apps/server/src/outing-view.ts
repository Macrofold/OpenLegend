import {
  actorOutings,
  BASE_OUTING,
  observerDescription,
  seesEntity,
  worldPosition,
} from '@open-legend/domain';
import type { WorldState, Outing } from '@open-legend/domain';
import type { CommandInput, OutingView } from '@open-legend/protocol';

/** Social terms belong to the parties. Companion position, private work and hidden arrival do not. */
export function outingViews(world: WorldState, actorId: string): OutingView[] {
  return outingTerms(world, actorId).map((trip) => ({
    ...trip,
    choices: outingChoices(world, actorId, world.outings![trip.id]!),
  }));
}
function outingTerms(world: WorldState, actorId: string): Omit<OutingView, 'choices'>[] {
  const actor = world.entities[actorId];
  if (!actor) return [];
  return actorOutings(world, actorId).map((trip) => {
    const otherId = actorId === trip.proposerId ? trip.recipientId : trip.proposerId;
    const other = world.entities[otherId];
    const visible = !!other && seesEntity(world, actor, other);
    const here = worldPosition(actor),
      destination = trip.destination.point;
    const status =
      trip.status === 'pending'
        ? 'pending'
        : trip.arrived.includes(actorId)
          ? 'arrived'
          : 'traveling';
    return {
      id: trip.id,
      revision: trip.revision,
      destination: trip.destination.label,
      distance: Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z),
      companion: observerDescription(world, actorId, otherId, 'definite'),
      purpose: trip.purpose,
      status,
      company: BASE_OUTING.companyLabel(visible),
      description: BASE_OUTING.agreementDescription,
    };
  });
}
/** Action lists need exact choices, not a second projection of sight and travel distance. */
export function outingActions(world: WorldState, actorId: string): OutingView['choices'] {
  return actorOutings(world, actorId).flatMap((trip) => outingChoices(world, actorId, trip));
}
function outingChoices(world: WorldState, actorId: string, trip: Outing): OutingView['choices'] {
  const command = (
    operation: 'accept' | 'decline' | 'leave',
    mode?: CommandInput['outingMode'],
  ): CommandInput => ({
    type: 'outing',
    outingOperation: operation,
    outingId: trip.id,
    expectedRevision: trip.revision,
    ...(mode ? { outingMode: mode } : {}),
  });
  const make = (id: string, label: string, input: CommandInput) => ({
    id: `${id}:${trip.id}`,
    label,
    description: `${label}. ${BASE_OUTING.agreementDescription}${BASE_OUTING.purposeText(trip.purpose)}`,
    command: input,
  });
  if (trip.status === 'pending' && trip.recipientId === actorId) {
    const actor = world.entities[actorId]!.actor!;
    const busy =
      !!actor.action ||
      !!actor.agency.suspended ||
      actor.agency.plan?.status === 'active' ||
      actor.agency.plan?.status === 'blocked';
    return [
      make(
        'outing-accept',
        BASE_OUTING.acceptLabel(trip.destination.label, busy),
        command('accept', busy ? 'replace' : 'enqueue'),
      ),
      make('outing-decline', BASE_OUTING.declineLabel(trip.destination.label), command('decline')),
    ];
  }
  return [
    make(
      'outing-leave',
      trip.status === 'pending'
        ? BASE_OUTING.withdrawLabel(trip.destination.label)
        : BASE_OUTING.leaveLabel,
      command('leave'),
    ),
  ];
}
export function outingContext(world: WorldState, actorId: string): string {
  return outingTerms(world, actorId)
    .map(
      (trip) =>
        `${BASE_OUTING.context(trip.companion, trip.destination, trip.distance, trip.status, trip.company)}${BASE_OUTING.purposeText(trip.purpose)} ${trip.description}`,
    )
    .join('\n');
}
