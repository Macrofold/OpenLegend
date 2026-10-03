# Inventory, equipment, containers and trading

[Handbook](README.md) · [Controls](controls.md) · [Game research](research.md#game-exemplars)

## Scope and design objective

Let the player see and handle their belongings, open a physical chest and move objects between the two without repetitive bookkeeping or accidental loss. The primary questions are **what do I have, where is it, what can I do with it, and what will change?**

**October 3, 2026 direction:** Mike explicitly supersedes the routine destination-selector and activity-form experience. The target is an object-opened pair of item grids with direct transfer. The [feature specification](../projects/game-interaction-redesign-feature-spec.md), [technical design](../projects/game-interaction-redesign-tech-design.md) and [screenshot atlas](games/README.md) make that direction concrete. This is a design target; the runtime described below has not been replaced by this documentation change.

## Open the object and keep both inventories visible

Opening a reachable, permitted container from the world or its selected-object details opens **Your belongings** and **the named container** together. Each side is an item collection. Chest examples describe the intended interaction; the first runnable slice uses a currently supported native bag/container, without implying that fixed chest mechanics already exist. The current collection/detail split is not that interaction, and neither collection should disappear while the player chooses where an item goes. [Pinned diagnosis](current-interface-audit.md)

Use a recognizable item grid as the ordinary presentation, with readable names for unfamiliar objects, quantities, equipped state and deliberate item selection. An optional compact list or accessible collection view supports the same actions. Artwork, rarity color and hover cannot be the only way to identify an item. Cells organize presentation; native object identity, capacity and stack rules remain authoritative. Sorting is not merging.

The open external object supplies the transfer destination. Drag across, use the visible **Move to Camp chest** / **Take into backpack** action, or use a discoverable quick-move shortcut. All routes submit the same native intention. Routine reversible movement commits from that gesture, without another destination picker or review form. Item details, comparison and a requested quantity choice are local supporting controls. A Split stack popover retains both endpoints; changing quantity refreshes eligibility without making the player select the same container again.

Keep source and destination identities stable during drag, pending work, paging and viewport changes. An ordinary release over scenery cancels; intentional Drop has its own supported route. After actual admission, show the committed quantity or a truthful refusal. Unknown receipt status is not failure or permission to repeat the transfer. A full container, moved item or lost access never redirects the move automatically.

Carried bags open within their side with breadcrumbs; opening another world container deliberately changes the external side. The initial workspace has one external object, not a dropdown representing every nearby container. A separately entered storage-finding tool may retain bounded search and permission-safe discovery, but it is navigation or advanced organization rather than the price of moving a normal item. Nearby quick-deposit automation requires separately defined native scope and batch semantics.

On narrow screens, stack the named collections before resorting to source/destination views with a persistent counterpart strip. Keep the same selected item, amount and reading positions. Do not solve narrow fit by restoring the destination dropdown. An expanded inventory is a deliberate task workspace, with a clear return to the world; ordinary panel dimensions do not dictate its two-collection layout.

The world owns reach, line of access and permission. When the object is too far away, explain that on the object and offer a deliberate approach action if supported; selection and inspection do not move the player or read hidden contents. See [object opening and contextual activity](world-interaction.md#object-opening-and-contextual-activity). The current bundled-world threshold and its nonidentical displayed-distance calculation are documented in the audit, not reimplemented by presentation.

This target adopts the readable physical relationship seen in BG3, Minecraft and Factorio while avoiding their documented clutter, hidden shortcuts and platform inconsistencies. Terraria/Stardew's bulk conveniences are candidates after ordinary direct handling works. [Evidence and qualifications](research.md#game-interface-screenshot-atlas)

## Current implementation and evidence

Current Open Legend has item quantities, individual objects, nested containers, breadcrumbs, movement, split/merge actions, equipment labels and object history. [PW04](../maintainers/next-playable-week.md#pw04--inventory-for-exact-camp-tasks) adds a task workspace with scoped search, stable selected detail and exact quantity drafts, lazy destination discovery, and native equipment comparison. This chapter also describes **future patterns** for large collections, bulk actions, loadouts and trading. Those patterns are not delivered features or new authorization; [persistent objects](../maintainers/persistent-objects.md), [base-world work](../maintainers/base-world.md) and existing action/authority owners retain implementation scope. [Bounded native and actual layout/draft evidence](../verification/next-playable-week-engineer-4.md#pw04--native-inventory-and-partial-browser-checks) does not complete final current-server/large-content/input qualification in PW04 and UIUX02–UIUX04.

## Organize around player tasks, not container internals

Use a clear hierarchy: inventory scope and capacity; search/filter/sort tools; collection; selected-item detail; contextual actions. Keep the current object or selection visible while choosing an action. Do not require opening an editor merely to see a name or available quantity.

For this redesign, grids are the ordinary inventory and open-container presentation. Lists remain useful as an alternative for scanning long names and comparable facts; they are not the default transaction worksheet. Keep essential names accessible beyond hover, especially for newly invented items with fallback art, and provide the same operations through keyboard and nonvisual navigation.

Keep task-critical row information concise: recognizable identity, quantity, equipped/locked state where supported, and the most useful comparison fact. Put long lore, provenance and modifier breakdowns in detail. Do not place a full action toolbar on every row in a thousand-item collection. A selected-item action area, context menu and explicit multi-select mode are more scalable.

Distinguish **focus**, **inspect item**, **select for a batch** and **execute an action**. Opening detail must not also equip or mark an item for sale. Give a selection checkbox and a row's inspection action separate usable targets rather than nesting interactive elements. A visual grid does not require ARIA grid semantics; a composite keyboard grid brings additional navigation obligations. Carbon's table/selection guidance is useful for these task distinctions, not a mandate to turn inventory into an enterprise table. [S09](research.md#s09)

A wider workspace may show collection and detail together. When it narrows, retain the same object and draft; Back returns to the collection's previous filter and reading position. Resizing cannot clear a chosen transfer quantity or redirect it to a different item. [Adaptive layouts](foundations.md#adapt-the-task-not-just-the-boxes)

At the audited runtime baseline, inventory identity survives pane width and visibility changes, and quantity fields retain blank/intermediate text. All/Half fill a draft, while a separate exact-transfer review still requires submission. Quantity changes clear the destination choice. The [audit](current-interface-audit.md) records that both collection/detail panes are hidden during destination selection. These are current implementation facts, not the target experience: retain native revision/access/capacity checks, but replace routine review and reselection with the direct interaction above.

## Search, sorting and filtering at scale

Name the search scope: **This container**, **My accessible possessions**, **Nearby storage** or **Market listings**. The current inventory searches this container; a broader scope requires a permitted server query, not client-side inference or a hidden search of every world object. A result outside the current container needs its location and an intentional route to it.

Search matches the full permitted collection within the declared contract, not just currently rendered rows. When the backend examines a bounded window, say that more contents remain searchable and preserve continuation. Do not show a definitive no-results state before the search is complete. Keep query, filter and sort context when returning from detail; reset only when scope changes deliberately.

The shared storage picker reads permitted carried/nearby choices and then explicitly opened container children. Its declared camp-selection mode additionally names visible distant dropped bags using appearance/location only; it grants neither contents nor an openable interior. Approach and character inspection are separate actions outside the selection rows. Normal transfer mode remains reachable-only. Current admitted inspection exposes direct children, with separate continuation; unopened descendants remain private. Inventory and camp work share a vertically arranged panel with ordinary parent scrolling and room for focus outlines; the inventory retains its bounded inner contents panes. It can select storage for a camp activity without a transfer source, or show move/offer suitability for an exact selected source. It is read-only until the owning task submits its own native action. Disconnection hides previously read rows and aborts the read; reconnection requires fresh permitted results before selection. Ordinary contents pages no longer discover every destination. [IW01](../limits/interface.md#iw01--inventory-task-workspace) records the current page/scan bounds and their cold-index/native-admission exclusions; partial and unavailable discovery have distinct explanations and continuation/refresh routes.

Sort by a meaningful default with a stable tie-breaker; avoid moving rows while the player targets them. Changed price, quantity or condition should not unexpectedly teleport the focused row. Do not sort only a loaded page while labeling it globally sorted. Show active filters, a clear-all route and the distinction between zero items and zero matches. A selected-first presentation should use deliberate reordering points rather than move an option away mid-selection; Primer's picker implementation illustrates this concern. [S01](research.md#s01)

Filters that suppress loot require reversibility: show that filtering is active, explain why an item was hidden and allow inspection of hidden matches. Never infer **junk** from low rarity alone; usefulness depends on crafting, an authored world, a quest, a player's build and sentimental value. Diablo IV's 2026 loot-filter delivery and subsequent fixes illustrate both utility and incorrect hiding. [G02](research.md#g02)

## Item detail and comparison

Keep a stable fact order: identity and state; applicable use/equip action; requirements and costs; comparison-relevant values; deeper explanation and history. A selected item is not automatically equipped or consumed. Unknown properties are explicitly unknown, not silently absent from a comparison.

For comparison, show the candidate and actual comparison target together with identical units/conditions. Say **Compared with equipped iron knife**, not simply a green arrow. Distinguish base value, modifiers, effective result and uncertainty. Do not invent a universal item score or assume higher is always better; weight, noise, durability, reach and resource cost trade off. The world's permitted attributes define relevant dimensions.

The current comparison is deliberate and names the actual equipped object. Server-projected native characteristics supply meanings and units for both columns; the browser does not reproduce family formulas. Only matching characteristic identities and units enter the comparison; an unavailable value within a matching row is labeled unknown. No matching dimensions yields no comparison offer rather than a made-up score.

Make comparison deliberate and stable: a named Compare action or visible mode can coexist with a modifier-key shortcut. Do not make the shortcut the sole route or cover ordinary item inspection with unsolicited extra panels. Blizzard's July 2026 Classic UI follow-up restored comparison on deliberate input after an always-on regression. That is a caution about default behavior, not proof that Shift is the right binding for Open Legend. [S20](research.md#s20)

Keep equipment slots understandable but world-specific. Unavailable equipment explains unmet requirements. An offhand conflict, occupied slot or multi-slot item must be clear before commitment. A loadout, if implemented, stores intended choices with missing-item handling; it does not conjure absent gear, move inaccessible objects or authorize forbidden actions. FFXIV's gear-set/comparison workflows are task references, not a mandate to inherit its classes or equipment model. [G05](research.md#g05)

## Containers, stacks and identity

Show location with breadcrumbs or an equivalent navigable path. Distinguish possession, location, declared ownership, custody and permission; the current declaration UI correctly explains that declaring an owner does not transfer an object or grant access.

For a move, make **source → destination**, quantity and relevant capacity visible. Keep the source while browsing destinations. Explain invalid destinations where permitted. A container cannot become its own descendant. A target may become full or inaccessible before commit; preserve intent, show the changed condition and require a valid fresh choice instead of claiming success.

Use an exact numeric input for quantities, with whole-unit rules only when required by the item/world. Show available quantity and the effect of Split, Move, Give or Drop. All/Half presets are accelerators, not ambiguous defaults. Do not turn blank draft input into a zero-unit mutation. Splits/merges must preserve server identity/history; visual sorting is not merging lots.

After a move, keep sensible neighboring focus and announce the actual result. Offer undo only when the backend can genuinely reverse the operation. Consumption, trading or irreversible world effects cannot acquire fake undo just because a toast has room for a button.

## Bulk operations without bulk mistakes

Bulk mode is explicit. Show the number selected, scope and a clear exit. **Select this page** differs from **Select all matching results**. Changing filters either retains selection with an honest hidden-selection count or clears it with an explanation; never silently reinterpret selection.

Once a batch is being prepared, use a selection-aware action bar and avoid competing row commands that make it unclear whether one item or the batch will change. Read-only inspection can remain available when it preserves the batch. Do not indiscriminately freeze unrelated controls. This adapts Carbon's batch-action model to an inventory task. [S09](research.md#s09)

Show eligible, excluded and affected objects/units, with reasons for exclusions such as equipped, locked, reserved, quest-relevant or inaccessible only where those concepts are supported and disclosable. Keep valuable-object protection visible and reversible. Name the operation: **Move 12 stacks**, not **Apply**.

Backend atomicity determines UI promises. An atomic rejection changes nothing; a permitted partial result identifies what changed and what did not, with exact quantities and a retry only for the remainder. Do not blindly retry everything after a timeout. Preserve request identity and reconcile authoritative state before another consequential attempt.

## Reducing chores is better than hiding chores

Stable locations, categories, reusable filters and named equipment/storage presets can reduce repetition. RuneScape bank placeholders preserve organization when stock changes; this historical reference does not prove every game should reserve empty physical slots. [G03](research.md#g03)

ArenaNet's 2025 consolidation of travel/exchange convenience items illustrates reducing bookkeeping objects rather than merely enlarging bags. Adopt that only when their physical existence is not important to Open Legend's mechanics. Do not convert every key, currency or tool into an account entitlement without a world-design decision. [G06](research.md#g06)

BG3/GW2 player discussions show both friction and disagreement about workarounds. Make sort, sell intent, purpose and salvage consequences discoverable; do not interpret a few complaints as consensus or all complexity as bad. [P01](research.md#p01) [P02](research.md#p02)

## Future trading: inspect, agree, commit

Trading is not another drag-and-drop animation. Identify direct exchange, vendor purchase, auction/order placement or asynchronous listing before implementation: guarantees and costs differ. This is future UX guidance, not a newly implemented economy.

For **direct exchange**, show both participants and offered sets, exact quantities, relevant item identity/state, currency and fees. Distinguish your side from the other side. Offer edits invalidate agreement to the prior revision; highlight changes and require renewed acceptance. The server exchanges atomically or reports actual failure; a changed offer cannot retain a misleading accepted state.

For **market/vendor purchase**, show unit price, quantity, total, currency, fees, destination and availability. Distinguish asking price from completed-sale history, with source/time window when displaying market evidence. Selecting a listing is not buying. A changed price or unavailable listing cannot be accepted silently. Review expensive/destructive consequences without confirmation fatigue for harmless browsing.

For **selling**, distinguish listing, immediate sale and destruction. Show net proceeds, fees and remaining quantity; protect equipped/locked objects where supported. Pending is not **Sold**. A successful exchange has a durable receipt/history; disconnection must not manufacture two apparent owners. Reopening a panel is read-only, not a second purchase.

These requirements follow transaction reasoning and existing authority principles. FFXIV's market guidance provides an interface example, not Open Legend's economic rules. [G05](research.md#g05)

## Representative acceptance tasks

Find an unfamiliar invented item; distinguish same-name items in nested bags; compare without memorizing values; split exact units; move after capacity changes; recover from a stale revision; repeat with keyboard only. Retain selection/quantity through pane adaptation. Future bulk/trade cases include hidden selection, row-versus-batch ambiguity, partial success, changed offers, duplicate submit, disconnection and stale price. Measure success/errors before choosing a more elaborate visual inventory. [Verification](verification.md)
