import { useEffect, useState } from 'react';
import type { ContainerPage, InventoryItemView, ObjectHistoryPage } from '@open-legend/protocol';
import { post } from '../api';
import { Button } from '../design-system/components';

export function InventoryHistory({
  scope,
  revision,
  visible,
  readRevision,
}: {
  scope: string;
  revision: number;
  visible: boolean;
  readRevision: string;
}) {
  const [open, setOpen] = useState(false),
    [cursor, setCursor] = useState<string>();
  const [result, setResult] = useState<{ key: string; page?: ObjectHistoryPage; error?: string }>();
  const key = JSON.stringify([scope, revision, cursor, readRevision]);
  useEffect(() => {
    if (!open || !visible) return;
    const controller = new AbortController();
    void post<ObjectHistoryPage>('/api/inventory/history', { cursor }, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'History unavailable.' }),
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error: String(error) });
      });
    return () => {
      controller.abort();
    };
  }, [open, key, visible]);
  const current = result?.key === key && visible ? result : undefined;
  const loading = result?.key !== key;
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Object history</summary>
      <p className="ol-caption">
        Recorded splits, merges and consumption while in your character’s custody.
      </p>
      {loading && open && <p role="status">Loading history…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.page?.entries.map((entry) => (
        <p key={entry.id}>
          {entry.name} · {entry.quantity}{' '}
          {entry.type === 'consume'
            ? 'consumed'
            : entry.type === 'merge'
              ? 'merged into another lot'
              : 'split into a new lot'}
        </p>
      ))}
      {current?.page && !current.page.entries.length && <p>No object history on this page.</p>}
      {cursor && (
        <Button disabled={loading || !visible} onPress={() => setCursor(undefined)}>
          First history page
        </Button>
      )}
      {current?.page?.next && (
        <Button disabled={loading || !visible} onPress={() => setCursor(current.page!.next)}>
          More history
        </Button>
      )}
    </details>
  );
}

/** Matching lots anywhere in this container, found by the server with the merge admission
 * rules rather than only among the displayed page (docs/limits/objects.md#qu05). */
type MergeTargetProps = {
  item: InventoryItemView;
  containerId: string;
  pageKey: string;
  canAct: boolean;
  visible: boolean;
  onMerge(target: InventoryItemView): void;
};

export function MergeTargets(props: MergeTargetProps) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Merge matching stacks</summary>
      {open && <MatchingLots {...props} />}
    </details>
  );
}

function MatchingLots({ item, containerId, pageKey, canAct, visible, onMerge }: MergeTargetProps) {
  const [refresh, setRefresh] = useState(0);
  const context = JSON.stringify([pageKey, containerId, item.id, item.revision, visible, refresh]);
  const [continuation, setContinuation] = useState<{ context: string; cursor?: string }>({
    context,
  });
  if (continuation.context !== context) setContinuation({ context });
  const cursor = continuation.context === context ? continuation.cursor : undefined;
  const setCursor = (value?: string) => setContinuation({ context, cursor: value });
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<{ key: string; page?: ContainerPage; error?: string }>();
  const key = JSON.stringify([context, cursor]);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void post<ContainerPage>(
      '/api/inventory',
      { containerId, mergeSourceId: item.id, cursor },
      controller.signal,
    )
      .then((page) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            ...(page.ok ? { page } : { error: page.message ?? 'Matching lots are unavailable.' }),
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key, error: String(error) });
      });
    return () => {
      controller.abort();
    };
  }, [key, visible]);
  // A permission or revision change hides stale matching lots immediately.
  const loading = result?.key !== key;
  const current = result?.key === key && visible ? result : undefined;
  if (!current) return <p role="status">Finding matching lots…</p>;
  if (current.error && !loading)
    return (
      <>
        <p role="alert">{current.error}</p>
        <Button
          size="sm"
          variant="quiet"
          disabled={!visible}
          onPress={() => setRefresh((value) => value + 1)}
        >
          Refresh matching stacks
        </Button>
      </>
    );
  const targets = current.page?.items ?? [];
  const target = targetId ? targets.find((other) => other.id === targetId) : targets[0];
  if (!target && !targetId && !current.page?.next && !cursor && !loading) return null;
  return (
    <div className="ol-actions" aria-busy={loading}>
      {target || targetId ? (
        <>
          <label>
            Merge into{' '}
            <select value={target?.id ?? ''} onChange={(event) => setTargetId(event.target.value)}>
              {!target && (
                <option value="" disabled>
                  Selected stack unavailable — choose another
                </option>
              )}
              {targets.map((other, index) => (
                <option key={other.id} value={other.id}>
                  {other.name} × {other.quantity} · matching lot {index + 1}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="quiet"
            disabled={!canAct || loading || !target}
            onPress={() => target && onMerge(target)}
          >
            Merge lots
          </Button>
        </>
      ) : (
        <p className="ol-caption">No matching lot in this part of the container.</p>
      )}
      <span className="ol-caption" role="status">
        {loading ? 'Finding matching lots…' : ''}
      </span>
      {current.page?.next && (
        <Button size="sm" variant="quiet" onPress={() => setCursor(current.page!.next)}>
          Search more lots
        </Button>
      )}
      {cursor && (
        <Button size="sm" variant="quiet" onPress={() => setCursor(undefined)}>
          First matching lots
        </Button>
      )}
    </div>
  );
}
