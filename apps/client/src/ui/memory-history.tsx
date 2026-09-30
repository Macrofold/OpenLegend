import { useEffect, useRef, useState } from 'react';
import type { MemoryEntryView, MemoryHistoryPage } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon, IconButton } from '../design-system/components';
import { EventTime } from './event-time';

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
}: {
  actorId: string;
  owned: boolean;
  recent?: MemoryEntryView[];
}) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [thoughts, setThoughts] = useState(false);
  const [loaded, setLoaded] = useState<MemoryEntryView[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [scanLimited, setScanLimited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [staleRecent, setStaleRecent] = useState(false);
  const request = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const baseline = useRef(recent);
  // The newest snapshot, so a load that finishes after it arrived can offer a refresh.
  const latest = useRef(recent);
  latest.current = recent;
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
    setBusy(true);
    setError('');
    try {
      let result = await page(older ? (next ?? undefined) : undefined);
      let entries = result.entries;
      if (!older && !filtered && recent) {
        baseline.current = recent;
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
      if (!filtered && baseline.current && latest.current !== baseline.current)
        setStaleRecent(true);
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
    setStaleRecent(false);
    setError('');
    if (filtered || !recent) void load(false);
    else cancel();
  }, [query, thoughts]);
  useEffect(() => {
    if (loaded !== null && !filtered && recent !== baseline.current) setStaleRecent(true);
  }, [recent]);

  const shown = loaded ?? (filtered ? [] : (recent ?? []));
  const moreLabel = filtered
    ? scanLimited
      ? 'Search older memories'
      : 'More matches'
    : 'Older memories';
  return (
    <div className="ol-memory-history">
      <form
        className="ol-memory-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
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
          : filtered
            ? `${shown.length} ${shown.length === 1 ? 'memory' : 'memories'}${query ? ` matching “${query}”` : ''}${
                scanLimited ? '. No more matches among the last 2,000 memories searched.' : ''
              }`
            : loaded !== null && !next
              ? 'Reached the oldest retained memory.'
              : ''}
      </p>
      {error && <p role="alert">{error}</p>}
      {staleRecent && (
        <Button
          size="sm"
          onPress={() => {
            cancel();
            setLoaded(null);
            setNext(null);
            setStaleRecent(false);
            baseline.current = recent;
          }}
        >
          New memories — refresh
        </Button>
      )}
      {(filtered ? !!next : loaded === null ? !!recent?.length : !!next) && (
        <Button size="sm" isPending={busy} onPress={() => void load(loaded !== null)}>
          {moreLabel}
        </Button>
      )}
      {shown.length
        ? shown.map((entry) => (
            <div className="ol-memory" key={entry.id}>
              <EventTime time={entry.time} />
              <span>{entry.text}</span>
            </div>
          ))
        : !busy &&
          !error && (
            <p className="ol-meta">
              {filtered
                ? 'No memories match.'
                : owned
                  ? 'Your experiences will leave memories here.'
                  : 'This character has no retained memories yet.'}
            </p>
          )}
    </div>
  );
}
