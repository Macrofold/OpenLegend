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
export function Promises() {
  const [page, setPage] = useState<OwnPromisePage | null>(null);
  const [past, setPast] = useState<OwnPromise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  async function load(cursor?: string) {
    const id = ++request.current;
    setBusy(true);
    setError('');
    try {
      const result = await post<Result>('/api/commitments', cursor ? { cursor } : {});
      if (id !== request.current) return;
      if (!result.ok) throw new Error(result.message ?? 'Promises are unavailable.');
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
    void load();
    return () => {
      request.current++;
    };
  }, []);
  const full = !!page && page.counted >= page.openLimit;
  const unlisted = page ? page.counted - page.open.length : 0;
  return (
    <div className="ol-promises" aria-busy={busy}>
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
      {error && <p role="alert">{error}</p>}
      {page?.open.map((promise) => (
        <PromiseItem key={promise.id} promise={promise} />
      ))}
      {!!past.length && <p className="ol-meta">Earlier promises</p>}
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
          Refresh
        </Button>
      </div>
      <details>
        <summary>What this world tracks</summary>
        <p className="ol-caption">
          Only speech that begins “I promise to …” is recorded as a promise. Only “I promise to
          gather” followed by one item's name is checked automatically, when you gather that item.
          Other promises stay open. This list shows promises; it cannot change or cancel them.
        </p>
      </details>
    </div>
  );
}
