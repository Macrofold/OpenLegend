# Disco Elysium: contextual choices, task memory and understandable controls

[Research ledger](../research.md) · [Inventory guidance](../inventory.md) · [Conversation guidance](../chat-and-invention.md) · [Screenshot manifest](../screenshots/disco/manifest.json)

**Evidence reviewed:** 2026-10-04. Six distinct full screenshots were downloaded and visually inspected: two developer media images, two PS5 launch-review captures, an inventory image reproduced by a third-party reviewer, and a map captured for a 2019 guide. They are not a sequence from one playthrough. Promotional capture builds are unspecified; the PS5 images are historical March 2021 release-period evidence. No live input, timing or accessibility test was performed.

## Why this game belongs in the comparison

Disco Elysium is especially relevant to Open Legend's conversation, object inspection and task memory because reading, choosing an intention and seeing the world's response are central to play. It has a comparatively small physical inventory and a separate thought system. It is not evidence for multiplayer chest permissions, shared storage or real-time chat behavior.

The [developer's 2016 interface article](https://discoelysium.com/devblog/2016/12/20/feld-playback-experiment) explains that the menus borrow their visual language from a fictional tape computer. Dialogue receives particular attention because it is used so often, and roll animation, lighting and sound belong to that same language. This establishes intentional visual coherence, not proof that every unfamiliar control is understandable.

**Actual positive review evidence.** In [Kain Klarden's December 2019 firsthand review](https://klardendum.com/review/in-love-with-disco-elysium/), the specific praised feature is resolving checks inside the dialogue/interaction UI with visible skill, chance and modifiers. The same reviewer warns that reading can become exhausting and reports friction with world highlighting. This is one player's informed experience, not a claim of universal approval.

**Actual negative review evidence.** [Coty Craven's PS5 launch accessibility review](https://caniplaythat.com/2021/03/31/disco-elysium-the-final-cut-can-i-play-that-accessibility-review/) reports unclear object reach, selection that does not stay selected when releasing the stick, insufficient text-size options and confusing selection colors. It praises the background behind text for legibility. These are dated, platform-specific reports; they are not claims about the current patched client. They show why art direction and acclaimed writing do not excuse difficult interaction.

## DISCO-01 — Conversation, inner voice and consequence share one scene

![Disco Elysium dialogue beside the visible room, with named speakers and a morale-loss message](../screenshots/disco/01-dialogue-morale.jpg)

_Source: [ZA/UM media gallery](https://discoelysium.com/media), © ZA/UM. Full publisher screenshot; build and capture date unspecified._

**Observed regions and controls.** The room and the people remain visible across roughly the left two-thirds. A tall dark transcript occupies the right. Named speakers distinguish the player, the other character and internal faculties; faculty names use color as well as text. The active portrait straddles the world and transcript. Three numbered reply choices follow the latest passage, and a scrollbar permits reading earlier text. A large message identifies morale loss as −1; tint and a symbol reinforce it. The frame does not contain a separate activity picker or a recipient form.

**Documented behavior.** The [developer's FAQ](https://steamcommunity.com/app/632470/discussions/0/3175526477766541689/) describes encounters being resolved in dialogue and identifies health and morale as consequential resources. The screenshot shows a resolved loss, not the exact preceding button press or animation duration.

**Why it helps.** Speech, internal interpretation and mechanical consequence remain adjacent to the situation that caused them. The player chooses an intention directly. They are not asked to restate who is speaking, where they are or which encounter is underway. **What is weaker:** a long column still requires sustained reading, and red tint reduces scene visibility. Color distinctions without the names would be insufficient. The text list contains substantial prose; it is not automatically suitable for urgent multiplayer decisions.

**Open Legend application.** Keep the selected conversation attached to its people and location. Show a short, readable consequence near the action that produced it, with textual detail available in history. Distinguish spoken words, private thoughts and system narration explicitly. Do not reveal another character's private thoughts or hidden state simply because this single-player game narrates its protagonist's inner life.

## DISCO-02 — A check explains the world instead of opening another form

![Disco Elysium forensic world overlay with named observations, numbered actions, dice and a textual success result](../screenshots/disco/02-check-world-overlay.jpg)

_Source: [ZA/UM media gallery](https://discoelysium.com/media), © ZA/UM. Full publisher screenshot; build unspecified._

**Observed layout.** The world contains colored trajectories, impact marks and small labels showing a reconstruction. The right column includes named observations from perception, interfacing and visual calculus. Seven numbered choices identify specific parts of this scene; the final one explicitly leaves. A highlighted choice differs from the others. A pair of dice and a green success label report resolution. The scrollbar and active faculty portrait use the same arrangement as the conversation screen.

**Verified interaction model.** A player interacts with a person or object, reads the available action and selects the check in that context; the outcome then appears in the interaction. The developer FAQ distinguishes repeatable checks, which can reopen after relevant improvement or discoveries, from one-attempt checks. It also documents `Tab` for highlighting world objects and `F1` for mechanics help. [Official FAQ](https://steamcommunity.com/app/632470/discussions/0/3175526477766541689/). This screenshot does not show a pre-roll probability panel, so that part of the reviewer's praise must not be attributed to pixels that are absent here.

**Why it helps.** The choices refer to things that are actually in front of the character, and feedback explains the result in the same scene. The player can leave without inventing a cancellation workflow. **What is weaker:** white, red and darkened choices require learned interpretation. The PS5 reviewer's selection mistakes demonstrate that a prominent visual treatment can mean something different from what a player expects; this is evidence to test selection semantics, not to copy them.

**Open Legend application.** Selecting a chest, lock or unusual object should supply its target to Open, Examine or Attempt. Show the intended target and any material risk before the attempt. Use the world to explain what was learned or changed. Keep focus stable as the pointer or stick is released, and make selected, unavailable, already attempted and destructive states distinguishable without color alone. Retry policy belongs to the action's rules and should be stated when it affects the player's decision.

## DISCO-03 — The Thought Cabinet: compelling metaphor, costly obscurity

![Disco Elysium PS5 Thought Cabinet with character summary, slotted thoughts, sortable list and selected thought detail](../screenshots/disco/03-thought-cabinet-ps5.jpg)

_Source: [Coty Craven / Can I Play That, March 31, 2021](https://caniplaythat.com/2021/03/31/disco-elysium-the-final-cut-can-i-play-that-accessibility-review/), game imagery © ZA/UM. Full PS5 screenshot; patch unspecified._

**Observed regions and controls.** The left gives the four abbreviated attributes, health, morale and aggregate thought bonuses. The middle contains illustrated slotted thoughts and empty outlines over the world. A scrollable list to its right has visible research percentages and many dim names. Status, Date and A–Z are shown as sort choices beneath a triangle-button cue. The far-right detail shows the selected thought's art, title, temporary research bonus, 3h45m research time and Problem/Solution views. Experience and skill points sit above the Internalize command with an `X` cue. Bottom navigation uses skill, inventory, journal and thought icons, with L2/R2 cues. There is no conventional close button visible in this frame.

**Developer-documented flow.** Discover a thought through experience or conversation → select it in the cabinet → put it into a slot and internalize it → let the required in-world time pass → inspect the revealed effect. [The developer's introduction](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet) explains that thoughts can affect abilities and story options, and that forgetting one or opening additional slots costs skill points. The selected image reports a temporary benefit; it does not reveal that thought's eventual result.

**Why it helps.** A selected idea has art, prose, cost and consequence in one detail region. The system gives narrative experiences a persistent representation. **What is weaker:** it asks the player to learn a new metaphor, new abbreviations and obscure statuses simultaneously. Craven specifically reports not understanding what Internalize did or what the dimmed thoughts represented. The image also shows text competing with detailed world art. A deliberate mystery about a future reward is different from failing to explain how the command works.

**Open Legend application.** An invention, learned technique or ongoing project can have an evocative presentation, but its action must explain itself. State what starts, how progress occurs, what is committed and how to stop or replace it. Keep undiscovered content distinct from a disabled action with a known reason. Do not turn ordinary possessions or routine activities into an elaborate project-management surface simply because this specialized thought system uses one.

## DISCO-04 — Equipment is visible on the person and in its slot

![Disco Elysium inventory with equipped clothing around the character, aggregate effects and a selected glove detail](../screenshots/disco/04-equipment-inventory.jpg)

_Source: [Riker Santivong's game review page](https://planita13.github.io/Final-Project/disco.html), game imagery © ZA/UM. Full PC-style screenshot reproduced by a third party; original capture build and date are unverified._

**Observed regions and controls.** The left summary combines attributes, health, morale and item-derived bonuses. In the center, the character is surrounded by labeled equipment places: clothing and accessories, left and right held items, plus keys and bullets. Occupied and empty slots are distinct, and Equipped is explicit above the figure. On the right, the selected gloves have large art, a readable name, a skill modifier and a separate description. Tools, Clothes, Items and Interact sit above the stored-item cells, with Clothes selected. An orange marker sits at Items, while another appears at the journal icon in the bottom navigation. Their appearance suggests pending information, but this source does not establish their clearing behavior. The stored-clothing grid is empty in this image and has a vertical scrollbar. Bottom navigation contains skill, inventory, journal and thought symbols with an inventory abbreviation.

**Documented behavior and limits.** The [developer FAQ](https://steamcommunity.com/app/632470/discussions/0/3175526477766541689/) confirms that clothing, accessories, tools and items may carry positive and negative modifiers affecting situations. The screenshot establishes equipped versus stored layout and selected-item inspection. It does not establish whether a particular mouse action equips, removes or drags an item; those bindings were not verified from a primary control guide and are not asserted here.

**Why it helps.** The player sees the item, where it goes and its effect together. Plain slot names do not require guessing which abstract category applies. The prose keeps the object part of the fiction rather than reducing it to a stat row. **What is weaker:** the summary exposes several unfamiliar attribute abbreviations, and the selected item must be read separately from aggregate effects. This empty clothing grid does not demonstrate good sorting once many items accumulate.

**Open Legend application.** Keep the actor visible when equipment is the task. Selecting an item should provide its name, description, current location, relevant effect and likely action. Show how equipping it changes the existing slot; provide a simple route back. Preserve names for invented items. A detail panel should answer a question about the selected possession instead of becoming a compulsory form before every use.

## DISCO-05 — A map can remember opportunities without prescribing every move

![Disco Elysium Journal Map with a list of found checks, skill and difficulty labels, availability explanation and named landmarks](../screenshots/disco/05-map-checks.jpg)

_Source: [Sam Chandler / Shacknews, October 29, 2019](https://www.shacknews.com/article/114689/where-to-get-a-map-in-disco-elysium), game imagery © ZA/UM. Full original capture from the PC release period; exact build unspecified. No Final Cut travel behavior is inferred from this older image._

**Observed regions and controls.** Journal is the heading; Tasks and Map are explicit tabs with Map selected. The left list names encountered subjects such as Damaged Ledger, Mirror, Annette and Pile of Eternite and pairs them with a skill and verbal difficulty. A scrollbar allows a longer list. The footer explains that the list contains found White Checks and that entries on white are currently available. The large illustrated map names major landmarks. Bottom navigation retains the character/skills, inventory, journal and thoughts icons. The image does not show a current-position dot, route line or universal quest marker; their absence here must not become a claim that no version ever has such features.

**Verified source flow.** Chandler's guide records buying the map in the bookshop, then opening Journal → Map. The map is itself a discovered possession. The [developer's check FAQ](https://steamcommunity.com/app/632470/discussions/0/3175526477766541689/) explains the distinction between repeatable and one-attempt checks; it does not make the map a promise that every encounter is currently solvable. The screenshot's footer supplies its own availability key.

**Why it helps.** The player can remember an encountered opportunity by person/object, skill and difficulty. Map and task information share a recognizable home, and readable landmark names help orientation. **What is weaker:** a white background is doing double duty as a state cue; the explanation is distant from individual rows. A list of skill names without a known subject, also visible lower down, is less useful for deciding where to return. A player may expect a conventional objective map and misunderstand this more limited reference.

**Firsthand praise for task organization.** In the [December 11, 2020 discussion](https://www.reddit.com/r/gamedesign/comments/kbc4ot/how_disco_elysium_did_journal_screens_better/), deshara128 specifically praised grouping active and completed tasks by the day they were received. The reported benefit was seeing an earlier day's workload shrink, even while new tasks arrived. This is one player's account of the **Tasks** view, which is not displayed in this screenshot; it is not evidence that every player benefits from daily grouping.

**Open Legend application.** If the game exposes a reference to known opportunities, retain their person/object, location context and last known availability. Distinguish current facts from remembered observations. Give status a plain-language explanation rather than a mysterious color. Organize history in a way that makes meaningful completed work findable without turning ordinary life into a compulsory quest checklist. Do not reveal unencountered checks or copy this game's map ownership, skills or day structure as engine law.

## DISCO-06 — Help must connect physical controls to player intentions

![Disco Elysium PS5 pause menu Options and Controls page showing named controller bindings](../screenshots/disco/06-controls-ps5.jpg)

_Source: [Coty Craven / Can I Play That, March 31, 2021](https://caniplaythat.com/2021/03/31/disco-elysium-the-final-cut-can-i-play-that-accessibility-review/), game imagery © ZA/UM. Full PS5 launch-period screenshot, exact patch unspecified._

**Observed navigation.** Continue, Save Game, Load Game, Options and Main Menu form a persistent left column. Options is selected; Load Game appears dimmer without a visible explanation. The selected Controls tab sits beside Settings with L2/R2 tab cues. A controller diagram and named bindings occupy the right panel, providing a readable reference while the game scene remains behind the pause surface.

| Visible binding group   | Stated meaning in the screenshot                                         |
| ----------------------- | ------------------------------------------------------------------------ |
| L1; R1                  | Highlight; Action / Interact                                             |
| L2; R2; both together   | Zoom in / menu navigation; zoom out / menu navigation; reset camera zoom |
| Options button          | Pause menu                                                               |
| Left stick; right stick | Movement / menu navigation; targeting interactables                      |
| L3; R3                  | Left-hand item; right-hand item                                          |
| Directional pad         | Dialogue/menu navigation and dedicated morale/health healing bindings    |
| Triangle; Square        | Context sensitive; Character Sheet / Open Menu                           |
| Circle; Cross           | Back; Action / Interact                                                  |

**Flow and limitation.** Pause → Options → Controls provides this reference. The screen documents meanings, but it does not show an editable remapping interface. Craven's contemporaneous review specifically reports missing remapping/control-scheme choices and trouble retaining right-stick selection. Those historical findings should not be presented as a claim about every current platform. A screenshot cannot establish hold duration, focus stability or the effort required to reach a small world target.

**Why it helps.** Buttons are connected to actions with words, and Back is explicit. Consistent paper-and-device styling carries the game's identity through a utility screen. **What is weaker:** Context sensitive gives little help until the current action is named in the scene; shared trigger functions vary by mode. A reference page is insufficient when a player needs an alternative binding or reliable target selection. The picture's density also makes text-size behavior important.

**Open Legend application.** Keep contextual help close to the selected object and provide an accessible controls reference. Show the current meaning of a key when the mode changes; distinguish camera movement, character movement and object interaction. Preserve an explicit route back, restore focus, and keep typing from triggering world actions. Use readable labels and available input alternatives without inventing unsupported controller support. Help should explain the current native interaction and its blockers, not ask the player to learn internal operation names.

## What to adopt, and where the analogy ends

| Pattern                                | Open Legend adaptation                                                      | Specific risk to avoid                                                  |
| -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Contextual numbered choices            | A few actions attached to the selected person or object.                    | A giant list of generic activities that asks for the context again.     |
| World and transcript together          | Keep the situation visible beside conversation and inspection.              | A window so large that the player loses the object they opened.         |
| Explicit outcome near an action        | Show what changed and preserve it in readable history.                      | Only a transient color flash, or a result detached from its target.     |
| Named equipment slots and item detail  | Show the possession, location, effect and direct action.                    | Unexplained icon art or a layout chosen purely to fit the data model.   |
| Distinct ongoing thought/project state | Expose duration, commitment and progress for activities where those matter. | Importing an elaborate specialty menu into routine actions.             |
| Deliberate visual identity             | Let typography and surfaces belong to Open Legend's world.                  | Copying tape graphics, obscure abbreviations or uncertain focus states. |

The map and journal add a useful lesson about remembered opportunities and meaningful completed work, while the controls screen shows the difference between documenting a binding and making the interaction usable. Disco Elysium's prose-first choices are a strong reference for authored conversation, inspection and meaningful decisions. Multiplayer free text still needs audience, delivery and interruption rules. Physical containers still need two visible collections, clear reach and ownership; this game does not supply that evidence. Accepted Open Legend behavior remains in the linked handbook chapters.

## Reference-image rights

All six screenshots are retained for attributed design research and criticism. They are not Open Legend assets, are not relicensed under the repository's AGPL license, and no permission to reuse their art is asserted. The manifest records provenance, dimensions, hashes and version uncertainty. Historical criticism is kept separate from current-build claims and from proposed Open Legend behavior.
