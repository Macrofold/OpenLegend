import type { ActionOption, ApiResult } from '@open-legend/protocol';

/** Retain this exact identity and intention until the native receipt is known.
 * Retrying with a new ID could repeat a move whose response was lost.
 */
export interface CommandRequestIdentity {
  commandId: string;
  commandEpoch: string;
}

export type CommandDispatcher = (
  action: ActionOption,
  request?: CommandRequestIdentity,
) => Promise<ApiResult>;
