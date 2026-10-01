# UI/UX rules for every frontend task

For any UI/UX design, implementation or review, and any frontend code change (including new files), read this short rule once per task, then only the matching chapters below. Reuse current loaded context. Backend-only work or a prose mention of React does not trigger the whole handbook. These are design guardrails, not authorization to implement proposed features.

## Essential rules

1. **Start with the player's decision.** Identify the actor, task, object, scope and next action. Show the information necessary to choose safely; move optional explanation, not costs, blockers, errors or consequences, into progressive detail. Do not expose the data model merely because its fields exist.
2. **One coherent control, one interaction contract.** A searchable choice is one combobox, not an independently styled search field mounted inside a dropdown trigger. Its input, optional clear/toggle buttons and popup share a visual group and a single selection model. Never nest interactive controls inside a button or option. Distinguish typed query, selected value and highlighted result.
3. **Reuse before inventing.** Inspect existing `design-system` and connected `ui` components. Extend the semantic owner when behavior is shared. Compose React components and hooks; do not introduce an inheritance hierarchy, a second UI framework or a universal component full of unrelated flags.
4. **Layout must survive real content.** Use parent-owned Grid/Flex layout, shared spacing tokens and explicit overflow behavior. Reserve room for icons, validation, focus and sticky controls. Test long names, multiple panels, narrow/short viewports and enlarged text. A high z-index is not a layout fix. Never hide important content with clipping to make a screenshot look tidy.
5. **Preserve the existing design contract.** Read the relevant [production guide](../../apps/client/src/design-system/README.md) and [UI brief](../../docs/ui-design-brief.md) sections. The handbook is not a new theme. Existing panel, camera, plain-tooltip, conversation and simulation-time decisions remain in their owners; proposed numerical defaults do not silently replace them.
6. **Make meaning explicit.** Use verb labels; reserve icon-only controls for recognizable, repeated utilities with accessible names and focus/hover help. Clear and close are quiet utilities, not primary blue actions. Use semantic color tokens and `currentColor`; retain visible focus and forced-color behavior. A clear control clears the stated field, never deletes an object or cancels work.
7. **Protect input and attention.** The active field, popup, dialog or world gesture owns an input event. Escape dismisses the top relevant layer first. Dismissing a picker must not also walk; dragging must not also click. Typing and IME composition must not trigger world shortcuts or send a message. Keep focus, scroll position, selection and unsent drafts stable.
8. **Use accessible primitives correctly.** Reuse React Aria behavior; provide labels, keyboard operation, visible focus and non-drag alternatives. A modal must actually isolate background interaction and restore focus. A tooltip cannot be the only route to essential instructions. Do not claim accessibility from a component library alone.
9. **Tell the truth about state.** Separate empty, filtered-empty, loading, unavailable, stale, failed and completed. Show real effects and durable save receipts, not optimistic success for consequential writes. Reject stale async results; preserve drafts and give a recoverable next step. Unknown information is not zero or absence.
10. **UI never grants authority.** Render only permitted projections. Searching, comparing, hovering and inspecting must not reveal hidden facts. Preview, proposal, approval and committed execution are distinct. New trade, invention or save conveniences must use existing authority, revision and persistence contracts.
11. **Verify the behavior, not just the JSX.** For changed runtime UI, exercise the ordinary task and a relevant failure/cancellation path with actual interaction and visual inspection when available. Inspect the shared component's other callers. Follow [verification policy](verification.md); no blanket requirement to author new automated tests. Report unrun browser, assistive-technology and agent-dispatch checks as gaps.

## Read only the matching detail

| Task | Required relevant chapter |
| --- | --- |
| Density, spacing, sizing, stacking, icons, menus, More/Advanced | [Foundations](../../docs/ui-ux/foundations.md) |
| Inputs, combobox/typeahead, forms, accordions, tabs, popovers, modals | [Controls](../../docs/ui-ux/controls.md) |
| Inventory, equipment, containers, comparison, bulk actions or trading | [Inventory](../../docs/ui-ux/inventory.md) |
| HUD, camera, picking, world navigation, quick actions or captions | [World interaction](../../docs/ui-ux/world-interaction.md) and existing PlayCanvas route |
| Agent/NPC chat, composer, conversation history, invention or previews | [Chat and invention](../../docs/ui-ux/chat-and-invention.md) |
| Search, notifications, settings, save/load or recovery | [System feedback](../../docs/ui-ux/system-feedback.md) |
| React components, CSS, state, events, async or accessibility implementation | [React](../../docs/ui-ux/react.md) |
| Review or acceptance planning | Relevant scenarios in [verification](../../docs/ui-ux/verification.md) |

The [handbook index](../../docs/ui-ux/README.md) explains authority and numbers. The [research ledger](../../docs/ui-ux/research.md) is optional unless researching or changing a principle; do not preload it, every game dossier, every chapter or every linked specification.
