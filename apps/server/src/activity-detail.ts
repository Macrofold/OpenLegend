import { activityRequestDescriptors, type ActivityRequestDescriptor } from '@open-legend/domain';
import { digest, type JobRecord } from './store.js';
import type { WorldService } from './world-service.js';
import type { CognitionLevel } from './cognition-budget.js';

/** Shared admission/claim for ordinary and higher preparation. The operational
 * root survives handoffs and gameplay reset; it is never a model permission.
 * docs/technical/situation-aware-cognition-context.md#185-one-optional-installed-activity-detail-continuation */
export async function canPrepareActivityDetail(
  service: WorldService,
  job: JobRecord,
  level: CognitionLevel,
  allowance: number,
): Promise<boolean> {
  const state = job.decision;
  if (
    !state ||
    state.activityDetail ||
    state.phase === 'closed' ||
    service.config.jevOnly ||
    service.config.budgetUsd <= 0 ||
    Date.now() >= state.usefulUntilWall ||
    performance.now() >= state.usefulUntilMonotonic ||
    (state.usefulUntilSim !== undefined && service.world.simTime >= state.usefulUntilSim)
  )
    return false;
  const attempts = await service.store.decisionAttempts(job.id);
  const entries = attempts.filter((entry) => entry.category === 'level' && entry.level === level);
  const limits = state.limits[level];
  if (
    entries.length + 2 > limits.requestsPerDecision ||
    entries.reduce((sum, entry) => sum + entry.reservedUsd, 0) + allowance * 2 > limits.decisionUsd
  )
    return false;
  return service.store.budgetAvailable(state.actorId, allowance * 2, service.config.budgetUsd);
}

export async function claimActivityDetail(
  service: WorldService,
  job: JobRecord,
  family: string,
  descriptors: readonly ActivityRequestDescriptor[],
  initialAttemptId: string,
): Promise<JobRecord> {
  const descriptor = descriptors.find((entry) => entry.id === family);
  if (!descriptor) throw new Error('Unknown installed activity detail reference.');
  const claimed = await service.store.mutateDecision(job.id, async (current) => {
    const installed =
      current.decision &&
      activityRequestDescriptors(service.world, current.decision.actorId).find(
        (entry) => entry.id === family,
      );
    if (
      !current.decision ||
      current.decision.phase === 'closed' ||
      current.decision.activityDetail ||
      Date.now() >= current.decision.usefulUntilWall ||
      performance.now() >= current.decision.usefulUntilMonotonic ||
      !installed ||
      digest(installed) !== digest(descriptor)
    )
      return undefined;
    return {
      ...current,
      decision: {
        ...current.decision,
        activityDetail: {
          family,
          definitionDigest: digest(descriptor),
          initialAttemptId,
          phase: 'preparing-detail',
        },
      },
    };
  });
  if (!claimed) throw new Error('The activity detail allowance was already used or expired.');
  return claimed;
}

export async function activityDetailPhase(
  service: WorldService,
  rootId: string,
  phase: NonNullable<NonNullable<JobRecord['decision']>['activityDetail']>['phase'],
  finalAttemptId?: string,
) {
  return service.store.mutateDecision(rootId, async (current) => {
    const detail = current.decision?.activityDetail;
    if (!detail || !current.decision || current.decision.phase === 'closed') return undefined;
    const next: Record<typeof detail.phase, readonly (typeof detail.phase)[]> = {
      'preparing-detail': ['final-ready', 'ended'],
      'final-ready': ['final-dispatched', 'ended'],
      'final-dispatched': ['finished', 'ended'],
      finished: [],
      ended: [],
    };
    if (!next[detail.phase].includes(phase)) return undefined;
    return {
      ...current,
      decision: {
        ...current.decision,
        activityDetail: {
          ...detail,
          phase,
          ...(finalAttemptId ? { finalAttemptId } : {}),
        },
      },
    };
  });
}
