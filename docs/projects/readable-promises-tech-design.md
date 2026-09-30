# Readable promises — technical design

**Status:** approved read-only first slice of [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management). [Feature specification](readable-promises-feature-spec.md) owns behavior. Delivered under the [player clarity plan](player-clarity-ui.md).

## 1. Owners and existing contracts

- **Obligation state:** [commitments.ts](../../packages/domain/src/commitments.ts) records an `Obligation` inside a `MemoryRecord` of kind `commitment` (`revision`, `status`, `dueAt`, `completion {eventType, targetId?, definitionId?}`, `evidenceId`, `fulfilledBy`, `fulfilledAt`). The experience owner is the only writer. Recognition, the 16-record admission limit and completion matching are unchanged.
- **Residency:** unresolved obligations always stay in `world.memories`. Resolved ones can leave resident memory after the raw-history window but remain in PostgreSQL `mind_memories` and the derived `recall_sources` index (`memory_kind='commitment'`, `required=1` while unresolved, partial index `recall_commitments`).
- **Existing surfaces:** `POST /api/commitment` amends (unchanged, not called by this slice). God mind inspection keeps its own summary.

## 2. Read contract

`POST /api/commitments` inside the authorized dispatcher with body `{ cursor?: string ≤ 2048 }` (strict). No actor parameter: the route always reads `scope.actorId`, so another character cannot be named. Default `play` capability; not a controlling route.

Response `OwnPromisePage`:

```ts
interface OwnPromise {
  id: string; // the owner's own record identity, for a later amendment slice
  revision: number;
  words: string; // the owner's spoken words
  recipient: string | null; // observer-scoped label
  madeAt: number; // sim seconds
  status: 'open' | 'overdue' | 'kept' | 'cancelled';
  terms: string; // server-written, bundled-world wording
  dueAt: number | null;
  keptAt: number | null;
  evidence: string | null; // server-written description of the fulfilling event
}
interface OwnPromisePage {
  ok: true;
  worldId: string;
  generation: string;
  open: OwnPromise[]; // first page only; ≤ admission limit
  openLimit: number; // current admission limit (16)
  counted: number; // unresolved commitments admission counts; can exceed open.length
  past: OwnPromise[];
  next: string | null;
  partial: boolean; // true when past history could not be read from storage
}
```

## 3. Algorithm (`apps/server/src/commitment-view.ts`)

1. `assertScope(scope)`; `mayInspectPrivate(scope.actorId, scope)`.
2. Decode the optional cursor (base64url JSON `{v, fence, at, id}`); the fence digests the scope key (which includes world and actor), storage generation and actor ID. A mismatch raises `HistoryCursorError` (“Promises changed; reload the list.”).
3. `flushMemorySources(actorId)` so newly kept promises reach storage without a full unrelated save.
4. Open list (first page only): resident records with an obligation, unresolved, not forgotten, status active/overdue. Bounded by the admission limit. `counted` uses the admission rule itself (`unresolvedCommitmentCount`), so the list can say when forgotten or obligation-less commitments still fill the limit.
5. Past list: `MemoryRepository.resolvedCommitments(scope, before, 20)` reads eligible resolved commitment sources ordered by `(at DESC, id DESC)` with `LIMIT 21`, then hydrates them through the existing bounded hydration. Without history storage, resident resolved records are used and `partial` is set.
6. Recheck scope, private access and generation after the await; a change raises the cursor error. The HTTP dispatcher already holds the mutation lane for the whole request, so no tick changes the world between the flush and the reads; past entries that are also open are dropped defensively.
7. Project each record with `promiseView`, which writes terms/evidence from the binding and item definition names and the viewer's own observer labels.

The English terms are bundled-world presentation of the gathering completion rule in [spoken promises](../worlds/base/social.md#spoken-promises). The one supported rule (`gathered` with a definition) gets specific wording; any other amended rule is described generically.

## 4. Privacy and authority

- Owner-only: no actor input, `mayInspectPrivate` rechecked after asynchronous reads.
- Recipient via `observerDescription`, never `entity.name`.
- Evidence is always the owner's own event (completion matching requires `actorId` equality); it is described, not linked by raw ID.
- Raw `eventType` strings and event IDs never leave the server. Forgotten records are excluded both resident (`experience.forgotten`) and stored (`eligible`).
- The list is not part of `GameView`; it is fetched only while the Journal section is open.

## 5. Performance and bounds

- Open: ≤ 16 records from resident memory.
- Past: one indexed range read on `recall_commitments` backwards (≤ 21 rows) plus bounded hydration of ≤ 20 bodies. No scan of unrelated memories.
- `flushMemorySources` persists only when this actor's memory sources changed.
- Client fetches on mount and on explicit Refresh; no polling.

Page size (20) and the reuse of the admission limit are recorded in [BW04](../limits/base-world.md#bw04).

## 6. Client

`apps/client/src/ui/promises.tsx`, mounted in the Journal between the beginning checklist and “Your story”, keyed by the caption/world-events scope key so a scope, timeline or history-epoch change remounts it. Design-system `Section`, `Button`, `Tag` and `EventTime`; status as text; errors in `role="alert"`, loading in `role="status"`. Single column, wrapping long words for narrow widths.

## 7. Extension seams and deferred work

- Amendment/cancellation (after D64) reuses `id`/`revision` and `/api/commitment`; the read contract needs no change.
- Extracting the English parser and gathering wording into the base-world owner remains BW17 work when promise language grows.
- Cancellation time and overdue history are not recorded by the domain; the view does not invent them.

## 8. Verification

Disposable world, `AI_BUDGET_USD=0`. Promises are spoken through the native `say` command (the Talk composer only speaks natively to other humans); label this as API setup. Exercise kept, unsupported, limit, paging across resident release, reload/restart, keyboard/narrow layout and cross-actor rejection. Record results in [player clarity verification](../verification/player-clarity-ui.md).

## Maintained records

- Implementation: [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management).
- Limits and constraints: [base-world BW04](../limits/base-world.md#bw04).
- Related contract/design: [feature specification](readable-promises-feature-spec.md), [player clarity plan](player-clarity-ui.md).
