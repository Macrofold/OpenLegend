# Progressive 3D pixel art — implementation tracker

**Status: MER11 corrects the original mercenary’s excessive size/detail with fixed tall-adult scale and coarse surface paint, with scoped visual/texture-ownership checks passed. Earlier art and technical evidence remain preserved. Creator style approval, production rights and the broader pipeline remain open.** Last reconciled October 15, 2026. Created September 27, 2026 from `main@412b5b480b4911d9977de73168c6072e2c023b83`. The original documentation task did not authorize code changes or paid provider work; the bundled art iterations have their own developer authorization.

## Maintained records

[Feature specification](../projects/3d-pixel-art-feature-spec.md) · [Technical design](../projects/3d-pixel-art-tech-design.md) · [Appearance families](../projects/3d-pixel-art-appearance-families.md) · [Art pipeline](../projects/3d-pixel-art-asset-pipeline.md) · [Qualification matrix](../projects/3d-pixel-art-validation.md) · [A3D limits](../limits/3d-pixel-art.md)

The product goal is real dimensionality with detailed pixel-art output and progressive, reusable art during invention. The delivery unit is a playable, observable slice, not a shader demo or a provider endpoint alone.

## Ownership and parent tracking

This is a focused child tracker for the proposed 3D appearance pipeline. [SW13](spatial-world.md#sw13--invention-and-generated-art-integration) owns generated-art/spatial integration, SW18 owns presentation semantics and visual qualification, and SW19/PF retain full-stack scaling. [INV-3.4 and INV-4.6/4.9](inventions-and-world-evolution.md) own invention presentation and confirmed conjuring/coordination. INV-5 owns mechanical revision/activation and INV-8 owns invention portability. [PO](persistent-objects.md) remains the owner of real items, equipment placement, containers and custody. EWF owns new trusted family capability integration.

Use these task IDs for appearance-specific deliverables and link evidence back to the relevant parent. Do not duplicate whole parent task bodies or mark an entire SW/INV/PO task complete because one renderer case passes. Same-version save integrity, privacy, funding, and lifecycle are required in every affected slice rather than deferred to a final hardening phase.

## Dependency order

Start with V3D01's visual comparison. V3D02/V3D03 establish manifests and safe replacement; V3D04 adds useful rigid families. V3D05/V3D06 establish qualified actors, equipment and state composition. V3D07 adds durable image generation; V3D08 adds validated model production. V3D09 joins the existing workshop/invention flow. V3D10 expands portable reuse. V3D11 runs with each slice; V3D12 decides the release scope from evidence.

The agreed next visual delivery is the [starting-scene art revision](../projects/3d-pixel-art-first-scene-plan.md), tracked as V3D01.1–V3D01.12 below. Record the existing starting scene as the baseline, preserve its wider playtesting content, and compare lighting/sampling/outlines, then motion/vegetation/effects, followed by authored/generated coherence and integrated review. V3D01.9's standalone texel-splatting investigation does not block the ordinary renderer candidate. The early animation/prop experiments can use trusted fixtures without waiting for the general V3D02–V3D08 infrastructure; they do not qualify that infrastructure. This document request delivers the plan/tasks, not their runtime implementation.

The character art experiment in V3D01 must happen early even though rigid objects are the first simpler production path. A direct authored/procedural model does not depend on 2D generation. V3D08 depends on V3D07 only for the 2D-first production route and shared job infrastructure it actually uses; do not make every model pass through an image provider.

## V3D01 — Visual comparison and style decision

[Art-direction progress](art-direction.md) owns the study index. The [mercenary art record](art/mercenary.md) tracks editable source locations, visual feedback, milestones and pending art approval; this tracker retains technical delivery and qualification.

**Owners:** client presentation and art direction. **Depends on:** existing WorldRenderer/SW18, no provider integration.

The [October 14 research](../../art-direction/research/3d-pixel-worlds/README.md) is complete as documentation: 34 credited reference images, direct evidence for EthrA's articulated sprite parts, Noio's pixel-UV authoring, BitGem's textured modules, and cinematic/rendering/generation analysis. [Confirmed preferences](../../art-direction/decisions.md#dimensional-pixel-art-references--october-14-2026) emphasize Garbage Country, The Last Night, richer characters than EthrA and REPLACED. The [realtime follow-up](../../art-direction/research/3d-pixel-worlds/realtime-pixel-rendering.md) adds t3ssel8r’s endorsed animated character and revises the [proposed comparison](../../art-direction/research/3d-pixel-worlds/openlegend-adaptation.md) to prioritize designed realtime pixel shading on shaped models, retaining painted-material and articulated-sprite controls. A separate static texel-splatting experiment must establish perspective benefits before animated-character or graphics-backend integration. All supplied videos and transcripts are indexed; tool/license and animation guidance are documented. Mike has since agreed to the artistic direction and focused scene/experiment plan. Technique settings, actual moving-art acceptance and broader pipeline qualification remain unchecked below.

The owner supplied the mercenary study and authorized its earlier [default-scene integration](../projects/completed/mercenary-scene-pilot.md), with live idle/walk/cloth, fixed character images and actual-depth compositing. Its source, GLB and renderer remain preserved. [MER08](art/mercenary.md#completed-milestones) delivered permanent authored cells and [scoped source/browser evidence](../verification/mercenary-default.md#authored-voxel-iteration--october-14-2026), including hidden-character fading and interrupted/failed-load checks, but Mike explicitly rejected its box-like art. The preserved [MER09 sculpture](art/mercenary.md#rejected-first-block-figure-and-new-sculpted-iteration) uses the original evaluated anatomy and outfit during authoring, with permanent finer cells and deliberately painted regions rather than sampled texture colors. [Its own evidence](../verification/mercenary-default.md#sculpted-source-guided-iteration--october-14-2026) records source and fixed mesh/color data, inspected standing/walking-extreme coverage and scoped browser/load/lifecycle checks; the [completed iteration plan](../projects/completed/mercenary-voxel-iteration.md) owns the delivered scope. Mike later rejected the sculpted face and block-like body; its technical delivery remains historical, and creator art approval remains separate under MER05/MER07. The derived geometry retains unresolved imported-source rights. [World presentation](../world-presentation.md#animated-character-pixels) owns rendering, and [SW18.14](spatial-world.md#sw18--world-presentation-delivery) tracks the pilot handoff. This revision does not accept the broader style comparison or production pipeline.

[MER10](art/mercenary.md#original-model-refinement) restored the original animated/textured model and moving cape through direct world rendering, with its own [historical scoped evidence](../verification/mercenary-default.md#original-model-refinement--october-14-2026). Mike then reported excessive size and texture resolution. [MER11](art/mercenary.md#size-and-surface-pixel-correction) reduces fixed scale to 1.1 (2.035 m) and prepares faithful 192×192 body / 192×288 cape paint with nearest magnification and mip filtering. The [size/detail plan](../projects/completed/mercenary-size-and-density.md) owns the correction and its own completed texture-ownership checks. [A3D18](../limits/3d-pixel-art.md#a3d18--restored-original-animated-mercenary) records the current profile; source textures/geometry and both block trials remain preserved. This correction does not close the matched style comparison, creator approval, imported-source rights or crowd/device gates.

- [x] Deliver a separate reduced-geometry mercenary candidate while preserving the prior model. MER08's 5,890-triangle, one-material, texture-free asset is authored from fixed colored cells, with no skinning or cape solver; this is a delivered source candidate, not a crowd-performance result or final style approval.
- [x] Deliver MER09’s sculpted source, game integration and scoped technical qualification with its own [source/visual/browser evidence](../verification/mercenary-default.md#sculpted-source-guided-iteration--october-14-2026). Original-model likeness and bounded standing/walking coverage were inspected; fixed geometry/color, selection/reveal, fallback/load and replacement/teardown checks passed. Preserve the original study and both rejected block models. Mike subsequently rejected this sculpture’s face and block-like appearance; its technical checks do not establish accepted art direction. This delivery does not close creator style approval or imported-source rights.
- [x] Deliver MER10’s original-model restoration with its own [browser evidence](../verification/mercenary-default.md#original-model-refinement--october-14-2026): tall-adult size, face/fit inspection, lighting, pause, selection/reveal, fallback and lifecycle. Preserve both block trials and the completed [refinement plan](../projects/completed/mercenary-original-refinement.md); historical pilot/trial results do not qualify this revision.
- [x] Deliver MER11’s size/surface-density correction with its own [scoped evidence](../verification/mercenary-default.md#size-and-surface-pixel-correction--october-15-2026): low/default view comparison, readable coarse paint, fixed texture identity and shared prepared-texture replacement/destruction. Original sources remain preserved; final art acceptance is separate.
- [ ] Run the matched moving multi-character benchmark before extending the mercenary to crowds. The sprite-only eight-fire performance evidence does not qualify any mercenary iteration. Add supported action/condition/equipment poses and accurate silhouette picking through V3D05; qualify sloped-foot placement and any simulated-cloth self-contact separately. Mike's style acceptance and applicable production-rights review remain required; the preserved imported body/rig/texture rights are still open.

The earlier camp, character-treatment and creator-review checklist is expanded into the stable child tasks below. Their acceptance remains open; the delivered mercenary work above supplies a baseline rather than closing these experiments.

### First-scene delivery and experiment tasks

All child tasks are **Not started**. The [feature specification](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md) and [first-scene plan](../projects/3d-pixel-art-first-scene-plan.md) define scope. [Qualification E01–E08](../projects/3d-pixel-art-validation.md#first-scene-technique-experiments) owns comparison procedures and evidence; this tracker owns work/dependencies/results. Existing A3D/VP01 limits and authorization continue to apply. Record rejection/defer decisions as completed investigations with linked reasons, not as accepted production techniques.

#### V3D01.1 — Character baseline and asset-use review

**Owner:** art direction and character presentation. **Depends on:** available MER10 delivery, its latest qualified successor, or a suitable cleared substitute; does not reopen its completed technical checks without a relevant failure.

- [ ] Review scale, intentional face features, original identity and representative Idle/Walk garment coverage at normal and close views, daylight and firelight. Record permitted asset uses/source rights and any substitute needed for production or provider input; preserve prior art revisions.
- [ ] Fix or isolate demonstrated baseline art/fit defects before judging a new pixel treatment. Record the baseline version, footage and unresolved poses/terrain cases. **Exit:** a usable comparison subject, with creator art acceptance still distinct from technical validity.

#### V3D01.2 — Existing starting scene and matched art controls

**Owner:** existing client scene/developer tooling and art direction. **Depends on:** V3D01.1 for the reviewed subject; existing WorldRenderer/SW18, without new provider services.

- [ ] Inventory the existing starting scene and map the visual cases to its current people, equipment, shelter/occlusion, fire, vegetation, rocks and terrain. Restyle those assets/materials under the creative brief while preserving layout, characters, objects, encounters, resources, native interactions and wider playtest routes. Reuse the existing initializer and entry into play; no new art-only world/map/opening. Add only a justified missing demonstration object or small decorative patch, and identify it explicitly.
- [ ] Supply repeatable snapshots/camera/light cases and developer controls that switch visual treatment on the same starting world without replacing its scenario or resetting active playtesting progress, retaining existing sprite/proxy/painted controls with comparable scale/detail intent. A separate polished 2D-rig pipeline is not a prerequisite; preserve it as an explicitly evaluated alternative. **Exit:** a repeatable art comparison in the existing scene, with existing playtest content preserved and only justified additions; temporary resources release on exit.

#### V3D01.3 — Realtime material and lighting comparison

**Owner:** existing presentation/material owner and art direction. **Depends on:** V3D01.2. **Procedure:** E01.

- [ ] Compare ordinary drawing with controlled regions, designed light bands/transitions, ambient fill and material-aware highlights on identical assets. Reuse current lights, grading/bloom and shadows; inspect people and scenery together.
- [ ] Record chosen/rejected variants, fire/daylight face readability, band popping and measured contribution. **Exit:** a justified candidate or revision task; a specialized many-light/deferred pass is considered only for a demonstrated unmet need.

#### V3D01.4 — Camera sampling, filtering and pixel stability

**Owner:** existing camera/presentation owner. **Depends on:** V3D01.2 and a recorded material/light baseline from V3D01.3. **Procedure:** E02.

- [ ] Compare adequate-resolution drawing, a compensated low-resolution path where applicable, source-detail/filtering choices and enlargement. Keep source art and pose fixed; exercise continuous supported camera movement, projections and viewport mapping.
- [ ] Distinguish material crawl, silhouette sampling, light/shadow changes and zoom revealing existing detail; preserve face/tool readability, labels and picking. **Exit:** recorded sampling tradeoffs and remaining artifacts with no silent camera restriction, simulation snapping or universal zero-shimmer claim.

#### V3D01.5 — Selective outlines and matching surface passes

**Owner:** presentation/shadow/reveal integration. **Depends on:** V3D01.3–V3D01.4 candidate. **Procedure:** E03.

- [ ] Compare no outlines with the smallest useful depth/normal/object-aware treatment, adding a normal target only when needed. Inspect faces, thin equipment, foliage cutouts, grazing views and cloth deformation.
- [ ] Verify current depth/reveal/selection behavior and matching poses in all contributing passes. **Exit:** adopt a measured restrained treatment or record why outlines are omitted; no edge may reveal forbidden content.

#### V3D01.6 — Pose timing, export and secondary motion

**Owner:** character pose/cloth and asset preparation. **Depends on:** V3D01.2; final combined review also uses V3D01.3–V3D01.5. **Procedure:** E04. Broader rig/equipment work stays in V3D05.

- [ ] Compare smooth and selected held poses through actual export/import, while travel/camera/UI remain responsive. Review idle, walk/turn and a clearly labeled sharp-action fixture where no ordinary clip/mechanic exists.
- [ ] Compare restrained secondary motion, garment clearance and relevant interruption/pause/teleport/frame-gap resets; keep tool, shadow and outline on the same evaluated pose. **Exit:** cadence/solver choices or rejections supported by motion footage, without treating root motion or animation events as gameplay authority.

#### V3D01.7 — Vegetation and selective environmental effects

**Owner:** landscape/material presentation. **Depends on:** V3D01.2 and V3D01.3 light baseline. **Procedure:** E05.

- [ ] Compare a manageable instanced grass/card/mesh patch, coordinated ground colors, world-anchored wind and independent phases; bound interaction work by relevant nearby presented contributors. Record transparency, shadow and rotation costs.
- [ ] Evaluate cloud shadows, simple water/shore treatment and restrained atmospheric focus/bloom only where a specific scene benefit justifies the trial. Record omitted/deferred water, reflections and strong bokeh explicitly. **Exit:** a coherent patch and justified environmental scope, not mandatory completion of every reference effect.

#### V3D01.8 — Fire, smears and effects composition

**Owner:** existing presentation and visual-effect resources. **Depends on:** V3D01.2–V3D01.4; weapon effects use V3D01.6's evaluated pose when applicable. **Procedure:** E06.

- [ ] Compare existing effect drawing with a separate effects image where useful; distinguish additive/emissive particles, smoke and a temporary tool smear. Inspect lighting of nearby receivers, depth, alpha/color space and camera/resize alignment.
- [ ] Exercise interruption, replacement, pause and teardown; consequential scorch/hit cues follow permitted outcomes, while staged examples are labeled. **Exit:** a useful correctly occluded effect with measured combined cost, or a documented decision to retain the simpler drawing path.

#### V3D01.9 — Standalone perspective texel-splatting investigation

**Owner:** rendering research. **Depends on:** V3D01.2 existing-scene comparison geometry/path; runs beside the ordinary-renderer work without a separate playable world. **Procedure:** E07.

- [ ] Run the public technique separately with permitted static assets and matched camera paths. Inspect capture boundaries, disocclusion, thin geometry, zoom, lighting, sample memory and complete capture/shade/draw cost on named hardware.
- [ ] Report integrate, revise or defer, including WebGPU/device requirements and open animated-geometry limitations. **Exit:** a decision with concrete evidence; application integration/backend changes require a scoped design update and cannot be inferred from a static pass. Rejection does not block first-scene acceptance.

#### V3D01.10 — Authored/generated asset coherence

**Owner:** art production with the existing generation/rights owners. **Depends on:** V3D01.2 and a preferred V3D01.3–V3D01.5 treatment. **Procedure:** E08.

- [ ] Place one rights-cleared generated rigid prop beside the reviewed authored character with the same material/render treatment. Existing approved generated output may be used; new external work follows actual account authorization and task cap. No general job/publication service is required for this offline proof.
- [ ] Record source/runtime files, scale/material/semantic fit, rejected candidates, correction effort, actual cost/latency and reusable preparation steps. **Exit:** a useful pair or an honest production gap; this does not qualify arbitrary animated generation or V3D07/V3D08's durable service.

#### V3D01.11 — Integrated scene, varied subjects and device evidence

**Owner:** client presentation and performance/accessibility. **Depends on:** selected V3D01.3–V3D01.8 outcomes and V3D01.10 for the production pair; V3D01.9 is not a blocker.

- [ ] Reuse several distinct moving people/props from the starting scene, adding a demonstration subject only where coverage is missing, and inspect the accepted effects together. Verify the scene inventory and representative pre-existing playtest routes remain intact. Run applicable existing Q scenarios for selection/reveal, load failure/staleness, resize, pause, replacement and teardown; preserve supported camera and non-canvas/reduced-motion access.
- [ ] Record physical device/backend, viewport, workload, frame-time tails, CPU/GPU attribution where available, draws, cold/warm memory/loading and correction effort. **Exit:** a measured first-scene envelope and explicit missing-device/scale evidence. Link into V3D11; it retains full lower-end, population and accelerated-simulation qualification.

#### V3D01.12 — Creator review and adopted style profile

**Owner:** creator art review and maintainers. **Depends on:** V3D01.11; independent research decisions such as V3D01.9 can be deferred with reasons.

- [ ] Review ordinary gameplay motion plus close inspection against the creative brief. Record preferred character/environment treatment, technique decisions, family alternatives, source-art/sample policy, workflow effort and scope of approval; preserve original and rejected comparisons.
- [ ] Adopt only verified settings/behavior through existing presentation/asset owners, then reconcile the current specifications, art decisions and relevant parent trackers. **Exit:** an approved or explicitly revised scene direction with reproducible preparation and honest qualification limits. The general pipeline and V3D12 release decision remain open.

**V3D01 exit:** a demonstrated moving first scene and scoped family recommendations, or an honest decision to retain sprites where the comparison fails. A still image, successful shader build, completed experiment or paper result alone is insufficient.

## V3D02 — Immutable appearance and artifact foundation

**Owners:** protocol, server appearance/storage, client asset intake. **Depends on:** V3D01 for the target profile; technical fixture work can precede final style approval.

- [ ] Introduce the smallest AppearanceDefinition/RepresentationManifest/VisualBinding contract and family compatibility data needed by one real consumer, extending the current `EntityView.appearance` seam. Keep provider and PlayCanvas types out of shared/domain data.
- [ ] Implement exact scoped lookup, immutable metadata/bytes, digests, reference rights, dependency closure and publication revisions through current repositories and artifact-store adapters. Enforce A3D01–A3D05/A3D09/A3D10 before enabling imported content.
- [ ] Admit one trusted GLB and sprite, reject malformed/oversized/uncontrolled external dependencies, and persist exact references through the current-format save owner. No legacy save reader or paid regeneration on restore.

**Exit:** an approved reusable representation can be retrieved after restart by an authorized client; invalid/private/missing artifacts produce bounded explicit results without changing mechanics.

## V3D03 — Safe client replacement and lifetime

**Owners:** WorldRenderer/scene/presentation. **Depends on:** V3D02.

- [ ] Extract only the shared representation responsibility needed for sprite and mesh resources. Retain the existing camera, input, support-motion, captions, status, reveal and lighting owners.
- [ ] Implement bounded load/decode/residency, stale-world/entity/revision/authority fences, prepared current-state handoff, one effective caster/picker, shared-resource ownership and teardown.
- [ ] Exercise Q01–Q06, Q10–Q13, Q17, Q19 and Q23 where applicable: moving/support transitions, equipment, deleted corpse, missing pose, context loss, restore, private remembered appearance and concurrent publication.

**Exit:** an actual object changes representation without changing its identity, position/support, inventory, action outcome or observed knowledge. Repeated replacement/load/destroy shows no unexplained retained-resource growth.

## V3D04 — Rigid parts, materials and construction visuals

**Owners:** approved visual families and client composition; mechanical owners unchanged. **Depends on:** V3D02/V3D03.

- [ ] Deliver one useful rigid tool/container/furniture family with reusable parts/material regions, canonical pivot/grip and geometry-fit checks. Ground/equipped/contained views refer to the same real item where supported.
- [ ] Prove repeated components and material variation without full-object regeneration. Keep cosmetic parts distinct from persistent objects. Preserve semantic selection while batching only measured compatible geometry.
- [ ] Depict a modular shelter's supported or explicitly fixture-authored construction stages, openings and damage; coordinate actual mechanics with INV/SW rather than claiming a decorative model implements them.

**Exit:** real rigid-object reuse and a truthful modular construction representation, including incompatible fit and changed-part cases. No generated visual changes collision, capacity, navigation or weather protection.

## V3D05 — Rigged character and equipment family

V3D01.6 owns the early single-character timing/secondary-motion experiment. Reuse its accepted evidence here; it does not depend on this general family implementation or close the equipment/body coverage below.

The [animation research](../../art-direction/research/3d-pixel-worlds/animation-tools-and-techniques.md) supplies pose/hold timing, export, secondary-motion and smear guidance for this existing work. Installed support for held keys is not end-to-end qualification; no new animation runtime or cadence policy was delivered.

**Owners:** client pose/attachment and authored rig family, with body/PO projection consumers. **Depends on:** V3D02/V3D03; V3D01 supplies the early art prototype.

- [ ] Qualify one humanoid rig and deliberately varied bodies/outfits. Define rest/bind pose, semantic joints, scale/fit ranges, in-place animation, supported action/state cues and identity consistency with portraits/sprites.
- [ ] Add rigid attachments, garment fit/layer masks, hair/helmet policy, primary and secondary grips, bounded IK and declared fallbacks. Preserve actual equipment slots/custody; matching names alone do not establish rig compatibility.
- [ ] Exercise walking/turning/equip/drop and relevant supported use/rest/death states at normal gameplay size. Native action receipts remain authoritative; no root-motion or animation-event writes to the world.

**Exit:** a person can change compatible equipment and state without generating a complete new body, losing gear, or requiring new mechanics. Unknown fits and missing poses are visible, not silently accepted.

## V3D06 — Nonhuman and state-composition proof

**Owners:** visual family authors, status/action projections. **Depends on:** V3D02/V3D03 and only the V3D05 mechanisms actually reused.

- [ ] Deliver a genuinely nonhuman articulated-machine or animal family with its own semantic pose/contact coverage, not a renamed human rig. Preserve sense/movement authority; use touch-only fixture policy to detect hidden human/sight assumptions.
- [ ] Compose relevant supported condition/lifecycle/equipment/effect layers with family-owned conflict rules. No generation for every injury update, death or frame; no image-derived blood loss, fire, limb function or illumination.
- [ ] Verify repeated variation, critical-state fallback, delayed-state assets, concealed parts and bounded pose/effect work under A3D06.

**Exit:** a second coherent family reuses the architecture without adopting human anatomy or wilderness needs. Unsupported morphology/solver requirements remain explicit.

## V3D07 — Durable 2D art during play

**Owners:** existing invention/execution services, art coordinator, storage and publication. **Depends on:** V3D02/V3D03 and relevant INV-3.4 presentation input. Does not wait for arbitrary rig generation.

- [ ] Implement bounded coalesced ArtDemand, explicit plan/stage/attempt records, scoped reuse, reserves, before-dispatch journaling, returned-task persistence, status reconciliation, cancellation and no automatic paid retry. Enforce A3D07–A3D10.
- [ ] Supply authorized shared appearance briefs/reference images and validate a useful sprite with fallback/state coverage. Publish through the same immutable appearance owner; no mechanical rollback on art failure.
- [ ] Prove fixture failure/restart/private-reference cases before any live trial. Separately authorize a capped provider proof, recording actual useful-asset cost, latency and correction effort.

**Exit:** an admitted supported invention receives durable art during continued play; duplicates and reload do not buy another attempt. Missing permissions, capacity, result or budget remain explicit.

## V3D08 — Generated model promotion

**Owners:** art adapter, trusted conversion/validation, client publication. **Depends on:** V3D02/V3D03/V3D04 and the V3D07 job mechanism; 2D output is optional.

- [ ] Add one bounded model-production adapter and source quarantine, normalization/optimization, actual decoded-complexity checks, reference/identity fit, runtime profile validation and controlled preview.
- [ ] Demonstrate shared-brief sprite → rigid-model progression, successful sprite with failed model, wrong-identity rejection, removed initiating entity, subsequent authorized reuse, and retained bytes after provider expiry.
- [ ] Add generated humanoid rig/animation stages only after V3D05 coverage and provider evidence. Do not route arbitrary animals, structures, fitted clothing or machinery through unqualified automatic rigging.

**Exit:** a generated rigid representation is useful and safe in the real application. Rigged-model readiness remains a separate demonstrated capability, not a consequence of obtaining a GLB.

## V3D09 — Creator workshop and invention integration

**Owners:** existing INV workshop/UI and appearance service. **Depends on:** relevant delivered asset stages and INV authority.

- [ ] Expose natural-language appearance reuse/edit requests, current model/sprite preview, mechanical-envelope distinction, state/fit/provenance findings, exact review revision and spending plan through existing scoped services.
- [ ] Preserve ordinary automatic supported-invention policy versus explicit confirmed conjuring and consequential mechanical revision. Invoke missing art after the appropriate existing authorization, without a second invention debit or unconditional extra confirmation.
- [ ] Add optional bounded harness coordination only when needed; yield while waiting for art/review. Handle revoked grants, canceled conversations, stale candidates, partial success and private technical status.

**Exit:** a creator can request a distinctive supported object or appearance refinement without manually authoring JSON, while art, mechanics and instance creation remain separately truthful. No new broad workshop service is required.

## V3D10 — Retained reuse and portable appearance dependencies

**Owners:** art storage with INV-8/EWF/save/rights owners. **Depends on:** relevant prior stages; pack export additionally depends on existing portability support.

- [ ] Expand pin accounting across active worlds, retained current-format saves, candidates and permitted packs. Demonstrate safe collection, quota backpressure and recovery without generation. Basic pinning/save integrity already belongs to V3D02/V3D07, not this later milestone.
- [ ] Export/import the exact allowed appearance/style/family dependency closure and provenance/rights. Exclude private conversations, memories, unpublished dependencies and live execution/billing tokens.
- [ ] Validate destination compatibility and separate visual content from runnable mechanics; record partial/unsupported packs truthfully.

**Exit:** reusable art survives ordinary lifecycle and moves only with permitted dependencies. A marketplace or general public asset service is not a prerequisite.

## V3D11 — Performance, devices and accessibility

**Owners:** client/presentation/performance, with server pipeline attribution. **Depends on:** each delivered slice; runs continuously, not only at the end.

- [ ] Measure actual physical-GPU cold/warm behavior, asset diversity, skinning, material/alpha/shadow cost, decode/upload stalls, simultaneous swap residency and cleanup. Use A3D targets as proposals, not results. Include a named physical lower-end integrated GPU and the M1 Pro reference at actual 1920×1080, Detailed/Economy, matched sprite and moving mercenary populations, eight shadowed fires and requested 3× native progress. Record achieved game-time ratio/debt, displayed-frame and CPU/GPU p50/p95/p99/max, command-to-display tails, peak/retained memory and visual fallback correctness. Lower-end hardware is not currently available; SwiftShader does not close this gate. The earlier eight-fire sprite result does not establish the model workload. Coordinate long sessions/storage contention with PF00/PF11 and cold/reveal correctness with SW18.16.
- [ ] Prove quality degradation preserves identity/state/gear, captions, input, reveal permissions and non-canvas alternatives. Test reduced motion, narrow screens, resize/DPR and unsupported/context-lost graphics.
- [ ] Profile the full application at ordinary and supported accelerated speeds, including the 8× goal. Distinguish renderer work from native spatial/sensory/cognition/persistence limits. Optimize the measured source instead of assuming mesh count or pixel count explains everything.

**Exit:** a documented device/workload envelope and graceful fallback with no claimed universal population or FPS. Deferred performance/privacy regressions remain with their parent owners.

## V3D12 — Release decision and canonical documentation

**Owners:** maintainer and creator art review. **Depends on:** the capabilities actually proposed for release, not every aspirational family.

- [ ] Review the moving camp against the creative brief and compare production effort with the retained sprite approach. Select which families adopt 3D, remain hybrid, or remain 2D.
- [ ] Attach actual Q-scenario, live-provider and device evidence to the completed tasks. Keep untested states/families/devices explicit and unchecked; distinguish native fixture success from real generation quality.
- [ ] Update current behavior only after delivery in world presentation, architecture, procedural/runtime art and relevant SW/INV/PO owners. Record accepted decisions in their existing decision/changelog owners; this proposal alone does not establish them.

**Exit:** a coherent scoped release and trustworthy documentation, not a claim that every invention can now produce an arbitrary fully functional 3D world object.

## Proposal coverage and deferred choices

The feature spec owns product scenarios and non-goals; the technical design owns data/lifecycle/rendering; the family document owns variations, bodies, garments, objects, construction and state; the pipeline owns 2D-first/direct-model generation and publication; validation owns concrete comparison and failure evidence; A3D owns numerical proposals. This split avoids parallel definitions of the same contract.

D24 retains art-production direction, D09/R01 retain device/performance selection, and R02 retains repeatable asset-production research. Open choices are the final pixel profile/scale, family-specific silhouette tolerances and animation cadence, selected provider/model/rights and useful-asset economics, and automatic-review thresholds. The recommended defaults are already in the proposal; these remaining choices need evidence, not an implementation blocker that demands a general framework first.

## Verification status for this documentation change

The first-scene direction, design and tasks were revised from the current local documents and delivered MER10 evidence. This update changes zero executable logic lines and runs no rendering/animation/provider experiments. Task boxes stay unchecked. The 18 affected documents passed pinned formatting, local file/heading-link review and task-owned diff/whitespace review; twelve unique child tasks and eight experiment procedures were checked. These checks verify the design update only.

### Original proposal inspection

The baseline was read through the GitHub connector, including root/routed guidance, current presentation/spatial contracts, art-direction brief, runtime/procedural art, invention tracker, public entity view, renderer boundary and pinned PlayCanvas package. Public engine/glTF/provider documentation informs the proposed adapter boundaries with stated limitations. No application run, browser art comparison, paid execution, or runtime performance qualification was performed for this design-only task. Content/link/diff review of the completed documentation package is the applicable verification, not a runtime pass.
