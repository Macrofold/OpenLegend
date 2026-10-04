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
import './lifecycle.css';

type SettingsDraft = { enabled: boolean; intervalMinutes: string; retain: string };
const settingsDraft = (settings: AutosaveSettings): SettingsDraft => ({
  enabled: settings.enabled,
  intervalMinutes: String(settings.intervalMinutes),
  retain: String(settings.retain),
});
const sameSettings = (a: SettingsDraft, b: AutosaveSettings) =>
  a.enabled === b.enabled &&
  a.intervalMinutes.trim() !== '' &&
  a.retain.trim() !== '' &&
  Number(a.intervalMinutes) === b.intervalMinutes &&
  Number(a.retain) === b.retain;
const bytesLabel = (bytes: number) =>
  bytes >= 1024 * 1024 * 1024
    ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    : bytes >= 100 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;

export function GameSavesPanel({
  visible = true,
  timeDisplay = 'world-clock',
}: {
  visible?: boolean;
  timeDisplay?: 'world-clock' | 'elapsed';
}) {
  const [saves, setSaves] = useState<GameSaveSummary[]>([]);
  const [autosaves, setAutosaves] = useState<AutosaveStatus>();
  const [next, setNext] = useState<GameSaveCatalog['next']>();
  const [label, setLabel] = useState('');
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);
  const [catalogError, setCatalogError] = useState('');
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
  const createRequest = useRef<{ id: string; label: string } | null>(null);
  const [createUncertain, setCreateUncertain] = useState(false);
  const [rowUncertain, setRowUncertain] = useState<{
    action: 'load' | 'delete';
    save: GameSaveSummary;
  }>();
  const confirmation = useRef<HTMLDivElement>(null);
  const catalogControls = useRef<HTMLDivElement>(null);
  const confirmTrigger = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
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
    setDraft(settingsDraft(status.settings));
    setDraftBase(status.settings);
  }
  async function refresh(more = false) {
    if (!visibleRef.current) return;
    const request = ++catalogRequest.current;
    setListing(true);
    setCatalogError('');
    try {
      const result = await post<GameSaveCatalog>('/api/saves/list', more ? { before: next } : {});
      if (request !== catalogRequest.current) return;
      if (!result.ok) throw new Error(result.message);
      setListed(true);
      setSaves((previous) => (more ? [...previous, ...result.saves] : result.saves));
      setNext(result.next);
      adopt(result.autosaves);
    } catch (error) {
      if (request === catalogRequest.current)
        setCatalogError(error instanceof Error ? error.message : 'Could not refresh checkpoints.');
    } finally {
      if (request === catalogRequest.current) setListing(false);
    }
  }
  useEffect(() => {
    if (visible) void refresh();
    else setListing(false);
    return () => {
      catalogRequest.current++;
    };
  }, [visible]);
  useEffect(() => {
    if (confirm && visible) confirmation.current?.focus();
  }, [confirm, visible]);
  function closeConfirmation() {
    setConfirm(null);
    confirmTrigger.current?.focus();
  }
  async function create() {
    if (creating || rowBusy || rowUncertain) return;
    catalogRequest.current++;
    setCreating(true);
    setMessage('');
    try {
      createRequest.current ??= { id: crypto.randomUUID(), label: label.trim() || 'Manual save' };
      const result = await post('/api/saves/create', createRequest.current);
      if (!result.ok) {
        setCreateUncertain(false);
        createRequest.current = null;
        setMessage(result.message || 'The checkpoint was not created.');
        await refresh();
        return;
      }
      setCreateUncertain(false);
      createRequest.current = null;
      setLabel('');
      setMessage(result.message ?? 'Checkpoint created.');
      await refresh();
    } catch (error) {
      // Keep the request identity: retrying the same save cannot create a duplicate.
      setCreateUncertain(true);
      setMessage(
        error instanceof Error ? error.message : 'The checkpoint result was not confirmed.',
      );
      await refresh();
    } finally {
      setCreating(false);
    }
  }
  async function run(action: 'load' | 'delete', save: GameSaveSummary) {
    if (creating || rowBusy || createUncertain) return;
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
      if (!result.ok) {
        setRowUncertain(undefined);
        setMessage(result.message || 'The checkpoint operation was not accepted.');
        await refresh();
        return;
      }
      setRowUncertain(undefined);
      if (action === 'load') {
        window.location.reload();
        return;
      }
      setConfirm(null);
      setMessage(result.message ?? 'Done.');
      await refresh();
      // A deleted row cannot receive focus back. Restore within this task only if its
      // disappearing control left focus on the page, not after the user moved elsewhere.
      requestAnimationFrame(() => {
        if (visibleRef.current && document.activeElement === document.body)
          catalogControls.current?.querySelector('button')?.focus();
      });
    } catch (error) {
      setRowUncertain({ action, save });
      setMessage(
        error instanceof Error ? error.message : 'The checkpoint operation was not confirmed.',
      );
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
          intervalMinutes: Number(draft.intervalMinutes),
          retain: Number(draft.retain),
          revision: draftBase.revision,
        },
      );
      if (!result.ok) throw new Error(result.message);
      setAutosaves(result.autosaves);
      setDraft(settingsDraft(result.autosaves.settings));
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
    draft.intervalMinutes.trim() !== '' &&
    Number.isInteger(Number(draft.intervalMinutes)) &&
    Number(draft.intervalMinutes) >= 1 &&
    Number(draft.intervalMinutes) <= 1440;
  const retainValid =
    !!draft &&
    draft.retain.trim() !== '' &&
    Number.isInteger(Number(draft.retain)) &&
    Number(draft.retain) >= 1 &&
    Number(draft.retain) <= 20;
  const unresolved = createUncertain || !!rowUncertain;
  return (
    <div className="ol-checkpoints">
      <Section title="Checkpoints">
        <p>
          Keep named points in this world’s history. Loading a checkpoint replaces the current world
          and starts it paused.
        </p>
        <p className="ol-setting-scope">Whole world · save permission required</p>
        <p className="ol-caption">
          “Saved” in the game’s status display reports the last ordinary save. A checkpoint is a
          separate point you can deliberately load later.
        </p>
        {failure && (
          <div className="ol-notice" role="alert">
            <strong>Checkpoint protection needs attention</strong>
            <p>
              {new Date(failure.at).toLocaleString()}: {failure.message}
            </p>
            <p className="ol-caption">
              Earlier checkpoints are kept. Acknowledging this notice means you have read it; it
              does not repair the failure.
            </p>
            <Button
              size="sm"
              variant="quiet"
              busy={ackBusy}
              onPress={() => void acknowledge(failure.id)}
            >
              Acknowledge notice
            </Button>
          </div>
        )}
        {unresolved && (
          <div className="ol-notice" role="alert">
            <strong>Checkpoint result not confirmed</strong>
            {rowUncertain ? (
              <>
                <p>
                  {rowUncertain.action === 'load' ? 'Loading' : 'Deleting'} “
                  {rowUncertain.save.label}” did not return a confirmed result. The world or
                  checkpoint may already have changed.
                </p>
                <Button
                  busy={rowBusy}
                  onPress={() => void run(rowUncertain.action, rowUncertain.save)}
                >
                  Retry the same {rowUncertain.action}
                </Button>
              </>
            ) : (
              <>
                <p>Creating “{createRequest.current?.label}” did not return a confirmed result.</p>
                <Button busy={creating} onPress={() => void create()}>
                  Retry the same checkpoint
                </Button>
              </>
            )}
            <p className="ol-caption">
              Retry keeps the original request and checkpoint identity. It is not a new save or a
              different load. Other checkpoint changes wait for this result.
            </p>
          </div>
        )}
        {message && <p role="status">{message}</p>}
        <div className="ol-checkpoint-create">
          <label>
            Checkpoint name
            <input
              value={label}
              maxLength={80}
              disabled={creating || unresolved}
              onChange={(event) => {
                setLabel(event.target.value);
                createRequest.current = null;
              }}
              placeholder="Manual save"
            />
          </label>
          <Button
            variant="primary"
            busy={creating}
            disabled={rowBusy || unresolved}
            onPress={() => void create()}
          >
            Create checkpoint
          </Button>
        </div>
        {creating && (
          <p role="status">
            Creating “{createRequest.current?.label ?? (label.trim() || 'Manual save')}”… If another
            checkpoint is running, this one starts after it.
          </p>
        )}
        {!creating && autosaves?.pendingManual && (
          <p role="status">A manual checkpoint is waiting for the current capture to finish.</p>
        )}
      </Section>
      <Section title="Choose a checkpoint" count={saves.length}>
        <div className="ol-lifecycle-actions" ref={catalogControls}>
          <Button
            size="sm"
            variant="quiet"
            busy={listing}
            disabled={creating || rowBusy}
            onPress={() => void refresh()}
          >
            Refresh checkpoints
          </Button>
          {listed && (
            <span className="ol-caption">
              {saves.length} shown{next ? ' · more available' : ''}
            </span>
          )}
        </div>
        {catalogError && (
          <p role="alert">
            Could not refresh checkpoints: {catalogError}
            {listed ? ' The earlier list remains visible.' : ''}
          </p>
        )}
        {!listed && listing && <p role="status">Reading checkpoint history…</p>}
        {listed && !saves.length && !catalogError && (
          <p>No checkpoints are listed yet. Create one above to keep the current world.</p>
        )}
        {saves.map((save) => (
          <article className="ol-save-row" key={save.id}>
            <strong>{save.label}</strong>
            <span className="ol-caption">
              {save.kind === 'auto'
                ? 'Automatic checkpoint'
                : save.kind === 'recovery'
                  ? 'Recovery checkpoint'
                  : 'Named checkpoint'}
            </span>
            <small>
              Saved{' '}
              {new Date(save.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'long',
              })}
            </small>
            <small>
              {timeDisplay === 'world-clock' ? (
                <EventTime time={save.simTime} />
              ) : (
                <>Elapsed game time: {save.simTime.toLocaleString()} seconds</>
              )}
            </small>
            {!save.compatible && (
              <p>
                Incompatible development version. This checkpoint cannot be loaded by the current
                game.
              </p>
            )}
            <div className="ol-save-actions">
              <Button
                size="sm"
                disabled={busy || unresolved || !save.compatible}
                aria-label={`Load ${save.label}`}
                onPress={(event) => {
                  confirmTrigger.current =
                    event.target instanceof HTMLElement ? event.target : null;
                  setConfirm({ save, action: 'load' });
                }}
              >
                Load
              </Button>
              <Button
                size="sm"
                variant="quiet"
                disabled={busy || unresolved}
                aria-label={`Delete ${save.label}`}
                onPress={(event) => {
                  confirmTrigger.current =
                    event.target instanceof HTMLElement ? event.target : null;
                  setConfirm({ save, action: 'delete' });
                }}
              >
                Delete
              </Button>
            </div>
            {confirm?.save.id === save.id && !unresolved && (
              <div
                className="ol-checkpoint-confirm"
                role="group"
                aria-label={`${confirm.action === 'load' ? 'Load' : 'Delete'} checkpoint ${confirm.save.label}`}
                tabIndex={-1}
                ref={confirmation}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && !rowBusy) {
                    event.preventDefault();
                    event.stopPropagation();
                    closeConfirmation();
                  }
                }}
              >
                <strong>
                  {confirm.action === 'load' ? 'Load' : 'Delete'} “{confirm.save.label}”?
                </strong>
                <p>
                  {confirm.action === 'load'
                    ? 'This replaces the current world. The world pauses and a “Before last load” recovery checkpoint is written first. If that protection fails, loading is refused and the current world stays paused.'
                    : 'This permanently deletes the named checkpoint. It does not rewind or delete the current world.'}
                </p>
                <div className="ol-lifecycle-actions">
                  <Button
                    variant="danger"
                    busy={rowBusy}
                    disabled={listing || creating}
                    onPress={() => void run(confirm.action, confirm.save)}
                  >
                    Confirm {confirm.action}
                  </Button>
                  <Button variant="quiet" disabled={rowBusy} onPress={closeConfirmation}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))}
        {next && (
          <Button disabled={busy} onPress={() => void refresh(true)}>
            More checkpoints
          </Button>
        )}
      </Section>
      <Section title="Automatic protection">
        {autosaves?.saving && <p role="status">A checkpoint is being written…</p>}
        {autosaves?.lastCompletedAt ? (
          <p>Last automatic checkpoint: {new Date(autosaves.lastCompletedAt).toLocaleString()}</p>
        ) : (
          autosaves && <p>No automatic checkpoint is listed yet.</p>
        )}
        {settings && (
          <p>
            {settings.enabled
              ? `On · every ${settings.intervalMinutes} minutes of running time · keep ${settings.retain}`
              : 'Automatic checkpoints are off.'}
          </p>
        )}
        {autosaves?.settingsError && (
          <p role="alert" className="ol-form-error">
            Automatic checkpoints are off: {autosaves.settingsError}
          </p>
        )}
        {!!autosaves?.unavailableSaves && (
          <p role="status">
            {autosaves.unavailableSaves} damaged or incomplete checkpoint(s) could not be listed.
            Other checkpoints remain available.
          </p>
        )}
        {autosaves?.storageBytes !== undefined && (
          <p className="ol-caption">
            Checkpoint folder: {bytesLabel(autosaves.storageBytes)} on disk.
          </p>
        )}
        {draft && settings && (
          <details className="ol-setting-details">
            <summary>
              Edit automatic checkpoint policy
              {draftBase && !sameSettings(draft, draftBase) ? ' · unsaved changes' : ''}
            </summary>
            <div className="ol-setting-group">
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
                  onChange={(event) => setDraft({ ...draft, intervalMinutes: event.target.value })}
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
                  onChange={(event) => setDraft({ ...draft, retain: event.target.value })}
                />
              </label>
              {(!intervalValid || !retainValid) && (
                <p className="ol-form-error">Use 1–1440 minutes and keep 1–20 checkpoints.</p>
              )}
              <p className="ol-caption">
                Paused time does not count. After a successful automatic checkpoint, older automatic
                checkpoints beyond the number kept are removed. Named checkpoints are never removed
                automatically.
              </p>
              <p className="ol-caption">
                Retention is not a hard disk limit. Damaged or unfinished checkpoints stay in the
                folder until the server operator removes them.
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
                Save automatic checkpoint policy
              </Button>
            </div>
          </details>
        )}
        {settingsMessage && <p role="status">{settingsMessage}</p>}
      </Section>
    </div>
  );
}
