import { emit, outcome } from './events.js';
import { nextId } from './data.js';
import { canSpeak, supportsManualWork } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { seesEntity } from './perception.js';
import { canReachEntity } from './spatial.js';
import { worldSupport } from './spatial-state.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { isSafeRecordId } from './records.js';
import { finishPlanAction } from './agency.js';
import { occurrenceFor } from './action-experience.js';
import { person, subjectNarration } from './narration.js';
import { admitWork, requireAllocation, releaseWork, chargeWork } from './work-budget.js';
import {
  competenceValue,
  creditCoaching,
  practiceDefinition,
  validReleaseSupport,
  type ReleaseSupport,
} from './practical-competence.js';
import type { DefinitionPin } from './world-modules.js';
import type { Action, Command, Entity, Outcome, WorldEvent, WorldState } from './types.js';

export interface CoachingEpisode {
  id: string;
  learnerId: string;
  coachId: string;
  pin: DefinitionPin;
  phase: 'requested' | 'observing' | 'feedback';
  observed?: ReleaseSupport;
  actions: Record<string, string>;
  startedAt?: number;
}
type CoachingCommand = Extract<Command, { type: 'coaching' }>;
const allocation = { live: 1, retainedBytes: 2048, subscriptions: 2 };
const available = (world: WorldState, entity: Entity | undefined): entity is Entity =>
  !!entity?.actor?.alive &&
  !entity.actor.incapacitated &&
  !entity.retirement &&
  activelyParticipates(entity) &&
  supportsManualWork(entity) &&
  canSpeak(entity) &&
  worldSupport(entity) !== null &&
  !capabilityBlocked(world, entity, 'actions') &&
  !capabilityBlocked(world, entity, 'speech');
export function coachingFor(world: WorldState, actorId: string): CoachingEpisode | undefined {
  const id = world.entities[actorId]?.actor?.coachingEpisodeId;
  const episode = id ? world.coachingEpisodes?.[id] : undefined;
  return episode && [episode.learnerId, episode.coachId].includes(actorId) ? episode : undefined;
}
/** Saved allocation must belong to the same real episode and installed law. */
export function ownsCoachingWork(
  world: WorldState,
  id: string,
  actorId: string,
  pin: DefinitionPin,
  moduleId: string,
): boolean {
  const episode = world.coachingEpisodes?.[id];
  return (
    !!episode &&
    episode.id === id &&
    episode.learnerId === actorId &&
    episode.pin.id === moduleId &&
    sameDefinitionPin(episode.pin, pin)
  );
}
function parties(
  world: WorldState,
  episode: CoachingEpisode,
): [Entity | undefined, Entity | undefined] {
  return [world.entities[episode.learnerId], world.entities[episode.coachId]];
}
function episodeValid(world: WorldState, episode: CoachingEpisode): boolean {
  const [learner, coach] = parties(world, episode),
    definition = practiceDefinition(world, episode.pin.id);
  if (
    !definition ||
    !sameDefinitionPin(definitionPin(definition), episode.pin) ||
    !available(world, learner) ||
    !available(world, coach) ||
    competenceValue(learner.actor!, definition) === undefined ||
    !seesEntity(world, coach, learner) ||
    !seesEntity(world, learner, coach) ||
    (episode.phase === 'feedback' &&
      !canReachEntity(world, learner, coach, definition.practice!.communicationRange))
  )
    return false;
  if (episode.phase !== 'requested' && competenceValue(coach.actor!, definition) !== 1)
    return false;
  if (episode.observed) {
    if (occurrenceFor(world, learner.id, episode.observed.occurrenceId)?.revoked) return false;
    const ids = [episode.observed.eventId, episode.observed.occurrenceId];
    if (
      [learner.id, coach.id].some((id) =>
        ids.some(
          (source) =>
            world.experience?.forgotten[id]?.includes(source) ||
            world.experience?.corrections?.[id]?.[source],
        ),
      )
    )
      return false;
  }
  return true;
}
export function coachingProblem(
  world: WorldState,
  actor: Entity,
  command: CoachingCommand,
): Outcome | null {
  const rejected = () =>
    outcome(
      false,
      'coaching-unavailable',
      'This coaching episode is unavailable. Actual releases still count independently.',
    );
  const other = world.entities[command.targetId],
    definition = practiceDefinition(world, command.attributeId);
  const episode = coachingFor(world, actor.id);
  const matched =
    !!episode &&
    episode.id === command.episodeId &&
    episode.pin.id === command.attributeId &&
    [episode.learnerId, episode.coachId].includes(command.targetId) &&
    actor.id !== command.targetId;
  // Ending one's own episode does not require returning to the other person's reach
  // or possessing the competence needed to coach. Consent remains revocable.
  if (command.operation === 'withdraw') return matched ? null : rejected();
  if (command.operation === 'decline')
    return matched && episode.phase === 'requested' && actor.id === episode.coachId
      ? null
      : rejected();
  if (
    !definition ||
    !available(world, actor) ||
    !available(world, other) ||
    actor.id === other.id ||
    !seesEntity(world, actor, other) ||
    !canReachEntity(world, actor, other, definition.practice!.communicationRange)
  )
    return rejected();
  if (command.operation === 'request') {
    if (competenceValue(actor.actor!, definition) === undefined) return rejected();
    if (coachingFor(world, actor.id) || coachingFor(world, other.id))
      return outcome(
        false,
        'coaching-in-use',
        'One of the participants already has an unfinished coaching episode.',
      );
    requireAllocation(world, actor.id, definition.id, allocation);
    return null;
  }
  if (!matched) return rejected();
  if (!episodeValid(world, episode)) return rejected();
  if (command.operation === 'accept')
    return episode.phase === 'requested' &&
      actor.id === episode.coachId &&
      competenceValue(actor.actor!, definition) === 1
      ? null
      : rejected();
  if (command.operation === 'feedback') {
    if (!episode.observed || episode.phase === 'requested' || episode.actions[actor.id])
      return outcome(
        false,
        'observation-required',
        'Feedback requires a shot actually observed during this agreed episode, and each person must choose feedback once.',
      );
    if (actor.actor?.action)
      return outcome(
        false,
        'busy',
        'Finish or cancel your current activity before choosing feedback.',
      );
    return null;
  }
  return rejected();
}
export function applyCoaching(
  world: WorldState,
  actor: Entity,
  command: CoachingCommand,
  events: WorldEvent[],
): Outcome {
  const problem = coachingProblem(world, actor, command);
  if (problem) return problem;
  const definition = practiceDefinition(world, command.attributeId)!;
  if (command.operation === 'request') {
    const episode: CoachingEpisode = {
      id: nextId(world, 'coaching'),
      learnerId: actor.id,
      coachId: command.targetId,
      pin: definitionPin(definition),
      phase: 'requested',
      actions: {},
    };
    admitWork(world, {
      id: episode.id,
      actorId: actor.id,
      moduleId: definition.id,
      definitionPin: episode.pin,
      limit: { tests: 32, effects: 8 },
      allocation,
    });
    (world.coachingEpisodes ??= {})[episode.id] = episode;
    actor.actor!.coachingEpisodeId = episode.id;
    world.entities[command.targetId]!.actor!.coachingEpisodeId = episode.id;
    emit(
      world,
      events,
      'coaching-requested',
      subjectNarration(actor, [
        'asked ',
        person(command.targetId, 'object'),
        ` for ${definition.name.toLowerCase()} coaching. Agreement does not choose any future shot or feedback.`,
      ]),
      actor,
      command.targetId,
      { episodeId: episode.id, semanticTrigger: true },
    );
    return outcome(
      true,
      'coaching-requested',
      'Requested one coaching episode. The other person can accept or decline.',
    );
  }
  const episode = coachingFor(world, actor.id)!;
  if (command.operation === 'accept') {
    episode.phase = 'observing';
    emit(
      world,
      events,
      'coaching-accepted',
      subjectNarration(actor, [
        'agreed to observe ',
        person(episode.learnerId, 'object'),
        '. Both still choose feedback after an actual observed shot.',
      ]),
      actor,
      episode.learnerId,
      { episodeId: episode.id, semanticTrigger: true },
    );
    return outcome(
      true,
      'coaching-accepted',
      'Agreed to observe. The learner still chooses each real shot.',
    );
  }
  closeCoaching(
    world,
    episode,
    events,
    command.operation === 'decline' ? 'declined' : 'withdrawn',
    actor,
  );
  return outcome(
    true,
    'coaching-ended',
    'Coaching ended without completed feedback; actual shots remain.',
  );
}
export function registerFeedback(world: WorldState, actor: Entity, action: Action): void {
  const episode = coachingFor(world, actor.id)!;
  action.coachingEpisodeId = episode.id;
  episode.actions[actor.id] = action.id;
  episode.phase = 'feedback';
  if (episode.actions[episode.learnerId] && episode.actions[episode.coachId])
    episode.startedAt = world.simTime;
}
/** Bind event-time visual evidence, never a source lookup or hearsay. */
export function observeCoachedRelease(
  world: WorldState,
  learner: Entity,
  event: WorldEvent,
  support: ReleaseSupport | undefined,
  events: WorldEvent[],
): void {
  const episode = coachingFor(world, learner.id);
  if (
    !support ||
    !episode ||
    episode.learnerId !== learner.id ||
    episode.phase !== 'observing' ||
    episode.observed ||
    !episodeValid(world, episode)
  )
    return;
  const actual = occurrenceFor(world, learner.id, String(event.data?.['actionId']))?.release;
  const profile = practiceDefinition(world, episode.pin.id)?.practice;
  if (!actual?.family || !profile || !sameDefinitionPin(actual.family, profile.family)) return;
  const coach = world.entities[episode.coachId]!,
    target = world.entities[event.targetId ?? ''];
  if (
    !event.audience.includes(coach.id) ||
    !target ||
    !seesEntity(world, coach, target) ||
    !world.experience?.awareness[coach.id]?.some(
      (a) => a.eventId === event.id && a.modality === 'observed',
    )
  )
    return;
  episode.observed = support;
  emit(
    world,
    events,
    'coaching-observed',
    'The agreed coach observed a released shot and its visible result. Each person can now choose the guided feedback activity.',
    learner,
    coach.id,
    { episodeId: episode.id, semanticTrigger: true },
    'private',
  );
}
export function feedbackWaiting(world: WorldState, actor: Entity, action: Action): boolean {
  const episode = coachingFor(world, actor.id);
  return action.type === 'coaching' && !!episode && episode.startedAt === undefined;
}
export function completeFeedback(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): void {
  const episode = coachingFor(world, actor.id);
  if (
    !episode ||
    !episodeValid(world, episode) ||
    !episode.observed ||
    episode.startedAt === undefined
  ) {
    if (episode) closeCoaching(world, episode, events, 'interrupted', actor);
    return;
  }
  const definition = practiceDefinition(world, episode.pin.id)!;
  if (world.simTime - episode.startedAt + 1e-7 < definition.practice!.feedbackSeconds) return;
  const [learner, coach] = parties(world, episode);
  const learnerOccurrence = occurrenceFor(world, learner!.id, episode.actions[learner!.id]!);
  const coachOccurrence = occurrenceFor(world, coach!.id, episode.actions[coach!.id]!);
  if (
    !learnerOccurrence ||
    !coachOccurrence ||
    learnerOccurrence.revoked ||
    coachOccurrence.revoked
  ) {
    closeCoaching(world, episode, events, 'interrupted', actor);
    return;
  }
  const event = emit(
    world,
    events,
    'coaching-completed',
    subjectNarration(learner!, [
      'completed the chosen guided feedback with ',
      person(coach!.id, 'object'),
      '.',
    ]),
    learner,
    coach!.id,
    { episodeId: episode.id, observedShotEventId: episode.observed.eventId, semanticTrigger: true },
  );
  creditCoaching(
    world,
    learner!,
    definition,
    {
      eventId: event.id,
      observed: episode.observed,
      coachId: coach!.id,
      learnerEvidenceId: learnerOccurrence.id,
      coachEvidenceId: coachOccurrence.id,
    },
    events,
  );
  const progress = learner!.actor!.practice![definition.id]!;
  const result = outcome(
    true,
    'coaching-completed',
    `${definition.practice!.guidance} Completed coaching is retained once. ${Math.max(0, definition.practice!.coachedReleases - progress.releases.length)} further real releases remain for the coached route.`,
  );
  for (const participant of [learner!, coach!]) {
    const own = participant.actor!.action;
    if (own?.coachingEpisodeId === episode.id) {
      finishPlanAction(world, participant.id, own.id, result);
      participant.actor!.action = null;
    }
  }
  releaseEpisode(world, episode);
}
function releaseEpisode(world: WorldState, episode: CoachingEpisode): void {
  for (const id of [episode.learnerId, episode.coachId]) {
    const actor = world.entities[id]?.actor;
    if (actor?.coachingEpisodeId === episode.id) delete actor.coachingEpisodeId;
  }
  delete world.coachingEpisodes![episode.id];
  releaseWork(world, episode.id);
}
export function closeCoaching(
  world: WorldState,
  episode: CoachingEpisode,
  events: WorldEvent[],
  reason: string,
  source?: Entity,
): void {
  for (const id of [episode.learnerId, episode.coachId]) {
    const participant = world.entities[id],
      action = participant?.actor?.action;
    if (action?.coachingEpisodeId === episode.id) {
      finishPlanAction(
        world,
        id,
        action.id,
        outcome(false, 'cancelled', 'Feedback ended without completion. Actual shots remain.'),
      );
      participant!.actor!.action = null;
    }
  }
  emit(
    world,
    events,
    'coaching-ended',
    `The coaching episode ${reason}. No completed lesson was credited; actual shots remain.`,
    source ?? world.entities[episode.learnerId],
    undefined,
    { episodeId: episode.id, semanticTrigger: true },
  );
  releaseEpisode(world, episode);
}
export function reconcileCoaching(world: WorldState, events: WorldEvent[]): void {
  for (const episode of Object.values(world.coachingEpisodes ?? {})) {
    reconcileEpisode(world, episode, events);
  }
  // Prune once at publication, not after every ended episode: simultaneous
  // completions or interruptions must not repeatedly enumerate all other lessons.
  if (world.coachingEpisodes && !Object.keys(world.coachingEpisodes).length)
    delete world.coachingEpisodes;
}
/** Each feedback update checks only its own episode. The transition-end sweep still
 * closes affected requests/observation after edits, departure or evidence correction. */
export function reconcileActorCoaching(
  world: WorldState,
  actorId: string,
  events: WorldEvent[],
): void {
  const episode = coachingFor(world, actorId);
  if (episode) reconcileEpisode(world, episode, events);
}
function reconcileEpisode(world: WorldState, episode: CoachingEpisode, events: WorldEvent[]): void {
  chargeWork({ tests: 1 });
  if (
    !episodeValid(world, episode) ||
    Object.entries(episode.actions).some(
      ([id, action]) => world.entities[id]?.actor?.action?.id !== action,
    )
  )
    closeCoaching(world, episode, events, 'interrupted');
}
export function validateCoaching(world: WorldState): void {
  for (const [id, episode] of Object.entries(world.coachingEpisodes ?? {})) {
    const definition = practiceDefinition(world, episode.pin.id);
    if (
      id !== episode.id ||
      ![episode.id, episode.learnerId, episode.coachId].every(isSafeRecordId) ||
      episode.learnerId === episode.coachId ||
      !definition ||
      !sameDefinitionPin(definitionPin(definition), episode.pin) ||
      !['requested', 'observing', 'feedback'].includes(episode.phase) ||
      !world.workState?.invocations[episode.id] ||
      [episode.learnerId, episode.coachId].some(
        (id) => world.entities[id]?.actor?.coachingEpisodeId !== episode.id,
      ) ||
      Object.entries(episode.actions).some(
        ([id, action]) =>
          ![episode.learnerId, episode.coachId].includes(id) ||
          world.entities[id]?.actor?.action?.id !== action ||
          world.entities[id]?.actor?.action?.coachingEpisodeId !== episode.id ||
          world.entities[id]?.actor?.action?.type !== 'coaching' ||
          world.entities[id]?.actor?.action?.stage !== 'working' ||
          world.entities[id]?.actor?.action?.targetId !==
            (id === episode.learnerId ? episode.coachId : episode.learnerId) ||
          !world.entities[id]?.actor?.action?.competencePin ||
          !sameDefinitionPin(world.entities[id]!.actor!.action!.competencePin!, episode.pin),
      ) ||
      (episode.startedAt !== undefined &&
        (!Number.isFinite(episode.startedAt) ||
          episode.startedAt < 0 ||
          episode.startedAt > world.simTime ||
          Object.keys(episode.actions).length !== 2)) ||
      (Object.keys(episode.actions).length === 2 && episode.startedAt === undefined) ||
      (episode.phase !== 'feedback' &&
        (Object.keys(episode.actions).length !== 0 || episode.startedAt !== undefined)) ||
      (episode.phase === 'requested' && episode.observed !== undefined) ||
      (episode.observed &&
        !validReleaseSupport(
          world,
          episode.learnerId,
          definition.practice!.family,
          episode.observed,
        )) ||
      (episode.phase === 'feedback' &&
        (!episode.observed || Object.keys(episode.actions).length === 0))
    )
      throw new Error('Invalid current coaching episode.');
  }
  for (const entity of Object.values(world.entities)) {
    const episode = coachingFor(world, entity.id),
      action = entity.actor?.action;
    if (entity.actor?.coachingEpisodeId && !episode)
      throw new Error('Missing current coaching episode.');
    // Validate both directions: an orphan action would otherwise keep reaching
    // zero duration without a real episode able to complete or release its work.
    if (
      (action?.type === 'coaching' || action?.coachingEpisodeId) &&
      (!episode ||
        action.type !== 'coaching' ||
        action.coachingEpisodeId !== episode.id ||
        episode.actions[entity.id] !== action.id)
    )
      throw new Error('Invalid current coaching feedback action.');
  }
}
