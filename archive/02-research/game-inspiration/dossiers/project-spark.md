# Project Spark — full research dossier

**G14 · Complete research pass, September 26, 2026.** Project Spark is treated as the released Xbox One / Windows 8.1 creation platform, not the cancelled Xbox 360 version and not as a generic name for Kodu. This pass separates its launch-era free-to-play economy from the October 2015 all-content-free transition and from the August 2016 online-service shutdown. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Project Spark is especially relevant to OpenLegend because it exposed a compact **behavior grammar** to ordinary players: attach a brain to an object, describe **WHEN** a condition is true and **DO** an action, then compose those rules into enemies, companions, quests, cameras, UI, vehicles, progression and entirely different game genres. Its history is equally useful because the creation grammar, discovery system, monetization model and service lifetime were all separate product problems.

## 1. Identity and player promise

Team Dakota / Microsoft Studios positioned Project Spark as a free game-creation platform whose core loop was **create, play, share and remix**. It formally launched October 7, 2014 on Xbox One and Windows 8.1 after a public beta. The Xbox 360 edition was announced earlier but never released. [PS01](#ps01) [PS02](#ps02) [PS03](#ps03)

A player could approach it in at least four ways:

1. **Play first-party experiences**, including Crossroads adventures, Champions Quest / Void Storm and later Conker's Big Reunion.
2. **Play community creations**, ranging from small platformers and shooters to puzzle games, racers, pinball-like games, machinima and reusable asset packs.
3. **Create or prototype from scratch**, sculpting terrain, placing props/characters and programming their behavior.
4. **Remix**, opening another creator's shared work, inspecting its logic and making a derivative while retaining lineage/credit.

That final mode matters. Project Spark did not only let a player see that a healer worked; the player could open the healer's **brain** and learn how it worked.

### Platform boundary

The shipped release was Xbox One and Windows 8.1/PC. Cloud saving allowed a project to move between PC and Xbox One, and the system translated standard controls between mouse/keyboard and controller. Kinect on Xbox One could record body animation and voice for use in creations. [PS04](#ps04)

Many historical databases still list Xbox 360 because Microsoft announced it in 2013. Contemporary launch reporting stopped naming that build, and later release databases mark it cancelled. Do not describe Project Spark as a shipped Xbox 360 game. [PS03](#ps03)

## 2. Creating a world: terrain is an editable system, not a fixed map

The world editor begins with a three-dimensional canvas. Creators can raise/lower terrain, carve valleys/caves, build mountains, paint terrain materials/biomes and populate the resulting space with props, vegetation, characters and effects. Props can be translated, rotated and scaled rather than remaining fixed to a snap grid. [PS05](#ps05) [PS06](#ps06)

The useful design pattern is **progressive formalization**:
- a beginner can first shape a visually interesting place;
- templates can supply a playable third-person character and camera;
- then the creator can open individual brains and replace defaults;
- eventually the same visual object can become a door, enemy, machine, quest giver, score counter or physics toy.

This creates an important difference between **world appearance** and **world law**. A rock is not inherently a quest objective, destructible object or cover object. Its brain and the rules of nearby systems give it that role.

### Crossroads: play while authoring

**Crossroads** was a guided adventure generator intended to prevent the empty-canvas problem. The player made choices while moving through an emerging adventure—terrain theme, paths, encounters, objectives and other elements—then could open the result in the editor and continue refining it. Team Dakota explicitly described it as letting newcomers “play as they create.” [PS04](#ps04) [PS07](#ps07)

This is a particularly strong precedent for OpenLegend's world agent: creation does not have to start with a schema editor. A player can express decisions inside an immediately playable context and only later inspect the underlying construction.

**Limitation:** scaffolding can also narrow imagination. Reviewers noted that many early creations looked or played similarly because creators naturally began from the same fantasy assets, cameras and action-game templates. [PS08](#ps08) [PS09](#ps09)

## 3. Kode: every object can have a visible brain

Project Spark's behavior system evolved from Microsoft's Kodu ideas. A prop or character can have a **brain** made from lines of Kode. Each rule follows a visual grammar:

> **WHEN** condition / sensor / event → **DO** action

Rules are evaluated repeatedly, in order. Conditions and actions can be modified by additional tiles, and more complex behavior can be composed from multiple rules, pages and object relationships. [PS10](#ps10)

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

Project Spark shipped preconfigured brains so a creator could turn a newly placed character into something useful without authoring every rule. GameSpot's 2013 hands-on example starts from a follower/healer brain, then changes the healing condition to trigger below 75% health, assigns teams, and records a Kinect animation for the heal. [PS11](#ps11)

That example contains several important composition principles:

1. **Behavior template:** start with a functional role.
2. **Parameterization:** change a threshold rather than rewrite the role.
3. **Identity/presentation:** attach a custom animation/voice.
4. **Faction/team rule:** specify whom the actor treats as an ally/enemy.
5. **Immediate test:** watch the resulting behavior and revise.

For OpenLegend, that is a good model for an invention family. “Healer” should not require one hard-coded NPC class; it can be a reusable policy plus world-valid capabilities and parameters.

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
- Kinect-recorded animations firing as consequences of game state. [PS07](#ps07) [PS11](#ps11) [PS12](#ps12)

### Constructed OpenLegend-relevant example

A wooden barricade could have:
- WHEN struck by fire-tagged damage → DO increase burn counter;
- WHEN burn counter is above threshold → DO swap material/effect and drain health;
- WHEN health reaches zero → DO remove barricade and trigger path-open state.

A different creator could make visually similar wood inert. Project Spark therefore demonstrates **composable interaction**, not globally consistent material law.

OpenLegend's opportunity is to preserve the composability while making world-level material or status semantics reusable across inventions so that “wood burns” need not be re-authored independently in every scene.

## 5. Characters, Champions and player identity

Project Spark had no single universal RPG character-creation system for every user-made game. Creators could build arbitrary controllable characters and expose their own stats/rules. The platform itself nevertheless supplied **Champions**—first-party playable archetypes with authored combat kits and level progression.

Prominent Champions included:
- **Scarlett**, a ranged/ranger-style character;
- **Haakon**, a melee knight;
- **Avalon**, a druid/magic-oriented character;
- later characters and licensed content such as **Conker**.

The 2014 Champions update made leveling a distinct progression system. Levels could unlock skills, visual variants, clothing, weapons and other content usable in Create mode. Community references document a cap of level 20 for the original Champion progression, while contemporary Microsoft material confirms a level-20 Champion achievement. [PS13](#ps13) [PS14](#ps14)

This is separate from creator/player account progression. A person could therefore be:
- advancing a Champion inside supported gameplay;
- leveling their Project Spark profile to earn creator currency/unlocks;
- authoring a custom game with an entirely different progression model.

Keeping those three concepts distinct prevents a common research mistake: Project Spark did not impose Scarlett's or Haakon's leveling rules on every user-created character.

## 6. Skills, abilities, classes and tech trees

There was no universal class tree for all creations. The platform offered three layers:

### A. First-party Champion progression

Champions acquired abilities and cosmetic/equipment unlocks with level. Historical community documentation shows concrete ability gates—for example Avalon unlocking specialized attacks/turret-like abilities at specific levels, and Haakon gaining movement/area attacks and spear-related interactions. [PS14](#ps14)

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

The original free-to-play model also gated some creation assets behind player level, credits or paid tokens. That was not a fictional skill tree; it was a platform economy layered on the editor. Some player reviews strongly disliked having the currency to buy an asset while still being blocked by a creator-level requirement. [PS15](#ps15)

**OpenLegend lesson:** never confuse *learning progression* with *capability entitlement*. A player becoming better at using an invention system can be satisfying; withholding the basic grammar needed to express an idea can feel arbitrary.

## 7. Items, weapons, armor and equipment

Project Spark's item model was **asset- and author-defined**, not a universal inventory schema. The content library included characters, weapons, environmental props, sounds, visual effects, animations and themed packs. Creators could:
- place an item directly in a world;
- attach a brain to make it pickable/interactive;
- make a weapon drive attack logic;
- track possession with Kode state;
- build an inventory/equipment interface;
- save reusable object configurations for other creations.

First-party Champions supplied more conventional authored weapons/clothing unlocks. Licensed packs such as Conker added hundreds of themed assets for both play and Create mode. [PS16](#ps16)

At launch, content ownership affected remixing and creation. A level containing premium pieces could expose dependencies that a remixer did not own. This made the *asset catalog* part of the platform's economics, not just the world's fiction. [PS08](#ps08) [PS09](#ps09)

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

Champions offered examples of packaged powers, such as Avalon's druidic abilities or Haakon's supernatural companion/spear attacks, but these were authored content built on the broader creation system rather than the only allowed magic ontology. [PS14](#ps14)

This is directly relevant to OpenLegend's invention philosophy: the engine can define safe primitives and world-valid effect families while individual worlds define “spell,” “technology,” “psionics,” or “ritual.”

## 9. Combat system

The platform's default assets/templates favored third-person action, which influenced many early creations. Reviewers repeatedly saw action-adventure games because movement, camera and combat templates made that genre the lowest-friction starting point. [PS08](#ps08) [PS09](#ps09)

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

Creators could change camera/control rules enough to produce first-person shooters, 2D platformers, racers and other genres, demonstrating that “combat system” was not a fixed runtime subsystem exposed identically to every creation. [PS09](#ps09) [PS17](#ps17)

### Performance constraint

WorthPlaying's review reported pauses in Team Dakota's own Void Storm when enemies died and degradation in some object-heavy community creations. The exact bottleneck was not instrumented in that review, so it would be incorrect to attribute it to a particular engine subsystem. The useful lesson is simply that *expressive creation needs understandable runtime budgets*, not only permissive authoring. [PS09](#ps09)

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

The GameSpot healer example is useful because the companion's “intelligence” is legible: follow, inspect player health, heal under a threshold, play the custom action. [PS11](#ps11)

A Guardian review described the system as allowing creators to set enemy intelligence levels and configure interactions through menus, sliders and brains. [PS18](#ps18)

**OpenLegend distinction:** Project Spark shows the benefit of inspectable behavioral programs, but OpenLegend's living actors aim to have persistent identity, memory, plans and bounded autonomous cognition. A WHEN/DO policy can still be valuable as a **native capability/policy layer** underneath that cognition.

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

Crossroads let a player generate an adventure while making choices instead of starting from a blank authoring UI. Reviews and previews describe it as a route into quests and missions, while the normal editor allowed much more granular behavior. [PS04](#ps04) [PS07](#ps07)

### Champions Quest / Void Storm

First-party Champions Quest content provided a more conventional authored action-adventure demonstration. WorthPlaying described Void Storm as a multi-level adventure and alternate tutorial: players select among leveling heroes, fight and solve familiar puzzles, but the reviewer found the action functional rather than especially deep. [PS09](#ps09)

### Conker's Big Reunion

In April 2015 Team Dakota released **Conker's Big Reunion**, an approximately hour-long first episode built with the same Project Spark tools available to users. It was accompanied by a Conker Creation/Builder pack containing hundreds of characters, props, terrain, effects, sounds and other assets. Microsoft also seeded selected community creators with those assets; launch day included ten community-made Conker experiences, including a four-player arena and recreated scenes. [PS16](#ps16) [PS19](#ps19)

Game Informer reported positively on the resulting voice work, familiar characters and tone. Only the first planned episode shipped before the platform's later change of direction/shutdown. [PS20](#ps20)

This is a strong platform demonstration pattern: **ship a polished first-party experience using the same public primitives**, then release its components so creators can recombine them.

## 12. Multiplayer, collaboration and social creation

Microsoft announced and shipped multiplayer creation/play capabilities on Xbox One. Contemporary review coverage describes online collaborative editing: two creators could edit/playtest together and move directly between testing and editing without rebuilding a session. E3 messaging described support for up to four players in play and create modes. [PS09](#ps09) [PS21](#ps21)

Community-created multiplayer games included competitive arenas and other custom modes. Multiplayer rules themselves could still be authored through Kode; the platform did not require every creation to be cooperative or competitive.

### Sharing and remix lineage

Shared creations could be downloaded and remixed. Project Spark tracked contribution/lineage information so derivative work could retain attribution. Later update notes/community documentation describe contribution values used to distribute download-related rewards among contributors. [PS13](#ps13)

This makes provenance a gameplay-platform primitive rather than a legal footnote.

**OpenLegend lesson:** if an invention imports another invention's mechanic, provenance should remain inspectable through composition. Otherwise debugging, compatibility, permissions and creator recognition all become harder.

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

Project Spark also became a medium for nontraditional projects: Linkin Park used it for an interactive music-video experience whose project could be downloaded and modified. [PS22](#ps22)

That matters for OpenLegend because an invention platform may produce **tools, demonstrations, stories, social spaces or simulations**, not only conventional quest content.

## 14. Art, audio, interface and feel

Critics described a colorful, stylized, slightly clay-like/Fable-adjacent visual language. This worked well for generic fantasy assets but also made early creations visually related even when their rules differed. [PS08](#ps08) [PS09](#ps09)

The interface intentionally avoided exposing ordinary programming syntax. Kode tiles, radial/menu choices and prebuilt brains were the programming surface. That lowers syntax burden but does not remove systems thinking; multiple reviews say rule interactions become genuinely difficult as complexity increases. [PS08](#ps08) [PS23](#ps23)

Input tradeoffs were substantial:
- PC keyboard/mouse made precise editing easier;
- Xbox controller integration was functional but more cumbersome for detailed creation;
- Kinect enabled distinctive animation/voice capture;
- cloud saves let a creator switch devices. [PS04](#ps04) [PS17](#ps17)

The best design lesson is not “visual coding is easy.” It is: **remove incidental syntax while preserving the causal structure the creator must understand**.

## 15. Progression, economy and monetization changed fundamentally

Project Spark had three materially different economic phases.

### Phase 1 — beta / launch: free core + paid or earned content

The base program was free. Additional themes/assets/first-party content could be unlocked using **credits** earned through play/progression or **tokens** purchased with money. A retail Starter Pack bundled content and premium benefits. Early beta also experimented with time-limited access (“Spark Time”); negative feedback led Microsoft to remove that mechanic. [PS02](#ps02) [PS24](#ps24)

Some content was also level-gated. Critics and players objected because a creation tool could visibly show an asset yet block it behind level, grind or payment. [PS15](#ps15) [PS23](#ps23)

### Phase 2 — 2015 bundles / maturity

Microsoft sold larger bundles including Year One content. In July 2015 it reported almost **3 million downloads** and more than **15 million plays of user-created content**; some loyal/heavy users received Spark Premium based on hours, downloads or spending. These are participation metrics, not paid-unit sales or retention. [PS25](#ps25)

### Phase 3 — October 5, 2015: everything becomes free

Microsoft transitioned Project Spark into a **free and open creation engine**. Previously paid DLC became unlocked, the Marketplace and token/credit economy were retired, creator capacity limits were expanded, and Microsoft shifted away from producing paid DLC/active feature development toward community-created content. [PS26](#ps26)

This solved the entitlement fragmentation but removed the prior monetization model. It did not by itself guarantee a sustainable service.

## 16. Discovery, community and the “play” problem

At launch Microsoft said more than one million beta creators had logged four million creation hours and produced 70,000 levels. The system surfaced recent/featured content and allowed users to download or remix creations. [PS02](#ps02)

Yet several reviews found **discovery weaker than authoring**:
- Ars Technica liked the creation tools but found filtering/feedback rudimentary and many projects more like remix shells than satisfying standalone games.
- the Irish Independent saw some gems among a large amount of unfinished work;
- WorthPlaying saw real genre variety, but explicitly warned that people who only wanted polished experiences were getting community-made work with variable quality. [PS08](#ps08) [PS09](#ps09) [PS23](#ps23)

This is a central OpenLegend warning. If it becomes dramatically easier to create a mechanic/world, supply grows faster than curation. **Creation abundance makes discovery quality more important, not less.**

## 17. Development, production and lifecycle

### Origins and public development

Project Spark was announced at E3 2013 as a Microsoft creation platform influenced by Kodu-like visual logic. Windows 8.1 public beta opened in December 2013; Xbox One beta followed in March 2014. Team Dakota repeatedly used beta creators as both testers and content suppliers. [PS01](#ps01) [PS04](#ps04)

### Full release

The Xbox One/Windows release launched October 7, 2014 after roughly six months of beta, with digital free access plus a paid Starter Pack. Microsoft framed the product as continually evolving rather than “finished” in the conventional boxed-game sense. [PS02](#ps02)

### Content expansion

2014–2015 updates added/expanded Champions, sci-fi content, multiplayer, creator tools, first-party adventures and licensed Conker content. The service was simultaneously an engine, UGC network and DLC business.

### End of active development

On October 5, 2015 the commercial content model was removed and all DLC was opened. Microsoft explicitly said it was pivoting away from DLC and active feature development toward the community. [PS26](#ps26)

### Delisting and shutdown

On **May 13, 2016**, Microsoft stopped offering Project Spark for new download. Existing users could continue online until **August 12, 2016**, when online services were shut down. After shutdown users could no longer download UGC or upload creations; users who wanted community content offline had to download it beforehand. [PS27](#ps27) [PS28](#ps28)

This is materially different from Dreams: Project Spark's networked sharing ecosystem actually became unavailable.

No layoffs were reported as part of the final decision because many team members had already moved to other Microsoft projects. The community manager said it was no longer feasible to keep doing the backend, updates and bug fixes needed to run the service. [PS27](#ps27)

## 18. Five written reviews: what critics liked and disliked

These are five independently published written reviews read for this pass.

### 1. Game Informer — Kyle Hilliard, October 17, 2014

**Liked:** terraforming immediately produces a sense of authorship; the broad tool/template/object library can spark creativity even in someone not already committed to game design; downloading and remixing others' creations is an effective learning route; visuals and music are appealing; mistakes are recoverable.

**Disliked / friction:** the first-party teaching game felt unfinished; initial tutorials emphasized one basic third-person game and left many advanced possibilities to external/community learning; Kode becomes daunting; controller editing leads to frequent wrong-button mistakes. Hilliard's conclusion was that the tool rewards people willing to study rather than automatically making everyone a designer. [PS29](#ps29)

### 2. Ars Technica — Steven Strom, October 12, 2014

**Liked:** Project Spark felt like the deep, genuinely useful version of the Kodu idea; the visual behavior system could model real game-design logic; changing large portions of a world was surprisingly approachable; the creation pillar was rich enough for prototyping serious ideas.

**Disliked / friction:** good game design still required patience and testing; many early community creations were remix shells or mediocre standalone games; feedback tools were thin; search/filtering was weak; the platform could feel lonely despite its share rhetoric. [PS08](#ps08)

### 3. The Guardian / Observer — Andy Robertson, October 26, 2014

**Liked:** generation and behavior tools made game-development concepts approachable; users could adjust movement/intelligence through preconfigured brains, menus and sliders; the system connected its visual interaction model to real programming logic better than several contemporary toybox competitors; community/tutorial support was already useful.

**Qualification:** Robertson noted that making *something* playable was quick while making genuinely engaging work took longer. His review was more positive than several peers about the tutorials and accessibility, which is a useful disagreement rather than something to smooth away. [PS18](#ps18)

### 4. Irish Independent — Ronan Price, November 4, 2014

**Liked:** powerful enough to make action-adventures, shooters, platformers and puzzles; free base access allowed meaningful experimentation; remixing higher-rated creations was an effective learning method; visual programming was more approachable for newcomers than a professional engine; Kinect animation capture was distinctive.

**Disliked / friction:** launch monetization was intrusive; credit acquisition felt slow; many community levels were bland/unfinished; tutorials/documentation were inadequate for behavior programming, forcing users toward community YouTube tutorials. [PS23](#ps23)

### 5. WorthPlaying — Brian Dumlao, November 26, 2014

**Liked:** terrain creation was easy to learn; Kode became understandable through practice; PC editing was precise while the console UI remained usable; playtesting was nearly immediate; Xbox online co-creation made collaboration valuable; the community showed multiple genres and reusable asset packs.

**Disliked / friction:** advanced tutorials were missing; premium-content ownership limited creation/remixing; first-party Void Storm was mechanically basic; some object-heavy action exhibited performance stalls. The reviewer recommended the free version for players and the Starter Pack mainly for creators needing broader assets. [PS09](#ps09)

### Steam review boundary

**Steam reviews are not applicable.** Project Spark was distributed through Xbox / Windows Store infrastructure, not Steam. This dossier therefore uses direct Xbox-era player testimony instead of inventing a Steam sample.

## 19. Direct player testimony and preferences

Metacritic's self-selected Xbox user reviews illustrate the same tensions:
- positive users highlighted the huge option space, community creativity and ability to rapidly build alternate genres;
- a mixed user praised the platform but objected to severe frame-rate problems, level-gated creator assets and weak browsing/discovery;
- some users explicitly found the number of options intimidating rather than liberating. [PS15](#ps15)

GameFAQs preserves a 6.9 user-score snapshot from 161 reviews, but that aggregate should not be treated as a representative survey. It is useful only as evidence that player reaction was more divided than the broad critical reception. [PS30](#ps30)

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

## 20. Commercial and participation evidence

Public metrics are incomplete and use different definitions:
- at launch: **>1 million creators**, **4 million creation hours**, **70,000 levels** during beta; [PS02](#ps02)
- July 2015: **almost 3 million downloads** and **>15 million plays of UGC**; [PS25](#ps25)
- September 2015 Microsoft described hundreds of thousands of creators and very high ongoing UGC/object activity while announcing the free-content transition. [PS26](#ps26)

None of those numbers is lifetime revenue, retention, daily users or paid software units. No reliable complete revenue/profit series was found in this pass. The shutdown itself proves that Microsoft ended the service, not which individual feature or business decision caused that outcome.

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

## Sources

<a id="ps01"></a>**PS01 — [Project Spark Beta Is Live on Windows 8.1](https://news.xbox.com/en-us/2013/12/03/games-project-spark-beta/).** Xbox Wire / Microsoft, 2013-12-03. Primary beta description: world building, Crossroads and brains.

<a id="ps02"></a>**PS02 — [What Will You Create? Project Spark Launches Online and at Retail](https://news.xbox.com/en-us/2014/10/07/games-project-spark-launches-online-and-at-retail/).** Xbox Wire / Microsoft, 2014-10-07. Primary launch, platform, beta metrics, free/retail model and creation positioning.

<a id="ps03"></a>**PS03 — [Microsoft's Project Spark game creation package gets October release](https://www.theguardian.com/technology/2014/jul/09/microsoft-project-spark-game-creation-package-october-release) and [GameFAQs Xbox 360 release record](https://gamefaqs.gamespot.com/xbox360/723506-project-spark).** Contemporary reporting notes the announced Xbox 360 version disappeared from launch messaging; release database records it cancelled. The 360 build is not treated as shipped.

<a id="ps04"></a>**PS04 — [Project Spark Beta Comes to Xbox One Today](https://news.xbox.com/en-us/2014/03/04/project-spark-beta-comes-to-xbox-one-today/).** Xbox Wire / Microsoft, 2014-03-04. Primary Kinect animation/voice, cloud save/cross-device controls and Crossroads/tutorial explanation.

<a id="ps05"></a>**PS05 — [Project Spark: An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/).** GameSpot, 2013. Hands-on creator preview; terrain/character-brain examples and healer construction.

<a id="ps06"></a>**PS06 — [Project Spark review](https://worthplaying.com/article/2014/11/26/reviews/94234-xbox-one-review-project-spark/).** WorthPlaying / Brian Dumlao, 2014-11-26. Full review with terrain, prop placement/scaling, editing, collaboration and creation-economy details.

<a id="ps07"></a>**PS07 — [Project Spark preview / early hands-on coverage](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/) and [Xbox beta guide](https://news.xbox.com/en-us/2014/03/04/project-spark-beta-comes-to-xbox-one-today/).** Used for Crossroads and creator flow; does not establish every later release rule.

<a id="ps08"></a>**PS08 — [Project Spark review: If it's in the game (design)...](https://arstechnica.com/gaming/2014/10/project-spark-review-if-its-in-the-game-design/).** Steven Strom, Ars Technica, 2014-10-12. Full launch-era review of Kode depth, discovery, feedback and UGC quality.

<a id="ps09"></a>**PS09 — [Xbox One Review — Project Spark](https://worthplaying.com/article/2014/11/26/reviews/94234-xbox-one-review-project-spark/).** Brian Dumlao, WorthPlaying, 2014-11-26. Full review: editor, co-creation, platform controls, content restrictions, Void Storm and performance.

<a id="ps10"></a>**PS10 — [How the brains work](https://projectspark.fandom.com/wiki/How_the_brains_work).** Project Spark community wiki. Historical mechanics reference for Kodu-derived WHEN/DO rules and tick/order semantics; community documentation, not a surviving official manual.

<a id="ps11"></a>**PS11 — [Project Spark: An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/).** GameSpot hands-on report. Directly documents follower-healer brain, 75% health condition, Kinect action and team logic.

<a id="ps12"></a>**PS12 — [Xbox One preview: Microsoft's E3 games](https://www.theguardian.com/technology/2013/jun/14/xbox-one-preview-microsoft-e3-games).** The Guardian, 2013-06-14. Contemporary demonstration of generated terrain, creature behavior and quest-building ambition.

<a id="ps13"></a>**PS13 — [CODENAME: Hippo](https://projectspark.fandom.com/wiki/CODENAME%3A_Hippo).** Historical community documentation of the Champions/lineage update: skill/appearance unlocks and contribution tracking. Used as lower-confidence mechanics history, not current service evidence.

<a id="ps14"></a>**PS14 — [Project Spark achievements / launch-era Champion progression](https://news.xbox.com/en-us/2014/10/15/games-project-spark-achievements/), plus archived community Champion tables.** Microsoft confirms Champion leveling to level 20 in release achievements; community tables supply ability examples. Exact historical tuning is not generalized beyond its version.

<a id="ps15"></a>**PS15 — [Project Spark user reviews](https://www.metacritic.com/game/project-spark/user-reviews/?platform=xbox-one).** Self-selected Xbox-era player reviews. Used qualitatively for option-space praise, frame-rate/discovery complaints and frustration with level-gated creator assets.

<a id="ps16"></a>**PS16 — [Conker's Big Reunion launch details](https://www.gamespot.com/articles/conker-s-big-reunion-launches-tomorrow-with-10-fre/1100-6426822/).** GameSpot / Ivan Ho, 2015-04-22. First-party episode made in public tools, community creations, multiplayer-arena example and asset-pack scope.

<a id="ps17"></a>**PS17 — [Project Spark release / beta reporting](https://www.theguardian.com/technology/2014/jul/09/microsoft-project-spark-game-creation-package-october-release).** The Guardian, 2014-07-09. Genre breadth, PC/controller contrast, microtransaction controversy and community tutorials.

<a id="ps18"></a>**PS18 — [Project Spark review — bringing games development to the masses](https://www.theguardian.com/technology/2014/oct/26/project-spark-review-games-development-masses).** Andy Robertson, The Observer/Guardian, 2014-10-26. Full written review of accessibility, brains, controls and programming-logic connection.

<a id="ps19"></a>**PS19 — [Conker's Big Reunion is a $5, hour-long episode](https://www.gamespot.com/articles/conker-s-bad-fur-day-project-spark-dlc-is-a-5-hour/1100-6426498/).** GameSpot, 2015-04-08. Contemporary episode, pricing and creation-pack details.

<a id="ps20"></a>**PS20 — [Test Chamber — Project Spark: Conker's Big Reunion](https://gameinformer.com/b/features/archive/2015/04/24/test-chamber-project-spark-conker-39-s-big-reunion.aspx).** Game Informer, 2015-04-24. Contemporary qualitative response to the shipped episode. Video itself is not represented as fully watched.

<a id="ps21"></a>**PS21 — [Project Spark — Multiplayer Announcement — E3 2014](https://www.youtube.com/watch?v=rL3yIVVHxVI).** Official Project Spark upload metadata states four-player multiplayer in both Create and Play over Xbox Live; review evidence corroborates shipped collaborative creation. Video content beyond supplied metadata was not independently transcribed.

<a id="ps22"></a>**PS22 — [Project Spark used for Linkin Park music video](https://worthplaying.com/article/2014/3/25/news/91798-project-spark-all-used-for-linkin-park-music-video-trailer/).** Contemporary report of a downloadable/remixable nontraditional creation and cross-platform/cloud capability.

<a id="ps23"></a>**PS23 — [Project Spark review: DIY gaming](https://www.independent.ie/entertainment/games/project-spark-review-diy-gaming/30717159.html).** Ronan Price, Irish Independent, 2014-11-04. Full review with visual-programming accessibility, microtransaction, tutorial/documentation and UGC-quality criticism.

<a id="ps24"></a>**PS24 — [Project Spark removes Spark Time after beta feedback](https://www.engadget.com/2014-03-20-project-spark-spark-time-premium.html).** Engadget, 2014-03. Contemporary reporting of beta monetization change and Spark Premium. Historical only.

<a id="ps25"></a>**PS25 — [Xbox/PC Get $50 Version of Free-to-Play Game Project Spark](https://www.gamespot.com/articles/xboxpc-get-50-version-of-free-to-play-game-project/1100-6429252/).** GameSpot, 2015. Nearly 3m downloads, >15m UGC plays, Year One bundle and Premium qualification; metrics are not revenue/retention.

<a id="ps26"></a>**PS26 — [Project Spark transition to free/open creation engine](https://news.xbox.com/en-us/2015/09/28/games-project-spark-transition/).** Xbox Wire / Microsoft, 2015-09-28. Primary October 5 transition: paid DLC unlocked, Marketplace/economy retired, creator limits expanded and active-development/DLC focus shifted.

<a id="ps27"></a>**PS27 — [Microsoft Ends Support for Project Spark](https://gameinformer.com/b/news/archive/2016/05/13/microsoft-ends-support-for-project-spark-no-resulting-layoffs.aspx).** Game Informer, 2016-05-13, reproducing/quoting the official community-manager announcement: delisting, August 12 service end, UGC preservation warning and staffing context.

<a id="ps28"></a>**PS28 — [Microsoft's Project Spark becomes free-to-nobody on August 12](https://arstechnica.com/gaming/2016/05/todays-bad-tech-news-on-a-friday-story-comes-courtesy-of-project-spark/).** Ars Technica, 2016-05-13. Independent contemporaneous shutdown report; confirms immediate download/store removal and August content-server closure.

<a id="ps29"></a>**PS29 — [Project Spark Review — Build An Estimation Of Your Dream Game](https://gameinformer.com/games/project_spark/b/xboxone/archive/2014/10/17/game-informer-project-spark-review.aspx).** Kyle Hilliard, Game Informer, 2014-10-17. Full review.

<a id="ps30"></a>**PS30 — [Project Spark — GameFAQs reviews](https://gamefaqs.gamespot.com/xboxone/718569-project-spark/reviews).** Historical aggregate/links showing Xbox user-score context. Self-selected and not treated as representative.
