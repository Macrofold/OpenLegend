import { useEffect, useRef, useState } from 'react';
import type { ActionOption, ApiResult, CommandReceiptResult } from '@open-legend/protocol';
import { post } from '../api';
import type { CommandDispatcher, CommandRequestIdentity } from '../command-request';

type PendingCommand = CommandRequestIdentity & { command: unknown; label: string };
type PendingState = { request?: PendingCommand; status: 'sending' | 'unknown' | 'checking' };

function restore(key: string): PendingState | undefined {
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
      'command' in value
    )
      return {
        status: 'unknown',
        request: {
          commandId: value.commandId,
          commandEpoch: value.commandEpoch,
          label: value.label,
          command: value.command,
        },
      };
  } catch {
    /* Keep the unresolved guard even when its saved request cannot be read. */
  }
  return { status: 'unknown' };
}

/** Keep uncertain custody changes across permitted reconnects. A missing receipt does
 * not justify a fresh gesture: it cannot prove that the earlier move did not happen. */
export function useInventoryCommand({
  worldId,
  actorId,
  timeline,
  scope,
  recoveryScope,
  epoch,
  connected,
  command,
  onResolved,
}: {
  worldId: string;
  actorId: string;
  timeline?: string;
  scope: string;
  recoveryScope?: string;
  epoch?: string;
  connected: boolean;
  command: CommandDispatcher;
  onResolved(result: ApiResult): void;
}) {
  const storageKey = recoveryScope
    ? `open-legend:inventory-command:${JSON.stringify([recoveryScope, worldId, actorId, timeline])}`
    : undefined;
  const [pending, setPending] = useState(() => (storageKey ? restore(storageKey) : undefined));
  const [message, setMessage] = useState('');
  const guard = useRef(!!pending);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function finish(result: ApiResult) {
    if (!storageKey) return;
    // If storage becomes unavailable, retain the guard. The native result remains
    // recoverable, and a remount cannot accidentally repeat the unresolved request.
    sessionStorage.removeItem(storageKey);
    guard.current = false;
    if (alive.current) {
      setPending(undefined);
      setMessage(result.message);
      onResolved(result);
    }
  }

  async function dispatch(action: ActionOption) {
    if (guard.current || !connected || !epoch || !action.enabled) return;
    if (!storageKey) {
      setMessage('Refresh character access before changing possessions.');
      return;
    }
    const request: PendingCommand = {
      commandId: crypto.randomUUID(),
      commandEpoch: epoch,
      command: action.command,
      label: action.label,
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(request));
    } catch {
      setMessage('This browser could not retain the request. Nothing was sent.');
      return;
    }
    guard.current = true;
    setPending({ request, status: 'sending' });
    setMessage('');
    try {
      const result = await command(action, request);
      if (!['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code)) {
        finish(result);
        return;
      }
      if (alive.current) setMessage(result.message);
    } catch (error: unknown) {
      if (alive.current)
        setMessage(error instanceof Error ? error.message : 'The outcome is unknown.');
    }
    if (alive.current) setPending({ request, status: 'unknown' });
  }

  async function check() {
    const request = pending?.request;
    if (!request || !connected || pending.status !== 'unknown') return;
    setPending({ request, status: 'checking' });
    try {
      const receipt = await post<CommandReceiptResult>('/api/command/receipt', {
        commandId: request.commandId,
        commandEpoch: request.commandEpoch,
        command: request.command,
      });
      if (!alive.current) return;
      if (receipt.scope !== scope) {
        setMessage('Character access changed. Reconnect before checking the result.');
      } else if (receipt.status === 'resolved') {
        finish(receipt.result);
        return;
      } else setMessage(receipt.message);
    } catch (error: unknown) {
      if (alive.current)
        setMessage(error instanceof Error ? error.message : 'The result is still unknown.');
    }
    if (alive.current) setPending({ request, status: 'unknown' });
  }

  return { pending, message, dispatch, check, setMessage };
}
