# Progressive 3D pixel art — visual and operational qualification

| Status      | Current progress                                                                                                                         | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | General family, publication and device qualification remain proposed; existing mercenary evidence covers only its named pilot scenarios. | 2026-10-04   |

**Status: required future evidence, not completed tests.** This document turns the [feature specification](3d-pixel-art-feature-spec.md) into reviewable experiments and acceptance scenarios. It does not authorize game changes, automated test authoring, live provider work, or spending.

## Maintained records

- Implementation, selected checks, and remaining gaps: [V3D tracker](../maintainers/3d-pixel-art.md).
- Experimental envelopes: [A3D limits](../limits/3d-pixel-art.md). Existing presentation limits remain in [VP01](../limits/interface.md#vp01).
- Mechanism: [technical design](3d-pixel-art-tech-design.md), [family coverage](3d-pixel-art-appearance-families.md), and [pipeline](3d-pixel-art-asset-pipeline.md).
- Existing owners: [SW visual/spatial qualification](../maintainers/spatial-world.md), [performance](../maintainers/performance.md), and [verification rules](../../.agents/rules/verification.md).

## 1. First experiment: the same camp, genuinely compared

Build a selectable in-application comparison using the same admitted fixture state and camera/light settings. Compare the current sprite/proxy approach, a hybrid with dimensional objects and a sprite character, and a deliberately styled 3D character/object approach. These are temporary developer comparison presets, not a permanent user-facing engine-switch feature.

The scene includes one recognizable person, backpack, axe or other supported held tool, tree, boulder, a small shelter, campfire, uneven terrain and a raised surface/underpass. A water edge is useful for reflection/readability but not a prerequisite for implementing a new water shader. Add a few distinct people and objects after the single-subject review so the scene does not hide crowd or material-variation problems.

Use authored or properly licensed native fixtures first. A generated concept image is not a runtime render. Capture actual gameplay footage and screenshots from the application, with the exact asset/style versions and settings. Label grayboxes, authored fixtures, provider-generated artifacts, and missing mechanics clearly.

Keep the art comparison fair: consistent scale, equivalent identity/detail intent, the same environment and permitted lighting, and disclosed production effort. Comparing a polished sprite with an untextured model only establishes that the model is unfinished. Conversely, a cinematic close-up does not establish ordinary gameplay readability.

## 2. Review motion, scale, and interaction

Run the accepted camera range: stationary overview, slow pan, continuous full yaw rotation, low/high supported pitch, close/far zoom, and both existing projections where supported. Test resize and non-integer viewport sizes, browser zoom, UI scale, device pixel ratio, near-plane crossings, and occlusion at screen edges. No view change may create a provider job.

Evaluate source art density independently of on-screen size. The existing procedural-art owner distinguishes sprite source dimensions from increased detail. Suggested experiment samples are approximately 40, 60, and 80 **internal rendered pixels** of standing-character height, not mandates for source texture resolution or every zoom level. Record the actual measured silhouette size. Determine whether important gear and identity survive; do not settle the normal scale from an arbitrary 320×180 nostalgia target.

Compare existing shading with minimal styled 3D first. Then vary one consequential option at a time: scene pixel grid/upscaling, material texture density and minification, shading bands, outlines, dithering, restrained bloom/color grade, and smooth versus stepped pose sampling. Pose-stepping samples such as 8 or 12 updates per visual second are experiments, not a locked whole-game frame rate. Keep continuous simulation, camera and UI responsive throughout.

Use daylight, low sun, dusk, and night/firelight. Review skin/clothing identity, material distinction, shadows crossing receivers, silhouette clarity, texture highlights that fight the sun, and noisy specular edges. Turning a light off must not reveal a baked permanent bright face unless the material intentionally depicts one.

The minimum real native sequence uses supported move, turn, equip, pickup/drop, and committed status/action cues. Extend to tool use, carrying, resting, death and construction where actual mechanics exist. A choreographed chop/sit/build animation in the fixture is valid visual evidence but must not be reported as a supported native gameplay loop.

## 3. Art acceptance rubric

The creator should answer concrete questions at normal gameplay size and in motion:

| Criterion                | Passing observation                                                                                      | Failure that requires action                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pixel-art identity       | Deliberate color clusters, silhouette and detail organization; not merely a low-resolution 3D screenshot | Busy material noise, generic smooth shading broken into pixels, or reliance on blur to conceal weak art                   |
| Human/object readability | Distinct individuals, clothing and important equipment are recognizable without constant zoom            | Faces/gear become indistinguishable or bodies look unintentionally toy-like                                               |
| Organic environment      | Layered natural shapes and quiet areas support the people and objects                                    | Repeated blocks/cards dominate or all surfaces have equal detail                                                          |
| Temporal stability       | Slow camera motion and turning preserve coherent edges, materials and contacts                           | Distracting shimmer, crawling outlines, detached shadows or snapping equipment                                            |
| Dimensional coherence    | Turning, carrying, depth, support and shadows make the scene more convincing                             | Hidden sides collapse, grips float, bodies penetrate terrain, or roof cutaways expose forbidden content                   |
| State truthfulness       | Current posture, possessions, damage and construction are understandable                                 | Model/art suggests an action succeeded, an item exists, or a feature works when native state says otherwise               |
| Production usefulness    | Variation and new assets can be produced and corrected repeatedly with manageable effort                 | Every outfit or pose requires rebuilding the entire character, or routine generated output needs extensive bespoke repair |

Artistic judgment remains a human acceptance decision; a single model-generated beauty score is not a release gate. Record findings and tradeoffs rather than claiming a universal numerical aesthetics score. The comparison can legitimately select sprites for a family while choosing meshes for another.

## 4. Lifecycle and authority scenarios

These are required scenario outcomes. Select focused existing checks or manual scenarios during implementation according to the repository rules; this spec does not call for generating a new large automated suite by default.

| ID  | Exercise                                                                       | Required result                                                                                                 |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Q01 | Fallback → approved sprite → approved rigid model                              | One semantic entity, unchanged mechanics and selection; each intermediate state usable                          |
| Q02 | Replace a representation while moving across a ramp/support seam               | Feet, support, heading and actual route remain coherent; no body teleport or nav rebuild                        |
| Q03 | Replace while holding/equipping/containing a real item                         | Exactly one item and correct placement/quantity; current attachment state wins                                  |
| Q04 | Receive corpse art after harvesting/removal                                    | No resurrection, duplicate effect, old pose or phantom picker                                                   |
| Q05 | Publish a model without the required current animation/state                   | Keep the compatible representation or approved state fallback; no silent loss of readability                    |
| Q06 | Change appearance brief/style/physical profile while generation runs           | Exact stale/incompatible candidate rejection; unrelated ticks do not cause spurious rejection                   |
| Q07 | Duplicate demand, double submit, reconnect and restart                         | Same durable work/receipts; no duplicate generation or publication                                              |
| Q08 | Lose a provider admission response or cancel after dispatch                    | Uncertainty and financial reserve survive; no automatic paid retry/fallback                                     |
| Q09 | Produce a valid sprite but invalid model                                       | Sprite remains approved and usable; failed stage and cost are inspectable                                       |
| Q10 | Save/load with pending art and already approved art                            | Same-version appearance/identity restored; obsolete callbacks rejected; no paid replay                          |
| Q11 | Delete/replace a world or switch principal during asset load                   | Old resources cannot install, publish into the new scope, or leak retained private art                          |
| Q12 | Reveal/roof cutaway/picking around stacked occluders                           | Only currently authorized targets and matching fragments can draw or be picked                                  |
| Q13 | Change an unseen actor's gear/appearance                                       | Remembered representation does not update to hidden live state or acquire new lights/motion                     |
| Q14 | Private asset hash, dependency URL or thumbnail requested by another user      | Access denied without confirming hidden content through convenience endpoints                                   |
| Q15 | Import malformed, oversized, external-reference or unsupported-extension asset | Bounded rejection before uncontrolled allocation/fetch; no executable content                                   |
| Q16 | Generated model suggests a larger opening, extra limb or functional flame      | No mechanical mutation; reject/flag the visual mismatch under the family contract                               |
| Q17 | GPU/context loss or failed upload during handoff                               | Compatible fallback, complete cleanup, no duplicate shadows/picking; recover without generation                 |
| Q18 | Exhaust queue, stage funding, artifact storage or client residency             | Optional work defers/fails truthfully; current gameplay and required state remain visible                       |
| Q19 | Shared geometry/material reused by many distinct instances                     | Independent pose/color/equipment and correct lifetime; deleting one instance preserves others                   |
| Q20 | Actively pinned asset is considered for garbage collection                     | No removal while needed by publication, current-format save, pack or in-flight dependency                       |
| Q21 | Incompatible clothing/body or unusual rig                                      | Explicit fit/coverage result and declared visual fallback; no body/slot manipulation                            |
| Q22 | Instance with nonhuman articulation and touch-only policy                      | Same rendering contracts without human/sight assumptions or invented actuator mechanics                         |
| Q23 | Publish/rollback concurrently from two creator sessions                        | Expected-revision conflict, no last-write-wins overwrite of newer approved work                                 |
| Q24 | Read current job status through ordinary player/NPC context                    | Only permitted art readiness; no private prompts, creator intent, hidden inventions or automatic fiction events |

Reuse corresponding SW/INV/PO/save evidence where unchanged; do not close broader parent tasks merely because one visual consumer passes.

## 5. Performance qualification

Record the actual physical machine/GPU, OS, browser/backend, viewport/DPR, scene buffer, asset/texture counts, unique versus shared geometry/materials, rigged actors/joints, active lights/shadows, effects, visible/remembered entities, and simulation speed. Separate cold load, warm play, new-asset arrival and repeated world teardown. Software-renderer FPS is diagnostic, not physical-GPU qualification.

Start with the existing camp, then vary population and asset diversity independently. Suggested fixture counts are 1, 16, 64 and 128 visible animated subjects, plus distinct rigid objects; these are measurement points, not claimed supported populations or gameplay caps. A crowd sharing one mesh/material is not evidence for the same count of unique generated assets. Run the supported ordinary and accelerated speeds, including the project's 8× target, without conflating faster animation with adequate native simulation throughput.

Measure frame-time distribution, client update/pose/submission cost, GPU time when available, decode/upload stalls, time to interactive fallback, network/cache traffic, server optional-work cost, PostgreSQL publication latency, queue age, memory/resource high-water marks, and retained-resource trends after teardown. Include old and new resources simultaneously resident during swaps and temporary decode buffers. Report p50/p95/p99 or max with sample count/duration and known measurement limitations.

[A3D12](../limits/3d-pixel-art.md#a3d12--performance-targets-and-device-profiles) proposes desktop and reduced-quality timing goals; these are not measurements. If targets fail, identify whether the cause is pose work, draw calls, materials, transparency, shadows, raster load, uploads, or native world work before selecting an optimization. Simplifying a mesh will not fix every one of those causes.

Compare low-quality fallback, ordinary sprite/hybrid and preferred 3D on the same accepted state. Quality reduction must preserve target visibility, captions, critical state/gear, and immediate permission removal. Record conditions where the chosen device cannot meet a target rather than making untested capacity claims.

## 6. Live generation qualification

Native fixtures establish correctness of contracts, not provider usefulness. After explicit task funding, run a small predeclared sample across a rigid tool, a distinctive reusable prop, and a compatible character case only when its rig pipeline exists. Include at least one failure/rejection path. Do not launch all stages/vendors as an implicit broad benchmark.

Track time to fallback, sprite and model separately; actual settled and uncertain spending; rejected attempts; references used; identity/style defects; functional-envelope mismatches; rig/part/animation failures; human correction effort; usable reuse across instances; and artifact/runtime complexity. Record whether a result was authored, generated, manually corrected, or procedurally composed. All stages and unsuccessful work count in useful-asset cost.

An attractive single object is not evidence for arbitrary constructions or creatures. Automatic publication of a family requires evidence about dangerous false acceptance as well as rejection rate. Provider/API/model terms and limits must be rechecked at the time of real use.

## 7. Evidence record and decision rule

For each slice, record commit/source baseline, exact feature/profile/asset versions, scenario, actor/audience scope, hardware/settings, expected/observed result, actual measurement method, provider-cost/receipt summary where applicable, failures, and remaining uncertainty in the appropriate authored topic report. Keep generated recordings, screenshots, traces, logs and raw provider receipts outside Git unless Mike explicitly requests those artifacts, under [verification report ownership](../../.agents/rules/documentation.md#verification-reports). Use disposable worlds; do not expose private world snapshots, credentials, private provider payloads or unlicensed reference art in evidence.

Advance the visual direction when the moving scene is compelling, identity/interaction depiction remains truthful, critical lifecycle/privacy/spending scenarios pass for that slice, and measured authoring/runtime costs support expansion. Otherwise narrow the family, improve the art/profile, or retain sprites. Bulk conversion is not the default response to an inconclusive experiment.

The original proposal did not qualify a Q scenario, profile, provider route, target device or art family. The later [mercenary pilot evidence](../verification/mercenary-default.md) records actual fixed-asset rendering, lifecycle/failure and local performance checks. Reuse those observations only for matching contracts and workloads; they are not a complete Q01–Q24 matrix or general family, generated-art, device or crowd qualification. [V3D delivery](../maintainers/3d-pixel-art.md) retains the corresponding broader gates. This documentation reconciliation ran no new visual, native or provider experiment.
