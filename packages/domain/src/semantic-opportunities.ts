import { entityGet } from './entity-collection.js';
import type { Entity, WorldState } from './types.js';

/** Saved with ordinary agency. Completing a model request never opens an interval.
 * docs/projects/attention-and-scenes-tech-design.md#55-semantic-noticing-through-existing-cognition */
export interface SemanticContinuation {
  interval: number;
  discovery: 'available' | 'reserved' | 'spent';
  reservation?: string;
  occupiedPurpose: string | null;
  /** One resolved choice per current cause family/anchor, pruned with exposure. */
  resolved: Record<string, { interval: number; qualitativeRevision: string; severity: number }>;
}

export const openingSemanticInterval = (): SemanticContinuation => ({
  interval: 0, discovery: 'available', occupiedPurpose: null, resolved: {},
});

function occupiedPurpose(entity: Entity): string | null {
  const actor = entity.actor;
  if (!actor) return null;
  const plan = actor.agency.plan;
  if (plan && (plan.status === 'active' || plan.status === 'blocked'))
    return JSON.stringify(['plan', plan.id]);
  // Utterances are instantaneous operations, not occupied native work.
  return actor.action ? JSON.stringify(['action', actor.action.id]) : null;
}

/** Called only for changed characters at native publication. Component plan steps
 * keep one purpose; reconnect, thinking, waiting and exposure churn do not renew it. */
export function reconcileSemanticInterval(world: WorldState, actorId: string): void {
  const entity = entityGet(world.entities, actorId);
  const continuation = entity?.actor?.agency.semantic;
  if (!entity || !continuation) return;
  const occupied = occupiedPurpose(entity);
  if (occupied === continuation.occupiedPurpose) return;
  if (occupied === null && continuation.occupiedPurpose !== null) {
    continuation.interval++;
    continuation.discovery = 'available';
    delete continuation.reservation;
    continuation.resolved = {};
  }
  continuation.occupiedPurpose = occupied;
}

export function discoveryInterval(world: WorldState, actorId: string): number | undefined {
  const entity = entityGet(world.entities, actorId), state = entity?.actor?.agency.semantic;
  return entity?.actor?.alive && state?.occupiedPurpose === null && state.discovery === 'available'
    ? state.interval : undefined;
}

export function reserveDiscovery(world: WorldState, actorId: string, interval: number, reservation: string): boolean {
  const state = entityGet(world.entities, actorId)?.actor?.agency.semantic;
  if (!state || discoveryInterval(world, actorId) !== interval) return false;
  state.discovery = 'reserved';
  state.reservation = reservation;
  return true;
}

/** A pre-dispatch refusal releases permission; actual dispatch consumes it, even on failure. */
export function settleDiscovery(world: WorldState, actorId: string, reservation: string, dispatched: boolean): boolean {
  const state = entityGet(world.entities, actorId)?.actor?.agency.semantic;
  if (!state || state.discovery !== 'reserved' || state.reservation !== reservation) return false;
  state.discovery = dispatched ? 'spent' : 'available';
  delete state.reservation;
  return true;
}

export function resolveSemanticCause(world: WorldState, actorId: string, key: string, qualitativeRevision: string, severity: number): void {
  const state = entityGet(world.entities, actorId)?.actor?.agency.semantic;
  if (!state) return;
  const live = world.perceptionEvidence?.[actorId]?.attention?.candidates ?? {};
  for (const existing of Object.keys(state.resolved)) {
    const anchor = JSON.parse(existing) as [string, string];
    if (!live[anchor[0]]) delete state.resolved[existing];
  }
  state.resolved[key] = { interval: state.interval, qualitativeRevision, severity };
}

export function semanticCauseResolved(world: WorldState, actorId: string, key: string, qualitativeRevision: string, severity: number): boolean {
  const state = entityGet(world.entities, actorId)?.actor?.agency.semantic, resolved = state?.resolved[key];
  return !!state && !!resolved && resolved.interval === state.interval &&
    resolved.qualitativeRevision === qualitativeRevision && resolved.severity >= severity;
}

export function validateSemanticContinuation(value: unknown): asserts value is SemanticContinuation {
  if (!value || typeof value !== 'object') throw new Error('Invalid semantic continuation.');
  const state = value as SemanticContinuation;
  if (!Number.isSafeInteger(state.interval) || state.interval < 0 ||
    !['available', 'reserved', 'spent'].includes(state.discovery) ||
    (state.discovery === 'reserved') !== (typeof state.reservation === 'string' && state.reservation.length > 0) ||
    (state.occupiedPurpose !== null && typeof state.occupiedPurpose !== 'string') ||
    !state.resolved || typeof state.resolved !== 'object' || Array.isArray(state.resolved))
    throw new Error('Invalid semantic continuation.');
  for (const [key, resolved] of Object.entries(state.resolved)) {
    let anchor: unknown;
    try { anchor = JSON.parse(key); } catch { throw new Error('Invalid resolved attention cause.'); }
    if (!Array.isArray(anchor) || anchor.length !== 2 || anchor.some((part) => typeof part !== 'string') ||
      !resolved || !Number.isSafeInteger(resolved.interval) || resolved.interval < 0 || resolved.interval > state.interval ||
      typeof resolved.qualitativeRevision !== 'string' || !Number.isFinite(resolved.severity) || resolved.severity < 0 || resolved.severity > 10)
      throw new Error('Invalid resolved attention cause.');
  }
}
