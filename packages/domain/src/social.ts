import type { WorldState, WorldEvent, Transition } from './types.js';
import { draftWorld } from './draft.js';
import { canonicalJson, emit, finish, outcome } from './events.js';
import { hasMemory } from './living.js';

export interface Appraisal {
  key: string;
  causeId: string;
  targetId: string;
  feeling: 'fear' | 'discomfort';
  intensity: number;
  at: number;
  decayPerHour: number;
}
export interface Kinship {
  id: string;
  firstId: string;
  secondId: string;
  kind: 'parent' | 'sibling';
}
/** Sparse native appraisals of personally experienced consequences, not relationship scores. */
export function appraiseEvent(world: WorldState, event: WorldEvent): void {
  if (
    !event.targetId ||
    !event.audience.includes(event.targetId) ||
    !hasMemory(world.entities[event.targetId])
  )
    return;
  const damage =
    event.type === 'shot'
      ? event.data?.['damage']
      : event.type === 'body-effect'
        ? -Number(event.data?.['healthDelta'] ?? 0)
        : 0;
  if (typeof damage !== 'number' || damage <= 0) return;
  const actorId = event.targetId;
  const feeling = event.type === 'shot' ? 'fear' : 'discomfort';
  const targetId = event.actorId ?? actorId;
  const key = `${feeling}:${targetId}`;
  const current = activeAppraisals(world, actorId).filter((value) => value.key !== key);
  current.push({
    key,
    causeId: event.id,
    targetId,
    feeling,
    intensity: Math.min(1, damage / (world.entities[actorId]!.actor!.body?.maxHealth ?? 100)),
    at: world.simTime,
    decayPerHour: 0.25,
  });
  (world.appraisals ??= {})[actorId] = current
    .sort((a, b) => b.intensity - a.intensity || a.key.localeCompare(b.key))
    .slice(0, 16);
}
export function activeAppraisals(world: WorldState, actorId: string): Appraisal[] {
  const forgotten = new Set(world.experience?.forgotten[actorId]);
  const corrected = world.experience?.corrections?.[actorId] ?? {};
  return (world.appraisals?.[actorId] ?? [])
    .filter((value) => !forgotten.has(value.causeId) && !corrected[value.causeId])
    .map((value) => ({
      ...value,
      intensity: Math.max(
        0,
        value.intensity - ((world.simTime - value.at) / 3600) * value.decayPerHour,
      ),
      at: world.simTime,
    }))
    .filter((value) => value.intensity > 0);
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
