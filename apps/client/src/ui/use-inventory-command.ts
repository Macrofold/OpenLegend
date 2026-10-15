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
const sameRequest = (left: PendingCommand, right: PendingCommand) =>
  left.commandId === right.commandId &&
  left.commandEpoch === right.commandEpoch &&
  left.label === right.label &&
  left.tradeScope === right.tradeScope &&
  JSON.stringify(left.command) === JSON.stringify(right.command);

/** Keep uncertain gameplay commands across permitted reconnects. A missing receipt
 * cannot prove that the earlier action did not happen or justify repeating it. */
export function useInventoryCommand({
  worldId,
  actorId,
  timeline,
  scope,
  recoveryScope,
  epoch,
  connected,
  task,
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
  task?: 'construction';
  command: CommandDispatcher;
  onResolved(result: ApiResult): void;
}) {
  const storageKey = inventoryCommandStorageKey(recoveryScope, worldId, actorId, timeline, task);
  const taskName = task ?? 'inventory';
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

  function finish(result: ApiResult, request: PendingCommand) {
    const { commandId, tradeScope } = request;
    if (!storageKey || !alive.current || activeCommandId.current !== commandId) return;
    // If storage becomes unavailable, retain the guard. The native result remains
    // recoverable, and a remount cannot accidentally repeat the unresolved request.
    const saved = restore(storageKey);
    if (saved && !saved.request)
      throw new Error(`The retained ${taskName} request could not be read.`);
    if (saved?.request && !sameRequest(saved.request, request))
      throw new Error(
        `The retained ${taskName} request changed. Its original result must be checked.`,
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
          `The retained ${taskName} request could not be cleared. Check its result again.`,
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
          ? `Resolve the retained ${taskName} request before acting again.`
          : 'Reconnect with current character control before acting. Nothing was sent.',
      };
    if (!storageKey) {
      const message = `Refresh character access before ${task ? 'starting construction' : 'changing possessions'}.`;
      setMessage(message);
      return {
        ok: false,
        code: 'unavailable',
        message: `${message} Nothing was sent.`,
      };
    }
    const previous = restore(storageKey);
    if (previous) {
      guard.current = true;
      activeCommandId.current = previous.request?.commandId;
      setPending(previous);
      setMessage(`The original ${taskName} request must be read and resolved before acting again.`);
      return {
        ok: false,
        code: 'unconfirmed',
        message: `The original ${taskName} request must be read and resolved. Nothing was sent.`,
      };
    }
    guard.current = true;
    const request: PendingCommand = {
      commandId: crypto.randomUUID(),
      commandEpoch: epoch,
      command: action.command,
      label: action.label,
      ...(tradeScope ? { tradeScope } : {}),
    };
    try {
      const serialized = JSON.stringify(request);
      sessionStorage.setItem(storageKey, serialized);
      if (sessionStorage.getItem(storageKey) !== serialized)
        throw new Error(`The exact ${taskName} request was not retained.`);
    } catch {
      const saved = restore(storageKey);
      guard.current = !!saved;
      activeCommandId.current = saved?.request?.commandId;
      setPending(saved);
      const message = saved
        ? `This browser could not retain the new request. No new request was sent. The earlier ${taskName} request still needs recovery.`
        : 'This browser could not retain the new request. No new request was sent.';
      setMessage(message);
      return {
        ok: false,
        code: 'unavailable',
        message,
      };
    }
    if (tradeScope) retainTradeInventoryReceipt(tradeScope, request.commandId);
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
        finish(result, request);
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
    if (!connected || pending?.status !== 'unknown') return;
    let request = pending.request;
    if (!request) {
      const saved = storageKey ? restore(storageKey) : { status: 'unknown' as const };
      guard.current = !!saved;
      activeCommandId.current = saved?.request?.commandId;
      setPending(saved);
      request = saved?.request;
      if (!request) {
        setMessage(
          saved
            ? `The original ${taskName} request still cannot be read. Restore browser storage and read it again.`
            : 'Browser storage is readable and no original request is retained. No new request was sent.',
        );
        return;
      }
    }
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
        finish(receipt.result, request);
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
