import { useEffect, useId, useState } from 'react';
import type {
  InventoryDestination,
  InventoryDestinationPage,
  InventoryTransferSource,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button } from '../design-system/components';

/** Offers ask a person for consent. Ordinary moves never enter this recipient list. */
export function InventoryOffer({
  source,
  scope,
  active,
  onOffer,
}: {
  source: InventoryTransferSource;
  scope: string;
  active: boolean;
  onOffer(recipient: InventoryDestination): void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    page?: InventoryDestinationPage;
    error?: string;
  }>();
  const searchId = useId();
  const key = JSON.stringify([source, scope, query, cursor, refresh, active]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void post<InventoryDestinationPage>(
          '/api/inventory/destinations',
          { source, query, cursor },
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
  const people = current?.page?.destinations.filter((entry) => entry.kind === 'recipient') ?? [];
  return (
    <section className="ol-inventory-offer" aria-label="Offer to a person">
      <p>
        Choose a person to offer these items. They keep their possessions; nothing changes hands
        until they accept.
      </p>
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
      {active && !current && <p role="status">Finding recipients…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.page?.message && <p role="status">{current.page.message}</p>}
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            <Button
              disabled={
                !active || person.fit === 'blocked' || current?.page?.status === 'unavailable'
              }
              onPress={() => onOffer(person)}
            >
              Offer to {person.name}
            </Button>
            {person.reason && <p className="ol-caption">{person.reason}</p>}
          </li>
        ))}
      </ul>
      {current?.page && !people.length && (
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
