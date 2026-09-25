# Technical design index

Current implemented architecture is defined in [docs/architecture.md](../../docs/architecture.md). Implementation work is indexed in [docs/maintainers/README.md](../../docs/maintainers/README.md), and structural history belongs to the [documentation changelog](../../docs/documentation-changelog.md).

| Design owner | Scope |
|---|---|
| [Spatial world](spatial-world-runtime.md) | Coordinates, physical geometry, navigation, camera and renderer boundary |
| [World-module runtime](world-module-runtime.md) | Shared host binding, installed composition and subsystem integration |
| [Context and inference](context-and-inference.md) | Scoped context assembly, routing and execution boundaries |
| [Agent agency runtime](agent-agency-runtime.md) | Decision encoding, operational goals/plans, admission and continuation; [behavior owner](../../docs/agent-agency.md) |
| [Declarations and evolution](declarations-and-evolution.md) | Declarative mechanisms, admission, activation and evolution |
| [Production data model](production-data-model.md) | Canonical production records, identity and transaction invariants |
| [Data queries and MCP](data-queries-and-mcp.md) | Bounded query contracts and future scoped tool access |
| [Data delivery and scale](data-delivery-and-scale.md) | Migration, retention, recovery, deployment and scale design |
| [Realtime synchronization](realtime-synchronization.md) | Future shared-world command, replication and reconnect model |
| [Perception and attention](perception-and-attention.md) | Sensory propagation, detail tiers and evidence using the spatial query boundary |
| [Billing and usage reporting](billing-and-usage-reporting.md) | Scoped provider usage and reporting contract |
| [Macrofold implementation brief](macrofold-implementation-brief.md) | Downstream execution-service requirements |

Supporting context: [extensibility roadmap](../../docs/extensibility-roadmap.md) and [worked examples](../../docs/extensible-world-examples.md).

## Scaling research and implementation follow-through

[Preparing for massive scale](../02-research/massive-scale/README.md) provides a pinned repository audit, annotated papers and MMO case studies, workload arithmetic and staged guidance. Existing design owners and D0–D6 retain contracts and acceptance; research is not implemented architecture.

[Feature integration](../../docs/scaling/feature-integration.md) maps the findings into identity, data, native time, spatial work, memory, agency, inventions, conversations, rendering/media and operations. [Sequencing](../../docs/scaling/sequence-and-gates.md) distinguishes early seams from growing-world/public-release gates and conditional distribution. [Research coverage](../../docs/scaling/research-coverage.md) maps every dossier chapter to one canonical work owner.

[Current-code readiness](../../docs/scaling/README.md) retains SCA01–SCA52. [SC01–SC16](../../docs/maintainers/scaling.md) now have specific staged children; [SF01–SF18](../../docs/maintainers/scaling-feature-readiness.md) decompose feature/release evidence; D1/D2 records and PF measurements remain in their existing trackers. The [long-term backlog](../../docs/maintainers/scaling-long-term/README.md) separately owns deferred region, memory, simulation and operations tasks, so a future vendor/solver experiment is not mistaken for immediate work.

Consult [mechanic growth](../../docs/scaling/mechanic-growth.md) before expanding libraries, selectors, effects, bodies or mutable geometry. The accepted target prioritizes a region-divided shared world; older independent-world-first research is an alternative, not the product sequence. Preserve source/permission, native fidelity and resource invariants throughout. None of these planning links establishes runtime or capacity evidence.
