# Product decisions that determine the eventual architecture

[Research index](README.md) · Discussion aid, not a second decision register. Existing decisions remain in [open decisions](../../05-project/open-decisions.md) and their canonical specifications. The options here are not implicitly accepted by adding this report.

## Do not reopen decisions already made

D03 already selects a coherent accelerated clock, personal hidden-tab policy, a shared-world **Continue while unattended** toggle, all-player absence behavior, manual/operator/storage pause precedence and no server-downtime catch-up. The remaining questions include load/rate limits, disconnect grace, conversation pacing, aging and disconnected-character exposure. Implementing that shared-world target is different from selecting it.

D14 already specifies the memory direction, including raw eligibility, consolidation and protected commitments. More storage does not grant a character cold personal recollection or reverse forgetting. D19 retains optional cross-world transfers; D20 owns runtime script isolation; D22 owns sector density and crossings; D58–D60 cover durability, retention/retry and save policy. Consult those owners before turning the discussion below into new work.

## Decide before the relevant promise becomes public

The goal is not to settle every future feature now. It is to identify which promises would force expensive semantic migrations later. A deployment tool can be replaced behind an interface; changing what it means to be the same person, own an item or remember a secret is much harder.

| Question | Material options or residual choices | Architectural consequence | When an explicit answer is needed |
|---|---|---|---|
| What do millions of players share? | Independent worlds, connected worlds, one persistent universe, or a mixture | Placement, global state and cross-world protocols | Before a global topology promise; preserve current independent-world seam |
| How many must interact in one place? | Local groups, very large interactive crowds, or separately authorized spectators | Fanout, collision, interaction semantics and admission | Before a single-scene capacity promise; D22 |
| How does accepted unattended behavior operate safely? | Toggle implementation, disconnect grace, character exposure and measured load limits | World-hours cost, due scheduling, cold wake and offline loss | Before persistent hosting; do not replace D03 |
| How do future coupled regions share time? | Existing world clock versus explicitly reviewed independent timelines or overload behavior | Cross-region causes, appointments and fairness | Before sector clocks or time dilation; no change selected here |
| Can resources or characters move between worlds? | No transfer, identity-only travel, restricted exports, or conserved trade | Escrow, ownership transfer, lineage and replay protection | Before transfer or marketplace features; D19 |
| Can a player restore a shared world? | Coordinated whole-world rewind, private forks, constrained restoration or restricted ordinary rewind | Other players' progress, external effects and erased data | Before hosted save/load exposure; D60 |
| Which offstage detail is sacred? | Individual history, exact aggregate consequences, or explicitly approved statistical approximation | What can be suspended, summarized or replaced by a surrogate | Before behavior-changing simulation level of detail |
| How are memory budgets tuned without changing meaning? | Existing accepted continuity and eligibility, with measured route/storage limits | Source storage, summary quality, index growth and erasure | Before changing limits or retention; D14 |
| What does a distant observer learn? | Graded sensory detail; separately authored broadcast/spectating media | Interest queries, identifiers, media and acquisition | Before expansive views, voice or spectator modes |
| What can creators extend beyond current families? | New trusted capabilities or a later isolated script mechanism | Complexity admission, compatibility, permissions and safety | Before broadening the current extension boundary; D20 |
| What does a successful action acknowledgment guarantee under failure? | Preserve current explicit-commit policy; qualify the chosen hosting/replication topology | Commit path, replication, crash-loss window and UI | Before external reliability or economy promises; D58 |
| Where do global users meet? | Regional worlds, a selected home region per group, or explicitly coordinated cross-region interaction | Latency, durability placement, travel and fairness | Before globally shared synchronous gameplay |

## Three decisions with unusually large consequences

### Shared identity across copied or instanced scenes

A unique character cannot independently accumulate incompatible authoritative histories in two instances while remaining one person without a reconciliation policy. A fork can preserve origin while being a distinct world/person timeline. A projection can depict one authority in multiple views without multiplying its mutable state. These are different products.

Preserve lineage and placement-independent IDs now. Do not require an instance service now. Before copying a persistent scene, define ownership, memories, resources and what participants are told about the copy. The WoW example motivates separating placement from social identity; it does not supply this game's character-continuity policy. [S09](sources.md#s09)

### World restoration after resources or information escape

Once a traded item leaves a world, restoring an older snapshot must not make another independently exportable copy unless duplication is an explicit game mechanic. Once a human reads speech, restoration cannot make them unread it. Once a paid request executes, fictional time cannot reverse its invoice.

Possible boundaries include isolated economies, irreversible external export receipts, coordinated restoration across a defined aggregate, and explicit new forks. Choose before enabling exports; keep operation identities and external accounting separate today.

### Rich individual lives versus aggregate offstage simulation

An exact dormant-state calculation and a statistical replacement are not equivalent. The former may preserve every relevant transition; the latter can lose a particular person's encounter or choice. Cheap aggregate simulation can be valuable, but it should not silently change a promise that every named agent lives a continuous individual life.

A plausible compromise is exact identity and protected obligations everywhere, with only explicitly abstract mechanics using a coarser representation. Whether that meets the product's vision is Mike's decision. The research supplies costs and experiments, not permission to choose it on his behalf.

## Decisions that can remain reversible longer

Keep transport, host, database adapter, vector implementation and numerical worker technology behind actual semantic interfaces. This need not mean a generic vendor abstraction framework. Introduce an interface around the behavior that already exists: scoped query, bounded task, authoritative commit or renderer projection.

The current single-writer/PostgreSQL direction is compatible with later measured growth. A microservice layout, global SQL vendor, ECS library or Kubernetes operator need not be chosen merely to answer these product questions.

## A practical decision record

When a choice becomes necessary, record one concrete scenario, the supported promise, alternatives, invariants, cost/failure implications, reversible parts, migration consequences and the acceptance evidence. Place the accepted result in its canonical owner and reference existing task IDs.

For example, implementing the accepted unattended setting should account for outstanding fires, appointments, incoming messages, paid jobs and reconnect. “Millions of agents” should specify active fraction, actual decision rate, per-agent history and latency. “One universe” should specify economic and causal coupling rather than only a shared world name.

## Recommended immediate discussion

Confirm the **first hosted multiplayer world's** account/control and restoration slice, implement the accepted pause/unattended policy, and resolve only its remaining exposure/load questions. Preserve the path to several future topologies without committing to seamless planetary simulation now. The [NOW foundation guide](now/foundations.md) identifies useful work that remains correct across these alternatives.
