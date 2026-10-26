import { createHash } from 'node:crypto';
import type { SqlDatabase, SavedWorld } from './store.js';
import type { JournalApplication } from './world-journal.js';
import { decodeJournalTransition, type JournalTransition } from './world-journal-data.js';
import { WorldRecords, type RecordChanges } from './world-records.js';
import { MemoryRepository, type PreparedMemorySources } from './memory-repository.js';
import { HistoryAppendWriter, type AppendHistoryInput } from './history-append.js';
import { personalEventEvidence } from './personal-accounts.js';
import { SqlWriteBatch } from './sql-rows.js';

export const APPLICATION_REVISIONS = 8;

export interface JournalRange {
  worldId: string;
  generation: string;
  first: number;
  through: number;
}
export interface JournalApplied extends JournalRange {
  bytes: number;
}
export interface RetainedJournal<Preparation> {
  checksum: string;
  transition: JournalTransition;
  preparation: Preparation;
  bytes: number;
}
/** Transient changed-data preparation, never a world, callback or recovery authority.
 * Send this and its aliased source/record graph in ONE structured-clone message. */
export interface JournalTables {
  changes: RecordChanges;
  history: AppendHistoryInput[];
  sources: PreparedMemorySources;
}

/** One application transaction owner, shared by online worker and local recovery. */
export async function applyJournalRange<Preparation>(
  db: SqlDatabase,
  range: JournalRange,
  retained: ReadonlyMap<number, RetainedJournal<Preparation>>,
  apply: (entry: JournalApplication, preparation?: Preparation) => Promise<void>,
): Promise<JournalApplied> {
  const { worldId, generation, first, through } = range;
  if (
    !db.materializationTransaction ||
    !Number.isSafeInteger(first) ||
    first < 1 ||
    !Number.isSafeInteger(through) ||
    through < first ||
    through - first >= APPLICATION_REVISIONS
  )
    throw new Error('Invalid owned journal application range.');
  return db.materializationTransaction(first, async (useRevision) => {
    const rows = await db
      .prepare(
        `SELECT h.world_id,h.generation,h.applied_revision,
      j.revision,j.predecessor,j.payload,j.checksum,j.bytes
      FROM world_head h JOIN world_change_journal j ON j.world_id=h.world_id AND j.generation=h.generation
      WHERE h.id=1 AND j.revision BETWEEN ? AND ? ORDER BY j.revision`,
      )
      .all(first, through);
    if (rows.length !== through - first + 1)
      throw new Error('World journal predecessor/generation is missing.');
    const expectedBytes = new Map<number, number>();
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!,
        revision = first + index;
      if (
        Number(row['applied_revision']) !== first - 1 ||
        Number(row['revision']) !== revision ||
        Number(row['predecessor']) !== revision - 1 ||
        row['world_id'] !== worldId ||
        row['generation'] !== generation
      )
        throw new Error('World journal predecessor/generation is missing.');
      const checksum = String(row['checksum']),
        online = retained.get(revision);
      if (online && (online.checksum !== checksum || online.bytes !== Number(row['bytes'])))
        throw new Error('World journal preparation changed.');
      const payload = String(row['payload']);
      if (
        Buffer.byteLength(payload) !== Number(row['bytes']) ||
        createHash('sha256').update(payload).digest('hex') !== checksum
      )
        throw new Error('World journal payload changed.');
      const transition = online?.transition ?? decodeJournalTransition(payload, checksum);
      useRevision(revision);
      await apply({ worldId, generation, revision, transition }, online?.preparation);
      expectedBytes.set(revision, Number(row['bytes']));
    }
    const removed = await db
      .prepare(
        `WITH applied AS (
      UPDATE world_head SET applied_revision=? WHERE id=1 AND world_id=? AND generation=?
        AND applied_revision=? AND revision>=? RETURNING world_id,generation
      ) DELETE FROM world_change_journal j USING applied h
        WHERE j.world_id=h.world_id AND j.generation=h.generation AND j.revision BETWEEN ? AND ?
        RETURNING j.revision,j.bytes`,
      )
      .all(through, worldId, generation, first - 1, through, first, through);
    if (
      removed.length !== rows.length ||
      removed.some((row) => expectedBytes.get(Number(row['revision'])) !== Number(row['bytes']))
    )
      throw new Error('World journal application fence changed.');
    return { ...range, bytes: [...expectedBytes.values()].reduce((sum, bytes) => sum + bytes, 0) };
  });
}

/** Canonical/source orchestration shared with synchronous saving; each repository
 * remains its own mutation owner, including lexical byte admission and privacy. */
export async function applyRecordSources(
  records: WorldRecords,
  memories: MemoryRepository,
  worldId: string,
  revision: number,
  changes: RecordChanges,
  writes: SqlWriteBatch,
  archive: boolean,
  prepared?: PreparedMemorySources,
  state?: SavedWorld,
): Promise<void> {
  if (state) memories.configureWorld(state.world);
  else if (prepared) memories.configureAllowance(prepared.allowance);
  if (!prepared && state) prepared = memories.prepareSources(worldId, changes, state.world);
  const affected = await memories.project(worldId, changes, archive, writes, prepared?.versions);
  // Dependent source projection can need an original already removed by a flushed
  // canonical batch. Install its prepared, charged closure inside this transaction first.
  if (prepared?.versions)
    await memories.applySourceVersionPlan(worldId, revision, prepared.versions);
  await records.write(worldId, revision, changes, writes);
  await memories.writeSources(worldId, changes, affected, prepared);
  if (records.needsHotPrune) {
    if (!state) throw new Error('Hot history pruning requires its complete owned world.');
    await records.pruneActiveEvents(state);
  }
  await memories.reconcile(worldId, affected);
}

/** No initialization, optional search scheduler, jobs or gameplay live in this owner. */
export class JournalTableWriter {
  private readonly records: WorldRecords;
  private readonly memories: MemoryRepository;
  constructor(private readonly db: SqlDatabase) {
    this.records = new WorldRecords(db);
    this.memories = new MemoryRepository(db);
  }
  async apply(entry: JournalApplication, prepared?: JournalTables): Promise<void> {
    if (
      !prepared ||
      prepared.sources.worldId !== entry.worldId ||
      prepared.sources.changes !== prepared.changes
    )
      throw new Error('Journal table preparation has a different owner.');
    const writes = new SqlWriteBatch(this.db);
    const history = new HistoryAppendWriter(this.db, entry.worldId);
    for (const input of prepared.history) {
      const encoded = JSON.stringify(input.event);
      const eventRevision = createHash('sha256').update(encoded).digest('hex');
      const { position, pending } = history.event(input.event, encoded);
      if (pending) await pending;
      for (const [actor, account] of input.accounts) {
        const result = history.perspective(
          input.event,
          actor,
          account.evidence,
          account.awareness,
          position,
          eventRevision,
          account.temporal,
        );
        if (result.pending) await result.pending;
      }
    }
    await history.flush({ worldId: entry.worldId, removedEvents: 0 }, writes);
    await applyRecordSources(
      this.records,
      this.memories,
      entry.worldId,
      entry.revision,
      prepared.changes,
      writes,
      true,
      prepared.sources,
    );
  }
}
