import type {
  WorldAgentReply,
  WorldAgentSessionStatus,
  WorldAgentTurnView,
  WorldAgentTurnCursor,
} from '@open-legend/protocol';
import { useEffect, useRef, useState } from 'react';
import { Button, EmptyState, Tag } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
import { ConversationComposer, ConversationMessage, ConversationThread } from './conversation';
import { WorldAgentReview } from './world-agent-review';

type Pending = { id: string; text: string };
type Page<T> = { ok: boolean; message?: string; data: T };
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'The request could not be confirmed.';
const pendingValue = (v: unknown): v is Pending | null =>
  v === null ||
  (!!v &&
    typeof v === 'object' &&
    'id' in v &&
    typeof v.id === 'string' &&
    'text' in v &&
    typeof v.text === 'string');

/** The session ID and request receipt, not the browser transcript, own continuation.
 * Reopening/polling must never dispatch inference. docs/world-agent-runtime.md#durable-turn-delivery
 */
export function WorldAgentSession({
  worldId,
  sessionId,
  visible,
  connected,
  seed,
  onCreated,
}: {
  worldId: string;
  sessionId: string;
  visible: boolean;
  connected: boolean;
  seed?: { id: string; text: string } | null;
  onCreated(): void;
}) {
  const key = `open-legend:authoring:${worldId}:${sessionId}`;
  const [text, setText] = useState(() =>
    readLocal(`${key}:draft`, '', (v): v is string => typeof v === 'string'),
  );
  const [pending, setPending] = useState(() =>
    readLocal<Pending | null>(`${key}:pending`, null, pendingValue),
  );
  const pendingRef = useRef(pending);
  const [status, setStatus] = useState<WorldAgentSessionStatus>();
  const [turns, setTurns] = useState<WorldAgentTurnView[]>([]);
  const [before, setBefore] = useState<WorldAgentTurnCursor | null>(null);
  const [page, setPage] = useState<{ afterDraft?: string; afterPlan?: string }>({});
  const pageRef = useRef(page);
  const [review, setReview] = useState<string>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const alive = useRef(true),
    working = useRef(false),
    refreshing = useRef(false);
  const refreshAgain = useRef(false),
    statusRef = useRef(status);
  const input = useRef<HTMLTextAreaElement>(null);
  const lastSeed = useRef(readLocal(`${key}:seed`, '', (v): v is string => typeof v === 'string'));
  const historyInitialized = useRef(false);
  const prefix = { worldId, sessionId };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    writeLocal(`${key}:draft`, text);
  }, [key, text]);
  useEffect(() => {
    if (seed && lastSeed.current !== seed.id) {
      lastSeed.current = seed.id;
      writeLocal(`${key}:seed`, seed.id);
      setText((previous) => (previous ? `${previous}\n${seed.text}` : seed.text));
    }
  }, [seed]);
  function retainPending(value: Pending | null) {
    pendingRef.current = value;
    writeLocal(`${key}:pending`, value);
    if (alive.current) setPending(value);
  }
  function mergeTurns(values: WorldAgentTurnView[]) {
    setTurns((previous) => {
      const map = new Map(previous.map((turn) => [turn.id, turn]));
      for (const turn of values) map.set(turn.id, turn);
      return [...map.values()]
        .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id))
        .slice(-256);
    });
  }
  async function read<T>(suffix: string, body: unknown): Promise<T> {
    const result = await post<Page<T>>(
      `/api/world-agent/session/${suffix}`,
      body,
      AbortSignal.timeout(15000),
    );
    if (!result.ok) throw new Error(result.message ?? 'Session read unavailable.');
    return result.data;
  }
  async function refresh() {
    if (!alive.current) return;
    if (refreshing.current) {
      refreshAgain.current = true;
      return;
    }
    refreshing.current = true;
    try {
      const response = await post<WorldAgentSessionStatus & { ok: boolean; message?: string }>(
        '/api/world-agent/session/status',
        { ...prefix, ...pageRef.current },
        AbortSignal.timeout(15000),
      );
      if (!response.ok) throw new Error(response.message ?? 'Session unavailable.');
      if (!alive.current) return;
      statusRef.current = response;
      setStatus(response);
      if (response.data) {
        const history = await read<{
          turns: WorldAgentTurnView[];
          next: WorldAgentTurnCursor | null;
        }>('turns', prefix);
        if (!alive.current) return;
        mergeTurns(history.turns);
        if (!historyInitialized.current) {
          setBefore(history.next);
          historyInitialized.current = true;
        }
        const unconfirmed = pendingRef.current;
        if (unconfirmed) {
          const found =
            history.turns.find((turn) => turn.id === unconfirmed.id) ??
            (await read<WorldAgentTurnView | null>('turn', {
              ...prefix,
              requestId: unconfirmed.id,
            }));
          if (!alive.current) return;
          if (found) {
            mergeTurns([found]);
            retainPending(null);
          }
        }
      }
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      refreshing.current = false;
      if (refreshAgain.current && alive.current) {
        refreshAgain.current = false;
        void refresh();
      }
    }
  }
  // Only the visible conversation polls, with no overlapping read batches. Sleeping tabs do no work.
  useEffect(() => {
    if (!visible || !connected) return;
    let disposed = false;
    let polling = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (disposed || polling || document.visibilityState !== 'visible') return;
      polling = true;
      clearTimeout(timer);
      await refresh();
      polling = false;
      if (!disposed) timer = setTimeout(poll, statusRef.current?.data?.activeTurn ? 2000 : 15000);
    };
    const wake = () => {
      clearTimeout(timer);
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', wake);
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [visible, connected, worldId, sessionId]);
  async function perform(work: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      working.current = false;
      if (alive.current) {
        setBusy(false);
        void refresh();
      }
    }
  }
  const session = status?.data;
  async function open() {
    await perform(async () => {
      const reply = await post<{ ok: boolean; message?: string }>('/api/world-agent/session/open', {
        ...prefix,
        budgetUsd: status?.availability.sessionAllowanceUsd ?? 0,
      });
      if (!reply.ok) throw new Error(reply.message ?? 'Session could not be created.');
      onCreated();
    });
  }
  async function send(existing?: Pending) {
    const current = statusRef.current;
    if (
      !connected ||
      !current?.data?.available ||
      !current.availability.configured ||
      current.data.activeTurn ||
      current.data.budget.availableUsd <= 0 ||
      (!existing && pendingRef.current) ||
      (!existing && !text.trim())
    )
      return;
    await perform(async () => {
      const request = existing ?? { id: crypto.randomUUID(), text: text.trim() };
      // Persist the identity before dispatch. A lost acknowledgement never creates a new paid ID.
      retainPending(request);
      if (!existing) setText((previous) => (previous.trim() === request.text ? '' : previous));
      const reply = await post<WorldAgentReply>('/api/world-agent/messages', {
        ...prefix,
        conversationId: sessionId,
        mode: 'discuss',
        requestId: request.id,
        text: request.text,
      });
      if (!reply.ok) {
        if (!existing && ['busy', 'authoring-request', 'invalid-input'].includes(reply.code)) {
          retainPending(null);
          if (alive.current) setText((previous) => previous || request.text);
        }
        throw new Error(reply.message);
      }
    });
  }
  async function cancel() {
    const requestId = session?.activeTurn;
    if (!requestId) return;
    await perform(async () => {
      const reply = await post<WorldAgentReply>('/api/world-agent/session/cancel', {
        ...prefix,
        requestId,
      });
      if (!reply.ok) throw new Error(reply.message);
    });
  }
  async function closeSession() {
    await perform(async () => {
      const result = await post<WorldAgentReply>('/api/world-agent/close', {
        worldId,
        conversationId: sessionId,
      });
      if (!result.ok) throw new Error(result.message);
      onCreated();
    });
  }
  async function older() {
    if (!before) return;
    await perform(async () => {
      const history = await read<{
        turns: WorldAgentTurnView[];
        next: WorldAgentTurnCursor | null;
      }>('turns', { ...prefix, before });
      if (alive.current) {
        mergeTurns(history.turns);
        setBefore(history.next);
      }
    });
  }
  function changePage(value: typeof page) {
    pageRef.current = value;
    setPage(value);
    void refresh();
  }
  const entries = turns.flatMap((turn) => [
    {
      id: `${turn.id}:request`,
      content: (
        <ConversationMessage
          role="you"
          label="You"
          text={turn.text ?? 'Retained earlier turn'}
          pending={!turn.response}
          failureReason={
            turn.cancelRequested && !turn.response ? 'Cancellation requested' : undefined
          }
        />
      ),
    },
    ...(turn.response
      ? [
          {
            id: `${turn.id}:reply`,
            content: (
              <ConversationMessage
                role={turn.response.ok ? 'agent' : 'status'}
                label={turn.response.ok ? 'World agent' : 'Turn result'}
                text={turn.response.message}
                failureReason={turn.response.ok ? undefined : turn.response.code}
              />
            ),
          },
        ]
      : []),
  ]);
  return (
    <>
      {!session && status && (
        <EmptyState title="One conversation to investigate and create">
          <p>
            The agent can inspect this world's mechanics and prepare changes. Live changes require
            your review. Opening a session makes no paid call.
          </p>
          <p>
            Authorize up to ${status.availability.sessionAllowanceUsd.toFixed(2)} total for this
            session. It is a ceiling, not an upfront charge; future art shares it.
          </p>
          <Button busy={busy} disabled={!connected} onPress={() => void open()}>
            Start session · up to ${status.availability.sessionAllowanceUsd.toFixed(2)}
          </Button>
        </EmptyState>
      )}
      {status && !status.availability.configured && (
        <p role="status" className="ol-caption">
          {status.availability.reason} No tool-less fallback is used.
        </p>
      )}
      {session && (
        <>
          <div className="ol-agent-tools">
            <Tag>World-owner agent</Tag>
            <span className="ol-caption">
              ${session.budget.spentUsd.toFixed(3)} used · ${session.budget.reservedUsd.toFixed(3)}{' '}
              reserved · ${session.budget.limitUsd.toFixed(2)} cap
            </span>
            <Button size="sm" variant="quiet" onPress={() => void refresh()}>
              Refresh
            </Button>
            {!!session.activeTurn && (
              <Button size="sm" disabled={busy} onPress={() => void cancel()}>
                Stop this turn
              </Button>
            )}
          </div>
          {!session.closed && (
            <Button size="sm" variant="quiet" disabled={busy} onPress={() => void closeSession()}>
              End session (history retained)
            </Button>
          )}
          {session.budget.uncertainUsd > 0 && (
            <p className="ol-caption">
              ${session.budget.uncertainUsd.toFixed(3)} of used exposure is uncertain and remains
              counted.
            </p>
          )}
          {!session.available && (
            <p role="status">
              This session is closed, expired, or belongs to an earlier world/configuration. Its
              history remains readable; start a new session to act.
            </p>
          )}
          <ConversationThread
            conversationKey={key}
            items={entries}
            visible={visible}
            ariaLabel="World Agent conversation"
            before={
              before && (
                <Button size="sm" variant="quiet" disabled={busy} onPress={() => void older()}>
                  Earlier messages
                </Button>
              )
            }
            empty={
              <EmptyState title="What might this world become?">
                Describe an invention, investigate its relationships, or ask the agent to propose a
                change.
              </EmptyState>
            }
          />
          {pending && (
            <div className="ol-notice" role="status">
              <p>Checking acknowledgement for: {pending.text}</p>
              <p>No replacement run is started automatically.</p>
              <Button
                size="sm"
                disabled={
                  busy ||
                  !!session.activeTurn ||
                  !session.available ||
                  !status.availability.configured
                }
                onPress={() => void send(pending)}
              >
                Resubmit the same request
              </Button>
              <Button size="sm" variant="quiet" onPress={() => void refresh()}>
                Check saved result
              </Button>
            </div>
          )}
          {!!session.plans.length && (
            <section className="ol-agent-reviews" aria-label="Changes for review">
              <h3>Proposed changes</h3>
              {session.plans.map((plan) => (
                <article key={plan.id}>
                  <p>
                    {plan.validation.semantics} <Tag>{plan.status}</Tag>
                  </p>
                  <p className="ol-caption">
                    Revision {plan.revision} · {plan.validation.message}
                  </p>
                  <Button size="sm" variant="quiet" onPress={() => setReview(plan.id)}>
                    Inspect exact change
                  </Button>
                </article>
              ))}
              {session.nextPlan && (
                <Button
                  size="sm"
                  variant="quiet"
                  onPress={() => changePage({ ...page, afterPlan: session.nextPlan! })}
                >
                  More changes
                </Button>
              )}
            </section>
          )}
          {!!session.drafts.length && (
            <details>
              <summary>
                Saved drafts ({session.drafts.length}
                {session.nextDraft ? '+' : ''})
              </summary>
              {session.drafts.map((d) => (
                <p key={d.id}>
                  {d.kind} · revision {d.revision} · {d.intent}
                </p>
              ))}
              {session.nextDraft && (
                <Button
                  size="sm"
                  variant="quiet"
                  onPress={() => changePage({ ...page, afterDraft: session.nextDraft! })}
                >
                  More drafts
                </Button>
              )}
            </details>
          )}
          {(page.afterDraft || page.afterPlan) && (
            <Button size="sm" variant="quiet" onPress={() => changePage({})}>
              First draft and review page
            </Button>
          )}
          <ConversationComposer
            inputRef={input}
            ariaLabel="Message to World Agent"
            placeholder="Investigate, design, or ask for a change…"
            maxLength={2000}
            value={text}
            onChange={setText}
            onSubmit={() => send()}
            disabled={
              !connected ||
              busy ||
              !!session.activeTurn ||
              !!pending ||
              !session.available ||
              !status.availability.configured ||
              session.budget.availableUsd <= 0 ||
              !text.trim()
            }
          />
          <p className="ol-caption">
            Approval and Apply use no model call. Native work and physics stay authoritative. Image
            generation and general new physics are not enabled yet.
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {review && (
        <WorldAgentReview
          key={review}
          worldId={worldId}
          sessionId={sessionId}
          planId={review}
          canApply={!!session?.available}
          onClose={() => setReview(undefined)}
          onChanged={() => void refresh()}
        />
      )}
    </>
  );
}
