# Maintainer work index

## Presentation and navigation delivery

[SW17–SW19](spatial-world.md) own the current Recast/capsule and visual delivery. [World presentation](../world-presentation.md) is the canonical visual specification. [TODO SR16–SR20](TODO.md#recast-and-presentation-regression-todos) contains the requested deferred automation; [verification](../verification/recast-integration.md) records executed application/stress observations only.

[Progressive 3D pixel art (V3D01–V3D12)](3d-pixel-art.md) tracks the proposed hybrid representation, modular appearance, and 2D-first/3D-later art pipeline beneath the existing SW/INV/PO owners. Start with the [feature specification](../projects/3d-pixel-art-feature-spec.md) and [technical design](../projects/3d-pixel-art-tech-design.md); [A3D](../limits/3d-pixel-art.md) contains proposed asset-work envelopes. This is a design package, not delivered runtime behavior or a replacement of the accepted art direction.

This page is the master navigation index for active implementation work.

- [Gameplay availability](../../archive/05-project/implementation-status.md#gameplay-availability) — current native/NPC support, player and creator surfaces, and linked next steps.
- [Remaining foundational work](remaining-foundational-work.md) — ranked gaps, branch coverage and accepted-decision delivery map.
- [Priorities 1–5 implementation and design package](../projects/foundations-1-5.md) — five paired feature/technical specifications, source baseline, cross-project sequence and links to 46 completed implementation/qualification slices, measured limits and branch migration seams.
- [Multiplayer authority and operations](multiplayer.md) — control, private projections, special player permissions, maintenance and absence integration.

## Elapsed simulation

[PF13 delivery](simulation-time.md) follows the [clock/integration contract](../simulation-time.md). The [boundary catalogue](simulation-boundaries.md) collects natural deadlines and conservative future bounds; [speech integration](speech-time-integration.md) coordinates the parallel sound branch. Neither is another task tracker or a completed universal scheduler.

## Focused work

[Macrofold Worker API cutover (MW01–MW04)](macrofold-worker-api.md) tracks the shared-compute caller migration, cancellation/state preservation and coordinated deployment gates.

| Area                                                                   | Tracker                                                               | Design owner                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance / cross-cutting deferred validation                        | [TODO](TODO.md)                                                       | Relevant canonical specifications                                                                                                                                                                                                                              |
| Limits and constraints — inventory and prioritized revisit work        | [Remove / Change / Expand](limits-audit.md)                           | [Feature inventories](../openlegend-limits-decisions.md); [tracking system](../limits/README.md)                                                                                                                                                               |
| Runtime performance and responsiveness                                 | [Performance](performance.md)                                         | [Runtime performance design](../performance.md)                                                                                                                                                                                                                |
| Spatial world, navigation and tactical camera                          | [Spatial world](spatial-world.md)                                     | [Behavior](../spatial-world.md) and [runtime](../../archive/07-technical-architecture/spatial-world-runtime.md)                                                                                                                                                |
| Gameplay save/load                                                     | [Save/load](save-and-load.md)                                         | [Save/load design](../save-and-load.md)                                                                                                                                                                                                                        |
| Extensible world foundation                                            | [World foundation](extensible-world-foundation.md)                    | [Engine/world boundaries](../engine-and-world-boundaries.md) and [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md)                                                                                                       |
| State contributions and resource claims (EWF02–03 / INV-6.3 child)     | [State contributions](state-contributions.md)                         | Approved [feature specification](../projects/shared-state-contributions-feature-spec.md) and [technical design](../projects/shared-state-contributions-tech-design.md); accepted EWF/INV owners remain controlling                                             |
| Dependency invalidation and aggregate work (EWF08 child)               | [Dependency invalidation](dependency-invalidation.md)                 | Approved [feature specification](../projects/dependency-invalidation-feature-spec.md) and [technical design](../projects/dependency-invalidation-tech-design.md); EPR/SW/PF retain subsystem delivery                                                          |
| Living actors                                                          | [Actor model](actor-model.md)                                         | [Architecture](../architecture.md#actor-means-any-living-being) and [agents/social simulation](../../archive/03-design-proposals/agents-and-social-simulation.md)                                                                                              |
| Persistent appraisal and directional social continuity (ACT07/ACT08)   | [ACT07/ACT08 slices](actor-model.md#priority-5-implementation-slices) | Approved [feature specification](../projects/appraisal-social-continuity-feature-spec.md) and [technical design](../projects/appraisal-social-continuity-tech-design.md); CR/EPR/SL keep their owners                                                          |
| Memory and cognition                                                   | [Cognition redesign](cognition-redesign.md)                           | [Memory architecture](../memory-architecture.md)                                                                                                                                                                                                               |
| Events, perception, and reaction intake (proposed)                     | [Events and reactions](events-perception-and-reactions.md)            | [Proposed stimulus and reaction contract](../events-perception-and-reactions.md)                                                                                                                                                                               |
| Hearing, spatial captions and perceived-event history                  | [Hearing delivery](hearing-and-speech.md)                             | [Hearing](../hearing-and-speech.md), [timed UI](../timed-ui.md), [World Events](../perceived-world-events.md)                                                                                                                                                  |
| Agent agency and persistent pursuit                                    | [Agent agency](agent-agency.md)                                       | [Behavior](../agent-agency.md) and [runtime contract](../../archive/07-technical-architecture/agent-agency-runtime.md)                                                                                                                                         |
| Parameterized action grounding and native activities (AG05 subtracker) | [Action capabilities](action-capabilities.md)                         | [Capability contract](../action-capabilities.md); INV/AG/SW/EPR retain their existing ownership                                                                                                                                                                |
| Narration and conversations                                            | [Narration and conversations](narration-and-conversations.md)         | [Narration, agent responses and conversations](../narration-and-conversations.md)                                                                                                                                                                              |
| Inventions, declarations, conjuring and world evolution                | [Inventions and world evolution](inventions-and-world-evolution.md)   | [Declarations and evolution](../../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                                                                                            |
| Production data, persistence and scale                                 | [Production data](production-data.md)                                 | [Production data model](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md) and [delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md) |
| Persistent objects and containment (DF01 / BW07 child)                 | [Persistent objects](persistent-objects.md)                           | Approved [feature specification](../projects/persistent-objects-feature-spec.md) and [technical design](../projects/persistent-objects-tech-design.md); current data/action/INV owners remain controlling                                                      |

- [Action branch reconciliation and recovery](action-reconciliation.md) — AR01–AR08 integration tasks, source checkpoints and recovery order beneath the existing AC/PF owners.
- [Base-world delivery](base-world.md) — bundled content boundary, God item creation, ground piles and action-foundation integration.
- [Embodied survival](../projects/embodied-survival-feature-spec.md) and [technical plan](../projects/embodied-survival-tech-design.md) — Ada's bodily observations, actor-chosen intentions, relevant inventory and equipped melee; implementation tracked by AG06/AG07/AG13, EPR04–EPR06, AC09.6 and BW18. Mechanics implemented; strict Jev-only hunting acceptance remains incomplete.

- [Agent-guidance delivery](agent-guidance.md) — development instructions, tooling and cross-agent verification; [system guide](../../.agents/README.md).

## Supporting references

- [Policies to revisit](revisitable-policies.md) — accepted but changeable decisions, canonical owners and review triggers; not an implementation backlog.
- [Extensibility roadmap](../extensibility-roadmap.md)
- [Extensible-world worked examples](../extensible-world-examples.md)
- [World and interaction repertoires](../repertoires/README.md) — idea catalogues, four optional world proposals and source coverage; [action examples](../repertoires/actions.md) retain stable IDs. These proposals do not change implementation status or close tracker criteria.

- [Mechanics repertoire](../repertoires/mechanics.md) — related concepts, reusable mechanisms and authored-world choices; ideas, not another backlog.
- [Social playable slices](base-world.md#social-playable-slices) — proposed family and promise UI; [ACT09](actor-model.md#act09--internal-feeling-process-authoring) covers conditional process authoring. Documentation only; runtime implementation is not authorized by these entries.

- [Product baseline](../../archive/01-requirements/product-baseline.md)
- [Product roadmap](../../archive/05-project/roadmap.md)
- [Open decisions](../../archive/05-project/open-decisions.md)
- [Research backlog](../../archive/05-project/research-backlog.md)
- [Verification index and shared playtest protocol](../verification.md) — topic reports retain actual results and limitations.
- [Implementation status](../../archive/05-project/implementation-status.md)
- [World-agent Macrofold handoff](../macrofold-world-agent-handoff.md)
- [Runtime-art design owner](../../archive/03-design-proposals/procedural-art-and-animation.md)
- [Documentation changelog](../documentation-changelog.md)

This file is navigation only. Task state belongs in focused trackers, current subsystem status in implementation status, verification evidence in the linked topic reports, open choices in open decisions, and history in the documentation changelog.

Editable knowledge is tracked in [CR13](cognition-redesign.md#cr13--editable-knowledge-documents); bundled naming and recognition in [BW08–BW09](base-world.md).
