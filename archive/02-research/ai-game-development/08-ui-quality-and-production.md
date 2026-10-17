# Why the UI looks different, and how to improve its production

**Research checked:** 17 October 2026. **Status:** diagnosis hypotheses and proposed workflow. This document does not accept a new visual direction, replace the existing design system, or claim a fresh inspection of the running application.

## Direct answer

The research does not establish that OpenAI is inherently unable to produce a strong game interface, that Claude is universally better at game design, or that React prevents a convincing inventory. It does establish that **art inputs, visual decisions, implementation, and feedback are separate contributors**. The supplied WoW-style demonstration changes all of them simultaneously. Its result is a good reason to study its production process and audition alternatives, not a controlled model comparison.

OpenLegend should first give its existing browser interface a coherent, approved family of art and a repeatable review loop. Then compare agents on the same representative screen. This is a small experiment that directly addresses Mike's concern while retaining useful work regardless of which model wins.

The distinction is practical: an item illustration, an ornamental frame, a selected-slot treatment, a readable name, and a working drag interaction are different deliverables. Asking one agent to invent and implement all of them from a broad adjective such as “beautiful” leaves many important decisions open.

## What the project already has

The project has explicit visual guidance and reusable UI infrastructure. Its current brief emphasizes a world-first survival-adventure interface, restrained forest green, ivory, sage and antique gold, tactile detail, readable typography, and an inventory organized around items. React Aria supplies interaction primitives; shared design tokens and components already exist. The October 16 redesign also changed the screen organization. Therefore an older screenshot or description of transcript-centered navigation is not a reliable diagnosis of today's UI. [UI brief](../../../docs/ui-design-brief.md), [foundations](../../../docs/ui-ux/foundations.md), [inventory contract](../../../docs/ui-ux/inventory.md), [design-system owner](../../../apps/client/src/design-system/README.md).

The source review found inventory styling built substantially from shared surface, line, radius, and control variables. That supports investigating whether generic control styling is doing too much of the visual work. It does not prove that the live screen is ugly, that all its assets are missing, or that one particular CSS declaration caused Mike's dissatisfaction. A fresh, reproducible capture is the next diagnostic input. [Inventory styling](../../../apps/client/src/ui/inventory.css), [token source](../../../apps/client/src/design-system/tokens/tokens.json).

Two existing distinctions should survive any improvement. Utility symbols for common actions have different jobs from world-authored item imagery. And an attractive interface should leave the world available to see and act in, rather than convert every game activity into a full-screen dashboard. These are constraints from the current owners, not reasons to avoid richer art.

## Evidence that web technology can support game UI

React Aria explicitly ships without visual styling and permits custom CSS, state styling, and interaction treatments. It does not prescribe rounded dashboard cards, generic blue buttons, or an enterprise inventory. Its value here is consistent behavior while OpenLegend supplies the appearance. [Adobe's styling documentation](https://react-aria.adobe.com/styling).

Standard CSS can divide a border image into corners, edges and a center. This allows a decorated frame to resize while preserving its corners. A browser can therefore use a small authored frame family around live text and controls rather than stretching a complete screenshot of a panel. This is an available construction technique, not a claim that every frame needs ornate raster decoration. [MDN border-image-slice](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image-slice).

For a production comparison, Firaxis describes using Coherent's HTML/CSS-based Gameface technology for Civilization VII across several platforms. That is evidence of web-style UI technology in a commercial game, not an endorsement of every design decision in that game's interface. Gameface is a specialized renderer with its own restrictions; OpenLegend runs in an actual browser. [Firaxis UI team interview, June 2025](https://coherent-labs.com/blog/casestudies/firaxis-case-study/).

These sources answer the capability question. They do not establish our frame-time budget, resolve input routing, or choose the visual style. Those remain questions for the actual client.

## A particularly relevant AI production account

Coherent Labs' September 2026 experiments include eight RPG screens built from artboards and a shared visual handoff created with Claude Design, then implemented by an agent. This is a useful example of separating AI-assisted design from implementation; it does not identify the underlying model's independent contribution. The report describes coherent composition but also placeholder illustrations, untested localization and game-load performance, small visual errors, token drift, and a surrounding dashboard interaction broken by an otherwise working screen. It is a vendor's prototype report, not a shipped AI-authored UI benchmark. [Three UI experiments](https://guide.coherent-labs.com/building-with-ai/experiments/three-uis-with-an-agent/).

Its supporting documentation describes explicit visual decisions, agent-accessible renderer documentation, and checks of the real result. It also warns that a technically functional interface can remain visually inconsistent. [Design input](https://guide.coherent-labs.com/building-with-ai/design-first/), [toolchain overview](https://guide.coherent-labs.com/building-with-ai/overview/).

The useful inference for us is that an agent needs both a target and evidence of what it actually produced. The vendor's stronger assertions about what agents can never design are not universal scientific results. Its unsupported-CSS list also must not become a browser restriction in OpenLegend.

## Diagnose the competing explanations

The following are hypotheses, ordered by their value to investigate, not measured probabilities.

| Hypothesis                                                            | Why it is plausible here                                                                                                  | What would distinguish it                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The design exists in prose but is not concrete enough at screen level | Tokens define ingredients; they do not fully determine item scale, density, frame hierarchy, ornament or composition      | Provide one approved inventory reference and exact populated state; compare the resulting screen with the current baseline        |
| The art kit is weaker or less coherent than the demo's                | The supplied transcript describes substantial reference preparation and specialized image generation                      | Keep layout fixed and substitute one reviewed icon/frame family; assess the whole screen at real size                             |
| Review is mostly structural or textual                                | Source inspection cannot reveal visual hierarchy, obscured scenery, or a border that becomes noisy over terrain           | Capture the complete client in fixed states and record the largest visible defects before editing                                 |
| The agent has a design or implementation weakness                     | Different agents may choose and follow visual decisions differently                                                       | Give them identical assets, context, task boundaries, time limits, and review access                                              |
| Generic component treatments override game semantics                  | Repeated surface and control patterns can flatten the distinction between equipment, actions, descriptions and decoration | Compare an item-centered arrangement using existing primitives with the baseline while preserving behavior                        |
| Browser rendering or integration is the actual constraint             | Excessive effects, DOM work or input capture can create real limitations                                                  | Profile and exercise the complete browser build; name the specific failing operation before considering another engine            |
| The desired style is not yet agreed                                   | “Looks like a game” can mean several incompatible traditions                                                              | Compare a small number of still compositions against the current art brief, choose the actual visual decisions, and preserve them |

None of these hypotheses requires deleting React. None proves a model is equally good at design. The purpose of the experiment is to stop attributing one observed outcome to an unisolated cause.

## Build an art kit around the existing system

This is a proposed production package for one inventory slice, not a demand to create a new general UI framework.

**An approved visual exemplar.** Use one complete screen over representative wilderness with real item names, quantities, selection, and detail text. Its role is to close decisions about density, spacing, hierarchy and integration with the world. A collection of unrelated beautiful screens is less useful if each implies a different visual language.

**An item-image family.** Begin with a few actual item classes from the current world. Define silhouette, perspective, light direction, background treatment, edge treatment, padding and meaningful variation. Review the icons in a contact sheet and in slots at the smallest intended size. Keep item counts and labels as live interface content. A generator that produces an attractive illustration but changes the identity of an existing item has failed this task.

**A small frame and surface family.** Choose which regions merit decoration and which remain quiet. A frame can be authored as vector shapes, a border image, or a combination of artwork and CSS. Preserve useful editable sources. Ornamental corners should not collide with text or shrink the usable area unpredictably. A worn texture that hides a disabled state is a usability defect.

**Typography and states.** Follow the existing approved type roles. Specify focus, hover, pressed, selected, equipped, unavailable, loading, empty and error states where the actual interface needs them. Distinguish selection from rarity or availability so one color does not mean several incompatible things. This is a recommendation about implementation completeness, not a proposal to add an unapproved rarity system.

**Originality and provenance.** A reference board can show spatial hierarchy and craft quality without importing protected game logos, named characters, or another game's literal item art as production assets. Record the origin and allowed use of the final materials. This extends the project's existing asset stewardship into generated and purchased art; it is not a legal conclusion about a particular provider. [Asset direction and source requirements](../../../docs/projects/3d-pixel-art-asset-pipeline.md).

The kit should enrich existing components and tokens. When a token or component genuinely lacks a needed role, update its canonical owner through the normal design workflow. Do not leave a second competing set of palette values embedded in a one-off screen.

## Proposed workflow: one attractive, working inventory

1. **Capture the baseline.** Record the repository revision, browser, viewport, scale, world state, inventory contents and exact interaction state. Save a complete screenshot and a short interaction record. Use the current implementation, not an old promotional screenshot.
2. **Write the visual defect list.** Separate composition, asset quality, readability, behavior and performance. Identify a few high-impact defects with visible evidence. “Needs polish” is too vague to guide an agent.
3. **Resolve the visual direction for this screen.** Follow the existing brief, prepare a complete exemplar, and reuse approved project decisions. Ask Mike only about a materially unresolved aesthetic choice; already authorized work does not need repeated sign-off at every step.
4. **Produce a small coherent asset family.** Use approved existing art, deterministic drawing, procedural variation, or a specialized image tool according to the need. Generate alternatives within a budget, preserve the inputs, and select by in-game usefulness.
5. **Implement one populated screen.** Reuse the current interaction components and design system. Keep real data and semantics, including actual item operations and truthful status.
6. **Inspect the complete client.** Compare the intended and actual composition at the same size. Check long names, missing artwork, selected items, keyboard focus, narrow layouts, and scenery behind the panel.
7. **Exercise the surrounding game.** Open and close the panel, resume movement, interact with the world, and verify pointer/focus behavior. Change inventory/world state while the panel remains open; inspect pending and rejected actions, and verify equipped appearance matches the actual authoritative outcome. A screen is not complete if it traps input, presents a stale success, or hides information needed for play.
8. **Check the packaged result when relevant.** Asset paths, fonts, CSS transformation and build behavior can differ from development. Coherent's documented packaged-build failure illustrates why evidence from the deployed artifact matters; the specific unsupported CSS shorthand was a Gameface restriction, not a browser rule. [Verification account](https://guide.coherent-labs.com/building-with-ai/verifying-ai-output/).
9. **Preserve what worked.** Keep the visual exemplar, canonical component changes, asset sources, exact reproduction state and brief repair notes. Turn a repeated error into a narrow check or instruction after observing it.

This sequence does not mean completing every inventory state before learning anything. The first representative slice should be small enough to review quickly while containing real data and interaction.

## Separate the model experiment from the asset experiment

### Experiment A: composition and implementation

Give the incumbent agent and one challenger the same current repository revision, asset kit, screen exemplar, data, interaction requirements, allowed tools and bounded iteration period. Each works from an equivalent isolated starting state. Evaluate both in the actual client with model identity hidden from the visual reviewers where practical.

Measure whether the result fits the brief, remains coherent, is readable at target size, preserves behavior, and needs less correction. Record elapsed time, human editing, failed iterations and external tool charges. A screen that wins a still-image vote but breaks interaction has not won the complete task.

A separate optional comparison can test visual-design judgment itself: give candidates the same brief, constraints and assets, allow each to propose a composition, and use one fixed implementation path to render those designs. Label it separately from the fixed-exemplar implementation test, which deliberately holds the main design decisions constant.

### Experiment B: asset production

Keep the screen and item list fixed. Compare the existing art workflow with one or two specialized generators using equivalent references. Inspect silhouette recognition, consistency across the family, transparent edges, small-size readability, editable/reproducible output and correction time. The language director may stay constant.

This tests the thing the WoW demonstration visibly emphasizes: the supply of attractive game art. It also allows an OpenAI-directed workflow to use a different image generator, or a Claude-directed workflow to use approved existing assets. Model and asset-provider identities need not move together.

### Experiment C: engine authoring, only if a concrete issue remains

If the improved browser slice still exposes a material constraint, reproduce the same slice in Godot with the same art and behavior. Include export, integration and review effort. An attractive editor screenshot compared with an unfinished browser screen is not a useful engine test. The [engine assessment](05-playcanvas-godot-and-engine-choice.md) owns the migration criteria.

## What would change the recommendation?

Evidence that a challenger repeatedly produces substantially better accepted screens under controlled inputs would justify using it for that task. Evidence that an asset generator reliably preserves item identity and style with lower correction cost would justify adopting that asset workflow. A measured browser limitation that blocks an important product requirement could justify an engine investigation.

Until those tests are run, the supported conclusion is narrower and actionable: **make the visual target concrete, supply coherent art, and review the real screen as part of development.** The current research does not identify a universal design-model winner or show that React must be replaced.
