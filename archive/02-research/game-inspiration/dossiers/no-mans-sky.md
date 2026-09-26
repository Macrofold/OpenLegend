# No Man's Sky — full research dossier

**G17 · Complete research pass, September 26, 2026.** This dossier treats *No Man's Sky* as a ten-year evolving game rather than freezing it at the August 2016 launch. Launch mechanics and reviews are preserved because they explain the game's original design tension; current-system claims are grounded in later Hello Games updates through **Cosmos 7.0 (September 9, 2026)**. Time-limited Expeditions and community events are labeled separately from permanent systems. [Preserved earlier chapter](../games/no-man-s-sky.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

The most important comparison for OpenLegend is no longer simply “procedural generation can feel shallow.” Modern No Man's Sky has become a **portfolio of overlapping player projects** layered onto one generated universe: explore, document, mine, fight, trade, build, farm, fish, manage settlements, raise creatures, battle creatures, customize ships, captain freighters, dispatch fleets, build Corvettes, salvage wreckage, run Expeditions, improve guild standing, own stations, join alliances, and pursue story/lore. The design question is how those projects reinforce—or fail to reinforce—the feeling that a procedurally generated place is meaningfully different.

The 2016 launch, later free updates and platform-specific capabilities are not one timeless ruleset. No personal gameplay, full-video viewing, procedural-code audit or representative player survey is claimed. Worked situations below are constructed from documented rules, not play sessions conducted for this research.

The numbered sections provide the full mechanics and reception survey. Detailed studies within them preserve additional worked interactions, production accounts and evidence limits; dated patch and platform qualifications apply to the historical overviews. Source annotations retain the access limits recorded by each research pass.

## 1. Identity, player promise, and version boundary

No Man's Sky is a first-/third-person science-fiction exploration, survival and construction sandbox by Hello Games. Its original launch promise centered on a seamless procedurally generated universe with roughly 18 quintillion planets, planetary landing without loading screens, resource gathering, discovery, alien life, starships and a journey toward the galactic center. [NMS16](#nms16) [NMS17](#nms17)

At launch, the practical core loop was:

1. wake beside a damaged ship;
2. mine basic resources;
3. repair life-support, Multi-Tool and starship systems;
4. survive environmental hazards;
5. scan flora/fauna/minerals;
6. learn alien words and interact with aliens;
7. sell goods and improve inventory/technology;
8. acquire fuel;
9. launch, warp and repeat on a new planet. [NMS17](#nms17) [NMS18](#nms18)

That loop still exists, but it is now only the **spine** of a much larger game.

Major durable expansions that materially changed the game include:

- **Foundation (2016):** base building, farming, freighters, Creative and Survival modes. [NMS19](#nms19)
- **NEXT (2018):** full multiplayer, expanded bases, freighter fleets, third person, major crafting/resource rework. [NMS20](#nms20)
- **Beyond (2019):** VR, Nexus/Space Anomaly social hub, larger multiplayer, technology trees, cooking, industrial bases, creature riding/taming. [NMS21](#nms21)
- **Synthesis (2019):** starship class/inventory upgrades, ship salvage, multiple Multi-Tools. [NMS22](#nms22)
- **Companions (2021):** tame, breed, genetically alter and use creature companions. [NMS23](#nms23)
- **Frontiers (2021):** player-overseen planetary settlements and major base-building overhaul. [NMS24](#nms24)
- **Sentinel / Outlaws / Endurance (2022):** deeper combat and Sentinel enemies, pirate/outlaw systems and squadrons, freighter/fleet overhaul. [NMS25](#nms25) [NMS26](#nms26) [NMS27](#nms27)
- **Waypoint (2022):** customizable difficulty, inventory/milestone overhaul, Relaxed mode and broad onboarding/QoL changes. [NMS28](#nms28)
- **Interceptor / Echoes (2023):** corrupted worlds and Sentinel ships; Autophage race/staff and capital-ship combat. [NMS29](#nms29) [NMS30](#nms30)
- **Orbital / Worlds I / Aquarius (2024):** procedural space stations, ship fabrication, guild/economy refresh, universe/biome refresh, fishing. [NMS31](#nms31) [NMS32](#nms32) [NMS33](#nms33)
- **Worlds II / Relics / Beacon / Voyagers (2025):** new stars/planet types/deep oceans/gas giants, fossil hunting, multiple/Autophage settlements, buildable multi-crew Corvettes. [NMS34](#nms34) [NMS35](#nms35) [NMS36](#nms36) [NMS37](#nms37)
- **Remnant / Xeno Arena / The Swarm / Cosmos (2026):** gravity-gun salvage and modular vehicles, creature battling/genetic progression, community faction war, and space-station ownership/alliances/orbital construction/deep-space salvage. [NMS38](#nms38) [NMS39](#nms39) [NMS40](#nms40) [NMS41](#nms41)

The current game should therefore be thought of as a **live accumulation of systems**, not one unchanged launch design.

## 2. Character creation, identity and “classes”

There is no conventional RPG class selection.

A Traveller's identity is assembled through:
- appearance/body customization;
- Exosuit technology/loadout;
- equipped Multi-Tool(s);
- chosen starships;
- freighter/fleet;
- base/settlement ownership;
- companions;
- reputation/guild membership;
- faction/story choices where available;
- player-chosen difficulty rules;
- titles/cosmetics from milestones and Expeditions.

This makes No Man's Sky **project-defined rather than class-defined**. A player can become a:
- trader;
- builder;
- pirate;
- explorer;
- fossil collector;
- fleet manager;
- settlement overseer;
- fisherman;
- creature breeder/battler;
- station director;
- alliance organizer

without committing to a mutually exclusive class.

The benefit is freedom to change goals. The drawback is that the avatar can lack the authored personal identity or build-defining tradeoffs of a class RPG.

**OpenLegend lesson:** roles can emerge from the things a player repeatedly does, owns and is trusted to operate. Formal classes are optional.

## 3. Core survival: hazards turn planets into resource problems

The Exosuit supplies:
- life support;
- hazard protection;
- jetpack movement;
- inventory/technology slots;
- specialized protection through installed technology.

Planets can impose:
- heat;
- cold;
- toxicity;
- radiation;
- storms;
- underwater oxygen pressure;
- later specialized extreme conditions.

Survival therefore links **place to preparation**:
- scan local resources;
- replenish life support/hazard protection;
- carry or craft the right materials;
- install stronger protection;
- retreat to caves, structures, vehicles or ships.

At launch this maintenance was one of the game's most criticized systems because constant refueling competed with exploration. PC Gamer and GamesRadar both described inventory/resource management as friction that repeatedly interrupted the fantasy. [NMS17](#nms17) [NMS42](#nms42)

Waypoint later made these pressures configurable. A player can independently tune combat, economy and survival challenge rather than choosing only one rigid ruleset. [NMS28](#nms28)

**OpenLegend lesson:** survival pressure is most valuable when it changes plans and places, not when it becomes repetitive UI tax. Difficulty dimensions should be separable when possible.

<a id="3-survival-pressure-is-several-systemsand-a-chosen-configuration"></a>
<a id="study-3"></a>

### Detailed study 3: Survival pressure is several systems—and a chosen configuration

**Life Support** uses supplies such as Oxygen; **Hazard Protection** addresses hostile environmental conditions with Sodium-family resources or suitable alternatives. They are not the same bar with interchangeable fuel. Movement and local conditions affect the practical preparation problem. [N07](#n07)

**Constructed situation:** a route appears physically traversable, but the player's protection against its climate will not last long enough. Shelter, supplies, a vehicle or improved protection can change the approach. A stronger weapon would not necessarily solve that problem.

**Waypoint** introduced a granular difficulty framework: survival drain, combat, crafting costs, access to inventories and loss on death can be adjusted, with restrictions for Permadeath and separate matchmaking pools for Expeditions/Permadeath. It also records crafting/cooking knowledge and improves continuous saving. [N08](#n08)

**Interpretation:** protecting the same home can coexist with different desired levels of maintenance and danger. Reducing routine recharge does not imply that a player has ceased to explore or design. Conversely, turning every constraint off may remove a project another person finds satisfying. The actual configuration belongs in any account of a play experience.

A limited tool that fails because its inputs are unavailable differs from a tool disabled by a chosen rule. The reference must not present the harshest resource costs as universal, or dismiss a failure as intended difficulty when the interface itself is broken.

## 4. The Multi-Tool: one item as scanner, miner, weapon and world editor

The Multi-Tool is a compact capability platform.

Its major roles include:
- mining resources;
- scanning/analyzing flora, fauna and minerals;
- locating points of interest through Analysis Visor modes;
- combat weapon modules;
- Terrain Manipulator excavation/building;
- specialized later tools such as cloaking/stun/combat modules;
- **Gravitino Coil** gravity manipulation added in Remnant. [NMS25](#nms25) [NMS38](#nms38)

Players can own multiple Multi-Tools and switch among specialized builds. [NMS22](#nms22)

### Terrain manipulation

The Terrain Manipulator can:
- excavate terrain;
- create terrain;
- flatten areas;
- restore edited terrain;
- expose buried objects/resources. [NMS22](#nms22)

This makes environment interaction genuinely spatial. A cave can be:
- discovered;
- dug;
- expanded;
- used as storm shelter;
- incorporated into a base.

### Gravity gun / physical salvage

Remnant's Gravitino Coil lets the player physically:
- grab;
- lift;
- carry;
- throw

large objects. Remnant couples it to salvage cleanup and physical hauling rather than treating salvage entirely as an inventory click. [NMS38](#nms38)

This is unusually relevant to OpenLegend: **an object moving through world space becomes gameplay**, not just a database transfer.

## 5. Skills and progression: technology graphs instead of XP levels

No Man's Sky has no universal character level. Progress is spread across several systems.

### Technology / blueprint acquisition

Players unlock or acquire:
- Exosuit modules;
- Multi-Tool weapons/tools;
- starship technology;
- freighter technology;
- base-building blueprints;
- crafting/refining recipes;
- specialized vehicle/fishing/companion systems.

Some technology is learned through vendors, research terminals, missions, story progress, salvaged modules or world discoveries.

### Upgrade modules and class tiers

Technology can be improved with modules, while major possessions such as ships and Multi-Tools have quality/classes and inventory/technology capacity.

Synthesis explicitly introduced:
- starship class upgrading;
- starship inventory expansion;
- salvage of unwanted ships for valuable technology/scrap;
- multiple owned Multi-Tools. [NMS22](#nms22)

### Nanites, Units and specialized currencies

Broadly:
- **Units** are the common money economy;
- **Nanites** are heavily used for technology/upgrades;
- **Quicksilver** and event/reputation currencies support cosmetic/special systems;
- later guild/arena/event systems add their own reward structures.

This yields **orthogonal progression**:
- wealth can rise without improving combat;
- a better ship does not automatically improve the Exosuit;
- faction reputation can unlock benefits without raising an avatar level;
- creature-battle strength belongs to companions, not the Traveller.

For OpenLegend, this is a useful model for avoiding “one number explains power.”

<a id="4-technology-layout-gives-an-old-item-another-improvement-path"></a>
<a id="study-4"></a>

### Detailed study 4: Technology layout gives an old item another improvement path

Related technologies placed beside one another receive an **adjacency** benefit, communicated by matching borders. Later **Supercharged Slots**, introduced in patch 4.05, boost the technology installed in them. Their number depends on the equipment class, so layout and the chosen host can matter alongside the module itself. [N09](#n09) [N10](#n10)

**Constructed choice:** concentrate a family into an effective arrangement or place its most important element in a separated boosted slot. The best arrangement depends on the particular item and purpose. A universal copied diagram is not proof of an optimal result on every ship.

**Interpretation:** upgrading can mean reorganizing relationships among things already owned rather than acquiring an entirely new tier. That makes inspection and explanation useful. It can also become fiddly inventory work when the benefit is hard to read or when a patch changes what the old configuration meant.

## 6. Inventory, items, crafting and refining

Inventory is one of No Man's Sky's oldest and most changed systems.

Important item families include:
- raw elements/resources;
- crafted products/components;
- consumables;
- trade goods;
- technology modules;
- construction parts/blueprints;
- fossils/artifacts;
- food/fish;
- salvage;
- ship parts;
- mission/event items.

Crafting converts known recipes directly; **Refiners** transform one or more resources through recipes that can support:
- material conversion;
- refinement into higher-value/needed forms;
- loops/chains for industrial production.

NEXT reworked core substances/resources and added refiner-based crafting. [NMS20](#nms20)

### Inventory as meaningful constraint versus friction

At launch, slot scarcity was effectively a primary progression system. Critics disliked technology consuming the same precious slots needed for resources. [NMS17](#nms17) [NMS42](#nms42)

Later updates separated/expanded inventory structures and Waypoint substantially overhauled inventory size/usability. [NMS28](#nms28)

**OpenLegend lesson:** inventory pressure can create preparation decisions, but a storage schema should not fight the fantasy continuously. “What can I carry?” and “what abilities have I installed?” may deserve different capacities.

<a id="2-materials-are-useful-because-their-transformations-differ"></a>
<a id="study-2"></a>

### Detailed study 2: Materials are useful because their transformations differ

A **Portable Refiner** processes a single input, needs Carbon-family fuel and can be packed up after its contents are removed. **Copper** deposits need the appropriate mining method, while refining Copper produces **Chromatic Metal** for advanced technologies. More elaborate multi-input recipes produce different yields, but require a machine supporting those inputs. [N04](#n04) [N05](#n05)

**Constructed sequence:** locate a deposit, acquire the raw metal, prepare a fueled refiner, convert it and retain the processed material for the intended technology. The natural deposit, refining recipe and installed tool are different prerequisites. Merely recognizing the resource's name does not finish the project.

**Interpretation:** a resource can be valuable for its future role rather than its sale price. The same source can support several routes, giving a player a reason to retain materials selectively. Unlimited stockpiling without an understood purpose is a different activity, and not automatically depth.

The **Personal Refiner** moves processing into the Exosuit but still requires fuel and has an input limit. [N06](#n06) **Constructed choice:** process during an expedition instead of returning to a workshop, while spending a technology slot and carrying fuel. A convenience can remove repeated placement without erasing the choice of what to produce. Exploit recipes on community pages are not treated as intended progression.

## 7. Starships: travel, combat, collection and increasingly construction

Starships are both tools and collection targets.

Core functions:
- launch/land;
- pulse travel within systems;
- warp between systems;
- cargo transport;
- scanning;
- space combat;
- trading;
- summoning owned ships.

Players can acquire multiple ships of different families and qualities.

### Salvage and upgrading

Synthesis made unwanted ships a source of:
- scrap/value;
- technology;
- inventory augmentation;
- upgrade progression. [NMS22](#nms22)

### Ship fabrication

Orbital added the **Starship Fabricator**, allowing players to:
- dismantle ships for visual components;
- select parts;
- select reactor/class;
- choose paints/finishes;
- assemble a custom ship.

Naturally found ships retain an authentication distinction/trade-value benefit, preserving exploration/ship-hunting as a parallel route instead of making fabrication strictly superior. [NMS31](#nms31)

This is a strong design pattern:

> **crafting should add agency without invalidating discovery.**

### Corvettes

Voyagers added a new scale: fully walkable, multi-crew **Corvette-class** ships assembled piece-by-piece from many modules. Players can:
- design external hull layout;
- build internal corridors/habitations;
- furnish the interior;
- walk around while the ship moves/warps;
- invite friends aboard;
- exit into space;
- use the ship as a mobile social/home artifact. [NMS37](#nms37)

Hello Games says supporting relative spaces with players editing/walking aboard a moving/warping ship required broad engine rework. [NMS37](#nms37)

For OpenLegend, a constructed vehicle can become **place + inventory + capability + social space**, not just a mount.

<a id="6-a-corvette-is-both-a-build-and-a-place-to-inhabit"></a>
<a id="study-6"></a>

### Detailed study 6: A Corvette is both a build and a place to inhabit

**Voyagers** introduced modular **Corvettes** with walkable interiors. Collected structural modules are consumed during assembly; functional modules alter performance and supply services such as a refiner, growing walls and mission radar. Drafts can be saved. Autopilot allows leaving the pilot seat while human passengers share the journey. [N12](#n12)

**Constructed decision:** build more living/work space or retain a smaller maneuverable design. A cockpit, a decorative hull addition and a working refiner contribute different kinds of value. A pleasing exterior alone does not guarantee convenient movement inside it.

**Interpretation:** a vehicle can retain the emotional role of home while enabling expeditions. Delegating a known flight path does not automatically remove the player's agency: it can make room for preparation, conversation or enjoying the place they made. The critical question is whether the activities left to the player remain worthwhile.

The original Voyagers update's spacewalking scope is qualified by Cosmos's later expansion to ordinary starships. Neither every old ship nor every later salvaging tool should be attributed to the initial Corvette release.

## 8. Freighters, frigates and fleet management

Freighters were added in Foundation and expanded repeatedly.

A player can:
- own/summon a capital freighter;
- build a base aboard it;
- store inventory;
- recruit frigates;
- dispatch frigate expeditions;
- receive materials/rewards;
- intervene in fleet events;
- defend fleets in combat.

NEXT expanded fleet systems; Endurance overhauled freighter bases and crew/living-space presentation; Orbital added event decisions/rescue intervention for active fleet expeditions. [NMS20](#nms20) [NMS27](#nms27) [NMS31](#nms31)

This creates a useful **delegation loop**:
1. compose fleet;
2. assign expedition;
3. world simulates offscreen result/event;
4. receive request or outcome;
5. optionally intervene;
6. repair/reconfigure and redeploy.

It is not open-ended autonomous AI, but it demonstrates how **offscreen agents can generate opportunities for embodied intervention**.

## 9. Exocraft and vehicles

Planetary vehicles support:
- resource transport;
- surface traversal;
- environmental protection;
- scanning;
- combat depending on configuration.

The Minotaur mech can be upgraded with an AI autopilot and Sentinel technology, allowing it to fight alongside the player. [NMS25](#nms25)

Remnant dramatically expanded vehicle customization, including modular hauler/truck-style builds and physical salvage transport. [NMS38](#nms38)

Again, the important design pattern is **vehicle identity through capability-bearing parts** rather than only skins.

## 10. Combat

Combat spans:
- hostile fauna;
- Sentinels;
- pirates/outlaws;
- corrupted Sentinels;
- derelict-freighter hazards;
- capital/freighter battles;
- PvP where settings permit.

### Ground combat

Multi-Tool weapon families include rapid-fire, shotgun-like, charged/projectile and utility modules. Sentinel added:
- heavier enemy roles;
- repair/summoning drones;
- stun/incendiary effects;
- cloaking;
- improved weapon feedback;
- autonomous Minotaur support. [NMS25](#nms25)

Sentinel attacks can alter terrain, producing temporary battlefield cover/obstacles. [NMS25](#nms25)

### Wanted/escalation structure

Sentinel response escalates when the player commits watched transgressions or persists in fighting. Interceptor added corrupted enemy families and Sentinel capital-ship escalation/rewards. [NMS29](#nms29)

### Space combat

Ships mount weapons/shields, and later updates added:
- outlaw systems/piracy;
- squadrons;
- freighter-to-freighter battles;
- trenches/critical systems on pirate capital ships;
- fleet rescue/intervention. [NMS26](#nms26) [NMS30](#nms30) [NMS31](#nms31)

Launch critics generally found combat the weakest part of the original loop; later combat updates explicitly target that historical weakness. [NMS42](#nms42) [NMS25](#nms25)

## 11. Looting, salvage and discovery economies

No Man's Sky uses several acquisition fantasies rather than one “kill enemies, roll loot” loop.

### World scanning

Scanning identifies and records:
- flora;
- fauna;
- minerals;
- planetary information.

Discoveries can be named/uploaded and tracked in catalogs.

### Ruins / buried technology

Planetary exploration yields:
- buried technology;
- ancient ruins;
- artifacts;
- language stones;
- salvage;
- crashed ships/freighters.

### Ship salvage

Ships can be scrapped for technology/value/parts. Orbital made visual components reusable for fabrication. [NMS31](#nms31)

### Fossils

Relics added paleontology:
- excavate skeletal remains;
- identify rare components;
- assemble/display discoveries;
- turn terrain digging into a collection project. [NMS35](#nms35)

### Physical salvage

Remnant makes some scrap **world objects that must be moved/loaded**, creating a logistics loop instead of abstract loot pickup. [NMS38](#nms38)

### Space hulks

Cosmos adds massive space hulks that can be stripped for parts under time/structural constraints, extending salvage into deep space. [NMS41](#nms41)

**OpenLegend lesson:** acquisition systems feel different when the method changes:
- discover;
- defeat;
- excavate;
- dismantle;
- haul;
- trade;
- breed;
- research.

A generic “loot table” would erase useful texture.

<a id="7-salvage-is-more-than-clicking-an-inventory-icon"></a>
<a id="study-7"></a>

### Detailed study 7: Salvage is more than clicking an inventory icon

**Remnant** added the **Gravitino Coil**, which attracts and launches supported physical objects, including salvage and Sentinel drones. The **Colossus** can carry industrial waste on a tipping flatbed or process materials with an installed furnace. Waste Processing Plants turn delivered cargo into rewards; their vehicle-scale interaction makes arrival and handling part of the activity. [N13](#n13)

**Constructed sequence:** identify a haul worth taking, move it onto a suitable vehicle, transport it and unload it at the correct facility. A larger item changes the route and handling problem rather than merely filling one more identical inventory square. A tool used for hauling can also temporarily disrupt a hostile drone, connecting utility and combat without becoming an unrestricted object-manipulation power.

**Interpretation:** a useful invention can change the interval between finding and securely owning a reward. Transportation can be satisfying when its tools support actual judgment. It becomes busywork when an awkward interface forces the same already-decided manipulation repeatedly.

## 12. Base building: the world becomes a record of player intention

Foundation introduced fixed planetary base building; later updates expanded placement freedom, part variety, power/logic, industrial systems and multiplayer construction. [NMS19](#nms19) [NMS21](#nms21)

A base can contain:
- shelter;
- storage;
- farms;
- refiners;
- power generation;
- industrial harvesters;
- teleportation;
- decorative/social rooms;
- specialist terminals;
- logic/power networks.

Player bases can be uploaded/shared and featured.

The most important behavioral difference from pure exploration is **return value**. A random planet becomes *my planet* because:
- I chose the site;
- built infrastructure;
- store resources there;
- shaped terrain;
- hosted others;
- attached projects/memories to it.

This is the same ownership mechanism OpenLegend can exploit with settlements, inventions and relationship history.

<a id="5-bases-turn-landscape-into-a-functioning-place"></a>
<a id="study-5"></a>

### Detailed study 5: Bases turn landscape into a functioning place

**Beyond** connected construction to generators, solar panels, batteries, power cables and logic switches. A Survey Device finds appropriate mineral, gas or power hotspots; extractors and pipelines feed remote depots. Short-range teleporters and powered doors add other functions to the same constructed space. [N11](#n11)

**Constructed arrangement:** locate a resource site, place extraction where it works and connect storage somewhere convenient. More extractors do not solve a missing power supply. A solar installation that works in daylight can need storage to serve nighttime demand. The finished base is a relationship among location, power, production and access, not simply a decorative prefab.

**Interpretation:** automation preserves a reason to choose a location and design the arrangement. Once established, it can release attention for exploration or a different project. A world does not need to force the player to manually repeat a solved harvesting operation forever for that early accomplishment to remain meaningful.

The construction camera and snapping work reduce manipulation cost. They do not select the player's aesthetic or decide which planet should become home. Expressive authorship and manual effort are not identical.

## 13. Planetary settlements: bounded civic management

Frontiers added procedurally generated settlements whose inhabitants appoint the player **Overseer**.

The player can:
- choose buildings;
- resolve disputes/problems;
- make policy/settlement decisions;
- commission celebrations;
- defend against Sentinel attacks;
- observe settlement happiness/productivity/development. [NMS24](#nms24)

Beacon later expanded the model:
- own/manage multiple settlements;
- build/upgrade individual buildings;
- encounter Autophage settlements;
- add new local businesses/amenities. [NMS36](#nms36)

### Important limitation

Settlement inhabitants are **bounded management NPCs**, not deep autonomous people. Their disputes and decisions create flavor/management choices, but they do not approach OpenLegend's intended persistent personal memory/agency.

**What to borrow:** a place can periodically surface civic problems without requiring constant micromanagement.

<a id="8-settlements-give-a-return-destination-social-and-practical-roles"></a>
<a id="study-8"></a>

### Detailed study 8: Settlements give a return destination social and practical roles

**Beacon** permits overseeing up to four settlements, including concealed **Autophage** communities. Individual buildings contribute to productivity/happiness; upgraded structures supply services and influence available production. Citizen pages, clearer disputes and records expose more of the settlement's state. Importantly, managing more settlements does not simply multiply required defenses: the update distributes alert pressure and slows its growth during absence. [N14](#n14)

**Constructed choice:** invest in the building that supports the next expedition, improve residents' living conditions or settle a dispute whose outcomes do not align perfectly with revenue. A settlement is useful when those decisions change later activity or recognition, not merely when it displays another population count.

**Interpretation:** visible records and particular citizens can invite attachment. They do not prove that every biography is an independently simulated mind. The distinction matters for OpenLegend: an authored request, an aggregate production rule and an autonomous person's decision are different claims.

The reduced demand for defensive returns is a useful counterexample to equating more realism or more crises with better long-term care. A person should be able to leave home on purpose, not constantly abandon every other project because the game owns their attention.

## 14. NPCs, factions, reputation and language

Major intelligent groups include:
- Gek;
- Korvax;
- Vy'keen;
- Travellers/Anomaly characters;
- Outlaws/pirates;
- Autophage;
- guild structures;
- later Arena League;
- player Alliances.

NPC interactions can affect:
- reputation/standing;
- trade;
- mission access;
- discounts;
- story/lore;
- language learning.

Orbital made guild standing more materially visible through envoys, donations and supplies/discounts. It also linked alien reputation to vendor pricing. [NMS31](#nms31)

### Language learning

Knowledge Stones and NPC interaction teach alien words. Early critics liked deciphering fragments but found many NPC encounters structurally repetitive. [NMS43](#nms43) [NMS42](#nms42)

This is an excellent contrast for OpenLegend:
- **language as collectible vocabulary** is legible and gameable;
- **language as actual communicative capability** could change what actors can understand, teach or conceal.

## 15. Companions: tame, breed, modify, use

Companions turned procedural fauna from scenery into persistent owned relationships.

Players can:
- feed/tame;
- adopt;
- summon;
- rename;
- ride;
- customize accessories;
- build trust;
- receive practical help;
- breed eggs;
- trade eggs;
- manipulate offspring traits with the Egg Sequencer. [NMS23](#nms23)

Companions can assist by:
- scanning resources;
- marking hazards;
- providing light;
- hunting hostile fauna;
- locating buildings;
- digging treasure;
- mining with accessories. [NMS23](#nms23)

This is a significant improvement over launch-era procedural fauna because **visual variation now has more functional persistence**.

<a id="9-companions-connect-care-bounded-assistance-and-inheritance"></a>
<a id="study-9"></a>

### Detailed study 9: Companions connect care, bounded assistance and inheritance

The **Companions** update supports feeding, attention, adoption, gestures and useful assistance such as detecting resources or hazards. Traits influence behavior, and some accessories are functional. Eggs can be traded or modified through the **Egg Sequencer**, with offspring related to but not identical to the parent. The suit's translated creature-thought presentation is fictional framing, not evidence of an LLM or general belief model. [N15](#n15)

**Constructed choice:** bring a familiar helper with useful tendencies, retain a discovered animal's appearance or experiment on an egg toward another form. Those are different motivations for the same system. A seemingly stronger output may be less personally valuable than the creature associated with an earlier journey.

**Interpretation:** useful assistance and recognizable individuality can reinforce attachment without requiring constant conversation. The source's general claims about personality are not a guarantee that every animal reliably completes every listed task. A care meter also needs to support the relationship rather than simply become another obligation before the interesting activity.

## 16. Xeno Arena: making procedural creature variation mechanically consequential

The April 2026 Xeno Arena update explicitly asks the question that early No Man's Sky struggled with:

> what if procedural creature variety had a gameplay purpose?

It adds turn-based creature battling where:
- species/home biome influence ability pools;
- creatures have elemental/affinity relationships;
- personality and physical traits affect battle;
- creatures gain experience;
- genetics can be improved;
- breeding changes inherited traits;
- teams compete against NPCs or players;
- daily seeded challenges create shared strategy discussions;
- ranked Arena League progression supplies rewards/titles. [NMS39](#nms39)

This is an unusually direct OpenLegend lesson:

**generated difference becomes meaningful when downstream systems read it.**

A toxic-world creature is not merely green/purple—it can carry battle affinities/abilities linked to its origin.

OpenLegend should generalize this:
- origin;
- anatomy;
- culture;
- learned knowledge;
- material;
- institutional role

should influence what an entity can actually do.

## 17. Fishing, cooking and low-intensity activities

Beyond added food/cooking systems; Aquarius later added a dedicated fishing loop and Exo-Skiff. [NMS21](#nms21) [NMS33](#nms33)

Fishing varies catches by planetary waters and rewards travel for rare species.

This matters because not every system needs to maximize danger. A persistent world benefits from activities that support:
- collecting;
- place appreciation;
- social idling;
- economic side projects;
- low-stakes mastery.

OpenLegend can use similarly calm mechanics to make settlements/worlds feel inhabited between high-stakes events.

## 18. Exploration and procedural world generation

Procedural generation remains the foundational technology.

Modern variation includes:
- stars/system classes;
- planet biomes;
- terrain;
- caves;
- oceans;
- flora;
- fauna;
- storms/weather;
- settlements/buildings;
- space stations;
- system economy/conflict characteristics;
- later deep-space points of interest.

Worlds Part I refreshed flora/fauna/weather/rendering. Worlds Part II expanded the generator with:
- new star systems;
- new terrain;
- deep oceans;
- water worlds;
- gas giants;
- much larger worlds;
- new planetary resources/conditions. [NMS32](#nms32) [NMS34](#nms34)

### The core historical problem

Launch reviewers repeatedly found **visual variation without decision variation**:
- another creature used familiar part combinations;
- another outpost repeated familiar interaction;
- another planet differed visually but asked for the same resources/actions. [NMS17](#nms17) [NMS42](#nms42)

Modern No Man's Sky mitigates this by layering more activities onto locations, but the critique still appears in current negative Steam reviews: some players feel that identical systems repeat across an enormous galaxy. [NMS44](#nms44)

For OpenLegend the metric should be:

> Did this world's differences change the player's available plans, relationships, costs, risks or beliefs?

Not simply:
> Did it generate a different texture/name/shape?

<a id="1-repeated-discovery-needs-something-different-to-do"></a>
<a id="study-1"></a>

### Detailed study 1: Repeated discovery needs something different to do

The preserved original chapter records a real contrast: Christopher Livingston's 2016 review found beautiful, relaxing moments alongside repeated resource work and familiar discovery patterns; later updates supplied additional activities. His account of spending hours exploring one moon is enthusiastic, while the recurrence of the same kinds of sites eventually weakened his desire to investigate. [N01](#n01)

**Interpretation:** a planet's changed colour is not automatically a changed decision. A useful find can instead enable a technology, support a personally chosen base, complete a collection or change the next trip. This is the question the dossier follows through the expanded game, rather than treating the number of planets as a measure of experiential depth.

The current research date is after **Cosmos**, released September 9, 2026. Its anniversary expedition began separately on September 16. Those are distinct delivery events; the earlier announcement's broad wording does not place every subsequent activity on the same day. [N02](#n02) [N03](#n03)

## 19. Space as place: Cosmos changes the void itself

Cosmos 7.0 is especially relevant because Hello Games explicitly recognized that space had remained relatively underdeveloped despite the game being a “space game.” [NMS41](#nms41)

Cosmos adds:
- system-scale star map / points of interest;
- deep-space outposts;
- orbital construction;
- asteroid-platform bases;
- spacewalking;
- space hulks/salvage;
- reaching system stars;
- station ownership;
- station interior/exterior expansion/decorating;
- alliances built around owned stations;
- alliance teleport/network territory;
- alliance activity leaderboards. [NMS41](#nms41)

This changes space from **travel medium** into:
- home;
- construction site;
- salvage environment;
- political/social territory;
- destination.

That is an important worldbuilding principle for OpenLegend: if a region exists in simulation, ask whether players can **live, own, build, organize and care about it**, not merely pass through it.

## 20. Alliances and social structures

NEXT/Beyond made small-group multiplayer and social hubs durable parts of the game. [NMS20](#nms20) [NMS21](#nms21)

Players can:
- meet at the Space Anomaly;
- form groups;
- run Nexus missions;
- build together;
- visit bases;
- share discoveries/items/creature eggs;
- travel aboard player ships/freighters/Corvettes depending on system;
- participate in community Expeditions/events.

Cosmos goes further with **Alliances**:
- station directors can found one;
- players can join;
- owned systems/stations form a network;
- alliance identity/banner propagates;
- activity contributes to leaderboard prominence. [NMS41](#nms41)

This is still much simpler than a simulated institution with laws, treasury rights, leadership succession or political factions. But it is a useful scaffold:

**place ownership + membership + shared identity + shared progression = proto-institution.**

OpenLegend can deepen each element through actual world rules.

## 21. Expeditions and community events

Expeditions are time-limited/seasonal starts with:
- shared initial conditions;
- milestones;
- themed objectives;
- rendezvous/community concentration;
- unique rewards transferable to broader account progression.

They intentionally recreate the early vulnerability of a fresh save while placing many players into a common route. [NMS45](#nms45)

Holiday reruns acknowledge that limited-time availability can conflict with players' schedules. [NMS46](#nms46)

### The Swarm (2026)

The Swarm is a universe-level temporary community war:
- players answer a personality test;
- are divided into three factions;
- contribute to a shared war effort;
- investigate a giant Hive threat;
- share discoveries about weaknesses;
- track progress on shared bulletin/Atlas surfaces;
- fight large collective space battles. [NMS40](#nms40)

This is **event architecture**, not a permanent faction-war world simulation.

For OpenLegend:
- temporary world crises can produce synchrony;
- permanent institutions should not require constant seasonal reset;
- distinguish durable world history from event scaffolding.

## 22. Story and narrative

No Man's Sky's storytelling is distributed across:
- Atlas path;
- Artemis/Apollo/Null material;
- Space Anomaly characters;
- faction lore;
- terminal/ruin logs;
- abandoned/derelict sites;
- update-specific storylines such as Autophage/corruption;
- Expedition narratives;
- environmental discovery.

Launch-era criticism often described the world as lonely and NPCs as interchangeable. The Guardian specifically noted many isolated alien encounters where language/reward snippets replaced deeper characterization. [NMS43](#nms43)

Later updates add more characters and lore, but No Man's Sky remains **world/project-centric rather than companion-centric**.

There is no Dragon Age-like relationship party whose personal arcs anchor every hour.

### OpenLegend lesson

A generated universe can be compelling without a conventional party, but persistent people make difference easier to care about.

A planet changing because:
- someone you know moved there;
- a settlement outlawed your invention;
- a friend died there;
- a treaty made it safe;
- a creature species learned your route

may create stronger memory than visual novelty alone.

## 23. Economy and trading

Systems vary in:
- wealth;
- commodities;
- buy/sell conditions;
- faction/guild standing;
- resource availability.

Player activities include:
- mine/refine/craft and sell;
- trade commodities across systems;
- farm products;
- salvage ships;
- excavate valuables;
- fleet expeditions;
- mission rewards;
- trade surges.

Orbital added economy-scanner **trade surges**, temporary high-demand opportunities, and made reputation affect vendor prices. [NMS31](#nms31)

Waypoint added a personal **trade rocket** that can sell items remotely. [NMS28](#nms28)

The economy is broad but not a full player-driven EVE-style market. Players can exchange items directly, but market prices are largely game-generated.

## 24. Factions, piracy and crime

Outlaws expanded pirate-controlled systems and outlaw identity. [NMS26](#nms26)

A player can engage in:
- smuggling;
- piracy;
- bounty-like conflict;
- attacking freighters;
- outlaw-system activities;
- legal/illegal cargo trade.

Sentinel/wanted systems create a separate law-enforcement pressure.

The game therefore has **criminal verbs**, but it does not deeply simulate:
- witness testimony;
- courts;
- property claims;
- legal identity;
- local legal variance.

OpenLegend can take the next step by making crime a social/institutional fact, not only an escalation meter.

## 25. Death, failure and recovery

Death rules depend on mode/difficulty.

Waypoint's difficulty framework allows extensive tailoring; Permadeath remains a distinct high-stakes pool while Normal/Relaxed/custom rules reduce or reshape penalties. [NMS28](#nms28)

Potential failure includes:
- death on planet;
- ship destruction;
- lost inventory depending on mode;
- failed mission/Expedition objectives;
- damaged technology;
- poor settlement/fleet outcomes.

No Man's Sky's recovery model is generally forgiving compared with hardcore survival sandboxes.

This supports the game's long-term exploratory tone, but players seeking severe consequence may perceive less tension.

## 26. Art, audio, UI and feel

No Man's Sky's art direction draws heavily on colorful 1960s–1980s science-fiction paperback cover aesthetics.

Strengths consistently noted across reviews:
- bold planetary color;
- unusual silhouettes;
- seamless sky-to-space movement;
- procedural 65daysofstatic music;
- ambient creature/weather sound;
- scale of planets/space. [NMS17](#nms17) [NMS43](#nms43)

Launch UI friction was substantial:
- inventory clicks;
- resource charging;
- nested menus;
- unclear systems. [NMS17](#nms17) [NMS42](#nms42)

Over years, Hello Games repeatedly revised:
- inventory;
- HUD;
- mode select;
- controls;
- VR interaction;
- discovery pages;
- construction interfaces.

Beyond made the **entire game** playable in VR with embodied cockpit, Multi-Tool and inventory interactions. [NMS21](#nms21)

### OpenLegend lesson

A deep world needs:
- fast ordinary interactions;
- explanation of unusual interactions;
- world-space feedback where possible;
- fewer menus between intention and consequence.

## 27. Five written reviews across the game's lifecycle

Because the game changed radically, five reviews from one moment would be misleading. These sources deliberately span launch and later versions.

### 1. PC Gamer — Christopher Livingston, August 2016

**Liked:** atmosphere, visual discovery, seamless planet hopping, audio/music, relaxing wandering.

**Disliked:** repetitive resource loop, frustrating menus/inventory, repeated procedural patterns, limited memorable stories, weak sense that discovery mattered.

The famous closing idea is that the critic explored an effectively infinite universe but came away mostly with attractive “vacation photos.” [NMS17](#nms17)

### 2. The Guardian — Jordan Erica Webber, August 2016

**Liked:** extraordinary generated landscapes, creatures, seamless exploration, sci-fi-book-cover feeling, language deciphering and the melancholy of leaving worlds behind.

**Disliked / limitation:** intelligent aliens felt isolated/nonspecific; the apparent civilization did not behave like a populated society; many interactions resolved into brief text/reward exchanges.

This review was more positive than several contemporaries, which is useful evidence that **quiet exploration itself** was a valid player preference even at launch. [NMS43](#nms43)

### 3. GamesRadar+ — Matt Elliott, August 2016

**Liked:** scanning, naming, wandering and the meditative exploration loop; some memorable planets; sheer scope.

**Disliked:** combat, constant recharging, inventory management, repeated building/alien structures and the feeling that procedural variety exposed its underlying combinatorics.

Elliott specifically described the game as compelling but difficult to recommend without reservations. [NMS42](#nms42)

### 4. GameSpot — Justin Clark, Beyond review, September 2019

**Liked:** three years of accumulated systems; richer/poppier universe; VR as a powerful new way to inhabit the world; multiplayer/Nexus and quality-of-life improvements; feeling that disparate systems had begun cohering into a real home.

**Disliked / qualification:** Beyond still inherited some awkward systems and the review did not claim every survival/crafting loop had become deep. The score/reassessment represents 2019, not today's 7.0 build. [NMS47](#nms47)

### 5. Nintendo Life — PJ O'Reilly, October 2022

**Liked:** post-Waypoint breadth, quality-of-life customization, exploration/survival sandbox depth and a technically impressive Switch adaptation.

**Disliked / qualification:** Switch lacked multiplayer at the reviewed time and involved visual/technical compromise. The review is useful as evidence that by 2022 the *content* argument had inverted from launch: the concern was port completeness, not absence of things to do. [NMS48](#nms48)

### Additional lifecycle reassessment — GamesRadar, 2018

GamesRadar's revisit after NEXT says the game changed substantially through base building, freighters, survival/creative modes and multiplayer, while retaining the original concern that generated variation could become structurally repetitive. [NMS49](#nms49)

This continuity matters: adding more systems can fix **breadth of activity** without completely fixing **local uniqueness**.

## 28. Top/helpful Steam review evidence

Steam is highly applicable here because the historical review curve itself records the game's transformation.

As of the September 2026 store snapshot:
- English reviews: **Very Positive**, about **82% positive** across roughly 185k English reviews;
- recent reviews: about **91% positive** in the displayed 30-day window;
- the game's all-time Steam rating crossed the 80% “Very Positive” threshold in November 2024 after years of recovery. [NMS50](#nms50) [NMS51](#nms51)

These are self-selected review aggregates, not active-player or retention measures.

### Most-helpful all-time positive sample

A highly helpful 2022 review compares the game to someone repaying far more than an old debt: it explicitly remembers launch as “wide as an ocean, deep as a puddle” while strongly recommending the modern game after repeated returns to major updates. [NMS52](#nms52)

Current helpful 2026 recommendations praise:
- ten years of free updates/no microtransactions;
- the comeback itself;
- the feeling of progressing from a tiny starter ship to a walkable Corvette;
- emergent traversal such as ejecting in space and free-falling to a planet/ocean;
- long-lived building/flying/exploration hobbies. [NMS50](#nms50)

### Most-helpful negative sample

The all-time negative page preserves a 2016 review with ~42 hours recorded:
- praises the beautiful world and initial hope/wonder;
- says the grind, planet exploration and language accumulation ultimately led to “nothing” meaningful for that player. [NMS53](#nms53)

A current negative review with more than 100 hours argues that despite years of additions, many mechanics remain individually shallow and that travelling far across the galaxy changes visuals more than the structure of missions/combat/buildings. [NMS44](#nms44)

This is the single most useful current counterpoint to the comeback narrative.

### What the Steam history actually establishes

It supports:
- large improvement in player recommendation over time;
- long-tail goodwill around sustained free updates;
- a still-present minority critique about repetitive/shallow systemic structure.

It does **not** establish that every added feature improved retention or that current players agree on the ideal balance.

## 29. Repeated player preferences

### Common praise

- seamless ground → atmosphere → space traversal;
- huge exploratory possibility;
- striking visual/audio atmosphere;
- base building and ownership;
- continuous free updates;
- ship/freighter collecting;
- freedom to choose a personal project;
- relaxed/meditative play;
- multiplayer as optional rather than mandatory;
- companions and collection;
- custom difficulty;
- modern ship/Corvette construction;
- the sense that the game repeatedly grows in unexpected directions.

### Common criticism / divisive areas

- repeated planetary structures/mission patterns;
- procedural “different appearance, same interaction”;
- survival/crafting busywork;
- inventory/logistics overhead;
- shallow NPC individuality;
- combat historically weaker than exploration;
- many parallel systems can feel disconnected;
- finite-time Expeditions can create FOMO despite reruns;
- breadth can substitute for depth;
- players who want one tightly authored campaign may find the sandbox diffuse.

These are qualitative patterns, not prevalence estimates.

## 30. Production, promotion and the launch/recovery story

Hello Games was a small studio attempting a technically ambitious procedural universe.

Pre-release promotion successfully communicated:
- enormous scale;
- seamless travel;
- procedural worlds;
- discovery.

But expectations outran the reliable launch experience. Later Sean Murray reflections describe excessive press exposure as a mistake, and the studio became much more restrained about communicating future features before they were ready. [NMS54](#nms54)

After launch:
- Hello Games patched critical issues;
- went relatively quiet;
- shipped Foundation three months later;
- continued adding free major updates for a decade.

The game's review recovery became a visible outcome: Steam reached “Very Positive” all-time in 2024, an unusually difficult shift for a title with hundreds of thousands of historical reviews. [NMS51](#nms51)

### Monetization model

Hello Games has repeatedly shipped major updates free to existing players and the game has no conventional microtransaction store. Current helpful Steam reviews explicitly celebrate this. [NMS50](#nms50)

That is strategically unusual and should not be treated as universally replicable:
- the game continued selling on new platforms;
- each major update created renewed press/store attention;
- No Man's Sky has a long commercial tail.

No public source in this pass supports a reliable feature-by-feature ROI calculation.

## 31. What the ten-year recovery does and does not teach

### It does teach

- a live game's identity can change substantially;
- player trust can recover through shipped work rather than promises;
- old procedural worlds can gain new meaning when new verbs are attached;
- free updates can create recurring re-entry moments;
- preserving old saves/ownership lets new systems compound prior investment.

### It does not teach

- bad launches are acceptable;
- every studio can fund ten years of repair;
- content volume automatically creates depth;
- procedural generation becomes meaningful merely by adding more assets;
- “we'll fix it later” is a responsible launch strategy.

For OpenLegend, the best application is **compound systems on persistent player investment without relying on future redemption to justify today's missing core loop.**

## 32. Transferable inspiration for OpenLegend

### A. Many orthogonal projects can coexist in one world

No Man's Sky now supports players who primarily:
- explore;
- build;
- collect;
- trade;
- fight;
- breed;
- manage;
- customize;
- socialize.

OpenLegend's extensible mechanics can support the same diversity without forcing one victory path.

### B. Procedural difference must propagate into mechanics

Xeno Arena is a direct demonstration:
- creature origin/body/personality → battle abilities/traits.

OpenLegend should make:
- anatomy;
- sensory capability;
- materials;
- culture;
- learned knowledge;
- place;
- history

flow into downstream interactions.

### C. Preserve discovery even after adding fabrication

Orbital's custom ship builder does not erase found ships; discovered ships receive their own authenticity/trade distinction.

When OpenLegend lets players invent/craft something, do not automatically make found/natural/authored variants worthless.

### D. Make transport into place

Corvettes, freighters, bases and stations blur:
- object;
- vehicle;
- home;
- social space;
- production site.

OpenLegend's object model should allow sufficiently large/complex constructs to become **containers/places with internal state and inhabitants**, rather than forcing an artificial vehicle/building divide.

### E. NPC management events are useful but not sufficient

Settlements provide bounded choices and civic flavor. OpenLegend can keep that low-cost event layer while adding persistent people whose:
- memories;
- relationships;
- occupations;
- beliefs;
- plans

make the same policy decision matter differently over time.

### F. Give generated worlds multiple reasons to revisit

A planet can matter because:
- resources;
- base;
- settlement;
- rare companion;
- arena build;
- fossil;
- fishing spot;
- story;
- alliance station;
- Expedition objective.

OpenLegend should similarly allow **layers of meaning** to accumulate on places.

### G. Separate persistent systems from seasonal scaffolding

Expeditions and The Swarm create synchrony, but they are not the world's permanent social order.

OpenLegend should distinguish:
- durable history/institutions;
- temporary scenarios/events;
- optional fresh starts.

### H. Resource friction should create decisions, not clerical repetition

The launch game is a long-running cautionary example of survival costs becoming menu work. Keep meaningful scarcity while making routine execution fast.

### I. Reputation should alter access and economics

Orbital's reputation-price relationship is simple but concrete.

OpenLegend reputation can go farther:
- who trusts you;
- who teaches you;
- prices;
- legal rights;
- command authority;
- invitations;
- testimony/belief;
- hostility.

### J. A procedural universe benefits enormously from social anchors

No Man's Sky's launch loneliness was partly structural: aliens were often reward terminals with faces.

OpenLegend should treat persistent actors and institutions as **anchors of generated space**. A world feels less interchangeable when the same people remember what happened there.

## 33. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1, 30–31 |
| R02 player actions / major mechanics | §§3–26 |
| R03 items / entities / composition | §§4, 6–11, 15–16 |
| R04 progression / economy / time | §§5–7, 11, 20–25 |
| R05 concrete interactions | §§3–11, 15–20 |
| R06 people / AI / social / multiplayer | §§8, 13–16, 20–21, 24 |
| R07 art / audio / interface / feel | §26 |
| R08 story / narrative | §22 |
| R09 production / development | §§30–31 |
| R10 marketing / distribution / virality | §§21, 28, 30 |
| R11 commercial / participation | §§28, 30 |
| R12 reviews / player feedback | §§27–29 |
| R13 transferable inspiration / limits | §§31–32 |
| R14 sources / preservation / navigation | this section + sources |

**Preservation check:** the earlier chapter's lesson remains intact but is qualified by ten more years of delivery. The 2016 criticism of visual variation without enough meaningful activity is preserved, and current negative player testimony shows that critique has not vanished. The recovery is documented through specific shipped systems and review change rather than a vague “developers fixed everything” claim.

## Sources

<a id="nms16"></a>**NMS16 — [No Man's Sky on Steam](https://store.steampowered.com/app/275850/No_Mans_Sky/).** Hello Games / Valve. Current product/reception page, accessed 2026-09-26. Used for current broad product scope and review snapshot.

<a id="nms17"></a>**NMS17 — [No Man's Sky review](https://www.pcgamer.com/no-mans-sky-review/).** Christopher Livingston, PC Gamer, 2016-08. Full launch review inspected: resource loop, scanning, inventory, combat, atmosphere and procedural-repetition criticism.

<a id="nms18"></a>**NMS18 — [No Man's Sky launch review roundup](https://www.gamespot.com/articles/no-mans-sky-review-roundup/1100-6442638/).** GameSpot, 2016-08-15. Preserves multiple launch-review positions; excerpts are not treated as substitute reads for the five full reviews summarized above.

<a id="nms19"></a>**NMS19 — [Foundation Update](https://www.nomanssky.com/foundation-update/).** Hello Games. Primary 1.1 description: modes, base building, farming, freighters and deployables.

<a id="nms20"></a>**NMS20 — [NEXT Update](https://www.nomanssky.com/next-update/).** Hello Games. Primary 1.5 description: multiplayer, bases, fleets, resource/crafting overhaul, UI and third-person-era expansion.

<a id="nms21"></a>**NMS21 — [Beyond Update](https://www.nomanssky.com/beyond-update/).** Hello Games. Primary 2.0 description: VR, social hub/multiplayer, NPC/language/technology, cooking, creatures, bases and industrial logic.

<a id="nms22"></a>**NMS22 — [Synthesis Update](https://www.nomanssky.com/synthesis-update/).** Hello Games. Primary 2.2 description: starship class/inventory upgrades, salvage, multiple Multi-Tools and terrain restoration.

<a id="nms23"></a>**NMS23 — [Companions Update](https://www.nomanssky.com/companions-update/).** Hello Games. Primary 3.2 companion adoption, trust, useful behaviors, eggs, breeding and gene sequencing.

<a id="nms24"></a>**NMS24 — [Frontiers Update](https://www.nomanssky.com/frontiers-update/).** Hello Games. Primary 3.6 settlements/Overseer and base-building overhaul.

<a id="nms25"></a>**NMS25 — [Sentinel Update](https://www.nomanssky.com/sentinel-update/).** Hello Games. Primary 3.8 combat/enemy/Multi-Tool/AI Minotaur overhaul.

<a id="nms26"></a>**NMS26 — [Outlaws Update](https://www.nomanssky.com/2022/04/no-mans-sky-outlaws-update/).** Hello Games. Primary pirate/outlaw/squadron-era update.

<a id="nms27"></a>**NMS27 — [Endurance Update](https://www.nomanssky.com/2022/07/no-mans-sky-endurance-update/).** Hello Games. Primary freighter/fleet living-space overhaul.

<a id="nms28"></a>**NMS28 — [Waypoint Update](https://www.nomanssky.com/waypoint-update/).** Hello Games. Primary 4.0 custom difficulty, Relaxed mode, inventory/milestone/autosave and trade-rocket description.

<a id="nms29"></a>**NMS29 — [Interceptor Update](https://www.nomanssky.com/interceptor-update/).** Hello Games. Primary corrupted worlds, Sentinel ships/enemies/technology and capital-ship combat.

<a id="nms30"></a>**NMS30 — [Echoes Update](https://www.nomanssky.com/2023/08/no-mans-sky-echoes-update/).** Hello Games. Primary Autophage/story/staff and freighter-combat expansion.

<a id="nms31"></a>**NMS31 — [Orbital Update](https://www.nomanssky.com/orbital-update/).** Hello Games. Primary station procedural redesign, ship fabrication/salvage, trade surges, guild/reputation and fleet intervention.

<a id="nms32"></a>**NMS32 — [Worlds Part I](https://www.nomanssky.com/2024/07/no-mans-sky-worlds-part-i/).** Hello Games. Primary planetary generation/rendering refresh.

<a id="nms33"></a>**NMS33 — [Aquarius Update](https://www.nomanssky.com/2024/09/aquarius-update/).** Hello Games. Primary fishing and Exo-Skiff activity layer.

<a id="nms34"></a>**NMS34 — [Worlds Part II](https://www.nomanssky.com/worlds-part-ii-update/).** Hello Games. Primary new systems/planets, gas giants, water worlds, deep oceans and terrain expansion.

<a id="nms35"></a>**NMS35 — [Relics](https://www.nomanssky.com/2025/03/no-mans-sky-relics/).** Hello Games. Primary fossil/paleontology update.

<a id="nms36"></a>**NMS36 — [Beacon](https://www.nomanssky.com/2025/06/no-mans-sky-beacon/).** Hello Games. Primary multiple/Autophage settlements and expanded settlement construction.

<a id="nms37"></a>**NMS37 — [Voyagers Update](https://www.nomanssky.com/voyagers-update/).** Hello Games. Primary 6.0 modular, walkable, multiplayer Corvette ships and spacewalking; developer notes engine challenges of relative moving spaces.

<a id="nms38"></a>**NMS38 — [Remnant](https://www.nomanssky.com/2026/02/no-mans-sky-remnant/).** Hello Games, 2026-02-11. Primary gravity gun, physical salvage, modular vehicles and limited-time convoy expedition.

<a id="nms39"></a>**NMS39 — [Xeno Arena Update](https://www.nomanssky.com/xeno-arena-update/).** Hello Games, 2026-04. Primary creature battles, affinities, genetics, XP, daily challenges, Arena League and PvP/NPC battles.

<a id="nms40"></a>**NMS40 — [The Swarm](https://www.nomanssky.com/2026/05/no-mans-sky-the-swarm/).** Hello Games, 2026-05-27. Primary time-limited community faction-war event; not represented as a permanent simulation system.

<a id="nms41"></a>**NMS41 — [Cosmos Update](https://www.nomanssky.com/cosmos-update/).** Hello Games, 2026-09. Primary 7.0 space-station ownership, alliances, orbital bases, deep-space outposts, star-map POIs, spacewalking and hulks/salvage.

<a id="nms42"></a>**NMS42 — [No Man's Sky review](https://www.gamesradar.com/no-mans-sky-review/).** Matt Elliott, GamesRadar+, 2016. Full written review inspected: exploration appeal, combat/inventory friction and procedural thinness.

<a id="nms43"></a>**NMS43 — [No Man's Sky review: beautifully crafted galaxy with a game attached](https://www.theguardian.com/technology/2016/aug/12/no-mans-sky-review-hello-games).** Jordan Erica Webber, The Guardian, 2016-08-12. Full launch review inspected.

<a id="nms44"></a>**NMS44 — [No Man's Sky current Steam review feed](https://steamcommunity.com/app/275850/reviews/?filterLanguage=english).** Valve / individual players, retrieved 2026-09-26. Includes a current 100+ hour negative arguing systems remain simple/repetitive across galaxy. Dynamic/self-selected sample.

<a id="nms45"></a>**NMS45 — [Expeditions Revisited](https://www.nomanssky.com/2021/11/expeditions-revisited/).** Hello Games. Primary explanation of Expedition fresh-start/shared-hub intent.

<a id="nms46"></a>**NMS46 — [Holiday 2024 Expeditions](https://www.nomanssky.com/2024/11/holiday-2024-expeditions/).** Hello Games. Primary rerun policy and 2024 update/Expedition recap.

<a id="nms47"></a>**NMS47 — [No Man's Sky Beyond Review — Reach For The Stars](https://www.gamespot.com/reviews/no-mans-sky-beyond-review-reach-for-the-stars/1900-6417292/).** Justin Clark, GameSpot, 2019-09-19. Full later-version professional review; strong VR/multiplayer/system-cohesion reassessment.

<a id="nms48"></a>**NMS48 — [No Man's Sky Review (Switch)](https://www.nintendolife.com/reviews/nintendo-switch/no-mans-sky).** PJ O'Reilly, Nintendo Life, 2022-10-11, updated for Waypoint. Full later-version/port review.

<a id="nms49"></a>**NMS49 — [After two years, is No Man's Sky everything Hello Games originally promised?](https://www.gamesradar.com/no-mans-sky-revisited/).** GamesRadar+, 2018. Lifecycle reassessment of Foundation/NEXT changes and remaining structural repetition.

<a id="nms50"></a>**NMS50 — [No Man's Sky on Steam — current reviews](https://store.steampowered.com/app/275850/No_Mans_Sky/).** Valve, snapshot retrieved 2026-09-26. Current English/recent review proportions and helpful-review examples; dynamic and self-selected.

<a id="nms51"></a>**NMS51 — [No Man's Sky reaches Very Positive on Steam](https://www.pcgamer.com/games/sim/holy-s-t-you-guys-it-happened-8-years-after-a-terrible-launch-no-mans-sky-has-reached-a-very-positive-rating-on-steam/).** Andy Chalk, PC Gamer, 2024-11-27. Dated 80%-threshold milestone.

<a id="nms52"></a>**NMS52 — [No Man's Sky most-helpful all-time Steam reviews](https://steamcommunity.com/app/275850/reviews/?browsefilter=toprated).** Individual Steam reviewers, retrieved 2026-09-26. Qualitative positive sample; hours shown now need not equal hours at posting.

<a id="nms53"></a>**NMS53 — [No Man's Sky most-helpful negative Steam reviews](https://steamcommunity.com/app/275850/negativereviews/?browsefilter=toprated).** Individual Steam reviewers, retrieved 2026-09-26. Historical 2016 negative sample preserved as player testimony; not a current defect claim.

<a id="nms54"></a>**NMS54 — [Sean Murray reflects on launch press strategy](https://www.gamesradar.com/games/survival/10-years-after-its-messy-launch-no-mans-sky-boss-sean-murray-wishes-he-could-warn-his-younger-self-dont-do-all-the-press/).** GamesRadar+, 2026. Current interview/reporting on Hello Games' launch-communication lesson; creator perspective, not independent causal proof.

<a id="checkpoint-sources"></a>

### Additional annotated evidence

<a id="n01"></a>**N01 — [No Man's Sky review](https://www.pcgamer.com/no-mans-sky-review/), Christopher Livingston, August 18, 2016.** Original written launch criticism, selectively reread. Its resource names, missing-feature observations and technical state are historical, not current claims.

<a id="n02"></a>**N02 — [Cosmos announcement](https://www.nomanssky.com/2026/09/no-mans-sky-cosmos/), September 9, 2026.** Primary delivery date and current scope. Promotional claims about never having changed space are not read literally against the documented earlier updates.

<a id="n03"></a>**N03 — [Our Journey Continues expedition](https://www.nomanssky.com/2026/09/expedition-twenty-three-our-journey-continues/), September 16, 2026.** Primary actual expedition start, distinct from its prior announcement.

<a id="n04"></a>**N04 — [Portable Refiner](https://nomanssky.fandom.com/wiki/Portable_Refiner).** Substantive indexed community text; direct page retrieval failed. Single-input/fuel/transport distinction, not duplication exploits or an exact current refiner-family count.

<a id="n05"></a>**N05 — [Copper](https://nomanssky.fandom.com/wiki/Copper) and [Chromatic Metal](https://nomanssky.fandom.com/wiki/Chromatic_Metal).** Indexed resource/recipe roles. Conflicting historical Cadmium ratios and unlimited-multiplication advice excluded.

<a id="n06"></a>**N06 — [Personal Refiner](https://nomanssky.fandom.com/wiki/Personal_Refiner).** Indexed actual processing role. Historical exploit instructions and old recipe costs are not adopted.

<a id="n07"></a>**N07 — [Life Support](https://nomanssky.fandom.com/wiki/Life_Support) and [Hazard Protection](https://nomanssky.fandom.com/wiki/Hazard_Protection).** Indexed community system distinctions. Exact old drain/recharge tables and known-bug claims are not generalized across custom modes.

<a id="n08"></a>**N08 — [Waypoint](https://www.nomanssky.com/waypoint-update/), 2022.** Primary configurable difficulty, separate pools, recorded knowledge and saving. No inference that every restricted Permadeath setting can be reversed.

<a id="n09"></a>**N09 — [Technology layout reference](https://www.nomansskyresources.com/tech-layout-and-adjacency-bonus).** Community explanation of matching-family adjacency. Its exact optimal layouts and universal best-placement advice are not treated as tested facts.

<a id="n10"></a>**N10 — [Waypoint 4.05](https://www.nomanssky.com/2022/10/waypoint-patch-4-05/), October 21, 2022.** Primary introduction of boosted slots, not the initial 4.0 release. No independently measured build comparison.

<a id="n11"></a>**N11 — [Beyond](https://www.nomanssky.com/beyond-update/), 2019.** Primary industrial/power/building systems. Historical player-count and performance claims are not universal current guarantees.

<a id="n12"></a>**N12 — [Voyagers](https://www.nomanssky.com/voyagers-update/), 2025.** Primary collected modules, interiors, services and autopilot. Current Cosmos expansion and old time-limited rewards are separate.

<a id="n13"></a>**N13 — [Remnant](https://www.nomanssky.com/remnant-update/), February 2026.** Primary physical handling, waste-processing and vehicle services. Supported object categories, not arbitrary physics authority.

<a id="n14"></a>**N14 — [Beacon](https://www.nomanssky.com/beacon-update/), June 2025.** Primary settlement choices, records and attention-pressure changes. Advertised citizen individuality is not proof of general social cognition.

<a id="n15"></a>**N15 — [Companions](https://www.nomanssky.com/companions-update/), 2021.** Primary care/assistance/egg relationships. Original six-companion capacity is not asserted as a current maximum; fictional neuro-translation is not evidence of a language model.
