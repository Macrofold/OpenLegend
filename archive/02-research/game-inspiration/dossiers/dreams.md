# Dreams — full research dossier

**G13 · Complete research pass, September 26, 2026.** Dreams is treated as both a playable PS4 release and an authoring/social platform. This pass distinguishes platform-level mechanics from mechanics authored inside individual Dreams, launch-era promises from shipped features, local multiplayer from the cancelled online-multiplayer plan, and live-development sunset from server shutdown. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Project Spark is a separate pass. No personal gameplay, complete-video viewing or proprietary-code audit is claimed.

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


## 5. Playing Dreams: a browser of authored rules, not one universal ruleset

Dreams' play side is **DreamSurfing**: browse/search recommendations, launch a creation, rate or save it, and move to another with very little transition cost. Media Molecule's beginner guide describes new, popular and highly rated discovery routes; launch reviews also documented search, curated picks, trending feeds, recommendations and rapid playlist-style surfing. [DR06](#dr06) [DR17](#dr17) [DR18](#dr18)

This matters mechanically because Dreams is not like an RPG whose combat, inventory and progression apply to every location. A creator can make a racer, animation, puzzle, shooter, sculpture, song or menu-driven story. The player therefore repeatedly learns a **local contract**: what can move, what input matters, what failure means, and what persists in that particular creation.

### Art's Dream is the authored onboarding proof

Media Molecule's launch campaign, **Art's Dream**, follows a musician separated from his band and uses multiple genres to demonstrate the common toolset. Reviews describe point-and-click adventure interactions with dialogue/item puzzles, action/platforming sections, top-down or side-on combat, musical interludes and later genre shifts. The value is not merely variety: one story carries the player between different control and rule systems without pretending they are one systemic world. [DR17](#dr17) [DR19](#dr19)

**OpenLegend lesson:** a mechanics platform benefits from authored exemplars that demonstrate *combinations* of primitives, not only API-style tutorials. An example should be enjoyable even for someone who never opens the editor.

## 6. What the normal RPG categories mean here

Dreams is useful precisely because several requested categories are **creator-defined rather than platform-global**:

| Requested mechanics area | Dreams' platform-level answer |
| --- | --- |
| Character creation / classes | No universal player class system. Creators can build or remix puppets/characters, wire controls and expose character-selection states. Individual Dreams can implement classes. |
| Skills / levels / perk or tech trees | No shared RPG skill tree governs all creations. Logic, selectors, variables and persistent-in-Dream values can implement levels, unlocks, perks and state machines inside a Dream. Tutorials/Imp Quests historically formed a separate learning/engagement wrapper. |
| Items / weapons / armour / inventory | No universal inventory schema. Elements can visually/behaviorally represent items; persistent variables can track collected/spent quantities; creators build pickup, equipment, weapon and inventory logic. |
| Magic / spells | No global magic grammar. Creators compose input → condition/resource → emitted object/effect/damage/animation/audio to implement spells or powers. |
| Combat | No universal combat model. Health Manager/Modifier, projectiles or emitted objects, collision/sensors, destroy/respawn, animation and controller signals supply common building blocks. |
| Looting | Creator-authored. Variables, score/collection logic and scene persistence can model drops, currency, equipment or one-off keys. |
| Quests / story | Creator-authored scenes, dialogue, variables, doorways and state logic. Art's Dream is Media Molecule's flagship authored narrative. |
| NPCs / AI | No general cognitive-agent layer. Follower/flee behavior, tags, sensors, selectors, timers, animation and authored state logic can build enemies or simple actors. |
| World map / environment | A Dream links Scenes; within Scenes creators assemble geometry, lighting, cameras, physics, triggers and logic. |
| Relationships / party | No platform-wide relationship simulation. Creators can implement it with variables/dialogue/state. Social collaboration exists between *creators*, which is a separate system. |
| Economy / trade | No shared in-fiction economy. Creators can implement currencies and shops; Dreams itself was a paid platform without an in-Dreams creator marketplace. |
| Endgame | Defined per creation. At the platform level the long-term loop is discover → play → learn → create/remix → release → receive engagement → iterate. |

This separation is important for OpenLegend: **generic primitives do not require generic fiction**. A health primitive can support a fighter, destructible door or machine; a variable can be reputation, hunger, spell charge or political support. Dreams keeps many low-level capabilities content-agnostic and lets authored composition provide semantic meaning.

## 7. The gameplay grammar: sense → process → act → remember

Dreams' gadget documentation exposes an unusually clear mechanics grammar. Sensors generate signals; logic gadgets transform or gate them; output/movement gadgets produce consequences; variables preserve state. [DR07](#dr07) [DR08](#dr08) [DR09](#dr09)

### Inputs and perception

A **Controller Sensor** maps player input to authored actions and can make an object possessable. **Trigger Zones** detect entry, while impact and movement sensors can respond to contact, speed, acceleration or position. Tags give creators named targets for other gadgets. [DR07](#dr07)

This creates an explicit distinction between **what happened physically** and **what the game notices**. A player can walk beside a trap forever if its trigger does not detect the right label; conversely a broad zone can react before the visible object appears to touch anything.

### Conditions, state machines and randomness

**AND/OR/NOT gates**, timers, counters, calculators, selectors, randomisers and exclusive gates process signals. Selectors can encode modes or menus; exclusive gates can prevent incompatible actions from firing together and support priorities/queues; microchips package logic behind named ports. [DR08](#dr08)

**Constructed interaction:** an NPC guard can occupy states such as patrol, suspicious, chase and return. Sensors supply evidence, a selector holds the current state, priority logic prevents “wave hello” and “attack” from occurring simultaneously, and timers control decay. This is an illustration from documented primitives, not a claim that Dreams ships a universal guard AI.

### State and persistence

Variables can record quantities such as collected objects, damage, kills or arbitrary named state, and can be marked **Persist in Dream** so the same value survives movement between Scenes that define the matching variable. [DR08](#dr08)

That allows a creator to model:
- keys and quest flags;
- XP and levels;
- currencies and shop balances;
- relationship/reputation values;
- inventory counts;
- skill unlocks;
- hunger, mana, morale or other meters.

The system does not prescribe what those numbers *mean*. That is a powerful extensibility property.

### Consequences, combat and recovery

Mover/rotator/follower gadgets move entities; a **Follower** can pursue or flee a tagged target. **Emitters** create temporary copies such as projectiles or enemies. **Health Manager/Modifier** provides damage/healing semantics, and **Destroyer** removes an object when signalled. Checkpoints can respawn a possessed puppet after death. [DR09](#dr09) [DR10](#dr10)

A combat loop can therefore be assembled from input, projectile emission, collision detection, health modification, death state, score/loot variables and respawn. None of those parts require every game to share the same weapon slots, damage formula or death penalty.

### Environment and physics interaction

Creators can make objects movable, constrain them with connectors such as sliders/bolts/string, alter gravity globally, trigger motion or destruction, animate properties, and drive lights/fog/sky/post-processing through signals. [DR10](#dr10) [DR11](#dr11)

So “light this on fire” is not a universal chemistry rule in Dreams. A creator can build a fire interaction by combining tags, trigger/collision detection, state changes, damage, visual effects and sound; another creator may make visually identical wood entirely inert. **Affordance consistency is authored, not guaranteed by the engine.**

## 8. Animation, audio and presentation are first-class mechanics tools

Dreams' visual identity is built from **flecks** used in sculpture surfaces and 3D paint strokes, with Coat/Style/Effects changing appearance and motion. Reviewers repeatedly noticed a soft/painterly default signature even though skilled creators could push toward realism. [DR12](#dr12) [DR20](#dr20)

Animation is integrated with gameplay logic rather than isolated in a cutscene subsystem. Keyframes can store property states; timelines sequence animation, logic, sensors, cameras, lights and audio. The 2023 final major Create update expanded the **Action Recorder** with an animation canvas plus action, keyframe, possession and physics recording, including baking physics/logic-driven motion into cheaper recorded animation. [DR13](#dr13)

That supports several useful workflows:
- perform motion directly rather than keyframe every transform;
- keyframe precise poses;
- record player possession;
- capture simulated physics and replay it deterministically;
- wire animation playheads and states into game logic.

Audio is similarly constructive. Sound Mode supports instruments, effects, music and voice; sound gadgets can be triggered by logic and can create polyphonic voices. The web Audio Importer accepts original WAV material under its rules. [DR14](#dr14)

**OpenLegend lesson:** presentation should be able to subscribe to state without *being* the state. “Door is locked” can drive an animation, sound, subtitle and interaction affordance independently. The reverse also matters: a glowing/red object should not imply damage unless world rules make that relationship true.

## 9. Resource budgets make composition a design problem

Dreams exposes separate **gameplay, graphics and audio thermometers**. The important pattern is not the exact percentages but the fact that a creator sees constrained budgets while composing. [DR15](#dr15)

A detailed object may be affordable once but expensive when stamped repeatedly. An emitted/shared reference can reduce duplicated gameplay cost; later animation tooling specifically targeted expensive animation-gadget patterns. Audio analysis can show which sounds consume readiness resources. [DR04](#dr04) [DR13](#dr13) [DR14](#dr14)

**Constructed choice:** create twenty unique enemies, or one configurable enemy Element with several behaviors and appearances. Reuse saves budget but can make the world repetitive. The tool does not solve that tradeoff; it makes the cost visible.

For OpenLegend inventions, this is a useful precedent for exposing **capability budgets** rather than allowing an extension to silently consume unbounded simulation, cognition, rendering or persistence resources.

## 10. Reuse, remixing and collaboration are explicit product mechanics

Dreams treats content reuse as a first-class permission model rather than an informal copy convention:
- **Private** versions are online but limited to owner/collaborators.
- **Playable** versions can be discovered/played while remix remains controlled by the creator.
- **Public** versions can be remixed, stamped and edited; genealogy/credits preserve attribution. [DR16](#dr16)

Elements can be reusable characters, sculptures, music, sounds or microchips containing logic. A creator can therefore specialize: build a vehicle controller, publish it, and let someone else integrate it into a race without re-authoring steering from scratch.

Collaboration is not the same as synchronous multiplayer. Multiple creators can contribute to a project, and remixing provides asynchronous composability. The platform never shipped its planned **online multiplayer** feature; local/couch multiplayer can be authored for creations, including templates supporting up to four local players. [DR21](#dr21) [DR22](#dr22)

**OpenLegend lesson:** invention packs should carry provenance, compatibility and permissions through composition. “Can use this” and “can modify/publish derivatives of this” are different rights.

## 11. Discovery and feedback are part of the mechanics ecosystem

At launch, DreamSurfing mixed search, tags, trending/recommended lists, developer curation, community jams and awards. Critics liked the near-instant transition between wildly different creations, but also noted that unfinished tests, knock-offs and polished games could blur together. [DR17](#dr17) [DR18](#dr18) [DR20](#dr20)

After the 2023 server migration and end of live development, several social surfaces changed: community jams and major events ended; activity feeds and friend scoreboards were removed; Homespaces became local-only; scoreboards were capped to their top entries; online storage/creation/version limits were introduced. [DR21](#dr21)

In March 2024 Media Molecule said the dedicated curation team's work would end, moving DreamSurfing toward recommender- and tag-driven evergreen playlists while preserving genre pages, archives and prior curated sets. It explicitly described the goal as a more self-sustaining discovery system. [DR23](#dr23)

A creator's loop therefore changed over time:
1. make or remix;
2. test;
3. release;
4. become discoverable through search/recommendation/curation;
5. receive plays, likes/comments/score participation;
6. update the creation;
7. potentially be reused by others.

**Failure mode:** creation tooling can be excellent while the audience side becomes noisy. A “marketplace” of mechanics is not useful if players cannot tell a finished, compatible, maintained invention from an experiment.

## 12. Release, ownership and the walled-garden boundary

Dreams supports versioned releases and separates discoverability from remix rights. A creator can retain private work, publish playable work, or expose remixable public components. Updates can preserve local overrides while adopting upstream changes. [DR05](#dr05) [DR16](#dr16)

The major boundary is export. Media Molecule's 2023 support FAQ states that Dreams creations themselves cannot be exported as standalone projects to other software. Music/video can be exported through PlayStation sharing, and later content-usage terms allowed certain art/music/imagery made in Dreams to be used externally, but the authored interactive game remains inside the Dreams runtime. [DR21](#dr21) [DR24](#dr24)

The Guardian's review made this a central criticism: creators increased the value of a commercial platform without a general creator monetization/export path. That concern looks more significant in retrospect because Media Molecule later ended feature development and said it had been unable to define a sustainable path for continued support. These are **related constraints, not proof of a specific causal chain**. [DR19](#dr19) [DR21](#dr21)

## 13. Production and release history

Dreams' lineage follows Media Molecule's LittleBigPlanet emphasis on player creation, but broadens from level construction into a general visual/audio/gameplay authoring environment. Media Molecule showed related creation technology at the PS4 reveal in 2013; Dreams was formally revealed later and iterated publicly for years. [DR25](#dr25)

Useful product milestones:
- **2018:** public beta era begins.
- **April 16, 2019:** paid Creator Early Access launches with the core creation suite, tutorials/templates and community content, while the authored story remained absent. [DR26](#dr26)
- **February 14, 2020:** full PS4 release; Early Access users received the launch build and Art's Dream shortly beforehand. [DR27](#dr27)
- **July 22, 2020:** free PSVR support added for playing and creating in VR. [DR28](#dr28)
- **2020–2023:** ongoing creator tools, community events, Mm Originals and infrastructure changes.
- **June 2023:** major animation update improves Action Recorder workflows. [DR13](#dr13)
- **September 1, 2023:** regular live-development support ends; play/create/share remain available. [DR21](#dr21)
- **March–April 2024:** Media Molecule transitions ongoing discovery away from dedicated human curation toward evergreen/recommender surfaces, while stating there were then no plans to take Dreams offline. [DR23](#dr23)

Media Molecule credited not just its core team but Sony technical, legal, moderation, QA, analytics, user-testing and localization groups plus beta/Early Access creators for the production process. Dreams received BAFTA's Technical Achievement award in 2021. [DR29](#dr29)

No trustworthy public lifetime unit-sales or retention series was found in this pass, so this dossier does not derive commercial success from review counts. The strongest first-party business statement is the 2023 explanation that the studio could not define a sustainable continuation path.

## 14. Five written reviews: what critics actually valued and resisted

These are five separately read reviews, not aggregate blurbs.

### 1. Push Square — Stephen Tailby, February 2020

**Liked:** enormous creative range; easy reuse of community assets; fast DreamSurfing; strong curation and social positivity; Art's Dream as both story and proof; excellent tutorials; unusually cohesive presentation for a complicated editor.

**Disliked / friction:** becoming proficient takes substantial time; creation controls can be fiddly, especially navigating 3D space; Homespace added little; performance varies by creation. The review's 10/10 enthusiasm should not erase those onboarding costs. [DR18](#dr18)

### 2. GameSpot — Richard Wakeling, March 2020

**Liked:** Art's Dream demonstrates genre/camera changes without losing narrative cohesion; tutorials teach real game-design concepts without feeling like homework; presets and reusable community content let novices start above zero; discovery makes hopping among creations easy.

**Disliked / friction:** DreamShaping is initially overwhelming; none of the controller schemes felt fully intuitive; motion cursor plus 3D navigation made precision cumbersome; both DualShock and Move had different weaknesses. [DR17](#dr17)

### 3. The Guardian — Nic Reuben, February 2020

**Liked:** the editor makes normally technical creative work tactile and playful; performing motion, music and animation lowers the emotional barrier between “player” and “creator”; tutorials make learning itself part of the entertainment.

**Disliked / friction:** the reviewer objected to the closed commercial platform: interactive Dreams stayed inside Dreams and creators had no general way to monetize the value they produced. The review also noted that online multiplayer and VR were still promises at launch; VR later shipped, online multiplayer did not. [DR19](#dr19) [DR21](#dr21)

### 4. Destructoid — Jordan Devore, February 2020

**Liked:** hands-on tutorials/masterclasses; a consistent toy-like interface across disciplines; immediate experimentation; fast browsing; the possibility of creating only one useful asset rather than a whole game; Art's Dream as an emotionally effective showcase.

**Disliked / uncertainty:** user-created quality was inevitably uneven; the review raised unresolved questions around PS5, VR, ownership and export. Its optimism that the platform was “built to last” is historically useful precisely because later support decisions show that strong tools do not settle platform sustainability. [DR20](#dr20)

### 5. Easy Allies — Brandon Jones, February 2020

**Liked:** flexible creator tools, templates and community collaboration; broad playlists; striking projects and a large variety of things to play; Art's Dream; ability to borrow assets where a creator lacks a discipline.

**Disliked / friction:** discovery mixed polished work with buggy, unfinished experiments; filtering a specific genre or multiplayer experience could be tiring; the default painterly look and wobbly animation could betray attempted realism; memory remained a real constraint. [DR30](#dr30)

### Player evidence and Steam boundary

**Steam review sampling is not applicable:** Dreams was released for PlayStation 4, not Steam. This pass therefore does not fabricate a “top Steam reviews” section.

Self-selected user reviews show the same split at sharper extremes. Some Metacritic users praised Dreams as a low-barrier way to learn game creation and loved the community; others said the editor remained harder than advertised, the player-facing library felt full of short/unfinished work, and the absence of PC/online multiplayer limited the platform. A detailed GameFAQs player review focused specifically on motion controls, confusing grouping/editing behavior and tutorial friction. [DR31](#dr31) [DR32](#dr32)

A 2023 community discussion after live support ended reported continued likes/comments but complained that discoverability could feel arbitrary once human curation diminished. That is one creator's account, not measured platform-wide engagement. [DR33](#dr33)

## 15. Stable player-preference patterns to record

Across independent reviews and player accounts, the most repeated **positive** preferences were:
- expressive breadth without conventional programming;
- learning by physically manipulating and immediately testing things;
- reusable community assets that let specialists contribute;
- Art's Dream and Mm Originals as proof-quality examples;
- rapid switching between creations;
- a supportive creator culture and attribution/remix model.

The most repeated **negative or divisive** preferences were:
- 3D authoring with controller/motion input demands patience;
- “easy to start” is not “easy to master”;
- UGC quality varies dramatically;
- discovery becomes work when the player wants one polished, specific genre rather than surprise;
- the strong Dreams rendering/animation signature can fight attempted realism;
- interactive creations are runtime-locked rather than standalone exports;
- no shipped online multiplayer or native PS5/PSVR2 version;
- platform sustainability/continued feature development ultimately ended.

These are qualitative themes, not prevalence estimates.

## 16. Transferable inspiration for OpenLegend

### A. Build a compositional grammar, not a catalogue of bespoke features

Dreams gets enormous expressive range from a relatively small vocabulary: observe, signal, gate, store, emit, move, damage/heal, display, animate and compose. OpenLegend's invention layer can use the same principle: new systems should combine stable primitives rather than require engine changes for every spell, profession, political system or machine.

**Limit:** Dreams' primitives do not enforce world semantic consistency. OpenLegend wants a persistent simulation whose laws matter across inventions, so extension APIs need stronger contracts around authority, identity, causality and persistence.

### B. Make components independently useful

An Element can be a tree, controller, song or logic chip without pretending to be a complete game. OpenLegend inventions should similarly be able to contribute one capability: a new need model, crafting recipe family, spell grammar, behavior policy, vehicle component or social institution.

**Limit:** a library full of low-level parts can become impossible to navigate. Packaging, examples, compatibility metadata and discovery are product features.

### C. Give every invention a visible cost envelope

Thermometers teach creators that a feature is not free. OpenLegend likely needs budgets for simulation frequency, entity count, persistent state, LLM/cognition work, event subscriptions and rendering/network cost. A creator should see the tradeoff before a world becomes unstable.

### D. Separate content, logic, state and presentation

Dreams lets animation, sound and visuals respond to logic rather than collapsing them together. This is especially important for OpenLegend's extensibility: a “burning” state should have authoritative rules, while particles, light, sound and UI independently represent it.

### E. Treat examples as part of the language

Art's Dream demonstrates what composition can become. For OpenLegend, a few ambitious first-party worlds/invention packs may teach more than a long reference manual—provided the examples are built with the same public mechanisms available to players.

### F. Provenance and remix rights must survive composition

Dreams' genealogy is valuable. If OpenLegend lets inventions build on inventions, the world should be able to answer: *which pack introduced this behavior, what version is active, who owns it, what depends on it, and may this derivative be redistributed?*

### G. Do not equate creation supply with player value

Dreams is the sharpest warning in this library so far: technically astounding creation can coexist with discovery friction and an unsolved long-term platform model. OpenLegend should measure whether players return to *play worlds*, whether creators find audiences, and whether reusable inventions reduce effort—three separate outcomes.

## 17. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / promise | §§1, 5, 13 |
| R02 actions / mechanics | §§2–8 |
| R03 items / entities / composition | §§4, 6–10 |
| R04 progression / economy / time | §§6, 9, 11–13 |
| R05 concrete interactions | §§1–4, 7–9 |
| R06 people / AI / social / multiplayer | §§6–7, 10–11 |
| R07 art / audio / interface / feel | §§2, 8, 14 |
| R08 story / narrative | §§5, 14 |
| R09 production | §13 |
| R10 distribution / promotion / virality | §§11–13 |
| R11 commercial / participation | §§12–13 |
| R12 reviews / player feedback | §§14–15 |
| R13 inspiration / limits | §16 |
| R14 sources / navigation / preservation | this section + sources |

**Preservation check:** the prior paired chapter's central finding is retained: Dreams ended live feature support, **not** access to play/create/share, and Media Molecule explicitly said it could not define a sustainable path. This dossier does not convert that statement into an unsupported claim that export, monetization, PC support, multiplayer or any single absent feature “caused” the decision. The earlier chapter remains canonical for the cross-game Dreams/Project Spark viability comparison; this dossier owns the full Dreams pass.

Project Spark remains G14 and is not discharged by this research.


## Sources

<a id="dr01"></a>**DR01 — [Creation types](https://docs.indreams.me/en/create/resources/videos/tools-and-tips/understand-creation-types).** Primary written distinction among Elements, Scenes, Dreams and Collections. Embedded video not watched in full; no claim that every upload is a finished game.

<a id="dr02"></a>**DR02 — [Authoring modes](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/modes).** Primary form/presentation/sound/Test Mode description. Qualitative controls, not an exhaustive undocumented renderer or physics specification.

<a id="dr03"></a>**DR03 — [Glossary](https://docs.indreams.me/en/create/resources/glossary).** Primary Imp, possession, grouping and signal definitions. The page's older Homespace visiting claim is not adopted; current release/support notes must qualify obsolete entries.

<a id="dr04"></a>**DR04 — [Ancient Dangers Play & Edit 3](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/ancient-dangers/help/play-n-edit-walkthrough-3).** Full primary written lesson inspected: lift grouping, explicit gate/trap logic and shared emission reference. Examples are rules-based analysis, not an independently played tutorial. No copied step-by-step walkthrough or invented performance measurement.

<a id="dr05"></a>**DR05 — [Update Mode](https://docs.indreams.me/en/create/releasing/using-update-mode).** Primary version/override controls and tree example. Its permission advice must be read with the dedicated current release rules; no guarantee of semantic compatibility after every automatic update.


<a id="dr06"></a>**DR06 — [A Beginner's Guide to Dreams — Play](https://docs.indreams.me/en/game-info/beginners-guide-play).** Media Molecule / Indreams. Primary DreamSurfing and Art's Dream onboarding description. Accessed 2026-09-26.

<a id="dr07"></a>**DR07 — [Sensors & Input](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/sensors-and-input).** Media Molecule / Indreams. Primary Controller Sensor, Trigger Zone and movement/input behavior. Accessed 2026-09-26.

<a id="dr08"></a>**DR08 — [Logic & Processing](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/logic-and-processing).** Media Molecule / Indreams. Primary gates, timers, counters, selectors, calculators, microchips and persistent variables. Accessed 2026-09-26.

<a id="dr09"></a>**DR09 — [Movers & Output](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/movers-and-output).** Media Molecule / Indreams. Primary Follower, Emitter, Destroyer, health and display/output descriptions. Accessed 2026-09-26.

<a id="dr10"></a>**DR10 — [Gameplay Gear](https://docs.indreams.me/en-US/create/resources/edit-mode-guide/assembly/gadgets/gameplay-gear).** Media Molecule / Indreams. Primary checkpoint, score and global-setting examples. Prize Bubble material is historically documented but the feature was removed in the 2023 server migration.

<a id="dr11"></a>**DR11 — [Cameras & Lighting](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/cameras-and-lighting) and [Connectors](https://docs.indreams.me/en-US/create/resources/edit-mode-guide/assembly/gadgets/connectors).** Media Molecule / Indreams. Primary authored camera, lighting/weather-like state and physical-joint behavior.

<a id="dr12"></a>**DR12 — [Flecks](https://docs.indreams.me/en/create/resources/edit-mode-guide/stroke/flecks) and [Paint Mode](https://docs.indreams.me/en/create/resources/edit-mode-guide/stroke).** Media Molecule / Indreams. Primary rendering/paint vocabulary; does not imply every Dreams creation has the same visual style.

<a id="dr13"></a>**DR13 — [Up & Animate 'Em — Dreams v2.58](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v258) and [animation recording guide](https://docs.indreams.me/en/create/resources/recording-modes).** Media Molecule / Indreams. Primary final major animation workflow and optimization changes, June 2023.

<a id="dr14"></a>**DR14 — [Sound Mode](https://docs.indreams.me/en/create/resources/edit-mode-guide/sound), [Dreams Audio Tech](https://docs.indreams.me/en/create/sound/dreams-audio-tech), and [Audio Importer](https://docs.indreams.me/en/create/sound/audio-importer).** Media Molecule / Indreams. Primary audio creation/runtime documentation.

<a id="dr15"></a>**DR15 — [Thermometer](https://docs.indreams.me/en/create/resources/thermometer) and [Understanding Limits](https://docs.indreams.me/en/create/releasing/understanding-limits).** Media Molecule / Indreams. Distinguishes per-creation resource thermometers from post-migration account storage/version limits.

<a id="dr16"></a>**DR16 — [Release Terminology Demystified](https://docs.indreams.me/en/create/releasing/releasing-your-dreams).** Media Molecule / Indreams. Primary Element/Scene/Dream/Collection, version, Private/Playable/Public and attribution/remix semantics.

<a id="dr17"></a>**DR17 — [Dreams review](https://www.gamespot.com/reviews/dreams-review/1900-6417414/).** Richard Wakeling, GameSpot, 2020-03-03. Full written review inspected; strong on Art's Dream, tutorials, community reuse/discovery and controller-learning friction.

<a id="dr18"></a>**DR18 — [Dreams Review](https://www.pushsquare.com/reviews/ps4/dreams).** Stephen Tailby, Push Square, 2020-02. Full written review inspected; creator breadth, DreamSurfing, community, Art's Dream, time investment, controls, Homespace and performance variation.

<a id="dr19"></a>**DR19 — [Dreams review — creative learning as delightful play](https://www.theguardian.com/games/2020/feb/20/dreams-review-creative-learning-as-delightful-play).** Nic Reuben, The Guardian, 2020-02-20. Full written review inspected; tactile authoring praise and explicit walled-garden/creator-value criticism. Its launch-era VR/online-multiplayer status is historical; later sources qualify outcomes.

<a id="dr20"></a>**DR20 — [Review: Dreams](https://www.destructoid.com/reviews/review-dreams/).** Jordan Devore, Destructoid, 2020-02-16. Full written review inspected; tutorials, cross-discipline UI, rapid Dreamiverse loop, uneven UGC and launch-era future questions.

<a id="dr21"></a>**DR21 — [An update on server changes and live service support for Dreams](https://docs.indreams.me/en/whats-happening/news/dreams-support-update).** Media Molecule, 2023-04-11 with migration updates. Primary source for September 2023 support end, continued play/create/share, migration feature removals/limits, no standalone export, and cancellation of planned online multiplayer/PS5/PSVR2/3D-printing work.

<a id="dr22"></a>**DR22 — [Mini-Golf template: take the foundation to the next level](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/mini-golf/take-to-the-next-level).** Media Molecule / Indreams. Primary example of authored couch multiplayer with four player puppets; not evidence of online multiplayer.

<a id="dr23"></a>**DR23 — [Update on Community & Curation Support for Dreams](https://docs.indreams.me/en/whats-happening/news/curation2024).** Media Molecule, 2024-03-20. Primary final curation-team transition, recommender/tag playlists and then-current no-shutdown statement. It is a 2024 status statement, not a guarantee for all future years.

<a id="dr24"></a>**DR24 — [What happens to Dreams now that live support has ended?](https://docs.indreams.me/en/whats-happening/news/dreams-live-support).** Media Molecule, 2023-09-13. Primary post-roadmap statement: creations/play remained available; content-usage terms broadened external use for some art/music/imagery; interactive creations remained Dreams-hosted.

<a id="dr25"></a>**DR25 — [Follow your Dreams: how the future of playing video games is making them](https://www.theguardian.com/games/2020/feb/24/dreams-video-games-making-media-molecule-playstation-4) and [Dreams: 9 Things We Learned](https://www.gamespot.com/articles/dreams-9-things-we-learned-about-sonys-incredibly-/1100-6455941/).** Original interviews/reporting with Media Molecule leadership plus historical reporting. Used for LittleBigPlanet lineage, authoring intent and long development/reveal context.

<a id="dr26"></a>**DR26 — [Dreams PS4 Early Access Release Date Revealed](https://www.gamespot.com/articles/dreams-ps4-early-access-release-date-revealed/1100-6465892/) and Media Molecule/PlayStation's April 2019 Early Access messaging.** Contemporaneous reporting of Creator Early Access scope, April 16 launch, feedback purpose and carry-over.

<a id="dr27"></a>**DR27 — [Own Dreams Early Access? Upgrade on February 11th!](https://www.mediamolecule.com/blog/article/own_dreams_early_access_upgrade_on_february_11th).** Media Molecule, 2020-02-04. Primary launch transition and Art's Dream release information.

<a id="dr28"></a>**DR28 — [PS VR support comes to Dreams on July 22](https://blog.playstation.com/2020/06/30/ps-vr-support-comes-to-dreams-on-july-22/).** PlayStation / Media Molecule, 2020-06-30. Primary shipped VR update announcement.

<a id="dr29"></a>**DR29 — [A Big BAFTA 'Thank You' From Siobhan](https://www.mediamolecule.com/blog/article/a_big_bafta_thank_you_from_siobhan).** Media Molecule, 2021-03-26. Primary production acknowledgements and Technical Achievement BAFTA context.

<a id="dr30"></a>**DR30 — [Dreams review](https://easyallies.com/review/dreams).** Brandon Jones, Easy Allies, 2020-02. Full written review inspected; templates/collaboration, discovery quality variation, genre filtering, visual signature, animation roughness and memory constraints.

<a id="dr31"></a>**DR31 — [Dreams user reviews](https://www.metacritic.com/game/dreams/user-reviews/?num_items=100&platform=playstation-4&sort-by=date).** Self-selected PlayStation user testimony, retrieved 2026-09-26. Used only qualitatively for recurring praise/complaints; ratings are not treated as representative population measures.

<a id="dr32"></a>**DR32 — [Dreams player review: “Never has creating content be this frustrating”](https://gamefaqs.gamespot.com/ps4/168645-dreams/reviews/170030).** GameFAQs user SonGaton, 2020-03-05. Detailed negative first-person report focused on onboarding, grouping/editing confusion and motion/control discomfort. One player account, not consensus.

<a id="dr33"></a>**DR33 — [“Is Dreams still actively played?”](https://www.reddit.com/r/PS4Dreams/comments/18rvuv1/is_dreams_still_actively_played/).** r/PS4Dreams discussion, 2023-12-27. One creator reported ongoing engagement alongside discoverability problems. Anecdotal, post-support qualitative evidence only.
