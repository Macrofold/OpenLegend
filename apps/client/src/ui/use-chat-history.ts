import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, GameView } from '@open-legend/protocol';
import { getScoped } from '../api';

type ChatPage = { messages: ChatMessage[]; before?: number; watermark: number };

/** History is durable; live reply status still comes through the existing public view. */
export function useChatHistory(
  view: GameView,
  participantId: string | undefined,
  visible: boolean,
) {
  const key = `${view.worldId}:${view.historyEpoch ?? ''}:${participantId ?? ''}`;
  const [saved, setSaved] = useState<{ key: string; page: ChatPage } | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingRevision, setOpeningRevision] = useState(0);
  const [error, setError] = useState('');
  const request = useRef(0);
  const busy = useRef(false);
  const openingPending = useRef(false);
  const historyRevision = useRef(view.historyRevision);
  const page = saved?.key === key ? saved.page : undefined;
  const latestPage = useRef(page);
  latestPage.current = page;
  async function load(older = false) {
    if (!participantId || busy.current) return;
    const generation = ++request.current;
    busy.current = true;
    setLoading(true);
    const query = new URLSearchParams({
      speechOnly: 'true',
      responseActions: 'true',
      participantId,
    });
    const prior = latestPage.current;
    if (older && prior?.before !== undefined) {
      query.set('before', String(prior.before));
      query.set('watermark', String(prior.watermark));
    }
    try {
      const next = await getScoped<ChatPage>(`/api/history?${query}`);
      if (generation !== request.current) return;
      setError('');
      // Tell the thread when this opening's asynchronous history has actually arrived.
      // A scoped refresh may supersede the opening request before it finishes.
      if (openingPending.current) {
        openingPending.current = false;
        setOpeningRevision((revision) => revision + 1);
      }
      setSaved((current) => {
        const old = current?.key === key ? current.page : undefined;
        const merged = new Map((old?.messages ?? []).map((message) => [message.id, message]));
        for (const message of next.messages) merged.set(message.id, message);
        return {
          key,
          page: {
            ...next,
            before: older || !old ? next.before : old.before,
            messages: [...merged.values()].sort(
              (a, b) => a.time - b.time || a.id.localeCompare(b.id, undefined, { numeric: true }),
            ),
          },
        };
      });
    } catch (reason) {
      if (generation === request.current) setError(String(reason));
    } finally {
      if (generation === request.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }
  // Scoped SSE invalidation replaces polling; stale responses cannot cross world/person boundaries.
  useEffect(() => {
    request.current++;
    busy.current = false;
    setError('');
    setLoading(false);
    openingPending.current = visible && !!participantId;
    if (!visible || !participantId) return;
    historyRevision.current = view.historyRevision;
    void load();
    return () => {
      request.current++;
      busy.current = false;
    };
  }, [key, visible]);
  useEffect(() => {
    if (historyRevision.current === view.historyRevision) return;
    historyRevision.current = view.historyRevision;
    if (!visible || !participantId) return;
    request.current++;
    busy.current = false;
    void load();
    return () => {
      request.current++;
      busy.current = false;
    };
  }, [view.historyRevision]);
  const live = new Map(view.conversation.map((message) => [message.id, message]));
  return {
    messages: (page?.messages ?? []).map((message) => {
      const current = live.get(message.id);
      return current?.replyRequestId === message.replyRequestId
        ? { ...message, ...current }
        : message;
    }),
    markRetry: (originalRequestId: string, jobId: string) =>
      setSaved((current) =>
        current?.key === key
          ? {
              ...current,
              page: {
                ...current.page,
                messages: current.page.messages.map((message) =>
                  message.replyRequestId === originalRequestId
                    ? {
                        ...message,
                        replyRequestId: jobId,
                        replyStatus: 'queued',
                        retryable: false,
                        replyFailure: undefined,
                      }
                    : message,
                ),
              },
            }
          : current,
      ),
    refresh: () => load(),
    loading,
    openingRevision,
    error,
    hasOlder: page?.before !== undefined,
    loadOlder: () => void load(true),
  };
}
