# Peacock mercenary — art progress

**Status:** working art study and integrated game pilot; final style and production acceptance remain open. Last reconciled October 4, 2026. Parent: [art direction](../art-direction.md); technical owners: [V3D01](../3d-pixel-art.md#v3d01--visual-comparison-and-style-decision), [SW18.14](../spatial-world.md#sw18--world-presentation-delivery).

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

## Direction and feedback retained

The [creative brief](../../../art-direction/final-board/creative-brief.md) remains the overall target. For this study, Mike rejected a painterly model merely displayed at low resolution, rigid cape movement, a visible front-cloth gap and distracting shimmer during rotation. The study explores purposeful pixel detail and material colors, readable adult proportions, fitted cloth and dimensional lighting. These requests are recorded in its design/refinement files; they do not establish that every visual issue is resolved.

The isolated viewer's current target is about 192 vertical pixels with integer display scaling. The game pilot samples each character into a fixed 128×192 color/depth image while the world renders at full screen resolution. Those are implementation choices in their respective contexts, not an approved universal resolution for all artwork.

## Completed milestones

- [x] **MER01 — Editable character study.** Body/rig/walk inputs, authored cape, textures, Blender projects, animated GLBs, viewer and provenance exist. The supplied model has 34 joints and 42,426 triangles; topology/texture cleanup and production rights are still open.
- [x] **MER02 — Moving cape and sampling refinement.** Connected simulated cloth, body-derived front contact, reference skeleton bindings and revised pixel/material sampling are implemented. Idle/walk and pause are demonstrated; arbitrary pose/self-contact qualification is not complete.
- [x] **MER03 — Actual game pilot.** A separate mercenary NPC uses the model, cloth, shared world lighting/shadows and fixed character pixels, with sprite fallback and depth-aware reveal. [Integration plan](../../projects/mercenary-scene-pilot.md) and [evidence](../../verification/mercenary-default.md) own the implementation and measured limits. Originally delivered on the shadow branch and now present in `main` at `c4e18d91848b5b6d367dda1d7214a9f8222cf070`, including the additional authored NPC. The linked runs retain their actual revisions and do not establish final style, production rights or crowd acceptance.
- [x] **MER04 — Named workspace and milestone.** Sources now live in `OpenLegend-art/mercenary/`; the October 1 r1 package contains 57 source/art files, including both Blender projects. [Relocation checks](../../verification/mercenary-default.md#art-workspace-relocation--october-1-2026) verified file hashes and a working viewer/Walk animation; the package was also checked against its manifest. This package captures the study, not Git history or private provider records.

## Remaining art work

- [ ] **MER05 — Gameplay-scale art review.** Review the moving character alongside the existing people/environment, in daylight and firelight, at normal play zoom and a close view. Assess silhouette, face/equipment readability, texture noise, rotation stability and cape contact from front/back/profile. Record Mike's accepted/rejected choices with representative images or footage before marking the style approved.
- [ ] **MER06 — Source-asset refinement.** Use that review to prioritize body/cape topology, UV/texture cleanup and garment separation. Preserve the current source as a comparison; record any reduced-detail candidate as a new milestone. V3D01/V3D11 own the matched performance comparison before crowd adoption.
- [ ] **MER07 — Production art acceptance.** Record final style approval and verify body/rig/animation/texture/reference provenance and distribution rights before treating this study as a shipping asset. Reference images are inspiration, not an asset license.

Other outstanding work stays with its existing technical owner: supported action/condition/equipment poses and picking under V3D05; crowd/physical-device performance under V3D11; extended cold loading and overlapping reveal under SW18.16; long-running command/storage stress under PF00/PF11. See the [3D tracker](../3d-pixel-art.md), [spatial tracker](../spatial-world.md) and [performance tracker](../performance.md).

## Integration and next iteration

The repository's [preparation script](../../../scripts/prepare-mercenary.py) takes the active study directory as its argument and creates the trusted bundled GLB plus cloth data. [Runtime provenance](../../../apps/client/src/characters/mercenary-assets/provenance.json) records the source/output digests. The source study and prepared game output are different artifacts; editing Blender or a texture does not automatically update the game.

Re-export changed source assets/cloth data, deliberately prepare the game asset, run the affected visual/lifecycle checks, then record the new art milestone and game commit here. The October 1 technical smoke evidence used rebased game HEAD `57012a04` plus hearing-test/documentation corrections; the corresponding r1 study package remains unchanged. No new artwork generation or provider requests were made during this organization task.
