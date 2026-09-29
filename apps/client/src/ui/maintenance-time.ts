import type { MaintenanceWindowView } from '@open-legend/protocol';

/** Presentation of operational maintenance instants; React-free so it can be checked alone. */
/** Full weekday/date/time with the zone's name and numeric offset, so a window crossing
 * midnight or a daylight-saving change can never be read as another instant. */
export function formatInstant(at: number, timeZone: string, locale?: string): string {
  const text = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(at);
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? '';
  return !offset || text.includes(offset) ? text : `${text} (${offset})`;
}
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const days = Math.floor(minutes / 1440),
    hours = Math.floor((minutes % 1440) / 60),
    rest = minutes % 60;
  return (
    [days && `${days} d`, hours && `${hours} h`, rest && `${rest} min`].filter(Boolean).join(' ') ||
    '0 min'
  );
}
export function formatWindow(
  window: Pick<MaintenanceWindowView, 'startsAt' | 'endsAt' | 'timeZone'>,
  viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale?: string,
) {
  const range = (zone: string) =>
    `${formatInstant(window.startsAt, zone, locale)} – ${formatInstant(window.endsAt, zone, locale)}`;
  return {
    announced: range(window.timeZone),
    local: viewerZone === window.timeZone ? undefined : range(viewerZone),
    viewerZone,
    duration: formatDuration(window.endsAt - window.startsAt),
  };
}
export function maintenanceHeadline(window: MaintenanceWindowView, now: number): string {
  if (window.status === 'cancelled') return 'Scheduled maintenance was cancelled';
  if (window.status === 'completed') return 'Maintenance finished; the world is running again';
  if (window.status === 'active')
    return now > window.endsAt
      ? 'Maintenance is taking longer than announced; the world stays paused until it is ready'
      : window.lastChange === 'extended'
        ? 'Maintenance was extended; the world is paused'
        : 'The world is paused for maintenance';
  const minutes = Math.ceil((window.startsAt - now) / 60_000);
  const lead =
    window.lastChange === 'rescheduled' ? 'Maintenance rescheduled' : 'Maintenance scheduled';
  return minutes <= 60 ? `${lead}: the world pauses in ${Math.max(1, minutes)} min` : lead;
}

/** Wall-clock date and time of an instant in a zone, for editing in that zone. */
export function wallTime(at: number, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
