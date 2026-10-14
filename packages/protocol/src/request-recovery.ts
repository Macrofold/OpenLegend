import type { ApiResult } from './index.js';

/** Recovery establishes the original request's outcome, not a new permission to execute it.
 * For an action, successful admission is distinct from completion of physical work. */
export type RequestRecoveryResult =
  | {
      ok: true;
      scope: string;
      status: 'resolved';
      message: string;
      result: ApiResult;
    }
  | {
      ok: true;
      scope: string;
      status: 'pending' | 'unknown';
      message: string;
    }
  | { ok: false; code: string; message: string };

export type CheckpointRequest =
  | { operation: 'create'; requestId: string; label: string; timeline: string }
  | { operation: 'load'; requestId: string; saveId: string; label: string; timeline: string };
