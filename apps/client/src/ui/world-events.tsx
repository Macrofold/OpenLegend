import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PerceivedEventsPage,
  PublicEvent,
  WorldEventSourceDetail,
  WorldEventSourceReference,
  WorldEventSourcesView,
} from '@open-legend/protocol';
import { Button, Icon, IconButton } from '../design-system/components';
import { EventTime } from './event-time';
import { ConversationThread } from './conversation';
import { getScoped, post } from '../api';

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

type SlotOrigin = { type: string; query: string };
type ComparisonSlots = [WorldEventSourceReference | null, WorldEventSourceReference | null];
type ComparisonOrigins = [SlotOrigin | null, SlotOrigin | null];

/** A durable, read-only perspective. Opening this panel never creates awareness or captions. */
type Props = { scope: string; revision: string | undefined };
function comparisonOwnerScope(scope: string): string {
  // captionScope(view) appends `:${view.historyEpoch}` so the event list and captions
  // reset on transcript epoch bumps (such as memory correction or forgetting).
  // Comparison slots must survive memory correction/forgetting and refresh in place
  // via `revision`, resetting only when the viewing identity (`worldId`,
  // `saveTimeline`, `access.scope`, or `player.id`) changes.
  const parts = scope.split(':');
  return parts.length >= 5 && /^\d+$/.test(parts.at(-1) ?? '')
    ? parts.slice(0, -1).join(':')
    : scope;
}

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
    <ScopedComparisonOwner
      key={comparisonOwnerScope(props.scope)}
      {...props}
      type={type}
      setType={setType}
      query={query}
      setQuery={setQuery}
    />
  );
});

function ScopedComparisonOwner({
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
  const [slots, setSlots] = useState<ComparisonSlots>([null, null]);
  const [origins, setOrigins] = useState<ComparisonOrigins>([null, null]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [choosingSlot, setChoosingSlot] = useState<0 | 1 | null>(null);
  const [details, setDetails] = useState<Record<string, WorldEventSourceDetail>>({});
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null);
  const lastTriggerId = useRef<string | null>(null);
  const detailGeneration = useRef(0);
  const detailController = useRef<AbortController | null>(null);

  const activeRefs = useMemo(
    () => slots.filter((ref): ref is WorldEventSourceReference => ref !== null),
    [slots],
  );
  const refsKey = activeRefs
    .map((ref) => `${ref.family}:${ref.sourceId}:${ref.revision}`)
    .join('|');

  async function loadDetails(references = activeRefs) {
    detailController.current?.abort();
    if (!references.length) {
      setDetailBusy(false);
      setDetailError('');
      return;
    }
    const abort = new AbortController();
    detailController.current = abort;
    const request = ++detailGeneration.current;
    setDetailBusy(true);
    setDetailError('');
    try {
      const response = await post<WorldEventSourcesView | { ok: false; message?: string }>(
        '/api/world-events/sources',
        { references },
        abort.signal,
      );
      if (request !== detailGeneration.current) return;
      if (!response.ok) {
        throw new Error(response.message || 'Could not load source detail.');
      }
      setDetails((previous) => {
        const next = { ...previous };
        for (const item of response.sources) {
          const id = item.status === 'available' ? item.reference.sourceId : item.sourceId;
          next[id] = item;
        }
        return next;
      });
    } catch (reason) {
      if (abort.signal.aborted || request !== detailGeneration.current) return;
      setDetailError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (request === detailGeneration.current) setDetailBusy(false);
    }
  }

  useEffect(() => {
    if (!comparisonOpen || !activeRefs.length) {
      detailController.current?.abort();
      setDetailBusy(false);
      return;
    }
    void loadDetails(activeRefs);
    return () => {
      detailController.current?.abort();
    };
  }, [comparisonOpen, refsKey, revision]);

  return (
    <ScopedWorldEvents
      key={`${scope}:${type}`}
      scope={scope}
      revision={revision}
      type={type}
      setType={setType}
      query={query}
      setQuery={setQuery}
      slots={slots}
      setSlots={setSlots}
      origins={origins}
      setOrigins={setOrigins}
      comparisonOpen={comparisonOpen}
      setComparisonOpen={setComparisonOpen}
      choosingSlot={choosingSlot}
      setChoosingSlot={setChoosingSlot}
      details={details}
      detailBusy={detailBusy}
      detailError={detailError}
      reloadDetails={() => void loadDetails(activeRefs)}
      pendingReturnId={pendingReturnId}
      setPendingReturnId={setPendingReturnId}
      lastTriggerId={lastTriggerId}
    />
  );
}

function ScopedWorldEvents({
  scope,
  revision,
  type,
  setType,
  query,
  setQuery,
  slots,
  setSlots,
  origins,
  setOrigins,
  comparisonOpen,
  setComparisonOpen,
  choosingSlot,
  setChoosingSlot,
  details,
  detailBusy,
  detailError,
  reloadDetails,
  pendingReturnId,
  setPendingReturnId,
  lastTriggerId,
}: Props & {
  type: string;
  setType: (type: string) => void;
  query: string;
  setQuery: (query: string) => void;
  slots: ComparisonSlots;
  setSlots: React.Dispatch<React.SetStateAction<ComparisonSlots>>;
  origins: ComparisonOrigins;
  setOrigins: React.Dispatch<React.SetStateAction<ComparisonOrigins>>;
  comparisonOpen: boolean;
  setComparisonOpen: React.Dispatch<React.SetStateAction<boolean>>;
  choosingSlot: 0 | 1 | null;
  setChoosingSlot: React.Dispatch<React.SetStateAction<0 | 1 | null>>;
  details: Record<string, WorldEventSourceDetail>;
  detailBusy: boolean;
  detailError: string;
  reloadDetails: () => void;
  pendingReturnId: string | null;
  setPendingReturnId: React.Dispatch<React.SetStateAction<string | null>>;
  lastTriggerId: React.MutableRefObject<string | null>;
}) {
  const [draft, setDraft] = useState(query);
  const searchInput = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    setDraft(query);
  }, [query]);

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

  function focusSourceRow(sourceId: string): boolean {
    const root = sectionRef.current;
    if (!root) return false;
    const row = root.querySelector<HTMLElement>(`[data-source-row="${CSS.escape(sourceId)}"]`);
    const button = root.querySelector<HTMLElement>(
      `[data-source-inspect="${CSS.escape(sourceId)}"]`,
    );
    if (!row && !button) return false;
    row?.scrollIntoView({ block: 'nearest' });
    (button ?? row)?.focus();
    return true;
  }

  useEffect(() => {
    if (!pendingReturnId || busy) return;
    if (focusSourceRow(pendingReturnId)) {
      setPendingReturnId(null);
    }
  }, [pendingReturnId, events, busy]);

  function assignSlot(slotIndex: 0 | 1, ref: WorldEventSourceReference) {
    lastTriggerId.current = ref.sourceId;
    const otherIndex: 0 | 1 = slotIndex === 0 ? 1 : 0;
    const clearOther = slots[otherIndex]?.sourceId === ref.sourceId;
    setComparisonOpen(true);
    setChoosingSlot(null);
    setSlots((prev) => {
      const next: ComparisonSlots = [...prev] as ComparisonSlots;
      if (clearOther || next[otherIndex]?.sourceId === ref.sourceId) {
        next[otherIndex] = null;
      }
      next[slotIndex] = ref;
      return next;
    });
    setOrigins((prev) => {
      const next: ComparisonOrigins = [...prev] as ComparisonOrigins;
      if (clearOther) {
        next[otherIndex] = null;
      }
      next[slotIndex] = { type, query };
      return next;
    });
  }

  function handleInspectSource(ref: WorldEventSourceReference) {
    const targetSlot: 0 | 1 = choosingSlot ?? 0;
    assignSlot(targetSlot, ref);
  }

  function handleCompareSource(ref: WorldEventSourceReference) {
    lastTriggerId.current = ref.sourceId;
    const existingIndex =
      slots[0]?.sourceId === ref.sourceId ? 0 : slots[1]?.sourceId === ref.sourceId ? 1 : -1;
    if (existingIndex !== -1 && choosingSlot === null) {
      removeSlot(existingIndex as 0 | 1);
      return;
    }
    if (choosingSlot !== null) {
      assignSlot(choosingSlot, ref);
      return;
    }
    const targetSlot: 0 | 1 = slots[0] === null ? 0 : slots[1] === null ? 1 : 1;
    assignSlot(targetSlot, ref);
  }

  function removeSlot(slotIndex: 0 | 1) {
    const remainingSlot = slotIndex === 0 ? slots[1] : slots[0];
    setChoosingSlot((prev) => (prev === slotIndex ? null : prev));
    if (!remainingSlot) setComparisonOpen(false);
    setSlots((prev) => {
      if (slotIndex === 0 && prev[1] !== null) {
        return [prev[1], null];
      }
      const next: ComparisonSlots = [...prev] as ComparisonSlots;
      next[slotIndex] = null;
      return next;
    });
    setOrigins((prev) => {
      if (slotIndex === 0 && prev[1] !== null) {
        return [prev[1], null];
      }
      const next: ComparisonOrigins = [...prev] as ComparisonOrigins;
      next[slotIndex] = null;
      return next;
    });
  }

  function closeComparison() {
    setComparisonOpen(false);
    setChoosingSlot(null);
    const triggerId = lastTriggerId.current;
    if (!triggerId || !focusSourceRow(triggerId)) {
      searchInput.current?.focus();
    }
    requestAnimationFrame(() => {
      if (triggerId && focusSourceRow(triggerId)) return;
      searchInput.current?.focus();
    });
  }

  function returnToSource(slotIndex: 0 | 1, sourceId: string) {
    if (focusSourceRow(sourceId)) return;
    const origin = origins[slotIndex];
    setPendingReturnId(sourceId);
    if (origin) {
      if (origin.query !== query) {
        setDraft(origin.query);
        setQuery(origin.query);
      }
      if (origin.type !== type) {
        setType(origin.type);
      }
    }
  }

  const items = useMemo(
    () =>
      events.map((event) => {
        const source = event.source;
        const inSlot0 = source && slots[0]?.sourceId === source.sourceId;
        const inSlot1 = source && slots[1]?.sourceId === source.sourceId;
        const selectedSlot = inSlot0 ? 1 : inSlot1 ? 2 : null;
        return {
          id: event.id,
          content: (
            <article className="ol-world-event" data-source-row={event.id}>
              <div className="ol-meta">
                <EventTime time={event.time} /> · {event.type}
                {selectedSlot !== null && ` · Source ${selectedSlot}`}
              </div>
              <p>
                {event.type === 'speech' && <Icon name="ui.speech" size={16} />} {event.text}
              </p>
              {source && (
                <div className="ol-world-event-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    data-source-inspect={event.id}
                    onPress={() => handleInspectSource(source)}
                  >
                    {choosingSlot !== null ? `Use as Source ${choosingSlot + 1}` : 'Inspect source'}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedSlot !== null ? 'primary' : 'secondary'}
                    onPress={() => handleCompareSource(source)}
                  >
                    {selectedSlot !== null
                      ? `Comparing (Source ${selectedSlot})`
                      : 'Compare sources'}
                  </Button>
                </div>
              )}
            </article>
          ),
        };
      }),
    [events, slots, choosingSlot, type, query],
  );

  const visibleSlotIndices = [0, 1] as const;

  return (
    <section
      ref={sectionRef}
      className="ol-world-events"
      aria-label="Perceived world events"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (comparisonOpen || choosingSlot !== null)) {
          event.preventDefault();
          event.stopPropagation();
          closeComparison();
        }
      }}
    >
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
      {comparisonOpen && (slots[0] !== null || slots[1] !== null || choosingSlot !== null) && (
        <section className="ol-world-event-comparison" aria-label="Compare sources">
          <div className="ol-world-event-comparison-header">
            <strong>
              {slots[0] && slots[1] ? 'Comparing two sources' : 'Source detail & comparison'}
            </strong>
            <Button size="sm" variant="secondary" onPress={closeComparison}>
              Close comparison
            </Button>
          </div>
          {choosingSlot !== null && (
            <p className="ol-meta" role="status">
              Select an encounter or speech row below to place in Source {choosingSlot + 1}. You can
              search or load older events without losing your other selection.
            </p>
          )}
          {detailBusy && (
            <p className="ol-meta" role="status">
              Loading source detail…
            </p>
          )}
          {detailError && (
            <div className="ol-world-event-comparison-error" role="alert">
              <span>{detailError}</span>{' '}
              <Button size="sm" variant="secondary" onPress={reloadDetails}>
                Retry
              </Button>
            </div>
          )}
          <div className="ol-world-event-comparison-grid">
            {visibleSlotIndices.map((slotIndex) => {
              const ref = slots[slotIndex];
              const detail = ref ? details[ref.sourceId] : undefined;
              return (
                <article
                  key={`slot-${slotIndex}`}
                  className="ol-world-event-source-card"
                  aria-label={`Source ${slotIndex + 1}`}
                >
                  {!ref ? (
                    <>
                      <div className="ol-world-event-source-meta">
                        <strong>Source {slotIndex + 1}</strong>
                        <p className="ol-meta">
                          {choosingSlot === slotIndex
                            ? `Choosing Source ${slotIndex + 1} from the event list below…`
                            : `No ${slotIndex === 0 ? 'first' : 'second'} source selected yet.`}
                        </p>
                      </div>
                      <div className="ol-world-event-source-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
                            setChoosingSlot(slotIndex);
                            searchInput.current?.focus();
                          }}
                        >
                          Choose another source
                        </Button>
                      </div>
                    </>
                  ) : detail?.status === 'unavailable' ? (
                    <>
                      <div className="ol-world-event-source-meta">
                        <strong>Source {slotIndex + 1} · Unavailable</strong>
                        <p className="ol-meta">Record reference {ref.sourceId}</p>
                      </div>
                      <div className="ol-world-event-source-body">
                        <p className="ol-world-event-source-unavailable">{detail.reason}</p>
                      </div>
                      <div className="ol-world-event-source-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
                            setChoosingSlot(slotIndex);
                            searchInput.current?.focus();
                          }}
                        >
                          Choose another source
                        </Button>
                        <Button size="sm" variant="secondary" onPress={() => removeSlot(slotIndex)}>
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => returnToSource(slotIndex, ref.sourceId)}
                        >
                          Back to source
                        </Button>
                      </div>
                    </>
                  ) : detail?.status === 'available' ? (
                    <>
                      {/* 1. Source, time, and acquisition */}
                      <div className="ol-world-event-source-meta">
                        <strong>
                          Source {slotIndex + 1} · {detail.acquisitionLabel}
                        </strong>
                        <p className="ol-meta">
                          {detail.sourceLabel} · <EventTime time={detail.time} /> · Record #
                          {detail.order}
                        </p>
                        {detail.acquisition === 'inspected-document' && (
                          <p className="ol-meta">
                            Written account: you read these words directly; any events or places
                            named inside the text are attributed claims, not a witnessed event.
                          </p>
                        )}
                        {detail.observedLocation && (
                          <p className="ol-meta">
                            <strong>Observed here then:</strong> {detail.observedLocation.label}
                            {detail.observedLocation.point
                              ? ` (${Math.round(detail.observedLocation.point.x)}, ${Math.round(detail.observedLocation.point.z)})`
                              : ''}{' '}
                            at <EventTime time={detail.time} /> (historical observation, not live
                            location)
                          </p>
                        )}
                        {detail.corrected && (
                          <p className="ol-meta" role="status">
                            <strong>Qualified source:</strong>{' '}
                            {detail.correctionNote ?? 'Later qualified in retained history.'}
                          </p>
                        )}
                      </div>
                      {/* 2. Readable text */}
                      <div className="ol-world-event-source-body">
                        <p className="ol-world-event-source-text">{detail.text}</p>
                      </div>
                      {/* 3. Source navigation */}
                      <div className="ol-world-event-source-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
                            setChoosingSlot(slotIndex);
                            searchInput.current?.focus();
                          }}
                        >
                          Choose another source
                        </Button>
                        <Button size="sm" variant="secondary" onPress={() => removeSlot(slotIndex)}>
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => returnToSource(slotIndex, ref.sourceId)}
                        >
                          Back to source
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ol-world-event-source-meta">
                        <strong>Source {slotIndex + 1}</strong>
                        <p className="ol-meta">Loading retained source…</p>
                      </div>
                      <div className="ol-world-event-source-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
                            setChoosingSlot(slotIndex);
                            searchInput.current?.focus();
                          }}
                        >
                          Choose another source
                        </Button>
                        <Button size="sm" variant="secondary" onPress={() => removeSlot(slotIndex)}>
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => returnToSource(slotIndex, ref.sourceId)}
                        >
                          Back to source
                        </Button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
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
