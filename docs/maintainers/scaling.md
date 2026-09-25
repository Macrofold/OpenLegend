# Scaling remediation and current-code follow-through

**Status: planned work; no runtime fixes or acceptance claims.** [The current-code audit](../scaling/current-code-audit.md) pins SCA01–SCA52 to `03105fed9209c126e4e69e9faeb4687f42d1e74a`. [Sequence and gates](../scaling/sequence-and-gates.md) distinguishes G0/NOW foundations, G1/SOON growing-world work, G2/SOON public shared play and G3–G4/LATER conditional expansion.

This is a focused cross-cutting subtracker under D0–D6, PF, EPR, SW, CR, AG, INV, EWF and SL, not their replacement. Each SC child has one body here. Existing detailed work stays in its owner, linked below. SC01–SC16 anchors are preserved; splitting their formerly broad checklists completes no item. **All new or revised children below are Massive-scale research follow-through**, inheriting the specific research and audit references immediately above them.

The accepted priority is a region-divided shared world with independent worlds supported. No distributed deployment is required to keep the early interfaces compatible with that goal. Implement only under a separate implementation request; re-read current code and parent contracts before acting.

## Existing work remains in its existing owner

| Audit findings | Canonical work | Required research-derived qualification |
|---|---|---|
| SCA09, SCA35 | [D1/D2](production-data.md#remaining-d1d2-implementation-and-evidence), [CR](cognition-redesign.md) | Independent operational records and database eligibility before context text; small top-N must not conceal full-corpus preparation. |
| SCA10–SCA12 | [PF01/PF08](performance.md), D1 | Grow unrelated dictionaries/receipts independently; measure dirty discovery and full checkpoint encoding separately from SQL. |
| SCA21–SCA22 | [EPR02/EPR10](events-perception-and-reactions.md) | Fixed local audience with more distant entities, drafts, within-cell motion and receiver-specific ranges. |
| SCA26–SCA27 | [EPR03/EPR10](events-perception-and-reactions.md), PF09 | Changed-source/observer exposure and recent-encounter indexes, including dense first acquisition without missing witnesses. |
| SCA28 | [SW08](spatial-world.md), EPR10 | One unusually large body must not cause every small body's candidate query to expand globally. |
| SCA29–SCA30 | PF03/PF09/PF11, EWF08 | Native roster membership, due state, single-transition blocking, actual debt and all accepted speeds; unchanged RNG and encounter boundaries. |
| SCA31 | [SW05/SW06](spatial-world.md), [AG05/action capabilities](action-capabilities.md) | Carry coverage, partial and budget-exhausted results through wrappers and UI/plans; bounded stance attempts do not prove no route. |
| SCA33–SCA34 | [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake), CR10 | No all-actor visibility/history work before dirty eligibility or telemetry-wide cognitive invalidation; safe dirty acknowledgment. |
| SCA45 | [EWF08/EWF10](extensible-world-foundation.md), [INV-3/INV-7](inventions-and-world-evolution.md), SW | New spawning/body/geometry/effect families supply invalidation and continuation evidence before widening finite-runtime assumptions. |
| SCA51–SCA52 | PF00/PF06/PF11, D3/D5/D6 | Query-work/payload bounds and full-stack cold/fault qualification; truthful unsupported-feature and capacity reporting. |

This routing table has no duplicate completion state. Detailed research extensions in the named trackers belong to those tasks. Common experiments come from the [research benchmark plan](../../archive/02-research/massive-scale/benchmark-plan.md); numerical budgets remain owned by PF and the relevant product decisions.

## Stage navigation

| Workstream | G0 / NOW | G1–G2 / SOON | Deferred boundary |
|---|---|---|---|
| SC01 control/privacy | Context and explicit DTO contracts | Authentication, presence and adversarial isolation | Regional controller transfer uses the same identity |
| SC02 replication | Recipient/baseline identity | Scoped join/replay, chunked bootstrap and cold-join bounds | Transport/vendor replacement requires evidence |
| SC03 admission | Queue accounting and failure classes | Safe bounded admission and lifecycle cleanup | Fleet isolation is long-term work |
| SC04 ownership | Namespaces and regional read/write contract | Scoped recovery and independent-world isolation proof | Actual region fencing/transfer is LT-R work |
| SC05 recovery | Keyed checks and isolated replay | Paged validation and recovery qualification | Planetary restore is LT-M work |
| SC06–SC08 jobs/AI/indexing | Lifecycle and dirty-source seams | Durable work, fairness and scoped indexing | Self-hosted/distributed inference is LT-O work |
| SC09–SC11 records/accounting | Exact types, selected policy, source incarnation | Safe publication, aggregates and erasure | Physical multi-store distribution is conditional |
| SC12–SC15 mechanics | Indexed lookup and dependency/cost seams | Library growth, evolution and active-work qualification | Advanced solvers/G2 remain separate gates |
| SC16 saves | Coherent capture contract | Bounded capture/catalogue/restore | Hosted placement expansion is LT-O/LT-M work |

A stage is attached to each child below. An earlier stage does not override dependencies or require an unrelated feature to wait.

<a id="sc01"></a>
## SC01 — Authenticated multi-human control and privacy

**Parents:** D0/D1/D5, identity, CR/EWF04. **Massive-scale research:** [NOW foundations](../../archive/02-research/massive-scale/now/foundations.md), [security](../../archive/02-research/massive-scale/domains/extensibility-security.md); SCA01/SCA03/SCA48.

- [ ] **SC01.1 — Request-scoped identity map.** G0. Inventory `local-player`, controlled/default-resident IDs, profiles, history, milestones and creator entry points; define authenticated account/session/controller-generation bindings. **Exit:** every entry point has one explicit control/disclosure context; names and client actor IDs grant no authority.
- [ ] **SC01.2 — Multi-human authentication and role enforcement.** G2; depends on SC01.1 and D0 privacy decisions. Implement independent player/creator/operator grants while retaining a local-owner adapter. **Exit:** two humans cannot control each other's actors; creator tools, exports, model tools and diagnostics deny human-private messages/notes.
- [ ] **SC01.3 — Shared presence and absence.** G2; depends on SC01.2. Implement D03's existing all-player absence, unattended toggle, pause precedence, multi-tab and disconnect behavior per admitted session. **Exit:** hiding/closing one tab cannot pause or take over another player's actor; revocation and old heartbeats are handled explicitly.
- [ ] **SC01.4 — Positive permitted DTOs.** G0 contract, G2 enforcement; depends on SC01.1. Define allowed observation fields rather than relying only on subtracting known private fields from Entity. **Exit:** adding a private field cannot make it appear in ordinary client/model views; recognition and independently owned return data remain correct.

<a id="sc02"></a>
## SC02 — Per-recipient projection, bootstrap and replay

**Parents:** PF05, synchronization, SW09/SW10. **Massive-scale research:** [browser/networking](../../archive/02-research/massive-scale/domains/browser-networking.md), [perception/interest](../../archive/02-research/massive-scale/domains/perception-interest.md); SCA02/SCA47.

- [ ] **SC02.1 — Recipient and baseline keys.** G0; depends on SC01.1. Bind complete views, history/optional reads and patches to observer/controller, world/timeline and disclosure revision. **Exit:** caches cannot alias two different private views; shared fragments have explicitly equivalent authorized content.
- [ ] **SC02.2 — Coherent join and resume.** G2; depends on SC02.1 and current durable head. Implement snapshot-to-following-update continuity, valid replay windows, reset and revocation. **Exit:** join races lose no required updates; another actor/timeline's cursor is rejected; stale clients obtain a fresh permitted baseline.
- [ ] **SC02.3 — Separate bootstrap payload classes.** G1 for catalogue growth, G2 for shared delivery. Introduce authorized map chunks and paged recipe/item discovery separate from reliable effects and replaceable transforms. **Exit:** the whole hidden map is not sent to an ordinary observer; pagination does not delete learned capabilities or required events.
- [ ] **SC02.4 — Cold-join and slow-consumer qualification.** G2; depends on SC02.2/SC02.3 and SC03. Preserve stream-drain correctness while bounding reset bytes/CPU, baseline memory and concurrent joins. **Exit:** loss, stalled readers and reconnect bursts have bounded resources and truthful progress; raising the eight-local-tabs limit alone cannot pass.

<a id="sc03"></a>
## SC03 — Admission queues, ephemeral lifecycle and failure containment

**Parents:** PF04/PF05/PF09, D5. **Massive-scale research:** [operations/cost](../../archive/02-research/massive-scale/domains/operations-cost.md), [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md); SCA06–SCA08.

- [ ] **SC03.1 — Queue accounting.** G0. Measure pending count/bytes/age at mutation, DB, AI admission and projection owners; distinguish queued, accepted, committed, expired and rejected. **Exit:** end-to-end deadlines include queue wait, not merely execution/statement time; telemetry does not create per-request SQL work.
- [ ] **SC03.2 — Class-aware admission and cancellation.** G1/G2; depends on SC03.1. Bound admitted work before retaining expensive payloads; cancel undispatched optional work and preserve accepted/paid outcomes. **Exit:** valid-request bursts and slow DBs cannot grow queues indefinitely or silently drop accepted commands.
- [ ] **SC03.3 — Session/cache lifecycle.** G1/G2; depends on explicit expiry identity. Reclaim presence sequence guards, abandoned waiters and actor/session caches only after old identities are rejected. **Exit:** repeated new tabs/removals do not leak process state; old heartbeats cannot undo newer state after cleanup.
- [ ] **SC03.4 — Failure classification and isolation.** G0 contract, G2 qualification. Separate recipient/optional projection faults from commit uncertainty. **Exit:** one bad view does not unnecessarily pause unrelated players; actual integrity failures retain fail-stop behavior and accurate user-visible status.

<a id="sc04"></a>
## SC04 — Storage scope and region-authority seams

**Parents:** D0/D1/D6. **Massive-scale research:** [persistence](../../archive/02-research/massive-scale/domains/persistence-consistency.md), [hot-world partitioning](../../archive/02-research/massive-scale/later/hot-world.md); SCA04/SCA05/SCA15.

- [ ] **SC04.1 — Singleton ownership inventory.** G0. Map each table, cache, integration key, job/attempt and reference to world/timeline/principal/owner scope. **Exit:** a reviewed namespace map exists for consumed records; stable IDs do not encode machine placement; the current advisory guard is not removed prematurely.
- [ ] **SC04.2 — Regional access contract.** G0; depends on SC04.1. Define bounded read/write sets and cross-boundary cause identities, keeping clock/RNG/order decisions explicit. **Exit:** new feature APIs need not assume an unrestricted whole-world callback; one writer still executes current semantics.
- [ ] **SC04.3 — Scoped restoration and lifecycle operations.** G1; depends on D1/D2 consumed records. Scope job cleanup, save installation, timeline and accounting operations to their actual owner. **Exit:** two independent worlds in one supported deployment cannot alter each other's records; this is not shared-region qualification.

**Moved long-term delivery, not deleted:** actual storage-enforced fencing, multi-owner ordering and actor/whole-world transfer are owned by [LT-R03–LT-R07](scaling-long-term/regions.md). Their two-region contested-resource, stale-owner and delayed-AI tests retain SC04's original exit requirements. A namespace change cannot complete those tasks.

<a id="sc05"></a>
## SC05 — Checked recovery without repeated whole-world copying

**Parents:** D1/D2, PF08. **Massive-scale research:** [data migration](../../archive/02-research/massive-scale/soon/data-migration.md), [persistence](../../archive/02-research/massive-scale/domains/persistence-consistency.md); SCA13/SCA14.

- [ ] **SC05.1 — Keyed accepted-mind checks.** G0. Replace per-actor `rows.find` with keyed comparison without weakening mismatch detection. **Exit:** independently increased actor count removes the nested lookup and still detects missing/extra/conflicting accepted records.
- [ ] **SC05.2 — Isolated incremental journal recovery.** G0/G1. Apply validated changes to one isolated candidate using bounded reads, not a full-root clone per journal entry. **Exit:** exact head/prefix/path validation remains; interruption cannot modify the last valid durable state.
- [ ] **SC05.3 — Paged current-record validation.** G1; depends on D1/D2 and SC05.1. Move knowledge/manifest/current-record checks toward bounded regional loading. **Exit:** completeness is checked without mandatory full-world residency; exact content pins, unrelated state and accounting survive in-place migration.
- [ ] **SC05.4 — Recovery workload gate.** G1; depends on the changed path, uses PF00. Measure validation, decode/application, peak memory and time to useful gameplay across actor count and journal length separately. **Exit:** corruption cases fail safely and measured results identify remaining limits, not merely faster process startup.

<a id="sc06"></a>
## SC06 — Durable job/source lifecycle and recovery queries

**Parents:** D1/D2, CR. **Massive-scale research:** [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md), [memory retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md); SCA15/SCA38/SCA51.

- [ ] **SC06.1 — Indexed lifecycle records.** G1; source identity begins at G0. Persist consumed world/owner, status, source incarnation and operation keys; page unfinished/uncertain work rather than all historical job payloads. **Exit:** recovery work follows eligible jobs; world-specific restore cannot clear another world's speech linkage.
- [ ] **SC06.2 — Durable embedding attempt association.** G1; depends on SC06.1/SC11. Associate source batches and paid attempts before dispatch and reconstruct suppression/reconciliation after restart. **Exit:** faults before/after dispatch, settlement and publication never silently repurchase unknown work.
- [ ] **SC06.3 — Complete bounded job queries.** G1. Chunk SQL identifier inputs and return payloads for consumed queries including `getSpeechJobs`. **Exit:** pages preserve complete required response history with explicit continuation and stable ordering; a LIMIT cannot conceal omissions.
- [ ] **SC06.4 — Terminal-work retention.** G2; depends on D59/accounting/erasure policies. Define compacted terminal records and retained retry/reconciliation evidence. **Exit:** old requests remain safely rejected/replayed within policy, no paid outcomes disappear on restore, and cleanup is itself bounded.

<a id="sc07"></a>
## SC07 — Fair multi-actor intelligence and maintenance

**Parents:** PF09, CR/AG/NC; EPR05 remains intake owner. **Massive-scale research:** [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md), [capacity model](../../archive/02-research/massive-scale/capacity-model.md); SCA32/SCA40.

- [ ] **SC07.1 — Execution-class admission.** G1/G2; depends on SC03 and actor identity. Replace the director-global slot when the supported workload needs concurrency, using bounded conversation/thought/invention/maintenance classes and per-actor serialization. **Exit:** independent actors progress without conflicting mind writes or a second world authority.
- [ ] **SC07.2 — Scoped cancellation and maintenance fairness.** G1/G2; depends on SC07.1. Cancel only affected work and define useful age/fairness within admitted capacity. **Exit:** continuous interactive traffic does not indefinitely starve eligible maintenance; no unconditional extra inference purchases.
- [ ] **SC07.3 — Native continuity under provider failure.** G1/G2. Exercise plan continuation/protection, stale completion, uncertain billing and mandatory-context overflow under delayed/unavailable providers. **Exit:** no duplicated accepted effects, erased evidence or automatic paid retry; operational failures stay distinct from fictional decisions.
- [ ] **SC07.4 — Real-time versus simulated-time capacity.** G1/G2; uses PF00 and all accepted speeds. Count opportunities, calls, evidence ingress, completed cleanup and source backlog in both clocks. **Exit:** the admitted workload has bounded useful response age or explicit overload; speed controls alone are not capacity evidence.

<a id="sc08"></a>
## SC08 — Dirty-source indexing with isolated failure dispositions

**Parents:** D2, EPR05/CR. **Massive-scale research:** [memory retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md), [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md); SCA36/SCA37.

- [ ] **SC08.1 — Committed source-fed indexing.** G0/G1; depends on SC06 durable work where needed. Enqueue affected speech/source identities and actual recipients; avoid rebuilding all actors' speech pools for one utterance. **Exit:** fixed local speech does not prepare unrelated minds; startup reconstructs pending work once.
- [ ] **SC08.2 — Isolated failure dispositions.** G1. Replace actor-specific whole-pass returns with scoped exhausted/uncertain/unavailable dispositions and fair continuation. **Exit:** unfunded/failed actor A does not stop eligible actor B and is not automatically retried.
- [ ] **SC08.3 — Attempt bookkeeping and index lag.** G1; depends on SC06.2/SC11. Partition and reclaim source-attempt state by lifecycle, revise/remove only affected keys and report missing-index coverage. **Exit:** no global actor-by-attempt-set sweep; required direct evidence remains available and index gaps are not reported as missing knowledge.

<a id="sc09"></a>
## SC09 — Explicit SQL dialect and exact numeric boundaries

**Parents:** D0/D1. **Massive-scale research:** [contract review](../../archive/02-research/massive-scale/now/contracts.md), [persistence](../../archive/02-research/massive-scale/domains/persistence-consistency.md); SCA19/SCA20.

- [ ] **SC09.1 — Parameterized dialect contracts.** G0/G1. Give new operational repositories explicit supported PostgreSQL/SQLite operations rather than extending global question-mark SQL rewriting. **Exit:** literal question marks, operators and JSON paths have stable semantics; existing rollback/error behavior is preserved during incremental migration.
- [ ] **SC09.2 — Numeric and clock representation map.** G0. Catalogue quantities, currency, time, revisions and IDs with units and exact wire/JS/SQL conversions. **Exit:** aggregate arithmetic as well as inputs is exact or rejected before mutation; no unsafe integer round trip or silent unit change.
- [ ] **SC09.3 — Boundary qualification.** G1; depends on SC09.1/SC09.2. Exercise maximum-safe-integer/aggregate overflow, dialect literals, save conversion and conserved-resource/monetary operations. **Exit:** recorded evidence covers the consumed contracts without changing database technology or weakening validation.

<a id="sc10"></a>
## SC10 — One spending-policy owner and reconciled aggregates

**Parents:** D1/D5, billing, PF04. **Massive-scale research:** [operations/cost](../../archive/02-research/massive-scale/domains/operations-cost.md), [agent compute](../../archive/02-research/massive-scale/domains/agent-compute.md); SCA49/SCA50.

- [ ] **SC10.1 — Reconcile selected ceiling.** G0. Resolve config/display versus `Store.reserve`'s remaining `Math.min(50, ceilingUsd)` against the accepted policy owner. **Exit:** enforcement and display agree below/at/above the selected limit; this task does not authorize increasing a cap or spending funds.
- [ ] **SC10.2 — Atomic accounting aggregates.** G1/G2; depends on SC10.1 and measured ledger cost. Add exact scoped reservation/settlement aggregates with retained attempt evidence and reconciliation. **Exit:** fixed activity with more month history avoids repeated full-month preparation; concurrent reservations cannot overspend.
- [ ] **SC10.3 — Scope, late receipts and restoration.** G2; depends on SC04/SC10.2. Handle world/actor/account namespaces, unattributed legacy attempts, duplicate/late settlements and uncertain holds. **Exit:** restore neither double-debits nor restores spent allowance; caches are display-only and authoritative admission remains current.

<a id="sc11"></a>
## SC11 — Source identity, derivative publication and erasure dependencies

**Parents:** D1/D2, CR/SL. **Massive-scale research:** [memory retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md), [data migration](../../archive/02-research/massive-scale/soon/data-migration.md); SCA18/SCA35/SCA39.

- [ ] **SC11.1 — Source incarnation contract.** G0/G1. Bind memories, knowledge, vectors and accepted text to the existing source/timeline identity design. **Exit:** delete/recreate or same-ID/equal-revision restore cannot alias an old publication target.
- [ ] **SC11.2 — Atomic derivative admission.** G1; depends on SC11.1. Check current eligibility/revision and operation authority at durable publication, retaining pre-dispatch scope and post-return validation. **Exit:** a correction between a preliminary check and awaited upsert cannot publish an eligible stale derivative.
- [ ] **SC11.3 — Indexed erasure dependencies.** G1/G2; depends on D2 and selected policy. Maintain reverse lineage and current correction/forgetting overlays without a world-sized JSON ledger as the only serving/cleanup path. **Exit:** caches, summaries, accepted text and index rebuilds cannot resurrect invalid sources; required commitments and human-private boundaries survive.
- [ ] **SC11.4 — Restore and cold reconstruction corpus.** G1/G2; depends on the changed publication path. Exercise old results, deletion/recreation, same IDs after restore, stale caches and creator archive access. **Exit:** all remain ineligible or fail safely; physical retention does not create NPC recall rights.

<a id="sc12"></a>
## SC12 — Scalable invention discovery and exact deduplication

**Parents:** INV-1/INV-2.1a/INV-3, D2/D4. **Massive-scale research:** [mechanic admission](../../archive/02-research/massive-scale/domains/extensibility-security.md), [memory retrieval](../../archive/02-research/massive-scale/domains/memory-retrieval.md); SCA41/SCA42. Exact performance is measured, not assumed independent of all library size.

- [ ] **SC12.1 — Indexed exact identity and family membership.** G0/G1. Replace full recipe-equality/resource-family scans with owner-maintained lookup while retaining full canonical equality, collision handling and provenance. **Exit:** duplicate admission learns/attributes correctly and unrelated definitions do not require full traversal.
- [ ] **SC12.2 — Background definition indexing.** G1; depends on SC06/SC11. Remove embedding of every missing learned recipe from interactive search; retain inspectable incomplete coverage and explicit continuation. **Exit:** a cold library does not silently turn one query into unbounded paid backfill or false no-match.
- [ ] **SC12.3 — Permission-first selection and currentness.** G1; depends on indexed records. Select current knowledge/rights/revision before ranking and use set/index membership rather than nested learned-array scans. **Exit:** inaccessible libraries remain undiscoverable; shared immutable embeddings are used only where disclosure is safe.
- [ ] **SC12.4 — Library-growth end-to-end gate.** G1; depends on SC12.1–SC12.3 and INV-2 flow. Grow learned and inaccessible libraries independently; measure preparation, DB, embeddings and latency. **Exit:** reuse/modify/new/cancel/reconnect still admit once; quality and incomplete-index behavior are tested, not inferred from top-five output.

<a id="sc13"></a>
## SC13 — Composed-mechanic work and locality evidence

**Parents:** EWF08, INV-3/INV-7; shared budget/dependency semantics remain in the world-module runtime. **Massive-scale research:** [extensibility/security](../../archive/02-research/massive-scale/domains/extensibility-security.md), [environment systems](../../archive/02-research/massive-scale/domains/environment-systems.md); SCA28/SCA44/SCA45 and [mechanic-growth cases](../scaling/mechanic-growth.md).

- [ ] **SC13.1 — Compiled work/dependency descriptors.** G0 before new composition. Carry read/write/membership scope, spatial/graph reach, due policy, per-invocation state and transitive descendants through existing family admission. **Exit:** a port substitution cannot silently widen work, authority or shared mutable state.
- [ ] **SC13.2 — Aggregate activation and burst accounting.** G1 before expanded mechanics; depends on SC13.1. Account for concurrent active work, recurrence and churn, not only schema/node size; reject/contain zero-time feedback. **Exit:** many small declarations cannot bypass combined bounds and required native effects/evidence take precedence over optional work.
- [ ] **SC13.3 — Spatial and lifecycle capability checks.** G1 before new body/geometry/spawning families. Bind expanded extents and cross-region effects to actual indexing, invalidation and ownership capabilities. **Exit:** unsupported geometry or remote mutation remains explicit; existing ordinary inventions gain no unnecessary confirmation ceremony.
- [ ] **SC13.4 — Adversarial composition proof.** G1 feature gate; depends on SC13.1–SC13.3. Exercise inactive-library growth, mass invocations, high-fanout selectors, cyclic triggers, giant contact extents and topology churn. **Exit:** work is attributable and finite or explicitly deferred; no arbitrary lifetime entity/recipe cap, private disclosure or paid authority is introduced.

<a id="sc14"></a>
## SC14 — Indexed dependencies for coherent definition changes

**Parents:** INV-5, EWF07/EWF08, D4. **Massive-scale research:** [environment systems](../../archive/02-research/massive-scale/domains/environment-systems.md), [data migration](../../archive/02-research/massive-scale/soon/data-migration.md); SCA43.

- [ ] **SC14.1 — Reverse dependency inventory.** G1 before growing evolution workflows. Track live state, resources, plans/actions, jobs, constructs and retained saves/content through the existing owner. **Exit:** removal discovers every relevant dependency via bounded lookup rather than routine full-world scans.
- [ ] **SC14.2 — Prepared activation with fresh commit checks.** G1/P3; depends on SC14.1 and INV-5. Prepare immutable candidates outside the commit where safe, then revalidate revisions and dependency membership atomically. **Exit:** concurrent plan/geometry changes cannot slip through; elapsed work, resources and pinned versions remain coherent without cohort-dependent laws.
- [ ] **SC14.3 — Query-membership invalidation.** G1; depends on semantic writers. Record old/new regions, extents, sense and rule changes including stationary observers and newly matching members. **Exit:** previously empty results are invalidated when appropriate and unrelated regions avoid complete rescans.

<a id="sc15"></a>
## SC15 — Active-rule, resource and holdings query indexes

**Parents:** PF03/PF05/PF09, EPR/EWF. **Massive-scale research:** [simulation/time](../../archive/02-research/massive-scale/domains/simulation-time.md), [perception/interest](../../archive/02-research/massive-scale/domains/perception-interest.md); SCA23–SCA25/SCA46.

- [ ] **SC15.1 — Applicable-rule and active-effect indexes.** G0/G1 after a focused profile. Track automatic applicability separately from active instances. **Exit:** an initially unaffected entity can activate at its threshold/deadline; removing inactive entities from processing does not suppress real onset.
- [ ] **SC15.2 — Resource and holdings indexes.** G0/G1 after a focused profile. Reuse semantic owners for compatible resources, item ownership/pile contents and quantities. **Exit:** fixed local survival/observation/projection avoids traversal of unrelated items/scenery without a second writable inventory.
- [ ] **SC15.3 — Complete mutation/invalidation coverage.** G0/G1; accompanies SC15.1/SC15.2. Cover pickup/drop/consume/craft/spawn/death, god edits, module changes, capability transformations and restore. **Exit:** moved resources, new query members and quantity changes agree with a small exhaustive reference.
- [ ] **SC15.4 — Observer cache lifecycle and sparse/dense proof.** G1; depends on the indexed path. Bound caches by use and valid revisions; reuse safe source descriptors, not private projections. **Exit:** sparse fixed-local work avoids global rebuilds; dense work is measured rather than pruned, and eviction does not erase memory.

<a id="sc16"></a>
## SC16 — Coherent streamed saves and a portable catalogue

**Parents:** SL, D1/D2/D5, PF08. **Massive-scale research:** [data migration](../../archive/02-research/massive-scale/soon/data-migration.md), [persistence](../../archive/02-research/massive-scale/domains/persistence-consistency.md); SCA16/SCA17.

- [ ] **SC16.1 — Bounded coherent capture.** G0 contract, G1 delivery. Capture/encode/hash a stable durable boundary with peak-memory, bytes and transaction-duration accounting. **Exit:** limits apply before unbounded materialization; no repeated full encoding merely to hash; journal reclamation never outruns the published checkpoint.
- [ ] **SC16.2 — Indexed/paged save catalogue.** G1. Separate metadata paging from payload location; preserve unlimited named-slot policy subject to explicit storage/operational admission. **Exit:** listing does not read every slot and hosted references do not assume local folders move with PostgreSQL.
- [ ] **SC16.3 — Staged verified restore.** G1/G2; depends on SC11, SL and current-record capture. Validate complete source/content/manifests and history before activation, retaining recovery slot and current privacy/accounting. **Exit:** interrupted capture/restore publishes neither partial saves nor mixed authority.
- [ ] **SC16.4 — Large-save qualification.** G1/G2; uses PF/SL evidence. Grow history and save count independently and measure peak memory, transaction time and useful recovery. **Exit:** a larger `MAX_BYTES` is not the fix; legacy/retained records and non-rewindable external outcomes remain intact.

Hosted object-storage relocation and very-large recovery are separately gated in [long-term storage/operations](scaling-long-term/README.md); SC16's local/current-record work does not wait for them.

## Evidence and closure

Each handoff names child and parent, research source, current code, preserved invariants, actual checks and remaining gate. A child closes only on its stated result; parent scale/release criteria remain open until independently met. Documentation does not authorize deployment, paid calls, new retention deletion, changed physics, a raised budget or automatic retries.

See the [long-term backlog](scaling-long-term/README.md) for deferred multi-authority/specialized work and the [research coverage map](../scaling/research-coverage.md) for recommendations outside SCA01–SCA52. They link to canonical task bodies rather than duplicating their state.
