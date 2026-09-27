## 2A. Camera, audience, popularity, and the non-FPS argument

### What the evidence establishes—and what it does not

**The universal claim is false:** a first-person or over-the-shoulder camera is not a necessary condition for large-scale demand. The requested overhead, isometric, side-view and tile-based games have substantial measured Steam activity or disclosed sales. [MET-HD2](../references/sources-02.md#source-met-hd2) [MET-PZ](../references/sources-02.md#source-met-pz) [MET-SV](../references/sources-02.md#source-met-sv) [MET-TE](../references/sources-02.md#source-met-te) [MET-BG](../references/sources-02.md#source-met-bg) [MET-DOTA](../references/sources-02.md#source-met-dota)

**The age claim remains unproven here:** those counts do not identify Gen Z, children or any other age cohort. A subreddit called GenAlpha is not age verification. A platform’s overall audience does not establish the demographic composition of a particular experience. The defensible conclusion is that these perspectives can support large audiences—not that all young players are indifferent to presentation.

**The causal claim also remains open:** successes do not prove camera has no effect on conversion, attachment or audience size. These are survivors selected for comparison. Many visually similar games never broke out. Genre fit, clarity, input friction, price, platform, reputation and execution can confound a camera comparison.

### Four independent choices

| Dimension | Examples | Why the distinction matters |
|---|---|---|
| Camera | First person, over-the-shoulder, fixed overhead, movable tactical | Determines what the player can easily inspect and coordinate |
| Rendering/representation | Flat sprites, 3D models, mixed representations | Changes production and rendering choices; does not determine the game’s rules |
| Movement/topology | Free movement, tiles, lanes, navigation graphs, vertical space | Determines interaction possibilities independently of how the camera depicts them |
| Art and feedback | Pixel art, painted illustration, stylized 3D, effects, audio | Determines coherence, readability and atmosphere; simplicity is not absence of craft |

“2.5D” is used loosely in game discussion. In this report, Hades is classified by its isometric presentation; no inference about its exact renderer implementation is needed. Baldur’s Gate 3 is a movable 3D tactical/cinematic presentation, not a fixed flat sprite world. Fortnite is not an FPS merely because shooting is important.

### Compare the job the view performs

| Game/family | Relevant viewpoint | What the view makes useful | What OpenLegend should test |
|---|---|---|---|
| Hades / Hades II | Fixed isometric action presentation | Reading threats and effects while preserving fast movement | Can consequences and target affordances be understood during a busy scene? |
| Project Zomboid | Isometric survival | Rooms, routes, object relationships and danger under limited knowledge | Does an overhead view preserve actor-specific uncertainty rather than granting omniscience? |
| Stardew / Core Keeper | Top-down pixel/tile presentation | Place ownership, navigation, crafting and home/exploration contrast | Can the same world feel warm, personal and readable without cinematic complexity? |
| Terraria | Side-view 2D | Vertical excavation, discovery, construction and boss preparation | Does spatial structure create useful problems rather than decorative variety? |
| PoE / Diablo | Overhead action RPG | Positioning, group threats, loot and build feedback | Do generated effects communicate their actual mechanics without visual overload? |
| BG3 | Movable overhead/third-person hybrid | Tactical coordination plus expressive character scenes | Would portraits or focused interaction add intimacy without replacing the base camera? |
| League / Dota | Overhead 3D battlefield | Multiple actors, abilities, objectives and uncertainty | Is importance reflected in visual/audio prominence and reliable silhouettes? |
| Fortnite / Roblox | Third-person and varied experiences | Social identity, expression and recognizable shared activity | Can a friend understand what joining this particular world means? |
| PEAK | First-person cooperative predicament | Embodied uncertainty and immediate dependence on others | Which scenes genuinely benefit from bodily immediacy rather than a tactical overview? |

These are design interpretations of the documented products, not measured comparisons of camera effectiveness. Relevant source anchors are their case studies; the quantitative ledger keeps the popularity evidence separate.

### Practical direction for OpenLegend

My recommendation is to retain a readable overhead/isometric primary view while proving the default social/invention experience. It fits observation of several actors, work sites, effects and causal interactions. Do not infer from this that the engine should hard-code a two-dimensional ontology forever, or that a future different camera is free to add.

The relevant quality bar is not “does this look old?” It is: can a new player identify a person, understand a state change, select an intended target, see an action’s result and care about the scene? Hades, Riot’s clarity guidance and Core Keeper’s review provide different examples of craft doing that work. [HD3](../references/sources-01.md#source-hd3) [LOL1](../references/sources-02.md#source-lol1) [CRIT-CORE](../references/sources-03.md#source-crit-core)

Test actual inputs and display contexts: mouse, controller, small screens, overlapping characters, occluded targets and long interactions. Do not call a navigation misunderstanding a preference for FPS. Equally, do not excuse awkward selection because successful isometric games exist.

An embodied actor and the human’s camera should have a deliberate information contract. Showing a whole settlement for administrative inspection is different from teaching the player-character the contents of every room. A touch-only organism should not secretly navigate with the normal visual oracle. Those distinctions make perspective part of gameplay, not merely an art choice.

### A popularity audit, not a leaderboard of merit

The companion [popularity and economics ledger](../references/popularity-and-economics.md) verifies the supplied figures. Its main corrections are methodological: use a dated capture, distinguish current concurrency from daily peak, preserve Steam-only scope and do not estimate age, sales or profit from reviews.

The exact Newzoo claim and title-specific quarterly Roblox visit totals were not independently verified. They are explicitly left unresolved rather than replaced with similar-looking data. Most of the user’s broad scale claims are supported, but not all use a comparable unit or period.

### Three different kinds of audience evidence

**Market existence:** successful non-FPS games demonstrate that demand exists.

**Audience fit:** whether OpenLegend’s intended players prefer this experience requires target-player evidence.

**Product execution:** whether OpenLegend’s particular camera, controls and art communicate that experience requires tests of the actual implementation.

Do not skip the last two steps because the first is well established. Conversely, do not spend months rebuilding the camera because of an unsupported claim that all young players want shooters.

---
