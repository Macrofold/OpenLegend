import { recentHistory } from './recent-history.js';
import { entityGet } from '@open-legend/domain';
import type { MemoryEntryView, MemoryHistoryPage } from '@open-legend/protocol';
import type { RetrievedMemory } from './memory-repository.js';
import { z } from 'zod';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './perceived-events.js';
import { digest } from './store.js';
import { SEARCH_SCAN_ROWS, searchTerms } from './text-search.js';
import type { WorldService } from './world-service.js';

/** Matches the character panel's recent-memory list; pages continue to every eligible
 * retained memory (docs/limits/memory.md#la208). */
const MEMORY_PAGE = 20;
const cursorSchema = z
  .object({
    v: z.literal(1),
    fence: z.string(),
    at: z.number(),
    id: z.string(),
    kind: z.string(),
  })
  .strict();

/** The presentation of an eligible history record for its owner or permitted inspector. */
export function memoryEntryView({ memory, sourceKind }: RetrievedMemory): MemoryEntryView {
  return {
    id: memory.id,
    sourceKind,
    text: `[${memory.kind === 'impression' ? 'remembered impression; ' : ''}${memory.source}] ${memory.summary}`,
    fidelity: memory.kind === 'impression' ? 'impression' : 'exact',
    time: memory.at,
  };
}

/** Paged, optionally searched memory history for the owner or an inspectable NPC. Only
 * eligible sources are read: forgotten sources, inferred duplicates and summaries built on
 * forgotten or corrected sources are excluded in SQL. A corrected memory stays visible as
 * witnessed history beside its correction. A search matches only the displayed memory text. */
export async function memoryHistory(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  request: { cursor?: string; query?: string; thoughts?: boolean; recent?: boolean },
): Promise<MemoryHistoryPage> {
  if (request.recent) return recentHistory(service, actorId, scope, request);
  const permitted = () =>
    service.mayInspectPrivate(actorId, scope) &&
    !!entityGet(service.world.entities, actorId)?.actor;
  if (!permitted()) throw new AuthorityError('forbidden');
  const terms = searchTerms(request.query);
  const memories = service.store.memories,
    records = service.store.records;
  if (!memories || !records) throw new Error('Memory history requires the history database.');
  await service.flushMemorySources(actorId);
  const historyEpoch = service.historyEpoch;
  const head = await records.head();
  if (!head) throw new Error('Memory history requires the history database.');
  const world = service.world,
    generation = service.generation;
  const fence = digest([
    scopeKey(scope),
    head.generation,
    actorId,
    terms ?? [],
    !!request.thoughts,
  ]);
  let before: { at: number; id: string; kind: string } | undefined;
  if (request.cursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(request.cursor, 'base64url').toString()));
    } catch {
      throw new HistoryCursorError('This memory page expired. Browse or search again.');
    }
    if (cursor.fence !== fence)
      throw new HistoryCursorError('Memories changed. Browse or search again.');
    before = { at: cursor.at, id: cursor.id, kind: cursor.kind };
  }
  const sourceOwners = (snapshot: typeof world) => [
    snapshot.memories[actorId],
    snapshot.experience?.awareness[actorId],
    snapshot.experience?.summaries[actorId],
    snapshot.experience?.temporal?.actors[actorId]?.accounts,
  ];
  const capturedOwners = sourceOwners(world),
    sourceRevision = memories.actorRevision(actorId);
  const memoryScope = { worldId: world.id, actorId, generation: head.generation };
  const assertPermitted = () => {
    if (
      !permitted() ||
      generation !== service.generation ||
      historyEpoch !== service.historyEpoch ||
      world.experience?.forgotten[actorId] !== service.world.experience?.forgotten[actorId] ||
      world.experience?.corrections?.[actorId] !== service.world.experience?.corrections?.[actorId]
    )
      throw new HistoryCursorError('Memories changed. Browse or search again.');
  };
  assertPermitted();
  const result = await memories.browse(memoryScope, {
    before,
    terms,
    thoughts: !!request.thoughts,
    limit: MEMORY_PAGE,
    scan: SEARCH_SCAN_ROWS,
  });
  assertPermitted();
  // Ordinary expiry can remove a cold row without a creator edit. Revalidate only
  // this actor's bounded selected page when its owning sources changed during SQL.
  if (
    result.entries.length &&
    (sourceRevision !== memories.actorRevision(actorId) ||
      sourceOwners(service.world).some((owner, index) => owner !== capturedOwners[index]))
  ) {
    const checkingOwners = sourceOwners(service.world),
      checkingRevision = memories.actorRevision(actorId);
    const current = await memories.current(
      memoryScope,
      result.entries.map((entry) => ({
        id: entry.memory.id,
        sourceKind: entry.sourceKind,
        revision: entry.revision,
        ...(entry.receipt ? { receipt: entry.receipt } : {}),
      })),
    );
    if (
      !current ||
      checkingRevision !== memories.actorRevision(actorId) ||
      sourceOwners(service.world).some((owner, index) => owner !== checkingOwners[index])
    )
      throw new HistoryCursorError('Memories changed. Browse or search again.');
  }
  assertPermitted();
  return {
    ok: true,
    worldId: world.id,
    generation,
    entries: result.entries.map(memoryEntryView).reverse(),
    next: result.resume
      ? Buffer.from(JSON.stringify({ v: 1, fence, ...result.resume })).toString('base64url')
      : null,
    scanLimited: result.scanLimited,
  };
}
