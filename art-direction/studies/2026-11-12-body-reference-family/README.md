# Body reference family

This study executes the bounded [body reference-family workflow](../../../docs/production-workflows/art-flows/body-reference-family.md). Stage A requires one usable fixed-frame lean/full pair before adding other supports. The fuller source and two Meshy donors are available for private study. The corresponding body and natural motion remain unqualified.

Coordinates are muscle mass/fullness percentages. Files and indexes made before Mike retired the definition slider on November 12, 2026 carry a third number for it: their `50/0/100` and `50/100/100` are today's `50/0` and `50/100`.

## Stage A source pair

The approved Peacock lean sheet governs `50/0`. The corresponding V3 lean recipe fixes apparent age 30, frame 0 and stature 2.031899582 m. Seedream 5.0 Pro generated the fuller `50/100` reference. At the same normalized front waist level, the exposed width is 13.60% of stature on the lean image, 15.74% on the fuller image, and 15.75% and 16.01% on the two raw donors. These are image projections. The profile arm is lowered and obscures part of the flank, and the linen conceals the pelvis and upper thighs.

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

Stage A remains open. A fuller donor must preserve the selected fixed frame after registration and transfer coherent anatomy across the shoulders, arms and torso. The two-slider plan has nine grid coordinates, checked as nine static recipes and six sweeps. A standalone converter reconstructed diagnostic data through the existing compiler. The body grid, shirt, performance and later age/base qualification require a usable source pair first. The preserved premade shirt and animation remain the same inputs for that next stage.

## Five-build reference sample

Nine concept sheets are privately archived. Four are recommended alongside the approved lean sheet for Mike’s review. The sample covers concept art only.

Mike asked on November 12, 2026 for reference concept images of five representative and varied builds of the adult masculine grid: two typical builds and three extremes. The sheets were made while the grid had a third slider for definition and 27 rows. Mike retired that slider the same day, so the table places each sheet on the current nine-coordinate muscle mass/fullness grid. Each sheet shows front, true side and back at one scale, bald neutral head and white linen braies. Each was edited from the approved lean Peacock sheet with Seedream 5.0 Pro on Higgsfield at 2496 × 1664. The [sample record](build-sample.record.json) holds every candidate's job ID, hashes, physique brief as sent, shared prompt text and measurements; its `row` is the original three-slider label and `coordinate` the current one.

| Coordinate | Role | Sheet | Notes |
| --- | --- | --- | --- |
| `M000-F000` | Extreme: slender | c09 | Least muscle and least fullness. |
| `M100-F000` | Extreme: heavily muscled | c04 | Most muscle with no fullness. |
| `M000-F100` | Extreme: very full | c05 | Most fullness with the least muscle, so fullness reads by itself. |
| `M050-F050` | Typical: average | c08 | Grid centre, and the midpoint between c04 and c05. |
| `M050-F000` | Typical: lean, fit | Approved lean Peacock sheet | Already the accepted reference for this coordinate. c07 is the same build drawn with softer relief, which is no longer a separate coordinate. |

Four coordinates have no sheet at this range: `M050-F100`, `M100-F100`, `M000-F050` and `M100-F050`. The Stage A fuller sheet was drawn for `M050-F100`, but it reads as an intermediate build beside c05: its front waist is 15.74% of stature in the Stage A measurement, against 18.10% for the half-fullness c08 here. The two measurements used different scripts; the lean sheet reads 13.60% in one and 13.63% in the other.

Front and side silhouette widths as a percentage of each figure's own crown-to-sole height. These are image projections from `review/compare-sheets.py`, not body measurements:

| Sheet | Front waist | Upper arm | Thigh | Greatest side depth, hips to lower chest |
| --- | ---: | ---: | ---: | ---: |
| Approved lean anchor | 13.63 | 4.47 | 6.04 | 12.50 |
| c09 slender | 12.40 | 3.32 | 5.24 | 12.53 |
| c07 lean, fit | 13.73 | 4.55 | 6.03 | 12.90 |
| c08 average | 18.10 | 5.78 | 7.21 | 16.03 |
| c04 muscular | 16.06 | 7.71 | 7.52 | 15.94 |
| c05 full | 20.82 | 6.56 | 9.06 | 19.66 |

**Review.** c04 and c05 read as unmistakable outliers in all three views. c05 carries fullness through chest, flanks, back, seat, arms and legs. c04 is about 29% wider across the outer shoulders than c07, which keeps the anchor's silhouette; it reads as a competition bodybuilder with heavy veining, and whether its shoulder joints stayed at the anchor's width cannot be told from the sheet. c09 is clearly thin, with an upper arm about three quarters of the anchor's width, and sits close to underweight: ribs show in the side view and faint abdominal lines remain, which suits a thin body now that relief follows the build. c07 keeps the anchor's silhouette with visibly softer relief. c08 lands at 62% of the way from the anchor to c05 in waist width and 49% in side depth, and reads as a stocky, soft, solid man.

**Superseded and alternate sheets.** The first tries stayed close to the anchor. c01 (average) reached about 12% of the way to c05 in waist width; it looks like an ordinary lean-leaning man. c02 (lean, fit) kept hard-cut abdominal blocks. c03 and c06 (slender) matched the anchor's limb widths within 2%; c06 has the softer surface and remains a milder alternative to c09. Asking for less muscle or less relief needed a much stronger description than asking for more.

**Open decisions.** Mike has not reviewed these sheets. With c05 as the full endpoint, halfway fullness (c08) is a visibly heavy-set man and an ordinary lean-leaning man (c01) sits near the lean end. Whether that is the intended meaning of 50% fullness decides whether the full endpoint is drawn lighter or typical people use low fullness values. The Stage A fuller support `M050-F100` needs a sheet that matches whichever full endpoint Mike keeps. Whether the slender end uses c09 or the milder c06, and whether c04 carries more muscle than the family should reach, are also his to choose.

**Cost.** Nine Seedream 5.0 Pro jobs at 2.5 credits: 22.5 credits, about $0.88–1.10 at the Plus plan's $0.039–0.049 per credit. Balance 112.75 before and 77.75 after. The difference also contains 12.5 credits from five jobs that a separate agent session ran for the same request between 19:38 and 19:40 UTC; its outputs are in the working copy's `concepts-5-sample/` and belong to that session's record.

**Resume.** Files are in the working copy's `build-sample-20261112/`: one folder per candidate with `prompt.txt`, `receipt.json` and `sheet.png`, plus `review/five-build-sheet.png` (anchor and the five at matched height), `review/all-candidates-sheet.png` and `review/measurements.json`. **Archived privately.** The exact [private selection](build-sample.index.json) pins collection `art-studies`, asset `body-reference-family-build-sample`, revision `build-sample-20261112-6fc669c6689f`, manifest SHA-256 `e5dfd916a03e7573611ea55e30ef8b394818f160ee376dafd4ecf32757cf2cc3`: 31 files, 68,481,540 bytes, access domain `curated-private`, permitted uses private study, offline restore and recovery. A restore into a fresh temporary workspace matched all 31 files against the index by SHA-256 and byte count. The receipts name the Higgsfield account's job and result links, so the selection stays private and grants no public or runtime use. With current project access, `pnpm assets workspace --all --index art-direction/studies/2026-11-12-body-reference-family/build-sample.index.json --output /absolute/outside/repository/build-sample` restores the folder. No jobs are outstanding.

## Generated output and limits

`references/covered-build-overview.png` is a six-build, fully clothed ImageGen overview. Its top row depicts slender, athletic and broad muscular silhouettes; its bottom row depicts slender-soft, moderate-soft and fuller silhouettes. It illustrates distributed fullness and differences in overall build. Clothing obscures muscle surfaces, panel framing differs and identity is not constant. **It is not an accepted anatomy source, not a numerical slider grid, and must not be submitted as a multi-view body donor.**

The earlier anatomy edit used the approved Peacock body sheet from `2026-11-11-peacock-meshy-conform/study/references/body/sheet.png`, requesting a neutral bald head and close-fitting opaque white medieval linen coverage. ImageGen rejected that request and a second covered-adult anatomy request. The successful full-outfit illustration is a distinct fallback; the requested anatomy references remain incomplete. Do not infer model anatomy from these clothes or treat provider refusal as evidence that the pipeline works.

Exact prompts, input role, rejection request IDs, output disposition and cost limits are in `generation-record.json`. The built-in `image_gen.imagegen` tool does not expose the model ID; none is inferred from an API default. The generated PNG SHA-256 is `ba3ccb028dc6826aa3c79713b5ed1bfd76c4d2e3ddbde44f95af1579185720f3` (verify against the pinned index before use).

## Preservation

Mike authorized local preservation and private archival of this workflow's image and prompts. The exact [private selection](body-reference-family.index.json) pins collection `art-studies`, asset `body-reference-family-concepts`, revision `body-reference-design-20261112-ba3ccb028dc6`, manifest SHA-256 `de481effc0dd2922508791cf6dbb7e0de72cab59fd3dd277084c823728e3fd7c`. Payloads belong outside Git. Working copy: `/Users/mike/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study/`.

Private publication succeeded through the existing asset authority. Fresh temporary-workspace restores verified both files against their pinned SHA-256 and byte counts (1,920,886-byte PNG and 5,723-byte prompt record). The selection grants no public or runtime use. Preserve the source record rather than copying this image into a public study or production catalogue.

## Design-only evidence

Read-only inspection found existing support for bipolar targets, multi-driver corrections, age-conditioned mesh responses and dependency-aware shape reuse in `person-family.ts`, with shared compilation/binding helpers in `scripts/art/people.py`. Dedicated age-conditioned internal joint landmarks remain a gap where structural proportions change. No executable source was changed.

A disposable numerical calculation compared the proposed grid decomposition with direct piecewise trilinear interpolation for 27 nodes and 1,000 interior points using synthetic three-component arrays. Maximum residual was `8.881784197001252e-16`. After the definition slider was retired, the same disposable check on the two-slider form used six synthetic supports, nine nodes, eight target arrays and 1,000 interior points against direct piecewise bilinear interpolation; maximum residual was `4.440892098500626e-16`. This checks the algebra only; no actual donor, family compiler, skinning, clothing, renderer or performance pass follows from it.

No Meshy or other paid provider API jobs ran for this design. Built-in image generation billing is not exposed. AWS private archive operations have usage costs not separately itemized here; no new infrastructure or source licenses were purchased. Source production and the proposed runtime experiments require their own authorized execution within the remaining cumulative task allowance.
