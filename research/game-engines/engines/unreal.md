# Unreal Engine dossier

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; comparative performance unmeasured | Evaluates Unreal 5.8-era capabilities, native deployment, streaming and Open Legend integration risks. | 2026-10-15 |

## Position in the shortlist

Unreal is the strongest candidate here when the product requires sophisticated close-up 3D presentation, advanced lighting, complex animation, large authored environments and an engine-integrated action-game stack. This is a capability/tooling judgment, not proof that an Unreal build of Open Legend would be the fastest or cheapest route.

The relevant comparison is not “Unreal versus a simple browser game.” It is whether its particular integrated systems reduce the cost of delivering the experience we actually want. The inspected documentation is current to the 5.8 generation. Older blanket statements about static-only Nanite or editor-only importing need qualification.

## Performance and hardware

Unreal exposes native C++ systems, task-oriented execution, profiling and rendering facilities. For large populations, [MassEntity](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine) offers data-oriented processing. A crowd represented through Mass is not automatically equivalent to thousands of fully animated Actors with individual ticking components, physics and complex AI.

The engine gives the team multiple representations, but the team must choose when to use them. Persistent identity, player knowledge, AI requests and database durability remain separate from rendering an efficient crowd. Keeping the existing server would not move those costs into Mass or C++.

A heavy default renderer can spend considerable time before Open Legend-specific work begins. Benchmark an appropriate packaged configuration, not just an editor viewport or an empty project. AMD's [Unreal performance guide](https://gpuopen.com/learn/unreal-engine-performance-guide/) is useful for controlled CPU/GPU attribution and repeatable captures. Its optimizations are not evidence of a cross-engine speed advantage.

Unreal can serve different hardware classes, but its most advanced rendering modes have narrower practical requirements. Choosing the engine does not commit the game to every expensive feature; disabling them, however, changes the reason to prefer it over a lighter route.

## Rendering and special effects

**Nanite** manages detailed geometry using a specialized representation and streaming. The inspected 5.8 documentation includes skeletal-mesh support; describing it as categorically static-only is outdated. Material and deformation restrictions still matter: opaque/masked support is not unrestricted transparency, and not every animation/deformation path is supported. Its geometry efficiency is not a simulation, crowd-AI or memory-history speedup. [Nanite documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine).

**Lumen** supplies dynamic lighting/reflection capabilities with explicit quality/performance targets. Epic's documented timing budgets refer to those systems at specified settings, not complete game frame time. Dynamic geometry, overlapping instances, reflection quality and hardware choices affect the result. [Lumen performance guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-performance-guide-for-unreal-engine).

**Niagara** is a substantial authoring and execution system for visual effects. Its availability can reduce custom effect-tool development, but particle simulation, transparency and lighting still consume resources. [Niagara overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine).

These are meaningful advantages for an effects-rich embodied world. They are less decisive if Open Legend deliberately chooses modest stylized geometry, bounded lighting and a camera distant from individual bodies. A server-created fire still needs a mapping to an approved visual effect, consistent visibility and bounded client cost; the effect graph does not authorize damage or resource consumption.

## Large worlds, physics and gameplay

[World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine) organizes and streams world content. It does not automatically partition Open Legend's authoritative simulation across machines or make persistent social history scale. Content streaming and distributed world authority are different capabilities.

Unreal is attractive when much of the desired movement, animation and physical interaction can use its engine-native systems coherently. Keeping Rapier/Recast authority on the existing server while also enabling authoritative Unreal physics would require a carefully defined boundary. Two independent systems deciding where a body can stand is a correctness risk, not a shortcut.

For a mostly presentational client, Unreal would render permitted positions, interpolate movement and send intentions. Its most integrated multiplayer movement benefits would require additional work to use with the existing server. The team should not budget a thin-client port as though it also delivers a new responsive direct-control combat model.

## Networking

The [Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine) is a useful tool for controlling which engine actors are considered for each connection. It is not an adapter for the current Open Legend JSON/SSE protocol. Engine-aware relevance and prediction are strongest when server and client are built around the corresponding engine model.

A hybrid arrangement is possible in principle: Unreal for selected physical/action authority, existing services for persistent world rules and AI. That expands the integration problem and must define exactly which component can commit each effect. It is not the same scope as replacing graphics.

Native networking gives more protocol and platform options than a browser. Internet latency, packet loss, bandwidth and information security remain. Unseen characters and private thoughts must be withheld before transmission, rather than merely hidden by the renderer.

## Controllers and interaction

[Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) provides actions, contexts, modifiers and remapping mechanisms. It is a strong foundation for switching between movement, aiming, construction and menus. Advanced haptics and proprietary platform functions still require supported hardware, SDKs and an appropriate integration.

Open Legend's text-rich invention and conversation interfaces remain substantial design work. A native UI does not automatically solve selecting many nearby objects, entering natural language with a gamepad or preserving focus after asynchronous updates. A browser overlay or companion creator interface is a possible product design, not free transfer of the existing application.

## Runtime creation: editor power is not runtime parity

This is a particularly important qualification for Open Legend. Unreal normally prepares target-specific game content through [cooking](https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine). Newly generated objects must either use prepared supported components, be imported through a qualified runtime route, or be prepared by additional infrastructure.

[Interchange](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-assets-using-interchange-in-unreal-engine) can operate at runtime with appropriate setup. The documented Blueprint runtime-import workflow specifically does not support skeletal meshes or animation. This is a limitation of that documented route, not proof that no C++ or third-party solution can ever load them. It does mean that “Unreal imports the file in the editor” is insufficient evidence for live generated characters in a packaged game.

A candidate prototype must import a newly created asset after packaging, not smuggle it into the editor before the build. It must also handle shader/material preparation, bounded memory, failure, cancellation and removal. Static prepared content and arbitrary generated animated content should receive separate estimates.

## Browser and cloud routes

The first-party browser-facing route examined here is [Pixel Streaming](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine): a remote machine runs Unreal and streams rendered audio/video while receiving player input. The browser is not locally rendering the Unreal scene.

Streaming can put advanced graphics on a modest client, but moves GPU/encoding capacity to the operator and adds network sensitivity. Independent player views generally require additional rendering work even when simulation is shared. A shared stream watched by many spectators is not evidence that many independently controlled sessions are inexpensive.

Treat community browser ports as separate products requiring specific version, feature, maintenance and licensing qualification. Do not base a strategic engine choice on an unexamined claim that an experimental port equals the supported native renderer.

## Licensing and production economics

Unreal is source-available under proprietary terms, not a permissively licensed engine. Its [EULA](https://www.unrealengine.com/eula/unreal) restricts combinations that would impose incompatible licensing obligations; the current Open Legend AGPL policy is a serious integration question. Separate-process communication is a possible architecture to review, not automatic legal clearance.

Engine Tools distribution terms also deserve attention for a product that lets users create worlds. An ordinary in-game building interface should not automatically be classified as distributing the editor, but the actual shipped tools and incorporated components need review. Royalty obligations, marketplace assets and third-party plugins are distinct from contributor rights. See [licensing and cost](../licensing-and-cost.md).

The editor's capabilities can save substantial production effort. They also bring build/cooking infrastructure, asset pipelines and specialized expertise. AI-assisted C++ writing does not eliminate editor inspection, animation debugging, performance captures or packaged-platform testing.

## When Unreal wins—and when it does not

Choose Unreal when high-end presentation and engine-native action/animation systems are central enough that using them is cheaper and more reliable than building substitutes. It is especially credible for a deliberate shift toward close-up action, sophisticated cinematic characters and rich native environments.

Its case is weaker when the distinguishing work is server-side authored rules, text-rich creation and persistent character consequences; when runtime-import flexibility matters more than prepared art pipelines; or when an open-source client distribution policy is non-negotiable. None of these means Unreal cannot implement the game. They change the total cost and integration risk.

**Research judgment:** keep Unreal as the high-fidelity specialist, not the automatic default for “more performance.” It should win a product-specific trial, not a screenshot contest. Evidence that would change this assessment includes a required scene that its integrated systems handle substantially better, and a successful packaged live-creation journey with a legally workable distribution model. Those tests have not been performed here.
