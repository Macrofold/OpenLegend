# RimWorld — full research dossier

**G21 · Complete research pass, September 26, 2026.** This dossier covers the modern **PC game** at the current 1.6/Odyssey boundary while keeping base-game and expansion mechanics separate. The latest official patch found during this pass is **1.6.4850 (June 8, 2026)**, which Ludeon says is compatible with all savegames and mods. The five PC expansions are **Royalty, Ideology, Biotech, Anomaly, and Odyssey**. Console Edition is a separate Double Eleven branch and is not silently treated as equivalent to the PC content stream. Mods are a major part of RimWorld's ecosystem but are not counted as vanilla mechanics. [RW01](#rw01) [RW02](#rw02)

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

## 11. Relationships, social memory and individual history

RimWorld's social layer matters because social state is attached to the same people who perform practical work and survive physical events. Colonists have opinions of one another, family relationships, romance and social interactions; experiences such as insults or other interactions can alter opinion and mood, and low opinion can contribute to fights. Existing or generated family ties can make an arriving outsider personally important before the player has any economic reason to care. [RW18](#rw18)

The simulation is not a language-model conversation engine. Much of social life is conveyed through:
- compact interaction records;
- relationship/opinion values;
- mood thoughts and memories;
- romance and breakup states;
- kinship;
- fights and other behavioral consequences.

That abstraction is both a strength and a documented weakness. It is cheap enough for a whole colony to maintain persistent social history, but Sam Greer's PC Gamer review found the everyday colonists emotionally artificial despite enjoying the broader incident system. The prior overview preserves that dissent rather than treating commercial success as proof that every layer of the people simulation is convincing. [RW31](#rw31)

**Transferable pattern:** social memory earns its cost when it changes future action, risk or obligation. A remembered insult that affects cooperation or a family member whose capture changes priorities is more legible than a large hidden memory store that never alters behavior.

## 12. Prisoners, recruitment and coercive social systems

A downed hostile pawn can become a prisoner rather than simply an enemy corpse. In Core, wardens can interact with prisoners, reduce resistance and attempt recruitment; prisoners can also be released, which can have faction consequences. Prison conditions, mood and the warden's social ability affect this management loop. [RW19](#rw19)

This creates one of RimWorld's strongest role-transition patterns:

> attacker → wounded patient → prisoner → recruit → specialist/friend/partner

The person's physical history and relationships persist across that transition. The preserved overview already uses the attacker-to-recruit case as a concrete example of why persistent identity matters.

**Ideology boundary:** slavery is an Ideology system, not a base-game mechanic. Ideology explicitly adds slave ownership/trade and belief-system precepts that can approve or condemn slavery. Slaves can perform much colony work but require suppression and can rebel. The mechanic is ethically charged content and should be described, not normalized as a default model for OpenLegend. [RW23](#rw23)

## 13. Factions, goodwill, trade, quests, caravans and the world map

RimWorld is not only a single settlement tile. Generated factions occupy the world and can appear as visitors, traders, quest-givers, allies or attackers. Relationship/goodwill distinguishes allied, neutral and hostile relationships, and faction settlements give caravans external destinations. [RW20](#rw20)

### Trade

Trade converts surplus production into strategic flexibility. Ground caravans/visitors can trade directly, while later infrastructure supports orbital trade. Different traders buy and sell different categories rather than functioning as universal shops. Silver is the common exchange currency, but the deeper loop is:

1. produce or acquire something beyond immediate consumption;
2. transport/store it;
3. meet a buyer with relevant demand;
4. exchange it for scarce equipment, medicine, components, animals or other useful goods;
5. let those acquisitions change the next production or defense decision. [RW21](#rw21)

A colony can therefore specialize economically without a formal “merchant class.”

### Caravans and world travel

The player can assemble a caravan from colonists, animals, prisoners and supplies, then travel across the generated world to trade, complete quests, attack sites or relocate. Every traveler removed from the home map is also absent from farming, medicine and defense there. Pack animals, food, speed, terrain and risk turn travel into a staffing/logistics decision rather than a free fast-travel menu. [RW22](#rw22)

Odyssey later adds a radically different mobile-home layer through the gravship; that is expansion content, not a replacement for Core caravans.

### Quests

Core and expansions generate quests with rewards such as items, goodwill or people. Royalty expands this especially aggressively, procedurally combining guests, enemies, conditions, helpers and rewards. That means “quest” is frequently a temporary rules situation layered onto the existing colony rather than a handcrafted corridor detached from it. [RW24](#rw24) [RW25](#rw25)

## 14. Storytellers, incidents and narrative structure

RimWorld's authored premise is thin by design: people are stranded on a dangerous rimworld and may ultimately escape. Most narrative comes from persistent simulation plus incident pacing.

The classic storytellers influence **when and how pressure arrives**, while difficulty changes how punishing the rules are. Incidents can include raids, weather, disease, visitors, traders, quests, resource opportunities and other disruptions. The storyteller does not know the player's private emotional interpretation; it supplies conditions that can collide with existing people and infrastructure. [RW01](#rw01) [RW10](#rw10)

This separation produces three narrative layers:

1. **Authored framing** — crashlanded survival, factions, technology and optional endings.
2. **Procedural pressure** — storyteller-selected incidents and generated quests.
3. **Player interpretation** — the remembered meaning of what actually happened to specific colonists, animals and places.

The tortoise story in the preserved granular study is important precisely because layer 3 can exceed what the rules explicitly encode. Conversely, PC Gamer's dissent shows that player interpretation cannot be assumed: some players see a convincing personal saga; another may see visible simulation machinery. [RW31](#rw31)

### Endings and continuation

Core's classic escape arc is building/using a ship and surviving the danger around departure. Expansions add alternate arcs:
- **Royalty:** host and protect the High Stellarch, then leave as an Imperial guest;
- **Ideology:** pursue the archonexus;
- **Anomaly:** confront the monolith/machine-god arc and choose an outcome;
- **Odyssey:** pursue the mechhive/gravship exploration endgame.

RimWorld is also commonly played without rushing an ending. Long-term colony identity, new recruits, technology, construction, ideology/family development, modded content and self-authored projects sustain play after basic survival is solved. [RW25](#rw25) [RW23](#rw23) [RW27](#rw27) [RW28](#rw28)

## 15. Interface, art, audio, accessibility and feel

RimWorld uses a top-down, icon-heavy visual language with simple pawn bodies and highly legible tile/room geometry. The relative visual abstraction leaves screen space for dense information: zones, bills, needs, health, social relationships, work priorities, alerts and construction plans. Several release-era reviewers saw the minimal graphics as an acceptable or even useful tradeoff for systemic readability; the harsher criticism was aimed more often at menu depth, inconsistent interaction patterns and initial onboarding. [RW06](#rw06) [RW07](#rw07) [RW11](#rw11) [RW33](#rw33)

The interface alternates between two control styles:
- **policy/designation control** for ordinary work;
- **direct drafted orders** during emergencies and combat.

That handoff is powerful but can create friction. Gideon's Gaming and GameGrin both describe interface/control confusion as a meaningful negative; a failure caused by misunderstood navigation or hidden management rules feels different from a failure caused by a knowingly risky strategy. [RW07](#rw07) [RW33](#rw33)

### Audio

The base game's space-western/ambient score by **Alistair Lindsay** supports long low-intensity management stretches without demanding constant attention. Expansions add further music; Royalty's official page, for example, lists 13 additional tracks, while Anomaly received a separate horror-oriented soundtrack. [RW25](#rw25) [RW27](#rw27)

### Current Steam accessibility surface

Steam currently exposes adjustable difficulty, save-anytime support, adjustable text size, camera-comfort support, custom volume controls, no quick-time-event requirement, a mouse-only option, partial controller support and Steam Deck verification. These storefront labels are useful current capability evidence, not a complete accessibility audit. [RW29](#rw29)

## 16. Multiplayer, mods and extension boundaries

The PC game's native store feature set is **single-player**. Steam Workshop is officially supported, but native cooperative colony play is not a base-game mode. Multiplayer experiences commonly seen in the community come from mods and must not be counted as shipped multiplayer. [RW29](#rw29)

Modding is nevertheless structurally central to RimWorld's longevity. Workshop mods can add interface changes, content, factions, mechanics and major conversions. Tynan Sylvester's current site says there are **tens of thousands** of Steam Workshop mods, and his 2018 one-million-sales post explicitly thanked modders, video makers, streamers, artists and people who recommended the game. These are first-party statements about community contribution, not measured channel-attribution percentages. [RW34](#rw34) [RW35](#rw35)

The research rule is therefore:
- vanilla behavior is established from Core/official expansion sources;
- a mod can be discussed as an extension example;
- familiarity with a popular mod cannot be silently backfilled into the base game.

The earlier PCGamesN review gives a useful version of the same tension: the reviewer valued the vanilla foundation while noting that returning from a heavily modded setup could make Core feel sparse. [RW06](#rw06)

## 17. Expansion-by-expansion mechanics and boundaries

The five PC expansions add distinct axes of identity and pressure. They can coexist, but each should be understood separately instead of treating modern RimWorld as one undifferentiated ruleset.

### Royalty — February 24, 2020

Royalty adds the Empire, honor and noble titles, throne-room/status expectations, Imperial permits, **psycasts**, meditation styles, procedurally generated quest families, mechanoid clusters, techprints, persona weapons, implants and an alternate Imperial ending. A permit can summon military help, labor, shuttles or orbital force; psychic powers can affect both combat and social/management situations. [RW25](#rw25) [RW36](#rw36)

Most relevant inspiration: advancement can create **new obligations and identity**, not only stronger stats. A title grants capabilities while also making status/space/ritual matter.

### Ideology — July 20, 2021

Ideology gives people belief systems assembled from broad memes and specific precepts. Beliefs can affect food, clothing, body modification, violence, drugs, comfort, animals, work, relationships, ritual, social roles and other everyday actions. It also adds conversion, relic quests, rituals, specialists/leaders, dryad/tree systems, slavery and the archonexus endgame. [RW23](#rw23) [RW37](#rw37)

Most relevant inspiration: values become interesting when they alter **ordinary choices**. “Believes X” is mechanically stronger when X changes acceptable food, architecture, relationships, work or conflict rather than remaining biography flavor.

### Biotech — October 21, 2022

Biotech adds three large systems:
- **children and families**, including pregnancy/babies, childhood development and growth;
- **genes/xenotypes**, allowing biological differences and engineered combinations;
- **mechanitors/mechanoids**, including labor/combat mechs, infrastructure, bosses and pollution/waste consequences.

Ludeon described Biotech as a larger-scope expansion that took about 15 months and was substantial enough that the team considered splitting it before retaining it as one package. [RW26](#rw26) [RW38](#rw38)

Most relevant inspiration: a world becomes more persistent when characters have **generational continuity**, while engineered bodies and delegated machines create new forms of specialization/dependency.

### Anomaly — April 11, 2024

Anomaly is a horror-focused expansion organized around a mysterious monolith and dangerous entities. Its distinctive loop is not merely “more monsters”: the colony can capture and **contain** anomalies, study them, build dedicated containment infrastructure and exploit some of their powers while risking breaches. It adds occult rituals/cult threats and a spoiler-sensitive monolith endgame. [RW27](#rw27) [RW39](#rw39)

Most relevant inspiration: the same entity can be **threat → captured object of study → useful resource → renewed threat**. Containment converts combat victory into an ongoing operational relationship.

### Odyssey — July 11, 2025

Odyssey adds the **gravship**, a player-built flying home that can relocate the colony and eventually travel into orbit. It expands exploration with new biomes/sites, space platforms/asteroids, new animals and fishing, new quests/enemies/equipment, and a machine-hive endgame. Free update 1.6 launched alongside it with broad performance and quality-of-life work that does not require Odyssey. [RW28](#rw28) [RW40](#rw40)

Most relevant inspiration: a base can become a **persistent moving object** rather than a place the player abandons when traveling. This changes the relationship between “home,” expedition and world map.

### Expansion reception is not uniform

Current Steam review snapshots for the DLC differ materially, with Biotech/Odyssey stronger than some other packs and Anomaly more divisive. Those storefront aggregates have different sample sizes, dates and audience selection, so they should be treated as product-specific signals rather than a clean ranking of design quality. [RW41](#rw41)

## 18. Production and development

Tynan Sylvester says he founded Ludeon and built the first version alone in 2013 without outside funding. The first public pre-alpha went out November 4, 2013 after an early public reveal and crowdfunding push. The project then developed in public for years before 1.0 on October 17, 2018. [RW03](#rw03) [RW04](#rw04) [RW34](#rw34)

### Public-development sequence

A useful high-level sequence is:
- September 2013: early public first-look material and interest gathering;
- October 2–November 1, 2013: Kickstarter;
- November 4, 2013: first public pre-alpha;
- 2013–2018: repeated alpha/beta releases and direct sales;
- January 2018: Ludeon announces one million copies sold while still pre-1.0;
- October 17, 2018: 1.0;
- 2020–2025: five major expansions, generally paired with substantial free updates;
- 2026: continued 1.6 patch maintenance. [RW03](#rw03) [RW04](#rw04) [RW35](#rw35) [RW42](#rw42)

The Kickstarter raised **CA$268,132 from 9,498 backers against a CA$20,000 goal**. This is evidence that the early concept found paying interest, not proof that crowdfunding caused later success. [RW43](#rw43)

Tynan's 2017 GDC abstract describes RimWorld explicitly through the “story generator” framing and contrarian/selective design choices. As preserved in the earlier study, only the public abstract was used there; this research does not represent the full presentation as watched. [RW44](#rw44)

A later developer interview attributes much of the game's success to an underexplored design space with interested players and to focusing on the experiences of a handful of individuals rather than empire-scale growth. That is creator interpretation of product/market fit, not an independently measured causal result. [RW45](#rw45)

## 19. Marketing, distribution, community and virality

RimWorld's distribution evolved rather than launching once through a single storefront.

- The 2013 Kickstarter converted an already-demonstrated concept into early funding and an audience.
- Public pre-alpha/alpha/beta sales created a long feedback and word-of-mouth runway before 1.0.
- Steam became a major storefront/community/mod distribution surface.
- Ludeon also sells DRM-free access directly; GOG distribution arrived in March 2020 alongside the Royalty era.
- Console Edition later opened PlayStation/Xbox access through a separate port. [RW43](#rw43) [RW46](#rw46) [RW08](#rw08)

The game's unusually shareable unit is often **a colony incident with named participants**. A tortoise survival saga, catastrophic freezer fire or disastrous rescue can be retold without sharing a save file. Tynan's one-million-sales post specifically thanks people who made videos, streamed, made art/comics or told friends, showing that the developer viewed those community activities as meaningful support. It does **not** establish what percentage of sales came from each channel. [RW35](#rw35)

The mod ecosystem strengthens the same loop:
- players create new experiences;
- Workshop reduces distribution friction;
- mod lists and screenshots create reasons to return/share;
- major game updates reactivate both players and mod authors.

That is a plausible longevity mechanism, not a controlled attribution study.

## 20. Commercial and participation context

The available milestones are unusually strong for an independent premium simulation, but the measures must stay distinct.

- **50,000 copies sold:** Ludeon announced the milestone November 28, 2014. [RW47](#rw47)
- **One million copies sold:** announced January 31, 2018, before 1.0. [RW35](#rw35)
- **Over four million copies sold:** Tynan Sylvester's current personal site states this lifetime milestone and says Ludeon has released five major expansions. This is a creator-reported figure, not an audited financial statement. [RW34](#rw34)
- **Steam reception snapshot, September 2026:** Steam displays approximately **97% positive across ~119.5k English-language reviews** and **96% positive across ~1.4k recent reviews**; the counts move continuously. Review ratios are self-selected user sentiment, not sales, retention or unique active users. [RW29](#rw29)

The business model is premium base game plus separately sold major expansions, with free version updates accompanying expansion eras. Mods are predominantly distributed through community infrastructure such as Steam Workshop rather than sold as first-party microtransactions. Historical pricing changed over development, so this dossier avoids treating one present store price as the game's permanent economic identity.

## 21. Five substantive written reviews

All five required written reviews were read as substantive bodies, not score snippets. They are mostly **2018–2019/Core-era evaluations**, so they are evidence for the foundation rather than stealth reviews of Royalty through Odyssey.

### 1. Sam Greer — PC Gamer (2018/2019)

Greer enjoyed imaginative colony management and unpredictable incidents but argued that the “story generator” claim overreached because everyday colonist personalities/interactions often felt artificial or reductive. The review also criticized waiting and administrative friction and raised representation concerns specific to the release-era character systems. This is the most important counterweight to the library's enthusiastic emergent-story examples. [RW31](#rw31)

### 2. Anna Blackwell — PCGamesN

Blackwell praises how many systems become understandable through practical colony problems, how blueprint construction and logistics feed emergent anecdotes, and how the log of events can become a story record. Combat/direct control is described as comparatively awkward, and the review notes the tension between rich mod ecosystems and a leaner vanilla setup. [RW06](#rw06)

### 3. Simone Brown — GameGrin

Brown values replayability, freedom and the gradual research/colony-building loop, but finds the interface inconsistent/clunky and the initial learning experience under-explained. The review is useful because it separates systemic depth from the quality of the player's first contact with those systems. [RW07](#rw07)

### 4. Mike Holmes — Gamereactor

Holmes praises the depth of the simulation, biome/site consequences and the way generated colonists become memorable through play, while warning that complexity/onboarding can overwhelm and that the visual presentation is deliberately minimal. [RW11](#rw11)

### 5. Gideon's Gaming

The review, written after extensive play, praises the interaction between survival systems, social logs, replayability and mods, but calls out clunky interface behavior and losses caused by navigation/control confusion. It is especially useful for the distinction between **interesting systemic failure** and **frustrating interface-caused failure**. [RW33](#rw33)

### Cross-review synthesis

Common praise across these reviews:
- unusual replayability;
- interlocking survival/management systems;
- memorable incidents;
- player-authored colony identity;
- a strong foundation for mods.

Common friction:
- onboarding and UI complexity;
- indirect-control surprises;
- stretches of waiting/maintenance;
- combat/control roughness;
- the gap between simulated social variables and emotionally convincing people for some players.

The important conclusion is not “RimWorld solved people.” It solved enough **persistent consequential difference** that many players can construct stories around people, while leaving room for a more behaviorally expressive social layer.

## 22. Steam helpful-review sampling

Steam's review surface is self-selected and continuously changing. The samples below are qualitative accounts, not prevalence estimates.

### Positive/helpful material

The prior granular study preserved two highly concrete 2021 accounts from Steam's helpful surface:
- **KingKuma:** an old tortoise became the organizing objective of a long colony story involving preservation, resurrection/stasis and eventual escape;
- **Spicy Mayo:** fire reached stored chemfuel and propagated through a layout whose connected spaces had previously seemed convenient.

A current helpful review with hundreds of hours frames RimWorld as a more accessible futuristic *Dwarf Fortress* and specifically values the breadth of base-game play, mods, readable UI and fitting music. Another long-playtime current review emphasizes that the same rules can support radically different self-authored moral/social styles. [RW30](#rw30)

### Negative/mixed material

The accessible recent negative/helpful surface included several different complaints rather than one single objection:
- a low-hour player found the controls/camera/text/complexity hard to parse;
- another felt the story generator leaned too heavily on raids relative to the strategic depth of combat;
- one objected to family/children being expansion-gated behind Biotech;
- another disliked indirect pawn control and the mismatch between intended and actual behavior.

These are useful failure modes to test, not evidence that most players share them; the current aggregate remains strongly positive. [RW32](#rw32) [RW29](#rw29)

## 23. Concrete cross-system situations

These are either documented mechanics composed into rules-based illustrations or explicitly attributed player accounts. They are not represented as play sessions conducted for this research.

### A. The doctor becomes the emergency

**Constructed from documented Core rules.**

1. A raid wounds several colonists.
2. The best doctor is also injured, reducing the colony's treatment capacity.
3. Patients bleed while medicine and beds are physically elsewhere.
4. The player must decide whether a weaker doctor treats everyone, whether the expert treats others before resting, and which injuries deserve scarce medicine.
5. A preventable infection or lost limb can change that pawn's future work value.
6. The aftermath alters staffing, mood and future defensive planning.

**Why it works:** combat consequences propagate into medicine, logistics and labor instead of ending at “victory.”

### B. A production policy quietly stops doing what the player meant

**Documented work/bill interaction; detailed example preserved in the granular study.**

1. The player configures a bill intended to keep one spare garment.
2. The bill's stock-counting/filter rules define what counts as “enough.”
3. A worn or otherwise unintended item satisfies the rule.
4. The tailor stops producing even though the player's human intention is “one useful spare.”
5. The player inspects the bill, corrects the definition and restores the intended automation.

**Limit:** this is also interface debt. A reusable autonomous policy is valuable only if the player can inspect what its terms actually mean.

### C. A prisoner changes sides

**Constructed from Core prisoner/recruitment rules.**

1. An attacker is downed and captured.
2. Treating and feeding the prisoner consumes medicine, food, bed space and warden time.
3. The warden reduces resistance and attempts recruitment.
4. If recruitment succeeds, the same pawn becomes part of the colony with persistent skills, wounds and social potential.
5. The colony may have gained exactly the specialist it lacked, but only because it paid the cost of preserving an enemy.

**Why it works:** identity persists across a role transition instead of spawning a generic replacement worker.

### D. Belief turns architecture into psychology

**Constructed with Ideology; expansion-dependent.**

1. A colony adopts precepts that care strongly about particular ritual spaces, food, clothing or environmental conditions.
2. The settlement's “efficient” layout does not satisfy those values.
3. Colonists experience mood/social consequences and ritual quality depends on spaces/roles.
4. The player changes architecture and production not because a tech tree demanded it, but because the people believe differently.

**Why it works:** values modify ordinary material choices.

### E. A monster becomes infrastructure

**Constructed with Anomaly; expansion-dependent.**

1. The colony defeats/captures an anomalous entity.
2. Instead of ending the interaction, the player builds containment around it.
3. Colonists study it and may exploit its outputs/powers.
4. Stronger use or inadequate containment creates an ongoing operational hazard.
5. The former encounter becomes a persistent room, work assignment and future risk.

**Why it works:** combat discovery becomes a long-lived relationship with a world entity.

### F. The home itself becomes the expedition vehicle

**Constructed with Odyssey; expansion-dependent.**

1. The colony builds a gravship over time.
2. Rooms and infrastructure are no longer purely fixed to one map.
3. Moving the ship relocates the same accumulated “home” into new environments.
4. Exploration decisions now include what parts of the colony travel, what resources sustain mobility and what risks follow the ship.
5. The distinction between base management and expedition play narrows.

**Why it works:** a persistent authored object changes category without losing history.

### G. The tortoise becomes the point of the run

**Attributed Steam player account; preserved rather than re-invented.**

KingKuma's helpful review describes an old tortoise becoming important enough that preservation, resurrection/stasis and eventual evacuation shaped the run's goals. The game supplied animal/medical/storage/combat systems; the player supplied much of the meaning. [RW30](#rw30)

## 24. Transferable inspiration for OpenLegend — and limits

### 1. Make identity causally expensive

A trait, belief, injury or relationship matters when it changes what the person does and what the player must do around them.

**Borrow:** capability refusal, learned specialties, obligations, social memory and physical history with visible consequences.

**Do not copy automatically:** dozens of hidden mood modifiers simply to make a character sheet look deep.

### 2. Separate standing intent from moment-to-moment execution

Work priorities and bills are compact ways to express recurring intent.

**Borrow:** inspectable policies such as “maintain a reserve,” “this person normally handles X,” or “do not enter this area.”

**Failure mode:** if the player's words map to opaque counting/scheduling rules, the agent can be technically compliant and experientially wrong. Natural language does not eliminate the need for inspectable semantics.

### 3. Let systems cross domains

RimWorld's strongest stories often come from a physical event changing social/economic capacity:
- wound → doctor shortage;
- power outage → food spoilage;
- belief → architecture;
- enemy → recruit;
- animal → personal mission.

**Borrow:** cross-system consequences.

**Limit:** not every object needs realistic simulation. Add interactions that produce decisions, not hidden state for its own sake.

### 4. Preserve role transitions and object history

People and entities remain interesting when they can change categories while retaining identity.

**Borrow:** enemy/prisoner/friend; wild animal/companion; monster/research subject; base/vehicle.

This is highly aligned with an authored-reality engine because the world can remember “this is the same thing” without requiring a bespoke content chain for every transformation.

### 5. Pressure and cognition are different systems

The storyteller can choose a storm or raid without pretending to think like a character.

**Borrow:** keep world pacing/adversity separate from character cognition and social reasoning.

**Limit:** adaptive pressure should not make success feel fake by perfectly countering every achievement.

### 6. Leave room for player interpretation

The tortoise story works partly because the game does not narrate a definitive literary explanation for every event.

**Borrow:** factual event history plus selective character expression can leave interpretive space.

**Counterpoint:** PC Gamer's criticism shows that too little expressive behavior can make people feel like spreadsheets. OpenLegend's opportunity is not “more prose”; it is stronger coupling between private motive, visible choice and remembered consequence.

### 7. Expansion design can add a new axis instead of inflating a content list

Royalty, Ideology, Biotech, Anomaly and Odyssey each attach a different question to the same colony simulation:
- status/power;
- belief;
- generation/body/delegated machines;
- containment/horror;
- mobility/exploration.

**Borrow:** modular world packages whose rules meaningfully alter existing systems.

**Limit:** expansion gating can also frustrate players when a feature feels foundational to the fantasy; the current Steam negative sample about children/Biotech is a concrete example.

## 25. Viewing/reading route and spoiler boundaries

Recommended order for understanding RimWorld without needing dozens of hours:

1. **Official base page / launch trailer** — see colony scale, work designation, combat, animals and incident framing. [RW01](#rw01)
2. **Preserved granular mechanics study** — read work priorities, bills, cooler failure, fire cascade and tortoise story. [Granular study](../mechanics/rimworld-work-dependencies-personality-and-story.md)
3. **PC Gamer + PCGamesN reviews** — deliberately contrasting interpretations of whether the story-generator premise succeeds emotionally. [RW31](#rw31) [RW06](#rw06)
4. **Expansion pages in release order** — Royalty → Ideology → Biotech → Anomaly → Odyssey. [RW25](#rw25) [RW23](#rw23) [RW26](#rw26) [RW27](#rw27) [RW28](#rw28)
5. **Tynan's GDC abstract and production history** — understand the design framing without falsely claiming the full talk was watched. [RW44](#rw44)

**Spoilers:** the detailed Anomaly endgame and Odyssey late-game machine-hive content are better avoided before playing those expansions. This dossier names their structural existence but does not reproduce encounter-by-encounter resolutions. Royalty/Ideology ending premises are summarized at a high level because they are openly described on official product pages.

## 26. Requirement map

| Requirement | Substantive coverage |
| --- | --- |
| **R01 — identity/scope/promise** | §§1–2; PC/console/mod/expansion boundaries |
| **R02 — player actions/mechanics** | §§2–10, 12–17 |
| **R03 — items/entities/composition** | §§5–6, 8–10, 17, 23 |
| **R04 — progression/economy/time** | §§4, 7, 13–14, 17, 20 |
| **R05 — concrete situations** | §23 plus preserved cooler/fire/tortoise/bill cases |
| **R06 — people/AI/social/multiplayer** | §§3–4, 10–13, 16–17 |
| **R07 — art/audio/interface/feel** | §15 plus review synthesis §21 |
| **R08 — story/narrative/play connection** | §§11, 14, 17, 23 |
| **R09 — production/development** | §18 |
| **R10 — marketing/distribution/virality** | §19 |
| **R11 — commercial/participation context** | §20 |
| **R12 — reception/player feedback** | §§21–22 |
| **R13 — transferable inspiration/limits** | §24 |
| **R14 — sources/preservation/navigation** | §§25–28 and prior-owner links |

## 27. Source register

<a id="rw01"></a>
**RW01 — [RimWorld official game description](https://rimworldgame.com/), Ludeon Studios.** Primary current overview accessed September 26, 2026. Used for Core promise, official inspirations, PC platforms, needs/health, relationships, body replacement, combat, crafting, animals and trade. Promotional description; “AI storyteller” is incident pacing, not an LLM claim.

<a id="rw02"></a>
**RW02 — [Update 1.6.4850 released](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), Ludeon Studios, June 8, 2026.** Primary current-patch evidence; says the patch is compatible with savegames and mods.

<a id="rw03"></a>
**RW03 — [RimWorld first pre-alpha released](https://ludeon.com/blog/2013/11/rimworld-first-pre-alpha-released/), Ludeon Studios, November 4, 2013.** Primary first-public-build history.

<a id="rw04"></a>
**RW04 — [RimWorld 1.0 released](https://ludeon.com/blog/2018/10/rimworld-1-0-released/), Ludeon Studios, October 17, 2018.** Primary 1.0 release boundary.

<a id="rw05"></a>
**RW05 — [RimWorld 1.0 will be released October 17](https://ludeon.com/blog/2018/10/rimworld-1-0-will-be-released-october-17/), Ludeon Studios, October 7, 2018.** Primary retrospective used for the public-development duration and collaboration history.

<a id="rw06"></a>
**RW06 — Anna Blackwell, [RimWorld review](https://www.pcgamesn.com/rimworld/review), PCGamesN, updated December 21, 2021.** Substantive review body read. Used for blueprint/colony control, combat, emergent-story logs and mod/vanilla tension. Historical Core evaluation, not a current DLC review.

<a id="rw07"></a>
**RW07 — Simone Brown, [RimWorld Review](https://www.gamegrin.com/reviews/rimworld-review/?os=35), GameGrin, 2019.** Substantive review body read. Used for work control, mood, research, replayability and UI/onboarding criticism.

<a id="rw08"></a>
**RW08 — [RimWorld Console Edition FAQ](https://rimworld.double11.com/faq/), Double Eleven.** Console boundary. Used to keep the port/controller/content track distinct from current PC rules; not used to assume DLC parity.

<a id="rw09"></a>
**RW09 — [Scenario system](https://rimworldwiki.com/wiki/Scenario_system), RimWorld Wiki.** Community reference for default scenarios and configurable scenario rules; version-sensitive.

<a id="rw10"></a>
**RW10 — [Quickstart Guides](https://rimworldwiki.com/wiki/Quickstart_Guides), RimWorld Wiki.** Community reference for storyteller/setup distinctions; no exact incident formulas claimed.

<a id="rw11"></a>
**RW11 — Mike Holmes, [RimWorld review](https://www.gamereactor.eu/rimworld-review/), Gamereactor, October 26, 2018.** Substantive review body read. Used for biome/site choice, simulation depth, colonist stories and onboarding/visual tradeoffs.

<a id="rw12"></a>
**RW12 — [Skills](https://rimworldwiki.com/wiki/Skill), RimWorld Wiki.** Community mechanics reference for skills/passions and learning/mood relationship.

<a id="rw13"></a>
**RW13 — [Work](https://rimworldwiki.com/index.php?title=Work), RimWorld Wiki.** Community reference for manual work priorities, ordering and incapabilities; also preserved in the granular study.

<a id="rw14"></a>
**RW14 — [Bill](https://rimworldwiki.com/wiki/Bill), RimWorld Wiki.** Community reference for production modes/thresholds/filters, read in the prior granular study and used with that evidence limitation.

<a id="rw15"></a>
**RW15 — [Thoughts](https://www.rimworldwiki.com/wiki/Thoughts), RimWorld Wiki.** Community reference for mood effects, including pain and passionate work. Exact values omitted.

<a id="rw16"></a>
**RW16 — [Body Parts](https://www.rimworldwiki.com/wiki/Body_part), RimWorld Wiki.** Community mechanics reference for body-part injury/capacity and armor coverage.

<a id="rw17"></a>
**RW17 — [Resurrector mech serum](https://rimworldwiki.com/wiki/Resurrector_mech_serum) and [Death](https://www.rimworldwiki.com/wiki/Death), RimWorld Wiki.** Community reference for Core resurrection/corpse preservation and the boundary from Anomaly's death-refusal mechanic.

<a id="rw18"></a>
**RW18 — [Social](https://rimworldwiki.com/wiki/Social), RimWorld Wiki.** Community reference for opinion, interactions, romance/family and social consequences. DLC-specific commands are not generalized to Core.

<a id="rw19"></a>
**RW19 — [Prisoner](https://rimworldwiki.com/wiki/Prisoner), RimWorld Wiki.** Community reference for capture, wardens, resistance/recruit/release and DLC-specific prisoner options. Slavery remains attributed to Ideology.

<a id="rw20"></a>
**RW20 — [Factions](https://rimworldwiki.com/wiki/Factions), RimWorld Wiki.** Community reference for faction settlements, goodwill/status and external groups.

<a id="rw21"></a>
**RW21 — [Trade](https://rimworldwiki.com/wiki/Trade), RimWorld Wiki.** Community reference for visiting/caravan/orbital trade and trader specialization; no fixed present prices copied.

<a id="rw22"></a>
**RW22 — [Caravan](https://rimworldwiki.com/wiki/Caravan), RimWorld Wiki.** Community reference for assembling/traveling with colonists, animals, prisoners/mechs and supplies.

<a id="rw23"></a>
**RW23 — [RimWorld Ideology](https://rimworldgame.com/ideology/), Ludeon Studios.** Primary expansion page. Used for belief systems, memes/precepts, roles, rituals, conversion, slavery boundary and archonexus.

<a id="rw24"></a>
**RW24 — [Quest](https://rimworldwiki.com/wiki/Quest), RimWorld Wiki.** Community reference for Core/expansion quest structure and reward types.

<a id="rw25"></a>
**RW25 — [RimWorld Royalty](https://rimworldgame.com/royalty/), Ludeon Studios.** Primary expansion page. Used for Empire/titles, permits, psycasts, procedural quests, mech clusters, gear and Imperial ending.

<a id="rw26"></a>
**RW26 — [RimWorld Biotech](https://rimworldgame.com/biotech/), Ludeon Studios.** Primary expansion page. Used for children/families, genes/xenotypes and mechanitors/mechs/pollution.

<a id="rw27"></a>
**RW27 — [RimWorld Anomaly](https://rimworldgame.com/anomaly/), Ludeon Studios.** Primary expansion page. Used for horror entities, containment/study, rituals and high-level endgame boundary.

<a id="rw28"></a>
**RW28 — [RimWorld Odyssey](https://rimworldgame.com/odyssey/), Ludeon Studios.** Primary expansion page. Used for gravships, exploration/space, animals/fishing, quests and high-level endgame boundary.

<a id="rw29"></a>
**RW29 — [RimWorld on Steam](https://store.steampowered.com/app/294100/RimWorld/), Valve/Ludeon.** Current distribution, native single-player/Workshop features, accessibility labels and moving review snapshot. Self-selected reviews are not retention/sales data.

<a id="rw30"></a>
**RW30 — [RimWorld Steam community reviews](https://steamcommunity.com/app/294100/reviews/), player-authored reviews.** Helpful-review surfaces sampled September 2026 plus preserved 2021 KingKuma/Spicy Mayo accounts. Qualitative testimony only; ordering changes over time.

<a id="rw31"></a>
**RW31 — Sam Greer, [RimWorld review](https://www.pcgamer.com/rimworld-review/), PC Gamer, January 8, 2019 (print review December 2018).** Substantive critical counterpoint. Used for management praise, social/emotional skepticism, waiting/UI friction and release-era representation concerns.

<a id="rw32"></a>
**RW32 — [Steam negative review filtering for RimWorld](https://store.steampowered.com/app/294100/RimWorld/), Valve/player reviews, sampled September 2026.** Current helpful/recent negative accounts summarized by issue (complexity/control, raid emphasis, DLC segmentation, indirect pawn behavior). Not a prevalence estimate and not reproduced verbatim.

<a id="rw33"></a>
**RW33 — [RimWorld Review](https://gideonsgaming.com/rimworld-review/), Gideon's Gaming, October 22, 2018.** Substantive written review read. Used for survival/storytelling depth, social logs, mods/replayability and interface/navigation criticism.

<a id="rw34"></a>
**RW34 — [Tynan Sylvester — About](https://tynansylvester.com/), accessed September 26, 2026.** Creator's current biography. States he built the first version alone in 2013 without outside funding, current lifetime sales over four million, five expansions, ~500k subreddit membership and tens of thousands of Workshop mods. Creator-reported, not independently audited.

<a id="rw35"></a>
**RW35 — [One million copies sold!](https://ludeon.com/blog/2018/01/one-million-copies-sold/), Tynan Sylvester/Ludeon, January 31, 2018.** Primary sales milestone and creator thanks to modders, video/stream creators, artists and word-of-mouth community.

<a id="rw36"></a>
**RW36 — [RimWorld free update 1.1 and Royalty expansion released](https://ludeon.com/blog/2020/02/rimworld-free-update-1-1-and-royalty-expansion-released/), Ludeon, February 24, 2020.** Primary Royalty release date and paired free-update evidence.

<a id="rw37"></a>
**RW37 — [Ideology expansion released!](https://ludeon.com/blog/2021/07/ideology-expansion-released/), Ludeon, July 20, 2021.** Primary Ideology release date, free 1.3 update and compatibility notes.

<a id="rw38"></a>
**RW38 — [Biotech expansion and update 1.4 available now!](https://ludeon.com/blog/2022/10/biotech-expansion-and-update-1-4-available-now/) and [Biotech preview #4](https://ludeon.com/blog/2022/10/biotech-preview-4-xenotypes-world-factions-and-the-dark-blood-drinkers/), Ludeon, October 2022.** Primary release/scope evidence; preview #4 documents 15-month production and the team's decision not to split the feature set.

<a id="rw39"></a>
**RW39 — [Anomaly expansion and update 1.5 out now!](https://ludeon.com/blog/2024/04/anomaly-expansion-and-update-1-5-out-now/) and [containment preview](https://ludeon.com/blog/2024/03/anomaly-preview-2-containment-facilities-creatures-and-release-date/), Ludeon, March–April 2024.** Primary release and containment-loop evidence.

<a id="rw40"></a>
**RW40 — [The RimWorld – Odyssey expansion is out now!](https://ludeon.com/blog/2025/07/the-rimworld-odyssey-expansion-is-out-now/), Ludeon, July 11, 2025.** Primary Odyssey release and free 1.6 boundary.

<a id="rw41"></a>
**RW41 — Steam store pages for [Royalty](https://store.steampowered.com/app/1149640/RimWorld__Royalty/), [Ideology](https://store.steampowered.com/app/1392840/RimWorld__Ideology/), [Biotech](https://store.steampowered.com/app/1826140/RimWorld__Biotech/), [Anomaly](https://store.steampowered.com/app/2380740/RimWorld__Anomaly/) and [Odyssey](https://store.steampowered.com/app/3022790/RimWorld__Odyssey/), Valve/Ludeon.** Current expansion-specific user-review snapshots; moving, self-selected and not directly comparable as controlled samples.

<a id="rw42"></a>
**RW42 — Ludeon release history, 2013–2026.** The specific pre-alpha, 1.0, expansion and current patch posts above establish the chronology; no unseen proprietary development process inferred.

<a id="rw43"></a>
**RW43 — [RimWorld Kickstarter](https://www.kickstarter.com/projects/tynansylvester/rimworld/), October 2–November 1, 2013.** Primary crowdfunding record: CA$268,132 pledged by 9,498 backers against CA$20,000 goal. Funding is not sales or lifetime revenue.

<a id="rw44"></a>
**RW44 — Tynan Sylvester / GDC, [RimWorld: Contrarian, Ridiculous, and Impossible Game Design Methods](https://www.gdcvault.com/play/1024232/-RimWorld-Contrarian-Ridiculous-and), 2017.** Public abstract only. Used for story-generator framing and selective/contrarian design; full talk not represented as watched.

<a id="rw45"></a>
**RW45 — Quin Callahan, [Interview: Tynan Sylvester Talks Ludeon Studios' RimWorld](https://culturedvultures.com/tynan-sylvester-rimworld/), Cultured Vultures, October 3, 2018.** Substantive interview body read. Used for Sylvester's attributed explanation that RimWorld reached an underexplored design space, his preference for small-scale individual stories over empire growth, influences, deliberate lore omission and the importance he assigns to mod support. These are creator interpretations, not independent causal measurements.

<a id="rw46"></a>
**RW46 — [RimWorld coming to GOG](https://ludeon.com/blog/2020/02/rimworld-coming-to-gog/), Ludeon, February 26, 2020.** Primary storefront-expansion evidence; GOG release announced for March 3, 2020.

<a id="rw47"></a>
**RW47 — [50,000 copies sold!](https://ludeon.com/blog/2014/11/50000-copies-sold/), Ludeon, November 28, 2014.** Primary historical sales milestone.

## 28. Preservation and completion check

Compared against the prior [RimWorld overview](../games/rimworld.md) and [granular work/dependencies/personality/story study](../mechanics/rimworld-work-dependencies-personality-and-story.md). This full pass **adds** breadth and current expansion/version context without replacing their earlier evidence owners.

Preserved explicitly:
- **who someone is → what they did → what changed** as the core causal-story interpretation;
- storyteller as incident pacing, **not an LLM**;
- work-priority and bill semantics;
- cooler-orientation troubleshooting account;
- Spicy Mayo's fire/chemfuel/layout catastrophe;
- KingKuma's tortoise story;
- Sam Greer's emotional-believability dissent;
- the release-era strange family-chronology example;
- GDC 2017 **abstract-only** access limitation;
- single-player versus modded multiplayer boundary;
- no claim that shareable stories quantitatively caused sales.

No new source is represented as watched footage unless explicitly stated; the recommended trailer remains a viewing route. Community wiki pages are mechanics references, not source-code audits. Current Steam samples are qualitative and time-sensitive. Console behavior is not assumed from the PC branch. Expansion systems are labeled rather than silently projected into Core.

**G21 completion judgment:** R01–R14 are substantively covered, including the explicit mechanics inventory, five independent written reviews, current Steam helpful/negative sampling, expansion boundaries, production/distribution/commercial context, concrete interactions, transfer limits, preservation and navigation. G21 is ready to be marked complete in the progress ledger.
