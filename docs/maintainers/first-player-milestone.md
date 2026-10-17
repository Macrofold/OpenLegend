# Next delivery: a worthwhile first Open Legend session

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The next-work sequence is selected; the integrated player journey, unfamiliar-player observations and matched performance/cost evidence remain open. | 2026-10-17 |

## Selected direction and ownership

Mike requested this reconciliation after reviewing the gap between the game's priorities and its next assignments. **The next milestone is to finish, observe and improve one complete browser-playable experience, not to port the engine or expand every prepared design.** Preserve useful invention, an independently choosing character and a consequence worth revisiting within that experience. This is the coordination entry point for the existing P1 milestone, not a replacement feature specification or a second list of subsystem implementation tasks.

The [first-playable specification](../../archive/05-project/first-playable-mvp.md) retains functional and live-provider acceptance. [Gameplay priorities](../repertoires/gameplay-priorities.md) and [whole-game coverage](../repertoires/coverage.md) retain the required player value. The [roadmap](../../archive/05-project/roadmap.md) owns milestone sequencing. [ND26/DG03](needs-design.md#nd26--a-bounded-commercial-test-and-repeatable-product-demonstration) supplies audience-learning preparation; a paid commercial test is a separate later decision. Existing feature trackers continue to own their tasks, evidence and unresolved acceptance.

## What is selected next

| Sequence | Complete outcome | Existing owners and evidence boundary | Current state |
| --- | --- | --- | --- |
| 1. Establish the integrated baseline | Play the current intended starting world without god-mode shortcuts; record the player's goal, choices, result, next opportunity and exact points of confusion, waiting or failure. | P1, PG01–PG05 in [Personal game](parallel-batch-03-personal-game.md), [Batch 05](parallel-batch-05-adventure-defense-and-home.md), [Batch 06](parallel-batch-06-rivals-and-contested-ground.md), and the [playtest protocol](../verification.md). Reuse delivered mechanics and valid evidence. | Open; this documentation update did not run the game. |
| 2. Close actual blockers to that session | Fix or finish only the interactions, reliability, resident follow-through, opposition/payoff or content integration preventing the selected journey from working and being understandable. | Route each concrete finding to its current UIUX/AC, INV/WW, CE/AG/CR, CF/AV, MP/SL or PF owner through the [index](README.md). Read the integrated state before declaring an old task missing. | Awaiting baseline findings; no new blanket feature assignment. |
| 3. Observe unfamiliar players and revise | Observe whether players can pursue a wanted goal, notice a useful distinctive possibility, understand the outcome and choose another activity or return. Record coaching and contrary evidence. | ND26/DG03 and the player-value evidence in the first-playable specification. Report observations separately from engineer opinion, functional correctness and commercial validation. | Open; no recruitment, consent, participant schedule or findings are claimed. |
| 4. Attribute performance and operating cost | Measure the same journey's client frame stalls/loading/memory, server progress and dense interactions/history, network delay/traffic, and live AI wait/cost. Compare a busier scene and longer-lived world separately. | [PF](performance.md), [performance contract](../performance.md), SW, and [PD](production-deployment.md). Existing capacity gates remain open unless their actual workloads pass. | Open; no new FPS, population capacity or cost result. |
| 5. Select the next investment from evidence | Improve the weakest required part, proceed to an appropriately protected invitation-only pilot, or authorize a bounded engine/tooling comparison for a named obstacle or credible production advantage. | [Platform decision](../projects/completed/platform-and-offline-decision-brief.md), ND34, PD, and the [engine comparison protocol](../../research/game-engines/benchmark-plan.md). | Conditional; no migration, new platform or paid launch approved here. |

These are outcome gates, not a requirement to wait for every large-scale qualification before a supervised first playtest. Performance attribution can run alongside session improvements. Serious privacy, loss of progress, authorization or real-spending defects take precedence over additional content.

## Selecting design and implementation work

For the next assignment, name the player-visible failure or wanted activity, the existing owning task, what is already integrated, the smallest complete remaining change, and the evidence that will close it. Do not automatically choose the newest design, the next numbered batch or the easiest adjacent subsystem. A document in an unmerged branch is not an integrated dependency; verify its exact status before using it.

The [design register](needs-design.md) remains a catalogue of readiness, not a ranked implementation queue. Create a new design only when a concrete missing behavior or unsettled consequential choice prevents the selected session; reuse existing designs otherwise. This sequencing does not cancel separately authorized work, erase broader ambitions or declare all current functionality adequate. Further societies, platforms, marketplace features and visual pipelines must earn a selected place rather than become hidden prerequisites for this milestone.

The ordinary route must remain useful. Do not force every player to invent, make all cooperation succeed, or script an NPC's choices to guarantee a demonstration. Routine movement, inventory and known actions should not require unnecessary natural-language negotiation. Live invention must produce usable admitted behavior, not a generated name alone.

## Player evidence and safe operation

An initial small qualitative group is for finding comprehension, usefulness and interaction problems, not estimating market retention. The earlier suggestions of roughly 30 minutes and six to ten participants remain planning examples, not accepted hard limits or success thresholds. Exact participants, consent/data handling, operator, device tier, spending cap and observation format must be settled before the corresponding execution. No outreach, purchases or collection of private participant information is authorized by this document.

Supervised observation is distinct from hosting an invitation-only service, public release or collecting payment. Each route retains its actual privacy, recovery, access, spending and [content/companion safety](../agent-content-and-companion-safety.md) obligations. Broader PD release requirements are not waived, but commercial-offer implementation is not a prerequisite to ordinary player learning.

Record the initial baseline, improvements, failures, human observations and measurement limitations in an appropriate topic under `docs/verification/` when that work occurs. Do not create a report that implies those runs already happened. Keep detailed remaining work in its existing tracker, with this page coordinating only the milestone.

## Engine and AI-tooling gate

The current browser/PlayCanvas decision stands. A native comparison may be justified by required visual/device capability, sustained performance, or credible evidence that another engine substantially reduces future authoring and verification work. It need not wait for an absolute browser impossibility, but a popularity spike or an attractive demo alone is insufficient.

Godot's AI-assisted development ecosystem deserves a serious productivity comparison when selected; [the community and AI research](../../research/game-engines/godot-community-and-ai-2026.md) separates adoption evidence, tool claims and measured agent results. Compare time to an accepted, inspected and recoverable change, including human correction and setup, not time to first generated code. No MCP tool receives production authority or permission to spend merely because it can operate an editor.

## Completion and current limits

This milestone completes only when the selected complete journey, applicable functional/live-provider checks, actual player-value observations and relevant responsiveness/cost evidence are recorded with their limitations. Documentation readiness is not milestone completion. No new runtime work, playtest, provider call, native prototype or capacity measurement was performed in this reconciliation.
