# G140 — Don't Starve Together

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Don't Starve Together (DST) is a useful reference because its deepest progression is not a gear ladder. It is **collective competence against a calendar**. Hunger, health, sanity, darkness, weather, seasonal bosses, hound waves, food spoilage and world-state threats create overlapping deadlines; asymmetric characters and multiplayer turn those pressures into roles. A good group becomes stronger not merely because it has more hands, but because one player can cook while another scouts, one can fight while another farms, and one can resurrect a dead teammate at real personal cost.

The current 2026 game is dramatically broader than the 2016 release. Sailing, lunar and shadow endgames, modern farming, character reworks, persistent skill trees, dozens of raid-style bosses, world customization, years of seasonal events and an enormous mod ecosystem now sit on top of the original survival loop. Version discipline therefore matters: a launch review accurately describes the game's cruelty and social appeal, but not its current content breadth.

## R01 — identity, current scope, versions and player promise

Klei Entertainment launched Don't Starve Together into Steam Early Access on **December 15, 2014** as a standalone multiplayer expansion to Don't Starve, and released it from Early Access on **April 21, 2016**. Klei's 2014 Frontier Pack announcement explicitly called it a standalone multiplayer expansion rather than a mode patched into the original. [Klei Early Access announcement](https://kleiforums.com/forums/topic/46014-coming-monday-10am-pst-dont-starve-together-steam-early-access/) · [Klei full-release announcement](https://kleiforums.com/forums/topic/66132-dont-starve-together-leaving-early-access/).

The player promise remains:
- gather food and materials;
- survive health/hunger/sanity/environmental pressure;
- build a persistent camp;
- prepare for seasons and recurring attacks;
- explore a procedurally generated wilderness and caves;
- choose a mechanically distinct survivor;
- cooperate, split roles or enable PvP;
- continue into increasingly elaborate bosses, oceans, lunar/shadow systems and endgame arcs.

Steam currently lists single-player, online/LAN co-op and online/LAN PvP support. The game is designed around multiplayer but can be played alone. [Steam](https://store.steampowered.com/app/322330/).

### Standalone game, not "original Don't Starve with multiplayer"

DST contains most of the original base game and Reign of Giants content, but it has diverged for more than a decade.

Important boundaries:
- **Don't Starve (2013)** remains a separate single-player game.
- **Reign of Giants** was integrated/adapted into DST.
- **Shipwrecked** and **Hamlet** remain separate single-player DLC worlds; selected ideas/entities have been adapted into DST over time, but their full mechanics/maps are not native DST.
- DST has unique characters, bosses, ocean systems, resurrection rules, skill trees, raids/endgame arcs, world settings and live-service content.
- A single-player Don't Starve rule should never be assumed equivalent to DST without checking its DST version. [DST overview](https://dontstarve.wiki.gg/wiki/Don%27t_Starve_Together).

### Current September 2026 stable versus beta/test

Klei's PC update index clearly distinguishes **Release** and **Test** builds. [Current update index](https://kleiforums.com/game-updates/dst/).

As of September 27, 2026:

- the newest **stable Release** listed is build **747465**, August 13, 2026, the *No Day at the Beach* intermission;
- the newest major stable gameplay update in that current arc is **From Beyond — Cursed Confrontation Part 1**, June 11, 2026;
- builds dated September 3, 4, 9, 11 and 25 are **Test/Beta**;
- September 25 beta 755194 adds the final phase after the Shrouded Queen plus new loot, but Klei explicitly says presentation, transitions, backend work and Sanctum reset behavior still need beta work.

Therefore the September 2026 final shadow-boss phase is **not stable-current content** in this dossier. [Aug. 13 stable release](https://kleiforums.com/forums/topic/172893-game-update-747465/) · [Sep. 25 beta](https://kleiforums.com/forums/topic/173365-game-update-755194/) · [Cursed Confrontation Part 1](https://forums.kleientertainment.com/game-updates/dst_ps4/3410-r2751/).

### 2026 roadmap boundary

Klei's April 2026 roadmap explicitly says schedules can change. It planned:
- Year of the Clockwork Knight;
- two or more content updates;
- two or more skill trees;
- events;
- interactive lore;
- intermission shorts.

It also says Klei intends to strengthen core gameplay/readability rather than organize every update around a story arc. Planned roadmap items are context, not delivered mechanics. [2026 roadmap](https://forums.kleientertainment.com/forums/topic/170917-dont-starve-together-2026-roadmap/).

### Platform boundaries

DST exists on PC, PlayStation, Xbox, Switch and, in 2026, mobile.

**Don't Starve Together: Pocket Edition** launched on iOS/Android through Playdigious in July 2026 with touch UI/cloud-save/controller work. It is a mobile port with its own patch cadence; its version state should not overwrite the PC stable/beta boundary. Klei's August stable PC intermission post links to the mobile release as a separate product route.

Console update streams also have their own build numbers/certification timing. Mechanics described below are the mature cross-product DST design unless a platform-specific detail is named.

## R02 — player actions and major mechanics

### Health, Hunger and Sanity form the core survival triangle

Every survivor manages three headline stats:
- **Health** — direct survival;
- **Hunger** — drains over time; starvation damages Health;
- **Sanity** — changes with darkness, monsters, wetness, food/equipment/character effects and many world states.

Temperature and wetness add environmental pressure:
- Winter can freeze the player;
- Summer can overheat the player;
- Spring rain raises Wetness and can drive Sanity down;
- heat/cold equipment, fires/endothermic cooling and shelter planning change seasonal survival.

The crucial design is that these meters are **causally linked** rather than three unrelated bars. A soaked Spring player can lose sanity and become cold; low sanity can turn shadow threats into real combat; hunger makes every delay more expensive.

### Darkness is an existential rule

Night is not merely reduced visibility. Without sufficient light, **Charlie** attacks from the darkness and can rapidly kill the player.

That makes light:
- a survival resource;
- route-planning constraint;
- base requirement;
- inventory priority.

Torches, campfires, lantern-like tools, character abilities and later light sources therefore do more than improve readability.

### Sanity converts psychology into ecology/resources

Low Sanity changes perception and eventually makes Shadow Creatures attackable/hostile. Defeating them can yield **Nightmare Fuel**, which is used in dark/ancient magic.

This creates one of DST's most elegant reversals:
- insanity is dangerous;
- advanced players may deliberately lower sanity to farm a needed resource.

The player can intentionally enter a threatening psychological state for economic/progression reasons. [Shadow Creatures](https://dontstarve.wiki.gg/wiki/Shadow_Creatures) · [Nightmare Fuel](https://dontstarve.wiki.gg/wiki/Nightmare_Fuel/DST).

### Procedural world and personal navigation

A world is procedurally generated from configurable biomes/set pieces/resources.

Players reveal their own map through travel. Knowledge comes from:
- roads/coasts;
- wormholes;
- landmarks;
- player pings/map-sharing items;
- memorized resource locations;
- caves/sinkholes;
- ocean routes.

World generation changes strategy between saves while preserving recognizable biome/resource grammar.

### Gathering and basic crafting

Early actions include:
- collect Grass/Twigs/Flint;
- cut trees;
- mine rocks/gold;
- pick berries/carrots;
- hunt/trap small animals;
- make tools;
- make light;
- establish Science Machine/Alchemy Engine;
- build storage/cooking/defense.

Unlike weight-based survival games, inventory pressure is primarily **slot and perishability pressure**, not carried kilograms.

### Crafting tiers and prototyping

Science/magic stations unlock broader recipes.

Core progression historically includes:
- Science Machine;
- Alchemy Engine;
- magic prototyping such as Prestihatitator/Shadow Manipulator;
- Ancient/Ruins technology;
- Celestial and later endgame crafting;
- character-specific crafts.

Modern crafting filters/UI organize a catalog that has grown enormously.

The first-time **prototype** concept is important: the player often needs access to the station to learn/create a recipe, after which that recipe can be crafted away from the station where rules allow.

### Character asymmetry

DST's cast is not cosmetic.

Examples of durable role differences include:
- **Wilson** — scientist/transmutation and modern skill-tree identity;
- **Willow** — fire/Bernie;
- **Wolfgang** — Mightiness/physical combat;
- **Wendy** — Abigail ghost companion and reduced personal damage;
- **WX-78** — circuit-based modular robot upgrades;
- **Wickerbottom** — books;
- **Woodie** — Wereforms;
- **Maxwell** — shadow servants/advanced shadow tools;
- **Wigfrid** — combat focus, meat restriction, songs/inspiration;
- **Webber** — spider relationships;
- **Winona** — engineering/catapults;
- **Warly** — specialized cooking;
- **Wormwood** — plant/farming affinity;
- **Wortox** — Souls for healing/teleport and monster-like social rules;
- **Wurt** — Merm/vegetarian ecosystem;
- **Walter** — ranged/exploration companion identity;
- **Wanda** — time/age mechanics.

Character choice changes:
- resource loops;
- diet;
- combat role;
- mobility;
- crafting;
- followers;
- base utilities.

A team can therefore specialize without a conventional class-selection screen.

### Persistent character Skill Trees / Insight

Modern DST adds a progression layer that did not exist at 2016 launch.

**Insight**:
- is earned by surviving days as a character;
- caps at 15 points after 68 survival days under current rules;
- persists account-wide across worlds/servers;
- does not accumulate while dead as a Ghost;
- can be reset;
- offers more skills than available points, forcing choices.

[Insight/Skill system](https://dontstarve.wiki.gg/wiki/Skill).

Skill trees have rolled out character-by-character rather than appearing for the entire cast at once. Klei's 2026 roadmap says Walter, Wendy and Wortox received trees in 2025 and that more focused Skill Spotlights continue.

This is a fundamental shift: DST now has **account-persistent character mastery** on top of otherwise world-local survival progress.

### Combat

Combat uses:
- melee weapons;
- armor/helmets;
- ranged/throwing options;
- character abilities;
- followers;
- kiting/animation timing;
- traps;
- magic;
- late-game planar/lunar/shadow equipment.

There is no lock-on action-RPG combo tree. Much combat mastery comes from:
- knowing attack intervals;
- baiting attacks;
- movement/kiting;
- preparation;
- armor durability;
- food/healing;
- group roles.

Critics and current players disagree on this: experts find a readable tactical rhythm, while critics call the combat mechanically thin or externally learned.

### Hounds and recurring attacks

Periodic **Hound** waves provide a persistent "you cannot remain entirely passive" pressure.

Their warning sounds create preparation time:
- equip;
- move away from base;
- use traps/allied mobs;
- group up.

High-Def Digest specifically praised the audio warning as a source of tension.

### Four seasons

DST uses Reign of Giants-style:
- Autumn;
- Winter;
- Spring;
- Summer.

Under default settings:
- Autumn 20 days;
- Winter 15;
- Spring 20;
- Summer 15;
- full year ~70 days.

[Seasons](https://dontstarve.wiki.gg/wiki/Seasons).

Each season alters:
- temperature;
- rainfall/wetness;
- daylight;
- crop/plant availability;
- animal behavior;
- hazards;
- bosses.

The game therefore makes **the calendar a world-state machine**.

### Seasonal giants and bosses

Seasonal/world bosses include examples such as:
- Deerclops;
- Bearger;
- Moose/Goose;
- Antlion.

DST also contains many nonseasonal/raid/endgame bosses:
- Dragonfly;
- Bee Queen;
- Klaus;
- Toadstool;
- Ancient Fuelweaver;
- Crab King;
- Celestial Champion;
- Nightmare Werepig;
- later lunar/shadow arc encounters;
- stable 2026 Sanctum/Cursed Confrontation content.

Bosses often drop **capability-changing crafting materials**, so surviving a boss can prepare the group for the next seasonal/endgame problem rather than merely award score.

### Caves and Ruins

Caves are linked to surface Sinkholes and function as separate **shards** in multiplayer server architecture. [Shard](https://dontstarve.wiki.gg/wiki/Shard).

They add:
- darkness/light pressure;
- cave fauna/resources;
- mushrooms/light bulbs;
- Ruins;
- Nightmare Cycle;
- Ancient technology;
- endgame bosses;
- lunar/shadow content.

The technical shard distinction matters: a group can literally split between surface and caves while one logical world/server cluster persists.

### Farming — Reap What You Sow

Modern DST replaced old farm plots with a substantially deeper agriculture system:
- Garden Digamajig creates farm soil;
- hoe creates planting spots;
- crop plants have seasons;
- water/tending matters;
- soil has nutrient categories;
- crop combinations can consume/restore different nutrients;
- "family" grouping reduces stress;
- weeds/rotted matter add problems;
- excellent care can create giant crops.

[Farm Plant](https://dontstarve.wiki.gg/wiki/Farm_Plant).

Farming is therefore an **ecological composition puzzle**, not passive timer-based food generation.

### Cooking and ingredient logic

The Crock Pot takes four ingredients and resolves them through:
- ingredient Food Values;
- tags/categories such as meat/fish/fruit;
- recipe requirements;
- recipe priority.

[Food Value](https://dontstarve.wiki.gg/wiki/Food_Value/DST) · [Crock Pot](https://dontstarve.wiki.gg/wiki/Crock_Pot/DST).

This is important because recipes are **compositional** rather than fixed "3 berries + 1 carrot" formulas. Multiple ingredient sets can satisfy the same dish.

Character-specific cooking, especially Warly, makes food a specialized team role.

### Spoilage and preservation

Food rots over time.

Infrastructure includes:
- Ice Box;
- Drying Racks;
- Salt Box/current preservation tools;
- cooked/cured foods;
- bundling/storage mechanics.

Food storage therefore converts present abundance into seasonal resilience.

### Woby — modern follower delegation and courier logistics

The 2025 Walter Skill Spotlight substantially expanded **Woby**, and the initial pass did not capture how relevant she now is as a follower/delegation system.

Woby can already serve as Walter's storage/mount companion. With current Walter skills she can additionally:
- Stay at a selected place;
- sprint/dash with mobility upgrades;
- carry a drying-rack attachment;
- forage;
- be called back;
- use **Woby Here, Woby There** to deliver items to another mapped player or a previously marked location;
- deposit delivered items into eligible nearby containers and return to Walter.

[Klei 2025 skill release](https://store.steampowered.com/news/posts/?appids=322330&enddate=1743552403&feed=steam_community_announcements) · [Woby](https://dontstarve.wiki.gg/wiki/Woby) · [Walter skills](https://dontstarve.wiki.gg/wiki/Special_Treat).

The courier action is particularly relevant to OpenLegend: it delegates **physical logistics** rather than abstractly teleporting items. Travel time depends on distance, the recipient/container must be resolvable through the map/marking rules, and Woby remains an embodied companion with hunger/mobility.

### Followers, animal relationships and domestication

DST has multiple nonhuman relationship systems:
- pigs;
- bunnymen;
- spiders for Webber;
- Merms for Wurt;
- Abigail for Wendy;
- Maxwell shadows;
- character summons;
- Beefalo domestication.

**Beefalo domestication** is especially deep:
- bonding;
- obedience;
- hunger;
- domestication over many days;
- saddles;
- rider training;
- four tendencies/temperaments;
- mounted movement/combat.

A domesticated Beefalo can become transport, weapon and damage buffer rather than cosmetic pet. [Beefalo](https://dontstarve.wiki.gg/wiki/Beefalo/DST).

### Freshwater and ocean fishing — activities audit

The initial pass treated fishing as a food source but never explained the actual activity systems.

**Freshwater fishing** uses a Fishing Rod at Ponds. The player casts, waits for a bite, actively hooks and then reels; depleted ponds take longer to bite and later replenish. The Oasis can also produce Crumpled Packages containing trinkets/rare blueprints. [Freshwater Fishing Rod](https://dontstarve.wiki.gg/wiki/Fishing_Rod/DST).

**Ocean fishing**, introduced through Return of Them, is a different mechanic rather than "the same rod at sea." The **Sea Fishing Rod** has dedicated Float and Lure slots. Floats affect casting; lure choice/freshness/species preference affects attraction; the player must alternate reeling and relaxing tension according to the fish's struggle. Ocean fish have species-specific behavior and randomized **Weight**, which matters for Pearl/Crabby Hermit tasks and some reward logic. [Sea Fishing Rod](https://dontstarve.wiki.gg/wiki/Sea_Fishing_Rod) · [Lures](https://dontstarve.wiki.gg/wiki/Lures) · [Weight](https://dontstarve.wiki.gg/wiki/Weight).

Later infrastructure adds **Ocean Trawlers**: automated four-slot nets that can be baited near fish schools. Overfilling creates an increasing chance the net snaps and loses its catch, so automation still has supervision/risk. [Ocean Trawler](https://dontstarve.wiki.gg/wiki/Ocean_Trawler).

Fishing therefore spans:
manual timing → species/lure knowledge → weight/relationship objectives → automated boat infrastructure.

### Ocean exploration and boat building

Return of Them introduced a full ocean layer.

Players can build a **Boat platform** and add structures such as:
- steering/oars;
- mast/sails;
- Anchor;
- lighting/storage/cooking/support;
- fishing equipment;
- later ocean-specific tools.

The **Anchor** physically prevents drift when lowered. [Anchor](https://dontstarve.wiki.gg/wiki/Anchor).

Ocean progression adds:
- sea stacks;
- ocean fishing;
- lunar islands;
- Crabby Hermit;
- Crab King;
- Moon Quay/pirate-era content;
- resource routes.

A boat is therefore closer to a tiny moving base than a fixed vehicle inventory slot.

### World customization and modes

DST exposes extensive world settings:
- seasons;
- resources;
- enemies;
- bosses;
- events;
- caves;
- regeneration;
- many frequency/settings controls.

[World Customization](https://dontstarve.wiki.gg/wiki/World_Customization/Don%27t_Starve_Together).

Major play modes include:
- **Survival**;
- **Endless**;
- **Wilderness**;
- **Relaxed**;
- **Lights Out**.

These change the death/revival/world-reset contract, not merely enemy HP.

### Death, Ghosts and revival

Death in DST is deliberately social.

A dead player can become a **Ghost**:
- ghosts can haunt objects;
- living players suffer a sanity drain while player ghosts remain;
- revival methods include Touch Stones, Meat Effigies, Life Giving Amulets, the portal under relevant settings and **Telltale Hearts**.

A Telltale Heart:
- costs a living crafter 40 Health;
- revives a player;
- imposes a 25% max-health penalty;
- can be repaired with a Booster Shot.

[Telltale Heart](https://dontstarve.wiki.gg/wiki/Telltale_Heart).

This is an unusually good cooperative death mechanic: reviving a friend creates **a cost borne by another person**, so death becomes group state rather than private checkpoint reload.

### Survival versus Endless/Wilderness

In Survival, if all players are dead at once, a reset countdown can end/regenerate the world unless somebody revives.

Endless removes that all-dead world-reset pressure and supports portal revival.

Wilderness makes death/re-entry more severe and character/world continuity different.

Relaxed removes/reduces several lethal environmental pressures and supports easier portal revival.

The exact mode contract should be checked before describing "death means the world resets" as universal.

## R03 — items, entities and systemic composition

### Major item families

- food/ingredients;
- tools;
- weapons;
- armor;
- light sources;
- clothing/temperature gear;
- healing/sanity items;
- crafting stations;
- storage;
- farms;
- magic items;
- ancient/celestial/shadow equipment;
- boat structures;
- character-specific items;
- boss drops;
- event/cosmetic items.

### Durability and perishability

Different resource clocks overlap:
- tools/weapons/armor wear out;
- food spoils;
- structures can burn/be destroyed;
- light fuel runs down;
- followers can die;
- crops stress/wither under poor conditions.

This makes stockpiles imperfect permanence.

### Inventory

The player uses fixed inventory/tool slots expanded by Backpacks/containers.

There is no weight/encumbrance system in the Rust/DayZ sense.

The absence matters: DST asks **which categories/slots** to carry, not "how many kilograms."

### Boss materials as cross-system keys

Boss drops often unlock:
- clothing;
- utility;
- magic;
- construction;
- seasonal counters;
- endgame crafting.

A boss therefore turns combat into infrastructure progression.

### Nightmare Fuel as risk-resource

Nightmare Fuel is both:
- product of terrifying/low-sanity conditions;
- crafting input for powerful magic.

This is one of DST's clearest "negative state becomes production input" loops.

## R04 — progression, economy, time and return loops

### World-local progression

Within a world, capability expands through:
- base infrastructure;
- explored map;
- scientific/magic prototypes;
- farms;
- food preservation;
- boss materials;
- caves/ruins;
- boats/ocean;
- celestial/shadow technologies;
- domesticated creatures;
- character-specific infrastructure.

### Account-persistent progression

Modern Insight skill trees create a second layer that survives worlds.

This softens classic roguelike reset without converting DST into an ordinary XP MMO.

### The calendar is the macro-economy

A resource is valuable partly because **when** it exists matters:
- ice before Summer;
- warm gear before Winter;
- food stores before low-growth periods;
- boss preparation before seasonal spawns;
- farm crops in preferred seasons.

Time turns stored items into future optionality.

### No central gold economy

There is no universal merchant town/auction house.

Exchange systems exist:
- Pig King trades appropriate items for Gold Nuggets;
- NPC-specific trades;
- event/endgame barter;
- player-to-player sharing/trade.

But survival value remains physical rather than currency-dominated.

### Meta monetization economy

Outside the world, DST includes:
- cosmetic skins;
- Steam Market/tradable items;
- Spools used to weave eligible cosmetics/character unlocks;
- optional character/skin bundles;
- Twitch/streaming drops;
- Shared Unlocks across linked platforms.

Some playable characters introduced for DST can be bought through character packs or woven/unlocked with Spools under current systems. That makes monetization **not purely visual**, although the world/content updates themselves have largely been free and the game has no required subscription/battle pass.

Current Steam lists in-app purchases.

### Endgame has expanded repeatedly

There is no single credits screen that ends a normal DST world.

Endgame eras include:
- Ancient Fuelweaver/Ruins;
- Return of Them lunar progression;
- Celestial Champion;
- From Beyond rifts;
- current shadow/Sanctum arc.

Klei can add endgame **to existing persistent worlds**, which is important for long-running megabases.

## R05 — worked interactions and concrete situations

Unless otherwise attributed, these are rules-based examples.

### Case 1 — Winter begins on Day 21 and retroactively judges Autumn

**Intention:** survive a first default year.  
**Conditions:** group starts in Autumn with 20 days before default Winter.  
**Actions:** explore, establish fire/base, stock food, gather warm clothing/thermal resources.  
**Interaction:** Autumn decisions are evaluated later by seasonal temperature/food constraints.  
**Result:** "easy" early days become preparation time rather than downtime.  
**Next decision:** fight/avoid Deerclops while preserving the base.

### Case 2 — one dead teammate becomes everyone else's sanity problem

**Intention:** recover after one player dies away from base.  
**Conditions:** dead player is a Ghost.  
**Actions:** living players choose whether to divert resources/health to revive them.  
**Interaction:** ghosts drain living players' sanity; a Telltale Heart costs a living player Health and leaves the revived player with max-health penalty.  
**Result:** death is a team resource decision.  
**Lesson:** multiplayer failure is stronger when consequences are shared but solvable.

### Case 3 — low sanity becomes an intentional production stance

**Intention:** acquire Nightmare Fuel for advanced magic.  
**Conditions:** player has safe-ish combat capability but insufficient fuel.  
**Actions:** intentionally lower sanity, provoke/kill Shadow Creatures, recover sanity afterward.  
**Interaction:** a survival danger is deliberately entered because it yields a valuable resource.  
**Result:** "mental health bar" is not simply something to keep full.

### Case 4 — Crock Pot rewards ingredient understanding, not recipe memorization alone

**Intention:** turn limited ingredients into a strong meal.  
**Conditions:** the group has mixed meat/vegetables/fillers.  
**Actions:** combine four items whose Food Values/tags satisfy a useful recipe.  
**Interaction:** recipes evaluate categories/priority rather than only exact ingredient identity.  
**Result:** cooking becomes a constrained composition system.  
**Limit:** the game communicates many advanced recipe constraints poorly enough that players often rely on wikis/mods.

### Case 5 — farming can be a team specialization

**Intention:** produce large reliable crop yields.  
**Conditions:** group has farm soil, seeds, water and time.  
**Actions:** plan crop families/nutrient-complementary combinations, water/tend, manage weeds and season.  
**Interaction:** agriculture rewards specialized knowledge while other players fight/explore.  
**Result:** one player's mastery supports the whole group.  
**Limit:** giant-crop optimization can become spreadsheet-like beyond ordinary survival needs.

### Case 6 — a boat turns unknown ocean into a mobile construction problem

**Intention:** reach lunar/ocean content.  
**Conditions:** group has boat materials and coastal launch access.  
**Actions:** build platform, add steering/mast/anchor/storage/light/food support, then sail.  
**Interaction:** movement depends on structures placed on the vehicle-like platform.  
**Result:** a journey begins with designing the journey's infrastructure.  
**Failure mode:** fire/collision/sea threats can destroy concentrated supplies.

### Case 7 — character choice turns "more players" into different verbs

**Intention:** prepare a long-term world with three people.  
**Conditions:** character select available.  
**Actions:** choose complementary identities—e.g. Warly for food buffs, Wendy for swarm control/Abigail, Winona for engineering, or another combination.  
**Interaction:** each player's persistent role changes base/combat/logistics options.  
**Result:** multiplayer composition matters beyond player count.  
**Limit:** balance changes/skill trees continually shift optimal roles; exact meta is version-specific.

### Case 8 — Beefalo domestication turns care history into a mount build

**Intention:** obtain fast land travel or mounted combat.  
**Conditions:** bonded Beefalo, feeding/riding resources, days of training.  
**Actions:** maintain obedience/domestication and emphasize a tendency through behavior.  
**Interaction:** how the player treats/trains the animal affects its final role.  
**Result:** a mount is a long-term relationship/project rather than one crafted vehicle.

### Case 9 — Caves allow literal division of labor across server shards

**Intention:** prepare surface Winter while acquiring Ruins resources.  
**Conditions:** linked surface/cave shards and multiple players.  
**Actions:** one subgroup remains above; another descends.  
**Interaction:** two spaces progress simultaneously within one persistent world.  
**Result:** multiplayer converts spatial separation into throughput.  
**Technical implication:** world architecture must preserve inventories/entities and player migration across shards.

### Case 10 — a boss drop protects against the next world problem

**Intention:** survive future seasonal/environmental pressure.  
**Conditions:** group defeats a giant/boss.  
**Actions:** turn its unique drop into clothing/utility/equipment.  
**Interaction:** combat feeds the survival/building loop rather than existing as separate raid score.  
**Result:** the calendar becomes a chain of preparation rewards.

### Case 11 — a persistent megabase receives a new endgame years later

**Intention:** continue an old world after a major live update.  
**Conditions:** world survives years of updates and has advanced infrastructure.  
**Actions:** locate newly added rifts/ocean/Sanctum/endgame content in the existing save.  
**Interaction:** live-service expansion overlays new progression on player-authored history.  
**Result:** long-lived worlds remain relevant rather than requiring seasonal wipes.  
**Cost:** migrations/performance/content clutter become cumulative production obligations.

### Case 12 — Woby makes delivery a delegated trip, not item teleportation

**Intention:** send supplies from Walter's expedition to a teammate/base without personally walking back.  
**Conditions:** Walter has the Woby courier skill and a valid mapped player or marked storage destination.  
**Actions:** load Woby, select Deliver/target and let her travel.  
**Interaction:** follower path/travel time, map knowledge and containers replace direct player hauling.  
**Result:** multiplayer logistics can continue in parallel with Walter's own task.  
**Limit:** this remains embodied delegation, so pathing/time/state matter.

### Case 13 — Pearl turns relationship work into endgame access

**Intention:** earn Pearl's Pearl for the lunar progression chain.  
**Conditions:** Crabby Hermit friendship tasks/home improvements are incomplete.  
**Actions:** perform distinct favors, improve/decorate her environment and meet fishing/other requirements.  
**Interaction:** a named NPC relationship is advanced by world actions rather than dialogue-point spending.  
**Result:** relationship level unlocks exchange tiers/rewards and eventually an item used in boss/progression content.

### Case 14 — ocean fishing makes one fish a behavior/quality problem

**Intention:** catch a sufficiently heavy seasonal Ocean Fish for Pearl.  
**Conditions:** Sea Fishing Rod, suitable Float/Lure, correct fish season/area.  
**Actions:** attract a species, manage reeling versus line struggle, weigh/check the catch and repeat if too light.  
**Interaction:** species behavior, lure choice and randomized weight all affect whether the catch satisfies the relationship objective.  
**Result:** fishing connects manual skill, ecology and NPC progression.

### Case 15 — September 2026 beta content must stay beta

**Intention:** document the current final shadow boss.  
**Conditions:** Klei's Sep. 25 build shows final phase/loot, but update index labels it Test and developer says work remains.  
**Actions:** classify it as beta evidence only.  
**Interaction:** public playable code and stable product state differ.  
**Result:** current stable dossier stops at the shipped arc while preserving what is visibly imminent.  
**Research lesson:** a beta branch is not release proof.

## R06 — people, AI, roles and multiplayer

### Characters are role engines

DST has no conventional party-class interface, but character asymmetry creates similar social planning:
- fighting;
- farming;
- cooking;
- engineering;
- resource gathering;
- summon/follower control;
- scouting;
- support/healing.

Skill trees deepen this further.

### Player cooperation

Players can:
- split resource tasks;
- share food/equipment;
- revive one another;
- communicate;
- build one base or multiple outposts;
- fight bosses together;
- explore separate shards;
- teach new players.

The same systems create conflict:
- scarce food;
- accidental fire;
- taking rare items;
- kiting bosses into camp;
- leaving Ghost penalties;
- PvP-enabled servers.

The most-helpful Steam corpus is full of relationship jokes/stories; the game becomes a **social memory machine**.

### PvP

Steam lists online/LAN PvP, and server configuration can enable competitive play.

DST's dominant cultural/product identity is cooperative survival, but PvP capability is real. It should not be described as a Rust-like competitive economy by default.

### Pearl / Crabby Hermit — explicit NPC relationship progression

DST does have one significant relationship/reputation-like system that the initial pass under-covered: **Pearl, the Crabby Hermit**.

Players perform distinct help tasks on Hermit Island. First-time completion raises **friendship level** up to 10, changing her behavior/presentation and progressively unlocking Bottle Exchange recipes/rewards. Tasks include improving her home, decorating/maintaining the island, fishing requests and other environmental chores. At maximum friendship/house progress she gives **Pearl's Pearl**, which is mechanically tied to Crab King/Celestial progression. [Crabby Hermit](https://dontstarve.wiki.gg/wiki/Crabby_Hermit) · [Pearl's Pearl](https://dontstarve.wiki.gg/wiki/Pearl%27s_Pearl).

This is not romance or a party approval simulation, but it is a real **persistent NPC relationship state** where helping a named person changes dialogue/behavior, shop access, structures and endgame progression.

### World regrowth and renewable ecology

DST's persistent worlds do not rely entirely on one-time worldgen. The **Regrowth** system can replace selected destroyed resources over long timescales; Offspring Regrowth lets forests reclaim space; Endless/Wilderness also include Resource Renewal around spawn areas so newly arriving/respawning players are not permanently denied basic materials. [Regrowth](https://dontstarve.wiki.gg/wiki/Regrowth).

The current world-customization interface exposes regrowth speed and many individual resource-renewal controls. [World Customization](https://dontstarve.wiki.gg/wiki/World_Customization/Don%27t_Starve_Together).

This matters for long-lived public worlds: extraction can scar the world, but the ecosystem has **configurable recovery mechanics** rather than requiring a full wipe for every missing sapling/flower.

### Non-player social/ecology systems

Pigs, Bunnymen, Spiders, Merms, followers, Beefalo and other creatures create temporary alliances or character-specific societies.

These are mostly **systemic relationships**, not dialogue/romance.

### Bosses scale social coordination

Many DST bosses have far more health/complexity than their single-player ancestry, making group tanking/kiting/support/food preparation natural.

Solo completion is possible for experts, but "playable solo" does not mean "balanced identically to Don't Starve."

### Dedicated servers and mods

PC supports:
- self-hosted;
- dedicated servers;
- public/private worlds;
- Steam Workshop mods.

Mods may be:
- client-only UI/QoL;
- server gameplay;
- character/content;
- worldgen.

Server mod manifests become part of a world's rules/provenance.

## R07 — art, audio, interface and feel

DST keeps one of the most recognizable visual identities in survival games:
- scratchy hand-drawn linework;
- paper-puppet animation;
- muted/gothic palette;
- exaggerated silhouettes;
- whimsical body horror;
- seasonal visual transformation.

Reviewers repeatedly compare it to Tim Burton/Edward Gorey, but the important functional point is **silhouette legibility**: strange enemies/resources remain recognizable despite low-detail 2D presentation.

### Character audio identity

Survivors speak in instrument-like gibberish rather than conventional voiced dialogue. Characters are audibly distinct.

### Sound as warning

Important audio cues include:
- Hounds approaching;
- bosses/creatures;
- rain/thunder;
- sanity distortions;
- night danger;
- combat.

High-Def Digest specifically praised how hearing Hounds creates anticipatory fear.

### Presentation changes with sanity

Low sanity changes visuals/audio and makes shadow phenomena more present.

This is elegant diegetic UI: **the world presentation itself reports state**.

### Interface and learning friction

The modern crafting UI, recipe filters and character skill interfaces are much better than launch, but the game remains deliberately opaque.

Current player criticism repeatedly says:
- seasonal threats are not explained well;
- boss progression is obscure;
- advanced recipes/mechanics require wiki/YouTube;
- a new player can die from a rule they had no plausible way to infer.

This is the game's central accessibility tension.

## R08 — narrative, lore and player-created stories

DST does not have a conventional quest campaign.

Its authored narrative is delivered through:
- character backstories;
- animated shorts;
- examination quotes;
- set pieces;
- bosses/world changes;
- Maxwell/Charlie;
- lunar and shadow arcs;
- interactive lore releases.

**A New Reign**, **Return of Them** and **From Beyond** progressively added an actual long-form world story on top of the survival sandbox.

### Maxwell/Charlie/Constant

The game takes place in **The Constant**, a supernatural world associated with Maxwell and Charlie. Survivors have been pulled into it through different histories.

Character refreshes/skill updates often ship with animated shorts that reveal personal lore.

### Environmental/endgame arcs

Return of Them built toward Celestial Champion.

From Beyond introduced lunar/shadow rifts and a long conflict whose shadow-side conclusion is in 2026 stable/beta transition.

Klei's Aug. 13 intermission says the team is working on the conclusion of the shadow arc.

### Player-created narrative

The stronger everyday story is still:
- who froze;
- who ate the emergency food;
- who accidentally burned the camp;
- who revived whom;
- how the group survived Deerclops;
- what happened on the boat;
- who disappeared into caves.

Multiplayer failure produces memorable stories because each character is controlled by another person with incomplete knowledge.

## R09 — production and development

### Multiplayer was a separate product problem

Klei initially made Don't Starve as a single-player design. Community demand for multiplayer led to a standalone project rather than bolting networking invisibly onto the original.

The Dec. 2014 developer announcement framed DST as a separate Early Access multiplayer expansion, including two copies in the Frontier Pack so an owner could invite a friend. [Early Access](https://kleiforums.com/forums/topic/46014-coming-monday-10am-pst-dont-starve-together-steam-early-access/).

By full release in April 2016, Klei had integrated/adapted:
- Reign of Giants;
- multiplayer balance;
- caves;
- resurrection/ghost rules;
- modes;
- server configuration.

### Live development eras

Post-release DST did not enter simple maintenance.

Large eras include:
- **A New Reign** (2016–17) — major DST-specific world/endgame expansion;
- Forge/Gorge limited events;
- character refreshes;
- **Return of Them** (2019–21) — ocean/lunar world expansion, farming overhaul, Celestial Champion;
- crossovers/events;
- **From Beyond** (2023–current) — lunar/shadow rifts/endgame arcs;
- character Skill Trees/Skill Spotlights;
- 2026 core-strengthening and Cursed Confrontation.

[Version history](https://dontstarve.wiki.gg/wiki/Don%27t_Starve_Together/Version_History).

### Stable/test discipline

Klei continues to run public Test builds and distinct Release builds.

The current September 2026 shadow conclusion is an especially clear example: players can test a final boss phase before Klei considers the presentation/backend/reset behavior ready for stable.

### Persistent-world compatibility

A decade of updates has to respect:
- existing player inventories;
- megabases;
- caves/shards;
- mods;
- old worldgen;
- console saves.

Performance work in updates such as 2024's Scrappy Scavengers explicitly targeted late-game/megabase item management and performance. [Scrappy Scavengers](https://forums.kleientertainment.com/game-updates/dst/600267-r2174/).

### 2026 product family expansion

Pocket Edition brings DST to mobile through Playdigious.

Klei's roadmap also references **Don't Starve Elsewhere** as a separate project affecting scheduling. It is not current DST content.

## R10 — marketing, distribution, community and virality

DST's distribution/discovery loops are unusually aligned with its mechanics.

### Give-a-friend origin

The original Frontier Pack/current Steam purchase history used **two-copy gifting** as a direct multiplayer acquisition loop: one buyer could bring another player.

That is a distribution mechanic tailored to a co-op product.

### Animated shorts

Klei repeatedly markets major updates/character work through high-quality short animations.

These serve several roles:
- advertise update;
- explain tone;
- reveal character lore;
- create shareable standalone media.

Current September Steam reviews explicitly praise the animated videos years later.

### Streaming Drops and cosmetics

Updates commonly pair content with Twitch/streaming drops.

The Aug. 2026 intermission includes:
- a streaming drop;
- free login reward chest;
- new skin collection;
- animated short.

Marketing is integrated into the update cadence without making gameplay content paid.

### Crossovers

DST has run crossovers with games including Terraria, Cult of the Lamb and Balatro.

Crossovers produce:
- items/skins;
- events;
- audience exchange.

### Modding/community

Steam Workshop, dedicated servers, guides and character/world mods are major long-tail discovery.

A difficult game also creates **knowledge media**:
- boss guides;
- seasonal prep;
- cooking calculators;
- farm layouts;
- character guides.

The same opacity criticized by newcomers generates creator content—but that is not an argument that poor onboarding is desirable.

## R11 — commercial and participation context

DST is a paid base game with:
- optional cosmetic purchases;
- optional character/skin packs;
- Steam Market/inventory items;
- Spools/weaving;
- in-app purchases;
- extensive free gameplay/content updates.

There is no required subscription.

### Public sales limit

This pass did **not** locate a reliable Klei-published current lifetime unit-sales figure for DST. That absence is preserved rather than converting Steam reviews/owners estimates into sales.

### Participation proxies

Steam currently shows:
- **Overwhelmingly Positive** English lifetime sentiment;
- around **95% positive** English reviews in the current store snapshot;
- **Very Positive** recent sentiment around 90%;
- hundreds of thousands of total reviews across languages.

These are review counts/approval, not purchases, MAU or concurrent players.

The enormous review corpus and decade-long active update stream establish durable participation qualitatively without requiring an invented lifetime-sales figure.

### Update economics

Klei's model has kept major gameplay arcs free while monetizing appearance/characters and continuing sales.

This reduces paid-expansion fragmentation: a returning base-game owner can join a current world without buying Return of Them/From Beyond map packs.

The tradeoff is store complexity. A 2026 long-form review criticizes the large number of cosmetic/character DLC listings even though most are optional.

## R12 — reception: written reviews and current player evidence

### Evidence availability boundary

Metacritic tracks only **four conventional PC critic reviews** from 2016.

For this pass:
- full readable bodies were obtained for High-Def Digest and DarkZero;
- the Riot Pixels original returned an access failure/403 during retrieval, so only its indexed summary is preserved and **not counted as read**;
- CD-Action is represented publicly by a print-review excerpt, not an accessible full body, so it is **not counted as read**.

To meet the requested five substantive written-review minimum without pretending those inaccessible bodies were read, this dossier adds later/current full written assessments, including a 2026 mobile-port review.

### 1. High-Def Digest — Levi van Tine, April 28, 2016 — 90

[Full review](https://games.highdefdigest.com/33219/dont_starve_together_pc.html).

High-Def Digest calls DST the best way to play Don't Starve. It praises:
- multiplayer boss victories;
- unpredictable compounding disasters;
- world customization;
- gothic presentation;
- Hound audio warnings.

Criticism is comparatively minor:
- sketchy mouse hitboxes;
- limited musical depth.

Its 2016 system inventory is historical—it predates oceans, skill trees and most current bosses—but the social survival thesis remains relevant.

### 2. DarkZero — Tommy Daniels, June 23, 2016 — 9/10

[Full review](https://darkzero.co.uk/game-reviews/dont-starve-together/).

DarkZero praises the original's trial-and-error survival loop, then argues multiplayer transforms it through:
- resource redistribution;
- character composition;
- teamwork;
- multiple death modes;
- balance changes for groups.

It recommends friends over strangers because scarcity rewards coordination.

The review identifies a durable DST strength: characters' positives and negatives create a team-composition problem rather than making extra players pure additive power.

### Additional accessible Early Access review — Cubed3, August 23, 2015

[Full review](https://www.cubed3.com/games/reviews/pc/dont-starve-together).

Cubed3's collaborative Early Access review is a stronger historical body than an index excerpt and increases the accessible-review corpus beyond the four Metacritic-tracked launch entries. It praises the core Don't Starve survival loop becoming easier to share/coordinate with friends while still finding the opening opaque and punishing. Because it predates full release, Reign-of-Giants integration and the decade of later content, it is **production/reception history**, not evidence for modern mechanics.

### 3. Playcritik — Aymen Sakouhi — long-form written review

[Full review](https://playcritik.com/en/review/dont-starve-together).

Playcritik treats DST's cruelty as the core design rather than incidental difficulty. It praises:
- distinctive ink art;
- interlocking health/hunger/sanity;
- character specialization;
- hard-earned co-op wins.

It criticizes:
- near-vertical learning curve;
- deaths caused by unknowable future rules;
- weaker solo feel;
- shared-progress loss;
- relatively functional rather than expressive base building.

**Source qualification:** the current page mixes an authored review with licensed Steam/Metacritic/current-player metadata. Its direct evaluative prose is useful; its dynamically displayed aggregates are not treated as independent measurements.

### 4. Wanderer — August 2026 — current long-form review

[Full review](https://playwanderer.online/game-reviews/dont-starve-together).

Wanderer is especially valuable because it reviews the decade-grown game rather than launch DST.

It praises:
- co-op specialization;
- years of free gameplay updates;
- dedicated servers/mod support;
- seasonal/calendar planning;
- replayability.

It criticizes:
- poor natural onboarding;
- hidden seasonal/boss mechanics;
- dependence on external knowledge;
- harsh full-party failure;
- storefront complexity;
- cosmetic economy complexity.

The review's strongest observation is that **the calendar is the real boss**: ordinary gathering gains meaning because Winter/Summer/raids are coming.

### 5. Pocket Gamer — Jupiter Hadley, July 21, 2026 — mobile, 4/5

[Full review](https://www.pocketgamer.com/dont-starve-together/review/).

This is explicitly a **mobile-port review**, not PC performance evidence.

Pocket Gamer praises:
- survival design;
- co-op multiplication of labor;
- distinct character stats/items;
- winter pressure;
- mobile UI adaptation;
- easy server hosting.

It reports some pre-public server buffering/movement issues on mobile.

The review is useful because it confirms the mature core survived a radically different control platform while keeping the social survival loop recognizable.

### Inaccessible launch-review leads retained, not counted

- **Riot Pixels — 78/100**, June 7, 2016: Metacritic summary says multiplayer wilderness conquest is fun but does not fix the original's major problems. Original body returned 403 in this pass.
- **CD-Action — 80/100**, July 2016: public index excerpt says enjoyment depends on who you play with. Full print body was not available.

### Current Steam helpful/recent sampling — September 2026

[Current Steam store/review surface](https://store.steampowered.com/app/322330/) and [most-helpful reviews](https://steamcommunity.com/app/322330/reviews/?browsefilter=toprated) show durable themes.

Helpful positives include:
- a 590-hour player praising "non-stop, ever changing" strategic problem-solving and audiovisual identity;
- an 8,000-hour player praising Klei's continued character/content updates while acknowledging how hard learning the game was;
- relationship/family/friend anecdotes where the emotional value comes from surviving together.

A recent long-form positive from Aug. 31, 2025 calls the game deliberately obstinate and poorly explanatory but ultimately rewarding after mastery.

[Negative-only helpful reviews](https://steamcommunity.com/app/322330/negativereviews/?browsefilter=toprated) repeatedly complain that:
- important mechanics cannot be learned naturally in-game;
- progress requires wiki/YouTube knowledge;
- the game is too punishing for players who do not enjoy learning by death.

Metacritic's July 10, 2026 user review gives the same criticism in much harsher terms, citing unclear mechanics and server/performance frustration.

These are self-selected direct accounts, not prevalence estimates. The high aggregate Steam approval does not make the onboarding criticism nonexistent.

### Reception synthesis

**Repeated praise**
- distinct art/audio;
- enormous depth;
- funny/tense co-op stories;
- meaningful character specialization;
- seasons as long-term planning;
- continued free content;
- mod/server flexibility;
- mastery that remains rewarding for thousands of hours.

**Repeated criticism**
- opaque learning;
- external-wiki dependence;
- combat simplicity/awkwardness;
- brutal early deaths;
- full-party/world-loss stakes;
- solo bosses/content tuned around groups;
- storefront/cosmetic complexity;
- version/platform performance issues.

The central design tension is unusually clear: **DST's ignorance-driven difficulty creates discovery and community knowledge, but the same opacity often crosses from mystery into arbitrary punishment.**

## R13 — transferable inspiration and limits for OpenLegend

These are research interpretations, not accepted implementation requirements.

### 1. The calendar can make ordinary work meaningful

A twig gathered in Autumn matters because Winter is coming.

**Potential lesson:** future world states can turn mundane preparation into strategy without quest arrows.  
**Limit:** deadlines should be foreshadowed enough that failure feels learnable.

### 2. Survival meters are better when they can become strategies

Sanity is danger, perception, combat state and Nightmare-Fuel economy.

**Potential lesson:** a "need" is richer when low/high values change available actions instead of only applying penalties.

### 3. Cooperative failure should create shared decisions

Ghost sanity drain and Telltale Heart health cost make one player's death everybody's problem.

**Potential lesson:** multiplayer failure can generate rescue play rather than spectator downtime.  
**Limit:** griefing/dead-player penalties can become toxic if recovery is impractical.

### 4. Character asymmetry creates natural jobs without classes

Warly cooking, Wendy/Abigail, Winona engineering and character-specific economies let groups specialize organically.

**Limit:** strong asymmetry makes balance/content testing combinatorial.

### 5. Persistent account mastery can soften world reset

Insight survives servers/worlds even though bases/items do not.

**Potential OpenLegend lesson:** separate **player knowledge/mastery** from **world-state persistence**.  
**Limit:** account progression can undermine a world's intended fresh-start fiction.

### 6. A negative state can be a resource source

Low sanity enables Nightmare Fuel farming.

**Lesson:** avoid one-directional "always maximize every bar" designs.

### 7. Cooking can be constraint satisfaction

Crock Pot tags/values let many ingredients compose into recipes.

**Potential lesson:** object systems become reusable when recipes express properties rather than exact item IDs.

### 8. Agriculture can be ecological rather than timer-based

Nutrients, families, seasons and stress make farming about relationships.

**Limit:** simulation depth needs legible feedback or becomes spreadsheet play.

### 9. A vehicle can be a buildable place

DST boats are platforms containing structures.

**Potential lesson:** transport can support authored state and team roles rather than only speed.  
**Limit:** moving persistent structures amplify network/desync/state complexity.

### 10. Live endgame can grow without wipes

Klei repeatedly adds progression to old worlds.

**Potential lesson:** persistent authored realities can evolve without deleting history.  
**Limit:** migrations, performance and content clutter compound indefinitely.

### 11. Public beta state must remain explicit

September 2026's final shadow-boss phase exists but is not stable.

**Research/product lesson:** lifecycle state is part of a feature's truth.

### 12. Opaque difficulty creates a creator economy but not necessarily good onboarding

DST's wiki/video ecosystem is enormous partly because the game underexplains itself.

**Potential lesson:** community knowledge can deepen a game.  
**Limit:** do not intentionally hide basic causal rules simply to manufacture guides.

## R14 — sources, preservation, reading route and requirement map

### Preservation result

G140 is a September 27 survival-expansion addition. Existing game/mechanics/dossier owners and the seven packet-derived reference owners were checked; no dedicated Don't Starve Together full-pass owner existed.

The original seven-file research packet predates G140.

The original Don't Starve and its DLC are context only; they do not discharge or substitute this standalone DST pass.

This dossier does **not** claim the separate global P01 packet reconciliation is complete.

### Primary/current sources

- **Klei — [Steam Early Access announcement](https://kleiforums.com/forums/topic/46014-coming-monday-10am-pst-dont-starve-together-steam-early-access/), December 11, 2014.** Primary standalone-multiplayer/Frontier-Pack origin.
- **Klei — [leaving Early Access](https://kleiforums.com/forums/topic/66132-dont-starve-together-leaving-early-access/), April 6, 2016.** Primary April 21 full-release announcement.
- **Klei — [current PC update index](https://kleiforums.com/game-updates/dst/), accessed September 27, 2026.** Primary stable/Test chronology.
- **Klei — [No Day at the Beach, build 747465](https://kleiforums.com/forums/topic/172893-game-update-747465/), August 13, 2026.** Current stable-release boundary; cosmetics/short/mobile promotion + next-update context.
- **Klei — [Cursed Confrontation Part 1](https://forums.kleientertainment.com/game-updates/dst_ps4/3410-r2751/), June 11, 2026.** Primary stable current major gameplay content.
- **Klei — [beta 755194](https://kleiforums.com/forums/topic/173365-game-update-755194/), September 25, 2026.** Primary evidence final shadow-boss phase remains beta/incomplete.
- **Klei — [2026 Roadmap](https://forums.kleientertainment.com/forums/topic/170917-dont-starve-together-2026-roadmap/), April 16, 2026.** Primary planning/intent; explicitly non-binding.
- **Klei — [Scrappy Scavengers update](https://forums.kleientertainment.com/game-updates/dst/600267-r2174/), March 27, 2024.** Primary skill-tree/performance/megabase evidence.
- **Steam — [DST store](https://store.steampowered.com/app/322330/), accessed September 27, 2026.** Current release/features/in-app purchase/review aggregate.

### Maintained mechanics references

- **Don't Starve Wiki — [DST](https://dontstarve.wiki.gg/wiki/Don%27t_Starve_Together), [Version History](https://dontstarve.wiki.gg/wiki/Don%27t_Starve_Together/Version_History), accessed September 2026.**
- **Don't Starve Wiki — [Freshwater Fishing Rod](https://dontstarve.wiki.gg/wiki/Fishing_Rod/DST), [Sea Fishing Rod](https://dontstarve.wiki.gg/wiki/Sea_Fishing_Rod), [Lures](https://dontstarve.wiki.gg/wiki/Lures), [Ocean Trawler](https://dontstarve.wiki.gg/wiki/Ocean_Trawler), [Weight](https://dontstarve.wiki.gg/wiki/Weight), accessed September 27, 2026.** Follow-up operational fishing/activity evidence.
- **Klei — [Walter/Wendy/Wortox Skill Spotlight](https://store.steampowered.com/news/posts/?appids=322330&enddate=1743552403&feed=steam_community_announcements), February 27, 2025; Don't Starve Wiki — [Woby](https://dontstarve.wiki.gg/wiki/Woby), [Walter skills](https://dontstarve.wiki.gg/wiki/Special_Treat).** Current embodied courier/follower-delegation mechanics.
- **Don't Starve Wiki — [Crabby Hermit](https://dontstarve.wiki.gg/wiki/Crabby_Hermit), [Pearl's Pearl](https://dontstarve.wiki.gg/wiki/Pearl%27s_Pearl), [Regrowth](https://dontstarve.wiki.gg/wiki/Regrowth), accessed September 27, 2026.** Named NPC friendship and persistent-world resource-renewal evidence.

- **[Insight/Skill](https://dontstarve.wiki.gg/wiki/Skill).**
- **[Seasons](https://dontstarve.wiki.gg/wiki/Seasons).**
- **[Telltale Heart](https://dontstarve.wiki.gg/wiki/Telltale_Heart).**
- **[Farm Plant](https://dontstarve.wiki.gg/wiki/Farm_Plant).**
- **[Crock Pot](https://dontstarve.wiki.gg/wiki/Crock_Pot/DST) and [Food Value](https://dontstarve.wiki.gg/wiki/Food_Value/DST).**
- **[Beefalo/DST](https://dontstarve.wiki.gg/wiki/Beefalo/DST).**
- **[Anchor](https://dontstarve.wiki.gg/wiki/Anchor).**
- **[Shard](https://dontstarve.wiki.gg/wiki/Shard).**
- **[World Customization](https://dontstarve.wiki.gg/wiki/World_Customization/Don%27t_Starve_Together).**
- **[Nightmare Fuel](https://dontstarve.wiki.gg/wiki/Nightmare_Fuel/DST).**
- **[Ancient Fuelweaver](https://dontstarve.wiki.gg/wiki/Ancient_Fuelweaver).**

These are community-maintained technical references. Current Klei release/test notes own lifecycle state; wiki numbers do not establish developer intent.

### Written reviews actually read

- **High-Def Digest — [review](https://games.highdefdigest.com/33219/dont_starve_together_pc.html), Levi van Tine, April 28, 2016.**
- **DarkZero — [review](https://darkzero.co.uk/game-reviews/dont-starve-together/), Tommy Daniels, June 23, 2016.**
- **Playcritik — [long-form review](https://playcritik.com/en/review/dont-starve-together), Aymen Sakouhi.** Current accessible page; current metrics separated from evaluative prose.
- **Wanderer — [2026 long-form review](https://playwanderer.online/game-reviews/dont-starve-together), August 2026.**
- **Pocket Gamer — [Pocket Edition review](https://www.pocketgamer.com/dont-starve-together/review/), Jupiter Hadley, July 21, 2026.** Mobile-port-specific performance/UI claims.
- **Metacritic — [critic index](https://www.metacritic.com/game/dont-starve-together/critic-reviews/?platform=pc).** Used to establish the four-review launch pool and inaccessible Riot Pixels/CD-Action limits, not as a substitute for their missing bodies.

- **Cubed3 — [Early Access collaborative review](https://www.cubed3.com/games/reviews/pc/dont-starve-together), August 23, 2015.** Full accessible pre-release review; used as dated historical reception, not current mechanics.

### Current player evidence

- **Steam — [most helpful](https://steamcommunity.com/app/322330/reviews/?browsefilter=toprated), [current](https://steamcommunity.com/app/322330/reviews/), [negative](https://steamcommunity.com/app/322330/negativereviews/?browsefilter=toprated), accessed September 27, 2026.**
- **Metacritic — [current user-review surface](https://www.metacritic.com/game/dont-starve-together/user-reviews/), accessed September 2026.** Supplementary direct player accounts; not sentiment prevalence beyond displayed aggregate.

### Recommended reading route

1. Read Klei's **2014 Early Access** and **2016 release** posts first to understand DST as a standalone product rather than DLC toggle.
2. Read DarkZero and High-Def Digest for the launch social design.
3. Read Wanderer for the current decade-grown game and the "calendar is the boss" framing.
4. Read Insight + Seasons + Telltale Heart + Farm Plant as four examples of how modern DST ties character, time, multiplayer failure and ecology together.
5. Read the 2026 update index before any current-mechanics statement: September's final boss is still Test/Beta.
6. Read current Steam helpful and negative surfaces back-to-back; the love for mastery and frustration with opacity are both genuine.
7. Treat Pocket Gamer's 2026 buffering/touch observations as mobile-port evidence only.

No video scene or timestamp is represented as watched.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version | R01 |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 interactions | R05, fifteen cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reception/player feedback | R12, five accessible substantive written reviews plus current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation | R14 |

### Explicit mechanics-inventory closure

Character selection/asymmetric roles; modern persistent Insight/skill trees rather than conventional XP levels; Health/Hunger/Sanity/temperature/wetness; items/inventory/durability/perishability; weapons/armor; science/magic/ancient/celestial/shadow crafting; magic as item/character/world systems rather than universal mana spellbook; land/ocean/Beefalo/boat traversal; interactive procedural ecology with configurable regrowth; farming/cooking plus explicit freshwater/ocean fishing/trawling and domestication; combat/kiting/bosses/practical avoidance; looting/resource gathering; Ghost death/revival/mode-specific world reset; barter/NPC exchanges plus Pearl friendship and separate cosmetic/Spool meta-economy; environmental/interactive lore arcs; no conventional romance system, but named NPC relationship progression and highly distinct character/follower roles including Woby's physical courier delegation; creature/follower/boss AI; procedural surface + cave shards + ocean/lunar spaces; recurring seasonal attacks/endgame arcs; base building/storage/farming/boat construction; dedicated/public/private/co-op/PvP/modded play; and Ancient/lunar/shadow endgame plus persistent-world live updates are all covered.

**Research boundary:** current PC stable state is the Release stream through August 13, 2026, with June 11 Cursed Confrontation Part 1 as the latest major stable gameplay update located. September 2026 final shadow-arc boss work remains in Test/Beta and is explicitly excluded from stable mechanics. Platform/mobile build timing can differ.

### Follow-up audit — September 27, 2026

The second pass preserved the stable-vs-September-beta boundary and found four under-covered applicable areas: **fishing as a real manual/automated activity system**, Walter's modern **Woby courier/delegation** mechanics, Pearl/Crabby Hermit's explicit **friendship progression**, and persistent-world **resource regrowth**. Three new worked cases close those gaps. The reception audit also adds Cubed3's accessible 2015 Early Access review, so the evidence set no longer depends as heavily on later reviews/mobile coverage to supplement the unusually small four-review 2016 Metacritic pool. Riot Pixels/CD-Action full-body access limits remain explicit rather than being represented as read.
