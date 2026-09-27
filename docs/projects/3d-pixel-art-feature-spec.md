# Progressive 3D pixel art — feature specification

**Status: proposed design, not implemented or approved for runtime delivery.** Requested by Mike on September 27, 2026. Source baseline: `Macrofold/OpenLegend` `main` at `412b5b480b4911d9977de73168c6072e2c023b83`. This task changes documentation only: zero runtime logic lines, no dependency changes, no paid generation, and no claimed graphics or provider qualification.

## Maintained records

- Implementation and unsatisfied release gates: [V3D delivery](../maintainers/3d-pixel-art.md).
- Limits and constraints: [asset pipeline inventory](../limits/3d-pixel-art.md); existing [presentation limits](../limits/interface.md), [AI execution limits](../limits/ai-execution.md), and [object limits](../limits/objects.md) retain their ownership.
- Mechanism: [technical design](3d-pixel-art-tech-design.md).
- Focused details: [appearance families and composition](3d-pixel-art-appearance-families.md), [generation and publication](3d-pixel-art-asset-pipeline.md), and [visual/operational qualification](3d-pixel-art-validation.md).
- Existing authorities: [world presentation](../world-presentation.md), [spatial world](../spatial-world.md), and [runtime art](../../archive/03-design-proposals/visual-direction.md#art-generated-during-play).

## 1. Recommendation

Develop a genuinely dimensional world whose **final image reads as deliberately crafted, detailed pixel art**. Prefer real geometry for objects whose rotation, physical silhouette, attachments, construction, or animation benefit from it. Keep sprites, painted surfaces, 2D rigs, and effects where they are clearer, cheaper, or more expressive. Do not require every asset to become 3D.

The central feature is not a pixelation filter or an image-to-mesh endpoint. It is a **progressive appearance system**: a mechanically valid object remains usable while interchangeable, validated representations improve how it looks. A new invention might use a familiar proxy immediately, obtain a distinctive sprite during play, and later acquire a model. Another might assemble an excellent procedural model immediately and need neither generation stage. A portrait may remain 2D permanently.

Prioritize a small in-application comparison before broad conversion. Characters and equipment merit an early experiment because they expose the hardest artistic and compositional problems. Rigid props provide the simpler first production path. Do not postpone the character experiment until an expensive environment conversion is complete.

## 2. What remains controlling

OpenLegend already uses a 3D spatial scene, simple meshes, camera-facing artwork, continuous orbit/pitch, support-aware motion, dynamic projected shadows, and lit sprites. Arbitrary generated-model loading, generalized rigs, and safe complete representation replacement are not delivered capabilities merely because the renderer is 3D. See the [current presentation specification](../world-presentation.md) and [SW18](../maintainers/spatial-world.md#sw18--world-presentation-delivery).

The [accepted procedural-art direction](../../archive/03-design-proposals/procedural-art-and-animation.md) includes reusable 2D rigs and composition. This proposal retains those options; it recommends evaluating real 3D for suitable families rather than silently declaring the earlier direction obsolete. Existing lighting, camera, knowledge, invention, accounting, and save policies continue to control. A later acceptance decision must reconcile the persistent owners; this proposal does not rewrite current behavior.

The [creative brief](../../art-direction/final-board/creative-brief.md) supplies the aesthetic target: dimensional wilderness, recognizable and expressive people, readable equipment, meaningful fine detail, organic forms, purposeful lighting, and warmth. Detailed portraits and promotional illustrations are references, not proof of gameplay-scale quality. Neither voxel blocks, exaggerated toy proportions, permanent gloom, heavy blur, nor a fixed low resolution follows from choosing 3D.

## 3. Product outcomes

A player should recognize an individual from body shape, hair, clothing, possessions, posture, and consistent distinctive features. Turning the camera should reveal coherent volume rather than exposing a flat card edge. A tool should remain in the appropriate hand, and a backpack should follow its wearer without changing ownership or inventory. Construction should visibly reflect admitted components and progress. Firelight and shadows should ground people and objects in the same place.

An inventor should not wait for optional artwork before using an admitted mechanic. Existing materials, parts, poses, and effects should cover routine variation without a model call. Novel appearances should become reusable assets rather than permanent per-instance generation expenses. Users should see truthful readiness and failure states, and retain control over consequential appearance changes and spending.

An author of another coherent world should be able to reuse the mechanism without adopting human anatomy, wilderness materials, blood, or a particular pixel palette. The bundled world chooses its style and supported families; the engine supplies bounded, versioned composition, publication, and presentation.

## 4. Player and creator scenarios

| Scenario | Trigger and available knowledge | Interaction and visible outcome | Meaningful failure |
| --- | --- | --- | --- |
| Woodland work | An observed person has an equipped axe and a real carried object | Walk, turn, use the axe, carry the object, and rest. Attachments, feet, posture, and shadows follow committed activity | An unavailable animation uses an honest generic pose; it cannot imply a successful chop or completed construction |
| Invent during play | A permitted Invent request produces an admitted supported tool | The tool is craftable independently of art readiness. A familiar silhouette appears immediately; distinctive 2D and later 3D art may publish | Unsupported mechanics remain unsupported. Art failure leaves the admitted tool usable and the fallback visible |
| Outfit variation | Existing equipment ownership and wear state change | Clothing layers, fitted armor, hair clearance, and carried gear compose on a compatible body without regenerating the entire person | Incompatible fit is explained or uses a declared visual substitute. A visual socket does not grant an extra equipment slot |
| Progressive shelter | Native construction admits components and stage changes | Posts, walls, roof, openings, material variation, and damage reflect actual supported states | A beautiful generated hut cannot introduce a walkable interior, weather protection, or a doorway absent from mechanics |
| Death and harvesting | An observer is permitted to see a committed animal death and later removal | Supported death pose and state effects appear immediately. Later artwork depicts the current state only | A delayed corpse model cannot resurrect a harvested animal; a stain does not invent ongoing blood loss |
| Novel anatomy | A creator proposes a nonstandard creature | The workflow separates supported body mechanics, appearance, rig compatibility, and animation coverage | A six-legged mesh is not proof of six functional limbs or locomotion support. The creature may remain on an honest fallback |
| Different reality | An admitted touch-only articulated machine has a gripper and charge state | The same appearance mechanism depicts its supported joints, held object, and state indicators without a human rig or blood assumptions | Unknown capabilities remain explicit; visual resemblance to a flying machine does not grant flight |
| Reconnect or slow device | A client returns while art is pending or cannot afford the preferred representation | The same object and approved identity remain visible using a compatible lighter representation | Reload does not resubmit paid work. A missing asset or budget shortage never deletes the object |

Some scenario mechanics are future capabilities owned by INV, SW, ACT, and PO. The visual prototype may use explicitly labeled fixtures for them; a fixture animation is not evidence that ordinary gameplay can perform that action.

## 5. Representation and readiness

Keep three independent questions visible in the implementation and creator tooling:

1. **Does the definition exist, and has an instance actually been created?** Those are separate mechanical outcomes.
2. **Which representations are approved and compatible?** For example, a procedural fallback, sprite, rigid mesh, or animated rig.
3. **Which representation is this client displaying?** Choice depends on current state, camera validity, asset availability, and device quality.

Generation progress is not a global object level. A rigid mesh can be complete while its animated representation remains unsupported. A sprite can be the preferred final artwork, not an error. Level of detail is a display choice among approved representations, not an authoring stage or permission to generate.

The appearance ladder is therefore a set of options: known library art; bounded procedural composition; approved single/directional sprites or 2D rigs; approved rigid or articulated models; and reusable state effects. Only compatible options participate. Publication never demotes an animated character to a motionless model merely because the latter is 3D.

## 6. Visual requirements

### Pixel-art identity

The output must preserve intentional silhouettes, material-specific detail, organized color, quiet regions, and readable people. Author geometry, textures, lighting response, and camera scale together. Upscaling existing pixels does not create detail; increasing mesh detail does not guarantee useful pixels at normal zoom.

Treat source texture density, scene sampling resolution, on-screen character size, display pixel ratio, and close-up rendering as separate controls. A detailed portrait need not use the world buffer or the same asset resolution. The experiment must establish a useful normal gameplay scale before committing a production library.

### Motion and camera

Retain continuous bodily heading and current camera freedom. A model supplies views from arbitrary angles, but convincing silhouettes, thin features, and animation at those angles still need qualification. Single-view sprites retain the current explicit billboard fallback. Camera rotation, zoom, and a missing view never initiate paid generation.

Evaluate smooth animation against deliberately stepped poses. Stepping may suit some characters or effects, but it must not slow simulation, jerk camera motion, desynchronize contacts, or reduce UI responsiveness. Do not impose one animation cadence across all visual families.

### Light, depth, and shadows

Use the existing PlayCanvas presentation owner. Meshes can cast their own shadows or a simpler approved visual proxy; do not retain both equally strong casters. Sprites remain lit and supported. Receiver geometry must keep shadows continuous across terrain, ramps, and decks. Roof cutaway is a camera convenience, not a hole in physical shelter, light blocking, or hearing.

Detailed pixel shading need not be physically photorealistic. Evaluate controlled shading bands, material-aware highlights, color grading, restrained outlines, selective dithering, and ambient effects individually. None is a mandatory all-at-once recipe. Avoid lighting baked into albedo that fights the moving sun; avoid turning metal into white noise or every surface into plastic.

### Readability and access

Captions, names, menus, selection, and controls remain sharp and independent of world pixel resolution. Preserve existing reveal and observer-permission rules. An occluded but authorized target may receive the existing read-through; an unknown actor may not. Reduced motion, reduced flashing, readable low-light presets, and non-canvas interaction paths remain usable. Cosmetic quality settings do not change knowledge or mechanical advantage.

## 7. Variation without a combinatorial asset library

Represent identity, assembly, and transient state separately. A person changing a jacket should not require a new head, body, walk cycle, and corpse mesh. Reuse base geometry, compatible rigs, materials, masks, attachments, and state mappings. Generate a genuinely missing component, not every cross-product of existing components.

The [appearance-family design](3d-pixel-art-appearance-families.md) specifies rigid parts, fitted clothing, bodies, construction, vegetation, effects, damage, and cross-family compatibility. It distinguishes cosmetic parts from persistent objects and bounded visual assembly from actual structural mechanics.

Not every combination is valid. A rigid sword needs a grip transform; a garment may need body fit and skin weights; a two-handed tool needs a supported pose; a wall opening must match admitted geometry. Compatibility uses declared semantic roles and dimensions, not a model name or arbitrary matching socket string. Exact constraints remain family-owned.

Do not promise universal automatic rigging, arbitrary cloth simulation, or correct procedural animation from any sentence. Unknown anatomy or interaction coverage remains an explicit capability gap with a usable fallback where mechanics permit it.

## 8. Invention and on-the-fly art

### Fast path

Resolve the mechanical request through existing invention authority. Separately derive a bounded appearance need. Search authorized exact assets, then compatible library/family compositions, before planning generation. Known-state changes, ordinary material colors, injuries already supported by the visual family, and equipment swaps use native logic.

A mechanically valid object can appear immediately with a faithful coarse representation. Faithful means it does not advertise a usable opening, extra contents, a functional limb, or an active effect that does not exist. For an unfamiliar object, a restrained generic shape plus truthful identification is preferable to a confident but mechanically misleading image.

### Optional 2D-first route

For a genuinely novel appearance, create a shared appearance brief before commissioning art. It records recognizable features, proportions, material regions, intended dimensions, orientation, attachment requirements, and current supported states. A useful sprite can publish independently while a model candidate is produced later from that same brief and permitted references.

Do not make the tiny final sprite the sole geometric source of truth. A stylized image omits hidden surfaces and can contain perspective or silhouette exaggerations. The pipeline may retain higher-resolution construction/reference views separately from the runtime sprite, or request additional authorized views within the approved plan. Missing information remains an explicit assumption, not mechanical authority.

A direct procedural or model route can skip 2D generation. A failed 3D stage must not invalidate a successful sprite. Newly generated parts can be added to the permitted library for future composition. The [pipeline design](3d-pixel-art-asset-pipeline.md) owns job states, identity checks, validation, publication, funding, and failures.

### Spending and approval

Existing policies distinguish ordinary supported invention, creator law editing, and confirmed conjuring. Preserve them rather than adding a second approval workflow. A confirmed allowance can cover explicitly planned 2D and 3D stages; it does not authorize a retry loop, provider switching after failure, or unbounded revision.

Show mechanical readiness, artwork readiness, and any blocked funding separately. Generating art for an existing mechanic does not consume another invention unit. Camera movement, reload, opening an inspector, and client LOD selection are not spending triggers. Uncertain provider completion retains its financial reservation until reconciled.

## 9. Application surfaces

The ordinary player sees an intelligible object, current equipment/state, and restrained optional progress in its detail panel. Technical processing notifications should not flood the world event log or masquerade as events NPCs perceived. An art upgrade alone does not teach an NPC a new fact.

The creator/workshop surface supports inspect, reuse, draft an appearance change, preview, validate, and publish or reject within existing permissions. It shows a turntable, gameplay-scale preview, relevant states, attachment fit, physical-envelope comparison, provenance, allowed reuse, validation findings, exact candidate revision, and expected spending before paid work. A natural-language request is the primary interface; inspectable structured data remains available without requiring users to author JSON.

Consequential identity or silhouette changes require deliberate review rather than a silent improvement. A purely cosmetic publication cannot edit mechanical dimensions. A request to enlarge a real doorway is routed to the existing mechanical change workflow and its impact review; painting a larger doorway is not an alternative.

## 10. Staged capability plan

| Stage | Playable result | Explicit gate |
| --- | --- | --- |
| S0 — Compare before committing | Existing sprites and styled 3D depict the same woodland camp, character, tool, backpack, tree, rock, shelter, and fire | Review actual gameplay scale, daylight/firelight, animation, orbit/pitch/zoom, and authoring effort; no bulk conversion |
| S1 — Safe representation foundation | A trusted rigid asset replaces a fallback in the application without changing an object | Scoped immutable manifest, bounded import, correct picking/shadows, stale-load rejection, resource cleanup, same-version restore |
| S2 — Reusable bodies and objects | One useful rigid family plus a compatible human rig/equipment family and a contrasting nonhuman family | Real appearance variation, contact/attachment/state coverage, identity consistency, and crowd measurements |
| S3 — Durable art during play | A supported invention uses an immediate fallback and receives a retained approved sprite | Existing admission, explicit funding, duplicate prevention, recovery, failure visibility, privacy, and no automatic paid retry |
| S4 — Progressive model publication | A generated rigid model can replace the sprite; compatible rigs follow only after their own qualification | Identity and mechanics-fit review, independent stage failure, safe mid-action swap, scoped reusable artifacts |
| S5 — Broaden with evidence | Additional assemblies, creatures, state effects, pack portability, and scalable quality presets | Family-specific coverage and whole-application performance; no claim of universal generated anatomy or mechanics |

Delivery details, dependencies, and unchecked completion criteria belong to [V3D delivery](../maintainers/3d-pixel-art.md). These stages are an implementation proposal, not permission to begin coding under this documentation request.

## 11. Non-goals

This project does not replace PlayCanvas, React, the simulation, the action executor, or the spatial provider. It does not require voxels, photorealism, ray tracing, universal dynamic global illumination, a new ECS, an asset marketplace, per-entity persistent compute, or generated executable shaders/code. Real-time cloth, ragdoll physics, arbitrary destructible interiors, full structural collapse, and automatic new locomotion are separate supported-mechanic projects.

It does not preserve incompatible development saves or add old-format migration. Follow the [root save policy](../../AGENTS.md#development-save-policy). Same-version integrity, live supported-definition changes, real account obligations, and current privacy protections remain required.

It does not ship reference artwork merely because that artwork appears in the art-direction library. Rights and provenance must be established for production assets and provider inputs.

## 12. Acceptance and unresolved choices

The [qualification document](3d-pixel-art-validation.md) owns concrete scenario evidence requirements. Product acceptance requires a compelling moving scene, reliable identity and interaction depiction, no authority or privacy regressions, progressive publication that survives failures and reload, bounded operational work, and measured creation/correction effort. No acceptance box is satisfied by this document.

Recommended defaults are hybrid representations, rigid-object generation before arbitrary animated-model generation, shared appearance briefs, reuse before generation, a retained immediate fallback, and client-side representation choice among approved options. Decisions still requiring evidence are the final pixel rendering profile, ordinary camera scale, acceptable silhouette deviation, animation cadence by family, target devices and performance budgets, provider choice and real cost/latency, and automatic versus human review for each asset class. They are experiments or release gates, not reasons to invent arbitrary universal restrictions.
