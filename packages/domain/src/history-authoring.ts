import { nextId } from './data.js';
import { appendEvents, draftWorld } from './draft.js';
import { entityGet } from './entity-collection.js';
import { finish, outcome } from './events.js';
import { mutateExperience, type Awareness } from './experience.js';
import { hasMemory } from './living.js';
import { validateEventEvidence } from './speech.js';
import type { MemoryRecord, Transition, WorldEvent, WorldState } from './types.js';

export type AuthoredHistory =
  | {
      kind: 'memory';
      actorId: string;
      memory: Pick<
        MemoryRecord,
        'kind' | 'source' | 'summary' | 'at' | 'importance' | 'entityIds'
      > & { eventId?: string };
    }
  | {
      kind: 'event';
      event: Pick<WorldEvent, 'type' | 'text' | 'at'> &
        Pick<Partial<WorldEvent>, 'actorId' | 'targetId' | 'importance' | 'urgency' | 'data'>;
      perspectives: Array<Omit<Awareness, 'eventId' | 'at' | 'sequence'>>;
    };

/** Explicit creator history has exact observers; it never asks current perception who
 * must have heard a backdated event, or executes the event's mechanical effects. */
export function authorHistory(
  original: WorldState,
  input: AuthoredHistory,
  linkedEvent?: WorldEvent,
): Transition {
  const reject = (message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, 'history-rejected', message),
  });
  const source = input.kind === 'memory' ? input.memory : input.event;
  if (!Number.isFinite(source.at) || source.at < 0 || source.at > original.simTime)
    return reject('History must use a time already reached in this scenario.');
  const references =
    input.kind === 'memory'
      ? input.memory.entityIds
      : [
          input.event.actorId,
          input.event.targetId,
          ...input.perspectives.flatMap((entry) => entry.entityIds),
        ].filter((id): id is string => !!id);
  if (references.some((id) => !entityGet(original.entities, id)))
    return reject('A historical participant is unavailable in this scenario.');
  if (
    input.kind === 'memory' &&
    (input.memory.kind === 'commitment' ||
      (input.memory.eventId &&
        (linkedEvent?.id !== input.memory.eventId ||
          linkedEvent.at > source.at ||
          !linkedEvent.audience.includes(input.actorId))))
  )
    return reject(
      'A remembered source must be an earlier event personally available to this person. Active commitments need their ordinary obligation owner.',
    );
  const actors =
    input.kind === 'memory' ? [input.actorId] : input.perspectives.map((entry) => entry.actorId);
  if (
    new Set(actors).size !== actors.length ||
    actors.some((id) => !hasMemory(entityGet(original.entities, id)))
  )
    return reject('Select each supported observer once.');
  const world = draftWorld(original);
  if (input.kind === 'memory') {
    const value: MemoryRecord = {
      ...input.memory,
      id: nextId(world, 'memory'),
      actorId: input.actorId,
      sequence: world.nextId,
    };
    if (
      !mutateExperience(world, input.actorId, {
        operation: 'add',
        entry: { source: 'memory', value },
      })
    )
      return reject('The authored memory conflicts with current evidence.');
    world.sequence++;
    return finish(
      world,
      [],
      outcome(
        true,
        'history-authored',
        'Personal memory added. Other people have not acquired it.',
      ),
    );
  }
  const event: WorldEvent = {
    ...input.event,
    id: nextId(world, 'event'),
    order: world.nextId,
    sequence: original.sequence + 1,
    audience: actors,
  };
  for (const perspective of input.perspectives) {
    const value: Awareness = {
      ...perspective,
      // No observer facts are inferred from omniscient event.data. An omitted
      // account therefore carries an explicit empty native fact projection.
      ...(!perspective.speech && !perspective.sound
        ? { eventData: perspective.eventData ?? {} }
        : {}),
      eventId: event.id,
      eventType: event.type,
      at: event.at,
      sequence: world.nextId,
    };
    if (event.type === 'speech' && !value.speech)
      return reject('Authored speech needs each observer’s exact acquired words and attribution.');
    try {
      validateEventEvidence(value);
    } catch {
      return reject('A historical perspective has invalid attribution or acquisition evidence.');
    }
    if (
      !mutateExperience(world, value.actorId, {
        operation: 'add',
        entry: { source: 'awareness', value },
      })
    )
      return reject('A historical perspective conflicts with current evidence.');
  }
  appendEvents(world, [event]);
  world.sequence++;
  return finish(
    world,
    [],
    outcome(
      true,
      'history-authored',
      'Historical event and selected perspectives added. Native action effects were not replayed.',
    ),
  );
}
