# PEAK — full research dossier

**G47 · Complete research pass, September 26, 2026.** This dossier covers the shipped PC game through its **final major update**, which added the Gloom and Citadel variant biomes in August 2026. Landfall's current FAQ explicitly says major-content development is finished: PEAK remains playable and supported with fixes, but is intentionally **not** a forever/live-service game. Console/cross-platform work mentioned in current support material is kept as planned/in-progress unless separately released.

[Preserved overview](../games/peak.md) · [Detailed mechanics study](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

PEAK's relevance to OpenLegend is that a **very small shared predicament** can generate memorable social stories when position, knowledge, scarce items and physical help are real. The rescue story does not need to be separately generated: somebody slips, voice grows faint with distance, another player locates them, a rope/piton/backpack changes what the group can do, and the outcome becomes worth retelling.

## 1. Identity, scope and current boundary

PEAK is a first-person cooperative climbing game created by developers from Aggro Crab and Landfall under the “Landcrab” collaboration.

It released on Steam June 16, 2025.

The premise:
- a nature-scout group crash-lands on a mysterious island;
- the only apparent rescue path is up;
- climb through dangerous biomes;
- scavenge supplies;
- manage stamina/injuries/status;
- help one another;
- reach the summit.

It supports:
- solo;
- friend-based online groups up to four.

It does **not** natively provide a public-lobby/server browser as of the current evidence; official/community routes instead rely on friends/room access/Discord-style group finding. [PK-A](#pk-a)

### Current/final major-content boundary

Landfall's current FAQ says:
- **Gloom** and **Citadel** were the final major-update biomes;
- PEAK is not intended as a live service;
- the small joint team wants to return to separate studio projects;
- maintenance/bug fixes continue. [PK-B](#pk-b)

The final-biome announcement set the update for August 11, 2026. [PK-C](#pk-c)

## 2. The goal is intentionally simple

The objective is:
> climb the mountain.

The depth comes from:
- route;
- physical position;
- stamina;
- injuries/status;
- food;
- carried tools;
- weather/hazards;
- other players.

This is useful design compression.

A game does not need:
- dozens of quest types;
- procedural plot;
- faction politics

to produce emergent episodes if the core activity creates readable interdependence.

## 3. Climbing and stamina

Climbing consumes stamina.

The stamina display also communicates reductions/pressure from conditions and carried Weight.

The player must decide:
- where to start climbing;
- which surface/ledge is reachable;
- whether current stamina can finish;
- where to rest;
- whether to use an item;
- whether to ask for help.

This creates an important distinction:
- **height gained**;
- **safe state reached**.

Getting higher can make the situation worse if the player reaches nowhere recoverable.

## 4. Status effects converge on practical climbing capability

Setbacks can include:
- injury;
- poison/other biome conditions;
- hunger-related pressure;
- carrying burden;
- environmental debuffs.

Several consequences eventually express themselves through:
- less available climbing capacity;
- harder movement/survival.

This makes the game readable.

But the UI still needs to show **why** capability fell.

OpenLegend can use shared downstream consequences:
- exhausted;
- encumbered;
- injured

while preserving causal provenance.

## 5. Carrying and inventory are route decisions

Items help:
- healing;
- stamina;
- food;
- climbing;
- rescue;
- route construction.

But carrying has cost.

The player can therefore face:
> keep the rope for a future wall, or drop it so this wall is possible?

That is a materially different inventory experience from:
- unlimited bag of abstract quest objects.

Items exist because they change what routes the body can survive.

## 6. Backpack: shared access without global storage

A Backpack adds storage.

The preserved mechanics study documents:
- it can be placed to manage directly;
- another player can access it while worn;
- contents still contribute to carrying burden. [PK-D](#pk-d)

This separates:
- ownership/access;
- physical location;
- burden.

### OpenLegend lesson

A settlement/group inventory does not have to become one magical global stash.

Objects can remain:
- on a person;
- in a cart;
- in a house;
- accessible under permissions.

That creates real logistics/social responsibility.

## 7. Pitons create intermediate safe states

A placed Piton creates a climbing handhold where a Scout can recover stamina.

One placed object transforms:
- impossible uninterrupted wall

into:
- climb;
- rest;
- climb.

This is more interesting than:
> “+20% climb efficiency.”

The tool changes **problem topology**. [PK-D](#pk-d)

It can also help later climbers, turning one person's action into route infrastructure.

## 8. Ropes and Anti-Rope

Rope Spools create climbable anchored routes.

Anti-Rope reverses a key property:
- it rises instead of falling;
- its floating behavior changes carrying/placement risk.

This is an especially good compositional example:
> change one familiar physical rule and new uses emerge. [PK-D](#pk-d)

OpenLegend materials/magic should often work this way:
- keep recognizable ontology;
- alter one consequential property.

That produces surprising but understandable affordances.

## 9. Food, supplies and uncertain consumption

Players scavenge food and supplies.

Food can be:
- safe/helpful;
- risky/questionable;
- context-dependent.

Carrying food means:
- future recovery;
- current Weight cost.

Eating now means:
- immediate capacity;
- less future buffer.

Group play adds allocation:
- who needs it most?
- who is carrying the group's reserve?
- should a weak climber consume the rare resource?

A shared predicament makes small consumables socially meaningful.

## 10. Temporary power needs an exit plan

The Big Lollipop example preserved in the detailed study gives temporary unlimited stamina followed by a Drowsy downside in its ordinary form/version.

The correct use is not merely:
> go as high as possible.

It is:
> spend the temporary window reaching a **safe post-effect state**. [PK-D](#pk-d)

This is a valuable OpenLegend power-design principle.

Strong temporary abilities stay interesting when:
- their aftermath matters;
- the player understands it beforehand.

## 11. Rescue and direct physical help

Players can:
- help someone up;
- deploy route tools;
- carry resources for others;
- locate separated players;
- coordinate by proximity voice/pings;
- recover around group decisions.

The physicality makes social action clear.

“I helped you” means:
- my position;
- my item;
- my action

changed your possible outcome.

OpenLegend AI companions should be judged against this standard:
- did they perceive?
- communicate?
- take useful action?
- accept risk?
- become a burden worth helping?

Fluent rescue narration is not equivalent.

## 12. Proximity voice and partial information

Voice volume/proximity means separation affects information.

PC Gamer recounts a group splitting in a snowstorm and locating a stranded companion through proximity communication before helping them. [PK-E](#pk-e)

The episode works because:
1. positions diverge;
2. knowledge diverges;
3. communication channel has range;
4. group re-coordinates;
5. action changes outcome.

This is exactly the kind of causal chain OpenLegend should preserve for NPC/player stories.

## 13. Ghost/death/recovery social role

Death/failure can leave a player in a spectator/ghost-like state depending on current run state, enabling continued group guidance even when direct embodied contribution has ended.

Helpful Steam testimony includes a parent/child run where the dead/ghost player guides the surviving climber. [PK-F](#pk-f)

That is an elegant way for failure to change participation rather than simply remove the person from the social activity.

OpenLegend death/absence systems can similarly ask:
> what meaningful role remains?

## 14. Daily maps: renew route knowledge without changing basic laws

The mountain/island layout rotates on a 24-hour cadence.

Players can retry the same day's layout.

This creates two knowledge layers:
- general mechanical mastery;
- current-route familiarity.

A new day refreshes:
- path;
- item distribution;
- hazards;

without invalidating:
- how ropes work;
- how stamina works;
- how rescue works.

This is high-quality procedural variation:
> change the problem instance, not the learned grammar.

## 15. Biomes and final variant expansion

The climb passes through biome-specific hazards.

Over post-launch development PEAK added/rotated additional biome content.

The final major update adds:
- **Gloom**;
- **Citadel**;

as variants cycling with previous biome alternatives. [PK-B](#pk-b) [PK-C](#pk-c)

This expansion pattern is efficient:
- same climbing grammar;
- new environmental constraints;
- new items/hazards/routes.

The game gains novelty without becoming an unrelated minigame collection.

## 16. Ascent/difficulty and repeated mastery

PEAK includes increasing difficulty/Ascent-style challenges and badges/achievements.

Higher difficulty can:
- change available support/resources;
- intensify hazards;
- demand stronger route/item mastery.

Current Steam accounts describe extreme runs where:
- missing expected flare/support at high Ascent becomes a known rule;
- one remaining hook/resource can determine final success. [PK-G](#pk-g)

The game's small vocabulary supports mastery because high difficulty stresses:
- known objects;
- known physical rules.

## 17. Badges and cosmetic progression

Badges/achievements provide goals beyond:
- one successful summit.

They can unlock/correspond to cosmetic recognition.

This gives players:
- challenge targets;
- group goals;
- replay prompts.

Current player feedback flags the downside:
- some badge conditions depend heavily on item/map RNG;
- “I know what to do but cannot attempt it today” feels different from difficulty. [PK-H](#pk-h)

OpenLegend achievements should distinguish:
- mastery challenge;
- scavenger luck;
- time gate.

## 18. Solo versus co-op is a real product difference

Officially, solo is supported.

But multiple sources agree the social experience is central.

PC Gamer finds solo:
- harsher;
- lonelier

than group play. [PK-E](#pk-e)

Current negative Steam reviews complain:
- no public lobby browser;
- solo feels significantly worse;
- a multiplayer-focused game asks the user to bring their own group. [PK-I](#pk-i)

Other helpful reviews demonstrate the opposite possibility:
- people used community Discord/group-finding to make new friends;
- some players enjoyed solo mastery deeply. [PK-F](#pk-f)

So the correct conclusion is not:
> “solo is bad.”

It is:
> the product's emotional payoff changes dramatically with social context.

## 19. No inventory/crafting empire

PEAK deliberately does **not** have a large:
- crafting tree;
- settlement builder;
- permanent equipment economy;
- class progression system.

The items are mostly situational tools/consumables.

That matters for OpenLegend:
> emergence can come from **few objects with physical consequences**, not only enormous item catalogs.

## 20. Story and authored framing

The authored framing is compact:
- scouts;
- crash;
- mysterious island;
- summit/rescue goal;
- Scoutmaster Myres/Guidebook;
- environmental mystery.

Later writing/lore became richer; GameSpot compared the island mystery to *Lost*-style escalating questions. [PK-J](#pk-j)

But the memorable player stories are still usually:
- rescue;
- fall;
- betrayal/mistake;
- shared food;
- impossible climb.

The authored mystery provides atmosphere without replacing the cooperative mechanical story.

## 21. Art, audio and tactile feel

PEAK uses:
- cute/stylized Scouts;
- pastel/readable surfaces;
- exaggerated ragdoll/body motion;
- environmental contrasts;
- proximity voice.

PC Gamer emphasizes:
- tactile movement;
- climbing sounds;
- cute/danger contrast. [PK-E](#pk-e)

Critic reviews repeatedly describe the game as:
- charming;
- tactile;
- chaotic.

The presentation helps players interpret failure:
- a falling body;
- shrinking voice;
- visible ledge;
- dropped backpack.

OpenLegend needs similar legibility even if the camera differs:
> if an AI character fails, the player should see why.

## 22. Production: deliberate narrowing, not a magical four-week game

Developer interviews describe:
- an earlier broader concept;
- a collaborative game-jam trip to Seoul;
- three Aggro Crab + four Landfall collaborators;
- a roughly four-week intensive jam.

But reporting explicitly warns the game was **not** created entirely from zero in four weeks. [PK-D](#pk-d)

The meaningful production lesson:
- experienced teams;
- existing idea/code/art/process;
- focused scope;
- one clear activity;
- collaboration.

Do not turn “game jam” into a myth that quality requires no prior investment.

## 23. Burnout and choosing not to maximize the graph

By 2026 the developers have repeatedly discussed:
- unexpected scale;
- extra support work;
- burnout/attention cost;
- desire to return to other projects.

Landfall's final-update FAQ says explicitly that they do **not** want to:
- keep adding bloat;
- chase attention forever. [PK-B](#pk-b)

This is commercially important:
> a successful game can choose a **finished product contract** rather than convert itself into perpetual service.

OpenLegend's eventual business model should align support expectations with what the product actually needs.

## 24. Marketing, virality and sharing unit

PEAK has an extremely legible pitch:
> climb with friends; one mistake can doom the group.

It also produces strong clips:
- screaming falls;
- proximity voice fading;
- last-second rescue;
- cursed food;
- dropped backpack;
- absurd route tools.

WIRED notes its slapstick, simple premise and streamer suitability while reporting copycat problems after its breakout. [PK-K](#pk-k)

The important virality mechanism is not just “streamers.”

The game continuously produces:
> short, comprehensible social incidents.

OpenLegend should aim for similarly shareable causal episodes:
- “our mayor remembered the lie”;
- “the bridge invention saved the caravan”;
- “this animal warned us before the flood.”

## 25. Commercial context

Documented milestones:
- **100,000 copies in 24 hours**;
- **1 million in six days**;
- **2 million in nine days**;
- **10 million+ by August 2025**;
- Game File's January 2026 interview describes **more than 10 million sold in 2025**. [PK-L](#pk-l) [PK-M](#pk-m)

Game/File/developer reporting also describes the low standard price ($7.99 after an initial launch discount), which made group gifting/impulse purchase easier.

Do not infer:
- repeatable margins;
- exact marketing ROI;
- OpenLegend should use the same price.

PEAK is an exceptional outcome.

## 26. Five substantive written reviews

### 1. PC Gamer — Elie Gould, June 26, 2025

**Praised:** creative collaboration, tactile climbing, daily maps, proximity-driven rescue and low-friction value.

**Criticized:** solo is harsher/lonelier; launch-period graphics/API instability occurred in the review setup.

The strongest source for the causal rescue loop. [PK-E](#pk-e)

### 2. Checkpoint Gaming — June 24, 2025

**Praised:** tactile climbing, challenge, charming presentation, cooperative recovery from mistakes.

**Criticism/boundary:** highly positive, but emphasizes that chaos/failure is integral; players who dislike replaying mistakes may experience the same mechanic differently. [PK-N](#pk-n)

### 3. Game8 — June 20, 2025

**Praised:** short/sharp structure, clever co-op mechanics, memorable biomes.

**Criticized:** server issues/bugs and communication friction can interfere.

Useful reminder that social mechanics depend on reliable networking. [PK-N](#pk-n)

### 4. Final Weapon — July 28, 2025

**Praised:** chaotic friends-first experience.

**Criticized:** solo is clearly secondary; bugs/crashes reduce polish.

This is one of the clearest professional statements of the group-dependence tradeoff. [PK-N](#pk-n)

### 5. Games.cz — July 15, 2025

**Praised:** satisfying climbing animation/sound and casual fun.

**Criticized:** climbing gear could be deeper; sees it more as a one-evening social treat than a months-long multiplayer staple. [PK-O](#pk-o)

### Additional

IGN Benelux later praised the game's progression from simple climbing into strategic cooperative play. [PK-N](#pk-n)

The criticism set is useful precisely because it disagrees about expected longevity.

## 27. Steam positive/negative evidence

### Helpful positive

All-time helpful reviews emphasize:
- friends screaming/helping;
- proximity voice;
- daily map;
- rescuing/group bonding;
- post-death guidance;
- creating new friendships through community group finding;
- final update adding worthwhile new biomes. [PK-F](#pk-f)

One very highly rated review was updated after the final update to praise Gloom/Citadel and the added difficulty/badge content.

### Negative

Helpful negative reviews include:
- multiplayer focus without public lobby search/server list;
- solo balance feeling punishing;
- limited long-term content/QOL;
- protest/joke complaints about cosmetic changes.

Current negative reviews also include ordinary rage/frustration from hard hazards. [PK-I](#pk-i)

Do not treat joke/protest reviews as mechanics evidence.

## 28. Concrete situations

### Situation A — place a rest point and change the wall

**Goal:** cross a wall longer than current stamina.

**Action:** place Piton mid-climb.

**Result:** wall becomes two manageable segments.

**Group effect:** later teammate can use the same intermediate state.

**Lesson:** tools should create new world states, not only numerical buffs.

### Situation B — carrying help makes the helper weaker

**Goal:** bring food/rope for group.

**Action:** one Scout carries Backpack/supplies.

**Result:** group has options but carrier bears Weight burden.

**Lesson:** useful social roles can include asymmetric cost.

### Situation C — locate the missing friend

**State:** snowstorm/group separated.

**Signal:** proximity voice is faint but audible.

**Action:** teammates follow communication, find/assist.

**Result:** information channel + movement + help creates rescue story.

**Lesson:** memory-worthy stories need real causal links.

### Situation D — invert one material property

**Tool:** Anti-Rope.

**Difference:** rises/floats instead of ordinary downward rope behavior.

**Result:** enables upward route construction and creates loss risk.

**Lesson:** one rule change can create an entire new affordance family.

### Situation E — die but remain socially useful

**State:** one player dead/ghost.

**Action:** guide living teammate using superior viewpoint/knowledge.

**Result:** failure changes role instead of ending participation.

**Lesson:** design post-failure agency intentionally.

## 29. Transferable inspiration for OpenLegend

### A. Prototype one shared predicament before a whole society

A clear crisis can test:
- perception;
- communication;
- memory;
- useful action;
- rescue.

### B. Make assistance spatial and costly

Help is meaningful when a helper:
- travels;
- carries;
- spends;
- risks.

### C. Build tools that change topology

Ropes, bridges, portals, handholds, permissions and introductions can create **new reachable states**.

### D. Partial information can create cooperation

But it must have:
- a communication route;
- a reason to share;
- consequence.

### E. Rotate situations, keep laws stable

Procedural variety should not make learned mechanics unreliable.

### F. Allow games/worlds to be finished

Do not equate ongoing value with mandatory endless feature addition.

### G. Social mode access is part of design

If the fun depends on groups:
- matchmaking;
- invites;
- persistence;
- moderation;
- group finding

are product mechanics, not only platform plumbing.

## 30. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2 |
| R02 player actions / major mechanics | §§3–19 |
| R03 items / entities / composition | §§5–10 |
| R04 progression / economy / time | §§14–17, 25 |
| R05 concrete interactions | §28 |
| R06 people / AI / social / multiplayer | §§6, 11–13, 18 |
| R07 art / audio / interface / feel | §21 |
| R08 story / narrative | §20 |
| R09 production / development | §§22–23 |
| R10 marketing / distribution / virality | §24 |
| R11 commercial / participation | §25 |
| R12 reviews / player feedback | §§26–27 |
| R13 inspiration / limits | §29 |
| R14 sources / preservation / navigation | this section + sources |

**Mechanics-inventory check:** climbing/stamina/status, Weight/inventory, food/recovery, Pitons/Ropes/Anti-Rope/backpacks, rescue, proximity communication, daily procedural routes, biomes, difficulty/badges, death/ghost role, solo/co-op and final-update boundary are covered. PEAK intentionally lacks conventional RPG classes/skill trees, crafting economy, settlement building, factions, romance, persistent loot progression and native AI companion simulation.

**Preservation check:** [the original PEAK chapter](../games/peak.md) remains intact. [The detailed shared-burdens study](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md) remains the owner for stamina/Weight, Backpack, Piton, Rope/Anti-Rope, Big Lollipop, proximity-rescue and Seoul-jam evidence. The dossier adds the final-update/current-support and expanded review/commercial corpus.

## Sources

<a id="pk-a"></a>**PK-A — [PEAK on Steam](https://store.steampowered.com/app/3527290/PEAK/).** Landcrab/Aggro Crab/Landfall/Valve, accessed 2026-09-26. Core premise and current PC product surface.

<a id="pk-b"></a>**PK-B — [PEAK FAQ](https://landfall.se/peak-faq).** Landfall, accessed 2026-09-26. Primary current support/final-major-update/live-service boundary.

<a id="pk-c"></a>**PK-C — [The final biome update arrives August 11](https://store.steampowered.com/news/posts/?enddate=1786035613&feed=steam_community_announcements).** PEAK/Landcrab, 2026-08-06. Primary announcement of Gloom/Citadel final major update.

<a id="pk-d"></a>**PK-D — [PEAK shared burdens, rescue, and spatial tools](../mechanics/peak-shared-burdens-rescue-and-spatial-tools.md).** Internal detailed study with adjacent official/community/developer sources.

<a id="pk-e"></a>**PK-E — [PEAK review](https://www.pcgamer.com/games/adventure/peak-review/).** Elie Gould, PC Gamer, 2025-06-26.

<a id="pk-f"></a>**PK-F — [PEAK most helpful Steam reviews](https://steamcommunity.com/app/3527290/reviews/?browsefilter=toprated).** Steam Community, accessed 2026-09-26. Self-selected player accounts; joke material not treated as mechanics evidence.

<a id="pk-g"></a>**PK-G — [PEAK current Steam review/community surface](https://steamcommunity.com/app/3527290/reviews/).** Accessed 2026-09-26. Current player accounts including high-Ascent run examples.

<a id="pk-h"></a>**PK-H — [PEAK current September Steam reviews](https://steamcommunity.com/app/3527290/reviews/?filterLanguage=english).** Qualitative current evidence around achievement RNG/value/group play.

<a id="pk-i"></a>**PK-I — [PEAK helpful negative Steam reviews](https://steamcommunity.com/app/3527290/negativereviews/?browsefilter=toprated&l=english).** Accessed 2026-09-26. Multiplayer access, solo and QOL complaints; self-selected.

<a id="pk-j"></a>**PK-J — [The Magic of PEAK Is Its Lost-like Lore](https://www.gamespot.com/articles/the-magic-of-peak-is-its-lost-like-lore/1100-6537069/).** Aron Garst, GameSpot, 2025-12-19. Authored mystery/worldbuilding analysis.

<a id="pk-k"></a>**PK-K — [AI Slop Is Ripping Off One of Summer's Best Games](https://www.wired.com/story/ai-slop-is-ripping-off-one-of-summers-best-games-fighting-back-is-harder-than-you-think/).** Megan Farokhmanesh, WIRED, 2025-08-14. Stream/share/copycat context and then-current developer sales report.

<a id="pk-l"></a>**PK-L — [PEAK sells 1 million in six days](https://www.pcgamer.com/games/im-gonna-crash-out-new-climbing-game-peak-has-sold-1-million-copies-in-less-than-a-week-outperforming-its-developers-most-popular-game/).** PC Gamer, 2025-06-24.

<a id="pk-m"></a>**PK-M — [PEAK interview](https://www.gamefile.news/p/peak-interview).** Stephen Totilo / Nick Kaman, Game File, 2026-01-07. Accessible excerpt states >10M copies sold in 2025 and discusses pricing; paywalled remainder not represented as read.

<a id="pk-n"></a>**PK-N — [PEAK critic reviews](https://www.metacritic.com/game/peak/critic-reviews/?platform=pc).** Metacritic index, accessed 2026-09-26. Routes/summaries for Checkpoint Gaming, Game8, Final Weapon, IGN Benelux; original review claims kept to displayed substantive summaries where bodies are not retrievable.

<a id="pk-o"></a>**PK-O — [PEAK critic index](https://videogamescritic.com/game/peak-3527290).** Review index preserving Games.cz critique of limited long-run staple value and climbing-gear depth; secondary route, used narrowly.
