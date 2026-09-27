# Grand Theft Auto V — full research dossier

**G67 · Complete research pass, September 26, 2026.** This dossier separates **Grand Theft Auto V Story Mode** from **Grand Theft Auto Online**, which share Los Santos/San Andreas and core movement/driving/shooting technology but have materially different characters, progression, economies, failure states, update history, monetization, and social structure. Current PC reference includes **Grand Theft Auto V Enhanced**, released March 4, 2025; the original/Legacy PC branch is not silently treated as identical. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

For OpenLegend, GTA V is most useful not as a crime fantasy but as a study of **world density and activity composition**. A coherent place supports driving, flying, swimming, shopping, sports, police pursuit, scripted missions, random encounters and self-authored chaos using one persistent spatial substrate. Its three-protagonist design is also a rare example of switching between autonomous lives without making the world feel reset each time.

## 1. Identity and edition boundaries

**Developer:** Rockstar North with large-scale support across Rockstar studios.  
**Publisher:** Rockstar Games / Take-Two.  
**Original release:** September 17, 2013 on PlayStation 3/Xbox 360.  
Later releases:
- PS4/Xbox One — 2014;
- PC — April 2015;
- PS5/Xbox Series — 2022;
- **PC Enhanced** — March 4, 2025. [GV01](#gv01) [GV02](#gv02)

The package now contains two related experiences:

### Story Mode
Single-player authored campaign starring:
- **Michael De Santa**;
- **Franklin Clinton**;
- **Trevor Philips**.

### GTA Online
Persistent online character/economy/business/activity platform that began shortly after the original launch and has evolved for more than a decade.

A mechanic from GTA Online must not be attributed to Story Mode merely because both occur in Los Santos.

## 2. World promise: one place, many verbs

Los Santos and Blaine County support:
- walking/running;
- driving;
- motorcycles/bicycles;
- boats;
- aircraft;
- swimming/diving;
- shooting/melee;
- stealing vehicles;
- police evasion;
- buying clothes/weapons/vehicles;
- vehicle modification;
- businesses/properties;
- sports/minigames;
- races;
- random encounters;
- exploration/collectibles;
- scripted missions/heists.

The key is not the raw count.

Many activities share:
- roads;
- vehicles;
- NPC traffic;
- wanted system;
- economy;
- physics;
- weather/time;
- geography.

This creates combinatorial incidents without a bespoke map for every activity.

PC Gamer describes the world's enduring strength as its ability to let a trip to a clothing store accidentally become an hour-long cascade of police pursuit, stolen vehicles, aircraft, animals and freeform escape. [GV03](#gv03)

## 3. Three protagonists as persistent offscreen lives

Story Mode lets the player switch among Michael, Franklin and Trevor outside many missions.

Each has:
- home;
- social contacts;
- personal mission strands;
- distinct personality;
- different geography/routines;
- unique special ability;
- separate cash balance and some possessions/progression.

Switching may drop into the new protagonist:
- already driving;
- arguing;
- drinking;
- wandering;
- doing something consistent with their personality.

### Why Rockstar chose three

Dan Houser said the idea grew partly from GTA IV's episodic stories crossing over: instead of separate expansions, GTA V could make multiple protagonists part of one campaign. [GV04](#gv04)

### OpenLegend relevance

This is a valuable approximation of **offscreen autonomy**:
> when the player is not controlling a person, that person appears to keep living.

OpenLegend can make this systemic rather than a library of authored switch-in vignettes.

## 4. Character-specific abilities and role distinction

Each protagonist has a special ability:
- Michael — combat-focused time/aim advantage;
- Franklin — precision/slowed driving control;
- Trevor — rage/damage-oriented combat state.

They also begin with different practical strengths and social access.

This reinforces character identity through action without locking each person into a totally separate game.

### OpenLegend lesson

Named characters can share universal world verbs while differing through:
- expertise;
- temperament;
- body;
- training;
- social position.

## 5. Driving and vehicle ecology

Vehicles are the dominant traversal substrate.

Categories include:
- cars/trucks;
- motorcycles;
- bicycles;
- aircraft;
- helicopters;
- boats/submersibles;
- service/special vehicles.

Vehicles can have:
- speed/acceleration;
- handling;
- damage state;
- occupants;
- ownership/storage;
- customization;
- wanted/crime implications.

In Story Mode, vehicles are often disposable world objects but selected personal vehicles persist more strongly.

GTA Online deepens:
- ownership;
- garages;
- insurance;
- upgrades;
- specialized weaponized/service vehicles;
- businesses tied to vehicle storage/use.

### OpenLegend lesson

A vehicle is compelling when it is not “fast travel”:
- it occupies space;
- can be damaged;
- carries people/items;
- changes risk/access;
- can become property/history.

## 6. Wanted system: law as escalating world response

Illegal behavior can create a **Wanted Level**.

Escalation changes:
- number/type of police;
- pursuit intensity;
- road/air response;
- search behavior.

Escaping requires breaking line of sight and avoiding reacquisition until the search decays.

The result is a reusable transformation:
> ordinary city → pursuit simulation

without changing maps.

### Limit

The law system is deliberately gamey:
- witnesses/reporting are simplified;
- disguises/evidence/social identity are shallow;
- police response can be unrealistically immediate.

OpenLegend can build richer law from:
- observers;
- communication;
- jurisdiction;
- evidence;
- reputation.

## 7. Shooting, cover, health, armor, and failure

Combat includes:
- firearms by weapon class;
- melee;
- explosives;
- cover;
- aiming/lock-on depending settings/platform;
- armor and health;
- special abilities.

Death in Story Mode:
- returns the protagonist through a hospital/retry loop;
- loses some money/progress around the incident rather than permanent character death.

Mission failure typically offers:
- retry from checkpoint;
- skip options after repeated failure in some contexts.

This separates cinematic stakes from punishing repetition.

### OpenLegend lesson

Story stakes do not require mechanically permanent death for every protagonist.

## 8. Heists: multi-stage authored teamwork

Story Mode's centerpiece heists often involve:

1. target/setup;
2. approach choice;
3. crew selection;
4. preparatory missions;
5. execution;
6. switches among protagonists/roles;
7. payout/consequences.

Crew members differ in:
- cost/cut;
- competence;
- survivability/performance;
- experience growth after successful jobs.

A cheaper inexperienced crew member can fail but may improve if kept alive across heists.

### Strong design pattern

This is a compact model of:
> person + role + competence + compensation + persistent history.

OpenLegend could support generated teams where prior work changes:
- trust;
- skill;
- wage expectations;
- reputation.

## 9. Protagonist switching during missions

Some missions exploit simultaneous roles:
- one character drives;
- another provides overwatch;
- another enters a location.

The player switches perspective while AI controls the others.

This creates cinematic scale without requiring co-op.

### OpenLegend opportunity

A player can inhabit/direct multiple allied actors while the others retain:
- goals;
- competence;
- local autonomy.

This is more interesting than freezing everyone except the currently selected avatar.

## 10. Skills and progression

Story protagonists have use-influenced statistics such as:
- stamina;
- shooting;
- strength;
- stealth;
- flying;
- driving;
- lung capacity.

Practice improves relevant ability.

This is lighter than a conventional RPG skill tree.

Examples:
- drive more → improve driving;
- fly → flying;
- exercise/physical action → relevant physical stats.

### OpenLegend transfer

Some abilities should grow through repeated embodied practice rather than abstract XP allocation.

## 11. Economy, properties, stocks, and material reward

Story Mode money comes from:
- missions/heists;
- certain encounters;
- investments/stock manipulation;
- side activities.

Spending includes:
- weapons/ammo;
- vehicles/customization;
- clothes;
- properties;
- activities.

Some properties generate:
- periodic income;
- related missions/activities.

The stock market allows mission/world events to affect investment outcomes in authored ways.

### Limitation

Story Mode's economy becomes increasingly loose after major heists, and many purchases are sinks rather than deep production systems.

## 12. Activities and minigames

Examples include:
- golf;
- tennis;
- darts;
- triathlons;
- shooting range;
- races;
- flight school;
- hunting;
- yoga;
- strip-club/social activities;
- underwater exploration;
- stunt jumps.

These differ in depth.

Their larger contribution is **place plausibility**:
Los Santos feels like a place people could inhabit, not a mission corridor.

### OpenLegend lesson

Small low-stakes activities can make a world feel socially complete even if they do not advance the central plot.

## 13. NPCs, traffic, pedestrians, and ambient response

The city continuously populates:
- pedestrians;
- cars;
- police;
- animals in later versions;
- workers/performers;
- random events.

NPCs react locally to:
- collision;
- weapons;
- violence;
- theft;
- player proximity.

They are not deep persistent agents:
- most are interchangeable;
- memory is short;
- schedules/lives are largely illusion.

### OpenLegend opportunity

GTA shows how powerful ambient density is.

OpenLegend can add what GTA generally lacks:
- persistent identity;
- memory;
- relationships;
- property;
- routine.

## 14. Random events and emergent incidents

Story Mode includes random encounters such as:
- thefts;
- stranded people;
- crimes;
- hitchhikers;
- opportunities.

They make traversal interruptible.

The strongest emergent incidents also come from subsystem collision:
- traffic accident;
- NPC aggression;
- police;
- physics;
- player intervention.

### Principle

Open-world content feels less synthetic when:
- the world can interrupt the player,
- and the interruption uses shared rules.

## 15. Story and thematic connection to play

The campaign follows three criminals whose problems converge around:
- heists;
- corrupt authorities;
- family/friend relationships;
- betrayal;
- money/status.

Its satire targets:
- celebrity culture;
- advertising;
- technology;
- finance;
- media;
- policing/government;
- Southern California lifestyles.

### Critical tension

Reviewers consistently praised:
- protagonist switching;
- mission spectacle;
- the world.

They were more divided on:
- nihilism;
- story coherence;
- treatment of women;
- emotional depth.

GameSpot's Carolyn Petit explicitly praised the multi-perspective structure while criticizing a recurring misogynistic strain. [GV05](#gv05)

PC Gamer similarly called Los Santos extraordinary but found the campaign nastier/more nihilistic than Rockstar's prior antihero work. [GV06](#gv06)

## 16. Art, audio, interface, and physical feel

The simulation's credibility comes heavily from:
- dense animation;
- vehicle/audio variety;
- day/night lighting;
- weather;
- radio stations;
- ambient advertising;
- traffic;
- large draw distance;
- terrain transitions.

Radio is especially important:
- licensed music;
- fictional talk/news;
- satire;
- contextual driving atmosphere.

Dan Houser emphasized open worlds as about “being” in a place, not only completing authored actions. [GV07](#gv07)

### Rockstar Editor

PC/later versions added recording/editing tools for:
- captured gameplay;
- camera work;
- clips.

That gives players a **sharing unit** beyond ordinary screenshots.

## 17. Production scale and technology

Rockstar North president Leslie Benzies said **more than 1,000 people** across Rockstar studios contributed to GTA V. [GV08](#gv08)

He described modern giant Rockstar games as studio-wide collaborative efforts rather than a single local team's product.

The production challenge included:
- enormous world;
- three protagonist systems;
- vehicles;
- mission scripting;
- animation;
- licensed audio;
- GTA Online infrastructure.

### OpenLegend lesson

GTA's content density is extremely expensive when authored manually.

OpenLegend's opportunity is not to copy GTA's content budget; it is to build reusable world laws so authored/generative content can share behavior.

## 18. Story Mode versus Online

They must remain separate.

### Story Mode
- three fixed protagonists;
- authored campaign;
- finite major progression;
- no recurring premium-currency economy;
- offline/single-player core.

### GTA Online
- player-created protagonist;
- persistent rank/cash/assets;
- shared sessions;
- recurring businesses/heists/events;
- creator/community jobs;
- live updates;
- microtransactions;
- GTA+ subscription on supported versions.

The two reuse:
- geography;
- vehicles;
- combat;
- physics.

But they produce very different player motivation.

## 19. GTA Online: persistent avatar and social world

Online players create a criminal avatar and build:
- rank;
- cash;
- property;
- vehicle collection;
- weapons;
- businesses;
- cosmetics.

They can participate in:
- missions;
- races;
- deathmatches;
- heists;
- adversary modes;
- freemode events;
- business activities;
- community/creator jobs.

Sessions mix:
- cooperation;
- competition;
- griefing;
- ambient coexistence.

### OpenLegend lesson

A shared world requires explicit choices about:
- authority;
- PvP;
- ownership;
- griefing;
- persistence.

A sandbox without social law becomes domination by whoever has the strongest tools.

## 20. GTA Online businesses and long-tail goals

Over years, Online added businesses such as:
- executive cargo/warehouses;
- motorcycle operations;
- bunker/gunrunning;
- hangars;
- nightclubs;
- arcades;
- agencies;
- salvage/other later enterprises.

The pattern:
1. buy access/property;
2. perform sourcing/setup;
3. produce/store value;
4. sell/complete jobs;
5. invest in upgrades/new businesses.

This gives expensive possessions functional purpose.

### Risk

As layers accumulate:
- new players face huge menu/economy complexity;
- old activities can become economically obsolete;
- payout balance changes can invalidate learned routines.

Current negative Steam reviews in 2026 specifically complain about heist payout nerfs and expensive entry costs. [GV09](#gv09)

## 21. GTA Online heists: multiplayer role specialization

Online heists require/coerce coordination around roles such as:
- driver;
- pilot;
- hacker;
- shooter;
- infiltrator.

Later heists vary in:
- team size;
- solo viability;
- approach;
- prep burden.

Strong moments arise when:
- one player's failure changes another's job;
- vehicles/escape routes matter;
- communication creates recovery.

### OpenLegend relevance

Multi-agent tasks should have:
- separable responsibilities;
- shared failure state;
- opportunity for improvisation.

## 22. Creator ecosystem and mod boundary

Rockstar added official creator tools for:
- races;
- deathmatches;
- later mission/job forms.

PC also produced a huge mod ecosystem, including single-player modifications and roleplay ecosystems built around third-party multiplayer frameworks.

These are **not equivalent**:
- official creator jobs operate inside Rockstar's supported Online framework;
- mods/third-party servers can radically alter rules and are governed by separate policies.

Rockstar's modding policy continues to evolve, and current 2026 reporting notes stricter guidelines around certain derivative content. [GV10](#gv10)

### OpenLegend lesson

Creator authority tiers should be explicit:
- safe user content;
- trusted server/world package;
- local mod;
- core engine.

## 23. Enhanced edition and 2026 state

**GTA V Enhanced** on PC launched March 4, 2025 with newer-generation improvements such as:
- upgraded visuals;
- faster loading;
- 3D audio;
- GTA Online features/content previously associated with newer console versions. [GV02](#gv02)

Steam's current product page continues to sell Story Mode + GTA Online as one Enhanced package. [GV02](#gv02)

### Migration and anti-cheat friction

Steam reviews document:
- account/profile migration issues;
- missing online text chat in Enhanced at launch/current contexts;
- kernel-level anti-cheat concerns/workarounds for some single-player users;
- online economy criticism. [GV09](#gv09) [GV11](#gv11)

These are edition/service complaints, not evidence against the 2013 Story Mode design.

## 24. Commercial scale

Take-Two's August 2026 investor materials report GTA V at **more than 230 million units sold-in worldwide** across its lifetime. [GV12](#gv12)

Take-Two also continues to list:
- GTA Online;
- GTA V

among major contributors to net bookings. [GV13](#gv13)

“Sold-in” is not:
- unique active players;
- current monthly users;
- GTA Online revenue.

The title's commercial longevity nonetheless demonstrates extraordinary ability to bridge:
- premium campaign;
- live service;
- multi-generation rereleases.

## 25. Five substantive written reviews

### 1. GameSpot — Carolyn Petit, 2013/2014 archived review

**Praised:** Los Santos, three-protagonist switching, mission/heist spectacle, freedom and activity variety.

**Criticized:** story weaknesses and misogynistic characterization/representation. [GV05](#gv05)

### 2. IGN — Keza MacDonald, 2013

**Praised:** extraordinary scope, satire, technical ambition, freeform adventures and compelling protagonist structure.

**Qualification:** the praise is explicitly about single-player; GTA Online was not yet part of the launch review. [GV14](#gv14)

### 3. Game Informer — Matt Bertz, 2013

**Praised:** controls, mission variety, packed world, driving/gunplay and three-character action.

**Criticized:** narrative impact did not match Rockstar's strongest prior protagonists despite entertaining cast. [GV15](#gv15)

### 4. PC Gamer — Chris Thursten, 2015

**Praised:** Los Santos' extraordinary detail, generosity, technical PC presentation and sandbox possibilities.

**Criticized:** campaign/characters felt cynical, nasty and emotionally weaker than the world around them. [GV06](#gv06)

### 5. The Guardian — Matt Kamen, 2013

**Praised:** city, exploration, activity breadth and performances.

**Criticized:** narratively uninspired central story and action sequences that can demand less skill than the spectacle suggests. [GV16](#gv16)

### Additional dissent: Ars Technica

Ars praised visual/world achievement but criticized some technical performance and the gap between enormous breadth and what the reviewer actually found compelling. [GV17](#gv17)

## 26. Steam top/helpful player evidence — Enhanced

Steam is applicable; the current **Enhanced** app was sampled rather than pretending Legacy reviews describe the current PC package.

### Positive themes

Current helpful/recent reviews praise:
- enduring single-player sandbox;
- improved graphics/loading;
- less cheating than some players remember;
- enormous amount of content. [GV11](#gv11)

The aggregate remains “Very Positive” in September 2026. [GV02](#gv02)

### Negative themes

Helpful negatives focus heavily on **Online/service changes**:
- reduced heist payouts;
- expensive new business entry;
- removed/missing text chat;
- migration/support problems;
- anti-cheat concerns. [GV09](#gv09)

This reinforces the need to separate:
- GTA V Story Mode quality;
- current GTA Online economy/service sentiment.

## 27. Worked interactions

### A. Switch protagonists to assemble one heist

**Intent:** execute a coordinated robbery.

**Actions:** choose approach/crew → complete setup → switch among shooter/driver/overwatch roles during execution.

**Result:** one authored operation feels multi-perspectival without co-op.

**OpenLegend lesson:** retain actor autonomy while allowing temporary possession/direct control.

### B. A small traffic collision becomes a systemic chase

**Intent:** drive to a shop.

**Interaction:** collide → NPC/police reaction → wanted level → steal another car → flee off-road → crash → continue on foot.

**Result:** no designer authored “the shopping-trip chase mission.”

**Lesson:** shared laws turn mundane movement into story.

### C. Cheap crew member survives and improves

**Intent:** maximize heist payout.

**Choice:** hire less-skilled/lower-cut crew.

**Result:** they may perform poorly; if they survive, experience can improve future performance.

**Lesson:** workers should accumulate task-specific history and reputation.

### D. Online property becomes production infrastructure

**Intent:** make money through a business.

**Actions:** buy property → source/setup → manage stock → sell.

**Result:** spatial ownership creates a repeated economic loop.

**Limit:** if payouts are rebalanced, player-authored time/value assumptions can be invalidated.

### E. Break police line of sight instead of filling a timer

**Intent:** escape law.

**Actions:** use alleys/tunnels/terrain → leave direct sight → avoid search zones.

**Result:** geography becomes part of social/law state.

**OpenLegend extension:** witnesses and identity could make this much richer.

## 28. Transferable inspiration for OpenLegend

### A. One spatial substrate should host many activities

Do not create a separate minigame-world for:
- work;
- socializing;
- crime;
- travel

unless necessary.

### B. Offscreen characters should continue to exist

The protagonist-switch vignettes are authored illusions of this; OpenLegend can actually simulate it.

### C. Use escalating institutional responses

Wanted levels show how a world can increase response rather than spawning one arbitrary punishment.

### D. Team roles should have persistent people behind them

Crew skill/cut/history makes “driver” more than a slot.

### E. Give low-stakes activities a place in the world

Sports, shopping and wandering make place meaningful.

### F. Let user-created spatial configurations become content

Online creator/roleplay ecosystems demonstrate massive demand for players authoring inside a familiar world.

## 29. Limits / what not to copy automatically

### Breadth is not depth

Many GTA activities are shallow.

OpenLegend should prioritize interactions that feed shared state.

### Ambient NPC density is not personhood

A crowd can make a city alive visually while nobody remembers you.

### Cinematic missions can violate sandbox rules

Rockstar missions sometimes fail players for leaving narrow scripted bounds despite a broad open world.

OpenLegend should prefer goal validation over invisible choreography.

### Live economy rebalancing can destroy trust

If a player's enterprise depends on a rule, changes need transparent rationale/migration.

### Do not copy harassment/griefing incentives

Shared-world freedom needs permissions and social governance.

## 30. Requirement and preservation map

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–3, 18, 23 |
| R02 player actions / mechanics | §§2–23 |
| R03 items / entities / composition | §§5, 7–12, 20 |
| R04 progression / economy / time | §§10–11, 19–24 |
| R05 concrete interactions | §27 |
| R06 people / AI / social / multiplayer | §§3, 8–9, 13–14, 19–22 |
| R07 art / audio / interface / feel | §§5, 16–17, 23 |
| R08 story / narrative | §§3, 8, 15 |
| R09 production | §17 |
| R10 marketing / distribution / virality | §§16, 22–24 |
| R11 commercial / participation | §24 |
| R12 reviews / player feedback | §§25–26 |
| R13 inspiration / limits | §§28–29 |
| R14 sources / preservation / navigation | this section + Sources |

### Mechanics inventory

Covered:
- three protagonists/identity;
- stats/use progression;
- weapons/combat/cover;
- vehicles/traversal;
- wanted system;
- activities/minigames;
- economy/stocks/properties;
- heists/crew;
- NPC traffic/random encounters;
- story/factions;
- Online avatar/rank;
- businesses;
- multiplayer/co-op/PvP;
- creator/mod boundaries;
- death/retry;
- current Enhanced edition.

Not major:
- magic;
- deep crafting;
- romance simulation;
- tactical party RPG classes;
- persistent individual memory for ambient NPCs.

### Preservation check

G67 was added by the expanded roster and had no inherited full GTA V dossier. This pass keeps:
- Story Mode;
- GTA Online;
- Enhanced/Legacy;
- official creator/mod ecosystem

as explicit boundaries.

## Sources

<a id="gv01"></a>**GV01 — [Grand Theft Auto V reviews/profile](https://www.gamespot.com/games/grand-theft-auto-v/reviews/).** GameSpot. Release/platform chronology and review archive.

<a id="gv02"></a>**GV02 — [Grand Theft Auto V Enhanced](https://store.steampowered.com/app/3240220/).** Steam/Rockstar current store page. March 4, 2025 PC Enhanced release, current package/features and current review aggregate.

<a id="gv03"></a>**GV03 — [PC Gamer's 2015 GTA V retrospective/GOTY discussion](https://www.pcgamer.com/the-2015-game-of-2013-award-grand-theft-auto-5/).** Multiple PC Gamer staff; systemic sandbox examples.

<a id="gv04"></a>**GV04 — [Grand Theft Auto V preview: the inside story](https://www.theguardian.com/technology/gamesblog/2012/nov/12/grand-theft-auto-v-preview-gta-5).** The Guardian interview with Dan Houser; primary rationale for three protagonists.

<a id="gv05"></a>**GV05 — [Grand Theft Auto V Review](https://www.gamespot.com/reviews/grand-theft-auto-v-review/1900-6414475/).** Carolyn Petit, GameSpot. Full review.

<a id="gv06"></a>**GV06 — [GTA 5 PC review](https://www.pcgamer.com/gta-5-review/).** Chris Thursten, PC Gamer, April 20, 2015. Full review.

<a id="gv07"></a>**GV07 — [Meet Dan Houser, architect of a gaming phenomenon](https://www.theguardian.com/technology/2013/sep/07/grand-theft-auto-dan-houser).** The Guardian, September 2013. Interview on open-world “being,” protagonists, heists and audio.

<a id="gv08"></a>**GV08 — [Rockstar: More than 1,000 people made GTAV](https://www.gamespot.com/articles/rockstar-more-than-1000-people-made-gtav/1100-6415330/).** GameSpot reporting on Leslie Benzies interview, October 2013.

<a id="gv09"></a>**GV09 — [GTA V Enhanced Steam negative reviews](https://steamcommunity.com/app/3240220/negativereviews/?browsefilter=toprated).** Current helpful-negative qualitative sample, 2026.

<a id="gv10"></a>**GV10 — [Rockstar modding guidelines reporting](https://www.gamesradar.com/games/grand-theft-auto/ahead-of-gta-6-rockstar-releases-modding-guidelines-that-axe-new-missions-maps-ports-and-more-respect-our-games/).** GamesRadar+, September 2026. Current secondary policy reporting; not used to characterize historical mod rules.

<a id="gv11"></a>**GV11 — [GTA V Enhanced Steam reviews](https://steamcommunity.com/app/3240220/reviews/?browsefilter=toprated).** Current top/helpful mixed player sample.

<a id="gv12"></a>**GV12 — [GTA V surpasses 230 million sold-in](https://www.gamedeveloper.com/business/gta-v-surpasses-230-million-sales-months-before-gta-vi-touches-down).** Game Developer, August 7, 2026, reporting Take-Two fiscal Q1 2027 materials.

<a id="gv13"></a>**GV13 — [Take-Two FY2026 results](https://www.take2games.com/ir/news/take-two-interactive-software-inc-reports-results-fourth-2).** Take-Two primary investor release, May 21, 2026. GTA V/Online among major net-bookings contributors.

<a id="gv14"></a>**GV14 — [Grand Theft Auto V Review](https://www.ign.com/articles/2013/09/16/grand-theft-auto-v-review).** Keza MacDonald, IGN, September 2013. Full single-player review; review/archive availability may vary.

<a id="gv15"></a>**GV15 — [Grand Theft Auto V Review — The Seedy Side of a Sunny State](https://www.gameinformer.com/games/grand_theft_auto_v/b/ps3/archive/2013/09/16/grand-theft-auto-v-review.aspx).** Matt Bertz, Game Informer, September 16, 2013.

<a id="gv16"></a>**GV16 — [Grand Theft Auto V review](https://www.theguardian.com/technology/2013/oct/13/gran-theft-auto-5-review).** Matt Kamen, The Observer/The Guardian archive, October 13, 2013.

<a id="gv17"></a>**GV17 — [Grand Theft Auto V: A crime- and sun-filled tourist destination](https://arstechnica.com/gaming/2013/09/gta-v/).** Ars Technica, September 2013. Independent review/technical perspective.
