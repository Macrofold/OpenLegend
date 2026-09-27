# G135 — 7 Days to Die

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

7 Days to Die is most useful as a study in **turning an open, destructible survival world into a repeating preparedness test**. Nearly every system—scavenging, mining, crafting, perks, vehicles, farming, electricity, traps, traders and architecture—can feed the same question: what will happen when the next Blood Moon horde attacks? The distinctive design is not merely “zombies every seven days.” It is the combination of a countdown, voxel destruction, structural integrity and adversarial pathfinding that makes a base a hypothesis the horde repeatedly tests.

The game also requires unusually strict version discipline. It spent almost eleven years in public alpha, replaced major progression/survival systems repeatedly, launched a new current-generation console product with PC 1.0 in 2024, then continued through 2.x and 3.x systemic releases. A description based on Alpha 15, Alpha 20, Alpha 21, 1.0, 2.0 or 3.3 Experimental can all sound like the same game while being materially incompatible.

## R01 — identity, current stable/version boundaries and player promise

The Fun Pimps launched 7 Days to Die into Steam Early Access in December 2013. Version **1.0** reached stable PC and the new PlayStation 5/Xbox Series console edition on July 25, 2024. The "1.0" label ended the alpha numbering but did not end development; the current product has continued through major 2.x and 3.x updates.

As of September 27, 2026:

- **V3.2.0 is the current stable release**, shipped August 26, 2026.
- **V3.3.0 is Experimental**, released September 24, 2026 with the new Bigger Backpack system and known issues. Its backpack/inventory rules are therefore not promoted into the stable mechanics baseline yet.
- The Fun Pimps says **V4.0 is in parallel development** while a dedicated team ships smaller 3.x quality-of-life releases.
- Steam still advertises the game as an open-world blend of FPS, survival horror, tower defense and RPG systems and states **20+ million copies sold**; that is a publisher/store lifetime milestone, not current MAU.

[Steam current page](https://store.steampowered.com/app/251570/7_Days_to_Die/) · [V3.2 stable](https://7-days-to-die.zendesk.com/hc/en-us/articles/52927476667924-V3-2-0-Stable) · [V3.3 Experimental](https://community.thefunpimps.com/threads/v3-3-0-exp.49037/).

### PC/current-console versus 2016 legacy console

The 2016 PlayStation 4/Xbox One edition published through Telltale is a **legacy, frozen branch** based on a much older alpha-era game. It was delisted when the 2024 current-generation product launched. The PS5/Xbox Series version is a new purchase/build aligned with modern PC content; old console saves/content should not be treated as current mechanics. [GameSpot 1.0 guide](https://www.gamespot.com/gallery/7-days-to-die-tips/2900-5588/) · [Pure Xbox launch boundary](https://www.purexbox.com/news/2024/07/7-days-to-die-1-0-launches-to-five-star-xbox-reviews-despite-series-s-grumbles).

The current-generation game later received crossplay and major updates in parity with the modern branch, though editor/mod/platform capabilities can still differ. The old Xbox One/PS4 product should be cited only as historical reception.

### Player promise

The player starts in a zombie-ravaged post-nuclear Arizona-style world, scavenges and crafts, learns recipes/skills, fortifies or builds from scratch, and prepares for escalating periodic Blood Moon hordes. Play can be solo, cooperative, PvP-enabled or heavily customized through server/sandbox rules.

The game has no conventional authored campaign with credits as the main objective. Survival, building, exploration and repeated preparedness are the durable loop.

## R02 — complete player-action and major-mechanics inventory

### Fully destructible block world

Terrain and most structures are block-based and destructible. Players can:
- harvest surface resources;
- chop trees;
- mine stone/ore;
- dig tunnels/trenches;
- demolish walls/floors;
- repair and upgrade blocks;
- take over existing Points of Interest (POIs);
- construct new bases from large shape libraries.

This is a stronger environmental-editing claim than many survival games. A wall is not simply a cover mesh; zombies and players can remove it, and a support loss can collapse attached construction.

### Structural integrity

The current official wiki defines structural integrity through:
- **Mass**;
- **Vertical Support**;
- **Horizontal Support**.

Blocks connected down through vertically supporting material to terrain/bedrock are vertically stable. Unsupported horizontal runs consume the support capacity of attached blocks. Removing or destroying support triggers recalculation and can collapse connected pieces. The placement preview communicates strain/instability through color. [Official wiki — Structural Integrity](https://7daystodie.wiki.gg/wiki/Structural_Integrity).

This creates one of the game's richest interactions: **damage is topology**. A zombie attacking a structural support may destroy much more than its own block.

### Building shapes, materials and upgrading

Building starts with cheap frame-like blocks that can be repositioned and upgraded into stronger material tiers. A large shape menu lets one generic building family become walls, wedges, pillars, roofs, rails and decorative/functional forms.

Higher material durability makes a Blood Moon base tougher, but material alone is not enough; path design, repair access, line of fire, traps and structural redundancy all matter.

### Zombie AI and pathfinding as an architectural opponent

Zombies can attack blocks and seek paths toward players. Horde-base design therefore becomes adversarial level design:
- create a path the AI prefers;
- make that path exposed to fire/traps;
- reinforce alternate breach routes;
- repair critical blocks;
- control elevation and access;
- plan for special infected.

Current player criticism frequently says this encourages "AI cheese" rather than natural fortification. That is a real design tradeoff: sophisticated pathfinding can make construction strategically deep while also turning enemy psychology into an optimization exploit.

### Blood Moon loop

The title's central cadence is the Blood Moon horde, configurable by sandbox options. Historically the default identity is a recurring seventh-night horde, but **V3.0's 150+ sandbox options mean exact timing, enemy density, digging/block behavior and many other rules can be altered or disabled**. Do not make “every seventh day” a universal server invariant in 2026.

The design effect remains: a known or semi-known future attack gives ordinary daylight labor a deadline.

### Looting and POIs

Buildings are hand-authored POIs embedded in Navezgane or random-generation worlds. Modern POIs often contain:
- an intended traversal path;
- environmental storytelling;
- staged zombie triggers;
- loot rooms;
- quest markers;
- tier/difficulty structure.

The combination produces curated combat inside an editable world. Players can follow the route, break walls, climb, dig or otherwise subvert it.

A repeated current complaint is that POIs feel like linear "dungeons" despite the destructible sandbox. That tension is valuable: authored encounter pacing and systemic world freedom can work against one another.

### Character attributes, perks and books

Modern progression combines:
- XP/character levels;
- attribute/perk investment;
- perk effects;
- **skill magazines** that advance crafting capability in specific domains;
- recipe/schematic discovery;
- item quality;
- biome/loot-stage effects.

The magazine system deliberately ties crafting progress to looting/exploration. It is also one of the most divisive modern changes because long-time players preferred earlier learn-by-doing or alternate progression versions.

Do not describe modern 7DTD as pure "use skill to increase skill." That belongs to older alphas.

### Crafting and workstations

Players craft by hand and through stations such as:
- campfire;
- forge;
- workbench;
- chemistry station;
- cement mixer;
- later **Combine Station** introduced by V3.0.

Recipes transform scavenged/mined/farmed materials into tools, weapons, ammunition, medicine, food, building components, vehicle parts and traps.

V3.0's **Item Magnitude** adds exceptional orange-star item stat potential, and the Combine Station supports merging/upgrading item attributes according to the current system. Optional repair/degradation settings can make gear wear a stronger ongoing resource sink. [V3.0 notes](https://7-days-to-die.zendesk.com/hc/en-us/articles/50318172509972-V3-0-Dead-Hot-Summer-Release-Note).

### Weapons, armor and combat

Combat includes:
- clubs, spears and knives;
- bows/crossbows;
- pistols, shotguns, rifles and machine guns;
- explosives;
- robotic/automated defenses;
- turrets/traps;
- armor sets and mods.

Melee uses stamina and positioning; firearms trade noise/ammunition for range/damage. Headshots/dismemberment and special zombies add target priorities.

The 1.0 armor rework replaced much older clothing/armor assumptions with set pieces and set-specific bonuses. V3.0 further expanded item stat magnitude/mod quality. Historical gear tables should not be assumed current.

### Stealth and the heat/activity system

Stealth is practical rather than an RPG invisibility spell:
- crouch/noise;
- lighting;
- weapon noise;
- line of sight;
- armor/perks;
- POI trigger behavior.

Separate from stealth, player activity can contribute to localized "heat"/activity that influences events such as screamer attention. This means a productive base can advertise itself through furnaces/generators/activity even if the player never fires a gun.

### Needs, weather and biome pressure

Food, water, health, stamina, injuries/status effects and infection remain survival concerns.

The exact temperature/weather model has changed repeatedly. **V2.0 Storm's Brewing** in June 2025 added Biome Progression, Dynamic Storms and new enemies; V3.0 then greatly expanded sandbox toggles. Current rules should be cited to the current branch rather than old alpha temperature guides. [V2.0 stable announcement](https://store.steampowered.com/news/posts/?appids=251570&enddate=1753493924&feed=steam_community_announcements).

Biome progression also makes geography part of difficulty/loot advancement rather than a visually interchangeable map.

### Farming, cooking and 2026 chicken husbandry

Players can grow crops, cook recipes and establish renewable food production.

V3.1 **Henpocalypse** added a Chicken Coop workstation and chicken farming, with chickens/feathers/recipes and additional sandbox configuration. It went stable July 27, 2026. [V3.1 notes](https://www.7dtd.tools/versions/v3.1).

This is current stable content; V3.3 backpacks are not.

### Vehicles

Progression unlocks increasingly capable transport:
- bicycle;
- minibike;
- motorcycle;
- 4x4;
- gyrocopter.

Vehicles expand cargo and travel range but need fuel/maintenance and can take damage. They connect remote traders, cities and biomes into one economic route.

Current V3.3 Experimental even has a known dedicated-server issue around picking up vehicles with stored contents, demonstrating why experimental patch notes should not be normalized into stable behavior.

### Traders and quests

Trader compounds provide:
- buying/selling using Dukes currency;
- jobs/quests;
- tier progression;
- rewards;
- specialized inventories/services.

Jobs send players to POIs for tasks such as clearing enemies, fetching items, restoring power or buried supplies depending current quest pool.

Traders are both a progression shortcut and a repeated design controversy. Alpha 21/1.0-era balance changes tried to reduce trader dominance, while critics still argue quest repetition can over-direct an otherwise open sandbox.

### Economy

**Duke's Casino Tokens** are the standard trader currency. Value can come from:
- loot sold;
- quest rewards;
- crafted/scavenged goods;
- barter perks/modifiers;
- resource scarcity.

There is no deep simulated NPC production economy; traders are systemic service hubs.

### Electricity, traps and automation

Players can build generators/battery/solar-like systems as current content permits, wire switches/sensors, power doors/lights, and operate traps/turrets. Horde-base design can combine:
- electric fences;
- blade traps;
- dart traps;
- automated turrets;
- doors and switches;
- repair pathways.

V3.0 added an M60 Turret to late-game defense.

### Robotic Drone — bounded companion automation

Modern 7 Days to Die includes a **Robotic Drone**, which the initial pass omitted. It is a deployable follower that can follow/stay, carry inventory and take mods. Current official-wiki documentation lists a default 16-slot storage inventory and mods that can expand cargo, add a headlamp, increase nearby stamina regeneration or automatically use carried first-aid supplies on the player. [Robotic Drone](https://7daystodie.wiki.gg/wiki/Robotic_Drone).

The Drone is not an authored personality/romance companion and does not replace human co-op roles. It is a **portable support device with spatial presence**: storage, light and healing move with the survivor, but its value depends on crafted quality/mods and it can be told to stay or follow.

### Injuries, infection and treatment — audit expansion

The initial dossier compressed current bodily consequences into "injuries/status effects." Applicable current systems include distinct problems such as:
- Bleeding;
- Infection;
- Sprained/Broken Leg;
- Concussion;
- Laceration and other critical injuries.

These are not one generic debuff. A Broken Leg sharply reduces mobility/jump capability and can worsen/heal more slowly if the player keeps sprinting/jumping; splints/casts improve treatment. A Concussion lowers effective capacity and is treated differently. Infection can progress toward lethal consequences without appropriate medicine. [Health](https://7daystodie.wiki.gg/wiki/Health) · [Broken Leg](https://7daystodie.wiki.gg/wiki/Broken_Leg) · [Concussion](https://7daystodie.wiki.gg/wiki/Concussion).

This makes combat/falls affect **future route and labor choices**: an injured miner may stop sprinting home, a concussed looter may abandon the POI, and medical preparation is qualitatively different from carrying only raw HP restoration.

### Electricity as explicit topology

The initial pass listed electrical items but not the actual network model. Electricity uses a **single-input, multi-output connection graph** wired with the Wire Tool. Sources include Generator Banks, Battery Banks and Solar Banks; switches/sensors/relays then feed doors, lights and traps. Devices have connection-distance/power-draw limits. [Electricity](https://7daystodie.wiki.gg/wiki/Electricity).

Generator fuel consumption depends on active power draw; Battery Banks can be charged by upstream sources; Solar Banks generate only from installed Solar Cells and daylight. This means horde defenses have a real **power architecture**, not an abstract "electricity unlocked" flag.

### Challenges, treasure maps and lockpicking — activities audit

Modern structured activities include:
- **Challenges**, grouped objectives that award XP and can culminate in Trader reward items; the initial Basics group doubles as onboarding before broader challenges unlock. [Challenges](https://7daystodie.wiki.gg/wiki/Challenges);
- **Treasure Quests**, initiated by found maps that mark a search region and require physically digging for a buried locked cache. [Treasure Quest](https://7daystodie.wiki.gg/wiki/Treasure_Quest);
- **lockpicking**, where consumable Lockpicks attempt to open eligible locked containers with failure/break chance; current lockpicking perks can reduce time/breakage and alter related magazine/book discovery. [Lockpick](https://7daystodie.wiki.gg/wiki/Lockpick).

These systems close a gap in the activities/minigames inventory: not every objective is a Trader POI job or Blood Moon.

### Multiplayer and customization

Solo, peer/co-op, dedicated servers and PvP settings are possible. V3.0 added more than 150 sandbox options, and V3.1 split several density/respawn settings further. Settings can alter:
- Blood Moon behavior;
- zombie/animal density;
- block damage;
- loot;
- XP;
- death penalties;
- vehicle damage;
- gravity;
- electrical output;
- digging and numerous novelty/serious rules.

This makes **world configuration itself part of the game's design surface**.

### Useful absences

There is no conventional magic system, romance system or authored companion-approval party. **The Robotic Drone is a real deployable support follower**, but it is a tool-like storage/healing/light companion rather than an authored social character. Traders are service NPCs rather than deeply scheduled simulated residents. Story/lore exists but the game is not driven by cinematic quests. Character identity is build/perk/equipment-driven rather than a fixed class.

## R03 — items, inventory, qualities and composition

### Inventory categories

Important item families include:
- raw resources;
- food/water/medicine;
- tools;
- melee/ranged weapons;
- ammunition/explosives;
- armor;
- mods;
- building blocks;
- electrical parts/traps;
- workstations;
- books/magazines/schematics;
- vehicle components;
- farm/chicken resources;
- trader currency;
- quest items.

Inventory space and encumbrance make loot runs an optimization problem.

### Stable versus Experimental backpack rules

V3.2 stable still uses the pre-V3.3 stable inventory baseline.

V3.3 Experimental introduces:
- an 8×6 base inventory;
- Small/Medium/Large backpacks;
- six backpack quality levels;
- a new backpack equipment slot;
- potential expansion up to 96 slots;
- Pack Mule/pocket-mod interaction.

Those are documented here as **experimental future-near evidence**, not the current stable inventory contract. [V3.3 Experimental](https://community.thefunpimps.com/threads/v3-3-0-exp.49037/).

### Quality, mods and repair

Weapons/tools/armor have quality and mod capacity/stat variation. V3.0 adds Item Magnitude and progressive mod quality, making two same-name items potentially different projects.

Optional repair/degradation can make repeated use consume long-term item value. The combination creates a loop where looting may remain relevant after a recipe is already mastered.

## R04 — progression, economy, time and failure

### The countdown makes time strategic

The central temporal loop is:
1. loot/gather;
2. improve tools/skills;
3. build or reinforce;
4. stock ammunition/medicine/repair materials;
5. survive horde;
6. inspect failure;
7. rebuild better.

The important feature is **diagnostic recurrence**. The next attack provides feedback on the last design.

### Craft progression

Modern character progression has three connected layers:
- XP → attributes/perks;
- magazines/books → crafting capability and special bonuses;
- loot/traders/biomes → item quality and access.

This distributes advancement between killing/doing, character build and world exploration.

### Biome progression

V2.0 makes biome choice more explicitly progressive. Higher-risk environments can provide higher-value opportunity, discouraging permanent residence in the safest area if the player wants maximal advancement.

**Limit:** current Steam critics argue this can feel like forced linearity in a game whose original appeal was open-ended survival.

### Death and recovery

Death penalties are configurable. Depending settings, players may drop carried/toolbelt/equipment state, keep items, lose XP/debuff time or face harsher rules. A bedroll/bed establishes a spawn point.

Because V3.0 exposes unusually broad options, any single death rule should be labeled as a preset/server configuration rather than universal.

### Permadeath and sandbox extremes

V3.0's philosophy is player agency through presets and toggles, including severe rulesets. This is significant: the developers responded to years of conflicting preferences partly by exposing mechanics as configuration rather than declaring one canonical difficulty.

### Endgame

There is no one canonical end boss/ending. Late play tends toward:
- top-tier equipment;
- late perks/books;
- vehicles;
- high-tier POIs;
- elaborate electricity/traps;
- durable horde bases;
- high-difficulty biomes;
- custom challenge settings;
- mods;
- multiplayer construction.

The return loop comes from the next horde, new world seed, different rules/preset or co-op/modded campaign.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based examples.

### Case 1 — a missing column becomes a base-wide failure

**Intention:** expand an elevated firing platform.  
**Conditions:** the platform is near its horizontal-support limit.  
**Actions:** place another heavy block or allow zombies to destroy a support column.  
**Interaction:** the engine recalculates structural integrity across attached unsupported mass.  
**Result:** several blocks—or a large section—can collapse, not just the damaged point.  
**Next decision:** rebuild with redundant supports/lighter shapes or redesign the kill corridor.  
**Lesson:** physical dependency turns local damage into systemic consequence.

### Case 2 — Blood Moon converts mining into ammunition

**Intention:** survive the upcoming horde.  
**Conditions:** daylight remains before the configured attack.  
**Actions:** mine ore, smelt/refine, craft ammunition/repair materials, return before the deadline.  
**Interaction:** exploration time trades directly against construction/stockpiling time.  
**Result:** the countdown makes even peaceful mining part of combat preparation.

### Case 3 — an authored POI and destructible world disagree

**Intention:** reach a high-tier loot room.  
**Conditions:** the POI has an intended path with ambushes.  
**Actions:** either follow the route or break/climb through alternate geometry.  
**Interaction:** authored encounter sequencing competes with voxel freedom.  
**Result:** experienced players can bypass content; designers respond with stronger materials/triggers/layout tricks.  
**Limit:** if the authored path becomes too mandatory, the destructible-world promise feels false.

### Case 4 — zombie pathfinding becomes player-authored tower defense

**Intention:** concentrate the horde into one defensible lane.  
**Conditions:** the player understands how zombies evaluate viable paths/block resistance.  
**Actions:** make one approach deliberately cheaper while hardening alternatives; place traps/firing positions along it.  
**Interaction:** architecture influences AI movement.  
**Result:** base layout becomes a tower-defense level authored by the player.  
**Counterpoint:** current player critics call extreme versions "pathfinding cheese."

### Case 5 — a magazine changes the destination of a loot run

**Intention:** unlock higher-quality weapon/tool crafting.  
**Conditions:** progress requires additional magazines in the relevant crafting skill.  
**Actions:** prioritize POIs/containers likely to produce books or use trader routes rather than only mine resources at home.  
**Interaction:** crafting advancement deliberately pushes a builder back into exploration.  
**Result:** world looting remains important after basic shelter is solved.  
**Limit:** players who want self-sufficient homesteading can experience this as forced scavenger RNG.

### Case 6 — a trader job is both content and route optimization

**Intention:** gain Dukes/rewards while improving loot.  
**Conditions:** trader offers a job at a POI.  
**Actions:** travel there, optionally loot once before activation under applicable rules, activate/reset quest state, complete objective and return.  
**Interaction:** one trip combines quest progression, loot, combat and commerce.  
**Result:** traders can dominate efficient progression.  
**Balance risk:** when one activity is too efficient, open-world choice becomes nominal.

### Case 7 — a vehicle expands the viable economy

**Intention:** exploit distant higher-risk cities/traders.  
**Conditions:** the survivor has progressed from walking to a cargo-capable vehicle.  
**Actions:** fuel it, load repair/loot capacity, make a multi-stop route.  
**Interaction:** travel time and carrying capacity change the value of distant POIs.  
**Result:** geography compresses and the home base can specialize rather than sit beside every resource.

### Case 8 — activity attracts a problem

**Intention:** run multiple forges/workstations to prepare for horde night.  
**Conditions:** productive activity contributes to local attention/heat under current mechanics.  
**Actions:** leave production running while building.  
**Interaction:** economic throughput can increase the chance of hostile interruption.  
**Result:** the base must defend peacetime production, not only scheduled Blood Moons.  
**Lesson:** production can create externalities.

### Case 9 — biome progression turns relocation into character growth

**Intention:** find better loot/challenges after mastering safer zones.  
**Conditions:** V2.0+ biome progression ties risk/environment to advancement.  
**Actions:** acquire travel/weather/combat readiness and move operations into a more dangerous biome.  
**Interaction:** character/item progression changes the map areas worth occupying.  
**Result:** geography acts like a soft progression tier.  
**Limit:** old players may see the same mechanism as loss of sandbox freedom.

### Case 10 — 150+ toggles preserve disagreement instead of resolving it

**Intention:** play an underground bunker fantasy without zombies digging aggressively.  
**Conditions:** host controls V3.0+ sandbox rules.  
**Actions:** disable/reduce digging or adjust block damage, horde cadence and related settings.  
**Interaction:** a disputed design rule becomes a world-author choice.  
**Result:** different communities can preserve incompatible fantasies in the same executable.  
**Cost:** shared guides/expectations become less universal.

### Case 11 — chicken farming changes feather acquisition from scavenging to husbandry

**Intention:** create a renewable domestic source around the base.  
**Conditions:** V3.1 stable and Chicken Coop progression/resources.  
**Actions:** catch/acquire chickens, operate the coop and harvest outputs for current recipes/material use.  
**Interaction:** a formerly field-loot resource becomes another home-production chain.  
**Result:** base self-sufficiency increases while adding another workstation/resource routine.

### Case 12 — injury changes the optimal route home

**Intention:** finish a distant loot run after a fall.  
**Conditions:** survivor suffers a Broken Leg.  
**Actions:** treat with an available splint/cast, stop sprinting/jumping unnecessarily and choose a safer return path or vehicle.  
**Interaction:** injury duration/mobility penalties convert a local mistake into a travel/logistics problem.  
**Result:** medical supplies and route knowledge become progression value, not just combat healing.

### Case 13 — the Drone converts equipment into a moving support role

**Intention:** extend a solo expedition without giving up too much inventory/medical margin.  
**Conditions:** crafted/deployed Robotic Drone with appropriate mods.  
**Actions:** load cargo/medical supplies, set it to follow and use its storage/light/medic support.  
**Interaction:** an equipment item becomes a persistent follower with inventory and automatic support behavior.  
**Result:** solo play gains a bounded companion-like role without adding a human/NPC relationship system.

### Case 14 — power topology determines whether a trap lane works

**Intention:** run sensors, electric fences/doors and traps during Blood Moon.  
**Conditions:** source wattage, wire distances and device draw must fit the circuit.  
**Actions:** connect generator/battery/solar sources through relays/switches/sensors to defenses and test the chain.  
**Interaction:** base architecture and electrical graph become one defense design.  
**Result:** a severed/mis-budgeted electrical dependency can disable multiple downstream defenses.

### Case 15 — Experimental backpack evidence must stay experimental

**Intention:** document current inventory capacity.  
**Conditions:** V3.2 stable and V3.3 Experimental both exist on September 27.  
**Actions:** compare release channels.  
**Interaction:** V3.3's 96-slot backpack potential is real code but not the default public stable branch.  
**Result:** dossier records it as experimental rather than silently changing the stable rules.  
**Research lesson:** branch state is part of a live game's mechanics.

## R06 — people, AI, factions, traders and multiplayer

### Traders as the main persistent NPC layer

Traders are named service NPCs with compounds, quests, stock and progression. They are not a deeply simulated settlement population with daily social schedules/relationships.

The game has no native romance/companion-approval system.

### Zombies and animals

Enemy AI has to operate in an editable world. Zombies navigate, climb/jump/attack blocks according to current capabilities and can undermine construction. Special infected create different horde priorities.

Wildlife provides hunting threats/resources. V3.1 chicken systems expand domestic animal interaction but do not turn the game into a full livestock simulation.

### Multiplayer role specialization

Co-op naturally produces roles:
- builder;
- miner;
- looter;
- farmer/cook;
- trader/quest runner;
- mechanic;
- combat specialist;
- electrician/trap designer.

Perks reinforce specialization, while shared workstations/bases let one player's investment benefit others.

### PvP

Server settings can allow player competition, base raiding and different death/loot rules, but the game's signature authored pressure remains the zombie/horde ecosystem rather than Rust-like PvP as the only durable endgame.

## R07 — art, audio, interface and feel

7DTD mixes voxel/block mutability with authored POI dressing. The resulting visual identity is less polished than fixed-geometry shooters but unusually manipulable.

### World legibility

Biomes, road networks, city silhouettes and trader markers make macro-navigation readable. POI danger tiers and authored signage increasingly communicate building purpose.

V3.0's **Sign-Tech** overhaul and 60+ new POIs specifically increased environmental identity.

### Sound

Zombie vocalization, breaking blocks, traps, gunfire, thunderstorms and the Blood Moon atmosphere communicate threat, though historical/current criticism often notes audio positioning/presentation lacks the sophistication of top horror games.

### Interface

Important screens include:
- inventory/toolbelt;
- crafting;
- perk/attribute;
- magazines/books;
- map/waypoints;
- quest journal;
- traders;
- vehicle inventory;
- electricity wiring;
- sandbox configuration.

V3.0 also overhauled the underlying XUi framework and customization. V3.2 improved Combine Station readability.

The large number of subsystems makes discoverability a persistent challenge; 1.0's Challenge system was meant to improve tutorial progression.

## R08 — story, environmental narrative and play

The setting is post-nuclear **Navezgane, Arizona** with a zombie outbreak and scattered human/trader remnants. Environmental storytelling exists in:
- ruined homes/businesses;
- bunkers/labs;
- corpse/loot staging;
- signage;
- military/industrial sites;
- trader dialogue/quest framing.

But there is no current conventional story campaign whose authored plot is the main completion path.

The real narrative unit is often a **week/base story**:
- where the group settled;
- what POI almost killed them;
- what collapsed;
- which weapon finally became craftable;
- how the Blood Moon found a design flaw;
- who ran out of ammunition;
- what they rebuild.

The horde cadence gives emergent stories a natural act structure.

## R09 — production and development

7 Days to Die is one of gaming's longest, most visibly iterative Early Access histories.

It entered public Early Access in 2013 and did not become 1.0 until July 2024. During that period The Fun Pimps repeatedly replaced rather than merely appended systems:
- progression models;
- crafting;
- skill/perk structures;
- zombie AI;
- world generation;
- art/animation;
- armor/clothing;
- traders;
- POIs;
- survival conditions.

That history creates a peculiar audience problem: a player who loved Alpha 16 may reasonably feel that "the game they bought" changed genre emphasis by 1.0.

### Console rights/history

The 2016 console port/publishing arrangement through Telltale became stranded after Telltale's collapse and rights complications. The eventual 2024 current-generation edition was a new product/build rather than an update to that old executable.

Historical 2016 console reviews therefore mostly measure a branch that modern console buyers no longer receive.

### 1.0 did not mean content-complete

The 2024 transition was controversial because public future plans still contained major systems. Pro Game Guides documented player skepticism about calling it 1.0 after nearly twelve years. [PGG](https://progameguides.com/7-days-to-die/7-days-to-die-is-finally-leaving-early-access-in-june-but-the-fans-arent-sure-its-the-right-move/).

Development then delivered:
- V2.0 Storm's Brewing in 2025;
- V3.0 Dead Hot Summer in June 2026;
- V3.1 Henpocalypse in July;
- V3.2 in August;
- V3.3 Experimental in September.

### 2026 cadence change

The V3.2 announcement says a **dedicated smaller-update team** now handles frequent fixes/QoL/cosmetics separately while the major-release team develops V4.0. That is a production architecture response to a familiar live-game tension: players want both foundational work and visible ongoing fixes.

## R10 — distribution, promotion, modding and virality

Discovery channels include:
- original crowdfunding/Early Access;
- Steam;
- console releases;
- YouTube/Twitch survival series;
- co-op creator challenges;
- Steam/community mods;
- streamer weekends before major updates;
- sales/free trials;
- update/dev streams.

The core is unusually creator-friendly because every week has an obvious video premise:
**"Can this base survive Day 7/14/100 under X rules?"**

That produces:
- build tutorials;
- challenge runs;
- overhaul-mod playthroughs;
- horde-base experiments;
- random-gen exploration;
- co-op series.

V3.0's shareable sandbox preset codes make rules themselves easier to distribute with a challenge.

The modding ecosystem is especially important. Overhaul mods can preserve old progression philosophies or transform the game substantially. Current Steam positives still cite mods as a reason for thousands of hours.

## R11 — commercial and participation context

The Steam store currently states **20+ million copies sold**. This is a lifetime publisher/store claim across the franchise/product context, not current active population.

Steam's September 2026 review surface is exceptionally large—hundreds of thousands of reviews—and remains Very Positive all-time, while recent sentiment is more mixed/negative than the lifetime score. Third-party snapshots should not be substituted for Valve's live metric as a permanent figure.

The modern base price increased around 1.0, another source of veteran criticism. Current monetization includes the paid base game plus optional cosmetic packs rather than a required subscription.

Operational burden includes:
- PC/current-console parity;
- crossplay;
- dedicated server compatibility;
- random generation;
- save migrations;
- mod support;
- performance on large editable worlds;
- physics/structural calculations;
- frequent systemic patches.

## R12 — substantive reviews and current player evidence

Because the game existed publicly for a decade before 1.0, review evidence falls into **current 1.0+ assessments** and **historical legacy-branch criticism**. Old console reviews are useful production history, not current verdicts.

### 1. Try Hard Guides — Erik Hodges, July 29, 2024 — 8/10, PC 1.0

[OpenCritic index/full-review route](https://opencritic.com/game/2809/view/reviews?page=2&sort=score-low).

Try Hard Guides calls the game dated in presentation/engine/tedium while praising the uniquely addictive combination of survival, destructible building and recurring horde pressure. The review sees enough originality in the loop to argue it could inspire its own subgenre.

### 2. CD-Action — September 4, 2024 — 7/10, PC 1.0

[Metacritic critic index](https://www.metacritic.com/game/7-days-to-die/critic-reviews/?platform=pc).

CD-Action's assessment captures the central contradiction: after a decade in Early Access, the game still feels unfinished and poorly optimized, yet the critic spent more than a hundred hours having fun. It is useful as evidence that technical polish and systemic engagement can diverge sharply.

### 3. The GAP — August 12, 2024 — 1.0 re-review

[Full re-review](https://thegapodcast.com/2024/08/12/7-days-to-die-re-review/).

The GAP is much harsher. It recognizes 7DTD as an early hybrid of Minecraft/DayZ/Fallout-like ideas but argues modern progression/time gates became hostile to player agency and that the 1.0 price jump was difficult to justify. This is a valuable counterweight to "more progression always equals more depth."

### 4. Wanderer — August 2026 — current long-form review

[Full review](https://playwanderer.online/game-reviews/7-days-to-die).

Wanderer centers the **clock** as the real game: mining, farming, crafting and repair become meaningful because the next horde is coming. It praises the destructible tower-defense survival loop while criticizing dated presentation, performance and modern magazine/trader progression constraints. This is the most current independent long-form review located in this pass.

### 5. Jenesque Gaming — December 10, 2024 — post-1.0 long-form review

[Full review](https://jenesquegaming.uk/2024/12/10/7-days-to-die-version-1-0/).

This co-op-focused assessment finds 1.0 the most stable/refined version the writer had played, praises horde nights and the building/survival mix, and still treats "finished" as qualified because updates/bugs continue. It is less formal than a magazine review but substantive, first-hand and independent.

### Historical contrast — GameSpot and TheXboxHub, 2016 legacy console

[GameSpot 2016 review](https://www.gamespot.com/reviews/7-days-to-die-review/1900-6416477/) and [TheXboxHub 2016 review](https://www.thexboxhub.com/7-days-die-review/) heavily criticized bugs, controls, presentation and unfinished design. These reviews describe the old Telltale-era console branch and **must not be used as current PS5/Xbox Series technical evidence**. Their value is showing how dramatically the product boundary changed.

### Current Steam sampling — September 2026

[Current Steam English reviews](https://steamcommunity.com/app/251570/reviews/?l=english) show a striking veteran dispute.

Current negatives include long-play players arguing:
- magazine progression feels forced;
- trader quests over-direct advancement;
- POIs became linear scripted dungeons;
- zombie pathfinding encourages cheese;
- years of system rewrites displaced optimization;
- current publisher/community controversies harmed trust.

Current positives include very long-play users saying:
- the horde/base loop is still unmatched;
- co-op is highly replayable;
- modding sustains the game;
- building freedom remains exceptional.

A September 2026 12,000+ hour recommended reviewer on the Steam community front page says the game led them into modding/coding and PC ownership—an unusually strong testimony to its extensibility/retention, though one anecdote cannot establish general prevalence.

### Reception synthesis

**Praised repeatedly**
- destructible world/building freedom;
- structural-integrity stakes;
- recurring horde deadline;
- highly replayable co-op;
- enormous customization/modding;
- satisfying progression from scavenger to fortified engineer;
- unusual blend of survival and tower defense.

**Criticized repeatedly**
- persistent optimization/technical roughness;
- progression systems rewritten repeatedly;
- magazines/traders perceived as forced by some veterans;
- POI scripted-path tension with voxel freedom;
- AI-path exploitation;
- outdated audiovisual feel;
- long development cycle and trust disputes.

The core research question is therefore not "is the game finished?" but **how much authored direction can be added before an open survival sandbox stops feeling self-directed**.

## R13 — transferable inspiration and limits for OpenLegend

These are research hypotheses, not accepted implementation requirements.

### 1. A recurring threat can organize unrelated systems

A horde deadline makes mining, cooking, construction and trading part of one strategic arc.

**Potential lesson:** world events can create coherence without a quest forcing every preceding action.  
**Limit:** predictable cadence becomes rote if each cycle tests the same solution.

### 2. Damage should propagate through relationships

Structural integrity means one destroyed support can change an entire building.

**Potential lesson:** simulation is more expressive when objects depend on one another.  
**Limit:** catastrophic propagation needs excellent previews/debugging or feels random.

### 3. Editable worlds and authored levels are in tension

7DTD's POIs demonstrate both benefits: hand-authored pacing inside a breakable world.

**Potential lesson:** authored content can provide local drama without making the whole world static.  
**Limit:** invisible trigger corridors fight player expectations if walls can supposedly be bypassed.

### 4. Enemies that understand construction make building combat

Zombie pathing turns architecture into tactical control.

**Potential lesson:** NPC navigation goals can be part of a building system's feedback loop.  
**Limit:** players may optimize the algorithm rather than inhabit the fiction.

### 5. Progression sources influence playstyle

Magazine-based crafting forces explorers to leave home; trader jobs pull players toward repeatable authored content.

**Potential lesson:** where advancement comes from is a world-behavior lever.  
**Limit:** one mandatory source can invalidate builders, farmers or other valid fantasies.

### 6. World configuration can preserve multiple design philosophies

V3.0 exposes 150+ sandbox controls rather than forcing every player into one survival model.

**Potential OpenLegend implication:** world authors can own rule bundles while engine primitives stay reusable.  
**Limit:** unconstrained toggles make testing, documentation and multiplayer expectation much harder.

### 7. Iterative attacks are natural design tests

Every horde exposes whether the player's defense hypothesis worked.

**Potential lesson:** feedback loops are strongest when failure identifies a specific design weakness.  
**Limit:** rebuilding should produce new decisions, not only resource replacement.

### 8. Production chains can create attention externalities

Forges/electricity/activity make a productive base more noticeable.

**Potential lesson:** infrastructure should affect the surrounding world, not exist in a private UI layer.

### 9. Versioned world rules need explicit provenance

A 2016 console guide, Alpha 21 guide and V3.2 guide can contradict each other honestly.

**OpenLegend lesson:** mechanics documentation should attach behavior to version/world-package provenance.

### 10. Modding can preserve discarded official philosophies

Overhauls let communities retain older progression styles or replace major systems.

**Limit:** if official design depends on mods to satisfy foundational player types, discoverability and support become fragmented.

## R14 — sources, preservation, research route and requirement map

### Preservation result

G135 was added in the September 27 survival-expansion scope. Before writing this dossier, existing game/mechanics/dossier owners and the seven-file packet-derived reference owners were checked; no dedicated 7 Days to Die owner existed.

The original packet predates G135. This dossier therefore becomes the per-game research owner but does **not** claim the separate packet-wide P01 reconciliation is complete.

### Primary/current sources

- **The Fun Pimps / Steam — [current store/update surface](https://store.steampowered.com/app/251570/7_Days_to_Die/), accessed September 27, 2026.** Current product description, 20m+ publisher milestone and current update channel.
- **The Fun Pimps — [V3.2.0 Stable](https://7-days-to-die.zendesk.com/hc/en-us/articles/52927476667924-V3-2-0-Stable), August 26, 2026.** Primary stable-version boundary and new smaller-update team/V4 parallel work.
- **The Fun Pimps — [V3.3.0 Experimental](https://community.thefunpimps.com/threads/v3-3-0-exp.49037/), September 24, 2026.** Primary experimental backpack rules and known-issue boundary.
- **The Fun Pimps — [V3.0 Dead Hot Summer](https://7-days-to-die.zendesk.com/hc/en-us/articles/50318172509972-V3-0-Dead-Hot-Summer-Release-Note), June 2026.** Primary 150+ sandbox options, Item Magnitude, repair/degradation, POI/UI/modding changes.
- **Steam/The Fun Pimps — [V2.0 stable announcement](https://store.steampowered.com/news/posts/?appids=251570&enddate=1753493924&feed=steam_community_announcements), June 27, 2025.** Primary Biome Progression/Dynamic Storms/crossplay-era scope.
- **7dtd.tools — [V3.1 notes](https://www.7dtd.tools/versions/v3.1), July 27, 2026.** Structured mirror of official Henpocalypse stable release; used for chicken-farming/sandbox update boundary.
- **Official 7 Days to Die Wiki — [Structural Integrity](https://7daystodie.wiki.gg/wiki/Structural_Integrity) and [Building Structures](https://7daystodie.wiki.gg/wiki/Building_Structures), accessed September 27, 2026.** Maintained current technical mechanics documentation.
- **Official 7 Days to Die Wiki — [Robotic Drone](https://7daystodie.wiki.gg/wiki/Robotic_Drone), [Electricity](https://7daystodie.wiki.gg/wiki/Electricity), [Health](https://7daystodie.wiki.gg/wiki/Health), [Broken Leg](https://7daystodie.wiki.gg/wiki/Broken_Leg), [Concussion](https://7daystodie.wiki.gg/wiki/Concussion), accessed September 27, 2026.** Follow-up operational evidence for follower support, power topology and distinct injury states.
- **Official 7 Days to Die Wiki — [Challenges](https://7daystodie.wiki.gg/wiki/Challenges), [Quests](https://7daystodie.wiki.gg/wiki/Quests), [Treasure Quest](https://7daystodie.wiki.gg/wiki/Treasure_Quest), [Lockpick](https://7daystodie.wiki.gg/wiki/Lockpick), accessed September 27, 2026.** Structured activity/treasure/lockpicking evidence added in the follow-up audit.
- **GameSpot — [1.0 starter guide](https://www.gamespot.com/gallery/7-days-to-die-tips/2900-5588/), July 2024.** Current-generation/legacy-console transition and 1.0 systems.
- **Steam announcement archive — [1.0 release notes](https://store.steampowered.com/news/posts/?appids=251570&enddate=1721866113&feed=steam_community_announcements), June/July 2024.** Primary 1.0 transition.

### Independent reviews and reception

- **Try Hard Guides — 1.0 PC review, July 29, 2024.** Routed through [OpenCritic](https://opencritic.com/game/2809/view/reviews?page=2&sort=score-low); substantive current review.
- **CD-Action — PC 1.0 review, September 4, 2024.** Routed through [Metacritic critic index](https://www.metacritic.com/game/7-days-to-die/critic-reviews/?platform=pc).
- **The GAP — [1.0 re-review](https://thegapodcast.com/2024/08/12/7-days-to-die-re-review/), August 12, 2024.**
- **Wanderer — [current long-form review](https://playwanderer.online/game-reviews/7-days-to-die), August 2026.**
- **Jenesque Gaming — [1.0 long-form review](https://jenesquegaming.uk/2024/12/10/7-days-to-die-version-1-0/), December 10, 2024.**
- **GameSpot — [2016 legacy console review](https://www.gamespot.com/reviews/7-days-to-die-review/1900-6416477/).** Historical only.
- **TheXboxHub — [2016 legacy console review](https://www.thexboxhub.com/7-days-die-review/).** Historical only.
- **Pro Game Guides — [1.0 transition skepticism](https://progameguides.com/7-days-to-die/7-days-to-die-is-finally-leaving-early-access-in-june-but-the-fans-arent-sure-its-the-right-move/), April 2024.** Production/reception context.

### Current player evidence

- **Steam Community — [English reviews](https://steamcommunity.com/app/251570/reviews/?l=english), [community front page](https://steamcommunity.com/app/251570?l=english), accessed September 27, 2026.** Direct self-selected testimony. Current legal/publisher allegations are not adopted as facts; the samples are used for system/experience perceptions only.

### Recommended reading route

1. Read the official **Structural Integrity** page before any review; it explains why 7DTD building is mechanically different from cosmetic base decoration.
2. Read the **1.0**, **V2.0**, **V3.0**, **V3.1** and **V3.2** notes in order. The modern game is the result of post-"release" redesign, not a frozen 2024 build.
3. Compare Try Hard Guides with The GAP: both recognize originality but disagree sharply on whether modern progression respects the player.
4. Read Wanderer's 2026 review for the cleanest formulation of "the clock is the game."
5. Sample current Steam veteran positives/negatives around magazines, traders, POIs and AI pathing.
6. Keep V3.3 backpack findings explicitly Experimental until a stable release post appears.

No video scene or timestamp is represented as watched in this pass.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version boundaries | R01 |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 worked interactions | R05, fifteen cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reviews/player feedback | R12, five 1.0/current substantive reviews plus historical-console contrast and current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation/navigation | R14 |

### Explicit mechanics-inventory closure

Character creation; attributes/perks; XP/levels; magazine/book crafting progression; items/inventory/quality/mods; weapons/armor; crafting/workstations/upgrading/repair; no magic system; walking/vehicles/gyrocopter; destructible terrain/object interaction; farming/cooking/chicken husbandry; combat/practical stealth/traps/turrets; injuries/infection and distinct treatment; looting/POIs/lockpicking/treasure Challenges; death/recovery/death-rule customization; Dukes/traders/jobs; environmental narrative rather than authored campaign; no romance/approval party but a deployable Robotic Drone support follower; trader NPCs/zombie/animal AI; no universal faction-reputation simulation; Navezgane/random worlds/biome progression/weather; Challenges/quests/Blood Moon/world events; voxel building/structural integrity/explicit electrical circuits/base management; solo/co-op/dedicated/PvP/crossplay and extensive sandbox configuration; late-game horde engineering/mods/new worlds as return loops are all covered.

**Research boundary:** current stable evidence is V3.2.0 on September 27, 2026. V3.3.0 backpack changes are opt-in Experimental and explicitly separated. Server presets can alter so much of survival, AI and death that exact timing/damage/density rules must be verified against a world's SandboxCode rather than assumed from a generic guide.

### Follow-up audit — September 27, 2026

The second pass confirmed the V3.2 stable/V3.3 Experimental boundary and structural/progression research, but found four under-covered applicable areas: **Robotic Drone companionship**, distinct injuries/treatment, actual electrical-network topology, and non-Trader structured activities (Challenges/treasure/lockpicking). Those gaps are now closed above with three additional worked interactions. The correction also prevents the prior "no companion party" sentence from being misread as "no follower exists."
