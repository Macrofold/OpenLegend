import {
  actorOutings,
  BASE_OUTING,
  BASE_COMBAT_HELP,
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
        : trip.status === 'helping'
          ? 'helping'
          : trip.arrived.includes(actorId)
            ? 'arrived'
            : 'traveling';
    return {
      id: trip.id,
      kind: trip.kind,
      revision: trip.revision,
      destination: trip.combat?.labels[actorId] ?? trip.destination.label,
      distance:
        trip.kind === 'combat-help'
          ? (() => {
              const opponent = world.entities[trip.combat!.opponentId];
              if (!opponent || !seesEntity(world, actor, opponent)) return null;
              const point = worldPosition(opponent);
              return Math.hypot(here.x - point.x, here.y - point.y, here.z - point.z);
            })()
          : Math.hypot(here.x - destination.x, here.y - destination.y, here.z - destination.z),
      companion: observerDescription(world, actorId, otherId, 'definite'),
      purpose: trip.purpose,
      status,
      company: BASE_OUTING.companyLabel(visible),
      description:
        trip.kind === 'combat-help'
          ? `${BASE_COMBAT_HELP.description}${trip.status === 'helping' ? ` ${BASE_COMBAT_HELP.workChoiceTerms}` : ''}`
          : BASE_OUTING.agreementDescription,
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
  const description =
    trip.kind === 'combat-help' ? BASE_COMBAT_HELP.description : BASE_OUTING.agreementDescription;
  const make = (id: string, label: string, input: CommandInput) => ({
    id: `${id}:${trip.id}`,
    label,
    description: `${label}. ${description}${BASE_OUTING.purposeText(trip.purpose)}`,
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
        trip.kind === 'combat-help'
          ? BASE_COMBAT_HELP.accept
          : BASE_OUTING.acceptLabel(trip.destination.label, busy),
        command('accept', busy ? 'replace' : 'enqueue'),
      ),
      make(
        'outing-decline',
        trip.kind === 'combat-help'
          ? BASE_COMBAT_HELP.decline
          : BASE_OUTING.declineLabel(trip.destination.label),
        command('decline'),
      ),
    ];
  }
  return [
    make(
      'outing-leave',
      trip.kind === 'combat-help'
        ? trip.status === 'pending'
          ? BASE_COMBAT_HELP.cancel
          : BASE_COMBAT_HELP.stop
        : trip.status === 'pending'
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
        `${trip.kind === 'combat-help' ? BASE_COMBAT_HELP.context(trip.companion, trip.destination, trip.distance, trip.status, trip.company) : BASE_OUTING.context(trip.companion, trip.destination, trip.distance!, trip.status, trip.company)}${BASE_OUTING.purposeText(trip.purpose)} ${trip.description}`,
    )
    .join('\n');
}
