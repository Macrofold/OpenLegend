# Unity dossier

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; comparative performance unmeasured | Assesses native Unity and its materially different web target, including current Unity 6.6 changes. | 2026-10-15 |

## Position in the shortlist

Unity is the strongest general-purpose proprietary candidate in this assessment for a performance-conscious, stylized 3D game targeting several native device classes. That is an engineering judgment about its combination of rendering choices, data-oriented tools, content workflow and deployment ecosystem—not a measured claim that it is faster than Godot, Unreal or PlayCanvas.

Evaluate **Unity native with the Universal Render Pipeline (URP)** separately from **Unity exported to the web** and **Unity with the High Definition Render Pipeline (HDRP)**. A feature advertised for one route is not evidence for the others. The inspected documentation includes Unity 6.3 and 6.6; newer features below are explicitly versioned. A future implementation must pin the editor and mutually compatible packages, rather than combining arbitrary latest documentation examples.

## Performance and hardware

Unity provides several ways to organize execution. Ordinary object/component scripts are convenient, but thousands of independent callbacks and allocations can become costly. Burst compiles suitable numeric C# code into optimized machine code; Entities supplies a data-oriented architecture. These tools make high-throughput designs possible, but useful parallelism requires suitable data ownership and dependencies. They do not automatically transform the existing Open Legend server. Sources: [Burst](https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html), [Entities](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/index.html).

For a large visible population, distinguish animation work, object-management overhead, rendering submission and actual GPU shading. A crowd benchmark using identical meshes without independent animation is not equivalent to Open Legend characters wearing different equipment, reacting to light, displaying captions and participating in combat. Combining ordinary objects, data-oriented systems and a custom server introduces integration work that should appear in the estimate.

URP is the more plausible starting point for Open Legend's current visual ambitions. HDRP offers a different high-end feature set and hardware/platform envelope; it should not be selected merely because “high definition” sounds more future-proof. Unity's [pipeline matrix](https://docs.unity3d.com/6000.6/Documentation/Manual/render-pipelines-feature-comparison.html) is the authority for feature availability. Choose the pipeline against required effects and minimum hardware, then test an actual scene.

A native build has more direct access to platform facilities than a web build. It still faces memory bandwidth, thermal limits, driver behavior, shader preparation and garbage collection. Neither IL2CPP nor Burst makes every script allocation-free, every library thread-safe or every engine subsystem parallel.

## The web route: more capable than old advice, still different

Unity 6.6 supports **parallel Burst-compiled jobs on the web** with Burst 1.8.26 or newer and the required multithreading settings/hosting prerequisites. Standard managed C# jobs remain on the main thread; disabling native multithreading also prevents the parallel route. This corrects the overly broad claim that all Unity web C# computation must be single-threaded. [Unity 6.6 Burst threading](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-burst.html).

This is not permission to assume arbitrary desktop C# threading or native plugins work in a browser. Unity's [web technical limitations](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html) retain managed-thread, socket, audio and ahead-of-time compilation differences. Deployment must account for shared-memory isolation requirements and the consequences for embedding and third-party resources.

The inspected [render-pipeline matrix](https://docs.unity3d.com/6000.6/Documentation/Manual/render-pipelines-feature-comparison.html) lists WebGPU support for URP as experimental and does not support HDRP on WebGL or WebGPU. Do not promise an HDRP desktop scene as a browser export, or treat an experimental graphics path as already qualified for our hardware matrix.

**Assessment:** Unity web is worth considering when Unity's authoring workflow or shared native/web content has substantial value. It is not an obvious performance-only replacement for a web-native engine. Download/startup cost, interoperation with a rich HTML interface, threading prerequisites and renderer differences must be compared directly.

## Rendering and special effects

Unity offers a substantial pipeline-dependent range of lighting, shadows, materials, animation and post-processing. The correct question is which effects are required simultaneously on which device. A high-end ray-traced effect on a supported native HDRP target says little about the cost or availability of its web/mobile equivalent.

For Open Legend, the meaningful visual tests include overlapping lit characters, dense foliage, many personalized materials, fire and smoke, rain under editable shelter, readable night scenes and camera cutaways that retain correct selection. The challenge is not whether an isolated effect exists. It is whether the full scene remains readable and responsive within a sustainable frame and memory budget.

Do not make authored gameplay depend on a pipeline-exclusive effect unless the minimum platform is deliberately narrowed. A magical barrier may use different shaders on different devices while preserving the same collision, visibility and action rules.

## Gameplay, physics and networking

Unity's networking packages can provide prediction, synchronization and engine-aware replication. They expect their own runtime models; an Unreal client or existing TypeScript server does not speak them automatically. [Netcode for Entities](https://docs.unity3d.com/Packages/com.unity.netcode@1.10/manual/index.html) and [Netcode for GameObjects physics](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/physics.html) are separate integration options, not a universal networking layer.

A Unity client can instead consume Open Legend's current server API. Then crafting, character knowledge, history and permissions remain on the existing server, while Unity handles presentation and input. The team must implement the client connection, permitted-view representation, asset mapping, reconnect behavior and any prediction. Moving movement or physics authority into Unity would be a separate architecture decision.

No inspected documentation establishes that ordinary engine physics is sufficiently bit-identical across every target for a deterministic distributed world. Confirmed outcomes and saved randomness should remain under a deliberate authority model. A cosmetic ragdoll can be local; a falling object that kills a character cannot have two conflicting authoritative simulations.

## Controllers and accessibility

The Input System supplies action-oriented input and controller support. The inspected [gamepad documentation](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Gamepad.html) distinguishes platform/device behavior, including weaker vendor-specific web support. Basic controller input is not the differentiator; complete rebinding, focus, text entry, controller disconnection and platform keyboard integration are.

A Unity rewrite would not transfer the existing React interface automatically. Inventory, invention review, conversations and world operations need a native interface or an explicitly supported embedded-web arrangement. Either route must be evaluated for controller navigation, text shaping, accessibility and maintainability. See the shared [input analysis](../controllers-and-networking.md).

## Live creation and asset loading

Unity can load generated models at runtime through packages such as [glTFast](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.14/manual/ImportRuntime.html). This is materially different from importing an asset in the editor. Test the actual required materials, animations, skinning, texture compression and cancellation behavior in an exported application.

[Addressables remote distribution](https://docs.unity3d.com/Packages/com.unity.addressables@2.7/manual/RemoteContentDistribution.html) can deliver prepared content and catalogues. It is not a promise that an arbitrary newly generated file instantly becomes an optimized asset on every platform. Cooked/prepared content, raw runtime imports and new executable code are distinct products with different platform and security constraints.

For Open Legend, the favorable architecture is to express most inventions as admitted data and combinations of supported capabilities. Choosing Unity does not remove the need to validate those definitions or to design a safe boundary for any future executable extensions.

## Production workflow and economics

Unity's editor/package ecosystem is a genuine benefit when it replaces custom animation, level-building and profiling work. It is also an ongoing dependency: package compatibility, pipeline changes, editor automation, build machines and vendor terms need maintenance. Source-visible C# game code does not make the proprietary engine runtime open source.

Unity's former Runtime Fee was cancelled; using it as a current reason to reject Unity would be inaccurate. Current subscriptions and eligibility still require review. Open Legend's AGPL code cannot simply be presumed compatible with a proprietary combined client. See [licensing and cost](../licensing-and-cost.md) for the current policy and the distinction between legal uncertainty and technical capability.

## When Unity wins

Choose it when broad native deployment, substantial 3D production tools and a practical path to data-oriented client work matter more than remaining fully within a permissive/open engine ecosystem, and when the actual licensing structure is resolved. It is especially credible for a stylized 3D action/simulation hybrid that does not require Unreal's most specialized high-end systems.

Do not choose it merely to make the current server faster, because a web export checkbox exists, or because C# is assumed automatically faster than JavaScript in every application. Its case weakens if the rich browser interface and immediate runtime content import are central while native distribution provides little additional value.

## Open Legend decision and disconfirming evidence

**Research judgment:** Unity native/URP is the leading balanced proprietary option, and an important benchmark reference even when licensing prevents immediate adoption. It is not the current policy-compatible default without further rights analysis.

Evidence that would strengthen it: clearly better sustained performance on the required scene, lower effort to produce high-quality character interactions, and successful runtime generation/controller/reconnect journeys. Evidence that would weaken it: asset/pipeline complexity dominating development, web requirements forcing substantial compromises, or a materially simpler open-engine route meeting the same targets. No such comparative test was run here.
