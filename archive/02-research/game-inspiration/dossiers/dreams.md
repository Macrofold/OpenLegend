# Dreams — full research dossier

**G13 · In progress, September 26, 2026.** Substantive checkpoint. Remaining: finished play and Art's Dream/other originals, fuller animation/audio and object behavior, release permissions and collaboration, discovery/progression, production/support/commercial history, contrasting reception, and R01–R14/preservation review. [Preserved paired chapter](../games/dreams-and-project-spark.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Project Spark is a separate pass. No personal gameplay, complete-video viewing or proprietary-code audit is claimed.

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

## Checkpoint sources

<a id="dr01"></a>**DR01 — [Creation types](https://docs.indreams.me/en/create/resources/videos/tools-and-tips/understand-creation-types).** Primary written distinction among Elements, Scenes, Dreams and Collections. Embedded video not watched in full; no claim that every upload is a finished game.

<a id="dr02"></a>**DR02 — [Authoring modes](https://docs.indreams.me/en/create/resources/edit-mode-guide/assembly/modes).** Primary form/presentation/sound/Test Mode description. Qualitative controls, not an exhaustive undocumented renderer or physics specification.

<a id="dr03"></a>**DR03 — [Glossary](https://docs.indreams.me/en/create/resources/glossary).** Primary Imp, possession, grouping and signal definitions. The page's older Homespace visiting claim is not adopted; current release/support notes must qualify obsolete entries.

<a id="dr04"></a>**DR04 — [Ancient Dangers Play & Edit 3](https://docs.indreams.me/en/create/resources/mm-creator-content/templates/ancient-dangers/help/play-n-edit-walkthrough-3).** Full primary written lesson inspected: lift grouping, explicit gate/trap logic and shared emission reference. Examples are rules-based analysis, not an independently played tutorial. No copied step-by-step walkthrough or invented performance measurement.

<a id="dr05"></a>**DR05 — [Update Mode](https://docs.indreams.me/en/create/releasing/using-update-mode).** Primary version/override controls and tree example. Its permission advice must be read with the dedicated current release rules; no guarantee of semantic compatibility after every automatic update.
