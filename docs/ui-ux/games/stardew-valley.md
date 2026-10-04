# Stardew Valley: recognizable chests, quick organization and station context

[UI/UX handbook](../README.md) · [Inventory guidance](../inventory.md) · [World interaction](../world-interaction.md) · [Screenshot manifest](../screenshots/stardew-valley/manifest.json)

## Scope, evidence and version baseline

Research began **2026-10-03** and was finalized **2026-10-04**. The original five images were individually inspected and traced to players' posts. The whole-interface expansion adds a wiki skills capture and an original Android map capture: **seven saved images, six digital screenshots and one photograph of the game display**. The photograph is supporting evidence and is excluded from digital-screenshot totals. They cover a 2021 inventory, a 2022 chest, and three April 2024 **1.6-era** screens. Exact patches and platforms are recorded where the authors supplied them; unspecified details remain unknown. Several captures accompany bug reports, which are identified explicitly. No current game executable or controller was tested.

**Observed** means visible in the saved image. **Documented** means supported by a linked game guide or the original player's account. **Assessment** and **Application** are our design analysis and proposed Open Legend use. Third-party game imagery retains its original rights and is stored for reference only; it is not licensed Open Legend game art.

Stardew is relevant to Open Legend's ordinary life: players repeatedly bring things home, put things away, prepare food, use tools and interact with people. Its useful lesson is how much routine work can follow from a clear object interaction. Its weaknesses include obscure shortcuts, ambiguous icon states, and the cost of searching many separate chests.

## What the player actually does

| Intention                 | Documented interaction                                                                                                                      | What establishes context                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Put items away            | Approach a placed chest and interact with it; the chest's grid opens above the backpack grid. Move items between these visible collections. | The particular chest in the world is already the destination.                         |
| Restock an existing chest | Use **Add to Existing Stacks** to deposit backpack items that match existing chest stacks.                                                  | The open chest bounds the bulk action.                                                |
| Organize                  | Use the separate **Organize** button.                                                                                                       | Sorting and transferring are different intentions.                                    |
| Take a partial stack      | Right-click selects one; Shift-right-click selects half.                                                                                    | The selected stack supplies the item and source.                                      |
| Make a craftable item     | Open Crafting, inspect a recipe's requirements, click the recipe when ingredients are available, then place the result in inventory.        | The recipe names the desired result.                                                  |
| Craft from storage        | Interact with a workbench, which can use ingredients in adjacent ordinary/big chests.                                                       | The workstation establishes the resource scope.                                       |
| Cook                      | Interact with the stove; the cooking interface can use the backpack and linked refrigerator/mini-fridge ingredients.                        | The kitchen establishes eligible storage without a separate container-selection form. |

Sources: [Inventory](https://wiki.stardewvalley.net/Inventory), [Chest](https://wiki.stardewvalley.net/Chest), [Controls](https://wiki.stardewvalley.net/Controls), [Crafting](https://wiki.stardewvalley.net/Crafting), [Workbench](https://wiki.stardewvalley.net/Workbench), [Cooking](https://wiki.stardewvalley.net/Cooking). The visual placement of the two chest grids is also directly observable in SDV-01 and SDV-02.

### Spatial convenience is an explicit rule

The [workbench guide](https://wiki.stardewvalley.net/Workbench) specifies access to the eight surrounding tiles, including diagonals, and a deterministic order for taking materials. The [cooking guide](https://wiki.stardewvalley.net/Cooking) specifies eligible kitchen storage. These are two authored game rules, not a universal radius for all containers.

**Open Legend application:** Let opening a station resolve the station and its normal resource context. Explain which stores are available and highlight their relationship when needed. Preserve the world's real access and reach rules. A hidden nearby-container search must not become the primary way a player discovers which chest they are using. Material choice should remain available when identity, quality, ownership or a valued object changes the result.

## Original player feedback about specific UI features

| Source and date                                                                                                                                                                  | Specific feedback                                                                                                                                              | Design implication                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Raptorbuddha, [workbench request](https://forums.stardewvalley.net/threads/add-an-add-to-existing-stacks-button-to-workbench.20352/), 2023-05-22                                 | Praised the chest's matching-stack button for fast organization and clearing inventory, then asked for the same convenience across workbench-connected chests. | A successful action can still expose repetitive work at the next scale. This is one player's preference, not evidence for unrestricted remote storage. |
| TwoFistTony, [shortcut request](https://forums.stardewvalley.net/threads/add-to-existing-stacks-assigned-key-button.5235/), 2021-02-04                                           | Liked the matching-stack action but wanted a direct key for repeated use.                                                                                      | A visible action and a learned accelerator can support different experience levels.                                                                    |
| TrickyFox and MogBeoulve, [Switch discussion](https://forums.stardewvalley.net/threads/add-to-stacks-organize-buttons-moved-to-left-on-console.33946/), 2024-11-19 to 2024-11-24 | The first player described repeatedly crossing the grid to the buttons; another explained the bumper shortcut, which the first had not known.                  | Control travel and discoverability must be tested on each input method. The mere presence of a shortcut does not make it discoverable.                 |

These are primary, feature-specific player accounts. They support the selected lessons; they do not imply that Stardew's complete inventory has universal approval.

## Screenshot analysis

### SDV-01 — A normal chest and backpack together

![SDV-01: A fish collection in the upper chest grid and the player's tools in the lower backpack grid](../screenshots/stardew-valley/fish-chest-2022.jpg)

**Provenance:** PerfectionWhaleFarm, [original forum post](https://forums.stardewvalley.net/threads/is-silver-quality-legend-possible.13784/), 2022-08-11. Exact patch and platform are not stated for this capture. [Original image](https://forums.stardewvalley.net/attachments/1660262481741-jpeg.11350/).

**Observed controls and layout:** The upper 12-by-3 grid contains fish; the lower grid contains carried tools and supplies. A color strip is above the chest. Right-side controls include a palette, matching-stack arrow, organize icon, trash can and OK. Quality stars distinguish otherwise similar fish.

**Documented workflow:** Open this chest, select or transfer an item against the backpack, optionally deposit matching stacks or organize, then close. The palette changes the chest color; matching-stack deposit and organization are separate actions. [Chest](https://wiki.stardewvalley.net/Chest), [Controls](https://wiki.stardewvalley.net/Controls)

**Assessment — good:** Both places are visible throughout the move. Compact empty squares make room available for further items easy to notice. A colored chest can support a player's own household organization. No activity form precedes the ordinary transfer.

**Assessment — weak:** Most utility buttons rely on learned symbols, and the open container's name is not prominent. Fish with different qualities consume attention despite sharing silhouettes. A player must still visit individual chests to discover where something was stored.

**Application:** Open a world chest into a paired collection view headed **Your belongings** and the actual chest's name. Keep a visible **Store matching** action with a shortcut hint, and keep organization separate. Present distinctions such as condition and provenance when they matter; never treat all same-looking items as interchangeable.

### SDV-02 — A bigger container does not need a different interaction model

![SDV-02: A populated large chest above the unchanged backpack grid on the farm](../screenshots/stardew-valley/chest-1-6.jpg)

**Provenance:** Adir, [original report, post 1,528](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-77), 2024-04-24; author identifies **1.6.4**. Platform and mod status are unspecified. [Original image](https://forums.stardewvalley.net/attachments/20240424143429_1-jpg.22610/).

**Observed controls and layout:** The upper grid expands to five rows of fourteen, while the backpack remains three rows of twelve. The same palette, transfer and organize controls stay at the right. Long runs of visually similar jars make the benefit and cost of density apparent.

**Documented context:** This image is part of a report that replacing a big chest with a smaller chest could hide excess contents. This still shows the larger view; it does not independently reproduce the reported loss of visibility. The report supplies the failure scenario, not a verified diagnosis or evidence of a current unfixed bug. [Original report](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-77)

**Assessment — good:** Capacity scales while the player's task stays familiar. The two collections remain simultaneously understandable.

**Assessment — weak:** More slots can make retrieval slower without readable identities or useful sorting. The reported replacement problem illustrates how a visually smaller container can obscure state that still exists.

**Application:** Keep the same transfer grammar for satchels, chests and large stores. Validate capacity changes against the actual contents; never silently hide overflow. The UI should explain an impossible replacement or move before the player mistakes missing rows for missing possessions.

### SDV-03 — Inventory and equipped items share a compact character view

![SDV-03: Backpack grid, equipped clothing around the character portrait, and a Dark Boots tooltip](../screenshots/stardew-valley/inventory-equipment-2021.jpg)

**Provenance:** Hill Myna, [original forum post](https://forums.stardewvalley.net/threads/prismatic-shard-skull-cave.9440/), 2021-10-25; exact patch/platform unspecified. [Original image](https://forums.stardewvalley.net/attachments/6984/).

**Observed controls and layout:** Category tabs sit above the bag. Equipment slots flank a character portrait; a hovered pair of boots has named defense and immunity values. Organize and trash are to the right; the farm and funds are beneath the grid.

**Documented workflow:** Open the inventory tab, inspect carried and equipped items, and move an appropriate wearable into an equipment slot. The general inventory guide identifies the slots, character display and utility buttons. [Inventory screen guide](https://wiki.stardewvalley.net/Inventory)

**Assessment — good:** Equipment is anchored to the character instead of appearing as another unexplained storage destination. The tooltip connects the recognizable object to readable properties.

**Assessment — weak:** A hover-only stat view does not provide persistent comparison or a non-pointer route. Lifetime earnings compete for space with immediate equipment decisions. The screenshot cannot establish keyboard or assistive-technology quality.

**Application:** Use clearly named equipment locations and a character representation where appropriate. Keep selected details available without hover and show a deliberate comparison to the actual equipped item. Do not copy unrelated account-style statistics into the main bag view.

### SDV-04 — Choose a recipe; the game supplies the routine steps

![SDV-04: Crafting choices above the inventory on a snowy farm](../screenshots/stardew-valley/crafting-winter-1-6.jpg)

**Provenance:** unicornfang14, [original report, post 1,340](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-67), 2024-04-16; **Windows 11, Steam, English, single-player, no mods**, according to the author. 1.6-era exact patch unspecified. The supplied JPEG is a photograph/capture of the game display. [Original image](https://forums.stardewvalley.net/attachments/whatsapp-image-2024-04-16-at-13-16-26_b5b36f77-jpg.22007/).

**Observed controls and layout:** Recipe icons occupy the upper panel; the bag remains below; a downward page control continues the recipe list. Bright and faded silhouettes communicate different availability states. The precise entry point into this crafting panel is not visible.

**Documented workflow:** Inspect a recipe, then click it with the required ingredients available. The game creates the result for placement. This author's report concerns previously learned recipes missing after the update; it does not establish that the unusual-looking icon sizes are a scaling defect. [Crafting guide](https://wiki.stardewvalley.net/Crafting), [original report](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-67)

**Assessment — good:** Recipe selection expresses the intended outcome. The player need not populate a field for every ingredient before a routine craft.

**Assessment — weak:** Faded icons need explanations: missing resources, unknown recipes and blocked use are different states. Paging a growing set without search increases memory work. The reported disappearance would make the catalogue's truthfulness critical even if the layout were attractive.

**Application:** At an Open Legend station, offer a short understandable set of relevant outcomes with costs and blockers. Resolve ordinary ingredients automatically and permit an optional change of material. Keep missing knowledge, insufficient supplies, inaccessible resources and temporary failure distinct.

### SDV-05 — A recipe reference can resemble an action screen

![SDV-05: The Collections cooking page with an Omelet tooltip whose price extends below its panel](../screenshots/stardew-valley/collection-omelet-1-6.jpg)

**Provenance:** [Original report, post 1,598](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-80), 2024-04-27; **Windows 10, 1.6.6, English, single-player, no mods**, as stated by the author. [Original image](https://forums.stardewvalley.net/attachments/20240427191002_1-jpg.22829/).

**Observed controls and layout:** This is **Collections → Cooking**, identified by its surrounding tabs, category rail and lack of an inventory beneath it. The Omelet tooltip shows ingredients, benefits and a price extending beyond its lower border. It is not a screenshot of the stove's execution interface; the image-search description initially mislabeled it.

**Documented workflow:** Open Collections, choose Cooking and inspect a dish's record. This page tracks learned/cooked dishes; actual cooking uses a stove or another permitted cooking source. The author reports overflow in these cards. [Collections guide](https://wiki.stardewvalley.net/Collections#Cooking), [original report](https://forums.stardewvalley.net/threads/report-1-6-issues-here.27915/page-80)

**Assessment — good:** Players can consult information while away from the kitchen. Familiar item imagery links the reference to things they encounter.

**Assessment — weak:** A similar recipe appearance in reference and action contexts can suggest that clicking should do the same thing. The visible overflow shows why content changes must be tested against the full card, including optional facts.

**Application:** Label Open Legend's knowledge/reference views separately from a live station's available actions. A recipe detail should indicate where it can be made and offer a meaningful next step without implying remote execution. Validate tooltips and persistent detail with the longest supported item names and full property sets.

## Synthesis for Open Legend

Stardew demonstrates that simple collection grids, object context and a few dependable accelerators can support many repeated household actions. The strongest lesson is to remove redundant decisions: opening a chest names the chest, opening a kitchen names the kitchen, and choosing a recipe names the output. Access rules, meaningful ingredient choice and consequences still need to be understandable.

A good Open Legend evaluation scene is to return from gathering, open the intended chest, store matching supplies, retain the needed tool, and cook at the adjacent station. The player should complete that sequence without repeatedly choosing their character or a container from a global form. Test the same scene with unfamiliar item names and with keyboard focus. These are candidate tasks; the handbook and its maintainers' trackers own current implementation and acceptance.


## Whole-interface expansion: character progress, navigation and readable controls

Reviewed **2026-10-04**. The two new images address character/status and map layout. Existing captures also retain useful HUD evidence: date/time/currency near the upper-right and the current tool strip near the edge of the world. Those are observations of those versions, not a guarantee of identical placement on every platform.

### SDV-06 — Character progress is a readable summary

![Stardew Valley skills panel with character portrait and five skill tracks](../screenshots/stardew-valley/skills-tab-2024.png)

**Observed.** The left side identifies the character by portrait, name and title. Farming, Mining, Foraging, Fishing and Combat each have a distinct icon, a written name and a ten-position row. The fifth and tenth positions are larger. The lower portion contains locks, silhouettes and a visible level indicator. This is the wiki's original panel crop, uploaded **2024-08-14**; no tab strip or focus tooltip is visible, so those are not inferred from this image.

**Documented workflow.** The Player Menu guide describes opening the skills tab to inspect progress, with professions earned at levels five and ten and chosen at the later level-up screen. Hover information explains learned profession benefits. This separates reading current capability from making a progression choice. [Player Menu](https://stardewvalleywiki.com/Player_Menu)

**Good / weak.** Alignment makes the five tracks comparable. Written names supplement the item-like icons, and larger milestone positions suggest special events. The absence of exact XP/next-unlock information in this crop and the unexplained lower silhouettes can obscure what to do next. Hidden content may be intentional discovery, but an interface should distinguish intentional mystery from an unavailable explanation.

**Open Legend application.** Give the character a compact status/skills summary, with a focused explanation of a selected capability, current modifiers and meaningful next milestone. A character sheet need not be a permanent HUD or a configuration form. Keep earned facts, available choices and unresolved/unknown information visually distinct. Do not import Stardew's five-skill progression as an Open Legend policy.

### SDV-07 — A map can be legible yet waste its container

![Stardew Android map tab with current character marker and empty right-side area](../screenshots/stardew-valley/mobile-map-2025.jpg)

**Observed.** The orange-highlighted map tab sits in a top strip of icons; a large X closes the menu at the far right. Geography fills the left portion, with a farmer portrait and farm name. A large right-side area remains empty. This is the full original attachment, not the forum's 150-pixel thumbnail. The original author identifies **Android A51**, and the thread is tagged **1.6**; the precise patch is unknown.

**Firsthand context.** On **2025-02-06**, ahmadino1234 complains that the map leaves empty space and wants it to fill the screen. A respondent suggests padding/aspect ratio as a possible explanation. The screenshot establishes the visible imbalance; that reply does not establish its technical cause or prove a universal Android defect. [Original report](https://forums.stardewvalley.net/threads/annoying-ui.36870/)

**Good / weak.** Map selection, player location and close affordance are recognizable. However, most top-level navigation still relies on icons, and usable map space is constrained despite the large frame. A screenshot cannot tell whether a region label opens more information or initiates travel.

**Open Legend application.** Evaluate map, character and task panels at their actual usable width and height. Fit and scale the meaningful content, rather than merely increasing the outer dialog. Preserve a readable current-position marker and named locations; make inspect/pin/travel separate actions. A map should help a player orient themselves, not become a list of every hidden entity.

### Navigation, help/options and world actions

The official **1.6 changelog** documents several specific interface improvements: the map key closes a map it opened; Back from community-center notes returns to the previous menu; maps gain real-time character positions; food-buff tooltips show duration. These are useful contracts for Open Legend: matching open/close behavior, one layer of Back, truthful live versus remembered position, and effect duration at inspection. [Official changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/)

The options guide distinguishes UI scaling from world zoom and exposes tool-hit/placement display preferences. [Options](https://stardewvalleywiki.com/Options) For Open Legend, enlarging labels must not force the player to lose useful world context. Placement should show the actual target/footprint and allow cancellation before commit; help should explain the currently selected tool and effective binding. Character creation and world selection can ask consequential setup questions once; ordinary using, speaking, moving and building should start with the visible target and current tool.

### What players specifically value—and where it fails

These are original, selected accounts. They are not a representative review sample or evidence that every player likes Stardew's interface.

- **Positive:** a May 2024 player specifically praises how large the UI can become and says that supports their limited vision. [Original post](https://www.reddit.com/r/StardewValley/comments/1cv40jo/), indexed text; direct retrieval unavailable.
- **Positive and qualified:** a February 2023 accessibility discussion praises separate world zoom/UI scaling and holding an input for repeated work instead of repeated presses. It also asks for more flexible saving. These are that player's experiences, not a claim of full accessibility. [Original discussion](https://www.reddit.com/r/StardewValley/comments/11860di/), indexed thread text.
- **Negative:** a March 2024 player reports unreadable counts and menu text even at maximum scale. Replies identify display resolution as a possible contributor; the author reports improvement after changing it. [Original discussion](https://www.reddit.com/r/StardewValley/comments/1bmstwx/), indexed thread text. The lesson is to verify readable outcomes at real resolution and scale, rather than considering a scale setting sufficient by itself.
- **Negative:** SDV-07 supplies direct evidence of a mobile map that does not use its available panel well. Do not treat the suggested workaround as verified root cause.

The practical target for Open Legend is a readable, resizable interface that preserves action context, predictable Back behavior, accessible alternatives to repeated clicking, and a clear boundary between character information, world navigation and deliberate settings changes.
