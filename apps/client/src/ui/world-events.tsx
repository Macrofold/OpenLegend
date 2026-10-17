import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  GameView,
  PerceivedEventsPage,
  PublicEvent,
  WorldEventSourceDetail,
  WorldEventSourceReference,
  WorldEventSourcesView,
} from '@open-legend/protocol';
import { Button, FilterButton, Icon, IconButton } from '../design-system/components';
import { EventTime, clockParts } from './event-time';
import { PerceivedEventText } from './perceived-event-text';
import './world-events.css';
import { formatDisplayNumber } from '@open-legend/language';
import { LoadingIndicator } from '../design-system/loading';
import { ConversationThread } from './conversation';
import { getScoped, post } from '../api';

const filters = [
  ['all', 'All'],
  ['speech', 'Speech'],
  ['actions', 'Actions'],
  ['conflict', 'Conflict'],
  ['body', 'Body'],
  ['observations', 'Observations'],
] as const;

type SlotOrigin = { type: string; query: string };
type ComparisonSlots = [WorldEventSourceReference | null, WorldEventSourceReference | null];
type ComparisonOrigins = [SlotOrigin | null, SlotOrigin | null];
const sourceKey = (ref: WorldEventSourceReference) =>
  JSON.stringify([ref.token, ref.family, ref.sourceId, ref.revision]);
const sameSource = (a: WorldEventSourceReference | null, b: WorldEventSourceReference) =>
  a?.family === b.family && a.sourceId === b.sourceId;

/** A durable, read-only perspective. Opening this panel never creates awareness or captions. */
type Props = {
  scope: string;
  revision: string | undefined;
  visible?: boolean;
  view: GameView;
  inspectEntity?: (id: string) => void;
};
/** Keyed ownership clears old rows during the same render, not a later effect. The owner may
 * control the filter, for example to open Speech from the missed-caption notice. */
export const WorldEvents = memo(function WorldEvents({
  view,
  inspectEntity,
  type: controlledType,
  onTypeChange,
  ...props
}: Props & { type?: string; onTypeChange?: (type: string) => void }) {
  // Reading belongs to the person, not the current controller connection. The
  // nested history owner separately clears revoked/edited evidence immediately.
  const ownerScope = JSON.stringify([
    view.worldId,
    view.player.id,
    view.access?.privateDraftScope,
    view.saveTimeline,
  ]);
  const inspection = useRef(inspectEntity);
  inspection.current = inspectEntity;
  const inspectCurrent = useCallback((id: string) => inspection.current?.(id), []);
  const [localType, setLocalType] = useState('all');
  const type = controlledType ?? localType;
  const setType = onTypeChange ?? setLocalType;
  const [query, setQuery] = useState('');
  return (
    <ScopedComparisonOwner
      key={ownerScope}
      {...props}
      canShowAll={!!view.godMode}
      controlScope={view.access?.scope ?? ''}
      historyEpoch={view.historyEpoch ?? ''}
      day={view.clock.day}
      offsetHours={view.clock.offsetHours}
      inspectEntity={inspectEntity ? inspectCurrent : undefined}
      type={type}
      setType={setType}
      query={query}
      setQuery={setQuery}
    />
  );
});

type HistoryProps = Omit<Props, 'view'> & {
  day: number;
  offsetHours: number;
  controlScope: string;
  historyEpoch: string;
  canShowAll: boolean;
};

// Only clock formatting/date bounds reach the historical reader; live positions and
// meters must not rebuild all loaded event rows on every world update.
const ScopedComparisonOwner = memo(function ScopedComparisonOwner({
  controlScope,
  historyEpoch,
  canShowAll,
  day,
  offsetHours,
  inspectEntity,
  scope,
  revision,
  visible = true,
  type,
  setType,
  query,
  setQuery,
}: HistoryProps & {
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
  const [selectionScope, setSelectionScope] = useState(controlScope);
  if (selectionScope !== controlScope) {
    // Source tokens are current-authority capabilities, even when their already
    // admitted prose remains readable by this same private owner.
    setSelectionScope(controlScope);
    setSlots([null, null]);
    setOrigins([null, null]);
    setComparisonOpen(false);
    setChoosingSlot(null);
    setDetailRead(undefined);
    setPendingReturnId(null);
  }
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
      key={`${historyEpoch}:${canShowAll}`}
      scope={scope}
      controlScope={controlScope}
      historyEpoch={historyEpoch}
      canShowAll={canShowAll}
      day={day}
      offsetHours={offsetHours}
      inspectEntity={inspectEntity}
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
});

function ScopedWorldEvents({
  canShowAll,
  day,
  offsetHours,
  inspectEntity,
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
}: HistoryProps & {
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
  const [pageScope, setPageScope] = useState<string>();
  const currentPage = pageScope === scope;
  const [cursor, setCursor] = useState<string>();
  const [newerCursor, setNewerCursor] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const [jumpDay, setJumpDay] = useState(String(day));
  const [jumpClock, setJumpClock] = useState('12:00');
  const [jumpTime, setJumpTime] = useState<number>();
  const readKey = JSON.stringify([scope, type, query, showAll, jumpTime]);
  const [loadedReadKey, setLoadedReadKey] = useState<string>();
  const currentQueryPage = loadedReadKey === readKey;
  const currentReadKey = useRef(readKey);
  currentReadKey.current = readKey;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newEntries, setNewEntries] = useState(false);
  const [openingRevision, setOpeningRevision] = useState(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const loadedRevision = useRef(revision);
  const loadedQuery = useRef<string | null>(null);
  const failedOlder = useRef<boolean | 'newer'>(false);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  async function load(older: boolean | 'newer' = false) {
    if (!visible || (older && !currentQueryPage)) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const request = ++generation.current;
    const atRevision = revision;
    failedOlder.current = older;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ category: type, showAll: String(showAll) });
      if (!older && jumpTime !== undefined) params.set('at', String(jumpTime));
      if (query) params.set('q', query);
      if (older === true && cursor) params.set('cursor', cursor);
      if (older === 'newer' && newerCursor) params.set('cursor', newerCursor);
      const page = await getScoped<PerceivedEventsPage>(
        `/api/world-events?${params}`,
        abort.signal,
      );
      if (
        abort.signal.aborted ||
        request !== generation.current ||
        currentReadKey.current !== readKey
      )
        return;
      setEvents((previous) => {
        if (!older) return page.events;
        const seen = new Set(previous.map((event) => event.id));
        const incoming = page.events.filter((event) => !seen.has(event.id));
        return older === 'newer' ? [...previous, ...incoming] : [...incoming, ...previous];
      });
      if (older !== 'newer') setCursor(page.nextCursor);
      if (older !== true) setNewerCursor(page.newerCursor);
      setScanLimited(!!page.scanLimited);
      setPageScope(scope);
      setLoadedReadKey(readKey);
      loadedQuery.current = query;
      if (!older) {
        loadedRevision.current = atRevision;
        setNewEntries(false);
        if (currentPage || !events.length) setOpeningRevision((n) => n + 1);
      }
    } catch (reason) {
      if (
        !abort.signal.aborted &&
        request === generation.current &&
        currentReadKey.current === readKey
      )
        setError(String(reason));
    } finally {
      if (request === generation.current && currentReadKey.current === readKey) setBusy(false);
    }
  }
  useEffect(() => {
    generation.current++;
    setCursor(undefined);
    setNewerCursor(undefined);
    loadedQuery.current = null;
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [scope, type, query, showAll, jumpTime]);
  useEffect(() => {
    setEvents([]);
    setPageScope(undefined);
  }, [showAll]);
  useEffect(() => {
    if (visible && loadedQuery.current !== query) void load();
  }, [visible, scope, type, query, showAll, jumpTime]);
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
    const disclosure = button?.closest('details');
    if (disclosure) disclosure.open = true;
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
    setPendingReturnId(null);
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

  const items = useMemo(() => {
    let previousDay: number | undefined,
      previousTime = -Infinity;
    return events.map((event) => {
      const source = currentPage ? event.source : undefined;
      const selectedSlot =
        source && sameSource(slots[0], source)
          ? 1
          : source && sameSource(slots[1], source)
            ? 2
            : null;
      const clock = clockParts(event.time, offsetHours);
      const newDay = previousDay !== clock.day;
      const showTime = newDay || event.time - previousTime >= 600;
      previousDay = clock.day;
      previousTime = event.time;
      const timestamp = `Day ${clock.day}, ${clock.hour}:${clock.minute}`;
      return {
        id: event.id,
        content: (
          <>
            {newDay && <div className="ol-event-day">Day {clock.day}</div>}
            <article className="ol-world-event" data-source-row={event.id} title={timestamp}>
              {showTime && (
                <time className="ol-event-clock">
                  {clock.hour}:{clock.minute}
                </time>
              )}
              <div className="ol-world-event-line">
                <Icon name={event.presentation?.icon ?? 'ui.inview'} size={16} />
                <p>
                  <PerceivedEventText event={event} inspectEntity={inspectEntity} />
                </p>
              </div>
              <details className="ol-world-event-detail">
                <summary
                  aria-label={
                    selectedSlot
                      ? `Event details, comparing as Source ${selectedSlot}`
                      : 'Event details'
                  }
                  title="Event details"
                >
                  <Icon name="ui.more" size={16} />
                </summary>
                <p>
                  {timestamp}
                  {event.modality
                    ? `, ${event.modality === 'heard' ? 'heard' : event.modality === 'observed' ? 'observed' : event.modality === 'felt' ? 'felt' : 'personal experience'}`
                    : ''}
                </p>
                {event.attributeChange && (
                  <p>
                    {event.attributeChange.name ?? 'Meter'}:{' '}
                    {formatDisplayNumber(event.attributeChange.before, {
                      integer: event.attributeChange.kind === 'health',
                    })}
                    {event.attributeChange.unit} to{' '}
                    {formatDisplayNumber(event.attributeChange.after, {
                      integer: event.attributeChange.kind === 'health',
                    })}
                    {event.attributeChange.unit}
                  </p>
                )}
                {event.speech?.recipient && <p>To {event.speech.recipient.nameAtTime}</p>}
                {inspectEntity &&
                  (event.references ?? []).map((ref) => (
                    <button
                      type="button"
                      key={`${ref.role}:${ref.id}`}
                      className="ol-inline-reference"
                      onClick={() => inspectEntity(ref.id)}
                    >
                      {ref.label}
                    </button>
                  ))}
                {source && (
                  <div className="ol-world-event-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      data-source-inspect={event.id}
                      onPress={() => handleInspectSource(source)}
                    >
                      {choosingSlot !== null
                        ? `Use as Source ${choosingSlot + 1}`
                        : 'Inspect source'}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSlot ? 'primary' : 'secondary'}
                      onPress={() => handleCompareSource(source)}
                    >
                      {selectedSlot ? `Comparing (Source ${selectedSlot})` : 'Compare sources'}
                    </Button>
                  </div>
                )}
              </details>
            </article>
          </>
        ),
      };
    });
  }, [events, slots, choosingSlot, type, query, inspectEntity, offsetHours, currentPage]);

  const visibleSlotIndices = [0, 1] as const;

  return (
    <section
      ref={sectionRef}
      className="ol-world-events"
      aria-label="Perceived world events"
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (comparisonOpen || choosingSlot !== null)) {
          event.preventDefault();
          event.stopPropagation();
          closeComparison();
        }
      }}
    >
      <div className="ol-world-event-controls">
        <div className="ol-event-filters" role="group" aria-label="Filter events">
          {filters.map(([value, label]) => (
            <FilterButton key={value} selected={type === value} onPress={() => setType(value)}>
              {label}
            </FilterButton>
          ))}
        </div>
      </div>
      <form
        className="ol-event-time-jump"
        aria-label="Jump to time"
        onSubmit={(event) => {
          event.preventDefault();
          const [hour, minute] = jumpClock.split(':').map(Number);
          const day = Number(jumpDay);
          if (!Number.isInteger(day) || day < 1 || hour === undefined || minute === undefined)
            return;
          const daySeconds =
            (((hour * 3600 + minute * 60 - offsetHours * 3600) % 86400) + 86400) % 86400;
          const at = (day - 1) * 86400 + daySeconds;
          if (at === jumpTime) void load();
          else setJumpTime(at);
        }}
      >
        <div className="ol-event-time-heading">
          <span className="ol-event-time-label">Jump to time</span>
          <Button
            variant="quiet"
            isDisabled={busy}
            onPress={() => {
              if (jumpTime !== undefined) setJumpTime(undefined);
              else void load();
            }}
          >
            Latest
          </Button>
          {newEntries && (
            <span className="ol-event-new" aria-label="New events available">
              New events
            </span>
          )}
        </div>
        <label>
          Day
          <input
            className="ol-field-control"
            aria-label="Event day"
            type="number"
            min="1"
            max={day}
            step="1"
            value={jumpDay}
            onChange={(e) => setJumpDay(e.target.value)}
            required
          />
        </label>
        <label>
          Time
          <input
            className="ol-field-control"
            aria-label="Event time"
            type="time"
            value={jumpClock}
            onChange={(e) => setJumpClock(e.target.value)}
            required
          />
        </label>
        <Button type="submit" variant="secondary" isDisabled={busy}>
          Jump
        </Button>
      </form>
      {/* Matches only the text shown for each event you perceived, never unheard words. */}
      <form
        className="ol-memory-search ol-event-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (composing.current) return;
          if (draft.trim() === query) return;
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
          <span className="ol-event-loading-slot">
            <LoadingIndicator active={busy} label="Loading events" />
          </span>
          {draft && (
            <IconButton
              icon="ui.close"
              label="Clear event search"
              onPress={() => {
                setDraft('');
                if (query) {
                  setQuery('');
                }
                searchInput.current?.focus();
              }}
            />
          )}
        </div>
        <Button type="submit" isDisabled={busy}>
          Search
        </Button>
      </form>
      {canShowAll && (
        <div className="ol-event-options">
          <label className="ol-event-show-all">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show all events
          </label>
        </div>
      )}
      {pendingReturnId && !busy && (
        <p className="ol-meta" role="status">
          That source is not on a loaded page. Load older or newer events to find it; your
          comparison stays open.
        </p>
      )}
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
          <LoadingIndicator active={detailBusy} label="Loading source detail" />
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
                        <strong>Source {slotIndex + 1}, Unavailable</strong>
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
                          Source {slotIndex + 1}, {detail.acquisitionLabel}
                        </strong>
                        <p className="ol-meta">
                          {detail.sourceLabel}, <EventTime time={detail.time} />
                        </p>
                        {detail.acquisition === 'inspected-document' && (
                          <p className="ol-meta">
                            Written account: you read these words directly; any events or places
                            named inside the text are attributed claims, not a witnessed event.
                          </p>
                        )}
                        {detail.observedLocation && (
                          <p className="ol-meta">
                            <strong>Observed here then:</strong> {detail.observedLocation.label} at{' '}
                            <EventTime time={detail.time} /> (historical observation, not live
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
                        <p className="ol-meta">{!detailBusy && 'Source detail unavailable.'}</p>
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
      {!busy && !error && query && currentQueryPage && (
        <p className="ol-meta" role="status">
          {events.length} {events.length === 1 ? 'match' : 'matches'} for “{query}”
          {scanLimited
            ? '. More history remains to search.'
            : cursor || newerCursor
              ? '. More history remains to search.'
              : '. End of the retained records.'}
        </p>
      )}
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
      {!busy && !error && currentQueryPage && !events.length && (
        <p>
          {query
            ? `No matches in the perceived events searched.${cursor || newerCursor ? ' Continue through history or change your words.' : ''}`
            : 'No retained perceived events match this filter.'}
        </p>
      )}
      <ConversationThread
        conversationKey={`${type}:${query}`}
        visible={visible}
        preserveReading
        liveAnnouncements="off"
        newMessageLabel="New events"
        ariaLabel="Perceived world events"
        openingRevision={openingRevision}
        before={
          <>
            {currentQueryPage && cursor && (
              <Button size="sm" isPending={busy} onPress={() => void load(true)}>
                {query ? 'Search older events' : 'Load older events'}
              </Button>
            )}
          </>
        }
        items={items}
      />
      {currentQueryPage && newerCursor && (
        <Button size="sm" variant="secondary" isPending={busy} onPress={() => void load('newer')}>
          Load newer events
        </Button>
      )}
    </section>
  );
}
