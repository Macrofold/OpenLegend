# Dreams — full research dossier

**G13 · Complete research pass, September 26, 2026.** Dreams is treated as both a playable PS4 release and an authoring/social platform. This pass distinguishes platform-level mechanics from mechanics authored inside individual Dreams, launch-era promises from shipped features, local multiplayer from the cancelled online-multiplayer plan, and live-development sunset from server shutdown. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Project Spark is a separate pass. No personal gameplay, complete-video viewing or proprietary-code audit is claimed.

**What the player actually does:** Dreams combines a library of playable and audiovisual creations with tools for making more of them. **DreamSurfing** is the play/discovery route; **DreamShaping** is creation. A person can complete an authored adventure, try several small community games, listen to music, browse art, or build and share something. Creation is not a prerequisite for playing the included experiences. [DR14](#dr14)

The player-facing **Imp** and **Dream Queen** introduce this space. Giving a creation a Thumbs-Up or useful comment supplies another form of participation. An ordinary first session can begin with **Art's Dream**, rather than an empty editor. Its point-and-click, combat and platforming sections make the toolset's breadth concrete. [DR14](#dr14)

**Interpretation:** Dreams contains several products that must be evaluated separately: worthwhile play, approachable authorship, component reuse and a community/discovery service. A creator finishing a usable door and a visitor finishing an adventure have achieved different things. Neither should be judged only by the number of uploaded objects.

The numbered sections provide the full mechanics and reception survey. Detailed studies within them preserve additional worked interactions, production accounts and evidence limits; dated patch and platform qualifications apply to the historical overviews. Source annotations retain the access limits recorded by each research pass.

<a id="study-1"></a>

## 1. A component, a scene and a discoverable game are different objects

Media Molecule distinguishes **Elements**—reusable pieces—from self-contained **Scenes**, **Dreams** linking Scenes, and **Collections** organizing these creations. A Scene must be inside a Dream to appear in **DreamSurfing**; an Element does not become a discoverable finished game simply because it exists. [DR01](#dr01)

**Interpretation:** creating a useful component and giving someone a satisfying first session are different accomplishments. A tree, musical phrase or logic assembly can have value without being a standalone game, while a finished activity needs an understandable entry and ending. The hierarchy allows both specialist contributions and broader playable compositions.

**Constructed choice:** use an existing movement-capable character as a starting point, build a small environment around it, then package the Scene for others to play. That avoids requiring the same person to solve sculpture, controls, sound and game design before testing an idea. The next problem is still whether the resulting activity is worth playing, not whether the publication button succeeded.

<a id="study-2"></a>

## 2. The authoring vocabulary separates form, presentation and behavior

**Assembly Mode** puts scenes and gadgets together. **Sculpt** creates shapes; **Paint** creates three-dimensional strokes made of flecks; **Coat** alters surface appearance; **Style** changes fleck properties; **Effects** animates them; **Sound** supports instruments, effects and voices. **Test Mode** lets the creator exercise a scene and adjust gadget properties without treating every sculptural manipulation as a persistent change. [DR02](#dr02)

**Interpretation:** a rendered object, its visual treatment and its actual behavior are different design layers. Giving a shape a glowing finish does not automatically make it illuminate a useful area or damage a character. Keeping layers distinct permits the same behavior to acquire another appearance without implying that the appearance alone implements a rule.

The **Imp** is both a manipulable pointer and an identity-bearing interface. Possessing a configured character transfers control into it; leaving returns to Imp interaction. Groups and nested scope determine which objects are edited or moved together. Gadget input/output ports carry signals, including richer multi-value wires, rather than arbitrary natural-language claims. [DR03](#dr03)

**Constructed situation:** a lift works but its switch stays behind. Move the switch into the lift's moving subgroup so the usable control travels with it. This is a grouping/ownership problem, not a need to regenerate the whole mechanism. The official Ancient Dangers lesson demonstrates exactly this distinction. [DR04](#dr04)

<a id="study-3"></a>

## 3. Small explicit relationships create a playable predicament

The **Ancient Dangers Play & Edit 3** tutorial connects two switches through an **AND gate** to a main portcullis. Both paths must be completed in one play session before the central gate opens. It separately wires a **Trigger Zone** to an **Emitter** that creates a rolling spiked-ball hazard. [DR04](#dr04)

**Constructed interaction:** place the zone where a player's movement creates a clear warning/opportunity, rather than simply adding an unavoidable trap beside the spawn point. A detection condition, emitted object and physical route produce the danger together. Changing the zone changes when the same object becomes a threat; changing the route changes whether avoiding it is a meaningful choice.

**Interpretation:** a mechanic needs an actual condition and outcome. A label saying this is a two-switch door is weaker than a condition that reliably waits for both signals. Conversely, a technically working circuit can still produce a dull or unfair activity. Functional correctness and enjoyable placement are separate tests.

<a id="study-4"></a>

## 4. Reuse changes both author effort and resource cost

The same tutorial shows that repeatedly stamping expensive enemies can exhaust the gameplay thermometer. It teaches separating an emitted effects group from repeated triggers and sharing one emission reference; a health potion reference can similarly supply several spawned instances. [DR04](#dr04)

**Interpretation:** reusable design is not just copying visible shapes. Shared definitions and independently placed triggers can reduce repeated stored work while supporting different local situations. A finished room must still operate within its runtime constraints; reuse does not mean unlimited simultaneous complexity.

**Update Mode** lets a creator inspect or choose a component version, adopt the latest, or opt into automatic updates. It separately exposes replacing local changes and explains unavailable versions. Its tree example preserves a local leaf-colour edit while adopting a changed sway property from the original. [DR05](#dr05)

**Constructed choice:** accept an improved shared object or retain the version around which the scene was designed. Automatically taking a new version is a convenience, not proof that it preserves the scene's intended timing or appearance. A creator needs to see which properties changed and test the actual result.

## 5. Playing Dreams: a browser of authored rules, not one universal ruleset

Dreams' play side is **DreamSurfing**: browse/search recommendations, launch a creation, rate or save it, and move to another with very little transition cost. Media Molecule's beginner guide describes new, popular and highly rated discovery routes; launch reviews also documented search, curated picks, trending feeds, recommendations and rapid playlist-style surfing. [DR38](#dr38) [DR49](#dr49) [DR50](#dr50)

This matters mechanically because Dreams is not like an RPG whose combat, inventory and progression apply to every location. A creator can make a racer, animation, puzzle, shooter, sculpture, song or menu-driven story. The player therefore repeatedly learns a **local contract**: what can move, what input matters, what failure means, and what persists in that particular creation.

### Art's Dream is the authored onboarding proof

Media Molecule's launch campaign, **Art's Dream**, follows a musician separated from his band and uses multiple genres to demonstrate the common toolset. Reviews describe point-and-click adventure interactions with dialogue/item puzzles, action/platforming sections, top-down or side-on combat, musical interludes and later genre shifts. The value is not merely variety: one story carries the player between different control and rule systems without pretending they are one systemic world. [DR49](#dr49) [DR51](#dr51)

**OpenLegend lesson:** a mechanics platform benefits from authored exemplars that demonstrate *combinations* of primitives, not only API-style tutorials. An example should be enjoyable even for someone who never opens the editor.

<a id="9-arts-dream-gives-varied-mechanics-one-emotional-subject"></a>
<a id="study-9"></a>

### Detailed study 9: Art's Dream gives varied mechanics one emotional subject

**Premise and early-character spoilers; no ending solution.** Art is a double-bass player whose pride and departure from his band have left him isolated. **Laila**, a childhood friend and singer, is among the people affected. **Hector**, a taunting figure in Art's dream, turns ordinary travel into another obstacle. These are authored characters, not independently reasoning social agents. [DR15](#dr15)

The production began with three separate games that became one narrative. A noir-inflected adult strand uses places such as a club, studio and train; **Frances and Foxy**, childhood toys, move through a brighter fantasy while trying to save **Lancewing** from **Thornbeak**. The robots **D-BUG and ELE-D** inhabit a **Digital Forest**, whose creators cite *Bambi* and *Blade Runner* among its contrasting influences. [DR16](#dr16)

**Interpretation:** changing genre can express a person's memories and fears rather than merely advertise how many genres the engine supports. Recognizable recurring concerns make stylistic variation coherent. A general creator platform benefits from examples that have something particular to say.

Frances' hammer and Foxy's ranged ability give different ways to participate in combat. Art's strand instead invites Imp-based environmental exploration and dialogue attitudes; the robot sections demand timed movement. The official advice emphasizes numerous checkpoints rather than a limited stock of lives. It also credits **Daniel Casimir** for bass performance and **Rachel John** for Laila's singing. [DR15](#dr15) [DR17](#dr17)

**Constructed comparison:** after fighting while moving, the player enters a section where observing the jump rhythm is more useful than attacking rapidly. A failed jump returns to a nearby opportunity to learn. Progress in one action vocabulary is not automatically competence in another. Short recovery makes a story with several play styles more accessible without declaring every action successful.

**Interpretation:** music is connected to who these people are, not only a background asset category. Performance, stylized environments and changing actions can communicate an inner life without requiring an open-ended conversation system. The dossier uses written production credits; it does not claim an independent complete soundtrack analysis.

<a id="10-other-originals-turn-the-toolset-into-distinct-activities"></a>
<a id="study-10"></a>

### Detailed study 10: Other originals turn the toolset into distinct activities

#### Ancient Dangers: a clear shared predicament

Released November 30, 2021, **Ancient Dangers: A Bat's Tale** is a third-person dungeon adventure starring **Scoria**, joined by twin **Gabbro** in local two-player cooperation. Players fight monsters, avoid traps, solve puzzles and pursue higher scores through Berserk chains. Its comic premise involves a remedy for a grandmother's snoring, rather than treating every fight as an abstract editor demonstration. The accompanying DreamShaping overhaul explicitly addressed how overwhelming creation could feel, using clearer templates and entry points. [DR18](#dr18)

**Interpretation:** a worked example serves both audiences: an ordinary player gets a purpose, while a creator can ask how a particular trap or encounter was made. The play-and-edit lessons in [the authoring and reuse studies](#study-2) then break that understandable experience into reusable parts. Local cooperation here does not establish the undelivered online-multiplayer feature.

#### Tren: cargo changes the fastest route

In **Tren**, wooden-toy trains navigate tracks, junctions, ramps and mechanisms in an attic-like setting. Stephen Tailby's August 2023 review praises its motion, music and playful construction while noting occasional collision problems and camera-relative direction confusion. Timed runs and delivery puzzles require different approaches: speed can derail a train or lose cargo rather than unconditionally improve the result. [DR19](#dr19)

**Constructed situation:** a detour collects cargo that subtracts from the final time. It should be worth taking only when the reward compensates for the delay and risk. Media Molecule's actual lesson asks creators to test with and without the pickup, adjust its value, and correctly restore the expected wagon/cargo at checkpoints. The same kit also permits disabling the time challenge and instead requiring delivery of a specified cargo amount. [DR20](#dr20)

**Interpretation:** a resource is meaningful when it changes the plan. An attractive pickup that never improves the result is decoration masquerading as strategy. A checkpoint that fails to restore a required ingredient can make a legitimate retry impossible; that is not an interesting difficulty increase. Changing the success rule can make the same physical railway a different game.

#### Community creations need not resemble the originals

Richard Wakeling's March 2020 review describes **Southpaw Cooking**, built around the awkwardness of preparing food one-handed while on the phone, and **Dog's Run**, a recreation involving the creator's dog **Binkie** that made the critic consider commemorating his own pet. He also describes small action games, music videos and longer role-playing experiments. [DR21](#dr21)

**Interpretation:** the distinctive sharing unit can be a joke, a personal memory or a small mechanical constraint, not only a large campaign. This makes breadth useful without making every visitor responsible for discovering a masterpiece in an undifferentiated catalogue. Those named works are historical reviewed examples, not a claim that all community creations share their quality or rules.

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

Dreams' gadget documentation exposes an unusually clear mechanics grammar. Sensors generate signals; logic gadgets transform or gate them; output/movement gadgets produce consequences; variables preserve state. [DR39](#dr39) [DR40](#dr40) [DR41](#dr41)

### Inputs and perception

A **Controller Sensor** maps player input to authored actions and can make an object possessable. **Trigger Zones** detect entry, while impact and movement sensors can respond to contact, speed, acceleration or position. Tags give creators named targets for other gadgets. [DR39](#dr39)

This creates an explicit distinction between **what happened physically** and **what the game notices**. A player can walk beside a trap forever if its trigger does not detect the right label; conversely a broad zone can react before the visible object appears to touch anything.

### Conditions, state machines and randomness

**AND/OR/NOT gates**, timers, counters, calculators, selectors, randomisers and exclusive gates process signals. Selectors can encode modes or menus; exclusive gates can prevent incompatible actions from firing together and support priorities/queues; microchips package logic behind named ports. [DR40](#dr40)

**Constructed interaction:** an NPC guard can occupy states such as patrol, suspicious, chase and return. Sensors supply evidence, a selector holds the current state, priority logic prevents “wave hello” and “attack” from occurring simultaneously, and timers control decay. This is an illustration from documented primitives, not a claim that Dreams ships a universal guard AI.

### State and persistence

Variables can record quantities such as collected objects, damage, kills or arbitrary named state, and can be marked **Persist in Dream** so the same value survives movement between Scenes that define the matching variable. [DR40](#dr40)

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

Mover/rotator/follower gadgets move entities; a **Follower** can pursue or flee a tagged target. **Emitters** create temporary copies such as projectiles or enemies. **Health Manager/Modifier** provides damage/healing semantics, and **Destroyer** removes an object when signalled. Checkpoints can respawn a possessed puppet after death. [DR41](#dr41) [DR42](#dr42)

A combat loop can therefore be assembled from input, projectile emission, collision detection, health modification, death state, score/loot variables and respawn. None of those parts require every game to share the same weapon slots, damage formula or death penalty.

### Environment and physics interaction

Creators can make objects movable, constrain them with connectors such as sliders/bolts/string, alter gravity globally, trigger motion or destruction, animate properties, and drive lights/fog/sky/post-processing through signals. [DR42](#dr42) [DR43](#dr43)

So “light this on fire” is not a universal chemistry rule in Dreams. A creator can build a fire interaction by combining tags, trigger/collision detection, state changes, damage, visual effects and sound; another creator may make visually identical wood entirely inert. **Affordance consistency is authored, not guaranteed by the engine.**

## 8. Animation, audio and presentation are first-class mechanics tools

Dreams' visual identity is built from **flecks** used in sculpture surfaces and 3D paint strokes, with Coat/Style/Effects changing appearance and motion. Reviewers repeatedly noticed a soft/painterly default signature even though skilled creators could push toward realism. [DR44](#dr44) [DR52](#dr52)

Animation is integrated with gameplay logic rather than isolated in a cutscene subsystem. Keyframes can store property states; timelines sequence animation, logic, sensors, cameras, lights and audio. The 2023 final major Create update expanded the **Action Recorder** with an animation canvas plus action, keyframe, possession and physics recording, including baking physics/logic-driven motion into cheaper recorded animation. [DR45](#dr45)

That supports several useful workflows:
- perform motion directly rather than keyframe every transform;
- keyframe precise poses;
- record player possession;
- capture simulated physics and replay it deterministically;
- wire animation playheads and states into game logic.

Audio is similarly constructive. Sound Mode supports instruments, effects, music and voice; sound gadgets can be triggered by logic and can create polyphonic voices. The web Audio Importer accepts original WAV material under its rules. [DR46](#dr46)

**OpenLegend lesson:** presentation should be able to subscribe to state without *being* the state. “Door is locked” can drive an animation, sound, subtitle and interaction affordance independently. The reverse also matters: a glowing/red object should not imply damage unless world rules make that relationship true.

<a id="5-animation-can-be-performed-edited-or-baked"></a>
<a id="study-5"></a>

### Detailed study 5: Animation can be performed, edited or baked

The June 21, 2023 **Action Recorder** update added Keyframe, Possession and Physics recording modes alongside recorded actions. Its **Animation Canvas** supports retiming, splitting, blending and individual tracks. Physics Mode records existing simulated or logic-driven motion for later playback; it does not turn every recorded movement into a new physical rule. [DR06](#dr06)

**Constructed comparison:** animate a character's greeting as a reusable recorded performance, but leave a falling obstacle responsive to the player's actual collision. Baking the latter can save work when the desired result is a fixed cinematic; it can remove the variation that made an interactive obstacle interesting. The author must choose which behavior is supposed to remain contingent.

Media Molecule explicitly connected the redesign with reducing repeated editor switching and expensive animation setups. **Interpretation:** a feature may be powerful yet tedious to express. Improving authoring can preserve the meaningful choice—what movement to create—while removing bookkeeping. The published performance claims are developer descriptions, not measurements made for this research. [DR06](#dr06)

<a id="11-music-and-sound-have-both-expressive-and-operational-structure"></a>
<a id="study-11"></a>

### Detailed study 11: Music and sound have both expressive and operational structure

The October 2020 music update added a broader, more consistently presented instrument library and **Clips**: prepared musical phrases sharing a key and tempo. Full tracks and shorter starting points support different depths of remixing. **Effect Fields** can act over selected timeline rows and synchronize effects to tempo. The update also changed some instrument levels, with an explicit recommendation to update existing work carefully. [DR22](#dr22)

**Constructed choice:** begin with compatible phrases, replace an instrument, then perform an original part when a specific idea emerges. Apply a rhythmic effect to the intended tracks without transforming unrelated sound. The author can make a meaningful musical decision before learning every low-level production operation. Taking a new version of an instrument still calls for checking the resulting mix, not assuming compatibility from its name.

Dreams distinguishes sound instances, voices and lower-level grains. Its **Audio Analyser** associates cost with a frame from the captured scene, helping identify moments that exceed practical limits. Many simultaneous voices/effects and large amounts of imported audio create different costs; the standard library's preinstalled samples avoid additional sample-download cost. [DR23](#dr23)

**Constructed diagnosis:** a dramatic entrance should trigger a sound, but the scene is already saturated with other audio. Inspect the relevant budget and competing sounds rather than rewriting the narrative to explain an unintended silence. Reducing redundant voices, reusing a suitable sample or changing when sounds overlap preserves the intended event. These are design applications of documented constraints, not measured experiments performed here.

The **Audio Importer** provides a separate route to recording, editing and importing original sounds, with tuned/non-tuned instrument guides. Its existence is verified; this pass did not sign in or upload a sample. [DR24](#dr24)

<a id="12-controls-and-presentation-are-part-of-the-creation-problem"></a>
<a id="study-12"></a>

### Detailed study 12: Controls and presentation are part of the creation problem

Dreams' fleck-based sculptural and painted language permits softness, visible marks and stylization rather than requiring a conventional polished-mesh appearance. Its interface lets an author manipulate a three-dimensional object while grouping, testing and observing it. The different modes expose those roles explicitly. [DR02](#dr02)

Wakeling finds the creation controls learnable but initially demanding. Motion-controlled pointing, non-motion controls and PlayStation Move involve different tradeoffs: physical sculpting and navigating a complex interface are not the same task. His praise for extensive hands-on teaching coexists with that learning burden. [DR21](#dr21)

**Interpretation:** an interface can be powerful without being immediately transparent. Familiar objects do not make camera control, nested selection or signal wiring familiar. A good first project limits the number of unfamiliar operations required before a meaningful result appears.

#### VR changes both the action vocabulary and the comfort contract

The July 22, 2020 VR release added **Inside the Box**, including **Box Maze**, **Box Blaster** and **Box Escape**, plus new head/hand tracking and look-cursor gadgets. Authors can attach behavior to where a person looks or what their Imp grabs. **Comfort Mode** reduces/removes camera motion; compatibility labels distinguish Non-VR, uncertain, VR-compatible and VR-only creations. Players can also indicate the level of VR experience a creation requires. [DR25](#dr25)

**Constructed contrast:** a gaze-selected object is useful only when looking and selecting remain distinguishable enough for the activity. A dramatic moving camera can become uncomfortable even when it looked good on a flat screen. Compatibility and comfort feedback belong near discovery, before the player commits, rather than being assumed from the game's title.

The 2023 support announcement's absence of native PS5 and PSVR2 versions is distinct from playing the PS4 game on supported PS5 hardware. Tren's official release account itself addresses PS4 and PS5 play. The original PSVR release does not establish a PSVR2 conversion. [DR09](#dr09) [DR26](#dr26)

## 9. Resource budgets make composition a design problem

Dreams exposes separate **gameplay, graphics and audio thermometers**. The important pattern is not the exact percentages but the fact that a creator sees constrained budgets while composing. [DR47](#dr47)

A detailed object may be affordable once but expensive when stamped repeatedly. An emitted/shared reference can reduce duplicated gameplay cost; later animation tooling specifically targeted expensive animation-gadget patterns. Audio analysis can show which sounds consume readiness resources. [DR36](#dr36) [DR45](#dr45) [DR46](#dr46)

**Constructed choice:** create twenty unique enemies, or one configurable enemy Element with several behaviors and appearances. Reuse saves budget but can make the world repetitive. The tool does not solve that tradeoff; it makes the cost visible.

For OpenLegend inventions, this is a useful precedent for exposing **capability budgets** rather than allowing an extension to silently consume unbounded simulation, cognition, rendering or persistence resources.

<a id="8-preservation-and-progression-also-have-resource-limits"></a>
<a id="study-8"></a>

### Detailed study 8: Preservation and progression also have resource limits

The May 22, 2023 migration introduced online limits including **5GB**, **256 creations** and **512 versions per creation**, with pre-migration creations excluded from those new limits. It removed Prize Bubble asset rewards and unlocked existing Media Molecule prizes for everyone. Older instructions to earn those assets by popping particular bubbles are historical. [DR13](#dr13)

**Constructed consequence:** a creator can reuse an unlocked asset without replaying a former reward gate, but still has to budget a growing project's stored versions. More freely available ingredients do not eliminate storage or editing constraints. The limits on published data are also separate from a scene's runtime thermometers.

The migration narrowed some history/search features to recent activity, and **Homespaces** became local rather than visitable. [DR13](#dr13) [DR09](#dr09) **Interpretation:** a surviving object does not imply every previous route to finding or visiting it survives. Research must describe what users can do now, while retaining the earlier social design as history.

#### Progress depends on the activity, not one universal loot ladder

Dreams' creation hierarchy and contrasting originals do not imply one shared equipment economy. An adventure's checkpoints, a racing challenge's score and an author's saved version solve different continuity problems. [DR01](#dr01) [DR17](#dr17) [DR20](#dr20)

**Interpretation:** an inexperienced author may first place existing pieces, then modify them, then construct original behavior. An experienced contributor may specialize in music or sculpture instead of making a whole game. The meaningful accumulation is practical skill, reusable work, collaborators and audience response—not necessarily another unlockable item. Once basic controls are learned, a self-chosen project or another person's request can supply direction. That is an analytical model of the documented activities, not a measured retention funnel.

## 10. Reuse, remixing and collaboration are explicit product mechanics

Dreams treats content reuse as a first-class permission model rather than an informal copy convention:
- **Private** versions are online but limited to owner/collaborators.
- **Playable** versions can be discovered/played while remix remains controlled by the creator.
- **Public** versions can be remixed, stamped and edited; genealogy/credits preserve attribution. [DR48](#dr48)

Elements can be reusable characters, sculptures, music, sounds or microchips containing logic. A creator can therefore specialize: build a vehicle controller, publish it, and let someone else integrate it into a race without re-authoring steering from scratch.

Collaboration is not the same as synchronous multiplayer. Multiple creators can contribute to a project, and remixing provides asynchronous composability. The platform never shipped its planned **online multiplayer** feature; local/couch multiplayer can be authored for creations, including templates supporting up to four local players. [DR53](#dr53) [DR54](#dr54)

**OpenLegend lesson:** invention packs should carry provenance, compatibility and permissions through composition. “Can use this” and “can modify/publish derivatives of this” are different rights.

<a id="6-collaboration-grants-specific-rights-not-universal-ownership"></a>
<a id="study-6"></a>

### Detailed study 6: Collaboration grants specific rights, not universal ownership

**PRIVATE** saves, **PLAYABLE** releases and **PUBLIC** releases are different states. Public permits remixing; playable permits experiencing the work without granting its editable contents. A remix becomes a new creation with original attribution. A collaborator can edit/use permitted versions but cannot simply release the owner's creation. Rights over an already obtained stamp persist even after deletion or removal as collaborator. [DR07](#dr07)

**Constructed situation:** a musician contributes a private component to a collaborator's scene. That invitation is not blanket permission to distribute its editable internals. The author must resolve the particular dependency's permissions before choosing a broader release. Conversely, removing future collaboration access cannot be assumed to erase all earlier legitimate use.

**Interpretation:** reuse needs an explicit relationship among identity, version and permission. Credit, discoverability, edit access and continuing use are separate promises. A platform that conflates them can make creative cooperation feel unsafe even when the editor itself is pleasant.

A creation's **Lead Version** is its latest public/playable release; **Latest Online Version** can instead be a private work-in-progress. An audience can therefore keep encountering a released experience while collaborators develop something newer. [DR08](#dr08)

**Constructed choice:** save an experimental version without replacing the published build. That supports iteration without making every unfinished edit someone else's next play session. It does not establish that all future component changes remain compatible or that hidden content can be published without its owner's rights.

## 11. Discovery and feedback are part of the mechanics ecosystem

At launch, DreamSurfing mixed search, tags, trending/recommended lists, developer curation, community jams and awards. Critics liked the near-instant transition between wildly different creations, but also noted that unfinished tests, knock-offs and polished games could blur together. [DR49](#dr49) [DR50](#dr50) [DR52](#dr52)

After the 2023 server migration and end of live development, several social surfaces changed: community jams and major events ended; activity feeds and friend scoreboards were removed; Homespaces became local-only; scoreboards were capped to their top entries; online storage/creation/version limits were introduced. [DR53](#dr53)

In March 2024 Media Molecule said the dedicated curation team's work would end, moving DreamSurfing toward recommender- and tag-driven evergreen playlists while preserving genre pages, archives and prior curated sets. It explicitly described the goal as a more self-sustaining discovery system. [DR55](#dr55)

A creator's loop therefore changed over time:
1. make or remix;
2. test;
3. release;
4. become discoverable through search/recommendation/curation;
5. receive plays, likes/comments/score participation;
6. update the creation;
7. potentially be reused by others.

**Failure mode:** creation tooling can be excellent while the audience side becomes noisy. A “marketplace” of mechanics is not useful if players cannot tell a finished, compatible, maintained invention from an experiment.

<a id="14-distribution-promotion-community-occasions-and-economics"></a>
<a id="study-14"></a>

### Detailed study 14: Distribution, promotion, community occasions and economics

Dreams entered Early Access in April 2019 and reached its full PS4 release on **February 14, 2020**. Media Molecule's launch announcement offered the full upgrade to existing Early Access owners and placed **Art's Dream** alongside the community catalogue. Its State of Play presentation and **Impy Awards** also made existing creators' work part of the product's introduction. [DR28](#dr28)

A May 2020 demo used a rotating selection of community creations and part of Art's Dream, with progress carrying into purchase. That historical sampling route is different from a promise that the demo remains available: the 2023 support announcement removed the trial. [DR29](#dr29) [DR09](#dr09)

Tren's August 1, 2023 release coincided with a PlayStation Plus monthly-game window, followed by the Extra/Premium catalogue route. These are dated distribution events, not current subscription entitlements or measured incremental sales. [DR26](#dr26)

**Interpretation:** letting a visitor play a worthwhile example lowers the burden of understanding the editor's promise. A creator showcase supplies another audience: someone can arrive because of a specific experience rather than a desire to become a developer. Neither route proves how many purchases it caused.

#### A shared event can give a small contribution a destination

The 2020 **All Hallows' Dreams** event asked people to contribute rooms or pumpkins to a collective haunted-house experience. Its constraints protected how pieces could be assembled and encountered together. [DR30](#dr30)

**Constructed situation:** a creator supplies one memorable room within a known footprint instead of inventing and promoting an entire game. Another contributor supplies art or an object. The collective event gives those pieces a setting and an audience. Boundaries on scope are therefore not merely restrictions; they make independent work fit into a shared outcome. Historical event instructions do not mean submissions remain open.

#### Finding, liking, following and saving are different operations

DreamSurfing documentation describes genre routes, **Mm Picks**, **Forever Popular**, archived playlists, tags, filters for prior play/following, and a **Play Later** queue. Following a creator and making a Collection provide continuity beyond a single recommendation. Its older promises of ongoing staffed weekly curation must be read with the 2024 correction in [the support and curation study](#study-7). [DR31](#dr31)

**Interpretation:** a discovery system should preserve a promising encounter when the user lacks time to act immediately. A creator's useful audience is not just everybody who can technically launch the platform. Matching, return routes and understandable context matter alongside publication.

Dreams' observed model is a paid creation/play product, with later subscription access and online-service obligations. The inspected sources do not provide an audited title budget, profit, comparable lifetime unit series or distribution of creator earnings. The studio's sustainability statement establishes its decision and explanation, not a financial diagnosis proving that a particular absent export, platform or monetization feature would have saved it. [DR09](#dr09) [DR28](#dr28)

**Interpretation:** artistic value, creator satisfaction, audience size and a sustainable service are different outcomes. An enjoyable niche community can still be insufficient for a chosen development cost structure. Conversely, ending regular development does not make the art or skills accumulated there worthless.

## 12. Release, ownership and the walled-garden boundary

Dreams supports versioned releases and separates discoverability from remix rights. A creator can retain private work, publish playable work, or expose remixable public components. Updates can preserve local overrides while adopting upstream changes. [DR37](#dr37) [DR48](#dr48)

The major boundary is export. Media Molecule's 2023 support FAQ states that Dreams creations themselves cannot be exported as standalone projects to other software. Music/video can be exported through PlayStation sharing, and later content-usage terms allowed certain art/music/imagery made in Dreams to be used externally, but the authored interactive game remains inside the Dreams runtime. [DR53](#dr53) [DR56](#dr56)

The Guardian's review made this a central criticism: creators increased the value of a commercial platform without a general creator monetization/export path. That concern looks more significant in retrospect because Media Molecule later ended feature development and said it had been unable to define a sustainable path for continued support. These are **related constraints, not proof of a specific causal chain**. [DR51](#dr51) [DR53](#dr53)

<a id="7-ending-live-development-was-not-ending-access"></a>
<a id="study-7"></a>

### Detailed study 7: Ending live development was not ending access

The April 11, 2023 announcement ended regular live support after September 1 while retaining play, creation and sharing. Media Molecule said it had not identified a sustainable path for continued expansion. It also ruled out planned online multiplayer, native PS5/PSVR2 and 3D-printing additions. Exporting a runnable creation remained different from recording music/video through PlayStation sharing. [DR09](#dr09)

**Interpretation:** a locally cooperative game and an online sharing community do not prove online gameplay multiplayer shipped. Similarly, retaining the software is a narrower promise than continuing every event, editorial service or feature roadmap. No inspected evidence establishes that adding one absent feature would have reversed the support decision.

The September 13 follow-up confirms the Animation update, **Tren** and restored Audio Importer as completed final releases. It also points to changed content-usage terms for art, music and imagery outside Dreams; that is not an announcement of general standalone game export. [DR10](#dr10)

#### The discovery service changed again in 2024

Media Molecule's March 20, 2024 account describes the departure of the curation team and the end of live DreamSurfing/DreamShaping curation in mid-April. Its replacement approach combines tags and the **Recommender** with retained curated collections; promised Impsider editorial coverage was reduced. [DR11](#dr11)

**Interpretation:** keeping a catalogue reachable is not identical to maintaining a staffed discovery program. Automatically rotating recommendations might help a new creation reach players, but the announcement does not measure that outcome. A creator ecosystem needs a route from publication to relevant attention, not merely another successful upload.

A February 26, 2025 **v2.65** patch updated backend software. This qualifies a literal claim that absolutely no maintenance happened after 2023 without implying resumed feature development. [DR12](#dr12)

## 13. Production and release history

Dreams' lineage follows Media Molecule's LittleBigPlanet emphasis on player creation, but broadens from level construction into a general visual/audio/gameplay authoring environment. Media Molecule showed related creation technology at the PS4 reveal in 2013; Dreams was formally revealed later and iterated publicly for years. [DR57](#dr57)

Useful product milestones:
- **2018:** public beta era begins.
- **April 16, 2019:** paid Creator Early Access launches with the core creation suite, tutorials/templates and community content, while the authored story remained absent. [DR58](#dr58)
- **February 14, 2020:** full PS4 release; Early Access users received the launch build and Art's Dream shortly beforehand. [DR59](#dr59)
- **July 22, 2020:** free PSVR support added for playing and creating in VR. [DR60](#dr60)
- **2020–2023:** ongoing creator tools, community events, Mm Originals and infrastructure changes.
- **June 2023:** major animation update improves Action Recorder workflows. [DR45](#dr45)
- **September 1, 2023:** regular live-development support ends; play/create/share remain available. [DR53](#dr53)
- **March–April 2024:** Media Molecule transitions ongoing discovery away from dedicated human curation toward evergreen/recommender surfaces, while stating there were then no plans to take Dreams offline. [DR55](#dr55)

Media Molecule credited not just its core team but Sony technical, legal, moderation, QA, analytics, user-testing and localization groups plus beta/Early Access creators for the production process. Dreams received BAFTA's Technical Achievement award in 2021. [DR61](#dr61)

No trustworthy public lifetime unit-sales or retention series was found in this pass, so this dossier does not derive commercial success from review counts. The strongest first-party business statement is the 2023 explanation that the studio could not define a sustainable continuation path.

<a id="13-production-progressively-deeper-authorship-was-a-deliberate-design"></a>
<a id="study-13"></a>

### Detailed study 13: Production: progressively deeper authorship was a deliberate design

In Jack Yarwood's 2019 interviews with **Jon Eckersley and Abbie Heppe**, the toolset grows from experimental sculpting work associated with **Anton Kirczenow**. **Kareem Ettouney's** preference for preserving concept art's expressive character influenced its direction. Their account describes consistent concepts across tools and an approach called **Stealth Create**: begin by using something, then alter it, then learn to make it. A small operation such as repeated cloning can become a practical staircase-building tool. [DR27](#dr27)

**Interpretation:** approachable creation need not mean withholding powerful tools forever. It means making each additional level of control answer a question the user already has. The studio's explanation is evidence of intent and iteration, not proof every newcomer reached those later levels or that every tool shared one simple implementation.

**John Beech's** account of Tren supplies a concrete internal adoption story. It began through creative jams and spare-time work before becoming a supported studio project with production milestones and review. His father's handmade wooden trains and his own home-renovation experience informed its imagery and setting. [DR26](#dr26)

**Interpretation:** a successful prototype can originate from personal fascination, while shipping the larger experience still requires coordination and scope control. An all-in-one creation tool does not eliminate art, sound, testing or production judgment. The same creator can benefit from both an expressive playground and a conventional process for finishing.

The delivered update sequence—music, VR, beginner templates, animation, migration and final originals—shows continued change to both play and authoring. The later support/curation decisions must remain part of that history rather than being described as a sudden disappearance of all functionality. [DR06](#dr06) [DR11](#dr11) [DR13](#dr13) [DR18](#dr18) [DR22](#dr22) [DR25](#dr25)

## 14. Five written reviews: what critics actually valued and resisted

These are five separately read reviews, not aggregate blurbs.

### 1. Push Square — Stephen Tailby, February 2020

**Liked:** enormous creative range; easy reuse of community assets; fast DreamSurfing; strong curation and social positivity; Art's Dream as both story and proof; excellent tutorials; unusually cohesive presentation for a complicated editor.

**Disliked / friction:** becoming proficient takes substantial time; creation controls can be fiddly, especially navigating 3D space; Homespace added little; performance varies by creation. The review's 10/10 enthusiasm should not erase those onboarding costs. [DR50](#dr50)

### 2. GameSpot — Richard Wakeling, March 2020

**Liked:** Art's Dream demonstrates genre/camera changes without losing narrative cohesion; tutorials teach real game-design concepts without feeling like homework; presets and reusable community content let novices start above zero; discovery makes hopping among creations easy.

**Disliked / friction:** DreamShaping is initially overwhelming; none of the controller schemes felt fully intuitive; motion cursor plus 3D navigation made precision cumbersome; both DualShock and Move had different weaknesses. [DR49](#dr49)

### 3. The Guardian — Nic Reuben, February 2020

**Liked:** the editor makes normally technical creative work tactile and playful; performing motion, music and animation lowers the emotional barrier between “player” and “creator”; tutorials make learning itself part of the entertainment.

**Disliked / friction:** the reviewer objected to the closed commercial platform: interactive Dreams stayed inside Dreams and creators had no general way to monetize the value they produced. The review also noted that online multiplayer and VR were still promises at launch; VR later shipped, online multiplayer did not. [DR51](#dr51) [DR53](#dr53)

### 4. Destructoid — Jordan Devore, February 2020

**Liked:** hands-on tutorials/masterclasses; a consistent toy-like interface across disciplines; immediate experimentation; fast browsing; the possibility of creating only one useful asset rather than a whole game; Art's Dream as an emotionally effective showcase.

**Disliked / uncertainty:** user-created quality was inevitably uneven; the review raised unresolved questions around PS5, VR, ownership and export. Its optimism that the platform was “built to last” is historically useful precisely because later support decisions show that strong tools do not settle platform sustainability. [DR52](#dr52)

### 5. Easy Allies — Brandon Jones, February 2020

**Liked:** flexible creator tools, templates and community collaboration; broad playlists; striking projects and a large variety of things to play; Art's Dream; ability to borrow assets where a creator lacks a discipline.

**Disliked / friction:** discovery mixed polished work with buggy, unfinished experiments; filtering a specific genre or multiplayer experience could be tiring; the default painterly look and wobbly animation could betray attempted realism; memory remained a real constraint. [DR62](#dr62)

### Player evidence and Steam boundary

**Steam review sampling is not applicable:** Dreams was released for PlayStation 4, not Steam. This pass therefore does not fabricate a “top Steam reviews” section.

Self-selected user reviews show the same split at sharper extremes. Some Metacritic users praised Dreams as a low-barrier way to learn game creation and loved the community; others said the editor remained harder than advertised, the player-facing library felt full of short/unfinished work, and the absence of PC/online multiplayer limited the platform. A detailed GameFAQs player review focused specifically on motion controls, confusing grouping/editing behavior and tutorial friction. [DR63](#dr63) [DR64](#dr64)

A 2023 community discussion after live support ended reported continued likes/comments but complained that discoverability could feel arbitrary once human curation diminished. That is one creator's account, not measured platform-wide engagement. [DR65](#dr65)

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

<a id="15-reception-creation-value-and-play-value-can-diverge"></a>
<a id="study-15"></a>

### Detailed study 15: Reception: creation value and play value can diverge

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

<a id="16-transferable-inspiration-and-limits"></a>
<a id="study-16"></a>

### Detailed study 16: Transferable inspiration and limits

**Let people enter at the depth they need.** Play, place, modify, compose and author are different levels. A reusable OpenLegend mechanic should arrive with a comprehensible working situation, not require learning the whole engine before encountering value.

**A component is not a finished invitation.** Dreams' Scene/Dream distinction makes the packaging problem explicit. A new capability needs purpose, an entry point and legible consequences before ordinary players can judge it.

**Keep expression and behavior connected but distinguishable.** A stylized body, recorded performance and live interaction each contribute something. Do not infer an implemented capability from appearance, or remove expressive craft merely because it is not mechanically necessary.

**Make ownership and revision understandable.** Private collaboration, public remixing, published versions and retained earlier use have different consequences. Reuse is a social contract as well as a technical convenience.

**Resource limits should explain a practical failure.** A shared emitter, audio analyser or correctly restored checkpoint helps the author change the actual cause. A generic warning that a creation is too complicated provides less help.

**Give small contributions a destination, but do not promise an audience automatically.** Templates, collective events and curated routes can make participation concrete. The operating and discovery work remains real; more generated artifacts alone is not evidence of a healthy platform.

These are research interpretations, not accepted OpenLegend implementation tasks. The earlier caution remains: the evidence cannot establish which unshipped feature, if any, would have changed Dreams' commercial trajectory.

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

<a id="17-coverage-viewing-route-and-preservation"></a>
<a id="study-17"></a>

### Detailed study 17: Coverage, viewing route and preservation

Read Art's Dream for authored identity, then the Ancient Dangers lesson for explicit mechanics, and Tren's cargo/checkpoint lesson for how a working system becomes an interesting game. Compare these with the permission/version rules before considering creator-platform transfer. Read the 2023 support and 2024 curation announcements together.

Useful viewing routes are linked directly from the official beginner guide, Art's Dream pages, animation release, music update and VR release notes. They include an Art's Dream introduction, mode demonstrations and Inside the Box examples. These are verified source-linked routes, **not full recordings watched for this research**. The narrative pages and reviews contain spoilers; no invented timestamps or observed play sessions are supplied. [DR06](#dr06) [DR14](#dr14) [DR16](#dr16) [DR22](#dr22) [DR25](#dr25)

**Per-game preservation:** the complete paired chapter and the original supplied master's §5.1 were compared. The September 2023 live-support/access distinction, separate Project Spark shutdown, creator/player viability argument, missing-feature counterfactual caution and two OpenLegend product questions remain intact in their existing owner. No separate earlier Dreams mechanics study exists to replace. The original packet's source annotations and cross-game essays remain preserved, not silently rewritten by this pass. This dossier extends their narrower evidence and qualifies later changes. The independent seven-file packet-wide audit remains pending.

**Evidence limits:** no personal play, full-video/complete-soundtrack inspection, proprietary-code access, representative sentiment coding or audited game-profit evidence. Some original interviews were accessible through substantive indexed text rather than direct page retrieval. Old official guides themselves contain retired features; dated release/support notes take precedence for those specific claims. The accessible documentation establishes supported behavior, not universal absence of defects.

## Sources

<a id="dr33"></a>**DR33 — [Creation types](https://docs.indreams.me/en/create/resources/videos/tools-and-tips/understand-creation-types).** Primary written distinction among Elements, Scenes, Dreams and Collections. Embedded video not watched in full; no claim that every upload is a finished game.

<a id="dr34"></a>**DR34 — [Authoring modes](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/modes).** Primary form/presentation/sound/Test Mode description. Qualitative controls, not an exhaustive undocumented renderer or physics specification.

<a id="dr35"></a>**DR35 — [Glossary](https://docs.indreams.me/en/create/resources/glossary).** Primary Imp, possession, grouping and signal definitions. The page's older Homespace visiting claim is not adopted; current release/support notes must qualify obsolete entries.

<a id="dr36"></a>**DR36 — [Ancient Dangers Play & Edit 3](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/ancient-dangers/help/play-n-edit-walkthrough-3).** Full primary written lesson inspected: lift grouping, explicit gate/trap logic and shared emission reference. Examples are rules-based analysis, not an independently played tutorial. No copied step-by-step walkthrough or invented performance measurement.

<a id="dr37"></a>**DR37 — [Update Mode](https://docs.indreams.me/en/create/releasing/using-update-mode).** Primary version/override controls and tree example. Its permission advice must be read with the dedicated current release rules; no guarantee of semantic compatibility after every automatic update.

<a id="dr38"></a>**DR38 — [A Beginner's Guide to Dreams — Play](https://docs.indreams.me/en/game-info/beginners-guide-play).** Media Molecule / Indreams. Primary DreamSurfing and Art's Dream onboarding description. Accessed 2026-09-26.

<a id="dr39"></a>**DR39 — [Sensors & Input](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/sensors-and-input).** Media Molecule / Indreams. Primary Controller Sensor, Trigger Zone and movement/input behavior. Accessed 2026-09-26.

<a id="dr40"></a>**DR40 — [Logic & Processing](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/logic-and-processing).** Media Molecule / Indreams. Primary gates, timers, counters, selectors, calculators, microchips and persistent variables. Accessed 2026-09-26.

<a id="dr41"></a>**DR41 — [Movers & Output](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/movers-and-output).** Media Molecule / Indreams. Primary Follower, Emitter, Destroyer, health and display/output descriptions. Accessed 2026-09-26.

<a id="dr42"></a>**DR42 — [Gameplay Gear](https://docs.indreams.me/en-US/create/resources/edit-mode-guide/assembly/gadgets/gameplay-gear).** Media Molecule / Indreams. Primary checkpoint, score and global-setting examples. Prize Bubble material is historically documented but the feature was removed in the 2023 server migration.

<a id="dr43"></a>**DR43 — [Cameras & Lighting](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/gadgets/cameras-and-lighting) and [Connectors](https://docs.indreams.me/en-US/create/resources/edit-mode-guide/assembly/gadgets/connectors).** Media Molecule / Indreams. Primary authored camera, lighting/weather-like state and physical-joint behavior.

<a id="dr44"></a>**DR44 — [Flecks](https://docs.indreams.me/en/create/resources/edit-mode-guide/stroke/flecks) and [Paint Mode](https://docs.indreams.me/en/create/resources/edit-mode-guide/stroke).** Media Molecule / Indreams. Primary rendering/paint vocabulary; does not imply every Dreams creation has the same visual style.

<a id="dr45"></a>**DR45 — [Up & Animate 'Em — Dreams v2.58](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v258) and [animation recording guide](https://docs.indreams.me/en/create/resources/recording-modes).** Media Molecule / Indreams. Primary final major animation workflow and optimization changes, June 2023.

<a id="dr46"></a>**DR46 — [Sound Mode](https://docs.indreams.me/en/create/resources/edit-mode-guide/sound), [Dreams Audio Tech](https://docs.indreams.me/en/create/sound/dreams-audio-tech), and [Audio Importer](https://docs.indreams.me/en/create/sound/audio-importer).** Media Molecule / Indreams. Primary audio creation/runtime documentation.

<a id="dr47"></a>**DR47 — [Thermometer](https://docs.indreams.me/en/create/resources/thermometer) and [Understanding Limits](https://docs.indreams.me/en/create/releasing/understanding-limits).** Media Molecule / Indreams. Distinguishes per-creation resource thermometers from post-migration account storage/version limits.

<a id="dr48"></a>**DR48 — [Release Terminology Demystified](https://docs.indreams.me/en/create/releasing/releasing-your-dreams).** Media Molecule / Indreams. Primary Element/Scene/Dream/Collection, version, Private/Playable/Public and attribution/remix semantics.

<a id="dr49"></a>**DR49 — [Dreams review](https://www.gamespot.com/reviews/dreams-review/1900-6417414/).** Richard Wakeling, GameSpot, 2020-03-03. Full written review inspected; strong on Art's Dream, tutorials, community reuse/discovery and controller-learning friction.

<a id="dr50"></a>**DR50 — [Dreams Review](https://www.pushsquare.com/reviews/ps4/dreams).** Stephen Tailby, Push Square, 2020-02. Full written review inspected; creator breadth, DreamSurfing, community, Art's Dream, time investment, controls, Homespace and performance variation.

<a id="dr51"></a>**DR51 — [Dreams review — creative learning as delightful play](https://www.theguardian.com/games/2020/feb/20/dreams-review-creative-learning-as-delightful-play).** Nic Reuben, The Guardian, 2020-02-20. Full written review inspected; tactile authoring praise and explicit walled-garden/creator-value criticism. Its launch-era VR/online-multiplayer status is historical; later sources qualify outcomes.

<a id="dr52"></a>**DR52 — [Review: Dreams](https://www.destructoid.com/reviews/review-dreams/).** Jordan Devore, Destructoid, 2020-02-16. Full written review inspected; tutorials, cross-discipline UI, rapid Dreamiverse loop, uneven UGC and launch-era future questions.

<a id="dr53"></a>**DR53 — [An update on server changes and live service support for Dreams](https://docs.indreams.me/en/whats-happening/news/dreams-support-update).** Media Molecule, 2023-04-11 with migration updates. Primary source for September 2023 support end, continued play/create/share, migration feature removals/limits, no standalone export, and cancellation of planned online multiplayer/PS5/PSVR2/3D-printing work.

<a id="dr54"></a>**DR54 — [Mini-Golf template: take the foundation to the next level](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/mini-golf/take-to-the-next-level).** Media Molecule / Indreams. Primary example of authored couch multiplayer with four player puppets; not evidence of online multiplayer.

<a id="dr55"></a>**DR55 — [Update on Community & Curation Support for Dreams](https://docs.indreams.me/en/whats-happening/news/curation2024).** Media Molecule, 2024-03-20. Primary final curation-team transition, recommender/tag playlists and then-current no-shutdown statement. It is a 2024 status statement, not a guarantee for all future years.

<a id="dr56"></a>**DR56 — [What happens to Dreams now that live support has ended?](https://docs.indreams.me/en/whats-happening/news/dreams-live-support).** Media Molecule, 2023-09-13. Primary post-roadmap statement: creations/play remained available; content-usage terms broadened external use for some art/music/imagery; interactive creations remained Dreams-hosted.

<a id="dr57"></a>**DR57 — [Follow your Dreams: how the future of playing video games is making them](https://www.theguardian.com/games/2020/feb/24/dreams-video-games-making-media-molecule-playstation-4) and [Dreams: 9 Things We Learned](https://www.gamespot.com/articles/dreams-9-things-we-learned-about-sonys-incredibly-/1100-6455941/).** Original interviews/reporting with Media Molecule leadership plus historical reporting. Used for LittleBigPlanet lineage, authoring intent and long development/reveal context.

<a id="dr58"></a>**DR58 — [Dreams PS4 Early Access Release Date Revealed](https://www.gamespot.com/articles/dreams-ps4-early-access-release-date-revealed/1100-6465892/) and Media Molecule/PlayStation's April 2019 Early Access messaging.** Contemporaneous reporting of Creator Early Access scope, April 16 launch, feedback purpose and carry-over.

<a id="dr59"></a>**DR59 — [Own Dreams Early Access? Upgrade on February 11th!](https://www.mediamolecule.com/blog/article/own_dreams_early_access_upgrade_on_february_11th).** Media Molecule, 2020-02-04. Primary launch transition and Art's Dream release information.

<a id="dr60"></a>**DR60 — [PS VR support comes to Dreams on July 22](https://blog.playstation.com/2020/06/30/ps-vr-support-comes-to-dreams-on-july-22/).** PlayStation / Media Molecule, 2020-06-30. Primary shipped VR update announcement.

<a id="dr61"></a>**DR61 — [A Big BAFTA 'Thank You' From Siobhan](https://www.mediamolecule.com/blog/article/a_big_bafta_thank_you_from_siobhan).** Media Molecule, 2021-03-26. Primary production acknowledgements and Technical Achievement BAFTA context.

<a id="dr62"></a>**DR62 — [Dreams review](https://easyallies.com/review/dreams).** Brandon Jones, Easy Allies, 2020-02. Full written review inspected; templates/collaboration, discovery quality variation, genre filtering, visual signature, animation roughness and memory constraints.

<a id="dr63"></a>**DR63 — [Dreams user reviews](https://www.metacritic.com/game/dreams/user-reviews/?num_items=100&platform=playstation-4&sort-by=date).** Self-selected PlayStation user testimony, retrieved 2026-09-26. Used only qualitatively for recurring praise/complaints; ratings are not treated as representative population measures.

<a id="dr64"></a>**DR64 — [Dreams player review: “Never has creating content be this frustrating”](https://gamefaqs.gamespot.com/ps4/168645-dreams/reviews/170030).** GameFAQs user SonGaton, 2020-03-05. Detailed negative first-person report focused on onboarding, grouping/editing confusion and motion/control discomfort. One player account, not consensus.

<a id="dr65"></a>**DR65 — [“Is Dreams still actively played?”](https://www.reddit.com/r/PS4Dreams/comments/18rvuv1/is_dreams_still_actively_played/).** r/PS4Dreams discussion, 2023-12-27. One creator reported ongoing engagement alongside discoverability problems. Anecdotal, post-support qualitative evidence only.

<a id="annotated-sources"></a>

### Additional annotated evidence

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
