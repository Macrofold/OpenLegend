# Deliverable profiles

Apply only the profile matching the request, plus the common
[finish level](README.md#request-and-stopping-point). These profiles define what makes the
result useful; they do not prescribe one model or repeat the tool routes. Scale their
coverage to the requested scope: a broad study may need the whole relevant family, while
a focused revision delivers only the requested pieces and checks affected dependents.
Preserve accepted unrelated work instead of rebuilding a full kit for a single texture edit.
These profiles own the brief and visual coverage. Production reuses any selected inputs and
follows the common [package procedure](production.md) plus the matching recipes below; it
does not require a new contender study.

## Profile map

| Request                                             | Profile                                                   | Main question                                                          |
| --------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Borders, panel textures, ornament, UI “scaffolding” | [UI style](#ui-style)                                     | What material and construction language ties the interface together?   |
| Overall visual direction or a new art family        | [General style](#general-style)                           | Which coherent direction fits the intended experience?                 |
| Item, prop, icon, sprite or related asset family    | [Assets and icons](#assets-and-icons)                     | Does it read and remain consistent at its actual use size?             |
| Person, creature, outfit or portrait family         | [Character appearance](#character-appearance)             | Does the identity survive different views and expressions?             |
| Surface, landscape, place or lighting study         | [Materials and environments](#materials-and-environments) | Do form, surface and light work in the intended context?               |
| Animation, motion, VFX or sound                     | [Motion and feedback](#motion-and-feedback)               | Does it communicate the intended action or feeling in time?            |
| A full visual UI system or working interface        | [UI system](#ui-system)                                   | Can the chosen appearance cover real content, states and interactions? |
| Something else                                      | [Custom](#custom)                                         | What output and inspection would answer this request?                  |

## UI style

**Scope:** materials, borders, textured panels, corners, inset frames, title rails, dividers,
tabs, brackets, medallions, connectors and decorative attachment points. These are the
surface and construction language, not all game screens or item icons.

For each contender, provide enough plates to cover:

- A named direction with material, shape, depth, wear, accent and ornament-density rules.
- Main, raised and recessed surface treatments, with calm zones for text and imagery.
- A frame family shown as a small square, wide panel and tall panel. Identify corners,
  repeating/stretching edges, center fill and separately placed ornaments.
- A connector vocabulary: straight pieces, bends, junctions, endpoints, brackets, dividers
  and header rails. Show how parts meet and terminate.
- Representative normal, focused/selected, pressed and unavailable treatments where useful.
  Do not invent rarity, progression or resource meanings from decorative color.
- The same neutral specimen arrangement across contenders: panel, title, short and long
  text samples, a few empty/filled frames, a divider and a connected subpanel.
- Small/large and bright/dark busy-background comparisons, so ornament does not win only
  in an oversized empty presentation.

These may share a few well-organized sheets; do not make a separate file for every bullet.
Keep labels legible through a real layout/text layer where available. Preserve world
visibility, reading space and focus; thick frames or connecting decorations must not hide
content or imply relationships that the game does not have.

**Study completion:** coherent visual specimens plus construction notes and exact retained
outputs. A rendering can propose tiling, alpha or nine-slice construction (fixed corners with
resizable edges and fill), but does not prove those properties.

**Production additions:** execute the [UI artwork recipe](production.md#ui-artwork) for the
requested pieces, assembly measurements and export/resize checks.

**Integration additions:** map the selected kit to existing tokens and semantic components,
keep decorative layers out of hit testing where appropriate, and exercise real content,
focus, resizing and game interactions under the UI rules.

The [supplied-reference brief](../../../art-direction/studies/ui-surface-language/brief.md)
is an example, not the permanent visual direction.

## General style

Produce a few coherent directions using the same representative subjects and viewing
conditions. State shape, proportion, palette/value, material, edge and lighting rules;
show one meaningful variation that tests consistency. Explain the intended emotional
effect and fit with OpenLegend's current direction.

Avoid replacing practical comparison with unrelated polished hero images. A concept may
be painterly even when its eventual world representation differs. Production requires
the specific reusable sources/exports actually requested; “a style” alone is not a complete
asset family or renderer specification. Route each requested asset through its actual
[production recipe](production.md#3-finish-the-relevant-asset-types).

## Assets and icons

Establish actual identity/use, silhouette, view angle, lighting, padding and target display
size. For a family, create an anchor and show enough varied members to test its common rules.
Keep recognized distinguishing features at the smallest intended size.

A study can use a concept sheet and family comparisons. For production, use the
[static 2D](production.md#static-2d-artwork), [sprite](production.md#sprites-and-frame-animation)
or [rigid 3D](production.md#rigid-3d-assets) recipe for the actual representation.
Native object behavior and equipment compatibility come from their existing world owners.

## Character appearance

Read established character identity and the art brief. Preserve natural proportions,
face/body identity, important clothing/equipment and intended emotional range. Mark proposed
features as proposals when no canonical appearance exists.

Study outputs can include silhouette, face/portrait, relevant front/side/back views and a
small expression/pose range. Only request views that answer the actual design question.
Inspect identity consistency and ordinary gameplay-scale recognition, not just beauty in
one portrait. Do not change backstory, personality or supported behavior to explain a look.

Production branches by the actual consumer: [portrait](production.md#static-2d-artwork) or
[sprite family](production.md#sprites-and-frame-animation), [2D rig](production.md#2d-rigs),
or [3D character](production.md#3d-characters-and-creatures). Follow that finishing recipe.
Generated views may disagree; identify the accepted construction instead of pretending
all of them form an internally consistent modeling sheet.

## Materials and environments

For a material, specify intended scale, surface type, tiling and lighting context. Show it
on the intended shape, not only a flat attractive swatch. Separate painted appearance from
actual normal/roughness/height maps and verified material behavior.

For a place or lighting study, preserve useful paths, human/object scale, focal points,
readable value groups and the requested atmosphere. Compare relevant views and light
conditions. A promotional still does not establish moving-camera stability.

Production requests follow the [material](production.md#materials-and-textures) or
[environment/scene](production.md#environment-and-scene-packages) finishing recipe.
A lighting concept study does not require reconstructing geometry or building an engine.

## Motion and feedback

Specify the action/emotion, timing, start/end conditions and target representation.
A study may deliver pose keys, a storyboard, animatic, sound candidates or video examples,
labeled accurately. Review timing, readability, continuity and restraint.

Production follows the [animation](production.md#animation-clips),
[sprite](production.md#sprites-and-frame-animation), [VFX](production.md#visual-effects)
or [audio](production.md#audio) finishing recipe. Integration follows
[animation](../assets-and-animation.md) or [audio and feedback](../audio-and-feedback.md).

## UI system

Read current product tasks, the [UI brief](../../ui-design-brief.md) and the relevant
[current surface/state coverage](../../ui-ux/interface-coverage.md). Use the existing
[reference atlas](../../ui-ux/games/README.md) before filling specific visual gaps with web
research. For a full overhaul, account for every requested surface and state; a few strong
inventory screens do not establish whole-interface coverage. This profile adds
layout, typography, component hierarchy, tokens, state treatment and representative screen
coverage to the chosen style. Start from a selected style study when available, not a new
round of unrelated themes.

A design study delivers a component/state specimen and enough representative compositions
to show the system working with actual permitted content. Distinguish complete coverage
from illustrative examples. Shared values should have one proposed owner; separate world
art from reusable interaction machinery.

Production delivers the requested design-system specifications and actual reusable artwork
through the [UI artwork recipe](production.md#ui-artwork) and common package checks.
Only an integration request continues through existing React/React Aria owners, real actions
and live state, keyboard/focus, responsive layout and browser verification. Follow
[working interfaces](../scenes-and-interfaces.md#art-directed-working-interfaces) and the
existing [UI verification matrix](../../ui-ux/verification.md) for viewports, text scaling,
input, recovery and theme checks; a giant background image or static imitation does not
complete implementation.

### Editable composition

When typography, hierarchy or layout is part of a UI study or system, combine either image
route with an editable composition tool and visual critique. [Claude Design](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)
is a concrete option from the UI workflow; a suitable native layout/vector tool or source
preview may serve the same role. This is a task-specific tool choice, not a provider-quality
ranking or an account requirement for every art request.

Give the specialist the focused brief, actual permitted content/captures, relevant component
constraints, references and that contender's artwork. Inspect the current Design entry and
[design-system setup](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)
when using Claude. Keep exploratory systems scoped to the study; do not replace an
organization's defaults. Iterate composition and artwork together, use real text, inspect
at intended size over the relevant background, and send concrete defects back to their owner.
The coordinator retrieves supported editable exports plus review images, rendering source
previews when needed. Record actual formats; a service URL or flattened screenshot alone
is not an editable design system. Verify current capabilities at execution time.

## Custom

Describe the required artifact, intended consumer, viewing/use conditions, invariants,
inspection method and requested stopping point in the study brief. Reuse the common flow
and the closest relevant [finishing recipe](production.md#3-finish-the-relevant-asset-types)
and production chapter. Add only missing deliverable-specific checks;
do not force every art request through 3D modeling, animation, UI implementation or all profiles.
