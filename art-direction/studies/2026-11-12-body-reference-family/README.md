# Body reference family

This study executes the bounded [body reference-family workflow](../../../docs/production-workflows/art-flows/body-reference-family.md). Stage A requires one usable fixed-frame lean/full pair before adding other supports. The fuller source and two Meshy donors are available for private study. The corresponding body and natural motion remain unqualified.

## Stage A source pair

The approved Peacock lean sheet governs `50/0/100`. The corresponding V3 lean recipe fixes apparent age 30, frame 0 and stature 2.031899582 m. Seedream 5.0 Pro generated the fuller `50/100/100` reference. At the same normalized front waist level, the exposed width is 13.60% of stature on the lean image, 15.74% on the fuller image, and 15.75% and 16.01% on the two raw donors. These are image projections. The profile arm is lowered and obscures part of the flank, and the linen conceals the pelvis and upper thighs.

The first Meshy multiview job forced an A-pose. The second kept the same three input panels and omitted the forced pose to isolate its effect. Both preserved the rounder abdomen and produced fused linen and exaggerated knee grooves. The second has more natural hand orientation, with remaining upper-arm and forearm length differences at the measured section centres. The lowered profile arm and covered anatomy limit what the sheet can verify. Both donors are technical trial inputs awaiting artist acceptance.

Fresh permission-checked restores verified the [fuller reference and measurements](stage-a-reference.index.json), [forced-A-pose donor and comparison](stage-a-donor.index.json), and [alternate-pose donor and comparison](stage-a-donor-native-pose.index.json) with 8, 11 and 11 files respectively. A separate profile generated from the fuller front brought the projected wrist height closer. Its far sole still sits approximately 1.7–2.2% of image stature above the near sole, with further uncertainty around the elbows and knees. It was rejected as an input for another donor. Higgsfield charged 2.5 credits for each of the two image jobs and 30 for each of the two donors, leaving 142.75 credits. No new plan or top-up was purchased.

## Stage A transfer and runtime evidence

| Trial | Observed result |
| --- | --- |
| Direct transfer from the first donor | Fuller torso section widths and depths closely match the donor. Clay reveals cuts at the lower pecs and elbows and dents at the axilla. Recomputed geometric normals retain the same defects. |
| Blender Laplacian Deform and target-normal projection from the second donor | The smoother wrap preserves the fixed seam and topology. A separate projection pass improves forward torso p95 from 6.53 to 0.87 mm. Arm p95 still measures 14.99–16.58 mm against the 4.06 mm gate. Rear elbow and wrist dents, a chest band and baseline-coverage intersections remain visible. The alternate donor's re-pose already introduced some limb creases. |
| Unreal 5.8.4 Body Only on the first donor | Shoulders are smoother. Independent FBX measurement shows a 45.49 mm shorter body than the fixed 2.031899582 m input. The waist and ribs widen, muscle relief softens, and upper-thigh bands remain visible. |
| Second-donor Laplacian body in the shared game renderer | The protected lean body reconstructs exactly. The interpolated body and the full endpoint match their numeric inputs within 1e-6 m. Rest and raised-arm views, a 52-sample slider recording and a covered Walk render with no optional shirt selected. The fuller torso changes visibly, but the legs still read lean, the underarms pinch and baseline shorts retain an angular fold. The observed Walk showed no obvious reversed elbow. Complete gait and clearance remain open. |

The [offline fitting evidence](stage-a-fit-evidence.index.json) preserves editable candidates, coverage masks, matched comparisons and the source plan. The [native comparison](stage-a-native-conform.index.json) preserves the Unreal inputs and export. The [renderer evidence](stage-a-renderer-evidence.index.json) preserves the exact private kit, six-angle captures and actual Walk and slider recordings. Runtime evidence uses the Laplacian candidate. The subsequent projection candidate is an offline comparison only.

Stage A remains open. A fuller donor must preserve the selected fixed frame after registration and transfer coherent anatomy across the shoulders, arms and torso. The 27-node grid plus the retained 30-recipe/24-sweep plan contains 39 unique static recipes. A standalone converter reconstructed diagnostic data through the existing compiler. The body grid, shirt, performance and later age/base qualification require a usable source pair first. The preserved premade shirt and animation remain the same inputs for that next stage.

## Generated output and limits

`references/covered-build-overview.png` is a six-build, fully clothed ImageGen overview. Its top row depicts slender, athletic and broad muscular silhouettes; its bottom row depicts slender-soft, moderate-soft and fuller silhouettes. It illustrates distributed fullness and differences in overall build. Clothing obscures muscle surfaces, panel framing differs and identity is not constant. **It is not an accepted anatomy source, not a numerical slider grid, and must not be submitted as a multi-view body donor.**

The earlier anatomy edit used the approved Peacock body sheet from `2026-11-11-peacock-meshy-conform/study/references/body/sheet.png`, requesting a neutral bald head and close-fitting opaque white medieval linen coverage. ImageGen rejected that request and a second covered-adult anatomy request. The successful full-outfit illustration is a distinct fallback; the requested anatomy references remain incomplete. Do not infer model anatomy from these clothes or treat provider refusal as evidence that the pipeline works.

Exact prompts, input role, rejection request IDs, output disposition and cost limits are in `generation-record.json`. The built-in `image_gen.imagegen` tool does not expose the model ID; none is inferred from an API default. The generated PNG SHA-256 is `ba3ccb028dc6826aa3c79713b5ed1bfd76c4d2e3ddbde44f95af1579185720f3` (verify against the pinned index before use).

## Preservation

Mike authorized local preservation and private archival of this workflow's image and prompts. The exact [private selection](body-reference-family.index.json) pins collection `art-studies`, asset `body-reference-family-concepts`, revision `body-reference-design-20261112-ba3ccb028dc6`, manifest SHA-256 `de481effc0dd2922508791cf6dbb7e0de72cab59fd3dd277084c823728e3fd7c`. Payloads belong outside Git. Working copy: `/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/`.

Private publication succeeded through the existing asset authority. Fresh temporary-workspace restores verified both files against their pinned SHA-256 and byte counts (1,920,886-byte PNG and 5,723-byte prompt record). The selection grants no public or runtime use. Preserve the source record rather than copying this image into a public study or production catalogue.

## Design-only evidence

Read-only inspection found existing support for bipolar targets, multi-driver corrections, age-conditioned mesh responses and dependency-aware shape reuse in `person-family.ts`, with shared compilation/binding helpers in `scripts/art/people.py`. Dedicated age-conditioned internal joint landmarks remain a gap where structural proportions change. No executable source was changed.

A disposable numerical calculation compared the proposed grid decomposition with direct piecewise trilinear interpolation for 27 nodes and 1,000 interior points using synthetic three-component arrays. Maximum residual was `8.881784197001252e-16`. This checks the algebra only; no actual donor, family compiler, skinning, clothing, renderer or performance pass follows from it.

No Meshy or other paid provider API jobs ran for this design. Built-in image generation billing is not exposed. AWS private archive operations have usage costs not separately itemized here; no new infrastructure or source licenses were purchased. Source production and the proposed runtime experiments require their own authorized execution within the remaining cumulative task allowance.
