# Palworld — full research dossier

**G41 · Research pass and substantive audit remedies, September 26, 2026.** The design baseline is **Palworld 1.0 (July 10, 2026)**, with explicitly identified later documentation snapshots, not a claim that 1.0 was the last maintenance patch. January 2024 Early Access observations remain historical. The audit adds operational fishing, passive modification, mission/faction and multiplayer rules, corrects the furnace example and source attribution, and replaces the incomplete 1.0 citation. It does not claim a fresh playthrough or re-verification of every inherited fact. Proposed OpenLegend adaptations remain research interpretations, not accepted implementation requirements.

[Preserved overview](../games/palworld.md) · [Detailed creature/work study](../mechanics/palworld-useful-creatures-care-and-automation.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Library](../README.md)

Palworld matters to OpenLegend because it connects **useful autonomous creatures** to almost every part of play. Pals are not merely combat summons or cosmetic companions: they can fight, traverse, gather, farm, transport, craft, generate power, operate production, breed, inherit traits, become sick or stressed, and visually inhabit a base. The result is one of the clearest mainstream examples of “a helper is more emotionally legible when it is also a creature with a body, needs and recognizable identity.”

## 1. Identity, edition boundary and player promise

Palworld is Pocketpair's third-person open-world survival/crafting creature-collection game. Early Access began January 19, 2024; Pocketpair officially released **version 1.0 on July 10, 2026**. Steam displays July 9 in some regional views, but Pocketpair's official global announcement dates the release July 10. [PAL-A](#pal-a) [PAL-B](#pal-b)

The current loop combines:
- survival gathering;
- crafting and technology unlocks;
- character combat;
- Pal capture and collection;
- Pal combat;
- Pal-assisted traversal;
- base construction;
- production automation;
- breeding and trait optimization;
- tower/boss progression;
- open-world exploration;
- dungeons, raids, fishing and high-difficulty content;
- single-player, four-player hosted co-op and larger dedicated-server play;
- PvP and Pal-transfer systems with different rules, explained in §17.

Version 1.0 adds or restructures:
- **Sunreach**, floating islands with unique resources/Pals/bosses;
- the **World Tree**, now tied to the story climax;
- **72 new Pals**, for 287 total;
- **Awakening**;
- breeding **Mutation**;
- reworked Partner Skills for more than 200 Pals;
- a revised story/mission flow;
- settlements/sub-missions/journals;
- reworked raids and high-difficulty progression;
- broader base-building and exploration changes. [PAL-C](#pal-c)

This is materially broader than the launch-era game reviewed in January 2024.

## 2. Character identity, stats and progression

The player creates a human avatar rather than choosing a fixed RPG class.

Progression comes mainly from:
- character level;
- stat allocation;
- Technology unlocks;
- weapons/armor/tools;
- Pal team composition;
- mounts/Partner Skills;
- base research/production;
- captured/bred Pal quality;
- exploration and boss access.

The current level cap is **80** after the 1.0 rebalance. [PAL-C](#pal-c)

Player stats affect familiar survival/action capacities such as:
- health;
- stamina;
- carrying capacity;
- attack/work-related effectiveness depending on the current build/version.

Technology points unlock:
- tools;
- weapons;
- Pal equipment;
- structures;
- production stations;
- traversal equipment;
- higher-tier spheres;
- armor and utilities.

This makes progression partly **capability access** rather than only numerical strength.

### OpenLegend lesson

A character's growth can be expressed as:
- direct learned capability;
- equipment;
- institutional/base capability;
- relationships to capable companions.

Palworld gets substantial progression mileage from the last two.

## 3. Survival, gathering and inventory

The human player begins with basic harvesting and gradually industrializes.

Core gathered/processed resource families include:
- wood;
- stone;
- ore/metals;
- Paldium-related materials;
- food;
- fibers and organic materials;
- ammunition/explosive inputs;
- advanced regional ores;
- Pal drops;
- boss/ancient materials.

Version 1.0 adds new high-tier materials such as **Soralite** and **Paloxite**, tied to Sunreach and the World Tree. [PAL-C](#pal-c)

The player manages:
- carried inventory;
- weight/capacity;
- base storage;
- consumables;
- weapons/ammunition;
- Pal Spheres;
- food;
- schematics and crafting inputs.

Bases can pull from their own storage network for production, making **where resources live** important without forcing every workstation into a fully manual inventory loop.

## 4. Capture: combat becomes recruitment

Wild Pals are not simply enemies.

A common capture sequence is:
1. find a Pal;
2. weaken or otherwise improve capture conditions;
3. throw a Pal Sphere;
4. resolve probabilistic capture;
5. add the Pal to the party/Palbox if successful.

Higher-tier spheres improve capture capability against stronger targets.

The same encountered creature can become:
- fighter;
- mount;
- worker;
- breeder;
- ranch producer;
- expedition participant;
- collector target.

This is a strong compositional pattern:
> encounter → relationship/ownership transition → new capability.

OpenLegend can generalize this beyond “capture”:
- recruit;
- befriend;
- hire;
- tame;
- teach;
- ally;
- negotiate.

The important part is that an entity changes roles **without becoming a different ontology**.

## 5. Pals as combat entities

Pals fight in real time alongside the player.

A Pal contributes:
- elemental/type relationships;
- active skills;
- stats;
- passive skills;
- Partner Skill;
- movement/positioning;
- sometimes mounted weapon or traversal behavior.

The player can:
- deploy/recall Pals;
- switch team members;
- use their Partner Skills;
- attack directly with melee/ranged weapons;
- dodge/reposition;
- exploit terrain and enemy behavior.

The result is hybrid agency:
- human character is not merely a trainer issuing menu commands;
- Pal is not merely a stat modifier;
- both occupy the encounter.

Version 1.0 rebalanced Pal stats/abilities and reworked Partner Skills across more than 200 Pals. [PAL-C](#pal-c)

### Limitation and current qualification

Pal combat autonomy can make tactical intent less precise than a fully commanded party. Early reviewers described cases where Pals attacked something the player wanted to capture or made poor positioning choices. That is launch-era evidence, not a guarantee of current behavior, but the delegation problem is structural. [PAL-H](#pal-h)

The 1.0 notes specifically prevent **follow-up-attack Partner Skills** from delivering the finishing blow. That is a scoped capture safeguard, not a promise that every ordinary Pal attack is nonlethal. [PAL-C](#pal-c)

## 6. Partner Skills make species materially different

Partner Skills attach a distinctive interaction to many Pals.

Examples across the game include Pals that:
- become mounts;
- fly;
- swim;
- glide;
- act as weapons;
- improve carrying;
- alter damage;
- support gathering;
- assist specific work.

The important design pattern is:
> collecting a creature can unlock a **new verb or traversal affordance**, not merely a stronger number.

Version 1.0's large Partner Skill rework reinforces this direction. [PAL-C](#pal-c)

For OpenLegend, a companion becomes more memorable when:
- what it wants;
- what it can do;
- how it moves;
- how it helps

all connect.

## 7. Work Suitability: creature abilities become economic roles

Each Pal can have one or more **Work Suitabilities**.

Common role families include:
- planting;
- watering;
- generating electricity;
- handiwork;
- gathering;
- lumbering;
- mining;
- medicine production;
- cooling;
- transporting;
- kindling;
- farming/ranch-related roles.

A Pal assigned to a base autonomously finds compatible tasks.

This produces a readable labor system:
- a water creature can water;
- a strong miner can mine;
- a fire creature can kindle/furnace;
- a transporter moves goods.

The fantasy and the industrial role reinforce each other.

### OpenLegend pattern

Do not give every NPC one generic “work” score.

A meaningful autonomous inhabitant should have:
- capabilities;
- preferences;
- learned roles;
- tools;
- schedule/availability;
- needs;
- social constraints.

Then the world can route compatible work rather than asking an LLM to improvise every low-level action.

## 8. Base building and production

The player establishes bases with a Palbox and constructs:
- foundations/walls/roofs;
- beds;
- food/storage;
- workbenches;
- furnaces;
- farms;
- ranches;
- power infrastructure;
- assembly/production lines;
- defensive structures;
- specialized research/late-game facilities.

Pals assigned to the base can:
- harvest;
- move materials;
- operate stations;
- cook;
- grow crops;
- generate power;
- maintain production.

This means a base is both:
- **architecture**;
- **workflow**.

Version 1.0 significantly expanded building and base systems, including new construction options and balance/research changes. [PAL-C](#pal-c)

### Why this is emotionally different from Factorio

A conveyor belt has:
- throughput;
- routing;
- reliability.

A Pal worker has:
- a body;
- animation;
- species identity;
- hunger;
- SAN/stress;
- illness;
- sleep/rest behavior.

The production system therefore creates an ethical/emotional reading even when the underlying goal is throughput.

## 9. Hunger, SAN, rest and illness

Pals are not cost-free production nodes.

Base workers consume food and can suffer from:
- hunger;
- reduced SAN;
- stress;
- injury/illness;
- poor work conditions.

Beds, food, medicine and better working conditions affect sustainability.

The game can also let the player push toward harsher efficiency, creating the deliberately uncomfortable “creature capitalism” framing noted by reviewers. [PAL-G](#pal-g)

**Version qualification:** Home Sweet Home's December 2025 notes already removed SAN loss from taking damage and reduced several ailment penalties; the 1.0 notes repeat that boundary. Do not describe every combat hit as a current stress debit. Hunger, working conditions and recovery still matter. [PAL-AA](#pal-aa) [PAL-C](#pal-c)

### Design tension

If needs are too forgiving:
- workers become decorative machines.

If needs are too punitive:
- automation becomes babysitting.

OpenLegend should aim for needs that create:
- occasional planning;
- character expression;
- social consequences;
- recovery choices

without requiring continuous micromanagement.

## 10. Crafting and technology chains

Crafting progresses from:
- primitive tools;
- Pal Spheres;
- basic structures;

toward:
- industrial production;
- firearms/ammunition;
- advanced armor;
- powered equipment;
- specialized Pal gear;
- high-tier spheres;
- late-game resource chains.

Crafting often depends on:
- Technology level;
- station;
- materials;
- Pal labor;
- time.

This creates a scalable transition:
> manual survival → workshop → staffed production base.

The player remains the strategic organizer while Pals increasingly execute repeatable work.

**Concrete dependency:** the Primitive Furnace's Ingot recipe consumes Ore and requires Kindling work. Wood is used to construct the furnace and in its separate Charcoal recipe; it is not an additional fuel consumed by the ordinary Ore-to-Ingot recipe. An electrical higher-tier facility can have other requirements. Construction inputs, recipe inputs and operating capability must not be merged into one generic “fuel” assumption. [PAL-X](#pal-x)

## 11. Weapons and human combat

Human combat includes:
- melee weapons;
- bows/crossbows;
- firearms;
- explosives/heavy weapons;
- dodging/movement;
- armor/shields;
- Pal-assisted attacks.

The game's marketing emphasized guns, but early reviews correctly observed that firearms are a progression layer rather than the first-session loop. [PAL-H](#pal-h)

The tonal contrast is intentional:
- cute, colorful Pals;
- modern firearms;
- factories;
- poaching;
- butchering/eating;
- coerced labor.

Some critics find the combination distinctively funny/subversive; others find it shallow or tonally incoherent. That disagreement is part of the design evidence, not something to resolve as fact.

## 12. Breeding, genetics, passives and long-horizon optimization

Breeding converts collected Pals into a longer-term optimization system.

Offspring can inherit:
- species/combinations according to breeding rules;
- passive traits;
- stat potential.

Version 1.0 adds **Mutation**, where some eggs can produce stronger results/unique passives, plus cake variants that alter mutation/stat/inheritance outcomes. [PAL-C](#pal-c)

This creates several layers:
1. collect usable parents;
2. identify desirable traits;
3. breed;
4. evaluate offspring;
5. repeat toward a goal.

### Modify the existing individual: Surgery Table

Breeding is not the only way to improve a favored Pal. Tides of Terraria introduced the Surgery Table, which replaces passive skills using implants and also supports a separate gender-change operation. [PAL-T](#pal-t)

The documented procedure selects a party Pal and a passive slot, spends the appropriate implant plus gold, and fills an empty slot or replaces an existing trait. Examples include Hard Skin, Workaholic and Ferocious. Arena tickets and bounty rewards connect acquisition to other activities. Gender change instead consumes a **Pal Reversal** item. These are different transformations, not one universal reroll. [PAL-V](#pal-v)

The 2025 guide's precise technology levels, vendor prices and speculative chest/salvage sources are not promoted into an exact 2026 table. December 2025 added further implant choices, and 1.0 improved the facility's access to stored base items. [PAL-AA](#pal-aa) [PAL-C](#pal-c)

**Interpretation:** improving an existing individual can preserve attachment while changing its role. The costs are scarce replacement inputs and the trait displaced; a nominal upgrade may undermine a work or combat specialization. This is authored trait editing, not a generative genetics simulator or evidence that a Pal consents to surgery.

### Awakening

Version 1.0 also adds **Awakening**, using World Tree resources such as Radiant Gems to push favorite Pals beyond prior growth ceilings. [PAL-C](#pal-c)

This lets a player invest in:
- “the objectively best species,” or
- “the creature I personally care about.”

OpenLegend should support the latter where possible:
> affection/history should not always force abandoning a favorite entity for a statistically superior replacement.

## 13. Traversal and exploration

Pals change traversal through:
- ground mounts;
- flying mounts;
- water traversal;
- gliding/Partner Skills.

The world contains:
- biomes;
- caves/dungeons;
- settlements;
- towers;
- wildlife sanctuaries;
- ruins;
- resource zones;
- bosses;
- islands;
- late-game special regions.

Version 1.0 adds:
- Sunreach;
- the World Tree;
- seven smaller islands;
- Ancient Ruins;
- Watchtowers;
- additional settlements;
- revised sanctuaries;
- more fast-travel/map support. [PAL-C](#pal-c)

### Interaction loop

Exploration produces:
- new species;
- materials;
- bosses;
- schematics;
- eggs;
- settlements;
- fast travel;
- progression resources.

Those discoveries then improve:
- travel;
- combat;
- production;
- breeding;

which expands where the player can explore next.

That reciprocal loop is one of Palworld's strongest structural successes.

### Fishing, ponds and salvage are different activities

Tides of Terraria added fishing and ocean salvage in June 2025. [PAL-T](#pal-t) With a rod and bait, the player casts near visible fish shadows, responds to a bite and keeps a control bar aligned with the moving target until the catch gauge fills. The result can be a **Pal plus items**, not merely a food fish. Better rods and bait change the opportunity and difficulty. A swimming mount makes offshore targets reachable. [PAL-U](#pal-u)

A base Fishing Pond substitutes delegation for that manual minigame: supply bait, assign a Handiwork-capable Pal, then collect catches and items from the adjacent cooler. Larger ponds broaden the catch options. A functioning worker does not mean the output has already entered the player's intended destination. [PAL-U](#pal-u)

Salvage instead targets floating debris and uses a timed ring interaction; it is not the same catch-tracking minigame. The historical guide did not verify its suggested high-end metal/magnet outcome, so that speculation is not adopted. [PAL-U](#pal-u)

In the 1.0 party system, Gloopie reduces fishing failure and Jelliette improves item returns; Solmora and Whalaska supply different fishing benefits. Higher-tier spots in Sunreach and the World Tree connect party preparation to exploration. [PAL-C](#pal-c)

**Interpretation:** one activity links travel, tools, food-derived bait, companions, collection and base work. The important choice is whether to improve personal execution, change the expedition party or delegate a bounded alternative—not simply accumulate another skill bar.

## 14. Story, NPCs and factions

The original Early Access structure was mechanically strong but narratively sparse.

Version 1.0 explicitly reworks the main story so that:
- exploration;
- tower bosses;
- faction conflict;
- Sunreach;
- the World Tree

connect into a more directed progression. New sub-missions, NPCs and journals expand world context. [PAL-C](#pal-c)

### Named people make the progression intelligible

**Story spoilers.** The current mission text links the Small Settlement Chief's advice to capturing Foxparks and making its Harness, then visiting Zoe at the Rayne Syndicate Tower. After the confrontation, the mysterious Key Sphere sends the player back for interpretation. Zoe then explains the wider tower-and-sphere objective. This is **preparation → encounter → object → conversation → larger goal**, not merely eight unrelated boss icons. [PAL-AB](#pal-ab)

The later chain connects Bjorn's defeat to the Azure Covenant Tower, Auri's explanation of the Calamity, Panthalus and entry through the World Tree's barrier. The mission record identifies Echobones and an Echoing Flute among that preparation. Selected text contains unresolved display placeholders, so precise missing names or an unshown cinematic sequence are not reconstructed. [PAL-AB](#pal-ab)

The tower roster distinguishes **Zoe/Grizzbolt and the Rayne Syndicate**, **Lily/Lyleen and the Free Pal Alliance**, **Axel/Orserk and the Brothers of the Eternal Pyre**, **Marcus/Faleris and PIDF**, and **Victor/Shadowbeak and the genetic-research faction**. Saya/Selyne, Bjorn/Bastigor and Auri/Shaolong locate later confrontations in Sakurajima, Feybreak and Sunreach. These are authored faction identities and encounter pairs, not a general reputation/diplomacy simulation. [PAL-AC](#pal-ac)

Zoe's separate mission sequence can recruit her as an ally; June 2025's release notes explicitly establish that trust/recruitment outcome. Enemy bases also yield faction-related building blueprints when successfully raided. This links a social encounter or hostile site to later practical capability without proving autonomous political behavior. [PAL-T](#pal-t)

However, current September 2026 Steam testimony still includes players who find human NPC characterization and story weaker than the Pals/world. [PAL-N](#pal-n)

### OpenLegend contrast

Palworld demonstrates that:
- memorable systemic creatures can carry enormous emotional weight even with limited dialogue.

OpenLegend can go further by giving inhabitants:
- memory;
- relationships;
- beliefs;
- personal continuity;
- useful world roles.

The mistake would be to add fluent dialogue while making them less useful or less physically grounded.

## 15. Factions, crime and morally flexible systems

The world includes organized human factions/tower bosses and hostile groups.

The game also supports deliberately provocative actions such as:
- attacking humans;
- capturing humans;
- poaching in protected areas;
- selling creatures;
- butchering/eating Pals.

These are not necessary moral endorsements; they are world actions the design allows.

For OpenLegend, the useful point is:
> a systemic world can permit socially prohibited behavior while making law, witnesses, reputation and consequences explicit.

Palworld often uses these systems primarily for dark comedy/gameplay. OpenLegend's social simulation can make consequences deeper. The comparison does not credit Palworld with a general consent, legal-evidence or remembered-reputation model.

## 16. Failure, death and recovery

Player defeat is governed by world/server difficulty settings.

Depending on configured rules, death can impose different loss/recovery burdens, including dropped possessions and corpse-run-like recovery.

Pals can be incapacitated and recover through Palbox-related systems rather than functioning as ordinary one-life permadeath companions.

**Do not confuse death with the menu recovery command:** 1.0 renamed that command **Emergency Escape** and removed its item-drop penalty regardless of world settings. Ordinary death and a configured PvP loot rule remain separate contracts. [PAL-C](#pal-c) [PAL-W](#pal-w)

World settings are unusually important in Palworld because players can tune:
- experience rates;
- damage;
- gathering/drop rates;
- capture;
- base behavior;
- death penalties;
- other survival pressures.

This flexibility is praised by players who want to reduce grind, but it also exposes balance tension: current reviews frequently recommend changing defaults to make late game less tedious. [PAL-M](#pal-m) [PAL-N](#pal-n)

## 17. Multiplayer and shared worlds

Current Steam features include:
- single player;
- online co-op;
- cross-platform multiplayer;
- hosted co-op;
- dedicated servers;
- Steam Workshop.

The store page currently describes:
- up to four players in normal online co-op;
- up to 32 on dedicated servers. [PAL-D](#pal-d)

Players can explore, build, fight, transfer Pals and cooperate on resource/production goals. Multiplayer does not mean every world has the same permissions or competitive rules.

### Arena versus server-wide PvP

The Arena offers bounded competition rather than unrestricted attacks on a shared home. June 2025 added a solo challenge ladder, battle-ticket rewards, configurable Pal bans, an entrance Palbox and multiplayer spectating. Solo opponents and another human are different participants even though both use the Arena surface. [PAL-T](#pal-t)

December 2025 separately introduced **experimental dedicated-server PvP tools**. [PAL-AA](#pal-aa) The official server guide, displayed as version 1.0.4 when inspected, requires enabling PvP, player damage and hostile-player defense. It describes trespass defense, access to other guilds' chests and restrictions on building/repair during a base battle. Optional policies alter fast travel, technology access, death drops and whether logged-out bodies remain exposed. These are administrator choices, not universal normal-co-op rules. [PAL-W](#pal-w)

A server can also use kill-dropped Champion's Emblems and their displayed totals to support a local competitive objective. The feature is explicitly trial/unsupported in the guide; no matchmaking population, fairness or reliability test is claimed. **Unresolved documentation conflict:** that guide still says missions are disabled, whereas the 1.0 release notes say main missions can progress in PvP. The dossier records both rather than guaranteeing either behavior for every configuration. [PAL-W](#pal-w) [PAL-C](#pal-c)

### Pal transfer is not automatically an atomic trade

The historical hands-on transfer guide describes two methods: drop a party Pal for another player to pick up, or place it in a guild base's working slots for a guildmate to withdraw. A dropped Pal can be collected by an unintended person. Those are handoffs, not an escrow system ensuring that two promised Pals change owners together. [PAL-Z](#pal-z)

This February 2024 guide does not certify every 2026 permission edge. The 1.0 release adds more granular guild roles and structure-access restrictions, so shared base access must be checked under the actual world policy. Neither shared work slots nor a published claim of “trading” establishes unrestricted access to another person's private Palbox. [PAL-C](#pal-c)

**Constructed social consequence:** one member supplies a useful worker, another withdraws it for exploration, and production loses that capability. The relevant questions are access, expected purpose and responsibility—not only whether transfer technically succeeds. A negotiated exchange needs clearer commitments than an unprotected drop.

Persistent-server play changes the value of automation:
- a base can become shared infrastructure;
- specialization becomes social;
- creature collection can support team roles.

### Concurrency lesson

OpenLegend will need stronger ownership semantics than “whoever can touch the object.”

Shared worlds need:
- personal property;
- group property;
- roles;
- permissions;
- guest access;
- conflict rules;
- audit/history.

## 18. High-difficulty and return loops

Palworld's later-game purposes include:
- stronger tower/boss challenges;
- raids;
- breeding optimization;
- legendary/rare Pal acquisition;
- better schematics/equipment;
- high-tier production;
- collection completion;
- base optimization;
- PvP/social play;
- World Tree/1.0 progression.

Version 1.0 increased the level cap to 80 and rebalanced:
- raid bosses;
- hard-mode tower bosses;
- oil rigs/high-difficulty content;
- technology progression. [PAL-C](#pal-c)

Recent criticism frequently identifies a tension:
- early/mid game = discovery and rapid capability gain;
- later game = repetition, breeding/resource grind and base maintenance.

That is not universal, but it is consistent enough across multiple current player accounts to treat as a meaningful design risk. [PAL-L](#pal-l) [PAL-M](#pal-m)

## 19. Art, animation, audio and readability

Palworld mixes:
- bright stylized creatures;
- semi-realistic survival environments;
- modern guns/industrial objects;
- anime-influenced human character design.

Critics disagree sharply on whether this is:
- a compelling juxtaposition;
- derivative;
- incoherent.

Version 1.0 added more than 100 new motions to existing Pals plus unique animations for many new Pals, explicitly increasing their visible personality during adventure and base life. [PAL-C](#pal-c)

Recent Steam accounts praise:
- ambient sound;
- hearing working Pals around the base;
- distinctive creature animation/personality;

while still noting pop-in and visual roughness. [PAL-N](#pal-n)

### OpenLegend lesson

For autonomous agents, animation/state readability matters as much as dialogue.

A player should be able to look at a settlement and understand:
- who is working;
- who is resting;
- who is upset;
- what is blocked;
- what changed.

## 20. Production and development

Pocketpair developed and published Palworld.

Producer/CEO Takuro Mizobe's January 2024 interview is especially relevant because he explicitly cites:
- survival/crafting influences;
- **RimWorld** as an inspiration for combining autonomous labor with emotional creatures;
- broad experimentation rather than a narrowly genre-pure design;
- the difficulty of adding PvP meaningfully rather than as a checkbox. [PAL-E](#pal-e)

At that time, Mizobe described the game as roughly 60% complete even though the “basic functions” were established. That is a historical production-state account. [PAL-F](#pal-f) Later releases added:
- major islands;
- raids;
- PvP;
- cross-platform/platform releases;
- new Pals;
- base systems;
- Terraria collaboration;
- story restructuring;
- eventual 1.0. [PAL-T](#pal-t) [PAL-AA](#pal-aa) [PAL-C](#pal-c)

### Sudden scale

The game greatly exceeded Pocketpair's prelaunch operational assumptions.

That created:
- server pressure;
- support burden;
- community attention;
- legal/public controversy;
- rapid hiring/production pressure.

The later **GDC 2025 account is John Buckley's**, not the January 2024 producer interview. In Chris Kerr's reporting, Buckley describes threats, reduced public communication, muting work channels outside working hours and deliberately circulating positive feedback internally. Those are attributed coping practices, not an independent finding about every allegation or worker's experience. The live article displays **March 18, 2025**; the older library register recorded March 17. Its content is preserved through the same source, with the live metadata discrepancy stated rather than hidden. [PAL-Y](#pal-y)

### OpenLegend lesson

A systemic/AI product can become operationally constrained by success before architecture or moderation processes are mature. Scale planning is not only runtime throughput; it includes:
- support;
- abuse;
- creator tooling;
- community management;
- save compatibility;
- content governance.

## 21. Marketing, positioning and virality

Palworld had an unusually legible high-concept hook:
> creature collecting + survival crafting + guns/automation.

The “Pokémon with guns” shorthand was reductive but instantly communicable.

The product then produced highly shareable moments:
- cute creature operating factory;
- Pal with firearm;
- riding/flying unusual creatures;
- absurd/cruel labor;
- giant boss fights;
- co-op chaos.

Pocketpair reported about **1.4 million wishlists** shortly before Early Access launch in the preserved producer interview. [PAL-E](#pal-e)

The game then generated intense:
- Steam visibility;
- streaming/social clips;
- comparisons/discourse;
- creator coverage;
- multiplayer word of mouth.

No source here proves which channel caused what fraction of sales. The safest interpretation is that the concept had both:
- a one-line hook;
- enough actual systemic depth that players could keep producing stories after the joke.

## 22. Commercial and participation context

Pocketpair reported:
- **1 million copies in eight hours** after launch;
- about **15 million Steam copies + 10 million Xbox players** within a month;
- more than **32 million total players** by February 19, 2025. [PAL-I](#pal-i) [PAL-J](#pal-j)

These figures are not interchangeable:
- Steam copies are units sold;
- Xbox “players” include access routes such as Game Pass;
- “total players” is not revenue/profit.

Version 1.0 produced another large participation spike; Pocketpair reported **850,000+ concurrent Steam players** on July 13, 2026. [PAL-K](#pal-k)

The current Steam store price at access is $29.99 in the U.S. storefront, but this dossier treats pricing as a dated storefront snapshot, not a permanent economic fact. [PAL-D](#pal-d)

## 23. Five substantive written reviews / critical accounts

### 1. PCGamesN — Nat Smith, January 24, 2024

**Praised:** the creature/survival combination, open-world loop and the strange satisfaction of turning creatures into productive infrastructure.

**Criticized:** rough Early Access polish, derivative-feeling ingredients, worker/pathfinding friction and the intentionally uncomfortable creature-exploitation framing.

This is the key preserved review for “automation has emotion.” [PAL-G](#pal-g)

### 2. GamesRadar+ — Joel Franey, January 2024

**Praised:** surprisingly extensive base automation; visible little communities of Pals; robust quantity of systems; the fascination of its tonal clash.

**Criticized:** generic/empty world areas, resource bottlenecks, shallow direct combat, poor Pal tactical control and tonal/art-direction incoherence.

Especially relevant: Franey liked Pals more at the base than in direct combat because their autonomy made production feel alive while combat autonomy could sabotage precise intent. [PAL-H](#pal-h)

### 3. Windows Central — Rebecca Spear, January 23, 2024

**Praised:** large explorable map, engaging combat, survival/crafting integration, creature variety and co-op value.

**Criticized / boundary:** an Early Access review-in-progress rather than a final 1.0 verdict; unfinished systems and platform/version roughness remain part of the frame. [PAL-O](#pal-o)

### 4. Forbes — Paul Tassi, January 30, 2024

**Praised:** the creature-collection fantasy finally integrated with open-world action, base building and survival systems; found it extremely fun despite unfinished state.

**Criticized / qualified:** explicitly notes it was difficult to review traditionally because the Early Access game was visibly unfinished.

The value of this source is that it articulates the player fantasy being satisfied, not that it proves every mechanic was polished. [PAL-P](#pal-p)

### 5. PC Gamer — Andrea Shearon, August 1, 2026

**Full 1.0 review reopened during the audit remedy.** Shearon values immediately legible work-suitability icons, useful workers without elaborate taming, and optional role-specific breeding/implant optimization. She praises painting and alignment controls while finding the large, restrictive building grid and unpaintable furnishings limiting. Empty-feeling exploration and repeatedly advertised cartoon cruelty weaken the identity for her. These are specific design objections, not merely a paraphrase of the score. [PAL-Q](#pal-q)

Her experience also qualifies the progression claim: much of her story party remained wild-caught, with surgical modification rather than obligatory intensive breeding. After failing against Panthalus, she changed to Jetragon-based aerial combat. The distinction is between having a larger statistical total and discovering a more useful way to employ the companion. This is her reported play, not ours. [PAL-Q](#pal-q)

Pocketpair's statement about not distributing advance 1.0 keys supplies publication context; it does not independently measure how many formal reviews exist or prove why each outlet did or did not publish. [PAL-R](#pal-r)

## 24. Current Steam review sample

At access, Steam shows **95% positive among 183k+ English reviews** and **95% positive recent reviews**. This is a storefront snapshot, not a representative causal study. [PAL-D](#pal-d)

### Helpful positive material

Helpful all-time/current positives repeatedly highlight:
- creature collection plus survival;
- Pals doing visible useful work;
- easy “one more task” distraction loops;
- exploration;
- base building;
- co-op;
- affection for specific Pals. [PAL-S](#pal-s)

A July/August 2026 positive review describes the characteristic loop:
> set one goal → find a Pal → improve the base → unlock technology → get distracted → still make progress.

That is an especially useful account of **interlocking progression**. [PAL-S](#pal-s)

### Helpful negative / mixed material

Current and all-time negative/helpful accounts identify:
- late-game grind;
- progression balance;
- repetitive caves/biomes;
- resource-chain waiting;
- base-worker/pathfinding AI;
- high-difficulty balance;
- weak human NPC/story characterization;
- EULA/privacy concerns in one high-ranked 2025 protest review. [PAL-L](#pal-l) [PAL-M](#pal-m) [PAL-N](#pal-n)

Do not combine those into one “majority complaint.” Some negative reviews are policy objections rather than mechanics criticism.

## 25. Concrete situations

These are rules-based illustrations unless explicitly sourced. None is a playtest conducted for this research.

### Situation A — one captured creature changes several systems

**Goal:** capture a flying Pal.

**Conditions:** player has adequate spheres/combat capability.

**Action:** weaken and capture it.

**Result:** the same individual may now:
- join combat;
- unlock flight through its Partner Skill;
- work at a base if its suitabilities fit;
- become a breeding parent.

**Next decision:** use it personally, assign it to infrastructure, preserve it for breeding, or replace it with a specialized individual.

**Lesson:** entities should participate across systems rather than being duplicated into “combat pet” and “worker token.”

### Situation B — worker choice changes a production bottleneck

**Goal:** produce Ingots in a Primitive Furnace.

**Conditions:** the built furnace, Ore, a Kindling-capable Pal such as Foxparks, and reachable working space exist. The recipe does not require an additional Wood/Charcoal fuel stack. [PAL-X](#pal-x)

**Action:** select the Ingot job and provide compatible Kindling work; organize transport/storage separately.

**Interaction:** the correct recipe and worker produce the metal; merely adding transport or replenishing imaginary fuel does not supply Kindling.

**Result:** the player can delegate processing rather than perform every repeated action.

**Next decision and counterpressure:** diagnose absent inputs, a competing job, an inaccessible station or the worker's condition before adding more labor. This is a bounded facility example, not a promise that all furnaces share identical power requirements.

**Lesson:** separate construction cost, consumable inputs, operating capability and logistics.

### Situation C — overwork becomes character-visible cost

**Goal:** maximize factory throughput.

**Action:** push work conditions and staffing toward productivity.

**Result:** Pals consume resources and can lose SAN/become impaired.

**Next decision:** improve beds/food/medicine, add labor, tolerate harm, or reduce throughput.

**Lesson:** the cost of optimization is more memorable when borne by visible beings rather than an abstract efficiency penalty.

### Situation D — a mount changes the meaning of terrain

**Goal:** reach a remote plateau/island.

**Action:** acquire and deploy an appropriate ground/flying/water Pal.

**Result:** previously expensive/blocked routes become routine.

**Lesson:** progression can unlock **world affordances**, not only higher DPS.

### Situation E — breeding converts attachment into optimization

**Goal:** improve a favored Pal line.

**Action:** choose parents/passives, supply breeding resources, hatch/evaluate offspring; in 1.0, chase Mutation and later Awakening.

**Result:** the player can invest many cycles into a personal lineage.

**Tradeoff:** optimization can push toward repetitive breeding/grind.

**Lesson:** inheritance gives creatures continuity, but the system should avoid making individuals disposable spreadsheets.

### Situation F — change a trait without replacing the individual

**Goal:** improve an existing worker rather than breed a replacement.

**Conditions:** an eligible party Pal, Surgery Table, appropriate implant, gold and a chosen slot.

**Action:** fill or overwrite the slot.

**Result:** the same Pal has a different capability profile; an overwritten useful trait is a real opportunity cost.

**Next decision:** test whether the revised specialization fits the job before spending another implant. The operation does not manufacture an arbitrary passive or guarantee that a work bonus is a combat improvement. [PAL-V](#pal-v)

**Lesson:** identity can persist through bounded mechanical revision, but the interface must expose what is replaced.

### Situation G — acquire a worker through a worker

**Goal:** supplement aquatic collection without personally repeating every fishing attempt.

**Conditions:** a Fishing Pond, bait and an available Handiwork Pal.

**Action:** assign the job and collect its cooler output.

**Result:** delegated production can supply further Pals and useful items.

**Next decision:** spend attention on a harder wild spot, improve the base setup or stop when the collection need is met. Delegation does not remove the inputs, eligibility or collection step. [PAL-U](#pal-u)

**Lesson:** automation changes where attention is spent; it should still have a comprehensible end state.

## 26. Transferable inspiration for OpenLegend

### A. Useful characters beat chat-only characters

A resident who:
- waters crops;
- carries lumber;
- guards a gate;
- scouts;
- teaches;
- crafts

can matter even when silent.

Dialogue should deepen a useful actor rather than substitute for usefulness.

### B. Capability should be legible from the being

Pal species identity often suggests function.

OpenLegend characters can similarly signal:
- profession;
- equipment;
- physical traits;
- learned expertise;
- current task

through visible behavior.

### C. Let autonomy operate below intention

The player decides:
- build this base;
- produce this item;
- staff this role.

The worker decides:
- path there;
- pick up input;
- perform action;
- rest/eat as needed.

That is a stronger default than prompting an LLM for every footstep.

### D. A worker's needs create attachment only when bounded

Needs should occasionally alter plans and create stories, not constantly invalidate delegation.

### E. Companions should unlock verbs

A character can grant:
- access;
- translation;
- scouting;
- transport;
- magic;
- social entry;
- crafting;
- sensing.

That is more interesting than “+8% companion damage.”

### F. Exploration and collection should reinforce one another

New place → new being/resource → new capability → new place.

### G. Keep moral affordances systemic

If players can exploit/abuse entities, the world should understand:
- consent;
- law;
- reputation;
- witnesses;
- relationship effects.

### H. Late-game automation must reduce toil, not multiply it

A mature settlement should make repetitive gathering easier unless a deliberate challenge creates new decisions.

### I. NPC personality cannot be only creature animation

Current 1.0 feedback that human NPCs remain thin is a warning for OpenLegend: systemic utility and social memory should reinforce each other.

## 27. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2; named edition and later-document boundaries |
| R02 player actions / mechanics | §§3–18, including fishing, surgery, Arena and server PvP |
| R03 items / entities / composition | §§3–13; furnace inputs and passive replacement |
| R04 progression / economy / time | §§2–3, 8–13, 16–18 |
| R05 concrete interactions | §25; mission and transfer chains in §§14/17 |
| R06 people / AI / social / multiplayer | §§5, 7–9, 14–17; permissions and limitations |
| R07 art / audio / interface / feel | §19 and the specific 1.0 review |
| R08 story / narrative | §§14–15; named mission/faction chain |
| R09 production / development | §20; corrected GDC attribution |
| R10 marketing / distribution / virality | §21 |
| R11 commercial / participation | §22 |
| R12 reviews / player feedback | §§23–24; substantive fifth-review argument |
| R13 inspiration / limits | §26 and explicit section/case interpretations |
| R14 sources / preservation / navigation | this section + exact source locators below |

**Mechanics-inventory check:** character creation, stats/levels/Technology, items/inventory, weapons/armor, crafting, capture, combat, traversal, base building, Pal work, needs, breeding, passive implants, fishing/ponds/salvage, Partner Skills, factions/story, multiplayer transfer/access, Arena/server PvP, raids/high-difficulty loops and failure/recovery are covered. Palworld does **not** use a conventional spellbook/class/job system; extraordinary abilities are primarily Pal skills/Partner Skills/equipment rather than one universal player magic tree.

**Preservation check:** [the prior Palworld chapter](../games/palworld.md) and [granular creature/work study](../mechanics/palworld-useful-creatures-care-and-automation.md) remain intact. They retain the January 2024 AUTOMATON interview, earlier commercial milestones, named Partner Skills, field-guide examples, Steam testimony, launch review and video. These are linked, not overwritten. Historical launch bugs are not silently asserted as current behavior.

**Audit remedies applied:** fishing and its delegated alternative (§13); trait modification (§12); named mission/faction structure (§14); Arena, server PvP and transfer/permission distinctions (§17); recipe-specific furnace correction (§10/25B); actual GDC account (§20); substantive fifth review (§23); and exact 1.0 announcement plus inspected mirror (PAL-C). The PvP mission conflict and legacy-guide timing are disclosed evidence limitations, not invented resolutions. The baseline audit remains historical; current state is in the progress ledger.

**Reading route:** the original creature/work study → PAL-U's manual versus delegated fishing → PAL-V's replacement cost → PAL-AB's named mission chain → PAL-W's world-policy choices → PAL-Q's contrary preferences. Read the release notes before applying a 2025 numerical guide to a 2026 save. No current multiplayer session or gameplay test was performed.

**Viewing boundary:** the preserved CurtisCompletes video remains a recommended viewing route only; this pass did not claim to watch its footage or transcript.

## Sources

<a id="pal-a"></a>**PAL-A — [Palworld 1.0 is OUT NOW!](https://www.pocketpair.jp/en/game-news/%E3%80%8A%E5%B9%BB%E5%85%BD%E5%B8%95%E9%B2%81%E3%80%8B1-0%E6%AD%A3%E5%BC%8F%E7%89%88%E7%8E%B0%E5%B7%B2%E4%B8%8A%E7%BA%BF%EF%BC%81/).** Pocketpair, 2026-07-10. Primary official-release date.

<a id="pal-b"></a>**PAL-B — [Palworld 1.0 launch trailer announcement](https://www.pocketpair.jp/en/game-news/palworld-1-0-official-launch-trailer-unveiled/).** Pocketpair, 2026-07-09. Primary launch boundary.

<a id="pal-c"></a>**PAL-C — [Palworld v1.0 — Official Release Changelog](https://steamcommunity.com/games/1623730/announcements/detail/686383649529010624), [inspected SteamDB reproduction](https://steamdb.info/patchnotes/24088745/).** Pocketpair, 2026-07-10, build 24088745. The mirror's original link was followed and identifies the exact announcement; the direct Steam page returned a shell, so the official-authored text was read through the named mirror. This replaces the earlier incomplete `/detail/` citation. Relevant mission, Pal, fishing, guild, recovery and facility sections were inspected, not independently executed. A mirror is not a second independent source.

<a id="pal-d"></a>**PAL-D — [Palworld on Steam](https://store.steampowered.com/app/1623730/Palworld/).** Pocketpair / Valve, accessed 2026-09-26. Current platform features, store positioning, multiplayer limits and review snapshot; storefront price/review counts are volatile.

<a id="pal-e"></a>**PAL-E — [Palworld producer interview](https://automaton-media.com/en/interviews/20240123-25950/).** AUTOMATON / Takuro Mizobe, 2024-01-23. Preserved source PAL1/FG-PAL-D: RimWorld influence, automation with emotional creatures, 1.4M prelaunch wishlists and PvP design tradeoffs.

<a id="pal-f"></a>**PAL-F — [Palworld was about 60% finished at Early Access launch](https://www.gamespot.com/articles/palworld-is-about-60-finished-dev-considering-pvp/1100-6520539/).** GameSpot, 2024-01-23. Secondary reporting of Mizobe interview, useful for production-state boundary; not evidence for updates released afterward.

<a id="pal-g"></a>**PAL-G — [Palworld early access review](https://www.pcgamesn.com/palworld/review).** Nat Smith, PCGamesN, 2024-01-24. Preserved FG-PAL-C: creature-capitalism framing, survival loop, worker friction and early polish.

<a id="pal-h"></a>**PAL-H — [Palworld review](https://www.gamesradar.com/palworld-review/).** Joel Franey, GamesRadar+, 2024-01. Early Access review: automation/community strengths versus tactical AI, bottlenecks, tonal/world-design concerns.

<a id="pal-i"></a>**PAL-I — [Palworld: 25 million players after one month](https://www.pocketpair.jp/en/news/palworld-blasts-past-25-million-total-players-just-one-month-after-early-access-launch/).** Pocketpair, 2024-02-23. Primary: ~15M Steam units and ~10M Xbox players; measures differ. The audit's final link check recovered and read this current English publisher page after the inherited encoded Japanese locator failed. The historical milestone is preserved, not inferred from present storefront counts.

<a id="pal-j"></a>**PAL-J — [Palworld Blasts Past 32 Million Players](https://www.pocketpair.jp/en/news/palworld-blasts-past-32-million-players/).** Pocketpair, 2025-02-19. Primary developer milestone; players ≠ paid copies.

<a id="pal-k"></a>**PAL-K — [Pocketpair game news archive](https://www.pocketpair.jp/en/game-news/).** Pocketpair, accessed 2026-09-26. Lists July 13, 2026 announcement of 850,000+ concurrent Steam players after 1.0; company-reported participation milestone. Retained as the original pass's archive evidence, not relabelled as a newly reopened specific release.

<a id="pal-l"></a>**PAL-L — [Palworld — most helpful negative Steam reviews](https://steamcommunity.com/app/1623730/negativereviews/?browsefilter=toprated&l=english).** Steam Community, accessed 2026-09-26. Self-selected all-time negatives, including late-game progression and policy objections.

<a id="pal-m"></a>**PAL-M — [Palworld — current positive Steam reviews](https://steamcommunity.com/app/1623730/positivereviews/?l=english).** Steam Community, accessed 2026-09-26. Includes 1.0-positive accounts that still criticize grind, repetition, pathfinding and waiting; individual testimony.

<a id="pal-n"></a>**PAL-N — [Palworld — current Steam review feed](https://steamcommunity.com/app/1623730/reviews/).** Steam Community, accessed 2026-09-26. September 2026 player testimony on endgame balance, audio, story/NPC weakness and Pal appeal.

<a id="pal-o"></a>**PAL-O — [Palworld review in progress](https://www.windowscentral.com/gaming/palworld-review).** Rebecca Spear, Windows Central, 2024-01-23. Early-access review: map/combat/collecting/co-op strengths with unfinished-state boundary.

<a id="pal-p"></a>**PAL-P — [Palworld Review: The Pokémon Game I've Wanted Since 1999](https://www.forbes.com/sites/paultassi/2024/01/30/palworld-review-the-pokemon-game-ive-wanted-since-1999/).** Paul Tassi, Forbes, 2024-01-30. Independent Early Access criticism emphasizing the long-sought open-world creature fantasy while acknowledging unfinished scope.

<a id="pal-q"></a>**PAL-Q — [Palworld 1.0 review](https://www.pcgamer.com/games/survival-crafting/palworld-review/).** Andrea Shearon, PC Gamer, 2026-08-01. Full substantive review reopened for the audit remedies: work readability, building restrictions, optional optimization, tone and the Panthalus/Jetragon account. Her reported hours and choices are not universal completion or balance measurements.

<a id="pal-r"></a>**PAL-R — [Pocketpair says it did not send advance 1.0 review keys](https://www.gamesradar.com/games/survival/palworld-1-0-is-very-much-for-the-fans-so-the-pocketpair-devs-werent-really-thinking-about-critic-reception-at-all-lead-says/).** GamesRadar+, 2026-08. Attributed publication-context statement, not a census or causal measurement of review coverage.

<a id="pal-s"></a>**PAL-S — [Palworld — most helpful Steam reviews](https://steamcommunity.com/app/1623730/reviews/?browsefilter=toprated&l=english).** Steam Community, accessed 2026-09-26. Historical/current positive qualitative sample; joke/protest reviews excluded from mechanics claims.

<a id="pal-t"></a>**PAL-T — Pocketpair, June 25, 2025. [Tides of Terraria announcement](https://steamcommunity.com/games/1623730/announcements/detail/518590951147438123), [readable official-text mirror](https://steamdb.info/patchnotes/18943542/).** Relevant release sections read: fishing/salvage, Surgery Table, Zoe recruitment, faction bases and Arena. The original link was followed but returned a shell. Historical introduction, not a synchronized 2026 balance table.

<a id="pal-u"></a>**PAL-U — S.E. Doster, GameSpot, June 25, 2025. [Fishing, rods, bait, ponds and salvage](https://www.gamespot.com/articles/palworld-fishing-guide-how-to-craft-fishing-rods-and-bait/1100-6532739/).** Full relevant firsthand guide text read. Distinct minigames and delegated pond process; explicit uncertainty about magnet/metal outcomes is not converted into fact. Current 1.0 additions are separately sourced to PAL-C.

<a id="pal-v"></a>**PAL-V — S.E. Doster, GameSpot, June 2025. [Pal Surgery Table](https://www.gamespot.com/articles/how-to-change-a-pals-gender-and-passive-skills-in-palworld/1100-6532740/).** Body read: eligible party selection, implant/gold expenditure, slot replacement and separate Pal Reversal use. Historical numbers and speculative acquisition channels omitted from current assertions.

<a id="pal-w"></a>**PAL-W — Pocketpair, [dedicated-server PvP guide](https://docs.palworldgame.com/settings-and-operation/pvp/), displayed version 1.0.4, accessed September 26, 2026.** Full relevant official configuration text read. Trial/support boundary, hostility, property, logout, travel and reward rules. The “Disable Mission” line conflicts with PAL-C's later main-mission statement; no executable test resolves it here. Configuration examples are not universal defaults.

<a id="pal-x"></a>**PAL-X — PalDB, [Primitive Furnace](https://paldb.cc/en/Primitive_Furnace), accessed September 26, 2026; site labels data v1.0.5.** Fan-hosted game-data/description record, explicitly unaffiliated with Pocketpair. Construction and separate Charcoal/Ingot recipe rows read; Kindling distinguished from consumable fuel. No proprietary source-code inspection or all-furnace equivalence claimed.

<a id="pal-y"></a>**PAL-Y — Chris Kerr, Game Developer, live page dated March 18, 2025. [Pocketpair on the human cost of success](https://www.gamedeveloper.com/marketing/-the-public-are-kinda-crazy-palworld-developer-pocketpair-underlines-the-human-cost-of-success).** Original GDC reporting of John Buckley's statements, body reopened. Same work preserved as [PAL3](../references/sources-03.md#source-pal3); the older register's March 17 metadata differs from the inspected live page. Not the January 2024 Mizobe interview and not a fresh legal or workplace audit.

<a id="pal-z"></a>**PAL-Z — Michelle Cornelia, Dexerto, February 11, 2024. [Pal transfer methods](https://www.dexerto.com/palworld/how-to-trade-pals-with-another-player-in-palworld-2526920/).** Actual procedural body read: drop/pickup and shared working-slot handoffs. Historical observations, not proof of an atomic exchange UI or every later guild permission. The site's surrounding current navigation does not change the article's date.

<a id="pal-aa"></a>**PAL-AA — Pocketpair, December 17, 2025. [Home Sweet Home](https://steamcommunity.com/games/1623730/announcements/detail/627819185726031240), [inspected official-text mirror](https://steamdb.info/patchnotes/21102090/).** Experimental server PvP, SAN changes and added implants; original link followed, body read through mirror. Demonstrates that these changes predate 1.0 rather than treating repeated release-note wording as first introduction.

<a id="pal-ab"></a>**PAL-AB — PalDB, [Mission text and objectives](https://paldb.cc/en/Mission), accessed September 26, 2026.** Fan-hosted game-text/objective record; selected main-mission sequence and Zoe-related entries read. Names, objective lists and next-mission links establish the bounded examples. Unresolved template placeholders, unused-looking entries and uninspected cinematics are not reconstructed into additional plot claims.

<a id="pal-ac"></a>**PAL-AC — Palworld Wiki, [Tower/faction leader reference](https://palworld.wiki.gg/wiki/Faction_Leader_Bosses), accessed September 26, 2026.** Indexed encounter table/history inspected; direct page retrieval failed. Used narrowly for named faction/Pal pairs and regions, not its complete mechanics, exact coordinates or a claimed firsthand boss test.
