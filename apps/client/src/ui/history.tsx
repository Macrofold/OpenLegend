import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TranscriptPage, TranscriptItem } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { getScoped, post } from '../api';
import { EventTime } from './event-time';

type HistoryPage = TranscriptPage & {
  scope?: string;
  voice?: 'restrained' | 'lyrical' | 'wry';
  active: { id: string; generation: number; members: { id: string; name: string }[] } | null;
};
export function History({
  conversation = false,
  visible = true,
  revision,
  epoch,
}: {
  conversation?: boolean;
  visible?: boolean;
  revision?: string;
  epoch?: string;
}) {
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState('');
  const [newEntries, setNewEntries] = useState(false);
  const lastRevision = useRef(revision);
  const [busy, setBusy] = useState(false);
  const section = useRef<HTMLElement>(null);
  const anchor = useRef<{ element: HTMLElement; top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor.current) return;
    const { element, top, height } = anchor.current;
    element.scrollTop = top + element.scrollHeight - height;
    anchor.current = null;
  }, [items]);
  const request = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
    };
  }, []);
  async function load(older = false) {
    const generation = ++request.current;
    setBusy(true);
    setError('');
    const query = new URLSearchParams();
    if (older && page) {
      if (page.before !== undefined) query.set('before', String(page.before));
      query.set('watermark', String(page.watermark));
    }
    if (conversation) {
      if (older && page?.scope) query.set('conversationId', page.scope);
      else query.set('active', 'true');
    }
    try {
      const next = await getScoped<HistoryPage>(`/api/history?${query}`);
      if (!mounted.current || generation !== request.current) return;
      const scrolling = section.current?.closest<HTMLElement>('.ol-panel-body');
      if (older && scrolling)
        anchor.current = {
          element: scrolling,
          top: scrolling.scrollTop,
          height: scrolling.scrollHeight,
        };
      setNewEntries(false);
      setPage(next);
      setItems((current) =>
        older
          ? [...next.items, ...current.filter((item) => !next.items.some((n) => n.id === item.id))]
          : next.items,
      );
    } catch (reason) {
      if (mounted.current && generation === request.current) setError(String(reason));
    } finally {
      if (mounted.current && generation === request.current) setBusy(false);
    }
  }
  // Ordinary arrivals only mark newer content. Revocation/reset clears stale retained prose.
  useEffect(() => {
    request.current++;
    setItems([]);
    setPage(null);
    if (visible) void load();
    return () => {
      request.current++;
    };
  }, [conversation, visible, epoch]);
  useEffect(() => {
    if (lastRevision.current === revision) return;
    lastRevision.current = revision;
    if (visible) setNewEntries(true);
  }, [visible, revision]);
  async function voice(value: string) {
    const result = await post('/api/profile/preferences', { narratorVoice: value });
    if (!result.ok) setError(result.message);
    else
      setPage((current) =>
        current ? { ...current, voice: value as HistoryPage['voice'] } : current,
      );
  }
  async function regenerate(id: string) {
    try {
      const result = await post('/api/narration/regenerate', {
        id,
        requestId: crypto.randomUUID(),
      });
      if (!result.ok) setError(result.message);
      else void load();
    } catch (reason) {
      setError(String(reason));
    }
  }
  async function leave() {
    if (!page?.active) return;
    try {
      const result = await post('/api/conversation', {
        requestId: crypto.randomUUID(),
        operation: 'leave',
        conversationId: page.active.id,
        generation: page.active.generation,
      });
      if (!result.ok) setError(result.message);
      else void load();
    } catch (reason) {
      setError(String(reason));
    }
  }
  return (
    <section
      className="ol-history"
      ref={section}
      aria-label={conversation ? 'Durable conversation history' : 'Private journal'}
    >
      <Button size="sm" onPress={() => void load()} isDisabled={busy}>
        {newEntries ? 'New or updated entries — refresh' : 'Refresh history'}
      </Button>
      {!conversation && (
        <label>
          Narrator voice{' '}
          <select
            aria-label="Narrator voice"
            value={page?.voice ?? 'restrained'}
            onChange={(event) => void voice(event.target.value)}
          >
            <option value="restrained">Restrained</option>
            <option value="lyrical">Lyrical</option>
            <option value="wry">Wry</option>
          </select>
        </label>
      )}
      {conversation && page?.active && (
        <>
          <p>{page.active.members.map((member) => member.name).join(', ')}</p>
          <Button size="sm" onPress={() => void leave()} isDisabled={busy}>
            Leave conversation
          </Button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {page?.before !== undefined && (
        <Button size="sm" onPress={() => void load(true)} isDisabled={busy}>
          Older entries
        </Button>
      )}
      {items.map((item) => (
        <article key={item.id}>
          <EventTime time={item.time} />
          <p>{item.text}</p>
          {item.impacts.map((impact) => (
            <div className="ol-meta" key={`${impact.sourceId}:${impact.field}`}>
              {impact.delta > 0 ? '+' : ''}
              {impact.delta} {impact.field} · {impact.entityName ?? 'affected actor'}
            </div>
          ))}
          {item.kind === 'narration' && item.status !== 'pending' && (
            <Button size="sm" variant="quiet" onPress={() => void regenerate(item.id)}>
              Regenerate narration
            </Button>
          )}
          {item.status === 'pending' && (
            <small>Prose is being prepared; committed facts are shown.</small>
          )}
          {item.legacy && <small>Earlier conversation membership was not recorded.</small>}
        </article>
      ))}
    </section>
  );
}

export function Narrator({ item }: { item: TranscriptItem | null | undefined }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const initial = useRef<string | null | undefined>(undefined);
  // The initial snapshot is history, not a new announcement after reload.
  if (initial.current === undefined && item !== undefined) initial.current = item?.id ?? null;
  if (!item || item.status === 'pending' || dismissed === item.id || initial.current === item.id)
    return null;
  return (
    <aside className="ol-narrator ol-card" aria-label="Narrator">
      <p role="status">{item.text}</p>
      <Button size="sm" variant="quiet" onPress={() => setDismissed(item.id)}>
        Dismiss
      </Button>
    </aside>
  );
}
