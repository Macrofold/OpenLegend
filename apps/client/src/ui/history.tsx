import { useEffect, useRef, useState } from 'react';
import type { TranscriptPage, TranscriptItem } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { getScoped, post } from '../api';
import { ConversationThread } from './conversation';
import { EventTime } from './event-time';
import './reading.css';

type HistoryPage = TranscriptPage & {
  scope?: string;
  voice?: 'restrained' | 'lyrical' | 'wry';
  active: { id: string; generation: number; members: { id: string; name: string }[] } | null;
};
type Props = {
  conversation?: boolean;
  visible?: boolean;
  revision?: string;
  epoch?: string;
  refreshRequest?: number;
};

export function History(props: Props) {
  // Corrected/forgotten history must disappear in the same render. Hiding is only navigation.
  return <ScopedHistory key={`${props.conversation}:${props.epoch}`} {...props} />;
}

function ScopedHistory({
  conversation = false,
  visible = true,
  revision,
  refreshRequest = 0,
}: Props) {
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openingRevision, setOpeningRevision] = useState(0);
  const loadedRevision = useRef(revision);
  const lastRefreshRequest = useRef(refreshRequest);
  const request = useRef(0);
  const failedOlder = useRef(false);
  const mounted = useRef(true);
  const preferenceRequest = useRef(0);
  const [savingVoice, setSavingVoice] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      preferenceRequest.current++;
    };
  }, []);

  async function load(older = false) {
    const generation = ++request.current;
    const atRevision = revision;
    failedOlder.current = older;
    setBusy(true);
    setError('');
    const query = new URLSearchParams();
    if (older && page) {
      if (page.before !== undefined) query.set('before', String(page.before));
      query.set('watermark', String(page.watermark));
    }
    if (conversation) {
      query.set('active', 'true');
      if (older && page?.scope) query.set('conversationId', page.scope);
    }
    try {
      const next = await getScoped<HistoryPage>(`/api/history?${query}`);
      if (!mounted.current || generation !== request.current) return;
      setPage(next);
      setItems((current) =>
        older
          ? [...next.items, ...current.filter((item) => !next.items.some((n) => n.id === item.id))]
          : next.items,
      );
      if (!older) {
        loadedRevision.current = atRevision;
        setOpeningRevision((value) => value + 1);
      }
    } catch (reason) {
      if (mounted.current && generation === request.current) setError(String(reason));
    } finally {
      if (mounted.current && generation === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (!visible) {
      request.current++;
      setBusy(false);
      return;
    }
    if (!page || lastRefreshRequest.current !== refreshRequest) {
      lastRefreshRequest.current = refreshRequest;
      void load();
    }
    return () => {
      request.current++;
    };
  }, [visible, refreshRequest]);

  async function voice(value: NonNullable<HistoryPage['voice']>) {
    const id = ++preferenceRequest.current;
    setSavingVoice(true);
    try {
      const result = await post('/api/profile/preferences', { narratorVoice: value });
      if (!mounted.current || id !== preferenceRequest.current) return;
      if (!result.ok) setError(result.message);
      else setPage((current) => (current ? { ...current, voice: value } : current));
    } catch (reason) {
      if (mounted.current && id === preferenceRequest.current) setError(String(reason));
    } finally {
      if (mounted.current && id === preferenceRequest.current) setSavingVoice(false);
    }
  }
  async function leave() {
    if (!page?.active || busy) return;
    setBusy(true);
    try {
      const result = await post('/api/conversation', {
        requestId: crypto.randomUUID(),
        operation: 'leave',
        conversationId: page.active.id,
        generation: page.active.generation,
      });
      if (!mounted.current) return;
      if (!result.ok) setError(result.message);
      else await load();
    } catch (reason) {
      if (mounted.current) setError(String(reason));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      className="ol-history ol-reading-view"
      aria-label={conversation ? 'Durable conversation history' : 'Personal story'}
    >
      <p className="ol-caption">
        {conversation
          ? 'Recorded words from this conversation.'
          : 'Narration and recorded events from your character’s story.'}
      </p>
      <div className="ol-reading-controls">
        <Button size="sm" onPress={() => void load()} isDisabled={busy}>
          {page && loadedRevision.current !== revision
            ? 'New or updated entries — read latest'
            : 'Read latest entries'}
        </Button>
        {!conversation && (
          <details>
            <summary>Story voice</summary>
            <label>
              Narrator voice{' '}
              <select
                aria-label="Narrator voice"
                value={page?.voice ?? 'restrained'}
                disabled={!page || savingVoice}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'restrained' || value === 'lyrical' || value === 'wry')
                    void voice(value);
                }}
              >
                <option value="restrained">Restrained</option>
                <option value="lyrical">Lyrical</option>
                <option value="wry">Wry</option>
              </select>
            </label>
          </details>
        )}
      </div>
      {conversation && page?.active && (
        <div>
          <p>{page.active.members.map((member) => member.name).join(', ')}</p>
          <Button size="sm" onPress={() => void leave()} isDisabled={busy}>
            Leave conversation
          </Button>
        </div>
      )}
      {error && (
        <div className="ol-reading-error">
          <p role="alert">{error}</p>
          <Button
            size="sm"
            variant="quiet"
            onPress={() => void load(failedOlder.current)}
            isDisabled={busy}
          >
            Retry reading
          </Button>
        </div>
      )}
      <ConversationThread
        conversationKey={conversation ? 'active-conversation' : 'personal-story'}
        visible={visible}
        preserveReading
        openingRevision={openingRevision}
        liveAnnouncements="off"
        ariaLabel={conversation ? 'Recorded conversation' : 'Personal story entries'}
        newMessageLabel="New entries"
        before={
          <>
            {page?.before !== undefined && (
              <Button size="sm" onPress={() => void load(true)} isDisabled={busy}>
                Older entries
              </Button>
            )}
            {busy && (
              <p className="ol-meta" role="status">
                Loading entries…
              </p>
            )}
            {page && page.before === undefined && !!items.length && (
              <p className="ol-meta">Beginning of the retained record.</p>
            )}
          </>
        }
        empty={
          !busy && !error && page ? (
            <p>
              {conversation
                ? 'No words have been recorded in this conversation yet.'
                : 'No story entries have been recorded yet.'}
            </p>
          ) : undefined
        }
        items={items.map((item) => ({
          id: item.id,
          content: (
            <article className="ol-story-entry">
              <div className="ol-meta">
                {item.kind === 'narration'
                  ? 'Narration'
                  : item.kind === 'speech'
                    ? 'Recorded speech'
                    : 'Recorded event'}
                {' · '}
                <EventTime time={item.time} />
              </div>
              <p>{item.text}</p>
              {item.impacts.map((impact) => (
                <div className="ol-meta" key={`${impact.sourceId}:${impact.field}`}>
                  {impact.delta > 0 ? '+' : ''}
                  {impact.delta} {impact.field} · {impact.entityName ?? 'affected actor'}
                </div>
              ))}
              {item.status === 'pending' && (
                <small>Prose is being prepared; committed facts are shown.</small>
              )}
              {item.sourceStatus === 'unavailable' && (
                <small>The original source is no longer available.</small>
              )}
              {item.legacy && <small>Earlier conversation membership was not recorded.</small>}
            </article>
          ),
        }))}
      />
    </section>
  );
}

export function Narrator({
  item,
  onReadStory,
}: {
  item: TranscriptItem | null | undefined;
  onReadStory?: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const initial = useRef<string | null | undefined>(undefined);
  // The initial snapshot is history, not a new announcement after reload.
  if (initial.current === undefined && item !== undefined) initial.current = item?.id ?? null;
  if (!item || item.status === 'pending' || dismissed === item.id || initial.current === item.id)
    return null;
  return (
    <aside className="ol-narrator ol-card" aria-label="Narrator">
      <p role="status">{item.text}</p>
      <div className="ol-reading-controls">
        {onReadStory && (
          <Button
            size="sm"
            onPress={() => {
              onReadStory();
              setDismissed(item.id);
            }}
          >
            Read in Journal
          </Button>
        )}
        <Button size="sm" variant="quiet" onPress={() => setDismissed(item.id)}>
          Dismiss
        </Button>
      </div>
    </aside>
  );
}
