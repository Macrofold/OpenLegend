import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { worldClockParts, worldClockText, type GameView } from '@open-legend/protocol';

/** The current world's local-clock offset in hours, from the view.
 * Displays read it rather than assuming a start hour. */
type ClockPresentation = Pick<GameView['clock'], 'offsetHours' | 'dayLabel'>;
const ClockPresentationContext = createContext<ClockPresentation>({ offsetHours: 0 });
export function ClockPresentationProvider({
  clock,
  children,
}: {
  clock?: ClockPresentation;
  children: ReactNode;
}) {
  // Historical timestamps do not change on ordinary simulation clock ticks.
  const value = useMemo(
    () => ({
      offsetHours: clock?.offsetHours ?? 0,
      ...(clock?.dayLabel ? { dayLabel: clock.dayLabel } : {}),
    }),
    [clock?.offsetHours, clock?.dayLabel],
  );
  return (
    <ClockPresentationContext.Provider value={value}>{children}</ClockPresentationContext.Provider>
  );
}
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
    <ClockPresentationProvider clock={clock}>
      <SimulationClockContext.Provider value={clock ?? null}>
        {children}
      </SimulationClockContext.Provider>
    </ClockPresentationProvider>
  );
}

/** The day changes at the installed world's midnight. */
export function clockParts(time: number, offsetHours: number) {
  const clock = worldClockParts(time, offsetHours);
  return {
    day: clock.day,
    hour: String(Math.floor(clock.hour)).padStart(2, '0'),
    minute: String(clock.minute).padStart(2, '0'),
  };
}

export function EventTime({ time }: { time: number }) {
  const clock = useContext(ClockPresentationContext);
  const text = worldClockText(time, clock.offsetHours, clock.dayLabel);
  return (
    <time className="ol-event-time" aria-label={text}>
      {text}
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
