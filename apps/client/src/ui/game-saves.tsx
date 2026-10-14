import {
  checkpointRequestKey,
  boundedText,
  readRetainedRequest,
  retainRequest,
  releaseRequest,
  type RetainedRequest,
} from '../retained-request';
import type {
  ApiResult,
  CheckpointContext,
  CheckpointRequest,
  RequestRecoveryResult,
} from '@open-legend/protocol';
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

function validCheckpointRequest(value: unknown): value is CheckpointRequest {
  if (!value || typeof value !== 'object') return false;
  return (
    'requestId' in value &&
    boundedText(value.requestId, 200) &&
    'label' in value &&
    boundedText(value.label, 80) &&
    'timeline' in value &&
    boundedText(value.timeline, 200) &&
    'operation' in value &&
    (value.operation === 'create' ||
      (value.operation === 'load' && 'saveId' in value && boundedText(value.saveId, 200)))
  );
}

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
  context,
  visible = true,
  timeDisplay = 'world-clock',
}: {
  context: CheckpointContext;
  visible?: boolean;
  timeDisplay?: 'world-clock' | 'elapsed';
}) {
  const recoveryKey = checkpointRequestKey(context.recoveryScope);
  const [retained, setRetained] = useState<RetainedRequest<CheckpointRequest>>(() =>
    readRetainedRequest(recoveryKey, validCheckpointRequest),
  );
  const pending = useRef(retained);
  const mutationActive = useRef(false);
  const alive = useRef(true);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function remember(next: RetainedRequest<CheckpointRequest>) {
    pending.current = next;
    setRetained(next);
  }
  const pendingRequest = retained.status === 'pending' ? retained.request : undefined;
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
  const [rowUncertain, setRowUncertain] = useState<{
    action: 'delete';
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
  const busy = listing || creating || rowBusy || checking;
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
  function restoreCatalogFocus() {
    // A disappearing action cannot receive focus back. Stay within this task only if
    // its control left focus on the page, not after the user moved elsewhere.
    requestAnimationFrame(() => {
      if (visibleRef.current && document.activeElement === document.body)
        catalogControls.current?.querySelector('button')?.focus();
    });
  }
  function settle(result: ApiResult, request: CheckpointRequest) {
    if (
      !alive.current ||
      pending.current.status !== 'pending' ||
      pending.current.request.requestId !== request.requestId
    )
      return;
    releaseRequest(recoveryKey, request.requestId);
    remember({ status: 'empty' });
    setConfirm(null);
    if (request.operation === 'create') setLabel('');
    setMessage(result.message);
  }
  async function create() {
    if (mutationActive.current || pending.current.status !== 'empty' || rowUncertain) return;
    mutationActive.current = true;
    catalogRequest.current++;
    setCreating(true);
    setMessage('');
    const request: CheckpointRequest = {
      operation: 'create',
      requestId: crypto.randomUUID(),
      label: label.trim() || 'Manual save',
      timeline: context.timeline,
    };
    try {
      retainRequest(recoveryKey, request);
      remember({ status: 'pending', request });
      const result = await post('/api/saves/create', {
        id: request.requestId,
        label: request.label,
      });
      if (!alive.current) return;
      if (result.ok || ['busy', 'invalid-input', 'loading', 'deferred'].includes(result.code))
        settle(result, request);
      else setMessage(result.message || 'The original checkpoint result is not confirmed.');
      await refresh();
    } catch (error) {
      if (alive.current) {
        if (pending.current.status === 'empty')
          remember(readRetainedRequest(recoveryKey, validCheckpointRequest));
        setMessage(
          error instanceof Error
            ? error.message
            : 'The original checkpoint result is not confirmed.',
        );
        await refresh();
      }
    } finally {
      mutationActive.current = false;
      if (alive.current) setCreating(false);
    }
  }
  async function run(action: 'load' | 'delete', save: GameSaveSummary) {
    if (
      mutationActive.current ||
      pending.current.status !== 'empty' ||
      (rowUncertain && (action !== 'delete' || rowUncertain.save.id !== save.id))
    )
      return;
    mutationActive.current = true;
    catalogRequest.current++;
    setRowBusy(true);
    setMessage('');
    const request: CheckpointRequest | undefined =
      action === 'load'
        ? {
            operation: 'load',
            requestId: crypto.randomUUID(),
            saveId: save.id,
            label: save.label,
            timeline: context.timeline,
          }
        : undefined;
    try {
      if (request) {
        retainRequest(recoveryKey, request);
        remember({ status: 'pending', request });
      }
      const result = await post(
        `/api/saves/${action}`,
        request ? { id: save.id, requestId: request.requestId } : { id: save.id },
      );
      if (!alive.current) return;
      if (!result.ok) {
        if (request && ['invalid-input', 'loading', 'deferred'].includes(result.code))
          settle(result, request);
        else setMessage(result.message || 'The original checkpoint operation is not confirmed.');
        await refresh();
        return;
      }
      if (request) {
        settle(result, request);
        window.location.reload();
        return;
      }
      setRowUncertain(undefined);
      setConfirm(null);
      setMessage(result.message ?? 'Done.');
      await refresh();
      restoreCatalogFocus();
    } catch (error) {
      if (alive.current) {
        if (!request) setRowUncertain({ action: 'delete', save });
        else if (pending.current.status === 'empty')
          remember(readRetainedRequest(recoveryKey, validCheckpointRequest));
        setMessage(
          error instanceof Error
            ? error.message
            : 'The original checkpoint operation is not confirmed.',
        );
        await refresh();
      }
    } finally {
      mutationActive.current = false;
      if (alive.current) setRowBusy(false);
    }
  }
  async function checkOriginalCheckpoint() {
    if (mutationActive.current || pending.current.status !== 'pending') return;
    const request = pending.current.request;
    mutationActive.current = true;
    setChecking(true);
    try {
      const result = await post<RequestRecoveryResult>('/api/saves/receipt', request);
      if (
        !alive.current ||
        pending.current.status !== 'pending' ||
        pending.current.request.requestId !== request.requestId
      )
        return;
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.scope !== context.scope)
        throw new Error('Checkpoint access changed. Refresh before checking the original result.');
      if (result.status === 'resolved') {
        settle(result.result, request);
        await refresh();
      } else setMessage(result.message);
    } catch (error) {
      if (alive.current)
        setMessage(
          error instanceof Error
            ? error.message
            : 'The original checkpoint result is still unknown.',
        );
    } finally {
      mutationActive.current = false;
      if (alive.current) setChecking(false);
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
      restoreCatalogFocus();
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
  const unresolved = retained.status !== 'empty' || !!rowUncertain;
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
            <strong>
              {creating || rowBusy
                ? 'Checkpoint operation in progress…'
                : checking
                  ? 'Checking original checkpoint…'
                  : 'Checkpoint result not confirmed'}
            </strong>
            {pendingRequest ? (
              <>
                <p>
                  {pendingRequest.operation === 'load' ? 'Loading' : 'Creating'} “
                  {pendingRequest.label}” has an unresolved original request.
                </p>
                <Button
                  busy={checking}
                  disabled={creating || rowBusy}
                  onPress={() => void checkOriginalCheckpoint()}
                >
                  Check original checkpoint result
                </Button>
                <p className="ol-caption">
                  Checking does not create or load a checkpoint again. Your original protection
                  checkpoint is not replaced.
                </p>
              </>
            ) : retained.status === 'unreadable' ? (
              <p>
                This browser could not read its retained checkpoint request. Restore browser storage
                access and reload before making another checkpoint change.
              </p>
            ) : rowUncertain ? (
              <>
                <p>Deleting “{rowUncertain.save.label}” did not return a confirmed result.</p>
                <Button busy={rowBusy} onPress={() => void run('delete', rowUncertain.save)}>
                  Retry the same delete
                </Button>
              </>
            ) : null}
            <p className="ol-caption">
              Other checkpoint changes wait until the original result is known.
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
            Creating “{pendingRequest?.label ?? (label.trim() || 'Manual save')}”… If another
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
            {confirm?.save.id === save.id && (!unresolved || rowBusy) && (
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
