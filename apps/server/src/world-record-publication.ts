import type { CommitInputs } from './commit-inputs.js';
import type { HistoryWriter } from './history-writer.js';
import type { IntegrationValues } from './integration-values.js';
import type { MemoryWriter } from './memory-writer.js';
import { timed } from './performance.js';
import type { ReceivedValueOwnership } from './received-value-ownership.js';
import type { SqlWriteBatch } from './sql-rows.js';
import type { WorldRecords } from './world-records.js';

interface RecordPublicationOwners {
  readonly records: WorldRecords;
  readonly history: HistoryWriter;
  readonly memories: MemoryWriter;
  readonly receivedOwnership: ReceivedValueOwnership;
}

/** Write the already selected occurrence and perspective rows in the caller's
 * transaction before gameplay/source records that can refer to them. */
export async function writeHistoryProjection(
  history: HistoryWriter,
  integration: IntegrationValues,
  inputs: Pick<CommitInputs, 'worldId' | 'history' | 'changes'>,
  sharedWrites: SqlWriteBatch,
): Promise<void> {
  await timed('history.project', () =>
    history.project(inputs.history, sharedWrites, inputs.changes),
  );
  if (inputs.history.initial) await integration.put(`history-schema:${inputs.worldId}`, 1);
}

/** Apply prepared records inside the caller's existing transaction. Recall
 * indexing and received-value ownership follow the same dependency order for
 * ordinary saves and the isolated opening build. Operational jobs and authority
 * remain at the enclosing writer. The caller owns its shared SQL batch. */
export async function writeCanonicalWorldRows(
  owners: RecordPublicationOwners,
  inputs: Pick<
    CommitInputs,
    'worldId' | 'changes' | 'restore' | 'initial' | 'sources' | 'hotEventIds'
  >,
  revision: number,
  sharedWrites: SqlWriteBatch,
  options?: { deferSources: true },
): Promise<void> {
  const { worldId, changes, restore } = inputs;
  const sources = inputs.sources;
  owners.memories.configureAllowance(sources.allowance);
  const affected = await owners.memories.project(
    worldId,
    changes,
    !restore,
    sharedWrites,
    sources.versions,
  );
  if (sources.versions)
    await owners.memories.applySourceVersionPlan(worldId, revision, sources.versions);
  await owners.records.write(worldId, revision, changes, sharedWrites);
  await owners.history.revokeTemporalAccounts(worldId, changes);
  if (!options?.deferSources)
    await owners.memories.writeSources(worldId, changes, affected, sources);
  // A whole restore has already replaced the complete hot-record family;
  // an old cold-open prune request cannot prune the new tentative timeline.
  if (!options?.deferSources && owners.records.needsHotPrune)
    await owners.records.pruneActiveEvents(worldId, inputs.hotEventIds);
  if (options?.deferSources) return;
  await owners.memories.reconcile(worldId, affected);
  await owners.receivedOwnership.project(worldId, revision, changes, !!restore);
  if (restore || inputs.initial) await owners.memories.reuseVectors(worldId);
  else {
    const revisedSources = new Map<string, Set<string>>();
    for (const table of ['mind_memories', 'mind_awareness', 'mind_summaries'])
      for (const row of changes.writes.get(table) ?? []) {
        if (row.create) continue;
        const path = JSON.parse(row.id) as string[],
          actor = path[table === 'mind_memories' ? 2 : 3]!;
        const ids = revisedSources.get(actor) ?? new Set<string>();
        const source = JSON.parse(row.payload) as Record<string, unknown>;
        ids.add(String(source[table === 'mind_awareness' ? 'eventId' : 'id']));
        revisedSources.set(actor, ids);
      }
    if (revisedSources.size) await owners.memories.reuseVectors(worldId, revisedSources);
  }
}
