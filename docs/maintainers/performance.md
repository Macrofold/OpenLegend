## Delivery status

PF00/PF01/PF02/PF03/PF05/PF08/PF09 now include delivered work below. Remaining measurement, failure coverage and legacy compatibility work stay unchecked. PF10 now includes measured local SQLite worker isolation; additional simulation/serialization workers remain conditional. PF04/PF06/PF07 remain conditional without evidence justifying their extra mechanisms. PF11 is explicitly deferred.

This pass stops before multiplayer admission, per-player replication, the unattended-world toggle and verification with 100 agents, 100 players and thousands of animals. The local host's gameplay epoch mechanism is independent of future multiplayer controller admission. Native animals retain full simulation fidelity; dormancy and analytic updates remain gated on semantic equivalence.
## PF03 — Native CPU and incremental admission

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.


## PF04 — Optional database isolation

Dependencies: PF01/PF02 and measured remaining contention.

## PF09 — Population work follows relevance

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.
- [ ] Profile affected-actor active-awareness index/edit scans and flat-array copy-on-write under growing history before paged active evidence or a new retained-state representation. Any grouping must retain exact source identities, audience, event-time knowledge and revocation. No lossless paging or asynchronous authoritative history projection is implemented by the bounded SQL-row buffer.
- [ ] Complete longer repeated SQLite/PostgreSQL full-server cases, 30-minute soaks, browser timing, slow readers and explicit no-network cognition/maintenance work. The PostgreSQL history fixture alone is not end-to-end acceptance.
