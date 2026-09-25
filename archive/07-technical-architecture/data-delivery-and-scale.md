# Production data delivery, operations and scale

Operational recovery and retention must respect the [gameplay save/load design](../../docs/save-and-load.md). That document owns gameplay rewind semantics; this document owns storage operations and disaster recovery.

The implemented personal-world baseline uses `WorldChanges`, one-second routine durability coalescing, periodic snapshots, journal recovery, SQLite/PostgreSQL adapters, pgvector recall, response receipts, typed SSE patches and atomic god-editor mutations. [Architecture](../../docs/architecture.md) owns those current mechanics. This document owns the remaining migration, retention, recovery, external deployment, normalization, backup/restore, sharding and measured-scale design; active D0–D6 work lives in the [production-data tracker](../../docs/maintainers/production-data.md).

## 1. What scaling means for this product

The accepted product priority is one shared world divided into regions, with independent worlds also supported. Begin with independently stored records and region-aware loading/routing in one application/database; distribute region execution when measured demand requires it. Independent-world sharding remains useful but is not a substitute for qualifying the shared world. Do not confuse registered accounts with daily active players, concurrent humans, active NPCs, loaded entities, or simulation update frequency.

The owner selected the following capacity targets. They are acceptance workloads, not demonstrated capacity or storage/entity creation caps. A scene means one simultaneous local interaction and client-interest area, not necessarily a database region.

| Release | Across the shared world | In one scene |
| --- | --- | --- |
| First release | 100 human players, 100 agents, 100 animals and 1,000 other objects, active and interacting across locations | Half of each population: 50 players, 50 agents, 50 animals and 500 other objects |
| Growth release | 10,000 concurrent human players; agent/animal/object distribution must be stated in the qualification profile | 200 human players and agents combined, with their relevant animals/objects also included in the measured workload |

Players, agents and animals are separate workload populations; an animal with cognition is counted once with its capabilities recorded. Interpret growth's 200 as a combined population, not 200 of each. Agent activity does not mean a paid call per tick, but an idle population or disconnected clients cannot establish the interactive target. Exercise mixed movement, perception, speech, combat, inventory/process changes, memory retrieval and ordinary background work; include contested resources, growing history and client projection/rendering. Growth's NPC/object ratios, hardware, action rates, connection churn, history sizes and operating budget are qualification parameters to set during implementation, not assumed free capacity. [D61](../05-project/open-decisions.md#d61--shared-world-scale-and-crowd-behavior) retains later regional mechanics questions. Record at least:

- registered accounts, daily active accounts and peak concurrent connections;
- active worlds, sector count, geographic placement and load skew toward the busiest world;
- active NPCs, loaded entities/components and dirty components per real second;
- simulation step rate, requested/achieved acceleration and commit batching interval;
- committed human/NPC actions, domain events and observation deliveries per action;
- interactive query rate/shape, historical report rate, result sizes and retention;
- AI invocations, context bytes, model latency, token costs and maximum in-flight work.

The same distinction applies to a million-player ambition: one million registered players, concurrent players spread across independent worlds, concurrent players in separate regions of one world, and players interacting in one crowded location are different workloads. Distribute simulation ownership and stored records along measured world/region boundaries; send each client only its permitted relevant updates. A crowded shared interaction still requires computation, coordination and delivery even if its records live in a scalable database. Moving all simulation processing into SQL does not remove that cost. Follow the [database/simulation division](production-data-model.md#database-simulation-and-background-responsibilities); the stages below are a qualification path, not a claim of million-player capacity or an instruction to build sector infrastructure now.

One million actions per day averages about 11.6 actions/second globally. A 20-fold burst would be about 232/second. This arithmetic is not a database capacity claim: each action can trigger many state changes, observations and queries, while simulation runs between actions.

For an illustrative storage budget, one million retained events/day at 1.5 KB each is about 1.5 GB/day or 45 GB per 30 days before indexes, audiences, replicas, backups and object copies. Separately, 20,000 dirty components written twice per second at 160 bytes each already produce about 6.4 MB/second or 553 GB/day of logical change data before database overhead. This is why continuous state-change history cannot have the same indefinite retention as meaningful invention and life events.

Measure actual row sizes, index/WAL amplification, commit latency and dirty-state frequency. Count-based limits alone do not bound cost. Put storage, AI and report budgets in versioned operational configuration, without presenting those limits as fictional laws.

## 2. Initial deployment and conditional hosting

Start with one PostgreSQL 18 database and one server application, one authoritative writer per world and bounded background work. Separate worker pools, managed high availability and object storage are conditional on workload, isolation, artifact and hosted-release requirements; they are not cognition prerequisites. PostgreSQL is the canonical transactional store; memory caches and the renderer are disposable projections. Services may initially share a codebase and host, with separate pools and credentials. Do not provision every eventual component just because the model has a namespace for it.

Keep saved revision/generation checks with one writer per world. Renewable authority leases and independent worker assignment become required when multiple workers can take over worlds; begin with one sector per world. Multiple worlds can run on one worker until measurements justify spreading them. Database connections belong to bounded service pools, not one connection per player, actor or MCP call. Backpressure must cap requests and queue age before memory or connection exhaustion.

Use primary reads for inventory, admission, current permissions and read-your-writes context. Replicas may serve queries only with declared staleness and watermark behavior. Expensive reports use a separate pool or replica so a creator's historical question cannot stall survival commits. A read replica does not increase write throughput.

High availability has explicit acknowledged-write semantics. Synchronous replication can reduce failover loss at a latency/availability cost; asynchronous replication can lose acknowledged recent commits during promotion. Select and test this policy before promising hosted failover; a development deployment need not implement automatic failover. PostgreSQL describes these tradeoffs in [standby replication](https://www.postgresql.org/docs/18/warm-standby.html). Fencing must cover both simulation workers and database failover so an old authority cannot return and write stale state.

The local adapter may continue using SQLite's own transactional guarantees with relational records. Its single-writer behavior is appropriate to a local world; it is not a shared file mounted by several production servers. See [SQLite WAL constraints](https://www.sqlite.org/wal.html). Local portability does not oblige the hosted system to avoid PostgreSQL indexes or every deployment-specific capability; public query semantics and supported capabilities are the compatibility boundary.

## 3. Growth stages and triggers

| Stage                             | Change                                                                                                     | Trigger / proof                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A: structured persistence | Independent operational rows, current-feature queries, atomic batches, required durable jobs and complete saves | D1/D2 continuation, query/privacy and failure gates; no operational whole-world JSON dependency |
| B: shared-world working sets | Logical regions, bounded active-state loading, indexed due work and permitted regional subscriptions; one writer initially | Long-lived shared-world workload and crowded-region measurements; no silent dormant-time changes |
| C: shared-world CPU distribution | Separate region authorities sharing one database; explicit transfer and cross-boundary interaction contracts | Measured single-writer limit; fencing, transfer, causal ordering and recovery gates pass before parallel ownership |
| D: shared-world storage distribution | Physical regional data placement, routed queries, validated cross-shard references and durable transfer decisions | One database's measured envelope is exceeded; no distributed transaction requirement hidden inside ordinary gameplay |
| E: independent-world placement | Route/move complete independent worlds across workers/databases using the same identity and repository contracts | Independent-world workload or isolation warrants placement; this can proceed separately without claiming shared-world capacity |
| F: history/search specialization | Retention-aligned partitions/archives and separate search/report resources where useful | Measured retention/query interference; may be applied at any earlier stage without granting extra disclosure or changing recall semantics |

No automatic threshold is guessed here. For each deployment, publish a load profile, latency/backlog/storage targets and resource headroom, then measure p50/p95/p99 under steady load, bursts, failover and background maintenance. A stage is justified by those results, not by account count alone.

### Shared-world regions and active state

A logical region identifies simulation ownership and loading. It is not automatically a PostgreSQL partition, machine or fixed-size map cell. Entity identity survives region reassignment. Start with one authoritative writer handling several logical regions if that is sufficient; do not imply that one writer has already qualified million-player concurrency.

Load active entities, contained/attached dependencies, running processes, due work and required definition pins. Fetch cold history and optional remembered knowledge through repositories. Bound admission and prefetch before an actor enters an unloaded region; absent loaded data is not proof that the destination is empty or an interaction is impossible. Evict only committed/reconstructible state, including saved RNG, pending deadlines and perception latches. Region dormancy cannot silently stop fire, hunger or ongoing work: exact scheduled/analytic continuation needs a separately qualified rule, or the region stays scheduled. This does not authorize offline catch-up after server downtime.

Before splitting writers, assign every mutable aggregate one owner. A carried container and its contents move as one dependency-complete transfer; social relationships and distant memories retain stable references without forcing every linked actor into the same region. Same-database crossing can use a coordinated transaction. Cross-database crossing requires a durable prepare/commit-or-abort decision, source fencing and idempotent destination activation; a timeout alone cannot activate both sides or justify discarding possessions. Unfinished cross-region processes need explicit ownership or must remain on one authority until that capability is supported.

Nearby regions exchange only the bounded boundary state needed for supported interactions, with source revisions and simulation-time validity. Seeing/hearing across an edge does not permit using a stale replica to spend another region's inventory. World policy versions have explicit activation boundaries, not a global lock for every movement. Cross-region trades and physical effects must declare coordination, retry and unavailable behavior before release. Initial overload handling bounds optional work and queues new admission before changing gameplay fidelity; preserve an entrant's current safe location, cancellation and reconnect. Queuing inside the selected capacity workload is a qualification failure, not evidence that capacity passed. Never silently drop consequential actions, perceived harm or elapsed simulation work to meet a benchmark. Revisit admission policy when actual crowded-world play warrants it; the database cannot make all-to-all interaction free.

Actor memory and conversation ownership is routed by stable world/actor or conversation identity, not inferred from current coordinates. Initially these records remain in the shared database when actors move. Physical relocation is a later migration with its own generation/receipt; it must not create a second mind, lose a pending response or grant new listeners earlier conversation access.

### Whole-world sharding

All target canonical mutable world records carry `world_id`, and ordinary transactions do not span independent worlds. Use a directory mapping world to a physical shard and placement generation. A shard can hold many worlds; moving one does not rename its entities or change query schemas. Tenant identity is not the shard key: one large tenant can own worlds on several shards.

Cross-world account libraries, discovery, popularity and reporting use outbox-fed global projections. They do not synchronously query every shard for every page. Shared definitions are content-addressed immutable authorized pins. World processes continue against their pins when the catalog is unavailable.

A controlled move first fences/freezes new work for that world, drains or records pending transactions, copies consistent canonical rows and required artifacts, verifies checksums/counts/watermarks, installs a higher authority generation, switches routing and resumes. Late old-generation results are rejected. Keep the source read-only during a rollback window. Resume on the source after destination writes only through another fenced move/catch-up; never reactivate stale source data. Pending AI/workflow records are reconciled through stable world/job IDs, not redispatched.

Initial moves may briefly pause a world. Lower-downtime migration can later use snapshot-plus-change replication with a final fenced cutover; it is extra engineering, not achieved by changing a connection string. PostgreSQL logical replication does not automatically migrate schema DDL or sequence state; migration orchestration must account for its [documented restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).

### The limit of world sharding

More shards help many worlds. They do not make one crowded, tightly coupled world arbitrarily parallel. Follow the [regional ownership and transfer contract](#shared-world-regions-and-active-state) for shared-world expansion. Physical region separation also removes local foreign keys/transactions across databases: introduce validated local references/directories and migrate those constraints while preserving public world/entity identities. This is additional engineering, not an infrastructure setting. Thousands of simultaneous actors in one interaction area remain a workload and simulation-design challenge.

## 4. Retention, archives and deletion

Accepted direction: preserve important events and summaries, and allow routine detail to age out. Character forgetting is a separate fictional policy. The current foundation scope supplies storage and interfaces for future retention decisions; it does not implement new semantic classification, importance, grouping or content-dropping rules. Existing supported behavior is preserved during migration. Later case-by-case retention choices are delegated to engineering and must record a rationale in the ledger below. The numeric windows below remain planning candidates, not new deletion behavior for this foundation.

| Record class                                                        | Proposed policy                                                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current canonical state and active processes                        | Retain while world/entity needs it; tombstone consumed/dead identities while retained references exist                                                                                                       |
| Active definitions and pinned dependencies                          | Retain while any world, process, checkpoint, pack or valid creator capsule requires them                                                                                                                     |
| Invention authorship, activation, major lifecycle/ownership history | Retain for world/product lifetime under explicit account/content retention terms; archive rather than silently truncate                                                                                      |
| Important experiential events and historical summaries | Preserve under the selected world/product retention policy, hot or archived; retain provenance, audience and coverage. A summary does not recreate exact expired dialogue or establish character awareness. |
| Routine experiential detail | Class-specific finite hot/optional archive window, then expire only after required evidence/checkpoint/receipt dependencies are satisfied and the decision ledger records the loss. No promise that every recorded event stays searchable forever. |
| Future player-private narration and source links | Separate finite owner-scoped retention, selected in NC11; retain permitted source capsules or explicit unavailable/redacted locators, propagate disclosure revocations, and never regenerate prose or paid work on reads |
| Fine-grained state changes                                          | Keep after the oldest supported recovery checkpoint, with an initial 24-hour replay target; compact only after verifying a durable covering checkpoint and all consumer prerequisites                        |
| Checkpoints                                                         | Initial hourly verified checkpoints, with a 24-hour fine-grained recovery window and daily checkpoints for 30 days; historical snapshots outside change coverage do not imply exact between-checkpoint state |
| NPC observations and recallable memories                            | Six-game-hour raw recall; hourly small-model cleanup of older personal/aware-event experience; separate bounded summaries, backlog and authored text. Protected commitments have finite native quotas; creator archive is not NPC recall                                            |
| Full AI prompts/responses and diagnostic context                    | Initial 7-day protected diagnostic retention, configurable lower; normalized accepted decisions and required evidence/artifacts follow game retention                                                        |
| Ordinary gameplay command receipts                                  | Retain complete results for 24 hours; reject older command epochs/envelopes after expiry through the durable controller-generation watermark                                                              |
| Messages, provider jobs, billing and administrative receipts         | Retain through their separately declared recovery, accounting and product horizons; the 24-hour gameplay-command policy does not shorten them                                                               |
| Billing and cost evidence                                           | Independent policy under the billing contract; no lossy rollup that falsely claims exact arbitrary historical intervals; diagnostic expiry never removes the only accounting facts                           |
| Query snapshots/reports                                             | Short explicit TTL/byte quota; default interactive snapshots 5 minutes; reports require an advertised expiry and source coverage                                                                             |

### Retention decision ledger

No new semantic loss policies are selected for the foundation. “John moved to 1,5” versus “John punched me” illustrates why future systems need expressive source records and different retention outcomes; it is not an instruction to implement a walk-versus-punch classifier or deletion rule now.

When a later semantic policy is implemented, record its affected source class, rule/version, rationale, retained representation, dependency guards and lost query/replay capability here. The foundation supports storing policy identity, reason, optional confidence, classification state and source/group relationships without choosing their values. Missing classification is valid and must not automatically mean unimportant. Batch manifests/counters may audit later omission without a new row per discarded sample. Storage limits report pressure rather than inventing semantic deletion rules.

Operational storage compaction may remove redundant physical representations only when canonical information, recovery guarantees and existing behavior remain intact. New content-sensitive classification, grouping and expiry behavior stays separate CR work. The [memory storage contract](production-data-model.md#semantic-history-and-grouping-support) owns the backing records and interfaces.

Summaries retain their source range/IDs or coverage manifest, attribution, policy version and disclosure restrictions. Record that exact detail expired. If a required summary cannot be produced or validated, keep its sources or report storage pressure; do not silently delete them or buy an unapproved model call. Required obligations, active processes, accepted definitions, billing and recovery evidence are not expendable routine prose. Human-private summaries remain private even when the contributing detail expires.

The gameplay retry horizon in the real-time synchronization contract requires server-issued/validated command timestamps or admission tokens, a clock-skew policy, and expired-command rejection. Merely deleting old receipts would let an old request create a second effect. Learning/activation/transfers and external spending have additional durable business identities. Consumer receipts live at least as long as possible redelivery; purging an outbox does not prove every old backup has disappeared.

Archive by immutable segment manifests containing scope, schema/build pins, stream/time ranges, checksums, counts and visibility metadata. Verify an archive can be read before dropping hot rows. Hot and archived query results deduplicate by stable references and expose gaps. Archive tasks cannot grant an NPC access to forgotten or unperceived history. Broad historical queries may return an asynchronous report through the same query interface.

Deletion spans primary rows, replicas, search indexes, cached contexts, provider/workspace artifacts and backups under their respective expiry policies. Track erasure requests and tombstones; a restored backup must reapply the erasure ledger before serving queries. Immutable artifacts can be physically deleted when permitted retention and all valid references end; immutability does not mean an unlimited retention exemption. Content rights/retention terms and the remaining human-private operational policies must be selected before corresponding shared features launch; the accepted creator-access restriction already applies.

## 5. Backup and recovery

The [world-module manifest](world-module-runtime.md#11-save-restore-and-storage-extension) uses existing exact definition identities and storage ownership. Module state joins current-world capture or an explicitly host-owned authoritative store; declarations cannot create arbitrary SQL access or tables. No universal EAV schema is required.

Use encrypted managed backups and PostgreSQL base backups plus WAL archival for point-in-time recovery. Verify object-store checkpoints/artifacts and metadata references together; database backup alone does not preserve external bytes. See [PostgreSQL continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html).

Use a reasonable staged recovery baseline under delegated engineering judgment: atomic durable confirmation, repeat-safe receipts, restart reconciliation, complete backups/checkpoints and verified restoration. No acknowledged gameplay loss for a single application-process crash remains the baseline. Hosted replication, backup cadence and concrete database/region recovery objectives are chosen with the actual deployment before making an availability promise; they do not block foundation work or require distributed failover now. The earlier five-minute disaster-loss and one-hour recovery figures are planning examples, not owner-selected requirements or achieved guarantees. Record the selected failure model and restoration-drill evidence; do not weaken confirmed-action durability as an incidental performance optimization.

Test an actual restore into isolated infrastructure, verify quantities/ownership/definition pins/memory permissions, reconcile non-rewindable jobs/accounting, and only then allow public traffic. Keep encrypted backups in a separate failure domain and separate credentials. A checkpoint is a game recovery artifact; PostgreSQL WAL/backups are database disaster recovery. Neither replaces the other.

A database disaster restore can also roll back `work` rows if they share that database. Non-rewindable means they are excluded from game restores, not immune to infrastructure data loss. Preserve admission/receipt evidence through the selected replicated operations durability and an independent recovery journal or authoritative execution-service ledger. Freeze paid dispatch after disaster recovery until the lost interval is reconciled. If direct-provider evidence cannot resolve it, retain conservative unknown-cost holds and report the gap; never reset usage to the older restored total and spend the difference again.

Alerts cover backup age, failed archive verification, replication lag, writer fencing failures, commit ambiguity, unprocessed outbox age, missing artifact pins, command/receipt compaction safety and restore-test age. Never continue reporting successful world progress when storage cannot commit it.

## 6. Migration from the local snapshot and change journal

For active development, move operational state into independent records through small safe in-place migrations under the [save/load policy](../../docs/save-and-load.md#active-development-policy). Preserve world identity, unrelated state, privacy and accounting; validate and publish the conversion atomically. Normalizing storage does not require a fresh world, a new data directory or parallel legacy runtimes.

The following importer procedure applies when an explicit deployment move requires transferring a world between databases, such as SQLite to PostgreSQL. It is not the default workflow for ordinary development schema changes. Apply it to records consumed by each baseline feature; checkpoint/replay exports, content-rights records and distributed routing steps apply only when those capabilities are enabled. Preserve all existing source information even when its target feature is deferred, and retain the source through the operational cutover/backup window. Current evidence is recorded in [Verification](../../docs/verification.md); broader production normalization and disaster recovery remain open.

1. Freeze the source world for export or use a verified consistent SQLite backup. Capture its schema/revision, source checksum, AI ledgers and configuration inputs required to interpret the save. Never copy a live main SQLite file while omitting uncheckpointed WAL. Materialize all contiguous `world_journal` entries over the saved snapshot before exporting its latest revision; the current backup/import tools do this inside the source read transaction.
2. Create an import identity and deterministic ID mapping for world, entities, items, recipes, memories, events and legacy request IDs. Keep `legacy_id_aliases`/import provenance in the target. Do not assume local `player` has a verified platform account; require explicit owner linkage or preserve unattributed origin.
3. Parse and validate source data using its original schema. Import map into chunks; entity headers/vitals/components; item lots and containment; reservoirs/yields; current paths/actions; definitions and pins; actor knowledge/memories; retained events and receipts; controls and milestones.
4. Convert current simulated seconds to the selected integer time unit exactly. Preserve seed/RNG, consumed materials, remaining work, ownership and equipped identity. New schema fields use explicit initialization/unknown policies; do not reinterpret old condition defaults.
5. Preserve current recipe bytes and legacy digest as provenance; compute the new canonical content digest separately. Validate compatibility with the pinned legacy mechanism contract, rather than silently generating replacement recipes.
6. Import jobs/attempts into non-rewindable operations records with a source/import receipt identity. Preserve reserved, settled, uncertain and undispatched distinctions and monetary units. Interrupted work becomes stale/uncertain according to current policy; it is not resent. Reimporting the same source must not duplicate usage or credits. The environment-configured cap is explicitly mapped to a budget configuration; secrets never enter the import or model context.
7. Import retained history with coverage metadata. The prototype kept at most 300 feed events and bounded memories; missing past history remains unavailable. Legacy command bodies and job requests may preserve extra text, but must not be promoted to invented perception events or a claimed complete conversation archive.
8. Preserve duplicate protection across the API transition: translate legacy IDs and compare their original canonical request digest in a compatibility receipt path. Remapped IDs/new digest algorithms cannot accidentally make a retried old command executable again. Legacy envelopes have an explicit supported retry/expiry policy.
9. Produce a reconciliation report: row/quantity totals, every live entity and placement, recipe/dependency hashes, knowledge/memory attribution, process progress, RNG/time, milestone flags, usage totals/status and missing evidence. Reject inconsistent sources with a report; do not reset them.
10. Run native continuation and query-contract checks on a separate imported copy. Exercise save/reload, competing harvest, pause, late jobs and memory recall. No paid calls are necessary for migration verification.
11. Cut over one chosen world by fencing the old writer, recording the final source revision and routing to the verified target. Keep one authority. Temporary dual-read comparison can validate queries; application dual-write to SQLite and PostgreSQL is not the migration strategy.

If rollback is needed before target writes, reopen the preserved source under a fresh generation. After target writes, rollback needs an explicit supported reverse migration or deliberate declared loss/restore; it cannot silently return to an old snapshot. Import rollback never erases external provider usage.

The memory import must preserve authored identity, beliefs, relationships, goals and concerns in the actor workspace and initial accepted PostgreSQL text row. Preserve native commitments and knowledge independently. Deduplicate known event/memory copies by source identity, never by guessing missing historical audiences. Import god-only thoughts separately. The legacy prototype's bounded 300-event feed cannot reconstruct lost history. The current persistence change journal is a snapshot-recovery mechanism, not a historical event archive. Verify recovery before changing active retention; six-hour recall and hourly cleanup are simulated-time policy, distinct from real-time archive/checkpoint retention.

## 7. Storage evolution after launch

Use expand/backfill/validate/switch/contract migrations. Add compatible columns/tables and views, deploy readers that understand both representations, backfill by world in resumable batches, verify invariants, switch the canonical owner/read implementation, then remove old storage only after the compatibility window. A field promotion from JSONB to native columns is one example; it is not perpetual dual ownership.

For the current development migration, prefer quiescing the single writer and using one checked conversion when it fits safely. A larger backfill may resume in bounded batches under the same source revision, or reconcile explicitly captured changes before switching. Persist progress/digests, validate identity/quantities/evidence and mark the new representation authoritative atomically. Retire migrated fields from writable world JSON and make startup load from their new repositories; a snapshot serializer may reconstruct them for export. No long-lived dual runtime, automatic reset or new-directory workaround is part of this migration. The rolling multi-build procedure above applies only when live deployment needs it.

Implement through vertical slices: durable source/ownership and restore fencing; memory/knowledge retrieval without history scans; entity/placement/inventory records and atomic actions; processes/goals/due work and bounded active loading. The [D1/D2 tracker](../../docs/maintainers/production-data.md#delivery-slices-and-exit-evidence) owns ordering and evidence. Integrate outstanding gameplay branches through these owners; preserve useful gameplay rules and database batching, and replace snapshot-specific scans as their records migrate.

Keep checksummed schema migrations per module and pin minimum/maximum supported storage versions per application build. Long jobs persist input schema/version pins; unsupported completions become explicit stale/incompatible outcomes. Rehearse migrations against representative checkpoints, including old supported definitions and unfinished processes.

Indexes are migrations too: assess lock/build/disk impact and use appropriate concurrent construction where supported. Event partition maintenance is automated and tested, with future partitions prepared before writes require them. Physical shard migration and component semantic migration are separate procedures; do not combine them into an unreviewable global rollout.

## 8. Delivery tracking

Current D0–D6 phase state, dependencies and exit criteria live in the [Production data implementation tracker](../../docs/maintainers/production-data.md). The current local persistence and delivery baseline is described in [Architecture](../../docs/architecture.md); this document owns only the migration, retention, recovery, deployment and scale design.

## 9. Acceptance scenarios and architecture review

Required before shared production:

- Two actors take the same final item or harvest the same finite remains; exactly one valid allocation survives.
- A process dies before commit, after commit before response, or during projection publication; receipts reconcile and quantities remain correct.
- A stale worker retains network access after ownership takeover; the database rejects its old epoch.
- A container cycle, duplicate occupied slot, cross-world FK or unsupported component value fails without partial changes.
- An actor hears a promise; indexing lags; consolidation runs; the promise remains available with correct attribution and no private leak.
- A world lock changes while generation/import/workshop is in flight; current policy controls activation and costs remain accounted.
- A definition revision changes burning behavior with a partially consumed source; migration preserves fuel and work.
- A creator leaves a world or its model trace expires; authorized invention source remains inspectable.
- Query pages overlap concurrent entity changes and delayed event commits; declared consistency and completeness hold.
- A hot query, report burst or slow archive cannot exhaust commit resources; request budgets/backpressure work.
- A world moves shards during pending inference; old authority stays fenced and no job is resent.
- Restore a database and required objects; apply erasure/accounting reconciliation before serving any query.
- Restore the same memory ID/revision on another timeline while an old embedding/AI completion is pending; neither result becomes current without validation.
- Restart with due work, a partly completed plan and a perception latch; behavior resumes without repeating a reaction or erasing an obligation.
- Move a bag and its nested contents across a region, lose the completion reply and retry; exactly one region owns the items and current processes.
- Query as a world creator for human-private messages, notes, derived summaries, counts and exports; no creator privilege bypasses participant/owner access.
- Expire routine history while a summary, commitment or retained save depends on it; preserve required evidence or refuse cleanup, and report exact-detail coverage honestly.

Deliberately avoided traps: one lock serializing all worlds; one physical table/database or permanently running worker per NPC (scoped persistent logical workspaces are required for reflection); global joins in ordinary gameplay; unrestricted SQL MCP; an EAV row per changing scalar; a complete JSON world rewrite per movement; unbounded permanent tick history; model-generated database schemas; hidden provider-session memory; and treating all-time billing as a lossy daily chart.

This is an extensible relational/JSON design with explicit ownership and query contracts. It reserves the necessary seams for more infrastructure while keeping the initial implementation bounded. It still requires real migrations, load measurements and new cross-sector mechanics when growth reaches those boundaries.
