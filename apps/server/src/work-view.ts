import {
  nativeActivityView,
  type ActivityNode,
  type ActorPlan,
  type PlanStep,
  type WorldState,
} from '@open-legend/domain';
import type { WorkStepView, WorkView } from '@open-legend/protocol';
import { gameTime } from './recall.js';

/** Project the controlled actor's own chosen work: labels name only what the actor perceives
 * now, and reasons are the recorded native outcome messages, never hidden causes.
 * docs/action-capabilities.md#18-interface-and-presentation
 */
export function projectWork(world: WorldState, actorId: string): WorkView | null {
  const actor = world.entities[actorId]?.actor;
  if (!actor) return null;
  const { plan, suspended } = actor.agency;
  // An action started directly (not a plan step) is current work too, and Stop ends it.
  const direct =
    !!actor.action &&
    ![plan, suspended].some((entry) =>
      entry?.steps.some((step) => step.actionId === actor.action!.id),
    );
  if (!plan && !suspended && !direct) return null;
  // Active or blocked work stays visible (a blocked plan still decides what can be queued);
  // only finished work gives way to a direct action.
  const shown = !!plan && (plan.status === 'active' || plan.status === 'blocked' || !direct);
  const main = shown
    ? withDirect(
        frontier(world, actorId, plan!, direct),
        direct && plan!.status !== 'active' ? actor.action!.id : undefined,
      )
    : direct
      ? { label: 'Current action, started directly', state: 'running' as const, steps: [] }
      : undefined;
  return {
    id: [shown ? plan!.id : '', suspended?.id ?? '', direct ? actor.action!.id : ''].join('|'),
    label: main?.label ?? 'No current work',
    state: main?.state ?? 'completed',
    ...(main?.reason ? { reason: main.reason } : {}),
    steps: main?.steps ?? [],
    paused: suspended
      ? {
          label: planName(world, suspended),
          steps: suspended.steps
            .filter((step) => step.status === 'queued')
            .map((step) => ({ id: step.id, label: stepLabel(world, step), state: 'paused' })),
        }
      : null,
  };
}

/** A blocked or finished plan's card still shows an action started directly meanwhile. */
function withDirect<T extends { steps: WorkStepView[] }>(card: T, actionId: string | undefined): T {
  return actionId
    ? {
        ...card,
        steps: [
          ...card.steps,
          { id: actionId, label: 'Current action, started directly', state: 'running' },
        ],
      }
    : card;
}

function planName(world: WorldState, plan: ActorPlan): string {
  return (
    plan.activity?.request?.name ??
    world.actionExperience.methods[plan.activity?.methodId ?? '']?.name ??
    (plan.steps.length === 1
      ? stepLabel(world, plan.steps[0]!)
      : `${plan.steps.length} chosen steps`)
  );
}

function stepLabel(world: WorldState, step: PlanStep): string {
  if ('itemFromStep' in step.command) return 'Use an earlier result';
  const view = nativeActivityView(world, step.command);
  return view.target && !view.name.includes(view.target)
    ? `${view.name}: ${view.target}`
    : view.name;
}

function nodeLabel(node: ActivityNode, iteration: number): string {
  return node.kind === 'repeat'
    ? `${node.name} (attempt ${iteration + 1} of at most ${node.maximum})`
    : node.name;
}

function frontier(world: WorldState, actorId: string, plan: ActorPlan, direct: boolean) {
  const action = world.entities[actorId]!.actor!.action;
  const steps: WorkStepView[] = plan.steps.map((step) => ({
    id: step.id,
    label: stepLabel(world, step),
    state:
      step.status === 'running' ? 'running' : step.status === 'queued' ? 'queued' : step.status,
    ...(step.status === 'running' && action && action.id === step.actionId
      ? {
          reason: action.navigation
            ? 'preparing a route'
            : action.stage === 'approaching'
              ? 'moving into reach'
              : undefined,
        }
      : // A plain "completed" adds nothing; misses, drops and failures say what happened.
        step.outcome && step.status !== 'queued' && step.outcome.code !== 'completed'
        ? { reason: step.outcome.message }
        : {}),
  }));
  for (const step of steps) if (step.reason === undefined) delete step.reason;
  const next = plan.activity?.pending.at(-1);
  const waiting =
    plan.status === 'active' &&
    !action &&
    !plan.steps.some((step) => step.status === 'running' || step.status === 'queued') &&
    next?.node.kind === 'wait';
  // A repeat at its attempt limit only checks whether to stop; no further attempt is queued.
  if (
    plan.status === 'active' &&
    next &&
    !(next.node.kind === 'repeat' && next.iteration >= next.node.maximum)
  )
    steps.push({
      id: 'next',
      label: nodeLabel(next.node, next.iteration),
      state: waiting ? 'waiting' : 'queued',
    });
  const blockedStep = [...plan.steps].reverse().find((step) => step.status === 'blocked');
  const state: WorkView['state'] =
    plan.status !== 'active'
      ? plan.status
      : plan.steps.some((step) => step.status === 'running')
        ? 'running'
        : waiting
          ? 'waiting'
          : 'queued';
  const reason =
    plan.status === 'blocked'
      ? (plan.activity?.reason ?? blockedStep?.outcome?.message)
      : waiting && next!.node.kind === 'wait' && next!.node.until.test === 'time'
        ? `Ends at ${gameTime(next!.node.until.at, world.statusEffectPolicy.clockOffsetHours)}; anything chosen meanwhile can interrupt it.`
        : direct && state === 'queued'
          ? 'Starts after the action already under way ends.'
          : undefined;
  return { label: planName(world, plan), state, ...(reason ? { reason } : {}), steps };
}
