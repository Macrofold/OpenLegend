# State contributions — EWF02–03 / INV-6.3 subtracker

**Status:** implemented and qualified for the approved finite foundation scope; hosted capacity and broader parent work remain separate. This is the detailed decomposition of shared contribution/claim work under [EWF02–03](extensible-world-foundation.md#ewf02--typed-state-providers-and-one-authoritative-value) and [INV-6.3](inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes), not another state or invention authority. Parent completion still requires its own remaining scope. [Feature specification](../projects/shared-state-contributions-feature-spec.md) and [technical design](../projects/shared-state-contributions-tech-design.md) own the approved project.

Implementation was authorized September 26, 2026 in the [five-project execution plan](../projects/foundations-1-5.md#approved-implementation-plan). The slice checkboxes below remain qualification gates, not a count of files written. Each slice joins SL00 when it introduces durable state.

## Execution notes — September 26, 2026

The implementation is on `codex/foundations-1-5`, based on `ce7ef555`.
Current owner extraction and native integration cover these paths:

| Value or behavior             | Single owner and current consumers                                                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native health                 | Raw assignment in `body-state.ts`; living/body reconciliation retains its prior ordering for physiology, effects, recovery and editors.                                                                                                      |
| Fullness/energy               | `worlds/base/needs.ts`, with separate scalar revisions; absent machine needs remain inapplicable.                                                                                                                                            |
| Sparse numeric/category state | `world-modules.ts` through typed `state-owners.ts` reads/writes; exact pins, disclosure and initialization remain distinct.                                                                                                                  |
| Finite charge                 | `resource-claims.ts` plans native source/recipient transfer; replenishment retains its exact admitted pin and actual transferred amount. Existing fractions are preserved, not quantized.                                                    |
| Discrete resources            | Gathering, craft inputs, food and ammunition use the claim owner; whole item/gathering units have scale one and checked safe arithmetic.                                                                                                     |
| Custody/editor interactions   | The entity-backed object owner refuses spending/merging held stock; partial drop keeps reserved stock in its original identity. Live incoming contribution references prevent split/merge while allowing identity-preserving whole movement. |
| Holds                         | Canonical `sim_resource_reservations`, expiry, consumption and idempotent release; action completion, failure, cancellation, replacement and recovery release unused holds.                                                                  |
| Capability state              | Existing status records, with independently identified contributions, strict lifetime admission, native action discovery, refresh/end and scoped labels.                                                                                     |

Named resource phases evaluate proposal groups against one start state and a shared
availability ledger; only accepted groups contribute writes. Native sequential phases
retain their order. The compatibility charge family retains continuous numbers;
holds on a continuously draining recipient are explicitly unsupported until a family
defines depletion arbitration. Supply holds and integer stock holds are supported.
This restriction prevents native drain from silently spending promised stock.
Sparse and item owner writes also refuse edits, retirement or native rates that would
undercut an existing hold. Coupled consumption settles its own hold before publishing the stock change.
Exact attach/refresh receipts remain replayable after fixed expiry and cold-history eviction;
only new requests must satisfy the current deadline. The follow-up review verified both
SQL adapters and the whole-step refusal boundary. Consumption updates the same reservation
index as admission, retaining canonical continuous summation and exact receipt occupancy.
Warm/cold/fork/deadline checks and repeated whole-unit consumption stress qualify the repair.

New holds bind a current action or admitted native process and claimant. Derived
reservation occupancy joins actor/module/world/host work admission; legacy holds without
claimant evidence retain world/host accounting without invented ownership. Both SQL
adapters preserve exact 17.125-unit holds and their accounting; cancellation releases live
occupancy once, preserves stock and keeps terminal receipt memory accounted. The 2,024-hold
burst reaches the 4 MB actor ceiling before publication of the refused hold. Source-bound
split/merge checks use a reverse contribution index maintained from exact entity writes;
source loss affects effective capability immediately and the native phase finalizes state.

Manual evidence includes two groups dividing ten units as eight and two,
four-unit holds surviving a competing six-unit draw, fully reserved food failing
without changing the world, and two ordinary status-action sources with independent
removal and owner-only projection. SQLite and PostgreSQL restart preserved the complete
serialized world, a 17.125-unit hold and a fixed-lifetime contribution; both rejected
a stale commit. A real browser recharge increased the character's charge while
reducing finite supply. Final compound resource/object/authority scenarios, source retirement, restore, lost acknowledgements and P4 allocation checks now pass. Terminal independent contributions remain canonical but cold after commit; the 2,002-episode lifecycle check preserves exact order, pins, replay and complete save capture on both adapters. Source-sustained and fixed contributions charge their recurring root, and exhausted required work refuses the whole step.

[Verification](../verification.md#foundation-priorities-15--implementation-evidence) owns the actual native, SQL, genuine OIDC/browser and stress evidence. Full source review covered each listed owner and downstream caller. Repeated matched native outcomes preserve old gameplay/RNG, while native CPU costs about 24% more in the mixed fixture. [PF03/09](performance.md#foundations-15-measurements-and-remaining-cost) retains that measured regression and wider capacity work. No live-authoring quality or broader EWF/INV/SL/PF release gate is claimed; required CI remains.

## SC01 — Baseline, caller map and provider ownership

- [x] Inventory every affected reader/writer: need progression, body effects, replenishment, inventory consumption, editor, action catalogue, cognition, view, record codec and save validation. Record exact implementation base and relevant branch changes in the implementation handoff.
- [x] Map each selected state family to its sole native or sparse provider, semantic unit/precision, current order and change key. Preserve unknown/not-applicable distinctions.
- [x] Capture matched native wilderness and charge scenarios; record direct writes to remove and any actual populated precision incompatibilities.

**Dependencies:** DF02 for overlapping branch code. **Exit:** an explicit source-to-owner map and baseline, with no speculative new tables or invented successful runtime checks.

## SC02 — Typed owner operations without gameplay reorder

- [x] Add strict service-specific read/operation codecs and owner resolution over existing manifest pins; route selected native setters, damage and editor operations through them.
- [x] Keep native numerical representation, thresholds, clamp order, phase order and RNG draws unchanged; reject raw paths, incompatible owners and forged sources.
- [x] Preserve unchanged snapshot identities and emit semantic dirty metadata only for real changes.

**Dependencies:** SC01. **Exit:** one value across native/editor/query/save paths; matched wilderness outcomes and explicit negative cases. This does not close general EWF01 registration.

## SC03 — Atomic claim and transfer planning

- [x] Implement stable phase-bound proposal ordering and a bounded temporary availability ledger. Validate all claims before changing an atomic group; consume an existing hold once.
- [x] Implement explicit all-or-nothing and native bounded-partial fulfillment, checked quantities, compatible source/recipient semantics and coupled receipts.
- [x] Persist reservation lifecycle and duplicate request identity through the existing transaction; ambiguous acknowledgement resolves the receipt rather than executing another effect.

**Dependencies:** SC02 and current repository transaction boundary. **Exit:** two competing groups cannot spend the same last resource; stale revisions, changed bodies, overflow, insufficient claims and hidden-source failures preserve state/privacy.

## SC04 — Real stock consumers and precision continuity

- [x] Adapt charge replenishment and one existing native finite-resource consumption path. Preserve current cancellation/work outcomes and resource definitions.
- [x] Establish exact quanta for newly admitted conserved families; inspect existing values before conversion, preserve fractional carry and refuse silent rounding/reset.
- [x] Exercise depletion, full recipient, own/other reservations, pause, variable elapsed partitions, source loss and restart. Retain actual transferred amounts.

**Dependencies:** SC03. **Exit:** ordinary actor/player actions execute through the protocol, including contested partial fulfillment. P2's two-human proof may use this interface before P3's object model ships.

## SC05 — Active contributions with independent removal

- [x] Adapt existing status/capability instances as their single owner; store exact source/contribution identity and explicit supported lifetime.
- [x] Implement duplicate-safe attach/refresh/end and recomputation from current base plus remaining contributors. Keep committed stock changes non-reversible by effect removal.
- [x] Exercise two simultaneous capability blocks, expiry after unrelated healing, repeated removal and source/target retirement.

**Dependencies:** SC02–SC03; current status owner. **Exit:** numeric transfer and nonnumeric capability aggregation share safe envelopes without sharing a false universal reducer. No snapshot rollback or extra status store.

## SC06 — Canonical persistence, activation and save integration

- [x] Extend consumed record codecs/indexes, in-place extraction, reference validation and short atomic commits; retain one writable owner.
- [x] Register contributions/holds/deadlines/carry/pins with SL00 capture and restore; rebuild indexes under fresh timeline/generation.
- [x] Supply EWF07/INV-5 exact detach and migration dependencies. Reject unsupported retirement before publication; preserve current grants, forgetting and spending outside rewind.

**Dependencies:** each introducing slice above; coordinate SL00 and DF02. **Exit:** save/restart/load and failure around publication preserve stock, active effects and progress without paid replay. INV-5's broader law-change scope remains open.

## SC07 — Permitted surfaces and existing authoring bridge

- [x] Project current/unknown/inapplicable state, actual partial fulfillment and permitted causes through existing attribute/status/context/action surfaces.
- [x] Expose supported owner operations, units, limits and lifecycle requirements to INV/EWF12 discovery and candidate validation; retain current permissions and exact approvals.
- [x] Connect meaningful availability/capability changes to EPR/P4 without per-tick paid decisions or a new event bus.

**Dependencies:** SC04–SC06. **Exit:** the same admitted resource works through player/native/NPC/editor paths; hidden claims and causes remain private. A native fixture is not live-authoring quality acceptance.

## SC08 — Integrated evidence and reconciliation

- [x] Run disposable native/manual success and failure scenarios listed in the feature/technical pair with zero provider budget; exercise both supported database adapters and representative browser flows when implementation exists.
- [x] Measure matched before/after mutation latency, allocations, claim/active-instance counts, queue age and cold/warm behavior within PF's mixed workload. Preserve unresolved capacity failures.
- [x] Record evidence in Verification, current implementation in Architecture, affected parent status/dependencies and deferred regression tasks here. Do not author/run automated suites under default delegated instructions; keep CI mandatory.

**Dependencies:** SC01–SC07. **Exit:** complete scenario evidence and honest remaining limitations. No isolated benchmark, schema or passing compile closes EWF/INV/SL/PF release gates.
