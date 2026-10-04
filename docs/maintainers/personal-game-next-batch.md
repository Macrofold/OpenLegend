# Personal-game next batch — assignment tracker

**Status: proposed October 3, 2026; reconciled October 4. Five definitions and prompts are prepared; this documentation review does not deliver or qualify their runtime work.**

[Feature scope and acceptance](../projects/personal-game-next-batch-feature-spec.md) · [Technical definitions](../projects/personal-game-next-batch-tech-design.md) · [Standalone prompts](../projects/personal-game-next-batch-prompts.md)

This is an allocation across existing owners, not a replacement backlog. Historical planning baseline: local main `dd21d1c7`. The prior NP batch stays completed. [BW16/D63 family authoring](../projects/completed/family-authoring-tech-design.md) is now delivered and remains outside this batch; preserve its behavior instead of treating the former parallel worktree as a pending dependency. Four implementation/qualification tasks and one design task can start independently; the owner combines their results without task-to-task communication.

## PG01 — A useful live invention

- [ ] Deliver the current-main ordinary-player invention, manufacture, use, meal and retained-discovery journey, with the contrasting supported non-weapon case and meaningful failures in [PG01 acceptance](../projects/personal-game-next-batch-feature-spec.md#pg01--make-an-invention-matter-in-play).
- [ ] Reconcile only demonstrated parent subsets and the existing arrow-material assertion mismatch. Record actual live evidence and unavailable prerequisites separately.

Owners: INV-3/INV-14/INV-19 in [inventions](inventions-and-world-evolution.md); relevant WW07/WW11 in [World Agent delivery](world-agent-writes.md); NP03's open live-generation child in [the completed native batch](next-priority-batch.md); [TODO](TODO.md). WW07's deployable-build and historical-accounting work remains separate. [Technical entrypoint](../projects/personal-game-next-batch-tech-design.md#pg01--integration-definition).

## PG02 — Coherent attended resident behavior

- [ ] Deliver current-context, meaningful outcome and continuation improvements for bodily, social and solitary concerns under [PG02 acceptance](../projects/personal-game-next-batch-feature-spec.md#pg02--one-resident-with-reasons-to-act-and-reasons-to-stop).
- [ ] Demonstrate freely selected action, consequence, reconsideration and appropriate stopping through current owners; preserve unqualified whole-life and richer psychological scope.

Owners: [CE01–CE05](character-experience.md), [AG06/AG07/AG12](agent-agency.md), [CR12](cognition-redesign.md), [BW18](base-world.md#bw18--ada-and-the-lean-starting-camp). D69 remains the owner of new psychological-law choices. This assignment neither includes nor closes family authoring. [Technical entrypoint](../projects/personal-game-next-batch-tech-design.md#pg02--character-integration-definition).

## PG03 — Readable action discovery

- [ ] Deliver existing context-menu/catalogue/inventory entry points with clear target/tool, relevant commitment information, stable choices and complete permitted discovery under [PG03 acceptance](../projects/personal-game-next-batch-feature-spec.md#pg03--discover-actions-and-understand-their-consequences).
- [ ] Demonstrate ordinary and stale/failure journeys with readable compact layouts and reconcile the scoped parent criteria.

Owners: [AC11](action-capabilities.md#ac11--usability-and-measured-efficiency), [UIUX](ui-ux.md), [DG01/ND13/ND18](needs-design.md#dg01--actions-and-first-encounters). Remapping, broad first-encounter narration and full inventory redesign stay outside this child. [Technical entrypoint](../projects/personal-game-next-batch-tech-design.md#pg03--presentation-definition).

## PG04 — Cheaper action availability

- [ ] Confirm current preview attribution and deliver shared pure prerequisite work where it reduces repeated measured cost, preserving real admission and public results under [PG04 acceptance](../projects/personal-game-next-batch-feature-spec.md#pg04--make-action-previews-cheap-without-changing-admission).
- [ ] Record equivalence, isolated and complete-path measurements with actual progress and host limitations; a disproved hypothesis is a documented no-go, not an invented optimization.

Owners: [PF05](performance.md#pf05--public-view-and-browser-responsiveness), [AC11](action-capabilities.md#ac11--usability-and-measured-efficiency), existing [command/frame follow-up](../projects/shadow-quality-tech-design.md#follow-up-commandframe-spikes-and-physical-lower-end-hardware). Physical-device and larger-load requirements remain open without their evidence. [Technical entrypoint](../projects/personal-game-next-batch-tech-design.md#pg04--prerequisite-evaluation-definition).

## PG05 — First threat encounter design

- [ ] Produce the paired first-threat encounter documents, source-backed missing-mechanism inventory, implementation stages and explicit owner choices in [PG05 acceptance](../projects/personal-game-next-batch-feature-spec.md#pg05--design-the-first-dangerous-encounter).
- [ ] Reconcile the design's references and proposed decisions without implementing combat or marking unresolved policy/runtime tasks complete.

Owners: [BW14](base-world.md#accepted-lifecycle-and-protection-delivery), MP04 in [multiplayer](multiplayer.md), [DG07/ND11](needs-design.md#dg07--human-participation-and-recoverable-conflict), D07/PS-D01 in [decisions](../../archive/05-project/open-decisions.md), and [base-world limits](../limits/base-world.md). PG05 completes when its design/decision package is ready; runtime delivery is a subsequent assignment. [Technical entrypoint](../projects/personal-game-next-batch-tech-design.md#pg05--encounter-design-assignment-definition).

## Integration boundary

After the owner integrates delivery, the ordinary invention/use journey should remain discoverable with PG03 and mechanically identical with PG04. Repeat only evidence affected by the combination; PG02 consumes the same native effects, and PG05 adds no runtime dependency. This is the batch's combined completion condition, not a sixth worker or a new test-writing requirement. Preserve broader parent gaps and update the project status tables according to the documentation policy.
