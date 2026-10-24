# Elden Ring — multiplayer, community creation and modding

[Dossier](../elden-ring.md) · [Reception and commercial context](03-reception-commercial-and-cultural-impact.md)

Evidence cutoff: **October 24, 2026**. Native Elden Ring, its expansion, community PC modifications and the separate Nightreign game are different products and rule sets. This chapter concerns the first three. It documents creator workflows from their authors' instructions; **no mod was installed, executed or independently compatibility-tested for this research**.

## 1. Three different meanings of playing together

Elden Ring lets other people affect a mostly solitary adventure at several levels. A player can encounter traces of strangers, temporarily invite combat assistance, compete under invasion rules, or deliberately enter an arena. The same term, “multiplayer,” conceals very different commitments and expectations.

| Layer | Documented native behavior | Design implication — our interpretation |
| --- | --- | --- |
| Asynchronous presence | Player messages combine templates, words and conjunctions; players can inspect and rate messages. Group passwords prioritize and distinguish matching messages, signs and apparitions. [M20](#m20) | Strangers supply advice, jokes and companionship without agreeing on a session time. Restricted vocabulary becomes part of the game's voice. |
| Temporary co-op | A host can summon up to two allies; summoned allies have reduced flask allocations. Death, dismissal, connection loss or a relevant boss victory can end participation. Torrent and fast travel are unavailable while cooperating. [M01](#m01) | Assistance is organized around overcoming a problem. Players expecting an uninterrupted shared campaign face repeated coordination costs. |
| Invasion and rescue | Co-op generally opens a host to invaders; Taunter's Tongue enables additional invitation behavior. Blue/White Cipher Rings connect defenders with invaded hosts. Ordinary sessions have a four-player limit. [M01](#m01) | Help and danger are coupled. A temporary social advantage also changes the encounter ecology. |
| Deliberate arena competition | Colosseum modes include duels, team combat and free-for-all combat; some configurations support six players. [M02](#m02) | Players can seek a contest without also progressing a host's level or hunting through the world. |

Bloodstains communicate a previous player's fatal movement; passing apparitions supply a glimpse of another journey. They do not provide the complete enemy state or a guaranteed solution. A firsthand co-op guide also documents that a guest's assistance does **not** clear that boss in the guest's own campaign. This distinction matters when two friends intend to complete an adventure together rather than exchange help. [M22](#m22)

### What the restrictions accomplish, and what they cost

Our interpretation is that temporary summoning preserves individual ownership of an adventure. A successful visitor contributes to someone else's turning point, receives a bounded role and then leaves. The host still has a private world to explore. The arrangement can turn expertise into generosity: a difficult boss becomes a repeatable opportunity to help strangers, even after one's own story has ended.

The cost is discontinuity. A party must distinguish joining a friend, revealing summon signs, using a summoning pool, setting passwords and advancing separate worlds. That is several concepts before the desired activity begins. No conclusion about artistic intent erases this interaction cost. A player who says “I want to explore with my friend” may have a different goal from the session structure the game offers.

A multiplayer password narrows eligible summon signs; it does **not** prevent random invasions during eligible co-op. Group passwords affect the presentation and priority of shared community traces. These two settings should not be described as interchangeable private-server controls. The original Japanese manual supports this distinction. [M20](#m20) [M01](#m01)

Platform boundaries also matter. FromSoftware's FAQ permits PS4/PS5 play together and Xbox One/Series play together, with Steam matching Steam. Switch 2 matches other Switch 2 users; cross-manufacturer play is unavailable. The FAQ separately distinguishes ordinary four-player sessions from six-player Colosseum competition. [M21](#m21)

The precise current level/weapon-upgrade matching formulas, downscaling edge cases and latency model were **not independently reproduced** here. We do not substitute a password for a guarantee that every character, area and connection will be eligible. Nor do we claim a particular tick rate, rollback system or measured connection quality from general complaints about online combat.

### Multiplayer changed after launch

Patch **1.06**, August 2022, expanded the reach of summoning and invasion searches to distant areas and added an NPC alternative to the invasion-dependent portion of Varré's quest. These changes reduce population-fragmentation and access problems without converting the campaign into persistent co-op. The same notes warn about unauthorized items passed between players; online item exchange is not an unrestricted safe import mechanism. [M03](#m03)

Patch **1.07**, October 2022, introduced separate PvP damage scaling for weapons, skills, spells and incantations. The official notes explicitly distinguish these adjustments from those affecting solo and cooperative play. This is an unusually useful architectural lesson: one equipment vocabulary can serve different social contexts without forcing every balance change onto every audience. It does not mean that PvP and PvE share no other rules or that either is perfectly balanced. [M04](#m04)

The December 2022 Colosseum update made the modes more explicit. Leyndell supports one-on-one duels without Crimson or Physick healing; Limgrave provides team and free-for-all competition with respawns; Caelid offers configurations allowing spirit ashes. Arena-specific flask and item rules prevent the campaign's entire recovery economy from automatically becoming the competitive ruleset. Arena passwords support organized matches. [M02](#m02)

For Open Legend, the research question is not simply whether to add co-op or PvP. It is which relationship the game promises: passing solidarity, short rescue, a continuous shared expedition, an adversarial interruption, or a fair scheduled contest. These require different progression ownership, recovery, matchmaking, consent and communication designs. Elden Ring's mod ecosystem makes that distinction particularly visible.

## 2. R15 modding depth screen: **YES**

The substantial-ecosystem gate is met. Nexus displayed approximately **7.9 thousand Elden Ring mods** at the research cutoff, alongside collections and media. This is a rounded catalog count, not a count of active creators, unique players or compatible current releases. More persuasive than the headline count is the diversity and continued maintenance of independent creation projects and infrastructure. [M05](#m05)

| Evidence type | Concrete example | Why it qualifies |
| --- | --- | --- |
| A different social product | Yui's **Seamless Co-op** | Changes campaign continuity and progression sharing, not just appearance. [M06](#m06) |
| Systematic replay transformation | thefifthmatt's **Item and Enemy Randomizer** | Generates alternative placements and progression searches from existing content. [M14](#m14) [M15](#m15) |
| Alternative combat philosophy | **Reforged**, by Kirnifr and team | Reworks combat balance, hitboxes, camera behavior and related systems. [M16](#m16) |
| Alternative authored campaign | **The Convergence** | Adds class routes, equipment, spells, bosses and changed dungeons. [M17](#m17) |
| Reusable production tools | Smithbox, me3, WitchyBND | Make structured edits and loading possible beyond one bespoke project. [M07](#m07) [M09](#m09) [M12](#m12) |

This is a community PC creation ecosystem around a proprietary game. The sources demonstrate community tools and reverse-engineered formats; they do **not** demonstrate a first-party Elden Ring construction kit, an integrated console mod marketplace or an official guarantee that arbitrary modifications are supported. Native messages and equipment combinations are forms of expression, but they are not equivalent to uploading new levels or code.

## 3. What players are actually creating

### Seamless Co-op: continuity becomes the feature

Yui's current description permits a party of six in the open world, keeps players together after death and boss victories, permits Torrent, synchronizes progression and dialogue, and removes ordinary multiplayer area barriers. It also introduces balancing choices, including configurable scaling and death consequences. These are **mod features**, not native campaign features. The author labels the software beta and explicitly rejects a guarantee of compatibility with every other mod. [M06](#m06)

The author's GitHub release mirror identifies version **2.0.1** and an update for game version 1.17. This is evidence of maintenance, not proof that every later executable or regulation revision is compatible. Release notes also record networking fixes and anti-cheating work: persistent social play creates its own engineering obligations. [M19](#m19)

Our interpretation: the mod is valuable design evidence because its central promise is understandable in one sentence — keep adventuring together. It identifies a coherent unmet use case. That does not establish that native temporary summoning was mistaken for every audience, or that all six-player encounters preserve the original combat balance. Removing session barriers changes pacing, travel, recovery and threat distribution simultaneously. A social redesign cannot be evaluated solely by whether it launches.

### Randomizer: renew uncertainty without rebuilding every asset

The Item and Enemy Randomizer changes world and shop items, enemy drops, starting equipment and many enemy placements. Optional key-item rules alter how the player must search for progression. Its author supplies configurable categories, seeds, reproducible options and spoiler logs. The generator writes a coordinated collection of event, map, message, script, effect and regulation files; copying only one output file can break the run. [M14](#m14) [M15](#m15)

Our interpretation: this recycles *knowledge*, not merely assets. A veteran's memorized route loses reliability, while recognition of an enemy's attacks or a weapon's role remains useful. It asks the player to improvise again. A shareable seed can turn an individual remix into a challenge between friends or a creator-led event. It also exposes a hard constraint on procedural remixing: novelty must preserve reachable progression and workable encounter spaces. A surprising arrangement that prevents completion is not a richer campaign.

### Reforged: critique expressed as a playable alternative

Reforged's author describes a goal of fair, interesting combat rather than a single “harder” or “easier” direction. The documented scope includes enemies, bosses, hitboxes, animation, equipment and camera parameters. The current page shows version **2.3.7.1**, updated October 20, 2026. Its launcher documents separate `.err` saves, automatic backups and a dedicated troubleshooting path. [M16](#m16)

Our interpretation: a balance overhaul is a strong form of criticism because it must make its preferences interact. A camera adjustment, a shorter recovery window and a changed reward cannot be treated as isolated votes. They create a new combat contract. The existence of an alternative is not proof that its balance is superior, but it is more informative for design research than counting complaints without examining the proposed solution.

### The Convergence: reinterpret the progression architecture

The current Convergence description requires Shadow of the Erdtree and presents **27 classes**, distinct starts and progression paths, boss resurrection, crafting for talismans and Physick tears, a teleportation network tied to local Erdtree bosses, and redesigned dungeons. Its site links maintained documentation and community support. These are the authors' stated features; they were not independently played for this study. [M17](#m17) [M18](#m18)

Our interpretation: it treats the base world as a substrate for a more directed identity. A class is no longer only an opening bundle; its route helps structure a campaign. The interesting question for Open Legend is whether strong identity can coexist with flexible experimentation. Copying a count of classes would teach little. Studying how each route establishes a promise, supplies tools and avoids invalidating other routes could teach much more.

## 4. The actual creation stack

| Layer | Current author-documented role | Boundary |
| --- | --- | --- |
| **Smithbox** | Community editor for maps, models, parameters, text, graphics parameters, materials and related assets; forked from DSMapStudio. Its current README says whole-game unpacking is unnecessary for its editors. [M07](#m07) | A structured editor is not a turnkey game engine or a guarantee that each field's consequences are understood. |
| **WitchyBND** | Unpacks, repacks and serializes supported FromSoftware file formats. Its file-oriented workflow uses extracted assets and other community tooling. [M12](#m12) | File conversion exposes data; it does not automatically author valid behavior, art or progression. |
| **Mod Engine 2** | Earlier runtime patching/loading infrastructure. Upstream explicitly discontinues development and directs future work to me3. [M08](#m08) | Older mod-specific instructions may still bundle it. “Use the newest loader” is not sufficient to override those requirements. |
| **me3** | Current framework supporting Elden Ring and other FromSoftware games on supported PC environments. [M09](#m09) | Support for a game does not establish compatibility among every native extension. |
| **me3 profiles** | Versioned configuration lists asset packages, native DLLs and loading choices. Packages can be managed separately. [M10](#m10) [M11](#m11) | A file override order is not a semantic merge of two changes to the same file. |

Smithbox's release notes document regulation merging, delta merging, project merging with limited internal conflict handling, parameter version upgrades and timestamped backups. This is important current evidence: the ecosystem has progressed beyond telling every player to manually splice large tables. It still does not establish that two incompatible combat overhauls can be made coherent by pressing Merge. [M13](#m13)

The distinction is between **mechanical compatibility** and **design compatibility**. A merge tool may preserve both rows. It cannot decide whether two mods assign incompatible meanings to an item identifier, whether a spell assumes a removed event, or whether a difficulty curve still makes sense. That latter work belongs to a creator or integration maintainer.

## 5. A concrete creation-to-play workflow

This is a **documented workflow reconstruction**, not a claim that we performed these steps. The example is deliberately small: an author changes one weapon's intended role, updates its text and packages the result for an offline test. It shows the dependency chain a novice must learn before attempting an overhaul.

1. **Define the change and its version boundary.** Record the installed game's application/regulation versions, the target audience and the intended effect. “More interesting” is not a testable change; “a slower, higher-commitment alternative with a clearly described tradeoff” is. Keep an unmodified baseline and an independent save backup. This is our proposed authoring discipline, not an Elden Ring-specific editor command.
2. **Create an isolated editor project.** Use Smithbox's parameter and text tools to inspect the relevant existing data and make the smallest coordinated change. Its supported editors and unpacking behavior are documented by the maintainer. Do not assume an old tutorial's extraction requirement still applies to this tool. [M07](#m07)
3. **Package overrides as a separate mod.** me3's guide separates asset replacements from native DLL extensions and supports individually referenced folders. A profile records what should load. A data edit does not require inventing a new native-code component. [M10](#m10)
4. **Choose an isolated launch and save arrangement.** me3 documents a configurable save filename and normally blocks official matchmaking connections. The save option retains the normal save directory and may initialize a renamed copy. This is useful separation, but it does not replace an independent backup. [M11](#m11)
5. **Test the behavior, not just successful startup.** Our suggested check is to inspect the item text, equip and remove the weapon, perform its relevant moves, spend/recover resources, save/reload, and test the intended early and late encounters. If a change affects multiplayer, use the mod's supported private arrangement and test all participating roles. Do not describe this list as testing already completed.
6. **Resolve conflicts explicitly.** Compare against the target baseline, inspect overlapping changes and use the editor's merge/delta facilities where appropriate. Maintain a short compatibility statement explaining what was actually combined and tested. Smithbox supplies integration tools; it does not certify the resulting game design. [M13](#m13)
7. **Publish a reproducible package.** Include the supported game/mod versions, requirements, installation and removal steps, intended behavior, known conflicts, credits and permissions. Provide enough information to reconstruct a bug. This is our recommended publication standard, inferred from the failures and support surfaces in the examined projects.
8. **Play through the appropriate entry point.** A player chooses the maintained release, reads its requirements, keeps the baseline and saves separate, loads the declared profile or project-specific launcher, and checks the change before committing a long campaign. A randomizer additionally needs matching seed/options and complete generated files; its author documents export/import and warns against piecemeal copying. [M15](#m15)

For a novice, the first barrier is conceptual: game files, project files, generated outputs, loader profiles and character saves are different things. For an expert, the barrier moves to interactions, version migration, naming collisions, event state and user support. A polished installer can reduce the first burden while leaving the second almost untouched.

## 6. Reliability, safety, rights and incentives

### Version changes are part of the product

The examined projects are maintained over time, but their release dates and compatibility declarations do not move in lockstep. For example, Seamless's mirror names a 1.17 update, while Smithbox's release notes mention a regulation upgrader for 1.17.1. Neither statement independently certifies all combinations against subsequent patches. [M19](#m19) [M13](#m13)

Our interpretation is that an extensible game accumulates a second support surface: the ecosystem's ability to survive changes. Versioned data schemas, change logs, stable identifiers and migration tooling can become design infrastructure. When these are absent, creators spend effort reconstructing compatibility instead of making new experiences. We should study that cost before treating community output as free content.

### Separate saves and online boundaries

Seamless's author documents use of separate `.co2` saves and avoidance of the official matchmaking environment, and warns against converting modded data back into the native save path. This is the author's risk-reduction design, not our promise of immunity from penalties. Reforged similarly documents a separate save extension and recovery backups. [M06](#m06) [M16](#m16)

The general security boundary is straightforward: a DLL is executable code, and a launcher is software the player chooses to trust. A reputable host's scan label does not prove arbitrary future releases harmless. A research dossier should link the creator's release channel and explain the role of the component, without telling users to suppress warnings or mix unreviewed packages. No security audit of these projects was performed.

### “Free to download” does not mean “free to republish”

Licenses differ by layer. me3 identifies Apache/MIT licensing for its code with a logo exception; WitchyBND identifies GPLv3. Those tool licenses do not transfer ownership of Elden Ring's art, music or code, and they do not determine another mod author's asset permissions. [M09](#m09) [M12](#m12)

The Randomizer's Nexus page restricts redistribution and asset reuse while its author makes the mod available without a mandatory price. Convergence and Seamless link optional patronage; Reforged names support channels for its developers. Those are documented incentives and permissions, not evidence of how much money creators earn or whether donations cover production costs. [M14](#m14) [M18](#m18) [M06](#m06) [M16](#m16)

A community's output also relies on unpaid work beyond the headline author: translators, testers, documentation contributors, compatibility maintainers and people answering questions. Randomizer explicitly requests translation help; Convergence's site solicits documentation participation. The sustainable unit is therefore a network of contributions, not a single download counter. [M15](#m15) [M18](#m18)

## 7. What Open Legend can learn, and what remains unproven

These are research hypotheses, not adopted product requirements.

| Candidate lesson | Evidence making it worth investigating | What we would need to prove locally |
| --- | --- | --- |
| Make social intent explicit | Temporary native aid and persistent Seamless play serve different goals | Which experience our players actually want; how shared progression and disagreement work |
| Preserve a small, expressive shared vocabulary | Native messages create social presence with little session coordination | Whether our setting and moderation needs support similarly useful ambiguity |
| Give replay creators access to stable rules | Randomizer renews discovery while retaining learned combat knowledge | Reachability, encounter validity and challenge quality under recombination |
| Treat mod integration as a user journey | Profiles, backups, separate saves and merge tools recur across projects | Time to first successful edit; failure recovery; compatibility burden |
| Separate balance contexts where necessary | Native PvP damage scaling avoids some PvE tradeoffs | Whether distinct contexts justify the extra design, QA and explanation cost |
| Support creators with contracts and diagnostics | Current projects need version declarations, permissions and support channels | A feasible maintained interface and a clear rights model |

We cannot conclude from these sources that modding caused Elden Ring's sales, that most players use mods, that any overhaul is better than the original, or that supporting every modification would be cheap. The defensible conclusion is narrower and more useful: **players have built substantial alternative answers to continuity, replayability, balance and progression, and a reusable technical ecosystem exists to deliver them**. The innovations are in those complete answers and their support requirements, not merely in the number of downloadable files.

## Sources and access notes

All sources accessed October 24, 2026. Technical descriptions below come from the relevant publisher, developer or tool/mod author. Creator claims about quality and safety are attributed, not treated as independent certification. Version references are observations at the cutoff, not future compatibility promises.

<a id="m01"></a>**M01.** Bandai Namco, [Introduction to the Multiplayer System](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-introduction-the-multiplayer-system), February 21, 2022. Primary launch guide; core session rules read. Its confusing statements about red effigies and maximum Taunter's Tongue invaders are not repeated as current exact rules.

<a id="m02"></a>**M02.** Bandai Namco, [Battle for Glory in New PvP Modes](https://www.bandainamcoent.com/news/elden-ring-battle-for-glory-new-pvp-modes), December 7, 2022. Primary arena rules and player-count distinctions.

<a id="m03"></a>**M03.** Bandai Namco, [Patch 1.06](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-106), August 9, 2022. Distant summoning/invasions, Varré NPC alternative and unauthorized-item warning.

<a id="m04"></a>**M04.** Bandai Namco, [Patch 1.07](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-107), October 13, 2022. Separate PvP damage scaling and explicitly differentiated adjustment categories.

<a id="m05"></a>**M05.** [Nexus Elden Ring catalog](https://www.nexusmods.com/games/eldenring), cutoff snapshot. Rounded catalog count only; no active-user or sales inference.

<a id="m06"></a>**M06.** Yui, [Seamless Co-op description](https://www.nexusmods.com/eldenring/mods/510?tab=description), current page showing version 2.0.1. Features, beta caveats, save/online boundaries and permissions read; no installation or safety audit performed.

<a id="m07"></a>**M07.** Vawser, [Smithbox README](https://github.com/vawser/Smithbox/blob/main/README.md). Maintainer's editor scope, DSMapStudio lineage, current unpacking requirement and rendering variants.

<a id="m08"></a>**M08.** soulsmods, [Mod Engine 2 README](https://github.com/soulsmods/ModEngine2/blob/main/README.md). Upstream deprecation statement and redirect to me3; an old tutorial alone is insufficient evidence of current preferred tooling.

<a id="m09"></a>**M09.** Garyttierney and contributors, [me3 README](https://github.com/garyttierney/me3/blob/main/README.md). Supported games/platform environments, contribution links and licensing.

<a id="m10"></a>**M10.** me3 authors, [Creating mod profiles](https://github.com/garyttierney/me3/blob/main/docs/user-guide/creating-mod-profiles.md). Generic package/DLL separation. The page's worked example uses Nightreign; no Nightreign-specific asset names are presented here as Elden Ring instructions.

<a id="m11"></a>**M11.** me3 authors, [Configuration reference](https://github.com/garyttierney/me3/blob/main/docs/configuration-reference.md). Elden Ring profile example, separate save filename and default official-matchmaking restriction.

<a id="m12"></a>**M12.** Ividyon and contributors, [WitchyBND README](https://github.com/ividyon/WitchyBND/blob/main/README.md). Supported file operations, basic workflow and GPLv3 statement.

<a id="m13"></a>**M13.** Vawser and contributors, [Smithbox releases](https://github.com/vawser/Smithbox/releases). Current merge, delta, backup and regulation-upgrade features; not an independent test of merging arbitrary mods.

<a id="m14"></a>**M14.** thefifthmatt, [Item and Enemy Randomizer](https://www.nexusmods.com/eldenring/mods/428?tab=description). Creator's features, installation requirements, distribution permissions and optional support. Search caches showed inconsistent version metadata; no current exact version is asserted here.

<a id="m15"></a>**M15.** thefifthmatt, [Randomizer README](https://github.com/thefifthmatt/SoulsRandomizers/blob/master/EldenRingRandomizer/README.md). Options/seed export, generated-file dependencies and translation contribution instructions. Overlapping Nexus/README text is treated as one underlying author account.

<a id="m16"></a>**M16.** Kirnifr and Reforged team, [Reforged documentation](https://www.nexusmods.com/eldenring/mods/541?tab=docs), page updated October 20, 2026. Stated combat goals, launcher/save recovery and support; no comparative playtest performed.

<a id="m17"></a>**M17.** Convergence team, [The Convergence](https://www.nexusmods.com/eldenring/mods/3419). Current feature list and DLC requirement; links to official team launchers and documentation.

<a id="m18"></a>**M18.** Convergence team, [Project site](https://www.convergencemod.com/). Team-controlled documentation, community and support links; unfinished wiki pages are explicitly marked on the site.

<a id="m19"></a>**M19.** Yui, [Seamless release mirror](https://github.com/yuiamoroll/EldenRingSeamlessCoopRelease/releases). Linked from the creator's Nexus page; version 2.0.1 and game 1.17 compatibility statement read.

<a id="m20"></a>**M20.** FromSoftware, [Elden Ring online manual: main menu 2](https://www.fromsoftware.jp/manual/eldenring/ps4/mainmenu2.html). Japanese primary manual; message composition, multiplayer/group passwords and gestures translated/paraphrased for this chapter.

<a id="m21"></a>**M21.** FromSoftware, [Game FAQs](https://www.fromsoftware.jp/jp/faq-games.html). Only the Elden Ring and Tarnished Edition platform/session sections used; the site's Dark Souls III weapon-level/password answer must not be mistaken for Elden Ring evidence.

<a id="m22"></a>**M22.** PC Gamer, [Elden Ring co-op guide](https://www.pcgamer.com/is-elden-ring-co-op-multiplayer/), May 29, 2024. Firsthand explanatory account used narrowly for native guest progression and asynchronous traces; its older mod player-count statement is superseded by the current creator description.
