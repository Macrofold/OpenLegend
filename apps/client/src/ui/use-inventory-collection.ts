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
}: {
  initialId: string;
  scope: string;
  revisionKey: string;
  visible: boolean;
  connected: boolean;
}) {
  const [location, setLocation] = useState({
    id: initialId,
    cursor: undefined as string | undefined,
  });
  const [query, setQueryValue] = useState('');
  const [refreshNumber, setRefreshNumber] = useState(0);
  const available = visible && connected && !!location.id;
  const [availability, setAvailability] = useState({ available, revision: 0 });
  if (availability.available !== available)
    setAvailability({ available, revision: availability.revision + 1 });
  const key = JSON.stringify([
    scope,
    location,
    query,
    revisionKey,
    refreshNumber,
    availability.revision,
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
          { containerId: location.id, cursor: location.cursor, query },
          controller.signal,
        )
          .then((page) => {
            if (controller.signal.aborted) return;
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
    location,
    query,
    page: current?.page,
    error: current?.error,
    loading: available && !current,
    available,
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
      setRefreshNumber((value) => value + 1);
    },
    next() {
      if (current?.page?.next) setLocation((old) => ({ id: old.id, cursor: current.page?.next }));
    },
    first() {
      setLocation((old) => ({ id: old.id, cursor: undefined }));
    },
  };
}

export type InventoryCollectionState = ReturnType<typeof useInventoryCollection>;
