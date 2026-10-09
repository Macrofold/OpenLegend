# React implementation and accessibility

[Handbook](README.md) · [Client rules](../../apps/client/AGENTS.md) · [Existing components](../../apps/client/src/design-system/README.md)

## Reuse at the level of meaning

Use four conceptual layers without creating four frameworks:

| Layer                  | Responsibility                                                             | Current location / example                              |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Tokens                 | Semantic spacing, typography, color and roles                              | `design-system/tokens`, existing CSS                    |
| Interaction primitives | Correct button, field, combobox, dialog, tooltip and collection behavior   | Existing React Aria-based shared components             |
| Game components        | Item row, action choice, meter, panel, composer and quantity/transfer view | `design-system/components.tsx`, focused `ui` components |
| Connected features     | Permitted reads, drafts, server intentions and orchestration               | `ui/inventory.tsx`, `ui/world-agent.tsx`, editors       |

Inspect owners and callers before extracting. Similar syntax is not sufficient shared meaning; equally, five searchable choices should not duplicate clear/focus/keyboard machinery. Use function components, props, children/slots and focused hooks. A Panel owns layout while the feature owns its draft/command; an ItemRow need not know endpoints. Avoid inheritance, a new framework or a universal component with unrelated flags.

Extract a real reusable contract or important consistency boundary; keep a one-off local until its shape is understood. Public props express intent instead of requiring copied ARIA plumbing or internal selectors. A cosmetic variation usually belongs in tokens/variants, not forked behavior.

## Preserve semantic and visual ownership

The primitive owns interaction, the component owns its visual group, and the feature owns data/mutation. An editable combobox and a button-opened searchable panel are both valid but have different focus/state contracts. Do not nest an input in a button or override primitive keyboard behavior accidentally. [Controls](controls.md#a-combobox-is-one-composite-control)

Keep clear, toggle, close and submit distinct. A form utility must not submit. Interactive row actions should be siblings or suitable slots, not buttons inside buttons. Listbox options are not mini-forms; collections with separately interactive cells need an appropriate list/grid pattern and explicit keyboard model.

A CSS grid does not require ARIA `grid`. Use semantic lists/tables when they describe the task, and adopt a composite grid only when implementing its navigation/editing obligations. Inspection, focus, row selection and a bulk operation are different interactions. [S09](research.md#s09)

## Component composition must preserve behavior

For each wrapper or slot, identify the actual interactive DOM element and verify this chain:

1. The visible label, accessible name, description/error IDs, disabled/busy state and semantic element reach the right node.
2. Focus/measurement refs reach that node; combine internal and external refs using the installed library's supported mechanism.
3. Internal and consumer event handlers are deliberately composed rather than overwritten by JSX spread order.
4. Class/style variants preserve focus, selected, pressed, disabled and forced-color treatment without leaking feature-only props into the DOM.

Radix's composition guidance demonstrates why a custom leaf must accept injected props and refs. This is an engineering principle, not a request to add Radix or copy a ref API from a different React version. Use the pinned local stack. [S06](research.md#s06)

Adobe's inspected `mergeProps` implementation chains handlers and combines classes/IDs/refs, while other properties follow override rules. Do not infer that every installed version has the same ref handling, or that chaining honors `defaultPrevented` automatically. Read the relevant installed helper and choose the ordering/cancellation contract. Primer's picker explicitly checks `defaultPrevented` after its item callback before applying selection. [S05](research.md#s05) [S01](research.md#s01)

`preventDefault` cancels a default action; propagation control prevents other listeners from receiving an event. Neither is a universal substitute for the other or for authority checks. Do not attach the same mutation independently to `onClick`, `onPress` and keyboard handlers. A shared interaction primitive should normalize input into one semantic intent. Preserve native link behavior, text selection and modifier keys when wrapping navigation.

Do not wrap a library so aggressively that labels, descriptions, focus and refs cannot pass through. Conversely, do not expose every vendor option as the public API of every game component. Keep a narrow semantic API with a deliberate escape hatch when a real caller requires one.

## One owner per state value

Separate server truth, local draft, interaction state and derived values. Share state at the closest suitable owner rather than defaulting to global storage. Derive totals, views and labels instead of Effect-synchronizing duplicate copies. [F13](research.md#f13)

Controlled and uncontrolled inputs are both tools. Choose controlled state when synchronized selection, validation or draft ownership needs it; native/uncontrolled fields can suit simpler independent forms. Do not convert the whole app because an external checklist prefers one. The deciding requirement is predictable ownership and preservation through the actual workflow. [S07](research.md#s07)

Use stable IDs, not index/name keys when items reorder, labels collide or older messages prepend. Preserve state across ordinary rerenders, resetting deliberately when its owning identity changes. Nested component definitions can unintentionally reset state. [F14](research.md#f14)

Represent mutually exclusive states coherently, such as `idle | loading | ready | failed`, rather than impossible boolean combinations. A reducer is useful for a real transition-heavy workflow, not mandatory per field. Hide, clear query, discard draft, cancel request and end conversation are separate transitions even when they happen to clear values.

Keep draft identity and the backend revision it was based on. An incoming refresh must not silently overwrite a dirty editor. Show changed remote data and reconcile through the existing revision/Save contract. Resizing, docking or switching responsive presentations must not remount away the draft or selected object. [S08](research.md#s08)

## Effects, asynchronous work and mutations

Effects synchronize external systems and clean up resources. Derive display data in render where appropriate; explicit handlers express mutation intent. An Effect responding to selection must not purchase/equip/save as an accidental consequence. [F15](research.md#f15)

Key results by query, actor/world scope and relevant revision. Abort obsolete reads where supported and ignore stale completions even without cancellation. Clean up timers, subscriptions, observers and capture. A delayed callback from a closed panel must not update a different conversation.

A mutation can change permitted detail without changing the selected item or its quantity: inspecting a recipe record reveals its method, and learning changes its feedback. Refresh the affected read explicitly through its existing owner, preserve selection/focus, and fence late results against changed selection and scope. Verify the updated detail and next action immediately after success, including a pending read when the player switches objects. Also exercise changes initiated outside the open panel: inspecting a different object can remove the selected record's permitted method facts and learning action. New list reads and memoized display calculations also load [performance guidance](../../.agents/skills/openlegend-performance/SKILL.md#repeated-readers-and-fresh-projections); list identity alone is not a complete dependency key. [O01](research.md#o01)
Give polling and refresh after a write one bounded read owner per scope. Schedule the next poll after completion or use an equivalent single-flight guard; slow requests must not accumulate overlapping reads or a backlog. Keep read failure separate from a write acknowledgement. Retain drafts and the selected object's identity when it temporarily leaves the permitted view, with an explicit unavailable explanation. Suppress a preview or edit whose required facts could not be refreshed until a successful read restores them; old display data is not current permission. [Local shelter evidence](research.md#ol01) includes requests slower than the poll cadence, deliberate failures and sleep/wake selection changes.

Local busy/disabled presentation is not idempotency or concurrency control. Consequential writes retain request identity, expected revisions and the authoritative mutation path. Do not optimistically announce completed saves, trades or installation. Reversible local preferences may preview optimistically when rollback is meaningful.

Review all meaningful shared-component variants: empty/disabled selection, local/remote filtering, descriptions, load-more, portal hosts and form nesting. Preserve SelectField's remote-search/privacy support. Source-code patterns from another company are evidence of tradeoffs, not permission to copy their feature flags, compatibility shims or unrelated dependencies. [S01](research.md#s01) [S04](research.md#s04)

## CSS must express layout, not repair accidents

Use current token/component owners. Parents own gaps and placement; avoid negative margins that work only in one host. Prefer Grid/Flex for ordinary forms; use absolute positioning for intentional anchoring with defined collision behavior. Give shrinking children `min-inline-size: 0`, wrap long tokens deliberately and preserve access to complete content. Do not globally hide overflow.

Reserve space for field utilities and sticky footers. A panel or pane may own a bounded scroller; do not nest competing scrollers for the same reading task. Focus and the last row must remain visible. Use actual available space for overlays and account for software keyboards, safe areas and zoom. [S03](research.md#s03) [S08](research.md#s08)

Use semantic tokens and `currentColor`; scope resets, preserve outlines and forced colors. Portals need the existing theme root/token context and correct focus/dismissal scope. Z-index cannot repair a clipped ancestor or absent modality. System focus color is not accidental theme drift.

Animate only useful properties, avoiding blanket `transition: all` that can move controls unexpectedly. Respect reduced motion. Do not move a target during an attempted click or let animation delay a truthful completed/failed state. Presentation preferences never change knowledge or authority. [S07](research.md#s07)

## Localization and realistic content

Use logical layout directions, meaningful units and explicit locale-aware display/parsing where supported. Keep canonical IDs/quantities separate from translated labels/formatted numbers. Do not parse a displayed thousands separator as a decimal or normalize an identifier as if it were search text. Test duplicate names, long translations, right-to-left text and input composition. These are robustness cases, not a claim of delivered localization.

Search matching should deliberately specify locale/case/diacritic behavior and compare only permitted display text. UI truncation should not corrupt characters or make two identities indistinguishable; keep a route to the full permitted label. Native editing, copy/paste and IME behavior must survive customization. Adobe's combobox engineering and Vercel's internationalization notes motivate the checks; world names and server search contracts still control. [S03](research.md#s03) [S07](research.md#s07)

## Accessibility is a behavior contract

Use native HTML when suitable and preserve established React Aria behavior otherwise. ARIA describes correct behavior, not an incompatible structure. Accessible names include visible labels; associate hints/errors and hide decorative icons. [F07](research.md#f07) [F08](research.md#f08)

WCAG 2.2 provides web-interface baselines: generally 4.5:1 normal text, 3:1 qualifying large text and meaningful non-text UI, plus keyboard access, visible focus and resizing. AA target size is 24×24 CSS px with specified exceptions; 44×44 is enhanced. Neither is a complete comfort or conformance test. Do not replace normative criteria with a vendor's preferred contrast algorithm while claiming WCAG compliance. [F06](research.md#f06) [F11](research.md#f11) [S07](research.md#s07)

Check 200% text enlargement and surrounding UI reflow at 320 CSS px. Genuinely two-dimensional map exceptions do not exempt chat/forms/menus. Do not disable browser zoom to prevent mobile input auto-zoom; test readable input sizing and visible-viewport layout instead. [F12](research.md#f12) [S03](research.md#s03)

Modal focus is contained/restored and child popups work within that boundary. Ordinary non-modal panels do not trap focus. Essential explanations have non-hover routes, dragging has alternatives, and canvas shortcuts respect text input. Native disabled controls do not support an assumed focus tooltip; `aria-disabled` needs actual activation guards. [Controls](controls.md#disabled-controls-and-reachable-explanations)

Controller support needs its own focus movement, confirm/cancel and return behavior; Tab support is not sufficient evidence. Touch, keyboard and pointer paths need equivalent task access even when gestures differ. [F10](research.md#f10) [F16](research.md#f16)

## Performance follows actual work

Keep per-frame scene/position work at the PlayCanvas/presentation boundary rather than rerendering the whole HUD. Subscribe to meaningful state and measure before blanket memoization. Stable data identity helps only when it avoids real work.

Bound fetching/rendering without hiding records. Virtualization, when warranted, retains reachable options, focus and reading position; it does not replace server search or justify filtering only mounted rows. Defer expensive rich detail rather than mount thousands of tooltip bodies. Keep immediate decision facts available.

Measure input-to-visible-feedback, panel opening, frame interference and memory with declared hardware/workloads. Google's good-INP threshold of 200ms at the 75th percentile of page visits is a web responsiveness metric, not our proposed per-control 100ms target, a frame budget, or a promise to finish network/model work in 200ms. No field measurement is established here. [S15](research.md#s15) [UXL05](../limits/ui-ux.md#uxl05)

Existing [large-pile measurements](../limits/interface.md#hv01) remain a concrete gap to revisit, not a problem fixed by this document.

## Review contract

State the component reused, draft/mutation ownership, caller variants, prop/ref and event composition, important keyboard/pointer behavior, and ordinary plus failure scenarios exercised. Use focused existing checks and actual interaction where available under the no-new-tests-by-default policy. A build cannot demonstrate correct focus, spacing or a quiet singular clear-X. [Verification](verification.md)
