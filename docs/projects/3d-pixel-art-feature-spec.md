# Progressive 3D pixel art — feature specification

| Status      | Current progress                                                                                     | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Deer stride and wolf forepaws are refined; bear access and broader visual qualification remain open. | 2026-10-17   |

Deer/stag travel uses the correct four-foot sequence, fixed-length leg articulation, distinct front/rear bends and continuous foot velocity through contact. Wolf travel preserves source timing and wrist rotation with fixed foreleg lengths and a neutral toe shape. Source anatomy, sizes, finishes and runtime ownership remain unchanged. The [gait study](../../art-direction/studies/2026-10-17-grounded-animal-gaits/comparison.html) preserves exported/editable sources and moving comparisons; [evidence and limits](../verification/natural-source-replacements.md#deer-stride-and-wolf-forepaws--october-17-2026) remain distinct from creator acceptance and broader action/device qualification.

The bundled scene uses source-based models and a shared pixel treatment, with 30 samples per metre for larger subjects and 60 for small details. The original mercenary retains his anatomy and identity at 2.035 m beside 1.85 m adults; closer camera framing does not resize physical bodies. New devices use Economy shadows. Rendered pixel sampling is not permanent cubic geometry, and changing the camera can change projected coverage.

Substantial art and meaningful study iterations belong in the [external library, game delivery and study archive](game-asset-storage-feature-spec.md), with exact revisions and permanent hosted links. Existing repository assets remain pending [verified migration](../maintainers/game-asset-storage.md); new substantial art stays outside Git. Visual acceptance and preservation requirements remain with their existing owners.

The source-based catalogs contain 71 families with three alternatives each, 68 normalized source controls and 50 editable Blender sources, alongside retained earlier studies. They cover all seven named people, the animal, plant, equipment and scenery families; the scene replay provides seven existing-world locations under three lights. Natural-proportion sources come chiefly from Poly Haven with credited animal, archery and pack sources. Deer/stag and wolf exports retain their corrected binding and travel; shrubs use distinct rooted specimens, and arrows use smaller fletching. The source-guided fir has three finishes, softer leaf lighting and fixed green variation; ground lighting is continuous with restrained painted detail. Original, rejected and alternative art remains selectable or preserved for comparison. [Source and license records](../../art-direction/assets/source-study/natural-replacements.md) identify the assets and preparation; [earlier collection evidence](../verification/source-based-starting-study.md) retains its original inventory and verification scope.

The bundled world's [visual requirements](../../art-direction/decisions.md#current-visual-requirements--october-16-2026) call for believable real-world proportions, beautiful dimensional pixel art, readable detail, and both warmth/joy and darkness/hardship. Visibly low-poly, faceted, blocky, cutesy and big-head/small-body art is rejected. Garbage Country environments, The Last Night/REPLACED finish and t3ssel8r's character work inform the [research collection](../../art-direction/research/3d-pixel-worlds/README.md). Painted materials and articulated sprites remain available alternatives. These are bundled-world art choices, not universal engine laws.

[Current presentation](../world-presentation.md#existing-starting-scene-art-candidate) owns the rendered behavior. [Source-study evidence](../verification/source-based-starting-study.md), [natural-source checks](../verification/natural-source-replacements.md) and [small-subject/atmosphere comparisons](../verification/small-subject-art-and-atmosphere.md) retain exact tested revisions, counts, costs, earlier alternatives and failure limits. The original [mercenary pilot](completed/mercenary-scene-pilot.md), preserved [sculpture](completed/mercenary-voxel-iteration.md), [original-model refinement](completed/mercenary-original-refinement.md), [size study](completed/mercenary-size-and-density.md) and [visible-size correction](completed/mercenary-visible-size-and-pixels.md) retain their own evidence and accepted scope. These scoped results do not establish universal motion stability, arbitrary generated assets, broader device/crowd performance, production rights or final creator acceptance. Bear-source access, the general appearance/generation pipeline and the remaining [V3D gates](../maintainers/3d-pixel-art.md) remain open. New starting-world appearance bindings do not migrate active saved progress or change native body dimensions, cover, placement, gathering or fire laws.

## Maintained records

**Creator review and comprehensive strategy — updated 2026-10-16 00:49 EDT.** Mike rejected the procedural study's people, foliage and ordinary-3D props; low-resolution paint wrapped on a smooth surface is insufficient. The earlier delivery above is historical implementation evidence, not accepted artwork. The [revised plan](3d-pixel-art-first-scene-plan.md#proposed-replacement-study--october-16-2026) critiques the preceding outline and maps the full existing starting-world art families to staged studies. It centers his concept-derived Meshy mercenary, establishes scale and ordinary-play framing early, compares asset art separately from rendering and lighting, then expands a finished camp proof into the current people, animals, vegetation, belongings, structures and river. [Recorded feedback](../../art-direction/decisions.md#corrected-study-requirements--october-16-2026) remains controlling. That planning pass created no replacement art or camera/pixel change; the authorized implementation reconciliation above records the subsequent delivered choices.

- Implementation and unsatisfied release gates: [V3D delivery](../maintainers/3d-pixel-art.md).
- Limits and constraints: [asset pipeline inventory](../limits/3d-pixel-art.md); existing [presentation limits](../limits/interface.md), [AI execution limits](../limits/ai-execution.md), and [object limits](../limits/objects.md) retain their ownership.
- Mechanism: [technical design](3d-pixel-art-tech-design.md).
- Authorized first-scene work and asset study: [starting-scene art plan](3d-pixel-art-first-scene-plan.md), with implementation and experiment tasks under V3D01.
- Focused details: [appearance families and composition](3d-pixel-art-appearance-families.md), [generation and publication](3d-pixel-art-asset-pipeline.md), and [visual/operational qualification](3d-pixel-art-validation.md).
- Existing authorities: [world presentation](../world-presentation.md), [spatial world](../spatial-world.md), and [runtime art/publication](../invention-art-pipeline.md).
- Development production: [shared workflows](../production-workflows/README.md) and [object/character routes](../production-workflows/assets-and-animation.md); these supply reusable offline methods while this project retains its proposed product scope.

## 1. Recommendation

Develop a genuinely dimensional world whose **final image reads as deliberately crafted, detailed pixel art**. Prefer real geometry for objects whose rotation, physical silhouette, attachments, construction, or animation benefit from it. Keep sprites, painted surfaces, 2D rigs, and effects where they are clearer, cheaper, or more expressive. Do not require every asset to become 3D.

The central feature is not a pixelation filter or an image-to-mesh endpoint. It is a **progressive appearance system**: a mechanically valid object remains usable while interchangeable, validated representations improve how it looks. A new invention might use a familiar proxy immediately, obtain a distinctive sprite during play, and later acquire a model. Another might assemble an excellent procedural model immediately and need neither generation stage. A portrait may remain 2D permanently.

The agreed next delivery restyles the existing starting scene used for ongoing gameplay and playtesting. Preserve its characters, objects, layout, encounters, resources and supported activities; no separate map, opening or initializer is part of this art change. Begin with the restored original-model mercenary or a suitable cleared substitute, establish face/scale/garment readability, then develop the shared pixel/light treatment on that same scene. Use existing shelter/occlusion, fire, vegetation, rocks, ground and people for depth and lighting comparisons. Inventory that content before adding anything. Add a demonstration object or decorative patch only where a specific test lacks a suitable existing subject; a generated prop may replace an appropriate visual candidate while preserving its gameplay meaning. Review varied existing subjects before claiming the treatment is reproducible. The [first-scene plan](3d-pixel-art-first-scene-plan.md) owns sequencing; [V3D01.1–V3D01.12](../maintainers/3d-pixel-art.md#first-scene-delivery-and-experiment-tasks) own work and decisions.

The bundled world's artistic direction is agreed: Garbage Country's clear organic environmental forms, t3ssel8r's shaped expressive characters, and The Last Night/REPLACED's purposeful light and fine detail. The completed image must read as designed pixel art across silhouettes, surfaces, shading and highlights. Fixed coarse paint on otherwise ordinary smooth 3D is a rejected result. Authored identity/material groups and designed realtime shading remain the leading combination, comparing suitable treatment by family. Targeted face artwork and continuous cloth are appropriate. Quiet areas, readable daytime scenes and recognizable people at normal play distance matter as much as cinematic close views. The palette and motifs belong to the selected world's art direction, not universal engine rules.

The comprehensive study must account for the actual starting-world visual families and named people, with multiple meaningful options for materially redesigned subjects and a coherent scene recommendation. Separate source quality, asset-art alternatives, rendering comparisons and lighting studies so each decision is interpretable. Use the earlier mercenary's actual renderer as a control, screen licensed source geometry, and preserve all previous models. Establish overview, ordinary play and inspection framing without changing body dimensions to compensate for unreadable artwork. Working choices may proceed autonomously; final creator acceptance remains explicit. The plan owns the subject matrix and sequence; [qualification](3d-pixel-art-validation.md#replacement-study-review-order) owns the evidence needed to advance.

Normal camera scale, sampling/filtering, light thresholds, outline treatment, animation cadence and device settings remain experiments. Judge the resulting scene in motion before adopting them. Preserve sprites, articulated parts and painted materials as useful alternatives. This sequence establishes the art before bulk asset production or general live-generation infrastructure; it does not require every alternative renderer or representation to be built to production quality.

## 2. What remains controlling

The later [mercenary pilot](completed/mercenary-scene-pilot.md) is delivered: a separate default NPC uses idle/walk animation, cloth and fixed-resolution character color/depth rendering. Its [scoped evidence](../verification/mercenary-default.md) and [A3D15 limits](../limits/3d-pixel-art.md#a3d15--bundled-mercenary-pilot) supersede the original sprite-only baseline, not the broader proposed family, publication or generation work. Reuse the delivered camera, lighting and character-resource owners; do not implement the pilot again.

OpenLegend already uses a 3D spatial scene, simple meshes, camera-facing artwork, continuous orbit/pitch, support-aware motion, dynamic projected shadows, and lit sprites. Arbitrary generated-model loading, generalized rigs, and safe complete representation replacement are not delivered capabilities merely because the renderer is 3D. See the [current presentation specification](../world-presentation.md) and [SW18](../maintainers/spatial-world.md#sw18--world-presentation-delivery).

The [accepted procedural-art direction](../../archive/03-design-proposals/procedural-art-and-animation.md) includes reusable 2D rigs and composition. This proposal retains those options; it recommends evaluating real 3D for suitable families rather than silently declaring the earlier direction obsolete. Existing lighting, camera, knowledge, invention, accounting, and save policies continue to control. A later acceptance decision must reconcile the persistent owners; this proposal does not rewrite current behavior.

The [creative brief](../../art-direction/final-board/creative-brief.md) supplies the aesthetic target: dimensional wilderness, recognizable and expressive people, readable equipment, meaningful fine detail, organic forms, purposeful lighting, and warmth. Detailed portraits and promotional illustrations are references, not proof of gameplay-scale quality. Visibly low-poly, blocky/Lego-like, cutesy and exaggerated big-head/small-body designs are explicitly rejected. Efficient meshes must preserve convincing anatomy and silhouettes. Permanent gloom, heavy blur and a fixed low resolution are not implied by choosing 3D.

## 3. Product outcomes

A player should recognize an individual from body shape, hair, clothing, possessions, posture, and consistent distinctive features. Turning the camera should reveal coherent volume rather than exposing a flat card edge. A tool should remain in the appropriate hand, and a backpack should follow its wearer without changing ownership or inventory. Construction should visibly reflect admitted components and progress. Firelight and shadows should ground people and objects in the same place.

An inventor should not wait for optional artwork before using an admitted mechanic. Existing materials, parts, poses, and effects should cover routine variation without a model call. Novel appearances should become reusable assets rather than permanent per-instance generation expenses. Users should see truthful readiness and failure states, and retain control over consequential appearance changes and spending.

An author of another coherent world should be able to reuse the mechanism without adopting human anatomy, wilderness materials, blood, or a particular pixel palette. The bundled world chooses its style and supported families; the engine supplies bounded, versioned composition, publication, and presentation.

### Creative identity and the production loop

Where a player or creator is authorized to choose an appearance, preserve the features they intentionally select across concept art, world form, equipment, icons and later refinements. A recognizable silhouette, meaningful material, distinctive possession or characteristic posture can make an object or person worth noticing and remembering. More detail and more generated variants are useful only when they strengthen that identity, the intended action or the place's atmosphere. Choosing reuse must not force an unfamiliar supported invention into an inaccurate stock depiction; generation must not silently replace a liked design.

Use the [offline production workflow](../production-workflows/README.md) to explore and deliver the needed representation. A full articulated route can be idea → art → 3D source → rig/motion → working entity, while exact reuse, direct modeling, procedural composition and final 2D art skip unnecessary stages. Develop the supported native interaction with a rough representation alongside visual exploration so scale, use and meaningful choices can be judged early. Choose a coherent example before expanding a family, rather than requiring finished art before any play or producing a large library before discovering whether its source works.

The [asset and animation route](../production-workflows/assets-and-animation.md) defines source handoffs and repair paths; [scenes and interfaces](../production-workflows/scenes-and-interfaces.md) connects the result to light, environment and item presentation. Evaluate the resulting person or object in the actual game: recognizable identity, expressive motion, readable contact and a useful supported interaction. Preserve the accepted source and demonstrate a meaningful revision when repeatability is the purpose. These methods deepen the proposed delivery approach without accepting new art direction, arbitrary rigs or equipment capabilities, and without treating the mercenary pilot as general production qualification.

## 4. Player and creator scenarios

| Scenario                 | Trigger and available knowledge                                                     | Interaction and visible outcome                                                                                                                                                            | Meaningful failure                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Woodland work            | An observed person has an equipped axe and a real carried object                    | Walk, turn, use the axe, carry the object, and rest. Attachments, feet, posture, and shadows follow committed activity                                                                     | An unavailable animation uses an honest generic pose; it cannot imply a successful chop or completed construction           |
| Invent during play       | A permitted Invent request produces an admitted supported tool                      | With an adequate native fallback, the tool is craftable without waiting for optional generated art. A familiar silhouette appears immediately; distinctive 2D and later 3D art may publish | Unsupported mechanics remain unsupported. Art failure leaves the admitted tool usable and the fallback visible              |
| Outfit variation         | Existing equipment ownership and wear state change                                  | Clothing layers, fitted armor, hair clearance, and carried gear compose on a compatible body without regenerating the entire person                                                        | Incompatible fit is explained or uses a declared visual substitute. A visual socket does not grant an extra equipment slot  |
| Progressive shelter      | Native construction admits components and stage changes                             | Posts, walls, roof, openings, material variation, and damage reflect actual supported states                                                                                               | A beautiful generated hut cannot introduce a walkable interior, weather protection, or a doorway absent from mechanics      |
| Death and harvesting     | An observer is permitted to see a committed animal death and later removal          | Supported death pose and state effects appear immediately. Later artwork depicts the current state only                                                                                    | A delayed corpse model cannot resurrect a harvested animal; a stain does not invent ongoing blood loss                      |
| Novel anatomy            | A creator proposes a nonstandard creature                                           | The workflow separates supported body mechanics, appearance, rig compatibility, and animation coverage                                                                                     | A six-legged mesh is not proof of six functional limbs or locomotion support. The creature may remain on an honest fallback |
| Different reality        | An admitted touch-only articulated machine has a gripper and charge state           | The same appearance mechanism depicts its supported joints, held object, and state indicators without a human rig or blood assumptions                                                     | Unknown capabilities remain explicit; visual resemblance to a flying machine does not grant flight                          |
| Reconnect or slow device | A client returns while art is pending or cannot afford the preferred representation | The same object and approved identity remain visible using a compatible lighter representation                                                                                             | Reload does not resubmit paid work. A missing asset or budget shortage never deletes the object                             |

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

### Environment and character detail

Group tree crowns, rock faces and terrain into clear masses; vary detail where it describes material or use rather than covering every surface with equal noise. Let firelight and shadows connect characters to nearby receivers. Use atmosphere to describe distance while preserving ordinary daylight and interaction readability. Water, bokeh, strong blur and complex reflections are selective additions whose visual benefit must earn their cost.

A character needs complete shaped anatomy, deliberate eye/brow/hair features, fitted clothing and poses readable from the supported views. Use controlled material regions, geometry or targeted surface artwork as appropriate; no requirement to pre-paint every lit pixel follows. Inspect the garment interior and moving hem as well as the front view. A shader cannot certify clothing coverage or invent a missing facial design.

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

A mechanically valid object can appear immediately with a faithful coarse representation. Faithful means it does not advertise a usable opening, extra contents, a functional limb, or an active effect that does not exist. For an unfamiliar object, a restrained generic shape plus truthful identification is preferable to a confident but mechanically misleading image only when it satisfies the family’s [minimum presentation contract](../invention-art-pipeline.md#21-adequacy-versus-polish). Missing required representation keeps that new capability unready; optional polish never blocks an already adequate representation or unrelated play.

### Optional 2D-first route

For a genuinely novel appearance, create a shared appearance brief before commissioning art. It records recognizable features, proportions, material regions, intended dimensions, orientation, attachment requirements, and current supported states. A useful sprite can publish independently while a model candidate is produced later from that same brief and permitted references.

Do not make the tiny final sprite the sole geometric source of truth. A stylized image omits hidden surfaces and can contain perspective or silhouette exaggerations. The pipeline may retain higher-resolution construction/reference views separately from the runtime sprite, or request additional authorized views within the approved plan. Missing information remains an explicit assumption, not mechanical authority.

A direct procedural or model route can skip 2D generation. A failed 3D stage must not invalidate a successful sprite. Newly generated parts can be added to the permitted library for future composition. The [pipeline design](3d-pixel-art-asset-pipeline.md) owns job states, identity checks, validation, publication, funding, and failures.

### Spending and approval

Existing policies distinguish ordinary supported-recipe admission, creator-session changes, and confirmed conjuring. Ordinary recipes have their automatic path; the current creator session requires exact human review before its first live write, with broader automatic session approval still [INV-18.2 work](../world-agent-runtime.md#7-interaction-and-approval). Art generation or review cannot grant that approval. Preserve those owners rather than adding a second approval workflow. A confirmed allowance can cover explicitly planned 2D and 3D stages; it does not authorize a retry loop, provider switching after failure, or unbounded revision.

Show mechanical readiness, artwork readiness, and any blocked funding separately. Generating art for an existing mechanic does not consume another invention unit. Camera movement, reload, opening an inspector, and client LOD selection are not spending triggers. Uncertain provider completion retains its financial reservation until reconciled.

## 9. Application surfaces

The ordinary player sees an intelligible object, current equipment/state, and restrained optional progress in its detail panel. Technical processing notifications should not flood the world event log or masquerade as events NPCs perceived. An art upgrade alone does not teach an NPC a new fact.

The creator/workshop surface supports inspect, reuse, draft an appearance change, preview, validate, and publish or reject within existing permissions. It shows a turntable, gameplay-scale preview, relevant states, attachment fit, physical-envelope comparison, provenance, allowed reuse, validation findings, exact candidate revision, and expected spending before paid work. A natural-language request is the primary interface; inspectable structured data remains available without requiring users to author JSON.

Consequential identity or silhouette changes require deliberate review rather than a silent improvement. A purely cosmetic publication cannot edit mechanical dimensions. A request to enlarge a real doorway is routed to the existing mechanical change workflow and its impact review; painting a larger doorway is not an alternative.

## 10. Staged capability plan

| Stage                               | Playable result                                                                                                                                                      | Explicit gate                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0 — Starting-scene art revision    | The existing starting scene gains the agreed art treatment, controlled visual comparisons and an authored/generated asset pair while retaining its playtest content. | Follow the first-scene plan: baseline → pixel/light treatment → motion/vegetation/effects → measured application review → creator acceptance; no bulk conversion. |
| S1 — Safe representation foundation | A trusted rigid asset replaces a fallback in the application without changing an object                                                                              | Scoped immutable manifest, bounded import, correct picking/shadows, stale-load rejection, resource cleanup, same-version restore                                  |
| S2 — Reusable bodies and objects    | One useful rigid family plus a compatible human rig/equipment family and a contrasting nonhuman family                                                               | Real appearance variation, contact/attachment/state coverage, identity consistency, and crowd measurements                                                        |
| S3 — Durable art during play        | A supported invention uses an immediate fallback and receives a retained approved sprite                                                                             | Existing admission, explicit funding, duplicate prevention, recovery, failure visibility, privacy, and no automatic paid retry                                    |
| S4 — Progressive model publication  | A generated rigid model can replace the sprite; compatible rigs follow only after their own qualification                                                            | Identity and mechanics-fit review, independent stage failure, safe mid-action swap, scoped reusable artifacts                                                     |
| S5 — Broaden with evidence          | Additional assemblies, creatures, state effects, pack portability, and scalable quality presets                                                                      | Family-specific coverage and whole-application performance; no claim of universal generated anatomy or mechanics                                                  |

Delivery details, dependencies, and unchecked completion criteria belong to [V3D delivery](../maintainers/3d-pixel-art.md). The rejected first candidate and its finite technique investigations retain [historical measured evidence](../verification/starting-scene-pixel-art.md). The [surface-art revision trials](../verification/starting-scene-pixel-stability.md), later library comparisons and representative study are delivered experiments; their scoped evidence does not close S0's moving-art acceptance or the study's normal-play face requirement. Later general-pipeline stages retain their existing proposal status. Their order describes dependencies within the possible pipeline, not a new game roadmap: [playable-game priorities](../repertoires/gameplay-priorities.md) control selection. Choose only the visual capability needed by the selected worthwhile player or creator experience, rather than making the complete art platform a prerequisite for playable content.

## 11. Non-goals

This project does not replace PlayCanvas, React, the simulation, the action executor, or the spatial provider. It does not require voxels, photorealism, ray tracing, universal dynamic global illumination, a new ECS, an asset marketplace, per-entity persistent compute, or generated executable shaders/code. Real-time cloth, ragdoll physics, arbitrary destructible interiors, full structural collapse, and automatic new locomotion are separate supported-mechanic projects.

It does not preserve incompatible development saves or add old-format migration. Follow the [root save policy](../../AGENTS.md#development-save-policy). Same-version integrity, live supported-definition changes, real account obligations, and current privacy protections remain required.

It does not ship reference artwork merely because that artwork appears in the art-direction library. Rights and provenance must be established for production assets and provider inputs.

## 12. Acceptance and unresolved choices

The [qualification document](3d-pixel-art-validation.md) owns concrete scenario evidence requirements. Product acceptance requires a compelling moving scene, reliable identity and interaction depiction, no authority or privacy regressions, progressive publication that survives failures and reload, bounded operational work, and measured creation/correction effort. No acceptance box is satisfied by this document.

The agreed first-scene direction is designed dimensional pixel art, comparing authored surfaces and realtime treatment by family through the asset study and moving experiments. Recommended broader defaults remain hybrid representations, rigid-object generation before arbitrary animated-model generation, shared appearance briefs, reuse before generation, a retained immediate fallback, and client-side representation choice among approved options. Decisions still requiring evidence are the final pixel rendering profile, ordinary camera scale, acceptable silhouette deviation, animation cadence by family, target devices and performance budgets, provider choice and real cost/latency, and automatic versus human review for each asset class. They are experiments or release gates, not reasons to invent arbitrary universal restrictions.
