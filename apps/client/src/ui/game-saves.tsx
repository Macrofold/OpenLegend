import { EventTime } from './event-time';
import { useEffect, useRef, useState } from 'react';
import type {
  AutosaveSettings,
  AutosaveStatus,
  GameSaveCatalog,
  GameSaveSummary,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section } from '../design-system/components';

type SettingsDraft = Omit<AutosaveSettings, 'revision'>;
const sameSettings = (a: SettingsDraft, b: SettingsDraft) =>
  a.enabled === b.enabled && a.intervalMinutes === b.intervalMinutes && a.retain === b.retain;
const bytesLabel = (bytes: number) =>
  bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : bytes >= 100 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;

export function GameSavesPanel() {
  const [saves, setSaves] = useState<GameSaveSummary[]>([]);
  const [autosaves, setAutosaves] = useState<AutosaveStatus>();
  const [next, setNext] = useState<GameSaveCatalog['next']>();
  const [label, setLabel] = useState('');
  const [listing, setListing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rowBusy, setRowBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<SettingsDraft>();
  // The server settings an edit started from; saving sends its revision so a concurrent change
  // by another operator is refused rather than overwritten.
  const [draftBase, setDraftBase] = useState<AutosaveSettings>();
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [ackBusy, setAckBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    save: GameSaveSummary;
    action: 'load' | 'delete';
  } | null>(null);
  const loadRequest = useRef<{ id: string; requestId: string } | null>(null);
  const createRequest = useRef<string | null>(null);
  const catalogRequest = useRef(0);
  // adopt() runs after awaited requests; it must see the edit as it is now, not as it was when
  // the request started, or a newer unsaved edit could be replaced.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const draftBaseRef = useRef(draftBase);
  draftBaseRef.current = draftBase;
  const busy = listing || creating || rowBusy;
  function adopt(status: AutosaveStatus) {
    setAutosaves(status);
    // Keep an operator's unsaved edits unless the stored settings changed since the edit began;
    // then show the stored values, so a later save never silently overwrites another change.
    const draft = draftRef.current,
      draftBase = draftBaseRef.current;
    const edited = !!draft && !!draftBase && !sameSettings(draft, draftBase);
    const moved = !!draftBase && status.settings.revision !== draftBase.revision;
    if (edited && !moved) return;
    if (edited && !sameSettings(draft, status.settings))
      setSettingsMessage(
        'Autosave settings were changed elsewhere; showing the stored settings. Re-apply your edit and save.',
      );
    setDraft(status.settings);
    setDraftBase(status.settings);
  }
  async function refresh(more = false) {
    const request = ++catalogRequest.current;
    setListing(true);
    try {
      const result = await post<GameSaveCatalog>('/api/saves/list', more ? { before: next } : {});
      if (request !== catalogRequest.current) return;
      if (!result.ok) throw new Error(result.message);
      setSaves((previous) => (more ? [...previous, ...result.saves] : result.saves));
      setNext(result.next);
      adopt(result.autosaves);
    } catch (error) {
      if (request === catalogRequest.current)
        setMessage(error instanceof Error ? error.message : 'Could not refresh saves.');
    } finally {
      if (request === catalogRequest.current) setListing(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      catalogRequest.current++;
    };
  }, []);
  async function create() {
    catalogRequest.current++;
    setCreating(true);
    setMessage('');
    try {
      createRequest.current ??= crypto.randomUUID();
      const result = await post('/api/saves/create', {
        id: createRequest.current,
        label: label.trim() || 'Manual save',
      });
      if (!result.ok) throw new Error(result.message);
      createRequest.current = null;
      setLabel('');
      setMessage(result.message ?? 'Game saved.');
      await refresh();
    } catch (error) {
      // Keep the request identity: retrying the same save cannot create a duplicate.
      setMessage(error instanceof Error ? error.message : 'Save failed.');
      await refresh();
    } finally {
      setCreating(false);
    }
  }
  async function run(action: 'load' | 'delete', save: GameSaveSummary) {
    catalogRequest.current++;
    setRowBusy(true);
    setMessage('');
    try {
      if (action === 'load' && loadRequest.current?.id !== save.id)
        loadRequest.current = { id: save.id, requestId: crypto.randomUUID() };
      const result = await post(
        `/api/saves/${action}`,
        action === 'load' ? loadRequest.current : { id: save.id },
      );
      if (!result.ok) throw new Error(result.message);
      if (action === 'load') {
        window.location.reload();
        return;
      }
      setConfirm(null);
      setMessage(result.message ?? 'Done.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save operation failed.');
      // A refused load records a checkpoint failure; show it without a manual refresh.
      await refresh();
    } finally {
      setRowBusy(false);
    }
  }
  async function saveSettings() {
    if (!draft || !draftBase) return;
    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      const result = await post<{ ok: boolean; message?: string; autosaves: AutosaveStatus }>(
        '/api/saves/settings',
        {
          enabled: draft.enabled,
          intervalMinutes: draft.intervalMinutes,
          retain: draft.retain,
          revision: draftBase.revision,
        },
      );
      if (!result.ok) throw new Error(result.message);
      setAutosaves(result.autosaves);
      setDraft(result.autosaves.settings);
      setDraftBase(result.autosaves.settings);
      setSettingsMessage(result.message ?? 'Autosave settings saved.');
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : 'Could not save settings.');
      // A conflict means the stored settings moved; load them so the next save is informed.
      await refresh();
    } finally {
      setSettingsBusy(false);
    }
  }
  async function acknowledge(id: string) {
    setAckBusy(true);
    try {
      const result = await post<{ ok: boolean; message?: string; autosaves: AutosaveStatus }>(
        '/api/saves/acknowledge',
        { id },
      );
      if (!result.ok) throw new Error(result.message);
      setAutosaves(result.autosaves);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not acknowledge the failure.');
    } finally {
      setAckBusy(false);
    }
  }
  const failure = autosaves?.failure;
  const settings = autosaves?.settings;
  const intervalValid =
    !!draft &&
    Number.isInteger(draft.intervalMinutes) &&
    draft.intervalMinutes >= 1 &&
    draft.intervalMinutes <= 1440;
  const retainValid =
    !!draft && Number.isInteger(draft.retain) && draft.retain >= 1 && draft.retain <= 20;
  return (
    <Section title="Save game">
      <p>Save your current world, or open a saved game below. Loaded games start paused.</p>
      {failure && (
        <div className="ol-notice" role="alert">
          <p>
            Checkpoint failure at {new Date(failure.at).toLocaleString()}: {failure.message}
          </p>
          <p className="ol-caption">
            Earlier checkpoints are kept. This notice stays, even after a restart, until you
            acknowledge it.
          </p>
          <Button
            size="sm"
            variant="quiet"
            busy={ackBusy}
            onPress={() => void acknowledge(failure.id)}
          >
            Acknowledge
          </Button>
        </div>
      )}
      <label>
        Save name
        <input
          value={label}
          maxLength={80}
          disabled={creating}
          onChange={(event) => {
            setLabel(event.target.value);
            createRequest.current = null;
          }}
          placeholder="Manual save"
        />
      </label>
      <Button busy={creating} disabled={rowBusy} onPress={() => void create()}>
        Save game
      </Button>
      {creating && (
        <p role="status">
          Saving{label.trim() ? ` “${label.trim()}”` : ''}… If an automatic checkpoint is running,
          this save starts right after it.
        </p>
      )}
      {!creating && autosaves?.pendingManual && (
        <p role="status">A manual save is waiting for the current checkpoint to finish.</p>
      )}
      <h3>Automatic checkpoints</h3>
      {autosaves?.settingsError && (
        <p role="alert" className="ol-form-error">
          Automatic checkpoints are off: {autosaves.settingsError}
        </p>
      )}
      {draft && settings && (
        <>
          <label>
            <input
              type="checkbox"
              checked={draft.enabled}
              disabled={settingsBusy}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            />{' '}
            Save automatically while the world is running
          </label>
          <label>
            Minutes of running time between checkpoints
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={draft.intervalMinutes}
              disabled={settingsBusy || !draft.enabled}
              onChange={(event) =>
                setDraft({ ...draft, intervalMinutes: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Automatic checkpoints to keep
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={draft.retain}
              disabled={settingsBusy || !draft.enabled}
              onChange={(event) => setDraft({ ...draft, retain: Number(event.target.value) })}
            />
          </label>
          {(!intervalValid || !retainValid) && (
            <p role="alert" className="ol-form-error">
              Use 1–1440 minutes and keep 1–20 checkpoints.
            </p>
          )}
          <p className="ol-caption">
            Paused time does not count. After each successful automatic checkpoint, older automatic
            checkpoints beyond the number kept are removed; named saves are never removed
            automatically. Counts are not a hard disk limit: damaged or unfinished checkpoints are
            not listed here and stay in the save folder until the server operator removes them.
          </p>
          <Button
            variant="secondary"
            busy={settingsBusy}
            disabled={
              !intervalValid ||
              !retainValid ||
              (!autosaves?.settingsError && !!draftBase && sameSettings(draft, draftBase))
            }
            onPress={() => void saveSettings()}
          >
            Save autosave settings
          </Button>
          {settingsMessage && <p role="status">{settingsMessage}</p>}
        </>
      )}
      {autosaves?.saving && <p role="status">A checkpoint is being written…</p>}
      {autosaves?.lastCompletedAt ? (
        <p>Last automatic checkpoint: {new Date(autosaves.lastCompletedAt).toLocaleString()}</p>
      ) : (
        autosaves && <p>No automatic checkpoint is listed yet.</p>
      )}
      {!!autosaves?.unavailableSaves && (
        <p role="status">
          {autosaves.unavailableSaves} damaged or incomplete save(s) could not be listed. Other
          checkpoints remain available.
        </p>
      )}
      {autosaves?.storageBytes !== undefined && (
        <p className="ol-caption">Save folder: {bytesLabel(autosaves.storageBytes)} on disk.</p>
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
            {save.kind === 'auto' ? 'Automatic · ' : ''}
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
                  ? 'Replace the current world? The world pauses and a “Before last load” recovery save is written first; if it cannot be written, the load is refused and the current world stays, paused.'
                  : 'Permanently delete this save?'}
              </p>
              <Button
                variant="danger"
                busy={rowBusy}
                disabled={listing || creating}
                onPress={() => void run(confirm.action, save)}
              >
                Confirm {confirm.action}
              </Button>{' '}
              <Button disabled={rowBusy} onPress={() => setConfirm(null)}>
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
