# G136 — Conan Exiles

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Conan Exiles is a useful reference because it layers a traditional survival-crafting chassis with **character builds, slavery/follower labor, religion, sorcery, dungeons, siege warfare and authored sword-and-sorcery exploration**. It is less systemic than Rust about social betrayal and less physically simulated than 7 Days to Die, but it asks a different question: how much RPG structure can a survival sandbox absorb before it stops feeling like a sandbox?

The current 2026 game also has an unusually important product boundary. The Steam version became **Conan Exiles Enhanced**, a free Unreal Engine 5 upgrade with merged Exiled Lands/Isle of Siptah world access, revised UI/crafting conveniences and continued major-content support. Consoles and the UE4 Legacy branch remain separate and do not receive the same major-content stream.

## R01 — identity, current versions, platforms and player promise

Funcom released Conan Exiles into Steam Early Access on January 31, 2017 and launched version 1.0 on May 8, 2018 for PC, Xbox One and PlayStation 4. The basic promise is to create an exile in Robert E. Howard’s Hyborian Age, survive the Exiled Lands, gather/build/craft, fight beasts and people, enslave or recruit followers, explore ruins/dungeons, learn sorcery and religion, and either cooperate or dominate in multiplayer.

### September 2026 current PC boundary — Conan Exiles Enhanced

On **May 5, 2026**, Funcom and Inflexion Games released **Conan Exiles Enhanced** as a free Steam upgrade. It moved the Steam product from Unreal Engine 4 to Unreal Engine 5, preserved Steam owners’ DLC/Bazaar purchases and supported save transfer.

Major Enhanced changes include:

- Unreal Engine 5 visual/technical migration;
- redesigned UI/navigation;
- crafting that can pull ingredients from nearby storage and follower inventories;
- multiple single-player characters per account;
- reduced client size versus the old PC build;
- Steam Deck support;
- refreshed mod tooling;
- **merged Exiled Lands + Isle of Siptah server/world structure**.

[Enhanced FAQ](https://www.conanexiles.com/enhanced/) · [launch announcement](https://www.conanexiles.com/blog/conan-exiles-enters-a-new-era-as-massive-free-unreal-engine-5-upgrade-goes-live/).

The merged-world change is significant: on Enhanced PC a server can support both Exiled Lands and Isle of Siptah, and a player who owns Siptah can move between them. Separate legacy Siptah official servers are no longer required. Existing Siptah bases could not simply preserve their old coordinates through that migration, so Funcom advised storing valuables/followers and rebuilding.

### Current patch

As of September 27, 2026:
- **Update 2.2.0** shipped September 15, moving Enhanced to **Unreal Engine 5.8.2** and replacing the old replication path with Epic’s **Iris** networking.
- **Hotfix 2.2.2** shipped September 24 and fixed D3D12/server/login-queue crashes.
- **Legacy of the Giant-Kings Part Two** is announced for October 6 and is therefore future, not current mechanics.

[2.2.0](https://www.conanexiles.com/blog/update-2-2-0-engine-upgrade-iris-networking-and-new-bazaar-bundles/) · [Steam announcements](https://store.steampowered.com/news/posts/?appids=440900).

### UE4 / console / storefront boundary

The Enhanced FAQ is explicit:

- Steam is the supported UE5/Enhanced branch.
- PlayStation and Xbox remain on UE4 and receive critical fixes but **no new major content updates**.
- Epic Games Store and Microsoft Store PC users cannot use the Steam-only Enhanced official server network at launch; those UE4 clients can remain on Legacy/private play.
- Conan Exiles Legacy on PC does not receive new major updates, support, Bazaar access or official servers.
- Steam players can select the UE4 Legacy build manually, but it is a preservation branch, not the current supported content line.

Do not use a current Enhanced mechanic as proof of a console feature without checking that platform.

### Isle of Siptah

Isle of Siptah launched in Early Access in 2020 and fully in 2021. It adds another large map, creatures, building sets, dungeons/vaults and a distinct historical gameplay cycle. Enhanced now merges access into the broader world/server model for owners, but Siptah remains paid DLC entitlement.

### Player modes

The game supports:
- single-player;
- private/co-op;
- dedicated servers;
- official PvE;
- official PvP;
- official PvE-Conflict;
- modded/private variants.

Server settings can alter rates, durability, harvesting, Purge behavior, building rules and PvP constraints, so exact timing values should always be attached to a server configuration.

## R02 — player actions and major mechanics

### Character creation and RPG progression

The player creates an exile with appearance, race/culture flavor and deity selection. Conan Exiles does not lock the player into a traditional class. Experience/levels grant attribute points and Knowledge/recipe progression.

The **Age of Sorcery** update (2022) rewrote attributes and perks around more deliberate build choices. Attributes now support milestone perk choices; **corrupted attributes** trade corruption/life capacity for sorcery-focused power. [Attributes overhaul](https://www.conanexiles.com/blog/attributes-perks-and-corruption-in-the-age-of-sorcery-update/).

This creates a build layer across:
- melee/ranged damage;
- stamina/survivability;
- carrying/gathering;
- follower authority;
- corruption/sorcery.

Respec tools exist, so character builds are meaningful but not permanently irreversible.

### Survival and environment

Core bodily pressures include:
- health;
- stamina;
- hunger;
- thirst;
- temperature/heat/cold;
- corruption;
- status effects.

Food/drink can provide buffs and temperature effects. Armor and environment interact with climate. Corruption reduces effective health/stamina ceilings and can come from places, entities or deliberate sorcery choices.

### Gathering and crafting

Players harvest:
- wood/plant fiber;
- stone/ore;
- hides/bones;
- food;
- special alchemical/rare materials.

The crafting ladder includes hand recipes and stations such as furnaces, blacksmith/armorer/carpenter/alchemist/cooking facilities and advanced benches. Higher-grade materials and specialist knowledge unlock stronger weapons, armor, building pieces, consumables and tools.

Enhanced improves everyday logistics by letting crafting draw from nearby storage/follower inventories rather than requiring every ingredient to be manually carried.

### Building and settlements

Construction supports foundations, walls, floors, roofs, stairs, doors, gates, decorations, crafting spaces and massive fortresses.

Age of Sorcery replaced old hotbar-style building placement with a dedicated building interface and added Creative Mode. [Age of Sorcery](https://www.conanexiles.com/age-of-sorcery/).

Buildings are functional:
- shelter/weather;
- crafting;
- storage;
- defense;
- follower placement;
- map position;
- siege target;
- social identity.

PvP bases must consider walls/gates, terrain, siege access and explosives. PvE builds can focus more on aesthetics/production.

### Followers / thralls

Historically the signature follower loop was:
1. fight an NPC;
2. knock them unconscious with nonlethal tools;
3. drag them to a Wheel of Pain;
4. convert them into a thrall;
5. place them as combat follower or crafting specialist.

Thralls can be fighters/archers/bearers/dancers or crafting specialists. Named/high-tier workers improve specific production outcomes or unlock recipes depending on current rules.

This system is mechanically distinctive and thematically controversial: the game explicitly calls the coerced followers **thralls/slaves** and mechanically rewards enslavement.

### Living Settlements and Companions

**Age of Heroes** (October 2024 onward) changed the old “crafting NPC frozen at bench” model. Funcom added **Living Settlements**, where thralls walk around bases and fulfill needs/routines, plus **Companions** with authored quests/powers such as Freya and Liu Fei. [Age of Heroes](https://www.conanexiles.com/age-of-heroes/).

This is an important evolution:
- follower labor becomes visibly embodied;
- base interiors become social spaces rather than prop-filled factories;
- selected companions gain more authored identity than ordinary thralls.

It is still not a full relationship/romance simulator, but the follower layer is now closer to settlement life than it was at launch.

### Combat

Combat is real-time third-person action:
- light/heavy attack chains;
- dodging;
- blocking/shields;
- weapon classes with different movesets/reach;
- bows;
- status effects/armor penetration;
- followers;
- mounted combat where supported;
- sorcery;
- siege/explosives in PvP.

Launch reviewers criticized hit detection and floaty/netcode issues. The system has been reworked repeatedly since 2018, so those criticisms remain historical experience, not a current exact frame-data assessment.

### Attributes, equipment and load

Armor, weapons and consumables create build tradeoffs. Weight/encumbrance affects mobility and can itself be a specialized build axis. Equipment has durability and can be repaired under applicable rules.

There is no Diablo-style random affix ocean as the primary progression model; item identity is more authored/recipe/boss/drop oriented.

### Religion

The player can worship gods such as Crom, Mitra, Set, Yog and others depending on content. Religion gives access to altars, recipes, offerings and late ritual power.

Historically, high-tier worship could enable **Avatars**—giant manifestations of gods used to devastate bases. That system creates a unique escalation from shrine-building to strategic siege weapon.

Religious systems have changed across patches/server settings and should be verified for any implementation-level numerical comparison.

### Sorcery

**Age of Sorcery** added a full corruption-driven magic system. Sorcery requires:
- discovering/advancing the sorcery path;
- ritual components;
- corruption;
- prepared resources/stations.

Abilities include examples such as:
- bat-like flight;
- darkness/concealment;
- demonic summons;
- undead raising;
- storms and utility rituals.

[Age of Sorcery launch](https://www.conanexiles.com/blog/the-age-of-sorcery-update-is-out-now/).

The key design pattern is **power for bodily/social cost**: sorcery is not a free mana bar; corruption can reduce ordinary health/stamina and can reshape attributes.

### Exploration, climbing and traversal

Conan Exiles’ climbing is one of its best traversal differentiators. Players can scale many surfaces while stamina lasts, making cliffs/ruins more permeable than conventional authored paths.

Traversal also includes:
- running/swimming;
- mounts;
- map-room/teleport-style travel and later systems;
- climbing equipment;
- Siptah/Enhanced inter-map teleporting;
- sorcerous movement.

Because climbing uses stamina, armor/encumbrance/combat readiness can conflict with mobility.

### Journey System — structured goals inside the sandbox

The initial pass omitted the modern **Journey System**, which is a major bridge between open survival and authored progression. Journeys are themed multi-step objective chains that can unlock recipes/rewards and teach systems without forcing one campaign order. Examples include Cartographer, Sorcerer, Adventurer, Vault Raider and Surge Defender. [Journey System technical overview](https://www.conanexiles.com/wp-content/wiki/3437659279.html) · [The Exiles Journey](https://conanexiles.fandom.com/wiki/The_Exiles_Journey).

A Journey can require the player to:
- discover named locations;
- learn Knowledge;
- use crafting stations;
- fight bosses;
- interact with sorcery;
- attune to travel infrastructure;
- complete Siptah-specific Vault/Surge objectives.

This means the game has a **structured objective layer** even though it does not present one mandatory quest campaign. Journeys also make system onboarding and character progression partially explicit rather than relying entirely on wiki knowledge.

### Map-Room and Obelisk traversal — audit expansion

The Exiled Lands contain ten major Obelisks surrounded by corruption. Once a player **attunes** to an Obelisk, a player-built **Map-Room** can teleport bracelet-wearing survivors to that destination. The Cartographer Knowledge is learned from the Archivist in the Unnamed City. [Map-Room](https://conanexiles.fandom.com/wiki/Map-Room) · [Obelisk](https://conanexiles.fandom.com/wiki/Obelisk).

This is asymmetric fast travel:
- the Map-Room is a large expensive base structure;
- destinations require prior physical discovery/attunement;
- travel sends the player **to** an Obelisk rather than freely between arbitrary markers;
- Obelisk areas themselves inflict Corruption.

Enhanced adds a current cross-world use: Map-Rooms placed on Siptah can be used to travel to the Exiled Lands under the merged-world model. Fast travel therefore becomes **knowledge + infrastructure + world entitlement**, not a universal map click.

### Isle of Siptah's distinct loop — Vaults, Maelstrom and Surges

The first pass named Siptah without explaining its core mechanics. Siptah's original identity centers on three systems that were later deliberately decoupled after player feedback:

- **Elder Vaults** — fourteen high-level dungeons tied to elder races, containing bosses, sigils, recipes/lore and Eldarium;
- **The Maelstrom** — a violent central storm that spawns monsters from the Outer Dark and creates a hazardous/resource-rich world state;
- **Surges of Sorcery** — Leyshrine rituals that summon waves of humans/creatures, including valuable capturable thralls.

Funcom's producer letter says the original loop expected players to clear Vaults → use their rewards in the storm → gather essences → power Surges, but the studio found that dependency too cumbersome and changed the systems so they could be enjoyed more independently. [Siptah producer letter](https://www.conanexiles.com/blog/isle-of-siptah-producer-letter/) · [Update 2.3](https://www.conanexiles.com/blog/update-2-3-isle-of-siptah-improvements-and-npc-camps/) · [Siptah overview](https://www.conanexiles.com/siptah-en/).

That evolution is directly useful research: **interconnected systems can create satisfying loops, but mandatory chaining can become friction when every player must do A→B→C for basic access**.

### Dungeons, bosses and exploration

The Exiled Lands are a fixed authored map containing:
- ruins;
- lore/ghosts/notes;
- camps;
- caves;
- dungeons;
- world bosses;
- legendary chests;
- recipe teachers;
- fragments/key items.

This makes the game more RPG-like than a pure procedural survival sandbox. Exploration can unlock knowledge and narrative as well as materials.

### Purge and siege pressure

The **Purge** historically sent hostile NPC waves against player bases after sufficient activity.

**Age of War** rebuilt the Purge around player treasure/wealth and an explicit trigger/defense loop, and added Siege of al-Merayah plus combat/loot changes. [Age of Heroes preview summarizing Age of War additions](https://www.conanexiles.com/blog/the-age-of-heroes-is-coming-to-conan-exiles/).

The design value is that a peaceful production base can become an encounter space, similar to 7DTD but less schedule-dominated.

### Pets

Animals can be captured/raised into followers. Pets differ from human thralls in acquisition and utility, but both occupy the follower/defense ecosystem.

### Taverns and visitors

Age of War/Heroes added tavern behavior and patrons. Enhanced June 2026 patch notes mention tavern barkeepers/patrons on Siptah, confirming the system remains active in current Enhanced. [June 2026 patch](https://www.conanexiles.com/blog/conan-exiles-enhanced-june-update-out-now/).

### Siege tools — concrete PvP destruction

The initial pass said "explosive/siege tools" too abstractly. Conan Exiles' PvP siege vocabulary includes **Trebuchets**, explosive orbs/jars/arrows and late religious/Avatar pressure, with building material tiers and server raid windows determining what is practical. The important distinction is between:
- **slow positional siege** such as a Trebuchet, which requires construction/ammunition/range/line-of-fire;
- **carried explosives**, which convert stored production resources directly into structure damage;
- **Avatars**, which historically compress religious preparation into a short catastrophic manifestation.

These are different answers to the same fortress problem and create different warning/counterplay windows.

### PvP, siege and gods

PvP survival includes:
- player combat;
- building raiding;
- explosive/siege tools;
- clan territory;
- follower defense;
- avatars/god bubbles depending current rules;
- server raid schedules/settings.

The system can produce clan war sagas but also extreme asymmetry/offline-loss frustration.

## R03 — items, followers and composition

### Major item families

- raw/refined resources;
- tools;
- weapons/shields/ammunition;
- armor;
- food/drink;
- medicines/alchemy;
- building pieces/decor;
- crafting stations;
- religious/sorcery components;
- follower equipment;
- siege/raid items;
- mounts/pets;
- lore/keys/artifacts;
- DLC/Bazaar cosmetics/building sets.

### Followers as equipment + actors

A fighter thrall can be equipped with weapons/armor and leveled. A crafting thrall historically changed station output/recipes. Companions add unique authored abilities/perks.

The useful composition question becomes:
- which follower travels;
- which follower stays as base defense/worker;
- how much Authority does the player build for followers;
- what equipment is invested in a potentially losable NPC.

### Knowledge and recipes

Recipes come from Knowledge progression, world discovery, DLC entitlement, religion and special content. This means exploration can unlock permanent capability rather than merely one item.

### Bazaar / DLC boundary

Traditional DLC packs sold building/armor aesthetics and themed items. Age of Sorcery introduced the **Black Lotus Bazaar** and Battle Pass model; the Battle Pass later ceased as the live-service model evolved, but Bazaar rotating purchases remain.

Current September 2026 Steam reviews criticize rotating/FOMO-style Bazaar availability and online verification for Bazaar items. That is direct player testimony, not a universal economic judgment.

Enhanced preserves owned DLC/Bazaar entitlements for Steam users.

## R04 — progression, economy, time and failure

### Level/knowledge progression

Survivor progression includes:
- levels;
- attributes/perks;
- Knowledge recipes;
- crafting tiers;
- equipment;
- followers;
- dungeon/boss knowledge;
- religion;
- sorcery;
- base infrastructure.

This is more conventional RPG progression than Rust/DayZ.

### Materials and production

Early materials become obsolete for high-tier combat/building, but remain useful for construction volume and intermediate recipes. Station chains create production dependencies.

### Economy

There is no one universal player market economy. Resources/items/followers are the practical wealth system.

NPC merchants exist in places, and some content introduces currencies/treasure systems. PvP clans may barter or compete materially.

### Death

Death can drop inventory depending server/settings while character levels/knowledge persist. Beds/bedrolls provide respawn locations. The cost is therefore usually carried gear/location rather than full character deletion.

Follower death can be more painful than player death because leveled/equipped followers may be permanently lost.

### Time

Crafting, follower conversion/training, pet raising, harvesting respawns, server raid windows and base persistence create real-time layers. Server settings can compress them.

### Endgame

Late goals include:
- high-tier gear;
- optimized builds;
- sorcery;
- followers/companions;
- dungeons/world bosses;
- legendary items;
- large settlements;
- clan war;
- Purges;
- Isle of Siptah;
- current Giant-Kings story content;
- mods.

There is an authored escape/endgame route through the Exiled Lands story, but many players remain for sandbox/server goals.

## R05 — worked interactions

### Case 1 — climbing turns a ruin into a stamina puzzle

**Intention:** reach loot/lore on a high ruin.  
**Conditions:** wall is climbable but stamina is finite.  
**Actions:** reduce load, find rest ledges, climb in stages.  
**Interaction:** character build/equipment affects route geometry.  
**Result:** a heavily armored fighter may use a different route from a mobile explorer.

### Case 2 — a named crafter changes a production chain

**Intention:** improve a high-tier equipment workflow.  
**Conditions:** the player captures/recruits a specialist follower under current rules.  
**Actions:** bring follower to base and assign/use their specialization.  
**Interaction:** an NPC becomes production infrastructure.  
**Result:** human acquisition changes manufacturing capability.  
**Limit:** this is thematically coercive and mechanically controversial; an OpenLegend analogue should not assume slavery is a neutral reusable pattern.

### Case 3 — living settlements make production visible

**Intention:** build a base that feels inhabited.  
**Conditions:** Age of Heroes/Enhanced settlement systems active.  
**Actions:** place appropriate facilities/followers and allow workers to move through routines.  
**Interaction:** the same NPC who mechanically supports production also becomes ambient social presence.  
**Result:** the base communicates its function through people rather than static UI alone.

### Case 4 — sorcery trades maximum ordinary capacity for extraordinary power

**Intention:** specialize into corrupted sorcery.  
**Conditions:** player has sorcery progression/components and accepts corruption.  
**Actions:** corrupt relevant attributes/use rituals.  
**Interaction:** maximum health/stamina and perk configuration shift while magical options expand.  
**Result:** magic becomes a character identity tradeoff rather than an additive hotbar.

### Case 5 — Purge turns wealth into threat

**Intention:** defend a valuable settlement.  
**Conditions:** current Purge system is invoked around player wealth/treasure.  
**Actions:** prepare walls, chokepoints, followers, supplies and trigger/face the attack.  
**Interaction:** accumulated wealth becomes encounter difficulty/pressure.  
**Result:** prosperity creates content rather than ending survival.

### Case 6 — a companion quest makes one follower qualitatively different

**Intention:** recruit Freya/Liu Fei-style companion.  
**Conditions:** Age of Heroes quest requirements met.  
**Actions:** complete authored quest sequence and recruit.  
**Interaction:** survival follower system gains narrative memory/unique powers.  
**Result:** one NPC is valued for story and mechanics, unlike replaceable generic workers.

### Case 7 — Siptah merge turns expansion ownership into geography

**Intention:** move an established Enhanced character between Exiled Lands and Siptah.  
**Conditions:** player owns Siptah and server supports merged worlds.  
**Actions:** use current inter-world travel rather than create an isolated server character.  
**Interaction:** DLC entitlement controls access to another land while character continuity remains.  
**Result:** expansion is a connected place, not a separate save silo.

### Case 8 — a god Avatar compresses months of architecture into minutes of danger

**Intention:** break a fortified enemy position.  
**Conditions:** server enables the relevant religious/Avatar system and ritual prerequisites are met.  
**Actions:** accumulate religious resources, summon manifestation, attack.  
**Interaction:** long-term worship/economy escalates into a temporary siege superweapon.  
**Result:** strategic preparation can overwhelm static walls.  
**Limit:** extreme power spikes can make ordinary defensive craft feel irrelevant if counters are inadequate.

### Case 9 — Enhanced nearby-storage crafting removes a clerical loop

**Intention:** craft advanced gear from materials spread across base containers.  
**Conditions:** Enhanced branch and nearby eligible storage/follower inventories.  
**Actions:** open crafting without manually collecting every ingredient.  
**Interaction:** storage organization remains important but physical transfer clicks fall.  
**Result:** production focuses more on resource availability than inventory shuttling.

### Case 10 — an Obelisk becomes useful only after the player learns and builds around it

**Intention:** reduce repeated travel to the frozen north/other distant Exiled Lands region.  
**Conditions:** survivor has physically discovered/attuned to the destination Obelisk and learned/built a Map-Room.  
**Actions:** return to the Map-Room and select the attuned destination.  
**Interaction:** exploration knowledge and expensive settlement infrastructure combine into travel convenience.  
**Result:** distance is reduced **after** the world has been learned rather than before.

### Case 11 — Siptah's loop was deliberately de-coupled

**Intention:** acquire high-level Siptah rewards/thralls.  
**Conditions:** Vaults, Maelstrom and Surge systems are all available.  
**Actions:** choose whether to run Vaults for sigils/Eldarium, hunt storm creatures for essences, or perform Surges under the revised 2.3 rules.  
**Interaction:** these systems once formed a mandatory chain but now feed one another without requiring strict linear completion.  
**Result:** players retain cross-system synergy without every goal demanding the whole pipeline.  
**Production lesson:** Funcom explicitly changed the dependency because players found it cumbersome.

### Case 12 — Journey objectives teach without becoming the only campaign

**Intention:** learn advanced travel/sorcery/Siptah systems.  
**Conditions:** relevant Journey is unlocked by level/location.  
**Actions:** complete explicit steps such as attuning an Obelisk, using a Map-Room, entering the Maelstrom or completing a Vault/Surge.  
**Interaction:** sandbox actions double as authored tutorial/progression checkpoints.  
**Result:** a player gets direction/rewards while remaining free to abandon the Journey and pursue other goals.

### Case 13 — engine migration changes preservation rules

**Intention:** preserve a Siptah base through Enhanced migration.  
**Conditions:** Siptah coordinates are changing under merged-world UE5 structure.  
**Actions:** dismantle/store valuables/follower inventory before migration, then rebuild.  
**Interaction:** technical world representation directly affects authored player property.  
**Result:** character/items can survive while exact architecture does not.  
**Lesson:** persistent-world engine migrations need explicit preservation contracts.

## R06 — people, AI, companions, clans and multiplayer

### Human followers

Thralls/followers are unusually central. They can be workers, fighters, archers, dancers or special companions.

Ordinary follower AI is functional rather than deeply autonomous: follow, guard, attack, equip, level.

Age of Heroes adds:
- authored companions;
- living settlement routines;
- more visibly social bases.

### Companions versus romance

Companions have quests and identity, but Conan Exiles does not become a full romance/approval RPG. Their relationship depth is limited relative to Dragon Age/Baldur’s Gate.

### Clans

Clans share bases, resources and follower infrastructure. PvP clans create territory and war. Permission/ownership design is central to persistent cooperative building.

### NPC factions/world

Camps and factions provide enemies, lore and locations. Their AI does not simulate a deep political economy comparable to Crusader Kings or a town-life RPG.

### Mods

Steam Workshop modding is a major long-tail layer. Enhanced refreshed the Mod Dev Kit and launched with mod support, but engine upgrades can break older mods. The June 2026 patch explicitly added incompatibility warnings.

September 2026 Steam reviews show both sides:
- players say mods add enormous longevity/QoL;
- updates can temporarily make modded saves/servers unplayable.

## R07 — art, audio, interface and feel

Conan Exiles uses the Hyborian setting to differentiate survival visually:
- desert river valley;
- jungle;
- frozen north;
- volcano;
- ancient ruins;
- giant architecture;
- monsters;
- barbarian armor/weapons.

The world’s fixed authored geography supports recognizable places rather than a purely procedural map.

### Enhanced presentation

UE5 Enhanced improves:
- lighting;
- materials/environment detail;
- character visuals;
- effects;
- graphics options.

September 2.2.0 moved to UE5.8.2 and added higher-end graphics controls. Funcom removed beta ray tracing from final 2.2.0 because of visual artifacts, with intent to revisit; do not describe ray tracing as currently shipped 2.2.0 feature. [2.2.0 notes](https://forums.funcom.com/t/conan-exiles-enhanced-september-patch-2-2-0/302804).

### UI

Launch reviews heavily criticized menus and onboarding.

Current Enhanced includes:
- redesigned UI;
- improved storage/crafting workflows;
- June 2026 quick-stack/transfer QoL;
- mod compatibility warnings.

The game is still system-dense, but it no longer has exactly the 2018 interface contract.

### Audio

Audio communicates combat, creatures, storms and settlement life. It supports atmosphere but is not the game’s primary information mechanic in the way DayZ uses distant gunfire.

## R08 — story, lore and play

The premise begins with the player crucified in the Exiled Lands and freed by Conan. An enchanted bracelet prevents simply leaving.

The Exiled Lands contain:
- lore stones;
- ghosts;
- journals/notes;
- ruins;
- dungeons;
- named NPCs;
- world history;
- a path toward removing the bracelet/escaping.

The player can ignore much of the main lore and build indefinitely.

### Sorcery and sword-and-sorcery identity

Age of Sorcery strengthened the setting’s magical side through corruptive ritual rather than conventional high-fantasy spellcasting.

### Companion stories

Age of Heroes added authored follower quests, moving part of narrative into people the player can retain.

### Giant-Kings

Legacy of the Giant-Kings Part One launched July 21, 2026 as a new story arc centered on the Cyclopean Halls/Unnamed City mystery. Part Two is October 6 future content at this checkpoint. [updates page](https://www.conanexiles.com/updates/).

## R09 — production and development

Conan Exiles began as a high-risk Funcom survival project and quickly became commercially transformative.

- Early Access: January 31, 2017.
- 320,000 sales in first week; development costs reportedly recouped within about a week.
- 480,000+ first 28 days.
- Full launch May 8, 2018.
- More than 1.4 million units by the Q1 2018 presentation shortly after launch, making it Funcom’s fastest/best-selling title at that point. [Funcom press release](https://www.mynewsdesk.com/funcom-oslo-as/pressreleases/conan-exiles-is-now-the-best-selling-and-fastest-selling-game-in-funcom-history-2570639) · [2018 report](https://cdn.funcom.com/investor/2018/Funcom_1Q18_Report.pdf).

The launch game was rough enough that reviews repeatedly called it unfinished despite broad systems.

### Long-tail evolution

The game then accumulated:
- map/biome expansion;
- mounts;
- Siptah;
- dungeons;
- followers;
- religion changes;
- Ages;
- sorcery;
- building overhaul;
- monetization overhaul;
- Purge/war systems;
- companions/living settlements;
- UE5 Enhanced.

### Enhanced partnership

Funcom worked with **Inflexion Games** on the UE5 Enhanced migration. This is a production lesson in using an external technical partner to modernize a live persistent product.

### Network/server performance

September 2026 2.2.0’s move to Iris is explicitly motivated by servers evaluating enormous numbers of replicated players/placeables. Funcom says internal testing found it the largest server performance improvement so far, while acknowledging large-scale player building can still produce limits.

Persistent sandbox freedom has a direct backend cost.

## R10 — marketing, distribution and virality

Conan Exiles has benefited from:
- Conan IP recognition;
- Steam Early Access;
- console launch;
- streamers/Twitch;
- shock-value character/nudity customization during Early Access;
- Workshop mods;
- DLC packs;
- Isle of Siptah;
- Game Pass/PlayStation Plus exposure;
- Ages update cadence;
- Twitch Drops;
- Community updates;
- free Enhanced upgrade;
- Bazaar cosmetics.

The “nudity slider” was disproportionately viral in early streaming coverage, but long-term retention clearly depends on more than novelty; Funcom’s 2019 report notes continued strong operations and later Siptah produced the game’s then-highest concurrent player count since release.

### Modding

Funcom released a mod kit early in Early Access, and mods remain a major creator/retention loop. The first 2026 official modding contest is another sign that mod creators are part of current product marketing.

## R11 — commercial and participation context

Historical metrics must remain dated:
- 320k first-week Early Access sales;
- 480k+ first 28 days;
- 1m before full launch;
- 1.4m+ shortly after launch in Funcom reporting, including retail sell-in/refund caveats;
- later company materials describe Conan Exiles as Funcom’s biggest success.

No current 2026 lifetime unit count located in this pass is clean enough to replace those historical milestones.

### Monetization

Current Enhanced includes:
- paid base game;
- Isle of Siptah DLC;
- legacy themed DLC packs;
- Black Lotus Bazaar using Crom Coins;
- free major gameplay/content updates for Enhanced.

Age of Sorcery introduced the Battle Pass + Bazaar model; the Battle Pass is no longer the central current cadence, while the Bazaar remains active.

September 2026 Steam testimony specifically objects to:
- rotating availability/FOMO;
- virtual-currency remainder pricing;
- online entitlement verification concerns.

Those are player critiques, not claims that all paid content is mechanically mandatory.

## R12 — reception, five written reviews and current Steam evidence

### 1. PC Gamer — Phil Iwaniuk, May 15, 2018 — 65/100

[Full review](https://www.pcgamer.com/conan-exiles-review/).

PC Gamer calls the game broad and enjoyable but rough. It praises the map, survival/clan sagas and the spectacle of high-level systems while criticizing animation, combat feel, slope traversal, AI and unfinished edges.

### 2. GameSpot — James Swinbanks, May 25, 2018

[Full review](https://www.gamespot.com/reviews/conan-exiles-review-dull-and-dense/1900-6416916/).

GameSpot is substantially harsher. It finds the crafting/progression dense but monotonous, the UI poor and the learning curve confusing. The review is useful evidence that sheer system count does not guarantee meaningful player decisions.

### 3. Wccftech — Rosh Kelly, May 16, 2018 — 7.8/10

[Full review](https://wccftech.com/review/conan-exiles-barbaric-fun/).

Wccftech likes the combat variety, map scale, objective pacing and survival adventure, while criticizing frame rate/lag, visuals and confusing menus. It is a useful positive counterpoint to GameSpot’s “dull” verdict.

### 4. God is a Geek — Nicola Ardron, May 22, 2018

[Full review](https://godisageek.com/reviews/conan-exiles-review/).

The review praises the Hyborian atmosphere, varied environments and extensive crafting/exploration but criticizes obtuse menus, lack of tutorial, hit detection and severe networking problems.

### 5. Push Square — Glen Fox, 2018/republished March 27, 2019 — 6/10, PS4

[Full review](https://www.pushsquare.com/reviews/ps4/conan_exiles).

Push Square finds the survival blend surprisingly addictive and thematically appropriate while noting jank and that the game’s biggest appeal is multiplayer rather than fundamental genre novelty.

### Supplemental launch evidence — Game Informer preview

[Game Informer’s April 2018 hands-on](https://gameinformer.com/games/conan_exiles/b/pc/archive/2018/04/06/conan-exiles-is-freed-from-early-access-with-a-double-edged-appeal) praised settlement-building scope and the Purge as a survival-pressure alternative while flagging glitches, investment and PvP frustration. It is a preview, not counted as one of the five full reviews.

### Current Steam evidence — September 2026

The current Steam page reports **Mostly Positive recent reviews** and **Mostly Positive English reviews**, not the harsher 2018 aggregate.

[Current helpful surface](https://steamcommunity.com/app/440900/reviews/) contains:
- long-play positives saying modded servers and build freedom create enormous longevity;
- September 2026 negatives triggered by 2.2.0 launch crashes/mod breakage;
- criticism of Bazaar rotation/FOMO and entitlement verification;
- positives specifically appreciating Enhanced as a free upgrade.

A September 23 reviewer with 800+ hours says Enhanced itself is good but refuses to recommend the monetization model because the Bazaar rotates items and uses an online/virtual-currency structure.

These are self-selected current testimonies. They are useful for modern friction, not prevalence estimates.

### Reception synthesis

**Praised**
- huge authored world;
- strong building;
- Conan atmosphere;
- co-op/clan stories;
- broad crafting/RPG systems;
- followers;
- mods;
- long-tail free gameplay updates;
- Enhanced visual/QoL upgrade.

**Criticized**
- launch-era jank/AI/netcode/UI;
- grind/opaque systems;
- PvP investment/loss;
- follower/AI bugs;
- mod breakage across major updates;
- Bazaar monetization;
- platform fragmentation after Enhanced.

The current product is substantially better supported and broader than launch reviews describe, but the same systems that create longevity also increase compatibility/server/UI complexity.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Survival sandboxes can support real RPG builds

Attributes/perks/corruption let two survivors solve the same world differently.

**Lesson:** authored realities need not choose between systemic simulation and character-build identity.  
**Limit:** build math can overwhelm in-world causality if every decision becomes optimization menus.

### 2. Followers can be production actors and characters

Thralls historically altered crafting; Companions/Living Settlements add narrative and ambient life.

**Potential lesson:** one NPC can combine utility, persistence and social identity.  
**Limit:** do not copy the coercive slavery fantasy as a default reusable labor model.

### 3. Power can require corruption/tradeoff

Sorcery exchanges ordinary bodily capacity for extraordinary capability.

**Lesson:** magic is more interesting when it changes the character’s condition/world relationship.  
**Limit:** if penalties are easily bypassed they become ceremony; if too harsh, magic becomes niche.

### 4. Wealth can summon content

Purge mechanics turn accumulated settlement value into a reason the world attacks.

**Lesson:** progression can create pressure rather than only remove it.

### 5. World expansions are better when connected

Enhanced’s merged Siptah/Exiled Lands model lets one character inhabit multiple authored spaces.

**OpenLegend relevance:** world packages could be connected without pretending all rules are universal.  
**Limit:** migration/persistence semantics must be explicit.

### 6. Persistent followers make a base legible

Workers walking between stations communicate life and purpose better than static crafting UIs.

**Limit:** routine AI is expensive and bugs become emotionally visible.

### 7. Engine migrations need property-preservation policy

Enhanced preserved many characters/items/bases but Siptah coordinate changes meant exact bases could not remain.

**Lesson:** “save compatible” should enumerate which identities/relationships/placements survive.

### 8. Mods are a major feature, not a footnote

Current players repeatedly frame Workshop mods as a large fraction of longevity.

**Limit:** every engine/network update becomes an ecosystem migration.

### 9. Server performance is a game-design constraint

Funcom explicitly ties Iris improvements to evaluating hundreds of thousands of placed objects.

**Lesson:** unrestricted persistent building has replication/query costs that should shape architecture early.

### 10. Monetization can alter how players perceive world affordances

Cosmetic Bazaar content still affects trust because it is surfaced through scarcity/rotation.

**Lesson:** commerce UX is part of the player’s world relationship even when items are not required for progression.

## R14 — sources, preservation, reading route and requirement map

### Preservation result

G136 was added in the September 27 survival expansion. Existing game/mechanics/dossier owners and packet-derived references were checked; no prior dedicated Conan Exiles owner existed.

The seven-file packet predates G136. This dossier establishes the full per-game owner but does **not** claim global packet P01 reconciliation is complete.

### Primary/current sources

- **Funcom — [Enhanced FAQ](https://www.conanexiles.com/enhanced/), accessed September 27, 2026.** Current UE5/UE4/platform/server/Siptah/save/DLC boundary.
- **Funcom — [Enhanced launch](https://www.conanexiles.com/blog/conan-exiles-enters-a-new-era-as-massive-free-unreal-engine-5-upgrade-goes-live/), May 5, 2026.** Primary UE5 migration and Inflexion collaboration.
- **Funcom — [Update 2.2.0](https://www.conanexiles.com/blog/update-2-2-0-engine-upgrade-iris-networking-and-new-bazaar-bundles/), September 15, 2026.** Primary UE5.8.2/Iris boundary.
- **Funcom Forums — [2.2.0 patch](https://forums.funcom.com/t/conan-exiles-enhanced-september-patch-2-2-0/302804), September 15, 2026.** Detailed current graphics/network notes including removed beta ray tracing.
- **Steam — [announcement stream](https://store.steampowered.com/news/posts/?appids=440900), accessed September 27, 2026.** Current 2.2.2 hotfix and future Giant-Kings Part Two distinction.
- **Funcom — [June Enhanced patch](https://www.conanexiles.com/blog/conan-exiles-enhanced-june-update-out-now/), June 9, 2026.** Current quick-stack/storage/mod-warning/tavern evidence.
- **Funcom — [Age of Sorcery](https://www.conanexiles.com/age-of-sorcery/) and [launch](https://www.conanexiles.com/blog/the-age-of-sorcery-update-is-out-now/), 2022.** Primary sorcery/building/attribute/monetization overhaul.
- **Funcom — [attributes/corruption](https://www.conanexiles.com/blog/attributes-perks-and-corruption-in-the-age-of-sorcery-update/), July 20, 2022.**
- **Funcom — [Age of Heroes](https://www.conanexiles.com/age-of-heroes/) and [preview](https://www.conanexiles.com/blog/the-age-of-heroes-is-coming-to-conan-exiles/), 2024.** Primary companions/living settlements/Age of War retrospective.
- **Funcom — [updates index](https://www.conanexiles.com/updates/), accessed September 27, 2026.** Current Giant-Kings Part One/current content chronology.
- **Funcom — [Isle of Siptah](https://www.conanexiles.com/siptah-en/).** Expansion identity/history.
- **Funcom — [Isle of Siptah producer letter](https://www.conanexiles.com/blog/isle-of-siptah-producer-letter/) and [Update 2.3](https://www.conanexiles.com/blog/update-2-3-isle-of-siptah-improvements-and-npc-camps/).** Primary evidence for Vault/Maelstrom/Surge design and the deliberate decoupling of their original mandatory chain.
- **Funcom technical wiki — [Journey System](https://www.conanexiles.com/wp-content/wiki/3437659279.html), plus maintained Conan Exiles Wiki [The Exiles Journey](https://conanexiles.fandom.com/wiki/The_Exiles_Journey), [Map-Room](https://conanexiles.fandom.com/wiki/Map-Room), [Obelisk](https://conanexiles.fandom.com/wiki/Obelisk), [Elder Vault](https://conanexiles.fandom.com/wiki/Elder_Vault).** Operational objective/travel/Siptah mechanics added in the follow-up audit; community pages support rules, not developer intent.

### Production/commercial sources

- **Funcom Q1 2018 report — [PDF](https://cdn.funcom.com/investor/2018/Funcom_1Q18_Report.pdf).** 1.4m historical unit metric with retail/refund caveats.
- **Funcom press release — [best/fastest selling](https://www.mynewsdesk.com/funcom-oslo-as/pressreleases/conan-exiles-is-now-the-best-selling-and-fastest-selling-game-in-funcom-history-2570639), July 5, 2018.**
- **Game Informer — [first-week sales/mod kit](https://gameinformer.com/b/news/archive/2017/02/10/conan-exiles-sells-320-000-in-first-week-of-early-access-development-costs-recouped.aspx), February 2017.**
- **Funcom 2019 annual report — [PDF](https://cdn.funcom.com/investor/2019/Funcom_SE_Annual_Report_2019.pdf).** Long-tail service performance and operational-business context.

### Independent reviews

- **PC Gamer — [review](https://www.pcgamer.com/conan-exiles-review/), May 15, 2018.**
- **GameSpot — [review](https://www.gamespot.com/reviews/conan-exiles-review-dull-and-dense/1900-6416916/), May 25, 2018.**
- **Wccftech — [review](https://wccftech.com/review/conan-exiles-barbaric-fun/), May 16, 2018.**
- **God is a Geek — [review](https://godisageek.com/reviews/conan-exiles-review/), May 22, 2018.**
- **Push Square — [review](https://www.pushsquare.com/reviews/ps4/conan_exiles), 2018/2019.**
- **Game Informer — [pre-launch hands-on](https://gameinformer.com/games/conan_exiles/b/pc/archive/2018/04/06/conan-exiles-is-freed-from-early-access-with-a-double-edged-appeal).** Supplemental preview only.

### Current player evidence

- **Steam Community — [current reviews/community](https://steamcommunity.com/app/440900), [review surface](https://steamcommunity.com/app/440900/reviews/), accessed September 27, 2026.** Current Enhanced/mod/Bazaar/performance testimony; dynamic/self-selected.

### Recommended reading route

1. Read the **Enhanced FAQ first**; it prevents almost every common 2026 platform mistake.
2. Read Age of Sorcery and Age of Heroes in sequence to see the game move from static production thralls toward sorcery + more socially embodied followers.
3. Read 2.2.0 to understand that massive player construction became a networking architecture problem, not merely a graphics issue.
4. Compare PC Gamer/GameSpot/Wccftech: they agree on breadth but differ sharply on whether the grind/roughness is worth it.
5. Sample September 2026 Steam reviews to see modern praise for Enhanced/mods and current Bazaar/update friction.
6. For OpenLegend inspiration, focus on follower roles, corruption tradeoffs, connected worlds and settlement pressure rather than the literal slavery framing.

No video scene or timestamp is represented as watched in this pass.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version | R01 |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 interactions | R05, thirteen worked cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reviews/player feedback | R12, five written reviews + current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation | R14 |

### Explicit mechanics-inventory closure

Character creation; attributes/perks/corruption; XP/level/Knowledge progression and explicit Journey objectives; items/inventory/weapons/armor/durability; crafting/stations/upgrading; sorcery/religion; climbing/mounts and Map-Room/Obelisk/cross-world travel; environmental interaction/resources/temperature/corruption; farming/cooking/pets; combat/dodging/ranged/Trebuchet/explosive/religious siege; practical stealth/survival routing; looting/world bosses; death/respawn/inventory loss; resource/merchant/Bazaar economies; authored lore/escape story/Giant-Kings; companions/thralls/living settlements but no full romance system; follower/faction/camp AI; fixed maps/biomes and Siptah's Vault/Maelstrom/Surge loop; dungeons/Purge/siege/events; extensive building/settlement management; single/co-op/dedicated/PvE/PvP/PvE-Conflict/modded servers; and late-game sorcery/legendary gear/clan war/story/mod loops are all covered.

**Research boundary:** current supported major-content state is Steam Enhanced UE5.8.2/2.2.2 as of September 27, 2026. Consoles and UE4 Legacy have different support/content boundaries. Giant-Kings Part Two is October 6 future content and is not counted as delivered here.

### Follow-up audit — September 27, 2026

The second pass confirmed the current Enhanced/Legacy platform split and follower/sorcery/Purge coverage, but found three substantive omissions: the **Journey System**, operational **Map-Room/Obelisk travel**, and Siptah's actual **Vault/Maelstrom/Surge** loop. Siege was also too generic. Those systems and three new worked examples are now incorporated. The Siptah section preserves Funcom's documented redesign: the three original systems remain related, but Update 2.3 deliberately removed their strict dependency chain after player feedback.
