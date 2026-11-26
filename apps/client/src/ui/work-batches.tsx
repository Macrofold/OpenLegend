import { Fragment, useEffect, useRef, useState } from 'react';
import type {
  ApiResult,
  GameView,
  WorkBatchPreview,
  WorkBatchRequest,
  WorkBatchSelection,
} from '@open-legend/protocol';
import type { CommandDispatcher } from '../command-request';
import { post, postContactRead } from '../api';
import { actionSubjectKey, playerActionStatusKey } from '../action-browser';
import { Button, SelectField } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import type { InventoryCommandOperations } from './use-inventory-command';
import './recipe-details.css';
import './work-batches.css';
export interface WorkBatchEntry {
  id: string;
  owner: string;
  label: string;
  selection: WorkBatchSelection;
}
export function WorkBatches({
  view,
  connected,
  visible,
  entry,
  operations,
  resolutionRevision,
  close,
}: {
  view: GameView;
  connected: boolean;
  visible: boolean;
  entry?: WorkBatchEntry;
  operations: InventoryCommandOperations;
  resolutionRevision: number;
  close(): void;
}) {
  const [draft, setDraft] = useState<{
    id: string;
    repeating: boolean;
    count: string;
    countEdited?: boolean;
    gatheringChoice?: string;
    mode: WorkBatchRequest['mode'];
  }>();
  const chosen = draft?.id === entry?.id ? draft : undefined;
  const repeating = chosen?.repeating ?? false,
    count = repeating ? Number(chosen?.count ?? '1') : 1,
    mode = chosen?.mode ?? 'replace';
  function edit(change: Partial<NonNullable<typeof draft>>) {
    if (entry)
      setDraft({
        id: entry.id,
        repeating,
        count: chosen?.count ?? '1',
        countEdited: chosen?.countEdited,
        gatheringChoice: chosen?.gatheringChoice,
        mode,
        ...change,
      });
  }
  const gatheringChoice =
    chosen?.gatheringChoice ??
    (entry?.selection.kind === 'gather'
      ? entry.selection.gatheringMode === 'bare-hands'
        ? 'hands'
        : entry.selection.itemId
          ? `tool:${entry.selection.itemId}`
          : 'auto'
      : 'auto');
  const selection =
    entry?.selection.kind === 'gather'
      ? {
          kind: 'gather' as const,
          targetId: entry.selection.targetId,
          ...(gatheringChoice === 'hands'
            ? { gatheringMode: 'bare-hands' as const }
            : gatheringChoice.startsWith('tool:')
              ? { itemId: gatheringChoice.slice(5) }
              : {}),
        }
      : entry?.selection;
  const request: WorkBatchRequest | undefined = selection
    ? { selection, batches: count, mode }
    : undefined;
  const draftKey = JSON.stringify([entry?.id, request]);
  const sourceId = entry?.selection.kind === 'gather' ? entry.selection.targetId : undefined;
  const source = sourceId ? view.entities.find((entity) => entity.id === sourceId) : undefined;
  const [refresh, setRefresh] = useState(0),
    [read, setRead] = useState<{
      entryId: string;
      key: string;
      draftKey: string;
      value?: WorkBatchPreview;
      error?: string;
    }>();
  // Keep editable policy choices only for this selected task. A new entry (or
  // another character's entry) cannot briefly display the earlier task's tools.
  const entryRead = read?.entryId === entry?.id ? read : undefined;
  const entryId = entry?.id;
  const available = visible && connected;
  const [availability, setAvailability] = useState({ available, revision: 0 });
  if (availability.available !== available)
    setAvailability({ available, revision: availability.revision + 1 });
  const key = JSON.stringify([
    draftKey,
    view.access?.scope,
    view.commandEpoch,
    view.player.inventoryRevision,
    playerActionStatusKey(view.player),
    view.player.action?.id,
    view.player.activity?.status,
    view.player.workBatchRevision,
    entry?.selection.kind === 'meal'
      ? view.player.attributes
          .filter(
            (attribute) => !entryRead?.value?.meterId || attribute.id === entryRead.value.meterId,
          )
          .map((attribute) => [
            attribute.id,
            attribute.version,
            typeof attribute.value === 'number' ? Math.floor(attribute.value) : attribute.value,
            attribute.max,
            attribute.value === attribute.max,
          ])
      : undefined,
    view.clock.paused,
    actionSubjectKey(source),
    availability.revision,
    refresh,
    resolutionRevision,
  ]);
  const currentKey = useRef<string | undefined>(undefined);
  currentKey.current = available ? key : undefined;
  const [checking, setChecking] = useState(false);
  const shown = entryRead?.draftKey === draftKey ? entryRead.value : undefined,
    policy = entryRead?.value?.policy;
  const validCount =
    Number.isSafeInteger(count) && count >= 1 && (!policy || count <= policy.maximumBatches);
  const submitting = useRef(false);
  useEffect(() => {
    if (!entryId || !available || !request || !validCount || operations.pending) return;
    const abort = new AbortController();
    let live = true;
    const unavailable = (message: string) => {
      if (live && currentKey.current === key)
        setRead((old) => ({
          entryId,
          key,
          draftKey,
          value: old?.draftKey === draftKey ? old.value : undefined,
          error: message,
        }));
    };
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const value = await postContactRead<WorkBatchPreview | (ApiResult & { ok: false })>(
          '/api/work-batches/preview',
          request,
          [],
          AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
        );
        // HTTP refusals carry a public result, not the prepared work's facts.
        // Keep the selection and any prior facts; a failed check grants no Start.
        if (!value.ok) unavailable(value.message);
        else if (live && currentKey.current === key) setRead({ entryId, key, draftKey, value });
      } catch {
        unavailable('The selected work could not be checked. Nothing was started.');
      } finally {
        if (live) setChecking(false);
      }
    }, 180);
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timer);
      setChecking(false);
    };
  }, [available, key, validCount, !!operations.pending]);
  const ready =
    available &&
    view.player.alive &&
    !view.clock.paused &&
    validCount &&
    !operations.pending &&
    entryRead?.key === key &&
    !entryRead.error &&
    !!shown?.result.ok &&
    !!shown.digest;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  async function start() {
    if (submitting.current || !readyRef.current || !request || !shown?.digest) return;
    submitting.current = true;
    try {
      await operations.dispatch({
        id: 'repeat-work',
        label: shown.name ?? entry!.label,
        enabled: true,
        command: { type: 'repeat-work', workBatch: request, workBatchDigest: shown.digest },
      });
    } finally {
      submitting.current = false;
    }
  }
  const stop = view.player.controls.find((option) => option.command.type === 'cancel');
  if (!entry && !operations.pending && !operations.message) return null;
  return (
    <section className="ol-construction ol-work-batches" aria-label="Selected finite work">
      {operations.pending && (
        <div role="status">
          <p>
            {operations.pending.request?.label ?? 'Earlier selected work'}:{' '}
            {operations.pending.status === 'sending'
              ? 'Sending'
              : operations.pending.status === 'checking'
                ? 'Checking the original result'
                : 'Original request needs recovery'}
          </p>
          <Button
            disabled={!connected || operations.pending.status !== 'unknown'}
            onPress={() => void operations.check()}
          >
            {operations.pending.request ? 'Check result' : 'Read retained request'}
          </Button>
          {!operations.pending.request && (
            <p>The original request could not be read. New batches remain blocked.</p>
          )}
        </div>
      )}
      {operations.message && <p role="status">{operations.message}</p>}
      {view.player.activity && (
        <p role="status">
          {view.player.activity.name}: {view.player.activity.status}
          {view.player.activity.quantity
            ? ` — ${view.player.activity.quantity.completed} / ${view.player.activity.quantity.requested} ${view.player.activity.quantity.unitLabel} completed`
            : ''}
          {view.player.activity.reason ? ` — ${view.player.activity.reason}` : ''}
        </p>
      )}
      {entry && (
        <>
          <h3>{shown?.name ?? entry.label}</h3>
          {policy && (
            <>
              <div className="ol-actions" role="group" aria-label="Work count">
                <Button
                  variant={repeating ? 'quiet' : 'secondary'}
                  aria-pressed={!repeating}
                  onPress={() => edit({ repeating: false })}
                >
                  {policy.onceLabel}
                </Button>
                <Button
                  variant={repeating ? 'secondary' : 'quiet'}
                  aria-pressed={repeating}
                  onPress={() =>
                    edit({
                      repeating: true,
                      ...(entry.selection.kind === 'meal' && !chosen?.countEdited
                        ? { count: String(Math.max(1, shown?.suggestedCount ?? 1)) }
                        : {}),
                    })
                  }
                >
                  {policy.repeatLabel}
                </Button>
              </div>
              {repeating && (
                <label>
                  {policy.countLabel}
                  <input
                    type="number"
                    min={1}
                    max={policy.maximumBatches}
                    step={1}
                    value={chosen?.count ?? '1'}
                    onChange={(event) => edit({ count: event.target.value, countEdited: true })}
                  />
                </label>
              )}
              {!validCount && (
                <p role="status">Choose a whole count from 1 to {policy.maximumBatches}.</p>
              )}
              <p>{policy.help}</p>
            </>
          )}
          {entryRead?.value?.gatheringChoices && (
            <SelectField
              label={entryRead.value.gatheringChoices.label}
              value={gatheringChoice}
              options={[
                { id: 'auto', label: entryRead.value.gatheringChoices.automaticLabel },
                { id: 'hands', label: entryRead.value.gatheringChoices.handsLabel },
                ...entryRead.value.gatheringChoices.tools.map((tool) => ({
                  id: `tool:${tool.itemId}`,
                  label: tool.label,
                })),
                ...(gatheringChoice.startsWith('tool:') &&
                !entryRead.value.gatheringChoices.tools.some(
                  (tool) => `tool:${tool.itemId}` === gatheringChoice,
                )
                  ? [{ id: gatheringChoice, label: 'Chosen tool unavailable' }]
                  : []),
              ]}
              onChange={(value) => edit({ gatheringChoice: value })}
            />
          )}
          {(view.player.hasWork || mode !== 'replace') && (
            <SelectField
              label="Current work"
              value={mode}
              options={[
                { id: 'replace', label: 'Replace current work' },
                { id: 'enqueue', label: 'Start after current work' },
                { id: 'interrupt', label: 'Pause current work and return later' },
              ]}
              onChange={(value) => edit({ mode: value as WorkBatchRequest['mode'] })}
            />
          )}
          {view.player.hasWork && (
            <p>
              {mode === 'replace'
                ? 'Starting replaces your current work. Completed effects and spent materials remain.'
                : mode === 'interrupt'
                  ? 'The unfinished step of current work must restart when you return; spent materials remain spent.'
                  : 'Later steps check their own materials and tools when they start. They reserve nothing now.'}
            </p>
          )}
          {shown && (
            <>
              <div className="ol-recipe-details">
                <dl>
                  {shown.facts.map(([label, value]) => (
                    <Fragment key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
              <p role="status">
                {entryRead?.key === key
                  ? shown.result.message
                  : 'Checking current conditions before starting.'}
              </p>
            </>
          )}
          <LoadingIndicator
            active={checking || (!shown && !entryRead?.error)}
            label="Checking selected work"
          />
          {entryRead?.key === key && entryRead.error && <p role="status">{entryRead.error}</p>}
          {!connected && <p>Reconnect before checking or starting. Your selection is kept.</p>}
          {view.clock.paused && <p>Resume the world before starting selected work.</p>}
          <div className="ol-actions">
            <Button disabled={!ready} onPress={() => void start()}>
              {policy?.startLabel ?? 'Start'}
            </Button>
            <Button
              variant="quiet"
              disabled={!available || checking || !!operations.pending}
              onPress={() => setRefresh((value) => value + 1)}
            >
              Check again
            </Button>
            <Button variant="quiet" onPress={close}>
              Other activities
            </Button>
          </div>
        </>
      )}
      {stop && view.player.hasWork && (
        <Button
          disabled={!connected || !!operations.pending || !stop.enabled}
          onPress={() => void operations.dispatch(stop)}
        >
          {stop.label}
        </Button>
      )}
    </section>
  );
}
