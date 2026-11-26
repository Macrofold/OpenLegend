# Persistent seed worlds, storage and hosting

[Collection](README.md) · [Sources](sources.md)

## Independent histories, shared beginnings

A thousand worlds copied from one seed are a thousand independent mutable simulations, not a thousand views onto one canonical mutable map. A tree cut in one world, an NPC's relationship, a stolen object or a discovered method cannot be assumed to match another copy afterward.

They can still share substantial immutable content: installed definitions, authored terrain chunks, asset releases and seed records. A useful direction is a pinned immutable seed plus each world's own current changes and history. This need not mean implementing filesystem copy-on-write, database snapshot cloning or a generalized overlay engine immediately. The minimum foundation is separating immutable source identity from mutable instance state.

Overlays need explicit creation, mutation and deletion semantics, direct indexed resolution and eventual bounded compaction. An indefinitely growing chain of historical overlays makes every read slower and is not an acceptable substitute for independently queryable current state. Current history and required provenance remain under their existing owners; compaction is not permission to delete meaningful evidence.

World creation must not duplicate large asset payloads or eagerly instantiate every possible hectare and creature merely to make the copy exist. Conversely, lazy creation must preserve the selected seed's identity and deterministic content. Record the generator/definition pins and treatment of changes to a running world. No legacy-version compatibility infrastructure is required at this development stage.

## Four different counts

Distinguish stored worlds, loaded worlds, active regions and concurrent people. Also distinguish full-detail NPCs, cheaper supported continuing activity and dormant records. These populations need different budgets and lifecycle operations.

The target of 1,000–5,000 concurrent humans in one world is not a forecast that all 1,000 stored worlds are full simultaneously. If they were, that would be one to five million concurrent humans before counting NPCs. Fleet planning must state the actual occupancy assumption rather than accidentally multiply an ambitious per-world target into a launch commitment.

A useful conceptual memory model is:

```text
host memory = shared immutable caches
            + sum(active world/region working sets)
            + in-flight captures and scratch
            + bounded queues and operational overhead
```

A useful storage model is shared immutable source content plus each world's current differences, independent history and operational/backup overhead. These are accounting models, not measured sizes. Shared assets do not make independently changing NPC knowledge or inventories free.

## Persistence does not mandate continuous full-detail execution

A world can remain durably available without all its data staying resident. What happens during absence is a product/time-policy decision, not something a generic cache may invent. Funded autonomous life, exact supported distant progression, a coherently paused world and an unsupported approximation are different offers.

Do not silently freeze an unattended place that is still exchanging effects with an active place. Do not fast-forward past interruptions or manufacture a detailed memory transcript on arrival. Exact coarse advancement can exploit rates and known boundaries, but interacting events may still require substantial work. “Event driven” does not guarantee constant-time catch-up through arbitrary elapsed periods.

Plan a bounded activation path before exposing travel across vast areas. It must reserve resources, load required current state and continuation, restore derived indexes, settle the selected supported horizon, and publish only a coherent result. A sudden arrival should not cause unbounded whole-world hydration or hold every unrelated player behind a database query.

The current one-clock distributed experiment remains intact. This research does not authorize independent regional clocks or approximate outcomes. The future design must distinguish a sparse computation of exact elapsed behavior from independent authoritative time advancement.

## Recovery and deployment are gameplay boundaries

The current [production-deployment tracker](../../docs/maintainers/production-deployment.md) already owns stateful replacement, custody fencing, coherent backup and restore. Reuse those contracts. Scaling ordinary stateless web replicas is not a safe way to run two active copies of one mutable world.

A process needs explicit install, ready, accept, drain/quiesce, save/fence and stop behavior. The destination must not become authoritative merely because it is healthy enough to answer a network probe. Routing changes must not duplicate inventory, restart accepted work, lose private evidence or dispatch the same paid decision twice.

Initially preserve the accepted whole-world last-complete-cut failure recovery. Moving to multiple independently committing regional writers changes the failure model and must remain a separate design. A database snapshot does not automatically include unsaved RAM or all participants in a distributed cut [S14]. Failure recovery must also preserve the existing distinction between gameplay rewind and current operational authority, privacy and financial records.

Many worlds can provide a natural failure boundary. Whether several worlds share one native process or have process isolation is an operating tradeoff: density and shared caches versus crash containment and noisy-neighbour control. Do not select one process per NPC or a universal service per world now. Make lifecycle and resource accounting capable of supporting the chosen deployment later.

## What AWS and Google Cloud can and cannot supply

Both providers can host application services, persistent storage and compute workers. A hosting platform can place processes, maintain capacity and route sessions; it does not infer the game's semantic dependencies, personal evidence or cross-boundary atomicity. GameLift and Agones illustrate that distinction [S18, S19].

The current AWS-oriented deployment design is a reasonable baseline for the existing work. There is no research finding here that justifies a provider migration or a new cloud-abstraction framework. Keep the simulation independent of a provider's SDK and keep storage/network/lifecycle adapters at their existing application boundary.

Revisit EC2, ECS/Fargate or other managed options using complete comparable workloads: actual core performance, memory, network, warmup, failure reserve, shutdown behavior, operational effort and all relevant service costs. Compare GCP when the real workload, expertise, locations or commercial terms make it useful. Do not compare differently sized synthetic demos and declare a winner for the game.

Avoid interpreting GameLift's managed player-session limit as an engine-wide population limit. Its own FAQ distinguishes larger custom session management and persistent MMO hosting [S18]. Conversely, very large fleet marketing numbers say nothing about one crowded authoritative world.

Historical cloud spatial-simulation projects are not necessarily available products. AWS's current lifecycle table lists SimSpace Weaver as shut down [S21]. Its older demonstrations cannot be the deployment dependency for a new engine plan.

## Fleet controls should not become another scaling trap

A world should not require an ever-growing collection of dedicated load balancers, listeners, database connection pools and control-plane resources solely because it exists durably. PD11 already owns the point at which a simple initial service arrangement must become a measured world directory and shared gateway/worker placement system.

Cloud process churn and orchestration work have their own limits [S20]. Repeatedly starting cold processes, rebuilding large caches or migrating a crowd every frame can cost more than the work it moves. Reserve/prewarm only where latency and actual demand justify it; use bounded grouping and hysteresis as the native design already specifies.

Do not distribute a tightly coupled active encounter across distant cloud regions merely to improve ping for every participant. Network delay and cross-region communication are not removed by service branding. Player ingress, regional placement of independent worlds, and intra-world compute distribution are separate decisions. The initial same-world experiment remains the scoped same-operator design, not a global low-latency consistency promise.

## Economics is a second feasibility curve

Technical concurrency and affordable concurrency must both be measured. For an interval of real time, account for simulation compute, storage and maintenance, network and assets, provider calls, operational services, idle capacity and failure reserve. Report cost per useful active-player-hour and per unattended-world-hour under the declared behavior.

The earlier native-core discussion's 1,000 subscribers/500 simultaneous players and illustrative monthly budget is not the budget for 1,000–5,000 concurrent players in each world. Do not carry that arithmetic forward without restating the population and workload. No subscription price, current cloud price or final fleet spend is adopted here.

NPC cognition may dominate cost even after native CPU improves. Measure eligible opportunities, prepared requests, admitted calls, tokens, useful outcomes, stale/discarded results and shared serving overhead. More observers must not automatically multiply equivalent paid decisions. A model vendor outage should not stall unrelated native movement, and local cancellation does not prove an upstream charge or computation disappeared.

The product ambition remains large; the selected operating offer should follow the measured frontier of responsiveness, fidelity and total cost rather than a guessed player cap.
