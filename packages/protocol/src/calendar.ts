/** Calendar labels use the installed world's local midnight, not elapsed full days.
 * One projection serves the HUD, history and characterless operations. */
export function worldClockParts(seconds: number, offsetHours: number) {
  const localSeconds = seconds + offsetHours * 3600;
  const secondsInDay = ((localSeconds % 86400) + 86400) % 86400;
  return {
    day: Math.floor(localSeconds / 86400) + 1,
    hour: secondsInDay / 3600,
    minute: Math.floor(secondsInDay / 60) % 60,
  };
}

/** The installed world names its calendar unit; an unnamed clock stays numeric. */
export function worldDayText(day: number, dayLabel?: string): string {
  return dayLabel ? `${dayLabel} ${day}` : String(day);
}

/** Shared wording for the supported 24-hour clock, without an engine-owned unit name. */
export function worldClockText(seconds: number, offsetHours: number, dayLabel?: string): string {
  const clock = worldClockParts(seconds, offsetHours);
  return `${worldDayText(clock.day, dayLabel)}, ${String(Math.floor(clock.hour)).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`;
}
