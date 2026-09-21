import type { WorldState, Transition } from './types.js';
import { nextId } from './data.js';
import { draftWorld } from './draft.js';
import { canonicalJson, finish, outcome } from './events.js';
import { canSpeak } from './living.js';
import { canHear } from './perception.js';

export interface Conversation {
  id: string;
  generation: number;
  startedAt: number;
  lastActivityAt?: number;
  endedAt?: number;
  mergedInto?: string;
  intervals: {
    id: string;
    actorId: string;
    joinedAt: number;
    leftAt?: number;
    transitionId: string;
  }[];
}
export interface ConversationTransition {
  id: string;
  at: number;
  order: number;
  kind: 'start' | 'join' | 'leave' | 'merge';
  conversationId: string;
  sourceId?: string;
  actorIds: string[];
  reason: string;
}
export interface ConversationState {
  version: 1;
  /** Earlier speech lacks association; never infer legacy participants or audiences. */
  legacyThrough: number;
  records: Record<string, Conversation>;
  active: Record<string, string>;
  transitions: Record<string, ConversationTransition>;
}
export function conversationState(world: WorldState): ConversationState {
  return (world.conversations ??= {
    version: 1,
    legacyThrough: world.nextId,
    records: {},
    active: {},
    transitions: {},
  });
}
function transition(
  world: WorldState,
  conversation: Conversation,
  kind: ConversationTransition['kind'],
  actorIds: string[],
  reason: string,
  sourceId?: string,
) {
  const state = conversationState(world);
  const id = nextId(world, 'conversation-transition');
  const record: ConversationTransition = {
    id,
    at: world.simTime,
    order: world.nextId,
    kind,
    conversationId: conversation.id,
    actorIds: [...actorIds].sort(),
    reason,
    ...(sourceId ? { sourceId } : {}),
  };
  state.transitions[id] = record;
  conversation.generation++;
  conversation.lastActivityAt = world.simTime;
  return record;
}
function join(
  world: WorldState,
  conversation: Conversation,
  actorIds: string[],
  kind: 'start' | 'join' = 'join',
) {
  const state = conversationState(world);
  const joining = actorIds.filter((id) => state.active[id] !== conversation.id);
  if (!joining.length) return;
  const receipt = transition(world, conversation, kind, joining, 'engagement');
  for (const actorId of joining) {
    if (state.active[actorId]) throw new Error('Conversation membership must merge atomically.');
    conversation.intervals.push({
      id: nextId(world, 'membership'),
      actorId,
      joinedAt: world.simTime,
      transitionId: receipt.id,
    });
    state.active[actorId] = conversation.id;
  }
}
export function leaveConversation(world: WorldState, actorId: string, reason: string) {
  const state = conversationState(world);
  const id = state.active[actorId];
  if (!id) return;
  const conversation = state.records[id]!;
  transition(world, conversation, 'leave', [actorId], reason);
  for (const interval of conversation.intervals)
    if (interval.actorId === actorId && interval.leftAt === undefined)
      interval.leftAt = world.simTime;
  delete state.active[actorId];
  if (!conversation.intervals.some((i) => i.leftAt === undefined))
    conversation.endedAt = world.simTime;
  const actor = world.entities[actorId]?.actor;
  if (actor) actor.planGeneration++;
}
function merge(world: WorldState, source: Conversation, destination: Conversation) {
  if (source.id === destination.id) return;
  if (source.endedAt !== undefined || destination.endedAt !== undefined)
    throw new Error('Cannot merge a closed conversation.');
  const state = conversationState(world);
  const members = source.intervals
    .filter((i) => i.leftAt === undefined)
    .map((i) => i.actorId)
    .sort();
  const receipt = transition(world, destination, 'merge', members, 'engagement', source.id);
  source.generation++;
  source.endedAt = world.simTime;
  source.mergedInto = destination.id;
  for (const interval of source.intervals)
    if (interval.leftAt === undefined) interval.leftAt = world.simTime;
  for (const actorId of members) {
    delete state.active[actorId];
    destination.intervals.push({
      id: nextId(world, 'membership'),
      actorId,
      joinedAt: world.simTime,
      transitionId: receipt.id,
    });
    state.active[actorId] = destination.id;
    const actor = world.entities[actorId]?.actor;
    if (actor) actor.planGeneration++;
  }
}
/** Called only after native speech admission, in the same transaction as speech/awareness. */
export function engageConversation(world: WorldState, actorId: string, targetId?: string): string {
  const state = conversationState(world);
  for (const member of [actorId, targetId]) {
    const active = member && state.active[member];
    if (active) state.records[active]!.lastActivityAt = world.simTime;
  }
  const source = state.active[actorId] ? state.records[state.active[actorId]!] : undefined;
  const destination =
    targetId && state.active[targetId] ? state.records[state.active[targetId]!] : undefined;
  if (source && destination && source.id !== destination.id) {
    merge(world, source, destination);
    return destination.id;
  }
  const conversation = destination ?? source;
  if (conversation) {
    join(world, conversation, [actorId, ...(targetId ? [targetId] : [])]);
    return conversation.id;
  }
  const id = nextId(world, 'conversation');
  const created: Conversation = { id, generation: 0, startedAt: world.simTime, intervals: [] };
  state.records[id] = created;
  join(world, created, [...new Set([actorId, ...(targetId ? [targetId] : [])])], 'start');
  return id;
}
export function changeConversation(
  input: WorldState,
  id: string,
  actorId: string,
  operation: 'join' | 'leave',
  conversationId: string,
  generation: number,
): Transition {
  const digest = canonicalJson({ actorId, operation, conversationId, generation });
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'conversation-rejected', message),
  });
  const prior = input.commandReceipts[id];
  if (prior)
    return prior.digest === digest
      ? { world: input, events: [], outcome: prior.outcome }
      : reject('Request identity reused.');
  const conversation = input.conversations?.records[conversationId];
  const entity = input.entities[actorId];
  if (
    !['join', 'leave'].includes(operation) ||
    (input.paused && operation !== 'leave') ||
    (operation === 'join' && !!(entity?.actor?.incapacitated || entity?.actor?.rest?.asleep)) ||
    !entity?.actor?.alive ||
    !canSpeak(entity) ||
    !conversation ||
    conversation.generation !== generation ||
    conversation.endedAt !== undefined
  )
    return reject('Conversation or actor is unavailable or changed.');
  const member = conversation.intervals.find(
    (i) =>
      i.leftAt === undefined &&
      !!input.entities[i.actorId]?.actor?.alive &&
      canHear(input, entity.position, input.entities[i.actorId]!.position),
  );
  if (operation === 'join' && !member) return reject('No participant is within hearing range.');
  if (operation === 'leave' && input.conversations!.active[actorId] !== conversationId)
    return reject('Actor is not a member.');
  const world = draftWorld(input);
  if (operation === 'leave') leaveConversation(world, actorId, 'explicit');
  else engageConversation(world, actorId, member!.actorId);
  const result = outcome(true, 'conversation-updated', `Conversation ${operation} committed.`);
  world.commandReceipts[id] = { digest, outcome: result };
  return finish(world, [], result);
}
export function reconcileConversations(world: WorldState): void {
  if (!world.conversations) return;
  for (const [actorId, id] of Object.entries(world.conversations.active)) {
    const entity = world.entities[actorId];
    if (!entity?.actor?.alive) {
      leaveConversation(world, actorId, 'death');
      continue;
    }
    const conversation = world.conversations.records[id]!;
    if (
      world.simTime - (conversation.lastActivityAt ?? conversation.startedAt) >=
      (world.socialPolicy?.conversationInactivitySeconds ?? 1800)
    ) {
      leaveConversation(world, actorId, 'inactivity');
      continue;
    }
    const members = conversation.intervals.filter(
      (i) => i.leftAt === undefined && i.actorId !== actorId,
    );
    if (
      members.length &&
      !members.some(
        (i) =>
          world.entities[i.actorId] &&
          canHear(world, entity.position, world.entities[i.actorId]!.position),
      )
    )
      leaveConversation(world, actorId, 'out-of-range');
  }
}
