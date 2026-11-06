# Deliverable profiles

Apply only the profile matching the request, plus the common [request settings](README.md#2-request-settings). A profile defines what a useful result covers for one kind of subject and which [play checks](#play-checks) it must pass. It prescribes no style: the look comes from the [current art direction](README.md#3-read-the-look-from-the-art-direction), and no tool: those come from [tools](tools.md#default-roster).

Scale coverage to the request. A broad study may need the whole relevant family; a focused revision delivers only the requested pieces and rechecks what depends on them. Preserve accepted unrelated work instead of rebuilding a kit for one texture edit. Model and animation prototypes take the [short path](README.md#prototype-path). Other production reuses selected inputs and follows the [package procedure](production.md), or [3D models](3d-models.md) for props, characters and creatures; it does not need a new contender study.

## Profile map

| Request                                                | Profile                                                   | Main question                                                          |
| ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Interface surfaces, frames, ornament, icons            | [UI style](#ui-style)                                     | What material and construction language ties the interface together?   |
| Overall visual direction or a new art family           | [General style](#general-style)                           | Which coherent direction fits the intended experience?                 |
| Item, prop, tool, structure, icon or a family of these | [Assets and icons](#assets-and-icons)                     | Does it read, and stay the same thing, at its actual use size?         |
| Person, outfit or portrait family                      | [Character appearance](#character-appearance)             | Does the identity survive different views, poses and states?           |
| Animal, enemy or other nonhuman body                   | [Creatures](#creatures)                                   | Can a player read what it is and what it is about to do?               |
| Surface, landscape, place or lighting study            | [Materials and environments](#materials-and-environments) | Do form, surface and light work in the intended context?               |
| Animation, motion, VFX or sound                        | [Motion and feedback](#motion-and-feedback)               | Does it communicate the intended action or feeling in time?            |
| A full visual UI system or working interface           | [UI system](#ui-system)                                   | Can the chosen appearance cover real content, states and interactions? |
| Something else                                         | [Custom](#custom)                                         | What output and inspection would answer this request?                  |

## Play checks

These checks judge whether art helps the game, independently of style. Run the ones a profile lists at the game's default camera, in motion where motion matters, beside an existing person for scale. Record the result in the study record; a failure sends the work back to the stage that caused it.

| Check            | Passes when                                                                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**         | From an unlabelled capture of the cast at the default camera, someone who knows the cast can say who is who. Identity comes from silhouette, posture, hair, clothing blocks and carried things; players often see "a person" before learning a name.                                         |
| **Same thing**   | The world model, held or equipped view, inventory icon and portrait are recognisably the same object or person, with marks and asymmetries on the same side.                                                                                                                                 |
| **State**        | Each visible state the simulation records (intact or damaged, empty or full, lit or cold, alive or dead, open or barred) can be told apart at play distance, and the art shows no state the game does not have.                                                                              |
| **Threat**       | An attacker's wind-up, aim and recovery read from its pose and motion, from front, side and behind, without labels. The game discloses attack preparation to observers through the attacker's pose and motion, so the clip must show that cue clearly; the animation itself decides nothing. |
| **Construction** | The object shows how it is made and from what: lashings, joins, materials per part, openings and grips match its game definition, so a made or invented thing looks like what was made.                                                                                                      |
| **Scale**        | Height or size follows the look's scale rules and the game's metres, checked beside the look's reference figure.                                                                                                                                                                             |

## UI style

**Scope:** the interface's materials and construction language: surfaces, frames, edges and ornament, plus the parts the brief lists. The accepted interface direction is named in [current direction at a glance](../../../art-direction/decisions.md#current-direction-at-a-glance); new interface art extends it unless Mike asks to explore a new direction. A new direction study is the only case that compares contenders.

For each contender, or for an extension of the accepted direction, cover:

- The direction's rules, in its own words: material, shape, depth, wear and ornament density.
- Main, raised and recessed surfaces, with calm zones for text and imagery.
- A frame family at a small square, a wide panel and a tall panel, identifying fixed corners, repeating or stretching edges, centre fill and separately placed ornaments.
- How parts meet and terminate, for whatever connecting or dividing parts the direction uses.
- Normal, focused or selected, pressed and unavailable treatments where useful. Do not invent rarity, progression or resource meanings from decorative colour.
- One neutral specimen arrangement used for every contender: a panel, a title, short and long text, a few empty and filled frames, a divider and a connected subpanel.
- Small and large sizes, and bright and dark busy backgrounds, so ornament does not win only in an oversized empty presentation.

Use a few well-organized sheets with legible labels from a real text layer. Preserve world visibility, reading space and focus; frames must not hide content or imply relationships the game does not have.

**Study completion:** coherent specimens plus construction notes and retained outputs. A rendering can propose tiling, alpha or nine-slicing (fixed corners with resizable edges and fill), but does not prove those properties. **Production:** the [UI artwork recipe](production.md#ui-artwork). **Integration:** map the kit to the existing tokens and semantic components, keep decorative layers out of hit testing, and exercise real content, focus, resizing and interactions under the UI rules.

## General style

Produce a few coherent directions using the same representative subjects and viewing conditions. State shape, proportion, palette and value, material, edge and lighting rules, and show one meaningful variation that tests consistency. Explain the intended emotional effect and how it relates to the [current direction](../../../art-direction/decisions.md#current-direction-at-a-glance), or why it departs from it when Mike asked for that.

Avoid replacing practical comparison with unrelated polished hero images. A concept's medium may differ from the game's finished look; the art direction says how. Production requires the specific reusable files requested: "a style" alone is not an asset family or a renderer specification. Route each requested asset through its [production recipe](production.md#3-finish-the-relevant-asset-types) or [3D models](3d-models.md).

**Play checks:** name (for people in the style), scale.

## Assets and icons

Establish the thing's actual identity and use: what it is made of, its real size in metres, how it is held or placed, its openings and moving parts, its view angle and its target display size. For a family, make an anchor and enough varied members to test the common rules. Keep distinguishing features readable at the smallest intended size.

**Match state coverage to the request and consumer.** Read the existing game owner for the thing's supported visible states (for example intact, damaged, nearly broken and salvage; open, closed and barred; full and depleted). A stateful production family delivers the required states from one source; a static prototype or focused correction does not become a state-sheet campaign. Ask only if consequential coverage remains unresolved. Show states as part changes where the game builds the thing from parts: a missing wall panel should look like the real gap.

**Make parts that compose.** For things the game assembles or players invent (bindings, handles, heads, pouches, panels, posts), deliver separable parts with their materials and attachment points, so new combinations look right without new art. Follow the [appearance families](../../projects/3d-pixel-art-appearance-families.md) and the world's invention families; the family, materials and compiled values decide the look, never the item's name.

A study can use a concept sheet and family comparisons. For production use the [static 2D](production.md#static-2d-artwork), [sprite](production.md#sprites-and-frame-animation) or [3D](3d-models.md) route for the actual representation. Native object behaviour and equipment compatibility come from their world owners.

**Play checks:** same thing, state, construction, scale.

## Character appearance

Read the character's established identity, the art brief and the look. Preserve the proportions and builds the look requires, face and body identity, important clothing and equipment, and the intended emotional range. Mark invented features as proposals when no canonical appearance exists. Do not change backstory, personality or supported behaviour to explain a look.

**Give each person a signature.** Name, in the brief, the two or three features that identify this person at play distance (a silhouette feature, one colour accent, one carried object they actually hold in the game) and keep them through every view, pose and state.

Study outputs can include silhouette, face or portrait, front, side and back views and a small expression or pose range; request only views that answer the design question. Generated views often disagree: name the canonical construction instead of pretending they form one modeling sheet.

Production branches by the consumer: [portrait](production.md#static-2d-artwork), [sprite family](production.md#sprites-and-frame-animation), [2D rig](production.md#2d-rigs) or [3D character](3d-models.md). A static (unrigged) person or creature follows the [rigid route](3d-models.md#props-structures-and-state-sheets) without automatic rigging or clips; rigging is added only when articulation or deformation is required. Follow the recipe at the requested [quality](README.md#quality-the-simple-and-full-paths).

**Play checks:** name, same thing, state (for supported conditions such as held items or death), scale.

## Creatures

Read the species' game facts: real size, gaits, the behaviours the game runs (grazing, alert, fleeing, stalking, attacking, eating, resting) and its visible states (alive, injured where shown, dead, remains). Anatomy follows the look's rules; generated creatures need the strongest anatomy review.

**Telegraph first.** For anything that attacks, design and animate the wind-up, contact and recovery before polishing idles. Give each threat a silhouette that reads from any side. For ordinary wildlife, prefer strong specialist or library sources over invention, and generate unusual specimens selectively.

A humanoid auto-rigger is not an animal pipeline: nonhuman bodies need their own rig and clip family ([3D models](3d-models.md#rig-routes)).

**Play checks:** name (species and individual where it matters), threat, state, scale.

## Materials and environments

For a material, specify intended scale, surface type, tiling and lighting context, and show it on the intended shape, not only as a flat swatch. Keep painted appearance separate from actual normal, roughness and height maps.

For a place or lighting study, preserve useful paths, human and object scale, focal points, readable value groups and the requested atmosphere. Compose around large forms first, then features that come from the place's use and ecology, then a few accents, keeping quieter regions. Compare relevant views and light conditions. A still does not establish moving-camera stability.

Production follows the [material](production.md#materials-and-textures) or [environment](production.md#environment-and-scene-packages) recipe. A lighting concept does not require reconstructing geometry or building an engine.

**Play checks:** state (for surfaces the game changes), scale.

## Motion and feedback

Specify the action or emotion, timing, start and end conditions and the target representation. A study may deliver pose keys, a storyboard, an animatic, sound candidates or video examples, labelled accurately. Review timing, readability, continuity and restraint. Generated video can be motion reference; it is not a playable clip.

Model/animation generation defaults to the [prototype path](README.md#prototype-path). Target
the selected body/rig; animation-only work reuses it. The brief records exact clips and the
resolved [rig, motion, material and format defaults](README.md#step-options).
An existing clip keeps its useful timing; a new game-action clip respects that action's native
timing. A model containing an animation timer without the required movement is not usable output.

Other production follows the [animation](production.md#animation-clips), [sprite](production.md#sprites-and-frame-animation), [VFX](production.md#visual-effects) or [audio](production.md#audio) recipe; integration follows [assets and animation](../assets-and-animation.md) or [audio and feedback](../audio-and-feedback.md).

**Play checks:** threat (for attacks), state.

## UI system

Read current product tasks, the [UI brief](../../ui-design-brief.md), the accepted interface direction and the [interface coverage map](../../ui-ux/interface-coverage.md). Use the existing [reference atlas](../../ui-ux/games/README.md) before filling gaps with web research. For a full overhaul, account for every requested surface and state; a few strong screens do not establish whole-interface coverage. This profile adds layout, typography, component hierarchy, tokens, state treatment and representative screens to the chosen style.

A design study delivers a component and state specimen and enough representative compositions to show the system working with real permitted content. Distinguish complete coverage from illustrative examples. Shared values have one proposed owner; separate world art from reusable interaction machinery.

Production delivers the requested specifications and reusable artwork through the [UI artwork recipe](production.md#ui-artwork). Only an integration request continues through the existing React and React Aria owners, real actions and live state, keyboard and focus, responsive layout and browser verification, following [working interfaces](../scenes-and-interfaces.md#art-directed-working-interfaces) and the [UI verification matrix](../../ui-ux/verification.md). A giant background image or static imitation does not complete implementation.

### Editable composition

When typography, hierarchy or layout is part of the work, combine the image tools with an editable composition tool and critique. Claude Design is the project's current choice ([tools](tools.md#default-roster)); a native layout or vector tool, or a source preview, can serve the same role. Give it the focused brief, real permitted content and captures, component constraints, references and that contender's artwork. Keep exploratory systems scoped to the study and never replace an organization's defaults. Iterate composition and artwork together with real text at intended size over the relevant background, and send concrete defects back to their owner. Retrieve editable exports and review images; a service URL or flattened screenshot is not an editable design system.

## Custom

Describe the artifact, its consumer, viewing and use conditions, locks, inspection method and stopping point in the brief. Reuse the common stages and the closest [finishing recipe](production.md#3-finish-the-relevant-asset-types), adding only the missing type-specific checks. Do not force every request through 3D modeling, animation, UI implementation or every profile.
