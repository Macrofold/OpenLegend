import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PerceivedEventsPage, PublicEvent } from '@open-legend/protocol';
import { Button, Icon, IconButton } from '../design-system/components';
import { EventTime } from './event-time';
import { ConversationThread } from './conversation';
import { getScoped } from '../api';

const filters = [
  ['all', 'All'],
  ['speech', 'Speech'],
  ['expression', 'Expressions'],
  ['encounter', 'Encounters'],
  ['action-started', 'Action started'],
  ['action-stopped', 'Action stopped'],
  ['crafted', 'Crafting'],
  ['taught', 'Teaching'],
  ['shot', 'Shots'],
  ['death', 'Deaths'],
  ['body-effect', 'Body effects'],
  ['attribute-concern', 'Body sensations'],
  ['contact', 'Contacts'],
] as const;
/** A durable, read-only perspective. Opening this panel never creates awareness or captions. */
type Props = { scope: string; revision: string | undefined };
/** Keyed ownership clears old rows during the same render, not a later effect. The owner may
 * control the filter, for example to open Speech from the missed-caption notice. */
export const WorldEvents = memo(function WorldEvents({
  type: controlledType,
  onTypeChange,
  ...props
}: Props & { type?: string; onTypeChange?: (type: string) => void }) {
  const [localType, setLocalType] = useState('all');
  const type = controlledType ?? localType;
  const setType = onTypeChange ?? setLocalType;
  const [query, setQuery] = useState('');
  return (
    <ScopedWorldEvents
      key={`${props.scope}:${type}`}
      {...props}
      type={type}
      setType={setType}
      query={query}
      setQuery={setQuery}
    />
  );
});
function ScopedWorldEvents({
  scope,
  revision,
  type,
  setType,
  query,
  setQuery,
}: Props & {
  type: string;
  setType: (type: string) => void;
  query: string;
  setQuery: (query: string) => void;
}) {
  const [draft, setDraft] = useState(query);
  const searchInput = useRef<HTMLInputElement>(null);
  const [scanLimited, setScanLimited] = useState(false);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newEntries, setNewEntries] = useState(false);
  const [openingRevision, setOpeningRevision] = useState(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const loadedRevision = useRef(revision);
  async function load(older = false) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const request = ++generation.current;
    const atRevision = revision;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ type });
      if (query) params.set('q', query);
      if (older && cursor) params.set('cursor', cursor);
      const page = await getScoped<PerceivedEventsPage>(
        `/api/world-events?${params}`,
        abort.signal,
      );
      if (request !== generation.current) return;
      setEvents((previous) => {
        if (!older) return page.events;
        const seen = new Set(previous.map((event) => event.id));
        return [...page.events.filter((event) => !seen.has(event.id)), ...previous];
      });
      setCursor(page.nextCursor);
      setScanLimited(!!page.scanLimited);
      if (!older) {
        loadedRevision.current = atRevision;
        setNewEntries(false);
        setOpeningRevision((n) => n + 1);
      }
    } catch (reason) {
      if (request === generation.current) setError(String(reason));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    generation.current++;
    setEvents([]);
    setCursor(undefined);
    void load();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [scope, type, query]);
  useEffect(() => {
    if (loadedRevision.current !== revision) setNewEntries(true);
  }, [revision, busy]);
  const items = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        content: (
          <article className="ol-world-event">
            <div className="ol-meta">
              <EventTime time={event.time} /> · {event.type}
            </div>
            <p>
              {event.type === 'speech' && <Icon name="ui.speech" size={16} />} {event.text}
            </p>
          </article>
        ),
      })),
    [events],
  );
  return (
    <section className="ol-world-events" aria-label="Perceived world events">
      <div className="ol-world-event-controls">
        <label>
          Type{' '}
          <select
            aria-label="World event type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {filters.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" isPending={busy} onPress={() => void load()}>
          {newEntries ? 'New events — refresh' : 'Refresh'}
        </Button>
      </div>
      {/* Matches only the text shown for each event you perceived, never unheard words. */}
      <form
        className="ol-memory-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim() === query) return;
          setEvents([]);
          setQuery(draft.trim());
        }}
      >
        <div className="ol-search">
          <Icon name="ui.search" size={16} />
          <input
            ref={searchInput}
            type="search"
            aria-label="Search perceived events"
            placeholder={type === 'speech' ? 'Search speech you heard…' : 'Search events…'}
            value={draft}
            maxLength={200}
            onChange={(event) => setDraft(event.target.value)}
          />
          {draft && (
            <IconButton
              icon="ui.close"
              label="Clear event search"
              onPress={() => {
                setDraft('');
                if (query) {
                  setEvents([]);
                  setQuery('');
                }
                searchInput.current?.focus();
              }}
            />
          )}
        </div>
        <Button size="sm" type="submit" isPending={busy}>
          Search
        </Button>
      </form>
      <p className="ol-meta" role="status">
        {query && busy
          ? 'Searching…'
          : query
            ? `${events.length} ${events.length === 1 ? 'match' : 'matches'} for “${query}”${
                scanLimited ? '. No more matches among the last 2,000 events searched.' : ''
              }`
            : type === 'speech'
              ? 'Speech you perceived across all conversations.'
              : 'Events you perceived, in time order.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !events.length && (
        <p>
          {query
            ? 'No perceived events match this search yet.'
            : 'No perceived events match this filter.'}
        </p>
      )}
      <ConversationThread
        conversationKey={`${scope}:${type}:${query}`}
        ariaLabel="Perceived world events"
        openingRevision={openingRevision}
        before={
          <>
            {cursor && (
              <Button size="sm" isPending={busy} onPress={() => void load(true)}>
                {query ? 'Search older events' : 'Load older events'}
              </Button>
            )}
            {/* During a search the status line above announces progress. */}
            {busy && !query && <p role="status">Loading events…</p>}
          </>
        }
        items={items}
      />
    </section>
  );
}
