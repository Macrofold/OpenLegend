# Dreams — full research dossier

**G13 · Full research pass completed September 26, 2026.** [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Project Spark remains a separate pass. No personal gameplay, complete-video viewing, representative player survey or proprietary-code audit is claimed.

**What the player actually does:** Dreams combines a library of playable and audiovisual creations with tools for making more of them. **DreamSurfing** is the play/discovery route; **DreamShaping** is creation. A person can complete an authored adventure, try several small community games, listen to music, browse art, or build and share something. Creation is not a prerequisite for playing the included experiences. [DR14](#dr14)

The player-facing **Imp** and **Dream Queen** introduce this space. Giving a creation a Thumbs-Up or useful comment supplies another form of participation. An ordinary first session can begin with **Art's Dream**, rather than an empty editor. Its point-and-click, combat and platforming sections make the toolset's breadth concrete. [DR14](#dr14)

**Interpretation:** Dreams contains several products that must be evaluated separately: worthwhile play, approachable authorship, component reuse and a community/discovery service. A creator finishing a usable door and a visitor finishing an adventure have achieved different things. Neither should be judged only by the number of uploaded objects.

## 1. A component, a scene and a discoverable game are different objects

Media Molecule distinguishes **Elements**—reusable pieces—from self-contained **Scenes**, **Dreams** linking Scenes, and **Collections** organizing these creations. A Scene must be inside a Dream to appear in **DreamSurfing**; an Element does not become a discoverable finished game simply because it exists. [DR01](#dr01)

**Interpretation:** creating a useful component and giving someone a satisfying first session are different accomplishments. A tree, musical phrase or logic assembly can have value without being a standalone game, while a finished activity needs an understandable entry and ending. The hierarchy allows both specialist contributions and broader playable compositions.

**Constructed choice:** use an existing movement-capable character as a starting point, build a small environment around it, then package the Scene for others to play. That avoids requiring the same person to solve sculpture, controls, sound and game design before testing an idea. The next problem is still whether the resulting activity is worth playing, not whether the publication button succeeded.

## 2. The authoring vocabulary separates form, presentation and behavior

**Assembly Mode** puts scenes and gadgets together. **Sculpt** creates shapes; **Paint** creates three-dimensional strokes made of flecks; **Coat** alters surface appearance; **Style** changes fleck properties; **Effects** animates them; **Sound** supports instruments, effects and voices. **Test Mode** lets the creator exercise a scene and adjust gadget properties without treating every sculptural manipulation as a persistent change. [DR02](#dr02)

**Interpretation:** a rendered object, its visual treatment and its actual behavior are different design layers. Giving a shape a glowing finish does not automatically make it illuminate a useful area or damage a character. Keeping layers distinct permits the same behavior to acquire another appearance without implying that the appearance alone implements a rule.

The **Imp** is both a manipulable pointer and an identity-bearing interface. Possessing a configured character transfers control into it; leaving returns to Imp interaction. Groups and nested scope determine which objects are edited or moved together. Gadget input/output ports carry signals, including richer multi-value wires, rather than arbitrary natural-language claims. [DR03](#dr03)

**Constructed situation:** a lift works but its switch stays behind. Move the switch into the lift's moving subgroup so the usable control travels with it. This is a grouping/ownership problem, not a need to regenerate the whole mechanism. The official Ancient Dangers lesson demonstrates exactly this distinction. [DR04](#dr04)

## 3. Small explicit relationships create a playable predicament

The **Ancient Dangers Play & Edit 3** tutorial connects two switches through an **AND gate** to a main portcullis. Both paths must be completed in one play session before the central gate opens. It separately wires a **Trigger Zone** to an **Emitter** that creates a rolling spiked-ball hazard. [DR04](#dr04)

**Constructed interaction:** place the zone where a player's movement creates a clear warning/opportunity, rather than simply adding an unavoidable trap beside the spawn point. A detection condition, emitted object and physical route produce the danger together. Changing the zone changes when the same object becomes a threat; changing the route changes whether avoiding it is a meaningful choice.

**Interpretation:** a mechanic needs an actual condition and outcome. A label saying this is a two-switch door is weaker than a condition that reliably waits for both signals. Conversely, a technically working circuit can still produce a dull or unfair activity. Functional correctness and enjoyable placement are separate tests.

## 4. Reuse changes both author effort and resource cost

The same tutorial shows that repeatedly stamping expensive enemies can exhaust the gameplay thermometer. It teaches separating an emitted effects group from repeated triggers and sharing one emission reference; a health potion reference can similarly supply several spawned instances. [DR04](#dr04)

**Interpretation:** reusable design is not just copying visible shapes. Shared definitions and independently placed triggers can reduce repeated stored work while supporting different local situations. A finished room must still operate within its runtime constraints; reuse does not mean unlimited simultaneous complexity.

**Update Mode** lets a creator inspect or choose a component version, adopt the latest, or opt into automatic updates. It separately exposes replacing local changes and explains unavailable versions. Its tree example preserves a local leaf-colour edit while adopting a changed sway property from the original. [DR05](#dr05)

**Constructed choice:** accept an improved shared object or retain the version around which the scene was designed. Automatically taking a new version is a convenience, not proof that it preserves the scene's intended timing or appearance. A creator needs to see which properties changed and test the actual result.

## 5. Animation can be performed, edited or baked

The June 21, 2023 **Action Recorder** update added Keyframe, Possession and Physics recording modes alongside recorded actions. Its **Animation Canvas** supports retiming, splitting, blending and individual tracks. Physics Mode records existing simulated or logic-driven motion for later playback; it does not turn every recorded movement into a new physical rule. [DR06](#dr06)

**Constructed comparison:** animate a character's greeting as a reusable recorded performance, but leave a falling obstacle responsive to the player's actual collision. Baking the latter can save work when the desired result is a fixed cinematic; it can remove the variation that made an interactive obstacle interesting. The author must choose which behavior is supposed to remain contingent.

Media Molecule explicitly connected the redesign with reducing repeated editor switching and expensive animation setups. **Interpretation:** a feature may be powerful yet tedious to express. Improving authoring can preserve the meaningful choice—what movement to create—while removing bookkeeping. The published performance claims are developer descriptions, not measurements made for this research. [DR06](#dr06)

## 6. Collaboration grants specific rights, not universal ownership

**PRIVATE** saves, **PLAYABLE** releases and **PUBLIC** releases are different states. Public permits remixing; playable permits experiencing the work without granting its editable contents. A remix becomes a new creation with original attribution. A collaborator can edit/use permitted versions but cannot simply release the owner's creation. Rights over an already obtained stamp persist even after deletion or removal as collaborator. [DR07](#dr07)

**Constructed situation:** a musician contributes a private component to a collaborator's scene. That invitation is not blanket permission to distribute its editable internals. The author must resolve the particular dependency's permissions before choosing a broader release. Conversely, removing future collaboration access cannot be assumed to erase all earlier legitimate use.

**Interpretation:** reuse needs an explicit relationship among identity, version and permission. Credit, discoverability, edit access and continuing use are separate promises. A platform that conflates them can make creative cooperation feel unsafe even when the editor itself is pleasant.

A creation's **Lead Version** is its latest public/playable release; **Latest Online Version** can instead be a private work-in-progress. An audience can therefore keep encountering a released experience while collaborators develop something newer. [DR08](#dr08)

**Constructed choice:** save an experimental version without replacing the published build. That supports iteration without making every unfinished edit someone else's next play session. It does not establish that all future component changes remain compatible or that hidden content can be published without its owner's rights.

## 7. Ending live development was not ending access

The April 11, 2023 announcement ended regular live support after September 1 while retaining play, creation and sharing. Media Molecule said it had not identified a sustainable path for continued expansion. It also ruled out planned online multiplayer, native PS5/PSVR2 and 3D-printing additions. Exporting a runnable creation remained different from recording music/video through PlayStation sharing. [DR09](#dr09)

**Interpretation:** a locally cooperative game and an online sharing community do not prove online gameplay multiplayer shipped. Similarly, retaining the software is a narrower promise than continuing every event, editorial service or feature roadmap. No inspected evidence establishes that adding one absent feature would have reversed the support decision.

The September 13 follow-up confirms the Animation update, **Tren** and restored Audio Importer as completed final releases. It also points to changed content-usage terms for art, music and imagery outside Dreams; that is not an announcement of general standalone game export. [DR10](#dr10)

### The discovery service changed again in 2024

Media Molecule's March 20, 2024 account describes the departure of the curation team and the end of live DreamSurfing/DreamShaping curation in mid-April. Its replacement approach combines tags and the **Recommender** with retained curated collections; promised Impsider editorial coverage was reduced. [DR11](#dr11)

**Interpretation:** keeping a catalogue reachable is not identical to maintaining a staffed discovery program. Automatically rotating recommendations might help a new creation reach players, but the announcement does not measure that outcome. A creator ecosystem needs a route from publication to relevant attention, not merely another successful upload.

A February 26, 2025 **v2.65** patch updated backend software. This qualifies a literal claim that absolutely no maintenance happened after 2023 without implying resumed feature development. [DR12](#dr12)

## 8. Preservation and progression also have resource limits

The May 22, 2023 migration introduced online limits including **5GB**, **256 creations** and **512 versions per creation**, with pre-migration creations excluded from those new limits. It removed Prize Bubble asset rewards and unlocked existing Media Molecule prizes for everyone. Older instructions to earn those assets by popping particular bubbles are historical. [DR13](#dr13)

**Constructed consequence:** a creator can reuse an unlocked asset without replaying a former reward gate, but still has to budget a growing project's stored versions. More freely available ingredients do not eliminate storage or editing constraints. The limits on published data are also separate from a scene's runtime thermometers.

The migration narrowed some history/search features to recent activity, and **Homespaces** became local rather than visitable. [DR13](#dr13) [DR09](#dr09) **Interpretation:** a surviving object does not imply every previous route to finding or visiting it survives. Research must describe what users can do now, while retaining the earlier social design as history.

### Progress depends on the activity, not one universal loot ladder

Dreams' creation hierarchy and contrasting originals do not imply one shared equipment economy. An adventure's checkpoints, a racing challenge's score and an author's saved version solve different continuity problems. [DR01](#dr01) [DR17](#dr17) [DR20](#dr20)

**Interpretation:** an inexperienced author may first place existing pieces, then modify them, then construct original behavior. An experienced contributor may specialize in music or sculpture instead of making a whole game. The meaningful accumulation is practical skill, reusable work, collaborators and audience response—not necessarily another unlockable item. Once basic controls are learned, a self-chosen project or another person's request can supply direction. That is an analytical model of the documented activities, not a measured retention funnel.

## 9. Art's Dream gives varied mechanics one emotional subject

**Premise and early-character spoilers; no ending solution.** Art is a double-bass player whose pride and departure from his band have left him isolated. **Laila**, a childhood friend and singer, is among the people affected. **Hector**, a taunting figure in Art's dream, turns ordinary travel into another obstacle. These are authored characters, not independently reasoning social agents. [DR15](#dr15)

The production began with three separate games that became one narrative. A noir-inflected adult strand uses places such as a club, studio and train; **Frances and Foxy**, childhood toys, move through a brighter fantasy while trying to save **Lancewing** from **Thornbeak**. The robots **D-BUG and ELE-D** inhabit a **Digital Forest**, whose creators cite *Bambi* and *Blade Runner* among its contrasting influences. [DR16](#dr16)

**Interpretation:** changing genre can express a person's memories and fears rather than merely advertise how many genres the engine supports. Recognizable recurring concerns make stylistic variation coherent. A general creator platform benefits from examples that have something particular to say.

Frances' hammer and Foxy's ranged ability give different ways to participate in combat. Art's strand instead invites Imp-based environmental exploration and dialogue attitudes; the robot sections demand timed movement. The official advice emphasizes numerous checkpoints rather than a limited stock of lives. It also credits **Daniel Casimir** for bass performance and **Rachel John** for Laila's singing. [DR15](#dr15) [DR17](#dr17)

**Constructed comparison:** after fighting while moving, the player enters a section where observing the jump rhythm is more useful than attacking rapidly. A failed jump returns to a nearby opportunity to learn. Progress in one action vocabulary is not automatically competence in another. Short recovery makes a story with several play styles more accessible without declaring every action successful.

**Interpretation:** music is connected to who these people are, not only a background asset category. Performance, stylized environments and changing actions can communicate an inner life without requiring an open-ended conversation system. The dossier uses written production credits; it does not claim an independent complete soundtrack analysis.

## 10. Other originals turn the toolset into distinct activities

### Ancient Dangers: a clear shared predicament

Released November 30, 2021, **Ancient Dangers: A Bat's Tale** is a third-person dungeon adventure starring **Scoria**, joined by twin **Gabbro** in local two-player cooperation. Players fight monsters, avoid traps, solve puzzles and pursue higher scores through Berserk chains. Its comic premise involves a remedy for a grandmother's snoring, rather than treating every fight as an abstract editor demonstration. The accompanying DreamShaping overhaul explicitly addressed how overwhelming creation could feel, using clearer templates and entry points. [DR18](#dr18)

**Interpretation:** a worked example serves both audiences: an ordinary player gets a purpose, while a creator can ask how a particular trap or encounter was made. The play-and-edit lessons in §§2–4 then break that understandable experience into reusable parts. Local cooperation here does not establish the undelivered online-multiplayer feature.

### Tren: cargo changes the fastest route

In **Tren**, wooden-toy trains navigate tracks, junctions, ramps and mechanisms in an attic-like setting. Stephen Tailby's August 2023 review praises its motion, music and playful construction while noting occasional collision problems and camera-relative direction confusion. Timed runs and delivery puzzles require different approaches: speed can derail a train or lose cargo rather than unconditionally improve the result. [DR19](#dr19)

**Constructed situation:** a detour collects cargo that subtracts from the final time. It should be worth taking only when the reward compensates for the delay and risk. Media Molecule's actual lesson asks creators to test with and without the pickup, adjust its value, and correctly restore the expected wagon/cargo at checkpoints. The same kit also permits disabling the time challenge and instead requiring delivery of a specified cargo amount. [DR20](#dr20)

**Interpretation:** a resource is meaningful when it changes the plan. An attractive pickup that never improves the result is decoration masquerading as strategy. A checkpoint that fails to restore a required ingredient can make a legitimate retry impossible; that is not an interesting difficulty increase. Changing the success rule can make the same physical railway a different game.

### Community creations need not resemble the originals

Richard Wakeling's March 2020 review describes **Southpaw Cooking**, built around the awkwardness of preparing food one-handed while on the phone, and **Dog's Run**, a recreation involving the creator's dog **Binkie** that made the critic consider commemorating his own pet. He also describes small action games, music videos and longer role-playing experiments. [DR21](#dr21)

**Interpretation:** the distinctive sharing unit can be a joke, a personal memory or a small mechanical constraint, not only a large campaign. This makes breadth useful without making every visitor responsible for discovering a masterpiece in an undifferentiated catalogue. Those named works are historical reviewed examples, not a claim that all community creations share their quality or rules.

## 11. Music and sound have both expressive and operational structure

The October 2020 music update added a broader, more consistently presented instrument library and **Clips**: prepared musical phrases sharing a key and tempo. Full tracks and shorter starting points support different depths of remixing. **Effect Fields** can act over selected timeline rows and synchronize effects to tempo. The update also changed some instrument levels, with an explicit recommendation to update existing work carefully. [DR22](#dr22)

**Constructed choice:** begin with compatible phrases, replace an instrument, then perform an original part when a specific idea emerges. Apply a rhythmic effect to the intended tracks without transforming unrelated sound. The author can make a meaningful musical decision before learning every low-level production operation. Taking a new version of an instrument still calls for checking the resulting mix, not assuming compatibility from its name.

Dreams distinguishes sound instances, voices and lower-level grains. Its **Audio Analyser** associates cost with a frame from the captured scene, helping identify moments that exceed practical limits. Many simultaneous voices/effects and large amounts of imported audio create different costs; the standard library's preinstalled samples avoid additional sample-download cost. [DR23](#dr23)

**Constructed diagnosis:** a dramatic entrance should trigger a sound, but the scene is already saturated with other audio. Inspect the relevant budget and competing sounds rather than rewriting the narrative to explain an unintended silence. Reducing redundant voices, reusing a suitable sample or changing when sounds overlap preserves the intended event. These are design applications of documented constraints, not measured experiments performed here.

The **Audio Importer** provides a separate route to recording, editing and importing original sounds, with tuned/non-tuned instrument guides. Its existence is verified; this pass did not sign in or upload a sample. [DR24](#dr24)

## 12. Controls and presentation are part of the creation problem

Dreams' fleck-based sculptural and painted language permits softness, visible marks and stylization rather than requiring a conventional polished-mesh appearance. Its interface lets an author manipulate a three-dimensional object while grouping, testing and observing it. The different modes expose those roles explicitly. [DR02](#dr02)

Wakeling finds the creation controls learnable but initially demanding. Motion-controlled pointing, non-motion controls and PlayStation Move involve different tradeoffs: physical sculpting and navigating a complex interface are not the same task. His praise for extensive hands-on teaching coexists with that learning burden. [DR21](#dr21)

**Interpretation:** an interface can be powerful without being immediately transparent. Familiar objects do not make camera control, nested selection or signal wiring familiar. A good first project limits the number of unfamiliar operations required before a meaningful result appears.

### VR changes both the action vocabulary and the comfort contract

The July 22, 2020 VR release added **Inside the Box**, including **Box Maze**, **Box Blaster** and **Box Escape**, plus new head/hand tracking and look-cursor gadgets. Authors can attach behavior to where a person looks or what their Imp grabs. **Comfort Mode** reduces/removes camera motion; compatibility labels distinguish Non-VR, uncertain, VR-compatible and VR-only creations. Players can also indicate the level of VR experience a creation requires. [DR25](#dr25)

**Constructed contrast:** a gaze-selected object is useful only when looking and selecting remain distinguishable enough for the activity. A dramatic moving camera can become uncomfortable even when it looked good on a flat screen. Compatibility and comfort feedback belong near discovery, before the player commits, rather than being assumed from the game's title.

The 2023 support announcement's absence of native PS5 and PSVR2 versions is distinct from playing the PS4 game on supported PS5 hardware. Tren's official release account itself addresses PS4 and PS5 play. The original PSVR release does not establish a PSVR2 conversion. [DR09](#dr09) [DR26](#dr26)

## 13. Production: progressively deeper authorship was a deliberate design

In Jack Yarwood's 2019 interviews with **Jon Eckersley and Abbie Heppe**, the toolset grows from experimental sculpting work associated with **Anton Kirczenow**. **Kareem Ettouney's** preference for preserving concept art's expressive character influenced its direction. Their account describes consistent concepts across tools and an approach called **Stealth Create**: begin by using something, then alter it, then learn to make it. A small operation such as repeated cloning can become a practical staircase-building tool. [DR27](#dr27)

**Interpretation:** approachable creation need not mean withholding powerful tools forever. It means making each additional level of control answer a question the user already has. The studio's explanation is evidence of intent and iteration, not proof every newcomer reached those later levels or that every tool shared one simple implementation.

**John Beech's** account of Tren supplies a concrete internal adoption story. It began through creative jams and spare-time work before becoming a supported studio project with production milestones and review. His father's handmade wooden trains and his own home-renovation experience informed its imagery and setting. [DR26](#dr26)

**Interpretation:** a successful prototype can originate from personal fascination, while shipping the larger experience still requires coordination and scope control. An all-in-one creation tool does not eliminate art, sound, testing or production judgment. The same creator can benefit from both an expressive playground and a conventional process for finishing.

The delivered update sequence—music, VR, beginner templates, animation, migration and final originals—shows continued change to both play and authoring. The later support/curation decisions must remain part of that history rather than being described as a sudden disappearance of all functionality. [DR06](#dr06) [DR11](#dr11) [DR13](#dr13) [DR18](#dr18) [DR22](#dr22) [DR25](#dr25)

## 14. Distribution, promotion, community occasions and economics

Dreams entered Early Access in April 2019 and reached its full PS4 release on **February 14, 2020**. Media Molecule's launch announcement offered the full upgrade to existing Early Access owners and placed **Art's Dream** alongside the community catalogue. Its State of Play presentation and **Impy Awards** also made existing creators' work part of the product's introduction. [DR28](#dr28)

A May 2020 demo used a rotating selection of community creations and part of Art's Dream, with progress carrying into purchase. That historical sampling route is different from a promise that the demo remains available: the 2023 support announcement removed the trial. [DR29](#dr29) [DR09](#dr09)

Tren's August 1, 2023 release coincided with a PlayStation Plus monthly-game window, followed by the Extra/Premium catalogue route. These are dated distribution events, not current subscription entitlements or measured incremental sales. [DR26](#dr26)

**Interpretation:** letting a visitor play a worthwhile example lowers the burden of understanding the editor's promise. A creator showcase supplies another audience: someone can arrive because of a specific experience rather than a desire to become a developer. Neither route proves how many purchases it caused.

### A shared event can give a small contribution a destination

The 2020 **All Hallows' Dreams** event asked people to contribute rooms or pumpkins to a collective haunted-house experience. Its constraints protected how pieces could be assembled and encountered together. [DR30](#dr30)

**Constructed situation:** a creator supplies one memorable room within a known footprint instead of inventing and promoting an entire game. Another contributor supplies art or an object. The collective event gives those pieces a setting and an audience. Boundaries on scope are therefore not merely restrictions; they make independent work fit into a shared outcome. Historical event instructions do not mean submissions remain open.

### Finding, liking, following and saving are different operations

DreamSurfing documentation describes genre routes, **Mm Picks**, **Forever Popular**, archived playlists, tags, filters for prior play/following, and a **Play Later** queue. Following a creator and making a Collection provide continuity beyond a single recommendation. Its older promises of ongoing staffed weekly curation must be read with the 2024 correction in §7. [DR31](#dr31)

**Interpretation:** a discovery system should preserve a promising encounter when the user lacks time to act immediately. A creator's useful audience is not just everybody who can technically launch the platform. Matching, return routes and understandable context matter alongside publication.

Dreams' observed model is a paid creation/play product, with later subscription access and online-service obligations. The inspected sources do not provide an audited title budget, profit, comparable lifetime unit series or distribution of creator earnings. The studio's sustainability statement establishes its decision and explanation, not a financial diagnosis proving that a particular absent export, platform or monetization feature would have saved it. [DR09](#dr09) [DR28](#dr28)

**Interpretation:** artistic value, creator satisfaction, audience size and a sustainable service are different outcomes. An enjoyable niche community can still be insufficient for a chosen development cost structure. Conversely, ending regular development does not make the art or skills accumulated there worthless.

## 15. Reception: creation value and play value can diverge

| Inspected account | What it values | Friction or qualification |
| --- | --- | --- |
| Richard Wakeling, March 2020 | Variety, thoughtful instruction and a strong authored showcase. | Learning the creation controls still takes work; launch-period catalogue. [DR21](#dr21) |
| Stephen Tailby, August 2023 | Tren's physical feel, playful presentation and music. | Camera-relative input and occasional collision trouble; one original's reception, not all Dreams content. [DR19](#dr19) |
| SmokeyAdvance, January 14, 2025 | Entry into game development. | Reports performance limits on base PS4 and distinguishes creator value from player-only value. [DR32](#dr32) |
| Brigadeiro, January 13, 2025 | Creation and community. | Finds some teaching/tools frustrating; wishing for PC is not evidence a PC version exists. [DR32](#dr32) |
| LegendKrazy, August 19, 2023 | Returned through Plus and admired newer creations. | Still struggled to understand creation; renewed play interest does not establish editor mastery. [DR32](#dr32) |
| CriticFIN, November 17, 2023 | Some enjoyment of others' games. | Finds creation difficult and the play catalogue eventually insufficient for their interest. [DR32](#dr32) |

**Interpretation:** these accounts do not support one universal answer to whether Dreams is approachable or has enough to do. A person can value a creative social network, another can want a few finished games, and another can want professional export/distribution. Those are different expectations. A tutorial that helps a motivated specialist can still be too much work for someone who arrived simply to play.

The sampled reviews are not a census. A review posted in 2026 can describe its author's purchase years earlier; it is not automatically a current catalogue audit. Wishes for missing platforms, unverified financial explanations and sweeping claims about all community work are not promoted into facts. Positive attachment and legitimate criticism can coexist.

## 16. Transferable inspiration and limits

**Let people enter at the depth they need.** Play, place, modify, compose and author are different levels. A reusable OpenLegend mechanic should arrive with a comprehensible working situation, not require learning the whole engine before encountering value.

**A component is not a finished invitation.** Dreams' Scene/Dream distinction makes the packaging problem explicit. A new capability needs purpose, an entry point and legible consequences before ordinary players can judge it.

**Keep expression and behavior connected but distinguishable.** A stylized body, recorded performance and live interaction each contribute something. Do not infer an implemented capability from appearance, or remove expressive craft merely because it is not mechanically necessary.

**Make ownership and revision understandable.** Private collaboration, public remixing, published versions and retained earlier use have different consequences. Reuse is a social contract as well as a technical convenience.

**Resource limits should explain a practical failure.** A shared emitter, audio analyser or correctly restored checkpoint helps the author change the actual cause. A generic warning that a creation is too complicated provides less help.

**Give small contributions a destination, but do not promise an audience automatically.** Templates, collective events and curated routes can make participation concrete. The operating and discovery work remains real; more generated artifacts alone is not evidence of a healthy platform.

These are research interpretations, not accepted OpenLegend implementation tasks. The earlier caution remains: the evidence cannot establish which unshipped feature, if any, would have changed Dreams' commercial trajectory.

## 17. Coverage, viewing route and preservation

Read Art's Dream for authored identity, then the Ancient Dangers lesson for explicit mechanics, and Tren's cargo/checkpoint lesson for how a working system becomes an interesting game. Compare these with the permission/version rules before considering creator-platform transfer. Read the 2023 support and 2024 curation announcements together.

Useful viewing routes are linked directly from the official beginner guide, Art's Dream pages, animation release, music update and VR release notes. They include an Art's Dream introduction, mode demonstrations and Inside the Box examples. These are verified source-linked routes, **not full recordings watched for this research**. The narrative pages and reviews contain spoilers; no invented timestamps or observed play sessions are supplied. [DR06](#dr06) [DR14](#dr14) [DR16](#dr16) [DR22](#dr22) [DR25](#dr25)

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Opening, §§1, 7, 9–10 and 14: play/create promise, originals, editions, delivered/retired boundaries |
| R02 | §§1–5, 9–12: practical authoring, signals, animation, combat, movement, puzzles and audio |
| R03 | §§1–6, 8 and 10–11: elements, characters, gadgets, cargo, sound, reuse, versions and storage |
| R04 | §§4–8 and 10: resource budgets, acquisition changes, project progression, checkpoints and score goals |
| R05 | Diverse constructed situations throughout, plus explicitly attributed creator/reviewer examples |
| R06 | §§6–7, 9–10 and 14: collaboration rights, authored cast, local cooperation, community participation |
| R07 | §§2, 5 and 9–12: flecks, distinct worlds, performance/music, controls, VR comfort and legibility |
| R08 | §§9–10: Art and his relationships, authored original premises, personal community meaning |
| R09 | §§5, 7 and 13: prototypes, layered authorship, production, delivery and support transitions |
| R10 | §14: access routes, demo, showcase/awards, community occasions and discovery |
| R11 | §§7 and 14: business structure, sustainability statement, absence of comparable private economics |
| R12 | §15: original criticism and contrasting direct player accounts with dated limitations |
| R13 | §16 and labeled interpretations throughout |
| R14 | This section and the annotated sources, retaining earlier owners |

**Per-game preservation:** the complete paired chapter and the original supplied master's §5.1 were compared. The September 2023 live-support/access distinction, separate Project Spark shutdown, creator/player viability argument, missing-feature counterfactual caution and two OpenLegend product questions remain intact in their existing owner. No separate earlier Dreams mechanics study exists to replace. The original packet's source annotations and cross-game essays remain preserved, not silently rewritten by this pass. This dossier extends their narrower evidence and qualifies later changes. The independent seven-file packet-wide audit remains pending.

**Evidence limits:** no personal play, full-video/complete-soundtrack inspection, proprietary-code access, representative sentiment coding or audited game-profit evidence. Some original interviews were accessible through substantive indexed text rather than direct page retrieval. Old official guides themselves contain retired features; dated release/support notes take precedence for those specific claims. The accessible documentation establishes supported behavior, not universal absence of defects.

## Annotated sources

<a id="dr01"></a>**DR01 — [Creation types](https://docs.indreams.me/en/create/resources/videos/tools-and-tips/understand-creation-types).** Primary written distinction among Elements, Scenes, Dreams and Collections. Embedded video not watched in full; no claim every upload is a finished game.

<a id="dr02"></a>**DR02 — [Authoring modes](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/modes).** Primary form/presentation/sound/Test Mode description. Not an exhaustive undocumented renderer or physics specification.

<a id="dr03"></a>**DR03 — [Glossary](https://docs.indreams.me/en/create/resources/glossary).** Primary Imp, possession, grouping and signal definitions. Its older Homespace visiting claim is qualified by subsequent release notes.

<a id="dr04"></a>**DR04 — [Ancient Dangers Play & Edit 3](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/ancient-dangers/help/play-n-edit-walkthrough-3).** Primary written lesson: lift grouping, gate/trap logic and shared emission references. Rules-based analysis, not an independently played tutorial or measured speedup.

<a id="dr05"></a>**DR05 — [Update Mode](https://docs.indreams.me/en/create/releasing/using-update-mode).** Primary version/override controls and tree example. No guarantee of semantic compatibility after every update.

<a id="dr06"></a>**DR06 — [Animation update v2.58](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v258), June 21, 2023.** Primary recording/canvas modes and optimization rationale. Developer claims distinguished from measured performance or watched full demonstrations.

<a id="dr07"></a>**DR07 — [Understanding Permissions](https://docs.indreams.me/en/create/releasing/understanding-permissions), inspected September 26, 2026.** Primary owner/collaborator/version rights and continuing stamp permission. Constructed illustration; no user's access changed.

<a id="dr08"></a>**DR08 — [Saving and Releasing](https://docs.indreams.me/en/create/releasing/saving-and-releasing).** Primary lead/latest and private/public/playable distinction. Not unrestricted external licensing.

<a id="dr09"></a>**DR09 — [Support and server announcement](https://docs.indreams.me/en-US/whats-happening/news/dreams-support-update), April 11, 2023, updated with migration timing.** Primary retained access, support rationale and unshipped features. Later curation/maintenance changes separately sourced; no one-feature causal explanation.

<a id="dr10"></a>**DR10 — [End-of-roadmap clarification](https://docs.indreams.me/en/whats-happening/news/dreams-live-support), September 13, 2023.** Primary final releases and continued availability. Content-use announcement is not a legal opinion or general game export.

<a id="dr11"></a>**DR11 — [Community and curation update](https://docs.indreams.me/en/whats-happening/news/curation2024), March 20, 2024.** Primary staffing/discovery transition and reduced editorial promise. Not measured recommender effectiveness or total shutdown.

<a id="dr12"></a>**DR12 — [v2.65 backend update](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v265), February 26, 2025.** Primary limited maintenance, not resumed feature development.

<a id="dr13"></a>**DR13 — [Server migration v2.57](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v257), May 22, 2023.** Primary delivered storage/discovery/reward changes. Legacy assets excluded from new limits; runtime thermometers are a separate budget.

<a id="dr14"></a>**DR14 — [Beginner's guide to play](https://docs.indreams.me/en/game-info/beginners-guide-play), inspected September 26, 2026.** Primary first-session, Imp/Dream Queen and activity routes. Its old future-originals and ongoing-editorial language is qualified by DR09–DR11; video links are viewing routes only.

<a id="dr15"></a>**DR15 — [Art's Dream cast](https://docs.indreams.me/en/game-info/mm-originals/arts-dream/characters), May 11, 2022.** Primary named characters, relationships and contrasting playable identities. Premise spoilers; not general autonomous social simulation.

<a id="dr16"></a>**DR16 — [Art's Dream themes](https://docs.indreams.me/en/game-info/mm-originals/arts-dream/themes), May 11, 2022.** Primary three-game origin, visual/narrative strands and attributed influences. Written production account, not independently watched footage.

<a id="dr17"></a>**DR17 — [Art's Dream tips and production details](https://docs.indreams.me/en/game-info/mm-originals/arts-dream/tips-tricks), May 11, 2022.** Primary play/recovery and musical-performance information; some music details available in substantive indexed text. Old Prize Bubble reward advice is superseded by DR13.

<a id="dr18"></a>**DR18 — [Ancient Dangers and DreamShaping launch](https://docs.indreams.me/en/whats-happening/news/ad-dreamshaping-launch), November 30, 2021.** Primary original-game premise, local cooperation and creator-onboarding changes. Not evidence that online multiplayer shipped.

<a id="dr19"></a>**DR19 — [Tren sends Dreams out in style](https://www.pushsquare.com/features/tren-sends-media-molecules-dreams-out-in-style), Stephen Tailby, August 7, 2023.** Original critic play account. Praise and specific control/collision complaints remain dated; no general player-consensus claim.

<a id="dr20"></a>**DR20 — [Tren Play & Edit 5](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/tren/play-n-edit-walkthrough-5).** Primary cargo, timing, checkpoint and alternative-goal lesson. Constructed design application, not copied walkthrough or personal playtest.

<a id="dr21"></a>**DR21 — [Dreams review](https://www.gamespot.com/reviews/dreams-review/1900-6417414/), Richard Wakeling, March 3, 2020.** Original review of play, creative controls and named community experiences. Historical catalogue and personal response; rhetorical claims of unlimited possibility are not adopted literally.

<a id="dr22"></a>**DR22 — [The Music Update](https://blog.playstation.com/2020/10/06/dreams-the-music-update-launches-tomorrow/), Ed Hargrave, October 6, 2020.** Primary instruments, compatible Clips, effects and update cautions. Announcement for October 7 delivery; no claimed full listening session.

<a id="dr23"></a>**DR23 — [Dreams audio technology](https://docs.indreams.me/en/create/sound/dreams-audio-tech), April 7, 2022.** Primary audio budgets, analyser and sample/download distinctions; substantive indexed text inspected. No private implementation or independently measured workload.

<a id="dr24"></a>**DR24 — [Audio Importer](https://docs.indreams.me/en/create/sound/audio-importer).** Primary tool/guide entry point for original sound creation. Landing page and guide descriptions inspected; no login, import or end-to-end test performed.

<a id="dr25"></a>**DR25 — [VR release v2.15/2.16](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v216), July 22, 2020.** Primary delivered games, tracking gadgets, comfort and discovery labels. This is original PSVR support, not PSVR2 or proof every creation is comfortable.

<a id="dr26"></a>**DR26 — [John Beech on making Tren](https://blog.playstation.com/2023/08/01/how-dreams-tren-update-was-inspired-by-a-childhood-spent-playing-with-trains-live-today/), Liam Wiseman, August 1, 2023.** Original creator interview and primary release/access account. Childhood/jam/production story attributed; historical Plus windows are not current offers.

<a id="dr27"></a>**DR27 — [Designing Dreams' toolset](https://www.gamedeveloper.com/design/how-media-molecule-designed-a-fun-and-robust-toolset-for-i-dreams-i-), Jack Yarwood, June 17, 2019.** Original interviews with Eckersley/Heppe; substantive indexed article inspected, direct retrieval blocked. Stealth Create and prototype history, not claimed viewing of linked technical talks or an audited code history.

<a id="dr28"></a>**DR28 — [Full-release announcement](https://blog.playstation.com/2019/12/10/dreams-will-steal-your-heart-on-february-14-2020/), December 10, 2019.** Primary Early Access/full-release sequence, upgrade, launch showcase and creator recognition. Historical pricing/access model, not current retail advice.

<a id="dr29"></a>**DR29 — [Demo launch](https://blog.playstation.com/2020/05/01/dreams-demo-lands-today-at-playstation-store/), May 1, 2020.** Primary sampled-content and carryover route. The trial was later removed; channel conversion is not measured.

<a id="dr30"></a>**DR30 — [All Hallows' Dreams](https://docs.indreams.me/en/whats-happening/news/all-hallows-dreams), September 8, 2020.** Primary collective-room/pumpkin event and assembly boundaries. Historical participation, not an open present invitation or copied full rulebook.

<a id="dr31"></a>**DR31 — [How to Surf the Dreamiverse](https://docs.indreams.me/en/game-info/dreamsurfing), inspected September 26, 2026.** Primary search, filters, following, Collections and Play Later. Old live-curation/event cadence claims are qualified by DR09–DR11 rather than repeated as current.

<a id="dr32"></a>**DR32 — [Dreams player review bodies](https://www.metacritic.com/game/dreams/user-reviews/), selected 2023–2025 accounts, inspected September 26, 2026.** Direct named positive/mixed/negative testimony. Post date need not equal described play date; no age, technical causality or representative prevalence inferred.
