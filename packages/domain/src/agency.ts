import { finitePoint } from '@open-legend/spatial';
import { cloneValue } from './draft.js';
import { appendMemory, outcome } from './events.js';
import { isSafeRecordId } from './records.js';
import type { ActorComponent, Command, Outcome, WorldState } from './types.js';

export const AGENCY_LIMITS = { goals: 8, goalHistory: 16, steps: 8, history: 32 } as const;
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
  id: string;
  actorId: string;
  type: 'equip' | 'eat' | 'cook';
  itemFromStep: string;
  heatId?: string;
};
export type PlannedCommand = Command | ItemOutputCommand;
export interface PlanStep {
  id: string;
  command: PlannedCommand;
  status: 'queued' | 'running' | 'completed' | 'blocked' | 'cancelled';
  actionId?: string;
  outcome?: Outcome;
}
export interface ActorPlan {
  id: string;
  revision: number;
  goalId: string | null;
  status: 'active' | 'blocked' | 'completed' | 'cancelled';
  steps: PlanStep[];
}
export interface ActorAgency {
  attempts: {
    id: string;
    description: string;
    normalized: string;
    manifestRevision: number;
    status: 'needs-interpretation';
  }[];
  revision: number;
  goals: ActorGoal[];
  plan: ActorPlan | null;
  history: PlanStep[];
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
  actor: ActorComponent,
  id: string,
  commands: PlannedCommand[],
  mode: 'enqueue' | 'replace',
  expectedRevision: number,
  goalId: string | null,
): Outcome {
  const agency = actor.agency;
  const current = agency.plan;
  if (
    !isSafeRecordId(id) ||
    !['enqueue', 'replace'].includes(mode) ||
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
        status: 'queued' as const,
      })),
    );
    current.revision++;
  } else {
    if (current) {
      cancelPlan(actor);
      agency.history.push(...current.steps.map(cloneValue));
      agency.history = agency.history.slice(-AGENCY_LIMITS.history);
    }
    // Explicit replacement follows native cancellation: spent inputs are never refunded.
    if (mode === 'replace' && actor.action) {
      actor.action = null;
      actor.planGeneration++;
    }
    agency.plan = {
      id,
      revision: (current?.revision ?? 0) + 1,
      goalId,
      status: 'active',
      steps: commands.map((command) => ({
        id: command.id,
        command: cloneValue(command),
        status: 'queued',
      })),
    };
  }
  agency.revision++;
  return {
    ...outcome(true, 'queued', 'Native work queued; it has not completed.'),
    planId: agency.plan!.id,
  };
}
export function cancelPlan(actor: ActorComponent): void {
  const plan = actor.agency.plan;
  if (!plan || plan.status === 'completed' || plan.status === 'cancelled') return;
  for (const step of plan.steps)
    if (step.status === 'queued' || step.status === 'running') {
      if (step.actionId === actor.action?.id) {
        actor.action = null;
        actor.planGeneration++;
      }
      step.status = 'cancelled';
      step.outcome = outcome(false, 'cancelled', 'Cancelled; committed costs remain spent.');
    }
  plan.status = 'cancelled';
  plan.revision++;
  actor.agency.revision++;
}
export function finishPlanAction(
  world: WorldState,
  actorId: string,
  actionId: string,
  result: Outcome,
): void {
  const actor = world.entities[actorId]!.actor!;
  const plan = actor.agency.plan;
  const step = plan?.steps.find(
    (entry) => entry.status === 'running' && entry.actionId === actionId,
  );
  if (!step) return;
  step.outcome = result;
  step.status = result.ok ? 'completed' : 'blocked';
  plan!.status = !result.ok
    ? 'blocked'
    : plan!.steps.every((entry) => entry.status === 'completed')
      ? 'completed'
      : 'active';
  plan!.revision++;
  actor.agency.revision++;
  if (!result.ok)
    appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      summary: `My planned work stopped: ${result.message}`,
      entityIds: [actorId],
      importance: 6,
    });
}
export function readyPlanStep(world: WorldState, actorId: string): PlanStep | undefined {
  const actor = world.entities[actorId]!.actor!;
  const plan = actor.agency.plan;
  if (!plan || plan.status !== 'active') return;
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
    actor.rest?.asleep
  )
    return;
  if (
    plan.goalId &&
    !actor.agency.goals.some((goal) => goal.id === plan.goalId && goal.status === 'active')
  )
    return;
  return plan.steps.find((step) => step.status === 'queued');
}
export function validateAgency(world: WorldState): void {
  for (const entity of Object.values(world.entities)) {
    if (!entity.actor) continue;
    const agency = entity.actor.agency;
    if (
      !agency ||
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
        attempt.normalized.length > 1000 ||
        !Number.isSafeInteger(attempt.manifestRevision) ||
        attempt.manifestRevision < 1 ||
        attempt.status !== 'needs-interpretation'
      )
        throw new Error('Invalid saved unlisted attempt.');
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
    const plan = agency.plan;
    if (
      plan &&
      (!isSafeRecordId(plan.id) ||
        !Number.isSafeInteger(plan.revision) ||
        plan.revision < 1 ||
        !['active', 'blocked', 'completed', 'cancelled'].includes(plan.status) ||
        !Array.isArray(plan.steps) ||
        plan.steps.length < 1 ||
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
    for (const step of [...(plan?.steps ?? []), ...agency.history]) {
      if (
        !isSafeRecordId(step.id) ||
        !isPlannedCommand(step.command) ||
        step.command.id !== step.id ||
        step.command.actorId !== entity.id ||
        !['queued', 'running', 'completed', 'blocked', 'cancelled'].includes(step.status) ||
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

export function resolveAttempt(actor: ActorComponent, description: string): void {
  const matching = actor.agency.attempts.filter(
    (attempt) => attempt.normalized === normalizeAttempt(description),
  );
  for (const pending of matching) withdrawAttempt(actor, pending.id);
}

/** Freeform intent is retained honestly; a missing interpreter is not physical impossibility. */
export function deferAttempt(
  world: WorldState,
  actorId: string,
  id: string,
  description: string,
): Outcome {
  if (!isSafeRecordId(id) || !description.trim() || description.length > 500)
    return outcome(false, 'invalid-attempt', 'An attempt needs 1–500 characters.');
  const actor = world.entities[actorId]!.actor!;
  const normalized = normalizeAttempt(description);
  const prior = actor.agency.attempts.find(
    (attempt) =>
      attempt.normalized === normalized &&
      attempt.manifestRevision === world.moduleManifest.revision,
  );
  if (prior)
    return outcome(
      true,
      'attempt-pending',
      'This intent already awaits interpretation; no action or paid work was repeated.',
    );
  if (actor.agency.attempts.length >= 4)
    return outcome(false, 'attempt-limit', 'Four unlisted intents already await interpretation.');
  actor.agency.attempts.push({
    id,
    description: description.trim(),
    normalized,
    manifestRevision: world.moduleManifest.revision,
    status: 'needs-interpretation',
  });
  actor.agency.revision++;
  return outcome(
    true,
    'attempt-deferred',
    'Intent retained privately without an executable binding; no action was performed or invention admitted.',
  );
}

/** Finite native command families only; saved JSON never installs an executor. */
function isPhysicalCommand(command: Command): boolean {
  if (!command || !isSafeRecordId(command.id) || !isSafeRecordId(command.actorId)) return false;
  switch (command.type) {
    case 'move':
      return finitePoint(command.destination) && isSafeRecordId(command.destination.surfaceId);
    case 'follow':
      return (
        isSafeRecordId(command.targetId) &&
        (command.distance === undefined ||
          (Number.isFinite(command.distance) && command.distance >= 1.5 && command.distance <= 12))
      );
    case 'gather':
    case 'harvest':
      return isSafeRecordId(command.targetId);
    case 'prepare':
      return command.preparation === 'fiber' || command.preparation === 'cord';
    case 'craft':
      return isSafeRecordId(command.recipeId);
    case 'replenish':
      return isSafeRecordId(command.targetId) && isSafeRecordId(command.attributeId);
    case 'equip':
    case 'eat':
      return isSafeRecordId(command.itemId);
    case 'hunt':
      return (
        isSafeRecordId(command.targetId) &&
        (command.weaponItemId === undefined || isSafeRecordId(command.weaponItemId)) &&
        (command.ammoItemId === undefined || isSafeRecordId(command.ammoItemId))
      );
    case 'cook':
      return isSafeRecordId(command.itemId) && isSafeRecordId(command.heatId);
    case 'rest':
      return true;
    default:
      return false;
  }
}

function isPlannedCommand(command: PlannedCommand): boolean {
  if (!command || !('itemFromStep' in command)) return isPhysicalCommand(command);
  return (
    isSafeRecordId(command.id) &&
    isSafeRecordId(command.actorId) &&
    isSafeRecordId(command.itemFromStep) &&
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
        !['gather', 'prepare', 'craft', 'cook'].includes(producer.type)
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
  const itemId =
    producer?.status === 'completed' && producer.outcome?.ok ? producer.outcome.itemId : undefined;
  if (!itemId) return;
  const { itemFromStep: _, heatId, ...base } = command;
  return base.type === 'cook'
    ? { ...base, type: 'cook', itemId, heatId: heatId! }
    : { ...base, type: base.type, itemId };
}
