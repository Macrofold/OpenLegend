# Eventual architecture: a fleet of bounded, authoritative worlds

[Research index](README.md) · Proposed synthesis. The canonical production target and D0–D6 remain authoritative. This is a responsibility map, not a requirement to deploy every box as a separate service.

## 1. The shape of the system

```text
Browser: permitted state, input, interpolation, UI, local asset cache
          | authenticated commands / scoped updates
Regional edge: connection admission, rate limits, reconnect tokens
          | world + ownership-generation routing
World placement directory / control plane
          |
    +-----+----------------- independent regional cells ------------------+
    | World owners: hot simulation, native rules, local ordered commits    |
    |   |          |                 |                                     |
    |   |       scoped read models / recipient projection                 |
    |   +-- durable current state + receipts + required evidence + outbox  |
    |   +-- bounded jobs --> AI/recall workers --> validated proposals     |
    |   +-- checkpoints / historical segments / restore overlays          |
    +---------------------------------------------------------------------+
          | explicit inter-world protocols; not shared mutable memory
Account/entitlement and conserved global services, where product needs them
Content registry / immutable approved assets --> regional CDN
Analytics / abuse review / cost and reliability telemetry, outside ticks
Voice/media delivery with server-enforced recipient permissions
```

The unit of placement is initially a whole world. A cell is a failure and operational boundary containing a bounded set of worlds and supporting data/compute. A sector is a possible later authority subdivision inside one hot world. These three terms are not synonyms.

The strongest fit for OpenLegend is **local authoritative simulation plus distributed durable services and asynchronous intelligence**, not a distributed SQL query for every collision. Google's gaming whitepaper is a useful precedent for separating game-server execution from durable backend state. [S01](sources.md#s01)

## 2. Three independently scaling planes

**Simulation/data plane.** Owns physical state, native actions, material conservation, exposure acquisition, clocks and commits. Keep tightly coupled effects local. A functioning world should not consult global account discovery or a remote analytic database every native step.

**Intelligence plane.** Executes bounded attention, recall, generated decisions, reflection, summarization and approved content work. Its queues, budgets and provider failures must not freeze routine walking or native protection. Agent identity is durable data, not a mandate for one operating-system process, network connection or warm LLM context per character.

**Control/operations plane.** Creates and places worlds, routes sessions, controls deployment, enforces entitlements, moves ownership and coordinates recovery. Its outage policy should allow already-admitted worlds to continue safely for a defined interval where cached authority permits. New logins or transfers may be unavailable without stopping every existing scene.

These planes can start as modules in a small deployment. Separation of responsibilities is required earlier than separation of machines.

## 3. Consistency is chosen per invariant

Use the strictest boundary where violating an invariant would corrupt the game. An item cannot simultaneously belong to two owners; two actors cannot both consume the final berry; an expired authority cannot publish a second world history. These effects need a serial decision, reservation or equivalent invariant-preserving protocol.

Other products can tolerate bounded staleness: remote population estimates, public search, cosmetic animation and some social discovery. Their freshness should be visible and bounded when it matters. Approximate recall is not authority to invent memories, and a stale market listing is not permission to purchase an already-sold item.

Coordination-avoidance research explains why this classification depends on operations and invariants, not slogans such as “eventual consistency is faster.” RedBlue consistency provides another useful vocabulary for separating coordinated and coordination-free operations. Neither makes arbitrary physical interactions safely mergeable. [S31](sources.md#s31), [S32](sources.md#s32)

## 4. What one owner keeps hot

Keep current active entities and components, relevant terrain/navigation structures, current processes, local subscriptions, resource reservations, near-term deadlines, action continuations and the evidence needed for immediate interaction. Share immutable definition revisions. Keep bounded caches for nearby public descriptors and permitted actor context.

Durable historical events, cold memories, obsolete rule versions, generated assets and complete analytics do not all belong in the resident world. They need addressable records and bounded readers. Cold does not mean deleted or inaccessible; waking a relevant actor can load its required continuity through a measured admission path.

The exact hot/cold boundary follows the existing retention and memory policies. This report does not authorize dropping required About-me text, unresolved obligations or historical evidence to fit a memory target.

## 5. Scale outward before cutting through interactions

A population spread across independent worlds offers natural horizontal growth: more owners, more cells and more regional capacity. Each world still has a bounded load envelope. World placement considers CPU, memory, perception edges, inference demand and storage throughput—not just connected humans.

A single busy world is different. First remove unnecessary whole-world work, improve data locality, precompute immutable structures, optimize incremental change processing, and isolate expensive non-authoritative work. Only then introduce sectors, and only along boundaries with manageable crossing semantics.

Cutting a dense collision or conversational graph into many servers can increase coordination more than it adds useful compute. A crowd of mutually relevant entities may need a deliberately different gameplay treatment: capacity admission, explicit instances, remote spectators, geographically distributed event stages or agreed clock policy. Those are product decisions, not transparent database features.

## 6. Data and geography

Home active worlds in regions appropriate to their participants. Replicate durable data for recovery and read use according to actual consistency and recovery objectives. A globally consistent database cannot make intercontinental round trips disappear; exact shared combat still has a latency policy.

Do not require every region to synchronously update a universal world clock, sequence or mutable catalogue entry. Immutable rule/content revisions can be cached widely. Mutable economy and account authority can use narrower ownership than the complete universe.

Partition durable data by stable ownership/access patterns, with placement metadata separate from identity. Avoid one database table or vector index per individual agent. Avoid one giant global index when most retrieval is private to one actor. See [memory growth](later/planetary-memory.md) and [persistence](domains/persistence-consistency.md).

## 7. Recovery is part of normal execution

Every world needs a known durable head, coherent checkpoint, supported schema/content revisions and replay policy. Recovery replays admitted outcomes; it does not ask a model to regenerate the past. An outbox or durable job record carries incomplete external work across crashes, with receipts and generation checks preventing duplicate accepted effects.

A world move drains/fences authority, transfers a consistent boundary, changes ownership atomically at its directory/commit boundary, and activates the destination only under the new generation. Recovery consults durable transfer state rather than trusting which machine most recently answered a heartbeat.

Backups, player saves, forks, database failover and ownership migration have different meanings. In particular, player-visible restoration must not recreate spent real money, revive revoked permissions or disclose erased information. See [data migration](soon/data-migration.md).

## 8. What should remain replaceable

Transport, hosting provider, database adapter, vector implementation, model provider, graphics backend and job transport should remain replaceable behind meaningful contracts. This does not require a generic abstraction for every future vendor. Keep concrete interfaces around the behavior the game uses: authoritative commit, scoped recall, allowed projection, bounded execution and asset resolution.

The hardest things to replace later are semantic: identity tied to a machine; omniscient memory; undocumented clock assumptions; one globally serialized economy; user rules with unbounded reach; and saves that conflate simulation and external reality. Those are the priorities in [NOW foundations](now/foundations.md).
