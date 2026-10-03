# Current inventory, activity and conversation audit

**Inspected:** October 3, 2026. **Repository:** `Macrofold/OpenLegend`. **Runtime source baseline:** [`b50ec6ce75f260d68c18ec99d767982c65b0fccb`](https://github.com/Macrofold/OpenLegend/commit/b50ec6ce75f260d68c18ec99d767982c65b0fccb), the `main` revision from which this research branch began.

This is pinned diagnostic evidence for the [UI/UX handbook](README.md), not another owner of current design rules. The [inventory](inventory.md), [world interaction](world-interaction.md), [controls](controls.md), [chat](chat-and-invention.md) and [verification](verification.md) chapters own the resulting guidance. Source files and existing specifications were read through the GitHub connector. No Open Legend play session, browser reproduction, runtime test or user study was performed for this audit. Existing reports are described as recorded evidence, not as checks rerun here.

## Finding

The present interface makes the player assemble an exact storage transaction: inspect an item, choose its quantity, open a destination browser, select a permitted target, then submit. The underlying object system already supports real containers, nested contents and atomic transfers. The missing connection is the ordinary game interaction: select a physical container, open its contents beside your own, and move items directly between those two visible places. That connection is absent from the inspected inventory caller and presentation. [C01] [C02] [C03] [C23]

This is more than an unattractive dropdown. It is a task-design problem. The same screen represents an item collection, a selected-item inspector, a destination search, an exact-transfer review and a camp-activity questionnaire. The player must translate “put this in that bag” into the software's intermediate choices. The activity interface makes the problem especially clear: it iterates the installed request's fields and renders a control for each, then renders the fields again in the review. [C04] [C05]

The existing design documents explain how this happened. They explicitly prioritized exact quantities, stable identities, access-safe destination discovery, deferred reads, generic authored activity parameters and a request/review card. Those are valuable engineering properties. They do not require routine play to expose a destination-selection workflow or every activity parameter as a form. The documentation also required organizing around player tasks, retaining world context and offering a direct move into an inspected container. The delivered interaction follows the first group of requirements much more closely than the second. [D01] [D02] [D03]

## What the current inventory actually does

| Player intention | Inspected implementation | Consequence for the player |
| --- | --- | --- |
| Open my inventory | The workspace initializes its location to the controlled character. It shows a container heading, breadcrumbs, capacity when applicable, **Browse nearby storage**, **Refresh contents** and **Search this container**. | Personal inventory is presented through the same generic container browser used for other storage. This is a model reuse choice, not a requirement that the player think of their character as a container. |
| Inspect an item | A row opens selected-item detail. The initial quantity is the currently available quantity. At compact widths, detail replaces the collection; at wider widths, the collection and detail can sit together. | The two existing panes are collection and inspector. They are not player inventory and open chest/bag. |
| Put an item elsewhere | **Move or offer** creates a transfer draft and opens the destination chooser. Its source identity and exact quantity accompany the discovery request. | The routine action starts by asking for a transaction destination rather than using the object already opened in the world. |
| Choose the target | The chooser shows storage names, permitted locations, known packing loads and Open/Choose buttons. Choosing fills the draft; it does not move the item. | A further **Move selected quantity** or **Offer selected quantity** is necessary after choosing. While the chooser is open, CSS hides the collection/detail panes entirely. |
| Adjust the amount | Editing the transfer quantity clears its chosen destination. The player must choose again to obtain a preview for the new amount. | A sound requirement to revalidate fit becomes repeated navigation. The new amount could instead be rechecked against the already visible target without asking the player to identify it again. |
| Open a nested bag | Item detail has **Open container**, and the destination chooser also has **Open**. Navigation changes the workspace's current container and clears selection/transfer state. | Nested contents exist, but browsing changes one collection rather than retaining two visible transfer endpoints. |
| Split, merge, equip or drop | Item actions already support split/drop quantities, native equipment actions, comparison and a separate merge-target selector. | These capabilities should be retained behind suitable item gestures and menus. They do not have to be rebuilt as new game mechanics. |
| Inspect a physical object in the world | The world inspection handler selects the entity and opens Character or In view. The Inventory component receives the game view and command callback, but no inspected-container identity or open-container request. | There is no caller connection from inspecting the physical bag/container to a paired storage workspace. |

Sources: workspace/transfer state [C01], rendered collection/detail/actions [C02], destination chooser [C03], pane CSS [C06], world selection [C07] and inventory caller [C23].

The inspected collection is rendered with named item rows and counts. It contains no item-cell drag/drop handlers or user-arranged grid coordinates. Its **Open container** action is real, but it navigates a single collection. This audit therefore does not describe the system as lacking containers, splits or merges; it lacks the direct container interaction Mike requested. The distinction matters because the existing custody and identity rules remain useful. [C01] [C02] [C06]

The word “dropdown” describes the user's experience, but is not the exact component type for every step. The current storage destination control is a separately opened searchable list with Open/Choose buttons; the activity selector is a select field; merging uses a native select. Replacing one widget type while retaining the same sequence would leave the main problem intact. [C03] [C04] [C08]

## Why it was implemented this way: evidence versus inference

| Documented decision | Evidence in the implementation | What it explains, and what it does not justify |
| --- | --- | --- |
| Preserve an exact source, destination, quantity and revisions. | A transfer draft captures these values; submission carries current identity/revision expectations into the native command. | Explains exact review and stale-state protection. Does not require a confirmation screen for every ordinary move when the two endpoints and amount are already apparent. |
| Discover destinations only when requested, replacing a world-root scan on every contents page. | `/api/inventory/destinations` is separate from `/api/inventory`; it uses indexed children and spatial candidates with continuation. | Explains why storage discovery became a distinct component. A physical container can still request its contents lazily when opened. Efficiency is compatible with object-initiated interaction. |
| Share permitted storage selection between inventory and camp activities. | `InventoryDestinations` accepts either an exact transfer source or a source-free activity field. Selection itself performs no write. | Explains reuse of the chooser. Reusing permission-aware reads does not require reusing the same player journey for packing a bag and configuring a longer activity. |
| Fit existing compact panels, with collection/detail enhancement when room exists. | Compact CSS substitutes selected detail for the collection; the optional expanded workspace enables two panes. | Explains the constrained layout. The current panes solve inspection, not simultaneous source/destination transfer. |
| World-authored activity descriptors define required parameters; the ordinary card exposes selected source/cache/fire, quantities and bounds. | `CampActivity` renders `Object.entries(descriptor.fields)` and uses the shared object-field picker. | Explains the questionnaire. The descriptor can remain authoritative while a task-specific interface binds the clicked fire, selected bag and valid supplies and asks only unresolved choices. |
| The previous inventory package excluded a decorative-grid mandate and broader bulk/trading work. | The shipped workspace retained rows, exact single-item movement and voluntary recipient offers. | Explains why a grid redesign was not part of that package. It does not override Mike's present request to redesign the whole interaction. |

The explicit design sources are PW04's workspace/destination/transfer sections, the camp activity's ordinary-UI section and the existing handbook. [D01] [D02] [D03] The code corroborates those choices. [C01] [C03] [C04] [C09]

**Interpretation:** the implementation optimized the visible surface around the information required by the command and its safety checks. That is an inference from the component structure and accepted plans; it is not a claim to know an earlier developer's motives. Nothing inspected establishes that the developers studied a particular game's inventory in depth, performed comparative usability testing, or deliberately rejected a chest-and-inventory layout.

There was already a `docs/ui-ux/` folder at this baseline. Its tree contained ten Markdown files, including a research ledger, inventory guidance and game examples; it contained no local screenshot assets. The earlier handbook explicitly described selected source inspection and external research, without a running-game or usability study. Existing guidance was therefore real, but was not evidence that this actual journey felt natural to players. [D04] [D05]

## Range: what “nearby” currently means

The base world's authored item-handling reach is **1.6 world metres**. The value is `1.6` in the base-world handling policy; the spatial specification declares metre units. It is saved into each created world, so the current world's policy is the authority. It must not become a universal engine constant or a number independently recreated in the client. [C10] [D06] [C11]

The exact check is more specific than “within a circle on the ground.” It measures three-dimensional distance between the actor's and target's interaction anchors, then requires a clear segment between those anchors. Container access additionally requires the relevant root to be perceived and permitted. Carrying one's own unrestricted bag is handled differently from reaching an object on the ground. [C12] [C13]

Current ordinary transfer discovery uses that handling reach to collect candidates, then performs the access checks. The chooser displays a grounded object's location as **On the ground · X.X m away**, derived from rounded position-to-position distance. It does **not** explain the 1.6-metre reach threshold. That displayed distance is also not the exact interaction-anchor distance used for admission; height, obstruction and access can change the result. A visible “1.5 m away” label alone cannot promise the object is usable. [C09] [C14]

The correction is not to list or open every container in the world. It is to make the physical target and its availability understandable:

- The clicked object supplies the intended target. Opening requests current permitted contents for that object.
- If it is too far away, the interface supplies the supported approach action or a clear reason; arrival must obtain a fresh permission/contents result.
- If obstruction, lost sight, changed access or a moved object prevents opening, the explanation belongs at that object and task.
- A range cue, if added, must come from the actual authored/native rule and explain approximations. The existing rounded location text should not be mislabeled as the exact reach test.

These are consequences for the redesign, not claims that this interaction exists now. The maintained spatial and inventory chapters own their implementation contract.

### The existing activity picker already has a different distant-object path

Activity storage selection can name a visible distant dropped bag from its appearance/location. Such a choice has separate **Approach** and **Inspect contents** actions. It does not gain private contents just by listing the bag. Reachable external storage needs current character-inspection evidence before the activity review can use it; later pages remain explicit. This is different from ordinary transfer mode, which remains reachable-only. Any redesign must preserve that evidence boundary while making the player interaction feel like approaching and opening a world object. [C15] [C16]

### Privacy and physical limits that must survive

An unrestricted visible/reachable ground container is not the same thing as another character's backpack. The access owner denies opening another character's carried inventory unless the relevant bag has an explicit grant; an inaccessible ancestor also blocks access. Nearby people appear as **offer recipients**, and acceptance is required before items change custody. Declared ownership does not itself grant access or move an object. A paired-screen layout cannot quietly turn a nearby person's entire private inventory into a loot window. [C13] [C09] [C01]

Capacity is the world's packing-load rule, not a count of drawn squares. A base woven bag has authored capacity and nesting rules; an invented camp container derives its capacity from actual materials. Showing a grid is a presentation decision and must not silently introduce slot capacity, item shapes, weight or extra carrying strength. Those would be separate mechanics. [D07] [D08]

## Activities: the form problem is directly visible in source

`main.tsx` appends **Chosen activities** under the Inventory component. On a fresh draft, no activity or arguments are selected. Choosing a supported activity expands its whole descriptor into object pickers, exact numbers, work-mode selection and, for a watch, stopping-time controls. Review repeats the chosen fields before Start appears. [C23] [C04] [C05]

| Current activity | Required descriptor fields | Why the current entry point is costly |
| --- | --- | --- |
| Gather, return, pack and fuel | Gathering source, camp container, fire, fuel material, personal minimum, current-work mode, quantity to pack: **seven fields**. | Even when the player is looking at the intended camp bag or fire, the screen asks them to rediscover those objects as field values. The whole sequence is configured before the first meaningful game action. |
| Watch this fire for one session | Fuel supply, fire, fuel material, personal minimum, current-work mode, stopping time, maximum fuel units, maximum fuel attempts: **eight fields**, with additional controls for choosing the form of stopping time. | The main interface exposes internal execution bounds alongside meaningful choices such as supply and duration. All receive similar visual weight. |

The authored descriptors establish those counts and meanings; they are not guessed from a screenshot. [C17]

The current-work options are Queue after current work, Pause current work then resume it, and Replace current work. Stopping-time options include duration, a named world time, and exact simulation seconds. These are supported distinctions, but an exact simulation timestamp and execution-attempt budget should not become mandatory ordinary-player language merely because the command supports them. A redesign needs an explicit decision about safe defaults and deeper controls while keeping genuinely consequential supply and interruption choices understandable. Defaults must remain authored and visible where they affect the outcome. [C04] [C17]

The activity object rows and review also expose `Reference: <entity ID>`. This is a confirmed presentation choice in source, not an inferred screenshot defect. Existing PW10 tracking requires relevant observations and blockers to remain visible without engine IDs; PW04's design calls for same-name objects to be distinguished by known location or contents rather than raw IDs. The current implementation does not meet that part of the written intent. Known descriptions, location and in-world focus/highlight should distinguish the objects while identity remains internal. [C05] [C16] [D01] [D09]

The redesign should retain the native activity engine's finite steps, interruption behavior, material constraints and truthful completion. It should initiate from a relevant world object or player goal, supply known context, and reveal only the remaining decisions. A large field renderer is not necessary to preserve world-authored mechanics. The shared reads, validators and command owner can remain useful even if the player-facing activity form is replaced. [D02] [C17]

## Chat: preserve what has already improved

Inventory and activity findings are not evidence that every existing menu must be discarded. The current ordinary conversation surface already contains several appropriate game-facing behaviors:

| Existing behavior at the inspected revision | Design implication |
| --- | --- |
| Talk/Invent and the recipient sit above the conversation; a vertical Whisper/Normal/Shout control sits beside it; the composer sits below. | Do not accidentally restore the older layout in which controls scrolled with the transcript or the input was squeezed out. |
| The textarea begins at one line and grows; Enter sends, Shift+Enter inserts a line, and IME composition prevents Enter from sending. | Keep the familiar writing interaction and input isolation. It is not the same problem as a multi-field activity setup. |
| Pending speech uses dots; provisional reply text keeps dots until reconciliation with heard history. Successful replies have no success badge; failure treatment is restrained. | Do not add provider-stage, queue or generation prose between character utterances. |
| The conversation thread detects whether the reader is following the bottom, preserves position when older messages are prepended and offers a New Message affordance. | Preserve deliberate reading instead of forcing the player to the newest line on every update. Exact hide/reopen behavior still depends on the caller's configuration. |
| Sending clears the draft only if it still matches the submitted text and mode. | Preserve new text typed during a pending send. |

These are supported by current composer/thread/textarea source, production guidance and the existing NP05 evidence summary. [C18] [C19] [C20] [D10] [D11]

Do not overstate draft scope. The inspected ordinary composer stores one session record containing text and mode, while conversation history is selected by participant/world. That is not an implemented collection of independently retained drafts for each person. The handbook's broader draft-identity goal needs deliberate qualification; this audit does not claim a cross-account leak or a tested per-person draft feature. [C21] [C22]

Game research should still inform where conversation lives, how the speaking character stays visible, how heard speech and history relate, and how item references or a pending handover are shown. But creator authoring and in-world conversation have different tasks. Exact proposal review can belong in the creator workshop without making ordinary speech or a routine item transfer look like a developer console. [D10]

## What existing acceptance does and does not establish

PW04 records real native and selected browser evidence for exact transfers, capacity rejection, paging, stale drafts, equipment comparison and focus recovery. NP04 records ordinary camp picker/approach/inspection integration. Those are useful and must not be erased. The same trackers explicitly retain broader layout/input, recipient, large-content and combined-play acceptance. PW06 remains open. A passing exact-transfer scenario establishes that the requested units moved safely; it does not establish that an uncoached player would discover or enjoy the interaction. [D09] [D11] [D12]

The earlier inventory acceptance emphasizes finding items, exact quantity, capacity changes, stale revisions and retained drafts. It does not explicitly require the principal journey Mike has now described: find a physical container, open it, recognize both collections simultaneously, transfer several items naturally and continue playing without repeated destination selection. That gap belongs with the existing inventory and UI qualification owners, not a second roadmap. [D03] [D09]

| Finding to carry into implementation planning | Existing owner |
| --- | --- |
| Physical object → open contents beside personal inventory; predictable return to the same world target. | PW04 with PO07/AC inspection and world-interaction guidance. |
| Direct whole-stack movement plus clear split/amount and non-drag alternatives; repeat transfers without reselecting a destination. | PW04 with PO04/PO10 mutation and identity owners. |
| Range, obstruction and changed-access feedback at the selected object; no private-content expansion. | PW04/NP04 with existing spatial/access owners. |
| Replace the ordinary activity questionnaire with contextual task interaction; preserve finite work, chosen limits and interruption semantics. | PW10 with authored camp routines and UIUX02–UIUX04. |
| Remove raw object references from ordinary labels, using permitted descriptions and spatial disambiguation. | PW04/PW10 and UIUX04. |
| Maintain the current composer, early-speech and reading behavior while assessing dialogue presentation. | UIUX05 and existing conversation/NP05 owners. |
| Observe uncoached container and activity journeys, alongside meaningful failure/input checks. | UIUX03–UIUX04 and the combined PW06 acceptance gate. |

This table routes the findings. It does not change checkbox status or imply any of these redesign features were implemented during research.

## Integration implications

The safest useful change is substantial in presentation, but does not require a second object system. The current inventory read already accepts a specific container ID. The current transfer command already accepts a source object, exact quantity, destination and revisions. A direct gesture can identify the same intent and call the same native owner. Fresh contents and authoritative receipts remain necessary; repeated user selection is not. [C01] [C09] [C14]

Implementation needs an explicit caller path from a permitted world-object action into the inventory workspace, ownership of the two displayed container identities, and state recovery when either side moves or becomes unavailable. The visible endpoints must remain stable while inventory contents refresh. A failed or uncertain transfer must not appear completed, and input captured by a menu or item drag must not walk or rotate the world. Existing cancellation, focus, shortcut and authority contracts remain applicable. [C07] [C01] [D13]

The ordinary container experience should be validated with the current real bag/pile/container mechanics. A reference screenshot of a chest does not establish that Open Legend already has a craftable fixed chest family. The camp-container specification explicitly leaves fixed storage and richer physical effects as future mechanics. The new interaction can improve existing bags and world containers immediately without inventing chest construction or copying another game's physics. [D07]

## Pinned source references

Every source below refers to the inspected `main` snapshot, so future implementation changes do not silently change this audit's evidence.

[C01]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/inventory.tsx#L190-L558
[C02]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/inventory.tsx#L568-L1070
[C03]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/inventory-destinations.tsx#L10-L277
[C04]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/camp-activity.tsx#L17-L117
[C05]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/camp-activity.tsx#L377-L706
[C06]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/inventory.css
[C07]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/main.tsx#L440-L528
[C08]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/inventory.tsx#L87-L173
[C09]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/server/src/inventory-view.ts#L332-L641
[C10]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/worlds/base/item-handling.ts#L3-L12
[C11]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/worlds/base/world.ts#L95-L110
[C12]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/spatial.ts#L102-L138
[C13]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/object-access.ts#L7-L34
[C14]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/server/src/inventory-view.ts#L110-L232
[C15]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/server/src/inventory-view.ts#L258-L329
[C16]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/activity-object-field.tsx#L113-L289
[C17]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/worlds/base/camp-activity.ts#L27-L95
[C18]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/composer.tsx#L113-L331
[C19]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/conversation.tsx
[C20]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/auto-textarea.tsx
[C21]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/draft.ts
[C22]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/ui/use-chat-history.ts
[C23]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/apps/client/src/main.tsx#L794-L815
[D01]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/projects/next-playable-week-tech-design.md#pw04--inventory-interaction-and-presentation
[D02]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/projects/next-playable-week/camp-activities.md#observation-memory-and-ordinary-ui
[D03]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/ui-ux/inventory.md
[D04]: https://github.com/Macrofold/OpenLegend/tree/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/ui-ux
[D05]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/ui-ux/verification.md#what-this-evidence-establishes
[D06]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/spatial-world.md#what-a-location-means
[D07]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/worlds/base/camp-containers.md
[D08]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/packages/domain/src/worlds/base/items.ts#L47-L68
[D09]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/maintainers/next-playable-week.md
[D10]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/ui-ux/chat-and-invention.md
[D11]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/maintainers/ui-ux.md
[D12]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/maintainers/next-playable-week.md#pw06--integrated-release-evidence
[D13]: https://github.com/Macrofold/OpenLegend/blob/b50ec6ce75f260d68c18ec99d767982c65b0fccb/docs/ui-ux/world-interaction.md#one-owner-for-each-gesture
