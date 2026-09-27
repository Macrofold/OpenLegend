# G131 — Rust

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Rust is a useful reference because its durable game is not merely hunger, thirst, crafting, or gunplay. It is a **temporary-property social sandbox** in which every useful object can become a reason to travel, fight, bargain, hide, automate, betray, cooperate, or log back in at an inconvenient hour. Bases create attachment but never complete safety; server wipes make accumulation deliberately temporary; proximity voice and server populations turn strangers into both the richest content and the largest source of friction. Its twelve-plus years of live development also make version discipline essential: the current 2026 game contains farming genetics, electricity, industrial automation, clans, rentable apartments and shops, a deep-sea/boat layer, current Blueprint Fragment progression, and many other systems absent from the 2018 launch reviews.

## R01 — identity, scope, versions and player promise

This dossier studies **Rust on PC**, developed and published by Facepunch Studios. Rust first reached players in 2013, entered Steam Early Access in December 2013, and left Early Access on February 8, 2018. Facepunch explicitly said leaving Early Access did not mean development was finished; the team shifted from weekly to monthly stable updates with a separate staging build. The current live service still follows that model. [Leaving Early Access](https://rust.facepunch.com/blog/leaving-early-access/) · [Not a Devblog](https://rust.facepunch.com/news/not-a-devblog).

As of September 27, 2026, the newest monthly PC content update located for this pass is **Breach and Clear**, September 3, 2026. It follows the 2026 Naval Update, Shipshape, Spring Clean, Upgrade hard, raid harder, Built Different, Common Ground and Power Trip. Facepunch's August 27 roadmap is explicitly directional rather than a promise; unreleased roadmap bullets are not treated here as current mechanics. [September update index](https://rust.facepunch.com/news?category=devblog) · [roadmap](https://rust.facepunch.com/roadmap).

The basic promise remains stark: spawn with almost nothing, gather and scavenge, establish shelter, acquire recipes and equipment, contest increasingly dangerous places, defend what you own, raid other players, and eventually lose the world to death, theft or wipe. The island is procedural enough that geography changes between wipes, while monuments and system rules create recognizable strategic landmarks.

### PC versus Console Edition

**Rust Console Edition is a separate product line and is not a source for PC mechanics in this dossier.** Double Eleven's console documentation says PC and Console Edition have separate development teams, roadmaps, restrictions and server features. Console Edition had its own 1.16 patch on September 23, 2026 and its own Public Test Branch process. [Console site](https://rust.double11.com/) · [community-server boundary](https://rust.double11.com/community-servers) · [September 2026 PTB policy](https://rust.double11.com/news/evolving-our-public-test-branch).

Rust Mobile is likewise a separate product, not evidence for PC rules.

### Server rules are part of the product boundary

Rust is not one immutable ruleset. Official, community, modded, Softcore and Hardcore servers can materially change population, gather rates, wipe schedules, map size, group rules, raid windows and other settings. A mechanic described below is vanilla/current PC unless a mode is named.

Facepunch's wipe-timer tooling documents common schedules such as monthly on the first Thursday, weekly and biweekly, but server owners can configure schedules. A **map wipe** destroys the world's built state. Blueprint knowledge can have a different persistence policy. Facepunch's November 2025 progression post specifically noted that most servers at that time did not wipe blueprints, including Facepunch servers, before deliberately performing a blueprint wipe for that experiment. Do not collapse map wipes and blueprint wipes into the same thing. [wipe timer](https://rust.facepunch.com/news/bags-to-battles) · [Pivot or Die](https://rust.facepunch.com/news/pivot-or-die).

## R02 — complete player-action and major-mechanics inventory

### Embodied survival and traversal

A player can walk, sprint, crouch, jump, swim, climb where geometry permits, mount or drive vehicles, pilot air or water craft, interact with deployables, gather by hand or tool, loot containers and bodies, cook, drink, heal, build, repair, wire, pipe, farm, craft, research, trade, talk by text or proximity voice, form teams/clans, and fight players, wildlife or NPC scientists.

Health is joined by environmental and bodily pressures including hunger, thirst, temperature, wetness, bleeding, drowning and radiation. These pressures matter most early or while an expedition is disrupted; in an established base, organized players can provision around many of them. Rust therefore should not be mistaken for a game whose long-term difficulty comes primarily from maintaining calories.

Traversal options have grown far beyond walking: rideable horses, road vehicles assembled from chassis/modules, boats and submarines, trains, hot-air balloons and helicopters all create different cost, noise, exposure and cargo tradeoffs. The **February 2026 Naval Update** added the Deep Sea, floating cities, tropical islands, ghost ships, modular boats, naval missions and new boat AI. **Shipshape** in March let electricity, industrial and water-I/O deployables work on player boats, making a boat a partial moving infrastructure platform rather than only transport. [Naval changelist](https://rust.facepunch.com/changelist/4029) · [Shipshape changelist](https://rust.facepunch.com/changelist/4032).

### Gathering, scavenging and monuments

Wood, stone, metal ore, sulfur ore, high-quality metal and other materials come from the world and processing chains. Roads, monuments, ocean sites, events and hostile NPC spaces provide components, scrap, weapons, cards, fragments and higher-tier loot. Gathering is therefore layered:

1. **low-risk renewable world extraction** — trees, ore nodes, animals and roadside material;
2. **recycling** — components become scrap/materials at recyclers;
3. **puzzle access** — fuses and green/blue/red keycards gate higher-value monument rooms;
4. **timed/event risk** — locked crates, cargo, helicopters, oil rigs and other events attract competitors;
5. **player extraction** — robbery and raiding transfer resources already accumulated by somebody else.

The 2025–26 progression system deliberately reconnects research to contested monuments. See R04.

### Building, authorization, decay and raiding

Construction uses a building plan and hammer to place and upgrade structural blocks. Foundations, walls, floors, roofs, frames, doors, hatches and deployables can be combined into bases ranging from one-room shelters to multi-layer compounds.

A **Tool Cupboard (TC)** establishes building privilege and consumes upkeep resources. Decay means a base is an ongoing liability rather than a permanent saved house. Locks, doors, walls, traps, external defenses, compartmentalization and repair all affect raid cost.

Raiding can use explosives, rockets, explosive ammunition, melee in weak cases and other destructive tools. Attackers reason about likely door/wall paths, construction grades and defenses; defenders reason about airlocks, compartmentalization, loot distribution, online response and replacement cost. Rust therefore produces a security-design metagame without requiring an authored "base puzzle."

The September 2026 **Breach and Clear** update adds current version context including Tool Cupboard upkeep group scaling, HQM nodes and monument blockers. Historical upkeep percentages from older devblogs should not be assumed current. [Breach and Clear](https://rust.facepunch.com/news/breach-and-clear).

### Combat, stealth and information

Rust's combat spans primitive melee/bows, firearms, explosives, mounted weapons, traps and automated defenses. Position, recoil/weapon handling, armor, ammunition, cover, line of sight, healing and team numbers all matter. A wounded player can enter a downed state rather than dying instantly in every case.

There is **no universal stealth meter or stealth skill tree**. Practical stealth comes from crouching, sightlines, darkness, cover, route selection and—critically—sound discipline. Gunshots, footsteps, doors, vehicles, tools and explosions reveal activity. Game Informer's launch review specifically highlighted listening to other players as a core survival activity. [Game Informer review](https://gameinformer.com/games/rust/b/pc/archive/2018/02/13/more-rough-than-diamond.aspx).

### Electricity, water and industrial automation

Electricity arrived in December 2018 with power sources, wiring and logic components such as AND switches, blockers, branches, counters and door controllers. It turned base defense, lighting, sensors and remote control into composable systems rather than binary upgrades. [Electric Anniversary](https://rust.facepunch.com/news/electric-anniversary).

Water I/O later made pumps, containers and sprinklers part of farming infrastructure. The 2023 **Industrial Update** added storage adapters, conveyors, combiners/splitters, a pipe tool, industrial crafters and an electric furnace. Items can therefore move and be transformed automatically according to player-authored logistics rather than every transfer requiring manual inventory work. [Industrial Update](https://rust.facepunch.com/news/industrial-update).

This is not Factorio-style global factory simulation: networks remain embedded inside a vulnerable PvP base whose power, storage and walls can be attacked.

### Farming and genetics

Farming 2.0, April 2020, made crops depend on conditions including water, light, ground state and temperature, and added pumps, hoses, fertilizer, composting, plant genetics, cloning and crossbreeding. It supports specialization and repeatable production rather than "plant seed, wait, collect" only. [Farming 2.0 changelist](https://rust.facepunch.com/changes/16).

Livestock and ecology continue to evolve; the 2026 roadmap discusses more animals and breeding, but any undelivered roadmap details remain future rather than current evidence.

### Trade and services

NPC safe-zone economies, vending machines, drones and player vending create exchange without requiring trust at every transaction. **Common Ground** in July 2026 added an Apartment Complex monument with rentable rooms and rentable player-run shops. Rent is paid in scrap; failure to keep rent funded causes eviction. Shops have inventory/listings and can be taken over after operating periods under the update's rules. The same update introduced a formal Clan system and Clan Table. [Common Ground](https://rust.facepunch.com/news/common-ground).

Softcore in that same update received **2× gathering and raid windows**; these are explicitly Softcore mechanics, not vanilla defaults.

### Useful absent systems

Rust has no conventional authored class selection, attribute sheet, XP level ladder, romance system, recruitable RPG companion roster or quest-driven personal campaign. It has no permanent character "build" in the RPG sense: capability is primarily knowledge, blueprints, gear, infrastructure, geography, group organization and mechanical skill. NPC missions exist, but there is no authored main-story campaign whose completion ends the game.

## R03 — items, entities and composition

### Items and inventory

The inventory is slot-based and carried equipment competes for space. Major families include:

- raw resources and processed building materials;
- components and scrap;
- food, water and medical items;
- clothing and armor;
- primitive weapons, firearms, ammunition and explosives;
- tools for gathering, building, repairing and wiring;
- keycards, fuses and Blueprint Fragments;
- electrical, water and industrial components;
- farming seeds/clones and crop products;
- deployables, traps, storage and defensive devices;
- vehicle modules/fuel/repair materials;
- sellable and tradable goods.

Dropped or looted objects are valuable because acquisition time is transferable: killing a geared player can move hours of accumulated progression in seconds.

### Equipment and compatibility

Armor, clothing and weapons trade protection, visibility, environmental suitability and combat function. Not every attachment fits every weapon; ammunition and weapon class constrain use. Tool access and station level constrain crafting.

Electric systems are compositional because outputs/inputs, power draw, switch logic and sensors can be chained. Industrial systems are compositional because adapters and conveyors connect inventories to crafters or furnaces. Farming is compositional because water, electricity, genetics and spatial conditions jointly determine productivity. These systems reward understanding interfaces between objects rather than only accumulating higher stat numbers.

### Persistence and loss

Most items persist in containers or the world while the server world exists, but can be stolen, destroyed, despawn, decay with their structure, or disappear in a wipe. Death can leave inventory recoverable on the body/bag; another player can reach it first.

Softcore deliberately changes this loss model. Its original design allowed partial recovery through body/reclaim systems; later updates changed additional raid/recovery rules. A Softcore recovery rule should never be described as vanilla Rust.

## R04 — progression, economy, time and return loops

### Current workbench and Blueprint Fragment progression

An older Rust description saying "collect scrap, buy down a tech tree" is incomplete for current 2026 play.

The October 2025 **Meta Shift** introduced a new workbench gate:

- Workbench Level 1 remained unchanged;
- Workbench Level 2 requires **5 Basic Blueprint Fragments**;
- Workbench Level 3 requires **5 Advanced Blueprint Fragments**;
- Basic fragments appear through green/blue puzzle paths and other medium/high-value sources;
- Advanced fragments are tied to higher-tier loot/events;
- 20 Basic Fragments can convert into 1 Advanced Fragment as a fallback.

Facepunch's stated goal was to push progression back into monuments and player conflict. It explicitly acknowledged that larger groups would accumulate fragments more easily and that solos/small groups would have to work harder. [Meta Shift](https://rust.facepunch.com/news/meta-shift).

**Pivot or Die** in November 2025 reacted to controversy by removing workbench scrap crafting costs, reducing research costs, removing the tech-tree tax and performing a blueprint wipe, while retaining the fragment layer. Facepunch also explained a structural problem: on servers where blueprint knowledge persists across map wipes, veterans can skip early/mid research during fresh maps. [Pivot or Die](https://rust.facepunch.com/news/pivot-or-die).

The progression loop is therefore not simply linear. A player can scavenge finished items, research them, follow workbench unlocks, contest fragments, trade, or steal. A wipe can reset physical wealth while leaving some learned capability depending on server policy.

### Scrap and currencies

**Scrap** acts as a major progression/service currency: research, purchases, some rents and other systems use it. It comes heavily from recycling components and monument activity, so "money" is physically connected to exploration and risk.

Rust also contains NPC vendors and player-set vending prices. This is not a unified auction-house economy with one market-clearing price; geography, server politics, drone access and local scarcity matter.

### Time as a resource

Real time matters in several forms:

- furnaces, plants, crafting/industrial processes and upkeep create production clocks;
- monument/event resets create competition timing;
- day/night and environmental conditions change visibility and routing;
- sleeping/offline players and bases remain exposed on persistent servers;
- rent and upkeep can continue while a player is away;
- wipe timing changes the value of late investments.

This produces the famous **offline raid problem**: a player can lose a base while not playing. It also means group coverage and time availability can become strategic advantages independent of FPS skill.

### Death and recovery

Death can mean respawning naked or at a sleeping bag/bed and attempting to recover the corpse. Sleeping bags and beds create a network of recovery points with cooldown/placement constraints rather than a single checkpoint reload.

Softcore alters recovery and raid consequences; Hardcore removes conveniences such as some map/team/safe-zone affordances. Server/mode selection is thus part of difficulty selection.

### Endgame

There is no authored final boss or permanent victory state. "Endgame" is social and wipe-relative: high-tier gear, raid capability, defended compounds, control of monuments/routes, naval capability, automation and clan power. Wipes are not merely maintenance; they are **season-like return moments** that recreate the beach-to-dominance race.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations grounded in current documented systems.

### Case 1 — a fragment run turns progression into PvP geography

**Intention:** unlock a Level 2 or Level 3 workbench.  
**Conditions:** the group lacks enough required Blueprint Fragments.  
**Actions:** choose a monument route, carry fuse/keycards where required, solve the access sequence, loot the puzzle/event, and extract.  
**Interaction:** progression items are intentionally concentrated in contested world spaces; other groups can infer the same incentive.  
**Result:** the group advances its workbench or loses its run to rivals.  
**Next decision:** bank fragments, trade them, risk another monument immediately, or convert Basic fragments toward Advanced.  
**Limit:** large groups can cover and repeat monuments more easily, a disparity Facepunch itself acknowledged.

### Case 2 — one gunshot rewrites an expedition

**Intention:** farm ore away from base.  
**Conditions:** the player carries tools and a growing inventory but hears nearby automatic fire.  
**Actions:** stop noisy gathering, use terrain and sound to infer range/direction, choose whether to retreat, observe or third-party the fight.  
**Interaction:** sound converts an unseen player action into strategic information.  
**Result:** the safest route may become abandoning a valuable node to protect already-carried value.  
**Next decision:** deposit, flank, call teammates, or exploit corpses after combat ends.

### Case 3 — a base circuit turns information into defense

**Intention:** know when an exterior approach is breached.  
**Conditions:** the base has power and appropriate electrical sensors/logic.  
**Actions:** wire power through sensing/logic components to alarms, lights, doors or other outputs.  
**Interaction:** the same base pieces that consume resources become a player-authored detection network.  
**Result:** defenders receive earlier warning or automate a response.  
**Limit:** electricity is not invulnerable magic; exposed components, power sources and the containing structure can be attacked.

### Case 4 — industrial automation creates a new raid target

**Intention:** reduce repetitive ore/item hauling inside a large base.  
**Conditions:** storage adapters, conveyors/pipes and production devices are installed.  
**Actions:** route inputs from storage through filters to furnaces/crafters and outputs to destination containers.  
**Interaction:** automation reduces labor but concentrates valuable flows into predictable infrastructure.  
**Result:** the base becomes more efficient while intact.  
**Next decision:** protect or duplicate critical routes because a raid can disable the whole chain.  
**Transferable lesson:** convenience can create **new dependencies** rather than simply removing gameplay.

### Case 5 — genetics make a crop line worth defending

**Intention:** establish a reliable high-output farm.  
**Conditions:** planters have water/light/temperature support and the player has seeds/clones.  
**Actions:** grow candidate plants, inspect traits, clone/crossbreed useful specimens, route water and repeat.  
**Interaction:** biological selection, electrical/water infrastructure and base security meet in one production loop.  
**Result:** a productive genetic line saves future farming effort.  
**Limit:** its value remains contingent on the base surviving and the wipe not erasing the world.

### Case 6 — a rental room buys a temporary foothold

**Intention:** get secure-ish storage early in a wipe without first completing a full base.  
**Conditions:** the July 2026 Apartment Complex is available and the player can pay scrap rent.  
**Actions:** rent a room, fund the rent slot, use provided room features/storage, continue gathering.  
**Interaction:** a monument becomes temporary housing and an economic sink.  
**Result:** the player trades scrap for reduced construction friction.  
**Next decision:** keep paying, transition to a player-built base, or risk holding valuables there.  
**Counterpressure:** the update includes a master-key mechanic and eviction; rental is not absolute safety.

### Case 7 — a Softcore raid window changes social scheduling

**Intention:** maintain a base without being vulnerable to building raids all day.  
**Conditions:** the player deliberately chose a Softcore server using the July 2026 default raid-window behavior.  
**Actions:** organize defenses and offensive plans around the allowed period.  
**Interaction:** server rules constrain when base structures can be attacked under TC protection outside the window.  
**Result:** real-life availability becomes less dominant than in unrestricted vanilla raiding.  
**Boundary:** this is Softcore/server-configurable behavior, not a universal Rust rule.

### Case 8 — a modular boat becomes a mobile expedition platform

**Intention:** exploit Deep Sea content without returning to shore after every task.  
**Conditions:** current 2026 Naval systems and a suitably built player boat.  
**Actions:** configure modules, carry supplies, travel to offshore areas, and place supported electricity/industrial/water I/O after Shipshape.  
**Interaction:** transport, storage, production and combat exposure move together.  
**Result:** the boat extends operational range while creating one expensive, visible asset that can be damaged or contested.  
**Next decision:** specialize for cargo, combat, processing or mobility rather than maximize everything.

### Case 9 — wipe changes the meaning of optimization

**Intention:** decide whether to build one more elaborate production wing late in a wipe.  
**Conditions:** the server's next map wipe is near.  
**Actions:** compare remaining time with construction/automation cost and expected use.  
**Interaction:** a known reset horizon changes the payoff of permanence.  
**Result:** players may spend stockpiles on raids, experiments or risky projects instead of compounding infrastructure.  
**Next decision:** optimize the current world or convert resources into memorable conflict before reset.

### Case 10 — trust creates content no authored quest can guarantee

**Intention:** trade or cooperate with a stranger encountered through proximity voice.  
**Conditions:** both parties can attack and loot each other; neither has reliable knowledge of intent.  
**Actions:** speak, expose or conceal equipment, negotiate, move together or separate.  
**Interaction:** communication runs directly against material incentives for betrayal.  
**Result:** alliance, trade, ambush, hostage-like play, revenge or a longer relationship can emerge from the same rules.  
**Limit:** the same openness enables harassment and bigotry; "emergent social content" is not automatically healthy content.

## R06 — people, AI, social systems and multiplayer

Rust's central "character system" is other players.

### Teams and clans

Small teams support coordination and map identification. The July 2026 **Clan** system is a more formal layer with larger membership, roles/permissions, clan chat, announcements and map/nameplate affordances; clans are created/managed at Clan Tables and are disabled in Hardcore. [Common Ground](https://rust.facepunch.com/news/common-ground).

A social role can emerge from system mastery rather than a class selection: builder, electrician, farmer, monument runner, pilot, PvP specialist, organizer or trader. These roles are fluid because the character sheet does not lock them.

### Proximity communication and information asymmetry

Voice and text let players negotiate in the same world where they can kill and loot. Identity is weakly guaranteed compared with party RPGs; a "friendly" statement is cheap. Trust therefore develops through repeated behavior, shared enemies, codes/doors, resource access and reputation within a server community.

This asymmetry is a major reason Rust creates memorable anecdotes—and a major safety/moderation burden.

### NPCs and wildlife

Animals, scientists, monument defenders, vendor NPCs and other AI provide PvE pressure and services. AI behavior has been repeatedly revised; for example the 2018 electricity update also described scientist AI changes, and the 2026 Naval Update includes new Oil Rig/boat AI. Rust is not, however, an NPC society simulator with deep daily schedules and personal relationships. NPCs are primarily threats, services, mission sources or world structure.

### PvE and alternative server communities

Community/modded servers can create PvE-heavy or custom experiences, but those should not be projected onto vanilla official PvP. Server choice is one of Rust's most important meta-actions because the social contract may differ more between two servers than a weapon stat does between two patches.

## R07 — art, audio, interface and feel

Rust uses a first-person presentation where **legibility of danger** often matters more than spectacle.

- Natural spaces, monuments and player-built silhouettes make territorial change visible: a quiet coast can become a fortress skyline over a wipe.
- Building grades and damage communicate security/material investment.
- Weapon, footstep, door, vehicle and explosion audio are strategic signals. Game Informer's reviewer specifically praised the need to listen for other players.
- Proximity voice localizes social interaction in space; a voice behind a wall means something different from global chat.
- The inventory/crafting/building interfaces expose a great deal of state. Launch criticism from GameSpot and Game Informer found menus/crafting tedious or difficult; current systems have accumulated many quality-of-life passes, but complexity remains real.
- Facepunch's June 2026 Built Different update delivered its largest player-model/animation overhaul in years, so launch-era complaints about character models should not be treated as current visual assessment. [2026 devblog index](https://rust.facepunch.com/news?category=devblog).

Rust's feel depends heavily on **stakes-induced perception**. A footsteps sound is emotionally louder because the listener may be carrying valuable loot; an ordinary door opening can signal a raid. Systems supply the stakes, audio supplies the warning.

Accessibility/friction is highly server- and mode-dependent. Softcore reduces some loss/raid pressure; modded servers may accelerate resources; Hardcore intentionally removes conveniences. These are not merely difficulty sliders because each changes the social ecology.

## R08 — story, narrative and connection to play

Rust has environmental/lore fragments, monuments, scientists and recurring world events, but it does not organize play around a conventional authored protagonist arc. The durable narrative unit is the **wipe story**:

- where a player first settled;
- who killed or helped them;
- which rival group became important;
- how the base evolved;
- which raid succeeded or failed;
- what was lost;
- what the group chose to do before reset.

Facepunch has periodically added more explicit lore-bearing monuments/events, but the game's strongest stories remain player-produced.

This has an important design limit: "players make the story" can excuse a vacuum if the world supplies no meaningful affordances. Rust works because the social canvas is backed by concrete valuables, geography, architecture, detection, scarcity, time and irreversible transfer. Betrayal matters because there is something costly to betray.

## R09 — production and development

Rust is unusually well documented as a game that **changed identity through live experimentation**.

Facepunch says the project started in 2013, first tested in a browser and then entered Steam Early Access in December. Garry Newman described Early Access as a way to explore direction with an active player base rather than execute a fixed blueprint. Zombies were removed after the team judged them superfluous. [Leaving Early Access](https://rust.facepunch.com/blog/leaving-early-access/).

The game's historical timeline records repeated system replacement rather than simple accumulation: the "Legacy" form was rebooted onto a better foundation; building and blueprint systems were repeatedly redesigned; XP arrived and later disappeared; research returned; Building 3.0, electricity, vehicles, farming, industrial automation and later progression changes substantially altered the game. [10 Years of Rust](https://rust.facepunch.com/rust10).

Producer Alistair McFarlane's tenth-anniversary message says Rust evolved around player feedback and was not the game originally intended. That is a primary self-account, not proof every popular feature came from players, but it explains why old mechanics references are especially unsafe.

Leaving Early Access also changed release discipline. Facepunch moved from weekly stable updates to monthly releases and kept a staging build so larger work could be tested without treating every experiment as stable. The January 2026 retrospective again promised monthly updates on the first Thursday. [Surviving 12 Years](https://rust.facepunch.com/news/surviving-12-years).

The 2025 Blueprint Fragment experiment is a particularly useful production case: Facepunch publicly called it experimental, described its goal, acknowledged group-size consequences, received controversy, and adjusted surrounding costs one month later rather than pretending the first version was final.

## R10 — marketing, distribution, promotion and virality

Rust's distribution began with browser testing and then Steam Early Access, followed by full PC release. Console Edition came later through Double Eleven and remains separate.

Its discovery loop is unusually creator-compatible because a session naturally generates legible stories: naked starts, raids, betrayals, improbable diplomacy, trap bases, large builds and comeback arcs. Facepunch amplified that with:

- official Community Updates showcasing player art, builds, stories and videos;
- Steam Workshop and community skins;
- Twitch Drops, first recorded in Facepunch's 2020 timeline;
- repeated **Twitch Rivals** events;
- creator-specific drops and event partnerships;
- a large mod/server ecosystem;
- monthly updates that create recurring "what changed this wipe?" moments.

The tenth-anniversary page reports more than 75 million Twitch Drops claimed and 194,000+ drops-enabled channels at that historical capture. Those figures are Facepunch-published milestones, not unique-player counts. [10 Years of Rust](https://rust.facepunch.com/rust10).

The July 2026 charity drive again paired creator streams and Twitch Drops with an in-game item campaign. [Common Ground](https://rust.facepunch.com/news/common-ground).

**Interpretation:** Rust's shareability comes from compressible social incidents more than cinematic marketing alone. "We trusted a stranger and lost the base" is a complete story premise. That is a hypothesis about why clips/videos travel, not measured attribution for sales.

## R11 — commercial and participation context

Rust is a paid PC game with continued paid optional content/store activity and no required subscription for the base PC product. Steam lists in-app purchases. Facepunch sells cosmetic skins and themed item/content packs; ownership requirements can affect whether a DLC-associated item can be researched/crafted, as reflected in current changelogs. Monetization should therefore be described item-by-item rather than flattened into either "purely cosmetic" or "pay to win."

Facepunch's 2023 tenth-anniversary statistics reported:

- **16,000,000+ PC copies sold**;
- **244,000+ peak player count**;
- **150,000+ peak-player average per month** as Facepunch labeled it;
- **124,000+ Steam Workshop items**;
- **1,000,000+ Steam reviews**;
- large Twitch/community counts.

These are historical publisher-reported milestones with different units. They are not 2026 lifetime totals, revenue, monthly active users, profit or retention. [10 Years of Rust](https://rust.facepunch.com/rust10).

Steam's current store/review surface in September 2026 remains heavily active, but changing review totals and percentage snapshots should be treated as dated captures rather than permanent commercial facts.

Support obligation is substantial: a long-running persistent multiplayer game needs anti-cheat, server/service maintenance, platform support, performance work, moderation tooling, patch compatibility and continual balance work. Facepunch's monthly update history shows that the operating burden is not exhausted by shipping content.

## R12 — five substantive reviews plus current player feedback

The reviews below are **independent qualitative accounts**, not votes to average. Most professional launch reviews describe February 2018 Rust; current Steam samples are necessary because the system set has changed dramatically.

### 1. PC Gamer — Luke Winkie, February 19, 2018

[Full review](https://www.pcgamer.com/rust-review/).

PC Gamer rated Rust 80 and treated its cruelty as the source of both frustration and exceptional stories. The review values betrayal, greed, social improvisation and the psychological tension of PvP survival. It also stresses hostility, weak onboarding and toxic/racist/misogynistic behavior. This is useful evidence that the social sandbox was already the central attraction at launch, but it predates electricity, current farming, industrial automation, current progression and 2026 naval systems.

### 2. GameSpot — Alessandro Barbosa, February 17, 2018

[Full review](https://www.gamespot.com/reviews/rust-review-life-is-fleeting/1900-6416858/).

GameSpot rated it 3/10. Barbosa found the opening vulnerability intriguing and the island sometimes beautiful, but argued that bodily survival lacked depth, progression rewarded time investment over cleverness, crafting/menu work was tedious and accumulated work could disappear too arbitrarily. The review is an important counterweight to "loss automatically creates meaning": for this critic, the cost of rebuilding overwhelmed the value of the stories.

### 3. Destructoid — Ray Porreca, February 19, 2018

[Full review](https://www.destructoid.com/reviews/review-rust/).

Destructoid frames the game around a fatalistic cycle: everyone begins vulnerable and every server world ultimately ends in a wipe. It treats the social sandbox, settlements, theft and betrayal as the real content and sees the reset as part of the identity rather than merely a technical inconvenience. The review is especially useful for understanding why temporary ownership can create purpose.

### 4. Multiplayer.it — Mattia Armani, February 11, 2018

[Full review](https://multiplayer.it/recensioni/194937-rust-la-recensione-di-rust.html).

Multiplayer.it's 8.5/10 review emphasizes the brutal climb from rock to shelter to increasingly elaborate fortification, scavenged/aerial loot, useful blueprints and organized raiding. It also recognizes vending/trade and server variation as alternatives to pure murder. Criticism includes repetition, harsh community behavior and the contradiction between long labor and wipe-driven impermanence.

### 5. Game Informer — Javy Gwaltney, February 13, 2018

[Full review](https://gameinformer.com/games/rust/b/pc/archive/2018/02/13/more-rough-than-diamond.aspx).

Game Informer scored Rust 6.5 and found the trust/betrayal "Wild West" premise fascinating. It specifically praises sound as survival information. Lag, glitches, crafting/menu friction and severe player toxicity eroded that promise. The useful disagreement with PC Gamer/Destructoid is not whether emergent stories exist; it is whether the friction surrounding them is worth paying.

### Current Steam helpful surfaces — September 2026

Steam's current player testimony still shows the same core tension but adds version-specific complaints.

[Positive helpful surface](https://steamcommunity.com/app/252490/positivereviews/) includes an August 2026 account describing the loop from beach vulnerability to base attachment, footsteps/raid fear, improvised alliances and the feeling that an expedition carries one's "bank account" into danger. [Current mixed/helpful surface](https://steamcommunity.com/app/252490/reviews/?browsefilter=trendmonth&l=english&p=1) includes September testimony praising wipes as fresh experiences and friend-group memories while warning about toxicity and harsh lows.

That same September surface also contains long-play criticism of **Blueprint Fragments**, arguing that the system hurts solos/small groups more than clans, and criticism that feature expansion is outpacing performance optimization. A current general review surface contains another long-play negative saying recent mechanics increasingly punish solos/duos. [Current English surface](https://steamcommunity.com/app/252490/reviews/?l=english).

The [negative-only surface](https://steamcommunity.com/app/252490/negativereviews/) contains 2026 complaints about building placement friction and the emotional cost of regular wipes despite liking the crafting paths.

These samples are not prevalence estimates. Steam "helpful" ranking changes, playtime is displayed at retrieval time rather than necessarily publication time, humor/sarcasm is common, and allegations such as cheating prevalence require separate evidence.

### Reception synthesis

Across very different tastes, a durable pattern survives:

**Praised:** unusually consequential player encounters; high tension around carried goods and bases; expressive construction; group stories; freedom to negotiate or betray; long mastery curve; recurring freshness from wipes.

**Criticized:** toxicity/harassment; severe solo/small-group disadvantage on some servers; cheating/performance concerns; loss that can feel disproportionate to agency; time commitment/offline vulnerability; accumulated interface/system complexity; progression changes that can intensify clan advantages.

The lesson is not "hardcore loss is good." It is that **loss is most compelling when players can understand the risk, choose exposure, develop counterplay, and generate a story from the result**. Rust repeatedly crosses—and sometimes violates—that line.

## R13 — transferable inspiration and limits for OpenLegend

These are research interpretations, not accepted product requirements.

### 1. Temporary ownership can increase object meaning

A rifle, crop clone or base room matters because it is useful **and losable**. Persistent worlds do not need everything to be permanent to make attachment real.

**Dependency:** players need comprehensible ways to protect, replace or knowingly risk the asset.  
**Failure mode:** offline destruction or extreme group asymmetry can turn attachment into avoidance.

### 2. Infrastructure should create relationships between systems

Electricity, industrial routing, farming and naval building are useful because each touches storage, risk, travel and defense. A "new crafting station" is less interesting than a device that changes several decisions.

**Limit:** every extra dependency creates UI and maintenance complexity.

### 3. Geography can own progression

Blueprint Fragments make world locations matter to character capability. Progress is not only a menu.

**Limit:** location-gated progress can be monopolized by large groups. Rust's own developer note and current player criticism make this an explicit caution.

### 4. Communication becomes gameplay when incentives are uncertain

Proximity voice can create diplomacy because cooperation and betrayal are both materially possible.

**Limit:** open voice also enables abuse. Safety, moderation, blocking/reporting and alternatives are part of the mechanic's real cost.

### 5. Resets can be authored return loops

A wipe gives experienced players a reason to revisit low-tier tools, uncertain neighborhoods and fresh politics.

**Limit:** forced loss works for a game built around impermanence. It should not be transplanted into a character-centered authored world whose promise is durable personal history.

### 6. Server rules can express different social contracts

Softcore raid windows and accelerated gathering change who can participate, not merely how much damage enemies deal.

**Potential OpenLegend analogue:** world authors could control persistence, loss and social exposure as coherent rule bundles.  
**Do not copy:** dozens of poorly explained toggles that fracture expectations.

### 7. Player-authored security is a story engine

A base encodes fear, previous attacks, group size and resource priorities. An attacker reads that history indirectly.

**Limit:** if optimal geometry collapses into one solved meta, expression becomes mandatory busywork.

### 8. Automation is most interesting when it changes vulnerability

Rust's industrial system saves labor but gives raiders concentrated infrastructure to break. Convenience has consequences.

**Limit:** tedious manual work should not be preserved solely so automation can later remove it.

### 9. Development can expose experiments honestly

Facepunch labels progression experiments and describes goals/tradeoffs publicly, then revises them.

**Limit:** live experimentation is easier in a wipe-based service than in a world where a rule change can invalidate permanent authored history.

## R14 — sources, routes, preservation and requirement map

### Preservation result

G131 was added in the September 27 survival expansion. Before writing this dossier, the branch's existing **games/** and **mechanics/** directories and the seven-packet-derived reference owners were checked for a dedicated Rust study. No prior Rust chapter, mechanics owner or packet passage was found; substring hits such as "trust" or unrelated text are not prior Rust research. Therefore this dossier does not silently replace an earlier dedicated owner.

The source packet predates G131's addition. [Packet provenance](../references/packet-provenance.md) remains the owner of the seven supplied files and their preservation boundary. This per-game pass does **not** claim the separate global P01 packet reconciliation is complete.

### Annotated primary/current sources

- **Facepunch — [Leaving Early Access](https://rust.facepunch.com/blog/leaving-early-access/), January 22, 2018.** Primary production history: browser origin, December 2013 Steam Early Access, February 8, 2018 release plan, active-player experimentation, zombie removal, monthly/staging transition. Developer self-account.
- **Facepunch — [10 Years of Rust](https://rust.facepunch.com/rust10), 2023 retrospective, accessed September 27, 2026.** Primary timeline and publisher-reported historical commercial/community milestones. Counts are dated and not current MAU/revenue.
- **Facepunch — [Surviving 12 Years](https://rust.facepunch.com/news/surviving-12-years), January 1, 2026.** Primary recent retrospective and monthly-update commitment.
- **Facepunch — [Meta Shift](https://rust.facepunch.com/news/meta-shift), October 2, 2025.** Primary current progression rationale/rules for Blueprint Fragments; developer intent is attributed rather than treated as measured effect.
- **Facepunch — [Pivot or Die](https://rust.facepunch.com/news/pivot-or-die), November 6, 2025.** Primary follow-up progression changes and blueprint-persistence discussion.
- **Facepunch — [Farming 2.0 changelist](https://rust.facepunch.com/changes/16), April 2, 2020.** Primary plant-genetics, water, fertilizer and farming-system record.
- **Facepunch — [The Electric Anniversary](https://rust.facepunch.com/news/electric-anniversary), December 6, 2018.** Primary electricity introduction and component examples.
- **Facepunch — [Industrial Update](https://rust.facepunch.com/news/industrial-update), February 2, 2023.** Primary industrial logistics/automation introduction.
- **Facepunch — [Naval Update changelist](https://rust.facepunch.com/changelist/4029), February 5, 2026.** Primary delivered 2026 naval features.
- **Facepunch — [Shipshape changelist](https://rust.facepunch.com/changelist/4032), March 5, 2026.** Primary boat-building/infrastructure follow-up.
- **Facepunch — [Common Ground](https://rust.facepunch.com/news/common-ground), July 2, 2026.** Primary Apartment Complex, rentable shops, Clan system and explicitly Softcore raid-window/gather-rate changes.
- **Facepunch — [Breach and Clear](https://rust.facepunch.com/news/breach-and-clear), September 3, 2026.** Primary latest monthly update boundary located for this pass.
- **Facepunch — [2026 roadmap](https://rust.facepunch.com/roadmap), updated August 27, 2026.** Primary planning document. Explicitly non-binding; future bullets are not current mechanics.
- **Double Eleven — [Rust Console Edition](https://rust.double11.com/) and [Community Servers](https://rust.double11.com/community-servers), accessed September 27, 2026.** Primary evidence for separate console release/version/roadmap/server boundaries.

### Independent criticism and player evidence

- **PC Gamer — [Rust review](https://www.pcgamer.com/rust-review/), February 19, 2018.** Full launch review read.
- **GameSpot — [Rust Review: Life Is Fleeting](https://www.gamespot.com/reviews/rust-review-life-is-fleeting/1900-6416858/), February 17, 2018.** Full launch review read.
- **Destructoid — [Review: Rust](https://www.destructoid.com/reviews/review-rust/), February 19, 2018.** Full launch review read.
- **Multiplayer.it — [La recensione di Rust](https://multiplayer.it/recensioni/194937-rust-la-recensione-di-rust.html), February 11, 2018.** Full Italian review read; findings paraphrased rather than machine-translated at length.
- **Game Informer — [Rust Review: More Rough Than Diamond](https://gameinformer.com/games/rust/b/pc/archive/2018/02/13/more-rough-than-diamond.aspx), February 13, 2018.** Full launch review read.
- **Steam Community — [positive helpful](https://steamcommunity.com/app/252490/positivereviews/), [monthly helpful mixed](https://steamcommunity.com/app/252490/reviews/?browsefilter=trendmonth&l=english&p=1), [English mixed](https://steamcommunity.com/app/252490/reviews/?l=english), and [negative-only](https://steamcommunity.com/app/252490/negativereviews/) surfaces, accessed September 27, 2026.** Direct player testimony. Dynamic ranking, displayed current playtime, humor and self-selection prevent prevalence claims.

### Recommended reading/viewing route

1. Read **Leaving Early Access** for how Facepunch describes the mutable product philosophy.
2. Read the **10 Years** timeline to see how much of modern Rust did not exist at 2018 release.
3. Read **Meta Shift** then **Pivot or Die** back-to-back; they are a rare primary record of a live progression experiment and immediate adjustment.
4. Read **Common Ground** for how one update can add housing, commerce, formal groups and a separate Softcore social contract.
5. Compare PC Gamer, GameSpot and Game Informer. They agree that social encounters matter while sharply disagreeing on whether surrounding friction justifies the experience.
6. Sample current Steam helpful positive and negative surfaces to see which 2018 arguments survived into the 2026 system set.
7. For systems work, inspect **Electric Anniversary**, **Farming 2.0**, **Industrial Update**, **Naval Update** and **Shipshape** as a sequence of increasingly composable infrastructure.

No YouTube scene or timestamp is represented as watched in this pass. Embedded videos on official pages are metadata/navigation unless a written page independently establishes the finding.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/player promise | R01, including PC/Console/server/mode boundaries |
| R02 actions/major mechanics | R02 full action inventory |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04, current Blueprint Fragment boundary |
| R05 concrete interactions | R05, ten worked cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play connection | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation context | R11 |
| R12 reviews/player feedback | R12, five independent written reviews plus current Steam samples |
| R13 transferable inspiration/limits | R13 |
| R14 sources/routes/preservation/navigation | R14 |

### Explicit mechanics-inventory closure

Character creation is minimal/randomized avatar identity rather than a class builder; there are no RPG attributes, skill points, level ladder, romance system or persistent recruitable companions. Progression is blueprints/workbenches/fragments, gear, infrastructure, geography, group organization and player skill. Items/inventory, weapons/armor, crafting/research/upgrading, traversal/vehicles, environmental interaction, farming, electricity, industrial automation, activities/monuments/events, combat, practical stealth, looting, death/recovery, trade, social communication, teams/clans, NPC AI, map/biomes/monuments, building/base management, server/multiplayer rules and wipe-relative endgame are all addressed above. "Magic" is absent; electricity/industrial logic is technological, not a renamed spell system.

**Research boundary:** current web evidence was checked through September 27, 2026. Rust changes monthly, server configuration can override substantial rules, and historical critic reviews cannot establish current balance or performance. The dossier therefore dates live-service claims and preserves mode/server qualifiers instead of manufacturing one timeless ruleset.
