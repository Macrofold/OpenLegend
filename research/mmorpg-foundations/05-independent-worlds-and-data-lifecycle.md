# Independent seed worlds and long-lived data

The working scenario is many copies of one seed world, each with its own evolving history. The architectural opportunity is substantial sharing of immutable starting material with independent mutable authority. The danger is assuming that identical beginnings make worlds interchangeable forever.

## Seed, created world and execution session

A seed is a pinned starting definition and its dependencies. A created world is one particular history with its own identities, time, state and operational bindings. A hosting process is a replaceable executor. A player session is a temporary participation relationship. None should be used as an implicit substitute for another.

[AWS's persistent-world guidance](sources.md#s01) provides a concrete example of durable world/session mapping. Its cloud services are not selected here; the relevant requirement is that a world can stop, reopen on another process and still be the same world. Existing OpenLegend creation, restore, authority and NSC boundaries should supply that lifecycle rather than a second “MMO world manager” with its own source of truth.

At creation, instantiate a fresh world against exact seed/definition pins through the existing initializer and authorized creation owner. Record enough provenance to explain which starting material it used. Later, restoring it reads its actual current state; it does not rerun creation. Changing a shared seed must not silently update existing mutable worlds.

There is no requirement to make every world's initial local IDs different. There is a requirement that equal local IDs in two worlds cannot collide at an authority boundary. Identity scope must survive caches, delayed jobs, save selections, exports, metrics and UI reconnects. A world-scoped lookup may use a cheap local handle internally; that handle must not escape as a permanent address.

## What can be shared

Potentially share immutable assets, definition blobs and unchanged canonical starting material when existing rights, pins, reference lifetimes and lookup semantics permit it. Such sharing can begin with ordinary immutable definitions and assets already supported by the repository. A sophisticated storage-level copy-on-write fork system is not a prerequisite to two correct seed copies.

Every world's mutations, personal evidence, time progression, ownership, jobs and history remain separate. A shared source definition does not grant access to another world's private records. A shared content hash is a storage identity, not an authorization token.

Optional future copy-on-write storage must account for deletion tombstones, changed records, checkpoint pinning, reference reclamation and the cost of resolving overlays. Long overlay chains can turn cheap creation into expensive reads and restore. An immutable baseline also needs a reliable retention owner: deleting a seed artifact must not break worlds that still depend on it. Evaluate these tradeoffs against measured creation/storage costs before implementation.

A simple model is `shared immutable bytes + sum(per-world mutable bytes + per-world retained history)`, plus indexes and operational copies. As worlds diverge, the mutable term grows independently. This model explains why shared seeds help but cannot collapse 1,000 lived worlds into one synchronized database image.

## World lifecycle and lifecycle admission

The eventual design should make these states explicit in the existing owner: creating, available/running under an offered service, deliberately suspended, loading/recovering, unavailable after failure, and retiring/deleting under policy. Exact names and storage fields are design work; the important point is that a human connection count cannot define them.

A restart or scale-down must have a declared accepted cut, durability state, outstanding work classification and routing transition. A disconnected player cannot be silently moved to a different seed copy because it has spare room. A world with no humans may still have funded autonomous work; a cold stored world may have no promise to advance until reactivated.

World startup can itself be expensive: state loading, validation, index reconstruction, navigation preparation, initial exposure, player captures and provider eligibility. Bound concurrent starts and account for startup capacity separately from steady-state population. A mass return after maintenance should not launch every world's most expensive work simultaneously without admission.

The first useful validation uses two independent worlds in one process or ordinary existing host arrangement, then restores one with fresh process-local state. It does not require a multi-machine directory, global scheduler or Kubernetes deployment.

## Do not confuse three kinds of partition

A logical world is a semantic identity. A simulation cell is an ownership/locality unit. A database partition is a storage/query organization. There is no requirement for one of each per machine. A small world may share a host and database with others; a large world may later span many compute owners while retaining the initial centralized writer.

[Earlier OpenLegend scale notes](../../archive/07-technical-architecture/data-delivery-and-scale.md) already require world-qualified records and caution against cross-world transactions in ordinary gameplay. Preserve that route. Account/catalog/discovery services can legitimately be global, but they should not require scanning all world states for each player interaction. Cross-world travel or a genuinely shared campaign is a separately designed product operation, not an accidental SQL join.

[PostgreSQL's partitioning rules](sources.md#s17) show why key/constraint design matters before physical placement. Its [multicolumn-index documentation](sources.md#s18) shows why query shape matters, not merely an index's existence. This research does not select partition-per-world tables, schema-per-world, database-per-world, a new distributed database, or a partition count. Establish exact world/owner key semantics and representative query coverage now; choose placement later.

## Current state, personal knowledge, history and operational receipts

These data classes have different purposes and lifetimes:

| Class | Necessary meaning | Scaling risk |
| --- | --- | --- |
| Current physical/canonical state and active continuation | What exists and what accepted work is underway | Loading all geography, whole-record rewrite amplification or loss of pending effects |
| Personal current knowledge and required support | What a particular actor can legitimately know and act upon | Treating a cache eviction or physical unload as forgetting; sharing private evidence |
| Retained chronological experience and narrative artifacts | What remains available from a particular perspective with actual precision | Endless detail growth, source pin chains, global history scans |
| Immutable definitions and assets | Exact installed meanings and presentation dependencies | Premature reclamation or unbounded duplicate materialization |
| Operational receipts, billing, grants and privacy fences | Effects and restrictions that may outlive gameplay rewind | Duplicate external work, restored authority or lost accounting after recovery |
| Diagnostics and prepared consumer captures | Temporary explanation/transport products | Accidentally pinning whole old worlds indefinitely |

Existing BK, schema, history-residency and NSC work already establish much of this separation. Preserve it. Do not impose a second event log to “make everything replayable,” or log every changing coordinate forever in the name of persistence. Meaningful events, current state and recovery coverage have distinct owners.

Retention is not only a logical row-count problem. [PostgreSQL documents](sources.md#s19) that updated/deleted row versions require vacuuming and that ordinary vacuum generally makes space reusable rather than returning it to the operating system. Qualify maintenance I/O, indexes and WAL along with accepted writes. A finite logical history quota alone does not establish a stable physical footprint.

## Recovery is a capacity workload

NSC initially selects whole-world restoration from the last complete durable cut after controller/state loss. Preserve that simpler correctness model. The unproven question is its cost as geography and history grow, including the memory needed while loading, validating and rebuilding active indexes.

Qualification should distinguish recovery point from recovery time and distinguish ordinary buffered progress from protected durable effects. Include pending receipts, current privacy restrictions, failed or uncertain external attempts and rejected old-generation replies. A restored world with correct positions but duplicate spending or resurrected private evidence has not recovered correctly.

Do not promise a bounded cold start by timing a fresh tiny save. Use the smallest mature-state specimen that exercises the retained classes and true restore path. If whole-world recovery becomes too costly, that is evidence for a separately designed scoped recovery scheme—not permission to improvise partial recovery or speculative replay now.

## Persistent worlds eventually make build evolution a product obligation

Zero users justify no compatibility infrastructure today. Do not build historical readers, dual authoritative stores or a migration campaign for disposable development saves. Continue exact current-format validation and the existing development reseed policy.

However, make installed definition/build pins and creation-versus-load semantics explicit now. Once real players are promised durable worlds, changing a seed or code build cannot silently erase their histories. Before that offer, the product must decide supported upgrades, maintenance windows, recovery guarantees and unsupported-build handling. That future trigger belongs to the existing deployment/save owners. Recording it now avoids mistaking today's development reset permission for tomorrow's service policy.

## Design handoff

[MSF03](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf03--independent-seed-world-lifecycle-and-namespace-closure) owns lifecycle preparation. [MSF05](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf05--advancement-service-and-reactivation-contract) routes absence/advancement decisions to PS. Mature-world storage and recovery remain with BK/SL/PD/PF through the preservation/qualification map rather than a duplicate implementation queue.
