# Documentation changelog

## 2026-09-25 — Data foundation recovery and recall review

Moved complete forgetting-ledger enforcement into the shared restore commit so operational backup restoration cannot revive forgotten transcript access. Legacy PostgreSQL import now verifies the columns actually present in the source while retaining additive destination defaults. Grouped recall validates every contributing source after attention instead of only its representative ID. These correct existing privacy, migration and source-freshness contracts; they introduce no new retention or semantic policy. [Native reproductions and reruns](verification.md#data-foundation-review), [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence) and [CR](maintainers/cognition-redesign.md#cognition-persistence-and-consolidation-follow-up) distinguish fixes from deferred automated coverage and unchanged capacity limits.

## 2026-09-25 — Task-based development and approval workflow

Updated [agent routing](../AGENTS.md) and its existing skills instead of adding parallel instruction bodies. Development now refreshes main/rebases off-main before edits and stops all work for any uncertain conflict resolution. Code reviews include in-scope fixes unless explicitly read-only, consider product intent, UX, scale and future capabilities, and reconcile delivered/deferred work. Every task handoff states major decisions/assumptions and ends with open decisions/questions and suggested next steps, including “None” when appropriate.

[Design](../.agents/skills/openlegend-design/SKILL.md) now creates paired project feature specs/technical designs and turns approval into linked maintainer work, current-doc integration and implementation. The owner's 45-minute batch estimate and one-hour continuation window are separate constraints; explicit scope, completion, blockers and safety/platform limits still govern. [Documentation](../.agents/rules/documentation.md) separates project context/history, accepted targets and current runtime truth. Existing no-test-authoring, ad-hoc runtime verification, CI and spending policies remain intact. [CG08](maintainers/agent-guidance.md) records instruction delivery; native dispatch and full-checkout integration evidence remain separate CG05/CG07 gates. No gameplay code changed.

## 2026-09-25 — Supported-gameplay data foundation implementation

Replaced operational world JSON/journal authority with independently addressable SQL records through the existing world transaction and native owners. Added database-selected memory recall/editor pages, source-version and annotation backing, durable indexing claims, exact eligible vector search, actor-private inspection guards and creator/host save capability checks. Existing importance, consolidation and forgetting rules remain unchanged; no punch/walk classifier or new dropping policy was added.

Legacy worlds extract atomically in place; portable backup/import/restore preserve source fidelity, current privacy, accounting and reusable vector versions. PostgreSQL separates consistent reads from writes. Review fixes covered outer rollback notifications, stale selected-source publication, source-version vector reuse, duplicate observation work and indexed required evidence. [Architecture](architecture.md), [memory](memory-architecture.md#implemented-retrieval-and-storage), [save/load](save-and-load.md), [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence), CR/PF/SL and [runtime evidence](verification.md#data-foundation-runtime) distinguish delivery from remaining qualification. Native stress found dense simulation/history costs still above the release target; no capacity claim or automated-test waiver follows.

## 2026-09-25 — Foundation scope, capacity and delegated engineering decisions

The owner selected the data foundation for supported gameplay; broader D3–D6 features remain tracked. [Capacity workloads](../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) now specify first release at 100 players, 100 agents, 100 animals and 1,000 other objects, with half of each in one scene; growth targets 10,000 players and 200 players/agents combined in a scene. These are qualification targets, not measured results. The arbitrary 20 ms retrieval target below is superseded: architecture and performance choices are delegated to engineering using complete interaction, relevance and resource evidence.

The [retention ledger](../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger) requires a rationale for future lossy policies. The owner clarified that this foundation supplies backing data only: no new semantic importance, classification, grouping or content-dropping rules, including walk-versus-punch examples. The [source/grouping contract](../archive/07-technical-architecture/production-data-model.md#semantic-history-and-grouping-support) preserves evidence and optional metadata for later memory/consolidation/dream systems while migrating existing behavior unchanged. Privacy is enforced through the game; direct database administrators are outside that guarantee. The world creator and authorized OpenLegend staff may save/load, without gaining private-content inspection. Reasonable recovery defaults are delegated; deployment-specific disaster objectives remain later qualification. Updated [D0–D6](maintainers/production-data.md), CR/PF/SL, related specifications and [D48/D58–D62](../archive/05-project/open-decisions.md); this records decisions only, with no runtime migration, data deletion or benchmark.

## 2026-09-25 — Production data model review

Reviewed the [production records](../archive/07-technical-architecture/production-data-model.md) against gameplay, current storage and accepted engine boundaries. Clarified one canonical owner per record, shared actor capabilities, operational goals/plans/due work, identity-preserving migration, timeline/source fencing and revision-aware recall indexes. [Queries](../archive/07-technical-architecture/data-queries-and-mcp.md) now specify database selection before bounded context preparation, with index gaps and the unmeasured 20 ms local-retrieval target explicit.

The owner selected shared-world regional priority with independent worlds supported, retention of important events/summaries with routine detail allowed to expire, and no creator access to human-private messages/notes. Updated [scale/retention](../archive/07-technical-architecture/data-delivery-and-scale.md), related product/save/knowledge/cognition documents and [D1–D6 delivery slices](maintainers/production-data.md#delivery-slices-and-exit-evidence). [Open decisions](../archive/05-project/open-decisions.md) retain exact crowd/load policy, retention windows, privacy operations, recovery/rewind terms and retrieval deadline/quality choices; no arbitrary numeric capacity was accepted. This is a design/documentation change only, with no storage migration, provider calls, runtime qualification or new test execution.

## 2026-09-24 — Database and simulation responsibility clarification

Clarified the existing [production data model](../archive/07-technical-architecture/production-data-model.md#database-simulation-and-background-responsibilities): independent operational records and database-side queries, in-memory active simulation, atomic record commits and bounded asynchronous AI/embedding work. Whole-world JSON remains a checkpoint/export format in the target; current snapshot/journal storage is still transitional. [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence) now explicitly track missing record/query implementation separately from deferred verification. The [scale design](../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) distinguishes a million-player ambition from measured concurrency and concentrated interaction workloads. No runtime migration, latency guarantee or capacity qualification is delivered by this documentation update.

## In-place development updates

Corrected the policy: small migrations are allowed and preferred; maintaining legacy game versions is not required. Removed automatic fresh-world recovery and its per-feature save-format gate. The preceding startup recovery did reset the development gameplay world while retaining accounting; that behavior is superseded, not an acceptance requirement. Current behavior is owned by Save/load and Architecture.

## Spatial scaling continuation and reconciliation

Preserved the concurrent third-pass lazy graph, closed-region proofs, native roster and observation sanitation. Added movement-only support equivalence, weak exact-stance memoization and independent JSON-copy allocation reduction to implemented owners. Allocated SW04.1c/SW05.1d and SR13–SR15 without replacing existing task IDs or evidence. Current limits and matched continuation observations remain distinct from earlier timings; no automated tests were added or run.

## Third spatial scaling pass

Replaced eager exact graph baking/weak-component labels with lazy checked edges, connector-aware A\* and bounded exhausted-search proofs; documented finite native participant reuse and isolated observation copying. Updated implemented SW/PF entries and remaining latency gates. Removed the obsolete PF task to implement experience-ID indexing (already delivered); its regression requirements remain SR08. Added SR11/SR12 and extended SR05 instead of duplicating privacy checks. Prior automated evidence remains historical; this round records builds/manual runtime only.

## Second spatial scaling pass

Recorded lazy support-group navigation, sparse exact seams, direct validated overlap paths, search scratch reuse, boolean query changes and mutation-owner experience/audience reuse. Updated implemented SW subsets without closing the remaining preparation, private-acquisition or population gates. Added SR08–SR10 automated coverage to maintainer TODO; old checks remain historical and this pass supplies production build and ad-hoc runtime observations only.

## Spatial scaling review and completion reconciliation

Added the SW delivery ledger separating implemented native subsets from broader unchecked targets. Recorded bounded static indexing, visibility/landing/cache dependencies and renderer dirty work in current implementation owners; retained measured cold-preparation and first-exposure gaps under SW/PF/EPR. Consolidated new regression work in maintainer TODO at the owner's instruction and replaced obsolete schema-8 fixture targets with the current spatial format. Prior automated evidence remains historical; this review adds build/manual-runtime observations only.

## Spatial-world integration and first native provider

Added spatial behavior/runtime/tracker/research owners and retained the original pinned source review as historical research. Reconciled sensory, agency, art, camera, save, storage and engine/world ownership without resetting existing task IDs. Replaced the flat-world target with XYZ/support-aware simulation and mixed representation. The initial implementation chooses bounded native surface A\*/convex queries over unqualified multi-library WASM integration; researched alternatives and broader target gates remain explicit. Current behavior and actual validation are recorded in Architecture/Verification, not inferred from documentation integration.

## 2026-09-22 — Shared invention and plan-output slice

- Recorded the bounded supported-family world-agent operation and shared durable pipeline, preserving broader INV requirements and their unchecked state. Ordinary inference is the explicit execution choice for this bounded operation; full discussion/cognition remains separate.
- Recorded single-output native plan references and schema-8 development save cutover. No legacy migration was introduced. Manual, live-generation and saved-response replay evidence remain distinct; automated coverage was deferred at the owner's instruction.

## 2026-09-22 — Ownership clarification

- Accepted the owner's NPC/world-creator and player/world-creator joint ownership rule, plus explicit NPC-created filtering. Removed the corresponding D43 uncertainty; remaining account/library and transfer questions stay open.
- Kept detailed invention mechanics extensible and finite. Local attribution is an implementation foundation, not a marketplace, legal licensing contract or autonomous invention release.

## 2026-09-22 — Invention policy defaults

- Selected player invention open for the local prototype, preserving existing behavior under the owner's delegated implementation discretion. NPC invention remains locked with its existing enablement gate. D42 retains delegated creator rights and the proposed owner exception; no exception was adopted.
- Recorded current policy boundaries in Architecture and partial completion under INV-1.3; broad workflow and live autonomous-authoring acceptance remain open.

## Actor agency implementation boundary

Architecture and implementation status now distinguish the delivered schema-5 agency slice from remaining AG/INV work. The former one-of-each response and writable goal mirrors are superseded. Goal seeds remain descriptive identity; current intentions have one domain owner. The implementation section anchor moved from `agency-implementation-boundary` to `actor-agency-foundation`, with inbound references updated. Manual evidence and explicitly deferred automated/live qualification remain separate.

This file records material changes to OpenLegend's documentation structure and historically important decisions that replaced earlier documented directions.

It is historical context only. Current requirements, design, architecture, tasks, status and open decisions live in their canonical owner documents.

## 2026-09-22 — Extensible-world foundation integration

Added engine/world principles, shared reusable-construct/effect contracts, world-agent authoring guidance, staged roadmap/examples and EWF ownership. AG/EPR/INV retain subsystem ownership. Corrected obsolete full-scan/history descriptions and old-save extension guidance while preserving current permissions, native phase order and acceptance states. Documentation integration itself changed no runtime behavior; subsequent implementation and evidence are recorded in Architecture and Verification.

## 2026-09-22 — Level-1 action selection

- Made Jev-only selection of a supplied native action explicit, alongside zero-call native continuation and generative immediate responses. Replaced mandatory routing-before-candidate ordering with the shared selection contract in the agency runtime; kept relevance filtering distinct from execution choice.
- Added pending CR02 implementation and CR12 fixture acceptance, linked AG01/AG07 integration, and documented the no-goal eating example. Runtime, implementation status and verification claims are unchanged.

## 2026-09-22 — Agency policy decisions and interruption

- Accepted general-knowledge speculation with profile, traits and backstory as initial behavioral guidance; retained acquisition provenance and native validation boundaries. D12 now retains only learning/sharing details.
- Resolved D54’s compulsory-thought question in favor of reconsideration opportunities and accepted D42’s NPC-disabled default with independent controls and qualified explicit enablement; numeric reminder tuning and remaining governance choices stay open.
- Clarified interruption of long-running work for changed needs, preservation of longer-term goals and native pause/cancel accounting; extended pending AG verification without claiming implementation or enabling runtime settings.

## 2026-09-22 — Agent agency documentation integration

- Integrated `docs/agent-agency.md`, `archive/07-technical-architecture/agent-agency-runtime.md`, `docs/maintainers/agent-agency.md` and `archive/02-research/agency-cognition-and-planning.md` from the review pinned to `c35f5fbb87ca10fcd941cfc3bb80d0011d0ef032`.
- Moved universal response and operational-goal semantics out of broader memory/conversation ownership, retaining response forwarding anchors and valid admission/experience requirements. Reconciled the newer EPR scope/intake contract instead of adding a second opportunity pipeline.
- Linked existing INV/CH work, narrowed NC13 to tested effect/privacy dependencies and INV-7’s existing-family loop to shared-service prerequisites, and removed obsolete development-save compatibility obligations while retaining same-version recovery and real accounting. Moved prior personal-perspective evidence to Verification and implementation facts to Architecture; D57 no longer treats response cardinality as unresolved. D12 retains conceptual-knowledge policy; D54 retains need/reminder tuning; R24 records agency experiments.
- Runtime behavior, deployment locks, spending policy and runtime verification status were unchanged. No implementation or acceptance checkbox was completed.

## 2026-09-21 — Proposed event framework integration

- Installed `archive/02-research/engine-perception-and-event-architectures.md`, `docs/events-perception-and-reactions.md` and `docs/maintainers/events-perception-and-reactions.md`, preserving the source audit at `03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd`.
- Linked existing owners and trackers without completing implementation tasks; retained performance, cognition, sensory, narration, storage and save/load boundaries. Unresolved product policies remain in D53, D54 and D57.

## 2026-09-21 — Game menu and local save files

- Moved manual save/load controls from Settings & help to Game below World agent and moved manual slots to the gitignored local save folder. The pre-load recovery slot remains transactional in the authority database.
- Updated storage/backup guidance, runtime evidence and deferred validation; earlier database-only manual development slots are not migrated under the active no-legacy policy.

## 2026-09-21 — Development save/load implementation policy

- Recorded the owner's no-real-players block: no legacy readers, migrations or compatibility maintenance until explicitly lifted. Suspended SL06 and reconciled extension guidance.
- Recorded the initial manual-slot implementation, scoped native runtime evidence and deferred automated/adapter/provider qualification, without closing broader phase gates.

## 2026-09-21 — Save/load delivery tracker

- Added the focused SL00–SL10 tracker under `docs/maintainers`, separating reusable gameplay capabilities from evolving object schemas and production-data rollout.
- Linked the tracker from the maintainer index, design and production-data tracker; defined the initial manual-save slice and later autosave/conditional extensions without marking implementation complete.

## 2026-09-21 — Save/load design guidance

- Added `docs/save-and-load.md` as the canonical high-level gameplay restoration contract, with primary-source research and storage-independent state-design constraints.
- Linked relevant state, simulation, memory, identity, persistence and extension designs, and added an AGENTS.md requirement to consider save/load during substantial state/storage changes.
- Kept operational recovery and physical records with their existing owners; placed unresolved gameplay save policies in D60. No save/load implementation or acceptance task was completed by this documentation change.

## 2026-09-20 — Documentation consolidation

- Adopted one-canonical-owner documentation policy.
- Separated design specifications from implementation trackers.
- Moved NC00–NC13, ACT01–ACT06, INV-1–INV-8 and D0–D6 into focused maintainer trackers.
- Rebuilt the maintainer index as navigation and narrowed the general TODO to cross-cutting work.
- Recast implementation status and verification as current snapshots instead of completion diaries.
- Consolidated current runtime architecture in `docs/architecture.md` and removed the parallel technical system architecture and review/delivery plan.
- Removed the actor-model and narration source follow-ups after their current requirements were absorbed into the product baseline, canonical designs and trackers.
- Recorded the living-actor direction as accepted; only residual lifecycle/body semantics remain open.
- Retained Jev material only as provider research needed by current evaluation work; OpenLegend routing behavior belongs to the architecture and memory design.

## Living actor and history migration

Replaced current-state descriptions of split animal lifecycle and temporary pair-exchange context with schema 3 and durable conversation/history facts. Kept D56 unresolved, retained all ACT/D/NC task identities and open acceptance gates, and recorded deferred automated coverage in the maintainer TODO. Architecture remains the current-contract owner; specifications retain target behavior and focused trackers retain unfinished work.

## God revival and remaining program delivery

Resolved D56 in the canonical actor contract: full god revival reconstructs harvested bodies without removing collected inventory. Moved the accepted agent spending ceiling from D04 to the architecture; hosting costs remain unresolved. Updated current subsystem facts and preserved focused task IDs and open acceptance gates.

- Added the canonical identity/reference contract and linked the response specification to it. Updated architecture, implementation status and verification for saved control bindings and bound response IDs; deferred automated coverage is recorded in maintainer TODO.

## Runtime performance design

- 2026-09-21: Marked delivered performance implementation separately from open qualification. Added current cold-event, command-epoch, actor scheduling and index behavior to Architecture, recorded native runtime/restore/cadence observations and retained deferred coverage in TODO. Moved the accepted gameplay retry policy out of the open-decisions body to its real-time owner reference, and removed the stale seven-day command-horizon sentence. Multiplayer admission/replication, the unattended-world toggle and target-population verification remain excluded.

Added `docs/performance.md` for runtime scheduling and optimization, with ordered PF00–PF11 work and acceptance budgets in `docs/maintainers/performance.md`. The real-time specification retains protocol/prediction ownership, and production-data phases retain migration and scale rollout ownership. No runtime task was completed by this documentation change.

Moved five unchecked TODO items into the focused tracker: PostgreSQL measurement (PF00), diagnostics connection isolation (PF04), diagnostic batching/backpressure (PF06), and long-history/backlog work (PF08). Their open state and relevant conditions are preserved. The obsolete synchronous PostgreSQL worker and 16 MiB bridge-limit description was replaced with the current asynchronous single-connection architecture; this corrects implementation facts rather than declaring the measurement task complete.

Recorded the statement-count fixture and investigation limits in Verification, including the correction of an unverified remote-database explanation. Added D58/D59 for durability/storage-placement and retention/retry-policy choices. Reviewed the design for missed wakeups, privacy/recovery boundaries, unsafe multi-step batching, hidden database contention and unsupported speedup claims; the selected design preserves those boundaries and gates more complex mechanisms on measurements.

- 2026-09-20: Reconciled architecture, extension guidance, domain notes, performance guidance and implementation status for draft-proven event appends, routine milestone acceptance, actor-local Person pagination and importance-only retrieval invalidation. Recorded isolated runtime evidence and deferred regression/async-fixture work separately.
- 2026-09-21: Separated Person creation provenance from live Person editing. Documented description/personality/backstory/trait/goal ownership, how the first goal drives native planning, and which authored identity fields enter actor-private decision context.
- 2026-09-21: Added Person-editor survival-stat snapshots, explicit refresh and fill-to-100 behavior. Documented field-level save merging so untouched simulation drift is preserved and deliberate god-stat edits override the opened snapshot.
- 2026-09-21: Reconciled the cognition debugger contract around stable references, typed concise triggers, semantic stage names and root-only world-agent failure detail. Full sanitized stimuli remain restricted to owner raw inspection; automated coverage is explicitly deferred.
- 2026-09-21: Clarified trace versus stage identity, separated query-embedding diagnostics from ranked memory-context results, and restored response-linked accepted actions to durable person-scoped Talk history. Recorded the live retained-trace and owner-history observations without treating them as automated acceptance.

- 2026-09-21: Updated architecture, extension guidance and implementation status for the initial performance foundations. Preserved incomplete PF task exits, recorded native SQLite runtime observations separately from scale acceptance, and added deferred coverage to the maintainer TODO. No retention policy or multiplayer deployment claim was introduced.
- 2026-09-21: Accepted shared-world absence behavior: a world-level Continue while unattended setting permits progression with no present players; otherwise all admitted players must be disconnected or unfocused before the world pauses. Set ordinary gameplay commands to a 24-hour outcome-replay window followed by rejection through a server-issued command epoch/controller-generation watermark. Current receipts remain intact until that expiry boundary is implemented; provider, billing and administrative identities retain their separate policies.

## Spatial world browser verification

Recorded the passing branch-only GitHub Actions production build, 24 focused tests and real PlayCanvas browser scenario in Verification. Updated the narrowly evidenced camera, surface-picking and executed-check task states while retaining broader acceptance gates. Removed temporary source/publication transport files; a read-only spatial workflow now supplements the unchanged full repository check. No live provider calls or legacy save conversion were introduced.

## Cognition context and opportunity correction

The September 23 review replaces the conflicting deferred-evidence cursor requirements with fresh opportunity snapshots and retained, independently queryable history. Commit `2fce978` (September 20) introduced oldest-eight backlog selection; `4040ccb` added the 100-finalist context policy while generic validation still allowed only 32 questions. Commit `ab13896` (September 22) changed actor responses to `operations[]` without updating the diagnostics renderer. These were implementation/contract synchronization gaps, not evidence that empty thought/speech was generated. Current contracts and coverage tasks now describe the corrected behavior.

## Actor sleep policy

The owner replaced the eight-hour daily rest quota, split-rest credit, sleep debt and fifteen-minute onset with scheduled energy thresholds, immediate voluntary sleep and full-energy waking. Physical policy now belongs to `docs/worlds/base/sleep.md`; memory architecture retains dream content/admission. Development format 10 rejects old sleep accounting without a migration.

## Conversation snapshot and duplicate speech-trigger correction

The September 23 trace review found an autonomous opportunity presenting an already-answered question as new addressed speech even though its prior answer was present in recent memory. The accepted correction reuses durable completed direct-response jobs for exact-event suppression and replaces trigger-sequence/newest-32 conversation cutoffs with the complete available conversation snapshot. No response-behavior enforcement or additional prompt labels were introduced.

## Generic status-effect ownership

The sleep-specific numeric policy, actor rest flag and named renderer checks were superseded by an entity-scoped status-effect registry. `docs/status-effects.md` owns generic schema, targets, operations, transitions and capability consumers; `docs/worlds/base/sleep.md` retains only the authored default mechanic. Anytime automatic activation changed from energy below 20 to energy at or below zero; player automatic activation remains excluded. Dream eligibility moved to cognition policy. Narration uses “fell asleep” and “woke up.” Deferred validation replaced obsolete policy/command cases without claiming automated acceptance.

- Replaced the global autonomous-thought interval with per-actor cognition-policy pacing; removed the `NPC_THOUGHT_INTERVAL_SECONDS` example setting. Defined named/generic recall and speech intent versus delivery in their canonical owners. Personal aliases remain unimplemented.

## Base-world ownership

Moved the sleep specification to `docs/worlds/base/sleep.md` and repaired inbound references. Added the base-world mechanics index, item/ground-pile specification, survival/combat ownership and BW delivery tracker. Moved authored defaults/configuration under `packages/domain/src/worlds/base/`; generic runtime contracts remain with their existing owners. AGENTS.md requires this separation for subsequent work.

- Removed the implementation-chosen 256-summary quota from the consolidation contract and snapshot. Memory retention no longer constrains semantic grouping by remaining slots; request-size limits and atomic multi-request publication have separate ownership in the memory design and runtime snapshot.

Knowledge canvas mechanics now have one engine owner in `docs/knowledge.md`; bundled limits/naming/recognition live in `docs/worlds/base/knowledge.md`. This replaces the proposed naming-heavy YAML state example and the external-beliefs-in-one-inner-world-text direction. The observer-known-name decision is resolved; aggregate storage remains open.

## Limits audit implementation

Updated current implementation descriptions after removing undocumented small content-count ceilings, the named-save count and the hidden spending clamp. The architecture owns current behavior; cross-cutting deferred verification is in TODO. Original audit entry numbers remain in the external limits reports with completed removals labeled explicitly.

## Physical contact semantics

Replaced the proximity-based touch approximation with body-surface contact. The spatial-world specification owns the physical rule and migration semantics; architecture reflects the optional detector's current behavior. Earlier dense-contact measurements describe the superseded proximity implementation.

## Repository limits audit and dependency gate

Imported the full 238-entry limits decision report from its temporary working artifact into `docs/maintainers/limits-audit.md`, preserving stable entry numbers, prior removal completion notes, classifications, recommendations and source references. The maintainer index and TODO link to this single follow-up owner. All remaining audit work is explicitly blocked on completion of the current data foundation, followed by a fresh review of every finding against the resulting implementation.
