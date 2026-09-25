| Thousands of concurrent actors/players | Fenced ownership and region/interest-based replication following the existing scale design                                        | Real load envelope, transfers, fairness, privacy, recovery and concentrated-crowd limits established                     |

Memory maintenance is never a freeze gate for time or input. When due work is large, preserve sources and process request-sized groups through the existing execution owner. Do not reintroduce a stored-count/byte trigger, pending-tier drain or dropped actor evidence under a performance label. Explicit storage failure remains an error boundary.

Do not build sector sharding, Redis/Kafka, binary transport, a generalized actor framework or a worker per creature for the current world. Prefer independent worlds across processes first. Within a world, partition only where interactions can tolerate explicit boundaries. Actual audience delivery may legitimately cost proportional to the audience; no index can make thousands of real recipients free.

Keep CPU-bound work in a worker only when it removes a measured event-loop bottleneck after work reduction. A worker holding an entire world's active state should receive intentions and send permitted deltas, not exchange whole-world snapshots with the main thread every frame. Async PostgreSQL/provider I/O does not need a worker. Optional path/serialization jobs use versioned compact inputs and have their results revalidated by the owner.

## Primary backend and remaining native scaling

Use [the PostgreSQL-first baseline](maintainers/performance-profiling.md#primary-performance-baseline) for production decisions. SQLite worker isolation is local-only evidence; it is not a reason to add a PostgreSQL worker. Native-only profiles isolate computation but cannot certify a full-server workload.

The current exposure cache conservatively binds complete snapshots. A future narrower dependency key must include relevant geometry, sense/body policy, old/new source positions and observer state before it survives unrelated commands. Regional changed-source lookup must preserve source entry/removal effects on stationary observers. These are targeted PF09 candidates, not permission to reduce sensory fidelity or create duplicate authoritative state.
