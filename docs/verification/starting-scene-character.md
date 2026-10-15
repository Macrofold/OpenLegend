# Starting-scene character art and motion evidence

October 15, 2026. This report covers the character work for [V3D01.1 and V3D01.6](../maintainers/3d-pixel-art.md#first-scene-delivery-and-experiment-tasks), including E04 from the [qualification plan](../projects/3d-pixel-art-validation.md#first-scene-technique-experiments). It does not qualify the entire starting-scene revision or record Mike's final art approval.

## Setup and boundaries

The supplied baseline was the completed MER12 work at `codex/mercenary-original-refinement@1438ea137`. The experiment ran in `/Users/mzw/.codex/worktrees/415f/OpenLegend` on `codex/starting-scene-pixel-art`; `5dc5ad858` contains the initial motion assets, and `1b7cd2846` contains the reviewed facial correction and neutral-pose replacement fix. Other starting-scene rendering changes were still being developed during these scoped observations.

The browser used Chrome 155.0.8059.40, PlayCanvas 2.22.2, a 1440×960 viewport and the physical Apple M1 Pro through ANGLE Metal. A disposable copy of the current initialized starting world's public view supplied the existing mercenary, people, terrain and scenery. The comparison relocated existing public-view people and supplied movement snapshots; it did not execute domain movement, combat or equipment changes, replace the active playtesting world, or contact an AI provider. The source character's unresolved rights remain inherited; no upload or redistribution clearance is asserted.

Raw captures, scripts and numerical output remained outside the repository under `/private/tmp/openlegend-mercenary-qa`. Key captures are `e04-motion-clean.webm`, `e04-motion-clean.json`, `face-detail-check.json`, `face-portrait-check.json`, `face-lifecycle-check.json` and `motion-teleport-check.json`. These are scoped experimental evidence, not committed generated output or a permanent artifact service.

## Actual animation export and import

[The Blender preparation script](../../scripts/prepare-mercenary-motion.py) imports the original GLB, preserves its named rig and exports only the selected armature's animation alternatives. The original mesh, textures and clips are unchanged. The source SHA-256 remains `cfd519287b4ebcc6233ffd269ea10cc455780f3f52c5c4e789f2db245f444ab6`.

The resulting `mercenary-motion.glb` is 148,660 bytes, with 35 nodes, four clips, 102 animation channels per clip, and no meshes, images or external dependencies. Its SHA-256 is `4535feed7092a81ed121607d293459df68567276cc8a4f5857b130e43def2f82`. The [asset provenance](../../apps/client/src/characters/mercenary-assets/mercenary-motion-provenance.json) records its scope and preparation.

| Clip               | Authored timing                                                                       | Observed interchange                       |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------ |
| WalkHeld8          | Original walk sampled every three source frames at 24 fps; endpoint retained          | Ten key times, all STEP interpolation      |
| WalkHeld12         | Original walk sampled every two source frames at 24 fps; endpoint retained            | Fourteen key times, all STEP interpolation |
| SharpFixtureSmooth | Six authored anticipation, gesture and recovery keys, with planted feet and no weapon | LINEAR interpolation                       |
| SharpFixtureHeld   | The same six gesture keys held until the next authored pose                           | STEP interpolation                         |

The actual PlayCanvas GLB parser imported all four clips with 34 bone paths matching the original rig. Its evaluator returned identical values between held keys and changing values for the smooth gesture. Both held walks exactly matched the Blender-exported smooth control's component values at their authored key times. The source walk lasts approximately 1.0833 seconds, including the export's first key at 1/24 second; the sharp gesture lasts approximately 1.0417 seconds.

[The motion owner](../../apps/client/src/characters/mercenary-motion.ts) evaluates the rig once before garment updates. Automatic engine animation advancement is disabled for this actor, preventing a second evaluation or a one-frame pause mismatch. Continuous travel and heading still belong to the existing scene; clips and gesture completion write no physical position, action result or knowledge. The staged gesture is available only through the explicit developer comparison control and does not establish an ordinary attack animation.

## Moving comparison and decision

Each clean recording phase used the same starting-world copy, reset position and camera path, then sampled 120 displayed frames after transition warm-up. All walking phases changed their displayed root position in all 120 samples. The number of distinct poses is a count of repeated values across the sampled interval, not an inferred frame-rate measurement.

| Treatment                 | Distinct leg poses | Distinct arm poses | Result                                                             |
| ------------------------- | ------------------ | ------------------ | ------------------------------------------------------------------ |
| Smooth walk, flowing cape | 117                | 117                | Retained as the smooth control                                     |
| Held8 walk, flowing cape  | 9                  | 9                  | Coarser than needed for the candidate                              |
| Held12 walk, flowing cape | 13                 | 13                 | Recommended walking candidate                                      |
| Held12 walk, settled cape | 13                 | 13                 | Useful secondary-motion control; no solver steps during this phase |
| Smooth staged gesture     | 1                  | 118                | Feet stay planted while the upper body moves                       |
| Held staged gesture       | 1                  | 5                  | Anticipation and recovery remain distinct; start/end share a pose  |

The recommended character profile is held12 for this walk, smooth idle and continuous heading, and the flowing cape. Held8 and the rigidly carried settled cape remain comparison controls rather than the default recommendation. The garment stayed finite in every phase. Captured color, shadow, silhouette and garment participants use the same evaluated rig or garment mesh; this is not an independent qualification of arbitrary equipment or poses.

The clean video-capture run observed displayed-frame p50 values of approximately 16.7–22.1 ms and p95 values of approximately 17.6–30.5 ms across phases, with a maximum of 70.7 ms in the held12 walk phase. Recording and concurrent art investigation were active, and no GPU attribution was captured. These figures describe this recording session, not population capacity or a performance acceptance gate. The first recording took screenshots inside its timing loop and produced multi-second capture stalls; its timing tails were rejected and replaced by the clean run.

## Facial correction and sampling comparison

The baseline face retained the source identity but lost its small eyes at ordinary scale. The first added-feature preview produced raised, faceted-looking brows and eyes and was rejected during development. The revised [facial preparation](../../scripts/prepare-mercenary-face.py) projects small shaped details against the original evaluated head surface. It preserves the original nose, beard, scars, hair and head silhouette, adding almond eye regions, gray irises, tapered dark lids/brows and a restrained lip crease.

The [fixed geometry](../../apps/client/src/characters/mercenary-assets/mercenary-face.json) contains 99 vertices and 88 triangles in four material regions. Coordinates belong to the original animated `Head` node in source centimetres; the original root's centimetre-to-metre conversion remains intact. The details are prepared once, attach to that head, and never regenerate with camera movement. Consistent front-facing feature normals and linear palette values removed the raised/faceted highlight problem. A presentation-only 1.08 head scale gives the realistic source face slightly more room in the coarse character image; it does not change physical body dimensions or navigation.

Front, quarter-turn, profile and back views were inspected at both 96-row and 80-row whole-figure sampling, plus an adequate-detail control. The diagnostic close camera exceeded the ordinary supported zoom range and is labeled as inspection evidence. The adequate-detail front/profile views retained the original recognizable anatomy without floating eye/brow blocks. At 96 rows the eyes remain separate, with a nose and beard division; 80 rows merges the eye area toward one dark band and loses facial separation. The recommendation is therefore 96-row sampling for this character; 80 is a rejected coarser comparison. This is still camera-sampled pixel rendering, and its pixels can change with rotation. It does not deliver permanent 3D pixel cells or creator style approval.

## Source filtering correction and moving comparison

Review found that the first filtering control affected scene-created textures but left the character's imported diffuse maps unchanged. That initial character-filter comparison was invalid and is not acceptance evidence. The material owner now retains each borrowed map's imported sampler once and applies the current source/nearest/mip choice both on preparation and later changes. The GLB owner still owns the maps; no texture art is repainted or replaced. Exact body-atlas identification also keeps facial materials outside clothing-specific shader logic.

The browser confirmed stable map identities through source → nearest → mip → source: imported source used nearest mip selection with nearest magnification; nearest disabled mipmaps; mip used trilinear minification with nearest magnification; returning source restored the imported values exactly. `character-filter-policy.json` records the observed parameters. A later moving comparison used the same paused pose, noon light, 96-row figure, three matched front captures and 150-frame slow perspective pans. `character-filter-perspective-pan.webm` and `character-filter-visuals.json` retain this comparison. No browser errors occurred, and the geometry/source texture identities stayed fixed.

The recommendation is imported source filtering. Removing mipmaps exposed noisy fine cape flecks. Trilinear minification softened those but reduced facial/embroidery definition and blurred sprite people; small vegetation showed dark fringe/dither artifacts in that comparison. Imported sampling retained the intended character detail best at this scale. Mip filtering remains a comparison option, not an accepted solution to every source-art artifact. Close front views at 80 and 96 rows were repeated with source and mip filtering; 96 retained separate eyes, while 80 still lost facial separation. Neither source filtering nor camera compensation removes all silhouette changes under rotation.

## Visible height after facial and sampling changes

The actual offscreen character color alpha occupied 96 rows in the corrected 65×114 target. The nearby ordinary person's artwork occupied 86 of its 96 rows. Converting those opaque rows through their displayed mappings gave a mercenary-to-person height ratio of approximately 1.096695 in the default view, closest ordinary zoom, minimum pitch, maximum pitch and perspective. The mercenary remains about 9.67% taller across these cases. This uses opaque-pixel coverage, not conservative mesh boxes. `character-height-profile.json` records the cases; no browser errors occurred.

## Pause, replacement, frame gaps and lifetime

- Pause held limb values and garment solver steps unchanged. Turning/editing the displayed attachment during pause carries the settled garment rather than leaving it behind.
- Interrupting the staged gesture returned to ordinary idle without an animation-controller error.
- The engine caps supplied frame delta at 0.1 seconds. The garment therefore also observes the monotonic presentation-clock gap between updates. A deliberate 400 ms main-thread gap through the actual application caller incremented its reset counter, discarded old velocity/time and left every garment position finite. This is a deliberately induced browser-frame interruption, not a server or world-clock test.
- A ten-metre public-view relocation triggered the actual re-settling path: the model temporarily yielded to its existing sprite, the garment settled in bounded steps, and the model returned with finite fabric. This is a relocation fixture, not executed travel or collision qualification.
- Three public-view remove/re-add cycles reused the same four facial mesh identities. Their scene owner retains a mesh reference between actors and releases its own meshes/material sources during scene teardown. GPU memory stayed identical across the three cycles: vertex buffers 4,650,216 bytes, index buffers 457,320 bytes, uniform buffers 10,240 bytes and total textures 97,348,232 bytes in this fixture. Teardown left vertex/index/uniform buffers at zero and 150,232 bytes of engine texture allocations.
- During a replacement while movement snapshots continued, the rig stayed idle throughout garment preparation. The existing one-time contour was then computed from current bone transforms and inverse-bind matrices before actual movement resumed. The first visible replacement frame already showed Walk with 95 prepared directional extrema. It did not cache a walking pose as the neutral height reference. The measured first-use contour preparation was approximately 34–42 ms; no claim is made that this is free or a crowd-loading qualification.

All scoped browser runs above completed without browser errors. TypeScript and changed-file formatting passed after integration; the complete starting-scene build/review and its shared rendering checks belong to the integrated report.

## E06 staged hand tool and smear comparison

An explicitly labeled scratch visual fixture attached a short practice rod and temporary smear to the actual imported `RightHand` motion. Hand-local distances are source centimetres. Its current and retained hand/tip endpoints were mapped through the character's displayed screen mapping and reconstructed at the original view depth before drawing. This avoids the visible misalignment an ordinary world-layer tool would otherwise have against the height-normalized character image. The fixture changes no native equipment, attack, physical dimensions or outcome and casts no separate tool shadow.

The same existing effects owner compared direct drawing with its 720×480 buffer at a 1440×960 viewport. Both cases included the existing fire source plus the temporary rod and smear. The fixture retained at most twelve history samples for 0.12 seconds and preserved the preceding pose when the authored STEP gesture jumped; otherwise a hold longer than the effect lifetime would lose the arc's starting point. Its final run used at most six smear vertices, displayed the smear in 62 of the first 154 active updates and 126 of 304 cumulative updates after both phases, and kept all recorded positions finite. The maximum projected endpoint reconstruction error was below 0.0005 screen pixels. These counts describe the fixture, not a supported effect/population allowance.

Pause and gesture interruption immediately cleared the rod, history and smear. Buffered captures with read-through off showed the temporary opaque wall covering the tool/body region, and the existing person placed in front preserved ordinary body occlusion while the raised tool could extend above the person; these were inspected in `e06-trail-final-wall.png` and `e06-trail-final-person.png`. Removing the two fixture render components returned the effects owner's source count from three to the one existing fire. `e06-staged-trail-final.json` and `e06-staged-trail-final.webm` retain the run. No browser errors occurred.

The recommendation is to retain direct drawing for this small fire/gesture workload: the buffer demonstrated alignment and occlusion but did not produce a clear artistic improvement sufficient to justify an extra full-view capture/composite. This trial does not qualify arbitrary transparent overlap, weapon contacts, a native smear/action system or the complete effects performance envelope. The integrated report owns the final effects decision and its combined measurements.

## Cost, provenance and remaining limits

These character experiments used installed Blender 5.2.2 LTS and existing local assets. No external generation, upload, provider or Jev call occurred; additional character-experiment cost was $0. No account credentials were read. The integrated task retains its one shared spending ceiling and its own cumulative accounting.

The evidence supports this finite rig, Idle/Walk, the explicitly staged gesture, its existing garment and the compared camera views. It does not establish arbitrary garment self-contact, all body/outfit families, sloped foot placement, actual tool use, crowd performance, lower-end hardware, production rights, permanent 3D pixels or Mike's final visual approval. Broader qualification remains in its existing V3D owners.
