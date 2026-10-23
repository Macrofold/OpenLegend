# How execution, animation and rendering scale independently

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; not a benchmark | Explains data-oriented execution, separate detail controls and browser capabilities without selecting an Open Legend implementation. | 2026-10-23 |

## 1. Processing a batch does not merge the people in it

Imagine one hundred animals, each with a different position, speed, health, current threat and destination. The computer can update all their positions in one compact loop. Each animal still receives its own result. A batch is a way to organize computation; it does not inherently create a collective mind or replace individual bodies with a population statistic.

Unreal's [MassEntity documentation](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine) provides a concrete example. Entities have identities and collections of data components. Entities with the same component composition are stored together in memory chunks. Shared processors operate on those chunks, and changes to component composition are deferred until a safe processing boundary. The useful distinction is between **shared executable logic** and **shared mutable character state**: the former does not require the latter.

This supports individual parameter variation, different current activities and different subsets of capabilities. It does not prove that every actor can efficiently execute an arbitrary, unrelated program. Similar operations over compact data are particularly suitable for this organization. Unique long histories, irregular searches and cross-character dependencies can still dominate.

Unity's [DOTS overview](https://unity.com/dots) describes a related combination of entity-oriented organization, jobs and Burst compilation. Burst produces optimized native CPU code; DOTS is not a synonym for moving every simulation calculation to a GPU. Neither this research nor the UEBS2 developer statements establish that UEBS2 uses Unity Entities, DOTS or Burst. Using Unity as the host engine is insufficient evidence for that claim.

### The cost of excessive uniqueness in representation

Individuality need not mean a different memory layout for every person. Unity's [Entities 1.5 chunk-allocation guidance](https://docs.unity3d.com/Packages/com.unity.entities@1.5/manual/performance-chunk-allocations.html) warns that many mostly empty chunks, very large component sets and too many distinct archetypes can waste memory and generate cache misses. Shared values can themselves fragment storage when they divide entities into too many small groups. The document distinguishes data used by AI, navigation, physics and rendering rather than assuming every calculation needs the whole character.

**Research inference:** a unique name, fear value, remembered event or destination can be data within a common representation. Giving every actor a separate software object hierarchy, scheduler or dynamically shaped component combination is a different choice. The latter is not a prerequisite for psychologically distinct characters, and an ECS label alone does not make it efficient.

## 2. Unreal Mass separates three kinds of detail

The [MassGameplay overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-gameplay-in-unreal-engine) documents distinct controls for representation, simulation and network replication. Simulation detail can group entities and vary calculation frequency. Network relevance is evaluated per connected viewer. StateTree behavior can wake in response to signals rather than continually reevaluating everything. These are framework mechanisms, not evidence that every game using Mass employs the same policy.

| Kind of work | What a lower-cost version changes | What it does not establish |
| --- | --- | --- |
| Visual representation | Mesh, animation representation, visibility and rendering cost | Whether the actor still notices an event or takes damage |
| Simulation detail | Frequency or sophistication of selected calculations | That changing frequency preserves the same outcomes |
| Network replication | Which viewer receives which updates, and how often | Permission to reveal private information or alter server truth |

The retrieved documentation is presented under Unreal 5.8, but some paragraphs retain older version-specific wording. This study relies on the documented separation of responsibilities, not on those paragraphs to declare a current production-readiness status for every plugin.

### City Sample: a concrete combination

Epic's [City Sample documentation](https://dev.epicgames.com/documentation/unreal-engine/city-sample-project-unreal-engine-demonstration) describes persistent Mass entities for traffic and crowds, a lightweight corridor network called ZoneGraph, and StateTree behavior for pedestrians. Traffic does not use that same StateTree behavior. Nearby pedestrians use fully rigged characters; distant ones use vertex-animated static meshes derived from the character assets.

That is useful evidence that persistent entities, simplified navigation and cheaper distant animation can coexist. It is not evidence of persistent autobiographical memories, open-ended dialogue or unconstrained urban life simulation. A visually distinct MetaHuman is not automatically a cognitively distinct person. Nor does the sample establish Open Legend capacity on a browser or server.

## 3. Independently animated characters can share most rendering work

Drawing a model and deciding what its character wants are separate jobs. [Hardware instancing in PlayCanvas](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/) draws repeated meshes with a small number of submissions while retaining per-instance transforms and other parameters. The documented basic path does not automatically perform per-instance camera-frustum culling. Sharing a mesh therefore removes some CPU submission overhead; it does not remove invisible work automatically or make the entire scene one cheap operation.

NVIDIA's historical [GPU Gems 3 chapter on animated crowd rendering](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-2-animated-crowd-rendering) demonstrates storing animation bone matrices in textures. Individual instances select their own animation and frame; mesh parts and colors provide appearance variation, while distance-based detail and culling reduce geometry and shading work. Its CPU still performs game logic. This is a rendering technique from the DirectX 10 era, not a description of UEBS2's exact implementation or a current hardware benchmark.

The broad lesson survives the age of that example: a crowd can look asynchronous and varied without separately evaluating an expensive animation graph for each visible body. Independent animation phases are not proof of independent high-level reasoning. Conversely, rendering many characters in the same batch does not invalidate their independent simulation.

The tradeoffs are task-dependent. Precomputed movement cycles can reduce flexibility for unexpected poses, terrain contact, carrying objects, physical injuries or interaction with differently sized characters. This is a research consideration, not a claim that any particular technique cannot support those features. More variety can require more assets, parameters, memory and specialized handling.

## 4. What moving work to the GPU buys—and what it costs

For many similar numerical operations, the useful opportunity is substantial parallel execution over compact data. UEBS2 is a strong developer-reported example; [its dossier](uebs2.md) separates disclosed facts from unknown algorithms. Broader individual-agent GPU evidence is covered in [cognition and agent systems](cognition-and-agent-systems.md).

Several different costs must remain visible:

| Cost | Why a large population exposes it |
| --- | --- |
| Memory capacity | Every independently tracked position, target and status consumes storage, even if updating it is cheap |
| Memory traffic | Reading and writing a large record many times can dominate its arithmetic |
| Divergent execution | A group performing many unrelated kinds of work is less regular than a group running the same short calculation |
| Neighbor discovery | Dense interactions can remain expensive after movement itself becomes cheap |
| Synchronization | One actor's result may affect another actor's next calculation |
| CPU/GPU transfer | Frequently handing complete population data back and forth can consume the benefit of offloading |
| Competition with rendering | Simulation and visuals can compete for the same GPU resources |
| Outcome ordering | Parallel calculation needs an explicit interpretation when actors affect the same object or each other |

These are analytical workload distinctions, not measurements of Open Legend. None supports a universal assertion that GPUs are unsuitable for complex agents, or that moving a calculation to a GPU necessarily improves end-to-end latency.

The [WebGPU explainer](https://gpuweb.github.io/gpuweb/explainer/) makes the transfer issue concrete: mapping a buffer transfers access between GPU and CPU, waits for relevant prior GPU work, and can require additional copies across browser-process boundaries. Adapter capabilities and limits also vary. A fast numerical kernel measured in isolation does not include these transfers, server publication or durable event recording.

## 5. Browser clients have useful capabilities, with deployment constraints

The existing [engine performance study](../game-engines/performance-and-hardware.md) remains the broader hardware/platform reference. The crowd-specific findings are:

| Capability | Primary evidence | Research implication |
| --- | --- | --- |
| GPU instancing in the existing renderer family | [PlayCanvas hardware instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/) | Repeated geometry can share rendering submissions while keeping individual transforms |
| General GPU computation | [PlayCanvas compute shaders](https://developer.playcanvas.com/user-manual/graphics/shaders/compute-shaders/) | Supported on its WebGPU path; unavailable through its WebGL path |
| GPU-produced draw counts and visibility work | [PlayCanvas indirect drawing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/indirect-drawing/) | Supported on WebGPU, with capability checks; avoids some CPU-controlled drawing work |
| Browser multithreading for compiled code | [Emscripten pthreads](https://emscripten.org/docs/porting/pthreads.html) | Shared-memory threads use workers and require the appropriate cross-origin isolation setup |
| Different GPU programming interfaces | [Chrome's WebGL-to-WebGPU guide](https://developer.chrome.com/docs/web-platform/webgpu/from-webgl-to-webgpu) | WebGL supports vertex/fragment shaders; WebGPU also exposes compute and explicit command encoding |

These are capabilities in current upstream documentation, not confirmation that Open Legend's pinned engine version, deployment headers or target devices already expose every listed feature. No package update, capability test or browser benchmark was performed for this study.

Most importantly, a browser client's GPU is not automatically the authoritative game server's GPU. It can render permitted information very efficiently without becoming responsible for deciding who was hit, what an animal witnessed or what a character remembers. Open Legend's [current authority boundaries](../../AGENTS.md#boundaries) already make that distinction. Research into client rendering and research into server simulation therefore answer different questions.

## 6. What this evidence does and does not justify

The strongest transferable observation is that **identity, behavior, execution layout, update frequency and visual representation are independent dimensions**. Many of the benefits demonstrated by crowd systems preserve individual state. Others intentionally change behavior or aggregate individuals, as the [game case studies](games-and-individual-simulation.md) show.

This evidence does not select Mass, DOTS, GPU simulation, a new renderer, an ECS rewrite or a particular population limit for Open Legend. It identifies mechanisms worth understanding and the complete costs any future comparison would need to include. [Open Legend research implications](open-legend-implications.md) connects those observations to the existing project contracts without changing them.
