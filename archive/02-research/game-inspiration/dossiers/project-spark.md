# Project Spark — full research dossier

**G14 · Complete research pass, September 26, 2026.** Project Spark is treated as the released Xbox One / Windows 8.1 creation platform, not the cancelled Xbox 360 version and not as a generic name for Kodu. This pass separates its launch-era free-to-play economy from the October 2015 all-content-free transition and from the August 2016 online-service shutdown. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Project Spark is especially relevant to OpenLegend because it exposed a compact **behavior grammar** to ordinary players: attach a brain to an object, describe **WHEN** a condition is true and **DO** an action, then compose those rules into enemies, companions, quests, cameras, UI, vehicles, progression and entirely different game genres. Its history is equally useful because the creation grammar, discovery system, monetization model and service lifetime were all separate product problems.

Project Spark's 2014 launch, October 2015 transition to completely free content and August 2016 online closure are different product states. Historical instructions below do not imply a new user can download the original service today. Named characters and assets are reference examples, not OpenLegend assets proposed for copying.

**The player promise:** make a small adventure while playing **Crossroads**, follow the authored **Champions Quest**, try community creations, or shape a world and its behavior directly. The first session need not begin with programming. A player's later purpose might be mastering a Champion, making an amusing toy, finishing a game or learning how someone else's creation works. [PS04](#ps04) [PS08](#ps08)

The numbered sections provide the full mechanics and reception survey. Detailed studies within them preserve additional worked interactions, production accounts and evidence limits; dated patch and platform qualifications apply to the historical overviews. Source annotations retain the access limits recorded by each research pass.

## 1. Identity and player promise

Team Dakota / Microsoft Studios positioned Project Spark as a free game-creation platform whose core loop was **create, play, share and remix**. It formally launched October 7, 2014 on Xbox One and Windows 8.1 after a public beta. The Xbox 360 edition was announced earlier but never released. [PS30](#ps30) [PS31](#ps31) [PS32](#ps32)

A player could approach it in at least four ways:

1. **Play first-party experiences**, including Crossroads adventures, Champions Quest / Void Storm and later Conker's Big Reunion.
2. **Play community creations**, ranging from small platformers and shooters to puzzle games, racers, pinball-like games, machinima and reusable asset packs.
3. **Create or prototype from scratch**, sculpting terrain, placing props/characters and programming their behavior.
4. **Remix**, opening another creator's shared work, inspecting its logic and making a derivative while retaining lineage/credit.

That final mode matters. Project Spark did not only let a player see that a healer worked; the player could open the healer's **brain** and learn how it worked.

### Platform boundary

The shipped release was Xbox One and Windows 8.1/PC. Cloud saving allowed a project to move between PC and Xbox One, and the system translated standard controls between mouse/keyboard and controller. Kinect on Xbox One could record body animation and voice for use in creations. [PS33](#ps33)

Many historical databases still list Xbox 360 because Microsoft announced it in 2013. Contemporary launch reporting stopped naming that build, and later release databases mark it cancelled. Do not describe Project Spark as a shipped Xbox 360 game. [PS32](#ps32)

<a id="2-the-supplied-world-was-meant-as-a-starting-point-not-compulsory-canon"></a>
<a id="study-2"></a>

### Detailed study 2: The supplied world was meant as a starting point, not compulsory canon

In Dean Takahashi's February 2014 interview, **Henry Sterchi** describes influences extending beyond Minecraft to construction toys, **Pinball Construction Set** and **The Incredible Machine**. The team wanted users to create both places and their rules. Champions supplied partial backstories, while visual details—such as goblins carrying makeshift defensive equipment—suggested character without fixing every story. [PS03](#ps03)

**Interpretation:** authored identity can reduce the blank-page problem without requiring every creator to tell the same tale. A recognizable person or object gives the player something to reinterpret. The underlying tool remains different from an autonomous storyteller: expressive motion does not prove a character can revise beliefs or invent a new plan.

The interview's Xbox 360 and future-feature discussion belongs to its prerelease date; it does not establish delivery. The published launch route was Xbox One and Windows 8.1. [PS04](#ps04) Cross-device content access must also be distinguished from simultaneous cross-platform play; [the cooperation study](#study-10) makes that boundary explicit.

## 2. Creating a world: terrain is an editable system, not a fixed map

The world editor begins with a three-dimensional canvas. Creators can raise/lower terrain, carve valleys/caves, build mountains, paint terrain materials/biomes and populate the resulting space with props, vegetation, characters and effects. Props can be translated, rotated and scaled rather than remaining fixed to a snap grid. [PS34](#ps34) [PS35](#ps35)

The useful design pattern is **progressive formalization**:
- a beginner can first shape a visually interesting place;
- templates can supply a playable third-person character and camera;
- then the creator can open individual brains and replace defaults;
- eventually the same visual object can become a door, enemy, machine, quest giver, score counter or physics toy.

This creates an important difference between **world appearance** and **world law**. A rock is not inherently a quest objective, destructible object or cover object. Its brain and the rules of nearby systems give it that role.

### Crossroads: play while authoring

**Crossroads** was a guided adventure generator intended to prevent the empty-canvas problem. The player made choices while moving through an emerging adventure—terrain theme, paths, encounters, objectives and other elements—then could open the result in the editor and continue refining it. Team Dakota explicitly described it as letting newcomers “play as they create.” [PS33](#ps33) [PS36](#ps36)

This is a particularly strong precedent for OpenLegend's world agent: creation does not have to start with a schema editor. A player can express decisions inside an immediately playable context and only later inspect the underlying construction.

**Limitation:** scaffolding can also narrow imagination. Reviewers noted that many early creations looked or played similarly because creators naturally began from the same fantasy assets, cameras and action-game templates. [PS37](#ps37) [PS38](#ps38)

<a id="6-crossroads-connects-authorship-with-an-immediate-adventure"></a>
<a id="study-6"></a>

### Detailed study 6: Crossroads connects authorship with an immediate adventure

Paul Acevedo's March 2014 hands-on account starts with choices about environment and time of day, followed by a hero and a hometown organized around a selected landmark. The player explores and talks to generated townspeople, then makes further choices about the adventure. Offered alternatives can be rerolled; this is a bounded menu of authored possibilities, not unconstrained natural-language world generation. [PS08](#ps08)

The historical community guide adds concrete spatial decisions: place the village, choose its threatened centerpiece, locate the enemy destination and connect them with a path. It reports that poor paths can produce inaccessible objectives or underground spawns, while an automatic route can avoid some problems. Those are historical author reports, not independently reproduced defects or proof every generated route fails. [PS09](#ps09)

**Constructed situation:** a player wants a dramatic approach across difficult terrain. They place the destination and draw a route, then discover the character cannot traverse it. The next useful choice is to repair the route or choose a more reliable layout—not to declare the quest completed because the story sounded coherent. The author and the adventurer need different feedback about the same landscape.

**Interpretation:** Crossroads reduces the distance between a design choice and experiencing its consequence. It also constrains the design space enough to supply a beginning, route and objective. The limitation is that selecting an unusual-looking village does not guarantee an unusual strategic problem. Variety needs to change an action, commitment or decision, not only a menu label.

Microsoft's achievement guide confirms that Crossroads dialogue can be edited during the conversation. [PS04](#ps04) **Constructed contrast:** changing a villager's words can make a personal joke, but it does not independently change what the quest accepts as success. Authored speech and implemented behavior remain different layers.

## 3. Kode: every object can have a visible brain

Project Spark's behavior system evolved from Microsoft's Kodu ideas. A prop or character can have a **brain** made from lines of Kode. Each rule follows a visual grammar:

> **WHEN** condition / sensor / event → **DO** action

Rules are evaluated repeatedly, in order. Conditions and actions can be modified by additional tiles, and more complex behavior can be composed from multiple rules, pages and object relationships. [PS39](#ps39)

Examples of the grammar include:
- WHEN the player is near → DO follow player;
- WHEN health is below a threshold → DO heal;
- WHEN controller button is pressed → DO attack or jump;
- WHEN hit by an enemy → DO subtract health;
- WHEN a counter reaches a value → DO open a gate;
- WHEN a particular team is sensed → DO attack;
- WHEN a variable changes → DO update UI or switch state.

The key advantage is **inspectability**. A creator can look at the actual rule sequence instead of merely receiving a black-box “enemy AI” label.

### Preconfigured brains are reusable behavior packages

Project Spark shipped preconfigured brains so a creator could turn a newly placed character into something useful without authoring every rule. GameSpot's 2013 hands-on example starts from a follower/healer brain, then changes the healing condition to trigger below 75% health, assigns teams, and records a Kinect animation for the heal. [PS40](#ps40)

That example contains several important composition principles:

1. **Behavior template:** start with a functional role.
2. **Parameterization:** change a threshold rather than rewrite the role.
3. **Identity/presentation:** attach a custom animation/voice.
4. **Faction/team rule:** specify whom the actor treats as an ally/enemy.
5. **Immediate test:** watch the resulting behavior and revise.

For OpenLegend, that is a good model for an invention family. “Healer” should not require one hard-coded NPC class; it can be a reusable policy plus world-valid capabilities and parameters.

<a id="1-objects-acquire-behavior-through-a-readable-conditional-vocabulary"></a>
<a id="study-1"></a>

### Detailed study 1: Objects acquire behavior through a readable conditional vocabulary

In Jonathan Deesing's December 2014 review, creating a level means shaping a three-dimensional scene, placing objects and giving them **Brains**. A Brain's **Kode** connects **WHEN** conditions with **DO** effects. The critic's own example ends a level when the character touches a designated tree. Existing object behavior can be copied and inspected, and tile descriptions help explain what it does. [PS01](#ps01)

**Interpretation:** the tree is useful because it participates in an actual completion condition, not because its description calls it an exit. Reusing an object also need not mean inheriting every old intention. A different condition can make the same familiar prop a checkpoint, objective or hazard, provided the corresponding effect is implemented.

**Constructed counterexample:** a player reaches an object that looks like the destination, but the author wired a different condition. Better scenery cannot repair that mismatch. The goal, available interaction and completion rule must agree. A creator who can test immediately has a better chance of discovering the problem before another person encounters it.

A contemporary DigitalChumps review illustrates another distinction: an input tile alone is not necessarily a one-shot event. Its jump example requires the appropriate **pressed** modifier to achieve the intended one-jump-per-press behavior. The **Brain Gallery** supplies editable starting behaviors such as a third-person adventure, side-scroller or enemy. [PS02](#ps02)

**Interpretation:** a low-code interface removes syntax work but does not remove semantics. Continuous state, a newly occurring event and an unconditional rule are different. Templates can make a first character useful while leaving that distinction available to inspect and change.

## 4. Object interactions and environment interactions

Project Spark did not promise one universal chemistry simulation. Instead, creators could make environmental interactions by combining Kode rules, physics and object properties.

Examples supported by the toolset and contemporary demonstrations include:
- a trigger volume or proximity rule starting an encounter;
- a creature detecting teams and choosing whom to attack;
- an object growing when a controller input or damage event occurs;
- player health causing another actor to heal;
- switches/counters opening paths;
- moving/rotating/scaling objects during play;
- projectiles and melee attacks changing health;
- day/night or world settings being driven by logic;
- custom cameras and controls enabling first-person, side-scrolling or top-down play;
- Kinect-recorded animations firing as consequences of game state. [PS36](#ps36) [PS40](#ps40) [PS41](#ps41)

### Constructed OpenLegend-relevant example

A wooden barricade could have:
- WHEN struck by fire-tagged damage → DO increase burn counter;
- WHEN burn counter is above threshold → DO swap material/effect and drain health;
- WHEN health reaches zero → DO remove barricade and trigger path-open state.

A different creator could make visually similar wood inert. Project Spark therefore demonstrates **composable interaction**, not globally consistent material law.

OpenLegend's opportunity is to preserve the composability while making world-level material or status semantics reusable across inventions so that “wood burns” need not be re-authored independently in every scene.

<a id="8-terrain-objects-and-control-can-become-an-invented-capability"></a>
<a id="study-8"></a>

### Detailed study 8: Terrain, objects and control can become an invented capability

Project Spark's practical creation loop combines terrain manipulation, object placement, behavior editing and immediate testing. Kevin VanOrd's 2013 hands-on preview describes painting a landscape, altering its terrain and changing a character template after discovering the initial control arrangement did not fit his intended action game. [PS12](#ps12)

**Interpretation:** choosing a control model is a design decision, not merely the skin of an otherwise identical game. A usable environment must support the chosen body's movement and the camera that lets the player understand it. A landscape can be impressive from the editor and awkward at ground level.

#### An actual shared Brain turns movement into land creation

The community-authored **3rd-Person Land Creator** gives the player terrain-raising/removal controls and a throwable **Wooden Barrel** that paints the area where it lands. Its published Kode uses separate pages and configurable values. The author explicitly warns that unconstrained raising can carry a character outside the allowed world and proposes limits or temporary terrain as alternatives. [PS13](#ps13)

**Constructed scenario:** raise a path toward an otherwise inaccessible ledge, then decide whether that power should remain permanent, consume a resource or expire. Those are proposed design variants, not all automatically present in the shared Brain. Unlimited creation can erase the traversal problem it was intended to make interesting. A limit tied to the actual world boundary is also different from a mysterious refusal after the player is already stranded.

**Interpretation:** the interesting reusable artifact is not a picture of an earth mage. It is a working relationship among input, target location, terrain change and the actor's continued ability to move. Even a compact system needs a meaningful failure boundary.

The author's broader Brain index separates native examples from community contributions and offers movement, camera, combat, picking-up, teleporting and other behavior families. [PS14](#ps14) **Interpretation:** a library is useful when its pieces are inspectable and can be tried in a known situation. A list of dramatic ability names is weaker than a working example with constraints.

## 5. Characters, Champions and player identity

Project Spark had no single universal RPG character-creation system for every user-made game. Creators could build arbitrary controllable characters and expose their own stats/rules. The platform itself nevertheless supplied **Champions**—first-party playable archetypes with authored combat kits and level progression.

Prominent Champions included:
- **Scarlett**, a ranged/ranger-style character;
- **Haakon**, a melee knight;
- **Avalon**, a druid/magic-oriented character;
- later characters and licensed content such as **Conker**.

The 2014 Champions update made leveling a distinct progression system. Levels could unlock skills, visual variants, clothing, weapons and other content usable in Create mode. Community references document a cap of level 20 for the original Champion progression, while contemporary Microsoft material confirms a level-20 Champion achievement. [PS42](#ps42) [PS43](#ps43)

This is separate from creator/player account progression. A person could therefore be:
- advancing a Champion inside supported gameplay;
- leveling their Project Spark profile to earn creator currency/unlocks;
- authoring a custom game with an entirely different progression model.

Keeping those three concepts distinct prevents a common research mistake: Project Spark did not impose Scarlett's or Haakon's leveling rules on every user-created character.

<a id="7-champions-give-a-small-action-vocabulary-room-to-develop"></a>
<a id="study-7"></a>

### Detailed study 7: Champions give a small action vocabulary room to develop

The original manual describes Champions gaining levels through Crossroads and user-created games. Their core vocabulary combines attacks, a defensive action and jumping, but the named systems differ. [PS10](#ps10)

| Champion | Distinctive documented interaction |
| --- | --- |
| **Karlsnor** | Attacking or taking damage builds Rage; transformation enables stronger actions and later recovery opportunities. |
| **Scarlett** | **Kodite Caltrops** can become ammunition for a charged **Barrage**, while a decoy redirects enemies. |
| **Haakon** | Uninterrupted attacks summon **Sir Sigurd**; blocking develops the Spirit used by further abilities. |
| **Avalon** | **Nature Chambers** support healing and alter later attacks; a full-resource dodge can leave a **Sprout Turret**. |
| **Seph** | Casting develops Arcane Power toward **Overflow**, which changes attacks and mobility. |

These are the manual's qualitative interactions, not a claim that every character was available at initial launch or every exact balance value remained unchanged. [PS10](#ps10)

**Constructed Scarlett decision:** use the environment around a prepared trap as a fighting position, then decide whether its later use as attack material is more valuable than leaving it in place. Preparation becomes an input to another action rather than a separate cosmetic effect. The best choice depends on which enemies remain and where they can approach.

**Constructed Haakon contrast:** repeatedly attack for an uninterrupted sequence or defend to obtain a different advantage. A system that rewards aggression and one that rewards timely defense can make the same basic controls serve different intentions. Taking a hit is not interchangeable with merely losing a few health points when it interrupts the desired sequence.

**Interpretation:** progression matters when a familiar action acquires another relationship. A new level can make positioning, setup or timing valuable in a new way. This is a more useful reference than merely multiplying the number of collectible characters.

#### Champions Quest: an authored destination within the platform

**Premise spoilers.** **Void Storm** is an authored action adventure about protecting a world threatened by corruption. Its achievement objectives include collecting Rune Stones, using a Monolith to cleanse a village and confronting a Corrupted Goblin Chieftain. The reference also distinguishes Kodite collection, treasure chests and using environmental **Spark Interactables** from simply defeating enemies. [PS11](#ps11)

The official guide describes a specific **Avalon's Wellspring** detour behind a waterfall when playing the relevant chapter as Avalon. [PS04](#ps04)

**Constructed choice:** revisit with a different Champion to discover a character-dependent route, or continue pursuing the main confrontation with the current one. A place can be familiar yet offer a different useful possibility because of who is present. That does not establish a universally reactive world in which every inhabitant recognizes every past deed.

**Interpretation:** a fixed campaign provides something to finish and a reference for what the tools can produce. An example campaign that mainly demonstrates buttons, however, can underperform as a game. Its value to an aspiring creator and its appeal to someone wanting an adventure should be assessed separately.

## 6. Skills, abilities, classes and tech trees

There was no universal class tree for all creations. The platform offered three layers:

### A. First-party Champion progression

Champions acquired abilities and cosmetic/equipment unlocks with level. Historical community documentation shows concrete ability gates—for example Avalon unlocking specialized attacks/turret-like abilities at specific levels, and Haakon gaining movement/area attacks and spear-related interactions. [PS43](#ps43)

### B. Creator-defined progression

Kode could implement:
- XP counters;
- skill unlock flags;
- ability cooldowns;
- resource meters;
- level thresholds;
- class-selection menus;
- branching state machines;
- equipment restrictions.

A creator was not forced into one skill-tree UI or one stat formula.

### C. Creator/account unlock progression at launch

The original free-to-play model also gated some creation assets behind player level, credits or paid tokens. That was not a fictional skill tree; it was a platform economy layered on the editor. Some player reviews strongly disliked having the currency to buy an asset while still being blocked by a creator-level requirement. [PS44](#ps44)

**OpenLegend lesson:** never confuse *learning progression* with *capability entitlement*. A player becoming better at using an invention system can be satisfying; withholding the basic grammar needed to express an idea can feel arbitrary.

## 7. Items, weapons, armor and equipment

Project Spark's item model was **asset- and author-defined**, not a universal inventory schema. The content library included characters, weapons, environmental props, sounds, visual effects, animations and themed packs. Creators could:
- place an item directly in a world;
- attach a brain to make it pickable/interactive;
- make a weapon drive attack logic;
- track possession with Kode state;
- build an inventory/equipment interface;
- save reusable object configurations for other creations.

First-party Champions supplied more conventional authored weapons/clothing unlocks. Licensed packs such as Conker added hundreds of themed assets for both play and Create mode. [PS45](#ps45)

At launch, content ownership affected remixing and creation. A level containing premium pieces could expose dependencies that a remixer did not own. This made the *asset catalog* part of the platform's economics, not just the world's fiction. [PS37](#ps37) [PS38](#ps38)

### Loot

There was no one platform-wide loot table. A creator could implement:
- enemy drops;
- pickups;
- currency;
- score rewards;
- keys;
- equipment rarity;
- random rewards

through Kode and assets. First-party action content used more conventional combat rewards/progression, but it should not be generalized into a required Project Spark mechanic.

## 8. Magic, powers and effects

Likewise, there was no global spell system. A creator could build a spell from:
- controller/event input;
- resource/condition;
- target selection;
- projectile/emitter or direct effect;
- health/status modification;
- animation;
- particles/sound;
- cooldown/counter.

Champions offered examples of packaged powers, such as Avalon's druidic abilities or Haakon's supernatural companion/spear attacks, but these were authored content built on the broader creation system rather than the only allowed magic ontology. [PS43](#ps43)

This is directly relevant to OpenLegend's invention philosophy: the engine can define safe primitives and world-valid effect families while individual worlds define “spell,” “technology,” “psionics,” or “ritual.”

## 9. Combat system

The platform's default assets/templates favored third-person action, which influenced many early creations. Reviewers repeatedly saw action-adventure games because movement, camera and combat templates made that genre the lowest-friction starting point. [PS37](#ps37) [PS38](#ps38)

Combat could involve:
- melee or ranged attacks;
- health/damage rules;
- teams/factions;
- attack detection/range;
- AI pursuit/flee/follow logic;
- special Champion abilities;
- score/reward logic;
- custom animation;
- encounter triggers;
- boss or wave states.

Creators could change camera/control rules enough to produce first-person shooters, 2D platformers, racers and other genres, demonstrating that “combat system” was not a fixed runtime subsystem exposed identically to every creation. [PS38](#ps38) [PS46](#ps46)

### Performance constraint

WorthPlaying's review reported pauses in Team Dakota's own Void Storm when enemies died and degradation in some object-heavy community creations. The exact bottleneck was not instrumented in that review, so it would be incorrect to attribute it to a particular engine subsystem. The useful lesson is simply that *expressive creation needs understandable runtime budgets*, not only permissive authoring. [PS38](#ps38)

## 10. NPCs and AI

NPC behavior was primarily **authored finite logic**, not open-ended cognition.

A creator could use:
- team affiliation;
- proximity/target conditions;
- follow/flee;
- health thresholds;
- timers;
- state/pages;
- attack rules;
- dialogue/camera/UI triggers;
- path/movement behaviors;
- custom recorded animations and voice.

The GameSpot healer example is useful because the companion's “intelligence” is legible: follow, inspect player health, heal under a threshold, play the custom action. [PS40](#ps40)

A Guardian review described the system as allowing creators to set enemy intelligence levels and configure interactions through menus, sliders and brains. [PS47](#ps47)

**OpenLegend distinction:** Project Spark shows the benefit of inspectable behavioral programs, but OpenLegend's living actors aim to have persistent identity, memory, plans and bounded autonomous cognition. A WHEN/DO policy can still be valuable as a **native capability/policy layer** underneath that cognition.

<a id="9-a-helpers-policy-and-performance-are-separate-creative-choices"></a>
<a id="study-9"></a>

### Detailed study 9: A helper's policy and performance are separate creative choices

VanOrd's preview supplies an unusually concrete experiment. He gives a warrior a **follower-healer** Brain, sets a healing condition, and records a pose and voice through Kinect to accompany the action. The helper follows and heals as intended, while the captured performance looks awkward. He also changes team assignments so goblins and fighters oppose one another. [PS12](#ps12)

**Interpretation:** usefulness, allegiance and expressive character are separable. A reliable helper can still look emotionally unconvincing, and an expressive animation does not establish a useful policy. The world becomes more interesting when the observed behavior supports the identity being presented, rather than when either layer merely becomes more elaborate.

A later, postlaunch **Game Informer Test Chamber** specifically describes recording animations with Kinect. That corroborates delivery of capture rather than treating the 2013 demonstration as the sole evidence of a shipped feature. Its video was not watched in full for this research. [PS15](#ps15)

VanOrd also experiments with a button that enlarges a yeti and strengthens its attack, then recognizes the unfinished problem of restoring normal size and damage. [PS12](#ps12) **Interpretation:** adding a dramatic state is easier than defining its complete lifecycle. The valuable next question is what happens when it ends, repeats or overlaps another action.

These are authored conditions and performances, not evidence of language-model cognition, open-ended social memory or self-originating goals. A designer can make an ally feel particular without claiming the engine simulates a complete person.

## 11. Quests, dialogue and narrative

Creators could build quests through:
- Crossroads scaffolding;
- trigger conditions;
- objective counters;
- dialogue/cutscene presentation;
- state variables;
- encounter completion;
- branching rules;
- multiple worlds/linked experiences where supported by content/entitlements.

Crossroads let a player generate an adventure while making choices instead of starting from a blank authoring UI. Reviews and previews describe it as a route into quests and missions, while the normal editor allowed much more granular behavior. [PS33](#ps33) [PS36](#ps36)

### Champions Quest / Void Storm

First-party Champions Quest content provided a more conventional authored action-adventure demonstration. WorthPlaying described Void Storm as a multi-level adventure and alternate tutorial: players select among leveling heroes, fight and solve familiar puzzles, but the reviewer found the action functional rather than especially deep. [PS38](#ps38)

### Conker's Big Reunion

In April 2015 Team Dakota released **Conker's Big Reunion**, an approximately hour-long first episode built with the same Project Spark tools available to users. It was accompanied by a Conker Creation/Builder pack containing hundreds of characters, props, terrain, effects, sounds and other assets. Microsoft also seeded selected community creators with those assets; launch day included ten community-made Conker experiences, including a four-player arena and recreated scenes. [PS45](#ps45) [PS48](#ps48)

Game Informer reported positively on the resulting voice work, familiar characters and tone. Only the first planned episode shipped before the platform's later change of direction/shutdown. [PS49](#ps49)

This is a strong platform demonstration pattern: **ship a polished first-party experience using the same public primitives**, then release its components so creators can recombine them.

<a id="11-conker-supplied-both-an-authored-episode-and-a-reusable-palette"></a>
<a id="study-11"></a>

### Detailed study 11: Conker supplied both an authored episode and a reusable palette

**Conker's Big Reunion: Episode 1** arrived in April 2015 as a Project Spark experience, not a standalone replacement for **Conker's Bad Fur Day**. Its action-platforming and adult comic tone sat alongside an asset pack; early community access produced several additional creations, including a multiplayer arena and a homage. [PS20](#ps20)

**Premise spoilers.** Conker is trying to reconnect with old friends at the **Cock and Plucker**. Developer comments describe collaboration with **Rare** on original assets, music and tone, with **Chris Seavor** returning to the voice. Later episodes were canceled as Project Spark ceased new DLC production. [PS21](#ps21) [PS07](#ps07)

**Interpretation:** a recognizable character can give the platform a concrete invitation. It also imports expectations about tone, movement and what constitutes a satisfying continuation. Being able to place a beloved character in a scene is not the same as delivering the game that fans imagined.

#### A small asset pair exposes a complete interaction

The published Conker pack list distinguishes **Pickup – Cash Wad** from **Display Money Count**, which reports the collected amount. It also includes a **Disco Ball** with rotation, effects and music, and a simplified **Glide Fighter** Brain. [PS22](#ps22)

**Constructed choice:** build a collecting game with both the pickup operation and understandable feedback, rather than merely scatter attractive currency objects. The count then needs a purpose: a purchase, gate, score or self-chosen collection goal. Those are proposed uses, not automatic features of every cash pickup. A complete small mechanic connects occurrence, stored consequence and what the player can understand afterward.

The campaign's listed achievements describe stealth inside a barrel, money for a bar tab and interactions with TNT fuses. [PS11](#ps11) **Interpretation:** the same object vocabulary can support evasion, comedy and practical timing rather than only direct attack. Those are episode-specific authored uses, not a universal promise that every prop supports every plausible action.

## 12. Multiplayer, collaboration and social creation

Microsoft announced and shipped multiplayer creation/play capabilities on Xbox One. Contemporary review coverage describes online collaborative editing: two creators could edit/playtest together and move directly between testing and editing without rebuilding a session. E3 messaging described support for up to four players in play and create modes. [PS38](#ps38) [PS50](#ps50)

Community-created multiplayer games included competitive arenas and other custom modes. Multiplayer rules themselves could still be authored through Kode; the platform did not require every creation to be cooperative or competitive.

### Sharing and remix lineage

Shared creations could be downloaded and remixed. Project Spark tracked contribution/lineage information so derivative work could retain attribution. Later update notes/community documentation describe contribution values used to distribute download-related rewards among contributors. [PS42](#ps42)

This makes provenance a gameplay-platform primitive rather than a legal footnote.

**OpenLegend lesson:** if an invention imports another invention's mechanic, provenance should remain inspectable through composition. Otherwise debugging, compatibility, permissions and creator recognition all become harder.

<a id="10-human-cooperation-and-sharing-require-precise-boundaries"></a>
<a id="study-10"></a>

### Detailed study 10: Human cooperation and sharing require precise boundaries

A November 2014 **PalmettoBling** guide describes joining **Void Storm** with a second local controller at Champion selection. It notes that some character-specific achievement credit belongs to the primary controller. Another February 2016 account describes rejoining and the costs of glitches. These are direct historical player reports, not a new multiplayer test. [PS16](#ps16)

**Constructed implication:** two people may help finish the same fight without receiving identical persistent credit. A group invitation needs to explain what each person gains and what happens if someone leaves. Cooperative presence, shared success and ownership of progression are separate contracts.

Brent Botsford's 2015 review describes cooperative creation as a way to divide environment-building and event-scripting work. [PS17](#ps17) **Interpretation:** the social pleasure can be jointly making an artifact rather than defeating the same enemy. It still requires people to communicate intentions and resolve disagreements; a second cursor does not automatically solve collaboration.

**Platform limit:** September 2015 reporting explicitly says the PC version still lacked multiplayer and quotes its developers treating that feature as a distant possibility. Xbox One support therefore must not be copied onto the PC feature list merely because creations and entitlements crossed platforms. [PS18](#ps18)

**Evidence boundary:** contemporary promotional and review descriptions vary in how precisely they distinguish local play, online collaboration and simultaneous cross-device play. This pass established local Xbox cooperation, reported cooperative creation and the historical PC limitation. It did not independently reconstruct every retired network-session rule; generic retailer multiplayer labels and an old future-feature announcement are not treated as proof. The official online service is closed, irrespective of those historical distinctions.

#### Remixing is not editing someone else's published original

The official manual's **Lineage** view identifies contributing creators; its older remix rule requires owning the ingredients used by a world. [PS10](#ps10) Gamer's December 2014 firsthand account explicitly distinguishes editing a played creation from changing its original. [PS19](#ps19)

**Constructed situation:** a player improves the pacing of a downloaded level and shares a new version. That is an interpretation of another work, not a silent overwrite of its owner's publication. The original economy could make ingredient access an additional barrier; [the access-economy study](#study-3) explains why that description changes after October 2015.

**Interpretation:** discoverability, attribution, editability and publication authority are different needs. Dreams' later private/public/playable permissions cannot simply be assumed to describe Project Spark. A creator platform needs its own explicit answers to these questions.

## 13. Activities beyond “make a level”

Because the toolset was general, player activities included:
- creating terrain/worlds;
- making reusable objects or behavior packs;
- writing dialogue/cutscenes;
- recording Kinect animation/voice;
- composing or attaching sound;
- building action games, puzzles, racers or machinima;
- playing/remixing community projects;
- leveling Champions;
- playing Crossroads-generated adventures;
- playing Champions Quest;
- participating in multiplayer experiences;
- building Conker content;
- following featured/community creations;
- learning from community tutorial videos.

Project Spark also became a medium for nontraditional projects: Linkin Park used it for an interactive music-video experience whose project could be downloaded and modified. [PS51](#ps51)

That matters for OpenLegend because an invention platform may produce **tools, demonstrations, stories, social spaces or simulations**, not only conventional quest content.

## 14. Art, audio, interface and feel

Critics described a colorful, stylized, slightly clay-like/Fable-adjacent visual language. This worked well for generic fantasy assets but also made early creations visually related even when their rules differed. [PS37](#ps37) [PS38](#ps38)

The interface intentionally avoided exposing ordinary programming syntax. Kode tiles, radial/menu choices and prebuilt brains were the programming surface. That lowers syntax burden but does not remove systems thinking; multiple reviews say rule interactions become genuinely difficult as complexity increases. [PS37](#ps37) [PS52](#ps52)

Input tradeoffs were substantial:
- PC keyboard/mouse made precise editing easier;
- Xbox controller integration was functional but more cumbersome for detailed creation;
- Kinect enabled distinctive animation/voice capture;
- cloud saves let a creator switch devices. [PS33](#ps33) [PS46](#ps46)

The best design lesson is not “visual coding is easy.” It is: **remove incidental syntax while preserving the causal structure the creator must understand**.

<a id="12-presentation-music-and-control-set-the-quality-of-ordinary-work"></a>
<a id="study-12"></a>

### Detailed study 12: Presentation, music and control set the quality of ordinary work

Botsford praises the inviting visual assets and the ease of making an appealing basic scene. He finds the quietly adventurous score compatible with creation, but criticizes overlapping audio cues, an intrusive instructional narrator, performance problems and the complexity of advanced controls. His speculation that sound caused frame-rate issues is not adopted as a technical diagnosis. [PS17](#ps17)

**Interpretation:** visual coherence can help a novice make something worth showing before they have mastered every tool. It cannot guarantee that selecting an object, changing a property or reading an event feels clear. An encouraging voice can help one newcomer while becoming irritating to someone already ahead of it.

Composer **Laura Karpman** lists Project Spark among her game scores. [PS23](#ps23) This supplies a production credit, not an independent complete listening analysis or evidence that every track shares one emotional effect.

The review and preview accounts identify different kinds of control difficulty: navigating many functions through a controller, arranging a scene, and playing the resulting character. [PS12](#ps12) [PS17](#ps17) **Interpretation:** simplifying the author's camera is not the same as making an avatar's attack readable. A creator needs to test the experience from the eventual player's perspective rather than judge it entirely from the editor.

#### A music collaboration was also a playable, editable artifact

Microsoft's March 25, 2014 **Linkin Park** announcement offered **Guilty All the Same** as a playable/remixable experience with an **audio remix station**, rather than only a conventional video. The accompanying artist-label page links the official recording. [PS24](#ps24)

**Interpretation:** a promotion can be something the audience acts upon and reinterprets. That produces a more specific invitation than telling everyone they can create anything. The inspected announcement does not establish the campaign's conversion rate, the quality of every remix or a causal share of Project Spark's audience. No lyrics or unviewed scene details are reproduced here.

## 15. Progression, economy and monetization changed fundamentally

Project Spark had three materially different economic phases.

### Phase 1 — beta / launch: free core + paid or earned content

The base program was free. Additional themes/assets/first-party content could be unlocked using **credits** earned through play/progression or **tokens** purchased with money. A retail Starter Pack bundled content and premium benefits. Early beta also experimented with time-limited access (“Spark Time”); negative feedback led Microsoft to remove that mechanic. [PS31](#ps31) [PS53](#ps53)

Some content was also level-gated. Critics and players objected because a creation tool could visibly show an asset yet block it behind level, grind or payment. [PS44](#ps44) [PS52](#ps52)

### Phase 2 — 2015 bundles / maturity

Microsoft sold larger bundles including Year One content. In July 2015 it reported almost **3 million downloads** and more than **15 million plays of user-created content**; some loyal/heavy users received Spark Premium based on hours, downloads or spending. These are participation metrics, not paid-unit sales or retention. [PS54](#ps54)

### Phase 3 — October 5, 2015: everything becomes free

Microsoft transitioned Project Spark into a **free and open creation engine**. Previously paid DLC became unlocked, the Marketplace and token/credit economy were retired, creator capacity limits were expanded, and Microsoft shifted away from producing paid DLC/active feature development toward community-created content. [PS55](#ps55)

This solved the entitlement fragmentation but removed the prior monetization model. It did not by itself guarantee a sustainable service.

<a id="3-play-and-creation-originally-fed-an-acquisition-economy"></a>
<a id="study-3"></a>

### Detailed study 3: Play and creation originally fed an acquisition economy

At launch, the basic download was free, while the retail **Starter Pack** bundled content, creator features and experience boosts. Users could also acquire its contents digitally. [PS04](#ps04) Deesing describes earning currency through playing and designing, with paid currency accelerating acquisition. [PS01](#ps01)

**Constructed choice:** spend the next session making a small level with existing ingredients, earn access to a desired ingredient through other activity, or buy it. Those are different paths to authorship. A tool can be technically capable of something while a particular user lacks the entitlement to express it.

**Interpretation:** earning new ingredients can provide direction, but it can also turn creation into a preliminary grind. The value depends on whether the required activity is itself wanted. The initial economy cannot be used as the description of the later completely free edition.

#### The October 2015 transition changed more than the price

Microsoft's September 28 announcement set an October 5 transition from microtransactions to free access to previously paid content, alongside a move away from active feature/DLC development. The update removed the Marketplace and replaced upvote/downvote-based ranking with downloads and favorites. It also expanded terrain/prop limits and upload capacity. [PS05](#ps05)

**Interpretation:** easier access to ingredients did not mean an expanding commitment to develop the platform. The content economy, discovery rules and production commitment changed together. A creator could gain tools while losing confidence in future improvement; those outcomes are not contradictory.

## 16. Discovery, community and the “play” problem

At launch Microsoft said more than one million beta creators had logged four million creation hours and produced 70,000 levels. The system surfaced recent/featured content and allowed users to download or remix creations. [PS31](#ps31)

Yet several reviews found **discovery weaker than authoring**:
- Ars Technica liked the creation tools but found filtering/feedback rudimentary and many projects more like remix shells than satisfying standalone games.
- the Irish Independent saw some gems among a large amount of unfinished work;
- WorthPlaying saw real genre variety, but explicitly warned that people who only wanted polished experiences were getting community-made work with variable quality. [PS37](#ps37) [PS38](#ps38) [PS52](#ps52)

This is a central OpenLegend warning. If it becomes dramatically easier to create a mechanic/world, supply grows faster than curation. **Creation abundance makes discovery quality more important, not less.**

## 17. Development, production and lifecycle

### Origins and public development

Project Spark was announced at E3 2013 as a Microsoft creation platform influenced by Kodu-like visual logic. Windows 8.1 public beta opened in December 2013; Xbox One beta followed in March 2014. Team Dakota repeatedly used beta creators as both testers and content suppliers. [PS30](#ps30) [PS33](#ps33)

### Full release

The Xbox One/Windows release launched October 7, 2014 after roughly six months of beta, with digital free access plus a paid Starter Pack. Microsoft framed the product as continually evolving rather than “finished” in the conventional boxed-game sense. [PS31](#ps31)

### Content expansion

2014–2015 updates added/expanded Champions, sci-fi content, multiplayer, creator tools, first-party adventures and licensed Conker content. The service was simultaneously an engine, UGC network and DLC business.

### End of active development

On October 5, 2015 the commercial content model was removed and all DLC was opened. Microsoft explicitly said it was pivoting away from DLC and active feature development toward the community. [PS55](#ps55)

### Delisting and shutdown

On **May 13, 2016**, Microsoft stopped offering Project Spark for new download. Existing users could continue online until **August 12, 2016**, when online services were shut down. After shutdown users could no longer download UGC or upload creations; users who wanted community content offline had to download it beforehand. [PS56](#ps56) [PS57](#ps57)

This is materially different from Dreams: Project Spark's networked sharing ecosystem actually became unavailable.

No layoffs were reported as part of the final decision because many team members had already moved to other Microsoft projects. The community manager said it was no longer feasible to keep doing the backend, updates and bug fixes needed to run the service. [PS56](#ps56)

<a id="5-the-shutdown-preserved-a-narrower-local-possibility"></a>
<a id="study-5"></a>

### Detailed study 5: The shutdown preserved a narrower local possibility

The May 2016 notice stopped new downloads and warned that online services would end on **August 12, 2016**. Contemporary reporting of the notice distinguishes uploading/downloading community work from playing content already saved locally; people were instructed to preserve their own uploads and favorites before the deadline. Community manager **Thomas Gratz** attributed the decision to the remaining team's inability to sustain the necessary operation after colleagues had moved to other projects. [PS06](#ps06)

An August 12 report confirms the service's final online date. [PS07](#ps07) **Interpretation:** retaining a local creation is not the same as retaining discovery, collaboration, a user account's remote archive or another person's unpreserved work. An executable local copy can protect some value without preserving the ecosystem that gave it an audience.

The earlier research's narrow shutdown finding remains intact. Neither that finding nor the team's explanation proves that a single missing feature or competitor caused the entire outcome. Current community preservation tools, where separately verified, must not be mislabeled as a revived Microsoft service. This pass did not install or validate an unofficial client or restoration tool.

<a id="13-development-and-distribution-a-platform-still-needed-a-finished-product"></a>
<a id="study-13"></a>

### Detailed study 13: Development and distribution: a platform still needed a finished product

The documented developer relationship includes **Team Dakota**, **Microsoft Studios** and co-developer **SkyBox Labs**. SkyBox's own project page confirms its involvement, but retains old prerelease Xbox 360 and economy copy; those details are not used as current release facts. [PS25](#ps25)

The early design interview describes an ambition to connect playful construction with programmable behavior and an intentionally unfinished fictional framework. The actual hands-on prototypes expose why that integration was difficult: an attractive environment, useful helper and dramatic transformation could each work while movement, impact or reversal still needed attention. [PS03](#ps03) [PS12](#ps12)

**Interpretation:** the design problem was not only exposing engine features. It was allowing a creator to express something coherent, test it quickly and give another person a reason to play. The resulting experience needed craft across tools, authored examples, art, animation, audio and distribution.

The full-release announcement set **October 7, 2014** for the Xbox One/Windows release and explained the optional retail bundle. The 2014 beta had already supported sharing and learning before that release. [PS04](#ps04) [PS08](#ps08) The Xbox 360 version remained unshipped and was reported canceled; a residual platform label in a database does not reverse that history. [PS26](#ps26)

The studio's later sunset statement reports **46 content packs and 16 updates**, alongside educational streams and community tutorials. Those are the team's reported output measures, not proof of how much each update improved retention or of a documented private staffing budget. [PS27](#ps27)

**Interpretation:** a history of substantial delivery and an eventual closure can both be true. Calling the entire project an empty promise would erase shipped work; calling its upload volume proof of sustainability would ignore the operating decision. The useful lesson is to verify the integrated player experience and its support obligations together.

#### A skill or idea can outlive its original platform without being exported

The creator description for **HYPERPIPES** says it began as a Project Spark game by **BeefCakePie** and was later rebuilt from scratch in **Godot**. [PS28](#ps28)

**Interpretation:** this is a concrete counterpoint to treating all earlier creative effort as worthless after shutdown. An idea and acquired skill can survive. Rebuilding is still different from pressing an export button or preserving the original executable unchanged. The account is the creator's statement, not audited commercial success or evidence every Project Spark author could make that transition.

## 18. Five written reviews: what critics liked and disliked

These are five independently published written reviews read for this pass.

### 1. Game Informer — Kyle Hilliard, October 17, 2014

**Liked:** terraforming immediately produces a sense of authorship; the broad tool/template/object library can spark creativity even in someone not already committed to game design; downloading and remixing others' creations is an effective learning route; visuals and music are appealing; mistakes are recoverable.

**Disliked / friction:** the first-party teaching game felt unfinished; initial tutorials emphasized one basic third-person game and left many advanced possibilities to external/community learning; Kode becomes daunting; controller editing leads to frequent wrong-button mistakes. Hilliard's conclusion was that the tool rewards people willing to study rather than automatically making everyone a designer. [PS58](#ps58)

### 2. Ars Technica — Steven Strom, October 12, 2014

**Liked:** Project Spark felt like the deep, genuinely useful version of the Kodu idea; the visual behavior system could model real game-design logic; changing large portions of a world was surprisingly approachable; the creation pillar was rich enough for prototyping serious ideas.

**Disliked / friction:** good game design still required patience and testing; many early community creations were remix shells or mediocre standalone games; feedback tools were thin; search/filtering was weak; the platform could feel lonely despite its share rhetoric. [PS37](#ps37)

### 3. The Guardian / Observer — Andy Robertson, October 26, 2014

**Liked:** generation and behavior tools made game-development concepts approachable; users could adjust movement/intelligence through preconfigured brains, menus and sliders; the system connected its visual interaction model to real programming logic better than several contemporary toybox competitors; community/tutorial support was already useful.

**Qualification:** Robertson noted that making *something* playable was quick while making genuinely engaging work took longer. His review was more positive than several peers about the tutorials and accessibility, which is a useful disagreement rather than something to smooth away. [PS47](#ps47)

### 4. Irish Independent — Ronan Price, November 4, 2014

**Liked:** powerful enough to make action-adventures, shooters, platformers and puzzles; free base access allowed meaningful experimentation; remixing higher-rated creations was an effective learning method; visual programming was more approachable for newcomers than a professional engine; Kinect animation capture was distinctive.

**Disliked / friction:** launch monetization was intrusive; credit acquisition felt slow; many community levels were bland/unfinished; tutorials/documentation were inadequate for behavior programming, forcing users toward community YouTube tutorials. [PS52](#ps52)

### 5. WorthPlaying — Brian Dumlao, November 26, 2014

**Liked:** terrain creation was easy to learn; Kode became understandable through practice; PC editing was precise while the console UI remained usable; playtesting was nearly immediate; Xbox online co-creation made collaboration valuable; the community showed multiple genres and reusable asset packs.

**Disliked / friction:** advanced tutorials were missing; premium-content ownership limited creation/remixing; first-party Void Storm was mechanically basic; some object-heavy action exhibited performance stalls. The reviewer recommended the free version for players and the Starter Pack mainly for creators needing broader assets. [PS38](#ps38)

### Steam review boundary

**Steam reviews are not applicable.** Project Spark was distributed through Xbox / Windows Store infrastructure, not Steam. This dossier therefore uses direct Xbox-era player testimony instead of inventing a Steam sample.

## 19. Direct player testimony and preferences

Metacritic's self-selected Xbox user reviews illustrate the same tensions:
- positive users highlighted the huge option space, community creativity and ability to rapidly build alternate genres;
- a mixed user praised the platform but objected to severe frame-rate problems, level-gated creator assets and weak browsing/discovery;
- some users explicitly found the number of options intimidating rather than liberating. [PS44](#ps44)

GameFAQs preserves a 6.9 user-score snapshot from 161 reviews, but that aggregate should not be treated as a representative survey. It is useful only as evidence that player reaction was more divided than the broad critical reception. [PS59](#ps59)

### Repeated positive preferences

- fast terrain/world manipulation;
- inspectable visual logic;
- immediate test/edit cycle;
- ability to remix and learn from another creator's actual rules;
- broad genre flexibility;
- community specialization into reusable objects/tools;
- Kinect/custom animation novelty;
- collaborative editing;
- first-party examples built with the same tools.

### Repeated negative or divisive preferences

- visual programming still becomes complex;
- tutorials did not cover the real depth;
- controller creation was less efficient than mouse/keyboard;
- F2P asset/level gates conflicted with the promise of unrestricted creation;
- uneven UGC quality;
- weak discovery/feedback;
- generic shared asset aesthetics;
- runtime performance could degrade in dense creations;
- service-dependent sharing meant the community library disappeared when servers closed.

These are qualitative patterns, not prevalence estimates.

<a id="14-reception-the-audience-wanted-different-things"></a>
<a id="study-14"></a>

### Detailed study 14: Reception: the audience wanted different things

| Account | What it values | Friction or qualification |
| --- | --- | --- |
| Jonathan Deesing, December 2014 | Learning readable behavior and gradually making a working level. | Requires time and practice; original economy. [PS01](#ps01) |
| Kevin VanOrd, November 2013 preview | Experimenting with helpers and transformations. | Actual action feel and the completeness of his creation lag behind the idea; prerelease evidence. [PS12](#ps12) |
| Brent Botsford, April 2015 | Attractive assets and the Crossroads hybrid. | Clutter, teaching tone and thin authored/community play in his experience. [PS17](#ps17) |
| **TSapper**, November 19, 2014 | Learning beyond their programming experience and playing skilled creators' work. | Had not finished a project they considered publishable. [PS29](#ps29) |
| **Kawooster**, January 18, 2015 | Visuals, templates and exploring others' work. | Learning burden and dissatisfaction with ingredient access. [PS29](#ps29) |
| **willothenight**, October 10, 2014 | A routine of checking who played their creations, doing challenges and improving projects. | One highly invested account, not a typical-use cohort. [PS29](#ps29) |
| **ZackH25**, March 28, 2023 retrospective | Choosing an adventure's setting and finding enjoyable community worlds. | Criticizes the former paid-content model; their financial explanation is unverified and not a 2023 feature report. [PS29](#ps29) |

**Interpretation:** “make games” can mean an expressive toy, a satisfying learning process, a route to a professional product or simply a source of new things to play. The same platform may serve one expectation and frustrate another. A modest creation can be valuable to its maker without being compelling to strangers.

The most concrete return loop in these accounts includes audience response: someone checks what happened to yesterday's work before deciding what to make next. That is not equivalent to a global upload counter. The evidence also exposes why an impressive editor cannot substitute for enjoyable ordinary play.

The samples are selective. No complaint frequency, verified age profile, hidden commercial motive or universal verdict on the community is inferred. Criticism of the old paid economy must remain historical after the free transition. Praise for long-term possibilities is not proof those plans were subsequently delivered.

## 20. Commercial and participation evidence

Public metrics are incomplete and use different definitions:
- at launch: **>1 million creators**, **4 million creation hours**, **70,000 levels** during beta; [PS31](#ps31)
- July 2015: **almost 3 million downloads** and **>15 million plays of UGC**; [PS54](#ps54)
- September 2015 Microsoft described hundreds of thousands of creators and very high ongoing UGC/object activity while announcing the free-content transition. [PS55](#ps55)

None of those numbers is lifetime revenue, retention, daily users or paid software units. No reliable complete revenue/profit series was found in this pass. The shutdown itself proves that Microsoft ended the service, not which individual feature or business decision caused that outcome.

<a id="4-a-participation-milestone-is-not-a-sustainability-result"></a>
<a id="study-4"></a>

### Detailed study 4: A participation milestone is not a sustainability result

The same announcement reported **over 200,000 creators**, tens of millions of shared custom objects/behaviors/experiences, and roughly **300–400 new games uploaded daily**. These are attributed historical company measures, not audited distinct monthly creators, sold copies, profitable games or satisfied visitors. [PS05](#ps05)

**Interpretation:** a large amount of production can coexist with a fragile operating model. An upload count does not reveal how many people played the work, returned to it or valued the response they received. The inspected evidence does not supply a title budget, profit or creator-income distribution.

## 21. Transferable inspiration for OpenLegend

### A. WHEN/DO is a powerful mental model for extensibility

A user can understand “when X, do Y” without losing causality. OpenLegend inventions could expose declarative trigger/condition/effect constructs for many deterministic mechanics while reserving LLM cognition for ambiguity, planning and authored interpretation.

**Do not copy:** unrestricted arbitrary script authority. OpenLegend's engine needs validated effect families, permissions and bounded resource use.

### B. Start from working behavior, then specialize

Follower-healer is a better first object than an empty brain. Crossroads is a better first world than a blank grid for many people. Templates should be **legible starting points**, not hidden canned mechanics pretending to be generation.

### C. Remixability is much more useful when internals remain inspectable

Download → inspect → modify was a real learning loop. OpenLegend invention packs should make dependencies and rules understandable enough that users can adapt them rather than only regenerate variants through prompts.

### D. Put provenance in the object graph

Project Spark's lineage system is an early precedent for recognizing mixed authorship. OpenLegend will need even stronger provenance because one invention may depend on another pack's schemas, effects and permissions.

### E. Do not sell pieces of the creative grammar one by one

Project Spark's launch economy created tension between “make whatever you imagine” and asset/level entitlements. OpenLegend can monetize service value, compute, hosting or premium content without making core expressive primitives feel like arbitrary toll booths.

### F. UGC discovery needs quality state, not just quantity

A feed containing prototype tests, reusable components, polished games and abandoned drafts needs distinctions:
- component vs world;
- experimental vs stable;
- compatible vs incompatible;
- maintained vs abandoned;
- first-party/reference vs community;
- remixable vs playable-only.

Project Spark's reviews repeatedly show the cost of treating all shared creations as one browsing surface.

### G. A creator platform is an ongoing service obligation

The 2016 closure made online UGC unavailable. OpenLegend should design for exportability, durable ownership and graceful degradation where practical. A user's world or invention should not silently become inaccessible merely because a discovery service changes.

### H. First-party content should prove the same public system

Conker's Big Reunion and Team Dakota's own games were built inside Project Spark. That creates trust that the authoring system is not a toy subset. OpenLegend should similarly resist maintaining a secret first-party-only mechanics path for its flagship world.

<a id="15-transferable-inspiration-and-limits"></a>
<a id="study-15"></a>

### Detailed study 15: Transferable inspiration and limits

**A narrow beginning can lead to deeper authorship.** Crossroads offers choices with an immediate playable consequence. OpenLegend can similarly provide a meaningful first situation without requiring every player to understand authoring internals.

**A declared effect needs a complete lifecycle.** A transformation needs an ending; an objective needs a reachable condition; a terrain power needs bounds; a pickup needs a stored result and readable feedback. More impressive beginnings do not repair missing continuations.

**Make helpers useful and expressive without confusing those goals.** A conditionally healing follower can be valuable even without general cognition. A richer character model should improve actual decisions and relationships, not merely add a biography to the same behavior.

**Separate construction, learning and public entertainment.** The person who enjoyed making an awkward game may have succeeded at their own goal. A visitor still needs something worthwhile to play. Measure those outcomes separately.

**Treat access and attribution as part of reuse.** A shared world can carry ingredient, ownership, platform and credit constraints. Making an object technically copyable is only part of a trustworthy creator experience.

**Choose a continuity promise that can be supported.** Local saves protected some Project Spark work while remote discovery and sharing ended. A persistent-world product should make the difference between preserving an artifact and sustaining its social setting explicit.

These are research interpretations, not accepted OpenLegend implementation requirements. The paired chapter's warning against single-feature explanations of platform viability remains unchanged.

## 22. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / promise | §§1, 17 |
| R02 actions / major mechanics | §§2–13 |
| R03 items / entities / composition | §§3–8 |
| R04 progression / economy / time | §§5–7, 15, 20 |
| R05 concrete interactions | §§2–4, 8–12 |
| R06 people / AI / social / multiplayer | §§10, 12 |
| R07 art / audio / interface / feel | §14 |
| R08 story / narrative | §11 |
| R09 production | §17 |
| R10 distribution / promotion / virality | §§12, 15–17 |
| R11 commercial / participation | §§15, 20 |
| R12 reviews / player feedback | §§18–19 |
| R13 transferable inspiration / limits | §21 |
| R14 sources / preservation / navigation | this section + sources |

**Preservation check:** the prior paired chapter's distinction is retained. Project Spark's **online services actually ended on August 12, 2016**; this is not the same situation as Dreams ending feature support while retaining play/create/share. The paired chapter remains canonical for the cross-platform viability comparison; this dossier owns the complete Project Spark pass.

<a id="16-coverage-viewing-routes-and-preservation"></a>
<a id="study-16"></a>

### Detailed study 16: Coverage, viewing routes and preservation

Start with the Crossroads hands-on account, then the original manual's Champion interactions, and finally the Land Creator Brain. Compare the performed healer with the recorded animation to separate behavioral competence from presentation. Read the free-transition announcement and sunset notice together before drawing business conclusions.

Useful viewing routes include the written **Game Informer Test Chamber** entry and the official **Guilty All the Same** video linked by the artist's label. The latter is a musical/promotion artifact, not an ordinary unedited onboarding session. The Conker announcement also links a gameplay/community montage; its adult tone differs from the default fantasy palette. These links establish identity and purpose, **not full footage watched or invented timestamps**. [PS15](#ps15) [PS20](#ps20) [PS24](#ps24)

**Per-game preservation:** the complete paired chapter and the supplied master's §5.1 were compared. The August 12, 2016 shutdown fact, distinct Dreams live-support outcome, creator-versus-player viability argument, absent-feature counterfactual caution and OpenLegend product questions remain intact. Original source, review, economic and viewing registers were not overwritten. No separate earlier Project Spark mechanics study was replaced. This dossier adds the previously missing whole-game dimensions; the seven-file packet-wide audit is a separate pending gate.

**Evidence limits:** no personal play, installation/restoration test, complete-video analysis, proprietary code/budget access or representative review survey. The original game manual has missing button images in extracted text, so exact unrendered button mappings are not guessed. Some original reviews/tutorials were accessible only as substantive indexed text. Retired network-session details were not fully reconstructable; corroborated local play, reported creation cooperation, PC limits and current official-service closure are distinguished rather than merged into an invented multiplayer specification.

## Sources

<a id="ps30"></a>**PS30 — [Project Spark Beta Is Live on Windows 8.1](https://news.xbox.com/en-us/2013/12/03/games-project-spark-beta/).** Xbox Wire / Microsoft, 2013-12-03. Primary beta description: world building, Crossroads and brains.

<a id="ps31"></a>**PS31 — [What Will You Create? Project Spark Launches Online and at Retail](https://news.xbox.com/en-us/2014/10/07/games-project-spark-launches-online-and-at-retail/).** Xbox Wire / Microsoft, 2014-10-07. Primary launch, platform, beta metrics, free/retail model and creation positioning.

<a id="ps32"></a>**PS32 — [Microsoft's Project Spark game creation package gets October release](https://www.theguardian.com/technology/2014/jul/09/microsoft-project-spark-game-creation-package-october-release) and [GameFAQs Xbox 360 release record](https://gamefaqs.gamespot.com/xbox360/723506-project-spark).** Contemporary reporting notes the announced Xbox 360 version disappeared from launch messaging; release database records it cancelled. The 360 build is not treated as shipped.

<a id="ps33"></a>**PS33 — [Project Spark Beta Comes to Xbox One Today](https://news.xbox.com/en-us/2014/03/04/project-spark-beta-comes-to-xbox-one-today/).** Xbox Wire / Microsoft, 2014-03-04. Primary Kinect animation/voice, cloud save/cross-device controls and Crossroads/tutorial explanation.

<a id="ps34"></a>**PS34 — [Project Spark: An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/).** GameSpot, 2013. Hands-on creator preview; terrain/character-brain examples and healer construction.

<a id="ps35"></a>**PS35 — [Project Spark review](https://worthplaying.com/article/2014/11/26/reviews/94234-xbox-one-review-project-spark/).** WorthPlaying / Brian Dumlao, 2014-11-26. Full review with terrain, prop placement/scaling, editing, collaboration and creation-economy details.

<a id="ps36"></a>**PS36 — [Project Spark preview / early hands-on coverage](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/) and [Xbox beta guide](https://news.xbox.com/en-us/2014/03/04/project-spark-beta-comes-to-xbox-one-today/).** Used for Crossroads and creator flow; does not establish every later release rule.

<a id="ps37"></a>**PS37 — [Project Spark review: If it's in the game (design)...](https://arstechnica.com/gaming/2014/10/project-spark-review-if-its-in-the-game-design/).** Steven Strom, Ars Technica, 2014-10-12. Full launch-era review of Kode depth, discovery, feedback and UGC quality.

<a id="ps38"></a>**PS38 — [Xbox One Review — Project Spark](https://worthplaying.com/article/2014/11/26/reviews/94234-xbox-one-review-project-spark/).** Brian Dumlao, WorthPlaying, 2014-11-26. Full review: editor, co-creation, platform controls, content restrictions, Void Storm and performance.

<a id="ps39"></a>**PS39 — [How the brains work](https://projectspark.fandom.com/wiki/How_the_brains_work).** Project Spark community wiki. Historical mechanics reference for Kodu-derived WHEN/DO rules and tick/order semantics; community documentation, not a surviving official manual.

<a id="ps40"></a>**PS40 — [Project Spark: An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/).** GameSpot hands-on report. Directly documents follower-healer brain, 75% health condition, Kinect action and team logic.

<a id="ps41"></a>**PS41 — [Xbox One preview: Microsoft's E3 games](https://www.theguardian.com/technology/2013/jun/14/xbox-one-preview-microsoft-e3-games).** The Guardian, 2013-06-14. Contemporary demonstration of generated terrain, creature behavior and quest-building ambition.

<a id="ps42"></a>**PS42 — [CODENAME: Hippo](https://projectspark.fandom.com/wiki/CODENAME%3A_Hippo).** Historical community documentation of the Champions/lineage update: skill/appearance unlocks and contribution tracking. Used as lower-confidence mechanics history, not current service evidence.

<a id="ps43"></a>**PS43 — [Project Spark achievements / launch-era Champion progression](https://news.xbox.com/en-us/2014/10/15/games-project-spark-achievements/), plus archived community Champion tables.** Microsoft confirms Champion leveling to level 20 in release achievements; community tables supply ability examples. Exact historical tuning is not generalized beyond its version.

<a id="ps44"></a>**PS44 — [Project Spark user reviews](https://www.metacritic.com/game/project-spark/user-reviews/?platform=xbox-one).** Self-selected Xbox-era player reviews. Used qualitatively for option-space praise, frame-rate/discovery complaints and frustration with level-gated creator assets.

<a id="ps45"></a>**PS45 — [Conker's Big Reunion launch details](https://www.gamespot.com/articles/conker-s-big-reunion-launches-tomorrow-with-10-fre/1100-6426822/).** GameSpot / Ivan Ho, 2015-04-22. First-party episode made in public tools, community creations, multiplayer-arena example and asset-pack scope.

<a id="ps46"></a>**PS46 — [Project Spark release / beta reporting](https://www.theguardian.com/technology/2014/jul/09/microsoft-project-spark-game-creation-package-october-release).** The Guardian, 2014-07-09. Genre breadth, PC/controller contrast, microtransaction controversy and community tutorials.

<a id="ps47"></a>**PS47 — [Project Spark review — bringing games development to the masses](https://www.theguardian.com/technology/2014/oct/26/project-spark-review-games-development-masses).** Andy Robertson, The Observer/Guardian, 2014-10-26. Full written review of accessibility, brains, controls and programming-logic connection.

<a id="ps48"></a>**PS48 — [Conker's Big Reunion is a $5, hour-long episode](https://www.gamespot.com/articles/conker-s-bad-fur-day-project-spark-dlc-is-a-5-hour/1100-6426498/).** GameSpot, 2015-04-08. Contemporary episode, pricing and creation-pack details.

<a id="ps49"></a>**PS49 — [Test Chamber — Project Spark: Conker's Big Reunion](https://gameinformer.com/b/features/archive/2015/04/24/test-chamber-project-spark-conker-39-s-big-reunion.aspx).** Game Informer, 2015-04-24. Contemporary qualitative response to the shipped episode. Video itself is not represented as fully watched.

<a id="ps50"></a>**PS50 — [Project Spark — Multiplayer Announcement — E3 2014](https://www.youtube.com/watch?v=rL3yIVVHxVI).** Official Project Spark upload metadata states four-player multiplayer in both Create and Play over Xbox Live; review evidence corroborates shipped collaborative creation. Video content beyond supplied metadata was not independently transcribed.

<a id="ps51"></a>**PS51 — [Project Spark used for Linkin Park music video](https://worthplaying.com/article/2014/3/25/news/91798-project-spark-all-used-for-linkin-park-music-video-trailer/).** Contemporary report of a downloadable/remixable nontraditional creation and cross-platform/cloud capability.

<a id="ps52"></a>**PS52 — [Project Spark review: DIY gaming](https://www.independent.ie/entertainment/games/project-spark-review-diy-gaming/30717159.html).** Ronan Price, Irish Independent, 2014-11-04. Full review with visual-programming accessibility, microtransaction, tutorial/documentation and UGC-quality criticism.

<a id="ps53"></a>**PS53 — [Project Spark removes Spark Time after beta feedback](https://www.engadget.com/2014-03-20-project-spark-spark-time-premium.html).** Engadget, 2014-03. Contemporary reporting of beta monetization change and Spark Premium. Historical only.

<a id="ps54"></a>**PS54 — [Xbox/PC Get $50 Version of Free-to-Play Game Project Spark](https://www.gamespot.com/articles/xboxpc-get-50-version-of-free-to-play-game-project/1100-6429252/).** GameSpot, 2015. Nearly 3m downloads, >15m UGC plays, Year One bundle and Premium qualification; metrics are not revenue/retention.

<a id="ps55"></a>**PS55 — [Project Spark transition to free/open creation engine](https://news.xbox.com/en-us/2015/09/28/games-project-spark-transition/).** Xbox Wire / Microsoft, 2015-09-28. Primary October 5 transition: paid DLC unlocked, Marketplace/economy retired, creator limits expanded and active-development/DLC focus shifted.

<a id="ps56"></a>**PS56 — [Microsoft Ends Support for Project Spark](https://gameinformer.com/b/news/archive/2016/05/13/microsoft-ends-support-for-project-spark-no-resulting-layoffs.aspx).** Game Informer, 2016-05-13, reproducing/quoting the official community-manager announcement: delisting, August 12 service end, UGC preservation warning and staffing context.

<a id="ps57"></a>**PS57 — [Microsoft's Project Spark becomes free-to-nobody on August 12](https://arstechnica.com/gaming/2016/05/todays-bad-tech-news-on-a-friday-story-comes-courtesy-of-project-spark/).** Ars Technica, 2016-05-13. Independent contemporaneous shutdown report; confirms immediate download/store removal and August content-server closure.

<a id="ps58"></a>**PS58 — [Project Spark Review — Build An Estimation Of Your Dream Game](https://gameinformer.com/games/project_spark/b/xboxone/archive/2014/10/17/game-informer-project-spark-review.aspx).** Kyle Hilliard, Game Informer, 2014-10-17. Full review.

<a id="ps59"></a>**PS59 — [Project Spark — GameFAQs reviews](https://gamefaqs.gamespot.com/xboxone/718569-project-spark/reviews).** Historical aggregate/links showing Xbox user-score context. Self-selected and not treated as representative.

<a id="annotated-sources"></a>

### Additional annotated evidence

<a id="ps01"></a>**PS01 — [Project Spark review](https://www.deseret.com/2014/12/3/20554033/project-spark-challenging-but-rewarding-way-for-players-to-create-their-own-video-games/), Jonathan Deesing, December 3, 2014.** Original play/creation and tree-completion example. Historical economy; no independent replay.

<a id="ps02"></a>**PS02 — [DigitalChumps review](https://digitalchumps.com/2014/10/12/project-spark-review/), October 12, 2014.** Substantive indexed Kode/Brain Gallery account; direct retrieval failed. Example attributed, not an exhaustive language specification.

<a id="ps03"></a>**PS03 — [Team Dakota interview](https://gamesbeat.com/microsofts-team-dakota-aims-for-user-generated-magic-with-project-spark-interview/), Dean Takahashi, February 3, 2014.** First-page interview body inspected; subsequent pagination partly gated. A 2025 display update does not change the interview date or make planned platforms delivered.

<a id="ps04"></a>**PS04 — [Launch and Starter Pack](https://news.xbox.com/en-us/2014/07/08/project-spark-officially-launches-in-october/), July 8, 2014; [postlaunch achievement guide](https://news.xbox.com/en-us/2014/10/15/games-best-achievements-in-project-spark/), October 15, 2014.** Primary launch/access, editable dialogue and Avalon detour. Historical entitlements, not current purchase advice.

<a id="ps05"></a>**PS05 — [Free incubation-engine transition](https://news.xbox.com/en-us/2015/09/28/games-project-spark-transition/), September 28, 2015.** Primary model/discovery/development transition and dated participation claims. Output is not profit or retention; secondary misstatements about doubled prop limits are excluded.

<a id="ps06"></a>**PS06 — [Sunset notice reproduction](https://www.destructoid.com/rest-in-peace-project-spark/), Jordan Devore, May 13, 2016.** Contemporary Gratz announcement/local-save warning. Attributed operating explanation, not a complete internal postmortem.

<a id="ps07"></a>**PS07 — [Final online day](https://www.gamespot.com/articles/project-spark-goes-offline-for-good-after-today/1100-6442590/), Eddie Makuch, August 12, 2016.** Closure confirmation and canceled future Conker content. Residual hub platform labels do not prove a shipped Xbox 360 version.

<a id="ps08"></a>**PS08 — [Open-beta hands-on](https://www.windowscentral.com/project-spark-open-beta), Paul Acevedo, March 2014.** Original Crossroads play account. Restricted beta choices and old payment rules are not the later full/free catalogue; embedded footage not watched.

<a id="ps09"></a>**PS09 — [Crossroads historical guide](https://projectspark-archive.fandom.com/wiki/Crossroads%3A_Play_and_Change_a_Game).** Community spatial-choice and route-friction account. Old paid options and reported bugs are version-qualified; unsupported exact prevalence/values excluded.

<a id="ps10"></a>**PS10 — [Original game manual](https://dlassets-ssl.xboxlive.com/public/content/4c48886c-2de2-48b8-8ec3-4f87424b2ff5/GameManual/2cb10e54-9350-445e-af63-63c46c6737f7/en-SG/index.html).** Primary Champion, lineage and historical remix rules. Missing button images are not reconstructed; old Marketplace instructions superseded by PS05.

<a id="ps11"></a>**PS11 — [Achievement reference](https://projectspark.fandom.com/wiki/Achievements).** Community transcription of authored Void Storm/Conker objectives. Objective text establishes intended tasks, not personal completion or universal prop capabilities.

<a id="ps12"></a>**PS12 — [An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/), Kevin VanOrd, November 7, 2013.** Original hands-on prototype: environment, healer, Kinect performance and yeti transformation. Prerelease limitations not relabeled current defects; no footage independently viewed.

<a id="ps13"></a>**PS13 — [3rd-Person Land Creator](https://schoolofkode.wordpress.com/2017/09/26/3rd-person-land-creator/), September 26, 2017.** Original community tutorial/Kode and stated boundary warning; substantive indexed body inspected, direct retrieval failed. Post-shutdown publication is not a revived official service.

<a id="ps14"></a>**PS14 — [Brain Kode index](https://schoolofkode.wordpress.com/brain-kode-index/).** Original tutorial index distinguishing native and contributed behavior. Named families are navigation, not a claim every linked Brain was tested or every page read.

<a id="ps15"></a>**PS15 — [Test Chamber: Project Spark](https://gameinformer.com/b/features/archive/2014/10/16/test-chamber-project-spark), Kyle Hilliard, October 16, 2014.** Written postlaunch capture description and viewing route with Andrew Reiner. Full recording not watched; no scene/timestamp claims.

<a id="ps16"></a>**PS16 — [A Little Help From My Friend](https://www.trueachievements.com/a192392/a-little-help-from-my-friend-achievement), PalmettoBling, November 2014; o Blaze UK o, February 2016.** Direct local-controller/credit/rejoin accounts. Historical reports, not fresh verification or an exhaustive network specification.

<a id="ps17"></a>**PS17 — [Project Spark review](https://www.eggplante.com/2015/04/18/project-spark-review/), Brent Botsford, April 18, 2015.** Original creation/play and audiovisual critique. Reporter speculation about technical causes and sweeping catalogue judgments remain opinion; not imported as measured facts.

<a id="ps18"></a>**PS18 — [Free-transition and PC multiplayer report](https://www.newgamenetwork.com/news/10909/project-spark-goes-completely-free/), September 29, 2015.** Contemporary report quotes developers on PC multiplayer still being only a distant possibility. Does not prove every advertised network feature shipped elsewhere.

<a id="ps19"></a>**PS19 — [Firsthand creation review](https://www.gamer.ne.jp/news/201412100001/), December 10, 2014.** Original Japanese play/creation account, especially remix-versus-original distinction. General online/multiplayer descriptions not used to invent exact session limits.

<a id="ps20"></a>**PS20 — [Conker episode and community launch](https://www.gamespot.com/articles/conker-s-big-reunion-launches-tomorrow-with-10-fre/1100-6426822/), Ivan Ho, April 22, 2015.** Historical episode/asset and early-community-access account. Body's loose Bad Fur Day naming is clarified as Big Reunion; video is metadata-only.

<a id="ps21"></a>**PS21 — [Conker announcement and developer comments](https://www.gematsu.com/2015/03/new-conker-game-coming-to-project-spark-on-april-23), Sal Romano, March 19, 2015.** Reproduced Sterchi comments on Rare, voice/music and premise; not an independently read full original interview or promise later episodes shipped.

<a id="ps22"></a>**PS22 — [Conker asset detail](https://www.destructoid.com/a-better-look-at-our-beloved-conker-in-project-spark/), Jordan Devore, April 2015.** Reproduced pack list: paired money behaviors, disco object and control template. Selected concrete facts, not a copied asset catalogue or verified gameplay session.

<a id="ps23"></a>**PS23 — [Laura Karpman biography](https://www.laurakarpman.com/bio), inspected September 26, 2026.** Primary Project Spark scoring credit. Not a complete soundtrack analysis or claim of sole authorship of every audio asset.

<a id="ps24"></a>**PS24 — [Xbox music collaboration](https://news.xbox.com/en-us/2014/03/25/project-spark-linkin-park/), March 25, 2014; [artist-label release and official video](https://wmg.jp/linkin_park/news/55623), March 28, 2014.** Primary remix-station/promotion and viewing identity. No lyrics copied, full recording watched or measured acquisition attribution; old platform plans remain historical.

<a id="ps25"></a>**PS25 — [SkyBox Labs project page](https://skyboxlabs.com/games/project-spark/).** Primary co-development credit. Stale beta, dates/platform and payment copy is not used as a present product specification.

<a id="ps26"></a>**PS26 — [Final service day and canceled platform](https://www.windowscentral.com/microsofts-project-spark-going-dark-after-today-download-content-now), John Callaham, August 12, 2016.** Contemporary Xbox 360 cancellation/local-access reporting. Its erroneous March date for the sunset announcement is corrected by the actual May notice, not repeated.

<a id="ps27"></a>**PS27 — [Full sunset statement reproduction](https://worthplaying.com/article/2016/5/13/news/99434-project-spark-all-shutting-down-in-august/), May 13, 2016.** Primary statement in contemporary reporting, including output and teaching activity. No inferred team size, cost or profit from those counts.

<a id="ps28"></a>**PS28 — [HYPERPIPES creator description](https://store.steampowered.com/app/5009100/HYPERPIPES/), inspected September 26, 2026.** Creator's account of a Project Spark-origin idea rebuilt in Godot. No automatic-export, verified sales or typical-success claim.

<a id="ps29"></a>**PS29 — [Project Spark player review bodies](https://www.metacritic.com/game/project-spark/user-reviews/), selected 2014–2015 and 2023 posts.** Named direct testimony, not representative sentiment. Historical payment complaints and unsupported financial explanations remain distinct from later verified transitions.
