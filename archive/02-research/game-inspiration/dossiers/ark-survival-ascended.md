# G134 — ARK: Survival Ascended

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

ARK: Survival Ascended is not merely ARK: Survival Evolved with a newer renderer. It deliberately keeps the same creature-taming, tribe, building, breeding and boss-progression skeleton, but it has become a distinct live product through **Unreal Engine 5 world simulation, rebuilt construction and utility networks, cross-platform modding, wild babies, creature Traits, paid creature/content layers, official-partner maps, Lost Colony's survivor/Thrall progression, and 2026 ship progression**. Its history is also a warning about researching roadmaps as though they were delivered features: multiple major maps moved months from their announced dates, and the September 2026 game differs substantially from the January 2025 schedule.

This dossier studies **ARK: Survival Ascended (ASA)** independently. ARK: Survival Evolved (ASE), Aquatica and its older official-server history are G133 context, not a substitute for ASA evidence.

## R01 — identity, current release state, platforms and delivered-content boundary

Studio Wildcard released ARK: Survival Ascended into PC Early Access on October 25, 2023. Xbox Series and PlayStation 5 versions followed in November 2023. The current Steam review surface still labels reviews **Early Access** in September 2026, so this dossier does not silently treat the product as having reached a final 1.0 state. [Steam](https://store.steampowered.com/app/2399830/ARK_Survival_Ascended/) · [PC Gamer launch context](https://www.pcgamer.com/6-years-after-ark-survival-evolved-left-early-access-ark-survival-evolveds-remaster-enters-early-access/).

ASA was rebuilt on Unreal Engine 5 with Nanite/Lumen-era rendering, dynamic water, denser/interactable foliage, new physics/audio presentation, revised map geometry and a broad quality-of-life pass. The survival promise remains recognizable: start vulnerable, gather, craft, level, tame/breed creatures, build a persistent home, cooperate or compete in tribes, collect Artifacts/defeat bosses and climb toward Tek/Ascension.

### The pricing/replacement controversy is part of the product history

Wildcard initially discussed ASA as a free upgrade, then announced it as a paid ARK 2 bundle, then changed the commercial structure after backlash. PC Gamer's July 2023 coverage preserves that sequence. The original ASE official network was shut down in September 2023, making ASA the publisher-operated official-server future while ASE continued through unofficial/local play. [PC Gamer](https://www.pcgamer.com/arks-remaster-has-been-delayed-will-release-with-a-launch-discount/).

That history matters for reception: veteran criticism about "buying ARK again" is not merely resistance to graphical change; it is tied to the service migration.

### Current delivered maps/content through September 27, 2026

The safe current inventory is **delivered content, not the old roadmap**.

Free/remastered canonical or ASE-origin maps delivered in ASA include:
- The Island — launch, October 2023;
- Scorched Earth — 2024;
- The Center — 2024;
- Aberration — 2024;
- Extinction — December 2024;
- Ragnarok Ascended — June 18, 2025;
- Valguero Ascended — October 7, 2025;
- Genesis Ascended Part 1 — released July 2026 as free DLC.

Additional ASA-specific paid/current content includes:
- **Bob's Tall Tales**, a premium adventure-pack line adding map-linked equipment, structures, creatures and systems;
- **Fantastic Tames**, separately monetized creature additions/seasonal packs;
- **Astraeos**, an Official Partner DLC by Nekatus, launched February 14, 2025 and expanded afterward;
- **ARK: Lost Colony**, paid story expansion launched December 19, 2025;
- **ARK Tides of Fortune**, paid Bob-adventure/naval content launched with Genesis Part 1 in July 2026.

[Studio Wildcard — Astraeos live](https://survivetheark.com/index.php?/forums/topic/771425-astraeos-and-love-ascended-are-live/) · [Lost Colony live](https://survivetheark.com/index.php?/forums/topic/773450-ark-lost-colony-is-now-live/) · [Genesis/Tides date](https://survivetheark.com/index.php?/forums/topic/773950-community-crunch-512-preparing-to-set-sail/).

### Roadmap items still future are not imported

A January 2025 roadmap predicted Ragnarok in April 2025, Valguero in August 2025, Genesis Part 1 in April 2026, Genesis Part 2 in August 2026 and Fjordur in December 2026. Delivered dates already diverged substantially: Ragnarok arrived in June, Valguero in October, and Genesis Part 1 in July 2026. [January 2025 roadmap](https://survivetheark.com/index.php?/forums/topic/769553-community-crunch-440-ark-survival-ascended-content-roadmap/).

As of this September 27 research checkpoint, no reliable official evidence located for this pass establishes **Genesis Ascended Part 2 or Fjordur Ascended as released**. They remain future/roadmap context until a delivery announcement says otherwise. The roadmap is evidence of intent, not current capability.

### Current engine boundary

ASA upgraded to **Unreal Engine 5.5 in June 2025**. Wildcard said the upgrade brought performance, bug-fix and quality-of-life work while continuing storage improvements such as optional-map packaging. [UE 5.5 announcement](https://survivetheark.com/index.php?/forums/topic/772419-asa-unreal-55-upgrade-anniversary-event-and-astraeos-update/).

## R02 — player actions and major mechanics

### Shared ARK survival core

ASA retains the recognizable ARK action vocabulary:

- create a survivor;
- gather wood, stone, fiber, metal and special resources;
- craft tools, weapons, armor, saddles and structures;
- eat/drink and manage temperature, stamina, oxygen and hazards;
- earn levels and assign survivor attributes;
- spend Engram Points on recipes;
- tame, ride, command, breed and imprint creatures;
- build persistent bases and production infrastructure;
- farm/cook;
- loot supply drops/caves/events;
- join tribes and assign permissions;
- fight wildlife, bosses and players;
- recover dropped inventory after death;
- move through primitive, industrial and Tek technology;
- transfer among maps/server clusters where rules allow.

Those shared mechanics are described deeply in G133. The rest of this section emphasizes **ASA's independent changes and additions**.

### Rebuilt building system

ASA's construction pass significantly changes everyday base authoring:

- structure categories consolidate variants such as walls/doors/windows into fewer craft items with selectable forms;
- snapping/placement is more flexible;
- placed structures can generally be picked back up without ASE's narrow pickup window;
- quarter-height and other additional building forms expand shape options;
- foundations/support and terrain placement are more forgiving;
- map/interface support for placement is clearer.

Gamereactor and PSX Brasil both independently singled out construction as one of the most meaningful improvements over ASE.

This matters because a quality-of-life change can increase **creative vocabulary** rather than merely shorten clicks: when pieces are easier to reposition and variants are unified, experimentation costs less.

### Wireless irrigation and electricity

One of ASA's most consequential simplifications is that bases no longer require the same visible cable/pipe networks used in ASE. Generators and water infrastructure create functional ranges, letting compatible devices operate within supported areas rather than requiring a continuous physical cable/pipe path.

That removes a classic "spaghetti" logistics puzzle. It also means ASA should not be used as evidence for ASE's electrical/irrigation topology.

The tradeoff is instructive: reducing connection busywork improves base usability but removes some spatial routing decisions.

### Taming, wild babies and creature AI

Classic knockout/passive/special taming remains, but ASA added **wild baby creatures**. Babies can appear with adults and create new acquisition situations: killing/losing a parent can make an orphan claimable where relevant, and the environment feels less like a set of adult spawn tokens.

Gamereactor explicitly praised wild babies as a small addition that makes the island feel more alive.

Creature pathfinding/AI was advertised/reworked, although launch and current player feedback still reports pathing problems. The important research distinction is therefore **intent/change, not proof of perfect behavior**.

### Creature Traits — a new inheritance/customization layer

ASA eventually added **Traits**, a layer absent from original ASE. Wild creatures can carry Traits that affect capabilities, and current systems allow players to identify/extract/manage Trait potential through tools such as the Gene Scanner/storage ecosystem associated with later content.

Community discussion in 2025 shows breeders using the system to build unexpected utility combinations rather than only maximizing health/melee. [ARK forum discussion](https://survivetheark.com/index.php?/forums/topic/772646-traits-for-days/).

Traits sit alongside—but do not replace—traditional inherited stats, mutations and imprinting. They make "which individual creature?" more expressive than raw stat lineage alone.

### Map, tracking and ping improvements

ASA's map can zoom/pan and supports pings/markers. Tracking systems improve locating owned/tamed or relevant entities. These are practical multiplayer coordination features, not mere cosmetics.

A valuable design effect is **externalizing group knowledge**: a tribe can coordinate location without every member memorizing exactly the same terrain.

### Cross-platform multiplayer and cross-platform mods

ASA's in-game mod browser supports mods across PC and current-generation consoles when a mod is compatible/approved for those platforms. Mods can add maps, creatures, items, structures, cosmetics and game modes.

The official support article directs players to the in-game mod interface rather than Steam Workshop. [Wildcard support — ASA mods](https://support.survivetheark.com/hc/en-us/articles/19362130409111-Where-can-I-find-Ark-Survival-Ascended-mods).

This differs materially from ASE's Steam-Workshop-centered PC ecosystem. It also introduces **Premium Mods**, giving creators a paid distribution path. Current Steam criticism shows the monetization side can discourage players from trying servers whose mod list contains several paid dependencies.

### Bob's Tall Tales and ASA-specific systemic DLC

Bob's Tall Tales is not only cosmetic story flavor. Across its map-linked drops it introduced systems such as specialized structures, vehicles, creatures and later technology. Examples include the Frontier-themed Scorched Earth additions and steampunk Aberration-era content. These are premium entitlements; they should not be described as universal base-game mechanics.

The important architectural lesson is that ASA's DLC increasingly adds **systems that coexist in public worlds**, so non-owners can encounter content they cannot necessarily craft/tame/use. That visibility is a repeated source of current Steam monetization criticism.

### Lost Colony — survivor skills, Thralls and dynamic outposts

**Lost Colony**, launched December 19, 2025, is a major divergence from ASE's original progression model.

Wildcard's launch post documents:
- a new Arat Prime/Necrocene story map bridging Extinction and ARK 2;
- tameable/new creatures;
- **Thralls**, humanoid combat followers;
- Traits on Thralls;
- Beast Riders who can operate creature mounts;
- a **Beastmaster** survivor skill tree that buffs commanded Thralls;
- **Lost Colony Skills — over 70 skills** across new progression paths;
- milestones;
- repeatable **Outpost Missions** with defend/attack/resource-cache structures;
- Tek Bunkers;
- Cryo Hospital;
- Bloodforge;
- new weapons such as Fabricated Crossbow/Tek Spear.

[Lost Colony launch](https://survivetheark.com/index.php?/forums/topic/773450-ark-lost-colony-is-now-live/).

This is why ASA cannot be summarized as "same character progression as ASE." In the base/remastered maps, the classic level/Engram model remains central; **Lost Colony adds expansion-scoped survivor/command progression on top**.

### Tides of Fortune — ships become customizable moving bases

Genesis Ascended Part 1 and **Tides of Fortune** launched in July 2026. Current delivered systems include:

- Shipyard construction;
- customizable Sloop and Brigantine, later Galleon;
- buildable decks/floating-base space;
- broadside naval combat;
- specialty cannon ammunition;
- buried treasure;
- naval/outpost missions;
- **Ship Skill Trees** across Piracy, Merchant and Luxury;
- physics-driven ocean/wave behavior in the relevant environments;
- market/outpost interactions.

[Wildcard launch feed](https://survivetheark.com/index.php?/profile/180634-studiowildcard/content/&page=10) · [Tides of Fortune store description](https://store.playstation.com/en-us/product/UP0691-PPSA16810_00-TIDESOFFORTUNE01) · [official community wiki](https://ark.wiki.gg/wiki/Tides_of_Fortune).

By September 2026 current patches had added a **Galleon** for Tides owners and a **Trireme** for Astraeos owners, plus ocean outposts/market camps on Genesis. Patch mirrors should be treated as version evidence, not a timeless final fleet. [current patch mirror](https://steamcommunity.com/app/2399830/discussions/0/592939664045914998/).

### Cross-ARK continuity — audit addition

ASA retains the broader **CrossARK transfer** model: compatible worlds/server clusters can move survivors, items and creatures through Obelisks, Tek Transmitters and map-specific terminals where server policy permits it. Transfers remain permissioned and constrained rather than automatic; server owners can independently prevent survivor/item/dino upload/download, and specific ASA creatures/content can have transfer restrictions. [CrossARK Transfers](https://ark.wiki.gg/wiki/CrossARK_Transfers).

This matters more in ASA because the current live product spans remastered canonical maps, Official Partner maps and paid story/content layers. A survivor's progression can therefore form a **cross-map career**, while server operators still own the portability contract.

### Club ARK — social hub, minigames and cross-world rewards

The initial pass omitted **Club ARK**, a free Wildcard social-hub map released June 17, 2024. Wildcard describes it as a place where survivors can converge irrespective of tribe/PvE/PvP context, play activities and take earned items/dinos back "home." [Community Crunch 414](https://survivetheark.com/index.php?/forums/topic/736304-community-crunch-414-club-ark-conquest-servers-and-more/).

Club ARK's activity set includes minigames such as:
- Doed Dodge;
- Duck Duck Jump;
- duels;
- lasso;
- parkour;
- Ray Race;
- Whac-A-Dodo;
- event-specific activities;
- Bob's Tall Tales missions such as Laboratory Escape, Train Robbery and later **Mad Mark**.

Players earn **Club Tokens** and rewards; the hub also supports direct safe player trading. Later updates added a dino store, wardrobe, consumables, repair items, more minigames and Wasteland/Extinction content. [Club ARK](https://ark.wiki.gg/wiki/Club_ARK) · [Wasteland War](https://survivetheark.com/index.php?/forums/topic/769859-community-crunch-443-club-ark-update-community-creature-submission/).

Club ARK is important because it temporarily changes the social contract: a persistent survival character can leave the dangerous home ARK, enter a purpose-built leisure/challenge space, earn transferable rewards and return. It is **not** just a menu minigame and not evidence that ordinary PvP maps are safe.

### Custom Cosmetic mods — creator layer separate from gameplay mods

Starting with Club ARK's June 2024 rollout, ASA can dynamically download compatible **Custom Cosmetic mods** in the background, including costumes/items and even functional structures, with a player toggle. [Community Crunch 414](https://survivetheark.com/index.php?/forums/topic/736304-community-crunch-414-club-ark-conquest-servers-and-more/).

This extends the cross-platform mod platform into a presentation/content layer that can appear in shared worlds without every cosmetic needing to be bundled into the base executable. It belongs in the creator/platform inventory separately from full gameplay/map mods.

### Official server modes remain a first-class layer

Official PvE/PvP, ARKpocalypse wipes, Classic/Conquest experiments and server-rate events change the social contract. Community/unofficial servers add further settings/mods.

A June 2026 official announcement introduced Classic servers with specific Tek restrictions and a transition toward Conquest. Those rules belong to that mode, not universal ASA. [Community Crunch 512](https://survivetheark.com/index.php?/forums/topic/773950-community-crunch-512-preparing-to-set-sail/).

## R03 — items, creatures, structures and composition

ASA preserves ARK's unusually broad object ecosystem:

- raw/refined materials;
- tools;
- primitive through Tek weapons/armor;
- saddles;
- ammunition/explosives;
- blueprints;
- food/crops/kibble;
- structures/deployables;
- generators/water devices;
- crafting stations;
- cryopods;
- boss Artifacts/tributes;
- creature inventories;
- expansion-specific objects.

The key design pattern remains **objects that unlock other workflows**, but ASA adds several new composition layers.

### Structures are more fungible during authoring

Because one wall craft can cycle among wall/window/door-like variants and pickup is more forgiving, the player commits less inventory complexity before knowing the final shape. The item is closer to a **construction token with contextual form**.

### Traits add another creature-build axis

A mature creature build can combine:
- species ability;
- base/inherited stats;
- mutations;
- imprinting;
- saddle quality;
- ASA Trait configuration;
- expansion-specific creature mechanics.

The more axes exist, the more important in-game inspection/search becomes. Otherwise "depth" becomes external spreadsheet dependency.

### Premium content can appear in shared ecology

Current Steam reviewers repeatedly complain about encountering attractive/strong creatures or system hooks that visibly exist in the world/UI but require DLC to tame/use. That is a **world-coherence versus merchandising** conflict: shared worlds benefit when everyone sees the same ecology, but visible inaccessible affordances can feel like embedded storefront prompts.

### Ships are moving infrastructure

Tides vessels are not just faster rafts. Their deck-building, cannons, inventory, repair/shipyard dependence and ship skill tree make them **persistent moving infrastructure**. The Galleon pushes this further toward fortress-scale base building.

That changes naval loss from "replace a vehicle" toward "lose a mobile project."

## R04 — progression, economy, time and return loops

### Classic survivor progression remains

Base ASA still uses XP, survivor levels, stat investment, Engram Points, blueprints, boss Tekgrams and Ascension.

The material curve remains:
primitive tools → better harvesting/storage → metal/industrial production → specialized tames/breeding → cave/Artifact preparation → boss armies → Tek/Ascension.

### Progression is now more layered than ASE

Depending on owned/current content, a player can also pursue:
- Trait collection/optimization;
- Bob's Tall Tales systems;
- Fantastic Tames;
- Astraeos progression;
- Lost Colony Milestones and survivor skill paths;
- Thrall/Beastmaster development;
- Tides ship skill trees/plunder economy;
- paid map/story systems.

This creates enormous horizontal possibility but weakens the idea of one universal "ARK endgame."

### Time remains deeply configurable

Taming, maturation, breeding, harvesting and production retain real-time costs, while server settings can compress them. Official special modes/rates add more variation.

The same warning from G133 applies: **system depth and waiting duration are separable variables**. ASA's quality-of-life work does not eliminate ARK's long-duration identity.

### Monetization is now part of progression perception

ASA has multiple paid layers:
- base game;
- Lost Colony;
- Astraeos Official Partner DLC;
- Bob's Tall Tales;
- Fantastic Tames;
- Premium Mods;
- other paid content/creatures.

A system can be mechanically good and still alter competitive perception if access is paid in shared PvP worlds. Current Steam criticism repeatedly frames certain premium creatures as competitive pressure. Those are player evaluations, not an independently measured "pay-to-win" verdict.

### Endgame/return

Return loops include:
- new/remastered maps;
- new paid systems;
- official wipe modes;
- community servers/mods;
- breeding/Trait optimization;
- boss/Ascension progression;
- map transfers;
- naval/outpost play;
- Lost Colony story/skills.

ASA's live structure increasingly resembles a **platform with expanding rulesets** rather than a single finished map sequence.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations.

### Case 1 — wireless utilities remove one puzzle and expose another

**Intention:** power and irrigate a large greenhouse/production base.  
**Conditions:** generator/water infrastructure can cover compatible devices within functional range.  
**Actions:** place the utility source, arrange devices inside coverage and optimize building layout without physical pipe/cable chains.  
**Interaction:** spatial planning shifts from routing every connector to coverage, fuel, device placement and protection.  
**Result:** base authoring is faster/cleaner.  
**Tradeoff:** players lose some of ASE's visible network topology and failure-point puzzles.

### Case 2 — consolidated structure pieces encourage iteration

**Intention:** design a facade before deciding exact door/window placement.  
**Conditions:** ASA lets a structure item cycle among related variants and permits broad pickup/repositioning.  
**Actions:** place walls, convert/select variants and revise positions as the room evolves.  
**Interaction:** inventory recipes and irreversible-placement fear no longer dominate experimentation.  
**Result:** more time can go to spatial design rather than recrafting mischosen parts.

### Case 3 — a wild baby turns predator hunting into an adoption decision

**Intention:** obtain a useful species without a standard full tame.  
**Conditions:** a wild adult/baby group is encountered and the baby becomes claimable under the current situation/rules.  
**Actions:** resolve the adult threat, claim/protect the baby and raise it.  
**Interaction:** ecology, combat and creature acquisition become one event.  
**Result:** "kill the predator" can become "this creature now has history."  
**Limit:** exact claimability/species rules are version-specific.

### Case 4 — a Trait changes the value of an otherwise ordinary tame

**Intention:** optimize a utility animal rather than only breed boss stats.  
**Conditions:** wild/tamed creature carries a useful Trait and the player has current Trait-management tools.  
**Actions:** inspect/extract/store/apply or breed around Trait potential according to system rules.  
**Interaction:** exploration produces genetic/configuration material rather than only base-stat candidates.  
**Result:** a low-combat creature can become especially valuable for a niche build.  
**Player evidence:** 2025 forum breeders discuss unusual Trait combinations precisely this way.

### Case 5 — cross-platform modding turns a server into a product bundle

**Intention:** run a custom creature/building world for PC and console friends.  
**Conditions:** selected mods support the relevant platforms.  
**Actions:** choose server mods, require clients to install through the in-game mod system, then play the altered ruleset.  
**Interaction:** the server configuration becomes content distribution.  
**Result:** world authors can create experiences far beyond vanilla.  
**Limit:** paid/premium dependencies increase onboarding cost; version incompatibility can break a server after updates.

### Case 6 — Lost Colony turns survivor progression into command specialization

**Intention:** lead Thralls/creature riders effectively.  
**Conditions:** player is in the Lost Colony progression ecosystem and has skill opportunities.  
**Actions:** invest in Beastmaster/related skills, acquire/configure Thralls, assign them to appropriate combat roles or mounts.  
**Interaction:** survivor skill choice affects follower army performance instead of only personal stats.  
**Result:** ASA gains a party-command layer not present in classic ASE.  
**Boundary:** this expansion-specific layer should not be projected onto an unowned base Island game.

### Case 7 — an Outpost creates a repeatable allegiance/combat event

**Intention:** gain resources/reputation-style benefits in Lost Colony.  
**Conditions:** dynamic Outpost content is active.  
**Actions:** defend aligned locations, attack hostile ones or contest resource caches.  
**Interaction:** repeatable world encounters connect combat to faction-like stance and loot.  
**Result:** the map can produce recurring missions after discovery rather than only static caves/bosses.

### Case 8 — ship skill investment makes transport a build

**Intention:** specialize a Tides vessel for commerce rather than pure broadside combat.  
**Conditions:** the player owns/accesses Tides progression and has plunder/investment resources.  
**Actions:** build a ship, invest in Merchant rather than Piracy/Luxury paths and fit the deck/base around cargo/economic use.  
**Interaction:** vehicle progression, movable structures and resource acquisition reinforce one another.  
**Result:** two ships of the same hull class can represent different strategic projects.

### Case 9 — a moving ship base concentrates catastrophic risk

**Intention:** carry production/storage into the Genesis ocean.  
**Conditions:** a sufficiently large vessel has player-built deck infrastructure.  
**Actions:** load storage, stations, supplies and combat resources; sail into contested water.  
**Interaction:** mobility reduces return trips but concentrates inventory/structures into one damageable object.  
**Result:** naval exploration has high operational reach and high loss stakes.  
**Limit:** network/physics bugs on a persistent mobile base can be disproportionately destructive; current patches repeatedly address ship collision/invisibility/jitter issues.

### Case 10 — an old roadmap produces a false current game if read literally

**Intention:** research which maps exist in September 2026.  
**Conditions:** researcher finds the January 2025 roadmap first.  
**Actions:** compare roadmap with later launch announcements.  
**Interaction:** scheduled Ragnarok/Valguero/Genesis dates moved; Genesis Part 2's scheduled August slot is not itself delivery evidence.  
**Result:** only explicit release/live posts enter the current feature inventory.  
**Transferable research lesson:** roadmap ≠ capability.

### Case 11 — a paid creature visible to everyone creates mixed affordance

**Intention:** tame a compelling creature seen in a shared world.  
**Conditions:** the creature belongs to premium content the player does not own.  
**Actions:** approach/interact and discover entitlement prevents the expected acquisition.  
**Interaction:** ecology is shared, ownership is not.  
**Result:** non-owners experience the creature as both world content and storefront boundary.  
**Current reception:** multiple September 2026 Steam negatives identify this exact frustration.  
**Limit:** the complaint demonstrates player perception, not an objective competitiveness score.

### Case 12 — Club ARK changes the social contract without changing the survivor

**Intention:** earn rewards/socialize without risking the ordinary home-map PvP/PvE loop.  
**Conditions:** player enters Club ARK through the supported network flow.  
**Actions:** play parkour/race/dodge/mission activities, earn Club Tokens/rewards, trade safely, then return home.  
**Interaction:** one persistent survivor identity participates in a bounded ruleset whose purpose is leisure/challenge rather than survival-base ownership.  
**Result:** rewards can feed back into the main persistent world.  
**Lesson:** a world network can support radically different local social contracts without forcing every world to share one activity model.

### Case 13 — transfer permissions decide whether an expansion is continuity or restart

**Intention:** bring an established survivor/tame economy into another ASA map.  
**Conditions:** source/destination cluster and transfer settings allow the relevant survivor/items/creatures.  
**Actions:** upload through supported transfer infrastructure and download on destination.  
**Interaction:** expansion geography, ownership entitlements and server governance determine portability.  
**Result:** the same map can function as continuation on one cluster and fresh-start challenge on another.

### Case 14 — UE5 visuals increase both atmosphere and hardware pressure

**Intention:** revisit a familiar Island location.  
**Conditions:** Lumen/Nanite/dynamic-water/foliage presentation is enabled at a hardware-appropriate level.  
**Actions:** explore the same route known from ASE.  
**Interaction:** richer lighting/water/vegetation changes recognition and atmosphere without changing the underlying survival objective.  
**Result:** familiar geography can feel newly discoverable.  
**Counterpressure:** launch reviews and current Steam testimony repeatedly report frame-rate/crash/optimization costs.

## R06 — people, followers, creatures, tribes and multiplayer

### Tribes remain the principal social organization

Tribes share infrastructure, tames, storage, permissions, boss preparation and territorial defense. Server persistence makes play asynchronous: one member can breed while another is offline.

### Lost Colony expands "companion" vocabulary

Classic ARK creatures remain commandable functional companions without authored dialogue/romance.

Lost Colony's **Thralls** add humanoid follower combat/role behavior, Traits and Beast Riders. They still are not a BioWare-style relationship cast: the system is command/combat progression rather than approval/romance conversation.

### No universal romance/reputation framework

ASA has no base-game authored romance system. Human social reputation lives in server communities/tribes.

Lost Colony Outpost allegiance-like behavior is content-specific; it should not become a claim that every map now has a general faction reputation simulation.

### Official and unofficial governance

Official servers, ARKpocalypse, Classic/Conquest, PvE, PvP and unofficial settings/mods create materially different communities. A mode that bans/restricts Tek or wipes monthly changes progression and social power, not merely enemy difficulty.

### Mods as multiplayer dependencies

Cross-platform mods make extension power broadly accessible, but every server's mod manifest is also an operational dependency: clients, consoles, paid entitlements and version updates must line up.

## R07 — art, audio, interface and feel

ASA's most obvious change is presentation.

- Unreal Engine 5 remakes the lighting/material/water/foliage feel of familiar maps.
- Dynamic water and later 2026 naval work turn oceans into more active movement spaces.
- Dense vegetation makes known routes visually less sterile.
- improved creature models/animation/wild babies support the "living ecosystem" fantasy.
- third-person presentation, updated map, pings and revised HUD improve orientation.
- revised building UI reduces recipe/placement clutter.

Gamereactor judged the graphics alone transformative enough to make familiar Island spaces feel nearly unrecognizable; GamingBolt similarly praised detailed water/vegetation while criticizing crashes/choppiness. Those are subjective review judgments, but they agree on the cost/benefit axis.

### Interface growth remains a risk

The current product has many overlapping surfaces:
- Engrams;
- tribe permissions;
- creatures/breeding/Traits;
- mods;
- cosmetics/premium entitlements;
- Lost Colony skills/milestones;
- ship skills;
- multiple DLC prompts;
- map/server browsers.

September 2026 Steam critics specifically complain that inaccessible premium systems appear inside ordinary interface/world flow. A UI can be mechanically clearer than ASE and commercially noisier at the same time.

## R08 — story and relationship to gameplay

ASA remasters the original ARK narrative progression through Explorer Notes, bosses and Ascension while adding new story-bearing content.

### Remastered core narrative

The Island→Scorched Earth→Aberration→Extinction→Genesis chain still frames the ARKs, Element, survivors and humanity's fate. Delivered map order is not the same as canonical story order because live remaster timing changed.

### Lost Colony

Lost Colony explicitly **bridges Extinction and ARK 2** on Arat Prime after catastrophe. Its authored world state, Lost King/Queen conflict, Thralls and Outposts give ASA a more direct narrative-mission layer than classic Island sandboxing.

### Bob's Tall/True Tales

Bob content turns a known ARK survivor into a premium narrative wrapper for additional systems. Tides' pirate framing is intentionally exaggerated/unreliable-adventure flavor, but the ships are real mechanics.

### Narrative-system connection

ARK's strongest narrative connection still comes when fiction explains progression:
- implants/ARK artificiality;
- Element/Tek;
- Ascension;
- Extinction's Earth;
- Genesis simulation;
- Lost Colony's post-cataclysm setting.

The risk is content fragmentation: if a player owns only part of the live catalog, "the story" and "the systems" do not form one uniform package.

## R09 — production and development

ASA exists partly because Wildcard needed a modernized technical base and partly as a bridge in a franchise whose ARK 2 timeline stretched.

### Early commercial/product changes

The public plan moved from a free remaster concept to paid ARK 2 bundle to a standalone paid Early Access package after community backlash. That sequence is well documented in 2023 reporting. It shaped trust before players judged the game itself.

### Launch technical state

The launch was rough enough that lead designer Jeremy Stieglitz publicly described server performance in unusually blunt negative terms. PC Gamer's December 2023 report also cited roughly 600,000 copies sold in the first two weeks while documenting server problems. [PC Gamer](https://www.pcgamer.com/ark-survival-ascended-lead-designer-jeremy-stieglitz-admits-the-servers-are-ass-they-run-like-ass-and-their-stability-is-ass/).

This is useful production evidence because high demand and technical readiness can diverge.

### Content roadmap slippage

The January 2025 roadmap is a concrete example of schedule uncertainty:
- Ragnarok planned April → delivered June;
- premium map plan changed into Astraeos delivered early February;
- Valguero planned August → delivered October;
- Genesis Part 1 planned April 2026 → delivered July.

A research archive should preserve the roadmap as historical intent and use launch posts for current state.

### UE5.5 migration while live

Wildcard moved a live, persistent, heavily modded game from its launch UE5 stack to UE5.5 in June 2025. That is not a normal patch-risk profile: renderer, server performance, platform certification, maps and mods all coexist with persistent player worlds.

### Creator/mod integration

ASA made console-compatible mods a product pillar and introduced premium creator monetization. Astraeos demonstrates an escalation path: it began as mod/community work and became fully supported **Official Partner DLC** integrated into official clusters.

That is a powerful content pipeline and a governance challenge: creator work can move from optional mod to platform-distributed commercial dependency.

## R10 — marketing, distribution and virality

ASA benefits from a franchise premise already optimized for visual sharing: dinosaurs + survival + giant player constructions.

Distribution/promotion loops include:
- Steam Early Access;
- current-generation console releases;
- cross-platform play;
- free remastered map drops;
- paid story/adventure packs;
- Fantastic Tames;
- Premium Mods;
- Official Partner DLC;
- Community Crunch weekly communication;
- creature voting;
- mod showcases;
- Twitch/video creators;
- seasonal events.

The **Community Crunch** functions as both development communication and recurring marketing surface. It announces maps, creatures, rates, mods, creator work and screenshots, keeping the live ecosystem visible between major releases.

Astraeos is especially revealing: a known creator's map becomes sponsored Official Partner DLC and official-server content. The creator ecosystem is not just a tail of fan work; it can become first-party-adjacent distribution.

## R11 — commercial and participation context

Precise lifetime ASA sales are not consistently reported in the same public metric. Keep dated facts separate.

- PC Gamer reported roughly **600,000 copies sold in the first two weeks** based on Stieglitz's 2023 disclosure. [PC Gamer](https://www.pcgamer.com/ark-survival-ascended-lead-designer-jeremy-stieglitz-admits-the-servers-are-ass-they-run-like-ass-and-their-stability-is-ass/).
- The current product monetizes through the paid base game plus multiple paid DLC/creature/mod layers described above.
- Free map remasters such as Genesis Part 1 coexist with premium companion packs such as Tides.
- Official Partner DLC and Premium Mods create revenue paths for external creators/partners, but exact revenue shares/profitability are not inferred here.
- Steam review counts and concurrent-player charts are dynamic participation proxies, not sales/MAU.

Commercial design itself is part of reception because shared servers expose paid systems to owners and non-owners simultaneously.

Operational costs include official server fleets, anti-cheat/moderation, map/content deployment, console certification, mod distribution, cross-platform compatibility, persistent saves and high-frequency patches. A content roadmap is also a support roadmap.

## R12 — independent reviews and current player feedback

ASA launched in Early Access and has relatively few conventional scored critic reviews compared with a finished AAA release. This pass found three indexed console critic reviews plus additional substantive first-hand Early Access analyses. The required five-review minimum is met without pretending previews are final-release verdicts.

### 1. Gamereactor — Marco Vrolijk, December 18, 2023 — 8/10, PS5

[Full review](https://www.gamereactor.eu/ark-survival-ascended-1339053/).

Gamereactor argues the UE5 visual upgrade and construction quality-of-life make ASA meaningfully better than ASE. It praises structure placement, richer building variants, wild babies and presentation while noting lingering bugs, launch content scarcity and the awkwardness of paying again after ASE official servers shut down.

### 2. PSX Brasil — Vanessa Ferreira, December 12, 2023 — 7/10, PS5

[Full review](https://psxbrasil.com.br/ark-survival-ascended-review/).

PSX Brasil praises visuals, streamlined building, map/tracking improvements and the wireless irrigation/generator approach. It still finds server access, rendering, animation, localization and performance problems. The review is particularly useful because it documents concrete systems rather than only comparing screenshots.

### 3. MeuPlayStation — Jean Azevedo, January 2024 — 5/10, PS5

[Full review](https://meups.com.br/review/ark-survival-ascended-vale-a-pena/).

MeuPlayStation reaches the opposite value conclusion from Gamereactor. It likes landscapes and playing with friends but considers performance, screen tearing, server connectivity, animation and localization too weak to justify buying the remaster again at that point.

### 4. GamingBolt — Ravi Sinha, November 16, 2023 — Early Access review, PC

[Full review](https://gamingbolt.com/ark-survival-ascended-early-access-review-dino-crisis).

GamingBolt finds the core survival/crafting progression compelling and the UE5 world visually strong. It praises map/ping/building QoL but criticizes repetitive harvesting, ordinary combat, crashes and choppy performance. It explicitly frames ASA as mechanically improved but technically unfinished Early Access.

### 5. GameSkinny — Matthew Kevin Mitchell, June 11, 2024 — first-hand comparative assessment

[Full assessment](https://www.gameskinny.com/culture/ark-survival-ascended-worth-it/).

A long-time ASE player argues ASA became worth switching to because of UE5 visuals, improved building, wireless utility networks, map/QoL and AI changes. The article also acknowledges demanding hardware and crashes/optimization. It is an evaluative first-hand review/assessment rather than a scored traditional review.

### Current Steam sampling — September 2026

The September 2026 Steam surface is particularly valuable because it evaluates a product with far more content than 2023 reviewers saw.

[Current reviews](https://steamcommunity.com/app/2399830/reviews/) show:
- a 293-hour negative praising the graphics but criticizing optimization/single-player bugs and visible paywalls around Bob's/Lost Colony systems;
- a 72-hour negative frustrated by encountering desirable creatures that require DLC to tame and by constant patching;
- a 160-hour ASE veteran saying the remake still carries familiar bugs/performance problems;
- a 1,950-hour reviewer simultaneously describing severe lag/glitches and calling it a favorite game;
- positives that simply enjoy the creature-survival loop.

[All-time helpful English](https://steamcommunity.com/app/2399830/reviews/?browsefilter=toprated&l=english) adds long-play criticism of:
- paid/premium mods;
- paid creature/content proliferation;
- unstable major releases;
- official-server or policy frustrations.

These are self-selected player reports. Claims about "pay to win," cheating prevalence, motives or exact install sizes are **not** adopted as independent facts. What the evidence does establish is a durable perception pattern: many highly invested players love the ARK loop while distrusting technical and monetization stewardship.

### Reception synthesis

**Repeated praise**
- remarkable creature-survival fantasy;
- much better-looking environments;
- easier/more expressive building;
- map/ping/QoL improvements;
- enormous mod/content breadth;
- strong friend/tribe play;
- continued depth from breeding/taming/progression.

**Repeated criticism**
- optimization, crashes, server instability and bugs;
- paying again for a remaster/replacement;
- paid DLC while still Early Access;
- premium creatures/mods/content in shared worlds;
- large/frequent patch/storage burden;
- familiar ARK jank surviving the engine rebuild;
- schedule delays.

The interesting tension is that ASA improved many **interaction-level** frictions while preserving or adding **platform-level** frictions around performance, monetization and content operations.

## R13 — transferable inspiration and limits for OpenLegend

These are research hypotheses, not accepted requirements.

### 1. Remakes are most meaningful when they rewrite interaction cost

ASA's best differences are not polygon counts; they are structure consolidation, pickup, wireless utilities, map pings and cross-platform mod access.

**Lesson:** when modernizing a system, ask what players were repeatedly fighting rather than merely replacing rendering.  
**Limit:** removing friction can also remove interesting topology, as wireless utilities demonstrate.

### 2. One creature system can support multiple progression axes

Stats + mutations + imprinting + Traits + saddles + species abilities create expressive builds.

**Lesson:** "companion depth" can come from orthogonal systems.  
**Limit:** too many axes require excellent inspection/search and can overwhelm casual players.

### 3. Shared worlds make entitlement boundaries visible

A premium tame can exist in front of a non-owner.

**Lesson:** content entitlement is a world-design decision, not only store policy.  
**Limit:** inaccessible visible affordances easily feel like advertising embedded in play.

### 4. A follower layer can emerge without replacing creature systems

Lost Colony Thralls and Beastmaster progression add humanoid command while dinosaurs remain central.

**Lesson:** new actor types can complement old mechanics if they occupy different roles.  
**Limit:** every additional follower abstraction increases AI/pathing/command complexity.

### 5. Vehicles become world systems when they can hold authored state

Tides ships have buildable decks, progression, cargo, weapons and repair dependency.

**Lesson:** a vehicle can become a mobile place rather than a speed multiplier.  
**Limit:** persistent moving structures amplify replication/save/collision failures.

### 6. Modding can be an official content funnel

Astraeos demonstrates modder → sponsored/official-partner DLC → official cluster.

**Lesson:** an extension ecosystem can discover product-quality ideas and creators.  
**Limit:** commercializing extensions changes trust and compatibility obligations.

### 7. Roadmaps must remain provenance-tagged intent

ASA's 2025–26 schedule drift proves why design/research docs should never flatten "planned" and "delivered."

**OpenLegend implication:** future/mechanic proposals need explicit lifecycle state.

### 8. Cross-platform mods need dependency transparency

A server is only joinable if client/platform/entitlements/mod versions line up.

**Lesson:** extension manifests and provenance need to be obvious to users before they commit to a world.  
**Limit:** invisible dependency resolution turns creative freedom into onboarding failure.

### 9. Skill trees can be world/content-scoped

Lost Colony adds skill systems without requiring the entire franchise to adopt one universal survivor tree.

**Lesson:** OpenLegend worlds could add progression modules locally.  
**Limit:** cross-world portability becomes harder if extensions mutate the meaning of a character.

### 10. Live technical migration and content cadence compete for capacity

UE5.5, maps, paid packs, cross-platform certification and server fixes all draw from one operational budget.

**Lesson:** platform ambition should price long-term maintenance, not only implementation.

## R14 — annotated sources, preservation, reading route and requirement map

### Preservation result

G134 was added in the September 27 survival expansion. Before writing this dossier, the branch's existing games, mechanics, dossiers and seven-file packet-derived reference owners were checked for a dedicated ARK: Survival Ascended study; none existed.

G133 owns original **ARK: Survival Evolved**. This dossier does not copy G133 as current ASA state; shared mechanics are acknowledged and ASA-specific differences/version/content are independently sourced.

The original seven-file packet predates G134. This pass does **not** claim the separate global P01 packet reconciliation is complete.

### Primary/current sources

- **Studio Wildcard — [January 2025 ASA roadmap](https://survivetheark.com/index.php?/forums/topic/769553-community-crunch-440-ark-survival-ascended-content-roadmap/).** Historical planning evidence only; later delivery dates are used for current state.
- **Studio Wildcard — [Astraeos and Love Ascended live](https://survivetheark.com/index.php?/forums/topic/771425-astraeos-and-love-ascended-are-live/), February 14, 2025.** Primary official-partner DLC launch/scope.
- **Studio Wildcard — [UE5.5/Astraeos update](https://survivetheark.com/index.php?/forums/topic/772419-asa-unreal-55-upgrade-anniversary-event-and-astraeos-update/), June 5, 2025.** Primary engine upgrade/current-content evidence.
- **Studio Wildcard — [Lost Colony live](https://survivetheark.com/index.php?/forums/topic/773450-ark-lost-colony-is-now-live/), December 19, 2025.** Primary Lost Colony map, Thralls, survivor skills, Outposts, structures and creatures.
- **Studio Wildcard — [Community Crunch 512](https://survivetheark.com/index.php?/forums/topic/773950-community-crunch-512-preparing-to-set-sail/), June 2026.** Primary release-date/mode evidence for Genesis Part 1 + Tides.
- **Studio Wildcard activity feed — [Genesis/Tides live post](https://survivetheark.com/index.php?/profile/180634-studiowildcard/content/&page=10), July 2026.** Primary delivered-status and naval-feature overview.
- **PlayStation Store — [Tides of Fortune](https://store.playstation.com/en-us/product/UP0691-PPSA16810_00-TIDESOFFORTUNE01), accessed September 27, 2026.** Current product description of Sloop/Brigantine/Galleon, broadside combat and ship skill trees.
- **ARK Official Community Wiki — [Tides of Fortune](https://ark.wiki.gg/wiki/Tides_of_Fortune), accessed September 27, 2026.** Maintained mechanics details for outposts/ships/items.
- **Wildcard Support — [ASA mods](https://support.survivetheark.com/hc/en-us/articles/19362130409111-Where-can-I-find-Ark-Survival-Ascended-mods), accessed September 27, 2026.** Official cross-platform/in-game mod browser route.
- **Studio Wildcard — [Community Crunch 414](https://survivetheark.com/index.php?/forums/topic/736304-community-crunch-414-club-ark-conquest-servers-and-more/), June 15, 2024.** Primary Club ARK social-hub/minigame/reward and dynamic Custom Cosmetic announcement.
- **Studio Wildcard — [Community Crunch 443](https://survivetheark.com/index.php?/forums/topic/769859-community-crunch-443-club-ark-update-community-creature-submission/), February 1, 2025.** Primary Club ARK Wasteland War/Mad Mark/reward update.
- **ARK Official Community Wiki — [Club ARK](https://ark.wiki.gg/wiki/Club_ARK), [Club ARK Missions](https://ark.wiki.gg/wiki/Club_ARK/Missions), and [CrossARK Transfers](https://ark.wiki.gg/wiki/CrossARK_Transfers), accessed September 27, 2026.** Current operational minigame/transfer details and edition-specific restrictions.
- **Steam — [ARK: Survival Ascended](https://store.steampowered.com/app/2399830/ARK_Survival_Ascended/), accessed September 27, 2026.** Current Early Access/platform/DLC surface.

### Production/history sources

- **PC Gamer — [ASA enters Early Access](https://www.pcgamer.com/6-years-after-ark-survival-evolved-left-early-access-ark-survival-evolveds-remaster-enters-early-access/), October 2023.**
- **PC Gamer — [remaster delayed/commercial-plan change](https://www.pcgamer.com/arks-remaster-has-been-delayed-will-release-with-a-launch-discount/), July 2023.**
- **PC Gamer — [server-performance admission / early sales](https://www.pcgamer.com/ark-survival-ascended-lead-designer-jeremy-stieglitz-admits-the-servers-are-ass-they-run-like-ass-and-their-stability-is-ass/), December 2023.** Secondary reporting of developer statements; sales figure remains dated/attributed.

### Independent reviews

- **Gamereactor — [Ark: Survival Ascended review](https://www.gamereactor.eu/ark-survival-ascended-1339053/), Marco Vrolijk, December 18, 2023.**
- **PSX Brasil — [review](https://psxbrasil.com.br/ark-survival-ascended-review/), Vanessa Ferreira, December 12, 2023.**
- **MeuPlayStation — [review](https://meups.com.br/review/ark-survival-ascended-vale-a-pena/), Jean Azevedo, January 2024.**
- **GamingBolt — [Early Access review](https://gamingbolt.com/ark-survival-ascended-early-access-review-dino-crisis), Ravi Sinha, November 16, 2023.**
- **GameSkinny — [long-form first-hand comparative assessment](https://www.gameskinny.com/culture/ark-survival-ascended-worth-it/), Matthew Kevin Mitchell, June 11, 2024.**
- **Metacritic — [critic index](https://www.metacritic.com/game/ark-survival-ascended/critic-reviews/), accessed September 2026.** Used only to check the small conventional-review pool; not a substitute for reading reviews.

### Current player evidence

- **Steam Community — [current](https://steamcommunity.com/app/2399830/reviews/), [English](https://steamcommunity.com/app/2399830/reviews/?l=english), [all-time helpful](https://steamcommunity.com/app/2399830/reviews/?browsefilter=toprated&l=english), accessed September 27, 2026.** Direct player testimony; dynamic and self-selected. Monetization/cheating/performance claims remain attributed to reviewers unless independently verified.

### Recommended reading route

1. Read the 2023 PC Gamer commercial-plan history before treating "paid remaster" criticism as context-free.
2. Read Gamereactor and GamingBolt for the strongest concrete launch-era comparison of building/QoL versus bugs/performance.
3. Read the January 2025 roadmap, then Astraeos/UE5.5/Lost Colony/Genesis-Tides release posts in date order to see the delivered product diverge from plan.
4. Read Lost Colony's launch list closely: skills, Thralls and Outposts are large enough to invalidate a lazy "ASA = ASE systems" summary.
5. Read the Tides description/wiki for the move from raft transport to skill-bearing mobile ship bases.
6. Sample September 2026 Steam helpful/current reviews for modern performance/monetization friction, while keeping player allegations distinct from verified platform facts.

No video scene or timestamp is represented as watched in this pass.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/current version | R01, with ASE separation and delivered-vs-roadmap inventory |
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
| R12 reviews/player evidence | R12, five independent substantive assessments plus current Steam |
| R13 transferable inspiration/limits | R13 |
| R14 sources/routes/preservation/navigation | R14 |

### Explicit mechanics-inventory closure

Character creation; survivor attributes and XP/levels; Engrams/Tekgrams plus Lost Colony skills; items/inventory/blueprints; weapons/armor/saddles; crafting/upgrading/industrial/Tek production; no conventional spellcasting in the base survival chassis, though expansion abilities can be fantastical; walking/swimming/mounts/fliers/vehicles/ships plus permissioned Cross-ARK continuity; environmental object interaction; farming/cooking/breeding; combat/practical stealth; loot/death/corpse recovery; resource/barter plus expansion-specific markets; Club ARK minigames/missions/social trading; canonical narrative/Explorer Notes; tribe reputation/social identity rather than universal base NPC reputation; creature and Thrall followers rather than romance party; creature AI and command; maps/biomes; caves/bosses/Outposts/missions; building/base/mobile-ship management; cross-platform gameplay mods and dynamic Custom Cosmetics/server modes; Ascension, skills, live maps and continuing sandbox as endgame/return layers are addressed above.

**Research boundary:** evidence was checked through September 27, 2026. ASA remains a fast-moving Early Access/live product. Future roadmap dates, Genesis Part 2/Fjordur timing, patch-only creatures and planned systems should be reverified from explicit release posts before being described as current. Server rules, mods and paid entitlements can materially alter the mechanics experienced by any particular player.

### Follow-up audit — September 27, 2026

The second pass found the ASA-only building/Traits/Lost Colony/Tides research substantive, but it had two real coverage holes: **Cross-ARK portability was only mentioned, not explained**, and **Club ARK was absent despite being ASA's dedicated activities/minigames/social-hub system**. Both are now documented with new worked cases, alongside the dynamic Custom Cosmetic layer. The original delivered-vs-roadmap map audit remains intact; no planned Genesis Part 2/Fjordur feature has been promoted into current capability.
