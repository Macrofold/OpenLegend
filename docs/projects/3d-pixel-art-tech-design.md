# Progressive 3D pixel art — technical design

| Status      | Current progress                                                                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Not started | General asset publication and family contracts remain proposed; the existing mercenary resource owners provide a delivered pilot to reuse. | 2026-10-07   |

**Status: proposed, documentation only.** Companion to the [feature specification](3d-pixel-art-feature-spec.md). Original design baseline: `412b5b480b4911d9977de73168c6072e2c023b83`, September 27, 2026; the source overview below was checked against the pinned review branch at `51de089651177fd5d45dc2a188d11cc737555f0b` on October 7. The open appearance-key wire field was also confirmed on `main@63cd42fc2555dd97b1cd9ec5c03dcf84e6d2ef36`; that does not imply main has been integrated into the review branch. No runtime implementation, dependency upgrade, provider dispatch, or performance result is implied.

## Maintained records

- Work, dependencies, and acceptance: [V3D tracker](../maintainers/3d-pixel-art.md).
- New asset-work bounds: [A3D inventory](../limits/3d-pixel-art.md). Shared [interface](../limits/interface.md), [AI execution](../limits/ai-execution.md), [spatial](../limits/spatial.md), [objects](../limits/objects.md), and [persistence](../limits/persistence.md) inventories remain controlling.
- Detailed mechanisms: [generation pipeline](3d-pixel-art-asset-pipeline.md), [appearance families](3d-pixel-art-appearance-families.md), [qualification](3d-pixel-art-validation.md).
- Existing boundaries: [engine/world](../engine-and-world-boundaries.md), [spatial renderer contract](../../archive/07-technical-architecture/spatial-world-runtime.md#10-playcanvas-isolation-and-hybrid-assets), [world presentation](../world-presentation.md), [runtime art/publication](../invention-art-pipeline.md), and [AI providers](../ai-providers.md).

## 1. Inspected application and smallest useful change

The client pins PlayCanvas `2.22.2` in [its package](../../apps/client/package.json). [WorldRenderer](../../apps/client/src/world-renderer.ts) already separates plain views, intentions, and camera commands from PlayCanvas objects. [WildernessScene](../../apps/client/src/scene.ts) owns entity scene nodes, sprite images/materials, appearance-cache references, shadow/reveal bindings, geometry, selection, and teardown. Its `RenderedEntity` retains sprite resources alongside an optional `MercenaryActor`. [EntityView](../../packages/protocol/src/index.ts) carries a string `appearance` key, heading, XYZ/support, and a small action/status projection. The [server projection](../../apps/server/src/view.ts) supplies the entity's appearance key or its `sprite` fallback; trusted client artwork handles supported keys, including the current crate, wolf, bear and mercenary presentations. This is not a closed three-value wire enum. An unfamiliar string grants no model download, new renderer implementation or physical capability. These are useful extension seams, not an existing general asset-manifest implementation. The [completed mercenary pilot](completed/mercenary-scene-pilot.md) already supplies `MercenaryModels`/`MercenaryActor` and `PixelCharacter` resource owners for one trusted bundled asset, including fallback, actual-depth compositing and shared shadow preparation. Reuse those owners and their scoped evidence; generalized manifests, imported families and arbitrary equipment are still proposed.

Preserve `WorldRenderer` rather than implementing every illustrative method in the older spatial design. Extract a small representation resource behind the existing scene when both sprite and model implementations need it. Let a plain adapter derive the renderer's inputs from `GameView`; introduce a separate network view only for a concrete projection need. Do not create a second scene graph, public asset registry, or world state store.

Documentation changes affect zero runtime logic lines. Future work spans protocol, domain presentation references, server projection/storage/jobs, client representation/presentation, and authored assets. It is cross-layer and high-risk around privacy, lifecycle, and spending; estimates for each implementation slice must be refreshed from its then-current callers rather than pretending a shader-only change covers the project.

## 2. Semantic owners

| Owner                                               | Responsibility                                                                                                                                      | Must not own                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Domain and existing object/body/action owners       | Identity, physical state, dimensions/profile references, equipment placement, supported visual facts, saved cosmetic seed/reference when persistent | Provider jobs, files, wall time, GPU state, artistic validation scores              |
| Spatial owner                                       | Authoritative geometry, support, collision, reach/query consumers and navigation invalidation                                                       | Deriving mechanics from an imported render mesh                                     |
| Server appearance service                           | Authorized appearance lookup, compatibility resolution, scoped projections, immutable publication and binding revision                              | Direct mutations of body, inventory, action outcome, or fictional knowledge         |
| Existing invention/workshop service                 | Mechanical admission, creator/actor scope, exact reviewed candidate and actual creation                                                             | Treating generated art as an admitted mechanic                                      |
| Server art job coordinator                          | Durable demand, stage admission, reservations, provider receipts, quarantine, validation and publication coordination                               | Authorizing itself, new gameplay effects, replacing shared compute                  |
| Execution adapter / optional Macrofold coordination | Bounded authorized computation and artifact/result receipts                                                                                         | World authority, unrestricted storage access, policy, durable world asset ownership |
| Client representation resources                     | PlayCanvas nodes, pose, materials, approved asset handles, picking/reveal/shadow bindings, cleanup                                                  | Grants, real motion, damage, object ownership, or generation admission              |
| Bundled-world content                               | Style profile, material palette, supported rig/part families, specific visual state mappings                                                        | Universal human anatomy or an unavoidable wilderness aesthetic                      |

These are logical responsibilities, not a mandate for new packages or services. Reuse the existing mutation, repository, projection, and execution boundaries. A narrow in-process appearance service and one artifact-store adapter are sufficient first implementations.

## 3. Proposed data contracts

The following names describe proposed semantics, not existing exported interfaces or a frozen wire schema. Use closed host representation kinds and registered family identities, not arbitrary executable strings.

### AppearanceDefinition

An immutable reusable appearance description contains an ID/revision and schema version; the applicable mechanical definition/body-profile references; a family reference; identity features and material regions; dimensional constraints and canonical anchor; assembly/component requirements; required visual states and interactions; optional compatible rig and attachment-role requirements; cosmetic seed policy; style revision; source lineage; and scoped rights metadata.

Separate public visible features from authoring-only references and private provenance. A provider prompt, creator conversation, or full original concept sheet is not public appearance data. A public description of an observed person need not identify an unknown name, hidden tattoo, concealed item, or private invention.

Use one authored source for persistent cosmetic identity. A stable seed belongs to the persistent identity or instance customization, not the browser's random initialization. Presentation randomness uses its own deterministic derivation and never advances simulation RNG.

### RepresentationManifest

Each immutable manifest identifies a representation kind (`sprite`, `directional-sprite`, `rig-2d`, `procedural-mesh`, `rigid-model`, or `skinned-model`), exact AppearanceDefinition/style/family versions, artifact digests and authorized dependencies, canonical units/axes/pivot transforms, bounds, material class, supported state/animation/attachment coverage, view validity, approved lighter alternatives, validation-profile version, and provenance/rights references.

A model reference does not carry authoritatively accepted collision, light, camera, script, body, or inventory metadata. Keep technical decoded-complexity reports available to the importer/creator rather than broadcasting them with every entity snapshot. Compatible LODs are immutable children with preserved critical anchors and state coverage. A fallback is a reference to an approved compatible family/representation, not an executable URL.

### VisualBinding

An entity's projected binding names its current approved appearance revision and authorized representation choices, seed/customization, visible state, and attachments that this audience is entitled to see. Carry stable entity identity, relevant representation revision, and the existing world/load/control generation needed for fencing. Do not use every world tick as an asset invalidation key.

Keep binding revision distinct from body, mechanical definition, action, and asset revisions. A color edit invalidates the relevant appearance/material result; it must not rebuild navigation. Conversely, an admitted mechanical shape change can invalidate appearance fit and requires a fresh compatibility decision.

### ActionVisualState

Extend the existing narrow action/status projection only as real consumers need it: stable activity identity, supported semantic pose/action cue, authorized progress or recent-past timing, current heading/support, and permitted contact/attachment targets. Missing detail remains unknown or a generic pose. Do not send private future routes, intended attacks, hidden equipment, or another actor's complete action plan merely to improve animation.

Animation is a depiction of native state. Clip completion and animation notifies cannot commit damage, remove materials, spawn items, decide death, or declare arrival.

### Art records

Durable requests, stages, artifact metadata, candidate validation reports, publication records, and billing receipts belong to the [pipeline design](3d-pixel-art-asset-pipeline.md). Mechanical installation and appearance publication remain distinct transactions under their respective owners, connected by exact references rather than distributed rollback of valid gameplay when art fails.

## 4. Dependency and invalidation graph

Model the actual dependencies, not a full-world digest:

`mechanical definition/profile + appearance identity + family + style + selected components -> compatible manifest -> client resource`

Equipment placement and visible state select or update current layers/pose. They normally do not invalidate the base body mesh. Material color changes invalidate a material variant or derived texture, not the rig. A rig revision invalidates its dependent skin/animation/attachment contracts. A global style revision creates new candidates explicitly; it does not silently enqueue regeneration for every instance. A changed publication permission affects delivery immediately even when artifact bytes are identical.

Cache lookups include exact source revisions, processing-profile version, representation kind, relevant customization, and security scope. Do not include position, elapsed wall time, or frame number in static asset identity. Pose-dependent baked caches include a finite declared pose key, not every continuous joint angle.

Reuse metadata and assets across compatible instances, while retaining independent per-instance transforms, animation state, and actual object references. Avoid allocating an entire new material for every random color if a measured, supported shared-material/instance-parameter path suffices. Do not mutate a shared material to customize one person.

## 5. Renderer integration and resource lifecycle

Introduce a small client-only representation resource that can update permitted visual state and pose, report renderable/pickable bounds and named visual anchors, attach compatible child resources, expose draw/shadow/reveal participants, and dispose. Sprite and model implementations share semantic inputs but keep their actual GPU ownership explicit. A capabilities report describes real supported states and anchors; it does not grant gameplay capabilities.

Sprite and mercenary representations already coexist. Separate only the shared resource responsibility needed by the next qualified family; do not repeat the second-representation integration or create competing camera, light or asset-lifetime owners. The scene retains one semantic root and selection identity. Representation implementations own their child nodes and resources. Keep current camera/input, support interpolation, captions, status indicators, and world-presentation owners rather than copying them into a model renderer.

### Loading and publication to a scene

Resolve only server-authorized immutable references. Fetch and decode through bounded client queues, then prepare resources off the active render tree where possible. Keep the current compatible fallback visible. Only sanitized, accepted runtime artifacts enter the browser importer; source files never load directly from arbitrary provider/user URLs.

At installation, recheck scene disposal, world/load/control generation, entity lifetime, current authorization, desired appearance/family/style revision, and applicability to the entity's current state and attachments. Reevaluate current state instead of demanding that every harmless animation tick equal an old request snapshot. If the result is no longer applicable, retain it only in an authorized shared cache or dispose it; never attach it speculatively.

Perform the active handoff at one render boundary. Preserve semantic root, displayed support anchor, heading, selection, caption anchor, and current animation phase where compatible. Register the new drawing/picking/reveal/shadow participants and retire the old participants without an interval containing two effective objects or two equally strong shadows. If transfer is incompatible, initialize from the current authorized pose; do not replay spawn, attack, harvest, death, sound, or particle events.

Do not require alpha crossfading two complete models. It can introduce double shadows, blended-depth errors, and ghost equipment. Prefer a prepared atomic swap at a quiet pose or outside current view when safe. An explicit maximum pending-handoff policy prevents indefinite delay; incompatibility retains the previous representation and reports why. Reduced-motion uses a direct switch. Deferring a cosmetic upgrade must never defer a privacy removal or a new required state.

Dispose listeners, pending subscribers, scene nodes, mesh instances, textures/material references, animation resources, and temporary decode buffers through explicit ownership. Aborting a fetch does not guarantee its callback will never execute; the generation fence still applies. Shared resources are reference-counted or otherwise have one explicit lifetime owner. Destroying the last instance must not accidentally destroy a library-owned primitive, and a cached resource must not survive an unauthorized principal change as a usable reference.

## 6. Coordinate, physics, and picking contract

Normalize imported geometry once into the documented source profile: metres, right-handed coordinates, Y-up, and a declared subject-forward axis. Use explicit import transforms and the existing domain-heading/PlayCanvas conversion; do not guess a universal forward sign from a provider preview. Character foot/support anchor and object pivot are independent of the geometric centroid. Negative/mirrored transforms, nonuniform scale, skin bind poses, and handedness must be validated or normalized before publication.

Physical dimensions come from the mechanical owner. Artistic exaggerations may be permitted for decorative hair, leaves, cloth, or small highlights, but a family-owned fit check protects important support/contact anchors, openings, reach cues, and navigable volumes. Decorative classification cannot be supplied by an untrusted model as a way to bypass that check. No universal percentage tolerance can prove every object safe; quantify tolerances by critical feature in the selected family profile.

Use the rendered representation for visual target identification, respecting depth, alpha cutout, authorized reveal, viewport coordinates, and current LOD. Return semantic target/part identity and, where supported, a position/support intention. The server revalidates the action against mechanical geometry. Do not treat a mesh ray hit as proof of reach, permission, or a physical body part. Do not introduce invisible rectangular sprite/model hit regions inconsistent with current reveal rules.

Keep CSS pixels, device pixel ratio, render-buffer pixels, low-resolution scene pixels, camera projection, and UI scale conversions explicit. Color, depth, outline/reveal, and picking passes must use mutually consistent transforms. A postprocessed edge does not automatically enlarge interaction range.

## 7. Animation, attachments, and time

Begin with a reviewed compatible rig and in-place clips. Root motion must not become a second position writer. Remove or compensate imported root translation in presentation, while native XYZ/support remains authoritative. Foot placement and hand IK are bounded visual adjustments using permitted contacts; unreachable targets use a declared pose/fallback rather than stretching a limb or completing an action.

Rig compatibility includes hierarchy/semantic roles, rest pose, bind transforms, joint limits, scale range, and skinning assumptions. Matching bone names alone is insufficient. Visual joints do not imply functional anatomy. Clothing fit and equipment compatibility are detailed in the [family design](3d-pixel-art-appearance-families.md).

Use committed activity progress and supported recent-past samples for animation. Under accelerated simulation, intermediate cycles may be visually abbreviated, but the renderer must show the current consequential state and must not replay all skipped cosmetic frames. Pausing freezes game-action progress; any ambient visual motion has a separate declared reduced-motion/pause policy. Loading or replacing art does not reset an action's time or consume simulation RNG.

Continuous simulation, render-frame interpolation, and optionally stepped pose sampling are separate clocks. Sample a stepped pose without quantizing authoritative position or UI. Contacts, equipment, shadows, and visible pose use the same evaluated transform state so an axe cannot cast the previous frame's swing shadow.

## 8. Pixel rendering profile

A versioned world presentation profile records approved material families, source texel-density guidance, normal gameplay scale, scene sampling/upscale policy, tone mapping, shading options, outline/dither choices, and family animation presentation policy. Keep device quality preferences separate from the world's identity/style revision.

Start from the current [full-resolution world/HUD and character-specific sampling](../world-presentation.md#animated-character-pixels), with simple geometry, deliberately painted textures, controlled material response and existing dynamic lights/shadows. The mercenary already uses a specialized character color/depth pass after the world camera’s shadows; do not add another camera that duplicates that work. Alternative scene sampling profiles remain explicit art experiments, not permission to silently reduce the ordinary canvas resolution. Compare them against the current sprite/pilot baseline before adopting further passes. Use nearest-neighbor enlargement when appropriate, but also test texture minification/mip choices for fine foliage and surfaces; globally disabling filtering can create severe shimmer. Integer scaling can need letterboxing or a changed internal resolution on arbitrary viewport sizes; define that mapping rather than silently stretching uneven pixels.

Screen-space quantization creates edge changes during motion. Quantizing every object's root independently can create sliding contacts and jitter. Compare world-stable texture detail, carefully scoped projection/vertex snapping, silhouette simplification, and controlled animation sampling. Do not quantize the world simulation to solve a raster artifact. Dither patterns need stable coordinate choices, and temporal antialiasing is not enabled by assumption. Use the existing owner for bloom/color grading and keep UI out of the low-resolution target.

Shadows use actual receiver geometry, an approved model or simpler shadow-only proxy, and the existing light budget. Foliage cards may remain alpha-cutout; soft effects have separate blending rules. Hidden roofs can stop color drawing while retaining appropriate shadows. No global baked occlusion or permanent lightmap may make a constructed/destroyed object appear physically permanent.

## 9. Persistence, publication, and privacy

Keep immutable artifact bytes and manifests in the durable art store, with database metadata, rights, dependency pins, and publication/binding revisions. A saved current world references exact approved versions and cosmetic identity, not expiring provider URLs or `latest`. Portable exports retain the permitted dependency closure. Derived GPU state is never saved.

Follow the [current-format save owner](../save-and-load.md) and [development save policy](../../AGENTS.md#development-save-policy): no old-save migration or legacy reader is part of this project. Same-version restore validates required references and can use a compatible approved visual fallback when bytes are temporarily unavailable; it may not silently replace mechanical state. Local derived resources can be rebuilt without paid generation. Real external reservations and uncertain jobs remain in the operational ledger and are not rewound with fictional time.

Publication is atomic with respect to a candidate digest and expected appearance binding revision. Retain a previous approved version for explicit visual rollback, expressed as a new publication decision rather than undoing world history. Mechanical rollback remains the existing declaration owner's concern.

Authorization applies to manifests, artifacts, dependency URLs, thumbnails, status queries, and reuse lookup, not merely entity drawing. A known hash is not a grant. Do not send concealed equipment, hidden interiors, secret variations, or unpublished future appearance changes in a giant asset bundle and rely on a shader to hide them. Split deliverable shells/components where disclosure differs. An observed exterior does not entitle a client or image provider to the entire object's private data.

Remembered entities use the appearance and state actually permitted at the time of observation; a newly published model must not reveal an unobserved transformation. Remove live picking, lights, motion, and event cues from remembered representations. Revocation removes current display/resource access immediately; already delivered information cannot be made unseen, which is why minimizing initial disclosure matters.

## 10. Performance and bounded work

Measure simulation, server projection, artifact lookup, network, decode, GPU upload, client pose evaluation, render submission, shadows, transparency, and postprocessing independently. A lower pixel resolution reduces neither all draw calls nor all skinning/CPU work. Repeated meshes with distinct materials/rig poses have different costs from static instancing; benchmark both.

Pre-filter and index scoped asset queries before hydration. Coalesce exact work before queuing it. Bound job admission, active work, pending metadata, decoded bytes, simultaneous old/new swap residency, and uploads independently. See [A3D](../limits/3d-pixel-art.md). Optional work yields; required faithful state remains visible through fallbacks. Do not solve overload by hiding an authorized nearby actor or delaying revocation.

Use screen size and importance for LOD and animation work, with hysteresis and preserved critical silhouettes/attachments. Cull optional presentation work outside authorized visible regions without evaluating hidden live state. Static compatible meshes may be instanced; unique materials and skinned crowds require their own evidence before an optimization commitment. Dynamic assemblies should invalidate affected parts or chunks, not the entire world. No GPU optimization may build navigation or invoke a model on camera motion.

## 11. Source and compatibility evidence

The [PlayCanvas ContainerResource documentation](https://api.playcanvas.com/engine/classes/ContainerResource.html) describes GLB container loading and render-entity instantiation. The public page observed on September 27 reports `2.22.4`, while this repo pins `2.22.2`; it establishes the integration approach, not proof of every API or shader behavior in the pinned version. Verify the installed source/types during implementation and preserve the pin unless an actual blocker justifies an approved change.

The [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) defines the interchange structure for scenes, meshes, materials, skins, animations, buffers, and extensions. OpenLegend deliberately accepts a narrower sanitized profile. Format conformance is not visual quality, trustworthy mechanics, safe resource consumption, or rights clearance.

Provider observations and their limitations are in the [pipeline design](3d-pixel-art-asset-pipeline.md#10-provider-selection-and-evidence). No vendor's demo establishes OpenLegend's repeatable art quality, arbitrary-rig support, cost, or latency.

## 12. Delivery and verification

[V3D01–V3D12](../maintainers/3d-pixel-art.md) identify concrete owners and small end-to-end slices. First prove a licensed rigid asset and a same-identity swap through the real client before introducing paid generation. Prove a human equipment case and a genuinely different nonhuman assembly before broadening the family abstraction. Defer standalone services, generalized authoring languages, sophisticated crowd skinning, and arbitrary procedural topology until a measured consumer requires them.

Verification uses the [scenario matrix](3d-pixel-art-validation.md), focused existing checks, actual browser interaction, disposable PostgreSQL worlds for stateful work, and separately authorized live provider trials. Documentation-only work requires content/link/diff review, not game execution. General pipeline, family, provider and device acceptance remains open. The separate mercenary pilot has scoped native/browser/performance evidence; reuse it only where the same contract, asset and workload assumptions hold, without promoting it to general pipeline acceptance.
