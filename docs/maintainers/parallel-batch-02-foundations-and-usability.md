# Parallel batch 02 — Foundations and usability — assignment tracker

**Status: Completed October 3, 2026; NP01–NP05 and both planned combined scenarios are complete for their agreed scope.** The original October 2 planning pass completed no runtime work. The [feature specification](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md) owns intended behavior, selection rationale and acceptance. The [technical design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md) owns mechanisms and shared contracts. [Copyable prompts](../projects/completed/parallel-batch-02-foundations-and-usability-prompts.md) supply standalone entrypoints.

These are scoped children of existing work, not replacements for their parent trackers. Current source was inspected at local `main` `c2e670b0` on October 2, 2026. The preceding PW work is substantially implemented, with open integration and qualification; do not treat its old proposal paragraph or an unchecked broad gate as proof that its implementation is missing.

## NP01 — Reliable AI outcomes and spending

**Priority 1 · Completed October 3, 2026 (scoped acceptance).** Repair shared provider/accounting behavior before expanding its consumers. A completed model call with an unknown price must not be treated as free; a rejected call must not be confused with an unfinished one. Configured allowance and context-limit failures should obey their existing accepted meanings.

- [x] Deliver adapter outcome/dispatch classification, shared reported-cost decoding and authoritative settlement validation, removal of the hidden monthly $50 clamp within the already accepted configuration range, and existing `context-exceeded` reporting for required-context overflow.
- [x] Demonstrate the [NP01 feature acceptance](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np01--reliable-ai-outcomes-and-spending) through the actual callers and reconcile [NP01 design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#np01--reliable-ai-outcomes-and-spending) records. Preserve uncertain exposure, immutable receipt ownership, normal final admission and no automatic paid retry.

[NP01 evidence](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026) covers 54 synthetic adapter/cost/settlement cases plus the actual director, all four context variants, native reflection/workspace handling, cancellation at journal/terminal boundaries, concurrent caps and PostgreSQL reopen/restore. The [October 3 thorough review](../verification/level1-decisions.md#thorough-review--october-3-2026) adds late-completion, cancellation recovery, fractional allowance/deadline and malformed transport/usage cases. No live model or browser qualification is claimed. Unknown transport admission retains exposure; the accepted identity quota and request counts are unchanged.

Parents: [MW05](macrofold-worker-api.md#mw05--outcome-classification-and-request-body-fixtures), [level-1 follow-ups](TODO.md#level-1-decisions-follow-up), CR12/CG09, WW07/WW11 and their WAF02/IER04 accounting/recovery scope. MW04 deployment and the existing deferred request-body fixture are not automatically closed. NP05 may edit provider streaming hooks, but classification and settlement remain NP01's responsibility.

## NP02 — Sensory work follows changed objects

**Priority 2 · Completed October 3, 2026 (scoped acceptance).** Eliminate repeated all-source preparation for a small known change while preserving every existing observation and event-order contract. PW08's delivered cache optimizations are prerequisites already present, not tasks to reimplement.

- [x] Deliver phase-specific complete-change notices, incremental derived source/index maintenance, old/new-neighborhood observer selection, safe snapshot succession and conservative rebuild fallback.
- [x] Demonstrate [NP02 acceptance](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np02--sensory-work-follows-changed-objects), including fleeting observations, intermediate phases, fork/cancellation/restore and sparse growth versus dense first exposure; reconcile the [source-preparation design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#np02--sensory-work-follows-changed-objects).

Delivery and measured limits: [October 3 evidence](../verification/perception-reaction-intake.md#np02-sensory-preparation--october-3-2026). Warm source preparation stays constant across 100–5,000 distant objects; exact observation traces match the full-preparation reference. Follow-up review repairs stale contact starting positions after unknown/overflowed command edits and verifies initialization plus ordinary native advancement against full preparation. Small-scene timings are mixed, dense native CPU remains higher in the recorded profiles, and short PostgreSQL runs do not qualify capacity.

Parents: [EPR02](events-perception-and-reactions.md#epr02--eliminate-redundant-full-world-sensory-scans), PF12.3/PF13.11, [proportional stage 2](../projects/proportional-step-work.md#stage-2--sight-work-follows-change) and C18. No closure of whole-world publication cost, genuine first-exposure fan-out, all simulation stages or production capacity follows from this task.

## NP03 — Craft with an invented material

**Priority 3 · Completed October 3, 2026 (native, browser and PostgreSQL acceptance).** One invented cord material feeds the woven-container binding role through positive producer/consumer checks. The [October 3 implementation plan](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#authorized-implementation-plan--october-3-2026) records owners and lifecycle/privacy decisions; [evidence](../verification/camp-life.md#np03--manufactured-material-reuse-october-3-2026) records actual results and limits.

- [x] Deliver the world-authored cordage family and positively certified binding input for woven containers through existing invention admission, dependencies, craft and custody.
- [x] Demonstrate [NP03 acceptance](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np03--craft-with-an-invented-material) with native/supplied proposals: actual manufacture, rejected impostor/stale/private inputs, resource conservation, cancellation/replay/competing commands, two names/sizes, storage/reuse and current-format reopen; reconcile [NP03 design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#np03--craft-with-an-invented-material). Browser workshop review/Apply, separate manufacture, ordinary container admission/Craft and exact packing/retrieval passed. Creator field eligibility/preview passed through their native service projections.
- [ ] Separately qualify live model generation/voluntary two-stage choice through the existing INV/AG provider gate. No provider calls were made here; supplied/native success does not establish model quality. This is an evidence gap, not an unfinished native implementation or automatic authoring-chain requirement.

Parents: INV-3.5/INV-6.1–6.2, EWF09 and RF01. PW02/PW03 already supply the family/metadata/container mechanisms. Arbitrary recursive invention, assemblies, live-law replacement, generated code and automatic recipe knowledge remain outside this child.

## NP04 — Find and choose camp supplies

**Priority 4 · Completed October 3, 2026 (scoped acceptance).** Connect existing camp activities to complete permitted discovery and explicit character inspection rather than arbitrary prefixes and an unusable narrowing warning.

- [x] Deliver role-filtered paged discovery, shared storage selection, exact selected identity, explicit approach/inspection, stale recovery and an accessible camp form.
- [x] Demonstrate [NP04 acceptance](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np04--find-and-choose-camp-supplies) through real game UI and actual native effects; reconcile [NP04 design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#np04--find-and-choose-camp-supplies). [October 3 evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026) records native effects, privacy/reopen, keyboard/wheel/layout checks, cold/warm work and zero paid spending. The requested follow-up review additionally verifies moved-source continuation, retired selections and disconnected/late storage reads; wider qualification remains with the parents below.

Parents: PW03/PW04/PW10, AC07/AC11, PO07, BW19 and UIUX02–UIUX04. Broader real model retention/reuse and uncoached/large-content qualification remain in PW10/PW04 until actually demonstrated. Current materials and containers are sufficient; NP03 is not a dependency. No new survival activity or learning algorithm is included.

## NP05 — Read NPC replies before generation finishes

**Priority 5 · Completed October 3, 2026 (scoped acceptance; multilingual input verification deferred by Mike).** Extend structured character replies, separately from plain-text World Agent streaming, with a permitted unfinished preview and unchanged final gameplay admission. The accepted pending presentation uses only the existing dots.

[Actual-route investigation](../verification/npc-reply-preview.md) initially found an incorrect decision-model setting. Mike authorized correcting it to Jev. The unchanged reply generator then completed three ordinary direct conversations with schema-valid independent speech, clear hearing and visible attribution before the remaining body. This passes the prerequisite for the restricted closed-operation slice. Production integration now delivers that private preview through the actual browser and reconciles genuine heard history. Other adapters remain unqualified; remaining exact checks are below.

- [x] Establish the NP05 actual-route feasibility/latency gate before preview/UI implementation. The corrected Macrofold direct-inference route passed with ordinary replies; this is a prerequisite, not completed UI acceptance.
- [x] Deliver bounded structured decoding, established viewer eligibility before release, attempt-scoped preview delivery, client display and final reconciliation through the actual character reply path.
- [x] Replace the custom JSON parser with the approved exact-pinned `@streamparser/json`, remove superseded parsing machinery and qualify the unchanged disclosure checks through the actual preview owner; see [replacement evidence](../verification/npc-reply-preview.md#library-parser-replacement--october-3-2026).
- [x] Demonstrate [NP05 acceptance](../projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md#np05--read-npc-replies-before-generation-finishes), including privacy/cancellation/late output and actual browser-visible output before whole-response completion; reconcile [NP05 design](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#np05--read-npc-replies-before-generation-finishes).

**Owner-authorized deferral — October 3, 2026:** Mike deferred other-language support, so real OS IME composition/confirmation verification is no longer a current NP05 completion gate. Keep the existing composition send guard; revisit this unrun check when multilingual input becomes a product priority. This changes acceptance scope, not the recorded evidence, and does not claim multilingual support is verified. Selection/copy, active-reply save/load, queued-read revocation and native refusal/partial-hearing projection are qualified in the evidence report. One failed disposable-host startup did not retain its database identity before failure; an orphan fixture database may remain and must not be guessed/force-dropped. Other adapters/callers and broader NC/CR/UIUX/PW gates remain separate.

Parents: NC19 with NC02/NC10, CR02/CR12 and existing provider contracts. Scope is the direct player/NPC conversation defined by the design. Other structured explanation callers are inventoried, not silently qualified. Supported final-only fallback is required but does not pass the live streaming criterion. If the configured provider cannot supply safe incremental output, that criterion remains blocked and the task is reported incomplete; do not change models or add a second request to simulate it. PW05/PW11 owner-chat/workspace qualification remains separate.

## Dependencies and completion accounting

The [parallel boundaries](../projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#parallel-boundaries) settle shared meanings without worker communication. All five implementations are merged into local `main`. NP01–NP05 have passed their current scoped acceptance, with the owner-authorized multilingual verification deferral above. There is no invented coordination stage or sixth integration engineer. Estimated effort and logic changes belong to the task design, not a guaranteed schedule.

When delivered, update the exact overlapping requirements above and their canonical specs/limits. Check a parent only when its whole exit is satisfied; otherwise name the delivered child and preserve the remaining work and actual evidence limitations. Source inspection is not runtime verification. Keep authored evidence summaries with their topic reports and raw generated output outside Git, following existing documentation policy.

## Merged review — October 3, 2026

Reviewed local `main` at `b4930e15`, including all five implementation commits. Fetching `origin` confirmed `origin/main` at `bdaecaac`; local `main` is one commit ahead. No branch switch, merge or runtime-code change was required. This was a bounded implementation review, not a repeat of the recorded runtime qualification.

Source spot-checks covered cost validation and settlement evidence, conservative sensory rebuilds after unknown changes, manufactured-material producer validation, camp-search continuation scope, and early-reply decoding/disclosure/history reconciliation. No new actionable implementation defect was found in those checks. Prior topic reports remain the owners of runtime evidence; this review does not establish new browser, database, live-provider or scale results.

Fresh verification passed: `pnpm typecheck`, `pnpm build`, and the 26 existing injected-transport checks in `packages/ai/src/client.test.ts`. The checkout initially lacked the newly pinned parser dependency; `pnpm install --frozen-lockfile --ignore-scripts` installed it without changing tracked dependencies. The build needed sandbox permission for its local TypeScript-runner socket and completed with a client chunk-size warning. No paid provider calls were made; additional and total Jev cost for this review are $0.

The initial quick review left combined acceptance unqualified; both scenarios subsequently passed the focused checks below. Remaining work outside the completed batch is explicit:

- Deferred multilingual verification: revisit real OS IME composition/confirmation when other-language support is prioritized; it no longer blocks NP05. Investigate the potentially orphaned disposable database only if its ownership can be positively identified; never guess a database to delete.
- Separately owned follow-ups stay open: NP02 dense-work CPU/capacity qualification and NP03 live invention/voluntary two-stage choice. They do not reopen the completed scoped assignments.

The feature specification, technical design and prompt document cover the whole batch. With both combined scenarios now demonstrated and multilingual verification explicitly deferred by Mike, all three are marked Completed and filed together under `docs/projects/completed/`. The original prompts are retained as assignment history, not instructions to repeat completed work.

## Combined acceptance and closure — October 3, 2026

- [x] NP01 + NP05: actual conversation execution and PostgreSQL accounting accepted a streamed preview before final release; valid completion committed one speech and settled its fixture price. Malformed output/unpriced completion and disconnected uncertain execution withdrew previews, retained reservations and committed no NPC speech, with one generation request per case and no retry. [Evidence](../verification/npc-reply-preview.md#combined-streaming-and-accounting--october-3-2026).
- [x] NP03 + NP02 + NP04: real manufactured cord fed an actual crafted pouch, retained through current-format reopen; ordinary drop/observation advancement made it discoverable, and the browser camp picker selected and explicitly inspected that exact container. Browser Review/Start then led to completed native gathering, return, packing one wood into the pouch and fueling the fire. [Evidence](../verification/camp-life.md#combined-invention-observation-and-camp-selection--october-3-2026).

No runtime implementation fix was required. Existing broader parent verification and the authorized multilingual deferral remain separately tracked; they are not silently closed by this batch. Actual additional and cumulative Jev/provider cost for the combined checks are $0.
