# Foundations: information, layout and hierarchy

[Handbook](README.md) · [Controls](controls.md) · [Tuning inventory](../limits/ui-ux.md)

## Design the decision before arranging the fields

For a screen, panel or component, write a sentence: **This player is trying to do X to Y, in scope Z, and needs A/B/C to choose.** Distinguish finding an object, inspecting it, choosing an action, setting parameters and committing. One screen can support several steps, but it should make the current step evident.

For each visible element, name its job: orientation, evidence, input, action, feedback or recovery. Remove duplication before shrinking text. A technically complete dump is not a useful interface. A visually empty screen that hides the only next step is not simple.

Present information in three layers:

| Layer | What belongs | Open Legend examples |
| --- | --- | --- |
| Immediately visible | Identity, current state, task-critical comparisons, main action, consequential cost or blocker | Item name and quantity; selected recipient; carrying limit; Save failed; action cannot reach target |
| Nearby detail | Explanation and alternatives that a player intentionally explores | Item history; modifier breakdown; why a recipe requires a tool; secondary character attributes |
| Specialist detail | Rare configuration and diagnostic evidence | Trace JSON; generation settings; dependency graph; raw authoring fields |

Frequency alone is insufficient. A rare but irreversible operation still needs conspicuous consequences. Required settings, invalid fields, purchase totals and permission changes must not disappear in Advanced. Unavailable information must say unknown/unobserved where that distinction matters, not display an empty meter or a zero.

This adapts Nielsen's progressive-disclosure guidance, not a rule that all detail should be collapsed. [F01](research.md#f01) [F02](research.md#f02)

## Group by meaning and reading order

Group inputs that answer one question or affect one decision. Put the label above its control by default, with a specific hint only when needed. Keep the label closer to its field than to the previous field. Place validation adjacent to the affected control. Use section headings for separate purposes, not a border around every row.

Examples: Quantity and Destination can form a transfer section; item lore and account preferences cannot. Currency unit belongs with the amount. Character identity and a destructive owner action should not look like peers in one undifferentiated form.

Use DOM order matching reading and keyboard order. Do not visually reorder an illogical form using CSS. A row wrapping onto two lines must still read correctly. Repeated rows should align the same kinds of values; use tabular numerals for changing counts when the theme supports them. Align numeric table columns consistently and retain units in headers or cells.

### When inputs stack

Default to a vertical form. Put fields side by side only when all are short, closely related, naturally read together and fit their labels, values and errors at the current text scale. Examples: quantity plus unit; two coordinates when coordinate editing is actually part of the task. Name plus long description should stack. Do not give a one-digit quantity the same width as an invention description just to make columns equal.

A content-based fit test is more robust than a device-name breakpoint:

`available inline size >= sum(minimum readable field widths) + gaps`

Measure with realistic long labels and validation messages. When the inequality fails, stack the group in logical order. Do not truncate labels, shrink text or turn hints into hover-only content to preserve a two-column mockup. This is a design test, not a mandate to compute typography in application code. [F05](research.md#f05)

## Spacing and dimensions

Use the existing 4px token rhythm. Shared spacing communicates relationships; an arbitrary margin on each child does not. The following are **starting values**, not changes to current tokens or externally validated optima:

| Relationship | Starting value in CSS px | Adjustment rule |
| --- | --- | --- |
| Label to field or tightly coupled text | 4–8 | Keep the association unambiguous; allow long hints to wrap |
| Icon to its label; compact row siblings | 8 | Enlarge when targets would collide; do not include icon artwork padding twice |
| Adjacent form fields or ordinary row groups | 12–16 | Errors grow the group rather than overlap the next field |
| Separate semantic sections | 24–32 | Often about twice the within-group gap; heading hierarchy matters more than exact ratio |
| Comfortable panel inset | 16–24 | Compact HUD may use less under its owner; include focus and scrollbar space |
| Body prose measure | 45–75 characters as a starting range | Narrow contextual text can be shorter; do not force a chat panel to widen beyond the world budget |

These are Open Legend proposals [UXL01–02](../limits/ui-ux.md), inspired by tokenized layout practice rather than copied from a vendor's exact scale. Microsoft Fluent and Atlassian both provide systematic spacing/layout guidance; our existing scale remains the local source. [F03](research.md#f03) [F04](research.md#f04)

Use `gap` on the layout parent. Prefer logical `padding-inline`/`block`, `min-inline-size: 0` on shrinking children, and explicit wrap/overflow behavior. Reserve trailing space inside a field for its clear button. A 16px glyph is not a 16px hit target. Hover, focus, selected, loading and error states must not unexpectedly change control geometry.

## Proportions come from task space

The world is not leftover whitespace around a dashboard. Budget space for the interaction the player is performing, not a fixed percentage of every display. Existing ordinary/wide panel sizes are useful starting constraints, not a universal ratio for inventories, dialogs and phones.

For docked panels, check:

`sum(open panel widths) + panel gaps + safe insets + usable world region <= available viewport width`

Use the actual available viewport after browser/UI scaling and visible system controls. On overflow, follow the existing collapse/opening-order and narrow-sheet behavior. Do not let panels intersect, compress controls below usable widths or scale the entire interface until it technically fits. A comparison or authoring task may deliberately use a larger workspace; name that mode and provide a clear return to play.

For vertical fit, subtract headers, tabs, footers and safe insets before sizing the body. Use a clear primary scroller per reading pane; independently usable list/detail panes can legitimately scroll separately. Avoid competing nested scrolling for the same content. A sticky action footer must not cover the last field, keyboard focus or a popup. Reserve scroll padding where necessary. Opening a software keyboard must not hide the composer or only confirmation action.

Intentional anchored popovers may cover background content; accidental panel overlap, clipped menus and obscured focus are defects. Distinguish them rather than banning every overlap.

## Adapt the task, not just the boxes

Choose a recognizable arrangement: a collection for browsing, list/detail for choosing and inspecting, or a main task with a supporting pane for conversation/explanation. On a wide view, inventory and selected-item detail may be simultaneous; on a narrow view, the detail can replace the list with a clear Back route. Keep the same selected object, query, filters, draft and list reading anchor. Resizing is not a new task or permission to discard work. Google's canonical layouts provide a useful behavioral reference without dictating React implementation or a pane ratio. [S08](research-second-pass.md#s08)

Supporting content must remain reachable when it cannot stay beside the task. Do not shrink three panels into unusable columns or hide the only validation explanation. Preserve a deliberate return to the world, and distinguish temporary overlay dismissal from navigating back through a task.

Test available width and height independently. A wide-but-short window can still hide a popup's final option. Account for software keyboards, safe areas, browser zoom and scrollbars; layout viewport size alone is not always the usable visible region. A popup-to-sheet adaptation should preserve selection and give its new modality a correct focus contract. Adobe's mobile combobox account explains why this matters. [S03](research-second-pass.md#s03)

Width does not prove input method. A narrow window may use a keyboard, and a wide device may use touch. Keep keyboard access and non-hover routes across layouts; use pointer capabilities to improve targeting without removing essential alternatives. Never lock browser zoom to make one mobile layout appear stable. These are design checks, not a claim of newly supported device combinations.

## Icons and visible labels

Use text for unfamiliar actions and distinctions where the verb matters: **Move**, **Give**, **Sell**, **Destroy**, **End conversation**. A trash can is not a sufficient explanation of which of those happens. Use icon-only controls for familiar, repeated utilities such as close, search, back and recenter when space is constrained and an accessible name plus focus/hover help exist. Show the current state of a toggle, not just a static symbol.

Use the existing semantic icon resolver and fallback sigil. Do not let generated artwork be required to identify or use a new item. A decorative icon alongside text is hidden from assistive technology; the control's accessible name includes its visible label. Do not put an icon on every menu item merely to fill a column; use consistent grouping and only meaningful symbols.

Color expresses role and state, not the browser default. Clear-X and close are quiet utilities using theme tokens; danger styling is for destructive consequences, primary styling for the main commitment. Focus remains visible, including system forced colors. A deliberate focus color is not the same defect as accidental default-blue utility styling. [F06](research.md#f06) [S12](research-second-pass.md#s12)

## Menus, More and Advanced

Organize menus by the user's task, using stable terminology across launchers, context menus, search and keyboard help. Put the frequent relevant action near the object. Group alternatives, then destructive actions with separation. Avoid a forest of unlabeled gear menus.

Use **More** for infrequent actions on the same object; use **Advanced** for expert parameters of the current task; use **Settings** for persistent preferences. They are not interchangeable. Keep the primary action out of overflow. Show a count or summary of non-default hidden settings, and reveal a section containing an error when validation fails.

Do not make a player's essential action hover-only or right-click-only. A context menu is an accelerator with another discoverable route. Do not alphabetize the principal task sequence merely because the backing collection is alphabetical. Use search for long catalogues, not as the only way to discover a small set of basic actions.

Follow current product rules for unavailable actions: the action picker has an explicit unavailable-actions control. Do not override that globally with every disabled action always visible. Once requested, reasons need a reachable explanation and possible remedy; a native disabled control cannot rely on a focus-only tooltip. Never hide a failed submitted operation behind that filter. [Disabled controls](controls.md#disabled-controls-and-reachable-explanations)

## Evaluate clarity, not empty space

Ask a player to find an item, compare two alternatives, change a setting and recover from a failure without coaching. Observe wrong selections, backtracking, overlooked costs and lost context. More clicks are acceptable when they prevent a consequential error; fewer clicks are useful when they remove repetitive bookkeeping. Record task and input method before comparing timings. Neither a dense expert view nor a spacious novice view is automatically better.
