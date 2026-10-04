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

/** Exact-target discovery uses authored role predicates; opening a task is only a read. */
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
  const [mode, setMode] = useState<WorkMode>('enqueue');
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
    values[presentation.reserve] ??= String(descriptor.fields[presentation.reserve]?.minimum ?? '');
    if (presentation.kind === 'resource-care') {
      values[presentation.supply] ??= view.player.id;
      values[presentation.budget] ??= String(descriptor.fields[presentation.budget]?.minimum ?? '');
      values[`${presentation.stop}:when`] ??= 'duration';
    } else
      values[presentation.quantity] ??= String(
        descriptor.fields[presentation.quantity]?.minimum ?? '',
      );
  }
  const activity =
    status && status.revision >= view.revision ? status.value.status : view.player.activity;
  const stoppable =
    !!activity && ['active', 'blocked', 'paused', 'queued', 'waiting'].includes(activity.status);
  const working = stoppable || !!view.player.action;

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
    if (!ready || !visible) return;
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
  }, [reviewKey, ready, visible]);

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
    setOperation(kind);
    setError('');
    setMessage('');
    try {
      const result = await command(action, request);
      if (!alive.current || pending.current !== request.commandId) return result;
      if (result.code === 'unconfirmed')
        setError('Delivery is uncertain. Check this exact request before starting other work.');
      else acceptReceipt(result, request.commandId);
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
  function acceptReceipt(result: ApiResult, commandId: string) {
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
    } else setError(result.message);
  }
  async function recover() {
    if (!unresolved || unavailable || recovering || pending.current) return;
    const commandId = unresolved.request.commandId;
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
        acceptReceipt(receipt.result, commandId);
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
        visible={visible}
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
      className="ol-camp-activities"
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Section title="Current work">
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
                Stops at <EventTime time={activity.deadline} />.
              </p>
            )}
            {activity.interrupted && (
              <p>This work was interrupted; attendance was not continuous.</p>
            )}
          </div>
        ) : (
          <p>{view.player.action?.label ?? 'No current task.'}</p>
        )}
        {stoppable && (
          <Button
            disabled={disabled}
            onPress={() =>
              void perform(
                {
                  id: 'stop-current-task',
                  label: 'Stop current task',
                  command: { type: 'cancel' },
                  enabled: true,
                },
                'stop',
              )
            }
          >
            Stop current task
          </Button>
        )}
      </Section>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {unavailable ? (
        <p role="status">Reconnect and take control of a living character to prepare a task.</p>
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
          <p>{descriptor.description}</p>
          <fieldset className="ol-task-choices" disabled={disabled}>
            {presentation.kind === 'resource-care' ? (
              <>
                {objectChoice(presentation.supply)}
                {objectChoice(presentation.material)}
                <div className="ol-task-limits">
                  {amountChoice(presentation.budget)}
                  {amountChoice(presentation.reserve)}
                </div>
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
              </>
            ) : (
              <>
                {objectChoice(presentation.source)}
                {objectChoice(presentation.destination)}
                {objectChoice(presentation.material)}
                <div className="ol-task-limits">
                  {amountChoice(presentation.quantity)}
                  {amountChoice(presentation.reserve)}
                </div>
              </>
            )}
          </fieldset>
          {working && (
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
              <>
                {presentation.kind === 'resource-care' && (
                  <p>
                    Stopping time:{' '}
                    <EventTime
                      time={Number(currentReview.input.activityArguments?.[presentation.stop])}
                    />
                    . Waiting does not extend it.
                  </p>
                )}
                <p role={currentReview.result.ok ? 'status' : 'alert'}>
                  {currentReview.result.message}
                </p>
              </>
            ) : ready ? (
              <p>Checking current supplies and conditions…</p>
            ) : (
              <p>{Object.values(issues)[0]}</p>
            )}
            {expired && (
              <p role="status">The checked stopping time has passed. Refresh before starting.</p>
            )}
          </div>
          <div className="ol-actions">
            <Button
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
          <p className="ol-caption">
            Starting rechecks current conditions. Later work can stop if supplies, access or the
            target change.
          </p>
        </Section>
      )}
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
    </div>
  );
}
