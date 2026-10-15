import type { CommandRequestIdentity } from './command-request';

export type PendingCommand = CommandRequestIdentity & {
  command: unknown;
  label: string;
  tradeScope?: string;
};

export function inventoryCommandStorageKey(
  recoveryScope: string | undefined,
  worldId: string,
  actorId: string,
  timeline?: string,
) {
  return recoveryScope
    ? `open-legend:inventory-command:${JSON.stringify([recoveryScope, worldId, actorId, timeline])}`
    : undefined;
}

export function readInventoryCommand(
  key: string,
): { request?: PendingCommand; status: 'unknown' } | undefined {
  // Stored commands are only ever sent to the read-only receipt lookup. They are never
  // reconstructed as executable ActionOptions after a connection/control remount.
  try {
    const text = sessionStorage.getItem(key);
    if (!text) return undefined;
    if (text.length > 65536) return { status: 'unknown' };
    const value: unknown = JSON.parse(text);
    if (
      typeof value === 'object' &&
      value !== null &&
      'commandId' in value &&
      typeof value.commandId === 'string' &&
      value.commandId.length <= 200 &&
      'commandEpoch' in value &&
      typeof value.commandEpoch === 'string' &&
      value.commandEpoch.length <= 200 &&
      'label' in value &&
      typeof value.label === 'string' &&
      value.label.length <= 2000 &&
      'command' in value &&
      (!('tradeScope' in value) ||
        (typeof value.tradeScope === 'string' && value.tradeScope.length <= 2000))
    )
      return {
        status: 'unknown',
        request: {
          commandId: value.commandId,
          commandEpoch: value.commandEpoch,
          label: value.label,
          command: value.command,
          ...('tradeScope' in value ? { tradeScope: value.tradeScope as string } : {}),
        },
      };
  } catch {
    /* Keep the unresolved guard even when its saved request cannot be read. */
  }
  return { status: 'unknown' };
}
