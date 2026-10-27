# Ordinary save fallback and one load-validation owner

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | All six tasks and their required focused comparisons are complete; measured benefits remain workload-specific. | 2026-10-18   |

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [performance-safeguards tracker](../../../maintainers/performance-safeguards.md) records completed implementation and its scoped evidence; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

Read the [technical design](../performance-safeguards-tech-design.md) and its source baseline first. The [tracker](../../../maintainers/performance-safeguards.md) owns status. This guide preserves accepted-action durability and current-format rejection; it removes unnecessary preparation and duplicate validation.

## PSF05: treat ordinary saving as an ordinary outcome

### Path at design time

[SqlGameRepository.commit](../../../../apps/server/src/store.ts) first checks `canDeferWorldTables`, encodes the journal transition, prepares memory-source data, marks the write deferred, then calls [WorldJournal.append](../../../../apps/server/src/world-journal.ts). Inside its raw writer transaction, the callback runs [journalConstraints](../../../../apps/server/src/journal-admission.ts).

`journalConstraints` mixes two different responsibilities:

1. **Facts known from this exact change set:** which parent/created-record identities to query, list-position probes, physical-parent identities, and whether the lookup envelope is exceeded.
2. **Facts requiring the current committed database:** existing rows, list occupancy, the pending committed journal suffix, collisions and missing parents.

A `false` result throws `SynchronousJournalSave`; the transaction rolls back, that specific exception is caught, and ordinary saving runs. Actual integrity errors are different exceptions and already propagate. The goal is to separate the two responsibilities and remove only the expected-fallback exception.

### 1. Prepare the exact constraint query before encoding or opening a transaction

Keep the owner in `journal-admission.ts`. Introduce a module-specific `JournalConstraintPlan` and a pure `prepareJournalConstraints(worldId, changes): JournalConstraintPlan | undefined`. `undefined` means this change requires ordinary saving; it never means a failed save succeeded.

The plan contains only data needed by this one save attempt:

- The exact `RecordChanges` reference it was built from.
- The world ID, bounded identity/query parameters, list-position groups and physical-parent mapping derived by the existing code.
- The resulting parameterized selection SQL and parameters when nonempty, so query construction/JSON encoding is not repeated under the writer transaction.

Use readonly interfaces/collections for consumers. These are owned process-local preparations, not a persisted schema, public capability or cross-save cache. Do not deep-copy the world or duplicate changed payloads. The store owns the change set for the attempt and must not mutate it after preparing this plan.

Extract the current `wanted`, `positions`, `physicalParents` construction and static lookup-count rejection into this function. Reuse `RECORD_NODES`, `RECORD_PARENTS`, `journalRecordPath`, tuple-key encoding and the existing lookup constant. Keep unknown-schema/integrity errors as errors. Preserve the current family check in `journalTableFamily`; do not reimplement it inside the plan builder.

Move other purely change-set fallback decisions only when their condition is identical without consulting database membership—for example, an explicitly unsupported placement shape. Preserve the owning decision and avoid two copies of the predicate. Do not move live collision/missing-parent checks out of the writer transaction.

The resulting order in the store is:

```text
Existing canDeferWorldTables check
  -> prepareJournalConstraints(worldId, exact changes)
  -> if no plan: use existing ordinary save
  -> encodeJournalTransition(exact changes, prepared history)
  -> if encoding is ineligible: use existing ordinary save
  -> prepare exact memory sources through the existing owner
  -> attempt journal append with this plan
```

This does not eliminate record-diff or history preparation already needed by either save path. Do not claim those costs were removed.

### 2. Keep current database constraints inside append admission

Change `journalConstraints` to consume the plan rather than rebuild it. For example:

```ts
export async function journalConstraints(
  db: SqlDatabase,
  plan: JournalConstraintPlan,
  pending: readonly JournalTransition[],
): Promise<boolean>;
```

Inside the existing raw writer transaction, read `await this.journal.pending()` freshly, then execute the plan's selection and existing overlay/constraint logic. Do not retain a pending suffix captured before acquiring writer ownership. Its contents can change during earlier waits.

Retain every current check: bounded query result, duplicate record/list position, committed or same-entry structural parent, physical parent, current deletion effects and exact canonical identities. Keep the existing table/parent indexes and SQL predicates. A plan proves which facts to read; it does not prove those facts are still valid.

### 3. Replace the exception only for a valid fallback

Use small module-owned discriminated outcomes in `world-journal.ts`, not a generic result library:

```ts
type JournalAdmission =
  | { kind: 'admitted'; receipt?: CommandReceiptWrite }
  | { kind: 'synchronous' };

type JournalAppendResult = { kind: 'appended'; revision: number } | { kind: 'synchronous' };
```

Update `WorldJournal.append`'s callback and return contract, and the sole production call in `SqlGameRepository.commit`, together:

1. The admission callback first runs current journal constraints. On unsupported current admission, return `{ kind: 'synchronous' }` **before** preparing a gameplay receipt or registering any write/publication callback.
2. Otherwise perform the existing authority assertion and prepare the optional receipt, then return `{ kind: 'admitted', receipt }` with the property omitted when absent.
3. In `append`, branch on the admission result before the existing final head-update/journal/receipt statement. A synchronous result returns from that otherwise read-only transaction without advancing the head, adding a journal entry, touching accepted-state metadata or registering publication callbacks.
4. Preserve the current final atomic SQL statement and after-commit publication for admitted results. Return `{ kind: 'appended', revision }` only after the transaction succeeds.
5. The store handles appended results exactly as today: update accepted revision/state, schedule application, return the revision.
6. For a synchronous result, clear the attempt's `write.deferred` flag and proceed once through the existing ordinary-save block. Its current revision, permission, receipt and world-write checks still run. Reuse already prepared source/history data only through their existing owners; do not bypass normal saving because preparation exists.
7. Delete `SynchronousJournalSave` and its dedicated catch. Do not catch ordinary database errors and convert them to fallback. No compatibility overload or automatic second attempt remains for a failed append.

Returning from an admission-only transaction may issue `COMMIT` rather than `ROLLBACK`; this is not itself a query saving. The important saving is avoiding **the entire attempted append transaction and encoding** for statically ineligible changes. A fallback that can only be discovered from database facts may still use two sequential transactions. Do not combine them through a new transaction coordinator in this task.

### Outcome table

| Situation                                                                                                             | Required result                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Static family/lookup envelope is ineligible                                                                           | Ordinary save without journal encoding, memory-source preparation solely for append, or an attempted append transaction. |
| Encoding exceeds the existing journal representation envelope                                                         | Ordinary save through its existing path.                                                                                 |
| Current database constraint coverage is conservatively unsupported                                                    | Explicit synchronous outcome before append writes; ordinary save then performs its own current checks.                   |
| Existing record/list collision, missing required parent, stale expected revision, revoked authority, database failure | Preserve actual error/refusal; no fallback retry and no successful acknowledgement.                                      |
| Admitted append                                                                                                       | Same atomic world-head/journal/receipt result and after-commit publication.                                              |
| Ordinary fallback save fails                                                                                          | Propagate that failure once; do not re-enter journal admission.                                                          |

### Required scenarios

| ID  | Setup/action                                                                                                                                              | Required observation                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Real supported movement/new-evidence change eligible for delayed saving.                                                                                  | Same saved result, receipt, revision, canonical contents after application and cold reopening.                                                                                                       |
| S2  | Change set within the existing changed-row envelope but with enough distinct created/parent identities to exceed the separate constraint-lookup envelope. | Static fallback: zero attempted append transactions and zero journal encoding calls; ordinary saving succeeds exactly as control. Do not test only a case rejected earlier by `canDeferWorldTables`. |
| S3  | A live-dependent conservative fallback, using the existing result-cardinality or unsupported-reference path.                                              | No journal/head/receipt mutation before fallback; ordinary saving runs once; no deliberate exception/rollback is used to select it.                                                                  |
| S4  | Another append or application completes between pure preparation and writer admission.                                                                    | Fresh pending suffix and final expected-head SQL retain correct ordering; no stale plan authorizes a collision.                                                                                      |
| S5  | Duplicate canonical/list identity, missing structural/physical parent, or malformed current input.                                                        | Real constraint failure is preserved; no successful save or automatic fallback retry. Include same-entry parent creation and pending-parent cases that are actually supported.                       |
| S6  | Permission revoked or expected revision changed after preparation.                                                                                        | Existing current assertion/final SQL refuses before acknowledgement.                                                                                                                                 |
| S7  | Force a database failure in append; separately fail the ordinary fallback.                                                                                | Error propagates once. No second path runs after a failed append; no receipt, accepted metadata or background publication falsely signals success.                                                   |
| S8  | Close/reopen after successful append and after ordinary fallback.                                                                                         | Both recover identical supported worlds and command outcomes without replaying actions or charging again.                                                                                            |

Use the existing [store checks](../../../../apps/server/src/store.test.ts) for durable outcomes and stale-writer refusal, and the parent journal qualification scenarios described in the [storage report](../../../verification/performance/overhaul-storage-implementation.md). Its private historical probe is evidence, not a checked-in test you can assume exists. Reproduce missing cases through the current disposable PostgreSQL fixture.

Measure successful append, static fallback, live-dependent fallback and ordinary noncandidate saving separately. Use identical inputs and actual store commits. Count encoding/constraint preparation, queries, transactions and callbacks, plus total CPU/elapsed time. A cheaper static fallback must not hide slower common eligible saves. Do not infer fallback prevalence or whole-game benefit from a synthetic worst case.

## PSF06: validate a loaded world at its owning boundary

### Selected edit

1. Document `WorldStore.load` in [store.ts](../../../../apps/server/src/store.ts): successful nonnull return is a current-format validated world whose required history audit has passed; invalid input throws before installation. This is a semantic contract, not a new return type or brand.
2. Keep `SqlGameRepository.load`'s call to [validateCurrentWorldState](../../../../apps/server/src/upgrade-world.ts), which delegates to `validateWorldModules`, and keep its history audit. PSF01 groups their reads but does not remove validation.
3. Remove only the immediate `if (existing) validateWorldModules(existing.state.world)` after `store.load(true)` in [WorldService.initialize](../../../../apps/server/src/world-service.ts). Remove the import only if no other use remains.
4. Inspect every current `WorldStore`/`GameRepository` implementation and test replacement of `load`. Make a test double honor the documented contract when supplying a successful loaded world. Do not weaken the production contract to accommodate malformed fixtures.
5. Preserve validation for newly constructed worlds, restored/imported candidates, created-world activation and any actual startup changes. Do not remove another check merely because it calls the same function later.

The owning `validateWorldModules` intentionally validates both stored anchors and the current calculated view when delayed numeric work is present. Those are different required representations, **not** the duplicate targeted here. Do not remove either validation or mark a mutable world permanently validated.

### Required scenarios

| ID  | Scenario                                                                                                                | Required observation                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | Open an ordinary valid saved world through `WorldService`.                                                              | The immediate repeated top-level validation is absent; owning load validation and identical startup behavior remain.                             |
| L2  | Open a valid world with supported pending numeric work.                                                                 | Both anchor and current-value validation still happen at load; subsequent current values and continuation agree.                                 |
| L3  | Corrupt required fields, a required reference, pending arithmetic, or history coverage in a disposable saved candidate. | Owning load refuses before the world is installed or served; no silent repair or conversion.                                                     |
| L4  | First-world startup, created-world activation, and explicit restore.                                                    | Their own existing admission/validation paths remain effective. No game events, grants or starting effects are replayed because of this cleanup. |
| L5  | A different legitimate `WorldStore` implementation/test double returns a loaded world.                                  | Its contract is explicit and validated at its own boundary; no unchecked external data can enter through the service.                            |

Use focused existing `store.test.ts` and `world-service.test.ts` cases, selected after inspecting fixtures and test names. For coverage missing there, obtain the named scenario evidence under the common policy. Count top-level validation ownership separately from the recursive anchor/current passes. Report startup timing independently; this work makes no ongoing FPS claim.

## Maintained records

- Status and exit criteria: [PSF05/PSF06](../../../maintainers/performance-safeguards.md).
- Shared plan and evidence procedure: [technical design](../performance-safeguards-tech-design.md); behavior: [feature specification](../performance-safeguards-feature-spec.md).
- Existing constraints: [PF17-J01](../../../limits/persistence.md#pf17-j01--experimental-deferred-saving), [native arithmetic](../../../limits/native-work.md#nw17--anchored-continuous-native-values). No bound changes.
- Contracts to preserve/reconcile after implementation: [journal admission](../../performance-overhaul/journal-contract.md#pre-acknowledgement-constraint-proof), [current-format validation](../../../save-and-load.md#current-format-validation), [continuation](../../../save-and-load.md#continuation-and-identity). The root development policy continues to prohibit legacy compatibility work.

## Implementation reconciliation — October 17, 2026, 19:44 EDT

The load owner captures reconstructed rows and the required history count in one SQL snapshot, then releases the reader before synchronous current-format validation and count comparison. These checks read only that independent captured world; accepted-state publication and journal synchronization remain afterward. This refines the originally proposed placement to avoid holding a database reader during heavy geometry validation. Failed loading also retains any previously lost incremental baseline. The storage report records the adverse first timing result and the refined comparison separately; lower query counts alone do not establish faster loading.
