# Ultima Online — full research dossier

**G19 · Complete research pass, September 26, 2026.** This dossier treats *Ultima Online* as a continuously operated virtual world whose rules changed substantially across 29 years. Historical mechanics are labeled where they differ from the current production shards. **New Legacy** is a separate seasonal shard/ruleset inside Ultima Online, not a replacement description for the main shards; Season 2 is scheduled for **October 15, 2026** and therefore remains future as of this research date. [Preserved ecology case](../games/ultima-online-s-ecology.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Ultima Online is one of OpenLegend's most important precedents because it treats a game world less as a sequence of combat encounters and more as a place where players can become **blacksmiths, thieves, animal tamers, shopkeepers, homeowners, murderers, guildmates, treasure hunters, mages, fishermen and politicians of informal player society**. Its strongest systems interlock because ordinary actions change ownership, reputation, scarcity and relationships. Its most famous failed subsystem—the original simulated ecology—is equally valuable: elegant simulation collapsed when actual players harvested creatures far more aggressively than the designers' assumptions.

## 1. Identity, release and current status

Origin Systems launched Ultima Online on **September 24, 1997** as a persistent online version of Britannia/Sosaria. The official team marked its 29th anniversary on September 24, 2026, explicitly describing the project as an internet experiment expected to last only a few years that instead endured for 29. [UO01](#uo01)

The current production game in September 2026 is still actively updated:
- **Publish 124** rolled worldwide in August 2026;
- anniversary rewards began September 24;
- current live events include Shardfall / Echoes of Mondain and weekend events;
- Publish 125 and further client work are publicly planned. [UO01](#uo01) [UO02](#uo02)

The modern service can be accessed through:
- subscription accounts;
- **Endless Journey**, a free-access mode with restrictions;
- special ruleset shards such as Siege Perilous/Mugen;
- the seasonal **New Legacy** shard. [UO03](#uo03)

This matters because “Ultima Online mechanics” are not one frozen 1997 ruleset.

## 2. Character creation: no class lock, just a starting configuration

The main game is fundamentally **classless**.

A character has:
- **Strength, Dexterity, Intelligence**;
- derived Hit Points, Stamina and Mana;
- dozens of trainable skills;
- equipment;
- reputation and social state.

The modern default skill cap is **720 real skill points** across the character's skills. Individual skills can normally reach 100, with later systems such as Power Scrolls allowing selected skills to reach higher mastery levels. The modern stat cap begins at 225 for new accounts and can rise through account age/other systems. [UO04](#uo04)

The important design is not today's exact cap. It is the **budgeted identity model**:

> You are allowed to become very capable, but not equally masterful at everything on one character.

A player can choose combinations such as:
- swords + tactics + healing + anatomy;
- magery + evaluate intelligence + meditation + inscription;
- animal taming + animal lore + veterinary;
- mining + blacksmithing + arms lore + tinkering;
- hiding + stealth + stealing + snooping;
- fishing + cooking + cartography + treasure hunting.

These are community “templates,” not engine-enforced classes.

### Skill atrophy makes identity editable

Skills can be set to:
- **Raise**;
- **Lock**;
- **Lower**.

When a capped character gains a skill, points can be pulled from skills set to Lower. [UO04](#uo04)

So changing profession is not a respec token that erases the character. It is **learning one capability while allowing another to decay**.

OpenLegend could use the same idea for:
- practiced skills;
- forgotten expertise;
- physical conditioning;
- language fluency;
- institutional knowledge.

The character remains the same person while their usable competence changes over time.

## 3. Skill progression is use-based

UO's core skill-gain system is explicitly **use based**:
- successfully use a skill;
- receive a chance to gain that skill;
- increasingly difficult practice is required as skill rises.

The Guaranteed Gain System later added a backstop so unlucky/infrequent players eventually receive a gain after sufficient successful uses without one. [UO05](#uo05)

Examples:
- cast spells to improve Magery;
- fight with swords to improve Swordsmanship;
- tame increasingly difficult animals to improve Animal Taming;
- craft appropriate-difficulty goods to improve crafting;
- stealth under increasingly difficult armor burden to improve Stealth. [UO06](#uo06) [UO07](#uo07)

NPC trainers can teach the initial portion of many skills for gold. [UO08](#uo08)

### Why this is different from XP

A player does not kill ten wolves and spend abstract XP on tailoring.

The action itself supplies the learning context.

That gives the world causal legibility:
- practice blacksmithing → become a blacksmith;
- practice hiding → become better at hiding.

**OpenLegend lesson:** when a capability has a natural practice action, use that action as progression evidence rather than routing everything through generic XP.

### Grinding danger

Use-based progression also encourages players to optimize repetitive training loops and macro-like behavior. UO repeatedly revised skill-gain rules to limit degenerate training and make high-end gains less arbitrary. [UO05](#uo05)

The lesson is not “use-based is always better.” The learning loop must remain an interesting activity rather than a macro tax.

## 4. Stats and bodily capability

Strength, Dexterity and Intelligence feed into:
- hit points;
- stamina;
- mana.

Stat gain is linked to skill usage and can also be set to Raise/Lower/Lock. [UO04](#uo04)

This creates an interdependence between:
- what you practice;
- what your body/mind becomes good at;
- what equipment/combat/magic you can sustain.

UO is not a full body simulation; it is still an RPG stat model. But the system is more embodied than a completely separate “character level.”

## 5. Combat: skill, equipment and positioning rather than level-gated roles

Combat has evolved enormously since 1997, but the persistent structure is:

- weapon skill determines chance/effectiveness;
- tactics/anatomy and other skills modify combat;
- armor/resistances and equipment matter;
- stamina affects attack cadence;
- active weapon moves/masteries exist in the modern game;
- healing can be physical, magical or ability-based;
- players can mix combat with noncombat skills.

There is no universal tank/healer/DPS class lock.

A blacksmith can also be a capable warrior if they invest the skill budget.

### Melee

Weapon families include:
- swords;
- fencing;
- macing;
- archery;
- throwing in later expansions.

Related skills and item properties create build synergies. [UO09](#uo09)

### PvE and PvP use the same world-facing capabilities

The same skills used against monsters can be used against other players where the ruleset allows it.

That makes capability feel **world-valid**, not mode-specific.

The cost is balance complexity: an ability useful in PvE can become oppressive in PvP, and a virtual-world ruleset must manage consent/criminality as well as combat numbers.

## 6. Magery and the broader spell ecosystem

Classic **Magery** remains one of UO's most expressive systems.

It has **64 spells across eight circles**, with progressively greater:
- skill requirements;
- mana cost;
- cast time;
- reagent requirements. [UO10](#uo10)

The spell vocabulary includes:
- direct damage;
- healing/cure;
- poison;
- buffs/debuffs;
- summoned creatures;
- fields;
- telekinesis;
- lock/unlock;
- invisibility/reveal;
- travel;
- resurrection.

This matters because magic does more than damage.

A mage can:
- unlock a chest;
- create food;
- teleport;
- open a gate;
- cure poison;
- resurrect a ghost;
- summon helpers;
- manipulate encounters.

UO later added additional schools such as:
- Necromancy;
- Chivalry;
- Bushido;
- Ninjitsu;
- Spellweaving;
- Mysticism.

Different schools use different costs/requirements: Magery, Necromancy and Mysticism use reagents; Chivalry uses tithing; some others do not require reagents. [UO11](#uo11)

### OpenLegend lesson

A “magic system” is richer when spells interact with:
- travel;
- containers;
- death;
- creatures;
- reputation;
- information;
- environment.

The engine should expose world capabilities that magic can invoke rather than building a second disconnected “magic combat” reality.

## 7. Items, weapons, armor and property composition

UO has accumulated decades of item systems:
- mundane crafted equipment;
- magical/random-property equipment;
- artifacts;
- named rewards;
- slayer properties;
- runic crafted gear;
- imbued properties;
- expansion/event items;
- blessed/insured/cursed state.

The important pattern is that **items remain transferable world objects**:
- carried;
- dropped;
- placed in containers;
- locked down in homes;
- sold by players;
- looted;
- stolen where allowed;
- repaired;
- crafted;
- insured.

Modern item insurance changes death risk:
- insured items return to the player after resurrection;
- uninsured items remain on the corpse and can be lost;
- in Felucca other players may loot those items;
- Siege Perilous does not use item insurance. [UO12](#uo12)

That creates configurable loss without making the object system purely account-bound.

## 8. Crafting is an actual profession

Crafting is one of UO's foundational strengths because crafted goods enter the same world used by adventurers.

### Blacksmithing

Blacksmiths can:
- craft/repair metal weapons and armor;
- use different ingot/material types;
- create exceptional items;
- put a maker's mark on qualifying work;
- salvage;
- combine with Arms Lore, Mining, Tinkering and Imbuing. [UO13](#uo13)

### Tailoring

Tailors can:
- shear sheep;
- collect wool;
- spin material;
- use looms;
- make clothing/leather armor;
- mark exceptional work;
- combine with other craft skills. [UO14](#uo14)

### Carpentry

Carpenters turn lumber into:
- furniture;
- containers;
- lockable objects;
- house add-ons;
- forges;
- looms;
- beds and social/decorative infrastructure. [UO15](#uo15)

### Bulk Order Deeds

Later crafting progression includes bulk-order jobs:
- fill requested orders;
- earn reward points/items;
- store/trade orders in Bulk Order Books;
- sell individual orders through player vendors. [UO16](#uo16)

### Why this matters for OpenLegend

A profession becomes meaningful when:
- it has inputs from the world;
- its products persist;
- someone else wants those products;
- maker identity can remain attached;
- the product participates in other systems.

“Craft 10 swords for XP, then vendor-trash them” is weaker than a sword entering another person's life.

## 9. Player economy: homes become stores and infrastructure

UO's economy is not merely an auction UI layered over combat loot.

Players can place **NPC vendors in player houses**:
- stock items;
- set individual prices/descriptions;
- pay the vendor's wages;
- lease vendor locations to another player;
- operate shops from real player property.

Modern Vendor Search can locate items by property/price and produce a map or paid teleport route to the actual vendor. [UO17](#uo17)

This retains an important spatial fact:

> The item is for sale **somewhere in the world**, at someone's shop.

Search improves usability without fully deleting place.

### OpenLegend lesson

Markets can preserve:
- seller identity;
- location;
- logistics;
- reputation;
- local specialization

while still offering search tools.

An abstract global market is convenient but erases many social/economic hooks.

## 10. Housing: property creates durable place

Housing is one of UO's defining systems.

A house owner can:
- place a house in eligible world space;
- choose classic or customizable structures;
- build custom walls/floors/doors/stairs;
- lock down objects;
- secure containers;
- set access/friend/co-owner rules;
- ban people;
- make the building public/private;
- run vendors/barkeeps;
- transfer/sell the house;
- decorate it with crafted and collectible objects. [UO18](#uo18) [UO19](#uo19)

The home can therefore be:
- storage;
- shop;
- guild/social venue;
- museum;
- workshop;
- trophy room;
- personal identity.

### Scarcity is physical

Housing plots occupy world space and historically created severe land pressure.

Third Dawn's 2001 review specifically praised the new Ilshenar landmass for forbidding player housing because the older world had become visually choked with houses. [UO20](#uo20)

In February 2026 the production game added a **raffle-style plot process** after decayed houses collapse, specifically to make newly available scarce land contestable without an immediate click-race. [UO21](#uo21)

This is a rich design tension:
- persistent property creates attachment;
- permanent scarce property can crowd the world and entrench incumbents.

OpenLegend should distinguish:
- private instanced property;
- scarce public land;
- creator/admin land;
- temporary leases.

## 11. Death, ghosts, corpses and resurrection

Death in UO historically created a striking world-state transition.

A dead player becomes a **ghost** and must seek resurrection through:
- healers;
- shrines/ankhs;
- other players capable of resurrection;
- specialized virtues/spells/items.

The current enhanced-client map can even show resurrection points and the location of the corpse. [UO22](#uo22)

The corpse remains a world object containing uninsured possessions. After resurrection, the player can return to recover it.

This creates a sequence:
1. lose body;
2. persist as ghost;
3. navigate socially/spatially for revival;
4. return for possessions;
5. risk further loss while doing so.

Modern insurance softens item consequences, but the underlying death-state model is unusually diegetic.

### OpenLegend lesson

Death does not have to be:
> screen fades → reload checkpoint.

It can be a **state with capabilities, dependencies and social rescue opportunities**.

## 12. Theft and snooping are real player verbs

UO implements stealing as a normal skill family.

A thief can:
- steal from world containers;
- steal special PvE items;
- in Felucca/ruleset areas, steal from other players;
- use **Snooping** to inspect another player's backpack and target particular items;
- join the Thieves Guild under the relevant rules. [UO23](#uo23) [UO24](#uo24)

Restrictions matter:
- insured/blessed/container/heavy items cannot always be stolen;
- stealing from a player is a hostile/criminal act;
- ruleset determines whether the action is allowed.

This is systemically powerful because **the item and property model actually allows theft** rather than treating inventory as metaphysically private.

OpenLegend should borrow the principle only with clear consent/safety design:
- capability;
- permission/ruleset;
- witnesses;
- ownership transfer;
- consequence.

## 13. Crime and murder: PvP is a social/legal state

In Felucca-style rulesets, attacking an innocent player can make the attacker criminal.

If the victim dies and reports the murder:
- murder counts accumulate;
- at five or more successive reported murders the player becomes a red murderer;
- murderers face travel/NPC/virtue restrictions;
- they become valid targets in ways ordinary innocents are not. [UO25](#uo25)

This is more interesting than simply enabling PvP damage.

The system connects:
- attack;
- victim;
- reporting;
- reputation/legal status;
- NPC services;
- travel permissions;
- future combat vulnerability.

### OpenLegend inspiration

Crime should be **an interpreted event**:
- who had jurisdiction?
- was the target protected?
- who observed/reported it?
- what does the institution know?
- what sanctions follow?

UO's implementation is still mostly global/ruleset-based, but it points toward the right causal chain.

## 14. Fame, karma and virtues

UO also tracks broader reputation.

Modern **Fame and Karma** derive from:
- monster killing;
- industry/rewards;
- good/evil acts.

They affect titles and some systems such as Chivalry/Necromancy. [UO26](#uo26)

The **Virtue System** layers Ultima's eight virtues into gameplay. [UO27](#uo27)

This is a more abstract morality layer than OpenLegend's intended observer-specific knowledge/reputation.

The lesson is mixed:
- broad moral identity is readable;
- one global karma number can erase disagreement/context.

OpenLegend should prefer:
- per-person/faction beliefs;
- evidence/provenance;
- institutional law

while using global reputations only when the fiction genuinely supports them.

## 15. Animal taming: a creature can become a persistent partner

Animal Taming allows characters to tame animals and monsters. Control depends on:
- Animal Taming;
- Animal Lore;
- creature difficulty. [UO28](#uo28)

Pets can:
- follow;
- fight;
- transfer between owners;
- be stabled;
- develop through later **Animal Training**.

Modern Animal Training can customize:
- stats/resists;
- skill caps;
- magic schools;
- special abilities;
- special moves;
- area effects

within explicit capacity constraints. Choices are final. [UO29](#uo29)

The official wiki itself notes the irrational-seeming affection players form for favorite “bunches of pixels.” [UO28](#uo28)

### Why pets acquire meaning

A tamed creature is:
- a persistent named object/actor;
- useful;
- trained over time;
- vulnerable enough to care about;
- customized.

OpenLegend can deepen this by adding:
- memory;
- personality;
- needs;
- changing trust;
- independent goals.

The underlying attachment loop already existed without an LLM.

## 16. The failed ecology experiment

Richard Garriott's retrospective describes an ambitious launch-era ecological simulation:
- grass/resources;
- herbivores;
- predators;
- population/replenishment assumptions.

The designers expected a self-balancing food chain.

Players instead:
- killed animals;
- harvested resources;
- overwhelmed replenishment.

The simulated ecosystem collapsed so rapidly that the team eventually replaced much of it with more conventional spawning/content behavior. [UO30](#uo30)

### What actually failed

Not “ecology simulation.”

The failure was a **model of player behavior**:
- the designers expected ecosystem participants;
- the game rewarded harvesting;
- thousands of players optimized extraction.

### OpenLegend application

Any simulated resource/ecology must be stress-tested against:
- maximum harvesting;
- hoarding;
- automation;
- resale;
- extinction;
- monopolization;
- griefing.

Do not rely on players to voluntarily preserve a system whose incentives reward exhausting it.

## 17. Trammel and Felucca: one world split by consent philosophy

**Ultima Online: Renaissance (2000)** created a famous ruleset split:
- **Felucca** retained freeform hostile PvP/theft and harsher interaction;
- **Trammel** mirrored much of the geography but prevented ordinary non-consensual harmful player interaction except in specific consensual structures such as guild wars. [UO31](#uo31)

The change made UO much more accessible to players who did not want constant predation.

It also became one of MMO design's enduring arguments:
- supporters valued safety and broader participation;
- critics believed separating risk reduced the density/meaning of player dependence and organic lawlessness.

A GameFAQs Renaissance review from one player specifically argues the split damaged player towns/community; that is **one player interpretation**, not an established population-wide outcome. [UO32](#uo32)

### OpenLegend lesson

Consent modes change the *social ecology*, not just damage flags.

If players can:
- rob;
- murder;
- destroy;
- betray

then:
- guards;
- trust;
- escorts;
- safe settlements;
- reputation

matter differently.

OpenLegend can support worlds with different governance/violence contracts instead of assuming one universal risk model.

## 18. Guilds, factions and player society

Players can form/join guilds, organize wars and create durable social identity.

Over the game's history players also produced:
- roleplay towns;
- shops;
- guild halls;
- PvP communities;
- crafting businesses;
- events;
- alliances/rivalries.

PC Gamer's retrospective identifies this as the core historical leap: UO was a world to **exist in**, where other players became the strongest friends and enemies and adventures were self-determined rather than a sequence to beat. [UO33](#uo33)

The system did not need every institution to be hard-coded.

Housing + trade + guild identity + PvP + speech + persistent names already allowed players to invent:
- social norms;
- markets;
- territorial identity;
- reputational knowledge.

### OpenLegend opportunity

AI inhabitants can make those institutions persist even with one human player:
- town councils;
- guild roles;
- shops;
- laws;
- family obligations;
- religious organizations.

UO shows the power of the substrate; OpenLegend can supply persistent non-player society inside it.

## 19. NPCs and AI

UO NPCs include:
- merchants;
- trainers;
- bankers;
- healers;
- guards;
- quest/event characters.

Players historically interact through:
- speech keywords;
- context menus;
- vendor/trainer services.

Current player-owned vendor NPCs have highly bounded functions; they are not autonomous merchants. [UO17](#uo17)

The world feels social primarily because of **other human players**, not because NPCs possess deep cognition.

This is the key OpenLegend contrast:
- UO gives strong **economic/legal/object/world affordances**;
- OpenLegend aims to give inhabitants much stronger **memory/planning/conversation** inside similar affordances.

## 20. World map, travel and dungeons

The game's geography grew across expansions:
- Britannia;
- The Lost Lands;
- Trammel/Felucca facets;
- Ilshenar;
- Malas;
- Tokuno Islands;
- Ter Mur;
- later expansion regions/dungeons.

Travel systems include:
- walking/riding;
- ships;
- moongates;
- Magery Recall/Gate Travel;
- runebooks/runic atlases;
- expansion-specific constraints.

Third Dawn's Ilshenar deliberately disabled Mark/Recall/Gate travel in its reviewed rules, creating a different relationship to exploration. [UO20](#uo20)

This is a useful pattern:
- **the same engine can give regions different mobility laws**.

OpenLegend world packages can similarly define:
- teleport prohibited;
- flight impossible;
- magic unstable;
- roads privileged

as world law rather than hardcoded universal game rules.

## 21. Quests, events and activities

UO was never defined by a single main quest.

Activities include:
- monster hunting;
- treasure hunting;
- dungeon/champion encounters;
- crafting;
- bulk orders;
- fishing;
- taming;
- stealing;
- house design;
- shopping/trade;
- PvP;
- guild wars;
- resource gathering;
- seasonal/live events;
- quests introduced/expanded over time.

This variety makes the game closer to a **world activity platform** than a campaign RPG.

Current 2026 publishes continue that model with:
- Shardfall;
- Echoes of Mondain;
- weekend events;
- anniversary rewards;
- continuing housing/combat/system changes. [UO02](#uo02)

## 22. Loot and reward loops

Loot comes from:
- monsters/bosses;
- treasure maps;
- dungeons;
- crafting rewards;
- bulk orders;
- events;
- stealing;
- player commerce.

Because items remain tradable/worldly, one player's loot can become:
- another player's equipment;
- a shop's inventory;
- a house decoration;
- a crafting input;
- a collector's artifact.

That makes acquisition socially reusable.

The long-running downside is item/economy complexity and inflation:
- decades of property tiers;
- legacy items;
- event rewards;
- gold accumulation.

A virtual economy becomes **history-bearing technical debt** as well as content.

## 23. UI, art and feel

Classic UO uses:
- isometric 2D world art;
- freely movable UI “gumps”;
- drag/drop physical item manipulation;
- backpacks represented as containers;
- targeting cursors;
- text speech above characters.

Later clients added:
- enhanced 3D-ish rendering;
- hotbars;
- modernized maps and UI affordances.

The original interface can feel opaque and archaic to modern players, but it reinforces object identity:
- a bag is a bag you open;
- an item can be dragged into another container;
- a corpse is a container in the world.

GameSpot's historical reviews repeatedly praised the unusual virtual-world depth while criticizing:
- dated visuals;
- choppy animation;
- newcomer hostility;
- technical/UI friction. [UO34](#uo34) [UO20](#uo20)

## 24. New Legacy: current seasonal reinterpretation, not the main ruleset

**New Legacy** launched its first season in 2024 as a separate shard designed to make UO feel more explicitly like an RPG again.

Its systems intentionally differ from the main shards:
- narrative-led progression;
- faster skill gain;
- job-board tasks;
- player/guild housing prerequisites and upkeep;
- guild levels;
- guild resource banks;
- seasonal lifecycle;
- eventual “Shattering” and shard closure;
- character/selected-item transfer into production shards. [UO35](#uo35) [UO36](#uo36)

For example, New Legacy skill gain can be awarded through narrative/job-board progress and then distributed at trainers rather than relying only on the production shard's classic use-based progression. [UO37](#uo37)

That is a deliberate different design.

### September 26, 2026 status

As of this research date:
- Season 1 is at the end of its lifecycle;
- final transfer date is **September 28, 2026**;
- soft-launch/pre-season activity for Season 2 is planned for October 1;
- final wipe is October 13;
- **Season 2 launches October 15, 2026**. [UO35](#uo35)

Do not write as though Season 2 is already live.

### OpenLegend comparison

New Legacy demonstrates:
- same underlying world/content;
- alternate progression/persistence contract.

OpenLegend can support:
- persistent main worlds;
- seasonal scenario worlds;
- challenge worlds

without forcing one ruleset onto every authored reality.

## 25. Five written reviews / retrospectives

### 1. GameSpot — Desslock, December 1997

**Liked / recognized:** extraordinary ambition, unprecedented complexity, thousands of players in a persistent dynamic fantasy world.

**Disliked:** severe lag/technical problems, design frustration, enormous patience/time requirement and the sense of playing a game still being finished after release. The review gave a harsh 4.9 despite recognizing the concept's importance. [UO34](#uo34)

This is a useful reminder that historical influence does not make a bad launch acceptable.

### 2. Game Revolution — February 1998

**Liked:** called the experience revolutionary, brilliant and addictive; repeatedly returned because the combination of fantasy RPG and real human population felt unlike prior games.

**Disliked:** unpolished, buggy, confusing and frustrating.

This source is a valuable counterpoint to GameSpot: two critics experienced many of the same defects but weighted the unprecedented social world differently. [UO38](#uo38)

### 3. GameSpot — Renaissance, 2000

**Liked:** by 2000 the game had substantially improved, still offered unusual long-term freedom, and Trammel broadened safe participation.

**Disliked / qualification:** old graphics/animation and onboarding made it hard for newcomers to recognize what veteran players loved.

The review ultimately described Renaissance as rewarding across player types despite dated presentation. [UO31](#uo31)

### 4. GameSpot — Third Dawn, 2001

**Liked:** new Ilshenar content and updated presentation; existing UO remained a distinctive mature online world.

**Disliked:** the new 3D client was not enough to make the game newcomer-friendly; housing had visibly overwhelmed older landscapes; newer competitors made its age obvious. [UO20](#uo20)

### 5. MMORPG.com — Reed Hubbard, 2005

**Liked:** enormous established world, many noncombat roles, depth accumulated across expansions and the unusual ability to live as something other than a monster killer.

**Disliked / qualification:** by the Samurai Empire era the aged engine/interface and complexity created a substantial barrier; the Japanese-theme expansion added professions/content but remained built on an old system. [UO39](#uo39)

### Additional long-view criticism — Lord Blackthorn's Revenge

GameSpot's later review framed UO's biggest enduring strength as something competitors still did poorly: characters could become adept at meaningful occupations other than killing fauna. Its critique was that this unique world was increasingly buried under dated presentation and complexity. [UO40](#uo40)

## 26. Player testimony and community preferences

### Historical freedom stories

PC Gamer's retrospective describes the writer being chased down, killed and robbed of essentially everything they owned—and remembering it as extraordinary precisely because the game allowed societies/stories beyond authored quests. [UO33](#uo33)

That is not evidence everyone enjoys full-loot danger. It is evidence that **consequence can produce durable memory for the audience that opts into it**.

### Trammel disagreement

Historical player commentary remains divided:
- one audience valued the ability to play without involuntary theft/murder;
- some veteran sandbox players believed the split weakened player towns/dependence/community. [UO32](#uo32)

That conflict is valuable; there is no need to pick a universal winner. The ruleset determines what social institutions become necessary.

### Housing

Long-running community attachment to:
- houses;
- vendors;
- decorations;
- rare land

is visible even in current 2026 development, where the team continues updating house-placement rules and explicitly cites player homes/shops/gathering places as core to the world's life. [UO21](#uo21) [UO41](#uo41)

### Steam boundary

**Steam review sampling is not applicable.** The current official UO service is not a Steam-distributed title. Historical player testimony comes from:
- GameFAQs;
- official/community forums;
- retrospective articles;
- the game's own long-running community.

This dossier does not fabricate a Steam review section.

## 27. Production history and major evolution

Major milestones include:
- **1997 — Ultima Online**
- **1998 — The Second Age** adds Lost Lands/content
- **2000 — Renaissance** creates Trammel/Felucca split
- **2001 — Third Dawn** adds new client/Ilshenar
- **2002 — Lord Blackthorn's Revenge**
- **2003 — Age of Shadows** adds major item/housing/class-system changes
- **2004 — Samurai Empire**
- **2005 — Mondain's Legacy**
- **2009 — Stygian Abyss**
- **2010 — High Seas**
- **2015 — Time of Legends**
- **2018 — Endless Journey** free-access mode
- **2024 — New Legacy Season 1**
- **2026 — Publish 124, 29th anniversary; New Legacy Season 2 pending**. [UO42](#uo42)

The game repeatedly changed foundational assumptions:
- PvP consent;
- item properties;
- insurance;
- housing;
- clients;
- expansions;
- onboarding;
- account model.

That means its longevity comes partly from **being willing to alter world rules**, not from never changing anything.

## 28. The virtual ecology failure, preserved

The existing focused case remains canonical for this subsystem.

Richard Garriott's account:
1. designers modeled grass/prey/predator relationships;
2. expected an internally sustainable ecology;
3. players killed/harvested creatures at industrial scale;
4. ecological balance collapsed;
5. the system was tuned and eventually replaced/removed as originally envisioned. [UO30](#uo30)

This dossier adds the broader context:
- UO succeeded as a virtual world despite this subsystem failing;
- player economies and social systems worked partly because they *embraced* optimization and human incentives rather than assuming ecologically gentle behavior.

OpenLegend should stress-test every simulated commons against adversarial use.

## 29. Transferable inspiration for OpenLegend

### A. Make professions own real world capability

A tailor should not be “combat character who presses Tailoring in a menu.”

The UO chain:
> sheep → wool → spin → loom → cloth → crafted/marked item → vendor → another player

is powerful because each step is a world fact.

OpenLegend can do this for:
- medicine;
- construction;
- farming;
- research;
- law;
- teaching;
- religion;
- logistics.

### B. Use a bounded skill budget instead of mandatory classes

Characters become distinctive through actual practiced capability.

This works especially well for AI actors because their competence can reflect:
- life history;
- job;
- hobbies;
- injury;
- teaching.

### C. Ownership/access should be mechanics, not lore

UO houses distinguish:
- owner;
- co-owner;
- friend;
- banned;
- secure container access;
- vendor tenancy.

OpenLegend's object/place permission model can support:
- homes;
- guild halls;
- labs;
- prisons;
- shops;
- private rooms.

### D. Markets are more alive when the seller/place still exists

Vendor Search improves convenience while preserving that the item belongs to a vendor at a house.

OpenLegend can expose search without collapsing all commerce into an omnipresent store UI.

### E. Death can create a social recovery state

Ghost → healer/player resurrection → corpse recovery creates:
- travel;
- vulnerability;
- rescue;
- memory.

OpenLegend can make death consequences world-specific rather than defaulting to save reload.

### F. Crime requires ownership + witnesses/knowledge + institutions

UO's murder reporting is simple but directionally correct.

The engine should represent:
- victim;
- actor;
- observer;
- jurisdiction;
- property;
- evidence;
- legal consequence.

### G. Pets become meaningful through useful persistence

Tamed animals prove that:
- usefulness;
- persistence;
- customization;
- risk

can create attachment even without sophisticated dialogue.

Adding cognition should deepen that, not replace the material relationship.

### H. Public housing creates society and scarcity at once

Persistent player construction produces:
- neighborhoods;
- shops;
- landmarks;
- identity.

It also produces:
- sprawl;
- scarce land;
- inactive-owner problems.

OpenLegend needs explicit land/property lifecycle policies.

### I. Let worlds choose their risk contract

Felucca and Trammel show how one flag changes:
- markets;
- travel;
- strangers;
- policing;
- fear;
- cooperation.

Authored realities can choose:
- full consequence;
- protected social spaces;
- consensual PvP;
- single-player;
- recoverable losses.

### J. Simulations must survive optimizing humans

The ecology failure is a permanent warning:
**simulate the incentives, not the designer's preferred behavior.**

### K. Long-lived worlds accumulate rules debt

Twenty-nine years of:
- expansions;
- items;
- currencies;
- housing;
- clients;
- events

creates enormous complexity.

OpenLegend's invention packs need:
- provenance;
- versioning;
- dependency visibility;
- migration rules;
- deprecation paths

or extensibility will eventually become the same kind of layered archaeology.

## 30. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–3, 24, 27 |
| R02 player actions / mechanics | §§3–23 |
| R03 items / entities / composition | §§7–10, 15, 22 |
| R04 progression / economy / time | §§2–3, 8–10, 24 |
| R05 interactions / concrete situations | §§8–18 |
| R06 people / AI / social / multiplayer | §§9–19 |
| R07 art / audio / interface / feel | §23 |
| R08 story / narrative | §§18, 21, 24 |
| R09 production / development | §§27–28 |
| R10 marketing / distribution / virality | §§1, 24, 27 |
| R11 commercial / participation | active 29-year service; §1 and reviews; no unsupported current subscriber count |
| R12 reviews / player feedback | §§25–26 |
| R13 transferable inspiration / limits | §§28–29 |
| R14 sources / preservation / navigation | this section + sources |

**Preservation check:** the focused ecology case remains intact and linked. This dossier does not convert Garriott's anecdote into “simulation doesn't work”; it identifies the narrower failure of ecological assumptions under real harvesting incentives. Historical Trammel/Felucca opinions are attributed rather than resolved as one objective community verdict.

## Sources

<a id="uo01"></a>**UO01 — [Celebrating 29 years / Ultima Online home](https://uo.com/).** UO Team, 2026-09-24 snapshot. Primary current-service/anniversary evidence.

<a id="uo02"></a>**UO02 — [Publish 124 World Wide](https://uo.com/2026/08/24/publish-124-world-wide/) and [September 2026 archive](https://uo.com/2026/09/).** UO Team. Current publish/events state.

<a id="uo03"></a>**UO03 — [Endless Journey](https://uo.com/wiki/ultima-online-wiki/beginning-the-adventure/endless-journey/).** Official/current account-mode feature/restriction reference.

<a id="uo04"></a>**UO04 — [Skills, Stats and Attributes](https://uo.com/wiki/ultima-online-wiki/player/stats/skills-stats-and-attributes/).** Official/current mechanics reference for stat/skill caps and Raise/Lower/Lock behavior.

<a id="uo05"></a>**UO05 — [Skill Gain Systems](https://uo.com/wiki/ultima-online-wiki/technical/skill-gain-systems/).** Official mechanics/history copied from EA docs; use-based progression and Guaranteed Gain System.

<a id="uo06"></a>**UO06 — [Animal Taming](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/).** Official/current skill reference.

<a id="uo07"></a>**UO07 — [Stealth](https://uo.com/wiki/ultima-online-wiki/skills/stealth/).** Official/current skill progression/armor-difficulty reference.

<a id="uo08"></a>**UO08 — [Skill Titles & Order](https://uo.com/wiki/ultima-online-wiki/player/skill-titles-order/).** Official/current NPC training and mastery-title reference.

<a id="uo09"></a>**UO09 — [Melee Fighting](https://uo.com/wiki/ultima-online-wiki/skills/melee-fighting/).** Official/current melee-skill interaction and training reference.

<a id="uo10"></a>**UO10 — [Magery](https://uo.com/wiki/ultima-online-wiki/skills/magery/) and [Magery Spells](https://uo.com/wiki/ultima-online-wiki/skills/magery/magery-spells/).** Official/current 64-spell/eight-circle and effect/cost reference.

<a id="uo11"></a>**UO11 — [An Introduction to Spellcasting](https://uo.com/wiki/ultima-online-wiki/skills/an-introduction-to-spellcasting/).** Official/current spell-school, mana and reagent differences.

<a id="uo12"></a>**UO12 — [Insurance](https://uo.com/wiki/ultima-online-wiki/player/insurance/).** Official/current death-item-risk rules; Siege Perilous difference explicit.

<a id="uo13"></a>**UO13 — [Blacksmithing](https://uo.com/wiki/ultima-online-wiki/skills/blacksmithing/) and [Blacksmith Craftables](https://uo.com/wiki/ultima-online-wiki/skills/blacksmithing/blacksmith-craftables/).** Official/current craft profession reference.

<a id="uo14"></a>**UO14 — [Tailoring](https://uo.com/wiki/ultima-online-wiki/skills/tailoring/).** Official/current wool/spinning/loom/crafting chain and complementary skills.

<a id="uo15"></a>**UO15 — [Carpentry](https://uo.com/wiki/ultima-online-wiki/skills/carpentry/) and [House Add-ons](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-ownership-7-house-add-ons/).** Official/current craft-to-housing connection.

<a id="uo16"></a>**UO16 — [Bulk Orders](https://uo.com/wiki/ultima-online-wiki/gameplay/crafting/bulk-orders/).** Official/current crafter job/reward/tradable-order mechanics.

<a id="uo17"></a>**UO17 — [Player-owned NPCs](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/npcs-player-owned/) and [Vendor Search](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/vendor-search/).** Official/current player-shop, rental, wages and search logistics.

<a id="uo18"></a>**UO18 — [Placing a House](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/).** Official/current housing placement, ownership and scarcity rules.

<a id="uo19"></a>**UO19 — [Building a Custom House](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-owning-2-building-a-custom-house/) and [Managing Your Home](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-ownership-4-managing-your-home/).** Official/current construction, storage and permission roles.

<a id="uo20"></a>**UO20 — [Ultima Online: Third Dawn Review](https://www.gamespot.com/reviews/ultima-online-third-dawn-review/1900-2703752/).** GameSpot, 2001-04-02. Full review; Ilshenar, housing-sprawl, client and newcomer friction.

<a id="uo21"></a>**UO21 — [Post-IDOC House Placement](https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/post-idoc-house-placement/).** Official/current 2026 collapsed-plot raffle system.

<a id="uo22"></a>**UO22 — [Death and Resurrection in the Enhanced Client](https://uo.com/wiki/ultima-online-wiki/combat/death-and-resurrection-in-the-enhanced-client/).** Official/current ghost/corpse/resurrection navigation reference.

<a id="uo23"></a>**UO23 — [Stealing](https://uo.com/wiki/ultima-online-wiki/skills/stealing/).** Official/current stealing/PvP rules.

<a id="uo24"></a>**UO24 — [Snooping](https://uo.com/wiki/ultima-online-wiki/skills/snooping/).** Official/current targeted inventory-inspection skill.

<a id="uo25"></a>**UO25 — [The Murder System](https://uo.com/wiki/ultima-online-wiki/player/the-murder-system/).** Official/current attempted murder, victim reporting, murderer status and sanctions.

<a id="uo26"></a>**UO26 — [Fame and Karma](https://uo.com/wiki/ultima-online-wiki/player/fame-and-karma/).** Official/current broad reputation system.

<a id="uo27"></a>**UO27 — [The Virtues](https://uo.com/wiki/ultima-online-wiki/gameplay/the-virtues/).** Official/current virtue gameplay reference.

<a id="uo28"></a>**UO28 — [Animal Taming](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/).** Official/current tame/control/attachment description.

<a id="uo29"></a>**UO29 — [Animal Training](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/animal-training/) and [Discovering Animal Training](https://uo.com/wiki/ultima-online-wiki/gameplay/quests/discovering-animal-training/).** Official/current pet customization limits and irreversible training.

<a id="uo30"></a>**UO30 — [War Stories: Ultima Online — the virtual ecology](https://arstechnica.com/video/watch/war-stories-ultima-online-the-virtual-ecology/).** Ars Technica / Richard Garriott. Original developer-interview transcript used by the preserved ecology case; attributed retrospective, not telemetry.

<a id="uo31"></a>**UO31 — [Ultima Online: Renaissance Review](https://www.gamespot.com/reviews/ultima-online-renaissance-review/1900-2593371/).** GameSpot, 2000. Full review and historical Trammel/Felucca split evidence.

<a id="uo32"></a>**UO32 — [Ultima Online: Renaissance — GameFAQs player review](https://gamefaqs.gamespot.com/pc/258374-ultima-online-renaissance/reviews/58541).** Historical self-selected player critique of the Trammel/Felucca social split; one person's interpretation.

<a id="uo33"></a>**UO33 — [The most important PC games — Ultima Online](https://www.pcgamer.com/most-important-pc-games/6/).** PC Gamer retrospective / Chris Thursten. Direct personal memory plus historical significance argument.

<a id="uo34"></a>**UO34 — [Ultima Online Review](https://www.gamespot.com/reviews/ultima-online-review/1900-2531690/).** Desslock, GameSpot, 1997-12-17. Full launch-era review.

<a id="uo35"></a>**UO35 — [Ultima Online: New Legacy](https://uo.com/ultima-online-new-legacy/).** UO Team, FAQ updated 2026-09-09. Current seasonal rules and future Season 2 date.

<a id="uo36"></a>**UO36 — [New Legacy — Houses](https://uo.com/wiki/ultima-online-wiki/new-legacy-an-overview/new-legacy-houses/).** Official/current seasonal housing, guild and upkeep mechanics.

<a id="uo37"></a>**UO37 — [New Legacy, An Overview](https://uo.com/wiki/ultima-online-wiki/new-legacy-an-overview/).** Official seasonal narrative/job-board skill progression.

<a id="uo38"></a>**UO38 — [Ultima Ongoing Review](https://www.gamerevolution.com/review/33084-ultima-online-review).** GameRevolution, 1998-02-05. Full historical review; revolutionary/addictive versus buggy/frustrating.

<a id="uo39"></a>**UO39 — [Ultima Online Review](https://www.mmorpg.com/reviews/ultima-online-review-2000055015).** Reed Hubbard, MMORPG.com, 2005-01-18. Full long-running-game/Samurai Empire-era review.

<a id="uo40"></a>**UO40 — [Ultima Online: Lord Blackthorn's Revenge Review](https://www.gamespot.com/reviews/ultima-online-lord-blackthorns-revenge-review/1900-2858324/).** GameSpot / Desslock. Historical review emphasizing UO's unusual noncombat lives and dated presentation.

<a id="uo41"></a>**UO41 — [Ultima Online 2026 Roadmap Update](https://uo.com/?page=44).** UO Team, 2026-01-15. Primary current statement highlighting player-run events, roleplay, homes, shops and gathering places.

<a id="uo42"></a>**UO42 — [Ultima Online GameSpot archive](https://www.gamespot.com/games/ultima-online/reviews/) and official [technical/publish archive](https://uo.com/wiki/ultima-online-wiki/technical/).** Used to cross-check major expansion/release chronology; exact systems are cited to dedicated sources where relevant.
