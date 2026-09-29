import { useState } from 'react';
import type { MaintenanceWindowView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, Tag } from '../design-system/components';
import { useMinuteClock } from './maintenance-notice';
import { formatInstant, formatWindow, maintenanceHeadline, wallTime } from './maintenance-time';

type Occurrence = 'earlier' | 'later';
type LocalTime = { date: string; time: string; occurrence?: Occurrence };
type Field = 'start' | 'end';
type Submission = { timeZone: string; start?: LocalTime; end: LocalTime; message: string };
const HOUR = 3_600_000;
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeZones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [browserZone()];
  }
})();
const nextHour = () => Math.ceil(Date.now() / HOUR) * HOUR + HOUR;

/** Creator scheduling, rescheduling, extension, cancellation and the explicit Ready step. */
export function MaintenanceSection({
  current,
  history,
  onChanged,
}: {
  current?: MaintenanceWindowView;
  history: MaintenanceWindowView[];
  onChanged: () => void;
}) {
  const now = useMinuteClock();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ambiguous, setAmbiguous] = useState<Field[]>([]);
  async function run(path: string, body: unknown): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const result = await post<{ ok: boolean; message?: string; code?: string; field?: Field }>(
        path,
        body,
      );
      setMessage(result.message ?? '');
      if (result.ok) setAmbiguous([]);
      else if (result.code === 'ambiguous-time' && result.field)
        setAmbiguous((fields) => [...new Set([...fields, result.field!])]);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
      onChanged();
    }
  }
  const terminal = history.filter((window) => window.id !== current?.id);
  const shown = current && formatWindow(current);
  const revision = current && { id: current.id, expectedRevision: current.revision };
  return (
    <>
      <Section title="Maintenance">
        {current && shown && revision ? (
          <>
            <p>
              <strong>{maintenanceHeadline(current, now)}</strong>
            </p>
            <p>
              {shown.announced} · {shown.duration}
            </p>
            {shown.local && (
              <p className="ol-caption">
                Your time ({shown.viewerZone}): {shown.local}
              </p>
            )}
            {current.message && <p className="ol-muted">{current.message}</p>}
            <div className="ol-operations-row">
              {current.status === 'scheduled' && (
                <>
                  <Button
                    disabled={busy}
                    onPress={() => void run('/api/maintenance/start', revision)}
                  >
                    Start maintenance now
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onPress={() => void run('/api/maintenance/cancel', revision)}
                  >
                    Cancel maintenance
                  </Button>
                </>
              )}
              {current.status === 'active' && (
                <Button
                  variant="primary"
                  disabled={busy}
                  onPress={() => void run('/api/maintenance/ready', revision)}
                >
                  Mark ready and resume
                </Button>
              )}
            </div>
            {current.status === 'active' && (
              <p className="ol-caption">
                The world stays paused, even past the announced end, until it is marked ready.
                Resuming continues from the paused moment; no time is caught up.
              </p>
            )}
            <WindowForm
              key={`${current.id}:${current.revision}`}
              mode={current.status === 'active' ? 'extend' : 'reschedule'}
              window={current}
              busy={busy}
              ambiguous={ambiguous}
              onSubmit={(value) => void run('/api/maintenance/update', { ...revision, ...value })}
            />
          </>
        ) : (
          <WindowForm
            mode="schedule"
            busy={busy}
            ambiguous={ambiguous}
            onSubmit={(value) =>
              void run('/api/maintenance/schedule', { id: crypto.randomUUID(), ...value })
            }
          />
        )}
        {message && <p role="status">{message}</p>}
      </Section>
      {terminal.length > 0 && (
        <Section title="Earlier maintenance" count={terminal.length}>
          <ul className="ol-operations-list">
            {terminal.map((window) => (
              <li key={window.id}>
                <div className="ol-operations-row">
                  <Tag>{window.status}</Tag>
                  <span className="ol-caption">
                    {window.status === 'completed' ? 'Finished' : 'Cancelled'}{' '}
                    {formatInstant(window.completedAt ?? window.updatedAt, window.timeZone)}
                  </span>
                </div>
                <span className="ol-caption">{formatWindow(window).announced}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function WindowForm({
  mode,
  window,
  busy,
  ambiguous,
  onSubmit,
}: {
  mode: 'schedule' | 'reschedule' | 'extend';
  window?: MaintenanceWindowView;
  busy: boolean;
  ambiguous: Field[];
  onSubmit: (value: Submission) => void;
}) {
  const initialZone = window?.timeZone ?? browserZone();
  const [timeZone, setTimeZone] = useState(initialZone);
  const [startNow, setStartNow] = useState(false);
  const [start, setStart] = useState(() => wallTime(window?.startsAt ?? nextHour(), initialZone));
  const [end, setEnd] = useState(() =>
    wallTime(window?.endsAt ?? nextHour() + 2 * HOUR, initialZone),
  );
  const [occurrence, setOccurrence] = useState<Record<Field, Occurrence>>({
    start: 'earlier',
    end: 'earlier',
  });
  const [text, setText] = useState(window?.message ?? '');
  const withStart = mode !== 'extend' && !startNow;
  const local = (field: Field, value: { date: string; time: string }): LocalTime => ({
    ...value,
    ...(ambiguous.includes(field) ? { occurrence: occurrence[field] } : {}),
  });
  const fields = (field: Field, value: { date: string; time: string }, set: typeof setStart) => (
    <fieldset>
      <legend>
        {field === 'start' ? 'Starts' : mode === 'extend' ? 'New estimated end' : 'Estimated end'} (
        {timeZone})
      </legend>
      <div className="ol-operations-row">
        <input
          type="date"
          aria-label={`${field === 'start' ? 'Start' : 'End'} date`}
          value={value.date}
          required
          onChange={(event) => set({ ...value, date: event.target.value })}
        />
        <input
          type="time"
          aria-label={`${field === 'start' ? 'Start' : 'End'} time`}
          value={value.time}
          required
          onChange={(event) => set({ ...value, time: event.target.value })}
        />
      </div>
      {ambiguous.includes(field) && (
        <label>
          This time happens twice when the clocks go back. Use:
          <select
            value={occurrence[field]}
            onChange={(event) =>
              setOccurrence({ ...occurrence, [field]: event.target.value as Occurrence })
            }
          >
            <option value="earlier">The first occurrence (before the change)</option>
            <option value="later">The second occurrence (after the change)</option>
          </select>
        </label>
      )}
    </fieldset>
  );
  return (
    <form
      className="ol-operations-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          timeZone,
          ...(withStart ? { start: local('start', start) } : {}),
          end: local('end', end),
          message: text,
        });
      }}
    >
      <label>
        Time zone for these times
        <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      {mode === 'schedule' && (
        <label>
          <input
            type="checkbox"
            checked={startNow}
            onChange={(event) => setStartNow(event.target.checked)}
          />
          Start now
        </label>
      )}
      {withStart && fields('start', start, setStart)}
      {fields('end', end, setEnd)}
      <label>
        Message to players (optional)
        <textarea value={text} maxLength={280} onChange={(event) => setText(event.target.value)} />
      </label>
      <Button type="submit" variant={mode === 'schedule' ? 'primary' : 'secondary'} busy={busy}>
        {mode === 'schedule'
          ? startNow
            ? 'Pause for maintenance now'
            : 'Schedule maintenance'
          : mode === 'extend'
            ? 'Extend maintenance'
            : 'Reschedule maintenance'}
      </Button>
    </form>
  );
}
