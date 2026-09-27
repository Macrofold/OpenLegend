# G133 — ARK: Survival Evolved

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

ARK: Survival Evolved is a useful reference because it turns creatures into **infrastructure, companions, vehicles, weapons, production tools and inheritable projects**. The famous fantasy is riding dinosaurs, but the deeper system is a progression lattice: survivor attributes and Engrams unlock technology; tamed creatures alter harvesting and traversal; breeding turns animals into long-running optimization lines; caves/artifacts/bosses gate Tek technology and Ascension; tribes distribute labor and ownership; server settings can radically compress or expand every timer. Its greatest strength and most repeated criticism are the same thing: there is an enormous amount to build, tame, breed and discover, but default time costs and technical friction can make loss feel larger than the decisions that caused it.

This dossier studies **ARK: Survival Evolved (ASE)** as its own product. It does not substitute ARK: Survival Ascended mechanics or content. That distinction matters more than ever because ASE unexpectedly received a separate tenth-anniversary expansion, Aquatica, in 2025 after its original official server network had already closed.

## R01 — identity, edition boundaries, current state and player promise

Studio Wildcard launched ARK: Survival Evolved into Steam Early Access on June 2, 2015 and released version 1.0 on August 29, 2017 for PC, Xbox One and PlayStation 4. The original pitch is simple and unusually generative: wake nearly naked on a mysterious island, gather resources, survive bodily/environmental threats, tame or kill prehistoric/fantastical creatures, build, advance from primitive tools into science-fiction technology, cooperate or compete with other survivors, and ultimately uncover what the ARKs are. [PC Gamer launch report](https://www.pcgamer.com/ark-survival-evolved-has-officially-launched-along-with-a-45-season-pass/) · [Steam community/store](https://steamcommunity.com/app/346110/).

### ASE is not ARK: Survival Ascended

ARK: Survival Ascended (ASA) is a separately sold Unreal Engine 5 reimagining/remaster with its own maps, mechanics, creature additions, mod platform, paid content and live roadmap. Any ASA-specific building changes, traits, premium creatures, Bob's Tall Tales systems or later maps must not be projected backward into this dossier.

### Original official network shutdown

Studio Wildcard announced that the original ASE Official Network would go offline as the franchise moved toward ASA. The shutdown occurred **September 30, 2023**. Wildcard published the official server save files so players could host their own servers and continue those worlds. [Community Crunch 368](https://survivetheark.com/index.php?/forums/topic/693284-community-crunch-368-asa-roadmap-update-asa-comparison-and-more/) · [official server saves](https://survivetheark.com/index.php?/forums/topic/706043-community-crunch-382-official-server-saves-and-community-corner/).

That did **not** make ASE unplayable. Single-player, non-dedicated/dedicated hosting, unofficial/community servers and mods continued.

### Aquatica changed the "finished game" boundary in 2025

On July 15, 2025, Snail Games USA and Studio Sirens released **ARK: Aquatica**, a paid, PC-exclusive ASE expansion created for the tenth anniversary. It is explicitly a non-canonical/mythical side story rather than another canonical story-map chapter. Its headline systems include a submerged ARK, pressure/current/environmental challenges, 21 new tameable creatures, 74 Engrams including 7 Tek Engrams, five biomes, new cooking recipes and underwater-oriented structures/equipment. [Snail launch announcement](https://snail.com/news/qnpl1wy4dhdw3rjkuc3b1e5ch2rlfx-xdn67-2cdkm-kc33l-5egm5-njmjt-rf4bc) · [Steam](https://store.steampowered.com/app/3537070/ARK_Aquatica/).

Aquatica launched with significant technical/mod-compatibility problems. The publisher exposed a **preaquatica** branch so players/server operators could remain on the previous ASE build while fixes and DevKit compatibility work continued. That branch was later described as permanently available. [July 15 apology/update](https://store.steampowered.com/news/posts/?appids=346110&enddate=1752716291&feed=steam_community_announcements).

Aquatica briefly restored a limited official-server layer specifically for the expansion, but Studio Sirens shut **all official Aquatica servers down indefinitely on January 30, 2026**, while saying bug fixes/quality-of-life support for the DLC would continue. [January 2026 announcement](https://steamcommunity.com/app/346110/announcements/).

Therefore the September 2026 ASE service boundary is:

- no original Studio Wildcard ASE Official Network;
- no active Aquatica official servers;
- single-player/local/non-dedicated play remains;
- player-hosted/unofficial servers remain central;
- Steam Workshop/mods remain central, with preaquatica compatibility caveats;
- Aquatica remains purchasable PC DLC and part of current ASE content;
- ASA live-service announcements are not ASE content.

### Major ASE map/content families

Canonical paid story expansions grew the campaign beyond The Island:

- Scorched Earth;
- Aberration;
- Extinction;
- Genesis: Part 1;
- Genesis: Part 2.

Free official expansion maps include The Center, Ragnarok, Valguero, Crystal Isles, Lost Island and Fjordur. Several originated in the modding community and were adopted officially. The maps can reuse creatures/items while changing biome constraints, progression routes and boss compositions. [ARK Official Community Wiki DLC index](https://ark.wiki.gg/wiki/DLCs).

Aquatica is a later, non-canonical PC-only expansion and should not be inserted into the original canonical sequence.

## R02 — actions and major mechanics

### Character creation and survivor attributes

Players create a survivor with highly flexible body proportions/appearance rather than selecting a combat class. Experience from gathering, crafting, exploration, kills and other play increases survivor level. Each ordinary level provides an attribute increase and Engram Points.

Core survivor stats include Health, Stamina, Oxygen, Food, Water, Weight, Melee Damage, Fortitude and Crafting Skill; movement-speed behavior has changed over ARK's history/server configuration, so exact investment rules are version-sensitive. [server attribute index](https://ark.wiki.gg/wiki/Server_configuration/sandbox).

This means ARK has **two simultaneous progression bodies**:

1. the survivor, whose attributes/Engrams persist through ordinary death;
2. the creature collection, whose stats, lines and utility can exceed the survivor's direct capabilities.

### Hunger, thirst, temperature, torpor and environment

Food, water, temperature and health create the basic survival loop. Cold/heat depend on biome, weather, clothing/armor and Fortitude. Oxygen constrains underwater activity. Torpor can render a survivor unconscious; many creature-taming methods intentionally manipulate the same concept.

Expansion maps reinterpret these primitives. Scorched Earth intensifies heat/water/weather; Aberration emphasizes subterranean hazards, radiation and vertical traversal; Genesis maps add missions; Aquatica makes underwater pressure/current/breathing adaptations a map-wide premise.

### Gathering and resource specialization

The early survivor collects berries/fiber, punches/chops trees, mines stone/metal and processes materials by hand/tool. Tames eventually make many resource flows creature-mediated:

- Ankylosaurus for metal-like mining roles;
- Doedicurus for stone;
- Castoroides or mammoth-like gatherers for wood depending context;
- Argentavis and other carriers for transport;
- aquatic/flying mounts for access;
- predators for meat/hide/combat;
- specialized creatures for unusual resources or production.

The important design shift is from **the player doing an action** to **the player building a roster that does actions differently**.

### Engrams, blueprints and technology

**Engrams** are permanent learned crafting recipes. Leveling grants Engram Points, and default multiplayer does not simply give enough points to learn every possible recipe, encouraging choices/tribal specialization. Learned Engrams survive normal death and can be reset with Mindwipe Tonic. [Engrams](https://ark.wiki.gg/wiki/Engrams).

**Blueprints** are physical loot recipes that can produce quality items and can be lost/stolen. Crafting Skill can affect blueprint-crafted item quality. Thus ARK separates permanent recipe knowledge from valuable physical manufacturing knowledge. [Crafting Skill](https://ark.wiki.gg/wiki/Crafting_Skill).

The technology arc runs from stone tools/campfires/thatch through wood/stone/metal, firearms, electricity, industrial machinery and finally **Tek**.

### Building and production

Snap-linked construction supports foundations, walls, ceilings, pillars, ramps, gates, storage, crafting stations, defenses, irrigation and electrical networks. Building materials have different resistance/utility; shelter mitigates weather and protects stockpiles. The official community documentation describes support dependencies and tiers including thatch, wood/adobe, stone, greenhouse, metal and Tek. [Building](https://ark.wiki.gg/wiki/Building).

Production grows correspondingly:

- campfires/cooking pots;
- mortar and pestle;
- refining forge and smithy;
- fabricator and generator/electrical equipment;
- industrial forge/grill/cooker/grinder;
- crop plots/irrigation/greenhouses;
- Tek Replicator and later Tek infrastructure.

This is not a freeform voxel world. Buildings are assembled from authored structural pieces with snap/support/placement rules.

### Taming — creatures become capabilities

The iconic loop is **taming**, but "feed dinosaur" is too narrow. Different creatures support different methods: knockout/torpor taming, passive feeding and numerous creature-specific processes added over the years.

In classic knockout taming, the survivor:

1. renders a creature unconscious without killing it;
2. supplies appropriate food;
3. maintains unconsciousness/torpor;
4. protects it from damage and predators/players;
5. waits for the tame to complete.

Preferred food/kibble can improve speed/effectiveness; damage while unconscious lowers taming effectiveness. Final effectiveness affects bonus levels/stats. [Taming](https://ark.wiki.gg/wiki/Taming).

The system creates a temporary **defense objective around an animal that cannot defend itself**. Taming a powerful creature is not only a timer; it changes the immediate map from hunting ground into a perimeter to protect.

### Creature roles and command

Tamed creatures can be:

- ridden;
- ordered to follow/stay/attack/passive/neutral behavior;
- assigned to harvesting/production niches;
- fitted with saddles or platform saddles;
- used as cargo transport;
- deployed in caves/bosses/raids;
- used for breeding;
- stored through later cryopod systems where applicable.

Creature value is consequently multidimensional: base stats, level/stat distribution, mobility, special ability, saddle quality, size/cave access, breeding potential and emotional attachment.

### Breeding, inheritance, mutation and imprinting

Breeding turns taming from collection into **selective lineage design**. Compatible adults mate; eggs incubate or mammals gestate; newborns require immediate care and food; maturation can take substantial real time on default rates. [Breeding](https://ark.wiki.gg/wiki/Breeding).

Offspring can inherit parental stat values. Long-term breeders seek desirable base stats, combine them, then exploit mutations/line management to improve targeted lines. Imprinting through juvenile-care interactions provides stat benefits and a rider-specific bonus when fully maintained.

This loop is one reason ARK can consume hundreds or thousands of hours—and one of the most criticized sources of real-time grind.

### Farming, cooking and consumables

Crop plots, irrigation, fertilizer/compost, greenhouse effects and seeds support agriculture. Crops and animal products feed recipes, kibble and medical/buff consumables. Kibble connects farming/breeding infrastructure back into taming efficiency.

Custom recipes and cooking create another place where character Crafting Skill can matter.

### Combat and equipment

Combat spans:

- spears, clubs, bows/crossbows;
- guns and ammunition;
- tranquilizer weapons/ammo;
- explosives;
- armor and shields;
- mounted creature attacks;
- turrets/traps;
- Tek weaponry;
- enormous boss armies.

Personal FPS/melee combat can matter, but late PvE/PvP often depends on **combined human + creature + structure** capability. A saddle blueprint can be as strategically important as a firearm because armor on a boss-line mount changes an entire army's survivability.

### Traversal

Traversal expands continuously:

- walking/running/swimming;
- rafts and motorboats;
- land mounts;
- flying mounts;
- aquatic mounts;
- climbing/gliding creatures or equipment on particular expansions;
- teleporters/advanced Tek or map-specific systems.

A newly tamed flier can effectively rewrite the map by changing travel time, cargo geometry and access to cliffs/resources.

### Death, beds and recovery

Ordinary survivor death drops carried inventory rather than deleting learned levels/Engrams. A corpse/bag can be recovered before loss, while beds/sleeping bags create chosen respawn locations.

A Hide Sleeping Bag is one-use; a Simple Bed is reusable with cooldown. Bed fast travel normally leaves carried inventory behind, meaning teleportation is useful for **people/coordination**, not free cargo movement. [Hide Sleeping Bag](https://ark.wiki.gg/wiki/Hide_Sleeping_Bag) · [Simple Bed](https://ark.wiki.gg/wiki/Simple_Bed).

Tamed creatures can permanently die. That asymmetry is crucial: a survivor's level returns, but a carefully bred line member may not.

### Tribes, ownership and alliances

Tribes are ARK's guild/ownership layer. Governance can determine ownership/access to creatures and structures; ranks/groups constrain permissions. PvP tribes can ally, share some infrastructure/visibility and coordinate wars. [Tribes](https://ark.wiki.gg/wiki/Tribes).

In practice a tribe is also a labor organization: one person can breed, another build, another farm metal, another tame, another run caves/bosses. Many default timers make that division materially advantageous.

### Cross-ARK transfers and server clusters — audit addition

The initial pass under-covered one of ASE's most important continuity systems: **CrossARK Transfers**. Survivors can upload/download their survivor, items and tamed creatures between compatible ARKs through Obelisks, Tek Transmitters and map-specific terminals/crates where server rules allow it. Transfers can work in single-player/non-dedicated play and across dedicated-server clusters; unofficial clusters require shared cluster configuration, while official rules historically constrained transfers by game mode/server class. [CrossARK Transfers](https://ark.wiki.gg/wiki/CrossARK_Transfers).

This means expansion maps are not merely disconnected campaigns. A long-lived survivor can carry identity/progression across geography, and tribes can move selected creatures/resources between maps. Restrictions matter: inventories on uploaded creatures are dropped, some items/creatures/maps disallow transfer, multiplayer uploads can expire, and server owners can disable survivor/item/dino upload/download independently. Cross-map continuity is therefore a **permissioned logistics system**, not unrestricted teleportation.

Cryopods interact strongly with transfers because a tame can become a portable inventory item rather than consuming a direct creature-transfer slot. In ASE, cryopods halt food consumption, preserve many creature stats/identity and have charge/cryofridge rules; failure to recharge a pod can permanently kill the stored tame. [Cryopod](https://ark.wiki.gg/wiki/Cryopod). This makes creature storage itself a persistent maintenance dependency.

### Activities and mission structures — audit addition

ASE includes structured activities beyond caves/bosses:

- **Fishing** requires sitting on an eligible chair/bench/raft/Pelagornis, applying bait and completing directional/time-sensitive input prompts while the hooked fish struggles. Fish size, species, bait and rod quality affect meat/resources and possible blueprint/item rewards. Aquatica adds new bait types to the original fishing system. [Fishing Rod](https://ark.wiki.gg/wiki/Fishing_Rod).
- **Genesis: Part 1 Missions** are repeatable authored activities with Gamma/Beta/Alpha difficulties. Mission types include hunts, races and other scenario structures; rewards include XP, items and Hexagons. Some missions permit tames, some supply temporary creatures and some temporarily cryopod participants' tames. [Genesis missions](https://ark.wiki.gg/wiki/Mission).
- Explorer Note hunting, cave runs, Orbital Supply Drops/Extinction events and map-specific arenas also create repeatable/collectible goals outside ordinary gathering.

These activities matter because ARK's sandbox repeatedly introduces **bounded challenge formats inside persistent survival worlds** rather than requiring every objective to emerge from player construction.

### PvE, PvP, local and server settings

Server settings can alter:

- XP;
- harvesting;
- taming;
- breeding/maturation/imprinting;
- damage;
- structure rules;
- difficulty/creature levels;
- Engrams;
- PvE/PvP;
- transfer and persistence behavior.

This is not a footnote. PC Gamer's 2017 review specifically argued that custom servers/mods could reveal a better-paced game by removing large portions of grind. Current 2026 community discussions still advise time-constrained solo players to increase rates.

## R03 — items, creatures and systemic composition

### Item families

Important item classes include:

- raw resources and refined materials;
- tools and weapons;
- ammunition and explosives;
- clothing/armor;
- saddles;
- structures and crafting stations;
- food/drink/crops/recipes;
- narcotics/stimulants/medicine;
- fertilizers/seeds;
- artifacts and boss tribute items;
- blueprints and loot-quality equipment;
- electrical/irrigation components;
- cryopods and creature-support items;
- Element/Tek resources and devices;
- expansion-specific tools.

Weight limits and stack sizes mean gathering efficiency is inseparable from transport.

### Quality and blueprints

Loot can contain higher-quality items/blueprints with better statistics and higher crafting requirements. A powerful saddle blueprint creates a **manufacturing problem**: getting the recipe is only step one; a tribe must acquire enough materials and crafting capacity to produce an army's worth.

This is a useful way to make rare loot unlock repeatable economic activity rather than serve as one disposable reward.

### Creature composition is the real loadout

ARK's most distinctive "party composition" is not a humanoid party. A mature roster can include:

- resource gatherers;
- haulers/fliers;
- cave-capable mounts;
- ocean specialists;
- breeders;
- boss damage dealers/tanks/support animals;
- base-defense creatures;
- utility creatures with healing, insulation or other special abilities.

A player therefore composes a **living toolchain**.

### Persistent ownership and vulnerability

Structures, inventories, tames and breeding stock persist in the world on servers subject to server rules/decay. This supports attachment and economy but also creates offline responsibility. The original official network had auto-decay rules; those exact old official-network timers are historical now that the network is shut down and should not be presented as universal 2026 unofficial-server behavior.

## R04 — progression, economy, time and endgame

### Survivor levels and Engrams

XP raises survivor levels, which grant attribute choices and Engram Points. According to the current official community wiki's ASE-specific history, ordinary levels plus Ascensions/collectibles raised ASE's maximum over time; **Aquatica's Pygocentrus progression added another 15 possible Ascension levels in patch 360.1**, pushing the possible ASE cap to 220 under the current content set. Exact availability depends on owning/accessing relevant content. [Leveling](https://ark.wiki.gg/wiki/Leveling).

The important pattern is that bosses can expand the character's **future capacity**, not merely drop loot.

### Artifacts, bosses, Tekgrams and Ascension

Caves contain **Artifacts**, often combined with other tributes to open boss encounters. [Artifacts](https://ark.wiki.gg/wiki/Artifacts).

Bosses come in difficulty tiers and unlock Tekgrams. Harder boss difficulties can unlock broader Tek rewards. Tekgrams are required to craft/use corresponding advanced technology. [Engrams / Tekgrams](https://ark.wiki.gg/wiki/Engrams).

The Island progression illustrates ARK's nested escalation:

survive → establish base → tame utility creatures → obtain better resources/gear → explore caves → collect Artifacts/tributes → breed/equip boss-capable armies → defeat Guardians → enter the Tek Cave/Overseer → Ascend.

Later canonical maps continue the science-fiction story and unlock additional endgame technology/levels.

### Time is an explicit resource

Default ARK ties value to real clocks:

- taming;
- breeding cooldowns;
- egg incubation/gestation;
- maturation;
- imprint windows;
- crop growth;
- refining/crafting;
- respawn timers;
- server persistence/decay.

Reviews repeatedly identify these clocks as both a source of attachment and a source of disrespect for player time. Server-rate customization exists partly because the default pacing can be mismatched to solo or casual schedules.

### Economy without one currency

Base ARK does not require a universal NPC gold economy. Value comes from materials, blueprints, tames, eggs, breeding lines, Element, high-quality saddles and labor/time. PvP/server communities can barter or create norms.

Genesis adds mission/Hexagon-style economy layers, but those expansion systems should not be projected onto The Island as a universal vendor loop.

### Death versus lineage loss

Survivor death is recoverable because XP/Engrams persist. Creature death can destroy something far more expensive: a rare tame, a mutation line representative, a high-quality saddle and whatever inventory it carried.

This inversion makes players fear for "pets" more than avatars.

### Endgame and replay

The canonical story has real progression/endpoints through boss fights and Ascension across story maps, but the sandbox can continue indefinitely. Other return loops include:

- starting a new map;
- transferring survivors/creatures where allowed;
- breeding new lines;
- PvP tribe cycles;
- custom server clusters;
- mods;
- different rate/difficulty settings;
- free expansion maps;
- Aquatica as a separate late-life PC expansion.

## R05 — worked interactions and concrete situations

Unless otherwise attributed, these are rules-based illustrations.

### Case 1 — the first tame changes who performs labor

**Intention:** collect berries/fiber/resources faster than the survivor can alone.  
**Conditions:** a suitable creature is nearby; the player has a taming method/food and can protect the process.  
**Actions:** knock out or otherwise tame the creature, maintain torpor/food where required, then saddle/command it if appropriate.  
**Interaction:** the survivor invests time and consumables into acquiring a persistent worker.  
**Result:** future gathering/travel changes in kind, not merely percentage.  
**Next decision:** tame another specialist, breed the creature, or redirect saved labor toward building/exploration.

### Case 2 — preferred food converts farming into taming efficiency

**Intention:** tame a high-value wild creature at high effectiveness.  
**Conditions:** ordinary food works, but preferred kibble is more efficient.  
**Actions:** maintain egg/crop/cooking infrastructure ahead of the expedition; bring the preferred food; protect the unconscious target.  
**Interaction:** domestic agriculture/animal husbandry influences success in a dangerous field operation.  
**Result:** a base system improves the quality/time cost of a future tame.  
**Limit:** if preparation becomes mandatory spreadsheet work for every useful creature, the dependency can feel like bureaucracy.

### Case 3 — a flier rewrites resource geography

**Intention:** obtain metal from a distant mountain.  
**Conditions:** walking there is slow/dangerous and metal is heavy.  
**Actions:** tame/use an appropriate flying carrier, fly to deposits, load within weight constraints and return.  
**Interaction:** creature mobility and carrying capacity alter which resource nodes are economically reachable.  
**Result:** a distant mountain becomes part of the base's routine supply chain.  
**Next decision:** optimize cargo, establish an outpost, add specialized mining tames, or accept exposure to aerial threats/PvP.

### Case 4 — breeding converts pets into a multigenerational project

**Intention:** build a boss-ready combat line.  
**Conditions:** several high-stat adults have different desirable wild/tamed stat distributions.  
**Actions:** breed to combine desired inherited stats, preserve useful parents, raise offspring, imprint selected animals and pursue mutations over generations.  
**Interaction:** genetics, real-time maturation, food logistics and player attention combine.  
**Result:** the army can substantially outperform casually tamed animals.  
**Next decision:** continue mutation optimization or stop when marginal time exceeds expected boss benefit.  
**Limit:** this is one of ARK's most notorious time sinks.

### Case 5 — a saddle blueprint becomes an industrial project

**Intention:** increase boss-army survivability.  
**Conditions:** the tribe finds a high-quality blueprint requiring large material quantities.  
**Actions:** specialize gatherers, mine/refine resources, exploit Crafting Skill if appropriate, then manufacture many saddles.  
**Interaction:** random/exploration loot creates downstream demand for harvesting, transport and industrial stations.  
**Result:** one blueprint upgrades an entire class of future creatures.  
**Limit:** material multiplication can turn an exciting find into grind if quantities dominate decisions.

### Case 6 — artifact caves require a different "party"

**Intention:** acquire an Artifact needed for a boss tribute.  
**Conditions:** the cave has narrow geometry, hazards and hostile creatures; a normal open-world mount may not fit.  
**Actions:** choose cave-suitable mounts/equipment, prepare food/medicine/ammunition, traverse, retrieve the Artifact and escape.  
**Interaction:** environment invalidates the otherwise strongest general-purpose tame.  
**Result:** roster diversity matters because capability is contextual.  
**Next decision:** repeat for other Artifacts or prepare boss tributes.

### Case 7 — a boss loss destroys time in multiple layers

**Intention:** defeat a Guardian on a harder difficulty.  
**Conditions:** the player has bred animals, saddles and tribute items.  
**Actions:** enter the arena and fail.  
**Interaction:** combat loss may erase creatures/equipment plus the time used to breed/craft them.  
**Result:** the next attempt can require significant rebuilding rather than an immediate checkpoint retry.  
**Review evidence:** IGN/PC Gamer-era criticism repeatedly identifies boss/taming/grind repetition as disproportionately punishing.  
**Design limit:** high stakes are only valuable while rebuilding still produces meaningful decisions.

### Case 8 — a bed enables coordination without free freight

**Intention:** move the survivor quickly between established bases.  
**Conditions:** beds exist at both points.  
**Actions:** fast travel using the bed network.  
**Interaction:** the survivor drops carried inventory before travel.  
**Result:** the human presence can relocate rapidly, but resource logistics still require creature/vehicle/manual transport.  
**Next decision:** maintain duplicate equipment at destinations or move cargo separately.

### Case 9 — tribe governance makes ownership a design decision

**Intention:** let a group share tames and structures without giving every member identical authority.  
**Conditions:** a tribe is formed.  
**Actions:** configure governance/ranks and assign access/ownership permissions.  
**Interaction:** creature ownership, building access and social trust become one system.  
**Result:** the tribe can specialize labor while reducing some sabotage/carelessness risk.  
**Limit:** permission complexity itself becomes administration.

### Case 10 — server settings change the entire labor contract

**Intention:** let two friends complete the story without maintaining a near-continuous breeding schedule.  
**Conditions:** they host/control an unofficial/local server.  
**Actions:** raise taming/breeding/maturation/gather rates while leaving combat/boss rules mostly intact.  
**Interaction:** the same content graph now has a different relationship to real-world time.  
**Result:** planning remains while waiting is compressed.  
**Research implication:** time cost is separable from system depth; default grind is not required for taming/breeding to be strategically rich.

### Case 11 — an unconscious tame becomes an emergent defense mission

**Intention:** tame a dangerous high-level predator.  
**Conditions:** the animal is unconscious for a long enough period to be vulnerable.  
**Actions:** feed/maintain torpor while defending it from wild creatures or enemy players.  
**Interaction:** an otherwise static timer turns surrounding terrain into a temporary base perimeter.  
**Result:** taming produces a story of protection rather than only progress-bar waiting.  
**Counterexample:** if no threat occurs, the same timer can become literal waiting.

### Case 12 — a survivor crosses maps but not without transfer rules

**Intention:** take a mature survivor and selected tames from The Island to another compatible ARK.  
**Conditions:** source/destination are in a transfer-compatible configuration and uploads/downloads are permitted.  
**Actions:** move survivor/items/tames to an Obelisk/terminal, upload them under the relevant tabs, then download at the destination.  
**Interaction:** character identity, creature ownership, item logistics and server policy all meet at one transfer boundary.  
**Result:** progression can continue across maps rather than restarting every expansion.  
**Limit:** creature inventories drop, transfers can expire or be disabled, and not every creature/item is legal on every map.

### Case 13 — fishing turns bait knowledge into blueprint loot

**Intention:** obtain resources/possible high-quality loot without another cave run.  
**Conditions:** player has a Fishing Rod, valid seat, bait and visible catchable fish.  
**Actions:** bait/cast, respond to prompted inputs while the fish struggles and land the catch.  
**Interaction:** bait type, fish species/size and rod quality affect reward quality.  
**Result:** an apparently quiet food activity can feed equipment/blueprint progression.  
**Next decision:** consume fish, repeat with better bait/rod or return to higher-risk loot sources.

### Case 14 — Aquatica makes "land creature" adaptation a crafting problem

**Intention:** operate in the submerged tenth-anniversary map with familiar survival logic.  
**Conditions:** Aquatica uses underwater hazards/current/pressure and provides new Engrams/creatures.  
**Actions:** use expansion-specific equipment such as lead-weighted movement/air-pocket concepts and its mutation/adaptation systems for underwater operations.  
**Interaction:** a late-life DLC reinterprets movement, base atmosphere and creature utility around submersion.  
**Result:** ASE gained a genuinely different environmental contract after the original official network had already closed.  
**Boundary:** Aquatica is PC-only, non-canonical and developed/published through Snail Games USA/Studio Sirens; it is not an ASA feature.

## R06 — people, creatures, AI, tribes and multiplayer

### Creatures as quasi-companions

ARK's creatures do not have authored companion dialogue/romance/approval arcs, but they generate attachment through:

- naming;
- time invested in tame/breeding;
- inherited line history;
- player rescue stories;
- utility;
- permanent death.

A raptor named after a real pet, as in PC Gamer's review, can become emotionally significant without authored personality.

### AI and command

Wild creatures have species-specific aggression/fleeing/behavior profiles; tames expose stance/follow/target commands. This is functional rather than a deep social cognition simulation. AI pathing and creature behavior have also been frequent sources of technical criticism.

### Tribes are the real party system

A tribe can share:

- bases;
- creatures;
- storage/crafting infrastructure;
- beds;
- farming;
- boss armies;
- territory defense;
- labor schedules.

Unlike an RPG party, members may log in asynchronously while the world persists. This creates continuity but also responsibility.

### PvP power disparity

ARK's technology and breeding stacks can create enormous asymmetry. PC Gamer's launch review memorably contrasts new primitive players with advanced tribes carrying firearms/high-tech defenses; the gap is not only FPS skill but accumulated infrastructure.

PvP can therefore produce warfare at impressive scale and also make onboarding on established servers hostile.

### PvE

PvE removes direct player destruction while preserving environmental danger, bosses, progression and cooperative building. It can create a more stable creature-collection/building experience, but historical official-server crowding/pillar/resource issues were another form of player-to-player friction.

### No romance or authored reputation

There is no native companion romance system and no universal NPC faction-reputation ladder. Social reputation is human/server community reputation.

## R07 — art, audio, interface and feel

ARK's signature art direction is **prehistoric spectacle colliding with science fiction**. A beach survival scene can eventually contain metal fortresses, assault rifles, glowing Tek armor and engineered creature armies. That tonal escalation is not accidental clutter alone; it foreshadows the ARK's artificial nature.

Creature scale creates strong embodied spectacle. The ability to mount animals shifts camera/motion/sound repeatedly, making "new tame" feel partly like acquiring a new vehicle.

The Island and expansions use biome contrast—beach, jungle, swamp, snow, ocean, desert, caves, alien subterranean spaces—to make progression geographically legible.

Audio communicates creature proximity, combat and environmental danger but is less foundational to the design than DayZ's information-by-sound emphasis.

### Interface/legibility

ARK exposes:

- stat sheets;
- creature inventories;
- Engram menus;
- crafting inventories/stations;
- whistle groups;
- tribe governance;
- building placement;
- breeding ancestry/stat evaluation;
- server configuration.

That density enables mastery but makes onboarding difficult. Multiple launch reviews call systems obscure/incomprehensible or dependent on community wikis. Current players still recommend spyglass/information mods partly because breeding/taming-relevant values are not always legible enough in base presentation.

### Performance/storage as experience constraints

Launch reviews criticized performance, server lag, clipping and bugs. Current September 2026 Steam reviews still complain about extremely large install/storage footprints, loading/stuttering and technical friction. Some of this comes from years of accumulated maps/DLC/mod content; exact install size depends on selected DLC/mods and should not be stated as one universal number.

## R08 — story, lore and connection to gameplay

ARK has more authored story than its beach-survival opening suggests.

**Explorer Notes** and dossiers document previous survivors and the nature of the ARKs. [The Island](https://ark.wiki.gg/wiki/The_Island). Bosses, the Tek Cave/Overseer and Ascension reveal that the apparently prehistoric island is constructed science-fiction infrastructure. Canonical expansions continue that thread through Scorched Earth, Aberration, Extinction and Genesis.

This is an effective **mechanics-to-fiction escalation**:

- primitive survival makes the world appear natural;
- obelisks/implants hint otherwise;
- caves/artifacts become progression keys;
- bosses reward Tek;
- Ascension reframes the environment;
- later maps expand the cosmological threat/history.

The free official expansion maps often emphasize sandbox geography over canonical narrative.

Aquatica is explicitly non-canonical/mythical despite including a story about Element origins. It should be studied as a side-story product, not inserted into the canonical sequence.

## R09 — production and development

ARK is one of the defining "grow in public" Early Access cases.

It launched in June 2015 and sold rapidly. By the planned 2017 full release, press reported millions of players/owners; full release ultimately arrived August 29, 2017. [GameSpot launch](https://www.gamespot.com/articles/ark-survival-evolved-officially-launches-today/1100-6452962/).

A major controversy arrived **before 1.0** when Wildcard sold Scorched Earth as paid expansion while the base game remained Early Access. CEO Doug Kennedy later acknowledged the criticism while discussing ARK's Early Access history and commercial success. [PC Gamer interview](https://www.pcgamer.com/ark-survival-evolved-studio-ceo-on-early-access-reviews-and-punching-trees/).

Production continually expanded rather than converged narrowly:
- new creatures/maps;
- building tiers;
- Tek;
- bosses/story;
- breeding;
- official adoption of mod maps;
- Extinction/Genesis;
- platform ports;
- long-term event/content updates.

Genesis: Part 2 was announced by Wildcard as the **final DLC** of the original ARK saga in 2021, but "final" was later complicated by free Fjordur (2022), late Scorched Earth Ascension additions and especially Snail/Studio Sirens' separate Aquatica expansion in 2025. [Genesis II announcement](https://survivetheark.com/index.php?/forums/topic/599024-community-crunch-256-introducing-voidwyrm-update-on-genesis-ii/).

### Official-service transition to ASA

The 2023 decision to close ASE's official network and publish saves fundamentally changed product stewardship. It preserved player-hosting continuity while ending the publisher-run persistent worlds in which some players had invested enormous time.

### Aquatica's launch is a cautionary compatibility case

Aquatica modified the base ASE branch enough that players reported broken saves/settings/mod compatibility. Snail/Studio Sirens apologized and created the preaquatica branch, later updating the DevKit and continuing compatibility/performance work. This is strong evidence for a mature moddable game's **extension-cost problem**: adding one late expansion can destabilize an ecosystem far larger than the DLC itself.

## R10 — distribution, promotion, modding and virality

ARK's initial viral premise is extremely legible: **Minecraft/Rust-style survival, but tame and ride dinosaurs**. The spectacle compresses into thumbnails and stories unusually well.

Growth channels included:

- Steam Early Access;
- console/Game Pass/platform releases;
- creator videos/streaming;
- official Community Crunch cadence;
- community creature votes and fan art;
- Steam Workshop;
- official adoption of community-made maps;
- DLC launches/events;
- private/unofficial server communities.

The mod platform is particularly important. PC Gamer's launch review regarded server customization/modding as one of ARK's greatest strengths because players could reshape grind, technology limits and genre.

Aquatica's 2025 promotion included a themed music-video tie-in and anniversary positioning. Snail also used a June 2025 publisher sale to reactivate ASE ahead of the DLC. [Snail investor release](https://investor.snail.com/news-releases/news-release-details/ark-demonstrates-robust-june-momentum-snail-games-celebrates-10).

**Interpretation:** creature acquisition is inherently creator-friendly because every tame has a premise ("we trapped a T-Rex," "our first flier died," "we bred this absurd line"). The creature is both mechanical object and visible character, making progression easy to communicate in video.

## R11 — commercial and participation context

Commercial metrics across a decade use incompatible definitions and should not be merged.

- At 1.0 launch in 2017, PC Gamer reported **5 million-plus PC owners**; GameSpot cited roughly **9 million players worldwide** before release. These are differently sourced/defined historical counts. [PC Gamer](https://www.pcgamer.com/ark-survival-evolved-has-officially-launched-along-with-a-45-season-pass/) · [GameSpot](https://www.gamespot.com/articles/e3-2017-ark-survival-evolved-full-release-date-ann/1100-6450829/).
- Studio Wildcard CEO Doug Kennedy told PC Gamer in November 2017 that ARK had sold **11 million units across platforms**. [interview](https://www.pcgamer.com/ark-survival-evolved-studio-ceo-on-early-access-reviews-and-punching-trees/).
- Snail's July 2025 Aquatica launch release claimed an ASE **install base above 92.1 million**, **3.7+ billion Steam play-hours**, and a historical **1.1 million peak Steam daily-active-user** figure. "Install base" is not equivalent to paid copies or unique lifetime purchasers; ARK has had giveaways/subscription/platform promotions. [Snail](https://snail.com/news/qnpl1wy4dhdw3rjkuc3b1e5ch2rlfx-xdn67-2cdkm-kc33l-5egm5-njmjt-rf4bc).
- Snail's June 2025 investor release says a publisher sale drove a **3.8× unit increase** and a **3,022% increase in average daily sales** versus prior 2025 months. This is campaign lift, not a lifetime demand measure. [investor release](https://investor.snail.com/news-releases/news-release-details/ark-demonstrates-robust-june-momentum-snail-games-celebrates-10).

ARK is currently sold as a paid base game with paid expansion bundles/content, free maps and an enormous free/modded ecosystem. Aquatica's Steam page still sells the DLC separately for PC.

The original official server network no longer creates a publisher operating obligation, but Workshop compatibility, store builds, community servers and Aquatica support remain live maintenance concerns.

## R12 — five independent written reviews plus current Steam feedback

Launch-era reviews evaluate 2017 ARK, not the complete 2026 ASE content set. They are especially useful for the **durable friction-versus-possibility debate**.

### 1. PC Gamer — Ian Birnbaum, September 7, 2017 — 72/100

[Full review](https://www.pcgamer.com/ark-survival-evolved-review/).

PC Gamer praises unlimited self-authored goals, creature attachment and mod/server configurability while strongly criticizing grinding, long taming clocks, brutal loss, late-game tech disparity, lag and missing/refined fundamentals. It argues ARK works better as a highly configurable platform than as one well-tuned default game.

### 2. GameSpot — Brett Todd, September 13, 2017 — 6/10

[Full review](https://www.gamespot.com/reviews/ark-survival-evolved-review/1900-6416754/).

GameSpot finds the scale/content impressive and enjoys the primal progression fantasy, but calls the experience deeply frustrating because of difficulty spikes, grind, performance and interface/system friction. The review stresses how quickly satisfying shelter/taming moments can turn into repeated death and rebuilding.

### 3. Destructoid — Joel Peterson, September 15, 2017

[Full review](https://www.destructoid.com/reviews/review-ark-survival-evolved/).

Destructoid considers ARK one of the strongest demonstrations of the survival genre's potential yet still leaves exhausted by the grind. That combination is important: content depth can be genuinely excellent while pacing makes the reviewer reluctant to re-enter it.

### 4. GamingTrend — Sean Anthony, September 19, 2017

[Full review](https://gamingtrend.com/reviews/open-the-door-get-on-the-floor-ark-survival-evolved-review/).

GamingTrend describes a much better experience with friends than alone. Death preserves survivor level but can force gear rebuilding; repeated gathering/level requirements make solo progression chore-like. It sees PvP/PvE options as a strength but the time demand as central.

### 5. CGMagazine — Mike Cosimano, August 29, 2017 — PS4, 6/10

[Full review](https://www.cgmagonline.com/review/game/ark-survival-evolved-ps4-review/).

CGMagazine says the 1.0 product still feels Early Access-like: promising mechanics and likely co-op fun are undermined by polish, multiplayer and incomprehensible/broken-feeling systems. This is PS4 launch criticism and should not be projected as a 2026 PC bug list.

### 6. Twinfinite — Zhiqing Wan, September 2017 — 3.5/5

[Full review](https://twinfinite.net/reviews/ark-survival-evolved-review/).

Twinfinite praises the scale of hunting/taming/story bosses and the sandbox once a group forms, while emphasizing the brutal first hours and enormous time commitment before accessing the most exciting technology/content. It reinforces the recurring "great destination, expensive journey" pattern.

### Current Steam feedback — September 2026

[Current Steam community/review surface](https://steamcommunity.com/app/346110/) includes September 2026 positives highlighting dinosaur/crafting identity and especially mod support, while negatives continue to criticize onboarding, bugs and technical feel.

A current positive with 220+ hours explicitly says its experience used the **Primal Fear mod**, praises the uniquely threatening early game, but says power progression eventually reduced danger and technical/loading/co-op issues remained the worst part. This is useful precisely because it labels its modded context.

A September positive with 300+ hours recommends the dinosaur/crafting/tough-mob loop but jokes that enough storage is a prerequisite—consistent with broader storage-footprint criticism.

[Current negative surfaces](https://steamcommunity.com/app/346110/negativereviews/?browsefilter=trendsixmonths) include:
- long-play accounts that call ARK a favorite game/concept while citing years of bugs/save risks;
- criticism of the 2023 official-server shutdown/ASA transition;
- complaints about very large selected-DLC install size and poor optimization;
- March–August 2026 long-play reviews that distinguish love for the core systems from distrust of technical/product stewardship.

These accounts are qualitative and self-selected. Player-posted concurrent-player numbers, developer-motive claims and allegations are not adopted as verified facts.

### Aquatica reception

Aquatica itself is a separate DLC with dramatically negative Steam reception: the Steam store showed roughly **14% positive across ~1.8k reviews** at a 2026 crawl. [Aquatica Steam](https://store.steampowered.com/app/3537070/ARK_Aquatica/).

PCGamesN reported the launch backlash centered not only on DLC quality but on the accompanying ASE update breaking mods/settings/saves for some players; the existence of the publisher's apology and preaquatica branch independently corroborates that a serious compatibility incident occurred, without treating every player report as universal. [PCGamesN](https://www.pcgamesn.com/ark-survival-evolved/aquatica-steam-reviews) · [official Steam announcement](https://store.steampowered.com/news/posts/?appids=346110&enddate=1752716291&feed=steam_community_announcements).

### Reception synthesis

**Repeated praise**
- unmatched dinosaur/creature ownership fantasy;
- satisfying primitive-to-Tek escalation;
- highly expressive bases/rosters;
- strong co-op/tribal stories;
- huge map/content/mod variety;
- creature acquisition that creates attachment and utility.

**Repeated criticism**
- default taming/breeding/resource grind;
- time-disproportionate loss;
- steep/poorly explained systems;
- long-running bugs/performance/server issues;
- enormous content/storage footprint;
- PvP power asymmetry;
- late-life product stewardship and official-server shutdown concerns;
- Aquatica compatibility/quality backlash.

The useful conclusion is not that ARK is "too big." It is that **breadth compounds operational friction**: every additional creature, map, recipe, server rule and mod can create new combinations worth playing and new states the product must maintain.

## R13 — transferable inspiration and limits for OpenLegend

These are research hypotheses, not accepted implementation requirements.

### 1. Companions become more meaningful when they change verbs

An Ankylosaurus is not "pet with +20 attack"; it changes mining. A flier changes navigation. A hauling mount changes logistics.

**Potential lesson:** creature/NPC differentiation should alter what a player can accomplish, not only damage output.  
**Limit:** highly specialized rosters can become mandatory collection checklists.

### 2. Taming can be a temporary-world event

A vulnerable unconscious tame turns an arbitrary clearing into a defensive position.

**Potential lesson:** acquisition systems can create local emergent objectives before ownership begins.  
**Limit:** unthreatened real-time waiting is not meaningful simply because it is long.

### 3. Breeding creates lineage/history from rules

Inherited stats, mutations and imprinting make offspring carry a mechanical family history.

**Potential lesson:** descendants can preserve meaningful state without authored biographies.  
**Limit:** ARK's real-time maturation demonstrates how lineage can become an unhealthy scheduling obligation.

### 4. Technology should transform the world model

The journey from hand tools to industrial forges to Tek changes range, production, defense and boss access.

**Potential lesson:** progression should unlock new relationships between systems, not just bigger numbers.  
**Limit:** too many tech tiers can invalidate the vulnerable fantasy that attracted players initially.

### 5. Rare blueprints can create economy rather than end it

A saddle blueprint becomes a reason to gather, manufacture and distribute at scale.

**Potential lesson:** discovery can create future work rather than provide one finished reward.  
**Limit:** manufacturing cost needs interesting constraints beyond sheer quantity.

### 6. Bosses can validate a whole ecosystem of preparation

ARK bosses test breeding, saddles, resource economy and cave/Artifact progression.

**Potential lesson:** climax content can ask whether earlier systems were mastered together.  
**Limit:** punishing wipes make experimentation too expensive.

### 7. World rules/rates are a first-class accessibility surface

Higher taming/breeding/gather rates can preserve system relationships while reducing real-time burden.

**Potential OpenLegend implication:** separate "strategic depth" from "hours required."  
**Limit:** too many opaque server knobs fragment expectations.

### 8. Persistent shared ownership needs governance

Tribe ranks/ownership policies prove that collaborative bases require permission models.

**Potential lesson:** if OpenLegend supports multiplayer persistent worlds, ownership/roles are gameplay and safety architecture, not admin afterthoughts.

### 9. Mod/community content can become canonical supply

Several beloved ARK maps began as mods and became official expansion maps.

**Potential lesson:** an extension ecosystem can be both experimentation pipeline and content strategy.  
**Limit:** official adoption creates maintenance/provenance obligations.

### 10. Mature extensible games need compatibility escape hatches

The preaquatica branch exists because a late update broke enough existing workflows that "current" could not be the only valid build.

**Potential lesson:** versioned world/runtime compatibility may matter more than forcing every world onto the newest feature set.  
**Limit:** supporting many historical runtimes can itself become expensive.

## R14 — source register, research route, preservation and requirement map

### Preservation result

G133 was added in the September 27 survival-expansion scope. Before writing this dossier, the existing games, mechanics, dossiers and packet-derived reference owners were checked for a dedicated ARK: Survival Evolved study; none existed. The seven-file source packet predates this addition.

This dossier therefore establishes the dedicated owner for G133 and does **not** claim packet-wide P01 reconciliation is complete. [Packet provenance](../references/packet-provenance.md) remains the global preservation boundary.

### Primary/current and mechanics sources

- **Studio Wildcard — [Community Crunch 368](https://survivetheark.com/index.php?/forums/topic/693284-community-crunch-368-asa-roadmap-update-asa-comparison-and-more/), 2023.** Primary announcement for ASE Official Network shutdown date and save plan; also contains ASA roadmap context that is deliberately not imported as ASE mechanics.
- **Studio Wildcard — [Community Crunch 382](https://survivetheark.com/index.php?/forums/topic/706043-community-crunch-382-official-server-saves-and-community-corner/), October 2023.** Primary confirmation that official ASE saves were published for self-hosting.
- **Snail Games USA — [Aquatica launch](https://snail.com/news/qnpl1wy4dhdw3rjkuc3b1e5ch2rlfx-xdn67-2cdkm-kc33l-5egm5-njmjt-rf4bc), July 15, 2025.** Primary publisher account of Aquatica scope and publisher-reported participation metrics.
- **Steam — [Aquatica store](https://store.steampowered.com/app/3537070/ARK_Aquatica/), accessed September 27, 2026.** Current DLC/platform/reception surface.
- **ARK/Steam announcements — [ASE/Aquatica update stream](https://steamcommunity.com/app/346110/allnews/), 2025–2026.** Primary operational record for preaquatica branch, compatibility fixes, DevKit work and January 30, 2026 Aquatica official-server closure.
- **Snail investor relations — [June 2025 anniversary momentum](https://investor.snail.com/news-releases/news-release-details/ark-demonstrates-robust-june-momentum-snail-games-celebrates-10).** Publisher-defined campaign sales lift; not converted into lifetime demand.
- **ARK Official Community Wiki — [Taming](https://ark.wiki.gg/wiki/Taming), [Breeding](https://ark.wiki.gg/wiki/Breeding), [Engrams](https://ark.wiki.gg/wiki/Engrams), [Building](https://ark.wiki.gg/wiki/Building), [Tribes](https://ark.wiki.gg/wiki/Tribes), [Artifacts](https://ark.wiki.gg/wiki/Artifacts), [Leveling](https://ark.wiki.gg/wiki/Leveling), [DLCs](https://ark.wiki.gg/wiki/DLCs), accessed September 27, 2026.** Maintained community technical documentation used for current ASE mechanical relationships. Pages that contain both ASA and ASE are read with their edition tabs/labels; ASA-only rows are not imported.
- **ARK Official Community Wiki — [CrossARK Transfers](https://ark.wiki.gg/wiki/CrossARK_Transfers) and [ASE server configuration](https://ark.wiki.gg/wiki/Server_configuration_%28Survival_Evolved%29), accessed September 27, 2026.** Current transfer/server-cluster mechanics and permission boundaries added during follow-up audit.
- **ARK Official Community Wiki — [Cryopod](https://ark.wiki.gg/wiki/Cryopod), [Fishing Rod](https://ark.wiki.gg/wiki/Fishing_Rod), and [Genesis Missions](https://ark.wiki.gg/wiki/Mission), accessed September 27, 2026.** Current ASE creature-storage, fishing/minigame and repeatable-mission mechanics.
- **Studio Wildcard — [Genesis II delay/final-DLC announcement](https://survivetheark.com/index.php?/forums/topic/599024-community-crunch-256-introducing-voidwyrm-update-on-genesis-ii/), February 2021.** Primary historical wording for "final DLC" of the original saga, later qualified by subsequent content.

### Production and commercial sources

- **PC Gamer — [full launch](https://www.pcgamer.com/ark-survival-evolved-has-officially-launched-along-with-a-45-season-pass/), August 29, 2017.**
- **GameSpot — [official launch](https://www.gamespot.com/articles/ark-survival-evolved-officially-launches-today/1100-6452962/), August 29, 2017.**
- **PC Gamer — [Doug Kennedy interview](https://www.pcgamer.com/ark-survival-evolved-studio-ceo-on-early-access-reviews-and-punching-trees/), November 14, 2017.** Studio-CEO account of Early Access, expansion controversy and 11m-unit milestone; company claims remain attributed.

### Independent written reviews

- **PC Gamer — [review](https://www.pcgamer.com/ark-survival-evolved-review/), Ian Birnbaum, September 7, 2017.** Full PC review read.
- **GameSpot — [review](https://www.gamespot.com/reviews/ark-survival-evolved-review/1900-6416754/), Brett Todd, September 13, 2017.** Full PC review read.
- **Destructoid — [review](https://www.destructoid.com/reviews/review-ark-survival-evolved/), Joel Peterson, September 15, 2017.** Full review read.
- **GamingTrend — [review](https://gamingtrend.com/reviews/open-the-door-get-on-the-floor-ark-survival-evolved-review/), Sean Anthony, September 19, 2017.** Full review read.
- **CGMagazine — [PS4 review](https://www.cgmagonline.com/review/game/ark-survival-evolved-ps4-review/), Mike Cosimano, August 29, 2017.** Full review read; console-specific claims kept bounded.
- **Twinfinite — [review](https://twinfinite.net/reviews/ark-survival-evolved-review/), Zhiqing Wan, September 2017.** Supplemental sixth independent review.

### Current player evidence

- **Steam Community — [current ASE surface](https://steamcommunity.com/app/346110/), [negative reviews](https://steamcommunity.com/app/346110/negativereviews/?browsefilter=trendsixmonths), accessed September 27, 2026.** Direct self-selected player testimony; modded contexts are explicitly labeled when reviewers disclose them.
- **Steam discussion — [single-player/mod/rate discussion](https://steamcommunity.com/app/346110/discussions/0/845131730817942527/), May 2026.** Community advice useful for identifying which default time costs current players choose to alter; not authoritative design documentation.
- **PCGamesN — [Aquatica launch compatibility report](https://www.pcgamesn.com/ark-survival-evolved/aquatica-steam-reviews), July 16, 2025.** Secondary report paired with publisher apology/preaquatica evidence.

### Recommended reading route

1. Read PC Gamer's 2017 review for the clearest statement of ARK as both frustrating default game and powerful customizable platform.
2. Use the official community wiki's **Taming → Breeding → Engrams/Tekgrams → Artifacts → Leveling** pages as one progression chain rather than isolated feature lists.
3. Read Wildcard's **Official Network shutdown** and **save-release** posts together; persistence ownership changed product meaning in 2023.
4. Read Aquatica's Steam/store announcement, then the July 2025 apology/preaquatica post, then the January 2026 official-server sunset. Together they show why ASE cannot be treated as "frozen in 2023."
5. Compare current Steam positives and negatives with launch reviews. Creature fantasy/modding remain loved; grind/technical stewardship remain durable criticism.
6. For OpenLegend inspiration, focus on creature-as-capability, lineage, contextual rosters, boss preparation and server-rate configurability—not ARK's literal timers.

No video scene or timestamp is represented as watched in this pass.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version boundaries | R01, including ASE/ASA, official-network and Aquatica boundaries |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 worked interactions | R05, fourteen cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reviews/player feedback | R12, six independent reviews plus current Steam/Aquatica evidence |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation/navigation | R14 |

### Explicit mechanics-inventory closure

Character creation/appearance and attribute investment; XP/levels; Engram/Tekgram progression; items/inventory/weight/quality/blueprints; weapons/armor/saddles; crafting/refining/electricity/irrigation/industrial/Tek production; traversal across land/air/sea plus Cross-ARK survivor/item/tame transfers; environmental survival; farming/cooking/kibble/fishing; combat/practical stealth/defense; taming, cryopod storage and creature commands; breeding/inheritance/mutation/imprinting; caves/Artifacts/bosses/Genesis missions and other activities; looting/death/corpse recovery/beds; resource/barter economy; Explorer Notes/canonical story; tribes/alliances/governance; wild/tamed AI; maps/biomes/expansions; building/base persistence; PvE/PvP/local/unofficial/modded cluster play; Ascension/endgame/continued sandbox are covered above. There is no conventional magic spell system, romance system or recruitable dialogue-companion party; creatures fill a different mechanical/social role.

**Research boundary:** current evidence was checked through September 27, 2026. ASE is unusually version-fragmented because mainline post-Aquatica, preaquatica, platform editions, unofficial server configs and mods can all coexist. Exact rates, timers, stack sizes, transfer rules and PvP conventions should therefore be verified against the specific server/build before implementation-level comparison.

### Follow-up audit — September 27, 2026

The second pass found the dossier's creature/building/breeding/boss coverage strong but identified three missing applicable dimensions: **Cross-ARK continuity**, structured activities/minigames, and operational cryopod logistics. CrossARK transfer now explains how survivor identity, items and tames can persist across compatible maps/server clusters; fishing and Genesis missions close the activities requirement; cryopod charge/storage/transfer consequences make creature persistence concrete. These additions remain ASE-specific and do not import ASA transfer or creature systems.
