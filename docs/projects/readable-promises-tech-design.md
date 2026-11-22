# Readable promises — technical design

| Status      | Current progress                                                                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Rust serves the private list and exact gathering outcomes. The archived-body read still needs verification after a real residency release. | 2026-11-22   |

**Status:** approved read-only first slice of [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management). [Feature specification](readable-promises-feature-spec.md) owns behavior. Delivered under the [player clarity plan](completed/player-clarity-ui.md).

The [recorded Journal journeys](../verification/player-clarity-ui.md#bw17--read-only-promises) cover the original interface and the stand-alone Rust path. Broader amendment and negotiation remain outside this project's scope.

## 1. Owners and existing contracts

- **Obligation state:** [commitments.ts](../../packages/domain/src/commitments.ts) records an `Obligation` inside a `MemoryRecord` of kind `commitment` (`revision`, `status`, `dueAt`, `completion {eventType, targetId?, definitionId?}`, `evidenceId`, `fulfilledBy`, `fulfilledAt`). The experience owner is the only writer. Recognition, the 16-record admission limit and completion matching are unchanged.
- **Residency:** unresolved obligations always stay in `world.memories`. Resolved ones can leave resident memory after the raw-history window but remain in PostgreSQL `mind_memories` and the derived `recall_sources` index (`memory_kind='commitment'`, `required=1` while unresolved, partial index `recall_commitments`).
- **Existing surfaces:** `POST /api/commitment` amends through Source or Rust with the current player control and exact obligation revision. The read-only panel does not call it. Creator mind inspection keeps its own summary.

## 2. Read contract

`POST /api/commitments` inside the authorized dispatcher with body `{ cursor?: string ≤ 2048 }` (strict). No actor parameter: the route always reads `scope.actorId`, so another character cannot be named. Default `play` capability; not a controlling route.

Response `OwnPromisePage`:

```ts
interface OwnPromise {
  id: string; // the owner's own record identity, for a later amendment slice
  revision: number;
  words: string; // the owner's spoken words
  recipient: string | null; // observer-scoped label
  recipientId: string | null; // scoped person reference only when recognized
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

## 3. Algorithm

The open list contains the owner's visible active and overdue obligations on the first page. The separate count includes every record that blocks admission, including forgotten records and those without a spoken obligation. Past pages read the same actor's eligible resolved records in descending `(at, id)` order, with one extra row to detect continuation. The server uses observer-scoped names and gives a person reference only when the owner recognizes the recipient.

[Source](../../apps/server/src/commitment-view.ts#commitmentpage) uses the scoped memory repository under its HTTP mutation lane. The [Rust route](../../native/game-server/src/player_http/promises.rs#list) captures the accepted actor, current privacy state and original durable revision. It pins the visible open records and the newest eligible resolved records for the requested page. The past page uses the existing indexed PostgreSQL read on a separate request-owned connection, so waiting for history does not block gameplay receipts. SQL supplies bodies the pinned page lacks. Rust combines that result with accepted completions still waiting for their ordinary save. It checks the original scope, privacy and selected source revisions again during synchronous response encoding. An unavailable SQL read returns the bounded resident page marked partial. A changed durable revision can require a fresh read. The continuation binds the original tab, actor, world generation and privacy revision.

Recognition, gathering interpretation and the limit come from the [bundled promise rules](../../packages/domain/src/worlds/base/promises.ts). The Rust installed rules and the Source projection use the same [terms and evidence wording](../../packages/domain/src/worlds/base/config/promise-presentation.json). An unfamiliar completion rule receives a generic explanation.

## 4. Privacy and authority

- Owner-only: no actor input, `mayInspectPrivate` rechecked after asynchronous reads.
- Recipient via `observerDescription`, never `entity.name`.
- Evidence is always the owner's own event (completion matching requires `actorId` equality); it is described, not linked by raw ID.
- Raw `eventType` strings and event IDs never leave the server. Forgotten records are excluded both resident (`experience.forgotten`) and stored (`eligible`).
- The list is not part of `GameView`; it is fetched only while the Journal section is open.

## 5. Performance and bounds

- Rust scans the selected actor's resident memories once per request. The retained resolved set and the PostgreSQL `recall_commitments` selection each hold at most 21 records. The lookup, including transfer admission, stays in one reversible read snapshot. The response keeps at most 20 past rows, including on the partial fallback.
- Source still scans resident memory separately for display and admission. Its partial fallback returns the resident resolved list. BW17/PF08 track shared preparation and bounding that fallback while Source remains active.
- Client fetches on mount and on explicit Refresh; no polling.

Page size (20) and the reuse of the admission limit are recorded in [BW04](../limits/base-world.md#bw04).

## 6. Client

`apps/client/src/ui/promises.tsx`, mounted in the Journal between the beginning checklist and “Your story”, keyed by the caption/world-events scope key so a scope, timeline or history-epoch change remounts it. Design-system `Section`, `Button`, `Tag` and `EventTime`; status as text; errors in `role="alert"`, loading in `role="status"`. Single column, wrapping long words for narrow widths.

## 7. Extension seams and deferred work

- Future controls after D64 can reuse `id` and `revision`. The existing amendment API supports only the owner's deadline, permitted completion rule and unilateral cancellation. The native replacement preserves the original words and evidence, and projects the changed status in the ordinary PostgreSQL transaction. A saved cancellation does not establish agreement from a recipient.
- Cancellation time and overdue history are not recorded by the domain; the view does not invent them.

## 8. Verification

The [Rust and two-account verification](../verification/player-clarity-ui.md#promises-on-the-stand-alone-rust-server) covers exact text, real gathering, paging, permissions, held history and restart. The older [Source check](../verification/player-clarity-ui.md#bw17--read-only-promises) also covers overdue, cancellation and the admission cap. The archived-body read needs a promise released from the live resident set through its normal owner.

## Maintained records

- Implementation: [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management).
- Limits and constraints: [base-world BW04](../limits/base-world.md#bw04).
- Related contract/design: [feature specification](readable-promises-feature-spec.md), [player clarity plan](completed/player-clarity-ui.md).
