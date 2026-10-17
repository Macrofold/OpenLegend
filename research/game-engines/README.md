# Game engine and platform research

| Research status | Progress | Last updated |
| --- | --- | --- |
| Desk research updated; no migration or comparative benchmark completed | Reconciles browser-first delivery and adds a deep Godot adoption, community and AI-development review. | 2026-10-17 |

## Start here

Read the [Open Legend assessment](open-legend-assessment.md) for the recommendation and strongest counterarguments. The immediate delivery owner is the [first-player milestone](../../docs/maintainers/first-player-milestone.md): finish and observe one worthwhile browser session and measure its actual performance and cost. Native-engine work is conditional, not the next mandatory project.

The new [Godot community and AI-development review](godot-community-and-ai-2026.md) separates adoption evidence, concrete agent/editor integrations, community policy and empirical research. It strengthens the case for evaluating production productivity when appropriate, without claiming that AI caused most adoption or that Godot has won a matched engine test.

Use the [comparison matrices](comparison-matrices.md) for route differences and the [benchmark plan](benchmark-plan.md) for a conditional comparison. Godot is a leading policy-compatible native candidate; Unity/URP is the balanced proprietary alternative when rights are resolved; Unreal is strongest for specifically high-end embodied presentation. PlayCanvas/Babylon remain credible browser choices. These are qualitative fit judgments, not capacity results.

## Engine dossiers

| Candidate | Focus |
| --- | --- |
| [PlayCanvas](engines/playcanvas.md) | Browser game engine, current integration, modern GPU path and custom-production burden |
| [Babylon.js](engines/babylonjs.md) | Direct browser challenger, graphics/tooling and separately qualified Native preview |
| [Three.js](engines/threejs.md) | Custom rendering-library architecture and the systems the team would need to own |
| [Unity](engines/unity.md) | Native URP/HDRP, data-oriented execution and materially different current web support |
| [Unreal](engines/unreal.md) | High-end native systems, runtime content, authority integration and streaming |
| [Godot](engines/godot.md) | Open native route, renderer choices, runtime assets, AI-production opportunities and web/console qualifications |
| [Other candidates](engines/other-candidates.md) | Bevy, O3DE, Stride, Flax, Defold, Phaser, managed platforms and custom engines |

Each main dossier addresses performance/hardware, rendering/effects, gameplay/networking, controllers/interface, live content, production/platform costs, best uses and reasons not to choose it. Engine capability is distinguished from implemented Open Legend behavior.

## Cross-cutting research

| Topic | What it answers |
| --- | --- |
| [Performance and hardware](performance-and-hardware.md) | Stored/active/visible populations; CPU/GPU/memory/threading; frame time and hardware tiers |
| [Controllers and networking](controllers-and-networking.md) | Gamepad versus complete controller support, haptics, transports, prediction, privacy and cross-play |
| [Platforms and deployment](platforms-and-deployment.md) | Browser, native desktop/mobile, wrappers, consoles, handhelds, XR, cloud streaming and server placement |
| [Dynamic worlds and production](dynamic-worlds-and-production.md) | Live invention, runtime assets, changing geometry, animation, AI-assisted development and toolchain ownership |
| [Godot community and AI development](godot-community-and-ai-2026.md) | Dated adoption signals, five integrations, developer/maintainer perspectives, research benchmarks and fair productivity comparison |
| [Licensing and cost](licensing-and-cost.md) | AGPL constraints, proprietary integrations, current fees, platform rights and total future cost |
| [Sources and maintenance](sources-and-maintenance.md) | Evidence standards, version-sensitive findings, primary references and refresh triggers |

## Scope and evidence boundary

The original collection responded to Mike's request for an unbiased engine/platform assessment, with performance as the main emphasis. The October 17 follow-up reconciles next-work priorities and expands Godot research. It changes no runtime code, dependencies, licensing or world rules, and does not establish measured FPS, population capacity or port durations.

Original repository observations used GitHub `Macrofold/OpenLegend`, `refs/heads/main` at `02faa5f82ecd9357ad4b7c775ed29aab7a346da4`. The seven research commits were replayed without changing their content onto GitHub `main` at `0eb7358f251d1ab706592ccb6e9829e98c729fe9` before this follow-up. Work remains on `research/game-engine-tradeoffs`; no local checkout or worktree was created or modified. This is not a claim about Mike's local `main`.

The [architecture](../../docs/architecture.md), [performance contract](../../docs/performance.md), [gameplay priorities](../../docs/repertoires/gameplay-priorities.md), [platform decision](../../docs/projects/completed/platform-and-offline-decision-brief.md) and [licensing guide](../../LICENSING.md) remain canonical. Research recommendations are not separate implementation authorization.

Official documentation establishes supported mechanisms, not comparative performance. Quantities are labeled as reported evidence, illustrative arithmetic or proposed targets. Public papers are author-reported research, not reproduced results. Console information is public only. Current engine/package/platform terms need review for the combination actually selected.

## Corrections and evolution

The original research corrected outdated blanket claims about browser threading/resolution, Unity 6.6 web facilities, Godot Compatibility effects, Nanite skeletal support and the cancelled Unity Runtime Fee. Sources and qualifications remain in the dossiers.

The October 17 review also corrects the recommendation's sequence: a native trial is not automatically next. It distinguishes Godot adoption from AI-caused adoption, third-party tool claims from tested capability, upstream contribution rules from using AI in one's own game, and development productivity from runtime performance. These distinctions are part of the assessment rather than reasons to dismiss either browser or native development.

## Verification limits

The original change was confined to 18 new research Markdown files. This follow-up adds the Godot community chapter and reconciles selected planning/research owners; actual delivery is distinguishable in the branch diff. No engine or AI-editor tool was installed or tested, no game/provider run occurred, and no legal or console qualification is claimed.

The original pinned Prettier check could not run because the formatter was unavailable and package retrieval failed. Do not interpret that historical limitation or this documentation review as a passing formatter/CI result. Content, source scope, relative links, preservation of existing requirements and the final affected diff require review before handoff; runtime testing is not implied by documentation-only changes.
