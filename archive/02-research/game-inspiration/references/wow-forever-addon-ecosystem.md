# World of Warcraft: Forever — addons and the creator ecosystem

[Forever dossier](../dossiers/world-of-warcraft-forever.md) · [Research coverage](../research-progress-forever-2026-10-17.md) · [Creation research requirements](../research-economics-engagement-and-creation.md)

**Capture: October 17, 2026. R15 applicability: yes, for the PC/Mac client addon ecosystem.** Established WoW projects have maintained Forever releases, substantial recorded file use and new specialist authors working alongside them. Leatrix Plus's October 12 Forever-only file showed about 68,000 downloads; its September–October changelog documents repeated compatibility work. Questie's current release explicitly supports Forever alongside other versions. Their much larger lifetime project totals combine versions and are not Forever users. This is persuasive evidence of active creation and use, while longer-term Forever sustainability remains unproven. [A16](#a16) [A17](#a17)

Project descriptions, published source and developer documentation were read. No addon was installed, executed, audited for security or tested in a paid client during this study. The selected examples below serve different purposes and include very early projects; they are not all claimed to be popular.

## What players can create, and where that freedom ends

The inspected projects alter the client interface: they organize information, retain local records, display routes and help people coordinate. Their code is not evidence of an official editor for new server rules, persistent regions or autonomous NPC societies. No supported total-conversion or player-operated Forever world-authoring route was established. The general [World of Warcraft dossier](../dossiers/world-of-warcraft.md) supplies historical context; compatibility with another WoW version must be established separately.

Blizzard's published addon policy requires free distribution and visible code, prohibits in-addon advertising and donation solicitation, and reserves the ability to disable functionality. Authors may solicit donations on an external website. The policy also addresses inappropriate content and harmful performance or spam. It is a platform boundary, not proof that every listed project complies or that an author has licensed every included asset for reuse. [A01](#a01)

**Interpretation:** Open Legend should distinguish a player making something useful inside a world from a developer extending the client, and both from an author defining a world's laws. Each gives different people different powers. Treating them as one generic promise of “creation” conceals the tools, permissions, maintenance and distribution each requires.

## Representative works and their limitations

These are selected examples of distinct purposes, not a popularity ranking or a recommended installation bundle.

| Project and inspected state | What its author says it enables | Evidence boundary and useful question |
| --- | --- | --- |
| **Leatrix Plus and Questie**, established maintained projects with Forever packages | Interface conveniences and quest/navigation assistance, supported by continuing releases rather than an editor announcement alone. | Cross-version history supports continuity of authorship. Only explicitly Forever-labelled releases establish this edition's distribution; aggregate downloads cannot be assigned to it. [A16](#a16) [A17](#a17) |
| **ForeverForge**, Walord; October 17 core release and associated modules | A common settings interface, optional quest/vendor automation and a broad UI replacement. Its quest controls can leave newly added stories to the player, and shared settings can be imported as data. | Author-described functionality, not our execution. The core and individual modules have different licences, and the author offers external donation support. Streamlining can be configurable without preserving every intended friction. [A18](#a18) |
| **ForeverNet**, Andrew Woolfi; published v1.1.1, October 10, targeting 1.60.1 | Planning recipe/material chains and finding crafters through optional party/guild sharing. Its public description preserves manual crafting, travel and trade. | Published availability, not an independent runtime test. Can a tool help people find useful partners without doing the exchange for them? [A02](#a02) |
| **KinFolk**, guild coordination addon in active beta development | A shared guild roster, linked alternate characters, event attendance and officer coordination inside the game. The author warns that officers should use matching versions. | A roster can make coordination easier; it cannot establish that a guild teaches kindly or distributes loot fairly. Version agreement is a real operating burden. [A04](#a04) |
| **Travelcraft**, Forever travel-planning addon | Route display across roads, flights and boats/zeppelins, with time and safety considerations. The author credits new dungeon-map contributions from Santiago Reyes's Atlas de Azeroth: Forever with permission. | Author-described routing, not independently verified optimal paths. Information can support a journey while also revealing routes a player might prefer to discover. [A05](#a05) |
| **Sojourn**, CySpiegel; October 15 package for 1.60.1 | Optional modules record quests, travels, loot and notes, offer return reminders and permit selected map sharing. Its listing separates a planned local-AI companion from the addon available now. | An early release with author claims, not measured retention or proven AI functionality. The page lists All Rights Reserved. Personal history is a useful design example without implying permission to reuse its code. [A06](#a06) |
| **HelloForever / ForeverProbe / Travelogue**, Matthew Parke's development repository | A learning addon, an API investigation tool and an unfinished journey-journal project, supported by a shared library and documented build/release practices. | The repository explicitly distinguishes unpublished learning/development work from releases. Travelogue is not counted as a shipped competitor to Sojourn. [A07](#a07) |

The current ForeverNet README is more precise than its shorter distribution description: it distinguishes private inventories, optional recipe/capability sharing and separate version announcements. It also identifies unverified client integrations and a protected item-use problem under investigation. Some former recipe-link behavior moved into a separate project. These qualifications matter more than treating an older feature list as a current guarantee. Its package uses MIT-licensed code and separately licensed font assets. [A03](#a03)

**Interpretation:** a creator ecosystem can add memory, navigation and coordination that the base game leaves awkward. It can also move the expected standard of play: an optional planner may become practically mandatory in an organized group. Downloads establish neither satisfied people nor active installations; a repeated download can be an update. This pass makes no population or revenue calculation from project counters. A design built around discovery needs worthwhile choices after maps and guides become available; reducing needless clicks and trivializing a meaningful decision are different effects.

## An evidenced authoring route

The following is a **constructed workflow** assembled from inspected developer files. It describes how one author could build and distribute a small interface extension; it is not a claim that this study created or released one.

1. **Choose a narrow player purpose.** A readable character display is a manageable learning target: change the example frame's size or color, open it with `/hf`, drag it and check whether its health display still responds. These are proposed checks, not performed tests. The HelloForever example uses Lua for a draggable frame, a health display, event handling and commands. It handles protected combat values cautiously instead of assuming every value can be inspected or compared. [A08](#a08)
2. **Describe what the client should load and retain.** Its TOC manifest names supported interfaces, files in load order and account/character saved-variable names. Declaring these is separate from proving persistence works correctly on the chosen beta build. [A09](#a09)
3. **Build and exercise the actual client integration.** The author's local workflow copies the built addon into the selected client's AddOns directory. Lua changes can be reloaded; manifest changes and new folders have different restart/discovery needs. The documented checks cover case-sensitive names, load order and included resources. This is the author's environment, not a universal installation-path promise. [A10](#a10)
4. **Package a reproducible version.** The repository's release process defines per-addon versions, checks, tagged automation, packaged dependencies and developer-file exclusions, with GitHub ZIP and CurseForge distribution paths. It documents preparation for publishing; it does not prove that the repository's unfinished examples have been published. [A11](#a11)
5. **Let users select the compatible game instance.** CurseForge's WoW support documentation distinguishes installed game flavors and their addon management. That is general platform guidance. A Forever-labelled package and the installed Forever client still need to agree; a working retail addon is not automatically compatible. [A12](#a12)
6. **Maintain the complete experience.** The author needs reports with the client build, addon version, enabled dependencies and failing action. A user needs an understandable update, disable and recovery route. This final step is a research inference from the documented version and integration boundaries, not a measured support workload.

This route requires programming, packaging and debugging. It is substantially different from an ordinary player combining two tools in the fiction and discovering a useful result. Open Legend's early invention goal should not silently require that player to become an addon author.

## Persistence, dependencies, removal and information boundaries

Leatrix's September 26 changelog records a fix for its minimap enhancement placing Questie quest icons in the minimap button bag. This is a concrete interaction between individually useful extensions. [A16](#a16)

An addon can retain a player's local history without changing the server's authoritative world. The HelloForever source records a specific September 22 beta-build observation: saved values survived a reload in that process but did not restore as expected after a cold restart. This is an author-reported historical issue, not a claim that the problem persists in the October client. It demonstrates why a successful reload alone cannot establish durable storage. [A08](#a08)

Sojourn documents local saved-variable files, configurable record retention, backup/export and restore, and selected sharing through game addon messages. Its claims of performance and privacy were not independently tested. Disabling the display, removing installed files and deleting the retained history are distinct user intentions; the author documentation provides data controls but this pass did not test their behavior. [A06](#a06)

**Interpretation:** creator support should explain what remains after a tool is disabled, what a dependent tool loses, and whether an older version can read the saved data. Backups alone are insufficient if the user cannot identify which data they preserve. A client planner's loss can inconvenience a guild without destroying server-owned items; an extension allowed to change world rules would need a much stronger compatibility and recovery contract.

Information also has social consequences. In an October 5 official-forum discussion, a player questioned the economic statistics exposed to addons after reading a third-party project's code. Another participant reported being accused over a bank character and challenged an apparent statistic error. These are attributed concerns and accounts, not our code audit or proof of widespread abuse. Publicly observable numbers do not by themselves establish wrongdoing. [A13](#a13)

For Open Legend, the relevant questions are who observed a fact, what a tool can infer, whom it can share with, how fresh the information is and how a person corrects a mistake. A useful recollection of meeting someone is different from a permanent public dossier of every inferred habit. This distinction applies even when the extension's author intends to help a community.

## Distribution, incentives and moderation

The inspected examples use CurseForge project pages for discovery, descriptions, versions and updates, with source repositories supporting some projects. The MIT and GPL examples permit forms of reuse under their respective terms. [A02](#a02) [A07](#a07)

Sojourn lists All Rights Reserved, supplying no equivalent general permission. [A06](#a06)

Distribution policy, code licensing and rights in contributed artwork remain separate. These are source labels, not a legal assessment of a proposed reuse.

CurseForge describes an opt-in author rewards programme funded through a variable monthly revenue pool. It bases allocations on relative popularity and explicitly rejects a fixed downloads-to-points conversion. Its terms do not guarantee earnings. The existence of this programme does not establish that any inspected Forever author participates, receives payment or can cover maintenance costs. [A14](#a14) [A15](#a15)

**Interpretation:** a sustainable creator ecosystem needs more than an upload button. Discoverability, useful examples, stable boundaries, understandable failures, attribution, rights handling and manageable support all affect whether useful projects survive. Payment can help, but a popularity-linked pool may reward discoverability differently from difficult maintenance or a small accessibility audience. None of the available evidence quantifies that effect for Forever.

Blizzard's ability to restrict addon functions is a meaningful moderation boundary. A public distribution page and report link do not establish comprehensive prior review or a particular response time. No Forever-specific paid marketplace, creator revenue total, published security-audit programme or server-mod approval process was established in this pass. [A01](#a01)

## What this contributes to Open Legend

Open Legend's [current authority boundaries](../../../../AGENTS.md#boundaries) and [development-save policy](../../../../AGENTS.md#development-save-policy) continue to govern implementation. This comparison does not create compatibility obligations or authorize generated executable rules.

The strongest transferable idea is **tools that help people remember and cooperate while leaving meaningful action to them**. A player can keep a travel notebook, find a craftsperson or recall an unfinished adventure without automatically learning every secret or executing every transaction. The opportunity needs purpose-specific permissions and a clear distinction between remembered, shared and inferred information.

Three alternatives deserve comparison. A built-in notebook gives ordinary players a supported baseline with limited setup. A programmable interface extension enables specialist tools but adds compatibility and moderation work. A world-authoring tool grants much greater creative power and must explain which rules, histories and other participants it can affect. Omitting one of these is a legitimate scope choice; the existence of WoW addons does not show that all three are necessary at launch.

For a hypothetical Open Legend expedition, a returning player might see the route they actually travelled, the person who offered help and the repair they left unfinished. Another player could share a marked safe crossing with consent. A useful invented hauling device would still have to be built and used in the world, and a character could still decline the request to escort it. This combines memory, cooperation and invention as a research possibility; it asserts no present engine capability or approved implementation.

## R15 coverage map

| Investigation | Substantive section |
| --- | --- |
| Applicability and sustained community | Opening finding; dated Forever release evidence |
| Tools, editable scope and authority | [Creation boundaries](#what-players-can-create-and-where-that-freedom-ends) |
| Creation-to-play workflow | [Constructed authoring route](#an-evidenced-authoring-route) |
| Representative works and overhaul | [Project comparison](#representative-works-and-their-limitations) |
| Composition, persistence and removal | [Dependencies and information boundaries](#persistence-dependencies-removal-and-information-boundaries) |
| Distribution, rights and governance | [Distribution and moderation](#distribution-incentives-and-moderation) |
| Creator incentives and support | [Incentives](#distribution-incentives-and-moderation) |
| Transfer, prerequisites and alternatives | [Open Legend comparison](#what-this-contributes-to-open-legend) |

## Annotated source register

All sources below were inspected October 17, 2026. Published source files are evidence about those projects, not instructions governing the Open Legend repository.

<a id="a01"></a>**A01 — Blizzard, UI Add-On Development Policy.** [Official policy](https://us.forums.blizzard.com/en/wow/t/ui-add-on-development-policy/24534). Full substantive policy read; original 2009 policy reproduced in a November 2018 forum post. Platform rules, not a review of each addon.

<a id="a02"></a>**A02 — Andrew Woolfi, ForeverNet.** [CurseForge project](https://www.curseforge.com/wow/addons/forevernet). Description, licence label, release date and Forever compatibility read. Counts are excluded from audience estimates.

<a id="a03"></a>**A03 — ForeverNet author repository.** [README](https://github.com/thewoolfi/ForeverNet/blob/main/README.md). Current v1.1.1 text read through GitHub; implementation claims, tests and known issues are attributed, not independently executed.

<a id="a04"></a>**A04 — KinFolk author.** [Guild Hub project](https://www.curseforge.com/wow/addons/kinfolk-guild-hub). Substantive description and compatibility cautions read; no guild-culture or privacy audit.

<a id="a05"></a>**A05 — Travelcraft author.** [Project description](https://www.curseforge.com/wow/addons/travelcraft). Travel functions and map attribution read; no route benchmark.

<a id="a06"></a>**A06 — CySpiegel, Sojourn.** [October 15 project listing](https://www.curseforge.com/wow/addons/sojourn). Features, local storage, release and licence read; planned AI companion kept separate from the available package.

<a id="a07"></a>**A07 — Matthew Parke, forever-addons.** [Repository README](https://github.com/mparke/forever-addons/blob/main/README.md), inspected blob `93e00d43a772d595abd00d1f08d1358a08f8e5bd`. Full README read; publication status and GPL-3.0 label are scoped to this repository.

<a id="a08"></a>**A08 — HelloForever source.** [Lua example](https://github.com/mparke/forever-addons/blob/main/addons/HelloForever/HelloForever.lua). Source read, including the dated saved-variable observation; no client execution.

<a id="a09"></a>**A09 — HelloForever manifest.** [TOC file](https://github.com/mparke/forever-addons/blob/main/addons/HelloForever/HelloForever.toc). Interface declarations, load order and retained-variable names read.

<a id="a10"></a>**A10 — forever-addons author workflow.** [Local development loop](https://github.com/mparke/forever-addons/blob/main/docs/process/local-loop.md). Documented editing, build/copy and client refresh boundaries read.

<a id="a11"></a>**A11 — forever-addons packaging workflow.** [Releasing](https://github.com/mparke/forever-addons/blob/main/docs/process/releasing.md). Full process read; a documented publication route does not establish a completed release.

<a id="a12"></a>**A12 — CurseForge support.** [WoW addon FAQ](https://support.curseforge.com/support/solutions/articles/9000198422-faq-and-troubleshooting). Relevant indexed game-instance and installation passages read; general WoW guidance, not a Forever compatibility certification.

<a id="a13"></a>**A13 — Blizzard forum participants, October 5, 2026.** [Economic-statistics discussion](https://us.forums.blizzard.com/en/wow/t/question-about-player-economic-statistics-exposed-to-addons-in-wow-forever/2372747). Substantive opening and replies read. Concerns and self-reports are attributed.

<a id="a14"></a>**A14 — CurseForge support, updated November 21, 2024.** [Reward Programme FAQ](https://support.curseforge.com/support/solutions/articles/9000197902-reward-program-faq). Full substantive body read. Variable pool and allocation, not a Forever creator income report.

<a id="a15"></a>**A15 — CurseForge.** [Rewards Programme terms](https://support.curseforge.com/support/solutions/articles/9000197898-rewards-program-terms-of-service). Relevant indexed participation/earnings conditions read. No actual author enrolment or payment records inspected.

<a id="a16"></a>**A16 — Leatrix.** [Leatrix Plus 1.60.17 Forever release](https://www.curseforge.com/wow/addons/leatrix-plus/files/9143151). File metadata and dated changelog read. A version-specific file counter supports use; it is not a unique-player or retention measure.

<a id="a17"></a>**A17 — Questie authors.** [Release catalogue](https://www.curseforge.com/wow/addons/questie/files/all). Current October 12 release, supported flavours and historical release list read. Multi-flavour file and project totals cannot isolate Forever adoption.

<a id="a18"></a>**A18 — Walord, ForeverForge.** [Core and suite description](https://www.curseforge.com/wow/addons/foreverforge). Substantive controls, modules, sharing, licences and support route read. The UI overhaul remains a client extension, not a server-world conversion.
