# Share database preparation and check memory search once

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All six tasks and their required focused comparisons are complete; measured benefits remain workload-specific. | 2026-10-18   |

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [performance-safeguards tracker](../../../maintainers/performance-safeguards.md) records completed implementation and its scoped evidence; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

This guide implements the read-related portion of the [technical design](../performance-safeguards-tech-design.md). Read its baseline, sequence and common verification procedure first. Task status belongs to [PSF01/PSF02](../../../maintainers/performance-safeguards.md).

## The behavior being protected

The game can acknowledge changes after putting them in a durable journal, before updating the ordinary tables used by readers. A reader must see a coherent applied world. A **read snapshot** is the database's consistent view for one transaction; another connection can continue writing without changing that view.

The journal and memory-search index are separate preparations. Having applied the saved world does not prove that its searchable words are prepared. Neither proof grants permission to read somebody's private memories.

## Source map and costs at design time

- [JournalDatabase](../../../../apps/server/src/journal-database.ts) wraps the existing adapter. `prepare` classifies a statement and each execution calls `needsFence`, which scans its table references again. Outside an existing transaction, a canonical read enters `readTransaction`.
- [WorldJournal](../../../../apps/server/src/world-journal.ts) owns committed/applied revision numbers, pending work and application failure. `writeAligned` already avoids a redundant SQL query while the primary writer transaction is held. **That optimization is implemented; do not add it again.**
- [PostgresDatabase](../../../../apps/server/src/postgres.ts) owns separate serialized reader/writer execution and transaction context. Its nested transactions reuse the existing transaction. A raw, nonlocking single `SELECT` normally needs no explicit transaction; the journal wrapper adds one when a consistency proof is needed.
- [SqlGameRepository.load](../../../../apps/server/src/store.ts) calls `WorldRecords.load`, validates the world, then reads history counts outside the world-record read transaction. Active loading uses `retainedEventCount`; complete loading uses `auditEventCount`, which itself reads both the actual and retained count.
- [LexicalProjection.snapshot](../../../../apps/server/src/lexical-projection.ts) checks `covered` once outside its final snapshot and once inside. [MemoryRepository](../../../../apps/server/src/memory-repository.ts) selects this owner only when the query actually uses lexical search. Most other multi-query memory readers already use its `snapshot` helper.

Do not broaden this into a repository rewrite. Keep current single-query operational reads narrow. Preserve already-grouped `WorldRecords` and `MemoryRepository` callers and their cache eligibility.

## PSF01: precise changes

### 1. Classify a prepared statement once

In `journal-database.ts`, separate the SQL-only decision from live execution state:

1. Replace `needsFence(sql)` with a private SQL-only helper, for example `touchesCanonicalTables(sql)`, containing the existing extraction and conservative unknown-table rule.
2. In `prepare(sql)`, retain initially unknown SQL-only classification values in the returned statement’s closure. At **each execution**, first read live `active()` and `raw.transactionActive`. If neither bypass applies, compute and retain the SQL-only decisions the first time they are needed; a cached false value is still known, not absent.
3. Required decision: if the journal is inactive, a transaction is already active, or the statement is operational-only, use the existing statement directly. Otherwise use the current read/write transaction owner.
4. `exec(sql)` first applies the same live inactive/transaction bypass; classify only if that invocation needs a fence. Do not add a process-wide SQL-string cache.
5. The operational-table set must be stable for the wrapper's lifetime: retain a private copy of the constructor's supplied set. Do not turn it into a new table registry. Unknown constructs remain conservative.

Do not expand the operational allowlist, rewrite the SQL parser, or merge the journal's `WITH` classification with the raw adapter's narrower direct-reader routing. They answer different questions. Preserve routing for currently supported reads, locking reads and writes; an unchanged regex result is not permission to bypass an owning transaction.

This avoids repeated parsing when a protected prepared statement is reused, and avoids parsing altogether for statements used only inside existing transactions or while the journal is inactive. The first eager implementation classified every prepared statement, including inside already-protected transactions where the former owner skipped it. Source review found that added work after adverse timing samples; lazy preparation corrects it without changing execution safety. Claims for a one-use protected statement still require caller measurements.

### 2. Avoid constructing an idle wait timer

Add a narrowly named method to `WorldJournal`, such as `canSkipFlush(): boolean`:

```ts
// Proposed body; retain the owner's existing failure representation.
if (this.failure) throw this.failure;
return this.applied === this.committed && !this.worker && !this.wake;
```

Its meaning is only “there is no application work or scheduled application to wait for at this instant.” It is **not** a consistent-reader guarantee. It changes no counters and clears no failure.

Pass a required callback for this method into `JournalDatabase` from the existing `SqlGameRepository` constructor. Update every constructor caller; do not introduce a default callback that claims readiness. In `wait(deadline)`:

1. Preserve the existing deadline-expired refusal.
2. If the callback says a flush can be skipped, return without allocating the timeout or `Promise.race`.
3. Otherwise run the existing bounded flush wait and timer cleanup unchanged.

Keep `synchronizeProjection` and `close` on their current real flush path. Keep `writeAligned()` **inside** the primary writer transaction and the durable header check **inside** each new read snapshot. An append can occur after the fast check; those later checks must detect it and use the existing bounded retry. Do not replace them with the new method or reset the deadline on retry.

The existing `ProjectionMoved` control flow may remain. Removing that small sentinel is not needed to realize this saving and must not turn the change into general retry middleware.

### 3. Load and audit a world in one database view

In `SqlGameRepository.load(active)`:

1. Keep `await this.ready`. Do not clear the lost-baseline flag or change accepted bookkeeping until loading and validation fully succeed.
2. Use the existing `this.db.readTransaction` with its existing transaction fallback, following `WorldRecords`' local pattern.
3. Inside that one callback, call `this.records.load(active)`. Nested adapter calls reuse the existing transaction; no extra `BEGIN` should occur.
4. If no world exists, return `null` from that callback without a history query.
5. Inside the callback, run the same active/full history audit and return its count beside the independently reconstructed canonical world. Preserve the distinction between active and complete history.
6. After the snapshot releases its reader, synchronously validate the captured world with `validateCurrentWorldState` and compare the captured count with its expected history count. Preserve existing errors. Only then synchronize the journal, clear the lost-baseline flag, and assign accepted state/revision. A successful null result uses the existing null-world handling; failure preserves the prior baseline and flag.

The records and audit count come from one database view; pure validation reads only those captured values without occupying its reader lane. No extra world copy or validation cache is needed. Do not keep this read snapshot alive across validation, profile loading, startup world mutation, provider work or external waits. Do not move `loadApplied` recovery onto this path: it intentionally reads an applied prefix inside the recovery owner's transaction.

## PSF02: one coverage check in the actual search snapshot

Change only the orchestration in `LexicalProjection.snapshot`; reuse `covered`, `committed(true)`, the existing worker and its error reporting. Do not rewrite source selection, SQL coverage semantics, indexing batches or memory hydration.

**Caller already owns a transaction:** keep the existing behavior. Check coverage in that transaction once. If uncovered, throw `LexicalPreparationError` immediately; do not wait for a writer while holding the caller's old snapshot.

**Caller does not own a transaction:** use this order:

```text
Create the existing preparation deadline once.
Repeat:
  Refuse if closed or the preparation deadline has expired.
  Open a fresh read transaction using the existing adapter.
    Check covered(scope) once.
    If uncovered, return { ready: false } without calling operation.
    Otherwise call operation once and return { ready: true, value }.
  The read transaction is now closed.
  If ready, return value, including a valid undefined/null/false value.
  Request immediate indexing through committed(true).
  Capture this.active; if closed or no worker was obtained, report unavailable.
  Wait for that captured promise with the remaining original preparation time.
  Always clear the owned timeout.
  If the worker failed or closed, report unavailable.
  Retry with a new database snapshot.
```

Use a local discriminated union for `{ ready: false } | { ready: true; value: T }`; do not use truthiness of `T`. Remove the old preflight `covered(scope)` call. The wait code stays local to this owner; no generic timeout service or polling loop is needed.

`covered` must still check the current world/generation and exact durable coverage, including the same-revision pending-key case and clock-only empty-queue case. It must not trust `pendingKnown` as proof. An index worker failure is not an empty memory result. A remembered failure must not reject an already-covered read merely because a previous unrelated drain failed; preserve the current placement of failure checks after an attempted wait.

The existing five-second preparation policy is not a guarantee that all SQL execution, queueing and hydration finish within five seconds. Preserve that scope and do not advertise a new end-to-end deadline. Do not restart the preparation timer each time newer work is discovered.

## Expected work changes

These are structural assertions for the specified no-race cases, not measured elapsed-time claims. Count setup separately.

| Case                                                        | Before                                                       | Required after                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Reuse one prepared statement N times outside transactions   | Table classification can run N times                         | One classification; N fresh active-transaction/journal decisions   |
| Ready journal, no worker or scheduled wake                  | Timeout allocated for each guarded wait                      | No wait timer; actual snapshot/header or writer check still occurs |
| Active world load plus history count, journal enabled       | Two separate outer read transactions                         | One outer read transaction                                         |
| Complete world load plus physical/retained history audit    | Three separate outer read transactions                       | One outer read transaction; both history queries still run         |
| Ready lexical search outside a transaction, journal enabled | Two coverage queries and two guarded outer read transactions | One coverage query and one guarded outer read transaction          |
| Search inside an existing transaction                       | One coverage query                                           | One coverage query, unchanged                                      |

The world-record owner's own header read supplies required load metadata; do not remove it just because the wrapper also checks alignment. Count data queries separately from consistency checks.

## Required scenarios

Use actual PostgreSQL for connection/snapshot claims, through the disposable fixture. Hold the specific boundary with a barrier rather than guessing timing. A lightweight adapter spy can count calls but cannot qualify PostgreSQL isolation.

| ID  | Setup/action                                                                                                      | Required observation                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Execute the same prepared read before and after journal activation and inside/outside a transaction.              | SQL classification is reused; live routing changes correctly. Nested reads add no transaction. Operational-only and unknown-table cases keep their original guarantees. |
| R2  | Read a ready canonical world with no outstanding application.                                                     | No wait timer is constructed; the durable read-snapshot header check still executes.                                                                                    |
| R3  | Commit an append after the no-wait decision but before the read snapshot or primary writer acquires its lane.     | Alignment detects any unapplied newer head; bounded catch-up occurs before the operation runs exactly once. No mixed world is returned.                                 |
| R4  | Inject an application failure, then attempt both a guarded read and write.                                        | The recorded failure propagates; the idle fast path cannot hide it or invoke the operation.                                                                             |
| R5  | Load active and complete worlds, including a wrong retained history count.                                        | One outer snapshot per load; valid contents agree; corrupt counts still refuse and do not replace the accepted baseline. Missing world performs no history audit.       |
| R6  | Search with already-current lexical data; use callbacks returning undefined, false, null and a memory list.       | One coverage query, one operation invocation, exact returned value. Nonlexical searches retain their existing path.                                                     |
| R7  | Leave a newly saved source pending, then search for a unique word in it.                                          | First snapshot closes before forced indexing; the next fresh snapshot returns the source. No writer/read deadlock.                                                      |
| R8  | Enqueue another source in the same world revision; separately test a clock-only revision with no pending sources. | Same-revision work revokes readiness; clock-only changes can remain covered. Preserve existing SQL semantics.                                                           |
| R9  | Read in an already-owned uncovered snapshot; separately hold the worker beyond the preparation deadline.          | First case fails immediately; second uses one original deadline and cleans its timer. Neither returns empty success or creates another worker owner.                    |
| R10 | Restore generation, forget/correct evidence, revoke access, or close while preparation/read is held.              | Old-generation work cannot disclose or republish old evidence; current disclosure guards still run. Durable sources survive worker failure.                             |

Reuse [store checks](../../../../apps/server/src/store.test.ts) and [private-history checks](../../../../apps/server/src/private-history.test.ts) for their relevant existing cases. Inspect available names before selecting `pnpm exec vitest run <file> -t <name>`; those files do not by themselves prove all journal/index scenarios above. The existing private-history barriers are a useful pattern for actual held reads. Fill only the missing cases with one focused scenario under the common verification procedure.

For finite cost comparison, measure ready lexical searches through `MemoryRepository`, plus a pending-source search and active/full loading separately. Use the same sources/query/observer and consumed result list in both versions. Also time unrelated ordinary canonical reads to catch a regression from wrapper changes. Report query/transaction counts, complete latency and CPU; startup savings must not be credited to steady game throughput.

## Maintained records

- Implementation/exit status: [PSF01 and PSF02](../../../maintainers/performance-safeguards.md).
- Shared architecture and evidence procedure: [technical design](../performance-safeguards-tech-design.md); behavior: [feature specification](../performance-safeguards-feature-spec.md).
- Existing constraints: [PF17-J01](../../../limits/persistence.md#pf17-j01--experimental-deferred-saving), [MH15](../../../limits/memory.md#mh15--delayed-lexical-preparation).
- Current contracts to reconcile after retention: [journal reader matrix](../../performance-overhaul/journal-contract.md#reader-revision-and-wait-matrix), [memory storage](../../../memory-architecture.md#implemented-retrieval-and-storage), and [private disclosure](../../../memory-architecture.md#private-retrieval-fencing). Keep privacy rechecks after awaits.

**Implementation placement — October 17, 2026, 19:44 EDT.** World reconstruction and history auditing share the SQL snapshot. Synchronous validation/count comparison use those captured values immediately after releasing it and before accepted-state publication; see [saving/loading reconciliation](saving-and-loading.md#implementation-reconciliation--october-17-2026-1944-edt). This keeps consistency without occupying a database reader during pure validation.
