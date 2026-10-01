# React implementation and accessibility

[Handbook](README.md) · [Client rules](../../apps/client/AGENTS.md) · [Existing component guide](../../apps/client/src/design-system/README.md)

## Reuse at the level of meaning

Use four conceptual layers without creating four new frameworks:

| Layer | Responsibility | Current location / example |
| --- | --- | --- |
| Tokens | Semantic spacing, typography, color, control roles | `design-system/tokens`, existing CSS |
| Interaction primitives | Correct button, field, combobox, dialog, tooltip, list behavior | Existing React Aria-based shared components |
| Game components | Item row, action choice, meter, panel, composer, quantity/transfer view | `design-system/components.tsx` and focused `ui` components |
| Connected features | Permitted queries, drafts, server intentions, workflow orchestration | `ui/inventory.tsx`, `ui/world-agent.tsx`, editors and other callers |

Before adding a component, inspect the existing owner and its callers. Similar markup is not sufficient reason to share a component; the behavior and meaning should also match. Conversely, the same searchable choice should not have separate clear/focus/keyboard logic in five panels.

Use function-component composition, ordinary props, children/slots and focused hooks. A Panel can own header/body/footer layout while its feature owns the draft and command. An ItemRow can own identity/selection presentation without knowing network endpoints. Do not use parent component classes or inheritance to share layout. Do not create a universal Form/Panel component with dozens of unrelated boolean flags to avoid a small clear composition.

Extract when there is a real shared semantic contract or an important consistency boundary. Keep a one-off feature local until its reusable shape is understood. Public component props should express intent, not require callers to know internal CSS selectors or copy ARIA state plumbing. A cosmetic variation should usually be a token/variant, not a fork of interaction behavior.

## Preserve semantic and visual ownership

The primitive owns its interaction contract; the component owns its visual group; the feature owns its data and mutation. A combobox caller supplies options, selected key and query behavior where controlled. It should not mount another input inside the primitive's trigger or override keyboard handlers until the accessibility pattern breaks.

Keep utility button roles explicit. Clear, toggle, close and primary submit are not interchangeable variants. A form utility must not accidentally submit. Interactive row children should be siblings or structured slots, not nested buttons or links. A listbox option is not an arbitrary mini-form; actions needing their own controls belong in a suitable grid/list pattern or adjacent detail.

Avoid exposing a raw third-party API everywhere, but do not wrap it so aggressively that labels, descriptions, disabled state, focus, refs and accessibility props cannot reach the underlying element. Follow the installed dependency's API, not a remembered version or a new documentation example that the lockfile does not support. This change does not install or upgrade packages.

## One owner per state value

Separate server truth, local draft, interaction state and derived display state. Share state at the closest appropriate common owner, not a global store by default. Derive totals, filtered views and button labels from their real inputs instead of synchronizing duplicate copies through Effects. [F13](research.md#f13)

Use stable IDs for items, messages, conversations and drafts. An array index or display name is not safe identity when objects reorder, names collide or history is prepended. Preserve state through ordinary rerenders and deliberately reset it when the owning identity truly changes. Do not define component functions inside render and accidentally create a new component identity each time. [F14](research.md#f14)

Represent mutually exclusive workflow states clearly, for example `idle | loading | ready | failed`, with the data needed for each. Avoid independent booleans that permit impossible combinations such as saved-and-failed-and-pending. A reducer can help when a real workflow has several transitions; it is not mandatory for every text field.

Closing a view, clearing a query, discarding a draft, cancelling a request and ending a conversation are separate transitions. A refactor must not collapse them because they all currently call a setter with an empty value.

## Effects, asynchronous work and mutations

Effects synchronize with external systems and clean up their resources. Do not use an Effect to re-save every derived field or trigger a purchase after selection changed. Event handlers express explicit user intent; reads and effects cannot silently become mutations. [F15](research.md#f15)

Key async results by query, scope, actor/world generation and relevant revision. Abort obsolete reads where supported and ignore stale completions even when transport cancellation is not available. Clean up timers, subscriptions, observers and pointer capture. Unmounting a panel must not leave a delayed state update attached to another conversation.

A disabled button and local `busy` state are useful feedback, not a concurrency or idempotency guarantee. Consequential writes use the existing request identity, expected revisions and authoritative mutation path. Do not optimistically announce a trade, save or installation as completed. A harmless local preference can preview optimistically when rollback is meaningful.

On shared-component changes, inspect all caller variants: empty selection, disabled options, remote/local filtering, long descriptions, load-more, portal hosts and form nesting. The current SelectField supports more than a short local options array; simplifying it must not remove remote-search or privacy protections.

## CSS must express layout, not repair accidents

Use the existing token and component CSS owners. Parent layout owns gaps and placement; a child should not contain negative margins that only work in one parent. Prefer Grid/Flex sizing over absolute positioning for ordinary forms. Use absolute positioning only where anchoring is intentional and space/collision behavior is defined.

Give shrinking text/content children `min-inline-size: 0` when needed, wrap long tokens deliberately, and use bounded scroll regions with visible access to the full content. Do not fix overflow by globally applying `overflow: hidden`. Reserve space for field utilities and sticky footers. Focus rings, popovers and validation messages must survive UI scale and short viewports.

Use semantic tokens and `currentColor` for utility SVGs. Scope resets to components; never remove outlines globally or assume browser-default blue is the desired theme. Portalled overlays must inherit the intended theme through the existing root class/token mechanism. Larger z-index values do not fix a clipped ancestor or missing modal isolation.

Do not animate layout in ways that move a target during an attempted click. Respect reduced motion and forced colors. Keep visual theme/preferences separate from world semantics; changing a CSS class cannot change what the player is authorized to know or do.

## Accessibility is a behavior contract

Use native HTML when it fits and preserve the established React Aria pattern when it does not. Add ARIA to describe correct behavior, not to disguise an incompatible structure. Accessible names include the visible label; hints/errors use associations rather than duplicate labels. Decorative icons are hidden from screen readers. [F07](research.md#f07) [F08](research.md#f08)

WCAG 2.2 provides useful web-interface baselines: normal text contrast generally 4.5:1 and qualifying large text 3:1; meaningful non-text UI contrast generally 3:1; keyboard access, visible focus and text enlargement are essential. Its AA target-size criterion uses 24×24 CSS px with specified exceptions, while 44×44 is an enhanced target. Do not call every 24px control comfortable, or call 44px universally required at AA. Open Legend's proposed preferred touch sizes are design defaults, not a conformance claim. [F06](research.md#f06) [F11](research.md#f11)

Check 200% text enlargement and reflow of surrounding UI at a 320-CSS-pixel viewport. WCAG's exception for genuinely two-dimensional content such as some maps does not exempt the surrounding chat, forms, menus or settings. Use suitable alternate navigation for the world itself. [F12](research.md#f12)

Modal focus is contained and restored; non-modal panels do not trap the user. Keyboard users can reach full item names, explanations and actions without hover. Dragging has another supported method. Canvas focus is apparent, and game shortcuts do not steal input from text fields. For controller support, explicitly define focus movement, confirm/cancel and return behavior rather than equating Tab support with gamepad support. [F10](research.md#f10) [F16](research.md#f16)

## Performance follows actual work

Keep scene/frame-position work in PlayCanvas or the existing presentation boundary rather than rendering the whole HUD every frame. Subscribe to the smallest meaningful state and use stable identities where they prevent real work. Measure before blanket memoization; memoizing unstable inputs does not remove the underlying cost.

Large collections need bounded fetching and potentially virtualization, but neither is permission to hide records or break keyboard navigation. A virtualized list must retain reachable options, correct focus and stable reading behavior. Do not render thousands of heavy rich-tooltip bodies to show a compact list. Defer expensive detail until requested while keeping essential decision facts immediately available.

Measure keystroke-to-visible-update, opening latency, frame interference and memory under named workloads and hardware. Separate local input feedback from network/model duration. The existing [large-pile measurements](../limits/interface.md#hv01) already identify a concrete area to recheck; documentation does not make that performance issue disappear.

## Review contract

For a frontend change, state the component owner reused, state/mutation ownership, affected callers, important keyboard/pointer behavior, and the ordinary plus failure scenario exercised. Verify with existing focused checks and actual interaction where available; follow the repository's no-new-tests-by-default policy. A build is not proof of correct focus, readable spacing or a neutral clear-X. [Verification](verification.md)
