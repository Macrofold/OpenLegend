import { useEffect, useRef, useState } from 'react';
import type {
  ActionOption,
  ApiResult,
  KnownPlaceInspection,
  KnownPlacesPage,
  KnownPlaceView,
} from '@open-legend/protocol';
import type { WorldPoint } from '@open-legend/spatial';
import { post } from '../api';
import { Button, EmptyState, Icon, IconButton } from '../design-system/components';
import { EventTime } from './event-time';

type Result<T> = T | { ok: false; message?: string };
const reference = (place: KnownPlaceView) => ({
  id: place.id,
  sourceId: place.sourceId,
  revision: place.revision,
});

/** Last-known evidence remains separate from live object inspection and admitted movement. */
export function KnownPlaces({
  revision,
  focus,
  command,
}: {
  revision: string;
  focus(point: WorldPoint): void;
  command(action: ActionOption): Promise<ApiResult>;
}) {
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState('');
  const [page, setPage] = useState<KnownPlacesPage>(),
    [entries, setEntries] = useState<KnownPlaceView[]>([]);
  const [inspection, setInspection] = useState<KnownPlaceInspection>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [newer, setNewer] = useState(false);
  const request = useRef(0),
    detailRequest = useRef(0),
    searchInput = useRef<HTMLInputElement>(null);
  const baseline = useRef(revision);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (inspection) detailHeading.current?.focus();
  }, [inspection?.place.sourceId]);

  async function load(more = false) {
    const id = ++request.current;
    setBusy(true);
    setError('');
    try {
      const result = await post<Result<KnownPlacesPage>>('/api/known-places', {
        query,
        ...(more && page?.next ? { cursor: page.next } : {}),
      });
      if (id !== request.current) return;
      if (!result.ok) throw new Error(result.message ?? 'Known places are unavailable.');
      setPage(result);
      setEntries((old) =>
        more
          ? [
              ...old.filter((place) => !result.entries.some((next) => next.id === place.id)),
              ...result.entries,
            ]
          : result.entries,
      );
      setNewer(false);
      baseline.current = revision;
    } catch (failure) {
      if (id === request.current)
        setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    setPage(undefined);
    setEntries([]);
    setInspection(undefined);
    setMessage('');
    detailRequest.current++;
    void load();
    return () => {
      request.current++;
      detailRequest.current++;
    };
  }, [query]);
  useEffect(() => {
    if (baseline.current !== revision) setNewer(true);
  }, [revision]);

  async function inspect(place: KnownPlaceView) {
    const id = ++detailRequest.current;
    setInspection(undefined);
    setError('');
    setMessage('Loading the remembered observation…');
    try {
      const result = await post<Result<KnownPlaceInspection>>(
        '/api/known-places/inspect',
        reference(place),
      );
      if (id !== detailRequest.current) return;
      if (!result.ok) throw new Error(result.message ?? 'This observation is unavailable.');
      setInspection(result);
      setMessage('');
    } catch (failure) {
      if (id === detailRequest.current) {
        setMessage('');
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    }
  }
  async function move(selected: KnownPlaceInspection) {
    const id = ++detailRequest.current;
    // The pending button becomes disabled; keep keyboard focus in the remembered
    // place rather than handing its key events back to the world.
    detailHeading.current?.focus({ preventScroll: true });
    setBusy(true);
    setError('');
    try {
      const result = await command(selected.move);
      if (id !== detailRequest.current) return;
      setMessage(
        result.ok
          ? 'Movement requested. Your current activity shows progress or a route failure.'
          : result.message,
      );
      if (!result.ok)
        setInspection({
          ...selected,
          move: { ...selected.move, enabled: false, reason: result.message },
        });
    } catch (failure) {
      if (id === detailRequest.current)
        setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === detailRequest.current) setBusy(false);
    }
  }

  return (
    <div className="ol-known-places">
      <p className="ol-caption">
        Places you observed, with their last-known locations. Conditions may have changed.
      </p>
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
            aria-label="Search known places"
            placeholder="Search known places…"
            value={draft}
            maxLength={200}
            onChange={(event) => setDraft(event.target.value)}
          />
          {draft && (
            <IconButton
              icon="ui.close"
              label="Clear place search"
              onPress={() => {
                setDraft('');
                setQuery('');
                searchInput.current?.focus();
              }}
            />
          )}
        </div>
        <Button size="sm" type="submit" isDisabled={busy}>
          Search
        </Button>
      </form>
      <Button
        size="sm"
        variant="quiet"
        isDisabled={busy}
        onPress={() => {
          detailRequest.current++;
          setInspection(undefined);
          setMessage('');
          void load();
        }}
      >
        {newer ? 'New or updated observations — refresh' : 'Refresh known places'}
      </Button>
      <p className="ol-meta" role="status">
        {busy ? 'Loading known places…' : message}
      </p>
      {error && <p role="alert">{error}</p>}
      {!busy && page && !entries.length && (
        <EmptyState title={query ? 'No matching known places.' : 'No places learned yet.'}>
          {page.next
            ? 'More remembered places remain to search.'
            : query
              ? 'Try another name or clear the search.'
              : 'Explore and notice a useful place to remember it here.'}
        </EmptyState>
      )}
      <ul className="ol-known-place-list">
        {entries.map((place) => (
          <li key={place.id}>
            <strong>{place.label}</strong>
            <p className="ol-caption">{place.description}</p>
            <p className="ol-caption">
              {place.locationLabel} · {place.position.x.toFixed(1)}, {place.position.y.toFixed(1)},{' '}
              {place.position.z.toFixed(1)} m · Last observed <EventTime time={place.time} />
            </p>
            {place.corrected && <p className="ol-caption">Observation corrected</p>}
            <Button
              size="sm"
              variant="quiet"
              isDisabled={busy}
              onPress={() => void inspect(place)}
              aria-label={`Inspect ${place.label}`}
            >
              Inspect
            </Button>
          </li>
        ))}
      </ul>
      {page?.next && (
        <Button size="sm" variant="quiet" isDisabled={busy} onPress={() => void load(true)}>
          {page.scanLimited ? 'Search more known places' : 'More known places'}
        </Button>
      )}
      {inspection && (
        <section
          className="ol-known-place-detail"
          aria-label={`Remembered place: ${inspection.place.label}`}
        >
          <h3 ref={detailHeading} tabIndex={-1} className="ol-heading">
            {inspection.place.label}
          </h3>
          <p>{inspection.place.description}</p>
          <p className="ol-caption">
            Last observed location: {inspection.place.locationLabel},{' '}
            {inspection.place.position.x.toFixed(1)}, {inspection.place.position.y.toFixed(1)},{' '}
            {inspection.place.position.z.toFixed(1)} m. <EventTime time={inspection.place.time} />
          </p>
          <Button size="sm" variant="quiet" onPress={() => focus(inspection.place.position)}>
            Focus last-known location
          </Button>
          <p className="ol-caption">
            Focus changes the camera. It leaves your character where they are.
          </p>
          <p>{inspection.moveDescription}</p>
          <Button
            size="sm"
            isDisabled={busy || !inspection.move.enabled}
            onPress={() => void move(inspection)}
          >
            {inspection.move.label}
          </Button>
          {inspection.move.reason && <p className="ol-caption">{inspection.move.reason}</p>}
          <Button
            size="sm"
            variant="quiet"
            isDisabled={busy}
            onPress={() => void inspect(inspection.place)}
          >
            Recheck movement
          </Button>
        </section>
      )}
    </div>
  );
}
