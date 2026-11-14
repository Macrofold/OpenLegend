# BitCraft Online — systems, activities and world

Research cut: **14 November 2026**. [Dossier overview](../bitcraft-online.md) · [Reception](02-reception.md) · [Production and business](03-production-and-business.md) · [Technology and scale](04-technology-and-scale.md) · [OpenLegend lessons](05-openlegend-lessons.md).

## What kind of game this is

BitCraft makes developing a civilization its central progression activity. Players gather, process, build, transport, trade and specialize in a shared editable landscape. Its current official FAQ lists **12 professions, 10 progression tiers and six skills**, with no permanent profession lock. Players can establish a small home, contribute to a town or participate in an empire; combat is one activity among these rather than the organizing principle of the whole game. This study covers the Windows PC release distributed through Steam. The new 1.0 world opened on 13 November 2026. [Official FAQ](https://bitcraftonline.com/about) · [Steam](https://store.steampowered.com/app/3454650/BitCraft_Online/).

This chapter distinguishes current release documentation from earlier design explanations. A developer patch note establishes what the developer says shipped, not that the change has already produced its intended social or economic result. No first-hand playtest was conducted for this dossier, and one day is insufficient to judge the new world's durability.

## Three parallel scales of ambition

The 2023 design framework identifies three scales. They are intended as parallel interests with different endpoints, not a sequence every successful player must ascend. [A Game of Scales](https://bitcraftonline.com/news/a-game-of-scales).

| Scale | What the player is trying to accomplish | Relationship to other players |
| --- | --- | --- |
| Character | Become skilled, acquire useful equipment and collect things that express identity. | Cooperation can help without requiring organizational leadership. |
| Settlement | Create a home, workshop, village or useful town; maintain infrastructure and physical space. | Residents need services, while settlements need contributions and activity. |
| Empire | Coordinate territorial competition, political identity and prestige. | Larger organizations compete and negotiate. |

The original framework intended conflicts at one scale to avoid destroying another scale's experience. That is an ambition to evaluate, not a conclusion that the live game fully protects every casual resident. Infrastructure dependencies, permissions, upkeep and political incentives can make an optional scale effectively compulsory. The [reception chapter](02-reception.md) examines those tensions.

## Professions, skills and progression

### Professions have an economic role

The profession catalogue distinguishes resource acquisition from processing, with several roles spanning both. The following is the community catalogue cross-checked against the current official count; it is not a list of permanently exclusive character classes. [Professions](https://bitcraft.wiki.gg/wiki/Professions).

| Role | Representative work |
| --- | --- |
| Forestry | Harvest and cultivate trees; obtain wood and related materials. |
| Carpentry | Turn wood into components for equipment and construction. |
| Mining | Extract stone, ore and special materials. |
| Masonry | Process stone, clay and related construction materials. |
| Smithing | Process metals and manufacture metal products. |
| Foraging | Collect wild plants, fibers and other useful growth. |
| Tailoring | Process fibers and make cloth products. |
| Hunting | Obtain materials from animals. |
| Leatherworking | Process hides into usable leather and products. |
| Fishing | Obtain fish and associated materials through several activities. |
| Farming | Cultivate crops. |
| Scholar | Investigate, process knowledge and support research. |

The separate skill catalogue lists **Construction, Cooking, Merchanting, Monster Slaying, Sailing and Taming**. Cooking's move from profession to skill means the original 2023 profession list should not be reproduced as current. [Skills catalogue](https://bitcraft.wiki.gg/wiki/Skills).

The original design deliberately made specialties economically complementary and allowed players to change their focus. It also attempted to retain demand for novice work through lower-tier ingredients used in higher-tier production. This supports the fantasy of being a valued local specialist rather than performing an incidental crafting chore between fights. However, the same dependency can become repetitive labor if it creates demand without satisfying decisions. [Skills design blog](https://bitcraftonline.com/news/skills).

### Long progression and the difference between continuing demand and finite demand

The longevity design envisioned hundreds of hours toward a profession's soft cap, years across all professions and prestige beyond the main unlock progression. These are design targets, not retention measurements. It also distinguishes recurring consumption from demand that eventually fills up: replenishing consumed supplies can continue indefinitely, whereas finishing a building removes the immediate need to build it again. A mature economy therefore needs more thought than balancing the first week's gathering and construction rates. [Longevity](https://bitcraftonline.com/news/longevity).

**Assessment:** the useful question is what remains enjoyable after a player already owns the obvious upgrades. Raising material quantities can extend duration without providing another interesting choice. Social usefulness, expressive construction, exploration and varied activities need to carry some of the experience themselves.

### Persistence, returning players and world boundaries

The 1.0 release starts a fresh gameplay world; the preceding EA2 world remains separately accessible. The developer says no further wipe is planned. Account cosmetics and names have carryover provisions, but old-world character advancement is not equivalent to starting ahead in the new world. This is a persistence commitment, not evidence that any live service can guarantee indefinite operation. [1.0 Q&A](https://bitcraftonline.com/news/bitcraft-1-0-your-questions-answered).

For someone returning after months, “my account still exists,” “my character still exists,” and “my town still functions” are different questions. World boundaries, claim maintenance and changing dependencies need separate treatment; the evidence here does not justify promising that unattended property survives indefinitely.

## Inventory, production and equipment in concrete terms

The following mechanisms come from the public **1.0 release commit `85c972d8d9433560fb51a906424b74b7958ddf99`**. This is inspected implementation evidence, not a running-server test or the complete live content database. Exact recipe quantities, capacities, durations and probabilities should not be invented from generic handlers. [M01: source release][M01].

### Carrying capacity and access are several different constraints

An inventory separates ordinary-item pockets from cargo pockets, with different capacity values; unused ordinary space does not automatically hold cargo. Items consume volume within their pocket. The server distinguishes main inventory, toolbelt and wallet. Crafting and harvesting can use eligible **nearby deployed vehicles owned by the player**, excluding hidden or collected vehicles. A loaded cart therefore changes practical carrying capacity without granting access to every town container. [M02: inventory][M02].

Transfers check both endpoints, capacity, distance and permissions, and can move only the quantity that fits. Building storage requires appropriate access; barter stalls additionally check claim ownership/co-ownership. A deployed vehicle is its owner's inventory, with proximity rules unless that owner is mounted. Some cargo types cannot be stored in a building or vehicle. Hauling is consequently an access and logistics problem as well as a matter of travel time. [M03: stack movement][M03] · [M04: interaction permissions][M04].

### Three production paths

**Active crafting** validates the site, permission, knowledge, settlement technology and job ownership/public status. Starting a quantity consumes its multiplied ingredients. Productive actions require the relevant skill and tool, consume stamina, can wear tools and award experience. Speed affects action intervals; tool and skill power affect progress, with profession critical effects possible. A job owner can prepare work without being qualified to perform it; an underqualified helper cannot contribute. [M05: active crafting][M05].

Completion and ownership remain separate: the job's owner collects the result at the appropriate building with access permission. Helping does not automatically confer ownership of the output. [M06: collection][M06].

**Passive crafting** checks building function/tier, usage permission, settlement technology and a per-player job limit. Queuing withdraws ingredients; a free processing slot starts the recipe timer, otherwise the job waits. Item and cargo outputs have distinct processing slots. It is inaccurate to describe every craft as repeated manual work. [M07: passive queue][M07].

**Item conversion** uses another elapsed-time path, with inputs, stamina, location context and an optional tool requirement. The handler forbids conversion while swimming without a deployable. Conversely, it is inaccurate to say every production action requires a workstation. [M08: conversion][M08].

### Tools, equipment, rarity and resource ladders

Toolbelt validation checks tool type and the player's ability to use the relevant level/tier. Other equipment can require skill levels, achievements or knowledge, occupies defined slots/presets and updates character stats. [M09: tool validation][M09] · [M10: equipment][M10]. Exhausted durability can destroy a tool or convert it to a configured replacement; neither universal destruction nor universal repairability follows from this code. [M02: durability implementation][M02].

**Tier and rarity are distinct.** The official rarity design makes improvement a continuing material sink. [M15: rarity design][M15]. Community documentation lists Common through Mythic quality and describes retaining existing rarity, with a possible one-step improvement when advancing an existing tool's tier. Those are community-maintained rules, not a verified current probability table. [M16: rarity reference][M16].

The November 4 announcement removed prior-tier refined ingredients from ingots, bricks, cloth, leather, planks and study journals, moving the dependency into Settlement Research. It illustrates current-tier input demand with five Ferralith Ingots at tier one versus thirteen Luminite Ingots at tier five. These are the developer's specific recipe examples; they do not license extrapolating every recipe. Remaining same-item tier dependencies use one predecessor. [M17: refined-item announcement][M17]. The November 10 patch confirms shipment. [M18: release notes][M18].

## Activities within a career: more than one attention level

### Gathering, hunting and farming

Harvesting validates recipe-specific tool, skill, knowledge, stamina and optional input requirements. Progress consumes resource health, may wear the tool, generates configured item/cargo outputs and awards experience for productive contribution. Some recipes require empire control. Clearing a resource from a claim deliberately skips ordinary yield and experience. Exact yields and replenishment timing live in content data, not this general loop. [M14: extraction][M14].

October's hunting changes added traps that passively produce animal cargo, two-minute lures that repeatedly spawn huntable animals and reward damaging participants, and consumed arrow items that grant a longer-lived hunting-power benefit. This does not establish that every ordinary bow shot consumes one arrow. [M20: hunting update][M20]. Current farming's direct field workflow appears in the November changes below.

### Fishing

The July 2026 redesign deliberately supports different levels of involvement: communal timed fishing schools, searching for productive spots, passive nets and traps, opportunistic rare catches and active trophy encounters with counteracting abilities. A player can choose a social low-attention session or pursue a more demanding target. The same patch changed Traveler tasks from four-hour refreshes to **50 tasks per NPC per week**, with rerolls consuming allocations. [The Big Catch](https://bitcraftonline.com/news/patch-notes-the-big-catch).

This is more useful as a design reference than simply “make fishing relaxing.” It asks whether one identity can support different moods and schedules. The open question is whether the activities are enjoyable alternatives or whether their reward rates pressure everyone into the most efficient one.

### Mining and forestry

Mining's August update added changing quarry nodes, timed opportunities, a stamina-spending heavy swing, short prospecting discoveries and passive water collectors. This creates a mixture of route planning, occasional attention and cooperative opportunities around the same resource role. [No Stone Unturned](https://bitcraftonline.com/news/patch-notes-no-stone-unturned).

Forestry added fertile seeds with a short growth option and a longer, more passive maturation option, pickups that can chain into additional rewards, and brief cooperative harvesting opportunities after felling special trees. The update also introduced the Equous horse as a generalist mount, leaving room for other vehicles to retain stronger specialties. [Giddy Up](https://bitcraftonline.com/news/patch-notes-giddy-up).

### Animal care

Sagi birds have a sequence of trapping, domestication, ranch production and breeding. Care uses food, water or healing supplies; rarity affects production. The initial breeding rule consumes two parents and produces one offspring of equal or higher rarity. That qualification matters: this is an item-and-progression representation of animal husbandry, not evidence that each animal has an enduring autonomous life. [Feathers and Fur](https://bitcraftonline.com/news/patch-notes-feathers-and-fur).

### Construction and transport

Terrain is arranged as hexagonal pillars whose heights can change. The terrain-design explanation connects shaping, paving, routes, stamina and vehicle traversal: a route improvement can save repeated journeys, while large changes demand organized effort. Its anti-griefing intent is to make restoration toward the natural terrain easier than further distortion. Exact historical work estimates and traversal tuning should not be treated as current measurements. [Shaping the world](https://bitcraftonline.com/news/shaping-the-world).

The current store still presents terraforming, roads, bridges, boats, hauling and regional trade as core activities. The value of a road is therefore potentially social and economic, not merely decorative. [Steam](https://store.steampowered.com/app/3454650/BitCraft_Online/).

## Settlements, trust, ownership and economy

### Why private space matters inside a shared town

The housing design describes an early problem: requiring residents to share everything supported small trusted groups but made inviting strangers harder. Private homes and controlled access were introduced to preserve personal ownership within a larger shared settlement. Interiors can occupy more space than the exterior suggests while keeping a distinct address in the common world. This supports density without making every player use a different copy of the same neighborhood. The historical ambition of towns with hundreds of residents is not evidence of a demonstrated population or workload. [Claiming your slice of the world](https://bitcraftonline.com/news/claiming-your-slice-of-the-world).

**Assessment:** cooperation scales socially only when people can help without surrendering control of all their possessions. Permission design is therefore part of the gameplay, not merely an administrative safeguard.

### What changed immediately before 1.0

The November 10 patch reorganized several connected systems:

- Regional banks and market listings connect within a region, gated by tier-seven Townships; older banks become local stashes. Cross-region transport still matters.
- Cheaper **Homesteads** support profession stations but have fixed claims, exclude some township services and cannot switch back.
- Farming now means paving fertile soil, planting seeds, supplying suitable-tier fertilizer and water, waiting, then harvesting directly. Buckets remain usable.
- Claim stability changes, maintenance decreases, and empire sieges gain an eight-hour warning.

These are current developer-reported changes, not proof of their eventual effects. [Starfell Reawakened](https://bitcraftonline.com/news/patch-notes-starfell-reawakened).

The tradeoff is concrete. Connecting markets may improve the chance of finding a buyer while diminishing some local trading opportunities. Cheaper homes may support independent lifestyles while still requiring a functioning network of towns. Simplifying a production chain may remove drudgery while changing who earns a living supplying it. Reception and economic data after the change are needed to decide which effect dominates.

### Empires are not ordinary housing claims

Empires organize territorial strategy above the settlement level. The February 2026 overhaul replaced premium currency with earnable Hexite Energy for functional play, preplaced larger watchtowers and attempted to reduce repetitive supply work. Clockwork explicitly acknowledged a confused identity between paid cosmetics and endgame, tedious maintenance and difficult enforcement around blocked towers. It also acknowledged unequal group sizes as an unresolved competitive problem at that time. [Empire Overhaul](https://bitcraftonline.com/news/empire-overhaul) · [EA2 release notes](https://bitcraftonline.com/news/a-new-world-patch-notes).

The original distinction between symbolic empire borders and practical settlement ownership should be retained when reading old commentary. Likewise, the old premium funding system should not be described as today's functional empire rules. The [business chapter](03-production-and-business.md) covers the monetization history.

## Combat, failure and recovery

The April 11, 2025 combat-design explanation gives PvE a supporting role: threats in the wilderness, guarded resources, enemies and dungeons. It describes opt-in dueling, while wider siege PvP was a possibility under discussion. That historical explanation is insufficient evidence to label BitCraft an unrestricted player-killing sandbox or to describe every current siege rule. It also places conflict in attracting residents, providing useful services and competing for status as well as fighting. [Combat, Conflict, and Griefing](https://bitcraftonline.com/news/our-thoughts-on-combat-conflict-and-griefing-in-bitcraft).

The current attack handler validates start/impact timing, range, known abilities, per-action and global cooldowns, stamina and weapon type. Huntable animals use hunting weapons; other enemies use combat weapons, with content-defined tier requirements. Damage combines a weapon roll, strength, action multiplier, cadence and armor reduction; ordinary combat rolls accuracy against evasion, while hunting skips that step. One armor stage uses `armor / (armor + 2000)`, making 2,000 armor halve damage at that stage before other scaling. The ordinary combat critical flag in this routine is hardcoded false; profession criticals should not be generalized into combat critical hits. [M11: attack implementation][M11].

**Duels require consent:** the source opens a two-person vote with a 30-second window and unanimous threshold, starts the duel following an affirmative result and then permits the associated player targeting. Other targeting rules depend on content-defined matrices, so these handlers alone do not prove every possible PvP restriction. [M12: duel initiation][M12] · [M13: vote outcome][M13] · [M11: targeting][M11].

Current public source at commit `85c972d8d9433560fb51a906424b74b7958ddf99` provides a more precise death boundary. The death handler stops actions/combat, dismounts the character and drops its carried cargo object; it does not clear ordinary inventory. The respawn handler allows a home or local choice after a configured delay. Home revival restores health; local revival begins at 10 HP. Stamina/satiation reset, and configured temporary aggro immunity applies. This is static code evidence, not a reproduced live encounter. [Death handler](https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_death.rs) · [Respawn handler](https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_respawn.rs).

Do not add an exact revival wait or a current regeneration penalty from old forum descriptions without checking the corresponding configuration. The distinction between ordinary inventory and carried cargo also prevents a misleading “full loot death” summary.

## Quests, discovery and the authored world

### Onboarding and activity guidance

The EA2 update expanded introductory profession/skill quests and moved many rewards—such as housing, vehicles, pets and knowledge—into quest unlocks. [EA2 release notes](https://bitcraftonline.com/news/a-new-world-patch-notes). At 1.0, a recommended quest sequence and richer compendium relationships make systems easier to discover. The release also added a low-tier dungeon and public Hexite Reservoir events, plus further settlement balancing. These are documented features; the quality of the learning experience remains a playtest question. [1.0 patch notes](https://bitcraftonline.com/news/bitcraft-online-1-0-patch-notes).

### Setting and named figures

The setting is **Starfell**, where newly awakened players rebuild among ruins, artifacts and traces of an older civilization. The official site separates present-day Travelers from a collection of Ancient Journals. This establishes an authored past alongside the history players create by changing the world. [Official FAQ](https://bitcraftonline.com/about) · [Discover](https://bitcraftonline.com/discover).

| Named Traveler | Officially presented role |
| --- | --- |
| Rumbagh | Scholar |
| Svim | Singer |
| Heimlich | Chef |
| Brico | Constructor |
| Alesi | Keeper |
| Ramparte | Old Guard |
| Varu and Laru | Barber and Welder |

These roles are confirmed by the [official character index](https://bitcraftonline.com/discover). The full official stories were not extractable in this research; only their teasers were available.

Secondary character accounts give a useful but qualified example. Rumbagh is described as an artificial research assistant whose appetite for knowledge exceeds his social awareness. Svim preserves songs and stories, readily interrupts ordinary conversation with them, and hopes his serious companion will eventually join a ballad. Their contrast connects each character's function to a temperament and relationship. This is community-recorded lore, not proof of autonomous dialogue or memory in the game. [Rumbagh](https://bitcraft.wiki.gg/wiki/Rumbagh) · [Svim](https://bitcraft.fandom.com/wiki/Svim).

### How players encounter history

The July 2026 Uncharted Ruin activity placed Rumbagh at a research site, with scholar rewards and rare permanent-knowledge drops related to ancient factions. The developer said those rewards would later have other sources after the temporary region. [Shores of Summer](https://bitcraftonline.com/news/patch-notes-shores-of-summer). Community screenshots identify research concerning **Immortals, Futuremakers and Starseekers**, but the sources reviewed do not establish their complete relationships or chronology. [Participant's illustrated research account](https://note.com/tuyu_bit/n/n33ac9d0b383b?hl=en).

The Ancient Journals' seven titles include an expedition entry, a hymn, a lullaby and an ending account. Their official publication record demonstrates deliberate use of different narrative forms; it does not supply a verified account of the civilization's fall when the article bodies are unavailable. [Ancient Journal index](https://bitcraftonline.com/discover).

**Evidence boundary:** the dossier does not invent a pantheon, historical wars, cosmology or a precise timeline from suggestive names. The public code's lore-knowledge records establish stored knowledge as a system; they do not publish all the authored narrative. See [technology and scale](04-technology-and-scale.md).

## Mechanics coverage and uncertainty screen

This table prevents a broad feature list from silently implying systems that were not found. “Not established” means the inspected evidence does not support a description; it is not a claim that no such feature could exist.

| Area | What the evidence supports | What remains absent or uncertain |
| --- | --- | --- |
| Character creation and appearance | Starting appearance options, cosmetic collections and additional hair/facial-hair choices are documented. [1.0 notes](https://bitcraftonline.com/news/bitcraft-online-1-0-patch-notes) | A complete creation flow, playable-species choices and consequential background selection were not verified. |
| Attributes and progression | Profession power/speed/critical modifiers, equipment, levels and knowledge rewards exist. [Giddy Up](https://bitcraftonline.com/news/patch-notes-giddy-up) | Do not substitute a traditional strength/dexterity allocation or perk-tree model without evidence. |
| Classes and careers | Players can specialize and later pursue other professions. [FAQ](https://bitcraftonline.com/about) | A permanent class-selection system is not established. Economic dependence can still constrain practical freedom. |
| Quests and activities | Authored onboarding, unlock quests, repeatable tasks, gatherings, ruins, dungeons and events are documented. [EA2 notes](https://bitcraftonline.com/news/a-new-world-patch-notes) | Autonomous generated quests, an unrestricted dialogue planner and branching companion stories were not established. |
| Items, equipment and production | Distinct item/cargo capacity, active/passive/conversion production, public contributions and equipment gates are supported by the inspected source. [M02][M02] · [M05][M05] · [M07][M07] · [M08][M08] · [M10][M10] | Exact recipes and balance are version-dependent; the old funnel-up chain is no longer a universal rule. |
| Companions and animals | Pets, mounts, taming, ranching and breeding are documented. [Feathers and Fur](https://bitcraftonline.com/news/patch-notes-feathers-and-fur) | Persistent emotional relationships, autonomous party members, recruitment conversations and a simulation of individual animal psychology were not established. |
| Romance, marriage and family | No substantive system was established in the reviewed official mechanics, release notes or lore material. | Do not infer romance from social play, housing or character warmth. |
| Magic and supernatural abilities | Hexite has functional gathering, energy and territorial uses. [Empire Overhaul](https://bitcraftonline.com/news/empire-overhaul) | A general player spellcasting system or a verified account of “all magic is technology” was not established by primary sources. |
| Stealth, crime and policing | Griefing rules, claims and permissions regulate player conduct. [Combat/conflict design](https://bitcraftonline.com/news/our-thoughts-on-combat-conflict-and-griefing-in-bitcraft) | A stealth-awareness model, pickpocket career, criminal investigation or simulated legal system was not established. Moderation is not an NPC justice simulation. |
| Weather, seasons and ecology | Seasonal events and biome presentation exist; resource and animal activities have timed state changes. [Shores of Summer](https://bitcraftonline.com/news/patch-notes-shores-of-summer) | A broad autonomous ecosystem, climate simulation or offscreen world society comparable to OpenLegend's ambitions is not demonstrated. |
| Creation and modding | Players shape terrain/buildings; external planners and public-data tools exist. | These do not establish an unrestricted scripting system or popular full-game mod ecosystem. See [production and business](03-production-and-business.md#community-tools-and-the-modding-screen). |

## Eight constructed situations: what the systems mean in play

These are **constructed examples**, not observed sessions or player testimonials. Each uses documented rules and explicit circumstances; results involving other people or market demand remain contingent. Their purpose is to make the causal relationships reviewable.

### 1. A small-group home without running a city

**Intention:** two friends want a workshop and home. **Conditions:** they accept the Homestead restrictions above. **Actions:** choose that route, divide work and seek outside services. **Result:** a modest settlement is feasible at lower cost. **Next decision:** remain small or reconsider their location and organization. **Limit:** this does not eliminate dependency on towns. [Starfell Reawakened](https://bitcraftonline.com/news/patch-notes-starfell-reawakened).

### 2. The same fisherman on two different evenings

**Intention:** keep progressing without demanding the same concentration every session. **Conditions:** the relevant fishing activities have been unlocked. **Actions:** use a communal low-attention activity while talking with friends, then pursue trophy fishing on a focused evening. **Result:** the same profession supports different kinds of engagement. **Next decision:** choose enjoyment, income or advancement as tonight's priority. **Limit:** the documented alternatives do not prove their rewards are balanced or that the active mode feels good. [The Big Catch](https://bitcraftonline.com/news/patch-notes-the-big-catch).

### 3. A town invites an unfamiliar craftsperson

**Intention:** recruit help without risking every communal possession. **Conditions:** the town uses the documented housing and permission model. **Actions:** provide a personal space and appropriate shared access rather than treating membership as complete trust. **Result:** cooperation need not require merging all property. **Next decision:** expand responsibility as the relationship develops. **Limit:** this illustrates the design rationale; exact eviction, authority and dispute outcomes need current operational verification. [Claiming your slice of the world](https://bitcraftonline.com/news/claiming-your-slice-of-the-world).

### 4. A mountain shortcut becomes a public contribution

**Intention:** make repeated hauling less inconvenient. **Conditions:** a legal, traversable route improvement is feasible and enough players want to contribute. **Actions:** coordinate terrain work and paving, then use the improved route for later trips. **Result:** accumulated effort leaves a visible benefit others can use. **Next decision:** extend the route, protect it where permitted, or stop when the benefit is sufficient. **Limit:** the example does not assume exact current construction time, water-flow behavior or immunity from interference. [Shaping the world](https://bitcraftonline.com/news/shaping-the-world).

### 5. A scholar chooses discovery over another production run

**Intention:** investigate the past. **Conditions:** the player can use a Futuremaker's map. **Actions:** enter its mini-dungeon, complete a timed puzzle and harvest carvings. **Result:** exploration yields scholarly material. **Next decision:** process the discovery or explore again. **Limit:** this does not establish branching historical investigations or NPC understanding of discoveries. [Starfell Reawakened](https://bitcraftonline.com/news/patch-notes-starfell-reawakened).

### 6. A trader loses a journey, not their entire character

**Intention:** deliver carried cargo across dangerous terrain. **Conditions:** the character is defeated en route. **Actions:** choose local or home revival, then decide whether recovery is worthwhile. **Result:** the cargo drop creates a concrete setback without the inspected death handler clearing ordinary inventory. **Next decision:** recover, seek help, change the route or abandon the haul. **Limit:** this is derived from static handlers; cargo accessibility and recovery circumstances depend on the surrounding world and other rules. [Death](https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_death.rs) · [Respawn](https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_respawn.rs).

### 7. A novice finds a useful contribution

**Intention:** earn a place in the economy before mastering a profession. **Conditions:** a local buyer actually needs an accessible resource. **Actions:** specialize enough to supply it reliably, arrange a sale and decide whether to process more of the chain. **Result:** the novice's value comes from another player's demand rather than an arbitrary veteran level requirement. **Next decision:** deepen the specialty, become a supplier or change direction. **Limit:** interdependence does not guarantee a fair price, demand at every tier or freedom from repetitive subordinate work. [Skills design](https://bitcraftonline.com/news/skills) · [Current profession catalogue](https://bitcraft.wiki.gg/wiki/Professions).

### 8. A producer buys help without transferring the finished goods

**Intention:** finish a batch beyond the owner's productive skill. **Conditions:** the site is permitted and a qualified helper agrees. **Actions:** supply ingredients, create a public job, let the helper contribute timed work, then collect. **Result:** the helper earns work experience while output ownership stays with the initiator. **Next decision:** agree on payment, reciprocity or another job. **Limit:** the handler provides shared work and ownership, not an automatic employment contract. [M05: crafting][M05] · [M06: collection][M06].

## Selected source register

Links beside claims are the citation owners. This register explains how to use the most consequential evidence; related production and technical sources are registered in their respective chapters.

| Source | Date/type | Use and limitation |
| --- | --- | --- |
| [Official FAQ](https://bitcraftonline.com/about) | Current primary page; accessed 2026-11-14 | Current high-level offering; some logistical wording can lag newer posts. |
| [A Game of Scales](https://bitcraftonline.com/news/a-game-of-scales) | 2023-07-31, developer design | Original framework; distinguish intentions from outcomes. |
| [Skills](https://bitcraftonline.com/news/skills) | 2023-09-25, developer design | Interdependence rationale; profession list and cascading recipes have changed. |
| [Longevity](https://bitcraftonline.com/news/longevity) | 2023-10-30, developer design | Progression and economic theory, not retention data. |
| [Housing](https://bitcraftonline.com/news/claiming-your-slice-of-the-world) | 2023-11-27, developer design | Social trust, personal ownership and spatial-density reasoning. |
| [Terrain](https://bitcraftonline.com/news/shaping-the-world) | 2023-12-25, developer design | World-editing mechanisms and tradeoffs; historical numerical examples. |
| [EA2 notes](https://bitcraftonline.com/news/a-new-world-patch-notes) | 2026-02-26, primary release record | Implemented empire, quest and progression changes. |
| [Fishing](https://bitcraftonline.com/news/patch-notes-the-big-catch) | 2026-07-23, primary release record | Attention-level alternatives and weekly task change. |
| [November overhaul](https://bitcraftonline.com/news/patch-notes-starfell-reawakened) | 2026-11-10, primary release record | Major current-system corrections; too recent for outcome claims. |
| [1.0 notes](https://bitcraftonline.com/news/bitcraft-online-1-0-patch-notes) | 2026-11-13, primary release record | Release additions and fixes; no independent verification run here. |
| [Discover](https://bitcraftonline.com/discover) | Primary lore index, accessed 2026-11-14 | Names and publication structure; full story bodies unavailable. |
| [Community wiki](https://bitcraft.wiki.gg/wiki/Professions) | Secondary, mutable | Useful catalogues; check against current patches before trusting timings or recipes. |
| [Pinned public source](https://github.com/clockworklabs/BitCraftPublic/tree/85c972d8d9433560fb51a906424b74b7958ddf99) | Static implementation evidence | Precise code behavior where inspected; not a running-server measurement. |

### Mechanics source register

M01–M14 are pinned to the same 1.0 source release. They establish bounded server behavior; content-dependent values and live deployment remain separate questions. M15–M20 distinguish official designs, shipped changes and community guidance.

| Reference | Evidence owner | Use and limitation |
| --- | --- | --- |
| [M01][M01] | 1.0 release commit | Code snapshot, 2026-11-13. |
| [M02][M02] | Inventory implementation | Pockets, volume, nearby owned vehicles, durability handling. |
| [M03][M03] | Stack movement handler | Transfer validation and quantity constraints. |
| [M04][M04] | Inventory interaction helper | Ownership, permissions and distance checks. |
| [M05][M05] | Active crafting handler | Eligibility, consumption and contribution; not social compensation terms. |
| [M06][M06] | Collection handler | Finished-output ownership/access. |
| [M07][M07] | Passive-crafting queue | Slots, timers and prerequisites; durations are content-defined. |
| [M08][M08] | Item-conversion handler | Separate production path and context checks. |
| [M09][M09] | Tool validation | Tool type and use eligibility. |
| [M10][M10] | Equipment handler | Slots, requirements and stat updates. |
| [M11][M11] | Attack handler | Timing, targeting and damage; not a complete weapon catalogue. |
| [M12][M12] | Duel-initiation handler | Creation of consent vote. |
| [M13][M13] | Player-vote state | Starting a duel after its affirmative vote. |
| [M14][M14] | Extraction handler | Productive harvesting versus clearing; not exact yields. |
| [M15][M15] | May 2025 feature explanation | Rarity's design purpose; historical introduction. |
| [M16][M16] | Community rarity page | Quality names and upgrade guidance; mutable and secondary. |
| [M17][M17] | 2026-11-04 refined-item announcement | Specific recipe examples and motivation. |
| [M18][M18] | 2026-11-10 release notes | Confirmation and current overhaul; no outcome measurement. |
| [M19][M19] | 2025-04-11 combat design | PvE/duel intent; future ideas are not shipped features. |
| [M20][M20] | 2026-10-22 hunting update | Traps, lures and arrow items; later tuning may differ. |

[M01]: https://github.com/clockworklabs/BitCraftPublic/commit/85c972d8d9433560fb51a906424b74b7958ddf99
[M02]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/entities/inventory_state.rs
[M03]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/inventory/item_stack_move.rs
[M04]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/inventory/inventory_helper.rs
[M05]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player_craft/craft.rs
[M06]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player_craft/craft_collect.rs
[M07]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player_craft/passive_craft_queue.rs
[M08]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player_craft/item_convert.rs
[M09]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/static_data/tool.rs
[M10]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player_inventory/equipment_add.rs
[M11]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/attack.rs
[M12]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_duel_initiate.rs
[M13]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/entities/player_vote_state.rs
[M14]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/extract.rs
[M15]: https://bitcraftonline.com/news/early-access-key-new-features-pt-1
[M16]: https://bitcraft.wiki.gg/wiki/Rarity
[M17]: https://bitcraftonline.com/news/upcoming-refined-item-and-funnel-up-changes
[M18]: https://bitcraftonline.com/news/patch-notes-starfell-reawakened
[M19]: https://bitcraftonline.com/news/our-thoughts-on-combat-conflict-and-griefing-in-bitcraft
[M20]: https://bitcraftonline.com/news/patch-notes-autumn-takes-root
