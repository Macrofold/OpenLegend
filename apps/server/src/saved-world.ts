import type { AssetRevisionReference } from '@open-legend/assets';
import type { WorldState } from '@open-legend/domain';

/** Current canonical world input shared by offline opening/export and storage. */
export interface SavedWorld {
  world: WorldState;
  /** Exact installed presentation content. Absent means bootstrap-only depiction. */
  presentationRelease?: AssetRevisionReference;
  presentationReleaseRevision?: number;
  speed: number;
  manuallyPaused: boolean;
  actorMilestones?: Record<string, Record<string, boolean>>;
}
