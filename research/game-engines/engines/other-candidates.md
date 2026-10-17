# Other relevant engines and custom routes

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed initial screening | Screens credible alternatives proportionally and states what would justify a deeper trial. | 2026-10-15 |

## Scope and method

The six detailed dossiers cover the strongest directly relevant browser and integrated native choices. This chapter broadens the search without pretending to benchmark every engine ever released. A candidate is not rejected merely because it is less familiar; it is promoted when it offers a concrete advantage for Open Legend's required experience, distribution policy or production workflow.

These are initial screens, not exhaustive security, license or platform audits. No performance ranking follows from a marketing phrase such as high performance, lightweight or AAA-ready.

## Bevy: code-first, data-oriented native development

[Bevy](https://bevy.org/learn/quick-start/getting-started/) is a Rust-based game-engine route organized around code and an entity/component architecture. It is relevant when the team deliberately values data-oriented execution and control over the client architecture. Rust's memory model and native compilation provide useful tools, not automatic whole-game speedups.

**Potential advantage:** a clean custom representation for many entities, explicit system organization and an open development model. It deserves attention if client CPU architecture becomes the decisive problem.

**Main burden:** qualify the exact release's editor/content workflow, animation, UI, networking, asset loading and target-platform support. Do not assume the productivity of an integrated commercial editor, or assume every missing production facility is trivial to assemble. Browser export, where used, remains a separate backend and compatibility target.

**Decision:** not the default here because Open Legend needs an integrated playable production workflow as well as efficient data processing. Promote it if a bounded prototype demonstrates a compelling performance/maintenance advantage and the team consciously accepts a code-first toolchain. This is not a claim that Bevy cannot make sophisticated games.

## O3DE: open, modular, high-fidelity engine

[O3DE's feature overview](https://docs.o3de.org/docs/welcome-guide/features-intro/) describes a modular engine with rendering, asset processing, physics, animation and cinematics. [Atom](https://docs.o3de.org/docs/atom-guide/) is its rendering system. This is a serious open-engine alternative when high-end native systems and source control over the engine matter.

**Potential advantage:** a broad native engine foundation rather than assembling every subsystem from libraries.

**Main burden:** evaluate build/toolchain requirements, the exact supported target platforms, runtime-generated content and the effort needed to make the workflow productive. A broad feature set does not establish a low base cost or a good fit for a small fast-moving team. Public [setup information](https://o3de.org/download/) illustrates that the development environment itself needs qualification.

**Decision:** a credible reserve candidate, especially if Godot lacks a required native feature and proprietary terms are unacceptable. It should enter the shortlist through a named requirement, not an assumption that a larger open engine must be better.

## Stride: an open C# alternative

[Stride](https://www.stride3d.net/) offers a C# game-engine route with an integrated editor. Its [feature overview](https://www.stride3d.net/features/) includes modern graphics APIs, animation, particles, scene streaming and UI tools. It is relevant when C# productivity and a more open engine arrangement are attractive together.

**Potential advantage:** a middle path between a custom C# rendering stack and a proprietary integrated engine.

**Main burden:** verify the precise deployment/support matrix, content-import workflow and required multiplayer/performance facilities. The existence of a feature does not establish equal polish or throughput to Unity, and the project's current workload has not been tested in Stride.

**Decision:** worth a targeted trial if C# is a strong team preference or it supplies a particular missing facility. It is not excluded on technical impossibility; the current evidence does not establish a decisive reason to prefer it over the primary native candidates.

## Flax: another proprietary native option

Flax is relevant as an integrated native alternative, but it is not a way to avoid proprietary-engine rights questions. Its [licensing page](https://flaxengine.com/licensing/) describes source access and a commercial royalty arrangement. Source availability should not be mislabeled permissive open source.

**Potential advantage:** an alternative native workflow that may fit particular team preferences or features.

**Main burden:** the same full examination of performance, runtime assets, platform support, ecosystem dependencies and AGPL compatibility is required. A lower headline royalty than another engine does not establish lower total cost.

**Decision:** reserve candidate. Promote it for an observed workflow or capability advantage, not just its pricing. This initial screen does not claim a full Flax feature audit.

## Defold: efficiency-oriented, especially compelling for narrower presentation

[Defold's product overview](https://defold.com/product/) describes cross-platform deployment and both 2D and 3D facilities. It should not be dismissed as literally incapable of 3D. Its smaller-footprint orientation can be valuable for tightly scoped games and broad device reach.

**Potential advantage:** a disciplined lightweight client where presentation requirements are deliberately bounded.

**Main burden:** the exact advanced 3D, character, authoring and live-content workflow must be tested. Its [source-available license](https://www.defold.com/license/) is not ordinary Apache-2.0 and requires its own compatibility analysis.

**Decision:** attractive if Open Legend deliberately settles on a simpler visual/client scope. Less compelling as the general answer to expanding high-detail 3D and native authoring ambitions without a concrete demonstrated fit.

## Phaser and 2D-specialist frameworks

[Phaser's official documentation](https://docs.phaser.io/) identifies it as a 2D game framework. That can be an excellent fit for a deliberately 2D client with a rich server-side simulation. It is not the natural replacement for the current true-3D spatial presentation when the goal is to expand that presentation.

The server could remain sophisticated regardless of the 2D view. The question is whether a 2D interface preserves the intended exploration, elevation, building and physical readability. Choosing a 2D specialist would be an art/interaction decision, not merely a performance optimization under unchanged requirements.

**Decision:** do not narrow the product to fit a simpler engine without an explicit owner choice. A separate lightweight map/observer interface could use a 2D framework without replacing the main client.

## Roblox-style managed creation platforms

Roblox provides its own client/server runtime and hosted project model. Its [client/server documentation](https://create.roblox.com/docs/projects/client-server) and [project model](https://create.roblox.com/docs/projects) show that adopting it is more than swapping a renderer: the experience is organized around the platform's runtime, assets and publishing workflow.

**Potential advantage:** integrated distribution, creation and platform services can remove substantial infrastructure work.

**Main burden:** platform dependence, product rules, content services and the fit with independently hosted authored worlds must be evaluated. Existing Open Legend authority and licensing goals cannot be assumed to transfer unchanged.

**Decision:** not recommended as the core engine route for the currently described independently controlled platform. A separately scoped demonstration or distribution experiment would be a different product decision. This is not a claim that managed platforms cannot host deep or performant games.

## Custom native renderer, WebGPU stack or library assembly

Building around lower-level graphics and window/input libraries offers maximum control over representation and overhead. It can be rational when the client has a genuinely unusual workload and the team has the expertise to maintain the missing systems.

The cost includes animation, scene/asset management, shader tooling, input/accessibility, platform packaging, debugging and long-term compatibility. The fact that Open Legend already has a custom simulation does not imply it should also build a custom graphics engine.

**Decision:** use custom native or WebAssembly computation for a measured narrow bottleneck before assuming a complete custom client engine is necessary. An isolated optimized subsystem can coexist with an existing renderer. A whole custom engine needs a much stronger economic and product case.

## Screening conclusion

The practical shortlist remains PlayCanvas/Babylon for browser-first delivery, Godot for a policy-compatible native trial, Unity for the balanced proprietary route, and Unreal for demanding high-end presentation. Three.js and the candidates above remain credible where a specific requirement favors them. The shortlist is based on fit and integration burden, not a claim that the other engines are categorically slower or incapable.
