# Project Zomboid: object context, explicit time costs and deliberate complexity

[UI/UX handbook](../README.md) · [Inventory guidance](../inventory.md) · [World interaction](../world-interaction.md) · [Screenshot manifest](../screenshots/project-zomboid/manifest.json)

## Scope, evidence and version baseline

Research began **2026-10-03** and was finalized **2026-10-04**. All **six locally saved screenshots were visually inspected**, including enlarged inspection of the small controls in the two 2026 captures. The collection intentionally separates versions:

| Evidence | Baseline and limitation |
| --- | --- |
| PZ-01, ordinary looting and health | Published 2025-04-28; exact capture build, platform and mod status unknown. |
| PZ-02, surface crafting | Developer **Build 42 work in progress**, June 2024; a proposal at that date. |
| PZ-03 and PZ-04, crafting/building | Developer's **Build 42.20 feature overview**, with image assets dated July 2026. Some small diagnostic-looking text and a **Force Action** control are visible; this does not establish those controls as normal player UI. |
| PZ-05 and PZ-06, fluid transfer | Developer **Build 42 prototype**, 2022-07-21; not evidence that the present release preserves this exact layout. |

The [inventory wiki](https://pzwiki.net/wiki/Inventory) identifies a 41.78.16 revision baseline while warning that parts have been updated for Build 42. Its broad interaction descriptions are useful; it is not a clean specification for every 42.20 detail. No game executable, live multiplayer session or controller was tested. A changing version number in the website header must not be assigned retroactively to a historical screenshot.

**Observed** means visible in an image. **Documented** means a linked developer guide, wiki or original account supports it. **Assessment** and **Application** are our analysis and proposed Open Legend use. Images retain their original third-party rights and are stored for reference only; they are not licensed Open Legend game art.

## The interaction model, and why some friction is deliberate

Project Zomboid couples physical objects to item management. The [inventory guide](https://pzwiki.net/wiki/Inventory) describes opening world containers, moving items through drag/drop or context actions, carried bags, capacity/encumbrance, and transfers that take game time. A refrigerator supplies the target; the player need not first define a generic activity's destination.

The developer's [2012 explanation of the inventory redesign](https://projectzomboid.com/blog/news/2012/09/zomboid-ui-explained-badly/) makes a valuable distinction. Looting can require time because packing while danger approaches is a survival decision. Making the interface slow is an unreliable way to produce that decision. An explicit timed action lets the game communicate and regulate the cost. This historical design rationale is stronger evidence of intent than guessing that every awkward control is deliberate realism.

**Open Legend application:** If moving something is instantaneous in the game rules, make its ordinary UI action immediate. If it takes time, starts movement, uses effort or can be interrupted, communicate that consequence after a clear player intention. Preserve server authority and the actual access rules. Extra selectors and confirmations must not stand in for simulation.

The [Build 42.20 overview](https://projectzomboid.com/blog/features-overview-build-42-20/) documents selectable recipe inputs, search by inputs or outputs, batch crafting, workstations and conditional right-click crafting shortcuts. These support a layered design: express the intended result first; expose material choice when it changes the result. The same overview says inventory interactions and timed actions execute on the server. A convenient interface does not require weakening world rules or authority.

## Original player feedback: useful disagreement

The [January 2023 Steam discussion](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/) contains specific competing preferences. Jethro likes the inventory for being quick, simple and easy to get out of the way, while still double-checking transfers. Grishnerf likes the two-window selection model. The original poster, DaLagga, finds long lists of equipped and carried items difficult to organize and dislikes repetitive storage work in a safe base. KillerKommando prefers lists to grids and uses named bags and favorites.

That thread is evidence of individual experiences, not a consensus or a controlled comparison. It does show why substituting a list with squares cannot, by itself, resolve every inventory problem. Item identity, stable organization, safe actions and visible source/destination matter in both presentations.

Two additional primary discussions bound the lesson:

- [UI opacity, January 2021](https://theindiestone.com/forums/topic/33019-ui-opacity/): Shagyee likes improvements over the older UI but reports inventory obscuring the world in split-screen and other menus intruding on the second viewport. An interface can be functional and still block the information needed during play.
- [UI overhaul discussion, April 2021](https://theindiestone.com/forums/topic/35339-ui-overhaul-suggestion/?comment=310019&do=findComment): players disagree about grids, lists and equipment presentation. Charleston favors the existing list model with less clutter. Several illustrations in that thread are proposals, so they are **not** included here as actual game screenshots.

## Screenshot analysis

### PZ-01 — The physical refrigerator supplies the loot context

![PZ-01: A survivor stands at an outlined refrigerator while the fridge inventory and character health panel are visible](../screenshots/project-zomboid/fridge-loot-health.webp)

**Provenance:** 4Netplayers Team, [article published 2025-04-28](https://www.4netplayers.com/en/blog/project-zomboid/why-play-project-zomboid/). Exact screenshot build, platform and mod status unspecified. This commercial article is the image supplier, not independent player-review evidence. [Original image](https://www.4netplayers.com/images/blog/project-zomboid-warum-spielen/2.webp).

**Observed controls and layout:** The orange refrigerator is outlined in the world. A top-right list is headed **Fridge**, with **Loot All**, a capacity readout, Type/Category columns and named fresh food. The player's inventory is collapsed to a separate top bar with **Transfer All** and its own capacity. A narrow icon strip adjoins the loot window. The left health panel shows a body silhouette and explicitly says to right-click for the treatment menu. A hotbar, time display, status icons and minimap remain visible.

**Documented workflow:** Interact with the relevant world container, inspect its contents, move selected items or use the bulk action, and allow timed transfers to complete. The [inventory guide](https://pzwiki.net/wiki/Inventory) supports this workflow; the still cannot demonstrate timing or successful completion. The exact identities of every small icon in the right strip are not established by this image alone.

**Assessment — good:** A named, outlined object connects the abstract item list to the place in the world. Text labels expose freshness without requiring the player to recognize every food icon. The treatment instruction names a concrete contextual gesture.

**Assessment — weak:** The collapsed personal inventory prevents simultaneous inspection of both collections in this particular state. Floating panes can cover the world needed for danger awareness. A dense rail of container icons still requires discovery and should not be mistaken for a universally good solution to selecting nearby objects.

**Application:** Opening an Open Legend chest should preserve the chest's visible identity and show belongings alongside its contents. Keep item names available in a grid or compact list. Provide a clear way to close or minimize the panel while retaining the selected world object. Do not inherit a nearby-container rail merely because this game uses one.

### PZ-02 — A workstation establishes context before recipe choice

![PZ-02: June 2024 work-in-progress Crafting on Desk interface with a selected weapon recipe, required tools, output and Craft button](../screenshots/project-zomboid/b42-surface-crafting-wip-2024.png)

**Provenance:** The Indie Stone, [The Biomic Man, June 2024](https://projectzomboid.com/blog/news/2024/06/the-biomic-man/); **Build 42 development preview** on desktop. The page presents this as work in progress. [Original image](https://projectzomboid.com/blog/content/uploads/2024/06/image-107-1024x824.png).

**Observed controls and layout:** The title is **Crafting on Desk**. A recipe grid occupies the left; the search field contains `weapon`. The selected **Sawblade Weapon** shows a 60-second craft time and a Carpentry level requirement. The right side distinguishes **Requires** from **Creates** and marks some tools **keep**. A **Manually select inputs** toggle, quantity control and **Craft** button occupy the bottom. Search, page arrows, close and pin controls frame the panel.

**Documented workflow:** The developer describes crafting through a selected surface and acknowledges that the interface will evolve. The image demonstrates a proposed route: select the desired recipe, inspect its costs and retained tools, optionally change inputs or quantity, then craft. It is not evidence that every current workstation opens this exact grid.

**Assessment — good:** The station is already named. The required-versus-created distinction makes consequences inspectable. Keeping manual input selection optional reserves detailed choice for situations where it matters.

**Assessment — weak:** Many empty recipe slots consume a large area. A player could confuse the recipe catalogue with another storage grid. The complete screen still demands substantial reading for one ordinary action.

**Application:** An Open Legend workbench should open with the relevant station fixed and a short list of meaningful outcomes. Clearly distinguish consumed materials, retained tools, skill requirements and results. Put ordinary ingredient selection behind a sensible default, with a visible override when condition, quality, ownership or significance matters.

### PZ-03 — A later crafting layout makes names and search central

![PZ-03: Build 42.20 developer screenshot with Crafting on Table, category rail, recipe list and input/output details beside the survivor](../screenshots/project-zomboid/b42-crafting-2026.jpeg)

**Provenance:** The Indie Stone, [Build 42.20 feature overview](https://projectzomboid.com/blog/features-overview-build-42-20/); image asset dated **July 2026**, exact capture date unknown. Desktop developer-published capture; mode/mod details unspecified. [Original image](https://projectzomboid.com/blog/content/uploads/2026/07/pz-new-crafting.jpeg).

**Observed controls and layout:** **Crafting on Table** heads a three-part panel: categories, searchable recipe list, and selected recipe detail. Requirements use item icons and labels; a separate Outputs area previews the result. Quantity controls appear below. The character and nearby table remain visible. Small diagnostic-looking recipe text and **Force Action** are present. Other fine print is not reliably readable at this supplied resolution and is not transcribed as a verified normal-player control.

**Documented workflow:** The associated overview describes finding recipes by inputs or outputs, choosing eligible inputs when wanted and crafting in batches. The screenshot supplies layout evidence; the guide supplies those behavior claims.

**Assessment — good:** Names help distinguish similar objects without repeated hovering. Categories and search can shorten retrieval as the crafting system grows. Input and output details remain beside the selected recipe.

**Assessment — weak:** The supplied 1024-pixel image makes menu text small; that limits this evidence and does not prove the native game is always this hard to read. Dense parallel columns can still feel like administration. Diagnostic controls cannot be treated as a model for public-facing execution.

**Application:** Search should support an intention such as a tool name or available material. Keep the selected result and its blockers visible without navigating another page. Determine text sizing and panel width through Open Legend's own supported viewport tests. Player controls should use concrete verbs such as **Make**, **Repair** or **Cook**.

### PZ-04 — Building keeps the affected world nearby

![PZ-04: Build 42.20 developer building screen with Plank Barricade selected and material requirements beside the visible wall and survivor](../screenshots/project-zomboid/b42-building-2026.jpg)

**Provenance:** Same [Build 42.20 overview](https://projectzomboid.com/blog/features-overview-build-42-20/); image asset dated **July 2026**, exact capture date unknown. Desktop developer-published capture; mode/mod details unspecified. [Original image](https://projectzomboid.com/blog/content/uploads/2026/07/pz-new-building.jpg).

**Observed controls and layout:** A **Building** panel occupies the right side while the survivor, window and planks remain visible to the left. Categories and search lead to a short list containing **Plank Barricade**, **Metal Bar Barricade** and **Metal Sheet Barricade**. The selected item has a requirements area with a hammer, planks and nails. A small **Force Action** control appears at the bottom; its status as a normal-player command is not established.

**Documented workflow:** The overview documents expanded building and crafting methods. The image shows selecting a building result and inspecting requirements in world context. It does not show a complete placement sequence or prove which precise gesture first opened the menu.

**Assessment — good:** The physical place being changed remains part of the decision. Related options and their costs are grouped. The selection is expressed as a recognizable result.

**Assessment — weak:** The large panel has substantial empty space for only three matching options. The visual balance could make the menu dominate a simple interaction. The debug-like bottom control and unreadable fine print limit direct comparison with a finished player flow.

**Application:** When an Open Legend wall, door or station offers a small contextual set of actions, present those relevant verbs near that object. Move to a richer recipe browser only when the player is browsing a larger possibility space. Preview where a world-changing action will apply and keep blockers attached to that intention.

### PZ-05 — Precision controls are justified when composition is the decision

![PZ-05: A Build 42 fluid-transfer prototype compares two bottles, mixed contents and an explicit transfer quantity](../screenshots/project-zomboid/fluid-bottle-mixing-wip-2022.png)

**Provenance:** The Indie Stone, [Liquid Zedball, 2022-07-21](https://projectzomboid.com/blog/news/2022/07/liquid-zedball/); **Build 42 fluid prototype**, desktop. [Original image](https://projectzomboid.com/blog/content/uploads/2022/07/fluids_b.png).

**Observed controls and layout:** **Transfer Fluids** presents one bottle on each side. Capacity, stored volume and free space are explicit. Colored bars differentiate the visible contents. A **Switch** control between the two vessels implies reversal of source and target; its behavior was not tested. A slider reports **Transferring 400 mL** with **Max Transfer 780 mL**. **Transfer** and **Close** are separate controls.

**Documented workflow:** The developer describes fluid composition and transfer between carried and world containers. This prototype lets the player compare the two vessels and specify an amount. The source does not establish the present-release gesture for every control.

**Assessment — good:** Source, destination and consequence are simultaneously inspectable. The chosen amount has a meaningful relationship to space and mixture. A quantitative control is justified if the player's actual aim is a particular mixture.

**Assessment — weak:** Color alone may not explain composition, and a slider can make precise values awkward. Requiring this interface for every routine refill would impose repeated decisions that often have obvious answers.

**Application:** Reserve a precision transfer surface for deliberate splitting, mixing or another meaningful amount choice. Show named liquids, capacity and the resulting amount. Offer an exact-value input alongside accessible incremental controls where precision matters. Do not require a quantity form to put an ordinary object into a chest.

### PZ-06 — A detailed transfer panel can coexist with a quick refill action

![PZ-06: A world water cooler supplies a carried bottle in a Build 42 fluid-transfer prototype](../screenshots/project-zomboid/fluid-cooler-transfer-wip-2022.png)

**Provenance:** Same [Liquid Zedball article, 2022-07-21](https://projectzomboid.com/blog/news/2022/07/liquid-zedball/); **Build 42 fluid prototype**. This is a distinct source screenshot from PZ-05, showing a world cooler rather than a second carried bottle. [Original image](https://projectzomboid.com/blog/content/uploads/2022/07/fluids_c.png).

**Observed controls and layout:** The selected world water cooler is visible beside the panel and pictured as its source. The bottle is the target. A five-litre source and two-litre target have separate space readouts; the slider displays a 780 mL transfer. Direction, maximum amount, **Transfer** and **Close** are visible.

**Documented workflow:** The article explicitly says quick context options such as filling a bottle from a tap are retained alongside the more detailed fluid system. That is the critical interaction lesson: a deeper model need not expose all its parameters on every use.

**Assessment — good:** The world source and carried target are concrete. A dedicated panel can support intentional partial transfer without requiring the player to remember capacity arithmetic.

**Assessment — weak:** The same detailed controls are too much for a player who simply wants to fill an empty bottle. This prototype image alone does not demonstrate how discoverable the quick route was.

**Application:** At an appropriate Open Legend water source, expose **Fill bottle** when the target is already clear. If several eligible bottles create a meaningful ambiguity, resolve only that ambiguity. Offer **Transfer amount…** for deliberate partial transfer. The ordinary action should not begin by choosing a generic activity and filling in source, container, amount and output.

## What to adopt, and what to evaluate

The transferable design is a relationship between player intention and physical context: select the object, understand the relevant belongings and consequences, then act. Time and capacity can remain serious game rules. Text lists can remain useful for large collections. Neither requires hiding the world relationship or asking the player to reconstruct it in a form.

For Open Legend, evaluate a looting scene while movement or danger continues, a safe-home storage scene, and a workstation scene with one valued ingredient the player wants to preserve. Check that the same normal action stays clear in all three, that interruption does not lose intent, and that consequential material choices remain possible without burdening every ordinary use. These are research-derived candidate tasks; the handbook and maintainers' trackers own accepted implementation work.
