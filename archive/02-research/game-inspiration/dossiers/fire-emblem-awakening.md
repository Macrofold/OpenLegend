# Fire Emblem Awakening — full research dossier

**G62 · Complete research pass, September 26, 2026.** This dossier covers the original Nintendo 3DS game, distinguishing the 2012 Japanese release from the 2013 North American/European releases and separating base-game systems from downloadable maps/classes/items that can no longer be newly purchased after the Nintendo 3DS eShop shutdown. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Awakening is especially valuable to OpenLegend because it turns a tactics game's **social graph into a build system**. Positioning two people together can change combat, repeated cooperation changes their relationship, relationships can become marriages, and marriages determine the identities/build options of recruitable children. The resulting chain is unusually compositional:

> battlefield adjacency → trust/support → marriage → descendant → inherited classes/skills/stats → new battlefield possibilities.

That is powerful, but it also exposes hazards OpenLegend should avoid: pair bonuses can dominate tactical variety; fixed romance graphs can make people feel like optimization inputs; and generated descendants can become build products rather than characters if inheritance is too transparent.

## 1. Identity, scope, and player promise

**Developer:** Intelligent Systems, with Nintendo/other credited collaborators. **Publisher:** Nintendo.  
**Platform:** Nintendo 3DS.  
**Release:** Japan April 19, 2012; North America February 4, 2013; Europe April 19, 2013. [AW01](#aw01) [AW02](#aw02)

The player controls:
- **Chrom**, prince of Ylisse and leader of the Shepherds;
- a customizable player Avatar, usually called **Robin** in later franchise material;
- a growing cast of named units.

Play alternates between:
1. authored story scenes;
2. world-map movement/preparation;
3. grid-based tactical battles;
4. optional encounters and Paralogues;
5. supports/Barracks/inventory/reclassing;
6. eventual child-character recruitment and postgame/DLC challenges.

Awakening deliberately opens the traditional Fire Emblem structure:
- the world map permits revisiting locations;
- random Risen encounters create repeatable battles;
- merchants appear;
- Paralogues are optional;
- StreetPass can place other players' teams on the map;
- downloadable maps historically added challenge, nostalgia, grinding and story content. [AW01](#aw01)

This creates a more player-directed progression rhythm than Path of Radiance's fixed chapter-to-chapter march.

## 2. Avatar creation and identity

Robin is a player-shaped protagonist rather than only an invisible strategist.

Creation includes:
- name;
- gender;
- appearance/body/voice choices;
- an **asset** and **flaw** that alter stat tendencies.

Robin begins in the Tactician class and has unusually broad reclass access. Unlike most units, Robin can marry essentially any opposite-sex playable character in the original game's support structure and can pass broad class access to Morgan/other children. [AW03](#aw03)

This means avatar creation is mechanically consequential but still bounded:
- the player does not choose arbitrary powers;
- identity is authored inside Fire Emblem's class/stat vocabulary.

### OpenLegend implication

A player-authored person becomes more grounded when choices affect:
- embodied capability;
- social possibility;
- future inheritance/history.

But identity should not be reducible to min-max sliders. Robin's asset/flaw works because it sits beside authored dialogue and relationships.

## 3. Core tactical action vocabulary

On a player turn, a unit can generally:
- move across grid tiles;
- attack;
- use an item;
- trade;
- use a staff or class-specific action;
- interact with map objectives/visitable points where applicable;
- Pair Up;
- switch/separate while paired;
- wait.

Battles use Fire Emblem's familiar forecast:
- damage;
- hit chance;
- critical chance;
- possible follow-up attack;
- enemy counterattack depending on range/equipment.

Weapon families include swords, lances, axes, bows, tomes and staves. The physical weapon triangle gives:
- sword > axe;
- axe > lance;
- lance > sword.

Magic uses tome types but Awakening does not reproduce every older game's separate magic-triangle emphasis. Effective weapons, class vulnerabilities, terrain, skills and speed thresholds layer additional decisions. [AW04](#aw04)

## 4. Pair Up, Dual Strike, and Dual Guard

Awakening's defining tactical system lets two units occupy one map position.

### Adjacent support

When compatible allies stand adjacent, a lead fighter can receive:
- stat support;
- a probabilistic **Dual Strike** follow-up from a nearby partner;
- a probabilistic **Dual Guard** that negates an incoming hit.

Higher support ranks increase these probabilities/bonuses. [AW05](#aw05)

### Pair Up

A unit can merge into another allied unit's tile:
- one becomes **Lead**;
- one becomes **Support**;
- the Lead receives stat bonuses based on the partner's class/stats/support;
- the Support can trigger Dual Strike/Guard;
- the two can switch roles;
- pairing can transport low-mobility or vulnerable units.

The combination changes both movement and combat value. [AW05](#aw05)

### Why it is powerful

Pair Up composes several systems at once:
- spatial compression;
- transport;
- stat modification;
- relationship growth;
- attack multiplication;
- damage prevention;
- action preservation through switching.

GameSpot praised how positioning became richer, but also noted that deeper Dual probabilities were not always surfaced clearly in the default interface. [AW01](#aw01)

### Balance limit

Later Fire Emblem Fates explicitly redesigned Pair Up because Awakening's implementation was considered too powerful/unpredictable: Fates split offensive assistance and defensive pairing into more deterministic systems. [AW06](#aw06)

**OpenLegend lesson:** when one relationship mechanic simultaneously grants mobility, offense, defense, stats and social growth, it can become the obviously dominant action. Composability needs counterweights.

## 5. Supports, friendship, marriage, and social feedback

Compatible characters gain support points by:
- fighting while paired;
- fighting adjacent;
- triggering Dual actions;
- healing/dancing;
- Barracks/events and certain items. [AW07](#aw07)

Relationships progress through:
- C;
- B;
- A;
- and for eligible opposite-sex pairs, S.

Support conversations expose:
- personality;
- history;
- interpersonal conflict;
- comedy;
- affection.

Mechanically, stronger supports improve cooperation.

### Marriage

Eligible opposite-sex units who reach S support marry. Marriage is not a separate minigame; it is the endpoint of the support progression and then feeds other systems.

The developers deliberately revived generational mechanics remembered from *Genealogy of the Holy War*. In Nintendo's Iwata Asks, producer Hitoshi Yamagami specifically says he wanted “to get married again,” referring to that earlier system where pairings affected children. [AW08](#aw08)

### Social design tension

Awakening gives relationships unusually high mechanical stakes. That encourages players to care about pairings—but also encourages optimization:
- which spouse gives the best classes?
- which inherited skill should the child receive?
- what stat modifiers combine best?

OpenLegend can preserve mechanical consequences without making affection feel primarily like breeding/equipment math.

## 6. Children, time travel, and inheritance

**Spoiler-light structural explanation:** the story eventually introduces children from a ruined future who can be recruited through Paralogues after their relevant parent marries.

Each child has:
- one fixed parent;
- a variable second parent;
- inherited stat-cap modifiers;
- inherited class options;
- an inherited skill from each parent at recruitment-map entry;
- authored identity/dialogue distinct from the chosen pairing. [AW09](#aw09)

This creates real combinatorial build planning.

### Inherited skills

A child inherits the last equipped active skill from each parent at the point their Paralogue is entered, with special exceptions. This enables inheritance of skills the child might not ordinarily obtain through their own gender/class route. [AW09](#aw09)

### Inherited classes

Children inherit class access from parents subject to gender/special-class substitution rules. Robin's broad class access makes descendants involving the Avatar especially flexible. [AW09](#aw09)

### Narrative composition

The impressive part is that inheritance is not detached from fiction:
- marriage creates a relationship;
- the future creates the child;
- the child's capabilities reflect lineage.

OpenLegend could generalize lineage beyond combat genetics:
- trade knowledge;
- language;
- land claims;
- debts;
- social status;
- magical affinities;
- inherited enemies;
- stories/reputations.

## 7. Class progression, Master Seals, and Second Seals

Units begin in base/special classes and gain:
- levels;
- statistics;
- weapon proficiency;
- class skills.

**Master Seals** promote eligible base classes into advanced branches.

**Second Seals** permit reclassing into alternate class lines. In Awakening, reclassing resets displayed class level while retaining accumulated stats subject to class/base/cap rules. [AW10](#aw10)

This means one person can have a long mechanical biography:
> Pegasus Knight → Dark Flier → learn Galeforce → Second Seal → another class → retain learned skill.

Skills learned through earlier careers remain usable subject to the five-skill equipped limit.

### Why this matters

The class is a **current role**, not the person's entire identity.

That is directly relevant to OpenLegend's extensible characters:
- professions should change;
- learned capabilities can persist;
- bodily/social prerequisites can constrain transitions.

Avoid hard-coding “this NPC *is* a blacksmith” when “this NPC currently works as a blacksmith and remembers former training” is richer.

## 8. Skills and build composition

Classes teach skills at particular levels. Units can equip up to five learned skills.

Examples include:
- stat modifiers;
- activation attacks such as Luna/Astra;
- mobility/economy effects;
- Dual Strike/Guard modifiers;
- recovery;
- **Galeforce**, which can grant another action after defeating an enemy under its conditions.

The important structure:
- class determines what can be learned;
- reclassing changes acquisition route;
- learned skills persist;
- five-slot equipment forces selection;
- inheritance can pass selected skills to children.

This creates a **build graph** rather than a linear skill tree.

### OpenLegend transfer

A living-world system can model:
- source of learning;
- mastery memory;
- active practice slots/attention;
- inheritance/teaching rules

without forcing all progression into XP branches.

## 9. Economy, items, inventory, and forging

Gold funds:
- weapons;
- staves;
- consumables;
- seals;
- forging.

Weapons have finite durability in Awakening, so powerful equipment carries replacement/scarcity cost.

The world map supports shops and wandering merchants. Repeated Risen battles and DLC historically allowed extra resource/experience acquisition, making the campaign economy more elastic than many earlier Fire Emblem games. [AW01](#aw01)

### Forging

Weapons can be customized within bounded parameters. As in Path of Radiance, this is constrained improvement of an existing semantic family rather than freeform crafting.

### No settlement/crafting simulation

Awakening does **not** contain:
- settlement construction;
- production chains;
- resource harvesting;
- open crafting recipes;
- player-run markets.

Its economy exists to support roster preparation.

## 10. World map, random encounters, and pacing

The world map connects chapters and supports:
- shops;
- random Risen encounters;
- merchant appearances;
- Paralogues;
- StreetPass encounters;
- DLC access historically through the Outrealm Gate.

This changes failure/recovery:
- a weak unit can be trained outside the next main chapter;
- money/experience can be farmed;
- child Paralogues can be delayed until preparation is adequate.

RPGamer notes that this makes Awakening structurally closer to *The Sacred Stones* than to strictly linear Fire Emblem entries. [AW02](#aw02)

### Tradeoff

Open encounters improve accessibility but weaken scarcity if grinding solves every difficulty spike.

OpenLegend should distinguish:
- **world persistence** from
- **infinite replenishment**.

A continuous world can still have meaningful depletion, seasons, irreversible events and opportunity costs.

## 11. Casual Mode, Classic Mode, difficulty, and recovery

Awakening helped broaden the Western series audience partly by making **Casual Mode** prominent:
- defeated units return after battle;
- story progression can continue without permanent roster loss.

**Classic Mode** preserves traditional permadeath for most units.

Difficulty options further separate:
- story/character accessibility;
- tactical challenge;
- permanent consequence.

Game Informer praised permadeath's emotional intensity but acknowledged that removing it is available for players who prefer a different contract. [AW11](#aw11)

### Lunatic / Lunatic+

Higher settings change enemy pressure dramatically. **Lunatic+** adds randomly assigned enemy skills, creating a challenge mode whose opening can depend heavily on generated combinations.

This exposes an important distinction:
- hard because the player must understand deeper interactions;
- hard because numbers are larger;
- hard because volatile enemy traits force resets.

OpenLegend should prefer difficulty that creates new decisions rather than opaque restart lotteries.

## 12. Recruitment, Paralogues, and optional goals

Recruitment can come from:
- story progression;
- talking to units;
- optional Paralogues;
- child missions;
- historically SpotPass/DLC bonus content.

Paralogues often create side objectives:
- reach/recruit a person;
- protect someone;
- manage split forces;
- defeat threats before resources/people are lost.

Children Paralogues tie social decisions to future tactical content.

This is valuable:
> the relationship graph changes which adventures exist.

OpenLegend can go further by creating opportunities from actual world relationships rather than fixed unlock tables.

## 13. Enemy AI and map design

Enemies generally:
- move and attack on their phase;
- punish exposed/low-defense units;
- use weapon/range/class matchups;
- pressure map objectives.

Game Informer praised the AI for quickly punishing vulnerable placements. [AW11](#aw11)

Awakening's map design is often less objective-varied and more combat-focused than some other series entries. Reviews praised the tactical core but later franchise criticism often contrasts Awakening's open-ended unit-building with tighter puzzle-like map design.

The important interaction is that extremely strong Pair Up/reclass builds can overwhelm map constraints. Build freedom and encounter craftsmanship need to be designed together.

## 14. Barracks and small character-state moments

The Barracks can surface:
- short conversations;
- items;
- temporary stat gains;
- relationship/support progress.

These are lightweight ambient character touches rather than full simulation.

The larger pattern is useful:
> not every social event needs to be a quest or major cinematic.

OpenLegend can make ordinary:
- meals;
- work chatter;
- small gifts;
- complaints;
- jokes

carry low-intensity state changes that accumulate into relationship history.

## 15. Story and authored narrative

**Spoiler-light:** Chrom's Shepherds defend Ylisse amid conflict with Plegia, encounter the masked “Marth,” and eventually confront threats involving the Fell Dragon Grima, time travel and the possibility of changing a doomed future.

Awakening makes the Avatar unusually central:
- Robin is customizable but voiced/characterized;
- Chrom and Robin form the campaign's core trust relationship;
- player marriage choice can integrate Robin into family structures;
- later story stakes directly intersect the Avatar's identity.

Game Informer found the early story less compelling than the combat but thought later twists and the “change fate” theme improved it. [AW11](#aw11)

### OpenLegend relevance

A player-created character can have authored narrative importance without being fully predefined.

The trick is to author **roles and pressures**, not every internal motive.

## 16. Art, audio, UI, and feel

Awakening combines:
- 2D illustrated portraits;
- stylized map sprites;
- 3D battle models;
- CG/anime-style cinematics;
- expressive support dialogue;
- orchestral/characterful score.

Contemporary criticism famously noticed simplified 3D character feet/models, but reviewers generally considered the overall visual package attractive. Destructoid especially praised the character art and distinct cast identity. [AW12](#aw12)

The interface supports:
- enemy range inspection;
- detailed unit pages;
- combat forecast;
- map overlays;
- fast battle-animation skipping/settings.

GameSpot's principal UI criticism was that some advanced Pair Up/Dual probabilities were not surfaced intuitively enough. [AW01](#aw01)

### OpenLegend lesson

Simulation depth should be **queryable at the decision point**. Hiding relationship-combat probabilities several menus deep turns depth into spreadsheet archaeology.

## 17. Local/online/social systems

Awakening is fundamentally a single-player campaign, but 3DS features added asynchronous/local surfaces.

### StreetPass

Other players' teams could appear on the world map. The player could:
- inspect them;
- fight;
- recruit/buy from them under the relevant rules.

This turns a personal roster into a shareable artifact.

### Double Duel

Local multiplayer allowed two nearby players to contribute teams against enemy encounters, but it was limited compared with a full tactical co-op mode. GameSpot explicitly criticized it as underdeveloped. [AW01](#aw01)

### 2026 service boundary

Nintendo ended:
- new Nintendo 3DS software/DLC purchases on **March 27, 2023**;
- Nintendo 3DS online play/communication services on **April 8, 2024**.

Previously purchased software/DLC can still be redownloaded “for the foreseeable future,” but a new 2026 player cannot legally purchase Awakening's DLC through the original eShop. [AW13](#aw13)

Local/offline features must be distinguished from retired network services.

## 18. DLC and postgame boundaries

Awakening received a large paid DLC catalogue through the Outrealm Gate.

Broad categories included:
- legacy-character fanservice;
- gold/experience grinding;
- skill/class rewards;
- high-difficulty challenge maps;
- character-focused “Scramble” conversations;
- **The Future Past**, an alternate-future story arc;
- **Apotheosis**, an optimization-heavy challenge map.

DLC is not part of the base-game completion requirement and should not be silently assumed available in 2026.

### Preservation lesson

When externally purchased content becomes unavailable:
- the shipped executable may still reference it;
- owners may redownload;
- newcomers cannot acquire it normally.

OpenLegend invention/world packages should have durable ownership/export/versioning rather than depending on a storefront staying alive forever.

## 19. Worked interactions

### A. Pair a knight with a flier to change movement and defense — constructed from rules

**Intent:** move a durable but slow unit rapidly toward a dangerous front.

**Conditions:** compatible units are adjacent and the flier can safely carry the pair.

**Action:** Pair Up with the slow unit as support or switch roles after movement.

**Interaction:** Pair Up grants stat bonuses and merges positions; the active unit's movement class determines the pair's current traversal.

**Result:** one relationship converts into mobility plus combat modification.

**Next choice:** stay paired for safety/bonuses or separate to regain two independent actions/map bodies.

**Limit:** pairing reduces the number of independently acting units.

### B. Turn repeated cooperation into marriage and a new recruit — documented chain

**Intent:** build Chrom/another eligible unit's relationship.

**Action:** fight adjacent/paired across battles, trigger support ranks, reach S support.

**Result:** the pair marries; later a child Paralogue becomes available under the story's time-travel structure. [AW07](#aw07) [AW09](#aw09)

**Next choice:** prepare the parents' final equipped skills before entering the child's recruitment map.

**Limit:** because inheritance is known mechanically, emotional pairing can become build optimization.

### C. Route through a class only to learn a skill — constructed from rules

**Intent:** give a character a mobility/action skill unavailable in their current role.

**Action:** use Second Seal → train target class → learn the skill → reclass again.

**Result:** class history leaves a persistent learned capability.

**Next choice:** spend one of five equipped-skill slots on it.

**Limit:** repeated grinding can trivialize intended class identity and map difficulty.

### D. Save a doomed unit through a Dual Guard — probabilistic documented rule

**Intent:** survive an enemy strike.

**Conditions:** lead/support pair has nonzero Dual Guard chance.

**Action:** accept combat.

**Interaction:** Support unit may trigger Dual Guard and negate the enemy hit. [AW05](#aw05)

**Result:** a relationship can literally prevent death.

**Limit:** probabilistic rescue can make identical tactical decisions produce different outcomes. Fates later made this more deterministic.

### E. Casual versus Classic changes the meaning of one mistake

**Intent:** take a risky line.

**Classic:** death can permanently remove the unit, often causing players to reset.

**Casual:** the same defeat removes the unit only for the current map.

**Result:** identical combat rules create different emotional and temporal stakes.

**OpenLegend takeaway:** consequence policy is a first-class world/game contract, not merely difficulty “numbers.”

## 20. Production and development

Nintendo's **Iwata Asks** is unusually explicit about the design motivation.

### “Ultimate culmination”

Producer Hitoshi Yamagami proposed making a culmination of prior Fire Emblem ideas. The team described a “put in everything” mentality: staff kept proposing character visuals, systems and callbacks and the project expanded accordingly. [AW14](#aw14)

A major theme was **love for the characters**—the developers wanted enough visual/social detail that players would become attached even if any one player never saw every piece. [AW14](#aw14)

### Marriage returned intentionally

Yamagami explicitly wanted the marriage/generation mechanic back because it had left such a strong impression in *Genealogy of the Holy War*. [AW08](#aw08)

This matters: the children system was not merely a monetization/fanservice bolt-on. It was part of the “series culmination” design logic.

### “Potentially the last Fire Emblem”

Later developer accounts state Nintendo had warned declining sales could make Awakening the last entry; Yamagami publicly cited a roughly **250,000-unit** threshold. [AW15](#aw15) [AW16](#aw16)

That helps explain the team's willingness to combine:
- Casual mode;
- avatar;
- marriage;
- children;
- world-map grinding;
- callbacks;
- DLC;
- extensive supports.

It does **not** prove every addition independently caused the sales rebound.

## 21. Distribution, marketing, and commercial context

Awakening launched as a premium retail/digital 3DS title.

Promotion included:
- Nintendo Direct/E3 communication;
- a downloadable demo;
- a themed Nintendo 3DS hardware bundle;
- review/press campaigns;
- ongoing DLC releases after launch. [AW02](#aw02)

RPGamer noted that Nintendo's overseas promotion appeared stronger than the writer initially expected, including a 3DS bundle. [AW02](#aw02)

Nintendo's FY2013 briefing specifically said Awakening was well received by U.S. consumers and later showed the European launch topping German and French software charts. [AW17](#aw17)

### Sales milestones

Use dated/defined numbers rather than a vague “huge success”:
- Nintendo/industry reporting said North American sales exceeded **240,000** by spring 2013. [AW15](#aw15)
- A later official-series page reported **1.79 million worldwide** by December 2014. [AW18](#aw18)
- CESA shipment data reported by Perfectly Nintendo lists **2.37 million** worldwide as of the 2023 White Book dataset. [AW19](#aw19)

Those are unit/shipment milestones, not revenue, active users or profit.

### Long-term franchise effect

Awakening clearly exceeded the feared cancellation threshold and was followed by *Fates*, *Echoes*, *Three Houses*, *Engage* and an expanded mobile/spinoff ecosystem.

It is fair to say it **helped revive** the series; it is not fair to claim one mechanic alone saved Fire Emblem.

## 22. Five substantive written reviews

### 1. GameSpot — Heidi Kemps, 2013

**Praised:** refined tactical combat, Pair Up/positioning, supports/characters, world-map freedom, side content and StreetPass.

**Criticized:** some advanced interface information was hard to find and local multiplayer was shallow. [AW01](#aw01)

### 2. Game Informer — Kimberley Wallace, 2013

**Praised:** intense tactical decisions, sharp enemy punishment, relationship-assisted combat, colorful cast, marriage/children and approachable teaching.

**Criticized:** some outcomes could feel overly luck-dependent; story was weaker than the combat in its early stretch. [AW11](#aw11)

### 3. Nintendo Life — Jon Wahlgren, 2013

**Praised:** the balance between series tradition and accessibility, character-driven story, tactical depth, replay value and the option to choose Casual/Classical consequence.

**Criticized:** multiplayer options were comparatively weak; the review's central tension was whether broader accessibility risked dulling the series' traditional stakes. It concluded Awakening largely succeeded. [AW20](#aw20)

### 4. Destructoid — Chris Carter, 2013

**Praised:** character art/personality, extensive customization, tactical foundation and breadth of content.

**Criticized:** uneven 3D presentation/model quality and some traditional rough edges. [AW12](#aw12)

### 5. RPGamer — Mike Moehnke, 2013

**Praised:** world-map flexibility, optional Paralogues, extensive class/build options and tactical quality.

**Criticized:** some enemy behavior/difficulty patterns and the possibility that repeatable battles reduce the pressure of finite experience/resources. [AW02](#aw02)

### Review synthesis

The independent reviews converge most strongly on:
- excellent core tactics;
- unusually likable/persistent cast;
- meaningful relationship mechanics;
- broad accessibility without deleting Classic mode.

The most useful disagreement is about **freedom versus tactical tightness**:
- grinding/reclassing/Pair Up enable experimentation;
- the same flexibility can weaken scarcity and map-level constraint.

## 23. Player/community evidence

There is no Steam release, so Steam review sampling is not applicable.

Preserved GameSpot user reviews show veteran players praising the way supports, romance and customization expanded Fire Emblem while still debating story quality and balance. [AW21](#aw21) [AW22](#aw22)

Later retrospectives identify the same long-running fault line:
- some players value the social/relationship emphasis Awakening normalized;
- some longtime tactical fans believe Pair Up, fanservice and build freedom pulled attention from tighter map strategy.

GameSpot's 2023 retrospective explicitly describes that split and notes how later titles kept negotiating social systems versus tactical emphasis. [AW23](#aw23)

### Interpretation

This is not evidence that “casual players like relationships and hardcore players hate them.” The audiences overlap.

The more defensible lesson:
> adding a second source of mastery—relationships/build composition—can broaden attachment, but it competes for design attention with spatial tactical mastery.

## 24. Transferable inspiration for OpenLegend

### A. Let relationships change what people can physically do together

Support should not be only:
- a dialogue meter;
- a damage buff.

Relationships can affect:
- willingness to rescue;
- coordinated timing;
- shared knowledge;
- lending;
- risk tolerance;
- communication bandwidth;
- delegation.

Awakening shows the emotional power of a relationship feeding directly into action.

### B. Track career history separately from current occupation

Second Seal builds are an excellent precedent:
- current class != complete learned identity.

For an OpenLegend actor, history can include:
- former profession;
- teacher;
- injuries;
- languages;
- factions;
- techniques no longer practiced.

### C. Descendants should inherit consequences, not just stats

Awakening's children are compelling because family choices affect future people.

OpenLegend can make inheritance multidimensional:
- biology;
- culture;
- property;
- reputation;
- grudges;
- knowledge;
- legal obligations;
- social networks.

### D. Optional relationships can create future opportunities

A Paralogue appearing because two people married is more interesting than a static quest board.

Generalize:
> world state + relationship state → opportunity.

### E. Difficulty should separate consequence from cognition

Casual/Classic proves that:
- “how hard is the tactical puzzle?”
- “how permanent is failure?”

are independent axes.

OpenLegend can separately configure:
- enemy competence;
- scarcity;
- death permanence;
- retry/rewind;
- information availability.

### F. Shareable personal state can be content

StreetPass teams turned a player's roster/build into something another player could encounter.

OpenLegend worlds could share:
- travelers;
- rumors;
- artifacts;
- authored inventions;
- recorded legends

without requiring synchronized multiplayer.

### G. Preserve character attachment under system depth

The developers explicitly prioritized “love for the characters.” [AW14](#aw14)

A simulation can be deep and still fail if people become fungible stat bundles.

OpenLegend should keep:
- names;
- faces/voices;
- memories;
- relationships;
- unique histories

attached to mechanical capability.

## 25. Limits / what not to copy automatically

### Pair Up's bundling is too dominant

Do not make “be close to trusted ally” simultaneously the best:
- defense;
- offense;
- mobility;
- relationship growth;
- stat strategy

without counterplay.

### Fixed romance compatibility is a content-production shortcut

Awakening can hand-author every support pair. OpenLegend wants broader social possibility, so compatibility should emerge from:
- identity;
- orientation/preferences;
- history;
- context;
- values;
- attraction/attachment

rather than only an authored whitelist.

### Transparent child optimization can objectify people

If descendants' value is mostly stat inheritance, players optimize spouses as breeding inputs.

OpenLegend should preserve uncertainty and personhood.

### Unlimited grinding can erase world pressure

Repeatable encounters are accessible but can trivialize scarcity.

### Random defensive saves can undermine planning

Probabilistic Dual Guard creates drama but also outcome variance. Use randomness where uncertainty itself is meaningful and perceivable.

## 26. Requirement map and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2, 17–18 |
| R02 player actions / mechanics | §§3–18 |
| R03 items / entities / composition | §§3, 7–9, 18 |
| R04 progression / economy / time | §§6–11, 18 |
| R05 concrete interactions | §19 |
| R06 people / AI / social / multiplayer | §§4–6, 12–14, 17, 23 |
| R07 art / audio / interface / feel | §16 |
| R08 story / narrative | §§5–6, 12, 15, 18 |
| R09 production | §20 |
| R10 marketing / distribution / virality | §21 |
| R11 commercial / participation | §21 |
| R12 reviews / player feedback | §§22–23 |
| R13 inspiration / limits | §§24–25 |
| R14 sources / preservation / navigation | this section + Sources |

### Mechanics inventory check

Covered:
- avatar/identity;
- classes/stats/growth;
- levels/promotion/reclassing;
- skills;
- weapons/durability/forging;
- magic/staves;
- map traversal;
- Pair Up/Dual actions;
- combat;
- items/economy;
- optional encounters;
- death/permadeath/Casual;
- story;
- supports/marriage;
- children/inheritance;
- party/deployment;
- enemy AI;
- world map/events;
- Paralogues;
- StreetPass/Double Duel;
- DLC/postgame.

Absent/not major:
- stealth subsystem;
- settlement building;
- open crafting;
- player-run economy;
- free-roaming 3D traversal;
- MMO/live-service endgame.

### Preservation check

Before G62, the inherited reference packet and existing game/mechanics indexes were searched for Awakening/Fire Emblem-specific prior owners. The roster addition establishes G62 as a new independent pass; no inherited full Awakening dossier existed on the branch. Existing cross-game references remain preserved in their owners rather than duplicated wholesale.

### Current-access boundary

As of September 2026:
- original physical 3DS copies remain usable;
- previously purchased digital content can still be redownloaded per Nintendo's current support wording;
- new purchases of the game/DLC through 3DS eShop are unavailable;
- original 3DS online services are retired.

No unavailable DLC feature is treated here as universally obtainable current content.

## Sources

<a id="aw01"></a>**AW01 — [Fire Emblem: Awakening Review](https://www.gamespot.com/reviews/fire-emblem-awakening-review/1900-6403250/).** Heidi Kemps, GameSpot, 2013. Full review: world map, Pair Up/Dual systems, interface, StreetPass/local multiplayer, story/characters.

<a id="aw02"></a>**AW02 — [Fire Emblem: Awakening Review](https://rpgamer.com/review/fire-emblem-awakening-review/).** Mike Moehnke, RPGamer, 2013. Full review: world-map structure, Paralogues, promotion/reclass breadth, difficulty and launch promotion context.

<a id="aw03"></a>**AW03 — [Fire Emblem Awakening introduction](https://serenesforest.net/awakening/general/introduction/).** Serenes Forest community mechanics reference; avatar, Pair Up and supports.

<a id="aw04"></a>**AW04 — [Calculations](https://serenesforest.net/awakening/miscellaneous/calculations/).** Serenes Forest community formula reference for combat/Dual mechanics.

<a id="aw05"></a>**AW05 — [Dual System](https://serenesforest.net/awakening/miscellaneous/dual-system/).** Serenes Forest. Pair Up, Dual Support, Dual Strike and Dual Guard mechanics.

<a id="aw06"></a>**AW06 — [Tag Team and Pair Up](https://serenesforest.net/fire-emblem-fates/miscellaneous/tag-team-and-pair-up/).** Serenes Forest. Used as sequel-design evidence that Fates intentionally rebalanced Awakening's overly powerful Pair Up system; not attributed to Awakening itself.

<a id="aw07"></a>**AW07 — [Support Basics](https://serenesforest.net/awakening/characters/supports/support-basics/).** Serenes Forest. Support-point action routes and rank mechanics.

<a id="aw08"></a>**AW08 — [Iwata Asks: Fire Emblem Awakening — “I Want to Get Married Again”](https://iwataasks.nintendo.com/interviews/3ds/fire-emblem/0/3/).** Nintendo developer interview. Primary intent evidence for reviving marriage/generational mechanics.

<a id="aw09"></a>**AW09 — [Children](https://serenesforest.net/awakening/characters/children/).** Serenes Forest. Class/stat/skill inheritance mechanics and exceptions.

<a id="aw10"></a>**AW10 — [Reclassing / Second Seal](https://fireemblem.fandom.com/wiki/Reclassing).** Fire Emblem Wiki community reference for Awakening reclass rules; corroborated by contemporary reviews.

<a id="aw11"></a>**AW11 — [Fire Emblem: Awakening Review](https://www.gameinformer.com/games/fire_emblem_awakening/b/3ds/archive/2013/01/30/fire-emblem-awakening-review.aspx).** Kimberley Wallace, Game Informer, January 30, 2013. Full review.

<a id="aw12"></a>**AW12 — [Review: Fire Emblem: Awakening](https://www.destructoid.com/reviews/review-fire-emblem-awakening/).** Chris Carter, Destructoid, January 30, 2013. Full review.

<a id="aw13"></a>**AW13 — [Wii U & Nintendo 3DS eShop Discontinuation Q&A](https://en-americas-support.nintendo.com/app/answers/detail/a_id/57847/).** Nintendo Support. Primary current source for March 27, 2023 purchase shutdown, April 8, 2024 online-service shutdown and redownload availability.

<a id="aw14"></a>**AW14 — [Iwata Asks: Fire Emblem Awakening — Making the Ultimate Culmination](https://iwataasks.nintendo.com/interviews/3ds/fire-emblem/0/1/).** Nintendo developer interview. Primary “put in everything” / character-love development account.

<a id="aw15"></a>**AW15 — [Strong Fire Emblem: Awakening sales saved the series' cancellation](https://www.gamespot.com/articles/strong-fire-emblem-awakening-sales-saved-the-series-cancellation/1100-6408782/).** GameSpot, May 23, 2013. Secondary reporting on Yamagami's 250k threshold statement and early North American sales.

<a id="aw16"></a>**AW16 — [Iwata Asks: Fire Emblem Fates — “It’s Not a Simple Enemy/Ally Relationship”](https://iwataasks.nintendo.com/interviews/3ds/fire-emblem-fates/0/3/).** Nintendo. Retrospective primary developer confirmation that Awakening had been treated as potentially the last series entry.

<a id="aw17"></a>**AW17 — [Nintendo FY2013 financial briefing](https://www.nintendo.co.jp/ir/en/events/130425/index.html).** Nintendo investor relations. Primary corporate evidence of strong U.S. reception and European chart performance.

<a id="aw18"></a>**AW18 — [Awakening sold 1.79 million copies as of December 2014](https://nintendoeverything.com/fire-emblem-awakening-sold-1-79-million-copies-as-of-december-2014/).** Nintendo Everything translation/reporting of an official Fire Emblem promotional page. Dated worldwide-unit milestone.

<a id="aw19"></a>**AW19 — [CESA White Book 2023 shipment data](https://www.perfectly-nintendo.com/cesa-white-book-2023-additional-shipment-data-for-nintendo-and-third-party-games-nintendo-switch-nintendo-3ds/).** Perfectly Nintendo summary of CESA data; reports 2.37m Awakening units. Secondary data route, not revenue.

<a id="aw20"></a>**AW20 — [Fire Emblem: Awakening Review](https://www.nintendolife.com/reviews/3ds/fire_emblem_awakening).** Jon Wahlgren, Nintendo Life, January 30, 2013. Full review.

<a id="aw21"></a>**AW21 — [GameSpot user review: Another Great Installment](https://www.gamespot.com/fire-emblem-awakening/user-reviews/2200-137603/).** Player-authored 2013 review; qualitative evidence only.

<a id="aw22"></a>**AW22 — [GameSpot user review: As good as the critics say?](https://www.gamespot.com/fire-emblem-awakening/user-reviews/2200-143568/).** Player-authored 2013 veteran-series review; qualitative evidence only.

<a id="aw23"></a>**AW23 — [Fire Emblem Awakening Saved The Series, And Reshaped It—For Better Or Worse](https://www.gamespot.com/articles/fire-emblem-awakening-saved-the-series-and-reshaped-it-for-better-or-worse/1100-6511174/).** Heidi Kemps, GameSpot, 2023 retrospective. Useful for long-running tactical-vs-social fan tension; analysis, not a launch review.
