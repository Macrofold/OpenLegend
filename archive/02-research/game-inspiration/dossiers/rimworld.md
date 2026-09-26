# RimWorld — full research dossier

**G21 · In-progress research pass, September 26, 2026.** This dossier covers the modern **PC game** at the current 1.6/Odyssey boundary while keeping base-game and expansion mechanics separate. The latest official patch found during this pass is **1.6.4850 (June 8, 2026)**, which Ludeon says is compatible with all savegames and mods. The five PC expansions are **Royalty, Ideology, Biotech, Anomaly, and Odyssey**. Console Edition is a separate Double Eleven branch and is not silently treated as equivalent to the PC content stream. Mods are a major part of RimWorld's ecosystem but are not counted as vanilla mechanics. [RW01](#rw01) [RW02](#rw02)

[Preserved overview](../games/rimworld.md) · [Granular mechanics study](../mechanics/rimworld-work-dependencies-personality-and-story.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

The load-bearing idea is not merely “random stories.” RimWorld makes **specific people, resources, spaces, instructions, and outside pressures collide**. A colonist's inability to do a task, a bad freezer layout, a social break, an infection, or a raid matters because it intersects a persistent settlement whose earlier choices remain physically and socially present. The storyteller is an incident/pacing system, **not an LLM narrator**.

## 1. Identity, promise, and current scope

RimWorld is a single-player science-fiction colony simulation developed by Tynan Sylvester/Ludeon Studios. The first public pre-alpha shipped to backers on **November 4, 2013**; version 1.0 released **October 17, 2018** after roughly five and a half years of public development. Ludeon's current description says the game draws inspiration from *Dwarf Fortress*, *Firefly*, and *Dune*. [RW03](#rw03) [RW04](#rw04) [RW05](#rw05)

The classic base-game promise begins with three shipwreck survivors. The player does not directly possess one hero. Instead, they:
- choose a scenario, storyteller/difficulty, generated world and landing site;
- select a small set of generated colonists;
- designate construction, zones, work, schedules and production;
- draft people for precise combat commands when needed;
- keep colonists fed, rested, sheltered, socially functional and medically alive;
- research technology and transform raw materials into infrastructure, weapons, apparel, medicine and trade goods;
- negotiate or fight with factions, recruit outsiders, tame animals and travel by caravan;
- endure incidents selected by a storyteller and interpret the resulting history as a colony story;
- optionally pursue an escape/endgame rather than treating endless colony life as the only objective. [RW01](#rw01) [RW06](#rw06) [RW07](#rw07)

The base game is not a conventional RPG with a player-authored protagonist, class selection, dialogue wheel or spell list. Identity is distributed across the colonists and settlement. The player is closer to planner, emergency commander and chronicler than embodied avatar.

### PC versus console

The current research target is the PC game. RimWorld Console Edition was ported by Double Eleven and uses a controller/television-focused interface on a branch with its own content roadmap. Its available DLC/content should therefore be verified separately instead of assuming PC expansion parity. This dossier uses console only as a distribution/interface boundary, not as evidence for current PC rules. [RW08](#rw08)

## 2. Scenario, world and colonist creation

A new colony is configured at several layers rather than through one character creator.

### Scenario

The four classic default base scenarios are **Crashlanded, Lost Tribe, The Rich Explorer, and Naked Brutality**. The scenario system can also alter the starting community, items, animals, health conditions, forced traits and persistent special rules. This is a rule-composition layer: two runs can begin with the same world generation but radically different capabilities and pressure. [RW09](#rw09)

### Storyteller and difficulty

The classic storytellers differ in incident pacing: Cassandra Classic escalates pressure in a structured way, Phoebe Chillax leaves more breathing room, and Randy Random is less predictable. Difficulty is a separate choice and can be adjusted independently. The important boundary is that storytellers choose and pace incidents; they do not generate free-form prose or understand the player's private interpretation of events. [RW01](#rw01) [RW10](#rw10)

### World and landing site

The generated globe contains biomes, roads/rivers and faction settlements. A temperate forest with a long growing season gives a very different survival problem from desert, tundra, ice sheet or dense jungle. Landing-site selection therefore acts as a practical difficulty and resource decision before the player builds anything. [RW06](#rw06) [RW11](#rw11)

### Colonists

The player chooses among generated people rather than assigning a clean class build. Colonists carry:
- backstories and age/history;
- traits;
- skills;
- passions that change learning rate and the experience of performing related work;
- work incapabilities;
- existing health conditions;
- family and social relationships where generated;
- later-acquired wounds, addictions, implants and social memories. [RW01](#rw01) [RW12](#rw12)

This produces useful asymmetry. A talented doctor may refuse violence; a fighter may be poor at intellectual work; a colonist with a passion can be worth training even when their starting skill is mediocre. The practical question is not “what is the optimal class?” but “what dependencies does this particular roster create?”

Deep manual pawn editors commonly associated with screenshots or mod lists are **mods**, not proof of a vanilla full-stat character creator.

## 3. Skills, passions, traits and work

RimWorld's base skill vocabulary spans the settlement's main activities: shooting, melee, construction, mining, cooking, plants, animals, crafting, artistic, medical, social and intellectual work. Skills improve through use; passions accelerate learning and can make related work emotionally rewarding. Traits and backstories can alter behavior/capability independently of skill. [RW12](#rw12)

The Work interface translates this uneven roster into standing policy. In manual priority mode, each enabled work type receives a priority; unavailable work can reflect an actual incapability rather than merely low skill. Equal-priority work is still ordered by the work table, so “priority” is an executable scheduling rule, not an intelligent statement of intent. [RW13](#rw13)

That distinction is one of RimWorld's best references for agent design:
- **possible**: can this pawn perform the work?
- **permitted**: has the player enabled it?
- **priority**: how should it compare with other categories?
- **local job choice**: which concrete task is selected next?
- **contextual wisdom**: should an exception override normal policy right now?

RimWorld deliberately solves the first layers much better than the last. This keeps automation legible but can create friction when the player's intuitive meaning of “take care of patients first” differs from the scheduling system's exact semantics.

### Bills: durable intentions

Workstation bills let the player encode repeated production rather than issuing every craft individually. Bills can make a fixed quantity, continue indefinitely, or maintain stock toward a target; filters and worker restrictions narrow what ingredients/people count. The previous granular study preserves the detailed “keep a spare usable garment” example and the failure modes created by mistaken counting/filter assumptions. [RW14](#rw14)

This is stronger than mere auto-repeat because the system can represent an ongoing purpose. It is also weaker than general intelligence: the bill does not independently understand why the colony wants the item.

## 4. Needs, mood and mental breaks

Colonists are not only production units. Food, rest, recreation, comfort/beauty/environmental conditions, pain and social circumstances contribute to mood. Thoughts can arise from specific experiences and persist for a time; pain and passionate work are examples of state that changes how a person feels rather than merely changing output. [RW01](#rw01) [RW15](#rw15)

Mood matters because sustained distress can produce mental breaks. The exact behavior is not “the player loses hit points”; the colonist can stop ordinary work or act in a way that creates a new situation. A food shortage can therefore become:
1. hunger;
2. low mood;
3. a mental break;
4. missed medical/construction work;
5. a second-order crisis.

The useful pattern is **state crossing domains**. Psychology matters because it changes action, and actions then change the physical colony.

Drugs and addictions add another dependency layer. They can be tools, recreational goods, trade goods and medical/psychological risks. Policies can make consumption routine or conditional. Biotech can additionally make some xenotypes genetically dependent on particular substances; that expansion rule should not be projected backward onto Core.

## 5. Items, resources, inventory and equipment

RimWorld's object economy is broad but strongly compositional. Major families include:
- raw materials such as wood, steel, stone blocks and advanced industrial materials;
- plant/animal food and prepared meals;
- medicine and drugs;
- textiles, leather and clothing;
- melee/ranged weapons;
- armor and utility gear;
- components and advanced components;
- furniture, art and production structures;
- animal products;
- trade goods and rare quest rewards.

The official base description explicitly emphasizes crafting structures, weapons and apparel from multiple material families. Material choice can therefore be more than recipe flavor: what the object is made of may affect its practical value. [RW01](#rw01)

Colonists have equipped apparel/weapons and can carry items, but the settlement's real “inventory” is spatial. Stockpile zones and storage structures determine where resources physically live. Hauling labor, travel distance, temperature, fire and enemy access therefore affect logistics. A pile of medicine in the wrong building is not abstractly available in the same way as a global inventory counter.

This physicality is why the earlier Steam fire story matters: a burning colonist reaching chemfuel and a connected hallway could transform a storage design into a propagation path. The prior study retains that player account as attributed testimony, not telemetry. [Preserved mechanics study](../mechanics/rimworld-work-dependencies-personality-and-story.md#5-local-hazards-can-reveal-a-settlements-hidden-structure)

## 6. Building, rooms, power, temperature and agriculture

Construction is blueprint/designation driven. The player plans walls, doors, floors, furniture, production benches, storage, defenses and utilities; colonists with the appropriate work capability deliver material and build them.

### Rooms and layout

Rooms matter because layout changes:
- walking distance;
- privacy and comfort;
- storage access;
- temperature containment;
- defense;
- fire/heat propagation;
- work flow.

The colony is therefore a persistent memory of past planning. A hospital beside medicine storage may improve response time; a single shared corridor can become a bottleneck or heat path.

### Power

Electrical infrastructure turns production into a dependency graph: generation supports batteries and powered devices; interruptions can disable refrigeration, lighting, production or defenses. The exact device catalogue changes with DLC/technology, but the important interaction is stable: a power failure can become a food or medical problem without directly damaging food or patients.

### Temperature

Heat is simulated spatially enough that coolers, heaters, vents, walls, open doors, fires and outside conditions interact. The previous study's current-player troubleshooting case—installing coolers with their hot exhaust facing the wrong space—illustrates a useful principle: an item's name describes intended use, but orientation and environment determine the actual result. [Preserved mechanics study](../mechanics/rimworld-work-dependencies-personality-and-story.md#4-a-cooler-can-create-the-opposite-of-its-name)

### Agriculture

Growing zones turn soil, climate and labor into food/material production. Seasonal temperatures and growing periods make storage and reserve planning matter. Research can unlock controlled growing methods such as hydroponics, but those systems introduce power/infrastructure dependencies in exchange for environmental control.

## 7. Research and progression

RimWorld has no universal character level. Progress is spread across several persistent forms:
- colonist skill growth and changing health/equipment;
- population and relationships;
- researched technology;
- better production capacity;
- infrastructure and defenses;
- trained animals;
- faction relationships;
- accumulated gear/resources;
- expansion-specific powers, titles, genes, mech control, anomaly knowledge or gravship capability.

The research tree unlocks new production and strategic affordances rather than merely increasing a global number. GameGrin's 1.0 review specifically describes research as opening brewing/drugs, technology, material use and new products that can support trade. [RW07](#rw07)

This gives RimWorld a strong early/mid/late transformation:
- **early**: shelter, food, beds, storage, basic power/medicine and survival;
- **middle**: specialization, research, larger production chains, trade, better defenses, caravans and social complexity;
- **late**: advanced equipment/infrastructure and an optional endgame, with DLC opening alternative late-game arcs.

Death or colony collapse can erase a run's material progression. Knowledge belongs to the player, so failure still produces metagame learning even without a formal account-level progression tree.

## 8. Health, body parts, disease, surgery and death

Health is unusually concrete for a colony sim. Human bodies are divided into parts, and damage to a limb, organ, eye, brain or other part can alter capacities rather than collapsing all harm into one health bar. Armor protects body groups; severe wounds can bleed, incapacitate or kill. [RW16](#rw16)

Treatment creates labor/resource chains:
- a capable conscious doctor;
- time and a usable treatment location;
- medicine when appropriate;
- protected recovery time;
- food/rest;
- surgery and replacement parts for some long-term damage.

Ludeon's base description explicitly includes replacing wounded limbs and organs with prosthetics, bionics or biological replacements. [RW01](#rw01)

This makes a survivor's history mechanically legible. A raid is not over when enemies leave: infection, missing limbs, pain, reduced manipulation/mobility and doctor exhaustion can define the next several days.

### Corpses and resurrection

Ordinary death is persistent, and corpses themselves remain physical objects subject to storage, decay, burial/cremation or other use depending on colony choices. Core includes the rare **resurrector mech serum**, a non-craftable reward/found item that can revive a non-desiccated organic corpse but can cause serious resurrection ailments; keeping a corpse frozen preserves the possibility much longer. Anomaly adds a separate late-game **death refusal** system, so it must not be described as a Core rule. [RW17](#rw17)

This creates a particularly strong form of attachment: the player can decide that preserving one dead pawn's body is worth freezer space, power reliability and future quest hunting.

## 9. Combat, defense and failure

Outside combat, RimWorld is primarily indirect. During combat, the player can **draft** colonists and issue precise movement/targeting orders. Combat combines:
- ranged and melee weapons;
- positioning and range;
- cover;
- body-part damage and armor coverage;
- doors/walls/choke points;
- traps and static defenses;
- medical aftermath;
- animals or allied forces;
- different enemy behaviors such as human raiders, insects and mechanoids. [RW01](#rw01) [RW06](#rw06)

Base RimWorld does **not** use a conventional ammunition economy for ordinary guns; PCGamesN explicitly notes that ammo requirements are a modded option. This matters because mod familiarity can easily contaminate descriptions of vanilla combat. [RW06](#rw06)

Stealth is not a broad base-game pillar comparable to a stealth-action game. Positioning, line of sight, doors, ambush-like defenses and some expansion powers/entities can create concealment or detection situations, but the main combat vocabulary is tactical defense and direct engagement.

Failure is deliberately recoverable until it is not. A person can be downed rather than instantly killed; enemies can be captured; a settlement can survive losses; the player's “best” colonist can die while the colony continues. Conversely, cascading injury, fire, starvation or raids can end the entire run. Reviews repeatedly frame this as part of the game's story-generating appeal, while also noting that opaque UI or busywork makes a loss feel worse when it seems caused by interface friction rather than a readable decision. [RW06](#rw06) [RW07](#rw07)

## 10. Wildlife, taming and animals

The base game supports both ecological hazard and domestication. Animals can be:
- hunted for food/materials;
- tamed;
- trained;
- kept for farm products;
- bonded with colonists;
- used as pack animals or, for suitable species/training, combat helpers. [RW01](#rw01)

This is important because an entity can change category over time: wild animal → tame animal → bonded companion → injured dependent → remembered loss. The mechanics do not need a bespoke “pet story” script for the player to assign emotional value.

The preserved KingKuma Steam account about protecting and repeatedly preserving an old tortoise remains the strongest prior example in this library. It is a player's retelling, not evidence that the tortoise system computed the same narrative meaning. [Preserved mechanics study](../mechanics/rimworld-work-dependencies-personality-and-story.md#6-an-animal-can-become-the-objective-of-a-campaign)

## 11. Checkpoint status — remaining before G21 can be marked complete

This is a substantive **in-progress checkpoint**, not a completed dossier. Remaining work:
- finish relationships/social memory, prisoners/recruitment and faction/reputation/trade/quest/caravan coverage;
- finish authored/procedural narrative, interface/art/audio/accessibility and multiplayer/mod boundaries;
- complete separate Royalty, Ideology, Biotech, Anomaly and Odyssey sections with release/version boundaries;
- complete production, marketing/distribution, commercial milestones and current Steam participation context;
- summarize **five read written reviews** and current accessible Steam helpful positive/negative samples without treating them as prevalence;
- add concrete end-to-end situations spanning different systems;
- add OpenLegend transfer/limits, spoilers/viewing route, full annotated source register and R01–R14 map;
- reread the full dossier against the preserved overview/mechanics study, validate internal links, and only then mark G21 complete/update the ledger.

## Sources read in this checkpoint

<a id="rw01"></a>
**RW01 — [RimWorld official game description](https://rimworldgame.com/), Ludeon Studios.** Current primary overview accessed September 26, 2026. Used for Core promise, official inspirations, PC platforms, moods/needs/health, relationships, body replacement, combat, crafting, animals, trade and current developer framing. Promotional description; not independent reception. “AI storyteller” is the developer's term for incident pacing, not an LLM claim.

<a id="rw02"></a>
**RW02 — [Update 1.6.4850 released](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), Ludeon Studios, June 8, 2026.** Primary current-patch evidence; says the patch is compatible with all savegames and mods.

<a id="rw03"></a>
**RW03 — [RimWorld first pre-alpha released](https://ludeon.com/blog/2013/11/rimworld-first-pre-alpha-released/), Ludeon Studios, November 4, 2013.** Primary first-public-build history.

<a id="rw04"></a>
**RW04 — [RimWorld 1.0 released](https://ludeon.com/blog/2018/10/rimworld-1-0-released/), Ludeon Studios, October 17, 2018.** Primary 1.0 release/version boundary.

<a id="rw05"></a>
**RW05 — [RimWorld 1.0 will be released October 17](https://ludeon.com/blog/2018/10/rimworld-1-0-will-be-released-october-17/), Ludeon Studios, October 7, 2018.** Primary retrospective noting five and a half years of development, collaborators and mod/community contributions.

<a id="rw06"></a>
**RW06 — Anna Blackwell, [RimWorld review](https://www.pcgamesn.com/rimworld/review), PCGamesN, review updated December 21, 2021.** Read review body. Used for world/colonist setup, blueprint construction, tactical combat, emergent-story/log framing, simulation breadth and vanilla-versus-mod distinction. Historical 1.0-era evaluation, not a current DLC review.

<a id="rw07"></a>
**RW07 — Simone Brown, [RimWorld Review](https://www.gamegrin.com/reviews/rimworld-review/?os=35), GameGrin, 2019.** Read review body. Used for indirect work control, mood/personality, research, UI/tooltips/onboarding criticism and replayability. Historical 1.0 review.

<a id="rw08"></a>
**RW08 — [RimWorld Console Edition FAQ](https://rimworld.double11.com/faq/), Double Eleven.** Console boundary/source route; console is a distinct port/UI/content track. Recheck current platform DLC individually before making parity claims.

<a id="rw09"></a>
**RW09 — [Scenario system](https://rimworldwiki.com/wiki/Scenario_system), RimWorld Wiki.** Community mechanics reference for default scenarios and scenario-rule customization; version-sensitive and not a primary developer source.

<a id="rw10"></a>
**RW10 — [Quickstart Guides](https://rimworldwiki.com/wiki/Quickstart_Guides), RimWorld Wiki.** Community reference for classic storyteller/setup distinction. Used only for broad stable setup behavior, not formulas.

<a id="rw11"></a>
**RW11 — Mike Holmes, [RimWorld review](https://www.gamereactor.eu/rimworld-review/), Gamereactor, October 26, 2018.** Read review body. Used for biome/site consequences, difficulty customization, indirect management, complexity/onboarding and emergent-character framing.

<a id="rw12"></a>
**RW12 — [Skills](https://rimworldwiki.com/wiki/Skill), RimWorld Wiki.** Community mechanics reference for skills/passions and learning/mood relationship. Current pages can include DLC rules; expansion-dependent details remain labeled.

<a id="rw13"></a>
**RW13 — [Work](https://rimworldwiki.com/index.php?title=Work), RimWorld Wiki.** Community mechanics reference for manual work priorities and incapabilities. Also preserved in the prior granular study.

<a id="rw14"></a>
**RW14 — [Bill](https://rimworldwiki.com/wiki/Bill), RimWorld Wiki.** Community mechanics reference captured/read in the prior September 25 granular study. Used here through that preserved study rather than represented as a fresh runtime test.

<a id="rw15"></a>
**RW15 — [Thoughts](https://www.rimworldwiki.com/wiki/Thoughts), RimWorld Wiki.** Community mechanics reference for mood effects including pain and passionate work. Exact values are intentionally not copied into this high-level dossier.

<a id="rw16"></a>
**RW16 — [Body Parts](https://www.rimworldwiki.com/wiki/Body_part), RimWorld Wiki.** Community mechanics reference for body-part injury/capacity and armor coverage.

<a id="rw17"></a>
**RW17 — [Resurrector mech serum](https://rimworldwiki.com/wiki/Resurrector_mech_serum) and [Death](https://www.rimworldwiki.com/wiki/Death), RimWorld Wiki.** Community reference for the Core resurrection item, corpse preservation and distinction from Anomaly's death-refusal mechanic.

## Preservation note

The earlier [RimWorld overview](../games/rimworld.md) and [work/dependencies/personality/story study](../mechanics/rimworld-work-dependencies-personality-and-story.md) remain canonical owners of their prior examples and source limitations. This dossier does not overwrite:
- the original **who someone is → what they did → what changed** interpretation;
- Sam Greer's dissent that incident variety did not make the colonists emotionally convincing to that reviewer;
- the cooler-orientation troubleshooting case;
- the Steam fire/chemfuel catastrophe;
- KingKuma's tortoise story;
- the documented bills/work-priority examples;
- the GDC 2017 abstract limitation (abstract read, full talk not represented as watched);
- the explicit rule that RimWorld's storyteller is not an LLM.
