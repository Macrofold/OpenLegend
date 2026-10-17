# Animation tools and techniques for dimensional pixel art

October 14, 2026 research. Mike identified the character in t3ssel8r's [Making an Animation for my 3D Pixel Art Game](https://www.youtube.com/watch?v=1FrIBkuq0ZI) as the desired quality reference. This endorses its visual result; it does not establish the exact shader, rig or renderer settings. The supplied [character transcript](transcripts/t3ssel8r-character-animation-user-transcript.txt) explains animation, while the [rendering guide](realtime-pixel-rendering.md) records separate rendering evidence.

## What makes the demonstrated attack readable

The supplied transcript describes blocking anticipation, action and recovery poses in Cascadeur, testing the swing from several directions, then selectively removing intermediate poses. A broad swing remains readable from more views than an action designed only for a side-on sprite. The creator revises the body's momentum and lunge, cleans up hidden limbs, adds cape motion and builds a short weapon smear.

The important principle is **designed timing and silhouette**. Rendering a smooth animation at low resolution does not automatically produce expressive pixel animation. Nor should every movement be uniformly choppy. The character's held poses, its travel through the world, the camera and an effect can have different timing requirements.

## A proposed production workflow

1. **Build a reusable rig around the character's proportions.** Keep shoulders, hands, feet, face features and garment attachments legible. Match scale and ground contact before judging movement. Generated geometry still needs deformation-friendly joints, consistent rest poses and reviewed weights.
2. **Block the action with a few strong poses.** Define where the character prepares, commits and recovers. Inspect front, side, back and intermediate views before polishing. A pose that hides both hands or merges the weapon into the torso will be difficult to recover through shading.
3. **Use interpolation to investigate motion, then author holds selectively.** Keep enough movement to convey weight. Test held poses for a sharp strike, smoother movement for a turn or breathing, and intentional changes in cadence within one clip.
4. **Add secondary motion with a purpose.** A cape follows the torso with delay; a head can settle after a stop. Constrain their range and preserve clothing coverage. A spring makes motion responsive but does not supply collision handling.
5. **Export and inspect the actual game asset.** Bake required constraints into supported bone or shape-key animation, choose clip names and interpolation, inspect pivots/bounds, and verify the imported result with the intended camera and light.
6. **Add short effects after the motion works.** A weapon smear should clarify a fast arc, not conceal a malformed arm or a badly timed attack. Test interruption and equipment replacement as well as completion.

This is a production proposal, not a new gameplay action specification. Existing [appearance and animation contracts](../../../docs/projects/3d-pixel-art-tech-design.md#7-animation-attachments-and-time) remain authoritative.

## Tools and interchange

| Tool or format                                                                                                                         | Useful role                                                                                                                                                                  | What still needs verification                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Blender animation and constraints](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/index.html)               | Rigging, pose editing, inverse kinematics, garment correction and export preparation. Inverse kinematics places a chain of joints to reach a target such as a foot position. | An editor constraint is not necessarily exported as executable behavior. Bake the required evaluated movement.                                                                                         |
| [Cascadeur documentation](https://cascadeur.com/help) and [official physics workflow](https://cascadeur.com/tutor/physicspipeline2025) | Assisted posing and a workflow from blocking through interpolation, physics assistance and secondary motion.                                                                 | Tool suggestions need artistic judgment, and current licensing/export capabilities need checking before adoption. The old transcript's price/free-tier statements are not current purchase advice.     |
| [Blender glTF export](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html)                                    | Transfer geometry, skinning and supported animation into a web-friendly asset.                                                                                               | Actions, tracks, baked constraints and material conversion need an actual round trip. Blender simulation logic does not automatically travel with a mesh.                                              |
| [glTF interpolation](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#interpolation)                                          | `STEP` interpolation holds the previous key value; linear interpolation changes between keys.                                                                                | The installed PlayCanvas parser/evaluator supports `STEP`, but blending, extra procedural motion and export settings can change the final result. A format feature is not an end-to-end qualification. |

The t3ssel8r transcript describes FBX and a custom Unity import step that disables interpolation and removes repeated frames. OpenLegend need not recreate that importer merely to achieve held poses. First test the existing asset route with deliberately exported interpolation. No new paid tool or engine is required by this research.

## Separate the pose from travel and camera movement

For a proposed held-pose walk, the character can move continuously along the game's committed path while its limbs change at selected animation times. Update the visible weapon, garment, shadow and outline from the same evaluated pose. Holding the body while smoothly updating its hand-held sword creates a mismatch; holding the camera with the body makes the whole scene stutter.

Prefer an in-place clip, or extract only a visual correction from authored root motion, until its relation to the authoritative movement contract is explicitly designed. A lunge drawn by an animation must not independently move the character through a wall, extend attack range or decide that a target was hit. Present permitted committed movement and action events. Foot placement and secondary motion are visual adjustments, not a second physical world.

For planted feet, consider a small number of terrain queries at meaningful contact points and reuse results while the support remains valid. Do not cast rays for every vertex or every visible bone. Re-evaluate when the support, character position or pose requires it. This is proposed cost discipline, not measured performance evidence.

## Procedural response and personality

The [procedural-animation transcript](transcripts/t3ssel8r-procedural-animation-user-transcript.txt) and creator's [public notes](https://www.patreon.com/t3ssel8r/posts/procedural-video-82487305) model a visible part following a changing target through a second-order response. Frequency controls response speed, damping controls settling/oscillation, and an additional response parameter changes anticipation or overshoot tendencies. The useful applications are head follow, body settling and a few garment/accessory controls. Personality comes from a coherent selection of responses, not maximum wobble.

One common parameterization is:

```text
omega = 2 * pi * frequency
k1 = 2 * damping / omega
k2 = 1 / omega^2
k3 = response * damping / omega
y + k1 * y' + k2 * y'' = x + k3 * x'
```

Here `x` is the target, `y` is the displayed value, and primes denote change over time. These equations describe a model, not a complete safe integrator. [The Orange Duck's spring reference](https://theorangeduck.com/page/spring-roll-call) provides independently useful analytical damped-spring formulations and rotational considerations. Keep parameterization and solver assumptions together when comparing implementations.

Large frame gaps, teleports and scene replacement need deliberate reset/advance behavior. A capped number of integration steps or an appropriate analytical update can avoid an unbounded catch-up loop. A fixed timestep alone does not prove stability for every parameter. When using quaternions for orientation, equivalent opposite signs must be reconciled before interpolation, and outputs kept normalized; the creator gives this advice in a [public follow-up comment](https://www.reddit.com/r/Unity3D/comments/w001nq/i_feature_creeped_the_heck_out_of_t3ssel8rs/). Clamp or reset secondary offsets when the asset or attachment changes.

### Numerical caution from the public follow-up

The public notes include a claim of unconditional stability for the displayed update below. An independent scalar calculation shows that this particular recurrence does not support that general claim:

```text
y_next = y + T * v
v_next = (k2 * v + T * (x + k3 * x_dot - y_next)) / (k2 + T * k1)
```

Set the target and its velocity to zero, `k1 = k2 = 1`, and `T = 4`. The update matrix is `[[1, 4], [-0.8, -3]]`, with eigenvalues approximately `-0.105573` and `-1.894427`. The latter's magnitude exceeds one, so repeated updates can grow. This is a counterexample for the displayed equation, not a test of the creator's complete game or pole-matching implementation. Do not copy the stability claim into an OpenLegend contract without checking the actual selected solver and timestep range.

## Smears and action readability

The character transcript builds a temporary curved surface along the sword's swing, with position/orientation controls and a fading texture. This can make an abrupt change between held poses read as one fast action. Treat the path as a visual history of the weapon, reset it on discontinuities, and bound its duration and sample count through the selected effect's authored settings.

Render the smear with the [effects pass](realtime-pixel-rendering.md#fire-sparks-smears-and-scorch-marks), correct depth and an intentional palette. Do not require every moving item to leave a trail. Keep fire, a sword smear, smoke and a hit flash distinct because their transparency and timing differ. Hit feedback should follow a permitted game result; a smear crossing an opponent is not sufficient evidence of a hit.

## Capes and other secondary geometry

Use a shaped mesh or a small articulated garment with enough interior/edge geometry for the camera to see around it. Painted fold accents, flat colors and realtime shading are all possible. Pixel rendering does not require a block-built cape.

Start by authoring clearance and attachment positions in the asset, then constrain garment motion. For covered regions, evaluate whether hiding never-visible body faces is appropriate for that asset configuration; this must follow actual garment visibility and replacement, rather than permanently deleting needed anatomy. A few collision shapes or conservative motion limits may be sufficient, but they need pose testing. Neither a pixel shader nor a spring prevents body poke-through by itself.

## Generative pipeline fit and acceptance

Generation can supply pose concepts, rough motion or rigged geometry candidates. Retarget them to a reviewed skeleton and inspect silhouettes, contact timing, weapon alignment and garment clearance. Do not assume a plausible rendered preview proves the exported animation is usable. Store the approved asset and clip metadata; avoid generating fresh motion on every render frame.

Compare one locomotion cycle, a turn, an idle, a sharp action and its interruption on the same approved character. Inspect light/depth/color agreement, multi-view face readability, blend transitions, ground contact, camera motion, multiple characters with distinct phase, pause/resume and replacement. Measure skinning, procedural controls, nearby ground queries and effect overlap together. Clip sampling work can be shared where content and timing permit; per-character target and attachment data cannot be shared blindly.

These are proposed validation cases under [V3D05](../../../docs/maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family), not new game mechanics or completed runtime checks. The renderer's finish, the motion design and the export/import pipeline each need their own evidence.
