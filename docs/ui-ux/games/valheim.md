# Valheim: world context, storage shortcuts, and the cost of hidden verbs

Research date: **2026-10-03**. Status: comparative research, not an implementation specification. Related Open Legend contracts: [inventory](../inventory.md), [world interaction](../world-interaction.md), [controls](../controls.md), and [chat](../chat-and-invention.md).

## Scope and principal finding

Seven actual screenshots were downloaded without alteration and individually inspected. They show different historical PC builds, including controller use; exact builds are unknown unless a source establishes them. The set includes storage, crafting, construction, input help, unavailable crafting and labeled world storage. Three attractive world-only images were excluded because they did not provide meaningful UI evidence. The [manifest](../screenshots/valheim/manifest.json) records each retained image's source, dimensions and hash.

Valheim provides a useful distinction between **meaningful inventory constraints** and **unnecessary interaction work**. Slot/weight limits can be part of survival play; making players repeatedly choose a destination or rediscover a repair icon is a separate design decision. Its strongest pattern for Open Legend is that a targeted chest or workbench establishes context before the item interface appears. Its weaker patterns include terse icon-only actions, unexplained disabled crafting, and shortcuts whose meaning changes with the open window.

## How the player interacts

| Context          | Visible structure and verified interaction                                                                                                                                                                                                                            | Consequence for design                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Open storage     | Carried inventory above a second storage grid; bulk actions belong to that open storage. Historical player instructions describe Ctrl-click as moving a whole stack between the two, and Shift-click as opening a quantity slider. [V2][V3]                           | The source and destination are established by the open object. Quantity is a small exception interaction. |
| Use a workbench  | Player inventory remains visible; a station-specific pane offers Craft/Upgrade, recipes, selected output information, requirements and an action button. [V4; VH01, VH06]                                                                                             | An activity list does not need to collect the station identity, craft method and all materials first.     |
| Repair equipment | A hammer icon attached to the workbench panel displays “Repair an item” on hover. [VH01, VH06]                                                                                                                                                                        | A very short interaction can still have poor discoverability if its verb looks decorative.                |
| Build            | A hammer-related build palette offers category tabs and piece icons; placement controls are shown over the world. [VH03]                                                                                                                                              | Piece selection and spatial placement are different phases; coordinates need not be typed into a form.    |
| Quick-stack      | The official August 2023 update adds matching-item stacking to the open container and holding Use on a targeted container. A preceding test note describes restoring the one-button action while briefly showing the inventory so the player can see the result. [V1] | Fast action and visible feedback can coexist; convenience need not introduce a destination picker.        |

The August 2023 patch notes also discuss input conflicts involving chat, hotbar actions, building and the console. These are developer evidence that menu focus and game controls require deliberate arbitration. Open Legend should use one clear owner for a keypress when a text field, item panel or placement mode is active. This is a recommendation from that evidence, not proof that all current Valheim conflicts are resolved. [V1]

## Screenshot analysis

### VH01 — Workbench recipe and a repair affordance

![Valheim workbench showing carried inventory, Club recipe, Craft and Upgrade tabs, and repair tooltip](../screenshots/valheim/04-craft-repair.jpg)

**Observed layout and controls.** Carried inventory occupies the upper left, with numbered hotbar cells, equipment/durability markings and numerical load. On the right, **WORKBENCH** has a station-level indicator, **CRAFT / UPGRADE** tabs, a recipe list, selected **Club**, statistics, a wood requirement and **Craft**. A small hammer protrudes from the pane; hovering it reveals **Repair an item**. The world still shows a workbench and an **[E] Use** prompt. [V4]

**Why it works.** The physical station and its action surface are connected. Selecting a recipe exposes the required information without a preceding setup form. The carried inventory remains available for understanding supply.

**Where it struggles.** Repair resembles an ornamental icon until hovered. Detailed combat statistics compete with the immediate recipe cost and action. The screenshot does not teach first-time players what the station-level star means.

**Application to Open Legend.** Opening a known station should immediately present its relevant recipes or services. Use a plainly labeled **Repair** action with eligibility and cost, rather than hiding the principal verb behind a tiny tool icon.

### VH02 — Cart storage with take-all and matching-stack actions

![Valheim carried inventory and cart storage with Take all and Place stacks controls](../screenshots/valheim/05-cart-storage.png)

**Observed layout and controls.** This source-provided cropped image shows the carried inventory above a **STORAGE** grid of three rows of six. **Take all** is at the left of the storage section and **Place stacks** at the right. Both inventory and storage show weight information. There is no container-selection control. [V5]

**Why it works.** Both directions have a visible, scoped action. Similar grids make the relationship easy to understand, and load is displayed near the goods that produce it.

**Where it struggles.** The generic **STORAGE** title does little to distinguish this cart from another container. A cropped source image cannot establish how clearly the targeted cart remains visible in normal play. The screenshot does not explain exactly which items the matching-stack command will affect.

**Application to Open Legend.** Keep the physical object's proper name in the header—such as “Mara's cart”—and use explicit direction in bulk verbs. A transfer preview or short result message should report what moved and what could not fit. This need not be a confirmation dialog for every ordinary item.

### VH03 — Build menu over the world

![Valheim build palette with Misc, Crafting, Building and Furniture tabs and placement controls](../screenshots/valheim/07-build-menu.jpg)

**Observed layout and controls.** A large center grid has **Misc**, **Crafting**, **Building**, and **Furniture** categories with item counts and **Q/E** tab hints. The selected cell is a repair tool. Hotbar, health and the world remain visible. Lower-right hints distinguish placing, removing, opening the build menu, snapping/options and rotation. [V6]

**Why it works.** The palette provides a visual set of buildable shapes; placement remains a world interaction. Its control hints are specific to the active tool rather than a generic list of every possible activity.

**Where it struggles.** Many similar beams and roof pieces demand close inspection. The broad grid can obscure placement context, and repair mixed into a piece palette is not an obvious category choice for a newcomer.

**Application to Open Legend.** Use a compact, searchable piece chooser followed by a world placement preview with validity and cancel feedback. Keep building and repairing distinguishable. Do not request position, orientation and target as mandatory text or dropdown fields when pointing at the world expresses those choices.

### VH04 — Controller help and inconsistent glyphs

![Valheim pause menu with controller mapping diagram and a world interaction prompt](../screenshots/valheim/08-controller-help.jpg)

**Observed layout and controls.** The pause menu shows **Continue, Save, Settings, Logout, Quit**, accompanied by a controller diagram with PlayStation-style face symbols. The world beneath it still displays an Xbox-style **X** use hint. The original screenshot belongs to a player report about controller glyphs, not a general product showcase. [V7]

**Why it works.** A reachable control map can teach an input device without requiring external documentation. Actions are associated with physical buttons.

**Where it struggles.** Conflicting glyph systems undermine that teaching. The screenshot's densely packed alternative mappings are difficult to consult during play. The bug report does not establish the status of later versions.

**Application to Open Legend.** Generate on-screen prompts from the active binding and device family. A contextual prompt, help view and menu label should all name the same action with the same binding. A static illustration is supplementary help, not the authoritative mapping.

### VH05 — Controller crafting with explicit focus and window navigation

![Valheim controller workbench with Torch selected, focus outline and per-action controller hints](../screenshots/valheim/09-controller-crafting.jpg)

**Observed layout and controls.** The left carried inventory and right workbench pane remain in their familiar positions. **Torch** is selected; the active pane has a conspicuous yellow outline. The station shows tab, repair and craft bindings. Footer hints include **Change window**, **Move**, **Use/equip**, **Split stack**, and **Drop**. This comes from the same April 2024 glyph report as VH04. [V7]

**Why it works.** Focus is visible and moving between panes is an explicit action. Item manipulation is possible through focus and buttons rather than dragging. Relevant bindings are available where the player acts.

**Where it struggles.** Several operations use combinations of the same buttons, increasing the learning burden. Drop and split require careful binding design because their consequences differ. The reported glyph mismatch remains a material limitation in this particular capture.

**Application to Open Legend.** Include a keyboard/controller focus route and one-command transfer between open panes. Keep inspection, use/equip and destructive disposal separate. Test hints with the actual active bindings and with rebinding, rather than only checking the default keyboard layout.

### VH06 — An unavailable recipe beside an available repair action

![Valheim Leather tunic recipe with disabled Craft and Repair an item tooltip](../screenshots/valheim/10-workbench-repair-player.jpg)

**Observed layout and controls.** **Leather tunic** is selected at a workbench. A requirement area shows deer hide and a station-level requirement; **Craft** is greyed out. The repair hammer still offers **Repair an item**. The footer explicitly labels mouse move, use/equip, Shift-click split stack, and Ctrl-click drop. This image was supplied in a player discussion asking about repair. [V8]

**Why it works.** The recipe, material requirement and action state sit together. A different valid station service can remain available when crafting is blocked.

**Where it struggles.** The disabled button does not provide an explicit “Missing…” sentence in the screenshot. Players still had to ask about repair. Also, a fast modifier-click is labeled **Drop** here, whereas historical storage instructions describe Ctrl-click transfer with a chest open: context changes a high-frequency gesture's consequence. [V2]

**Application to Open Legend.** Explain the exact blocked reason beside the action. Preserve a pending transfer's meaning if a remote chest closes or becomes invalid; do not reinterpret the same input as dropping the item into the world. This recovery behavior is an Open Legend requirement inferred from the risk, not behavior demonstrated in this screenshot.

### VH07 — Player-labeled storage in the world

![Valheim storage room with category signs above chest rows and the normal world HUD](../screenshots/valheim/11-storage-signs.jpg)

**Observed layout and controls.** The normal world HUD remains visible around a room of chests. Signs identify categories such as leather, trophies, bones and feathers. There is no open inventory window. This is included for object discovery and spatial memory, not counted as a second image of an open chest. [V9]

**Why it works.** The player can find a destination by its location and visible label before opening it. Storage becomes part of the inhabited world.

**Where it struggles.** Closely packed signs are hard to read and require manual upkeep. Labels can become stale if contents change. This frame does not provide a strong selection outline identifying one chest among adjacent objects.

**Application to Open Legend.** Let players name storage, reveal that same identity in world focus and the open header, and clearly highlight the targeted object. Labels and optional organization tools should reduce future effort without becoming chores required to use a basic chest.

## Player evidence: praise, friction, and differing goals

| Original evidence                                                                                                                                                                                     | Finding                                                                                                         | Interpretation boundary                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Iron Gate's August 2023 test note explicitly acknowledges adverse player reaction to a quick-stack change and describes restoring a single held-use interaction with visible inventory feedback. [V1] | Players cared about both action count and seeing the result.                                                    | Developer-reported feedback, not a published survey; concerns one historical change. |
| In a September 2025 “Inventory Space” discussion, some players object to armor consuming regular slots; others defend inventory planning and point to carts/ships and flexible slots. [V10]           | Capacity constraints themselves divide players; optimizing clicks does not decide the survival-design question. | A selected Steam thread with opposing opinions, not representative consensus.        |
| A 2021 original mod guide and its comments praise conveniences such as easier container inspection and reduced storage handling. [V11]                                                                | Some players actively seek less repetitive logistics work.                                                      | This is praise for **mods**, not proof those features are standard Valheim behavior. |
| A January 2023 repair discussion supplies VH06, while the April 2024 controller report supplies VH04–VH05. [V7][V8]                                                                                   | Concrete repair-discoverability and binding-label problems can survive within an otherwise coherent layout.     | Individual reports tied to their dates and versions.                                 |

## Recommendations for Open Legend

- **Adopt:** selecting the actual object in the world; a stable carried inventory beside context-specific contents; direct transfer and useful bulk actions; visible controller focus; station-specific recipes.
- **Improve:** name the target, expose important verbs in text, explain unavailable actions, and keep binding hints close to their controls.
- **Do not import by accident:** hidden repair buttons, ambiguous icon categories, generic storage titles, unexplained “nearby” eligibility, or a shortcut that becomes disposal when a destination disappears.
- **Keep as separate game-design questions:** capacity, weight, equipment consuming storage slots, and whether supplies can be used remotely. Removing interaction friction does not require removing these constraints.

These findings support revising the interaction contract before changing layout styling. A prettier generic activity form would preserve the same unnecessary decisions.

## Sources and provenance

- **[V1]** Iron Gate, [official Steam announcement archive around Patch 0.217.14, Hildir's Request, 2023-08-22](https://store.steampowered.com/news/posts/?appids=892970&enddate=1693393302&feed=steam_community_announcements). Also contains the preceding 0.217.13 test notes. Primary evidence for quick-stack revisions and input fixes.
- **[V2]** Steam Community, [original stack-transfer discussion](https://steamcommunity.com/app/892970/discussions/0/3112542578509313079/), 2021-10. Historical Ctrl-click and Shift-click descriptions.
- **[V3]** Steam Community, [moving one item / stack-splitting discussion](https://steamcommunity.com/app/892970/discussions/0/4521135641318827088/), 2024-07. Original player explanations of the quantity interaction.
- **[V4]** Brendan Lowry, Windows Central, [Valheim workbench guide](https://www.windowscentral.com/valheim-workbench-guide-how-build-upgrade-and-use-repairs), 2021-02-17. Source for VH01 and station workflow.
- **[V5]** Gamever, [How to make a cart in Valheim](https://gamever.io/knowledge-base/how-to-make-a-cart-in-valheim), 2024-05-era asset. Source for VH02; its original crop is preserved.
- **[V6]** GamesRadar+, [Valheim Hearth and Home tar pits, darkwood and furniture](https://www.gamesradar.com/valheim-hearth-and-home-tar-pits-darkwood-furniture/). Source for VH03; historical Hearth and Home interface.
- **[V7]** Ferox_Stormdragon, [original controller-glyph report](https://steamcommunity.com/app/892970/discussions/1/4361248897893832253/), 2024-04; screenshots [VH04](https://steamcommunity.com/sharedfiles/filedetails/?id=3227775644) and [VH05](https://steamcommunity.com/sharedfiles/filedetails/?id=3227777540).
- **[V8]** Steam Community, [Repair station?](https://steamcommunity.com/app/892970/discussions/0/3763353911872956786/), 2023-01; [VH06 screenshot](https://steamcommunity.com/sharedfiles/filedetails/?id=2915973134).
- **[V9]** Steam Community, [Signs on Chests](https://steamcommunity.com/app/892970/discussions/0/3073117690256473950/), 2021-03; [VH07 screenshot](https://steamcommunity.com/sharedfiles/filedetails/?id=2432979999).
- **[V10]** Steam Community, [Inventory Space](https://steamcommunity.com/app/892970/discussions/0/601916423125718082/), 2025-09-24. Original discussion with conflicting preferences.
- **[V11]** YITT, [5 Best Mods That Will Improve Your Gameplay](https://steamcommunity.com/sharedfiles/filedetails/?id=2437731501), 2021-03-27, and original player comments. Modded convenience evidence only.

The screenshots are third-party reference material for research and criticism. Original rights remain with the game creators and relevant image authors; these are not Open Legend production assets and are not relicensed by the repository's code license.
