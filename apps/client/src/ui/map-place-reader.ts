import type { ApiResult, KnownPlaceView, KnownPlacesPage } from '@open-legend/protocol';
import { post } from '../api';

type PlacesRead = { places: KnownPlaceView[]; loading: boolean; error: string; revision?: string };
type PlacesReader = {
  snapshot(): PlacesRead;
  subscribe(listener: () => void): () => void;
  load(revision: string, refresh?: boolean): void;
};
const placeReaders = new Map<string, PlacesReader>();

/** Full map and minimap share one prepared evidence read per private owner. Only
 * committed place changes refresh it; an active chain finishes before one trailing
 * refresh adopts the latest token. No live place bodies are joined. */
export function mapPlaceReader(scope: string): PlacesReader {
  const previous = placeReaders.get(scope);
  if (previous) return previous;
  let read: PlacesRead = { places: [], loading: false, error: '' };
  let active = true;
  let request: AbortController | undefined;
  let wantedRevision: string | undefined;
  let attemptedRevision: string | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: PlacesRead) => {
    if (!active) return;
    read = next;
    for (const listener of listeners) listener();
  };
  const reader: PlacesReader = {
    snapshot: () => read,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        queueMicrotask(() => {
          if (listeners.size || placeReaders.get(scope) !== reader) return;
          active = false;
          request?.abort();
          placeReaders.delete(scope);
        });
      };
    },
    load(revision, refresh = false) {
      if (!active) return;
      wantedRevision = revision;
      if (read.loading || (!refresh && attemptedRevision === revision)) return;
      attemptedRevision = revision;
      const abort = new AbortController();
      request = abort;
      publish({ ...read, loading: true, error: '' });
      void (async () => {
        let cursor: string | null = null;
        const found = new Map<string, KnownPlaceView>();
        do {
          const page: KnownPlacesPage | ApiResult = await post(
            '/api/known-places',
            cursor ? { cursor } : {},
            abort.signal,
          );
          if (!page.ok || !('entries' in page))
            throw new Error(page.message ?? 'Known places are unavailable.');
          for (const place of page.entries) if (!found.has(place.id)) found.set(place.id, place);
          cursor = page.next;
        } while (cursor && !abort.signal.aborted);
        if (!abort.signal.aborted)
          publish({ places: [...found.values()], loading: false, error: '', revision });
      })()
        .catch((error) => {
          if (!abort.signal.aborted)
            publish({
              ...read,
              loading: false,
              error: error instanceof Error ? error.message : String(error),
            });
        })
        .finally(() => {
          // An unchanged failed read waits for the explicit Refresh action. A new
          // committed token still receives its one coalesced trailing read.
          if (active && !abort.signal.aborted && wantedRevision !== revision)
            queueMicrotask(() => reader.load(wantedRevision!));
        });
    },
  };
  placeReaders.set(scope, reader);
  return reader;
}
