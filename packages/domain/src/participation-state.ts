import type { SurfacePoint } from '@open-legend/spatial';
import type { Entity } from './types.js';

export interface ParticipationState {
  phase: 'active' | 'exiting' | 'inactive';
  revision: number;
  exitAttemptId?: string;
  returnAnchor?: SurfacePoint;
}
/** Inactivity removes an embodiment from physical participation, not from identity/history. */
export function activelyParticipates(entity: Entity | undefined): boolean {
  return (
    !!entity &&
    !entity.retirement &&
    entity.placement?.mode === 'world' &&
    entity.actor?.participation?.phase !== 'inactive'
  );
}
