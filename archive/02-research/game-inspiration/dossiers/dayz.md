# G132 — DayZ

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

DayZ is a useful study of a survival game where **the body, the inventory, the map and other people are all uncertain information problems**. A can of food may solve hunger but not thirst; a rifle may be useless without compatible ammunition; a long walk may be safe until weather, sickness or another survivor changes the route; a stranger can save an hour of preparation or end it in seconds. The standalone game deliberately offers little authored direction. Its strongest stories come from players turning scarcity, geography and fragile bodies into reasons to communicate, cooperate, deceive and remember.

## R01 — identity, current scope, versions and player promise

This dossier studies **DayZ Standalone**, developed and published by Bohemia Interactive, not Dean Hall's original ARMA 2 DayZ mod. The mod is essential production history, but its weapons, loot economy, vehicles, maps and server conventions are not automatically rules of the standalone game.

The standalone entered Steam Early Access in December 2013 and reached PC 1.0 on December 13, 2018 after roughly five years of public alpha development. Bohemia described that transition as the culmination of a substantial technology overhaul rather than a freeze of the design. [Bohemia 1.0 announcement](https://www.bohemia.net/en/blog/dayz-10-is-launching-on-december-13-on-steam) · [beta transition](https://www.bohemia.net/en/blog/dayz-enters-beta-on-pc).

The player promise is intentionally sparse: wake in an infected post-collapse landscape, keep the character alive, find food/water/clothing/tools/weapons, move through the country, decide whether other survivors are opportunities or threats, and make personal goals from whatever survives long enough to matter. The official Steam description still centers the question **how long can you survive?** and explicitly treats cooperation with strangers or lone-wolf play as equally valid. [Steam](https://store.steampowered.com/app/221100/DayZ/).

### Current September 2026 stable versus Experimental

As of September 27, 2026, the **stable branch is Update 1.29**. The update initially reached stable PC in April 2026 and the July 15 **Road to Badlands** stable update added/previewed assets such as SCR17 variants/accessories, holographic sights, desert-oriented equipment, additional infected and a Nasdara convoy server event. The current official forum index still separates stable 1.29 from Experimental 1.30. [Stable 1.29 thread](https://forums.dayz.com/topic/266379-stable-update-129/) · [official news](https://dayz.com/).

**Update 1.30 is Experimental**, first exposed on Steam in September 2026. It includes experimental motorbikes, inventory/UI changes, shield attachments, wash-face/wet-clothing actions, weapon variants and many fixes/settings. Bohemia's Experimental forum rules are explicit that features in test builds can change or be removed. Therefore this dossier does **not** treat motorbikes or the 1.30 inventory UI as stable released mechanics yet. [Experimental forum](https://forums.dayz.com/forum/135-pc-experimental-updates/) · [official DayZ news](https://dayz.com/).

### Official maps and expansion boundaries

- **Chernarus** remains the foundational official terrain.
- **Livonia** began as paid DLC, but Update 1.25 on May 27, 2024 folded it into the base game for all owners. A current description of Livonia as still separately paid is obsolete. [Update 1.25](https://www.bohemia.net/en/blog/dayz-update-1-25).
- **Frostline** is a paid expansion released October 15, 2024. Its Sakhal archipelago is a cold-weather survival variant with frozen food, severe temperature pressure, new fauna/equipment and heavy-metal poisoning among its distinct systems. [Frostline / 1.26](https://dayz.com/article/game-update/DayZ-Update-1-26).
- **Badlands / Nasdara** is still future as of September 27, 2026. Official 2026 communications describe it as a paid arid expansion targeted for October. Assets and a convoy event can appear in current stable/experimental updates without making the terrain itself released. Roadmap or preview details are not promoted into current play. [DayZ news](https://dayz.com/).

A Nintendo Switch 2 version released August 20, 2026. PlayStation/Xbox/Switch behavior and performance should not be used as proof of exact PC balance. Platform ports share the game but can differ in controls, presentation and service constraints.

### Official, community and modded servers

DayZ's identity includes a broad server ecosystem. Official servers expose Bohemia's intended baseline, while community servers can change central-economy values, persistence, population, maps, rules and mod sets. Steam Workshop support lets servers add substantial content and behavior. A popular trader-heavy or high-loot community server is therefore not evidence that vanilla DayZ contains NPC shop economies or accelerated progression.

## R02 — player actions and major mechanics

### Bodily survival is a coupled state system

The character is defined less by permanent stats than by changing physical states. Major survival concerns include:

- health;
- blood volume and bleeding;
- shock/consciousness;
- energy/food;
- hydration;
- body temperature;
- wetness and clothing insulation;
- disease, infection and poisoning;
- stamina and encumbrance;
- wounds and medicine.

A problem can cascade. Cold/wet conditions raise survival pressure; a fight can create bleeding; blood loss can produce unconsciousness; low food/water reduces the margin for recovery; a poor medical decision can compound an otherwise survivable wound.

DayZ's value is not the number of meters but their **diagnostic interaction**. The player often asks "why am I getting worse?" and must infer the cause from symptoms, recent food/water, temperature, wounds and equipment.

### Scavenging and the Central Economy

Most capability is found rather than selected from a level-up menu. Houses, industrial areas, military locations, hunting areas, dynamic events, infected and other world sources produce different loot pools.

Bohemia's **Central Economy** controls item spawning, cleanup, infected, animals, vehicles and dynamic events and can react to world/player state. Server owners can tune economy files, which is another reason community-server abundance should not be projected onto official servers. [Central Economy status report](https://dayz.com/article/status-report/status-report-26-june-2018) · [server economy documentation](https://community.bistudio.com/wiki/DayZ:Central_Economy_Configuration).

Loot has more dimensions than "tier." Condition, compatibility, quantity, contamination/wetness, carried mass and immediate context all affect value.

### Inventory and physical handling

Clothing, vests, backpacks and containers provide inventory capacity. Items occupy slots; many items can be moved, split, combined or placed in hands. Weapons accept compatible ammunition, magazines and attachments rather than abstract ammo pools. A firearm without the right magazine/ammunition is only a future option; carrying it still consumes space/weight.

Encumbrance reduces stamina, so more equipment can make sprinting, climbing and escaping harder. This is one of DayZ's strongest composition tensions: **preparedness competes with mobility**.

### Combat and practical stealth

Combat includes melee, firearms, thrown items, explosives and environmental positioning. Weapons can be damaged and jam; magazines/ammunition/attachments introduce preparation and failure states. Armor and helmets can improve survivability without creating a conventional RPG defense score.

DayZ has no universal stealth bar or stealth skill tree. Stealth comes from posture, movement speed, sightlines, terrain, darkness, sound, weapon choice and avoiding unnecessary infected/players. Current stable updates continue to revise firearm audio, making sound a strategic signal rather than ambience only.

### Infected, wildlife and environmental hazards

The infected are roaming AI hazards that can attract attention and consume supplies even when they are not the greatest lethal threat. Wildlife supplies meat/materials but can also be dangerous. Weather, temperature and radiation/contaminated zones create threats that do not negotiate like human players do.

Update 1.14's contaminated areas are a good example: entering certain gas zones requires planning around protective equipment and filters, turning a high-value location into an equipment-gated expedition rather than just a shootout. [Update 1.14](https://dayz.com/article/game-update/DayZ-Update-1-14).

### Hunting, fishing, cooking and horticulture

Players can hunt animals, fish, process food, cook with fires, and grow crops. Food can be raw, cooked, burned, frozen or otherwise unsuitable depending on context; water quality and hygiene can matter. Sakhal pushes this further because freezing/thawing and cold-weather planning are central to the map's identity.

These systems are not a separate farming-management game. Their significance comes from creating alternatives when urban loot is poor or dangerous.

### Crafting, repair and improvised tools

DayZ supports contextual crafting/combination: improvised survival objects, fires, medical materials, restraints, shelters and repair actions can be created or restored from compatible inputs. Repair kits and similar tools operate on particular item families/condition ranges rather than functioning as a universal "repair everything" button.

There is no broad magical or supernatural player-power system. The game stays materially grounded.

### Navigation and traversal

Vanilla navigation is intentionally not a persistent HUD minimap with quest arrows. Players use:

- terrain and skyline;
- road signs and settlement names;
- roads, rail lines and coastlines;
- compass/map/GPS tools when found;
- sun/weather orientation and learned geography;
- landmarks and memorized routes.

Travel can be on foot or via vehicles. Stable DayZ has cars/trucks and, with the Frostline-era updates, boats; vehicle ownership requires finding, repairing, fueling and keeping a vulnerable physical object. Experimental 1.30 motorbikes are excluded from stable current mechanics until they ship.

Vehicle/network code has itself been an active development target; Update 1.28 in 2025 specifically addressed vehicle synchronization for higher-latency situations. [Update 1.28](https://dayz.com/article/game-update/DayZ-Update-1-28).

### Base building and persistence

Players can build fences/gates/watchtowers and establish storage or shelters, use locks and flags, hide/bury caches and gather vehicles. Bases are not permanent ownership claims: they can be discovered, raided, damaged, abandoned or wiped by service decisions. Persistence rules also depend on server settings.

Base construction therefore creates a memory anchor in a permadeath game. A character can die while the group's physical place remains.

### Communication, restraint and social interaction

Proximity voice, text and gestures let strangers signal intent. Players can cooperate, trade informally, surrender, restrain or betray. The game intentionally leaves enough mechanical freedom that a meeting can become rescue, robbery, hostage drama, long-term companionship or immediate gunfire.

There is no authored reputation meter forcing consistency. Reputation lives in what players remember, server communities know, and what each participant risks revealing.

### Useful absences

There is no conventional character-creation class choice, attribute point allocation, XP level ladder, perk/skill tree, spell list, recruitable companion roster, romance system, authored faction reputation ladder or conventional quest log/main campaign. The character becomes "advanced" through knowledge, location, equipment, supplies, base/vehicle access and relationships.

## R03 — items, condition, compatibility and composition

### Major item families

Useful item families include:

- food, water containers and cooking equipment;
- bandages, disinfectants, medicines, blood/saline equipment and protective gear;
- clothing, footwear, backpacks, armor and helmets;
- knives, axes and survival tools;
- firearms, magazines, ammunition, optics and attachments;
- repair kits and maintenance tools;
- navigation/radio/light sources;
- building/storage materials and locks;
- hunting/fishing/farming supplies;
- vehicle parts, fuel and repair items;
- gas-zone/NBC equipment;
- improvised/crafted utility objects.

### Condition makes acquisition incomplete

Items can exist in different condition states. Damaged clothing protects less reliably; weapons can malfunction; tools and containers can degrade. The important design effect is that finding an object does not end its story. A damaged rifle asks additional questions: can it be repaired, is there compatible ammunition, is carrying it worth the weight, and is a functioning lower-tier weapon better right now?

### Blood and medicine as compatibility systems

Blood loss and transfusion create one of DayZ's clearest examples of material simulation exceeding a simple health potion. Blood type/compatibility matters, and a transfusion is not automatically safe just because blood exists. Medical supplies can address distinct causes rather than one generic "healing" need.

Exact disease formulas and treatment tables change across updates and are deliberately not reproduced here as timeless rules. The transferable point is that symptoms and treatment choices have relationships.

### Storage and loss

Items persist in carried inventory, world containers, bases, vehicles or caches subject to persistence/cleanup/server rules. Character death usually leaves the carried load on the corpse for some time rather than magically restoring it at respawn; another player may take it first.

That makes inventory a form of accumulated time. A backpack full of medicine, food and ammunition is not only statistics—it is hours of future optionality.

## R04 — progression, economy, time and failure

### Progression without levels

DayZ progression is almost entirely **state accumulation and knowledge**:

- enough food/water to stop living minute-to-minute;
- clothing suited to the environment;
- medical reserves;
- better tools/weapons/ammunition;
- knowledge of towns, wells, routes and danger zones;
- access to hunting/fishing/farming;
- a vehicle or boat;
- caches/base/storage;
- allies and shared information;
- protective gear for high-risk zones.

There is no permanent account-wide combat skill that makes a fresh respawn inherently stronger.

### Scarcity is the economy

Vanilla DayZ has no universal NPC currency/store economy. The primary economy is **scarce useful objects**. Players barter because each participant may value water, medicine, ammunition or a compatible magazine differently.

Community servers can add trader mods and currencies; those are server experiences, not a built-in universal economy.

### Real and simulated time

Time matters through:

- hunger/thirst and recovery;
- temperature and weather;
- day/night;
- cooking/fires;
- disease progression;
- travel distances;
- horticulture;
- server restart/persistence cycles;
- item respawn/cleanup;
- base discovery and raid exposure.

A slow encounter cadence is intentional enough to be part of DayZ's identity, but multiple reviews criticize long stretches of low interaction. "Tension through emptiness" can become simply emptiness.

### Permadeath and recovery

Death is the central reset. A dead character loses accumulated bodily state and carried equipment, then respawns as a new vulnerable survivor. Friends may recover the previous corpse or stash, and bases/caches can outlive an individual character, but the new life itself does not inherit a skill tree.

This makes survival time meaningful without a formal score.

### Endgame and return loop

There is no final boss, credits-driven campaign or canonical victory. Mature goals are self-authored: secure a base, cross a map, acquire rare gear, run a vehicle, enter high-risk zones, help new players, hunt other players, build a community, explore a new official/community map, or simply keep one character alive.

Updates, wipes, deaths, new maps and friend-group sessions create return cycles rather than an authored New Game+.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations.

### Case 1 — thirst turns a town into a route decision

**Intention:** get inland with enough supplies to stop living house-to-house.  
**Conditions:** a fresh survivor has low reserves and reaches a settlement.  
**Actions:** search likely food/container locations, find a known potable source or obtain means to make water safer, then decide whether to keep looting.  
**Interaction:** thirst, loot scarcity, disease risk and map knowledge compete with time spent exposed in town.  
**Result:** a knowledgeable player can leave earlier with a safer route; an inexperienced player may consume something risky or overstay.  
**Next decision:** push inland, search for medicine, or remain near reliable water.

### Case 2 — a small wound becomes a diagnostic chain

**Intention:** survive after fighting infected.  
**Conditions:** the player is bleeding and has limited medical supplies.  
**Actions:** stop the bleeding with an appropriate clean/treated dressing, watch blood/health and symptoms, eat/drink/rest as possible, and treat infection if symptoms indicate it.  
**Interaction:** immediate wound control and later disease/recovery are separate problems.  
**Result:** the fight can remain consequential long after the infected is dead.  
**Limit:** opaque symptom mapping can feel like external-wiki homework when feedback is insufficient.

### Case 3 — a rifle is not yet a weapon

**Intention:** upgrade from a melee weapon after finding a firearm.  
**Conditions:** the rifle has uncertain condition and the player lacks its correct magazine/ammunition.  
**Actions:** inspect it, compare weight/space with current supplies, search compatible ammo or choose to leave it.  
**Interaction:** item compatibility means "rare" does not equal "useful now."  
**Result:** carrying future potential can reduce current stamina and inventory capacity.  
**Next decision:** commit to the weapon ecosystem or keep mobility.

### Case 4 — navigation consumes bodily resources

**Intention:** reach a military location without a HUD waypoint.  
**Conditions:** the player knows the approximate destination but has limited food and no vehicle.  
**Actions:** read town signs/landmarks, orient with compass/map knowledge, follow terrain and periodically reassess.  
**Interaction:** every wrong turn costs time, calories, daylight and exposure.  
**Result:** spatial knowledge becomes a real progression asset even though no "navigation skill" levels up.  
**Counterexample:** if travel produces too few meaningful decisions, the same distance becomes review-criticized empty walking.

### Case 5 — a stranger encounter has no safe dialogue mode

**Intention:** cross a town while another survivor appears.  
**Conditions:** both characters are armed enough to hurt each other, but neither knows the other's needs or intent.  
**Actions:** use distance, posture and proximity voice; hide a weapon, offer food, demand surrender, flee or attack.  
**Interaction:** communication and material risk happen simultaneously rather than in a paused dialogue screen.  
**Result:** trade, friendship, robbery or death can emerge from identical initial conditions.  
**Player evidence:** current/top Steam stories repeatedly center tiny exchanges—food, fishing, bandages—becoming memorable because betrayal or death remains possible.

### Case 6 — Sakhal turns fire into safety and exposure

**Intention:** recover from cold/wet conditions on Frostline's Sakhal.  
**Conditions:** temperature and wet clothing are becoming dangerous; food may be frozen.  
**Actions:** gather ignition/fuel, make shelter/fire, dry or warm items/character and thaw/cook what is needed.  
**Interaction:** heat solves bodily problems while smoke/light/noise can reveal position.  
**Result:** a "safe" survival action creates a social detection cost.  
**Next decision:** linger until fully recovered or leave before another survivor investigates.

### Case 7 — contaminated loot is an equipment-gated expedition

**Intention:** enter a gas-contaminated area for higher-value loot.  
**Conditions:** ordinary clothing is insufficient and exposure can be lethal.  
**Actions:** assemble the needed protective ensemble/filter capacity, enter efficiently, monitor exposure and leave before protection fails.  
**Interaction:** inventory slots and preparation buy temporary access to a dangerous geography.  
**Result:** rare gear changes where the player can go rather than simply increasing combat damage.  
**Limit:** losing one required component can invalidate the whole plan.

### Case 8 — a car converts storage into a visible dependency

**Intention:** move people and supplies faster than walking.  
**Conditions:** a vehicle exists but needs usable parts/fuel and can be heard/seen.  
**Actions:** repair/assemble it, fuel it, load cargo and drive.  
**Interaction:** mobility and storage improve dramatically, but the vehicle becomes a valuable physical object with maintenance/network/terrain risks.  
**Result:** the group gains reach while creating a new thing to protect.  
**Boundary:** September 2026 motorbikes remain Experimental 1.30, so they are not substituted into this stable case.

### Case 9 — a base outlives a character but not the world

**Intention:** create a repeatable home for a group.  
**Conditions:** enough tools/materials have been accumulated.  
**Actions:** choose a site, build barriers/storage, add locks/flag or other persistence support and stock supplies.  
**Interaction:** geography, material cost, discovery risk and server persistence turn construction into social commitment.  
**Result:** death may no longer mean total group reset because cached infrastructure remains.  
**Next decision:** expand visibly, stay discreet, distribute caches, or relocate.  
**Limit:** raids/server wipes can erase the investment; community rules vary.

### Case 10 — weapon condition changes a social tragedy

**Intention:** defend oneself after a long cooperative run.  
**Conditions:** the character finally has a firearm, but its condition is poor.  
**Actions:** fire during a crisis; a malfunction can require clearing/recovering rather than continuing ideal DPS.  
**Interaction:** maintenance state intersects with a high-stakes social moment.  
**Result:** a mechanically mundane jam can become the climax of hours of player-created story.  
**Player evidence:** a September 2026 Steam positive recounts a stranger-assisted run, a weapon jam and eventual death; that anecdote is testimony, not a universal probability claim.

## R06 — people, AI, social systems and multiplayer

### Other players are the principal social system

DayZ has no authored companion-approval framework. Social meaning comes from live participants who can:

- communicate through proximity voice/text/gestures;
- share or withhold supplies;
- travel together;
- rescue, restrain, rob or kill;
- establish bases and group routines;
- recognize one another on recurring community servers.

There is strong information asymmetry. A stranger saying "friendly" has no game-enforced truth value. The cost of testing trust is therefore gameplay.

### No built-in faction/reputation ladder

Vanilla Standalone has no universal persistent survivor faction reputation system. Community servers can implement factions, economies and rules through mods/admin policy, but those systems should be labeled as community-authored.

### Infected and animal AI

Infected provide local detection/combat pressure, while animals supply both threats and resources. AI has been repeatedly revised across the standalone's technology transition and later updates; launch-era zombie pathing criticism is historical evidence, not a timeless claim about current builds.

### Solo versus groups

Solo play has full access to the survival systems but fewer hands for watch, transport, medical support, base defense and recovery. Group play distributes knowledge and risk. The game does not automatically equalize those advantages.

### Moderation and server governance

Official service enforcement, BattlEye, community admins, server rules and mod policies materially shape experience. Bohemia's 2025 recap reported enforcement counts, but ban totals do not independently establish how common cheating is for a typical player. Current Steam negatives frequently allege cheating; those are direct player perceptions and should remain labeled that way.

## R07 — art, audio, interface and feel

DayZ's visual language is grounded, utilitarian and geographically legible. Roads, Soviet/post-Soviet architecture, forests, industrial sites, military compounds and weather make a place that players learn rather than merely pass through.

### Audio as navigation and threat detection

Distant gunshots, footsteps, infected calls, animals, vehicle engines and weather provide actionable information. Update 1.29 reworked multiple firearm sounds; this is a reminder that exact acoustic signatures are versioned even though sound's strategic role is durable.

### Interface friction

Inventory manipulation is unusually central because items have containers, slots, quantities, compatibility and condition. Launch and console reviews repeatedly criticized inventory/control friction. Experimental 1.30 is testing inventory UI improvements, but those cannot yet be cited as stable resolution.

### Music and atmosphere

Update 1.25 in 2024 introduced new ambient music into modern DayZ while integrating Livonia. The game still relies heavily on environmental audio and silence; music does not turn exploration into a continuously scored authored adventure. [Update 1.25](https://www.bohemia.net/en/blog/dayz-update-1-25).

### Feel is generated by consequence

The same quiet forest can feel empty or terrifying depending on carried gear, hunger, the last gunshot heard and the distance to shelter. DayZ's atmosphere is therefore systemic as much as audiovisual.

## R08 — story, narrative and connection to play

There is no conventional campaign, quest chain or authored protagonist arc. Chernarus, Livonia and Sakhal provide environmental context and the infection/disaster frame, but the official product pitch explicitly returns authorship to the survivor: **this is your story**.

Player-created narratives become durable because the rules support:

- long preparation;
- irreversible death;
- identifiable places;
- scarce objects;
- incomplete information;
- live communication;
- bodies/loot as evidence of previous events;
- persistent camps/bases;
- recurring server communities.

A story like "a stranger gave me bandages, we fished together, then one of us died" is mechanically modest but narratively strong because each action could have gone another way.

The absence of conventional authored quests is useful, but it is also a limit. Reviews that call the world boring are evidence that emergence does not automatically fill every quiet hour.

## R09 — production and development

DayZ's production history is unusually important because **the standalone was not simply the mod polished for retail**.

Dean Hall's ARMA 2 mod became a viral 2012 phenomenon and led Bohemia toward a standalone product. The standalone entered Steam Early Access in late 2013.

By January 2015 Bohemia reported **3,000,000 standalone sales** and emphasized that the team had shipped 24 public updates while redesigning core systems including inventory, multiplayer architecture and terrain. [3 million announcement](https://www.bohemia.net/en/blog/dayz-hits-3000000-sales).

The long alpha became controversial because the team was replacing foundational technology while maintaining a live public product. Bohemia's November 2018 beta announcement describes the transition to Enfusion engine modules and names base building, vehicles, more elaborate infected/animal AI and a major Chernarus rework as part of the beta-era system set. [beta announcement](https://www.bohemia.net/en/blog/dayz-enters-beta-on-pc).

The December 2018 1.0 release followed more than a year of engine-focused work and roughly five years of Early Access. PC Gamer's 2018 pre-1.0 reporting is useful external context on how protracted that transition felt to players. [PC Gamer on 0.63/new engine](https://www.pcgamer.com/dayzs-063-update-hits-experimental-branch-with-new-engine-map-changes-and-more/).

Development continued after 1.0 through new weapons, economy changes, contaminated zones, map expansions, vehicle work, base-building changes, audio, ports and major environments.

Frostline's 2024 Sakhal expansion is particularly useful as production evidence because Bohemia used an existing geographic/technical foundation but built a different survival contract around cold, ice, sparse food and archipelago travel.

Current 1.30 Experimental practice preserves the Early Access habit in a bounded form: test changes are explicitly separated from stable and may be modified/removed.

## R10 — marketing, distribution, community and virality

DayZ's discovery history begins with the ARMA 2 mod, where emergent player stories and online video/streaming made the concept legible: survival was interesting because the other survivor might do anything.

The standalone expanded that loop through:

- Steam Early Access and later 1.0;
- console releases;
- Steam Workshop/modding and community servers;
- official Community Spotlight posts;
- livestreams and creator/community showcases;
- official map expansions;
- platform promotions such as PlayStation Plus;
- continuing experimental/stable update communication.

Bohemia's February 2026 2025 recap says DayZ had **38,000 new mods** in 2025 and **41 official livestreams**, and that its PlayStation Plus inclusion brought **300,000+ new players on the first day** according to the publisher. These measures are not sales and do not prove which marketing channel created long-term retention. [2025 recap](https://www.bohemia.net/en/blog/bohemia-interactive-2025-recap).

**Interpretation:** DayZ is inherently shareable because its best moments have a short verbal premise—"I trusted the person I had been traveling with," "we nearly froze," "the gun jammed," "I found my old corpse." Like Rust, the game turns mechanical loss into anecdotes. That is a plausible virality mechanism, not quantified sales attribution.

## R11 — commercial and participation context

DayZ is a paid base game. Livonia is now included in the base game; Frostline is paid expansion content; Badlands is announced future paid content as of this research date. Steam Workshop/community servers can be free or privately operated under their own hosting arrangements; they are not all publisher-operated realms.

Documented milestones must remain definition-specific:

- **January 2015:** Bohemia reported **3 million standalone sales**. [Bohemia](https://www.bohemia.net/en/blog/dayz-hits-3000000-sales).
- **2019:** Bohemia reported more than **1.1 million base-game units sold during 2019** and lifetime **DayZ plus DLC sales above 5.8 million units**, including roughly 400,000 Livonia DLC sales at that time. This is a mixed base+DLC unit measure, not lifetime base-game buyers. [2019 results](https://www.bohemia.net/en/blog/bohemia-interactive-sales-reaching-68-milion-usd-in-2019).
- **Frostline launch, October 2024:** Bohemia/press-release syndication reported more than **300,000 Frostline sales in its first week** and a then-record **500,000 daily players across platforms** around launch; platform-specific daily and concurrent figures were reported separately. These are daily-player/concurrency measures, not sales.
- **December 2024:** official DayZ community material said Frostline had surpassed **520,000 sales** since launch.
- **2025 recap published February 20, 2026:** Bohemia called 2025 record-breaking and reported **650,000+ daily active players across all platforms**. Publisher-defined daily activity is not MAU, unique lifetime users or concurrent players. [2025 recap](https://www.bohemia.net/en/blog/bohemia-interactive-2025-recap).

The Steam Workshop surface is enormous and dynamic; a live item count includes dependencies, updates and overlapping content rather than a clean "number of distinct mods." It is safer to use Bohemia's dated annual "38,000 new mods" claim when discussing 2025 production.

## R12 — reception: substantive written reviews and current player testimony

The five required independent reviews exist, but most are launch/console-era. Their dated technical complaints are preserved as historical experience and **not** assumed current after years of patches.

### 1. PC Gamer — Andy Kelly, December 21, 2018 — 69/100

[Full review](https://www.pcgamer.com/dayz-review/).

PC Gamer argues that other survivors create DayZ's best moments: paranoia, uncertain intent and strange interpersonal stories are stronger than conventional scripted content. It criticizes twitchy gunplay, problematic infected behavior and technical roughness. The review is useful because its main praise—the social tension—remains a durable design claim even though exact bugs and balance date to 1.0.

### 2. Gamereactor — Mike Holmes, January 14, 2019 — 5/10

[Full review](https://www.gamereactor.eu/dayz-review).

Gamereactor acknowledges rare, uniquely intense encounters but finds too much dull traversal/looting, awkward interface/combat and technical annoyance between them. It explicitly questions a game that relies so heavily on players to create the fun. This is a useful warning against treating low encounter density as automatically meaningful tension.

### 3. TheSixthAxis — Jim Hargreaves, June 6, 2019 — PS4, 2/10

[Full review](https://www.thesixthaxis.com/2019/06/06/dayz-ps4-review-console-release/).

TheSixthAxis says interactions with other survivors are the compelling part and imagines the richness of player-made societies, farming, trade and rules. But it strongly criticizes the PS4 release's performance, inventory controls, poor onboarding, infected behavior and long low-value scavenging. Platform-specific technical criticism should stay attached to the 2019 PS4 port, not generalized to 2026 PC.

### 4. PlayStation Universe — John-Paul Jones, June 2019 — PS4, 7/10

[Full review](https://www.psu.com/reviews/dayz-ps4-review/).

PSU provides a more favorable console counterpoint: DayZ is deeply flawed and janky but can produce unusually memorable unscripted stories for patient players. That disagreement is valuable because it locates the taste boundary: some players tolerate roughness to access emergent social drama; others do not.

### 5. 3rd-strike — June 21, 2019 — 6/10

[Full review](https://3rd-strike.com/dayz-review/).

3rd-strike praises the survival/scavenging loop and detailed inventory interactions but criticizes optimization/visual roughness, lack of authored narrative and the possibility that long stretches become boring. The "no story" criticism and player-authored-story praise can both be true depending on what the player expects the game to supply.

### Additional contemporary launch evidence

[Complete Xbox's 2019 review](https://completexbox.co.uk/reviews/dayz-review/) is another independent account: it praised the layered survival systems while noting how difficult it can be for a lone player to reach base-building maturity. It is supplementary rather than needed to reach the five-review minimum.

### Current Steam testimony — September 2026

Steam's current/top/helpful surfaces show that the launch-era debate has not disappeared even though the game has changed dramatically.

- [Current review surface](https://steamcommunity.com/app/221100/reviews/) includes September 2026 positives praising tension and memorable encounters alongside negatives saying new players are dropped into long, empty or confusing sessions.
- [Current/top surface](https://steamcommunity.com/app/221100/reviews/?browsefilter=toprated) contains widely helpful anecdotal reviews built around tiny social incidents—food, fishing, betrayal and friendship—rather than authored quests.
- [Recent negative surface](https://steamcommunity.com/app/221100/negativereviews/) includes long-play 2026 accounts that call the underlying atmosphere/tension brilliant while alleging serious cheating or launcher/server-access problems. These are player reports, not independent measurements of prevalence.
- A September 2026 positive recounts an improvised stranger-assisted run, a weapon jam and eventual death; the reviewer likes the experience while also saying the time investment can feel disproportionate to the dopamine payoff.

Steam ranking is dynamic and playtime shown today may exceed playtime at publication. These accounts are qualitative, self-selected and often humorous. They support the existence of recurring experience patterns, not percentages of satisfied or cheated players.

### Reception synthesis

**Repeated praise**
- uniquely tense human encounters;
- strong sense of place and long-distance survival;
- high emotional value of mundane objects once death is possible;
- memorable emergent narratives;
- deep knowledge mastery;
- community/mod/server variety.

**Repeated criticism**
- long downtime and travel;
- weak onboarding/opaque systems;
- technical/performance/interface problems, especially historically and on some ports;
- clumsy combat/infected behavior in launch-era reviews;
- punishing loss relative to time invested;
- current player allegations around cheating and launcher/server friction.

The central disagreement is not whether DayZ can produce extraordinary stories. It is **how much friction and empty time a player should be asked to pay for the chance of producing one**.

## R13 — transferable inspiration and limits for OpenLegend

These are research interpretations, not accepted product requirements.

### 1. A body can be a causal graph instead of five independent meters

Bleeding, blood, consciousness, hydration, temperature, disease and recovery create diagnosis.

**Why it works:** an injury changes plans rather than merely subtracting HP.  
**Limit:** opaque symptoms can send players to external wikis instead of supporting in-world reasoning.

### 2. Knowledge can be progression without a character level

Knowing where water, shelter, roads and dangerous areas are makes a fresh character materially stronger in the player's hands.

**Potential lesson:** authored worlds can reward learned geography and social knowledge even when a save loses equipment.  
**Limit:** invisible knowledge progression is harder to communicate and can make new players feel arbitrarily punished.

### 3. Compatibility makes objects contextual

A weapon without its ammunition, a blood bag without safe compatibility, or a vehicle without parts creates a **partial solution**.

**Why it works:** finding loot produces new questions rather than closing one.  
**Limit:** too many compatibility tables become inventory clerical work.

### 4. Low encounter frequency amplifies encounters—until it does not

A stranger is terrifying because the world is not a nonstop deathmatch.

**Why it works:** preparation gives the encounter stakes.  
**Limit:** critics repeatedly show the threshold where anticipation turns into boredom. Density needs purpose, not an ideological commitment to emptiness.

### 5. Social interaction is stronger when it happens under material risk

Voice/gesture negotiation is meaningful because neither player is safe while talking.

**Limit:** the same freedom supports harassment, griefing and coercive play. Moderation, blocking/reporting and private alternatives are part of the real system cost.

### 6. Climate can recontextualize existing mechanics

Sakhal's cold/frozen food/archipelago structure changes the meaning of clothing, fire, travel and shelter without replacing the entire game.

**Potential lesson:** a world package can create novelty by changing environmental constraints around shared primitives.  
**Limit:** do not count announced Badlands heat/drought rules as proven until released.

### 7. Persistent places can preserve history across character death

A base/cache can outlive one avatar and become a group memory.

**Limit:** offline raiding/wipes can make persistence feel deceptive if the player expected durable authorship.

### 8. Simulation should produce readable next decisions

The best DayZ systems make the player infer "I am cold and bleeding, so shelter and a bandage outrank loot."

**Limit:** simulation that is only realistic, not legible, becomes arbitrary.

### 9. Modded/community worlds prove the value—and cost—of an extension seam

Community servers can make radically different products from the same survival core.

**Limit:** fragmentation means players must understand which rules are native, server-authored or modded. OpenLegend should make provenance explicit if it ever supports comparable world packages.

## R14 — sources, routes, preservation and requirement map

### Preservation result

G132 is a September 27 survival-expansion addition. Before this dossier was written, the existing games, mechanics, dossiers and seven-packet-derived reference owners were checked for a dedicated DayZ study; none existed. The original seven-file research packet predates this roster addition.

This pass therefore does not overwrite a prior DayZ owner, and it does **not** claim the separate packet-wide P01 reconciliation is complete. [Packet provenance](../references/packet-provenance.md) remains the source for that global boundary.

### Primary/current sources

- **Bohemia Interactive — [DayZ home/news](https://dayz.com/), accessed September 27, 2026.** Current stable/Experimental/news boundary; dynamic page.
- **Bohemia Interactive — [Stable Update 1.29 forum thread](https://forums.dayz.com/topic/266379-stable-update-129/), 2026.** Primary stable changelog and hotfix history.
- **Bohemia Interactive — [PC Experimental updates](https://forums.dayz.com/forum/135-pc-experimental-updates/), accessed September 27, 2026.** Primary evidence that 1.30/motorbikes/UI changes are test content and may change.
- **Bohemia Interactive — [Update 1.25](https://www.bohemia.net/en/blog/dayz-update-1-25), May 27, 2024.** Primary evidence for Livonia entering the base game and new ambient music.
- **Bohemia Interactive — [Update 1.26 / Frostline](https://dayz.com/article/game-update/DayZ-Update-1-26), October 2024.** Primary Frostline-era stable features/map boundary.
- **Bohemia Interactive — [Update 1.28](https://dayz.com/article/game-update/DayZ-Update-1-28), 2025.** Primary current-era vehicle/network work.
- **Bohemia Interactive — [Update 1.14](https://dayz.com/article/game-update/DayZ-Update-1-14), 2021.** Primary contaminated-zone addition; historical current-feature origin.
- **Bohemia Interactive Community Wiki — [Central Economy Configuration](https://community.bistudio.com/wiki/DayZ:Central_Economy_Configuration), accessed September 27, 2026.** Primary/official technical documentation for server economy configuration.
- **Bohemia Interactive — [beta transition](https://www.bohemia.net/en/blog/dayz-enters-beta-on-pc), November 2018.** Primary production/engine/beta scope account.
- **Bohemia Interactive — [1.0 launch](https://www.bohemia.net/en/blog/dayz-10-is-launching-on-december-13-on-steam), December 2018.** Primary standalone release history.
- **Bohemia Interactive — [3 million sales](https://www.bohemia.net/en/blog/dayz-hits-3000000-sales), January 2015.** Publisher-reported standalone sales milestone.
- **Bohemia Interactive — [2019 sales results](https://www.bohemia.net/en/blog/bohemia-interactive-sales-reaching-68-milion-usd-in-2019), 2020.** Publisher-reported 2019/lifetime mixed DayZ+DLC unit milestones.
- **Bohemia Interactive — [2025 recap](https://www.bohemia.net/en/blog/bohemia-interactive-2025-recap), February 20, 2026.** Publisher-reported daily activity, mods, livestreams, platform promotion and enforcement counts. Metric definitions are preserved rather than converted into MAU/revenue.
- **Steam — [DayZ store](https://store.steampowered.com/app/221100/DayZ/), accessed September 27, 2026.** Distribution, base product and current platform surface; price/sentiment are dynamic.

### Independent written criticism

- **PC Gamer — [DayZ review](https://www.pcgamer.com/dayz-review/), Andy Kelly, December 21, 2018.** Full review read; launch PC.
- **Gamereactor — [DayZ review](https://www.gamereactor.eu/dayz-review), Mike Holmes, January 14, 2019.** Full review read; launch-era PC.
- **TheSixthAxis — [DayZ PS4 review](https://www.thesixthaxis.com/2019/06/06/dayz-ps4-review-console-release/), Jim Hargreaves, June 6, 2019.** Full console review read; platform-specific technical claims retained as such.
- **PlayStation Universe — [DayZ PS4 review](https://www.psu.com/reviews/dayz-ps4-review/), John-Paul Jones, June 2019.** Full review read; positive/mixed console counterpoint.
- **3rd-strike — [DayZ review](https://3rd-strike.com/dayz-review/), June 21, 2019.** Full review read; launch-era survival/scavenging and technical criticism.
- **Complete Xbox — [DayZ review](https://completexbox.co.uk/reviews/dayz-review/), 2019.** Supplementary independent console review.

### Direct player testimony

- **Steam Community — [current reviews](https://steamcommunity.com/app/221100/reviews/), [top/helpful](https://steamcommunity.com/app/221100/reviews/?browsefilter=toprated), and [negative](https://steamcommunity.com/app/221100/negativereviews/), accessed September 27, 2026.** Current direct player testimony. Dynamic ranking/self-selection; cheating allegations remain allegations unless separately corroborated.

### Recommended reading/viewing route

1. Read the **beta** and **1.0** Bohemia posts together to understand why "the standalone" is not just the ARMA mod.
2. Read **Update 1.25** and **Frostline/1.26** to see how one base survival model can support temperate and severe-cold worlds.
3. Open the **Stable 1.29** and **Experimental 1.30** pages side-by-side to avoid accidentally documenting motorbikes/UI tests as stable 2026 features.
4. Compare **PC Gamer**, **Gamereactor** and **TheSixthAxis**: all see unique social possibility but disagree on whether waiting, roughness and technical friction are worth it.
5. Sample current Steam positives and negatives for the 2026 version, especially accounts that simultaneously praise atmosphere and criticize time cost/cheating/server friction.
6. For OpenLegend design research, focus on the worked interactions around navigation, condition/compatibility, strangers and persistence rather than copying DayZ's punitive timings.

No video scene, spoken quote or timestamp is represented as watched in this pass.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/player promise | R01, standalone/mod/platform/map/server/version boundaries |
| R02 actions/major mechanics | R02 complete action vocabulary |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 interactions | R05, ten worked situations |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reception/player feedback | R12, five required independent reviews plus current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation | R14 |

### Explicit mechanics-inventory closure

Character identity is a vulnerable survivor rather than a class build; no RPG attributes, XP levels, perk tree, spells, romance or recruitable companion party exists. Progression is equipment, supplies, bodily state, map knowledge, base/vehicle access and relationships. Items/inventory/condition/compatibility; clothing/armor/weapons; crafting/repair; traversal/navigation/vehicles; environmental and object interaction; hunting/fishing/farming/cooking; combat/practical stealth; looting/scarcity; death/permadeath/recovery; informal trade; emergent narrative; communication/restraint; AI infected/animals; official and community maps; environmental hazards/events; base building/storage; multiplayer/server governance; and self-authored endgame/return loops are all addressed above.

**Research boundary:** facts were checked against current/public evidence through September 27, 2026. DayZ's server configurability, mod ecosystem and Experimental branch mean no single community-server rule should be generalized to the stable official baseline. Historical launch reviews remain valuable reception evidence but are not current bug inventories.
