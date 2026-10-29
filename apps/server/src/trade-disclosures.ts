import type { KnownTradeLot } from '@open-legend/domain';
import type { TradeDisclosuresPage } from '@open-legend/protocol';
import { z } from 'zod';
import { scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './history-cursor-error.js';
import { sealCursor, openCursor } from './scoped-cursor.js';
import { searchTerms, matchesSearch } from './text-search.js';
import { digest } from './store.js';
import { disclosedView } from './handover-actions.js';
import type { WorldService } from './world-service.js';
import { resolveContactTarget, ContactReferenceError } from './public-contact-references.js';

const cursorSchema = z
  .object({
    fence: z.string(),
    before: z
      .object({
        position: z.number().int().nonnegative().safe(),
        ordinal: z.number().int().positive().safe(),
      })
      .strict(),
    offset: z.number().int().nonnegative().safe(),
  })
  .strict();
// Transport/read bounds keep the chooser compact and each search finite.
// They grant no trade permission and do not reuse authored suggestion tuning.
// docs/limits/interface.md#td01--remembered-trade-item-pages
const DISCLOSURE_READ = { pageRows: 6, scanRows: 200 } as const;

async function prepare(service: WorldService, actorId: string) {
  await service.flushMemorySources(actorId);
  const head = await service.store.records!.head();
  if (!head || head.worldId !== service.world.id)
    throw new HistoryCursorError('The remembered trade search changed. Refresh it.');
  return {
    scope: { worldId: service.world.id, actorId, generation: head.generation },
    generation: service.generation,
    historyEpoch: service.historyEpoch,
  };
}
function assertPrepared(service: WorldService, prepared: Awaited<ReturnType<typeof prepare>>) {
  if (
    prepared.scope.worldId !== service.world.id ||
    prepared.generation !== service.generation ||
    prepared.historyEpoch !== service.historyEpoch
  )
    throw new HistoryCursorError('Remembered trade items changed. Refresh this search.');
}

/** Canonical personal evidence remains readable after hot awareness compaction.
 * Positions continue through new appends; correction/forgetting invalidates the
 * existing private evidence epoch, just as for Known places. No live stock joins. */
export async function tradeDisclosures(
  service: WorldService,
  scope: RequestScope,
  request: { personId: string; query?: string; cursor?: string },
): Promise<TradeDisclosuresPage> {
  service.assertScope(scope);
  const personId = resolveContactTarget(service.world, scope, request.personId);
  const prepared = await prepare(service, scope.actorId);
  service.assertScope(scope);
  const terms = searchTerms(request.query);
  const fence = digest([
    scopeKey(scope),
    request.personId,
    prepared.scope.generation,
    prepared.historyEpoch,
    terms,
  ]);
  const cursor = request.cursor ? cursorSchema.parse(openCursor(request.cursor)) : undefined;
  if (cursor && cursor.fence !== fence)
    throw new HistoryCursorError('Remembered trade items changed. Refresh this search.');
  const page = await service.store.memories!.tradeDisclosurePage(prepared.scope, personId, {
    ...(cursor ? { before: cursor.before } : {}),
    limit: DISCLOSURE_READ.scanRows,
  });
  service.assertScope(scope);
  assertPrepared(service, prepared);
  if (resolveContactTarget(service.world, scope, request.personId) !== personId)
    throw new ContactReferenceError();
  const items: TradeDisclosuresPage['items'] = [];
  let examined = 0;
  let before = cursor?.before;
  for (const entry of page.entries) {
    examined++;
    before = entry.position;
    if (entry.lot && (!terms || matchesSearch(terms, `${entry.lot.name} ${entry.lot.description}`)))
      items.push(disclosedView(service.world, entry.lot, (cursor?.offset ?? 0) + examined - 1));
    if (items.length === DISCLOSURE_READ.pageRows) break;
  }
  const more = examined < page.entries.length || page.more;
  return {
    ok: true,
    items,
    ...(more && before
      ? { next: sealCursor({ fence, before, offset: (cursor?.offset ?? 0) + examined }) }
      : {}),
    scanLimited: more && examined >= DISCLOSURE_READ.scanRows,
  };
}

/** Embodied exact admission shares the canonical reader used by paging. A browser
 * supplies item intentions only; the server prepares the retained disclosure. */
export async function retainedTradeDisclosureReferences(
  service: WorldService,
  scope: RequestScope,
  personId: string,
  itemIds: readonly string[],
): Promise<ReadonlyMap<string, KnownTradeLot>> {
  service.assertScope(scope);
  const found = await retainedNativeTradeDisclosureReferences(
    service,
    scope.actorId,
    personId,
    itemIds,
  );
  service.assertScope(scope);
  return found;
}

/** Trusted native preparation keeps its actual actor, without impersonating a
 * browser principal or falling through to the local player's authority. */
export async function retainedNativeTradeDisclosureReferences(
  service: WorldService,
  actorId: string,
  personId: string,
  itemIds: readonly string[],
): Promise<ReadonlyMap<string, KnownTradeLot>> {
  const prepared = await prepare(service, actorId);
  const found = await service.store.memories!.tradeDisclosureReferences(
    prepared.scope,
    personId,
    itemIds,
  );
  assertPrepared(service, prepared);
  return found;
}
