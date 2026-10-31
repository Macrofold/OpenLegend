import type { DecisionState, HigherDecision } from './decision-state.js';

/** A stage inherits the admitted decision's remaining lifetime, never another
 * full timeout. Higher dispatch eligibility is checked separately from completion.
 * docs/projects/decision-escalation-tech-design.md#shared-deadline-propagation-and-lifecycle */
export function decisionRequestDeadline(
  state: DecisionState,
  wall: number,
  monotonic: number,
  earlier?: number,
  higher?: HigherDecision,
): number {
  return Math.min(
    earlier ?? Infinity,
    Date.now() +
      Math.min(
        state.usefulUntilWall - wall,
        state.usefulUntilMonotonic - monotonic,
        higher ? higher.publishBy - wall : Infinity,
        higher ? higher.publishByMonotonic - monotonic : Infinity,
      ),
  );
}

/** Nested unpaid waits share one interval, including queued clock persistence.
 * A later interval caps an earlier pending release so elapsed time is counted once. */
export interface DecisionTimingHold {
  depth: number;
  wall: number;
  monotonic: number;
  creditUntil?: { wall: number; monotonic: number };
}

export function acquireDecisionTimingHold(
  previous: DecisionTimingHold | undefined,
  wall: number,
  monotonic: number,
) {
  const start = { wall, monotonic };
  let hold: DecisionTimingHold;
  if (previous?.depth) hold = previous;
  else {
    if (previous) previous.creditUntil ??= start;
    hold = { depth: 0, ...start };
  }
  hold.depth++;
  let released = false;
  return {
    hold,
    release: () => {
      if (released) return;
      released = true;
      if (--hold.depth) return;
      return {
        elapsed: (endWall: number, endMonotonic: number) => ({
          wall: Math.max(0, Math.min(endWall, hold.creditUntil?.wall ?? endWall) - hold.wall),
          monotonic: Math.max(
            0,
            Math.min(endMonotonic, hold.creditUntil?.monotonic ?? endMonotonic) - hold.monotonic,
          ),
        }),
      };
    },
  };
}
