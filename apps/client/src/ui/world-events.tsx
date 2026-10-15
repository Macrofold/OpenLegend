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
const sourceKey = (ref: WorldEventSourceReference) =>
  JSON.stringify([ref.token, ref.family, ref.sourceId, ref.revision]);
const sameSource = (a: WorldEventSourceReference | null, b: WorldEventSourceReference) =>
  a?.family === b.family && a.sourceId === b.sourceId;

/** A durable, read-only perspective. Opening this panel never creates awareness or captions. */
type Props = { scope: string; revision: string | undefined; visible?: boolean };
/** Keyed ownership clears old rows during the same render, not a later effect. The owner may
 * control the filter, for example to open Speech from the missed-caption notice. */
export const WorldEvents = memo(function WorldEvents({
  ownerScope,
  type: controlledType,
  onTypeChange,
  ...props
}: Props & { ownerScope: string; type?: string; onTypeChange?: (type: string) => void }) {
  const [localType, setLocalType] = useState('all');
  const type = controlledType ?? localType;
  const setType = onTypeChange ?? setLocalType;
  const [query, setQuery] = useState('');
  return (
    <ScopedComparisonOwner
      key={ownerScope}
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
  visible = true,
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
  const [detailRead, setDetailRead] = useState<{
    key: string;
    details: Record<string, WorldEventSourceDetail>;
    busy: boolean;
    error: string;
  }>();
  const [pendingReturnId, setPendingReturnId] = useState<string | null>(null);
  const lastTriggerId = useRef<string | null>(null);
  const detailGeneration = useRef(0);
  const detailController = useRef<AbortController | null>(null);

  const activeRefs = useMemo(
    () => slots.filter((ref): ref is WorldEventSourceReference => ref !== null),
    [slots],
  );
  const detailKey = JSON.stringify([scope, revision, activeRefs.map(sourceKey)]);
  const currentDetailKey = useRef(detailKey);
  currentDetailKey.current = detailKey;
  // Selections survive correction/forgetting, but their old bodies stop rendering
  // immediately, before the replacement read's effect runs.
  // docs/memory-architecture.md#private-retrieval-fencing
  const currentDetails = detailRead?.key === detailKey ? detailRead : undefined;

  async function loadDetails(references = activeRefs) {
    detailController.current?.abort();
    if (!references.length) return;
    const abort = new AbortController();
    detailController.current = abort;
    const request = ++detailGeneration.current;
    setDetailRead({ key: detailKey, details: {}, busy: true, error: '' });
    try {
      const response = await post<WorldEventSourcesView | { ok: false; message?: string }>(
        '/api/world-events/sources',
        { references },
        abort.signal,
      );
      if (
        abort.signal.aborted ||
        request !== detailGeneration.current ||
        detailKey !== currentDetailKey.current
      )
        return;
      if (!response.ok) {
        throw new Error(response.message || 'Could not load source detail.');
      }
      const details: Record<string, WorldEventSourceDetail> = {};
      // The endpoint returns one result per requested reference, in request order,
      // including unavailable records whose body/identity cannot be disclosed.
      response.sources.forEach((item, index) => {
        const reference = references[index];
        if (reference) details[sourceKey(reference)] = item;
      });
      setDetailRead({ key: detailKey, details, busy: false, error: '' });
    } catch (reason) {
      if (
        abort.signal.aborted ||
        request !== detailGeneration.current ||
        detailKey !== currentDetailKey.current
      )
        return;
      setDetailRead({
        key: detailKey,
        details: {},
        busy: false,
        error: reason instanceof Error ? reason.message : String(reason),
      });
    }
  }

  useEffect(() => {
    if (!visible || !comparisonOpen || !activeRefs.length) {
      detailController.current?.abort();
      return;
    }
    void loadDetails(activeRefs);
    return () => {
      detailController.current?.abort();
    };
  }, [visible, comparisonOpen, detailKey]);

  return (
    <ScopedWorldEvents
      key={`${scope}:${type}`}
      scope={scope}
      revision={revision}
      visible={visible}
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
      details={currentDetails?.details ?? {}}
      detailBusy={comparisonOpen && activeRefs.length > 0 && (currentDetails?.busy ?? true)}
      detailError={currentDetails?.error ?? ''}
      reloadDetails={() => {
        if (visible) void loadDetails(activeRefs);
      }}
      pendingReturnId={pendingReturnId}
      setPendingReturnId={setPendingReturnId}
      lastTriggerId={lastTriggerId}
    />
  );
}

function ScopedWorldEvents({
  scope,
  revision,
  visible = true,
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
  const composing = useRef(false);
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
  const loadedQuery = useRef<string | null>(null);
  const failedOlder = useRef(false);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  async function load(older = false) {
    if (!visible) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const request = ++generation.current;
    const atRevision = revision;
    failedOlder.current = older;
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
      loadedQuery.current = query;
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
    loadedQuery.current = null;
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [scope, type, query]);
  useEffect(() => {
    if (visible && loadedQuery.current !== query) void load();
  }, [visible, scope, type, query]);
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
    const clearOther = sameSource(slots[otherIndex], ref);
    setComparisonOpen(true);
    setChoosingSlot(null);
    setSlots((prev) => {
      const next: ComparisonSlots = [...prev] as ComparisonSlots;
      if (clearOther || sameSource(next[otherIndex], ref)) {
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
    const existingIndex = sameSource(slots[0], ref) ? 0 : sameSource(slots[1], ref) ? 1 : -1;
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
        const inSlot0 = source && sameSource(slots[0], source);
        const inSlot1 = source && sameSource(slots[1], source);
        const selectedSlot = inSlot0 ? 1 : inSlot1 ? 2 : null;
        return {
          id: event.id,
          content: (
            <article className="ol-world-event" data-source-row={event.id}>
              <div className="ol-meta">
                <EventTime time={event.time} /> ·{' '}
                {filters.find(([value]) => value === event.type)?.[1] ?? event.type}
                {event.modality &&
                  ` · ${event.modality === 'heard' ? 'Heard' : event.modality === 'observed' ? 'Observed' : event.modality === 'felt' ? 'Felt' : 'Personal experience'}`}
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
          if (composing.current) return;
          if (draft.trim() === query) return;
          setEvents([]);
          setCursor(undefined);
          setError('');
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
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onBlur={() => {
              composing.current = false;
            }}
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
              const detail = ref ? details[sourceKey(ref)] : undefined;
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
                        <p className="ol-meta">
                          {detailBusy ? 'Loading retained source…' : 'Source detail unavailable.'}
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
          : error
            ? 'Reading did not finish. Any entries already loaded are kept below.'
            : query
              ? loadedQuery.current !== query
                ? 'Searching perceived events…'
                : `${events.length} ${events.length === 1 ? 'match' : 'matches'} for “${query}”${
                    scanLimited
                      ? '. This search stopped at its record limit; older events remain to search.'
                      : cursor
                        ? '. Older events remain to search.'
                        : '. End of the retained records.'
                  }`
              : type === 'speech'
                ? 'Speech you perceived across all conversations.'
                : 'Events you perceived, in time order.'}
      </p>
      {error && (
        <div className="ol-reading-error">
          <p role="alert">{error}</p>
          <Button
            size="sm"
            variant="quiet"
            isDisabled={busy}
            onPress={() => void load(failedOlder.current)}
          >
            Retry reading events
          </Button>
        </div>
      )}
      {!busy && !error && loadedQuery.current === query && !events.length && (
        <p>
          {query
            ? `No matches in the perceived events searched.${cursor ? ' Search older events or change your words.' : ''}`
            : 'No retained perceived events match this filter.'}
        </p>
      )}
      <ConversationThread
        conversationKey={`${scope}:${type}:${query}`}
        visible={visible}
        preserveReading
        liveAnnouncements="off"
        newMessageLabel="New events"
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
