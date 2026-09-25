import { emit } from './events.js';
import { nextId } from './data.js';
import { bodiesTouch, sensesFor } from './perception.js';
import { distance, hasLineOfEffect } from './spatial.js';
import { capabilityBlocked } from './status-capabilities.js';
import type { ActorComponent, Entity, Position, WorldEvent, WorldState } from './types.js';

interface ContactCandidate {
  id: string;
  position: Position;
}

/** A physical detector owns continuous contacts, not identity knowledge. Losing the detector
 * clears live episodes without inventing a consciously perceived end event while disabled.
 * docs/spatial-world.md#physical-contact
 */
export function* updateContactEpisodes(
  world: WorldState,
  previousWorld: WorldState,
  observer: Entity,
  events: WorldEvent[],
  candidates: () => readonly ContactCandidate[],
): Generator<void, void, void> {
  const actor = observer.actor;
  if (!actor) return;
  const prior = actor.contacts ?? {};
  const touch = sensesFor(world, observer).find(
    (sense) => sense.implementation === 'body-contact-v1',
  );
  if (!actor.alive || capabilityBlocked(world, observer, 'perception') || !touch) {
    if (Object.keys(prior).length) actor.contacts = {};
    return;
  }

  const contacts: NonNullable<ActorComponent['contacts']> = {};
  let examined = 0;
  for (const candidate of candidates()) {
    // Yield by candidates examined, not only accepted contacts; keep exact body/geometry checks.
    if (examined++ && examined % 64 === 0) yield;
    const source = world.entities[candidate.id];
    if (
      !source ||
      source.id === observer.id ||
      !bodiesTouch(observer, source) ||
      !hasLineOfEffect(world, observer, source)
    )
      continue;
    const oldPosition = previousWorld.entities[source.id]?.position;
    const detail =
      oldPosition && distance(oldPosition, candidate.position) > 0.001 ? 'moving' : 'present';
    // A replaced detector cannot inherit another detector's continuous episode or authority.
    const old = prior[source.id];
    const previous = old?.senseId === touch.id ? old : undefined;
    const episode =
      previous && previous.detail === detail
        ? previous
        : {
            id: previous?.id ?? nextId(world, 'contact'),
            senseId: touch.id,
            detail,
            enteredAt: previous?.enteredAt ?? world.simTime,
            changedAt: world.simTime,
          };
    contacts[source.id] = episode;
    if (!previous || previous.detail !== detail)
      emit(
        world,
        events,
        'contact',
        detail === 'moving'
          ? 'I feel an unidentified moving contact.'
          : 'I feel an unidentified contact.',
        observer,
        undefined,
        {
          contactId: episode.id,
          senseId: touch.id,
          detail,
          change: previous ? 'detail' : 'onset',
          semanticTrigger: true,
          importance: 6,
        },
        'private',
      );
  }
  for (const [id, episode] of Object.entries(prior))
    if (!contacts[id] && episode.senseId === touch.id)
      emit(
        world,
        events,
        'contact',
        'A contact is no longer present.',
        observer,
        undefined,
        {
          contactId: episode.id,
          senseId: episode.senseId,
          change: 'end',
          semanticTrigger: true,
          importance: 6,
        },
        'private',
      );
  if (
    Object.keys(contacts).length !== Object.keys(prior).length ||
    Object.entries(contacts).some(([id, episode]) => episode !== prior[id])
  )
    actor.contacts = contacts;
}
