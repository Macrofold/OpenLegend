import { entityGet } from './entity-collection.js';
import {
  activityRoleKinds,
  activityEntityReferences,
  commandEntityFields,
} from './native-command-contracts.js';
import { validateInstalledActivityConditions } from './action-experience.js';
import type { ConstructionPermission } from './assembly-types.js';
import { isEquipped } from './equipment.js';
import { activityCommandFields, isCookingInputField } from './food-preparation.js';
import { executeCommand, nativeOperationAvailable, prepareNativeChoice } from './kernel.js';
import type { Command, Position, WorldState } from './types.js';
import { worldPosition } from './spatial-state.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { distance3D } from '@open-legend/spatial';
import type { ActorPlan, PlanStep } from './agency.js';
import {
  isActivityCommand,
  stopCurrentWork,
  suspendCurrentWork,
  cancelPlan,
  recordPlanResult,
  resolvePlanCommand,
} from './agency.js';
import {
  captureActionTargets,
  actionTargetsCurrent,
  type ActionTargetEpisodes,
} from './action-targets.js';
import { subjectReferenceCurrent } from './worlds/base/knowledge.js';
import { acquiredActivities, activityRoleCompatible } from './activity-learning.js';
import {
  validateActivityNode,
  ACTIVITY_LIMITS,
  type ActivityNode,
  type ActivityOutput,
  type ActivityPredicate,
  type ActivityBinding,
} from './action-experience.js';
import { cloneValue } from './draft.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { validResponsePurpose } from './action-capabilities.js';
import { accessiblePossession, possessionItems } from './object-access.js';
import { seesEntity } from './perception.js';
import { outcome } from './events.js';
import {
  installedActivityHost,
  activityHostForCommand,
  activitySpendCeiling,
  deadlineSafeActivityCommand,
  trustedActivityHost,
  trustedActivityHostForCommand,
} from './activity-hosts.js';
import { canAccessContainer } from './object-access.js';
import { canReachEntity } from './spatial.js';
import { capabilityBlocked } from './status-capabilities.js';
import type { DefinitionPin } from './world-modules.js';
import { isDefinitionPin } from './state-owners.js';
import { currentInventoryInspection } from './inventory-inspection.js';

export interface CountedActivityControl {
  kind: 'counted';
  deadline: number;
  observation: { definition: DefinitionPin; role: string };
  accessRoles: string[];
  reachRoles: string[];
  budget: { command: Command['type']; maximumAttempts: number; maximumSpent: number };
}
export interface FiniteActivityControl {
  kind: 'finite';
  deadline: number;
  /** Historical world position, not a live support reference or navigation grant. */
  boundary: { origin: Position; radius: number } | null;
  /** Only currently perceived bodies may be bound here; remembered points need no live subject. */
  subjects: Record<string, { physicalLife: number; episode: string | null }>;
  /** Positive arrival condition on one exact visible participant, never an attack. */
  stopWithin?: { subjectId: string; distance: number };
}
export type ChosenActivityControl = CountedActivityControl | FiniteActivityControl;

export interface ActivityExecution {
  combatHelpId?: string;
  /** Origin belongs to this invocation, never to the learned method. */
  humanInitiated?: true;
  /** A personally learned method, or absent for a requested composition. */
  methodId?: string;
  /** A requested composition carries its own validated root and chosen name. */
  request?: { name: string; root: ActivityNode; chosenPurpose?: Command['chosenPurpose'] };
  bindings: Record<string, ActivityBinding>;
  targetEpisodes: ActionTargetEpisodes;
  pending: { node: ActivityNode; iteration: number; startedAt?: number }[];
  outputs: Record<string, ActivityOutput[]>;
  serial: number;
  processed: number;
  archivedSteps?: number;
  activeKey?: string;
  reason?: string;
  control?: ChosenActivityControl;
  attempts?: number;
  lastAttemptId?: string;
  spent?: number;
  interrupted?: boolean;
  terminal?: boolean;
}
function finishControl(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
  reason: string,
  completed: boolean,
): void {
  const execution = plan.activity;
  if (!execution?.control || execution.terminal) return;
  cancelPlan(world, entityGet(world.entities, actorId)!.actor!, actorId, false);
  execution.pending = [];
  execution.terminal = true;
  execution.reason = reason;
  plan.status = completed ? 'completed' : 'blocked';
  plan.revision++;
  entityGet(world.entities, actorId)!.actor!.agency.revision++;
  recordPlanResult(
    world,
    actorId,
    plan,
    `${execution.request?.name ?? 'Chosen activity'}: ${reason}${execution.control.kind === 'counted' ? ` Used ${execution.spent ?? 0} selected units in ${execution.attempts ?? 0} attempts.` : ''} The chosen stopping time was simulation time ${execution.control.deadline}.${execution.interrupted ? ' This activity was interrupted; attendance was not continuous.' : ''} Completed transfers and other actions remain recorded; no remaining work was performed.`,
  );
}
/** Each fresh native admission counts once, including a restarted unfinished step. */
export function admitActivityAttempt(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
  step: PlanStep,
): boolean {
  const execution = plan.activity,
    control = execution?.control;
  if (
    !execution ||
    !control ||
    control.kind !== 'counted' ||
    !step.activityKey ||
    step.command.type !== control.budget.command ||
    execution.lastAttemptId === step.id
  )
    return true;
  if (activityAttemptExceedsLimit(world, execution, step.command, step.id)) {
    finishControl(
      world,
      actorId,
      plan,
      'Another needed attempt would exceed the chosen limit.',
      false,
    );
    return false;
  }
  execution.attempts = (execution.attempts ?? 0) + 1;
  execution.lastAttemptId = step.id;
  return true;
}
/** Read the same attempt/debit ceiling before either automatic admission or an
 * explicit return. An interrupted child is a fresh attempt, never a refunded one. */
function activityAttemptExceedsLimit(
  world: WorldState,
  execution: ActivityExecution,
  command: PlanStep['command'],
  id: string,
): boolean {
  const control = execution.control;
  if (
    control?.kind !== 'counted' ||
    command.type !== control.budget.command ||
    execution.lastAttemptId === id
  )
    return false;
  const maximumDebit = 'itemFromStep' in command ? undefined : activitySpendCeiling(world, command);
  return (
    maximumDebit === undefined ||
    (execution.attempts ?? 0) >= control.budget.maximumAttempts ||
    (execution.spent ?? 0) + maximumDebit > control.budget.maximumSpent
  );
}
/** Only chosen continuing control can end a running activity between its steps.
 * Ordinary plan membership alone does not make fixed-route movement a body-rule change. */
export function activeActivityControl(plan: ActorPlan | null | undefined) {
  const execution = plan?.activity;
  return plan?.status === 'active' && !execution?.terminal ? execution?.control : undefined;
}
/** Deadlines apply to an in-progress child too. Only a child already completing
 * at this boundary may commit; other work is cancelled by the ordinary owner. */
export function reconcileActivityControl(
  world: WorldState,
  actorId: string,
  plan: ActorPlan | null | undefined,
  completingSeconds = -1,
): void {
  const execution = plan?.activity,
    control = activeActivityControl(plan);
  if (!plan || !execution || !control) return;
  const entity = entityGet(world.entities, actorId),
    action = entity?.actor?.action;
  if (world.simTime >= control.deadline) {
    if (action?.stage === 'working' && action.remainingSeconds <= completingSeconds) return;
    finishControl(world, actorId, plan, 'The chosen stopping time was reached.', true);
    return;
  }
  const stop = continuingControlStop(world, actorId, execution!, control);
  if (stop) finishControl(world, actorId, plan, stop.reason, stop.completed);
}
function continuingControlStop(
  world: WorldState,
  actorId: string,
  execution: ActivityExecution,
  control: ChosenActivityControl,
): { reason: string; completed: boolean } | null {
  if (world.simTime >= control.deadline)
    return { reason: 'The chosen stopping time was reached.', completed: true };
  if (control.kind === 'finite') return finiteControlStop(world, actorId, control);
  const entity = entityGet(world.entities, actorId);
  const id = execution.bindings[control.observation.role];
  const observed =
    typeof id === 'string' &&
    installedActivityHost(world, control.observation.definition)?.evaluateCondition?.(
      world,
      actorId,
      id,
    );
  if (
    !entity?.actor?.alive ||
    entity.actor.incapacitated ||
    capabilityBlocked(world, entity, 'actions') ||
    !observed ||
    observed.value === undefined
  )
    return {
      reason: 'The chosen observation or ability to attend became unavailable.',
      completed: false,
    };
  for (const role of control.accessRoles) {
    const target = execution.bindings[role];
    if (typeof target !== 'string' || !canAccessContainer(world, actorId, target))
      return {
        reason: 'The chosen supply is no longer reachable and accessible.',
        completed: false,
      };
  }
  for (const role of control.reachRoles) {
    const target = execution.bindings[role];
    if (
      typeof target !== 'string' ||
      !entityGet(world.entities, target) ||
      !canReachEntity(world, entity, entityGet(world.entities, target)!, world.itemHandling.reach)
    )
      return { reason: 'The chosen target is no longer within reach.', completed: false };
  }
  return null;
}

function finiteControlStop(
  world: WorldState,
  actorId: string,
  control: FiniteActivityControl,
): { reason: string; completed: boolean } | null {
  const entity = entityGet(world.entities, actorId);
  if (
    !entity?.actor?.alive ||
    entity.actor.incapacitated ||
    capabilityBlocked(world, entity, 'actions')
  )
    return {
      reason: 'The ability to continue the chosen activity became unavailable.',
      completed: false,
    };
  for (const [id, expected] of Object.entries(control.subjects)) {
    const target = entityGet(world.entities, id);
    // Sight precedes private physical state: hidden death/body changes never give a different reason.
    if (
      !target ||
      !seesEntity(world, entity, target) ||
      !subjectReferenceCurrent(world, actorId, id, expected.episode) ||
      !target.actor?.alive ||
      (target.actor.physicalLife ?? 0) !== expected.physicalLife
    )
      return {
        reason: 'A chosen visible participant is no longer available to this activity.',
        completed: false,
      };
  }
  if (
    control.stopWithin &&
    canReachEntity(
      world,
      entity,
      entityGet(world.entities, control.stopWithin.subjectId)!,
      control.stopWithin.distance,
    )
  )
    return {
      reason: `The chosen participant is within the selected ${control.stopWithin.distance} m distance.`,
      completed: true,
    };
  return control.boundary &&
    distance3D(worldPosition(entity), control.boundary.origin) >= control.boundary.radius - 1e-8
    ? { reason: 'The chosen distance boundary was reached.', completed: true }
    : null;
}
/** The trusted condition owner predicts only its chosen target's next transition. */
export function nextActivityBoundary(
  world: WorldState,
  actorId: string,
  execution: ActivityExecution,
): number {
  let boundary = execution.control?.deadline ?? Infinity;
  if (execution.control?.kind === 'finite' && execution.control.boundary) {
    const entity = entityGet(world.entities, actorId);
    if (entity) {
      const length = remainingControlTravel(
        worldPosition(entity),
        capabilityBlocked(world, entity, 'locomotion') ? [] : (entity.actor?.action?.path ?? []),
        execution.control.boundary,
      );
      const speed = nativeMovementSpeed(world, entity);
      if (length === 0) boundary = Math.min(boundary, world.simTime);
      else if (Number.isFinite(length) && speed > 0)
        boundary = Math.min(boundary, world.simTime + length / speed);
    }
  }
  const frame = execution.pending.at(-1);
  if (frame?.node.kind === 'wait') {
    const condition = frame.node.until;
    if (condition.test === 'time') boundary = Math.min(boundary, condition.at);
    if (condition.test === 'registered') {
      const id = execution.bindings[condition.role];
      if (typeof id === 'string')
        boundary = Math.min(
          boundary,
          installedActivityHost(world, condition.definition)?.evaluateCondition?.(
            world,
            actorId,
            id,
          ).nextBoundary ?? Infinity,
        );
    }
  }
  return boundary;
}

/** Walk the actual remaining route, not its start/end chord: an intermediate turn
 * can leave the selected sphere even when the final point lies inside it. */
function remainingControlTravel(
  from: Position,
  path: readonly Position[],
  boundary: NonNullable<FiniteActivityControl['boundary']>,
): number {
  if (distance3D(from, boundary.origin) >= boundary.radius - 1e-8) return 0;
  let length = 0;
  for (const point of path) {
    const segment = distance3D(from, point);
    if (segment > 0 && distance3D(point, boundary.origin) >= boundary.radius) {
      const dx = point.x - from.x,
        dy = point.y - from.y,
        dz = point.z - from.z;
      const ox = from.x - boundary.origin.x,
        oy = from.y - boundary.origin.y,
        oz = from.z - boundary.origin.z;
      const dot = ox * dx + oy * dy + oz * dz;
      const square = segment * segment;
      const outside = ox * ox + oy * oy + oz * oz - boundary.radius * boundary.radius;
      return (
        length +
        segment *
          Math.max(
            0,
            Math.min(1, (-dot + Math.sqrt(Math.max(0, dot * dot - square * outside))) / square),
          )
      );
    }
    length += segment;
    from = point;
  }
  return Infinity;
}
export function validateChosenActivityControl(
  world: WorldState,
  root: ActivityNode,
  bindings: Record<string, ActivityBinding>,
  control: ChosenActivityControl,
  admission = false,
  requireInstalled = true,
): void {
  const exact = (value: object, fields: string[]) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== fields.sort().join(',')
    )
      throw new Error('Invalid chosen activity control.');
  };
  if (control.kind === 'finite') {
    if (!hasRecordFields(control, ['kind', 'deadline', 'boundary', 'subjects'], ['stopWithin']))
      throw new Error('Invalid chosen activity control.');
    if (
      !Number.isFinite(control.deadline) ||
      control.deadline < 0 ||
      (admission &&
        (control.deadline <= world.simTime ||
          control.deadline - world.simTime > ACTIVITY_LIMITS.waitSeconds))
    )
      throw new Error('Unsupported finite activity deadline.');
    if (control.boundary) {
      exact(control.boundary, ['origin', 'radius']);
      exact(control.boundary.origin, ['x', 'y', 'z']);
      if (
        ![
          control.boundary.origin.x,
          control.boundary.origin.y,
          control.boundary.origin.z,
          control.boundary.radius,
        ].every(Number.isFinite) ||
        control.boundary.radius <= 0
      )
        throw new Error('Invalid finite activity distance boundary.');
    } else if (control.boundary !== null)
      throw new Error('Invalid finite activity distance boundary.');
    if (
      !control.subjects ||
      typeof control.subjects !== 'object' ||
      Array.isArray(control.subjects) ||
      Object.keys(control.subjects).length > 8
    )
      throw new Error('Invalid finite activity subjects.');
    for (const [id, subject] of Object.entries(control.subjects)) {
      exact(subject, ['physicalLife', 'episode']);
      if (
        !isSafeRecordId(id) ||
        (subject.episode !== null && !isSafeRecordId(subject.episode)) ||
        !Number.isSafeInteger(subject.physicalLife) ||
        subject.physicalLife < 0
      )
        throw new Error('Invalid finite activity subject.');
    }
    if (control.stopWithin !== undefined) {
      exact(control.stopWithin, ['subjectId', 'distance']);
      if (
        !isSafeRecordId(control.stopWithin.subjectId) ||
        !Object.hasOwn(control.subjects, control.stopWithin.subjectId) ||
        !Number.isFinite(control.stopWithin.distance) ||
        control.stopWithin.distance <= 0
      )
        throw new Error('Invalid finite activity proximity condition.');
    }
    const visit = (node: ActivityNode): void => {
      if (node.kind === 'invoke') {
        if (!deadlineSafeActivityCommand(world, node.command, requireInstalled))
          throw new Error('This child cannot safely end at a whole-activity deadline.');
      } else if (node.kind === 'sequence') node.children.forEach(visit);
      else if (node.kind === 'branch') {
        visit(node.yes);
        if (node.no) visit(node.no);
      } else if (node.kind === 'repeat') visit(node.body);
    };
    visit(root);
    return;
  }
  exact(control, ['kind', 'deadline', 'observation', 'accessRoles', 'reachRoles', 'budget']);
  if (control.kind !== 'counted') throw new Error('Unsupported chosen activity control.');
  exact(control.observation, ['definition', 'role']);
  exact(control.budget, ['command', 'maximumAttempts', 'maximumSpent']);
  const host = requireInstalled
    ? installedActivityHost(world, control.observation.definition)
    : trustedActivityHost(control.observation.definition);
  if (
    !isDefinitionPin(control.observation.definition) ||
    !Number.isFinite(control.deadline) ||
    control.deadline < 0 ||
    (admission &&
      (control.deadline <= world.simTime ||
        control.deadline - world.simTime > ACTIVITY_LIMITS.waitSeconds)) ||
    !host?.evaluateCondition ||
    !isSafeRecordId(control.observation.role) ||
    typeof bindings[control.observation.role] !== 'string' ||
    !Number.isSafeInteger(control.budget.maximumAttempts) ||
    control.budget.maximumAttempts < 1 ||
    control.budget.maximumAttempts > ACTIVITY_LIMITS.iterations ||
    !Number.isSafeInteger(control.budget.maximumSpent) ||
    control.budget.maximumSpent < 1 ||
    control.budget.maximumSpent > ACTIVITY_LIMITS.iterations
  )
    throw new Error('Unsupported chosen activity bounds.');
  for (const roles of [control.accessRoles, control.reachRoles])
    if (
      !Array.isArray(roles) ||
      roles.length > 8 ||
      new Set(roles).size !== roles.length ||
      roles.some((role) => !isSafeRecordId(role) || typeof bindings[role] !== 'string')
    )
      throw new Error('Invalid chosen observation scope.');
  let counted = false,
    observed = false;
  const visit = (node: ActivityNode): void => {
    if (node.kind === 'invoke') {
      const support = requireInstalled
        ? activityHostForCommand(world, node.command)
        : trustedActivityHostForCommand(node.command);
      if (!support?.definition.deadlineSafeCommands.includes(node.command))
        throw new Error('This child cannot safely end at a whole-activity deadline.');
      if (node.command === control.budget.command) {
        const spending = support.definition.spending;
        if (
          !spending ||
          spending.command !== node.command ||
          !Number.isSafeInteger(spending.maximumPerAttempt) ||
          spending.maximumPerAttempt < 1 ||
          Object.entries(spending.requiredArguments).some(([key, expected]) => {
            const argument = node.args[key];
            return (
              !argument ||
              ('literal' in argument
                ? argument.literal
                : 'role' in argument
                  ? bindings[argument.role]
                  : undefined) !== expected
            );
          })
        )
          throw new Error('This counted action has no supported spending receipt contract.');
        counted = true;
      }
    } else if (node.kind === 'sequence') node.children.forEach(visit);
    else if (node.kind === 'branch') {
      visit(node.yes);
      if (node.no) visit(node.no);
    } else if (node.kind === 'repeat') visit(node.body);
    const condition =
      node.kind === 'wait' || node.kind === 'repeat'
        ? node.until
        : node.kind === 'branch'
          ? node.when
          : undefined;
    if (
      condition?.test === 'registered' &&
      condition.role === control.observation.role &&
      condition.definition.id === control.observation.definition.id &&
      condition.definition.version === control.observation.definition.version &&
      condition.definition.digest === control.observation.definition.digest
    )
      observed = true;
  };
  visit(root);
  if (
    !counted ||
    !observed ||
    !(requireInstalled
      ? activityHostForCommand(world, control.budget.command)
      : trustedActivityHostForCommand(control.budget.command))
  )
    throw new Error('Unsupported counted activity command or observation.');
}
function predicate(
  world: WorldState,
  actorId: string,
  execution: Pick<ActivityExecution, 'bindings' | 'outputs'>,
  condition: ActivityPredicate,
): boolean | undefined {
  if (condition.test === 'registered') {
    const id = execution.bindings[condition.role];
    return typeof id === 'string'
      ? installedActivityHost(world, condition.definition)?.evaluateCondition?.(world, actorId, id)
          .value
      : undefined;
  }
  if (condition.test === 'output')
    return (
      execution.outputs[condition.step]?.some(
        (output) => output.port === condition.port && output.quantity >= condition.quantity,
      ) ?? false
    );
  if (condition.test === 'time') return world.simTime >= condition.at;
  if (condition.test === 'holding') {
    // Own accessible possessions only, scanned lazily; stops as soon as it is enough.
    let held = 0;
    for (const item of possessionItems(world, actorId))
      if (
        item.definitionId === condition.definitionId &&
        (held += item.quantity) >= condition.quantity
      )
        return true;
    return false;
  }
  const id = execution.bindings[condition.role];
  const entity = typeof id === 'string' && entityGet(world.entities, id),
    actor = entityGet(world.entities, actorId);
  if (!entity || !actor || entity.retirement) return undefined;
  if (
    entity.id !== actorId &&
    !accessiblePossession(world, actorId, entity.id) &&
    !seesEntity(world, actor, entity)
  )
    return undefined;
  switch (condition.test) {
    case 'available':
      return true;
    case 'alive':
      return entity.actor?.alive;
    case 'equipped':
      return isEquipped(world, actor.id, id);
    case 'lit':
      return entity.heat?.lit;
  }
}
export function bindActivityCommand(
  node: Extract<ActivityNode, { kind: 'invoke' }>,
  execution: Pick<
    ActivityExecution,
    'bindings' | 'outputs' | 'humanInitiated' | 'combatHelpId' | 'request'
  >,
  actorId: string,
  id: string,
): Command | undefined {
  const command = {
    id,
    actorId,
    type: node.command,
    purpose: node.name,
    ...(execution.request?.chosenPurpose
      ? { chosenPurpose: cloneValue(execution.request.chosenPurpose) }
      : {}),
    ...(execution.humanInitiated ? { humanInitiated: true } : {}),
    ...(execution.combatHelpId ? { combatHelpId: execution.combatHelpId } : {}),
  } as Command & Record<string, unknown>;
  for (const [field, value] of Object.entries(node.args)) {
    if (
      [
        'id',
        'actorId',
        'type',
        'humanInitiated',
        'combatHelpId',
        'chosenPurpose',
        '__proto__',
        'constructor',
        'prototype',
      ].includes(field)
    )
      return;
    let bound: unknown;
    if ('role' in value) bound = execution.bindings[value.role];
    else if ('literal' in value) bound = value.literal;
    else {
      const output = execution.outputs[value.output]?.find(
        (output) => output.port === value.port && output.quantity >= value.quantity,
      );
      if (!output) return;
      bound = output.itemId;
    }
    if (node.command === 'cook' && isCookingInputField(field)) {
      const inputs = (command.inputs ??= {}) as Record<string, unknown>;
      inputs[field.slice(6)] = bound;
    } else command[field] = bound;
  }
  return isActivityCommand(command) ? command : undefined;
}

/** Only unfolds control and admits the next native step. The kernel remains the
 * sole physical executor; completed effects are never replayed on continuation. */
export function activityFrontier(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
): PlanStep | undefined {
  const execution = plan.activity;
  if (!execution || plan.status !== 'active') return;
  reconcileActivityControl(world, actorId, plan);
  if (plan.status !== 'active') return;
  const method = execution.request
    ? { name: execution.request.name }
    : acquiredActivities(world, actorId).find((method) => method.id === execution.methodId);
  const block = (reason: string) => {
    execution.reason = reason;
    plan.status = 'blocked';
    plan.revision++;
    entityGet(world.entities, actorId)!.actor!.agency.revision++;
    recordPlanResult(
      world,
      actorId,
      plan,
      `${method?.name ?? 'Chosen activity'} stopped: ${reason} Completed actions remain recorded separately; no remaining action was completed.`,
    );
  };
  if (!method) {
    block('This method no longer has permitted supporting knowledge.');
    return;
  }
  for (let work = 0; work < ACTIVITY_LIMITS.nodes; work++) {
    if (execution.processed >= ACTIVITY_LIMITS.expandedWork) {
      block('The admitted activity work limit has been reached.');
      return;
    }
    const frame = execution.pending.pop();
    if (!frame) {
      plan.status = 'completed';
      plan.revision++;
      entityGet(world.entities, actorId)!.actor!.agency.revision++;
      recordPlanResult(
        world,
        actorId,
        plan,
        `${method.name}: all selected actions and conditions ended at simulation time ${world.simTime}. Actual action results are recorded separately.`,
      );
      return;
    }
    const node = frame.node;
    execution.processed++;
    switch (node.kind) {
      case 'sequence':
        execution.pending.push(
          ...[...node.children]
            .reverse()
            .map((child) => ({ node: cloneValue(child), iteration: 0 })),
        );
        break;
      case 'branch': {
        const answer = predicate(world, actorId, execution, node.when);
        if (answer === undefined) {
          execution.pending.push(frame);
          block('Whether the next condition is met is unknown.');
          return;
        }
        const chosen = answer ? node.yes : node.no;
        if (chosen) execution.pending.push({ node: cloneValue(chosen), iteration: 0 });
        break;
      }
      case 'repeat': {
        const answer = predicate(world, actorId, execution, node.until);
        if (answer === true) break;
        if (answer === undefined || frame.iteration >= node.maximum) {
          execution.pending.push(frame);
          block(
            answer === undefined
              ? 'The stopping condition is unknown.'
              : 'The chosen attempt limit has been reached.',
          );
          return;
        }
        execution.pending.push(
          { ...frame, iteration: frame.iteration + 1 },
          { node: cloneValue(node.body), iteration: 0 },
        );
        break;
      }
      case 'wait': {
        const answer = predicate(world, actorId, execution, node.until);
        if (answer === true) break;
        // A clock wait's timer is anchored so its deadline is the requested time itself,
        // even when earlier steps delayed the start (keeps interval bounds exact).
        const startedAt =
          frame.startedAt ??
          (node.until.test === 'time'
            ? Math.max(0, Math.min(world.simTime, node.until.at - node.seconds))
            : world.simTime);
        execution.pending.push({ ...frame, startedAt });
        // Waiting ticks check scheduling; they do not expand the method again.
        execution.processed--;
        if (answer === undefined || world.simTime - startedAt >= node.seconds)
          block(
            answer === undefined
              ? 'The awaited condition is unknown.'
              : 'The chosen waiting time has ended.',
          );
        return;
      }
      case 'invoke': {
        if (execution.control?.kind === 'counted') {
          const budget = execution.control.budget;
          if (
            (execution.attempts ?? 0) >= budget.maximumAttempts ||
            (execution.spent ?? 0) >= budget.maximumSpent
          ) {
            finishControl(
              world,
              actorId,
              plan,
              'Another needed attempt would exceed the chosen limit.',
              false,
            );
            return;
          }
        }
        const id = `${plan.id}:step:${++execution.serial}`;
        const command = bindActivityCommand(node, execution, actorId, id);
        if (!command) {
          execution.pending.push(frame);
          block('A required actual output or compatible binding is unavailable.');
          return;
        }
        if (!activityCommandReferencesCurrent(world, actorId, execution, command)) {
          execution.pending.push(frame);
          block('A selected person is no longer the person originally observed for this activity.');
          return;
        }
        if (command.type === 'equip' && isEquipped(world, actorId, command.itemId)) continue;
        const step: PlanStep = {
          id,
          command,
          status: 'queued',
          activityKey: node.key,
          targetEpisodes: captureActionTargets(world, actorId, [command]),
        };
        // The active frontier remains eight steps; durable experiences hold older
        // results, and output bindings survive this residency-only movement.
        if (plan.steps.length >= 8) {
          const old = plan.steps.shift()!;
          execution.archivedSteps = (execution.archivedSteps ?? 0) + 1;
          const agency = entityGet(world.entities, actorId)!.actor!.agency;
          agency.history.push(old);
          agency.history = agency.history.slice(-32);
        }
        plan.steps.push(step);
        execution.activeKey = node.key;
        delete execution.reason;
        return step;
      }
    }
  }
  // Bounded traversal resumes next slice; it is not a false completed result.
  return;
}

export function startLearnedActivity(
  world: WorldState,
  actorId: string,
  id: string,
  methodId: string,
  bindings: Record<string, ActivityBinding>,
  resume = false,
  constructionPermissions: readonly ConstructionPermission[] = [],
  humanInitiated?: true,
  combatHelpId?: string,
) {
  const actor = entityGet(world.entities, actorId)?.actor;
  const method = acquiredActivities(world, actorId).find((method) => method.id === methodId);
  if (!actor || !method || !method.executable)
    return outcome(
      false,
      'unknown-method',
      'No personally learned compatible method is available.',
    );
  if (
    Object.keys(bindings).length !== Object.keys(method.roles).length ||
    Object.entries(method.roles).some(
      ([role, requirement]) => !activityRoleCompatible(world, actorId, requirement, bindings[role]),
    )
  )
    return outcome(false, 'invalid-bindings', 'The method needs compatible current objects.');
  try {
    validateInstalledActivityConditions(world, method.root, bindings);
  } catch {
    return outcome(
      false,
      'unsupported-capability',
      'This world no longer supports every action in this method.',
    );
  }
  if (resume) {
    const plan = actor.agency.plan;
    if (!plan?.activity || plan.activity.methodId !== methodId || plan.status !== 'blocked')
      return outcome(false, 'not-paused', 'There is no matching blocked activity to reconsider.');
    if (plan.steps.some((step) => step.status === 'blocked'))
      return outcome(
        false,
        'failed-step',
        'This activity stopped after a failed native step; choose a new attempt explicitly.',
      );
    plan.activity.bindings = cloneValue(bindings);
    plan.activity.targetEpisodes = captureActivityTargets(world, actorId, method.root, bindings);
    plan.status = 'active';
    plan.revision++;
    return outcome(true, 'resumed', 'Continue only the remaining work.');
  }
  if (actor.action || actor.agency.plan?.status === 'active')
    return outcome(false, 'busy', 'Cancel or finish current work before choosing a new activity.');
  actor.agency.plan = {
    id,
    // Revisions keep increasing across paused work so stale plan edits never match.
    revision: Math.max(actor.agency.plan?.revision ?? 0, actor.agency.suspended?.revision ?? 0) + 1,
    goalId: null,
    status: 'active',
    steps: [],
    activity: {
      ...(combatHelpId ? { combatHelpId } : {}),
      ...(humanInitiated ? { humanInitiated } : {}),
      methodId,
      bindings: cloneValue(bindings),
      targetEpisodes: captureActivityTargets(world, actorId, method.root, bindings),
      pending: [{ node: cloneValue(method.root), iteration: 0 }],
      outputs: {},
      serial: 0,
      processed: 0,
    },
  };
  actor.agency.revision++;
  actor.planGeneration++;
  const first = activityFrontier(world, actorId, actor.agency.plan);
  if (first && !('itemFromStep' in first.command)) {
    const preview = nativeOperationAvailable(world, first.command, constructionPermissions);
    if (!preview.ok) return preview;
  }
  return outcome(true, 'queued', 'Selected the learned task.');
}

function timeConditions(node: ActivityNode): number[] {
  if (node.kind === 'invoke') {
    const until = node.command === 'follow' ? node.args['until'] : undefined;
    return until && 'literal' in until && typeof until.literal === 'number' ? [until.literal] : [];
  }
  if (node.kind === 'sequence') return node.children.flatMap(timeConditions);
  if (node.kind === 'branch')
    return [
      ...(node.when.test === 'time' ? [node.when.at] : []),
      ...timeConditions(node.yes),
      ...(node.no ? timeConditions(node.no) : []),
    ];
  if (node.kind === 'repeat')
    return [...(node.until.test === 'time' ? [node.until.at] : []), ...timeConditions(node.body)];
  return node.until.test === 'time' ? [node.until.at] : [];
}
/** Shared structural/reference admission. This read never changes current work.
 * docs/action-capabilities.md#8-native-activity-composition */
export function requestedActivityProblem(
  world: WorldState,
  actorId: string,
  command: Extract<Command, { type: 'compose' }>,
): import('./types.js').Outcome | null {
  const actor = entityGet(world.entities, actorId)?.actor;
  if (!actor) return outcome(false, 'actor-unavailable', 'The actor is unavailable.');
  if (command.chosenPurpose !== undefined && !validResponsePurpose(command.chosenPurpose))
    return outcome(false, 'invalid-purpose', 'The selected purpose binding is malformed.');
  let roles: ReturnType<typeof activityRoleKinds>;
  try {
    validateActivityNode(command.root);
    roles = activityRoleKinds(command.root);
    validateInstalledActivityConditions(world, command.root, command.bindings);
    if (command.control)
      validateChosenActivityControl(world, command.root, command.bindings, command.control, true);
  } catch {
    return outcome(
      false,
      'invalid-activity',
      'The requested activity is not a supported bounded structure.',
    );
  }
  const inspectedContainerId = currentInventoryInspection(world, actorId)?.containerId;
  if (timeConditions(command.root).some((at) => at <= world.simTime))
    return outcome(false, 'stale-deadline', 'That stopping time has already passed; ask again.');
  if (
    typeof command.name !== 'string' ||
    !command.name.trim() ||
    command.name.length > ACTIVITY_LIMITS.text ||
    !['enqueue', 'replace', 'interrupt'].includes(command.mode) ||
    !command.bindings ||
    (command.subjects !== undefined &&
      (!Array.isArray(command.subjects) ||
        command.subjects.length > 8 ||
        // Shape only: subjects grant nothing, and whether an unseen one still exists must
        // not change the answer. Actor subjects are rechecked through encounter pins.
        command.subjects.some((id) => typeof id !== 'string' || !isSafeRecordId(id)))) ||
    Object.keys(command.bindings).length !== roles.size ||
    [...roles.keys()].some((role) => !Object.hasOwn(command.bindings, role)) ||
    Object.entries(command.bindings).some(([role, value]) => {
      const kind = roles.get(role);
      if (kind === 'text') return typeof value !== 'string' || !value.trim() || value.length > 1500;
      if (kind === 'place') {
        if (typeof value === 'string') return true;
      } else if (typeof value !== 'string') return true;
      if (typeof value !== 'string')
        return (
          !value ||
          ![value.x, value.y, value.z].every(Number.isFinite) ||
          typeof value.surfaceId !== 'string'
        );
      const entity = entityGet(world.entities, value);
      const pile =
        entity?.placement?.mode === 'contained'
          ? entityGet(world.entities, entity.placement.parentEntityId)
          : undefined;
      return (
        !entity ||
        entity.retirement ||
        (value !== actorId &&
          !accessiblePossession(world, actorId, value) &&
          // A permitted inspection identifies this exact nested ground container;
          // it grants no other unseen objects and access is checked again here.
          !(value === inspectedContainerId && canAccessContainer(world, actorId, value)) &&
          !seesEntity(world, entityGet(world.entities, actorId)!, entity) &&
          // A stack lying in a pile is reachable through the pile the actor perceives.
          !(
            pile?.kind === 'item-pile' &&
            seesEntity(world, entityGet(world.entities, actorId)!, pile)
          ) &&
          // Installed parts are identified through their actually perceived assembly.
          // This grants a reference only; native material/edit admission still owns rights.
          !(
            entity.placement?.mode === 'attached' &&
            entity.placement.portId === 'assembly' &&
            entityGet(world.entities, entity.placement.parentEntityId)?.assembly?.parts[value] &&
            seesEntity(
              world,
              entityGet(world.entities, actorId)!,
              entityGet(world.entities, entity.placement.parentEntityId)!,
            )
          ))
      );
    })
  )
    return outcome(
      false,
      'invalid-bindings',
      'The activity needs current things you can perceive or carry.',
    );
  if (command.control?.kind === 'finite') {
    const stop = finiteControlStop(world, actorId, command.control);
    if (stop) return outcome(false, 'activity-limit', stop.reason);
  }
  const current = actor.agency.plan;
  if (
    command.control &&
    command.mode === 'enqueue' &&
    (actor.action || current?.status === 'active' || current?.status === 'blocked')
  )
    return outcome(
      false,
      'activity-busy',
      'Finish current work, or explicitly replace or interrupt it before starting this activity.',
    );
  return null;
}

/** Find only the first presently needed child, using the executor's own predicates
 * and binding rules. Future output-dependent steps remain future admission, never
 * a promise that their current prerequisites are already satisfied. */
export function firstRequestedActivityCommand(
  world: WorldState,
  command: Extract<Command, { type: 'compose' }>,
): Command | import('./types.js').Outcome | null {
  const execution = {
    bindings: command.bindings,
    outputs: {},
    humanInitiated: command.humanInitiated,
    combatHelpId: command.combatHelpId,
    request: { name: command.name, root: command.root, chosenPurpose: command.chosenPurpose },
  };
  return firstActivityCommand(world, command.actorId, `${command.id}:first`, execution, [
    { node: command.root, iteration: 0 },
  ]);
}

/** Inspect the saved remaining frontier without allocating steps, replaying outputs,
 * evaluating future physical work, or renewing the original selected limits. */
export function firstRemainingActivityCommand(
  world: WorldState,
  actorId: string,
  plan: ActorPlan,
): Command | import('./types.js').Outcome | null {
  const execution = plan.activity;
  if (execution) {
    if (execution.terminal || execution.processed >= ACTIVITY_LIMITS.expandedWork)
      return outcome(
        false,
        'activity-limit',
        'The paused activity has reached its original stopping limit.',
      );
    if (execution.control) {
      const stop = continuingControlStop(world, actorId, execution, execution.control);
      if (stop) return outcome(false, 'activity-limit', stop.reason);
    }
    if (
      !execution.request &&
      !acquiredActivities(world, actorId).some(
        (method) => method.id === execution.methodId && method.executable,
      )
    )
      return outcome(
        false,
        'unknown-method',
        'The paused method no longer has permitted supporting knowledge.',
      );
  }
  const queued = plan.steps.find((step) => step.status === 'queued');
  const first = queued
    ? (resolvePlanCommand(plan, queued) ??
      outcome(
        false,
        'invalid-bindings',
        'The paused step’s actual preceding output is unavailable.',
      ))
    : execution
      ? firstActivityCommand(
          world,
          actorId,
          `${plan.id}:resume-first`,
          execution,
          [...execution.pending].reverse(),
        )
      : null;
  if (
    execution &&
    first &&
    !('ok' in first) &&
    (!queued || queued.activityKey) &&
    activityAttemptExceedsLimit(
      world,
      execution,
      first,
      queued?.id ?? `${plan.id}:step:${execution.serial + 1}`,
    )
  )
    return outcome(
      false,
      'activity-limit',
      'Another needed attempt would exceed the chosen limit.',
    );
  if (
    execution &&
    first &&
    !('ok' in first) &&
    !activityCommandReferencesCurrent(world, actorId, execution, first)
  )
    return outcome(
      false,
      'stale-target',
      'A selected person is no longer the person originally observed for this activity.',
    );
  return first;
}

function captureActivityTargets(
  world: WorldState,
  actorId: string,
  root: ActivityNode,
  bindings: Record<string, ActivityBinding>,
): ActionTargetEpisodes {
  return captureActionTargets(
    world,
    actorId,
    activityEntityReferences(root, bindings).map((targetId) => ({ actorId, targetId })),
  );
}
function activityCommandReferencesCurrent(
  world: WorldState,
  actorId: string,
  execution: ActivityExecution,
  command: Command,
): boolean {
  const fields = activityCommandFields(command);
  return actionTargetsCurrent(
    world,
    actorId,
    commandEntityFields(command).flatMap((field) => {
      const value = fields[field];
      return typeof value === 'string' ? [{ actorId, targetId: value }] : [];
    }),
    execution.targetEpisodes,
  );
}

function firstActivityCommand(
  world: WorldState,
  actorId: string,
  id: string,
  execution: Pick<
    ActivityExecution,
    'bindings' | 'outputs' | 'humanInitiated' | 'combatHelpId' | 'request'
  >,
  frames: readonly { node: ActivityNode; iteration: number }[],
): Command | import('./types.js').Outcome | null {
  const visit = (node: ActivityNode): Command | import('./types.js').Outcome | null | undefined => {
    if (node.kind === 'sequence') {
      for (const child of node.children) {
        const first = visit(child);
        if (first !== undefined) return first;
      }
      return;
    }
    if (node.kind === 'invoke') {
      const bound = bindActivityCommand(node, execution, actorId, id);
      if (!bound)
        return outcome(
          false,
          'invalid-bindings',
          'A required actual output or compatible binding is unavailable.',
        );
      return bound.type === 'equip' && isEquipped(world, actorId, bound.itemId) ? undefined : bound;
    }
    const answer = predicate(
      world,
      actorId,
      execution,
      node.kind === 'branch' ? node.when : node.until,
    );
    if (answer === undefined)
      return outcome(false, 'unknown-condition', 'Whether the next condition is met is unknown.');
    if (node.kind === 'branch')
      return answer ? visit(node.yes) : node.no ? visit(node.no) : undefined;
    if (node.kind === 'repeat') {
      if (answer) return;
      const first = visit(node.body);
      // Without a child or an actual wait, nothing can change the false stopping
      // condition. The executor would exhaust this bounded repetition immediately.
      return first === undefined
        ? outcome(
            false,
            'activity-limit',
            'The chosen attempt limit would be reached without starting useful work.',
          )
        : first;
    }
    return answer ? undefined : null;
  };
  for (const { node, iteration } of frames) {
    if (
      node.kind === 'repeat' &&
      iteration >= node.maximum &&
      predicate(world, actorId, execution, node.until) !== true
    )
      return outcome(
        false,
        'activity-limit',
        'The paused activity has reached its chosen attempt limit.',
      );
    const first = visit(node);
    if (first !== undefined) return first;
  }
  return null;
}

/** Admit a requested composition through the same executor and plan owner as
 * learned methods. Its data can select only registered controls and commands. */
export function startRequestedActivity(
  world: WorldState,
  actorId: string,
  id: string,
  command: Extract<Command, { type: 'compose' }>,
  constructionPermissions: readonly ConstructionPermission[] = [],
) {
  const problem = requestedActivityProblem(world, actorId, command);
  if (problem) return problem;
  const actor = entityGet(world.entities, actorId)!.actor!;
  // Queued work may depend on the preceding work's future outputs. Work that
  // starts now must pass its complete first-child check before cancellation.
  if (command.mode !== 'enqueue' || (!actor.action && actor.agency.plan?.status !== 'active')) {
    const prepared = prepareNativeChoice(
      world,
      actorId,
      command,
      command.mode,
      constructionPermissions,
    );
    const available = 'ok' in prepared ? prepared : prepared.outcome;
    if (!available.ok) return available;
  }
  const execution: ActivityExecution = {
    ...(command.combatHelpId ? { combatHelpId: command.combatHelpId } : {}),
    ...(command.humanInitiated ? { humanInitiated: true } : {}),
    request: {
      name: command.name.trim(),
      root: cloneValue(command.root),
      ...(command.chosenPurpose ? { chosenPurpose: cloneValue(command.chosenPurpose) } : {}),
    },
    bindings: cloneValue(command.bindings),
    targetEpisodes: captureActivityTargets(world, actorId, command.root, command.bindings),
    pending: [{ node: cloneValue(command.root), iteration: 0 }],
    outputs: {},
    serial: 0,
    processed: 0,
    ...(command.control
      ? {
          control: cloneValue(command.control),
          ...(command.control.kind === 'counted' ? { attempts: 0, spent: 0 } : {}),
          interrupted: false,
          terminal: false,
        }
      : {}),
  };
  const current = actor.agency.plan;
  if (
    command.mode === 'enqueue' &&
    current &&
    (current.status === 'active' || current.status === 'blocked')
  ) {
    if (current.status === 'blocked')
      return outcome(false, 'plan-blocked', 'Explicitly replace or cancel the stopped work first.');
    if (current.activity)
      return outcome(
        false,
        'plan-busy',
        'Another activity is still running; replace it, or ask again when it ends.',
      );
    // The frontier archives old steps as an activity grows; a queued step that uses an
    // earlier step's item must keep that producer, so wait until those steps finish.
    if (current.steps.some((step) => 'itemFromStep' in step.command))
      return outcome(
        false,
        'plan-busy',
        'The current steps pass items between them; ask again when they finish.',
      );
    // Runs after the already queued steps; nothing is previewed against today's state.
    current.activity = execution;
    current.revision++;
    actor.agency.revision++;
    actor.planGeneration++;
    return outcome(true, 'queued', 'Added the task after your current work.');
  }
  if (command.mode === 'replace') stopCurrentWork(world, actorId);
  else if (command.mode === 'interrupt') {
    const refused = suspendCurrentWork(world, actorId);
    if (refused) return refused;
  }
  // Queued after a direct action, the activity starts when that action ends, like any
  // enqueued step; only an interrupt that could not pause anything is refused.
  const afterDirect = command.mode === 'enqueue' && !!actor.action;
  if (actor.agency.plan?.status === 'active' || (actor.action && command.mode === 'interrupt'))
    return outcome(
      false,
      'busy',
      command.mode === 'interrupt'
        ? 'This work is not a chosen plan that can be paused; replace it or let it finish.'
        : 'Cancel or finish current work before choosing a new activity.',
    );
  actor.agency.plan = {
    id,
    revision: Math.max(current?.revision ?? 0, actor.agency.suspended?.revision ?? 0) + 1,
    goalId: null,
    status: 'active',
    steps: [],
    activity: execution,
  };
  actor.agency.revision++;
  actor.planGeneration++;
  if (afterDirect) return outcome(true, 'queued', 'Added the task after your current work.');
  const first = activityFrontier(world, actorId, actor.agency.plan);
  if (first && !('itemFromStep' in first.command)) {
    const preview = nativeOperationAvailable(world, first.command, constructionPermissions);
    if (!preview.ok) return preview;
  }
  return outcome(true, 'queued', 'Started the task.');
}
