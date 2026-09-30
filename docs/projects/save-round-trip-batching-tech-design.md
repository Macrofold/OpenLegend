# Save round-trip batching — technical design

**Status: proposal, not approved for implementation.** Behavior, scenarios and acceptance are in the [feature spec](save-round-trip-batching-feature-spec.md); work items are [PF15](../maintainers/performance.md#pf15--save-round-trip-batching). Source references are to branch `codex/save-stall-recovery` at `f00a0468`.

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

**Measured statement mix.** The slowest save in the 25 ms scene run had 44 statements: 2 to start, the revision advance, 4 history inserts plus the totals update, 1 memory source insert, 33 record-table inserts, 2 memory index statements and the commit. Averages were 17–23 statements per save ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)).

## Which statements can be grouped

| Statement                                    | Result used by the caller?                               | Groupable                                                              |
| -------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `BEGIN`, `SET LOCAL statement_timeout`       | No                                                       | Yes, together (no parameters)                                          |
| Revision advance (`RETURNING revision`)      | Only as a check: the new revision is always expected + 1 | Yes, as a checked statement: exactly one row or the save fails         |
| History inserts                              | No                                                       | Yes                                                                    |
| History total update (`RETURNING`)           | Only as a check that the row exists                      | Yes, as a checked statement                                            |
| Memory source index inserts                  | No                                                       | Yes                                                                    |
| Record-table inserts and upserts             | No                                                       | Yes, parents before children                                           |
| Record-table deletes                         | No                                                       | Yes, but in a later group than the writes (ordering)                   |
| Memory index upkeep (`WITH … DML …`)         | No, but it reads rows written earlier in the same save   | Not inside a group (see below); its own round trip after a flush       |
| Authority, job, ledger and integration reads | Yes                                                      | No: a read forces a flush first                                        |
| `COMMIT`                                     | —                                                        | Separate round trip (option A); combined only with a pipelining driver |

For a typical background save or command save, everything before the commit except the memory index upkeep is groupable, and reads occur only in the less common cases listed above.

## Options considered

**A. One combined statement per group, using data-modifying CTEs (recommended).** A group becomes `WITH s1 AS (INSERT …), s2 AS (INSERT … ON CONFLICT … DO UPDATE …), s3 AS (UPDATE world_head … RETURNING revision) SELECT (SELECT count(*) FROM s3) AS s3`. PostgreSQL runs every data-modifying CTE exactly once, whether or not its output is used. Parameters stay bound; the existing `?`→`$n` rewrite works on the combined text. The codebase already uses this form for memory index upkeep (`memory-repository.ts`), including its snapshot rules. Constraints, from PostgreSQL's rules for data-modifying CTEs:

- All parts run against one snapshot and cannot see each other's changes.
- One row may not be changed twice in one statement.
- A data-modifying CTE must be at the top level, so a statement that already contains one (memory index upkeep) cannot be nested inside another.
- One error fails the whole group; today's error message carries no table name anyway.
- The 30-second statement limit applies to the whole group.
- At most 65,535 bound parameters per statement (protocol limit).

**B. One database function receiving the whole save as JSON.** One round trip that can run statements strictly in order inside the database. Costs: a PL/pgSQL function with dynamic SQL that must mirror the record schema, every row encoded twice (JSON around the existing payload text), harder debugging and a new database-side code path to secure and maintain. Keep as a fallback if A's constraints prove unworkable.

**C. Several statements sent as one text block (the approach rejected on 2026-09-27).** Keeps exact order, but PostgreSQL only accepts multiple statements in one message without bound parameters, so every value would have to be escaped into SQL text: a correctness and injection risk, extra CPU, and incompatible with the `?` rewrite. The earlier rejection stands.

**D. Protocol pipelining with a different driver.** PostgreSQL's extended protocol allows sending many parameterized statements, then one sync, in a single round trip, in exact order, including the commit. `pg` 8.16.3 does not expose this. It would mean adopting a driver that pipelines (for example `postgres`, also known as postgres.js) or writing protocol code against `pg` internals. The driver route changes every query path (type parsing, error mapping, lanes, the checkpoint worker) and adds a dependency; the internals route is fragile. It is the best end state if a driver change is wanted for other reasons.

**E. Fewer statements by restructuring writers.** For example, one statement for both new and changed rows of a table. This helps a little but does not change the per-statement cost; it complements A or D.

**Recommendation:** stage 0 trial of A (and D if a driver change is on the table), then A for pure writes. B only if A fails the trial and D is rejected. Not C.

## Proposed design (option A)

### Adapter API

`PostgresDatabase` gains a transaction-scoped write buffer. Existing calls keep working unchanged.

- `prepare(sql).defer(...params, check?)` queues a write in the current write transaction and returns a promise that settles when its group has run. `check` is optional: `'one-row'` (for example the revision advance) or `'row'` (the history total). A failed check fails the group with the same message the caller throws today (for example "Save conflict: another writer changed this world.").
- `flushWrites()` sends everything queued so far. Writers call it where order matters, for example `records.write` before its deletes.
- Any non-deferred statement in the same transaction (a read, or a write whose result is used) flushes first, so it sees every earlier write.
- `transaction()` flushes before `COMMIT`. If any group fails, the transaction rolls back and every pending deferred promise rejects with that error (each is handled, so no unhandled rejections).
- Outside a write transaction, `defer` behaves like `run`.

### Group construction

1. Queued statements are split into groups in queue order. A new group starts when the next statement would exceed the group bounds, targets a row set it cannot share a snapshot with (see below), or follows a `flushWrites()` barrier.
2. Each statement becomes one CTE (`s1`, `s2`, …). Checked statements get `RETURNING 1`; the final `SELECT` returns their row counts.
3. Parameters are concatenated in order; the combined text goes through the existing `?`→`$n` rewrite. Statement text comes only from code (table and column names from the static record schema); values are never written into SQL text.
4. A statement that already contains a data-modifying CTE is sent on its own after a flush.

### Ordering rules

- **Writes, then deletes.** `records.write` calls `flushWrites()` before its deletes, preserving today's "move before delete" guarantee.
- **Read after write.** Memory index upkeep reads rows written earlier in the same save, so it is preceded by a flush and sent on its own.
- **Parent before child.** Record tables have `FOREIGN KEY … ON DELETE CASCADE` to their parent table. Stage 0 must confirm that a child row and its new parent row inserted in the same combined statement pass PostgreSQL's end-of-statement foreign-key check. If they do not, a barrier goes between schema levels (more groups, still far fewer round trips).
- **One row, one change.** `records.write` already sends new and changed rows of a table as disjoint sets, and history rows are unique per save; a statement that could touch a row already touched in the same group starts a new group.

### Round trips for a typical save

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

| Bound                                   |                   Proposed value | Reason                                                                                                                                |
| --------------------------------------- | -------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bound parameters per combined statement |                           60,000 | Below PostgreSQL's 65,535 protocol limit                                                                                              |
| Encoded parameter bytes per group       |                            1 MiB | Bounds client memory and keeps one group's work well inside the 30 s limit; one oversized statement is still admitted alone, as today |
| Statements per group                    |                               64 | Bounds parse/plan cost of one combined text                                                                                           |
| Statement time limit                    | 30 s per group (unchanged value) | Now applies to a whole group; the bounds above keep a group comparable to today's largest single statement                            |

### Metrics and diagnostics

- New counters: round trips per transaction, statements per round trip, group sizes (statements, parameters, bytes).
- The scene profiler's per-save attribution reports round trips alongside statements.
- A failed group reports the PostgreSQL error code and the table names in the group, never parameter values.

### Off switch

`OPEN_LEGEND_SQL_WRITE_GROUPS=off|on`, read at startup. It stays off by default until PF15.6 passes, then the default is decided. When off, `defer` behaves like `run` and nothing else changes.

## Semantic owners and callers

| Owner                                                   | Change                                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `postgres.ts` (transport)                               | Write buffer, group construction, flush rules, bounds, metrics, off switch; start+time limit in one message                                                  |
| `world-records.ts` (`advance`, `write`)                 | Revision advance and record writes use `defer`; barrier before deletes. Also edited on `origin/codex/history-storage-efficiency`: coordinate before starting |
| `history.ts`, `history-batch.ts`                        | History inserts and the total check use `defer`                                                                                                              |
| `memory-repository.ts`                                  | Memory source index inserts use `defer`; index upkeep stays standalone after a flush (stage 3 may split its CTEs)                                            |
| `store.ts` (`commit`)                                   | No reordering; reads that remain in the transaction become flush points automatically                                                                        |
| Other write transactions (authority, jobs, diagnostics) | Unchanged in stages 1–2; optional in stage 3                                                                                                                 |

No schema, save-format or wire-protocol change. The [development save policy](../../AGENTS.md#development-save-policy) is unaffected.

## Security, privacy and authority

- Values stay bound parameters; SQL text is built only from code and the static record schema.
- Diagnostics never include parameter values.
- Authority checks (the fence) are reads and therefore flush points, so they still observe every earlier write in the transaction, exactly as today.

## Performance

- Saved time ≈ removed round trips × round-trip time (feature spec table).
- Added costs: building the combined text on the server's main thread (a string join over data already prepared), PostgreSQL parsing and planning one larger statement per group, and slightly more memory per group. PF15.1 measures all three.
- The per-table write cost inside PostgreSQL does not change.

## Verification

1. **Stage 0 trial** (disposable database, [verification report](../verification/ordered-async-saves.md) or a new focused report):
   - parent and child inserted in one combined statement;
   - a child moved to a new parent in one group with the old parent deleted in the next;
   - new and changed rows of one table in one statement;
   - the same row touched twice (must be split);
   - a failed check and a unique violation inside a group;
   - statement time limit on a group;
   - round-trip counts and save times at 0/5/25 ms injected delay;
   - parse and plan time of a 64-statement group.
2. **Equivalence:** run the ordered-save, hardening and checkpoint drills with the setting on and off; compare per-table row hashes and durable revisions.
3. **Failures:** duplicate create inside a group, competing writer, statement timeout in a group, `COMMIT` failure, SIGKILL during a group, writer queue refusal; outcomes must match today's drills.
4. **Scene:** matched ABBA runs at 0/25/100 ms and on a quiet host, reporting round trips and save p50/p95/max.
5. **Existing checks:** focused tests that exercise saves (`spatial-http.test.ts`, `world-service.test.ts`), typecheck and build.

## Tradeoffs and open decisions

1. **Is the target database remote?** This decides priority (feature spec).
2. **Option A or a pipelining driver (D)?** Decide from the stage 0 trial and any other reason to change drivers.
3. **Other write transactions** (authority, jobs, diagnostics): include only if measurements show they matter.
4. **Group commit** (several saves in one transaction) is a separate idea; out of scope.
5. **Default setting:** decided after PF15.6.

## Maintained records

- Implementation: [PF15](../maintainers/performance.md#pf15--save-round-trip-batching).
- Limits and constraints: [LA174](../limits/persistence.md#la174) and [LA175](../limits/persistence.md#la175); proposed values above.
- Related contract/design: [feature spec](save-round-trip-batching-feature-spec.md); [background and synchronous saves](../save-and-load.md#background-and-synchronous-world-saves); [background world saves project](ordered-async-saves.md).
