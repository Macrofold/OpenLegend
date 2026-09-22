import { EventTime } from './event-time';
import { useEffect, useRef, useState } from 'react';
import type { GameSaveSummary } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

export function GameSavesPanel() {
  const [saves, setSaves] = useState<GameSaveSummary[]>([]);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<{
    save: GameSaveSummary;
    action: 'load' | 'delete';
  } | null>(null);
  const loadRequest = useRef<{ id: string; requestId: string } | null>(null);
  const createRequest = useRef<string | null>(null);
  async function refresh() {
    const result = await post<{ ok: boolean; message?: string; saves: GameSaveSummary[] }>(
      '/api/saves/list',
      {},
    );
    if (!result.ok) throw new Error(result.message);
    setSaves(result.saves);
  }
  useEffect(() => {
    void refresh().catch((error: Error) => setMessage(error.message));
  }, []);
  async function run(action: 'create' | 'load' | 'delete', save?: GameSaveSummary) {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'load' && loadRequest.current?.id !== save!.id)
        loadRequest.current = { id: save!.id, requestId: crypto.randomUUID() };
      if (action === 'create') createRequest.current ??= crypto.randomUUID();
      const body =
        action === 'create'
          ? { id: createRequest.current, label: label.trim() || 'Manual save' }
          : action === 'load'
            ? loadRequest.current
            : { id: save!.id };
      const result = await post(`/api/saves/${action}`, body);
      if (!result.ok) throw new Error(result.message);
      if (action === 'create') {
        createRequest.current = null;
        setLabel('');
      }
      if (action === 'load') {
        window.location.reload();
        return;
      }
      setConfirm(null);
      setMessage(result.message ?? 'Done.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save operation failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title="Save & load">
      <p>
        Manual saves stay on this server. Loading restores the world and pauses it. World-agent
        sessions start fresh; real AI spending is retained.
      </p>
      <label>
        Save name
        <input
          value={label}
          maxLength={80}
          disabled={busy}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Manual save"
        />
      </label>
      <Button busy={busy} onPress={() => void run('create')}>
        Save game
      </Button>
      <p className="ol-muted">
        20 manual slots. Development saves may become incompatible when the game changes.
      </p>
      {message && <p role="status">{message}</p>}
      {saves.map((save) => (
        <div className="ol-save-row" key={save.id}>
          <strong>{save.label}</strong>
          <small>
            {new Date(save.createdAt).toLocaleString()} · <EventTime time={save.simTime} />
          </small>
          {!save.compatible && <p>Incompatible development version</p>}
          <div className="ol-save-actions">
            <Button
              size="sm"
              disabled={busy || !save.compatible}
              onPress={() => setConfirm({ save, action: 'load' })}
            >
              Load
            </Button>
            <Button
              size="sm"
              variant="quiet"
              disabled={busy}
              onPress={() => setConfirm({ save, action: 'delete' })}
            >
              Delete
            </Button>
          </div>
          {confirm?.save.id === save.id && (
            <div role="group" aria-label="Confirm save operation">
              <p>
                {confirm.action === 'load'
                  ? 'Replace the current world? A “Before last load” recovery save will be kept.'
                  : 'Permanently delete this save?'}
              </p>
              <Button
                variant="danger"
                disabled={busy}
                onPress={() => void run(confirm.action, save)}
              >
                Confirm {confirm.action}
              </Button>{' '}
              <Button disabled={busy} onPress={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ))}
    </Section>
  );
}
