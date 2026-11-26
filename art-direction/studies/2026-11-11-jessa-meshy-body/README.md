# Ser Jessa Cairn body and bald head donors

The athletic linen-wrap body and independent bald head were generated, imported and inspected in Blender. They are local study sources for a later canonical fit. The [adult age milestone](../../../docs/maintainers/art/people.md#bounded-adult-age-comparison) retains its own acceptance criteria.

## Sources and construction

[Jessa's original armored concept](../2026-10-31-character-sheet-proof/README.md#candidates) (`references/c02-jessa-cairn-sheet.png`, SHA-256 `4e55e55b8f4e0df7c14c974f7dca991a38594b2c0cd69bf2fc0570a321b75b6c`) governs likeness. The [authored height](../2026-11-03-character-heights/README.md) is 1.77 m. The armor hides anatomy, so the fitted-coverage views propose the strong 29-year-old knight's shoulders, forearms, legs, waist and hip proportions. The linen turnaround retains the athletic direction and replaces modern coverage with opaque, low-profile chest and hip wraps. The independent bald head sheet uses the original concept and exposes the scalp for separate hair. The image tool refused the combined bald-body edit.

The [Peacock donor route](../2026-11-11-peacock-meshy-conform/README.md) supplies the process: ImageGen views and Higgsfield CLI 1.2.3 Multi-Image to 3D (Meshy). Each job uses three individual views, front first, with texturing on and PBR and remeshing off. Both bodies request A-pose. The head uses front, profile and three-quarter. Prompts and crops are in the package.

| Candidate | File | Evidence and disposition |
| --- | --- | --- |
| Athletic-coverage control | `donor/jessa-meshy-donor.glb` | 154,502 triangles. Clay reveals raised coverage borders and deeper abdominal grooves than the sheet. A local rim correction softens the edges. Retained as a comparison. |
| Linen body source | `donor/jessa-linen-donor.glb` | 144,270 triangles. The athletic silhouette and limb volumes carry through. Clay still shows a chest-wrap fold and waistband contour. The raw model retains its generated hair. |
| Linen body, isolated and locally cleaned | `donor/jessa-linen-body-cleanup.glb` | 113,897 triangles. An open neck cut excludes the source head and hair. Local smoothing preserves the texture and limits displacement to 6 mm at the 1.77 m target scale. The back band and lower edges soften. Use the surrounding anatomy as a fit guide and exclude the remaining diagonal chest fold from the transfer. |
| Bald head | `donor/jessa-bald-head-donor.glb` | 216,710 triangles. Clay confirms a bald scalp, projecting nose and shaped jaw. The brow and eye sockets read more severe than the neutral reference. Refine against the artwork and preserve canonical eyes, mouth and neck seam during fitting. |

The five-angle clay and textured sheets are in `review/`. The raw provider dimensions are approximately 1.90 m for both complete bodies and the head object. Register the full body to 1.77 m and the head to anatomical landmarks. The isolated body retains the raw coordinates and scale. Body and head correspondence, joined neck deformation, separate game coverage and motion remain future fit checks.

Jessa is the athletic target. A petite, curvier target is a separate proposed source study on the same reusable topology. A direct blend between the two would couple stature, frame and volume. Independently adjustable controls need separately authored geometric effects and reviewed combined shapes.

## Resume

Local working study `2026-11-11-jessa-meshy-body/study/` in the external OpenLegend art workspace. `jessa-body-and-head-study.zip` contains 37 payloads and an internal SHA-256 inventory. ZIP SHA-256 `6ab1085948ed8a0c09261f8768dd96237f742ad601478ebaac001ddc0e811547`. The package contains the exact references, views, raw and derived GLBs, renders, and repair scripts. Private archival is pending authorization for that upload.

The three completed Meshy jobs used 90 Higgsfield credits (297.75 → 207.75), estimated plan value $3.51–$4.41 at $0.039–$0.049 per credit. IDs: `bd799050-4949-4019-9433-557cab477181` (control), `ceec673a-b559-40ef-bd7a-0c816cacaf2d` (linen), `2bc707c5-0dc1-4ed9-aa97-e4af2d152d80` (head). Image generation and private reference retrieval have no separately metered amount in this record.
