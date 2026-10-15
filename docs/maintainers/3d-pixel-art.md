# Progressive 3D pixel art — implementation tracker

**Status: the bundled mercenary pilot is implemented; the broader pipeline tasks below remain open.** Created September 27, 2026 from `main@412b5b480b4911d9977de73168c6072e2c023b83`. The documentation task does not authorize these code changes or paid provider work.

## Maintained records

[Feature specification](../projects/3d-pixel-art-feature-spec.md) · [Technical design](../projects/3d-pixel-art-tech-design.md) · [Appearance families](../projects/3d-pixel-art-appearance-families.md) · [Art pipeline](../projects/3d-pixel-art-asset-pipeline.md) · [Qualification matrix](../projects/3d-pixel-art-validation.md) · [A3D limits](../limits/3d-pixel-art.md)

The product goal is real dimensionality with detailed pixel-art output and progressive, reusable art during invention. The delivery unit is a playable, observable slice, not a shader demo or a provider endpoint alone.

## Ownership and parent tracking

This is a focused child tracker for the proposed 3D appearance pipeline. [SW13](spatial-world.md#sw13--invention-and-generated-art-integration) owns generated-art/spatial integration, SW18 owns presentation semantics and visual qualification, and SW19/PF retain full-stack scaling. [INV-3.4 and INV-4.6/4.9](inventions-and-world-evolution.md) own invention presentation and confirmed conjuring/coordination. INV-5 owns mechanical revision/activation and INV-8 owns invention portability. [INV-12](inventions-and-world-evolution.md#inv-12--progressive-in-game-art-and-compatible-publication) owns staged art delivery under [the runtime art contract](../invention-art-pipeline.md); V3D07–V3D10 supply its proposed 3D-pipeline implementation, not another publication or spending authority. [PO](persistent-objects.md) remains the owner of real items, equipment placement, containers and custody. EWF owns new trusted family capability integration.

Use these task IDs for appearance-specific deliverables and link evidence back to the relevant parent. Do not duplicate whole parent task bodies or mark an entire SW/INV/PO task complete because one renderer case passes. Same-version save integrity, privacy, funding, and lifecycle are required in every affected slice rather than deferred to a final hardening phase.

## Dependency order

Start with V3D01's visual comparison. V3D02/V3D03 establish manifests and safe replacement; V3D04 adds useful rigid families. V3D05/V3D06 establish qualified actors, equipment and state composition. V3D07 adds durable image generation; V3D08 adds validated model production. V3D09 joins the existing workshop/invention flow. V3D10 expands portable reuse. V3D11 runs with each slice; V3D12 decides the release scope from evidence.

The character art experiment in V3D01 must happen early even though rigid objects are the first simpler production path. A direct authored/procedural model does not depend on 2D generation. V3D08 depends on V3D07 only for the 2D-first production route and shared job infrastructure it actually uses; do not make every model pass through an image provider.

## V3D01 — Visual comparison and style decision

[Art-direction progress](art-direction.md) owns the study index. The [mercenary art record](art/mercenary.md) tracks editable source locations, visual feedback, milestones and pending art approval; this tracker retains technical delivery and qualification.

**Owners:** client presentation and art direction. **Depends on:** existing WorldRenderer/SW18, no provider integration.

The owner supplied the mercenary study and authorized its [default-scene integration](../projects/completed/mercenary-scene-pilot.md), including fixed character pixels and depth compositing. The default NPC, live idle/walk/cloth, fixed character image and actual-depth composite are implemented. [Evidence](../verification/mercenary-default.md) covers the concrete asset; this does not accept the broader style comparison or production pipeline. [SW18.14](spatial-world.md#sw18--world-presentation-delivery) tracks that handoff; full-HD sprite/shadow qualification proceeds independently. The broader pipeline below remains proposed.

- [ ] Follow up the bundled mercenary with a reduced-geometry/texture asset and a matched moving multi-character benchmark before extending it to crowds. Current single-model cost is measurable; the sprite-only eight-fire performance evidence does not qualify clothed models. Add supported action/condition/equipment poses and exact skinned silhouette picking through V3D05; qualify sloped-foot IK and cloth self-contact separately. Production rights/style acceptance remains required before shipping the study asset.

- [ ] Build the same small camp in sprite/proxy, mixed, and styled-model presets using properly licensed/native fixture assets. Preserve the same mechanics, identity, camera, light setup and comparable artistic effort. No broad environment conversion.
- [ ] Prototype one recognizable 3D human with tool/backpack plus key scenery. Evaluate normal pixel scale, lighting, orbit/pitch/zoom, smooth versus stepped pose, filtering/dither/outline alternatives and contact/shadows in actual application footage.
- [ ] Record creator art decision, authoring/correction effort, actual device/backend and initial frame/resource measurements. Preserve or revise the proposal explicitly under D24/D09/R01/R02; do not silently discard the accepted 2D-rig option.

**Exit:** a demonstrated visual direction and scoped family recommendations, or an honest decision to retain sprites where the comparison fails. A still image or compilation is insufficient.

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
- [ ] Preserve ordinary automatic supported-recipe admission separately from the current creator session’s exact human review before its first live write. Broader automatic creator-session approval remains [INV-18.2](../world-agent-runtime.md#7-interaction-and-approval), not permission supplied by an art tool. Confirmed conjuring and consequential mechanical revisions retain their own approval requirements. Invoke optional missing art only within authorized funding, without a second invention debit or unconditional extra confirmation for ordinary recipes.
- [ ] Add optional bounded harness coordination only when needed; yield while waiting for art/review. Handle revoked grants, canceled conversations, stale candidates, partial success and private technical status.

**Exit:** a creator can request a distinctive supported object or appearance refinement without manually authoring JSON, while art, mechanics and instance creation remain separately truthful. Continue play with an adequate native representation while optional polish waits; a new family lacking an adequate permitted fallback remains unusable until its required representation is ready. No new broad workshop service is required.

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

The baseline was read through the GitHub connector, including root/routed guidance, current presentation/spatial contracts, art-direction brief, runtime/procedural art, invention tracker, public entity view, renderer boundary and pinned PlayCanvas package. Public engine/glTF/provider documentation informs the proposed adapter boundaries with stated limitations. No application run, browser art comparison, paid execution, or runtime performance qualification was performed for this design-only task. Content/link/diff review of the completed documentation package is the applicable verification, not a runtime pass.
