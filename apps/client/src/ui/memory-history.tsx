import { useEffect, useRef, useState } from 'react';
import type { MemoryEntryView, MemoryHistoryPage } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Icon, IconButton } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import { EventTime } from './event-time';
import { ConversationThread } from './conversation';
import './reading.css';

type Result = MemoryHistoryPage | { ok: false; message?: string };
interface Loaded {
  identity: string;
  privacyIdentity: string;
  revision: string;
  entries: MemoryEntryView[];
  next: string | null;
  scanLimited: boolean;
  depth: number;
}
interface Read {
  identity: string;
  privacyIdentity: string;
  revision: string;
  actorId: string;
  owned: boolean;
  query: string;
  thoughts: boolean;
  recent: boolean;
  depth: number;
  cursor?: string;
  append: boolean;
}
const entryKey = (entry: MemoryEntryView) => JSON.stringify([entry.sourceKind, entry.id]);

/** Paged, searchable memory history for the owner or an inspectable NPC. The server reads
 * only eligible memories and matches only the text shown here (docs/limits/memory.md#mh08).
 * A single reader coalesces live refreshes; private results match the current request
 * identity during render, before Effects can start their replacement read. */
export function MemoryHistory({
  actorId,
  owned,
  visible,
  requestScope,
  revision = '',
}: {
  actorId: string;
  owned: boolean;
  visible: boolean;
  requestScope: string;
  revision?: string;
}) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [thoughts, setThoughts] = useState(false);
  const [recent, setRecent] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ identity: string; message: string } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [openingRevision, setOpeningRevision] = useState(0);
  const filtered = !!query || thoughts || recent;
  const exposure = useRef({ visible, generation: 0 });
  if (exposure.current.visible !== visible)
    exposure.current = { visible, generation: exposure.current.generation + 1 };
  const privacyIdentity = JSON.stringify([requestScope, actorId, owned, query, thoughts, recent]);
  const identity = JSON.stringify([privacyIdentity, exposure.current.generation]);
  const searchIdentity = JSON.stringify([actorId, owned, query, thoughts, recent]);
  const current = useRef({
    identity,
    privacyIdentity,
    actorId,
    owned,
    query,
    thoughts,
    recent,
    revision,
    visible,
  });
  current.current = {
    identity,
    privacyIdentity,
    actorId,
    owned,
    query,
    thoughts,
    recent,
    revision,
    visible,
  };
  const result = useRef(loaded);
  result.current = loaded;
  const depth = useRef(1);
  const previousSearch = useRef(searchIdentity);
  const pending = useRef<Read | null>(null);
  const running = useRef(false);
  const alive = useRef(true);
  const isCurrent = (read: Read) =>
    alive.current && current.current.visible && current.current.identity === read.identity;

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (pending.current && alive.current) {
      const read = pending.current;
      pending.current = null;
      if (!isCurrent(read)) continue;
      try {
        let cursor = read.cursor;
        let page: MemoryHistoryPage | null = null;
        let entries: MemoryEntryView[] = [];
        let pages = 0;
        // Renewed authority expires old cursors. Replay the requested depth with
        // current cursors; concurrent appends can shift that older reading range.
        while (pages < read.depth) {
          const answer = await post<Result>(read.owned ? '/api/memories' : '/api/god/memories', {
            actorId: read.actorId,
            ...(cursor ? { cursor } : {}),
            ...(read.query ? { query: read.query } : {}),
            ...(read.thoughts && !read.recent ? { thoughts: true } : {}),
            ...(read.recent ? { recent: true } : {}),
          });
          if (!isCurrent(read)) break;
          if (!answer.ok) throw new Error(answer.message ?? 'Memories are unavailable.');
          page = answer;
          entries = [...page.entries, ...entries];
          pages++;
          if (!page.next) break;
          cursor = page.next;
        }
        if (!page || !isCurrent(read)) continue;
        const previous = result.current;
        const append = read.append && previous?.identity === read.identity;
        if (append) {
          const seen = new Set(previous.entries.map(entryKey));
          entries = [...entries.filter((entry) => !seen.has(entryKey(entry))), ...previous.entries];
        }
        const next: Loaded = {
          identity: read.identity,
          privacyIdentity: read.privacyIdentity,
          revision: append ? previous.revision : read.revision,
          entries,
          next: page.next,
          scanLimited: page.scanLimited,
          depth: append ? previous.depth + pages : pages,
        };
        depth.current = next.depth;
        result.current = next;
        setLoaded(next);
        setError(null);
      } catch (failure) {
        if (isCurrent(read)) {
          // A stale-history refusal can arrive before its public revision. Keep
          // navigation, but require a successful read before showing private text.
          result.current = null;
          setLoaded(null);
          setError({
            identity: read.identity,
            message: failure instanceof Error ? failure.message : String(failure),
          });
        }
      }
    }
    running.current = false;
    if (alive.current) setBusy(false);
  }
  function load(older = false, pages = depth.current) {
    if (!current.current.visible || (older && running.current)) return;
    const previous = result.current;
    pending.current = {
      ...current.current,
      depth: older ? 1 : pages,
      append: older,
      cursor: older && previous?.identity === identity ? (previous.next ?? undefined) : undefined,
    };
    if (older) depth.current++;
    setBusy(true);
    setError(null);
    void drain();
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current = null;
    };
  }, []);
  useEffect(() => {
    if (previousSearch.current !== searchIdentity) {
      previousSearch.current = searchIdentity;
      depth.current = 1;
    }
    if (!visible) {
      pending.current = null;
      return;
    }
    // Ordinary appends refresh only the latest page. Query/older-page reading
    // remains in place; changed authority/privacy instead replaces its identity.
    if (
      result.current?.identity !== identity ||
      (!filtered && depth.current === 1 && result.current.revision !== revision)
    )
      load();
  }, [identity, searchIdentity, revision, visible]);

  // Keep the authorized reader mounted while hidden so its scroll anchor survives.
  // Visibility still fences every completion/read; changed privacy/query authority
  // removes old bodies immediately, including while this panel is hidden.
  const shownPage = loaded?.privacyIdentity === privacyIdentity ? loaded : null;
  const shown = shownPage?.entries ?? [];
  const next = shownPage?.next;
  const scanLimited = shownPage?.scanLimited;
  const message = error?.identity === identity ? error.message : '';
  const staleRecent = shownPage && shownPage.revision !== revision;
  const loading = busy || (!shownPage && !message);
  const moreLabel = recent
    ? 'Older observations'
    : filtered
      ? scanLimited
        ? 'Search older memories'
        : 'More matches'
      : 'Older memories';
  return (
    <div className="ol-memory-history" hidden={!visible}>
      <p className="ol-caption">
        {recent
          ? 'Your character’s recent observations.'
          : owned
            ? 'Your character’s retained memories.'
            : 'Permitted private records for this character.'}{' '}
        {recent
          ? 'These are things your character noticed recently. Details may fade; missing moments remain unknown.'
          : 'Search matches the remembered text shown here.'}
      </p>
      <label className="ol-memory-filter">
        <input
          type="checkbox"
          checked={recent}
          onChange={(event) => setRecent(event.target.checked)}
        />{' '}
        Recent observations
      </label>
      <form
        className="ol-memory-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (composing.current || draft.trim() === query) return;
          setQuery(draft.trim());
        }}
      >
        <div className="ol-search">
          <Icon name="ui.search" size={16} />
          <input
            ref={searchInput}
            type="search"
            aria-label={recent ? 'Search recent observations' : 'Search memories'}
            placeholder={recent ? 'Search recent observations…' : 'Search memories…'}
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
        {!owned && !recent && (
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
        <LoadingIndicator
          active={loading}
          label={recent ? 'Loading observations' : 'Loading memories'}
        />
        {message
          ? 'Reading did not finish.'
          : filtered
            ? recent
              ? `${shown.length} recent observations${scanLimited ? '. Coverage is partial.' : ''}${next ? ' Older observations remain.' : ' End of retained observations.'}`
              : `${shown.length} ${shown.length === 1 ? 'memory' : 'memories'}${query ? ` matching “${query}”` : ''}${
                  scanLimited
                    ? '. This search stopped at its record limit; older memories remain to search.'
                    : next
                      ? '. Older memories remain to search.'
                      : '. End of the retained records.'
                }`
            : shownPage && !next
              ? 'Reached the oldest retained memory.'
              : 'Reading retained history, oldest first.'}
      </p>
      {message && (
        <div className="ol-reading-error">
          <p role="alert">{message}</p>
          <Button size="sm" variant="quiet" isDisabled={busy} onPress={() => load()}>
            Retry reading memories
          </Button>
        </div>
      )}
      <Button
        size="sm"
        isDisabled={busy}
        onPress={() => {
          depth.current = 1;
          setOpeningRevision((value) => value + 1);
          load(false, 1);
        }}
      >
        {recent
          ? staleRecent
            ? 'Observations changed — read latest'
            : 'Refresh observations'
          : staleRecent
            ? filtered
              ? 'Updated memories — search again'
              : 'New memories — read latest'
            : filtered
              ? 'Search latest memories'
              : (shownPage?.depth ?? 1) > 1
                ? 'Return to recent memories'
                : 'Refresh memories'}
      </Button>
      <ConversationThread
        conversationKey={searchIdentity}
        visible={visible}
        preserveReading
        openingRevision={openingRevision}
        liveAnnouncements="off"
        ariaLabel={
          recent
            ? 'Recent observations'
            : owned
              ? 'Your retained memories'
              : 'Character memory records'
        }
        newMessageLabel={recent ? 'New observations' : 'New memories'}
        before={
          !!next && (
            <Button size="sm" isPending={busy} onPress={() => load(true)}>
              {moreLabel}
            </Button>
          )
        }
        items={shown.map((entry) => ({
          id: entryKey(entry),
          content: (
            <article className="ol-memory">
              <EventTime time={entry.time} />
              <span>{entry.text}</span>
            </article>
          ),
        }))}
        empty={
          !loading &&
          !message && (
            <p className="ol-meta">
              {recent
                ? `No matching retained observations.${next ? ' Continue with older observations.' : ''}`
                : filtered
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
