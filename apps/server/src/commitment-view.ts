import {
  COMMITMENT_ADMISSION_LIMIT,
  observerDescription,
  openObligations,
  unresolvedCommitmentCount,
  type MemoryRecord,
  type WorldState,
} from '@open-legend/domain';
import type { OwnPromise, OwnPromisePage } from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './perceived-events.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

/** Past promises per page (docs/limits/base-world.md#bw04). */
const PAST_PAGE = 20;
const cursorSchema = z
  .object({ v: z.literal(1), fence: z.string(), at: z.number(), id: z.string() })
  .strict();

/** Bundled-world wording for the one native completion rule (gathering an item) and the
 * honest fallbacks. docs/worlds/base/social.md#spoken-promises */
function promiseView(world: WorldState, actorId: string, memory: MemoryRecord): OwnPromise {
  const obligation = memory.obligation!;
  const completion = obligation.completion;
  const gathered =
    completion?.eventType === 'gathered'
      ? completion.definitionId
        ? (world.itemDefinitions[completion.definitionId]?.name ?? 'an item no longer defined')
        : 'anything'
      : undefined;
  const start = memory.summary.search(/I promise to/i);
  const recipientId = memory.entityIds.find((id) => id !== actorId);
  const status =
    obligation.status === 'fulfilled'
      ? 'kept'
      : obligation.status === 'active'
        ? 'open'
        : obligation.status;
  return {
    id: memory.id,
    revision: obligation.revision,
    words: start >= 0 ? memory.summary.slice(start) : memory.summary,
    recipient: recipientId ? observerDescription(world, actorId, recipientId) : null,
    madeAt: memory.at,
    status,
    terms:
      gathered !== undefined
        ? `Kept automatically when you gather ${gathered}.`
        : completion
          ? 'Checked automatically by a completion rule this list cannot describe.'
          : status === 'open' || status === 'overdue'
            ? 'This world does not check this promise automatically, so it stays open.'
            : 'This world does not check this promise automatically.',
    dueAt: obligation.dueAt ?? null,
    keptAt: obligation.fulfilledAt ?? null,
    evidence:
      status === 'kept'
        ? gathered !== undefined
          ? `You gathered ${gathered}.`
          : 'An action of yours matched its completion rule.'
        : status === 'cancelled'
          ? 'Cancelled. This does not mean anyone else agreed to release you.'
          : status === 'overdue'
            ? completion
              ? 'The deadline passed before the checked action happened.'
              : 'The deadline passed.'
            : null,
  };
}

/** The requester's own promises. There is no actor parameter: another character's
 * obligations can never be named, and open ones come from resident world state (always
 * resident while unresolved), past ones from storage pages. The HTTP dispatcher runs this
 * inside the mutation lane, so no tick changes the world between the flush and the reads.
 * docs/projects/readable-promises-tech-design.md#3-algorithm-appsserversrccommitment-viewts */
export async function commitmentPage(
  service: WorldService,
  scope: RequestScope,
  request: { cursor?: string },
): Promise<OwnPromisePage> {
  service.assertScope(scope);
  const actorId = scope.actorId;
  const permitted = () =>
    service.mayInspectPrivate(actorId, scope) && !!service.world.entities[actorId]?.actor;
  if (!permitted()) throw new AuthorityError('forbidden');
  const memories = service.store.memories,
    records = service.store.records;
  await service.flushMemorySources(actorId);
  const head = memories && records ? await records.head() : undefined;
  const world = service.world,
    generation = service.generation;
  const fence = digest([scopeKey(scope), head?.generation ?? generation, actorId]);
  let before: { at: number; id: string } | undefined;
  if (request.cursor) {
    let cursor: z.infer<typeof cursorSchema>;
    try {
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(request.cursor, 'base64url').toString()));
    } catch {
      throw new HistoryCursorError('This promise page expired. Reload the list.');
    }
    if (cursor.fence !== fence) throw new HistoryCursorError('Promises changed. Reload the list.');
    before = { at: cursor.at, id: cursor.id };
  }
  const open = before ? [] : openObligations(world, actorId);
  let past: MemoryRecord[];
  let next: { at: number; id: string } | undefined;
  if (memories && head) {
    const page = await memories.resolvedCommitments(
      { worldId: world.id, actorId, generation: head.generation },
      before,
      PAST_PAGE,
    );
    // Defensive: a promise listed as open is never also listed as past.
    const openIds = new Set(open.map((memory) => memory.id));
    past = page.entries
      .map((entry) => entry.memory)
      .filter((memory) => memory.obligation && !openIds.has(memory.id));
    next = page.next;
  } else {
    // Without history storage only resident resolved promises are known; say so.
    const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
    past = (world.memories[actorId] ?? [])
      .filter((memory) => memory.obligation && memory.resolved && !forgotten.has(memory.id))
      .sort((a, b) => b.at - a.at);
  }
  if (!permitted() || generation !== service.generation)
    throw new HistoryCursorError('Promises changed. Reload the list.');
  return {
    ok: true,
    worldId: world.id,
    generation,
    open: open.sort((a, b) => b.at - a.at).map((memory) => promiseView(world, actorId, memory)),
    openLimit: COMMITMENT_ADMISSION_LIMIT,
    counted: unresolvedCommitmentCount(world, actorId),
    past: past.map((memory) => promiseView(world, actorId, memory)),
    next: next ? Buffer.from(JSON.stringify({ v: 1, fence, ...next })).toString('base64url') : null,
    partial: !memories || !head,
  };
}
