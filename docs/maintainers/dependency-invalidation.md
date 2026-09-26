# Dependency invalidation — EWF08 subtracker

**Status:** implemented and qualified for the approved finite foundation scope; hosted capacity and broader parent work remain separate. This decomposes [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); EPR05 remains the actual reaction/ActorWork owner, SW owns geometry/query algorithms, INV owns definition admission and PF owns performance evidence. [Feature specification](../projects/dependency-invalidation-feature-spec.md) and [technical design](../projects/dependency-invalidation-tech-design.md) own this approved shared project.

Implementation is approved under the [foundation plan](../projects/foundations-1-5.md#approved-implementation-plan), including the recorded DF02/hearing/cadence seams. Do not introduce another event bus, scheduler or writable graph. Each slice preserves native phase order, RNG, disclosure, elapsed-work semantics and required evidence. New durable state joins SL00 immediately.

## Execution notes and dependency coverage — September 26, 2026

Typed dependency/query results, semantic change metadata, root membership, generation/source
fences, native work ports and status allocation accounting are now implemented in this branch.
The finite-consumer integration audit and native/database/browser qualification are complete. The following matrix guides DI02–DI07; broad dependencies stay in place until each narrower scope is proved.

| Consumer / owner                                                  | Current coverage                                                                   | Required producers and invalidation                                                                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spatial candidates / domain spatial and native encounter          | Immutable entity collection; draft/phase rebuild                                   | Root creation/removal, old/new placement including same-cell changes, actor participation/body/senses, geometry and installed sense pins. Contained item rows do not become spatial candidates. |
| Direct inventory / object owner, view and page                    | Indexed parent IDs; ancestor inventory/subtree revisions; current P2 scope         | Create/retire, source/destination membership, quantity, attachment, declared ownership, load policy, root custody and timeline/grant changes. Empty parents retain a revision dependency.       |
| Installed/native capabilities / module manifest and status policy | Whole immutable definition/policy collections                                      | Install/retire, exact pin and applicable family membership; actor knowledge and capability applicability remain separate.                                                                       |
| State/resources / typed state and claim owners                    | Native body/need/attribute revisions plus reservation owner                        | Value and relevant band changes, held/free quantity, supply existence, source/target removal, contribution attachment/end/expiry and exact policy pins.                                         |
| Private context / knowledge, experience, accepted publication     | Existing source snapshots and actor collections                                    | Correction/forgetting, document/appraisal/goal revisions, live obligations, timeline and current audience. Durable evidence is separate from a coalesced ticket.                                |
| ActorWork / AiDirector and maintenance                            | Generation captured before asynchronous work; acknowledge matching generation only | Retain new reasons/deadlines during computation and subscription replacement; bootstrap due work from canonical evidence/current actors. No paid dispatch from an uncommitted change.           |

The P3 wide-container experiment shows a specific remaining cost: at 10k/50k lots, pages
remain about 0.04 ms median and root movement writes five SQL rows in both cases, while
transition publication and full record enumeration grow with the flat resident entity map.
The 50k run measured 74.26 ms median / 122.39 ms p95 root transition, 74.90 ms record
preparation and 954.91 ms for ten native seconds. These are individual characterization
runs, not matched speedups. Preserve the existing Immer authority boundary and measure
targeted indexing/write-set reuse before considering a larger state representation change.

The implementation below supplies the finite dependency and aggregate-work contracts.
Whole-collection fallback remains for unclassified changes; no cell-level precision or
replacement scheduler is claimed. Final review verified native port coverage and current installation/restore limits.

### Current implementation and native evidence

- `dependencies.ts` owns the finite value/existence/membership/geometry/pin/scope/deadline
  union. Contents, installed state discovery and cognitive spatial reads consume typed
  complete/unavailable/budget-exhausted results. Empty reads retain membership dependencies.
  Broad collection dependencies remain intentionally conservative; no cell-level precision
  or full replacement of ActorWork's actor scan is claimed.
- Movement captures old/new coordinates before draft revocation. Object membership,
  availability/holds, body/attribute/contribution/participation, knowledge and geometry
  owners publish coalesced metadata. Unclassified writers still mark conservative change.
  ActorWork validates captured sources and generation before swapping subscriptions and
  acknowledging; source changes and a newer explicit wake remain pending.
- Root membership avoids treating contained lots as spatial candidates. Same-phase readers
  resolve current entity values. Canonical persistence uses an exact bounded immutable
  write lineage for value-only entity changes. Insert/delete, forks, mutable builders,
  missing/collected links and cold paths retain the full ordered diff.
- `work-budget.ts` uses checked deterministic vectors and full expansion composition,
  parent/root lineage, actor/module/world live accounting, positive-time interval credit,
  finite burst and explicit terminal release. Status effects are the first persisted
  recurring native consumer with exact definition pins; current native work validation
  rejects roots without their active status owner. Generic descendant accounting was
  exercised as a native contract scenario, not claimed as a new generated effect family.
- The synchronous command/advance owner shares one meter with nested work. Resource claims,
  contents/candidate queries, native condition/perception tests, effects and event output
  charge native ports. Exhaustion discards the candidate; WorldService preserves time/debt
  and pauses required work with an explicit error. Startup/restore reconstruct missing
  status allocations without resetting saved interval progress. HostWork reserves current
  process capacity through SQL commit; multi-process distributed admission is unsupported.
  Physical eligibility catches propagate exhausted enclosing meters; they cannot convert a
  budget breach into an ordinary unavailable item and let a required phase publish a prefix.
  Follow-up native transfer, quantity planning and pickup scenarios verified this boundary.
- Nested query meters charge every enclosing execution allowance while retaining the local
  query limit. A persistent allocation index tracks actor/module/world resident stock;
  execution counters and maximum depth cannot masquerade as releasable allocations.
  Installed manifest bytes and native subscription footprint join host reservations.
  `/tmp/foundations-work-host-20260926.mjs` exercised nested-meter failure/recovery and
  simultaneous pending worlds, replacement refusal and rollback without overselling the
  host ceiling. Its allocation-only fixture is not a complete-world capacity benchmark.
- The versioned `native-work-v1` ceilings are operational containment bounds, **not** a
  qualified hosted capacity claim. Native status work permits up to 1024 existing subsecond
  samples per simulated second; normal server advancement remains one sample per second.
  No phase order, native rate, saved random draw or provider allowance was changed.

Disposable native evidence, provider budget $0:

- `/tmp/foundations-work-journey-v2-20260926.mjs`: real Sleep → two native seconds → SQLite
  reload → Wake preserved the allocation exactly and released it. Captured-generation
  and same-cell source races rejected stale acknowledgments. A zero-candidate spatial
  budget returned `budget-exhausted`. A native 100×100 expansion composed to 10,000 effects;
  nested overcommit and same-interval burst were refused, same-time interval reset granted
  no credit, and advancing 100 seconds granted only one bounded current interval.
- `/tmp/foundations-bag-work-journey-20260926.mjs`: the complete HTTP bag journey was
  repeated after the P4 changes against fresh SQLite and PostgreSQL fixtures. Both retained
  nested loads/identity, rejected cycles/nonempty retirement/foreign inventory, completed
  drop/pickup with empty-pile removal, and captured cold retirement/lineage.
- `/tmp/foundations-dependencies-roundtrip-20260926.mjs`: seed 73 retained the prior
  180-second outcome (24 events, RNG 4074112313), nested bag quantities and exact SQLite
  roundtrip. An earlier attempt deliberately reused an existing disposable database and
  correctly failed its revision-zero commit; it was rerun against a fresh fixture.
- First 50k-lot root-index run: ten native seconds 90.96 ms versus the earlier 954.91 ms,
  with the same 26 events/RNG 161870872. A subsequent value-write-set run measured 76.54 ms
  native, 1.19 ms warm record preparation, 477.82 ms full initial preparation, and the same
  five changed rows as an independent complete diff. Root movement still cost 71.98 ms
  median / 96.87 ms p95. These are characterization runs, not repeated matched capacity
  qualification; the latter run's heap includes the intentionally cloned full reference.

The final cold/fork/root-membership comparisons, both-adapter wide SQL workload, mature
contribution residency and P5 integration are recorded in [Verification](../verification.md#foundation-priorities-15--implementation-evidence).
Independent capability contributions now charge their admitted recurring status-work root;
exhaustion refuses the complete native step without advancing time. The complete source/port review and parent reconciliation are complete. The measured 24% native CPU increase and unqualified hosted rate remain explicit [PF limitations](performance.md#foundations-15-measurements-and-remaining-cost).

## DI01 — Dependency coverage and baseline matrix

- [x] Map actual query/mutation pairs for spatial sensing, inventory, installed capability, native state bands, accepted knowledge/context and view caches. Include current broad collection dependencies and every membership-changing operation.
- [x] Trace empty queries, creation/removal, within-cell movement, old/new scope, geometry/sense changes, actor knowledge and definition/authority changes. Mark conservative coverage versus proven precise coverage.
- [x] Inspect current EPR05/ActorWork and cadence branch changes, record exact bases and matched native query/notification traces. Identify which owner implements each change; do not restart existing fixes.

**Dependencies:** current source review and DF02 where overlapping. **Exit:** explicit coverage matrix and reproducible baseline, with no unproven broad dependency removed or performance claim invented.

## DI02 — Typed semantic changes and mandatory query dependencies

- [x] Add finite dependency/result codecs and producer metadata at existing semantic mutation/query owners. Distinguish value, existence, membership, geometry, authority, definition and deadline dependencies.
- [x] Capture old/new scopes before mutation discards them; require membership coverage for empty results and supported property predicates. Actual-read tracing supplements, never replaces, mandatory declarations.
- [x] Return complete versus budget-exhausted/unavailable explicitly. Do not turn bounded partial work into an empty result or false absence.

**Dependencies:** DI01; P1/P3 owners for their consumers. **Exit:** every supported provider supplies enough metadata to invalidate both positive and negative results, with no arbitrary client-defined predicate or raw persistence-path authority.

## DI03 — Revision-safe subscription installation and acknowledgment

- [x] Introduce owner/timeline/scope-bound computation identity and monotonically advancing dirty generations in existing consumers; retain old subscriptions until new dependency validation and swap succeed.
- [x] Compare relevant source/membership revisions at result installation; acknowledge only the captured generation. Retain newer wakeups and reject stale asynchronous publication.
- [x] Use bounded typed reason sets and existing durable source/cursor references; coalescing tickets cannot mark distinct speech/evidence consumed. Integrate after-commit wake and startup recovery through current repositories.

**Dependencies:** DI02; EPR05 owns ActorWork changes; MP01 owns private egress fencing. **Exit:** update-during-compute, dependency-swap races, rolled-back changes and commit-before-notification crashes do not lose required work or publish stale private content.

## DI04 — Spatial and nonspatial consumer integration

- [x] Integrate old/new extent and same-cell movement with current SW/EPR candidate indexes; preserve occurrence-time audiences, exact geometry, recipient ordering, recognition and sleep rules.
- [x] Handle changed blockers, observer senses and relevance of already-exposed objects without synthesizing duplicate entry events.
- [x] Integrate direct-container and installed-capability membership, including empty-to-nonempty, changed predicate applicability, actor-specific knowledge and definition retirement. Reuse P3/P1 indexes and change owners.

**Dependencies:** DI02–DI03; relevant SW/EPR/P1/P3 slices. **Exit:** unlike spatial and nonspatial queries agree with complete native reference results; conservative coverage remains where precision is unproved. No hidden contents or private query edges leak.

## DI05 — Static aggregate admission and cost contracts

- [x] Define deterministic work-unit vectors for supported reads/tests/outputs/claims/subscriptions/live and queued instances/retained bytes/depth, with checked composition across complete nested definitions.
- [x] Reject unbounded/overflowing expansion, unsupported cycles and same-time recursive scheduling. Validate combined installation and invocation demand under current world/host configuration.
- [x] Reuse INV candidate/impact/activation identity and EWF manifest; inactive library definitions do not count as running work. Expose scoped actionable limit/unsupported explanations without private counts.

**Dependencies:** DI02 and existing family admission. **Exit:** many small definitions cannot evade aggregate bounds, stale approvals cannot overcommit capacity, and validation does not claim arbitrary code is safely preemptible.

## DI06 — Runtime root charging, recurrence and failure containment

- [x] Reserve required atomic groups across root/actor/module/world/host scopes, charge mandatory native ports and release terminal/unused allocations exactly once. Descendants retain root lineage regardless of new IDs.
- [x] Support explicit positive-simulation-time recurring policies with finite interval allowance, burst, live/pending and retained-state bounds; no unlimited catch-up credit or child budget reset.
- [x] Separate required native continuation/evidence from optional model/display/diagnostic work. Reject before acceptance or stop at an existing safe boundary on mandatory contract breach; never truncate recipients, skip damage or commit a partial atomic group as success.

**Dependencies:** DI05; P1/native process owner. **Exit:** nested/recurring/racing reservations and unexpected output breach preserve committed state, bounded queues and truthful failure, without automatic paid retries.

## DI07 — Scheduler, removal and save integration

- [x] Complete common-contract integration through EPR05's existing ActorWork, current due-work/timer pattern and existing fairness/concurrency. Replace scans only after all creation/removal/capability/deadline hooks are covered.
- [x] Bind activation/removal to exact dependency pins and owned allocations through INV-5/EWF07; terminate only the removed source's subscriptions/effects and retain required pending state.
- [x] Register authoritative latches/cursors/root lineage/recurrence progress with SL00. Rebuild derived indexes without new encounters, preserve current authority and external accounting, and reconcile restored gameplay allocations rather than double-reserving host resources.

**Dependencies:** DI03–DI06; EPR05, SL00, MP01 and INV/EWF lifecycle owners. **Exit:** restart/restore/removal preserve required work and current privacy; no second scheduler, replayed effect or newly created real spending allowance.

## DI08 — Differential correctness and mixed-workload evidence

- [x] Exercise every paired-spec scenario with disposable native/manual checks and zero provider budget. Compare complete optimized membership/order/audience/evidence against an independent complete reference on matched snapshots.
- [x] Measure old/new scope, empty results, within-cell motion, burst geometry changes, update-during-work, large nested/recurring work, mature history and cold rebuilds through PF's existing counters and matched workloads.
- [x] Record actual evidence in Verification, delivered behavior in Architecture and remaining query/reaction/cadence/hosted regression gates in their owners. Preserve required CI; do not author/run automated suites under the default delegated workflow.

**Dependencies:** DI01–DI07. **Exit:** correctness and boundedness are evidenced through real consumers. Lower CPU alone does not close EPR, PF/D5 capacity or D6 regional execution acceptance.
