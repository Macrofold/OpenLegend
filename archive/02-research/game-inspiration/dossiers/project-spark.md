# Project Spark — full research dossier

**G14 · Full research pass completed September 26, 2026.** [Preserved comparison](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Dreams is a separate study. This pass covers the actual games as well as the creation platform; it does not claim personal gameplay, complete-video viewing, a representative player survey or a proprietary-code audit.

Project Spark's 2014 launch, October 2015 transition to completely free content and August 2016 online closure are different product states. Historical instructions below do not imply a new user can download the original service today. Named characters and assets are reference examples, not OpenLegend assets proposed for copying.

**The player promise:** make a small adventure while playing **Crossroads**, follow the authored **Champions Quest**, try community creations, or shape a world and its behavior directly. The first session need not begin with programming. A player's later purpose might be mastering a Champion, making an amusing toy, finishing a game or learning how someone else's creation works. [PS04](#ps04) [PS08](#ps08)

## 1. Objects acquire behavior through a readable conditional vocabulary

In Jonathan Deesing's December 2014 review, creating a level means shaping a three-dimensional scene, placing objects and giving them **Brains**. A Brain's **Kode** connects **WHEN** conditions with **DO** effects. The critic's own example ends a level when the character touches a designated tree. Existing object behavior can be copied and inspected, and tile descriptions help explain what it does. [PS01](#ps01)

**Interpretation:** the tree is useful because it participates in an actual completion condition, not because its description calls it an exit. Reusing an object also need not mean inheriting every old intention. A different condition can make the same familiar prop a checkpoint, objective or hazard, provided the corresponding effect is implemented.

**Constructed counterexample:** a player reaches an object that looks like the destination, but the author wired a different condition. Better scenery cannot repair that mismatch. The goal, available interaction and completion rule must agree. A creator who can test immediately has a better chance of discovering the problem before another person encounters it.

A contemporary DigitalChumps review illustrates another distinction: an input tile alone is not necessarily a one-shot event. Its jump example requires the appropriate **pressed** modifier to achieve the intended one-jump-per-press behavior. The **Brain Gallery** supplies editable starting behaviors such as a third-person adventure, side-scroller or enemy. [PS02](#ps02)

**Interpretation:** a low-code interface removes syntax work but does not remove semantics. Continuous state, a newly occurring event and an unconditional rule are different. Templates can make a first character useful while leaving that distinction available to inspect and change.

## 2. The supplied world was meant as a starting point, not compulsory canon

In Dean Takahashi's February 2014 interview, **Henry Sterchi** describes influences extending beyond Minecraft to construction toys, **Pinball Construction Set** and **The Incredible Machine**. The team wanted users to create both places and their rules. Champions supplied partial backstories, while visual details—such as goblins carrying makeshift defensive equipment—suggested character without fixing every story. [PS03](#ps03)

**Interpretation:** authored identity can reduce the blank-page problem without requiring every creator to tell the same tale. A recognizable person or object gives the player something to reinterpret. The underlying tool remains different from an autonomous storyteller: expressive motion does not prove a character can revise beliefs or invent a new plan.

The interview's Xbox 360 and future-feature discussion belongs to its prerelease date; it does not establish delivery. The published launch route was Xbox One and Windows 8.1. [PS04](#ps04) Cross-device content access must also be distinguished from simultaneous cross-platform play; §10 makes that boundary explicit.

## 3. Play and creation originally fed an acquisition economy

At launch, the basic download was free, while the retail **Starter Pack** bundled content, creator features and experience boosts. Users could also acquire its contents digitally. [PS04](#ps04) Deesing describes earning currency through playing and designing, with paid currency accelerating acquisition. [PS01](#ps01)

**Constructed choice:** spend the next session making a small level with existing ingredients, earn access to a desired ingredient through other activity, or buy it. Those are different paths to authorship. A tool can be technically capable of something while a particular user lacks the entitlement to express it.

**Interpretation:** earning new ingredients can provide direction, but it can also turn creation into a preliminary grind. The value depends on whether the required activity is itself wanted. The initial economy cannot be used as the description of the later completely free edition.

### The October 2015 transition changed more than the price

Microsoft's September 28 announcement set an October 5 transition from microtransactions to free access to previously paid content, alongside a move away from active feature/DLC development. The update removed the Marketplace and replaced upvote/downvote-based ranking with downloads and favorites. It also expanded terrain/prop limits and upload capacity. [PS05](#ps05)

**Interpretation:** easier access to ingredients did not mean an expanding commitment to develop the platform. The content economy, discovery rules and production commitment changed together. A creator could gain tools while losing confidence in future improvement; those outcomes are not contradictory.

## 4. A participation milestone is not a sustainability result

The same announcement reported **over 200,000 creators**, tens of millions of shared custom objects/behaviors/experiences, and roughly **300–400 new games uploaded daily**. These are attributed historical company measures, not audited distinct monthly creators, sold copies, profitable games or satisfied visitors. [PS05](#ps05)

**Interpretation:** a large amount of production can coexist with a fragile operating model. An upload count does not reveal how many people played the work, returned to it or valued the response they received. The inspected evidence does not supply a title budget, profit or creator-income distribution.

## 5. The shutdown preserved a narrower local possibility

The May 2016 notice stopped new downloads and warned that online services would end on **August 12, 2016**. Contemporary reporting of the notice distinguishes uploading/downloading community work from playing content already saved locally; people were instructed to preserve their own uploads and favorites before the deadline. Community manager **Thomas Gratz** attributed the decision to the remaining team's inability to sustain the necessary operation after colleagues had moved to other projects. [PS06](#ps06)

An August 12 report confirms the service's final online date. [PS07](#ps07) **Interpretation:** retaining a local creation is not the same as retaining discovery, collaboration, a user account's remote archive or another person's unpreserved work. An executable local copy can protect some value without preserving the ecosystem that gave it an audience.

The earlier research's narrow shutdown finding remains intact. Neither that finding nor the team's explanation proves that a single missing feature or competitor caused the entire outcome. Current community preservation tools, where separately verified, must not be mislabeled as a revived Microsoft service. This pass did not install or validate an unofficial client or restoration tool.

## 6. Crossroads connects authorship with an immediate adventure

Paul Acevedo's March 2014 hands-on account starts with choices about environment and time of day, followed by a hero and a hometown organized around a selected landmark. The player explores and talks to generated townspeople, then makes further choices about the adventure. Offered alternatives can be rerolled; this is a bounded menu of authored possibilities, not unconstrained natural-language world generation. [PS08](#ps08)

The historical community guide adds concrete spatial decisions: place the village, choose its threatened centerpiece, locate the enemy destination and connect them with a path. It reports that poor paths can produce inaccessible objectives or underground spawns, while an automatic route can avoid some problems. Those are historical author reports, not independently reproduced defects or proof every generated route fails. [PS09](#ps09)

**Constructed situation:** a player wants a dramatic approach across difficult terrain. They place the destination and draw a route, then discover the character cannot traverse it. The next useful choice is to repair the route or choose a more reliable layout—not to declare the quest completed because the story sounded coherent. The author and the adventurer need different feedback about the same landscape.

**Interpretation:** Crossroads reduces the distance between a design choice and experiencing its consequence. It also constrains the design space enough to supply a beginning, route and objective. The limitation is that selecting an unusual-looking village does not guarantee an unusual strategic problem. Variety needs to change an action, commitment or decision, not only a menu label.

Microsoft's achievement guide confirms that Crossroads dialogue can be edited during the conversation. [PS04](#ps04) **Constructed contrast:** changing a villager's words can make a personal joke, but it does not independently change what the quest accepts as success. Authored speech and implemented behavior remain different layers.

## 7. Champions give a small action vocabulary room to develop

The original manual describes Champions gaining levels through Crossroads and user-created games. Their core vocabulary combines attacks, a defensive action and jumping, but the named systems differ. [PS10](#ps10)

| Champion | Distinctive documented interaction |
| --- | --- |
| **Karlsnor** | Attacking or taking damage builds Rage; transformation enables stronger actions and later recovery opportunities. |
| **Scarlett** | **Kodite Caltrops** can become ammunition for a charged **Barrage**, while a decoy redirects enemies. |
| **Haakon** | Uninterrupted attacks summon **Sir Sigurd**; blocking develops the Spirit used by further abilities. |
| **Avalon** | **Nature Chambers** support healing and alter later attacks; a full-resource dodge can leave a **Sprout Turret**. |
| **Seph** | Casting develops Arcane Power toward **Overflow**, which changes attacks and mobility. |

These are the manual's qualitative interactions, not a claim that every character was available at initial launch or every exact balance value remained unchanged. [PS10](#ps10)

**Constructed Scarlett decision:** use the environment around a prepared trap as a fighting position, then decide whether its later use as attack material is more valuable than leaving it in place. Preparation becomes an input to another action rather than a separate cosmetic effect. The best choice depends on which enemies remain and where they can approach.

**Constructed Haakon contrast:** repeatedly attack for an uninterrupted sequence or defend to obtain a different advantage. A system that rewards aggression and one that rewards timely defense can make the same basic controls serve different intentions. Taking a hit is not interchangeable with merely losing a few health points when it interrupts the desired sequence.

**Interpretation:** progression matters when a familiar action acquires another relationship. A new level can make positioning, setup or timing valuable in a new way. This is a more useful reference than merely multiplying the number of collectible characters.

### Champions Quest: an authored destination within the platform

**Premise spoilers.** **Void Storm** is an authored action adventure about protecting a world threatened by corruption. Its achievement objectives include collecting Rune Stones, using a Monolith to cleanse a village and confronting a Corrupted Goblin Chieftain. The reference also distinguishes Kodite collection, treasure chests and using environmental **Spark Interactables** from simply defeating enemies. [PS11](#ps11)

The official guide describes a specific **Avalon's Wellspring** detour behind a waterfall when playing the relevant chapter as Avalon. [PS04](#ps04)

**Constructed choice:** revisit with a different Champion to discover a character-dependent route, or continue pursuing the main confrontation with the current one. A place can be familiar yet offer a different useful possibility because of who is present. That does not establish a universally reactive world in which every inhabitant recognizes every past deed.

**Interpretation:** a fixed campaign provides something to finish and a reference for what the tools can produce. An example campaign that mainly demonstrates buttons, however, can underperform as a game. Its value to an aspiring creator and its appeal to someone wanting an adventure should be assessed separately.

## 8. Terrain, objects and control can become an invented capability

Project Spark's practical creation loop combines terrain manipulation, object placement, behavior editing and immediate testing. Kevin VanOrd's 2013 hands-on preview describes painting a landscape, altering its terrain and changing a character template after discovering the initial control arrangement did not fit his intended action game. [PS12](#ps12)

**Interpretation:** choosing a control model is a design decision, not merely the skin of an otherwise identical game. A usable environment must support the chosen body's movement and the camera that lets the player understand it. A landscape can be impressive from the editor and awkward at ground level.

### An actual shared Brain turns movement into land creation

The community-authored **3rd-Person Land Creator** gives the player terrain-raising/removal controls and a throwable **Wooden Barrel** that paints the area where it lands. Its published Kode uses separate pages and configurable values. The author explicitly warns that unconstrained raising can carry a character outside the allowed world and proposes limits or temporary terrain as alternatives. [PS13](#ps13)

**Constructed scenario:** raise a path toward an otherwise inaccessible ledge, then decide whether that power should remain permanent, consume a resource or expire. Those are proposed design variants, not all automatically present in the shared Brain. Unlimited creation can erase the traversal problem it was intended to make interesting. A limit tied to the actual world boundary is also different from a mysterious refusal after the player is already stranded.

**Interpretation:** the interesting reusable artifact is not a picture of an earth mage. It is a working relationship among input, target location, terrain change and the actor's continued ability to move. Even a compact system needs a meaningful failure boundary.

The author's broader Brain index separates native examples from community contributions and offers movement, camera, combat, picking-up, teleporting and other behavior families. [PS14](#ps14) **Interpretation:** a library is useful when its pieces are inspectable and can be tried in a known situation. A list of dramatic ability names is weaker than a working example with constraints.

## 9. A helper's policy and performance are separate creative choices

VanOrd's preview supplies an unusually concrete experiment. He gives a warrior a **follower-healer** Brain, sets a healing condition, and records a pose and voice through Kinect to accompany the action. The helper follows and heals as intended, while the captured performance looks awkward. He also changes team assignments so goblins and fighters oppose one another. [PS12](#ps12)

**Interpretation:** usefulness, allegiance and expressive character are separable. A reliable helper can still look emotionally unconvincing, and an expressive animation does not establish a useful policy. The world becomes more interesting when the observed behavior supports the identity being presented, rather than when either layer merely becomes more elaborate.

A later, postlaunch **Game Informer Test Chamber** specifically describes recording animations with Kinect. That corroborates delivery of capture rather than treating the 2013 demonstration as the sole evidence of a shipped feature. Its video was not watched in full for this research. [PS15](#ps15)

VanOrd also experiments with a button that enlarges a yeti and strengthens its attack, then recognizes the unfinished problem of restoring normal size and damage. [PS12](#ps12) **Interpretation:** adding a dramatic state is easier than defining its complete lifecycle. The valuable next question is what happens when it ends, repeats or overlaps another action.

These are authored conditions and performances, not evidence of language-model cognition, open-ended social memory or self-originating goals. A designer can make an ally feel particular without claiming the engine simulates a complete person.

## 10. Human cooperation and sharing require precise boundaries

A November 2014 **PalmettoBling** guide describes joining **Void Storm** with a second local controller at Champion selection. It notes that some character-specific achievement credit belongs to the primary controller. Another February 2016 account describes rejoining and the costs of glitches. These are direct historical player reports, not a new multiplayer test. [PS16](#ps16)

**Constructed implication:** two people may help finish the same fight without receiving identical persistent credit. A group invitation needs to explain what each person gains and what happens if someone leaves. Cooperative presence, shared success and ownership of progression are separate contracts.

Brent Botsford's 2015 review describes cooperative creation as a way to divide environment-building and event-scripting work. [PS17](#ps17) **Interpretation:** the social pleasure can be jointly making an artifact rather than defeating the same enemy. It still requires people to communicate intentions and resolve disagreements; a second cursor does not automatically solve collaboration.

**Platform limit:** September 2015 reporting explicitly says the PC version still lacked multiplayer and quotes its developers treating that feature as a distant possibility. Xbox One support therefore must not be copied onto the PC feature list merely because creations and entitlements crossed platforms. [PS18](#ps18)

**Evidence boundary:** contemporary promotional and review descriptions vary in how precisely they distinguish local play, online collaboration and simultaneous cross-device play. This pass established local Xbox cooperation, reported cooperative creation and the historical PC limitation. It did not independently reconstruct every retired network-session rule; generic retailer multiplayer labels and an old future-feature announcement are not treated as proof. The official online service is closed, irrespective of those historical distinctions.

### Remixing is not editing someone else's published original

The official manual's **Lineage** view identifies contributing creators; its older remix rule requires owning the ingredients used by a world. [PS10](#ps10) Gamer's December 2014 firsthand account explicitly distinguishes editing a played creation from changing its original. [PS19](#ps19)

**Constructed situation:** a player improves the pacing of a downloaded level and shares a new version. That is an interpretation of another work, not a silent overwrite of its owner's publication. The original economy could make ingredient access an additional barrier; §3 explains why that description changes after October 2015.

**Interpretation:** discoverability, attribution, editability and publication authority are different needs. Dreams' later private/public/playable permissions cannot simply be assumed to describe Project Spark. A creator platform needs its own explicit answers to these questions.

## 11. Conker supplied both an authored episode and a reusable palette

**Conker's Big Reunion: Episode 1** arrived in April 2015 as a Project Spark experience, not a standalone replacement for **Conker's Bad Fur Day**. Its action-platforming and adult comic tone sat alongside an asset pack; early community access produced several additional creations, including a multiplayer arena and a homage. [PS20](#ps20)

**Premise spoilers.** Conker is trying to reconnect with old friends at the **Cock and Plucker**. Developer comments describe collaboration with **Rare** on original assets, music and tone, with **Chris Seavor** returning to the voice. Later episodes were canceled as Project Spark ceased new DLC production. [PS21](#ps21) [PS07](#ps07)

**Interpretation:** a recognizable character can give the platform a concrete invitation. It also imports expectations about tone, movement and what constitutes a satisfying continuation. Being able to place a beloved character in a scene is not the same as delivering the game that fans imagined.

### A small asset pair exposes a complete interaction

The published Conker pack list distinguishes **Pickup – Cash Wad** from **Display Money Count**, which reports the collected amount. It also includes a **Disco Ball** with rotation, effects and music, and a simplified **Glide Fighter** Brain. [PS22](#ps22)

**Constructed choice:** build a collecting game with both the pickup operation and understandable feedback, rather than merely scatter attractive currency objects. The count then needs a purpose: a purchase, gate, score or self-chosen collection goal. Those are proposed uses, not automatic features of every cash pickup. A complete small mechanic connects occurrence, stored consequence and what the player can understand afterward.

The campaign's listed achievements describe stealth inside a barrel, money for a bar tab and interactions with TNT fuses. [PS11](#ps11) **Interpretation:** the same object vocabulary can support evasion, comedy and practical timing rather than only direct attack. Those are episode-specific authored uses, not a universal promise that every prop supports every plausible action.

## 12. Presentation, music and control set the quality of ordinary work

Botsford praises the inviting visual assets and the ease of making an appealing basic scene. He finds the quietly adventurous score compatible with creation, but criticizes overlapping audio cues, an intrusive instructional narrator, performance problems and the complexity of advanced controls. His speculation that sound caused frame-rate issues is not adopted as a technical diagnosis. [PS17](#ps17)

**Interpretation:** visual coherence can help a novice make something worth showing before they have mastered every tool. It cannot guarantee that selecting an object, changing a property or reading an event feels clear. An encouraging voice can help one newcomer while becoming irritating to someone already ahead of it.

Composer **Laura Karpman** lists Project Spark among her game scores. [PS23](#ps23) This supplies a production credit, not an independent complete listening analysis or evidence that every track shares one emotional effect.

The review and preview accounts identify different kinds of control difficulty: navigating many functions through a controller, arranging a scene, and playing the resulting character. [PS12](#ps12) [PS17](#ps17) **Interpretation:** simplifying the author's camera is not the same as making an avatar's attack readable. A creator needs to test the experience from the eventual player's perspective rather than judge it entirely from the editor.

### A music collaboration was also a playable, editable artifact

Microsoft's March 25, 2014 **Linkin Park** announcement offered **Guilty All the Same** as a playable/remixable experience with an **audio remix station**, rather than only a conventional video. The accompanying artist-label page links the official recording. [PS24](#ps24)

**Interpretation:** a promotion can be something the audience acts upon and reinterprets. That produces a more specific invitation than telling everyone they can create anything. The inspected announcement does not establish the campaign's conversion rate, the quality of every remix or a causal share of Project Spark's audience. No lyrics or unviewed scene details are reproduced here.

## 13. Development and distribution: a platform still needed a finished product

The documented developer relationship includes **Team Dakota**, **Microsoft Studios** and co-developer **SkyBox Labs**. SkyBox's own project page confirms its involvement, but retains old prerelease Xbox 360 and economy copy; those details are not used as current release facts. [PS25](#ps25)

The early design interview describes an ambition to connect playful construction with programmable behavior and an intentionally unfinished fictional framework. The actual hands-on prototypes expose why that integration was difficult: an attractive environment, useful helper and dramatic transformation could each work while movement, impact or reversal still needed attention. [PS03](#ps03) [PS12](#ps12)

**Interpretation:** the design problem was not only exposing engine features. It was allowing a creator to express something coherent, test it quickly and give another person a reason to play. The resulting experience needed craft across tools, authored examples, art, animation, audio and distribution.

The full-release announcement set **October 7, 2014** for the Xbox One/Windows release and explained the optional retail bundle. The 2014 beta had already supported sharing and learning before that release. [PS04](#ps04) [PS08](#ps08) The Xbox 360 version remained unshipped and was reported canceled; a residual platform label in a database does not reverse that history. [PS26](#ps26)

The studio's later sunset statement reports **46 content packs and 16 updates**, alongside educational streams and community tutorials. Those are the team's reported output measures, not proof of how much each update improved retention or of a documented private staffing budget. [PS27](#ps27)

**Interpretation:** a history of substantial delivery and an eventual closure can both be true. Calling the entire project an empty promise would erase shipped work; calling its upload volume proof of sustainability would ignore the operating decision. The useful lesson is to verify the integrated player experience and its support obligations together.

### A skill or idea can outlive its original platform without being exported

The creator description for **HYPERPIPES** says it began as a Project Spark game by **BeefCakePie** and was later rebuilt from scratch in **Godot**. [PS28](#ps28)

**Interpretation:** this is a concrete counterpoint to treating all earlier creative effort as worthless after shutdown. An idea and acquired skill can survive. Rebuilding is still different from pressing an export button or preserving the original executable unchanged. The account is the creator's statement, not audited commercial success or evidence every Project Spark author could make that transition.

## 14. Reception: the audience wanted different things

| Account | What it values | Friction or qualification |
| --- | --- | --- |
| Jonathan Deesing, December 2014 | Learning readable behavior and gradually making a working level. | Requires time and practice; original economy. [PS01](#ps01) |
| Kevin VanOrd, November 2013 preview | Experimenting with helpers and transformations. | Actual action feel and the completeness of his creation lag behind the idea; prerelease evidence. [PS12](#ps12) |
| Brent Botsford, April 2015 | Attractive assets and the Crossroads hybrid. | Clutter, teaching tone and thin authored/community play in his experience. [PS17](#ps17) |
| **TSapper**, November 19, 2014 | Learning beyond their programming experience and playing skilled creators' work. | Had not finished a project they considered publishable. [PS29](#ps29) |
| **Kawooster**, January 18, 2015 | Visuals, templates and exploring others' work. | Learning burden and dissatisfaction with ingredient access. [PS29](#ps29) |
| **willothenight**, October 10, 2014 | A routine of checking who played their creations, doing challenges and improving projects. | One highly invested account, not a typical-use cohort. [PS29](#ps29) |
| **ZackH25**, March 28, 2023 retrospective | Choosing an adventure's setting and finding enjoyable community worlds. | Criticizes the former paid-content model; their financial explanation is unverified and not a 2023 feature report. [PS29](#ps29) |

**Interpretation:** “make games” can mean an expressive toy, a satisfying learning process, a route to a professional product or simply a source of new things to play. The same platform may serve one expectation and frustrate another. A modest creation can be valuable to its maker without being compelling to strangers.

The most concrete return loop in these accounts includes audience response: someone checks what happened to yesterday's work before deciding what to make next. That is not equivalent to a global upload counter. The evidence also exposes why an impressive editor cannot substitute for enjoyable ordinary play.

The samples are selective. No complaint frequency, verified age profile, hidden commercial motive or universal verdict on the community is inferred. Criticism of the old paid economy must remain historical after the free transition. Praise for long-term possibilities is not proof those plans were subsequently delivered.

## 15. Transferable inspiration and limits

**A narrow beginning can lead to deeper authorship.** Crossroads offers choices with an immediate playable consequence. OpenLegend can similarly provide a meaningful first situation without requiring every player to understand authoring internals.

**A declared effect needs a complete lifecycle.** A transformation needs an ending; an objective needs a reachable condition; a terrain power needs bounds; a pickup needs a stored result and readable feedback. More impressive beginnings do not repair missing continuations.

**Make helpers useful and expressive without confusing those goals.** A conditionally healing follower can be valuable even without general cognition. A richer character model should improve actual decisions and relationships, not merely add a biography to the same behavior.

**Separate construction, learning and public entertainment.** The person who enjoyed making an awkward game may have succeeded at their own goal. A visitor still needs something worthwhile to play. Measure those outcomes separately.

**Treat access and attribution as part of reuse.** A shared world can carry ingredient, ownership, platform and credit constraints. Making an object technically copyable is only part of a trustworthy creator experience.

**Choose a continuity promise that can be supported.** Local saves protected some Project Spark work while remote discovery and sharing ended. A persistent-world product should make the difference between preserving an artifact and sustaining its social setting explicit.

These are research interpretations, not accepted OpenLegend implementation requirements. The paired chapter's warning against single-feature explanations of platform viability remains unchanged.

## 16. Coverage, viewing routes and preservation

Start with the Crossroads hands-on account, then the original manual's Champion interactions, and finally the Land Creator Brain. Compare the performed healer with the recorded animation to separate behavioral competence from presentation. Read the free-transition announcement and sunset notice together before drawing business conclusions.

Useful viewing routes include the written **Game Informer Test Chamber** entry and the official **Guilty All the Same** video linked by the artist's label. The latter is a musical/promotion artifact, not an ordinary unedited onboarding session. The Conker announcement also links a gameplay/community montage; its adult tone differs from the default fantasy palette. These links establish identity and purpose, **not full footage watched or invented timestamps**. [PS15](#ps15) [PS20](#ps20) [PS24](#ps24)

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Opening, §§2–6, 10 and 13: actual play/create promises, release/economy/platform/service boundaries |
| R02 | §§1, 6–11: practical creation, combat, exploration, choice-driven adventure, helpers and composition |
| R03 | §§1, 3, 7–11: named Champions, resources, props, Brains, capture, acquisition, reuse and local storage |
| R04 | §§3–8 and 14: currencies, unlocks, character/project progression, recovery and long-term purpose |
| R05 | Varied constructed scenarios and explicitly attributed real creator/reviewer examples throughout |
| R06 | §§2, 9–11 and 14: authored identity, conditional AI, team assignment, human cooperation, credit and audience |
| R07 | §§8–9 and 12: controls, movement/impact, visual coherence, capture, sound, music and readable feedback |
| R08 | §§2, 6–7 and 11: open fictional framing, generated adventure, Void Storm and Conker's authored premise |
| R09 | §§2, 5, 9 and 13: creator intent, prototypes, co-development, delivery and operating constraints |
| R10 | §§4, 11–14: launch/bundles, music and franchise collaborations, community distribution and return routines |
| R11 | §§3–5 and 13: dated participation/output, model transitions and unavailable private financial data |
| R12 | §14: original criticism and direct positive/mixed player accounts with historical qualifications |
| R13 | §15 and labeled interpretations throughout |
| R14 | This section and source annotations; original paired owner preserved |

**Per-game preservation:** the complete paired chapter and the supplied master's §5.1 were compared. The August 12, 2016 shutdown fact, distinct Dreams live-support outcome, creator-versus-player viability argument, absent-feature counterfactual caution and OpenLegend product questions remain intact. Original source, review, economic and viewing registers were not overwritten. No separate earlier Project Spark mechanics study was replaced. This dossier adds the previously missing whole-game dimensions; the seven-file packet-wide audit is a separate pending gate.

**Evidence limits:** no personal play, installation/restoration test, complete-video analysis, proprietary code/budget access or representative review survey. The original game manual has missing button images in extracted text, so exact unrendered button mappings are not guessed. Some original reviews/tutorials were accessible only as substantive indexed text. Retired network-session details were not fully reconstructable; corroborated local play, reported creation cooperation, PC limits and current official-service closure are distinguished rather than merged into an invented multiplayer specification.

## Annotated sources

<a id="ps01"></a>**PS01 — [Project Spark review](https://www.deseret.com/2014/12/3/20554033/project-spark-challenging-but-rewarding-way-for-players-to-create-their-own-video-games/), Jonathan Deesing, December 3, 2014.** Original play/creation and tree-completion example. Historical economy; no independent replay.

<a id="ps02"></a>**PS02 — [DigitalChumps review](https://digitalchumps.com/2014/10/12/project-spark-review/), October 12, 2014.** Substantive indexed Kode/Brain Gallery account; direct retrieval failed. Example attributed, not an exhaustive language specification.

<a id="ps03"></a>**PS03 — [Team Dakota interview](https://gamesbeat.com/microsofts-team-dakota-aims-for-user-generated-magic-with-project-spark-interview/), Dean Takahashi, February 3, 2014.** First-page interview body inspected; subsequent pagination partly gated. A 2025 display update does not change the interview date or make planned platforms delivered.

<a id="ps04"></a>**PS04 — [Launch and Starter Pack](https://news.xbox.com/en-us/2014/07/08/project-spark-officially-launches-in-october/), July 8, 2014; [postlaunch achievement guide](https://news.xbox.com/en-us/2014/10/15/games-best-achievements-in-project-spark/), October 15, 2014.** Primary launch/access, editable dialogue and Avalon detour. Historical entitlements, not current purchase advice.

<a id="ps05"></a>**PS05 — [Free incubation-engine transition](https://news.xbox.com/en-us/2015/09/28/games-project-spark-transition/), September 28, 2015.** Primary model/discovery/development transition and dated participation claims. Output is not profit or retention; secondary misstatements about doubled prop limits are excluded.

<a id="ps06"></a>**PS06 — [Sunset notice reproduction](https://www.destructoid.com/rest-in-peace-project-spark/), Jordan Devore, May 13, 2016.** Contemporary Gratz announcement/local-save warning. Attributed operating explanation, not a complete internal postmortem.

<a id="ps07"></a>**PS07 — [Final online day](https://www.gamespot.com/articles/project-spark-goes-offline-for-good-after-today/1100-6442590/), Eddie Makuch, August 12, 2016.** Closure confirmation and canceled future Conker content. Residual hub platform labels do not prove a shipped Xbox 360 version.

<a id="ps08"></a>**PS08 — [Open-beta hands-on](https://www.windowscentral.com/project-spark-open-beta), Paul Acevedo, March 2014.** Original Crossroads play account. Restricted beta choices and old payment rules are not the later full/free catalogue; embedded footage not watched.

<a id="ps09"></a>**PS09 — [Crossroads historical guide](https://projectspark-archive.fandom.com/wiki/Crossroads%3A_Play_and_Change_a_Game).** Community spatial-choice and route-friction account. Old paid options and reported bugs are version-qualified; unsupported exact prevalence/values excluded.

<a id="ps10"></a>**PS10 — [Original game manual](https://dlassets-ssl.xboxlive.com/public/content/4c48886c-2de2-48b8-8ec3-4f87424b2ff5/GameManual/2cb10e54-9350-445e-af63-63c46c6737f7/en-SG/index.html).** Primary Champion, lineage and historical remix rules. Missing button images are not reconstructed; old Marketplace instructions superseded by PS05.

<a id="ps11"></a>**PS11 — [Achievement reference](https://projectspark.fandom.com/wiki/Achievements).** Community transcription of authored Void Storm/Conker objectives. Objective text establishes intended tasks, not personal completion or universal prop capabilities.

<a id="ps12"></a>**PS12 — [An Ocean of Possibilities](https://www.gamespot.com/articles/project-spark-an-ocean-of-possibilities/1100-6415848/), Kevin VanOrd, November 7, 2013.** Original hands-on prototype: environment, healer, Kinect performance and yeti transformation. Prerelease limitations not relabeled current defects; no footage independently viewed.

<a id="ps13"></a>**PS13 — [3rd-Person Land Creator](https://schoolofkode.wordpress.com/2017/09/26/3rd-person-land-creator/), September 26, 2017.** Original community tutorial/Kode and stated boundary warning; substantive indexed body inspected, direct retrieval failed. Post-shutdown publication is not a revived official service.

<a id="ps14"></a>**PS14 — [Brain Kode index](https://schoolofkode.wordpress.com/brain-kode-index/).** Original tutorial index distinguishing native and contributed behavior. Named families are navigation, not a claim every linked Brain was tested or every page read.

<a id="ps15"></a>**PS15 — [Test Chamber: Project Spark](https://gameinformer.com/b/features/archive/2014/10/16/test-chamber-project-spark), Kyle Hilliard, October 16, 2014.** Written postlaunch capture description and viewing route with Andrew Reiner. Full recording not watched; no scene/timestamp claims.

<a id="ps16"></a>**PS16 — [A Little Help From My Friend](https://www.trueachievements.com/a192392/a-little-help-from-my-friend-achievement), PalmettoBling, November 2014; o Blaze UK o, February 2016.** Direct local-controller/credit/rejoin accounts. Historical reports, not fresh verification or an exhaustive network specification.

<a id="ps17"></a>**PS17 — [Project Spark review](https://www.eggplante.com/2015/04/18/project-spark-review/), Brent Botsford, April 18, 2015.** Original creation/play and audiovisual critique. Reporter speculation about technical causes and sweeping catalogue judgments remain opinion; not imported as measured facts.

<a id="ps18"></a>**PS18 — [Free-transition and PC multiplayer report](https://www.newgamenetwork.com/news/10909/project-spark-goes-completely-free/), September 29, 2015.** Contemporary report quotes developers on PC multiplayer still being only a distant possibility. Does not prove every advertised network feature shipped elsewhere.

<a id="ps19"></a>**PS19 — [Firsthand creation review](https://www.gamer.ne.jp/news/201412100001/), December 10, 2014.** Original Japanese play/creation account, especially remix-versus-original distinction. General online/multiplayer descriptions not used to invent exact session limits.

<a id="ps20"></a>**PS20 — [Conker episode and community launch](https://www.gamespot.com/articles/conker-s-big-reunion-launches-tomorrow-with-10-fre/1100-6426822/), Ivan Ho, April 22, 2015.** Historical episode/asset and early-community-access account. Body's loose Bad Fur Day naming is clarified as Big Reunion; video is metadata-only.

<a id="ps21"></a>**PS21 — [Conker announcement and developer comments](https://www.gematsu.com/2015/03/new-conker-game-coming-to-project-spark-on-april-23), Sal Romano, March 19, 2015.** Reproduced Sterchi comments on Rare, voice/music and premise; not an independently read full original interview or promise later episodes shipped.

<a id="ps22"></a>**PS22 — [Conker asset detail](https://www.destructoid.com/a-better-look-at-our-beloved-conker-in-project-spark/), Jordan Devore, April 2015.** Reproduced pack list: paired money behaviors, disco object and control template. Selected concrete facts, not a copied asset catalogue or verified gameplay session.

<a id="ps23"></a>**PS23 — [Laura Karpman biography](https://www.laurakarpman.com/bio), inspected September 26, 2026.** Primary Project Spark scoring credit. Not a complete soundtrack analysis or claim of sole authorship of every audio asset.

<a id="ps24"></a>**PS24 — [Xbox music collaboration](https://news.xbox.com/en-us/2014/03/25/project-spark-linkin-park/), March 25, 2014; [artist-label release and official video](https://wmg.jp/linkin_park/news/55623), March 28, 2014.** Primary remix-station/promotion and viewing identity. No lyrics copied, full recording watched or measured acquisition attribution; old platform plans remain historical.

<a id="ps25"></a>**PS25 — [SkyBox Labs project page](https://skyboxlabs.com/games/project-spark/).** Primary co-development credit. Stale beta, dates/platform and payment copy is not used as a present product specification.

<a id="ps26"></a>**PS26 — [Final service day and canceled platform](https://www.windowscentral.com/microsofts-project-spark-going-dark-after-today-download-content-now), John Callaham, August 12, 2016.** Contemporary Xbox 360 cancellation/local-access reporting. Its erroneous March date for the sunset announcement is corrected by the actual May notice, not repeated.

<a id="ps27"></a>**PS27 — [Full sunset statement reproduction](https://worthplaying.com/article/2016/5/13/news/99434-project-spark-all-shutting-down-in-august/), May 13, 2016.** Primary statement in contemporary reporting, including output and teaching activity. No inferred team size, cost or profit from those counts.

<a id="ps28"></a>**PS28 — [HYPERPIPES creator description](https://store.steampowered.com/app/5009100/HYPERPIPES/), inspected September 26, 2026.** Creator's account of a Project Spark-origin idea rebuilt in Godot. No automatic-export, verified sales or typical-success claim.

<a id="ps29"></a>**PS29 — [Project Spark player review bodies](https://www.metacritic.com/game/project-spark/user-reviews/), selected 2014–2015 and 2023 posts.** Named direct testimony, not representative sentiment. Historical payment complaints and unsupported financial explanations remain distinct from later verified transitions.
