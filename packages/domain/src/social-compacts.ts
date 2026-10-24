import { EXPERIENCE_LIMITS } from './experience.js';
import { takeNativeChanges } from './native-change-feed.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { entityGet } from './entity-collection.js';
import { canonicalJson, emit, emitPrivateObservation, outcome } from './events.js';
import { nextId } from './data.js';
import { cloneValue, changedDraftEntityIds } from './draft.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './definition-pins.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { activelyParticipates } from './participation-state.js';
import { hasMemory } from './living.js';
import { seesEntity } from './perception.js';
import { cooperationReceptionProblem } from './outings.js';
import { socialOfferAdmissionProblem } from './social-offers.js';
import { stopOwnedOffense } from './agency.js';
import {
  actorCompactIds,
  indexCompact,
  dueCompactIds,
  prepareCompactIndex,
} from './social-compact-index.js';
import type { Command, Outcome, WorldEvent, WorldState } from './types.js';

export type CompactKind = 'alliance' | 'ceasefire';
export type CompactTerms =
  | { kind: 'alliance' }
  | {
      kind: 'ceasefire';
      durationSeconds: number;
      lives: Record<string, number>;
    };
interface CompactBase {
  id: string;
  revision: number;
  definition: DefinitionPin;
  proposerId: string;
  recipientId: string;
  lives: Record<string, number>;
  terms: CompactTerms;
  termsDigest: string;
  proposedAt: number;
  replyBy: number;
  replaces?: { compactId: string; acceptedRevision: number; termsDigest: string };
}
export type SocialCompact = CompactBase & {
  receivedEvidenceByActor: Record<
    string,
    { eventId: string; compactId: string; revision: number; termsDigest: string }
  >;
} & (
    | { phase: 'pending'; acceptedAt?: never; endAt?: never }
    | {
        phase: 'accepted';
        acceptedAt: number;
        endAt?: number;
      }
  );
export type PerceivedCompact = CompactBase & {
  phase: 'pending' | 'accepted' | 'ended';
  acceptedAt?: number;
  endAt?: number;
  endedBy?: string;
  cause?:
    | 'declined'
    | 'withdrawn'
    | 'deadline-reached'
    | 'expired-unanswered'
    | 'unavailable'
    | 'replaced'
    | 'chosen-harm';
};
export type CompactCommand =
  | { type: 'outing'; operation: 'compact-propose'; recipientId: string; compactKind: CompactKind }
  | { type: 'outing'; operation: 'compact-revise'; compactId: string; expectedRevision: number }
  | {
      type: 'outing';
      operation: 'compact-accept' | 'compact-decline' | 'compact-withdraw' | 'compact-leave';
      compactId: string;
      expectedRevision: number;
    };
export function isCompactCommand(
  command: Extract<Command, { type: 'outing' }>,
): command is CompactCommand & { id: string; actorId: string } {
  return [
    'compact-propose',
    'compact-revise',
    'compact-accept',
    'compact-decline',
    'compact-withdraw',
    'compact-leave',
  ].includes(command.operation);
}
const members = (compact: Pick<CompactBase, 'proposerId' | 'recipientId'>) => [
  compact.proposerId,
  compact.recipientId,
];
function validLives(value: unknown, actors: string[]): value is Record<string, number> {
  return (
    hasRecordFields(value, actors) &&
    Object.values(value).every((life) => Number.isSafeInteger(life) && Number(life) >= 0)
  );
}
function current(world: WorldState, compact: CompactBase): boolean {
  return (
    !!world.socialOfferPolicy &&
    sameDefinitionPin(compact.definition, definitionPin(world.socialOfferPolicy)) &&
    !!world.socialOfferPolicy.cooperation?.families.includes(compact.terms.kind) &&
    members(compact).every((id) => {
      const actor = entityGet(world.entities, id);
      return (
        !!actor?.actor?.alive &&
        activelyParticipates(actor) &&
        hasMemory(actor) &&
        (actor.actor.physicalLife ?? 0) === compact.lives[id]
      );
    })
  );
}
const knownByEntries = new WeakMap<
  object,
  { forgotten: string[] | undefined; corrections: unknown; value: PerceivedCompact[] }
>();
export function perceivedCompacts(world: WorldState, actorId: string): PerceivedCompact[] {
  const entries = world.experience?.awareness[actorId] ?? [],
    forgottenIds = world.experience?.forgotten[actorId],
    corrections = world.experience?.corrections?.[actorId];
  const cached = Object.isFrozen(entries) ? knownByEntries.get(entries) : undefined;
  if (cached && cached.forgotten === forgottenIds && cached.corrections === corrections)
    return cached.value;
  const known = new Map<string, PerceivedCompact>(),
    forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  for (const entry of entries) {
    if (
      entry.retentionClass !== 'memory' ||
      entry.eventType !== 'social-compact' ||
      forgotten.has(entry.eventId) ||
      corrections?.[entry.eventId]
    )
      continue;
    const body = entry.eventData?.agreement;
    if (typeof body !== 'string') continue;
    const value: unknown = JSON.parse(body);
    validatePerceivedCompact(value, actorId);
    known.set(value.id, value);
  }
  const value = [...known.values()];
  if (Object.isFrozen(entries))
    knownByEntries.set(entries, { forgotten: forgottenIds, corrections, value });
  return value;
}
export function compactTermsLabel(world: WorldState, terms: CompactTerms): string {
  const labels = world.socialOfferPolicy?.cooperation?.labels;
  return (
    (terms.kind === 'alliance' ? labels?.alliance : labels?.ceasefire)?.replace(
      '{seconds}',
      String(terms.kind === 'ceasefire' ? terms.durationSeconds : ''),
    ) ?? ''
  );
}
export function compactEndingText(
  cause: NonNullable<PerceivedCompact['cause']>,
  subject = 'A participant',
): string {
  return {
    declined: `${subject} declined the proposed terms.`,
    withdrawn: `${subject} withdrew assent.`,
    'deadline-reached': 'The agreed end time arrived.',
    'expired-unanswered': 'The reply deadline passed without acceptance.',
    unavailable: 'This agreement is no longer available.',
    replaced: 'Both participants accepted replacement terms.',
    'chosen-harm': `${subject} began a new attack, ending assent to these terms.`,
  }[cause];
}
function notice(
  world: WorldState,
  events: WorldEvent[],
  compact: SocialCompact | PerceivedCompact,
  actorId: string,
  sourceId?: string,
  cause?: PerceivedCompact['cause'],
): void {
  const observer = entityGet(world.entities, actorId);
  if (!observer?.actor || !hasMemory(observer)) return;
  if (
    cause &&
    !perceivedCompacts(world, actorId).some(
      (known) => known.id === compact.id && known.revision === compact.revision,
    )
  )
    return;
  const { receivedEvidenceByActor: _received, ...snapshot } = compact as SocialCompact;
  const value: PerceivedCompact = {
    ...cloneValue(snapshot),
    ...(cause ? { phase: 'ended', cause, ...(sourceId ? { endedBy: sourceId } : {}) } : {}),
  };
  const subject =
    sourceId === actorId
      ? 'You'
      : sourceId
        ? observerDescription(world, actorId, sourceId, 'definite')
        : 'A participant';
  const text = `${cause ? compactEndingText(cause, subject) : value.phase === 'pending' ? 'These exact terms were proposed.' : 'Both participants accepted these exact terms.'} ${compactTermsLabel(world, value.terms)}`;
  const data = {
    compactId: value.id,
    agreement: canonicalJson(value),
    // These exact terms and endings cannot be replaced by a lossy prose summary.
    importance: EXPERIENCE_LIMITS.protectedImportance,
    semanticTrigger: true,
  };
  const source = sourceId ? entityGet(world.entities, sourceId) : undefined;
  const event =
    source && source.id !== actorId
      ? emitPrivateObservation(
          world,
          events,
          'social-compact',
          observer,
          text,
          source,
          actorId,
          data,
        )
      : emit(world, events, 'social-compact', text, observer, undefined, data, 'private');
  if ('receivedEvidenceByActor' in compact && !cause)
    compact.receivedEvidenceByActor[actorId] = {
      eventId: event.id,
      compactId: compact.id,
      revision: compact.revision,
      termsDigest: compact.termsDigest,
    };
}
function close(
  world: WorldState,
  events: WorldEvent[],
  compact: SocialCompact,
  cause: NonNullable<PerceivedCompact['cause']>,
  sourceId?: string,
): void {
  prepareCompactIndex(world);
  for (const id of members(compact)) {
    if (
      sourceId
        ? id === sourceId || !cooperationReceptionProblem(world, sourceId, id)
        : cause === 'deadline-reached' || cause === 'expired-unanswered'
    )
      notice(world, events, compact, id, sourceId, cause);
  }
  delete world.socialCompacts![compact.id];
  indexCompact(world, compact.id);
  for (const related of pairCompacts(world, compact.proposerId, compact.recipientId))
    if (related.phase === 'pending' && related.replaces?.compactId === compact.id)
      close(world, events, related, 'unavailable');
}
function unavailable(): Outcome {
  return outcome(
    false,
    'compact-unavailable',
    'This agreement is no longer available. Review your own participation or choose separate work.',
  );
}
function pairCompacts(world: WorldState, a: string, b: string): SocialCompact[] {
  return [...actorCompactIds(world, a)].flatMap((id) => {
    const compact = world.socialCompacts?.[id];
    return compact && members(compact).includes(b) ? [compact] : [];
  });
}
type Prepared = { compact: SocialCompact; create?: true } | { remembered: PerceivedCompact };
export function prepareCompact(
  world: WorldState,
  command: CompactCommand & { actorId: string },
): Prepared | Outcome {
  const policy = world.socialOfferPolicy,
    installed = policy?.cooperation;
  if (!policy || !installed) return unavailable();
  if (command.operation === 'compact-propose') {
    const reception = cooperationReceptionProblem(world, command.actorId, command.recipientId);
    if (reception) return reception;
    if (!installed.families.includes(command.compactKind)) return unavailable();
    if (
      pairCompacts(world, command.actorId, command.recipientId).some(
        (c) => c.terms.kind === command.compactKind,
      )
    )
      return outcome(
        false,
        'compact-existing',
        'Review the existing terms before proposing their replacement.',
      );
    const admission = socialOfferAdmissionProblem(world, command.actorId, command.recipientId);
    if (admission) return admission;
    const lives = Object.fromEntries(
      [command.actorId, command.recipientId].map((id) => [
        id,
        entityGet(world.entities, id)!.actor!.physicalLife ?? 0,
      ]),
    );
    const terms: CompactTerms =
      command.compactKind === 'alliance'
        ? { kind: 'alliance' }
        : { kind: 'ceasefire', lives: { ...lives }, durationSeconds: installed.ceasefireSeconds! };
    return {
      create: true,
      compact: {
        id: '',
        revision: 1,
        proposerId: command.actorId,
        recipientId: command.recipientId,
        lives,
        terms,
        termsDigest: canonicalJson(terms),
        definition: definitionPin(policy),
        proposedAt: world.simTime,
        replyBy: world.simTime + policy.pendingSeconds,
        phase: 'pending',
        receivedEvidenceByActor: {},
      },
    };
  }
  const compact = world.socialCompacts?.[command.compactId];
  if (!compact) {
    if (command.operation === 'compact-leave' || command.operation === 'compact-withdraw') {
      const remembered = perceivedCompacts(world, command.actorId).find(
        (c) =>
          c.id === command.compactId &&
          c.revision === command.expectedRevision &&
          c.phase !== 'ended',
      );
      if (remembered) return { remembered };
    }
    return unavailable();
  }
  if (!members(compact).includes(command.actorId) || compact.revision !== command.expectedRevision)
    return unavailable();
  const ending =
    command.operation === 'compact-leave' ||
    command.operation === 'compact-withdraw' ||
    command.operation === 'compact-decline';
  if (ending) {
    if (
      command.operation === 'compact-decline' &&
      (compact.phase !== 'pending' || compact.recipientId !== command.actorId)
    )
      return unavailable();
    if (
      command.operation === 'compact-withdraw' &&
      (compact.phase !== 'pending' || compact.proposerId !== command.actorId)
    )
      return unavailable();
    if (command.operation === 'compact-leave' && compact.phase !== 'accepted') return unavailable();
    return { compact };
  }
  if (
    !current(world, compact) ||
    (compact.phase === 'pending'
      ? compact.replyBy <= world.simTime
      : (compact.endAt ?? Infinity) <= world.simTime)
  )
    return unavailable();
  const otherId = members(compact).find((id) => id !== command.actorId)!,
    reception = cooperationReceptionProblem(world, command.actorId, otherId);
  if (reception) return reception;
  if (command.operation === 'compact-accept') {
    if (compact.phase !== 'pending' || compact.recipientId !== command.actorId)
      return unavailable();
    if (compact.replaces) {
      const prior = world.socialCompacts?.[compact.replaces.compactId];
      if (
        !prior ||
        prior.phase !== 'accepted' ||
        prior.revision !== compact.replaces.acceptedRevision ||
        prior.termsDigest !== compact.replaces.termsDigest ||
        !current(world, prior)
      )
        return unavailable();
    }
    return { compact };
  }
  const otherPending = pairCompacts(world, command.actorId, otherId).some(
    (c) => c.id !== compact.id && c.phase === 'pending' && c.terms.kind === compact.terms.kind,
  );
  if (otherPending)
    return outcome(false, 'compact-existing', 'Review the pending replacement first.');
  const admission = socialOfferAdmissionProblem(
    world,
    command.actorId,
    otherId,
    compact.phase === 'pending' ? { family: 'compact', id: compact.id } : undefined,
  );
  if (admission) return admission;
  const replacement = cloneValue(compact);
  replacement.phase = 'pending';
  delete replacement.acceptedAt;
  delete replacement.endAt;
  replacement.proposerId = command.actorId;
  replacement.recipientId = otherId;
  replacement.proposedAt = world.simTime;
  replacement.replyBy = world.simTime + policy.pendingSeconds;
  replacement.receivedEvidenceByActor = {};
  if (compact.phase === 'accepted') {
    replacement.id = '';
    replacement.revision = 1;
    replacement.replaces = {
      compactId: compact.id,
      acceptedRevision: compact.revision,
      termsDigest: compact.termsDigest,
    };
  } else replacement.revision++;
  return { compact: replacement, ...(compact.phase === 'accepted' ? { create: true } : {}) };
}
/** Ceasefire assent stops future release, never already released physics or body recovery. */
function stopUnlaunchedHarm(
  world: WorldState,
  actorId: string,
  otherId: string,
  life: number,
): void {
  const actor = entityGet(world.entities, actorId)!.actor!;
  for (const plan of [actor.agency.plan, actor.agency.suspended]) {
    if (!plan || !['active', 'blocked'].includes(plan.status)) continue;
    stopOwnedOffense(world, actorId, otherId, life, {
      invocationId: actor.action?.id ?? '',
      planId: plan.id,
    });
  }
  const action = actor.action;
  if (
    action?.targetId === otherId &&
    action.targetLife === life &&
    action.strikePhase !== 'recovery' &&
    ['strike', 'hunt', 'aim', 'shoot-once'].includes(action.type)
  )
    stopOwnedOffense(world, actorId, otherId, life, { invocationId: action.id });
}
export function executeCompact(
  world: WorldState,
  command: CompactCommand & { actorId: string },
  events: WorldEvent[],
): Outcome {
  const prepared = prepareCompact(world, command);
  if ('ok' in prepared) return prepared;
  if ('remembered' in prepared) {
    notice(world, events, prepared.remembered, command.actorId, command.actorId, 'withdrawn');
    return outcome(true, 'compact-ended', 'You ended your own remembered participation.');
  }
  prepareCompactIndex(world);
  let compact = prepared.compact;
  if (
    command.operation === 'compact-leave' ||
    command.operation === 'compact-withdraw' ||
    command.operation === 'compact-decline'
  ) {
    close(
      world,
      events,
      compact,
      command.operation === 'compact-decline' ? 'declined' : 'withdrawn',
      command.actorId,
    );
    return outcome(true, 'compact-ended', 'Your assent ended. Completed effects remain.');
  }
  if (prepared.create) compact.id = nextId(world, 'compact');
  if (command.operation === 'compact-accept') {
    if (compact.terms.kind === 'ceasefire')
      for (const id of members(compact))
        stopUnlaunchedHarm(
          world,
          id,
          members(compact).find((other) => other !== id)!,
          compact.lives[members(compact).find((other) => other !== id)!]!,
        );
    if (compact.replaces) {
      delete world.socialCompacts![compact.id];
      indexCompact(world, compact.id);
      close(
        world,
        events,
        world.socialCompacts![compact.replaces.compactId]!,
        'replaced',
        command.actorId,
      );
    }
    compact = {
      ...compact,
      phase: 'accepted',
      acceptedAt: world.simTime,
      ...(compact.terms.kind === 'ceasefire'
        ? { endAt: world.simTime + compact.terms.durationSeconds }
        : {}),
    };
    compact.revision++;
  }
  (world.socialCompacts ??= {})[compact.id] = compact;
  indexCompact(world, compact.id, compact);
  for (const id of members(compact)) notice(world, events, compact, id, command.actorId);
  return outcome(
    true,
    'compact-recorded',
    'These exact terms were recorded. Each person retains independent choices and permissions.',
  );
}
const compactReconciliation = {};
export function reconcileCompacts(world: WorldState, events: WorldEvent[]): void {
  const changed = takeNativeChanges(world, compactReconciliation) ?? changedDraftEntityIds(world);
  const ids = new Set(dueCompactIds(world));
  if (changed)
    for (const actorId of changed) for (const id of actorCompactIds(world, actorId)) ids.add(id);
  else for (const id of Object.keys(world.socialCompacts ?? {})) ids.add(id);
  for (const id of ids) {
    const compact = world.socialCompacts?.[id];
    if (!compact) continue;
    if (compact.phase === 'pending' && compact.replyBy <= world.simTime)
      close(world, events, compact, 'expired-unanswered');
    else if (
      compact.phase === 'accepted' &&
      compact.endAt !== undefined &&
      compact.endAt <= world.simTime
    )
      close(world, events, compact, 'deadline-reached');
    else if (!current(world, compact)) close(world, events, compact, 'unavailable');
  }
}
export function knownCeasefireConsequence(
  world: WorldState,
  actorId: string,
  type: string,
  targetId?: string,
): string | undefined {
  if (!targetId || !['strike', 'hunt', 'aim', 'shoot-once'].includes(type)) return;
  if (
    perceivedCompacts(world, actorId).some(
      (c) =>
        c.phase === 'accepted' &&
        c.terms.kind === 'ceasefire' &&
        (c.endAt ?? 0) > world.simTime &&
        members(c).includes(targetId),
    )
  )
    return 'This ends your assent to the last ceasefire terms you received.';
}
export function ceasefiresForHarm(world: WorldState, command: Command): SocialCompact[] {
  if (
    !['strike', 'hunt', 'aim', 'shoot-once'].includes(command.type) ||
    !('targetId' in command) ||
    !command.targetId
  )
    return [];
  return pairCompacts(world, command.actorId, command.targetId).filter(
    (c) =>
      c.phase === 'accepted' &&
      c.terms.kind === 'ceasefire' &&
      (c.endAt ?? 0) > world.simTime &&
      current(world, c),
  );
}
export function endCeasefiresForChosenHarm(
  world: WorldState,
  command: Command,
  events: WorldEvent[],
): void {
  if (
    !['strike', 'hunt', 'aim', 'shoot-once'].includes(command.type) ||
    !('targetId' in command) ||
    !command.targetId
  )
    return;
  const ended = new Set<string>();
  for (const compact of ceasefiresForHarm(world, command)) {
    ended.add(compact.id);
    close(world, events, compact, 'chosen-harm', command.actorId);
  }
  // Choosing harm can end one's own remembered assent without revealing why the
  // other party's live participation was already unavailable.
  for (const known of perceivedCompacts(world, command.actorId))
    if (
      !ended.has(known.id) &&
      known.phase === 'accepted' &&
      known.terms.kind === 'ceasefire' &&
      (known.endAt ?? 0) > world.simTime &&
      members(known).includes(command.targetId)
    )
      notice(world, events, known, command.actorId, command.actorId, 'chosen-harm');
}

export function validatePerceivedCompact(
  value: unknown,
  actorId: string,
): asserts value is PerceivedCompact {
  validateBase(value, true);
  if (!members(value).includes(actorId)) throw new Error('Foreign personally received compact.');
}
function validateBase(value: unknown, personal: boolean): asserts value is PerceivedCompact {
  if (
    !hasRecordFields(
      value,
      [
        'id',
        'revision',
        'definition',
        'proposerId',
        'recipientId',
        'lives',
        'terms',
        'termsDigest',
        'proposedAt',
        'replyBy',
        'phase',
      ],
      personal
        ? ['acceptedAt', 'endAt', 'cause', 'endedBy', 'replaces']
        : ['acceptedAt', 'endAt', 'receivedEvidenceByActor', 'replaces'],
    ) ||
    !isSafeRecordId(value.id) ||
    !isSafeRecordId(value.proposerId) ||
    !isSafeRecordId(value.recipientId) ||
    value.proposerId === value.recipientId ||
    !isDefinitionPin(value.definition) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !validLives(value.lives, [String(value.proposerId), String(value.recipientId)]) ||
    !hasRecordFields(value.terms, ['kind'], ['lives', 'durationSeconds']) ||
    !(value.terms.kind === 'alliance'
      ? hasRecordFields(value.terms, ['kind'])
      : value.terms.kind === 'ceasefire' &&
        hasRecordFields(value.terms, ['kind', 'lives', 'durationSeconds']) &&
        validLives(value.terms.lives, [String(value.proposerId), String(value.recipientId)]) &&
        canonicalJson(value.terms.lives) === canonicalJson(value.lives) &&
        typeof value.terms.durationSeconds === 'number' &&
        Number.isFinite(value.terms.durationSeconds) &&
        value.terms.durationSeconds > 0) ||
    value.termsDigest !== canonicalJson(value.terms) ||
    !['proposedAt', 'replyBy'].every(
      (k) => typeof value[k] === 'number' && Number.isFinite(value[k]) && Number(value[k]) >= 0,
    ) ||
    Number(value.replyBy) <= Number(value.proposedAt) ||
    !['pending', 'accepted', ...(personal ? ['ended'] : [])].includes(String(value.phase)) ||
    (value.phase === 'pending' && (value.acceptedAt !== undefined || value.endAt !== undefined)) ||
    (value.phase === 'accepted' &&
      (typeof value.acceptedAt !== 'number' ||
        !Number.isFinite(value.acceptedAt) ||
        value.acceptedAt < Number(value.proposedAt) ||
        Number(value.revision) < 2)) ||
    (value.acceptedAt !== undefined &&
      (typeof value.acceptedAt !== 'number' ||
        !Number.isFinite(value.acceptedAt) ||
        value.acceptedAt < Number(value.proposedAt))) ||
    (value.terms.kind === 'alliance' && value.endAt !== undefined) ||
    (value.terms.kind === 'ceasefire' &&
      value.acceptedAt !== undefined &&
      value.endAt !== Number(value.acceptedAt) + Number(value.terms.durationSeconds)) ||
    (value.cause !== undefined &&
      ![
        'declined',
        'withdrawn',
        'deadline-reached',
        'expired-unanswered',
        'unavailable',
        'replaced',
        'chosen-harm',
      ].includes(String(value.cause))) ||
    (value.phase === 'ended' ? value.cause === undefined : value.cause !== undefined) ||
    (value.endAt !== undefined && value.acceptedAt === undefined) ||
    (['withdrawn', 'declined', 'chosen-harm'].includes(String(value.cause)) &&
      value.endedBy === undefined) ||
    (value.endedBy !== undefined &&
      (value.phase !== 'ended' ||
        typeof value.endedBy !== 'string' ||
        ![value.proposerId, value.recipientId].includes(value.endedBy))) ||
    (value.replaces !== undefined &&
      (!hasRecordFields(value.replaces, ['compactId', 'acceptedRevision', 'termsDigest']) ||
        !isSafeRecordId(value.replaces.compactId) ||
        value.replaces.compactId === value.id ||
        !Number.isSafeInteger(value.replaces.acceptedRevision) ||
        Number(value.replaces.acceptedRevision) < 2 ||
        typeof value.replaces.termsDigest !== 'string'))
  )
    throw new Error('Invalid exact social compact.');
}
export function validateSocialCompacts(world: WorldState): void {
  const pairs = new Set<string>();
  for (const [id, compact] of Object.entries(world.socialCompacts ?? {})) {
    validateBase(compact, false);
    if (
      id !== compact.id ||
      !current(world, compact) ||
      !hasRecordFields(compact.receivedEvidenceByActor, members(compact)) ||
      Object.values(compact.receivedEvidenceByActor).some(
        (evidence) =>
          !hasRecordFields(evidence, ['eventId', 'compactId', 'revision', 'termsDigest']) ||
          !isSafeRecordId(evidence.eventId) ||
          evidence.compactId !== compact.id ||
          evidence.revision !== compact.revision ||
          evidence.termsDigest !== compact.termsDigest,
      ) ||
      (compact.phase === 'pending'
        ? compact.replyBy <= world.simTime
        : (compact.endAt ?? Infinity) <= world.simTime)
    )
      throw new Error('Invalid live compact participation or evidence.');
    for (const actorId of members(compact)) {
      const evidence = compact.receivedEvidenceByActor[actorId]!;
      const source = world.experience?.awareness[actorId]?.find(
        (entry) => entry.eventId === evidence.eventId,
      );
      if (
        source &&
        (source.eventType !== 'social-compact' || typeof source.eventData?.agreement !== 'string')
      )
        throw new Error('Compact evidence refers to a different experience.');
      if (source) {
        const received: unknown = JSON.parse(source.eventData!.agreement as string);
        validatePerceivedCompact(received, actorId);
        if (
          received.id !== compact.id ||
          received.revision !== compact.revision ||
          received.termsDigest !== compact.termsDigest ||
          received.phase !== compact.phase
        )
          throw new Error('Compact evidence does not match these exact terms.');
      }
    }
    const key = JSON.stringify([members(compact).sort(), compact.terms.kind, compact.phase]);
    if (pairs.has(key)) throw new Error('Duplicate live pair/kind compact.');
    pairs.add(key);
    if (compact.phase === 'pending' && compact.replaces) {
      const prior = world.socialCompacts?.[compact.replaces.compactId];
      if (
        !prior ||
        prior.phase !== 'accepted' ||
        prior.revision !== compact.replaces.acceptedRevision ||
        prior.termsDigest !== compact.replaces.termsDigest ||
        canonicalJson(members(prior).sort()) !== canonicalJson(members(compact).sort()) ||
        prior.terms.kind !== compact.terms.kind
      )
        throw new Error('Invalid compact replacement reference.');
    }
  }
  for (const [actorId, entries] of Object.entries(world.experience?.awareness ?? {}))
    for (const entry of entries)
      if (entry.eventType === 'social-compact' && typeof entry.eventData?.agreement === 'string')
        validatePerceivedCompact(JSON.parse(entry.eventData.agreement), actorId);
}
