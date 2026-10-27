import { readOnlyDraftView } from './draft.js';
import { routineSensePolicy } from './perception.js';
import { capabilityBlocked } from './status-capabilities.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import type { Entity, WorldState } from './types.js';

interface SampleProgress {
  definitions: string;
  epochAt: number;
  nextAt: number;
  life: number;
  suspended: boolean;
}
export interface SensoryProgress {
  routineSight?: SampleProgress;
  incidentalContact?: SampleProgress;
  features?: Record<string, string>;
}
export interface RoutineObservation {
  sight: boolean;
  contact: boolean;
  sampledSight: boolean;
  sampledContact: boolean;
}
const noRoutineObservation = Object.freeze({
  sight: false,
  contact: false,
  sampledSight: false,
  sampledContact: false,
});
/** Keep a recurring clock on its original grid. Repeated addition drifts away
 * from mathematically coincident native deadlines and buys extra whole phases.
 * docs/simulation-time.md#native-interval-contract */
function nextSampleAt(epochAt: number, seconds: number, now: number): number {
  const ordinal = Math.floor((now - epochAt) / seconds) + 1;
  const nextAt = epochAt + ordinal * seconds;
  // Division can round the quotient just below an exact reached occurrence.
  return nextAt > now ? nextAt : epochAt + (ordinal + 1) * seconds;
}
/** Scheduling and recording must select the same observers. A quiet native body
 * has no routine evidence consumer; its retired clock cannot keep time advancing
 * in tiny steps while the recording phase correctly skips it. */
export function routineObservationRelevant(world: WorldState, observer: Entity): boolean {
  const current = readOnlyDraftView(observer),
    actor = current.actor && readOnlyDraftView(current.actor);
  if (!actor?.alive || !activelyParticipates(current)) return false;
  if (hasMemory(current) || (current.animal && readOnlyDraftView(current.animal).episode))
    return true;
  const table = readOnlyDraftView(world).perceptionEpisodes,
    episodes = table && readOnlyDraftView(table)[current.id];
  if (episodes) for (const _ in readOnlyDraftView(episodes)) return true;
  return false;
}
/** One timing owner for distinct senses: contact remains supported without vision.
 * Progress belongs to the complete transition, never the disposable native forecast.
 * Action admission, event-time hearing and consequential physics keep their owners. */
export function takeRoutineObservation(world: WorldState, observer: Entity): RoutineObservation {
  if (!routineObservationRelevant(world, observer)) {
    if (observer.sensoryProgress) delete observer.sensoryProgress;
    return noRoutineObservation;
  }
  const policy = routineSensePolicy(world, observer),
    blocked = capabilityBlocked(world, observer, 'perception'),
    stored = observer.sensoryProgress && readOnlyDraftView(observer.sensoryProgress),
    next: SensoryProgress = { ...stored },
    life = observer.actor?.physicalLife ?? 0;
  let changed = false;
  const due = (
    channel: Exclude<keyof SensoryProgress, 'features'>,
    sample: boolean,
    seconds: number | undefined,
    definitions: string | undefined,
  ) => {
    const prior = next[channel] && readOnlyDraftView(next[channel]!);
    if (!sample || !seconds || !definitions) {
      if (prior) {
        delete next[channel];
        changed = true;
      }
      return !!definitions;
    }
    if (blocked) {
      if (prior && !prior.suspended) {
        next[channel] = { ...prior, suspended: true };
        changed = true;
      }
      return false;
    }
    const fresh =
      !prior || prior.definitions !== definitions || prior.life !== life || prior.suspended;
    if (!fresh && prior.nextAt > world.simTime) return false;
    const epochAt = fresh ? world.simTime : prior.epochAt;
    const nextAt = nextSampleAt(epochAt, seconds, world.simTime);
    next[channel] = { definitions, life, suspended: false, epochAt, nextAt };
    changed = true;
    return true;
  };
  const sampledSight = policy.sight?.mode === 'cadence',
    sampledContact = policy.contact?.mode === 'sampled';
  let sight = due('routineSight', sampledSight, policy.sight?.seconds, policy.sight?.key),
    contact = due(
      'incidentalContact',
      sampledContact,
      policy.contact?.seconds,
      policy.contact?.key,
    );
  if (changed) {
    if (next.routineSight || next.incidentalContact) observer.sensoryProgress = next;
    else delete observer.sensoryProgress;
  }
  if (
    !policy.sight &&
    (world.visiblePeople?.[observer.id]?.length || world.visibleObjects?.[observer.id]?.length)
  )
    sight = true;
  if (!policy.contact && Object.keys(observer.actor?.contacts ?? {}).length) contact = true;
  // Loss/revocation cleanup is immediate even between ordinary samples.
  if (
    blocked &&
    (world.visiblePeople?.[observer.id]?.length ||
      world.visibleObjects?.[observer.id]?.length ||
      Object.keys(observer.actor?.contacts ?? {}).length ||
      Object.keys(world.perceptionEpisodes?.[observer.id] ?? {}).length)
  )
    sight = contact = true;
  // Deliberate watching is a distinct promise from incidental awareness.
  if (Object.values(observer.actor?.encounters?.pairs ?? {}).some((pair) => !!pair.watch))
    sight = true;
  return { sight, contact, sampledSight, sampledContact };
}

export function validateSensoryProgress(world: WorldState, entity: Entity): void {
  const progress = entity.sensoryProgress;
  if (progress === undefined) return;
  if (
    !entity.actor ||
    !hasRecordFields(progress, [], ['routineSight', 'incidentalContact', 'features']) ||
    (!progress.routineSight && !progress.incidentalContact)
  )
    throw new Error('Invalid sensory progress.');
  if (
    progress.features &&
    (!hasRecordFields(progress.features, [], Object.keys(progress.features)) ||
      Object.entries(progress.features).some(
        ([id, feature]) =>
          !isSafeRecordId(id) || typeof feature !== 'string' || feature.length > 2048,
      ))
  )
    throw new Error('Invalid personally observed feature baseline.');
  const policy = routineSensePolicy(world, entity);
  for (const [sample, channel] of [
    [progress.routineSight, policy.sight],
    [progress.incidentalContact, policy.contact],
  ] as const) {
    if (!sample) continue;
    if (
      !hasRecordFields(sample, ['definitions', 'epochAt', 'nextAt', 'life', 'suspended']) ||
      typeof sample.definitions !== 'string' ||
      !sample.definitions ||
      sample.definitions.length > 128 ||
      typeof sample.epochAt !== 'number' ||
      !Number.isFinite(sample.epochAt) ||
      sample.epochAt < 0 ||
      sample.epochAt > world.simTime ||
      typeof sample.nextAt !== 'number' ||
      !Number.isFinite(sample.nextAt) ||
      sample.nextAt <= sample.epochAt ||
      typeof sample.life !== 'number' ||
      !Number.isSafeInteger(sample.life) ||
      sample.life < 0 ||
      typeof sample.suspended !== 'boolean'
    )
      throw new Error('Invalid routine observation clock.');
    // A stale definition is allowed until the next observation resets its grid.
    // Under the same installed period, the cached deadline must belong to it.
    if (channel?.key === sample.definitions && channel.seconds) {
      const ordinal = Math.round((sample.nextAt - sample.epochAt) / channel.seconds);
      if (
        !Number.isSafeInteger(ordinal) ||
        ordinal < 1 ||
        sample.nextAt !== sample.epochAt + ordinal * channel.seconds ||
        sample.nextAt > nextSampleAt(sample.epochAt, channel.seconds, world.simTime)
      )
        throw new Error('Invalid routine observation sampling grid.');
    }
  }
}
