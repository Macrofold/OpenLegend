# Dreams — full research dossier

**G13 · In progress, September 26, 2026.** Substantive checkpoint. Remaining: finished play and Art's Dream/other originals, fuller audio and object behavior, discovery/progression breadth, production/commercial history, contrasting reception, and R01–R14/preservation review. Animation, version permissions and the changing support/discovery contract are now covered below. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Project Spark is a separate pass. No personal gameplay, complete-video viewing or proprietary-code audit is claimed.

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

## Checkpoint sources

<a id="dr01"></a>**DR01 — [Creation types](https://docs.indreams.me/en/create/resources/videos/tools-and-tips/understand-creation-types).** Primary written distinction among Elements, Scenes, Dreams and Collections. Embedded video not watched in full; no claim that every upload is a finished game.

<a id="dr02"></a>**DR02 — [Authoring modes](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/modes).** Primary form/presentation/sound/Test Mode description. Qualitative controls, not an exhaustive undocumented renderer or physics specification.

<a id="dr03"></a>**DR03 — [Glossary](https://docs.indreams.me/en/create/resources/glossary).** Primary Imp, possession, grouping and signal definitions. The page's older Homespace visiting claim is not adopted; current release/support notes qualify obsolete entries.

<a id="dr04"></a>**DR04 — [Ancient Dangers Play & Edit 3](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/ancient-dangers/help/play-n-edit-walkthrough-3).** Full primary written lesson inspected: lift grouping, explicit gate/trap logic and shared emission reference. Examples are rules-based analysis, not an independently played tutorial. No copied step-by-step walkthrough or invented performance measurement.

<a id="dr05"></a>**DR05 — [Update Mode](https://docs.indreams.me/en/create/releasing/using-update-mode).** Primary version/override controls and tree example. Read permission advice with dedicated release rules; no guarantee of semantic compatibility after every automatic update.

<a id="dr06"></a>**DR06 — [Animation update v2.58](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v258), June 21, 2023.** Primary recorded/keyframed/possessed/physics animation, authoring friction and developer optimization rationale. No independently measured speedup or watched full demonstration.

<a id="dr07"></a>**DR07 — [Understanding Permissions](https://docs.indreams.me/en/create/releasing/understanding-permissions), inspected September 26, 2026.** Substantive primary owner/collaborator/version rights and persistence of stamp permission. The example is constructed; no real user's access changed.

<a id="dr08"></a>**DR08 — [Saving and Releasing](https://docs.indreams.me/en/create/releasing/saving-and-releasing).** Primary lead/latest and private/public/playable distinction. No claim of unrestricted external licensing or universal compatibility.

<a id="dr09"></a>**DR09 — [Support and server announcement](https://docs.indreams.me/en-US/whats-happening/news/dreams-support-update), April 11, 2023, updated with migration timing.** Full primary support rationale/retained access and explicitly undelivered features. Later curation and maintenance changes are separately sourced; no one-feature causal theory of commercial failure.

<a id="dr10"></a>**DR10 — [End-of-roadmap clarification](https://docs.indreams.me/en/whats-happening/news/dreams-live-support), September 13, 2023.** Primary completed releases and continued availability. Content-use announcement is not a legal opinion or standalone-game export capability.

<a id="dr11"></a>**DR11 — [Community and curation update](https://docs.indreams.me/en/whats-happening/news/curation2024), March 20, 2024.** Primary staff/curation transition, tag/recommender approach and changed editorial promise. Not measured recommendation efficacy or a total shutdown.

<a id="dr12"></a>**DR12 — [v2.65 backend update](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v265), February 26, 2025.** Primary limited maintenance entry, not a resumed product roadmap.

<a id="dr13"></a>**DR13 — [Server migration v2.57](https://docs.indreams.me/en/whats-happening/updates/release-notes/dreams/v257), May 22, 2023.** Primary delivered storage, discovery and reward changes. Legacy assets excluded from new limits; removed reward gates are not taught as current. Runtime thermometers are a separate budget.
