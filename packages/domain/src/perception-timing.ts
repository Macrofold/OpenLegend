import { readOnlyDraftView } from './draft.js';
import { routineSensePolicy } from './perception.js';
import { capabilityBlocked } from './status-capabilities.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import type { Entity, WorldState } from './types.js';

interface SampleProgress {
  definitions: string;
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
    const nextAt = fresh
      ? world.simTime + seconds
      : prior.nextAt + (Math.floor((world.simTime - prior.nextAt) / seconds) + 1) * seconds;
    next[channel] = { definitions, life, suspended: false, nextAt };
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

export function validateSensoryProgress(entity: Entity): void {
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
  for (const sample of [progress.routineSight, progress.incidentalContact]) {
    if (!sample) continue;
    if (
      !hasRecordFields(sample, ['definitions', 'nextAt', 'life', 'suspended']) ||
      typeof sample.definitions !== 'string' ||
      !sample.definitions ||
      sample.definitions.length > 128 ||
      typeof sample.nextAt !== 'number' ||
      !Number.isFinite(sample.nextAt) ||
      sample.nextAt < 0 ||
      typeof sample.life !== 'number' ||
      !Number.isSafeInteger(sample.life) ||
      sample.life < 0 ||
      typeof sample.suspended !== 'boolean'
    )
      throw new Error('Invalid routine observation clock.');
  }
}
