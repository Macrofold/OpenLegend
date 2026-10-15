# Minecraft: objects first, a consistent item grid second

Research date: **2026-10-03**. Status: comparative research, not an implementation specification. Read alongside [inventory](../inventory.md), [world interaction](../world-interaction.md), and [controls](../controls.md).

## Scope and evidence

This dossier studies eight saved, individually inspected screenshots, including two added for the whole-interface expansion on **2026-10-04**. The first three are official 2023 Bedrock screenshots with Nintendo-style controller prompts; the other three show historical desktop interfaces. They must not be presented as one current platform build. A screenshot establishes visible layout and state; the linked control documentation establishes interactions that cannot be inferred from the image. Unknown capture versions remain unknown. The [asset manifest](../screenshots/minecraft/manifest.json) records provenance, dimensions, hashes, and image-specific observations.

Minecraft is useful because its chest interaction closely matches the user's stated expectation: the player interacts with an object in the world, and the resulting interface exposes that object's contents alongside carried items. Its station and merchant interfaces also demonstrate that a game can have substantial menus without turning an ordinary action into an activity configuration form.

## Interaction model and controls

The official general controls guide identifies right-click as the desktop use/interact control, `E` as inventory, and number keys as hotbar selection. The Java hotkeys guide documents `Shift` + left-click as a stack transfer between inventory and an open container. That shortcut is contextual: the already-open container supplies the destination. These are documented desktop bindings, not promises about the Nintendo-style frames below. [M1][M2]

| Player intention         | Interface sequence                                                                                    | What the player has to decide                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Put something in a chest | Approach and interact with that chest; see chest cells and carried cells; transfer the stack          | Which item and, when relevant, how many             |
| Craft a known item       | Open personal crafting or a crafting table; choose the recipe or arrange ingredients; take the output | Recipe and any meaningful ingredient choice         |
| Smelt something          | Interact with the furnace; place input and fuel; collect output                                       | Input and fuel, represented by slots in the process |
| Trade                    | Interact with the merchant; inspect its offers; supply payment and take the result                    | Which offer and quantity                            |

The recipe book provides categories and search, can fill the crafting grid from a selected recipe, and marks unavailable recipes. Personal crafting has a smaller grid than a crafting table. These are task-specific constraints made visible where crafting happens. They do not require the player to first choose a generic “craft” activity and then supply every backend argument. [M3]

The historical trading design provides a useful qualification. In a developer interview, Jens Bergensten describes considering payment by dropping objects in the world, then choosing a trading interface because presenting offers and handling payment was difficult to communicate that way. The lesson is to expose the actual decision clearly, not to remove all interfaces. [M4]

## Screenshot analysis

### MC01 — Creative/category inventory with a carried-item area

![Minecraft Bedrock inventory with Nature catalog, equipment, crafting grid and controller prompts](../screenshots/minecraft/01-personal-inventory.jpg)

**Observed layout and controls.** This official image has a left-hand **Nature** catalog, category tabs and search, with an avatar/equipment area, 2×2 crafting grid, output slot, carried inventory and hotbar on the right. It is a creative/category state, not a plain Java survival inventory. The footer explicitly shows **Take**, **Exit**, **Take Half**, and **Quick Move** with controller glyphs; shoulder-button hints accompany categories. [M3]

**Why it works.** The player can see objects and destinations continuously. The ordinary verbs are local to items, and the controller route is visible without requiring a mouse-like drag gesture.

**Where it struggles.** A large catalog beside owned items creates two different meanings for similar item cells. Category pictures require recognition; the dense footer does not explain ownership by itself.

**Application to Open Legend.** Keep carried goods visually distinct from recipe discovery, possible purchases, and world knowledge. Show a focused item action and a keyboard/controller route for transfer. Do not copy the creative catalog into the normal inventory just because it uses the same grid.

### MC02 — Recipe book and an unavailable result

![Minecraft recipe book with red unavailable entries and a crafting preview](../screenshots/minecraft/02-recipe-book.jpg)

**Observed layout and controls.** The left pane is **Construction**. Many recipe cells use a red background. A filter control is selected and the footer says **Show Craftable**. The right pane contains a small crafting preview and a red output cell; most carried slots are empty. The stable inventory and hotbar remain in the same positions as MC01. [M3]

**Why it works.** Recipe discovery and availability filtering are close together. Choosing a recipe can explain what the player is trying to make without requesting a manually completed ingredient form.

**Where it struggles.** Red communicates a problem but the image does not expose an explicit shortfall sentence. An unfamiliar player must identify the missing ingredient from small icons. Color alone is insufficient feedback.

**Application to Open Legend.** Pair a craftable filter with specific text such as “Missing 1 timber” or “Requires a forge.” Let the selected station and carried supplies establish defaults. Ask for an ingredient substitution only when that choice changes the result.

### MC03 — A concrete recipe: planks become a crafting table

![Minecraft four-plank crafting-table recipe and output](../screenshots/minecraft/03-table-recipe.jpg)

**Observed layout and controls.** Four planks occupy the 2×2 input grid, an arrow points to a crafting table output, and the footer includes **Clear Recipe** and **Exit**. Carried materials remain visible below. This is a distinct recipe state, not a second crop of MC02. [M3]

**Why it works.** The material-to-result relationship is spatial and inspectable. “Clear Recipe” acts on this recipe, keeping the scope of the action small.

**Where it struggles.** Spatial recipes require learned arrangements. An output icon alone can underspecify what activating it consumes, particularly across input platforms.

**Application to Open Legend.** Show a small ingredient summary, resulting item, and one craft action in the station interface. Minecraft's arrangement puzzle is a game mechanic, not a requirement for a good inventory; Open Legend should adopt it only if placement itself is intended to matter.

### MC04 — Large chest: two sets of cells, one object context

![Minecraft Large Chest with 54 chest slots above the player's inventory and hotbar](../screenshots/minecraft/04-large-chest.jpg)

**Observed layout and controls.** The upper **Large Chest** area has six rows of nine cells. A lower **Inventory** area has three rows of nine, followed by a separated hotbar. The world is darkened behind the panel. No destination dropdown, nearby-container list, sort button, or take-all button is visible in this frame. [M5]

**Why it works.** The opened object's contents and carried contents share one visual language. Their position and headings establish transfer direction. The player is acting on the chest already selected through the world, rather than selecting it again from a list.

**Where it struggles.** Bulk movement and sorting are not discoverable from this screenshot. Dense icon collections and nearly identical cell styling make category recognition and source mistakes possible. The fast Java transfer shortcut comes from the control documentation, not the visible interface. [M2]

**Application to Open Legend.** Make the default chest flow **world object → named chest and carried inventory → transfer**. Include a visible Move action as well as fast gestures. Display access, capacity and distance failures at the object or transfer, with an actionable reason; do not turn server eligibility into a destination-selection form.

### MC05 — Furnace: the station determines the interaction

![Minecraft Furnace input, fuel and output slots above player inventory](../screenshots/minecraft/05-furnace.jpg)

**Observed layout and controls.** A **Furnace** heading sits over an input slot, fuel slot, flame indicator, process arrow, and output slot. Player inventory and hotbar sit beneath. The cursor is holding a coal stack. This historical tutorial frame has no explicit labels on the input and fuel cells. [M6]

**Why it works.** The interface mirrors a small process: supply material and fuel, then collect a result. The object has already determined which kind of action is possible.

**Where it struggles.** Empty slots and a stopped arrow require prior knowledge. The static frame gives no explanatory sentence for missing fuel, incompatible input, or timing. A viewer cannot infer live progress behavior from it.

**Application to Open Legend.** An opened station should show its specific process and valid inputs, with clear stalled/ready/running states. Avoid a universal activity panel asking for station, method, tool, input and output container when the world context can resolve most of those values.

### MC06 — Villager trade: offers next to payment and result

![Minecraft Farmer trade list with payment slots, result slot and inventory](../screenshots/minecraft/06-villager-trade.jpg)

**Observed layout and controls.** **Trades** appear on the left. **Farmer – Novice** and a progress bar identify the merchant role on the right. The selected offer exchanges a crop stack for an emerald; another offers bread for an emerald. Two payment cells lead to a result cell, and an **Emerald** hover label is visible. Carried inventory is below. [M7]

**Why it works.** Offer, payment and result are visible together. The layout gives repeated transactions a predictable path after the merchant has been selected in the world.

**Where it struggles.** Tiny icons make similar goods hard to distinguish. The screenshot emphasizes profession over personal identity and does not spell out the purchase verb or a full prose price.

**Application to Open Legend.** A merchant interaction can open a compact shop that retains the NPC's name, goods, price and carried items. Item inspection should explain the actual cost and resulting quantity before confirmation. Open a shop from the actor interaction; do not ask the player to configure a generic trading activity.

## What players actually said

These are individual observations selected for specific interaction evidence, not a representative survey or a claim that players unanimously like Minecraft's inventory.

| Evidence                                                                                                                                                    | What it supports                                                                          | Limits                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A May 2025 Minecraft Feedback request praises Java's hover-plus-hotbar-number swapping as fast and intuitive and asks for equivalent Bedrock behavior. [M8] | Players can value direct, low-effort manipulation once its binding is learned.            | One feature request; it does not establish current Bedrock parity or overall satisfaction.                         |
| A beginner-focused November 2020 feedback request says new players miss the recipe book and proposes stronger onboarding. [M9]                              | A useful feature can still fail if its entry point is obscure.                            | One suggestion, not usability-test results.                                                                        |
| An indexed June 2020 Reddit post complains that updated inventory controls became clumsy for a returning player. [M10]                                      | Familiarity and muscle memory are part of inventory quality; changing gestures has costs. | Search-index excerpt only: the full discussion was unavailable during this pass. No unseen comments were analyzed. |

## Decisions this evidence supports for Open Legend

1. **The world selects the object.** Opening a chest must establish its identity and contents immediately; a nearby-container dropdown is not the default interaction.
2. **The carried inventory stays stable.** A chest, merchant and station may add a contextual pane without reorganizing every player item.
3. **Simple actions stay simple.** Transfer a stack with one direct action; expose a small quantity chooser for a deliberate split, not a required form for every move.
4. **Availability is explained at the decision.** Missing materials, inaccessible storage and wrong stations need explicit reasons in the relevant pane.
5. **Bindings are platform-specific and visible.** Do not infer Java behavior from Bedrock controller screenshots or publish one set of glyphs for every input device.

These are design recommendations from the comparison. Multiplayer authority, theft/access rules, item reservations and out-of-range recovery still require Open Legend-specific contracts; these screenshots do not demonstrate those behaviors.

## Sources and provenance

- **[M1]** Mojang, [Minecraft controls](https://www.minecraft.net/en-us/article/minecraft-controls). Official general input guide.
- **[M2]** Minecraft Help, [Hotkeys in Minecraft: Java Edition](https://help.minecraft.net/hc/es-mx/articles/360059148111-Hotkeys-in-Minecraft-Java-Edition). The indexed Spanish-locale URL served English hotkey documentation during research; used for Java keyboard behavior.
- **[M3]** Mojang Staff, [How to craft](https://www.minecraft.net/en-us/article/how-craft), 2023-06-05. Official source for MC01–MC03 and crafting explanation.
- **[M4]** Mojang, [Meet the Villagers](https://www.minecraft.net/en-us/article/meet-villagers). Developer interview about trading-interface decisions.
- **[M5]** Sportskeeda, [Features Mojang needs to improve in Minecraft 1.21 update](https://www.sportskeeda.com/minecraft/features-mojang-needs-improve-minecraft-1-21-update), 2024-era article. Image source for MC04; editorial opinion is not treated as player consensus.
- **[M6]** The Roku Channel, [Minecraft Tutorials: Survive and Thrive, season 1](https://therokuchannel.roku.com/details/32de5d18117f5eb39bd7e97abbbbd5ce/minecraft-tutorials-survive-and-thrive/season-1). Tutorial image source for MC05; capture version unknown.
- **[M7]** Sportskeeda, [Emerald ore in Minecraft: All you need to know](https://www.sportskeeda.com/minecraft/emerald-ore-minecraft-all-need-know), 2021-era article. Image source for MC06.
- **[M8]** Minecraft Feedback, [Enable hotbar key swapping while inventory is open (like Java Edition)](https://feedback.minecraft.net/hc/en-us/community/posts/36597544853517-Enable-hotbar-key-swapping-while-inventory-is-open-like-Java-Edition), 2025-05-14. Original player request.
- **[M9]** Minecraft Feedback, [More intuitive for beginners](https://feedback.minecraft.net/hc/en-us/community/posts/360074423911-More-intuitive-for-beginners), 2020. Original player request.
- **[M10]** Reddit, [The updated inventory controls SUCK](https://www.reddit.com/r/Minecraft/comments/hipjrk/), 2020-06. Indexed original player post; retrieval limitation noted above.

All eight images preserve the downloaded source bytes. They are third-party game screenshots collected for internal reference and criticism, not reusable Open Legend production art. The repository's code license does not relicense these images.

## Whole-interface expansion: exploration, status, navigation and input ownership

Reviewed **2026-10-04**. These two additional official captures extend the study beyond storage. They are historical 2023 evidence, not a claim to have played or tested the current release.

### MC07 — Survival information at the edge of the world view

![Minecraft underwater view with hotbar, health, hunger and oxygen](../screenshots/minecraft/07-underwater-hud.jpg)

**Observed.** The crosshair is centered; the bottom nine-cell hotbar has an unmistakable selected outline, stack counts and tool durability marks. Hearts and hunger occupy stable rows directly above it. Blue oxygen bubbles add a row over hunger while the character is submerged. The selected empty cell also agrees with the empty hand on screen. The screenshot shows no activity dialog and leaves the swimming direction visible.

**Sourced workflow.** Mojang's health guide explains that underwater bubbles deplete before drowning damages health. That is a changing, consequential condition, not merely decorative HUD chrome. The desktop control guide connects looking, movement, hotbar selection and use of the held object; the player continues acting in the world while reading the HUD. [M1][M11]

**Good / weak.** Stable anchors reduce searching during movement; contextual oxygen adds relevant information without permanently reserving a dashboard for every possible resource. Small repeated icons can still be difficult to count, and this frame cannot prove animation, sound, warning timing, or accessible labels. Open Legend should provide exact meaning through focus/inspection and text where needed, rather than assuming a familiar icon is self-explanatory.

**Open Legend application.** Keep selected character, current work, immediate condition and selected tool/action stable around the world view. Elevate a newly relevant hazard beside that status. Avoid opening a status-management form to explain an urgent change. Do not copy oxygen as a game mechanic unless the world actually supplies it; use this visibility rule for real conditions such as warmth, exposure or task interruption.

### MC08 — A map is an object used for orientation

![Minecraft held map with a player marker and surrounding village still visible](../screenshots/minecraft/08-held-map.jpg)

**Observed.** A parchment map fills most of the center while the village remains visible around its edges. A white/black marker sits near the mapped paths. Two map items are visible in the hotbar, one selected. There are no travel, destination-dropdown or submit controls. The missing survival rows do not establish a mode by themselves; the exact capture mode is unverified.

**Sourced workflow.** Mojang's exploration guide presents maps and a compass as navigation aids and separately explains coordinate displays. The general guide supplies hotbar selection and using held objects. A static map image does not prove teleportation, automatic routing, knowledge-sharing, or the completeness of world knowledge. [M1][M12]

**Good / weak.** Information and the object providing it are connected. Looking at geography does not require leaving the scene for a universal navigation form. The tradeoff is substantial central occlusion and terrain colors that need interpretation. A diegetic map is not automatically better than a clear dedicated map for every game or screen size.

**Open Legend application.** Opening the known-world map should preserve selected object/character context and distinguish a remembered location from a currently visible entity. Inspecting or pinning a place must not move the character. Give travel a separate explicit action and show unavailable/unknown information honestly. An optional expanded map can support planning without turning the normal HUD into a persistent atlas.

### World prompts, construction, chat and help

The desktop model is direct: aim at an object and use it; aim at a surface and place the held block; select the tool from the hotbar. This is a compact example of **selected tool + world target** supplying context. It does not justify copying every binding or using one ambiguous action for every Open Legend object. Construction previews in Open Legend should expose valid placement, orientation and resource cost before a consequential commit; Minecraft's ordinary block placement is evidence for immediacy, not evidence that a complex settlement build needs no preview. [M1]

Mojang documents chat as a temporary input mode: opening it captures typing and stops ordinary looking/movement controls until the message is submitted. Escape opens the game menu and closes it again; controls can be changed and reset in settings. For Open Legend, typing must own its keys, help must show the player's effective bindings, and Back must close the active layer predictably. These are behavioral contracts, not a request to copy the full Minecraft pause screen. [M1]

Additional firsthand feedback qualifies the visual simplicity:

- A December 2023 player request distinguishes fading the HUD from hiding it entirely, asking for stronger opacity control. This supports independent visibility preferences, not a claim that the HUD should always disappear. [M13]
- A March 2025 Bedrock player reports that taking damage closes chat/crafting and loses typed text; a reply describes the same frustration. Treat this as reported behavior in that context, not a verified current universal rule. Open Legend should retain an interrupted draft and explain why interaction stopped. [M14]
- The positive direct-control evidence in M8 and the onboarding criticism in M9 still apply: quick gestures need a discoverable entry and visible help. None of these selected posts establishes a player consensus.

### Additional sources

- **[M11]** Linn Viberg / Mojang, [Everything you need to know about health in Minecraft](https://www.minecraft.net/en-us/article/health-minecraft), 2023-09-22. Primary explanation and original MC07 image.
- **[M12]** Per Landin / Mojang, [Exploring Minecraft](https://www.minecraft.net/en-us/article/exploring-minecraft), 2023-09-22. Primary exploration guide and original MC08 image.
- **[M13]** Minecraft Feedback, [Opacity at 0%](https://feedback.minecraft.net/hc/en-us/community/posts/21886765838733-Opacity-at-0), 2023-12-02. Original player request.
- **[M14]** Minecraft Feedback, [Add option to disable close_on_hurt UI attribute](https://feedback.minecraft.net/hc/en-us/community/posts/34838558217229-Add-option-to-disable-close-on-hurt-ui-attribute), 2025-03-08, reply 2025-03-10. Original reports, not independently reproduced.
