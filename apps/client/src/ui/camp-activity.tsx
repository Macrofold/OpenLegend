import { useEffect, useId, useRef, useState } from 'react';
import type {
  ActionOption,
  ActivityChoicePage,
  ActivityChoice,
  ActivityRequestsView,
  ApiResult,
  CommandInput,
  GameView,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, SelectField, Tag } from '../design-system/components';
import { ActivityObjectField } from './activity-object-field';
import './camp-activity.css';
import { clockParts, EventTime } from './event-time';

type Draft = { family: string; arguments: Record<string, Record<string, string>> };
type StatusView = Pick<ActivityRequestsView, 'ok' | 'scope' | 'simTime' | 'status'>;
const workModes = [
  { id: 'enqueue', label: 'Queue after current work' },
  { id: 'interrupt', label: 'Pause current work, then resume it' },
  { id: 'replace', label: 'Replace current work' },
];
const timeModes = [
  { id: 'duration', label: 'After a duration' },
  { id: 'named', label: 'At the next named time' },
  { id: 'absolute', label: 'At an exact simulation time' },
];

function readDraft(key: string): Draft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Draft | null;
    if (
      saved &&
      typeof saved.family === 'string' &&
      saved.arguments &&
      typeof saved.arguments === 'object' &&
      !Array.isArray(saved.arguments) &&
      Object.values(saved.arguments).every(
        (fields) =>
          fields &&
          typeof fields === 'object' &&
          !Array.isArray(fields) &&
          Object.values(fields).every((value) => typeof value === 'string'),
      )
    )
      return saved;
  } catch {
    // The private action-draft store is optional and clears with access or timeline changes.
  }
  return { family: '', arguments: {} };
}

/** The player chooses a world-authored request. Review has no effects and never
 * promises future success; Start uses the same public intention as other actions.
 * docs/projects/parallel-batch-01-playable-week/camp-activities.md#observation-memory-and-ordinary-ui */
export function CampActivity({
  view,
  connected,
  visible = true,
  command,
}: {
  view: GameView;
  connected: boolean;
  visible?: boolean;
  command(action: ActionOption): Promise<ApiResult | undefined>;
}) {
  const draftKey = `open-legend:action-draft:camp:${view.access?.privateDraftScope}:${view.worldId}:${view.saveTimeline}:${view.player.id}`;
  const [draft, setDraft] = useState(() => readDraft(draftKey));
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<ActivityRequestsView>();
  const [status, setStatus] = useState<{ value: StatusView; revision: number }>();
  const [operation, setOperation] = useState<
    'choices' | 'preview' | 'start' | 'stop' | 'native' | null
  >(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState<{ key: string; result: ApiResult; input: CommandInput }>();
  const [message, setMessage] = useState('');
  const fieldId = useId();
  const alive = useRef(true);
  const request = useRef(0);
  const statusRequest = useRef(0);
  const pending = useRef(false);
  const readAbort = useRef<AbortController | null>(null);
  const statusAbort = useRef<AbortController | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selections, setSelections] = useState<
    Record<string, { key: string; page: ActivityChoicePage }>
  >({});
  const descriptor = choices?.requests.find((entry) => entry.id === draft.family);
  const values = draft.arguments[draft.family] ?? {};
  function selectionKey(key: string) {
    const field = descriptor?.fields[key];
    const sourceId = field?.discovery?.sourceField
      ? values[field.discovery.sourceField]
      : undefined;
    const selected = view.entities.find((entry) => entry.id === values[key]);
    const source = view.entities.find((entry) => entry.id === sourceId);
    return JSON.stringify([
      view.access?.scope,
      draft.family,
      key,
      values[key],
      values[`${key}:witness`],
      sourceId,
      view.player.position,
      view.player.inventoryRevision,
      selected,
      source,
      refreshVersion,
    ]);
  }
  function selectedPage(key: string) {
    const entry = selections[key];
    return entry?.key === selectionKey(key) ? entry.page : undefined;
  }
  const input: CommandInput = {
    type: 'activity-request',
    activityFamilyId: draft.family,
    activityArguments: {},
  };
  const issues: Record<string, string> = {};
  for (const [key, field] of Object.entries(descriptor?.fields ?? {})) {
    const value = values[key] ?? '';
    if (field.type === 'time') {
      const kind = values[`${key}:when`];
      const timeOptions = choices?.timeOptions;
      let at: number | undefined;
      if (!timeModes.some((mode) => mode.id === kind))
        issues[key] = 'Choose how to set the stopping time.';
      else if (!timeOptions) issues[key] = 'Refresh to read the available stopping times.';
      else if (kind === 'duration') {
        const duration = values[`${key}:duration`] ?? '';
        const seconds = Number(duration) * 60;
        if (
          !duration.trim() ||
          !Number.isFinite(seconds) ||
          seconds < timeOptions.minimumDuration ||
          seconds > timeOptions.maximumDuration
        )
          issues[key] =
            `Enter a duration from ${timeOptions.minimumDuration / 60} to ${timeOptions.maximumDuration / 60} game minutes.`;
        else at = view.clock.seconds + seconds;
      } else if (kind === 'named') {
        const name = values[`${key}:named`] ?? '';
        const selected = timeOptions.namedDeadlines.find(
          (entry) => entry.name === name && view.clock.namedTimes.includes(name),
        );
        if (!selected) issues[key] = 'Choose a named stopping time available in this world.';
        else at = selected.at;
      } else if (!value.trim()) issues[key] = 'Enter an exact simulation time.';
      else at = Number(value);
      if (at !== undefined) {
        if (
          !Number.isFinite(at) ||
          at <= view.clock.seconds ||
          at < (field.minimum ?? -Infinity) ||
          at > (field.maximum ?? Infinity) ||
          at - view.clock.seconds > timeOptions!.maximumDuration
        )
          issues[key] =
            'Choose a future stopping time within the supported duration. Refresh named times if needed.';
        else input.activityArguments![key] = at;
      }
    } else if (!value.trim()) issues[key] = `Choose ${field.label.toLowerCase()}.`;
    else if (field.type === 'integer') {
      const amount = Number(value);
      if (
        !Number.isFinite(amount) ||
        !Number.isSafeInteger(amount) ||
        amount < (field.minimum ?? -Infinity) ||
        amount > (field.maximum ?? Infinity)
      )
        issues[key] = `Enter a valid ${field.label.toLowerCase()}.`;
      else input.activityArguments![key] = amount;
    } else if (field.type === 'mode') {
      if (!workModes.some((mode) => mode.id === value))
        issues[key] = `Choose ${field.label.toLowerCase()}.`;
      else input.activityArguments![key] = value;
    } else if (!selectedPage(key)?.selected?.accessible)
      issues[key] =
        `${field.label} needs current permitted evidence. Recheck or inspect before reviewing.`;
    else input.activityArguments![key] = value;
  }
  const reviewKey = JSON.stringify([
    choices?.scope,
    draft.family,
    values,
    Object.keys(descriptor?.fields ?? {}).map((key) => [
      key,
      selectionKey(key),
      selectedPage(key)?.evidence,
    ]),
  ]);
  const invalid = Object.values(issues);
  const currentReview = review?.key === reviewKey ? review : undefined;
  const reviewExpired =
    !!currentReview &&
    Object.entries(descriptor?.fields ?? {}).some(
      ([key, field]) =>
        field.type === 'time' &&
        Number(currentReview.input.activityArguments?.[key]) <= view.clock.seconds,
    );
  const unavailable = !connected || view.access?.controlling === false || !view.player.alive;
  const canReview = !!descriptor && !invalid.length && !unavailable && !operation;
  // A command's immediate read may arrive before its normal pushed projection.
  // Once a newer projection arrives it alone owns current/terminal activity facts.
  const activity =
    status && status.revision >= view.revision ? status.value.status : view.player.activity;
  const stoppable =
    !!activity && ['active', 'blocked', 'paused', 'queued', 'waiting'].includes(activity.status);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current++;
      statusRequest.current++;
      readAbort.current?.abort();
      statusAbort.current?.abort();
    };
  }, []);

  function edit(next: Draft) {
    setReview(undefined);
    if (operation === 'preview') {
      readAbort.current?.abort();
      request.current++;
      setOperation(null);
    }
    setMessage('');
    setError('');
    setDraft(next);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      // Hiding still preserves the draft when browser storage is available.
    }
  }

  function change(key: string, value: string, witnessId?: string) {
    const next = { ...values, [key]: value };
    if (witnessId) next[`${key}:witness`] = witnessId;
    else delete next[`${key}:witness`];
    for (const [dependent, field] of Object.entries(descriptor?.fields ?? {}))
      if (field.discovery?.sourceField === key) {
        delete next[dependent];
        delete next[`${dependent}:witness`];
      }
    edit({
      ...draft,
      arguments: { ...draft.arguments, [draft.family]: next },
    });
  }

  async function refresh() {
    if (unavailable || pending.current) return;
    const ticket = ++request.current;
    readAbort.current?.abort();
    const abort = new AbortController();
    readAbort.current = abort;
    setOperation('choices');
    setRefreshVersion((value) => value + 1);
    setReview(undefined);
    setError('');
    try {
      const result = await post<ActivityRequestsView>('/api/activity-requests', {}, abort.signal);
      if (!alive.current || ticket !== request.current) return;
      if (!result.ok) throw new Error('Activity choices are currently unavailable.');
      setChoices(result);
      setStatus({ value: result, revision: view.revision });
    } catch (reason) {
      if (alive.current && ticket === request.current && !abort.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Activity choices are unavailable.');
    } finally {
      if (alive.current && ticket === request.current) setOperation(null);
    }
  }

  async function refreshStatus() {
    if (unavailable) return;
    const ticket = ++statusRequest.current;
    statusAbort.current?.abort();
    const abort = new AbortController();
    statusAbort.current = abort;
    try {
      const result = await post<StatusView>('/api/activity-status', {}, abort.signal);
      if (alive.current && ticket === statusRequest.current && result.ok)
        setStatus({ value: result, revision: view.revision });
    } catch (reason) {
      if (alive.current && ticket === statusRequest.current && !abort.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : 'Current activity status is unavailable.',
        );
    }
  }

  async function preview() {
    if (!canReview) return;
    const ticket = ++request.current;
    const abort = new AbortController();
    readAbort.current?.abort();
    readAbort.current = abort;
    setOperation('preview');
    setError('');
    setMessage('');
    try {
      // Resolve the selected time once. Live clock pushes never move this reviewed deadline.
      const selectedInput = { ...input, activityArguments: { ...input.activityArguments } };
      const result = await post<ApiResult>('/api/activity-preview', selectedInput, abort.signal);
      if (alive.current && ticket === request.current)
        setReview({ key: reviewKey, result, input: selectedInput });
    } catch (reason) {
      if (alive.current && ticket === request.current && !abort.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'This activity could not be reviewed.');
    } finally {
      if (alive.current && ticket === request.current) setOperation(null);
    }
  }

  async function nativeAction(input: CommandInput, label: string) {
    if (pending.current || unavailable || operation) return undefined;
    pending.current = true;
    setReview(undefined);
    setOperation('native');
    try {
      return await command({ id: `selected-${input.type}`, label, command: input, enabled: true });
    } finally {
      pending.current = false;
      if (alive.current) {
        setOperation(null);
        setRefreshVersion((value) => value + 1);
        void refreshStatus();
      }
    }
  }

  async function submit(stop = false) {
    if (
      pending.current ||
      unavailable ||
      (stop ? !stoppable : !canReview || !currentReview?.result.ok || reviewExpired)
    )
      return;
    pending.current = true;
    setOperation(stop ? 'stop' : 'start');
    setReview(undefined);
    setError('');
    try {
      const result = await command({
        id: stop ? 'stop-chosen-activity' : `start-${draft.family}`,
        label: stop ? 'Stop current activity' : `Start ${descriptor!.label}`,
        command: stop ? { type: 'cancel' } : currentReview!.input,
        enabled: true,
      });
      if (!alive.current) return;
      // A notification elsewhere does not establish admission or delivery. Keep
      // the actual refusal here; an absent receipt must never look successful.
      if (!result)
        setError(
          'Delivery could not be confirmed. Check the current activity before repeating this request.',
        );
      else if (!result.ok) setError(result.message);
      else setMessage(result.message);
      await refreshStatus();
    } catch (reason) {
      if (alive.current)
        setError(
          `${reason instanceof Error ? reason.message : 'Delivery is uncertain.'} Check the current activity before repeating this request.`,
        );
    } finally {
      pending.current = false;
      if (alive.current) setOperation(null);
    }
  }

  return (
    <div className="ol-camp-activities">
      <Section title="Chosen activities">
        <Button
          variant="quiet"
          onPress={() => {
            if (!open) void refresh();
            setOpen(!open);
          }}
        >
          {open ? 'Hide activity choices' : 'Choose an activity'}
        </Button>
        {open && (
          <div
            className="ol-camp-form"
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="ol-actions">
              <Button disabled={unavailable || !!operation} onPress={() => void refresh()}>
                Refresh choices
              </Button>
              {stoppable && (
                <Button disabled={unavailable || !!operation} onPress={() => void submit(true)}>
                  Stop current activity
                </Button>
              )}
            </div>
            {unavailable && (
              <p role="status">
                Reconnect and take control of a living character to choose an activity.
              </p>
            )}
            {operation === 'choices' && <p role="status">Reading permitted activity choices…</p>}
            {error && <p role="alert">{error}</p>}
            {(status || activity) && (
              <div aria-live="polite">
                {activity ? (
                  <>
                    <p>
                      <Tag>{activity.status}</Tag> <strong>{activity.name}</strong>
                    </p>
                    {activity.reason && <p>{activity.reason}</p>}
                    {activity.spent !== undefined && (
                      <p>
                        Used {activity.spent} selected units in {activity.attempts ?? 0} attempts.
                      </p>
                    )}
                    {activity.deadline !== undefined && (
                      <p className="ol-caption">
                        Chosen stopping time: <EventTime time={activity.deadline} />.{' '}
                        {activity.interrupted
                          ? 'Interrupted; this was not continuous attendance.'
                          : ''}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="ol-caption">No current chosen activity.</p>
                )}
              </div>
            )}
            {choices && (
              <>
                {!choices.requests.length ? (
                  <p>No supported activity requests are available in this world.</p>
                ) : (
                  <SelectField
                    label="Activity"
                    placeholder="Choose an activity…"
                    placement="bottom start"
                    value={draft.family}
                    options={choices.requests.map((entry) => ({
                      id: entry.id,
                      label: entry.label,
                      description: entry.description,
                    }))}
                    onChange={(family) => edit({ ...draft, family })}
                  />
                )}
                {descriptor && (
                  <>
                    <p>{descriptor.description}</p>
                    {Object.entries(descriptor.fields).map(([key, field]) => {
                      return (
                        <div key={key}>
                          {field.discovery ? (
                            <ActivityObjectField
                              family={descriptor.id}
                              fieldId={key}
                              field={field}
                              value={values[key] ?? ''}
                              witnessId={
                                field.type === 'definition' ? values[`${key}:witness`] : undefined
                              }
                              sourceId={
                                field.discovery.sourceField
                                  ? values[field.discovery.sourceField]
                                  : undefined
                              }
                              scope={choices.scope}
                              readKey={selectionKey(key)}
                              page={selectedPage(key)}
                              visible={open && visible}
                              connected={!unavailable}
                              busy={!!operation}
                              working={!!view.player.action || stoppable}
                              onRead={(readKey, page) =>
                                setSelections((previous) => ({
                                  ...previous,
                                  [key]: { key: readKey, page },
                                }))
                              }
                              onChange={(choice: ActivityChoice) =>
                                change(
                                  key,
                                  choice.id,
                                  field.type === 'definition' ? choice.witnessId : undefined,
                                )
                              }
                              onAction={nativeAction}
                            />
                          ) : field.type === 'time' ? (
                            <div style={{ display: 'grid', gap: 'var(--space-2)', minWidth: 0 }}>
                              <SelectField
                                label={field.label}
                                placeholder="Choose how to stop…"
                                placement="bottom start"
                                value={values[`${key}:when`] ?? ''}
                                options={timeModes}
                                onChange={(value) => change(`${key}:when`, value)}
                              />
                              {values[`${key}:when`] === 'named' ? (
                                <>
                                  <SelectField
                                    label="Named stopping time"
                                    placeholder="Choose a named time…"
                                    placement="bottom start"
                                    value={values[`${key}:named`] ?? ''}
                                    options={(choices.timeOptions?.namedDeadlines ?? [])
                                      .filter((entry) => view.clock.namedTimes.includes(entry.name))
                                      .map((entry) => {
                                        const { day, hour, minute } = clockParts(
                                          entry.at,
                                          view.clock.offsetHours,
                                        );
                                        return {
                                          id: entry.name,
                                          label: `Next ${entry.name}`,
                                          description: `Day ${day} · ${hour}:${minute}`,
                                        };
                                      })}
                                    onChange={(value) => change(`${key}:named`, value)}
                                  />
                                  {!choices.timeOptions?.namedDeadlines.length && (
                                    <p className="ol-caption">
                                      No named stopping times are currently available. Choose a
                                      duration or an exact simulation time.
                                    </p>
                                  )}
                                </>
                              ) : ['duration', 'absolute'].includes(values[`${key}:when`] ?? '') ? (
                                <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
                                  {values[`${key}:when`] === 'duration'
                                    ? 'Duration (game minutes)'
                                    : 'Exact simulation time (seconds)'}
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      values[
                                        values[`${key}:when`] === 'duration'
                                          ? `${key}:duration`
                                          : key
                                      ] ?? ''
                                    }
                                    aria-invalid={
                                      (!!values[
                                        values[`${key}:when`] === 'duration'
                                          ? `${key}:duration`
                                          : key
                                      ]?.trim() &&
                                        !!issues[key]) ||
                                      undefined
                                    }
                                    aria-describedby={`${fieldId}-${key}-hint${issues[key] ? ` ${fieldId}-${key}-error` : ''}`}
                                    onChange={(event) =>
                                      change(
                                        values[`${key}:when`] === 'duration'
                                          ? `${key}:duration`
                                          : key,
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <span className="ol-caption" id={`${fieldId}-${key}-hint`}>
                                    {values[`${key}:when`] === 'duration'
                                      ? choices.timeOptions
                                        ? `Choose ${choices.timeOptions.minimumDuration / 60}–${choices.timeOptions.maximumDuration / 60} game minutes. The duration starts from the current clock when you review.`
                                        : 'Refresh to read the supported duration.'
                                      : `Current simulation time: ${view.clock.seconds.toFixed(1)} seconds.`}
                                  </span>
                                </label>
                              ) : null}
                              {values[`${key}:when`] && issues[key] && (
                                <p className="ol-caption" id={`${fieldId}-${key}-error`}>
                                  {issues[key]}
                                </p>
                              )}
                            </div>
                          ) : field.type === 'integer' ? (
                            <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
                              {field.label}
                              <input
                                type="text"
                                inputMode="numeric"
                                value={values[key] ?? ''}
                                aria-invalid={(!!values[key]?.trim() && !!issues[key]) || undefined}
                                aria-describedby={`${fieldId}-${key}-hint${values[key]?.trim() && issues[key] ? ` ${fieldId}-${key}-error` : ''}`}
                                onChange={(event) => change(key, event.target.value)}
                              />
                              <span className="ol-caption" id={`${fieldId}-${key}-hint`}>
                                Whole units
                                {field.minimum !== undefined ? `; minimum ${field.minimum}` : ''}
                                {field.maximum !== undefined ? `; maximum ${field.maximum}` : ''}.
                              </span>
                              {values[key]?.trim() && issues[key] && (
                                <span id={`${fieldId}-${key}-error`}>{issues[key]}</span>
                              )}
                            </label>
                          ) : field.type === 'mode' ? (
                            <SelectField
                              label={field.label}
                              placeholder={`Choose ${field.label.toLowerCase()}…`}
                              placement="bottom start"
                              value={values[key] ?? ''}
                              options={workModes}
                              onChange={(value) => change(key, value)}
                            />
                          ) : (
                            <p role="status">
                              Choices for {field.label.toLowerCase()} are unavailable in this world.
                              Refresh choices or choose another activity.
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {currentReview && (
                      <div
                        className="ol-proposal"
                        role={currentReview.result.ok ? 'region' : 'alert'}
                        aria-label="Activity review"
                      >
                        <strong>{descriptor.label}</strong>
                        <dl>
                          {Object.entries(descriptor.fields).map(([key, field]) => (
                            <div key={key}>
                              <dt>{field.label}</dt>
                              <dd style={{ marginInlineStart: 0 }}>
                                {field.discovery ? (
                                  <>
                                    {selectedPage(key)?.selected?.label}
                                    {field.type === 'entity' && ` · Reference: ${values[key]}`}
                                  </>
                                ) : field.type === 'time' ? (
                                  <EventTime
                                    time={Number(currentReview.input.activityArguments?.[key])}
                                  />
                                ) : (
                                  (selectedPage(key)?.selected?.label ??
                                  workModes.find((mode) => mode.id === values[key])?.label ??
                                  values[key])
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p>{currentReview.result.message}</p>
                        {Object.values(descriptor.fields).some(
                          (field) => field.type === 'time',
                        ) && (
                          <p className="ol-caption">
                            This reviewed stopping time is fixed. Waiting, interruption and refresh
                            never extend a started activity.
                          </p>
                        )}
                        {reviewExpired && (
                          <p role="status">
                            This reviewed stopping time has passed. Review again before starting.
                          </p>
                        )}
                        <p className="ol-caption">
                          Review changes nothing. Starting rechecks current objects and conditions;
                          later work can fail. Spent materials and completed transfers remain after
                          stopping.
                        </p>
                      </div>
                    )}
                    <div className="ol-actions">
                      <Button
                        variant={currentReview?.result.ok ? 'secondary' : 'primary'}
                        disabled={!canReview}
                        busy={operation === 'preview'}
                        onPress={() => void preview()}
                      >
                        Review activity
                      </Button>
                      {currentReview?.result.ok && (
                        <Button
                          variant="primary"
                          disabled={!canReview || reviewExpired}
                          busy={operation === 'start'}
                          onPress={() => void submit()}
                        >
                          Start activity
                        </Button>
                      )}
                    </div>
                    {invalid.length > 0 && <p className="ol-caption">{invalid[0]}</p>}
                  </>
                )}
              </>
            )}
            {message && <p role="status">{message}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}
