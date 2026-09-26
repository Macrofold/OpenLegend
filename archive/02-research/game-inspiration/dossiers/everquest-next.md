# EverQuest Next — full research dossier

**G18 · Complete research pass, September 26, 2026.** *EverQuest Next* (EQN) was cancelled in March 2016 and never released to the public as a finished MMO. This dossier therefore studies **documented design, prototypes, demonstrations, developer interviews and contemporary previews**, not fabricated shipped mechanics or player reviews. Its separately released sibling **Landmark** is used only where it implemented/shared technology or exposed the intended creation pipeline; Landmark is not silently treated as EverQuest Next. [Preserved earlier chapter](../games/everquest-next.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

EQN is unusually relevant to OpenLegend because its public design aimed at many of the same hard problems:

- NPCs acting from preferences rather than fixed spawn scripts;
- world state changing from aggregate player action;
- stories expressed through world events rather than quest-marker repetition;
- classes discovered in the world and recombined horizontally;
- destructible layered terrain;
- players helping create the world;
- persistent server-specific history.

The equally important lesson is that **ambitious systemic components do not guarantee an enjoyable assembled game**. Daybreak's president said the project achieved impressive technical feats but, when the pieces were put together, “it wasn’t fun.” [EQN01](#eqn01)

## 1. Identity, scope and player promise

EverQuest Next was planned as a new free-to-play massively multiplayer RPG set in a **reimagined/parallel Norrath**, not simply EverQuest III with modern graphics. Sony Online Entertainment (SOE), later Daybreak Game Company, publicly unveiled the rebooted direction in August 2013 after abandoning a more conventional earlier version. [EQN02](#eqn02) [EQN03](#eqn03)

The public design was organized around four “Holy Grails”:

1. **Change the core game** — replace standard level/quest treadmill assumptions with horizontal multiclass progression.
2. **Destructibility** — make the terrain/world physically changeable and explorable below the surface.
3. **A Life of Consequence** — NPCs and groups act through emergent-AI motivations and remember/respond to player behavior.
4. **Permanent Change** — large Rallying Calls change the server world over long time spans. [EQN02](#eqn02) [EQN04](#eqn04)

It is essential to preserve the tense correctly:

> SOE **planned and demonstrated pieces of** these systems. No public retail game existed in which ordinary players could verify their integration at scale.

## 2. Character creation and identity

EQN was intended to retain familiar MMO avatar identity while loosening class identity.

Public demos showed stylized heroic fantasy characters such as:
- human wizard;
- Kerran warrior.

The art direction used exaggerated features and readable silhouettes/expressions rather than EverQuest's older quasi-realistic proportions. Contemporary PC Gamer reporting noted that this DreamWorks-like style divided long-time fans even while making character emotion/action easier to read at distance. [EQN05](#eqn05)

Traditional race/lore identity still mattered, but **class was meant to be collectible rather than permanent**.

That is the first major OpenLegend lesson:

> identity can be layered: body/race/history can be persistent while learned roles remain recombinable.

## 3. No traditional levels: horizontal class collection and tiers

Lead designer Darrin McPherson explicitly said progression was **not based on ordinary character levels**. It used:
- shallow tiers;
- class-specific advancement;
- accomplishment requirements;
- equipment progression;
- discovery/collection of roughly **40 classes** planned at launch. [EQN06](#eqn06)

A player's long-term progression fantasy was therefore:

1. begin with access to a smaller set of classes;
2. discover other classes through world interaction;
3. advance each class through tiers/accomplishments;
4. acquire equipment appropriate to those tiers;
5. combine learned abilities into personalized builds;
6. keep finding new roles without making an old friend numerically irrelevant.

The team explicitly described the design as having some vertical power growth inside a class but emphasizing **horizontal breadth**. [EQN06](#eqn06)

### Veteran + newcomer play

Because there was no enormous global character-level number, SOE intended veteran and new players to remain able to adventure together. A veteran could work on a less-developed class/build rather than requiring a mentoring/downscaling system. [EQN07](#eqn07)

That is a strong OpenLegend principle for social worlds:
- progression should create **more options and history**;
- it need not make older players categorically unable to participate with newer ones.

## 4. Classes were supposed to be discovered in the world

Players would not simply receive every role from a character-creation dropdown.

Developer examples suggested class access could come from:
- helping an NPC/faction;
- making a particular moral/social choice;
- discovering a trainer/group;
- world accomplishments.

Engadget's SOE Live account used a concrete example:
- encounter orcs attacking a human settlement;
- aid humans → future human opportunities;
- aid orcs → the orcs might teach a class unavailable from the humans. [EQN07](#eqn07)

That ties **mechanical capability acquisition to social consequence**.

OpenLegend can use this pattern broadly:
- a necromancy school is learned from people who trust you;
- a profession is licensed by an institution;
- a forbidden technique requires entering a relationship with a faction;
- a sensory adaptation requires a bodily change.

“Skill tree” and “world story” become the same system.

## 5. Eight active abilities and readable build composition

Public design materials described an active combat bar of approximately:
- **4 weapon abilities**;
- **4 character/class abilities**. [EQN07](#eqn07) [EQN08](#eqn08)

Weapon abilities depended on:
- active class;
- equipped weapon.

Character abilities were drawn from learned class capabilities and could include categories such as:
- offense;
- defense;
- movement;
- utility. [EQN08](#eqn08)

A Warrior wielding a different weapon could gain a different attack vocabulary; a multiclass build could borrow class abilities to create combinations such as the developers' examples of teleporting rogues or unusual hybrid fighters. [EQN06](#eqn06) [EQN09](#eqn09)

### Why a limited active set matters

Forty collectable classes could easily become unreadable if every learned action remained on screen simultaneously.

The small active vocabulary was intended to:
- force loadout decisions;
- improve action combat readability;
- make another player's current behavior visually inferable;
- reduce hotbar sprawl.

This is useful for OpenLegend's invention system:

> world capability can be huge while **moment-to-moment actionable affordances stay bounded**.

An NPC may know hundreds of things and own many tools, but the current situation should surface a manageable subset.

## 6. Equipment and items were meant to express material/build identity

EQN's item details were never fully finalized publicly, but McPherson described weapons assembled from multiple parts/materials because different class and multiclass builds would value different properties.

He also emphasized visual readability:
- experienced players should be able to look at a weapon;
- recognize components/material;
- infer something about its properties. [EQN06](#eqn06)

Armor and weapons were tied into class-tier advancement.

### Design pattern

This is more interesting than “rare sword +12” when:
- composition is visible;
- material changes properties;
- class/build determines usefulness;
- gear is part of progression rather than a disconnected drop number.

OpenLegend inventions can preserve this:
- bronze versus glass versus living wood should change actual behavior;
- components should carry capabilities;
- visual form can expose enough information for other actors to reason about the object.

### Evidence limit

EQN never released, so there is no verified full loot-table, crafting economy, durability model or endgame item loop to document.

## 7. Crafting: intended to be a major role, but incomplete publicly

SOE repeatedly said crafting would matter deeply and Rallying Calls included explicit crafter contributions.

Examples:
- gather materials for a new settlement;
- build fortifications;
- construct infrastructure;
- create equipment whose materials/parts mattered. [EQN04](#eqn04) [EQN06](#eqn06)

The public material did **not** expose a complete final crafting recipe/economy system.

The important structural idea is more valuable anyway:

> crafters would contribute to shared world change, not merely manufacture combat consumables for fighters.

In OpenLegend:
- builders;
- doctors;
- researchers;
- diplomats;
- farmers;
- priests;
- logistics workers

should be able to change world outcomes through their actual domain rather than through disguised combat quests.

## 8. Heroic movement: movement itself as capability

The public demo showed a “heroic movement” / parkour-like traversal system.

Contemporary preview descriptions include:
- vaulting;
- slides;
- double jumps;
- wall interactions;
- gliding;
- responsive traversal over obstacles. [EQN10](#eqn10) [EQN11](#eqn11)

The purpose was not just animation polish. A vertically layered destructible world needs movement that makes newly opened paths usable.

This creates a good system dependency:

**terrain destruction → new geometry → traversal capability → discovery**

If a player collapses a floor and reveals a cavern but movement only follows marked roads, destructibility is mostly spectacle.

OpenLegend should similarly connect:
- body capability;
- environment;
- movement;
- tool use.

## 9. Destructible terrain: the world as layered state

SOE emphasized large-scale destruction as a foundational technology:
- break ground;
- collapse structures/terrain;
- create avalanches;
- descend through multiple subterranean layers;
- discover ruins/dungeons/resources below the surface. [EQN02](#eqn02) [EQN09](#eqn09)

The public vision was **not** “every voxel is permanently removed forever by one player.” An MMO must reconcile:
- destructive freedom;
- shared-world persistence;
- content recovery;
- griefing;
- server cost;
- navigation.

The exact final policy never shipped.

### The stronger idea: hidden vertical world layers

Destruction was supposed to reveal:
- deeper strata;
- old civilizations;
- monsters;
- resources;
- encounters.

This turns excavation into **knowledge acquisition** rather than cosmetic terraforming.

OpenLegend can borrow that without global voxel destruction:
- walls can hide rooms;
- mining changes access/resources;
- floods/fire alter routes;
- underground institutions exist because geology supports them.

The important property is **world topology changes from action**.

## 10. Emergent AI: preferences rather than spawn points

EQN's proposed “emergent AI” is one of the closest historical analogues to OpenLegend's world-agent/actor ambitions.

SOE's recurring orc example:
- orcs prefer places where travelers are vulnerable;
- dislike heavy guard presence/settled safety;
- establish themselves where conditions suit them;
- if players patrol/clear that location repeatedly, it stops being attractive;
- the group moves and seeks another suitable area. [EQN09](#eqn09) [EQN12](#eqn12)

That means the designer does **not** say:
> spawn 8 orcs at X every 10 minutes.

Instead the designer says something closer to:
> this group wants wealth/opportunity and avoids overwhelming security.

The world state supplies candidate places.

### Why this matters

A static spawn is:
- predictable;
- local;
- content-author-controlled.

A preference-based actor/group is:
- reusable;
- capable of migrating;
- sensitive to other systems;
- capable of creating unexpected conflict.

This is directly useful for OpenLegend:
- wolves seek prey and avoid dense settlement;
- thieves seek valuable low-security targets;
- scholars relocate toward archives;
- merchants favor safe profitable routes;
- refugees move away from war.

## 11. Storybricks: emotional/motivational AI ambition

SOE partnered with AI startup **Storybricks**.

Developer interviews describe the design goal as NPCs/groups having:
- motivations;
- preferences;
- emotions/needs;
- behaviors based on context;
- activity even when the player is not directly interacting with them. [EQN13](#eqn13) [EQN14](#eqn14)

Stéphane Bura described wanting orcs to “do stuff” even when players were not killing them, so combat would have context. [EQN14](#eqn14)

### Important boundary

This was **not an LLM conversational agent system**.

The public model was closer to:
- authored traits/desires;
- world tags/context;
- utility/behavior selection;
- group goals;
- dynamic event triggers.

OpenLegend can combine this deterministic/structured substrate with language-model cognition.

### Production warning

In February 2015, Daybreak ended the direct Storybricks partnership, saying it would bring the work in-house and retain/use prior work. Storybricks itself shut down shortly afterward for reasons its founders said were not caused by the SOE sale. [EQN15](#eqn15) [EQN16](#eqn16)

The final state of EQN's AI implementation at cancellation was never publicly proven.

Do not write:
> “Storybricks failed, therefore emergent AI failed.”

The evidence only establishes:
- collaboration ended;
- technology/work was partly retained;
- project later cancelled;
- Daybreak said the assembled game was not fun.

## 12. “A Life of Consequence”: memory and reputation

SOE's design pitch said player actions would be remembered.

The settlement/orc example demonstrates the intended consequence:
- help humans;
- humans remember;
- gain human opportunities;
- orcs may dislike you.

Or:
- aid orcs;
- gain access/training with them;
- humans/guards may deny opportunities. [EQN07](#eqn07) [EQN17](#eqn17)

This is stronger than a universal “karma +5” meter because **different groups remember the same action differently**.

OpenLegend should prefer:
- event provenance;
- observer knowledge;
- relationship/faction interpretation

over one omniscient morality number.

### Individual versus group memory

Public EQN messaging sometimes spoke broadly about “NPCs remembering,” but most concrete examples are faction/group/world consequences rather than a demonstrated simulation where every individual has rich autobiographical memory.

That distinction matters. OpenLegend's design is more ambitious at the personal level.

## 13. Quests without static quest hubs

EQN wanted to move away from:
- fixed exclamation marks;
- static camps;
- repeatable identical quest chains.

Instead, opportunities would arise because:
- an NPC/group wanted something;
- a local condition changed;
- player behavior created a conflict;
- a Rallying Call entered a new phase. [EQN04](#eqn04) [EQN07](#eqn07)

### Constructed example from SOE's own design scenario

1. players begin founding Halas;
2. crafters gather/build;
3. nearby hostile group reacts;
4. players defend or choose another strategy;
5. quarrying exposes a deeper threat;
6. enemies ally/escalate;
7. the settlement grows or is damaged;
8. the final server state becomes history. [EQN04](#eqn04)

That is not “one quest with branching dialogue.” It is intended as **world-state-driven narrative**.

## 14. Rallying Calls: months-long public stories

Rallying Calls were large, server-wide story arcs intended to last **months**, not minutes.

Players could contribute through different activities:
- construction;
- gathering;
- combat;
- exploration;
- defense.

The world and AI could react between phases. [EQN04](#eqn04) [EQN17](#eqn17)

Examples included:
- founding/building a city;
- defending it;
- consequences of mining/excavation;
- hostile alliances;
- later destruction/replacement.

SOE explicitly said a finished Rallying Call would not simply reset for the next group of players; server histories could diverge. [EQN07](#eqn07) [EQN18](#eqn18)

### OpenLegend inspiration

This is one of the best historical precedents for:

> **world arcs as durable consequences rather than instanced quest content.**

A migration, famine, invention, succession crisis or war can unfold because many actors contribute over time.

### Risk

If a world arc requires enough active users to advance, low population can stall the story.

OpenLegend should allow:
- autonomous NPC progress;
- small-group worlds;
- scaling contribution thresholds

so world history does not require MMO concurrency.

## 15. Permanent change and server-specific history

SOE imagined one server where:
- Halas gets built;
- another where it develops differently;
- another where a conflict destroys or redirects it.

Veterans would be able to tell newcomers:
> this place used to be different.

That is a powerful long-term retention mechanism because **history creates local meaning**.

However, permanence should be read as:
- state persists until something changes it;

not:
- no future destruction/reversal is possible.

Georgeson explicitly noted that a city built earlier could later be destroyed. [EQN04](#eqn04)

OpenLegend's event/history architecture is well suited to this:
- persistent state;
- provenance;
- remembered causal transitions;
- people who experienced prior states.

## 16. Story as behavior, not dialogue dumps

A 2014 Storybricks/EQN panel account says SOE wanted story embedded in:
- organizations;
- kingdoms;
- races;
- individual behaviors;
- world events

instead of primarily delivered by clicking through NPC text. [EQN19](#eqn19)

This is a deep OpenLegend principle:

> lore should create **constraints, motivations and actions**, not merely encyclopedia entries.

If a faction believes a forest is sacred:
- it should patrol;
- restrict logging;
- punish violators;
- reward protection;
- teach related rituals.

The belief becomes mechanics.

## 17. Multiplayer and social structure

As an MMO, EQN assumed a shared persistent world.

Planned social implications included:
- players encountering the same evolving factions;
- collective contribution to Rallying Calls;
- crafters and combatants contributing differently;
- server communities developing distinct history;
- new and veteran players remaining compatible due to horizontal progression.

No final shipped guild/raid/economy system exists to evaluate.

The design is strongest where **different player capabilities affect a shared problem** rather than every player performing the same quest independently.

## 18. Combat

Public demos emphasized action-oriented combat with:
- limited active ability set;
- weapon-dependent attacks;
- class abilities;
- movement;
- visible telegraphs/physical impact;
- destructible environment interactions. [EQN07](#eqn07) [EQN10](#eqn10)

Examples shown/reported included:
- Warrior leaps/slams;
- Wizard area effects;
- shield attacks;
- environmental destruction from powerful attacks. [EQN10](#eqn10)

The combat design aimed to avoid:
- huge hotbars;
- fixed rotations;
- static enemy scripts.

Storybricks discussions also framed combat AI as adapting tactics rather than repeating identical actions. [EQN13](#eqn13)

### Evidence limit

There was no public endgame:
- raid balance;
- PvP meta;
- healing/tanking model;
- death penalty;
- equipment economy

to review as a complete shipped system.

## 19. Looting and rewards

Public evidence supports several intended reward families:
- class discovery;
- class tier advancement;
- armor sets;
- weapons/components/materials;
- world accomplishments;
- exploration discoveries.

The PC Gamer class interview gives one concrete advancement example:
- advance a tier-three Warrior toward tier four by meeting accomplishment/points requirements and acquiring appropriate tier armor. [EQN06](#eqn06)

The planned reward philosophy leaned away from **XP-grind repetition** and toward:
- accomplishments;
- discovery;
- new options;
- build composition.

That is OpenLegend-relevant because long-term progression can reward **new verbs** rather than only larger numbers.

## 20. No conventional “magic system” was fully specified

EQN had fantasy classes such as Wizard and spell-like abilities, but no public source provides a final universal magic ontology comparable to:
- spell slots;
- mana economy;
- schools;
- ritual crafting;
- spell invention.

The known design supports:
- class abilities;
- weapon abilities;
- multiclass mixing;
- movement/utility/offense/defense categories.

Do not infer more.

For OpenLegend, the interesting part is **ability composition**, not EQN's unfinished specific magic rules.

## 21. World map and layered environment

The planned Norrath had:
- above-ground continents/settlements;
- destructible surface;
- multiple underground layers;
- ancient hidden sites;
- dynamic NPC group locations;
- changing settlements/world events. [EQN02](#eqn02) [EQN09](#eqn09)

This is the right structural contrast to theme-park MMO maps where:
- enemies respawn at known coordinates;
- quest hubs remain unchanged forever;
- the same dungeon waits in the same state.

OpenLegend can create a much smaller world and still achieve the valuable part:
**location has state and history.**

## 22. Landmark: public creator technology, not the cancelled MMO itself

**Landmark** began as “EverQuest Next Landmark,” the player-facing voxel/world-creation counterpart.

Players could:
- gather materials;
- claim plots;
- sculpt voxels;
- use selection tools;
- copy/paste;
- smooth;
- mirror;
- build large structures;
- share/templates;
- progress into better creator tools. [EQN20](#eqn20) [EQN21](#eqn21)

SOE used the same/similar tools internally to build EQN environments.

### Player contributions to Norrath

SOE planned and ran contests/workshops where Landmark creators could build structures consistent with EQN racial/world design, with selected creations feeding into development. [EQN22](#eqn22)

This is highly relevant to OpenLegend:

> give players the same **authoring substrate** used for first-party content, then curate contributions into the canonical world.

### But Landmark diverged

Landmark became its own product with:
- building game loops;
- combat added later;
- social/claim systems.

It should not be used as evidence that EQN's:
- emergent AI;
- Rallying Calls;
- class system

were fully implemented.

## 23. Creation as staged production research

SOE explicitly described Landmark as a way to build/test parts of the technology and content pipeline **in public** while EQN was still being built.

Three useful functions:
1. stress-test voxel/destruction tech;
2. improve creator tooling from player feedback;
3. source community architecture/content ideas. [EQN11](#eqn11) [EQN22](#eqn22)

This is a sophisticated product-development pattern.

OpenLegend could similarly expose mature subsets early:
- invention creator;
- scenario builder;
- species builder;
- settlement designer

without pretending the full living-world loop is already done.

## 24. Five substantial written previews / analyses

There can be no honest “five shipped reviews” because EverQuest Next never shipped. These are five independently written, substantial contemporary assessments of the demonstrated design.

### 1. GameSpot — Kevin VanOrd, “A Life of Consequence,” August 2013

**Most compelling:** emergent NPC groups, server history, Rallying Calls, destructibility and the possibility that players create the conditions for new encounters rather than consuming static quest content.

**Concern / uncertainty:** the article repeatedly frames these as very ambitious claims and asks whether SOE can actually pull them together. The preview is excited by the vision, not evidence of a finished world. [EQN04](#eqn04)

### 2. PC Gamer — Chris Thursten, EverQuest Next first look, August 2013

**Most compelling:** community involvement, destructive/exploratory world layers, emergent orc behavior and the chance to restore mystery to MMO exploration.

**Concern / preference split:** long-time EQ fans reacted negatively to the stylized art direction; the preview also recognizes that the promised systems remained aspirational. [EQN05](#eqn05)

### 3. Shacknews — Andrew Yoon, August 2013

**Most compelling:** no fixed enemy spawn points; orcs selecting places that fit their goals; Rallying Calls letting crafters, miners and fighters influence the same evolving situation.

**Concern / uncertainty:** dynamic AI and permanent shared-world change raise obvious implementation/scale questions; the article reports the promise rather than validating long-term production behavior. [EQN09](#eqn09)

### 4. PC Gamer — class/progression interview, August 2013

**Most compelling:** no global level treadmill, roughly 40 discoverable classes, shallow tiers, accomplishment-based advancement, material/part-readable equipment and horizontal experimentation.

**Open question:** crafting details and many classes were explicitly not final/public. It demonstrates design intent, not a balanced progression economy. [EQN06](#eqn06)

### 5. GamesBeat — Mike Minotti, AI interview, 2014

**Most compelling:** developers wanted NPCs with agendas and combat tactics that respond to the world/player rather than static questgiver/spawn behavior; direct Storybricks participation makes this unusually relevant evidence.

**Open question:** sophisticated AI still needs interesting goals, content, world affordances and performance. This interview precedes the later end of the Storybricks partnership and cannot establish the final implementation state. [EQN13](#eqn13)

### Additional production-side warning

PCWorld's 2014 report described EQN as being built “right in front of you,” with Landmark progressively receiving destructibility/depth/AI technologies meant to flow into EQN. That is useful evidence of staged technology development; it also illustrates how far the project remained from an integrated MMO. [EQN11](#eqn11)

## 25. Public/community reaction

Because no open EQN beta/release occurred, public sentiment is mostly:
- reaction to reveal demos;
- speculation;
- Landmark experience;
- disappointment at cancellation.

Recurring excitement centered on:
- real world change;
- destructibility;
- emergent AI;
- horizontal progression;
- freedom from static quest hubs.

Recurring skepticism centered on:
- whether the server could persist so much state;
- whether destruction would be griefable;
- whether emergent AI would actually produce interesting play;
- cartoony art direction;
- whether “no levels” would still become disguised grinding;
- whether Landmark progress represented real EQN progress.

Those concerns are design questions, not player verdicts.

### Steam boundary

**No Steam review sample is applicable.** EverQuest Next was never released.

Landmark's reviews would measure Landmark, not EQN, so they are not substituted here.

## 26. Development history

EverQuest Next existed in multiple development conceptions.

SOE had worked on a more conventional successor before pivoting toward the radical “four Holy Grails” version publicly unveiled in 2013. [EQN03](#eqn03)

The public production stack involved:
- SOE/Daybreak;
- voxel technology associated with Voxel Farm;
- Storybricks collaboration for AI;
- Landmark as public creation/technology sibling.

### Storybricks split

In February 2015 Daybreak said:
- it was no longer working directly with Storybricks;
- prior work would be used;
- AI work would move in-house. [EQN15](#eqn15)

Storybricks then closed as a company, with its founders saying the shutdown was their decision and not caused by the Sony/Daybreak sale. [EQN16](#eqn16)

### Cancellation

On March 11, 2016 Daybreak president Russell Shanks announced development was ending.

His explanation is unusually blunt:
- the team aimed for something revolutionary;
- it accomplished impressive technical feats;
- when the pieces came together, the result “wasn't fun”;
- the project would not meet team/fan expectations. [EQN01](#eqn01)

This is more informative than assigning an outsider's favorite cause.

We should **not** assert:
- Storybricks caused cancellation;
- voxel tech caused cancellation;
- layoffs caused cancellation;
- ambition alone caused cancellation.

Those may be plausible contributing narratives, but the sourced official explanation is broader.

## 27. The most important OpenLegend warning: subsystem success ≠ game success

EQN's design deck can sound like an OpenLegend wish list:
- autonomous groups;
- world memory;
- player consequence;
- dynamic story;
- destructible world;
- creator tools;
- horizontal progression.

Yet the project was cancelled.

That means each OpenLegend subsystem must answer:
> **What fun player decision does this create today?**

Examples:
- NPC memory is useful if it changes trust/access/conflict.
- cognition is useful if it creates surprising-but-legible plans.
- destructibility is useful if it changes routes/resources/strategy.
- invention is useful if it changes world capabilities.
- world history is useful if people/places treat the past as relevant.

A technically impressive simulation can otherwise become infrastructure in search of a game.

## 28. Transferable inspiration for OpenLegend

### A. Preference-based spawning/settlement is superior to static spawn points

EQN's orc example remains excellent:
- desire;
- environmental constraints;
- evaluate world;
- choose suitable place;
- move when conditions change.

OpenLegend can generalize this to:
- animals;
- camps;
- merchants;
- cults;
- refugees;
- institutions.

### B. Group-level agency can complement individual cognition

Not every world decision needs one LLM call per person.

A bandit group can have:
- shared goal;
- resources;
- territory preference;
- threat tolerance.

Individuals can then reason inside that institutional context.

### C. Let capabilities be learned from relationships/world conditions

Discovering a class through helping a faction is much richer than clicking a skill tree.

OpenLegend inventions can define:
- who can teach;
- prerequisites;
- cultural ownership;
- secrecy;
- legality.

### D. Horizontal progression preserves social compatibility

More experienced characters can accumulate:
- breadth;
- reputation;
- tools;
- history;
- specialist mastery

without rendering new players mathematically irrelevant.

### E. World events should use multiple professions

A town-building crisis can require:
- materials;
- engineering;
- defense;
- negotiation;
- food;
- medicine;
- scouting.

This allows different player identities to matter simultaneously.

### F. Server/world history should be genuinely local

If a settlement was never founded in one world:
- its trade routes should not exist;
- descendants should not remember it;
- later wars should differ.

OpenLegend's separate worlds are a natural fit for this.

### G. Story should compile into motivations and opportunities

Lore that says “orcs value wealth and avoid guards” becomes dynamic world behavior.

This is far more useful than lore that only fills a codex.

### H. Creation tools should be tested as a product of their own

Landmark exposed voxel tools and community creation early.

OpenLegend should ensure the invention workflow is:
- legible;
- fun;
- debuggable;
- shareable

before relying on it to generate the whole content ecosystem.

### I. Do not make “emergence” an excuse to omit authored stakes

EQN's cancellation warning suggests that:
- dynamic systems;
- procedural events;
- AI preferences

still need:
- compelling characters;
- clear motivations;
- satisfying feedback;
- authored aesthetic/context;
- good pacing.

OpenLegend should use generation to **multiply intentional design**, not replace it.

## 29. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / promise | §§1, 26 |
| R02 player actions / mechanics | §§3–23 |
| R03 items / entities / composition | §§5–7, 19 |
| R04 progression / economy / time | §§3–7, 14–15 |
| R05 interactions / concrete situations | §§4, 8–15 |
| R06 people / AI / social / multiplayer | §§10–17 |
| R07 art / interface / feel | §§2, 5, 8, 24 |
| R08 story / narrative | §§12–16 |
| R09 production | §§22–27 |
| R10 marketing / distribution / virality | §§22–26 |
| R11 commercial / participation | unreleased; no honest sales/retention data; §26 |
| R12 reviews / player feedback | §24–25, explicitly preview-only |
| R13 inspiration / limits | §§27–28 |
| R14 sources / preservation / navigation | this section + sources |

**Preservation check:** the earlier chapter's caution is preserved: EverQuest Next is not evidence that its ambitious systems worked in a shipped MMO. The most important sourced outcome is Daybreak's own conclusion that the integrated result did not meet its fun/quality bar.

## Sources

<a id="eqn01"></a>**EQN01 — [EverQuest Next Canceled — “It Wasn't Fun”](https://www.gamespot.com/articles/everquest-next-canceled-it-wasnt-fun/1100-6435580/).** GameSpot, 2016-03-11, quoting Daybreak president Russell Shanks' official cancellation letter. Primary-attributed outcome; does not isolate one technical cause.

<a id="eqn02"></a>**EQN02 — [EverQuest Next revealed](https://www.gamespot.com/articles/everquest-next-revealed/1100-6412463/).** GameSpot, 2013-08-02. Contemporary reveal: multiclassing, destructibility, permanent change, emergent AI, Landmark.

<a id="eqn03"></a>**EQN03 — [The Future of the MMORPG Lies in Norrath](https://www.mmorpg.com/previews/the-future-of-the-mmorpg-lies-in-norrath-2000094754).** MMORPG.com, 2013 reveal-era preview; reports earlier conventional design pivot and movement/combat demonstration.

<a id="eqn04"></a>**EQN04 — [EverQuest Next: A Life of Consequence](https://www.gamespot.com/articles/everquest-next-a-life-of-consequence/1100-6412426/).** Kevin VanOrd, GameSpot, 2013-08-02. Detailed contemporary preview of emergent AI, Rallying Calls and permanent/server-specific world change.

<a id="eqn05"></a>**EQN05 — [EverQuest Next first look: a bold, destructible fantasy MMO](https://www.pcgamer.com/everquest-next-1/2/).** PC Gamer, 2013. Contemporary preview including art-style reaction, emergent AI and community creation interest.

<a id="eqn06"></a>**EQN06 — [EverQuest Next interview: no grinding, no leveling](https://www.pcgamer.com/everquest-next-interview/).** PC Gamer interview with lead designer Darrin McPherson and team, 2013. Primary-attributed progression/class/equipment philosophy.

<a id="eqn07"></a>**EQN07 — [SOE Live 2013: EverQuest Next explained](https://www.engadget.com/2013-08-02-soe-live-2013-everquest-next-explained.html).** Engadget/Massively, 2013. Contemporary detailed account of class discovery, eight-action combat, newcomer/veteran compatibility and Rallying Calls.

<a id="eqn08"></a>**EQN08 — [EverQuest Next game-mechanics archive](https://everquestnext.fandom.com/wiki/Game_Mechanics).** Community-maintained historical compilation. Used only to cross-check announced ability-slot/category details; not proof of final implementation.

<a id="eqn09"></a>**EQN09 — [EverQuest Next: SOE's next-generation, fully destructible, persistent MMO](https://www.shacknews.com/article/80467/everquest-next-soes-next-generation-fully-destructible-persistent-mmo).** Andrew Yoon, Shacknews, 2013-08. Detailed reveal account of orc location preferences and Rallying Call roles.

<a id="eqn10"></a>**EQN10 — [EverQuest Next preview](https://www.jeuxvideo.com/articles/0001/00018562-everquest-next-preview.htm).** Jeuxvideo.com, 2013. Contemporary hands-on/reveal coverage of heroic movement, classes and demo combat. French source; used for directly reported demonstrated systems.

<a id="eqn11"></a>**EQN11 — [EverQuest Next is being built “right in front of you”](https://www.pcworld.com/article/434771/everquest-next-is-being-built-right-in-front-of-you-shows-off-new-classes.html).** PCWorld, 2014. Landmark→EQN technology staging, destructibility/depth/AI and Rallying Call distinction.

<a id="eqn12"></a>**EQN12 — [EverQuest Next Wiki — game mechanics](https://everquestnext.fandom.com/wiki/Game_Mechanics).** Historical community source summarizing announced environmental polling and preference-based NPC group placement. Lower confidence than developer interviews; used where consistent with primary-attributed examples.

<a id="eqn13"></a>**EQN13 — [EverQuest Next's NPCs have minds of their own](https://gamesbeat.com/everquest-nexts-npcs-have-minds-of-their-own-interview/).** GamesBeat interview with Dave Georgeson, Darrin McPherson and Storybricks' Stéphane Bura, 2014. Direct design-team account of AI goals.

<a id="eqn14"></a>**EQN14 — [EverQuest Next “a living world” thanks to new AI](https://www.gamereactor.eu/everquest-next-a-living-world-thanks-to-new-ai/).** Gamereactor interview/report, 2014-04-23. Direct Georgeson/Bura quotes on dynamic NPC life and motivations.

<a id="eqn15"></a>**EQN15 — [EverQuest Next no longer working with AI company Storybricks](https://www.shacknews.com/article/88260/everquest-next-no-longer-working-with-ai-company-storybricks).** Shacknews, 2015-02-23. Reports senior producer statement that work moved in-house and prior Storybricks work would be retained.

<a id="eqn16"></a>**EQN16 — [Game Over For Storybricks](https://techcrunch.com/2015/03/08/game-over/).** TechCrunch, 2015-03-08. Founder shutdown account and relationship context; explicitly says the SOE sale was not the cause of Storybricks closing.

<a id="eqn17"></a>**EQN17 — [PC Gamer: world of choice and consequence](https://www.pcgamer.com/everquest-next-developers-tease-a-world-of-choice-and-consequence/).** PC Gamer, 2014. Storybricks/EQN panel reporting on world events, individual/group motivations and server-divergent consequences.

<a id="eqn18"></a>**EQN18 — [EverQuest Next archive](https://everquest.fandom.com/wiki/EverQuest_Next).** Community historical compilation; used to cross-check Rallying Call/permanent-world descriptions, not as sole support for implementation claims.

<a id="eqn19"></a>**EQN19 — [SOE Live 2014: Storybricks AI in EQ Next and Landmark](https://www.engadget.com/2014-08-21-soe-live-2014-the-revolutionary-intelligence-of-storybricks-ai.html).** Engadget/Massively panel account. Narrative-as-behavior and Rallying Call trigger/progression concepts.

<a id="eqn20"></a>**EQN20 — [EverQuest Next Landmark hands-on preview](https://www.pcgamer.com/everquest-next-landmark-hands-on/).** PC Gamer, 2013/2014 pre-alpha hands-on. Direct evidence for Landmark voxel tools, claims and creation workflow; not EQN gameplay evidence.

<a id="eqn21"></a>**EQN21 — [Landmark advanced building tools](https://www.gamespot.com/articles/everquest-next-landmark-dev-diary-shows-off-impressive-building-tools/1100-6417084/).** GameSpot, 2014-01-12. Reports selection/line/mirroring and voxel tooling.

<a id="eqn22"></a>**EQN22 — [Building EverQuest Next in Landmark](https://www.engadget.com/2014-07-03-norrathian-notebook-building-everquest-next-in-landmark.html) and [Shacknews Landmark interview](https://www.shacknews.com/article/85123/everquest-director-discusses-landmarks-growth-and-connection-to-everquest-next).** Contemporary reporting on Workshop/contests and player-created structures feeding intended EQN development.
