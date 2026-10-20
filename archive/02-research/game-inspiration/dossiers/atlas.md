# G180 — ATLAS

**Research checkpoint — 20 October 2026 UTC. This dossier is incomplete.** The initial source-backed mechanics, technical tools, audio and critical/commercial findings below are preserved while research continues. Remaining work: complete R01–R06 and lore; finish presentation, production and the external-mod investigation; obtain and analyze the remaining independent reviews and player testimony; resolve the current service evidence boundary; finish economics, OpenLegend interpretation, coverage/source registers and integrated review. See the [scoped ledger](../research-progress-pirate-games-2026-10-20.md) and [full requirements](../research-requirements.md).

**Product capture:** Steam sells ATLAS for US$29.99 as Early Access, first released 22 December 2018. It credits Grapeshot Games and Instinct Games for development, and Grapeshot Games/Snail Games USA for publishing. Steam warns that the last developer update was over three years ago. Store availability does not establish that the advertised official servers are operating. [Steam page, captured 20 October 2026](https://store.steampowered.com/app/834910/ATLAS/)


---

# ATLAS — mechanics, progression, people and lore research contribution

**Scope:** G180 supporting research, accessed 20 October 2026 UTC. This checkpoint is incomplete: mechanics, worked situations, lore and the source register are being assembled. The lead researcher owns present service status, commercial/reception evidence and synthesis; the production contribution owns external creation tools. Rules are distinguished by their actual update or source, since an old wiki paragraph can describe a different game version.

## R01 — The intended player life

ATLAS combines persistent survival, character development, settlement construction and ships assembled for exploration, transport and warfare. It supports PvP, PvE, singleplayer and private sessions. [Developer store description](https://store.steampowered.com/app/834910/ATLAS/)

**Interpretation:** the main unit of investment is a growing expedition organization: a survivor acquires tools, those tools produce a foothold, the foothold equips a ship, and the ship brings back resources or gains territory. The player can improve the means of undertaking the next voyage, but must also maintain and defend what has already been built. A naval defeat can therefore reach backward into days of preparation. How strongly that pressure operates depends on the chosen server rules and whether other players can damage the investment.

The following is an account of documented native systems, not a claim that the original official world is still the live destination today. The final documented official wipe announcement scheduled a fresh start for 30 June 2023, explicitly without a patch; it did not wipe unofficial, non-dedicated or singleplayer worlds. Its official PvE configuration became entirely unclaimable lawless. Server-specific rules therefore matter even within the final official season. [Grapeshot, Season 13 announcement, 22 June 2023](https://store.steampowered.com/news/app/834910/view/3665415235990518032)

## R02–R03 — The action and object vocabulary

### Keeping a body alive and capable

Food and nutrition are separate resources. Four vitamin categories associate A with vegetables, B with meat, C with fruit/berries and D with fish/dairy. A balanced diet can earn the Equilibrium buff. Preparing an expedition consequently means choosing a mixture, not merely accumulating one large stack of the easiest food. The community Food page remains useful for categories, but its claim that vitamin imbalance inflicts lethal damage is superseded by the later official patch below. [Community Food reference](https://atlas.fandom.com/wiki/Food)

**Version correction — March 2023:** patch 557.6 made vitamin levels survive death and removed their damage-over-time penalties. Extreme A, B, C and D respectively increase incoming damage, reduce stamina recovery, reduce fortitude and slow movement; less extreme deficiency/surplus gives smaller penalties. Overeating now adds torpor instead of directly removing health. Death therefore no longer supplies the old vitamin reset. The system still affects survival indirectly through combat, climate resistance and movement. [Grapeshot, patch 557.6, 14 March 2023](https://store.steampowered.com/news/app/834910/view/3648517227974037574)

Ocean water is salty; a coast is not automatically a drinking supply. Freshwater pools, collecting rain and digging for groundwater serve different situations. The groundwater action uses a timing interaction; a waterspout can supply a drink or fill a Waterskin. Carrying water lets the player leave a known source, while temperature and exertion make that stock part of the route plan. [Community Water reference](https://atlas.fandom.com/wiki/Water)

### Useful objects and the reason to travel

A bare-handed start becomes a tool economy: picks and hatchets gather resources, shovels excavate, climbing picks and grappling hooks change access, and a Repair Hammer maintains ships. Unlocking a recipe is not the same as possessing its materials or having the workstation needed to build it. This distinction links character specialization to bases, cargo and companions. [Tool catalogue](https://atlas.fandom.com/wiki/Tools)

Higher-quality blueprints can require several distinct named material varieties instead of one generic resource category. A blueprint belongs in the appropriate crafting station and has a limited number of uses; the resulting object can have improved durability, armour or other relevant statistics. The community reference also distinguishes the initial multi-material construction requirement from subsequent repairs with generic resources. A rare recipe therefore creates a reason to explore, trade or cooperate before it creates a stronger item. [Blueprint rules](https://atlas.fandom.com/wiki/Blueprints)

### Crew are labour with an upkeep cost

NPC sailors can be hired at Freeports or recovered after defeating Ships of the Damned. A captain can assign them to sails, artillery and other supported stations, then command that work from the ship's controls. Their gold pay and food are ongoing requirements: the Ship Resources Box and Food Larder provide them aboard ship. Equipped crew can also fight, but their supported personal weapons are bounded; the documented repertoire is not every weapon a player can use. They multiply the stations one human can operate rather than providing an independently motivated society. [Crewmember reference](https://atlas.fandom.com/wiki/Crewmember)

The land-based Crew Resources Silo centralizes provision for crew. Its accepted supplies changed: the original berry-focused arrangement later admitted vegetables and herbs, followed by potatoes and limes. The practical point is to inspect the actual storage and supply rules, not assume every edible object can be deposited in every feeding structure. [Crew Resources Silo, including cited patch changes](https://atlas.fandom.com/wiki/Crew_Resources_Silo)



---

# ATLAS — production, presentation and player creation

**G180 contribution, in progress; evidence captured 20 October 2026 UTC.** This draft contributes R07, R09, native authoring and the conditional R15 external-mod investigation. It does not claim a playtest, mod installation, source-code build or media inspection. The initial checkpoint below is substantive but incomplete: representative mod bodies, authoring/installation and maintenance, presentation/accessibility, and a final coverage/source review are still being researched.

## R09 — Public production evidence and the scale boundary

The public tools establish a specific relationship between the studios. Grapeshot Games' official ServerGridEditor repository credits its initial creation to **Instinct Games**. It describes an early, unfinished C# example for generating ATLAS configuration JSON and publishes it under an MIT license. That source availability concerns the editor; it does not make the ATLAS game, its assets or Unreal Engine generally MIT-licensed. [AP01](#ap01)

The editor's January 2019 official documentation explains the actual grid setup: game-server processes and Redis are connected through exported grid configuration. Each process loads the ocean at a selected grid coordinate; the example includes its own player cap and network settings. Home-server flags and valid island spawn points determine entry. The document also cautions against oversized coordinates because of floating-point precision and distinguishes saving an editable project from exporting its server files. These are documented historical operational requirements, not a reconstruction of the exact 2026 service. [AP02](#ap02)

**Interpretation:** A large world assembled from regions does not imply that its entire advertised population can meet in one battle. Regional admission, travel and persistence are separate problems. A private operator also inherits configuration and recovery work: an attractive map image is insufficient if spawning, neighboring coordinates and the corresponding server processes disagree. The research will preserve announced scale separately from demonstrated capacity, avoiding a claim that every player or creature interacts globally at once.

## Creation tools: separate the world layout from game modifications

The currently accessible Epic listing describes the **ATLAS Dev Kit** as a streamlined Unreal Engine 4 editor for creating features, creatures and maps and reworking the game. It is listed free, names Grapeshot Games as developer and Snail Games USA as publisher, and advertises inclusion of the game's content. Its stated 300 GB disk requirement makes the practical authoring commitment substantial; that store requirement is not a measured current download size. Access to an editor and content is not access to every proprietary runtime source file. [AP03](#ap03)

The division of work is already useful: a server-grid operator arranges the world and its deployment; a Dev Kit creator changes content and game definitions; a player may construct within the native game's rules. The final contribution will trace these distinct paths through representative creations and the documented compatibility limits, rather than calling every custom server a mod or every mod a total conversion.

## Source register — checkpoint

All inspected 20 October 2026 UTC. Further sources and findings will be appended before final delivery.

- <a id="ap01"></a> **AP01 — Grapeshot Games, ServerGridEditor repository.** [Official README and license designation](https://github.com/GrapeshotGames/ServerGridEditor). Substantive README read. Primary tool provenance; the game source and assets are outside this license claim.
- <a id="ap02"></a> **AP02 — Grapeshot Games, ServerGridEditor wiki, edited January 7, 2019.** [Official configuration instructions](https://github.com/GrapeshotGames/ServerGridEditor/wiki). Full substantive instructions read. Historical settings/examples, not a current hosting audit.
- <a id="ap03"></a> **AP03 — Epic Games Store, ATLAS Mod Kit listing.** [Current tool listing](https://store.epicgames.com/p/atlas-mod-kit?lang=en-US). Substantive description and requirements read. Marketing/tool documentation, not proof every old tutorial remains compatible.


---

### Audio and musical interaction: what the written evidence establishes

Before release, Grapeshot used named music to introduce the adventure. Its December 17 and 20, 2018 Captain's Logs linked *Your Journey Begins* and *The High Seas* on the Jeremy Wildcard SoundCloud account alongside descriptions of jungle travel and a Ghost Ship encounter. That establishes an official listening route and music's place in the promotion. It does not establish who composed the tracks, which instruments were recorded, or exactly how those cues trigger during play. The linked audio could not be opened in this research environment, and no listening claim is made. [Official December 2018 announcement archive](https://store.steampowered.com/news/posts/?appids=834910&enddate=1545716193&feed=steam_community_announcements)

Music also has a functional interface inside the game. The February 2019 patch roundup discusses Accordion and War Drum song buffs, gaps in the note-sheet preview, inaccurate looping-buff timers, notes failing near loop boundaries and frame stutters disrupting automatic notes. The same roundup adds a twelve-second gap between character status voice clips. These are historical change records, not measurements of the latest build. **Interpretation:** the examples show two separate design problems: correctly representing a timed action and avoiding repetitive spoken feedback. A soundtrack can support atmosphere while playable music creates actions, rewards and opportunities for interface failure. [Captain's Log 20, 6 February 2019, official patch roundup through v18.46](https://store.steampowered.com/news/posts/?appids=834910&enddate=1555648084&feed=steam_community_announcements)

The written sources obtained do not disclose a verified ATLAS composer credit, recording-session account, complete sound-effects pipeline, dynamic-music implementation, spatial-audio model or accessibility evaluation. An ARK music credit cannot fill those gaps merely because the games share production history. The dossier therefore keeps its audio findings at the level actually supported: official music publication, playable instruments and documented feedback problems. No media assets have been copied into OpenLegend.

## Audio source annotations

All accessed **20 October 2026 UTC**.

- [Grapeshot's official December 2018 Captain's Logs](https://store.steampowered.com/news/posts/?appids=834910&enddate=1545716193&feed=steam_community_announcements): substantive Steam archive body read. The December 17 and 20 entries link the two named tracks. SoundCloud destinations failed; audio was not heard. Prelaunch scene descriptions are promotional accounts.
- [Captain's Log 20, 6 February 2019](https://store.steampowered.com/news/posts/?appids=834910&enddate=1555648084&feed=steam_community_announcements): official Steam syndication, relevant patch text read. Timed-music display/input fixes and voice-feedback spacing; not an independent playback test. Other announcements on the same archive page retain their own dates.


---

# ATLAS — marketing, economics and reception contribution

**G180 substantive checkpoint, 20 October 2026. In progress:** critical reviews and financial evidence below are read; source search, service-status reconciliation, the final revenue treatment, five-review gate and integrated enjoyment analysis remain unfinished. This is a written-source study, not personal gameplay. It distinguishes historical Early Access experience from current operational status.

## R10 — Distribution and the promise of a persistent pirate world

Xbox's September 2019 announcement positioned ATLAS as a large shared world in which players could establish themselves as pirates, with Xbox Game Preview scheduled for 8 October and cross-play with Steam. Its roadmap prioritized quality, performance and later ship/sailing work. Xbox Play Anywhere and additional input support were described as future updates. An announcement of those future capabilities is not proof they subsequently shipped. [Xbox Wire, 24 September 2019](https://news.xbox.com/en-us/2019/09/24/inside-xbox-news-recap-september-2019-2/).

The appeal of this promise is broader than steering an already supplied ship. A player can imagine making a vessel, choosing how it is equipped, securing a home and joining a group that changes the map. That interpretation helps explain both anticipation and the severity of disappointment when preparation, territorial access or technical failure prevent the voyage. The ambition creates several promises that must be assessed separately: a huge world, many connected players, meaningful local encounters, persistent possessions, useful social roles and a dependable service. A headline about scale does not establish the other five.

## R11 — Commercial evidence: a significant impairment, not a disclosed project profit

Snail's November 2022 registration filing contains a more informative product-specific result than an aggregate player count: it recognized a **US$16.325 million impairment of the ATLAS license right during 2021**. The filing attributes that revaluation to delayed launches on several platforms and reduced expected future cash flow, using a 10% discount rate. This is a reduction in an asset's accounting value. It is not ATLAS's development budget, gross receipts, cash loss or lifetime profit. [Snail Form S-1/A, 4 November 2022, PDF page 148, Note 12](https://investor.snail.com/static-files/fee52939-e238-4bfa-b0d8-d8eab4b5343e).

The same filing reports ATLAS revenue **changes**, not absolute totals: a US$2.4 million decline in 2020 versus 2019, a US$1.3 million decline in 2021 versus 2020, and a US$0.2 million decline for the first half of 2022 versus the corresponding 2021 period. These observations support weaker results and expectations relative to earlier periods. They cannot establish total revenue or justify subtracting the impairment from consumer sales to calculate profit. [Same filing, PDF pages 65 and 68](https://investor.snail.com/static-files/fee52939-e238-4bfa-b0d8-d8eab4b5343e).

## R12 — Substantive criticism already read

### The Drastik Measure — review, 12 February 2019

The reviewer describes an appealing variety of exploration, construction, taming and roleplay, alongside substantial technical failures. Particularly consequential reported bugs left the player floating in a terrainless region or removed the ship when crossing a grid boundary. The article values contextual sound but notes that music can interfere with spoken coordination. Its price criticism is partly a judgment about similarity to ARK and existing customers' expectations; it is not evidence that ATLAS was technically just a copied product. This review concerns the February 2019 Early Access build and cannot establish that those exact faults remain in the current client. [Original review](https://www.thedrastikmeasure.com/2019/02/12/atlas-review/).

### Thumb Culture — PC review, early 2019

This first-person account makes onboarding and reliability central. The writer could not finish reading timed instructional text, struggled to discover essential controls and repeatedly encountered freezes or crashes. A disappointing voyage ended with death after returning to a raft without the expected supplies. The reviewer saw the possibility of farming, building an empire and supplying other players, but distinguished that imagined future from a game that was currently dependable enough to recommend. The lack of a confident assessment of the full underlying design is itself disclosed in the article; its title does not turn limited progress into an exhaustive endgame test. [Original review](https://www.thumbculture.co.uk/atlas-review-yo-ho-ho-and-a-barrel-of-rum).

### Opium Pulses — review, 24 May 2019

This mixed but hopeful review identifies building a ship from individual pieces as its favorite activity: accumulated gathering becomes a visible structure, then a vessel the player can color and sail. The writer also enjoyed skill branches and naval fighting, while finding repeated acquisition of the same materials boring and some taming incongruous with the pirate premise. The recommendation is explicitly conditional on tolerance for bugs and faith in future improvement. It is evidence of actual present pleasures plus optimism, not evidence that the hoped-for future arrived. Its approximate world-size calculations and historical server descriptions are not used as current mechanical authority. [Original review](https://www.opiumpulses.com/article/301/atlas-review).

### PCWorld — substantive review impressions, 4 January 2019

Leif Johnson's long firsthand account follows a small crew through resource scarcity, shipbuilding, a long voyage, loss and another attempt. He finds constructing and preparing a ship genuinely exciting, but describes deprivation, occupied land and technical or balance failures making the trip punishing. The group stayed up because logging out felt dangerous; later a collection-rate boost made rebuilding tolerable enough to renew anticipation. His account distinguishes enjoyable construction from the circumstances that make losing it intolerable. It also recognizes that starting in a richer region could have changed his judgment. The article is labeled review impressions/feature, and is retained as substantive criticism rather than relabeled a scored final review. [Original PCWorld account](https://www.pcworld.com/article/403099/atlas-review-impressions.html).

### GamesRadar+ — Xbox hands-on preview, 20 November 2019

Mark Delaney approached ATLAS after extensive Sea of Thieves play. He found its customization and persistent-world possibility attractive, but menus and controls difficult enough that early sessions became time spent watching guides. Frame-rate drops, delayed menus and problems joining crews undermined the intended cooperative experience. He distinguished deeper construction and character specialization from Sea of Thieves' approach, rather than treating the games as interchangeable. His eventual judgment was to wait for better onboarding and performance. This is an explicitly labeled hands-on preview of the Xbox Game Preview product, not a fifth full-release verdict. [Original GamesRadar+ preview](https://www.gamesradar.com/atlas-preview-can-grapeshot-games-pirate-mmo-dethrone-sea-of-thieves-for-swashbuckler-supremacy/).

## Source and completion limits at this checkpoint

All sources were accessed 20 October 2026. The three original reviews and two substantial firsthand impressions above were read in their source bodies. IGN and Rock Paper Shotgun review pages are identified but currently blocked by the retrieval service; neither is counted as read from a score or snippet. The Snail source is a primary financial filing, with the relevant explanatory text read rather than inferring ATLAS results from company totals. Exact review metadata, financial scope, current helpful player testimony and operational history are still being reconciled before completion.

