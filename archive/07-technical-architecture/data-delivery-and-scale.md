# Production data delivery, operations and scale

The implemented personal-world baseline uses `WorldChanges`, one-second routine durability coalescing, periodic snapshots, journal recovery, SQLite/PostgreSQL adapters, pgvector recall, response receipts, typed SSE patches and atomic god-editor mutations. [Architecture](../../docs/architecture.md) owns those current mechanics. This document owns the remaining migration, retention, recovery, external deployment, normalization, backup/restore, sharding and measured-scale design; active D0–D6 work lives in the [production-data tracker](../../docs/maintainers/production-data.md).

## 1. What scaling means for this product

The design should plausibly support hundreds of worlds and a large player population by distributing independent worlds and services. It must not confuse registered accounts with daily active players, concurrent humans, active NPCs, loaded entities, or simulation update frequency.

An eventual target of hundreds of thousands of players is a useful direction, not an adequately specified load test. Record at least:

- registered accounts, daily active accounts and peak concurrent connections;
- active worlds, sector count, geographic placement and load skew toward the busiest world;
- active NPCs, loaded entities/components and dirty components per real second;
- simulation step rate, requested/achieved acceleration and commit batching interval;
- committed human/NPC actions, domain events and observation deliveries per action;
- interactive query rate/shape, historical report rate, result sizes and retention;
- AI invocations, context bytes, model latency, token costs and maximum in-flight work.

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
| A: structured persistence         | Independent rows, atomic batches/outbox, stable views/MCP, bounded history and checkpoints                 | Query/failure contract tests; no giant-snapshot operational dependency                                          |
| B: one cluster, more workers      | Assign worlds across workers; isolate reporting; tune indexes/pools/checkpoints; add replicas where useful | Measured CPU, I/O, contention, queue or query bottleneck; no speculative service split                          |
| C: multiple world shards          | Route `world_id` through directory; move complete worlds; retain local transactions                        | One cluster's sustainable workload/storage/region envelope reached; world move and fencing rehearsal passes     |
| D: history/search specialization  | Monthly journal partitions, cold object archives, separate search/analytics projections                    | Retention, query plans and operational maintenance exceed interactive budgets                                   |
| E: one busy world's CPU scale     | Multiple sector authorities with committed boundaries and shared world DB                                  | Single simulation worker is limiting despite a healthy store; sector transfer/causality tests pass              |
| F: one busy world's storage scale | Explicit physical sector placement and bundle transfer; local record ownership, replicated immutable pins  | A single world exceeds one shard; new cross-sector protocols, reference handling and permission delivery proven |

No automatic threshold is guessed here. For each deployment, publish a load profile, latency/backlog/storage targets and resource headroom, then measure p50/p95/p99 under steady load, bursts, failover and background maintenance. A stage is justified by those results, not by account count alone.

### Whole-world sharding

All canonical mutable world records already carry `world_id`, and transactions do not span independent worlds. Use a directory mapping world to a physical shard and placement generation. A shard can hold many worlds; moving one does not rename its entities or change query schemas. Tenant identity is not the shard key: one large tenant can own worlds on several shards.

Cross-world account libraries, discovery, popularity and reporting use outbox-fed global projections. They do not synchronously query every shard for every page. Shared definitions are content-addressed immutable authorized pins. World processes continue against their pins when the catalog is unavailable.

A controlled move first fences/freezes new work for that world, drains or records pending transactions, copies consistent canonical rows and required artifacts, verifies checksums/counts/watermarks, installs a higher authority generation, switches routing and resumes. Late old-generation results are rejected. Keep the source read-only during a rollback window. Resume on the source after destination writes only through another fenced move/catch-up; never reactivate stale source data. Pending AI/workflow records are reconciled through stable world/job IDs, not redispatched.

Initial moves may briefly pause a world. Lower-downtime migration can later use snapshot-plus-change replication with a final fenced cutover; it is extra engineering, not achieved by changing a connection string. PostgreSQL logical replication does not automatically migrate schema DDL or sequence state; migration orchestration must account for its [documented restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).

### The limit of world sharding

More shards help many worlds. They do not make one crowded, tightly coupled world arbitrarily parallel. Start sector expansion with explicit boundaries and limited cross-boundary interactions. Keep an entity, its attached/contained possessions and current authoritative processes under one sector owner. A crossing uses an idempotent transfer: source prepares/freezes a versioned bundle, destination records preparation, a durable transfer decision authorizes exactly one activation, and recovery consults that decision. Until completed, neither side can duplicate or spend the bundle. Continuous fire, construction and audio across boundaries need additional causal protocols.

Initially sectors can share a database and coordinate through transactions. Physical sector separation removes the possibility of local foreign keys/transactions spanning both sides: introduce reference directories/validated local pins and explicit transfer workflows, migrate the constraints, and retain the same public world/entity identities. Memories, obligations and conversations spanning moving actors need their own ownership/read routing rules. Do not pretend the present world-shard schema alone solves these protocols.

The model preserves a path to this expansion; it does not promise zero migrations or that every globally coupled mechanic can be scaled by infrastructure upgrades. Thousands of simultaneous actors in one interaction area remain a workload and simulation-design challenge.

## 4. Retention, archives and deletion

Define retention by record class and product promise, not by the number of lines visible in the UI. The following are proposed launch defaults to review against measured cost and chosen product terms. Changing them changes historical-query coverage and requires disclosure.

| Record class                                                        | Proposed policy                                                                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current canonical state and active processes                        | Retain while world/entity needs it; tombstone consumed/dead identities while retained references exist                                                                                                       |
| Active definitions and pinned dependencies                          | Retain while any world, process, checkpoint, pack or valid creator capsule requires them                                                                                                                     |
| Invention authorship, activation, major lifecycle/ownership history | Retain for world/product lifetime under explicit account/content retention terms; archive rather than silently truncate                                                                                      |
| Experiential world journal: witnessed or configured notable unseen events | 30 days of real-time hot data, then compressed queryable archive while the world exists and policy permits; the future NC notable-unseen exception grants no awareness; no complete-history claim if coverage expires |
| Future player-private narration and source links | Separate finite owner-scoped retention, selected in NC11; retain permitted source capsules or explicit unavailable/redacted locators, propagate disclosure revocations, and never regenerate prose or paid work on reads |
| Fine-grained state changes                                          | Keep after the oldest supported recovery checkpoint, with an initial 24-hour replay target; compact only after verifying a durable covering checkpoint and all consumer prerequisites                        |
| Checkpoints                                                         | Initial hourly verified checkpoints, with a 24-hour fine-grained recovery window and daily checkpoints for 30 days; historical snapshots outside change coverage do not imply exact between-checkpoint state |
| NPC observations and recallable memories                            | Six-game-hour raw recall; hourly small-model cleanup of older personal/aware-event experience; separate bounded summaries, backlog and authored text. Protected commitments have finite native quotas; creator archive is not NPC recall                                            |
| Full AI prompts/responses and diagnostic context                    | Initial 7-day protected diagnostic retention, configurable lower; normalized accepted decisions and required evidence/artifacts follow game retention                                                        |
| Action/message retry receipts                                       | Retain complete results for an initial 7-day retry horizon; reject older command envelopes after expiry, retain necessary compact dedup/business identity records                                            |
| Billing and cost evidence                                           | Independent policy under the billing contract; no lossy rollup that falsely claims exact arbitrary historical intervals; diagnostic expiry never removes the only accounting facts                           |
| Query snapshots/reports                                             | Short explicit TTL/byte quota; default interactive snapshots 5 minutes; reports require an advertised expiry and source coverage                                                                             |

These are operational candidates, not permission to erase existing data. Event schemas identify which records are major durable history versus routine history; the classification is deterministic/versioned and inspectable. A craft/invention record cannot accidentally become expendable because its UI category changed.

The 7-day command horizon requires server-issued/validated command timestamps or admission tokens, a clock-skew policy, and expired-command rejection. Merely deleting old receipts would let an old request create a second effect. Learning/activation/transfers and external spending have additional durable business identities. Consumer receipts live at least as long as possible redelivery; purging an outbox does not prove every old backup has disappeared.

Archive by immutable segment manifests containing scope, schema/build pins, stream/time ranges, checksums, counts and visibility metadata. Verify an archive can be read before dropping hot rows. Hot and archived query results deduplicate by stable references and expose gaps. Archive tasks cannot grant an NPC access to forgotten or unperceived history. Broad historical queries may return an asynchronous report through the same query interface.

Deletion spans primary rows, replicas, search indexes, cached contexts, provider/workspace artifacts and backups under their respective expiry policies. Track erasure requests and tombstones; a restored backup must reapply the erasure ledger before serving queries. Immutable artifacts can be physically deleted when permitted retention and all valid references end; immutability does not mean an unlimited retention exemption. Content rights/legal retention and human-private-record policy must be selected before corresponding shared features launch.

## 5. Backup and recovery

Use encrypted managed backups and PostgreSQL base backups plus WAL archival for point-in-time recovery. Verify object-store checkpoints/artifacts and metadata references together; database backup alone does not preserve external bytes. See [PostgreSQL continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html).

Before external launch, record concrete recovery point and recovery time objectives for process crash, database/zone failover, region loss and accidental deletion. Starting engineering targets: no acknowledged gameplay loss for a single application-process crash; database-failover behavior aligned to the selected replication policy; disaster recovery point at most 5 minutes and recovery time at most 1 hour for the chosen initial load profile. These targets require restoration drills and may change with deployment/cost decisions; they are not achieved guarantees.

Test an actual restore into isolated infrastructure, verify quantities/ownership/definition pins/memory permissions, reconcile non-rewindable jobs/accounting, and only then allow public traffic. Keep encrypted backups in a separate failure domain and separate credentials. A checkpoint is a game recovery artifact; PostgreSQL WAL/backups are database disaster recovery. Neither replaces the other.

A database disaster restore can also roll back `work` rows if they share that database. Non-rewindable means they are excluded from game restores, not immune to infrastructure data loss. Preserve admission/receipt evidence through the selected replicated operations durability and an independent recovery journal or authoritative execution-service ledger. Freeze paid dispatch after disaster recovery until the lost interval is reconciled. If direct-provider evidence cannot resolve it, retain conservative unknown-cost holds and report the gap; never reset usage to the older restored total and spend the difference again.

Alerts cover backup age, failed archive verification, replication lag, writer fencing failures, commit ambiguity, unprocessed outbox age, missing artifact pins, command/receipt compaction safety and restore-test age. Never continue reporting successful world progress when storage cannot commit it.

## 6. Migration from the local snapshot and change journal

Apply this importer to the records consumed by each baseline feature. Checkpoint/replay exports, content-rights records and distributed routing steps apply only when those capabilities are enabled; preserve all existing source information even when its target feature is deferred.

This is a one-time explicit importer into a new target, not an in-place silent rewrite. The original save remains intact until an approved operational cutover and backup policy say otherwise. Current evidence is recorded in [Verification](../../docs/verification.md); broader production normalization and disaster recovery remain open.

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

Deliberately avoided traps: one global world lock; one physical table/database or permanently running worker per NPC (scoped persistent logical workspaces are required for reflection); global joins in ordinary gameplay; unrestricted SQL MCP; an EAV row per changing scalar; a complete JSON world rewrite per movement; unbounded permanent tick history; model-generated database schemas; hidden provider-session memory; and treating all-time billing as a lossy daily chart.

This is an extensible relational/JSON design with explicit ownership and query contracts. It reserves the necessary seams for more infrastructure while keeping the initial implementation bounded. It still requires real migrations, load measurements and new cross-sector mechanics when growth reaches those boundaries.
