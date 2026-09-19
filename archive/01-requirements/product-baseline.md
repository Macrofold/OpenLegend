# Open Legend — product baseline

Status: **user-stated direction**, transcribed and organized from the [original brief](../00-source/original-brief.txt) and [design follow-ups](../00-source/design-followups.md). Created September 18, 2026 (America/New_York); updated for wilderness, accelerated time, grounded pixel art and the accepted PlayCanvas/custom-simulation direction. Documentation only; no game implementation has been approved or performed.

This document records what the creator asked for. It does not turn every aspiration into a first-release commitment. Recommendations live in `03-design-proposals/`; optional extensions live in `04-ideation/`; delivery and unresolved choices live in `05-project/`.

## Product premise

Open Legend is a persistent, shared simulation that people enter as embodied characters. Autonomous residents have physical needs, emotions, personalities, memories, relationships, and limited perception. They pursue lives, not just dialogue trees. Players inhabit the same world and influence it through movement, conversation, ordinary actions, and open-ended requests.

The central promise is **a world that remembers people and learns new ways to interact as it is played**. A player inventing a plausible trap should potentially add a reusable capability to the world. That is an aspiration for extensible simulation, not a promise that any sentence becomes reality.

There need not be a victory condition. Survival, companionship, discovery, collaboration, conflict, and the histories people create can provide purpose. Combat is possible, but the brief does not establish combat as the main activity.

The starting world is now a primitive wilderness group with some survival knowledge, accessible resources and possessions, before a village exists. Agents may live or die as they learn and act; universally forgiving NPC needs are not required. Gathering, eating, resting and other selected survival fundamentals should be seeded mechanics. The creator wants accelerated time and god controls to change its rate. One real hour per 24-hour day is a proposed tuning example, not a final rate.

## Status vocabulary

| Label | Meaning |
|---|---|
| Required direction | Explicit product intent in the brief; implementation details remain open |
| Preference | A favored approach with alternatives explicitly welcomed |
| Long-term aspiration | Desired possibility; not evidence of feasibility or a launch commitment |
| Research request | A question the archive must investigate |
| Proposed | Assistant recommendation requiring a future product decision |

## Traceable requirements

| ID | User-stated requirement | Status | Design home |
|---|---|---|---|
| F01 | Web-accessible simulator with accounts/login and human and autonomous characters sharing an interactive world | Required direction | [Architecture](../03-design-proposals/system-architecture.md) |
| F02 | Each character has physical and mental needs that change and motivate action | Required direction | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F03 | Body parts, injuries, sickness, healing, hunger, fatigue, aging, frailty, and death | Required direction, expandable depth | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F04 | PG intimacy, reproduction, pregnancy, birth, and growing populations | Required direction; release timing open | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F05 | Many emotional dimensions, summarized into legible composite displays | Required direction, gradual depth | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F06 | Durable, capacity-limited memories with selective forgetting and dream-like consolidation | Required direction | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F07 | Personalities established at creation and changed by experience; research-informed framework | Required direction | [Human models](../02-research/human-models-and-memory.md) |
| F08 | Agents know only what they perceive or learn; visibility, hearing, and touch matter | Required direction | [Architecture](../03-design-proposals/system-architecture.md) |
| F09 | Agents independently think and act, with state, beliefs, personality, and surroundings shaping decisions | Required direction | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F10 | Cheap ordinary behavior; event-triggered reasoning and variable thinking effort | Required direction; routing design open | [Jev research](../02-research/jev-and-semantic-routing.md) |
| F11 | Free-form dialogue and contextual requests such as right-click → interact → type anything | Required direction | [Interaction protocol](../03-design-proposals/interaction-protocol.md) |
| F12 | Semantic interpretation of interactions unless an applicable known mechanism already exists | Required direction | [Interaction protocol](../03-design-proposals/interaction-protocol.md) |
| F13 | Parameterize, categorize, and reuse interaction mechanisms when relevant conditions match | Required direction | [Interaction protocol](../03-design-proposals/interaction-protocol.md) |
| F14 | Generate new capabilities during play; retain validated reusable definitions | Required direction, ambitious delivery | [Capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md) |
| F15 | Effects can change arbitrary typed attributes over time, subject to conditions, with state-dependent assets | Required direction | [Interaction protocol](../03-design-proposals/interaction-protocol.md) |
| F16 | Generate missing effects/assets eventually, reuse existing assets immediately where possible | Long-term aspiration | [Engine/art research](../02-research/engines-art-and-audio.md) |
| F17 | Items combine structured properties and descriptive meaning; clothes, tools, armor, weapons possible | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F18 | Resources, free negotiation, trading, currency, crafting, construction | Required direction; seeding detail open | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F19 | Institutions, cooperation, governance, and technology can emerge without a prescribed civilization path | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F20 | Creator can introduce entities, scenarios, and new systems through a separate god mode | Required direction | [Capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md) |
| F21 | Ordinary players learn about NPCs by observing/interacting, not reading private state | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F22 | Agent actions leave nearby people time to react; useful local event explanations | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F23 | Player characters share the state model, with forgiving death/revival and other quality-of-life rules | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F24 | Phones support calls and texts to actors, including other humans | Required direction | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F25 | Beautiful, detailed pixel art with 3D structure and modern atmosphere in a browser; avoid an overly cartoony treatment; initially minimal physical simulation | Accepted visual direction from V02; camera and production details open | [Visual direction](../03-design-proposals/visual-direction.md), [engine/art research](../02-research/engines-art-and-audio.md) |
| F26 | Thousands of simultaneous players overall, bounded sectors with entry queues if needed | Scale aspiration | [Hosting research](../02-research/hosting-and-scale.md) |
| F27 | Spatial voice, speech input, voiced NPC replies, overhead text | Required direction, staged delivery | [Engine/art research](../02-research/engines-art-and-audio.md) |
| F28 | Free tier with limited expensive actions; paid tiers, areas, or character slots worth exploring | Business direction; packaging undecided | [Business ideas](../04-ideation/business-and-future-directions.md) |
| F29 | Explore impact beyond entertainment and possible advertising | Research request | [Business ideas](../04-ideation/business-and-future-directions.md) |
| F30 | Simplest useful implementations, existing libraries/tools/APIs, modular replacement, aggressive 80/20 sequencing | Required delivery principle | [Roadmap](../05-project/roadmap.md) |
| F31 | Many concurrent agent reasoning/speaking/dreaming jobs sharing consistent world state | Required architecture property | [Architecture](../03-design-proposals/system-architecture.md) |
| F32 | Research RimWorld thoroughly, comparable games, psychological models, engines, art, hosting, and Jev/typesafe.ai | Research request | [Research index](../02-research/source-guide.md) |
| F33 | Organized archive separating baseline, proposals/ideation, research, decisions, tasks, and implementation status | Current deliverable | [Archive index](../README.md) |
| F34 | Do not implement yet | Current explicit constraint | [Implementation status](../05-project/implementation-status.md) |
| F35 | Start with a primitive wilderness society, before a village exists | Accepted follow-up direction | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F36 | Seed some survival knowledge, accessible resources and possessions | Accepted follow-up direction; exact content open | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F37 | Allow consequential NPC survival and death; no requirement for artificially forgiving initial needs | Accepted follow-up correction; player recovery remains separate | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F38 | Accelerated time across work, needs, environment and aging; creator/god can change speed during play | Desired capability; one real hour per game day is provisional | [Time model](../03-design-proposals/time-and-simulation-speed.md) |
| F39 | Build in fundamental survival mechanics, explicitly gathering, eating and resting | Accepted follow-up direction; additional package details proposed | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F40 | Use PlayCanvas for browser presentation and reuse mature graphics, animation, input, audio and asset infrastructure | Accepted technical direction from V04; version and editor workflow open | [Architecture](../03-design-proposals/system-architecture.md), [engine research](../02-research/engines-art-and-audio.md) |
| F41 | Own an independent custom simulation and generative-rule interface, able to advance without rendering; preserve control over mechanics, time and persistence | Accepted architectural direction from V04; detailed implementation and G2 runtime open | [Architecture](../03-design-proposals/system-architecture.md), [capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md) |

## What this baseline does not settle

PlayCanvas and ownership of an independent simulation are accepted planning choices. No engine version, hosted-editor subscription, provider, database vendor, subscription price, server capacity, specific psychological theory, model vendor, release date, or staffing assumption is agreed. The wilderness and grounded pixel-art directions are accepted; camera freedom, art pipeline, exact population, inventories, survival rates, clock multiplier and biological-aging policy remain open. Neither “thousands online” nor “100 emotions” determines the correct first release. No conclusion that Jev meets production needs should be read into the brief.

“Generative” has several distinct meanings: dialogue, decisions, compositional mechanics, genuinely new executable logic, art, and world layout. Each has a different cost, validation burden, and latency. The archive evaluates them separately while preserving the eventual combined vision.

The phrase “entirety of their state” establishes that all relevant systems should influence behavior. It need not mean placing every historical memory and body-part record in every language-model prompt. The proposed implementation uses summaries and retrieval while letting urgent underlying state constrain decisions.

## Product tensions to resolve explicitly

1. **Freedom versus shared consistency.** A first-time invention must be creative without allowing an arbitrary sentence to mint resources or change another player's body.
2. **Life simulation versus player availability.** Hunger, aging, pregnancy, offline time, and revival need a common clock and absence policy.
3. **Mystery versus explainability.** Players deserve causal feedback without access to NPC thoughts or unseen events.
4. **Persistence versus correction.** A broken mechanic can be disabled; historical injuries, trades, and memories may need compensating changes rather than rewinding the shared world.
5. **Accessible resources versus guaranteed survival.** Seed usable opportunities and knowledge while allowing depletion, mistakes, conflict and death; do not turn accessible resources into automatic subsistence.
6. **Novelty versus affordability.** Paid usage can fund exploration without making ordinary subsistence or human safety dependent on an LLM quota.
7. **Simulation breadth versus a compelling first hour.** One resident who remembers a promise is more valuable initially than dozens of unobservable internal meters.

The [decision register](../05-project/open-decisions.md) tracks these tensions. Proposed defaults are working hypotheses, not retroactive agreements.
