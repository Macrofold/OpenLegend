# G147 — Once Human

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Once Human is most useful as a study of **a live survival world whose rules are packaged into scenarios rather than one permanent universal ruleset**. The same account can carry durable identity, blueprints, cosmetics and selected resources across scenario boundaries while each scenario can radically change survival pressure, PvP, weather, Deviation rules, map behavior and social incentives. Its other distinctive idea is that anomalies are not only enemies: they become companions, automation workers, territory infrastructure, capture targets and now even a class/progression substrate.

## R01 — identity, current scope and player promise

Starry Studio, a NetEase studio, develops Once Human. The PC version launched globally on **July 9, 2024** as a free-to-play online open-world survival game. Mobile launched globally on **April 23/24, 2025** depending on region; PlayStation 5/PS5 Pro and Xbox Series X|S launched on **August 25, 2026**. The current console FAQ states that PC, mobile and console support cross-platform play, and that the game remains free-to-play with paid cosmetics, Battle Pass and other non-gameplay/fairness purchases rather than power sales. [PC release/review context](https://www.pcgamer.com/games/mmo/once-human-review/) · [mobile FAQ](https://www.oncehuman.game/news/update/20250423/40780_1229512.html) · [console FAQ](https://www.oncehuman.game/news/update/20260820/40780_1311772.html) · [console launch](https://www.oncehuman.game/news/update/20260825/40780_1312198.html).

As of **September 27, 2026**, the current live version is **3.0.6**. Its September 16 update includes the Beastmaster/animal overhaul, permanent-server merge work and an **Isles of Abyss** Pioneer test. Isles of Abyss is **not yet a normal released scenario**: the official final test runs September 16–October 8 under NDA with data wipe. This dossier therefore does not import its test-only naval/ocean rules into the normal live game. [3.0.6](https://www.oncehuman.game/news/devBlog/20260916/40781_1314019.html) · [Isles test](https://www.oncehuman.game/news/official/20260828/40779_1312551.html).

The newest live maintenance notice found in this audit is still on the **3.0.6 line (September 23 bug fixes)**. The next full update is scheduled for **September 28**, so announced free reshaping/hair dye, the return to three simultaneous Beastmaster summons and other September-28 changes remain **future on the research date**. [3.0.6 fixes](https://www.oncehuman.game/news/update/20260923/40780_1314904.html) · [character-customization plan](https://www.oncehuman.game/news/devBlog/20260911/40781_1313623.html) · [Beastmaster plan](https://www.oncehuman.game/news/devBlog/20260915/40781_1313919.html).

The player's baseline promise is to inhabit the contaminated continent of **Nalcott** as a Meta-Human: gather/build, explore strange towns and labs, craft and tune firearms/armor, capture Deviations, develop a territory, clear bosses/dungeons/events and participate in scenario-specific PvE or PvP communities.

That baseline is deliberately not one immutable campaign. The current product offers multiple scenario families and related modes, including:

- **Manibus** — core PvE survival/exploration progression.
- **The Way of Winter** — harsh temperature/extreme-weather survival and Thermal Tower play.
- **Endless Dream** — scenario-specific dream/gravity/world-rule changes.
- **Deviation: Survive, Capture, Preserve** — Deviation capture/team/battle progression as a central system.
- **Prismverse's Clash** — faction-oriented PvP scenario.
- **Evolution's Call** — PvP-oriented scenario history, though permanent PvP servers were later closed.
- **Once Human: RaidZone** — separate PvP spin-off/mode with stricter match-local resource rules.
- **Permanent scenario servers** — non-shutdown versions of supported scenarios for players who do not want a normal finite scenario ending.
- **Custom Servers** — host-configurable worlds with broad parameter and content-control surfaces.

Server-opening plans and scenario availability change, so the canonical current server browser—not a 2024 guide—owns exact server counts.

## R02 — player actions and major mechanics

### Character creation, body attributes and scenario level

Players create a Meta-Human with detailed facial/body customization and gender presentation. Appearance can later be changed at a territory **Floor Mirror**. As of **September 27**, facial/body reshaping and hair-color changes still use the existing cosmetic-item flow; the announced change making reshaping/hair dye free is scheduled for **September 28** and is therefore not yet current. Gender change remains a separate Metamorphosis Token flow. [character-customization plan](https://www.oncehuman.game/news/devBlog/20260911/40781_1313623.html).

Body shape is not purely cosmetic in the current 2026 rules. The Tech overhaul distinguishes **Overweight, Normal and Underweight** body types through carry-load and movement-speed tradeoffs. Character **Level** still exists within a scenario and can unlock feature/challenge pacing, but the rebuilt Tech tree is no longer hard-gated by character level. [Tech overhaul design](https://www.oncehuman.game/news/devBlog/20260302/40781_1288924.html) · [level/feature pacing](https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html).

A fresh normal scenario can therefore reset world-local Level/Tech progress while the same account keeps durable blueprint/cosmetic/social identity; permanent-server merges explicitly preserve Character Level and Tech Level. [permanent-server merge](https://www.oncehuman.game/news/devBlog/20260914/40781_1313806.html).

### Gathering, survival and territory

Players collect wood, gravel/ore, plants, water, animal resources, contaminated materials and region-specific resources. A personal **Territory Terminal** anchors a buildable territory where players can place:

- walls/floors/roofs and decorative housing;
- storage;
- workbenches;
- smelters/refining facilities;
- generators and electrical consumers;
- farming/ranching;
- Deviation securement facilities;
- defensive/utility structures;
- vehicles and logistics-related facilities where allowed by scenario/version.

Territories can be relocated, a major quality-of-life decision that makes the home follow progression rather than forcing permanent abandonment of an early site.

### Hunger, thirst, sanity and contamination

Once Human keeps survival needs lighter than Green Hell while retaining several interlocking pressures.

**Hunger and thirst** affect the character and can be managed through food/water production. Foods and drinks also supply useful buffs, so cooking is partly build preparation rather than pure maintenance.

**Sanity** interacts with polluted/contaminated areas. In the March 2025 pollution-zone revamp, the live model was changed so Sanity begins at 1,000 and drains according to local **Contamination minus Pollution Resist**; low Sanity can trigger additional Deviant pressure. Stardust Ore and powered structures such as the Veil of Tranquility became direct tools for suppressing contamination effects. [Pollution revamp](https://www.oncehuman.game/news/update/20250322/40780_1221471.html).

This has a useful structure: the environment can alter the player's effective survival state without requiring every zone to use temperature.

### Temperature and extreme weather

Temperature exists across scenarios, but **The Way of Winter** makes it central. Temperature depends on region, weather, time, environment and items; resistance determines tolerance. The scenario adds/extents **Thermal Towers**, large world/territory structures whose effects influence local temperature and survival. The 2025 update-test version moved towers into player territory and made extreme weather spread over scenario phases with additional regional effects. [1.3 Way of Winter](https://www.oncehuman.game/news/update/20241014/40780_1186579.html) · [2025 Way of Winter test](https://www.oncehuman.game/news/update/20250603/40780_1238298.html).

Do not apply Way of Winter's harsh-weather loop to Manibus as if all scenarios are identical.

### Tech tree, research/invention and classes

The old **Memetics** framework has been renamed and structurally replaced by the current **Tech** system. Version 2.3.6 (April 2026) rebuilt the tree into four core branches—**Survival, Production, Combat and Building**—with scenario-specific tabs where appropriate. Tech progression is now primarily exploration/research-driven rather than a simple level/phase unlock ladder. [2.3.6](https://www.oncehuman.game/banner/20260408/41906_1295195.html).

Current unlock routes include:
- spending **Tech Points** on connected nodes;
- **Reverse Engineering** cultural-artifact facilities/items at the research/Synthesis Bench to directly learn formulas or gain points;
- **Tech Invention**, experimentally combining materials for a chance to unlock a formula and receive the finished item;
- earning Tech Enhancement Points and applying enhancement effects to eligible Tech.

Tech Points come from activities including leveling, repeated research, Elites/Great Ones, Silos/Monoliths and scenario challenges; Tech points/levels are scenario-local and reset when a normal scenario ends. The previous randomized **Tech/Memetic Specialization** layer was removed and its useful effects redistributed into Tech, class abilities, enhanced facilities or wilderness discoveries. [Tech design](https://www.oncehuman.game/news/devBlog/20260302/40781_1288924.html) · [May optimization](https://www.oncehuman.game/m/news/official/20260513/40779_1300125.html).

The **Class System** is a parallel specialization layer rather than a conventional combat-class lock.

Current classes include:

- **Chef** — creative cooking, recipe discovery/stacked food effects and cooking-service/tool progression.
- **Gardener** — crop/material cultivation, biomechanical plants and wild planting.
- **Beastmaster** — animal understanding, breeding, summoning, riding and commands.
- **Freelancer** — no unique class mechanics for players who do not want specialization.

[Class introduction](https://www.oncehuman.game/news/update/20250630/40780_1243929.html).

As of September 27, 2026 the live Beastmaster can summon/command and ride supported animals, but the **current simultaneous summon limit is still one**. Starry Studio reversed its earlier design after feedback and has committed to restoring **three simultaneous Beastmaster animals on September 28** (non-Beastmasters remain limited to one); the latest September 23 clarification also says one Beast Whistle will command multiple summoned animals after that update. Those three-animal rules are announced future behavior, not yet live. [3.0.6](https://www.oncehuman.game/news/devBlog/20260916/40781_1314019.html) · [Sept. 15 FAQ](https://www.oncehuman.game/news/devBlog/20260915/40781_1313919.html) · [Sept. 23 clarification](https://www.oncehuman.game/news/devBlog/20260923/40781_1314860.html).

### Deviations: combat, utility and automation

Deviations are friendly/capturable anomalous entities distinct from hostile **Deviants**. Depending on type/scenario, they can:

- be summoned in combat;
- provide buffs/abilities;
- operate in territory to gather, produce or improve resources;
- support farming/crafting;
- become collection targets.

Their Securement Units and activity requirements historically connect territory design to productivity.

The **Deviation: Survive, Capture, Preserve** scenario radically expands this relationship: specialized capture, teams of up to three Deviations, companion combat/exploration/territory use and formal Deviation battles. [2.2.0 scenario](https://www.oncehuman.game/news/update/20251029/40780_1267745.html).

This should not be retroactively treated as the rule set for every older Manibus season.

### Weapons, armor, blueprints, upgrades and mods

Combat is third-person shooter/action-RPG driven, now also supporting first-person perspective in the wider product.

Weapons include familiar firearm families plus bows/melee/special gear. Build composition involves:
- weapon/armor blueprint rarity and **star level**;
- crafted or dropped gear instance/tier;
- keyword/status effects;
- armor set pieces;
- mods and accessories;
- food/class/Deviation synergy;
- current scenario/world rules.

The **Blueprint** layer is persistent account progression. Since the March 2026 simplification, weapon and armor blueprints are unlocked and upgraded **directly with Starchrom** rather than combining blueprint fragments; wilderness exploration, mysterious treasures, first-clear dungeons and tasks now pay equivalent Starchrom instead. Blueprint Conversion can move star levels between unlocked blueprints of the same rarity/type. [2.3.4 blueprint update](https://www.oncehuman.game/m/news/update/20260311/40780_1290685.html).

Dropped gear also matters. The April 2026 Tech update expanded weapon/armor drops from Silos/crates and gives dropped gear an initial star rating; "lost" gear can provide immediate power but has different repair/reverse-engineering/trade rules from owned crafted progression. [2.3.6 additional update](https://www.oncehuman.game/news/update/20260409/40780_1295383.html).

The old **weapon Calibration** function was removed in January 2026 because Starry Studio judged the interaction repetitive/complex for a scenario-reset game. Calibration **blueprints/styles** continue as crafting modifiers, while the old repeated calibration action no longer does. [Calibration revamp](https://www.oncehuman.game/m/news/devBlog/20260113/40781_1281545.html).

This is a rare example of a live game deleting one progression action while preserving the valuable build identity attached to its artifacts.

### Combat and bosses

Ordinary exploration mixes:

- ranged firearm combat;
- melee/bow alternatives;
- weak-point targeting;
- human factions;
- mutated/Deviant enemies;
- elite/boss encounters;
- instanced Silos/dungeons;
- Great One/large boss fights;
- public crisis/world events.

Critics consistently separate two layers:
- weapon feel and boss/monster spectacle can be satisfying;
- ordinary enemy AI can be passive/repetitive.

This distinction matters when transferring lessons: the art/encounter concept can be strong even when moment-to-moment adversary behavior is shallow.

### Building, blueprints and territory transfer

Building supports multi-story bases, decorative homes, farms, production lines and utility infrastructure. Territory blueprints/design layouts can be saved and carried across scenario transitions, while exact world placement/state is scenario-owned.

Current 3.0.2/3.0.5 updates continue improving construction snapping/storage search, showing that territory UX remains an active live-service surface. [3.0.2](https://www.oncehuman.game/news/update/20260722/40780_1308595.html) · [3.0.5](https://www.oncehuman.game/news/update/20260902/40780_1312959.html).

### Loot, quests, commissions and repeatable activities

The live game has several distinct reward/activity loops beyond combat farming:

- **Main Story Tasks, Side Story Tasks and Exploration Notes** are the current names for the major quest/guidance layers after the January 2026 terminology cleanup. [2.3.1](https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html)
- **Commissions** provide limited daily task/reward loops; later updates changed how many can be accepted and how unfinished tasks refresh.
- settlement **Mystical/weapon/armor/storage crates**, first-clear Silos/Monoliths and bosses supply gear, mods, Starchrom, resources and scenario rewards;
- Public Crisis Events, Prime Wars, Scenario Challenges and seasonal/Visional events provide group objectives/rewards;
- Eternaland's **Island Paradise** supports player-authored activities such as Hide and Seek/race-like modes with faction spawn/respawn/objective facilities. [Island Paradise](https://www.oncehuman.game/m/news/devBlog/20260129/40781_1284568.html).

This is a live-service activity graph, not one universal "quest line." Which loops matter depends heavily on scenario and current phase.

### Farming and ranching

Crop systems can become quite deep under Gardener mechanics: soil fertility, biomechanical crops, portable planting, material cultivation and greenhouse tooling. Animal husbandry/breeding feeds the Beastmaster layer.

The September 2026 class/animal work explicitly turns animals from "livestock/resource production" into possible persistent companions, mounts and commanded actors for Beastmasters.

### Vehicles and traversal

Motorcycles and other vehicles accelerate the large open world. Fast-travel/teleport infrastructure reduces repeated driving. Vehicle and world rules can differ in Custom Servers/RaidZone.

Current console launch also adds full cross-platform access and control adaptations; do not assume the launch-2024 mouse/keyboard limitation from early reviews is current.

### Stealth is scenario-specific rather than a universal RPG skill tree

Ordinary Once Human supports tactical avoidance and line-of-sight play, but the explicit **crouch-stealth mechanic** added in July 2026 is documented under **RaidZone**: crouching hides footstep sounds and corresponding visual footstep markers so players can use cover/deadzones for PvP repositioning. [3.0.1 RaidZone changes](https://www.oncehuman.game/news/update/20260709/40780_1307147.html).

The dossier found no general stealth attribute/perk tree equivalent to a stealth RPG class across all normal scenarios. This mechanic therefore stays mode-scoped rather than being silently generalized to Manibus.

### Social organization

Players can form:

- teams;
- Hives/small cooperative organizations;
- larger group structures/social relationships depending on scenario;
- faction identities in specific PvP scenarios.

Public events allow ad hoc cooperation even among strangers. Social relationships can carry between scenarios in current inheritance rules.

### PvP and RaidZone

Normal scenarios can be PvE- or PvP-oriented. **RaidZone** is a more isolated PvP ruleset where gear/items/Deviations must be obtained within the match/server and cannot simply be imported from Eternaland/normal modes. Most RaidZone progression is mode-local. [RaidZone launch rules](https://www.oncehuman.game/news/wiki/20250814/40782_1250063.html).

2026 adds Casual/Standard/Hardcore variants and host-customizable **RaidZone: Hyper Brawl** on Custom Servers. [Custom server update](https://www.oncehuman.game/news/official/20260415/40779_1296153.html).

### Custom Servers

By 2026, Custom Servers are a substantial creator/governance layer rather than a small admin panel. Hosts can change:

- survival/combat/construction parameters;
- scenario pacing;
- respawn rules;
- weather;
- vehicles/facilities;
- custom drops/rewards;
- Deviation attributes;
- custom gear/items;
- RaidZone zones/event rules.

The **Community Creation Program** can share revenue with server hosts from player payments in their server, with official communications advertising up to 30% revenue share. [Host program](https://www.oncehuman.game/news/official/20260313/40779_1290572.html) · [creation program](https://www.oncehuman.game/news/devBlog/20251226/40781_1278814.html).

This makes live player-authored rules part of the product's business/community model.

### Downed state, revival, respawn and death loss

Failure/recovery is also mode-specific. Normal survival rules support a **near-death/downed state** that teammates or appropriate Deviation abilities/items can revive; current update notes continue referring to revive behavior. Activated Worldstones and other configured points can function as respawn locations. [2024 revive objective evidence](https://www.oncehuman.game/news/update/20240801/40780_1171506.html) · [2026 Worldstone/respawn rules](https://www.oncehuman.game/m/news/official/20260513/40779_1300125.html).

The exact item-loss contract should not be generalized from PvP. **RaidZone** is explicit:
- Casual mode drops only weapons/gear on death;
- Standard/Hardcore use full-drop rules;
- Safe Backpack slots and Territory Vault can protect selected assets;
- Sleeping Bags/territories provide tactical respawn points and Custom Servers can alter respawn cooldowns/death drops.

[2026 RaidZone modes](https://www.oncehuman.game/news/devBlog/20260416/40781_1296450.html) · [resource protection](https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html) · [custom death-drop settings](https://www.oncehuman.game/news/update/20251203/40780_1274519.html).

For normal PvE scenarios, first-party current sources inspected in this audit do **not** provide one clean universal inventory-loss table, so this dossier does not manufacture a precise drop percentage.

## R03 — items, entities and composition

### A character build is a multi-layer composition

Character capability is not one stat sheet. Scenario Level, body-type load/movement tradeoffs, persistent blueprint star levels, current crafted/dropped gear, Tech/Tech Enhancements, class mechanics, weapon keyword effects, mods/accessories, food and Deviations all contribute. There is no Strength/Dexterity point-allocation screen; current Tech deliberately separated exploration/research progression from simple character-level gates.

A current normal-scenario build can involve:

- persistent blueprint ownership;
- crafted current-scenario weapon/armor instances;
- mods/accessories;
- current class;
- food/drink buffs;
- one or more Deviation roles;
- scenario-specific systems;
- Tech/Memetic unlocks;
- group coordination.

Because some layers persist and others reset/transfer selectively, "my build" spans both **account memory** and **current-world inventory**.

### Deviations are multipurpose entities

A Deviation can be:

- a collectible;
- combat summon;
- worker/automation aid;
- territory utility;
- scenario battle participant;
- source of traits/ratings/optimization.

The Deviation-focused scenario's team-of-three system pushes this much further than launch.

### Territory is both shelter and factory

A mature territory can combine:

- storage/logistics;
- energy generation;
- crafting/refining;
- food/farming;
- livestock;
- Deviation containment;
- defensive/event structures;
- decorative expression;
- social gathering.

The home is therefore a persistent **production graph** even though the surrounding scenario may eventually end.

### Blueprints separate design knowledge from item instances

Weapon/gear blueprints and house-design layouts can persist even when scenario item instances do not. This is conceptually powerful:

- **knowledge/design** persists;
- **materialized item** may be scenario-local;
- **world placement/history** may belong to the server.

That separation underlies the game's reset/inheritance model.

## R04 — progression, scenarios, economy and time

### Normal scenario progression

A normal scenario progresses through phases. New regions/events/challenges become relevant, and the server eventually reaches settlement. Historically this produced the controversial "wipe" framing.

Current behavior is more nuanced than "everything resets":

- cosmetics and many account-level unlocks persist;
- blueprints/formulas/design layouts and specified character data persist;
- weapons, armor, materials, medicine and Deviations can move to **Eternaland**;
- starting a new scenario gives limited **Resource Inheritance Points/Supply Points** for bringing selected stored resources back in;
- currencies have different inheritance rules;
- Energy Links can convert into Astral Sand under transition rules;
- level/current-scenario resources may reset when signing directly into a new scenario.

[Console inheritance FAQ](https://www.oncehuman.game/news/update/20260820/40780_1311772.html).

This is closer to **prestige with selective inheritance** than full account deletion.

### Permanent scenario servers

Player pushback against forced scenario endings led to **permanent/non-shutdown scenario servers**. Supported normal servers convert into an indefinite settlement-phase server rather than shutting down, letting players keep their level, scenario resources and structures. [Permanent servers](https://www.oncehuman.game/news/update/20250530/40780_1237751.html).

Permanent servers do not necessarily receive every scenario-restructuring change that requires a fresh server. They receive many balance/building/bug/content updates, while changes to maps, phase rules, Memetics and some seasonal challenge structures can require a new scenario.

This is a direct product answer to the tension between:
- players who want long-term homes;
- players who want fresh scenarios.

### Permanent-server population cost

Persistence creates a social population problem. Official 2025 data said PvP permanent servers for two scenarios usually had **fewer than 50 active players**, insufficient for healthy PvP; those permanent PvP servers were closed in January 2026. [Permanent optimization](https://www.oncehuman.game/news/devBlog/20251208/40781_1275401.html).

In September 2026 Starry Studio began merging permanent servers of the same scenario because low populations had fragmented friends/communities. [Sept. 2026 merges](https://www.oncehuman.game/news/devBlog/20260914/40781_1313806.html).

This is crucial: **world persistence can preserve possessions while eroding social density**.

### Eternaland

Eternaland is a persistent account-linked space/storage bridge used to retain resources/items across scenario transitions and support sandbox/creative uses. Current transition rules send selected scenario assets there and allow limited re-import under point budgets.

Eternaland should not be described as "all progress is permanent" because scenario-specific levels/world state are governed separately.

### Visional Worlds/Wheel

By 2026 servers can expose **Normal Worlds** and **Visional Worlds**, letting scenario content run with additional rotating Visional-rule layers. Current server opening rules allocate both world types to scenarios; Prismverse remains a special single-world faction scenario. [Visional/Normal worlds](https://www.oncehuman.game/news/devBlog/20260525/40781_1301445.html).

This is another level of rules packaging on top of scenario identity.

### Economy and monetization

The gameplay economy includes:

- materials;
- Energy Links;
- Starchrom and blueprint acquisition;
- scenario currencies;
- Astral Sand/Eternaland transition economy;
- player vending/trade;
- resource/production networks.

Monetization is structurally separate. The current console FAQ promises that all gameplay/mode content is free and paid content is cosmetics, Battle Pass and other non-fairness-affecting purchases. [Console FAQ](https://www.oncehuman.game/news/update/20260820/40780_1311772.html).

This is also a common criticism surface: current Steam users object to the number of cosmetic currencies/loot-crate-style storefront layers even when they do not grant combat power.

### Trading, vending and social economy

The economy is not only NPC currency. Players can use vending/trading systems and exchange items/facilities whose ownership/repair rules differ across scenario contexts. Tech enhancements can create tradable enhanced outputs, while scenario currencies and Starchrom remain system-specific rather than one universal gold standard.

The official 2026 Tech redesign explicitly permits enhanced products to be exchanged/traded and ties some progression to reverse-engineering items obtained from the world or other players. [Tech redesign](https://www.oncehuman.game/news/devBlog/20260302/40781_1288924.html). RaidZone intentionally walls its economy off from normal-game imports.

### Time gating

Scenario phases, event windows, servant/production timers and weekly/periodic progression can create urgency. Critics and players disagree whether that keeps servers socially synchronized or creates FOMO/forced cadence.

Permanent servers explicitly exist partly to provide a slower alternative.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations from current documented systems.

### Case 1 — preserve a blueprint while letting the gun disappear

**Intention:** begin a new scenario without starting from zero knowledge.  
**Conditions:** current scenario reaches transition/exit.  
**Actions:** keep account-owned blueprint/formula/design progress while current weapon/material instances transfer to Eternaland or reset according to rules; spend limited inheritance points on a few chosen resources.  
**Interaction:** design knowledge persists while material power is partially re-earned.  
**Result:** the new world can have an early progression curve without erasing account mastery.

### Case 2 — choose permanent server instead of the next scenario

**Intention:** keep a carefully built territory and continue at one's own pace.  
**Conditions:** scenario reaches settlement/conversion support.  
**Actions:** remain as the server converts into a permanent scenario server rather than signing into a fresh scenario.  
**Interaction:** level/resources/base remain, but major scenario/map progression changes may not arrive there and social population can decline/merge later.  
**Result:** persistence becomes a **tradeoff against freshness/density**, not a strictly superior option.

### Case 3 — pollution changes the value of Stardust Ore

**Intention:** mine Stardust Ore in a contaminated zone.  
**Conditions:** ore locally suppresses Contamination.  
**Actions:** mine it for valuable material.  
**Interaction:** removing it increases local contamination until respawn; Sanity drains faster if Pollution Resist is insufficient and hostile anomaly pressure can increase.  
**Result:** harvesting a valuable resource temporarily makes its environment more dangerous.  
**Source:** [March 2025 pollution revamp](https://www.oncehuman.game/news/update/20250322/40780_1221471.html).

### Case 4 — capture rather than kill a Deviation

**Intention:** improve a Deviation team in the Deviation scenario.  
**Conditions:** target appears with desirable traits/role.  
**Actions:** use the scenario's capture tools instead of treating it as ordinary hostile loot; secure/deploy it.  
**Interaction:** the same anomalous ecology becomes collection, combat and territory capability.  
**Result:** exploration produces a persistent companion/tool rather than only resources.  
**Boundary:** this deep team/battle model belongs to Deviation: Survive, Capture, Preserve, not launch Manibus.

### Case 5 — Chef converts a survival chore into specialization

**Intention:** support a group preparing for difficult content.  
**Conditions:** Chef class selected; food ingredients available.  
**Actions:** creatively combine ingredients, discover/record recipes and produce specialized dishes.  
**Interaction:** food stops being only hunger restoration and becomes a social build-service role.  
**Result:** a survival maintenance system becomes a profession without locking the character out of gunplay/exploration.

### Case 6 — Beastmaster turns wildlife into traversal and labor

**Intention:** travel/gather with a persistent animal partner.  
**Conditions:** current Beastmaster class and September-2026 animal systems.  
**Actions:** breed/choose an animal, equip saddle where required, summon/command/ride it, gather or fight.  
**Interaction:** an animal can become mount, combat ally and production/gathering actor rather than livestock inventory.  
**Result:** class identity changes the player's relationship with an existing world entity.  
**Version caveat:** the 3.0.6 one-summon rework is already scheduled for further September 28 adjustment.

### Case 7 — Thermal Tower creates a shared climate project

**Intention:** survive worsening Way of Winter weather with nearby players.  
**Conditions:** scenario reaches relevant phase; territory/build resources available.  
**Actions:** construct/upgrade a Thermal Tower, configure permissions and invest group resources.  
**Interaction:** a local structure changes environmental survival conditions for multiple players.  
**Result:** base infrastructure becomes a **public-good coordination problem**, not only personal crafting.

### Case 8 — Custom Server host authors a new ruleset

**Intention:** run a community-focused variant instead of default official rules.  
**Conditions:** Custom Server access.  
**Actions:** change survival/combat/build/resource/respawn parameters, choose scenario content, configure custom rewards/items/Deviations and advertise the server.  
**Interaction:** host choices redefine what progression and scarcity mean; community payments can participate in official revenue sharing.  
**Result:** server governance becomes creator content and an economic role.  
**Limit:** custom-server-exclusive assets/rules are explicitly tagged/separated from official-server progression.

## R06 — people, AI, Deviations and social systems

### Human NPCs, factions and absent relationship simulation

The story includes survivor settlements and multiple friendly/hostile factions. The current Steam product explicitly frames some factions as violent/hostile and others as friendly/helpful; scenario-specific PvP such as Prismverse can assign players to stronger faction identities. [Steam product page](https://store.steampowered.com/app/2139460/Once_Human/).

This is **not** a freeform relationship simulator: the dossier found no romance/companion-affinity party system, no dynamic dialogue-driven faction-reputation ladder comparable to a political RPG and no documented daily-schedule simulation for settlement NPCs. Quest NPCs/merchants primarily function as authored story/service actors.

Launch criticism repeatedly describes the ordinary human narrative as jargon-heavy/thin compared with creature design.

### Companion layers: Deviations, animals and human teams

Once Human has companion mechanics, but they are mostly **nonhuman/systemic** rather than authored party-character relationships. Combat Deviations can be deployed for abilities, territory Deviations automate work, the Deviation scenario supports teams of anomaly companions, and current Beastmaster animals can be summoned/ridden/commanded. Human players form the social party through teams/Hives rather than recruiting narrative NPC followers.

As of this audit, the live Beastmaster rules still allow one simultaneous animal until September 28; the announced three-animal version is future. This matters for accurately describing current companion capacity.

### Deviants versus Deviations

This distinction matters:

- **Deviants** are hostile anomalous creatures/enemies.
- **Deviations** are securable/capturable anomalous entities with useful capabilities.

The world is strongest when a strange entity has mechanics beyond "shoot the monster": a Deviation may automate, fight, farm or become a scenario collection target.

### Ordinary enemy AI

Multiple 2024 reviews praise monster art but criticize routine enemy AI as passive/simple. GamesRadar calls ordinary combat repetitive despite strong weapons; COGconnected notes enemy behavior/technical roughness; God is a Geek records weird AI even while enjoying combat overall.

Bosses and large anomaly encounters are a stronger behavioral/visual layer.

### Cooperation

PvE supports:

- teams;
- shared boss/dungeon runs;
- public events;
- nearby player territories;
- resource/economic exchange;
- group infrastructure in scenario-specific systems.

PC Gamer's launch review found random-player cooperation surprisingly frictionless and describes world bosses/public cooperation as part of the game's MMO appeal.

### PvP and factions

PvP scenarios and RaidZone create stronger information asymmetry and resource risk. Prismverse has faction structure; RaidZone intentionally blocks normal-mode power imports.

The closure of PvP permanent servers is useful evidence that competitive play needs **concentrated population and cadence**, not merely permanent persistence.

## R07 — art, audio, interface and feel

Once Human's strongest visual identity is its **New Weird/anomaly design**: buses walking on hands, object-human hybrids, balloon creatures, light-bulb insects, living vending machines and cute/uncanny Deviations. Critics who dislike the underlying mechanics still commonly praise monster/world art.

The world frequently juxtaposes:
- ordinary Americanized towns/roads;
- tactical firearms;
- cute cosmetics/companions;
- grotesque biomechanical anomalies.

That tonal breadth is both a strength and criticism: some players love the surreal collage; others find cosmetic/live-service styling undermines horror cohesion.

Gun feel is generally reviewed more positively than enemy AI. PC Gamer and GamesRadar both distinguish competent/punchy shooting from low-threat ordinary enemies.

### Audio, voice and territory music

The current Steam product lists **full English and Simplified Chinese audio** alongside multilingual subtitles. Environmental/creature sound, firearms and voiced story delivery support the New Weird world, while player territories can also use jukebox/music furniture introduced through live events/updates. [Steam](https://store.steampowered.com/app/2139460/Once_Human/).

This audit did **not** locate a trustworthy first-party composer/complete-score credit on the official site, so it does not invent one. Audio is therefore covered at the product/interaction level while soundtrack-production attribution remains an evidence limit.

### UI complexity

By 2026 this is one of the clearest player pain points. The game now contains:

- scenario/season menus;
- classes;
- Memetics/Tech;
- blueprint systems;
- events;
- multiple currencies;
- Battle Pass/store;
- server sign-up;
- Eternaland;
- Custom Server systems;
- Deviations;
- gear/mods.

Current Steam reviews repeatedly describe the menu/submenu structure as overwhelming even when the underlying gameplay is liked. A system-rich live game can become **interface-debt bound**.

### Current controls/platform state

Launch reviews correctly complained about no controller support; that is historical. Current PC/mobile/console support includes controller and cross-platform implementations, and first-person mode is available in the modern product. Do not preserve launch-control criticism as current feature absence.

## R08 — story, scenarios and connection to play

The setting is a post-apocalyptic Earth transformed by **Stardust** after the Starfall catastrophe. Meta-Humans can tolerate/use Stardust while much of the world has become anomalous.

The launch story provides:
- Meta-Human identity;
- Mitsuko/V and survivor contacts;
- Rosetta/hostile organizations;
- towns/labs/monoliths;
- Great Ones;
- environmental anomaly lore.

Critical reception repeatedly says the **creature/world premise is more compelling than the dialogue/mission narrative**. GamesRadar's central criticism is that fantastic anomaly concepts often resolve into conventional "loot a chest / shoot simple enemies" interactions.

The current quest taxonomy also matters to how story reaches play: **Main Story Tasks** carry the core campaign, **Side Story Tasks** branch into local stories, and **Exploration Notes** surface world discoveries after the 2026 terminology overhaul. The names changed from Stardust Journey / World Quest / Stardust Chronicles specifically to reduce comprehension cost. [2.3.1](https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html).

The scenario system is the more interesting long-term narrative device. A scenario can change the world's rules and survival premise:
- winter/climate catastrophe;
- dream/gravity changes;
- faction PvP;
- Deviation ecology;
- future ocean survival.

This makes the service feel more like a library of alternate realities than one endlessly appended questline.

## R09 — production and development

Once Human was in development for more than **three years** before launch with **300+ people**, according to Derek Qiu in a GDC 2024 interview. He also said Starry Studio used an engine developed specifically for the game. [GDC Q&A](https://wccftech.com/once-human-qa-starry-studio-opens-up-on-the-sci-fi-survival-game-at-gdc-2024/amp/).

Starry Studio ran multiple closed betas and a high-profile Steam Next Fest before launch. A pre-release developer interview says some harsher territory/upkeep ideas were cut after feedback because the team wanted survival to create enjoyment rather than rent-like burden. [PCGamesN interview](https://www.pcgamesn.com/once-human/interview-new-steam-survival-game).

The live operation has repeatedly removed/reworked systems rather than only adding:
- scenario sign-up was redesigned;
- permanent servers were added after reset complaints;
- permanent PvP servers were later closed due low population;
- Calibration was removed;
- Memetic Specialization's role was rethought into classes;
- classes themselves receive repeated reworks;
- pollution and Way of Winter systems were redesigned;
- server/world structures were merged/rebalanced.

This is a strong example of **continuous structural iteration**, but also creates learning debt for returning players.

### PC-first → mobile → console

NetEase's 2025 publishing interview says the team deliberately prioritized PC before mobile, retained cosmetic-only monetization despite mobile-market pressure, and used cross-platform infrastructure to preserve one community. The mobile launch achieved a top-download position across many regions according to the same operator account. [Naavik interview](https://naavik.co/podcast/cross-border-publishing-lessons-from-neteases-once-human/).

Console followed only in August 2026, after public statements that the team wanted it to be ready for full cross-play/cross-progression. [2026 operations interview](https://playday.one/2026/08/26/1v1-making-strange-memories-with-once-human/).

## R10 — marketing, distribution and virality

Before launch, Once Human had:
- more than **15 million global pre-registrations** by June 2024;
- the June Steam Next Fest's most-played demo according to official/Valve-referenced promotion;
- 300,000+ demo users in the official Next Fest announcement;
- top wishlist/trending positions;
- strong Twitch visibility.

[15m](https://www.oncehuman.game/update/20240619/37494_1161943.html) · [Next Fest](https://www.oncehuman.game/official/20240621/37493_1162373.html).

The strange-monster art is highly shareable because a screenshot can communicate the premise instantly. The creature design generated attention before players understood the scenario system.

Post-launch discovery used:
- free-to-play access;
- Twitch/community creator coverage;
- seasonal/scenario reveals;
- mobile cross-play launch;
- collaborations;
- custom-server communities;
- 2026 console launch and full cross-platform messaging.

The product also turns players into distributors through Custom Servers: server hosts recruit communities and can receive revenue sharing.

## R11 — commercial and participation context

Once Human is free-to-play. Current first-party policy says gameplay modes/content are free and purchases focus on cosmetics/Battle Pass/non-power content. [Console FAQ](https://www.oncehuman.game/news/update/20260820/40780_1311772.html).

That does **not** mean the shop is simple: the September 3.0.6 announcement contains a **Meta Pass subscription**, direct cosmetics and chance-based **Lightforge/Combo blind-box** products, and Steam labels the game as containing chance-based in-game purchases. The fair description is "no advertised gameplay-power sale, but extensive cosmetic/subscription/chance-based monetization," which better matches current player criticism. [3.0.6 monetization surface](https://www.oncehuman.game/news/devBlog/20260916/40781_1314019.html) · [Steam](https://store.steampowered.com/app/2139460/Once_Human/).

Useful dated public scale measures:

- **15m global pre-registrations** by June 19, 2024. [official](https://www.oncehuman.game/update/20240619/37494_1161943.html)
- launch operator Derek Qiu said the game reached **10m downloads in roughly its first month** and ranked #5 globally among Steam's most-played at the time. [Gamescom interview](https://wccftech.com/once-human-qa-the-launch-was-successful-beyond-our-imagination/)
- mobile pre-registration exceeded **30m** before April 2025 launch. [official](https://www.oncehuman.game/news/official/20250321/40779_1221045.html)
- the 2026 console launch expands the same account/cross-play ecosystem to PS5/Xbox.

Pre-registrations, downloads, concurrent users, active users and revenue are different measures. This dossier does not convert them into one "lifetime players" or revenue number.

The Custom Server Community Creation Program introduces another business layer: hosts can receive a share of qualifying player spending within their communities. This turns a survival game's server ecosystem into part of creator economics.

## R12 — reception, five written reviews and current Steam evidence

### Five substantive independent written reviews

1. **PC Gamer — Heather Newman, July 18, 2024.** Praises the surprisingly deep free-to-play survival/MMO mashup, building/crafting and spontaneous cooperation while noting ordinary combat difficulty was low in the first novice season and the product borrows heavily from many genres. [Full review](https://www.pcgamer.com/games/mmo/once-human-review/).

2. **GamesRadar+ — Phil Hornshaw, July 23, 2024.** Strongly praises the anomaly/monster designs and map variety, but argues the bizarre art often hides generic chest-looting, thin mission structure and repetitive combat against weak AI. It also says the cosmetic-only shop did not pressure the reviewer to pay. [Full review](https://www.gamesradar.com/games/mmo/once-human-review/).

3. **God is a Geek — Mick Fraser, July 26, 2024.** Praises approachable survival, shared-world atmosphere, crafting, combat, mobility/territory relocation and free-to-play value; criticizes awkward building controls, weird AI, pop-in/lag and the density of currencies/live-service menus/FOMO surfaces. [Full review](https://godisageek.com/reviews/once-human-review/).

4. **COGconnected — Mark Steighner, July 16, 2024.** Praises the multi-genre integration, fun combat, creature design, solo viability and accessible crafting while criticizing optimization, long loads, bugs, narrative jargon and the possibility of too many systems. [Full review](https://cogconnected.com/review/once-human-review/).

5. **But Why Tho? — Arron Kluz, July 15, 2024.** Takes the strongest negative view: excellent anomaly art and attractive building are undermined by repetitive POI clearing, simple enemies, technical problems and a story that teases mysteries without satisfying development. It treats the seasonal-reset structure as promising for some players and alienating for others. [Full review](https://butwhytho.net/2024/07/review-once-human-is-alright-i-guess-pc/).

**Supplemental:** Game8's launch review is strongly positive about value, multiplayer and visual style while acknowledging bugs/EULA controversy; Metacritic preserves a wider 2024 critic range from strongly positive to mixed. [Game8](https://game8.co/articles/reviews/once-human-review) · [Metacritic](https://www.metacritic.com/game/once-human/critic-reviews/).

### Current Steam player evidence — September 2026

Current English Steam surfaces were directly inspected again in this audit. Steam currently reports a **Very Positive recent** aggregate while the all-time English aggregate is lower, reinforcing that launch-era review bodies should not substitute for current sentiment. Helpful/all-time negative material remains version-mixed and is used only qualitatively. [Steam](https://store.steampowered.com/app/2139460/Once_Human/) · [current reviews](https://steamcommunity.com/app/2139460/reviews/) · [helpful negatives](https://steamcommunity.com/app/2139460/negativereviews/?browsefilter=toprated&l=english).

**Positive recent testimony includes:**
- players with 100–1,000+ hours still enjoying the survival loop;
- praise for the core idea, progression variety and playing with friends;
- continued appreciation of the unusual world.

**Negative current testimony includes:**
- confusion with UI/menu density;
- ordinary enemy/quest combat feeling spongey or simple;
- scenario reset anxiety from players who still do not understand or prefer the inheritance model;
- dislike of daily territory reinforcement/upkeep-like requirements in some current systems;
- current technical/polish complaints;
- frustration with cosmetic-store complexity;
- concern about low population on some worlds.

[Current Steam reviews](https://steamcommunity.com/app/2139460/reviews/) · [all-time negative helpful](https://steamcommunity.com/app/2139460/negativereviews/?browsefilter=toprated&l=english).

These are qualitative samples, not prevalence measures. A 2024 complaint that "there is no permanent server" is now historically superseded; a 2026 complaint that permanent worlds can be sparsely populated remains consistent with first-party server-merge/closure data.

### Durable reception tensions

**Breadth versus coherence.** The game has shooting, MMO events, building, creature collection, classes, farming, PvP, scenarios, custom servers and live events. Admirers call it generous; detractors call it unfocused.

**Fresh scenarios versus attachment.** Reset/inheritance can refresh an economy, but base builders may value one unbroken home more than seasonal novelty.

**Anomaly imagination versus generic verbs.** The art can promise uncanny interaction while the task resolves into normal shooting/looting.

**Free content versus monetization/UI noise.** Cosmetic-only monetization avoids pay-to-win but still adds currencies, banners and event surfaces that compete for attention.

**Persistent servers versus population density.** Removing shutdown/reset does not automatically preserve a healthy social world.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Separate durable identity from world-local state

Once Human's strongest structural lesson is that one player can retain:
- identity;
- blueprints/knowledge;
- cosmetics/social relationships;
- selected stored resources;

while a new scenario owns:
- current level;
- world phase;
- resource economy;
- map state;
- territory placement.

OpenLegend should explicitly model **actor-owned, world-owned and portable knowledge/design state** instead of treating save persistence as all-or-nothing.

### 2. A scenario can be a coherent package of world laws

Way of Winter, Deviation and Prismverse do more than swap quest text; they alter:
- climate;
- social incentives;
- capture rules;
- PvP;
- progression;
- group infrastructure.

For OpenLegend, world packages should be able to change laws coherently without contaminating the universal engine.

### 3. Persistence is not enough; communities need density

Permanent PvP servers failed socially despite technically preserving worlds. OpenLegend worlds should measure:
- active participants;
- interaction density;
- group continuity;

not only "is the database still alive?"

Merging, migration or federation may be healthier than immortal empty shards.

### 4. Delete systems that no longer justify their complexity

Removing Calibration is a valuable precedent. Live games accumulate mechanics faster than players can learn them.

OpenLegend should treat **system deletion/consolidation** as normal evolution, with migrations and transparent compensation where necessary.

### 5. Make weird entities useful in more than one subsystem

Deviations work because they can be:
- companions;
- workers;
- collectors;
- build pieces;
- class/scenario participants.

An OpenLegend entity should ideally remain one coherent entity with many relationships, not become separate "combat pet," "worker unit" and "quest token" objects.

### 6. Classes can specialize relationships rather than combat rotation

Chef/Gardener/Beastmaster change how the player relates to food, plants and animals. This is much more world-sim relevant than fighter/mage/rogue.

OpenLegend can make professions unlock **new affordances over existing reality**, while still permitting flexible action outside the profession.

### 7. Creator-hosted rules can become a product surface

Custom Servers show a path from:
**configurable server → named community → authored mode → discovery surface → creator revenue.**

Macrofold/OpenLegend could eventually expose safe, bounded world-law configuration while preserving canonical engine invariants.

### 8. Avoid live-service interface debt

Once Human's biggest current design warning is not lack of mechanics; it is that players struggle to understand where the mechanics live.

New systems should pay an explicit **navigation/mental-model budget**:
- can the player predict where to find it?
- does it reuse existing concepts?
- can obsolete surfaces be removed?

### 9. Announced/test content must remain epistemically separate

Isles of Abyss is currently in a confidential final test. Even if promotional interviews describe it, its test behavior is not the released product.

OpenLegend research/design should distinguish:
- idea;
- private/public test;
- shipped version;
- persistent accepted behavior.

### What not to copy automatically

- frequent scenario churn for worlds where long relationships/history are the main value;
- reset mechanics as a default engagement tool;
- five-plus overlapping currencies because monetization is cosmetic;
- server proliferation without population-management strategy;
- shallow AI hidden behind spectacular art;
- NetEase/Starry's protected anomalies, characters, scenarios or visual designs.

## R14 — sources, preservation, routes and requirement map

### Prior-owner / preservation check

Repository search and the current game-inspiration navigation found **no prior dedicated Once Human dossier, chapter or mechanics study**. G147 is a new September 27 survival-expansion subject. This dossier preserves the roster's required boundaries around:

- scenarios versus universal rules;
- seasonal/permanent inheritance;
- monetization;
- platform/version changes;
- future/test content.

No Isles of Abyss NDA/test contents beyond official published descriptions are used. No private or leaked test material is included.

### Annotated source register

**S01 — Once Human console launch FAQ, Aug. 20, 2026.** Primary current platform/cross-play/F2P monetization and detailed inheritance/Eternaland rules.  
https://www.oncehuman.game/news/update/20260820/40780_1311772.html

**S02 — Console launch, Aug. 25, 2026.** Primary PS5/Xbox live launch date and current platform context.  
https://www.oncehuman.game/news/update/20260825/40780_1312198.html

**S03 — Version 3.0.6, Sep. 16, 2026.** Primary current-version boundary, Beastmaster update, permanent-server merge implementation and Isles Pioneer test.  
https://www.oncehuman.game/news/devBlog/20260916/40781_1314019.html

**S04 — Isles of Abyss final-test recruitment, Aug. 30, 2026.** Primary evidence that the ocean scenario is still a confidential data-wipe test, not released normal content.  
https://www.oncehuman.game/news/official/20260828/40779_1312551.html

**S05 — Permanent scenario server guide, Jun. 5, 2025.** Primary non-shutdown server rationale/rules and what update types do/do not apply.  
https://www.oncehuman.game/news/update/20250530/40780_1237751.html

**S06 — Permanent-server optimization, Dec. 8, 2025.** Primary first-party low-PvP-population evidence and January-2026 closure decision.  
https://www.oncehuman.game/news/devBlog/20251208/40781_1275401.html

**S07 — Permanent server merge notice, Sep. 14, 2026.** Primary current population/friend-fragmentation evidence and merge plan.  
https://www.oncehuman.game/news/devBlog/20260914/40781_1313806.html

**S08 — Visional/Normal Worlds, May 25, 2026.** Primary current layered-world/scenario server model.  
https://www.oncehuman.game/news/devBlog/20260525/40781_1301445.html

**S09 — Class system introduction, Jun. 30, 2025.** Primary rationale replacing randomized specialization pressure and Chef/Gardener/Beastmaster/Freelancer design.  
https://www.oncehuman.game/news/update/20250630/40780_1243929.html

**S10 — Beastmaster Sept. 2026 overhaul/follow-up.** Primary current animal riding/command system and near-term summon-limit transition.  
https://www.oncehuman.game/news/devBlog/20260911/40781_1313682.html  
https://www.oncehuman.game/news/devBlog/20260915/40781_1313919.html

**S11 — Pollution Zone revamp, Mar. 22, 2025.** Primary contamination/Sanity/Stardust Ore/Veil of Tranquility mechanics.  
https://www.oncehuman.game/news/update/20250322/40780_1221471.html

**S12 — Way of Winter 1.3 + 2025 update test.** Primary temperature/Thermal Tower and evolved weather rules.  
https://www.oncehuman.game/news/update/20241014/40780_1186579.html  
https://www.oncehuman.game/news/update/20250603/40780_1238298.html

**S13 — Deviation: Survive, Capture, Preserve launch, Oct. 29, 2025.** Primary capture/team/companion/battle scenario mechanics.  
https://www.oncehuman.game/news/update/20251029/40780_1267745.html

**S14 — Calibration removal, Jan. 13, 2026.** Primary system-deletion rationale.  
https://www.oncehuman.game/m/news/devBlog/20260113/40781_1281545.html

**S15 — RaidZone rules.** Primary mode-local item/Deviation/progression separation.  
https://www.oncehuman.game/news/wiki/20250814/40782_1250063.html

**S16 — Custom Server/Community Creation 2026 sources.** Primary host configuration and creator-revenue model.  
https://www.oncehuman.game/news/official/20260415/40779_1296153.html  
https://www.oncehuman.game/news/official/20260313/40779_1290572.html  
https://www.oncehuman.game/news/devBlog/20251226/40781_1278814.html

**S17 — Starry Studio GDC 2024 Q&A.** Developer interview: 3+ years, 300+ staff, custom engine. Secondary interview host, direct quoted developer answers.  
https://wccftech.com/once-human-qa-starry-studio-opens-up-on-the-sci-fi-survival-game-at-gdc-2024/amp/

**S18 — PCGamesN pre-launch developer interview.** Direct Derek Qiu account of discarded territory-rent/survival burden and playtest feedback.  
https://www.pcgamesn.com/once-human/interview-new-steam-survival-game

**S19 — Naavik publishing interview, Apr. 29, 2025.** Direct overseas-operations account of PC-first strategy, cosmetic-only monetization, cross-border/live-ops process and mobile expansion.  
https://naavik.co/podcast/cross-border-publishing-lessons-from-neteases-once-human/

**S20 — Official pre-registration/Next Fest announcements.** Primary 15m preregistration and official/Valve-referenced demo/wishlist/Twitch metrics.  
https://www.oncehuman.game/update/20240619/37494_1161943.html  
https://www.oncehuman.game/official/20240621/37493_1162373.html

**S21 — Official mobile 2025 announcement.** Primary 30m+ mobile pre-registrations and non-shutdown-server rollout context.  
https://www.oncehuman.game/news/official/20250321/40779_1221045.html

**S22 — Gamescom 2024 Q&A.** Direct Derek Qiu account of 10m first-month downloads and launch response.  
https://wccftech.com/once-human-qa-the-launch-was-successful-beyond-our-imagination/

**S23 — PC Gamer, Heather Newman, Jul. 18, 2024.** Full independent launch review read.  
https://www.pcgamer.com/games/mmo/once-human-review/

**S24 — GamesRadar+, Phil Hornshaw, Jul. 23, 2024.** Full independent review read; strongest anomaly-art versus generic-interaction critique.  
https://www.gamesradar.com/games/mmo/once-human-review/

**S25 — God is a Geek, Mick Fraser, Jul. 26, 2024.** Full independent review read; world/social/QoL praise versus building/UI/live-service density criticism.  
https://godisageek.com/reviews/once-human-review/

**S26 — COGconnected, Mark Steighner, Jul. 16, 2024.** Full independent review read; genre integration, combat and technical/narrative criticism.  
https://cogconnected.com/review/once-human-review/

**S27 — But Why Tho?, Arron Kluz, Jul. 15, 2024.** Full independent review read; strong mixed/negative perspective on repetition, narrative and live-service structure.  
https://butwhytho.net/2024/07/review-once-human-is-alright-i-guess-pc/

**S28 — Current Steam Community review surfaces, Sep. 2026.** Direct qualitative testimony for current UI, reset, technical, population and positive long-play experiences; not prevalence estimates.  
https://steamcommunity.com/app/2139460/reviews/  
https://steamcommunity.com/app/2139460/negativereviews/?browsefilter=toprated&l=english

**S29 — Once Human 3.0.6 September 23 fixes + September 28 plans.** Primary current-version boundary: still 3.0.6 on Sep. 27; Sep. 28 character/Beastmaster changes are future.  
https://www.oncehuman.game/news/update/20260923/40780_1314904.html  
https://www.oncehuman.game/news/devBlog/20260911/40781_1313623.html  
https://www.oncehuman.game/news/devBlog/20260915/40781_1313919.html  
https://www.oncehuman.game/news/devBlog/20260923/40781_1314860.html

**S30 — 2026 Tech-system overhaul and optimization.** Primary current progression rules: four Tech branches, reverse engineering, inventions, Tech Points/enhancements, removal of specialization and scenario-local resets.  
https://www.oncehuman.game/news/devBlog/20260302/40781_1288924.html  
https://www.oncehuman.game/banner/20260408/41906_1295195.html  
https://www.oncehuman.game/m/news/official/20260513/40779_1300125.html

**S31 — Blueprint / dropped-gear progression, Mar.–Apr. 2026.** Primary direct-Starchrom blueprint unlock/upgrade, conversion, Starchrom wilderness rewards and star-rated dropped gear.  
https://www.oncehuman.game/m/news/update/20260311/40780_1290685.html  
https://www.oncehuman.game/news/update/20260409/40780_1295383.html

**S32 — RaidZone stealth, death and protection.** Primary mode-specific crouch stealth, Casual/Standard/Hardcore death drops, Safe Backpack/Vault and configurable death-drop/respawn rules.  
https://www.oncehuman.game/news/update/20260709/40780_1307147.html  
https://www.oncehuman.game/news/devBlog/20260416/40781_1296450.html  
https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html  
https://www.oncehuman.game/news/update/20251203/40780_1274519.html

**S33 — Current quest/creator activity references.** Primary 2026 task terminology and Eternaland Island Paradise Hide-and-Seek/faction facilities.  
https://www.oncehuman.game/m/news/update/20260121/40780_1282991.html  
https://www.oncehuman.game/m/news/devBlog/20260129/40781_1284568.html

**S34 — Current Steam product page, Sep. 2026.** Primary current audio languages, official faction/product framing, recent/all-time review aggregates and chance-based purchase disclosure.  
https://store.steampowered.com/app/2139460/Once_Human/

### Suggested reading route

1. Read **S01** first to understand current inheritance/cross-platform rules; launch articles alone are now structurally stale.
2. Read **S23–S27** as a five-review snapshot of what the 2024 launch actually felt like.
3. Read **S05–S08** to see how reset complaints became permanent servers and then population/merge problems.
4. Read **S09–S14** for the strongest examples of live systems being replaced/reworked.
5. Read **S17–S19** for production/publishing intent.
6. Read **S28** last for current user friction.
7. Treat S04 as a strict future/test boundary; no leaked Pioneer material belongs in this dossier.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | identity/current scenarios/platform/version boundary |
| R02 | survival, classes, Deviations, combat, territory, PvP/custom servers |
| R03 | build/entity/territory/blueprint composition |
| R04 | scenario inheritance, permanent servers, Eternaland, economy/time |
| R05 | eight worked interactions |
| R06 | NPCs, Deviants/Deviations, cooperation and PvP |
| R07 | New Weird art, shooting/UI/platform feel |
| R08 | story and scenario-authored world laws |
| R09 | team/engine/testing/live structural iteration |
| R10 | preregistration, Next Fest, platform/creator distribution |
| R11 | participation measures and F2P structure |
| R12 | five full reviews + current Steam testimony |
| R13 | transferable patterns/limits |
| R14 | source register, preservation, route and this map |

### Evidence limits

- No game client, current server or custom-server console was executed.
- No private Isles of Abyss test/leak/NDA material was accessed or reproduced.
- No video/trailer is represented as watched.
- Many systems are scenario/world/server-rule specific; this dossier avoids promoting one server's parameters to universal rules.
- Exact normal-PvE death-drop percentages were not cleanly specified in the current first-party sources retrieved; the dossier documents verified downed/respawn behavior and the explicit RaidZone/custom-server contracts instead of inventing a universal percentage.
- The Sep. 28 free-reshape and three-animal Beastmaster rules are announced but future on Sep. 27.
- No authoritative first-party soundtrack/composer credit was located in this audit; no composer attribution is invented.
- Review bodies are primarily 2024 launch evidence; current mechanics use dated first-party 2025–2026 sources and current player testimony.
- Steam player samples are qualitative, not prevalence estimates.
- First-party preregistration/download figures are preserved as their original metric; they are not converted into revenue or current active users.
