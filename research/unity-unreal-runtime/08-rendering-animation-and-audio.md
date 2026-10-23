# Rendering, animation, visual effects, and audio

| Research status | Evidence cut | Scope |
| --- | --- | --- |
| Complete source synthesis; no engine benchmark performed | 2026-10-23; Unreal Engine 5.8 documentation and Unity 6.6 documentation, with package versions identified below | Mechanisms, work avoided or moved, fidelity limits, platform conditions, and the boundary between presentation and persistent simulation |

This chapter examines how the engines produce images, movement, effects, and sound from an already meaningful world. It does not select an engine or propose an OpenLegend implementation. The [version baseline](01-evidence-and-version-baseline.md) owns release and support-channel verification. References to a current documentation branch do not turn its older examples into current measurements.

OpenLegend's engine/world and authority boundaries make one distinction particularly relevant: making a character cheaper to draw or hear does not establish that the character stopped moving, noticing things, speaking, or affecting the world. That is a research interpretation of the mechanisms below, grounded in the repository's [engine and world boundaries](../../docs/engine-and-world-boundaries.md) and [architecture](../../docs/architecture.md), rather than a proposed change.

## 1. Frame scheduling: declare dependencies, then execute

### Unreal Render Dependency Graph

Unreal's Render Dependency Graph (RDG) records rendering operations and their resource relationships before executing them. Shader-parameter metadata exposes which textures and buffers a pass reads or writes. The graph can consequently discard unused passes, schedule compute/graphics synchronization, reuse memory whose previous contents are no longer needed, issue resource transitions, and record command lists in parallel. RDG Insights exposes the resulting dependencies and memory lifetimes. These are capabilities of the render graph; a graph declaration still needs to describe the real resource use correctly. [R01]

The work saved is partly *absence of work*: an intermediate image with no live consumer need not be produced. Another part is *overlap*: independent work can run while another queue is occupied. A third part is *shorter ownership*: two temporary resources can share backing memory when their uses do not overlap. These are analytically different savings. An asynchronous pass can take the same amount of GPU work while shortening the critical path; that does not mean the pass became cheaper in isolation.

### Unity render graph

Unity 6.6's Universal Render Pipeline (URP) uses the Core Scriptable Render Pipeline render-graph API. Passes declare their resources, after which the graph removes unused work, reuses compatible memory, and synchronizes compute and graphics queues. On tile-based GPUs, compatible passes can merge into a native render pass so intermediate results remain in tile memory. An internal resource's lifetime runs from its first writer through its last reader and cannot span graph instances, cameras, or frames. An imported external resource can span those boundaries, but its lifetime remains the caller's responsibility. [R02]

**Research interpretation.** These systems make dependencies and ownership observable enough for a scheduler to act on them. Their particular freedom comes from rendering's contract: the required output is a frame, and a discarded intermediate has no other consumer. That contract cannot be assumed for a persistent world transition, a saved event, or a character's private observation. A computation that does not affect this camera can still matter to another player or to a later event.

## 2. Geometry: several different problems share the word “LOD”

### Nanite's virtual geometry

Nanite analyzes triangle meshes at import into a hierarchy of clusters. At rendering time it selects detail according to the view and streams the required data, using its own rendering path rather than issuing traditional per-object draw calls. This reduces the need for manually authored geometry levels of detail (LODs). It does not remove limits on instance counts, materials, output resolution, streaming, or the GPU. The current overview explicitly includes skeletal meshes: their geometry uses Nanite while animation still has LOD, with support for animation-bank instancing. It also describes foliage as a combination of instancing, skinning, voxelization, animation, and material behavior. A static-mesh-only account of modern Nanite is incomplete. [R03]

Nanite's memory and content controls are separate from its image-quality controls. A larger streaming pool reduces repeated I/O and decompression at a memory cost. Minimum residency trades memory for fewer missing-detail transitions. Fallback meshes remain relevant on paths that cannot use Nanite. The technical guide also distinguishes the geometry's compressed size from its textures and complete delivered package. Its old sample-scene compression figures are not used here as current general performance estimates. [R04]

**Research interpretation.** “Millions of triangles” describes geometric detail, not millions of autonomous entities. Geometry clusters can be regenerated, discarded, or streamed without preserving individual behavioral identities. A moving character additionally carries animation, collision, attachments, and gameplay state. Reducing one representation's cost says little about the others until their dependencies are identified.

### Unity's GPU Resident Drawer

The GPU Resident Drawer makes compatible MeshRenderer content use BatchRendererGroup and GPU instancing automatically, reducing CPU draw submission. In the Unity 6.6 URP documentation, it supports **Forward+ and Deferred+**; an older Forward+-only description is stale. Compute support is required, and the documented exclusions include OpenGL ES and visionOS. Compatibility depends on renderer, material, shader, and usage restrictions; unsupported content can fall back to the existing path. It is not an automatic conversion of every possible renderer, custom shader, or character animation system into the same batching model. [R05]

Unity 6.6 also marks dynamic batching obsolete in its version-specific upgrade guidance. This matters when reading older optimization advice that presents CPU-side dynamic batching as a general contemporary default. The same guide records Cinemachine's move into an editor-coupled core package; package names and mechanisms should not be assumed to preserve their old version cadence. [R06]

### GPU occlusion culling

Unity's GPU occlusion culling uses depth information from the current and previous frame. An object is retained if either view indicates it is unoccluded, which deliberately favors conservative visibility over immediate removal. It tests bounds against a depth hierarchy; elongated objects with large bounds can therefore remain visible when much of their actual geometry is hidden. Its likely benefits depend on scene occlusion, object bounds, and compatible GPU Resident Drawer content. More culling is not automatically a net saving in an open scene with little occlusion. [R07]

The relevant distinction is between *draw visibility* and *knowledge*. A GPU visibility result answers whether drawing geometry contributes to a particular image under that renderer's conservative rules. It does not answer whether a character could see an event, recognized it, remembered it, or had permission to learn it. This is an interpretation of the camera-dependent inputs, not a limitation peculiar to one engine.

## 3. Lighting: cached approximations, sampling budgets, and invalidation

### Lumen and its multiple scene representations

Lumen first traces against the screen, then uses a hardware ray-tracing scene or software distance-field representation. Its Surface Cache stores material and lighting information sampled from surface “cards,” avoiding full material evaluation at every ray hit. Lighting updates are spread across frames; camera movement and scene changes can expose incomplete or lagging coverage. Hardware ray tracing adds the cost of maintaining acceleration structures, including animated geometry. Current 5.8 documentation enables skeletal Surface Cache support, but only six cards around pre-skinned bounds, so heavy deformation has limited coverage. “Lumen does not support skeletal Surface Cache” is therefore obsolete; “support has no deformation limitations” is also wrong. [R08]

Lumen Lite uses an irradiance-field final gather on Medium GI quality: world-space probes near pixels precompute irradiance, then interpolation includes probe occlusion. Medium reflection quality uses screen-space reflections for smooth surfaces rather than full Lumen reflections. The guide targets lower-end PCs and Switch 2 and describes a lower-quality/faster tradeoff. Its 30/60 fps console settings and lighting budgets are targets under stated resolution assumptions, not guarantees for arbitrary scenes or OpenLegend. [R09]

**Research interpretation.** Several different freshness questions coexist. A mesh can be visible now while its lighting cache is still catching up; a ray can hit simplified geometry while the rasterized surface has more detail. Image plausibility often tolerates these differences. Whether an action is blocked, a room is private, or a character witnessed an event is a different question and cannot be inferred from the lighting result alone.

### MegaLights: bounded samples trade quality for complexity

MegaLights samples important lights with a fixed ray budget per pixel and reconstructs lighting through denoising. Its principal tradeoff is increased noise, blur, or ghosting as local lighting complexity exceeds that sample budget. It begins with conservative screen traces, then continues through the ray-tracing scene. A shared acceleration structure can serve many lights and Lumen, but “constant cost” does not mean every related cost is fixed: shadow-map generation can add per-light work, complex material evaluation costs remain, and front-layer translucency adds another lighting path. The documentation also cautions that asynchronous overlap complicates isolated GPU timing. [R10]

The important comparison is a fixed amount of sampling with variable error versus a more exhaustive calculation whose cost grows with the contributing lights. The former does not promise that each light receives equal attention on each frame. This is a useful example of explicit approximation, with visible artifacts and debug views that expose the consequences; it is not evidence for randomly omitting semantically important world events.

### Virtual Shadow Maps

Virtual Shadow Maps allocate small pages of a large virtual shadow image only where needed, and cache pages between frames. Moving a light invalidates its cached pages; moving or deforming shadow casters invalidates overlapping areas. Separating static and dynamic depth avoids redrawing all static geometry when a small dynamic part changes. Shadow Map Ray Tracing samples these depth maps to approximate soft shadows rather than intersecting the full scene geometry for every sample. Its single-layer depth representation has overlap and penumbra limitations. Cost depends on page demand, invalidation, geometry rendered into pages, and shadow sampling; a high cache-hit scene and a rapidly changing scene are different workloads. [R11]

### Unity Adaptive Probe Volumes

URP Adaptive Probe Volumes (APV) place a hierarchy of probe bricks according to scene geometry density. Each brick contains a 4 × 4 × 4 probe grid; shading samples surrounding probes per pixel. This improves consistency across adjacent objects compared with selecting probes once per object. APV supports streaming and blending between baked lighting scenarios; sky-occlusion functionality can update sky contribution at runtime. It remains a system for baked indirect-light information with defined runtime adjustments, not unrestricted runtime rebaking of arbitrary changed geometry. Automatic placement also cannot guarantee a probe lies exactly on every wall or illumination boundary. [R12]

### Unity HDRP is a separate rendering configuration

The High Definition Render Pipeline (HDRP) has its own ray-tracing setup and scene representation. Its 17.6 setup documentation specifies DirectX 12, a supported 64-bit Windows player/editor path, ray-tracing-enabled assets/cameras, and restrictions such as static batching in Play Mode. It builds an acceleration structure for eligible meshes; material compatibility affects inclusion. The page retains an introductory reference to the 2019.3 preview, which is historical prose and is **not** used here to assign current maturity. These requirements cannot be transferred automatically to URP, WebGPU, mobile, or another graphics backend. [R13]

This is a key comparison constraint: “Unity supports ray tracing,” “URP runs in a browser,” and “a specific HDRP ray-traced effect is supported” are different claims. The relevant unit of comparison includes the pipeline, effect, API, device, and version, rather than the engine name alone.

## 4. Temporal reconstruction and perceived responsiveness

Unreal's Temporal Super Resolution (TSR) reconstructs a higher-resolution image from lower-resolution frames over time. Detail convergence depends on both internal resolution and actual frame rate. Newly revealed areas have little valid history, while motion and incorrect velocity information can damage reconstruction. Lower resolution reduces some rendering work, but the upscaler has its own cost and some later work runs at display resolution. The documentation explicitly warns that CPU limits or display synchronization can reduce the rate at which useful samples arrive. Its old demonstration timings are not measurements of the current workload. [R14]

**Research interpretation.** Display resolution, simulation frequency, input latency, and temporal convergence are independent quantities. A high displayed frame rate does not prove that a character's decisions are fresh; a sharp still image does not establish quality during camera motion. A complete statement of a measured result must identify which of those outcomes was observed. The source evidence here explains why a single average frame rate cannot represent all of them.

## 5. Animation: selecting motion, solving pose, and paying for updates

### Motion Matching

Unreal Motion Matching uses Pose Search to compare the current query against indexed motion examples. A schema defines features such as bone position, velocity, and trajectory, with weights describing their significance. The search selects matching poses from a database and can blend into the chosen motion. Its content coverage, feature selection, sample density, and weights shape both the motion and the search workload. It is a data-driven alternative to expressing every transition as an animation-state-machine rule; it does not synthesize arbitrary missing skills or decide what the character wants. [R15]

For an autonomous character, deciding to reach a doorway, selecting a plausible locomotion segment, adapting feet to the ground, and moving the collision body are distinct computations. Motion matching primarily addresses the motion-selection part. A plausible pose does not certify that the chosen path is navigable, that the action is allowed, or that another character observed it. Those are analytical distinctions rather than proposed OpenLegend interfaces.

### Unreal animation execution and budgets

Unreal's animation optimization guidance separates game-thread work from parallel pose evaluation. Direct property access can use fast paths, while Blueprint logic can introduce virtual-machine work or synchronization. Thread-safe animation functions and property access allow suitable calculations on worker threads; some dependencies, including particular root-motion/character-movement configurations, constrain that freedom. Rewind Debugger records animation-related behavior to inspect transitions and values over time. Parallelism is therefore conditional on data and callbacks, not an attribute guaranteed by the presence of an animation graph. [R16]

The Animation Budget Allocator distributes a game-thread time budget across registered skeletal-mesh components using significance. It can lower update frequency, interpolate, or share leader poses; some components can be marked always-tick. Registration transfers responsibility for their update scheduling to the budget system instead of leaving the ordinary tick/update-rate path in charge. The result is controlled pose-update degradation under load, with the workload and significance policy determining the effect. It is not a hard real-time guarantee or a general scheduler for all character behavior. [R17]

### Unity Animator and Playables

Unity's current Animator reference identifies several costs that are hidden by a simple “enable multithreading” description. Manual per-Animator updates inhibit parallelism; placing appropriate animation work in a manually evaluated PlayableGraph can preserve aggregated scheduling. Multiple Animators writing the same transform hierarchy share a threading constraint. Graph mutations can trigger rebind work, and reactivating pooled GameObjects can incur that work again. State-machine evaluation can continue on zero-weight layers, so a visually inactive animation path is not necessarily free. [R18]

Playables exposes a graph of inputs, processing nodes, and outputs for animation, audio, and scripted behavior. A clip can participate without a full Animator Controller, while a director can control graph timing. This makes sequencing and blending a separate capability from a large state-machine asset. The graph's ability to drive presentation is not itself an authority or persistence mechanism for the actions being depicted. [R19]

Animator culling modes change more than draw submission. `CullUpdateTransforms` can skip retargeting, inverse kinematics, and transform writes while invisible; `CullCompletely` stops animation evaluation. `AlwaysAnimate` keeps it running. [R20] The corresponding research question is which consumers depend on an updated pose. A hypothetical attachment, collision shape, root-motion calculation, or timed interaction can remain consequential off screen, even when drawing the pose would be unnecessary. No particular culling choice is prescribed here.

### Procedural pose adaptation and the current experimental frontier

Unity Animation Rigging **6.6.0** is a core package coupled to the editor, using Animation C# Jobs for constraint-based rigging. Inverse kinematics, aiming, and secondary attachments can adapt an existing animation to runtime surroundings. These operations solve pose constraints; they do not supply the reasoning that decides what object is appropriate to look at, touch, or use. Old package 1.4 references are not the package baseline for this editor. [R21]

Unreal's current Unreal Animation Framework (UAF) plugin is explicitly **Experimental**. Its description identifies a functional, dataflow-oriented animation framework, and its modules integrate with other animation/gameplay systems. This evidence does not establish that UAF has replaced production Animation Blueprints or that every integration is shipping-ready. Historical material using earlier framework names needs to be mapped to the current plugin and maturity before its claims are reused. [R22]

## 6. Visual effects: particles are not persistent world entities

Niagara distributes work among systems, emitters, and particles. GPU particle simulation does not remove the CPU cost of the owning systems and emitters. Batching instances can reduce overhead, while combining effects changes culling granularity. Pools reduce allocation and collection work but do not eliminate activation or warm-up costs. Effect Types provide shared scalability and culling controls. The current guide still contains wording about features being introduced in 5.4; those historical rollout statements are not treated as 5.8 status evidence. [R23]

Niagara's lightweight, or stateless, emitters reduce the need to retain and tick per-particle simulation state. The dedicated page describes fixed-function modules and restrictions on custom modules, scratchpads, and dynamic inputs. These constraints explain the tradeoff: a restricted effect can be evaluated more cheaply than an arbitrary stateful simulation. Its introductory “5.4 introduces” wording dates the feature's origin, not the evidence cut for this research. Claims that all emitters or particle workloads become cost-free would exceed the documented mechanism. [R24]

Niagara GPU ray-tracing collisions remain **Experimental** in the 5.8 documentation. They operate asynchronously and are **one frame behind**. They can handle geometry beyond the screen-buffer collision case but depend on supported ray-tracing configuration, with a distance-field fallback. [R25] This is a concrete example where “collision” in a visual-effects feature does not provide the timing or authority guarantees implied by an authoritative hit, damage event, or persistent object interaction.

Unity Visual Effect Graph 17.6 describes systems as connected spawn, initialize, update, and output contexts. GPU events can cause one particle system to spawn particles in another; local versus world simulation space determines how particles follow transforms. This is useful for large visual populations and chained effects, but a GPU event in that graph is still part of its effects lifecycle. The documented graph semantics alone establish neither saved world identity nor deterministic gameplay consequences. [R26]

## 7. Audio: generating a signal, choosing voices, and modeling propagation

### Sound graphs and voice budgets

Unreal MetaSounds is a **dataflow** graph: connected nodes process audio data, rather than using Blueprint-style execution wires. A MetaSound Source can produce sound; patches provide reusable graph functionality; presets inherit a graph while varying inputs. The distinction matters because reusable signal processing and gameplay sequencing are separate concerns. Sharing a graph definition also does not imply that simultaneously playing voices share all runtime processing. [R27]

Sound Concurrency limits active components in groups and selects what to reject or stop using rules such as age, distance, priority, or quietness. Active components can count even when silent; some routing configurations consume more than one slot. Multiple concurrency groups all constrain a sound, and retrigger rejection has its own behavior. These are allocation and mixing policies, with fades and ducking shaping audible transitions. They cannot establish that an event never happened just because the corresponding sound lost a voice. [R28]

Unity distinguishes the number of virtual voices tracked from the real voices mixed at once. Its audio settings also expose DSP-buffer size: smaller buffers favor responsiveness at greater processing pressure, while larger buffers favor efficiency with more delay. Spatializer and ambisonic-decoder plugins are independently selected. An AudioSource count is consequently an incomplete description of audio workload; voice selection, buffering, decoding, and processing matter as well. [R29]

### Occlusion and spatialization

Unreal's built-in attenuation/occlusion system checks a configured trace channel between source and listener and applies volume reduction and low-pass filtering when obstructed. Simple versus complex collision changes the geometry used and its cost. Interpolation controls how rapidly the filter changes. This is an efficient perceptual approximation, not a complete wave-propagation solver: an obstruction test with a filter does not by itself model every reflection, diffraction path, or room resonance. [R30]

Audio Gameplay Volumes remain **Beta** in current documentation. Components apply region-based attenuation, filtering, reverb, or submix behavior, with overlap priorities and audio-thread processing. They organize how a listener hears a region and how that region changes the mix. A volume boundary should not be read as a ready-made model of all characters' hearing, privacy, or language comprehension. [R31]

Unity's spatial-audio documentation exposes native spatializer plugins for effects such as binaural filtering; the engine does not itself include a spatializer plugin. Basic 3D source positioning is therefore distinct from installing a particular acoustic model. [R32] Valve's separate Steam Audio integration documents HRTF rendering, direct occlusion/transmission, reflections, and paths around obstructing geometry, with runtime and precomputed options. It is middleware with its own supported platforms and version lifecycle, not a universal built-in Unity or Unreal feature. [R33]

The Valve downloads page identifies Steam Audio 4.8.1 as the latest release found in this evidence pass. The live integration manual is undated and was not independently tested against the two exact editor patches. Its supported minimum engine versions are not proof that every new backend or browser works. Accordingly, the mechanism is included as a current external reference, with exact-patch compatibility explicitly unverified. [R34]

### Dialogue has additional semantic layers

The following is **research interpretation**, not an implementation plan. Several questions can have different answers for the same hypothetical spoken sentence:

| Question | Relevant kind of computation | Why the answer can differ |
| --- | --- | --- |
| Was a voice mixed for the player's device? | Voice priority, source playback, buffering | A sound may lose a voice budget despite an underlying event existing. |
| How did the sound reach a listener? | Attenuation, obstruction, spatialization, propagation | Approximate geometry and filtering shape the signal. |
| Could a character detect speech? | Character/world perception rules | A player-listener mix is not every character's sensory model. |
| Did the character understand the words? | Language, context, attention, permitted knowledge | Acoustic arrival alone does not establish comprehension. |
| Did the character learn or remember something? | Persistent semantic state | A transient audio buffer contains no automatic memory or permission contract. |

The cited voice, occlusion, and spatialization mechanisms support the first two layers. They do not supply evidence that the later layers are solved by an audio engine. Similarly, a subtitle or transcript is a presentation of speech, not proof that every nearby character should receive that content.

## 8. Comparison of the actual optimization contracts

The table is a synthesis of the cited mechanisms, not an engine ranking or proposed architecture.

| Mechanism | Work that can be avoided or moved | What remains or becomes approximate |
| --- | --- | --- |
| Render dependency graphs | Dead passes, overlong temporary lifetimes, unnecessary serialization | Correct dependency declarations; resource barriers; actual GPU work |
| Nanite | Excess geometric detail and much traditional submission work | Streaming, materials, instances, separate animation and gameplay work |
| GPU Resident Drawer | Repeated CPU submission for compatible renderers | Compatibility rules, GPU work, shader variants, data updates |
| GPU occlusion | Drawing conservatively hidden bounds | Visibility-history delay and false positives; no semantic perception result |
| Lumen caches | Repeated full surface/material/lighting evaluation | Coverage, refresh latency, alternative geometry representations |
| MegaLights | Exhaustive per-light sampling | Stochastic error, denoising, acceleration structure and translucency costs |
| Shadow-map page caches | Redrawing unchanged depth | Invalidation under moving lights, geometry, and deformation |
| Animation budgets/culling | Full-rate pose evaluation on every character | Interpolation error and dependencies on updated transforms/events |
| Stateless visual effects | Retaining and stepping arbitrary particle histories | Restricted effect behavior; image work still exists |
| Audio concurrency/virtualization | Mixing every active sound at full cost | Voice-selection loss; no automatic change to the underlying event |

The common pattern is a bounded, observable output contract with explicit approximations or lifetime rules. Whether that contract is acceptable for a different system is a separate semantic question. None of the documentation establishes an OpenLegend population capacity, frame budget, or character-behavior speedup; no such benchmark was performed.

## 9. Provenance and source register

All sources below were inspected on **2026-10-23**. “Live 5.8” means Epic's current page showed the 5.8 documentation branch; most pages expose no publication/revision date. “6.6” means the version-pinned 6000.6 manual/API, generally built on 2026-10-21 or 22. Build dates show publication of a documentation build, not that every paragraph was newly authored. Package versions are taken from page metadata where available. Text and relevant sections were inspected; embedded videos and example binaries were not watched or executed.

| ID | Source and version | Medium; evidence used and limit |
| --- | --- | --- |
| R01 | [Render Dependency Graph][R01], live 5.8 | Epic technical guide; scheduling, declarations, lifetimes, diagnostics; no GPU experiment |
| R02 | [URP render graph introduction][R02], 6.6 | Unity manual; resource lifetimes, culling, queue synchronization, tile pass merging |
| R03 | [Nanite overview][R03], live 5.8 | Epic guide; cluster hierarchy, streaming, skeletal and foliage scope |
| R04 | [Nanite technical details][R04], live 5.8 | Epic guide; residency, fallback, pools; old demo measurements excluded |
| R05 | [GPU Resident Drawer][R05], 6.6 | Unity manual; actual pipeline/platform compatibility and batching scope |
| R06 | [Upgrade to Unity 6.6][R06], 6.6 | Version-specific manual; obsolete dynamic batching, Cinemachine package coupling |
| R07 | [GPU occlusion culling][R07], 6.6 | Unity manual; depth history and conservative bounds |
| R08 | [Lumen technical details][R08], live 5.8 | Epic guide; tracing representations, caches, current skeletal coverage |
| R09 | [Lumen performance guide][R09], live 5.8 | Epic guide; Lumen Lite and qualified frame-rate targets |
| R10 | [MegaLights][R10], live 5.8 | Epic technical guide; stochastic budget, quality, costs, profiling conditions |
| R11 | [Virtual Shadow Maps][R11], live 5.8 | Epic technical guide; page residency, cache invalidation, depth approximation |
| R12 | [Adaptive Probe Volumes concepts][R12], 6.6 | Unity manual; brick structure, baked scenarios, runtime sky contribution |
| R13 | [HDRP ray-tracing setup][R13], 17.6.0; build 2026-10-22 | Unity package guide; configuration/geometry scope; 2019.3 intro not maturity evidence |
| R14 | [Temporal Super Resolution][R14], live 5.8 | Epic technical guide; temporal convergence; historical demo timings excluded |
| R15 | [Motion Matching][R15], live 5.8 | Epic guide; Pose Search query, schema and motion database |
| R16 | [Animation optimization][R16], live 5.8 | Epic guide; parallel evaluation constraints, fast paths, debugging |
| R17 | [Animation Budget Allocator][R17], live 5.8 | Epic guide; significance, component scheduling and update degradation |
| R18 | [Animator reference][R18], 6.6 | Unity API documentation; threading, graph rebinds, activation and layer costs |
| R19 | [Playables][R19], 6.6 | Unity manual; composable presentation graph, outputs and timing |
| R20 | [AnimatorCullingMode][R20], 6.6 | Unity API documentation; exact offscreen evaluation modes |
| R21 | [Animation Rigging][R21], 6.6.0; generated 2026-08-12 | Unity package documentation; C# Jobs and procedural constraints |
| R22 | [UAF plugin][R22], live 5.8 | Epic API/plugin index; explicitly Experimental, no production replacement claim |
| R23 | [Niagara scalability][R23], live 5.8 | Epic engineering guide; CPU/GPU ownership and pooling; stale 5.4 rollout text excluded |
| R24 | [Niagara lightweight emitters][R24], live 5.8 | Epic guide; fixed-function restrictions; origin wording still says 5.4 |
| R25 | [Niagara GPU ray-tracing collisions][R25], live 5.8 | Epic guide; Experimental status and one-frame delay |
| R26 | [Visual Effect Graph systems][R26], 17.6.0 | Unity package manual; context graph, simulation space, GPU events |
| R27 | [MetaSounds reference][R27], live 5.8 | Epic technical guide; dataflow, sources, patches and presets |
| R28 | [Sound Concurrency][R28], live 5.8 | Epic guide; active-component limits, rejection, voice-stealing policy |
| R29 | [Audio settings][R29], 6.6 | Unity manual; real/virtual voice budgets and DSP-buffer tradeoff |
| R30 | [Sound Attenuation][R30], live 5.8 | Epic guide; source/listener obstruction test and filtering |
| R31 | [Audio Gameplay Volumes][R31], live 5.8 | Epic guide; Beta status, modular region effects and audio-thread processing |
| R32 | [Audio spatializer][R32], 6.6 | Unity manual; native-plugin boundary |
| R33 | [Steam Audio Unity integration][R33], live undated | Valve manual; acoustic mechanisms; exact editor-patch compatibility untested |
| R34 | [Steam Audio downloads][R34], accessed 2026-10-23 | Valve release index; 4.8.1 latest listed; publication date not supplied |

### Additional inspected media and access limits

The [SIGGRAPH 2025 course page](https://advances.realtimerendering.com/s2025/) identifies Epic authors Krzysztof Narkowicz and Tiago Costa's *MegaLights: Stochastic Direct Lighting in Unreal Engine 5* and links [their presentation PDF](https://advances.realtimerendering.com/s2025/content/MegaLights_Stochastic_Direct_Lighting_2025.pdf), updated 2025-08-25. The source is directly relevant to the mechanism still documented in 5.8, but the 14.5 MB PDF exceeded the retrieval limit. The landing page and abstract were inspected; the full slides and embedded video were **not** consumed and are not used to support details in this chapter. This is an explicit retrieval gap, not a claim that a 2025 talk establishes 5.8 feature status.

[R01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/render-dependency-graph-in-unreal-engine
[R02]: https://docs.unity3d.com/6000.6/Documentation/Manual/urp/render-graph-introduction.html
[R03]: https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine
[R04]: https://dev.epicgames.com/documentation/unreal-engine/nanite-technical-details?lang=en-US
[R05]: https://docs.unity3d.com/6000.6/Documentation/Manual/urp/gpu-resident-drawer.html
[R06]: https://docs.unity3d.com/6000.6/Documentation/Manual/UpgradeGuideUnity66.html
[R07]: https://docs.unity3d.com/6000.6/Documentation/Manual/urp/gpu-culling.html
[R08]: https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine
[R09]: https://dev.epicgames.com/documentation/unreal-engine/lumen-performance-guide-for-unreal-engine
[R10]: https://dev.epicgames.com/documentation/en-us/unreal-engine/megalights-in-unreal-engine
[R11]: https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine
[R12]: https://docs.unity3d.com/6000.6/Documentation/Manual/urp/probevolumes-concept.html
[R13]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/Ray-Tracing-Getting-Started.html
[R14]: https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine
[R15]: https://dev.epicgames.com/documentation/unreal-engine/motion-matching-in-unreal-engine
[R16]: https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-optimization-in-unreal-engine
[R17]: https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-budget-allocator-in-unreal-engine
[R18]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Animator.html
[R19]: https://docs.unity.com/en-us/engine/6000.6/manual/animation-section/animation-mecanim/playables
[R20]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/AnimatorCullingMode.html
[R21]: https://docs.unity3d.com/Packages/com.unity.animation.rigging@6.6/manual/index.html
[R22]: https://dev.epicgames.com/documentation/unreal-engine/API/PluginIndex/UAF?lang=en-US
[R23]: https://dev.epicgames.com/documentation/unreal-engine/scalability-and-best-practices-for-niagara?lang=en-US
[R24]: https://dev.epicgames.com/documentation/en-us/unreal-engine/niagara-lightweight-emitters-overview
[R25]: https://dev.epicgames.com/documentation/en-us/unreal-engine/gpu-raytracing-collisions-in-niagara-for-unreal-engine
[R26]: https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.6/manual/Systems.html
[R27]: https://dev.epicgames.com/documentation/en-us/unreal-engine/metasounds-reference-guide-in-unreal-engine
[R28]: https://dev.epicgames.com/documentation/unreal-engine/sound-concurrency-reference-guide?lang=en-US
[R29]: https://docs.unity3d.com/6000.6/Documentation/Manual/class-AudioManager.html
[R30]: https://dev.epicgames.com/documentation/en-us/unreal-engine/sound-attenuation-in-unreal-engine
[R31]: https://dev.epicgames.com/documentation/unreal-engine/audio-gameplay-volumes-overview?lang=en-US
[R32]: https://docs.unity.com/en-us/engine/6000.6/manual/xr/audio/vraudio-spatializer
[R33]: https://valvesoftware.github.io/steam-audio/doc/unity/index.html
[R34]: https://valvesoftware.github.io/steam-audio/downloads.html
