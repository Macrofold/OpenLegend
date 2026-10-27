# Environmental fluids, water, atmosphere, and material interaction

| Research status                              | Scope                                                                                                     | Reviewed   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| Complete for the documented mechanisms below | Gas and liquid effects, water surfaces, buoyancy, script queries, contact materials, sky, clouds, and fog | 2026-10-23 |

This chapter examines **Unreal Engine 5.8**, **Unity 6.6**, **HDRP 17.6.0**, and **Unity Physics 6.6.0**. Patch provenance is in [chapter 01](01-evidence-and-version-baseline.md). Water appearance, fluid motion, object forces, and material contact response have distinct representations and update contracts. The research does not prescribe OpenLegend systems or implementation work.

## 1. Maturity applies to each feature

Epic labels Niagara's fluid simulation **Beta**. Its current plugin indexes separately label **Water**, **WaterAdvanced**, and **Buoyancy** **Experimental**. These are explicit labels, rather than an inference from an `Experimental` source-directory name. [Fluid overview][S13-01]; [Water index][S13-04]; [WaterAdvanced index][S13-07]; [Buoyancy index][S13-11]

Unity's cited water pages belong to the released HDRP 17.6.0 documentation. That package version establishes the evidence boundary; it does not make every water technique a general-purpose liquid solver. No separately verified preview label is assigned here to ordinary HDRP water. Current API declarations are distinguished below from implementation details that the public manual does not establish.

## 2. Niagara gas and liquid simulation

### State, pressure, and dimensionality

Niagara Fluids uses GPU simulation. Liquids use **FLIP**, combining a velocity grid with particles that represent fluid shape: grid velocities are solved and sampled back to particles. Pressure solving is iterative; more iterations cost more, improve the approximation, and can damp externally added forces. Collider boundaries mask occupied cells, while collider velocity displaces fluid. Simulation stages finish their work over the grid before the next stage begins, and stages can repeat. The documented two-dimensional FLIP variant uses three-dimensional particles with a two-dimensional pressure solve and is intended for splash-like effects rather than pools. Shallow-water templates instead represent surface displacement; this is a different approximation from volumetric liquid. [Fluid overview][S13-01]

Gas cells hold **density, temperature, and velocity**. Emitters can inject these fields from another particle emitter. Exposed controls include density/temperature/velocity dissipation, buoyancy, vorticity confinement, pressure iterations, domain size, and open boundaries. A fixed delta-time override or scaled engine delta time controls advancement. Rendering has its own sampling step, independent of cell resolution. The cinematic emitter's documented deterministic property concerns its **particle sourcing algorithm**; it is not a whole-system or cross-device determinism guarantee. [Fluids reference][S13-02]

**Interpretation.** Density and temperature fields used to render smoke or fire do not establish combustion chemistry, fuel consumption, heat conduction into arbitrary objects, or gameplay damage. The inspected guides do not identify the exact current advection discretization or establish those additional coupling contracts. Reducing grid dimensions, resolution, or pressure iterations changes the represented evolution; reducing raymarch samples changes its visual reconstruction. Those are different fidelity decisions.

Niagara can bake fluid effects into flipbook textures. That moves the expensive evolution into preparation and leaves a stored visual sequence. **Interpretation:** the saved sequence cannot acquire new physical reactions merely because a later runtime object intersects its image. [Niagara Fluids landing page][S13-03]

## 3. Unreal water surfaces and buoyancy

### Surface geometry and wave generation

Water Zone generates the shared surface mesh for spline-defined Water Bodies. A quadtree selects visible tiles each frame and varies detail with camera distance; adjacent levels morph between tessellations. These mechanisms reduce and smooth rendering work. They do not, by themselves, calculate transported liquid volume. [Water meshing][S13-05]

The Water Waves Asset guide documents **Gerstner waves** as its supplied default: multiple parameterized waves contribute displacement, with seed, wavelength, amplitude, direction, steepness, and wave count shaping the result. Additional surface detail can come from materials. Its broad statement that only Gerstner is supplied must be read within that asset workflow, because the current WaterAdvanced API exposes an FFT-ocean subsystem. [Water Waves Asset][S13-06]

WaterAdvanced explicitly combines Niagara Fluids and Water. Its `UShallowWaterSubsystem` exposes a simulation grid, pending impacts, water-information dependencies, collision proxies, and selection of relevant pawns. Impact registration includes location, velocity, and radius. **Interpretation:** that API demonstrates bounded simulation and interaction machinery, but does not establish that every water body or historical disturbance remains simulated everywhere. [WaterAdvanced index][S13-07]; [Shallow-water subsystem][S13-08]

`UFFTOceanPatchSubsystem` exposes a Niagara ocean component and ocean-normal render target. This establishes an actual current API beyond the Gerstner asset; its terse documentation does not establish spectrum formulation, conservation guarantees, or complete liquid-volume dynamics. [FFT-ocean subsystem][S13-09]

### Two documented buoyancy paths

The Water Buoyancy Component tutorial approximates a body with spherical **pontoons**. Their immersion drives buoyancy; coefficients, damping, force limits, drag, and river forces adjust its response. The tutorial requires a simulated rigid body with mass. This is an approximation to displaced volume, not evidence that the render mesh's triangles become a fully coupled fluid boundary. [Water Buoyancy Component][S13-10]

The separate Experimental **Buoyancy plugin** exposes box/convex shapes, approximate submerged volume and center of mass, and triangle-based fluid-force calculations. Its API includes water drag, lift, density, linear/angular motion, and force/torque outputs. Water splines are maintained for the physics thread; wave data can be evaluated there without accessing UObjects, and Gerstner parameters have a self-contained copy. A documented shallow-water sampler reads **baked** simulation. This does not establish live GPU FLIP readback or unrestricted bidirectional coupling. [Buoyancy index][S13-11]; [Buoyancy runtime API][S13-12]

Subdivision limits and minimum subdivision volume bound approximation work; other settings expose velocity-change limits and keeping buoyant bodies awake. **Interpretation:** stronger sampling and wakefulness can increase work even when the visible water mesh has low detail. [Buoyancy settings][S13-13]

### What the Chaos MPM API establishes

Current Chaos exposes `TMPMTransfer`, including APIC particle-to-grid transfer, mass/momentum splatting, and grid-to-particle transfer. This is evidence of low-level material-point-method machinery. The inspected public API does **not** establish a complete supported general-fluid authoring product, its material model, or automatic coupling to Water/Niagara. The directory path alone is insufficient to assign product maturity. [MPM transfer API][S13-14]

## 4. Unity HDRP water

### Frequency bands and local interaction

HDRP models water with frequency bands: oceans combine two swell bands and ripples; rivers use agitation and ripples; pools use ripples. Each band has a simulation patch, distinct from the mesh grid used to render it. Wind drives wave behavior, while currents can have independently controlled direction. [Water simulation][S13-15]

The current API names a water-spectrum parameter structure, but the inspected documentation does not specify its mathematical spectrum or FFT implementation. This research therefore describes the verified band model without importing an older ocean tutorial's algorithm as a current implementation guarantee. [Water spectrum API][S13-16]

Water decals can supply deformation, foam, masks, and currents through textures or Shader Graph. Decal regions can follow the camera or another object; the combined mask/current workflow requires explicit enablement for compatibility. [Current decals][S13-17] Horizontal deformation requires additional storage and can reduce accuracy in script queries, underwater rendering, and interaction effects. The presence of a rolling-wave sample does not overturn the capabilities page's stated lack of shoreline-breaking-wave support. [Deformation][S13-18]; [Capabilities][S13-19]

### Query cost, success, and ownership

More active bands and higher simulation resolution increase work. CPU water simulation repeats work also performed on the GPU. Render-pipeline settings separately expose **CPU simulation versus GPU readback** for script interactions, and full versus half CPU resolution. [Quality and performance][S13-20]; [Pipeline settings][S13-21]

**Documentation conflict.** The 17.6 enum assigns negligible extra cost and several frames of latency to `CPUSimulation`, while assigning significant CPU cost to `GPUReadback`. These descriptions conflict with the manual's CPU-duplication explanation and appear transposed. The mode names and controlling settings are verified; no exact readback latency or zero-cost guarantee is accepted from that contradictory description. [Interaction-mode enum][S13-22]

`ProjectPointOnWaterSurface` requires script-interaction support and returns whether evaluation could execute. Its boolean alone is not a convergence guarantee. Search parameters separately specify a target error, maximum iterations, starting candidate, and inclusion of deformation or simulation. The result includes a candidate location and horizontal error. An unavailable evaluation or an error above tolerance is not proof that a location contains no water. [WaterSurface API][S13-23]; [Search parameters][S13-24]; [Search result][S13-25]

Unity's floating-object example assigns the projected position to a Transform. Its batched version uses persistent native arrays, schedules a search job, completes it before reading outputs, and disposes arrays on destruction. That demonstrates query batching and explicit ownership; it does not demonstrate a force-based boat solver or asynchronous completion across frames. [Float objects][S13-26]

VFX can sample height, normal, and current, but the documented global-texture route binds **one water surface at a time**. Omitting ripples or deformation saves evaluation work while reducing detail. [Water/VFX interaction][S13-27] Surface timing can be synchronized through `simulationTime`; **interpretation:** matching a wave clock does not itself replicate impacts, object state, or contact outcomes. [Surface synchronization][S13-28]

## 5. Contact materials describe solver behavior

Unreal Physical Materials specify friction, restitution, and density. Pair combination can average, minimize, multiply, or maximize coefficients. Density participates in mass calculation, while a separate mass-scaling exponent approximates increasingly hollow larger objects. The page's inherited UE4 destruction passage is not used as evidence about current Chaos damage. [Physical Materials reference][S13-29]

Unity's built-in 3D Physics Material distinguishes static and dynamic friction from bounciness. [Physics Material reference][S13-30] When contacting colliders select different combine rules, priority ascends from Average through Minimum and Multiply to Maximum; the chosen operation produces shared contact coefficients. [Combine API][S13-31]

Unity Physics 6.6.0 uses its own material structure. Its combine policies include arithmetic and **geometric** means, minimum, and maximum, so it is not an identical enum to built-in 3D physics. [ECS combine policy][S13-32] Material response settings also distinguish collision, trigger/event reporting, and no collision response. The last can still permit queries; absence of contact force does not necessarily mean absence from the collision world. [ECS custom materials][S13-33]

**Interpretation.** A coefficient controlling contact friction is not a model of wetness, absorption, viscosity, erosion, or thermal change. A shader's wet appearance does not prove that contact coefficients changed. Any claim about such coupling needs evidence of the state exchange, rather than similar terminology in rendering and physics.

## 6. Cross-system boundaries

The mechanisms above expose several independently reducible costs: surface tessellation, simulated bands/cells, pressure iterations, submersion sampling, query iterations, and volume-rendering samples. They also expose different meanings of missing information: an unsimulated region, unavailable query data, unresolved numerical error, an excluded ripple band, or a baked effect. Treating all five as physically empty space would change the question being answered.

This is analytical synthesis, not a proposed architecture. Visible waves or smoke establish presentation output; a pressure grid establishes a particular physical approximation; a water query establishes a result under its configuration and timing. None alone establishes character knowledge, authoritative network state, or persistent saved-world consequences. The associated clock, perception, and persistence distinctions remain those examined in [chapter 02](02-simulation-and-perception.md) and [chapter 07](07-networking-persistence-and-replay.md).

## 7. Atmosphere, clouds, and fog: rendering a volume is a separate contract

### Sky scattering and precomputed answers

Unreal Sky Atmosphere approximates light transport through atmospheric media, including Rayleigh/Mie scattering and absorption. Its rendering path reduces repeated per-pixel marching through low-resolution lookup tables: sky-view luminance, camera-frustum aerial perspective, multiple scattering, and transmittance serve different consumers. Resolution and sample count trade cost against visible artifacts. Ground-level and planetary views also have different transmittance requirements; changing view regimes can expose a transition between lookup-based and per-pixel evaluation. These are rendering mechanisms with explicit reuse and approximation boundaries. Historical hardware examples in the guide are not used as current performance estimates. [ENV01]

HDRP 17.6's Physically Based Sky distinguishes **World** and **Camera** rendering spaces. World mode precomputes combinations of lighting/view angles into three-dimensional textures, independent of scene content. Camera mode uses smaller tables for the configured lights and recomputes them when a light moves; it targets ground-oriented views and changing atmospheric composition. The modeled media include air, aerosols, and an absorbing ozone layer. Consequently, the statement that sky scattering is “precomputed” does not imply identical invalidation or update cost in both modes. The documentation's broad time-of-day performance language is read together with these mode-specific conditions. [ENV02]

**Interpretation.** A lighting lookup table answers how the specified atmosphere affects light. It does not establish how weather evolves, how air transports heat or moisture, or what a character can physically breathe. Changing an atmospheric parameter can alter appearance without an engine having simulated the process that produced that change.

### Cloud representations and sampling

Unreal Volumetric Cloud ray-marches a material-defined three-dimensional volume. It approximates multiple scattering with configurable octaves, whose added evaluations increase shader work. Its shadow paths differ: secondary ray marching can produce colored volume shadows but has sample/distance limits; Beer shadow maps use cascaded maps for longer distances at lower fidelity and without volumetric self-shadow color. Reflection and shadow sample budgets are separately controllable. Thus “volumetric” names a represented medium and rendering method, not unrestricted accuracy or a weather solver. Old console-specific advice is not generalized to current hardware. [ENV03]

HDRP builds volumetric clouds from a lookup table, a volume, and a top-down cloud map. Large-scale noise shapes the clouds; smaller-scale noise erodes their edges. Its separate Cloud Layer is a two-dimensional sky texture that can move with a flow map. The inspected manual also identifies different reflection-probe settings and excludes volumetric clouds from ray-traced effects. These representations can coexist because they solve different image-production problems. The guide's word “interactable” describes receiving fog/light and casting shadows; it is not used here to infer solid collision or a complete atmospheric dynamics model. [ENV04]

### Fog, temporal accumulation, and compositing limits

Unreal Volumetric Fog stores lighting and participating-media density in a relatively low-resolution volume aligned with the camera frustum. Increasing view distance distributes a finite number of depth slices over more space; increasing resolution adds work. Temporal reprojection and sub-voxel jitter reduce aliasing, but rapidly changing lights can leave trails. Local volume materials provide extinction, emission, and albedo fields. The page's old PlayStation 4/GTX 970 timings are excluded from this current analysis. The mechanism establishes a rendered optical volume, not persistent smoke exposure or a conserved fluid volume. [ENV05]

HDRP distinguishes exponential distance/height fog from optional nearby volumetric lighting. Sampling mip levels of the sky cubemap can give fog a spatially varying color at lower cost than true volumetric fog. The volumetric path supports local light interaction but does not support light rendering layers in the inspected version. This is another case where similar visible effects have different evaluated representations and feature limits. [ENV06]

The HDRP environment-limitations page makes the interactions explicit. Atmospheric attenuation uses a frustum lookup with a finite distance range. Water depth affects transparent-object ordering, for which HDRP provides a separate compositing path; clouds use that sorting path by default. Fog's multiple-scattering composition does not account for cloud opacity. A set of physically motivated effects can therefore have integration approximations that are not apparent from each effect's individual description. [ENV07]

### What this adds to the environmental comparison

The water/fluids and atmosphere sections examine different representations of an environment. A surface height, a velocity grid, a collision response, an extinction field, and a color texture are not substitutes for one another. Their update regions, consumer threads, numerical approximations, and retained history differ.

For the intended OpenLegend world scope, this is an **evidence boundary**, not a design: visual rain or fire, fluid motion, mechanical force, heat transfer, exposure, resource availability, and remembered consequences require separately established behavior. A persuasive image can demonstrate its own rendering result without validating all of those additional consequences. The existing [perception](02-simulation-and-perception.md), [physics](04-physics-and-spatial-queries.md), [presentation](08-rendering-animation-and-audio.md), and [semantic-system](11-gameplay-frameworks-and-semantic-systems.md) chapters retain the corresponding distinctions.

## Source and provenance register

All sources below were **opened and inspected on 2026-10-23**. They are primary Epic/Unity documentation or API references. Epic pages identify UE 5.8 but generally do not give an article publication date. Unity package URLs and metadata identify the stated versions; documentation-generator timestamps are not feature-introduction dates. No videos, commercial plugins, or older-version tutorials supply current mechanism claims in this chapter. Thin APIs and contradictions are qualified above rather than completed by speculation.

| ID     | Inspected source                           | Version / medium            | Evidence boundary                                                  |
| ------ | ------------------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| S13-01 | [Fluid Simulation Overview][S13-01]        | UE 5.8, live manual         | Beta; GPU fluid representations and stages                         |
| S13-02 | [Niagara Fluids Reference][S13-02]         | UE 5.8, live manual         | Gas fields, controls, sampling, sourcing                           |
| S13-03 | [Niagara Fluids][S13-03]                   | UE 5.8, live manual         | Baking alternative                                                 |
| S13-04 | [Water plugin index][S13-04]               | UE 5.8, live API            | Explicit Experimental label                                        |
| S13-05 | [Water Meshing System][S13-05]             | UE 5.8, live manual         | Surface tessellation, not volume conservation                      |
| S13-06 | [Water Waves Asset][S13-06]                | UE 5.8, live manual         | Asset workflow; broad Gerstner claim qualified                     |
| S13-07 | [WaterAdvanced index][S13-07]              | UE 5.8, live API            | Experimental integration                                           |
| S13-08 | [UShallowWaterSubsystem][S13-08]           | UE 5.8, live API            | Exposed state and operations                                       |
| S13-09 | [UFFTOceanPatchSubsystem][S13-09]          | UE 5.8, live API            | Thin API; algorithm details unverified                             |
| S13-10 | [Water Buoyancy Component][S13-10]         | UE 5.8, live manual         | Pontoon approximation                                              |
| S13-11 | [Buoyancy plugin index][S13-11]            | UE 5.8, live API            | Explicit Experimental label                                        |
| S13-12 | [Buoyancy runtime module][S13-12]          | UE 5.8, live API            | Submersion, force, thread data, baked sampler                      |
| S13-13 | [FBuoyancySettings][S13-13]                | UE 5.8, live API            | Exposed bounds and wake settings                                   |
| S13-14 | [TMPMTransfer][S13-14]                     | UE 5.8, live API            | Transfer machinery, not verified fluid product                     |
| S13-15 | [Water simulation][S13-15]                 | HDRP 17.6.0, manual         | Frequency bands and patches                                        |
| S13-16 | [WaterSpectrumParameters][S13-16]          | HDRP 17.6.0, API            | Spectrum structure; no verified formula                            |
| S13-17 | [Simulating currents with decals][S13-17]  | HDRP 17.6.0, manual         | Local interaction workflow                                         |
| S13-18 | [Deform a water surface][S13-18]           | HDRP 17.6.0, manual         | Deformation cost and accuracy limits                               |
| S13-19 | [Water capabilities][S13-19]               | HDRP 17.6.0, manual         | Shoreline-breaking limitation                                      |
| S13-20 | [Water quality and performance][S13-20]    | HDRP 17.6.0, manual         | Band/resolution/CPU costs                                          |
| S13-21 | [RenderPipelineSettings][S13-21]           | HDRP 17.6.0, API            | Script data source and CPU resolution                              |
| S13-22 | [WaterScriptInteractionsMode][S13-22]      | HDRP 17.6.0, API            | Conflicting mode descriptions retained as conflict                 |
| S13-23 | [WaterSurface][S13-23]                     | HDRP 17.6.0, API            | Query execution contract                                           |
| S13-24 | [WaterSearchParameters][S13-24]            | HDRP 17.6.0, API            | Search budget and inclusion controls                               |
| S13-25 | [WaterSearchResult][S13-25]                | HDRP 17.6.0, API            | Candidate and residual error                                       |
| S13-26 | [Float objects on water][S13-26]           | HDRP 17.6.0, manual/code    | Pose fitting and array/job lifetime; older outbound links not used |
| S13-27 | [Water and VFX interaction][S13-27]        | HDRP 17.6.0, manual         | One global surface binding                                         |
| S13-28 | [Synchronize water surfaces][S13-28]       | HDRP 17.6.0, manual         | Relative time; no replication guarantee inferred                   |
| S13-29 | [Physical Materials Reference][S13-29]     | UE 5.8, live manual         | Contact/mass; inherited UE4 destruction text excluded              |
| S13-30 | [Physics Material asset reference][S13-30] | Unity 6.6, manual           | Built-in 3D contact properties                                     |
| S13-31 | [PhysicsMaterialCombine][S13-31]           | Unity 6.6, API              | Pair-rule priority                                                 |
| S13-32 | [Material.CombinePolicy][S13-32]           | Unity Physics 6.6.0, API    | ECS coefficient operations                                         |
| S13-33 | [Custom materials][S13-33]                 | Unity Physics 6.6.0, manual | Response and query distinction                                     |

### Atmospheric sources

All sources below were inspected on **2026-10-23**. Epic's pages identify the 5.8 documentation branch; these are living guides without a verified publication date. Unity's pages identify **HDRP 17.6.0**; the inspected sky/cloud/fog pages expose an October 22 documentation build confirmed in the final source recheck, which is not a claim that every paragraph was authored then. Mechanism and limitation sections were read; no rendering workload or environmental simulation was executed.

| ID    | Source                                                 | Evidence inspected                                                                      |
| ----- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| ENV01 | [Sky Atmosphere][ENV01], UE5.8                         | Lookup tables, scattering, ground/planetary views; historical hardware claims excluded. |
| ENV02 | [Physically Based Sky reference][ENV02], HDRP17.6.0    | World/Camera precomputation and invalidation; atmospheric media.                        |
| ENV03 | [Volumetric Cloud][ENV03], UE5.8                       | Volume marching, scattering approximation, shadow paths, sample controls.               |
| ENV04 | [Understand clouds][ENV04], HDRP17.6.0                 | Shaping/erosion, cloud maps, layer alternative and rendering limitations.               |
| ENV05 | [Volumetric Fog][ENV05], UE5.8                         | Frustum volume, temporal reprojection, local optical fields; old timings excluded.      |
| ENV06 | [Understand atmospheric scattering][ENV06], HDRP17.6.0 | Exponential versus volumetric fog and rendering-layer restriction.                      |
| ENV07 | [Environment limitations][ENV07], HDRP17.6.0           | Attenuation range and cross-effect compositing boundaries.                              |

[S13-01]: https://dev.epicgames.com/documentation/unreal-engine/fluid-simulation-in-unreal-engine---overview
[S13-02]: https://dev.epicgames.com/documentation/unreal-engine/niagara-fluids-reference-in-unreal-engine
[S13-03]: https://dev.epicgames.com/documentation/unreal-engine/niagara-fluids-in-unreal-engine
[S13-04]: https://dev.epicgames.com/documentation/unreal-engine/API/PluginIndex/Water
[S13-05]: https://dev.epicgames.com/documentation/unreal-engine/water-meshing-system-and-surface-rendering-in-unreal-engine
[S13-06]: https://dev.epicgames.com/documentation/unreal-engine/simulating-waves-using-the-water-waves-asset-in-unreal-engine
[S13-07]: https://dev.epicgames.com/documentation/unreal-engine/API/PluginIndex/WaterAdvanced
[S13-08]: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/WaterAdvanced/UShallowWaterSubsystem
[S13-09]: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/WaterAdvanced/UFFTOceanPatchSubsystem
[S13-10]: https://dev.epicgames.com/documentation/unreal-engine/water-buoyancy-component-in-unreal-engine
[S13-11]: https://dev.epicgames.com/documentation/unreal-engine/API/PluginIndex/Buoyancy
[S13-12]: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Buoyancy
[S13-13]: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/Buoyancy/FBuoyancySettings
[S13-14]: https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Chaos/TMPMTransfer
[S13-15]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/water-water-system-simulation.html
[S13-16]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.WaterSpectrumParameters.html
[S13-17]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/simulating-currents-with-water-decals.html
[S13-18]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/water-deform-a-water-surface.html
[S13-19]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/water-capabilities-of-the-water-system.html
[S13-20]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/water-quality-and-performance-decisions.html
[S13-21]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.RenderPipelineSettings.html
[S13-22]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.WaterScriptInteractionsMode.html
[S13-23]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.WaterSurface.html
[S13-24]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.WaterSearchParameters.html
[S13-25]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/api/UnityEngine.Rendering.HighDefinition.WaterSearchResult.html
[S13-26]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/float-objects-on-a-water-surface.html
[S13-27]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/water-vfx-interaction.html
[S13-28]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/synchronize-water-surfaces.html
[S13-29]: https://dev.epicgames.com/documentation/unreal-engine/physical-materials-reference-for-unreal-engine
[S13-30]: https://docs.unity3d.com/6000.6/Documentation/Manual/class-PhysicsMaterial.html
[S13-31]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/PhysicsMaterialCombine.html
[S13-32]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/api/Unity.Physics.Material.CombinePolicy.html
[S13-33]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/manual/custom-materials.html
[ENV01]: https://dev.epicgames.com/documentation/unreal-engine/sky-atmosphere-component-in-unreal-engine
[ENV02]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/physically-based-sky-volume-override-reference.html
[ENV03]: https://dev.epicgames.com/documentation/unreal-engine/volumetric-cloud-component-in-unreal-engine
[ENV04]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/understand-clouds.html
[ENV05]: https://dev.epicgames.com/documentation/unreal-engine/volumetric-fog-in-unreal-engine
[ENV06]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/Understand-Fog.html
[ENV07]: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.6/manual/Environment-Limitations.html
