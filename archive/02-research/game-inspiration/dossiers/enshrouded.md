# G145 — Enshrouded

**Full-pass research dossier; evidence cutoff: October 25, 2026.** The original September 27 pass is preserved and reconciled with the shipped 1.0 game. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [October refresh ledger](../research-progress-enshrouded-2026-10-25.md) · [Earlier research history](../research-progress.md). Research and explicitly labeled OpenLegend ideas, not runtime or design contracts.

Enshrouded is most useful as a study of **making a handcrafted RPG world physically editable without giving up authored geography**. Its terrain is voxel-based enough to dig, cut, build and terraform, yet the continent still has deliberate cities, towers, dungeons, quest routes and environmental storytelling. The strongest design seam is between **authored adventure** and **player-authored place**: explore to rescue people and find recipes/resources, then bring that capability home and physically reshape a sanctuary.

### Detailed reading routes

This dossier remains the complete game-level entry point. The supplements own the deeper evidence rather than duplicating it here.

| Question | Detailed owner |
| --- | --- |
| How do building, terrain, water, lore and native creation fit together? What can unofficial mods do? | [Building and creation](enshrouded/01-building-and-creation.md) |
| How did the game develop, and what do its audience and commercial figures establish? | [Development and commercial history](enshrouded/02-development-and-commercial-history.md) |
| What do current and historical players enjoy, dislike, return for or leave over? | [Player reception](enshrouded/03-player-reception.md) |
| What do rented servers, access permissions and world rules actually provide? | [Hosting and world governance](enshrouded/04-hosting-and-world-governance.md) |

## R01 — identity, current version boundary and player promise

German studio Keen Games develops and self-publishes Enshrouded. It entered Steam Early Access on **January 24, 2024** and **1.0 shipped on October 15, 2026**. The September dossier described Update 8 correctly for its date; that is now historical evidence. The current release includes the completed Embervale campaign/map announced for launch, while Keen continues to maintain and expand the game. [Launch confirmation](https://enshrouded.com/en-US/news/enshrouded-10-is-live-check-out-our-highlights-video) · [October 14 launch release](https://www.terminals.io/games/enshrouded/news/5100).

At the October 25 cutoff:

- **PC and PlayStation 5/PS5 Pro are released.** PC supports up to **16** players; PS5 supports up to **eight**. Platform-specific caps must not be collapsed into one universal number.
- **Crossplay is not available at launch.** Keen says it is being worked on without giving a release date. Xbox Series X|S is still planned for **spring 2027**.
- Existing PC owners receive 1.0 without buying the base game again; the launch FAQ supports continuing Early Access saves through conversion and also permits a voluntary fresh start. These are Enshrouded's product commitments, not OpenLegend compatibility requirements.
- The latest first-party patch located is **Hotfix 1.0.0.3, October 21, 2026**. Its crash, multiplayer-loading and migration fixes show that launch did not end maintenance; the notes are not proof of universal reliability.

[Launch release and platform limits](https://www.terminals.io/games/enshrouded/news/5100) · [Launch FAQ](https://enshrouded.com/en-US/news/enshrouded-launch-faq-early-access-reward-world) · [PS5 store](https://store.playstation.com/en-us/product/EP4137-PPSA32539_00-0013250200429445) · [Hotfix 1.0.0.3](https://enshrouded.com/en-US/news/changelog-for-hotfix-1003).

Eight major Early Access updates established the systems below. **Wake of the Water** (November 10, 2025) introduced simulated water and aquatic play; **Forging the Path** (April 21, 2026) rebuilt physical combat/skills and introduced Adventure Sharing v1. The [development chronology](enshrouded/02-development-and-commercial-history.md) covers every major update and distinguishes changing release targets from actual releases. The [building supplement's current boundary](enshrouded/01-building-and-creation.md) owns the concise account of 1.0's construction and progression changes.

The player's promise is intentionally more action-RPG/adventure-heavy than punishing-survival-heavy. You awaken as a **Flameborn** in the ruined kingdom of Embervale, explore a handcrafted fantasy continent swallowed in places by the deadly Shroud, rescue survivors, improve the Flame, fight bosses, acquire RPG builds/equipment, build elaborate settlements and reshape terrain—alone or cooperatively.

On the **Default** world rules, Enshrouded is much lighter on bodily survival than Green Hell or The Long Dark: food is primarily a **buff/loadout system**, not an always-on starvation clock. However, current World Settings include a **Survival** preset and a configurable **Starvation Mode** that can turn hunger/starvation on. The correct distinction is therefore "not mandatory in the default rules," not "the game has no starvation system." [World Settings](https://enshrouded.wiki.gg/wiki/World_Settings) · [Shroud guide](https://www.gamespot.com/articles/enshrouded-survive-shroud-effects-guide/1100-6520563/).

## R02 — player actions and major mechanics

### Character creation, attributes and open build identity

Players create a customizable Flameborn from presets and appearance options such as skin tone, hair, beard and eye color; after rescuing the Barber, appearance can be changed and additional cosmetic options unlocked. [Character Creation](https://enshrouded.wiki.gg/wiki/Character_Creation).

The character has six primary build attributes:
- **Constitution** → Health;
- **Spirit** → Mana;
- **Endurance** → Stamina;
- **Strength** → melee damage;
- **Dexterity** → ranged damage;
- **Intelligence** → magic damage.

XP from enemies/quests and other progression raises **Character Level**, which grants skill points; Shroud Roots and Elixir Wells also award skill points. Forging the Path rebuilt the tree around named archetype/path clusters, but **any character can buy connected skills regardless of a fixed class**. [Attributes](https://enshrouded.wiki.gg/wiki/Attributes) · [Skills](https://enshrouded.wiki.gg/wiki/Skills).

### The Shroud turns exploration into timed risk

Large low-lying/contaminated regions are covered by the **Shroud**. Entering starts a limited Shroud-time countdown; reaching safe air, interacting with qualifying time-restoration opportunities or improving the relevant progression extends/refreshes the expedition.

The early design created a simple tension: loot/explore before the timer expires. Update 6, **Thralls of Twilight**, deliberately deepened the Shroud with:
- overhauled visuals/topology;
- 100+ new/reworked points of interest;
- new enemies;
- curses/diseases;
- Shroud-exclusive resources/loot;
- Shroud Lairs;
- Gem Forges and weapon gems.

[Keen Update 6](https://enshrouded.com/en-US/news/enshrouded-thralls-of-twilight-update).

This turns the setting's signature fog from a boundary into an **alternative risk/reward ecology**.

### Flame Altars define player-authored territory

A **Flame Altar** establishes a base/build area. Improving the Flame expands or enables progression and lets the player push into more dangerous Shroud regions. Building/terraforming persistence is intentionally strongest inside player bases; world changes outside protected/persistent zones can reset.

That distinction solves a hard authored-world problem:
- allow dramatic digging/terrain destruction during play;
- preserve player homes;
- still let the designed world respawn/recover so shared servers do not become permanently mined-out ruins.

It also creates a freedom boundary discussed in the dated player evidence: "voxel world" does not mean every terrain edit everywhere is permanent. For **1.0's late-game Shroud reclamation, base Gem Forge and free-flight building**, see the [current construction boundary](enshrouded/01-building-and-creation.md); early-game restrictions must not be presented as permanent endgame limits.

### Voxel building and terraforming

Building is a recurring strength across the [historical and 1.0 reviews](enshrouded/03-player-reception.md), although precise placement and progression constraints divide players. Players can:
- place blocks/shapes with construction tools;
- carve rooms into hillsides;
- alter terrain;
- mix material block sets;
- use roofs, doors, windows, furniture and decorative props;
- renovate existing ruins inside a base;
- create tiny details through the voxel resolution rather than only snapping whole prefab walls.

Keen's proprietary **Holistic Engine** was specifically built/optimized for Enshrouded, and developers describe the world as procedurally assisted but deliberately hand-authored after generation. [FAQ](https://enshrouded.com/en-US/FAQ).

Pact of the Flame added first-person build-camera options, rotation on three axes for decorative props, and overgrowth editing. That does not establish arbitrary rotation of the structural voxel grid. The [building supplement](enshrouded/01-building-and-creation.md) traces the tools, placement limits, persistence, a complete creation workflow and their current extensions. [Pact of the Flame](https://enshrouded.com/en-US/news/enshrouded-pact-of-the-flame-update).

### Terrain destruction as exploration

The same voxel world enables:
- tunneling through terrain;
- mining resource veins;
- breaking structures/obstacles;
- creating stairs/paths with picks/explosives;
- physically changing a base's landscape.

The authored world prevents this from simply becoming Minecraft procedural emptiness: terrain editing is a tool for interacting with designed locations.

### Combat: melee, ranged and magic

Combat supports broad RPG archetypes rather than fixed classes:
- one- and two-handed melee;
- shields/wards and timed block/parry;
- bows and ranged builds;
- wands and staves/spells;
- mobility/utility skills;
- mixed builds.

Forging the Path overhauled physical combat and the skill tree; 1.0 extends the combat work into magic and enemy interactions. The September 23 article was a preview at the earlier research date; its release is now established by the October launch. Current reviewers still disagree about combat quality, so an expanded feature set is not a universal verdict on feel. [Mage/combat feature article](https://enshrouded.com/en-US/news/10-combat-changes-and-additions) · [Launch release](https://www.terminals.io/games/enshrouded/news/5100) · [Current reception](enshrouded/03-player-reception.md).

Players gain XP from enemies, exploration/quests and other activities, earn skill points and construct a build through a branching/open tree. Respec/reset support lowers the cost of experimentation.

The current tree also contains actual **stealth mechanics**, not merely "avoid enemies": crouching/sneaking can preserve enemy unawareness, **Sneak Attack** delivers a very large unaware-target multiplier, and Assassin-path skills such as **Silent Stride** improve sneaking movement. [Sneak Attack](https://enshrouded.wiki.gg/wiki/Sneak_Attack) · [Skills](https://enshrouded.wiki.gg/wiki/Skills). Stealth is still a secondary combat approach rather than a full detection-gadget/infiltration game.

### Equipment, rarity, upgrading and gems

Weapons/armor have RPG stats/rarities/perks. Update 6 added **Weapon Gems**:
- eligible higher-rarity weapons can have gem slots;
- gems drop from dangerous enemies;
- Gem Forges inside the Shroud allow slotting/removal/upgrading/recycling (see the progression exception above);
- gems add specific effects.

Forging the Path introduced/reworked gear upgrading as part of its progression overhaul. Loot therefore sits between authored rewards and a randomized rarity/perk economy rather than being entirely recipe-deterministic.

### Food is normally positive preparation, but Survival rules can enable starvation

Under Default-style rules, food supplies timed buffs to attributes/resources such as health, stamina and mana/spirit-related capability. The player chooses complementary meals before combat/exploration rather than eating solely to prevent a hunger meter from killing them.

Current World Settings can instead turn **Starvation Mode** on, with configurable time-until-starvation values. This lets the same content operate as a relaxed action-RPG/building game or a more conventional survival game without changing Embervale's map. [World Settings](https://enshrouded.wiki.gg/wiki/World_Settings).

### Rest and Comfort

Sheltered/rested conditions and a home's **Comfort** create a positive reward for furnishing/building. Better comfort extends the benefits of rest. The settlement is therefore mechanically valuable without requiring periodic base-defense raids.

Keen's FAQ describes enemies targeting players rather than dwellings. This explains the sanctuary-oriented design; it is not a guarantee that every object is immune to every damage or editing route. Permissions, player damage and base destruction must be checked separately. [FAQ](https://enshrouded.com/en-US/FAQ) · [Hosting and world governance](enshrouded/04-hosting-and-world-governance.md).

### Survivor rescue and crafting specialization

Progression sends the Flameborn to rescue/recover **survivor NPCs** who can be summoned/placed at the base and unlock specialized crafting/quest capabilities. Major crafting-survivor roles include blacksmith-, alchemist-, farmer-, carpenter- and hunter-like domains, later supplemented by additional NPC services such as barber/customization.

This creates a strong loop:

**explore world → rescue person → place them at home → gain recipes/stations/quests → build equipment/infrastructure → explore farther.**

The NPC is simultaneously a character, progression key and reason the base feels repopulated.

Later updates made this much more concrete than the initial dossier implied. Current survivors are divided into **Craftspeople, Assistants and Villagers**. They can roam a player-defined base radius, inspect points of interest, talk, take breaks, and follow a day/night cycle that includes sleeping in assigned sheltered beds; updates have repeatedly fixed their pathfinding and bed use. They still are **not autonomous colony workers** who mine, harvest or build the settlement for the player—their primary mechanical roles are crafting/services, quests, ambience and happiness/Flame requirements. [Survivors](https://enshrouded.wiki.gg/wiki/NPCs) · [Souls of the Frozen Frontier](https://enshrouded.wiki.gg/wiki/Souls_Of_The_Frozen_Frontier_Update).

### Crafting stations and distributed recipes

Crafting is intentionally distributed:
- some recipes are personal;
- many depend on a survivor;
- others depend on station/factory access;
- specialized resources/regions unlock further tiers.

The FAQ notes that when a character moves between worlds, **most station/NPC-dependent crafting recipes stay with the world rather than the traveling character**, while personal recipes/equipment/skills travel. [FAQ](https://enshrouded.com/en-US/FAQ).

This distinction is crucial to Enshrouded's multiplayer persistence model.

### Farming, animals, pets and domestic systems

Players can cultivate crops and maintain a real animal-husbandry layer. Current tameable wildlife includes several goats/deer-like creatures, yaks and capybaras; domestic animals need species-appropriate food and sheltered beds, can reproduce, and some produce crafting materials such as milk, wool or bristles. Cats and dogs are non-producing pets whose petting can grant a temporary health buff. [Animal Husbandry](https://enshrouded.wiki.gg/wiki/Animal_Husbandry).

Taming itself uses behavioral stealth: approach quietly, bait, stop when the animal becomes alert, pet while distracted, back off, and repeat. This makes animal care a genuine activity rather than decoration. These systems reinforce the sanctuary fantasy but still do not form a deep autonomous colony simulation.

### Glider, grapple and vertical traversal

The **grappling hook** interacts with designated anchors, while the **glider** converts high ground into long-distance movement. Ancient Spires/towers and discovered fast-travel points transform the handcrafted world into a network.

The combination is important:
- tower ascent gives authored challenge;
- summit gives map/fast-travel utility;
- leap + glide converts completion into a **new traversal affordance**.

### Dynamically simulated water (Wake of the Water)

Update 7 materially changed the simulation:
- lakes/ponds/open water;
- swimming and diving;
- underwater interactions;
- new Veilwater Basin;
- fishing;
- water containers with fill state;
- player-added/removed/redirection of water in bases;
- water gates;
- irrigation;
- water wheels powering crafting factories;
- rain collection;
- aquatic/amphibious AI/pathfinding.

[Keen Update 7](https://enshrouded.com/en-US/news/enshrouded-wake-of-the-water-update).

Keen documents persistence for player-created or redirected water inside bases; the authored overworld maintains stronger reset semantics. The [building study](enshrouded/01-building-and-creation.md) distinguishes these intended rules from documented water/migration failures.

Wake of the Water also added a full **fishing interaction**. Rods/bait have fishing-specific stats; hooked fish require the player to counter their movement while managing both fish and player stamina, and catches can include fish or other items. [Fishing](https://enshrouded.wiki.gg/wiki/Fishing).

### Difficulty customization

Later Early Access added granular difficulty/world settings. Both the preserved September evidence and the October refresh include praise for tuning challenge and pace. A setting can change a player's access to enjoyable activity without removing the underlying progression loop. See [dated player accounts](enshrouded/03-player-reception.md) and [what hosts can configure](enshrouded/04-hosting-and-world-governance.md).

### Adventure Sharing

Forging the Path introduced **Adventure Sharing v1**, a free in-game feature for uploading/downloading/interacting with user-created environments/worlds built through terrain editing, construction and placed objects. [Adventure Sharing terms](https://enshrouded.com/en-US/AdventureSharing_ToS) · [Keen overview](https://enshrouded.com/en-US/news/update-8-forging-the-path-adventure-sharing).

At 1.0, **Sparkworks** adds supported graph-based interactions between buildable objects; Keen's October 8 introduction illustrates levers/pressure plates connected to doors or trapdoors. Adventure Sharing distributes creations, while Sparkworks supplies interactions within the game's supported objects. Neither implies an unrestricted scripting engine, access to proprietary source code, or an official arbitrary-mod SDK. The [creation workflow and tool-boundary comparison](enshrouded/01-building-and-creation.md) explain what Keen provides and what creators still need to design, test and publish. [Sparkworks introduction](https://enshrouded.com/en-US/news/turn-your-build-into-an-adventure-with-sparkworks) · [Launch confirmation](https://enshrouded.com/en-US/news/enshrouded-10-is-live-check-out-our-highlights-video).

### Multiplayer/server model

Current PC supports:
- solo/offline;
- host co-op;
- dedicated servers;
- up to 16 players; the released PS5 version has its separate eight-player cap (R01).

Characters can move across worlds/servers while retaining:
- equipped/carried inventory;
- level/skills;
- some personal unlocks/map memory.

World-owned progression such as many crafting recipes/NPC availability remains local to the destination server.

This **portable character + persistent world** split is one of the game's most important ownership choices. Paid third-party hosting makes a world available without a friend leaving their own computer running; it does not by itself solve membership, permissions, shared loot or progression alignment. The [hosting supplement](enshrouded/04-hosting-and-world-governance.md) examines the supplied Nitrado precedent and separates verified host controls from proposed OpenLegend world policies.

### Useful absences

Current Enshrouded has no:
- **mandatory default** hunger/thirst loop (but World Settings can enable starvation);
- PvP mode as a core/planned game contract;
- permadeath default;
- deep NPC romance/affinity relationship system;
- recruitable combat-companion party built around named humanoid followers;
- autonomous RimWorld-style settlement labor simulation;
- conventional class lock at character creation;
- joinable political-faction reputation/territory campaign;
- procedural-every-run world layout.

Stealth, magic and NPC schedules are **present** and should not be listed as absences: the live skill tree has sneak-specific abilities, spells/mana are core build systems, and settlement survivors have day/night behaviors.

## R03 — items, resources, entities and composition

### Resource families follow geography

Wood, stone, ores/metals, plants, animal materials, Shroud-exclusive resources, water/fish and biome-specific materials form tiered crafting chains. Because Embervale is handcrafted, resource acquisition becomes geographic knowledge rather than only random spawn farming.

### Loot, rarity and reward acquisition

Exploration has a substantial loot layer rather than only deterministic crafting. World chests range from basic wooden containers to silver/gold/ornate chests; higher tiers can produce rare, epic or legendary weapons/armor, while elites, bosses and quests provide additional equipment/material rewards. [Lootable Chests](https://enshrouded.wiki.gg/wiki/Lootable_Chests).

Runes can come from enemies, chests or dismantled weapons and feed weapon enhancement/respec; legendary runes enable top-tier weapon enhancement and gem insertion. Weapon Gems then add another discoverable/upgradeable modifier layer. [Runes](https://enshrouded.wiki.gg/wiki/Runes) · [Legendary Runes](https://enshrouded.wiki.gg/wiki/Legendary_Runes) · [Gems](https://enshrouded.wiki.gg/wiki/Gems).

### Equipment is a build package

A loadout composes:
- weapon category;
- rarity/perks/upgrade state;
- optional gem;
- armor set/pieces;
- rings;
- food buffs;
- skill-tree choices;
- consumables/spells.

The same character can respec and change equipment instead of rerolling a class.

### The base is progression infrastructure

A mature base combines:
- Flame Altar;
- rescued survivors;
- crafting stations/factories;
- storage;
- farm/animals;
- water/power infrastructure in the post-Wake build;
- comfort furnishing;
- decorative identity;
- terrain alteration.

The base is both "home" and a **human-readable dependency graph** of what the player has unlocked.

### World and character are separate state containers

Items/skills can travel with a character between worlds while many survivor/station unlocks and world geography belong to that server. This enables a powerful high-level composition:
- persistent character identity;
- multiple social worlds;
- distinct shared-world progression.

It also introduces balance/social questions when a highly geared character visits a fresh server.

## R04 — progression, economy, death and return loops

### Progression has several parallel axes

1. character level / skill points;
2. gear rarity/upgrades/gems;
3. Flame level/base-area progression;
4. rescued survivor/crafting-station unlocks;
5. recipes/resources;
6. Shroud-time/access progression;
7. discovered fast-travel points/map knowledge;
8. building/farm/water infrastructure;
9. current Adventure Sharing/community creations.

This produces many reasons to explore beyond raw XP.

### Death is configurable and character-preserving

On **Default** difficulty, death drops backpack **materials** into a tombstone for recovery while the character respawns; World Settings can instead choose **Keep All** or **Lose All** item behavior. The character's level/build/world identity are not erased. [Death](https://enshrouded.wiki.gg/wiki/Death) · [World Settings](https://enshrouded.wiki.gg/wiki/World_Settings).

This keeps expedition risk while preserving RPG identity, and lets server owners decide whether corpse recovery is central to their world's contract.

### Resource reset versus persistent base

The overworld can repopulate/reset resources/terrain outside the protected base logic, while player bases persist. This lets shared groups mine/destroy the world without permanently exhausting the authored map.

### Economy is primarily materials and capability, with limited NPC exchange

The meaningful economy is:
- gathered materials;
- crafting time/stations;
- loot rarity;
- XP/skill points;
- upgrade resources;
- travel/risk;
- base storage and production.

**Runes** act as an important enhancement/respec resource. **1.0 adds gold coins for limited survivor purchases, mainly vanity**; this is not evidence of a player-run auction economy. [Current economy correction and source](enshrouded/01-building-and-creation.md). Materials, loot and world-owned crafting access remain central. Distinguish a coin sink at an NPC from freely priced player trade, automated settlement commerce or real-money purchases.

### Early Access itself is a progression layer

Eight major Early Access updates repeatedly redefined the systems before 1.0. Forging the Path reset/refunded skill trees because the tree's semantics changed. This is a useful distinction between:
- **save continuity**;
- **system continuity**.

Keeping a save does not mean every build decision can remain valid when the underlying rules are redesigned. This is historical product analysis; OpenLegend's [current development save policy](../../../../AGENTS.md#development-save-policy) forbids adding legacy support and is not changed by this example.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are constructed rules-based illustrations preserved from the September 2026 pass, not observed play sessions. They illustrate the relevant progression stage; 1.0 exceptions are identified where they change a case.

### Case 1 — the Shroud turns curiosity into a timer

**Intention:** loot a ruined structure visible deep in fog.  
**Conditions:** limited Shroud time, unknown route/enemies.  
**Actions:** descend, fight/search, watch timer and decide whether to continue another room or climb toward safe air.  
**Interaction:** the best loot/resources may exist only in the danger zone while death risks carried resources/time.  
**Result:** exploration asks "how much uncertainty can I afford before retreat?" rather than only "can I win the fight?"

### Case 2 — rescue a survivor to change the home

**Intention:** craft a new equipment tier.  
**Conditions:** required specialist survivor has not yet been recovered.  
**Actions:** follow their quest/location, clear the site, rescue/unlock them, summon/place them at a Flame-Altar base.  
**Interaction:** world exploration changes who lives at home; that person unlocks quests/recipes/stations.  
**Result:** an NPC rescue is both narrative and economic progression.

### Case 3 — restore a ruin instead of replacing it

**Intention:** make an abandoned village structure the permanent home.  
**Conditions:** location can be covered by a Flame Altar.  
**Actions:** place the altar, remove rubble, fill missing voxel walls, alter terrain, add roof/furniture.  
**Interaction:** building tools operate on authored architecture rather than requiring the player to flatten the site and start from a prefab grid.  
**Result:** the world's past remains visible inside player authorship.

### Case 4 — high ground becomes transportation infrastructure

**Intention:** reach a distant quest efficiently.  
**Conditions:** Ancient Spire/other height discovered, glider equipped.  
**Actions:** fast travel/climb to height, jump and glide toward target, use grapple where level geometry supports it.  
**Interaction:** a solved landmark permanently changes the cost of traversing its surrounding region.  
**Result:** exploration unlocks a future route, not just a one-time chest.

### Case 5 — food changes a boss build without starvation pressure

**Intention:** prepare for a high-damage encounter.  
**Conditions:** player has cooking options but no hunger death clock.  
**Actions:** select complementary meals/buffs for health/stamina/mana and build style.  
**Interaction:** eating is an affirmative optimization choice rather than meter maintenance.  
**Result:** the player can ignore food while decorating, then care deeply about food before combat.

### Case 6 — a weapon gem creates a reason to re-enter the Shroud

**Intention:** specialize a favored high-rarity weapon.  
**Conditions:** eligible gem slot; desired gem/upgrade materials are Shroud-linked.  
**Actions:** hunt dangerous Shroud enemies, recover a gem, locate/use Gem Forge, slot or upgrade it.  
**Interaction:** a normal RPG item-improvement desire drives environmental-risk exploration.  
**Result:** the signature world hazard can remain relevant after basic survival is solved. This example is stage-dependent; see R02.

### Case 7 — water turns decoration into machinery

**Intention:** build a functioning mill/production district.  
**Conditions:** Wake of the Water systems unlocked in a persistent base.  
**Actions:** add/redirect water, control flow with gates, drive a water wheel and connect the powered crafting factory's resource chain.  
**Interaction:** a visually expressive terrain/water feature also becomes production infrastructure.  
**Result:** building aesthetics and mechanical optimization converge rather than occupying separate modes.

### Case 8 — carry one character between two social worlds

**Intention:** join friends without abandoning a developed character.  
**Conditions:** character has levels/equipment from a personal world; friends run another server.  
**Actions:** load the same character into their world.  
**Interaction:** equipment/levels/personal memory travel, while their server's survivor/crafting/world progression remains local.  
**Result:** identity is portable but the destination world still has collective history.  
**Failure mode:** overgeared visitors can distort challenge/progression expectations if a group has not agreed on norms.

## R06 — survivors, enemies, social play and multiplayer progression

### Survivors make a dead world feel recoverable

The Flameborn rescues named survivors and places them in settlements. Current NPCs include **Craftspeople, Assistants and Townsfolk/Villagers**. They offer services/quests/crafting and now physically roam within configured areas, inspect props, talk, take breaks and sleep on a simple day/night schedule. [Survivors](https://enshrouded.wiki.gg/wiki/NPCs) · [Souls of the Frozen Frontier](https://enshrouded.wiki.gg/wiki/Souls_Of_The_Frozen_Frontier_Update).

This is lighter than simulation-heavy colony NPCs because they do not independently run production chains, choose strategic jobs or form deep relationship webs, but it is stronger than static menu stations because progression is embodied in people.

The transferable pattern is **capability as relationship/place**: "we found the blacksmith" is more memorable than "crafting tier 2 unlocked."

### Enemies are encounter/RPG actors, not long-memory agents

Scavengers, Shroud creatures, wildlife and bosses have combat behavior, patrol/awareness and encounter roles. Update 6 and later patches improve Shroud enemies and cover/pathing. There is no evidence of persistent individual enemy memory, player-joinable faction reputation or emergent diplomacy; do not project OpenLegend-style agency onto them. Keen's own product copy refers to rival creature factions, but the player does not negotiate/join them through a dynamic political-reputation layer.

### Co-op is cooperative, not PvP competitive

Keen explicitly says no core PvP is planned. The game assumes a group cooperating on one world. Dedicated servers allow the world to persist without one friend always hosting.

Early Access exposed a real social-design failure: launch quest progression was heavily server-wide, so one player could complete content while friends were offline. Keen publicly acknowledged the complaint in February 2024 and evolved quest/progression handling. [Quest progression statement](https://enshrouded.com/en-US/news/on-quest-progression).

The September 2026 Steam sample recorded both sides:
- positive players say late joiners can now repeat many quests/bosses and keep personal XP/log completion;
- negative players still object to shared loot/chest ownership and other ways one player's action can affect group experience.

This is useful evidence that **shared world** and **shared experience** are not the same design problem. The [October player sample](enshrouded/03-player-reception.md) and [hosting study](enshrouded/04-hosting-and-world-governance.md) distinguish current mechanisms from coordination complaints and historical quest behavior.

### Portable characters complicate fairness

The FAQ's cross-server character transfer is powerful social UX, but it creates soft governance:
- Can visitors bring late-game gear?
- Does the host want a fresh progression run?
- Who owns rare shared-world loot?

The system relies partly on friend-group norms rather than hard server purity.

## R07 — art, interface, controls, accessibility and feel

Enshrouded uses a bright high-fantasy look above the Shroud and oppressive fog/lighting below it. Large landmarks, vertical cliffs and ancient structures support glider-based navigation.

The voxel resolution is fine enough that buildings read more like hand-modeled fantasy architecture than chunky block worlds. This is central to the creative appeal: **editable does not have to look crude**.

Combat camera/lock-on/input have been recurrent criticism points, especially with groups of enemies/controller play. Forging the Path and the shipped 1.0 release revisit combat. September complaints remain historical evidence; the [October refresh](enshrouded/03-player-reception.md) finds more favorable current critic accounts alongside continuing player disagreement. A strong RPG/building loop does not establish universally satisfying action controls.

Difficulty is highly adjustable. One of the most-helpful all-time Steam positives is from an older player who specifically credits detailed difficulty controls with making the whole game playable/enjoyable. [Steam helpful positives](https://steamcommunity.com/app/1203620/positivereviews/?browsefilter=toprated&l=english).

### Music and spatial identity

Keen's official soundtrack release credits **Alex Röder, Armin Haas and Matthias Wolf**. Its large track list is explicitly organized around Embervale places, characters and danger states—examples include *The Ancient Spires*, *Melody of the Springlands*, *Into the Revelwoods*, *The Shroud Grows* and boss/POI cues. [Keen soundtrack announcement](https://enshrouded.com/en-US/news/the-enshrouded-original-soundtrack-is-now-available).

The official community reference says music loops are assigned to specific POIs/biomes and boss fights and are individual per player. This makes audio another geographic/state cue rather than an undifferentiated background album. [Music](https://enshrouded.wiki.gg/wiki/Music).

Keen's August 27 preview made **performance optimization**, including lower/mid-range PCs, a 1.0 goal. The release has since shipped, and October reviews report both improvements and unresolved failures. The October 21 maintenance notes substantiate continuing repair work without measuring its incidence. [Historical production update](https://enshrouded.com/en-US/news/were-still-cooking-for-10-heres-some-news-you-may-have-missed) · [Hotfix 1.0.0.3](https://enshrouded.com/en-US/news/changelog-for-hotfix-1003) · [Current reception evidence](enshrouded/03-player-reception.md).

## R08 — story, worldbuilding and player-authored narrative

The world of **Embervale** fell after its people mined/used magical **Elixir** and unleashed the corrupting Shroud. Flameborn were preserved so they could awaken after the catastrophe and reclaim what remains. [FAQ](https://enshrouded.com/en-US/FAQ).

Narrative delivery uses:
- **The Flame**, Craftspeople/other Survivors and found Lore as quest sources;
- primary quests that gate story/region progression and can reward NPCs, workshops or biome access;
- secondary/lore quests that can reward weapons, armor, materials or additional NPCs;
- ruins and crafted worldspaces;
- bosses/dungeons;
- environmental traces of settlements;
- progression through Shroud-afflicted regions.

The September pass recorded **148 quests** in the official community quest index. That dated count is preserved, not represented as the complete 1.0 total; authored questing is a substantial progression substrate. [Quests](https://enshrouded.wiki.gg/wiki/Quests).

The handcrafted map matters because story can be written into exact topology: a ruined town can tell a history, then later become the player's restored base.

The September story boundary was incomplete. Keen's October launch communication now describes the full Embervale campaign/map; completion does not establish that the world simulates an indefinitely evolving society. The [lore study](enshrouded/01-building-and-creation.md) covers named histories, peoples, places and conflicting in-world accounts, with spoiler and evidence boundaries. [Launch release](https://www.terminals.io/games/enshrouded/news/5100).

Adventure Sharing and Sparkworks add another authorship layer: players distribute places and design supported interactions within them. Their potential longevity depends on the quality and discoverability of what people create; it is not measured retention evidence.

## R09 — production, engine and Early Access process

Keen Games' experience on **Portal Knights** directly informed Enshrouded. In a 2024 developer interview, the team explains that it wanted:
- a much more advanced voxel building system;
- a continuous handcrafted world;
- stronger combat;
- freer class/build development;
- a shared place for adventures with friends.

[Press Play developer interview](https://pressplaynews.net/2024/06/28/developer-interview-enshrouded/).

Keen built/uses its proprietary **Holistic Engine**, specifically designed and optimized for Enshrouded. [FAQ](https://enshrouded.com/en-US/FAQ). A 2024 world-design AMA describes a hybrid authoring workflow: rough/sculpted foundations and procedural assistance are transformed through hand-placed voxel stamps and POI work. [Keen world-design recap](https://enshrouded.com/de-DE/news/enshrouded-world-design-team-reddit-ama-recap). The recap is evidence for the documented authoring workflow, not proprietary storage, networking or meshing internals.

A Gamescom-era interview reports the project beginning around **2019 with ~20 people** and reaching around **50 internal developers** by 2024, excluding external contributors. [Xbox-Gamer interview](https://www.xbox-gamer.net/news-xbox-interview---keen-games--enshrouded--a-la-gamescom_57429.html). By late 2025 creative director Antony Christoulakis told PCGamesN the team had approximately doubled from roughly 40 to roughly 80 while Enshrouded passed 4.5m players. These are dated interview snapshots, not a precise headcount ledger. [PCGamesN](https://www.pcgamesn.com/enshrouded/director-interview-1-0-future).

Keen self-publishes Enshrouded—the first Keen title it says it has published itself. [Keen history](https://www.keengames.com/about).

The [development supplement](enshrouded/02-development-and-commercial-history.md) owns the complete chronology, documented funding and team snapshots, release-target changes, tools and production limits.

### Early Access as active redesign

The game's Early Access was not just content accumulation:
- shared quest progression was publicly reconsidered after player feedback;
- difficulty options grew;
- Shroud gameplay was redesigned;
- simulated water changed traversal/building/AI;
- itemization/regeneration were rebalanced;
- the entire skill tree was rebuilt;
- existing character skill points were reset/refunded in Update 8;
- the combat work continued through the shipped 1.0 release.

This is a strong example of using Early Access to change **structural systems**, not merely append biomes.

## R10 — marketing, distribution, community and virality

Enshrouded was a standout Steam Next Fest demo before release. GameSpot reported it as the festival's most-played/most-wishlisted/daily-active demo context and covered its Jan. 24, 2024 Early Access launch. [GameSpot pre-launch](https://www.gamespot.com/articles/open-world-co-op-rpg-enshrouded-hits-steam-early-access-in-early-2024/1100-6518990/).

The game's marketing hook combines recognizable comparisons:
- Valheim-like co-op survival/building;
- Minecraft-like editable voxel terrain;
- Skyrim/action-RPG exploration/build variety;
- Zelda-like glider/vertical traversal.

The risk of those comparisons is "derivative survival game"; reviews often say its identity emerges from *integration* and quality rather than an unprecedented individual mechanic.

Keen created a public feature-feedback board soon after launch where players could submit/upvote ideas, while explicitly stating ranking was not a development promise. [GameSpot feedback coverage](https://www.gamespot.com/articles/enshrouded-lets-players-upvote-potential-new-features/1100-6520892/).

Construction is inherently viral:
- detailed castles/towns;
- renovation of ruins;
- terrain sculptures;
- water machinery;
- Adventure Sharing worlds and, from 1.0, supported Sparkworks interactions.

The game can circulate an artifact players **made**, not only gameplay clips.

## R11 — commercial and participation context

Enshrouded is a **premium released game** after nearly three years of Early Access. At the October 25 US Steam capture, the base game listed **$39.99**, temporarily discounted to **$35.99 through October 29**; optional purchases included the **$9.99 Deluxe Upgrade Pack** and **$7.99 soundtrack**. These are dated storefront prices, not weighted realized revenue per player. Keen also announced future free and paid content without disclosing a complete post-launch product schedule. [Steam storefront](https://store.steampowered.com/app/1203620/Enshrouded/) · [Launch release](https://www.terminals.io/games/enshrouded/news/5100).

Official early milestones:
- **1 million players in four days** (Jan. 29, 2024);
- **2 million in under a month** (Feb. 20, 2024);
- **3 million by Aug. 8, 2024**.

[Keen 1m](https://enshrouded.com/en-US/news/enshrouded-reaches-one-million-players) · [2m](https://enshrouded.com/en-US/news/enshrouded-surpasses-two-million-players) · [3m](https://enshrouded.com/en-US/news/enshrouded-hits-three-million-players).

Creative director Antony Christoulakis said in a late-2025 interview that the audience had reached **more than 4.5 million players**. This is developer testimony through an interview rather than an audited store-unit filing. [PCGamesN](https://www.pcgamesn.com/enshrouded/director-interview-1-0-future).

Keen subsequently announced **five million players** in January 2026, and **more than 5.5 million through Early Access** in the October launch communication. These are dated company audience claims. [Second anniversary](https://enshrouded.com/en-US/news/enshroudeds-road-to-release-2nd-year-anniversary-celebration) · [Launch release](https://www.terminals.io/games/enshrouded/news/5100).

"Players" is not automatically equivalent to net paid units, active users, concurrent users or revenue. The [commercial evidence and estimates](enshrouded/02-development-and-commercial-history.md) separately examine reported scale, third-party Steam estimates, methodology, coverage, costs and uncertainty. They support a strong demand outcome; private profit and retention remain undisclosed. A paid-server offer establishes an available business model, not the proportion of Enshrouded players who rent or the unit economics of an OpenLegend service.

The Early Access success financed team growth and a longer development scope. Keen's Jan. 2025 roadmap explicitly delayed 1.0 into 2026 because support let it make the game larger than originally planned. [2025 roadmap](https://enshrouded.com/en-US/news/enshrouded-roadmap-2025-anniversary-trailer).

That is both upside and schedule risk: commercial success can **expand the definition of done**.

## R12 — reception, written reviews and current player evidence

### October 25 refresh: shipped 1.0 and a defined player sample

The [reception supplement](enshrouded/03-player-reception.md) is the current evidence owner. Five substantive review bodies were read for this refresh: GamingBolt and CGMagazine on **1.0**, plus RPG Site, GameSkinny and But Why Tho? on **2024 Early Access**. The earlier IGN/Rock Paper Shotgun accounts below remain under their September provenance; this refresh does not claim to have re-read those bodies.

The recurring attraction is exploration that supplies a visible, personal home. Current critics are more favorable about combat than the earliest reviews, while players still disagree about combat, meaningful rewards, NPC usefulness, chores and stability. The supplement traces those reactions to specific interactions and distinguishes interpretation from measured causes.

The October 25 Steam storefront displayed **87% positive among 51,628 English reviews** and **81% among 4,209 recent reviews**, both Very Positive. The recent window covers the previous 30 days and straddles the release, so these figures are not clean before/after 1.0 cohorts. [Dated storefront](https://store.steampowered.com/app/1203620/Enshrouded/).

Direct testimony comprises **12 purposively selected reviews**, seven dated October 18–25 and five historical helpful reviews. Available routes were weekly helpful and all-time helpful positive/negative surfaces; explicit Most Recent and API routes were unavailable. Thus **recently dated helpful reviews** is the correct description, not a chronological newest-review sample. The supplement records authors, dates, playtime distinctions, links and access limits. None of these samples measures complaint prevalence or player retention.

### Five independent written Early Access reviews preserved from September

1. **IGN — Gabriel Moss, January 2024.** Praises high-fantasy art, huge world, crafting/building, character customization and overall compulsion; criticizes bugs, weak story/puzzles and clunky combat/movement. Its review is a 2024 Early Access snapshot, not a verdict on the current 2026 systems. [Accessible mirror](https://bacol.todayz.workers.dev/post-http-www.ign.com/articles/enshrouded-review).

2. **RPG Site — Junior Miyai, January 25, 2024.** Praises handcrafted environments/POIs and sees especially strong co-op potential, while noting solo friction and crafting/building QoL needs. The author explicitly did not test multiplayer in that review, a useful evidence limit. [Full review](https://www.rpgsite.net/review/15375-enshrouded-early-accessreview).

3. **Rock Paper Shotgun — Ollie Toms, January 24, 2024.** Calls the building system best-in-class for the genre and praises atmosphere/world surprise, while criticizing technical issues and an underwhelming/derivative premise. [Archived Steam/RPS feed](https://store.steampowered.com/news/posts/?enddate=1706112339&feed=rps).

4. **GameSkinny — Ashley Erickson, January 24, 2024.** Praises the breadth of RPG/survival/building/exploration and the Shroud as a timed risk zone; its review also emphasizes that food buffs rather than mandatory hunger distinguish the loop. [Full review](https://www.gameskinny.com/reviews/enshrouded-early-access-review-brave-the-fog/).

5. **But Why Tho? — January 24, 2024.** Praises onboarding, world scope, building and the Shroud's timed-dungeon feel, while discussing straightforward early combat. [Full review](https://butwhytho.net/2024/01/enshrouded-review/).

**Supplemental contrasting review index:** Metacritic's Early Access critic index preserves Eurogamer's critique that low consequences made survival insufficiently gripping, plus additional publications emphasizing strong building but repetitive travel/dull combat. The full Eurogamer page was not retrievable in the September pass, so only that indexed assessment is preserved. [Metacritic](https://www.metacritic.com/game/enshrouded/critic-reviews/).

### Historical Steam evidence — September 2026

The September pass inspected direct Steam review surfaces, including its then-current-week English reviews and **Most Helpful negative** bodies. These links are mutable; the original capture's statements below are preserved as historical findings, not independently recertified October observations. [English surface](https://steamcommunity.com/app/1203620/reviews/?filterLanguage=english) · [helpful negatives](https://steamcommunity.com/app/1203620/negativereviews/?browsefilter=toprated&l=english).

**Positive themes**
- handcrafted world/exploration;
- voxel building freedom;
- flexible difficulty;
- glider/traversal and RPG progression;
- current multiplayer quest replayability;
- ability to bring one character between worlds.

A September positive explicitly praised how characters can move between solo and friend servers while many quests can be repeated by late joiners. [Steam reviews](https://steamcommunity.com/app/1203620/reviews/?filterLanguage=english).

**Negative/mixed themes**
- performance/crashes immediately before 1.0;
- controller/lock-on friction;
- combat repetition;
- crafting-station/NPC/menu sprawl;
- loot/stat progression not always feeling rewarding;
- disagreement over whether altar-bound persistent building/quest gating feels like genuine sandbox freedom;
- co-op shared-loot/social-state friction.

[Recent negatives](https://steamcommunity.com/app/1203620/negativereviews/).

These were qualitative samples, not prevalence estimates. They show how the September experience differed from 2024 reviews that preceded simulated water, the new skill tree and Shroud overhaul. Use the October supplement for current version-qualified testimony.

### Durable tensions

**Freedom versus authored progression.** Players can reshape bases dramatically, but story/NPC/crafting gates and base persistence rules constrain the sandbox.

**Chill survival versus insufficient stakes.** Removing starvation broadens accessibility and keeps focus on RPG/building; survival purists can experience it as low-pressure.

**Shared world versus individual experience.** Dedicated co-op is a major strength, but quests/loot/progression need explicit ownership semantics.

**Feature growth versus performance.** Water, richer Shroud, more AI and huge builds expand the interacting workload. Optimization was a stated 1.0 goal, and current reports remain mixed. The research does not isolate which subsystem causes a player's failure or benchmark many-player scale.

## R13 — transferable inspiration and limits for OpenLegend

### 1. An authored world can still be physically editable

Enshrouded's most important lesson is that **handcrafted narrative geography and voxel agency are not mutually exclusive**. Preserve authored POIs/topology at the world layer while letting player-owned areas accept deep edits.

For OpenLegend:
- distinguish canonical world state;
- owned/persistent player modifications;
- temporary/destructible local state;
- reset/recovery semantics.

Do not make every shovel action a permanent database obligation.

### 2. Persistence boundaries should follow meaning

Base terrain/water persists because it expresses player intent. Randomly mined overworld terrain can recover because it is primarily resource/interaction state.

This is directly relevant to large agent worlds: persist **meaningful human/agent history**, not every incidental physics mutation forever.

### 3. People make unlocks memorable

Rescuing a blacksmith/alchemist and bringing them home is stronger fiction than unlocking a crafting menu node. OpenLegend can attach capability to **actors, institutions and places** so progression also changes the social world.

### 4. Remove survival chores that do not support the fantasy

Enshrouded keeps food but makes it a preparation buff system. The question is not "does a survival game need hunger?" but "what decisions does hunger create?"

OpenLegend should require needs only when they generate relationships, planning or consequences—not because the genre expects bars.

### 5. Let mastery convert geography into infrastructure

Spire → fast travel → glider is a beautiful sequence: learn/climb the world, then permanently lower future travel cost.

OpenLegend can make roads, portals, mounts, favors, maps and social access convert exploration into **new connectivity**.

### 6. Portable identity + world-owned state is a useful multiplayer split

Characters keep identity/equipment/skills across servers; worlds retain people/stations/collective history.

For a future OpenLegend or Macrofold-backed hosting design, the research suggests evaluating ownership explicitly:
- actor-owned state;
- world-owned state;
- relationship state;
- portable knowledge;
- non-portable world consequences.

### 7. User-created worlds are a natural extension of expressive systems

Adventure Sharing is only possible because the game's build/terrain tools already produce meaningful artifacts. OpenLegend's extensibility should similarly aim for systems where player invention can become **content other people inhabit**, not only configuration files.

### 8. Released-game continuity can preserve intent when systems change

Forging the Path refunded/reset skill points when the tree changed. Keeping old node IDs merely to avoid touching saves would have preserved data but broken meaning.

For a released game with supported customer saves, a useful question is whether an old decision's **intent** can survive a changed rule; refunding and rechoosing is one documented alternative. This is comparative research. OpenLegend's [development save policy](../../../../AGENTS.md#development-save-policy) currently forbids legacy readers, migrations, adapters and compatibility-only paths. Nothing in this dossier authorizes them, or makes unrestricted cross-world transfer an accepted OpenLegend contract.

### What not to copy automatically

- altar boundaries unless OpenLegend needs the same persistence solution;
- unrestricted cross-world powerful-character transfer without governance;
- dozens of crafting stations if they create UI/admin friction;
- quest gating as a substitute for emergent goals;
- voxel visuals/assets, names, lore or protected Enshrouded content;
- a console, third-party mod or older-version capability treated as universal current behavior;
- Enshrouded's released-product migration obligations treated as permission to change OpenLegend's development policy;
- small-group co-op evidence treated as validation for a many-player shared world.

## R14 — sources, preservation, route and requirement map

### Prior-owner / preservation check

The September 27 pass originally added G145 after finding no earlier dedicated chapter or mechanics study. The October refresh compared this existing dossier in full, preserved its eight worked interactions, source history and useful examples, and corrected current facts in place. The current boundary is **1.0 released October 15; Hotfix 1.0.0.3 October 21**. Xbox remains announced for spring 2027. The four linked supplements extend the same owner with building, production/economics, reception and hosting evidence; they do not certify unrelated dossiers or the packet-wide reconciliation.

No embedded video/trailer is represented as watched. Text transcripts/pages were used where available.

### Annotated source register

**S01 — Keen Enshrouded FAQ, updated Jan. 21, 2026.** Primary product rules: genre, 16-player PC co-op, proprietary Holistic Engine, dedicated servers, no current PvP, handcrafted/procedural authoring split, cross-server character/world ownership.  
https://enshrouded.com/en-US/FAQ

**S02 — Keen, 2025 roadmap.** Primary explanation that scope expansion pushed 1.0 to 2026.  
https://enshrouded.com/en-US/news/enshrouded-roadmap-2025-anniversary-trailer

**S03 — Keen, Update 6 Thralls of Twilight, May 13, 2025.** Primary Shroud overhaul, weapon gems, new POIs/enemies, survivor/base changes.  
https://enshrouded.com/en-US/news/enshrouded-thralls-of-twilight-update

**S04 — Keen, Wake of the Water, Nov. 10, 2025.** Primary simulated-water, Veilwater, swimming/diving, fishing, water-power/crafting and level-cap expansion.  
https://enshrouded.com/en-US/news/enshrouded-wake-of-the-water-update

**S05 — Keen, Forging the Path, Apr. 21, 2026.** Primary historical final Early Access major update, physical combat/skill-tree/gear overhaul and Adventure Sharing v1.  
https://enshrouded.com/en-US/news/enshrouded-forging-the-path-is-live

**S06 — Keen Adventure Sharing terms/overview, Apr. 2026.** Primary definition of free sharing/upload/download of built/terraformed environments.  
https://enshrouded.com/en-US/AdventureSharing_ToS  
https://enshrouded.com/en-US/news/update-8-forging-the-path-adventure-sharing

**S07 — Keen, 1.0 release-date reveal, Jun. 25, 2026.** Primary announcement of the October 15 target, still future at the September capture and subsequently shipped; retained as release-history evidence.  
https://enshrouded.com/en-US/news/enshrouded-10-release-date-reveal

**S08 — PlayStation Store Enshrouded.** First-party platform store for the released October 15 PS5 edition and eight-player console metadata; current product URL is also cited in R01.  
https://store.playstation.com/en-us/concept/10016067

**S09 — Keen, Aug. 27 and Sep. 23, 2026 1.0 updates.** Primary pre-release production/performance and mage/spell previews. Historical intent at publication; the October launch sources establish the subsequent release, without proving every performance goal was achieved.  
https://enshrouded.com/en-US/news/were-still-cooking-for-10-heres-some-news-you-may-have-missed  
https://enshrouded.com/en-US/news/10-combat-changes-and-additions

**S10 — Keen, February 9, 2024 quest-progression statement.** Primary acknowledgement of server-wide quest progression friction and co-op design intent.  
https://enshrouded.com/en-US/news/on-quest-progression

**S11 — Keen official player milestones.** Primary 1m/2m/3m player counts and dates.  
https://enshrouded.com/en-US/news/enshrouded-reaches-one-million-players  
https://enshrouded.com/en-US/news/enshrouded-surpasses-two-million-players  
https://enshrouded.com/en-US/news/enshrouded-hits-three-million-players

**S12 — Press Play Media developer interview, Jun. 28, 2024.** Developer account of Portal Knights learnings, handcrafted continuous world, voxel building, free builds/combat and design goals.  
https://pressplaynews.net/2024/06/28/developer-interview-enshrouded/

**S13 — Keen world-design AMA recap, December 19, 2024.** Developer evidence on voxel-world authoring process and handcrafted POI/topology workflow. The refresh retrieved the primary page (English answers under a German-localized URL); the earlier mirror remains a historical route.  
https://enshrouded.com/de-DE/news/enshrouded-world-design-team-reddit-ama-recap
https://devtrackers.gg/enshrouded/p/ee9fa85c-enshrouded-world-design-team-reddit-ama-recap

**S14 — Keen Games history/about.** Primary self-publishing/studio history.  
https://www.keengames.com/about

**S15 — PCGamesN Antony Christoulakis interview, late 2025.** Developer testimony for 4.5m+ player scale and approximate team growth.  
https://www.pcgamesn.com/enshrouded/director-interview-1-0-future

**S16 — IGN/Gabriel Moss, Jan. 2024 Early Access review.** Full body available through accessible mirror; building/world/RPG praise and story/combat/bug criticism.  
https://bacol.todayz.workers.dev/post-http-www.ign.com/articles/enshrouded-review

**S17 — RPG Site, Junior Miyai, Jan. 25, 2024.** Full Early Access review; handcrafted world, solo/co-op caveat, crafting/building QoL.  
https://www.rpgsite.net/review/15375-enshrouded-early-accessreview

**S18 — Rock Paper Shotgun, Ollie Toms, Jan. 24, 2024, accessible via Steam/RPS feed.** Full/archived review route; best-in-class building, atmosphere versus technical/premise reservations.  
https://store.steampowered.com/news/posts/?enddate=1706112339&feed=rps

**S19 — GameSkinny, Ashley Erickson, Jan. 24, 2024.** Full Early Access review; Shroud timer, RPG/survival/build loop and food-as-buffs.  
https://www.gameskinny.com/reviews/enshrouded-early-access-review-brave-the-fog/

**S20 — But Why Tho?, Jan. 24, 2024.** Full Early Access review; onboarding/building/Shroud/combat account.  
https://butwhytho.net/2024/01/enshrouded-review/

**S21 — Metacritic Early Access critic index.** Supplemental indexed criticism retained from September; used where original bodies (for example Eurogamer in that pass) were not retrievable.  
https://www.metacritic.com/game/enshrouded/critic-reviews/

**S22 — Steam Community September 2026 surfaces.** Preserved historical qualitative evidence for the then-live build, performance, combat/control, co-op, difficulty and building/progression tensions. Mutable routes do not reproduce a fixed September archive; current sampling and individual identities are in the reception supplement.  
https://steamcommunity.com/app/1203620/reviews/?filterLanguage=english  
https://steamcommunity.com/app/1203620/negativereviews/  
https://steamcommunity.com/app/1203620/positivereviews/?browsefilter=toprated&l=english

**S23 — Keen Hot Fixes index / Hotfix #42 v0.9.1.2, June 29, 2026.** Primary latest live patch located in the September audit; preserved as the final Early Access maintenance boundary observed then. It is superseded for current-state purposes by S31.  
https://enshrouded.com/en-US/news/category/hot-fixes

**S24 — Official Enshrouded Wiki: Character Creation, Attributes, Skills and Death.** Community operational references for appearance customization, six primary attributes, open skill paths/sneak mechanics and configurable tombstone item loss.  
https://enshrouded.wiki.gg/wiki/Character_Creation  
https://enshrouded.wiki.gg/wiki/Attributes  
https://enshrouded.wiki.gg/wiki/Skills  
https://enshrouded.wiki.gg/wiki/Death

**S25 — Official Enshrouded Wiki: Quests, Survivors and Souls of the Frozen Frontier.** Community quest/reward/NPC categories and simple day/night survivor behaviors.  
https://enshrouded.wiki.gg/wiki/Quests  
https://enshrouded.wiki.gg/wiki/NPCs  
https://enshrouded.wiki.gg/wiki/Souls_Of_The_Frozen_Frontier_Update

**S26 — Official Enshrouded Wiki: World Settings, Animal Husbandry and Fishing.** Community starvation/death configuration, animal/pet domestic systems and fishing interaction.  
https://enshrouded.wiki.gg/wiki/World_Settings  
https://enshrouded.wiki.gg/wiki/Animal_Husbandry  
https://enshrouded.wiki.gg/wiki/Fishing

**S27 — Official Enshrouded Wiki: Lootable Chests, Runes, Legendary Runes and Gems.** Community loot-rarity and item-enhancement economy.  
https://enshrouded.wiki.gg/wiki/Lootable_Chests  
https://enshrouded.wiki.gg/wiki/Runes  
https://enshrouded.wiki.gg/wiki/Legendary_Runes  
https://enshrouded.wiki.gg/wiki/Gems

**S28 — Keen, Enshrouded Original Soundtrack, Feb. 2, 2024.** Primary composer credits and place/state-oriented soundtrack list.  
https://enshrouded.com/en-US/news/the-enshrouded-original-soundtrack-is-now-available

**S29 — Keen launch confirmation, October 15, and launch press release, October 14, 2026.** Primary shipped 1.0/platform boundary, player milestone and price/content model. The release is publisher communication, not independent reception. Accessed October 25.  
https://enshrouded.com/en-US/news/enshrouded-10-is-live-check-out-our-highlights-video
https://www.terminals.io/games/enshrouded/news/5100

**S30 — Keen launch FAQ, October 13, 2026.** Primary no-repurchase, save-continuation and crossplay boundary. Accessed October 25; its released-product continuity policy does not apply to OpenLegend development.  
https://enshrouded.com/en-US/news/enshrouded-launch-faq-early-access-reward-world

**S31 — Keen Hotfix 1.0.0.3, October 21, 2026.** Latest shipped patch located at the October 25 cutoff. Primary documented fixes and limitations, not a benchmark or population estimate.  
https://enshrouded.com/en-US/news/changelog-for-hotfix-1003

**S32 — Keen Sparkworks introduction, October 8, 2026.** Primary supported object-interaction authoring description, subsequently released at 1.0. Text inspected; embedded video not watched.  
https://enshrouded.com/en-US/news/turn-your-build-into-an-adventure-with-sparkworks

**S33 — Steam storefront and current reception sources, accessed October 25, 2026.** Dated prices/review aggregates; five freshly read substantive reviews and 12 identified player accounts are documented in the [reception source owner](enshrouded/03-player-reception.md). English versus recent scopes and unavailable Most Recent/API routes remain explicit.  
https://store.steampowered.com/app/1203620/Enshrouded/
https://gamingbolt.com/enshrouded-1-0-review-finally-feels-complete
https://www.cgmagonline.com/review/game/enshrouded-1-0-pc-review/

**S34 — Linked specialist source registers, October 25, 2026.** The supplements annotate the additional release chronology, economic estimates, construction/lore/tool documents, and provider/server sources. Use their dates, definitions and access limits; this entry does not independently recertify every historical community reference.  
[Building/creation and R15](enshrouded/01-building-and-creation.md) · [Development/economics](enshrouded/02-development-and-commercial-history.md) · [Hosting/governance](enshrouded/04-hosting-and-world-governance.md)

### Suggested reading route

1. Read **R01 and S29–S31** for the actual released version and platform limits.
2. Use the [building study](enshrouded/01-building-and-creation.md) for construction, water, current progression exceptions, lore and a creator workflow; then S04/S03 for the major water/Shroud changes.
3. Read the [reception study](enshrouded/03-player-reception.md) for 1.0 criticism and dated player accounts. Use S16–S20 and the preserved September sample as history, with their access/version limits.
4. Read the [hosting study](enshrouded/04-hosting-and-world-governance.md) for rental, membership and rules. S10 explains the early quest-progression failure and developer response.
5. Read the [development/commercial chronology](enshrouded/02-development-and-commercial-history.md) for all eight updates, scope growth, production evidence and bounded estimates. S07–S09 record former promises, not today's release status.
6. Use R13 for OpenLegend interpretation; all such lessons remain proposals subject to current project policy.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | shipped 1.0/current patch/platform and crossplay boundaries |
| R02 | Shroud, building, terrain, combat, gear, food, survivors, water, multiplayer |
| R03 | resource/equipment/base/state composition |
| R04 | progression, persistence, economy, death and migration |
| R05 | eight worked interactions |
| R06 | survivors/enemies/co-op/shared progression |
| R07 | art/UI/accessibility/control/performance |
| R08 | authored world + player authorship |
| R09 | Holistic Engine, Portal Knights lineage, team; complete update chronology in development supplement |
| R10 | Next Fest, feedback board, build virality |
| R11 | dated milestones/current commercial structure; scoped estimates, costs and uncertainty in development supplement |
| R12 | preserved historical reviews; five freshly read review bodies and identified October/historical player sample in reception supplement |
| R13 | transferable patterns/limits |
| R14 | source register, preservation, route and map |
| R15 | PC external-mod applicability finding and bounded tool evidence in building supplement |
| October 13 amendment | economics: development supplement; enjoyment/replay: reception and building supplements; lore/creator workflow: building supplement; rental/access tradeoffs: hosting supplement |

### Evidence limits

- No game was installed or executed; no server, mod, multiplayer-scale or performance benchmark was performed. Constructed workflows are labeled as such.
- No video/trailer is represented as watched. Written primary sources can establish a feature independently of an embedded demonstration.
- **1.0 shipped October 15, 2026.** The current maintenance boundary located is **Hotfix 1.0.0.3, October 21**. Xbox and crossplay plans remain distinct from shipped support.
- Historical January 2024 and September 2026 evidence remains explicitly version-limited. Some original review/written-source routes were mirrors or indexes; the current supplement states which bodies were freshly retrieved.
- The current Steam sample comes from available helpful surfaces; Most Recent/API routes were unavailable. It is qualitative, English-accessible and purposively contrasting, not representative or causal.
- Player milestones, estimated Steam spending, receipts, profit and retention are different measures. The development supplement labels estimates and their weakest inputs; no private result is invented.
- Detailed current construction changes have one concise owner in the building supplement. Exact balance/drop/skill values can change; this dossier emphasizes mechanisms and dated version boundaries.
- Official-community wiki pages are operational references, not substitutes for first-party release/platform statements or evidence of proprietary implementation.
- Paid hosting demonstrates an available offering. Provider marketing, a small Reddit discussion or the existence of a mod tool does not establish buyer conversion, representative demand, profitability or widespread adoption.

## R15 — external PC mods: applicability uncertain

**Gate: uncertain, PC, October 25, 2026.** The refresh found a mixed Nexus catalog and maintained unofficial loaders/editor projects beyond native building. Those demonstrate tools and authorship; the available evidence does not yet establish sustained community **use** strongly enough to certify a popular modding ecosystem. Native Adventure Sharing and Sparkworks do not themselves satisfy this gate.

The [building supplement](enshrouded/01-building-and-creation.md) owns the bounded findings: EML, Shroudtopia, ShroudForge, their author-documented workflows and version limits, plus a concrete withdrawn-tool example. No tool was installed or tested. These facts are useful without inventing adoption, official SDK support, console compatibility or creator earnings. Its external executable extensions do not alter OpenLegend's [generated-content and development-save boundaries](../../../../AGENTS.md#boundaries).
