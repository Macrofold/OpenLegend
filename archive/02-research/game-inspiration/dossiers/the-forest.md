# G137 — The Forest

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

The Forest is one of the clearest examples of a survival game whose horror works because **the enemies appear to be watching the player's behavior rather than merely waiting at spawn points**. Its resource, crafting and building systems are deliberately compact; the memorable tension comes from an authored peninsula where cutting trees, lighting fires, building walls and entering caves all make the player more capable while also changing how exposed and conspicuous they feel.

This dossier studies the **original The Forest**, not Sons of the Forest. The sequel reuses and expands many ideas but has different building, companions, weapons, AI and story rules.

## R01 — identity, release/edition boundaries and player promise

Endnight Games released The Forest into Steam Early Access in May 2014 and moved it to full **v1.0 on April 30, 2018** after roughly four years of public development. The PlayStation 4 version released November 6, 2018. The full PC game also received a free VR mode, initially released in beta in May 2018 and later updated through September 2019.

[Endnight v1.0](https://endnightgames.com/updates/v10?page=1) · [Endnight PS4 release history](https://endnightgames.com/updates/v10-release-date?page=1) · [Steam](https://store.steampowered.com/app/242760/).

The premise is authored and immediate: Eric LeBlanc survives a passenger-plane crash on a forested peninsula; his son Timmy is taken; the player must survive, explore and decide how directly to pursue him.

The gameplay promise is unusually flexible for a horror game:
- hunt/forage/cook;
- build shelters or huge forts;
- explore beaches, camps and caves;
- fight or avoid cannibals/mutants;
- craft/upgrade equipment;
- follow story clues;
- play solo or cooperatively.

Endnight's current game page describes a world where trees/plants can be chopped down and an enemy society has "beliefs, families and morals." That phrasing is a product/design claim, not proof of human-level simulation. [Endnight game page](https://endnightgames.com/games/the-forest).

### Current preservation state

The original is now a mature, effectively feature-frozen product. Endnight's update archive shows:
- PC v1.10 content update in December 2018;
- PC v1.11 in January 2019;
- VR v1.12/Index-controller update in September 2019;
- PS4 fixes through early 2019.

No 2026 original-game content update was located. Steam remains active and highly reviewed, but current franchise development belongs to Sons of the Forest.

### VR boundary

The free PC VR version is the **full original game** with VR-specific inventory/HUD/motion-control changes. Endnight added VR multiplayer support in June 2018. VR interaction should not be projected back onto the standard mouse/controller interface. [v1.0/VR announcement](https://endnightgames.com/updates/v10?page=1).

### Sequel boundary

Sons of the Forest is a separate G138 subject. Kelvin/Virginia companions, free-form log placement, firearms, GPS markers and sequel enemy/story rules are **not** original The Forest mechanics.

## R02 — player actions and major mechanics

### Hidden/use-based character stats — audit correction

The initial dossier incorrectly said the original game had no attribute progression. The final game has several **player stats**, but they are not a point-buy/class system:

- **Strength** increases melee damage. Its system was substantially reworked before release around exercise and nutrition/calories; the v1.0 rules make ordinary-mode calories more forgiving, while Hard Survival exposes the full calorie/weight relationship.
- **Athleticism** improves endurance by reducing stamina drain for sprinting/swimming and increases underwater breath capacity; v1.0 also makes higher Athleticism slightly increase run speed.
- **Sanity** rises/falls in response to activities such as cave time, cannibalism, rest/music and normal food. In the shipped game it does **not** create a broad hallucination/mental-health simulation; its verified mechanical consequence is tied to access to player effigies.
- **Weight/calories** are primarily a **Hard Survival** system in v1.0: calories, exercise, strength and weight interact, while the ordinary game hides/relaxes much of that bookkeeping.

The Survival Guide's Stats page exposes these values/trends. This is a valuable distinction: The Forest has **practice/behavior-shaped attributes without XP levels, perks or spendable stat points**. [Athleticism](https://theforest.fandom.com/wiki/Athleticism) · [Stats](https://theforest.fandom.com/wiki/Stats) · [v1.0 changes](https://theforest.fandom.com/wiki/V1.0).

The maintained wiki's Sanity/Effigy pages disagree on the exact final unlock threshold (the v1.0 changelog says the Effigy page appears below 50% Sanity, while a current Sanity page states under 90%). This dossier therefore records only the reliable relationship—**low sanity gates player-effigy access**—rather than inventing one uncontested threshold. [Sanity](https://theforest.fandom.com/wiki/Sanity).

### Survival state

The player manages:
- health;
- stamina/energy;
- hunger;
- thirst;
- cold/wetness;
- armor;
- injuries/poison/illness-like status as applicable.

Food comes from animals, fish, plants, scavenged snacks and cooked/dried meat. Water can come from suitable sources and player-made rain collectors; unsafe food/water can punish careless survival choices.

The stats layer also includes distinct conditions such as **Infection/Sickness/Cold** under applicable circumstances. Community-maintained final-version documentation records Infection as capable of reducing Strength until cleaned/treated, while sickness can reduce the benefit gained from food. These are bounded status systems rather than DayZ-style full medical simulation. [Stats](https://theforest.fandom.com/wiki/Stats).

The system is not a medical simulation like DayZ. It is readable enough to keep horror/exploration moving.

### Hunting, gathering and ecological extraction

Players:
- chop trees for logs;
- gather sticks/rocks/leaves;
- collect plants/berries;
- hunt rabbits, deer, lizards and other wildlife;
- spear/catch fish;
- take shells/skins/meat;
- scavenge suitcases, camps and caves.

Trees are especially important because large structures consume many logs. GameSpot's 2018 review emphasizes a visible consequence: clearing forest around a base changes sightlines and the physical character of the area.

### Inventory and crafting mat

The inventory is a physical tarp-style layout rather than a grid of numbered slots. Crafting is performed by placing compatible items on the central crafting mat and combining them.

Examples include:
- crafted axe/spear/bow;
- arrows;
- molotovs/bombs;
- rope;
- upgraded sticks/spears;
- medicine/energy items;
- pouches/bags;
- armor;
- weapon upgrades.

The interface encourages experimentation while also exposing recipes through learned hints/Survival Guide support.

### Equipment progression through exploration

There is **no XP level ladder or perk tree**. Progression comes from:
- player knowledge;
- crafted capability;
- cave/world equipment;
- base/storage;
- story access items.

Notable world-found tools/weapons include:
- modern axe;
- climbing axe;
- rebreather;
- chainsaw;
- katana;
- flare gun;
- modern bow/crossbow in later content;
- keycards/story tools;
- pistol parts.

Many high-value tools are in caves, so the game ties mechanical advancement to horror exploration.

### Armor

Armor is layered through wearable pieces rather than a traditional RPG chest-slot progression. Examples include:
- lizard-skin/stealth-oriented protection;
- bone armor;
- creepy armor from mutants;
- warmsuit for cold protection.

The useful pattern is contextual preparation: "best armor" can depend on whether the problem is combat, cold or stealth.

### Combat

Combat uses:
- melee axes/spears/clubs/katana;
- bows/crossbow;
- thrown spears;
- molotovs/bombs;
- flare gun and later weapons;
- blocking;
- fire/poison effects;
- traps.

Weapon speed, damage, range and stamina matter. Launch reviewers praised enemy fear more than combat precision; Destructoid specifically found exploitable AI cases such as striking enemies from rocks/heights.

### Practical stealth

Stealth comes from:
- crouching/cover;
- darkness;
- vegetation;
- quieter movement;
- stealth armor;
- avoiding visible/noisy camp behavior.

There is no Assassin's Creed-style detection meter that fully explains enemy state. Uncertainty is part of the horror.

### Building through blueprints

The Survival Guide contains structures from the beginning. The player places a **blueprint ghost**, then carries required materials to complete it.

Buildables include:
- basic/temporary shelters;
- log cabins;
- custom foundations/floors/walls/roofs;
- defensive walls/gates;
- storage/racks;
- fires;
- water collectors;
- drying racks;
- gardens;
- animal traps;
- bridges/platforms/treehouses;
- ziplines;
- rafts/houseboats;
- traps and defensive devices;
- decorative/utility structures.

Custom building lets players define footprints/segments rather than use only fixed prefab cabins.

Unlike 7 Days to Die, The Forest is **not primarily a load-bearing structural-collapse simulation**. Structures can be damaged/destroyed, trees can be cut from under tree structures, and placement dependencies matter, but the central building challenge is resources, geometry and enemy attack rather than mass/support calculation.

### Traps

The building system supports both food capture and enemy defense:
- animal/fish traps;
- deadfall;
- Happy Birthday trap;
- noose;
- rope swing;
- incendiary/explosive traps.

The official community wiki documents an important social-AI detail: trapped cannibals can be freed by allies in some cases, so traps interact with group behavior rather than functioning as isolated damage tiles. [Building/traps](https://theforest.fandom.com/wiki/Building).

### Fires and visibility

Fires provide:
- warmth;
- cooking;
- light.

Large fires/bonfires also make a base visually conspicuous and can attract trouble. This is one of the game's strongest survival-horror tradeoffs: the same object that makes darkness safe can tell the forest where the player is.

### Cannibal and mutant AI

Enemy behavior is The Forest's signature mechanic.

Reviewers describe cannibals who:
- patrol;
- observe from distance;
- circle;
- feint;
- retreat;
- return with others;
- climb trees;
- attack bases;
- react differently across encounters.

Game Informer and GameSpot both praise their unpredictability. The enemies do **not** simply aggro on sight every time.

The system has limits:
- AI can get stuck;
- height/geometry can be exploited;
- multiplayer makes groups easier to overwhelm;
- exact "reputation/aggression" formulas are not exposed cleanly enough to treat every community theory as fact.

The safe conclusion is behavioral diversity and escalation, not a claim that every tree cut increments a hidden moral score.

### Mutant escalation

As time/story activity progresses, more dangerous mutant types can emerge, including grotesque multi-limbed enemies. Surface life therefore becomes less predictable even after the player has solved basic food/shelter.

### Caves

Caves are hand-authored horror spaces with:
- darkness;
- ropes/vertical transitions;
- flooded sections;
- enemies;
- corpses;
- story evidence;
- unique tools/weapons;
- passages connecting areas.

The surface is a survival sandbox; caves are closer to authored survival-horror dungeons.

This split is one of the game's most successful structures: building gives security, caves deliberately remove it.

### Story exploration

The player gathers:
- photos;
- drawings;
- videotapes/camcorder evidence;
- keycards;
- passenger clues;
- environmental scenes.

Narrative progress is spatial rather than quest-log driven.

### Death/capture

A first defeat to cannibals can result in the player waking/captured in a cave rather than immediately hard-resetting. Subsequent/deeper failure behavior depends on mode/state; saves and shelters determine recovery.

This supports horror fiction: "losing" can move the player to a dangerous narrative location.

### Peaceful/Creative/Hard Survival boundaries

The game offers difficulty/mode variants, including Peaceful and harder survival settings. Enemy aggression, survival pressure and building damage can differ.

A Peaceful experience demonstrates that the gathering/building/exploration systems can function independently of ordinary cannibal combat, although story-mutant exceptions/endgame context require version/mode nuance.

### Cooperative multiplayer

PC supports online/LAN co-op and Endnight advertises play with up to 8 friends. Building/resources/story progress can be shared, and players can revive/help each other.

Critics note an important experiential tradeoff: co-op makes the game funny/social and can improve construction scale, but **reduces loneliness/fear**. Push Square and Game Informer both call this out.

There is no native competitive PvP progression loop comparable to Rust; co-op survival is the intended multiplayer identity.

## R03 — items, entities and composition

### Resource families

- logs/sticks/rocks/leaves;
- rope/cloth;
- animal skins/shells/bones;
- food/plants;
- booze/soda/snacks;
- medicine;
- circuit boards/coins/electronics;
- cave/story items.

The resource set is intentionally smaller than ARK/Conan. Game Informer praised that building largely reuses comprehensible material families instead of demanding dozens of specialized ores.

### Weapon upgrades

Some weapons can be upgraded by attaching crafted materials such as teeth/feathers/cloth under the game's upgrade rules, trading damage/speed or adding effects.

This makes scavenged materials affect a favorite tool rather than only unlock replacements.

### Effigies and sanity-linked intimidation

Player-built effigies use cannibal body parts plus ordinary building resources and, when available/lit, can sometimes make cannibals hesitate or flee. Their effect is deliberately unreliable and does not work as a universal "fear turret," especially against mutants. The v1.0 changelog explicitly makes the Effigy book page conditional on low Sanity.

This creates a small but thematically important loop:
combat/cannibalism/cave behavior can reduce Sanity → low Sanity exposes grotesque effigy construction → enemy corpses become intimidation materials.

The mechanic should be treated narrowly. Sanity otherwise has little verified gameplay effect in the final game, and community sources conflict over its exact threshold. [v1.0](https://theforest.fandom.com/wiki/V1.0) · [Sanity](https://theforest.fandom.com/wiki/Sanity) · [Building/Effigies](https://theforest.fandom.com/wiki/Building).

### Bodies as resources

Cannibal bodies can be:
- moved;
- burned for bones/skulls;
- dismembered;
- used in grisly crafting/effigies.

This is mechanically and tonally important: horror imagery is part of the resource economy.

### Storage

Log holders, stick/rock racks, drying racks and other structures externalize inventory into the base. The player therefore sees accumulated labor as world objects rather than a central chest UI only.

### Important absences

There are:
- no classes;
- no attributes/perk tree;
- no magic/spells;
- no merchant/currency economy;
- no recruitable NPC companions;
- no faction reputation UI;
- no colony-management job scheduler.

The game stays focused on survival/horror/building/story.

## R04 — progression, economy and time

### Progression is knowledge + equipment + place

A new player and veteran can have identical avatar stats but very different capability because the veteran knows:
- cave entrances;
- safe food/water routes;
- high-value tool locations;
- cannibal patrol patterns;
- building layouts;
- story progression;
- which fights to avoid.

That makes **world knowledge** a major progression vector.

### Day/night

Night changes:
- visibility;
- temperature;
- enemy perception/psychology;
- cave/surface risk.

A base with walls, fire and stored food turns night from existential threat into operational inconvenience—but late mutants can challenge that comfort.

### No conventional economy

There are no NPC shops or universal currency. Value is:
- calories/water;
- logs;
- cloth/rope;
- medicine;
- ammunition;
- cave tools;
- safe shelter;
- information.

### Failure and save loop

Shelters provide save/sleep functions. Death/capture can create recovery problems but there is no account-wide roguelike unlock economy.

### Endgame and postgame

**Story spoilers:** deeper cave/lab exploration reveals Sahara Therapeutics, the resurrection artifact, Timmy's fate and the cause of the crash cycle.

The final choice can produce different endings. v1.0 reworked the endgame and added an alternate ending. Choosing to remain on the peninsula supports postgame continuation; later content includes an endgame artifact interaction that can alter enemy behavior under applicable conditions.

The important design point is that the sandbox has a **real authored ending** without requiring the player to stop building.

## R05 — worked interactions and concrete situations

### Case 1 — chopping trees changes both safety and exposure

**Intention:** build a defensive cabin/stockade.  
**Conditions:** dense trees provide logs and visual cover.  
**Actions:** clear nearby forest and haul logs.  
**Interaction:** building capability increases while sightlines around the camp open.  
**Result:** the player gains stronger shelter but creates a more conspicuous human scar in the landscape.  
**Next decision:** continue fortifying or preserve vegetation as concealment.

### Case 2 — a bonfire solves cold/darkness and advertises the camp

**Intention:** survive a cold night and cook.  
**Conditions:** player is wet/cold with limited visibility.  
**Actions:** build/light fire.  
**Interaction:** warmth/light improve survival but create visible activity.  
**Result:** the same safety object can increase encounter risk.  
**Lesson:** one system can carry opposite incentives.

### Case 3 — an enemy watches instead of attacking

**Intention:** return to camp without escalating conflict.  
**Conditions:** a cannibal patrol notices the player.  
**Actions:** observe distance/behavior instead of immediately charging.  
**Interaction:** AI may circle, vocalize, retreat or return with others.  
**Result:** uncertainty becomes the encounter; combat is only one outcome.  
**Review evidence:** GameSpot/Game Informer both explicitly praise this unpredictability.

### Case 4 — a trap turns base geometry into combat

**Intention:** defend a gate from repeated raids.  
**Conditions:** enemies approach through a likely route.  
**Actions:** place deadfall/Happy Birthday/noose-style traps with safe player paths.  
**Interaction:** building placement predicts enemy movement.  
**Result:** architecture performs combat before the player swings a weapon.  
**Limit:** traps can hurt the player and some trapped cannibals can receive help from allies.

### Case 5 — the modern axe is an exploration reward and production multiplier

**Intention:** improve both combat and log gathering.  
**Conditions:** player knows or discovers the relevant cave route.  
**Actions:** descend into hostile darkness, obtain the tool, survive return.  
**Interaction:** horror exploration unlocks better everyday labor.  
**Result:** one cave expedition changes future building efficiency.  
**Lesson:** a dungeon reward can improve peaceful systems.

### Case 6 — rebreather/climbing gear converts inaccessible cave geometry

**Intention:** reach deeper story/tool areas.  
**Conditions:** flooded/vertical cave sections block ordinary traversal.  
**Actions:** obtain specialized gear elsewhere, return and pass the gate.  
**Interaction:** equipment creates **world access**, not merely stat improvement.  
**Result:** earlier locations gain new meaning when tools are acquired.

### Case 7 — drying meat turns hunting into expedition preparation

**Intention:** spend long periods underground.  
**Conditions:** fresh meat would spoil and caves have limited renewable food.  
**Actions:** hunt, dry meat, fill waterskin/prepare supplies.  
**Interaction:** home production extends exploration range.  
**Result:** survival infrastructure becomes dungeon preparation.

### Case 8 — co-op changes horror without changing map content

**Intention:** explore a cave with friends.  
**Conditions:** same enemies/space, multiple players.  
**Actions:** share light, revive/cover, joke/communicate, carry more gear.  
**Interaction:** social presence reduces uncertainty/loneliness and raises combat capacity.  
**Result:** identical cave geometry becomes a different genre tone.  
**Review evidence:** Game Informer/Push Square describe this fear-reduction directly.

### Case 9 — first defeat can become narrative displacement

**Intention:** survive an early cannibal attack.  
**Conditions:** player loses.  
**Actions:** awaken captured in cave under relevant state rather than simply respawn at home.  
**Interaction:** failure moves the player deeper into the world’s mystery.  
**Result:** death-like failure can create exploration/story instead of only subtraction.

### Case 10 — ordinary actions slowly change the survivor

**Intention:** become more capable without finding a new tool.  
**Conditions:** the player spends many days running/swimming/fighting while maintaining enough food.  
**Actions:** ordinary movement/combat/nutrition gradually increase Athleticism and/or Strength under the applicable mode rules.  
**Interaction:** repeated embodied actions change future stamina use, breath/run performance and melee damage without XP allocation.  
**Result:** the character itself remembers how the player has lived.  
**Limit:** the nutrition/weight side is much more explicit in Hard Survival, and exact formulas are poorly communicated in-world.

### Case 11 — low sanity unlocks a disturbing defensive option

**Intention:** discourage ordinary cannibals around a camp.  
**Conditions:** Sanity has fallen enough for the effigy pages to become available and the player has enemy body parts/sticks/rocks.  
**Actions:** construct and light an effigy.  
**Interaction:** a psychological/stat condition changes the building vocabulary, and corpse resources become social signaling.  
**Result:** some cannibals may hesitate/flee rather than attack immediately.  
**Limit:** the effect is unreliable, mutants ignore it, and final-version sources conflict on the precise sanity threshold.

### Case 12 — a physical body becomes crafting material

**Intention:** obtain bone armor/materials.  
**Conditions:** cannibal corpse exists.  
**Actions:** transport/burn/dismember under current crafting needs.  
**Interaction:** combat aftermath feeds survival economy and horror imagery.  
**Result:** enemies remain mechanically relevant after death.  
**Limit:** grotesque transgression is theme-specific and not a generic crafting recommendation.

## R06 — AI, social systems and multiplayer

### Cannibal society as perceived simulation

Endnight's design language emphasizes enemies with social behavior. Players/reviewers observe:
- patrols;
- group movement;
- watching;
- reinforcements;
- fear/feints;
- tree climbing;
- base attacks;
- different visual groups/types.

The game succeeds because the player **cannot fully reduce them to one aggro rule**.

That does not mean each cannibal has a persistent biography/family tree. The system should be learned at the behavioral layer actually evidenced.

### Mutants

Later grotesque mutants trade ambiguity for direct physical threat. Their emergence prevents the enemy ecology from remaining a solved "tribal patrol" pattern.

### Animals

Animals are mostly resource/prey ecology rather than complex agents.

### Multiplayer

Co-op shares:
- construction labor;
- combat;
- exploration;
- survival resources.

There is no matchmaking role/class composition or persistent guild economy.

## R07 — art, audio, interface and feel

The Forest's strongest aesthetic contrast is **beautiful Pacific Northwest-like forest versus body horror**.

### Visual language

- lush daylight vegetation;
- realistic tree cutting/log hauling;
- beaches/lakes;
- small camps;
- dark cave voids;
- hanging corpses;
- grotesque mutants;
- industrial/lab spaces late in story.

The transition from natural survival to engineered horror supports the narrative reveal.

### Audio

Game Informer especially praises sound: a leaf crunch can be squirrel or cannibal. Vocalizations, footsteps, tree/fall sounds and cave echoes make listening strategic.

### Interface

The Survival Guide provides construction templates and objectives without a conventional quest arrow.

The tarp inventory is diegetic/physical-looking but can become cumbersome with many objects.

### VR

VR's wrist/HUD and 3D inventory make object handling more embodied, but that interaction model is its own mode.

## R08 — narrative and play

The Forest is unusual among survival sandboxes because the authored mystery is genuinely important.

**Spoiler-light premise:** Eric searches for Timmy, follows evidence from other passengers and discovers that the peninsula's violence is connected to hidden technological experimentation.

**Major spoilers:** Sahara Therapeutics' resurrection artifact requires a child sacrifice; Timmy was used and dies; Eric can choose to repeat the cycle by causing another plane crash to save him, or refuse and remain on the peninsula.

The narrative is discovered through:
- caves;
- corpses;
- photos/drawings;
- tapes;
- labs;
- equipment gates.

This connects directly to mechanics because the player needs survival mastery to reach story spaces.

### Narrative versus sandbox

The main objective is urgent in fiction but mechanically patient: the player can spend months building while Timmy waits.

That ludonarrative mismatch is common in open survival games, but The Forest benefits because exploration/building still feels like plausible preparation.

## R09 — production and development

Endnight began with a **core team of roughly four people**, using freelancers/outside contributors. Early interviews identify team members with film/VFX backgrounds, including work on projects such as Tron: Legacy and 300. [Interview archive](https://theforest.fandom.com/wiki/Interviews).

The team chose a public alpha partly to get player testing/feedback at a scale a tiny studio could not provide internally.

### Early Access

Development lasted about four years in Early Access. Systems and content were added continuously:
- co-op;
- caves/story;
- custom building;
- enemy AI work;
- survival tuning;
- dedicated-server work;
- VR;
- endgame.

Endnight's v1.0 note explicitly thanks the player community and describes the game as something the team and players "made together." [v1.0](https://endnightgames.com/updates/v10?page=1).

### Small-team advantage

Post-launch interviews say the team deliberately remained small because fast decisions and hands-on ownership fit their development style. The commercial success later funded a sequel rather than turning The Forest itself into an endless service.

### Last updates

v1.10 in December 2018 added:
- crossbow;
- hang glider-related/buildable content;
- new monsters;
- more structures;
- graphics/anti-cheat fixes.

VR/PS4 stability work continued into 2019.

## R10 — marketing, distribution and virality

The Forest's first trailer/visual premise generated unusually strong interest before alpha. Its marketing advantages were:
- a clear plane-crash premise;
- beautiful forest imagery;
- unnerving humanoid enemies;
- survival building;
- YouTube/Twitch-friendly emergent horror;
- affordable Early Access pricing;
- co-op;
- later PS4 launch;
- VR.

The game is highly streamable because enemy behavior produces unscripted scares and because bases are visible creative artifacts.

Its most shareable unit is often **"what did the cannibals do?"**, not merely "look at my loot."

## R11 — commercial and participation context

Endnight's 2018 press release reported:
- **5.3 million PC copies sold** by November 2018;
- an initial development budget of about **$125,000**;
- the milestone was reached before/around the PS4 launch.

[Game Developer report](https://www.gamedeveloper.com/game-platforms/horror-survival-game-i-the-forest-i-has-sold-over-5-3-million-copies) · [DSOGaming](https://www.dsogaming.com/news/first-person-horror-survival-game-the-forest-has-sold-more-than-five-million-copies/).

The $125k figure is an **initial budget**, not total four-year development cost. Multiplying unit count by list price would not yield net profit because discounts, platform cuts, taxes, refunds and post-launch costs are missing.

Current Steam shows an enormous review corpus and continued in-game population, but current players/concurrent counts are dynamic rather than a lifetime metric.

The game is a one-time paid title with no battle pass or live item shop.

## R12 — reception and current player evidence

### 1. Game Informer — Javy Gwaltney, May 14, 2018 — 9/10

[Full review](https://gameinformer.com/games/the_forest/b/pc/archive/2018/05/14/a-gruesome-champion.aspx).

Game Informer praises the integration of survival, story and horror. Building is satisfying because resource categories are understandable, caves reward exploration, and cannibal AI remains unpredictable. It criticizes exploitable/awkward AI cases but calls the total experience a triumph.

### 2. GameSpot — Alessandro Barbosa, June 2, 2018 — 8/10

[Full review](https://www.gamespot.com/reviews/the-forest-review-are-you-afraid-of-the-dark/1900-6416922/).

GameSpot especially values cannibal behavior: staring, feints, retreats and later attacks. It praises the balance between hunter-gatherer survival, construction, escalating enemies and story discovery.

### 3. Destructoid — Dan Roemer, May 10, 2018 — 9/10

[Full review](https://www.destructoid.com/reviews/review-the-forest/).

Destructoid calls the survival-horror fusion exceptional and praises environmental storytelling. Its largest criticism is enemy combat AI that can sometimes be cheesed through geometry/height.

### 4. Push Square — Rebecca Stow, November 15, 2018 — 8/10

[Full review](https://www.pushsquare.com/reviews/ps4/forest).

Push Square praises eerie atmosphere, unpredictable cannibals and player freedom. It notes story simplicity/repetition and explicitly observes that large co-op groups reduce the fear of being hunted alone.

### 5. PlayStation Universe — John-Paul Jones, June 27, 2019 — 9.5/10

[Full review](https://www.psu.com/reviews/the-forest-ps4/).

PSU sees the game as a highly polished survival-horror blend on PS4, praising the persistent cooperative structures and terror of exploration. Its technical judgment is platform/date-specific.

### Historical Early Access contrast — PC Gamer

[PC Gamer's 2014 alpha review](https://www.pcgamer.com/the-forest-alpha-review/) found the premise promising but extremely janky/limited. It is useful production evidence for how far the public-alpha build traveled, not a 2018 score.

### Current Steam sampling — September 2026

Steam currently shows **Overwhelmingly Positive English reviews** and Very Positive recent reviews. [Store](https://store.steampowered.com/app/242760/) · [current review surface](https://steamcommunity.com/app/242760/reviews/).

September 2026 helpful/recent posts remain overwhelmingly affectionate, often:
- praising the game as an all-time survival favorite;
- joking about cannibals/mutants;
- recommending co-op;
- treating its roughness/age as acceptable.

Current negatives are much rarer but include players who find the systems repetitive, dated or insufficiently rewarding if they do not enjoy horror/exploration.

This is qualitative evidence. The very high Steam percentage is current aggregate sentiment, while the individual samples explain *why* some players still return.

### Reception synthesis

**Praised**
- unpredictable enemies;
- atmosphere/audio;
- story woven into exploration;
- caves;
- compact survival loop;
- useful base building/traps;
- co-op;
- strong horror identity.

**Criticized**
- occasional AI stupidity/geometry exploits;
- combat roughness;
- repetitive resource hauling;
- story urgency versus sandbox pacing;
- co-op reducing horror;
- older interface/technical roughness.

The game succeeded by being **less broad than many survival competitors and more coherent**.

## R13 — transferable inspiration and limits

### 1. Ambiguous AI can be scarier than stronger AI

An enemy who watches, circles and retreats creates more interpretation than a predictable high-damage attacker.

**Lesson:** perceived intention can matter more than raw combat sophistication.  
**Limit:** ambiguity must be backed by enough real behavioral variance; otherwise players discover the trick.

### 2. A smaller resource vocabulary can improve building flow

Logs/sticks/rocks/cloth support many structures without dozens of refinery chains.

**Lesson:** expressive construction does not require industrial complexity.

### 3. Tools can unlock geography

Rebreather/climbing axe/keycard are more interesting than +10% damage because they change where the player can go.

### 4. Home and dungeon can have opposite emotional roles

Surface building creates ownership/safety; caves remove certainty and deliver progression.

**Potential OpenLegend pattern:** safe authored places can make dangerous exploration more meaningful.  
**Limit:** if home becomes completely safe, world pressure disappears.

### 5. Failure can relocate the player into fiction

Capture-to-cave turns defeat into a new state rather than a pure reload.

**Lesson:** nonterminal failure can create content.

### 6. Visibility should be bidirectional

Fires/walls/cleared trees help the player and can make them easier to find.

**Lesson:** environmental changes should affect others' perception, not only player stats.

### 7. Co-op changes genre tone

Adding another human is not merely "+1 combat power"; it changes fear, attention and humor.

**OpenLegend implication:** multiplayer design should account for emotional consequences of shared presence.

### 8. Authored story can coexist with sandbox pacing

The Forest has a real mystery/ending without forcing the player down it.

**Limit:** fictional urgency suffers when building has no narrative time cost.

### 9. Enemy bodies can carry thematic mechanics

Burning bodies for bone armor makes the player's survival increasingly morally grotesque.

**Lesson:** resource systems can express theme.  
**Limit:** transgressive material should be world-specific, not abstracted as neutral "corpse resource" design.

## R14 — sources, preservation, navigation and requirement map

### Preservation result

G137 was added in the September 27 survival expansion. Existing game/mechanics/dossier owners and packet-derived references were checked; no prior dedicated The Forest owner existed.

This dossier does not use Sons of the Forest mechanics to fill gaps. The sequel is G138.

The original seven-file packet predates G137 and its separate packet-wide P01 reconciliation remains pending.

### Primary/current sources

- **Endnight — [The Forest game page](https://endnightgames.com/games/the-forest), accessed September 27, 2026.** Current official premise, up-to-8-friends language and enemy-design framing.
- **Endnight — [v1.0](https://endnightgames.com/updates/v10?page=1), April 30, 2018.** Full release, endgame/warmsuit/cave changes and VR plan.
- **Endnight — [release/update archive](https://endnightgames.com/updates/v10-release-date?page=1).** PS4/VR/patch chronology.
- **Endnight — [release plans](https://endnightgames.com/updates/v073-and-release-plans?page=1), February 2018.** Early Access→1.0 scope and multiplayer/save/performance priorities.
- **Endnight — [updates archive](https://endnightgames.com/updates?page=2).**
- **PlayStation Blog / Endnight — [PS4 launch article](https://blog.playstation.com/2018/08/29/the-forest-launches-november-6-on-ps4/).** Primary creative-freedom statement.
- **Official community wiki — [Building](https://theforest.fandom.com/wiki/Building), [Mechanics](https://theforest.fandom.com/wiki/Mechanics), [Enemies](https://theforest.fandom.com/wiki/Enemies), accessed September 27, 2026.** Detailed current/final-build mechanics; community-maintained, so used for operational relationships rather than developer intent.
- **Official community wiki — [Athleticism](https://theforest.fandom.com/wiki/Athleticism), [Stats](https://theforest.fandom.com/wiki/Stats), [Calories](https://theforest.fandom.com/wiki/Calories), [Weight](https://theforest.fandom.com/wiki/Weight), [Sanity](https://theforest.fandom.com/wiki/Sanity), accessed September 27, 2026.** Follow-up evidence correcting the initial "no attributes" statement and distinguishing ordinary from Hard Survival nutrition/weight rules.
- **Official community wiki — [v1.0 changelog](https://theforest.fandom.com/wiki/V1.0).** Preserved final-release evidence for Athleticism/run-speed changes, Hard-Survival calorie presentation and the sanity-conditioned effigy page; used to expose, not conceal, the threshold conflict in later community pages.
- **Interview archive — [Endnight interviews](https://theforest.fandom.com/wiki/Interviews).** Secondary-preserved developer interviews; access limitations/translation caveats retained.

### Production/commercial sources

- **Game Developer — [5.3m copies](https://www.gamedeveloper.com/game-platforms/horror-survival-game-i-the-forest-i-has-sold-over-5-3-million-copies), November 2018.** Reports Endnight press-release figures and initial budget.
- **GamingBolt — [Endnight interview](https://gamingbolt.com/the-forest-interview-talking-about-influences-multiplayer-plans-for-the-future-and-more), November 5, 2018.** Developer interview about small-team development/multiplayer/PS4.

### Independent reviews

- **Game Informer — [review](https://gameinformer.com/games/the_forest/b/pc/archive/2018/05/14/a-gruesome-champion.aspx).**
- **GameSpot — [review](https://www.gamespot.com/reviews/the-forest-review-are-you-afraid-of-the-dark/1900-6416922/).**
- **Destructoid — [review](https://www.destructoid.com/reviews/review-the-forest/).**
- **Push Square — [PS4 review](https://www.pushsquare.com/reviews/ps4/forest).**
- **PlayStation Universe — [PS4 review](https://www.psu.com/reviews/the-forest-ps4/).**
- **PC Gamer — [2014 alpha review](https://www.pcgamer.com/the-forest-alpha-review/).** Historical Early Access comparison, not counted as final review.

### Current player evidence

- **Steam — [store](https://store.steampowered.com/app/242760/) and [reviews](https://steamcommunity.com/app/242760/reviews/), accessed September 27, 2026.** Current sentiment and direct testimony; dynamic/self-selected.

### Recommended reading route

1. Read GameSpot and Game Informer first: both explain the enemy behavior that makes the game distinctive.
2. Read Endnight v1.0 and the 2014 PC Gamer alpha review together to see four years of Early Access transformation.
3. Review the Building/traps reference to understand how compact resources generate many defensive options.
4. Read Push Square alongside solo-focused reviews for the co-op/fear tradeoff.
5. Sample current Steam reviews to see how strongly the original still holds up after its sequel.
6. Treat the story/endgame section as spoiler-heavy; mechanics researchers can stop before R08 if preserving the mystery.

No video scene/timestamp is represented as watched.

### R01–R14 map

| Requirement | Covered in |
| --- | --- |
| R01 identity/scope/version | R01 |
| R02 actions/major mechanics | R02 |
| R03 items/entities/composition | R03 |
| R04 progression/economy/time | R04 |
| R05 concrete situations | R05, twelve cases |
| R06 people/AI/social/multiplayer | R06 |
| R07 art/audio/interface/feel | R07 |
| R08 story/narrative/play | R08 |
| R09 production/development | R09 |
| R10 marketing/distribution/virality | R10 |
| R11 commercial/participation | R11 |
| R12 reception/player feedback | R12, five final reviews + current Steam |
| R13 inspiration/limits | R13 |
| R14 sources/routes/preservation | R14 |

### Explicit mechanics-inventory closure

Fixed protagonist rather than a class creator; **use/behavior-shaped Strength and Athleticism plus Sanity, with Hard-Survival calorie/weight rules**, but no XP levels, perk tree or spendable attribute points; items/inventory/weapons/armor/upgrades; crafting and blueprint-based construction including sanity-linked effigies; no magic; walking/swimming/climbing cave ropes/rafts/ziplines/hang-glider-era traversal; harvestable/choppable environment; hunting/fishing/gardening/cooking; combat/practical stealth/traps; scavenging/cave loot; death/capture/save recovery; no currency/trade economy; authored story/endings; no romance/recruitable companions; cannibal/mutant AI and social-looking patrol behavior; fixed peninsula/cave world; story/cave encounters rather than quest log; extensive base construction/storage/defense; solo/online/LAN co-op/VR boundaries; and postgame/building/exploration loops are covered above.

**Research boundary:** the original game is effectively feature-frozen and its final behavior is much less version-volatile than the preceding G131–G136 subjects. Exact enemy AI formulas remain partially opaque; observed/reviewed behaviors are kept distinct from unverified community theories about hidden aggression/reputation variables.

### Follow-up audit — September 27, 2026

The second pass found one **material factual error** in the initial mechanics closure: The Forest does have character stats/progression. Strength and Athleticism improve through behavior/nutrition rather than point allocation, while Sanity and Hard-Survival calories/weight add narrower state/progression rules. The audit also adds the sanity→effigy relationship and distinct infection/sickness status effects. Final-version sources disagree on the exact effigy Sanity threshold, so the disagreement is preserved instead of choosing an unsupported number.
