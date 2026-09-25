# Open Legend UI system

## Camera and spatial interaction

The [spatial owner](../../../../docs/spatial-world.md#picking-and-controls) defines meanings rather than another camera schema here. The compact camera toolbar uses focusable icon controls with hover/focus labels, a follow toggle beside recenter and a shortcut help icon; drag pans, Shift-drag orbits/tilts, wheel zooms, and focused-canvas arrows/Page Up/Page Down/P/Home control the view. Pointer capture ends without action after a drag. A level selection is not a movement command. The small renderer interface is plain TypeScript; PlayCanvas types stay in scene/art implementation. Multi-touch pinch and assistive-device qualification remain SW09/SW16 work.

This is the production port of the supplied September 20 design system. React owns the HUD and world-status markup. React Aria provides buttons, toolbars, radio groups, conversation tabs and delayed tooltips. PlayCanvas still renders the world and supplies screen coordinates; it never authorizes actions.

- `components.tsx`: typed shared controls, semantic icons, meters, rows, panels and explanations.
- `components.css`: supplied theme/component styling, with preview-only landscape removed.
- `layout.css`: production docking, narrow sheets, scale, status overlays and explicit product adaptations.
- `tokens/`: the supplied Wilderness, Fantasy and Sci-fi tokens, including the data catalogue.
- `fonts/`: self-hosted WOFF2 assets and their original OFL notices.
- `icons/`: curated semantic SVG data, author credits and Lucide license. Only these repository-owned SVG bodies are rendered as markup. User/model content always renders as React text.
- `../ui/`: connected game panels and workflows; keep transport and orchestration outside reusable visual controls.

Use semantic token names, a 4px spacing scale, the supplied display/UI/utility type roles, and accessible names on every icon button. Unknown content receives an initial-letter sigil. Do not use emoji or imply that generated artwork is being requested when no art job exists. Keep one primary gold action per panel; focus uses sage in action search. Game-icons.net art is CC BY 3.0, Lucide ISC, and fonts OFL; first-party code remains AGPL-3.0-only.

Use `TextTooltip` for plain hover/focus labels such as Retry and short disabled explanations. It sizes to its text without a background, border, padding or shadow. Use `Explanation` only for richer action details and facts.

## Accepted adaptations

The attached reference instructions are design input. The user's explicit overrides govern this port:

- Work above characters is a continuous white bar, interpolated against the server's simulation rate and frozen while paused. It disappears on completion/cancellation. Keep at most three transient notices, separate from active work.
- Quick circles are contextual suggestions plus three persisted shortcuts. In the quick-action bar, rings are reserved for actual action cooldowns. Current actions have no cooldown contract, so no rings are shown there; never feed work progress into them.
- Pausing does not change clock width. World-agent and Talk/invention panels are 504px (1.5 × the normal 336px), with larger tabs and 32px close/new controls.
- Search retains “Search actions or invent something…” and an inline invention affordance for unmatched text. Enter opens an editable invention draft; only explicit Send dispatches. There is no separate invention row below the search.
- Look closer uses current server-projected descriptions. Hover facts use actual native work durations and material yields/costs; berry gathering is 30 game seconds plus travel and has no explicit energy cost.
- God actions always carry a visible **God mode** label. Ground **Add something** opens the reusable right-hand `Pullout` by hover, click or keyboard, then the Items, Actors and Environment categories. Leaf catalogues are searchable and show eight rows before scrolling. [Base-world items](../../../../docs/worlds/base/items.md) owns item creation, pile menus and drop quantities; player inventory uses the same installed-item catalogue as other-character editing. Person creation is a React Aria modal; trait search exposes descriptions and selected traits become removable tags. Character panels group applicable owner controls under **God mode**: **Revive**, **Grant cognition and speech**, **Edit Person** and **Inspect private mind**. Panel and context-menu revival/cognition visibility share one predicate; mutations use the same server handlers. Edit Person opens on Character with current statuses, shared editable Needs meters and an empty Stats section. Inventory has searchable item-type selectors, whole-number quantities and add/remove controls. Identity contains name, description, personality, backstory, traits and goals. Edits across tabs remain drafts until Save.
- Traits are saved domain data, sampled three without replacement from `packages/domain/src/worlds/base/config/traits.json`. They are descriptive starting dispositions, not earned bonuses. The character sheet shows the player's scoped memories and observed history; private NPC cognition stays behind god authorization.
- Conversation inputs begin at one line and grow with wrapping or explicit newlines. Active replies use an animated three-dot wave on the originating message; successful replies have no status badge, failures retain only a small red label inside the message with the reason on hover/focus, and interrupted replies use narration from the stored cause. Provider-stage and queue text stays out of the conversation UI.

Primary dragging pans, as specified by the reference; secondary/middle dragging also pan. A stationary secondary click opens actions, and a map click that dismisses a picker never walks. Keyboard shortcuts do not intercept text fields. Panels use opening order and collapse older panels when space is insufficient; narrow layouts share one sheet. Theme/scale/reduced-motion preferences stay local and never alter game semantics.

## Speech captions and perceived-event history

[Hearing and speech](../../../../docs/hearing-and-speech.md) specifies plain overhead/directional speech captions from listener-permitted evidence. [Timed UI](../../../../docs/timed-ui.md) owns the reusable remaining-time ring and presentation clock; its caption use does not change the quick-action cooldown or native work-bar rules. [Perceived World Events](../../../../docs/perceived-world-events.md) specifies the read-only player history launcher below Journal and its Speech filter, distinct from the god-only editor. `SpeechCaptions`, `ProgressRing`, the local presentation lifetime helper, and the read-only World Events panel implement this slice. The scene supplies permitted head/bearing coordinates; React owns text while frame callbacks paint positions/fractions. [Architecture](../../../../docs/architecture.md#hearing-captions-and-perceived-events) records bounds and preferences; [HE01–HE05](../../../../docs/maintainers/hearing-and-speech.md) retains full-scene, accessibility and scale qualification.

## Present capability boundaries

Known recipes and invention jobs have structured cards. Prose world-agent replies ending in a question receive an answer affordance; this is presentation, not a typed multi-question backend protocol. Creator discussion remains read-only. Conjure previews/confirmation, editable proposal admission and generated artwork need the existing invention/workshop delivery track; UI styling does not grant those capabilities. Ending a conversation closes its backend lane; restoring its transcript creates a new identity, never pretends to reopen a tombstoned session. Hiding a panel retains drafts and pending work.

CSS handles the modest panel transitions; reduced motion disables transitions and animations. No separate motion dependency is needed for this layout. UI layout extensions are defined alongside the imported tokens rather than requiring approval for routine spacing decisions.

## Owner editor components

`../ui/editor.tsx` owns the reusable `EditorPanel`: configurable icon tabs, dragging/stacking, fixed dimensions, fresh centering, Save without closing, validation errors, Discard changes and the unsaved-close prompt. Person fields are shared with creation. Independent World Events windows open above Person editors without closing them or pausing play. Memory/awareness refresh controls show real-time query timestamps and require saving or discarding drafts first. The JSON detail pane stays outside the scrolling list; drafts update locally per keystroke and only changed records are submitted. Authoritative privacy and validation remain server responsibilities.

The action picker loads on opening and uses an explicit refresh icon; it does not poll. The separate diagnostics trace page retains its three-second polling cadence.

The shared `Panel` accepts opt-in `resizable` for native vertical resizing with bounded height. Intelligence combines it with existing header dragging on desktop; narrow layouts retain the shared sheet. Its compact rows use actor and trigger icons, bottom-right time, visible trigger subtype/level, ellipsis with structured hover/focus previews, and accessible status symbols. Preview portals use the existing React Aria tooltip primitives and stay outside panel clipping. Inspection contracts live in [the cognition debugger specification](../../../../docs/memory-architecture.md#god-mode-cognition-debugger).
