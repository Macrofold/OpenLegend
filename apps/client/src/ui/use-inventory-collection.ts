import { useEffect, useState } from 'react';
import type { ContainerPage } from '@open-legend/protocol';
import { post } from '../api';

/** One visible collection owns one bounded native page. The other side never shares its
 * query, location or continuation. Reopening requires a fresh permitted read. */
export function useInventoryCollection({
  initialId,
  scope,
  revisionKey,
  visible,
  connected,
  expectedRootId,
  blockedReason,
}: {
  initialId: string;
  scope: string;
  revisionKey: string;
  visible: boolean;
  connected: boolean;
  expectedRootId: string;
  blockedReason?: string;
}) {
  const [location, setLocation] = useState<{ id: string; cursor?: string; context?: string }>({
    id: initialId,
  });
  const [query, setQueryValue] = useState('');
  const [refreshNumber, setRefreshNumber] = useState(0);
  const available = visible && connected && !!location.id && !blockedReason;
  const [availability, setAvailability] = useState({ available, revision: 0 });
  if (availability.available !== available)
    setAvailability({ available, revision: availability.revision + 1 });
  const paginationContext = JSON.stringify([scope, revisionKey, availability.revision]);
  const cursor = location.context === paginationContext ? location.cursor : undefined;
  const key = JSON.stringify([
    scope,
    location.id,
    cursor,
    query,
    revisionKey,
    refreshNumber,
    availability.revision,
    expectedRootId,
  ]);
  const [result, setResult] = useState<{
    key: string;
    page?: ContainerPage;
    error?: string;
  }>();
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        void post<ContainerPage>(
          '/api/inventory',
          { containerId: location.id, cursor, query },
          controller.signal,
        )
          .then((page) => {
            if (controller.signal.aborted) return;
            // An opened bag belongs to this interaction only while it remains under its
            // original carried/world root. A grant to a new custodian is not a reopen.
            if (page.ok && !page.breadcrumbs.some((entry) => entry.id === expectedRootId)) {
              setResult({
                key,
                error: 'This container moved. Open it again from its current location.',
              });
              return;
            }
            setResult({
              key,
              ...(page.ok
                ? { page }
                : { error: page.message ?? 'These contents are unavailable.' }),
            });
          })
          .catch((error: unknown) => {
            if (!controller.signal.aborted)
              setResult({
                key,
                error: error instanceof Error ? error.message : 'These contents are unavailable.',
              });
          });
      },
      query ? 150 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [key, available]);
  const current = available && result?.key === key ? result : undefined;
  return {
    location: { id: location.id, cursor },
    query,
    page: current?.page,
    error: current?.error,
    loading: available && !current,
    available,
    blockedReason,
    notice:
      location.cursor && !cursor ? 'Contents changed. Showing the first page again.' : undefined,
    key,
    navigate(id: string) {
      setLocation({ id, cursor: undefined });
      setQueryValue('');
    },
    search(value: string) {
      setQueryValue(value);
      setLocation((old) => ({ id: old.id, cursor: undefined }));
    },
    refresh() {
      setLocation((old) => ({ id: old.id }));
      setRefreshNumber((value) => value + 1);
    },
    next() {
      if (current?.page?.next)
        setLocation((old) => ({
          id: old.id,
          cursor: current.page?.next,
          context: paginationContext,
        }));
    },
    first() {
      setLocation((old) => ({ id: old.id, cursor: undefined }));
    },
  };
}

export type InventoryCollectionState = ReturnType<typeof useInventoryCollection>;
