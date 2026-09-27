# G129 — Oxygen Not Included

**Status: complete full-pass research dossier.** Research date: September 26, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Oxygen Not Included is most useful as a study of **self-generated systemic pressure**. A colony rarely needs an external raid to become interesting: every Duplicant consumes resources and produces waste, every machine moves matter or energy while generating new constraints, and every temporary fix can create a delayed thermal, logistical, morale, power or resource problem.

## R01 — identity, scope, current content and player promise

Klei Entertainment released Oxygen Not Included 1.0 on Windows, macOS and Linux on July 30, 2019 after a long Early Access period. Steam identifies the game as single-player. The player begins inside an asteroid with a small group of cloned workers called Duplicants and builds a self-sustaining colony by excavating space, routing gases/liquids/power, growing food, researching technology, automating infrastructure and eventually reaching space. [Steam base game](https://store.steampowered.com/app/457140/Oxygen_Not_Included/) · [Klei game page](https://www.klei.com/games/oxygen-not-included).

The current 2026 product has several paid-content boundaries that older reviews cannot be assumed to include:

- **Spaced Out! — December 16, 2021.** Adds modular rockets, multi-base play across smaller planetoids, additional technology/resources/biomes and radiation-related systems.
- **The Frosty Planet Pack — July 18, 2024.** Adds an icy starting planet, frozen resources, critters and thermal technology.
- **The Bionic Booster Pack — December 12, 2024.** Adds bionic Duplicants, portable electricity and remote-work systems.
- **The Prehistoric Planet Pack — June 12, 2025.** Adds a prehistoric planet, new biomes/resources/critters/plants and asteroid-defense content.
- **Neutronium Cosmetics Pack — November 20, 2025.** Primarily cosmetic blueprints plus a Duplicant; do not confuse this with a simulation overhaul.
- **The Aquatic Planet Pack — June 11, 2026.** Adds a flooded starting planet, marine biomes/resources/critters/plants, expanded aquatic ranching and swimming.

[Current Steam DLC index](https://store.steampowered.com/dlc/457140/Oxygen_Not_Included/) · [Aquatic Pack](https://store.steampowered.com/app/4310080/).

**September 27, 2026 audit check:** Klei's current product page and Steam DLC catalog still end the gameplay-pack list at **Aquatic Planet Pack**; the visible official announcement stream after its June release contains bug-fix/game updates through July rather than another paid gameplay pack. Neutronium remains a cosmetics pack rather than a hidden systems expansion. [Klei current game page](https://www.klei.com/games/oxygen-not-included) · [Steam announcement stream](https://store.steampowered.com/oldnews/?appgroupname=Oxygen+Not+Included&appids=457140&feed=steam_community_announcements&headlines=1).

The base fantasy is not simply "build a base." It is **design an ecology of machines and labor that can keep correcting the consequences of its own operation**.

## R02 — player actions and major mechanics

### Indirect labor control

The player does not steer a Duplicant as an avatar. Instead, the player:

- designates tiles to dig;
- places construction blueprints;
- queues research, fabrication, cooking and refinement;
- assigns job/errand priorities;
- configures Duplicant work permissions/priorities;
- creates schedules for work, downtime, sleep and bathroom use;
- sets access restrictions;
- lays pipes, vents, wires and automation logic;
- changes machine settings, thresholds, filters and storage rules.

Duplicants choose among available errands according to eligibility, priority and pathing. This separation between **player intent** and **worker execution** is central to both the game's strategic depth and many complaints about "why won't they do this right now?"

### Gas simulation and oxygen

Each cell can contain matter with pressure, temperature and material properties. Gas moves through open space rather than appearing as a global "air" meter. Carbon dioxide tends to collect below breathable gases, while hydrogen tends to rise, making architecture itself a gas-management tool.

Early colonies often rely on finite algae-based oxygen production. A more durable route can split water through electrolyzers into oxygen and hydrogen, but that solution consumes water, requires power, creates hot outputs and produces a second gas that must be captured or vented. "Solved oxygen" therefore opens power, water, heat and plumbing problems.

### Liquids and plumbing

Liquid obeys gravity in world cells and can also be pumped through player-built networks. Pipes, bridges, valves, filters, reservoirs and pumps form a logic-like transport language. Toilets and lavatories turn clean inputs into polluted outputs; sieves can transform polluted water at a cost, but germs, temperature and byproducts still matter.

### Heat and state changes

Temperature is not a decorative comfort number. Buildings, liquids, gases, solids and Duplicants exchange heat. Crops and critters operate within environmental ranges; overheated machinery can stop; water can freeze/boil; gases/liquids change state at thresholds. Material choice matters because thermal conductivity and heat capacity change how quickly systems exchange energy.

This is where ONI becomes an engineering game: a technically correct pipe loop can still destroy the farm by importing heat.

### Power and automation

Generators feed batteries and wire networks with capacity constraints. Transformers, smart batteries and later automation make power demand controllable rather than merely "build more generators." Sensors can trigger equipment according to temperature, pressure, element presence, time or reservoir state. Logic gates and automation wire allow increasingly sophisticated control systems.

### Food, farming and ranching

Duplicants consume calories. Plants need specific atmosphere, temperature and resources; prepared food can improve morale and can spoil. Ranching converts critter reproduction/diet into food and industrial resources. A stable colony usually transitions from opportunistic early food into a deliberately controlled agricultural/ranching supply chain.

### Research, industry and space

Research unlocks progressively deeper plumbing, power, automation, materials, transit and space systems. Refined metals, plastics and high-temperature materials enable designs that early resources cannot tolerate. The base game culminates in rocketry/space goals; Spaced Out restructures this into active multi-planetoid logistics with modular rocket interiors and colonies distributed across worlds.

### Useful absences: conventional combat, stealth and factions

ONI's pressure does **not** come from a conventional controllable combat party. Duplicants can interact with critters and later content includes hazards/defensive engineering, but the base colony loop has no weapon-loadout/tactical-combat campaign analogous to RimWorld or XCOM. Resource extraction, ranching and environmental control are the meaningful equivalents of "defeating" many obstacles.

There is likewise no avatar-scale stealth system: no crouch/detection meter, infiltration class or hidden-state progression. Visibility is primarily an information/overlay problem for the **player**, not a stealth relationship between Duplicants and enemies.

Finally, Gravitas and other lore groups exist in the fiction, but the colony does **not** participate in a joinable political-faction reputation/territory system. Duplicants have traits/needs and critters have ecological roles; that is distinct from social factions. These absences help explain why ONI can be extremely deep physically while comparatively light socially.

## R03 — Duplicants, resources, buildings and composition

### Duplicants are labor packages with needs

Duplicants have attributes, interests, traits and stress reactions. Skills improve their ability to perform specialized work but also increase morale expectations. Some traits forbid work categories or alter oxygen, food, sleep or environmental behavior. The Printing Pod periodically offers new Duplicants or resources.

Population is therefore a trade:
- another Duplicant adds labor throughput;
- that same Duplicant also consumes oxygen, food, bed/bathroom time and pathing bandwidth.

The game makes "more workers" non-monotonic rather than an automatic upgrade.

### Major resource families

- **Breathable and industrial gases:** oxygen, polluted oxygen, carbon dioxide, hydrogen, natural gas, chlorine and other specialized gases.
- **Liquids:** water, polluted water, brine/salt water, petroleum/crude oil and other industrial fluids.
- **Raw minerals/ores:** construction material, metal ore, filtration medium and biome-specific resources.
- **Refined/advanced materials:** refined metals, plastic, steel and high-end space materials.
- **Biological resources:** seeds, food ingredients, critter products and ranching inputs.
- **Germs:** not an inventory item, but contamination carried through matter and Duplicants.
- **Heat:** similarly non-inventory but effectively a resource/waste stream that designs must budget.

### Buildings compose into systems

A building rarely stands alone. An electrolyzer needs water and power; its outputs need ventilation; gas pumps add more power and heat; hydrogen can fuel a generator; generators add heat and carbon dioxide; automation can prevent wasteful operation.

ONI's meaningful "items" are therefore often **networks**, not equipment pieces.

## R04 — progression, economy, morale, time and failure

### Skills versus morale

Duplicants gain skill points over time and can learn specialization abilities. Increased specialization raises morale expectations, so advancing everyone indiscriminately can increase stress pressure. Better rooms, food, recreation, schedules and decor help meet those expectations.

This is a notable progression constraint: **more skill can make a worker harder to keep psychologically satisfied**.

### Research as capability progression

Research transforms which resource cycles are possible. Early colonies can survive on nearby algae, clean water and manual generators. Midgame demands sustainable oxygen, sanitation, better food, industrial materials, suits and temperature control. Late-game builds high-temperature industry, automation and rocketry.

### No conventional money economy

The core colony has no gold-market economy. Scarcity is expressed through mass, energy, time, labor and thermal capacity. The "price" of oxygen may be algae now or water+power+heat later; the player chooses a production chain rather than paying currency.

### Cycles, schedules and labor time

Time is measured in cycles. Duplicants need sleep, bathroom access, food and downtime. Long travel paths can turn an apparently sufficient labor force into an ineffective one because workers spend too much of a cycle commuting.

### Failure and recovery

Colonies tend to fail through cascades:
- oxygen supply collapses;
- food production overheats;
- Duplicants spend too much time gasping/traveling;
- power shuts down pumps;
- toilets back up and contaminate water;
- stress reactions interrupt labor;
- an excavation opens hot gas/liquid into a living area;
- too many new Duplicants outgrow food/oxygen capacity.

There is no requirement for a hostile army to create drama. The game can make **yesterday's engineering decision** the cause of a crisis fifty cycles later.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations.

### Case 1 — algae solves oxygen until it doesn't

**Intention:** keep the first three Duplicants breathing.  
**Conditions:** nearby algae is available.  
**Actions:** build an algae oxygen producer and expand population.  
**Interaction:** oxygen output scales while algae stock only decreases.  
**Result:** colony looks stable until the finite algae reserve approaches zero.  
**Next decision:** secure a new algae source, reduce consumption or transition to water/electrolysis.  
**Lesson:** early success can conceal a non-renewable dependency.

### Case 2 — clean water becomes a bathroom pollution loop

**Intention:** improve sanitation with plumbed lavatories.  
**Conditions:** clean-water reservoir and plumbing tech.  
**Actions:** feed clean water into toilets/lavatories.  
**Interaction:** bathrooms create polluted water carrying contamination.  
**Result:** comfort and labor efficiency improve, but a new waste stream must be routed.  
**Next decision:** dump it, clean it, repurpose it or build a closed sanitation loop.  
**Failure mode:** one wrong bridge/pipe/storage decision can contaminate the clean supply.

### Case 3 — sustainable oxygen cooks the farm

**Intention:** replace dwindling algae with electrolyzers.  
**Conditions:** stable water source, pumps and electrical capacity.  
**Actions:** electrolyze water and route oxygen into the base.  
**Interaction:** equipment/output heat raises local temperature over many cycles.  
**Result:** oxygen becomes stable while temperature-sensitive crops begin to fail.  
**Next decision:** isolate machinery, cool gas/liquid, relocate agriculture or redesign the thermal loop.

### Case 4 — take another Duplicant or reject free labor

**Intention:** accelerate construction.  
**Conditions:** Printing Pod offers a high-skill Duplicant.  
**Actions:** accept or reject the worker.  
**Interaction:** labor rises immediately; oxygen/food/bed/toilet consumption rises permanently.  
**Result:** the "reward" can shorten survival if infrastructure has no margin.  
**Lesson:** headcount is capacity and load simultaneously.

### Case 5 — power automation converts waste into feedback control

**Intention:** stop a coal generator from running after batteries are already full.  
**Conditions:** smart battery/automation technology.  
**Actions:** connect battery charge thresholds to the generator with automation wire.  
**Interaction:** generator turns on only below a chosen charge and off above another threshold.  
**Result:** fuel use and heat/CO2 production fall without player micromanagement.  
**Next decision:** extend automation logic to pumps, cooling and industrial machines.

### Case 6 — one pipe fixes germs and transports heat

**Intention:** disinfect polluted water by heating it.  
**Conditions:** contaminated water and heating infrastructure.  
**Actions:** raise its temperature enough to kill germs, then pump it back toward the colony.  
**Interaction:** the liquid is now microbiologically safer but carries thermal energy through the pipe network.  
**Result:** nearby rooms/farms heat up and may fail.  
**Evidence:** Gideon's 2025 review describes exactly this kind of self-inflicted cascade: heating polluted water solves one problem and makes the colony too hot for its food plants. [Gideon's Gaming](https://gideonsgaming.com/the-genius-design-of-oxygen-not-included-a-review/).

### Case 7 — a Duplicant digs into their own trap

**Intention:** excavate a resource pocket.  
**Conditions:** indirect task queue with unsafe ordering/pathing.  
**Actions:** designate many blocks for digging.  
**Interaction:** the worker removes a supporting/escape tile and becomes stranded or exposed to unbreathable fluid/gas.  
**Result:** emergency ladder/build priority may be required.  
**Evidence:** Destructoid's 2017 Early Access reviewer recounts a Duplicant dying after digging away their footing and falling into polluted water, a version-specific AI/pathing anecdote rather than proof current AI behaves identically. [Destructoid](https://www.destructoid.com/early-access-review-oxygen-not-included/).

### Case 8 — Spaced Out turns one colony into logistics among worlds

**Intention:** obtain a resource absent from the starting planetoid.  
**Conditions:** Spaced Out installed; rocket/travel capability.  
**Actions:** launch a crew, establish or visit another planetoid, produce/extract the needed material and transport it.  
**Interaction:** survival infrastructure now has to be replicated or transported across multiple bases.  
**Result:** a resource problem becomes a distributed-systems logistics problem.  
**Boundary:** this multi-base modular-rocketry structure is Spaced Out content, not the original 2019 base-game progression.

## R06 — Duplicant behavior, individuality, critters, social systems and multiplayer

### Workers are autonomous but not fully simulated personalities

Duplicants have names, expressions, traits, interests, stress reactions and skills, and their physical needs create memorable incidents. The player can become attached to a Duplicant who repeatedly survives disasters or becomes the colony's only expert researcher.

But their autonomy is primarily **task and survival behavior**, not a rich relationship simulation. Gideon's 2025 review argues they remain "cogs" compared with RimWorld colonists because their individual personalities rarely generate deep interpersonal drama. Current Steam criticism likewise includes players who find the characters flat.

That limitation is useful: high systemic depth in physics does not automatically produce social depth.

### Priority and schedule systems mediate agency

The player sets who is allowed/preferred to dig, cook, research, ranch, operate, build or supply. Duplicants then choose errands. Emergency priority can override ordinary plans, but a badly designed priority structure can still produce long travel or seemingly irrational work.

This makes labor allocation another optimization system rather than direct control.

### Critters and ranching

Critters occupy ecological/resource niches: they consume materials/food and produce eggs, meat, fuel/resources or other outputs. Ranching allows breeding and population management. Some creatures can be used as conversion engines inside larger industrial loops.

### Germs and disease

Germs can live in air/liquid/food and spread through Duplicants and infrastructure. Disease systems have been revised across versions and are generally less lethal than some Early Access criticism implies; they remain a sanitation/logistics layer rather than a primary combat threat.

### Multiplayer boundary

Oxygen Not Included is **single-player**. Steam's current feature list identifies single-player only. Workshop/community sharing is social around designs/mods, not native cooperative colony control.

## R07 — visual language, overlays, sound, UI and feel

Klei's hand-drawn cartoon style makes Duplicants expressive and buildings visually distinct while the simulation underneath is unusually technical. That contrast is a major accessibility technique: cute animations make suffocation, vomiting, stress and sewage darkly comic instead of clinical.

The more important interface innovation is the **overlay stack**. The player can inspect oxygen/gas, plumbing, ventilation, power, temperature, germs, decor, rooms, automation and other invisible systems. Color/flow visualization makes problems spatially legible.

The Indie Game Website praises how the game exposes required information and makes complex science readable; GameGrin similarly notes that ordinary world tinting communicates gas state even before specialized overlays. [Indie Game Website](https://www.indiegamewebsite.com/2019/08/16/oxygen-not-included-review/) · [GameGrin](https://www.gamegrin.com/reviews/oxygen-not-included-review/).

Audio is lighter than the visual/UI feedback but completion alerts and local machine/Duplicant sounds help surface state. GameGrin notes how zoom level changes ambient detail.

### Friction and accessibility

The major cost is cognitive. Pipes/vents/wires occupy separate layers, materials have detailed physical properties, and advanced community builds can resemble engineering diagrams. Klei designer Johann Seidenz explicitly said that too much tutorial hand-holding risked destroying the reward of figuring systems out, while admitting onboarding still required work. [Game Developer interview](https://www.gamedeveloper.com/design/behind-the-design-of-hit-sim-game-i-oxygen-not-included-i-).

That is an intentional tradeoff, not evidence that every opaque mechanic is successful.

## R08 — narrative, worldbuilding and player-created stories

ONI has a light authored science-fiction mystery rather than a character-driven campaign. Environmental points of interest, logs and Gravitas-related material gradually explain more about the Duplicants, technology and world. End goals can formally complete a colony, but many players continue indefinitely to optimize systems.

The stronger narrative is causal:
- "we ran out of algae";
- "the toilets contaminated the reservoir";
- "the new oxygen plant overheated the farm";
- "a Duplicant peed because the bathroom schedule failed";
- "our elegant petroleum system backed up and shut off power."

VICE's Nicole Clark describes a colony in which a clogged outhouse and bad planning pollute the water supply, a miner dies in carbon dioxide, and a poorly chosen atmosphere destroys crops. These are funny because every catastrophe can be traced back to a comprehensible system rather than a random disaster card. [VICE](https://www.vice.com/en/article/oxygen-not-included-klei-darkly-comic-fight-for-survival-review/).

The limitation is character drama: players can love their Dupes, but relationships between Dupes are not the primary story generator.

## R09 — production, Early Access and design iteration

Klei used Early Access as an explicit development method. In 2017, designer Johann Seidenz discussed building individual simulation systems while incorporating player feedback. Game Developer's summary emphasizes that the team saw discovery itself as part of the reward, which made tutorial design unusually difficult. [Game Developer](https://www.gamedeveloper.com/design/behind-the-design-of-hit-sim-game-i-oxygen-not-included-i-).

The 2017 Destructoid build is useful historical evidence because several now-core systems were still incomplete or differently balanced. It already had oxygen/gas, food, temperature, stress, traits and primitive critters, while the reviewer correctly treated the product as unfinished.

Klei's 1.0 launch arrived July 30, 2019. By launch, years of updates had added/refined oil systems, automation, skills, transit tubes, ranching and space progression. This long gestation matters because reviews from 2017 and 2019 are evaluating different games.

Post-launch production continued far beyond a single expansion. Spaced Out reshaped space/multi-base play; from 2024 through June 2026 Klei shipped multiple themed planet/content packs. Any older article claiming the game's DLC era had ended is therefore historically superseded.

The current game also supports Steam Workshop mods. Community engineering culture is a major part of long-tail play, but community contraptions should not be mistaken for official intended solutions.

## R10 — marketing, distribution, community and virality

Klei distributed ONI as paid Early Access on Steam, using frequent updates and community feedback to build both the product and an audience. The title's name, cartoon disaster animation and dense engineering screenshots create a compact marketing contrast: funny clones inside a serious physics problem.

The game's strongest organic sharing units are:
- spectacular colony-failure stories;
- screenshots of enormous engineered bases;
- compact "machines" such as self-powered oxygen modules, cooling loops and petroleum boilers;
- guides and diagrams explaining pipe/automation logic;
- extreme playtime/optimization anecdotes.

These are observable community behaviors; no source read here supplies channel-attribution percentages proving exactly how many sales they caused.

The paid DLC strategy increasingly creates new starting-world fantasies rather than only endgame content: frozen, bionic, prehistoric and aquatic colony setups are legible marketing propositions for returning players.

Distribution remains PC-focused (Windows/macOS/Linux), with Steam and Epic routes promoted by Klei. Workshop support on Steam gives the game a durable creator ecosystem.

## R11 — commercial and participation context

Klei does not publish a reliable current lifetime unit/revenue total in the primary sources read for this pass, so third-party sales estimates are **not** presented as official sales.

Current participation evidence is strong and correctly bounded:
- Steam currently shows roughly **49.5k English purchaser reviews** and more than **135k Steam-purchaser reviews across languages**, with roughly 95% of English reviews positive.
- The same current Steam surface shows several hundred recent reviews in the prior 30 days, indicating continued activity seven years after 1.0.
- Steam Community shows thousands of users in-game on current snapshots; concurrent players are not unit sales or retention.

[Steam current store](https://store.steampowered.com/app/457140/Oxygen_Not_Included/).

The business model is premium base game plus paid gameplay DLC/content packs, a cosmetic pack and soundtrack. There is no required subscription. Continued free fixes/update support accompanies a long-running paid-content catalog.

Third-party sites produce radically different modeled sales/revenue estimates. Their disagreement is itself a reason not to convert an estimate into a fact.

## R12 — five substantive written reviews and current player evidence

ONI has fewer traditional launch reviews than many games because of its long Early Access arc. This section deliberately mixes Early Access, near-launch/full-release and later-current reviews while labeling each version.

### 1. Destructoid — RoboPandaZ, June 30, 2017; Early Access

The review already identifies the game's central loop: oxygen, gas weight, food, temperature, stress and traits interact so each fix creates another waste stream. It praises accessibility relative to the systems depth and finds disaster funny, while documenting immature AI and incomplete content. A Duplicant dies after digging away support and falling into polluted water; that is useful historical evidence but not a current-AI benchmark. [Review](https://www.destructoid.com/early-access-review-oxygen-not-included/).

### 2. Nicole Clark — VICE, May 31, 2019; late Early Access

Clark reports more than 100 hours and calls ONI a systems-engineering survival game. She praises the dark comedy and iterative learning created by gases, waste, farming, plumbing, heat, decor and stress. She also calls the learning curve steep and the complexity baffling. Her concrete failures—CO2 death, polluted water, wrong crop atmosphere and resource exhaustion—show why losing is informative rather than merely punitive. [Review](https://www.vice.com/en/article/oxygen-not-included-klei-darkly-comic-fight-for-survival-review/).

### 3. The Indie Game Website — August 16, 2019; 1.0 era

The review praises the organic progression from toilets/oxygen/food into hospitals, pipes, thermal management and rocketry, and says the playful visual design makes detailed information approachable. Criticism is practical: frame drops, confused AI and crashes still felt like Early Access residue immediately after release. [Review](https://www.indiegamewebsite.com/2019/08/16/oxygen-not-included-review/).

### 4. Andrew Duncan — GameGrin, July 30, 2024

This later review emphasizes how random worlds and Duplicants produce repeatable learning loops and how each solved need exposes another resource problem. It praises visual readability and compulsive planning but criticizes persistent cycle stutter and Duplicants sometimes ignoring what feels like an obvious urgent task. It is useful because it evaluates years of post-launch changes rather than only 2019 ONI. [Review](https://www.gamegrin.com/reviews/oxygen-not-included-review/).

### 5. Gideon's Gaming — January 31, 2025

The reviewer played more than 50 hours with then-existing DLC and argues ONI's distinguishing achievement is generating pressure **without random external attacks**. Scarcity plus delayed ripple effects make the player's own infrastructure create new crises. The criticism is that Duplicants lack strong individual personalities and can feel like cogs compared with relationship-rich colony sims. [Review](https://gideonsgaming.com/the-genius-design-of-oxygen-not-included-a-review/).

### Current Steam helpful/player sampling — September 2026

A September 10 current helpful positive review with more than 950 displayed hours praises the deep physics simulation, oxygen/food/liquid/disease/temperature/happiness interlock and Workshop-fixable rough edges. It explicitly notes that combat/story are not the central appeal. [Current Steam reviews](https://steamcommunity.com/app/457140/reviews/).

The same current helpful surface contains strong negatives: one 664-hour account says later DLC/mechanics reduced quality of life, while another 222-hour account criticizes mechanical issues and the shift toward repeated paid DLC. A separate September negative review says waste management becomes annoying and that too much information has to be learned outside the game. [Current Steam reviews](https://steamcommunity.com/app/457140/reviews/?filterLanguage=default&l=english).

Current positive reviews continue to praise freedom, experimentation and the feeling that another layer remains after hundreds of hours. [Helpful-year surface](https://steamcommunity.com/app/457140/reviews/?browsefilter=trendyear&filterLanguage=default&l=english&p=1).

**Sampling limit:** Steam sorting is ranked and time-sensitive, not representative polling. Displayed hours are current snapshots, not assumed historical hours at posting unless the page says otherwise.

### Reception synthesis

Praise converges on:
- deep but spatially legible physics/systems;
- satisfying problem solving and optimization;
- failure that teaches;
- humorous presentation;
- enormous replay/learning ceiling.

Criticism converges on:
- steep onboarding and external-guide dependence;
- worker priority/pathing frustrations;
- late-colony performance/stutter;
- weak interpersonal personality compared with social colony sims;
- increasing DLC/QOL frustration among some long-time players.

## R13 — transferable inspiration and limits

1. **Let solutions create waste.** A new capability is more interesting if it exports heat, pollution, risk or maintenance rather than deleting a problem.
2. **Make hidden state spatially inspectable.** Gas, heat, germs and power become learnable because overlays show where the problem is.
3. **Treat population as both throughput and load.** More agents should not always be an unconditional upgrade.
4. **Allow delayed consequences.** The most memorable failure may be caused dozens of minutes earlier by a technically sensible shortcut.
5. **Make infrastructure compositional.** Pipes, bridges, valves, sensors and logic become a vocabulary from which players invent machines.
6. **Prefer causal pressure over arbitrary events when appropriate.** ONI can create crisis without spawning an enemy wave because the simulation itself has conservation/scarcity.
7. **Use labor priorities rather than direct puppeteering.** Indirect control makes colony layout and specialization meaningful.
8. **Couple progression to expectations.** Skilled Duplicants demand more morale, preventing pure vertical improvement.
9. **Make mundane failures funny.** Expressive characters let sewage, suffocation and stress remain readable without becoming tonally grim.
10. **Give expert players room to discover stable patterns without declaring one canonical build.** Multiple inputs/resources/biomes make engineering knowledge transferable but not identical every run.

### Limits

- Every added simulation dimension raises onboarding cost and UI burden.
- An inscrutable worker scheduler makes systemic causality feel like AI failure instead of player consequence.
- If every solution creates a problem, players can feel punished for progress rather than rewarded.
- Late-game colonies can become CPU/pathing-heavy; complexity has computational as well as cognitive cost.
- Physics depth does not produce emotional character depth automatically.
- Community-standard contraptions can turn discovery into perceived mandatory homework if the game does not adequately teach primitives.
- DLC that modifies shared systems can alienate players who preferred a stable baseline.

The most transferable principle is **conservation with consequences**: matter, energy, labor and time should move somewhere, so the world remembers what the player built.

## R14 — sources, preservation, navigation and requirement map

### Primary/current product sources read

- [Klei — Oxygen Not Included](https://www.klei.com/games/oxygen-not-included) — current game and DLC positioning, including Aquatic content.
- [Steam base game](https://store.steampowered.com/app/457140/Oxygen_Not_Included/) — July 30, 2019 release, current single-player feature listing and review counts.
- [Steam DLC index](https://store.steampowered.com/dlc/457140/Oxygen_Not_Included/) — current dated Spaced Out, Frosty, Bionic, Prehistoric, Neutronium and Aquatic catalog.
- [Steam Aquatic Planet Pack](https://store.steampowered.com/app/4310080/) — June 11, 2026 release and marine/swimming content.
- [Steam Community Announcements](https://store.steampowered.com/oldnews/?appgroupname=Oxygen+Not+Included&appids=457140&feed=steam_community_announcements&headlines=1) — inspected September 27, 2026; Aquatic launch plus subsequent June/July maintenance-update chronology, with no later gameplay pack visible in the official stream.
- [Game Developer — Klei designer Johann Seidenz, June 2017](https://www.gamedeveloper.com/design/behind-the-design-of-hit-sim-game-i-oxygen-not-included-i-) — simulation-design discovery, tutorial tradeoffs and Early Access feedback process.

### Critical/player sources read

The five substantive reviews summarized in R12 were read at Destructoid, VICE, The Indie Game Website, GameGrin and Gideon's Gaming. Current Steam review/helpful surfaces supplied positive and negative 2026 player accounts.

### Evidence limits

- No primary-source lifetime unit/revenue total was found, so modeled third-party sales are not treated as official.
- Early Access reviews are explicitly historical and do not establish current AI, disease balance, content or performance.
- DLC mechanics are not silently transferred into the base game.
- Current Steam review counts are participation/reception signals, not sales.
- Workshop/community builds are useful follow-up viewing/learning routes but were not treated as official prescribed designs.

### Preservation check

G129 is a newly curated G111–G130 subject. Direct branch checks found no prior dedicated ONI dossier, game chapter or likely-named ONI mechanics owner. This file therefore creates a new owner instead of replacing inherited research. Packet-wide P01–P05 reconciliation remains separate.

### Requirement map

| Requirement | Coverage |
| --- | --- |
| R01 | Base game and all current gameplay/cosmetic DLC boundaries through Aquatic 2026 |
| R02 | Indirect labor, gases, liquids, heat, power, automation, food, research/space and explicit combat/stealth absences |
| R03 | Duplicants, materials, germs/heat and building-network composition |
| R04 | Skills/morale, research, non-currency economy, cycles and failure cascades |
| R05 | Eight worked cross-system engineering/labor cases |
| R06 | Duplicant autonomy/personality limits, priorities, critters, disease, explicit faction-simulation absence and no multiplayer |
| R07 | cartoon readability, overlays, audio, tutorial/complexity tradeoff |
| R08 | light authored lore plus causal colony stories |
| R09 | Early Access iteration, 1.0 and long post-launch DLC/support history |
| R10 | Early Access distribution, shareable failures/designs, Workshop and themed DLC |
| R11 | bounded Steam participation evidence; no invented official sales |
| R12 | five substantive written reviews plus current Steam praise/criticism |
| R13 | transferable conservation/ripple-effect patterns and failure modes |
| R14 | annotated current/historical sources, evidence limits, preservation and map |

**Completion review:** R01–R14 are substantively covered; current DLC through the June 2026 Aquatic Planet Pack is separated from base-game systems; eight worked cases show delayed resource/thermal/labor consequences; five substantive written reviews span Early Access through 2025 and current Steam samples capture 2026 praise and criticism; no unsupported official sales are claimed; and no prior ONI owner was overwritten.
