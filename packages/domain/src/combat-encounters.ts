import { distance3D, SPATIAL_LIMITS } from '@open-legend/spatial';
import { entityGet, entityValues } from './entity-collection.js';
import { bodyPolicy } from './body-policy.js';
import { seesEntity, visionQuery } from './perception.js';
import { activelyParticipates } from './participation-state.js';
import { worldPosition } from './spatial-state.js';
import { subjectReferenceCurrent } from './worlds/base/knowledge.js';
import { emitPrivateObservation } from './events.js';
import { person, subjectNarration } from './narration.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { Action, Command, Entity, Position, WorldEvent, WorldState } from './types.js';
import type { Awareness } from './experience.js';
import { hasMemory } from './living.js';

export interface AttackObservationReceipt {
  life: number;
  episode: string | null;
}
export interface PersonalEncounter {
  otherLife: number;
  episode: string | null;
  hostileRevision: number;
  movementRevision: number;
  lastCause?: { id: string; at: number; kind: 'preparation' | 'release' | 'attempt' | 'contact' };
  incomingUntil?: number;
  active: Record<string, { kind: 'action' | 'projectile'; id: string }>;
  lastObserved?: { point: Position; at: number; distance: number };
  own?: {
    intentionId: string;
    revision: number;
    invocationId: string;
    method: Pick<Action, 'type' | 'definitionId' | 'weaponItemId' | 'ammoItemId'>;
    until?: number;
  };
  speak?: { hostileRevision: number; controller: 'player' | 'npc' | 'native' };
}
export interface PersonalEncounters {
  life: number;
  pairs: Record<string, PersonalEncounter>;
  unknown: Record<string, { at: number; until: number; sequence: number }>;
  nextAt?: number;
}

const life = (entity: Entity) => entity.actor?.physicalLife ?? 0;
const policy = (world: WorldState) => bodyPolicy(world)?.combat?.encounters;
const offensive = (action: Pick<Action, 'type'> | undefined | null) =>
  !!action && ['strike', 'hunt', 'aim', 'shoot-once'].includes(action.type);

/** One adapter for observable preparation. Approach and recovery disclose no target. */
export function attackPreparation(world: WorldState, source: Entity): Action | undefined {
  const action = source.actor?.action;
  return policy(world)?.visiblePreparation &&
    source.actor?.alive &&
    activelyParticipates(source) &&
    offensive(action) &&
    action?.stage === 'working' &&
    action.strikePhase !== 'recovery'
    ? action
    : undefined;
}
export function attackPreparationLabel(world: WorldState, source: Entity): string {
  const action = attackPreparation(world, source);
  const p = policy(world);
  return action && p ? (action.type === 'strike' ? p.preparingStrike : p.aiming) : '';
}
function owner(world: WorldState, observer: Entity): PersonalEncounters | undefined {
  if (!policy(world) || !observer.actor?.alive || !activelyParticipates(observer)) return;
  if (!observer.actor.encounters || observer.actor.encounters.life !== life(observer))
    observer.actor.encounters = { life: life(observer), pairs: {}, unknown: {} };
  return observer.actor.encounters;
}
function currentPair(
  world: WorldState,
  observer: Entity,
  other: Entity,
): PersonalEncounter | undefined {
  const state = observer.actor?.encounters;
  const pair = state?.pairs[other.id];
  return pair &&
    state?.life === life(observer) &&
    pair.otherLife === life(other) &&
    subjectReferenceCurrent(world, observer.id, other.id, pair.episode)
    ? pair
    : undefined;
}
function pairFor(
  world: WorldState,
  observer: Entity,
  other: Entity,
): PersonalEncounter | undefined {
  const state = owner(world, observer);
  if (!state) return;
  let pair = currentPair(world, observer, other);
  if (!pair)
    state.pairs[other.id] = pair = {
      otherLife: life(other),
      episode: world.perceptionEpisodes?.[observer.id]?.[other.id] ?? null,
      hostileRevision: 0,
      movementRevision: 0,
      active: {},
    };
  return pair;
}
function nextDeadline(state: PersonalEncounters): number | undefined {
  let at = Infinity;
  for (const pair of Object.values(state.pairs)) {
    if (pair.incomingUntil !== undefined) at = Math.min(at, pair.incomingUntil);
    if (pair.own?.until !== undefined) at = Math.min(at, pair.own.until);
  }
  for (const unknown of Object.values(state.unknown)) at = Math.min(at, unknown.until);
  return Number.isFinite(at) ? at : undefined;
}
function reschedule(state: PersonalEncounters): void {
  const at = nextDeadline(state);
  if (at !== undefined) state.nextAt = at;
  else delete state.nextAt;
}
function hostile(
  world: WorldState,
  pair: PersonalEncounter,
  cause: NonNullable<PersonalEncounter['lastCause']>,
  revision: number,
): void {
  if (pair.lastCause?.id === cause.id) return;
  pair.lastCause = cause;
  pair.hostileRevision = Math.max(pair.hostileRevision + 1, revision);
  pair.incomingUntil = cause.at + policy(world)!.recentSeconds;
  delete pair.speak;
}

/** Intake only the observation admitted by the existing event/experience owner.
 * Raw IDs bind integrity after source/subject disclosure, never establish recognition. */
export function acquireCombatObservation(
  world: WorldState,
  observation: Awareness,
  event: Readonly<WorldEvent>,
): void {
  const observer = entityGet(world.entities, observation.actorId);
  const p = policy(world);
  if (!observer?.actor?.alive || !p || !activelyParticipates(observer)) return;
  const projectileContact = event.type === 'projectile-contact' && event.targetId === observer.id;
  const feltContact =
    projectileContact ||
    (event.type === 'struck' &&
      event.targetId === observer.id &&
      event.data?.['contactInjury'] === true);
  const directed =
    observation.targetId === observer.id &&
    observation.sourceId !== observer.id &&
    ['struck', 'shot-released', 'attack-cue'].includes(observation.eventType ?? '');
  if (!feltContact && !directed) return;
  const sourceId = projectileContact ? event.data?.['contactSourceId'] : observation.sourceId;
  const source = typeof sourceId === 'string' ? entityGet(world.entities, sourceId) : undefined;
  const state = owner(world, observer);
  if (!state) return;
  if (!source || !seesEntity(world, observer, source)) {
    if (feltContact)
      state.unknown[event.id] = {
        at: event.at,
        until: event.at + p.recentSeconds,
        sequence: event.order ?? observation.sequence,
      };
    reschedule(state);
    return;
  }
  const pair = pairFor(world, observer, source);
  if (!pair) return;
  const kind = feltContact
    ? 'contact'
    : event.type === 'shot-released'
      ? 'release'
      : event.type === 'attack-cue'
        ? 'preparation'
        : 'attempt';
  hostile(world, pair, { id: event.id, at: event.at, kind }, event.order ?? observation.sequence);
  if (kind === 'release' && typeof event.data?.['projectileId'] === 'string') {
    const id = event.data['projectileId'];
    pair.active[JSON.stringify(['projectile', id])] = { kind: 'projectile', id };
  }
  pair.lastObserved = {
    point: { ...worldPosition(source) },
    at: event.at,
    distance: distance3D(worldPosition(observer), worldPosition(source)),
  };
  reschedule(state);
}

/** Accepted commands alone retain own offense. A preview/refusal never calls this. */
export function selectOffense(
  world: WorldState,
  actor: Entity,
  action: Action,
  command: Command,
): void {
  if (!hasMemory(actor) || !offensive(action) || !action.targetId) return;
  const other = entityGet(world.entities, action.targetId);
  if (!other?.actor || !seesEntity(world, actor, other)) return;
  const pair = pairFor(world, actor, other);
  if (!pair) return;
  pair.own = {
    intentionId: command.id,
    revision: (pair.own?.revision ?? 0) + 1,
    invocationId: action.id,
    method: {
      type: action.type,
      ...(action.definitionId ? { definitionId: action.definitionId } : {}),
      ...(action.weaponItemId ? { weaponItemId: action.weaponItemId } : {}),
      ...(action.ammoItemId ? { ammoItemId: action.ammoItemId } : {}),
    },
  };
  delete pair.speak;
  reschedule(actor.actor!.encounters!);
}

/** The action-result owner supplies its exact terminal boundary, including replacement,
 * failure and cancellation. Re-reading a completed result never renews this deadline. */
export function endOwnOffense(
  world: WorldState,
  actorId: string,
  targetId: string,
  invocationId: string,
): void {
  const state = entityGet(world.entities, actorId)?.actor?.encounters;
  const own = state?.pairs[targetId]?.own;
  const p = policy(world);
  if (!state || !own || own.invocationId !== invocationId || own.until !== undefined || !p) return;
  own.until = world.simTime + p.recentSeconds;
  reschedule(state);
}

/** Existing sensory preparation supplies only the observer's currently exposed people.
 * Work grows with those people and this observer's retained pairs, never world history. */
export function reconcileCombatSight(
  world: WorldState,
  observer: Entity,
  visible: readonly string[],
  events: WorldEvent[],
): void {
  const p = policy(world);
  if (!p || !observer.actor?.alive || !activelyParticipates(observer)) {
    if (observer.actor?.encounters) delete observer.actor.encounters;
    return;
  }
  const exposed = new Set(visible);
  for (const id of visible) {
    const source = entityGet(world.entities, id);
    if (!source?.actor) continue;
    const action = attackPreparation(world, source);
    const target = action?.targetId ? entityGet(world.entities, action.targetId) : undefined;
    if (
      !action ||
      !target?.actor ||
      action.targetLife !== life(target) ||
      (target.id !== observer.id && !exposed.has(target.id))
    )
      continue;
    const old = action.attackObservers?.[observer.id];
    const known =
      old?.life === life(observer) &&
      subjectReferenceCurrent(world, observer.id, source.id, old.episode);
    if (!known) {
      (action.attackObservers ??= {})[observer.id] = {
        life: life(observer),
        episode: world.perceptionEpisodes?.[observer.id]?.[source.id] ?? null,
      };
      // The ordinary event owner retains precise personally exposed cause and target.
      emitPrivateObservation(
        world,
        events,
        'attack-cue',
        observer,
        subjectNarration(source, [
          `${attackPreparationLabel(world, source)} `,
          person(target, 'object'),
          '.',
        ]),
        source,
        target.id,
        {
          actionId: action.id,
          sourceLife: life(source),
          targetLife: life(target),
          semanticTrigger: true,
          ...bodyPolicy(world)?.combat?.impactAttention,
        },
      );
    }
    if (target.id === observer.id) {
      const pair = pairFor(world, observer, source);
      const token = JSON.stringify(['action', action.id]);
      if (pair && !pair.active[token]) pair.active[token] = { kind: 'action', id: action.id };
    }
  }
  const state = observer.actor.encounters;
  if (!state) return;
  for (const [id, pair] of Object.entries(state.pairs)) {
    const other = entityGet(world.entities, id);
    if (!other?.actor || pair.otherLife !== life(other)) {
      delete state.pairs[id];
      continue;
    }
    const visibleNow = exposed.has(id) && currentPair(world, observer, other) === pair;
    const hadActive = Object.keys(pair.active).length > 0;
    for (const [token, active] of Object.entries(pair.active)) {
      const action = active.kind === 'action' ? attackPreparation(world, other) : undefined;
      const flight = active.kind === 'projectile' ? world.projectiles?.[active.id] : undefined;
      const current =
        active.kind === 'action'
          ? visibleNow &&
            action?.id === active.id &&
            action.targetId === observer.id &&
            action.targetLife === life(observer)
          : flight &&
            flight.sourceLife === pair.otherLife &&
            visionQuery(world, observer)({ id: flight.id, position: flight.position, height: 0 });
      if (!current) delete pair.active[token];
    }
    if (hadActive && !Object.keys(pair.active).length) {
      pair.incomingUntil = world.simTime + p.recentSeconds;
      pair.movementRevision++;
    }
    if (visibleNow && (pair.lastCause || pair.own)) {
      const point = worldPosition(other);
      const distance = distance3D(worldPosition(observer), point);
      if (
        pair.lastObserved &&
        (Math.abs(distance - pair.lastObserved.distance) > SPATIAL_LIMITS.epsilon ||
          distance3D(point, pair.lastObserved.point) > SPATIAL_LIMITS.epsilon)
      ) {
        pair.movementRevision++;
        pair.lastObserved = { point: { ...point }, at: world.simTime, distance };
      }
    }
  }
  expireCombatEncounters(world, observer);
  reschedule(state);
}

/** Due work uses original absolute deadlines. Speak survives ordinary grace expiry. */
export function expireCombatEncounters(world: WorldState, observer: Entity): void {
  const state = observer.actor?.encounters;
  if (!state) return;
  if (
    !policy(world) ||
    state.life !== life(observer) ||
    !observer.actor?.alive ||
    !activelyParticipates(observer)
  ) {
    delete observer.actor!.encounters;
    return;
  }
  for (const [id, pair] of Object.entries(state.pairs)) {
    if (pair.incomingUntil !== undefined && pair.incomingUntil <= world.simTime)
      delete pair.incomingUntil;
    if (pair.own?.until !== undefined && pair.own.until <= world.simTime) delete pair.own;
    if (!pair.incomingUntil && !pair.own && !Object.keys(pair.active).length) {
      if (!pair.speak) delete state.pairs[id];
      else {
        // A deliberate social preference needs its exact pair/revision, not expired
        // attack details or a second permanent history of the encounter.
        delete pair.lastCause;
        delete pair.lastObserved;
      }
    }
  }
  for (const [id, unknown] of Object.entries(state.unknown))
    if (unknown.until <= world.simTime) delete state.unknown[id];
  reschedule(state);
}

export function personalEncounter(
  world: WorldState,
  observerId: string,
  otherId: string,
): PersonalEncounter | undefined {
  const observer = entityGet(world.entities, observerId),
    other = entityGet(world.entities, otherId);
  return policy(world) &&
    observer?.actor?.alive &&
    other?.actor?.alive &&
    activelyParticipates(observer) &&
    activelyParticipates(other) &&
    seesEntity(world, observer, other)
    ? currentPair(world, observer, other)
    : undefined;
}

/** Revocation changes only this observer's derived short-lived account. Real work,
 * committed effects and other observers' evidence keep their own lifetimes. */
export function revokeCombatEvidence(
  world: WorldState,
  observerId: string,
  affected: ReadonlySet<string>,
): void {
  const state = entityGet(world.entities, observerId)?.actor?.encounters;
  if (!state) return;
  for (const pair of Object.values(state.pairs))
    if (pair.lastCause && affected.has(pair.lastCause.id)) {
      delete pair.lastCause;
      delete pair.incomingUntil;
      pair.active = {};
      delete pair.speak;
    }
  for (const id of affected) delete state.unknown[id];
  reschedule(state);
}

export function validateCombatEncounters(world: WorldState): void {
  const dictionary = (value: unknown): boolean =>
    !!value && typeof value === 'object' && !Array.isArray(value);
  for (const observer of entityValues(world.entities)) {
    const receipts = observer.actor?.action?.attackObservers;
    if (receipts !== undefined) {
      if (!dictionary(receipts)) throw new Error('Invalid attack observation receipts.');
      for (const [id, receipt] of Object.entries(receipts))
        if (
          !isSafeRecordId(id) ||
          !hasRecordFields(receipt, ['life', 'episode']) ||
          !Number.isSafeInteger(receipt.life) ||
          receipt.life < 0 ||
          (receipt.episode !== null && (typeof receipt.episode !== 'string' || !receipt.episode))
        )
          throw new Error('Invalid attack observation receipt.');
    }
    const state = observer.actor?.encounters;
    if (!state) continue;
    if (
      !policy(world) ||
      !hasRecordFields(state, ['life', 'pairs', 'unknown'], ['nextAt']) ||
      state.life !== life(observer) ||
      !dictionary(state.pairs) ||
      !dictionary(state.unknown) ||
      (state.nextAt !== undefined && (!Number.isFinite(state.nextAt) || state.nextAt < 0))
    )
      throw new Error('Invalid personal encounter owner.');
    for (const [id, pair] of Object.entries(state.pairs)) {
      if (
        !isSafeRecordId(id) ||
        !hasRecordFields(
          pair,
          ['otherLife', 'episode', 'hostileRevision', 'movementRevision', 'active'],
          ['lastCause', 'incomingUntil', 'lastObserved', 'own', 'speak'],
        ) ||
        ![pair.otherLife, pair.hostileRevision, pair.movementRevision].every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        ) ||
        (pair.episode !== null && (typeof pair.episode !== 'string' || !pair.episode)) ||
        !dictionary(pair.active)
      )
        throw new Error('Invalid personal encounter pair.');
      for (const [token, active] of Object.entries(pair.active))
        if (
          !hasRecordFields(active, ['kind', 'id']) ||
          !['action', 'projectile'].includes(active.kind) ||
          !isSafeRecordId(active.id) ||
          token !== JSON.stringify([active.kind, active.id])
        )
          throw new Error('Invalid observed attack binding.');
      if (
        pair.incomingUntil !== undefined &&
        (!Number.isFinite(pair.incomingUntil) || pair.incomingUntil < 0)
      )
        throw new Error('Invalid incoming encounter deadline.');
      if (
        pair.lastCause &&
        (!hasRecordFields(pair.lastCause, ['id', 'at', 'kind']) ||
          !isSafeRecordId(pair.lastCause.id) ||
          !['preparation', 'release', 'attempt', 'contact'].includes(pair.lastCause.kind) ||
          !Number.isFinite(pair.lastCause.at) ||
          pair.lastCause.at < 0 ||
          pair.lastCause.at > world.simTime)
      )
        throw new Error('Invalid encounter cause.');
      if (
        pair.lastObserved &&
        (!hasRecordFields(pair.lastObserved, ['point', 'at', 'distance']) ||
          !pair.lastObserved.point ||
          ![
            pair.lastObserved.point.x,
            pair.lastObserved.point.y,
            pair.lastObserved.point.z,
            pair.lastObserved.at,
            pair.lastObserved.distance,
          ].every(Number.isFinite) ||
          pair.lastObserved.at < 0 ||
          pair.lastObserved.at > world.simTime ||
          pair.lastObserved.distance < 0)
      )
        throw new Error('Invalid observed encounter position.');
      if (
        pair.own &&
        (!hasRecordFields(
          pair.own,
          ['intentionId', 'revision', 'invocationId', 'method'],
          ['until'],
        ) ||
          !isSafeRecordId(pair.own.intentionId) ||
          !isSafeRecordId(pair.own.invocationId) ||
          !Number.isSafeInteger(pair.own.revision) ||
          pair.own.revision < 1 ||
          !hasRecordFields(
            pair.own.method,
            ['type'],
            ['definitionId', 'weaponItemId', 'ammoItemId'],
          ) ||
          !offensive(pair.own.method) ||
          (pair.own.method.type === 'strike'
            ? !isSafeRecordId(pair.own.method.definitionId)
            : !isSafeRecordId(pair.own.method.weaponItemId) ||
              !isSafeRecordId(pair.own.method.ammoItemId)) ||
          Object.entries(pair.own.method).some(
            ([key, value]) => key !== 'type' && !isSafeRecordId(value),
          ) ||
          (pair.own.until !== undefined &&
            (!Number.isFinite(pair.own.until) || pair.own.until < 0)))
      )
        throw new Error('Invalid own offensive preference.');
      if (
        pair.speak &&
        (!hasRecordFields(pair.speak, ['hostileRevision', 'controller']) ||
          pair.speak.hostileRevision !== pair.hostileRevision ||
          !['player', 'npc', 'native'].includes(pair.speak.controller))
      )
        throw new Error('Invalid deliberate speech preference.');
    }
    for (const [id, unknown] of Object.entries(state.unknown))
      if (
        !isSafeRecordId(id) ||
        !hasRecordFields(unknown, ['at', 'until', 'sequence']) ||
        ![unknown.at, unknown.until].every(Number.isFinite) ||
        unknown.at < 0 ||
        unknown.at > world.simTime ||
        unknown.until < unknown.at ||
        !Number.isSafeInteger(unknown.sequence) ||
        unknown.sequence < 0
      )
        throw new Error('Invalid anonymous danger evidence.');
    if (state.nextAt !== nextDeadline(state))
      throw new Error('Invalid personal encounter scheduling deadline.');
  }
}
