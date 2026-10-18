import type { SurfacePoint } from '@open-legend/spatial';
import { readOnlyDraftView } from './draft.js';
import type { Entity } from './types.js';

export interface ParticipationState {
  phase: 'active' | 'exiting' | 'inactive';
  revision: number;
  exitAttemptId?: string;
  returnAnchor?: SurfacePoint;
}
/** Inactivity removes an embodiment from physical participation, not from identity/history. */
export function activelyParticipates(entity: Entity | undefined): boolean {
  if (!entity) return false;
  entity = readOnlyDraftView(entity);
  const actor = entity.actor && readOnlyDraftView(entity.actor);
  const remains = entity.remains && readOnlyDraftView(entity.remains);
  const placement = entity.placement && readOnlyDraftView(entity.placement);
  const participation = actor?.participation && readOnlyDraftView(actor.participation);
  return (
    !entity.retirement &&
    !actor?.pendingDeath &&
    remains?.phase !== 'removed' &&
    placement?.mode === 'world' &&
    participation?.phase !== 'inactive'
  );
}
