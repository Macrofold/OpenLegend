# Runtime performance design

This document owns execution cadence, work budgets, buffering and performance escalation. [Real-time synchronization](../archive/07-technical-architecture/realtime-synchronization.md) owns confirmation, replication and network queues; [production data](../archive/07-technical-architecture/production-data-model.md) owns atomic records; [delivery and scale](../archive/07-technical-architecture/data-delivery-and-scale.md) owns operational recovery and partitioning. State placement and eviction preserve [save/load](save-and-load.md), memory, narration and sensory contracts. Current numeric bounds are in [native-work limits](limits/native-work.md) and [spatial limits](limits/spatial.md).

Registered modules declare dependencies, execution category and bounded work through the [shared runtime contract](../archive/07-technical-architecture/world-module-runtime.md#9-change-dependencies-and-work-budgets). Per-module admission does not replace aggregate host/world limits or authorize global polling and object-local queues. Current delivery and remaining acceptance belong to [PF](maintainers/performance.md).

Animal execution’s [design](projects/performance-overhaul/animal-execution.md) covers shared population preparation and editable-record handling. [PF09](maintainers/performance.md#pf09-animal-execution-continuation) owns installed behavior, applicable measurements and remaining qualification.

## Read by affected mechanism

The detailed chapters own their requirements; these links are conditional, not a reading bundle. Current numeric bounds retain their existing limits owners.

- [Preparation, reuse and retained data](performance/preparation.md): repeated collections, prepared reads, caches, complete results and retained history.
- [Scheduling, admission and fairness](performance/scheduling.md): queues, asynchronous work, workers, recurring scheduling, work admission and publication.
- [Storage execution and transactional persistence](performance/storage.md): queries, schemas/indexes, snapshots and persistence preparation.
- [Spatial, navigation and sensory performance](performance/spatial.md): movement, geometry, navigation preparation and sensory candidates.
- [Performance measurement and interpretation](performance/measurement.md): instrumentation, benchmarks and interpretation of complete-path results.

## Maintained records

- Implementation and acceptance: [Runtime performance](maintainers/performance.md); [profiling tools and workloads](maintainers/performance-profiling.md) support that owner.
- Limits and constraints: [Native work](limits/native-work.md), [spatial work](limits/spatial.md) and [persistence](limits/persistence.md); [diagnostics and inspection](limits/observability.md) owns the instrumentation bounds.
