# Tools, weapons, props and materials

Original synthesis from [FPS Kit](https://learn.marketwithmark.com/vault/skills/fps-kit), [Dark Crawler Kit](https://learn.marketwithmark.com/vault/skills/dark-crawler-kit), [Doom Skill](https://learn.marketwithmark.com/vault/skills/doom-skill), [Retro VGA RPG](https://learn.marketwithmark.com/vault/skills/retro-vga-rpg) and the material/construction prompts identified in [coverage](coverage.md). The [3D workflow](../../../docs/production-workflows/art-flows/3d-models.md) owns execution and export; the selected world owns appearance and function. Examples below are original adaptations, not source weapon templates or new gameplay definitions.

## Construct the object in useful stages

1. **Specify its real dimensions and use.** Identify the dominant outline, grip or support, opening, working end and any moving components. Use references showing the relevant construction, not only an attractive perspective. State which details are inferred and which are locked by an accepted design.
2. **Choose a coherent object frame.** Record units, origin and forward/up directions in the existing asset recipe. A grip, foot or hinge can define a useful local authoring/attachment frame. The exported root still follows the existing 3D consumer contract; a grip-centred working model is not permission to change its required origin or axes. Do not copy a firearm kit's axes into OpenLegend. Check dimensions against a known-scale hand or person without enlarging the object to fake readability.
3. **Build the primary silhouette.** Use a shaped profile and thickness for a blade or bracket, a revolved profile for a vessel, and sections along a curve for a handle, horn or hull when appropriate. Match taper and changing cross-section; a row of equal cylinders often misses the defining form. Procedural authoring is useful when it expresses construction rather than merely accumulating primitives.
4. **Separate functional components.** Put a lid, lever, wheel, sliding section or removable insert on its actual pivot or travel axis. Ensure moving pieces have their required clearances throughout the range. Decorative motion must not hide a physically disconnected mechanism.
5. **Add fittings at the important joins.** A blade joins a grip, a tool head seats on a shaft, a strap attaches to something, and a vessel has wall and rim thickness. Select bevels that help edges catch light at the intended scale. Do not apply a large bevel to every edge or add tiny fasteners that the intended view cannot resolve.
6. **Add surface information by material.** Grain, forged planes, fabric weave, paint, polished contact and edge wear should explain the chosen material and use. Keep surface detail subordinate to the form. Broad painted regions and restrained grain serve OpenLegend's current look better than a photographic noise layer.
7. **Review the actual uses.** Inspect the object held, resting or attached as requested, including its underside/back and moving parts. Reuse its defining geometry and materials for ground, held and icon depictions. Adjust framing for the depiction rather than redesigning the object independently.

Shared static geometry/materials can be reused, but moving parts and item-specific appearance need the ownership supported by the renderer. This reference does not prescribe a mesh count or import the source cache/API.

For code-authored hard surfaces, preserve a sharp normal boundary at a real corner while smoothing across a rounded bevel. Split vertices where faces require different normals, UVs or attributes; indiscriminately smoothing everything makes a machined edge look inflated. Inspect the generated bounds: an extrusion's bevel can extend beyond the nominal profile/depth and move the contact surface. A reflected transform also changes handedness; preserve outward winding and the intended normal orientation. Group compatible static pieces only after their appearance is correct, retaining independent pivots for moving parts.

## Worked applications

### A hand axe or hammer

Start with the head silhouette and its socket/eye, then the haft's profile, taper and grip. The head should visibly seat on the haft; the handle should not terminate as an unexplained cylinder inside a metal box. Establish the handle's section and working length against the intended hand. Add the wedge, collar or fastening only if the selected construction uses it. Align wood grain with the haft, keep the head material distinct, and put use marks where gripping and striking would explain them. Check the fingers around the actual non-circular grip and the head's clearance during the requested carry or use motion. Mechanical properties and impact results remain world-authored.

### A sword, shield or carried tool

For a sword, settle blade profile, section, taper, guard, grip and pommel before ornament. Preserve the open clearance for fingers and wrist. For a shield, establish thickness, curvature, edge construction and the rear attachment/handhold; a front-only emblem is insufficient when the player will see its back. For any tool, identify the part doing the work and the surface transmitting the person's effort. Distinguishing wear or a mark can preserve an object's identity across ownership changes, but actual provenance must come from game state.

### A bow or articulated mechanism

Establish the resting outline, grip, limbs and string attachment, or the mechanism's fixed frame and moving links. Keep parts separately addressable if their state must change. Inspect the whole intended travel, especially end positions and where links overlap. A draw/release illustration does not supply a deforming bow, tension model or projectile behavior. Preserve those as explicit missing production or feature requirements when requested; do not compensate with an attractive animation that implies unsupported function.

### A bottle, chest or practical invention

A vessel benefits from an explicit profile, lip, neck, wall thickness and closure. A chest needs separate lid/body where opening matters, a hinge axis and unobstructed interior. An invented device should show its proposed arrangement clearly enough to discuss what connects, moves and carries a load. Use an exploded or cutaway study only to answer that question; preserve the assembled view and do not claim an unimplemented mechanism works.

## Fit hands to the actual object

A grip frame describes position, the direction along the gripped part, the wrist's approach and a compatible hand pose. Begin by placing palm and knuckle landmarks on the real mesh. Then curl fingers and place the thumb against that surface. A cylinder approximation can initialize the fit, but a flattened, angled or irregular handle needs checking against its actual shape. Two hands must also clear each other.

Inspect the contact from the palm side, back of hand and along the handle; the normal game view may hide penetration. Check wrist bend, elbow reach, finger pads, thumb position and clearance to guards or fittings. A solver reporting zero target error establishes only that its target was reached. It does not establish contact, plausible anatomy or comfortable posture.

If fit data is baked, record the mesh, socket, body, bind pose and hand pose it depends on. Refit after a relevant change instead of reusing stale angles. Parent moving contact targets to the component the hand touches; offsets must remain in that target's frame. [Motion and visible work](motion-and-visible-work.md#contacts-and-pose-correction) retains continuity and solver-order considerations.

A useful offline fitting sequence is: clear the palm and thumb base from the object; close each finger from its base toward its tip; stop the relevant joints as their segments meet the surface; place the thumb in opposition; then check the other hand and nearby fittings. Retain the authored pose where it already fits. The source samples solid occupancy around a hand to assist this process, but that approximation depends on closed geometry, sampling resolution and the parts included. A zero sampled-penetration count can miss thin surfaces or leave a floating grip. Judge the resulting contact and anatomy, and retain fitted poses rather than introducing a per-frame search by default.

## Author materials by their structure

| Material problem                | Useful construction instruction                                                                             | Check before accepting                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Wood looks like brown noise     | Establish board boundaries, grain direction, end grain and a restrained range of broad values               | Grain follows each piece; adjoining faces and repeated modules use coherent scale                  |
| Stone looks like speckle        | Establish blocks, joints or large fracture planes before grain; vary related pieces rather than every pixel | Mortar/stone dimensions, corners, seam continuity and repetition in a long wall                    |
| Metal looks like chrome plastic | Preserve form, controlled roughness, useful edge response and distinct worn/contact areas                   | Readable silhouette and material under actual review light, without a white outline on every bevel |
| Cloth looks like skin or paint  | Resolve modeled drape, hems and openings, then material region and broad fold/value treatment               | Readable garment separation at game distance and clean layer/contact boundaries                    |
| A surface looks randomly dirty  | Connect wear to handling, exposure, water paths, recesses or an authored history                            | The effect supports the selected look; no unsupported changing condition is implied                |
| A repeated texture has seams    | Make crossing motifs continuous at tile boundaries and use a consistent physical repeat size                | A repeated strip or tiled patch, then the actual adjoining meshes and camera distance              |

For procedural painted textures, establish meaningful shapes first and restrained grain last. If a motif crosses a tile boundary, wrap its continuation onto the opposite edge; checking only the centre cannot prove seamlessness. Match physical repeat size across building parts so bricks or planks do not change apparent dimensions at a join. Keep texture value variation compatible with dynamic lighting rather than baking a full lighting solution into colour.

When constructing a material set, keep colour, height, roughness, metal response and emission as distinct meanings. Derive small surface normals from the height gradient using wrapped edge samples for a tile; a seamless colour map with a discontinuous normal map still shows a seam. Grain direction, weave and machined grooves should agree across the channels. Match physical texel density and the target renderer's colour/data encodings. For chunked terrain, sample one coherent field in shared coordinates rather than restarting unrelated noise at each chunk origin.

## Diagnose the image before repainting it

Separate mesh shape, normals, UVs, colour data, material multiplication, lights, exposure and post-processing. A dark or muddy result may come from tint multiplied over an already-coloured texture; flatness may come from excessive fill or duplicated baked illumination. Mirroring a texture with a painted directional shadow can reverse its apparent light. An inverted normal or reversed face winding can make a good material appear broken or disappear from one side.

Use the narrowest useful comparison: accepted mesh with neutral material; colour texture without extra tint; the same material under the selected review light; or a view exposing the seam. Verify the actual normal-map convention and channel meanings for the export/renderer. Do not apply a source-engine fix blindly.

Emissive colour makes a surface glow; it does not necessarily light nearby objects. A light hidden inside opaque geometry does not substitute for a visible luminous surface. Glass needs the intended thickness/sidedness, material and sorting treatment; a transparent-looking picture does not prove those properties in a model. Check actual alpha for a cutout, not a painted checkerboard. Reduce shimmer at the viewing distance before adding finer detail.

## Reusable output

Retain the accepted construction reference, editable source, material regions, dimensions, pivots/attachments and relevant contact poses through the existing asset record. Keep variants tied to that identity. A good result is a reusable asset recipe with known dependencies, not only a sentence saying it should look excellent. Preserve source-specific formulas or code only where rights and actual integration justify them; the original construction instructions above remain usable without the purchased packages.
