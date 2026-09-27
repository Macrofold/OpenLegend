# Documentation changelog

## 2026-09-27 — Hearing review and routine-work decisions

The owner authorized revisiting semantics to improve the crowded 3× scene. [Memory architecture](memory-architecture.md#encounters-sensory-detail-and-reminder-continuity) now distinguishes current visibility from stored sightings: routine animal/scenery appearances are no longer individual memories, and person onset is retained without automatically triggering reasoning. Existing evidence is not deleted; richer significance remains EPR06. [Performance](performance.md#hearing-review-and-lower-routine-history-cost) records computed-route buffering, optional diagnostic batching and publication timing, including crash/delay tradeoffs. [Evidence](verification/three-times-scene-performance.md#hearing-review-continuation-september-27) leaves stall-free acceptance open under measured host/database delays. HE04's client history reader now uses the shared authority-scoped helper. Caption placement now avoids measured fixed controls and open panels, preserving hidden reading time without measuring DOM layout every frame.

The requested follow-up review keeps these choices but separates importance, urgency and reasoning eligibility at the base-world owner; fixes unrelated diagnostic loss after a single write failure; and removes redundant caption measurements/scene updates. [Review evidence](verification/three-times-scene-performance.md#requested-implementation-review-september-27) records native equivalence, browser lifecycle checks and the lack of a demonstrated whole-server speedup.

Added the requested concrete-language, useful-documentation-preservation and behavior-decision reporting instructions. Internal agent plans/summaries do not authorize removing useful documentation. Existing development-save policy and broader acceptance gates remain intact.

## 2026-09-27 — Development save policy restored

At Mike's explicit request, restored the protected development-save instruction in [AGENTS.md](../AGENTS.md#development-save-policy) as its sole owner. The change in `79e65130d` and the [in-place development updates](#in-place-development-updates) entry are superseded as policy. [RP02](maintainers/revisitable-policies.md#rp02--development-state-compatibility) now points to the protected rule and retains only review context and decision authority. Reconciled save/load, architecture, feature/project docs and trackers; retired the D1/D2 older-canonical-table migration task and replaced old-save acceptance work with current-format integrity/rejection work. Historical conversion implementation and measured evidence remain labeled historical; runtime behavior was not changed by this documentation update.

## 2026-09-27 — Reconcile hearing with current main

The [integration plan](projects/hearing-main-integration.md) consolidates hearing source `c4379246` onto main `f551e3d8` while preserving current elapsed-time simulation, authority, relational memory/history, contribution state, placement and rendering. Listener-specific speech, volume, captions, bounded caches and append ownership remain; the older fixed-step/discovery assumptions and speech-only indexer are superseded. Review repaired volume admission/utterance identity, request-scope history fencing, local-session recovery, sweep skin, linguistic SQL selection and asynchronous derived publication.

Development-save handling follows the [root policy](../AGENTS.md#development-save-policy). D66 owns speech re-authoring without colliding with main's social decisions. [HE01–HE05](maintainers/hearing-and-speech.md), the [HR limits inventory](limits/hearing-and-speech.md) and [combined evidence](verification/hearing-main-integration.md) separate delivered behavior from remaining CI, PostgreSQL, provider, broad graphical and dense/cold performance qualification. Historical branch measurements remain labeled historical. The follow-up rebase in `codex/hearing-ready-for-main` includes main `45210d41`: native action invocation/follow, private acquisition batching, bounded history writes and scene/cognition/persistence improvements. Response instructions use `cognition-v17-grounded-actions-hearing` to identify the combined prompt/schema. The protected development-save policy remains in its root owner.

## 2026-09-27 — Explicit narration failure

The player UI no longer offers Regenerate narration. Failed or interrupted generation now
displays “Narration failed.” without substituted prose or automatic retry; saved source
evidence, actual impacts, receipts and native conversation notices retain their existing
owners. Older generated fallback entries receive the same public presentation. This makes
failure explicit while removing an in-game regeneration shortcut; the explicit API remains.
[Contract](narration-and-conversations.md), [NR01](limits/narration.md#nr01--narration-failure-and-regeneration)
and [NC08–NC12](maintainers/narration-and-conversations.md) own behavior and outstanding
qualification. Conversation compaction is excluded from this change.

Corrected the remaining action-integration merge wording: `75ee15f7` merged the work into
main, while the [integration evidence](verification/native-action-integration.md) still records
incomplete qualification. AC01.2 and CR12/NC12 already cover detailed action parameters and
broad cognition/narration qualification; no duplicate missing-work requirements were added.

## 2026-09-26 — Integrate native action grounding and follow

Rebased the preserved action branch onto main's records/checkpoints, account/control authority, placement, resource claims, dependency invalidation and elapsed cadence. Finite parameterized move/follow, reviewed private revisions and acquisition/history batching retain those owners. Reconciliation fixes include scoped action job/UI identities, live-draft contact mutation, follow navigation cancellation and server/checkpoint startup cleanup. Superseded fixed-step and raw-array cursor implementations are removed. Main's complete byte-bounded action choice set and free exact authored descriptions are preserved, and incomplete spatial queries are filtered before schedule batching. Updated [limit inventories](limits/cognition.md#cg02) record implemented boundaries without declaring uncalibrated thresholds or throughput qualified.

[Architecture](architecture.md#jev-first-action-grounding) describes delivered behavior; [AR](maintainers/action-reconciliation.md), [AC](maintainers/action-capabilities.md), [EPR](maintainers/events-perception-and-reactions.md) and [PF](maintainers/performance.md) retain unmet acceptance. [Integration evidence](verification/native-action-integration.md) distinguishes actual no-cost runtime/static observations from historical reports and the disk-blocked PostgreSQL measurement. Recovered regression IDs remain linked from TODO; no broad acceptance gate is closed by this documentation update.

## 2026-09-26 — Reduce redundant scene, cognition and storage work

[Performance ownership](architecture.md#performance-critical-path) now distinguishes actor-source flushes from unrelated routine motion, routes ordinary PostgreSQL reads independently of writes, and coalesces bounded inspector snapshots. [Routine animal acquisition](memory-architecture.md#encounters-sensory-detail-and-reminder-continuity) remains private evidence without automatically requesting semantic reasoning; interest subscriptions and meaningful separate events still apply. Visibility and identity episodes are preserved. Continued merged-build work shares batch sight setup, computes small-batch PostgreSQL memory eligibility once, and isolates advisory maintenance-read failures with a 60-second backoff; failed authoritative writes still fail closed. [PF follow-through](maintainers/performance.md#current-3-local-scene-follow-through) and [evidence](verification/three-times-scene-performance.md) retain unresolved tail latency, shared visibility work and host-limited acceptance; no full-release capacity is claimed.

## 2026-09-26 — Import standalone worldbuilding research

Squashed the 42 commits from `docs/worldbuilding-research-library` into `main`: [28 world dossiers, six comparative essays and supporting navigation/evidence records](../archive/02-research/worldbuilding/README.md). The library remains independent research, not accepted game mechanics or an implementation plan. [Integration verification](../archive/02-research/worldbuilding/research-progress.md#main-branch-integration) records the refreshed source/base, conflict-free integration and local documentation checks; original source-access limitations remain explicit.

## 2026-09-26 — Gameplay availability and social follow-through

Added a [current exposure summary](../archive/05-project/implementation-status.md#gameplay-availability) separating native support, automatic use, player/creator controls and evidence. Reconciled stale actor migration, single-player narration and future relationship-editing wording without closing unsatisfied acceptance. The new [mechanics repertoire](repertoires/mechanics.md) extends selected action concept keys as ideas, not a competing backlog or installed-feature list.

[Bundled social rules](worlds/base/social.md) now own the current feeling, family and promise specializations, with explicit limits and engine/world seams. [BW16/BW17](maintainers/base-world.md#social-playable-slices) and [ACT09](maintainers/actor-model.md#act09--internal-feeling-process-authoring) record proposed playable journeys, dependencies, exits and [deferred coverage](maintainers/TODO.md#social-playable-slices--future-validation). [D63–D65](../archive/05-project/open-decisions.md#social-exposure-decisions) retain unresolved correction/disclosure, amendment and process-retirement choices. This is documentation-only work: no runtime implementation approval, new mechanics or fresh gameplay qualification.

## 2026-09-26 — Reduce native perception and motion overhead

Implemented the owner-approved [performance follow-through](projects/spatial-cadence-main-integration.md#authorized-performance-follow-through): scalar/region-valid perception reuse, receiver candidates, history sealing and private motion deadlines within the existing transition owner. Small senses constrain potentially interacting movers; all participants remain synchronized at occurrences and publication. Flight evidence now reads synchronized receivers, and a landing cannot grant retroactive animal movement. Silent state changes invalidate through semantic owners. The host can request a coherent stop without putting a wall clock or second scheduler in the domain.

[NW12](limits/native-work.md#nw12) records the private slice ceiling, [simulation time](simulation-time.md) owns the changed phase contract, and [PF12/PF13 evidence](verification/spatial-cadence-main-integration.md#performance-follow-through) separates delivered reductions from remaining regional, coupled-rate and sustained 8× qualification. No save-format, authority, spending or sensory-fidelity limit was relaxed.

## 2026-09-26 — Reconcile spatial cadence with current main

Rebased the spatial/cadence branch onto refreshed main `56b8c383`, preserving current record persistence/recovery, authority, tagged placement, contributions, appraisals, dependency budgets and cooperative scheduling. Existing semantic owners now supply expiry boundaries; movement captures interval-start restrictions, and sensory loss retires visual episodes. Navigation retains computed replies across mutation-lane overload and keeps worker retirement bounded. Main’s departure fade and privacy remain alongside the new presentation.

The [integration plan](projects/spatial-cadence-main-integration.md) and [evidence](verification/spatial-cadence-main-integration.md) separate local reconciliation and authorized validation from broader qualification. The owner approved pruning obsolete and overlapping test fixtures while retaining current boundary checks; retained tests also caught takeoff contact, local control-scope, inventory-description and scaled mobile panel-overlap regressions. PF12/PF13, SW, speech coordination and feature limits are reconciled; cadence’s policy identifier is RP06, preserving main’s RP03–RP05. Matched native work improves substantially but still misses sustained 8×; no production capacity or full graphics pass is inferred. Remote history and main remain untouched.

## 2026-09-26 — Save/recovery limits and guarantee corrections

Reconciled the additional save/recovery handoff against source: [pre-load capture dependency, retention order, compatibility, snapshot lifetime and operational file recovery](limits/persistence.md#sb13), plus [benchmark-only bounds](limits/observability.md#sv18). Extended existing entries instead of duplicating catalog-scan, retention and status limits. Corrected worker placement and the distinction between file integrity, actual restoration and filesystem quotas in the save contract and operational runbook. [SL08/SL09 follow-ups](maintainers/save-and-load.md#recovery-qualifications-identified-by-the-save-limit-follow-up), D1/D2 file reconciliation and limits candidates C22–C24 retain unimplemented work. Documentation/source review only; no runtime behavior or acceptance claim changed.

## 2026-09-26 — Immediate gameplay limits implementation

Implemented the approved C18/C17/E01/E04/R03/C19 slice: shared physical containers with explicit durable access, giving and nested item use; dependency-aware inventory moves; coordinated release admission and bounded pending work; fair/coalesced projection; unchanged-exposure reuse and private native checkpoints; SQL-backed awareness residency, preparation admission and indexed optional lexical search. The [plan](projects/immediate-gameplay-limits.md), [behavior](worlds/base/items.md#shared-containers-and-active-work), [performance contract](performance.md#bounded-admission) and [memory contract](memory-architecture.md#retrieval-preparation-admission) own details.

Recorded new row/byte/queue limits and reasons in the feature inventories. Native output admission rises from 16 MB to 64 MB, charged as actual UTF-8, because valid first exposure in the release scene otherwise refused complete witness output. Exact semantic recall remains exact; optional legacy lexical search changes from substring counting to token-prefix indexing. The [verification evidence](verification.md#immediate-gameplay-limits) separates improvements from remaining dense first-exposure, personal-memory growth, cold-query and sustained 100-player costs. Removed completed R03/E04/C19 recommendations; C18/C17/E01 retain concrete residual acceptance.

## 2026-09-26 — Risk-based planning and explicit reconciliation targets

Updated [root planning](../AGENTS.md#plan-before-implementation) to choose durable plans by risk/complexity rather than a mandatory 200-line threshold: straightforward mechanical work may use conversation plans, while even small consequential work can require a project document. The [rebase workflow](../.agents/skills/openlegend-rebase/SKILL.md) now selects an explicit task base, then the current PR target (including stacked parents), then the intended remote's verified default; tracking upstreams are not merge targets. It retains conflict stops and dirty/shared-history protections and makes detached-worktree handling explicit.

Consolidated general authorization/completion in root, reconciliation in Rebase, review behavior in Review and tracker maintenance in Documentation, with references from the system guide, design skill and contributor guide. Required scope, verification/CI, read-only boundaries, spending, privacy and state-preservation safeguards remain. This supersedes the earlier line-count planning rule and unconditional-main startup policy; [CG05/CG08](maintainers/agent-guidance.md) distinguish delivered instructions from pending native-agent compliance evidence.

## 2026-09-26 — Rank limits by reachable gameplay and growth impact

Reordered [Remove / Change / Expand](maintainers/limits-audit.md) using near-term permitted actions, automatic growth, frequency and consequences. Dense native work, growing recall preparation and ordinary shared/inventory workflows precede extreme save catalogs. The 10,000-save cap remains low priority; reservation receipt exhaustion is gated on a future real consumer because no non-test creator caller was found in the inspected baseline. Required-work pause is distinguished from optional refusal. Shared world-container defaults remain a proposed access design, not a runtime permission change.

Added twelve source-inspected [growth-path entries](limits/README.md#growth-path-review-coverage), including exact vector/lexical scans, required conversation hydration, active evidence, retained storage, note/candidate construction, mutation/SQL queues, owner edits and full save-catalog traversal. Record actual upstream controls and absent bounds separately from output/page limits. Updated feature-document requirements and PF/CR/D2 references. Prior measurements remain explicitly prior evidence; this documentation-only inspection adds no runtime qualification or retention policy.

## 2026-09-26 — Feature-owned limits inventory and revisit backlog

Split the existing temporary/repository 238-entry limits audit into [feature inventories](openlegend-limits-decisions.md), preserving stable audit IDs, restrictive classifications, original reasons/recommendations and removal records. Merged the foundation and save/recovery implementation reports with explicit [deduplication and exclusions](limits/import-coverage.md); known superseded values are updated while unverified old findings remain historical. Pure identity/arithmetic and human-private authorization obligations are not presented as tunable capacity constraints.

[Tracking rules](limits/README.md) and [feature-document structure](feature-documentation.md) require same-change inventory updates for numerical, behavioral, removed and explicitly unlimited choices. The design/documentation guidance routes to these owners. The old [limits-audit page](maintainers/limits-audit.md) now owns ranked Remove / Change / Expand candidates and preserves LA01–LA04 gates; focused trackers still own delivery/acceptance. This explicitly authorized documentation migration does not change runtime settings or complete outstanding foundation scale qualification.

## 2026-09-26 — Bounded maintenance, streamed checkpoints and recovery

Implemented indexed chronological maintenance prefixes with revision/generation validation and bounded source publication. Daily progress uses a fixed source revision and durable cursor; all model partitions of each selected batch remain atomic, protected barriers and speech continuity are retained, and failed unchanged work does not automatically retry. No evidence-expiry or semantic grouping policy was added.

Checkpoint capture now pins a database revision and streams canonical records in one bounded worker, with explicit record/package/count/time budgets replacing the single new-save 64 MiB ceiling. Private synchronized publication, five-minute/three-point autosaves and two verified pre-load recovery packages preserve prior checkpoints through interruption. Operational backup/import/restore includes complete external authority and referenced files. Large PostgreSQL qualification exposed statement-sized rebuild/recovery transfers; paging preserves atomicity while bounding individual statements. Follow-up review enforces source byte admission before hydration, restores durability on ambiguous publication retries and shares capture and operational dependency catalogs across their consumers.

Reconciliation with integrated foundations preserves scoped manual save operations and gives the host a separate internal autosave entry point. Ordinary players see no save controls; rolling checkpoints belong to the shared world. Operational recovery includes current account/control records and reapplies human bindings on existing-world restore. The exact preceding checkpoint layout converts through the existing migration without accepting missing current owner tables.

[Plan](projects/history-save-recovery.md), [save contract](save-and-load.md), [memory contract](memory-architecture.md#6-hourly-consolidation-and-six-hour-raw-recall), [retention/runbook](../archive/07-technical-architecture/data-delivery-and-scale.md#local-operational-recovery-procedure) and [evidence](verification.md#bounded-history-checkpoints-and-recovery) reconcile SL/PF/D1–D2 delivery and remaining gates. In-flight spatial, invention, action and speech use cases inform the extension path; priorities 1–5 designs and their authority remain unchanged. No automated suites or paid calls were run.

## 2026-09-26 — Foundation priorities 1–5 approved for implementation

The developer authorized the complete [implementation plan](projects/foundations-1-5.md#approved-implementation-plan)
with performance/stress qualification and migration seams for current spatial, invention,
action and speech work. The foundation designs take precedence over prior branch assumptions.
Accepted targets retain existing semantic owners, in-place identity-preserving conversion,
current privacy/accounting outside rewind and all 46 child acceptance slices. No runtime
delivery or completed qualification is inferred from approval; focused trackers retain
unsatisfied gates.

## 2026-09-26 — Foundation priorities 1–5 implemented

Delivered typed state/resource claims and independent contributions, verified OIDC account/control
scopes and protected absence, entity-backed lots/equipment/nested bags, dependency generations
and aggregate native-work accounting, and persistent cause-linked appraisals with directional
social continuity. Each uses its existing semantic, publication and canonical-record owner.
Supported worlds migrate in place with identity and quantities preserved; cold contribution,
appraisal and object history remains complete for capture and maintenance. Source-bound state
retains exact policy pins. Current human-private ownership, grants and external accounting stay
outside gameplay rewind, including account rebinding and source erasure after older saves.

The finite native families provide concrete extension seams without adding another inventory,
scheduler, emotion store or invention runtime. Reflection remains a coupled publication;
reframing cannot restart an original decay curve. Unknown dependency coverage stays conservative,
and required work refuses before publication rather than silently dropping outcomes. Inspected
spatial/invention/action/speech branches have explicit migration contracts, not assumed integration.

Follow-up source review repaired owner-level reservation protection, exact contribution retry
after expiry, propagation of enclosing work-budget failures through item eligibility, and
control-aware action menus. Incremental hold settlement reuses the existing reservation index
and removes repeated metadata rebuilding. The repairs retain existing owners and accepted contracts;
[review evidence](verification.md#foundation-follow-up-review) records native, both-adapter
reload, browser and matched stress checks without implying a full-suite or capacity pass.

[SC](maintainers/state-contributions.md), [MP01/MP04](maintainers/multiplayer.md),
[PO](maintainers/persistent-objects.md), [DI](maintainers/dependency-invalidation.md) and
[ACT07/ACT08](maintainers/actor-model.md#priority-5-implementation-slices) record all 46 completed
slices. [Verification](verification.md#foundation-priorities-15--implementation-evidence) records
both SQL adapters, genuine OIDC/browser journeys, rollback/lost-response/privacy failures and
native/SQL/transport stress. Matched native CPU rose about 24%; both versions miss the requested
3× rate. [PF](maintainers/performance.md#foundations-15-measurements-and-remaining-cost) retains
that cost and wider-load work; these results do not establish hosted capacity or live model quality.

## 2026-09-26 — Complete design package for foundation priorities 1–5, Browser engine rationale and future client replacement

Added five separate feature specifications and technical designs under [the foundation delivery map](projects/foundations-1-5.md): shared contributions/resources, multiplayer authority, persistent objects/containment, dependency invalidation/aggregate work and persistent appraisal/directional social continuity. Each design records inspected native/data/related-branch boundaries, typed operations, lifecycle, privacy, in-place migration, bounded work, concrete consumers, failure cases and qualification requirements.

Added SC01–SC08, PO01–PO09 and DI01–DI08 as focused child trackers of existing EWF/INV/DF/BW work, and decomposed MP01/MP04 and ACT07/ACT08 in their current trackers. At design delivery, all 46 implementation/qualification slices remained open; prior task states and historical branch coverage are preserved. The [remaining-foundations index](maintainers/remaining-foundational-work.md) and [maintainer index](maintainers/README.md) link the complete package. Proposed engineering choices are explicit; no new universal emotion taxonomy, social-state authority, inventory service, scheduler or distributed prerequisite was introduced.

The design began at main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` and reconciles the subsequent main `f015b2a9712ff87589dc04e72046c4e483dcab67` into the documentation branch, preserving its shared Worker and cold-history consumer changes unchanged. Both sets of maintainer navigation and changelog entries are retained. Relative to that integrated main, this delivery changes documentation only: no runtime implementation, storage, permissions or live provider operations. Main and other active branches were not modified. No build, automated suite or runtime qualification was performed by the design task; DF02/SL00 integration and actual native/database/client/hosted evidence remain implementation requirements.

Expanded [engine research](../archive/02-research/engines-art-and-audio.md#distribution-and-engine-tradeoffs) with browser access, typing/controller tradeoffs, native versus streamed delivery and concrete reconsideration triggers. Documented the [client replacement path](spatial-world.md#client-replacement-path): retain hosted authority and adapt public contracts, while rebuilding presentation and qualifying privacy/lifecycle behavior. SW10 remains incomplete; no migration, console release or offline runtime is delivered or authorized. Reconciled stale camera-choice wording with the accepted spatial direction.

## 2026-09-25 — Shared Macrofold Worker caller cutover

Replaced Worktree-bound Sandbox execution with an explicitly owner-selected shared Worker. Operator selection rather than automatic creation keeps administrative lifecycle permissions and open-ended allocation costs outside actor/conversation code; the removed finite Sandbox allowance is not reinterpreted as an hourly ceiling. Existing Worktree/Session mappings and old financial records remain intact. Added demand-first native submission, target checks, durable conversation closure and Run-scoped cancellation, while preserving direct inference. [Provider setup](ai-providers.md#shared-worker-setup-and-cutover), [architecture](architecture.md#macrofold-worker-ownership) and [MW01–MW04](maintainers/macrofold-worker-api.md) replace the prior per-Worktree ownership direction. [Verification](verification.md#macrofold-worker-api-cutover) separates local runtime/build evidence from remaining live cutover and baseline CI gaps.

## 2026-09-25 — Foundation decisions and branch-aware remaining work

Recorded accepted [special invention permission](../archive/03-design-proposals/invention-governance-and-ownership.md#special-player-invention-permission), [risk-accepted law changes](../archive/07-technical-architecture/declarations-and-evolution.md#accepted-live-change-and-risk-policy), scheduled maintenance, [main-world logout/death/ghost policy](worlds/base/lifecycle-and-protection.md), persistent cause-linked emotions and foreground/background sensory policy. These are accepted targets, not runtime delivery. Gameplay risk can be explicitly accepted without granting unsupported execution or bypassing integrity; buildings remain unprotected pending a later policy.

The [remaining-foundations index](maintainers/remaining-foundational-work.md) separates uncovered work from overlapping implementation branches and preserves the inspected branch provenance. MP01–MP04, BW13–BW15, ACT07–ACT08, DF01–DF02 and INV-1.7/INV-5.6 fill concrete gaps; existing EWF/EPR/SL/SW owners retain their work. D03/D07/D15/D33 retain residual questions; D06/D13/D19/D51 point to accepted owners. Current data/runtime hardening and its evidence are unchanged by this documentation-only update.

## 2026-09-25 — Inactive history and runtime hardening

Moved inactive actor history out of ordinary simulation recovery and commits without changing recall eligibility, forgetting or consolidation semantics. Scoped SQL context reads, explicit maintenance/edit materialization and complete save capture preserve access and fidelity. Durable ordinals keep partial histories append-safe. Dense encounter preparation and finalization reuse work while preserving all native events and recipients.

The existing 168 fixture/API typecheck errors are resolved. Native crash, concurrency, migration and cold-history drills expand the evidence; measured dense latency improves but remains above interactive capacity. [Residency contract](performance.md#inactive-history-residency), [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence), [PF08/PF09](maintainers/performance.md) and [verification](verification.md#data-runtime-hardening) distinguish delivered work from remaining large-backlog, save-size, population and hosted qualification.

## 2026-09-25 — Short-change workflow and concise responses

[Root guidance](../AGENTS.md#low-risk-changes) now lets short, low-risk tasks skip separate design documents, minor-fix changelog entries, unrelated test suites and redundant review rounds. Focused diff review, affected-behavior verification, consequential decision records, explicit requests and required gates remain; size alone does not establish low risk. Response guidance requires concise, plain, accurate and complete language, with shorthand only where clarity survives. [CG05/CG08](maintainers/agent-guidance.md) track the revised instructions and pending compliance evidence.

## 2026-09-25 — Small-change planning exception

[Root guidance](../AGENTS.md#plan-before-implementation) now starts development with an estimate of affected lines of logic, excluding tests. Below 200 lines, a brief conversation plan replaces the mandatory project document; at 200 or more, `docs/projects/` documentation remains required. Scope growth triggers reassessment. Major questions, completion criteria, required verification and updates to existing specifications/trackers still apply. This supersedes the universal written-project-plan requirement below; [CG05/CG08](maintainers/agent-guidance.md) reflect the revised rule.

## 2026-09-25 — Plan-first development and explicit completion

[Root guidance](../AGENTS.md) now requires a written plan for the entire agreed implementation under `docs/projects/` as the first development step, with major developer decisions resolved before implementation. Done means all agreed implementation, integration, documentation, review fixes and required verification are complete, including required unit/integration tests and manual end-to-end testing. Existing authorization suffices when no major questions remain; the default against unsolicited automated tests is unchanged.

[Design](../.agents/skills/openlegend-design/SKILL.md) no longer permits skipping the written plan for small changes or stopping at a default one-hour window. Explicit user scope/time limits and mandatory blockers still apply; incomplete work must be reported honestly. This supersedes those defaults in the earlier workflow entry. [CG08 and CG05](maintainers/agent-guidance.md) track delivered instructions and unverified native-agent compliance separately.

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

## September 25 — Hearing integration and native execution slices

Historical hearing-branch integration through `03105fed` added graded speech, receiver/transfer reuse and native supply indexing. It used fixed one-second execution and a four-second routine-discovery compromise; both were superseded by the main elapsed-time integration under [RP06](maintainers/revisitable-policies.md#rp06--elapsed-time-fidelity-and-integration-limits). Its [344-entity 8× observation](verification.md#hearing-8x-runtime-qualification) remains workload/host-specific historical evidence, not qualification of the combined tree. Speech re-authoring is D66; main retains D63–D65 for social exposure.

## 2026-09-25 — Production data model review

Reviewed the [production records](../archive/07-technical-architecture/production-data-model.md) against gameplay, current storage and accepted engine boundaries. Clarified one canonical owner per record, shared actor capabilities, operational goals/plans/due work, identity-preserving migration, timeline/source fencing and revision-aware recall indexes. [Queries](../archive/07-technical-architecture/data-queries-and-mcp.md) now specify database selection before bounded context preparation, with index gaps and the unmeasured 20 ms local-retrieval target explicit.

The owner selected shared-world regional priority with independent worlds supported, retention of important events/summaries with routine detail allowed to expire, and no creator access to human-private messages/notes. Updated [scale/retention](../archive/07-technical-architecture/data-delivery-and-scale.md), related product/save/knowledge/cognition documents and [D1–D6 delivery slices](maintainers/production-data.md#delivery-slices-and-exit-evidence). [Open decisions](../archive/05-project/open-decisions.md) retain exact crowd/load policy, retention windows, privacy operations, recovery/rewind terms and retrieval deadline/quality choices; no arbitrary numeric capacity was accepted. This is a design/documentation change only, with no storage migration, provider calls, runtime qualification or new test execution.

## 2026-09-24 — Database and simulation responsibility clarification

Clarified the existing [production data model](../archive/07-technical-architecture/production-data-model.md#database-simulation-and-background-responsibilities): independent operational records and database-side queries, in-memory active simulation, atomic record commits and bounded asynchronous AI/embedding work. Whole-world JSON remains a checkpoint/export format in the target; current snapshot/journal storage is still transitional. [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence) now explicitly track missing record/query implementation separately from deferred verification. The [scale design](../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) distinguishes a million-player ambition from measured concurrency and concentrated interaction workloads. No runtime migration, latency guarantee or capacity qualification is delivered by this documentation update.

## 2026-09-25 — Elapsed time is not a tick requirement

The accepted clock conversion (one real second to one game minute) no longer implies one-game-second integration. The finite native implementation resolves start-state conditions, integrates elapsed rates and existing work, and handles endpoint outcomes before selecting the next bound. Sparse simulation remains independent of browser frame cadence; source memory pressure cannot pause native time. Current status-effect/world ownership and in-place saves are preserved with the new agent guidance.

[Simulation time](simulation-time.md) owns the contract; [base time](worlds/base/time.md) and RP06 (renumbered during current-main reconciliation) own revisitable fidelity choices. [PF13](maintainers/simulation-time.md) owns delivery, the [boundary catalogue](maintainers/simulation-boundaries.md) collects future exact/local bounds, and [sound coordination](maintainers/speech-time-integration.md) prevents reintroducing a fixed-second loop while merging graded speech. Native/application observations are in [evidence](verification/simulation-cadence.md); regional scheduling, exact fleeting exposure and general coupled-flow integration remain future work. This supersedes the previous mandatory 480-ticks-per-second performance premise, not its historical measurements or the existing collision/privacy/durability rules.

## In-place development updates

**Superseded as policy by [the owner-requested restoration](#2026-09-27--development-save-policy-restored).** The following records the earlier change, not current instructions.

Corrected the policy: small migrations are allowed and preferred; maintaining legacy game versions is not required. Removed automatic fresh-world recovery and its per-feature save-format gate. The preceding startup recovery did reset the development gameplay world while retaining accounting; that behavior is superseded, not an acceptance requirement. Current behavior is owned by Save/load and Architecture.

## Camera-facing sprites and mixed spatial review

Superseded upright-only Y-billboards with fully camera-facing artwork and separate virtual depth, without rotating mechanical bodies or shadow proxies. Recorded color-pass-free shared shadow proxies, batched plank detail, reveal uniform reuse, indexed corridor projection, exact terrain-cell crossings and worker failure/shutdown boundaries. Completed EPR03's initial private visual-acquisition scope correction and preserved the viewer's designated introduction; retained broader EPR exposure work. Updated obsolete audience-cache regression work and added SR21–SR23. Mixed browser/application observations and adverse limits belong in their evidence record, not a scale-certification claim.

## Recast and world-presentation integration

Reconciled the complete movement/visual discussion: continuous arbitrary-angle positions (placement snapping optional), shared round-body clearance, Recast selection over navcat after qualification, selective Rapier without a second dynamics world, bounded worker/time barriers and distinct raster/contact tolerances. Added the canonical world-presentation owner for lit fallback sprites, multi-receiver shadow projection, correct depth, smooth right-drag and configurable local authorized reveal. Superseded native-lattice implementation claims and algorithm-only TODOs while preserving historical evidence and still-valid requirements. SW17–SW19 and SR16–SR20 distinguish delivery, deferred controller/tile/model/crowd work and unrun automation.

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

## Action invocation and partial-fulfillment implementation

Added current move/follow, Jev-first grounding and revised-action approval facts to Architecture and implementation status, with native/HTTP/stress evidence in Verification. Refined the action capability specification to permit explicit partial fulfillment and initiator review, and reserved Mechanical workflow reconciliation for integration with the separate invention work. The example repertoire remains aspirational. Broader AC/AG/INV acceptance is not marked complete. Temporary implementation/verification workflow files are removed and the original CI workflow is restored.

## 2026-09-24 — Action capability code review

Aligned current action docs with scoped binding/approval authority, native-behavior review and state-stream presentation. Marked the delivered narrow tasks separately from broad AC acceptance, recorded regression work in Maintainer TODO, preserved the invention-workflow reconciliation section, and advanced current development-save references to schema 11 without legacy readers. Runtime/performance evidence is recorded separately.

## 2026-09-24 — Perception and reaction performance

Recorded private visual-acquisition semantics, bounded experience batches, exposure/feature reuse, ordered reaction intake and cooperative native checkpoints. Updated EPR/PF delivery state, current development format 13, measured native/HTTP evidence and deferred automated coverage. Superseded the SR10 requirement to reproduce broadcast acquisition audiences while retaining outward-event equivalence requirements.

The optional scalar-only capture experiment was rejected after a warm-workload deadline failure. Recorded the unchanged qualified implementation, the warm mixed result without a throughput gain, and the dense-scene capacity failure instead of reporting universal scalability.

## Main rebase and measured acquisition follow-up

Reconciled the action/perception branch with main's in-place save policy, generic status effects, observer knowledge and current-evidence scheduling. The old temporary-runner history is retained on a backup branch; active source uses the actual rebased implementation. Per-feature save-reset instructions are superseded by the active save owner, while historical measurement reports remain unchanged.

Added the reusable full-server profiler and recorded its continuous-presence correction, native warm/dense results and limits. The patch-removal experiment was not retained. Moved bundled follow tuning to its base-world source, retained the existing execution adapter and reserved invention-workflow reconciliation section, and added deferred regression coverage without running automated suites.

## Dense persistence and local database isolation

Recorded DP01–DP06 scope under the existing PF owner. History preparation and bounded source buffers refine compact atomic persistence; the measured local SQLite worker is a PF10 subset, not a second database or an implemented general simulation worker. Runtime facts, performance evidence and deferred automated coverage remain in Architecture, Verification and Maintainer TODO respectively. The previous synchronous-SQLite wording is superseded for the local adapter; dense CPU/clock and broader qualification remain explicit.

## Limits audit implementation

Updated current implementation descriptions after removing undocumented small content-count ceilings, the named-save count and the hidden spending clamp. The architecture owns current behavior; cross-cutting deferred verification is in TODO. Original audit entry numbers remain in the external limits reports with completed removals labeled explicitly.

## Physical contact semantics

Replaced the proximity-based touch approximation with body-surface contact. The spatial-world specification owns the physical rule and migration semantics; architecture reflects the optional detector's current behavior. Earlier dense-contact measurements describe the superseded proximity implementation.

## Repository limits audit and dependency gate

Imported the full 238-entry limits decision report from its temporary working artifact into `docs/maintainers/limits-audit.md`, preserving stable entry numbers, prior removal completion notes, classifications, recommendations and source references. The maintainer index and TODO link to this single follow-up owner. All remaining audit work is explicitly blocked on completion of the current data foundation, followed by a fresh review of every finding against the resulting implementation.

## Spatial main rebase and eight-times budget

Preserved current-main world/status/item/identity/camera and in-place save semantics while replaying the spatial commits. Removed superseded fresh-save instructions from active spatial guidance and reconciled own-observer story eligibility. Added actual-progress profiling, thresholded acoustic rejection, current runtime evidence and PF12's budgeted optimization direction. Existing task IDs/remaining qualification are retained; historical measurements do not certify the rebased runtime.
