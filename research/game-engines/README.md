# Game engine and platform research

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk-research collection | Provides engine dossiers, platform/performance analysis, an Open Legend recommendation and an unexecuted comparison plan. | 2026-10-15 |

## Start here

Read the [Open Legend assessment](open-legend-assessment.md) for the recommendation and its strongest counterarguments. Use the [comparison matrices](comparison-matrices.md) for a quick route-by-route view. The [benchmark plan](benchmark-plan.md) explains what evidence should precede a migration or a capacity promise.

**Research recommendation:** evaluate a native primary client rather than assuming the browser must remain permanent. Godot is the leading policy-compatible native candidate; Unity/URP is the balanced proprietary alternative when rights are resolved; Unreal leads when advanced embodied presentation is a central requirement. PlayCanvas/Babylon remain credible browser-first choices. This is not a benchmark result or an approved engine change.

## Engine dossiers

| Candidate | Focus |
| --- | --- |
| [PlayCanvas](engines/playcanvas.md) | Browser game engine, current integration, modern GPU path and custom-production burden |
| [Babylon.js](engines/babylonjs.md) | Direct browser challenger, graphics/tooling and separately qualified Native preview |
| [Three.js](engines/threejs.md) | Custom rendering-library architecture and the systems the team would need to own |
| [Unity](engines/unity.md) | Native URP/HDRP, data-oriented execution and materially different current web support |
| [Unreal](engines/unreal.md) | High-end native systems, runtime content, authority integration and streaming |
| [Godot](engines/godot.md) | Open native route, renderer choices, runtime assets and web/console qualifications |
| [Other candidates](engines/other-candidates.md) | Bevy, O3DE, Stride, Flax, Defold, Phaser, managed platforms and custom engines |

Each main dossier addresses performance/hardware, rendering/effects, gameplay/networking, controllers/interface, live content, production/platform costs, best uses and reasons not to choose it. Engine capability is distinguished from implemented Open Legend behavior.

## Cross-cutting research

| Topic | What it answers |
| --- | --- |
| [Performance and hardware](performance-and-hardware.md) | What stored/active/visible populations cost; CPU/GPU/memory/threading; frame time and hardware tiers |
| [Controllers and networking](controllers-and-networking.md) | Gamepad versus complete controller support, haptics, transports, prediction, privacy and cross-play |
| [Platforms and deployment](platforms-and-deployment.md) | Browser, native desktop/mobile, wrappers, consoles, handhelds, XR, cloud streaming and server placement |
| [Dynamic worlds and production](dynamic-worlds-and-production.md) | Live invention, runtime assets, changing geometry, animation, AI-assisted development and toolchain ownership |
| [Licensing and cost](licensing-and-cost.md) | AGPL constraints, proprietary integrations, current fees, platform rights and total future cost |
| [Sources and maintenance](sources-and-maintenance.md) | Evidence standards, version-sensitive findings, primary references and refresh triggers |

## Scope and evidence boundary

This collection responds to Mike's request for an unbiased engine/platform assessment, with performance as the main emphasis. It does not change runtime code, dependency versions, licensing, accepted world rules or the selected renderer. It does not report newly measured FPS, player counts, population capacity or engine-port estimates.

Repository observations were grounded in GitHub `Macrofold/OpenLegend`, `refs/heads/main` at **`02faa5f82ecd9357ad4b7c775ed29aab7a346da4`**. Research work is on **`research/game-engine-tradeoffs`**. No local checkout or worktree was created. The current [architecture](../../docs/architecture.md), [performance contract](../../docs/performance.md), [gameplay priorities](../../docs/repertoires/gameplay-priorities.md) and [licensing guide](../../LICENSING.md) remain the canonical owners of implemented behavior and accepted policy.

The evidence is primary-source desk research plus selected source inspection. Official feature documents establish supported mechanisms, not comparative performance. Hypothetical quantities and proposed targets are labeled. Console information is limited to public documentation. Detailed vendor conditions should be rechecked for the release and agreement actually selected.

## Important corrections to common or older claims

The browser is not inherently limited to one CPU thread or low-resolution 3D. Unity 6.6 documents parallel Burst jobs and a newer WebGPU support position than older Unity web advice. Current Godot Compatibility includes effects missing from some older comparisons, while its web target still differs substantially from native. Current Unreal Nanite includes skeletal support. The old Unity Runtime Fee is not a current charge. Sources and exact qualifications are in the linked dossiers.

These corrections do not imply every feature works everywhere or that a new backend automatically speeds up Open Legend. A fair decision still needs the required scene, hardware, controls, runtime-content path and legal arrangement to be tested together.

## Delivery review and tooling limits

The authored content was reviewed for source support, version-sensitive claims, consistent recommendations, distinction between hypothetical and measured quantities, and relative-link destinations. GitHub's comparison against the recorded base confirms that the change is confined to the 18 new Markdown research files; no existing game code or policy was changed.

The repository-pinned Prettier 3.6.2 check was not run: the formatter was not available in this environment, container network access failed, and attempts to obtain the pinned package through the available download path were blocked. Formatting qualification therefore remains unverified; no passing formatter or CI result is claimed. Game runtime tests were not run for this documentation-only change. Comparative engine, device, controller and legal qualification remain separate future work as described above.
