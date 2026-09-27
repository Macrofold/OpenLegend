import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PerceivedEventsPage, PublicEvent } from '@open-legend/protocol';
import { Button, Icon } from '../design-system/components';
import { EventTime } from './event-time';
import { ConversationThread } from './conversation';

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
/** Keyed ownership clears old rows during the same render, not a later effect. */
export const WorldEvents = memo(function WorldEvents(props: Props) {
  const [type, setType] = useState('all');
  return (
    <ScopedWorldEvents key={`${props.scope}:${type}`} {...props} type={type} setType={setType} />
  );
});
function ScopedWorldEvents({
  scope,
  revision,
  type,
  setType,
}: Props & { type: string; setType: (type: string) => void }) {
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
      const query = new URLSearchParams({ type });
      if (older && cursor) query.set('cursor', cursor);
      const response = await fetch(`/api/world-events?${query}`, {
        cache: 'no-store',
        signal: abort.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 400
            ? 'This history page expired. Refresh the event log.'
            : 'World Events could not be loaded.',
        );
      const page = (await response.json()) as PerceivedEventsPage;
      if (request !== generation.current) return;
      setEvents((previous) => {
        if (!older) return page.events;
        const seen = new Set(previous.map((event) => event.id));
        return [...page.events.filter((event) => !seen.has(event.id)), ...previous];
      });
      setCursor(page.nextCursor);
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
  }, [scope, type]);
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
        <Button size="sm" isDisabled={busy} onPress={() => void load()}>
          {newEntries ? 'New events — refresh' : 'Refresh'}
        </Button>
      </div>
      <p className="ol-meta">
        {type === 'speech'
          ? 'Speech you perceived across all conversations.'
          : 'Events you perceived, in time order.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !events.length && <p>No perceived events match this filter.</p>}
      <ConversationThread
        conversationKey={`${scope}:${type}`}
        ariaLabel="Perceived world events"
        openingRevision={openingRevision}
        before={
          <>
            {cursor && (
              <Button size="sm" isDisabled={busy} onPress={() => void load(true)}>
                Load older events
              </Button>
            )}
            {busy && <p role="status">Loading events…</p>}
          </>
        }
        items={items}
      />
    </section>
  );
}
