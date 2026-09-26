# Dependency invalidation — EWF08 subtracker

**Status:** all items below are unimplemented/unqualified by this documentation change. This decomposes [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); EPR05 remains the actual reaction/ActorWork owner, SW owns geometry/query algorithms, INV owns definition admission and PF owns performance evidence. [Feature specification](../projects/dependency-invalidation-feature-spec.md) and [technical design](../projects/dependency-invalidation-tech-design.md) own this proposed shared project.

Obtain design approval before coding and reconcile relevant DF02/hearing/cadence changes before overlapping implementation. Do not introduce another event bus, scheduler or writable graph. Each slice preserves native phase order, RNG, disclosure, elapsed-work semantics and required evidence. New durable state joins SL00 immediately.

## DI01 — Dependency coverage and baseline matrix

- [ ] Map actual query/mutation pairs for spatial sensing, inventory, installed capability, native state bands, accepted knowledge/context and view caches. Include current broad collection dependencies and every membership-changing operation.
- [ ] Trace empty queries, creation/removal, within-cell movement, old/new scope, geometry/sense changes, actor knowledge and definition/authority changes. Mark conservative coverage versus proven precise coverage.
- [ ] Inspect current EPR05/ActorWork and cadence branch changes, record exact bases and matched native query/notification traces. Identify which owner implements each change; do not restart existing fixes.

**Dependencies:** current source review and DF02 where overlapping. **Exit:** explicit coverage matrix and reproducible baseline, with no unproven broad dependency removed or performance claim invented.

## DI02 — Typed semantic changes and mandatory query dependencies

- [ ] Add finite dependency/result codecs and producer metadata at existing semantic mutation/query owners. Distinguish value, existence, membership, geometry, authority, definition and deadline dependencies.
- [ ] Capture old/new scopes before mutation discards them; require membership coverage for empty results and supported property predicates. Actual-read tracing supplements, never replaces, mandatory declarations.
- [ ] Return complete versus budget-exhausted/unavailable explicitly. Do not turn bounded partial work into an empty result or false absence.

**Dependencies:** DI01; P1/P3 owners for their consumers. **Exit:** every supported provider supplies enough metadata to invalidate both positive and negative results, with no arbitrary client-defined predicate or raw persistence-path authority.

## DI03 — Revision-safe subscription installation and acknowledgment

- [ ] Introduce owner/timeline/scope-bound computation identity and monotonically advancing dirty generations in existing consumers; retain old subscriptions until new dependency validation and swap succeed.
- [ ] Compare relevant source/membership revisions at result installation; acknowledge only the captured generation. Retain newer wakeups and reject stale asynchronous publication.
- [ ] Use bounded typed reason sets and existing durable source/cursor references; coalescing tickets cannot mark distinct speech/evidence consumed. Integrate after-commit wake and startup recovery through current repositories.

**Dependencies:** DI02; EPR05 owns ActorWork changes; MP01 owns private egress fencing. **Exit:** update-during-compute, dependency-swap races, rolled-back changes and commit-before-notification crashes do not lose required work or publish stale private content.

## DI04 — Spatial and nonspatial consumer integration

- [ ] Integrate old/new extent and same-cell movement with current SW/EPR candidate indexes; preserve occurrence-time audiences, exact geometry, recipient ordering, recognition and sleep rules.
- [ ] Handle changed blockers, observer senses and relevance of already-exposed objects without synthesizing duplicate entry events.
- [ ] Integrate direct-container and installed-capability membership, including empty-to-nonempty, changed predicate applicability, actor-specific knowledge and definition retirement. Reuse P3/P1 indexes and change owners.

**Dependencies:** DI02–DI03; relevant SW/EPR/P1/P3 slices. **Exit:** unlike spatial and nonspatial queries agree with complete native reference results; conservative coverage remains where precision is unproved. No hidden contents or private query edges leak.

## DI05 — Static aggregate admission and cost contracts

- [ ] Define deterministic work-unit vectors for supported reads/tests/outputs/claims/subscriptions/live and queued instances/retained bytes/depth, with checked composition across complete nested definitions.
- [ ] Reject unbounded/overflowing expansion, unsupported cycles and same-time recursive scheduling. Validate combined installation and invocation demand under current world/host configuration.
- [ ] Reuse INV candidate/impact/activation identity and EWF manifest; inactive library definitions do not count as running work. Expose scoped actionable limit/unsupported explanations without private counts.

**Dependencies:** DI02 and existing family admission. **Exit:** many small definitions cannot evade aggregate bounds, stale approvals cannot overcommit capacity, and validation does not claim arbitrary code is safely preemptible.

## DI06 — Runtime root charging, recurrence and failure containment

- [ ] Reserve required atomic groups across root/actor/module/world/host scopes, charge mandatory native ports and release terminal/unused allocations exactly once. Descendants retain root lineage regardless of new IDs.
- [ ] Support explicit positive-simulation-time recurring policies with finite interval allowance, burst, live/pending and retained-state bounds; no unlimited catch-up credit or child budget reset.
- [ ] Separate required native continuation/evidence from optional model/display/diagnostic work. Reject before acceptance or stop at an existing safe boundary on mandatory contract breach; never truncate recipients, skip damage or commit a partial atomic group as success.

**Dependencies:** DI05; P1/native process owner. **Exit:** nested/recurring/racing reservations and unexpected output breach preserve committed state, bounded queues and truthful failure, without automatic paid retries.

## DI07 — Scheduler, removal and save integration

- [ ] Complete common-contract integration through EPR05's existing ActorWork, current due-work/timer pattern and existing fairness/concurrency. Replace scans only after all creation/removal/capability/deadline hooks are covered.
- [ ] Bind activation/removal to exact dependency pins and owned allocations through INV-5/EWF07; terminate only the removed source's subscriptions/effects and retain required pending state.
- [ ] Register authoritative latches/cursors/root lineage/recurrence progress with SL00. Rebuild derived indexes without new encounters, preserve current authority and external accounting, and reconcile restored gameplay allocations rather than double-reserving host resources.

**Dependencies:** DI03–DI06; EPR05, SL00, MP01 and INV/EWF lifecycle owners. **Exit:** restart/restore/removal preserve required work and current privacy; no second scheduler, replayed effect or newly created real spending allowance.

## DI08 — Differential correctness and mixed-workload evidence

- [ ] Exercise every paired-spec scenario with disposable native/manual checks and zero provider budget. Compare complete optimized membership/order/audience/evidence against an independent complete reference on matched snapshots.
- [ ] Measure old/new scope, empty results, within-cell motion, burst geometry changes, update-during-work, large nested/recurring work, mature history and cold rebuilds through PF's existing counters and matched workloads.
- [ ] Record actual evidence in Verification, delivered behavior in Architecture and remaining query/reaction/cadence/hosted regression gates in their owners. Preserve required CI; do not author/run automated suites under the default delegated workflow.

**Dependencies:** DI01–DI07. **Exit:** correctness and boundedness are evidenced through real consumers. Lower CPU alone does not close EPR, PF/D5 capacity or D6 regional execution acceptance.
