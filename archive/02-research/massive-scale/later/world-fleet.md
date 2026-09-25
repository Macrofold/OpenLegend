# LATER: many worlds, regional cells and millions of players

[Research index](../README.md) · Conditional expansion corresponding to the existing [D6 strategy](../../../../docs/maintainers/production-data.md). Trigger: a qualified world and measured aggregate demand, not the mere existence of a million-player ambition.

## Replicate the useful unit

A fleet of independent authoritative worlds is the simplest horizontal scale path for this design. Each world has a known safe resource envelope, durable ownership, scoped clients and bounded worker demand. More machines add more such envelopes without dividing every collision or conversation across a network.

A world can move between machines without changing its logical identity. A cell groups a bounded population and supporting resources into an operational failure boundary. Regions reduce player-to-owner distance; they do not imply that every world is active-active in every region.

## Placement should be multidimensional

Track native CPU/debt, resident state, active bodies/processes, perception edges, projection/egress, commit bandwidth, recall activity and admitted inference demand. Humans per world is one useful input, not the scheduler's complete cost function.

Reserve capacity for peak density, failures, deploy drains and wake storms. Avoid packing every machine to its average limit. A world that fits in RAM may still exceed exact perception or database budgets; a quiet world may share a process only if isolation and recovery requirements permit it.

Use measured envelopes and placement classes rather than an endlessly precise unvalidated predictor. Detect drift when a world's behavior changes after a new mechanic or social event.

## Directory and session routing

A placement directory maps world identity to owner location and generation. Gateways authenticate and route; they do not become a second mutable world authority. Cache routing where safe, with explicit stale-owner rejection and redirection.

A placement change should not invalidate durable actor identity or history references. Short-lived admission credentials bind the intended world/session and current routing context. A reconnect can discover the new owner and obtain a permitted baseline.

The control plane should have a documented degraded mode. Already-running worlds may continue under valid authority while new creation or transfers are unavailable. Never let a stale directory grant two owners the right to commit.

## Whole-world relocation protocol

Use a durable move operation with states such as preparing, fenced, committed-to-destination and activated. Exact names belong to the implementation owner; the important properties are stable identity, a recoverable boundary and one authorized writer.

Prepare destination capacity. Quiesce the source at a coherent head and prevent new incompatible work. Persist the move boundary and switch authoritative ownership with a new generation. Activate the destination only after it verifies that generation and loaded state. Old workers and source commits fail the authority check. Retire the source after durable confirmation.

Failure recovery reads the durable move state. It must not infer authority from whichever machine responds first or blindly resume the source after a timeout. A lost destination acknowledgment can mean activation succeeded.

An early explicit reconnect or brief transition is preferable to claiming seamlessness before it is tested. Whole-world migration is already substantial work; do not combine it with sector splitting and cross-database migration in the first experiment.

## Data placement and shared services

Co-locate a world's frequent transactional working set with its authority. Replicate or archive according to recovery and read requirements. Keep global services narrow: account identity, entitlements, immutable content discovery and explicitly global economic/social features.

Do not make every native step depend on a global user database. Avoid one universal sequence or lock for all worlds. Shared content can use immutable revisions; mutable global resources need their own workload and consistency plan.

Cell-based architecture and game-server fleet orchestration provide operational patterns, but neither solves the game-specific transfer protocol. [S38](../sources.md#s38), [S39](../sources.md#s39)

## Expansion experiments

Run many representative worlds, not copies of an idle room. Skew demand toward a few expensive worlds. Kill one cell, drain a machine, move a world while AI is pending, and simulate a regional reconnect wave. Verify the unaffected population remains useful and accounting remains correct.

Measure database-pool contention, global-service dependencies, placement churn, queue fairness and total cost. A fleet benchmark should disclose the proportion of cold, quiet and heavily active worlds. Aggregate concurrency without this mix is not a meaningful capacity claim.
