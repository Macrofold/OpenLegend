import {
  entityGet,
  selectedPromisePresentation,
  selectedCommitmentLimit,
  observerDescription,
  recognizesSubject,
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
import { communicationReference } from './public-contact-references.js';
import type { WorldService } from './world-service.js';

/** Past promises per page (docs/limits/base-world.md#bw04). */
const PAST_PAGE = 20;
const cursorSchema = z
  .object({ v: z.literal(1), fence: z.string(), at: z.number(), id: z.string() })
  .strict();

function promiseView(world: WorldState, scope: RequestScope, memory: MemoryRecord): OwnPromise {
  const actorId = scope.actorId;
  const obligation = memory.obligation!;
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
    ...selectedPromisePresentation(world, memory.summary, obligation),
    // An internal historical identity does not identify a currently unrecognized
    // body. Keep the promise readable without granting that person-window join.
    recipientId:
      recipientId && recognizesSubject(world, actorId, recipientId)
        ? communicationReference(scope, { id: recipientId })
        : null,
    recipient: recipientId ? observerDescription(world, actorId, recipientId, 'definite') : null,
    madeAt: memory.at,
    status,
    dueAt: obligation.dueAt ?? null,
    keptAt: obligation.fulfilledAt ?? null,
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
    service.mayInspectPrivate(actorId, scope) &&
    !!entityGet(service.world.entities, actorId)?.actor;
  if (!permitted()) throw new AuthorityError('forbidden');
  const memories = service.store.memories,
    records = service.store.records;
  await service.ready;
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
    open: open.sort((a, b) => b.at - a.at).map((memory) => promiseView(world, scope, memory)),
    openLimit: selectedCommitmentLimit(world),
    counted: unresolvedCommitmentCount(world, actorId),
    past: past.map((memory) => promiseView(world, scope, memory)),
    next: next ? Buffer.from(JSON.stringify({ v: 1, fence, ...next })).toString('base64url') : null,
    partial: !memories || !head,
  };
}
