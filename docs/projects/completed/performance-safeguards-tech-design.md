# Less repeated safety work — technical design

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All six tasks and their required focused comparisons are complete; measured benefits remain workload-specific. | 2026-10-18   |

**Technical design used for review — October 18, 2026, 00:02 EDT.** Architecture and its dated implementation reconciliations remain the design reference; the current review preserves their authority and world boundaries.

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [performance-safeguards tracker](../../maintainers/performance-safeguards.md) records completed implementation and its scoped evidence; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

**Design timestamp:** October 17, 2026, 17:50 EDT. **Inspected source:** Macrofold/OpenLegend, local `codex/profile-smooth-three-times`, commit `fb0940a8b850c065db716d3b77bd3c91d33dba12`. This records a source reference, not a refreshed merge base or a runtime qualification. The referenced implementations were unchanged between this commit and the earlier inspected `f0eca0ecff6063f5b3c247b490c3ad556aa0ce5a`. The main performance conversation continues editing this checkout; reread affected functions before implementation.

## Start here

Read the [feature specification](performance-safeguards-feature-spec.md), this design, the selected focused guide and applicable repository instructions. The source names below are navigation aids; the guides explain behavior before prescribing edits. The current implementation follows these contracts and the dated reconciliations below; the tracker owns remaining verification.

| Guide                                                                    | Work         | Existing owners to change                                                                 | Estimated changed logic, excluding tests |
| ------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| [Database reads](performance-safeguards/database-reads.md)               | PSF01, PSF02 | `JournalDatabase`, `WorldJournal`, `SqlGameRepository.load`, `LexicalProjection.snapshot` | Approximately 80–150 lines               |
| [Simulation accounting](performance-safeguards/simulation-accounting.md) | PSF03, PSF04 | `chargeStatusWork`, its two callers, `chargeWork`, meter creation                         | Approximately 35–75 lines                |
| [Saving and loading](performance-safeguards/saving-and-loading.md)       | PSF05, PSF06 | Journal admission, `WorldJournal.append`, store commit/load contract, service startup     | Approximately 100–180 lines              |

The estimates are planning cues, not quotas. Overall risk is **medium to high** because a small database change can affect save visibility, transaction ownership or retry behavior. The domain changes are smaller but must preserve exact accounting and continuation. No extra architecture is justified merely because the combined edit approaches a few hundred lines.

## One owner per responsibility

| Responsibility                                                                          | Authoritative owner                                          | What callers may reuse                                                                                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Which accepted revisions have been applied to queryable tables, and application failure | `apps/server/src/world-journal.ts`                           | A transient answer that no flush is needed; never permission to skip the actual reader/writer consistency check.         |
| Preparing a consistent database read and reusing an enclosing transaction               | `apps/server/src/journal-database.ts`, using `postgres.ts`   | The active transaction through the existing adapter context, not a new request-wide cache.                               |
| Which exact memory source revisions are searchable                                      | `apps/server/src/lexical-projection.ts`                      | Coverage proven inside the same database view used to select and hydrate memories.                                       |
| Permission to disclose private evidence                                                 | Existing service/private-read guards                         | No durable or cross-request permission reuse is added.                                                                   |
| Which effect instance is active                                                         | The entity's existing `statusEffects` record                 | Its exact stored key and episode identity; no additional membership index.                                               |
| Work counters, limits and atomic charging                                               | `packages/domain/src/work-budget.ts`                         | Validated values within one synchronous call; no persisted proof flag or mutable-object cache.                           |
| Eligibility and constraints for delayed saving                                          | `apps/server/src/journal-admission.ts`                       | One preparation owned by the exact save attempt; live database facts are checked inside the existing writer transaction. |
| Validation of a loaded world                                                            | `SqlGameRepository.load` through `validateCurrentWorldState` | A successful `WorldStore.load` return, documented as validated; no serialized `validated` flag.                          |

Database reads, retries and wall-clock waiting stay in the server. Deterministic effect identity and accounting stay in the domain. No selected world rule, installed definition or action law moves into the server or becomes an engine constant.

## Implement in these batches

1. **Read preparation: PSF01, then PSF02.** Establish statement/flush ownership and the load read scope first; then remove the preliminary search read. Review the complete database path together. PSF02 is logically independent but measuring after PSF01 avoids attributing a shared improvement twice.
2. **Simulation accounting: PSF03 and PSF04.** Implement the direct membership lookup and validation hoisting. Exercise them through actual effect/native callers, including the existing path that defers supported numeric calculations. Keep both eager and deferred accounting behavior exact.
3. **Save selection and startup: PSF05, then PSF06.** Split pure save preparation from current database constraints; change the append callback/result and sole production caller together. Remove only the immediate duplicate startup validation. PSF06 can be reviewed separately but must share the load contract established by PSF01.

Do not change the parent branch's run allowance. Its [execution plan](../performance-overhaul/execution.md) records that the five ordinary full observations were used. These specs select focused correctness and finite caller comparisons; they do not silently authorize another full-game run. Any later combined observation must fit the then-current authorized performance work and be recorded there once.

## Common implementation rules

- **Recheck the premise first.** If another change already removes a duplicate, link that implementation and qualify it instead of adding a second mechanism. If the named caller no longer exists, revise the affected guide before coding.
- **Preparation is not authority.** Reusable SQL classification, exact effect keys and journal plans do not replace current permissions, generations, revisions, limits or database constraints.
- **No compatibility layer.** Update internal signatures and every current caller together. No overload preserving the previous signature, old save reader, version suffix or second writable representation.
- **No speculative framework.** Keep helpers in their owning files. Extract only shared meaning needed by actual callers. In particular, do not add generic retry/result middleware, a prepared-budget registry or whole-request transactions.
- **Preserve ordinary errors.** Storage errors, invalid current saves, stale revisions and revoked permission propagate through their current owners. Only the narrowly identified valid save fallback becomes a normal outcome.
- **Preserve ordering.** No parallel SQL inside one owned transaction, changed random draws, altered operation order or reduction in recorded evidence.
- **Keep work visible.** Measure the complete operation, including preparation, waiting, queries, encoding, publication and cleanup applicable to that task. Do not report a faster helper as a faster game.

## Verification and evidence procedure

This section defines the evidence contract; the linked reports record actual checks and samples. Follow [verification policy](../../../.agents/rules/verification.md). Reuse the existing checks listed by each guide. Required scenario tables describe evidence to obtain; they do not require a new test file per row or a permanent benchmark framework. Use a small focused ad-hoc scenario for gaps in existing coverage, without recreating the broad test suite.

1. Record exact control and candidate source, affected work item, source/package bindings, workload, actual caller and whether journal/index work is enabled. Keep unrelated parent changes out of the comparison. A source hash alone does not prove workspace dependencies resolve to that source.
2. Use owned disposable worlds/databases. Database scenarios use the existing [fixture](../../../tests/fixtures/database.ts) and [PostgreSQL creator](../../../scripts/disposable-postgres.mjs), with an explicitly supplied loopback administrative URL in `OPENLEGEND_TEST_DATABASE_URL`. Never substitute the running application's database. Use `AI_BUDGET_USD=0`; no provider requests are needed.
3. Prove the named work-count change and semantic equality first. Use held promises/barriers for concurrency cases; arbitrary sleeps are not proof that the intended race occurred. Instrument only the diagnostic pass, outside normal production execution.
4. For a hot-path change, run a finite matched **control/candidate/candidate/control** comparison with the same initial data and operation sequence, using the parent [evaluation procedure](../performance-overhaul/evaluation.md). Separate cold setup from repeated work. Include normal readiness and the specifically affected fallback/lag case. Compare complete returned values, world/counter outcomes and saved contents, not just elapsed time.
5. Record all samples: elapsed time, process CPU where meaningful, query/transaction or visit counts, errors, and enough memory information to detect added retention. Do not add overlapping waits into an exclusive total, select the best sample or infer a whole-game percentage from a local result.
6. Keep a candidate only after its required behavioral cases pass and complete-caller evidence supports the intended change. A repeatable regression requires rejection or a revised design. Noise or unavailable runtime access is **inconclusive**, not a measured improvement. A pure simplification with neutral performance must be reported as such.
7. Run changed-file formatting and `pnpm typecheck` for later TypeScript edits. Use the focused existing files/names in the guides. Build/config and CI gates remain selected by actual impact under repository policy; this document neither runs nor waives them.

Record server results under the existing [storage implementation report](../../verification/performance/overhaul-storage-implementation.md), and domain results under the [simulation implementation report](../../verification/performance/overhaul-simulation-implementation.md). Use one clearly titled section per coherent batch, linking PSF IDs. Do not prefill a verification report with invented results.

Each result section must include a short readable table: **workload; before; after; preserved behavior; tradeoff; retain/reject/inconclusive**. Include technical counts below it. Keep detailed runtime findings out of the general guidance files.

## Completion and documentation updates

The [maintainer tracker](../../maintainers/performance-safeguards.md) owns task status and exit criteria. These guides own algorithms and scenario definitions; avoid copying them into the tracker. After each implemented batch, update only affected current contracts, the relevant report, tracker and project status tables. In particular, the old memory-limit prose describing a preliminary coverage read must be reconciled if PSF02 is retained, while keeping its wait and backlog policies unchanged.

No schema migration, recovery-data rewrite, automatic retry, gameplay compromise or new limit is selected. There are no unresolved product choices in this design. Whether each candidate is faster remains an empirical question with the acceptance procedure above; it is not a reason to invent stronger guarantees.

## Maintained records

- Behavior and scope: [feature specification](performance-safeguards-feature-spec.md).
- Implementation: [PSF01–PSF06](../../maintainers/performance-safeguards.md), under the existing PF17 performance work.
- Constraints: [delayed saving](../../limits/persistence.md#pf17-j01--experimental-deferred-saving), [memory preparation](../../limits/memory.md#mh15--delayed-lexical-preparation), [native work](../../limits/native-work.md). No new bound or unlimited-policy decision is introduced.
- Canonical contracts: [saving/loading](../../save-and-load.md), [memory privacy](../../memory-architecture.md#private-retrieval-fencing), [identity](../../identity-and-references.md#contract), [engine/world ownership](../../engine-and-world-boundaries.md#design-principles-for-every-feature).

## Implementation reconciliations — October 17, 2026, 19:44 EDT

The merged decision implementation retains its existing transaction settlement and independently owned decision roots. Shared save-table writers remain the one implementation. Load validation follows release of the one read/audit snapshot, before any accepted baseline changes; failed loading preserves a lost-baseline flag. Statement classification is lazy within each prepared statement, after the live inactive/transaction bypass, rather than adding eager parsing to already-protected writes. Work-charge input validation shares the current meter’s sum/limit pass rather than adding a separate traversal, then every ancestor is preflighted before any mutation. These refinements preserve the specified guarantees; the linked execution plan and focused reports retain measurements, failed attempts and remaining acceptance.
