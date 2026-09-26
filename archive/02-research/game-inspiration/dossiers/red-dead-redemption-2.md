# Red Dead Redemption 2 — full research dossier

**G70 · Complete research pass, September 26, 2026.** This dossier separates the **single-player 2018 story** from **Red Dead Online**, which shares the world and core controls but has a separate custom avatar, progression/economy, social structure, monetization and service history. The current PC release remains the 2019 version; no native PS5/Xbox Series edition was located in the sources read for this pass, so backwards-compatible play is not mislabeled as a current-generation remaster. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Red Dead Redemption 2 is one of the most relevant open-world references for OpenLegend because it asks the player to inhabit a **socially embedded body** rather than merely steer a mission avatar. Arthur:
- lives in a camp with a persistent community;
- eats, sleeps, dresses for weather, gets dirty and gains/loses weight;
- bonds with a particular horse;
- carries only a bounded subset of weapons;
- can greet, antagonize, rob, calm or defuse people;
- witnesses animals and strangers acting without him;
- accumulates honor and bounty;
- eventually leaves a world that persists after his death.

The downside is equally instructive: Rockstar's world simulation is unusually permissive while many authored missions are unusually rigid. The player can improvise for hours in free roam and then fail a mission for stepping outside an invisible choreography boundary.

## 1. Identity, scope, and current product

**Developer:** Rockstar Studios, led by Rockstar Games' network of studios.  
**Publisher:** Rockstar Games / Take-Two.  
**Story release:** October 26, 2018 on PS4/Xbox One; November 5, 2019 on PC. [R2-01](#r2-01) [R2-02](#r2-02)

The game is set in **1899**, twelve years before Red Dead Redemption. The player is **Arthur Morgan**, senior member of the Van der Linde gang, after a failed Blackwater robbery forces the group into a long retreat across a fictionalized American frontier.

Two products now need separate treatment:

### Story Mode
- Arthur Morgan and later epilogue continuity;
- authored gang narrative;
- honor-linked story interpretation;
- fixed world economy;
- no premium-currency monetization.

### Red Dead Online
- custom player character;
- rank, money, Gold, ability cards, roles and businesses;
- posses and multiplayer sessions;
- recurring event/bonus rotations;
- historically larger content updates, now mostly rotating events/bonuses and smaller additions.

The Steam product exposes both single-player and multiplayer, but their motivation/progression loops are not interchangeable. [R2-02](#r2-02)

## 2. Arthur as a persistent body

Arthur's state includes:
- Health;
- Stamina;
- Dead Eye;
- three corresponding **Cores**;
- weight;
- temperature/clothing comfort;
- cleanliness;
- intoxication/consumable state;
- facial hair/hair growth;
- clothing;
- weapons and weapon condition;
- horse relationship.

The game distinguishes:
- **outer meters** — immediately expendable performance;
- **Cores** — underlying resource that affects regeneration.

This is a powerful embodied model:
> condition changes capability gradually, rather than every need being a binary survival timer.

Arthur can be hungry or exhausted without instantly becoming unplayable.

### OpenLegend lesson

Needs should often create:
- pressure;
- altered recovery;
- mood/performance changes

before they create hard failure.

## 3. Eating, weight, sleep, temperature, and cleanliness

Arthur can eat:
- cooked meat;
- canned food;
- camp stew;
- store/restaurant food;
- tonics/provisions.

Repeated intake versus exertion affects weight. Weight changes some combat/stamina tradeoffs rather than only appearance.

Weather/region matters:
- cold conditions encourage warm outfits;
- heat makes heavy clothing uncomfortable.

Bathing/washing and environmental dirt influence appearance and some social remarks.

### What this is not

RDR2 is **not** a hard survival simulator:
- Arthur does not permanently starve after a few hours;
- sleep is not an unavoidable real-time failure clock;
- temperature consequences are bounded.

The system exists to make embodied care salient without dominating the Western drama.

## 4. Camp: a social home, economy, and narrative instrument

The Van der Linde camp is the center of Story Mode.

It contains:
- gang members;
- tents/beds;
- food/stew;
- medicine/ammunition supplies;
- donation ledger;
- Pearson's butcher/crafting functions;
- chores;
- conversations;
- companion activities;
- story missions;
- upgrades.

Arthur can:
- contribute money/valuables;
- purchase camp improvements through the ledger;
- replenish or upgrade stores;
- donate carcasses/materials;
- perform chores;
- sit, eat and listen.

### Why camp matters

Gang members:
- talk to one another without waiting for Arthur;
- react to recent story events;
- sing/argue/tell stories;
- move around the space;
- invite Arthur into activities.

The camp therefore functions as:
> persistent relationship context between missions.

Game Informer highlighted the camp and care systems as a major source of grounded realism rather than optional menu management. [R2-01](#r2-01)

### Limitation

The camp is highly authored:
- conversation schedules are finite;
- NPC autonomy is sophisticated staging rather than general human simulation;
- resources do not create a deep emergent production economy.

OpenLegend can take the social persistence while making work/needs more systemic.

## 5. Chores and mundane contribution

Camp chores include activities such as:
- carrying sacks;
- chopping wood;
- hauling water/hay;
- other maintenance.

They provide small Honor/Dead Eye/camp benefits and, more importantly, embody Arthur's role in the group.

These tasks are intentionally mundane.

### Design value

A community feels real when:
- someone has to do maintenance;
- contribution is visible;
- not every action is heroic.

Three Houses and RDR2 converge here:
> small routine actions can create attachment to place—but become tedious if the player must manually repeat them forever.

OpenLegend should permit delegation after meaning is established.

## 6. Horse ownership, bonding, and care

The horse is not a disposable GTA vehicle.

A primary horse has:
- breed;
- health/stamina;
- handling/speed characteristics;
- saddle/equipment;
- cleanliness/feeding state;
- **Bonding Level**.

Bonding increases through:
- riding;
- feeding;
- brushing;
- calming/patting;
- hitching/handling.

Higher bond improves:
- Health/Stamina;
- responsiveness;
- whistle range;
- maneuver options.

Rockstar developers described extensive animation, vocalization and behavior work to make horses feel like animals with mood and physicality rather than reskinned cars. [R2-03](#r2-03)

### Horse death

In Story Mode, a sufficiently injured horse can die permanently if not revived in time.

That can destroy:
- a high-bond companion;
- a familiar appearance/name;
- hours of care.

This is one of the game's strongest emergent attachment systems.

### OpenLegend lesson

Attachment emerges when an entity combines:
- useful capability;
- repeated care;
- persistence;
- vulnerability;
- history.

## 7. Weapon ownership, carrying, condition, and care

Arthur can own many guns, but typically carries:
- sidearms on body;
- limited long guns selected from the horse.

Weapons have:
- type;
- ammunition;
- condition;
- customization;
- engravings/metals;
- scopes/components.

Condition degrades and can be restored with gun oil/maintenance.

Ammunition variants create different tradeoffs.

### Important design effect

The horse acts as a **mobile inventory boundary**.

Arthur cannot instantaneously materialize every owned rifle from an abstract bag.

OpenLegend should use:
- body slots;
- carried containers;
- nearby storage;
- vehicles/animals

to make possession spatial.

## 8. Dead Eye: progression in perception and execution

Dead Eye returns as a player-time control system.

As story/progression advances it supports:
- slowed aiming;
- manual marking;
- critical-area visibility;
- improved execution.

It is replenished by Core/consumable systems.

Unlike an ordinary cooldown, Dead Eye is tied to:
- character progression;
- bodily state;
- Western gunslinger fantasy.

## 9. Hunting, tracking, and pelt quality

Hunting composes several systems:
- **Eagle Eye** tracking;
- tracks/sign;
- animal species;
- individual quality/star rating;
- appropriate weapon/ammunition;
- shot placement;
- carcass/pelt transport;
- trapper/Pearson crafting;
- economy.

A perfect animal can yield a poor pelt if killed incorrectly.

This transforms “kill creature” into:
> identify → track → approach → select tool → place shot → harvest → transport.

### Legendary animals

Legendary hunts create named/scarce encounters whose materials feed unique:
- outfits;
- trinkets/talismans;
- completion.

### OpenLegend lesson

Resource quality should depend on **process**, not just entity death.

## 10. Wildlife and ecology

The world includes hundreds of animal species/variants:
- predators;
- prey;
- birds;
- fish;
- livestock;
- scavengers.

Animals can:
- hunt/flee;
- feed/scavenge;
- fight;
- leave tracks;
- react to human presence.

Carcasses visibly decay over time and can attract scavengers.

### Boundary

This is impressive behavioral ecology, but not a fully persistent population simulation:
- killing a region's deer does not create a decades-long ecosystem collapse;
- most individual wild animals are not persistent identities.

OpenLegend can extend this toward:
- population;
- migration;
- predation;
- reproduction;
- scarcity.

## 11. Fishing, herbs, cooking, crafting, and survival activities

Arthur can:
- fish with bait/lures;
- gather herbs/plants;
- cook meat at campfires;
- craft ammunition/tonics/provisions;
- create small utility items;
- bring special materials to Trapper/Pearson/fence for gear/trinkets.

Crafting is modest compared with a survival game.

Its strongest feature is provenance:
- animal → pelt/material → specific crafted object.

That makes hunting matter beyond vendor money.

## 12. The satchel and bounded inventory

Arthur's satchel holds:
- provisions;
- tonics;
- materials;
- valuables;
- documents;
- ammunition-related items.

Pearson can craft upgraded satchels from appropriate perfect pelts, expanding capacity.

The resulting chain:
> hunt correct species well → improve carrying capacity → support future exploration.

This is a clean example of world activity improving a general capability.

## 13. Greet, Antagonize, Defuse, Rob: social verbs for strangers

RDR2 greatly expands ambient NPC interaction.

Arthur can often:
- greet;
- antagonize;
- defuse;
- rob;
- threaten;
- respond contextually.

Repeated choices can escalate:
- greeting chains become short conversations;
- antagonism becomes insult/fight/gunfight;
- robbery can become compliance/resistance/witness report.

NPCs comment on:
- Arthur's appearance;
- dirt/blood;
- prior local incidents;
- unusual clothing;
- reputation.

A highly helpful Steam review recounts a bar fight with the local barber followed by the sheriff, jail, and a later townsman referencing the previous fight—an excellent qualitative example of world-state continuity. [R2-04](#r2-04)

### Boundary

Do not infer every pedestrian has deep long-term memory.

Many reactions are:
- local;
- archetypal;
- authored/state-triggered.

The effect is convincing even without universal persistent cognition.

## 14. Witnesses, crime, law, bounties, and surrender

Crime can trigger a witness process:
1. someone sees/hears the act;
2. witness tries to report;
3. Arthur can threaten/stop them;
4. law searches/responds;
5. identified crimes produce bounty.

Masks can reduce civilian identification but are not magical invisibility against law enforcement.

Arthur can:
- flee;
- hide;
- surrender in some conditions;
- pay bounty;
- sometimes be arrested/jail.

### OpenLegend lesson

Law should be a **knowledge-propagation system**:
> event → observer → report → institution → response.

This is much richer than “illegal action sets wanted=true.”

## 15. Honor: behavior changes interpretation

Arthur's **Honor** changes through:
- helping people;
- camp/community contribution;
- mercy/violence choices;
- crime;
- story decisions.

Honor affects:
- prices/benefits;
- ambient reactions;
- mission/dialogue details;
- late-story emotional framing;
- ending variants.

Unlike a purely cosmetic morality meter, Honor feeds both world and narrative.

### Limitation

One scalar still collapses many moral dimensions.

OpenLegend should instead model:
- relationship-specific memory;
- faction reputation;
- public reputation;
- self-belief.

## 16. Strangers and multi-stage world relationships

Stranger missions can recur across chapters/regions.

Some people:
- reappear;
- remember Arthur;
- develop multi-step arcs;
- change over time.

Random roadside encounters can also pay forward:
- rescue a person;
- later encounter them in town;
- receive gratitude or a free store item.

This is a major improvement over one-shot random events.

### OpenLegend lesson

The strongest “random encounter” is one that becomes:
> persistent person + changed relationship + later consequence.

## 17. Towns, jobs, and low-stakes activities

Activities include:
- poker;
- blackjack;
- dominoes;
- five finger fillet;
- fishing;
- hunting;
- theater/shows;
- saloons;
- baths;
- hotels;
- barbers;
- shopping;
- gunsmithing;
- stagecoaches/trains.

Arthur can also participate in:
- bounties;
- robberies;
- debt collection;
- treasure hunts;
- challenges;
- collectibles.

The world supports **ordinary presence**, not only quest completion.

## 18. Challenges and progression through world feats

Challenge categories include:
- Bandit;
- Explorer;
- Gambler;
- Herbalist;
- Horseman;
- Master Hunter;
- Sharpshooter;
- Survivalist;
- Weapons Expert.

They ask the player to demonstrate behavior in the world.

Completion unlocks:
- equipment;
- progression toward special outfit/completion goals.

This is better evidence of mastery than an abstract “frontier XP” bar.

## 19. Traversal: horses, trains, coaches, fast travel, cinematic camera

Travel options include:
- horse;
- wagon;
- train;
- stagecoach;
- camp/other fast-travel unlocks;
- cinematic camera/road following.

Long rides are frequently accompanied by:
- conversations;
- music;
- encounters;
- environmental shifts.

The Guardian's review describes the game as largely being about **being somewhere**—hunting, fishing, riding and speaking around campfires between bursts of action. [R2-05](#r2-05)

### OpenLegend lesson

Travel should not always be collapsed into loading.

It can be:
- social time;
- planning;
- observation;
- danger;
- memory.

## 20. Mission structure: the central contradiction

The open world permits improvisation.

Many story missions demand:
- exact route;
- exact pacing;
- exact companion proximity;
- prescribed sequence.

PC Gamer's review summarizes this tension: a monumental open world “straining against stubborn mission design.” [R2-02](#r2-02)

### Why it matters for OpenLegend

Do not author goals as hidden choreography.

Prefer:
- desired world state;
- constraints;
- consequences.

An agent/player who solves the problem differently should usually still succeed.

## 21. Gang relationships and camp society

Major gang members include:
- Dutch;
- Hosea;
- John;
- Abigail;
- Sadie;
- Charles;
- Javier;
- Bill;
- Micah;
- Susan Grimshaw;
- Pearson;
- Uncle;
- others.

Arthur has:
- established history;
- role/status;
- personal tensions;
- mentor relationships.

Camp members:
- disagree;
- form subgroups;
- perform work;
- mourn;
- celebrate;
- criticize Arthur;
- undergo story changes.

There is no player-authored romance system.

The relationship depth is authored through:
- conversation;
- shared missions;
- camp activity;
- long history.

## 22. Story: community, loyalty, and the end of an outlaw world

**Spoiler-light:** Dutch's gang flees east after Blackwater, repeatedly attempting to finance an escape from encroaching law/modernity.

Arthur's arc increasingly asks:
- what does loyalty mean?
- when is a group no longer worthy of loyalty?
- what remains of a life built on violence?
- can one choose better action late?

The world and mechanics reinforce the themes:
- industrialization spreads;
- law becomes organized;
- indigenous and working-class communities are exploited;
- camp cohesion deteriorates.

### Major spoiler: succession

Arthur eventually dies.

The epilogue transfers control to **John Marston** and continues the world years later.

This deepens the RDR1 precedent:
> player identity can die while world history persists.

## 23. Art, animation, sound, and intentional slowness

RDR2's presentation is famous for:
- long bespoke interaction animations;
- physical object pickup;
- skinning;
- gun maintenance;
- mounting horses;
- doors/drawers;
- camp movement;
- volumetric weather/light;
- regional soundscapes.

The Guardian's production feature emphasizes that Rockstar wanted the world to feel as if it were living **without** the player. [R2-06](#r2-06)

### Tradeoff: embodiment versus friction

Current Steam reviews still divide around the same choice:
- fans call the slowness immersive;
- critics find looting, travel and animation laborious.

The game demonstrates:
> realism is valuable when it reinforces attention/meaning; it becomes friction when it repeats after the meaning is learned.

OpenLegend can automate repeated routine while preserving first-time embodiment.

## 24. Production scale and labor

The Guardian's 2018 production feature reports **more than 1,600 developers** contributed over roughly seven years, with hundreds working on interconnected systems needed for a convincing world. [R2-06](#r2-06)

A separate Guardian report discussed labor controversy after Dan Houser's “100-hour weeks” comment; Houser clarified that referred to himself and a small senior writing group during several periods, while Rockstar released aggregate studio-hour data showing lower averages but meaningful peak overtime for some employees. [R2-07](#r2-07)

These are attributed production facts, not evidence that crunch caused any particular mechanic.

### Product lesson

RDR2's fidelity was extraordinarily expensive.

OpenLegend should seek:
- simulation reuse;
- authored rules;
- generative variation

rather than assuming Rockstar-level manual content production is reproducible.

## 25. Distribution, marketing, and commercial context

RDR2 launched as a premium console blockbuster in 2018, then PC in 2019.

Marketing emphasized:
- Arthur/gang character trailers;
- long gameplay demonstrations;
- systemic world detail;
- enormous Rockstar pedigree.

Red Dead Online launched as the multiplayer component and later received a standalone purchase option.

### Sales

Take-Two's August 2026 investor materials list **Red Dead Redemption 2 at more than 87 million units sold-in worldwide**, with the broader Red Dead series near 116 million. [R2-08](#r2-08)

This is:
- sold-in units,
not:
- active players;
- Online revenue;
- unique current users.

The continued sales are extraordinary for a 2018 premium title.

## 26. Five substantive written reviews

### 1. Game Informer — Matt Bertz, October 25, 2018

**Praised:** camp/gang story, world vitality, horses, weapon care, emergent events and detail.

**Notable design judgment:** care systems that might sound annoying actually ground the experience for this reviewer. [R2-01](#r2-01)

### 2. The Guardian — Keza MacDonald, October 25, 2018

**Praised:** slow historical embodiment, characters, hunting/fishing, landscapes, camp life and “just being somewhere.”

The review treats pace as a defining strength rather than filler. [R2-05](#r2-05)

### 3. PC Gamer — James Davenport, November 15, 2019

**Praised:** world, Arthur, simulation, emergent incidents.

**Criticized:** rigid mission scripting and serious PC launch stability problems. [R2-02](#r2-02)

### 4. Destructoid — Chris Carter, October 28, 2018

**Praised:** world, horses, gunplay, random events and immersion.

**Criticized/qualified:** the deliberately slow structure and some control friction will not fit everyone. [R2-09](#r2-09)

### 5. GamesRadar+

**Praised:** story, characters, visual/world detail and its ability to generate anecdotes.

**Criticized:** extremely long duration, limited fast-travel convenience and an ending choice judged less daring than the preceding journey. [R2-10](#r2-10)

### Review synthesis

The reviews largely agree the world is exceptional.

The real disagreement:
> is deliberate physical slowness **immersion** or **friction**?

That is a design tradeoff, not a factual dispute.

## 27. Current Steam top/helpful player evidence

Steam is applicable and the current surface was sampled.

### Helpful positives

Top reviews repeatedly praise:
- Arthur;
- story;
- world detail;
- horse attachment;
- emergent roadside encounters;
- exploration.

A highly helpful review describes:
- fighting the local barber;
- being arrested;
- returning later;
- another NPC commenting on the fight.

That is exactly the kind of small continuity players interpret as a living world. [R2-04](#r2-04)

### Current criticism

Recent reviews commonly mention:
- intentionally slow pacing;
- cumbersome animations/controls;
- Rockstar launcher/PC technical friction;
- dissatisfaction with Red Dead Online support.

One helpful reviewer explicitly says they loved the story but found Online full of trolls. [R2-04](#r2-04)

### Interpretation

The same feature—high interaction friction—can be:
- the reason one player feels embodied;
- the reason another quits.

OpenLegend should expose automation/pace preferences without flattening world meaning.

## 28. Red Dead Online: a separate persistent game

Red Dead Online creates a custom frontier character.

Progression includes:
- rank;
- RDO$;
- Gold;
- weapons;
- horses;
- clothing;
- camp;
- Ability Cards;
- role progression.

Players share sessions and can:
- form **Posses**;
- do missions;
- hunt/fish;
- participate in events;
- fight or cooperate;
- operate role-specific businesses.

### Roles

Major Roles include:
- **Bounty Hunter** — capture/kill targets; Prestigious extension;
- **Trader** — hunt/supply Cripps' camp business and deliver goods;
- **Collector** — find/sell sets of valuables;
- **Moonshiner** — distillery/business + story missions;
- **Naturalist** — sample/study animals, work with Harriet/Gus systems.

Each creates a specialized progression track and gear.

### Camp and persistent ownership

Online camp becomes:
- mobile base;
- wardrobe/rest;
- Trader business locus;
- posse gathering point.

This is more player-economy-oriented than Story Mode's narrative gang camp.

## 29. Red Dead Online economy and monetization

Online uses:
- RDO$;
- **Gold** premium/earned currency;
- role unlock costs;
- rank-gated items;
- properties/business upgrades.

Gold can be:
- earned in play;
- purchased with real money.

The service therefore converts frontier activity into a long-tail economy unlike Story Mode.

### Current support state

As of 2026, Rockstar still rotates:
- role bonuses;
- featured series;
- discounted items;
- seasonal rewards.

Current reporting and official event feeds show regular monthly promotions rather than the large story/role expansion cadence of the earlier years. [R2-11](#r2-11)

This is **active service**, but not evidence of major expansion-level development.

## 30. Red Dead Online social benefits and failure modes

### Strong patterns

- Posse roles create cooperation.
- Trader deliveries create shared risk.
- Bounty targets encourage alive-capture coordination.
- Roles let players self-select professions.
- Camps create shared rendezvous points.

### Failure modes

- griefing in open sessions;
- economy/grind;
- sparse long-term major-content updates;
- high-value players exhausting progression.

Take-Two's CEO called Red Dead Online successful in 2026 even while players continue to criticize the reduced update cadence. Financial success and perceived abandonment can coexist.

## 31. Worked interactions

### A. Care turns a horse into a relationship

**Intent:** travel faster and safely.

**Actions:** feed → brush → ride → calm → survive danger together.

**Result:** Bonding rises, behavior/capability improves, player learns the specific horse.

**Consequence:** death matters because capability and history disappear.

### B. Witness system creates a social chase

**Intent:** rob someone outside town.

**Event:** passerby sees crime → begins reporting.

**Choices:** threaten, chase, kill, let them report.

**Result:** different moral/legal consequences.

**OpenLegend lesson:** law begins with perceived information.

### C. Perfect pelt requires the correct method

**Intent:** craft satchel upgrade.

**Conditions:** find required pristine species.

**Actions:** track → identify quality → choose appropriate weapon → clean kill → transport pelt.

**Result:** gathering is a knowledge/execution challenge.

### D. Stranger returns after help

**Intent:** assist someone in roadside event.

**Later:** meet them in town; they recognize Arthur and reciprocate.

**Result:** random content becomes a relationship history.

### E. Camp deterioration makes story spatial

**Early:** songs, meals, hope, supplies.

**Later:** arguments, absence, scarcity, distrust.

**Result:** the same camp system expresses narrative state without an exposition screen.

### F. Online Trader loop composes hunting and social risk

**Intent:** earn through Trader role.

**Actions:** hunt → donate materials → resupply → wait/produce goods → choose delivery.

**Result:** Story Mode hunting becomes a multiplayer business loop.

**Limit:** repeated economy optimization can flatten the original hunting fantasy into grind.

## 32. Transferable inspiration for OpenLegend

### A. Persistent social hubs should change with community state

Camp is the strongest reference:
- people;
- supplies;
- mood;
- work;
- relationships;
- narrative.

### B. Care + vulnerability creates attachment

Horses prove this without dialogue.

### C. Objects should have spatial ownership

Weapons live:
- on Arthur;
- on horse;
- in camp storage.

### D. Law should propagate through witnesses

This is a direct architecture inspiration.

### E. Mundane labor can establish belonging

Chores are meaningful before they become repetitive.

### F. Side encounters should become future state

Reappearing strangers are far stronger than disposable random-event rewards.

### G. NPC ambient behavior and deep cognition are separate

RDR2 achieves extraordinary aliveness with authored/state-driven behavior.

OpenLegend can combine that staging wisdom with actual memory/agency.

### H. Succession preserves meaning after death

Arthur → John extends the persistent-world lesson from RDR1.

## 33. Limits / do not copy automatically

### Do not simulate every hand movement

Animation fidelity is not the same as systemic depth.

### Do not make routine care mandatory forever

Allow delegation/automation once the relationship/skill meaning is established.

### Do not author invisible mission rails

World-state objectives should tolerate equivalent solutions.

### Do not use one Honor scalar for all morality

Memory and reputation should be multidimensional.

### Do not infer every ambient NPC has deep persistence

RDR2's illusion is excellent but bounded.

## 34. Requirement and preservation map

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2, 28 |
| R02 player actions / mechanics | §§2–23, 28–30 |
| R03 items / entities / composition | §§6–12 |
| R04 progression / economy / time | §§2–6, 15, 17–19, 28–30 |
| R05 concrete interactions | §31 |
| R06 people / AI / social / multiplayer | §§4–6, 13–16, 21, 28–30 |
| R07 art / audio / interface / feel | §§19, 23 |
| R08 story / narrative | §§4, 21–22 |
| R09 production | §24 |
| R10 marketing / distribution / virality | §25 |
| R11 commercial / participation | §§25, 29–30 |
| R12 reviews / player feedback | §§26–27, 30 |
| R13 inspiration / limits | §§32–33 |
| R14 sources / preservation / navigation | this section + Sources |

### Mechanics inventory

Covered:
- Arthur identity/body;
- Cores/needs/weight/weather;
- camp;
- horse bonding;
- weapons/condition;
- Dead Eye;
- hunting/tracking/pelts;
- wildlife;
- fishing/herbs/crafting;
- satchel/inventory;
- social NPC verbs;
- witnesses/law/bounty;
- honor;
- Stranger/random events;
- minigames/challenges;
- traversal;
- gang relationships;
- succession;
- RDO avatar/rank/currencies/roles/posses/camp/economy.

Absent/not major:
- player-authored romance;
- magic;
- class/job tree in Story Mode;
- settlement construction beyond camp upgrades;
- full persistent wild-animal population simulation.

### Preservation check

G70 was added as an independent roster subject because RDR2's camp, needs, horse bonding and NPC-world reaction systems are mechanically distinct from RDR1. No inherited full RDR2 dossier existed on this branch.

This pass preserves:
- Story Mode versus Online;
- original console versus 2019 PC;
- current 2026 Online event/service state;
- the absence of a verified native PS5/Xbox Series edition.

No current Online event is described as a major content expansion without evidence.

## Sources

<a id="r2-01"></a>**R2-01 — [Red Dead Redemption II Review: An Open-World Western for the Ages](https://gameinformer.com/review/red-dead-redemption-ii/an-open-world-western-for-the-ages).** Matt Bertz, Game Informer, October 25, 2018. Full review; camp, horse, care systems and world.

<a id="r2-02"></a>**R2-02 — [Red Dead Redemption 2 review](https://www.pcgamer.com/red-dead-redemption-2-review/).** James Davenport, PC Gamer, November 15, 2019. Full PC review; mission rigidity and launch stability.

<a id="r2-03"></a>**R2-03 — [All the pretty horses: how Red Dead Redemption 2's steeds were made](https://www.theguardian.com/games/2018/nov/22/how-rockstar-red-dead-redemption-2-horses-made).** Keza MacDonald, The Guardian, November 22, 2018. Developer interviews on horse animation/behavior and attachment.

<a id="r2-04"></a>**R2-04 — [Steam most-helpful reviews](https://steamcommunity.com/app/1174180/reviews/?browsefilter=toprated).** Current qualitative player sample; emergent continuity, horse/story attachment, and Online/griefing complaints.

<a id="r2-05"></a>**R2-05 — [Red Dead Redemption 2 review — gripping western is a near miracle](https://www.theguardian.com/games/2018/oct/25/red-dead-redemption-2-review-western-playstation-xbox-rockstar).** Keza MacDonald, The Guardian, October 25, 2018. Full review.

<a id="r2-06"></a>**R2-06 — [Get real! Behind the scenes of Red Dead Redemption 2](https://www.theguardian.com/games/2018/oct/24/get-real-behind-the-scenes-of-red-dead-redemption-2-the-most-realistic-video-game-ever-made).** The Guardian, October 24, 2018. Production/system-development feature; >1,600 staff and living-world goals.

<a id="r2-07"></a>**R2-07 — [Red Dead Redemption 2 was created by an industry in dire need of reform](https://www.theguardian.com/games/2018/nov/01/red-dead-redemption-2-games-developers-welfare).** Keza MacDonald, The Guardian, November 1, 2018. Attributed labor-hours/crunch reporting and Rockstar clarification/data.

<a id="r2-08"></a>**R2-08 — [GTA 5 passes 230m as RDR2 reaches 87m](https://rockstarreport.com/news/gta-5-sales-pass-230-million-rdr2-87-million).** Rockstar Report, August 8, 2026, citing Take-Two August 2026 investor materials. Current sold-in milestone; secondary route to primary presentation.

<a id="r2-09"></a>**R2-09 — [Review: Red Dead Redemption 2](https://www.destructoid.com/reviews/review-red-dead-redemption-2/).** Chris Carter, Destructoid, October 28, 2018. Full review.

<a id="r2-10"></a>**R2-10 — [Red Dead Redemption 2 review](https://www.gamesradar.com/red-dead-redemption-2-review/).** GamesRadar+, 2018. Full review.

<a id="r2-11"></a>**R2-11 — [Red Dead Online / Rockstar Newswire](https://www.rockstargames.com/newswire/tags/red-dead-online).** Rockstar current official event feed; used to establish continuing 2026 monthly rotations, not major-expansion cadence.

