# Action branch reconciliation and recovery

**Status: safe to continue as an explicitly incomplete work-in-progress; not a merge, capacity or documentation-closeout certificate.** This is the integration subtracker of [AC05/AC08/AC10–AC12](action-capabilities.md) and [PF00/PF03/PF09/PF11](performance.md). Parent acceptance gates remain unchanged. Read this entry point before older implementation summaries: the transfer audit found stale parent documentation and recovered missing regression requirements below.

## Fresh conversation: start here

Continue on `review/action-main-reconciled`. The pre-handoff audited head was `805c24a7d7c713aac06995bc0f00bf8ed5134351`; the subsequent handoff commits change documentation only. The latest independently exercised runtime source remains `d143461b85662b4ad7938968162e2674130b1cdb`. Read the live branch ref before any write. Do not reconstruct the original replay or merge the older action branches into this one.

The last integrated main baseline is `03105fed9209c126e4e69e9faeb4687f42d1e74a`. At the transfer audit, main was `8f72e945894340fa262ef0196c2520492c04e16a`, with four commits not in this branch. They include new record/query storage, PostgreSQL, history, draft and guidance changes—not merely unrelated documentation. This audit did not rebase again. Refresh main and reconcile its actual interfaces before further persistence optimization. Potential overlaps are not resolved conflicts; do not claim the working branch already includes this newer main.

Preserved history:

- `design/action-repertoire-and-capability-grounding` at `94a7682aee9f100ccb54e073969bb4ed4f9fea49` retains the earlier action/perception/persistence implementation and documentation history.
- `review/action-cleanup-application` at `614764d77723955cfcf5972cd8f0bff8a70f3c12` is the preserved source of the later replay.
- `84bad771` and `1c797464` replayed/reconciled the implementation on the integrated main baseline and added follow/contact/death fixes. Earlier source commits are not all ancestors after replay; the source branches are retained for comparison, not as additional work to merge blindly.
- Integration-only PR #20 is closed without merging. Main has not been modified by this action work.

### Read order and authority

1. [AGENTS](../../AGENTS.md) and its relevant documentation, review, rebase, TypeScript, verification, performance and AI routes. Also inspect guidance changes when reconciling newer main.
2. [Action capability specification](../action-capabilities.md), especially [partial fulfillment and initiator review](../action-capabilities.md#partial-fulfillment-and-initiator-review) and [mechanical workflow reconciliation](../action-capabilities.md#mechanical-workflow-reconciliation).
3. [Action repertoire](../repertoires/actions.md), then the [AC delivery ledger](action-capabilities.md#delivered-scope-and-remaining-work). The audited catalogue has 384 unique action IDs in 32 domains; it is not 384 implemented commands.
4. The [PF tracker](performance.md), [EPR tracker](events-perception-and-reactions.md) and [PostgreSQL profiling instructions](performance-profiling.md) for the performance side of this conversation.
5. [Focused runtime evidence](../verification/action-reconciliation.md), the retained report index below and [recovered regression requirements](action-regressions.md). A passed production build is not a passed test suite or proof of live semantic reliability.
6. The active AR tasks below. Repair/document the known integration gaps rather than reimplementing capabilities that already exist in source.

## Conversation decisions and where they live

This is a routing inventory, not a duplicate mechanics specification. Proposals remain proposals and an implementation checkbox is distinct from qualification.

| Decision or requirement | Canonical owner / current boundary |
| --- | --- |
| Engine for authored realities, not one universal survival world; reusable native services do not mandate human bodies, hunger, speech or terrestrial physics | [Engine/world boundaries](../engine-and-world-boundaries.md); capability specification ownership and native-foundation sections |
| Foundation / ordinary use / composition / definition categories; cross-links to mechanics, objects, needs, traits and future companion catalogues | [Repertoire reading and extension rules](../repertoires/actions.md#reading-and-extending-the-catalogue), stable row IDs and full entry template |
| Existing actions with new parameters need grounding, not invention; persistent use is not automatically definition creation | Capability specification sections 1–3 and existing G0–G3 classification in [declarations](../../archive/07-technical-architecture/declarations-and-evolution.md) |
| Sixteen reusable movement/evidence/temporal/agency templates are the intended foundation, not all delivered features | Capability specification section 3.2; AC delivery ledger is the implementation boundary |
| Actor chooses meaning and method; engine validates authority, physics, resources and effects | Capability specification sections 5–7 and 14; never execute quoted speech, private thoughts or generic desired-effect setters |
| Preserve scoped targets, body parts, instruments, recipients, units, method constraints, evidence, binding time and actual output references | Capability specification sections 5–6; richer codecs remain AC01/AC02/AC06 work |
| Point movement uses trusted spatial support/frame resolution; one-time approach and ongoing follow are different | Capability specification section 10; current native move/follow adapter and [base navigation](../worlds/base/navigation.md) |
| Visible follow should not need invention; scent/footprints/stealth need their own installed mechanics | Capability specification section 10 and repertoire REL/SEC; current follow loses the target honestly and has no stealth or sunset termination |
| Useful partial fulfillment is allowed; every material omission/approximation is disclosed, not silently treated as exact fulfillment | [Partial fulfillment](../action-capabilities.md#partial-fulfillment-and-initiator-review) |
| Uncertain removal of a criterion returns a specific revised action to the initiating player/agent for acceptance before work starts | Same section; player Accept/Decline and agent accept/withdraw use existing agency/admission rather than controlling another actor |
| Jev first where finite classification is sufficient; complete deterministic forms use zero inference; generated behavior receives fulfillment review | Same section; 0.8 winning-choice threshold is an initial uncalibrated setting, not a semantic guarantee |
| Removing “until sunset” may lengthen behavior; disclose real termination rules. Dropped requirements are not completed prerequisites or promises to invent later | Same section; indefinite follow cannot precede an advertised reachable generated successor |
| Native continuation must not call a model per tick/waypoint; queues, cancellation, receipts and private plans retain one owner | Capability specification sections 8–9 and 15–17; flat native frontier exists, general branch/wait/repeat does not |
| Invention authoring may remain a black box while this work proceeds; invented mechanical workflows must share invocation/predicate/output/lifecycle semantics | [Reserved mechanical-workflow section](../action-capabilities.md#mechanical-workflow-reconciliation); no second registry, planner or general effects interpreter |
| Installed definition, actor knowledge, possession, permission and actual execution are distinct | Same section plus INV/AG owners; proposals do not authorize resource consumption or grant a creator role |
| Private visual acquisition must not broadcast another actor's discovery; legitimate outward speech/effect witnesses remain unchanged | [EPR](../events-perception-and-reactions.md), delivered EPR tracker subset and native event/experience owners |
| Evidence batches/caches should reduce construction without omitting observations; changed sources must invalidate stationary observers | EPR/PF; frame capture, category-local reuse and owned evidence admission are delivered, regional mutation-fed invalidation is not |
| Cooperative execution yields I/O under one writer without exposing partial simulation or deferring evidence to a later game tick | [Performance design](../performance.md); native-step/WorldService implementation; indivisible finalization/encoding can still block |
| Physical touch uses actual body overlap/occlusion, not sight range or a proximity detector; contact is not identity knowledge | [Physical contact](../spatial-world.md#physical-contact), contact acquisition and current focused evidence |
| PostgreSQL is the primary production benchmark. SQLite worker is local usability/isolation, not a production-speedup claim | [Primary performance baseline](performance-profiling.md#primary-performance-baseline); no additional SQLite-only optimization unless explicitly reprioritized |
| First linearize repeated history lookups and bound construction; measure full server before choosing broader worker/storage changes | PF01/PF03/PF08/PF10; shared preparation is delivered, general native worker/chunked evidence/asynchronous authoritative projection remain conditional |
| Large warm/cold gains do not imply production capacity; retain failed dense/accelerated runs and clock-debt limits | [Focused verification](../verification/action-reconciliation.md), PF00/PF11 and historical report index below |
| Safe in-place development upgrades supersede early per-feature schema reset/fresh-directory instructions | [Active save policy](../save-and-load.md#active-development-policy); historical schema numbers in reports are not current operational instructions |
| Commit through GitHub connector, preserve branch work, keep changes small/modular and document implemented versus deferred scope | AGENTS and the task-specific work rules below |

## Current source map

Use the source and AC ledger to resolve the stale summaries identified below; do not assume the original handle-only interpreter is still the implementation.

| Area | Source to inspect | Delivered / open distinction |
| --- | --- | --- |
| Grounding and fulfillment | `apps/server/src/action-grounding.ts`, `navigation-contracts.ts`, `packages/domain/src/action-capabilities.ts` | Exact move/follow, Jev full-match routing, generated subset and decoded-behavior review exist; arbitrary mechanical schemas do not |
| Player and agent entry | `apps/client/src/ui/`, `apps/server/src/http.ts`, `ai-director.ts`, `decision-context.ts`, `response-context.ts` | Player action composer and state-stream approval, agent accept/withdraw and scoped context exist; browser/live-model reliability remains unqualified |
| Native action and approval authority | `packages/domain/src/response.ts`, `agency.ts`, `action-targets.ts`, `kernel.ts`, `follow.ts` | Operation/manifest/target-episode pins, immutable alternatives, queue/replace and actual native execution exist; general workflows remain open |
| Perception and lifecycle | `perception-frame.ts`, `contact-acquisition.ts`, `experience.ts`, `events.ts`, `living.ts` under domain | Private acquisition, bounded batches, scalar/category-local reuse, physical contact and lifecycle fixes exist; broader AR02/AR03 scenarios remain open |
| Scheduling and storage | `apps/server/src/actor-work.ts`, `native-step.ts`, `world-service.ts`, `history.ts`, `store.ts`, database adapters | Existing owners carry cooperative work, indexed/bounded history and local SQLite worker; newer main's storage changes are not integrated here |
| Reproducible measurement | `scripts/performance/profile-server.mjs`, `profile-database.mjs`, native stress runner | Explicit disposable PostgreSQL/vector path and failed-startup cleanup in the profiler exist; general server-factory cleanup remains AR07 |

## Retained evidence and prior work

The current-source summary is [action reconciliation verification](../verification/action-reconciliation.md). It records actual source comparison, production builds, matching contact/event/world digests, PostgreSQL fixtures and their throughput/tail failures. No new gameplay, benchmark, automated suite or paid call was run for this documentation-only handoff audit.

Earlier reports remain committed on this same branch. They are historical observations at their embedded revisions/workloads, not claims about current main or proof that the whole current branch passes:

| Work stage | Representative retained reports |
| --- | --- |
| Initial parameterized actions, revisions and follow | [Initial runtime/stress](../verification/action-capability-smoke.json) |
| Correctness/approval review | [Final action review](../verification/action-review-final.json), [closeout](../verification/action-review-closeout.json) |
| Private acquisition, scheduling and yielding | [Native measurements](../verification/perception-final-performance.json), [cooperative exercise](../verification/perception-cooperative.json), [service exercise](../verification/perception-service.json) |
| Earlier main rebase and warm-state optimization | [Review](../verification/action-perf-final-review.json), [full-server summary](../verification/action-server-summary.json) |
| Shared history preparation and local SQLite isolation | [Final persistence review](../verification/persistence-final-review.json), [PostgreSQL history exercise](../verification/persistence-postgres.json), [worker summary](../verification/persistence-worker-summary.json) |
| Latest physical contact and full PostgreSQL runs | [Focused narrative evidence](../verification/action-reconciliation.md) |

The catalogue, specifications, runtime source and these reports are available without this conversation. Some original commits live only on preserved branches after replay; do not equate replayed ancestry with loss of the implementation. Conversely, do not infer exhaustive verification merely because code and reports exist.

## Documentation audit findings

The pre-handoff branch was **not fully documentation-reconciled**. This section deliberately exposes rather than hides the remaining inconsistencies:

- `docs/architecture.md#actor-agency-foundation` still describes the old handle-only interpreter and says no clarification/player intent UI exists. `archive/05-project/implementation-status.md` says sustained follow is not implemented. Those statements conflict with actual source, the AC delivery ledger and the capability specification's partial-fulfillment section. AR08 must replace those stale claims, retaining newer main's unrelated behavior.
- Several links point to missing Architecture headings: `native-follow-activity`, `action-fulfillment-and-revision-approval`, `jev-first-action-grounding`, and `change-driven-exposure-and-reaction-intake`. Do not interpret a broken section link as an unimplemented capability.
- `docs/verification.md` lost the action/perception/dense-persistence narrative headings used by README and trackers: `action-capability-native-slice`, `action-capability-review`, `perception-performance-implementation`, `rebased-action-and-perception-performance`, and `dense-persistence-implementation`. The underlying JSON reports and the focused latest evidence above still exist. Reconcile their index/forwarding links without fabricating a new run.
- `docs/maintainers/TODO.md` no longer contains the action-slice/review, perception-performance, RPR01–RPR08 or DP-R01–DP-R10 requirements from the earlier branch. They are now recovered in [action regressions](action-regressions.md), with IDs preserved and obsolete whole-roster/reset requirements explicitly retired. AR08 must reconcile the original TODO/index links, not maintain two independent copies.
- PF references to `performance.md#perceptionevidence-and-burst-delivery` and older DP implementation checkboxes need restoration/reconciliation. Do not reimplement delivered history indexes or SQLite isolation just because the old tracker section is missing; use source and actual reports.
- The older agency behavior summary still calls continuous target tracking a later extension. Update that summary to distinguish delivered visual proximity follow from undelivered tracking senses, stealth and richer relations.

These are known documentation tasks, not newly discovered runtime failures. All substantive decisions are routed above, and the recovered requirements are on this branch, so a fresh AI can continue safely. It must not report that every parent document is already accurate or that documentation closeout is complete.

## Integration tasks

- [x] AR01.1 — Compare the earlier committed replay with its generated candidate and inspect differing production files. Production TypeScript/Vite builds passed in the recorded runs; this is not full behavioral acceptance.
- [ ] AR01.2 — Repair the in-scope kernel import formatting. Two inherited formatting failures in `scripts/check-agent-guidance.mjs` and `docs/maintainers/agent-guidance.md` were separately recorded. Refresh the actual CI baseline after reconciliation; a narrow production build is not full CI success.
- [x] AR02.1 — Size the optional contact grid from actual body extents. Matched crowded/scattered experiments retained exact ordered contacts, events and final-world digests. Frame construction still samples world entities.
- [ ] AR02.2 — Finish sleep/waking, changed-detector, dead-observer, body-boundary/height and memory-capability qualification. Existing native walkthroughs cover only their explicitly recorded cases.
- [ ] AR03 — Finish follow/admission/replacement review: locomotion loss, target death, stale perception episodes, queued revisions, approval authority and durable restore. Do not equate the passed lost-sight walkthrough with complete AC acceptance.
- [x] AR04.1 — Recover the failed initial PostgreSQL setup and subsequent actual server measurements, including failed capacity/tail targets.
- [x] AR04.2 — Provide reusable explicit loopback PostgreSQL profiling with unique owned databases, no inherited application URL, sanitized diagnostics and profiler-owned startup cleanup. Successful and missing-vector runs cleaned up their fixture databases.
- [ ] AR04.3 — After integrating newer main, repeat matched-host PostgreSQL measurements and investigate accelerated/dense throughput and tail latency under PF00/PF11. The latest recorded mixed 3x case achieved about 1.42x; dense 1x achieved about 0.288x with a 5.88-second maximum command. These are not production passes. Regional invalidation, dependency-keyed cache reuse across unrelated commands, reduced allocation/proxy traversal and conditional chunked evidence remain candidate optimizations to measure, not implemented features.
- [x] AR05 — Remove temporary reconciliation/review scaffolding and close superseded PR #20 without merging. Preserve ordinary CI and source branches.
- [x] AR06.1 — Link the recovery tracker and reusable profiler; preserve scoped latest evidence and replace obsolete SQLite-only profiling instructions.
- [ ] AR06.2 — Complete parent AC/PF/Architecture/status/changelog reconciliation after AR08. Do not close broad acceptance gates because a doc or production build succeeds.
- [ ] AR07 — Fix general `createGameServer` startup cleanup for callers other than the profiler. Preserve the original error and close only owned resources; exercise extension/connection/writer-lock failures. Reconcile newer main's resource/connection changes first.
- [ ] AR08 — Reconcile the concrete documentation defects listed above. Recover unique implementation facts and narrative evidence from the preserved original branch; merge them with current main rather than replacing entire documents with older versions. Link recovered regressions from their existing TODO/navigation owner, preserve IDs and superseded-policy context, and check all affected anchors. This task is not complete in this handoff.

## Work rules carried from this conversation

Use the GitHub connector for Git actions, not shell Git. Continue the named working branch, reread shared files before writes, preserve concurrent work, and commit at least every five minutes while new code exists. Do not merge into main or delete preserved branches merely to tidy the handoff.

Use the smallest clear modular change with one semantic owner. Reuse existing helpers and make comments explain non-obvious constraints. Improve measured real costs; do not introduce a new scheduler, workflow interpreter, worker platform or memory representation just for speculative gains. Keep bundled-world rules separate from reusable services. Important uncertain product/authority choices stay unchanged and are returned to Mike while independent work continues.

Read the relevant maintainers' design/exit criteria before implementation. Keep implemented status, pending work and verification distinct. Do not run or write automated suites under this delegated scope, including indirectly through `pnpm check`; preserve ordinary CI and its merge gate. Use appropriate static checks, actual runtime exercises and meaningful performance stress for code/hot-path changes. Documentation-only work requires content/link review, not game execution. Record regression work in the existing TODO/focused owners rather than claiming unrun acceptance.

The prior paid authorization is one $10 ceiling for the delegated implementation task, shared across calls, providers and delegates; a new chat is not a fresh automatic $10 allowance. Recover settled and uncertain obligations before any paid dispatch. The recorded continuation runs used zero paid model calls; this documentation audit spends nothing. Never read unrelated credentials or charge an account without its owner's authorization.

## Next bounded sequence

First read this handoff and the canonical capability refinements, then refresh branch/main refs. Reconcile newer main and AR08 documentation carefully before more persistence optimization; newer storage/query work may supersede old implementation gaps. Continue AR01.2/AR07 and the remaining AR02.2/AR03 correctness work where still applicable. Use the reusable PostgreSQL profiler for AR04.3 and report cold/warm, nominal requested/achieved speed, debt, command latency, memory and failures separately. End each slice with its exact source revision, actual evidence and open decisions; no next AI should need this conversation or expiring artifacts to resume.
