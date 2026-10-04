# Baldur's Gate 3: inventory, objects, actions, and conversation

This dossier studies **twelve distinct, saved UI screenshots** and the interactions around them. The strongest transferable pattern is that the player acts on an item, character, or world object first. That context supplies the subject and usually the destination of the operation. The game then asks for the remaining meaningful choice. BG3's inventory also has documented usability problems; its popularity is not evidence that every inventory decision is good.

This is empirical research and design analysis. The enduring Open Legend decisions belong in [Inventory](../inventory.md), [World interaction](../world-interaction.md), [Controls](../controls.md), and [Chat and invention](../chat-and-invention.md). The wider evidence register is [Research](../research.md). Recommendations below are inputs to those documents, not a second UI specification.

## Evidence and limits

Research accessed **2026-10-04**. Every local image below was opened and visually inspected. These are real third-party screenshots, not generated mockups. Original downloaded bytes, aspect ratios, source watermarks, and source-supplied crops are preserved. The [machine-readable manifest](../screenshots/bg3/manifest.json) records source page, original image URL, dimensions, SHA-256, source date where known, inspection status, and image-specific findings.

The examples span launch-era desktop UI, September 2024 Mac/PS5 comparisons, and screenshots whose precise build is unknown. They are **not a claim about every current build**. In particular, Larian's [Patch 6 notes](https://baldursgate3.game/news/patch-6-now-live_108) describe a trade redesign with party-wide inventory, clearer trading-character information, and camp chest integration into Camp Inventories. [Patch 7](https://baldursgate3.game/news/patch-7-now-live_121) subsequently adjusted controller search, comparison tooltips, selection visibility, and invalid-throw feedback. Historical screenshots remain useful because their dates and limits are explicit.

Three kinds of statement are distinguished throughout:

- **Visible:** an observation from the saved image, including labels, arrangement, and legibility.
- **Documented interaction:** a guide, developer explanation, or player account establishes what an action does. A static screenshot cannot establish drag behaviour, input latency, a hidden shortcut, or server rules.
- **Application:** our design inference for Open Legend. It is not a claim that BG3 implements the proposal.

No hands-on playthrough or user study was performed for this dossier. The supplied screenshots give broad UI coverage but do not include a saved split-stack dialog, an expanded search dropdown, or a live drag operation; those interactions are documented separately rather than invented from an image.

## What the player actually does

### Inventory and a chest are concrete places

The [BG3 container reference](https://bg3.wiki/wiki/Containers) distinguishes physical world containers from portable containers such as bags. The container is an object with contents. The screenshot in BG3-05 shows the essential result: the player's equipment and bag remain on the left while a **named Traveller's Chest** occupies the right. The destination is already present in the player's view.

For Open Legend, that is the important change in interaction model. After the player deliberately opens a chest, a transfer should derive its destination from that open chest. Asking the player to choose it again from an unrelated list adds no decision. A list filtered by an unexplained distance also hides the reason a world object cannot be used. Reach, ownership, locks, visibility, and capacity can remain real gameplay constraints while being explained at the object where the player encounters them.

The grid is a visual organization device. Equal-sized icon cells in these images do not demonstrate a physical volume simulation or a requirement to reproduce a particular number of slots. Open Legend should choose capacity rules from its own world model, then display those rules honestly.

### Commands belong to the selected item

BG3-04 shows a context menu on dye. Its options include using the dye through Combine, splitting a stack, throwing, dropping, marking wares, and sending the item to a named companion. The item supplies context before the player chooses a verb. The recipient submenu is an optional shortcut on an already selected object; it is not a mandatory destination form for every action.

The [default bindings reference](https://bg3.wiki/wiki/Options) documents `I` for an individual inventory, `Tab` for party view, right-click for a context menu, `T` for examination, and Escape for cancelling or closing. These are BG3 reference controls, **not proposed Open Legend rebinding decisions**.

The relevant transfer controls need their context stated explicitly:

| Control                                   | Documented function           | Context and limit                                                                                                                                       |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Space` with a container interface active | Take All Items from Container | A bulk collection command. The same key also has Skip and End Turn functions in other contexts; it is not a global transfer command.                    |
| Hold `Shift`                              | Split-item-stack modifier     | This is the documented split modifier, not evidence of a universal Shift-click transfer shortcut. The focused Split Item menu route is described below. |
| Right-click an item                       | Open its context menu         | Reveals applicable commands, including named recipients where available. Opening the menu does not itself move the item.                                |

The sources inspected here do not establish a universal default quick-deposit modifier. Individual drag transfers are documented separately below. Open Legend's proposed non-drag transfer command should therefore be identified as our design decision, rather than attributed to an unverified BG3 shortcut.

[Twinfinite's recorded split workflow](https://twinfinite.net/guides/how-to-split-items-in-inventory-in-baldurs-gate-3-bg3/) describes choosing Split Item from the selected stack, setting a quantity in the resulting slider, and receiving a separate stack. It also documents transfers by dragging to a companion portrait or inventory. Quantity is therefore a focused secondary decision when the player needs it. It does not need to be a compulsory field before moving one ordinary item.

### An ability changes the next interaction

The throw selector in BG3-08 exposes candidate items after Throw has been chosen. The next task is to choose what to throw; selecting the world target is a subsequent step, absent from this crop. The [Throw reference](https://bg3.wiki/wiki/Throw) documents that throwable candidates can include inventory items and world entities, with physical eligibility constraints.

Larian's [PS5 interface explanation](https://blog.playstation.com/?p=383943&sf268739969=1) describes a controller-specific interface: a main radial for major tools, customizable action radials, direct character movement, a cursor mode, and tactical camera control. That is evidence for adapting presentation to the input device. It does not establish that multiple full wheels are the best Open Legend action picker.

For Open Legend, a selected action should change the cursor, eligible targets, and concise instruction at the point of play. “Choose an item to throw” followed by “Choose a target” is understandable because each step concerns a concrete missing choice. A generic activity dialog asking for actor, item, target, container, position, quantity, and other schema fields makes the player reconstruct context the interface already knows.

### Some activities do need a small, specific panel

The alchemy screen in BG3-07 starts with a recipe result, shows material requirements, and offers a quantity plus a craft action. The dye panel in BG3-09 needs a second object: the armour to recolour. These are legitimate decisions. Their existence does not justify giving every verb the same large form.

The [alchemy reference](https://bg3.wiki/wiki/Alchemy) explains that recipes can combine a specific extract with another extract from a generic category. That creates a real material-selection issue: an automatically chosen component could also be valuable for another recipe. For Open Legend, a known recipe can prefill eligible tools and materials while naming exactly what will be consumed and allowing the player to change a meaningful alternative. Convenience should remove repeated setup while preserving informed resource decisions.

## Player and reviewer evidence: praised aspects and failures

These are individual accounts, not a representative survey or an overall approval score.

| Source and context                                                                                                                         | What the person liked or disliked                                                                                                                                                                                   | What it supports for Open Legend                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OvenFearless, launch-period controller discussion](https://www.reddit.com/r/BaldursGate3/comments/15hbahl/controller_support_is_amazing/) | Praised the adapted menus and direct character movement. Other participants found radial navigation comfortable; others found it cumbersome or could not locate inventory.                                          | Offer an interface appropriate to the input device, but test discoverability of major destinations and action targeting. Positive controller sentiment is not evidence that every wheel is clear. |
| [Ash Parrish, firsthand PS5 technical review, 13 September 2023](https://www.theverge.com/23861883/baldurs-gate-3-ps5-technical-review)    | Reported difficulty reading the inventory at TV distance and accidentally selling equipped clothing because its equipped marker was easy to miss.                                                                   | Make equipped and protected states readable before a destructive or transactional command. Evaluate at actual viewing distance.                                                                   |
| [Bill, Mac/PS5 comparison, 9 September 2024](https://argothald.com/2024/09/09/bg3-on-the-mac/)                                             | Criticized inventory burden and the growing controller radial interface.                                                                                                                                            | Treat late-game item and action counts as a design condition rather than reviewing only an almost empty inventory.                                                                                |
| [Larian forum discussion, 9–10 September 2023](https://forums.larian.com/ubbthreads.php?Number=895204&ubb=showflat)                        | Several participants objected to repeated sorting, inconsistent categorization, and bag management. Another valued personally assigning supplies and argued that automatic handling could obscure material purpose. | Remove repetitive transfer chores while keeping ownership, preparation, and resource consequences visible. “Automatic” is not automatically more understandable.                                  |

The positive evidence is specific: controller adaptation and direct interaction are valued by some players. There is no defensible basis here for calling BG3's entire inventory universally praised. The critical evidence is equally specific and informs what **not** to carry over.

## Screenshot atlas

All screenshots are third-party reference material for criticism and design research. Larian Studios, Wizards of the Coast, the source authors, and other relevant rights holders retain their rights. They are not Open Legend game assets and are not offered under the repository's software licence.

### BG3-01 — One character: equipment next to carried items

![BG3-01: Astarion's equipment, character details, and icon inventory next to the visible game world](../screenshots/bg3/BG3-01-single-inventory.jpg)

**Provenance:** [Source article](https://argothald.com/2024/09/09/bg3-on-the-mac/) · [Original image](https://argothald.com/wp-content/uploads/2024/09/Just-Astarion-2048x1152.jpg). Mac, keyboard and mouse; article published 9 September 2024. Exact capture date and patch unverified. Accessed 2026-10-04.

**Visible.** Character information and equipment sit left of the bag grid. A query/filter area and sort control sit above items; carried weight sits below. The world, minimap, portraits, and hotbar remain visible around the panel.

**Workflow and button meaning.** The [interface guide](https://www.gamepressure.com/baldurs-gate-iii/interface/zad9f7) identifies the three top tools; the [default bindings reference](https://bg3.wiki/wiki/Options) supplies their keyboard shortcuts:

| Top icon, left to right             | Function                                             | Default keyboard shortcut |
| ----------------------------------- | ---------------------------------------------------- | ------------------------- |
| Helmet, selected in this screenshot | Inventory and equipment: carried items and worn gear | `I`                       |
| Open book                           | Spellbook: inspect and manage the character's spells | `K`                       |
| Flask                               | Alchemy: browse and craft alchemical recipes         | `H`                       |

The magnifying-glass field searches items; the nearby list-and-arrow control sorts them. The grid supplies items for inspection or context actions. The exact open dropdown choices are not visible here, so no unseen options are inferred.

**Strength.** The spatial distinction between worn and carried items can make “What am I using?” easier to answer. The bag does not need to replace the whole world.

**Weakness.** Character statistics and a large paper doll consume space even when the task is simply locating a potion. Small icon cells create a recognition burden when many similar items accumulate.

**Open Legend application.** Give the player a readable carried-items grid and distinct equipment slots. Make expanded statistics an intentional secondary view. Show names on focus and support a readable list alternative where small artwork is insufficient. Keep this structure stable when a chest opens beside it.

### BG3-02 — Party inventories and a named equipment tooltip

![BG3-02: Four character inventories with a Leather Boots tooltip naming the equipped owner](../screenshots/bg3/BG3-02-party-inventory.jpg)

**Provenance:** [Source article](https://argothald.com/2024/09/09/bg3-on-the-mac/) · [Original image](https://argothald.com/wp-content/uploads/2024/09/The-party-2048x1152.jpg). Mac, keyboard and mouse; September 2024 publication, exact build unknown. Accessed 2026-10-04.

**Visible.** Four columns combine paper dolls, bags, and individual capacity meters. The selected boots tooltip identifies Astarion as wearer and shows an Inspect prompt. Repeated character illustrations leave shallow inventory areas.

**Documented interaction.** Party view provides visible companion destinations. The transfer guide linked above documents dragging into another inventory or onto a portrait. A screenshot of adjacent columns alone would not prove that gesture.

**Strength.** A player can inspect a source and a potential recipient in one view. Naming the wearer in the tooltip reduces ambiguity about whose equipment is being compared.

**Weakness.** Four simultaneous paper dolls consume most of the screen; a large tooltip covers adjacent owners. Displaying everything together can become a new searching problem.

**Open Legend application.** Show the player and the deliberately opened destination together. Additional inventories should appear because the player intentionally opened them and has permission to see them. This is not an argument for exposing every nearby NPC's private possessions or automatically assembling a global inventory.

### BG3-03 — Controller inventory and the equipped-state problem

![BG3-03: PS5 inventory with multiple stacked owners on the left and one selected paper doll on the right](../screenshots/bg3/BG3-03-controller-inventory.jpeg)

**Provenance:** [Source article](https://argothald.com/2024/09/09/bg3-on-the-mac/) · [Original image](https://argothald.com/wp-content/uploads/2024/09/PS5-Inventory-screen.jpeg). PS5 controller UI, September 2024 publication, exact build unknown. Accessed 2026-10-04.

**Visible.** Several named inventories are stacked left of one selected paper doll. Tabs and footer prompts expose controller navigation, filters, tooltips, and close. Small blue marks identify equipped items in the grid.

**Source correction.** The article's prose implies that controller users cannot see multiple characters' inventories. This screenshot visibly contains multiple inventory sections. The difference shown is simultaneous equipment-paper-doll presentation, not the complete absence of party inventory access. The image is stronger evidence for its own layout than that broad sentence.

**Strength.** Persistent button prompts help a player understand the current input mode without recalling a separate controls screen.

**Weakness.** Equipped state competes with tiny icon details. The PS5 review cited above makes the consequence concrete: mistakenly selling worn equipment.

**Open Legend application.** Use a clearly legible “Equipped” label or sufficiently prominent symbol plus accessible text. Protect selection state from being confused with transfer or sale state. Preserve the same ownership and action model across devices, even when its layout changes.

### BG3-04 — An item-specific context menu

![BG3-04: Dye selected in inventory with Combine, Split Item, Drop Item, Throw, and recipient commands](../screenshots/bg3/BG3-04-context-menu.jpg)

**Provenance:** [Ty Galiz-Rowe's dye guide](https://gaymingmag.com/2023/08/how-to-dye-clothes-and-armor-in-baldurs-gate-3/) · [Original image](https://gaymingmag.com/wp-content/uploads/2023/08/dye-menu.jpg). Desktop, keyboard and mouse; published 10 August 2023, exact build unknown. Source-supplied crop retained. Accessed 2026-10-04.

**Visible.** The menu belongs to a dye item. It offers Combine, Split Item, Drop Item, Throw, hotbar placement, wares, camp, named recipients, and examination. Section headings group some commands.

**Documented interaction.** The accompanying guide confirms that Combine on dye opens the operation shown in BG3-09. The selected item is carried forward into that operation.

**Strength.** The player begins with something tangible, then sees applicable verbs. Named quick recipients are useful when the intention is already “give this item to that companion.”

**Weakness.** A long flat menu mixes inspection, organization, use, and destructive movement. “Combine” is a general system verb when “Dye…” would explain the outcome more directly.

**Open Legend application.** Right-clicking or invoking the accessible action menu on an item should offer its concise useful verbs. “Move to Oak Chest” can be a quick action while Oak Chest is open. It should not require a second destination picker after the player has already established that context. Group Drop away from harmless inspection and do not make every possible engine action equally prominent.

### BG3-05 — Player bag and open chest

![BG3-05: Character inventory at left and a named Traveller's Chest grid at right](../screenshots/bg3/BG3-05-open-chest.png)

**Provenance:** [Source page](https://scalacube.com/blog/baldurs-gate-3/travellers-chest-in-baldurs-gate-3) · [Original image](https://res.cloudinary.com/ddbybfkod/image/upload/v1754587925/blogs/Nemanja/travellers-chest-in-baldurs-gate-3/img2_iyo7qm.png). Desktop UI; capture date, build, and modification status unverified. Accessed 2026-10-04. The commercial article is used as an image source; its broader mechanics claims are not relied upon.

**Visible.** Two simultaneous panels expose player inventory and Traveller's Chest. Each has its own grid and close control. The chest has a name, sorting controls, and scrolling; the player's capacity remains visible.

**Workflow.** The [container reference](https://bg3.wiki/wiki/Containers) confirms storage and retrieval as container functions. This image documents the paired layout, not a precise reach threshold or the implementation of a transfer gesture.

**Strength.** Source and destination are persistent places in the UI. The player's intention does not have to be translated into a form. Closing the destination has an obvious local control.

**Weakness.** Much of the chest grid is empty, and the supplied resolution makes small text harder to read. A huge grid alone is not evidence of good capacity communication. The screenshot does not justify importing unlimited camp storage or remote item transport into another game.

**Open Legend application.** Activating a world chest should open **Your inventory | Oak Chest** with transfers in either direction. Support dragging and a non-drag transfer command. Show the actual object's accessibility where it matters: “Locked,” “Move closer,” or another server-confirmed reason. If reach is lost while open, explain it in that panel instead of silently removing a container from a list.

### BG3-06 — Controller action radials

![BG3-06: Three controller action wheels, resource counters, customization, and close prompts over the world](../screenshots/bg3/BG3-06-radial-actions.jpeg)

**Provenance:** [Source article](https://argothald.com/2024/09/09/bg3-on-the-mac/) · [Original image](https://argothald.com/wp-content/uploads/2024/09/Radial-display-2.jpeg). PS5, September 2024 publication; exact build unknown. Accessed 2026-10-04.

**Visible.** Three wheels expose many action icons. The active central wheel is larger. Shoulder navigation, select, customization, concentration, weapon-set, and close prompts remain visible, with action and movement resources below.

**Documented interaction.** Larian's [controller explanation](https://blog.playstation.com/?p=383943&sf268739969=1) confirms that action radials can be customized, including adding or removing menus. The visible resource counters help situate a selection within the current turn.

**Strength.** A directional selector can provide large targets for a controller while leaving the world visible. A customization route acknowledges that the most useful actions differ by player and character.

**Weakness.** Several wheels of unlabeled icons impose search and memorization costs. A large catalogue can consume almost as much attention as a form. The positive player thread also contains reports of confusing transitions from Throw to world targeting.

**Open Legend application.** Keep frequent actions stable and quickly accessible. Selecting an ability should reveal only the next necessary choice and a clear way to cancel. Do not assume a radial is inherently playful or that copying three wheels would solve the current activity menu.

### BG3-07 — Recipe-led alchemy

![BG3-07: Alchemy categories, selected elixir, material counts, quantity, and craft controls](../screenshots/bg3/BG3-07-alchemy.png)

**Provenance:** [BG3 Wiki image page](https://bg3.wiki/wiki/File:Alchemy_window.png) · [Original image](https://bg3.wiki/w/images/6/67/Alchemy_window.png). Desktop UI, source-supplied crop; capture date and patch unknown. Accessed 2026-10-04.

**Visible.** Recipe categories occupy the left. The selected Elixir of the Colossus has a material diagram on the right, including one specific salt and any suspension, with available/required counts. Controls include a craftable-only filter, amount, Craft Item, Craft All Items, and Extract All Ingredients.

**Documented interaction.** The [alchemy reference](https://bg3.wiki/wiki/Alchemy) describes extraction and recipe crafting. The ingredients and product shown are a specific recipe, not arbitrary fields on a universal action object.

**Strength.** The desired result, availability, and final action are present together. A player can understand why a recipe is possible before committing materials.

**Weakness.** “Any suspension” conceals a consequential substitution unless the specific consumed component is inspectable. “Craft all” can be a large material commitment even though it is visually adjacent to ordinary crafting.

**Open Legend application.** Known recipes should start from the desired output, preferably in the context of the selected station or tool. Prefill unambiguous requirements; expose concrete materials and quantities; allow meaningful substitution without making it compulsory. Show missing resources inline. Keep world legality, tool requirements, and knowledge limits authoritative.

### BG3-08 — Throw exposes eligible items at the hotbar

![BG3-08: Throw item selection replaces part of the hotbar with throwable inventory candidates](../screenshots/bg3/BG3-08-throw-target-selection.png)

**Provenance:** [BG3 Wiki image page](https://bg3.wiki/wiki/File:Throw_UI_Inventory_Menu.png) · [Original image](https://bg3.wiki/w/images/8/85/Throw_UI_Inventory_Menu.png). Desktop, source-supplied UI crop; capture date and patch unknown. Accessed 2026-10-04.

**Visible.** A Throw-labelled selector contains item icons with stack counts. It has a close control and sits within the hotbar area near action resources. **The world target preview is not shown.**

**Workflow.** The player has chosen Throw and is selecting the thrown object. The [action reference](https://bg3.wiki/wiki/Throw) establishes the wider action and eligibility rules. We cannot infer which item is hovered, a predicted arc, or a hit probability from this crop.

**Strength.** Available items become the immediate vocabulary of the chosen action. An irrelevant recipe selector or container list is not present.

**Weakness.** Without a selected name or explicit instruction, icons alone can make the current step ambiguous. A player who means to throw a world object also needs a discoverable path back to world targeting.

**Open Legend application.** Keep the instruction literal: “Choose something to throw,” then “Choose a target.” Show eligible world objects alongside an inventory option when the game supports both. Maintain inspect versus commit distinctions and support Escape at the current step. A short sequence of tangible choices is preferable to reconstructing the whole action in one form.

### BG3-09 — Focused dye combination

![BG3-09: A small Combine Items window with dye and armour slots beside the player's inventory](../screenshots/bg3/BG3-09-combine.jpg)

**Provenance:** [Dye guide](https://gaymingmag.com/2023/08/how-to-dye-clothes-and-armor-in-baldurs-gate-3/) · [Original image](https://gaymingmag.com/wp-content/uploads/2023/08/dye-combine.jpg). Desktop, 10 August 2023 article; exact build unknown. Source crop preserved. Accessed 2026-10-04.

**Visible.** A focused Combine Items panel contains two input slots, a result area, Combine, and Close. The inventory remains beside it. This is a different operation state from BG3-04, not a duplicate crop.

**Documented interaction.** The guide describes choosing Combine on dye, placing armour into the remaining slot, then committing. The first item is retained from the initiating context.

**Strength.** One missing object is requested in the place where it is needed. The player does not re-enter the actor, action, and already selected dye.

**Weakness.** The verb is vague and the visible panel does not preview the final appearance. Two generic slots would be a poor template for unrelated actions with different semantics.

**Open Legend application.** Retain context across steps and name the actual operation, such as “Apply dye.” Ask for a second object only when the action needs one. Preview the known effect and consumption. This pattern should reduce a specific choice, not become a reskinned universal activity form.

### BG3-10 — Trade is a distinct transaction

![BG3-10: Launch-era Trade view with character stock, merchant stock, identities, and separate gold totals](../screenshots/bg3/BG3-10-trading.jpg)

**Provenance:** [Dye guide](https://gaymingmag.com/2023/08/how-to-dye-clothes-and-armor-in-baldurs-gate-3/) · [Original image](https://gaymingmag.com/wp-content/uploads/2023/08/buying-dye.jpg). Desktop, August 2023, predating Patch 6's trade redesign. The source crop omits the bottom of the interface. Accessed 2026-10-04.

**Visible.** Trade/Barter sits above player and merchant stock. The merchant is named Quartermaster Talli. Separate currency totals and category icons establish two parties; rarity frames and stack numbers distinguish goods.

**Version limit.** Larian's [Patch 6 notes](https://baldursgate3.game/news/patch-6-now-live_108) document later changes. This image cannot support a claim about the complete current transaction footer or present-day party switching.

**Strength.** The inventory pattern carries over to commerce while identifying the counterpart. The player can compare what they own with what the merchant offers.

**Weakness.** Prices are not printed on each visible cell; the source crop cannot show how final cost and acceptance are communicated. Copying only the paired grids would omit the essential transaction model.

**Open Legend application.** Reuse item presentation across bags, chests, and trade, but give trade an explicit counterparty, price or offered exchange, and commit action. A chest transfer should not inherit an unnecessary purchase-confirmation workflow. A sale should not silently behave like a harmless rearrangement.

### BG3-11 — Comparison names the wearer and shows consequences

![BG3-11: Gontr Mael loot tooltip compared against equipped Spellthief, including an encumbrance warning](../screenshots/bg3/BG3-11-equipment-comparison.png)

**Provenance:** [Gamer Guides longbow reference](https://www.gamerguides.com/baldurs-gate-3/database/weapons/longbow) · [Original image](https://www.gamerguides.com/assets/media/15/17482/image%20_6_-5c7fb507.png). Desktop; capture date and patch unverified. Original watermark and full image retained. Accessed 2026-10-04.

**Visible.** A loot pane and two detailed cards compare Gontr Mael with Spellthief. The equipped card names its wearer. Damage, effects, proficiency-related information, weapon properties, weight, value, and a warning that the candidate will encumber the character are visible.

**Workflow.** A candidate can be inspected in the context of the selected character's current equipment. The `T Inspect` prompt indicates a route to deeper reading. Larian's [Patch 7 notes](https://baldursgate3.game/news/patch-7-now-live_121) separately confirm controller comparison toggling and layout fixes; this desktop image is not evidence of controller input.

**Strength.** Comparison goes beyond a single larger damage number. Naming the wearer and exposing encumbrance helps the player judge the actual decision.

**Weakness.** Tall cards overlap the loot interface and world. Many effects demand reading before a simple pickup, and two large cards can make the underlying selection hard to track.

**Open Legend application.** Offer comparison intentionally, anchored to a named equipped item or slot. Separate primary properties from expandable detail. Show known carry consequences near the transfer. Avoid inventing a universal “better gear” score when an item's use depends on the player's plan.

### BG3-12 — Conversation belongs to a character in the world

![BG3-12: Wrint Sprigley speaking in a cinematic conversation with subtitle and lower-left utility icons](../screenshots/bg3/BG3-12-dialogue.png)

**Provenance:** [Official Community Update 22](https://baldursgate3.game/news/community-update-22-wield-the-power-of-a-mind-flayer_75) · [Original image](https://lh6.googleusercontent.com/a3-nHQ9SN8pxF0POP_1CGqoWxwdY7tWO2bHNeV6_N06XYVQXDTRhjenRtpivAvKBeKJxCK_Tz2b3zk6RwIF-05_I75_15AjpuRk1GRrWxpo4klQbXRhZ9DhRUn1oJvaatgY6LznVkPs9bNsqgCJI98E). Official July 2023 pre-release material, desktop UI; exact capture date unknown. Source extension was misleading; the saved `.png` matches its actual bytes. Accessed 2026-10-04.

**Visible.** A named NPC and the scene dominate the screen. Current speech appears as a subtitle. Four utility icons occupy the lower left. There are no response choices in this particular frame.

**Documented interaction and exact icon map.** Larian's update describes conversation history, the initiating character's role, and multiplayer participation with visibility exceptions. The visible utility row maps as follows:

| Position, left to right | Visible symbol        | Function and consequence                                                                               |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 1                       | Horizontal menu lines | Open the game menu. This is a system-menu control, not a dialogue response.                            |
| 2                       | Hand with coins       | Open trade with the current NPC when available. It does not immediately buy or sell anything.          |
| 3                       | Crossed weapons       | Initiate an attack against the character being addressed; this is a gameplay action with consequences. |
| 4                       | Scroll/document       | Open the current dialogue's history to reread the conversation.                                        |

**Verification.** Menu and History were visually matched to the [original interface illustration](https://eip.gg/wp-content/uploads/2023/08/Baldurs-Gate-3-Tips-Tricks-Dialogue-Buttons.jpg) and descriptions in [EIP's gameplay UI guide](https://eip.gg/bg3/guides/tips-tricks/). The [firsthand PC Gamer report](https://www.pcgamer.com/psa-you-can-trade-with-lots-of-baldurs-gate-3-npcs-who-arent-traders/) documents trading and attacking from this utility row. Its trade function depends on availability; the current frame alone cannot establish whether a click is enabled during this exact spoken line.

Character Select is another documented dialogue utility, allowing control of a companion outside the conversation while the original speaker remains engaged. Its portrait-shaped button is visible in the EIP reference but **absent from BG3-12's four-icon row**. It must not be assigned to the menu-lines icon. The comparison illustration was inspected for verification and is not added to the screenshot count.

**Strength.** The conversation clearly belongs to a particular person. Utilities are available without turning the conversation into a list of backend operations.

**Weakness.** Small unlabeled utilities are easy to overlook. A cinematic dialogue interface also differs substantially from Open Legend's freeform conversation needs; the screenshot supplies no evidence for a text composer.

**Open Legend application.** Ground chat in the selected NPC's identity, current interaction, and readable history. Keep a focused freeform composer, preserve drafts, and make any action chips genuinely optional. Do not import scripted response constraints, camera takeover, or multiplayer knowledge sharing merely because they exist in BG3. Follow the existing [chat ownership and privacy rules](../chat-and-invention.md).

## Control and layout findings to carry into review

| Player intention          | Useful reference pattern                                   | Decision for Open Legend review                                                                     |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Open a chest              | World object leads to a named contents grid; BG3-05        | The object establishes the destination. Reach/access failures belong to that object and open panel. |
| Move an item              | Source and destination coexist; BG3-02/05                  | Direct transfer plus a non-drag command; no compulsory container re-selection.                      |
| Move part of a stack      | Item context opens a quantity decision; split guide        | Default ordinary transfers sensibly; expose split quantity only when requested.                     |
| Equip or compare          | Worn slots and named comparison target; BG3-01/11          | Make equipment state conspicuous and comparison contextual.                                         |
| Perform an action         | Verb narrows the next candidates; BG3-08                   | Ask only for the missing object or world target; maintain cancellation and clear input ownership.   |
| Craft a known result      | Recipe, concrete requirements, quantity, commit; BG3-07    | Remove repeated setup while preserving material choices and costs.                                  |
| Experiment with two items | Initiating item carries into a small operation; BG3-09     | A specific second-object choice is legitimate; a universal form is not the default.                 |
| Trade                     | Named counterparty and inventories; BG3-10                 | Separate browsing, offer/cost, and commitment from simple storage transfers.                        |
| Talk                      | Named character, current speech, available history; BG3-12 | Preserve world context and conversation continuity; adapt to freeform chat.                         |

The proposed Open Legend improvement is therefore not merely a different skin. It changes where an interaction begins, what context is retained, what the player must decide, and how the result returns to the world. The visual references support that direction while their failures warn against small state markers, uncontrolled panel density, invisible shortcuts, and compulsory bag administration.
