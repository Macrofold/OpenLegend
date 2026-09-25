## Delivery status

PF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 include delivered work below. Remaining qualification stays unchecked. PF10 includes local SQLite worker isolation, not a production-scaling result; further simulation/serialization workers and additional PF04 connection isolation remain conditional. PF06/PF07 and PF11 remain gated. PostgreSQL-first measurement policy is in [the profiling guide](performance-profiling.md#primary-performance-baseline).

This pass stops before multiplayer admission, per-player replication, the unattended-world toggle and verification with 100 agents, 100 players and thousands of animals. The local host's gameplay epoch mechanism is independent of future multiplayer controller admission. Native animals retain full simulation fidelity; dormancy and analytic updates remain gated on semantic equivalence.
## PF03 — Native CPU and incremental admission

Memory retention/consolidation must never pause native time or user input. Do not reintroduce stored-memory count/byte pressure, candidate tiers or freeze-until-drained policy while optimizing memory execution. Request/provider envelopes remain bounded; useful chunking must preserve all selected sources and runtime fairness. CR02/CR03 own retention boundaries.

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.


## PF04 — Optional database isolation

The current owner UI applies lower timeouts to read-only PostgreSQL history transactions; rows are materialized before larger actor-scoped projection. This is partial budget enforcement, not a separate connection or cancellation system.

Dependencies: PF01/PF02 and measured remaining contention.

## PF09 — Population work follows relevance

Changed-state correctness includes per-actor interpretation/scheduler state; inspect topology/refinement and invalidation together. Dynamic content counts are not execution budgets. Prefer dirty scopes and bounded request/work streams over hard content-count ceilings, and never silently lose sources/contacts/obligations to meet a performance target.

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.
- [ ] Profile affected-actor active-awareness index/edit scans and flat-array copy-on-write under growing history before paged active evidence or a new retained-state representation. Any grouping must retain exact source identities, audience, event-time knowledge and revocation. No lossless paging or asynchronous authoritative history projection is implemented by the bounded SQL-row buffer.
- [ ] Complete longer repeated SQLite/PostgreSQL full-server cases, 30-minute soaks, browser timing, slow readers and explicit no-network cognition/maintenance work. The PostgreSQL history fixture alone is not end-to-end acceptance.

## Reconciliation performance follow-up

- [x] Remove redundant maintenance recall materialization for an any-memory check and acknowledge only the inspected ActorWork generation. Keep a single pending-work owner in the director and shared Jev questions; no additional per-tick inference or scheduler was introduced.
- [ ] Replace global changed-source checks with regional invalidation only after matched profiling; preserve old/new positions, geometry/senses, removal and body capability changes.
- [ ] Preserve perception reuse across unrelated commands using relevant immutable dependencies rather than adding an unscoped cache. Current exact-snapshot cache is conservative but may redo work.
- [ ] Qualify full PostgreSQL timer, persistence, HTTP/SSE and explicit no-network cognition/maintenance load under the [primary baseline policy](performance-profiling.md#primary-performance-baseline). Short pinned runtime observations are not a 30-minute soak, browser or dense-world capacity pass.
