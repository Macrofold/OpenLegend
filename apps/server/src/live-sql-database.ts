import type { CheckpointSource } from './checkpoint-worker-client.js';
import type { LiveReadCuts, LiveReadCutsProvider, MetadataBaseline } from './live-read-overlay.js';
import type { SqlDatabase } from './sql-database.js';

/** Optional hooks used by the current TypeScript game hosts. The durable SQL
 * contract used by offline storage callers has no live cut or worker types. */
export interface LiveSqlDatabase extends SqlDatabase {
  checkpointSource?: CheckpointSource;
  setLiveReadCuts?(provider: LiveReadCutsProvider): void;
  /** A tentative SQL read projection inside an actual write transaction. All
   * rows and callback effects are rolled back before returning its result. */
  rollbackView?<T>(operation: () => Promise<T>): Promise<T>;
  readForActor?<T>(worldId: string, actorId: string, operation: () => Promise<T>): Promise<T>;
  readAtCut?<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T>;
  /** Selected canonical metadata plus explicit pending merge, in the same
   * validated snapshot. Ordinary body/source readers keep the live overlay. */
  readMetadataBaseline?<T>(
    actorIds: readonly string[],
    operation: (baseline: MetadataBaseline) => Promise<T>,
  ): Promise<T>;
}
