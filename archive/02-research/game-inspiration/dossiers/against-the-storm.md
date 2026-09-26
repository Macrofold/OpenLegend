# Against the Storm — full research dossier

**G45 · Complete research pass, September 26, 2026.** This dossier uses the current PC **1.11 Rebel Hideout** update (released September 24, 2026) as the latest verified base-game boundary. It separates the base game from **Keepers of the Stone** (2024) and **Nightwatchers** (2025), while incorporating them where their species/biome rules illuminate the same settlement grammar. Earlier Early Access mechanics are identified as historical when later redesigns changed them.

[Preserved overview](../games/against-the-storm.md) · [Detailed mechanics study](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

Against the Storm's strongest OpenLegend lesson is that **renewal can come from incomplete local problems without erasing the larger world**. Each settlement is bounded and disposable at the macro scale, yet player knowledge, the Smoldering City, world-map progress and campaign consequences persist. The game continually makes scarcity, missing capabilities and timing useful rather than treating a fully solved economy as the only desirable end state.

## 1. Identity, current scope and player promise

Against the Storm is Eremite Games' single-player dark-fantasy roguelite city builder, published by Hooded Horse.

It reached Steam Early Access in November 2022 and 1.0 on December 8, 2023. The current PC build at this pass is **1.11**, a small September 24, 2026 update adding the Rebel Hideout world-map modifier plus UX/balance work. [ATS-A](#ats-a)

The player is the Scorched Queen's Viceroy.

At the settlement level, the player:
- selects buildings from limited blueprints;
- gathers resources;
- assigns workers by species/capability;
- chooses recipe inputs;
- manages food/fuel/production;
- opens dangerous glades;
- fulfills Orders;
- responds to Events;
- trades;
- manages Resolve;
- controls Hostility;
- uses Rainpunk;
- handles Blightrot;
- earns Reputation before Impatience or collapse ends the effort.

At the world/cycle level, the player:
- chooses expedition locations;
- builds multiple settlements;
- gathers Citadel resources;
- unlocks upgrades;
- interacts with world modifiers;
- pushes toward Seals;
- eventually faces high-difficulty meta challenges such as Queen's Hand Trial.

This is not a conventional one-city-forever builder.

## 2. Persistence is layered rather than binary

A settlement is intentionally temporary.

But the game does not reset everything.

Persistent layers include:
- Viceroy experience;
- Smoldering City upgrades;
- deeds/achievements;
- unlocks;
- world-map/cycle consequences;
- human player knowledge.

A cycle eventually ends in the Blightstorm, clearing much of the frontier.

This structure matters because “reset” can mean several different things:
- local buildings disappear;
- global progression persists;
- knowledge persists;
- campaign direction persists.

### OpenLegend lesson

A persistent world can still contain **bounded projects**:
- expedition;
- siege;
- festival;
- temporary colony;
- disaster response;
- research mission.

Those can conclude cleanly without deleting:
- relationships;
- biographies;
- inventions;
- political consequences;
- the player's home.

## 3. Species create economic/social differences

Base-game species include:
- Humans;
- Beavers;
- Lizards;
- Harpies;
- Foxes.

DLC adds:
- Frogs (Keepers of the Stone);
- Bats (Nightwatchers). [ATS-B](#ats-b) [ATS-C](#ats-c)

Species differ through:
- needs;
- preferred work;
- Resolve thresholds;
- service/food desires;
- housing;
- special mechanics.

This makes population composition materially change production priorities.

### Frogs

Frogs emphasize:
- stone masonry;
- rainwater;
- upgradeable species-specific housing.

They refuse ordinary shelters, turning housing from a generic checkbox into a progression system. [ATS-B](#ats-b)

### Bats

Bats emphasize:
- metallurgy;
- harsh sacrifice/discipline themes;
- mechanics such as the Manorial Court expulsion effect after relevant unlocks. [ATS-C](#ats-c)

### OpenLegend lesson

Inhabitants should differ because:
- what they can do;
- what they need;
- what they value;
- how institutions treat them

change actual settlement decisions.

Do not create “species/personality” that exists only in dialogue flavor.

## 4. Blueprints constrain the settlement vocabulary

Buildings are not all immediately available.

Blueprint choices grant construction capability.

Therefore:
- having raw materials does not imply having every transformation;
- one settlement may lack an efficient food chain another had;
- the player must adapt to offered capability.

This creates a valuable kind of incompleteness:
> the settlement is a solution using the tools actually available.

OpenLegend procedural worlds can similarly vary:
- known technologies;
- teachers;
- institutions;
- materials;
- local magic;
- infrastructure

without arbitrarily disabling the underlying engine.

## 5. Production recipes use bounded substitution

Recipes can accept alternative inputs.

For example, preserved research documents Flour using supported alternatives such as Grain, Mushrooms or Roots, and downstream food recipes accepting their own bounded ingredient alternatives. [ATS-D](#ats-d)

The important point is not “anything can substitute for anything.”

It is:
- alternatives are explicit;
- buildings differ in recipe efficiency;
- scarce ingredients may have competing uses;
- production limits prevent accidental consumption.

### OpenLegend lesson

A craft/invention system can support semantic categories:
- combustible fuel;
- edible sweetener;
- rigid beam material;

with meaningful compatibility limits.

That is much richer than one exact recipe per object and much safer than arbitrary LLM substitution.

## 6. Workers, logistics and Haulers

Workers are assigned to buildings/camps.

Production depends on:
- staffing;
- species;
- travel;
- storage;
- recipe limits/priorities;
- input availability;
- output hauling.

The 2026 **1.10 Over-Haulers** update specifically overhauled Haulers after community feedback that the old bonus system was unreliable and could create ingredient pileups. [ATS-E](#ats-e)

The current system thus preserves a valuable history:
- delegation was useful in principle;
- poorly legible logistics made it less useful;
- the developers revised the abstraction rather than simply adding more throughput.

### OpenLegend lesson

An autonomous worker is not successful because it “did things.”

It should:
- move the right resource;
- avoid starving higher-priority work;
- expose why it is blocked;
- not create hidden congestion.

## 7. Production limits make automation governable

The recipe interface supports:
- choosing allowed ingredients;
- output/ingredient search;
- global/building production limits;
- priorities.

Without limits, automation can consume:
- all grain into flour;
- all wood into one intermediate;
- all scarce medicine precursor into a low-priority product.

Therefore automation is paired with **policy**.

OpenLegend agent delegation should likewise expose:
- target amount;
- minimum reserve;
- permitted inputs;
- priority;
- stop condition.

“Keep producing” is rarely enough.

## 8. Resolve: economics becomes social management

Resolve reflects how well species needs are being met.

Factors include:
- complex foods;
- housing;
- services;
- workplace comfort;
- favoring;
- hostility/storm pressure;
- species-specific conditions.

Low Resolve can cause villagers to leave.

High Resolve can contribute Reputation.

This connects:
- production;
- morale;
- win condition.

A luxury product can therefore matter not because it sells for the most currency but because it keeps a fragile population participating.

### Limitation

Resolve is an aggregate management abstraction.

It is not:
- individual biography;
- autonomous belief;
- one person's private memory.

OpenLegend can preserve the economic link while replacing aggregate-only population logic with richer individual actors where appropriate.

## 9. Reputation versus Queen's Impatience

A settlement succeeds by filling the Reputation bar.

Reputation comes from sources such as:
- Orders;
- Events;
- sustained high Resolve.

Queen's Impatience grows under time/failure pressure and can end the settlement if it reaches its limit first.

A subtle interaction is that Impatience can reduce Hostility.

This means one “bad” meter can partially relieve another pressure.

The system rewards reasoning across coupled state rather than minimizing every negative variable independently.

## 10. Seasons and time

The settlement cycles through:
- Drizzle;
- Clearance;
- Storm.

Season changes affect:
- forest mysteries;
- hostility consequences;
- resource opportunities;
- risk.

The Storm is not merely a visual weather effect.

It alters whether continuing an economically useful task is sensible.

### Woodcutter example

Woodcutters increase Hostility under the documented system.

During a dangerous Storm, removing workers from woodcutting may reduce Hostility enough to protect Resolve.

That makes **pausing production** a meaningful action. [ATS-D](#ats-d)

OpenLegend schedules should similarly allow:
- season;
- danger;
- ritual;
- social event

to change whether a normal job should proceed.

## 11. Hostility: expansion creates its own pressure

Hostility increases through factors such as:
- time;
- population;
- opened glades;
- active woodcutters;
- difficulty-specific rules.

Higher Hostility worsens:
- Resolve pressure;
- Forest Mysteries during Storm.

Thus:
- more territory;
- more people;
- more extraction

can make the world more dangerous.

Expansion is not a free monotonic improvement.

This gives the player a reason to ask:
> do I need to open another glade now?

## 12. Glades: discovery is an economic risk

Cutting into a new glade can reveal:
- resource nodes;
- fertile soil;
- events;
- caches;
- ruins;
- dangerous/forbidden events;
- opportunities.

Opening one increases Hostility and may introduce a crisis.

Therefore exploration is a bet:
- the settlement needs new options;
- the act of seeking them creates risk.

This is ideal systemic exploration:
> discovery changes the plan rather than only revealing scenery.

## 13. Orders and Events

### Orders

The Queen provides Orders with objectives/rewards.

They can steer:
- production;
- population;
- trade;
- construction;
- exploration.

The player chooses which objectives fit the settlement.

### Glade Events

Discovered Events can require:
- resources;
- workers;
- time;
- specific solution choices.

Their rewards/consequences can alter:
- resources;
- people;
- Reputation;
- conditions.

These give authored local meaning inside a procedural settlement.

OpenLegend can similarly embed:
- authored problems;
- generated location/state;
- multiple lawful solution paths.

## 14. Trade and Amber

Trade lets settlements compensate for missing local capability.

The player can:
- sell surplus;
- buy scarce goods;
- use Amber;
- interact with traders/routes depending on systems/unlocks.

Trade is valuable precisely because no settlement gets every chain.

This is another reason **incompleteness** produces gameplay.

If every town can efficiently make everything:
- trade loses purpose;
- specialization disappears;
- scarcity stops connecting places.

## 15. Rainpunk and Blightrot: choice-linked maintenance

The Rainpunk redesign is an especially important development case.

Earlier Blightrot imposed production burden with too little player choice.

The 2023 redesign tied powerful Rain Engines to:
- increased production/comfort;
- deliberate rainwater use;
- understandable contamination downside. [ATS-D](#ats-d)

The next update simplified contamination arithmetic to be easier to predict.

This is a strong design sequence:
1. identify unavoidable maintenance;
2. attach maintenance to a chosen benefit;
3. make the cost legible;
4. preserve the meaningful tradeoff.

OpenLegend needs/hunger/repair systems should pass the same test.

## 16. Building, roads and settlement layout

Players place:
- production buildings;
- warehouses;
- housing;
- services;
- roads;
- hearth-related infrastructure;
- gathering camps.

Layout changes:
- walking distance;
- hauling;
- work efficiency;
- access.

This is not an aesthetic-only city builder.

Spatial arrangement becomes part of production.

### OpenLegend opportunity

A generated settlement should not be a static backdrop.

Distances should matter enough that:
- warehouse placement;
- workshop grouping;
- roads;
- gates;
- housing

create understandable consequences without requiring microscopic path optimization.

## 17. Failure and settlement completion

A settlement can fail through:
- Impatience;
- population/Resolve collapse;
- inability to stabilize economy.

But the roguelite structure makes failure informative rather than globally destructive.

Winning a settlement also means **leaving it**.

This is intentionally unusual for city-building audiences.

Current negative Steam reviews still show the tradeoff:
- some players love repeated triage;
- others find repeated starts/RNG/progression tedious even after many hours. [ATS-F](#ats-f)

This is audience preference, not one objectively correct persistence model.

## 18. Prestige and high difficulty

Difficulty scaling eventually reaches Prestige modifiers.

These change:
- economy;
- requirements;
- threats;
- constraints.

The goal is not only “more enemy HP.”

High-level play asks the player to master:
- recipe value;
- species needs;
- route risk;
- hostility timing;
- trade;
- resource reserves.

Nightwatchers/1.8-era community material explicitly discusses Prestige 20 play, while 1.10/1.11 continue refining the base. [ATS-E](#ats-e)

## 19. World map, cycles and Seals

Settlements are placed within a larger cycle.

Location affects:
- biome;
- modifiers;
- distance;
- rewards;
- Seal strategy.

The recurring Blightstorm gives the macro map a deadline.

This creates a multi-settlement planning layer:
- where should I spend this settlement attempt?
- which modifier is worth engaging?
- can I reach the target Seal?

The local town is therefore one **operation** in a larger campaign.

## 20. Queen's Hand and Training Expeditions

### Queen's Hand Trial

1.0 added the Queen's Hand challenge:
- severe campaign constraint;
- limited meta progression;
- ironman-like failure stakes;
- Adamantine Seal objective. [ATS-G](#ats-g)

This tests mastery without changing the default experience for all players.

### Training Expeditions

Custom/training modes let players experiment under selected conditions.

The 1.10 update added support for four species in Training Expeditions.

These are useful OpenLegend patterns:
- separate learning/sandbox contracts from canonical persistent worlds;
- do not make every debug/creator ability part of normal embodiment.

## 21. Current DLC boundaries

### Keepers of the Stone — September 26, 2024

Adds:
- Frogs;
- Coastal Grove;
- Ashen Thicket;
- species/buildings/orders/opportunities;
- Frog housing progression;
- Strider Port expeditions;
- biome-specific mechanics. [ATS-B](#ats-b)

### Nightwatchers — July 31, 2025

Adds:
- Bats;
- Rocky Ravine;
- Bamboo Flats;
- new buildings/deeds/events;
- Black Market dependence;
- Fluffbeak/fertilizer ecology;
- harsh Bat social mechanics. [ATS-C](#ats-c)

Both are good expansion design examples because they introduce **different priorities**, not simply larger resource numbers.

## 22. Current 1.10–1.11 development

In July 2026, 1.10:
- overhauled Haulers;
- added three world modifiers;
- improved fishing/resource UI;
- expanded Training options.

In September 2026, **1.11 Rebel Hideout**:
- added a modifier limiting settlements to two species;
- added a related Deed/home decoration;
- improved scout behavior/UI/tooltips/tutorial clarity;
- made small balance changes. [ATS-A](#ats-a)

The two-species modifier is especially revealing:
> less content in a run can create a *different* strategy space.

Variation does not require always adding.

## 23. Art, audio, interface and feel

Against the Storm uses:
- painterly dark-fantasy characters;
- strong species silhouettes;
- warm settlement light against hostile rain/forest;
- readable production panels;
- pauseable real-time simulation.

The interface must explain dense systems:
- recipe inputs;
- production output;
- worker assignment;
- Resolve;
- Hostility;
- seasonal threats;
- trade.

PCGamesN particularly praises how deep systems remain approachable. [ATS-H](#ats-h)

The current 1.10/1.11 updates continue adding:
- overlays;
- tooltips;
- panel improvements;
- depletion indicators;
- tutorial rewrites.

That reinforces a core lesson:
> systemic depth creates an ongoing UI obligation.

## 24. Story and worldbuilding

The premise:
- apocalyptic rains;
- the Scorched Queen;
- Smoldering City;
- repeated frontier rebuilding;
- ancient ruins/Forest;
- Seals;

gives mechanical resets an in-world explanation.

Narrative appears through:
- Orders;
- Events;
- world modifiers;
- species;
- Aunt Lori/tutorial;
- Deeds;
- Seals;
- Queen's Hand framing.

This is not character-dialogue-heavy RPG storytelling.

Its strength is **mechanical premise alignment**:
- the world explains why cities are temporary.

## 25. Production and community process

Eremite Games is a small Polish studio.

Its development history repeatedly shows:
- frequent Early Access updates;
- public roadmap;
- player feedback;
- design diaries;
- explicit redesigns in response to friction.

The Rainpunk redesign and 2026 Hauler overhaul are concrete examples where the team explains:
- what was wrong;
- why the old system failed;
- what semantic change they wanted.

The studio's 2024 million-sales comments explicitly credit treating players respectfully/listening to feedback as part of its success story. That is a creator interpretation, not controlled causal proof. [ATS-I](#ats-i)

## 26. Distribution and commercial context

Distribution includes:
- Steam;
- GOG;
- Epic;
- Microsoft ecosystem/Game Pass;
- later console releases.

1.0 launched December 8, 2023 with PC Game Pass availability. [ATS-G](#ats-g)

### Sales milestones

- March 2024: publisher/developer announced **1 million Steam copies sold**. [ATS-I](#ats-i)
- July/August 2026 developer news: **2 million copies sold**, reached around a Steam free weekend; the same update reported a free-weekend concurrent peak of 6,313, highest since September 2024. [ATS-J](#ats-j)

These are developer-reported unit milestones and should not be mixed with:
- Game Pass players;
- demo users;
- concurrent users;
- review counts.

## 27. Marketing and discovery

The game has a strong one-line contrast:
> city builder + roguelite.

But the more useful positioning is:
> continually solve the interesting early/mid settlement problem under different constraints.

Marketing/discovery routes include:
- Early Access updates;
- Steam visibility;
- demo;
- PC Game Pass;
- Twitch integration;
- sales/free weekends;
- reviews/word of mouth.

The 2026 free weekend is a clean current example of reducing trial friction while a demo with progress carryover remains available. [ATS-J](#ats-j)

## 28. Five substantive written reviews

### 1. PC Gamer — Leana Hafer, December 19, 2023

**Praised:** bounded settlements solve late-city-builder stagnation; strong atmosphere; meta continuity; adaptive economies.

**Criticized / tension:** the premise initially clashes with the traditional desire to build a forever-home, and some procedural choices/events can become more predictable with mastery.

The review is unusually useful because the critic begins from skepticism toward impermanence. [ATS-K](#ats-k)

### 2. PCGamesN — Joshua Brown, December 4, 2023

**Praised:** near-perfect genre fusion, pacing, approachable interface, community-informed production and “one more town” momentum.

**Criticized:** the same complexity/pressure that creates depth can be intense; it is not a relaxing decorative city-builder.

The review highlights the clarity of the hybrid's purpose rather than merely genre labels. [ATS-H](#ats-h)

### 3. Eurogamer — Ruth Cassidy, December 14, 2023

**Praised:** chaos/variation, adaptation, balance and the way runs evolve with player learning.

**Criticism/boundary:** strongly positive review; its value is detailed appreciation of procedural constraint rather than representing dissent. [ATS-L](#ats-l)

### 4. Destructoid — Zoey Handley, December 4, 2023

**Praised:** avoids the stagnant progression problem of traditional builders while retaining substantial management depth; long-lasting replay structure.

**Criticism/boundary:** very positive; highlights the unusual longevity of repeated settlements rather than a persistent city. [ATS-M](#ats-m)

### 5. Rock Paper Shotgun — Liam Richardson, December 4, 2023

**Praised:** inventive combination of roguelite and city-building with challenge/excitement.

**Criticism/boundary:** again positive; useful as an independent full review in a launch corpus that was exceptionally favorable. [ATS-N](#ats-n)

The lack of a strongly negative professional launch review is an evidence fact, not a reason to manufacture criticism.

## 29. Steam positive and negative player evidence

At access:
- 95% of ~19.1k English Steam reviews are positive;
- recent English/all-language surface remains Very Positive;
- total-language purchaser reviews exceed 33k. [ATS-O](#ats-o)

### Positive themes

Helpful/current players value:
- repeated adaptation;
- meaningful constraints;
- deep production without one permanent mega-city;
- species differences;
- extensive difficulty ladder;
- frequent developer iteration.

### Negative/current themes

September 2026 negative reviews include:
- higher difficulties feeling like stacked taxes rather than empowering control;
- roguelite layers feeling like complexity-for-complexity;
- repetition/RNG fatigue after very long play;
- slow meta unlock progression. [ATS-F](#ats-f)

A 2026 Metacritic user complaint also argues the tutorial pushes beyond the typical Steam refund window. That is one user's interpretation of onboarding length, not evidence of developer intent. [ATS-P](#ats-p)

## 30. Concrete situations

### Situation A — substitute ingredients, preserve the product

**Goal:** produce Flour/Biscuits without Grain.

**State:** local Roots/Mushrooms and supported recipe/building exist.

**Action:** configure permitted substitute input.

**Result:** same useful product through a different regional chain.

**Lesson:** semantic alternatives make worlds adapt without making all materials interchangeable.

### Situation B — pause useful labor to survive the Storm

**Goal:** preserve Resolve during dangerous Hostility.

**Action:** pull some workers from woodcutting.

**Result:** less resource extraction but reduced Hostility pressure.

**Lesson:** a job's value depends on surrounding state/time.

### Situation C — spend scarce goods on one species

**Goal:** keep a fragile species above its Resolve threshold.

**Action:** direct limited complex food/service to that group.

**Result:** production allocation changes population stability/Reputation.

**Lesson:** economy becomes socially meaningful when recipients differ.

### Situation D — choose Rainpunk acceleration and accept maintenance

**Goal:** solve an urgent production shortfall.

**Action:** run Rain Engine harder.

**Result:** faster/better production paired with Blightrot management burden.

**Lesson:** upkeep is more meaningful when linked to a chosen advantage.

### Situation E — open a dangerous glade because the current economy is stuck

**Goal:** find fertile soil/resource/event.

**Action:** cut through.

**Result:** new opportunity plus Hostility/event risk.

**Lesson:** exploration should alter strategy and expose consequence.

## 31. Transferable inspiration for OpenLegend

### A. Use bounded projects inside persistent history

A settlement/outpost can conclude while:
- people remember it;
- artifacts persist;
- trade routes change;
- political consequences remain.

### B. Variation can come from missing capabilities

Do not grant every world every tool at the start.

### C. Use bounded semantic substitution

“Any fuel” can be a type while:
- wet wood;
- coal;
- magic crystal

retain different consequences.

### D. Pair automation with policy

Delegation needs:
- limits;
- reserves;
- priorities;
- stop conditions;
- inspectable queues.

### E. Make social needs economically consequential

A person's needs/preferences should alter:
- staffing;
- trade;
- construction;
- resource allocation.

### F. Tie maintenance to chosen benefit

Avoid bars that exist only to demand chores.

### G. Make expansion create pressure

New land/population/infrastructure can impose:
- defense;
- logistics;
- governance;
- ecological cost.

### H. Reduce complexity through UI, not by deleting meaningful relationships

As systems grow, invest in:
- overlays;
- causal explanations;
- search;
- production tracing.

## 32. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2 |
| R02 player actions / major mechanics | §§3–23 |
| R03 items / entities / composition | §§3–7, 12–16, 21 |
| R04 progression / economy / time | §§2, 8–11, 14, 17–23, 26 |
| R05 concrete interactions | §30 |
| R06 people / AI / social / multiplayer | §§3, 6, 8; single-player boundary |
| R07 art / audio / interface / feel | §23 |
| R08 story / narrative | §24 |
| R09 production / development | §25 |
| R10 marketing / distribution / virality | §§26–27 |
| R11 commercial / participation | §26 |
| R12 reviews / player feedback | §§28–29 |
| R13 inspiration / limits | §31 |
| R14 sources / preservation / navigation | this section + sources |

**Mechanics-inventory check:** species/population, buildings/recipes, gathering, substitution, logistics, trade, housing/services, Resolve, Hostility, seasons, exploration/glades, Orders/Events, Rainpunk/Blightrot, world map/cycles, difficulty/Prestige, settlement failure and meta progression are covered. Against the Storm has no native multiplayer and no individually simulated relationship/romance/dialogue system; species populations are managed aggregates.

**Preservation check:** [the original chapter](../games/against-the-storm.md) remains intact. [The detailed substitution/pressure study](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md) remains the owner for Flour/Biscuit substitution, Resolve, Hostility/Woodcutter, Rainpunk redesign and dated Early Access evidence. This dossier adds current 1.11, DLC and 2M-unit boundaries.

## Sources

<a id="ats-a"></a>**ATS-A — [Against the Storm official announcements](https://steamcommunity.com/app/1336490/announcements/).** Eremite Games, accessed 2026-09-26. 1.10 Over-Haulers and 1.11 Rebel Hideout current version/design notes.

<a id="ats-b"></a>**ATS-B — [Keepers of the Stone](https://store.steampowered.com/app/3075500/).** Eremite Games / Hooded Horse, released 2024-09-26. Primary DLC scope for Frogs/biomes/housing/Strider Port.

<a id="ats-c"></a>**ATS-C — [Nightwatchers](https://store.steampowered.com/app/3725110/Against_the_Storm__Nightwatchers/).** Eremite Games / Hooded Horse, released 2025-07-31. Primary DLC scope for Bats/Rocky Ravine/Bamboo Flats.

<a id="ats-d"></a>**ATS-D — [Against the Storm substitution, pressure, and renewable settlement problems](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md).** Internal detailed study with adjacent official/wiki references.

<a id="ats-e"></a>**ATS-E — [Over-Haulers Update 1.10](https://steamcommunity.com/app/1336490/announcements/).** Eremite Games, 2026-07-08/09. Hauler redesign and developer rationale; current version later superseded by 1.11.

<a id="ats-f"></a>**ATS-F — [Against the Storm negative Steam reviews](https://steamcommunity.com/app/1336490/negativereviews/?l=english).** Steam Community, accessed 2026-09-26. Current self-selected criticism on repetition, RNG, complexity and high difficulty.

<a id="ats-g"></a>**ATS-G — [PC Game Pass Is Getting A Mythical City Builder At Launch](https://www.gamespot.com/articles/pc-game-pass-is-getting-a-mythical-city-builder-at-launch/1100-6519340/).** GameSpot, 2023-11-20. 1.0/Game Pass/Queen's Hand boundary.

<a id="ats-h"></a>**ATS-H — [Against the Storm review — a near-perfect roguelike strategy game](https://www.pcgamesn.com/against-the-storm/review).** Joshua Brown, PCGamesN, 2023-12-04.

<a id="ats-i"></a>**ATS-I — [1 Million Steam Copies](https://store.steampowered.com/news/posts/?enddate=1711548445&feed=steam_community_announcements).** Eremite Games/Hooded Horse, 2024-03-27. Primary unit-sales milestone; also preserves developer quote on community approach.

<a id="ats-j"></a>**ATS-J — [Against the Storm 2026 dev diary/news archive](https://steamcommunity.com/app/1336490/allnews/).** Eremite Games, 2026-08-12 entry reports two million copies sold and July free-weekend concurrency/demos; company-reported.

<a id="ats-k"></a>**ATS-K — [Against the Storm review](https://www.pcgamer.com/against-the-storm-review/).** Leana Hafer, PC Gamer, 2023-12-19.

<a id="ats-l"></a>**ATS-L — [Against the Storm critic review index](https://www.metacritic.com/game/against-the-storm/critic-reviews/).** Metacritic route to Ruth Cassidy/Eurogamer full review, 2023-12-14; review summary used alongside indexed original route.

<a id="ats-m"></a>**ATS-M — [Against the Storm — Destructoid review](https://www.destructoid.com/reviews/against-the-storm-review/).** Zoey Handley, 2023-12-04; indexed in Metacritic/CritIndex when direct body availability varies.

<a id="ats-n"></a>**ATS-N — [Against the Storm review: a roguelite citybuilder awash with great ideas](https://www.rockpapershotgun.com/against-the-storm-review).** Liam Richardson, Rock Paper Shotgun, 2023-12-04; indexed full-review route used when direct retrieval is constrained.

<a id="ats-o"></a>**ATS-O — [Against the Storm on Steam](https://store.steampowered.com/app/1336490/Against_the_Storm).** Current product/review snapshot, accessed 2026-09-26.

<a id="ats-p"></a>**ATS-P — [Against the Storm user reviews](https://www.metacritic.com/game/against-the-storm/user-reviews/?platform=pc).** Current self-selected player accounts; no intent/prevalence inference.

