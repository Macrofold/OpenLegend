# Parallel batch 03 — Personal game — assignment tracker

**Status: in progress October 5, 2026; PG03 and scoped PG04 are delivered; PG01's scoped live/browser journey, arrow assertion and accounting repairs are complete; embedding pricing and recipe-explanation fixes pass; one interrupted call awaits exact billing confirmation after provider-usage comparison. The other assignments retain their independent scope.**

PG03 and the scoped offer/drop preview work are included here; PG02 and other PG04 work retain their independent acceptance.

[Feature scope and acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md) · [Technical definitions](../projects/parallel-batch-03-personal-game-tech-design.md) · [Standalone prompts](../projects/parallel-batch-03-personal-game-prompts.md)

This is an allocation across existing owners, not a replacement backlog. Baseline: local main dd21d1c7. The prior NP batch stays completed; family authoring, originally excluded as active work, has since merged at c4e18d91. Four implementation/qualification tasks and one design task can start independently; the owner combines their results without task-to-task communication.

## PG01 — A useful live invention

- [x] Deliver the current-main ordinary-player invention, manufacture, use, meal and retained-discovery journey, with the contrasting supported non-weapon case and meaningful failures in [PG01 acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md#pg01--make-an-invention-matter-in-play).
- [x] Reconcile only demonstrated parent subsets and the existing arrow-material assertion mismatch. Record actual live evidence and unavailable prerequisites separately.

**PG01's scoped journey is complete.** [Live player evidence](../verification/camp-life.md#live-player-journey--october-4-2026) verifies genuine sling generation, ordinary manufacture/equipment, ammunition and prey reaction, finite harvest, cooking/eating, paraphrase/reuse, generated cord consumed by a generated pouch, packing/retrieval and current-format restart. The shared judgment prompt now names the current invention request explicitly; the confidence threshold and native checks are unchanged. Earlier native, queued-failure and accounting evidence remains labeled separately. This closes the selected play journey, not broad model quality, deployment, voluntary NPC choice or historical accounting.

- [x] Repair the current request's spending reconciliation: exact confirmed non-invocation permits an absent provider invoice, while complete Run-bound usage still includes any platform charges. The [October 4 review](../verification/camp-life.md#delayed-billing-review--october-4-2026) also keeps reservations counted when the service records charges whose billing rows are delayed or incomplete. Immediate/recovered paths and conservative failure cases pass; the original Jev charge settled through the existing owner at $0 without redispatch. Operating limits and historical holds remain unchanged.
- [x] Add exact-model embedding price estimates to memory/action/invention callers and reconcile the 40 completed retained calls through normal settlement without redispatch. [Evidence](../verification/camp-life.md#embedding-accounting-and-readable-descriptions--october-4-2026) records 901 input tokens, $0.00001802 token estimate and $0.000047 conservatively rounded ledger total.
- [x] Improve the generation prompt and authored container guidance/refusals to explain concrete quantities in plain language; a fresh live pouch passes.
- [ ] Retain/reconcile interrupted embedding `memory-index:cdfbeefd-7d84-4e58-a0dd-f8a563700297`: no token usage or external request ID was received, so its $0.01 remains counted under WW11. [Recovery was attempted](../verification/camp-life.md#interrupted-embedding-recovery--october-4-2026): its exact transport log records cancellation before any HTTP response, and provider usage matches the 38 completed calls/877 tokens with no additional call in that minute. Aggregate evidence suggests no charge but does not confirm the exact request; original per-request billing remains unavailable. Future embeddings now send a reconstructible client request ID for provider tracing. Cumulative ledger charges are $0.003946 plus $0.01 uncertain exposure ($0.013946 total). Keep its database/audit identified in the report; no manual waiver, provider deployment or historical write-off is included.

Owners: INV-3/INV-14/INV-19 in [inventions](inventions-and-world-evolution.md); relevant WW07/WW11 in [World Agent delivery](world-agent-writes.md); NP03's demonstrated live-generation child in [the completed native batch](parallel-batch-02-foundations-and-usability.md); [TODO](TODO.md). WW07's deployable-build and historical-accounting work remains separate. [Technical entrypoint](../projects/parallel-batch-03-personal-game-tech-design.md#pg01--integration-definition).

## PG02 — Coherent attended resident behavior

- [ ] Deliver current-context, meaningful outcome and continuation improvements for bodily, social and solitary concerns under [PG02 acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md#pg02--one-resident-with-reasons-to-act-and-reasons-to-stop).
- [ ] Demonstrate freely selected action, consequence, reconsideration and appropriate stopping through current owners; preserve unqualified whole-life and richer psychological scope.

Owners: [CE01–CE05](character-experience.md), [AG06/AG07/AG12](agent-agency.md), [CR12](cognition-redesign.md), [BW18](base-world.md#bw18--ada-and-the-lean-starting-camp). D69 remains the owner of new psychological-law choices. This assignment neither includes nor closes family authoring. [Technical entrypoint](../projects/parallel-batch-03-personal-game-tech-design.md#pg02--character-integration-definition).

## PG03 — Readable action discovery

- [x] Deliver existing context-menu/catalogue/inventory entry points with clear target/tool, relevant commitment information, stable choices and complete permitted discovery under [PG03 acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md#pg03--discover-actions-and-understand-their-consequences).
- [x] Demonstrate ordinary and stale/failure journeys with readable compact layouts and reconcile the scoped parent criteria.

Owners: [AC11](action-capabilities.md#ac11--usability-and-measured-efficiency), [UIUX](ui-ux.md), [DG01/ND13/ND18](needs-design.md#dg01--actions-and-first-encounters). Remapping, broad first-encounter narration and full inventory redesign stay outside this child. [Technical entrypoint](../projects/parallel-batch-03-personal-game-tech-design.md#pg03--presentation-definition).

**Delivered scope:** exact permitted target/tool/projectile facts, concise commitments, persistent detail, complete known discovery, stable refresh/focus and specific stale/failure recovery through existing commands. [dated evidence](../verification/player-clarity-ui.md#pg03--action-discovery-and-commitments--october-3-2026) records comparison → actual shot, cancellation, exact pin identity, draft continuity, scoped layouts and lost-item/target/control cases. No paid ranking, mechanical eligibility, NPC context, creator or renderer change is included.

**Reviewed October 4:** inaccessible selected contents are refused before projecting facts; complete discovery includes later and accessible nested offer/fuel lots. One request reuses permitted lookup data. The display initially mounts 40 choices, with complete search and keyboard Show more; valid refresh retains its reading window and expanded detail. [Review evidence](../verification/player-clarity-ui.md#requested-review-follow-up--october-4-2026) covers native output equivalence, exact fuel consumption, focus/recovery and the remaining PG04/PF05 latency gap.

**Second review, October 4:** cooking now enters the exact-fire chooser, including a missing-fire remedy; preparation availability uses carried totals and its detail discloses cross-lot consumption. Selected-item enumeration skips unrelated possessions. [Evidence](../verification/player-clarity-ui.md#second-requested-review--october-4-2026) records actual effects and the remaining projection-growth boundary.

## PG04 — Cheaper action availability

- [x] Confirm current preview attribution and deliver shared pure prerequisite work where it reduces repeated measured cost, preserving real admission and public results under [PG04 acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md#pg04--make-action-previews-cheap-without-changing-admission).
- [x] Record equivalence, isolated and complete-path measurements with actual progress and host limitations; a disproved hypothesis is a documented no-go, not an invented optimization.

Owners: [PF05](performance.md#pf05--public-view-and-browser-responsiveness), [AC11](action-capabilities.md#ac11--usability-and-measured-efficiency), existing [command/frame follow-up](../projects/shadow-quality-tech-design.md#follow-up-commandframe-spikes-and-physical-lower-end-hardware). Physical-device, long-run and broader capacity requirements remain open without their evidence. [Technical entrypoint](../projects/parallel-batch-03-personal-game-tech-design.md#pg04--prerequisite-evaluation-definition).

**Delivered October 4:** shared read-only offer prerequisites avoid disposable worlds for refusals, and drop previews omit discarded action-history construction while retaining structural transfer checks. Actual commands retain current admission and effects. A matched 1,443-choice native catalogue comparison reduces warm read time by about 35%, with identical serialized choices. Complete native transitions and service stale/competing/restored-command cases match. Production-browser catalogue samples reach 5,291 complete choices; bounded larger-scene runs sustain approximately 3× with successful commands. [Evidence](../verification/command-frame-spikes.md#pg04-preview-work-and-larger-load-follow-up--october-4-2026) separates those results from host-dependent tails, remaining transfer/inventory projection cost, physical-device and long-run qualification. The arrow-material assertion mismatch recorded during these checks is repaired by PG01 on current main.

## PG05 — First threat encounter design

- [ ] Produce the paired first-threat encounter documents, source-backed missing-mechanism inventory, implementation stages and explicit owner choices in [PG05 acceptance](../projects/parallel-batch-03-personal-game-feature-spec.md#pg05--design-the-first-dangerous-encounter).
- [ ] Reconcile the design's references and proposed decisions without implementing combat or marking unresolved policy/runtime tasks complete.

Owners: [BW14](base-world.md#accepted-lifecycle-and-protection-delivery), MP04 in [multiplayer](multiplayer.md), [DG07/ND11](needs-design.md#dg07--human-participation-and-recoverable-conflict), D07/PS-D01 in [decisions](../../archive/05-project/open-decisions.md), and [base-world limits](../limits/base-world.md). PG05 completes when its design/decision package is ready; runtime delivery is a subsequent assignment. [Technical entrypoint](../projects/parallel-batch-03-personal-game-tech-design.md#pg05--encounter-design-assignment-definition).

## Integration boundary

After the owner integrates delivery, the ordinary invention/use journey should remain discoverable with PG03 and mechanically identical with PG04. Repeat only evidence affected by the combination; PG02 consumes the same native effects, and PG05 adds no runtime dependency. This is the batch's combined completion condition, not a sixth worker or a new test-writing requirement. Preserve broader parent gaps and update the project status tables according to the documentation policy.
