# G149 — Starfield: authored exploration, modular ships and a creator ecosystem

**Research date:** October 14, 2026. **Scope:** the released game, major version boundaries, and a focused investigation of its popular modding community. Research and interpretation, not an accepted OpenLegend feature specification. No hands-on game, Creation Kit or mod-installation verification was performed.

[Library](../README.md) · [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Scoped progress](../research-progress-modding-2026-10-14.md) · [Cross-game creator principles](../essays/player-created-content-modding-and-marketplaces.md)

## 1. Identity, player promise and version boundaries

Starfield combines a customizable spacefaring character, authored quest lines, exploration, combat, equipment development, ships and outposts. Its useful design question is not simply whether the world is large: it is whether a player's chosen occupation makes the next encounter, object or construction decision meaningful. The initial character receives starting skills from a background and can select optional traits; subsequent development is not confined to that background. Bethesda's introductory guide distinguishes skills, powers, companions and ship systems. [S01]

Treat these versions separately:

| Boundary | What the evidence establishes | What not to infer |
| --- | --- | --- |
| September 2023 launch | The original PC/Xbox release is the subject of the five reviews below. | Their complaints do not automatically describe every later update. |
| June 9, 2024 | Bethesda released the Creation Kit and official Creations support. | The editor is not a release of the complete engine source, and official distribution does not cover every community extension. |
| September 30, 2024 | Shattered Space added the House Va'ruun-focused expansion, centered on the disaster around Dazra. | Expansion content is not part of every base-game purchase or every mod configuration. |
| April 7, 2026 | Free Lanes and Terran Armada arrived, alongside the PS5 release. Free Lanes added Cruise Mode for travel between planets within a system, additional space encounters and progression changes. | Cruise Mode does not establish seamless planetary landing, interstellar travel without transitions, or compatibility with every PC overhaul. |

The 2026 announcement also describes X-Tech upgrades and changes to New Game Plus, including limited item carryover. Therefore, the older support page's blanket item-reset description is historical baseline evidence, not a complete current contract. [S02–S05, S10]

## 2. What players actually do

### Character, actions and advancement

The five skill families are Physical, Social, Combat, Science and Tech. Backgrounds supply an initial identity and skill allocation; traits can add advantages, disadvantages and personal context. Advancement involves choosing which capabilities to develop rather than selecting one permanent combat class. The main vocabulary includes shooting, movement and boosting, conversation, exploration, collection, crafting, ship operation and construction. Story progression also introduces powers. These are distinct advancement channels, not interchangeable experience bars. [S01]

Several interface-level activities are especially important to the experience: security puzzles gate access; persuasion introduces uncertain conversational outcomes; scanning turns environmental observation into resource and exploration information. The PCGamesN review describes the tension between its chosen background and mandatory violence, and finds some conversation checks mechanically conspicuous rather than dramatically persuasive. This is an attributed criticism of the launch design, not proof that every player experiences the same mismatch. [S13]

For OpenLegend research, distinguish **expressing an identity** from **receiving identity-flavored text**. A background matters more when it changes useful options, constraints and relationships than when it only inserts a line into a conversation. That is a design interpretation, not a claim about Starfield's internal implementation.

### Equipment, resources and composition

Weapons, protective equipment, ammunition, consumables and raw materials serve different roles. Equipment can be improved through research and crafting; resource acquisition competes with the inconvenience of carrying and organizing it. The Science skill documentation makes this relationship concrete: Outpost Engineering expands construction/research capabilities, while Planetary Habitation expands the environments in which outposts can be established. Technological possibility and material availability are separate prerequisites. [S06]

A particularly revealing inventory boundary is documented by Bethesda: crafting does not automatically draw resources from a companion's inventory. Resources must be moved into an eligible inventory, such as the player's or ship's cargo. The companion can therefore solve carrying capacity without automatically solving production access. This is a real example of why a creator-facing system must communicate ownership and reachability rather than merely display a total quantity. [S07]

The game contains recognizable equipment families rather than arbitrary player-authored laws. Choosing, modifying and combining equipment in normal play is not the same capability as adding new equipment definitions through a mod. Keep those forms of authorship separate.

### Ships, travel and outposts

Ship creation is functional composition, not only an appearance editor. Cargo, propulsion, power, weapons and habitable arrangements interact. Nat Smith's review describes the cascade from adding cargo to needing stronger engines and then a more capable reactor. Alex Donaldson highlights the pleasure of physically walking through the resulting interior, while noting that buying a ship remains an alternative to mastering construction. [S13, S15]

Outposts offer another loop: choose a location and resource objective, place a beacon, establish extraction and power, provide storage, and optionally support crew and workbenches. A location becomes useful through an operating arrangement rather than possession of a map marker alone. The official getting-started guide also distinguishes industrial parts from furniture and personal decoration. [S08]

The underlying lesson is conditional: productive infrastructure can create a reason to return, but only when its output matters to subsequent play. A large construction catalog by itself does not demonstrate an engaging economy. Likewise, giving players both an expert builder and a purchase route can preserve a wider audience than making construction expertise mandatory.

### Activities, failure, time and economy

The launch reviews describe a mixture of faction missions, bounty work, exploration, fighting, looting, ship acquisition and optional construction. Credits connect those activities to purchases and upgrades; skills and research add nonfinancial gates. Main-story progression, self-imposed projects and curiosity can supply different reasons to continue. The reviews disagree about how successfully those reasons overcome repetitive exploration and menu-driven travel. [S11–S15]

Death/reload and New Game Plus are different forms of loss. The older official New Game Plus description retains character development while resetting much of the accumulated material world; the 2026 changes qualify the extent of that reset. This makes replay a narrative and progression decision, not merely another difficulty setting. **Endgame spoiler:** the main story makes repeated-universe play part of its framing. Readers evaluating long-lived authored worlds should consider the resulting tension between renewed discovery and attachment to accumulated possessions and places. [S05, S10]

This dossier does not establish a current optimal money-making route, universal vendor replenishment timer or exhaustive item-value table. Those are unnecessary to the design question and would require patch-specific verification. There is no verified player-to-player economy or native shared-world multiplayer loop in the studied base-game evidence; do not import either from EVE, No Man's Sky or an experimental Starfield mod.

## 3. People, story, presentation and feel

### Relationships and narrative

Constellation provides the central exploration frame, while organizations and side quests support alternative occupations and local stories. Companions can provide practical help and, for some characters, affinity and romance. Bethesda documents that their moral reactions depend on player conduct; they are not neutral inventory extensions. [S07]

The reviewers offer an important disagreement. GameSpot values several faction stories more than the main campaign, while RPG Site finds satisfying self-directed chains between ordinary goals and authored discoveries. PC Gamer's account of the Kid Stuff trait values the ongoing presence of the protagonist's parents. These accounts suggest that a relatively small, recurrent relationship can sometimes carry more emotional weight than a much larger procedural landscape. The last sentence is interpretation, not a measured comparison. [S11, S12, S15]

The game is not evidence of unrestricted generative NPC agency. Authored dialogue, affinity, schedules, combat behavior and reactive quest states should not be mislabeled as an LLM-driven simulation. This research did not inspect proprietary AI implementation, and it does not infer that implementation from convincing or unconvincing behavior.

### Art, audio, readability and interface

The launch reviews describe a tension between detailed, human-scale interiors and less distinctive stretches of exploration. PCGamesN praises the score while criticizing aspects of world characterization; Windows Central values the bespoke environments and varied combat situations while identifying interface friction and uneven character presentation. These are observations and judgments from critics, not a production breakdown reconstructed from screenshots. [S13, S14]

The functional ship interior is especially relevant to player-created content: a construction can be both an external silhouette and a place its owner inhabits. Conversely, inventory and navigation interfaces can make otherwise useful systems feel like administrative work. Later official changes to maps and gameplay options demonstrate iteration on presentation and usability; they do not prove that every underlying complaint was resolved. [S04]

No claim is made here about a universal best camera, proprietary animation architecture or the size of an art/audio department. The transferable question is whether the interface exposes the relationship between a player's intention, a component choice and the resulting experience.

## 4. Worked interactions

These examples illustrate different systems. They are not fabricated reports of our own play.

### A. A ship purchase goal becomes an authored discovery

**Attributed play account:** RPG Site's reviewer wanted a bigger ship, pursued bounty work for money, and discovered a data lead into the Mantis adventure. What began as an economic objective became a location with its own story, hazards and rewards. The useful pattern is a bridge between ordinary systemic activity and a memorable authored opportunity. The limitation is that a handcrafted discovery remains finite; repeating the same reward chain is not the same experience as finding it for the first time. [S15]

### B. Extra storage causes a design cascade

**Constructed illustration from documented relationships:** a player wants more cargo capacity. Adding storage increases the demands on the ship design, requiring changes to propulsion and available power. The next decision is not simply “buy the highest number”; it may involve reducing cargo ambition, accepting a different configuration or investing more. The design lesson is to show the dependent consequences while editing. Hidden dependencies can turn a satisfying tradeoff into repeated trial-and-error purchases. [S13]

### C. A resource deposit becomes a working place

**Constructed illustration from Bethesda's outpost guide:** a player selects a resource-bearing location, establishes extraction, powers it and connects the output to storage. Crew support and workbenches can then make the outpost useful for production. Merely placing the extractor does not complete the loop. A creator tool inspired by this should preview the missing relationship—power, destination or access—rather than report a generic invalid construction. The example does not establish a universally profitable production chain. [S08]

### D. Gravity changes the same combat vocabulary

**Attributed play account:** Windows Central describes fighting aboard a damaged ship whose gravity changes intermittently. The same weapons and movement acquire different tactical significance because the environment changes. This is a useful contrast to authoring a new enemy solely by increasing health. It also illustrates a content-validation obligation: an encounter must remain navigable and understandable across its changing states. [S14]

## 5. Production, distribution and participation

Bethesda Game Studios developed Starfield and Bethesda publishes it. The official Creation Kit is a public authoring surface derived from the studio's production tooling, not proof that outsiders receive every internal pipeline. The distinction between internal tool capability and a supported external workflow is central to this case. [S02]

A documented marketing milestone is the dedicated Starfield Direct paired with the June 11, 2023 Xbox Games Showcase. Microsoft's announcement describes developer interviews, gameplay, international language support and fan viewing events. This establishes an intentional demonstration and distribution strategy; it does not quantify how many purchases came from a showcase, streamer or specific trailer. [S09]

On November 19, 2024, Bethesda reported **over 15 million players**. This is a dated participation milestone, not 15 million paid copies, current active users, profit or evidence that mods caused retention. The game's purchase/subscription-access history, paid expansions and optional paid Creations are different revenue mechanisms. Exact current prices and private creator royalty rates are not established by this research. [S16, S18]

Official post-launch updates, public creator tools, community authoring and external installation infrastructure are separate maintenance efforts. A publisher can benefit when an attractive overhaul gives someone a reason to own the underlying game. That is plausible business logic, not a causal estimate of Genesis-attributable sales.

## 6. Reception: five original written reviews

These are **launch-era reviews**, not a fresh survey of October 2026 opinion. The summaries preserve disagreement and concrete interactions instead of treating scores as a consensus. Each source's body was inspected.

| Source and date | What the critic valued | What the critic resisted |
| --- | --- | --- |
| Christopher Livingston, PC Gamer, August 31, 2023 | Eventual absorption in personal adventures and the possibility of unusually personal connections, including the parental trait. | A slow route to enjoyment, an initially cold presentation and inconsistent exploration/quest rewards. The reported experience is not evidence that every player needs the same number of hours to enjoy the game. |
| Michael Higham, GameSpot, August 31, 2023 | Improved shooting, selected faction quests and more engaging side-story situations. | Main-story and character weaknesses, limited dramatic consequence in some choices, and launch navigation friction. A stronger faction story does not by itself repair the central campaign. |
| Nat Smith, PCGamesN, updated September 2, 2023 | Ship creation, moments of individualized role-play and the musical presentation. | Friction between a chosen character fantasy and required violence, conspicuous persuasion mechanics, cumbersome interfaces and shallow or repetitive elements of exploration. |
| Jez Corden, Windows Central, updated September 6, 2023 | A substantially more enthusiastic response to handcrafted situations, gunplay, ship combat and discovery. | Information overload, navigation/inventory usability and uneven NPC presentation. The review's enthusiasm is valuable precisely because it does not erase those frictions. |
| Alex Donaldson, RPG Site, August 31, 2023 | Optional system depth, inhabited ship designs and the way self-selected goals lead into authored adventures. | Janky behavior, difficult onboarding and travel interruptions; the recommendation depends partly on tolerance for the familiar Bethesda structure. |

Sources: [S11–S15]. PC Gamer and Windows Central are both Future publications, so this is five original critics across multiple outlets, **not five independently owned media groups**.

**Steam evidence limit:** the helpful-review page was requested, but its accessible response exposed interface scaffolding rather than review bodies. The store response was age-gated; attempts to retrieve positive and negative review bodies through Steam's public review endpoint also failed. Consequently, no Steam quotations, positive/negative sample, current percentage or prevalence claim is supplied. The creator interview below provides direct enthusiast testimony but is not substituted for a representative sample of base-game players. This is an explicit source-access limitation, not evidence that Steam reviews do not exist. [S17]

**Interpretation:** these critics differ substantially on whether the game's breadth sustains curiosity. Commonly discussed frictions are not automatically bugs: some concern desired role-playing freedom, some interface effort, some authored writing and some expectations of continuous space travel. An OpenLegend lesson should identify which kind of problem it addresses before prescribing more content or a more powerful editor.

## 7. R15 applicability: yes, with platform boundaries

**Finding:** Starfield has a popular, sustained modding community. The Nexus catalog showed approximately **13.9 thousand mods and 279 collections** at this research snapshot. That catalog is corroborated by maintained specialist tools and Genesis's multi-year release history. These are different kinds of evidence; catalog entries are not unique creators, active players or independent proof of commercial success. [S19, S21, S25]

The finding applies especially to the **PC ecosystem**. Official Creations, a Windows native extension and a particular curated overhaul have different platform requirements. A game appearing on PS5 does not imply that its Steam-only script extender or every external collection works there.

## 8. How the modding tools actually work

### A. Official content authoring is not reverse-engineering the whole game

The free Creation Kit supports editing such things as quests, environments, characters, dialogue and weapons. Bethesda describes it as the editor used to create the game, and separately documents a Steam ownership/install requirement. A creator can build a new encounter by authoring content consumed by the existing engine, without independently reconstructing rendering, movement or combat. [S02, S20]

Nexus's account of the June 2024 release describes the arrival of normal mod loading and integrations for Papyrus scripting and asset work. **Ordinary content plugins do not inherently require SFSE.** Scripting exposed by the game's tooling is a different tier from a native extension that reaches beyond that supported surface. The same article also records community tools that existed before the official kit; an early mod is not proof that its author rebuilt the game from machine code. [S18]

LOOT's maintainers document an important Starfield-specific workflow: authors work with `.esp` files and convert them to `.esm` masters for distribution. Full, Medium and Small master types all use the `.esm` extension. Their warning against changing a published master type is concrete: dependent mods can break when their master changes representation. File extension alone is therefore an inadequate compatibility promise. [S22]

### B. Community extensions expose deeper capabilities

**SFSE**, maintained by Ian Patterson, Stephen Abel and Expired, extends functionality beyond the base game's exposed interfaces. Its published compatibility statement is Steam-specific and excludes the Windows Store/Game Pass release. At the observed snapshot, its listed build was coupled to game version 1.16.244. [S21]

**CommonLibSF** describes itself as a reverse-engineered C++ library for creating Starfield extensions. That is direct evidence of reverse engineering in the ecosystem, rather than an inference from an impressive screenshot. A content author can depend on this infrastructure without personally identifying every internal engine structure. Native extensions also introduce a materially larger executable trust boundary than loading constrained content data. [S23]

Another distinct example is Nexus's **StarfieldSaveTool**: reverse engineering supports save inspection and mod-management infrastructure, not just new gameplay. Do not collapse a save reader, a quest editor, a runtime DLL and a mod installer into one category called “mod support.” [S24]

### C. Curating and installing are substantial but different work

Genesis is an overhaul that integrates original development, upstream mods and compatibility work. Wabbajack and Mod Organizer 2 serve the installation/configuration side of the process; they do not author the quests or replace the underlying engine. The installation guide establishes a specific supported game/DLC/version configuration, a fresh-save requirement and a launch path through the supplied setup. [S25]

A coherent collection is therefore a **maintained configuration**, not just a bag of downloads. The curator must decide which revisions work together, which changes are supported and where bug reports belong. The player's perceived simplicity depends on that labor remaining visible to the tools even when it is hidden from the installation interface.

## 9. A creation-to-play workflow

The following is a **reasoned workflow assembled from the documented capabilities**, not a reproduced Creation Kit tutorial or a claim to know every proprietary build step.

1. **Define the playable change.** For an illustrative rescue mission, specify the location, actors, conditions, player choices and resulting effects. Decide which existing content can be referenced and which assets must be authored or permissibly reused.
2. **Author content and behavior.** Use the editor's supported records and quest/dialogue facilities. Add scripting only where the exposed systems require it. A new capability outside that surface may require a separate community extension, bringing its own platform and version dependencies.
3. **Preview the actual interaction.** Exercise entry, alternate approaches, refusal, completion and interrupted states. Inspect navigation, dialogue references and resource requirements. This is a proposed quality discipline, not evidence that every published Starfield mod follows it.
4. **Package deliberately.** Select the proper plugin representation, include necessary assets and disclose masters/dependencies. Treat external executable dependencies as explicit installation and security decisions, not invisible implementation details.
5. **Test the supported combination.** Verify the game version, required expansion, relevant dependencies and a disposable save. A plugin working in isolation does not establish that it works inside a large overhaul.
6. **Publish to the appropriate route.** Official Creations and external mod sites have different rules, discovery and support arrangements. Provide a description, compatibility information and accurate attribution. A free route and a paid route need not accept identical content.
7. **Install, play and maintain.** The player obtains the permitted files and configuration; subsequent updates must preserve or explicitly change the supported dependency set. Report defects to the responsible author or curator, with enough configuration information to reproduce them.

The capability and packaging foundations are documented by Bethesda, Nexus and LOOT; the proposed validation sequence is this researcher's synthesis. [S18, S20, S22, S27]

**Failure example:** two individually valid edits may compete for the same authored content or assumptions. A load-order choice can select a winner without preserving both intentions. The published master-type warning supplies one concrete documented dependency failure; the broader conflict example is a systems interpretation, not a reproduced Starfield bug. [S22]

**Removal is not automatically undo.** Bethesda's uninstall guidance discusses disabling/deleting a Creation and returning to an unmodified save. That is not a promise that removing arbitrary content from an already affected save restores all prior state. Likewise, achievements must be checked against the Creation's actual status; the official support page distinguishes achievement-friendly content instead of declaring that every mod disables achievements. [S28, S29]

For a curated overhaul, follow the version-specific support boundary rather than mixing arbitrary Creation Store additions, another manager and unrelated updates. Genesis explicitly treats customized installations as outside its standard support path. This research does **not** endorse disabling antivirus protections or blindly executing downloaded utilities; reading a project's troubleshooting advice is not a security audit. [S30]

## 10. Star Wars Genesis: authorship, motivation and sustainability

### What the case demonstrates

The project represents more than a costume replacement and less than a new standalone engine. Its credits separate narrative, world design, models, interface, gameplay and compatibility work. The credits are explicitly marked as a draft that includes some unreleased or in-progress contributions, so a credited asset or quest is not proof that it is already playable in the current release. [S26]

The project release list begins with **1.0.0 on June 2, 2024** and includes releases through September 2026: approximately **28 months of public development** by October 14. The first private development date is not established. The first listed release precedes the official Creation Kit by a week, which demonstrates chronology, not which specific reverse-engineering techniques that release used. [S31]

### Who does the work

The team page identifies DeityVengy with core development, coordination, funding, quest design and other responsibilities; Patient Wave with quests, levels and asset porting; TheMoreYouJoe with scripting, effects and bosses; Luigi with Shattered Space work; and VikoizBeast with environmental, creature, armor and ship art. It also lists additional writers and production roles. This is a small team with overlapping responsibilities, not evidence that one person created every asset. [S32]

The credits identify unaffiliated contributors separately from paid commissions. For example, Fox and Radiclown are credited for Tatooine/Mos Eisley work, while other entries identify commissioned models, animation or scripting. The distinction matters for attribution, permissions, maintenance ownership and any claim about development cost. [S26]

### Why create something players can access for free?

In the October 7, 2024 Nexus interview, DeityVengy describes an origin in a lull between MMOs: he assembled a large mod collection for a video, the video attracted interest, and viewers wanted to reproduce the setup. He also describes a longstanding desire for this kind of Star Wars role-playing experience. This is primary testimony for creative motivation and audience feedback, not an independently audited business history. [S33]

The current donation page states that Genesis content is free, while optional contributions support him as a creator and do not purchase early access, exclusive content or influence. It reports more than **$30,000 of personally funded project-related expenses as of 2026**. That is the author's estimate, not verified accounts. Free access, donated labor, commissioned work and audience-supported creator income can coexist. [S34]

The underlying game's purchase and required expansion are separate from paying for the mod. The installation guide requires the Steam game and Shattered Space and describes Nexus Premium as optional installation convenience. The guide also labels the project unfinished. An impressive showcase should not be treated as a finished commercial-scale campaign or a promise of indefinite support. [S25]

### Marketplace and rights boundaries

Bethesda deliberately supports a creator ecosystem: the official program allows approved Verified Creators to price eligible content and receive royalties. The verified public sources here do not establish a universal royalty percentage or profit distribution. [S35]

Genesis's external, free distribution is **not** evidence that the project is accepted into Bethesda's paid marketplace or licensed by Disney/Lucasfilm. The project disclaims affiliation, and Bethesda's mod guidelines impose content and permission requirements. A free fan project is not a general-purpose rights-clearing mechanism. OpenLegend should learn from the workflow and collaboration, not copy protected characters, music or asset provenance assumptions. [S27, S34]

## 11. Transferable principles and what not to copy

**Support a coherent experience, not just file editing.** An editor, packager, validator, installer, compatibility report and support route solve different problems. Genesis makes the integrating work visible. An excellent authoring surface can still fail players if installation or updates are unreliable.

**Expose useful composition before unlimited code.** Ships and outposts illustrate meaningful arrangement of trusted components. Official content authoring and native extensions then show different capability tiers. For OpenLegend, generated or player-authored data must still pass the current authority and trusted-family boundaries; a mod's name, popularity or creator reputation cannot authorize arbitrary code or spending.

**Make consequences legible while editing.** Explain why a construction cannot work, which dependency is missing and what an update changes. A vague compatibility badge cannot replace a specific supported configuration or a record of which package owns a changed definition.

**Give creators a playable audience and recognition.** The documented Genesis origin links a shareable demonstration to requests for a reproducible experience. That supports a hypothesis worth testing: reducing the distance from “I made this” to “someone successfully played this” may matter as much as adding another editor feature. It does not establish a numerical retention lift.

**Do not outsource the base game's responsibilities.** A popular mod ecosystem is not proof that unpaid creators will fix onboarding, narrative or technical problems. The contrasting reviews show why “there is plenty of content” is not a sufficient answer to friction or an unfulfilled player fantasy.

**Keep future public compatibility distinct from today's development policy.** Dependency integrity and transparent update behavior are relevant research lessons. They do not authorize backward-compatible save readers, legacy APIs, migrations or an unused package loader in OpenLegend now. The [root development policy](../../../../AGENTS.md) remains controlling; implementation would require separately approved scope and decisions.

The [comparative essay](../essays/player-created-content-modding-and-marketplaces.md) develops the principles alongside No Man's Sky's native construction and unofficial mod tools, and EVE's constrained creator marketplace and external APIs. It owns the cross-game recommendations rather than duplicating them here.

## 12. Coverage and evidence limits

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Section 1: identity, promise and version/platform boundaries. |
| R02 | Section 2: character actions, equipment, travel and construction. |
| R03 | Section 2: equipment/resources, inventory reachability and component composition. |
| R04 | Section 2: progression, economy, loss and replay; current versus older reset rules. |
| R05 | Section 4: four worked interactions, explicitly attributed or constructed. |
| R06 | Sections 2–3: companions, affinity, narrative roles and multiplayer boundary. |
| R07 | Section 3: presentation, functional interiors, interface friction and later iteration. |
| R08 | Sections 2–4: main-story framing, side stories, relationships and marked endgame spoiler. |
| R09 | Sections 5 and 8–10: official tools, community production and credited collaboration; no invented proprietary internals. |
| R10 | Sections 5 and 10: Direct, platform distribution, creator video-to-installation story and explicit causality limits. |
| R11 | Sections 5 and 10: dated player milestone, separate economic models and qualified creator spending. |
| R12 | Section 6: five substantive original reviews; explicit unavailable Steam review-body evidence. |
| R13 | Section 11: concrete transfer principles, alternatives and current OpenLegend boundaries. |
| R14 | This register, adjacent source IDs, reading links and preserved edition/access qualifications. |
| R15 | Sections 7–10: popularity gate, tools, workflow, representative work, compatibility, governance and incentives. |

**Preservation:** Starfield is a new G149 subject, not a replacement for an earlier dossier. This change leaves all G01–G148 case files and the original packet untouched; it does not certify the older packet-wide preservation audit. Detailed Star Wars Genesis claims are grounded in project documentation and the creator interview, not an inspection of Mike's linked YouTube video.

**Research limits:** no hands-on reproduction, security audit, private financial verification, exhaustive mod compatibility test or current Steam sentiment sample. Official updates establish delivered features and documented policy, not independent satisfaction or commercial causality. Older reviews remain attributed to their reviewed version.

## 13. Annotated source register

All sources were consulted for this October 14, 2026 pass. “Current” pages are mutable snapshots; dates below identify releases/publications where available. Reference IDs above point here to keep detailed claims attributable without copying source text.

- **S01 — Bethesda, [Starfield new-player guide](https://help.bethesda.net/app/answers/detail/a_id/61265/).** Official introductory mechanics; not an exhaustive rules reference.
- **S02 — Bethesda, [Creation Kit on Steam](https://store.steampowered.com/app/2722710/Starfield__Creation_Kit/).** Official editor description and June 9, 2024 release information.
- **S03 — Bethesda, [June 9, 2024 update](https://bethesda.net/en-US/news/starfield-update-1-12-30-june-9-2024).** Official Creations/tooling delivery boundary.
- **S04 — Bethesda, [Prepare for Shattered Space](https://bethesda.net/en-US/news/prepare-for-the-launch-of-shattered-space).** September 2024 expansion context and intervening usability changes.
- **S05 — Bethesda, [Free Lanes and Terran Armada](https://bethesda.net/en-US/news/starfield-free-lanes-terran-armada).** April 7, 2026 release/platform and system changes; no inference of universal seamless travel.
- **S06 — Bethesda, [Science skills](https://help.bethesda.net/app/answers/detail/a_id/60889/~/science---skills---starfield).** Official capability/research prerequisites.
- **S07 — Bethesda, [Companions and crew](https://help.bethesda.net/app/answers/detail/a_id/60877/~/companions-%26-crew---starfield).** Affinity, romance and inventory-access boundaries.
- **S08 — Bethesda, [Getting started with outposts](https://help.bethesda.net/app/answers/detail/a_id/61083/~/outposts---getting-started---starfield).** Official construction and production loop.
- **S09 — Xbox Wire, [Showcase and Starfield Direct announcement](https://news.xbox.com/en-us/2023/05/03/xbox-games-showcase-starfield-direct-june-11/).** May 3, 2023; primary distribution/marketing event evidence.
- **S10 — Bethesda, [New Game Plus](https://help.bethesda.net/app/answers/detail/a_id/63412/~/what-is-new-game%252B-in-starfield%253F).** Older reset description; qualified by S05 rather than silently treated as the latest complete rule.
- **S11 — Christopher Livingston, [PC Gamer review](https://www.pcgamer.com/starfield-review/).** August 31, 2023; original criticism and personal play examples.
- **S12 — Michael Higham, [GameSpot review](https://www.gamespot.com/reviews/starfield-review-to-infinity-but-not-beyond/1900-6418110/).** August 31, 2023; original criticism of combat, narrative and exploration.
- **S13 — Nat Smith, [PCGamesN review](https://www.pcgamesn.com/starfield/review).** Updated September 2, 2023; original role-play, ship-building and interface observations.
- **S14 — Jez Corden, [Windows Central review](https://www.windowscentral.com/gaming/starfield-review).** Updated September 6, 2023; contrasting positive assessment and concrete encounter example.
- **S15 — Alex Donaldson, [RPG Site review](https://www.rpgsite.net/review/14721-starfield-review).** August 31, 2023; original self-directed play and construction account. Speculative engine explanations are not adopted as technical facts.
- **S16 — Bethesda, [November update](https://bethesda.net/en-US/news/starfields-november-update-is-now-live).** November 19, 2024; over-15-million-player milestone and achievement-friendly changes.
- **S17 — Steam, [helpful English review surface](https://steamcommunity.com/app/1716740/reviews/?browsefilter=toprated&filterLanguage=english).** Attempted access; review bodies unavailable. Not used as substantive player testimony.
- **S18 — Nexus Mods, [Starfield Creation Kit release coverage](https://www.nexusmods.com/news/14993).** June 2024 platform account of official/community tooling and normal plugin loading.
- **S19 — Nexus Mods, [Starfield catalog](https://www.nexusmods.com/games/starfield).** Dated catalog snapshot; rounded counts are not player statistics.
- **S20 — Bethesda, [Creation Kit ownership requirement](https://help.bethesda.net/app/answers/detail/a_id/73814/~/can-i-use-the-creation-kit-without-owning-starfield-through-steam%3F).** Official supported authoring setup.
- **S21 — SFSE authors, [project site](https://sfse.silverlock.org/).** Primary maintainers, runtime compatibility and Steam-only boundary.
- **S22 — LOOT maintainers, [Changing plugin types in Starfield](https://loot.github.io/docs/help/changing-plugin-types-in-starfield/).** Primary tooling documentation and attributed Bethesda warning about dependent-plugin breakage.
- **S23 — CommonLibSF maintainers, [current project](https://github.com/libxse/commonlibsf).** Reverse-engineered extension library; not Bethesda's official SDK or a security certification.
- **S24 — Nexus Mods, [StarfieldSaveTool](https://github.com/Nexus-Mods/StarfieldSaveTool).** Primary repository for reverse-engineered save inspection infrastructure.
- **S25 — Genesis, [installation guide](https://genesismodlist.com/install/).** Current supported configuration, installer workflow and unfinished-project boundary; documentation only, not a reproduced installation.
- **S26 — Genesis, [credits](https://genesismodlist.com/credits/).** Contributor/commission distinctions; explicitly a draft including unreleased work.
- **S27 — Bethesda, [modding guidelines](https://help.bethesda.net/app/answers/detail/a_id/51731/~/bethesda.net-modding-guidelines---mods%252Fcreations).** Official platform permissions/content rules, not a rights opinion about a particular fan project.
- **S28 — Bethesda, [uninstalling a Creation](https://help.bethesda.net/app/answers/detail/a_id/66075/~/how-do-i-uninstall-a-creation-for-starfield%3F).** Removal and save precautions.
- **S29 — Bethesda, [Creations and achievements](https://help.bethesda.net/app/answers/detail/a_id/66046/~/does-using-creations-disable-achievements-in-starfield).** Current tag/status distinction.
- **S30 — Genesis, [modifying an installation](https://genesismodlist.com/modifying-install/).** Curator's support boundary, not independent proof of every incompatibility claim.
- **S31 — Genesis, [release-history navigation](https://genesismodlist.com/).** June 2024–September 2026 dated public releases; does not establish the first day of private work.
- **S32 — Genesis, [team](https://genesismodlist.com/the-team/).** Current self-reported roles; distinguishes the team from upstream authors.
- **S33 — Nexus Mods, [DeityVengy interview](https://www.nexusmods.com/news/15090).** October 7, 2024; primary creator motivation and origin testimony.
- **S34 — Genesis, [donation policy](https://genesismodlist.com/donate/).** Free access, optional support, reported expenditure and non-affiliation; financial assertions are not audited.
- **S35 — Bethesda, [June update and Creations program](https://bethesda.net/en-US/news/starfield-shattered-space-trailer-june-update-highlights).** Official free/paid creator distribution and royalty mechanism; no inferred revenue split.
