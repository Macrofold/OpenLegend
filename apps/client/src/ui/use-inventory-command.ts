import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ActionOption, ApiResult, CommandReceiptResult } from '@open-legend/protocol';
import { post } from '../api';
import {
  retainTradeInventoryReceipt,
  prepareTradeInventoryReceiptResolution,
} from '../trade-drafts';
import type { CommandDispatcher } from '../command-request';
import {
  inventoryCommandStorageKey,
  readInventoryCommand as restore,
  type PendingCommand,
} from '../inventory-command-record';

type PendingState = { request?: PendingCommand; status: 'sending' | 'unknown' | 'checking' };

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
  const storageKey = inventoryCommandStorageKey(recoveryScope, worldId, actorId, timeline);
  const [pending, setPending] = useState<PendingState | undefined>(() =>
    storageKey ? restore(storageKey) : undefined,
  );
  const [message, setMessage] = useState('');
  const guard = useRef(!!pending);
  const activeCommandId = useRef(pending?.request?.commandId);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const request = pending?.request;
    if (request?.tradeScope) retainTradeInventoryReceipt(request.tradeScope, request.commandId);
  }, [pending?.request?.commandId]);

  function finish(result: ApiResult, commandId: string, tradeScope?: string) {
    if (!storageKey || !alive.current || activeCommandId.current !== commandId) return;
    // If storage becomes unavailable, retain the guard. The native result remains
    // recoverable, and a remount cannot accidentally repeat the unresolved request.
    const saved = restore(storageKey);
    if (saved && !saved.request)
      throw new Error('The retained inventory request could not be read.');
    if (saved?.request && saved.request.commandId !== commandId)
      throw new Error(
        'The retained inventory request changed. Its original result must be checked.',
      );
    // A response from a former component can arrive after reconnect recovered that
    // command and the current component started another one. It cannot erase the latter.
    const releaseTrade = tradeScope
      ? prepareTradeInventoryReceiptResolution(tradeScope, commandId)
      : undefined;
    if (saved?.request?.commandId === commandId) {
      sessionStorage.removeItem(storageKey);
      if (sessionStorage.getItem(storageKey) !== null)
        throw new Error(
          'The retained Inventory request could not be cleared. Check its result again.',
        );
    }
    releaseTrade?.();
    activeCommandId.current = undefined;
    guard.current = false;
    if (alive.current) {
      setPending(undefined);
      setMessage(result.message);
      onResolved(result);
    }
  }

  async function dispatch(action: ActionOption, tradeScope?: string): Promise<ApiResult> {
    if (guard.current || !connected || !epoch || !action.enabled)
      return {
        ok: false,
        code: guard.current ? 'unconfirmed' : 'unavailable',
        message: guard.current
          ? 'Resolve the retained inventory request before acting again.'
          : 'Reconnect with current character control before acting. Nothing was sent.',
      };
    if (!storageKey) {
      setMessage('Refresh character access before changing possessions.');
      return {
        ok: false,
        code: 'unavailable',
        message: 'Refresh character access before changing possessions. Nothing was sent.',
      };
    }
    const request: PendingCommand = {
      commandId: crypto.randomUUID(),
      commandEpoch: epoch,
      command: action.command,
      label: action.label,
      ...(tradeScope ? { tradeScope } : {}),
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(request));
    } catch {
      setMessage('This browser could not retain the request. Nothing was sent.');
      return {
        ok: false,
        code: 'unavailable',
        message: 'This browser could not retain the request. Nothing was sent.',
      };
    }
    if (tradeScope) retainTradeInventoryReceipt(tradeScope, request.commandId);
    guard.current = true;
    activeCommandId.current = request.commandId;
    setPending({ request, status: 'sending' });
    setMessage('');
    let outcome: ApiResult = {
      ok: false,
      code: 'unconfirmed',
      message: 'The outcome is unknown. Check the original receipt before acting again.',
    };
    try {
      const result = await command(action, request);
      if (!['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code)) {
        finish(result, request.commandId, request.tradeScope);
        return result;
      }
      outcome = result;
      if (alive.current && activeCommandId.current === request.commandId)
        setMessage(result.message);
    } catch (error: unknown) {
      outcome = {
        ok: false,
        code: 'unconfirmed',
        message: error instanceof Error ? error.message : 'The outcome is unknown.',
      };
      if (alive.current && activeCommandId.current === request.commandId)
        setMessage(error instanceof Error ? error.message : 'The outcome is unknown.');
    }
    if (alive.current && activeCommandId.current === request.commandId)
      setPending({ request, status: 'unknown' });
    return outcome;
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
      if (!alive.current || activeCommandId.current !== request.commandId) return;
      if (receipt.scope !== scope) {
        setMessage('Character access changed. Reconnect before checking the result.');
      } else if (receipt.status === 'resolved') {
        finish(receipt.result, request.commandId, request.tradeScope);
        return;
      } else setMessage(receipt.message);
    } catch (error: unknown) {
      if (alive.current && activeCommandId.current === request.commandId)
        setMessage(error instanceof Error ? error.message : 'The result is still unknown.');
    }
    if (alive.current && activeCommandId.current === request.commandId)
      setPending({ request, status: 'unknown' });
  }

  return { pending, message, dispatch, check, setMessage };
}
