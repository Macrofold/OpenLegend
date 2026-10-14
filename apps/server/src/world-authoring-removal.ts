import {
  analyzeStatusEffectRemoval,
  StatusEffectRemovalCapacityError,
  type StatusEffectRemovalAnalysis,
  type StatusEffectPolicy,
  type WorldState,
} from '@open-legend/domain';
import type { WorldStatusRemovalPage, WorldStatusRemovalSummary } from '@open-legend/protocol';
import type { AuthoringDraft } from './world-authoring-kinds.js';
import { mayDiscloseSubject, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';
import { AuthoringRequestError } from './world-authoring-contracts.js';
import { fingerprint } from './relationship-index.js';

// Leave storage headroom inside the shared 128 KiB operational-record envelope;
// exceeding this refuses the whole review rather than hiding required rows.
// docs/limits/creator-edits.md#ce01-b--complete-review-and-growing-work
export const REMOVAL_PLAN_BYTES = 96 * 1024;
export const REMOVAL_PAGE_SIZE = 20;
const REMOVAL_CAPACITY_MESSAGE =
  'The complete removal exceeds the retained review allowance. Choose a smaller independent removal; no partial plan can apply.';
export const statusRemovalKey = (draftId: string, revision: number, binding: string) =>
  fingerprint([draftId, revision, binding]);
export interface RetainedStatusRemoval {
  summary: WorldStatusRemovalSummary;
  definitions: WorldStatusRemovalPage['definitions'];
  optional: WorldStatusRemovalPage['optional'];
  instances: WorldStatusRemovalPage['instances'];
  blockers: WorldStatusRemovalPage['blockers'];
}
export function analyzeStatusRemoval(
  world: WorldState,
  request: Parameters<typeof analyzeStatusEffectRemoval>[1],
) {
  try {
    // Serialized UTF-16 character count is a lower bound on UTF-8 bytes. Refuse
    // only when explanation paths alone already exceed the existing detail limit.
    return analyzeStatusEffectRemoval(world, {
      ...request,
      maxExplanationCharacters: REMOVAL_PLAN_BYTES,
    });
  } catch (error) {
    if (error instanceof StatusEffectRemovalCapacityError)
      throw new AuthoringRequestError(REMOVAL_CAPACITY_MESSAGE, 'capacity');
    throw error;
  }
}
export function statusRemovalAnalysis(world: WorldState, draft: AuthoringDraft) {
  if (draft.kind !== 'status-effect-policy') return undefined;
  const value = draft.payload as Partial<StatusEffectPolicy> | null;
  if (!value || !Array.isArray(value.definitions)) return undefined;
  const retained = new Set(value.definitions.map((d) => d?.id));
  const roots = world.statusEffectPolicy.definitions
    .filter((d) => !retained.has(d.id))
    .map((d) => d.id);
  if (!roots.length && !draft.removalSelection) return undefined;
  return analyzeStatusRemoval(world, {
    rootIds: draft.removalSelection?.rootIds ?? roots,
    optionalIds: draft.removalSelection?.optionalIds,
    candidatePolicy: value as StatusEffectPolicy,
  });
}
/** No private ordinary instance may be omitted from an exact destructive review.
 * Retained contribution pins remain blockers without exposing their private owners. */
export async function assertRemovalDisclosure(
  service: WorldService,
  scope: RequestScope,
  rows: RetainedStatusRemoval['instances'],
) {
  const timeline = service.timelineId;
  const objectRevision = service.world.objectState.revision;
  const ids = new Set(rows.flatMap((row) => [row.entityId, row.sourceId, row.actionTargetId]));
  const missing = [...ids].filter((id) => !service.world.entities[id]);
  let custody: Map<string, { custodianId?: string } | null> | undefined;
  if (missing.length) {
    service.assertScope(scope, 'create');
    service.assertScope(scope, 'inspect');
    if (!service.store.records)
      throw new AuthoringRequestError('Historical subject custody is unavailable.', 'unavailable');
    custody = await service.store.records.readRetainedObjectCustody(service.world.id, missing);
  }
  const hasCanonicalAbsence = missing.some((id) => custody?.get(id) === null);
  const assertCurrent = () => {
    // Retain exact custody facts only within this call. Current permissions and live
    // ancestry are fresh; membership/restore changes invalidate absence preparation.
    if (
      timeline !== service.timelineId ||
      (hasCanonicalAbsence && objectRevision !== service.world.objectState.revision)
    )
      throw new AuthoringRequestError(
        'The world changed while checking removal access. Read the saved result again.',
        'stale',
      );
    service.assertScope(scope, 'create');
    service.assertScope(scope, 'inspect');
    const permission = new Map<string, boolean>();
    const permitted = (id: string) => {
      const prior = permission.get(id);
      if (prior !== undefined) return prior;
      const current = mayDiscloseSubject(
        service.world,
        id,
        (actorId) => service.mayInspectPrivate(actorId, scope),
        service.world.entities[id]?.retirement ?? custody?.get(id),
      );
      permission.set(id, current);
      return current;
    };
    if (
      rows.some(
        (row) =>
          !permitted(row.entityId) || !permitted(row.sourceId) || !permitted(row.actionTargetId),
      )
    )
      throw new AuthoringRequestError(
        'The complete removal cannot be reviewed under current access. Protected details are unavailable.',
        'forbidden',
      );
  };
  assertCurrent();
  return assertCurrent;
}
/** Pure retained detail construction. Callers must await assertRemovalDisclosure
 * before saving or returning it; preparation itself grants no access. */
export function retainStatusRemoval(
  service: WorldService,
  analysis: StatusEffectRemovalAnalysis,
  selectionEditable: boolean,
): RetainedStatusRemoval {
  const instances = analysis.instances.map(
    ({
      entityId,
      entityLabel,
      definitionId,
      definitionLabel,
      recordId,
      episode,
      active,
      sourceId,
      actionTargetId,
      disposition,
      action,
    }) => ({
      entityId,
      entityLabel,
      definitionId,
      definitionLabel,
      recordId,
      episode,
      active,
      sourceId,
      actionTargetId,
      disposition,
      ...(action ? { action } : {}),
    }),
  );
  const labels = new Map(service.world.statusEffectPolicy.definitions.map((d) => [d.id, d.label]));
  const rows = {
    definitions: analysis.requiredDefinitions.map((definition) => ({
      ...definition,
      reason: {
        ...definition.reason,
        ...(definition.reason.viaDefinitionId
          ? {
              viaDefinitionLabel:
                labels.get(definition.reason.viaDefinitionId) ?? definition.reason.viaDefinitionId,
            }
          : {}),
        witnessLabels: definition.reason.witness.map((id) => labels.get(id) ?? id),
      },
    })),
    optional: analysis.optionalDefinitions.map((definition) => ({
      ...definition,
      referencedByLabels: definition.referencedBy.map((id) => labels.get(id) ?? id),
    })),
    instances,
    blockers: [
      ...new Map(
        analysis.blockers.map((blocker) => [
          fingerprint([
            blocker.kind,
            blocker.definitionId,
            blocker.sourcePath,
            blocker.kind === 'contribution-pin' || blocker.kind === 'history-unavailable'
              ? null
              : blocker.message,
          ]),
          blocker,
        ]),
      ).values(),
    ].map(({ kind, definitionId, sourcePath, message }) => ({
      kind,
      ...(definitionId ? { definitionId } : {}),
      ...(sourcePath ? { sourcePath } : {}),
      message:
        kind === 'contribution-pin'
          ? 'Retained independent condition history requires this exact definition.'
          : message,
    })),
  };
  const summary: WorldStatusRemovalSummary = {
    status: analysis.status,
    rootIds: analysis.rootIds,
    optionalIds: analysis.optionalIds,
    totals: {
      definitions: rows.definitions.length,
      optional: rows.optional.length,
      instances: instances.length,
      activities: instances.filter((r) => r.action).length,
      blockers: rows.blockers.length,
    },
    binding: fingerprint([analysis.binding, rows]),
    selectionEditable,
  };
  const retained = { summary, ...rows };
  if (Buffer.byteLength(JSON.stringify(retained)) > REMOVAL_PLAN_BYTES)
    throw new AuthoringRequestError(REMOVAL_CAPACITY_MESSAGE, 'capacity');
  return retained;
}
