# Maintainer work index

This page is the master navigation index for active implementation work.

## Focused work

| Area                                                                   | Tracker                                                             | Design owner                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance / cross-cutting deferred validation                        | [TODO](TODO.md)                                                     | Relevant canonical specifications                                                                                                                                                                                                                              |
| Limits audit — blocked until data foundation completion                | [Limits audit](limits-audit.md)                                     | [Production-data completion gate](production-data.md#current-delivery-boundary); relevant subsystem specifications                                                                                                                                             |
| Runtime performance and responsiveness                                 | [Performance](performance.md)                                       | [Runtime performance design](../performance.md)                                                                                                                                                                                                                |
| Spatial world, navigation and tactical camera                          | [Spatial world](spatial-world.md)                                   | [Behavior](../spatial-world.md) and [runtime](../../archive/07-technical-architecture/spatial-world-runtime.md)                                                                                                                                                |
| Gameplay save/load                                                     | [Save/load](save-and-load.md)                                       | [Save/load design](../save-and-load.md)                                                                                                                                                                                                                        |
| Extensible world foundation                                            | [World foundation](extensible-world-foundation.md)                  | [Engine/world boundaries](../engine-and-world-boundaries.md) and [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md)                                                                                                       |
| Living actors                                                          | [Actor model](actor-model.md)                                       | [Architecture](../architecture.md#actor-means-any-living-being) and [agents/social simulation](../../archive/03-design-proposals/agents-and-social-simulation.md)                                                                                              |
| Memory and cognition                                                   | [Cognition redesign](cognition-redesign.md)                         | [Memory architecture](../memory-architecture.md)                                                                                                                                                                                                               |
| Events, perception, and reaction intake (proposed)                     | [Events and reactions](events-perception-and-reactions.md)          | [Proposed stimulus and reaction contract](../events-perception-and-reactions.md)                                                                                                                                                                               |
| Agent agency and persistent pursuit                                    | [Agent agency](agent-agency.md)                                     | [Behavior](../agent-agency.md) and [runtime contract](../../archive/07-technical-architecture/agent-agency-runtime.md)                                                                                                                                         |
| Parameterized action grounding and native activities (AG05 subtracker) | [Action capabilities](action-capabilities.md)                       | [Capability contract](../action-capabilities.md); INV/AG/SW/EPR retain their existing ownership                                                                                                                                                                |
| Narration and conversations                                            | [Narration and conversations](narration-and-conversations.md)       | [Narration, agent responses and conversations](../narration-and-conversations.md)                                                                                                                                                                              |
| Inventions, declarations, conjuring and world evolution                | [Inventions and world evolution](inventions-and-world-evolution.md) | [Invention foundation and ownership map](../invention-foundation.md) and [Declarations and evolution](../../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                                                                                            |
| Production data, persistence and scale                                 | [Production data](production-data.md)                               | [Production data model](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md) and [delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md) |

- [Base-world delivery](base-world.md) — bundled content boundary, God item creation, ground piles and action-foundation integration.

- [Agent-guidance delivery](agent-guidance.md) — development instructions, tooling and cross-agent verification; [system guide](../../.agents/README.md).

## Invention foundation packet

Begin with [Invention foundation](../invention-foundation.md) for coordination and canonical ownership. Supporting specifications are [World constitution](../world-constitution.md), [Validation and compositional evidence](../invention-validation.md), [Runtime art pipeline](../invention-art-pipeline.md), and [Budgets and runtime cost](../invention-budgets.md). Their detailed tasks remain in the single INV tracker, including INV-9–INV-14; this index does not duplicate task bodies or status.

## Supporting references

- [Policies to revisit](revisitable-policies.md) — accepted but changeable decisions, canonical owners and review triggers; not an implementation backlog.

- [Unified World Agent](../world-agent-runtime.md) and [MCP integration](../world-agent-mcp.md)
- [Relationship graph](../invention-graph.md), [composition](../invention-composition.md), and [target scenarios](../invention-scenarios.md)
- [Encounter scaling](../encounter-scaling.md) and [MCP tooling research](../../archive/02-research/mcp-tooling-and-integration.md)

- [World-agent invention tool contract](../invention-workshop-tools.md) — scoped read/preview/Apply and extension seams

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
- [Hybrid art methods](../../archive/03-design-proposals/procedural-art-and-animation.md)
- [Documentation changelog](../documentation-changelog.md)

This file is navigation only. Task state belongs in focused trackers, current subsystem status in implementation status, verification evidence in verification, open choices in open decisions, and history in the documentation changelog.

Editable knowledge is tracked in [CR13](cognition-redesign.md#cr13--editable-knowledge-documents); bundled naming and recognition in [BW08–BW09](base-world.md).
