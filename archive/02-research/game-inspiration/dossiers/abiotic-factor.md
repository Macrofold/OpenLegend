# G148 — Abiotic Factor

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Abiotic Factor is most useful as a study of **survival through scientific improvisation inside an authored place**. Instead of spawning naked in a wilderness and converting trees into an abstract tech tree, players begin as specialized researchers trapped inside the GATE Cascade Research Facility. Office furniture becomes raw material, wall outlets become infrastructure, nighttime power outages make batteries meaningful, portal worlds become renewable expeditions, strange entities become pets or research problems, and skills improve through doing. The strongest loop is: **understand a place → repurpose it → invent around a constraint → open another impossible place**.

## R01 — identity, scope, current version and player promise

New Zealand studio **Deep Field Games** develops Abiotic Factor and **Playstack** publishes it. The game entered Steam Early Access on **May 2, 2024** and reached **1.0 on July 22, 2025**, simultaneously expanding from PC to PlayStation 5 and Xbox Series X|S. The current Steam product supports solo play and up to six-player co-op, including cross-platform multiplayer. [Steam](https://store.steampowered.com/app/427410/Abiotic_Factor/) · [PlayStation launch context](https://www.pushsquare.com/news/2025/07/this-new-ps-plus-extra-game-is-available-to-download-and-play-now).

The version boundary is important because the game continued receiving substantial free content after 1.0:

- **1.0 / Cold Fusion — July 22, 2025.** Completed the main release arc and added the late-game Residence/Praetorium-era content, upgrades, expanded base assaults, trading and other final-release systems.
- **Community Update #3 / 1.1 — November 3, 2025.** Added further content/QoL and challenge options including **Hardcore** and **Iron Mode**.
- **1.2 — December 2025.** Seasonal/community content and refinements.
- **Cosmic Companions / 1.3 — May 4, 2026.** Reworked pets into a much deeper taming/growth/field-companion system, added chemistry, and added the *Voices of the Void* crossover portal world Dunkeltaler Forest. [Official-wiki changelog copy](https://abioticfactor.wiki.gg/wiki/1.3.0_Cosmic_Companions_Update).
- **Community Update #4 / 1.4 — July 13, 2026.** Anniversary update with new devices, gear, pets, Pet Pointer commands, perks, foods, crops and broad polish. The newest released build found in this audit is **Hotfix v1.4.0.28206 (July 27, 2026)** on Steam, PS5 and Xbox/PC App. It fixes pets, decorating, cooking and related issues; no later shipped patch was located before September 27. [Hotfix](https://steamcommunity.com/app/427410/discussions/7/574921277455785829/) · [current announcement stream](https://steamcommunity.com/app/427410/announcements/).

Two future boundaries must remain explicit on September 27, 2026:

1. **Entropic Break**, a paid story expansion, was originally positioned for late 2026 but on **September 16, 2026** Deep Field delayed it to **Q1 2027** to avoid cutting scope/quality. It is not released content. [Development update](https://store.steampowered.com/news/posts/?enddate=1789610633&feed=steam_community_announcements).
2. **Community Update #5 / official mod support** is announced and close, with an integrated mod.io browser and Windows Mod Editor planned across PC/PS5/Xbox. On September 25 the team previewed it, but it has **not shipped yet**. [Current Steam news](https://steamcommunity.com/app/427410/allnews/).

The current paid DLC boundary is also different from a normal power expansion:

- **Supporter’s Pack** — paid cosmetic/support content plus a build-focused Home World.
- **Temple of Stone — November 3, 2025.** A paid **Home World** primarily for base building/exploration/cosmetics. The server host must own it; other players on that server can enter the location without owning the DLC. [Steam DLC](https://store.steampowered.com/app/4026970/Abiotic_Factor__Temple_of_Stone/).
- **Entropic Break** — future paid story expansion, not yet released.

The player's promise is intentionally anti-power-fantasy at first: you are a scientist on your first day at a disastrous underground research complex, not a super-soldier. The opening hours are about scavenging cafeterias/offices, making absurd tools from institutional junk, finding toilets and water, learning the facility's power schedule, and surviving creatures/hostile forces with intellect and improvisation. Established play develops into advanced science weapons, portal expeditions, vehicles, automated defense, specialized skills, trading, pets, chemistry and increasingly strange sectors.

## R02 — player actions and major mechanics

### Character appearance, Jobs and Traits

Character creation begins with a **Job** and **Traits**. Appearance is deliberately separate: the player's visual presentation can be changed from the main menu without changing the character build. Jobs provide starting skill levels, XP bonuses, trait-point budgets and sometimes forced traits or starting equipment; examples include **Lab Assistant**, **Somatic Gastrologist** and **Paratheoretical Physicist**. [Character Creation](https://abioticfactor.wiki.gg/wiki/Character_Creation) · [Jobs](https://abioticfactor.wiki.gg/wiki/Jobs).

The initial choice is meaningful but not permanently class-locked. After reaching Cascade Laboratories, **IS-0017 / the Amnesia Threshold** allows the player to reselect Job **and Traits**, resets all Skills to level 3 and does not re-grant starting gear; recipes, journal entries and compendium knowledge persist. [IS-0017](https://abioticfactor.wiki.gg/wiki/IS-0017).

This is a strong separation between:
- **appearance** — freely revisitable presentation;
- **background build** — Job/Traits that can later be reset at real cost;
- **lived expertise** — use-grown Skills that are partially erased by that respecialization.

Jobs are therefore a head start and identity/history, not a permanent tank/healer/DPS class.

### Traits create explicit strengths and handicaps

Traits are selected at character creation. Positive traits cost points; negative traits can refund/generate points and introduce real drawbacks. Job choice determines the starting trait-point budget and may force some traits.

This produces scientists who can be physically/socially/comically different before any gear exists. The player is not simply choosing "+10% damage"; they can decide how much inconvenience to accept in exchange for another capability.

### Skills improve through doing

Abiotic Factor has **no single global character level or Strength/Dexterity-style attribute-point sheet**. Skills gain XP through relevant behavior and unlock perks at thresholds. Jobs/Traits establish initial asymmetry while Health, Stamina, carry weight and other derived capacities are affected by traits, equipment, statuses and skill perks rather than manually allocated level-up points. The current skill set spans combat and ordinary survival/research activities such as:

- Blunt Melee;
- Sharp Melee;
- Throwing;
- Accuracy/ranged use;
- Reloading;
- Sneaking;
- Strength;
- Fortitude;
- Sprinting/stamina-related activity;
- Cooking;
- Agriculture;
- Fishing;
- Construction;
- Crafting/repair/medical-adjacent actions as defined by current perk tracks.

The exact list/perk thresholds have evolved, but the stable principle is use-based growth. The official wiki describes Sneaking, for example, as improving detection delay through actual sneaking and rewarding increasingly strong stealth perks; throwing eventually gains trajectory/utility perks rather than being only a damage stat. [Skills/mechanics](https://abioticfactor.wiki.gg/wiki/Mechanics) · [skills example](https://abioticfactor.wiki.gg/wiki/Sharp_Melee).

This structure supports identity through behavior: the person who actually cooks for the group becomes the better cook.

### Needs are deliberately mundane and embodied

The core survival needs include:

- **Hunger**;
- **Thirst**;
- **Fatigue/sleep**;
- **Continence/toilet need**;
- **Health**, tracked with bodily injury/status detail;
- **Stamina**.

Environmental/status pressures can add temperature, radiation/contamination-like hazards, bleeding, illness and other sector-specific problems.

Director Geoff "Zag" Keene described the design goal as avoiding a wall of abstract bars and instead making the player **feel** the needs through audiovisual/behavioral cues. PC Gamer's 2024 interview records this as a reaction against survival games the team found grindy and boring. [PC Gamer interview](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-interview-survival-immersive-sim/).

Continence is particularly instructive: toilet use is mechanically silly, but the humor makes a mundane bodily need memorable instead of pretending the scientist is a frictionless crafting cursor.

### Survival actions have minigames

Current mechanics include minigames for activities such as:

- recipe research;
- sleeping;
- defecation;
- fishing;
- exercise-related actions.

These are small interactions rather than deep standalone games, but they give routine needs texture. Sandbox settings can disable or alter some of them, including the research minigame. [Mechanics](https://abioticfactor.wiki.gg/wiki/Mechanics) · [Sandbox Settings](https://abioticfactor.wiki.gg/wiki/Sandbox_Settings).

### Resource acquisition is scavenging and dismantling, not tree punching

The facility is full of authored objects:
- desks;
- filing/storage furniture;
- computers;
- phones/electronics;
- pipes;
- cafeteria equipment;
- vending-machine goods;
- office supplies;
- security hardware.

Players dismantle or scavenge those objects for components. A CRT or office device can be more valuable as electronics than as scenery. This makes the environment an **inventory of potential affordances**.

The game can still have renewable/material sources, farming and portal-resource loops, but the opening fantasy remains "scientist repurposes a workplace," not "settler clears a forest."

### Recipe learning and research

Recipes can be learned through:

- acquiring/interacting with materials;
- story/progression;
- skill progression;
- explicit **Research Minigame** steps for recipes that require investigation.

The discovery structure is important because the player often finds an object before knowing what it can become. Ideation/research turns inventory acquisition into hypothesis.

### Crafting grows from office-trash absurdity to high science

Early recipes intentionally look improvised:
- desk/furniture parts;
- tape/office supplies;
- crude melee weapons;
- makeshift armor;
- batteries/power strips;
- simple traps.

Progression eventually yields:
- advanced ranged/science weapons;
- electronics;
- automated base defenses;
- charging/power systems;
- vehicles/support equipment;
- specialized portal/anomalous tools;
- chemistry.

The transition communicates competence without turning the protagonist into a generic military hero.

### Repair, salvage and true item upgrading

Durability is not only a replacement tax. Players can repair many items with Duct Tape or at the **Repair and Salvage Station**, which can also break unwanted items back into useful materials. [Repair/Salvage](https://abioticfactor.wiki.gg/wiki/Repair_and_Salvage_Station).

By 1.0, the **Enhancement Bench** adds genuine upgrades/refits: current weapons, tools and armor with upgrade paths can be transformed into stronger or functionally changed variants; Overworld firearms can also have biometric locks removed there. Cold Fusion added multiple armor/item upgrades and visibly marks upgradeable items. [Enhancement Bench](https://abioticfactor.wiki.gg/wiki/Enhancement_Bench) · [Cold Fusion 1.0](https://abioticfactor.wiki.gg/wiki/1.0.0_Major_Update:_Cold_Fusion).

Current Chemistry adds another equipment-composition layer: weapon **Coatings** apply temporary/special effects and persist through Enhancement-Bench upgrades, while tinctures provide character buffs/treatments. [Chemistry](https://abioticfactor.wiki.gg/wiki/Chemistry).

### Cooking is a full skill and production path

Cooking uses pans, pots, stoves and later equipment. Soups require water and ingredient combinations; higher Cooking skill improves capability/quality and unlocks further methods such as advanced baking equipment. [Cooking](https://abioticfactor.wiki.gg/wiki/Cooking).

This can become a genuine co-op profession because one player who invests in food preparation saves everyone else's exploration time and turns otherwise awkward ingredients into reliable buffs/sustenance.

### Farming

Seeds can be planted in garden plots, watered and harvested over in-game days; crops differ in whether they regrow or require replanting. Later updates expand crops and gardening infrastructure. [Mechanics](https://abioticfactor.wiki.gg/wiki/Mechanics).

Farming converts a hostile research complex into a domestic environment without requiring outdoor acreage.

### Power gives base location and time meaning

Facility outlets supply electricity, but **normal facility power goes out at night**. Batteries connected during powered hours store energy and discharge when the grid goes down.

That creates a wonderfully grounded progression loop:
1. find a useful room/outlet;
2. establish a base;
3. discover that the refrigerator/workbench/defenses fail at night;
4. build batteries and power distribution;
5. prioritize which devices deserve stored power.

Current mechanics explicitly note that high-draw devices such as refrigerators consume more stored energy than light workstations. [Energy](https://abioticfactor.wiki.gg/wiki/Energy).

Electricity therefore feels like a property of place, not an abstract mana bar.

### Bases repurpose the facility rather than replace it

Players generally settle **inside existing authored architecture**. Deployables, barricades, furniture, storage, crafting benches, lights, defenses and utility objects turn cafeterias, offices, security rooms or other spaces into homes.

Some structures can be built, but the fantasy is renovation/occupation rather than erecting a new city from foundations.

A powered **Crafting Bench** also interacts with local world behavior and becomes a functional anchor for the base.

### Assault events make the base defensible

The facility periodically generates **Assault Events** such as Portal Storms or enemy raids. The game warns players before the event; enemies then spawn near the selected Crafting Bench and attack players/base structures on their way in.

Defenses can include:
- barricades;
- Chopinators;
- Tesla/laser/disc and other later turrets;
- specialized defenses against particular threats.

[Assault Events](https://abioticfactor.wiki.gg/wiki/Assault_Events) · [Base Defense](https://abioticfactor.wiki.gg/wiki/Base_Defense_Guide).

Unlike a fixed nightly horde game, assaults are intermittent pressure against a base the player has embedded in authored space.

### Combat: weak scientists become inventive fighters

Combat includes:
- blunt and sharp melee;
- thrown weapons;
- shields/blocking;
- bows/crossbow-like improvised ranged tools;
- conventional firearms acquired later;
- scientific/energy weapons;
- explosives;
- traps;
- automated defenses;
- environmental manipulation.

Weapon durability matters. At zero durability a weapon becomes much less useful until repaired. Field repair with duct tape can keep some equipment alive; repair stations provide more efficient/specialized repair. [GATE-101 mechanics](https://abioticfactor.wiki.gg/wiki/Gate-101).

The game deliberately allows "bad fighter, good scientist" solutions: trap a hallway, funnel an enemy into a machine, make a weapon out of things that should never be weapons.

### Armor, inventory and carried load

The player inventory is split into dedicated **Armor & Gear**, hotbar and main-inventory areas. Main pockets start at 12 slots; backpacks add slots and can reduce carried-weight impact. Dedicated gear slots include headlamp/goggles, head/arm/chest/leg armor, off-hand armament, trinkets, backpack and companion-pet support. [Inventory](https://abioticfactor.wiki.gg/wiki/Inventory).

Armor protects the specific body part it covers, degrades with damage and can trade protection/resistance against movement weight. Trinkets supply passive or utility effects rather than acting as cosmetic collectibles only. [Armor and Gear](https://abioticfactor.wiki.gg/wiki/Gear_item).

Carry weight itself feeds movement/stamina penalties and even Strength XP in some encumbered states. Inventory therefore links object choice to character progression, not just storage convenience. [Mechanics](https://abioticfactor.wiki.gg/wiki/Mechanics).

### Stealth is a real skill, not just crouching

Sneaking improves enemy detection behavior and unlocks perks such as faster crouched movement, avoidance of certain traps and stronger unaware-enemy attacks. This means stealth can become a character specialty through actual repeated sneaking. [skills example](https://abioticfactor.wiki.gg/wiki/Sharp_Melee).

### Enemies are different kinds of problems

Threats include:
- alien/anteverse creatures;
- anomalous entities/IS objects;
- hostile human forces;
- security/containment robots;
- large or unkillable/temporarily resistible threats;
- portal-world-specific enemies;
- base assault forces.

The strongest enemy encounters often require understanding a rule rather than only increasing DPS.

Enemies also support a concrete **loot/research** loop. Corpses can be harvested with sharp tools for entity-specific remains/materials; the result depends on the target and harvesting tool. Equipment, key items, ID cards, anomalous drops, portal materials and objective rewards then feed research/crafting/progression. [Mechanics](https://abioticfactor.wiki.gg/wiki/Mechanics) · [Compendium Entries](https://abioticfactor.wiki.gg/wiki/Compendium_Entries).

### Vehicles and transport

Facility traversal eventually includes:
- **security carts** and other driveable vehicles;
- **forklifts**;
- later vehicle classes;
- **trams** on fixed facility routes;
- teleport/portal infrastructure.

Vehicles matter because the facility is one continuous, shortcut-rich authored world where hauling materials and revisiting older sectors are recurring activities.

### Portal Worlds are authored dungeons and renewable resource zones

The GATE facility contains portals to **Anteverses / Portal Worlds**. Current examples range from required progression locations such as Flathill, Voussoir, Canaan and the Praetorium to optional worlds such as Dunkeltaler Forest and the Royal Range.

Portal Worlds reset resources on a schedule, making them reusable material/exploration loops while the main facility/base remains persistent. [Portal Worlds](https://abioticfactor.wiki.gg/wiki/Portal_World).

This elegantly solves survival-world depletion without making the primary facility randomly regenerate every desk.

### Home Worlds are a separate cozy/building category

Current Home Worlds such as Torii and Temple of Stone are primarily intended as alternate base-building spaces and are separated from main progression portal worlds. Most are DLC-linked. [Portal/Home Worlds](https://abioticfactor.wiki.gg/wiki/Portal_World).

This prevents a cozy paid building environment from being confused with mandatory story progression.

### Trading

Current 1.0+ systems include **NPC traders** and machine-style exchanges. Fixed and traveling traders can exchange specific items, while quantum exchangers provide deterministic exchanges. [Trading](https://abioticfactor.wiki.gg/wiki/Trading).

The economy is barter-like and item-specific rather than a universal gold market.

Traders are authored service actors rather than members of a simulated player market: they offer fixed/exchange-specific value propositions, and the game has no auction house or universal coin ladder that displaces scavenging, skills or crafting.

### Pets / companions

**Cosmic Companions** transforms earlier pet novelty into a more substantial system:

- some creatures can be pacified/tamed;
- feeding/raising can improve them;
- one can occupy a Companion slot;
- companions can follow/fight;
- equipped companions become critically wounded rather than permanently dying;
- unequipped/unprotected pets can still die;
- current 1.4's **Pet Pointer** gives direct commands such as attack, move, hold and recall.

[Pets](https://abioticfactor.wiki.gg/wiki/Pets) · [1.4](https://steamdb.info/patchnotes/23174881/).

This is a major late-game shift from "weird creature as enemy" to "weird creature as relationship/capability."

### Chemistry

The 1.3-era chemistry system adds combination/reaction play to the scientist fantasy. It is not simply another crafting station: the thematic goal is that experiments and material properties can produce useful or dangerous outcomes.

The forthcoming official mod system explicitly plans to expose chemistry items/recipes to creators, but those mod APIs are future as of this dossier.

### Difficulty, Hardcore and Iron Mode

World **Sandbox Settings** can change:
- resource/needs rates;
- skill progression;
- enemy pressure;
- death penalties;
- inventory size;
- research minigames;
- furniture destruction;
- various survival constraints.

Current settings also expose **Hardcore/Iron Mode** concepts. Iron Mode is tied to harder rules and can restrict normal safety nets such as recipe sharing/health regeneration. [Sandbox Settings](https://abioticfactor.wiki.gg/wiki/Sandbox_Settings).

That makes "Abiotic Factor difficulty" a world-law configuration, not one universal set of punishments.

### Useful absences

Abiotic Factor has no:
- conventional global XP level or manually allocated RPG attribute points;
- rigid MMORPG class roles;
- character spellbook/mana-school progression (anomalous science, chemistry and special gear provide power-like effects instead);
- romance/companion-affinity system;
- recruitable **human** adventuring party with dialogue/relationship arcs;
- player-run auction-house economy;
- freeform city/settlement population management;
- joinable faction reputation/diplomacy campaign;
- procedurally generated main facility;
- default competitive PvP endgame.

Stealth is **present** as a use-grown Sneaking skill, and nonhuman pets are genuine companions. The main campaign remains cooperative PvE/exploration.

## R03 — items, entities and composition

### Office junk is contextual material, not generic scrap

A stapler, monitor, desk leg, phone, magazine, duct tape or battery can be:

- directly useful;
- dismantled;
- a recipe ingredient;
- a temporary weapon;
- repair material;
- base decoration.

The important lesson is that the object retains enough identity to be memorable even when it enters a crafting chain.

### A scientist build is compositional

A character has no global RPG level. Their operational build composes background and use-history with:
- Job and Traits;
- use-grown Skills/perks;
- head/arm/chest/leg armor and other Gear slots;
- backpack/weight budget;
- hotbar weapons/tools and off-hand;
- trinkets;
- upgraded/refitted equipment;
- chemistry coatings/tinctures;
- food/status buffs;
- companion pet;
- current anomalous equipment;
- group role.

There is no moment where "choose Scientist Level 20 class specialization" replaces the embodied history of what the player actually did. Even changing Job/Traits through IS-0017 deliberately resets skill history rather than pretending background and practiced expertise are the same state.

### Power network is a composed object

A working base power system can include:

- facility outlet;
- splitters/power distribution;
- batteries;
- charging stations;
- refrigerators;
- crafting/workstations;
- lights;
- defenses.

The same base can function perfectly at noon and collapse operationally at night if storage was undersized.

### Anomalies can be enemies, objects, knowledge or companions

Interdimensional/anomalous content has several relationships:
- dangerous entity;
- environmental rule;
- collectible/research subject;
- material source;
- portal-access context;
- tameable companion;
- story evidence.

This is stronger than an "alien loot category" because one ontology feeds many mechanics.

## R04 — progression, economy, time and failure

### Early → middle → late play

**Early**
- choose job/traits;
- scavenge Office Sector;
- learn food/water/toilet/sleep;
- build crafting bench/basic base;
- survive night power loss/security threats;
- improvise simple gear.

**Middle**
- reach Manufacturing/Labs/Security/Hydroplant-style regions;
- improve power/storage;
- use vehicles/trams;
- deepen farming/cooking;
- improve skill perks;
- raid portal worlds;
- build stronger defenses/weapons;
- use specialized traders and anomalous tools.

**Late / 1.0**
- Reactors/Residence/Praetorium-era story;
- high science equipment/upgrades;
- complex enemy/resource loops;
- broader portal worlds;
- endgame base optimization;
- post-1.0 pets/chemistry/community additions.

### Skill growth is character progression

The player gets better primarily because they **performed the work**. That means two people on the same server can naturally diverge:
- one is the group's cook/farmer;
- one is construction/strength;
- one specializes in ranged weapons;
- another sneaks/explores.

This produces social roles without requiring an explicit party-composition screen.

### Knowledge is progression too

The facility is fixed/handcrafted enough that players learn:
- tram/shortcut routes;
- safe base rooms;
- outlet locations;
- enemy rules;
- portal-resource loops;
- keypad/access progression;
- where unusual resources can be farmed.

A second playthrough is materially easier even before the scientist has gained a single skill level.

### Death and recovery

Current default death behavior:
- the main inventory is left in a **corpse/death container** at a safe/recoverable position;
- hotbar/equipped categories can be kept under default rules;
- retained durability takes a penalty;
- the player can respawn at options such as cafeteria, assigned bed, portal-world entrance or configured check-in points;
- a critically wounded state allows multiplayer allies to revive the player before death, while solo play skips that rescue window.

[Death](https://abioticfactor.wiki.gg/wiki/Death).

Sandbox settings can make death gentler or dramatically harsher, including loss of all items or item destruction.

This supports co-op rescue while avoiding a universal "drop everything into the void forever" penalty.

### Time and nightly rhythm

Night matters because:
- facility power can shut off;
- security/enemy behavior can change;
- cold/darkness increase;
- batteries become active infrastructure;
- base assaults often occur around night cycles.

Unlike a wilderness day/night system, the cycle is experienced through **institutional systems failing after hours**.

### Economy

There is no universal coin-driven marketplace. The effective economy is:
- components;
- food/water;
- electricity;
- batteries;
- durability;
- rare enemy/portal drops;
- skill time;
- trader-specific barter inputs;
- storage/logistics.

The value of a resource depends heavily on what the current science/crafting problem requires.

The **Enhancement Bench** gives late equipment another sink/return loop: certain weapons, tools and armor can be upgraded/refitted rather than discarded, and Chemistry coatings can further modify weapon behavior. This preserves some attachment to favored equipment instead of making every tier a clean replacement.

### Renewable portal worlds solve depletion

Main-facility furniture/resources can be finite or inconvenient. Portal Worlds reset on schedules, allowing resource replenishment without erasing the player's facility/base history.

This is a clean split between:
- **persistent authored home/world**;
- **renewable expedition layer**.

### Post-story purpose

After main-story completion, players can continue:
- base building/decoration;
- skill growth;
- pet collection/training;
- portal-world farming;
- advanced crafting;
- Sandbox/Hardcore/Iron runs;
- Home Worlds;
- current community-update content.

The planned Entropic Break DLC and official mod support will broaden this later, but neither is current September-27 evidence.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations from current documented systems.

### Case 1 — the office outlet becomes a survival resource

**Intention:** turn a cafeteria into a permanent home.  
**Conditions:** nearby powered outlet, fridge and crafting equipment.  
**Actions:** connect devices; daytime base works.  
**Interaction:** facility grid shuts off at night; refrigerator/crafting/defenses lose power.  
**Result:** build charged batteries and prioritize high-draw devices.  
**Next decision:** add more storage capacity or accept that some equipment goes dark.  
**Lesson:** authored architecture can make electricity a spatial survival problem.

### Case 2 — dismantle comfort to create capability

**Intention:** craft an electronic device without the needed components.  
**Conditions:** office is full of computers/furniture but inventory has little raw "ore."  
**Actions:** dismantle/scavenge authored objects.  
**Interaction:** destroying a useful/atmospheric object yields parts for a new invention.  
**Result:** the built environment becomes the resource layer rather than scenery pasted over gathering nodes.

### Case 3 — cook because another player became the expert

**Intention:** prepare a six-person expedition.  
**Conditions:** one teammate has repeatedly cooked and unlocked stronger Cooking perks/recipes.  
**Actions:** group funnels ingredients to that scientist while others repair gear and gather supplies.  
**Interaction:** use-based skill growth makes division of labor economically rational.  
**Result:** a social profession emerges from behavior instead of a locked class.

### Case 4 — defend the base with an invention instead of a sword

**Intention:** survive an announced overnight assault.  
**Conditions:** warning arrives before the raid; crafting bench anchors the target base.  
**Actions:** charge batteries, repair barricades, place Chopinator/turrets/traps and prepare firing lanes.  
**Interaction:** attackers path toward the base while powered defenses consume stored electricity.  
**Result:** previous construction/power decisions resolve a future combat event.  
**Failure mode:** poor power storage turns expensive defenses off exactly when grid power disappears.

### Case 5 — use a portal world as a renewable expedition

**Intention:** obtain portal-specific materials already exhausted on the last trip.  
**Conditions:** world reset cycle has passed.  
**Actions:** return through the portal, collect regenerated resources, fight/avoid its enemies and leave before supplies are exhausted.  
**Interaction:** the portal is a renewable dungeon while the main facility remains persistent.  
**Result:** resource refresh does not require respawning the player's home/primary world.

### Case 6 — death creates a co-op rescue decision

**Intention:** keep an injured teammate from losing expedition tempo/durability.  
**Conditions:** their health reaches zero in multiplayer and they enter the critical window.  
**Actions:** another scientist abandons combat/objective position and revives them before the timer expires.  
**Interaction:** group positioning becomes a death/recovery mechanic rather than merely shared DPS.  
**Result:** co-op provides a real safety capability solo players do not have.

### Case 7 — tame a threat into a companion

**Intention:** gain a useful field pet.  
**Conditions:** eligible creature is subdued/pacified and preferred food is available.  
**Actions:** tame/feed it, raise it, equip it in the Companion slot and bring it on an expedition; later direct it with Pet Pointer commands.  
**Interaction:** an entity previously categorized as hostile/ecological content becomes persistent combat utility.  
**Result:** the world relationship changes without introducing a separate "pet species" detached from the ecology.

### Case 8 — reset the world rules instead of asking every player to enjoy the same grind

**Intention:** run a challenging group's second playthrough.  
**Conditions:** team has already mastered the default world.  
**Actions:** enable harder Sandbox/Hardcore/Iron rules, increase death/resource constraints and remove some safety options.  
**Interaction:** identical handcrafted geography now produces different planning/economy because the world's laws changed.  
**Result:** replay value comes partly from rules, not procedural map generation.

## R06 — people, AI, co-op and social systems

### Scientists are expressive roles without deep NPC-social simulation

Player characters are scientists defined through:
- profession;
- traits;
- skills;
- equipment;
- player behavior.

In multiplayer, those differences are socially meaningful because tasks can be delegated. The group can naturally identify "our cook," "our builder," "our sneaky person," or "the one who understands electronics."

### NPCs, objectives and factions

The GATE facility has surviving staff, recorded personnel, traders and narrative figures. A large **Objectives** chain explicitly moves the player through the facility—examples include reaching the Elevator, fixing Office-sector pumps, activating the Synchrotron, finding Mycofields materials and infiltrating Security. Objectives provide authored direction without replacing the scavenging/survival rules. [Objectives](https://abioticfactor.wiki.gg/wiki/Objectives).

The world also has clear factions: the player is a **GATE employee**; the **Order** is the major hostile religious/militant organization; the **Gatekeepers** are GATE-adjacent occult containment forces whose relationship becomes increasingly complicated; other portal-world groups appear later. [GATE-101 factions](https://abioticfactor.wiki.gg/wiki/Gate-101) · [Order](https://abioticfactor.wiki.gg/wiki/Order) · [Gatekeepers](https://abioticfactor.wiki.gg/wiki/Gatekeeper).

These are authored affiliations/conflicts rather than a player-managed reputation/diplomacy system. The dossier found no romance/affinity ladder or rich daily-schedule social simulation for ordinary NPCs; NPCs are primarily story/service/encounter actors.

### Hostile AI

Enemies vary from animals/aliens to human military forces, robots and anomalous threats. Their strength is often:
- encounter rule;
- visual identity;
- location;
- interaction with facility systems.

Critical reception is more mixed on later combat tuning and human-enemy density than on the world/exploration layer.

### Pets are the persistent nonhuman social layer

The 2026 companion rework allows pets to persist, grow and accompany the player. This creates a relationship loop much closer to "raise and protect a creature" than the launch game's simpler pet novelty.

The current Pet Pointer gives direct commands, but pet AI can still make autonomous choices such as attacking enemies. That autonomy can be useful or disruptive to stealth. [Pets](https://abioticfactor.wiki.gg/wiki/Pets).

### Multiplayer is native, not a mod

The game supports:
- solo;
- 1–6-player online co-op;
- LAN co-op;
- cross-platform multiplayer in the current 1.0+ product.

A host carries more CPU responsibility, explicitly reflected in the Steam system requirements. [Temple DLC/system requirements](https://store.steampowered.com/app/4026970/Abiotic_Factor__Temple_of_Stone/).

### Shared versus personal progression

World/base/story state belongs to the save/server, while scientists retain their own character build/skills/inventory within that world context. Group resources/storage are physical and negotiated socially rather than allocated through a formal raid-loot system.

The forthcoming mod system is designed to automatically synchronize required mods when joining a modded server, but that remains future.

## R07 — art, audio, interface, controls and feel

Abiotic Factor intentionally evokes late-1990s/early-2000s PC science fiction:
- chunky low-poly characters;
- readable industrial/lab architecture;
- beige offices;
- CRTs;
- institutional signage;
- blocky grotesque creatures;
- first-person perspective.

The retro art is not simply nostalgia. It keeps a dense world of interactable junk legible and allows the facility to feel huge without chasing photorealism.

PC Gamer's review praises how the place feels like a coherent abandoned institution rather than a generic survival biome, while TheXboxHub says the retro presentation looks deliberately 1998-ish yet remains clean/readable. [PC Gamer review](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-review/) · [TheXboxHub review](https://www.thexboxhub.com/abiotic-factor-review/).

### Audio production, music and voice

The current credits give unusually concrete production evidence. **Stephanie Engelbrecht** and **Chahd Sbai** are credited as sound designers, while art director **Connor "MadDok" Moran** is credited for the facility's soundscape before dedicated sound designers joined. **Chris Geddes** composed the main theme and **Mario Sello Nuñez** composed sector music. [Credits](https://abioticfactor.wiki.gg/wiki/Credits).

The voice cast includes scientists, GATE staff, Order/Gatekeeper characters and security bots; the mix of dead-serious institutional announcements, strange entity sounds and comic scientist reactions is part of the game's tone. These credits establish authorship/production, while this audit still does not claim to have listened through the soundtrack or every voice scene.

### Need feedback uses comedy and embodiment

The scientist complains, eyelids close under fatigue, toilet need becomes increasingly obvious, and bad food can produce ridiculous bodily consequences. The presentation makes survival state memorable without reducing the tone to grim medical simulation.

### The facility itself is a UI

Signs, colored departments, trams, locked keypads, shortcuts and recognizable plazas teach navigation. The world is labyrinthine, but much of the "map" is readable institutional design.

Current players still debate later-sector maze/backtracking friction; authored density can become navigation exhaustion when return trips are too frequent.

### Sandbox settings are an accessibility/friction surface

Players can alter stack sizes, resource rates, enemy/needs pressure, death penalties, skill progression and other rules. This allows:
- solo players to reduce group-sized grind;
- challenge players to intensify survival;
- disabled/busy players to remove specific repetitive friction.

It is not a complete accessibility substitute, but rule customization materially widens who can enjoy the world.

## R08 — story, setting and connection to play

**Moderate structural spoilers; late ending details omitted.**

The player arrives for their first day at the **GATE Cascade Research Facility**, a secret complex that studies anomalies and portal-linked worlds. The objective system gives that investigation a concrete authored spine while sector exploration, scavenging and portal trips supply the systemic path between objectives. Something has gone catastrophically wrong:
- containment has failed;
- portals/Anteverses are active;
- hostile entities move through the facility;
- military/Order forces complicate the disaster;
- much of GATE's staff has died, evacuated or become scattered.

The main campaign is a **physical escape/investigation through the facility**. Progress is not a separate quest menu layered over sandbox play; survival capability is what opens the next research wing.

Story is delivered through:
- NPC encounters;
- emails/terminals;
- audio/video records;
- environment;
- anomalous objects;
- portal worlds;
- sector progression.

Deep Field said early that it wanted "deep narrative, but to wear it lightly"—a world with strong internal logic that nudges players instead of dragging them through exposition. [NZ CODE studio profile](https://www.nz-code.nz/post/studio-profile-deep-field-games).

That succeeds particularly well in early/mid-game discovery. The strongest 1.0 criticism concerns the **late narrative/combat payoff**: GamingTrend and several helpful Steam negatives praise the facility/lore while finding later Reactors/Praetorium progression grindier, more human-combat-heavy and the final boss/ending less satisfying than the buildup.

The result is an important design warning: excellent environmental mystery can create an expectation debt that a conventional boss fight cannot automatically repay.

## R09 — production and development

### Studio origin and team

Deep Field Games is a New Zealand studio led by developers including founder/director **Geoff "Zag" Keene**, producer/narrative designer **Henry Feltham**, Kate Colvin and art director Connor Moran. Its prior lineage includes Keene's **Unfortunate Spacemen** and other studio experience. [Deep Field](https://www.deepfield.games/) · [NZ CODE profile](https://www.nz-code.nz/post/studio-profile-deep-field-games).

The NZ CODE interview describes the original mixture clearly:
- love of weird science;
- strong co-op interest;
- desire for another Half-Life-like setting;
- SCP/Backrooms-style deep lore;
- narrative that guides without over-authoring.

Later production accounts describe a small remote team rather than a large AAA studio.

### Survival-game dissatisfaction drove design

Keene told PC Gamer he liked playing survival games socially but often found their default loops grindy/boring. Deep Field intentionally deconstructed the genre:
- fewer generic resource chores;
- no forest-clearing loop;
- simple needs with personality;
- dense authored exploration;
- clever object reuse.

[PC Gamer interview](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-interview-survival-immersive-sim/).

This is unusually strong production evidence because a visible mechanic can be tied directly to a stated design problem.

### Engine and technical base

The current Steam system requirements identify **Unreal Engine 5**. Hosting several players increases CPU requirements. [Steam DLC/system-requirement page](https://store.steampowered.com/app/4026970/Abiotic_Factor__Temple_of_Stone/).

No proprietary implementation beyond published evidence is inferred.

### Early Access was relatively short and structured

Early Access began May 2024. Major chapters/sectors arrived through a public roadmap, including substantial 2024–2025 additions such as Crush Depth and Dark Energy before 1.0.

Deep Field's Early Access announcement said community feedback was a core reason for the model. The team expected roughly 8–12 months but ultimately took about fourteen months to full release. This is close enough to be a real roadmap, not a perpetual "eventually 1.0" state, while still showing schedules can move.

### Post-1.0 did not freeze the game

Deep Field continued free community updates after 1.0, including:
- challenge/difficulty;
- pets;
- chemistry;
- portal/crossover content;
- QoL/perks;
- new devices.

The team also created small paid Home Worlds/cosmetics and announced a larger story DLC.

### Current delay/modding split

The September 16, 2026 update is a useful production lesson:
- Entropic Break was delayed to Q1 2027 because the team believed the expansion's ambitions exceeded the remaining schedule;
- a **different small group plus external collaborators** works on official mod support so the DLC team does not lose focus;
- mod support is being brought forward as Community Update #5.

The September 25 preview says official tools will initially support many data/content types—items, recipes, enemies, pets, buffs, traders, skills, jobs, chemistry, weather—but **not new levels/portal worlds**. Deep Field explicitly says authored level creation is much more complicated and may require later work. [Steam current news](https://steamcommunity.com/app/427410/allnews/).

That is a strong example of defining an extensibility boundary instead of promising total creator access.

## R10 — distribution, promotion and virality

Abiotic Factor's marketing hook is immediately explainable:
**What if the doomed Half-Life scientists had to save themselves in a co-op survival game?**

The game benefited from:
- a distinctive retro-science premise;
- Steam demos/playtests;
- co-op creator/streamer play;
- Early Access;
- publisher Playstack;
- roadmap/Status Reports;
- strong word of mouth;
- later PS5/Xbox launches.

By May 23, 2024—only weeks after Early Access—Keene told PC Gamer the game was nearing **300,000 copies sold**, evidence that the premise had already escaped a small niche. [PC Gamer interview](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-interview-survival-immersive-sim/).

GameDiscoverCo later reported:
- about **200k Steam wishlists at launch**;
- **250k copies in eight days**;
- **600k Steam copies in roughly three months**.

[GameDiscoverCo](https://newsletter.gamediscover.co/p/how-abiotic-factor-sold-600k-copies).

The 1.0 launch used an unusually wide distribution beat:
- normal Steam launch;
- **PlayStation Plus Game Catalog day one**;
- **Xbox Game Pass day one**;
- console cross-platform audience.

[PS Plus](https://www.pushsquare.com/news/2025/06/first-ps-plus-extra-game-for-july-2025-confirmed).

The setting is inherently shareable:
- ridiculous improvised weapons;
- lab accidents;
- toilet/soup mishaps;
- strange entities;
- friends riding office furniture/vehicles;
- base-defense disasters.

It generates anecdotes from **failed science**, not only wins.

## R11 — commercial and participation context

Abiotic Factor is a premium base game with a mixed post-launch content model:

- base purchase;
- subscription distribution through services such as PS Plus/Game Pass at launch;
- low-priced optional Supporter/Home World DLC;
- a future larger paid story expansion;
- free Community Updates.

No battle pass, gacha or recurring power monetization is central to current progression.

### Dated unit evidence

Strong title-specific public evidence includes:

- near **300k sold** in May 2024, developer interview;
- **600k Steam units** by about three months after Early Access, reported by GameDiscoverCo;
- **more than 1.4 million Steam copies by late August 2025**, with GameDiscoverCo explicitly attributing that total to Playstack after the 1.0 launch.

[PC Gamer](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-interview-survival-immersive-sim/) · [600k analysis](https://newsletter.gamediscover.co/p/how-abiotic-factor-sold-600k-copies) · [1.4m follow-up](https://newsletter.gamediscover.co/p/how-abiotic-factor-rode-a-hot-steam).

The 1.4m figure is a dated Steam-sales milestone relayed by an independent analytics publication **from Playstack**, not a current September-2026 lifetime total and not console/subscription participation.

### Playstack aggregate cannot be assigned to Abiotic Factor alone

Playstack's H1-2025 company statement says **Balatro and Abiotic Factor together** were standout successes with "more than 3m units sold in the first half alone." That is a combined publisher statement; it does **not** prove Abiotic Factor sold 3m units. [Playstack](https://www.playstack.com/news/playstack-52-percent-growth-to-30m-revenue-in-h1-2025/).

The distinction is preserved rather than converting an aggregate into a title statistic.

### Current participation signal

The current Steam store has tens of thousands of purchaser reviews and an **Overwhelmingly Positive** aggregate; review counts are not sales. Current third-party unit estimates disagree materially, so this dossier does not substitute September-2026 model estimates for a publisher-reported milestone. [Steam](https://store.steampowered.com/app/427410/Abiotic_Factor/).

## R12 — reception, five written reviews and player evidence

### Five substantive independent written reviews/assessments

1. **PC Gamer — Morgan Park, July 22, 2025.** A full 1.0 review that calls Abiotic Factor an unusually memorable co-op survival game. It praises the dense facility, tech/progression, base repurposing, professions/traits, weird invention and social play; its main reservation is combat clunkiness relative to exploration and systems. [Full review](https://www.pcgamer.com/games/survival-crafting/abiotic-factor-review/).

2. **Game8 — Allisandra Reyes, July 31, 2025.** Praises the blend of humor, horror/tension, sci-fi absurdity, story and discovery. Its strongest criticism is onboarding: several mechanics are poorly explained and solo play can become overwhelming without people to share the workload. [Full review](https://game8.co/articles/reviews/abiotic-factor-review).

3. **GamingTrend — Raven Winters, August 26, 2025.** A long 1.0/PS5 review praising authored sectors, base repurposing, lore/anomalous objects and progression. It supplies the strongest counterpoint: later Hydroplant/Reactors become grindier, enemy/resource balance degrades, bugs/save issues hurt the run, and the final boss/story resolution does not match the strength of the buildup. [Full review](https://gamingtrend.com/reviews/abiotic-factor-review-push-beyond-the-unknown/).

4. **TheXboxHub — Adam Carr, August 15, 2025.** Praises deep creative crafting, use-based self-improvement, combat improvisation, retro atmosphere and extensive sandbox customization. It criticizes solo tedium, early backtracking, restrictive inventory and crafting/storage busywork that only later upgrades reduce. [Full review](https://www.thexboxhub.com/abiotic-factor-review/).

5. **Try Hard Guides — Erik Hodges, May 1, 2024 Early Access review.** Version-limited but substantive. It already identified the distinctive Half-Life + Project-Zomboid-like skill/crafting mix and multiplayer promise, while reporting severe crash/CPU/physics problems in the launch-EA build. Those bugs are historical evidence, not a claim about current 1.4 stability. [Full Early Access review](https://tryhardguides.com/abiotic-factor-early-access-review/).

**Supplemental Early Access review:** Stack Up's June 2024 review provides another full early assessment of co-op, exploration/base play and the first facility state. [Stack Up](https://www.stackup.org/post/early-access-review-abiotic-factor).

### Current Steam helpful surfaces — September 2026

Current Steam review surfaces were directly inspected.

**Helpful/current positive testimony praises:**
- Half-Life/SCP-like setting;
- handcrafted interconnection/shortcuts;
- story/lore;
- co-op role division;
- use-based skill progression;
- base building inside the facility;
- amount of meaningful item reuse;
- the game remaining fun even for players who usually dislike survival crafting.

The all-time helpful positive surface includes long-running Early Access accounts that explicitly say progression, resources and QoL improved across updates. [Helpful-all-time](https://steamcommunity.com/app/427410/reviews/?browsefilter=toprated).

**Helpful negative testimony is unusually specific:**
- early/mid game described as exceptional;
- later Hydroplant/Reactors/Praetorium progression described by some players as a slog;
- portal "worlds" can feel like small resource areas rather than the scale implied by the name;
- late-game enemy density/sponginess and ranged-human emphasis;
- skill/resource grind;
- final boss/ending dissatisfaction;
- some historical optimization/save issues.

[Helpful negative](https://steamcommunity.com/app/427410/negativereviews/?browsefilter=toprated).

Current September 2026 direct reviews still include people recommending the game despite disliking the ending, which strengthens the interpretation that **late payoff is a real weakness for some players without negating the broader systemic achievement**. [Current reviews](https://steamcommunity.com/app/427410/reviews/).

These are qualitative samples, not prevalence estimates.

### Durable reception tensions

**Discovery versus explanation.** The game is rewarding partly because it lets players experiment, but that can become onboarding opacity.

**Co-op specialization versus solo workload.** Use-based roles are delightful in a group; one solo scientist must perform every profession.

**Authored interconnection versus backtracking.** Reusing old sectors makes the facility feel real but can produce logistics friction without shortcuts/vehicles/storage upgrades.

**Improvised intelligence versus conventional late combat.** Players often love traps/science/objects most; later gun-heavy humanoid encounters can feel less distinctive.

**Mystery buildup versus ending payoff.** Environmental narrative creates very high expectations for the finale.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Let professions be starting histories, not cages

Abiotic Factor's Jobs answer "who were you before this happened?" and then use-based skills answer "what have you become?"

OpenLegend can do the same:
- background gives asymmetric competence/relationships/resources;
- actual lived behavior reshapes ability;
- no artificial prohibition stops a physicist from learning to cook.

### 2. Make authored spaces mechanically reusable

The cafeteria is:
- shelter;
- food source;
- kitchen;
- power context;
- landmark;
- later social memory.

OpenLegend should prefer places where **fiction, navigation, resources and interaction share one owner** rather than creating a separate "base-building zone" disconnected from the world.

### 3. Turn infrastructure failure into world rhythm

Day/night matters because the institution's electricity goes out. This is much more fictionally grounded than a generic "night monsters get +30% damage."

For OpenLegend, schedules can change:
- utilities;
- transport;
- staffing;
- business availability;
- safety;
- social behavior.

Time should transform the world's systems.

### 4. Use renewable expedition spaces to protect persistent history

Portal Worlds can replenish resources while the primary authored facility remains stable.

For OpenLegend:
- persistent reality can preserve consequential history;
- renewable/instanced/remote spaces can absorb repeatable extraction;
- resource refresh does not require "the destroyed office magically respawned."

### 5. Progression can be emergent division of labor

If doing an activity improves it, groups naturally form roles. This can work especially well with agents:
- one character cooks because they became good at it;
- another repairs;
- another negotiates;
- another explores.

The social system emerges from capability history rather than MMO labels.

### 6. Bodily needs work when they have personality

Toilet/fatigue/food systems are memorable because they affect behavior and produce funny/specific consequences. A generic hunger bar is not inherently valuable.

OpenLegend should model needs where they:
- change choices;
- create care/social roles;
- produce readable behavior;
- connect to world infrastructure.

### 7. Improvisation depends on object identity

Office items remain recognizable even as ingredients. This lets players invent mentally:
"Could I use *that*?"

OpenLegend's object system should preserve semantic affordances/material/history rather than reducing everything immediately to "5 scrap."

### 8. Creator support needs a deliberate extension boundary

Deep Field's announced Mod Editor exposes many data-level systems but explicitly does **not** initially permit new levels/portal worlds. The team says that authoring support is much harder.

This is directly relevant to OpenLegend:
- expose high-value safe semantic extension points first;
- don't pretend every internal authoring tool can become a stable public API;
- expand when the tool/contract quality is ready.

### 9. Late-game content should preserve the game's core verb identity

If the early game teaches "scientists solve problems cleverly" but the finale requires mostly conventional shooting, the game risks betraying its own strongest promise.

OpenLegend should test every late-game escalation:
**does it deepen the thing people learned to love, or replace it with a generic prestige encounter?**

### 10. Sandbox laws can widen the audience without fragmenting the engine

Death loss, inventory, needs, research minigames and difficulty can change through world settings.

That is a strong authored-reality principle: expose **world-law parameters** while keeping deterministic owners/semantics clear.

### What not to copy automatically

- toilet meters solely because they are funny;
- skill grinding where optimal behavior becomes repetitive spam;
- constant backtracking without travel/logistics evolution;
- respawning resources inside story-critical spaces when persistence matters;
- pets/companions without clear autonomy commands or failure behavior;
- a final boss because "games need bosses";
- Deep Field's protected GATE facility, entities, characters, art or distinctive story.

## R14 — sources, preservation, routes and requirement map

### Prior-owner / preservation check

Repository-wide code search for **"Abiotic Factor"** returned no prior dedicated OpenLegend owner on the searchable baseline. The inspected canonical roster/README likewise identify G148 as a new September 27 survival-expansion subject. This dossier is additive; it does not replace an earlier game chapter/mechanics study.

The roster's required boundary is preserved:
- professions/skills;
- bodily needs;
- improvised tools/traps;
- power;
- bases;
- anomalies/portal exploration;
- cooperative roles;
- Early Access history;
- released content versus future expansion/mod support.

No video is represented as watched. Podcast/video sources discovered during research are listed only when their available text/metadata was used; no unseen scene/timestamp claims are made.

### Annotated source register

**S01 — Steam base-game store, current September 2026.** Primary storefront: Deep Field/Playstack, July 22 2025 1.0 date, May 2 2024 EA date, 1–6 players, current cross-platform/co-op features and current review populations.  
https://store.steampowered.com/app/427410/Abiotic_Factor/

**S02 — Steam/Deep Field announcement stream, 2026.** Primary current roadmap/status: 1.4, September Entropic Break delay, Sep. 25 Community Update #5/mod-tool preview.  
https://steamcommunity.com/app/427410/allnews/

**S03 — Entropic Break development update, Sep. 16, 2026.** Primary future boundary: delayed to Q1 2027; separate small team/external collaborators working on official mod support.  
https://store.steampowered.com/news/posts/?enddate=1789610633&feed=steam_community_announcements

**S04 — Community Update #4 / Anniversary, Jul. 13, 2026.** Primary current released content: devices/gear/pets/Pet Pointer/perks/food/QoL. SteamDB mirrors the official announcement.  
https://steamdb.info/patchnotes/23174881/

**S05 — Cosmic Companions official changelog copy, May 4, 2026.** Official-wiki page reproducing Deep Field's changelog; Pets 2.0, Dunkeltaler Forest/Voices crossover and chemistry-era content.  
https://abioticfactor.wiki.gg/wiki/1.3.0_Cosmic_Companions_Update

**S06 — Temple of Stone Steam DLC, Nov. 3, 2025.** Primary DLC content/ownership model: Home World, cosmetic/support material, host ownership opens location for all server players.  
https://store.steampowered.com/app/4026970/Abiotic_Factor__Temple_of_Stone/

**S07 — Official Abiotic Factor Wiki: mechanics hub.** Community-maintained operational reference for needs, jobs/traits/skills, item/object systems, movement and minigames.  
https://abioticfactor.wiki.gg/wiki/Mechanics

**S08 — Jobs.** Community operational reference for starting profession bonuses/trait budgets/current examples.  
https://abioticfactor.wiki.gg/wiki/Jobs

**S09 — Energy.** Community operational reference for grid power, nighttime outage, batteries and device load.  
https://abioticfactor.wiki.gg/wiki/Energy

**S10 — Death.** Community operational reference for critical-state co-op revival, corpse/drop behavior, durability penalty and respawn choices.  
https://abioticfactor.wiki.gg/wiki/Death

**S11 — Portal Worlds.** Community operational reference for required/optional/Home Worlds and current scheduled resource resets. Spoiler-heavy.  
https://abioticfactor.wiki.gg/wiki/Portal_World

**S12 — Assault Events / Base Defense.** Community operational reference for warning/bench-targeting/raid structure and current defensive device families.  
https://abioticfactor.wiki.gg/wiki/Assault_Events  
https://abioticfactor.wiki.gg/wiki/Base_Defense_Guide

**S13 — Pets.** Community operational reference for taming, companion slot, death/revival, feeding and combat behavior.  
https://abioticfactor.wiki.gg/wiki/Pets

**S14 — Trading.** Community operational reference for fixed/traveling NPC barter and quantum exchange machines.  
https://abioticfactor.wiki.gg/wiki/Trading

**S15 — Cooking.** Community operational reference for cooking skill, soups, baking and food-quality progression.  
https://abioticfactor.wiki.gg/wiki/Cooking

**S16 — Sandbox Settings.** Community operational reference for configurable needs/death/inventory/research/Hardcore/Iron world rules.  
https://abioticfactor.wiki.gg/wiki/Sandbox_Settings

**S17 — PC Gamer developer interview, Morgan Park, May 23, 2024.** Full interview read; design goal of avoiding survival grind, needs-as-feelings, immersive-sim emergence and ~300k early sales milestone.  
https://www.pcgamer.com/games/survival-crafting/abiotic-factor-interview-survival-immersive-sim/

**S18 — NZ CODE Deep Field studio profile, Aug. 17, 2022.** First-person Henry Feltham interview; team origin, weird-science/co-op/Half-Life inspiration and "deep narrative worn lightly."  
https://www.nz-code.nz/post/studio-profile-deep-field-games

**S19 — Deep Field Games.** Primary studio/game catalogue.  
https://www.deepfield.games/

**S20 — GameDiscoverCo sales analysis, 2024.** Secondary commercial analysis with specific reported Steam figures: 200k wishlists, 250k first eight days, 600k first ~3 months.  
https://newsletter.gamediscover.co/p/how-abiotic-factor-sold-600k-copies

**S21 — Playstack H1 2025 business update.** Publisher aggregate; explicitly combines Balatro + Abiotic Factor for >3m H1 units and therefore is not treated as an Abiotic title sales figure.  
https://www.playstack.com/news/playstack-52-percent-growth-to-30m-revenue-in-h1-2025/

**S22 — PC Gamer, Morgan Park, Jul. 22, 2025.** Full independent 1.0 review read.  
https://www.pcgamer.com/games/survival-crafting/abiotic-factor-review/

**S23 — Game8, Allisandra Reyes, Jul. 31/Aug. 6, 2025.** Full independent 1.0 review read.  
https://game8.co/articles/reviews/abiotic-factor-review

**S24 — GamingTrend, Raven Winters, Aug. 26, 2025.** Full independent PS5/1.0 review read; unusually detailed late-game, story, balance and bug criticism.  
https://gamingtrend.com/reviews/abiotic-factor-review-push-beyond-the-unknown/

**S25 — TheXboxHub, Adam Carr, Aug. 15, 2025.** Full independent Xbox review read; crafting/skills/sandbox/co-op versus solo/backtracking/crafting friction.  
https://www.thexboxhub.com/abiotic-factor-review/

**S26 — Try Hard Guides, Erik Hodges, May 1, 2024.** Full Early Access review read and explicitly version-limited; launch-EA crash/CPU issues not represented as current.  
https://tryhardguides.com/abiotic-factor-early-access-review/

**S27 — Steam Community current/helpful review surfaces, September 2026.** Direct qualitative player testimony; all-time positives, all-time negatives and current reviews. Not prevalence estimates.  
https://steamcommunity.com/app/427410/reviews/?browsefilter=toprated  
https://steamcommunity.com/app/427410/negativereviews/?browsefilter=toprated  
https://steamcommunity.com/app/427410/reviews/

**S28 — Hotfix v1.4.0.28206, July 27, 2026.** First-party current-version boundary across Steam, PS5 and Xbox/PC App; pet/decorating/cooking fixes and explicit note that official mod support is not yet live.  
https://steamcommunity.com/app/427410/discussions/7/574921277455785829/

**S29 — Character Creation, Jobs and IS-0017.** Current operational references for appearance separation, Job/Trait background rules and late respecialization resetting all Skills to level 3 while preserving recipes/journal/compendium.  
https://abioticfactor.wiki.gg/wiki/Character_Creation  
https://abioticfactor.wiki.gg/wiki/Jobs  
https://abioticfactor.wiki.gg/wiki/IS-0017

**S30 — Inventory / Armor and Gear / Mechanics.** Current operational references for 12-slot starting pockets, backpacks/weight, dedicated armor/gear slots, body-part armor, harvesting remains and item durability.  
https://abioticfactor.wiki.gg/wiki/Inventory  
https://abioticfactor.wiki.gg/wiki/Gear_item  
https://abioticfactor.wiki.gg/wiki/Mechanics

**S31 — Enhancement Bench / Repair and Salvage / Chemistry / Cold Fusion 1.0.** Current item repair, salvage, upgrade/refit and coating/tincture mechanics plus 1.0 upgrade-family addition.  
https://abioticfactor.wiki.gg/wiki/Enhancement_Bench  
https://abioticfactor.wiki.gg/wiki/Repair_and_Salvage_Station  
https://abioticfactor.wiki.gg/wiki/Chemistry  
https://abioticfactor.wiki.gg/wiki/1.0.0_Major_Update:_Cold_Fusion

**S32 — Objectives / faction references.** Current authored objective chain plus GATE, Order and Gatekeeper faction boundaries.  
https://abioticfactor.wiki.gg/wiki/Objectives  
https://abioticfactor.wiki.gg/wiki/Gate-101  
https://abioticfactor.wiki.gg/wiki/Order  
https://abioticfactor.wiki.gg/wiki/Gatekeeper

**S33 — Current credits.** Deep Field credits for sound designers Stephanie Engelbrecht/Chahd Sbai, early soundscape by Connor Moran, main-theme composer Chris Geddes and sector-music composer Mario Sello Nuñez.  
https://abioticfactor.wiki.gg/wiki/Credits

**S34 — GameDiscoverCo 1.0 follow-up, Aug. 2025.** Independent commercial analysis reporting >1.4m Steam copies, explicitly attributed to Playstack; kept dated and distinct from console/subscription participation.  
https://newsletter.gamediscover.co/p/how-abiotic-factor-rode-a-hot-steam

### Suggested reading route

1. Read **S17 (developer interview)** first to understand why the survival rules deliberately differ from genre defaults.
2. Read **S22 (PC Gamer review)** for the strongest whole-game positive case.
3. Read **S24 (GamingTrend)** immediately after for the strongest late-game counterpoint.
4. Read **S09/S10/S11/S12** for the exact power/death/portal/base rules behind the worked cases.
5. Read **S02/S03/S28** to establish the current September-2026 release boundary; 1.4.0.28206 is shipped, while Entropic Break and official mod support remain future.
6. Read **S18** for the studio's pre-launch narrative/philosophy.
7. Use S27 last for player testimony; helpful negatives contain major story/endgame spoilers.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | identity, 1.0/current updates/DLC/future boundaries |
| R02 | jobs, traits, use-skills, needs, crafting, power, base, combat, portals, pets, difficulty |
| R03 | office objects, builds, power networks and anomaly composition |
| R04 | skill/knowledge progression, death, time, economy and renewable expeditions |
| R05 | eight worked interactions |
| R06 | scientists, NPCs, enemies, pets and co-op |
| R07 | retro art, embodied needs, facility navigation and sandbox accessibility |
| R08 | GATE story/environmental narrative and late-payoff tension |
| R09 | Deep Field origin, design intent, UE5, EA/post-launch and mod boundary |
| R10 | positioning, Steam/console/subscription distribution and word of mouth |
| R11 | dated title sales evidence and aggregate-metric qualification |
| R12 | five substantive written reviews + current Steam evidence |
| R13 | transferable inspiration and limits |
| R14 | source register, preservation, route and this map |

### Evidence limits

- No current build/server was installed or executed for this pass.
- No video, podcast or soundtrack is represented as watched/listened to.
- The official community wiki is used for operational mechanics/credits and is not substituted for Deep Field's release-roadmap intent.
- Current Character Creation text and Jobs/IS-0017 pages can look contradictory if read in isolation: the initial Job/Trait choice is fixed at creation, but current late-game IS-0017 explicitly provides respecialization with a skill reset. The dossier records both stages.
- Exact perk values, recipe ingredients and resource reset timing can change; this dossier focuses on current structural behavior and version-dates the mutable parts.
- Entropic Break and Community Update #5/mod support are **future** on September 27, 2026.
- The five-review set intentionally includes one 2024 Early Access review, clearly separated from four full-release reviews; its technical complaints are not presented as current.
- Steam player samples are qualitative evidence, not prevalence.
- Playstack's >3m H1 unit statement combines Balatro and Abiotic Factor and is not misreported as Abiotic Factor's units.
- The >1.4m Steam figure is a dated August-2025 GameDiscoverCo report explicitly attributed to Playstack, not a current lifetime or all-platform count.
- Hotfix v1.4.0.28206 (Jul. 27, 2026) is the newest shipped build located in this audit; Community Update #5/mod support and Entropic Break remain future.
