# Garry's Mod — tools, finished activities and places to gather

**G35 · Full research pass · September 26, 2026.** R01–R14 mapped below. Native Sandbox, included Trouble in Terrorist Town and explicitly identified community modes are separate scopes. Five substantial written blog/player reviews were read; this is **not** a claim of five professional editorial reviews. No gameplay, source-code experiment or video playback performed.

[Earlier chapter](../games/garry-s-mod.md) · [Preserved mechanics study](../mechanics/garrys-mod-tools-constraints-and-player-made-games.md) · [Progress](../research-progress.md)

## 1. Identity and the different promises inside one purchase

Facepunch describes Garry's Mod as a physics sandbox using a modified Source engine. Its standalone Steam release is dated November 29, 2006; that is distinct from the earlier free mod. The important invitation is not a campaign objective but access to objects, physical manipulation and other people's creations. Native solo construction, cooperative building and playing a community-authored game are all real routes into the product, but they do not have identical rules. [P6] [P7] [P5]

A useful first-session distinction is **make an activity versus join an activity**. Someone can spend an evening constructing a machine, staging an image, entering Prop Hunt or talking in a virtual cinema. Only the first two require engaging substantially with the building tools. Treating every satisfied customer as an aspiring programmer would miss much of the documented appeal. This is our interpretation of the toolkit and the contrasting accounts in §8, not a measured segmentation study.

### Current versus historical versions

The September 16, 2026 update makes Windows 64-bit client, dedicated-server and Hammer builds available across branches. It adds spawn-menu subcategories, better player-model browsing and more informative download controls. These changes matter to discoverability and address-space limits; they do not establish limitless simulation performance or universal add-on compatibility. The same release adds a Hacked Manhack NPC and allows damage to the Dropship. Current maintenance is therefore more than a frozen preservation of the 2006 product. [P1]

The July 23, 2025 update includes most Counter-Strike: Source and Half-Life 2 episodic assets by default, with Valve's permission. Maps, voice-over and music are excluded. This qualifies old advice that every user must buy those games merely to see their commonly used props, without claiming that every missing texture has been eliminated. The TTT homepage now reflects the included assets; its older help page retains a contradictory opening sentence before explaining that CS:S is optional for its maps. The dated release note is the clearer boundary. [P8] [T1] [T4]

## 2. What the player can actually do

### Entry, body and identity

Starting a local game means selecting an installed map, not generating a continent or choosing a story quest. The official quick start uses **gm_flatgrass**, an initially empty space with the physics gun. Holding **Q** opens the spawn menu; **C** opens a context interface. Player-model and physics-gun colors support expressive identity, but they are not character classes or a universal attribute system. Servers may override the preferred player model; a locally installed model is not automatically available to everyone else. [D1] [D2]

Sandbox exposes props, weapons, entities and vehicles through its menu. These are different kinds of things: a chair-like prop is not necessarily a usable vehicle, a posed ragdoll is not an autonomous NPC, and a visible weapon model need not implement a scripted weapon's behavior. The mode's freedom should not be translated into a promise that every object supports every operation. [D3] [D4]

### Named construction and presentation inventory

The official shipped-tool list separates these families; community additions can extend them. The names are a useful vocabulary, not a guarantee that every server enables every tool. [P2]

| Family | Examples | Decision exposed |
| --- | --- | --- |
| Physical relationships | Weld, Axis, Ball Socket, Rope, Elastic, Slider | What can move relative to what? |
| Controlled mechanisms | Hydraulic, Motor, Muscle, Pulley, Winch | How will an assembly change position or shape? |
| Construction components | Wheel, Thruster, Hover Ball, Balloon, Button | What produces, supports or controls motion? |
| Effects and lighting | Dynamite, Emitter, Lamp, Light | What happens or becomes visible when the object is used? |
| Physical editing | No-Collide, Physical Properties, Remover | Which restrictions or pieces should remain? |
| Character posing | Eye Poser, Face Poser, Finger Poser, Inflator | What posture or expression communicates the scene? |
| Rendering and appearance | Camera, Color, Material, Paint, Trails | What should the audience see? |
| Reuse | Duplicator | Which assembled object should be preserved or shared? |

The physics gun selects, moves, rotates and freezes suitable objects. Rotation can be snapped rather than continuously eyeballed, and frozen objects can be released again. This temporarily suspends some burdens of embodied construction: a builder can hold a part in place while connecting it. It does not remove the need to understand what happens when the assembly is unfrozen. [D5]

An **Axis** constrains rotation around a shared axis, with force and torque break limits, friction and a collision option. A **Weld** instead preserves a fixed relationship. Changing only the relationship can therefore turn the same two pieces from rigid structure into a hinge. A zero break limit in the Axis documentation disables that limit; it does not mean a zero-strength connection. The earlier mechanics study preserves this precise distinction. [D6] [D7]

The **Remover** distinguishes deleting one entity, deleting a connected assembly and removing its constraints. That is more useful than a single indiscriminate reset. It also creates a selection hazard: the visible piece and the connected thing are not necessarily the same deletion scope. [D8]

### Combat, NPCs, vehicles and simulation limits

Weapons and enemies can become material for player-designed battles rather than rewards from an authored campaign. Current official notes identify crossbow bolts, RPG effects, Combine energy balls, Metrocops, Antlions, Dropships and Manhacks among maintained game elements. NPC context controls can alter behavior and select a spawned NPC's weapon. A battle can therefore be staged by composing actors, equipment and terrain, not only by personally shooting everything. [P8] [P1] [D2]

This is **not evidence of a general social simulation**. A combat NPC's navigation or hostility does not imply personal memories, evolving friendships, employment routines or natural-language goals. Lua add-ons and game modes may implement other behavior, but their specific contracts must be researched separately. Likewise, vehicle spawning and physical vehicle construction are distinct routes: access to a ready-made vehicle is not mastery of building one. [D3] [D4]

There is no native Sandbox campaign-wide class ladder, skill tree, romance system, faction-reputation story, quest journal, survival-food loop or merchant/crafting progression. Health, damage, weapons and death can exist without forming a persistent RPG economy. Particular modes supply their own roles, scarcity and consequences. The absence of a universal ladder is why the question “what do I do next?” is often answered by a project or a group rather than a quest marker. [P6] [D3]

## 3. Composition, persistence and reasons to return

The ordinary Sandbox construction loop is **select → place → connect/configure → release/test → revise**. A useful artifact might be a vehicle, a mechanical joke, a reusable prop arrangement or a scene. Progress is often skill, a saved creation, a reusable asset collection or a relationship with collaborators. This description is an analytical organization of the documented operations, not a hidden scoring system.

The documented `duplicator.Copy` operation collects an entity together with constrained entities and constraints. Its representation includes both entities and relationships, rather than merely remembering the first object's model name. That supports the earlier study's important “portable contraption” distinction. It does not prove every third-party object saves arbitrary internal state correctly. Dependencies and the destination's permissions still matter. [D9]

**Saves, dupes, demos and published media are different persistence surfaces.** A save concerns a scene/world state, a dupe concerns a reusable assembly, a demo records a session for playback, and a screenshot or edited film communicates an authored view. The September update explicitly adds favorites across dupe/save/demo browsing; July's save-load confirmation recognizes that loading may require changing maps. Neither feature makes a server's private persistent economy portable to another server. [P1] [P8]

Add-ons introduce models, weapons, vehicles, tools and NPCs. They can be obtained through the Workshop or installed manually; installation is distinct from learning how a particular item works. Maps and modes similarly define what can happen in a particular session. The platform's content library therefore supplies both reusable ingredients and finished activities. [D4]

**Interpretation:** a good sharing unit lets the next person enjoy or modify the result without reconstructing every prerequisite. The counterweight is maintenance: inherited complexity, incompatible add-ons, unavailable servers and changing dependencies can make the shared object less portable than its thumbnail suggests. A construction game needs an intelligible route back into an old creation, not merely an upload button.

## 4. Modes, people and rule-specific economies

### Trouble in Terrorist Town: included, community-origin, socially dependent

TTT is included in Garry's Mod, but it originated with Bad King Urgrain rather than being the default meaning of Sandbox. A minority of hidden Traitors must eliminate Innocents; other players identify threats while trying to survive. The Detective role and specialized equipment add explicit investigative asymmetry. Its fictional Counter-Strike parody framing is not a statement about real-world groups. [T1] [T2]

The interesting resource is not only ammunition but **credible information**. A participant can possess a lethal weapon without knowing whom it is justified to attack. Traitors benefit from surprise, while the majority must decide when an observation is sufficient to act. Cooperation and deception are performed by humans; the setting is not generating those interpersonal motives through autonomous NPC psychology. [T1]

Karma discourages harmful killing but cannot interpret every ambiguous situation. The creator favors good-faith groups and generally looser, faster play over elaborate rules-lawyering; he also explicitly says he has not administered a server and rarely plays now. His analysis is therefore valuable design testimony, not a current population-wide verdict about server moderation. He identifies another limit: giving innocent players enough to do is strongly map-dependent. [T3]

### Prop Hunt: a familiar object becomes suspicious

Props disguise themselves as ordinary map objects; Hunters search for and eliminate them. Attacking a non-player prop damages the Hunter, making indiscriminate shooting costly. Rotation, freezing, taunts and flashlights depend on the implementation or server settings. The same visual clutter that decorates a map now becomes evidence to interpret. This is a competitive hide-and-seek rule set, not a power granted to every Sandbox player by default. [P3]

### DarkRP and role-play derivatives

DarkRP supplies a role-play framework rather than one fixed authored society. Its documented commands distinguish global out-of-character discussion, local yelling, private messages, action text, group/radio communication and dropping money. It includes administration and prop-protection systems; the surrounding ecosystem contains free and paid extensions. Server-specific jobs, purchases, balances and enforcement can differ substantially. Do not promote one server's wages, item prices or character progression into a universal Garry's Mod economy. [P4]

A `/me` description is a performed action in chat; it does not establish that the physics or game rules executed every claimed effect. That separation is important when comparing role-play to a simulation whose narrated actions must change authoritative state. A spoken agreement, a scripted transaction and an administrator's intervention are different kinds of causation.

### Cinema, other activities and community continuity

A 2023 patientgamers retrospective describes leaving competitive Prop Hunt for Cinema mode, enjoying shared videos and conversation without constant performance pressure. This is firsthand evidence for a “place to gather” use case, not proof that every public room is pleasant or that the activity has a clinical benefit. [S3]

The earlier chapter also preserves social play and reusable creations as reasons to enter without building. Other modes can provide races, obstacle courses, combat or minigames, but each should be named and scoped rather than aggregated into a fictional all-in-one feature set. Joining requires not merely an installed executable but a compatible mode, content, server and social expectation. Losing the particular people or host can remove value even while the base game remains available.

## 5. Seven worked situations

These are **constructed illustrations of documented rules**, not claims of personally reproduced play. They extend the original vehicle, Prop Hunt and TTT examples rather than replacing them.

### A. Build a vehicle, then find out what was wrong

**Intent:** make a rideable moving construction. **Conditions:** a permissive Sandbox session and appropriate props/tools. **Actions:** assemble a platform and moving components, freeze pieces while aligning them, attach a propulsion/control arrangement, then release and test. **Interaction/result:** what looked coherent while frozen must now survive physical relationships. **Next decision:** revise placement, connection or power rather than add decorative parts. **Limit:** the official car/rocket invitation is a possibility, not a guarantee that any arbitrary arrangement moves stably. [P7] [D5]

### B. Repair the relationship, not the visible object

**Intent:** make a flap swing instead of remaining rigid. **Conditions:** two suitable props and a fixed connection. **Actions:** remove the old constraint, create an Axis and choose friction/collision settings. **Interaction/result:** the assembly gains a constrained degree of freedom without changing its models. **Next decision:** tune resistance and break behavior. **Limit:** reducing friction does not solve every collision or alignment error. A meaningful editor exposes the relationship that causes the problem. [D6] [D8]

### C. Share a functioning idea

**Intent:** give a collaborator a working assembly rather than a picture. **Conditions:** connected, duplicator-compatible entities. **Actions:** duplicate the constrained structure and restore it in a compatible environment. **Interaction/result:** parts and their relationships travel together. **Next decision:** adapt its scale, controls or context. **Limit:** a dependency unavailable to the recipient, an unsupported custom state or a server limit can defeat portability. Do not confuse successfully creating a dupe with verifying every destination. [D9] [D4]

### D. Tell a story with a pose rather than a dialogue system

**Intent:** stage a comic image of a character reacting to an absurd machine. **Conditions:** a poseable ragdoll, appropriate tools and lighting. **Actions:** freeze a posture, adjust face/fingers/eyes, position the camera and compose the frame. **Interaction/result:** a deliberate bodily arrangement conveys an emotion the NPC did not autonomously experience. **Next decision:** change expression, viewpoint or the next panel. **Limit:** a convincing still image is not evidence of a persistent personality or self-directing agent. The author performs that meaning. [P2] [R1]

### E. Hide as an ordinary object

**Intent:** survive a Prop Hunt round. **Conditions:** a mode/server supporting the documented disguise behavior. **Actions:** choose a plausible prop, position it among environmental objects and decide whether to stay still or relocate. **Interaction/result:** Hunters must distinguish a player from decoration under a penalty for careless attacks. **Next decision:** exploit their uncertainty or escape once discovered. **Limit:** small size is not universally best, and taunt/rotation rules vary. The game needs readable search possibilities, not simply perfect camouflage. [P3]

### F. Decide whether suspicion is enough

**Intent:** protect the innocent team in TTT. **Conditions:** hidden roles and an ambiguous encounter. **Actions:** compare what was witnessed with others' claims, watch the suspect or act before another death. **Interaction/result:** certainty has a time cost; a premature attack can hurt the team and affect Karma. **Next decision:** revise whom to trust. **Limit:** a scoring rule cannot establish every participant's knowledge or good faith. The creator's moderation discussion shows why both automatic penalties and human judgment have limits. [T1] [T3]

### G. Diagnose a friend's missing creation

**Intent:** use the same map or model as a friend. **Conditions:** their session references content absent locally or unavailable to the server. **Actions:** identify the required add-on, distinguish installation from server availability, and check whether the asset is now included or still an external dependency. **Interaction/result:** the problem may be content compatibility, not a failed construction technique. **Next decision:** install an appropriate dependency, substitute content or choose another session. **Limit:** the 2025 bundled-assets change excludes maps and some audio; it did not make all Workshop combinations self-contained. [D2] [D4] [P8]

## 6. Art, audio, interface and accessibility

Garry's Mod offers a **mutable presentation vocabulary** rather than one mandatory authored tone. Reused characters, physics props, new models, posed faces and customized lighting can produce comedy, horror or a carefully composed scene. The Cinemacrunch reviewer specifically values staging and cinematic composition; Dylan Oke values unpredictable creative collision. These are different uses of the same tool space. [R1] [R2]

The interface alternates between embodied first-person selection and an editor-like cursor. The context menu permits selecting object parameters without turning the viewpoint. This makes a situated object inspectable, but it also requires learning that the same mouse can be controlling the world view or a menu. Model selection is a preference with server-dependent visibility, not a guaranteed shared identity. [D2]

**Interpretation:** a rough or deliberately incongruous aesthetic can make recombination inviting: the user need not match an entire art-directed campaign before making something funny. The opposite risk is incoherence or unreadability. An entertaining edited video can hide the configuration, failures and waiting that preceded it; the Bananatic reviewer explicitly finds ordinary sessions less reliably entertaining than friend-group videos. [R3]

Sound is similarly contextual: weapon and physical effects, player voice, mode-specific audio and shared media do not form one universal campaign score. The September update's stereo enhancements and audio-option visibility demonstrate ongoing work on presentation. They do not prove that every important cue has an equivalent visual or captioned form. [P1]

Mouse precision, dense tool settings, download configuration and fast voice-based deduction create different access demands. Quiet solo posing or a trusted group's slower construction session can be a materially different experience from public competitive play. No assistive-technology setup, controller profile, caption coverage or hardware benchmark was personally tested. A reviewer calling the game suitable for everyone is not sufficient accessibility evidence. The dossier therefore identifies the demands without declaring universal accessibility.

## 7. Production, distribution and sustainability

In Christopher Livingston's December 24, 2019 interview, Newman connects the name to JBMod, describes discovering ragdoll-bone freezing accidentally, and explains how selling a new version justified sustained development. Valve's Erik Johnson emphasizes iteration with community feedback and Steam's role connecting creators and users. Newman says maintaining compatibility had become difficult and credits Rubat and Willox with ongoing work. These are historical production accounts, not a current staffing audit. The 2026 update independently establishes continued maintenance. [P5] [P1]

The same interview reports **just over 15 million copies cumulatively and roughly 1.5 million per year in 2019**. Those are dated creator statements, not current totals. More recent secondary sales claims appeared during research, but their underlying disclosure was not independently recovered here; no current lifetime revenue or profit is inferred. The first-party source supports a sustainability argument narrower than “UGC automatically pays for itself”: Newman says sales made continued work worthwhile. [P5]

At the September 26 capture, Steam displayed **$9.99 USD**, **540,403 English reviews with 97% positive**, and **7,210 recent reviews with 97% positive**. These are offer/review-display measures, not units, simultaneous players, retention or earnings. Bundles, discounts, historical prices, refunds and operating costs make multiplying that price by another statistic invalid. Server hosting and add-on development also have their own costs and arrangements, not one base-game subscription model. [P6]

TTT supplies a more specific distribution history. A September 2009 alpha formalized an improvised Zombie Master community game. Rapid iteration, the Fretta contest and inclusion in Garry's Mod widened access; the author reports a further traffic jump when streamers/YouTubers discovered it around 2012–2013. He received a contest prize but describes poor financial compensation relative to the work. This is evidence of a path from local play practice to distributed mode, not a measured attribution of Garry's Mod sales or a promise that popular creators capture platform value. [T2]

**Interpretation:** the shareable units differ—an assembly, comic, video, server invitation and complete mode each ask a different amount of work from the recipient. Useful growth can come from people consuming those units without becoming creators. However, discovery, compatibility, welcoming groups and creator incentives remain separate problems. The existence of many add-ons does not by itself solve them.

## 8. Five written reviews and contrasting Steam evidence

The following five independently credited bodies were read in substance and through their conclusions. They span **three external blog/player-review sites and Steam**. They are not equivalent to five professional publications, controlled tests or a representative sample. Detailed positive and negative Steam sampling is additionally identified below. Promotional quotations, search snippets and inaccessible reviews are excluded from the count.

### 1. roshmishra9 — Cinemacrunch, September 18, 2024

The writer values a long-lived creative playground: NPC battles, friends, a large model/map supply and deliberately staged scenes. Posing, lighting and cinematic composition are especially important, making this more than a recommendation of chaotic multiplayer. The review is strongly positive with little sustained criticism. Its broad audience recommendation is not adopted as an age-rating or accessibility finding; its value judgment belongs to this author's use case. [R1]

### 2. Dylan Daniel Oke — Dylan's Morsels, May 22, 2020

Oke separates conventional polish from personal value. Unpredictable human creativity makes the purchase worthwhile even when the surrounding experience is unpleasant or incoherent. The reader must tolerate searching through unwanted material to find something delightful. This is a positive account with a substantive filtering cost, not proof that any randomly selected public server will supply the experience being praised. [R2]

### 3. “gay guy” — Bananatic, August 19, 2017

This player reviewer approaches from a preference for competitive shooters. Prop Hunt and short, silly sessions with friends work; repetitive mods and long stretches without novelty work less well. Despite an 8/10 rating, the body is ambivalent about extended play and warns that ordinary friends may not recreate the comedy seen in edited videos. The unpolished personal style is retained as a source-quality distinction rather than presented as professional criticism. [R3]

### 4. AspiringDev — Steam, May 21, 2019, not recommended

The detailed account recalls years of friendship and changing modes, then explains difficulty finding the specific communities and activities once enjoyed, including Morbus and Stop It Slender. Download and server-discovery friction are central. The displayed **2,097.8 hours** at retrieval are not assumed to be hours at publication. This is a historical disappointment with the accessible multiplayer ecosystem, not evidence that the toolkit itself stopped working. Demographic generalizations are not adopted. [S1]

### 5. Grimm — Steam, May 18, 2021, not recommended

Grimm explicitly limits the criticism to multiplayer while retaining affection for solo play and add-ons. The long account describes community-administration burdens, conflicts and the loss of valued groups. Its displayed **5,595.5 hours** likewise do not establish publication-time exposure. The useful distinction is between maintaining a game and maintaining a social environment. Unverified allegations about third parties are omitted; the personal experience is not generalized into prevalence claims. [S1]

### Helpful Steam surface and additional firsthand testimony

The **English Most Helpful (All Time)** positive and negative surfaces were inspected on September 26. On the positive page, **TonySoprano, June 5, 2022**, lists the breadth of activities as the purchase's value; **Axum, October 18, 2017**, describes posing as a route into image-making and later study/work. The latter is a personal learning narrative, not independently verified career causation. Meme-only and reaction-bait entries were not treated as substantial reviews. [S2]

The two detailed negative bodies above came from the actual negative helpful surface, not from an invented sample. Their age matters: they cannot establish current missing assets or the state of every 2026 server. The earlier mechanics owner contained these same accounts; their bodies were retrieved again here, preserving rather than replacing the earlier context. [S1]

The 2023 Cinema retrospective adds a noncompetitive counterexample: a finished social activity can matter more than building or winning. Its health-related personal claims are not used as clinical evidence. [S3]

**Synthesis:** separate creative fit, novelty, solo-versus-group preference, content discovery, community continuity and technical compatibility. A positive platform-wide review ratio can coexist with disappointment in a particular server ecosystem. Better tools alone cannot recreate old friendships; stricter rules alone cannot guarantee playfulness; a friend group's entertaining video does not establish the experience of joining alone.

### Retrieval limits

The direct PC Gamer review could not be retrieved, Eurogamer was robots-blocked, and TrueSteamAchievements routes failed. The CVG archival lead did not resolve. None is counted as read, and the official site's PC Gamer 88 quotation is not promoted into a full review. The complete accessible 2019 interview is primary production evidence, **not a substitute review**. These distinctions prevent the five-review count from implying a professional corpus that was not obtained.

## 9. OpenLegend inspiration — interpretation, not accepted requirements

**Objects need useful relationships.** The hinge-versus-weld example suggests that composition can be more meaningful than a growing catalog of named items. A player should understand which connection caused a behavior and how to revise it.

**Support consuming, adapting and creating.** A reusable artifact should be usable before its recipient becomes an expert. Ready-made activities can welcome people who never intend to author one. Neither route should erase the other.

**Separate narration from execution.** Posing a fearful face, typing a role-play action and simulating an actor's fear are different capabilities. Borrowing the expressive surface does not automatically supply underlying cognition or consequences.

**Portability includes dependencies and permissions.** Sharing a recipe for an invention is insufficient when its components or allowed operations disappear at the destination. A visible boundary is preferable to an apparently successful import with silently missing behavior.

**Social richness has operating requirements.** Human trust, administration and continuity are part of the experience, not free by-products of multiplayer. Conversely, replacing every ambiguous decision with rigid adjudication can remove the very social negotiation players enjoy.

**Do not copy absence of goals indiscriminately.** Garry's Mod supports self-directed creators and many bounded games. An OpenLegend world may need stronger invitations, stakes or onboarding. The transferable pattern is multiple depths of participation—not a requirement to abandon authored structure, simulate every tool, reproduce protected assets or make every server rule universal.

## 10. Coverage and preservation

| Requirement | Substantive owner |
| --- | --- |
| R01 identity/version/promise | §1, including free-mod/standalone and current-update boundaries |
| R02 actions/mechanics | §2–4; shipped tool families and mode-specific operations |
| R03 objects/composition | §2–3; constraints, NPC/prop distinction and duplication |
| R04 progression/economy/time | §3–4 and §7; no universal Sandbox RPG progression |
| R05 situations | Seven worked cases in §5 |
| R06 people/AI/multiplayer | §2 and §4; human social deduction versus NPC behavior |
| R07 art/audio/UI/access | §6, with explicit untested accessibility/performance limits |
| R08 narrative/meaning | §4, §5D and §6; role-play, parody and authored presentation |
| R09 production | §7 and current release notes |
| R10 distribution/sharing | §3, §7 and TTT's documented discovery history |
| R11 commerce/participation | Dated creator and storefront evidence in §7 |
| R12 reception | Five written blog/player reviews, both helpful Steam surfaces and retrieval limits in §8 |
| R13 patterns/limits | §9 and labeled interpretation throughout |
| R14 evidence/preservation | This section, source annotations and preserved routes |

Both prior owners were read in full and remain unchanged. They preserve the moving-contraption experiment, Prop Hunt hiding case, TTT trust problem, precise axis/weld comparison, structured duplication, creator history, Steam disagreements, July 2025 dependency qualification and original viewing links. The dossier adds the full pass without converting these sources into an implementation plan. The global seven-file packet audit remains a separate pending gate.

**Viewing route:** the earlier chapter links GrobeMan's 2017 beginner video and a 2020 friends-playing-Prop-Hunt video. Keep the former's historical UI/add-on caveat and the latter's community-mode boundary. Neither was played in this research; no timestamps, visual observations or purported watched durations are invented.

## Annotated sources

All accessed September 26, 2026 unless a historical publication/capture is specified. Facepunch wiki entries are first-party-hosted documentation, sometimes old; current release notes take precedence where they conflict. Main article bodies were read, not every global wiki-navigation entry or every technical changelog line.

- **P1 — [September 2026 update][P1].** Rubat, September 16; current build/UI/NPC/audio changes and compatibility caveats. No benchmark performed.
- **P2 — [Using Tools][P2].** Explicit shipped-tool inventory and basic selection/configuration flow. Several individual legacy tool links failed; no unread page counted.
- **P3 — [Prop Hunt][P3].** Mode rules and settings-dependent controls; not every fork's specification.
- **P4 — [DarkRP][P4].** Commands, administration and extension boundaries. Its relative age/popularity wording is not a verified current ranking.
- **P5 — [Livingston's Newman/Johnson interview][P5], December 24, 2019.** Full substantive interview read; primary production, pricing intent and historical sales testimony, not contemporary staffing or revenue data.
- **P6 — [Steam store][P6].** Dated offer, release and filtered review displays; promotion is not independent criticism.
- **P7 — [Official landing page][P7].** Toolkit, cooperative-building and modified-Source positioning.
- **P8 — [July 2025 update][P8].** Primary included-assets/exclusions and player-facing fixes, July 23. Current ownership boundaries qualify older instructions.
- **D1 — [Quick Start][D1].** Local-map entry and baseline controls; old screenshots were not analyzed as current UI.
- **D2 — [Context Menu][D2].** Object inspection, NPC options and server-dependent model identity.
- **D3 — [Sandbox][D3].** Default mode and spawnable object families.
- **D4 — [Addons][D4].** Content types and installation routes; not a security endorsement of arbitrary downloads.
- **D5 — [Physics gun][D5].** Manipulation, rotation, freezing and release; permissions may constrain multiplayer use.
- **D6 — [Axis][D6].** Degrees of freedom, friction, collisions and break-limit semantics.
- **D7 — [Weld API][D7].** Existing granular study's fixed-relationship evidence; retained source ownership rather than a new code experiment.
- **D8 — [Remover][D8].** Different entity/assembly/constraint deletion scopes.
- **D9 — [Duplicator copy][D9].** Structured entities-and-constraints documentation, not proof of arbitrary add-on serialization.
- **T1 — [TTT homepage][T1].** Included-mode status, hidden roles and updated asset prerequisite.
- **T2 — [TTT history][T2].** Creator's origin, contest, compensation and streamer-discovery account. Retrospective causal testimony is not sales attribution.
- **T3 — [TTT Q&A][T3].** Creator's gameplay/moderation views and explicit limits of recent personal play/admin experience.
- **T4 — [Where to play TTT][T4].** Useful entry route; internally inconsistent legacy prerequisite sentence explicitly qualified in §1.
- **R1 — [Cinemacrunch review][R1], September 18, 2024.** Full personal review; strongly positive creative/staging lens.
- **R2 — [Dylan Oke review][R2], May 22, 2020.** Full short essay; value despite cultural and filtering friction.
- **R3 — [Bananatic review][R3], August 19, 2017.** Full player-submitted criticism; ambivalent long-session/novelty lens.
- **S1 — [Steam negative helpful surface][S1].** AspiringDev and Grimm bodies read; unsupported third-party accusations excluded and current displayed hours not backdated.
- **S2 — [Steam positive helpful surface][S2].** Specific testimony distinguished from jokes; all-time selection bias and historical dates explicit.
- **S3 — [Cinema-mode retrospective][S3], 2023.** Firsthand social-use account and discussion; not representative or medical evidence.

[P1]: https://gmod.facepunch.com/news/september-2026-update
[P2]: https://wiki.facepunch.com/gmod/Using_Tools
[P3]: https://wiki.facepunch.com/gmod/gamemodes/PropHunt
[P4]: https://wiki.facepunch.com/gmod/gamemodes/DarkRP
[P5]: https://www.pcgamer.com/garrys-mod-interview/
[P6]: https://store.steampowered.com/app/4000/Garrys_Mod/
[P7]: https://gmod.facepunch.com/
[P8]: https://gmod.facepunch.com/news/july-2025-update
[D1]: https://wiki.facepunch.com/gmod/Quick_Start
[D2]: https://wiki.facepunch.com/gmod/The_Context_Menu
[D3]: https://wiki.facepunch.com/gmod/gamemodes/Sandbox
[D4]: https://wiki.facepunch.com/gmod/Addons
[D5]: https://wiki.facepunch.com/gmod/Using_your_Physgun
[D6]: https://wiki.facepunch.com/gmod/Tools/Axis
[D7]: https://wiki.facepunch.com/gmod/constraint.Weld
[D8]: https://wiki.facepunch.com/gmod/Tools/Remover
[D9]: https://wiki.facepunch.com/gmod/duplicator.Copy
[T1]: https://www.troubleinterroristtown.com/
[T2]: https://www.troubleinterroristtown.com/about/history/
[T3]: https://www.troubleinterroristtown.com/about/faq/
[T4]: https://www.troubleinterroristtown.com/help/where/
[R1]: https://www.cinemacrunch.net/single-post/garry-s-mod-review
[R2]: https://dylanoke.wordpress.com/2020/05/22/garrys-mod-review/
[R3]: https://www.bananatic.com/games/garrys-mod-b2p-174/garrys-mod-review-2017-4085
[S1]: https://steamcommunity.com/app/4000/negativereviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/4000/reviews/?browsefilter=toprated
[S3]: https://www.reddit.com/r/patientgamers/comments/112w39s/i_thought_i_was_done_with_gaming_until_i_played/
