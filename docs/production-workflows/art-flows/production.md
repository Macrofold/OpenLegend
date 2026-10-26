# Production-ready art packages

Use this procedure when the requested finish is **production**, or when **integration**
requires new or changed assets. Read the common steps and only the matching asset recipes.
A study alone still stops at the [study boundary](README.md#request-and-stopping-point).

The result is a usable package for a named consumer, with retained sources and a repeatable
export route where finishing is needed. Confirm current importer support before promising
game-ready files; label a package for a proposed consumer accordingly. Installing assets,
changing game code and qualifying the running game remain integration.

Reuse compatible assets without reconstructing unavailable upstream authoring projects.
Retain available original inputs and working sources for delivered assets. Require particular
editable masters only when the agreed deliverable or revision depends on them. Record editing
limits. A generated image may itself be the source; a prompt is not a substitute for its bytes.

## 1. Define the package before finishing

Start from the task brief and any selected source revisions. Reuse established direction
and usable parts. In the [owning study record](study-record.md), list
the requested assets and their required parts, views, states, clips or variants. Mark which
already exist, need finishing, or are blocked. A focused revision updates its affected
exports and dependencies; it does not recreate an unrelated family.

Identify the consuming component, renderer/importer, rig or audio system and its current
contract. Read the relevant [production chapter](../README.md) and technical owner. Reference
settled requirements instead of copying them. Resolve only missing applicable fields:

| Contract | Record for this package |
| --- | --- |
| Representation and coverage | What is native drawing/layout, image, sprite, model, rig, clip, material, scene, effect or audio; exact required members and dependencies. |
| Format and compatibility | Supported source/export formats, importer and relevant tool versions, required channels/features, rig or component conventions. |
| Dimensions and coordinates | Intended display sizes and densities, source dimensions, units, orientation, pivots, origins, attachment points and safe regions. |
| Playback and state | State/view/clip names, timing, loops, transitions, root-motion convention and presentation markers where needed. |
| Rendering and resources | Color space, alpha handling, filtering, texture/channel conventions, compression and existing size/resource budgets relevant to this consumer. |
| Identity and rights | Existing asset IDs, source revisions, required attribution, permitted uses and visibility; distinguish usable sources from reference-only art. |
| Inspection | Which delivered files and representative conditions will prove the requested coverage, and what requires later game integration. |

Choose routine export settings from the existing consumer and record them. Do not impose
one resolution, polygon count, frame rate, codec, rig or filename schema on all art.
If there is no established naming convention, use stable descriptive filenames containing
the asset, role and necessary variant; preserve original names in provenance and map
exports to existing asset IDs. File names are not immutable revision identities.

For raster output, derive pixel dimensions from intended display size and supported display
density/quality tiers; inspect the largest and smallest intended use. Deliver multiple
densities only when the consumer needs them. Keep a suitable editable master and generate
exports from it. Vector export is appropriate for supported vector artwork, not a promise
that tracing a textured image will preserve its quality.

If a missing consumer requirement would change the representation or invalidate the package,
resolve that dependency before the affected work. Continue independent preparation; do not
invent runtime support, silently change scope, or implement a new importer to finish an
export request.

## 2. Choose a finishing method and prove one complete asset

Inspect original files, layers, geometry, rigs and available exports. Select the least
destructive method that can actually meet the contract:

- Reuse a compatible source and export it with the required settings.
- Extract and clean existing separable parts when their underlying pixels or geometry exist.
- Rebuild exact repeated structure in a vector, layout, modeling or procedural authoring tool.
- Generate or paint missing parts against the selected reference, then finish and inspect them.
- Retopologize, unwrap, rig, skin, retarget or bake when the required model/motion representation
  cannot be obtained from the current source.

Use authorized tools and their current skills; these alternatives do not override host tool
requirements. Record which parts were reconstructed. Flattened concepts do not contain
recoverable hidden layers, and an attractive render or movie does not supply geometry or rig
clips. A provider's “layers,” “transparent” or “game-ready” label is not export evidence.

Take one representative asset through source cleanup, final export and inspection before a
large batch. Choose a sample that exercises the difficult construction, deformation, resize
or playback requirement. Reuse a valid earlier proof when its dependencies are unchanged.
Fix the recipe at its source, then apply it to the requested set. Additional creative
variants are needed only when requested or necessary to resolve a real design question.

## 3. Finish the relevant asset types

Use the applicable recipes and skip steps already satisfied by the selected asset.
Finalize changed geometry, rigs, textures and other inputs before qualifying their dependent
final exports. Preliminary assembly,
lighting and motion previews may proceed with clearly identified unfinished inputs.
Independent pieces can proceed in parallel under the [shared coordination rules](README.md#2-prepare-access-and-the-working-location).

| Deliverable | Finishing recipe |
| --- | --- |
| UI surfaces, frames, decorative controls or a UI artwork kit | [UI artwork](#ui-artwork) |
| Icons, portraits, illustrations or static backgrounds | [Static 2D artwork](#static-2d-artwork) |
| Directional sprites or frame animation | [Sprites and frame animation](#sprites-and-frame-animation) |
| Deformable or articulated 2D characters | [2D rigs](#2d-rigs) |
| Props, items, equipment or modular rigid geometry | [Rigid 3D assets](#rigid-3d-assets) |
| Rigged people, creatures, clothing or body families | [3D characters and creatures](#3d-characters-and-creatures) |
| Skeletal or other rig-based motion | [Animation clips](#animation-clips) |
| Textures, decals or reusable surface recipes | [Materials and textures](#materials-and-textures) |
| Environment kits, assembled places or lighting setups | [Environment and scene packages](#environment-and-scene-packages) |
| Particles or other visual effects | [Visual effects](#visual-effects) |
| Sound effects, ambience, music or recorded speech | [Audio](#audio) |

### UI artwork

1. **Decompose by use.** Separate reusable decoration from live content and native
   layout/drawing. Identify pieces that remain fixed, resize, repeat, crop or move
   independently. Keep typography, counters and interactive state in their appropriate
   editable/native owners; do not bake live content into decoration.
2. **Construct the parts.** Recover usable layers or rebuild clean sources. For a resizable
   frame, choose supported slicing, separate pieces or vector construction; not every
   element needs nine-slicing. Make repeated edges/fills seamless and independently placed
   ornaments complete. Remove baked backgrounds and repair edge fringes without losing
   intended translucency.
3. **Specify assembly.** Record source dimensions, slice boundaries where used, repeat versus
   stretch behavior, scale, anchor/pivot positions, overlaps, minimum valid sizes and content
   insets. Declare source-pixel versus layout-unit measurements. Preserve consistent texture
   and stroke scale across the family.
4. **Export real pieces.** Deliver each required reusable part or supported frame sheet with
   its assembly metadata, actual alpha where needed and the selected density variants.
   Retain the sources used and composition specifications; a labeled sheet of examples is
   a preview, not the individual exports.
5. **Assemble and inspect.** Use the existing component specimen or a disposable preview
   reading the final exports and declared measurements. Check minimum, wide and tall sizes
   for resizable elements, and declared sizes/scales for fixed artwork. Exercise intended
   display densities, bright/dark busy backgrounds and required states. Inspect
   seams, distortion, clipping, text-safe regions and transparent edges. Keep the preview
   recipe and observed limits. Actual focus, hit testing and responsive game behavior follow
   [interface integration](../scenes-and-interfaces.md#art-directed-working-interfaces).

### Static 2D artwork

1. Establish each asset's actual use, framing, aspect ratio, view/lighting, padding and
   identity anchors. For backgrounds, define safe regions and permitted crop behavior.
2. Separate requested items into usable files. Clean edges and unwanted backgrounds,
   reconstruct missing content only where needed, and preserve intended transparency.
   Normalize family scale and framing without erasing distinguishing features.
3. Export at the declared dimensions and supported formats from the retained working source.
   Produce only required crops, states and density variants; retain layered compositions
   when layers are needed for later editing.
4. Inspect the exported files at normal and smallest intended sizes and against their
   expected surroundings. Check recognition, cropping, alpha halos, compression damage and
   family consistency. Deliver individual artwork, masters and the dimensions/crop contract.

### Sprites and frame animation

1. Enumerate required directions, actions and states from the consumer; keep them distinct
   from decorative alternatives. Confirm the accepted camera behavior rather than restricting
   it to accommodate an incomplete sprite set.
2. Produce frames with consistent identity, lighting, apparent scale, registration and
   contact points. Repair unintended jitter, changing details and missing poses.
3. Assign frame order and duration, loops or one-shot endings, pivots and relevant presentation
   markers. Test contact and start/end poses before packing.
4. Export individual frames or the consumer's supported atlas. For an atlas, record frame
   rectangles, padding/extrusion, original sizes, trim offsets and pivots; check filtering
   and mip behavior where used. Keep authored frame sources and supplied unpacked originals.
5. Play the exact delivered sequence at normal speed and inspect frame stepping, loop seams,
   direction changes and required transitions. Deliver animation metadata with the images;
   a contact sheet or preview video does not replace either.

### 2D rigs

1. Confirm the supported rig format, hierarchy, deformation features and draw-order rules.
   Select or build a compatible rig before generating a family of dependent animations.
2. Separate drawable parts with sufficient concealed overlap for movement; author pivots,
   meshes/deformation, constraints and attachment points in an editable source.
3. Fit the artwork and weights, checking extreme intended poses, joint gaps, clipping,
   draw order and attached items. Correct the source rather than hiding a broken joint in
   one pose.
4. Export rig, artwork and requested clips together using the consumer's supported features.
   Reopen the export in a compatible player and check deformation and animation playback.
   Supply rig/version dependencies, part names, attachment conventions and sources. A layered
   character image alone is not a usable rig.

### Rigid 3D assets

Follow the [rigid-object pipeline](../assets-and-animation.md#rigid-objects-and-equipment)
for the source and its native object relationship.

1. Build or clean geometry from the accepted design, inspecting every relevant side,
   opening, contact surface and movable part. Separate parts that need independent motion
   or attachments; repair topology, normals and material assignments.
2. Normalize units, orientation, root transforms, pivots and bounds to the selected consumer.
   Author UVs/materials and required attachment locations; reconcile collision references
   with their existing gameplay owner rather than deriving new authority from appearance.
3. Create only required resource variants or levels of detail. Apply the consumer's export
   settings; bake unsupported authoring features only when the result meets the contract.
4. Reimport the final model and its dependencies. Check scale beside a known reference,
   materials, openings, pivots and attachments, and inspect actual geometry/material counts
   against relevant budgets. Deliver the sources used, textures, exports and assembly data.

### 3D characters and creatures

Follow [articulated entities](../assets-and-animation.md#articulated-people-and-creatures)
and the selected body's compatibility owner.

1. Resolve inconsistent concept views into one accepted construction. Select the supported
   body/rig family, scale, rest pose and required attachment conventions before final modeling.
2. Finish topology for intended deformation, UVs, materials and separable clothing/equipment.
   Preserve identity and readable proportions across the required views.
3. Build or adapt the skeleton, skin the body and fit attachments. Test relevant joint extremes,
   face/expression controls where requested, hands/feet and clothing contact. Matching bone
   names alone does not establish compatible proportions, rest transforms or weights.
4. Produce the requested motion through [animation clips](#animation-clips). Correct body,
   weights and equipment fit before expanding a clip set that depends on them.
5. Export the body, rig, materials and dependent clips in the supported arrangement. Reopen
   them together and inspect motion, deformation and attachment fit at intended game scale.
   Record compatible rig/body revisions and real limits. A portrait, turntable or one moving
   bone does not establish a complete animated character package.

### Animation clips

1. Pin the actual rig/source revision and requested actions. Define clip identity, duration,
   time units, loop behavior, start/end poses, supported blending and root-motion convention.
   Art follows native movement/action timing; it does not become a second gameplay authority.
2. Author, capture or retarget motion onto that rig. Resolve rest-pose/proportion differences,
   then repair foot sliding, hand/grip contact, joint limits and unintended root drift.
3. Review required loops, transitions, interruption/recovery poses and attachments. Include
   presentation markers only as supported metadata tied to existing action semantics.
4. Bake/export supported channels with the required sampling and compression. Retain the
   source motion and any retarget/bake settings needed to reproduce the export.
5. Load the exported clips on the exported rig and check normal-speed motion plus critical
   contact frames, seams and transitions. Record clip coverage and dependencies. Generated
   video may be motion reference; it is not a substitute for playable rig data. Integration
   follows the [animation route](../assets-and-animation.md).

### Materials and textures

1. Pin the intended geometry/surface, physical texture scale, UV or procedural mapping,
   tiling axes and supported material model. Decide whether lighting belongs in the artwork
   or is supplied by the renderer.
2. Finish editable paint/graphs and required maps. Remove unintended baked light from maps
   used as surface data; derive or author meaningful normal, roughness, height and other
   channels instead of relabeling a color image.
3. Repair repeated boundaries and test a multi-tile assembly where repetition is required.
   For decals/atlases, define coverage, edge behavior and padding.
4. Export supported channels with recorded color spaces, normal-map orientation, channel
   packing, alpha use, dimensions and compression. Preserve graph inputs and parameters;
   a swatch alone does not reproduce a material.
5. Load exported maps on the intended shapes under relevant lighting and view distances.
   Inspect seams, shading direction, highlights, scale and filtering. Deliver maps, material
   assignments and recipe/settings through [scene/material production](../scenes-and-interfaces.md#places-materials-and-lighting).

### Environment and scene packages

1. Choose the requested representation: layered background, modular kit, assembled scene or
   lighting setup. Reuse the corresponding image/model/material recipes instead of rebuilding
   every place as a complete 3D scene.
2. Establish common scale, orientation, pivots, join/grid rules where applicable and boundaries
   between modules. Keep placement, seeds, lighting and assembly inputs editable.
3. Assemble a representative portion using real exported pieces. Check joins, silhouettes,
   paths, object/human scale, relevant camera views and moving-view stability. Authoritative
   terrain, collision, navigation and visibility remain with their existing owners.
4. Export only the requested kit/layout/lighting data and its exact dependencies. Inspect
   whether instancing, foliage, transparency, material assignments and baked lighting survive;
   an efficient authoring scene can expand into repeated geometry on export.
5. Reopen the assembled export and verify missing dependencies, joins, relevant lighting
   conditions and applicable resource budgets. Deliver modules or layers, assembly inputs,
   source scenes and exported dependencies. Follow [places and lighting](../scenes-and-interfaces.md#places-materials-and-lighting)
   for the subsequent game work.

### Visual effects

1. Define the effect's presentation purpose, trigger, attachment/coordinate space, duration,
   start/stop behavior and supported rendering method from the consuming system.
2. Author reusable emitters, meshes, materials or sprite sequences with exposed parameters
   only where useful. Create and finish their dependencies through the relevant recipes.
3. Set bounds, sorting/blending, timing, looping, interruption and cleanup behavior. Prepare
   reduced-cost variants only where required by the current consumer.
4. Export the supported reusable setup, dependencies and parameter/binding instructions;
   a demonstration movie alone does not provide an effect.
5. Exercise the final setup starting, repeating, moving with attachments, stopping and
   finishing in a compatible preview. Check readability, clipping, transparency and applicable
   resource usage under representative overlap. Runtime event wiring, cancellation, resource
   lifetime and gameplay truth remain [feedback integration](../audio-and-feedback.md).

### Audio

1. Define the requested sound, ambience, music or speech role, actual playback system,
   duration, mono/stereo/spatial use, loop/tail behavior and required variations or stems.
   Confirm voice/source rights and the permitted content before production.
2. Edit clean masters: remove unwanted layers/noise and accidental silence, repair clicks,
   retain intentional transients/tails and match the intended family balance.
3. Build exact loop boundaries, cue markers or aligned stems when required. Listen across
   repeats and transitions; export trimmed playback files separately from useful source masters.
4. Export supported codecs, sample rates, bit depths and channel layouts. Record duration,
   loop units/positions, gain guidance and stem/variation relationships; measure clipping
   and any existing loudness/peak targets rather than imposing one target on every sound.
5. Play the actual exports in the compatible playback context, checking codec loop behavior,
   tails, intelligibility and overlap at representative levels. Deliver masters, playback
   files and metadata. Follow [audio and feedback](../audio-and-feedback.md) for integration;
   a sound's presence does not grant hearing evidence or implement an optional speech system.

For an unlisted asset type, use the [custom profile](profiles.md#custom): define its actual
consumer, source/editability needs, conversion steps, required exports and inspection conditions.
Reuse the nearest recipes and add only the missing type-specific requirements.

## 4. Validate the exported package

Validate the final consumer files after all packing, compression and conversion, not merely
the source viewport. Use an existing importer, viewer, component specimen or playback tool
with compatible settings. Reuse current tooling; create only a disposable preview if needed,
not a new maintained validation service.

Check inventory coverage and dependency resolution, then the recipe's visual/technical
conditions. Inspect applicable dimensions, units, alpha, channels, clips, bounds, file sizes
and resource budgets from the actual files. Check each export for completeness and use
representative assembled cases for behavior that spans a family. A source change invalidates
only its affected exports/evidence; rebuild and inspect those dependents before packaging.

Preserve useful previews and the exact settings or recipe needed to reproduce inspection.
Record the inspected export revision, tool/consumer, conditions, outcomes and concrete gaps
in the study record. Apply the [shared independent critique](README.md#4-inspect-revise-and-develop-only-the-required-outputs)
to substantial packages. A viewer check establishes the demonstrated conditions, not game
performance, gameplay correctness or broad device qualification. An unavailable required
check stays unverified; do not label its dependent deliverable production-ready.

## 5. Package, preserve and hand off

Use the existing asset catalog/manifest and storage workflow; the study record links those
records rather than creating a competing schema. Separate retained sources, consumer exports
and inspection material in the external workspace so a delivery package includes only its
needed files. Use the existing layout where one is established.

A complete package contains, as applicable:

- **Sources:** available original inputs, working sources for delivered assets and required
  licensed dependencies; label reconstructed sources and unavailable upstream files.
- **Consumer exports:** every requested member with its exact dependencies and required
  assembly/playback metadata. No missing texture, font, rig or clip is hidden behind a preview.
- **Export instructions:** retained input-to-export mapping and, for transformations performed,
  relevant tool versions, settings/presets and commands or authoring steps. Reusing an unchanged
  asset requires its exact source reference, not a new recipe or identical regeneration.
- **Inventory and provenance:** logical asset/part IDs mapped to exact exports, dimensions or
  units, compatibility data, source revisions, rights/attribution and current completion state.
  Use current manifest fields for hashes, byte lengths, media types and dependencies.
- **Inspection and handoff:** representative previews, checked conditions/results and limits,
  loading/assembly instructions, and specific remaining integration or approval dependencies.

Publish through [preserve and resume](README.md#preserve-and-resume) and
[Working with game assets](../../asset-workflow.md); retrieve and verify the exact package
and dependencies before marking it archived. Keep all payloads, including editable sources,
SVGs, model/animation data and preview bundles, outside Git. Public study/source access and
runtime selection retain their separate permissions.

Report readiness precisely: **exported**, **technically checked for the named consumer**,
**archived**, **selected**, and **integrated** are separate facts. Production is complete
when requested exports, agreed source/editability requirements, applicable checks and preservation
are complete, with any later integration work explicitly identified. A partial package may
be preserved and handed off as partial; recording its gaps does not complete it.

If integration was also requested and its dependencies are resolved, continue through the
existing component, renderer, animation or audio owners and normal verification. Otherwise
deliver the exact package references and the commit-pinned study record without changing
the game's selected assets.
