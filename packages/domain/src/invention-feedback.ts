import { draftWorld } from './draft.js';
import { emit, finish, outcome } from './events.js';
import type { Transition, WorldState } from './types.js';

/** A validation result is private evidence, never permission to retry or construct.
 * docs/architecture.md#shared-invention-workflow
 */
export function recordInventionFeedback(
  original: WorldState,
  actorId: string,
  requestId: string,
  message: string,
): Transition {
  const key = `invention-feedback:${requestId}`;
  if (original.paused)
    return {
      world: original,
      events: [],
      outcome: outcome(false, 'paused', 'Feedback remains in request history while paused.'),
    };
  if (original.commandReceipts[key] || !original.entities[actorId]?.actor?.alive)
    return {
      world: original,
      events: [],
      outcome: outcome(
        true,
        'already-delivered',
        'Feedback already delivered or inventor unavailable.',
      ),
    };
  const world = draftWorld(original);
  const events: Transition['events'] = [];
  emit(
    world,
    events,
    'invention-feedback',
    message.slice(0, 700),
    world.entities[actorId],
    undefined,
    { requestId, semanticTrigger: true },
    'private',
  );
  const result = outcome(true, 'invention-feedback', 'Private invention feedback delivered.');
  world.commandReceipts[key] = { digest: message, outcome: result };
  return finish(world, events, result);
}
