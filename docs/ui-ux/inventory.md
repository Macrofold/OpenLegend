# Inventory, equipment, containers and trading

[Handbook](README.md) · [Controls](controls.md) · [Game research](research.md#game-exemplars)

## Scope and design objective

The objective is not to reproduce the appearance of Baldur's Gate 3. It is to let a player answer **what do I have, where is it, what can I do with it, and what will change?** without repetitive bookkeeping or accidental loss.

Current Open Legend already has item quantities, individual objects, nested containers, breadcrumbs, movement, split/merge actions, equipment labels and object history. This chapter also describes **future patterns** for large collections, bulk actions, comparisons, loadouts and trading. Those patterns are not delivered features or new authorization; [persistent objects](../maintainers/persistent-objects.md), [base-world work](../maintainers/base-world.md) and the existing action/authority owners retain implementation scope.

## Organize around player tasks, not container internals

Use a clear hierarchy: inventory scope and capacity; search/filter/sort tools; collection; selected-item detail; contextual actions. Keep the current object or selection visible while choosing an action. Do not require opening an editor merely to see a name or available quantity.

Use **lists** when scanning names, quantities, weights, states or comparable values matters; **grids** when recognizable appearance and spatial arrangement carry useful meaning; a compact grid plus persistent detail can support frequent equipment use. A grid is not automatically more game-like or more usable. Do not hide essential names behind hover, especially for newly invented items with fallback art. Support a readable nonvisual/keyboard route to the same collection.

Keep task-critical row information concise: recognizable identity, quantity, equipped/locked state where supported, and the most useful comparison fact. Put long lore, provenance and modifier breakdowns in detail. Do not place a full action toolbar on every row in a thousand-item collection. A selected-item action area, context menu and explicit multi-select mode are more scalable.

## Search, sorting and filtering at scale

Name the search scope: **This container**, **My accessible possessions**, **Nearby storage** or **Market listings**. The current inventory searches this container; a broader scope requires a permitted server query, not client-side inference or a hidden search of every world object. A result outside the current container needs its location and an intentional route to it.

Search matches the full permitted collection within the declared contract, not just currently rendered rows. When the backend examines a bounded window, say that more contents remain searchable and preserve continuation. Do not show a definitive no-results state before the search is complete. Keep query, filter and sort context when returning from detail; reset only when the scope changes deliberately.

Sort by a meaningful default, use a stable tie-breaker, and avoid moving rows while the player is targeting them. A changed price, quantity or condition should not teleport the focused row to a different location unexpectedly. Do not sort only one loaded page while labeling the result as a globally sorted collection. Visible active filters, a clear-all route and a distinction between zero items and zero matches are required.

Filters that suppress loot require reversibility: show that filtering is active, explain why an item was hidden and allow inspection of hidden matches. Never infer **junk** from low rarity alone; usefulness depends on crafting, an authored world, a quest, a player's build and sentimental value. Diablo IV's 2026 loot-filter delivery and subsequent filter fixes illustrate both utility and the cost of incorrect hiding. [G02](research.md#g02)

## Item detail and comparison

Keep a stable fact order: identity and state; applicable use/equip action; requirements and costs; comparison-relevant values; deeper explanation and history. A selected item is not automatically equipped or consumed. Unknown properties are explicitly unknown, not silently omitted from a comparison as if absent.

For comparison, show the candidate and the actual comparison target together, with identical units and conditions. Say **Compared with equipped iron knife**, not simply a green arrow. Distinguish base value, modifiers, effective result and uncertainty. Do not invent a universal item score or assume higher is always better; weight, noise, durability, reach and resource cost can trade off. The world's permitted attributes define relevant dimensions.

Keep equipment slots understandable but world-specific. Unavailable equipment explains the unmet requirement. An offhand conflict, occupied slot or multi-slot item must be clear before confirmation. A loadout, if implemented, stores intended choices with missing-item handling; it does not conjure absent gear, move inaccessible objects or authorize a series of actions the server forbids. FFXIV's gear-set and comparison workflows are useful task references, not a mandate to inherit its classes or equipment model. [G05](research.md#g05)

## Containers, stacks and identity

Show location with breadcrumbs or an equivalent navigable path. Distinguish possession, physical location, declared ownership, custody and permission; the current declaration UI correctly explains that declaring an owner does not transfer an object or grant access.

For a move, make **source → destination**, quantity and relevant capacity visible. Keep the selected source while browsing destinations. Invalid destinations should explain the reason where disclosure is allowed. A container cannot become its own descendant. A target may become full or inaccessible between selection and commit; preserve the player's intent, show the new state and require a fresh valid choice rather than claiming success.

Use an exact numeric input for quantities, with whole-unit rules only when the world/item contract requires them. Show available quantity and the effect of Split, Move, Give or Drop. Presets such as All or Half are accelerators, not ambiguous defaults. Do not turn temporary blank input into an unintended zero-unit mutation. Split/merge changes must preserve server object identity and history; visual sorting must not be mistaken for merging lots.

When a move changes the list, keep a sensible neighboring focus target and announce the actual result. A safe relocation may support undo only when the backend can genuinely reverse it. Do not advertise undo for consumption, trading or irreversible world effects without an explicit contract.

## Bulk operations without bulk mistakes

Bulk mode is explicit. Show the number selected, the scope and a clear exit. **Select this page** and **Select all matching results** are different operations. If filtering changes, either retain selection with an honest hidden-selection count or clear it with an explanation; never silently reinterpret the selection.

Before an operation, show how many objects/units are eligible, excluded and affected. Explain exclusions such as equipped, locked, reserved, quest-relevant or inaccessible only when those concepts are supported. Keep valuable-object protections visible and reversible. A bulk label should name the operation: **Move 12 stacks**, not **Apply**.

The backend decides whether an operation is atomic or may partially succeed. The UI must match that contract: an atomic rejection changes nothing; a partial result lists what changed and what did not, with accurate quantities and a retry for the remainder only. Do not retry the whole request blindly after a timeout. Preserve request identity and refresh authoritative state before offering another consequential attempt.

## Reducing chores is better than hiding chores

Stable locations, meaningful categories, reusable filters and named equipment/storage presets can reduce repeat work. RuneScape's bank placeholders preserve an organizing scheme when stock changes; its design is a useful historical reference, not proof that every game should reserve empty physical slots. [G03](research.md#g03)

ArenaNet's 2025 consolidation of travel and exchange items is a stronger lesson than adding bag capacity: sometimes the right fix is fewer bookkeeping objects. Adopt that only when the object's physical existence is not important to Open Legend's world mechanics. Do not convert every key, currency or tool into an abstract account entitlement without a world-design decision. [G06](research.md#g06)

Player reports about BG3 and GW2 show both friction and disagreement about existing workarounds. Make sort, wares/sell intent, item purpose and salvage consequences understandable; do not interpret a few complaints as consensus or proof that all inventory complexity is bad. [P01](research.md#p01) [P02](research.md#p02)

## Future trading: inspect, agree, commit

Trading is not another drag-and-drop animation. Before implementation, identify whether this is direct exchange, vendor purchase, auction/order placement or an asynchronous listing. Each has different guarantees and costs. The following is a UX contract to design against, not a newly implemented economy.

For **direct exchange**, show both participants, both offered sets, exact quantities, relevant item identity/state, currency and any fees. Make your side and the other side unambiguous. Offer edits invalidate acceptance of the prior offer; highlight changes and require renewed agreement to the new revision. Never leave a green accepted state attached to a changed offer. The server performs the authorized exchange atomically or reports its actual failure.

For **market or vendor purchase**, show unit price, quantity, total, currency, fees, delivery destination and availability. Distinguish asking price from a completed-sale history and disclose the time window/source when showing market evidence. Selecting a listing is not buying it. A changed price or unavailable listing cannot be accepted silently. Preview expensive or destructive consequences; do not add confirmation fatigue to harmless browsing.

For **selling**, distinguish listing, immediate sale and destruction. Show net proceeds, fees and remaining quantity, and protect equipped/locked objects when supported. Do not call a pending listing **Sold**. A successful exchange provides a durable receipt/history record; errors and disconnections do not leave two apparent owners in the UI. Reopening a trade panel is read-only, never a second purchase.

The requirements come from transaction reasoning and existing server-authority principles. FFXIV's official market guidance provides an interface example; it does not establish Open Legend's economic rules. [G05](research.md#g05)

## Representative acceptance tasks

Find an unfamiliar invented item by name; locate the same-looking item in a nested bag; compare without memorizing values; split an exact quantity; move it when capacity changes; recover from a stale revision; repeat the operation with keyboard only. For future bulk/trade work, add hidden selections, partial success, changed offers, duplicate submit, disconnection and a stale price. Measure task success and mistakes before adopting a more elaborate visual inventory. [Full verification matrix](verification.md)
