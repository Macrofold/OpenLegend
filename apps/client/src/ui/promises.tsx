import { useEffect, useRef, useState } from 'react';
import type { OwnPromise, OwnPromisePage } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Tag } from '../design-system/components';
import { EventTime } from './event-time';

type Result = OwnPromisePage | { ok: false; message?: string };
const statusLabel: Record<OwnPromise['status'], [string, string]> = {
  open: ['Open', 'neutral'],
  overdue: ['Overdue', 'danger'],
  kept: ['Kept', 'accent'],
  cancelled: ['Cancelled', 'neutral'],
};

function PromiseItem({ promise }: { promise: OwnPromise }) {
  const [label, tone] = statusLabel[promise.status];
  return (
    <article className="ol-promise">
      <p className="ol-promise-words">“{promise.words}”</p>
      <p className="ol-meta">
        {promise.recipient ? `To ${promise.recipient} · ` : ''}
        <EventTime time={promise.madeAt} /> <Tag tone={tone}>{label}</Tag>
      </p>
      <p className="ol-caption">{promise.terms}</p>
      {promise.dueAt !== null && (
        <p className="ol-caption">
          Due <EventTime time={promise.dueAt} />
        </p>
      )}
      {promise.evidence && (
        <p className="ol-caption">
          {promise.evidence}
          {promise.keptAt !== null && (
            <>
              {' '}
              <EventTime time={promise.keptAt} />
            </>
          )}
        </p>
      )}
    </article>
  );
}

/** Read-only list of the player's own spoken promises: exact words, what the world checks
 * and what happened. Changing or cancelling promises is not offered (open decision D64).
 * docs/projects/readable-promises-feature-spec.md */
export function Promises({ visible = true, revision }: { visible?: boolean; revision?: string }) {
  const [page, setPage] = useState<OwnPromisePage | null>(null);
  const [past, setPast] = useState<OwnPromise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const loadedRevision = useRef(revision);
  const failedCursor = useRef<string | undefined>(undefined);
  async function load(cursor?: string) {
    const id = ++request.current;
    const atRevision = revision;
    failedCursor.current = cursor;
    setBusy(true);
    setError('');
    try {
      const result = await post<Result>('/api/commitments', cursor ? { cursor } : {});
      if (id !== request.current) return;
      if (!result.ok) throw new Error(result.message ?? 'Promises are unavailable.');
      if (!cursor) loadedRevision.current = atRevision;
      setPast((current) => (cursor ? [...current, ...result.past] : result.past));
      setPage((current) => (cursor && current ? { ...current, next: result.next } : result));
    } catch (failure) {
      if (id === request.current)
        setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (visible && !page) void load();
    if (!visible) setBusy(false);
    return () => {
      request.current++;
    };
  }, [visible]);
  const full = !!page && page.counted >= page.openLimit;
  const unlisted = page ? page.counted - page.open.length : 0;
  return (
    <div className="ol-promises" aria-busy={busy}>
      <p className="ol-caption">Your spoken words, their terms and the recorded outcome.</p>
      <p className="ol-meta" role="status">
        {busy && !page
          ? 'Loading promises…'
          : page
            ? `${
                unlisted > 0
                  ? `${page.open.length} open, plus ${unlisted} unlisted ${unlisted === 1 ? 'commitment' : 'commitments'} counted toward the limit of ${page.openLimit}.`
                  : `${page.open.length} of ${page.openLimit} open.`
              }${
                !full
                  ? ''
                  : unlisted > 0
                    ? ' New promises are not recorded while all of these stay unresolved.'
                    : ' New promises are not recorded until one is kept.'
              }`
            : ''}
      </p>
      {error && (
        <div className="ol-reading-error">
          <p role="alert">{error}</p>
          <Button
            size="sm"
            variant="quiet"
            isDisabled={busy}
            onPress={() => void load(failedCursor.current)}
          >
            Retry reading promises
          </Button>
        </div>
      )}
      {!!page?.open.length && <h4 className="ol-heading">Unresolved</h4>}
      {page?.open.map((promise) => (
        <PromiseItem key={promise.id} promise={promise} />
      ))}
      {!!past.length && <h4 className="ol-heading">Earlier promises</h4>}
      {past.map((promise) => (
        <PromiseItem key={promise.id} promise={promise} />
      ))}
      {page && !page.counted && !page.open.length && !past.length && (
        <p className="ol-meta">You have not made a promise yet.</p>
      )}
      {page?.partial && (
        <p className="ol-caption">Only recent kept or cancelled promises can be listed here.</p>
      )}
      <div className="ol-actions">
        {page?.next && (
          <Button size="sm" isPending={busy} onPress={() => void load(page.next!)}>
            Show earlier promises
          </Button>
        )}
        <Button size="sm" variant="quiet" isPending={busy} onPress={() => void load()}>
          {page && loadedRevision.current !== revision
            ? 'Check for updated promises'
            : 'Refresh promises'}
        </Button>
      </div>
      <details>
        <summary>About this record</summary>
        <p className="ol-caption">
          Each promise shows the terms this world recorded and any evidence of its outcome. This is
          a record of your promises; reading it does not change or cancel them.
        </p>
      </details>
    </div>
  );
}
