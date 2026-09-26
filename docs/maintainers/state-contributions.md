# State contributions — EWF02–03 / INV-6.3 subtracker

**Status:** designed, not implemented or qualified by this documentation change. This is the detailed decomposition of shared contribution/claim work under [EWF02–03](extensible-world-foundation.md#ewf02--typed-state-providers-and-one-authoritative-value) and [INV-6.3](inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes), not another state or invention authority. Parent completion still requires its own remaining scope. [Feature specification](../projects/shared-state-contributions-feature-spec.md) and [technical design](../projects/shared-state-contributions-tech-design.md) own the proposed project.

All items below are open. Before coding, obtain project approval under the design workflow and reconcile accepted contracts into their persistent owners. Read current branch implementations through DF02; do not restart the existing invention workflow. Each slice joins SL00 when it introduces durable state, rather than deferring recovery until the final batch.

## SC01 — Baseline, caller map and provider ownership

- [ ] Inventory every affected reader/writer: need progression, body effects, replenishment, inventory consumption, editor, action catalogue, cognition, view, record codec and save validation. Record exact implementation base and relevant branch changes in the implementation handoff.
- [ ] Map each selected state family to its sole native or sparse provider, semantic unit/precision, current order and change key. Preserve unknown/not-applicable distinctions.
- [ ] Capture matched native wilderness and charge scenarios; record direct writes to remove and any actual populated precision incompatibilities.

**Dependencies:** DF02 for overlapping branch code. **Exit:** an explicit source-to-owner map and baseline, with no speculative new tables or invented successful runtime checks.

## SC02 — Typed owner operations without gameplay reorder

- [ ] Add strict service-specific read/operation codecs and owner resolution over existing manifest pins; route selected native setters, damage and editor operations through them.
- [ ] Keep native numerical representation, thresholds, clamp order, phase order and RNG draws unchanged; reject raw paths, incompatible owners and forged sources.
- [ ] Preserve unchanged snapshot identities and emit semantic dirty metadata only for real changes.

**Dependencies:** SC01. **Exit:** one value across native/editor/query/save paths; matched wilderness outcomes and explicit negative cases. This does not close general EWF01 registration.

## SC03 — Atomic claim and transfer planning

- [ ] Implement stable phase-bound proposal ordering and a bounded temporary availability ledger. Validate all claims before changing an atomic group; consume an existing hold once.
- [ ] Implement explicit all-or-nothing and native bounded-partial fulfillment, checked quantities, compatible source/recipient semantics and coupled receipts.
- [ ] Persist reservation lifecycle and duplicate request identity through the existing transaction; ambiguous acknowledgement resolves the receipt rather than executing another effect.

**Dependencies:** SC02 and current repository transaction boundary. **Exit:** two competing groups cannot spend the same last resource; stale revisions, changed bodies, overflow, insufficient claims and hidden-source failures preserve state/privacy.

## SC04 — Real stock consumers and precision continuity

- [ ] Adapt charge replenishment and one existing native finite-resource consumption path. Preserve current cancellation/work outcomes and resource definitions.
- [ ] Establish exact quanta for newly admitted conserved families; inspect existing values before conversion, preserve fractional carry and refuse silent rounding/reset.
- [ ] Exercise depletion, full recipient, own/other reservations, pause, variable elapsed partitions, source loss and restart. Retain actual transferred amounts.

**Dependencies:** SC03. **Exit:** ordinary actor/player actions execute through the protocol, including contested partial fulfillment. P2's two-human proof may use this interface before P3's object model ships.

## SC05 — Active contributions with independent removal

- [ ] Adapt existing status/capability instances as their single owner; store exact source/contribution identity and explicit supported lifetime.
- [ ] Implement duplicate-safe attach/refresh/end and recomputation from current base plus remaining contributors. Keep committed stock changes non-reversible by effect removal.
- [ ] Exercise two simultaneous capability blocks, expiry after unrelated healing, repeated removal and source/target retirement.

**Dependencies:** SC02–SC03; current status owner. **Exit:** numeric transfer and nonnumeric capability aggregation share safe envelopes without sharing a false universal reducer. No snapshot rollback or extra status store.

## SC06 — Canonical persistence, activation and save integration

- [ ] Extend consumed record codecs/indexes, in-place extraction, reference validation and short atomic commits; retain one writable owner.
- [ ] Register contributions/holds/deadlines/carry/pins with SL00 capture and restore; rebuild indexes under fresh timeline/generation.
- [ ] Supply EWF07/INV-5 exact detach and migration dependencies. Reject unsupported retirement before publication; preserve current grants, forgetting and spending outside rewind.

**Dependencies:** each introducing slice above; coordinate SL00 and DF02. **Exit:** save/restart/load and failure around publication preserve stock, active effects and progress without paid replay. INV-5's broader law-change scope remains open.

## SC07 — Permitted surfaces and existing authoring bridge

- [ ] Project current/unknown/inapplicable state, actual partial fulfillment and permitted causes through existing attribute/status/context/action surfaces.
- [ ] Expose supported owner operations, units, limits and lifecycle requirements to INV/EWF12 discovery and candidate validation; retain current permissions and exact approvals.
- [ ] Connect meaningful availability/capability changes to EPR/P4 without per-tick paid decisions or a new event bus.

**Dependencies:** SC04–SC06. **Exit:** the same admitted resource works through player/native/NPC/editor paths; hidden claims and causes remain private. A native fixture is not live-authoring quality acceptance.

## SC08 — Integrated evidence and reconciliation

- [ ] Run disposable native/manual success and failure scenarios listed in the feature/technical pair with zero provider budget; exercise both supported database adapters and representative browser flows when implementation exists.
- [ ] Measure matched before/after mutation latency, allocations, claim/active-instance counts, queue age and cold/warm behavior within PF's mixed workload. Preserve unresolved capacity failures.
- [ ] Record evidence in Verification, current implementation in Architecture, affected parent status/dependencies and deferred regression tasks here. Do not author/run automated suites under default delegated instructions; keep CI mandatory.

**Dependencies:** SC01–SC07. **Exit:** complete scenario evidence and honest remaining limitations. No isolated benchmark, schema or passing compile closes EWF/INV/SL/PF release gates.
