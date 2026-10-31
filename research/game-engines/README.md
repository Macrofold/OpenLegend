# Game engine and platform research

| Research status                                                 | Progress                                                                                                              | Last updated |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| Browser comparison selected; no migration or comparative result | Routes the shared PlayCanvas/Three.js design while retaining playable-first delivery and conditional native research. | 2026-10-31   |

## Start here

Read the [Open Legend assessment](open-legend-assessment.md) for the recommendation and strongest counterarguments. The immediate delivery owner is the [first-player milestone](../../docs/maintainers/first-player-milestone.md): finish and observe one worthwhile browser session and measure its actual performance and cost. Native-engine work is conditional, not the next mandatory project.

The selected [shared presentation feature](../../docs/projects/renderer-comparison-feature-spec.md), [technical design](../../docs/projects/renderer-comparison-tech-design.md) and [RCP tracker](../../docs/maintainers/renderer-comparison.md) now own a bounded PlayCanvas/Three.js browser comparison, developer switching and fair presentation measurements. PlayCanvas remains the default. The design is not a delivered second backend, a migration decision or evidence of a winner; it does not make complete dual-engine support a prerequisite for playable development.

The [Godot community and AI-development review](godot-community-and-ai-2026.md) separates adoption evidence, concrete agent/editor integrations, community policy and empirical research. It strengthens the case for evaluating production productivity when appropriate, without claiming that AI caused most adoption or that Godot has won a matched engine test.

Use the [comparison matrices](comparison-matrices.md) for route differences and the [benchmark plan](benchmark-plan.md) for comparison method and conditional broader trials. Godot is a leading policy-compatible native candidate; Unity/URP is the balanced proprietary alternative when rights are resolved; Unreal is strongest for specifically high-end embodied presentation. PlayCanvas is the browser baseline, Three is the selected comparison and Babylon remains an integrated-engine alternative. These are qualitative fit judgments, not capacity results.

## Engine dossiers

| Candidate                                       | Focus                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [PlayCanvas](engines/playcanvas.md)             | Browser game engine, current integration, modern GPU path and custom-production burden                          |
| [Babylon.js](engines/babylonjs.md)              | Direct browser challenger, graphics/tooling and separately qualified Native preview                             |
| [Three.js](engines/threejs.md)                  | Selected browser comparison, shared presentation and the native integration the team would own                  |
| [Unity](engines/unity.md)                       | Native URP/HDRP, data-oriented execution and materially different current web support                           |
| [Unreal](engines/unreal.md)                     | High-end native systems, runtime content, authority integration and streaming                                   |
| [Godot](engines/godot.md)                       | Open native route, renderer choices, runtime assets, AI-production opportunities and web/console qualifications |
| [Other candidates](engines/other-candidates.md) | Bevy, O3DE, Stride, Flax, Defold, Phaser, managed platforms and custom engines                                  |

Each main dossier addresses performance/hardware, rendering/effects, gameplay/networking, controllers/interface, live content, production/platform costs, best uses and reasons not to choose it. Engine capability is distinguished from implemented Open Legend behavior.

## Cross-cutting research

| Topic                                                                | What it answers                                                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Performance and hardware](performance-and-hardware.md)              | Stored/active/visible populations; CPU/GPU/memory/threading; frame time and hardware tiers                                         |
| [Controllers and networking](controllers-and-networking.md)          | Gamepad versus complete controller support, haptics, transports, prediction, privacy and cross-play                                |
| [Platforms and deployment](platforms-and-deployment.md)              | Browser, native desktop/mobile, wrappers, consoles, handhelds, XR, cloud streaming and server placement                            |
| [Dynamic worlds and production](dynamic-worlds-and-production.md)    | Live invention, runtime assets, changing geometry, animation, AI-assisted development and toolchain ownership                      |
| [Godot community and AI development](godot-community-and-ai-2026.md) | Dated adoption signals, five integrations, developer/maintainer perspectives, research benchmarks and fair productivity comparison |
| [Licensing and cost](licensing-and-cost.md)                          | AGPL constraints, proprietary integrations, current fees, platform rights and total future cost                                    |
| [Sources and maintenance](sources-and-maintenance.md)                | Evidence standards, version-sensitive findings, primary references and refresh triggers                                            |

## Scope and evidence boundary

The original collection responded to Mike's request for an unbiased engine/platform assessment, with performance as the main emphasis. The October 17 follow-up reconciled next-work priorities and expanded Godot research. The October 31 integration selects the shared browser-comparison design against repository baseline `7e95b415f18cc58828eacbddc88da8a86693c3d0`; the [technical design](../../docs/projects/renderer-comparison-tech-design.md#12-engine-capabilities-and-ecosystem-decisions) owns the focused GPU/ecosystem source review. These documentation changes supply no runtime code, dependencies, licensing or world rules, measured FPS, population capacity or port durations.

Original repository observations used GitHub `Macrofold/OpenLegend`, `refs/heads/main` at `02faa5f82ecd9357ad4b7c775ed29aab7a346da4`. The seven original research commits were replayed without changing their content onto GitHub `main` at `0eb7358f251d1ab706592ccb6e9829e98c729fe9`. Those revisions and the original `research/game-engine-tradeoffs` branch are research provenance, not the current implementation baseline or a claim about Mike's local `main`.

The [architecture](../../docs/architecture.md), [performance contract](../../docs/performance.md), [gameplay priorities](../../docs/repertoires/gameplay-priorities.md), [platform decision](../../docs/projects/completed/platform-and-offline-decision-brief.md) and [licensing guide](../../LICENSING.md) remain canonical. Research recommendations are not separate implementation authorization.

Official documentation establishes supported mechanisms, not comparative performance. Quantities are labeled as reported evidence, illustrative arithmetic or proposed targets. Public papers are author-reported research, not reproduced results. Console information is public only. Current engine/package/platform terms need review for the combination actually selected.

## Corrections and evolution

The original research corrected outdated blanket claims about browser threading/resolution, Unity 6.6 web facilities, Godot Compatibility effects, Nanite skeletal support and the cancelled Unity Runtime Fee. Sources and qualifications remain in the dossiers.

The October 17 review also corrects the recommendation's sequence: a native trial is not automatically next. It distinguishes Godot adoption from AI-caused adoption, third-party tool claims from tested capability, upstream contribution rules from using AI in one's own game, and development productivity from runtime performance. These distinctions are part of the assessment rather than reasons to dismiss either browser or native development.

## Verification limits

The original change was confined to 18 new research Markdown files; the October 17 follow-up added the Godot community chapter. The current browser-comparison integration updates research routing and selected design owners. No engine or AI-editor tool was installed or tested for these documentation tasks, no game/provider run occurred, and no legal or console qualification is claimed.

The original pinned Prettier check could not run because the formatter was unavailable and package retrieval failed. Do not interpret that historical limitation or this documentation review as a passing formatter/CI result. Content, source scope, relative links, preservation of existing requirements and the final affected diff require review before handoff; runtime testing is not implied by documentation-only changes.
