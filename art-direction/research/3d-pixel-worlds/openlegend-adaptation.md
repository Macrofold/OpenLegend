# Adapting the research to OpenLegend

**Recommendation to test:** preserve the free camera and use complete, shaped 3D assets with deliberately painted pixel textures as the leading general-purpose candidate. Compare an EthrA-inspired articulated sprite character under the same conditions. Use cinematic lighting and selected atmosphere to support the artwork. Do not select a new engine or a universal voxel representation from these references alone.

This is an art/research recommendation, not approval to implement it. [V3D01](../../../docs/maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision) owns the actual comparison and style decision. The [existing technical design](../../../docs/projects/3d-pixel-art-tech-design.md) owns contracts, lifecycle and integration; this document supplies research rationale rather than a second implementation specification.

## What is already available, and what is not established

The inspected checkout was `codex/mercenary-voxel-art` at `26f622ec70bd96506e2b1e396691156e7cf41f2a`, October 14, 2026. No branch, checkout, model or executable file was changed by the research task.

| Area                  | Evidence in the inspected checkout                                                                                                                                                  | Consequence for the proposal                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Engine                | [Client package](../../../apps/client/package.json) pins PlayCanvas 2.22.2.                                                                                                         | Evaluate this installed version before considering upgrades or another engine.                                                 |
| Presentation boundary | [Renderer interface](../../../apps/client/src/world-renderer.ts) and [scene implementation](../../../apps/client/src/scene.ts) separate scene presentation from gameplay authority. | Put visual materials/effects in presentation; do not make a shader responsible for game rules.                                 |
| Camera and scene      | [World presentation](../../../docs/world-presentation.md) describes the current free camera, sprites/models, selection, depth/reveal and fog.                                       | A new look must preserve these interactions and current view permissions.                                                      |
| Camera inputs         | The installed engine exposes render targets, scene color/depth requests and custom projection callbacks.                                                                            | There are plausible building blocks for compositing, water and reflection experiments. Correct integration remains unverified. |
| Effect framework      | The installed `CameraFrame` source includes resolution scaling, bloom, grading, depth of field and related settings. The inspected OpenLegend scene does not instantiate it.        | Engine availability is not evidence that these effects are enabled, correctly ordered or qualified in OpenLegend.              |
| Normals for outlines  | Depth/color access does not itself establish a suitable per-pixel normal buffer in our scene.                                                                                       | Inspect the chosen path; an additional material/pass may be needed. Do not promise a free normal-based outline pass.           |

The installed engine inspection used its `build/playcanvas/src/framework/components/camera/component.js` and `build/playcanvas/src/extras/render-passes/camera-frame.js` files. Those dependencies are not repository source files. [Official post-effect documentation](https://developer.playcanvas.com/user-manual/graphics/posteffects/) and the [camera API](https://api.playcanvas.com/engine/classes/CameraComponent.html) provide further context, but current online documentation may describe a newer version than the pinned package.

No shader was ported, render target enabled or performance measured. Godot and Unity examples describe algorithms; their shader syntax, depth conventions, buffer access and resource ownership must be translated.

## A useful combination of the references

| Subject                      | Leading proposed treatment                                                                    | Artistic reference                                                 | Main tradeoff                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Terrain, rocks and buildings | Shaped meshes, pixel-painted materials, modular construction where useful                     | Garbage Country; BitGem                                            | UV/texture work and repetitive tiling need deliberate correction.                        |
| People and important animals | Complete animated meshes with designed pixel textures; compare articulated sprites            | Higher character fidelity than EthrA; REPLACED's expressive detail | Meshes need good topology/rigging; sprites need reliable views and joins.                |
| Cloaks and loose fabric      | Properly fitted, relatively continuous surfaces with coherent folds and surface art           | Original character design, interpreted through the shared palette  | Coverage and animation need explicit testing; physics is optional.                       |
| Grass and foliage            | A measured mixture of cards, clusters and shaped geometry                                     | Garbage Country; Holland                                           | Transparency, rotation and lighting can expose the construction.                         |
| Water                        | Coherent surface pattern, depth-related shore treatment, then selective reflection/refraction | Kingdom; Holland                                                   | Extra camera views and transparency cost; no reflection may reveal unauthorized content. |
| Atmosphere                   | Directional light, atmospheric depth, selective glow/focus                                    | The Last Night; REPLACED; Knight                                   | Too much blur or darkness undermines interaction and fine pixels.                        |

These are proposed visual methods, not new laws for all authored worlds. The bundled world's palette, clothing motifs, building styles and vegetation belong to its authored art/content. General rendering mechanisms should support other palettes and worlds without embedding those motifs in engine code.

## Compare assets before comparing expensive effects

Use one small scene with the same character scale, camera poses, props and light placement. Preserve the original mercenary and earlier candidates. Existing approvals or technical checks do not establish acceptance of this new aesthetic direction.

First compare the character with simple lighting and a plain background. The face, silhouette and cloth coverage must work before fog, bloom or outlines are added. Then place the chosen candidates in the same small camp and move the camera continuously. This separates an asset defect from a render effect that hides or exaggerates it.

The proposed comparison has three candidates:

1. **Painted model:** a complete shaped character, stable UV artwork, natural proportions and a properly fitted cape, viewed at adequate render resolution.
2. **Articulated sprites:** the same character design assembled from drawn parts, with enough directional treatment to cover the allowed camera. This preserves the previously proposed 2D-rig option.
3. **Low-resolution presentation variant:** use the same underlying asset as candidate one and change only the world rendering resolution/effects. This reveals whether a final pixelation pass helps or simply erases the intended art.

A comparison is not fair if the model candidate receives polished face art while the sprite candidate receives placeholder limbs. Record authoring effort as well as visual results. Do not turn this comparison into a broad environment conversion or a provider integration project.

## Suggested experimental sequence

This sequence refines the existing project tasks; the tracker remains the sole owner of unfinished work.

| Step                                | Reviewable result                                                                 | Decision it resolves                                               | Existing owner                     |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Establish scale and source art      | Matched character/body scale, readable face design, garment surfaces              | What constitutes acceptable authored detail before rendering?      | V3D01 and the individual art study |
| Compare representations             | Same moving scene and camera path for the three candidates                        | Which representation preserves detail and dimensionality?          | V3D01                              |
| Add light/material treatment        | Same scene with effects enabled separately and together                           | Which effects improve the accepted art without concealing defects? | V3D01 / SW18                       |
| Evaluate water and foliage          | A small representative patch, motion footage and measured costs                   | Which environmental techniques are worthwhile at our view?         | V3D01 / V3D11                      |
| Exercise one generated rigid object | A reviewed asset with durable source, runtime file and unchanged gameplay meaning | Can the production process reproduce the accepted style?           | V3D04 / V3D07–V3D09                |
| Qualify animated families           | Action poses, equipment fit, multiple moving people and teardown                  | Can the selected character technique scale beyond a showcase?      | V3D05 / V3D06 / V3D11              |

There is no newly adopted triangle count, texel density, frame-rate cap or generation budget here. [A3D limits](../../../docs/limits/3d-pixel-art.md) retain their existing status and ownership. Trial values belong in experiment records until evidence supports a policy change.

## What a successful comparison must show

The [qualification document](../../../docs/projects/3d-pixel-art-validation.md) remains the full acceptance owner. Add the following research-specific observations to the matched footage:

- **Scale:** the character stands naturally beside other adults and known equipment; a camera change does not alter world height.
- **Face:** eyes, brow, mouth and hairline remain intentional at close range; the usual play view retains recognizable identity. Check front, three-quarter, side and rear transitions.
- **Surface stability:** freeze animation and lights, then orbit/pitch/zoom. Distinguish stable painted marks from ordinary silhouette changes; inspect with post-effects disabled when a defect appears.
- **Garment coverage:** standing and representative action extremes do not expose the body through the cape or shirt. Check the interior and hem, not only the front silhouette.
- **Environment readability:** water, fog, vegetation and outlines preserve ground contact, important objects, target selection and hidden-character indication.
- **Motion:** moving plants, shadows, fine textures and highlights do not create distracting shimmer. Record continuous footage, not selected stills alone.
- **Operational cost:** compare the same camera path and visible population with effects on/off. Record hardware, backend, render dimensions, frame-time distribution, memory and resource counts; do not transfer another game's benchmark to OpenLegend.

## Preserve the existing engine boundaries

Generated visual detail must not silently change reach, collision, container openings, equipment capabilities or ownership. A painted window does not create an opening. Conversely, a mechanically usable opening should not be covered by a newly generated decorative wall. The [spatial contract](../../../docs/spatial-world.md) and [appearance composition design](../../../docs/projects/3d-pixel-art-appearance-families.md) already own those relationships.

Reuse the current renderer's ownership of camera state, selection, asset replacement and teardown. If an experiment allocates another texture, material, camera or render pass, its creation, replacement and disposal must follow that owner. A camera effect must not trigger generation, network hydration or repeated model conversion.

All extra views—including reflections—must use only scene data the player may receive. Camera compensation must agree with picking. Full-resolution UI must stay aligned with world labels. Transparent and separately rendered objects need correct depth ordering through the complete effect chain.

Pixel styling can lower some texture or mesh costs while increasing other work. Transparent foliage, outline buffers, reflections, shadows and full-screen blur can dominate. Measure complete frames and changing populations, not only triangle totals or an empty shader demonstration.

## Decisions still requiring the actual comparison

The preferred references and richer-character target are confirmed. The final character representation, source texel density, scene render resolution, outline treatment, ordinary-play depth of field and reflection scope are **not selected**. This research supplies options and evidence; it does not invent Mike's approval of a shader or replace the outstanding visual acceptance.
