import { createContext, useContext } from 'react';

/** The current world's clock offset in hours (day 1 starts at this hour), from the view.
 * Displays read it rather than assuming a start hour. */
export const ClockOffsetContext = createContext(0);

/** "Day N · HH:MM": the day counts from the world's start; the hour reads its clock. */
export function clockParts(time: number, offsetHours: number) {
  const minutes = Math.floor(time / 60 + offsetHours * 60);
  return {
    day: Math.floor(time / 86400) + 1,
    hour: String(Math.floor(minutes / 60) % 24).padStart(2, '0'),
    minute: String(minutes % 60).padStart(2, '0'),
  };
}

export function EventTime({ time }: { time: number }) {
  const { day, hour, minute } = clockParts(time, useContext(ClockOffsetContext));
  return (
    <time className="ol-event-time" aria-label={`Game day ${day}, ${hour}:${minute}`}>
      Day {day} · {hour}:{minute}
    </time>
  );
}
