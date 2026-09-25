import {
  actionTargetsCurrent,
  captureActionTargets,
  validActionTargets,
  type ActionTargetEpisodes,
} from './action-targets.js';
import { capabilityBlocked } from './status-capabilities.js';
import { validActionFulfillment, type ActionFulfillment } from './action-capabilities.js';
export type PlannedCommand = Command | ItemOutputCommand;
export interface PlanStep {
  targetEpisodes?: ActionTargetEpisodes;
  id: string;
  command: PlannedCommand;
    status: 'needs-interpretation' | 'awaiting-confirmation';
    alternative?: {
      targetEpisodes?: ActionTargetEpisodes;
      commands: Command[];
      fulfillment: ActionFulfillment;
  expectedRevision: number,
  goalId: string | null,
  world?: WorldState,
): Outcome {
  const agency = actor.agency;
        id: command.id,
        command: cloneValue(command),
        ...(world
          ? { targetEpisodes: captureActionTargets(world, command.actorId, [command]) }
          : {}),
        status: 'queued' as const,
      })),
        id: command.id,
        command: cloneValue(command),
        ...(world
          ? { targetEpisodes: captureActionTargets(world, command.actorId, [command]) }
          : {}),
        status: 'queued',
      })),
        if (
          !a ||
          (a.targetEpisodes !== undefined && !validActionTargets(a.targetEpisodes)) ||
          !validActionFulfillment(a.fulfillment) ||
          a.fulfillment.verdict !== 'confirm' ||
    for (const step of [...(plan?.steps ?? []), ...agency.history]) {
      if (
        (step.targetEpisodes !== undefined && !validActionTargets(step.targetEpisodes)) ||
        !isSafeRecordId(step.id) ||
        !isPlannedCommand(step.command) ||
    pending.alternative = {
      commands: cloneValue(commands),
      targetEpisodes: captureActionTargets(world, actorId, commands),
      fulfillment: cloneValue(fulfillment),
      mode,
    );
  if (
    !actionTargetsCurrent(world, actorId, alternative.commands, alternative.targetEpisodes) ||
    pending.manifestRevision !== world.moduleManifest.revision ||
    (alternative.mode === 'replace' && actor.planGeneration !== alternative.expectedPlan)
      false,
      'stale-alternative',
      'The target encounter, mechanics or current work changed. Submit a fresh action instead of accepting this old revision.',
    );
  const result = arrangePlan(
    actor.agency.plan?.revision ?? 0,
    null,
    world,
  );
  if (result.ok) withdrawAttempt(actor, attemptId);
