import { activitySpendCeiling } from './activity-hosts.js';
import { person, type Narration } from './narration.js';
import { itemFor } from './objects.js';
import { BASE_FAMILY_FACTS } from './worlds/base/actions.js';
import {
  activityFrontier,
  reconcileActivityControl,
  startRequestedActivity,
  type ActivityExecution,
} from './activity-execution.js';
import {
  endActivity,
  occurrenceFor,
  renderActivity,
  validateActivityNode,
} from './action-experience.js';
import { releaseInvocationResources } from './resource-claims.js';
import {
  actionTargetsCurrent,
  captureActionTargets,
  validActionTargets,
  type ActionTargetEpisodes,
} from './action-targets.js';
import { capabilityBlocked } from './status-capabilities.js';
import {
  slotsKey,
  validActionFulfillment,
  validActionResolution,
  validIntentSlotShape,
  validIntentSlots,
  type ActionFulfillment,
  type ActionResolution,
  type IntentSlots,
} from './action-capabilities.js';
import { FOLLOW_RULES } from './follow.js';
import { finitePoint, type SurfacePoint } from '@open-legend/spatial';
import { seesEntity } from './perception.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { supportedPosition } from './spatial-state.js';
import { isFireCareCommand } from './worlds/base/fire.js';
import { validAssemblyPhase } from './assemblies.js';
import { cloneValue } from './draft.js';
import { appendMemory, outcome } from './events.js';
import { isSafeRecordId } from './records.js';
import type { ActorComponent, Command, Outcome, WorldState } from './types.js';

/** Families whose completed step records a single item a plain later step may use: the world
 * declares its own; picking up is the engine's. Validation and prompt text read this list. */
export const ITEM_OUTPUT_FAMILIES: readonly string[] = [
  ...BASE_FAMILY_FACTS.singleItemReceipt,
  'pickup',
];
/** Families whose outputs a later step may use through a named output port. */
const PORT_OUTPUT_FAMILIES: readonly string[] = [...BASE_FAMILY_FACTS.itemOutputs, 'pickup'];
/** The item kind a producing step yields when that is known before it runs, from the step's
 * own target or the world's family facts (cooking's output). */
export function producedItemDefinition(world: WorldState, command: Command): string | undefined {
  if (command.type === 'gather') return world.entities[command.targetId]?.resource?.definitionId;
  if (command.type === 'cook') return BASE_FAMILY_FACTS.cooking.output;
  if (command.type === 'pickup' && command.itemId)
    return itemFor(world, command.itemId)?.definitionId;
  return undefined;
}
export const AGENCY_LIMITS = {
  goals: 8,
  goalHistory: 16,
  steps: 8,
  history: 32,
  places: 8,
} as const;
/** Where this actor itself last saw something while acting on or following it. Private
 * evidence, never a live position; the oldest place is forgotten first.
 * docs/action-capabilities.md#62-binding-time-is-part-of-meaning
 */
export interface RememberedPlace {
  subjectId: string;
  /** How the actor described it then; matching never consults the live entity. */
  label: string;
  /** The perception episode of that sighting; a new encounter is not the same subject
   * unless recognition holds (subjectReferenceCurrent). */
  episode: string | null;
  point: SurfacePoint;
  at: number;
}
export interface ActorGoal {
  id: string;
  revision: number;
  objective: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  parentId: string | null;
  author: 'creator' | 'actor' | 'player' | 'god';
  sourceId: string;
  completion: 'actor-declared' | null;
}
export interface GoalChange {
  operation: 'create' | 'revise' | 'pause' | 'resume' | 'complete' | 'abandon';
  goalId: string | null;
  expectedRevision: number | null;
  objective: string | null;
  parentId: string | null;
}
export type ItemOutputCommand = {
  purpose?: string;
  id: string;
  actorId: string;
  type: 'equip' | 'eat' | 'cook';
  itemFromStep: string;
  outputPort?: string;
  quantity?: number;
  heatId?: string;
};
export type PlannedCommand = Command | ItemOutputCommand;
export interface PlanStep {
  targetEpisodes?: ActionTargetEpisodes;
  /** The activity node that produced this step; its outputs bind only under this key. */
  activityKey?: string;
  id: string;
  command: PlannedCommand;
  status: 'queued' | 'running' | 'completed' | 'blocked' | 'cancelled';
  actionId?: string;
  outcome?: Outcome;
  resultMemoryId?: string;
}
export interface ActorPlan {
  resultMemoryId?: string;
  activity?: ActivityExecution;
  id: string;
  revision: number;
  goalId: string | null;
  status: 'active' | 'blocked' | 'completed' | 'cancelled';
  steps: PlanStep[];
}
export interface ActorAgency {
  lastResultMemoryId?: string;
  attempts: {
    id: string;
    description: string;
    normalized: string;
    targetEntityId: string | null;
    /** Exact references/amounts from the request; part of the intent identity. */
    slots?: IntentSlots;
    mode: 'enqueue' | 'replace' | 'interrupt';
    manifestRevision: number;
    status: 'needs-interpretation' | 'awaiting-confirmation';
    /** Why it did not bind; its signature suppresses unchanged autonomous retries. */
    resolution?: ActionResolution;
    alternative?: {
      targetEpisodes?: ActionTargetEpisodes;
      commands: Command[];
      fulfillment: ActionFulfillment;
      mode: 'enqueue' | 'replace' | 'interrupt';
      expectedPlan: number;
    };
  }[];
  revision: number;
  goals: ActorGoal[];
  plan: ActorPlan | null;
  /** One paused frontier, resumed after the interrupting work ends and revalidates. */
  suspended?: ActorPlan | null;
  history: PlanStep[];
  places?: RememberedPlace[];
}
/** Existing plan/history bounds limit these actor-local references. Retrieval applies
 * correction, forgetting and retention; execution receipts cannot recreate lost evidence. */
export function requiredOutcomeMemoryIds(world: WorldState, actorId: string): string[] {
  const agency = world.entities[actorId]?.actor?.agency;
  if (!agency) return [];
  const plans = [agency.plan, agency.suspended];
  return [
    ...new Set(
      [
        agency.lastResultMemoryId,
        ...plans.flatMap((plan) =>
          plan ? [plan.resultMemoryId, ...plan.steps.map((step) => step.resultMemoryId)] : [],
        ),
        ...agency.history.map((step) => step.resultMemoryId),
      ].filter((id): id is string => !!id),
    ),
  ];
}

export function seedAgency(objectives: string[] = []): ActorAgency {
  return {
    revision: 0,
    goals: objectives.map((objective, index) => ({
      id: `seed-goal:${index}`,
      revision: 0,
      objective,
      status: 'active',
      parentId: null,
      author: 'creator',
      sourceId: 'creation',
      completion: null,
    })),
    plan: null,
    history: [],
    attempts: [],
  };
}
export function rememberSighting(
  world: WorldState,
  actorId: string,
  subjectId: string,
  point: SurfacePoint,
): void {
  const actor = world.entities[actorId]!.actor!;
  const places = (actor.agency.places ??= []);
  const episode = world.perceptionEpisodes?.[actorId]?.[subjectId] ?? null;
  const last = places.at(-1);
  if (last?.subjectId === subjectId && last.episode === episode) {
    // Continuous observation updates one record instead of churning the list.
    last.point = { x: point.x, y: point.y, z: point.z, surfaceId: point.surfaceId };
    last.at = world.simTime;
    // A name learned during the same encounter describes this sighting too.
    last.label = observerDescription(world, actorId, subjectId).slice(0, 120);
    return;
  }
  const index = places.findIndex((place) => place.subjectId === subjectId);
  if (index >= 0) places.splice(index, 1);
  places.push({
    subjectId,
    label: observerDescription(world, actorId, subjectId).slice(0, 120),
    episode,
    point: { x: point.x, y: point.y, z: point.z, surfaceId: point.surfaceId },
    at: world.simTime,
  });
  if (places.length > AGENCY_LIMITS.places) places.shift();
}
export function rememberedPlace(
  actor: ActorComponent,
  subjectId: string,
): RememberedPlace | undefined {
  return actor.agency.places?.find((place) => place.subjectId === subjectId);
}
export function goalTexts(actor: ActorComponent): string[] {
  return actor.agency.goals
    .filter((goal) => goal.status === 'active')
    .map((goal) => goal.objective);
}
export function currentGoal(actor: ActorComponent): string {
  return goalTexts(actor).join('; ');
}
function terminal(goal: ActorGoal): boolean {
  return goal.status === 'completed' || goal.status === 'abandoned';
}

/** All operational goal writes share this boundary; prose never edits intentions.
 * archive/07-technical-architecture/agent-agency-runtime.md#32-single-ownership-and-existing-fields
 */
export function changeGoal(
  actor: ActorComponent,
  change: GoalChange,
  id: string,
  author: ActorGoal['author'],
): Outcome {
  const agency = actor.agency;
  const reject = (message: string) => outcome(false, 'invalid-goal', message);
  if (
    !isSafeRecordId(id) ||
    !change ||
    !['create', 'revise', 'pause', 'resume', 'complete', 'abandon'].includes(change.operation) ||
    !(change.goalId === null || isSafeRecordId(change.goalId)) ||
    !(change.parentId === null || isSafeRecordId(change.parentId))
  )
    return reject('Invalid goal mutation identity or reference.');
  const create = change.operation === 'create';
  const goal = agency.goals.find((entry) => entry.id === change.goalId);
  if (
    create
      ? change.goalId !== null || change.expectedRevision !== null
      : !goal || goal.revision !== change.expectedRevision
  )
    return reject('Goal identity or revision changed. Refresh this actor’s intentions.');
  if (create || change.operation === 'revise') {
    if (
      typeof change.objective !== 'string' ||
      !change.objective.trim() ||
      change.objective.length > 500
    )
      return reject('An objective needs 1–500 characters.');
    if (change.parentId) {
      const visited = new Set([create ? id : goal!.id]);
      let parent = agency.goals.find((entry) => entry.id === change.parentId);
      if (!parent || terminal(parent))
        return reject('Parent must be a current goal of this actor.');
      while (parent) {
        if (visited.has(parent.id)) return reject('Goals cannot contain parent cycles.');
        visited.add(parent.id);
        parent = agency.goals.find((entry) => entry.id === parent!.parentId);
      }
    }
  } else if (change.objective !== null || change.parentId !== null)
    return reject('Status changes do not rewrite the objective or parent.');
  const activating = create || change.operation === 'resume';
  if (
    activating &&
    (!goal || terminal(goal)) &&
    agency.goals.filter((entry) => !terminal(entry)).length >= AGENCY_LIMITS.goals
  )
    return reject(
      'Eight active/paused goals are already retained. Explicitly complete or abandon one first.',
    );
  if (create) {
    if (agency.goals.some((entry) => entry.id === id))
      return reject('Goal identity already exists.');
    // Retain parents and plan references; refuse growth rather than silently dropping obligations.
    const removable = agency.goals.filter(
      (entry) =>
        terminal(entry) &&
        agency.plan?.goalId !== entry.id &&
        agency.suspended?.goalId !== entry.id &&
        !agency.goals.some((child) => child.parentId === entry.id),
    );
    if (agency.goals.length >= AGENCY_LIMITS.goals + AGENCY_LIMITS.goalHistory && !removable.length)
      return reject('Goal history is full of referenced goals.');
    if (agency.goals.length >= AGENCY_LIMITS.goals + AGENCY_LIMITS.goalHistory)
      agency.goals.splice(agency.goals.indexOf(removable[0]!), 1);
    agency.goals.push({
      id,
      revision: 0,
      objective: change.objective!.trim(),
      status: 'active',
      parentId: change.parentId,
      author,
      sourceId: id,
      completion: null,
    });
  } else {
    if (!['revise', 'pause', 'resume', 'complete', 'abandon'].includes(change.operation))
      return reject('Unknown goal change.');
    if (change.operation === 'revise') {
      goal!.objective = change.objective!.trim();
      goal!.parentId = change.parentId;
    } else {
      goal!.status = (
        { pause: 'paused', resume: 'active', complete: 'completed', abandon: 'abandoned' } as const
      )[change.operation as 'pause' | 'resume' | 'complete' | 'abandon'];
      goal!.completion = change.operation === 'complete' ? 'actor-declared' : null;
    }
    goal!.revision++;
    goal!.author = author;
    goal!.sourceId = id;
  }
  agency.revision++;
  return {
    ...outcome(
      true,
      'goal-updated',
      'Private intention updated; no physical achievement is implied.',
    ),
    goalId: create ? id : goal!.id,
  };
}

/** Explicit player/god replacement uses the same mutations and preserves immutable creation seeds. */
export function replaceGoals(
  actor: ActorComponent,
  objectives: string[],
  id: string,
  author: 'player' | 'god',
): Outcome {
  if (
    objectives.length > AGENCY_LIMITS.goals ||
    objectives.some((text) => !text.trim() || text.length > 500)
  )
    return outcome(false, 'invalid-goal', 'Provide at most eight objectives of 1–500 characters.');
  const candidate = cloneValue(actor);
  for (const goal of candidate.agency.goals.filter((entry) => !terminal(entry))) {
    const result = changeGoal(
      candidate,
      {
        operation: 'abandon',
        goalId: goal.id,
        expectedRevision: goal.revision,
        objective: null,
        parentId: null,
      },
      `${id}:end:${goal.id}`.slice(0, 180),
      author,
    );
    if (!result.ok) return result;
  }
  for (const [index, objective] of objectives.entries()) {
    const result = changeGoal(
      candidate,
      { operation: 'create', goalId: null, expectedRevision: null, objective, parentId: null },
      `${id}:${index}`,
      author,
    );
    if (!result.ok) return result;
  }
  actor.agency = candidate.agency;
  return outcome(true, 'goal-set', 'Private intentions updated.');
}

export function arrangePlan(
  world: WorldState,
  actor: ActorComponent,
  id: string,
  commands: PlannedCommand[],
  mode: 'enqueue' | 'replace' | 'interrupt',
  expectedRevision: number,
  goalId: string | null,
): Outcome {
  const agency = actor.agency;
  const current = agency.plan;
  if (
    !isSafeRecordId(id) ||
    !['enqueue', 'replace', 'interrupt'].includes(mode) ||
    new Set(commands.map((command) => command.id)).size !== commands.length
  )
    return outcome(false, 'invalid-plan', 'Plan and child identities must be valid and unique.');
  if ((current?.revision ?? 0) !== expectedRevision)
    return outcome(false, 'stale-plan', 'Refresh the changed plan before editing it.');
  if (goalId && !agency.goals.some((goal) => goal.id === goalId && goal.status === 'active'))
    return outcome(
      false,
      'invalid-goal',
      'A plan requires an active goal belonging to this actor.',
    );
  if (!commands.length || commands.length > AGENCY_LIMITS.steps)
    return outcome(false, 'plan-limit', 'A frontier needs one to eight steps.');
  if (commands.some((command) => !isPlannedCommand(command)))
    return outcome(false, 'invalid-plan', 'Only native physical work can be queued.');
  if (mode === 'enqueue' && current?.activity?.control && !current.activity.terminal)
    return outcome(
      false,
      'chosen-activity-active',
      'Finish this chosen activity or explicitly replace or interrupt it before adding other work.',
    );
  const prior =
    mode === 'enqueue' && current?.status === 'active'
      ? current.steps.map((step) => step.command)
      : [];
  if (!validOutputReferences([...prior, ...commands]))
    return outcome(
      false,
      'invalid-plan',
      'Item references require an earlier single-output native step.',
    );
  if (
    mode === 'enqueue' &&
    current &&
    current.status !== 'completed' &&
    current.status !== 'cancelled'
  ) {
    if (current.status === 'blocked')
      return outcome(false, 'plan-blocked', 'Explicitly replace or cancel the blocked frontier.');
    if (
      current.steps.length + commands.length > AGENCY_LIMITS.steps ||
      (goalId !== null && current.goalId !== goalId)
    )
      return outcome(false, 'plan-limit', 'Frontier is full or belongs to a different goal.');
    current.steps.push(
      ...commands.map((command) => ({
        id: command.id,
        command: cloneValue(command),
        targetEpisodes: captureActionTargets(world, command.actorId, [command]),
        status: 'queued' as const,
      })),
    );
    current.revision++;
  } else {
    if (mode === 'replace') stopCurrentWork(world, commands[0]!.actorId);
    else if (mode === 'interrupt') {
      const refused = suspendCurrentWork(world, commands[0]!.actorId);
      if (refused) return refused;
    }
    if (agency.plan) retirePlan(world, actor);
    agency.plan = {
      id,
      revision: (current?.revision ?? 0) + 1,
      goalId,
      status: 'active',
      steps: commands.map((command) => ({
        id: command.id,
        command: cloneValue(command),
        targetEpisodes: captureActionTargets(world, command.actorId, [command]),
        status: 'queued',
      })),
    };
  }
  agency.revision++;
  // Queued edits are new execution intent too, even before any physical step starts.
  // docs/architecture.md#action-fulfillment-and-revision-approval
  actor.planGeneration++;
  return {
    ...outcome(true, 'queued', 'Native work queued; it has not completed.'),
    planId: agency.plan!.id,
  };
}
/** Move a finished or cancelled frontier's steps into bounded history. */
function retirePlan(world: WorldState, actor: ActorComponent, actorId?: string): void {
  const current = actor.agency.plan;
  if (!current) return;
  cancelPlan(world, actor, actorId);
  actor.agency.history.push(...current.steps.map(cloneValue));
  actor.agency.history = actor.agency.history.slice(-AGENCY_LIMITS.history);
  // Retirement consumes the frontier; replacement must not archive it again.
  actor.agency.plan = null;
}
/** Explicit replacement follows native cancellation: spent inputs are never refunded, and
 * work that was paused for later resumption is discarded too. */
export function stopCurrentWork(world: WorldState, actorId: string): void {
  const actor = world.entities[actorId]!.actor!;
  retirePlan(world, actor, actorId);
  discardSuspended(world, actor, actorId);
  if (actor.action) {
    endActivity(
      world,
      actorId,
      actor.action.id,
      outcome(false, 'cancelled', 'Replaced by newly chosen work; committed effects remain.'),
    );
    releaseInvocationResources(world, actor.action.id);
    actor.action = null;
    actor.planGeneration++;
  }
}
/** Why the current native work cannot stop at a safe boundary, if it cannot. Families that
 * already spent inputs or committed a strike finish or are replaced instead; nothing is
 * refunded and no progress is invented. docs/action-capabilities.md#15-resource-claims-interruption-and-timing
 */
export function pauseRefusal(action: ActorComponent['action']): string | null {
  if (!action) return null;
  if (action.type === 'status-effect') return 'This state cannot be paused.';
  if (
    action.strikePhase ||
    ((BASE_FAMILY_FACTS.unpausableWhileWorking as readonly string[]).includes(action.type) &&
      action.stage === 'working')
  )
    return 'An attack already under way cannot be paused; let it finish or replace it.';
  if (action.stage === 'working' && action.consumed.length)
    return 'Materials are already in use for this step; let it finish or replace it.';
  return null;
}

/** Pause the current frontier for other work. The running step stops at a safe boundary and
 * is re-queued to restart from scratch later: effects already committed stay, elapsed work
 * on that step is not kept. One paused frontier at most. */
export function suspendCurrentWork(world: WorldState, actorId: string): Outcome | null {
  const actor = world.entities[actorId]!.actor!;
  const plan = actor.agency.plan;
  if (!plan || plan.status !== 'active') return null;
  if (actor.agency.suspended)
    return outcome(
      false,
      'already-paused',
      'Other paused work is already waiting to resume; let it resume, or replace it.',
    );
  const running = plan.steps.findIndex((step) => step.status === 'running');
  const step = running >= 0 ? plan.steps[running]! : undefined;
  // Every refusal is decided before anything stops. Only the plan's own running step can
  // restart later; a separate direct action is not chosen work that can be paused.
  if (actor.action && step?.actionId !== actor.action.id)
    return outcome(
      false,
      'cannot-pause',
      'This work is not a chosen plan that can be paused; replace it or let it finish.',
    );
  const refusal = pauseRefusal(actor.action);
  if (refusal) return outcome(false, 'cannot-pause', refusal);
  if (plan.activity?.control) plan.activity.interrupted = true;
  const restartId = step && `${step.id}:r${plan.revision}`;
  if (restartId && !isSafeRecordId(restartId))
    return outcome(false, 'cannot-pause', 'This work has been paused too many times.');
  if (actor.action) {
    if (step)
      step.resultMemoryId = endActivity(
        world,
        actorId,
        actor.action.id,
        outcome(false, 'paused', 'Paused for other work; this step restarts later.'),
      );
    releaseInvocationResources(world, actor.action.id);
    actor.action = null;
  }
  if (step && restartId) {
    actor.agency.history.push({
      ...cloneValue(step),
      status: 'cancelled',
      outcome: outcome(false, 'paused', 'Paused for other work; restarted later as a new step.'),
    });
    actor.agency.history = actor.agency.history.slice(-AGENCY_LIMITS.history);
    const {
      actionId: _action,
      outcome: _outcome,
      resultMemoryId: _memory,
      ...rest
    } = cloneValue(step);
    plan.steps[running] = {
      ...rest,
      id: restartId,
      command: { ...rest.command, id: restartId },
      status: 'queued',
    };
    // Later steps that use this step's item follow the restarted step.
    for (const other of plan.steps)
      if ('itemFromStep' in other.command && other.command.itemFromStep === step.id)
        other.command = { ...other.command, itemFromStep: restartId };
  }
  plan.revision++;
  actor.agency.suspended = plan;
  actor.agency.plan = null;
  actor.agency.revision++;
  actor.planGeneration++;
  return null;
}

/** Entity references among an activity's bindings. Learned methods also bind spoken text,
 * which is not an entity and must not be checked as one. */
function activityObjectBindings(world: WorldState, plan: ActorPlan): string[] {
  const activity = plan.activity;
  if (!activity) return [];
  const roles = activity.methodId
    ? world.actionExperience.methods[activity.methodId]?.roles
    : undefined;
  return Object.entries(activity.bindings).flatMap(([role, value]) =>
    typeof value === 'string' && (!roles || roles[role]?.kind === 'object') ? [value] : [],
  );
}

/** After the interrupting work ends, revalidate and reinstate the paused frontier. An
 * invalid resumption becomes an explicit blocked plan, never a silent retarget. */
function resumeSuspended(world: WorldState, actorId: string): void {
  const actor = world.entities[actorId]!.actor!;
  const paused = actor.agency.suspended!;
  actor.agency.suspended = null;
  // Plan revisions keep increasing across the interrupting plan, so a decision made while
  // that plan ran can never match the resumed one.
  const latest = Math.max(paused.revision, actor.agency.plan?.revision ?? 0);
  if (actor.agency.plan) retirePlan(world, actor, actorId);
  // A paused goal only defers dispatch (readyPlanStep); a finished or missing one blocks.
  const goal = paused.goalId
    ? actor.agency.goals.find((entry) => entry.id === paused.goalId)
    : undefined;
  const objects = activityObjectBindings(world, paused);
  // Named before any step is marked, so the memory names the work that was stopped.
  const name =
    paused.activity?.request?.name ??
    world.actionExperience.methods[paused.activity?.methodId ?? '']?.name ??
    paused.steps.find((step) => step.status === 'queued')?.command.purpose ??
    'my paused work';
  const changed = paused.steps.find(
    (step) =>
      step.status === 'queued' &&
      !('itemFromStep' in step.command) &&
      !actionTargetsCurrent(world, actorId, [step.command], step.targetEpisodes),
  );
  const reason =
    paused.goalId && (!goal || (goal.status !== 'active' && goal.status !== 'paused'))
      ? 'its goal is no longer active.'
      : changed
        ? 'a target is no longer the one I saw.'
        : objects.some((id) => !Object.hasOwn(world.entities, id) || world.entities[id]!.retirement)
          ? 'something the activity uses no longer exists.'
          : null;
  paused.status = reason ? 'blocked' : 'active';
  if (reason && paused.activity) paused.activity.reason = `Could not resume: ${reason}`;
  else if (reason) {
    // A plain plan records the reason on the step whose target changed, or otherwise on
    // the step that would have run next.
    const next =
      (reason === 'a target is no longer the one I saw.' ? changed : undefined) ??
      paused.steps.find((step) => step.status === 'queued');
    if (next) {
      next.status = 'blocked';
      next.outcome = outcome(false, 'resume-refused', `Could not resume: ${reason}`);
    }
  }
  paused.revision = latest + 1;
  actor.agency.plan = paused;
  actor.agency.revision++;
  actor.planGeneration++;
  recordPlanResult(world, actorId, paused, {
    parts: [
      person(actorId, 'possessive'),
      reason
        ? ` paused work (${name}) could not resume: ${reason} Nothing more of it was done.`
        : ` paused work (${name}) resumed. The stopped step restarts from its beginning.`,
    ],
  });
}

/** Plan-control results use the same personal memory owner as physical outcomes. */
export function recordPlanResult(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
  summary: string | Narration,
): void {
  linkPlanResult(
    world,
    actorId,
    plan,
    appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      importance: 6,
      entityIds: [actorId],
      summary,
    }),
  );
}
/** Retain existing personal evidence without writing a second account of the occurrence. */
export function linkPlanResult(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
  evidenceId: string | undefined,
): void {
  plan.resultMemoryId = evidenceId;
  world.entities[actorId]!.actor!.agency.lastResultMemoryId = evidenceId;
}

/** Cancellation and suspended-work discard share one terminal report. The marker
 * prevents retiring the same watch later from inventing a second result. */
function summarizeStoppedActivity(
  world: WorldState,
  plan: ActorPlan,
  actorId?: string,
  reason?: string,
): void {
  const execution = plan.activity;
  const ownerId = actorId ?? plan.steps[0]?.command.actorId;
  if (!execution?.control) {
    if (ownerId)
      recordPlanResult(world, ownerId, plan, {
        parts: [
          person(ownerId, 'possessive'),
          ` chosen work was cancelled at simulation time ${world.simTime}. ${plan.steps.filter((step) => !step.actionId).length} queued steps never started. Previously committed effects and costs remain; no further result is claimed.`,
        ],
      });
    return;
  }
  if (execution.terminal) return;
  execution.pending = [];
  execution.terminal = true;
  execution.reason =
    reason ??
    'The chosen activity was stopped. Completed transfers remain in their actual destination.';
  if (ownerId) {
    recordPlanResult(
      world,
      ownerId,
      plan,
      `${execution.request?.name ?? 'Chosen activity'}: ${execution.reason} Used ${execution.spent ?? 0} selected units in ${execution.attempts ?? 0} attempts. The chosen stopping time was simulation time ${execution.control.deadline}.${execution.interrupted ? ' Attendance was interrupted.' : ''}`,
    );
  }
}

/** An explicit stop ends paused work too; nothing of it resumes. The paused
 * watch's terminal report must survive discarding its future authority. */
export function discardSuspended(world: WorldState, actor: ActorComponent, actorId?: string): void {
  const paused = actor.agency.suspended;
  if (!paused) return;
  summarizeStoppedActivity(world, paused, actorId);
  actor.agency.suspended = null;
  actor.agency.history.push(
    ...paused.steps.map((step) =>
      step.status === 'queued'
        ? {
            ...cloneValue(step),
            status: 'cancelled' as const,
            outcome: outcome(false, 'cancelled', 'Paused work was cancelled; it will not resume.'),
          }
        : cloneValue(step),
    ),
  );
  actor.agency.history = actor.agency.history.slice(-AGENCY_LIMITS.history);
  actor.agency.revision++;
}

export function cancelPlan(
  world: WorldState,
  actor: ActorComponent,
  actorId?: string,
  summarizeControl = true,
): void {
  const plan = actor.agency.plan;
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return;
  for (const step of plan.steps)
    if (step.status === 'queued' || step.status === 'running') {
      if (actor.action && step.actionId === actor.action.id) {
        releaseInvocationResources(world, actor.action.id);
        actor.action = null;
        actor.planGeneration++;
      }
      if (step.actionId)
        step.resultMemoryId = endActivity(
          world,
          step.command.actorId,
          step.actionId,
          outcome(false, 'cancelled', 'Cancelled; committed costs remain spent.'),
        );
      step.status = 'cancelled';
      step.outcome = outcome(false, 'cancelled', 'Cancelled; committed costs remain spent.');
    }
  plan.status = 'cancelled';
  if (summarizeControl) summarizeStoppedActivity(world, plan, actorId);
  plan.revision++;
  actor.agency.revision++;
  actor.planGeneration++;
}
export function finishPlanAction(
  world: WorldState,
  actorId: string,
  actionId: string,
  result: Outcome,
): void {
  const resultMemoryId = endActivity(world, actorId, actionId, result);
  releaseInvocationResources(world, actionId);
  const actor = world.entities[actorId]!.actor!;
  const plan = actor.agency.plan;
  const step = plan?.steps.find(
    (entry) => entry.status === 'running' && entry.actionId === actionId,
  );
  if (!step) return;
  if (step.activityKey && plan!.activity?.control?.budget.command === step.command.type) {
    const ceiling =
      'itemFromStep' in step.command ? undefined : activitySpendCeiling(world, step.command);
    if (
      ceiling === undefined ||
      (result.ok && result.spent === undefined) ||
      (result.spent !== undefined &&
        (!Number.isSafeInteger(result.spent) ||
          result.spent < 0 ||
          result.spent > ceiling ||
          (plan!.activity.spent ?? 0) + result.spent > plan!.activity.control!.budget.maximumSpent))
    )
      throw new Error('Counted activity completion violated its trusted spending contract.');
    if (result.ok) plan!.activity.spent = (plan!.activity.spent ?? 0) + result.spent!;
  }
  step.resultMemoryId =
    resultMemoryId ??
    appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      importance: 5,
      entityIds: [actorId],
      summary: `The requested action (${step.command.purpose ?? step.command.type}) ${result.ok ? 'reported completion' : 'was refused'}: ${result.message} Result code: ${result.code}.`,
    });
  actor.agency.lastResultMemoryId = step.resultMemoryId;
  step.outcome = result;
  // Key outputs by the producing node, never by whichever node ran last: a step queued
  // outside the activity must not overwrite an activity output binding.
  if (plan!.activity && step.activityKey)
    plan!.activity.outputs[step.activityKey] = cloneValue(result.outputs ?? []);
  if (!result.ok && plan!.activity) plan!.activity.reason = result.message;
  step.status = result.ok ? 'completed' : 'blocked';
  if (!result.ok && plan!.activity?.control) {
    summarizeStoppedActivity(
      world,
      plan!,
      actorId,
      `${result.message} Completed transfers remain in their actual destination.`,
    );
  }
  plan!.status = !result.ok
    ? 'blocked'
    : (!plan!.activity || !plan!.activity.pending.length) &&
        plan!.steps.every((entry) => entry.status === 'completed')
      ? 'completed'
      : 'active';
  plan!.revision++;
  actor.agency.revision++;
  // Exact action results already belong to personal memories. The plan retains references,
  // not another narrative of the same effects. Goal completion remains actor-declared.
}
export function readyPlanStep(world: WorldState, actorId: string): PlanStep | undefined {
  const actor = world.entities[actorId]!.actor!;
  // Paused work resumes once the interrupting frontier has ended, whatever its outcome.
  if (actor.agency.suspended && !actor.action && actor.agency.plan?.status !== 'active')
    resumeSuspended(world, actorId);
  const plan = actor.agency.plan;
  if (!plan || plan.status !== 'active') return;
  reconcileActivityControl(world, actorId, plan);
  if (plan.status !== 'active') return;
  const running = plan.steps.find((step) => step.status === 'running');
  if (running && running.actionId !== actor.action?.id)
    finishPlanAction(
      world,
      actorId,
      running.actionId!,
      outcome(false, 'interrupted', 'Native work was interrupted; explicitly revise the frontier.'),
    );
  if (
    plan.status !== 'active' ||
    actor.action ||
    !actor.alive ||
    actor.incapacitated ||
    capabilityBlocked(world, world.entities[actorId], 'actions')
  )
    return;
  if (
    plan.goalId &&
    !actor.agency.goals.some((goal) => goal.id === plan.goalId && goal.status === 'active')
  )
    return;
  const next =
    plan.steps.find((step) => step.status === 'queued') ?? activityFrontier(world, actorId, plan);
  const targetId = next && 'targetId' in next.command ? next.command.targetId : undefined;
  const target = targetId ? world.entities[targetId] : undefined;
  const seen = target && supportedPosition(target);
  if (seen && seesEntity(world, world.entities[actorId]!, target))
    rememberSighting(world, actorId, target.id, seen);
  return next;
}
export function validateAgency(world: WorldState): void {
  for (const entity of Object.values(world.entities)) {
    if (!entity.actor) continue;
    const action = entity.actor.action;
    if (
      action?.type === 'follow' &&
      (!action.follow ||
        !isSafeRecordId(action.targetId) ||
        !Number.isFinite(action.follow.distance) ||
        action.follow.distance < FOLLOW_RULES.minimumDistance ||
        action.follow.distance > FOLLOW_RULES.maximumDistance ||
        !Number.isFinite(action.follow.nextRepathAt) ||
        action.follow.nextRepathAt < 0 ||
        (action.follow.lastObservedPosition !== undefined &&
          !finitePoint(action.follow.lastObservedPosition)) ||
        (action.follow.lastSeen !== undefined &&
          (!validPlacePoint(action.follow.lastSeen.point) ||
            !Number.isFinite(action.follow.lastSeen.at))) ||
        (action.follow.travelHeading !== undefined &&
          !Number.isFinite(action.follow.travelHeading)) ||
        (action.follow.episode !== undefined && !isSafeRecordId(action.follow.episode)) ||
        (action.follow.relation !== undefined &&
          !['behind', 'beside'].includes(action.follow.relation)) ||
        (action.follow.side !== undefined && ![1, -1].includes(action.follow.side)) ||
        (action.follow.onLost !== undefined && action.follow.onLost !== 'last-seen') ||
        (action.follow.pursuing !== undefined &&
          (action.follow.pursuing !== true || !action.follow.lastSeen)) ||
        (action.follow.until !== undefined && !Number.isFinite(action.follow.until)))
    )
      throw new Error('Invalid saved follow activity.');
    const agency = entity.actor.agency;
    if (
      agency?.places !== undefined &&
      (!Array.isArray(agency.places) ||
        agency.places.length > AGENCY_LIMITS.places ||
        new Set(agency.places.map((place) => place.subjectId)).size !== agency.places.length ||
        agency.places.some(
          (place) =>
            !isSafeRecordId(place.subjectId) ||
            typeof place.label !== 'string' ||
            !place.label.trim() ||
            place.label.length > 120 ||
            !(place.episode === null || isSafeRecordId(place.episode)) ||
            !validPlacePoint(place.point) ||
            !Number.isFinite(place.at),
        ))
    )
      throw new Error('Invalid saved remembered places.');
    if (
      !agency ||
      (agency.lastResultMemoryId !== undefined && !isSafeRecordId(agency.lastResultMemoryId)) ||
      !Array.isArray(agency.attempts) ||
      agency.attempts.length > 4 ||
      !Number.isSafeInteger(agency.revision) ||
      agency.revision < 0 ||
      !Array.isArray(agency.goals) ||
      agency.goals.length > 24 ||
      !Array.isArray(agency.history) ||
      agency.history.length > 32 ||
      'goal' in entity.actor ||
      'goals' in entity.actor
    )
      throw new Error('Incompatible or invalid development agency state.');
    if (new Set(agency.attempts.map((attempt) => attempt.id)).size !== agency.attempts.length)
      throw new Error('Duplicate saved unlisted intent identities.');
    for (const attempt of agency.attempts) {
      if (
        !isSafeRecordId(attempt.id) ||
        typeof attempt.description !== 'string' ||
        !attempt.description.trim() ||
        attempt.description.length > 500 ||
        typeof attempt.normalized !== 'string' ||
        attempt.normalized !== normalizeAttempt(attempt.description) ||
        !(attempt.targetEntityId === null || isSafeRecordId(attempt.targetEntityId)) ||
        (attempt.slots !== undefined &&
          // Shape only at load: a later clock-policy edit must not make a save unloadable;
          // a stopping time the world no longer names is refused when the request is used.
          (!validIntentSlotShape(attempt.slots) || !slotsKey(attempt.slots))) ||
        !['enqueue', 'replace', 'interrupt'].includes(attempt.mode) ||
        !Number.isSafeInteger(attempt.manifestRevision) ||
        attempt.manifestRevision < 1 ||
        !['needs-interpretation', 'awaiting-confirmation'].includes(attempt.status) ||
        (attempt.resolution !== undefined &&
          (attempt.status !== 'needs-interpretation' || !validActionResolution(attempt.resolution)))
      )
        throw new Error('Invalid saved unlisted attempt.');
      if (attempt.status === 'awaiting-confirmation') {
        const a = attempt.alternative;
        if (
          !a ||
          (a.targetEpisodes !== undefined && !validActionTargets(a.targetEpisodes)) ||
          !validActionFulfillment(a.fulfillment) ||
          a.fulfillment.verdict !== 'confirm' ||
          a.fulfillment.requested !== attempt.description ||
          a.mode !== attempt.mode ||
          !['enqueue', 'replace', 'interrupt'].includes(a.mode) ||
          !Number.isSafeInteger(a.expectedPlan) ||
          a.expectedPlan < 0 ||
          !validAlternativeCommands(a.commands, entity.id)
        )
          throw new Error('Invalid saved action alternative.');
      }
    }
    const ids = new Set<string>();
    for (const goal of agency.goals) {
      if (
        !isSafeRecordId(goal.id) ||
        ids.has(goal.id) ||
        !Number.isSafeInteger(goal.revision) ||
        goal.revision < 0 ||
        typeof goal.objective !== 'string' ||
        !goal.objective.trim() ||
        goal.objective.length > 500 ||
        !['active', 'paused', 'completed', 'abandoned'].includes(goal.status) ||
        !['creator', 'actor', 'player', 'god'].includes(goal.author) ||
        !isSafeRecordId(goal.sourceId) ||
        !(goal.parentId === null || isSafeRecordId(goal.parentId)) ||
        !(goal.completion === null || goal.completion === 'actor-declared')
      )
        throw new Error('Invalid saved goal.');
      ids.add(goal.id);
    }
    if (agency.goals.filter((goal) => !terminal(goal)).length > AGENCY_LIMITS.goals)
      throw new Error('Too many saved active goals.');
    for (const goal of agency.goals) {
      const parents = new Set([goal.id]);
      let parentId = goal.parentId;
      while (parentId) {
        if (parents.has(parentId)) throw new Error('Cyclic saved goal.');
        parents.add(parentId);
        const parent = agency.goals.find((entry) => entry.id === parentId);
        if (!parent) throw new Error('Missing saved goal parent.');
        parentId = parent.parentId;
      }
    }
    if (
      agency.suspended &&
      (agency.suspended.status !== 'active' ||
        agency.suspended.steps.some((step) => step.status === 'running'))
    )
      throw new Error('Invalid saved paused work.');
    for (const plan of [agency.plan, agency.suspended ?? null]) {
      if (
        plan &&
        (!isSafeRecordId(plan.id) ||
          (plan.resultMemoryId !== undefined && !isSafeRecordId(plan.resultMemoryId)) ||
          !Number.isSafeInteger(plan.revision) ||
          plan.revision < 1 ||
          !['active', 'blocked', 'completed', 'cancelled'].includes(plan.status) ||
          !Array.isArray(plan.steps) ||
          (!plan.activity && plan.steps.length < 1) ||
          plan.steps.length > AGENCY_LIMITS.steps ||
          (plan.goalId && !ids.has(plan.goalId)))
      )
        throw new Error('Invalid saved plan.');
      if (
        plan &&
        (new Set(plan.steps.map((step) => step.id)).size !== plan.steps.length ||
          plan.steps.filter((step) => step.status === 'running').length > 1)
      )
        throw new Error('Invalid saved step identities or concurrent work.');
      if (plan && !validOutputReferences(plan.steps.map((step) => step.command)))
        throw new Error('Invalid saved plan output references.');
    }
    for (const step of [
      ...(agency.plan?.steps ?? []),
      ...(agency.suspended?.steps ?? []),
      ...agency.history,
    ]) {
      if (
        (step.resultMemoryId !== undefined && !isSafeRecordId(step.resultMemoryId)) ||
        (step.targetEpisodes !== undefined && !validActionTargets(step.targetEpisodes)) ||
        !isSafeRecordId(step.id) ||
        !isPlannedCommand(step.command) ||
        step.command.id !== step.id ||
        step.command.actorId !== entity.id ||
        !['queued', 'running', 'completed', 'blocked', 'cancelled'].includes(step.status) ||
        (step.activityKey !== undefined && !isSafeRecordId(step.activityKey)) ||
        (step.status === 'running' && !isSafeRecordId(step.actionId)) ||
        (['completed', 'blocked', 'cancelled'].includes(step.status) &&
          (!step.outcome ||
            typeof step.outcome.ok !== 'boolean' ||
            typeof step.outcome.code !== 'string' ||
            typeof step.outcome.message !== 'string'))
      )
        throw new Error('Invalid saved plan step.');
    }
  }
}

function validPlacePoint(point: unknown): point is SurfacePoint {
  return finitePoint(point) && isSafeRecordId((point as SurfacePoint).surfaceId);
}

export function normalizeAttempt(description: string): string {
  return description.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

/** Explicit withdrawal/resolution releases a private intent slot, never a physical action.
 * docs/architecture.md#actor-agency-foundation
 */
export function withdrawAttempt(actor: ActorComponent, id: string): Outcome {
  const index = actor.agency.attempts.findIndex((attempt) => attempt.id === id);
  if (index < 0)
    return outcome(false, 'attempt-unavailable', 'That private intent is no longer pending.');
  actor.agency.attempts.splice(index, 1);
  actor.agency.revision++;
  return outcome(true, 'attempt-withdrawn', 'Private intent withdrawn; ongoing work is unchanged.');
}

/** A different amount, tool or recipient is a different request, never a repeat. */
export function sameAttempt(
  attempt: ActorAgency['attempts'][number],
  description: string,
  targetEntityId: string | null = null,
  mode: 'enqueue' | 'replace' | 'interrupt' = 'enqueue',
  slots: IntentSlots | null = null,
): boolean {
  return (
    attempt.normalized === normalizeAttempt(description) &&
    attempt.targetEntityId === targetEntityId &&
    attempt.mode === mode &&
    slotsKey(attempt.slots) === slotsKey(slots)
  );
}

export function resolveAttempt(
  actor: ActorComponent,
  description: string,
  targetEntityId: string | null = null,
  mode: 'enqueue' | 'replace' | 'interrupt' = 'enqueue',
  slots: IntentSlots | null = null,
): void {
  const matching = actor.agency.attempts.filter((attempt) =>
    sameAttempt(attempt, description, targetEntityId, mode, slots),
  );
  for (const pending of matching) withdrawAttempt(actor, pending.id);
}

/** Freeform intent is retained honestly; a missing interpreter is not physical impossibility. */
export function deferAttempt(
  world: WorldState,
  actorId: string,
  id: string,
  description: string,
  targetEntityId: string | null = null,
  mode: 'enqueue' | 'replace' | 'interrupt' = 'enqueue',
  slots: IntentSlots | null = null,
  resolution?: ActionResolution,
): Outcome {
  if (
    !isSafeRecordId(id) ||
    typeof description !== 'string' ||
    !description.trim() ||
    description.length > 500 ||
    !(targetEntityId === null || isSafeRecordId(targetEntityId)) ||
    !['enqueue', 'replace', 'interrupt'].includes(mode) ||
    (slots !== null && !validIntentSlots(world, slots)) ||
    (resolution !== undefined && !validActionResolution(resolution))
  )
    return outcome(false, 'invalid-attempt', 'An attempt needs 1–500 characters.');
  const actor = world.entities[actorId]!.actor!;
  const normalized = normalizeAttempt(description);
  const prior = actor.agency.attempts.find(
    (attempt) =>
      sameAttempt(attempt, description, targetEntityId, mode, slots) &&
      attempt.manifestRevision === world.moduleManifest.revision,
  );
  if (prior) {
    // A fresh plain reason replaces a stale one; a held revision is never downgraded.
    if (
      resolution &&
      prior.status === 'needs-interpretation' &&
      JSON.stringify(prior.resolution) !== JSON.stringify(resolution)
    ) {
      prior.resolution = cloneValue(resolution);
      actor.agency.revision++;
    }
    return outcome(
      true,
      'attempt-pending',
      'This intent already awaits interpretation; no action or paid work was repeated.',
    );
  }
  if (actor.agency.attempts.length >= 4)
    return outcome(false, 'attempt-limit', 'Four unlisted intents already await interpretation.');
  if (actor.agency.attempts.some((attempt) => attempt.id === id))
    return outcome(false, 'attempt-conflict', 'This attempt identity belongs to different intent.');
  actor.agency.attempts.push({
    id,
    description: description.trim(),
    normalized,
    targetEntityId,
    ...(slotsKey(slots) ? { slots: cloneValue(slots!) } : {}),
    mode,
    manifestRevision: world.moduleManifest.revision,
    status: 'needs-interpretation',
    ...(resolution ? { resolution: cloneValue(resolution) } : {}),
  });
  actor.agency.revision++;
  return outcome(
    true,
    'attempt-deferred',
    'Intent retained privately without an executable binding; no action was performed or invention admitted.',
  );
}

/** Finite native command families only; saved JSON never installs an executor. */
export function isPhysicalCommand(command: Command): boolean {
  if (!command || !isSafeRecordId(command.id) || !isSafeRecordId(command.actorId)) return false;
  if (
    'autoEquip' in command &&
    command.autoEquip !== undefined &&
    typeof command.autoEquip !== 'boolean'
  )
    return false;
  switch (command.type) {
    case 'assemble':
      return validAssemblyPhase(command);
    case 'pickup':
      return (
        isSafeRecordId(command.targetId) &&
        (command.itemId === undefined || isSafeRecordId(command.itemId)) &&
        (command.quantity === undefined ||
          (command.itemId !== undefined &&
            Number.isSafeInteger(command.quantity) &&
            command.quantity > 0))
      );
    case 'drop':
      return (
        isSafeRecordId(command.itemId) &&
        Number.isSafeInteger(command.quantity) &&
        command.quantity > 0
      );
    case 'transfer-stock':
      return (
        isSafeRecordId(command.sourceId) &&
        isSafeRecordId(command.destinationId) &&
        isSafeRecordId(command.definitionId) &&
        Number.isSafeInteger(command.definitionVersion) &&
        command.definitionVersion > 0 &&
        typeof command.definitionDigest === 'string' &&
        command.definitionDigest.length > 0 &&
        command.definitionDigest.length <= 120 &&
        Number.isSafeInteger(command.quantity) &&
        command.quantity > 0 &&
        Number.isSafeInteger(command.minimumHeld) &&
        command.minimumHeld >= 0
      );
    case 'move':
      return finitePoint(command.destination) && isSafeRecordId(command.destination.surfaceId);
    case 'follow':
      return (
        isSafeRecordId(command.targetId) &&
        (command.distance === undefined ||
          (Number.isFinite(command.distance) &&
            command.distance >= FOLLOW_RULES.minimumDistance &&
            command.distance <= FOLLOW_RULES.maximumDistance)) &&
        (command.relation === undefined ||
          ['behind', 'beside', 'left', 'right'].includes(command.relation)) &&
        (command.onLost === undefined || command.onLost === 'last-seen') &&
        (command.until === undefined || (Number.isFinite(command.until) && command.until >= 0))
      );
    case 'gather':
    case 'harvest':
      return isSafeRecordId(command.targetId);
    case 'prepare':
      return command.preparation === 'fiber' || command.preparation === 'cord';
    case 'craft':
      return isSafeRecordId(command.recipeId);
    case 'treat-scar':
      return isSafeRecordId(command.targetId) && isSafeRecordId(command.scarId);
    case 'replenish':
      return isSafeRecordId(command.targetId) && isSafeRecordId(command.attributeId);
    case 'equip':
    case 'eat':
      return isSafeRecordId(command.itemId);
    case 'guard':
      return (
        isSafeRecordId(command.itemId) &&
        (command.targetId !== undefined
          ? isSafeRecordId(command.targetId) && command.facing === undefined
          : typeof command.facing === 'number' && Number.isFinite(command.facing))
      );
    case 'inspect-inventory':
      return (
        (command.containerId === undefined || isSafeRecordId(command.containerId)) &&
        (command.after === undefined || isSafeRecordId(command.after)) &&
        (command.expectedScope === undefined ||
          (typeof command.expectedScope === 'string' && command.expectedScope.length <= 16000)) &&
        (command.expectedRevision === undefined ||
          (Number.isSafeInteger(command.expectedRevision) && command.expectedRevision >= 0))
      );
    case 'strike':
      return (
        isSafeRecordId(command.targetId) &&
        isSafeRecordId(command.definitionId) &&
        (command.weaponItemId === undefined || isSafeRecordId(command.weaponItemId))
      );
    case 'practice-shot':
    case 'hunt':
      return (
        isSafeRecordId(command.targetId) &&
        (command.weaponItemId === undefined || isSafeRecordId(command.weaponItemId)) &&
        (command.ammoItemId === undefined || isSafeRecordId(command.ammoItemId))
      );
    case 'coaching':
      return (
        isSafeRecordId(command.targetId) &&
        isSafeRecordId(command.attributeId) &&
        ['request', 'accept', 'decline', 'withdraw', 'feedback'].includes(command.operation) &&
        (command.operation === 'request' || isSafeRecordId(command.episodeId))
      );
    case 'cook':
      return isSafeRecordId(command.itemId) && isSafeRecordId(command.heatId);
    case 'tend-fire':
      return isFireCareCommand(command);
    case 'status-effect':
      return (
        isSafeRecordId(command.targetId) &&
        isSafeRecordId(command.definitionId) &&
        ['activate', 'deactivate'].includes(command.operation)
      );
    default:
      return false;
  }
}

/** Speech can be a chosen step without giving the speaker control of a reply. */
export function isActivityCommand(command: Command): boolean {
  return (
    isPhysicalCommand(command) ||
    (!!command &&
      command.type === 'say' &&
      isSafeRecordId(command.id) &&
      isSafeRecordId(command.actorId) &&
      typeof command.text === 'string' &&
      command.text.trim().length > 0 &&
      command.text.length <= 1500 &&
      (command.targetId === undefined || isSafeRecordId(command.targetId)) &&
      (command.intendedRecipientId === undefined || isSafeRecordId(command.intendedRecipientId)) &&
      (command.volume === undefined || ['whisper', 'normal', 'shout'].includes(command.volume)))
  );
}
function isPlannedCommand(command: PlannedCommand): boolean {
  if (!command || !('itemFromStep' in command)) return isActivityCommand(command);
  return (
    isSafeRecordId(command.id) &&
    isSafeRecordId(command.actorId) &&
    isSafeRecordId(command.itemFromStep) &&
    (command.outputPort === undefined || isSafeRecordId(command.outputPort)) &&
    (command.quantity === undefined ||
      (Number.isSafeInteger(command.quantity) && command.quantity > 0)) &&
    ['equip', 'eat', 'cook'].includes(command.type) &&
    (command.type === 'cook' ? isSafeRecordId(command.heatId) : command.heatId === undefined)
  );
}
function validOutputReferences(commands: PlannedCommand[]): boolean {
  const prior = new Map<string, PlannedCommand>();
  for (const command of commands) {
    if (prior.has(command.id)) return false;
    if ('itemFromStep' in command) {
      const producer = prior.get(command.itemFromStep);
      if (
        !producer ||
        producer.actorId !== command.actorId ||
        // A plain reference needs a single receipt; a named port may read any output.
        !(command.outputPort ? PORT_OUTPUT_FAMILIES : ITEM_OUTPUT_FAMILIES).includes(producer.type)
      )
        return false;
    }
    prior.set(command.id, command);
  }
  return true;
}
/** Resolve the receipt, never guess a matching item. Native dispatch rechecks possession and state.
 * docs/architecture.md#actor-agency-foundation
 */
export function resolvePlanCommand(plan: ActorPlan, step: PlanStep): Command | undefined {
  const command = step.command;
  if (!('itemFromStep' in command)) return command;
  const producer = plan.steps.find((entry) => entry.id === command.itemFromStep);
  const output = producer?.outcome?.outputs?.find(
    (entry) => entry.port === command.outputPort && entry.quantity >= (command.quantity ?? 1),
  );
  const itemId =
    producer?.status === 'completed' && producer.outcome?.ok
      ? command.outputPort
        ? output?.itemId
        : producer.outcome.itemId
      : undefined;
  if (!itemId) return;
  const { itemFromStep: _, outputPort: _port, quantity: _quantity, heatId, ...base } = command;
  return base.type === 'cook'
    ? { ...base, type: 'cook', itemId, heatId: heatId! }
    : { ...base, type: base.type, itemId };
}

/** A held revision is either a plan-eligible native sequence or one bounded composition. */
function validAlternativeCommands(commands: Command[], actorId: string): boolean {
  if (!Array.isArray(commands) || !commands.length || commands.length > AGENCY_LIMITS.steps)
    return false;
  const [first] = commands;
  if (first?.type === 'compose') {
    if (commands.length !== 1 || first.actorId !== actorId || !isSafeRecordId(first.id))
      return false;
    try {
      validateActivityNode(first.root);
      return (
        typeof first.name === 'string' &&
        first.name.length <= 500 &&
        (first.subjects === undefined ||
          (Array.isArray(first.subjects) &&
            first.subjects.length <= 8 &&
            first.subjects.every((id) => isSafeRecordId(id))))
      );
    } catch {
      return false;
    }
  }
  return (
    validOutputReferences(commands) &&
    commands.every((c) => isPlannedCommand(c) && c.actorId === actorId)
  );
}

/** An uncertain relaxation has no execution authority until the owner chooses it.
 * docs/architecture.md#action-fulfillment-and-revision-approval
 */
export function proposeActionRevision(
  world: WorldState,
  actorId: string,
  id: string,
  commands: Command[],
  fulfillment: ActionFulfillment,
  mode: 'enqueue' | 'replace' | 'interrupt',
  expectedPlan: number,
  targetEntityId: string | null = null,
  slots: IntentSlots | null = null,
): Outcome {
  if (
    !validActionFulfillment(fulfillment) ||
    fulfillment.verdict !== 'confirm' ||
    !['enqueue', 'replace', 'interrupt'].includes(mode) ||
    !Number.isSafeInteger(expectedPlan) ||
    expectedPlan < 0 ||
    !validAlternativeCommands(commands, actorId)
  )
    return outcome(
      false,
      'invalid-alternative',
      'The revised action is not a supported native plan.',
    );
  const held = deferAttempt(world, actorId, id, fulfillment.requested, targetEntityId, mode, slots);
  if (!held.ok) return held;
  const actor = world.entities[actorId]!.actor!;
  const pending = actor.agency.attempts.find(
    (a) =>
      sameAttempt(a, fulfillment.requested, targetEntityId, mode, slots) &&
      a.manifestRevision === world.moduleManifest.revision,
  )!;
  if (pending.status !== 'awaiting-confirmation') {
    pending.status = 'awaiting-confirmation';
    // An understood revision supersedes the earlier plain refusal reason.
    delete pending.resolution;
    pending.alternative = {
      commands: cloneValue(commands),
      targetEpisodes: captureActionTargets(world, actorId, commands),
      fulfillment: cloneValue(fulfillment),
      mode,
      expectedPlan,
    };
    actor.agency.revision++;
    appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      summary: {
        parts: [
          'A revised action needs ',
          person(actorId, 'possessive'),
          ` decision: ${fulfillment.executableDescription}. Not fulfilled: ${fulfillment.omitted.map((o) => o.requirement).join('; ')}.`,
        ],
      },
      entityIds: [actorId],
      importance: 6,
    });
  }
  return outcome(
    false,
    'needs-confirmation',
    `Accept revised action? ${fulfillment.executableDescription} Not fulfilled: ${fulfillment.omitted.map((o) => o.requirement).join('; ')}`,
  );
}

export function confirmActionRevision(
  world: WorldState,
  actorId: string,
  attemptId: string,
  id: string,
): Outcome {
  const actor = Object.hasOwn(world.entities, actorId) ? world.entities[actorId]?.actor : undefined;
  if (
    !actor?.alive ||
    actor.incapacitated ||
    capabilityBlocked(world, world.entities[actorId], 'actions')
  )
    return outcome(
      false,
      'actor-unavailable',
      'The actor must be awake and able to approve new work.',
    );
  const pending = actor.agency.attempts.find(
    (a) => a.id === attemptId && a.status === 'awaiting-confirmation',
  );
  const alternative = pending?.alternative;
  if (!pending || !alternative)
    return outcome(
      false,
      'attempt-unavailable',
      'That revised action is no longer awaiting your decision.',
    );
  if (
    !actionTargetsCurrent(world, actorId, alternative.commands, alternative.targetEpisodes) ||
    pending.manifestRevision !== world.moduleManifest.revision ||
    (alternative.mode !== 'enqueue' && actor.planGeneration !== alternative.expectedPlan)
  )
    return outcome(
      false,
      'stale-alternative',
      'The target encounter, mechanics or current work changed. Submit a fresh action instead of accepting this old revision.',
    );
  const composed = alternative.commands[0]!;
  const result =
    composed.type === 'compose'
      ? startRequestedActivity(world, actorId, id, {
          ...composed,
          actorId,
          id: `${id}:0`,
          mode: alternative.mode,
        })
      : arrangePlan(
          world,
          actor,
          id,
          alternative.commands.map((c, index) => ({ ...c, actorId, id: `${id}:${index}` })),
          alternative.mode,
          actor.agency.plan?.revision ?? 0,
          null,
        );
  if (result.ok) withdrawAttempt(actor, attemptId);
  return result;
}
