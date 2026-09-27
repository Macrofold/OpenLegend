# Against the Storm — full research dossier

**G45 · Research and identified audit remedies completed September 26, 2026.** The current PC boundary is the **1.11 Rebel Hideout** update, released September 24, 2026; its release notes identify executable version **1.11.1**. The dossier separates the base game from **Keepers of the Stone** (2024) and **Nightwatchers** (2025). A current expansion package is not necessarily its original launch inventory. Older mechanics references carry their own version limits; no new gameplay, footage viewing or performance test is claimed. [ATS-A](#ats-a)

[Preserved overview](../games/against-the-storm.md) · [Detailed mechanics study](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

Against the Storm's strongest OpenLegend lesson is that **renewal can come from incomplete local problems without erasing the larger world**. Each settlement is bounded and disposable at the macro scale, yet player knowledge, the Smoldering City, world-map progress and campaign consequences persist. The game continually makes scarcity, missing capabilities and timing useful rather than treating a fully solved economy as the only desirable end state. Interpretations here are research proposals, not accepted OpenLegend requirements.

## 1. Identity, current scope and player promise

Against the Storm is Eremite Games' single-player dark-fantasy roguelite city builder, published by Hooded Horse.

It reached Steam Early Access in November 2022 and 1.0 on December 8, 2023. The current PC update at this pass is **1.11**, a September 24, 2026 release adding the Rebel Hideout world-map modifier plus UX/balance work. This Steam chronology does not imply there was no earlier development or distribution. [ATS-A](#ats-a) [ATS-G](#ats-g)

The player is the Scorched Queen's Viceroy.

At the settlement level, the player:
- selects buildings from limited blueprints;
- chooses Cornerstones and manages their conditional effects;
- gathers resources;
- assigns workers by species/capability;
- chooses recipe inputs;
- manages food/fuel/production;
- develops hearth hubs;
- opens dangerous glades;
- fulfills Orders;
- responds to Events;
- trades directly and through provisioned routes;
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

Frogs emphasize stone masonry, rainwater and upgradeable species-specific housing. They refuse ordinary shelters, turning housing from a generic checkbox into a progression system. [ATS-B](#ats-b)

### Bats

Bats emphasize metallurgy and harsh sacrifice/discipline themes. The unlocked Manorial Court permits deliberate expulsion with a workforce benefit: it is a consequential population-management option, not evidence of freely simulated political deliberation. [ATS-C](#ats-c)

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

### 4.1 Cornerstones change how that vocabulary is rewarded

Cornerstones are settlement-wide effects, distinct from permission to construct a building. Annual offers arrive at Drizzle; the player can select, postpone, spend available rerolls, or decline for Amber. Citadel upgrades affect the offer/reroll system. The documented ordinary sequence offers Legendary choices in years two, four and six, with Epic choices in other years; special modifiers can alter the normal contract. Effects can accumulate and their conditions must be inspected, not inferred from rarity alone. [ATS-Q](#ats-q) [ATS-R](#ats-r)

**Back to Nature** trades the current food stock for greater fertile-soil yields. **Trade Hub** makes sales contribute Reputation while reducing the contribution from Orders. They change which plan is attractive, rather than grant an interchangeable productivity percentage. [ATS-R](#ats-r)

Stormforged Cornerstones from the Forsaken Altar are a separate bargain involving villagers or Citadel resources, with a limited number of purchases. Upgrading a corresponding existing Cornerstone replaces it rather than silently granting two copies. The optional Silent Dominion modifier also changes retention: later choices can force replacement. [ATS-Q](#ats-q)

Declining is not a timeless fixed-income exploit: the official 1.8 changes made successive decline rewards diminish, with a floor. Exact older guide payouts should not be passed off as current rules. [ATS-W](#ats-w)

**Interpretation:** the player is drafting incentives as well as tools. A powerful effect can be wrong for the present population, resource reserves or remaining time. A useful interface explains both the new opportunity and what the old plan loses.

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

The **1.10 Over-Haulers** update, released July 8, 2026, reworked Haulers after feedback about unreliable priorities and ingredient accumulation. Warehouse-employed haulers can prioritize building types, distinguish ingredient delivery from product collection, and work within their permitted area. Not every service, event or specialized building is an eligible destination. July 9's hotfix is not the original update date. [ATS-E](#ats-e)

The development history preserves a useful distinction:
- delegation was useful in principle;
- poorly legible logistics made it less useful;
- the developers revised the abstraction rather than simply adding throughput.

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
- sustained high Resolve;
- particular acquired effects.

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

Trade lets settlements compensate for missing local capability. A Trading Post hosts visiting traders: goods can be bartered, while Amber also purchases offered perks or blueprints. A trader's limited visit and delayed arrival make available wealth different from timely access. Calling a trader early or attacking one has costs; assault is a bounded event with potential deaths and future-service consequences, not ordinary risk-free shopping. [ATS-S](#ats-s)

Trade Routes are another system. An offer specifies exported goods, **Packs of Provisions**, elapsed time and Amber return. The player chooses quantity, commits the inputs and waits for collection. Offers refresh with seasons. Trade builds Standing with particular partners, improving future opportunities; buying another offer slot is not the same as increasing simultaneous-route capacity. Current-cycle settlements and unlocked factions can provide destinations. Route duration is not a simple physical-distance simulation. The reference's 1.8.13 warning is retained rather than treating every old price as 1.11 balance. [ATS-S](#ats-s)

Trade is valuable precisely because no settlement gets every chain. If every town can efficiently make everything, trade loses purpose and specialization disappears.

**Interpretation:** provisions make an export compete with local consumption, while Standing rewards a relationship beyond one transaction. Profit, liquidity and timing are different objectives. A lucrative route that returns after a crisis is not an adequate substitute for the missing goods now.

## 15. Rainpunk and Blightrot: choice-linked maintenance

The Rainpunk redesign is an especially important development case.

Earlier Blightrot imposed production burden with too little player choice.

The 2023 redesign tied powerful Rain Engines to:
- increased production/comfort;
- deliberate rainwater use;
- understandable contamination downside. [ATS-D](#ats-d)

The next update simplified contamination arithmetic to be easier to predict. This historical opt-in rationale does **not** mean avoiding engines eliminates every source of Blightrot at every difficulty: the preserved mechanics study also identifies event/configuration exceptions.

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

This is not an aesthetic-only city builder. Spatial arrangement becomes part of production.

### 16.1 Hearths are infrastructure, workplaces and development hubs

The starting Ancient Hearth and additional Small Hearths provide lit resting destinations, requiring fuel and a firekeeper. Additional hearths shorten trips but consume workers and supplies. Only the Ancient Hearth supplies the chosen firekeeper species' special bonus and fuel-sacrifice controls; Small Hearths are not duplicate sources of those privileges. An extinguished Ancient Hearth also has a different settlement-wide consequence from losing a peripheral resting destination. [ATS-T](#ats-t)

Hubs improve automatically when the required housing and decoration conditions are met: Encampment, Neighborhood and District require increasing housed population and decoration categories, with a service building at District. Higher tiers need their Citadel unlocks. Eligible buildings must fit within the relevant hub area; scattering decorative objects anywhere does not satisfy the same requirement. The benefits include Resolve and later production improvements. The consulted reference identifies a 1.9.8 boundary, so exact coefficients are not offered as a newly tested 1.11 table. [ATS-T](#ats-t)

**Interpretation:** placement, population and aesthetics can contribute to the same useful project. The design risk is converting expressive decoration into a repetitive threshold-filling exercise. A smaller well-situated hub can be more useful than expansion whose ongoing fuel demand the economy cannot support.

### OpenLegend opportunity

A generated settlement should not be a static backdrop. Distances should matter enough that warehouse placement, workshop grouping, roads, gates and housing create understandable consequences without requiring microscopic path optimization.

## 17. Failure and settlement completion

A settlement can fail through:
- Impatience;
- population/Resolve collapse;
- inability to stabilize economy.

But the roguelite structure makes failure informative rather than globally destructive.

Winning a settlement also means being able to leave it and continue the expedition. Continuing to look after a won town is different from earning further campaign advancement there.

This is intentionally unusual for city-building audiences. The reception evidence retains the tradeoff: some players love repeated triage; others find repeated starts, randomness or meta progression tedious. [ATS-F](#ats-f) [ATS-V](#ats-v)

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

Historical balance and current maintenance are different evidence. A launch review that has only reached the first Seal cannot evaluate the full Prestige ladder. [ATS-K](#ats-k)

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

The 1.10 update added support for four species in Training Expeditions. [ATS-E](#ats-e)

These are useful OpenLegend patterns:
- separate learning/sandbox contracts from canonical persistent worlds;
- do not make every debug/creator ability part of normal embodiment.

## 21. Current DLC boundaries

### Keepers of the Stone — original release September 26, 2024

The **currently advertised package**, not an asserted day-one inventory, includes Frogs, Coastal Grove, Ashen Thicket, associated buildings/orders/opportunities, Frog housing development and biome-specific mechanics. [ATS-B](#ats-b)

Coastal Grove's Strider Port sends expeditions with provisions for both rider and Water Strider, exchanging resources and time for discovery opportunities. Ashen Thicket instead makes mined Thunderblight Shards part of **Cornerstone forging**: select an effect's conditions and payoff, with an optional drawback strengthening the bargain. This is bounded assembly from supplied components, not arbitrary rule programming. Frog houses themselves have successive improvements. [ATS-B](#ats-b)

### Nightwatchers — July 31, 2025

The package adds Bats, Rocky Ravine, Bamboo Flats, buildings, deeds and events. Rocky Ravine substitutes mineral-rich terrain for ordinary woodland abundance; its **Black Market** helps obtain scarce resources through changing prices and borrowing with repayment obligations. Bamboo Flats lacks ordinary fertile soil: tending **Fluffbeaks** with food, water and warmth supplies fertilizer that creates agricultural opportunity. These living dependencies are narrower than a general creature-psychology simulation. [ATS-C](#ats-c)

Both are useful expansion examples because they introduce **different priorities**, not simply larger resource numbers. The community's population rules and the region's material constraints change together. A list of new biomes alone would miss that relationship.

## 22. Current 1.10–1.11 development

On July 8, 2026, 1.10:
- overhauled Haulers;
- added three world modifiers;
- improved fishing/resource UI;
- expanded Training options. [ATS-E](#ats-e)

Fishing's interface is consequential: pond charges, deployed nets and the choice to reel in early or await the larger completed catch make gathering a timed commitment rather than only another resource icon. [ATS-E](#ats-e)

On September 24, 2026, **1.11 Rebel Hideout**:
- added a modifier limiting settlements to two species;
- added a related Deed/home decoration;
- improved scout behavior, tooltips and tutorial clarity;
- clarified blocked season transitions;
- made small balance changes. [ATS-A](#ats-a)

The two-species modifier is revealing: less content in one run can create a different strategy space. Variation does not require always adding.

**Save compatibility is version-specific:** the 1.10 announcement closed ongoing settlements with compensation while retaining broader progress. The 1.11 preview explicitly said that closure was unnecessary for this smaller change. Neither policy is a promise that every future update preserves every active settlement, nor an OpenLegend migration recommendation. [ATS-E](#ats-e) [ATS-X](#ats-x)

## 23. Art, audio, interface and feel

Against the Storm uses:
- painterly dark-fantasy characters;
- strong species silhouettes;
- warm settlement light against hostile rain/forest;
- production panels;
- pauseable real-time simulation.

The interface must explain dense systems: recipe inputs, production, assignment, Resolve, Hostility, seasonal threats and trade. PCGamesN praises the pacing and useful direction but also explicitly criticizes clutter and underexplained modifiers. The earlier summary's uniformly approachable-UI framing overstated that review. [ATS-H](#ats-h)

Current patches continue refining overlays, tooltips, depletion indicators and tutorials. 1.11 also exposes the current music track's name in the menu. [ATS-A](#ats-a)

Cosmin Vasile describes the storm-announcing thunderclap as a learned warning and contrasts working-settlement sounds with the threatening season. That is an attributed listening experience, not a fresh audition by this researcher. [ATS-U](#ats-u)

Eremite's September 17 diary provides a direct production account: composer/audio producer Mikołaj describes rearranging seven existing tracks for a lo-fi collaboration with Virtual Cottage 2, adding rhythmic elements to a score that ordinarily used little percussion. The accompanying illustration features trader Sahilda and goods associated with her actual inventory. The collaboration is a separate app/media release, not a new playable Against the Storm biome. [ATS-X](#ats-x)

**Interpretation:** audio can communicate both state and belonging. A familiar storm cue helps a decision; a recognizable soundtrack lets the world persist beyond the session. Neither replaces the need for readable production dependencies.

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

This is not character-dialogue-heavy RPG storytelling. Its strength is **mechanical premise alignment**: the world explains why cities are temporary.

The later developer diary identifies changing one world property—relentless rain—and following its consequences as a worldbuilding method influenced by Brandon Sanderson's teaching. The diary's new survival-game prototypes are a different project; their skybox, direct character control and unfinished forest work must not be credited as shipped features of this city builder. [ATS-X](#ats-x)

## 25. Production and community process

Eremite Games is a small Polish studio.

Its development history repeatedly shows:
- frequent Early Access updates;
- public roadmap;
- player feedback;
- design diaries;
- explicit redesigns in response to friction.

The Rainpunk redesign and 2026 Hauler overhaul are concrete examples where the team explains what was wrong and which behavior it wanted to change. [ATS-D](#ats-d) [ATS-E](#ats-e)

The March 2024 million-copy announcement thanks players for feedback, suggestions and stories. This supports participation in development; it is not a measured claim that respectful treatment caused a particular sales result. That narrower attribution replaces the earlier overly broad causal wording. [ATS-I](#ats-i)

The August 2026 diary identifies Damian Ziomek's unusually broad contribution across concepts, portraits, interface, models, animation and effects. Its discussion of learning a new forest-production workflow belongs principally to the studio's subsequent survival prototype, not a retrospective specification of the original game's entire pipeline. [ATS-J](#ats-j)

## 26. Distribution and commercial context

Distribution includes:
- Steam;
- GOG;
- Epic;
- Microsoft ecosystem/Game Pass;
- later console releases.

1.0 launched December 8, 2023 with PC Game Pass availability. [ATS-G](#ats-g)

### Sales milestones

- March 27, 2024: publisher/developer announced **1 million Steam copies sold**. [ATS-I](#ats-i)
- August 12, 2026: the developer's named diary reported **2 million copies sold** after the July free weekend, and a free-weekend peak of **6,313 concurrent players**, the highest since September 2024. The concurrency figure measures a different thing from cumulative sales. [ATS-J](#ats-j)

These are attributed milestones, not audited title finances. They should not be mixed with Game Pass players, demo users or review counts. No independently established title budget, profit, retention curve or channel-conversion dataset is supplied.

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

The 2026 free weekend is a documented trial opportunity; the accompanying diary also states that demo progress carries into the full game. This is evidence of reduced entry friction, not proof of the percentage of purchasers attributable to that mechanism. [ATS-J](#ats-j)

The soundtrack collaboration is another distinct sharing route. Its existence does not imply a native multiplayer mode. [ATS-X](#ats-x)

## 28. Five substantive written assessments

The following **five independent publications' substantive bodies** were inspected during the original work and this remediation. The fifth is an explicitly labelled firsthand critical essay rather than a scored full-campaign review. Earlier aggregate excerpts remain below as additional leads, not part of the five-body count.

### 1. PC Gamer — Leana Hafer, December 19, 2023

Hafer begins skeptical of impermanent towns, then values adaptive production, differentiated species and meta upgrades that preserve motivation after failure. The fairy-tale silhouettes coexist with threatening woods. **Scope correction:** she reports reaching the Bronze Seal and explicitly leaves Rainpunk, higher difficulty and later Seals ahead of her. The piece is therefore not an evaluation of every advanced system. Its initial doubts about persistence are real; the earlier claim that she criticized predictable later events was not supported by the reopened body and is withdrawn. [ATS-K](#ats-k)

### 2. PCGamesN — Joshua Brown, December 4, 2023

Brown praises the linked progression bars, pressure, recovery and repeated adaptation, and likes the Steam Deck controls in his tested configuration. He also identifies **UI bloat, insufficient explanation of some mechanics and underdeveloped-feeling glade events**. His strong overall enthusiasm should not erase those objections. In contrast to Purdy's desktop preference below, portability is a major positive for him. The article's loose calendar language is not used as authoritative cycle arithmetic. [ATS-H](#ats-h)

### 3. Destructoid — Zoey Handley, December 4, 2023

Handley values adapting to missing production and using trade as a bridge rather than waiting for a complete economy. Randomness feels manageable to her, not inherently fair to every player. She finds repeated setup abrasive in extended sessions, prefers roughly one town at a time, and expects returning after a long break to require relearning. Her reported forty hours had not completed the whole Seal progression. The old positive verdict is retained, now with actual reservations and a corrected original URL; it is no longer counted through an aggregate index. [ATS-M](#ats-m)

### 4. Softpedia — Cosmin Vasile, December 6, 2023

Vasile praises glade decisions, seasonal pressure, the connection between lore and mechanics, and failure that teaches another approach. He objects to the learning burden, familiar roguelite progression and eventually repetitive events. His opening account is especially useful: an industrially successful town still fails because a final cache delivery cannot finish before Impatience expires. Wealth and productive capacity did not solve a timing problem. The publisher supplied the review key; this is a PC review, not a later console test. [ATS-U](#ats-u)

### 5. Ars Technica — Kevin Purdy, December 8, 2023

This is a firsthand essay after approximately nine hours, not completed-campaign criticism. Purdy enjoys management without RTS combat pressure and recoverable failure. He finds some controls and rationing options slow to discover and prefers a large screen and mouse despite handheld viability. That contrasts usefully with Brown's portable-first experience. [ATS-Y](#ats-y)

### Preserved additional indexed assessments — not counted as full reads

**Ruth Cassidy, Eurogamer, December 14, 2023:** the inherited indexed summary values procedural variation, balance and learning. **Liam Richardson, Rock Paper Shotgun, December 4, 2023:** the inherited summary values the inventive hybrid, challenge and excitement. Their full bodies were not recovered in this remediation; these are retained as attributed index-level observations, not upgraded into complete review reads. [ATS-L](#ats-l) [ATS-N](#ats-n)

**Synthesis:** this small inspected set is strongly positive, but disagreement about repetition, interface load and portable play is substantive. It does not establish that no negative professional review exists. Nor does a positive launch verdict certify the present DLC or highest difficulties.

## 29. Steam positive and negative player evidence

The earlier pass recorded approximately 19.1k English reviews with 95% positive and more than 33k all-language purchaser reviews. These remain **that pass's dated storefront snapshot**, not a newly measured population total or the basis for the qualitative sample below. [ATS-O](#ats-o)

### Actual helpful-positive bodies

The English **Most Helpful (All Time)** surface was read on September 26, 2026. **Daeranilen, January 14, 2024**, values base management without RTS combat and repeated purposeful town-building rather than stagnant late-game rearrangement. **Haze, November 27, 2023**, praises the Early Access iteration and mission-like town structure; that post does not evaluate 2026 updates. **Serathen, December 13, 2023**, values making an imperfect settlement work instead of maintaining one ideal city indefinitely. These are self-selected historical accounts, not current-version testers chosen at random. Displayed present hours and helpful votes are not publication-time measurements. [ATS-V](#ats-v)

### Negative evidence and its actual access boundary

The dedicated all-time helpful-negative routes, including the English-filter variant, failed retrieval during remediation. The previous pass's negative feed recorded objections to stacked high-difficulty burdens, repetition, randomness and slow meta progression; it was **not established as a ranked all-time negative sample**. Preserve those as inherited qualitative findings, not newly read named accounts. [ATS-F](#ats-f)

The accessible Metacritic text supplies an identifiable counterexample: **phuchaitt3, August 28, 2024**, wants continued city growth and dislikes starting over. That is a preference conflict, not proof the game's reset structure is defective for its intended audience. Another previously recorded complaint interprets onboarding length through the refund window; it does not establish deliberate refund obstruction by the developer. [ATS-P](#ats-p)

The important contrast is between players who welcome repeatedly solving scarcity and players for whom permanence is the main reward. Neither aggregate positivity nor one dissatisfied post settles that product choice.

## 30. Concrete situations

These are **constructed rules-based illustrations**, except the explicitly attributed review incident in §28. They are not newly played sessions.

### Situation A — substitute ingredients, preserve the product

**Goal:** produce Flour/Biscuits without Grain.

**State:** local Roots/Mushrooms and a supported recipe/building exist.

**Action:** configure the permitted substitute input.

**Result:** the same useful product is obtained through a different regional chain.

**Next decision / limit:** reserve ingredients for competing needs rather than allow every eligible recipe to consume them automatically. Semantic alternatives make worlds adapt without making all materials interchangeable. [ATS-D](#ats-d)

### Situation B — pause useful labor to survive the Storm

**Goal:** preserve Resolve during dangerous Hostility.

**Action:** pull some workers from woodcutting.

**Result:** less extraction, but reduced Hostility pressure.

**Next decision / limit:** resume when safe or keep a smaller crew if fuel reserves permit. A job's value depends on surrounding state and time; stopping all fuel production without reserves can create another crisis. [ATS-D](#ats-d)

### Situation C — spend scarce goods on one species

**Goal:** keep a fragile species above its Resolve threshold.

**Action:** direct limited complex food or service to that group.

**Result:** production allocation changes population stability and potential Reputation.

**Next decision / limit:** compare the marginal benefit with what the other groups now lack. Economy becomes socially meaningful when recipients differ; the Resolve abstraction does not establish individual beliefs. [ATS-D](#ats-d)

### Situation D — choose Rainpunk acceleration and accept maintenance

**Goal:** solve an urgent production shortfall.

**Action:** run a Rain Engine harder.

**Result:** production benefits come with Blightrot management.

**Next decision / limit:** prepare the necessary response or use another supply route. Upkeep is more meaningful when linked to a chosen advantage, but configuration-specific Blightrot sources still exist. [ATS-D](#ats-d)

### Situation E — open a dangerous glade because the current economy is stuck

**Goal:** find soil, resources or an event that changes the available plan.

**Action:** cut through.

**Result:** new opportunity arrives together with Hostility and possible event risk.

**Next decision / limit:** solve, defer or prepare for the revealed problem; opening more territory is not automatically an improvement. Exploration should alter strategy and expose consequences. [ATS-D](#ats-d)

### Situation F — an attractive Cornerstone arrives at the wrong moment

A farming settlement considers **Back to Nature** shortly before a harvest. Taking it increases future production but removes stored food; waiting preserves immediate safety while postponing the bonus. The next decision is whether the settlement can bridge that interval through existing growth or trade. **Limit:** future abundance does not feed villagers during the gap. [ATS-R](#ats-r)

### Situation G — decline an export that is profitable on paper

A route offers Amber for goods plus provisions, but those resources are needed locally before its completion. The player reduces the quantity or keeps the supplies. **Result:** less nominal profit, more ability to respond now. **Limit:** the interface's predicted return is not immediate liquidity. [ATS-S](#ats-s)

### Situation H — make a remote worksite livable without exhausting the center

A player places a Small Hearth near distant work, assigns a keeper and supplies fuel. Shorter rest trips improve access, but the extra consumption competes with other jobs. The next choice is whether local housing and development justify maintaining that hub. **Limit:** it does not duplicate the Ancient Hearth's special firekeeper bonus. [ATS-T](#ats-t)

## 31. Transferable inspiration for OpenLegend

### A. Use bounded projects inside persistent history

An outpost can conclude while people remember it, artifacts persist, trade routes change and political consequences remain.

### B. Variation can come from missing capabilities

Do not grant every world every tool at the start. Distinguish an unavailable transformation from an inexplicable refusal.

### C. Use bounded semantic substitution

“Any fuel” can be a type while wet wood, coal and magic crystals retain different consequences.

### D. Pair automation with policy

Delegation needs limits, reserves, priorities, stop conditions and inspectable queues. A worker capable of an operation is not necessarily authorized to consume every compatible input.

### E. Make social needs economically consequential

Preferences should alter staffing, trade, construction and allocation, not appear only as dialogue flavor.

### F. Tie maintenance to chosen benefit

Avoid bars that exist only to demand chores. A cost becomes more useful when the player can choose whether the associated benefit is worth it.

### G. Make expansion create pressure

Land, population and infrastructure can impose defense, logistics, governance and ecological obligations. Successful expansion should have understandable costs rather than arbitrary punishment.

### H. Reduce complexity through UI, not by deleting meaningful relationships

Invest in overlays, causal explanations, search and production tracing. The next useful explanation may concern a deadline or unavailable service rather than a bigger output number.

### I. Separate drafting a tool from drafting an incentive

Blueprints and Cornerstones change different parts of a plan. A reusable world package can likewise introduce a capability or alter the rewards for existing actions; it should identify which it does and expose the tradeoffs.

## 32. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2, 21–22; current package versus original release |
| R02 player actions / major mechanics | §§3–23, including Cornerstones, routes and hearth operations |
| R03 items / entities / composition | §§3–7, 12–16, 21; bounded ingredients and effect assembly |
| R04 progression / economy / time | §§2, 4.1, 8–11, 14, 16–22, 26 |
| R05 concrete interactions | §30, eight constructed cases; attributed incident in §28 |
| R06 people / AI / social / multiplayer | §§3, 6, 8, 14, 16; explicit single-player boundary |
| R07 art / audio / interface / feel | §23 and linked preserved mechanics study |
| R08 story / narrative | §24 and expansion/settlement framing |
| R09 production / development | §§6, 15, 22, 25 and dated developer evidence |
| R10 marketing / distribution / virality | §§26–27; recorded events separated from hypotheses |
| R11 commercial / participation | §26; units, concurrency and private-data limits |
| R12 reviews / player feedback | §§28–29; five substantive texts, real helpful sample and negative-access boundary |
| R13 inspiration / limits | §31 and the individual operational tradeoffs |
| R14 sources / preservation / navigation | this section, annotated sources and study route |

**Mechanics inventory:** species, blueprints, Cornerstones, gathering, recipes/substitution, logistics, trade/Standing/provisions, hearth hubs, housing/services, Resolve, Hostility, seasons, glades, Orders/Events, Rainpunk/Blightrot, cycles/Seals, difficulty, failure and meta progression are addressed. There is no native multiplayer or individually simulated romance/dialogue system credited here. Population management is not an autonomous society.

**Preservation:** the [original chapter](../games/against-the-storm.md) and [substitution/pressure study](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md) remain intact. All five earlier worked situations are retained and clarified, not replaced. The original review-index observations are retained with their true access status; newly read originals and alternatives now satisfy the separate five-text requirement. Existing production, commercial and source qualifications remain, with explicit corrections to overly broad review and causality claims.

**Audit remedy scope:** the identified missing mechanics, review-body evidence, helpful-positive sample and exact update/milestone locators have been addressed. Failed helpful-negative retrieval and older community-reference versions remain declared limitations, not fabricated successes. This does not certify every inherited fact through gameplay, the complete 130-subject roster or the seven-input packet-wide reconciliation.

**Study route:** compare §§4.1, 14 and 16.1 before choosing a settlement strategy; read Handley and Vasile for different failures of an apparently viable economy; compare Brown and Purdy for input/interface differences; then inspect the official Hauler redesign. The preserved chapter and developer announcements supply viewing routes. Footage, soundtrack playback and screenshots were not newly analyzed for this remediation.

## Sources

<a id="ats-a"></a>**ATS-A — Eremite, September 24, 2026.** [Rebel Hideout original announcement](https://steamcommunity.com/games/1336490/announcements/detail/671754559586042727); [developer-text mirror](https://steamdb.info/patchnotes/25501006/). Relevant release notes read in the mirror; original exposed a shell. Update 1.11, executable 1.11.1, modifier, UI and fixes.

<a id="ats-b"></a>**ATS-B — Eremite/Hooded Horse.** [Keepers of the Stone](https://store.steampowered.com/app/3075500/), originally September 26, 2024. Current product body read September 26, 2026; present two-biome package, Frogs, expeditions and forging, not a claim every feature was present at launch.

<a id="ats-c"></a>**ATS-C — Eremite/Hooded Horse.** [Nightwatchers](https://store.steampowered.com/app/3725110/Against_the_Storm__Nightwatchers/), July 31, 2025. Current body read; Bats, Black Market, regional scarcity and Fluffbeak care.

<a id="ats-d"></a>**ATS-D — [Preserved substitution/pressure study](../mechanics/against-the-storm-substitution-pressure-and-renewable-settlement-problems.md).** Internal owner of detailed earlier rules, examples and primary Rainpunk history; preserves version and additional-Blightrot-source qualifications.

<a id="ats-e"></a>**ATS-E — Eremite, July 8, 2026.** [Over-Haulers original](https://steamcommunity.com/games/1336490/announcements/detail/677376450273219168); [developer-text mirror](https://steamdb.info/patchnotes/24088868/). Relevant mechanics and save-policy sections read; original shell. July 9 hotfix is separately dated, not the release itself.

<a id="ats-f"></a>**ATS-F — Steam Community.** [Negative feed](https://steamcommunity.com/app/1336490/negativereviews/?l=english). Earlier September 26 capture retained; all-time helpful ranking was not established. New filtered helpful-negative attempts failed, so this is not labelled a newly sampled ranked set.

<a id="ats-g"></a>**ATS-G — GameSpot, November 20, 2023.** [1.0 and PC Game Pass announcement](https://www.gamespot.com/articles/pc-game-pass-is-getting-a-mythical-city-builder-at-launch/1100-6519340/). Historical release/Queen's Hand reporting, not present subscription availability verification.

<a id="ats-h"></a>**ATS-H — Joshua Brown, PCGamesN, December 4, 2023.** [Review](https://www.pcgamesn.com/against-the-storm/review). Full body reread; actual UI objections and portable-play preference preserved.

<a id="ats-i"></a>**ATS-I — Eremite, March 27, 2024.** [1 Million Steam Copies original](https://store.steampowered.com/news/app/1336490/view/4115799931699652974); [readable announcement reproduction](https://www.eprison.de/spiele/against-the-storm/steam-news/5749481331433433876/6461/61257.html). Primary-authored milestone and thanks; mirror's unrelated metadata not adopted.

<a id="ats-j"></a>**ATS-J — Eremite, August 12, 2026.** [Dev Diary: How would a stag look if it were a tree?](https://steamcommunity.com/games/1336490/announcements/detail/678506788181508134). Exact original located; body read in the [dated Steam news reproduction](https://store.steampowered.com/news/posts/?enddate=1786539715&feed=steam_community_announcements). Only the Against the Storm entry is evidence here. Sales, free-weekend concurrency, demo continuity and attributed art roles; survival prototype kept separate.

<a id="ats-k"></a>**ATS-K — Leana Hafer, PC Gamer, December 19, 2023.** [Review](https://www.pcgamer.com/against-the-storm-review/). Full substantive body reread; Bronze-Seal progress and untested later systems are explicit.

<a id="ats-l"></a>**ATS-L — [Metacritic critic index](https://www.metacritic.com/game/against-the-storm/critic-reviews/).** Inherited route/summary for Ruth Cassidy, Eurogamer, December 14, 2023. Not counted as a recovered full review.

<a id="ats-m"></a>**ATS-M — Zoey Handley, Destructoid, December 4, 2023.** [Correct original review](https://www.destructoid.com/reviews/review-against-the-storm/). Full body read in remediation; supersedes the previously incorrect `/reviews/against-the-storm-review/` target. Limited progression, repeated setup and trade discussion retained.

<a id="ats-n"></a>**ATS-N — Liam Richardson, Rock Paper Shotgun, December 4, 2023.** [Review route](https://www.rockpapershotgun.com/against-the-storm-review). Inherited indexed summary only; full body not recovered or counted toward five.

<a id="ats-o"></a>**ATS-O — Valve/publisher.** [Steam product](https://store.steampowered.com/app/1336490/Against_the_Storm). Earlier September 26 reception snapshot; mutable counts are not current players or sales.

<a id="ats-p"></a>**ATS-P — Metacritic.** [Player reviews](https://www.metacritic.com/game/against-the-storm/user-reviews/?platform=pc). Indexed direct player text, including phuchaitt3's August 28, 2024 persistence objection; not representative sampling or verified developer intent.

<a id="ats-q"></a>**ATS-Q — Official-hosted community wiki.** [Cornerstones, Perks and Effects](https://wiki.hoodedhorse.com/Against_the_Storm/Cornerstones,_Perks_and_Effects). Relevant annual-choice, stacking, special-modifier and Stormforged rules read; community reference, not inspected game code.

<a id="ats-r"></a>**ATS-R — Official-hosted community wiki.** [Annual Cornerstones](https://wiki.hoodedhorse.com/Against_the_Storm/List_of_annual_Cornerstones), [Citadel upgrades](https://wiki.hoodedhorse.com/Against_the_Storm/Upgrades). Retrieved named-effect and unlock descriptions; older coefficients are not silently synchronized with the current executable.

<a id="ats-s"></a>**ATS-S — Official-hosted community wiki.** [Trading](https://wiki.hoodedhorse.com/Against_the_Storm/Trading). Substantive trader, route, provisions and Standing sections read; page warns of a 1.8.13 reference boundary. No universal current price table or physical-distance formula inferred.

<a id="ats-t"></a>**ATS-T — Official-hosted community wiki.** [Hearths](https://wiki.hoodedhorse.com/Against_the_Storm/Hearths). Substantive firekeeper, fuel, range and hub-development sections read; 1.9.8 reference boundary retained.

<a id="ats-u"></a>**ATS-U — Cosmin Vasile, Softpedia, December 6, 2023.** [PC review](https://www.softpedia.com/reviews/games/pc/against-the-storm-review-537444.shtml). Full body read, including the failed final delivery, audio observations and conclusion; publisher-provided key.

<a id="ats-v"></a>**ATS-V — Steam Community.** [Most Helpful, All Time](https://steamcommunity.com/app/1336490/reviews/?browsefilter=toprated). Actual English bodies read September 26, 2026; selected authors/dates in §29. Negative-filter variants failed; current votes/hours do not establish original experience.

<a id="ats-w"></a>**ATS-W — Eremite, July 31, 2025.** [Commons Update 1.8, developer-text mirror](https://steamdb.info/patchnotes/19396692/). Retrieved declining-Cornerstone change; one dated rule revision, not an exhaustive patch audit.

<a id="ats-x"></a>**ATS-X — Eremite, September 17, 2026.** [Dev Diary: Waterfall of clouds, official group publication](https://steamcommunity.com/groups/eremitegames). Named dated body read: 1.11 preview/save distinction, composer account and worldbuilding. The group feed is mutable; identify this title/date when retrieving it. Survival-game prototype statements are not city-builder features.

<a id="ats-y"></a>**ATS-Y — Kevin Purdy, Ars Technica, December 8, 2023.** [Firsthand critical essay](https://arstechnica.com/gaming/2023/12/against-the-storm-feels-like-warcraft-without-the-war-and-its-weirdly-calming/). Full body read; approximately nine-hour perspective, not a finished-campaign review.
