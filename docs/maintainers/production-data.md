# Production data implementation tracker

This is the sole implementation tracker for production data contracts, migrations and scale rollout. Its design owners are the [production data model](../../archive/07-technical-architecture/production-data-model.md), [data queries and MCP](../../archive/07-technical-architecture/data-queries-and-mcp.md), and [data delivery and scale](../../archive/07-technical-architecture/data-delivery-and-scale.md). Current implemented behavior belongs to [Architecture](../architecture.md). Runtime optimization and performance qualification are tracked in [PF00–PF11](performance.md); their evidence feeds these phase gates without completing or duplicating them.

Gameplay checkpoint capture, retained saves and player-initiated restoration are tracked in [SL00–SL10](save-and-load.md). Those tasks reuse production persistence and recovery foundations without requiring completion of the normalized schema or duplicating D0–D6.

All phases remain open unless current evidence and the phase exit gate establish completion. Implement only the records needed by the consuming feature while preserving the shared identity, permission and transaction contracts.

Coordinate module dependency capture and load validation with [EWF07](extensible-world-foundation.md#ewf07--module-lifecycle-and-current-format-save-integration); module fixtures do not complete this tracker’s broader acceptance.

## D0–D6 phases

| Phase | Concrete deliverable | Exit evidence |
|---|---|---|
| D0: freeze contracts | ID/time/version conventions, dataset schemas and initial queries, permissions matrix, workload profile, module repository interfaces | Review against current save and user stories; contracts distinguish truth, memory, authorship and billing |
| D1: core persistence and importer | PostgreSQL adapter, world/stream/entity/components/placement/lot/reservoir/process records, immutable pins, atomic commits/receipts/outbox, minimal control identity, verified importer | Duplicate and concurrent actions, source preservation, process-death recovery, integer quantities/time, no paid calls; read/write performance baseline |
| D2: durable history and minds | Independent memories/evidence/conversation/commitments, awareness-filtered event coverage contract, bounded retention and verified recovery, ingestion watermarks; checkpoint replay only when enabled | History beyond scrollback; protected promises; actor privacy; consolidation race; backup/recovery drill; archive drill when enabled |
| D3: query and MCP | `ol.data/v1` views/reader, bounded query compiler, typed read tools, cursor/snapshot/report service, audience enforcement | Contract corpus on PostgreSQL and supported local adapter; revoked scope, stale replica, large history, exact configuration inspection |
| D4: full invention records | Authorship/rights, candidates/validation, manifest activation/migrations, creator capsules, workshop proposals and pack records | Lock during generation; retained source after run expiry; fuel-preserving revision; complete pack or explicit blockers; account library after leaving host |
| D5: first external hosted release | Selected retention/legal/privacy policies, budget/report boundaries, backups/failover, observability, realistic load tests, operational runbooks | Chosen workload/SLOs pass with headroom; recovery and permissions evidence; live AI acceptance remains separate |
| D6: measured expansion | Shared-world region ownership/transfer and measured CPU/storage distribution; independent-world placement, replicas/history/search as their workloads warrant | Stage-specific failure/load tests from sections 2–3; no new capacity claim without evidence |

## Current delivery boundary

D0's current consuming identity/time/privacy/revision contract is recorded in [Architecture](../architecture.md#current-consuming-data-contracts). D1 now includes validated journal paths/splices, UTF-8 snapshot thresholds, a durable journal head, source-preserving migration, full empty-target restore and diagnostic FIFO draining. D2 includes indexed event-audience history and private fallback narration, separate from actor memory. These implementations do not close the phase exit gates.

Atomic response/declaration/inner-world job completion reconciliation, editor paging and the generated-story outbox/lifecycle are implemented. Core D1/D2 record implementation remains missing, not merely its acceptance evidence: the active world still loads from a JSON snapshot plus changes, and current recall constructs permitted candidates from in-memory history before database vector ranking. Separate history, knowledge, accepted-text and vector tables do not complete the operational entity/inventory/process/memory model. Optimizing snapshot encoding, change detection or history projection does not complete that migration either.

### Remaining D1/D2 implementation and evidence

- [ ] D1: persist supported entities/components, placement, inventory and ongoing processes as independently addressable records through the existing semantic owners. Migrate development worlds in place under [save/load policy](../save-and-load.md#active-development-policy), preserving identity, unrelated state and external accounting; retain one writable authority and atomic action effects. Concrete children: D1-MS01–D1-MS04 below.
- [ ] D2: persist recall sources, evidence relationships, commitments and current recall eligibility independently. Coordinate source changes, forgetting/correction and vector invalidation; preserve direct required evidence and explicit embedding lag without waiting for paid work inside a transaction. Concrete children: D2-MS01–D2-MS03 and SC06/SC08/SC11.
- [ ] D1/D2: route current feature queries through scoped repositories that filter and select records in the database, then load bounded results. Establish the [database/simulation responsibilities](../../archive/07-technical-architecture/production-data-model.md#database-simulation-and-background-responsibilities) without requiring the broader D3 query compiler or MCP surface first. Keep active simulation rules in memory and outside database/provider I/O.
- [ ] D1/D2: demonstrate recovery and representative queries without whole-world JSON reconstruction as their ordinary access path. Measure preparation, database work, queueing and returned-data processing together under stated history/population/concurrency loads; include correction/forgetting, missing vectors and transaction failure. A count cap or an isolated vector-query timing is not an end-to-end latency guarantee.

Remaining acceptance also includes crash-boundary audits, PostgreSQL recovery/query/commit baselines and production-scale workloads. Preserve the existing single-writer architecture; D3–D6 remain separate later phases, outside this D1/D2 implementation scope. Automated failure-boundary coverage is deferred to [TODO](TODO.md#three-program-deferred-validation). This clarification changes documentation only and does not complete any implementation or acceptance gate.

## Delivery slices and exit evidence

The September 25 design review changes the implementation target, not current runtime status. Each slice needs a current-state inventory and migration plan before implementation. Existing gameplay branches are inputs to integration, not evidence that these gates are complete. Keep D0–D6 as the phase owners; the sequence below specifies useful end-to-end slices rather than creating a second project.

| Slice / phase | Deliverable | Evidence before completion |
|---|---|---|
| D0: ownership and current data map | Map supported fields to one canonical record/owner, needed queries and indexes, timeline/privacy scope, dependency/retention and migration treatment. Resolve outdated character/animal and prose/goal duplication. | Review ordinary actions, animal cognition, construction, recall, creator queries and restore against the [gameplay cases](../../archive/07-technical-architecture/production-data-model.md#gameplay-the-records-must-support). No speculative tables for unimplemented mechanics. |
| D1/D2: source identity and restoration | In-place generation/source records and typed references; current privacy and external accounting remain outside gameplay rewind. | Same-ID/revision restore cannot accept stale AI/vector work; saved source identities and unrelated state survive conversion; failed conversion leaves one coherent authority. |
| D2: independent memory and knowledge | Canonical awareness/experience/knowledge/commitments, evidence dependencies, current recall eligibility and durable index intent; database retrieval before text preparation. | Actor-scoped top N, index gaps, correction/forgetting, consolidated-source coverage, cold history, human-private denial and complete save/recovery. No full-history candidate construction in the target path. |
| D1: entities and material state | Shared actor/capability model, entity/component/placement/lot/reservoir records, semantic dirty changes and atomic receipts. | Take/give/equip/craft/consume and nested containers preserve identity/quantities; collision/permission checks stay native; retries and ambiguous commits cannot duplicate effects. |
| D1/D2: continuity and active loading | Processes, goals, plans, due work, observer recognition/latches and actor-owned subscriptions; bounded regional working sets. | Native continuation and cognition across unload/reload, plan replacement, source edits and restart; dormant regions preserve declared time semantics. |
| D3/D5: queries and shared-world qualification | Expand typed queries into consumed public/MCP datasets; enforce human-private scope, query budgets, recovery and disclosed retention. | Qualify D48/D58/D59/D60/D62 decisions, current-feature PostgreSQL query/commit baselines, failure-boundary and privacy evidence; no claims based only on fixtures or table creation. |
| D6: regional execution and placement | Follow shared-world CPU then storage distribution before assuming independent-world sharding solves the main target. | D61 workload/crowd policy, region transfer/fencing, boundary perception/time, concurrent trades and failure recovery; independent worlds continue using the same contracts. |

For latency qualification, report end-to-end p50/p95/p99/max and timeout rate, hardware/database layout, history sizes, actor/crowd distribution, simultaneous retrieval/commit load, warm/cold indexes, payload bytes, queue age and database plans. The requested 20 ms local-retrieval goal is unqualified; choose acceptance semantics under D62. Do not close this gate with a candidate-count estimate. Tests and runtime work require their normal separate implementation/verification scope; this design review runs none.

## Massive-scale research: independently completable record/query work

The following children refine the existing D0–D4 slices; their bodies live here once. Stages follow [G0–G4](../scaling/sequence-and-gates.md). They are all open. **Massive-scale research for each child:** [NOW contracts](../../archive/02-research/massive-scale/now/contracts.md), [persistence/consistency](../../archive/02-research/massive-scale/domains/persistence-consistency.md), [memory/retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md) and [source-preserving migration](../../archive/02-research/massive-scale/soon/data-migration.md). SCA09–SCA20/SCA35–SCA43 identify related current-code risks.

<a id="d0-ms01"></a>
- [ ] **D0-MS01 — Consumed-record ownership and access map.** G0. Map every currently consumed entity/body/material/process/goal/memory/knowledge/receipt field to one semantic writer, query/index, unit, timeline/privacy scope and migration treatment. **Exit:** the actual gameplay cases and SC04/SC09/SC11 contracts reconcile; no animal-versus-person duplicate authority or speculative schema for an unsupported mechanic.

<a id="d1-ms01"></a>
- [ ] **D1-MS01 — Entity/component/placement records.** G1; depends on D0-MS01. Migrate supported identities, body/capability components and spatial placement to addressable records with a revisioned active working set. **Exit:** load/query selected entities without root JSON reconstruction; spawn/remove/control and collision checks retain native authority; interrupted conversion preserves source identity and unrelated state.

<a id="d1-ms02"></a>
- [ ] **D1-MS02 — Material ownership and quantities.** G1/P2 barter; depends on D0-MS01 and SC09. Persist consumed instances/lots/reservoirs and supported containment under existing owners with indexed holdings. **Exit:** pickup/give/equip/consume/craft and any implemented nested containers conserve quantities and unique ownership under concurrent/repeated requests; SC15 supplies native lookup, not a second inventory store.

<a id="d1-ms03"></a>
- [ ] **D1-MS03 — Process and agency continuity.** G1; depends on current records and AG/EPR contracts. Persist supported progress, reservations, goals/plans, due work, recognition/latches and subscriptions for selective activation. **Exit:** unload/reload/restart or plan replacement preserves remaining work, consumed inputs, source bindings and due semantics; native continuation does not wait for a fresh model call. Do not introduce offline catch-up or statistical dormancy.

<a id="d1-ms04"></a>
- [ ] **D1-MS04 — Atomic record transition and recovery head.** G1; depends on the consuming D1/D2 records. Commit changed records, receipts, required evidence and durable external-work intent under one authoritative transaction/head. Consume PF08-MS01 dirty IDs and SC06 job identities. **Exit:** lost commit acknowledgments, duplicate intentions and failures yield one accepted resource/evidence outcome; no independent writable JSON mirror or network/model call inside the transaction.

<a id="d2-ms01"></a>
- [ ] **D2-MS01 — Independent source/acquisition/eligibility records.** G1; depends on D0-MS01/SC11. Migrate awareness, episodes, summaries, commitments and current recall eligibility with indexed actor/source/time relationships. **Exit:** same event can have different permitted listener detail; important sources/protected promises survive consolidation, and corrected/forgotten material is excluded before retrieval. Physical archives are not extra recall permission.

<a id="d2-ms02"></a>
- [ ] **D2-MS02 — Canonical knowledge and accepted-mind publication.** G1; depends on D2-MS01 and CR13. Promote current knowledge/accepted-text rows from root-state projections to canonical records under existing edit/publication owners, retiring the writable duplicate. **Exit:** scoped uniqueness, document revisions/tombstones, evidence dependencies and timeline fencing survive migration; a selected working set is not an additional authorable mind.

<a id="d2-ms03"></a>
- [ ] **D2-MS03 — Database-first recall and current-feature queries.** G1; depends on D2-MS01/02 and SC06/08/11. Select eligible candidates and bounded pages in the database before constructing optional prose/vector lists; retain direct mandatory evidence and explicit indexing lag. **Exit:** fixed eligible corpus with growing unrelated history avoids whole-corpus preparation; measure full latency/quality with SF02/SF05. Implement consumed query operations now without waiting for all D3/MCP tooling.

<a id="d3-ms01"></a>
- [ ] **D3-MS01 — Bounded public/MCP query contract.** G2 when the query/tool consumer ships; depends on consumed repositories and SC01/03/09. Expand `ol.data/v1` with typed selection, permitted projections, stable cursor/snapshot semantics, query-work/bytes/deadline limits and restricted reports. **Exit:** revoked scope, stale replicas, expensive filters and human-private joins are denied/deferred correctly; exports do not block native commits and completeness/continuation is truthful.

<a id="d4-ms01"></a>
- [ ] **D4-MS01 — Durable invention, installation and library identity.** P3/P4 or the first corresponding workshop/library consumer; depends on INV and SC12/14. Keep authorship/rights, candidate versions, validation, installations, immutable dependencies and account-library records independently queryable. **Exit:** lock changes, expired provider history, retained-save pins, modified definitions and export/import preserve provenance and rights; installation grants no automatic character knowledge and private motivating history is excluded.

D0-MS01 establishes the mapping; SC09/SC11 establish reusable exact identity/number/publication details; D1/D2 own the actual canonical-record conversion. This is an integration sequence, not three independent schema projects. Keep source-preserving in-place migration and the repository's current save policy.

## Current-code scaling child work

The [52-finding audit](../scaling/current-code-audit.md) records observed limitations and conditional risks at runtime `03105fed`. Detailed child work lives once in [SC01–SC16](scaling.md); this tracker retains the production phases and acceptance. Existing narrow features remain delivered where previously marked; new children do not close missing operational records.

| Phase / related owner | Focused child work | Evidence to carry into the parent gate |
|---|---|---|
| D0/D1/D5 | [SC01](scaling.md#sc01) | Independent authenticated control, positive permitted projections and human-private denial across all entry points. |
| D0/D1/D6 | [SC04](scaling.md#sc04), [SC09](scaling.md#sc09) | Immediate namespaces, region-compatible access and exact number/SQL contracts. Actual multi-owner fencing is deferred LT-R03, not bundled into the initial seam. |
| D1/D2 | [SC05](scaling.md#sc05), [SC06](scaling.md#sc06) | Checked replay without a full-world clone per record, keyed startup checks, indexed scoped job recovery and durable paid-source reconciliation. |
| D2 / EPR / CR | [SC08](scaling.md#sc08), [SC11](scaling.md#sc11) | Dirty-source indexing, failure-isolated actors, source-incarnation and erasure checks at publication/restore/reindex. |
| D1/D5 / billing | [SC10](scaling.md#sc10) | One selected spending-policy owner and reconciled aggregates; resolve enforcement/config discrepancy without raising allowance implicitly. |
| D2/D4 / INV / EWF | [SC12](scaling.md#sc12), [SC14](scaling.md#sc14) | Indexed eligible invention search, exact deduplication and reverse dependencies; no full-library preparation behind top-N. |
| D5 / PF / synchronization | [SC02](scaling.md#sc02), [SC03](scaling.md#sc03), [SC07](scaling.md#sc07) | Scoped replay, bounded admission/lifecycle, classified failure and fair admitted multi-actor execution. |
| D1/D2/D5 / SL | [SC16](scaling.md#sc16) | Coherent bounded capture/restore and paged metadata; preserve removal of named-slot caps. Hosted physical storage is separately gated. |

PF01/PF08 retain semantic dirty-change/checkpoint optimization; D1/D2 retain normalized records/database-first selection. Faster transitional replay is not that migration. EPR owns discovery/intake; [SC13](scaling.md#sc13) refines EWF08/INV-3's combined-work contract. Cross-links are dependencies, not a global rewrite prerequisite.

## D5 — Research-derived release children

**Massive-scale research:** [operational readiness](../../archive/02-research/massive-scale/soon/operational-readiness.md), [operations/cost](../../archive/02-research/massive-scale/domains/operations-cost.md). D5's broad requirements are now decomposed into [SF07 objectives/policies](scaling-feature-readiness.md#sf07), [SF08 unit economics](scaling-feature-readiness.md#sf08), [SF09 security/abuse](scaling-feature-readiness.md#sf09), [SF10 deployment compatibility](scaling-feature-readiness.md#sf10), [SF11 incident/restore drills](scaling-feature-readiness.md#sf11) and [SF12 first shared-world qualification](scaling-feature-readiness.md#sf12). Their bodies/state live there once and remain unchecked.

These gates apply before the relevant public P2/shared-hosting promise, not only at P6. Voice/assets consume SF16–SF18 when those features ship; a local release does not need a global fleet. SF01–SF06 feed measurements and behavioral evidence; native fixtures cannot certify live model quality.

## D6 — Deferred regional and specialized scale

**Massive-scale research:** [hot-world](../../archive/02-research/massive-scale/later/hot-world.md), [world fleet](../../archive/02-research/massive-scale/later/world-fleet.md), [planetary memory](../../archive/02-research/massive-scale/later/planetary-memory.md). The [separate long-term backlog](scaling-long-term/README.md) owns specific deferred task bodies:

- LT-R01–LT-R10: partition evidence, regional loading, fenced authority, transfers, boundary perception/effects, causal time, activation, two-owner qualification, then physical data distribution.
- LT-M01–LT-M08: corpus/workload model, partition routing, exact/ANN evaluation, payload sharing, mutable/dual indexes, archives/erasure and very-large recovery.
- LT-O01–LT-O08: cells/placement, routing/deploys, warming/wake storms, geography/DR, inference hosting, telemetry, distributed-store evaluation and full release rehearsal.
- LT-S01–LT-S08: only selected advanced simulation/fidelity/dense-event experiments under PF/SW/feature authority.

Promotion requires a named need, measured bottleneck or approved feature, relevant decisions, ready dependencies and authorized implementation. Keep shared-world regional priority; independent-world throughput does not qualify a crowded shared scene. SQL distribution is not required before testing two simulation owners on one transactional store. A completed evaluation can select no change; deployment remains separate.

## Preservation and evidence

Use paging, bounded requests/working sets and explicit admission rather than arbitrary lifetime content caps. Do not erase required sources, cap legitimate witnesses, change world laws or report incomplete search as no result to meet a latency number. Every handoff names concrete children, source research, measured workload dimension and remaining gate. Table creation, isolated vector timing or a native microbenchmark is not full-stack acceptance.

[The research dossier](../../archive/02-research/massive-scale/README.md) remains dated evidence, not another phase owner. [Research coverage](../scaling/research-coverage.md) maps all chapters to existing and new tasks. The accepted September 25 shared-world regional direction supersedes earlier independent-world-first recommendations.
