import { useEffect, useRef, useState } from 'react';
import type { GodPersonMemoryEditorCut } from '@open-legend/protocol';
import { post, postPrivateRead } from '../api';

type Page = {
  ok: boolean;
  message?: string;
  cut: GodPersonMemoryEditorCut;
  revision: number;
  rows: { id: string; name: string; quantity: number | null; restriction: string | null }[];
  next: number | null;
};

export function InventoryEditor({
  actorId,
  control,
  onDirtyChange,
}: {
  actorId: string;
  control: boolean;
  onDirtyChange(dirty: boolean): void;
}) {
  const [page, setPage] = useState<Page>();
  const [start, setStart] = useState(0);
  const [id, setId] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const row = page?.rows.find((r) => r.id === id);
  const quantity = Number(draft);
  const dirty = !!row && (draft.trim() === '' || quantity !== row.quantity);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [onDirtyChange, dirty]);

  async function refresh(offset: number) {
    const reply = await postPrivateRead<Page>('/api/god/editor/person/inventory', {
      actorId,
      start: offset,
    });
    if (!reply.ok) throw new Error(reply.message || 'Inventory could not be read.');
    setPage(reply);
    setStart(offset);
    const selected = reply.rows.find((r) => r.id === id);
    setId(selected?.id ?? '');
    setDraft(selected?.quantity?.toString() ?? '');
  }
  async function update(offset: number, save = false) {
    if (pending.current) return;
    if (!save && dirty && !window.confirm('Discard the unapplied quantity and reload inventory?'))
      return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (save && page && row) {
        const result = await post('/api/god/editor/person/author', {
          actorId,
          cut: page.cut,
          change: {
            inventory: { definitionId: row.id, quantity, expectedRevision: page.revision },
          },
        });
        if (!result.ok)
          throw new Error(result.message || 'Inventory changed. Reload it before editing.');
        setMessage(result.message || 'Carried quantity updated.');
      }
      await refresh(offset);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inventory is unavailable.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (e.currentTarget.open && !page) void update(0);
      }}
    >
      <summary>Carried inventory</summary>
      {page && (
        <fieldset disabled={busy}>
          <legend>Item quantities</legend>
          <label>
            Item type{' '}
            <select
              value={id}
              disabled={dirty}
              onChange={(e) => {
                const selected = page.rows.find((r) => r.id === e.target.value);
                setId(selected?.id ?? '');
                setDraft(selected?.quantity?.toString() ?? '');
              }}
            >
              <option value="">Choose an item</option>
              {page.rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.quantity ? ' (' + r.quantity + ')' : ''}
                </option>
              ))}
            </select>
          </label>
          {row &&
            (row.restriction ? (
              <p>{row.restriction}</p>
            ) : (
              <>
                <label>
                  Carried quantity{' '}
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft}
                    disabled={!control}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
                <button
                  disabled={
                    !control ||
                    !dirty ||
                    !draft.trim() ||
                    !Number.isSafeInteger(quantity) ||
                    quantity < 0
                  }
                  onClick={() => void update(start, true)}
                >
                  Apply quantity
                </button>
              </>
            ))}
          {start > 0 && (
            <button disabled={dirty} onClick={() => void update(0)}>
              First items
            </button>
          )}
          {page.next !== null && (
            <button disabled={dirty} onClick={() => void update(page.next!)}>
              More items
            </button>
          )}
        </fieldset>
      )}
      <button disabled={busy} onClick={() => void update(start)}>
        Reload inventory
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
