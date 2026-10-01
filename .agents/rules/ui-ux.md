# UI/UX rules for every frontend task

For UI/UX design, implementation or review, and frontend code changes including new files, read this short rule once per task, then only matching detail below. Reuse current loaded context. Backend-only work or a prose mention of React does not trigger the handbook. Guidance is not authorization to implement future features.

## Essential rules

1. **Design the player's decision.** Identify actor, task, object, scope and next action. Show what is needed to choose safely; defer optional explanation, not relevant costs, blockers, errors or consequences. Do not expose fields simply because they exist in the data model.
2. **Choose one coherent interaction pattern.** Use an editable combobox for typing into a selected-value field, or a button-opened searchable picker for a separate selection task. Both are legitimate. Never put an input inside a button or an interactive control inside a listbox option. Keep query, active option, selected value and committed effects distinct.
3. **Reuse semantic owners.** Inspect existing `design-system` and connected `ui` components. Compose components/hooks rather than inheritance, a second UI framework or a universal component full of unrelated flags. Wrappers must preserve labels, refs, focus and event handlers; spreading props can overwrite behavior.
4. **Fit real content, not one screenshot.** Use parent-owned Grid/Flex, shared tokens and explicit overflow. Reserve space for utilities, errors and focus. Preserve the selected object, draft and reading position when adapting panes. Test long content, narrow/short viewports and enlarged text; clipping and larger z-index values are not general layout repairs.
5. **Respect the accepted contract.** Read relevant [production guidance](../../apps/client/src/design-system/README.md) and [UI brief](../../docs/ui-design-brief.md) sections. This is not a new theme. Existing panel, camera, plain-tooltip, conversation and simulation-time decisions remain controlling; proposed numbers do not silently replace them.
6. **Make controls understandable.** Use verbs and reserve icon-only controls for recognizable utilities with accessible names. Clear/close use quiet semantic styling, not accidental default-blue primary styling. Preserve focus and system high-contrast colors. Disabled HTML controls cannot receive focus: important reasons need a reachable explanation, not an assumed focus tooltip.
7. **Protect input and attention.** Inside the permitted modal scope, the active child popup/control handles its interaction before its parent or the world. Escape closes one relevant layer. Dismissing a picker must not walk; dragging must not click. Text editing cannot trigger world shortcuts; IME confirmation cannot send. Preserve ordinary explicit-send behavior, drafts and reading position.
8. **Accessibility is behavior.** Reuse React Aria correctly: labels, keyboard operation, visible focus, non-drag alternatives and real modal isolation/focus restoration. Tooltips supplement rather than replace essential instructions. Do not infer accessibility from a library, a dimension or a screenshot.
9. **Show truthful, recoverable states.** Distinguish empty, filtered-empty, loading, unavailable, stale, failed and completed. Reject stale async results. Preserve drafts and show actual receipts for consequential writes. Unknown is not zero. A loading animation is not proof of progress; a confidence percentage needs evidence.
10. **Preserve authority and privacy.** Search, hover, comparison and inspection use permitted projections only. Proposal, approval and execution are distinct. Classify persistence: sharable navigation may belong in a URL; private drafts, hidden facts and credentials do not. Convenience does not authorize new storage, permissions or spending.
11. **Verify the changed task.** Exercise ordinary and relevant failure/cancellation behavior with interaction and visual inspection when available; inspect other callers of shared components. Follow [verification policy](verification.md), not a new blanket test-writing requirement. Report unrun browser, assistive-technology and native agent-dispatch checks honestly.

## Read only the matching detail

| Task | Required relevant chapter |
| --- | --- |
| Density, spacing, sizing, stacking, icons, menus, More/Advanced | [Foundations](../../docs/ui-ux/foundations.md) |
| Inputs, combobox/typeahead, forms, accordions, tabs, popovers, modals | [Controls](../../docs/ui-ux/controls.md) |
| Inventory, equipment, containers, comparison, bulk actions or trading | [Inventory](../../docs/ui-ux/inventory.md) |
| HUD, camera, picking, world navigation, quick actions or captions | [World interaction](../../docs/ui-ux/world-interaction.md) and existing PlayCanvas route |
| Agent/NPC chat, composer, conversation history, invention or previews | [Chat and invention](../../docs/ui-ux/chat-and-invention.md) |
| Search, notifications, settings, save/load, recovery or persistence | [System feedback](../../docs/ui-ux/system-feedback.md) |
| React components, CSS, state, events, async or accessibility implementation | [React](../../docs/ui-ux/react.md) |
| Review or acceptance planning | Relevant scenarios in [verification](../../docs/ui-ux/verification.md) |

The [index](../../docs/ui-ux/README.md) explains authority and numbers. Research ledgers are optional unless researching or revising a principle. Do not preload them, all chapters, every game dossier or every linked specification.
