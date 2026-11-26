import type { GameView } from '@open-legend/protocol';
import type { SurfacePoint, WorldPoint } from '@open-legend/spatial';

export const movementIntervalMs = 1000;
export const movementOffsetMs = (index: number) => 150 + index * 29;

export interface SustainedPlayer {
  actorId: string;
  accountId: string;
  cookie: string;
  clientId: string;
  destinations: readonly SurfacePoint[];
}

export interface SustainedClientSettings {
  root: string;
  driverDirectory: string;
  base: string;
  players: SustainedPlayer[];
  measuring: boolean;
}

export interface SustainedStart {
  go: true;
  began: number;
  start: number;
  end: number;
}

export interface SustainedAttempt {
  slot: number;
  scheduledAt: number;
  at: number;
  completedAt: number;
  sent: boolean;
  status?: number;
  ok: boolean;
  code?: string;
  error?: string;
}

export interface SustainedMove extends SustainedAttempt {
  commandId: string;
  actionId?: string;
  before: WorldPoint;
  beforeActionId?: string;
  target: SurfacePoint;
  firstStreamMovementAt?: number;
  firstStreamMovementMatchedBy?: 'action-id' | 'destination';
}

export interface ScheduleObservation {
  kind: 'presence' | 'movement';
  slot: number;
  scheduledAt: number;
  at: number;
  disposition: 'offered' | 'failed' | 'late-skipped' | 'stopped-skipped';
}

export interface SustainedStreamClose {
  reason: 'disconnect' | 'failure';
  receivedAtMs: number;
  incompleteFrame: boolean;
  error?: string;
}

export interface SustainedStreamStats {
  statusCode?: number;
  receivedBytes: number;
  frames: number;
  resetFrames: number;
  patchFrames: number;
  commentFrames: number;
  observedActions: number;
}

export interface SustainedPlayerResult {
  actorId: string;
  commands: SustainedMove[];
  presence: SustainedAttempt[];
  lateness: ScheduleObservation[];
  streamObservedPositionChange: boolean;
  measuredPatchFrames: number;
  stream: SustainedStreamStats & { close: SustainedStreamClose };
}

export interface SustainedClockReceipt
  extends Pick<GameView['clock'], 'paused' | 'pauseReason' | 'speed' | 'preparingNavigation'> {
  at: number;
  gameSeconds: number;
}

export interface SustainedClockSample {
  boundary: number;
  receipt?: SustainedClockReceipt;
}

export interface SustainedClientResult {
  pockets: SustainedPlayerResult[];
  clock: SustainedClockSample[];
}

export type SustainedHostMessage =
  | SustainedClientSettings
  | SustainedStart
  | { stop: true }
  | { finalResourceCutTaken: true };

export type SustainedClientMessage =
  | { booted: true }
  | { ready: true; commandEpochs: string[] }
  | { clockStarted: { receivedAt: number; gameSeconds: number } }
  | { streamFailure: { pocket: number; error?: string; streamClose: SustainedStreamClose } }
  | { offeredEnd: { offeredAtUnixMs: number; observedAtUnixMs: number } }
  | { result: SustainedClientResult };
