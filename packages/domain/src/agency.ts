import { capabilityBlocked } from './status-capabilities.js';
import { validActionFulfillment, type ActionFulfillment } from './action-capabilities.js';
export type PlannedCommand = Command | ItemOutputCommand;
export interface PlanStep {
  id: string;
  command: PlannedCommand;
    status: 'needs-interpretation' | 'awaiting-confirmation';
    alternative?: {
      commands: Command[];
      fulfillment: ActionFulfillment;
  expectedRevision: number,
  goalId: string | null,
): Outcome {
  const agency = actor.agency;
        id: command.id,
        command: cloneValue(command),
        status: 'queued' as const,
      })),
        id: command.id,
        command: cloneValue(command),
        status: 'queued',
      })),
        if (
          !a ||
          !validActionFulfillment(a.fulfillment) ||
          a.fulfillment.verdict !== 'confirm' ||
    for (const step of [...(plan?.steps ?? []), ...agency.history]) {
      if (
        !isSafeRecordId(step.id) ||
        !isPlannedCommand(step.command) ||
    pending.alternative = {
      commands: cloneValue(commands),
      fulfillment: cloneValue(fulfillment),
      mode,
    );
  if (
    pending.manifestRevision !== world.moduleManifest.revision ||
    (alternative.mode === 'replace' && actor.planGeneration !== alternative.expectedPlan)
      false,
      'stale-alternative',
      'Mechanics or current work changed. Submit a fresh action instead of accepting this old replacement.',
    );
  const result = arrangePlan(
    actor.agency.plan?.revision ?? 0,
    null,
  );
  if (result.ok) withdrawAttempt(actor, attemptId);
