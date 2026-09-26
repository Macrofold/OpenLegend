import type { WorldState, WorldEvent, Transition } from './types.js';
import { draftWorld } from './draft.js';
import { canonicalJson, emit, finish, outcome } from './events.js';

export { activeAppraisals } from './appraisals.js';
export { appraiseEvent } from './worlds/base/appraisals.js';
export type { Appraisal } from './appraisals.js';
export interface Kinship {
  id: string;
  firstId: string;
  secondId: string;
  kind: 'parent' | 'sibling';
}
/** Creator-authored immutable objective fact; accepted inner-world opinions cannot edit it. */
export function establishKinship(input: WorldState, fact: Kinship): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'kinship-rejected', message),
  });
  if (
    !/^[a-zA-Z0-9:_-]{1,120}$/.test(fact.id) ||
    !['parent', 'sibling'].includes(fact.kind) ||
    fact.firstId === fact.secondId ||
    !input.entities[fact.firstId]?.actor ||
    !input.entities[fact.secondId]?.actor
  )
    return reject('Invalid kinship.');
  const prior = input.kinships?.[fact.id];
  if (prior)
    return canonicalJson(prior) === canonicalJson(fact)
      ? {
          world: input,
          events: [],
          outcome: outcome(true, 'duplicate', 'Kinship already recorded.'),
        }
      : reject('Objective kinship cannot be rewritten.');
  if (
    Object.values(input.kinships ?? {}).some(
      (value) =>
        value.kind === fact.kind &&
        ((value.firstId === fact.firstId && value.secondId === fact.secondId) ||
          (fact.kind === 'sibling' &&
            value.firstId === fact.secondId &&
            value.secondId === fact.firstId)),
    )
  )
    return reject('Kinship already has an identity.');
  if (fact.kind === 'parent') {
    const descendants = new Set([fact.secondId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const value of Object.values(input.kinships ?? {}))
        if (
          value.kind === 'parent' &&
          descendants.has(value.firstId) &&
          !descendants.has(value.secondId)
        ) {
          descendants.add(value.secondId);
          changed = true;
        }
    }
    if (descendants.has(fact.firstId)) return reject('Parentage cannot contain a cycle.');
  }
  const world = draftWorld(input);
  (world.kinships ??= {})[fact.id] = { ...fact };
  const events: WorldEvent[] = [];
  emit(
    world,
    events,
    'kinship-established',
    'An objective kinship was recorded.',
    undefined,
    undefined,
    { significant: true, kinshipId: fact.id, godMode: true },
  );
  return finish(world, events, outcome(true, 'kinship-established', 'Objective kinship recorded.'));
}
