# Verification and current-surface coverage

[Handbook](README.md) · [Repository policy](../../.agents/rules/verification.md) · [Follow-through](../maintainers/ui-ux.md)

## What this evidence establishes

Research conducted September 30–October 1, 2026 inspected UI structure, relevant design owners and selected implementation bodies at runtime baseline `0382be76648879cf8a8397ad6c3534b4431916f5`, then evaluated the handbook against authoritative sources and pinned company code. Handbook revision `e8d6c8950cadd715cfed97df4a0e379ff1593d02` identifies the version critiqued, not a different runtime baseline. No game launch, computed-style inspection, assistive-technology run or user study was performed. This coverage map routes work; it does not certify components.

| Evidence class | Finding | Implication |
| --- | --- | --- |
| Implementation inspection | SelectField already uses React Aria ComboBox, Input, Popover and ListBox | Preserve the composite; the historical nested-widget report is not a confirmed current defect |
| Implementation inspection | SubjectPicker has 150ms debounce, request guards, scoped labels and paged deduplication | Shared changes must preserve remote-search/privacy behavior |
| Implementation inspection | Inventory has native search, quantities, nested containers, movement, split/merge and history | Browser clear chrome is only an unconfirmed cause; build on existing capabilities |
| Existing accepted contract | UI brief/production guide specify spacing, panel adaptations, tooltips, camera and conversation feedback | Research supplements instead of silently replacing these |
| User report, not reproduced | Nested/overlapping typeahead and inappropriate blue clear-X | Retain concrete reproduction scenarios |
| Primary-source evidence | Primer searchable panels; Adobe prop/overlay code; company design/engineering notes | Support precise interaction contracts without certifying local runtime |
| Future guidance | Advanced comparisons, bulk management, loadouts and trading | Not delivered game features |

Implementation references: [shared controls](../../apps/client/src/design-system/components.tsx), [subject picker](../../apps/client/src/ui/subject-picker.tsx), [inventory](../../apps/client/src/ui/inventory.tsx). Contracts: [production guide](../../apps/client/src/design-system/README.md), [UI brief](../ui-design-brief.md). Sources, pins and retrieval limits: [research ledger](research.md).

## Current-surface coverage

Paths below are relative to `apps/client/src/`. Each listed surface has a destination, but listing does not claim full implementation-body inspection. Feature owners remain controlling; inspect actual changed callers.

| Surface | Current entry points | Guidance and risks |
| --- | --- | --- |
| Shared controls, icons, fields, meters, panels | `design-system/components.tsx`, `design-system/components.css`, `design-system/layout.css`, `design-system/tokens/`, `design-system/progress-ring.tsx` | Foundations, Controls, React: coherent controls, tokens, focus, composition, overflow, time meaning |
| HUD, docking, launchers | `main.tsx`, `ui/hud-layout.ts`, `ui/panels.tsx` | Foundations, World: collisions, order, narrow sheet, world visibility and continuity |
| Inventory and creation | `ui/inventory.tsx`, `ui/item-creation.tsx` | Inventory, Controls: scope, quantities, containers, clear behavior, authority |
| Actions/quick access | `ui/action-picker.tsx`, `ui/quick-actions.tsx`, `ui/action-attempts.tsx`, `action-browser.ts` | World, Controls: target meaning, search/invent boundary, reasons, duplicate execution |
| Pullouts/subjects | `ui/pullout.tsx`, `ui/subject-picker.tsx` | Controls, System feedback: popup/picker semantics, remote states, paging, permitted labels |
| Camera/picking/presentation | `ui/camera-controls.tsx`, `world-camera.ts`, `scene.ts`, `world-renderer.ts`, `world-presentation.ts` | World, React and PlayCanvas: gesture ownership, recovery, floors, occlusion, frame work |
| Hover/observed entities | `ui/world-hover.tsx`, `entity-view.ts`, `ui/panels.tsx` | World, Inventory: bounded preview, complete inspection, hidden knowledge |
| Character/overhead status | `character-status.tsx`, `status-indicators.ts`, `status-indicators.css`, `reaction-notices.ts` | Foundations, World: meaning, time, density, importance |
| Speech/missed information | `speech-captions.tsx`, `ui/caption-gap-notice.tsx`, `ui-lifetime.ts` | World, System feedback: permission, collision, lifetime, history |
| NPC chat/composer | `ui/conversation.tsx`, `ui/composer.tsx`, `ui/auto-textarea.tsx`, `ui/message-status.tsx`, `ui/use-chat-history.ts` | Chat: IME, drafts, reading anchor, failure, hide/end |
| World Agent/inventions | `ui/world-agent.tsx`, `ui/inventions.tsx`, `ui/invention-settings.tsx` | Chat, Controls: candidate revision, actual status, correction, approval/installation |
| Creator/person editors | `ui/editor.tsx`, `ui/god-tools.tsx`, `ui/god-character-actions.tsx` | Controls, React: modal/dirty draft, shared fields, authority, God mode |
| Saves/recovery | `ui/game-saves.tsx` | System feedback: durable receipt, previous save, compatibility, replacement, uncertain outcomes |
| Journal/activities/memory/events | `ui/history.tsx`, `ui/activity-history.tsx`, `ui/memory-history.tsx`, `ui/world-events.tsx`, `ui/event-time.tsx` | System feedback, Chat: scope, chronology, continuation, search, timestamps, reading position |
| Promises | `ui/promises.tsx` | Foundations, System feedback: status/evidence, read-only/actionable distinction |
| Intelligence/diagnostics | `ui/diagnostics.tsx` | Foundations, Controls, React: detail navigation, JSON isolation, focus, privacy |
| Preferences/local persistence | `ui/world-visual-settings.tsx`, `ui/storage.ts` | System feedback, World: scope, reset, privacy, accessibility |

## Choose checks by changed behavior

A spacing correction needs its view, realistic content and fit boundary, not a full game playthrough. Shared controls need meaningful caller/keyboard/async variants. Use focused existing checks and small manual/ad-hoc scenarios; do not author a new suite by default or run the whole repository just because UI is involved.

Runtime changes require actual interaction and relevant failure/cancellation/stale-state behavior plus visual inspection where available. Typecheck/build alone is insufficient. Design-only docs specify these cases without pretending they ran.

## Geometry and readability matrix

Use representative desktop, narrow and short windows, such as 1280×720 and 1440×900 plus the current narrow-sheet boundary. These are fixtures, not new supported-device promises. Check 200% text enlargement and surrounding UI reflow at 320 CSS pixels separately: browser zoom, game UI scale and physical pixels differ.

Use long/duplicate invented names, multilingual/RTL strings, multiline hints, errors, supported maximum input, large counts and empty/loading/error states. Exercise permitted combinations: inventory with chat, popup inside dialog, caption at panel edge, sticky footer over a long form. Resize during a dirty edit, not only from an empty initial view.

Pass conditions: no accidental overlap, clipped essential text, inaccessible final row, obscured focus, duplicate clear or unreachable dismissal. Intentional anchored overlays can cover background content while remaining usable. No fixing failures by shrinking text, disabling zoom or hiding the problem.

## Interaction and failure scenarios

| Area | Exercise | Required outcome |
| --- | --- | --- |
| Combobox | Type, arrows, Enter, Escape, Tab, pointer, empty query, clear, blur | One coherent field and declared query/selection/active-option contract |
| Searchable picker | Button-open, search, single/multi choice, cancel/confirm, narrow adaptation | Input outside trigger; clear local-choice versus committed-effect boundary; retained selection |
| Remote choice | Rapid typing, scope switch, paging, late results/failure | No stale selection/leaked labels; truthful results and continuation |
| Clear-X | Relevant Blink/WebKit/Firefox, empty/nonempty, keyboard/pointer and forced colors | One quiet utility, retained focus, no submit, accessibility colors preserved |
| Disabled action | Keyboard/touch discovery of a blocker; attempt activation through all supported inputs | Reachable reason; native-disabled or correctly guarded aria-disabled behavior |
| Forms | Blank number, invalid quantity, server error, dirty tab switch/remote refresh | Draft retained; associated error; no coercion, silent overwrite or premature save |
| Nested overlays | Dialog → child picker → Escape; focus moves into child; opener removed | Child handles first, parent draft retained, background inert, sensible focus return |
| World | Dismiss over walkable ground; drag release; wheel over list; type movement keys; blur | No movement/zoom-through, duplicate action or stuck gesture |
| Inventory | Duplicate-name objects, nested bags, exact split, changed capacity/revision | Correct identity, quantities, destination and stale recovery |
| Adaptive panes | Resize selected-item detail, dirty transfer/editor, chat with keyboard visible | Same selected object/draft and useful Back/reading anchor; Send/Save reachable |
| Large collection | Named fixture such as 1,000 objects with search/long rows | Measure real opening/input costs; complete permitted access and stable focus |
| Future bulk/trade | Hidden selection, page/all distinction, row/batch ambiguity, partial failure, offer change, duplicate submit | Honest scope, renewed agreement, no invented success or duplicate effect |
| Chat | IME, multiline paste, hide/reopen, conversation switch, new draft during pending send | Draft stays with its conversation; clear only the sent revision |
| History | Scroll up during reply, prepend, reconnect/late messages | Stable chronology/anchor, no duplicate or forced scroll |
| Invention | Selective correction, edit during validation, old revision, late art, cancel/scope change | One candidate, meaningful evidence/status, no stale overwrite or implicit activation |
| Persistence | Back/Forward, reload, account/world switch with retained draft/search | Correct permitted navigation, no private text exposed in URL or another scope |
| Save/load | Write failure, uncertain timeout, preservation failure, incompatible save | Truthful receipt/refusal; last-known-good save protected; no reset/migration |
| Notices | Routine burst plus failure, typing while result arrives, reduced motion | Important information retrievable; no routine focus theft or forced fake pending |
| Shared wrapper | Consumer/internal handlers, ref, label/error IDs, keyboard/pointer activation | No overwritten behavior, wrong node, lost association or duplicate mutation |

Large fixtures are not caps. [HV01](../limits/interface.md#hv01) retains earlier 1,001-stack observations; the handbook adds no measurements.

## Accessibility and input qualification

Check labels/names, focus order, keyboard completion, modal return, non-hover explanations, non-drag alternatives, contrast, target spacing, motion and forced colors as relevant. Use actual supported screen-reader/browser combinations where available and record those not tested. React Aria is not an accessibility pass.

Touch/controller need explicit gestures/focus paths and qualification. Protect IME/dictation/normal editing from world shortcuts. A map's two-dimensional layout exception does not exempt its chat and forms. Disabled semantics, focusability and actual activation prevention require separate checks.

## Measure outcomes, not just pixels

Record task, input mode, build, device, viewport/scale and collection size. Observe uncoached completion, wrong-object actions, missed costs, abandoned drafts, backtracking, input and opening latency. Smooth animation does not excuse a transaction on the wrong object.

[UXL05](../limits/ui-ux.md#uxl05)'s roughly 100ms local target is a proposal, not a result. Report distributions/slow cases; separate input echo, field INP, frame timing and network/model duration. No fabricated usability percentages or population claims from a self-test. Evaluate whether uncertainty/capability explanations actually help a player distinguish supported, proposed and verified work.

## Agent-routing and documentation checks

Root/client routes must send matching UI/UX/frontend work, including new files, to one short core and only relevant chapter sections. The research ledger and game corpus stay optional. A backend task mentioning React in prose should not load the handbook.

Review paths/anchors, source attribution/dates, proposed/current labels and preserved policies. When incorporating research, retain useful evidence and source IDs in the unified ledger, update the relevant principles in place, and repair inbound links before removing a redundant document. Do not make readers reconcile separate revision-specific findings.

Run `pnpm guidance:check` and pinned changed-file formatting in a runnable checkout. The checker does not prove semantic triggers or agent compliance. For native dispatch, inspect actual injected/read context in a frontend task, unrelated negative case, new-file case and client-package working directory. Record installed versions. Existing sessions may need their normal reload; do not mass-import chapters to bypass selective routing.

## Evidence and outstanding checks

Evidence consists of selected Open Legend source/specification inspection, authoritative design/engineering guidance, the specified Primer source excerpts, complete Adobe overlay/prop-composition files at pinned commits, and documentation/diff review. The [ledger](research.md) records source scope and web retrieval limits. Reading these implementations does not establish their runtime behavior in Open Legend.

The recorded October 1 research environment lacked `pnpm`, and fetching a pinned repository snapshot failed DNS resolution. GitHub connector reads/writes worked, but the pinned formatter and guidance checker were not run. Browser, assistive-technology, usability and native agent-loading checks also remain unrun. [UIUX06](../maintainers/ui-ux.md#uiux06) retains those gaps. Documentation consolidation does not change the evidence baseline or close runtime acceptance; its commit/PR records the affected-diff review separately.
