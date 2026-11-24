import {
  assertGameSchema,
  initializeGameSchema,
  markGameSchema,
} from '../apps/server/src/game-storage-schema.js';
import { HistoryWriter } from '../apps/server/src/history-writer.js';
import {
  captureHistoryProjection,
  prepareHistory,
} from '../apps/server/src/history-preparation.js';
import { IntegrationValues } from '../apps/server/src/integration-values.js';
import { MemoryWriter } from '../apps/server/src/memory-writer.js';
import { privacyLedgerKey, worldPrivacy } from '../apps/server/src/privacy-ledger.js';
import { ReceivedValueOwnership } from '../apps/server/src/received-value-ownership.js';
import { SqlWriteBatch } from '../apps/server/src/sql-rows.js';
import type { SavedWorld } from '../apps/server/src/saved-world.js';
import type { SqlDatabase } from '../apps/server/src/sql-database.js';
import {
  writeCanonicalWorldRows,
  writeHistoryProjection,
} from '../apps/server/src/world-record-publication.js';
import { materializeTemporalChanges, WorldRecords } from '../apps/server/src/world-records.js';

/** Seed only the caller-owned, disposable build database with the approved
 * paused opening. Preserve the canonical first-save row and history order.
 * The real destination still validates and transactionally installs the package. */
export async function writeOpeningRecords(db: SqlDatabase, opening: SavedWorld): Promise<void> {
  const world = opening.world;
  if (!world.paused || !opening.manuallyPaused || world.simTime !== 0 || !Object.isFrozen(world))
    throw new Error('Build storage requires the prepared fresh paused world.');

  const records = new WorldRecords(db);
  const history = new HistoryWriter(db);
  const memories = new MemoryWriter(db);
  const receivedOwnership = new ReceivedValueOwnership(db);
  const integration = new IntegrationValues(db);
  await db.transaction(async () => {
    await assertGameSchema(db);
    await initializeGameSchema(db);
    if (await records.head()) throw new Error('Opening build storage is occupied.');
    await markGameSchema(db);

    const worldId = world.id;
    const changes = materializeTemporalChanges(
      records.prepare(undefined, opening),
      world,
      undefined,
    );
    memories.configureWorld(world);
    const sources = memories.prepareSources(worldId, changes, memories.captureAllowance(worldId));
    const projection = captureHistoryProjection(
      undefined,
      world,
      prepareHistory(undefined, world),
      false,
      changes,
    );
    const revision = await records.advance(worldId, 0);
    if (world.experience?.forgotten !== undefined || world.experience?.corrections !== undefined)
      await integration.put(privacyLedgerKey(worldId), worldPrivacy(world));
    const batch = new SqlWriteBatch(db);
    await writeHistoryProjection(
      history,
      integration,
      { worldId, changes, history: projection },
      batch,
    );
    await writeCanonicalWorldRows(
      { records, history, memories, receivedOwnership },
      { worldId, changes, sources, initial: true, restore: false, hotEventIds: [] },
      revision,
      batch,
    );
  });
}
