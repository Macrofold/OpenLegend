# Peacock mercenary — art progress

**Status:** a new authored block character and its game integration are implemented with scoped browser checks; hidden-character/interrupted-load checks, Mike's style approval and production acceptance remain open. Last reconciled October 14, 2026. Parent: [art direction](../art-direction.md); technical owners: [V3D01](../3d-pixel-art.md#v3d01--visual-comparison-and-style-decision), [SW18.14](../spatial-world.md#sw18--world-presentation-delivery).

## Exact local files

Working directory: `/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/`.

| Purpose                                           | File or folder                                                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Study overview and operation                      | [Workspace README](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/README.md)                                     |
| Active interactive viewer                         | [study/index.html](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/index.html)                              |
| Editable body/cape assembly                       | [mercenary.blend](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/mercenary.blend)                          |
| Editable cape study                               | [cape-study.blend](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/cape-study.blend)                        |
| Source and authoring scripts                      | [source/](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/source)                                           |
| Source/exported geometry, textures and cloth data | [assets/](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/assets)                                           |
| Visual comparisons                                | [previews/](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/previews)                                       |
| Study decisions and earlier feedback              | [DESIGN.md](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/DESIGN.md)                                      |
| Cloth/contact/sampling refinement                 | [Refinement record](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/docs/projects/cape-pixel-refinement.md) |
| Generation provenance                             | [generation-ledger.json](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/generation-ledger.json)            |
| Complete dated package and checksums              | [2026-10-01-r1/](/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/snapshots/2026-10-01-r1)                         |

The earlier visualization paths are filesystem aliases to this workspace, preserving existing viewer links without a second editable copy. Private provider job records remain beside `study/`, outside the viewer's served directory; they are not runtime assets. The snapshot preserves the original study bytes and capture notes. Use `study/` for subsequent edits, not the ZIP.

### New repository iteration

The new source and runtime files live in the working checkout at `/Users/mzw/.codex/worktrees/415f/OpenLegend/`. Their checked-in locations are:

| Purpose                                    | File                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible block authoring               | [author-voxel-mercenary.py](../../../scripts/author-voxel-mercenary.py)                                                                                   |
| Editable new character                     | [mercenary-voxel.blend](../../../apps/client/src/characters/mercenary-assets/mercenary-voxel.blend)                                                       |
| New standalone game model                  | [mercenary-voxel.glb](../../../apps/client/src/characters/mercenary-assets/mercenary-voxel.glb)                                                           |
| New source/export provenance               | [mercenary-voxel-provenance.json](../../../apps/client/src/characters/mercenary-assets/mercenary-voxel-provenance.json)                                   |
| New character rendering                    | [voxel-mercenary.ts](../../../apps/client/src/characters/voxel-mercenary.ts)                                                                              |
| Preserved earlier game model               | [mercenary.glb](../../../apps/client/src/characters/mercenary-assets/mercenary.glb)                                                                       |
| Preserved earlier rendering and provenance | [mercenary.ts](../../../apps/client/src/characters/mercenary.ts), [provenance.json](../../../apps/client/src/characters/mercenary-assets/provenance.json) |

This is a separate art iteration. The external study, October 1 snapshot, original GLB, sampled rendering and thin-cloth simulation remain available for comparison; retaining those artifacts does not introduce a legacy runtime API.

## Direction and feedback retained

The [creative brief](../../../art-direction/final-board/creative-brief.md) remains the overall target. For the earlier study, Mike rejected a painterly model merely displayed at low resolution, rigid cape movement, a visible front-cloth gap and distracting shimmer during rotation. The study explores purposeful pixel detail and material colors, readable adult proportions, fitted cloth and dimensional lighting. These requests are recorded in its design/refinement files; they do not establish that every visual issue is resolved.

The isolated viewer's target is about 192 vertical pixels with integer display scaling. The earlier game pilot samples the model into a fixed 128×192 color/depth image while the world renders at full screen resolution. Those are historical implementation choices in their respective contexts, not an approved universal resolution for all artwork.

On October 14, Mike reported that the game mercenary looked too small, gained apparent detail when zoomed in, lost its eyes and face, and showed moving pixels or underlying body parts during rotation. He requested a new design whose colored blocks belong permanently to the body and clothing, preserving the old model. That feedback authorizes this iteration; it is not final aesthetic acceptance. [Current rendering behavior](../../world-presentation.md#animated-character-pixels) and the [iteration plan](../../projects/mercenary-voxel-iteration.md) own the resulting contract and delivery scope.

## Completed milestones

- [x] **MER01 — Editable character study.** Body/rig/walk inputs, authored cape, textures, Blender projects, animated GLBs, viewer and provenance exist. The supplied model has 34 joints and 42,426 triangles; topology/texture cleanup and production rights are still open.
- [x] **MER02 — Moving cape and sampling refinement.** Connected simulated cloth, body-derived front contact, reference skeleton bindings and revised pixel/material sampling are implemented. Idle/walk and pause are demonstrated; arbitrary pose/self-contact qualification is not complete.
- [x] **MER03 — Earlier actual game pilot.** A separate mercenary NPC used the model, cloth, shared world lighting/shadows and fixed character pixels, with sprite fallback and depth-aware reveal. [Integration plan](../../projects/completed/mercenary-scene-pilot.md) and [evidence](../../verification/mercenary-default.md) own that implementation and its measured limits. Delivered on the shadow branch; this record does not claim a merge into `main`.
- [x] **MER04 — Named workspace and milestone.** Sources now live in `OpenLegend-art/mercenary/`; the October 1 r1 package contains 57 source/art files, including both Blender projects. [Relocation checks](../../verification/mercenary-default.md#art-workspace-relocation--october-1-2026) verified file hashes and a working viewer/Walk animation; the package was also checked against its manifest. This package captures the study, not Git history or private provider records.
- [x] **MER08 — New authored block source.** The new script, editable Blender file, standalone GLB and provenance are delivered. It contains 21,613 deliberately placed cells, explicit eyes/brows/nose/mouth/beard, solid garment volumes and a closed two-cell cape with authored clearance. Adjacent flat faces of the same color merge offline without changing the design. Exported source measurements are 0.025 m cell edges, 2.10 m height, 5,890 triangles, 11,780 vertices, 11 meshes, one material and 467,296 GLB bytes, with no textures, skins or animation clips. Source/hash checks, the bounded walking geometry check and scoped browser checks are recorded in the [focused evidence](../../verification/mercenary-default.md#authored-voxel-iteration--october-14-2026); this source milestone does not mark the wider art review complete.

## Rejected first block figure and new sculpted iteration

Mike explicitly rejected MER08's figure as ugly and asked for art closer to the original 3D model. Its technical checks stand, but its box-like anatomy, squared face, rigid horizontal cape throw and oversized details are not accepted art direction. MER09 is in progress: preserve both older sources and build a finer fixed-cell model guided by the original anatomical/clothing shape, with deliberately repainted face/materials, garment thickness and verified bounded walking. The [reopened plan](../../projects/mercenary-voxel-iteration.md#revised-art-direction-after-explicit-rejection) owns this revision.

## Remaining art work

- [ ] **MER05 — Gameplay-scale art review.** Review the moving character alongside the existing people/environment, in daylight and firelight, at normal play zoom and a close view. Assess silhouette, face/equipment readability, texture noise, rotation stability and cape contact from front/back/profile. Record Mike's accepted/rejected choices with representative images or footage before marking the style approved.
- [ ] **MER06 — Source-asset refinement.** MER08 delivers the separate reduced-geometry candidate requested after the latest feedback. Further refinement follows MER05's review; the preserved imported source still needs its topology/UV/texture and garment cleanup if chosen for production. V3D01/V3D11 retain the matched moving multi-character comparison before crowd adoption.
- [ ] **MER07 — Production art acceptance.** Record Mike's final style approval and the applicable reference-design/distribution review before shipping either iteration. The new script and geometry are first-party AGPL-3.0-only work; they contain no imported body, rig, animation or textures. The preserved imported study's body/rig/animation/texture rights remain independently open. Reference images are inspiration, not an asset license.

Other outstanding work stays with its existing technical owner: supported action/condition/equipment poses and picking under V3D05; crowd/physical-device performance under V3D11; extended cold loading and overlapping reveal under SW18.16; long-running command/storage stress under PF00/PF11. See the [3D tracker](../3d-pixel-art.md), [spatial tracker](../spatial-world.md) and [performance tracker](../performance.md).

## Integration and next iteration

The earlier [preparation script](../../../scripts/prepare-mercenary.py) takes the external study directory as its argument and creates the original trusted bundled GLB plus cloth data. Its [runtime provenance](../../../apps/client/src/characters/mercenary-assets/provenance.json) records those source/output digests. The source study and prepared game output are different artifacts; editing Blender or a texture does not automatically update the game.

The new authoring script instead constructs the permanent colored blocks directly and exports its own Blender/GLB files; it does not sample or voxelize the imported mesh. Each moving part keeps its block colors. The game applies a fixed uniform scale of 1.4: displayed block edges are 0.035 m, overall height 2.94 m and width 1.26 m. This compensates for an upright model appearing shorter than camera-facing people at the ordinary pitched camera; lower camera pitch can make it look larger. Zoom and orbit never alter that scale or add cells. These are presentation dimensions, not a change to the character's native body.

The new iteration uses bounded rigid walking, freezes that pose while paused, and retains sprites for loading, failure and unsupported actions/conditions. Its thick cape uses fixed geometry and clearance, with no cloth solver. This candidate changes the earlier simulated-cape choice to prioritize stable coverage; its folds no longer flow freely, and Mike's style approval remains open. [World presentation](../../world-presentation.md#animated-character-pixels) owns lighting, nearest-surface protection, selection and fallback behavior; [the focused evidence](../../verification/mercenary-default.md#authored-voxel-iteration--october-14-2026) owns actual checks and remaining limits. Fresh browser checks cover camera changes, selected clothing coverage, pause, resize, corpse fallback and repeated replacement/teardown. Hidden-character fading and interrupted/failed loads also passed the focused checks; no crowd or physical-device performance claim follows from the smaller asset.

Rebuild the intended iteration, run its affected visual/lifecycle checks, then record the art milestone and game commit here. The October 1 technical smoke evidence used rebased game HEAD `57012a04` plus hearing-test/documentation corrections; the corresponding r1 study package remains unchanged. No provider requests were needed for the newly authored block source.
