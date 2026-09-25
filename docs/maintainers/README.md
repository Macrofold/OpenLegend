# Maintainer work index

This page is the master navigation index for implementation work. Task state lives in the focused owners, not this page.

## Focused work

| Area | Tracker | Design owner |
|---|---|---|
| Maintenance / cross-cutting deferred validation | [TODO](TODO.md) | Relevant canonical specifications |
| Runtime performance and responsiveness | [Performance](performance.md) | [Runtime performance design](../performance.md) |
| Current-code scaling remediation | [SC01–SC16 and specific children](scaling.md) | [Audit and integration](../scaling/README.md); existing D/PF/EPR/SW/CR/INV/EWF/SL parents |
| Cross-feature research and release evidence | [SF01–SF18](scaling-feature-readiness.md) | [Feature integration](../scaling/feature-integration.md); existing feature and D5/PF gates |
| Spatial world, navigation and tactical camera | [Spatial world](spatial-world.md) | [Behavior](../spatial-world.md) and [runtime](../../archive/07-technical-architecture/spatial-world-runtime.md) |
| Gameplay save/load | [Save/load](save-and-load.md) | [Save/load design](../save-and-load.md) |
| Extensible world foundation | [World foundation](extensible-world-foundation.md) | [Engine/world boundaries](../engine-and-world-boundaries.md) and [world-module runtime](../../archive/07-technical-architecture/world-module-runtime.md) |
| Living actors | [Actor model](actor-model.md) | [Architecture](../architecture.md#actor-means-any-living-being) and [agents/social simulation](../../archive/03-design-proposals/agents-and-social-simulation.md) |
| Memory and cognition | [Cognition redesign](cognition-redesign.md) | [Memory architecture](../memory-architecture.md) |
| Events, perception and reaction intake | [Events and reactions](events-perception-and-reactions.md) | [Stimulus and reaction contract](../events-perception-and-reactions.md) |
| Agent agency and persistent pursuit | [Agent agency](agent-agency.md) | [Behavior](../agent-agency.md) and [runtime](../../archive/07-technical-architecture/agent-agency-runtime.md) |
| Parameterized action grounding and native activities (AG05 subtracker) | [Action capabilities](action-capabilities.md) | [Capability contract](../action-capabilities.md); INV/AG/SW/EPR retain existing ownership |
| Narration and conversations | [Narration and conversations](narration-and-conversations.md) | [Narration, responses and conversations](../narration-and-conversations.md) |
| Inventions, declarations, conjuring and evolution | [Inventions and world evolution](inventions-and-world-evolution.md) | [Declarations and evolution](../../archive/07-technical-architecture/declarations-and-evolution.md) |
| Production data, persistence and scale | [D0–D6 and record/query children](production-data.md) | [Records](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md), [delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md) |

[Base-world delivery](base-world.md) covers bundled content, God item creation, ground piles and action-foundation integration. [Agent-guidance delivery](agent-guidance.md) owns development instructions, tooling and cross-agent verification; see the [system guide](../../.agents/README.md).

## Research-derived sequencing

Read [G0–G4 sequencing](../scaling/sequence-and-gates.md) before selecting scale work. SC work splits contracts from their later runtime delivery; SF work attaches measurement and release evidence to actual product milestones. Each new or clarified item is marked **Massive-scale research** with a specific source. [Research coverage](../scaling/research-coverage.md) maps all dossier chapters and the current audit to canonical owners without duplicate status.

The SC tracker maps current-code findings and owns its child details. Consult it for control, persistence/recovery, queues, cognition/indexing, invention admission, active queries and saves. Existing PF/EPR/SW/CR/AG/INV/EWF/SL/D tasks retain their IDs and acceptance. A new scale criterion does not unimplement an already delivered local feature.

## Long-term work — explicitly deferred

[Long-term scaling backlog](scaling-long-term/README.md) is separate from the near-term queue: [regional ownership](scaling-long-term/regions.md), [large memory/storage](scaling-long-term/memory-storage.md), [advanced simulation/fidelity](scaling-long-term/simulation.md), and [fleet/geography/inference operations](scaling-long-term/operations.md).

Promote only when the named product need or measured bottleneck, semantic decisions, dependencies and implementation authorization are present. Keep the task body/ID in its original owner and link it into current scheduling; do not copy it. Earlier identity/source/query seams still belong in G0/G1. Voice/assets/economy are gated by their P3/P4/P5 feature, not automatically deferred until massive distributed scale.

## Supporting references

- [Policies to revisit](revisitable-policies.md) — accepted decisions and review triggers, not implementation state.
- [Extensibility roadmap](../extensibility-roadmap.md) and [worked examples](../extensible-world-examples.md).
- [Action and interaction repertoire](../repertoires/actions.md) — stable example IDs and mechanic references, not implementation status.
- [Current-code scaling audit](../scaling/current-code-audit.md) and [mechanic growth](../scaling/mechanic-growth.md).
- [Product baseline](../../archive/01-requirements/product-baseline.md), [product roadmap](../../archive/05-project/roadmap.md), [open decisions](../../archive/05-project/open-decisions.md) and [research backlog](../../archive/05-project/research-backlog.md).
- [Verification](../verification.md), [implementation status](../../archive/05-project/implementation-status.md), [Macrofold handoff](../macrofold-world-agent-handoff.md), [runtime-art design](../../archive/03-design-proposals/procedural-art-and-animation.md) and [documentation changelog](../documentation-changelog.md).

This file is navigation only. Specifications own behavior, focused maintainers own task state, Verification owns executed evidence and the changelog owns history. Editable knowledge remains in [CR13](cognition-redesign.md#cr13--editable-knowledge-documents); bundled naming/recognition in [BW08–BW09](base-world.md).
