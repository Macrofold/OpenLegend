# Save round-trip batching — technical design

| Status      | Current progress                                                                                                           | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | This unapproved proposal requires a current-source feasibility trial before any batching implementation or default change. | 2026-10-03   |

**Status: proposal, not approved for implementation.** Behavior, scenarios and acceptance are in the [feature spec](save-round-trip-batching-feature-spec.md); work items are [PF15](../maintainers/performance.md#pf15--save-round-trip-batching). The original measurement baseline was `codex/save-stall-recovery` at `f00a0468`. The adapter and save owners have since integrated into main; this review checks their serial transaction shape at `b50ec6ce`, not new runtime performance. Recheck exact writer dependencies during the still-required trial.

## Terms

- **Round trip:** the client sends something to PostgreSQL and waits for the answer before continuing.
- **Statement:** one SQL command. Today every statement costs one round trip.
- **Group:** several statements combined so they cost one round trip.
- **Flush:** sending the statements collected so far as one or more groups.
- **Background save / synchronous save:** as [defined here](../save-and-load.md#background-and-synchronous-world-saves). Both run through the same repository transaction, so this design covers both.

## Current write path

**Transport.** `PostgresDatabase` (`apps/server/src/postgres.ts`) owns one writer connection (`pg` 8.16.3) behind the `postgres` work lane (512 slots, 5 s admission). `transaction()` sends `BEGIN`, then `SET LOCAL statement_timeout = '30s'`, runs the caller, then `COMMIT` (or `ROLLBACK` and the rollback hooks). `query()` rewrites `?` placeholders to `$n` and awaits each statement. `pg` sends the next query only after PostgreSQL reports the previous one finished (`Client._pulseQueryQueue` waits for ReadyForQuery), so there is no way to overlap statements on one connection with the current driver. Errors surface as `PostgreSQL operation failed (<code>)`, without table names or values.

**Save transaction.** `SqlGameRepository.commit` (`apps/server/src/store.ts`) runs, inside one transaction:

1. Authority work, only when present: account provisioning, the authority fence check, rebind/control/exit changes (reads and writes whose results are used).
2. `records.advance`: `UPDATE world_head SET revision=revision+1 … RETURNING revision`; no row means another writer and the save fails (`world-records.ts`).
3. Restore installation, loads only.
4. The command receipt, when the save carries one.
5. The forgetting ledger (read then write), only when forgetting changed; vector and interest invalidations, only when memories were revised.
6. `history.project`: history events and perception rows in bounded multi-row inserts, then `UPDATE history_totals … RETURNING event_count`, which only checks that the row exists (`history.ts`, `history-batch.ts`).
7. Job outcomes: for each finished job, `getJob` (read) then `putJob` (write).
8. `memories.project`: memory source index rows (`memory-repository.ts`).
9. `records.write`: for each changed record table, in parent-before-child schema order, grouped multi-row `INSERT` (new rows) or `INSERT … ON CONFLICT DO UPDATE` (changed rows) statements, then `DELETE` statements after all writes, so objects moved to a new parent are not removed by the old parent's cascade (`world-records.ts`).
10. Hot-event pruning, when needed.
11. `memories.reconcile`: statements that themselves use data-modifying CTEs and read the memory source index written in step 8.
12. Vector reuse bookkeeping.
13. `COMMIT`, then the after-commit publication hooks.

**Historical measured statement mix (September 29).** The slowest save in the 25 ms scene run had 44 statements: 2 to start, the revision advance, 4 history inserts plus the totals update, 1 memory source insert, 33 record-table inserts, 2 memory index statements and the commit. Averages were 17–23 statements per save ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)).

## Which statements can be grouped

Eligibility depends on semantic dependencies, not merely whether a caller uses a return value. The trial must inventory current reads, writes, conflict checks, triggers, unique keys, foreign keys and cascades under the existing save owner.

| Statement                                    | Required treatment                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BEGIN`, `SET LOCAL statement_timeout`       | Candidate for one unparameterized startup message; retain transaction failure handling.                                                                                 |
| Revision advance and other checked admission | Preserve successful admission before dependent work and the existing conflict outcome; keep an explicit barrier unless a proven equivalent construction preserves both. |
| History and memory source inserts            | Candidate only for disjoint, dependency-independent writes; same-table conflict behavior must remain identical.                                                         |
| History total update                         | Preserve the existence check and its ordering/failure meaning; a returned count is not automatically a harmless deferred check.                                         |
| Record inserts/upserts                       | Group only when row sets, constraint behavior and data dependencies permit a common snapshot; table-list order is not SQL execution order.                              |
| Record deletes                               | Follow every required write/reparenting barrier and retain cascade behavior.                                                                                            |
| Memory index upkeep (`WITH … DML …`)         | Standalone after its required writes are visible; do not nest an existing data-modifying CTE.                                                                           |
| Authority, job, ledger and integration reads | Observe all required preceding writes; flush before the read and retain the existing mutation owner.                                                                    |
| `COMMIT`                                     | Follow every checked group; publish durable effects only after confirmed commit.                                                                                        |

The current background and command paths contain barriers beyond start/write/commit. Their achievable round-trip count is a trial result, not established by this table.

## Options considered

**A. One combined statement per proven-independent group, using data-modifying CTEs (trial candidate).** After required admission barriers, an illustrative independent group is `WITH s1 AS (INSERT …), s2 AS (INSERT … RETURNING id) SELECT count(*) FROM s2`; this syntax alone does not prove the operations are eligible. PostgreSQL runs every data-modifying CTE exactly once, whether or not its output is used. Parameters stay bound; the existing `?`→`$n` rewrite works on the combined text. The codebase already uses this form for memory index upkeep (`memory-repository.ts`), including its snapshot rules. Constraints from the [official PostgreSQL data-modifying CTE rules](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING):

- Sibling operations share a snapshot and have no guaranteed execution order. Listing `s1` before `s2` does not sequence their effects; communicate an admitted dependency only through an explicitly validated `RETURNING` relation or separate statements/barriers.
- Updating or deleting the same row twice in one statement is unsupported and can produce unpredictable results; split overlapping row sets, including indirect conflicts/cascades, before execution.
- A data-modifying CTE must be at the top level, so a statement that already contains one (memory index upkeep) cannot be nested inside another.
- One error fails the whole group; today's error message carries no table name anyway.
- The 30-second statement limit applies to the whole group.
- At most 65,535 bound parameters per statement (protocol limit).

**B. One database function receiving the whole save as JSON.** One round trip that can run statements strictly in order inside the database. Costs: a PL/pgSQL function with dynamic SQL that must mirror the record schema, every row encoded twice (JSON around the existing payload text), harder debugging and a new database-side code path to secure and maintain. Keep as a fallback if A's constraints prove unworkable.

**C. Several statements sent as one text block (the approach rejected on 2026-09-27).** Keeps exact order, but PostgreSQL only accepts multiple statements in one message without bound parameters, so every value would have to be escaped into SQL text: a correctness and injection risk, extra CPU, and incompatible with the `?` rewrite. The earlier rejection stands.

**D. Protocol pipelining with a different driver.** PostgreSQL's extended protocol allows sending many parameterized statements, then one sync, in a single round trip, in exact order, including the commit. `pg` 8.16.3 does not expose this. It would mean adopting a driver that pipelines (for example `postgres`, also known as postgres.js) or writing protocol code against `pg` internals. The driver route changes every query path (type parsing, error mapping, lanes, the checkpoint worker) and adds a dependency; the internals route is fragile. It is a separate candidate, not a selected end state. Verify the exact driver version’s supported pipelining, transaction error recovery and synchronization behavior before adoption; [PostgreSQL’s protocol contract](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-PIPELINING) does not establish a particular JavaScript driver’s behavior.

**E. Fewer statements by restructuring writers.** For example, one statement for both new and changed rows of a table. This helps a little but does not change the per-statement cost; it complements A or D.

**Recommendation:** run stage 0 before selecting A; compare D only when a driver change is within the approved scope. Do not assume that an unused return value makes a write independent or that A will meet the four-round-trip target. B remains a higher-complexity fallback; C remains rejected. A failed feasibility gate is an explicit decision, not permission to weaken ordering or acceptance.

## Proposed design (option A)

### Adapter API

Use a bounded transaction-scoped batch owned by the existing write transaction. Ordinary `run`/`get`/`all` callers retain their current immediate-result contract; selected save writers explicitly opt in. Do not mechanically replace `await run()` with a promise that resolves only at a later explicit flush: the caller would wait forever before reaching that flush.

- Proposed `await queueWrite(command)` resolves after admission to the buffer, not after that write is durable or its row check has passed. When a group bound would be exceeded, it first executes the current group itself, then admits the next write; it never waits for a future caller action to make progress. A write that needs its result now uses the existing immediate path after a barrier.
- `await flushWrites()` executes all admitted writes, checks required results and resolves only once those checks pass. A conflict check required before later work must finish at this barrier, not merely be queued.
- Reads and nonqueued writes flush preceding queued work before execution. Parent/child visibility, overlapping row sets and cascade dependencies impose explicit barriers supplied by the semantic writer, not guessed by a general-purpose SQL parser.
- The transaction flushes before `COMMIT`. An operation error discards unsent work and rolls back admitted database effects. Only the existing after-commit path publishes success; queue admission grants neither durable receipts nor early side effects. A commit error retains its existing uncertain-outcome handling.
- Enqueue rejects outside the current active writable transaction, inside a read-only scope, or through a callback retaining an expired transaction scope. It must not silently create an independent transaction or leak work into the next one.
- No collection of promises waits for a flush the caller cannot reach. The bounds apply while accumulating writes, not only when constructing the final statement; oversized individual writes use the existing bounded immediate path after a flush or retain its existing refusal.

### Group construction and ordering

1. Trusted writer descriptors identify SQL, bound values, disjoint row sets, required result checks and ordering barriers. Build only eligible groups in existing transaction order; operations **inside** a combined statement have no implied list order.
2. Each eligible operation becomes one top-level CTE. Checked results use the exact required `RETURNING`/count semantics; do not blindly add `RETURNING 1` to arbitrary SQL. Bind values through the existing placeholder conversion and keep trusted schema text separate from data.
3. Preserve revision/authority admission, read-after-write dependencies and writes-before-deletes. Memory reconciliation runs separately once earlier source rows are visible. A statement already containing data-modifying CTEs stays standalone unless separately redesigned and qualified.
4. Parent/child inserts can share a statement only after the trial proves the actual schema’s constraint and error behavior without relying on CTE list order. Otherwise keep barriers between dependency levels. New/changed rows must be disjoint in **effects**, not just in an input list; overlapping upserts, unique keys or cascades require splitting.
5. An impossible grouping requirement fails the trial. Do not introduce deferred constraints, schema changes, writable duplicate owners or altered conflict precedence to reach a round-trip number within this proposal’s scope.

### Round trips for a typical save

The following is the original optimistic planning model, not a measured or guaranteed grouping of the current writers. Extra admission, constraint and visibility barriers add round trips. Stage 0 must publish the achievable count; the feature specification’s acceptance target remains unchanged until an explicit owner decision.

| Step                                                          | Today | Stage 1 |               Stage 2 | Stage 3 |
| ------------------------------------------------------------- | ----: | ------: | --------------------: | ------: |
| Start and time limit                                          |     2 |       1 |                     1 |       1 |
| Revision advance, history, memory source index, record writes | 12–35 |   12–35 | 1 (bounds permitting) |       1 |
| Record deletes (when any)                                     |   0–2 |     0–2 |                   0–1 |     0–1 |
| Memory index upkeep                                           |   0–2 |     0–2 |                   0–2 |     0–1 |
| Commit                                                        |     1 |       1 |                     1 |       1 |
| **Typical total**                                             | 17–23 |   16–22 |                   3–5 | about 3 |

### Proposed limits

To be recorded in [LA174](../limits/persistence.md#la174) and [LA175](../limits/persistence.md#la175) when implemented:

| Bound                                   |                   Proposed value | Reason                                                                                                                                                            |
| --------------------------------------- | -------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bound parameters per combined statement |                           60,000 | Below PostgreSQL's 65,535 protocol limit                                                                                                                          |
| Encoded parameter bytes per group       |                            1 MiB | Bounds accumulated encoded parameters, not total process memory or execution time; an individually oversized statement retains the existing immediate-path limits |
| Statements per group                    |                               64 | Bounds parse/plan cost of one combined text                                                                                                                       |
| Statement time limit                    | 30 s per group (unchanged value) | Now applies to a whole group; measure lock, parse and execution cost rather than assuming equal timeout risk from size bounds                                     |

### Metrics and diagnostics

- New counters: round trips per transaction, statements per round trip, group sizes (statements, parameters, bytes).
- The scene profiler's per-save attribution reports round trips alongside statements.
- Public errors retain the existing redacted PostgreSQL code contract. Trusted diagnostics may report only approved aggregate group size/timing; do not newly expose table names, SQL, record identities or parameter values to clients or model context.

### Off switch

`OPEN_LEGEND_SQL_WRITE_GROUPS=off|on`, read at startup. It stays off by default until PF15.6 passes, then the default is decided. When off, each opted-in queue operation executes immediately through the same transaction owner before resolving; explicit barriers still have the same ordering and error meaning. Both modes must reject invalid transaction scopes and publish only after commit.

## Semantic owners and callers

| Owner                                                   | Change                                                                                                                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgres.ts` (transport)                               | Write buffer, group construction, flush rules, bounds, metrics, off switch; start+time limit in one message                                                                                                           |
| `world-records.ts` (`advance`, `write`)                 | Preserve checked revision admission; opt proven independent record writes into bounded groups and retain dependency/delete barriers. Coordinate with the integrated D1/D2 owner, not an old branch-merge prerequisite |
| `history.ts`, `history-batch.ts`                        | Opt eligible inserts into groups; preserve the running-total check and required failure ordering                                                                                                                      |
| `memory-repository.ts`                                  | Opt eligible source-index inserts into groups; index upkeep stays standalone after its visibility barrier unless separately qualified                                                                                 |
| `store.ts` (`commit`)                                   | No reordering; reads that remain in the transaction become flush points automatically                                                                                                                                 |
| Other write transactions (authority, jobs, diagnostics) | Unchanged in stages 1–2; optional in stage 3                                                                                                                                                                          |

No schema, save-format or wire-protocol change. The [development save policy](../../AGENTS.md#development-save-policy) is unaffected.

## Security, privacy and authority

- Values stay bound parameters; SQL text is built only from code and the static record schema.
- Diagnostics never include parameter values.
- Authority checks (the fence) are reads and therefore flush points, so they still observe every earlier write in the transaction, exactly as today.

## Performance

- Saved time ≈ removed round trips × round-trip time (feature spec table).
- Added costs: building the combined text on the server's main thread (a string join over data already prepared), PostgreSQL parsing and planning one larger statement per group, and slightly more memory per group. PF15.1 measures all three.
- Per-table effects must remain equivalent, but parse/plan cost, locking, common-snapshot execution and statement timeout scope can change. Report those costs and peak accumulated bytes, including cold and tail cases.

## Verification

1. **Stage 0 trial** (disposable database, [verification report](../verification/ordered-async-saves.md) or a new focused report):
   - parent and child inserted in one combined statement;
   - a child moved to a new parent in one group with the old parent deleted in the next;
   - new and changed rows of one table in one statement;
   - the same row touched twice (must be split);
   - a failed check and a unique violation inside a group;
   - statement time limit on a group;
   - actual transport round-trip counts and save times at 0/5/25 ms delay per round trip, retaining separate logical-statement counters;
   - parse/plan, lock and timeout behavior of a 64-statement group;
   - one queued write, several bounded groups, an error before flush, failed checked admission and a callback outliving its transaction: none may hang, publish early, retain unbounded input or leak into another transaction;
   - identical result and conflict/error precedence with batching disabled, including invalid scopes and oversized individual writes.
2. **Equivalence:** run the ordered-save, hardening and checkpoint drills with the setting on and off; compare per-table row hashes and durable revisions.
3. **Failures:** duplicate create inside a group, competing writer, statement timeout in a group, `COMMIT` failure, SIGKILL during a group, writer queue refusal; outcomes must match today's drills.
4. **Scene:** matched ABBA runs at 0/25/100 ms and on a quiet host, reporting round trips and save p50/p95/max.
5. **Existing checks:** focused tests that exercise saves (`spatial-http.test.ts`, `world-service.test.ts`), typecheck and build.

## Tradeoffs and open decisions

1. **Is serial database communication a measured player-facing bottleneck?** Re-profile the actual proposed deployment and current writers; topology alone does not decide priority (feature spec).
2. **Option A or a pipelining driver (D)?** Decide from the stage 0 trial and any other reason to change drivers.
3. **Other write transactions** (authority, jobs, diagnostics): include only if measurements show they matter.
4. **Group commit** (several saves in one transaction) is a separate idea; out of scope.
5. **Default setting:** decided after PF15.6.

## Maintained records

- Implementation: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).
- Limits and constraints: [LA174](../limits/persistence.md#la174) and [LA175](../limits/persistence.md#la175); proposed values above.
- Related contract/design: [feature spec](save-round-trip-batching-feature-spec.md); [background and synchronous saves](../save-and-load.md#background-and-synchronous-world-saves); [background world saves project](completed/ordered-async-saves.md).
