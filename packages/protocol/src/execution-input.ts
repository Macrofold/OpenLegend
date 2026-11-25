import type {
  TimedReleaseProfile,
  TimedReleaseInput,
  ExecutionAssessment,
} from '@open-legend/domain/execution-input';
export type {
  TimedReleaseProfile,
  TimedReleaseInput,
  ExecutionAssessment,
} from '@open-legend/domain/execution-input';
export interface WorldInputScope {
  /** Monotone within this server generation, including lane-token changes. */
  revision: number;
  inputEpoch: string;
  movementInputToken: string;
  attackInputToken: string;
  renewalIntervalMs: number;
  expiryMs: number;
}
export interface SteeringProfile {
  metresPerGameSecond: number;
  /** Maximum walkable rise/run. */
  maxSlope: number;
  effectiveAt: number;
}
/** Time processed at the confirmed pose, including a blocked step. */
export interface SteeringProgress {
  retiredThrough: number;
  /** Settled game-seconds for this movement token, including retired directions. */
  totalGameSeconds: number;
  active: { sequence: number; gameSeconds: number } | null;
}
export interface AttackInputIdentity {
  inputEpoch: string;
  attackInputToken: string;
  gestureSequence: number;
}
export interface AttackGestureIdentity extends AttackInputIdentity {
  beginCommandId: string;
}
export type AttackExecutionControl =
  | ({ operation: 'begin' } & AttackInputIdentity)
  | ({ operation: 'release'; input: TimedReleaseInput } & AttackGestureIdentity)
  | ({ operation: 'confirm-review' } & AttackInputIdentity)
  | ({ operation: 'cancel' } & AttackGestureIdentity);
export type WorldInputUpdate =
  | {
      kind: 'steer';
      inputEpoch: string;
      movementInputToken: string;
      movementSequence: number;
      direction: { x: number; z: number };
    }
  | {
      kind: 'renew';
      inputEpoch: string;
      renewalSequence: number;
      movement?: { movementInputToken: string; movementSequence: number };
      pendingRelease?: {
        attackInputToken: string;
        gestureSequence: number;
        beginCommandId: string;
        actionId: string;
      };
    };
export interface WorldInputResult {
  ok: boolean;
  code: string;
  message: string;
  inputScope: WorldInputScope;
  movementAccepted?: boolean;
  releaseAccepted?: boolean;
}
export interface AttackExecutionView {
  profile: TimedReleaseProfile;
  ready: boolean;
  releaseRequested: boolean;
  assessment?: ExecutionAssessment;
}
export interface AttackModeNotice {
  noticeSequence: number;
  occurrenceId: string;
  occurredAt: number;
  kind: 'own-offensive-action-admitted' | 'personally-experienced-assault';
}
