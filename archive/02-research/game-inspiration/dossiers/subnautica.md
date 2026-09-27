# G139 — Subnautica

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Subnautica is one of the strongest survival-game examples of **progression as permission to enter a deeper world**. Oxygen, pressure, light, vehicle crush depth, batteries, food/water and creature danger are not independent maintenance meters; together they define a moving boundary around what the player can safely investigate. New equipment expands that boundary, and the hand-authored ecology/story gives every expansion a reason.

Its unusual achievement is that gathering/crafting serves curiosity instead of replacing it. The player mines because a new tank, base, Seamoth, Prawn or depth module will let them discover something they can already imagine but cannot yet safely reach.

This dossier studies the **original Subnautica**. Subnautica: Below Zero and Subnautica 2 are distinct games. Their Seatruck, Snowfox, land systems, Biomods or co-op features do not establish original-game capabilities.

## R01 — identity, versions, platforms and player promise

Unknown Worlds Entertainment released Subnautica into Steam Early Access in December 2014 and launched the PC 1.0 release on **January 23, 2018**. PlayStation 4/Xbox One versions followed in December 2018, Nintendo Switch in May 2021, mobile in July 2025 and Switch 2 in February 2026.

The player is **Ryley Robinson**, a survivor of the starship Aurora's crash on alien ocean planet 4546B. The immediate objective is survival; the larger objective becomes understanding:
- why the Aurora was destroyed;
- what happened to other survivors/earlier expeditions;
- why the planet is under quarantine;
- how to cure the protagonist;
- how to leave.

The game is first-person and fundamentally **single-player**. PC Gamer's original review explicitly listed multiplayer as none, and current platform/store profiles still describe one-player play. Popular multiplayer mods are not native capability.

### Current September 2026 original-game boundary

The largest late feature update was **Subnautica 2.0: Living Large**, released December 13, 2022. It:
- unified newer Unity/code with Below Zero;
- added the Large Room, Glass Dome and surface hatches;
- improved save performance/reliability;
- added recipe pinning;
- added UI scaling/PDA pause/flash accessibility;
- improved controls/performance;
- fixed world-streaming, vehicle and base issues.

[Unknown Worlds — Living Large](https://unknownworlds.com/en/news/subnautica-living-large-update-released).

The original then received a **new August 12, 2025 PC/console patch**, partly backporting work from the mobile port. It fixed:
- Alien Arch/Prawn state bugs;
- Prawn falling/sticking through portals;
- Leviathans flying above water in some vehicle grabs;
- Scanner Drone death-view issues;
- invalid base construction inside Cyclops;
- Repulsion Cannon/Cyclops-object issues;
- PC controller/input-system behavior.

[Unknown Worlds — 2025 patch](https://unknownworlds.com/en/news/subnautica-2025-patch).

Nintendo Switch did not receive that patch then. A later **July 21, 2026 Switch 2 update** added selectable graphics presets and several bug fixes for the Switch 2 edition. [Unknown Worlds — Switch 2 update](https://unknownworlds.com/en/news/subnautica-below-zero-switch-2-update).

Those maintenance patches do not change the original campaign into a live-content service; they demonstrate long-tail platform/support stewardship.

### Below Zero boundary

Subnautica: Below Zero is a standalone sequel/follow-up released in 2021. It has:
- a different protagonist;
- arctic regions;
- Seatruck;
- Snowfox;
- more land play;
- different story/characters.

The original 2.0 backported code and some **base pieces**, not the entire Below Zero mechanic set.

### Subnautica 2 boundary

Subnautica 2 is a separate newer game and, by 2026, has its own Early Access product/update line including optional co-op and Biomod progression. Unknown Worlds explicitly describes Subnautica 2 as single-player-first with optional co-op. None of that makes original Subnautica multiplayer.

## R02 — complete player-action and major-mechanics inventory

### Oxygen is the first exploration boundary

Underwater time is limited by oxygen.

The early loop is:
1. leave Lifepod 5;
2. dive for food/water/materials;
3. monitor oxygen;
4. return to surface or breathable interior;
5. craft better oxygen/mobility.

Better tanks increase duration, while the **Rebreather** prevents the older depth-related oxygen penalty under applicable rules.

The key design effect is that a cave can be lethal without any enemy. Getting lost is enough.

A September 2026 Steam reviewer describes precisely this: entering a mineral cave from a parked Seamoth, taking a wrong turn and drowning as oxygen expires. The fear comes from geometry + oxygen rather than scripted horror.

### Food and water

In Survival mode the player manages:
- hunger;
- hydration;
- health;
- oxygen.

Fish and flora become:
- cooked food;
- cured food;
- water;
- crafting resources.

Later farming/filtration/base systems reduce routine scarcity.

**Freedom mode** removes hunger/thirst while retaining oxygen/health/world progression. **Creative** removes much of survival/story constraint. **Hardcore** uses one life and removes low-oxygen warnings. Difficulty modes therefore separate exploration/crafting from particular survival pressures.

### Scanner and fragment progression

The handheld **Scanner** is one of the game's most important tools.

Players scan:
- fauna;
- flora;
- technology fragments;
- wreck equipment;
- alien structures;
- objects.

Scanning gives PDA databank knowledge. Multiple fragments of a technology can unlock a blueprint.

This makes wrecks/biomes simultaneously:
- lore sources;
- crafting progression;
- ecology research.

The player does not gain "research XP." Knowledge arrives from physically finding examples.

### Fabrication and recipes

The Fabricator transforms collected resources into:
- food/water;
- tools;
- electronics;
- batteries/power cells;
- tanks;
- equipment;
- vehicle components;
- advanced materials.

The Modification Station improves specific equipment/modules.

The Mobile Vehicle Bay fabricates vehicles.

Subnautica deliberately keeps recipe quantities relatively small compared with grind-heavy survival games. PC Gamer's 2018 award coverage praises the game for letting players move on to exploration rather than requiring huge resource stacks.

### Inventory

Inventory is grid/slot-based, with many items occupying one or more cells. The player must choose between:
- raw resources;
- food/water;
- batteries;
- tools;
- beacons;
- repair gear;
- expedition discoveries.

Vehicles/storage/base lockers extend capacity.

The key tension is **expedition optionality versus cargo return value**.

### Tools

Major tools include:
- Scanner;
- Survival Knife/Thermoblade;
- Flashlight;
- Repair Tool;
- Laser Cutter;
- Habitat Builder;
- Seaglide;
- Air Bladder;
- Propulsion Cannon;
- Repulsion Cannon;
- Beacon;
- Pathfinder Tool;
- Stasis Rifle;
- Fire Extinguisher.

Tools often change **what interactions are possible**, not just efficiency:
- Laser Cutter opens sealed wreck doors;
- Repair Tool restores systems;
- Habitat Builder creates breathable infrastructure;
- Seaglide extends oxygen-limited range;
- Beacon makes remembered geography explicit.

### Navigation without a world map

Original Subnautica deliberately lacks a conventional world map/minimap.

Navigation uses:
- compass;
- beacons;
- Lifepod/radio pings;
- biome landmarks;
- wreck/Aurora geometry;
- depth;
- player memory;
- vehicle/base beacons.

Destructoid specifically praised the need to mentally learn biome geography.

This creates **knowledge progression**: an experienced player can navigate a new save more effectively before crafting anything.

### Depth and pressure

The human character can dive extremely deep without a decompression simulation, but **vehicles have crush-depth limits**.

Examples:
- Seamoth base crush depth is limited and can be extended through successive depth modules;
- Prawn Suit and Cyclops similarly gain deeper operating envelopes.

Community documentation records the original Seamoth progression from 200m base to higher module tiers, with final capability reaching much deeper zones. Exact module numbers are useful operational references, but the design principle is stronger: **a vehicle upgrade turns vertical geography into progression**.

Going below crush depth damages the vehicle until it returns upward or is destroyed.

### Seamoth

The Seamoth is a small fast submersible:
- oxygen refuge;
- light;
- mobility;
- storage modules;
- sonar/defense/perimeter/upgrades depending configuration;
- limited crush depth.

It makes medium-distance exploration much safer without replacing the need to leave the vehicle.

### Prawn Suit

The Prawn is a pressure-resistant exosuit:
- walks/jumps on seafloor;
- punches;
- uses modular arms;
- drills large resource deposits;
- grapples;
- carries storage;
- operates at great depth.

It converts the player from vulnerable swimmer into heavy industrial explorer, but movement topology changes: cliffs/caves that are easy to swim through can trap or challenge a walking machine.

### Cyclops

The Cyclops is a large submarine and effectively a **mobile base**.

It includes:
- bridge/helm;
- cameras;
- sonar/upgrades;
- internal storage/buildable interior space;
- vehicle docking;
- power cells;
- fire/damage systems;
- creature threat interactions;
- depth progression.

The player can place furniture/storage/fabrication-like base objects inside within current legal placement rules.

The 2025 patch specifically prevents invalid Seabase-piece construction inside the Cyclops and fixes objects being displaced through its hull, showing how complex a mobile persistent interior became.

The Cyclops creates operational planning:
- power budget;
- noise/speed;
- route width;
- depth;
- threat avoidance;
- docked Seamoth/Prawn choice;
- carried supplies.

### Base building

The Habitat Builder creates:
- compartments;
- Multipurpose/Large Rooms;
- hatches;
- windows;
- observatories;
- foundations;
- reinforcements;
- bulkheads;
- moonpools;
- scanner rooms;
- power systems;
- storage;
- growbeds;
- Alien Containment;
- decorative/utility modules.

Living Large added Below Zero's Large Room/Glass Dome/surface hatch to the original.

### Hull integrity

Base pieces affect **Hull Integrity**:
- expansive/transparent structures can reduce it;
- foundations/reinforcements/bulkheads can increase it;
- depth adds pressure cost;
- insufficient integrity causes leaks/flooding.

This makes aesthetic expansion a structural decision.

It is not 7DTD-style arbitrary voxel collapse; it is an aggregate pressure/sealing model.

### Power

Bases require energy. Sources include:
- Solar Panels;
- Bioreactor;
- Thermal Plant;
- Nuclear Reactor.

Power controls:
- oxygen in sealed habitat;
- Fabricator;
- filtration;
- Scanner Room;
- lighting and other systems.

Solar becomes weaker with depth, encouraging different power architecture in deep bases.

### Scanner Room

The Scanner Room can locate selected nearby resource/object categories. Camera drones let the player scout remotely.

Upgrade slots improve range/speed.

This turns a base into an **information outpost**, not only a house.

### Farming

Indoor/outdoor growbeds let the player cultivate:
- edible plants;
- resource flora;
- decorative species.

This reduces repetitive food/resource trips and makes expedition-derived seeds/cuttings persistent infrastructure.

### Alien Containment

Alien Containment lets players:
- hatch eggs;
- breed some fauna;
- cultivate aquatic plants;
- observe passive versions of some creatures;
- use organisms as Bioreactor fuel if desired.

The community reference documents that captive-raised aggressive fauna are often passive toward the player even if released, with exceptions/electrical/contact effects.

This is not a full ecosystem simulator, but it gives ecology a player-owned laboratory/home dimension.

### Ecology and creature behavior

Biomes contain distinct flora/fauna communities:
- Safe Shallows;
- Kelp Forest;
- Grassy Plateaus;
- Mushroom Forest;
- Jellyshroom Cave;
- Blood Kelp;
- Lost River;
- Lava zones;
- open void/Crater Edge;
- others.

Creatures have recognizable niches/behaviors:
- Peepers and edible fauna;
- Stalkers collecting metal;
- Reefbacks as huge passive creatures;
- predators;
- filter/ambient life;
- Leviathans.

Subnautica's ecology is **authored behavioral simulation**, not an endlessly self-balancing food-web economy. Creatures can interact, hunt and respond, but the game should not be described as a scientific population simulator.

### Combat and nonviolence

The player has:
- knife;
- Stasis Rifle;
- propulsion/repulsion;
- vehicle defenses;
- Prawn attacks.

But Subnautica intentionally does not center firearms or enemy farming. Charlie Cleveland's production interviews discuss a desire for a less violent game and the discovery that **fear/unknown** could supply thrill instead.

Many large threats are better avoided than killed.

### Stealth / sound

There is no stealth skill tree or universal detection UI.

Creature avoidance depends on:
- distance;
- sight/behavior;
- vehicle noise;
- light;
- speed;
- terrain.

The Cyclops has explicit noise/creature-attention tradeoffs, making "stealth" a vehicle-operation problem.

### Radio and signals

The Lifepod radio delivers:
- survivor distress calls;
- coordinates/pings;
- story progression prompts.

Signals point toward locations without telling the player exactly what to do there.

This is a brilliant **soft quest system**: the story gives reasons to explore, then allows environmental discovery to take over.

### Aurora

The crashed Aurora is both landmark and dungeon:
- radiation initially gates approach without protection;
- the player enters through damaged geometry;
- extinguishes fire;
- repairs reactor breaches;
- scans/collects technology;
- reads survivor data;
- unlocks story/equipment.

A giant visible object becomes a midgame authored objective in an otherwise open world.

### Precursor/Architect alien sites

Alien facilities create another access hierarchy:
- key tablets;
- depth;
- environmental routes;
- story knowledge.

Their architecture contrasts with human wreckage and guides the player progressively deeper.

### Infection and cure progression

The Kharaa bacterium:
- explains quarantine;
- affects the player/world;
- ties ecology/story to the reason escape is impossible.

The cure is not an ordinary crafted medicine recipe. It requires understanding the ancient research failure and helping the Sea Emperor's offspring.

### Death and recovery

In Survival/Freedom:
- player respawns at a base/Lifepod;
- some inventory acquired since last safe point can be lost;
- placed infrastructure persists.

Hardcore makes death final for the save.

The player can therefore choose between a forgiving exploration loop and true permadeath.

## R03 — items, vehicles and composition

### Major item families

- raw minerals/metals/crystals;
- biological resources;
- food/water;
- batteries/power cells;
- electronics;
- tools;
- tanks/suits/fins;
- vehicle modules;
- base modules;
- seeds/eggs;
- story keys/tablets;
- advanced alien materials.

### Equipment composition

A diver's "build" is contextual:
- oxygen tank;
- fins;
- suit;
- gloves;
- rebreather;
- compass;
- carried tools.

There is no class/perk tree. Equipment changes what can be endured/reached.

### Vehicle modules

Vehicles have limited upgrade slots.

Examples include:
- depth;
- storage;
- hull reinforcement;
- sonar;
- efficiency;
- defense;
- specialized Prawn arms.

The important design choice is **slot scarcity**: the vehicle cannot always maximize cargo, depth, defense and utility simultaneously.

### Batteries and power cells

Tools/vehicles depend on rechargeable batteries/power cells.

This gives energy a portable logistics layer:
- charge at base;
- carry spares;
- swap in field;
- manage Cyclops/base power.

The late Ion technology changes energy density, reducing logistics after deep story progress.

### Resources are geographically meaningful

Materials are not evenly distributed:
- early copper/titanium/quartz;
- cave resources;
- deep crystals/metals;
- Lost River/Lava materials;
- creature-derived resources.

Finding a new biome can therefore solve a technology bottleneck.

## R04 — progression, economy, time and purpose

### No XP/level progression

Subnautica has:
- no character XP;
- no attribute point ladder;
- no perk tree;
- no loot rarity progression.

Progression is **capability graph + knowledge graph**:
- scan blueprint;
- gather ingredients;
- craft tool;
- reach new place;
- discover new material/story;
- unlock deeper tool/vehicle;
- repeat.

This is one of the cleanest non-RPG progression models in the genre.

### Depth is the macro progression axis

The game repeatedly asks:
**How deep can you safely go, and how long can you remain there?**

Early:
- surface/shallows;
- short oxygen loops.

Mid:
- Seamoth;
- bases;
- caves/wrecks;
- Aurora.

Late:
- Lost River;
- Prawn/Cyclops;
- deeper depth modules;
- Lava zones;
- alien facilities.

The world itself functions as a progression diagram.

### Survival chores become infrastructure

Early:
- catch fish;
- gather water materials.

Later:
- grow food;
- filtration;
- base storage/power;
- vehicles.

Good progression **retires repetitive survival chores** so attention shifts toward exploration.

### No conventional economy

There are no NPC merchants or currency during the survival campaign.

"Economy" is material/time:
- resources;
- energy;
- inventory capacity;
- oxygen;
- vehicle durability.

### Time/events

Subnautica has day/night and several timed/triggered story events. An important narrative moment can happen without pausing/teleporting the player; PC Gamer's storytelling article praises how different players saw the same event from different locations/contexts.

This makes the world feel **indifferent to the player**.

### Endgame

**Spoilers:** the player:
1. learns the quarantine weapon prevented Aurora/rescue;
2. discovers precursor research and Kharaa;
3. reaches Primary Containment Facility;
4. helps hatch Sea Emperor juveniles;
5. obtains Enzyme 42 cure;
6. disables the Quarantine Enforcement Platform;
7. constructs the Neptune Escape Rocket;
8. leaves 4546B.

The Neptune requires substantial late crafting but serves as culmination, not endless loot endgame.

Creative/free-form base building offers replay after story knowledge.

## R05 — worked interactions

### Case 1 — oxygen turns a nearby cave into a lethal maze

**Intention:** gather cave minerals.  
**Conditions:** Seamoth is parked outside, diver has limited oxygen.  
**Actions:** enter, take several turns, fail to remember route, attempt to backtrack.  
**Interaction:** geometry + oxygen create threat without enemies.  
**Result:** player may drown meters from safety.  
**Current player evidence:** a September 2026 Steam review describes exactly this kind of death as the experience that made the game memorable.

### Case 2 — scanning wreck fragments turns exploration into manufacturing

**Intention:** obtain a new technology.  
**Conditions:** blueprint is fragmented across wreck/biome finds.  
**Actions:** travel, locate fragments, scan enough examples.  
**Interaction:** exploration fills the PDA blueprint rather than granting abstract XP.  
**Result:** returning home opens a new fabrication branch.

### Case 3 — a depth module makes a known abyss newly traversable

**Intention:** follow a signal/material route below vehicle crush depth.  
**Conditions:** current Seamoth/Prawn/Cyclops depth is insufficient.  
**Actions:** gather new material, craft/upgrade module, install it.  
**Interaction:** one item changes the vertical boundary of the world.  
**Result:** an already-discovered cliff/drop becomes a new route.

### Case 4 — base windows trade beauty for structural pressure

**Intention:** build a panoramic deep-ocean observatory.  
**Conditions:** base is deep and already near hull-integrity limit.  
**Actions:** add glass/window pieces.  
**Interaction:** aesthetics reduce integrity; reinforcements/foundations/bulkheads compensate.  
**Result:** beauty has structural/resource cost.  
**Next decision:** reinforce, reduce glass or accept flooding risk.

### Case 5 — a Scanner Room changes gathering from wandering to targeting

**Intention:** find a specific scarce resource.  
**Conditions:** forward base has Scanner Room/power.  
**Actions:** select resource class, use scan/camera/pings, leave on focused route.  
**Interaction:** a base module converts local unknown space into information.  
**Result:** construction improves future exploration efficiency.

### Case 6 — Cyclops becomes an expedition supply chain

**Intention:** operate deep for a long period.  
**Conditions:** deep zones exceed safe Seamoth-only return loops.  
**Actions:** load Cyclops with food, power cells, spare resources, fabrication/storage and docked Prawn; descend.  
**Interaction:** mobile base compresses home logistics into a vulnerable vehicle.  
**Result:** deep expeditions become multi-day operations rather than short dives.  
**Limit:** losing/sticking the Cyclops can erase enormous invested time; PC Gamer's reviewer experienced a costly deep-cave immobilization.

### Case 7 — a scary creature is a route problem, not a loot pinata

**Intention:** cross Leviathan territory.  
**Conditions:** target resource/wreck lies beyond predator route.  
**Actions:** listen/observe, change depth/path, reduce Cyclops noise or use defensive escape tools.  
**Interaction:** creature behavior changes navigation.  
**Result:** avoiding the enemy is often better than killing it.  
**Lesson:** threat can enrich space without being a combat reward source.

### Case 8 — a seed from an expedition changes home logistics

**Intention:** reduce future food/resource runs.  
**Conditions:** player discovers useful plant/seed and has growbed/base.  
**Actions:** bring sample home and cultivate.  
**Interaction:** exploration converts a renewable world resource into persistent infrastructure.  
**Result:** survival maintenance decreases while the base gains identity.

### Case 9 — Aurora radiation makes equipment progression spatial

**Intention:** investigate the huge wreck visible from the start.  
**Conditions:** radiation/environmental hazards make early entry unsafe.  
**Actions:** craft protection/tools, approach later, repair reactor/clear obstacles.  
**Interaction:** a landmark is visible before it is safely usable.  
**Result:** progression feels like earning access to a remembered mystery.

### Case 10 — Alien Containment turns ecology into a home system

**Intention:** hatch/observe alien eggs.  
**Conditions:** base has containment and eggs/specimens.  
**Actions:** place eggs, wait for hatching, observe/breed/release.  
**Interaction:** creatures normally encountered as wild ecology become persistent base inhabitants.  
**Result:** scientific curiosity gains a construction purpose.

### Case 11 — a radio coordinate creates a quest without a quest log

**Intention:** investigate another survivor.  
**Conditions:** radio message gives signal/location.  
**Actions:** travel there, find Lifepod/environmental evidence, scan/loot/read logs.  
**Interaction:** the marker gets the player near content; observation explains what happened.  
**Result:** authored story becomes exploration rather than checklist completion.

### Case 12 — the Sea Emperor resolves survival, ecology and story together

**Intention:** escape the planet.  
**Conditions:** quarantine/infection prevents leaving; player has reached deepest alien facility.  
**Actions:** understand the captive creature's need, gather hatching-enzyme ingredients, hatch offspring and receive cure.  
**Interaction:** biological knowledge, exploration and alien narrative resolve the central progression gate.  
**Result:** the cure is earned by engaging with ecology rather than defeating a final combat boss.

## R06 — AI, creatures, social systems and multiplayer

### Creature individuality is behavioral, not conversational

Fauna have:
- biome preferences;
- aggression/fleeing;
- feeding/interaction patterns;
- sounds;
- sizes/movement;
- responses to player/vehicles.

The Stalker playing with metal is a memorable example because the behavior is **not purely attack/ignore**.

### Leviathans

Leviathans create territory-scale fear through:
- sound;
- size;
- grab/vehicle attacks;
- rarity;
- placement in dangerous/deep/open areas.

The player learns to recognize spaces by creatures.

### No humanoid social simulation

For most of the campaign, the protagonist is alone.

There is:
- no recruitable party;
- no romance;
- no faction reputation;
- no multiplayer;
- no settlement NPC workforce.

Human connection comes through recordings/logs and the traces of dead/missing survivors.

### Alien intelligence

The Sea Emperor is a rare direct intelligent relationship, communicated through psychic/narrative interaction rather than follower mechanics.

### Captive creature behavior

Alien Containment changes some fauna behavior and allows breeding. This is a small but meaningful example of context-dependent AI.

## R07 — art, audio, interface and feel

Subnautica's visual design makes "one ocean planet" feel like many worlds.

Biomes use:
- color;
- plant silhouettes;
- water clarity;
- terrain form;
- depth/light;
- creature profiles.

The Safe Shallows feel bright/readable; Blood Kelp/Lost River/Lava zones become progressively stranger/darker.

### Audio

Sound is one of the strongest threat systems:
- distant Leviathan calls;
- Stalker noises;
- Reefback calls;
- vehicle warnings;
- oxygen warnings;
- hull creaks;
- base leakage/fire alarms.

Game Informer praised the sound design and distant predator cues.

### Interface

The PDA contains:
- inventory;
- blueprints;
- databank;
- beacon manager;
- logs.

Living Large improved UI scaling/readability and added pinned recipes.

The interface supports deep knowledge without showing a world map, preserving geographic learning.

### Accessibility

2.0 added:
- UI scaling;
- PDA pause;
- option to disable flashes;
- subtitle/control improvements.

The 2025 input overhaul improved controllers on PC.

## R08 — story and connection to play

Subnautica is a benchmark for **hands-off authored storytelling**.

The main narrative is discovered through:
- radio messages;
- wrecked Lifepods;
- Degasi survivor bases/logs;
- Aurora;
- alien facilities;
- PDA scans;
- environmental clues.

PC Gamer's storytelling discussion praises a major event that occurs while the player retains control. Different writers saw the same event from different locations and only later realized their perspectives differed.

That is a powerful principle: **a story event can happen in the world instead of pulling the player into a cutscene theater**.

### Degasi

The Degasi survivor story creates a parallel expedition:
- surface/island refuge;
- deeper bases;
- interpersonal tension;
- progressive failure.

Their abandoned bases also teach the player technology/base possibilities.

### Kharaa / Precursors / Sea Emperor

The alien quarantine and infection create a mystery that forces deeper exploration.

The Sea Emperor sequence reframes the story from "escape a hostile planet" toward understanding the ecosystem and the failed alien containment experiment.

### Player-created story

Base locations, vehicle losses, near-drownings and Leviathan encounters create memorable personal stories around the authored arc.

## R09 — production and development

Subnautica is a major case study in **open development**.

In Unknown Worlds' October 2014 "Earliest Access" post, Charlie Cleveland says the studio:
- committed its future to a risky, unfamiliar project;
- prototyped heavily;
- considered cancelling it;
- struggled with building a massive open world in Unity;
- wanted to release early rather than spend years privately developing.

[Unknown Worlds — Earliest Access](https://unknownworlds.com/en/news/subnautica-earliest-access-state-game).

### Financial constraint drove Early Access

Later interviews say Unknown Worlds had spent its money reaching Early Access and needed the model, but then embraced how public development shaped the game.

Cleveland told PCGamesN:
- experimental builds could update multiple times per day;
- normal patches came monthly;
- Trello/work items were unusually public;
- community feedback was built directly into development.

[PCGamesN interview](https://www.pcgamesn.com/subnautica/subnautica-10-launch-survival-interview).

### Design evolved through player response

Ars/Fandom interviews preserve that early concepts leaned more toward science/terraforming and lacked enough thrill. Unknown Worlds discovered that **fear of the unknown** could provide dramatic tension without turning the game into a shooter.

This is one reason Subnautica's final combat toolset is restrained.

### Long-tail technical unification

Unknown Worlds later:
- unified Subnautica/Below Zero Unity/code through 2.0;
- partnered for console/Switch work;
- ported mobile improvements back into original;
- continued 2025/2026 maintenance.

The game therefore remained an active codebase even after sequel development.

## R10 — marketing, distribution and virality

Subnautica's growth was tightly connected to Early Access/open development.

Discovery channels included:
- Steam Early Access;
- frequent public builds;
- open Trello/developer communication;
- YouTube/streaming reaction to Leviathans/exploration;
- strong word of mouth;
- Xbox Game Preview;
- console ports;
- Epic Games Store free giveaway;
- PlayStation Play at Home;
- Switch/mobile/Switch 2 expansion.

The game is naturally shareable because its strongest moments have compact premises:
- "I went deeper than my submarine could survive";
- "I heard something in the dark";
- "I built a glass base over a thermal vent";
- "I drowned in a cave";
- "a Reaper grabbed my Seamoth."

### Epic giveaway

The Epic Games Store promotion added **4.5 million free downloads** beyond paid sales, according to 2020 reporting. That is ownership/acquisition, not paid units or active users.

### Mobile

The July 2025 mobile launch redesigned controls/UI for touch and later contributed code improvements back to PC/console. Distribution work became upstream development, not only port maintenance.

## R11 — commercial and participation context

Documented milestones:

- **January 2020:** Unknown Worlds founder Charlie Cleveland said Subnautica had sold **5.23 million paid copies** across Steam/Epic PC, PS4 and Xbox One, excluding 4.5m free Epic downloads. [Game Developer](https://www.gamedeveloper.com/business/-i-subnautica-i-has-surpassed-5-million-sales-worldwide).
- Later Unity case-study material reports **6M+ copies sold** across PC/Xbox/PlayStation before/around the Switch port era. [Unity case study](https://create.unity.com/creating-the-undersea-world-of-subnautica-case-study).
- Those older figures do not include all subsequent Switch/mobile/Switch 2 sales and should not be presented as a current 2026 lifetime total.

Subnautica is a paid single-player game, not a subscription/live-item economy.

Its longevity comes from:
- continued platform ports;
- maintenance;
- modding;
- franchise interest;
- replay/Creative/Hardcore;
- enduring Steam discovery.

## R12 — reception: five substantive reviews and current Steam feedback

### 1. PC Gamer — Philippa Warr, January 29, 2018 — 89/100

[Full review](https://www.pcgamer.com/subnautica-review/).

PC Gamer calls Subnautica a favorite game of the reviewer's recent years. It praises beautiful exploration, story freedom, biome discovery and long-term curiosity while identifying technical issues/save limitations and a costly Cyclops-stuck incident as major frustrations.

### 2. GameSpot — Brett Todd, January 29, 2018 — 9/10

[Full review](https://www.gamespot.com/reviews/subnautica-review-a-water-wonderland/1900-6416847/).

GameSpot praises enormous mysterious environments, accessibility compared with survival peers, streamlined mechanics and scenic atmosphere. Criticism includes residual scavenger-hunt grind, loading/crashes and single-save stress.

### 3. Game Informer — Elise Favis, February 6, 2018 — 8.75/10

[Full review](https://gameinformer.com/games/subnautica/b/pc/archive/2018/02/06/subnautica-game-informer-review).

Game Informer highlights rewarding progression, accessible crafting, fascinating story and excellent creature/biome/sound design. Bugs occasionally forced restarts and caused lost progress, but not often enough to overwhelm the experience.

### 4. Destructoid — Jordan Devore, January 24, 2018 — 9.5/10

[Full review](https://www.destructoid.com/reviews/review-subnautica/).

Destructoid calls it an explorer's dream and specifically praises the lack of a minimap: learning the world mentally makes exploration memorable. Criticism is limited to some unclear base/story signposting and graphical pop-in.

### 5. Push Square — Nicole Hall, December 17, 2018 — 8/10

[Full PS4 review](https://www.pushsquare.com/reviews/ps4/subnautica).

Push Square praises the beauty/terror contrast, crafting-driven exploration, story and biome diversity. It is valuable platform evidence but should not be used to infer current PC/Switch technical behavior.

### Supplemental — Nintendo Life, 2021 Switch — 9/10

[Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/subnautica) calls the game one of the great Early Access successes and praises its survival/crafting/story mixture while evaluating a later portable port.

### Current Steam evidence — September 2026

[Current Steam reviews](https://steamcommunity.com/app/264710/reviews/) remain overwhelmingly affectionate.

Visible September examples include:
- "Peak" from a long-play user;
- a player describing the horror of drowning after becoming lost in a cave;
- repeated praise for fear/beauty/world discovery.

Current criticism is less prominent on the weekly helpful surface but historically includes:
- bugs/vehicle clipping;
- inventory/scavenging;
- navigation frustration;
- performance on particular platforms.

The current 2025 patch directly fixed several long-lived vehicle/portal/Leviathan issues, so old bug complaints cannot simply be carried forward.

Steam samples are self-selected, and humorous one-line reviews are evidence of affection/culture rather than substantive mechanical analysis.

### Reception synthesis

**Praised**
- extraordinary exploration;
- hand-authored biomes;
- dread without combat focus;
- accessible crafting;
- progression through world access;
- story integrated with discovery;
- vehicles/bases;
- audio/creature design;
- low grind relative to peers.

**Criticized**
- technical bugs/pop-in/performance;
- single-save cost of bugs historically;
- resource scavenging;
- weak signposting for some progression;
- inventory/navigation friction.

The remarkable point is that critics who often dislike survival games repeatedly praised Subnautica because **survival systems serve exploration rather than become the whole objective**.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Progression can be geography

Depth modules, oxygen and tools transform reachable space.

**Potential lesson:** advancement is more tangible when it changes where/what the player can safely interact with.  
**Limit:** hard gates should be legible enough that players know what kind of capability is missing.

### 2. Knowledge is a reward

Scanning a creature or wreck produces useful PDA understanding, not XP.

**Lesson:** information can be first-class progression.

### 3. Home should retire chores

Farming/filtration/power/storage reduce early survival maintenance.

**Lesson:** progression can free attention instead of adding an equal number of new bars.

### 4. Threat does not need to be a loot source

Leviathans are valuable because they make places frightening.

**OpenLegend relevance:** creatures can define territories/behavior without every encounter ending in combat/rewards.

### 5. Vehicles can be nested scales of embodiment

Diver → Seamoth → Prawn → Cyclops each changes:
- speed;
- vulnerability;
- depth;
- cargo;
- geometry.

**Lesson:** traversal progression is richer when different vehicles produce different relationships to space.

### 6. A base can be an information system

Scanner Room turns housing into perception.

**Lesson:** settlements should expand cognition/logistics, not only store items.

### 7. Story events can happen without confiscating agency

Subnautica's major early event proceeds while the player remains wherever they chose to be.

**Lesson:** world events can preserve viewpoint and produce unique memories.

### 8. The environment can be the progression UI

Light/temperature/fauna/depth communicate "you are going somewhere new" better than a zone-level number.

### 9. Open development can discover a game's emotional core

Unknown Worlds did not begin with the final "terror of the unknown" formula.

**Lesson:** exposed experimentation can reveal which systems create the desired experience.  
**Limit:** Early Access only works when iteration/communication/support are credible.

### 10. A sequel should not contaminate the rules of the original

2.0 intentionally backported selected Below Zero technology/base pieces, not Seatruck/Snowfox/co-op.

**Research lesson:** shared code/franchise does not mean shared current mechanics.

## R14 — sources, preservation, reading routes and requirement map

### Preservation result

G139 was added in the September 27 survival expansion. Existing game/mechanics/dossier owners and the seven packet-derived reference owners were checked; no dedicated Subnautica per-game dossier existed before this pass.

Subnautica-related comparison mentions elsewhere do not discharge G139.

The seven-file packet predates this expansion. Global P01 preservation remains pending and is not claimed here.

### Primary/current sources

- **Unknown Worlds — [Living Large / Subnautica 2.0](https://unknownworlds.com/en/news/subnautica-living-large-update-released), December 13, 2022.** Primary current feature/backport/save/accessibility baseline.
- **Unknown Worlds — [2025 patch](https://unknownworlds.com/en/news/subnautica-2025-patch), August 12, 2025.** Primary PC/console maintenance/input/vehicle/portal fixes.
- **Unknown Worlds — [Switch 2 update](https://unknownworlds.com/en/news/subnautica-below-zero-switch-2-update), July 21, 2026.** Primary platform-specific latest patch.
- **Unknown Worlds — [Earliest Access state](https://unknownworlds.com/en/news/subnautica-earliest-access-state-game), October 31, 2014.** Primary development-risk/prototype/open-world history.
- **Unknown Worlds — [2022 code/tech-debt plan](https://unknownworlds.com/en/news/an-update-on-our-subnautica-and-below-zero-plans), June 15, 2022.** Primary code-unification/backport rationale.
- **Unknown Worlds — [mobile announcement](https://unknownworlds.com/en/news/subnautica-mobile-announce), May 27, 2025.** Primary mobile port/UI/platform scope.
- **Unknown Worlds — [Subnautica 2 clarification](https://unknownworlds.com/en/news/subnautica-community-letter), July 3, 2025.** Primary sequel multiplayer/monetization boundary; used only to prevent importing sequel co-op.
- **Subnautica Wiki — [Depth Levels](https://subnautica.fandom.com/wiki/Depth_Levels), [Upgrade Modules](https://subnautica.fandom.com/wiki/Upgrade_Modules), [Fauna](https://subnautica.fandom.com/wiki/Fauna), [Alien Containment](https://subnautica.fandom.com/wiki/Alien_Containment_%28Subnautica%29), [Seamoth](https://subnautica.fandom.com/wiki/Seamoth), accessed September 2026.** Detailed community technical references; version-specific numbers are subordinate to the maintained current final game.

### Production/commercial sources

- **PCGamesN — [community/open-development interview](https://www.pcgamesn.com/subnautica/subnautica-10-launch-survival-interview), January 2018.** Direct Charlie Cleveland quotes on public builds/Trello/community influence.
- **Ars Technica — [Charlie Cleveland extended interview](https://arstechnica.com/video/watch/subnautica-director-charlie-cleveland-extended-interview/).** Developer retrospective on design evolution.
- **Game Developer — [5.3m sales](https://www.gamedeveloper.com/business/-i-subnautica-i-has-surpassed-5-million-sales-worldwide), January 15, 2020.**
- **Unity — [6m+ platform case study](https://create.unity.com/creating-the-undersea-world-of-subnautica-case-study).** Later cross-platform commercial/porting case; platform/vendor marketing source, so claims remain attributed.

### Independent reviews

- **PC Gamer — [review](https://www.pcgamer.com/subnautica-review/), January 29, 2018.**
- **GameSpot — [review](https://www.gamespot.com/reviews/subnautica-review-a-water-wonderland/1900-6416847/), January 29, 2018.**
- **Game Informer — [review](https://gameinformer.com/games/subnautica/b/pc/archive/2018/02/06/subnautica-game-informer-review), February 6, 2018.**
- **Destructoid — [review](https://www.destructoid.com/reviews/review-subnautica/), January 24, 2018.**
- **Push Square — [PS4 review](https://www.pushsquare.com/reviews/ps4/subnautica), December 17, 2018.**
- **Nintendo Life — [Switch review](https://www.nintendolife.com/reviews/switch-eshop/subnautica), May 11, 2021.** Supplemental later-port evidence.

### Current player evidence

- **Steam — [current reviews](https://steamcommunity.com/app/264710/reviews/), accessed September 27, 2026.** Direct dynamic/self-selected testimony.
- **PC Gamer — [hands-off storytelling discussion](https://www.pcgamer.com/subnauticas-hands-off-approach-to-storytelling-is-brilliant/), February 9, 2018.** Multi-writer critical analysis, not counted as an additional independent review.
- **PC Gamer — [2018 Survival Game award discussion](https://www.pcgamer.com/survival-game-award-2018-subnautica/).** Editorial retrospective on grind/exploration/horror.

### Recommended reading route

1. Read PC Gamer, GameSpot and Destructoid to understand why non-survival-game fans embraced Subnautica.
2. Read the 2014 Unknown Worlds post and 2018 PCGamesN interview to see how public development reshaped the project.
3. Inspect the Depth/Upgrade/Seamoth references as one system: equipment changes reachable vertical geography.
4. Read the Living Large patch to understand what was actually backported from Below Zero.
5. Read the 2025 patch before repeating old vehicle/portal bug claims as current.
6. Sample current Steam reviews for the enduring "beauty + dread + personal accident" appeal.
7. Avoid R08/R05 Case 12 if preserving major story spoilers.

No video scene or timestamp is represented as watched.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version | R01 |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 interactions | R05, twelve cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reviews/player feedback | R12, six review bodies + current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation | R14 |

### Explicit mechanics-inventory closure

Fixed protagonist; no character creation/classes/attributes/XP/perk tree; oxygen/food/water/health; items/grid inventory/equipment; tools/fabrication/modification; no spell/magic system; swimming/Seaglide/Seamoth/Prawn/Cyclops; environmental/scanner/resource interactions; farming/cooking/filtration/Alien Containment; limited avoidance-focused combat/practical stealth; wreck/fragment/material loot; death/recovery/Hardcore permadeath; no currency/trading economy; authored environmental/radio/PDA story; no romance/companions/factions/multiplayer; authored fauna/ecology behaviors; hand-authored ocean biomes/depth; radio signals/wrecks/alien facilities as quest/event structure; extensive Seabase/power/hull integrity/Scanner Room management; single-player modes; and cure/Neptune ending plus Creative/base replay loops are covered above.

**Research boundary:** original Subnautica remains a separate single-player game despite code backports, sequels and community mods. Current maintenance evidence is the August 2025 PC/console patch plus July 2026 Switch 2 platform patch. Specific community-wiki values are used for operational understanding and not treated as developer intent.
