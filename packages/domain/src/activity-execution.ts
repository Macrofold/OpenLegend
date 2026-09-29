import { executeCommand } from './kernel.js';
import type { Command, WorldState } from './types.js';
import type { ActorPlan, PlanStep } from './agency.js';
import { isActivityCommand } from './agency.js';
import { captureActionTargets } from './action-targets.js';
import { acquiredActivities } from './activity-learning.js';
import {
  ACTIVITY_LIMITS,
  type ActivityNode,
  type ActivityOutput,
  type ActivityPredicate,
  type ActivityBinding,
} from './action-experience.js';
import { cloneValue } from './draft.js';
import { accessiblePossession } from './object-access.js';
import { seesEntity } from './perception.js';
import { appendMemory, outcome } from './events.js';

export interface ActivityExecution {
  methodId: string;
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
  const method = acquiredActivities(world, actorId).find(
    (method) => method.id === execution.methodId,
  );
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
        const startedAt = frame.startedAt ?? world.simTime;
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
    revision: (actor.agency.plan?.revision ?? 0) + 1,
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
    const preview = executeCommand(world, first.command, { preview: true }).outcome;
    if (!preview.ok) return preview;
  }
  return outcome(true, 'queued', 'The learned activity was selected; no result is promised.');
}
