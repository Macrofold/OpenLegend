# Maintainer work index

This page is the master navigation index for active implementation work.

- [Remaining foundational work](remaining-foundational-work.md) — ranked gaps, branch coverage and accepted-decision delivery map.
- [Priorities 1–5 implementation and design package](../projects/foundations-1-5.md) — five paired feature/technical specifications, source baseline, cross-project sequence and links to 46 completed implementation/qualification slices, measured limits and branch migration seams.
- [Multiplayer authority and operations](multiplayer.md) — control, private projections, special player permissions, maintenance and absence integration.

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
| Agent agency and persistent pursuit                                    | [Agent agency](agent-agency.md)                                       | [Behavior](../agent-agency.md) and [runtime contract](../../archive/07-technical-architecture/agent-agency-runtime.md)                                                                                                                                         |
| Parameterized action grounding and native activities (AG05 subtracker) | [Action capabilities](action-capabilities.md)                         | [Capability contract](../action-capabilities.md); INV/AG/SW/EPR retain their existing ownership                                                                                                                                                                |
| Narration and conversations                                            | [Narration and conversations](narration-and-conversations.md)         | [Narration, agent responses and conversations](../narration-and-conversations.md)                                                                                                                                                                              |
| Inventions, declarations, conjuring and world evolution                | [Inventions and world evolution](inventions-and-world-evolution.md)   | [Declarations and evolution](../../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                                                                                            |
| Production data, persistence and scale                                 | [Production data](production-data.md)                                 | [Production data model](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md) and [delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md) |
| Persistent objects and containment (DF01 / BW07 child)                 | [Persistent objects](persistent-objects.md)                           | Approved [feature specification](../projects/persistent-objects-feature-spec.md) and [technical design](../projects/persistent-objects-tech-design.md); current data/action/INV owners remain controlling                                                      |

- [Base-world delivery](base-world.md) — bundled content boundary, God item creation, ground piles and action-foundation integration.

- [Agent-guidance delivery](agent-guidance.md) — development instructions, tooling and cross-agent verification; [system guide](../../.agents/README.md).

## Supporting references

- [Policies to revisit](revisitable-policies.md) — accepted but changeable decisions, canonical owners and review triggers; not an implementation backlog.
- [Extensibility roadmap](../extensibility-roadmap.md)
- [Extensible-world worked examples](../extensible-world-examples.md)
- [Action and interaction repertoire](../repertoires/actions.md) — stable example IDs and related-mechanic references; idea catalogue, not implementation status

- [Product baseline](../../archive/01-requirements/product-baseline.md)
- [Product roadmap](../../archive/05-project/roadmap.md)
- [Open decisions](../../archive/05-project/open-decisions.md)
- [Research backlog](../../archive/05-project/research-backlog.md)
- [Verification](../verification.md)
- [Implementation status](../../archive/05-project/implementation-status.md)
- [World-agent Macrofold handoff](../macrofold-world-agent-handoff.md)
- [Runtime-art design owner](../../archive/03-design-proposals/procedural-art-and-animation.md)
- [Documentation changelog](../documentation-changelog.md)

This file is navigation only. Task state belongs in focused trackers, current subsystem status in implementation status, verification evidence in verification, open choices in open decisions, and history in the documentation changelog.

Editable knowledge is tracked in [CR13](cognition-redesign.md#cr13--editable-knowledge-documents); bundled naming and recognition in [BW08–BW09](base-world.md).
