import { EventTime } from './event-time';
import { useEffect, useRef, useState } from 'react';
import type { GameSaveSummary, AutosaveStatus } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

export function GameSavesPanel() {
  const [saves, setSaves] = useState<GameSaveSummary[]>([]);
  const [autosaves, setAutosaves] = useState<AutosaveStatus>();
  const [next, setNext] = useState<Pick<GameSaveSummary, 'id' | 'createdAt'>>();
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<{
    save: GameSaveSummary;
    action: 'load' | 'delete';
  } | null>(null);
  const loadRequest = useRef<{ id: string; requestId: string } | null>(null);
  const createRequest = useRef<string | null>(null);
  const catalogRequest = useRef(0);
  async function refresh(more = false) {
    const request = ++catalogRequest.current;
    setBusy(true);
    try {
      const result = await post<{
        ok: boolean;
        message?: string;
        saves: GameSaveSummary[];
        autosaves: AutosaveStatus;
        next?: Pick<GameSaveSummary, 'id' | 'createdAt'>;
      }>('/api/saves/list', more ? { before: next } : {});
      if (request !== catalogRequest.current) return;
      if (!result.ok) throw new Error(result.message);
      setSaves((previous) => (more ? [...previous, ...result.saves] : result.saves));
      setNext(result.next);
      setAutosaves(result.autosaves);
    } catch (error) {
      if (request === catalogRequest.current)
        setMessage(error instanceof Error ? error.message : 'Could not refresh saves.');
    } finally {
      if (request === catalogRequest.current) setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      catalogRequest.current++;
    };
  }, []);
  async function run(action: 'create' | 'load' | 'delete', save?: GameSaveSummary) {
    catalogRequest.current++;
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
    <Section title="Save game">
      <p>Save your current world, or open a saved game below. Loaded games start paused.</p>
      <label>
        Save name
        <input
          value={label}
          maxLength={80}
          disabled={busy}
          onChange={(event) => {
            setLabel(event.target.value);
            createRequest.current = null;
          }}
          placeholder="Manual save"
        />
      </label>
      <Button busy={busy} onPress={() => void run('create')}>
        Save game
      </Button>
      <p className="ol-muted">
        The server keeps three rolling world checkpoints, about five minutes apart while the world
        is running. Named saves stay until you delete them. Loading restores a listed checkpoint.
      </p>
      {autosaves?.saving && <p role="status">Saving an automatic checkpoint…</p>}
      {autosaves?.lastCompletedAt && (
        <p>Last autosave: {new Date(autosaves.lastCompletedAt).toLocaleString()}</p>
      )}
      {autosaves?.error && <p role="status">Checkpoint: {autosaves.error}</p>}
      {!!autosaves?.unavailableSaves && (
        <p role="status">
          {autosaves.unavailableSaves} damaged or incomplete save(s) could not be listed. Other
          checkpoints remain available.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <h3>Saved games</h3>
      <Button size="sm" variant="quiet" disabled={busy} onPress={() => void refresh()}>
        Refresh saves
      </Button>
      {!saves.length && <p>No saved games yet. Save your current game to start your list.</p>}
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
      {next && (
        <Button disabled={busy} onPress={() => void refresh(true)}>
          More saved games
        </Button>
      )}
    </Section>
  );
}
