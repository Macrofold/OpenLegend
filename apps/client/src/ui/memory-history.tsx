import { useEffect, useRef, useState } from 'react';
import type { MemoryEntryView, MemoryHistoryPage } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon, IconButton } from '../design-system/components';
import { EventTime } from './event-time';
import { ConversationThread } from './conversation';
import './reading.css';

type Result = MemoryHistoryPage | { ok: false; message?: string };

/** Paged, searchable memory history for the owner or an inspectable NPC. The server reads
 * only eligible memories and matches only the text shown here (docs/limits/memory.md#mh08).
 * With `recent`, the live snapshot is shown until the reader asks for older memories; then
 * only history pages are shown, because the snapshot can be newer than them and orders
 * same-time memories differently. */
export function MemoryHistory({
  actorId,
  owned,
  recent,
  visible = true,
}: {
  actorId: string;
  owned: boolean;
  recent?: MemoryEntryView[];
  visible?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [thoughts, setThoughts] = useState(false);
  const [loaded, setLoaded] = useState<MemoryEntryView[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [scanLimited, setScanLimited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState(recent);
  const [openingRevision, setOpeningRevision] = useState(0);
  const request = useRef(0);
  const failedOlder = useRef(false);
  const composing = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const recentRevision = JSON.stringify(recent);
  const baseline = useRef(recentRevision);
  const filtered = !!query || thoughts;
  const path = owned ? '/api/memories' : '/api/god/memories';

  async function page(cursor?: string) {
    const result = await post<Result>(path, {
      actorId,
      ...(cursor ? { cursor } : {}),
      ...(query ? { query } : {}),
      ...(thoughts ? { thoughts } : {}),
    });
    if (!result.ok) throw new Error(result.message ?? 'Memories are unavailable.');
    return result;
  }
  /** Loads the first page, or the next older page. Leaving the live snapshot loads two
   * pages, so the first press reaches memories older than the snapshot. */
  /** Ignores any page still loading. */
  function cancel() {
    request.current++;
    setBusy(false);
  }
  async function load(older: boolean) {
    const id = ++request.current;
    const atRevision = recentRevision;
    failedOlder.current = older;
    setBusy(true);
    setError('');
    try {
      let result = await page(older ? (next ?? undefined) : undefined);
      if (id !== request.current) return;
      let entries = result.entries;
      if (!older && !filtered && recent) {
        if (result.next) {
          result = await page(result.next);
          entries = [...result.entries, ...entries];
        }
      }
      if (id !== request.current) return;
      setLoaded((current) => {
        if (!older || !current) return entries;
        const seen = new Set(current.map((entry) => entry.id));
        return [...entries.filter((entry) => !seen.has(entry.id)), ...current];
      });
      setNext(result.next);
      setScanLimited(result.scanLimited);
      if (!older) {
        baseline.current = atRevision;
        // The first Older press replaces the live window with two history pages.
        // Its newest row is unchanged, so the shared reader preserves the visible anchor.
        if (filtered || !recent || loaded !== null) setOpeningRevision((value) => value + 1);
      }
    } catch (failure) {
      if (id === request.current)
        setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  // A new search or filter starts from the newest matches; plain inspection loads its own
  // first page when there is no live snapshot.
  useEffect(() => {
    setLoaded(null);
    setNext(null);
    setScanLimited(false);
    setError('');
    if (filtered || !recent) void load(false);
    else {
      cancel();
      setSnapshot(recent);
      baseline.current = recentRevision;
      setOpeningRevision((value) => value + 1);
    }
    return () => {
      request.current++;
    };
  }, [query, thoughts]);

  const shown = loaded ?? (filtered ? [] : (snapshot ?? []));
  const staleRecent = recentRevision !== baseline.current;
  const moreLabel = filtered
    ? scanLimited
      ? 'Search older memories'
      : 'More matches'
    : 'Older memories';
  return (
    <div className="ol-memory-history">
      <p className="ol-caption">
        {owned
          ? 'Your character’s retained memories.'
          : 'Permitted private records for this character.'}{' '}
        Search matches the remembered text shown here.
      </p>
      <form
        className="ol-memory-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (composing.current) return;
          if (draft.trim() === query) return;
          setLoaded(null);
          setNext(null);
          setError('');
          setQuery(draft.trim());
        }}
      >
        <div className="ol-search">
          <Icon name="ui.search" size={16} />
          <input
            ref={searchInput}
            type="search"
            aria-label="Search memories"
            placeholder="Search memories…"
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
              label="Clear memory search"
              onPress={() => {
                setDraft('');
                setQuery('');
                searchInput.current?.focus();
              }}
            />
          )}
        </div>
        <Button size="sm" type="submit" isPending={busy}>
          Search
        </Button>
        {!owned && (
          <label className="ol-memory-filter">
            <input
              type="checkbox"
              checked={thoughts}
              onChange={(event) => setThoughts(event.target.checked)}
            />{' '}
            Private thoughts only
          </label>
        )}
      </form>
      <p className="ol-meta" role="status">
        {busy
          ? 'Loading memories…'
          : error
            ? 'Reading did not finish. Any entries already loaded are kept below.'
            : filtered
              ? loaded === null
                ? 'Searching memories…'
                : `${shown.length} ${shown.length === 1 ? 'memory' : 'memories'}${query ? ` matching “${query}”` : ''}${
                    scanLimited
                      ? '. This search stopped at its record limit; older memories remain to search.'
                      : next
                        ? '. Older memories remain to search.'
                        : '. End of the retained records.'
                  }`
              : loaded !== null && !next
                ? 'Reached the oldest retained memory.'
                : loaded !== null
                  ? 'Reading retained history, oldest first.'
                  : 'Recent retained memories, oldest first.'}
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
            Retry reading memories
          </Button>
        </div>
      )}
      <Button
        size="sm"
        isDisabled={busy}
        onPress={() => {
          cancel();
          setError('');
          if (!filtered && recent) {
            setLoaded(null);
            setNext(null);
            setSnapshot(recent);
            baseline.current = recentRevision;
            setOpeningRevision((value) => value + 1);
          } else void load(false);
        }}
      >
        {staleRecent
          ? filtered
            ? 'Updated memories — search again'
            : 'New memories — read latest'
          : filtered
            ? 'Search latest memories'
            : loaded !== null
              ? 'Return to recent memories'
              : 'Refresh memories'}
      </Button>
      <ConversationThread
        conversationKey={`${actorId}:${owned}:${query}:${thoughts}`}
        visible={visible}
        preserveReading
        openingRevision={openingRevision}
        liveAnnouncements="off"
        ariaLabel={owned ? 'Your retained memories' : 'Character memory records'}
        newMessageLabel="New memories"
        before={
          (filtered ? !!next : loaded === null ? !!snapshot?.length : !!next) && (
            <Button size="sm" isPending={busy} onPress={() => void load(loaded !== null)}>
              {moreLabel}
            </Button>
          )
        }
        items={shown.map((entry) => ({
          id: entry.id,
          content: (
            <article className="ol-memory">
              <EventTime time={entry.time} />
              <span>{entry.text}</span>
            </article>
          ),
        }))}
        empty={
          !busy &&
          (!filtered || loaded !== null) &&
          !error && (
            <p className="ol-meta">
              {filtered
                ? `No matches in the memories searched.${next ? ' Continue with older memories or change your search.' : ''}`
                : owned
                  ? 'Your experiences will leave memories here.'
                  : 'This character has no retained memories yet.'}
            </p>
          )
        }
      />
    </div>
  );
}
