import { useEffect, useRef, useState } from 'react';
import type { CognitionLabPage } from '@open-legend/protocol';
import { LabResponseError, labMessage } from './api';

interface ReadState<T> {
  key: string;
  value?: T;
  error?: string;
  pending: boolean;
  paging?: boolean;
  updatesAvailable?: boolean;
}

/** Same-view publications coalesce behind its current read. Cancelling on every
 * tick would starve reads slower than native publication; identity changes still
 * abort immediately and cannot paint the previous person's private values. */
function useLabRequest<T>(
  key: string | undefined,
  load: (cursor: string | undefined, signal: AbortSignal) => Promise<T>,
  merge: (previous: T | undefined, value: T, cursor: string | undefined) => T,
  refresh: number,
  delayMs: number,
) {
  const loader = useRef(load);
  loader.current = load;
  const merger = useRef(merge);
  merger.current = merge;
  const revision = useRef(refresh);
  revision.current = refresh;
  const owner = useRef<
    | {
        key: string;
        refresh: number;
        invalidate(): void;
        more(cursor: string): void;
        refreshPage(): void;
      }
    | undefined
  >(undefined);
  const [state, setState] = useState<ReadState<T>>({ key: '', pending: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let reading = false;
    let readingCursor: string | undefined;
    let queuedCursor: string | undefined;
    let windowed = false;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState((previous) => ({
      key,
      value: previous.key === key ? previous.value : undefined,
      pending: true,
    }));
    const read = (cursor?: string) => {
      if (controller.signal.aborted) return;
      reading = true;
      readingCursor = cursor;
      setState((previous) => ({
        key,
        value: previous.key === key ? previous.value : undefined,
        pending: true,
        paging: cursor !== undefined,
        updatesAvailable: previous.key === key && previous.updatesAvailable,
      }));
      void Promise.resolve()
        .then(() => loader.current(cursor, controller.signal))
        .then(
          (value) => {
            if (!controller.signal.aborted)
              setState((previous) =>
                // More captured its cursor from the visible window. A first-page
                // refresh already in flight cannot replace that cursor's prefix.
                windowed &&
                cursor === undefined &&
                previous.key === key &&
                previous.value !== undefined
                  ? { ...previous, pending: false, updatesAvailable: true }
                  : {
                      key,
                      value: merger.current(
                        previous.key === key ? previous.value : undefined,
                        value,
                        cursor,
                      ),
                      pending: false,
                      updatesAvailable: previous.key === key && previous.updatesAvailable,
                    },
              );
          },
          (error: unknown) => {
            if (!controller.signal.aborted)
              setState((previous) => ({
                key,
                // Missing can conceal a protected source. A known refusal must
                // remove its old body even before the changes reader catches up.
                value:
                  error instanceof LabResponseError && [401, 403, 404, 410].includes(error.status)
                    ? undefined
                    : previous.key === key
                      ? previous.value
                      : undefined,
                pending: false,
                error: labMessage(error),
                updatesAvailable: previous.key === key && previous.updatesAvailable,
              }));
          },
        )
        .finally(() => {
          reading = false;
          readingCursor = undefined;
          if (controller.signal.aborted) return;
          if (queuedCursor !== undefined) {
            const cursor = queuedCursor;
            queuedCursor = undefined;
            read(cursor);
          } else if (again) {
            again = false;
            read();
          }
        });
    };
    const current = {
      key,
      refresh: revision.current,
      invalidate() {
        if (windowed) {
          setState((previous) =>
            previous.updatesAvailable ? previous : { ...previous, updatesAvailable: true },
          );
          return;
        }
        if (timer) return;
        if (reading) again = true;
        else read();
      },
      more(cursor: string) {
        if (readingCursor !== undefined || queuedCursor !== undefined) return;
        // Paging is deliberate historical reading. Publications announce updates
        // instead of silently replacing its older window with the first page.
        windowed = true;
        again = false;
        if (reading || timer) {
          queuedCursor = cursor;
          setState((previous) => ({ ...previous, paging: true }));
        } else read(cursor);
      },
      refreshPage() {
        windowed = false;
        queuedCursor = undefined;
        setState((previous) => ({ ...previous, updatesAvailable: false }));
        if (timer) return;
        if (reading) again = true;
        else read();
      },
    };
    owner.current = current;
    if (delayMs)
      timer = setTimeout(() => {
        timer = undefined;
        read();
      }, delayMs);
    else read();
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (owner.current === current) owner.current = undefined;
    };
  }, [key, delayMs]);
  useEffect(() => {
    const current = owner.current;
    if (current && current.key === key && current.refresh !== refresh) {
      current.refresh = refresh;
      current.invalidate();
    }
  }, [key, refresh]);
  return {
    ...(state.key === key
      ? state
      : { key: key ?? '', pending: !!key, value: undefined, error: undefined }),
    more(cursor: string) {
      const current = owner.current;
      if (current && current.key === key) current.more(cursor);
    },
    refreshPage() {
      const current = owner.current;
      if (current && current.key === key) current.refreshPage();
    },
  };
}

export function useLabRead<T>(
  key: string | undefined,
  load: (signal: AbortSignal) => Promise<T>,
  refresh = 0,
  delayMs = 0,
) {
  return useLabRequest(
    key,
    (_, signal) => load(signal),
    (_, value) => value,
    refresh,
    delayMs,
  );
}

/** Search and paging share one cancellable request; no per-row discovery calls. */
export function useLabPage<T extends { id: string }>(
  key: string | undefined,
  load: (cursor: string | undefined, signal: AbortSignal) => Promise<CognitionLabPage<T>>,
  refresh = 0,
  delayMs = 0,
) {
  const state = useLabRequest(
    key,
    load,
    (previous, page, cursor) => {
      const items = cursor ? (previous?.items ?? []) : [];
      const known = new Set(items.map((item) => item.id));
      return { ...page, items: [...items, ...page.items.filter((item) => !known.has(item.id))] };
    },
    refresh,
    delayMs,
  );
  return {
    ...state,
    loadMore() {
      if (state.value?.nextCursor && !state.paging) state.more(state.value.nextCursor);
    },
  };
}
