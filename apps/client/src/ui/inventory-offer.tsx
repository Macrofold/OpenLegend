import { LoadingIndicator } from '../design-system/loading';
import { namePhrase } from '@open-legend/language';
import { useEffect, useId, useState } from 'react';
import type {
  InventoryDestination,
  InventoryDestinationPage,
  InventoryTransferSource,
} from '@open-legend/protocol';
import { postContactRead, currentContactAvailable } from '../api';
import { Button } from '../design-system/components';

/** Offers ask a person for consent. Ordinary moves never enter this recipient list. */
export function InventoryOffer({
  source,
  scope,
  active,
  existingTrades,
  canOpenExisting,
  onOffer,
}: {
  source: InventoryTransferSource;
  scope: string;
  active: boolean;
  existingTrades: Array<{ id: string; name: string }>;
  canOpenExisting: boolean;
  onOffer(recipient: Pick<InventoryDestination, 'id'>): void;
}) {
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    page?: InventoryDestinationPage;
    error?: string;
  }>();
  const searchId = useId();
  const context = JSON.stringify([source, scope, query, refresh, active]);
  const [continuation, setContinuation] = useState<{ context: string; cursor?: string }>({
    context,
  });
  if (continuation.context !== context) setContinuation({ context });
  const cursor = continuation.context === context ? continuation.cursor : undefined;
  const setCursor = (value?: string) => setContinuation({ context, cursor: value });
  const key = JSON.stringify([context, cursor]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void postContactRead<InventoryDestinationPage>(
          '/api/inventory/destinations',
          { source, query, cursor },
          [source.containerId, source.itemId],
          controller.signal,
        )
          .then((page) => {
            if (!controller.signal.aborted)
              setResult({
                key,
                ...(page.ok && page.scope === scope
                  ? { page }
                  : { error: page.message ?? 'Recipients are unavailable.' }),
              });
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted)
              setResult({
                key,
                error: error instanceof Error ? error.message : 'Recipients are unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [key, active]);
  const current = result?.key === key && active ? result : undefined;
  const people =
    current?.page?.destinations.filter(
      (entry) => entry.kind === 'recipient' && currentContactAvailable(entry.id),
    ) ?? [];
  const existingIds = new Set(existingTrades.map((person) => person.id));
  const existing = existingTrades.filter((person) =>
    person.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <section className="ol-inventory-offer" aria-label="Choose a recipient">
      <p>Choose a person to open Trade.</p>
      <label htmlFor={searchId}>Find a person</label>
      <input
        id={searchId}
        maxLength={160}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(undefined);
        }}
      />
      <LoadingIndicator active={active && !current} label="Finding recipients" />
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.page?.message && <p role="status">{current.page.message}</p>}
      <ul>
        {existing.map((person) => (
          <li key={person.id}>
            <Button disabled={!canOpenExisting} onPress={() => onOffer(person)}>
              Trade with {person.name}
            </Button>
          </li>
        ))}
        {people
          .filter((person) => !existingIds.has(person.id))
          .map((person) => (
            <li key={person.id}>
              <Button
                disabled={
                  !active || person.fit === 'blocked' || current?.page?.status === 'unavailable'
                }
                onPress={() => onOffer(person)}
              >
                Trade with {namePhrase(person, 'definite')}
              </Button>
              {person.reason && <p className="ol-caption">{person.reason}</p>}
            </li>
          ))}
      </ul>
      {current?.page && !people.length && !existing.length && (
        <p>
          {current.page.next
            ? 'No recipient in this part of the search. More results remain.'
            : 'No available recipient matches this search.'}
        </p>
      )}
      <div className="ol-actions">
        {current?.page?.next && (
          <Button size="sm" onPress={() => setCursor(current.page?.next)}>
            More recipients
          </Button>
        )}
        {cursor && (
          <Button size="sm" onPress={() => setCursor(undefined)}>
            First recipients
          </Button>
        )}
        <Button
          size="sm"
          variant="quiet"
          disabled={!active}
          onPress={() => setRefresh((value) => value + 1)}
        >
          Refresh recipients
        </Button>
      </div>
    </section>
  );
}
