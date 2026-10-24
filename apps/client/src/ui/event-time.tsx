import { createContext, useContext, type ReactNode } from 'react';
import type { GameView } from '@open-legend/protocol';

/** The current world's clock offset in hours (day 1 starts at this hour), from the view.
 * Displays read it rather than assuming a start hour. */
export const ClockOffsetContext = createContext(0);
/** Timed readers subscribe directly, so an open deadline need not rebuild the
 * inventory's otherwise unchanged presentation on each clock publication. */
const SimulationClockContext = createContext<GameView['clock'] | null>(null);
export function useSimulationClock() {
  const clock = useContext(SimulationClockContext);
  if (!clock) throw new Error('A timed game control requires the current world clock.');
  return clock;
}

export function WorldClockProvider({
  clock,
  children,
}: {
  clock?: GameView['clock'];
  children: ReactNode;
}) {
  return (
    <ClockOffsetContext.Provider value={clock?.offsetHours ?? 0}>
      <SimulationClockContext.Provider value={clock ?? null}>
        {children}
      </SimulationClockContext.Provider>
    </ClockOffsetContext.Provider>
  );
}

/** "Day N, HH:MM": the day counts from the world's start; the hour reads its clock. */
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
      Day {day}, {hour}:{minute}
    </time>
  );
}

/** A personally known deadline, with a current-speed estimate rather than a
 * promise about provider waits, pauses or later speed choices. */
export function GameDeadline({ at, label = 'Ends' }: { at: number; label?: string }) {
  const clock = useSimulationClock(),
    remaining = Math.max(0, at - clock.seconds),
    real = remaining / (clock.baseRatio * clock.speed);
  const estimate =
    real < 60 ? Math.ceil(real) + ' real seconds' : Math.ceil(real / 60) + ' real minutes';
  return (
    <p className="ol-caption">
      {label} <EventTime time={at} /> · {Math.ceil(remaining / 60)} game minutes remaining · about{' '}
      {estimate} at {clock.speed}× while running{clock.paused ? ' (currently paused)' : ''}.
    </p>
  );
}
