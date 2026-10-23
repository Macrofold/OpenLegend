# Ultimate Epic Battle Simulator 2: what its scale does and does not demonstrate

| Research field | Status |
| --- | --- |
| Research status | Completed desk research; primary developer statements and a separate public source example inspected |
| Progress | Evidence synthesized; proprietary algorithms and performance claims remain qualified |
| Last updated | 2026-10-23; no game run or benchmark performed |

## Finding

**The public evidence supports individually represented combatants running through a specialized GPU crowd system. It does not support dismissing the soldiers as visual copies of one aggregate combatant.** Brilliant Game Studios explicitly describes per-character health, position, enemy and decision making. However, an individual target does not imply a complete independent path search, and individual combat state does not imply sophisticated cognition. The exact navigation and target-search algorithms remain undisclosed in the accessible sources. [Developer explanation, January–March 2021](https://steamcommunity.com/app/1468720/discussions/0/3110267314129208740/)

Documented economies include constrained navigation geometry, drastic distance-based graphical simplification, approximated mass ragdoll effects, and a workload whose memory and pathfinding costs depend on team count. These can coexist with distinct health and targets. The useful question is which decisions and representations are individual, shared, approximate or purely visual—not whether the entire crowd is either completely independent or completely fake.

## Evidence and confidence

“Developer statement” below means attributable primary evidence, not independent measurement or an audit of the shipped binary.

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| [Developer GPU explanation, 2021](https://steamcommunity.com/app/1468720/discussions/0/3110267314129208740/) | The described crowd pipeline runs AI, transforms, animation, rendering and culling on the GPU; units have separate state and enemies. | Exact algorithms, complexity, update frequency or humanlike reasoning. |
| [GPU memory guidance, edited May 2022](https://steamcommunity.com/app/1468720/discussions/0/3110267314139888374/) | Character properties occupy GPU memory; capacity matters greatly. | Controlled FPS results or guaranteed present-day capacities. |
| [Performance advice, May–June 2022](https://steamcommunity.com/app/1468720/discussions/0/4536825080741228104/) | More teams mean more pathfinding; battle extent, RTS and animation settings affect cost. | A particular shared navigation algorithm. |
| [Team-limit discussion, May 2022](https://steamcommunity.com/app/1468720/discussions/0/3274690571072081535/) | Four opposing teams was an explicit GPU-memory/pathfinding tradeoff at that stage. | The current team limit or millions of unrelated destination problems. |
| [Map modding tutorial, February–March 2025](https://steamcommunity.com/workshop/discussions/18446744073709551615/600771622034502381/?appid=1468720) | Navigation has one layer; thin obstacles can be problematic. | Grid resolution, search method or avoidance guarantees. |
| [Developer LOD guidance, October 2024](https://steamcommunity.com/workshop/discussions/18446744073709551615/4694532143495334056/?appid=1468720) | The final human LOD uses a generic 100-triangle mesh. | Reduced thinking frequency or loss of identity at distance. |
| [Launch announcement, May 2022](https://steamcommunity.com/games/1468720/announcements/detail/3199255960103884476) | Dynamic swarm navigation and expressly approximated mass ragdolls were advertised launch features. | Full articulated-body physics for every soldier. |

## Individual state and shared work are compatible

There are several separate meanings of “independent.” A soldier can have its own health, current enemy and position while executing the same short behavior program as thousands of others. It can react differently because its inputs differ. Nothing about shared program execution requires shared answers.

Likewise, several agents could reuse navigation information while choosing different local movements or opponents. This is a general computational possibility, **not a recovered specification of UEBS2**. The developer's team-dependent navigation costs suggest that unit count alone does not describe the work, but they do not identify what is shared or prove the use of flow fields. [Performance advice](https://steamcommunity.com/app/1468720/discussions/0/4536825080741228104/)

Keep these mechanisms distinct:

- **Batching:** execute many similar operations together while preserving separate records.
- **Reuse:** compute a common answer or intermediate result once.
- **Approximation:** use a cheaper answer where exactness is unnecessary.
- **Aggregation:** represent several agents with one collective state.
- **Presentation simplification:** reduce the cost of drawing or animating a simulated entity.

The accessible UEBS2 sources document GPU processing, individual state, presentation simplification and some physical approximation. They do not establish wholesale aggregation of combat results. They also do not establish that every unit executes every subsystem every rendered frame.

The 2021 GPU account describes the crowd system. It does not establish literally zero CPU work elsewhere in the application. [Developer thread](https://steamcommunity.com/app/1468720/discussions/0/3110267314129208740/)

## Developer-documented simplifications and constraints

### Navigation uses a restricted spatial representation

The official map tutorial says navigation supports only one layer. A bridge cannot provide traversable space both above and below the same surface. The tutorial also recommends thick invisible collision geometry for fences because thin obstacles can produce problems. A visually three-dimensional battlefield therefore does not imply arbitrary three-dimensional navigation. These are explicit authoring constraints, not guesses from a video. They do not reveal the internal grid, cell size or search algorithm. [Map Modding Tutorial](https://steamcommunity.com/workshop/discussions/18446744073709551615/600771622034502381/?appid=1468720)

The developer calls the launch system dynamic swarm pathfinding and describes it responding to environmental changes and body piles. That terminology is insufficient to identify A*, potential fields, flow fields, ORCA or another implementation. The full launch text was retrieved in the studio's [official announcement feed for the original game](https://steamcommunity.com/app/616560/announcements/), which reproduced the sequel announcement; the individual sequel event page did not expose its body to the text extractor.

### Distant appearance is drastically cheaper

The developer's October 2024 modding warning describes a hand-authored humanoid mesh with just **100 triangles** as the final LOD for human characters. It inherits shape and texture properties from the character it represents. The warning says ordinary procedural simplification often struggles to get a modded character below roughly 1,000 triangles, and disabling the special final LOD can substantially damage performance. [Official LOD warning](https://steamcommunity.com/workshop/discussions/18446744073709551615/4694532143495334056/?appid=1468720)

This is strong evidence for a visual economy. It does not mean the distant soldier has become someone else's health record. Conversely, visual culling and LOD do not prove that hidden units continue receiving exactly the same simulation work.

### Physical spectacle includes approximations

The May 2022 launch list explicitly labels mass ragdoll physics as faked, while separately advertising body piles and experimental blood-volume effects. This supports a limited conclusion: some visible motion was deliberately approximated. It does not identify the substitute method, establish the precision of projectile collision, or imply that damage and targets are fictitious. [Launch announcement](https://steamcommunity.com/games/1468720/announcements/detail/3199255960103884476); [retrieved official reproduction](https://steamcommunity.com/app/616560/announcements/)

### Behavioral scope and navigation correctness still matter

A March 2021 developer reply describes omitting morale/retreat as a gameplay preference. That is a historical design statement, not proof that morale is computationally impossible, and not a verified current feature inventory. [Developer discussion](https://steamcommunity.com/app/1468720/discussions/0/3110267314129208740/)

The June 2022 pathfinding patch addressed units converging on isolated points, overcrowding, bunching around walls/cliffs, diagonal movement, responses after reaching an RTS destination and interactions with large units. These historical fixes show why raw population is an incomplete measure of navigation quality. They are not evidence that the same bugs persist today. [Stable original announcement](https://steamcommunity.com/games/1468720/announcements/detail/3364765719069532373); [retrieved primary announcement text](https://store.steampowered.com/news/posts/?enddate=1655241080&feed=steam_community_announcements)

## What the advertised populations mean

The developer's GPU-memory post, edited in May 2022, offered these **historical recommendations**, not benchmark measurements. It explains that AI properties reside in GPU memory and that exhausting available memory can cause abrupt slowdown. [Original guidance](https://steamcommunity.com/app/1468720/discussions/0/3110267314139888374/)

| GPU memory | Historical suggested population | Qualification in the developer's guidance |
| --- | --- | --- |
| 3–4 GB | 100,000–500,000 | A million may work with stuttering or slowdown. |
| 6–8 GB | 1–4 million | Scenario and GPU dependent. |
| 10–16 GB | 4–10 million | Guidance, not a controlled result. |
| 20–24 GB | 10–16 million | Explicit estimate; the developer said it did not own a card above 16 GB. |

The same post generally recommends staying at or below **one million**, the stated stability target. It does not attach reproducible scenes, exact GPUs, resolution, frame-time percentiles or activity levels to the ranges. A ten-million showcase therefore cannot be converted into a guaranteed ten-million-unit performance contract.

Even within the same population, armies spread across more terrain, additional teams, RTS support and animation settings can change costs. The historical four-team limit concerned opposing teams; it should not be confused with the number of army groups or character types. [Performance guidance](https://steamcommunity.com/app/1468720/discussions/0/4536825080741228104/); [team-limit explanation](https://steamcommunity.com/app/1468720/discussions/0/3274690571072081535/)

## A separate public example makes cheap individuality concrete

In April 2025, Brilliant Game Studios released [BG-C-Software-Renderer](https://github.com/brilliantgames/BG-C-Software-Renderer), a software-rendering research project containing a simple crowd system described as similar to UEBS1. **This is not the source of UEBS2's GPU AI.** The announcement was read in the [official news feed](https://steamcommunity.com/app/1468720/allnews/); its [stable event URL](https://store.steampowered.com/news/app/1468720/view/524213474678538792) is retained for reference.

Source inspection used snapshot `18d7697974ee2bbdda4df868e31f8a604ca4947b`:

- [`AiIndividual.cs`](https://github.com/brilliantgames/BG-C-Software-Renderer/blob/18d7697974ee2bbdda4df868e31f8a604ca4947b/Raster%20Engine/Scripts/AiStuff/AiIndividual.cs) stores individual health, team, position, enemy reference, movement/look directions, behavior state and attack/death timers. It derives from Unity `MonoBehaviour`; it is not evidence of an ECS implementation.
- [`SimpleArmy.cs`](https://github.com/brilliantgames/BG-C-Software-Renderer/blob/18d7697974ee2bbdda4df868e31f8a604ca4947b/Raster%20Engine/Scripts/AiStuff/SimpleArmy.cs) supplies idle, charge, attack and death behavior. While charging, a unit samples a random candidate and checks a few nearby/ahead occupancy-grid locations, retaining or improving its selected enemy. It does not perform an exhaustive globally nearest reachable target search.
- The grid stores an AI index per cell, rather than demonstrating a complete list of every local neighbor. Ground-height data and custom transform data support movement/presentation. An optional CPU worker processes armies separately from rendering, which has its own LOD handling.

This is an inspectable example of the central distinction: an individual can have persistent combat state while making inexpensive, approximate choices. It is also a reason not to infer rich reasoning from responsive-looking movement. No source from this example was copied into Open Legend, and the project was not built, benchmarked or audited. Its techniques must not be silently attributed to UEBS2.

## Keep the generations and projects separate

The [2017 interview with Robert Weaver](https://www.gamedeveloper.com/design/developing-i-ultimate-epic-battle-simulator-i-s-large-scale-carnage) concerns **UEBS1**. It usefully discusses how tiny per-agent costs become important at enormous scale, but the later UEBS2 developer thread describes a complete crowd-system rewrite. Old implementation details are therefore not automatically sequel evidence.

The official feed also contains a September 2026 announcement for a new engine intended for the studio's **next title**, including a screenshot labeled 40 million units over a 12 km map and ambitions for GPU rigid-body simulation. This is neither an independently measured result nor a shipped UEBS2 capability. [Stable announcement](https://steamcommunity.com/games/1468720/announcements/detail/698776157349216423); [retrieved official feed](https://steamcommunity.com/app/1468720/allnews/)

The February 2021 [UEBS2 making-of video](https://www.youtube.com/watch?v=kpojDPlIjdQ) was located, but a reliable transcript or viewable frames were not retrieved. This dossier does not claim to have watched it or treat secondary retellings as direct evidence.

## What remains unknown

Accessible primary evidence does not settle:

1. The exact global navigation algorithm, spatial resolution, or whether navigation data is shared per team, group or destination.
2. Whether targeting seeks the nearest opponent, an approximate candidate, or a reachable candidate; how often targets are reconsidered.
3. Simulation tick rates, subsystem cadences, event triggers or update budgets.
4. The neighborhood representation, avoidance solver and behavior under extreme density.
5. Collision/projectile precision, simultaneous attack ordering and GPU synchronization.
6. Off-camera activity, behavioral LOD or any semantic aggregation.
7. Determinism, persistent identity across sessions, replay or networking contracts.
8. Reproducible benchmark conditions behind the largest advertised populations.

These are evidence gaps, not proof that the corresponding mechanisms are absent. No search result identified a public specification of the proprietary GPU AI sufficient to close them.

## Relevance to the wider research

UEBS2 supports the proposition that large populations can retain meaningful individual numerical state while sharing execution machinery and accepting narrow behavioral/world contracts. It does not demonstrate millions of agents with private beliefs, autobiographical memory, arbitrary authored rules or costly deliberation. Such cognition is a different workload from locomotion and targeting.

For Open Legend, the research question is which aspects of individuality must persist, which answers can be reused, and which choices need reconsideration only when circumstances change. Those questions remain useful at hundreds of actors without requiring UEBS2's implementation. See [navigation and local motion](navigation-and-local-motion.md), [execution, rendering and browser constraints](execution-rendering-and-browser.md), and [Open Legend implications](open-legend-implications.md) for the broader evidence. This dossier selects no architecture or implementation.
