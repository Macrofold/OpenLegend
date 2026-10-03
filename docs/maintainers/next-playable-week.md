# Next playable week — delivery tracker

**Implementation authorized in the assigned engineering chats; combined acceptance pending.** Five AI-assisted engineers, **80 hours each / 400 engineer-hours** over the requested week: **312 hours scoped delivery + 88 hours integration/review**. This replaces the initial 200-hour allocation; estimates include focused checks and are not measured throughput. [Feature specification](../projects/next-playable-week-feature-spec.md) · [Technical design](../projects/next-playable-week-tech-design.md). Baseline: `6664144a`, October 2, 2026.

This tracker owns the bounded week assignment and its integration gate. Existing focused trackers retain broader system requirements and release status. A checked PW item will not close its parent feature. The inherited planning commit is `8005f7c7`; the historical `6664144a` planning baseline remains context, not a replacement implementation base. Runtime checks below close only with actual evidence. Engineer 2 works on `oct2-eng-2` with a $0 paid-call allowance.

## PW01 — Reliable action choices and recovery

**Engineer 1 · 20 hours plus shared integration · 400–700 logic lines · medium risk.** Parent ownership: [Level-1 follow-ups](TODO.md#level-1-decisions-follow-up), CR02/CR12, AG03/AG04/AG06. Detailed failure evidence and approach: [PW01 design](../projects/next-playable-week-tech-design.md#pw01--repair-existing-decisions-and-recovery).

- [ ] Reject already-invalid selected actions at admission through native validation; preserve valid independent speech, future-output plans, duplicate receipts and execution-time revalidation.
- [ ] Repair selected `transfer-item` response dispatch through the existing native owner; a real director-selected pack/take action records its actual outcome and cannot duplicate on response replay. PW03 owns discovery and scoped inspection.
- [ ] Keep inspected learned methods and continuation options selectable after current-feasibility refresh through the real director; stale methods fail explicitly.
- [ ] Complete interrupted diagnostic roots on restart without changing settled results, releasing uncertain charges or replaying paid work.
- [ ] Preserve self/other/unknown speaker attribution in memories and commitments without disclosing hidden names.
- [ ] Price the actual configured direct-provider model using the explicit catalogue/alias contract; preserve unknown/uncertain charges and prove mixed-model settlement without paid calls.
- [ ] Run focused caller/restart/negative checks and review; reconcile the source TODO entries only for demonstrated repairs.

Day-one prerequisite: inspect current main and existing ready fixes in `codex/save-editor-family`; its save, private-read and name repairs should not be rebuilt. Coordinate shared event-wording changes. Integrating that branch's unfinished family feature is not a prerequisite and is not part of this allocation. If a selected repair already landed, verify it and redirect its allocation to PW08 or shared integration. MH03 now has its own required PW09 assignment; do not implement it twice.

## PW02 — World-owned invention families and one admission path

**Engineer 2 · 28 hours plus shared integration · 800–1,300 logic lines · medium/high risk.** Child slice of [INV-3.1/3.2](inventions-and-world-evolution.md#inv-3--expand-beyond-the-three-recipes-through-registered-families), EWF01/02/04/06/07. Design: [family contract](../projects/next-playable-week-tech-design.md#pw02--family-definitions-not-engine-recipe-switches).

- [x] Freeze the descriptor/version/pin, RecipeCandidateV2 and editor metadata contracts in the initial four-hour coordination window with engineers 3 and 4.
- [x] Move all four existing recipe families' touched policy, schemas, balance and wording to one base-world owner; every authoring path uses the same trusted validator/compiler. Extend the existing strict manifest with family references/pins and load resolution; do not imply recipe registration already exists.
- [x] Preserve authority, candidate digest, review, exact dependencies, idempotent Apply and separate crafting. Ordinary/NPC compatible proposals retain automatic admission; exact human Apply remains specific to paths that already require it.
- [ ] Qualify all old families plus the utility-container family; prove a recipe policy can omit weapons while accepting the utility family.
- [ ] Qualify malformed/forged/stale inputs, duplicate delivery and current-format reopen; reconcile relevant INV/EWF contracts and RF01.

Engineer 2 early handoffs: exact V2/family/editor and generic meter contracts agreed with Engineers 3/4. Shared current-format gate `9854d591` is reviewed and published: database marker 3 and `development-2026-10-02-playable-week`; a disposable PostgreSQL 18 probe refuses marker 2 before recall initialization, preserves existing data across reopen and refuses preceding manual formats. Domain/public contracts `edd4d9ad` and the matching server consumers `937c8c44` are reviewed and published. Four-family native craft/use and real disposable-PostgreSQL creator/ordinary admission probes pass; 11 meter/editor groups, nine cognition groups and four learning timing groups pass. Container and combined browser acceptance remain pending; no provider calls have been made.

This does not close arbitrary composition, invented-input chaining, world-independent physiology or live-law migration. Keep those parents open. The specified candidate envelope change is required; unrelated schemas and a second registry are not substitutes for the existing admission owner.

## PW03 — Craftable containers and camp supplies

**Engineer 3 · 24 hours plus shared integration · 550–900 logic lines · medium risk.** Depends on PW02's day-one contract and uses PW04 navigation. Parent owners: INV-3/INV-6, PO01–PO09, BW07, AC02/AC07/AC09/AC11 and AG06. World policy: [camp containers](../worlds/base/camp-containers.md).

- [ ] Implement the authored family and material/capacity/work relationship through PW02, with at least two distinct admissible designs and name-independent mechanics.
- [ ] Teach → craft → pack → drop → return → take uses existing recipe, work, object and transfer owners; same object/contents/pins survive restart, including interrupted crafting.
- [ ] Offer scoped player and NPC pack/take discovery without all-pairs expansion or a forced camp-stock goal. Extend selected ground-container inspection with container/access/revision-bound continuation; distant containers expose location/movement only, and arrival permits fresh contents inspection. Exercise real director selection using PW01 transfer admission, multi-page cache contents and access loss during paging.
- [ ] Exercise capacity, cycle/depth, missing/claimed materials, stale quantity/revision, moved target and private carried-bag refusal.
- [ ] Demonstrate a live generated container proposal and a relevant voluntary NPC selection under the shared authorized allowance; report native versus model evidence separately. Leave broader AG12/AG13 quality gates open.

No fixed building, encumbrance progression, preservation, locked cache, food reservation or canned survival sequence. No starter goal or free spawned basket is required for the player to discover this capability.

## PW04 — Inventory for exact camp tasks

**Engineer 4 · 24 hours plus shared integration · 550–900 logic lines · medium risk.** Parent owners: PO/BW/AC for semantics, [UIUX02–UIUX04](ui-ux.md) for interaction qualification. Design: [inventory](../projects/next-playable-week-tech-design.md#pw04--inventory-interaction-and-presentation).

**Implemented; partial native/browser qualification, not complete.** Reviewed inventory delivery `99a538be`, held-offer authority `2fec85e4`, contents-fence integration `4f86b1e1`, selected-item correction `73f61bf1` and keyboard-focus fix `3bbabc45` are available on `oct2-eng-4`. [Engineer 4 evidence](../verification/next-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) records 250-owned/230-private-granted destination scenarios, exact 3-of-8 transfer, six contents-fence native checks and eleven HTTP groups. Actual production-host browser checks include 44 bags/40-result paging, the three-of-eight receipt, a stale held destination retaining a blocked draft and hidden read counts unchanged across three ticks. The reproduced filtered-selection defect is fixed and rechecked: five last-inspected berries remain accurately labeled after a filtered page and native parent-content change; a later one-unit Move leaves four and returns focus to Back to contents. An actual crafted sling is compared with the equipped knife, and equipping refreshes the comparison. Blank drafts and selection survive the observed desktop/short/narrow adaptations. These slices extend PO04/PO07/PO10 and supply an AC07.1–AC07.2 consumer. Further actual browser checks use More destinations across the 44-bag result set, refuse a full bag, move a Half-filled four-unit draft into an explicitly granted NPC bag, drop and pick up one ground unit, unpack one unit and create a voluntary pending offer without transferring custody. Japanese text with Enter, the inventory shortcut key inside the field, named Clear and breadcrumbs leave native command count and character position unchanged. Two identical long-name bags also expose a reproduced narrow clipping defect: wrapping fixes full-label actions, and keyboard Open/Choose preserves the intended destination across narrow/short/130%-UI layouts. The bounded discovery/draft-shortcut requirement is demonstrated below; complete recipient acceptance, utility-container use, nested/large-content and remaining pointer/wheel/focus/input checks stay open, including native IME and assistive-device qualification. UIUX02–UIUX04 are not closed by these bounded observations.

- [ ] Adaptive collection/detail layout preserves exact selection, scope, scroll position and drafts across width changes.
- [ ] Display current capacity, relevant item characteristics and meaningful equipment comparison through permitted projections, with unknowns distinct from zero.
- [ ] Complete carried and ground-pile/container navigation plus exact transfer with source/destination/quantity, reachable blockers and actual server receipts.
- [x] Read transfer destinations only when the player opens Move, through bounded indexed/spatial discovery; remove the world-root scan from each ordinary contents page. All/Half set a quantity draft, never move items without confirmation.
- [ ] Preserve current-container search/paging; qualify long and duplicate names, more than one page, stale scope, empty quantity, removed items and delayed responses.
- [ ] Inspect and exercise desktop/short/narrow/enlarged layouts, keyboard/IME, focus, popup dismissal and world-input isolation. Repair reproduced clear-control defects only; retain unrun assistive-device qualification explicitly.

No blanket theme replacement, decorative grid mandate, bulk trading or unscoped search. Own shared UI primitives/CSS touched by PW05 so both surfaces use the same interaction rules.

## PW05 — Streamed World Agent replies

**Engineer 5 · 34 hours plus shared integration · 750–1,150 logic lines · high risk.** Child of INV-21 and [WW lifecycle/recovery](world-agent-writes.md); UIUX05 owns UX qualification. Design: [incremental delivery](../projects/next-playable-week-tech-design.md#pw05--incremental-replies-without-a-second-execution-system).

- [ ] Verify the configured service's native incremental-output capability and deployment prerequisites; preserve unsupported outcomes and configured model/funding.
- [x] One ordered run-event consumer handles reply text, confirmed phases and existing questions, with sequence validation, bounded replay and no new paid request on recovery.
- [x] Redact protected context handles across fragment boundaries before storage/publication; verify replay, EOF/cancellation and absence from diagnostics. Distinguish discovery/reply Runs inside one turn, persist their handoff and finalize only at outer turn completion.
- [x] Retain idempotent bounded progress under the existing turn owner and deliver owner-scoped snapshots/SSE with access revocation and backpressure.
- [ ] Client renders text before completion; preserves older reading position, draft and exact review; final validated text replaces the preview once.
- [ ] Exercise mid-run restart, reconnect/rotation, duplicate/gap events, questions, cancellation after a tool effect, slow readers, private-scope replacement and unsupported harness. Confirm no duplicate run, world effect or charge.
- [ ] Complete browser/input/accessibility checks and measured delivery latency, update WW/runtime/WS01 evidence; keep unrelated WW07 deployed-release gaps open.

No public-world broadcast of owner text, raw reasoning/tool traces or claim that a spinner completes incremental delivery. Earlier turns remain reachable under the unchanged session ceiling.

The configured deployment refused no-cost capability/health reads and lacks a Worker ID. [Native/browser evidence](../verification/invention-foundation.md#pw05--incremental-owner-delivery) is separate from that missing acceptance. Engineer 4’s reviewed saved-work component is awaiting orchestration integration; final input/layout/timing checks remain pending.

## PW06 — Integrated release evidence

**All five engineers · 88 hours total: engineer 1 has 24; engineers 2–5 have 16 each.** Depends on every other PW package. Engineer 1 coordinates the integration candidate; each semantic owner resolves its own findings. A runnable intermediate branch is not completion.

**Open; closure belongs to Engineer 1.** Engineer 4 supplies reviewed inventory/saved-work/meter UI, native receipt/permission fixes and [bounded evidence](../verification/next-playable-week-engineer-4.md). Current native production hosts qualify owned inventory and alternate-world meter interactions; a temporary host qualifies the actual saved-work components against the native API. It does not contain the Conversation parent or game canvas. The unfinished Engineer 5 parent pick `2157e3a5` was aborted on resumption; the latest owner instruction leaves further peer-branch integration to the shared final pass. Earlier committed contracts remain. Actual streaming availability and Engineer 3's utility descriptor/activity dependency remain unresolved; no ordinary utility invention/craft/pack or combined live stream/editing journey is qualified. No combined criterion is checked from the intermediate branch, standalone component host or earlier browser build.

- [ ] Demonstrate ordinary-player invention → automatic compatible admission → inspect learned recipe → craft → pack → drop → return/take with current browser/server/domain code and PostgreSQL.
- [ ] Demonstrate owner live reply, structured question/review and final result, including interrupted delivery; ordinary players receive no creator powers.
- [ ] Exercise a second actor's permitted ground-cache use, private carried inventory, stale changes and current-format restart across recipe/object/work/turn receipts.
- [ ] Integrate both survival stages and qualify a world without food/energy meters, complete body/lifecycle event equivalence, generic UI and unchanged autonomous choice.
- [ ] Demonstrate a voluntarily chosen camp activity, actual finite-method retention/reuse with fresh bindings, and a separate explicitly chosen fire watch with interruption and deadline behavior.
- [ ] Exercise exact revision editing/comparison/review while owner replies stream; direct edits make no provider calls and cannot apply stale approval.
- [ ] Repeat the selected simulation/memory workloads on the integrated candidate; preserve required evidence, privacy and temporal equivalence. Publish gains or unresolved results honestly.
- [ ] Review all shared contracts and the complete affected diff; run required combined CI gates and checks invalidated by integration changes.
- [ ] Reconcile affected canonical behavior, world content, task status, limit inventories and concise verification reports. No raw output committed. Record exact live cost and any uncertain exposure.
- [ ] Confirm no agreed acceptance is relabeled as a follow-up. If blocked, report the week as incomplete with the exact missing result and retain parent gaps honestly.

## PW07 — World-configured survival

**Engineer 2: 36 hours domain/server; engineer 4: 10 hours UI; shared integration additional · 1,300–2,000 logic lines plus mechanical callers · medium/high risk.** Both stages of the already-approved [survival project](../projects/world-configured-survival.md) are required. The [complete task brief](../projects/next-playable-week/survival.md) fixes units, authoritative storage, bindings, lifecycle and behavior-preservation cases. EWF03 and the survival project retain broader ownership.

**Engineer 4 client implemented; real native browser slices pass, combined acceptance open.** Generic owner/player meters consume authored server labels, ranges, units, read-only status and editor comparisons; client drafts preserve blanks and require explicit native Save. [Engineer 4's report](../verification/next-playable-week-engineer-4.md#pw07--real-alternate-world-ui-final-pairing-pending) separates older reservoir observations from a current native alternate world: Integrity uses the body's 150-point maximum, a real Save sets 75 points, Charge saves 180 of 240, and Disposition remains read-only. That world exposes no food, energy, dreaming or survival-specific status equivalents in the observed UI. At 390×844 and 130% UI scale, the editor fits within the viewport, named icon tabs and footer actions remain reachable, and blank Charge stays blank, displays an error and blocks Save. Same-authority competing editors refuse an older name edit, preserve the attempted name through Keep editing, and fetch the current name after explicit Discard and Refresh. Engineer 2's [native/lifecycle report](../verification/world-configured-survival.md) owns its separate results. The complete base/absent-meter, access/generation and integrated lifecycle matrix, plus native IME/assistive-device qualification, remains before coordinated PW07 closure. These bounded results map to EWF03/EWF04, BW06, both survival stages and UIUX02–UIUX03 without closing the broader parent gates or Stage 2b.

- [x] Replace native food/energy rates and damage/recovery with authored policy using the existing transition/rate owners; preserve raw-health versus displayed-percentage units and event causes.
- [ ] Move food/energy to the specified generic meter storage/binding seam and remove fixed aliases/DTO/UI assumptions through every caller. Do not maintain two writable representations.
- [x] Author base-world thresholds, words, concerns, sleep/dream/death/revival behavior and starting values once; preserve existing timing and eligibility rather than introduce a new survival balance.
- [ ] Support a world with absent food/energy meters and absent dreaming; no phantom bars, conditions, quick actions or forced decisions.
- [ ] Deliver generic player/owner meter presentation and editing with units/ranges, access checks and stale revision handling; pair engineer 4's UI work with engineer 2's projection contract.
- [ ] Complete the brief's timestep, body, collapse/death, dream, cognition, current-format rejection/reopen and alternate-world matrix. No incompatible save conversion, reset or deletion.

Dependency: freeze meter descriptors and UI projection early, then implement after PW02's common host ownership is stable. PW08 must retain valid rate/body dependencies; PW10 reads configured observations, never reintroduces fullness/energy aliases.

## PW08 — Proportional simulation work

**Engineer 1 · 36 hours plus shared integration · 350–600 logic lines · medium/high risk.** A narrow measured slice of PF and the proposed [proportional-step work](../projects/proportional-step-work.md), not approval or completion of that whole plan. [Task definition](../projects/next-playable-week/simulation-performance.md).

- [ ] Establish the current native and actual server baseline with the brief's workload, seeds, counters and repeated measurements; keep old profile percentages explicitly historical.
- [ ] Update current observer sightings by membership changes while preserving continuing identities, linger behavior, ordered notices and event histories.
- [ ] Index cached crossing pairs by participating body so invalidation visits affected pairs rather than all pairs; preserve cache ownership, removal and fork isolation.
- [ ] Retain crossing calculations across unrelated mechanical rebuilds only with the complete dependency certificate. Unknown or changed dependencies force recomputation.
- [ ] Exercise fleeting visibility, approach/exit, body/path/map/sense changes, death, fork and saved randomness equivalence; compare actual offered/achieved server speed and command latency.
- [ ] Report the improved operation counts and measured wall-time effect without hiding added survival costs or changing the horizon/limits/semantics to obtain a win.

No full scheduler rewrite, changed-target-only visibility implementation, offscreen freezing, worker migration or general temporal redesign. A benchmark alone does not complete the scoped reductions, and an optimization with changed perception is not acceptable.

## PW09 — Correct and efficient memory retrieval

**Engineer 5 · 30 hours plus shared integration · 250–450 logic lines · medium risk.** Owns the MH03 lexical bug plus narrowly scoped invalidation work beneath C01/C17/C20. [Task definition](../projects/next-playable-week/memory-retrieval.md).

- [ ] Use shared locale-independent normalization and parser-independent quoted lexical representations, with positions, on both indexing and recall queries; preserve original text, OR-prefix behavior and ranking semantics.
- [ ] Key lexical selection reuse by actor source changes and vector-coverage reuse by actor/model/dimensions. Retain global fallback for restore or unknown mutation scope and transactional publication checks.
- [ ] Prove relevant edits/forgetting invalidate while another actor's unrelated work does not; exercise privacy, rollback, cancellation and restart through real PostgreSQL callers.
- [ ] Measure exact current top-300 retrieval with 5k/25k/100k eligible sources plus unrelated histories; record full caller latency, SQL, query plans, examined/selected/hydrated work and hot/cold distinctions.
- [ ] Reconcile MH03 and the narrower cache findings from actual evidence; leave large-history ANN/retention and broad appraisal invalidation decisions open.

PF14's earlier shared retrieval/body filtering is already delivered and is not repeated here. No old-memory truncation, actor-memory cap, reduced required context or production ANN index is introduced to improve the benchmark.

## PW10 — Chosen camp activities and reusable finite methods

**Engineer 3 · 40 hours plus shared integration · 1,000–1,600 logic lines · medium/high risk.** Depends on PW01 admission, PW02/03 container semantics and PW07's configured observations. [Complete task definition](../projects/next-playable-week/camp-activities.md); [authored world rules](../worlds/base/camp-routines.md). AC/AE and BW remain the parent owners.

- [ ] Offer an explicit finite gather → return/pack → fuel activity using known sources, selected cache/fire, selected quantities and a personal minimum. No assigned stocking goal or hidden automatic food behavior.
- [ ] Implement revision-safe fresh resource binding through the single transfer owner; keep exact one-off transfer semantics. Missing/incomplete inspection is not empty inventory or partial success.
- [ ] Preserve native activity steps/results, interruption, failure and next-choice context. Relevant observed distances, health, quantities, tools, time and current blockers stay visible without engine IDs.
- [ ] Retain only supported demonstrated finite steps after the existing reflection/retention choice; invoke later with fresh inventory bindings and qualified knowledge. Fixed demonstrated quantities stay fixed unless another real supported variant is selected.
- [ ] Separately offer a one-session, explicitly chosen fire watch with observed low-fuel condition, own/selected-cache fuel, named deadline and independent fuel/attempt/spending bounds. It is not learned conditional control.
- [ ] Qualify interruption, no-effect attempts, races, exhausted source, personal minimum, moved cache/fire, expired deadline, restart, replay and native versus actual Jev choice/retention evidence. A low-fuel fixture or aged fire must be disclosed; the fresh starter fire alone cannot demonstrate refueling.

No standing protected stock, partner delivery, unseen branch learning, weather, preservation or generated native code. Relevant limit owners retain those follow-ons; no guarantee of Jev preference is inferred from a native fixture.

## PW11 — Inspectable and editable invention workspace

**Engineer 4 · 30 hours plus shared integration · 650–1,050 logic lines · medium/high risk.** Depends on PW02 family metadata and coordinates with PW05 progress. [Complete task definition](../projects/next-playable-week/invention-workspace.md). Parent owners: INV-21, WW and UIUX05.

**Implemented owned components; native and standalone browser slices pass, composite acceptance open.** `9d6fb2b0` supplies exact receipt recovery and shared ordinary recipe facts; `b4580543` rechecks delayed authority; `51ebeafa` retains unsupported local fields and ignores hidden/aborted reads; `e1d5a79d` rolls back Approve/Reject if authority expires during the write. [Evidence](../verification/next-playable-week-engineer-4.md#pw11--exact-saved-work-and-native-receipt-authority) records 67 V2 native checks, ten expiry checks, six held-title/revocation checks, eight held-decision checks, all-seven-kind reads, refusal of six nonrecipe edits, 24-revision paging and PostgreSQL reopen. The actual Work/editor/review components, hosted separately against the native server, inspect exact history, Preview, Save, prepare/Approve/Apply revision 25 and preserve a stale edit through deliberate reapplication to revision 27. Ordinary Craft consumes the installed recipe's materials and produces its actual item; learned-recipe details expose permitted facts and no creator powers. Dirty fields persist across the observed layouts, including 130% and 200% component UI settings; actions in normal layout flow leave focused fields unobscured. This extends INV-21 and WW03/inspection/retention without claiming the separate host contains the Conversation parent or game canvas. Integrated Conversation/Work, actual streaming, utility-family, remaining recovery/input and native IME/assistive-device qualification remain before composite closure; all requirements below retain their complete scope.

Further actual Work-browser checks inspect exact details for all seven kinds, with direct recipe editing absent for the other six. A held native Preview reply is ignored after newer input; fresh Preview reflects the new field. Lost Save, Prepare and Apply acknowledgements are injected only after the real native operation commits. Reload retains the exact saved-work selection, later local fields and original Save retry; that retry returns the same revision before deliberate reapplication. Prepare retry after reload recovers the same exact review. Reopening the exact review after Apply commits with its acknowledgement lost retrieves the actual receipt without a second Apply. The correction to private local persistence no longer treats a new transport connection as changed permission: native checks prove transport reconnection preserves the local-work identity while each security/world scope field still changes it, and full native request fencing remains unchanged. Actual character-control replacement clears private work selection and fields. Dirty Keep, explicit Discard and desktop/short/narrow/130%/200%-UI field/focus checks pass for the observed states. These are bounded native-backed recovery results; the integrated Conversation parent, actual stream, utility family, native IME, browser/text zoom and assistive-device qualification remain open.

Personal review additionally fixes a reproduced delayed Check returning earlier passed findings after a native value change, and distinguishes retained preparation from current checks. Actual keyboard Check/failed Prepare return to visible actions at desktop/short/narrow/130%-UI layouts; completing a held request after hiding Work leaves focus outside it. These extend the same PW11/WW03/INV-21/UIUX05 slices; no composite requirement is closed.

- [ ] Provide stable Conversation/Work views, draft list, exact revision history/comparison and adaptive detail without losing transcript position or dirty input.
- [x] Expose authenticated human read/edit/check/prepare adapters reusing native receipts and validation; no browser context handle, forged local authority, second draft store or paid call for direct edits.
- [ ] Supply readable summaries/comparison for all seven current kinds; structured direct editing covers installed recipe families only. Other kinds retain conversational revision with clear limits.
- [ ] Keep immutable revisions, stale-edit recovery, exact approval/Apply and dependency revalidation; block concurrent human mutation while an agent turn is active/recovering or a question is pending.
- [ ] Improve ordinary learned-recipe inspection and native Craft using permitted facts; ordinary compatible invention keeps automatic admission and gains no creator powers.
- [ ] Exercise the brief's idempotency, revocation, stale reads, restart, input/layout and authority matrix; integrate with real streaming without claiming a native fixture demonstrates provider quality.

## Parallel delivery plan

The following hour windows are per engineer, not a claim that everyone finishes a dependency at an exact clock time. Initial coordination and package-specific checks are included in delivery estimates; shared qualification is additional. Start independent reads, UI prototypes and baselines while common contracts are being landed. Do not wait for a full upstream package to finish before making its small stable interface available.

| Engineer | First delivery   | Second delivery and handoff                                                   | Shared reserve                | Total |
| -------- | ---------------- | ----------------------------------------------------------------------------- | ----------------------------- | ----- |
| 1        | Hours 0–20: PW01 | 20–56: PW08                                                                   | 56–80: PW06, integration lead | 80 h  |
| 2        | 0–28: PW02       | 28–64: PW07 domain/server                                                     | 64–80: PW06                   | 80 h  |
| 3        | 0–24: PW03       | 24–64: PW10                                                                   | 64–80: PW06                   | 80 h  |
| 4        | 0–24: PW04       | 24–30: PW07 contract/UI; 30–60: PW11; 60–64: PW07 integrated UI qualification | 64–80: PW06                   | 80 h  |
| 5        | 0–34: PW05       | 34–64: PW09                                                                   | 64–80: PW06                   | 80 h  |

**Initial four-hour handoff:** agree the already-specified family envelope/metadata, scoped container/destination reads, generic meter projection, native transfer binding and owner progress/draft component boundaries. Engineers 2 and 4 settle the survival UI contract before engineer 4 implements against it. Engineer 2 hands off a runnable meter/editor path before engineer 4’s final four-hour PW07 qualification block; move the blocks explicitly if dependencies slip, without counting fixture-only UI as integration. These are detailed implementation decisions, not permission to defer the task definitions or redesign authority independently. Escalate a contradicted contract before dependent code starts.

Use normal focused branches/worktrees from the agreed local-main baseline; report each branch change. This plan creates none. Recheck active tasks/branches before assigning writes. Land small shared-contract changes early; downstream work must not copy divergent interfaces. Do not perform a speculative rebase of every listed historical branch. Follow the mandatory conflict-stop rule if reconciliation is uncertain.

### Shared-file coordination

| Shared area                                         | Integrating owner                                               | Collaborators and handoff                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Domain declaration/types/world host registration    | Engineer 2                                                      | Engineer 3 consumes family/activity contracts; engineer 4 consumes authored field/meter presentation.                           |
| Simulation kernel/body/predicted motion             | Engineer 1 for cache changes; engineer 2 for survival mutations | Separate mutation correctness from derived-cache reuse; jointly review integrated dependencies.                                 |
| Object/craft/action discovery and reusable bindings | Engineer 3                                                      | Engineer 1 supplies response admission; engineer 4 consumes scoped read models.                                                 |
| Decision context/response and activity learning     | Engineer 1 for repair; engineer 3 for activity                  | Engineer 2 supplies configured concerns; one candidate composer and one native mutation owner.                                  |
| Inventory protocol/read service, client components  | Engineer 4                                                      | Engineer 3 verifies access and binding; share indexed query owner, not copied scans.                                            |
| World Agent progress/session transport              | Engineer 5                                                      | Engineer 4 extracts saved-work components; engineer 2 owns family interpretation.                                               |
| Memory/PostgreSQL publication and cache revisions   | Engineer 5                                                      | Other engineers use existing mutation/publication hooks; no separate count authority.                                           |
| Camp activity request/review card                   | Engineer 3                                                      | Engineer 4 supplies shared controls and scoped container picker/read model; PW10 owns its task-specific UI within its 40 hours. |
| Shared UI primitives/CSS                            | Engineer 4                                                      | Engineer 5 requests minimal common changes; each panel owns its task-specific presentation.                                     |
| Canonical tracker/limits updates                    | Each feature owner                                              | Engineer 1 checks consistency on the integrated candidate.                                                                      |

### Engineer start instructions

Read the paired week specification/design, your numbered packages, their full briefs and the linked relevant policy/owner documents. Refresh the agreed local-main base under the repository workflow, inspect active work before writing, and implement the assigned acceptance completely. Keep runtime, native-fixture and live-model evidence distinct. Your allocation does not multiply the shared spending cap or authorize merging another engineer's unfinished work.

- **Engineer 1:** complete PW01's six repairs, then PW08. Own the combined PW06 candidate and review dependencies with engineer 2; do not spend another engineer's reserve silently.
- **Engineer 2:** complete PW02 with early family/editor and meter contracts; then both PW07 survival stages, pairing with engineer 4 on UI. Preserve current base-world behavior while proving another world can omit its needs.
- **Engineer 3:** complete PW03 including real NPC inspection/transfer; then PW10's finite activity, honest finite-method learning and separately chosen fire watch. Coordinate response admission with engineer 1 and generic meter use with engineer 2.
- **Engineer 4:** complete PW04, the ten-hour PW07 UI contribution and PW11. Own shared layout primitives, exact draft/revision behavior and browser qualification across both inventory and authoring.
- **Engineer 5:** complete PW05, then PW09. Verify the deployment prerequisite first; an unsupported stream is a blocker for that acceptance, not permission to substitute a spinner. Keep recovery, privacy and settlement intact.

### Scope pressure and later work

The 400-hour plan is substantially larger than the original allocation, with especially aggressive cross-layer estimates for survival and learned activity bindings. Review actual progress and remaining estimates after first-wave integration and again before using the shared reserve. If a prerequisite or source inspection invalidates an estimate, reassign explicit help or revise the schedule with the owner. Never quietly remove acceptance, spend the entire qualification allowance on new scope, or count an incomplete task as done. Engineers who finish early help the critical path and review rather than invent another feature.

Full temporal/scheduler redesign, learned conditional programs, approximate vector search, broad invented-input composition, food aging/preservation, weather and usable shelter remain outside this allocation under their existing owners. Survival extraction, measured sighting/crossing work, lexical/cache repair, camp activities and the invention workspace are now required; they are no longer “next pickup” suggestions.

### Evidence and spending

No provider call, runtime test or benchmark was performed to produce this plan. Design-task spending, including Jev: **$0**. Once implementation is approved, Mike-authorized work shares the single $10 task ceiling in the [spending policy](../../.agents/rules/verification.md#spending), never five multiplied allowances. Engineers record reservations, settled fractional-dollar costs and uncertain exposure before another live trial. Exact native commands/fixtures can prove mechanics; only live selections qualify model behavior.

## Maintained records

- Design: [feature specification](../projects/next-playable-week-feature-spec.md) and [technical design](../projects/next-playable-week-tech-design.md).
- Limits: [invention](../limits/inventions.md), [objects](../limits/objects.md), [interface](../limits/interface.md), [camp tuning](../limits/base-world.md#cr01--proposed-finite-camp-activities), [finite reuse](../limits/action-experience.md#ael09--proposed-fresh-stock-binding-and-finite-reuse), [survival](../limits/state-effects.md#st17--proposed-passive-meters-and-configured-body-services) and [memory](../limits/memory.md); parent trackers above retain broader acceptance.
