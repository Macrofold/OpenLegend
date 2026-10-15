# Dimensional pixel art — restyle the existing starting scene

| Status      | Current progress                                                                                                           | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The art revision and experiments are planned for the existing starting scene; the new visual treatment is not implemented. | 2026-10-15   |

## Purpose and authorization

Restyle the existing starting scene already used for gameplay and playtesting: recognizable people, readable faces and coherent clothing, organic surroundings, and light that connects everything. Preserve its current characters, objects, terrain, encounters, resources and supported activities. The camp examples below identify visual test cases within that scene; they do not specify a new opening or replacement map. This is the next visual delivery within the existing [feature specification](3d-pixel-art-feature-spec.md) and [technical design](3d-pixel-art-tech-design.md), not a separate general art pipeline.

Mike agreed to the direction and requested these document revisions and tracked implementation/experiment tasks. This request delivers the design and task breakdown; runtime work, purchases, provider calls and graphics-backend migration are not performed by the documentation task. Technique trials below are planned work, not completed evidence or selected production settings.

The documentation snapshot is `/Users/mzw/.codex/worktrees/415f/OpenLegend`, `codex/mercenary-original-refinement` at `ab0de7555`. It identifies inspected work, not a new integration base. Future implementation must select its development base through the normal workflow and confirm required assets and behavior are available there. No branch/history change is needed for this documentation update in the shared checkout.

## Maintained records

- Work, dependencies, decisions and unchecked completion: [V3D01.1–V3D01.12](../maintainers/3d-pixel-art.md#first-scene-delivery-and-experiment-tasks).
- Product/art intent: [feature specification](3d-pixel-art-feature-spec.md#1-recommendation) and [creative brief](../../art-direction/final-board/creative-brief.md).
- Mechanisms and ownership: [technical design](3d-pixel-art-tech-design.md#8-pixel-rendering-profile) and [current world presentation](../world-presentation.md).
- Experiment procedures and acceptance: [qualification](3d-pixel-art-validation.md#first-scene-technique-experiments). Keep results in the relevant [verification report](../verification.md), linked from the task when it runs.
- Resource/quality choices: [A3D19](../limits/3d-pixel-art.md#a3d19--first-scene-experiment-profiles), existing [A3D12 device targets](../limits/3d-pixel-art.md#a3d12--performance-targets-and-device-profiles), and [VP01](../limits/interface.md#vp01).
- Evidence and techniques: [research collection](../../art-direction/research/3d-pixel-worlds/README.md), [animation guidance](../../art-direction/research/3d-pixel-worlds/animation-tools-and-techniques.md) and [video index](../../art-direction/research/3d-pixel-worlds/video-library.md).

## What is settled and what the experiments decide

The bundled wilderness aims for Garbage Country's clear environmental forms, t3ssel8r's dimensional expressive people, and The Last Night/REPLACED's purposeful light and fine detail. The leading character route uses shaped animated models, controlled material colors and realtime pixel shading. Targeted face/identity artwork remains useful. Cloth may be a continuous surface; cubic anatomy is not required. Earlier 2D rigs and sprites remain valid alternatives and comparison controls.

The art target is settled enough to build. Normal camera scale, shading thresholds, sampling resolution, filtering, outline treatment, animation cadence and device profile remain experimental. Review the moving result before adopting those settings. Pixel placement stability, asset quality and animation quality need independent observations; improving one cannot qualify the other two.

## Existing starting scene and narrowly needed additions

The [completed original-model refinement](completed/mercenary-original-refinement.md) and [its scoped evidence](../verification/mercenary-default.md#original-model-refinement--october-14-2026) supply a character baseline with Idle/Walk, direct source artwork, moving cloth and world lighting. Technical delivery does not establish creator approval, production rights, general poses, sloped-foot placement or crowd performance. Preserve all earlier art revisions. At implementation launch, recheck the latest qualified successor and creator feedback; this historical baseline does not freeze the mercenary’s size or finishing choices, and a new revision needs its own relevant evidence. A reference to the imported character is not permission to redistribute it or upload it to another provider; use a cleared substitute for any workflow whose rights remain unresolved.

The baseline is the current integrated starting world, described by the [bundled-world owner](../worlds/base/survival.md#embodied-survival-and-authored-start) and authored through its existing `world.ts` and `spatial.ts` sources. Use the same starting scene, initialization path and ordinary entry into play. Do not create a separate art-only world, initializer, opening, map or required scene-selection flow. An art comparison changes the appearance/rendering treatment of that scene, not which gameplay content is loaded.

First inventory the scene and map each visual test case to its existing people, props, terrain and playtest routes. Reuse them. Preserve the current layout, physical behavior and broader playtesting scenarios while changing visual assets, materials, lighting and effects. Add a demonstration object or small decorative patch only when an important art test has no suitable existing subject; record why it is needed and keep it additive. The following are coverage examples, not a checklist requiring a second camp or duplicates of objects already present:

- One recognizable animated adult, a held-tool/backpack visual where supported, and existing sprite/proxy controls.
- A shelter edge that can obscure the person, a fire with nearby receivers, a tree, rocks, uneven ground and a raised surface that exercise current depth/support presentation. Shape the key scenery into coherent organic masses and restrained material regions; identify any remaining grayboxes explicitly.
- One manageable grass patch, then a few distinct people and props after single-character readability works.
- Daylight and firelight views, a normal gameplay framing and a closer face/clothing inspection, and repeatable orbit/pitch/pan/zoom paths in supported projections.

Compare baseline and candidate treatments on the same current-world snapshot, camera path and lighting cases. Developer controls may switch visual treatments without replacing the world. Repeatability can use a disposable copy of that same starting world through existing test tools; never reset or replace the active playtesting world to run an art trial.

The player walks, turns, selects and inspects using supported game behavior. A staged swing, outfit alternative or construction state can be a clearly labeled visual fixture if the ordinary mechanic/clip is unavailable. Do not implement new combat, construction, equipment or navigation merely to populate an art comparison. Use an existing water edge if available; add a small demonstration surface only if a selected water trial actually needs one. A new water shader or terrain reconstruction is not a prerequisite for restyling the starting scene.

## Delivery sequence

| Stage                                       | Reviewable delivery                                                                                                                                                                            | Work owner        | Gate before expanding                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A — Record the existing scene and character | Baseline footage and an inventory of the existing playtesting scene; acceptable body scale, face, cloth fit, ground contact and working controls, with only justified demonstration additions. | V3D01.1–V3D01.2   | Fix or explicitly isolate baseline defects before judging a new render treatment. Source rights are recorded per use.                |
| B — Find the pixel/light treatment          | Same assets compared under controlled materials, lighting bands, sampling/filtering and selective outlines.                                                                                    | V3D01.3–V3D01.5   | A moving result preserves detail and camera usability in daylight and firelight. Choose a candidate; reject failures visibly.        |
| C — Make the scene feel alive               | Selective pose timing and secondary motion, a coherent vegetation patch, and one correctly occluded fire or smear effect.                                                                      | V3D01.6–V3D01.8   | Each contribution helps in isolation and in the combined frame; cloth, shadows and tools agree with the visible pose.                |
| D — Establish reproducibility and scope     | An authored character and reviewed generated rigid prop share the chosen treatment; several varied subjects, application checks and device measurements expose cost/quality limits.            | V3D01.10–V3D01.11 | Record actual correction effort, operational cost and unsupported cases. Do not infer general production reliability from this pair. |
| E — Adopt from evidence                     | Mike reviews ordinary gameplay footage and the documented tradeoffs; selected settings and reusable asset preparation are reconciled into current owners.                                      | V3D01.12          | Only delivered and verified behavior becomes the default or current contract. Broader V3D gates remain separate.                     |

The [static texel-splatting investigation](../../art-direction/research/3d-pixel-worlds/texel-splatting.md) is V3D01.9. It can run independently using a permitted subset of the existing scene geometry and camera path, and need not delay stages A–C. This isolated rendering test does not introduce another playable world or replace the starting scene. Bringing it into the application requires a favorable standalone result and a scoped integration decision; animated geometry and camera-boundary failures must be addressed before production use. No engine/backend change is assumed.

Water, strong depth of field/bokeh, complex reflections and a specialized many-light renderer are conditional follow-ups inside the relevant experiment tasks. They earn inclusion through a specific visible improvement and measured cost. The first scene can be accepted with those techniques omitted, with the omission recorded.

## Implementation responsibilities

The existing scene owns permitted entities, camera, semantic selection, fallback/asset loading and teardown. The current presentation owner already creates PlayCanvas `CameraFrame` for grading/bloom and arranges read-through against retained depth. Extend that owner for any scene sampling and effects composition; do not add another camera-control system or independent color pipeline. Character resources continue to own evaluated pose/cloth and their materials, including matching shadow/depth/reveal participants.

Experiment controls belong in developer tooling and carry only explicit finite settings. They are not a new player-facing engine selector, persisted gameplay state or public protocol. Asset/material preparation happens once per relevant asset/style revision; moving the camera must not repaint a face, regenerate geometry or dispatch a provider. A fixed source-art scale and final screen sampling remain separately inspectable.

All views, captures and effects use the player-permitted scene. Selection and world labels follow the displayed camera mapping. A separate effects image shares correct scene depth, transparency conventions and camera compensation. Normal/depth/outline drawing must evaluate the same pose, cutouts and displacement as color. A light should illuminate both people and scenery coherently while preserving readable ambient fill.

Test held limb poses separately from continuous travel, camera and interface updates. Tool and garment transforms, outlines and shadows use the same evaluated pose. Secondary motion is bounded and reset on relevant discontinuities; it does not move the physical character or prove cloth collision coverage. Native actions and permitted committed outcomes remain authoritative for hit/scorch effects.

## Workload and resource preparation

Cost grows with visible animated subjects, geometry/material diversity, rig/cloth work, target pixel area, shaded lights, vegetation density and transparent overlap. Prepare immutable meshes/materials and clip data once where valid; keep per-person pose, contact and garment results separate. Filter grass interaction contributors to the relevant nearby presented subjects instead of every world actor.

Material changes invalidate affected material preparation; pose changes update the affected character and dependent passes; camera/viewport changes update target mapping and allocations only as needed. A light change invalidates lighting results rather than unchanged source geometry. Revoked visibility removes all related captures/effects promptly. Resize, failed loads, scene replacement and disposal must release experiment-owned resources through the existing owner.

Measure complete-frame CPU/GPU time, frame-time tails, draws, memory and cold/warm loading on recorded physical hardware. Toggle effects independently and together. Include several distinct moving subjects before accepting the first scene, then use V3D11 for the broader population/device envelope. Existing proposal numbers are comparison points, not measured capacity. Software rendering cannot close a physical-device gate.

## Generated-asset proof

Use a rights-cleared rigid prop candidate with known scale, material intent and supported function. Prepare its geometry/material regions, apply the same accepted treatment, and inspect it beside the authored character without a bespoke render path. Record source and runtime files, provider/compute authorization where needed, rejected candidates, actual cost/latency, correction time, file sizes and repeatability limits. Existing approved generated assets can supply the first comparison without a new paid call.

This is an offline production experiment under the [existing pipeline design](3d-pixel-art-asset-pipeline.md); it does not require the future durable generation/publication service to be implemented first. It also cannot qualify in-game generation, arbitrary rigging or safe publication. Any actual external trial follows the then-current account authorization and task cap; camera/frame changes never request generation.

## Completion and evidence limits

The art revision succeeds when the existing starting scene is attractive at normal play scale in motion, has readable people and coherent fabric/materials, preserves supported camera/selection/reveal behavior, and has an honest measured workload plus a reproducible asset preparation recipe. The [qualification document](3d-pixel-art-validation.md) owns the detailed observations and rejection criteria. The tracker owns unfinished work and decisions, including experiments that fail or techniques deliberately omitted. Compare the scene inventory and representative pre-existing playtest routes before/after: art changes must not remove existing content or replace the playable scenario. Any added demonstration content is identified explicitly.

This planning update changes zero executable logic lines. Expected first implementation spans client presentation, authored fixtures/materials and verification; asset preparation can also use existing tools outside the runtime. Rendering/lifecycle risk is moderate and grows if a backend change is proposed. Each task must estimate its actual logic changes and select focused checks from its then-current code. No broad feature estimate, performance claim or paid-work allowance is invented here.

Do not mark the broader 3D project complete when this scene is accepted. General manifests, safe arbitrary asset replacement, reusable equipment/body families, durable live generation and full device/population qualification keep their existing V3D owners.
