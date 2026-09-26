# Roblox — full platform research dossier

**G04 · Full research pass completed September 25, 2026.** Covers R01–R14 at the platform level, with concrete supported interactions and distinct creator/player perspectives. It is not an exhaustive API manual, a source-code audit, a legal opinion, or a claim of personally playing every experience.

Read with the [preserved Roblox chapter](../games/roblox.md), [requirements](../research-requirements.md) and [resume ledger](../research-progress.md). Grow a Garden and Steal a Brainrot have their own required passes; their existence does not make their rules universal Roblox rules. Other named experiences below illustrate platform differences rather than replacing their own possible game studies. This is inspiration/reference, not an OpenLegend architecture plan.

## 1. A platform supplies continuity around different games

The official learning material distinguishes making **games**, **avatar characters**, and **avatar items**. A creator can specialize in one rather than build all three. Its basic game example is a platformer where collected coins buy jump power and enable reaching higher platforms. [RB01](#rb01)

**Interpretation:** the player's recognizable platform identity, the character's present abilities and the creator's reusable assets occupy different layers. A person can want to play an experience without wanting to learn Studio. An accessory maker can contribute without designing a complete progression system. Treating every participant as the same kind of creator would obscure what each needs.

The platform does not impose one combat, crafting, quest or death system on all games. Those belong to particular experiences. Roblox-wide participation is therefore not a population estimate for one genre, camera or activity. The existing chapter's platform economics and individual experience examples remain separate evidence.

**The player journey to study:** encounter an experience through discovery or an invitation, decide whether its promise is appealing, enter its particular rules, learn a useful activity, and decide whether to return or bring someone else. Creating an avatar, choosing a game and creating that game are different actions with different learning costs. A common platform can reduce repeated setup without making every unfamiliar game immediately understandable.

## 2. From a manipulable scene to a playable activity

Roblox's core curriculum moves from a greyboxed environment through coin collection, displayed player data, hazards and a jump-upgrade interface, then lighting, effects and polished assets. It supplies staged place files rather than only a completed showcase. Its current Assistant guidance explicitly leaves gameplay decisions, visual choices and playtesting with the creator even when routine objects or scripts are generated. [RB02](#rb02)

**Worked construction:** place an obstacle the starting character cannot clear; make a resource collectable; convert it into a movement improvement; let the new capability reach a previously inaccessible place. The official tutorial's point is an actual relationship between a resource and an action, not merely a leaderboard with a larger score. The creator must still decide whether collecting the resource is enjoyable and whether the route communicates the next opportunity.

**Interpretation:** a template is useful when it exposes a complete small activity and its modifiable relationships. A polished model with no purpose is a different artifact. Assistance that removes boilerplate can make iteration cheaper, but cannot establish that a player cares about the resulting goal.

Publishing also has meaningful stages. Current documentation distinguishes Private, Limited audiences such as playtesters, and Public. Public/limited publishing has account and content requirements, with additional conditions for reaching the Kids/Select audience. A game may contain more than one place. [RB03](#rb03)

**Interpretation:** testing, releasing and finding an audience are different milestones. A working artifact inside Studio is not already a discoverable product. Nor does an additional place automatically create a coherent journey; travel and continuity must connect it to the activity.

## 3. An avatar is portable identity, not guaranteed portable power

The appearance documentation describes games that use a player's platform avatar, modify parts of it or provide their own customization. Character appearance includes body proportions, accessories, clothing and animation. The Humanoid-based model supplies basic capabilities such as walking, jumping and equipping items, while appearance can also be applied to non-player characters. [RB04](#rb04)

**Interpretation:** a player may remain recognizable across different experiences without carrying the same inventory, permissions or power curve. A hat's portability does not establish that a sword from another game deals damage here. A world can preserve identity while controlling which abilities make sense in its rules.

The **R6/R15** distinction also demonstrates a compatibility boundary: the standard rigs differ in part structure and motion range. [RB05](#rb05) That does not make every custom character impossible, but it means an asset's intended body and behavior matter. Supporting avatars is not a sufficient description of how all accessories and animations combine.

For inspiration, record what a reusable identity retains: appearance, animation, social recognition, achievements, possessions or capability. These can be deliberately different. Unlimited cross-world power would undermine many locally meaningful challenges, while refusing all recognizable identity would lose a different platform advantage.

## 4. Persistent progress is a promise implemented by each game

The documented DataStoreService stores things such as inventory and skill points across sessions and shares data across places of the same game, including different servers. It is server-side, and the documentation warns that Studio access can touch live data unless a separate test version is used. [RB06](#rb06)

**Worked distinction:** leaving a server need not mean losing an earned item when the experience saves it appropriately. But platform support for persistence does not prove that every experience saves every state, or that an independent game can read and adopt the same inventory. A player returning to a project cares about the particular promise that experience made.

**Interpretation:** persistence is not only storing more state. It is deciding what continuity is meaningful, showing it correctly and protecting it during change. A reusable world platform should not imply that all downloaded mechanics automatically preserve every old achievement. The supported service and a well-designed continuity policy are different contributions.

### NPC capability is not the same as intention

Roblox's pathfinding documentation supplies routes, material/region costs and modifiers controlling how obstacles are considered. Its examples can make a character route through or around a particular kind of space. [RB12](#rb12)

**Interpretation:** this is a useful navigation capability, not proof that an NPC has an independently formed purpose, knowledge of the world or a remembered relationship. The creator must decide what it is trying to do and what evidence it is allowed to use. A convincing route to an unknown object can actually undermine the fiction of limited perception if the character had no way to know the object existed.

## 5. Reusable packages preserve relationships, with update limits

Studio packages can be shared with permissions and retain a PackageLink. They support version updates and configuration, while removing the link turns a copy back into an ordinary object. Automatic updates occur when a place is opened in Studio, not indiscriminately in every live session. Modified copies are excluded from automatic updating, and a package can still depend on restricted assets its recipient lacks permission to use. [RB07](#rb07)

**Worked failure:** a creator adopts a working-looking package, but a dependent sound or image is unavailable to the destination. The outer artifact has transferred; the whole experience has not. Another creator locally modifies a copy, then expects a publisher's change to appear automatically; the modification intentionally changes that update relationship.

**Interpretation:** sharing has at least three contracts: what the artifact contains, what dependencies it needs, and how it changes afterward. A beautiful preview cannot substitute for all three. Protecting a local customization can be desirable even when it means an automatic fix does not arrive.

A package is distinct from a finished game. A reusable door, vehicle or interface can lower production effort, while the receiving creator still needs a reason for the player to use it. The existence of a marketplace therefore cannot be counted as evidence that every artifact creates consumer value.

## 6. Collaboration and communication have separate permissions

Studio supports simultaneous and asynchronous collaboration, with Owner, Edit and Play permissions. Its current Team Create rules include age-check and compatibility requirements; permission to edit is not always identical to eligibility to enter a particular collaborative session. [RB08](#rb08)

The June 2026 account release introduces **Roblox Kids** and **Roblox Select**, additional review for their game catalogs, and chat access conditioned on age checks and settings. A person without a completed age check cannot simply use chat because they typed an older birth date. Regions and parental controls qualify the defaults. [RB09](#rb09)

**Interpretation:** joining a friend has several meanings: entering the same game, reaching the same instance, chatting, collaborating on its files or altering shared progress. Product design must not promise all of these when it provides only one. Safety controls are documented mechanisms and goals, not independent proof that unwanted contact or harmful behavior never occurs.

These boundaries shape creative practice. A team can have the skills to build something and still need to resolve legitimate access and coordination conditions. That friction is different from an editor bug or a lack of imagination; it belongs in production and community research rather than being ignored as outside the game.

## 7. Object value and monetization are not one universal economy

Roblox documents several product families: a **pass** grants a one-time purchased privilege; a **developer product** can be bought repeatedly, such as ammunition, a potion or in-game currency; subscriptions supply recurring benefits; private servers offer controlled group access; and the Creator Store distributes models/plugins to other creators. Avatar Marketplace items are another distinct supply. [RB10](#rb10)

**Worked contrast:** a cosmetic purchase, repeatable healing purchase and private session each change a different part of participation. Calling all three items hides whether the user is buying expression, immediate power or access to a preferred group. The experience designer must decide which benefits fit the intended activity.

**Interpretation:** a commercial interface can alter the emotional meaning of a problem. A difficult obstacle may be mastery, an invitation to cooperate or an irritation designed to sell relief. The same transaction mechanism supports different practices; its existence does not prove any one game is fair or unfair.

The **Roblox Plus** announcement also separates subscriber discounts from creator proceeds: Roblox says it covers the discount and provides additional mechanisms around private-server engagement and subscription acquisition. It stopped new Premium sign-ups while existing memberships could continue. These are 2026 platform rules, not the assumption that every subscriber program is unchanged. [RB11](#rb11)

### Rewarding an activity changes the creator's incentives

Creator Rewards distinguishes **Daily Engagement** from **Audience Expansion**. Daily rewards depend on a qualifying Active Spender, ten minutes of play and a limit of three qualifying experiences, not every visit. The audience-expansion program concerns attributed new or sufficiently lapsed users and has additional conditions. Rewards are Earned Robux with a sixty-day holding period; exchanging them for cash is a separate DevEx process. The dashboard itself distinguishes estimated earnings and acquisition sources. [RB13](#rb13)

**Interpretation:** a popular experience and a well-rewarded experience need not be identical. A short, satisfying story may not invite frequent replay; a social hangout may. Neither is intrinsically a better game. A platform's payout rules become part of the practical environment in which creators choose what to build, so a research library should examine those incentives alongside the editor.

Do not reduce the official reward examples to the unsupported claim that the fourth game a person launches can never qualify. The written examples consider accumulated qualifying play and visitation order together. This dossier uses the documented participation distinction, not an oversimplified optimization recipe.

## 8. Art and physical meaning can be connected or separate

Roblox materials can supply physical properties such as density, friction and elasticity as well as appearance. **MaterialVariant** changes a reusable material, whereas **SurfaceAppearance** serves a different, mesh-specific visual role. A new appearance should not automatically be assumed to change all physical behavior. [RB14](#rb14)

**Worked design:** an icy-looking floor intended to be slippery needs a corresponding movement consequence. Conversely, a purely decorative change should not unexpectedly make a trusted walking route harder. The visible clue and the mechanical effect can support each other, but the creator must know which layer was actually changed.

The official **Mystery of Duvall Drive** art account deliberately selected a Craftsman-style house to reuse a small material palette across furniture and architecture. It distinguishes unique materials, shared trim maps and reusable variants. Texture memory budgets were part of that choice. [RB15](#rb15)

**Interpretation:** coherent style can reduce production burden while increasing recognition. Reuse is not necessarily visual sameness: the arrangement and function of a material can make a room particular. This is more informative than assuming every Roblox experience must use the same blocky look or that higher fidelity alone makes it more engaging.

### Sound can be an evidence channel

The current audio documentation separates a playing source, a spatial emitter, a listener, effects and the output device. It supplies examples such as muffling rain and adding room reverberation. Audio assets may be created/imported with appropriate permission or obtained from the Creator Store. [RB16](#rb16)

**Interpretation:** sound can locate an event, suggest enclosure or communicate a changed state rather than merely fill silence. A character hearing a threat and the human hearing a soundtrack are different claims. A usable reference needs to state which source is audible to whom and what action that information enables. It must not infer an autonomous sensory model merely from a spatial audio effect.

## 9. Narrative belongs to the experience, not one platform-wide canon

The Duvall Drive showcase is an official, editable mystery set in an abandoned house. Its written case study explains construction, materials, streaming and movement rather than only presenting a trailer. [RB17](#rb17) Its narrative approach separates environmental visual cues from lore activated by clicking an object; that lore display is visible to the interacting player rather than automatically broadcast to everyone. [RB18](#rb18)

**Worked distinction:** two people can enter the same room while only one investigates the object carrying a clue. A shared location does not imply shared knowledge. The investigator may then explain what they found. The source documents interface scope, not a guarantee that every multiplayer session creates a meaningful mystery.

**Interpretation:** reusable platform features can support authored discovery, a player-created social episode or a minimal competitive premise. Those are different narrative products. Open-ended construction is not itself a finished story, while a tightly authored experience does not disprove the value of reusable tools.

A central source of possible attachment is the player's continuing relationship with other people, favorite places and recognizable identity. That continuity can cross games even when their fictional universes do not. It should not be misdescribed as a universal NPC-memory system or interoperable lore database.

## 10. Discovery is part of production, not a reward for uploading

Roblox's current discovery documentation distinguishes qualified play from accidental clicks or quick exits. It tracks repeat days across several periods, including days 8–28, and caps the counted playtime per user/game/day. **Intentional co-play** includes returning through friends, invitations or private servers, rather than merely occupying the same server. Recommendation signals are calculated from specified organic Home cohorts; comparison benchmarks do not themselves directly control the recommendation algorithm. [RB19](#rb19)

**Worked problem:** an attractive thumbnail brings clicks, but newcomers quickly leave because the promised activity is hard to find. Improving click-through alone does not repair that gap. Conversely, a small but well-matched cohort may demonstrate something that a large poorly matched campaign does not. These are design interpretations of the documented signals, not claims to know the ranking weights.

**Interpretation:** acquisition, onboarding, return and social participation should be examined separately. A satisfying game can remain hard to discover; a heavily exposed game can disappoint after entry. An authoring tool can enlarge supply without solving either problem. A platform needs an actual consumer journey, not simply more generated artifacts.

### The 2026 roadmap must not be mistaken for delivered capability

At RDC on September 11, 2026, Roblox described **Build** as a limited public alpha expanding to particular countries, **Moments** as available in the US, browser play as a later-2026 goal and offline play as a mid-2027 goal. It also presented Roblox Everywhere as a route toward standalone distribution. These are different delivery states, not one already universal feature set. [RB20](#rb20)

**Interpretation:** distribution experiments can widen the situations in which a game is accessible. They also change expectations around compatibility, discovery and continuity. A persistent online social world and an offline single-player puzzle require different promises; sharing a production platform does not make those differences disappear.

## 11. Origins, accumulated tools and sustainable production

In Susan Adams's June 2016 interview, David Baszucki traces Roblox's inspiration to people experimenting with physics software and construction toys. He describes spending two years on the first version with a former colleague, initially funding it himself, then raising outside capital. His then-favorite **Natural Disaster Survival** supplies a concrete example of a shared place with recurring hazards and a clear shelter problem. These are historical creator accounts, not present team, financial or audience statistics. [RB21](#rb21)

**Interpretation:** the original insight was not merely that users could write code. It was that constructing and testing things together could become an activity people valued. The mature platform then accumulated the services needed to create, host, find, join and sustain very different experiences. A new project cannot inherit that accumulation by naming itself a platform.

The official curriculum and Duvall case study make part of the production process visible: start from a playable arrangement, develop the interaction, select a coherent art approach, and then refine how people read it. [RB02](#rb02) [RB17](#rb17) Their existence is not evidence that every creator follows that process or succeeds commercially.

### Platform economics are not a typical creator's livelihood

The September 2026 company address reported more than $5 billion paid to creators through DevEx since 2013 and nearly $1.7 billion during the twelve months ending June 30, 2026. Those are attributed aggregate payout figures, not a median creator's income, net profit or return on labor. [RB20](#rb20)

The original chapter retains the older annual revenue, bookings, operating-cost and participation evidence. This pass does not convert it into a freshly synchronized financial census. Creator reward, platform revenue and service cost are different accounts. A game that is enjoyable can still fail to cover its maintenance work; a high-grossing platform can still contain many unpaid or lightly rewarded creations.

**Interpretation:** a creator ecosystem should not promise a livelihood merely because some money is distributed. The pertinent questions are who receives it, under what conditions, after what work, with what dependency on continued policy and audience access. Those distributions were not established in this research and are not invented.

## 12. Reception: distinguish the platform, the game and the creator contract

### Firsthand creator feedback

**SleepyyTofu**, in the July 24, 2025 Creator Rewards thread, describes making one-session experiences and worries that limited replay and monetization fit the new incentives poorly. The post also criticizes communication. This is a creator's concern, not proof that all finite games earn nothing or that every small creator lost income. [RB22](#rb22)

In December 2025, **Steamboat1456** reported seeing earnings without the expected payout. A Roblox staff reply explained the holding/validation distinction and acknowledged a need for clearer chart labeling. [RB23](#rb23) In a separate September 2025 thread, **SnoogleBrosPlayz** initially reported no rewards, then observed increased pending Robux and later marked the visible figures resolved. [RB24](#rb24)

**Interpretation:** a balance-display problem, an eligibility condition, a payout delay and an unfavorable reward policy are not the same issue. Flattening them into either “the creator was wrong” or “the platform withheld everything” loses the useful evidence. Reliable comprehension of earnings is itself part of the creator experience.

### Firsthand player and critic evidence

| Account | Positive emphasis | Friction / interpretation boundary |
| --- | --- | --- |
| TheAverageNoob, August 9, 2026 | Describes discovering varied genres, customizing an avatar and learning to create; still enjoys selected games with a friend. | Mixed feelings about the wider platform do not erase those particular experiences. [RB25](#rb25) |
| S3Y0N, November 9, 2025 | Values variety and continued access to older favorites. | An individual's available favorites are not proof that every old game survives unchanged. [RB25](#rb25) |
| forsakened, January 22, 2026 | Distinguishes liking individual games from disliking platform moderation. | A personal service judgment, not independently validated prevalence of every alleged problem. [RB25](#rb25) |
| Morgan Park, PC Gamer, June 22, 2026 | After a short TTK session, praises directional sound, forceful weapon feedback and a less intrusive monetization approach. | A particular shooter and test build, not the quality of the entire catalog. [RB26](#rb26) |

Park's report also records the TTK developers' concern that the algorithm found their testing slice before the more ambitious intended game was ready. [RB26](#rb26) **Interpretation:** sudden distribution can expose an unfinished promise. It is not automatically the same thing as a successful, sustainable launch, even when immediate attention is welcome.

A platform-wide numerical review score cannot resolve these perspectives. Someone may dislike discovery or commercial pressure while finding a game they love; a creator may value the editor while distrusting a changed payout rule. The correct unit of analysis follows the complaint or benefit.

## 13. Worked reference patterns

**A resource changes movement rather than only status.** The curriculum's coin-to-jump improvement makes another route possible. [RB02](#rb02) The player can understand why the resource matters; a decorative currency counter would not supply the same choice.

**A package transfers form but not every permission.** Restricted dependencies can prevent a copied artifact from working as expected. [RB07](#rb07) Its creator needs to communicate the dependency and update boundary, not merely show a successful original preview.

**A visual property implies a rule.** An ice-like surface can communicate low friction when configured accordingly. [RB14](#rb14) Matching appearance and behavior helps discovery; changing one without the other can mislead. This is a design relationship, not a claim that every texture carries inherent physical truth.

**A clue can be locally acquired in a shared room.** Duvall's player-scoped lore display distinguishes co-presence from knowledge. [RB18](#rb18) This provides a concrete comparison for selective perception, without implying an implemented universal belief model.

**A satisfying ending can conflict with an incentive to return.** SleepyyTofu's concern separates finite experience design from a platform reward contract. [RB22](#rb22) Whether to lengthen, monetize or leave a work alone is a consequential choice, not proof that maximum session time equals value.

**Identity persists while capability changes.** Platform avatars and experience-specific rules can coexist. [RB04](#rb04) A person can recognize a friend without assuming that every possession from another game has the same local powers.

**A promotional success can arrive before production readiness.** The TTK account shows attention reaching a test slice. [RB26](#rb26) A shareable clip, a good first session and a durable content plan remain different milestones.

## 14. What OpenLegend can draw from this—and what not to copy

The useful precedent is a **layered path from consumer to contributor**: play something, recognize its rules, adapt a working artifact, collaborate, then perhaps author a new activity. Lowering authoring friction is valuable, but it does not supply audience fit, coherent rules, discovery, safe participation or continued creator trust.

A reusable artifact should explain its supported behavior, dependencies, compatibility and update policy. An avatar should distinguish identity from power. A world should distinguish shared location from shared knowledge and admission from editing authority. These are specific product lessons rather than an instruction to duplicate Roblox's services.

Do not assume a general engine needs a public marketplace first, that a catalog will be populated with appealing experiences without authorship, or that engagement-based incentives are neutral with respect to the games people make. Nor should one viral experience's aesthetic, income or population be represented as the platform's universal pattern.

## 15. Reading routes, coverage and preservation

For an actual creation path, follow the core curriculum rather than starting from a feature catalog. Read Packages for an artifact's lifecycle and the Duvall production/narrative chapters for a coherent authored example. Read Discovery and Creator Rewards separately: one describes matching people to games, the other describes compensation conditions. Pair those documents with the dated creator replies and the particular player/critic experiences above.

The official tutorial and case-study pages link videos and editable examples. This research inspected their written documentation, not full video playback or an independently executed place file. Their availability as examples does not certify that every present device, dependency or account configuration will reproduce the original result.

| Requirement | Substantive coverage |
| --- | --- |
| R01 identity/scope | §1–3; platform, experiences and contributor roles |
| R02 major actions/mechanics | §§2–6; creating, publishing, movement, persistence, reuse and collaboration |
| R03 items/entities/composition | §§3, 5, 7–9; avatars, packages, materials, transaction families and clues |
| R04 progression/economy/time | §§4, 7, 10–11; local progress, updates, earnings and return behavior |
| R05 concrete interactions | Worked examples throughout and §13 |
| R06 social/AI/multiplayer | §§3–6 and §9; actual capabilities, access and information boundaries |
| R07 art/audio/interface | §8 and the tutorial/presentation discussion |
| R08 narrative | §9; concrete authored example and human social continuity |
| R09 production | §11, with tutorial/package/collaboration evidence in §§2–6 |
| R10 marketing/distribution | §10 and §12–13; matching, invitations, rollout boundaries and attention risks |
| R11 commercial context | §7 and §11; dated aggregates, business models and limits |
| R12 reception | §12; firsthand creators, players and a critic's bounded experience |
| R13 inspiration/limits | §14 and labeled interpretations |
| R14 evidence/navigation/preservation | This section and annotated sources |

**Per-subject preservation:** the supplied master's §3.3 and complete `games/roblox.md` were inspected. The prior platform distinction, dated annual/quarterly figures, discovery interpretation, Grow a Garden and Steal a Brainrot subsections, safety/creator cautions and OpenLegend hypotheses remain unchanged. Those experience subsections still require their separate full passes. The original metric/source ledgers were not overwritten; the seven-file packet-wide reconciliation remains a separate gate.

**Evidence limits:** no personal gameplay, code audit, full-video claim, representative sentiment survey, private revenue attribution or typical-creator earnings estimate. Several forum posts were retrieved through substantive indexed text rather than a fully rendered forum page. Feature and policy descriptions are dated; announced future access is not treated as shipped. These limits qualify the evidence rather than replacing missing required sections.

## Annotated sources

<a id="rb01"></a>**RB01 — [Learning tutorials](https://create.roblox.com/docs/tutorials).** Primary division between games, avatars and avatar items. Promotional accessibility is not a measured beginner success rate.

<a id="rb02"></a>**RB02 — [Core curriculum](https://create.roblox.com/docs/tutorials/curriculums/core).** Primary written tutorial and example, inspected September 25, 2026. Linked videos/place files identified, not executed or fully watched.

<a id="rb03"></a>**RB03 — [Publish games and places](https://create.roblox.com/docs/production/publishing/publish-games-and-places).** Primary audience/release documentation. Detailed Private/Limited definitions govern where introductory wording is less precise.

<a id="rb04"></a>**RB04 — [Character appearance](https://create.roblox.com/docs/characters/appearance).** Primary capability/appearance distinction. Not every game accepts every avatar unchanged.

<a id="rb05"></a>**RB05 — [Rig Generator](https://create.roblox.com/docs/studio/rig-builder).** Primary standard-rig overview; custom rigs and specific compatibility remain separate.

<a id="rb06"></a>**RB06 — [Data stores](https://create.roblox.com/docs/cloud-services/data-stores).** Primary service boundaries. Capability is not proof of each game's saving quality.

<a id="rb07"></a>**RB07 — [Packages](https://create.roblox.com/docs/projects/assets/packages).** Primary reuse, update and dependency-permission rules. No arbitrary live-update mechanism inferred.

<a id="rb08"></a>**RB08 — [Collaboration](https://create.roblox.com/docs/projects/collaboration).** Primary current Studio workflow/access requirements, not every historical team's conditions.

<a id="rb09"></a>**RB09 — [Kids and Select global release](https://about.roblox.com/newsroom/2026/06/age-based-roblox-kids-and-select-accounts-now-globally-available), June 16, 2026.** Primary account/content/chat rules. Intended protections are not independently validated safety outcomes.

<a id="rb10"></a>**RB10 — [Monetization documentation](https://create.roblox.com/docs/production/monetization).** Primary transaction families. Recommendations about cadence or player preferences are not universal laws.

<a id="rb11"></a>**RB11 — [Introducing Roblox Plus](https://about.roblox.com/newsroom/2026/04/introducing-roblox-plus-subscription), April 10, 2026.** Primary subscription transition and subsidy explanation. No current purchase recommendation.

<a id="rb12"></a>**RB12 — [Pathfinding](https://create.roblox.com/docs/characters/pathfinding).** Primary routing/cost/modifier capability. Authored examples do not prove a general perception or intention system.

<a id="rb13"></a>**RB13 — [Creator Rewards](https://create.roblox.com/docs/creator-rewards).** Current primary conditions and accounting labels. Examples qualify terse summaries of visitation order. This dossier is not an eligibility or earnings forecast.

<a id="rb14"></a>**RB14 — [Materials](https://create.roblox.com/docs/parts/materials).** Primary visual/physical and variant distinctions. Broad marketing language about realism is not a claim of physically exact simulation.

<a id="rb15"></a>**RB15 — [Duvall Drive: Materialize the world](https://create.roblox.com/docs/resources/the-mystery-of-duvall-drive/materialize-the-world).** Primary production case study; style, reuse and memory budget, not a complete art pipeline for every game.

<a id="rb16"></a>**RB16 — [Audio](https://create.roblox.com/docs/audio).** Primary current audio objects and effects. A spatial sound is not proof of NPC awareness.

<a id="rb17"></a>**RB17 — [The Mystery of Duvall Drive](https://create.roblox.com/docs/resources/the-mystery-of-duvall-drive).** Official editable demonstration and production guide. Written source inspected; no played-demo claim.

<a id="rb18"></a>**RB18 — [Duvall Drive: Immersive narrative](https://create.roblox.com/docs/resources/the-mystery-of-duvall-drive/immersive-narrative).** Primary visual-clue and player-scoped lore design. Not an arbitrary narrative engine.

<a id="rb19"></a>**RB19 — [Discovery](https://create.roblox.com/docs/discovery).** Current primary recommendation/benchmark definitions, inspected September 25, 2026. No exact algorithm weights or causal campaign result inferred.

<a id="rb20"></a>**RB20 — [RDC 2026: The World Needs More Play](https://about.roblox.com/newsroom/2026/09/rdc-2026-the-world-needs-more-play), September 11, 2026.** Primary rollout/roadmap and aggregate payout account. Introductory aspirations are qualified by explicit later delivery dates. Payout total is not typical creator income.

<a id="rb21"></a>**RB21 — [Baszucki interview, Forbes](https://www.forbes.com/sites/forbestreptalks/2016/06/10/why-the-creator-of-roblox-thinks-his-gaming-platform-will-top-minecraft/), Susan Adams, June 10, 2016.** Original written interview inspected through the site's redirect. Historical origin and game example; old valuations, forecasts and demographics are not current claims.

<a id="rb22"></a>**RB22 — [SleepyyTofu's Creator Rewards response](https://devforum.roblox.com/t/creator-rewards-is-live/3838257/103), July 24, 2025.** Substantive indexed firsthand creator post. Concern about one-session experiences, not proof of a platform-wide income result.

<a id="rb23"></a>**RB23 — [Creator payout report and staff reply](https://devforum.roblox.com/t/not-receiving-creator-rewards-despite-being-eligible/4117899), December 5, 2025.** Indexed firsthand report and explanation. Private attachments were not read; no claim of independent account auditing.

<a id="rb24"></a>**RB24 — [SnoogleBrosPlayz reward-display thread](https://devforum.roblox.com/t/still-not-earning-robux-from-creator-rewards-after-more-than-60-days-have-passed-since-its-launch/3957325), September 25–27, 2025.** Indexed original report, correction and resolution. Preserves the sequence instead of presenting the first complaint as final fact.

<a id="rb25"></a>**RB25 — [Metacritic player-review bodies](https://www.metacritic.com/game/roblox-game-client/user-reviews/).** Named dated posts inspected. The page is associated with an Xbox client listing while commenters sometimes discuss broader use; not a verified cross-platform survey. Unsupported allegations and numerical claims excluded.

<a id="rb26"></a>**RB26 — [Morgan Park's TTK account, PC Gamer](https://www.pcgamer.com/games/fps/realistic-roblox-fps-made-by-two-people-hits-7-million-plays-reminding-us-that-roblox-games-dont-have-to-be-terrible/), June 22, 2026.** Original critic play account and developer remarks. One test-build experience, not a universal Roblox review or causal virality measurement.
