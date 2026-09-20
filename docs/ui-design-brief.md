# Open Legend UI design brief

Status: design handoff, updated September 20, 2026. React and React Aria are now adopted; Motion remains unnecessary for the current modest transitions. This brief records desired UX and future direction, not live acceptance evidence. Provide current screenshots alongside it. See the [production UI ownership guide](../apps/client/src/design-system/README.md) and [deferred validation queue](maintainers/TODO.md).

## Project and atmosphere

Open Legend is an open-source, evolving wilderness simulation and role-playing game. Characters gather, craft, rest, converse, develop memories and pursue survival. Players can collaborate with a world agent to invent new objects, actions and mechanics. The interface must support a growing catalogue of content without becoming crowded. This is a game about exploration, atmosphere and discovery, not a productivity dashboard. The current implementation is an early wilderness prototype; richer simulation and world-agent integration remain evolving work.

Preserve the existing dark green adventure atmosphere: deep forest-green surfaces, warm ivory text, muted sage accents, restrained antique gold and subtle borders. It should feel intimate, tactile and grounded in a primitive wilderness society. Explore restrained material texture and elegant serif headings paired with highly readable body text. Avoid ornamental overload, generic dashboard cards, bright default-blue controls and excessive labels. The world remains the visual focus. See the broader [visual direction](../archive/03-design-proposals/visual-direction.md).

## UI stack and boundaries

Use React + TypeScript with **React Aria Components** for accessible interaction primitives and custom Open Legend components and CSS for visual design. CSS handles current transitions; add **Motion** only when coordinated panel, tab or layout animation requires it. Keep **PlayCanvas** responsible for world rendering, camera interaction and frame-by-frame positioning.

React Aria supplies collection, selection and accessible control behavior without determining the game's appearance. Keep its use concentrated in game components and preserve the boundary between public game state, simulation rules and server-side action admission.

Keep library usage concentrated inside game components such as ActionPicker, InventoryGrid, WorldPanel and Tooltip. Keep public game state, simulation rules and server-side action admission separate. Coordinate focus, pointer events and keyboard shortcuts so UI interaction does not inadvertently move the character or camera. Do not route every world animation frame through React state. React must not share ownership of the same DOM subtree with legacy imperative rendering during migration.

Use **Lucide** for utility symbols such as close, back, search and settings. Use a stylistically curated selection from **Game-icons.net**, or custom artwork, for resources, equipment and actions; preserve asset attribution and licensing. Self-host selected fonts through **Fontsource**. A readable body family such as Source Sans 3 can accompany a theme-specific display font; decorative fonts should not carry dense descriptions or small status text.

## Design-system requirements

- Establish semantic typography, spacing, icon sizes, control sizes, panel treatments, focus states and motion rules. Current font sizing and density are inconsistent.
- Support interchangeable world themes: wilderness, fantasy and science fiction share reliable behavior but can change fonts, materials, borders, shapes, artwork and animation character.
- Separate interaction behavior, game components and theme definitions. Theme changes must not alter game rules. Specialized presentations such as spellbooks or spaceship consoles should use the same underlying data and interaction contracts.
- Resolve symbols through semantic identifiers such as `action.rest` and `resource.wood`. Gathering combines a hand badge with the resource symbol. New invented content needs an immediate fallback symbol and may receive bespoke artwork asynchronously; artwork generation must not block mechanics. See the [invention lifecycle](../archive/03-design-proposals/generative-capability-lifecycle.md#symbolic-presentation-for-every-new-action-and-item).
- Prioritize readability over decoration. Include keyboard navigation, visible focus, reduced-motion behavior and UI scaling.

## Interaction direction to preserve and refine

- Floating survival meters remain on the upper left.
- Circular left-side launchers open Inventory, Crafting and Character panels. Circular right-side launchers open the World Agent and In View panels. Hover labels are plain white text.
- Panels toggle independently, have close buttons and open outward in opening order without overlapping. Provide a workable narrow-screen adaptation.
- In View lists visible entities. Selecting one replaces the panel contents with its details and a Back button. Left-clicking a world item opens the same details.
- The World Agent has multiple independent conversation tabs, each with a close button. Hiding the panel and ending a conversation are distinct actions. Remote agent lifecycle integration must not be implied by a local mockup.
- Bottom quick actions are circular symbols: up to three contextual suggestions and three player-configured shortcuts.
- Right-click opens a compact, target-specific action picker with search and contextual Invent. Self-actions belong on the character, gathering on resources and conversation on the selected person; empty ground does not expose the whole catalogue.
- Unavailable actions appear only when requested, below available actions and grayed out. Hide that toggle when there are none. Detailed action explanations appear after a one-second hover and should also be available through keyboard focus.
- Left-click selects or walks; left-drag pans. Clicking the map to dismiss an action menu must not also move the character.
- Status text appears above the relevant character or object in white without a background. New notices stack above older ones. Work labels and smooth progress bars appear only when work begins, remain while incomplete and disappear immediately on completion. Walking gets no status. Keep a consistent gap above the subject, including beneath a progress bar.
- Conversation composers begin as one line and grow to reveal wrapped text or explicit Shift+Enter newlines. An in-flight turn shows only a floating, animated three-dot wave where the reply will appear. Completed turns have no badge; failed turns retain a very small red **Failed** label inside the message at its lower right, with the specific reason available on hover or keyboard focus. Prioritize returning a useful response over rejecting one for small technical races: if relevant character or world context changes during generation, refresh it and retry once; if it changes again, accept the second response with its recent snapshot because a momentarily out-of-date conversational reply is preferable to a visible failure. Wait through pauses rather than discarding an already generated reply. Reserve **Failed** for actual breakdowns such as provider, validation, storage or availability failures. Never insert technical state, retry, queue, generation, pause or timing details between conversation messages.

## Future character reactions

A later reaction mechanism may briefly show natural text such as “Hmm” above a character. Under the accepted narration design, an actual spoken reaction or observable gesture is an accepted speech/expression event and is remembered normally; its overhead presentation may disappear without deleting that experience. Private thoughts stay hidden. Loading dots are technical status and create no event or memory. Reaction vocabulary and timing should vary with character, player interaction and nearby events rather than using one fixed waiting phrase. This remains planned UX; [the existing reaction follow-up](maintainers/TODO.md#future-character-reaction-bubbles) now links the owning NC implementation tracker.

## Future narration and conversation history

The [narration/conversation design](narration-and-conversations.md) specifies future presentation. Show non-speech reactions, actions and relevant world events as prose between speech messages, without a fake speaker or internal thoughts. Beneath narrated consequences, show smaller distinct readable impacts such as “−1 Health”, derived only from committed effects. Expressive actions without mechanics show no invented damage/condition changes; offer a subtle expression/no-effects cue where needed. Thought-only/no-response outcomes finish the pending indicator without fabricating speech.

Outside conversation, The Narrator can show stylized book-like text across the top of the screen. Save the same private entry in the player's Journal, respect UI scale/reduced motion and avoid stealing focus or blocking controls. Narrator voice is a player preference affecting future prose, not game rules or existing history. Event access is independent of conversation membership; later joiners see earlier speech only if they actually heard it. Hiding a panel differs from explicitly leaving a conversation. Merge notices link the old thread to the destination without importing hidden history.

Show stable chronological history when generation finishes late, preserve reading position, and avoid rendering an action both as a raw event and as its narration. One meteor can cause different private descriptions in several conversations, grounded in what each viewer perceived. Optional private single-actor narration and distant story cutaways require explicit server disclosure policies, not a UI toggle that exposes another actor's mind. Delivery and acceptance are tracked in [NC01–NC13](narration-and-conversations.md#13-implementation-tasks); no runtime implementation is claimed here.

## God-mode cognition debugging

The right-side Intelligence panel follows the [canonical debugger hierarchy](memory-architecture.md#god-mode-cognition-debugger): selecting a compact trigger/action row opens a full-width detail view with the standard panel back control. The detail renders trigger/outcome fields, Jev questions/choices/decisions, speech, context/retrieval and model/harness stages. Embedding stages show the query, backing table and retained ranked results. Persistent JSON icons on the request and each stage open combined application/provider records in a roomy left-side panel with icon-only copy; transport exchanges are not shown as numbered requests. Filters, paginated history and follow/pause updates preserve the reader's focus; deeper recovery and live-provider acceptance remain tracked separately.

## Requested design output

Use the screenshots as visual reference, preserving the appealing dark green atmosphere while improving consistency, hierarchy, compactness and polish. Deliver a cohesive design system with reusable component examples and interaction states, not just isolated screen mockups. Include representative empty, unavailable, loading, focus, hover and error states. Demonstrate the same core components in the wilderness theme and one contrasting theme to prove the theme boundary works.

Clearly distinguish existing functionality from future concepts such as richer character traits, generated artwork or remote world-agent sessions. Do not invent statistics or imply unavailable AI works. No full game-engine rewrite is required.

## Reference documentation

- [React Aria](https://react-aria.adobe.com/) and [collection drag-and-drop](https://react-aria.adobe.com/dnd)
- [Motion](https://motion.dev/docs/react)
- [PlayCanvas UI](https://developer.playcanvas.com/user-manual/user-interface/)
- [Lucide](https://lucide.dev/)
- [Game-icons.net and attribution](https://game-icons.net/faq.html)
- [Fontsource](https://fontsource.org/docs/getting-started/install)
- [Base UI alternative](https://base-ui.com/react/overview/about)
