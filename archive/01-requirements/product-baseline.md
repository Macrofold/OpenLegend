# Open Legend — product baseline

This file owns high-level product requirements. Canonical design documents define behavior, [Implementation status](../05-project/implementation-status.md) records the current snapshot, and [Open decisions](../05-project/open-decisions.md) contains unresolved choices.

This document records what the creator asked for. It does not turn every aspiration into a first-release commitment. Recommendations live in `03-design-proposals/`; optional extensions live in `04-ideation/`; delivery and unresolved choices live in `05-project/`.

## Product premise

Open Legend is a persistent, shared simulation that people enter as embodied characters. Autonomous residents have physical needs, emotions, personalities, memories, relationships, and limited perception. They pursue lives, not just dialogue trees. Players inhabit the same world and influence it through movement, conversation, ordinary actions, and open-ended requests.

The central promise is **a world that remembers people and learns new ways to interact as it is played**. A player inventing a plausible trap should potentially add a reusable capability to the world. That is an aspiration for extensible simulation, not a promise that any sentence becomes reality.

There need not be a victory condition. Survival, companionship, discovery, collaboration, conflict, and the histories people create can provide purpose. Combat is possible, but the brief does not establish combat as the main activity.

The starting world is now a primitive wilderness group with some survival knowledge, accessible resources and possessions, before a village exists. Agents may live or die as they learn and act; universally forgiving NPC needs are not required. Gathering, eating, resting and other selected survival fundamentals should be seeded mechanics. The creator wants accelerated time and god controls to change its rate. The accepted base is one game minute per real second (60:1), with 0.5×/1×/3×/8× presets; memory and sleep use that same simulated clock.

The accepted [first playable MVP](../05-project/first-playable-mvp.md) includes live LLM decisions and conversation, Jev for suitable bounded semantic judgments, AI-generated crafting, and the resource → sling → hunting → harvesting/preparing/eating loop. A second invention, with bow-and-arrow as the candidate, tests reuse. Pause/speed controls are required; the initial personal world pauses while the player is away and schedules no autonomous AI then. No-model fixtures are internal tests, not the playable deliverable.

## Status vocabulary

| Label | Meaning |
| --- | --- |
| Required direction | Explicit product intent in the brief; implementation details remain open |
| Preference | A favored approach with alternatives explicitly welcomed |
| Long-term aspiration | Desired possibility; not evidence of feasibility or a launch commitment |
| Research request | A question the archive must investigate |
| Proposed | Assistant recommendation requiring a future product decision |

## Traceable requirements

| ID | User-stated requirement | Status | Design home |
| --- | --- |
| F01 | Web-accessible simulator with accounts/login and human and autonomous characters sharing an interactive world | Required direction | [Architecture](../03-design-proposals/system-architecture.md) |
| F02 | Each character has physical and mental needs that change and motivate action | Required direction | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F03 | Body parts, injuries, sickness, healing, hunger, fatigue, aging, frailty, and death | Required direction, expandable depth | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F04 | PG intimacy, reproduction, pregnancy, birth, and growing populations | Required direction; release timing open | [World systems](../03-design-proposals/world-and-player-experience.md) |
| F05 | Many emotional dimensions, summarized into legible composite displays | Required direction, gradual depth | [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F06 | Durable bounded memory, six-hour raw recall, hourly older-experience consolidation and independent background reflection/dreams | Required direction | [Memory architecture](../../docs/memory-architecture.md), [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F07 | Personalities established at creation and changed by experience; research-informed framework | Required direction | [Human models](../02-research/human-models-and-memory.md) |
| F08 | Agents know only what they perceive or learn; visibility, hearing, and touch matter | Required direction | [Architecture](../03-design-proposals/system-architecture.md) |
| F09 | Agents independently think and act, with state, beliefs, personality, and surroundings shaping decisions | Required direction | [Memory architecture](../../docs/memory-architecture.md), [Agent systems](../03-design-proposals/agents-and-social-simulation.md) |
| F10 | Cheap ordinary behavior; event-triggered reasoning and variable thinking effort | Accepted semantic levels and Jev attention/escalation; exact provider bindings and budgets open | [Jev research](../02-research/jev-and-semantic-routing.md) |
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
| F25 | Beautiful, detailed browser pixel art with 3D structure and modern atmosphere; avoid overly cartoony treatment; initially minimal physical simulation; hybrid procedural composition, reusable 2D rigs and authored/generated sprites; immediate state effects plus background generation, validation and persistent reuse of missing invention/state artwork | Accepted V02 plus runtime-art/hybrid follow-ups; camera, rig/runtime, density presets and production budgets open | [Visual direction](../03-design-proposals/visual-direction.md), [engine/art research](../02-research/engines-art-and-audio.md) |
| F26 | Thousands of simultaneous players overall, bounded sectors with entry queues if needed | Scale aspiration | [Hosting research](../02-research/hosting-and-scale.md) |
| F27 | Spatial voice, speech input, voiced NPC replies, overhead text | Required direction, staged delivery | [Engine/art research](../02-research/engines-art-and-audio.md) |
| F28 | Per-player recurring invention allowance by subscription tier, including a limited free allowance and larger paid allowances; other paid benefits remain exploratory | Accepted tier-based cap; 10 or 30 free inventions/month are alternatives, with counts and renewal rules undecided | [Subscription tiers](../06-marketing/business-plan.md#player-subscription-tiers-and-invention-allowances), [business ideas](../04-ideation/business-and-future-directions.md) |
| F29 | Explore impact beyond entertainment and possible advertising | Research request | [Business ideas](../04-ideation/business-and-future-directions.md) |
| F30 | Simplest useful implementations, existing libraries/tools/APIs, modular replacement, aggressive 80/20 sequencing | Required delivery principle | [Roadmap](../05-project/roadmap.md) |
| F31 | Many concurrent agent reasoning/speaking/dreaming jobs sharing consistent world state | Required architecture property | [Architecture](../03-design-proposals/system-architecture.md) |
| F32 | Research RimWorld thoroughly, comparable games, psychological models, engines, art, hosting, and Jev/typesafe.ai | Research request | [Research index](../02-research/source-guide.md) |
| F33 | Organized archive separating baseline, proposals/ideation, research, decisions, tasks, and implementation status | Current deliverable | [Archive index](../README.md) |
| F34 | Preserve planning boundaries between accepted product requirements and implementation authorization | Current implementation scope is recorded separately | [Implementation status](../05-project/implementation-status.md) |
| F35 | Start with a primitive wilderness society, before a village exists | Accepted follow-up direction | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F36 | Seed some survival knowledge, accessible resources and possessions | Accepted follow-up direction; exact content open | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F37 | Allow consequential NPC survival and death; no requirement for artificially forgiving initial needs | Accepted follow-up correction; player recovery remains separate | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F38 | Accelerated time across work, needs, environment and aging; creator/god can change speed during play | Accepted current rate: 1 game minute per real second at 1×; 0.5×, 1×, 3× and 8× presets | [Time model](../03-design-proposals/time-and-simulation-speed.md) |
| F39 | Build in fundamental survival mechanics, explicitly gathering, eating and resting | Accepted follow-up direction; additional package details proposed | [Survival baseline](../03-design-proposals/survival-baseline.md) |
| F40 | Use PlayCanvas for browser presentation and reuse mature graphics, animation, input, audio and asset infrastructure | Accepted technical direction from V04; version and editor workflow open | [Architecture](../03-design-proposals/system-architecture.md), [engine research](../02-research/engines-art-and-audio.md) |
| F41 | Own an independent custom simulation and generative-rule interface, able to advance without rendering; preserve control over mechanics, time and persistence | Accepted architectural direction from V04; detailed implementation and G2 runtime open | [Architecture](../03-design-proposals/system-architecture.md), [capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md) |
| F42 | Evolve material/property definitions through interactions; retain dynamic condition/moisture; construct homes from editable parts that can expand and change materials while preserving identity and household meaning | Accepted direction from M02/M03; exact schemas, grid, support/comfort rules, migrations, script runtime, and thermal formulas remain proposals | [Evolving materials and construction](../03-design-proposals/evolving-materials-and-construction.md), [heat/fire](../03-design-proposals/heat-and-fire.md) |
| F43 | Keep simulation manageable through coarse consistent models, reusable rule families, limited explicit cross-system relationships, and detail added for meaningful gameplay; preserve expressive semantic requests | Accepted design direction from M04/M05; numeric budgets and implementation models open | [Scope and complexity](../03-design-proposals/simulation-scope-and-complexity.md) |
| F44 | Give each world high-level rules bounding ordinary gameplay and generated mechanics; reject incompatible effects with clear friendly feedback and optional humor; a realistic world must reject magical ignition | Required direction from M05; exact profiles/classifier/default-world selection open; plausible missing mechanics remain candidates | [World rules and parameters](../03-design-proposals/world-rules-and-parameters.md) |
| F45 | Treat ordinary invention as discovery of consistent world possibilities; preserve relevant history and equivalent physical behavior across the rule's actual scope; separate actor knowledge from physical applicability | Accepted M07/M08 direction; migrations and exact activation policies proposed | [World creation and discovery](../03-design-proposals/world-creation-and-discovery.md) |
| F46 | Provide AI-assisted world creation with substantial defaults for familiar premises and a few meaningful questions/default suggestions for novel systems such as magic; make assumptions and concessions visible | Accepted M07/M08 direction; exact creation UI, presets and completeness checks proposed | [World creation and discovery](../03-design-proposals/world-creation-and-discovery.md) |
| F47 | Make reasonable assumptions for broad player goals, automate routine details, and ask clarifying questions sparingly; preserve ordinary activity during invention and distinguish service errors from real experimental outcomes | Accepted M07/M08 direction; timing, cancellation and UI tuning open | [World creation and discovery](../03-design-proposals/world-creation-and-discovery.md), [interaction protocol](../03-design-proposals/interaction-protocol.md) |
| F48 | Let NPCs learn naturally through observation, direct experience, hearing, teaching and other interaction, with provenance and uncertainty; no mandatory formal research minigame | Accepted M07/M08 clarification of character learning; exact skill/confidence updates open | [Agent learning](../03-design-proposals/agents-and-social-simulation.md#learning-through-ordinary-interaction) |
| F49 | Give changing state responsible update systems that combine contributions; detect missing systems and proactively consider plausible existing and undiscovered influences without generating every related subsystem; improve reusable defaults through initial play | Accepted M07/M08 direction; influence records, templates and numeric models proposed | [State systems and future influences](../03-design-proposals/state-systems-and-future-influences.md) |
| F50 | Include live AI decisions, NPC conversation and actual AI-generated usable mechanics in the first playable version; use Jev plus LLMs for their appropriate roles | Accepted M10/M11 correction; continuous autonomy does not require inference every tick; Java was interpreted as Jev in the agreed response | [First playable MVP](../05-project/first-playable-mvp.md) |
| F51 | First-version emergent play includes gathering resources, generating/crafting a sling, hunting animals, harvesting/preparing/eating them, and another supported invention, with bow-and-arrow the candidate | Accepted M10/M11 scope; arrow example tentative, exact materials/recipes/balance open; use real game consequences | [First playable MVP](../05-project/first-playable-mvp.md) |
| F52 | Provide pause/speed controls and saved Pause game when hidden; default to pausing on hidden/unfocused tabs, allow connected background progression when unchecked; no offline catch-up | Accepted M10/M11 plus September 19 refinement; manual pause overrides background opt-in, and autonomous scheduling follows effective pause state | [Time model](../03-design-proposals/time-and-simulation-speed.md), [MVP](../05-project/first-playable-mvp.md) |

| ID | Additional user-stated requirement | Status | Design home |
| --- | --- |
| F53 | World owner independently locks/unlocks agent/NPC invention and player invention; all four combinations preserve existing action use and learning | Accepted U14 plus separate-lock clarification; enforcement proposed | [Governance](../03-design-proposals/invention-governance-and-ownership.md) |
| F54 | Players own their authored inventions and can inspect all past contributions across worlds in an account library, including origin world and technical details | Accepted U14 direction; account/rights/retention contracts proposed | [Ownership and library](../03-design-proposals/invention-governance-and-ownership.md) |
| F55 | Every world has a complete invention pack; owners can designate free-use worlds whose complete packs players can reuse/clone in their own worlds | Accepted U14 direction; label, contribution terms and marketplace details open | [World packs](../03-design-proposals/invention-governance-and-ownership.md) |
| F56 | Complete contextual action discovery through right-click, typeahead, dynamic categories, and an invention sparkle for new requests when the player invention lock is off; AI names admitted actions appropriately | Accepted U14 direction; finite discoverable catalogue plus unbounded proposal input | [Controls](../03-design-proposals/playability-and-controls.md) |
| F57 | Continually rank actions using player-wide and individual usage, with automatic counts and categories | Accepted U14 direction; aggregation/ranking policy proposed | [Action ranking](../03-design-proposals/playability-and-controls.md) |
| F58 | Configurable action/category key bindings, bottom quick slots and contextual suggestions; unavailable actions gray out and sort last in drawers | Accepted U14 direction; five personal and three dynamic slots, C for Create are examples | [Quick slots](../03-design-proposals/playability-and-controls.md) |
| F59 | Filterable player/world and special god logs; durable world-linked inventions expose full technical parameters, effects, declarations and scripts | Accepted U14 direction; persistence/permissions proposed | [Controls](../03-design-proposals/playability-and-controls.md), [world log](../03-design-proposals/world-agent-and-workshop.md) |
| F60 | Workshop existing inventions and talk to a world agent with world-wide state, all character context, inventions and event access; author and revise mechanics through that agent | Accepted U14 direction; scoped access and versioned activation proposed | [World agent/workshop](../03-design-proposals/world-agent-and-workshop.md) |

These requirements extend the product direction without silently expanding the first-playable acceptance checklist. Ownership, contribution licensing and host admission are distinct; complete discovery does not imply every imaginable action already exists. Exact slot counts, ranking formulas, rights terms, retention and revision defaults remain open.

### U15 — visible AI billing

| ID | User requirement | Status / interpretation | Design home |
| --- | --- |
| F61 | Small billing UI with detailed separate LLM/Jev costs for the current server session, rolling 24 hours/7 days/30 days, all time and arbitrary start/end periods; query Macrofold for the accounting data | Accepted direction; reporting contract proposed, not implemented | [Interface](../03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown), [billing contract](../07-technical-architecture/billing-and-usage-reporting.md), [source](../00-source/billing-interface-followup.md) |

### September 19 — perception and attention

These requirements extend the product target without implying completed features or changing the first-playable acceptance boundary.

| ID | User requirement | Status / interpretation | Design home |
| --- | --- |
| F62 | Toggleable sight/hearing indicators, subtle gradients or contours, initially circular and later shaped by occlusion; distance affects sensory clarity | Accepted direction; exact presentation, units and propagation proposed | [Indicators](../07-technical-architecture/perception-and-attention.md#5-compact-player-perception-indicators) |
| F63 | Every meaningful object has shared or distinctive near/medium/far visual descriptions; supported state changes and attached effects alter the permitted description | Accepted direction; archetype/instance composition and effect ownership proposed | [Descriptions](../07-technical-architecture/perception-and-attention.md#6-shared-descriptions-with-meaningful-state-variation) |
| F64 | Sound exposure represents events/actions and sustained sources, attenuates with distance/obstacles, and supplies only the evidence the listener can perceive | Accepted direction; no independent acoustic model implemented | [Sound emissions](../07-technical-architecture/perception-and-attention.md#4-sound-belongs-to-emissions-and-processes) |
| F65 | Meaningful new exposure creates decision opportunities; people entering view always qualify, ordinary objects usually qualify only when relevant; semantic indexing supports arbitrary goals without per-object Jev calls | Accepted direction; scoped index, interest subscriptions and batching proposed | [Semantic interests](../../docs/memory-architecture.md#selection-signals-and-delivery-order), [triggers](../07-technical-architecture/perception-and-attention.md#7-sensory-event-generation) |
| F66 | Physical/emotional threshold crossings and persistent serious needs cause reconsideration, with an hourly low-food thought/reminder as the example                                                                        | Accepted reconsideration opportunities, without compulsory fresh thoughts or paid calls; exact thresholds and reminder cadence remain open | [Needs and time](../07-technical-architecture/../../docs/memory-architecture.md)                                                                                                              |
| F67 | Broad embodied vision agrees with what the player can see on-screen within character LOS; off-screen/hidden objects provide no new visual detail | Accepted direction; authoritative camera limits, background mode and display policy remain open | [Visual parity](../07-technical-architecture/perception-and-attention.md#embodied-visual-parity) |

## Compact cognition follow-up — F68–F73

The [canonical design](../../docs/memory-architecture.md) owns these accepted targets; current delivery state belongs to [CR01–CR12](../../docs/maintainers/cognition-redesign.md).

| ID | User requirement | Delivery tasks |
| --- | --- |
| F68 | Minimal English context and tiny purpose-specific output; remove storage metadata, redundant catalogues, empty scaffolding and ordinary mind-patch responses | CR01–CR03, CR12 |
| F69 | Native behavior plus Jev level 1, mini level 2, complex low/high levels 3/4 and harness level 5; speech defaults to level 2; Jev evaluates escalation; inventions can configure trusted trigger mechanics | CR02, CR08, CR10 |
| F70 | Jev yes/no attention selects actor-permitted nearby entities, possessions, recipes and recall; all actors including the player have event-time awareness; ordinary unwitnessed experiential events need not be logged, with the later F77 notable-event exception | CR04–CR05; NC04 for the later exception |
| F71 | Store English memory text; combine aware events and personal memories without duplicates; raw context covers six game hours; hourly small-model cleanup groups old routines and preserves important experiences | CR03, CR05–CR06 |
| F72 | Reflection runs in the background during downtime, dreams and significant events; edit persistent workspace files, publish one PostgreSQL inner-world text row per actor, include it in every decision, and return god-only presentation thoughts of at most 20 words each | CR07–CR08, CR11 |
| F73 | Eight in-game hours of daily rest; dreams only after at least two in-game hours asleep | CR09 |

These settle behavior, not exact provider availability, budgets, daily rest accounting or measured latency. The full-snapshot requirement versus a few-hundred-token greeting remains an explicit sizing tradeoff, not permission to silently drop About me.

## Living actor model — F74

| ID | Product requirement | Design home |
| --- | --- |
| F74 | Treat every living being, including animals, as an actor; let lifecycle actions such as Revive and compatible conditions/effects such as wetness, fire and health changes apply across species; allow selected animals to gain intelligence, memory, inner worlds or speech | [Canonical actor model](../../docs/architecture.md#actor-means-any-living-being), [agent design](../03-design-proposals/agents-and-social-simulation.md#one-character-model-two-controllers) |

## Narration and conversation follow-up — F75–F80

[Agent agency](../../docs/agent-agency.md) owns optional decision composition (F75), with operational admission in its [runtime contract](../07-technical-architecture/agent-agency-runtime.md). The [narration and conversation specification](../../docs/narration-and-conversations.md) owns communication/narration requirements F76–F80; EPR owns shared stimulus scope and intake.

| ID | Product requirement |
| --- | --- |
| F75 | Any trigger may elicit talk, act and/or think, with proper entity targets; every accepted component becomes the actor's own experience, including private thoughts. |
| F76 | Narrate non-speech actions/reactions and relevant world consequences in conversation, excluding thoughts; show actual impacts below in smaller distinct text; allow unsupported expressions without mechanics initially and defer invention of missing conditional effects. |
| F77 | Use one external world-event catalogue with actor awareness joins; retain witnessed events and score-defined notable unseen events, and discard ordinary unseen experiential records without discarding simulation state. |
| F78 | The Narrator uses bounded scoped context/retrieval for one or several perspectives; explicitly permitted single-actor thoughts and distant notable cutaways are separate modes; standalone story appears atop the screen and in a private Journal, with player-selected voice. |
| F79 | Durable conversations support changing membership, self-talk, overhearing without joining, no retroactive history awareness, last-member closure and source-to-destination merges with a terminal join notice. |
| F80 | Narration uses separate player-private storage and never becomes a world event; explicit links include a many-to-many event join; reconstruct scoped conversation history chronologically, including separate narrations of one global event across conversations. |

## What this baseline does not settle

PlayCanvas and ownership of an independent simulation are accepted planning choices. The hosted transactional target is PostgreSQL and accepted inner-world publication uses its text row; exact hosted deployment and release remain open. General model bindings, hosted-editor adoption, subscription price, server capacity, specific psychological theory, release date and staffing remain unproven or undecided. The wilderness and grounded pixel-art directions are accepted; camera freedom, art pipeline, exact population, inventories, survival rates, future clock presets/overload behavior and biological-aging policy remain open. Neither “thousands online” nor “100 emotions” determines the correct first release. No conclusion that Jev meets production needs should be read into the brief.

“Generative” has several distinct meanings: dialogue, decisions, compositional mechanics, genuinely new executable logic, art, and world layout. Each has a different cost, validation burden, and latency. The archive evaluates them separately while preserving the eventual combined vision.

The phrase “entirety of their state” establishes that all relevant systems should influence behavior. It need not mean placing every historical memory and body-part record in every language-model prompt. The proposed implementation uses summaries and retrieval while letting urgent underlying state constrain decisions.

## Product tensions to resolve explicitly

1. **Freedom versus shared consistency.** A first-time invention must be creative without allowing an arbitrary sentence to mint resources or change another player's body.
2. **Life simulation versus player availability.** Hunger, aging, pregnancy, offline time, and revival need a common clock and absence policy.
3. **Mystery versus explainability.** Ordinary actor-perspective feedback must not reveal NPC thoughts or unseen events. F78 adds explicitly permissioned single-actor narration and notable-event cutaways; those never silently become character knowledge.
4. **Persistence versus correction.** A broken mechanic can be disabled; historical injuries, trades, and memories may need compensating changes rather than rewinding the shared world.
5. **Accessible resources versus guaranteed survival.** Seed usable opportunities and knowledge while allowing depletion, mistakes, conflict and death; do not turn accessible resources into automatic subsistence.
6. **Novelty versus affordability.** Paid usage can fund exploration without making ordinary subsistence or human safety dependent on an LLM quota.
7. **Simulation breadth versus a compelling first hour.** One resident who remembers a promise is more valuable initially than dozens of unobservable internal meters.

The [decision register](../05-project/open-decisions.md) tracks these tensions. Proposed defaults are working hypotheses, not retroactive agreements.
