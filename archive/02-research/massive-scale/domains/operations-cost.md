# Operations, reliability, observability and unit economics

[Research index](../README.md) · Proposed operational model. No provider price, uptime promise or capacity certification is implied.

## Operate the complete player journey

A game can have healthy CPU and still fail because joins stall, database commits lag, the browser freezes or NPC replies queue for a minute. Measure the journey as separate stages: authenticate, admit, load permitted world, acknowledge command, commit effect, deliver change, render response, retrieve memory and generate dialogue.

Define service objectives for each meaningful experience. Use regional network conditions and representative devices. Specify which acknowledgments are durable, what routine progress can be lost, and what an outage looks like. The final numerical objectives should be selected before qualification, not adjusted afterward to make a test pass.

Tail latency matters because a response may depend on several services. Google's Tail at Scale paper is a useful foundation for understanding why individually rare delays become common in a fanout request. Its mitigation techniques are not permission to duplicate non-idempotent paid effects. [S36](../sources.md#s36)

## Isolate failure domains

A regional cell should have a bounded population and supporting resources. A pathological world, database pool exhaustion or bad rollout should not freeze the entire game. Keep shared dependencies narrow and define what existing worlds can do during a control-plane outage.

AWS's cell-based architecture guidance is useful for limiting the scope of failures. The lesson here is an explicit boundary and repeatable deployment, not a demand to build a complex multi-cell fleet before one world works. [S38](../sources.md#s38)

World placement uses resource vectors rather than a single player count. Keep spare capacity for failure, migrations, updates and wake bursts. Admission must consider the destination's safe envelope. Autoscaling cannot rescue an already-overloaded owner instantaneously, and adding replicas without state ownership can make correctness worse.

Agones can eventually manage game-server fleets and allocation. It does not partition a world, resolve transfers or make a dense scene parallel. Compare such orchestration against the team's measured operating needs when the fleet warrants it. [S39](../sources.md#s39)

## Overload policy is a product contract

Use bounded queues and explicit admission. Protect required native work, durable commits and critical evidence before optional reflection, diagnostics, generated cosmetics or speculative background tasks. Preserve accepted memory and sensing semantics; overload does not authorize falsifying them.

SRE overload guidance explains why queues and cascading retries can amplify failure. Apply circuit breakers, retry budgets, jitter and dependency isolation where appropriate. A failure classification must distinguish a safe retry from an unknown accepted effect. [S37](../sources.md#s37)

Possible responses include delaying new joins, reserving a destination, deferring optional thought, limiting new expensive mechanic admission or pausing a world under a documented integrity failure. Time dilation, witness sampling and altered survival policy require explicit game-design approval.

## Observability without making telemetry the largest database

Instrument CPU/GC, active bytes, native debt, exact spatial queries, observer edges, commit latency/bytes, database contention, recall candidates/latency, source ingestion, queue age, provider attempts, token usage, stale result rejection, per-client bytes and renderer frame tails.

Keep stable low-cardinality labels such as operation class, region, cell, version and outcome. A metric time series for every actor, memory or request can explode cardinality; use sampled traces and restricted logs for those identities. Prometheus' instrumentation guidance is a useful operational reference. [S59](../sources.md#s59)

Maintain correlation across command, transition, job and receipt without exposing private content. Record enough evidence to reconstruct a failure and compare versions. Avoid unbounded full-state dumps in the hot path or every model prompt in general logs.

## Cost per player-hour is a distribution

Use the [capacity model](../capacity-model.md), then attach current contracted rates to measured consumption. Separate:

- Simulation and connection compute, including idle reserve and cold/warm placement.
- Inference, attention, embeddings, tools, voice and content generation, including rejected or stale outputs.
- Durable storage, indexes, journals, replicas, backups, rebuilds and archives.
- State/media/asset egress, observability, deployment and human operations.

Do not price a subscription from average token cost alone. Heavy creators, crowded worlds, long conversations, large private histories and mass reconnects can have different marginal costs. Estimate percentiles, abuse cases and gross margin under actual quotas.

Caching reduces only the work it actually avoids. A shared text source can reduce storage without reducing required witness processing. A cheaper model can increase retries or context length. A cold-storage tier can reduce storage expense while increasing wake latency and retrieval cost.

## Deployment and schema compatibility

Treat engine, world-module manifests, client protocol, saved schema, job schema and model prompt versions as a compatibility set. A rolling deployment temporarily runs several versions. A long-lived browser may be older still.

Use staged rollout, canaries and shadow/differential validation where practical. Drain or fence owners before replacement. Decide how pending jobs are handled across a version change: compatible admission, cancellation, or explicit migration. Never admit an old model proposal into a new rule set simply because its outer JSON still parses.

Keep a rollback path that respects irreversible migrations and external effects. Reverting application code does not revert a database migration, a published secret or a real payment. World checkpoints and database backups have different scopes.

## Runbooks that should exist before scale

Cover a stuck world, database write failure, lost owner, failed migration, corrupted checkpoint, provider outage, runaway spend, forgotten-source resurrection, widespread reconnect, hot region, malicious mechanic and bad client rollout. Each needs detection, safe containment, recovery, verification and user communication.

Practice restoring to an empty environment and replacing an owner while clients reconnect. Measure time to useful gameplay, not just time for a process to start. Verify inventory, private knowledge, active obligations, content pins and outstanding job outcomes afterward.

The staffing requirement grows with failure domains and operational promises. Prefer managed infrastructure where it removes undifferentiated work, but retain knowledge of its failure and recovery model. A complicated self-managed platform is not automatically cheaper than a managed service once engineering and on-call costs are included.
