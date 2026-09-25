# Technical design index

Current implemented architecture is defined in [docs/architecture.md](../../docs/architecture.md). Active implementation work is indexed in [docs/maintainers/README.md](../../docs/maintainers/README.md), and structural history belongs to the [documentation changelog](../../docs/documentation-changelog.md).

| Design owner | Scope |
| --- | --- |
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

[Preparing for massive scale](../02-research/massive-scale/README.md) provides a pinned repository audit, annotated papers and MMO case studies, workload arithmetic, and NOW/SOON/LATER guidance. It is informational research, not another accepted specification or implementation tracker. Existing design owners and D0–D6 retain their contracts and acceptance gates.

[Current-code scaling readiness](../../docs/scaling/README.md) adds the newer 52-finding audit and [SC01–SC16 remediation](../../docs/maintainers/scaling.md), with existing PF/EPR/SW/CR/INV/EWF/SL parent ownership preserved. Consult [mechanic-growth integration](../../docs/scaling/mechanic-growth.md) when extending libraries, selectors, effects, bodies or mutable geometry. The current accepted target prioritizes a region-divided shared world; older independent-world-first research is an alternative, not the product roadmap. None of these documents establishes runtime implementation or capacity evidence.
