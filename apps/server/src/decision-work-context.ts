import {
  ACTIVITY_SYNTAX,
  renderActivity,
  type ActivityView,
  type Outcome,
  type WorkTransitionMode,
} from '@open-legend/domain';

export interface RemainingActivityRead {
  readonly status: 'active' | 'blocked' | 'completed' | 'cancelled';
  readonly paused: boolean;
  readonly view?: Omit<ActivityView, 'name'> & { readonly name?: string };
}
/** Both consumers render actual prepared step views. An unavailable view is
 * distinct from a plan with no remaining steps. */
export function formatRemainingActivity(read: RemainingActivityRead | null): string {
  if (!read) return 'No remaining chosen work.';
  if (read.status === 'completed' || read.status === 'cancelled')
    return `Chosen work is ${read.status}. No remaining steps in this plan. Actual outcomes are in my selected memories; finishing steps does not establish goal fulfillment.`;
  if (!read.view) throw new Error('Remaining chosen-work views are unavailable.');
  const disposition =
    read.status === 'blocked'
      ? 'Choosing a new action replaces this stopped plan.'
      : read.paused
        ? 'This work is paused; its remaining steps are not currently running.'
        : 'Choosing a different action interrupts this activity.';
  return `${ACTIVITY_SYNTAX}\n${renderActivity({ ...read.view, name: read.view.name ?? 'Chosen work' }, 'Remaining')} ${disposition} Completed effects and spent materials remain.`;
}
export function formatPausedWork(remaining: string | null): string | null {
  return remaining === null
    ? null
    : `Earlier work is paused. ${remaining} It resumes, after rechecking its targets, when my current work ends. An explicitly offered return checks its remaining first action before ending the intervention and retains its original limits. Ordinary stopping or replacement discards paused work.`;
}

export interface DecisionWorkHandlingRead {
  readonly handling: WorkTransitionMode;
  readonly outcome: Pick<Outcome, 'ok' | 'message'>;
  readonly lostWorkSeconds: number;
  readonly spentInputs: readonly { readonly material: string; readonly quantity: number }[];
  readonly pausedWork: 'unchanged' | 'discarded' | 'restart-current-step';
  readonly recovery: { readonly combatUntil: number; readonly evadeUntil: number };
}
export function formatDecisionWorkHandling(
  read:
    | DecisionWorkHandlingRead
    | { readonly handling: WorkTransitionMode; readonly unavailable: string },
) {
  if ('unavailable' in read)
    return { handling: read.handling, available: false, reason: read.unavailable };
  return {
    handling: read.handling,
    available: read.outcome.ok,
    explanation: read.outcome.message,
    lostGameSecondsOfWork: read.lostWorkSeconds,
    spentMaterialsNotRefunded: read.spentInputs,
    pausedWork:
      read.pausedWork === 'discarded'
        ? 'Earlier paused work is discarded.'
        : read.pausedWork === 'restart-current-step'
          ? 'Current unfinished step restarts when resumed.'
          : 'Earlier paused work is unchanged.',
    combatRecoveryUntilGameTime: read.recovery.combatUntil,
    evasionRecoveryUntilGameTime: read.recovery.evadeUntil,
  };
}
