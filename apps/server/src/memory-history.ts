import type { MemoryRecord } from '@open-legend/domain';
import type { MemoryEntryView, MemoryHistoryPage } from '@open-legend/protocol';
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

/** The single presentation of a memory for its owner; the live snapshot and history pages
 * must render the same text. */
export function memoryEntryView(memory: MemoryRecord): MemoryEntryView {
  return { id: memory.id, text: `[${memory.source}] ${memory.summary}`, time: memory.at };
}

/** Paged, optionally searched memory history for the owner or an inspectable NPC. Only
 * eligible sources are read: forgotten sources, inferred duplicates and summaries built on
 * forgotten or corrected sources are excluded in SQL. A corrected memory stays visible as
 * witnessed history beside its correction. A search matches only the displayed memory text. */
export async function memoryHistory(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  request: { cursor?: string; query?: string; thoughts?: boolean },
): Promise<MemoryHistoryPage> {
  const permitted = () =>
    service.mayInspectPrivate(actorId, scope) && !!service.world.entities[actorId]?.actor;
  if (!permitted()) throw new AuthorityError('forbidden');
  const terms = searchTerms(request.query);
  const memories = service.store.memories,
    records = service.store.records;
  if (!memories || !records) throw new Error('Memory history requires the history database.');
  await service.flushMemorySources(actorId);
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
  const result = await memories.browse(
    { worldId: world.id, actorId, generation: head.generation },
    { before, terms, thoughts: !!request.thoughts, limit: MEMORY_PAGE, scan: SEARCH_SCAN_ROWS },
  );
  // Forgetting, correction, restore or lost access during the read invalidates the page.
  if (
    !permitted() ||
    generation !== service.generation ||
    world.experience?.forgotten[actorId] !== service.world.experience?.forgotten[actorId] ||
    world.experience?.corrections?.[actorId] !== service.world.experience?.corrections?.[actorId]
  )
    throw new HistoryCursorError('Memories changed. Browse or search again.');
  return {
    ok: true,
    worldId: world.id,
    generation,
    entries: result.entries.map((entry) => memoryEntryView(entry.memory)).reverse(),
    next: result.resume
      ? Buffer.from(JSON.stringify({ v: 1, fence, ...result.resume })).toString('base64url')
      : null,
    scanLimited: result.scanLimited,
  };
}
