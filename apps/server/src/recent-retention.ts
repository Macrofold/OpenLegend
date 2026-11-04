export { nextRecentRetentionAt } from './retention-deadlines.js';
import {
  advanceTemporalRecent,
  selectedPruneObserverIndividuals,
  selectedTemporalPolicy,
  updateWorld,
} from '@open-legend/domain';
import type { SavedWorld } from './store.js';
import type { PreparedMemoryRetention } from './temporal-storage.js';

/** Recent eligibility belongs to the native actor's exact charge directory.
 * Expiry advances one semantic frontier; saving and physical collection follow
 * independently, without querying or rewriting a row for every expired block. */
export function retireRecentHistory(
  state: SavedWorld,
  actorIds: readonly string[],
): PreparedMemoryRetention {
  const world = updateWorld(
    state.world,
    (draft) => {
      const policy = selectedTemporalPolicy(draft).recent;
      for (const actorId of actorIds) {
        const actor = draft.experience?.temporal?.actors[actorId];
        if (
          !actor ||
          (!actor.maintenanceDue &&
            actor.bytes <= policy.maxBytes &&
            actor.count <= policy.maxChanges &&
            (actor.nextDue === null || actor.nextDue > draft.simTime))
        )
          continue;
        const retired = advanceTemporalRecent(draft, actorId, policy);
        if (retired.releasedIndividualIds.length)
          selectedPruneObserverIndividuals(draft, actorId, {
            releasedSourceIds: [],
            candidates: retired.releasedIndividualIds,
            retireRecent: true,
          });
      }
    },
    { retainNativeValues: true },
  );
  return { state: world === state.world ? state : { ...state, world }, rows: new Map() };
}
