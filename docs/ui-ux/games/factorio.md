# Factorio: object interfaces, fast transfers and stable shortcuts

[UI/UX handbook](../README.md) · [Inventory guidance](../inventory.md) · [World interaction](../world-interaction.md) · [Screenshot manifest](../screenshots/factorio/manifest.json)

## Scope, evidence and version baseline

Reviewed **2026-10-03**. This dossier contains **six distinct, locally saved and visually inspected game UI captures**. Four are Wube's November 2020 **1.1 development preview**, one is its January 2019 **0.17 development preview**, and one is a February 2021 official-wiki capture whose exact patch is unspecified. They are historical design evidence. The current official controls and quickbar documentation were also read to check the interaction vocabulary; this was not a hands-on test of a current executable. PC mouse/keyboard is the baseline; no console accessibility or controller behavior was tested.

**Evidence labels:** **Observed** describes the saved image; **Documented** describes a cited developer or official-wiki explanation; **Assessment** is our design judgment; **Application** proposes how Open Legend can use the lesson. Game screenshots retain their original third-party rights, are reference-only, and are not assets licensed for Open Legend's game. The manifest records source and image URLs, dimensions, hashes, dates and inspection status.

Factorio is especially useful because it makes a complicated simulation quick to operate. Its relevance is the relationship between a world object and its interface, the stability of repeated actions, and the visibility of machine state. Open Legend need not inherit a factory game's icon density, robot networks or global knowledge.

## The actual player workflows

| Player intention | Documented PC workflow | Design consequence |
| --- | --- | --- |
| Open a chest or machine | Left-click the world object to open that object's interface. The quick-start guide describes the player's inventory appearing with an opened container. | The world interaction already establishes the target; choosing that target again would add no decision. |
| Move a stack | Pick up a stack and place it in the other inventory, or Shift-left-click it for a stack transfer. | The two visible collections make direction understandable. |
| Move all of an item type | Ctrl-left-click that item; Ctrl-clicking an empty slot transfers all eligible contents. | An expert action accelerates an established source/destination pair. |
| Take a partial stack | Right-click picks half into an empty cursor; Shift-right-click transfers half the selected stack. | Ordinary and partial transfer need distinct, learnable gestures. |
| Handcraft | Open the character interface, choose a recipe category, then activate the desired recipe. Craft one, five or the available maximum through the documented mouse modifiers; progress appears in the crafting queue. | Choose the outcome; the game handles routine ingredient consumption and queueing. |
| Repeat construction | Select a quickbar shortcut; the cursor takes an available inventory stack. The shortcut remains when stock reaches zero. | A quick action is a reference to a thing or action, not a second storage location. |

Sources: [official quick-start guide](https://wiki.factorio.com/Tutorial:Quick_start_guide), [official controls](https://wiki.factorio.com/Controls), [crafting](https://wiki.factorio.com/Crafting), [quickbar](https://wiki.factorio.com/Quickbar). Bindings are configurable; these are the documented defaults read during this research.

### Where numerical configuration earns its place

Factorio has legitimate settings screens. Choosing desired robot delivery quantities changes an ongoing logistics policy; it is a different decision from putting one stack in an already opened chest. Wube's [FFF-338](https://www.factorio.com/blog/post/fff-338) explains its paired minimum/maximum requests and why it temporarily stages edits before robots act. The lesson is to place fields around real policy choices. A routine transfer or recipe should not require the player to restate actor, container and obvious resources.

## What players specifically liked, and the limits of that evidence

| Original account | Specific feedback | What it supports |
| --- | --- | --- |
| Serenity, [FFF-278 discussion](https://forums.factorio.com/viewtopic.php?p=394751), 2019-01-18 | Welcomed stable quickbar placement, seeing total owned quantities and having different shortcut pages for different tasks. | Direct, feature-specific positive reaction. This was a reaction to a development preview, not a report of prolonged use of the released change. |
| L0laapk3, [same original thread](https://forums.factorio.com/64480), 2019-01-18 | Worried that hiding ghost-cursor behavior in settings would prevent players discovering it; proposed introducing it when construction robots unlock. | Convenience that exists but is undiscoverable may fail its audience. |
| Wube, [FFF-363](https://www.factorio.com/blog/post/fff-363), 2020-11-13 | Reported its own play experience with duplicate character controls and nested tabs, then made the simultaneous flat layout the default. | Primary developer rationale and revision history; it is not independent player-review consensus. |

These accounts justify testing the particular improvements. They do not establish that every player likes Factorio's entire inventory or that its learning curve fits Open Legend unchanged.

## Screenshot analysis

### FACT-01 — Simultaneous inventory, logistics and crafting

![FACT-01: Factorio's flat character screen with inventory, logistics and crafting visible together](../screenshots/factorio/fff-363-flat-character-gui.png)

**Provenance:** [Wube FFF-363](https://www.factorio.com/blog/post/fff-363), 2020-11-13; 1.1 preview; desktop. [Original image](https://cdn.factorio.com/assets/img/blog/fff-363-flat-character-gui.png).

**Observed controls and layout:** Three headed columns; scrollable inventory; request icons and trash slots; recipe categories; search and close. Counts sit on item icons. The personal-logistics checkbox is visible above requests.

**Documented workflow:** Open inventory, find a recipe and craft while inspecting owned resources; logistics settings remain available alongside it. Wube explicitly replaced the nested character tabs with this flat default. [Developer explanation](https://www.factorio.com/blog/post/fff-363)

**Assessment — good:** Related information remains visible through the decision. Strong headings preserve the difference between what is owned, what robots should maintain and what can be created. The selected context does not disappear to make room for a destination form.

**Assessment — weak:** The density assumes substantial icon familiarity. Three expansive columns would overwhelm a narrow browser viewport. Identical icon language across owned items, requests and recipes can still confuse a newcomer about what a number represents.

**Application:** Keep Open Legend's carried items and the opened object's items visible together. Add a selected-item detail area only when useful; do not make that third pane mandatory. Explain quantity meanings and use readable fallback names for unfamiliar invented objects. Reflow the same decision at small sizes, preserving the selected object and destination.

### FACT-02 — A clicked machine has an identity and a reason it is stopped

![FACT-02: Inserter interface with the character inventory and an explicit destination-space blocker](../screenshots/factorio/fff-363-inserter-gui.png)

**Provenance:** [Wube FFF-363](https://www.factorio.com/blog/post/fff-363), 2020-11-13; 1.1 preview; desktop. [Original image](https://cdn.factorio.com/assets/img/blog/fff-363-inserter-gui.png).

**Observed controls and layout:** Inventory is left; the inserter preview and written status are right. A checkbox and slider control stack-size override. Two connection-related icon controls and close occupy the title bar; their full behavior is not established by this still.

**Documented workflow:** Click the machine; inspect its displayed operating condition. Wube says the standardized entity interface exposes status that previously went unnoticed in tooltips. [Developer explanation](https://www.factorio.com/blog/post/fff-363)

**Assessment — good:** A sentence answers the player's immediate question about why the machine stopped. The color indicator supplements that sentence. The preview helps connect settings to the physical object being operated.

**Assessment — weak:** The large preview consumes considerable space, and the connection symbols need learned meaning or explanations. Most of the right pane is empty in this state.

**Application:** Opening a campfire or cooking station should name and depict that station, show its current work, and put a concrete blocker beside the relevant action. "Needs fuel" or "Output space is full" should be readable without opening a diagnostic form. Advanced operating policies can remain secondary.

### FACT-03 — Storage contents, automation filtering and restricted slots

![FACT-03: Factorio storage chest panel with item slots, a capacity control and a separate logistic filter](../screenshots/factorio/storage-chest-gui.png)

**Provenance:** [Official wiki file page](https://wiki.factorio.com/File:Storage_chest_gui.png), uploaded by Zippy on 2021-02-28; exact patch unspecified. This is the publisher's crop of the chest half, so it does not show the paired player inventory. [Original image](https://wiki.factorio.com/images/Storage_chest_gui.png).

**Observed controls and layout:** Status and object preview precede a populated grid. The red X sits inside the grid's final row; a labeled logistic filter is separate below. A network control and close occupy the upper edge.

**Documented workflow:** Open the world chest and transfer against the player inventory. The red capacity marker restricts inventory use by automation; the logistic filter controls the type accepted from the network. These are distinct from selecting the destination for an ordinary manual move. [Storage chest](https://wiki.factorio.com/Storage_chest), [stack/inventory limitation](https://wiki.factorio.com/Stack)

**Assessment — good:** Actual contents occupy the center of the interface. A filter is a property of this particular container, separated from its contents.

**Assessment — weak:** An X can look like delete, yet here it concerns usable capacity. Its meaning is not discoverable from shape alone. This advanced chest is more complex than a plain adventure-game chest.

**Application:** Show the opened chest's collection directly. Distinguish physical capacity, permissions and optional sorting rules. Use a named control for any unusual policy; do not borrow this ambiguous X or expose automation settings on every ordinary bag.

### FACT-04 — The quickbar stores the player's arrangement

![FACT-04: Ten quickbar pages with two active rows and a highlighted page selection](../screenshots/factorio/fff-278-action-bar-pages.png)

**Provenance:** [Wube FFF-278](https://factorio.com/blog/post/fff-278), 2019-01-18; 0.17 preview; desktop. [Original image](https://cdn.factorio.com/assets/img/blog/fff-278-action-bar-pages.png).

**Observed controls and layout:** A grid of numbered pages expands above two active rows. The selected page is amber; depleted shortcuts remain visible. Close is in the corner.

**Documented workflow:** Open the page selector from its number, choose a page or an item, and continue building. The slots are persistent shortcuts rather than extra inventory. [FFF-278](https://factorio.com/blog/post/fff-278)

**Assessment — good:** Spatial memory survives temporary shortage. A player can arrange common tools around their own routine. The number on the shortcut communicates availability without moving the item reference.

**Assessment — weak:** A ten-page matrix is substantial complexity. Dimming alone can blur the distinction between unavailable stock and an unconfigured slot. Number-key page switching is hard to discover without help.

**Application:** Preserve Open Legend's pinned action positions and chosen tools. If the knife is missing, keep its pin and explain why it cannot be used. Begin with a compact useful set; extra pages require demonstrated need. A shortcut should retain its intended subject or make a new targeting step explicit.

### FACT-05 — Recipe discovery inside the recipe catalogue

![FACT-05: Recipe categories and newly available recipes marked with small exclamation badges](../screenshots/factorio/fff-363-recipe-notifications.png)

**Provenance:** [Wube FFF-363](https://www.factorio.com/blog/post/fff-363), 2020-11-13; 1.1 preview; desktop. [Original image](https://cdn.factorio.com/assets/img/blog/fff-363-recipe-notifications.png).

**Observed controls and layout:** Four categories, search, close, recipe tiles, quantity numbers and small attention badges. The shown crafting state differs from FACT-01; it is a separate source capture, not our crop.

**Documented workflow:** Notice a marked category, open it, inspect a marked recipe, then use normal crafting controls. The announcement describes hover-cleared badges and an option to disable them. [Developer explanation](https://www.factorio.com/blog/post/fff-363)

**Assessment — good:** Discovery occurs where the new option can be used. A small indicator can guide attention without replacing the game with an announcement dialog.

**Assessment — weak:** Accidental hover can clear an indicator before the player understands the recipe. Badges can lose their meaning when everything is marked. Recipes without readable names remain hard to recognize.

**Application:** Introduce newly learned camp recipes within the corresponding station's choices. Make the reason for new availability readable. Do not mark every dynamically generated action as new, and give keyboard focus the same explanation as hover.

### FACT-06 — Optional symbolic names are inserted through a picker

![FACT-06: A name editor with an item-icon picker and searchable icon categories](../screenshots/factorio/fff-363-rich-text-selector.png)

**Provenance:** [Wube FFF-363](https://www.factorio.com/blog/post/fff-363), 2020-11-13; 1.1 preview; desktop. [Original image](https://cdn.factorio.com/assets/img/blog/fff-363-rich-text-selector.png).

**Observed controls and layout:** A short name field opens an icon selector with categories, search and close. The underlying list retains the selected name. The green return-shaped button is adjacent to the name.

**Documented workflow:** Open the name's icon selector and select a symbol instead of remembering an internal rich-text token. [Developer explanation](https://www.factorio.com/blog/post/fff-363)

**Assessment — good:** A specialized picker removes a syntax-learning task from optional naming. The edited subject remains visible beneath the picker.

**Assessment — weak:** A huge icon catalogue can dwarf a short renaming task. Icon-only naming reduces clarity for people who cannot recognize or see the symbol; the save control would benefit from an accessible verb.

**Application:** Open Legend can support optional storage colors, symbols or names without forcing them into the transfer loop. Preserve readable names alongside symbols. Chat or object references should be inserted through known objects where useful, while ordinary conversation remains a simple composer.

## Synthesis for Open Legend

The strongest transferable arrangement is **interact with a world object, see the relevant object interface with your possessions, and perform the intended action directly**. Stable references, visible blockers and accelerators then improve that basic loop. Factorio also shows that an interface can remain complex when the player is deliberately configuring a complex system; the number of controls should follow that decision, not the number of fields in the simulation.

Candidate evaluation tasks: open a chest and move a stack without entering another target; split one stack without losing the open chest; inspect a stopped station and identify the remedy; consume the last item on a shortcut and refill it without reconfiguration. These are design proposals. Current Open Legend behavior and implementation acceptance remain in the linked handbook and trackers.
