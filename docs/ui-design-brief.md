# Open Legend UI design brief

Status: design handoff and recommended technology direction, September 19, 2026. React, React Aria, Motion and the asset libraries below are recommendations, not an adopted implementation. This brief records the desired UX; it is not live acceptance evidence. Provide current screenshots alongside it. General documentation may lag recent UI changes; see the [deferred validation and documentation queue](maintainers/TODO.md).

## Project and atmosphere

Open Legend is an open-source, evolving wilderness simulation and role-playing game. Characters gather, craft, rest, converse, develop memories and pursue survival. Players can collaborate with a world agent to invent new objects, actions and mechanics. The interface must support a growing catalogue of content without becoming crowded. This is a game about exploration, atmosphere and discovery, not a productivity dashboard. The current implementation is an early wilderness prototype; richer simulation and world-agent integration remain evolving work.

Preserve the existing dark green adventure atmosphere: deep forest-green surfaces, warm ivory text, muted sage accents, restrained antique gold and subtle borders. It should feel intimate, tactile and grounded in a primitive wilderness society. Explore restrained material texture and elegant serif headings paired with highly readable body text. Avoid ornamental overload, generic dashboard cards, bright default-blue controls and excessive labels. The world remains the visual focus. See the broader [visual direction](../archive/03-design-proposals/visual-direction.md).

## Recommended UI stack and boundaries

Use React + TypeScript with **React Aria Components** for accessible, unstyled interaction primitives, custom Open Legend components and CSS for visual design, and **Motion** for coordinated panel, tab and layout animations. Use CSS for simple transitions. Keep **PlayCanvas** responsible for world rendering, camera interaction and frame-by-frame positioning. The current interface uses handwritten TypeScript, HTML, CSS and SVGs.

React Aria is preferred for its collection and selection interactions, accessible drag-and-drop, continued development and its role underpinning Adobe's design system. Base UI remains a credible alternative; its newer APIs do not alone establish superiority. Neither library determines the game's appearance. Validate our action picker, inventory interactions and canvas input coordination before a broad migration.

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

## God-mode cognition debugging

Extend the existing right-side Intelligence calls panel with the [canonical debugger hierarchy](memory-architecture.md#god-mode-cognition-debugger): compact trigger/action rows expanding into route options, Jev decisions, context/retrieval and model/harness stages, then committed outcomes. Show candidate match scores and inclusion decisions in drilldowns, and per-stage input/output, tokens and costs on demand. Provide filters, paginated history and follow/pause updates without moving the reader's focus or scroll. This authorized development view is planned alongside CR01–CR12; it does not require the proposed UI-library migration.

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
