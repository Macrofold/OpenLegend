# Product designs for groups 21–25

| Status      | Current progress                                                                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Ordinary-session pacing is clarified on the parent branch; the five product designs are being developed sequentially from current sources. | 2026-10-06   |

## Assignment and baseline

Complete the next five groups in [Needs design](../maintainers/needs-design.md), one at a time: DG21 injury, illness and useful care; DG22 durable agreements and a small world economy; DG23 characters changed by experience; DG24 text messages inside an authored world; and DG25 deliberate corrections and shared restoration. Follow the owner's original five-group instructions: detailed product behavior, complete human and resident journeys, meaningful failures and recovery, primary-source web research, economic and performance reasoning, staged capabilities, and a final critique centered on enjoyable play. Technical designs and runtime implementation are explicitly outside this assignment.

The first branch, `codex/product-design-groups-16-20-20261006`, received the requested pacing clarification in commit [`ad4ba6267ff5225ee6c513e6e7016962d274ebef`](https://github.com/Macrofold/OpenLegend/commit/ad4ba6267ff5225ee6c513e6e7016962d274ebef). DG02 now explicitly identifies ordinary human reading, composition and AI waiting alongside food, rest, work and company; CE05 carries the corresponding open qualification. It chooses no new rate, automatic feeding or pause policy and preserves every existing acceptance state.

The new branch is **`codex/product-design-groups-21-25-20261006`**, created from that exact parent commit at the owner's request. Source work uses `/workspace/scratch/8a4f6bbf65a4/openlegend-design-21-25`, a separate mirror rather than a switched Git checkout or worktree. No rebase, merge, main-branch mutation or history rewrite is part of the assignment.

Current GitHub `main` was separately inspected at [`0a3ab79b7a698a7f1941dc23722f89220d1ba425`](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). It contains newer first-threat, player danger/death/scar treatment and adventure design work that the parent branch does not yet contain. The proposals consume the newest relevant meaning and evidence, with pinned source references and explicit integration prerequisites; inspecting it does not merge its runtime into this branch. Refresh current sources for each domain and before completion, rather than describing the older parent runtime as current main.

## Product rules and scope

The task changes **zero runtime logic lines**. It has substantial product coordination risk: conflating bodily healing with death recovery; making agreements manufacture resources or consent; turning interpretation into false memory; exposing remote/private messages; and rewinding current permissions or real accounting with fictional history. The [engine/world boundary](../engine-and-world-boundaries.md), [feature-documentation rules](../feature-documentation.md), [gameplay priorities](../repertoires/gameplay-priorities.md), and root instructions govern every proposal.

Begin with an activity worth doing and its actual payoff. Separate a complete smaller delivery from optional later families. Correctness, privacy, identity, actual resources, interruption, current-format restoration and truthful failure apply to every enabled capability. Scarcity, uncertainty, danger and loss can be worthwhile when they create desired stakes; they are not automatically required or automatically undesirable. Do not create a chore simply to justify another mechanic.

Keep world-specific materials, rates, effects, opportunities and wording with authored content. State which existing behavior is implemented, which target has been accepted, which choice is a new proposal, and which evidence remains unperformed. Preserve independent characters, permitted knowledge and real chosen actions; no hidden fallback or narration can stand in for a resident's consent or completed life. A proposed disposition of an open choice is not adoption of a runtime or commercial policy. Resolve any actual decision requiring the owner's input before dependent work.

## Sequential work and ownership

| Group | Product question                                                                                                                             | Existing responsibilities to reuse                                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DG21  | How can someone recover from a survived encounter or receive useful willing help, with clear remaining limitations?                          | ACT/BW bodily effects, current death/scars, native work, shared state, items, perception, participation and time. Choose a useful condition/care activity before anatomy or disease breadth.  |
| DG22  | What modest arrangement remains useful across sessions, and what do acceptance, changing terms, delivery, default and release actually mean? | Existing reciprocal exchange/agreement lifecycle, BW17/D64 commitments, INV-20, PO custody, shared state and D11/D18. Currency and larger institutions are selected only for a concrete need. |
| DG23  | How can an experience influence a particular person's later interpretation and conduct without inventing events or forcing their choices?    | ACT07/ACT08, CE, CR06/CR09, memory/provenance, current reflection, correction/forgetting and D14/D59. Early compelling characters remain independent of later transformation.                 |
| DG24  | How does a character obtain and use a real remote-text affordance, reach a known recipient and understand delivery or failure?               | NC/MP identity, world-authored capabilities, private communication and D48. Local hearing, remote messages and human account metadata remain distinct; voice/calls are later DG26.            |
| DG25  | When should a change add an attributed correction, and when may an authorized shared world actually return to an earlier point?              | D60/D66, HE speech, SL10, memory/narration, source erasure, data/privacy and non-rewindable permissions/accounting. Correction and restoration must be independently selectable.              |

For each group, read its linked proposals, present contracts, current implementation and verification evidence; inspect relevant repertoire priorities; research primary sources; choose and explain a complete product proposal; critique its burdens and alternatives; then reconcile the queue, focused delivery and limit owners. Commit that group's design before drafting the next. Parallel readers may audit or research the current group; preliminary source mapping for later groups does not change the sequential drafting requirement.

## Completion and verification

### Group 22 completed product design

[Agreements worth coming back to](durable-agreements-feature-spec.md), its [world profile](../worlds/base/durable-agreements.md), [INV-20.5a–f delivery](../maintainers/inventions-and-world-evolution.md#dg22--durable-commissions-and-small-cooperation) and [DA limits](../limits/durable-agreements.md) are complete product proposals, supported by nine primary research records. Review retains PX02’s independent immediate barter, current cheap production, no first currency/default deadline, exact remaining claims and owner-local knowledge. Advance and association are independent later selections; D11/D18/D64 adoption and all runtime qualification remain open. The group was reconciled and committed before drafting DG23.

### Group 21 completed product design

[Recovery and care](recovery-and-care-feature-spec.md), its [world profile](../worlds/base/recovery-and-care.md), [CARE tracker](../maintainers/recovery-and-care.md) and [limits](../limits/recovery-and-care.md) are complete product proposals. Eight primary research records informed the design. Review removed a compulsory supply cost from ordinary camp recovery, separated field convenience and willing assistance, and preserved scar/need/death consequences. Current death's need-reset incentive is explicitly retained for existing pacing/mortality review. The group was committed before the next group's drafting; all technical/runtime claims remain open.

Commit changes at least every **five minutes** while task edits remain uncommitted, labeling unfinished checkpoints accurately. Preserve existing useful research, scenarios, IDs, acceptance states and history. Update existing product owners rather than creating competing specifications; create focused owners only for newly scoped responsibilities. Keep technical/runtime work and unperformed play qualification open.

The assignment completes when all five product proposals and their required authored profiles are comprehensive, citations support their claims, material review findings are resolved or accurately retained by the proper existing owner, staged dependencies serve worthwhile play, maintained records agree, and all work is committed. The final review specifically compares player effort, latency, recurring model/operation cost, storage growth, failure recovery and the reason to continue against a simpler adequate experience.

Required documentation verification is the full affected-diff review, checked research attribution, retained IDs and acceptance, relative links and changed-heading references, moved-project references, exact preservation of prior changelog history, pinned formatting of changed Markdown and committed-content comparison. No game, browser, paid-provider or load experiment is required or claimed for this product-only assignment. Existing implementation evidence retains its recorded limits.

## Maintained records

- Design queue: [Needs design](../maintainers/needs-design.md).
- Delivery navigation: [Maintainer index](../maintainers/README.md).
- Previous completed design assignment: [Product designs 16–20](completed/product-design-groups-16-20.md).
- Feature-specific product, world, tracker and limits links are added as each sequential design is completed.
