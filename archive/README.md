# Open Legend — research and planning archive

Created September 18, 2026 (America/New_York); web research continued into September 19 UTC. Updated for wilderness, native survival, accelerated time, Macrofold/memory, and the accepted PlayCanvas/custom-simulation and grounded pixel-art direction. **Documentation only: no game implementation, assets, accounts, or deployment.**

Open Legend is a shared world of embodied people and autonomous residents whose needs, memories, emotions, and relationships shape their lives—and whose available interactions can grow through play.

## Start here

1. [Recommended direction](03-design-proposals/overview.md) — direct answers to the central questions and a proposed small starting stack.
2. [Master map](master-map.md) — how every feature connects to systems, research, and delivery.
3. [Roadmap](05-project/roadmap.md) — the smallest useful releases and evidence required to expand.
4. [Open decisions](05-project/open-decisions.md) — choices still belonging to the creator.

The accepted starting direction is a primitive wilderness group with survival knowledge, accessible resources and possessions, before a village exists. Basic survival mechanics are built in, and NPCs can live or die through their choices and circumstances. Accelerated time and creator speed controls are wanted; one real hour per game day remains a tuning candidate. **PlayCanvas is the accepted browser-engine direction, with an independent custom simulation and generative-rule interface.** The visual target is beautiful grounded pixel art with 3D structure and modern atmosphere. Reuse engine infrastructure while owning mechanics, time and persistence; keep simulation runnable without graphics. The proposed capability library starts with validated recipes/effects before new executable algorithms. Camera/editor/asset details and other technology choices remain open.

## Archive structure

| Location | Purpose | Documents |
|---|---|---|
| `00-source/` | Preserve the requests | [Original brief](00-source/original-brief.txt); [design follow-ups](00-source/design-followups.md) |
| `01-requirements/` | User-stated direction, separate from recommendations | [Product baseline and F01–F41](01-requirements/product-baseline.md) |
| `02-research/` | Verified external evidence, attributed limits and comparisons | [Source guide](02-research/source-guide.md); [games](02-research/games-and-emergence.md); [human models](02-research/human-models-and-memory.md); [Jev](02-research/jev-and-semantic-routing.md); [engines/art/audio](02-research/engines-art-and-audio.md); [hosting/scale](02-research/hosting-and-scale.md) |
| `03-design-proposals/` | Concrete proposals implementing accepted directions; details remain open | [Overview](03-design-proposals/overview.md); [visual direction](03-design-proposals/visual-direction.md); [survival baseline](03-design-proposals/survival-baseline.md); [time and speed](03-design-proposals/time-and-simulation-speed.md); [architecture](03-design-proposals/system-architecture.md); [interaction protocol](03-design-proposals/interaction-protocol.md); [capability lifecycle](03-design-proposals/generative-capability-lifecycle.md); [agents](03-design-proposals/agents-and-social-simulation.md); [world/player experience](03-design-proposals/world-and-player-experience.md) |
| `04-ideation/` | Optional directions and unvalidated business hypotheses | [Business and future directions](04-ideation/business-and-future-directions.md) |
| `05-project/` | Running project records | [Roadmap](05-project/roadmap.md); [decisions](05-project/open-decisions.md); [research backlog](05-project/research-backlog.md); [implementation status](05-project/implementation-status.md) |

## Reading paths

**Generative architecture:** overview → interaction protocol → capability lifecycle → Jev → system architecture.

**Character depth:** games → human models → agents → world/player experience.

**Persistent minds and Macrofold:** [workspace comparison and costs](02-research/macrofold-workspaces.md) → [memory storage and retrieval](03-design-proposals/memory-storage-and-retrieval.md) → [shared-worker adoption comparison](03-design-proposals/macrofold-shared-workers.md) → D14/D28 and R11/R19. Rich per-NPC memory is desired; Macrofold for ordinary reasoning is conditionally preferred if efficient pooled execution is available or worthwhile to build. Adoption remains open.

**Broader Macrofold integration:** [AI workflows and world state](03-design-proposals/macrofold-ai-workflows-and-world-state.md) → D28/D30 and R20. Proposed reusable typed inference, structured resources and workflow infrastructure; Open Legend defines game semantics and validates changes. Physical storage can be provided by Macrofold.

**Updated starting society and pace:** survival baseline → time and speed → roadmap → D01/D03/D26/D27 in the decision register.

**Accepted visual and engine direction:** [visual brief](03-design-proposals/visual-direction.md) → [PlayCanvas evidence](02-research/engines-art-and-audio.md) → [custom-simulation boundary](03-design-proposals/system-architecture.md#own-the-simulation-reuse-engine-infrastructure) → D02/D29 and R01/R02. Editor subscription, exact camera and asset workflow remain open.

**Deployment choices:** hosting/scale → open decisions → research backlog.

**Next planning session:** roadmap → D01–D04 in open decisions → implementation status.

## How to maintain the archive

The original brief stays unchanged. The baseline distinguishes required direction, preferences and aspirations. Assistant recommendations stay marked proposed until accepted. New ideas do not become tasks automatically. Research uses primary sources where available and distinguishes vendor claims, historical findings, original analysis and unrun experiments.

When accepting a decision, record date and rationale, update the relevant proposal, and link evidence. When implementation begins, update status only after concrete work and verification. The [status page](05-project/implementation-status.md) is the source of truth about what exists; the [research backlog](05-project/research-backlog.md) is the source of truth about what remains untested.
