# Playable game first

**Priority decision: October 3, 2026.** This document owns selection policy for the current survival-adventure game. It is not a claim that the listed features are implemented, an implementation specification, or adoption of one optional world's lore. The [ranked coverage](ranked-coverage.md), [ranked patterns](ranked-patterns.md) and [ranked actions](ranked-actions.md) apply this policy. Existing specifications still own correctness and existing maintainer trackers still own delivery.

## What changed, and why

Make a complete, playable, enjoyable game before elaborating its simulation or demonstrating its unusual architecture. Previously, a local starting-scene sequence favored a coherent camp and reuse of existing food/fire capabilities. Many research cards also carried a broad **High** recommendation, while action priorities were judged within each domain and ties favored F/U/C/D realization order. Together these could promote bedding, sharpening, portion reservations and task administration ahead of enemies, rewarding exploration and progression.

That selection policy is superseded. **Engineering adjacency, small implementation cost, architectural elegance, realistic detail, autonomous behavior and philosophical distinctiveness are not substitutes for player value.** The engine/world boundary, privacy, cancellation, accounting, persistence and honest execution remain implementation constraints; they do not decide which optional feature deserves to exist next.

The new ranking registers replace the source cards' High/Try/Niche selection labels and the source action tables' earlier Criticality scores for current-game planning. Source descriptions, IDs, examples, research links, realization classifications and historical build estimates remain reference material. Do not average the old and new assessments, use the old scores as a tie-breaker, or treat a catalogue's first paragraph as a build order. This moves priority ownership rather than creating two active roadmaps.

## The game we need to be able to play

A player should be able to understand a goal, venture somewhere interesting, encounter opposition, fight or avoid it using understandable tools, obtain something worthwhile, improve their capabilities or home, and tackle another worthwhile challenge. Failure must have a clear, usable continuation or restart. Basic survival and crafting support that loop; they are not an endless sequence of chores that replaces it.

A suitable early proof is a dangerous resource site or occupied ruin: acquire and equip a weapon, learn an opponent's behavior, choose an approach, win or escape, bring back loot, make a useful upgrade and use it on a different challenge. Gathering, food, water, storage and shelter participate where they create understandable decisions. The proof must be playable by the player, not only a narrated demonstration of an autonomous character completing camp work.

This does not make every activity combat, prescribe one quest, or remove peaceful building, exploration and social play. It does require actual enemies, equipment, rewards and progression to receive first-class attention in a survival-adventure game. A hostile animal or bandit does not need a complete economic, psychological or political simulation before it can provide readable, worthwhile opposition.

## Criticality

Criticality is an ordinal product judgment, not a measured fun score or an engineering estimate. Lower numbers come first. The context is the **whole current survival-adventure game**, not the importance of a feature inside an arbitrarily selected subdomain.

| Score | Meaning | Selection test |
| --- | --- | --- |
| **1 Core** | A missing capability or representative content needed for a playable, rewarding first loop. | Without an adequate representative of this capability, is a player unable to play, understand, confront a challenge, obtain a reward, improve, or recover? |
| **2 Complete** | Variety, progression and supporting features that turn the first loop into a game worth continuing. | Does this add a substantial new challenge, destination, useful reward, build, activity or practical way to keep playing? |
| **3 Depth** | Distinctive systems and meaningful additional expression after the basic game works. | Does this materially change decisions or create memorable situations beyond the complete baseline? |
| **4 Detail** | Optional simulation granularity, maintenance, administration, decoration or narrow convenience. | Is the baseline already enjoyable without it, with this mainly adding fidelity or a small local benefit? |
| **5 Specialist** | Separate-world features, research models and frontier systems outside the current game's delivery path. | Does this require a different product promise, explicitly chosen world constitution, or dedicated experiment? |

An expensive enemy/combat capability can be **1 Core**. A cheap sharpening action can be **4 Detail**. A simple but rewarding new activity can outrank an elaborate simulation. Do not rename low priority as high complexity, or demote a necessary capability because its implementation is unfamiliar.

Scores apply to the **described entry**, not the most important noun it contains. A detailed injured-companion staffing simulation is not Core merely because health and recovery are Core. A storied, multipurpose kettle is not Core merely because food is Core. Basic containment is Core; a container's sentimental history, deception uses or nested physical simulation are separately selectable depth. The coverage register makes these distinctions explicit where the older cards emphasize elaborations rather than a basic representative.

The four seed-world labels remain suitability recommendations, not four simultaneous delivery commitments. A feature can be fundamental to a future science-fiction, modern-life or unusual-world game without being foundational to this survival-adventure. A later owner decision to choose that experience calls for a contextual rerank, not a universal ban on its content.

## Whole-game build order

These workstreams rank gaps across catalogues. They are a connected delivery target, not a demand to finish every item in one row before beginning the next. Build the smallest coherent playable combination, and do not rebuild a capability that already meets its requirement.

| Order | Player-facing foundation | Minimum worthwhile scope | Not a prerequisite |
| --- | --- | --- | --- |
| **1** | Understand and control play | Responsive movement, targeting, inspection, interaction, usable inventory/equipment, readable health and action results, cancellation, a clear starting purpose, and a working save/quit/restart path. | New cognition abstractions, elaborate conversation administration, or a universal command vocabulary. |
| **2** | Face actual enemies and danger | A small set of opponents with readable detection, approach, attack and disengagement behavior; dangerous locations; a reason to confront or avoid them. Predators and hostile people are natural starting candidates. | Full ecology, faction economics, moral negotiation, biographies, realistic daily routines, or a requirement that every enemy can be befriended. |
| **3** | Fight, defend and recover | Usable weapons, equipping, reliable attacks and damage, a meaningful defensive or escape option, visible enemy cues, basic protection and recovery. Melee and a representative ranged option should have distinct uses. | Every weapon family, hit-location simulation, advanced projectile physics, sharpening, per-part repairs, or long-term disability management. |
| **4** | Explore and finish worthwhile objectives | Distinct landmarks and resource sites, at least one contested or dangerous destination, discoverable goals, understandable routes, and a payoff or ending that actually changes something. | Procedural continents, expedition paperwork, exhaustive route memory, or a simulated travel industry. |
| **5** | Earn loot and become more capable | Useful enemy/site rewards, equipment choices, an attainable upgrade or recipe/technique unlock, and a next challenge that makes the improvement matter. | Universal ability composition, institutional careers, a complex class system, or repetitive training. |
| **6** | Gather, craft and sustain the adventure | A short resource-to-tool/weapon/food chain, usable consumption, simple water access where hydration is enabled, and comprehensible costs. Crafting should produce things the player wants to use. | Detailed ingredient provenance, food-age sorting, container washing, material science, or preservation before meaningful expeditions exist. |
| **7** | Build and use a home | Functional placement/construction, storage, a useful shelter or resting place, and an improvement worth bringing materials home for. Include a defensible entrance where the selected threats make it useful. | Bedding collection as its own progression gate, furniture memories, complex moisture/exposure simulation, compulsory upkeep, or negotiations over every shared object. |
| **8** | Continue with variety | More enemy roles and encounter objectives, additional places and equipment, a stronger encounter or boss-like goal, simple trade/services, useful companions, farming or another substantial optional activity. | A complete political economy, every survival meter, or all 27 research categories. |
| **9** | Add distinctive depth | Richer companion agency, relationships, rival continuity, flexible invention, environmental combinations, factions and chosen magical systems that build on enjoyable activities. | Treating novelty or emergent behavior as proof that the basic game is already complete. |
| **10** | Add optional detail or new product modes | Maintenance, domestic rituals, fine-grained logistics, specialist simulations and alternate-world constitutions selected for a demonstrated audience. | Making everyone perform them to access the core game. |

World-specific rules stay world-owned. A bounded implementation is legitimate when it delivers real, inspectable behavior through the correct owner; a named object, generated story or effect-free animation is not a substitute. Conversely, correctness does not require building the most physically or socially detailed version imaginable.

## Scope, realization and priority are different questions

Keep **Small / Moderate / Large** build scope separate from Criticality. Keep **F / U / C / D** realization labels separate from both. F means a reusable grounding/control operation, not a player-value endorsement; C means composition, not "complex". Record a missing dependency as a dependency rather than inflating the apparent complexity of every action using it.

| Example | Current-game priority | Smallest sensible feature scope | Expansion to keep separate |
| --- | --- | --- | --- |
| Sharpen a blade, MAK-05 | **4 Detail** | **Small**, once a bounded blade-condition/maintenance capability exists: consume the supported input/work and restore the supported property. It is ordinary use, not a new physical simulator. | Abrasion geometry, metallurgy, per-edge wear and universal maintenance. Do not invent a durability system merely to make sharpening necessary. |
| Repair a handle, MAK-04 | **4 Detail** | **Small** for a bounded authored repair with existing part/condition support; otherwise identify that support explicitly. | General fracture, structural mechanics and arbitrary part reconstruction. |
| Patch a seam, MAK-06 | **4 Detail** | **Small** with an existing compatible sealing/condition rule and material cost. | General fluid dynamics, seam topology and universal material compatibility. |
| Gather bedding or establish a specially dry sleeping spot, BLD-07 | **4 Detail** | A bounded optional comfort/protection treatment. | Do not make this a dependency of basic rest, shelter or recovery. |
| Agree on work and report completion, COOP examples | **4 Detail** for the administrative additions | Use existing communication and activity results where adequate. | Formal agreements, renegotiation and reporting protocols before there is an enjoyable shared activity. Basic following or helping in a fight is a different, higher-value capability. |
| Prepare supplies | **No standalone feature without a demonstrated gap** | Use the existing inventory, bags, equipment and consumables. | Do not create a planning subsystem or duplicate inventory UI solely because an expedition has several steps. |
| Basic enemy encounter and usable weapon | **1 Core** | A bounded, complete encounter with understandable behavior, damage, defense, reward and failure. | Scope can be Moderate or Large without lowering its product importance. |

These are design-scope distinctions, not estimates derived from a fresh implementation audit. Existing functionality must be checked against its owner before scheduling work.

## How to choose the next implementation

1. Identify the highest-priority **missing player experience**, using the coverage register and current implementation evidence. State what the player will do, what can oppose them, what they can win, and why they will do it again.
2. Select a minimal, connected set of entries. Several Core examples may be alternatives; do not implement every example or every weapon variant just because it shares a high score.
3. Identify only the dependencies necessary for that playable result. Reuse existing inventory, movement, communication and crafting without mistaking that reuse for the reason to choose the feature. A lower-priority capability can be included as a small blocking dependency, but that does not promote its entire catalogue.
4. Specify the smallest complete scope, integration and evidence in the existing design/tracker owners. A beautiful isolated mechanic with no enemy, reward, objective or usable player surface does not close a gameplay gap.
5. Prefer a substantial missing Core or Complete capability over polishing a delivered one. Within equivalent player value, effort can guide delivery planning; it never substitutes for the product ranking.

Within a register, sort by Criticality, then the whole-game workstream, then stable ID; use the stable source heading when an entry has no ID. Where two alternatives meet the same need, choose a coherent representative rather than treating tie order as an additional feature requirement. Do not use F/U/C/D or old build estimates as priority tie-breakers.

## Completion checks for the first playable game

A player, without author coaching, can understand a goal; move and interact; obtain and equip useful gear; encounter an enemy; fight, defend or escape; find a worthwhile place or reward; gather and craft something useful; improve their equipment or home; and recognize both success and failure. There is a reason to attempt another challenge. Inventory, feedback, recovery and current-format persistence work through the real player path.

A repeat encounter and a different approach remain worthwhile. A loss does not leave the player confused about what happened or unable to continue under the chosen mortality/restart rules. The experience does not require repetitive domestic administration to reach its interesting parts. Basic survival, exploration, construction and combat must work together rather than merely exist as separate demonstrations.

These are targets for later implementation and playtesting. This priority revision asserts **no new runtime behavior, completed playtest, approved mortality rule, or measured fun improvement**. Existing unmet engineering and verification requirements are not erased by reprioritization.
