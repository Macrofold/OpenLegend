import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ActionOption, ApiResult, CommandReceiptResult } from '@open-legend/protocol';
import { post } from '../api';
import {
  retainTradeInventoryReceipt,
  prepareTradeInventoryReceiptResolution,
  refreshTradeInventoryRecovery,
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
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const access = JSON.stringify([storageKey, scope, connected]);
  const currentAccess = useRef(access);
  currentAccess.current = access;
  const previousAccess = useRef({ access, storageKey });
  const attempt = useRef(0);
  const definiteResult = useRef<{ commandId: string; message: string } | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (previousAccess.current.access === access) return;
    attempt.current++;
    // A renewed connection may check the original receipt without waiting for a
    // request on the abandoned connection. Retention still blocks a new command.
    const retained = storageKey ? restore(storageKey) : undefined;
    const original =
      retained ??
      (previousAccess.current.storageKey === storageKey ? pendingRef.current : undefined);
    previousAccess.current = { access, storageKey };
    guard.current = !!original;
    activeCommandId.current = original?.request?.commandId;
    if (definiteResult.current?.commandId !== activeCommandId.current)
      definiteResult.current = undefined;
    setPending(original ? { ...original, status: 'unknown' } : undefined);
  }, [access, storageKey]);

  useLayoutEffect(() => {
    if (storageKey) refreshTradeInventoryRecovery(storageKey);
    const request = pending?.request;
    if (request?.tradeScope) retainTradeInventoryReceipt(request.tradeScope, request.commandId);
  }, [storageKey]);

  function isCurrent(ticket: number, commandId: string) {
    return (
      alive.current &&
      currentAccess.current === access &&
      attempt.current === ticket &&
      activeCommandId.current === commandId
    );
  }

  function finish(result: ApiResult, request: PendingCommand, ticket: number, recovered = false) {
    const { commandId, tradeScope } = request;
    if (!storageKey || !isCurrent(ticket, commandId)) return;
    definiteResult.current = { commandId, message: result.message };
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
      ? prepareTradeInventoryReceiptResolution(tradeScope, commandId, recovered)
      : undefined;
    if (saved?.request?.commandId === commandId) {
      sessionStorage.removeItem(storageKey);
      if (sessionStorage.getItem(storageKey) !== null)
        throw new Error(
          `The retained ${taskName} request could not be cleared. Check its result again.`,
        );
    }
    releaseTrade?.();
    refreshTradeInventoryRecovery(storageKey);
    activeCommandId.current = undefined;
    definiteResult.current = undefined;
    guard.current = false;
    if (alive.current) {
      setPending(undefined);
      setMessage(result.message);
      onResolved(result);
    }
  }

  function recoveryMessage(reason: string, commandId: string) {
    const known = definiteResult.current;
    return known?.commandId === commandId
      ? `${known.message} The original result is known, but its browser recovery record still needs to be cleared. ${reason}`
      : reason;
  }

  async function dispatch(action: ActionOption, tradeScope?: string): Promise<ApiResult> {
    if (
      guard.current ||
      !connected ||
      !epoch ||
      !action.enabled ||
      currentAccess.current !== access
    )
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
      refreshTradeInventoryRecovery(storageKey);
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
      refreshTradeInventoryRecovery(storageKey);
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
    const ticket = ++attempt.current;
    setPending({ request, status: 'sending' });
    setMessage('');
    let outcome: ApiResult = {
      ok: false,
      code: 'unconfirmed',
      message: 'The outcome is unknown. Check the original receipt before acting again.',
    };
    try {
      const result = await command(action, request);
      if (!isCurrent(ticket, request.commandId)) return outcome;
      if (!['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code)) {
        finish(result, request, ticket);
        return result;
      }
      outcome = result;
      setMessage(result.message);
    } catch (error: unknown) {
      if (!isCurrent(ticket, request.commandId)) return outcome;
      refreshTradeInventoryRecovery(storageKey);
      const message = recoveryMessage(
        error instanceof Error ? error.message : 'The outcome is unknown.',
        request.commandId,
      );
      outcome = {
        ok: false,
        code: 'unconfirmed',
        message,
      };
      setMessage(message);
    }
    if (isCurrent(ticket, request.commandId)) setPending({ request, status: 'unknown' });
    return outcome;
  }

  async function check() {
    if (!connected || pending?.status !== 'unknown' || currentAccess.current !== access) return;
    const ticket = ++attempt.current;
    let request = pending.request;
    if (!request) {
      const saved = storageKey ? restore(storageKey) : { status: 'unknown' as const };
      guard.current = !!saved;
      activeCommandId.current = saved?.request?.commandId;
      setPending(saved);
      if (storageKey) refreshTradeInventoryRecovery(storageKey);
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
      if (!isCurrent(ticket, request.commandId)) return;
      if (receipt.scope !== scope) {
        setMessage(
          recoveryMessage(
            'Character access changed. Reconnect before checking the result.',
            request.commandId,
          ),
        );
      } else if (receipt.status === 'resolved') {
        finish(receipt.result, request, ticket, true);
        return;
      } else setMessage(recoveryMessage(receipt.message, request.commandId));
    } catch (error: unknown) {
      if (!isCurrent(ticket, request.commandId)) return;
      if (storageKey) refreshTradeInventoryRecovery(storageKey);
      setMessage(
        recoveryMessage(
          error instanceof Error ? error.message : 'The result is still unknown.',
          request.commandId,
        ),
      );
    }
    if (isCurrent(ticket, request.commandId)) setPending({ request, status: 'unknown' });
  }

  return { pending, message, dispatch, check, setMessage };
}
