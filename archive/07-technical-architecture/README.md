# Technical architecture and Macrofold implementation handoff

Prepared September 19, 2026 from the latest Open Legend archive and the sibling Macrofold (`AgentCloud`) working tree. **Detailed proposals, not implemented systems or finalized technology choices.** Accepted product directions remain in the [baseline](../01-requirements/product-baseline.md), [source follow-ups](../00-source/design-followups.md), and [decision register](../05-project/open-decisions.md).

M10/M11 clarify the accepted release boundary: the [first playable MVP](../05-project/first-playable-mvp.md) includes live LLM decisions/conversation, Jev for suitable semantic judgments, AI-generated tools and a complete sling-hunting-to-food loop, with pause/speed and no unattended progression. The small technical steps below are internal checkpoints; none alone is the promised first playable.

## Read in this order

Start with the [architecture review and delivery plan](review-and-delivery-plan.md) for the critique, changes, S0–S5 implementation sequence, later feature gates and requirement coverage. The documents below contain the revised contracts. The review tightened the initial scope and failure behavior; it did not convert proposed choices into accepted or implemented features.

| Document | What it specifies |
|---|---|
| [System architecture](system-architecture.md) | Modules, authority, storage, transactions, time, product coverage, failure handling, delivery slices and unresolved choices |
| [Production data model](production-data-model.md) | Canonical table families, world-scoped keys, independent entities/inventory/memories, immutable invention versions, evidence, transactions and module ownership |
| [Data queries and MCP](data-queries-and-mcp.md) | Stable datasets and query tools, permissions, consistency, pagination, indexes and world-agent access independent of physical tables/shards |
| [Data delivery and scale](data-delivery-and-scale.md) | SQLite import, implementation phases, retention, recovery, workload budgets, whole-world sharding and the limits of single-world scale |
| [Real-time synchronization](realtime-synchronization.md) | Server queues/batched commits, browser prediction, scoped replication, reconnect, bounded buffering and future transport/journal improvements |
| [Memory architecture](../../docs/memory-architecture.md) | Canonical mind/recall design, 300-entry starting target, semantic attention, cognition tiers, dreams, Macrofold instruction lifecycle and sequenced implementation audit |
| [Context and inference](context-and-inference.md) | Task-specific context contracts, evidence retrieval, memory, missing information, scope, Jev/LLM/agent routing, tools, caching and evaluation |
| [Perception and attention](perception-and-attention.md) | Current sight/hearing audit; proposed gradients, screen/character parity, distance-tier descriptions, sound emissions, semantic interests and bounded decision opportunities |
| [Declarations and evolution](declarations-and-evolution.md) | New properties and mechanisms, state owners, inactive anticipated influences, G0–G3, validation, migration, activation, consistent laws and learned knowledge |
| [Macrofold implementation brief](macrofold-implementation-brief.md) | Standalone downstream implementation instructions, verified current foundations, new execution modes and contracts, four phases and acceptance tests |

Contract ownership: system architecture owns runtime boundaries and player lifecycle; the production data model owns canonical persistence records/transactions, its query companion owns data APIs/MCP, and its delivery companion owns data migration/scale phases. Real-time synchronization owns command/view networking, client prediction, replication and reconnect. Context owns evidence/routing; declarations owns rule execution/admission; the Macrofold brief owns its generic service behavior; the review plan owns the game feature delivery order. Earlier proposal documents remain background/domain references. Update these owners first when a decision changes, then adjust summaries and links.

**For the AI implementing Macrofold, copy the entire implementation brief.** It states the required behavior without requiring that AI to reconstruct this conversation. Local repository links are supporting evidence; the implementing AI should reread its current repository instructions and source. The brief directs future implementation, while this Open Legend task changes documentation only.

The September 19 [perception follow-up](../00-source/perception-and-attention-followup.md) adds F62–F67/D51–D54. Its [subsystem proposal](perception-and-attention.md) owns sensory evidence and attention semantics beneath the context contract, including actor-scoped semantic retrieval and simulated reminders under real-time cost limits. The production data model remains the persistence owner. No perception runtime or Macrofold changes were requested in that follow-up.

The [billing and usage reporting contract](billing-and-usage-reporting.md) adds U15's compact cost interface: separate LLM/Jev accounting, current server-session and historical/custom periods, with a generic Macrofold read API. It depends on durable invocation/ledger evidence, independently of workspace or agent-loop support; it is not implemented by the documentation update.

## Central recommendation

Open Legend owns the simulation, game relevance and perception, personal memory semantics, declaration admission and authoritative commits. Macrofold is the preferred candidate for reusable typed inference, bounded tool-using agents, isolated native-agent work, credentials, budgets, durable execution and diagnostics. A replaceable execution port also supports direct model calls and fixture providers. Shared infrastructure does not give an AI worker authority to change the world.

Context assembly selects a small, versioned evidence package for each task. Ordinary mechanics and arithmetic run in code. Jev is the selected first-playable direction for suitable closed-set semantic judgments, subject to live integration evidence; a single LLM handles bounded generation; agents handle work that actually needs iterative tools or tests. This is a routing decision, not a mandatory chain that invokes every layer.

Interactions can discover missing support, create a reusable declaration, reuse an existing family, or produce a one-off interpretation. A new description need not become a new system. Each changing quantity has an owner; possible future influences remain inactive notes until supported and admitted. Physical laws apply consistently to equivalent objects; actor knowledge can remain local.

## What this updates

This set is the current technical synthesis. The existing [high-level architecture](../03-design-proposals/system-architecture.md), [interaction protocol](../03-design-proposals/interaction-protocol.md), [memory design](../03-design-proposals/memory-storage-and-retrieval.md), [construction](../03-design-proposals/evolving-materials-and-construction.md), [world creation](../03-design-proposals/world-creation-and-discovery.md), [state systems](../03-design-proposals/state-systems-and-future-influences.md), and [time model](../03-design-proposals/time-and-simulation-speed.md) retain domain detail and reasoning. The [creator ecosystem](../06-marketing/README.md) supplies the later private-world, pack and entitlement requirements.

The latest Macrofold inspection also supersedes an earlier startup diagnosis: ready-phase delays, sequential hydration and missing phase timing were improvement candidates in the earlier snapshot; corresponding optimizations now appear in its working tree. Hosted performance is still unmeasured here. Neither warm workers nor context references make provider tokens free.

## Decisions and proof still needed

U14 extends the design with [invention locks, creator ownership and world packs](../03-design-proposals/invention-governance-and-ownership.md), [complete action discovery and configurable controls](../03-design-proposals/playability-and-controls.md), and [durable inspection, a world-wide creator agent and revision workshop](../03-design-proposals/world-agent-and-workshop.md). Those documents own product behavior; this set owns admission, context, persistence, execution and migration contracts. F53–F60 and D42–D49 distinguish accepted direction from proposed parameters and unresolved rights/retention choices. The added requirements are not implemented by the documentation update.

Macrofold adoption, Jev access/workload fit, general LLM/deployment selection, numerical budgets, exact clock/aging, automatic declaration admission, replay/retention policy and the G2 script runtime remain open. Initial absence policy is settled: pause while not playing, with no offline catch-up or autonomous AI scheduling. Definitions and protocol examples are illustrative. Database placement remains replaceable, but transactions, tenancy, version checks and single ownership of each record cannot be replaced with implicit file synchronization.

Begin with the tiny command/observation/fixture-decision seam, then native survival and one real scoped decision; follow with remembered conversation and generated sling/hunting/food plus another supported invention to complete P1; then add one state-family extension/creator flow. Macrofold's first inference slice can be measured independently before adding tool loops or durable tasks. Broad record hosting, a workflow editor, warm native sandboxes and commerce are not prerequisites. The proposed runtime tests and measurements in these documents have not been run.
