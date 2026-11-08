import type { ExperiencePrivacy } from '@open-legend/domain';
import type { HistoryProjection } from './history-preparation.js';
import type { PreparedMemorySources } from './memory-repository.js';
import type { RecordChanges } from './world-records.js';

/** One immutable accepted save cut, prepared by its semantic owner. This is a
 * transport input to the existing writer, never a second writable world.
 * docs/projects/native-simulation-core-tech-design.md#62-direct-changed-record-saving */
export interface CommitInputs {
  readonly worldId: string;
  readonly initial: boolean;
  readonly restore: boolean;
  readonly changes: RecordChanges;
  readonly history: HistoryProjection;
  readonly sources: PreparedMemorySources;
  readonly outcomes: readonly {
    id: string;
    outcome: { ok: boolean; message: string; code: string; recipeId?: string };
  }[];
  readonly privacy: ExperiencePrivacy;
  readonly privacyChanged: boolean;
  readonly invalidations: Readonly<Record<string, readonly string[]>>;
  readonly hotEventIds: readonly string[];
  readonly collectReceivedValues: boolean;
}
