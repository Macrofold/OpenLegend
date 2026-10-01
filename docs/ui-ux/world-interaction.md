# World, camera, actions and spatial information

[Handbook](README.md) · [Spatial owner](../spatial-world.md) · [Presentation owner](../world-presentation.md)

## The world remains the primary workspace

The HUD should help the player notice, inspect and act, not cover the scene with permanent panels. Keep persistent orientation and essential status discoverable; reveal object-specific actions in context. A screen optimized for an empty scene must still work when captions, a selected object, chat and inventory are present together.

Separate **camera focus**, **selected entity**, **controlled actor**, **action target** and **current floor/surface**. A camera move is not a character move. Selecting a level is not a movement command. Looking at an object is not permission to know its private state. Show the selected subject and active mode clearly enough that a player can predict where the next action goes.

Current camera bindings belong to the existing owners, not this handbook. The accepted production guide documents primary/middle drag for pan, secondary or Shift-drag for orbit/tilt, a stationary secondary click for actions, and focused-canvas keyboard alternatives. Preserve those meanings; a reference game is not permission to swap them without an explicit design change.

## One owner for each gesture

Determine ownership from the event origin and active interaction scope. A modal excludes background interaction; **inside that permitted scope, the active child popup/control handles its interaction before the parent**. Without a modal, active UI or a captured gesture is resolved before eligible world input. A dialog must not close when Escape was meant for its child combobox. Reuse shared primitives, not competing global listeners. Adobe's overlay source demonstrates explicit top-layer and child-scope handling. [S04](research.md#s04)

| Gesture/context | Required result |
| --- | --- |
| Type, paste, select text or compose with an IME in a field | Edit text only; no world hotkey or accidental send; retain the owning workflow's explicit Send behavior |
| Wheel over a scrollable panel or popup | Scroll that content, not the camera underneath |
| World click used to dismiss an action picker | Dismiss according to its contract; the same click does not walk |
| Drag the world beyond the established drag threshold | Pan/orbit only; release does not select or invoke a context action |
| Drag a panel or item | Continue the captured interaction; release cannot activate a world target |
| Escape with a popup open | Close that popup first; do not also hide its panel or open the pause menu |
| Focus moves from a dialog into its child popover | Preserve the parent and its draft; entering the child is not an outside-dismissal gesture |
| Window blur, pointer cancellation or lost capture | End/cancel transient gesture state; no stuck movement or delayed click |

Use pointer capture and a tested drag threshold; do not invent a new pixel threshold in each component. The threshold is an implementation tuning value, not a player's intent guarantee. A stationary click and a drag must remain distinguishable under scaling, trackpads and different pointing devices. Mouse, touch and keyboard actions need equivalent meanings, not necessarily identical gestures.

Consuming a world-dismissal click does not establish that every non-modal popover must swallow intentional clicks on other UI controls. Keep that distinction in the component contract. Preventing propagation alone is not the same as cancelling a default action or blocking a server mutation. [React event composition](react.md#component-composition-must-preserve-behavior)

## Camera orientation and recovery

Keep **Recenter** and **Follow** distinct. Recenter changes the view now; Follow is an ongoing mode with visible state. Manual navigation should have a deliberate rule for leaving follow, with a discoverable return. Do not unexpectedly yank the camera back while a player examines something.

Provide a recoverable default view and a way to understand rotation, zoom and floor. Use a concise compass or orientation cue where it helps. A smooth transition should not be mandatory: respect reduced motion and avoid forced shake, heavy inertia, bob or rapid zoom. Offer useful sensitivity and inversion controls only where relevant; preserve settings independently of a gameplay rewind.

Keep zoom, pitch and clipping within the authored world's supported presentation bounds, but do not copy another game's exact angles or distance limits. Existing bounds are inventoried under [interface limits](../limits/interface.md); this document changes none. Test near tall objects, multiple floors, roofs, scene edges and dense gatherings. Accessibility adjustments may improve legibility but cannot reveal unpermitted people or hidden information.

For touch and controller expansion, design explicit focus paths, visible bindings, cancel/back behavior and a non-drag way to navigate. Do not claim those modes supported merely because a desktop button is focusable. Xbox guidance provides useful navigation, focus and input criteria rather than a certification checklist. [F16](research.md#f16)

## Selection, hover and inspection

Hover is a preview, not the sole information surface. A player must be able to inspect the same permitted facts by selection/keyboard. Keep a short preview bounded and place long details in a persistent panel. Do not truncate the only representation of a full item name, action reason or quantity.

Use stable entity identity and readable, viewer-permitted labels. Where several objects overlap, provide a way to disambiguate without repeatedly guessing pixels. Offscreen cues should show direction and source only when the projection permits them. A visually obscured object is not necessarily perceived; a camera cutaway is not extra character sight.

The current [world-hover limit](../limits/interface.md#hv01) has a bounded pile preview with an explicit remaining count and a complete inspection route. Keep that distinction. Do not expand the hover card into an unscrollable inventory because more data is available.

## Actions explain the commitment

A contextual action should make clear **who acts, on what, with which relevant tool, at what known cost and with what important consequence**. Express conditions in player language. Distinguish known duration from an estimate and a supported attempt from guaranteed success. Avoid presenting an unknown chance as 0% or promising a result the world has not committed.

Selection and preview are read-only. Use the current action admission route for execution. Keep unavailable-action disclosure under its current owner; when the player asks for an explanation, name a remedy if one exists. Do not substitute a technical exception for an understandable action failure.

For target selection, show that targeting mode is active, the permitted target class/range when known, a clear cancel route and the intended effect before commitment when practical. A changed selected entity must not retarget an already reviewed operation silently. Repeated hotkeys and double-clicks must not duplicate a costly command.

Where a targeting footprint represents a known area of effect, range or direction, its graphic must agree with the applicable geometry. Decorative glow must not imply additional affected space, precision or certainty. If prediction is approximate or incomplete, communicate that distinction rather than draw a falsely exact boundary. This adapts Riot's gameplay-clarity rationale, without adopting its combat rules or revealing information the player cannot know. [S19](research.md#s19)

Quick actions accelerate a known task; they do not become the only route to the full action catalogue. Preserve current contextual suggestions and pinned shortcuts. Do not reorder a player's pins based on a relevance model without their explicit choice. Cooldown rings are for actual cooldowns; work progress follows the work contract, not whatever indicator component is visually convenient.

## Navigation and world search

When world search or a map is expanded, let players move from **known name → result → focus/pin → inspect → optional action**. Searching or focusing is not teleportation or movement. Show floor/region and relevant uncertainty where permitted. Provide a textual/list route to places and entities rather than making every task depend on precise map pointing.

Factorio's chart search and pins illustrate task-oriented spatial retrieval: find a known thing, orient to it and retain a reference. That does not authorize Open Legend to expose an omniscient map or remotely interact with everything. [G07](research.md#g07)

Use persistent player-created pins for meaningful goals, not an uncontrolled flood of system markers. Distinguish currently seen, previously observed and merely reported information when the world supports those concepts. Filtering markers must not silently erase a tracked objective; show the filter state.

## Status, captions and time

Status placement must survive dense scenes, tall entities, camera edges and open panels. Preserve source attribution and avoid covering the action target. When visible caption capacity is exceeded, use the current missed-caption notice and permitted history route; do not silently pretend every utterance was shown.

Visual/audio prominence should track actionable importance and urgency, not how much machinery generated an event. Keep routine updates quiet so a consequential warning remains distinguishable. Do not amplify every new notification to compete with an already noisy scene; reduce or aggregate the low-value competition while retaining meaningful history. Riot's clarity discussion supplies a game-specific rationale. [S19](research.md#s19)

[Hearing](../hearing-and-speech.md), [timed UI](../timed-ui.md) and [perceived events](../perceived-world-events.md) own what may be displayed and how time works. A speech lifetime, native work bar, request spinner and cooldown are different clocks. Pausing simulation freezes the appropriate simulated progress; it does not justify inventing a completed action or losing a drafted message.

Do not fake audible words or speaker identity when only faint/unattributed sound was perceived. Give hearing/caption settings and readable history a discoverable route, not one dependent on tiny overhead text. Reduced motion must preserve the same information and task access.

## Acceptance scenes

Exercise a world-edge popup, two open panels at enlarged UI scale, an active chat composer while pressing movement keys, a drag ending over a button, a dismissed picker over walkable ground, a rotated multi-floor scene and a dense caption burst. Add a child popup inside a dialog, a short viewport with a keyboard, and any known targeting footprint against the actual supported geometry. Check that selection, focus and action authority remain separate. Current full-scene, touch and assistive-device qualification remains with the existing spatial/hearing trackers; source inspection does not close it.
