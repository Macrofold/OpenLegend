# SOON: one recoverable, useful multiplayer world

[Research index](../README.md) · Proposed delivery sequence mapped to [D0–D5](../../../../docs/maintainers/production-data.md), not a replacement backlog.

## The next target should be a complete vertical slice

Two independently authenticated humans inhabit one authoritative world with several agents. They move, hear different things, speak, share resources, reconnect and survive a server restart. The world has bounded queues, observable costs and a tested recovery boundary. This is the useful precursor to a fleet.

Keep one region, one world owner and the existing transactional storage direction. Separate slow AI execution from authority. Static assets can be served through ordinary cacheable delivery. Logical modules can remain in a small deployment; no million-player infrastructure is required to prove these boundaries.

## Recommended sequence

| Slice | Why it comes before the next | Existing owners |
|---|---|---|
| Authenticated control and scoped views | Multiple sockets without independent identity are not multiplayer | D0/D1 and affected protocol/knowledge owners |
| Atomic resources, receipts and durable evidence | Restart/retry must not corrupt shared interactions | D1/D2 |
| Bounded agent work and current-scope admission | Slow or stale reasoning must not block or corrupt native play | Cognition/agency and D2 |
| Join, resume, disconnect and restore | Real browsers and deployments interrupt sessions | Protocol, save/load, D1/D2 |
| Representative load and cost measurements | Infrastructure choices need actual workload curves | Performance and D5 |
| Operational release gate | Public persistence creates recovery, security and support obligations | D5 and subsystem acceptance |

Do not implement every future production record without a consumer. Preserve the shared contracts while migrating the records needed for these scenarios.

## Multiplayer semantics requiring an explicit answer

The current local-world pause setting cannot govern a persistent shared world by accident. Decide whether the world pauses when empty, continues exact supported processes, or uses an approved offline policy. One hidden tab must not pause everyone else. Decide what happens to disconnected actors, active conversations and obligations.

Specify who can restore a world when other people have acted in it, how they are notified, and what happens to pending external work. Decide whether creator powers are available during competitive/shared play and whether other participants can trust the same rules. These are product decisions with infrastructure consequences.

Do not require every shared world to be permanent and globally connected immediately. A clearly scoped cooperative world can establish robust identity, evidence and persistence while leaving later world topology open.

## A recommended initial test fixture

Use a small vertical environment with a bridge/underpass, doors, resources and a few active processes. Give two players different recognition and private knowledge. Include several agents with active goals, one unresolved commitment and histories older than current scrollback.

Drive movement, contested resource use, simultaneous speech, a changing acoustic barrier, canceled inference and a reconnect. Kill and restart the owner at selected boundaries. The expected result should be specified in terms of ownership, evidence and accepted events, not merely screenshots.

Population counts are a fixture choice, not a market promise. Increase humans, agents, density, age and simulated speed independently after the small case is correct. A test with many idle sockets is useful for connection overhead but cannot qualify this workload.

## Deployment decision after measurement

The earlier [hosting study](../../hosting-and-scale.md) discusses candidate frameworks/providers. Treat it as research, not an installed stack. Compare retaining the current HTTP/SSE application, adopting a room framework, or introducing a custom bidirectional protocol only against concrete shortcomings.

A room framework may simplify lifecycle and transport. It does not automatically solve per-observer knowledge, durable saves, cross-world economy or authoritative migration. Preserve the pure domain boundary if a framework is introduced.

## Exit evidence

The same fixture should pass normally, under latency/loss, during provider failure, after owner restart and after restore. Required facts must survive; private facts must remain private; unsupported work must fail clearly; queues and active memory must remain bounded over a soak.

Record measured command latency, native headroom, browser frame tails, commit bytes, recall cost, AI demand and egress. Then choose the first public workload envelope and operational objectives. Do not advertise a concurrent-player capacity from this research alone.
