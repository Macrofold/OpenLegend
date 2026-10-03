import type {
  WorldAgentReply,
  WorldAgentSessionStatus,
  WorldAgentTurnView,
  WorldAgentTurnCursor,
  WorldAgentProgressSnapshot,
} from '@open-legend/protocol';
import { useEffect, useRef, useState } from 'react';
import { Button, EmptyState, Tag } from '../design-system/components';
import { post, worldAgentProgressUrl } from '../api';
import { readLocal, writeLocal } from './storage';
import { ConversationComposer, ConversationMessage, ConversationThread } from './conversation';
import { WorldAgentQuestionCard } from './world-agent-question';
import { WorldAgentReview } from './world-agent-review';
import { WorldAgentWorkView } from './world-agent-work';
import { UsageRemaining } from './usage-remaining';

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
 * Reopening/subscribing must never dispatch inference. docs/world-agent-runtime.md#durable-turn-delivery
 */
export function WorldAgentSession({
  worldId,
  accessScope,
  sessionId,
  visible,
  connected,
  seed,
  purpose,
  onCreated,
}: {
  worldId: string;
  accessScope: string;
  sessionId: string;
  visible: boolean;
  connected: boolean;
  seed?: { id: string; text: string } | null;
  purpose?: 'invention';
  onCreated(): void;
}) {
  const key = `open-legend:authoring:${worldId}:${accessScope}:${sessionId}`;
  const [initialPurpose] = useState(
    () =>
      purpose ??
      readLocal<'invention' | null>(
        `${key}:purpose`,
        null,
        (v): v is 'invention' => v === 'invention',
      ),
  );
  useEffect(() => {
    writeLocal(`${key}:purpose`, initialPurpose);
  }, [key, initialPurpose]);
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
  const [view, setView] = useState<'conversation' | 'work'>('conversation');
  const [seenWork, setSeenWork] = useState<string>();
  const [review, setReview] = useState<string>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [subscriptionRevision, setSubscriptionRevision] = useState(0);
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
      for (const turn of values) {
        const current = map.get(turn.id);
        if (
          (current?.revision ?? 0) > (turn.revision ?? 0) ||
          (current?.progress?.revision ?? 0) > (turn.progress?.revision ?? 0) ||
          (current?.response && !turn.response)
        )
          continue;
        map.set(turn.id, turn);
      }
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
        prefix,
        AbortSignal.timeout(15000),
      );
      if (!response.ok) throw new Error(response.message ?? 'Session unavailable.');
      if (!alive.current) return;
      const previousQuestionTurn = statusRef.current?.data?.question?.question.turnId;
      statusRef.current = response;
      setStatus(response);
      if (response.data) {
        const history = await read<{
          turns: WorldAgentTurnView[];
          next: WorldAgentTurnCursor | null;
        }>('turns', prefix);
        if (!alive.current) return;
        mergeTurns(history.turns);
        // Refresh the formerly active card too: Stop or a saved revision can retire
        // it while its original turn sits outside the latest history page.
        const questionTurn = response.data.question?.question.turnId ?? previousQuestionTurn;
        if (questionTurn && !history.turns.some((turn) => turn.id === questionTurn)) {
          const source = await read<WorldAgentTurnView | null>('turn', {
            ...prefix,
            requestId: questionTurn,
          });
          if (alive.current && source) mergeTurns([source]);
        }
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
  async function reconnect() {
    await refresh();
    if (alive.current) setSubscriptionRevision((revision) => revision + 1);
  }
  // One visible owner stream. Status/history reads serve initial/reconnect or explicit
  // mutation recovery; they never run a simultaneous fast polling loop.
  useEffect(() => {
    if (!visible || !connected) return;
    let disposed = false;
    let stream: EventSource | undefined;
    let lastState = '';
    const wake = () => {
      stream?.close();
      stream = undefined;
      if (disposed || document.visibilityState !== 'visible') return;
      if (!statusRef.current?.data) {
        void refresh();
        return;
      }
      stream = new EventSource(worldAgentProgressUrl(worldId, sessionId));
      stream.onopen = () => {
        if (!disposed) {
          setError('');
          void refresh();
        }
      };
      stream.addEventListener('snapshot', (event) => {
        if (disposed || !alive.current) return;
        try {
          const snapshot = JSON.parse(
            (event as MessageEvent<string>).data,
          ) as WorldAgentProgressSnapshot;
          if (snapshot.sessionId !== sessionId) throw new Error('Conversation changed.');
          if (snapshot.turn) mergeTurns([snapshot.turn]);
          const state = JSON.stringify([
            snapshot.statusRevision,
            snapshot.activeTurn,
            snapshot.questionTurn,
            snapshot.recovering,
            snapshot.available,
            snapshot.turn?.response,
            snapshot.turn?.question,
          ]);
          if (state !== lastState) {
            lastState = state;
            void refresh();
          }
        } catch {
          setError('The reply update could not be read. Refresh saved progress.');
          stream?.close();
        }
      });
      stream.addEventListener('access-changed', () => {
        stream?.close();
        if (!disposed) {
          setTurns([]);
          setStatus(undefined);
          setError('Access changed. Reopen the conversation with current access.');
        }
      });
      stream.addEventListener('unavailable', () => {
        stream?.close();
        if (!disposed)
          setError('Live delivery stopped. Saved text remains available; refresh to reconnect.');
      });
      stream.onerror = () => {
        if (!disposed) setError('Reconnecting to saved reply progress…');
      };
    };
    document.addEventListener('visibilitychange', wake);
    wake();
    return () => {
      disposed = true;
      stream?.close();
      document.removeEventListener('visibilitychange', wake);
    };
  }, [visible, connected, worldId, sessionId, accessScope, !!status?.data, subscriptionRevision]);
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
  const workRevision = session?.workRevision;
  const newWork = workRevision !== undefined && seenWork !== undefined && seenWork !== workRevision;
  useEffect(() => {
    if (session && seenWork === undefined) setSeenWork(workRevision);
  }, [!!session, workRevision, seenWork]);
  async function open() {
    await perform(async () => {
      const reply = await post<{ ok: boolean; message?: string }>('/api/world-agent/session/open', {
        ...prefix,
        budgetUsd: status?.availability.sessionAllowanceUsd ?? 0,
        ...(initialPurpose ? { purpose: initialPurpose } : {}),
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
      current.data.question ||
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
    const requestId = session?.activeTurn ?? session?.question?.question.turnId;
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
  const entries = turns.flatMap((turn) => [
    {
      id: `${turn.id}:request`,
      content: (
        <ConversationMessage
          role="you"
          label="You"
          text={turn.text ?? 'Retained earlier turn'}
          pending={!turn.response && !turn.progress?.text}
          failureReason={
            turn.cancelRequested && !turn.response ? 'Cancellation requested' : undefined
          }
        />
      ),
    },
    ...(turn.question
      ? [
          {
            id: `${turn.id}:question`,
            content: (
              <WorldAgentQuestionCard
                key={turn.question.digest}
                question={
                  session?.question?.question.turnId === turn.id
                    ? session.question.question
                    : turn.question
                }
                worldId={worldId}
                sessionId={sessionId}
                connected={connected}
                canAnswer={
                  session?.question?.question.turnId === turn.id
                    ? session.question.canAnswer
                    : !!session?.available &&
                      !session.question &&
                      turn.question.state === 'answered'
                }
                canContinue={
                  (session?.question?.question.turnId === turn.id &&
                    session.question.canContinue) ||
                  false
                }
                reason={
                  session?.question?.question.turnId === turn.id
                    ? session.question.reason
                    : undefined
                }
                onChanged={() => void refresh()}
              />
            ),
          },
        ]
      : []),
    ...(turn.response || turn.progress?.text
      ? [
          {
            id: `${turn.id}:reply`,
            content: (
              <ConversationMessage
                role={turn.progress?.text || turn.response?.ok ? 'agent' : 'status'}
                label="World agent"
                text={
                  turn.response?.code === 'completed'
                    ? turn.response.message
                    : turn.progress?.text || turn.response?.message || ''
                }
                failureReason={turn.response && !turn.response.ok ? turn.response.code : undefined}
              >
                {turn.response && turn.response.code !== 'completed' && turn.progress?.text && (
                  <p className="ol-caption">{turn.response.message}</p>
                )}
                {turn.progress?.completeness === 'incomplete' && (
                  <p className="ol-caption">
                    Some reply text is omitted from this preview. The final result is checked
                    separately.
                  </p>
                )}
              </ConversationMessage>
            ),
          },
        ]
      : []),
  ]);
  return (
    <>
      {!session && status && (
        <EmptyState
          title={
            initialPurpose === 'invention'
              ? 'Create an invention'
              : 'One conversation to investigate and create'
          }
        >
          <p>
            The agent can inspect this world's mechanics and prepare changes. Live changes require
            your review. Starting a conversation does not use your allowance.
          </p>
          <details>
            <summary>Owner spending controls</summary>
            <p>
              This conversation can use up to ${status.availability.sessionAllowanceUsd.toFixed(2)}{' '}
              in Run charges, within the character’s monthly allocation. Shared Worker capacity is
              managed and billed separately by the world owner.
            </p>
          </details>
          <Button busy={busy} disabled={!connected} onPress={() => void open()}>
            Start conversation
          </Button>
        </EmptyState>
      )}
      {status && !status.availability.configured && (
        <p role="status" className="ol-caption">
          {status.availability.reason}
        </p>
      )}
      {session && (
        <>
          <div className="ol-agent-tools">
            <Tag>World-owner agent</Tag>
            <UsageRemaining
              label="Conversation allowance"
              limit={session.budget.limitUsd}
              spent={session.budget.spentUsd}
              reserved={session.budget.reservedUsd}
              available={connected}
            />
            <Button size="sm" variant="quiet" onPress={() => void reconnect()}>
              Refresh
            </Button>
            {(!!session.activeTurn || !!session.question) && (
              <Button size="sm" disabled={busy} onPress={() => void cancel()}>
                Stop this request
              </Button>
            )}
          </div>
          {!session.closed && (
            <Button size="sm" variant="quiet" disabled={busy} onPress={() => void closeSession()}>
              End session (history retained)
            </Button>
          )}
          <details>
            <summary>Owner spending details</summary>
            <p>
              ${session.budget.spentUsd.toFixed(3)} used · ${session.budget.reservedUsd.toFixed(3)}{' '}
              reserved · ${session.budget.limitUsd.toFixed(2)} Run cap. Shared Worker capacity is
              billed separately.
            </p>
            {session.budget.uncertainUsd > 0 && (
              <p>${session.budget.uncertainUsd.toFixed(3)} is unconfirmed and remains counted.</p>
            )}
          </details>
          {!session.available && (
            <p role="status">
              This session is closed, expired, or belongs to an earlier world/configuration. Its
              history remains readable; start a new session to act.
            </p>
          )}
          <div className="ol-agent-tools" role="group" aria-label="World Agent views">
            <Button
              size="sm"
              variant="quiet"
              aria-pressed={view === 'conversation'}
              onPress={() => setView('conversation')}
            >
              Conversation
            </Button>
            <Button
              size="sm"
              variant="quiet"
              aria-pressed={view === 'work'}
              onPress={() => {
                setSeenWork(workRevision);
                setView('work');
              }}
            >
              Work{newWork && <span> · New work</span>}
            </Button>
          </div>
          <div hidden={view !== 'conversation'}>
            <ConversationThread
              conversationKey={key}
              items={entries}
              visible={visible && view === 'conversation'}
              ariaLabel="World Agent conversation"
              liveAnnouncements="off"
              contentRevision={turns
                .map(
                  (turn) =>
                    `${turn.id}:${turn.revision ?? 0}:${turn.progress?.revision ?? 0}:${turn.response?.code ?? ''}`,
                )
                .join('|')}
              newMessageLabel="New reply text"
              preserveReading
              before={
                before && (
                  <Button size="sm" variant="quiet" disabled={busy} onPress={() => void older()}>
                    Earlier messages
                  </Button>
                )
              }
              empty={
                <EmptyState title="What might this world become?">
                  Describe an invention, investigate its relationships, or ask the agent to propose
                  a change.
                </EmptyState>
              }
            />
            <p role="status" aria-live="polite" className="ol-caption">
              {session.question
                ? 'Waiting for your choice.'
                : session.activeTurn
                  ? turns.find((turn) => turn.id === session.activeTurn)?.progress?.stage ===
                    'replying'
                    ? 'Writing a reply.'
                    : 'Investigating your request.'
                  : turns.at(-1)?.progress?.completeness === 'complete'
                    ? 'Reply complete.'
                    : ''}
            </p>
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
                <Button size="sm" variant="quiet" onPress={() => void reconnect()}>
                  Check saved result
                </Button>
              </div>
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
                !!session.question ||
                !!pending ||
                !session.available ||
                !status.availability.configured ||
                session.budget.availableUsd <= 0 ||
                !text.trim()
              }
            />
            <p className="ol-caption">
              Approval and Apply use no model call. Native work and physics stay authoritative.
              Image generation and general new physics are not enabled yet.
            </p>
          </div>
          <WorldAgentWorkView
            worldId={worldId}
            sessionId={sessionId}
            accessScope={accessScope}
            session={session}
            connected={connected}
            visible={visible && view === 'work'}
            onRefresh={() => void refresh()}
            onOpenReview={setReview}
          />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {review && (
        <WorldAgentReview
          key={`${key}:${review}`}
          worldId={worldId}
          sessionId={sessionId}
          planId={review}
          canApply={connected && !!session?.available}
          mutationReason={
            !connected
              ? 'Reconnect before changing saved work.'
              : (session?.workspaceMutationReason ?? undefined)
          }
          onClose={() => setReview(undefined)}
          onChanged={() => void refresh()}
        />
      )}
    </>
  );
}
