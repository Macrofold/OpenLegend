# Scaling remediation and current-code follow-through

**Status: planned work; no runtime fixes or acceptance claims.** [The current-code audit](../scaling/current-code-audit.md) pins the evidence to `03105fed9209c126e4e69e9faeb4687f42d1e74a`. [Scaling guidance](../scaling/README.md) explains the accepted shared-world priority and the boundaries this work must preserve.

This is a **focused cross-cutting subtracker**, not a replacement for D0–D6, PF, EPR, SW, CR, AG, INV, EWF or SL. Existing parent tasks retain specifications and release acceptance. New SC child task bodies live here exactly once. Already detailed work is routed to its existing owner in the first table; do not create duplicate checklists for it. Implement only when requested, preserve unrelated work, and re-read the current code before acting on a pinned finding.

Stages: **NOW** means establish the seam or remove a confirmed multiplier after a short baseline; **SOON** means before the relevant hosted/multiplayer/data-growth promise; **LATER** means before actual multiple-authority or specialized-storage deployment. These are dependency gates, not dates or capacity promises.

## Findings already owned by existing work

| Audit findings | Canonical work | Specific acceptance extension from this audit |
|---|---|---|
| SCA09, SCA35 | [D1/D2](production-data.md#remaining-d1d2-implementation-and-evidence), [CR](cognition-redesign.md) | Independent operational records and DB-side eligibility before context text; top-N alone must not conceal full-corpus preparation. |
| SCA10–SCA12 | [PF01/PF08](performance.md), D1 | Vary unrelated dictionary/receipt history independently; instrument diff enumeration and full checkpoint encoding outside versus inside transactions. |
| SCA21–SCA22 | [EPR02/EPR10](events-perception-and-reactions.md) | Hold local audience fixed while increasing distant entities; include drafts, within-cell motion and receiver-specific ranges. |
| SCA26–SCA27 | [EPR03/EPR10](events-perception-and-reactions.md), [PF09](performance.md) | Changed-source/observer exposure and indexed recent encounters, including dense first acquisition; no missing witnesses. |
| SCA28 | [SW08](spatial-world.md), EPR10 | Physical contact with one unusually large body and many small bodies; conservative extent filtering without global maximum-radius explosion. |
| SCA29–SCA30 | [PF03/PF09/PF11](performance.md), EWF08 | Native roster membership, due-state updates, single-transition blocking, actual debt and all accepted speeds; no altered RNG or encounter boundaries. |
| SCA31 | [SW05/SW06](spatial-world.md), [AG05/action capabilities](action-capabilities.md) | Carry search budget/coverage/partial outcomes through domain wrappers and UI/plans; exhausted stance attempts are not proof of no route. |
| SCA33–SCA34 | [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake), CR10 | No all-actor visibility/history work before dirty eligibility; no telemetry-wide invalidation; generation-safe dirty acknowledgment and indexed deadlines. |
| SCA45 | [EWF08/EWF10](extensible-world-foundation.md), [INV-3/INV-7](inventions-and-world-evolution.md), SW | Every new spawning/body/geometry/effect family supplies invalidation and continuation evidence before changing finite-runtime assumptions. |
| SCA51–SCA52 | [PF00/PF06/PF11](performance.md), [D3/D5/D6](production-data.md) | Parameter/payload/query-work bounds, full-stack fault/cold-load qualification, and truthful unsupported-feature/capacity reporting. |

The table adds audit-specific evidence to those owners; it does not mark them complete or establish a second implementation body. The SC tasks below supply currently uncovered integration details. Parent acceptance remains open even after an SC child closes.

## SC child work index

| ID | Stage | Deliverable | Parent / affected owners | Findings |
|---|---|---|---|---|
| [SC01](#sc01) | NOW contract; SOON delivery | Authenticated multi-human control and privacy context | D0/D1/D5, identity, CR/EWF04 | 01, 03, 48 |
| [SC02](#sc02) | NOW protocol seam; SOON delivery | Recipient-scoped views, joins and replay | PF05, synchronization, SW09/SW10 | 02, 47 |
| [SC03](#sc03) | NOW/SOON | Bounded admission, lifecycle cleanup and failure classification | PF04/PF05/PF09, D5 | 06–08 |
| [SC04](#sc04) | NOW identity; LATER authorities | Storage namespaces and region ownership fencing | D0/D1/D6 | 04–05, 15 |
| [SC05](#sc05) | NOW keyed validation; SOON recovery | Incremental checked recovery and startup verification | D1/D2, PF08 | 13–14 |
| [SC06](#sc06) | SOON | Indexed durable work lifecycle and paid source-attempt recovery | D1/D2, CR | 15, 38, 51 |
| [SC07](#sc07) | SOON | Fair multi-actor execution and maintenance service | PF09, CR/AG/NC | 32, 40 |
| [SC08](#sc08) | NOW/SOON | Dirty-source indexing and failure-isolated fairness | D2, EPR05/CR | 36–37 |
| [SC09](#sc09) | NOW contracts; SOON migration | Typed SQL/number boundaries | D0/D1 | 19–20 |
| [SC10](#sc10) | NOW policy reconciliation; SOON scale | One budget authority and reconciled accounting aggregates | D1/D5, billing, PF04 | 49–50 |
| [SC11](#sc11) | NOW identity; SOON storage | Source incarnations, atomic derivative admission and erasure dependencies | D1/D2, CR/SL | 18, 35, 39 |
| [SC12](#sc12) | SOON library growth | Indexed invention lookup and exact deduplication | INV-1/INV-2.1a/INV-3, D2/D4 | 41–42 |
| [SC13](#sc13) | NOW contract; before expanded mechanics | Composed-mechanic cost/dependency admission proof | EWF08, INV-3/INV-7 | 28, 44–45 |
| [SC14](#sc14) | SOON definition growth | Reverse dependencies and coherent definition changes | INV-5, EWF07/EWF08, D4 | 43 |
| [SC15](#sc15) | NOW measured hot-path work | Active-rule/resource/holdings query indexes | PF03/PF05/PF09, EPR/EWF | 23–25, 46 |
| [SC16](#sc16) | SOON data growth; LATER hosted storage | Streamed coherent saves and paged portable catalogue | SL, D1/D2/D5, PF08 | 16–17 |

<a id="sc01"></a>
## SC01 — Authenticated multi-human control and privacy

- [ ] Inventory and replace service-global `local-player`, controlled actor, default-resident, profile, history and milestone assumptions at request boundaries. Bind account/session/controller generation server-side; do not trust a submitted actor ID.
- [ ] Separate player, creator and operator privileges. Keep the loopback/local-owner adapter available without exposing it as production authentication. Creator access must not disclose human-private messages/character notes through editors, queries, exports, model tools or diagnostics.
- [ ] Implement D03's accepted shared-world presence behavior per admitted human/session, including multiple tabs, disconnect grace and controller transfer. Presentation focus is not authority.
- [ ] Define positive permitted observation DTOs at shared/model boundaries; audit new private fields rather than relying only on deleting a known list from broad Entity records.

**Dependencies:** D0 identity/privacy map; existing command/response admission and save-generation guards. **Exit:** two authenticated humans control different actors, know different names/secrets and reconnect independently; forged control, creator inspection of human-private data, revoked sessions and old-generation commands fail. Closing one tab does not pause or take over another person's actor. Native/NPC and local single-player routes remain functional.

<a id="sc02"></a>
## SC02 — Per-recipient projection, bootstrap and replay

- [ ] Key complete views, history epochs, optional reads and patch baselines by authenticated observer/controller, world/timeline and applicable disclosure revision. Reuse encoded fragments only when they contain identically authorized data.
- [ ] Make join capture and following updates one coherent revision boundary; scope reset/replay and permission revocation. A cursor from another actor or timeline must not resume.
- [ ] Separate static authorized map chunks, paged recipe/item catalogues and required reliable events from replaceable transforms. Preserve known content independent of which UI page is loaded.
- [ ] Bound bootstrap/reset bytes, CPU, retained baseline memory and concurrent cold joins. Retain the existing stream-drain semantics and bounded patch ring; add a resnapshot/admission path rather than blindly raising the eight-local-tabs limit.

**Exit:** two observers receive different permitted views, including after resnapshot and revocation; a hidden-map fixture is not exposed by whole-map bootstrap. Packet-gap, slow-consumer and reconnect-storm fixtures have bounded pending resources and truthful progress. Measure encoding/projection work as recipients and visible-set size vary; no transport switch is itself acceptance.

<a id="sc03"></a>
## SC03 — Admission queues, ephemeral lifecycle and failure containment

- [ ] Add count/byte/age/deadline accounting at mutation, database, AI admission and projection queue owners. Apply class/principal-aware admission before retaining expensive payloads; distinguish queued, accepted, committed, rejected and expired.
- [ ] Design safe cleanup for presence sequence guards, canceled waiters and per-session/per-actor caches. Expired identities are rejected before discarding anti-replay watermarks; restarting is not the cleanup strategy.
- [ ] Distinguish recipient/optional projection failures from authoritative commit uncertainty. Isolate a failing view where safe; preserve fail-stop behavior for actual integrity/storage failures and keep user-facing error classification accurate.
- [ ] Propagate cancellation/deadlines to undispatched optional work; do not cancel or replay a paid/committed effect merely to empty a queue.

**Exit:** oversized request bodies remain rejected; a burst of individually valid requests, slow DB and abandoned clients cannot grow retained work without bound. Queue wait counts toward deadlines. Inject one bad projection and one failed commit: only the latter must necessarily stop the affected authority. Unrelated worlds/players remain isolated within the selected deployment envelope.

<a id="sc04"></a>
## SC04 — Storage scope and region-authority seams

- [ ] Under D1, map every singleton table/cache/integration key and job/attempt reference to explicit logical ownership; retain stable world/entity identity while storage placement changes. Do not remove the database-wide advisory guard before a replacement is proven.
- [ ] Under D6, enforce owner generation and expected durable head at the authoritative write boundary. An expired owner cannot regain write power after process suspension or a network partition.
- [ ] Define region-local read/write sets, cross-boundary causes, source/clock ordering and deterministic randomness treatment. Keep one owner initially; do not expose unrestricted whole-world transition callbacks as the eventual cross-region API.
- [ ] Scope recovery and save installation to the selected world/owner so another world's jobs, budget or timeline cannot be altered. Selective reads alone do not make writes isolated.

**Exit:** first show two independent worlds in one supported deployment without key collision; then qualify two regions of the shared world with one contested resource and a migrating actor. Kill/revive the former owner, replay transfers and delay AI completion; there is one authorized result and no duplicate resource/spend. The independent-world test does not satisfy the shared-world gate by itself.

<a id="sc05"></a>
## SC05 — Checked recovery without repeated whole-world copying

- [ ] Replace startup accepted-mind `rows.find` comparisons with keyed validation while preserving mismatch detection. Identify whole-world knowledge/manifest verification that needs paged regional treatment under D1/D2.
- [ ] Replay journal changes against an isolated recovery candidate without deep-copying the entire world per entry, using bounded batches/reads where required. Keep path validation, exact head/prefix checks and failure atomicity.
- [ ] Measure startup validation, journal decode/application, retained bytes and first-useful-world time separately. Include old and new definition pins and in-place development migration.

**Exit:** corruption and missing-prefix fixtures fail explicitly without modifying the last valid durable state. Vary actor count and journal length independently; accepted-mind validation no longer has the nested actor-by-row lookup, and replay no longer incurs one complete root clone per record. Preserve all required fields and accounting; do not weaken validation to achieve a startup target.

<a id="sc06"></a>
## SC06 — Durable job/source lifecycle and recovery queries

- [ ] Persist queryable world/owner, lifecycle, source incarnation, attempt and status keys for consumed jobs. Recover only relevant unfinished/uncertain work through indexed cursor queries rather than parsing every historical payload.
- [ ] Durably associate each background embedding source batch with its logical operation and paid attempt before dispatch. Reconstruct suppression/reconciliation after restart; distinguish a genuinely new source/explicit attempt from replay of an uncertain one.
- [ ] Bound SQL identifier batches and returned job payloads, including `getSpeechJobs`; preserve complete results through chunking/cursors. A page/result limit must not silently omit required direct-response history.
- [ ] Establish retention/compaction for terminal jobs and attempt evidence through existing retry/erasure/accounting policies; no arbitrary deletion of evidence needed for old requests or restore.

**Exit:** crash before dispatch, after dispatch, after settlement and before vector publication; reconnect/restart never silently repurchases unknown source work. A world restore cannot clear another world's speech-job linkage. Recovery cost follows eligible jobs and bounded pages, with a documented historical reconciliation path.

<a id="sc07"></a>
## SC07 — Fair multi-actor intelligence and maintenance

- [ ] Replace the one-director-global active slot with bounded host/world execution classes and per-actor serialization where the supported workload requires it. Separate direct conversation, autonomous thought, invention and maintenance admission without creating alternative world mutation owners.
- [ ] Scope cancellation to relevant actors/work, and define measurable fairness/maximum useful queue age for maintenance under continuous interactive load. Do not cure starvation by unconditionally buying more inference.
- [ ] Keep native protection and valid plan continuation independent of model availability. Preserve one accepted effect/receipt and explicit handling of stale results, uncertain billing and mandatory context overflow.
- [ ] Qualify all accepted simulation speeds: count opportunities, actual calls, evidence ingress, completed cleanup, source backlog and useful response age in both real and simulation time.

**Dependencies:** SC01/SC03 as applicable; EPR05 supplies precise intake, not a second scheduler. **Exit:** one busy conversation does not monopolize unrelated actors or indefinitely prevent eligible maintenance within admitted capacity. No actor gets concurrently conflicting mind writes; overload is explicit; no provider failure creates automatic paid retries or erased evidence.

<a id="sc08"></a>
## SC08 — Dirty-source indexing with isolated failure dispositions

- [ ] Feed committed speech/source changes and actual recipients into existing indexing work; avoid re-materializing every actor's speech on each local utterance. Rebuild pending state once on startup using the durable lifecycle from SC06.
- [ ] Replace whole-pass returns caused by one actor's exhausted budget/unavailable batch with scoped disposition, preserving no-retry semantics for that attempted work. Resume other eligible actors fairly.
- [ ] Keep attempted/in-flight source bookkeeping partitioned and bounded by lifecycle. Source revisions, removals and corrections invalidate affected entries without a global actor-by-attempt-set scan.

**Exit:** actor A has zero remaining allowance or an uncertain embedding result while B has eligible funded work; B progresses without repurchasing A. An utterance heard only by A does not prepare all unrelated minds. Preserve required direct evidence and report index lag rather than claiming absent knowledge.

<a id="sc09"></a>
## SC09 — Explicit SQL dialect and exact numeric boundaries

- [ ] Give new operational repositories explicit parameterized PostgreSQL/SQLite operations; do not reinterpret arbitrary SQL with global question-mark replacement. Retain existing validated query semantics during incremental adapter migration.
- [ ] Catalogue quantity/currency/time/revision/ID representations and conversions; check arithmetic results as well as individual inputs. Use the production design's exact integer/decimal-string convention at JavaScript/JSON boundaries where needed.
- [ ] Add focused verification for literal question marks/operators, JSON paths, rollback/error behavior, maximum-safe-integer boundaries, aggregate overflow and wire round trips. Do not change unrelated database technology.

**Exit:** supported queries have stable dialect semantics and no parameter/literal confusion; conserved-resource and monetary computations either remain exact or reject out-of-range values before mutation. Existing save quantities and unit meaning survive migration.

<a id="sc10"></a>
## SC10 — One spending-policy owner and reconciled aggregates

- [ ] Reconcile config, `Store.reserve`, display and documentation around the authoritative accepted ceiling. The remaining `Math.min(50, ceilingUsd)` discrepancy must be resolved deliberately; this task grants no permission to raise a cap or spend funds.
- [ ] Replace repeated full-month receipt preparation with exact scoped aggregates/read models where measured, retaining the underlying attempt evidence and reconciliation path. Update reservations/settlements and aggregates atomically under the proper owner.
- [ ] Namespace accounting across worlds/actors/accounts according to billing policy, including unattributed legacy attempts and late receipts. Cache only display products; current admission must remain authoritative.

**Exit:** concurrent reservations cannot overspend, duplicate/late settlement cannot double-debit or restore used allowance, and failure/restore keeps conservative uncertain holds. Display and enforcement agree below/at/above the selected limit. Vary month history with fixed current activity; report reservation and display latency separately.

<a id="sc11"></a>
## SC11 — Source identity, derivative publication and erasure dependencies

- [ ] Implement the existing D1/D2 source-incarnation/timeline contract for memories, knowledge, vectors and accepted text; a reused ID and equal content revision after restore/import is not automatically the same publication target.
- [ ] Check current source eligibility/revision and operation authority at the durable publication boundary. Keep pre-dispatch scope and post-return validation, but do not rely solely on a check before an awaited upsert when writers become independent.
- [ ] Index reverse source/derivative dependencies and current forgetting/correction state. Avoid an ever-growing world-sized JSON ledger as the only serving/cleanup mechanism; preserve overlays during recovery and archive/index rebuild.

**Exit:** a delayed old result, correction during publication, source deletion/recreation, restore with the same IDs and stale cache all fail safely or remain explicitly ineligible. Creator archives do not re-enter NPC recall. Required commitments and human-private restrictions survive consolidation, rollback and cold reconstruction.

<a id="sc12"></a>
## SC12 — Library-size-independent invention discovery and exact deduplication

- [ ] Move exact recipe identity lookup and resource-family membership behind indexed repositories/native indexes under their existing owners. Keep full canonical-content equality and collision handling, provenance and per-actor learning.
- [ ] Separate background indexing of immutable eligible definitions from a user's top-N search. Avoid serializing and embedding every missing learned recipe on an interactive request; report incomplete index coverage and provide the existing explicit continuation path.
- [ ] Route queries by current actor knowledge/rights and definition revision before ranking. Consider safely shared public/authorized immutable embeddings without leaking inaccessible definitions; retain private scope where required.
- [ ] Replace per-source learned-array membership scans with indexed/set membership and relevant currentness checks. Preserve stable request/continuation IDs and no automatic paid retry.

**Exit:** hold the requested technique and allowed result size fixed while growing the learned library and an unrelated inaccessible library. Measure source preparation, DB selection, embedding work, latency and disclosure; unseen definitions remain undiscoverable and missing embeddings do not fabricate a no-match result. Existing reuse/modify/new flows still admit once.

<a id="sc13"></a>
## SC13 — Composed-mechanic work and locality evidence

This is a focused EWF08/INV-3 integration child. The shared dependency/budget contract remains in the world-module runtime; [mechanic growth](../scaling/mechanic-growth.md) supplies the audit-derived cases.

- [ ] Carry read/write/query-membership scope, spatial/graph reach, due-work policy, dependencies, per-invocation state and transitive descendant work through the existing family/construct compilation and admission path.
- [ ] Account for aggregate active work and burst/churn cost, not just individual schema size or nesting depth. Detect or contain zero-time feedback loops; preserve mandatory physical effects/evidence before optional reasoning and presentation.
- [ ] Tie new body sizes, mutable geometry, spawning and cross-region effects to their actual index/invalidation/ownership capabilities. A port substitution or parameter change can widen the workload even without a new type.
- [ ] Qualify many benign definitions, many simultaneous invocations, a high-fanout selector, cyclic triggers, giant contact extents and topology churn. Use per-operation/host scheduling limits and explicit technical outcomes, not arbitrary lifetime recipe/entity caps.

**Exit:** every admitted supported composition has attributable finite work and safe lifecycle behavior, or remains explicitly unsupported/deferred. No operator permission, private knowledge or spending authority comes from a generated field. Existing ordinary inventions remain playable without an unnecessary approval ceremony; new shared-law semantics still use their existing policy.

<a id="sc14"></a>
## SC14 — Indexed dependencies for coherent definition changes

- [ ] Track live state, resource sources, actions/plans, pending jobs, installed constructs and retained-save/content references through the existing definition owner. Build reverse lookup and a bounded validation plan rather than repeatedly scanning the whole world on every edit.
- [ ] Stage immutable candidate validation outside the authoritative commit where safe, then recheck exact dependencies/revisions at activation. Maintain one active meaning per scope; physical law must not vary accidentally by rollout cohort.
- [ ] Define dirty-region/query-membership invalidation for geometry/sense/rule changes, including old and new extents and stationary observers. Retained read results alone do not capture newly matching members.

**Exit:** removal with any live/retained dependency is rejected or explicitly migrated; unrelated definitions/regions do not require complete rescans on normal compatible edits. A concurrent plan/geometry change cannot slip through a stale validation result. Save/load preserves pinned versions and partial process/resource state.

<a id="sc15"></a>
## SC15 — Active-rule, resource and holdings query indexes

- [ ] Add or reuse owner-maintained indexes for applicable automatic status rules, active effects, compatible resource sources, item ownership/pile contents and aggregate holdings. Do not create another writable inventory or status store.
- [ ] Feed changes from all semantic writers: pickup/drop/consume/craft/spawn/death, god edits, module install/remove, capability transformation and restore. Automatic status applicability must be indexed before an effect activates, with correct threshold/deadline triggers.
- [ ] Replace unnecessary global rebuilds in native survival, observation and per-recipient projection; preserve independent return values, exact geometry, recognition and resource ownership.
- [ ] Bound and invalidate derived per-observer caches by actual use; leaving view can permit eviction but cannot erase remembered knowledge. Reuse stable source descriptors, not another actor's private projection.

**Exit:** fixed local activity with growing distant items/scenery/actors does not add whole-collection work in the replaced path. Differential fixtures cover automatic effect onset on an initially unaffected entity, a moved resource, changed inventory quantities, new query members and restoration. Real dense interactions remain measured work, never silently pruned.

<a id="sc16"></a>
## SC16 — Coherent streamed saves and a portable catalogue

- [ ] Introduce bounded capture/encoding/validation for large world/history snapshots under SL/D1/D2, including peak-memory and transaction-duration limits. Hash once over the supported canonical representation where feasible; a late size check is not an allocation budget.
- [ ] Page/index save metadata independently of payload storage; preserve the removal of arbitrary named-slot limits. Hosted placement needs an explicit storage location/reference and backup policy, not an assumption that local folders move with a PostgreSQL world.
- [ ] Stage large restore candidates and verify their manifest, content/source pins and complete history boundary before activation. Keep recovery-slot publication, source overlays, current permissions and non-rewindable external accounting coherent.

**Exit:** interrupted capture/restore exposes neither a partial save nor a partially activated world. Increasing history/save count does not force every catalogue request to load all metadata or every capture to hold multiple full encodings. Measure recovery and first useful gameplay at the supported dataset size; a larger MAX_BYTES is not completion.

## Evidence and closure discipline

Each implementation handoff names its SC child and existing parent, changed source paths, preserved invariants, actual checks, new resource/latency measurements and remaining gaps. The common experiments are in PF00/PF11 and the [research benchmark plan](../../archive/02-research/massive-scale/benchmark-plan.md); use them rather than constructing a new benchmark platform for this tracker.

No task above is complete from this audit. No production limit, model expenditure, retry policy, retention deletion, physics approximation or deployment topology is authorized by the existence of a checkbox. Preserve the accepted shared-world priority and request implementation separately from this documentation work.
