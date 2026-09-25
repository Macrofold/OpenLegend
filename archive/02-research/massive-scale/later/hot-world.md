# LATER: one hot world, sectors and genuinely dense scenes

[Research index](../README.md) · Conditional research. Splitting a world is substantially harder than adding independent worlds. No crowd cap, instancing policy, time dilation or reduced perception is accepted here.

## First decide what is actually coupled

Draw the interaction graph: physical contacts, shared resources, perception, conversations, active plans, economic transactions and rule dependencies. Spatial distance is a useful approximation for some edges, not all. A remote telepathic rule or global market can reconnect regions that geometry appears to separate.

Measure whether the bottleneck is native calculation, single-thread execution, memory, persistence, projections, network output or inference. Sharding the wrong layer can add coordination while leaving the bottleneck untouched.

Before sectoring, remove full-world scans, use incremental relevant work, improve hot-state layout, optimize geometry/navigation and move non-authoritative I/O away from ticks. Keep a reference implementation to prove semantic equivalence.

## What a sector would own

A proposed sector is an authoritative aggregate with local ordered state and bounded neighboring read replicas. It is not simply a rectangular map tile. Ownership may need to follow connected structures or contact islands whose effects are tightly coupled.

Replicated boundary entities are read-only ghosts with versions and freshness. A ghost cannot authorize spending an item or resolve a hit independently. The relevant owner accepts the consequential operation or participates in an explicit cross-owner protocol.

Initially keep sector persistence within one transactional database if the existing scale strategy calls for it. Separate compute ownership can be validated before introducing cross-database transactions. Later physical sharding needs additional failure and consistency evidence.

## Boundary interactions

| Interaction | Candidate treatment | Unresolved cost or semantic issue |
|---|---|---|
| Ordinary travel | Explicit ownership handoff at a safe boundary | Brief admission delay or reconnect versus seamless crossing |
| Long-range observation | Versioned source exposure from adjacent owners | Event-time evidence, geometry freshness and privacy |
| Cross-border combat | One designated authority for the interaction, or coordinated resolution | Latency, fairness, historical geometry and simultaneous outcomes |
| Shared rigid structure | Co-locate connected island where feasible | Oversized structures may defeat geographic partitioning |
| Cross-sector resource transfer | Atomic same-store transaction or durable reservation/escrow protocol | Failure recovery and duplicate delivery |
| Fire/ecological propagation | Explicit bounded cross-owner cause with causal identity | Lookahead, clock synchronization and missed/duplicate spread |
| Conversation across a boundary | Stable conversation identity and actual per-turn audience | Migration cannot invent earlier membership or hearing |

The exact policies require design decisions and prototypes. A network queue is not an implementation of every row in this table.

## Handoff state machine and failure reasoning

An illustrative transfer has a stable transfer ID, source/destination, entity versions, source durable head, new authority generation and a phase. The protocol must cover:

1. Destination capacity is reserved with a bounded lifetime; failure leaves the actor safely owned at source.
2. Source reaches a safe transition boundary, drains or marks dependent work, and records a frozen transfer snapshot.
3. Durable ownership changes under a conditional transaction; stale source commits are rejected after this point.
4. Destination verifies the committed transfer and activates the entity once under the new generation.
5. Client routing and adjacent replicas update; source retires its live copy only after authoritative confirmation.

A crash before ownership change can leave source ownership intact. A crash after ownership change requires destination-side recovery or an explicit subsequent ownership transition—not a unilateral source rollback. A lost activation acknowledgment is an unknown outcome. Replayed transfer messages must be harmless.

Pending AI responses carry their relevant authority/timeline binding. Historical evidence can move with the actor; current action authority must be revalidated. Do not reissue every paid task simply because the actor changed machines.

## Dense crowds are not solved by arbitrary graph cuts

If everyone is within relevant range of everyone else, the graph has few cheap cuts. Required output itself may be large. Splitting the room across servers still requires exchanging interactions and producing authorized updates.

Possible product options include admitted occupancy, spatially distributed stages, explicit instances, asynchronous participation, remote spectators or an approved slower shared clock. EVE's published time-dilation work illustrates one deliberate change to the experience under overload; it is not a transparent optimization or an automatically appropriate OpenLegend policy. [S10](../sources.md#s10)

Donnybrook's attention-based peer-to-peer work is useful evidence that concentrating detail can improve scale under its game model. Its approximation assumptions cannot be imported into OpenLegend's protected hearing and evidence rules without an accepted design change. [S04](../sources.md#s04)

## Distributed simulation research: useful but not a shortcut

Historic zoning, instancing and replication taxonomies help distinguish different forms of scale. Parallel discrete-event simulation adds methods for causal ordering and rollback, but low lookahead and irreversible external effects can make those methods difficult here. [S51](../sources.md#s51), [S56](../sources.md#s56)

A person cannot unread a streamed secret, and a paid model call cannot be uncalled. Keep speculative computation private until the relevant commitment boundary. Avoid presenting optimistic rollback as an easy way to distribute an open-ended social world.

## Proof before rollout

Prototype two sectors with contested boundary resources, a bridge, crossing speech and pending AI. Inject failures at every transfer phase, delay ghost updates and replay messages. Compare against the single-owner reference for permitted outcomes.

Measure cross-boundary edge count, message bytes, coordination latency, migration frequency and failure recovery—not only local CPU improvement. Add more sectors only when the total system improves under the intended workload without weakening semantics.
