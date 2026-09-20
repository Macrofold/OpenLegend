# Open Legend — research and planning archive

Created September 18, 2026 (America/New_York); web research continued into September 19 UTC. Updated for wilderness, native survival, accelerated time, Macrofold/memory, and the accepted PlayCanvas/custom-simulation and grounded pixel-art direction. This archive began as documentation-only planning. The prototype now exists; [implementation status](05-project/implementation-status.md) owns delivery evidence. Proposed systems and dated research are not live acceptance.

Open Legend is a shared world of embodied people and autonomous residents whose needs, memories, emotions, and relationships shape their lives—and whose available interactions can grow through play.

For active task documents and their owning specifications, use the [master TODO and implementation-plan index](../docs/maintainers/README.md).

## Start here

The latest [perception and attention proposal](07-technical-architecture/perception-and-attention.md) documents current sight/hearing and future sensory gradients, distance-specific descriptions, sound events, semantic interests and bounded decision triggers. This addition is documentation only; see [implementation status](05-project/implementation-status.md) for the executable prototype.

1. [Recommended direction](03-design-proposals/overview.md) — direct answers to the central questions and a proposed small starting stack.
2. [Master map](master-map.md) — how every feature connects to systems, research, and delivery.
3. [First playable MVP](05-project/first-playable-mvp.md) and [roadmap](05-project/roadmap.md) — accepted live-AI creative loop, internal checkpoints and evidence required to expand.
4. [Open decisions](05-project/open-decisions.md) — choices still belonging to the creator.
5. [Licensing](../LICENSING.md) — accepted AGPL core, future permissive SDKs, and private-content boundaries.
6. [Creator ecosystem and marketing](06-marketing/README.md) — memberships, mechanics packs, patrons, world history, and the creator fund.
7. [Detailed technical architecture](07-technical-architecture/README.md) — system contracts, context assembly, evolving declarations, and a standalone Macrofold implementation handoff.

For active delivery work, start with the [maintainer work index](../docs/maintainers/README.md). Historical review changes are recorded in the [documentation changelog](../docs/documentation-changelog.md).

The accepted starting direction is a primitive wilderness group with survival knowledge, accessible resources and possessions, before a village exists. Basic survival mechanics are built in, and NPCs can live or die through their choices and circumstances. Accelerated time and creator speed controls are wanted; one real hour per game day remains a tuning candidate. **PlayCanvas is the accepted browser-engine direction, with an independent custom simulation and generative-rule interface.** The visual target is beautiful grounded pixel art with 3D structure and modern atmosphere. Reuse engine infrastructure while owning mechanics, time and persistence; keep simulation runnable without graphics. The proposed capability library starts with validated recipes/effects before new executable algorithms. Camera/editor/asset details and other technology choices remain open.

M10/M11 clarify the first playable: live LLM decisions and NPC conversation, Jev for suitable bounded judgments, actual generated sling crafting, hunting and harvesting/preparing/eating, plus another invention with bow-and-arrow the candidate. Pause/speed controls are required; the initial personal world pauses while the player is away and stops scheduling autonomous AI. See the [MVP agreement](05-project/first-playable-mvp.md); native/no-model and carrying-bundle fixtures are internal checkpoints.

## Archive structure

| Location | Purpose | Documents |
|---|---|---|
| `00-source/` | Preserve the requests | [Original brief](00-source/original-brief.txt); [design follow-ups](00-source/design-followups.md); [open-source/community follow-ups](00-source/open-source-and-community-followups.md) |
| `01-requirements/` | User-stated direction, separate from recommendations | [Product baseline and F01–F61](01-requirements/product-baseline.md) |
| `02-research/` | Verified external evidence, attributed limits and comparisons | [Source guide](02-research/source-guide.md); [games](02-research/games-and-emergence.md); [human models](02-research/human-models-and-memory.md); [Jev](02-research/jev-and-semantic-routing.md); [engines/art/audio](02-research/engines-art-and-audio.md); [hosting/scale](02-research/hosting-and-scale.md) |
| `03-design-proposals/` | Concrete proposals implementing accepted directions; details remain open | [Overview](03-design-proposals/overview.md); [visual direction](03-design-proposals/visual-direction.md); [survival baseline](03-design-proposals/survival-baseline.md); [time and speed](03-design-proposals/time-and-simulation-speed.md); [architecture](03-design-proposals/system-architecture.md); [interaction protocol](03-design-proposals/interaction-protocol.md); [capability lifecycle](03-design-proposals/generative-capability-lifecycle.md); [agents](03-design-proposals/agents-and-social-simulation.md); [world/player experience](03-design-proposals/world-and-player-experience.md) |
| `04-ideation/` | Optional directions and unvalidated business hypotheses | [Business and future directions](04-ideation/business-and-future-directions.md) |
| `05-project/` | Running project records | [First playable MVP](05-project/first-playable-mvp.md); [roadmap](05-project/roadmap.md); [decisions](05-project/open-decisions.md); [research backlog](05-project/research-backlog.md); [implementation status](05-project/implementation-status.md) |
| `06-marketing/` | Positioning, channels and accepted creator/community directions; commercial details open | [Marketing overview](06-marketing/README.md); [positioning/copy](06-marketing/positioning-and-copy.md); [ideas/channels](06-marketing/ideas-channels-and-experiments.md); [open platform/private worlds](06-marketing/open-platform-and-private-worlds.md); [creator economy/packs](06-marketing/creator-economy-and-mechanics-packs.md); [patrons/history](06-marketing/patrons-contributors-and-world-history.md); [token exploration](06-marketing/tokens-and-community-funding.md) |
| `07-technical-architecture/` | Focused future technical designs and service boundaries | [Index](07-technical-architecture/README.md); [current architecture](../docs/architecture.md); [context/inference](07-technical-architecture/context-and-inference.md); [declarations](07-technical-architecture/declarations-and-evolution.md); [Macrofold handoff](07-technical-architecture/macrofold-implementation-brief.md) |

## Reading paths

**Billing visibility (U15):** [small billing menu and detailed LLM/Jev breakdowns](03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown) → [session, historical and arbitrary-period reporting contract](07-technical-architecture/billing-and-usage-reporting.md) → [Macrofold implementation brief](07-technical-architecture/macrofold-implementation-brief.md#billing-reports-for-application-interfaces). See F61/D50 and the [source request](00-source/billing-interface-followup.md). This is documented future behavior.

**Invention governance and player interfaces (U14):** [owner locks, player ownership and complete/free-use world packs](03-design-proposals/invention-governance-and-ownership.md) → [action discovery, typeahead, categories, usage ranking and quick slots](03-design-proposals/playability-and-controls.md) → [durable logs, world-wide creator agent and revision workshop](03-design-proposals/world-agent-and-workshop.md). See [source request](00-source/world-governance-and-controls-followup.md), F53–F60 and D42–D49. These are documented future requirements; the current small right-click menu/journal does not implement them all.

**Generative architecture:** [technical architecture](../docs/architecture.md) → [context/inference](07-technical-architecture/context-and-inference.md) → [declarations/evolution](07-technical-architecture/declarations-and-evolution.md). The earlier interaction protocol and capability lifecycle retain examples and history. Copy the [Macrofold brief](07-technical-architecture/macrofold-implementation-brief.md) for downstream platform implementation.

**World boundaries and manageable growth:** [simulation scope and complexity](03-design-proposals/simulation-scope-and-complexity.md) → [world rules, parameters, and friendly rejection](03-design-proposals/world-rules-and-parameters.md) → D32/D33 and R22. Use coarse consistent systems; distinguish plausible missing mechanics from effects forbidden by the selected world's premise. Exact presets, classifiers, and numeric budgets remain proposals.

**Creating and discovering a world:** [AI-assisted creation and discovery through play](03-design-proposals/world-creation-and-discovery.md) → [state systems and anticipated future influences](03-design-proposals/state-systems-and-future-influences.md) → D12/D39–D41 and R23. Accepted direction: consistent discoveries, substantial defaults, sparse clarification, natural learning, and proactive consideration of undiscovered influences without automatically implementing them.

**Evolving materials and buildings:** [modular construction, script references, and semantic expression](03-design-proposals/evolving-materials-and-construction.md) → [heat, ignition, and growing fire](03-design-proposals/heat-and-fire.md) → D20/D31 and R21. Modular, expandable construction is accepted direction; the exact component schemas, algorithms, script runtime, and spread rollout remain proposals.

**Character depth:** games → human models → agents → world/player experience.

**Persistent minds and Macrofold:** [workspace comparison and costs](02-research/macrofold-workspaces.md) → [canonical memory architecture](../docs/memory-architecture.md) → [shared-worker adoption comparison](03-design-proposals/macrofold-shared-workers.md) → D14/D28 and R11/R19. The accepted design separates immediate cognition, hourly cleanup and required background file reflection. A prototype Macrofold adapter exists; pooled execution and target publication/live acceptance remain open in [CR01–CR12](../docs/maintainers/cognition-redesign.md).

**Broader Macrofold integration:** [AI workflows and world state](03-design-proposals/macrofold-ai-workflows-and-world-state.md) → D28/D30 and R20. Proposed reusable typed inference, structured resources and workflow infrastructure; Open Legend defines game semantics and validates changes. Physical storage can be provided by Macrofold.

**Updated starting society and pace:** survival baseline → time and speed → roadmap → D01/D03/D26/D27 in the decision register.

**Accepted visual and engine direction:** [visual brief](03-design-proposals/visual-direction.md) → [PlayCanvas evidence](02-research/engines-art-and-audio.md) → [custom-simulation boundary](03-design-proposals/system-architecture.md#own-the-simulation-reuse-engine-infrastructure) → D02/D29 and R01/R02. Editor subscription, exact camera and asset workflow remain open.

**Deployment choices:** hosting/scale → open decisions → research backlog.

**Next planning session:** roadmap → D01–D04 in open decisions → implementation status.

## How to maintain the archive

The original brief stays unchanged. The baseline distinguishes required direction, preferences and aspirations. Assistant recommendations stay marked proposed until accepted. New ideas do not become tasks automatically. Research uses primary sources where available and distinguishes vendor claims, historical findings, original analysis and unrun experiments.

When accepting a decision, record date and rationale, update the relevant proposal, and link evidence. When implementation begins, update status only after concrete work and verification. The [status page](05-project/implementation-status.md) is the source of truth about what exists; the [research backlog](05-project/research-backlog.md) is the source of truth about what remains untested.
