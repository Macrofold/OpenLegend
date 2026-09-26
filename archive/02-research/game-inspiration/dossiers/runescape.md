# RuneScape (modern / RuneScape 3) — full research dossier

**G48 · Complete research pass, September 26, 2026.** This dossier covers the continuously evolved modern game now branded simply **RuneScape**, not Old School RuneScape and not RuneScape: Dragonwilds. “RuneScape 3” is useful historical shorthand for the 2013 modernization, but current Jagex materials call the game RuneScape. The reference point is September 26, 2026: Treasure Hunter is gone; Havenhythe Part I, Hunter 110, the player-avatar refresh, rebuilt Player-Owned Housing/Construction 120 and Leagues II have shipped; Havenhythe Part II remains previewed rather than represented as released.

[Requirements](../research-requirements.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md)

RuneScape is one of the strongest references for OpenLegend's desired “live a life in a world rather than choose a class” structure. The same persistent character can mine, cook, build, boss, farm, trade, quest, raise animals, excavate archaeology, practice magic, invent machines and return after a decade without selecting a new class. Its counterexamples are equally valuable: twenty-five years of accumulated systems create dead content, onboarding/UI debt, monetization distrust, visual inconsistency and social spaces that can feel less social than their population suggests.

## 1. Identity, lineage and current boundary

RuneScape began publicly in 2001 as a Java/browser MMORPG by Andrew and Paul Gower and Jagex.

The continuous mainline game evolved through:
- RuneScape Classic;
- RuneScape 2 (2004);
- Evolution of Combat (2012);
- RuneScape 3 branding/HTML5-interface-era launch (2013);
- downloadable modern client;
- Steam (2020);
- iOS/Android cross-play;
- current 2026 “Road to Restoration.”

Old School RuneScape is a **separate service/game** forked from a 2007 backup in 2013. G49 covers it independently.

Modern RuneScape currently runs on:
- Jagex launcher/client;
- Steam;
- iOS;
- Android;

with cross-platform progression/play across PC/mobile. [RS-A](#rs-a)

Jagex reports the broader RuneScape franchise has welcomed **300M+ player accounts**. That is a cumulative franchise/account measure, not current RuneScape MAU. [RS-A](#rs-a)

## 2. The player promise: one persistent adventurer, no fixed class

RuneScape does not begin by locking the player into:
- warrior;
- mage;
- crafter;
- healer.

One character can train all skills.

Identity instead emerges from:
- skill levels;
- quest history;
- equipment;
- titles/cosmetics;
- achievements;
- wealth/items;
- home/farm/port/Fort;
- friends/clan;
- chosen activities;
- accumulated history.

This lets a person be:
- elite boss fighter;
- master fisher;
- clue hunter;
- merchant;
- completionist;
- quest/lore player;

without rolling another avatar.

The strongest OpenLegend implication:
> let roles be things a person **learns, owns, joins and practices**, not engine-exclusive identity slots.

## 3. Twenty-nine skills create a parallel progression lattice

Modern RuneScape currently has **29 skills** across combat, gathering, artisan/support and specialized systems.

Combat-related skills include:
- Attack;
- Strength;
- Defence;
- Constitution;
- Ranged;
- Magic;
- Prayer;
- Summoning;
- Necromancy.

Other major skills include:
- Mining;
- Smithing;
- Woodcutting;
- Fishing;
- Cooking;
- Firemaking;
- Crafting;
- Fletching;
- Runecrafting;
- Construction;
- Agility;
- Herblore;
- Thieving;
- Slayer;
- Farming;
- Hunter;
- Dungeoneering;
- Divination;
- Invention;
- Archaeology.

Caps differ by skill/content era rather than one universal 99:
- many retain 99;
- several extend to 110 or 120;
- Hunter reached **110** with Havenhythe in March 2026;
- Construction reached **120** with the July housing rebuild. [RS-B](#rs-b) [RS-C](#rs-c)

### Why this structure lasts

A new activity can reward:
- direct XP;
- a resource;
- an unlock;
- equipment;
- another skill's input;
- a quest requirement.

The skills form a network rather than isolated minigames.

### Failure mode

Twenty-five years of progression also creates:
- obsolete training methods;
- confusing optimal routes;
- overlapping rewards;
- “dead” minigames;
- large gaps between new-player and veteran mental models.

The 2026 integrity roadmap explicitly targets early/midgame skilling and dailyscape because the accumulated system needs active pruning/repair. [RS-D](#rs-d)

## 4. Gathering → processing → equipment/use chains

RuneScape repeatedly uses understandable production chains.

Examples:
- mine ore → smelt bars → smith equipment;
- cut trees → logs → fletch/burn/build;
- fish → cook food → combat sustain;
- farm herbs → combine ingredients → potions;
- hunt creatures → resources/equipment;
- divination energy → invention/other uses;
- archaeology materials/artifacts → restore collections/relic powers.

The economy connects these chains because most ordinary accounts can trade.

This makes “skilling” economically meaningful beyond its XP bar.

### OpenLegend lesson

Resources should have:
- origin;
- transformation;
- users;
- sinks.

An AI-generated object becomes more believable when its material history matters to other systems.

## 5. Mining and Smithing: resource extraction becomes equipment production

Modern Mining/Smithing were substantially reworked before the current period.

The important design:
- ore extraction;
- stamina/efficiency systems;
- ore boxes/storage conveniences;
- metal tiers;
- smelting;
- smithing unfinished items toward completion.

A skill rework can therefore preserve:
> “I mine metal and smith gear”

while replacing obsolete click/competition/friction rules.

This is relevant to OpenLegend's future evolution policy:
- preserve semantic contract;
- migrate implementation/UX.

## 6. Woodcutting, Fishing, Hunter and gathering variety

Gathering activities differ in:
- node competition/sharing;
- movement;
- attention;
- random events/resources;
- equipment;
- associated processing.

### Hunter 110 / Havenhythe

Havenhythe Part I (March 23, 2026) raises Hunter to **110** and adds:
- new Big Game Hunter encounters requiring stealth/detection avoidance;
- clockwork trapping;
- materials for high-level ranged armor;
- fish farming as a new skill-adjacent activity. [RS-B](#rs-b)

The important lesson is that a level-cap increase is strongest when it adds **new action structure**, not only “same click at a larger number.”

## 7. Farming: time creates return loops

Farming uses:
- patches;
- seeds;
- growth time;
- harvesting;
- animals through Player-Owned Farm;
- other specialized farming systems.

This makes offline/elapsed time part of the economy.

The player returns because:
- something changed while absent.

OpenLegend can use real/simulated time similarly, but must be careful:
- return opportunity;
not
- compulsory notification treadmill.

The 2026 “dailyscape” cleanup is evidence that recurring timers become burdensome when they accumulate into perceived chores. [RS-D](#rs-d)

## 8. Archaeology: knowledge + collection + place

Archaeology is unusually relevant to OpenLegend.

The player:
- excavates sites;
- discovers damaged artifacts;
- gathers materials;
- restores objects;
- completes collections;
- advances mysteries;
- unlocks Relic powers.

The loop connects:
- place;
- material;
- historical object;
- lore;
- persistent mechanical reward.

### OpenLegend opportunity

OpenLegend can go farther because artifacts can have **actual simulated provenance**:
- who made it;
- who used it;
- where it broke;
- who buried it.

RuneScape shows that players already enjoy archaeology when the history is authored. A persistent agent world can make history partly causal rather than decorative.

## 9. Invention: items become material for another system

Invention is an “elite” skill built around:
- augmenting equipment;
- leveling augmented items;
- discovering blueprints;
- disassembling objects into components;
- creating devices/perks.

This is an excellent compositional economy pattern:
> old items are not only vendor trash; they become input categories for another progression system.

For OpenLegend:
- broken sword → scrap/components;
- obsolete machine → reusable mechanism;
- magical artifact → study/invention knowledge.

Cross-system reclamation can reduce inventory dead ends.

## 10. Dungeoneering: generated activity inside the larger world

Dungeoneering uses procedurally assembled dungeon floors with:
- rooms;
- combat;
- puzzles;
- resources;
- bosses;
- party roles.

It behaves almost like a game-within-game but still awards a persistent skill/currency/rewards.

This demonstrates one path for repeatable generated challenges inside a persistent MMO.

The downside is aging population:
- older group activities can become hard to form once rewards/players move elsewhere.

Current Steam criticism explicitly names deserted minigames as a persistent-world failure mode. [RS-E](#rs-e)

## 11. Quests are authored adventures, not generic task logs

RuneScape's quest tradition is distinctive.

Many quests are:
- named;
- finite;
- story-driven;
- puzzle-heavy;
- humorous;
- world-changing;
- prerequisites for later stories/content.

Quest series build continuity across years.

This differs from an MMO quest log dominated by:
- “kill 10 wolves.”

MMORPG.com's 2023 re-review praises the game's questing/lore breadth while acknowledging the world can overwhelm a newcomer. [RS-F](#rs-f)

### OpenLegend lesson

Procedural/agent-generated tasks should not replace authored narrative structure entirely.

A meaningful “quest” can encode:
- character intent;
- mystery;
- choice;
- location;
- consequences;

rather than being just an objective tuple.

## 12. The world: Gielinor accumulates rather than resets

The world contains:
- cities;
- kingdoms;
- Wilderness;
- islands;
- dungeons;
- archaeological sites;
- Anachronia;
- Morytania;
- Menaphos;
- Fort Forinthry;
- many expansion-era areas.

The map is valuable partly because players have:
- childhood memories;
- old quests;
- old routes;
- items associated with places.

Persistent geography becomes autobiographical.

### 2026 Havenhythe

Part I launched March 23 as Jagex's largest area-expansion start:
- Amberfell/Havenhythe region;
- Sanguine/vampyre storyline;
- Hunter 110;
- fish farming;
- early/mid-level bosses;
- quests including *Visions of Havenhythe* and *Hearts of Sanguine*. [RS-B](#rs-b)

As of September 22, Jagex is **previewing** Havenhythe Part II:
- eastern region;
- villages/ruins;
- *Heralds of Crimson* continuation.

This dossier does not claim Part II is already playable. [RS-G](#rs-g)

## 13. Combat: abilities, adrenaline and multiple control contracts

The 2012 Evolution of Combat changed modern RuneScape from older auto-attack-centric combat into:
- abilities;
- action bars;
- adrenaline;
- thresholds/ultimates/specials;
- defensive tools;
- richer boss mechanics.

Modern players can use:
- manual ability input;
- **Revolution**, which automatically fires configured abilities;
- Legacy Combat Mode, which approximates older auto-attack/special-attack combat and disables the modern ability/adrenaline system. [RS-H](#rs-h)

### Revolution is especially relevant

It creates a spectrum:
- delegate low-level rotations;
- intervene for important abilities;
- go fully manual for optimization.

That is nearly the same design problem as OpenLegend's autonomous agents.

A strong delegation system should allow:
- “handle routine combat/work”
while preserving:
- emergency intervention;
- explicit priorities;
- important cooldown decisions.

## 14. Melee, Ranged, Magic and Necromancy

Modern combat supports distinct styles.

### Melee

Uses Attack/Strength and close-range weapon families.

### Ranged

Uses distance/projectiles/armor/equipment with style-specific abilities.

### Magic

Uses spells, runes, abilities and utility.

### Necromancy

Added in 2023 as a new standalone combat skill, with:
- rituals;
- conjures;
- gear progression;
- dedicated quests/areas;
- modernized combat onboarding.

Necromancy is useful because a live game can add a new high-level system that also tries to teach its own grammar rather than assuming decades of player knowledge.

## 15. Bossing, Slayer and group combat

RuneScape endgame/combat includes:
- Slayer assignments;
- solo bosses;
- group bosses;
- raids;
- enrage/scaling/high-difficulty encounters;
- gear switches/defensives/consumables.

The combat experience varies drastically:
- casual Revolution skilling/combat;
- high-input endgame bossing.

This breadth is a strength but creates UI/input pressure.

Mobile App Store reviewers specifically describe:
- action-bar/button scarcity;
- precision issues;
- harder bossing disadvantage compared with PC. [RS-I](#rs-i)

Cross-platform persistence does not imply equal interface suitability for every activity.

## 16. Death and recovery

Modern RuneScape death is generally recoverable rather than classic full-loss catastrophe.

Death systems have evolved repeatedly:
- item protection;
- Death's Office/fees;
- gravestone/retrieval rules;
- special exceptions.

The exact current fee/exception tables are version-sensitive.

The durable design point:
> the MMO reduced catastrophic item-loss friction while keeping death economically/temporally meaningful.

OpenLegend should similarly separate:
- dramatic consequence;
from
- irreversible destruction of hundreds of hours.

Worlds can choose harsher contracts when intentionally authored.

## 17. Items, bank and persistent ownership

RuneScape's item vocabulary is enormous:
- resources;
- equipment;
- food;
- potions;
- runes;
- quest items;
- clue items;
- cosmetics;
- pets;
- skilling tools;
- artifacts;
- invention components.

The Bank is a central persistent storage system.

This long history demonstrates both:
- joy of persistent possessions;
- severe inventory/bank/search complexity.

OpenLegend's generated-object ambitions therefore require:
- semantic search;
- categories;
- provenance;
- cleanup/recycling;
- favorites;
- storage rules.

Otherwise generated abundance becomes clutter.

## 18. Grand Exchange and player economy

The **Grand Exchange** supports asynchronous item trading.

Most normal-account resources therefore have:
- self-use value;
- opportunity-cost market value.

A player may:
- gather;
- craft;
- boss;
- flip/trade;
- buy ingredients;
- sell output.

Ironman accounts largely cannot use normal Grand Exchange trade; current wiki documentation notes narrow exceptions such as Bonds/certain cosmetic tokens. [RS-J](#rs-j)

This is an important experimental contrast:
- open market economy;
versus
- self-sufficient progression.

## 19. Ironman and self-imposed economic law

Ironman modes restrict:
- trading;
- assistance;
- other convenience.

The same world therefore supports a different value system:
- a fish is something you caught;
- an herb is something you grew/earned;
- equipment documents personal capability.

OpenLegend can make world rules or character vows similarly explicit:
- oath;
- profession code;
- faction law;
- self-sufficiency challenge.

The restriction changes meaning without needing new item art.

## 20. Construction and Player-Owned Housing: 2026 rebuilt current state

The July 13/14, 2026 housing update is a major current-version boundary.

It:
- raises Construction to **120**;
- rebuilds Player-Owned Houses;
- supports freer room/furniture layout;
- adds hundreds of customization options;
- lets achievements/adventures inspire furniture unlocks;
- adds utility;
- creates shared **Homestead** communities with friends. [RS-C](#rs-c)

This is highly relevant to OpenLegend:
> achievements can become **physical place**.

A house can display:
- identity;
- history;
- utility;
- social group.

OpenLegend should make important accomplishments leave visible world artifacts rather than only profile badges.

## 21. Other management/home systems

Across its history RuneScape also includes systems such as:
- Player-Owned Farm;
- Player-Owned Port;
- Fort Forinthry;
- Kingdom management;
- invention machines;
- clan citadels.

These vary in current relevance.

The broad design lesson:
> persistent identity benefits from places/institutions the player can return to.

The failure mode is system archipelago:
- each subsystem with separate currency/UI/timer;
- few meaningful interactions.

OpenLegend should prefer shared:
- people;
- items;
- time;
- resources;
- geography

over disconnected management minigames.

## 22. Social systems: clans, friends, trade and shared activity

RuneScape supports:
- friends/ignore;
- chat;
- clans;
- clan citadels;
- grouping;
- trading;
- bosses;
- public skilling;
- social hubs.

The Grand Exchange and portable/community-skilling traditions have historically concentrated players.

But current Steam criticism observes:
- many old activities are empty;
- visible players may be AFK/not chatting;
- public chat/scam/troll concerns reduce social interaction. [RS-E](#rs-e)

This is a crucial OpenLegend lesson:
> population density is not social density.

To feel social, a world needs reasons to:
- communicate;
- depend;
- remember;
- cooperate;
- conflict.

## 23. PvP and the Wilderness

RuneScape historically made the Wilderness a major PvP/risk space.

Modern RuneScape has repeatedly reworked it, and PvP has less central participation than in Old School.

Do not transfer OSRS's current PvP ecosystem to modern RuneScape.

The historical lesson:
- a dangerous region can be defined by different social law;
- but population and incentive structure determine whether it remains alive.

OpenLegend can use:
- lawless frontier;
- faction war zone;
- duel jurisdiction;

as **world rules**, not just a combat toggle.

## 24. Activities, minigames and “dead content”

RuneScape accumulated:
- minigames;
- Distractions & Diversions;
- daily/weekly/monthly activities;
- old bosses;
- old training methods.

Some remain valued.

Others lack enough players/reward relevance.

This is one of the clearest warnings for OpenLegend:
> every new mechanic creates a maintenance and attention cost.

A world can have infinite possible content while still needing:
- retirement;
- consolidation;
- reward migration;
- discovery filtering.

The 2026 restoration program's willingness to remove obsolete MTX items is a useful live-ops example of reopening reward space. [RS-K](#rs-k)

## 25. Leagues: temporary altered law

Modern RuneScape began adopting a Leagues-style limited-time mode.

Leagues II: **Equilibrium** launched August 10, 2026, using:
- accelerated progression;
- region/constraint structure;
- altered powers;
- task-based advancement;
- temporary rules.

This is separate from permanent Gielinor progression.

The pattern is valuable:
> explore extreme alternate laws in a bounded mode instead of destabilizing the canonical persistent world.

OpenLegend can support:
- experimental shards;
- dream worlds;
- tournament realities;
- creator scenarios

without silently mutating existing worlds.

## 26. Visuals, audio and interface

RuneScape's 25-year continuity creates strong visual inconsistency.

New areas/assets can sit beside:
- older geometry;
- older animations;
- different art eras.

The July 8, 2026 player-avatar refresh was explicitly part of the restoration roadmap. [RS-L](#rs-l)

Current Steam feedback proves visual change can itself be contentious:
- some players praise modernization;
- some September 2026 reviews dislike the new character mesh/style. [RS-E](#rs-e)

### Interface

PC supports a deeply customizable multi-panel/action-bar interface.

That power creates:
- personalized workflows;
- overwhelming new-player complexity.

Mobile must compress the same game and current/historical reviews cite:
- small buttons;
- limited action-bar capacity;
- precision/performance issues. [RS-I](#rs-i)

OpenLegend needs progressive disclosure:
- novice surface;
- expert customization;
- same underlying world semantics.

## 27. Story and tone

RuneScape's narrative identity mixes:
- absurd British humor;
- mundane village problems;
- political/faction stories;
- gods;
- cosmic threats;
- archaeology/history;
- self-aware quests.

The game often gives the player a role that is:
- adventurer;
- opportunist;
- helper;
- accidental troublemaker;

rather than a single fixed “chosen one.”

Havenhythe's 2026 direction explicitly shifts toward:
- local inhabitants;
- vampyre threat;
- early/mid-level bosses;
- grounded questing

rather than only world-ending god stakes. [RS-B](#rs-b)

OpenLegend can learn from the tonal breadth:
> a persistent world needs room for “help a child become a wizard” alongside existential threats.

## 28. 2026 integrity reset: monetization became game design debt

For years modern RuneScape included:
- subscription;
- Bonds;
- cosmetics/Marketplace;
- **Treasure Hunter** keys with XP/progression rewards.

Player criticism of gameplay-impacting MTX became deeply entangled with the game's identity.

In October/November 2025 Jagex held a vote.

**124,985 votes** supported the removal threshold/outcome.

On January 19, 2026:
- Treasure Hunter was removed;
- more than 225 direct-XP/skilling items stopped being sold;
- the Road to Restoration began. [RS-M](#rs-m)

### September 24, 2026 current status

Jagex is still removing/revising legacy stockpiled items.

The current plan says:
- final cleanup date: November 23, 2026;
- Proteans/training dummies/portable stations and many gameplay-skipping items are slated for removal;
- some useful effects may be redesigned into normal gameplay;
- reward space is explicitly a design concern. [RS-K](#rs-k)

This is one of the best live-service lessons in the corpus:
> monetization can consume **mechanical design space**.

If a paid convenience solves:
- bad training;
- tedious banking;
- slow progression;

the product can become financially dependent on keeping the underlying friction.

OpenLegend should avoid that trap.

## 29. Membership, free-to-play, Bonds and current economy

RuneScape offers:
- free-to-play;
- membership for much broader content;
- Bonds purchasable with real money and tradeable in-game for membership/other supported benefits;
- cosmetic/Marketplace commerce.

One membership/account ecosystem historically covers access across RuneScape/OSRS under Jagex account rules, though pricing/packages change and should not be frozen from old reviews.

Because Bonds are tradeable:
- real-money demand can enter the gold economy through a controlled item.

This creates:
- legitimate membership-by-playing path;
- exchange-rate/economy effects.

Do not confuse Bonds with the removed Treasure Hunter system:
- the latter sold randomized/gameplay-skipping progression;
- Bonds are a distinct tradable token system.

## 30. Production and technological evolution

RuneScape is a rare 25-year continuously operated world.

It evolved:
- browser Java;
- new engines/clients;
- HTML5-era experiments;
- NXT/downloadable client;
- Steam/mobile;
- current Vulkan/API/plugin work.

The 2026 roadmap includes:
- modern infrastructure;
- API/plugin support;
- Quest Helper/tile/menu-style community plugins in preview;
- visual/UX modernization. [RS-N](#rs-n)

This is relevant to OpenLegend:
> preserve world continuity while replacing technical substrate.

Players care more about:
- items;
- history;
- mechanics;
- identity

than whether the renderer/network/client internals remain unchanged.

## 31. Community co-development

RuneScape has used:
- forums/Reddit/Discord;
- betas;
- surveys;
- RuneFest;
- creator programs;
- community votes;
- limited-time modes.

The 2025 Treasure Hunter vote demonstrates meaningful governance over a commercial system.

But modern RuneScape is **not** governed by OSRS's routine content-poll model.

Do not transfer OSRS voting rules into G48.

A useful OpenLegend principle:
- identify which decisions are legitimately community-owned;
- do not pretend every design choice is a referendum.

## 32. Commercial and participation context

Public measures include:
- 200M+ accounts by the RuneScape 3 era;
- Jagex now describes the franchise as having welcomed **300M+ player accounts**;
- Steam launched in October 2020;
- mobile launched broadly in 2021;
- Jagex describes the 2026 RuneScape community as its largest/most active franchise community, but does not publish a directly comparable modern-RuneScape MAU in the cited release. [RS-O](#rs-o)

Do not treat:
- registered accounts;
- installations;
- active players;
- subscribers;
- concurrent players

as interchangeable.

The current Steam page/review corpus is only one client slice; many long-time players use the Jagex launcher/mobile.

## 33. Five substantive written reviews / re-reviews

Because RuneScape is continuous, reviews from different years describe **different games**.

### 1. MMORPG.com — Kanishka Thakur, March 7, 2023

**Fresh-account re-review.**

**Praised:** no fixed classes; enormous activity variety; modern combat freedom; quests/story; ability to return after long breaks.

**Criticized:** overwhelming quantity/complexity and dated presentation compared with newer MMOs.

This is the strongest relatively modern independent review before the 2026 reset. [RS-F](#rs-f)

### 2. The Observer/Guardian — Matt Kamen, August 4, 2013

**RuneScape 3 launch-era review.**

**Praised:** accessibility, community, depth that reveals itself with investment, orchestral/presentation upgrade.

**Criticized:** slow click movement, restrained/boring combat for a newcomer, stilted first impression.

This describes 2013, not current Necromancy/Revolution/bossing. [RS-P](#rs-p)

### 3. PC Gamer — Tyler Wilde, October 30, 2020

A substantial return/feature rather than a scored review.

**Praised/observed:** extraordinary weirdness/history and breadth; RuneScape feels like a separate evolutionary lineage of PC game rather than a generic MMO.

**Critique/limit:** its accumulated interfaces/rules are esoteric to an outsider.

Included because genuine modern-RuneScape scored-review coverage is sparse; it is labeled accordingly. [RS-Q](#rs-q)

### 4. Esquire — Cameron Sherrill, June 16, 2021

A first-person return/review essay around mobile launch.

**Praised:** skill-cape/long progression has unusual emotional force; old habits/identity persist across years.

**Critique/boundary:** nostalgia is inseparable from the author's experience; not a clean new-user quality measurement. [RS-R](#rs-r)

### 5. App Store — substantive player/mobile review corpus, 2021

Not professional criticism, but multiple long-form direct users independently report:
- huge activity breadth;
- satisfying progression;
- PC-quality game on mobile;

alongside:
- small controls;
- action-bar shortage;
- performance/precision problems;
- EoC/interface complexity. [RS-I](#rs-i)

**Evidence limit:** there are fewer independent modern professional reviews than for a new boxed game. This fifth slot is transparently direct player criticism rather than pretending another historical MMO.com article is independent.

### Historical review archive

MMORPG.com also preserves substantive 2011 and 2010 re-reviews, but those precede:
- EoC;
- RuneScape 3;
- Invention;
- Archaeology;
- Necromancy;
- current world.

They are useful product-history evidence, not current mechanics evaluation. [RS-S](#rs-s)

## 34. Steam positive and negative player evidence

### Helpful positives

Highly helpful Steam reviews praise:
- sheer amount of content;
- distinct authored quests/lore;
- no class locks;
- long-term attachment;
- returning after years;
- friendship/history.

One player's story about keeping a Rune pickaxe/hatchet gifted by a stranger for nearly twenty years is especially relevant:
> persistent objects can become social memory because **who gave it to you** matters. [RS-T](#rs-t)

### Helpful negatives / 2025–2026 shift

A major 2025 negative review wave focused on:
- membership price;
- survey/monetization fears;
- Treasure Hunter/gameplay MTX;
- visual cosmetic incoherence.

The 2026 Treasure Hunter removal materially changes that historical complaint and must be noted. [RS-T](#rs-t) [RS-M](#rs-m)

Current September 2026 negatives instead include:
- grind/repetition;
- dead group minigames;
- new-player disorganization;
- account/subscription friction;
- mobile/Steam Deck performance;
- dislike of the new avatar art;
- quest instancing limiting co-op. [RS-E](#rs-e)

Current positives still include:
- returning after 10+ years;
- ongoing progression;
- “continue my story” persistence. [RS-U](#rs-u)

## 35. Concrete situations

### Situation A — one person changes professions without changing identity

**Morning:** mine ore.

**Later:** smith equipment.

**Evening:** equip Magic/Necromancy setup and boss.

**Next day:** complete a quest or farm herbs.

**Result:** one persistent person accumulates multiple competencies.

**Lesson:** role should often be contextual capability, not class identity.

### Situation B — a gifted object accumulates social history

**State:** another player gives a valuable tool to a struggling newcomer.

**Years later:** the object may be mechanically obsolete but emotionally irreplaceable.

**Lesson:** store provenance/creator/giver/history on meaningful OpenLegend objects.

### Situation C — use Revolution for routine, intervene for danger

**State:** action bar configured.

**Routine:** Revolution triggers normal abilities.

**Boss mechanic:** player manually uses defensive/utility action.

**Lesson:** delegation should expose an intervention gradient, not only manual versus full autonomy.

### Situation D — choose market economy versus self-sufficiency

**Normal account:** buy missing resource on Grand Exchange.

**Ironman:** must acquire/craft it through permitted personal play.

**Result:** identical item gains a different story/value.

**Lesson:** authored social/economic constraints change meaning without changing ontology.

### Situation E — achievement becomes furniture/place

**State:** player earns quest/achievement-linked housing unlock.

**Action:** build/display it in rebuilt 2026 house/Homestead.

**Result:** profile history becomes visitable physical expression.

**Lesson:** surface biography in world state.

### Situation F — remove paid shortcut and reopen design space

**State:** portable/protean MTX previously bundles training benefits.

**2026 action:** Jagex removes or redesigns it.

**Result:** future ordinary rewards/training improvements can occupy that space.

**Lesson:** monetization architecture constrains game architecture.

## 36. Transferable inspiration for OpenLegend

### A. One body, many learned roles

Do not force:
- blacksmith;
- hunter;
- mage;
- farmer

into mutually exclusive class slots unless a world specifically wants that law.

### B. Make skills networks

Mining should feed:
- building;
- trade;
- equipment;
- invention.

Social skills should similarly connect:
- trust;
- teaching;
- persuasion;
- organization.

### C. Preserve objects long enough to acquire history

A persistent-world item can become valuable because:
- maker;
- owner chain;
- battle;
- gift;
- repair.

### D. Give achievements physical expression

Homes, clothes, titles, monuments and tools can remember.

### E. Offer a delegation spectrum

Revolution is a useful analogy:
- automate routine;
- allow manual high-level intervention.

### F. Design for return after absence

A persistent world should help answer:
- what changed?
- what was I doing?
- who do I know?
- which possessions matter?

without invalidating old identity.

### G. Avoid “system archipelago”

New features should reuse:
- people;
- economy;
- items;
- geography;
- time.

### H. Prune aggressively enough to protect the future

Twenty-five years proves that no live system can only add.

### I. Never fund the game by preserving bad friction

If monetization sells a workaround, improving the underlying problem becomes commercially painful.

## 37. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / exact modern-RS boundary | §§1–3 |
| R02 player actions / mechanics | §§3–25 |
| R03 items / entities / composition | §§4–9, 14–21 |
| R04 progression / economy / time | §§3–10, 17–25, 29 |
| R05 concrete situations | §35 |
| R06 people / AI / social / multiplayer | §§20–23, 31 |
| R07 art / audio / interface / feel | §26 |
| R08 story / narrative | §§11–12, 27 |
| R09 production / development | §§28, 30–31 |
| R10 marketing / distribution / community | §§30–32 |
| R11 commercial / participation | §§29, 32 |
| R12 reviews / player feedback | §§33–34 |
| R13 inspiration / limits | §36 |
| R14 sources / preservation / navigation | this section + sources |

**Mechanics-inventory check:** 29-skill classless progression; gathering/processing; combat styles/EoC/Revolution/Legacy; Necromancy; bossing/Slayer; items/bank; trade/Grand Exchange; Ironman; quests; housing/Farm/Port/Fort examples; social/clans; PvP boundary; D&D/minigames; Leagues; death; mobile/PC; current MTX state are covered. Exact tables for thousands of items/quests are intentionally not reproduced.

**Preservation check:** G48 was added after the original packet and has no prior full chapter to overwrite. Shared franchise history is repeated only where necessary to establish the modern-game boundary; G49 independently researches OSRS rather than treating it as a mode.

## Sources

<a id="rs-a"></a>**RS-A — [Player-Owned Housing update / current RuneScape availability](https://www.jagex.com/news/runescape-launches-highly-anticipated-player-owned-housing-update).** Jagex, 2026-07-14. PC/Steam/iOS/Android cross-platform statement and current housing scope.

<a id="rs-b"></a>**RS-B — [RuneScape's biggest area expansion begins: Havenhythe Part I](https://www.jagex.com/news/runescape-s-biggest-area-expansion-in-its-25-year-history-begins-today).** Jagex, 2026-03-23. Hunter 110, Big Game Hunter, fish farming, quests and mid-level bosses.

<a id="rs-c"></a>**RS-C — [Player-Owned Housing update](https://www.jagex.com/news/runescape-launches-highly-anticipated-player-owned-housing-update).** Jagex, 2026-07-14. Construction 120/Homestead/free-layout current boundary.

<a id="rs-d"></a>**RS-D — [The Roadmap That Changes RuneScape Forever](https://runescape.wiki/w/Update%3AThe_Roadmap_That_Changes_RuneScape_Forever).** Official RuneScape news mirrored by RuneScape Wiki, 2026-01-19. Road to Restoration scope; mirror used because some secure site routes vary.

<a id="rs-e"></a>**RS-E — [RuneScape current Steam reviews](https://steamcommunity.com/app/1343400/reviews/).** Steam Community, accessed 2026-09-26. Current self-selected player criticism/praise.

<a id="rs-f"></a>**RS-F — [RuneScape — The Re-Review 2023 Edition](https://www.mmorpg.com/reviews/runescape-the-re-review-2023-edition-2000127460).** Kanishka Thakur, MMORPG.com, 2023-03-07. Fresh-account modern re-review.

<a id="rs-g"></a>**RS-G — [Beyond The Bridge — Exploring Havenhythe Part II](https://secure.runescape.com/m=news/beyond-the-bridge---exploring-havenhythe-part-ii).** RuneScape/Jagex, 2026-09-22. Preview only; Part II not represented as shipped.

<a id="rs-h"></a>**RS-H — [Legacy Mode](https://runescape.wiki/w/Legacy_Mode).** RuneScape Wiki, current rules reference. Used to distinguish Legacy Combat from modern EoC/Revolution, not as proprietary implementation evidence.

<a id="rs-i"></a>**RS-I — [RuneScape App Store ratings & reviews](https://apps.apple.com/us/app/runescape/id1332022656?see-all=reviews).** Direct mobile player testimony, primarily 2021 launch-era; version limits explicit.

<a id="rs-j"></a>**RS-J — [Grand Exchange](https://runescape.wiki/w/Grand_Exchange).** RuneScape Wiki current rules reference, including Ironman restrictions.

<a id="rs-k"></a>**RS-K — [What's happening with MTX Items in RuneScape](https://secure.runescape.com/m=news/whats-happening-with-mtx-items-in-runescape).** Jagex, 2026-09-24. Current legacy-item removal/revision schedule and design rationale.

<a id="rs-l"></a>**RS-L — [Jagex news archive](https://www.jagex.com/news).** Jagex, current archive; records July 8, 2026 player-avatar update alongside other 2026 milestones.

<a id="rs-m"></a>**RS-M — [The Players Have Spoken — Treasure Hunter removal](https://www.jagex.com/news/the-players-have-spoken-runescape-treasure-hunter-microtransactions-to-be-removed-january-19th).** Jagex, 2025-11-12. 124,985 vote/result and January 19, 2026 removal commitment.

<a id="rs-n"></a>**RS-N — [API & Plugins September Preview](https://secure.runescape.com/m=news/api--plugins-september-preview).** RuneScape/Jagex, 2026-09-11. Quest Helper/tile/menu/drop/ritual plugin preview; preview status retained.

<a id="rs-o"></a>**RS-O — [RS25 25th anniversary programme](https://www.jagex.com/news/jagex-marks-runescape%E2%80%99s-25th-year-with-rs25-delivering-record-investment-a-dedicated-game-integrity-roadmap-new-game-modes-player-first-design-and-franchise-expansion).** Jagex, 2026-01-15. 25-year/current franchise/community context.

<a id="rs-p"></a>**RS-P — [RuneScape 3 — review](https://www.theguardian.com/technology/2013/aug/04/runescape-3-jagex-review).** Matt Kamen, The Observer/Guardian, 2013-08-04. Historical RS3-launch review only.

<a id="rs-q"></a>**RS-Q — [RuneScape is a lot weirder than I remembered](https://www.pcgamer.com/runescape-is-a-lot-weirder-than-i-remembered/).** Tyler Wilde, PC Gamer, 2020-10-30. Substantive Steam-era return feature, not a scored formal review.

<a id="rs-r"></a>**RS-R — [On the all-consuming emotion of earning a Skill Cape in RuneScape](https://www.esquire.com/lifestyle/a36731002/runescape-review-mobile-game-release/).** Cameron Sherrill, Esquire, 2021-06-16. First-person return/review essay with nostalgia limitation.

<a id="rs-s"></a>**RS-S — [RuneScape reviews archive](https://www.mmorpg.com/runescape/reviews).** MMORPG.com. Historical 2010/2011 and 2023 reviews; older pieces used only as history.

<a id="rs-t"></a>**RS-T — [RuneScape most helpful Steam reviews](https://steamcommunity.com/app/1343400/reviews/?browsefilter=toprated).** Steam Community, accessed 2026-09-26. Historical long-form player testimony and 2025 MTX protest; 2026 removal changes the latter's current factual context.

<a id="rs-u"></a>**RS-U — [RuneScape Steam community current surface](https://steamcommunity.com/app/1343400).** Accessed 2026-09-26. Current September positive/negative player testimony and update feed.

<a id="rs-v"></a>**RS-V — [An Ambitious New Era Dawns for RuneScape](https://www.jagex.com/news/an-ambitious-new-era-dawns-for-runescape-as-it-marks-its-25th-anniversary).** Jagex, 2026-01-19. Current roadmap, Treasure Hunter removal, avatar/housing/Havenhythe/Leagues framing.
