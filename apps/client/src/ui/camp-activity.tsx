import { useEffect, useId, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type {
  ActionOption,
  ActivityChoice,
  ActivityChoicePage,
  ActivityEntry,
  ActivityRequestsView,
  ApiResult,
  CommandInput,
  CommandReceiptResult,
  GameView,
} from '@open-legend/protocol';
import { post } from '../api';
import type { CommandDispatcher, CommandRequestIdentity } from '../command-request';
import { Button, Icon, Section, SelectField, Tag } from '../design-system/components';
import { ActivityObjectField } from './activity-object-field';
import { clockParts, EventTime } from './event-time';
import './camp-activity.css';

export type { ActivityEntry } from '@open-legend/protocol';
type Entry = Pick<ActivityEntry, 'familyId' | 'targetId'>;
type StatusView = Pick<ActivityRequestsView, 'ok' | 'scope' | 'simTime' | 'status'>;
type WorkMode = 'enqueue' | 'replace' | 'interrupt';
type Props = {
  view: GameView;
  connected: boolean;
  visible?: boolean;
  entry?: Entry;
  command: CommandDispatcher;
};
type PendingTask = { request: CommandRequestIdentity; action: ActionOption };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function storedCommand(value: unknown): value is CommandInput {
  if (!record(value)) return false;
  if (value.type === 'cancel') return Object.keys(value).length === 1;
  if (value.type === 'activity-request')
    return (
      typeof value.activityFamilyId === 'string' &&
      record(value.activityArguments) &&
      Object.values(value.activityArguments).every(
        (item) =>
          typeof item === 'string' ||
          typeof item === 'boolean' ||
          (typeof item === 'number' && Number.isFinite(item)),
      )
    );
  if (value.type === 'inspect-inventory')
    return (
      typeof value.containerId === 'string' &&
      (value.after === undefined || typeof value.after === 'string') &&
      (value.expectedScope === undefined || typeof value.expectedScope === 'string') &&
      (value.expectedRevision === undefined || Number.isSafeInteger(value.expectedRevision))
    );
  const position = value.position;
  return (
    value.type === 'move' &&
    record(position) &&
    ['x', 'y', 'z'].every(
      (axis) => typeof position[axis] === 'number' && Number.isFinite(position[axis]),
    ) &&
    typeof position.surfaceId === 'string'
  );
}
function readPending(key: string): PendingTask | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (
      record(value) &&
      record(value.request) &&
      record(value.action) &&
      typeof value.request.commandId === 'string' &&
      typeof value.request.commandEpoch === 'string' &&
      typeof value.action.id === 'string' &&
      typeof value.action.label === 'string' &&
      value.action.enabled === true &&
      storedCommand(value.action.command)
    )
      return {
        request: { commandId: value.request.commandId, commandEpoch: value.request.commandEpoch },
        action: {
          id: value.action.id,
          label: value.action.label,
          enabled: true,
          command: value.action.command,
        },
      };
  } catch {
    /* An invalid private draft cannot grant an executable request. */
  }
}

/** Exact-target discovery uses authored role predicates; opening a task is only a read.
 * docs/projects/parallel-batch-01-playable-week/camp-activities.md#observation-memory-and-ordinary-ui */
export function ActivityEntries({
  view,
  targetId,
  connected,
  onOpen,
  query = '',
  presentation,
  onMatchCount,
}: {
  view: GameView;
  targetId: string;
  connected: boolean;
  onOpen(entry: ActivityEntry): void;
  query?: string;
  presentation?: 'menu';
  onMatchCount?(count: number): void;
}) {
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    entries?: ActivityEntry[];
    error?: string;
  }>();
  const permitted = connected && view.access?.controlling !== false && view.player.alive;
  const target = view.entities.find((entity) => entity.id === targetId);
  const key = JSON.stringify([
    view.access?.scope,
    view.worldId,
    view.saveTimeline,
    view.player.id,
    targetId,
    target?.status,
    refresh,
    permitted,
  ]);
  const current = result?.key === key ? result : undefined;
  const search = query.trim().toLocaleLowerCase();
  const entries = (current?.entries ?? []).filter((entry) =>
    `${entry.label} ${entry.description}`.toLocaleLowerCase().includes(search),
  );
  const matchCount = permitted ? entries.length : 0;
  useEffect(() => {
    onMatchCount?.(matchCount);
  }, [key, query, matchCount, onMatchCount]);
  useEffect(() => {
    if (!permitted) return;
    const abort = new AbortController();
    void post<ActivityRequestsView>('/api/activity-requests', { targetId }, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted)
          setResult(
            value.ok && value.scope === view.access?.scope
              ? { key, entries: value.entries }
              : { key, error: 'Tasks are unavailable. Refresh this object.' },
          );
      })
      .catch(() => {
        if (!abort.signal.aborted) setResult({ key, error: 'Tasks could not be read.' });
      });
    return () => abort.abort();
  }, [key]);
  if (!permitted) return null;
  return (
    <div className="ol-task-entries">
      {!current && (
        <p className="ol-caption" role="status">
          Reading available tasks…
        </p>
      )}
      {entries.map((entry) =>
        presentation === 'menu' ? (
          <AriaButton
            key={entry.familyId}
            data-picker-row
            className="ol-item"
            onPress={() => onOpen(entry)}
          >
            <Icon name="ui.next" />
            <span>
              {entry.label}
              <small className="ol-task-entry-description">{entry.description}</small>
            </span>
            <small className="ol-item-hint">Prepare</small>
          </AriaButton>
        ) : (
          <Button key={entry.familyId} size="sm" onPress={() => onOpen(entry)}>
            <strong>{entry.label}</strong>
            <span className="ol-task-entry-description">{entry.description}</span>
          </Button>
        ),
      )}
      {current?.error && (
        <>
          <p role="status">{current.error}</p>
          <Button size="sm" variant="quiet" onPress={() => setRefresh((value) => value + 1)}>
            Refresh tasks
          </Button>
        </>
      )}
    </div>
  );
}

function readDraft(key: string): Record<string, string> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every((entry) => typeof entry === 'string')
    )
      return value as Record<string, string>;
  } catch {
    /* Private draft storage is optional; it never grants access. */
  }
  return {};
}

/** Context changes remount only this task; its private draft remains scoped to the exact object. */
export function CampActivity(props: Props) {
  const { view, entry } = props;
  const key = JSON.stringify([
    view.access?.scope,
    view.worldId,
    view.saveTimeline,
    view.player.id,
    entry?.familyId,
    entry?.targetId,
  ]);
  return <ActivityTask key={key} {...props} />;
}

function ActivityTask({ view, connected, visible = true, entry, command }: Props) {
  const draftKey = `open-legend:action-draft:camp-task:${view.access?.privateDraftScope}:${view.worldId}:${view.saveTimeline}:${view.player.id}:${entry?.familyId}:${entry?.targetId}`;
  const recoveryScope = view.access?.commandRecoveryScope;
  const pendingKey = `open-legend:activity-command:${recoveryScope}:${view.worldId}:${view.saveTimeline}:${view.player.id}`;
  const [draft, setDraft] = useState(() => readDraft(draftKey));
  const [preparing, setPreparing] = useState(() => {
    try {
      return sessionStorage.getItem(`${draftKey}:presentation`) !== 'current';
    } catch {
      return true;
    }
  });
  const [mode, setMode] = useState<WorkMode>('enqueue');
  const [editing, setEditing] = useState<'supply' | 'amount' | 'stop' | null>(null);
  const [choices, setChoices] = useState<ActivityRequestsView>();
  const [status, setStatus] = useState<{ value: StatusView; revision: number }>();
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [operation, setOperation] = useState<'start' | 'stop' | 'native' | null>(null);
  const [unresolved, setUnresolved] = useState(() =>
    recoveryScope ? readPending(pendingKey) : undefined,
  );
  const [recovering, setRecovering] = useState(false);
  const [selections, setSelections] = useState<
    Record<string, { key: string; page: ActivityChoicePage }>
  >({});
  const [review, setReview] = useState<{ key: string; result: ApiResult; input: CommandInput }>();
  const alive = useRef(true);
  const task = useRef<HTMLDivElement>(null);
  const focusOwner = useRef<Element | null>(null);
  const taskVisible = useRef(visible);
  taskVisible.current = visible;
  if (!visible) focusOwner.current = null;
  const pending = useRef<string | undefined>(undefined);
  const statusTicket = useRef(0);
  const statusAbort = useRef<AbortController | undefined>(undefined);
  const fieldId = useId();
  const unavailable = !connected || view.access?.controlling === false || !view.player.alive;
  const descriptor = choices?.requests.find((request) => request.id === entry?.familyId);
  const presentation = descriptor?.presentation;
  const bound =
    !!entry &&
    choices?.entries.some(
      (choice) => choice.familyId === entry.familyId && choice.targetId === entry.targetId,
    );
  const values: Record<string, string> = { ...draft };
  if (presentation && entry && descriptor) {
    values[presentation.target] = entry.targetId;
    values[presentation.workMode] = mode;
    if (presentation.kind !== 'replenish-session')
      values[presentation.reserve] ??= String(
        descriptor.fields[presentation.reserve]?.minimum ?? '',
      );
    if (presentation.kind === 'resource-care') {
      values[presentation.supply] ??= view.player.id;
      values[presentation.budget] ??= String(descriptor.fields[presentation.budget]?.minimum ?? '');
      values[`${presentation.stop}:when`] ??= 'duration';
    } else if (presentation.kind === 'gather-store-use')
      values[presentation.quantity] ??= String(
        descriptor.fields[presentation.quantity]?.minimum ?? '',
      );
  }
  const activity =
    status && status.revision >= view.revision ? status.value.status : view.player.activity;
  const stoppable =
    !!activity && ['active', 'blocked', 'paused', 'queued', 'waiting'].includes(activity.status);
  const working = stoppable || view.player.hasWork;
  const workTitle = activity && !working ? 'Last task' : 'Current work';
  const stopAction = view.player.actions.find((action) => action.command.type === 'cancel');

  function selectionKey(key: string) {
    const field = descriptor?.fields[key];
    const sourceId = field?.discovery?.sourceField
      ? values[field.discovery.sourceField]
      : undefined;
    return JSON.stringify([
      view.access?.scope,
      entry,
      key,
      values[key],
      values[`${key}:witness`],
      sourceId,
      view.player.position,
      view.player.inventoryRevision,
      view.entities.find((entity) => entity.id === values[key]),
      view.entities.find((entity) => entity.id === sourceId),
      refresh,
    ]);
  }
  function selectedPage(key: string) {
    const selected = selections[key];
    return selected?.key === selectionKey(key) ? selected.page : undefined;
  }
  function change(key: string, value: string, witnessId?: string) {
    const next = { ...draft, [key]: value };
    if (witnessId) next[`${key}:witness`] = witnessId;
    else delete next[`${key}:witness`];
    for (const [dependent, field] of Object.entries(descriptor?.fields ?? {})) {
      if (field.discovery?.sourceField === key) {
        delete next[dependent];
        delete next[`${dependent}:witness`];
      }
    }
    setDraft(next);
    setError('');
    setMessage('');
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      /* Optional private storage. */
    }
  }
  function showPreparation(value: boolean) {
    setPreparing(value);
    try {
      sessionStorage.setItem(`${draftKey}:presentation`, value ? 'prepare' : 'current');
    } catch {
      /* Hiding still retains this presentation while the task is mounted. */
    }
  }
  function rememberFocus() {
    focusOwner.current = task.current?.contains(document.activeElement)
      ? document.activeElement
      : null;
  }
  function focusAfterChange(target: () => HTMLElement | null) {
    const owner = focusOwner.current;
    if (!owner) return;
    requestAnimationFrame(() => {
      if (
        alive.current &&
        taskVisible.current &&
        focusOwner.current === owner &&
        (document.activeElement === owner || document.activeElement === document.body)
      )
        target()?.focus();
      if (focusOwner.current === owner) focusOwner.current = null;
    });
  }
  useEffect(() => {
    // Disabling Start may leave focus on body; any newer user intent cancels the return.
    const moved = (event: Event) => {
      if (
        event.type !== 'focusin' ||
        (event.target !== focusOwner.current && event.target !== document.body)
      )
        focusOwner.current = null;
    };
    document.addEventListener('focusin', moved);
    document.addEventListener('pointerdown', moved, true);
    window.addEventListener('blur', moved);
    return () => {
      document.removeEventListener('focusin', moved);
      document.removeEventListener('pointerdown', moved, true);
      window.removeEventListener('blur', moved);
    };
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      statusTicket.current++;
      statusAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!visible || unavailable) return;
    const abort = new AbortController();
    void post<ActivityRequestsView>(
      '/api/activity-requests',
      entry ? { targetId: entry.targetId } : {},
      abort.signal,
    )
      .then((result) => {
        if (abort.signal.aborted) return;
        if (!result.ok || result.scope !== view.access?.scope)
          throw new Error('Task choices are unavailable.');
        setChoices(result);
        setStatus({ value: result, revision: view.revision });
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setError(reason instanceof Error ? reason.message : 'Task choices are unavailable.');
      });
    return () => abort.abort();
  }, [visible, unavailable, refresh]);

  const input: CommandInput = {
    type: 'activity-request',
    activityFamilyId: entry?.familyId,
    activityArguments: {},
  };
  const issues: Record<string, string> = {};
  for (const [key, field] of Object.entries(descriptor?.fields ?? {})) {
    const value = values[key] ?? '';
    if (field.type === 'time') {
      const when = values[`${key}:when`];
      const duration = values[`${key}:duration`] ?? '';
      const seconds = Number(duration) * 60;
      const deadline =
        when === 'duration'
          ? duration.trim() &&
            Number.isFinite(seconds) &&
            seconds >= (field.minimumDuration ?? 0) &&
            seconds <= (field.maximumDuration ?? Infinity)
            ? view.clock.seconds + seconds
            : undefined
          : choices?.timeOptions?.namedDeadlines.find((time) => time.name === when)?.at;
      if (
        deadline === undefined ||
        deadline <= view.clock.seconds ||
        deadline < (field.minimum ?? 0) ||
        deadline > (field.maximum ?? Infinity) ||
        deadline - view.clock.seconds > (field.maximumDuration ?? Infinity)
      )
        issues[key] = `Choose a future ${field.label.toLowerCase()} within the supported duration.`;
      else input.activityArguments![key] = deadline;
    } else if (field.type === 'integer') {
      const amount = Number(value);
      if (
        !value.trim() ||
        !Number.isSafeInteger(amount) ||
        amount < (field.minimum ?? -Infinity) ||
        amount > (field.maximum ?? Infinity)
      )
        issues[key] = `Choose a valid ${field.label.toLowerCase()}.`;
      else input.activityArguments![key] = amount;
    } else if (field.type === 'mode') input.activityArguments![key] = mode;
    else if (!value || !selectedPage(key)?.selected?.accessible)
      issues[key] = `Choose or recheck ${field.label.toLowerCase()}.`;
    else input.activityArguments![key] = value;
  }
  const reviewKey = JSON.stringify([
    choices?.scope,
    entry,
    values,
    Object.keys(descriptor?.fields ?? {}).map((key) => [
      key,
      selectionKey(key),
      selectedPage(key)?.evidence,
    ]),
  ]);
  const currentReview = review?.key === reviewKey ? review : undefined;
  const expired =
    !!currentReview &&
    Object.entries(descriptor?.fields ?? {}).some(
      ([key, field]) =>
        field.type === 'time' &&
        Number(currentReview.input.activityArguments?.[key]) <= view.clock.seconds,
    );
  const ready = !!presentation && !!bound && !Object.keys(issues).length && !unavailable;
  const latestReviewKey = useRef(reviewKey);
  latestReviewKey.current = reviewKey;
  useEffect(() => {
    if (!ready || !visible || !preparing) return;
    const abort = new AbortController();
    // Read-only prerequisites appear automatically. A changing clock never extends the checked deadline.
    const selectedInput = { ...input, activityArguments: { ...input.activityArguments } };
    const timer = setTimeout(() => {
      void post<ApiResult>('/api/activity-preview', selectedInput, abort.signal)
        .then((result) => {
          if (!abort.signal.aborted) setReview({ key: reviewKey, input: selectedInput, result });
        })
        .catch((reason: unknown) => {
          if (!abort.signal.aborted)
            setReview({
              key: reviewKey,
              input: selectedInput,
              result: {
                ok: false,
                code: 'unavailable',
                message:
                  reason instanceof Error ? reason.message : 'Supplies could not be checked.',
              },
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [reviewKey, ready, visible, preparing]);

  async function refreshStatus() {
    const ticket = ++statusTicket.current;
    statusAbort.current?.abort();
    const abort = new AbortController();
    statusAbort.current = abort;
    try {
      const result = await post<StatusView>('/api/activity-status', {}, abort.signal);
      if (
        alive.current &&
        ticket === statusTicket.current &&
        result.ok &&
        result.scope === view.access?.scope
      )
        setStatus({ value: result, revision: view.revision });
    } catch (reason) {
      if (alive.current && !abort.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Current work could not be read.');
    }
  }
  async function perform(action: ActionOption, kind: 'start' | 'stop' | 'native') {
    if (pending.current || unavailable || unresolved) return undefined;
    if (!view.commandEpoch || !recoveryScope) {
      setError('Refresh your connection before starting work.');
      return undefined;
    }
    const request = { commandId: crypto.randomUUID(), commandEpoch: view.commandEpoch };
    const saved = { request, action };
    // Preserve the exact intention before dispatch so hiding/reopening cannot create a fresh retry.
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(saved));
    } catch {
      setError(
        'This browser could not retain the request for safe recovery. Allow session storage before starting work.',
      );
      return undefined;
    }
    setUnresolved(saved);
    pending.current = request.commandId;
    if (kind === 'start') rememberFocus();
    setOperation(kind);
    setError('');
    setMessage('');
    try {
      const result = await command(action, request);
      if (!alive.current || pending.current !== request.commandId) return result;
      if (result.code === 'unconfirmed')
        setError('Delivery is uncertain. Check this exact request before starting other work.');
      else acceptReceipt(result, request.commandId, action.command);
      await refreshStatus();
      if (alive.current && pending.current === request.commandId) setRefresh((value) => value + 1);
      return result;
    } catch (reason) {
      if (alive.current && pending.current === request.commandId) {
        setError(
          `${reason instanceof Error ? reason.message : 'Delivery is uncertain.'} No action is repeated automatically.`,
        );
      }
      return undefined;
    } finally {
      if (pending.current === request.commandId) {
        pending.current = undefined;
        if (alive.current) setOperation(null);
      }
    }
  }
  function acceptReceipt(result: ApiResult, commandId: string, input: CommandInput) {
    if (!alive.current || pending.current !== commandId) return;
    try {
      if (readPending(pendingKey)?.request.commandId === commandId)
        sessionStorage.removeItem(pendingKey);
    } catch {
      /* A retained receipt can be checked again. */
    }
    setUnresolved((current) => (current?.request.commandId === commandId ? undefined : current));
    if (result.ok) {
      setError('');
      setMessage(result.message);
      if (
        entry &&
        bound &&
        presentation &&
        input.type === 'activity-request' &&
        input.activityFamilyId === entry.familyId &&
        input.activityArguments?.[presentation.target] === entry.targetId
      ) {
        showPreparation(false);
        setEditing(null);
        focusAfterChange(() => task.current);
      }
    } else setError(result.message);
  }
  async function recover() {
    if (!unresolved || unavailable || recovering || pending.current) return;
    const commandId = unresolved.request.commandId;
    rememberFocus();
    pending.current = commandId;
    setRecovering(true);
    try {
      const receipt = await post<CommandReceiptResult>('/api/command/receipt', {
        ...unresolved.request,
        command: unresolved.action.command,
      });
      if (!alive.current || pending.current !== commandId) return;
      if (receipt.scope !== view.access?.scope)
        throw new Error('Your access changed. Reopen this task.');
      if (receipt.status === 'resolved') {
        acceptReceipt(receipt.result, commandId, unresolved.action.command);
        await refreshStatus();
        if (alive.current && pending.current === commandId) setRefresh((value) => value + 1);
      } else setError(receipt.message);
    } catch (reason) {
      if (alive.current && pending.current === commandId)
        setError(reason instanceof Error ? reason.message : 'This request could not be checked.');
    } finally {
      if (pending.current === commandId) {
        pending.current = undefined;
        if (alive.current) setRecovering(false);
      }
    }
  }
  async function start() {
    if (
      !ready ||
      !currentReview?.result.ok ||
      expired ||
      latestReviewKey.current !== currentReview.key
    )
      return;
    await perform(
      {
        id: `start-${entry!.familyId}`,
        label: descriptor!.label,
        command: currentReview.input,
        enabled: true,
      },
      'start',
    );
  }
  const disabled = unavailable || !!operation || !!unresolved || recovering;
  function edit(kind: NonNullable<typeof editing>) {
    rememberFocus();
    setEditing(kind);
    focusAfterChange(() => {
      const editor = document.getElementById(`${fieldId}-editor-${kind}`);
      const duration =
        kind === 'stop'
          ? editor?.querySelector<HTMLElement>('input:not([role="combobox"])')
          : undefined;
      return duration ?? editor?.querySelector<HTMLElement>('input,button') ?? null;
    });
  }
  function closeEditor() {
    const previous = editing;
    rememberFocus();
    setEditing(null);
    focusAfterChange(() => document.getElementById(`${fieldId}-change-${previous}`));
  }
  function choiceLabel(key: string) {
    return selectedPage(key)?.selected?.label ?? 'Choose';
  }
  function amountSummary() {
    if (!presentation || presentation.kind === 'replenish-session') return null;
    const quantity =
      values[
        presentation.kind === 'resource-care' ? presentation.budget : presentation.quantity
      ]?.trim();
    const reserve = values[presentation.reserve]?.trim();
    return (
      <>
        {quantity ? (
          <>
            {presentation.kind === 'resource-care' ? 'Use at most' : 'Put'}{' '}
            <strong>{quantity}</strong> {Number(quantity) === 1 ? 'unit' : 'units'}
            {presentation.kind === 'gather-store-use' ? ' into the selected storage' : ''}.
          </>
        ) : (
          'Choose an amount.'
        )}{' '}
        {reserve ? (
          <>
            Keep at least <strong>{reserve}</strong> available to you.
          </>
        ) : (
          'Choose a reserve.'
        )}
      </>
    );
  }
  const scheduling = working && entry && presentation && bound && (
    <div className="ol-task-replacement">
      <p>Preparing this task leaves current work unchanged.</p>
      <div className="ol-actions">
        <Button
          size="sm"
          variant={mode === 'enqueue' ? 'secondary' : 'quiet'}
          disabled={disabled}
          onPress={() => setMode('enqueue')}
        >
          After current work
        </Button>
        <Button
          size="sm"
          variant={mode === 'replace' ? 'secondary' : 'quiet'}
          disabled={disabled}
          onPress={() => setMode('replace')}
        >
          Prepare replacement
        </Button>
        <Button
          size="sm"
          variant={mode === 'interrupt' ? 'secondary' : 'quiet'}
          disabled={disabled}
          onPress={() => setMode('interrupt')}
        >
          Pause and resume current work
        </Button>
      </div>
    </div>
  );
  function editButton(kind: NonNullable<typeof editing>, label: string) {
    return (
      <Button
        id={`${fieldId}-change-${kind}`}
        size="sm"
        variant="quiet"
        disabled={disabled}
        aria-expanded={editing === kind}
        aria-controls={`${fieldId}-editor-${kind}`}
        onPress={() => edit(kind)}
      >
        {label}
      </Button>
    );
  }
  function objectChoice(key: string, readOnly = false) {
    const field = descriptor?.fields[key];
    if (!field?.discovery || !choices) return null;
    return (
      <ActivityObjectField
        key={key}
        family={descriptor!.id}
        fieldId={key}
        field={field}
        value={values[key] ?? ''}
        witnessId={values[`${key}:witness`]}
        sourceId={field.discovery.sourceField ? values[field.discovery.sourceField] : undefined}
        scope={choices.scope}
        readKey={selectionKey(key)}
        page={selectedPage(key)}
        visible={visible && preparing}
        connected={!unavailable}
        busy={!!operation || !!unresolved || recovering}
        working={working}
        readOnly={readOnly}
        onRead={(keyValue, page) =>
          setSelections((previous) => ({ ...previous, [key]: { key: keyValue, page } }))
        }
        onChange={(choice: ActivityChoice) => change(key, choice.id, choice.witnessId)}
        onAction={(native, label) =>
          perform({ id: `task-${native.type}`, label, command: native, enabled: true }, 'native')
        }
      />
    );
  }
  function amountChoice(key: string) {
    const field = descriptor?.fields[key];
    if (!field) return null;
    return (
      <label className="ol-task-amount">
        <span>{field.label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={values[key] ?? ''}
          disabled={disabled}
          aria-invalid={(draft[key] !== undefined && !!issues[key]) || undefined}
          aria-describedby={`${fieldId}-${key}-hint`}
          onChange={(event) => change(key, event.target.value)}
        />
        <span className="ol-caption" id={`${fieldId}-${key}-hint`}>
          Whole units{field.minimum !== undefined ? ` · at least ${field.minimum}` : ''}
          {field.maximum !== undefined ? ` · at most ${field.maximum}` : ''}.
          {draft[key] !== undefined && issues[key] ? ` ${issues[key]}` : ''}
        </span>
      </label>
    );
  }
  return (
    <div
      ref={task}
      className="ol-camp-activities"
      role="group"
      aria-label={preparing ? 'Task preparation' : workTitle}
      tabIndex={-1}
      onKeyDown={(event) => {
        // Portaled pickers close their own layer before the task editor handles Escape.
        if (!event.currentTarget.contains(event.target as Node)) return;
        if (event.defaultPrevented) return;
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          if (!editing) return;
          event.preventDefault();
          closeEditor();
        }
        event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {unresolved && (
        <div className="ol-task-recovery" role="status">
          <p>
            Awaiting the exact result of {unresolved.action.label}. Current work alone does not
            prove whether this request arrived.
          </p>
          <Button
            variant="quiet"
            disabled={unavailable || !!operation || recovering}
            busy={recovering}
            onPress={() => void recover()}
          >
            Check request result
          </Button>
        </div>
      )}
      {(!entry || activity || working || !preparing) && (
        <Section title={workTitle}>
          {activity ? (
            <div className="ol-task-status" aria-live="polite">
              <p>
                <Tag>{activity.status}</Tag> <strong>{activity.name}</strong>
              </p>
              {activity.reason && <p>{activity.reason}</p>}
              {activity.spent !== undefined && (
                <p>
                  Used {activity.spent}
                  {activity.maximumSpent !== undefined
                    ? ` of at most ${activity.maximumSpent}`
                    : ''}{' '}
                  {activity.spendingUnit ?? 'selected units'}.
                </p>
              )}
              {activity.deadline !== undefined && (
                <p>
                  {stoppable ? 'Stops at' : 'Chosen stopping time'}{' '}
                  <EventTime time={activity.deadline} />.
                </p>
              )}
              {activity.interrupted && (
                <p>This work was interrupted; attendance was not continuous.</p>
              )}
            </div>
          ) : (
            <p>
              {view.player.action?.label ??
                (working ? 'Work is queued or paused.' : 'No current task.')}
            </p>
          )}
          {working && (
            <>
              <Button
                disabled={disabled || !stopAction?.enabled}
                onPress={() => {
                  if (stopAction?.enabled)
                    void perform({ ...stopAction, id: 'stop-current-task' }, 'stop');
                }}
              >
                Stop all work
              </Button>
              <p className="ol-caption">
                Also discards paused work. Completed effects and spent materials remain.
              </p>
              {!stopAction?.enabled && stopAction?.reason && (
                <p className="ol-caption">{stopAction.reason}</p>
              )}
            </>
          )}
          {preparing && scheduling}
        </Section>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {unavailable ? (
        <p role="status">Reconnect and take control of a living character to prepare a task.</p>
      ) : !preparing && entry ? (
        <Button
          variant="quiet"
          disabled={disabled}
          onPress={() => {
            rememberFocus();
            showPreparation(true);
            focusAfterChange(
              () => document.getElementById(`${fieldId}-change-supply`) ?? task.current,
            );
          }}
        >
          Prepare another task
        </Button>
      ) : !entry ? (
        <p>
          Select an object in the world to prepare new work or a replacement. Opening this panel
          changes nothing.
        </p>
      ) : !choices ? (
        <p role="status">Reading this object's tasks…</p>
      ) : !presentation || !bound ? (
        <p role="status">
          This task is not currently available for the selected object. Select a permitted object or
          refresh its tasks.
        </p>
      ) : (
        <Section title={descriptor.label}>
          <div className="ol-task-context">{objectChoice(presentation.target, true)}</div>
          {presentation.kind === 'replenish-session' ? (
            <div className="ol-task-overview">
              <p>{descriptor.description}</p>
            </div>
          ) : (
            <>
              <div className="ol-task-overview">
                <div className="ol-task-overview-row">
                  <p>
                    {
                      descriptor.fields[
                        presentation.kind === 'resource-care'
                          ? presentation.supply
                          : presentation.source
                      ]!.label
                    }
                    :{' '}
                    <strong>
                      {choiceLabel(
                        presentation.kind === 'resource-care'
                          ? presentation.supply
                          : presentation.source,
                      )}
                    </strong>
                    . {descriptor.fields[presentation.material]!.label}:{' '}
                    <strong>{choiceLabel(presentation.material)}</strong>.
                    {presentation.kind === 'gather-store-use' && (
                      <>
                        {' '}
                        {descriptor.fields[presentation.destination]!.label}:{' '}
                        <strong>{choiceLabel(presentation.destination)}</strong>.
                      </>
                    )}
                  </p>
                  {editButton('supply', 'Change supply')}
                </div>
                <div className="ol-task-overview-row">
                  <p>{amountSummary()}</p>
                  {editButton('amount', 'Change amount')}
                </div>
                {presentation.kind === 'resource-care' && (
                  <div className="ol-task-overview-row">
                    <p>
                      {descriptor.fields[presentation.stop]!.label}:{' '}
                      <strong>
                        {values[`${presentation.stop}:when`] === 'duration'
                          ? values[`${presentation.stop}:duration`]?.trim()
                            ? `After ${values[`${presentation.stop}:duration`]} game minutes`
                            : 'Choose a stopping time'
                          : `Next ${values[`${presentation.stop}:when`]}`}
                      </strong>
                      .
                      {currentReview && (
                        <>
                          {' '}
                          <EventTime
                            time={Number(
                              currentReview.input.activityArguments?.[presentation.stop],
                            )}
                          />
                          .
                        </>
                      )}
                    </p>
                    {editButton('stop', 'Change stopping time')}
                  </div>
                )}
              </div>
              <fieldset
                id={`${fieldId}-editor-supply`}
                className="ol-task-choices ol-task-editor"
                disabled={disabled}
                hidden={editing !== 'supply'}
              >
                <legend>Choose supplies</legend>
                {objectChoice(
                  presentation.kind === 'resource-care' ? presentation.supply : presentation.source,
                )}
                {presentation.kind === 'gather-store-use' && objectChoice(presentation.destination)}
                {objectChoice(presentation.material)}
                <Button size="sm" variant="quiet" onPress={closeEditor}>
                  Done
                </Button>
              </fieldset>
              <fieldset
                id={`${fieldId}-editor-amount`}
                className="ol-task-choices ol-task-editor"
                disabled={disabled}
                hidden={editing !== 'amount'}
              >
                <legend>Choose amounts</legend>
                <div className="ol-task-limits">
                  {amountChoice(
                    presentation.kind === 'resource-care'
                      ? presentation.budget
                      : presentation.quantity,
                  )}
                  {amountChoice(presentation.reserve)}
                </div>
                <Button size="sm" variant="quiet" onPress={closeEditor}>
                  Done
                </Button>
              </fieldset>
              {presentation.kind === 'resource-care' && (
                <fieldset
                  id={`${fieldId}-editor-stop`}
                  className="ol-task-choices ol-task-editor"
                  disabled={disabled}
                  hidden={editing !== 'stop'}
                >
                  <legend>Choose stopping time</legend>
                  <SelectField
                    label={descriptor.fields[presentation.stop]!.label}
                    placement="bottom start"
                    value={values[`${presentation.stop}:when`] ?? 'duration'}
                    options={[
                      { id: 'duration', label: 'After a duration' },
                      ...(choices.timeOptions?.namedDeadlines ?? [])
                        .filter((time) => view.clock.namedTimes.includes(time.name))
                        .map((time) => ({
                          id: time.name,
                          label: `Next ${time.name}`,
                          description: `Day ${clockParts(time.at, view.clock.offsetHours).day} · ${clockParts(time.at, view.clock.offsetHours).hour}:${clockParts(time.at, view.clock.offsetHours).minute}`,
                        })),
                    ]}
                    onChange={(when) => {
                      if (!disabled) change(`${presentation.stop}:when`, when);
                    }}
                  />
                  {values[`${presentation.stop}:when`] === 'duration' && (
                    <label className="ol-task-amount">
                      <span>Duration (game minutes)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={values[`${presentation.stop}:duration`] ?? ''}
                        disabled={disabled}
                        aria-describedby={`${fieldId}-duration`}
                        onChange={(event) =>
                          change(`${presentation.stop}:duration`, event.target.value)
                        }
                      />
                      <span className="ol-caption" id={`${fieldId}-duration`}>
                        Choose {(descriptor.fields[presentation.stop]!.minimumDuration ?? 0) / 60}–
                        {(descriptor.fields[presentation.stop]!.maximumDuration ?? 0) / 60} game
                        minutes.
                      </span>
                    </label>
                  )}
                  <Button size="sm" variant="quiet" onPress={closeEditor}>
                    Done
                  </Button>
                </fieldset>
              )}
            </>
          )}
          {mode === 'replace' && (
            <p>
              Starting this replacement stops current work. Completed effects and spent materials
              remain.
            </p>
          )}
          {mode === 'interrupt' && (
            <p>Starting pauses current work; resuming it later still requires valid conditions.</p>
          )}
          <div className="ol-task-summary" aria-live="polite">
            {currentReview ? (
              currentReview.result.ok ? (
                <details>
                  <summary>Supplies and conditions checked</summary>
                  <p>{currentReview.result.message}</p>
                  {presentation.kind === 'resource-care' && (
                    <p>Waiting does not extend the checked stopping time.</p>
                  )}
                </details>
              ) : (
                <p role="alert">{currentReview.result.message}</p>
              )
            ) : ready ? (
              <p>Checking current supplies and conditions…</p>
            ) : (
              <p>{Object.values(issues)[0]}</p>
            )}
            {expired && (
              <p role="status">The checked stopping time has passed. Refresh before starting.</p>
            )}
          </div>
          <details className="ol-task-about">
            <summary>About this task</summary>
            <p>{descriptor.description}</p>
            <p>
              Starting rechecks current conditions. Later work can stop if supplies, access or the
              target change.
            </p>
          </details>
        </Section>
      )}
      {preparing && !unavailable && entry && presentation && bound && (
        <div className="ol-actions ol-task-submit" data-unresolved={!!unresolved || undefined}>
          <Button
            id={`${fieldId}-start`}
            variant="primary"
            disabled={disabled || !ready || !currentReview?.result.ok || expired}
            busy={operation === 'start'}
            onPress={() => void start()}
          >
            {mode === 'replace'
              ? 'Replace current work and start'
              : mode === 'interrupt'
                ? 'Pause current work and start'
                : working
                  ? 'Start after current work'
                  : 'Start task'}
          </Button>
          <Button
            variant="quiet"
            disabled={!!operation || unavailable}
            onPress={() => {
              setError('');
              setRefresh((value) => value + 1);
            }}
          >
            Refresh conditions
          </Button>
        </div>
      )}
    </div>
  );
}
