# Character bodies, faces and clothing

Original OpenLegend synthesis from [Game Character Kit](https://learn.marketwithmark.com/vault/skills/game-character-kit), [Doom Skill](https://learn.marketwithmark.com/vault/skills/doom-skill), [FPS Kit](https://learn.marketwithmark.com/vault/skills/fps-kit) and Game Development prompts 26–27, 56 and 67–71. See the [coverage record](coverage.md) for source paths and limits. These are construction methods and design inputs, not a qualified character family. The [current direction](../../decisions.md#current-direction-at-a-glance), [3D procedure](../../../docs/production-workflows/art-flows/3d-models.md) and [PPL01–PPL03](../../../docs/maintainers/art/people.md) retain authority.

## Build a convincing body before finishing it

The practical improvement behind the source examples is an assembled set of modeled parts, a compatible skeleton and motion, plus deliberate fitting. A longer prompt cannot supply missing anatomy or reconstruct an absent body beneath a costume. The source's regular-proportion body entries contain bind information without complete body geometry; its attractive dressed people therefore do not satisfy OpenLegend's removable-clothing requirement.

For an authorized body study or the PPL01 design, use this sequence:

1. Identify the person from the accepted sheet: height, age, build, posture, head shape and distinguishing features. Separate these from clothing. Start with an approved anatomical source; rejected visible MakeHuman bodies are not a shortcut.
2. Establish the full silhouette in front and side views. Compare head size, shoulder width, ribcage, pelvis, torso length, limb lengths and hand/foot scale as relationships, not independent sliders. Check the person beside a known-scale person in the same camera. Match camera height, pitch, field of view and distance before concluding the body is wrong.
3. Resolve the large connected masses: neck into shoulders, chest into abdomen, pelvis into thighs, and limbs tapering through joints. Procedural spheres or capsules may establish volume, but the final surface must have anatomical transitions rather than visible intersecting segments. Adding subdivisions to the wrong masses does not repair them.
4. Inspect bare clay from front, side, back and three-quarter views appropriate to the question. Remove texture, ornaments and dramatic light from this diagnosis. Check hands, feet, armpits, elbows, knees and crotch for bridges, holes, collapsed thickness and implausible joints.
5. Fit the chosen skeleton to the actual body. Deform the shoulders, hips, elbows and knees through the intended range before finishing. Shared bone names alone do not establish compatible bind poses, joint orientation, proportions or good deformation.
6. Add separately editable face, hair and clothing according to the accepted parts design. Preserve a complete supported body when clothing is removed. Hiding covered skin can reduce intersections; it cannot replace missing body geometry.
7. Inspect the complete person standing, turning and moving at normal game distance, then inspect identity details close up. A neutral pose passing is not evidence that walking, gripping or garment layering passes.

These steps describe what a successful body needs, not a claim that the library contains a complete anatomical generator. PPL01 must still choose the body source and coverage method. Keep the accepted source, dimensions, bind data and fitted parts together so later prompts can reproduce a person rather than reinterpret them.

## Give the face and hair real form

Resolve the skull and jaw profile, brow, eye sockets, cheek planes, nose projection, lips, chin and ears before skin detail. Eyes or makeup on a smooth lump do not establish a face. Use a close frontal view and profile to preserve a person's identity; inspect the generated geometry as clay. Fit a replacement head to the actual neck and shoulder width, including the join and skin/material transition, rather than applying a tutorial's uniform head multiplier.

Hair should describe a mass with a hairline, part, locks and a believable attachment to the scalp. Keep brows and facial hair deliberately fitted; a hairstyle borrowed from another head often needs refitting at the temples, ears and nape. Long hair, braids and hanging ornaments need the motion/attachment treatment selected by the current workflow. A hat or hood needs an explicit fit and hair-visibility decision, not simply a larger shell intersecting the hairstyle.

Preserve identity through back views and motion: hair silhouette, asymmetrical clothing and carried objects remain on the same side. Do not reserve distinctive faces for a single hero merely because the source kit does so. Recognizable recurring residents are part of OpenLegend's appeal.

## Make garments read as garments

1. Describe the garment's cut and construction: opening, neckline, hem, cuffs, thickness, overlap, closures, belt and the way fabric hangs from support points. Surface-painted clothing on a body usually reads as a tight suit because it cannot alter the contour or create the correct gaps.
2. Keep the body, garment and rigid accessories separately addressable where the consumer needs them separately. Fit each to the chosen body and shared bind pose. Mixing compatible pieces is useful; compatibility must include shape and skinning, not just a shared package name.
3. Establish the layer order and clearance. Inspect a shirt under a coat, coat under a cloak, boots against trouser hems, gloves at wrists and hair under headwear. Check bending and reaching, not only straight arms. Fit extremes matter when a family promises multiple body types.
4. Give rigid pieces the right attachment. A buckle, bracer plate or glove ornament must follow the surface/bone it belongs to; an ornament parented to a forearm-twist bone may float away from the hand.
5. Recolour selected cloth or leather regions while preserving folds, stitching and useful value variation. Hue selection can be a practical fallback for a suitable painted source; explicit material regions are preferable when available. Inspect low-saturation cloth, metal and mask boundaries instead of treating the source's hue thresholds as universal.
6. Review materials in the actual light. Pale cloth can be mistaken for skin; excessive gloss makes leather and hardware look plastic; a very dark garment can lose its form or turn grey under excessive rim light. Diagnose material values and illumination separately before changing the design.

The source recolour script and current source materials disagree on their expected texture products. Do not describe a packed outfit as rebuildable until its raw inputs and current processing recipe are available. The source's normal-map sign correction is renderer-specific; verify the target convention instead of applying a blanket channel flip.

## Creatures and unusual bodies

Start with the creature's supporting anatomy, not a humanoid with ornaments. Establish spine, chest and pelvis, limb attachment, joint directions, resting support, head/neck and tail balance. Choose a compatible rig and gait from the actual body plan. A quadruped's alternating legs, body weight shift and foot contacts must agree; bouncing a rigid torso above swinging legs does not establish a gait.

For an original creature, develop its identifying contour before scales, fur, armour or glow. Distinguish major variants through actual shape, proportions or equipment rather than only enlargement and colour. Preserve facial relief and back-view identity. Rigid horns, teeth, armour and carried objects can be separate bone-bound pieces while deforming flesh uses skinning; inspect attachment in motion. A signed-distance sculpt is a candidate way to blend volumes into a surface, not a mandate to replace a sound modeled animal or copy the source's demon anatomy.

Species, injuries, role and equipment are authored facts, not facts inferred from a colour code. Decorative body-region tags from a dismemberment system do not authorize injury mechanics. Ordinary wildlife should first use the credible anatomical sources already preferred by the art direction.

## A worked body-and-outfit brief

The following is an original pattern for an already-authorized parts study; fill it from an accepted sheet, not by inventing a new cast member:

> Build the selected person's complete unclothed body in the approved modest study presentation, preserving their recorded height and build. Resolve ribcage, pelvis, shoulder and hip transitions in clay before skin detail. Keep the face, hairstyle, shirt, trousers and outer garment separate. The outer garment must hang outside the torso contour, with visible cuff and hem thickness; it must not be skin paint. Preserve the person's face profile and the hair silhouette from behind. Show the body alone and the assembled outfit at matched scale, then the shoulder, hip and garment clearances during the requested motion. Report unsupported parts or fit instead of hiding them beneath clothing.

The agent expands this into separate geometry, fitting, texture and motion operations supported by the chosen tools. It is not one image-model payload claiming to deliver all of them.

## Design handoff

PPL01 needs to decide complete-body coverage, body traits versus deformation parameters, head joins, skeleton compatibility and missing-fit handling. PPL02 needs garment fit across those bodies, layer visibility, removal, cloth motion and cost. Retain the mechanism above as input to those decisions. A library's 65-joint render skeleton cannot silently replace OpenLegend's current 64-joint budget; neither deleting an arbitrary joint nor relabeling the skeleton qualifies it. PPL03 promotes only the accepted procedure. [Motion and contact](motion-and-visible-work.md) preserves the useful fitting and cloth techniques for that design.
