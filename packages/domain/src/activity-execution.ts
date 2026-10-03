import { executeCommand, nativeOperationAvailable } from './kernel.js';
import type { Command, WorldState } from './types.js';
import type { ActorPlan, PlanStep } from './agency.js';
import { isActivityCommand, stopCurrentWork, suspendCurrentWork } from './agency.js';
import { captureActionTargets } from './action-targets.js';
import { acquiredActivities } from './activity-learning.js';
import {
  validateActivityNode,
  ACTIVITY_LIMITS,
  type ActivityNode,
  type ActivityOutput,
  type ActivityPredicate,
  type ActivityBinding,
} from './action-experience.js';
import { cloneValue } from './draft.js';
import { isSafeRecordId } from './records.js';
import { accessiblePossession, possessionItems } from './object-access.js';
import { seesEntity } from './perception.js';
import { appendMemory, outcome } from './events.js';

export interface ActivityExecution {
  /** A personally learned method, or absent for a requested composition. */
  methodId?: string;
  /** A requested composition carries its own validated root and chosen name. */
  request?: { name: string; root: ActivityNode };
  bindings: Record<string, ActivityBinding>;
  pending: { node: ActivityNode; iteration: number; startedAt?: number }[];
  outputs: Record<string, ActivityOutput[]>;
  serial: number;
  processed: number;
  archivedSteps?: number;
  activeKey?: string;
  reason?: string;
}
function predicate(
  world: WorldState,
  actorId: string,
  execution: ActivityExecution,
  condition: ActivityPredicate,
): boolean | undefined {
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
  const entity = typeof id === 'string' && world.entities[id],
    actor = world.entities[actorId];
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
      return actor.actor?.equippedItemId === id;
    case 'lit':
      return entity.heat?.lit;
  }
}
export function bindActivityCommand(
  node: Extract<ActivityNode, { kind: 'invoke' }>,
  execution: Pick<ActivityExecution, 'bindings' | 'outputs'>,
  actorId: string,
  id: string,
): Command | undefined {
  const command = { id, actorId, type: node.command, purpose: node.name } as Command &
    Record<string, unknown>;
  for (const [field, value] of Object.entries(node.args)) {
    if (['id', 'actorId', 'type', '__proto__', 'constructor', 'prototype'].includes(field)) return;
    if ('role' in value) command[field] = execution.bindings[value.role];
    else if ('literal' in value) command[field] = value.literal;
    else {
      const output = execution.outputs[value.output]?.find(
        (output) => output.port === value.port && output.quantity >= value.quantity,
      );
      if (!output) return;
      command[field] = output.itemId;
    }
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
  const method = execution.request
    ? { name: execution.request.name }
    : acquiredActivities(world, actorId).find((method) => method.id === execution.methodId);
  const block = (reason: string) => {
    execution.reason = reason;
    plan.status = 'blocked';
    plan.revision++;
    world.entities[actorId]!.actor!.agency.revision++;
    appendMemory(world, actorId, {
      kind: 'episode',
      source: 'internal',
      importance: 6,
      entityIds: [actorId],
      summary: `${method?.name ?? 'My chosen activity'} stopped: ${reason} Completed actions remain recorded separately; no remaining action was completed.`,
    });
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
      world.entities[actorId]!.actor!.agency.revision++;
      appendMemory(world, actorId, {
        kind: 'episode',
        source: 'internal',
        importance: 6,
        entityIds: [actorId],
        summary: `${method.name}: all selected actions and conditions have ended. ${
          plan.steps
            .filter((step) => step.outcome)
            .map((step) => `${step.command.purpose ?? step.command.type}: ${step.outcome!.message}`)
            .join(' ') || 'No physical action was needed.'
        }`,
      });
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
          block('I cannot tell whether the next condition is met.');
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
        const id = `${plan.id}:step:${++execution.serial}`;
        const command = bindActivityCommand(node, execution, actorId, id);
        if (!command) {
          execution.pending.push(frame);
          block('A required actual output or compatible binding is unavailable.');
          return;
        }
        if (
          command.type === 'equip' &&
          world.entities[actorId]!.actor!.equippedItemId === command.itemId
        )
          continue;
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
          const agency = world.entities[actorId]!.actor!.agency;
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
) {
  const actor = world.entities[actorId]?.actor;
  const method = acquiredActivities(world, actorId).find((method) => method.id === methodId);
  if (!actor || !method || !method.executable)
    return outcome(
      false,
      'unknown-method',
      'No personally learned compatible method is available.',
    );
  if (
    Object.keys(bindings).length !== Object.keys(method.roles).length ||
    Object.keys(method.roles).some((role) => {
      const value = bindings[role];
      const expected = method.roles[role]!;
      if (expected.kind === 'text')
        return typeof value !== 'string' || !value.trim() || value.length > 1500;
      if (expected.kind === 'place')
        return (
          typeof value !== 'object' ||
          !value ||
          !Number.isFinite(value.x) ||
          !Number.isFinite(value.y) ||
          !Number.isFinite(value.z) ||
          typeof value.surfaceId !== 'string'
        );
      const entity = typeof value === 'string' ? world.entities[value] : undefined;
      return (
        !entity ||
        entity.retirement ||
        (entity.id !== actorId &&
          !accessiblePossession(world, actorId, entity.id) &&
          !seesEntity(world, world.entities[actorId]!, entity)) ||
        (expected.definitionId &&
          (entity.item?.definitionPin.id !== expected.definitionId ||
            entity.item.definitionPin.version !== expected.definitionVersion ||
            entity.item.definitionPin.digest !== expected.definitionDigest)) ||
        (expected.entityKind && entity.kind !== expected.entityKind) ||
        (expected.maximumHealth !== undefined &&
          (entity.actor?.health ?? Infinity) > expected.maximumHealth)
      );
    })
  )
    return outcome(false, 'invalid-bindings', 'The method needs compatible current objects.');
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
      methodId,
      bindings: cloneValue(bindings),
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
    const preview = nativeOperationAvailable(world, first.command);
    if (!preview.ok) return preview;
  }
  return outcome(true, 'queued', 'The learned activity was selected; no result is promised.');
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
/** Roles an activity structure binds through its invocation arguments. */
function structureRoles(node: ActivityNode, roles = new Set<string>()): Set<string> {
  if (node.kind === 'invoke') {
    for (const arg of Object.values(node.args)) if ('role' in arg) roles.add(arg.role);
  } else if (node.kind === 'sequence')
    node.children.forEach((child) => structureRoles(child, roles));
  else if (node.kind === 'branch') {
    structureRoles(node.yes, roles);
    if (node.no) structureRoles(node.no, roles);
    if ('role' in node.when) roles.add(node.when.role);
  } else if (node.kind === 'repeat') {
    structureRoles(node.body, roles);
    if ('role' in node.until) roles.add(node.until.role);
  } else if ('role' in node.until) roles.add(node.until.role);
  return roles;
}

/** Admit a requested composition through the same executor, plan owner and native admission
 * as learned methods. The structure is data: registered controls, predicates and command
 * families only. docs/action-capabilities.md#8-native-activity-composition
 */
export function startRequestedActivity(
  world: WorldState,
  actorId: string,
  id: string,
  command: Extract<Command, { type: 'compose' }>,
) {
  const actor = world.entities[actorId]?.actor;
  if (!actor) return outcome(false, 'actor-unavailable', 'The actor is unavailable.');
  try {
    validateActivityNode(command.root);
  } catch {
    return outcome(
      false,
      'invalid-activity',
      'The requested activity is not a supported bounded structure.',
    );
  }
  const roles = structureRoles(command.root);
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
    [...roles].some((role) => !Object.hasOwn(command.bindings, role)) ||
    Object.values(command.bindings).some((value) => {
      if (typeof value !== 'string')
        return (
          !value ||
          ![value.x, value.y, value.z].every(Number.isFinite) ||
          typeof value.surfaceId !== 'string'
        );
      const entity = world.entities[value];
      const pile =
        entity?.placement?.mode === 'contained'
          ? world.entities[entity.placement.parentEntityId]
          : undefined;
      return (
        !entity ||
        entity.retirement ||
        (value !== actorId &&
          !accessiblePossession(world, actorId, value) &&
          !seesEntity(world, world.entities[actorId]!, entity) &&
          // A stack lying in a pile is reachable through the pile the actor perceives.
          !(pile?.kind === 'item-pile' && seesEntity(world, world.entities[actorId]!, pile)))
      );
    })
  )
    return outcome(
      false,
      'invalid-bindings',
      'The activity needs current things you can perceive or carry.',
    );
  const execution: ActivityExecution = {
    request: { name: command.name.trim(), root: cloneValue(command.root) },
    bindings: cloneValue(command.bindings),
    pending: [{ node: cloneValue(command.root), iteration: 0 }],
    outputs: {},
    serial: 0,
    processed: 0,
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
    return outcome(
      true,
      'queued',
      'The activity will start after the current work; no result is promised.',
    );
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
  if (afterDirect)
    return outcome(
      true,
      'queued',
      'The activity will start after the current work; no result is promised.',
    );
  const first = activityFrontier(world, actorId, actor.agency.plan);
  if (first && !('itemFromStep' in first.command)) {
    const preview = nativeOperationAvailable(world, first.command);
    if (!preview.ok) return preview;
  }
  return outcome(true, 'queued', 'The requested activity was admitted; no result is promised.');
}
