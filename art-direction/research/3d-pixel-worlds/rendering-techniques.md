# Assets and rendering: how to build the look

This is a technical synthesis and a set of **proposed OpenLegend experiments**, not a reconstruction of any proprietary renderer. [Reference research](reference-techniques.md) owns claims about the individual games. No technique below was implemented or benchmarked in this documentation task.

## Three different grids

| Grid            | What it controls                                                       | What happens when the camera approaches                                                                     |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Surface texture | Painted marks attached to the model through UV coordinates             | The same authored texels occupy more display pixels. Previously tiny marks may become visible.              |
| Volume/geometry | The actual shape, including any deliberately stepped or cubic surfaces | Existing blocks become larger on screen; they do not inherently create finer texture.                       |
| Render target   | Where the camera samples the completed scene                           | A fixed screen pixel grid sees more samples across a nearby object, potentially exposing more model detail. |

Calling all three “pixel density” hides the design choice. A low-resolution camera can make an ordinary smooth model look pixelated, but the underlying asset may still contain photographic texture detail. Conversely, a smooth polygon cheek can carry a small, deliberately drawn pixel face without any camera pixelation.

For the initial proposed character comparison, hold **authored surface detail** fixed. The face, seams and cloth motifs should be chosen before rendering. An optional scene effect can coordinate the presentation, but it should not be responsible for inventing the face.

## What stable pixels can mean

The useful requirement is **stable attachment to the object**, not an identical image during rotation. When a surface turns, its projected shape changes, some parts hide others, and lighting changes. Even a true voxel model must show those changes. Perspective can make equal surface texels occupy unequal screen areas.

A rotating eye should remain on the same place on the face. A belt mark should not be resampled from a moving world-space grid. A cape should not reveal skin through coincident surfaces. Those are testable requirements. Requiring every screen pixel to remain unchanged while rotating would prevent the image from depicting the rotation.

Separate the possible defects:

| Visible symptom                                                   | Likely causes to investigate                                                              | Useful correction                                                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Detail appears to crawl across a stationary material during orbit | Screen/world-projected texture, unstable procedural coordinates, changing sampling        | Use stable UVs or deliberately anchored object coordinates; inspect the material without effects.                                 |
| Fine checks sparkle at a distance                                 | Texture features smaller than a screen pixel                                              | Simplify distant detail or use controlled mipmaps, which are smaller filtered texture levels.                                     |
| Edges change a pixel at a time during rotation                    | Normal rasterization of a moving silhouette, amplified by low render resolution           | Evaluate a higher-resolution presentation or selective edge antialiasing; do not mistake every edge change for changing geometry. |
| Skin appears through cloth                                        | Intersections, insufficient coverage/thickness, backface removal or near-coincident depth | Fix mesh coverage and animation; use appropriate inner surfaces and separation.                                                   |
| Shadows or outlines swim while surface color stays fixed          | Shadow-map sampling, temporal jitter, depth/normal thresholds                             | Inspect those passes independently and tune at the intended camera scale.                                                         |

For a skinned character, textures move and deform with the skin. That is expected. The test is whether the design remains coherent, not whether a shoulder texel keeps a perfectly square projected outline through every pose.

## Authoring shaped models with pixel textures

This is the proposed leading route for characters, hard props and much scenery; it draws on the documented [Noio and BitGem workflows](reference-techniques.md).

1. **Choose silhouette and proportions first.** Model the body, face planes, clothing volume and important equipment. Use enough geometry to avoid a cuboid or toy-like silhouette. Surface pixels do not force cubic anatomy.
2. **Set a physical scale and a density target together.** Compare the character beside an accepted adult and familiar tools. Choose how many authored texels span a face at the required view. A proposed sampling ladder can test multiple densities; it is not a production limit until the comparison is accepted.
3. **Unwrap deliberately.** Keep important pixel rows and seams aligned, put seams where they are inconspicuous, and reserve space for faces/hands. A consistent world-scale density is a baseline; a consciously denser face is an artistic exception to evaluate, not an accidental mismatch.
4. **Paint recognizable clusters.** Group a few pixels into an eye, brow, mouth, buckle or fabric fold. Use broad clean areas between details. Reducing a photograph or baking a highly detailed model is a starting guide, not the finished painting.
5. **Separate material color from light.** Avoid painting strong illumination into the base texture and then applying an unrelated moving light on top. Subtle authored shading can help form; test it under front, side, back and colored light.
6. **Check seams, filtering and reduction.** Use nearest magnification when enlarged. Decide minification and mipmaps from motion tests. Preserve atlas gutters so neighboring regions do not leak at smaller mip levels. Disabling all filtering is not a universal solution to shimmer.
7. **Review in the actual camera.** An attractive UV canvas or giant portrait can fail at gameplay scale. Orbit, pitch, zoom, walk and inspect the face before increasing environment complexity.

Do not confuse texture dimensions with usable detail. A large atlas with padded unused space can contain fewer effective face pixels than a carefully allocated smaller one. Record body scale, face allocation and visible character height along with image dimensions.

## Faces, eyes and character identity

Treat the face as a small designed image wrapped onto a deliberately shaped head. Establish eye spacing, brow line, nose plane, mouth and hairline as a readable arrangement. Do not rely on a downsampled realistic texture to preserve these features. Test both sides and three-quarter views; a frontal face drawn across a crude box is particularly likely to fail.

At normal distance, hair, silhouette, skin tone, clothing and posture carry identity. A close camera should reveal the **same** face design at larger size. Lighting must not erase the eyes or turn the entire face into a single dark patch. A separate portrait may enrich conversation, but cannot excuse an unacceptable world character.

For the EthrA-inspired alternative, draw the head and body parts as coordinated sprites attached to a rig. Evaluate directional changes and part intersections explicitly. A large face sprite still needs to occupy enough screen area; the representation does not evade sampling limits. The complete rig/view implementation is a proposal, not something disclosed in EthrA's public explanation.

## Cloth does not need to be made of cubes

A cape can be a shaped polygon surface with consistent pixel texture art, or a somewhat smoother material treatment that shares the palette and light response. The important comparison is whether it belongs with the body. A finer fabric weave and broad folds often communicate cloth better than a staircase of blocks.

Give the cape a coherent outer surface, a visible inside where needed, appropriate thickness or an explicitly two-sided material, and intentional space around the body. Two-sided rendering alone does not cure intersections or guarantee correct shadows. Inspect the hem, shoulder joins and elbows from behind and below as well as from the usual camera.

Start the comparison with a fitted cape and controlled rig animation. Add cloth simulation only if the desired movement requires it. Collision can help a simulated cape, but cannot rescue incorrect weighting, missing geometry or a garment already intersecting in its rest pose. Body-surface removal under a permanently closed garment may reduce hidden work and leaks; interchangeable or open garments must handle exposed body regions correctly.

## Big-pixel presentation versus a low-resolution scene

The [Retronator distinction](https://medium.com/retronator-magazine/the-future-of-pixel-art-with-the-last-night-a9a4eb61e824) is useful terminology, not a mandatory style rule.

**Big-pixel presentation:** draw low-resolution source artwork into a higher-resolution final image. The texture remains visibly pixel-authored while movement, rotation, outlines of geometry and depth effects can be smoother. Pixels from different surfaces need not align to a single screen grid. This is the leading comparison candidate for the supplied preferences.

**Low-resolution scene:** render the world into a smaller image, then enlarge it. All covered content shares a coarse screen grid. This can unify particles, procedural objects and lighting, but also discards faces and thin objects that do not survive the lower resolution.

**Mixed presentation:** keep UI sharp, use different resolutions for selected effects, and choose whether characters share the world's final sampling. This requires correct depth and compositing; a character rendered separately must still disappear behind the right wall and cast the right shadow. A global color grade can improve cohesion but cannot fix incorrect depth.

Avoid a blanket ban on antialiasing. Filtering a pixel texture, smoothing a geometric silhouette, and accumulating samples across frames are separate decisions. Temporal antialiasing may blur or ghost fine marks; nearest textures with carefully chosen edge antialiasing may work well. Test the actual combination.

## Camera snapping and compensation

This experiment follows the supplied [aarthificial explanation](reference-techniques.md#aarthificial-and-the-unity-rendering-post). For a fixed-orientation orthographic camera, let its visible world height be `H` and the low-resolution target height be `R`. One render pixel corresponds to `s = H / R` world units in the camera's image plane.

Project the desired camera position onto that plane, round its coordinates to multiples of `s`, and render from that rounded position. Retain the difference between desired and rendered positions. During enlargement, shift the image by the corresponding screen displacement, with the sign chosen to restore the intended framing. Render an overscan border so the shift cannot expose empty edges.

Only the rendering camera is adjusted. Gameplay positions, physics, picking intentions and authoritative movement must not be rounded to this grid. Picking must account for the actual displayed image and camera.

This handles translation cleanly under the stated conditions. Rotation changes the sampling basis; zoom changes `s`; perspective changes projected scale with distance. Parallax layers need separate treatment. The method therefore deserves a targeted test, not a promise of zero motion artifacts during every OpenLegend camera gesture.

## Lighting without losing the pixel artwork

Begin with readable base colors and a restrained key light, ambient fill and shadows. Establish a clear subject/background value difference. Then evaluate stylized light bands, a small palette transform, or controlled highlights. Hard thresholds can flicker as surfaces move through a band; transitions and noise need temporal inspection.

Use normal information—the direction a surface faces—to vary lighting coherently. Geometry normals give natural broad form; authored normal maps can add surface relief if their detail agrees with the painted pixels. A low-resolution albedo alone does not imply a normal map is necessary. Flat billboard foliage may need a deliberately chosen lighting direction to avoid appearing as a thin luminous card.

Outlines can compare the scene's depth and normals to their neighbors. Depth discontinuities find many silhouettes; normal changes find some internal corners. Reconstruct depth consistently, tune thresholds by view, and handle sky, transparent foliage and water explicitly. Uniform dark outlines around every leaf will usually destroy the quiet/detail balance sought here. [Godot implementation background](https://docs.godotengine.org/en/stable/tutorials/shaders/advanced_postprocessing.html).

Atmospheric fog should reduce distant contrast and connect depth layers. Selective shafts can emphasize canopy openings or shelter gaps. Avoid making dense volumetric ray marching a prerequisite for the initial character/environment comparison. Screen resolution, transparency overlap and the number of shadowed lights matter more than whether a mesh merely looks low-poly.

## Foliage

Compare simple leaf/grass cards, clustered crossed cards, and small shaped meshes according to camera access. Anchor wind and material patterns to each plant so they move coherently. Preserve broad crowns and gaps; do not fill every surface with equally bright tiny details.

For blades, test consistent lighting over a blade and shadows/contact near its base. A card facing the camera can save geometry but introduces orientation changes and transparency overlap. Many overlapping transparent pixels can be expensive even with few triangles. Instancing repeated geometry helps draw submission; it does not eliminate fragment shading or shadow cost.

Keep decorative motion separate from mechanical geometry. A swaying grass texture should not change whether a character can pass through a rock. The [Holland references](reference-techniques.md#david-holland-grass-water-and-lighting) show why coordinated lighting and motion are as important as the blade image.

## Water as several separate effects

The following is a proposed construction order. It is **not** a claim that Holland or another creator uses these exact settings.

| Layer                            | How it works                                                                                       | What to watch                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Surface color and small patterns | Animate a deliberately sparse set of waves/highlights in coordinates attached to the water surface | Avoid texture swimming with camera movement and uniformly busy noise.                                   |
| Depth color                      | Compare water depth with the scene beneath it and mix shallow/deep colors                          | Linearize depth correctly; submerged/foreground geometry must be distinguished.                         |
| Shore foam                       | Threshold a controlled pattern near small water-to-ground depth differences                        | Prevent a foam outline around unrelated foreground objects.                                             |
| Refraction                       | Offset a sample of the already-rendered scene behind the water                                     | Reject offsets that sample foreground objects; screen edges and hidden areas have no valid information. |
| Reflection                       | For flat water, mirror a camera across the water plane and render eligible scenery to a texture    | Adds another view; clip the wrong side of the plane and prevent recursive water rendering.              |
| Highlights                       | Use the water normal, view and light direction to place bright accents                             | Keep highlights stable enough to read as chosen clusters, especially at distance.                       |

[Roystan's tutorial](https://roystan.net/articles/toon-water/) supplies a concrete depth/foam starting point; [Catlike Coding](https://catlikecoding.com/unity/tutorials/flow/looking-through-water/) explains refraction and underwater depth handling. The [planar reflection implementation](https://github.com/eldskald/planar-reflections-unity) is a study reference for the extra camera and clipping, not a directly compatible engine component.

For OpenLegend, first compare a simple animated surface plus depth-related shore treatment. Add a reflection view only when it visibly improves the selected water scene. Restrict reflection work to visible relevant planes and appropriate scene detail. A reflection must respect the player's permitted scene information, just as the primary camera does.

Planar reflections approximate a flat reflecting surface. They are not a general solution for arbitrary curved water, and every separately rendered plane can add cost. Screen-space reflections are another tradeoff: cheaper reuse of visible information can produce missing off-screen reflections. A stylized fallback can be more coherent than an intermittently incomplete physically ambitious effect.

## Bloom, depth of field and bokeh

**Bloom** spreads light around bright image regions. **Depth of field** blurs objects away from a chosen focus distance. **Bokeh** is the appearance of defocused bright points, influenced by the simulated aperture and blur method. A glowing campfire in focus and a distant blurred firelight reflection are different effects.

Use bright, small highlights against darker surroundings to give bokeh something to act on. Compose those highlights behind or around the subject. Choose the focus treatment so faces, interactable objects and relevant ground remain legible. Excessive blur can erase the very pixel craft being selected.

Treat strong cinematic focus as optional for controlled close views; evaluate a restrained or disabled version in ordinary play. Keep interface text outside scene blur. Test transparency, reflected highlights and hidden-object indication through the effect chain. Render order matters: a blur or bloom applied after nearest enlargement can produce a different style from the same effect applied inside a low-resolution world target.
