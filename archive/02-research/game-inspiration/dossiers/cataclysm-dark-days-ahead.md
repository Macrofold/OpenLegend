# G122 — Cataclysm: Dark Days Ahead

**Full R01–R14 research pass.** Research date: September 26, 2026. [Roster](../research-roster.md) · [R01–R14 requirements](../research-requirements.md) · [Progress and completion commit](../research-progress.md). Reference research only, not an accepted OpenLegend design or implementation proposal. **Spoilers:** broad setting, faction and character-transformation examples, without a detailed laboratory or mission solution.

## R01 — Identity, scope and the player's changing promise

Cataclysm: Dark Days Ahead (CDDA) is a turn-based survival game in a persistent, procedurally generated post-apocalyptic world. It is broader than a zombie-combat game: supplies, weather, physiology, tools, other survivors and strange creatures can each become the immediate problem. Its defining promise is that ordinary possessions and practical preparation can combine into unusually specific survival plans. The player does not need a world-saving quest to give a water container, a working vehicle or a safe bed significance. [S01, S03]

The early experience is about obtaining shelter, water, food, usable equipment and a plan for getting out of trouble. Established play becomes more self-directed: develop skills, restore machinery, build a mobile or fixed home, work with NPCs, investigate dangerous places, or change the survivor's body. There is no ordinary universal character-level ladder that makes every activity a means of collecting combat experience. Better knowledge and a better-supported way of living can matter more than winning another fight. [S03]

### Version and distribution boundaries

| Studied route | Verified scope and important distinction |
| --- | --- |
| Upstream stable **0.I — Ito** | The GitHub release was published **June 6, 2026** and is not marked prerelease. This dossier uses the tagged 0.I in-game help as its principal mechanics baseline. The release includes desktop and Android packages with different terminal, graphics and sound combinations. [S02, S03] |
| Upstream experimental | A separate, frequently changing development route. Current documentation can describe changes beyond the stable baseline; its presence on a documentation site is not proof that the same behavior exists in every stable package. [S01] |
| Paid Steam distribution | Steam release: **March 31, 2023**, not the game's original creation date. The listing credits CleverRaven as developer and KorGgenT as publisher, with cloud saves and graphical achievements among the distribution's conveniences. The upstream game remains freely available. [S14] |
| Steam's 0.I update | The publisher's **August 24, 2026** announcement acknowledges a packaging delay, restores a Linux build, and explicitly excludes nightly experimental releases from this route. It describes integration and stability costs rather than promising identical update timing across channels. [S15] |
| Historical mobile ports | The 2016 iOS review below concerns that port and its interface. Its pricing, sound options and usability are not assumed to describe current Android, upstream desktop or Steam releases. [S20] |
| Mods | Magiclysm, Mind Over Matter and other additions can change the available powers and setting. The engine's spell/effect infrastructure is not evidence that an unmodified survivor has a conventional spellcasting class. [S10, S12] |
| Separate co-op fork | CDDA Coop advertises two-player play based on experimental 0.I+. It is a separate project, not native multiplayer in the upstream stable or Steam product. Its own changelog records work on long-action synchronization, vehicles and shared inventory. Its existence does not make those problems trivial. [S13] |

The release-date distinction is material: an old complaint about Steam being behind upstream can be valid for the review date without establishing that the August 2026 update never happened. Conversely, shipping stable 0.I does not discharge a request for experimental builds that the publisher explicitly chooses not to distribute. **September 27 audit check:** the project's own current Releases page still identifies **0.I Ito** as the latest stable and separately describes the experimental stream as bleeding-edge development, confirming that this dossier's stable baseline remains current while experimental builds continue independently. [S02, S15, S29]

## R02 — Action vocabulary and complete mechanics inventory

### Acting consumes fictional time, not just a player turn

Movement, attacking, aiming, reloading, crafting, reading and resting consume different amounts of in-world time. Terrain and the survivor's condition influence action speed. The player can deliberate while choosing, but a slow action still lets danger advance. This is why the game can create pressure without a real-time reaction test. A loaded firearm and an unloaded one are not equally ready tools; a powerful but cumbersome melee weapon is not automatically the safest answer to a nearby threat. [S03]

The ordinary spatial vocabulary includes moving, examining, opening and closing, smashing, dragging or carrying useful things, looking beyond the current viewport, and inspecting nearby visible objects. Closed containers do not expose all their contents at arbitrary distance. Remembered map information is also different from current visibility. Safe mode can interrupt habitual movement when a newly visible threat appears; it does not make the survivor safe, resolve an encounter, or excuse a poor escape route. [S03]

### Creating a survivor is choosing an initial situation, not a permanent class

Scenarios, professions and hobbies contribute starting context, equipment, traits, knowledge and capabilities. The documented Police Officer profession uses recognizable possessions such as a badge, whistle, wristwatch and charged phone to make background concrete. Skills and proficiencies can then develop beyond the starting role. A profession is not a lifelong prohibition on learning another craft. Older point-buy explanations should not be generalized across all current creation modes: documentation explicitly records fields whose point values no longer have the old effect. [S07, S08]

Strength, dexterity, intelligence and perception interact with skills, equipment, condition and action requirements. Traits and later bodily changes can affect what a survivor can wear, carry, consume or do. The meaningful question is not only “what is the best build?” but “what kind of beginning and subsequent constraints will make this run interesting?” Over-optimizing a start is an available playstyle, not the sole intended narrative. [S03, S07]

### Systems inventory

| Category | What the player actually manipulates |
| --- | --- |
| Skills and progression | Practical skills, theoretical knowledge, granular proficiencies, practice recipes and reading; not a generic kill-to-level system. Skills in the tagged help run from 0 to 10, while proficiencies have their own prerequisite and mastery structure. [S03] |
| Equipment and inventory | Wielded tools/weapons, layered clothing, body-part protection, pockets, containers, ammunition and magazines, repair and degradation, nearby-item filtering and comparison. [S03, S09] |
| Crafting and upgrading | Recipes, references, reusable tools, consumed ingredients, skill/proficiency requirements, work sites, interrupted craft objects, batch work and knowledgeable helpers. [S03] |
| Combat | Melee attacks with many ordinary items, ranged aiming and firing, martial-arts styles, compatible weapon techniques, traps, terrain, escape and avoiding groups. Action cost, stamina, injury and noise constrain apparent firepower. [S03] |
| Stealth and information | Visibility, line-of-sight obstruction, light, sound and attention make route choice and avoidance valuable. Do not collapse these into a single universal stealth roll or assume every creature perceives identically. [S03] |
| Needs and recovery | Food, water, calorie reserves, sleep, pain, wounds, body-part damage, temperature, morale and learning focus. These are fictional simulation rules, not a real-world medical guide. [S03] |
| Traversal | Walking and running with condition costs, overmap travel, buildings and vertical spaces, driving, boats and potentially amphibious constructions. Vehicles have parts, mass, power, drag, fuel and cargo rather than being abstract fast-travel buttons. [S03] |
| Powers | Mutations and bionics alter bodily capabilities; optional mods add other power systems. Benefits can require energy, installation, compatible anatomy or new ways of living. [S03, S10, S11] |
| Activities | Cooking, butchery, foraging, farming and construction, reading and recreation, repairs, scavenging, NPC work and exploration. There is no requirement that all meaningful play culminate in a combat encounter. [S03, S14] |
| Society | Generated or authored NPCs, dialogue, missions, trading, followers and faction relationships. Authored hubs and conditional interactions are present; a complete autonomous society in which every distant resident performs a detailed schedule is not established. [S04–S06] |
| Relationships | Trust, anger, fear, value and other authored dialogue conditions matter. This is not a Persona-style calendar romance campaign; that distinction does not imply the total absence of adult or relationship dialogue. [S06, S14] |
| Building and management | Fixed shelter, appliances, storage, cultivation, vehicle construction and NPC-supported work. The scope is survival infrastructure, not a comprehensive city-government or dynastic succession game. [S03] |
| Multiplayer and return | Upstream play is single-player. Mods, stories, community development and a separate co-op fork are different participation routes. New scenarios, self-imposed goals and player knowledge sustain return beyond a particular survivor. [S01, S12, S13] |

## R03 — Objects are bundles of affordances and liabilities

### Storage, clothing and readiness

An item is not merely a name with a rarity color. It may have weight, volume, material, condition, contents, nutritional properties, power requirements and possible tool or combat uses. Pockets introduce further distinctions: a capacity limit does not ensure that an awkwardly shaped object fits through an opening or into a restricted holster. Storage architecture changes access and carrying decisions. A useful comparison is between total available space and an actually convenient loadout. [S03, S09]

Clothing combines warmth, protection, coverage, layering and encumbrance. Protection does not mean every hit is absorbed: the developer FAQ describes coverage and body sublocations, followed by outer-to-inner armor processing. A good protective material does not compensate for leaving a location uncovered. Too much overlapping clothing can also reduce effective action. The exact current armor formula should not be reconstructed from one old passage: even tagged help and the FAQ contain simplified or historical descriptions, and newer documentation discusses additional details. [S03, S04]

Repair is distinct from permanent restoration. The 0.I help describes degradation that limits how completely a repeatedly damaged item can be repaired. This makes maintenance a history-bearing process rather than an endless reset to pristine condition. The same interface exposes repair requirements and item comparisons, allowing the player to decide whether to preserve, replace or repurpose a possession. [S03]

### Tools, materials and learning compose into production

The main crafting categories in the tagged help include weapons, ammunition, food, chemicals, electronics, armor, appliances, other objects, animals and practice. Fabrication, Food Handling, Applied Science, Tailoring and Electronics describe different kinds of competence. Some recipes can be inferred from knowledge; others require reference material. Keeping a book available while working is therefore different from having memorized every recipe it contains. [S03]

Tools and ingredients have different persistence. A tool can serve many jobs while ingredients are consumed; difficult work can waste materials on failure. The game also makes an interrupted project into a persistent in-progress item rather than erasing all work. A suitable workbench, batching and knowledgeable companions can change the effective cost of production. These affordances turn organization into a practical activity, not just a cosmetic base-design choice. [S03]

Proficiencies add a finer-grained dependency structure. The documented chain **Principles of Metalworking → Blacksmithing → Armorsmithing, Bladesmithing or Manual Tooling** distinguishes knowing the general field from mastering a particular technique. Missing several proficiencies can compound time and failure penalties. Practicing a simpler process first may therefore be a better survival plan than attempting the desired final product immediately. The price is complexity: not every additional prerequisite produces an equally interesting decision. [S03]

### Vehicles, electricity and home-making

A vehicle joins frame, propulsion, storage, controls, seating, wheels or hull, power and optional equipment. More cargo or protection can raise mass; additional width and protrusions can worsen aerodynamic behavior; off-road suitability and road efficiency are not identical goals. A vehicle can become a home or workshop, but combining more functions does not eliminate their costs. The interaction screen exposes the components and resulting parameters rather than presenting a single vehicle level. [S03]

Boats make composition especially legible. A hull must support the vehicle's draft; adding cargo or heavy equipment can make a previously workable construction unsafe in deep water. Amphibious capability also does not guarantee the same speed or efficiency on land and water. These are examples of the game linking construction choices to later travel consequences, not an assertion that its simulation is a certified real-world engineering model. [S03]

Food storage creates a second infrastructure chain. Temperature affects spoilage; powered refrigeration, smoking and suitable storage can extend the useful life of a harvest or scavenging trip. A durable supply of food depends on more than finding a large pile once. Fuel, power, tools, location and time can become dependencies of the apparent solution. [S03]

### Body modification is another equipment problem, but not only equipment

Bionics can embed a useful function in the body or provide an unusual capability, with passive and activated variants. Many require stored energy and a means of generating it; installation requires appropriate medical machinery and expertise. Removing the need to carry one tool can therefore introduce a new power or service dependency. [S03]

Mutation categories such as Fish, Bird, Plant, Rat or Slime illustrate changes in how a survivor might inhabit the world. The documentation contains anatomy- and capability-related restrictions as well as advantages. Do not treat the combined mutation/mod flag catalog as a guarantee that every appealing combination is available in every base-game version. Likewise, an effect called a spell in the data format is not automatically a spell a vanilla survivor can learn. [S10, S11]

## R04 — Progression, scarcity, the calendar and death

Time is a resource that connects nearly every layer. Reading or crafting can be sensible progress while the survivor is secure, but those activities still consume provisions and may leave other problems unresolved. Weather and seasons change the usefulness of shelter, clothing, crops and stored food. The most valuable upgrade may be a lower-maintenance routine that frees time for exploration rather than another weapon. [S03]

The physiological model distinguishes immediate stomach fullness from longer-term nutrition and stored calories. Sleep, injury and pain influence how effectively the survivor can act. Morale influences focus, which changes learning effectiveness. Consequently a good meal, recreation or a comfortable resting place can matter mechanically without becoming an arbitrary quest reward. These are documented game relationships; they should not be used as physiological or treatment advice outside the fiction. [S03]

Theoretical knowledge can exceed practical skill. Proficiencies can be partly learned before mastery and, according to the stable help, mastered proficiencies are not forgotten. This creates several overlapping kinds of progress rather than a single number. Historical complaints about skill rust need version context: current project discussion describes changed practice and relearning behavior, not simply the oldest form of forgetting. [S03, S12]

The economy is primarily scarcity and exchange of useful goods, not a universal shopping currency that replaces the simulation. Faction documentation supports currencies and price modifiers; Free Merchants' **FMCNote** is a concrete example. Trust can affect access to goods. That does not prove a complete supply-and-demand economy operating independently across every town. [S05]

Death ends an individual survivor's run under the ordinary design. Quitting and resuming a save is not the same as reversing a fatal decision; world persistence is also not a promise that a dead character is resurrected. Player knowledge survives even when that character does not. Replaying a different scenario, keeping a world where supported, or setting a new project can change the next run's meaning. Avoid treating external save manipulation as the only way to play or presenting it as the designed recovery loop. [S01, S12, S26]

Early goals are often immediate safety and manageable supply. Middle play develops reliable tools, transport, knowledge and storage. Later play can pursue specialized constructions, body modification, dangerous sites or NPC projects. The limitation is real: once basic survival becomes routine, a player who needs a clear authored ending may find purpose harder to sustain. More recipes alone do not necessarily solve that problem. [S03, S22–S24]

## R05 — Eight worked situations

The following are **constructed illustrations of documented rules**, not claims of personally played or reproduced sessions. They span different systems and expose a limitation in each decision chain.

### 1. A better haul that makes the return trip worse

**Intention:** bring useful supplies back from a building. **Conditions:** the survivor has several containers and already carries essential tools. **Actions:** inspect not just the value of the remaining loot but its fit, weight and effect on the loadout; leave or relocate less useful objects. **Interaction:** carrying capacity, pocket compatibility, encumbrance and escape readiness constrain one another. **Result:** taking less can preserve the ability to leave safely. **Next decision:** return with transport or accept the smaller haul. **Limit:** total empty volume is not a guarantee that a particular long or bulky object fits. [S03, S09]

### 2. Winning a fight without creating the next one

**Intention:** clear one obstacle to reaching supplies. **Conditions:** several enemies are nearby, and the survivor has a firearm but limited readiness and stamina. **Actions:** draw a manageable opponent toward a doorway or window; decide whether a quieter close-range solution is safe before firing. **Interaction:** terrain slows an approach, action costs matter, and gunfire can attract further attention. **Result:** an immediate victory can either open the route or worsen the area's danger. **Next decision:** collect the needed item and leave, or abandon the trip. **Limit:** a choke point does not indefinitely stop a crowd, and preserving ammunition is not worth every injury. [S03]

### 3. Learning a craft before attempting its impressive product

**Intention:** make advanced metal equipment. **Conditions:** the survivor has some theoretical knowledge but lacks several relevant proficiencies. **Actions:** inspect requirements, practice a simpler technique, and use reference material and a suitable work site. **Interaction:** knowledge, proficiency, failure risk, materials and available days determine the real cost. **Result:** preliminary work can reduce the total exposure of the ambitious project. **Next decision:** continue training or settle for a readily available substitute. **Limit:** adding a prerequisite creates an interesting choice only when the alternatives are meaningful; otherwise it is additional busywork. [S03]

### 4. Preserving food rather than repeatedly finding it

**Intention:** turn a successful food-gathering trip into reliable security. **Conditions:** part of the haul will spoil before ordinary consumption can use it. **Actions:** choose preservation or storage suited to existing tools and infrastructure, rather than assuming a powered freezer is already available. **Interaction:** temperature, spoilage, cooking, construction and power form one chain. **Result:** a smaller preserved reserve may be more useful than a larger decaying pile. **Next decision:** invest in improved infrastructure or accept more frequent gathering. **Limit:** a refrigeration plan fails when its supporting power and equipment are unavailable. [S03]

### 5. A mobile workshop that no longer floats

**Intention:** expand an amphibious vehicle into a better-equipped home. **Conditions:** the existing design works, but new cargo and machinery add mass. **Actions:** review the vehicle's component and draft information before entering deep water. **Interaction:** a home improvement changes buoyancy, drag and travel capability. **Result:** a seemingly local inventory decision can invalidate a route. **Next decision:** reduce the load, alter the hull, or choose land travel. **Limit:** successful land driving is not a test of water safety. [S03]

### 6. Recovery days that still contribute to a life

**Intention:** avoid making a damaged limb and poor condition worse. **Conditions:** the survivor has a defensible shelter but finite provisions. **Actions:** rest appropriately in game, organize supplies, choose manageable study or other safe work, and monitor the time cost. **Interaction:** wounds, sleep, pain, morale, focus and food reserves make recovery a planning phase. **Result:** lost combat capacity need not mean all activity has stopped. **Next decision:** resume travel when sustainable or seek help before supplies run out. **Limit:** this describes fictional mechanics, not a medical treatment plan; recovery also cannot conjure missing food. [S03]

### 7. Trading with people who remember an interaction

**Intention:** gain access to useful goods or work. **Conditions:** a faction trader has conditional stock and a relationship to the survivor. **Actions:** pursue the relevant dialogue or mission path instead of assuming possession can be transferred without social consequences. **Interaction:** authored conditions, trust, prices and faction relationships constrain exchange. **Result:** improving access can be an alternative to another scavenging expedition. **Next decision:** maintain the relationship or choose a different source. **Limit:** documented fields such as respect, size and power are not all active mechanics; their presence in a JSON example does not establish a fully simulated political economy. [S05, S06]

### 8. Replacing a carried tool with an internal dependency

**Intention:** gain a useful bionic function. **Conditions:** the survivor can potentially obtain the component but must also support installation and power. **Actions:** plan around those requirements before treating the acquisition as an immediately usable upgrade. **Interaction:** body modification moves a capability from inventory into an energy- and service-dependent system. **Result:** a new convenience can change the survivor's preferred routes and preparations. **Next decision:** invest in the supporting infrastructure or retain an ordinary tool. **Limit:** possession of a bionic item is not equivalent to safe installation or an inexhaustible supply of power. [S03]

## R06 — People, factions, autonomy and the limits of persistence

NPCs combine generated properties and authored content. The dialogue format supports conditional choices, missions and checks involving such qualities as trust, value, anger and fear. Those structures can make a person useful, threatening or difficult without requiring a cinematic companion arc. Their existence is not evidence that every resident performs a rich independent daily schedule. [S06]

Faction documentation makes a particularly useful distinction between represented data and implemented effects. Liking and trust have described consequences, while fields including respect, size and power are explicitly documented as having no relevant current effect. Some relationship flags are also only scaffolding. Free Merchants and Old Guard can be narrative and trade anchors without becoming proof of a completely autonomous institutional simulation. [S05]

World persistence must likewise be separated from simulation frequency. The developer FAQ describes saved submaps, a currently active area around the player, and larger overmaps that organize roads, cities, forests and stored NPCs. That supports returning to a changed place, but not the claim that every distant organism and machine is processed at full local detail on every action. This is a documented implementation boundary, not speculation from a player's anecdote. [S04]

Upstream's single-player position reflects a design cost: a long craft or sleep period that is convenient for one player can impose waiting or synchronization problems on another. The separate co-op fork's changelog makes that concrete through repeated fixes to long actions and shared state. It offers an alternative project boundary, not a reason to rewrite the upstream product as already multiplayer. No network behavior was independently tested for this dossier. [S12, S13]

## R07 — Presentation, interface, audio and feel

CDDA offers both symbolic terminal representation and graphical tiles. ASCII can make a large state space compact for an experienced reader while demanding considerable learned visual literacy from a newcomer. Tiles can make objects more immediately recognizable without eliminating the underlying menus and action vocabulary. These are alternative ways to read the same kinds of problems, not a simple opposition between an old game and a modern remake. [S01, S20, S24]

The presentation is heavily informational: condition displays, nearby threats, an activity log, item descriptions, map memory and contextual menus carry much of the drama. An apparently quiet screen can conceal a consequential commitment of time. Logical sound is also a rule—noise can attract danger—whether or not a particular package produces the same audible effects. Release assets distinguish packages with and without sound, so there is no basis for calling every installation silent or giving one definitive soundtrack specification. [S02, S03]

The project explicitly documents screen-reader concerns, including reliance on color, reading order and split interfaces that can interleave text badly. Its UI documentation describes ongoing migration rather than a finished universal interface replacement. The existence of `SCREEN_READER_MODE` and a design document is not a complete accessibility certification; the useful evidence is that readability includes nonvisual output and not only attractive tiles. [S16]

The historical mobile and Linux critiques illuminate distinct faults: a small software keyboard can make an already complex vocabulary exhausting, while tutorial text can describe symbols absent from a selected tileset. Neither is an inevitable consequence of simulation depth. Better discovery, consistent terminology and trustworthy interruptions can reduce accidental failure while preserving meaningful uncertainty. [S20, S24]

## R08 — Narrative: the extraordinary becomes frightening through the ordinary

The setting's recognizable New England remnants and XEDRA-associated strangeness give ordinary survival a larger mystery. Authored locations, dialogue and missions coexist with generated geography and a survivor's contingent history. A working home, a failed expedition or a changed body becomes meaningful because it modifies what the player can attempt next, not merely because it adds a journal entry. [S14, S03]

The strongest narrative contrast is between routine and rupture. A player may spend time making a place livable, organizing food and equipment, then discover that an unfamiliar threat invalidates the comfortable routine. Simon D.'s critique argues that this accumulated investment can make uncertainty frightening even in a turn-based game. This is his interpretation of the experience, not a measured psychological response common to all players. [S23]

The same structure can fail for a player who finds the routine dull or the loss disproportionate. There is no guarantee that adding more simulated details creates stronger stories. Some details supply a memorable cause; others merely require more menu operations between interesting decisions. The review disagreement should therefore be preserved rather than converted into a single claim that realism is inherently entertaining. [S20, S22–S24]

## R09 — Production, collaboration and iteration

The project's own development-process account traces DDA to a fork of Whales's Cataclysm, associated with Maya Granade, TheDarklingWolf and GlyphGryph, with an emphasis on grittier survival. That is a primary account of origins and direction, not an independently established resolution of every community disagreement about later changes. [S17]

The upstream README credits more than 1,000 volunteer contributors and identifies CC BY-SA 3.0 for project contributions, with other notices for some included components. Public documentation exposes concrete contribution surfaces: JSON definitions for content and conditions, and native code for behavior that needs implementation. This is evidence of a collaborative content-production model, not a claim that all features can be invented safely by editing a few data fields. [S01, S04, S08]

The design record also exposes maintenance costs. Not every disputed feature becomes a toggle; more combinations increase support and testing obligations. Multiplayer and very frequent packaged releases have their own costs. A rapidly changing data-rich game can also outpace tutorials, third-party guides and ports. Preserving a release label with a mechanical claim is therefore part of usable documentation, not pedantry. [S12, S15]

The 0.I help's coverage of partial proficiencies, interrupted work, degradation and vehicle tradeoffs shows a long-running effort to represent intermediate states rather than only success/failure endpoints. It does not establish that every such addition improved fun. The research question is which intermediate states create new plans and which mostly add friction. That judgment requires comparing the rules with player experiences rather than assuming more detail is always progress. [S03, S20–S24]

## R10–R11 — Distribution, community, money and participation

Distribution is decentralized: free upstream packages, community operating-system packaging, mobile routes and a paid Steam edition coexist. Official donation guidance distinguishes infrastructure support from donations to individual contributors. Buying the Steam edition is not the only way to support or play the project, nor evidence that every contributor shares in its revenue. [S01, S14, S19]

The 2013 **Dedicated Developer** Kickstarter ran from June 22 to July 22 and records **440 backers pledging $9,492 against a $7,000 goal**. Those are campaign pledges, not lifetime revenue, profit or a comprehensive development budget. This pass does not infer delivery duration or later finances from the funding total alone. [S18]

The Steam listing inspected during this pass displayed **538 user reviews and 86% positive**. That is a dated review snapshot for one paid distribution, not the size of the game's much wider free user base, units sold or retention. No defensible all-channel player or revenue total was established. [S14]

Recorded outreach includes a 2013 Roguelike Radio episode and its discussion of the active crowdfunding campaign, production and vehicle/crafting ambitions. Only the published show notes were inspected; the episode is not treated as watched footage or a source of verbatim spoken claims. Public releases, contributor documentation and the contemporary Steam announcement are additional observable communication channels. [S25, S01, S15]

**Researcher interpretation:** the most useful sharing units are a peculiar survivor, an unexpectedly interacting object, a vehicle design, a disaster or a guide that makes a difficult system understandable. Free availability can reduce the financial cost of trying the game; it does not eliminate the learning cost. No channel-attribution percentages, creator-driven sales claim or measured virality coefficient are available here. The contributor community also creates a route from encountering a limitation to changing the project, but that route requires skills and review rather than merely requesting a feature. [S01, S04]

## R12 — Five written critical accounts and Steam evidence

The five independent written accounts below include conventional reviews, critical essays and one shorter release article with substantive firsthand play impressions. They are not five score blurbs, nor are all five falsely labeled as long professional reviews. Their different platforms and dates remain visible.

### 1. Shaun Musgrave — TouchArcade, January 15, 2016; historical iOS port

Musgrave praises the breadth of interactions and the ability to create an individual survival story. Crafting, disassembly, clothing and storage generate meaningful decisions rather than a decorative loot list. His central reservations concern two separate barriers: learning the dense game itself and operating a PC-oriented interface through a mobile software keyboard. The positive judgment is conditional on accepting both. This is criticism of a particular 2016 port, not an evaluation of today's Steam interface or mobile pricing. [S20]

### 2. Eric Limer — Popular Mechanics, December 17, 2018; firsthand critical essay

Limer describes deep investment in self-directed survival, but also an intimidating learning burden and escalating chains of prerequisites. The essay follows his transition from player to contributor, making participation in the game's development part of its appeal and frustration. That involvement is disclosed rather than treated as independent outsider testing. His historical account of release cadence is not a statement about the current stable build. [S21]

### 3. Cabinet de Chaologie — “Survivre en ASCII”; undated retrieved French review

The writer finds the presentation austere and keyboard interface difficult, yet values the depth hidden behind them. Clothing's protection, warmth and storage properties create competing needs; scavenging and constructing a workable base give the player goals without a central campaign plot. The criticism includes time demands, rough NPC behavior and a perceived pause in updates. These are historical observations with an unverified article date, not evidence that current development has stopped. The retrieved body does not establish a personal byline. [S22]

### 4. Simon D. — HOP.si, February 15, 2020; Slovenian critical essay

Simon argues that uncertainty and accumulated investment can make this turn-based simulation a horror experience. Ordinary survival creates something to lose; an unfamiliar threat then matters without constant scripted shocks. The account also recognizes the long stretches of routine management that make this appeal selective. Its rhetorical description of how much play is mundane is not used as telemetry. The substantive indexed article body was ultimately retrieved, although direct page access failed; this supersedes the earlier checkpoint's narrower access to its final section. [S23]

### 5. Liam Squires-Hand — GamingOnLinux, March 19, 2019; update report with firsthand impressions

This article combines a release report with actual play impressions. Squires-Hand values being able to choose different graphical styles and describes memorable starts, including an isolated winter cabin and an already infected survivor. He found the tutorial useful but noticed that its explanations assumed ASCII presentation even when using tiles. That is a concrete discoverability mismatch rather than a criticism of tactical difficulty. This shorter account is labeled as impressions, not misrepresented as a long formal review. [S24]

### Steam helpful and contrasting player evidence

The English **Most Helpful (All Time)** surface was located, but direct access encountered a content gate. Its indexed substantive excerpt exposed a recommended account dated **March 31, 2023**, explaining the relationship between the free game and paid support of the Steam publisher. The excerpt did not expose a reliable author handle, so none is invented. Its helpfulness count belongs to the cached retrieval, not a live census; the account is not treated as an official explanation of the publisher's motives. [S27]

A fully readable positive account by **Caba da Muleste da Paçoca**, posted April 4 and updated April 7, 2023, values replay and learning from permanent death. It also says the tutorial does not explain every advanced task, such as complex vehicle work. Its hope for future Workshop support is a hope, not evidence that the feature shipped. The visible current playtime is not substituted for the explicitly different playtime at review. [S26]

For contrast, **NyoNine's** not-recommended account, posted November 27, 2024 and updated June 1, 2025, praises the underlying game while objecting to the paid edition's update delay and lack of experimental builds. An unsupported assertion about the publisher not being a developer is not adopted; it conflicts with the primary store description. The later August 2026 announcement responds to the packaging gap in a dated way while retaining the decision not to ship nightlies. This negative permalink was inspected through its substantive indexed body; it was **not** verified as the top-ranked negative review. [S28, S14, S15]

These samples distinguish dislike of the purchase proposition from dislike of the mechanics. They also underrepresent people who play only the freely distributed builds. No prevalence estimate or manufactured player consensus follows from this small selected set. Sin Vega's Rock Paper Shotgun article was located but blocked and is not counted as read reception evidence.

## R13 — Transferable inspiration and limits

The following are **research interpretations**, not accepted OpenLegend requirements.

**Make ordinary objects useful in several compatible ways.** A container, garment, tool or vehicle component becomes interesting when its properties participate in multiple decisions. The condition is consistency and discoverability. The failure mode is an enormous catalog whose distinctions are mostly bookkeeping. A smaller set of strongly differentiated objects can offer similar expressive value.

**Use time to connect systems without requiring constant reflex pressure.** A slow action can be dangerous because the world advances, not because the user pressed a button too late. This depends on legible action costs, good interruption behavior and recoverable plans. Unexplained time consumption turns a thoughtful simulation into a trap for unfamiliar players.

**Represent intermediate work and partial competence.** An unfinished craft, partially learned proficiency or repair-limited object has a history and supports continuation. The alternative is a simpler instantaneous transaction, which may be appropriate when the intermediate state adds no interesting choice. Do not copy every dependency merely to advertise realism.

**Let infrastructure change the shape of a life.** Reliable storage, transport and a work site can transform which goals are feasible. This can be more satisfying than a stream of numerical upgrades. It also risks making the player maintain a sprawling set of chores; resilient defaults and useful delegation may be needed in a game with different time expectations.

**Separate persistence from omnipresent detailed simulation.** Returning to a changed place can matter even when distant activity uses another representation. The important player contract is what continues, what is remembered and what can be interrupted. A data field or an evocative system name is not evidence that a promised behavior actually occurs.

**Preserve body and capability tradeoffs rather than only escalating power.** A new function may create energy, anatomy or equipment constraints. This supports different ways of living, provided the player can understand the consequences. An irreversible transformation without adequate information may create resentment rather than discovery.

**Treat learning the interface separately from learning the world.** The reception evidence gives reasons to improve tutorial consistency, item inspection, input discoverability and nonvisual reading. None of those improvements requires flattening the world's decisions. Borrow systemic principles, not protected setting details, characters, text or art, and never mistake fictional survival rules for reliable real-world advice.

## R14 — Annotated evidence register and reading route

Sources were accessed or retrieved on September 26–27, 2026. The tagged in-game help and developer FAQ were read through the GitHub connector, with specific ranges for the larger help file. Other documentation is an evolving project site unless explicitly pinned. “Read” refers to the substantive retrieved text, not personally tested gameplay or watched footage.

| Source | Annotation and access boundary |
| --- | --- |
| [S01] | Upstream README, current master. Primary project identity, distribution, contribution/license and tutorial notes; full text read. The contributor count is the README's statement, not a fresh author census. |
| [S02] | GitHub release 0.I/Ito. Primary release metadata and package list read through the connector; June 6, 2026 publication verified. Asset download counters are not player counts. |
| [S03] | `data/core/help.json`, stable tag 0.I. Primary in-game documentation: introduction through needs and powers, lines 126–185 for crafting/items/combat, and subsequent martial-arts, survival, vehicle and skill/proficiency sections. This is documented behavior, not an exhaustive code audit; simplified or historical wording is not silently promoted to a precise formula. |
| [S04] | `doc/DEVELOPER_FAQ.md`, tag 0.I. Full body read; content definition, armor coverage, saved/active map and NPC boundaries. Older code examples are not a current implementation tutorial. |
| [S05] | Project faction JSON documentation. Full substantive body read, including explicit unused fields and relationship flags. Useful for avoiding claims that represented state is always operational. |
| [S06] | Project NPC JSON documentation. Substantive indexed sections on generation, dialogue trials and opinion variables read; not every NPC or mission file inspected. |
| [S07] | Project general JSON documentation. Indexed scenario/profession/hobby sections read; warns against transferring obsolete point fields into current character-creation claims. |
| [S08] | Project modding documentation. Indexed profession and filtering examples read, including Police Officer equipment; not every mod's actual behavior checked. |
| [S09] | Project item JSON documentation. Indexed item/pocket sections read; structural capacity and compatibility examples, not a complete inventory-code audit. |
| [S10] | Project magic JSON documentation. Substantive indexed effect/spell infrastructure sections read; engine capability distinguished from vanilla player access and optional mods. |
| [S11] | Project JSON flag reference. Indexed mutation/anatomy/category sections read; a combined reference can include optional or context-specific behavior. |
| [S12] | Frequently Made Suggestions. Primary project positions and rationale; multiplayer/maintenance sections plus indexed magic/skill-rust passages read. Positions are attributed, not treated as an independent verdict on every community criticism. |
| [S13] | CDDA Coop project site and changelog. Substantive introduction and summer 2026 synchronization/inventory/vehicle notes read. Separate fork; advertised performance and network behavior not tested here. |
| [S14] | Steam store listing. Primary product metadata, support proposition, release date and review snapshot read. Store copy is not independent reception or a unit-sales report. |
| [S15] | August 24, 2026 Steam-publisher announcement as preserved by SteamDB, with primary Steam link. Full mirrored publisher body read; direct Steam announcement body was inaccessible. Release 0.I was independently confirmed in S02. |
| [S16] | Project UI/accessibility documentation. Full substantive body read; screen-reader concerns and ongoing migration, not a claim of universal accessibility compliance. |
| [S17] | Project development-process account. Substantive indexed introduction/history read; primary account of the DDA fork and direction. Other unreturned portions were not used. |
| [S18] | Dedicated Developer Kickstarter. Indexed campaign metadata read: June 22–July 22, 2013; 440 backers; $9,492 pledged against $7,000. Delivery performance and private finances not inferred. |
| [S19] | Official donation guidance. Short substantive indexed body read; distinguishes infrastructure and individual support routes. |
| [S20] | Shaun Musgrave, TouchArcade, January 15, 2016. Substantive iOS review body read; historical port context preserved. |
| [S21] | Eric Limer, Popular Mechanics, December 17, 2018. Substantive critical essay read; player/contributor involvement disclosed. Its account is summarized only in the dedicated reception paragraph. |
| [S22] | Cabinet de Chaologie, “Survivre en ASCII.” Substantive French review body read; article date and individual byline not established. Historical maintenance complaints are not current-status claims. |
| [S23] | Simon D., HOP.si, February 15, 2020. Full substantive indexed Slovenian critique ultimately read; direct page failed. Earlier checkpoint's partial-access limit is explicitly superseded. |
| [S24] | Liam Squires-Hand, GamingOnLinux, March 19, 2019. Full article read; a release report with firsthand impressions, explicitly not mislabeled as a long formal review. |
| [S25] | Roguelike Radio episode 75 show notes, July 5, 2013. Notes read; audio not heard. A historical listening route, not proof that then-proposed features shipped. |
| [S26] | Caba da Muleste da Paçoca's Steam review. Full body and posted/updated dates read; chosen positive account with a concrete tutorial limitation. |
| [S27] | Steam English helpful-all-time surface. Substantive indexed recommended review dated March 31, 2023; direct page gated and author not reliably exposed. Selection and access limits retained. |
| [S28] | NyoNine's Steam not-recommended review. Substantive indexed body with November 27, 2024 / June 1, 2025 dates read; direct page failed. Distribution criticism distinguished from unsupported publisher assertion. |
| [S29] | [Official Releases page](https://cataclysmdda.org/releases/), inspected September 27, 2026. Current project page explicitly names 0.I Ito as the latest stable and keeps experimental builds distinct. Used only for the current stable/experimental boundary, not as a substitute for the tagged 0.I mechanics documentation. |

### Reading and viewing route

Start with S03's movement, items, crafting, vehicles and proficiencies sections to see how the rules compose. Read S04 and S05 next to distinguish persistent representation from active behavior. Compare S20's port-interface criticism with S24's tutorial mismatch, then S23 for a different account of why ordinary preparation can support horror. S25 is a **metadata-only listening recommendation** for historical development context; no timestamps or spoken findings are invented. The Hitchhiker's Guide community catalog is a useful version-selectable lookup route, but this dossier does not claim that its entire item database was inspected.

### Requirement map and preservation

R01 → identity/version table; R02 → action vocabulary/inventory; R03 → objects, production, vehicles and bodies; R04 → progression/economy/time/death; R05 → eight situations; R06 → people/factions/persistence; R07 → presentation; R08 → narrative; R09 → production; R10/R11 → distribution/participation/economics; R12 → five accounts plus Steam evidence; R13 → conditional inspiration; R14 → this source register and routes.

G122 is a newly curated roster addition with no dedicated inherited chapter, mechanics study or dossier. This file does not replace earlier essays or packet material. The checkpoint's four completed reception summaries are preserved; its partially retrieved fifth account is completed and its source limit updated transparently. Existing chapter, mechanics and packet owners remain unchanged, and the global packet-wide P01–P05 gates remain pending in the canonical ledger. Parent links target existing roster, requirements and progress files. No earlier conversation-only evidence, private commercial data, personally played session, footage inspection or runtime verification is claimed.

[S01]: https://github.com/CleverRaven/Cataclysm-DDA/blob/master/README.md
[S02]: https://github.com/CleverRaven/Cataclysm-DDA/releases/tag/0.I
[S03]: https://github.com/CleverRaven/Cataclysm-DDA/blob/0.I/data/core/help.json
[S04]: https://github.com/CleverRaven/Cataclysm-DDA/blob/0.I/doc/DEVELOPER_FAQ.md
[S05]: https://docs.cataclysmdda.org/JSON/FACTIONS.html
[S06]: https://docs.cataclysmdda.org/JSON/NPCs.html
[S07]: https://docs.cataclysmdda.org/JSON/JSON_INFO.html
[S08]: https://docs.cataclysmdda.org/MODDING.html
[S09]: https://docs.cataclysmdda.org/JSON/ITEM.html
[S10]: https://docs.cataclysmdda.org/JSON/MAGIC.html
[S11]: https://docs.cataclysmdda.org/JSON/JSON_FLAGS.html
[S12]: https://docs.cataclysmdda.org/FREQUENTLY_MADE_SUGGESTIONS.html
[S13]: https://cddacoop.com/
[S14]: https://store.steampowered.com/app/2330750/Cataclysm_Dark_Days_Ahead/
[S15]: https://steamdb.info/patchnotes/24898632/
[S16]: https://docs.cataclysmdda.org/USER_INTERFACE_AND_ACCESSIBILITY.html
[S17]: https://docs.cataclysmdda.org/development_process.html
[S18]: https://www.kickstarter.com/projects/568375735/cataclysm-dark-days-ahead-dedicated-developer/
[S19]: https://cataclysmdda.org/donations/
[S20]: https://toucharcade.com/2016/01/15/cataclysm-dark-days-ahead-review/
[S21]: https://www.popularmechanics.com/culture/gaming/a25399561/cataclysm-dark-days-ahead-review-open-source/
[S22]: https://cabinetdechaologie.wordpress.com/seances/onzieme-seance/cataclysm-dark-days-ahead-survivre-en-ascii/
[S23]: https://hop.si/2020/02/15/potezna-simulacija-zivljenja-ki-je-pravzaprav-ena-najboljsih-grozljivk-vseh-casov-cataclysm-dark-days-ahead/
[S24]: https://www.gamingonlinux.com/2019/03/cataclysm-dark-days-ahead-a-free-and-open-source-turn-based-survival-game-had-a-huge-update/
[S25]: https://www.roguelikeradio.com/2013/07/episode-75-cataclysm-dark-days-ahead.html
[S26]: https://steamcommunity.com/id/cabadamuleste/recommended/2330750
[S27]: https://steamcommunity.com/app/2330750/reviews/?browsefilter=toprated
[S28]: https://steamcommunity.com/profiles/76561198346706988/recommended/2330750/
[S29]: https://cataclysmdda.org/releases/
