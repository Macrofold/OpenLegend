# Verification and current-surface coverage

[Handbook](README.md) · [Repository verification policy](../../.agents/rules/verification.md) · [UI/UX follow-through](../maintainers/ui-ux.md)

## What this pass establishes

Baseline: `0382be76648879cf8a8397ad6c3534b4431916f5`, research date 2026-09-30. This pass read the UI manifest, relevant production/design owners and selected implementation bodies. It did not launch the game, inspect computed styles, conduct a player study or run assistive technology. The coverage map below is a routing inventory, not a claim that every component passed an audit.

| Evidence class | Finding | Implication |
| --- | --- | --- |
| Inspected implementation | Shared `SelectField` already uses React Aria ComboBox, Input, Popover and ListBox | Preserve the integrated composite pattern; do not report the earlier nested-widget mistake as a confirmed current bug |
| Inspected implementation | `SubjectPicker` uses the shared selector, a 150ms debounce, request guards, scoped labels and paged result deduplication | Shared-control changes must preserve remote-search and privacy behavior |
| Inspected implementation | Inventory uses a native `input[type=search]` and has quantities, nested containers, movement, split/merge and history | The blue-X may involve native browser chrome, but that cause remains unconfirmed; advanced UX must build on existing functionality |
| Documented current contract | The UI brief and production guide specify 4px spacing, panel adaptations, plain tooltips, camera meanings and conversation feedback | Research guidance supplements those contracts instead of silently replacing them |
| User-reported, not reproduced here | Overlapping/nested typeahead controls and inappropriate blue clear-X | Keep concrete regression scenarios open until checked in the affected browser and state |
| Proposed future pattern | Advanced comparison, bulk management, loadouts and trading | These are design requirements to use when separately implemented, not delivered game features |

Implementation references: [shared controls](../../apps/client/src/design-system/components.tsx), [subject picker](../../apps/client/src/ui/subject-picker.tsx), [inventory](../../apps/client/src/ui/inventory.tsx). Current contracts: [production guide](../../apps/client/src/design-system/README.md), [UI brief](../ui-design-brief.md).

## Current-surface coverage

Paths below are relative to `apps/client/src/`. Every listed surface has a relevant handbook destination. Listing a file here does not mean its full body was inspected. The existing subsystem owner remains authoritative, and implementation work must inspect the actual changed callers.

| Surface | Current entry points | Guidance and particular risks |
| --- | --- | --- |
| Shared controls, icons, fields, meters and panels | `design-system/components.tsx`, `components.css`, `layout.css`, `tokens/`, `progress-ring.tsx` | Foundations, Controls, React: one composite control, semantic tokens, focus, overflow, correct time meaning |
| Main HUD, docking and launchers | `main.tsx`, `ui/hud-layout.ts`, `ui/panels.tsx` | Foundations, World: panel collision, opening order, narrow sheet, world visibility and focus |
| Inventory and creation choices | `ui/inventory.tsx`, `ui/item-creation.tsx` | Inventory, Controls: scope, quantities, containers, native clear control and authority |
| Actions and quick access | `ui/action-picker.tsx`, `ui/quick-actions.tsx`, `ui/action-attempts.tsx`, `action-browser.ts` | World, Controls: target meaning, search/invent boundary, unavailable reasons, no duplicate execution |
| Pullouts and searched subjects | `ui/pullout.tsx`, `ui/subject-picker.tsx` | Controls, System feedback: coherent popup, remote states, paging, keyboard and permitted labels |
| Camera, world picking and presentation | `ui/camera-controls.tsx`, `world-camera.ts`, `scene.ts`, `world-renderer.ts`, `world-presentation.ts` | World, React plus PlayCanvas guidance: gesture ownership, recovery, floor, occlusion and per-frame work |
| World hover and observed entities | `ui/world-hover.tsx`, `entity-view.ts`, `ui/panels.tsx` | World, Inventory: bounded preview, complete inspection route and no hidden knowledge |
| Character conditions and overhead status | `character-status.tsx`, `status-indicators.ts`, `status-indicators.css`, `reaction-notices.ts` | Foundations, World: readable meaning, simulated time, dense scenes and restrained notices |
| Speech captions and missed information | `speech-captions.tsx`, `ui/caption-gap-notice.tsx`, `ui-lifetime.ts` | World, System feedback: source permission, collision, lifetime and retained history |
| NPC conversation and composer | `ui/conversation.tsx`, `ui/composer.tsx`, `ui/auto-textarea.tsx`, `ui/message-status.tsx`, `ui/use-chat-history.ts` | Chat: IME, draft ownership, reading position, failure feedback and hide/end distinction |
| World Agent and inventions | `ui/world-agent.tsx`, `ui/inventions.tsx`, `ui/invention-settings.tsx` | Chat, Controls: candidate revision, real status, optional detail, approval versus installation |
| Creator/person editors | `ui/editor.tsx`, `ui/god-tools.tsx`, `ui/god-character-actions.tsx` | Controls, React: modal/dirty draft, shared fields, consistent authorization and explicit God mode |
| Save/load and recovery | `ui/game-saves.tsx` | System feedback: durable receipt, last-known-good save, compatibility, safe replacement and uncertain outcomes |
| Journal, activities, memories and events | `ui/history.tsx`, `ui/activity-history.tsx`, `ui/memory-history.tsx`, `ui/world-events.tsx`, `ui/event-time.tsx` | System feedback, Chat: scope, chronology, continuation, search, timestamps and retained reading position |
| Promises and commitments | `ui/promises.tsx` | Foundations, System feedback: status, evidence and read-only versus actionable scope |
| Intelligence and diagnostics | `ui/diagnostics.tsx` | Foundations, Controls, React: compact-to-detail navigation, JSON isolation, stable focus and diagnostic privacy |
| Presentation preferences and local persistence | `ui/world-visual-settings.tsx`, `ui/storage.ts` | System feedback, World: local preference versus world state, reset scope and accessibility |

## Choose checks by changed behavior

A small spacing correction needs the affected view, realistic content and its fit boundary; it does not require a full game playthrough. A shared combobox change needs its meaningful caller variants and keyboard/async states. Follow the existing policy: focused existing checks and bounded manual/ad-hoc scenarios are appropriate; do not author a new automated suite by default or run the whole repository merely because UI is involved.

For runtime UI changes, a typecheck/build alone is insufficient. Exercise the ordinary task and a relevant failure, cancellation or stale-state path. Inspect actual rendering where available. A design-only document can specify those cases without claiming they ran.

## Geometry and readability matrix

Use representative desktop, narrow and short viewports, for example 1280×720 and 1440×900 desktop fixtures plus the current narrow-sheet boundary. These are test fixtures, not new supported-device promises. Check 200% text enlargement and surrounding UI reflow at 320 CSS pixels separately; browser zoom, game UI scale and device pixels are not interchangeable.

Use long invented names, duplicate labels, multiline hints, wrapping validation, maximum supported input content, large counts and empty/loading/error states. Open the combinations the task actually permits: inventory with chat, popup inside a dialog, caption near a panel edge, or a sticky footer above a long form.

Pass conditions: no unintended control overlap, clipped essential text, inaccessible last row, obscured focused control, duplicate clear button or unreachable dismissal. Intentional anchored overlays can cover background content; their target and dismissal remain usable. Do not fix a failure by shrinking text or hiding the offending content.

## Interaction and failure scenarios

| Area | Exercise | Required outcome |
| --- | --- | --- |
| Combobox | Type, arrows, Enter, Escape, Tab, pointer selection, empty query, clear and blur | One coherent field; selected value, query and active option follow the declared contract |
| Remote choice | Type quickly, change actor/scope, load another page, receive a late result or a failure | No stale selection or leaked labels; loading/empty/error and continuation remain understandable |
| Clear-X | Inspect Blink, WebKit and Firefox with empty and nonempty search; keyboard and pointer clear | One neutral utility, no browser/custom duplicate, preserved focus and no form submission |
| Forms | Leave a numeric draft blank, exceed available quantity, fail server validation, switch tabs with edits | Input retained; useful associated error; no silent coercion, premature save or lost draft |
| Modal/popover | Open by keyboard, navigate, open child popup, dismiss, remove opener | Correct layer handles input; modal background is inert; focus returns sensibly |
| World | Dismiss picker over walkable ground; drag then release; wheel over list; type movement keys in chat; blur window | No accidental movement/action, camera zoom-through or stuck gesture |
| Inventory | Find duplicate-name items, navigate nested bags, split exact units, move after capacity/revision changes | Correct identity, destination, quantities, stale-state handling and understandable result |
| Large collection | Use a named large fixture, such as 1,000 objects, with search and long rows | Measure actual opening/input cost; retain complete permitted access and stable keyboard focus |
| Future bulk/trade | Hidden selection, page versus all-matches selection, partial failure, changed offer/price, duplicate submit | Honest affected scope, renewed agreement and no invented success or double action |
| Chat | IME Enter, paste multiline text, hide/reopen, switch conversation, type while a prior send is pending | Correct draft survives in the correct conversation; sending clears only the sent revision |
| Chat history | Scroll up during reply, prepend older messages, reconnect and receive a late message | Reading anchor and stable chronology retained; no duplicate turn or forced scroll |
| Invention | Edit during validation, inspect an old revision, receive late art, cancel and revise consequential scope | One current candidate, accurate evidence/status, no stale overwrite or implicit activation |
| Save/load | Fail a write, time out with uncertain result, fail pre-load preservation, select incompatible save | No false Saved claim; last-known-good state protected; explicit refusal/recovery, no automatic reset/migration |
| Notices | Burst of routine events plus a persistent failure, reduced motion and keyboard navigation | Important information remains retrievable; no repeated or focus-stealing interruption |

The large fixture is not an inventory cap. Existing [HV01 measurements](../limits/interface.md#hv01) describe a prior 1,001-stack workload and known costs; they are not new measurements from this pass.

## Accessibility and input qualification

Check visible labels/names, focus order, keyboard-only completion, dialog focus restoration, non-hover access to explanations, non-drag alternatives, text contrast, target spacing, reduced motion and forced colors as relevant. Use the actual supported screen-reader/browser combination where available. Record untested combinations; React Aria usage does not constitute a pass.

Controller and touch support require their own explicit focus/gesture paths and testing. Do not certify them from a desktop browser screenshot. Protect IME, dictation and normal text editing from game shortcuts. Camera/map exceptions do not exempt surrounding forms and chat from accessible operation.

## Measure outcomes, not just pixels

Record task, user/input mode, build, device, viewport/UI scale and collection size. Useful observations include completion without coaching, wrong-object actions, overlooked costs, abandoned drafts, navigation backtracking, input latency and opening latency. A critical transaction performed on the wrong item is a correctness failure even when its animation is smooth.

The roughly 100ms local feedback target in [UXL05](../limits/ui-ux.md#uxl05) is a proposal, not a result. Report distributions or meaningful slow cases, not one favorable run. Separate immediate input echo from network/model duration. Do not fabricate usability percentages or claim a small self-test predicts every player's experience.

## Agent-routing and documentation checks

The root and client instructions must route every matching UI/UX/frontend task, including new files, to one short core rule. That rule routes to only the relevant chapters. Research, unrelated feature owners and the 148-game corpus stay unloaded unless needed. A backend-only task mentioning React in prose should not pull in the whole handbook.

Review relative paths and heading anchors, source dates, proposal/current labels and preserved existing policies. Use the repository's `pnpm guidance:check` and pinned changed-file formatter when a runnable checkout is available. The guidance checker cannot by itself prove correct semantic triggering or agent compliance.

For native dispatch, inspect actual injected/read context in a matching frontend task, an unrelated task, a new-file case and a package-directory case. Test installed agent versions rather than assuming all harnesses load links automatically. Existing sessions may need their normal instruction reload/restart. Do not add mass imports to force every chapter into context.

## Evidence for this documentation change

Research, selected source inspection and documentation review are the evidence produced here. Runtime/browser interaction, assistive-technology testing, quantitative usability testing, `pnpm guidance:check`, the pinned formatter and native agent-dispatch checks were not executed in this connector-only workflow. The final commit/PR records the actual Git write and diff review separately. These missing checks remain explicit in [UIUX06](../maintainers/ui-ux.md#uiux06); no gameplay or accessibility qualification is closed by this handbook.
