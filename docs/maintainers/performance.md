## Delivery status

PF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 include delivered work below. Remaining qualification stays unchecked. PF10 includes local SQLite worker isolation, not a production-scaling result; further simulation/serialization workers and additional PF04 connection isolation remain conditional. PF06/PF07 and PF11 remain gated. PostgreSQL-first measurement policy is in [the profiling guide](performance-profiling.md#primary-performance-baseline).

This pass stops before multiplayer admission, per-player replication, the unattended-world toggle and verification with 100 agents, 100 players and thousands of animals. The local host's gameplay epoch mechanism is independent of future multiplayer controller admission. Native animals retain full simulation fidelity; dormancy and analytic updates remain gated on semantic equivalence.
## PF03 — Native CPU and incremental admission

- [x] Remove repeated attribute-definition proxy traversal and dense sight-cache sequential eviction, with matched snapshot replay digests and measured CPU/elapsed comparisons in [Verification](../verification.md#simulation-and-cognition-audit).

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.


## PF04 — Optional database isolation

- [x] Eliminate redundant monthly billing-history fetch/parse work before considering another connection: share usage reads until accounting writes or month rollover, while leaving reservation authority uncached. Read-only PostgreSQL and local accounting lifecycle observations are recorded in Verification.

Dependencies: PF01/PF02 and measured remaining contention.

## PF09 — Population work follows relevance

- [ ] Qualify the measured dense acquisition and moving-observer costs from the simulation/cognition audit: the 344-entity cold mixed fixture missed 3×, and 164 crowded entities had only 1.31× native headroom at 1×. Extend EPR02/EPR05 change-scoped work before claiming population capacity; retain real evidence and indivisible-step latency reporting.

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.
- [ ] Profile affected-actor active-awareness index/edit scans and flat-array copy-on-write under growing history before paged active evidence or a new retained-state representation. Any grouping must retain exact source identities, audience, event-time knowledge and revocation. No lossless paging or asynchronous authoritative history projection is implemented by the bounded SQL-row buffer.
- [ ] Complete longer repeated SQLite/PostgreSQL full-server cases, 30-minute soaks, browser timing, slow readers and explicit no-network cognition/maintenance work. The PostgreSQL history fixture alone is not end-to-end acceptance.

## Reconciliation performance follow-up

Use the [PostgreSQL-first baseline](performance-profiling.md#primary-performance-baseline). This review retains the existing DP/PF optimizations and makes no population-capacity claim.

- [x] Preserve new wakes during asynchronous maintenance reads by acknowledging the captured `ActorWork` generation; use the existing ordered evidence iterator for the any-memory query.
- [ ] PF09: replace per-observer changed-source scans with scoped old/new-position invalidation only after matched profiling; moving sources must still invalidate stationary observers.
- [ ] PF03/PF09: preserve reusable perception work across irrelevant command snapshots using exact dependency identity, without reading stale transforms or leaking private state. Do not add a writable second perception owner.
- [ ] PF03/PF08: measure remaining entity-handle/frame reconstruction, retained-awareness copying and finalization on PostgreSQL-backed workloads before introducing regional indexes or paged evidence.
- [ ] Qualify maintenance paging fairness and wake preservation, stationary/changed contact geometry and first-acquisition identity across restart and interleaved commands. Keep actual render latency and live model behavior separate from no-provider measurements.
