import { namePhrase } from '@open-legend/language';
import { useEffect, useId, useRef, useState } from 'react';
import type {
  InventoryDestination,
  InventoryDestinationPage,
  InventoryTransferSource,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button } from '../design-system/components';
import './inventory.css';

/** A source-free picker selects permitted storage for a separate camp task. With an exact
 * source, the same reader returns move/offer previews; selecting still performs no write. */
type DestinationProps = {
  scope: string;
  source?: InventoryTransferSource;
  activity?: { family: string; field: string };
  connected: boolean;
  visible?: boolean;
  onSelect(destination: InventoryDestination): void;
  onCancel(): void;
};
export function InventoryDestinations(props: DestinationProps) {
  return (
    <DestinationWorkspace
      key={JSON.stringify([props.scope, props.source?.itemId, props.activity])}
      {...props}
    />
  );
}
function DestinationWorkspace({
  scope,
  source,
  activity,
  connected,
  visible = true,
  onSelect,
  onCancel,
}: DestinationProps) {
  const [parentId, setParentId] = useState<string>();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const available = visible && connected;
  const [readAvailability, setReadAvailability] = useState({ available, revision: 0 });
  if (readAvailability.available !== available)
    setReadAvailability({ available, revision: readAvailability.revision + 1 });
  const [result, setResult] = useState<{
    key: string;
    base: string;
    page?: InventoryDestinationPage;
    error?: string;
  }>();
  const search = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const collection = useRef<HTMLDivElement>(null);
  const base = JSON.stringify([
    scope,
    source,
    activity,
    parentId,
    query,
    refresh,
    readAvailability.revision,
  ]);
  const key = JSON.stringify([base, cursor]);
  const current = result?.base === base ? result : undefined;
  const loading = current?.key !== key;
  const selectable = visible && connected && !loading && current?.page?.status !== 'unavailable';
  useEffect(() => {
    if (!available) return;
    search.current?.focus();
  }, []);
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void post<InventoryDestinationPage>(
          '/api/inventory/destinations',
          { source, activity, parentId, query, cursor },
          controller.signal,
        )
          .then((page) => {
            if (!controller.signal.aborted)
              setResult((previous) => {
                if (!page.ok || (activity && page.scope !== scope))
                  return { key, base, error: page.message ?? 'Storage is unavailable.' };
                const prior =
                  cursor && previous?.base === base ? (previous.page?.destinations ?? []) : [];
                const entries = new Map(prior.map((entry) => [entry.id, entry]));
                for (const entry of page.destinations) entries.set(entry.id, entry);
                return { key, base, page: { ...page, destinations: [...entries.values()] } };
              });
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted)
              setResult({
                key,
                base,
                error: error instanceof Error ? error.message : 'Storage is unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, available]);
  const open = (id?: string) => {
    setParentId(id);
    setCursor(undefined);
    setQuery('');
    if (collection.current) collection.current.scrollTop = 0;
  };
  const select = (destination: InventoryDestination) => {
    if (selectable && destination.fit !== 'blocked') onSelect(destination);
  };
  const destination = (entry: InventoryDestination, currentContainer = false) => (
    <li key={entry.id} className="ol-inventory-destination">
      <div>
        <strong>{entry.name}</strong>
        <p id={`${searchId}-${entry.id}`} className="ol-caption">
          {entry.location}
          {activity ? ` · Reference: ${entry.id}` : ''}
        </p>
        {entry.capacity !== undefined && (
          <p className="ol-caption">
            Packing load: {entry.load ?? 'Unknown'} / {entry.capacity}
          </p>
        )}
        {entry.reason && <p className="ol-caption">{entry.reason}</p>}
      </div>
      <div className="ol-actions">
        {entry.openable && !currentContainer && (
          <Button
            size="sm"
            variant="quiet"
            aria-describedby={`${searchId}-${entry.id}`}
            disabled={loading || !available}
            onPress={() => open(entry.id)}
          >
            Open {entry.name}
          </Button>
        )}
        <Button
          size="sm"
          aria-describedby={`${searchId}-${entry.id}`}
          disabled={!selectable || entry.fit === 'blocked'}
          onPress={() => select(entry)}
        >
          {entry.kind === 'recipient'
            ? `Choose ${namePhrase(entry, 'definite')} for an offer`
            : `Choose ${namePhrase(entry, 'definite')}`}
        </Button>
      </div>
    </li>
  );
  return (
    <section
      className="ol-inventory-destinations"
      aria-label={source ? 'Choose a transfer destination' : 'Choose a container'}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="ol-inventory-toolbar">
        <h3 className="ol-heading">{source ? 'Choose destination' : 'Choose container'}</h3>
        <Button size="sm" variant="quiet" onPress={onCancel}>
          Cancel
        </Button>
      </div>
      <nav aria-label="Destination container path" className="ol-actions">
        <Button size="sm" variant="quiet" onPress={() => open()}>
          Nearby and carried storage
        </Button>
        {current?.page?.breadcrumbs.map((entry) => (
          <Button key={entry.id} size="sm" variant="quiet" onPress={() => open(entry.id)}>
            {entry.name}
          </Button>
        ))}
      </nav>
      <div className="ol-inventory-search">
        <label htmlFor={searchId}>Search these destinations</label>
        <div>
          <input
            ref={search}
            id={searchId}
            type="text"
            value={query}
            maxLength={160}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(undefined);
            }}
          />
          {query && (
            <Button
              size="sm"
              variant="quiet"
              onPress={() => {
                setQuery('');
                setCursor(undefined);
                search.current?.focus();
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      <div ref={collection} className="ol-inventory-destination-list" aria-busy={loading}>
        {!connected && <p role="status">Reconnect to search permitted storage.</p>}
        {available && loading && <p role="status">Finding permitted storage…</p>}
        {current?.error && <p role="alert">{current.error}</p>}
        {current?.page?.status === 'unavailable' && (
          <p role="status">
            {current.page.message ?? 'Storage discovery is temporarily unavailable.'}
          </p>
        )}
        {current?.page?.message && current.page.status !== 'unavailable' && (
          <p role="status">{current.page.message}</p>
        )}
        {current?.page?.container && <ul>{destination(current.page.container, true)}</ul>}
        {!!current?.page?.destinations.length && (
          <ul>{current.page.destinations.map((entry) => destination(entry))}</ul>
        )}
        {current?.page &&
          current.page.status !== 'unavailable' &&
          !current.page.destinations.length && (
            <p role="status">
              {current.page.next
                ? 'No match in this part of the search. More destinations remain to check.'
                : query
                  ? 'No matching permitted destination. Clear the search to try again.'
                  : 'No other permitted destination in this scope.'}
            </p>
          )}
        {current?.page?.next && (
          <Button
            size="sm"
            variant="quiet"
            disabled={loading}
            onPress={() => setCursor(current.page!.next)}
          >
            Search more destinations
          </Button>
        )}
        {cursor && (
          <Button size="sm" variant="quiet" disabled={loading} onPress={() => setCursor(undefined)}>
            First destinations
          </Button>
        )}
      </div>
      <Button
        size="sm"
        variant="quiet"
        disabled={!connected}
        onPress={() => {
          setCursor(undefined);
          setRefresh((value) => value + 1);
        }}
      >
        Refresh destinations
      </Button>
      {source && (
        <p className="ol-caption">
          Choosing only fills the transfer draft. The server checks access, quantity and space again
          when you move.
        </p>
      )}
    </section>
  );
}
