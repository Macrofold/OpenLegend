# BitCraft Online: technology, persistence and scale

[Back to the BitCraft dossier](../bitcraft-online.md) · [Systems and world](01-systems-and-world.md)

**Research cut: November 14, 2026.** Primary sources and bounded code inspection; no game execution or independently reproduced benchmark. Source statements, code observations, vendor measurements and OpenLegend recommendations have different evidentiary weight.

**OpenLegend comparison baseline.** At the pinned November 12 native-core proof revision, NSC03 assessment was complete and the 128 MiB profile was rejected after failing clean ordinary-play capacity; the earlier 64 MiB profile had also been rejected. Parallel execution, broader conversion and distribution gates remained unentered. Rust was still the selected conditional proof candidate, not a qualified migration. This chapter evaluates residency, bounded boundaries and ownership principles against that status. [OL1] [OL2]

## Executive judgment

BitCraft is unusually useful to OpenLegend because its server source is public and its developers have published concrete failures. Its regional architecture shows how a shared persistent world can span independent simulation owners. [T05] [T07] [T32] The strongest lesson is to keep authoritative state, transactions and incremental client updates close together. These sources do not establish unlimited players in one crowded place, private character cognition or automatic global low-latency simulation.

**Recommendation:** study and adapt the patterns while resolving OpenLegend's existing conditional native-core proof. A wholesale switch to SpacetimeDB would change persistence, authority, client protocol, deployment, licensing, and operational ownership together. BitCraft's evidence does not justify that migration or override OpenLegend's failed capacity assessment. An optional future bounded comparison could be worthwhile only if it answers a concrete unresolved bottleneck and uses the same workload and acceptance boundary.

## 1. Version and provenance discipline

- Official BitCraft 1.0 launched November 13, 2026; EA2 remains a separately selectable legacy world. This is current launch context, not a mature 1.0 outcome. The repository's `master` resolves to **85c972d8d9433560fb51a906424b74b7958ddf99**, authored November 13 at 16:33:47 UTC, commit message `release 1.0`. The commit names private source revision `082daa0edcd96c46ddbfae08812cf565f399f9a7`. [T01] [T02]
- That public game's Cargo manifest pins `spacetimedb`, bindings-sys and bindings-macro to **2.10.0**, including an unstable feature flag. This establishes build dependencies, not the exact live host binary or cluster configuration. [T03]
- SpacetimeDB's latest published release inspected is **2.15.0**, November 10, 2026. The public branch is already advancing beyond it, so use tagged licenses and releases, not an unqualified current `master`, when making a deployment recommendation. [T04]
- Some introductory platform prose still says BitCraft is one database; current game source, developer region documentation, and the scaling article show a global module plus region modules. Treat introductory simplification as incomplete topology. [T05] [T06] [T07]

## 2. What they actually built

| Layer | Verified design or source evidence | Practical consequence |
| --- | --- | --- |
| Presentation | Official FAQ identifies a Unity client. | Similar-looking art does not imply the same browser rendering constraints as OpenLegend. [T08] |
| Authoritative game logic | Public server contains Rust modules; a SpacetimeDB module defines relational tables and reducer functions. Rust modules compile to WebAssembly. | Game logic runs near state rather than repeatedly loading a world through a conventional network database API. [T03] [T05] [T09] |
| Local mutation | A reducer call runs in one atomic transaction; errors revert its table changes. Reducers cannot make arbitrary network/filesystem calls. Time and seeded randomness come from the supplied context. | Strong local boundary for commands and rules, but external AI calls need a separate execution path and current-state revalidation. [T10] [T11] |
| Global coordination | Separate global module plus replicated shared-table messages for identities, empires and other cross-region facts. | A world is logically shared without requiring every regional action to contend on one global writer. [T05] [T12] |
| Cross-region services | Official rollout identifies a Relay, Mob Manager and Map service outside the core modules. | “Database is the backend” does not mean the complete game has no specialized services or integration seams. [T13] |
| Clients | Generated typed bindings, subscriptions and a local row cache; calls request mutations, subscriptions receive committed matching changes. | Rendering can read local state without a round trip for every field. [T14] [T15] |

A useful concrete flow is: player requests an action → region module checks authority and gameplay preconditions → transaction updates relevant rows → subscription engine identifies affected clients → SDK applies row changes locally → client presents the result. An inter-region operation additionally enters an explicit transfer protocol. [T10] [T14] [T16] [T17]

### Source reading: regional handoff is substantial application logic

At the pinned 1.0 commit, `inter_module/mod.rs` accumulates shared updates and writes destination-addressed message rows. `reducers.rs` validates the relay caller, records the last processed message identifier per sender, handles duplicate messages, and processes completion/errors. `transfer_player.rs` packages numerous player-owned components, removes them from the originating region, recreates them on the destination, and reinserts the player at the original location when the destination reports an error. It also stages part of the process in a separate scheduled transaction for correct client behavior. [T12] [T16] [T17]

This is evidence for explicit ownership transfer, duplicate suppression, completion reporting and compensation. It is **not** a demonstrated end-to-end exactly-once guarantee under every crash/reorder case; the relay implementation and production failure testing were not audited. A local ACID transaction does not automatically make a multi-region transfer globally atomic.

For OpenLegend, a future handoff needs to preserve more than position and inventory: action continuation, relationships/references, character knowledge, relevant pending deliberations, saved randomness and accepted-event identity. This is an OpenLegend design implication, not a capability established for BitCraft. [OL1] [OL2]

## 3. Scale: separate the quantities

The platform founder's September 3, 2026 article says each database executes as a single-threaded actor, while independent databases can run concurrently. BitCraft uses a root/global database and regional databases. The article separately discusses compute, storage and networking, distinguishing replication for availability from parallel useful work. Read replicas, synchronous cross-database transactions and intra-database partitioning are listed as later steps. [T07]

The October 30 **v2.14.0 release** verifies that asynchronous inter-database communication shipped for Rust and TypeScript: typed generated outbox tables and a delivery actor with result callbacks. Current platform documentation describes tiered memory/disk storage and Maincloud object-backed tables. These are platform capabilities; the inspected BitCraft module still uses its custom relay protocol, and no evidence establishes BitCraft's use of newer storage tiers. [T18] [T11]

The game's May 2025 region announcement explicitly said crossings involved loading screens and potentially queues. It described adding regions as the route to increasing world area and total population. Later 1.0 source still contains region queues and transfer machinery; this research did not verify the current player's transition smoothness by playtesting. Do not casually call every crossing seamless. [T06] [T17]

| Quantity | What evidence supports | What it does not establish |
| --- | --- | --- |
| World area | Multiple regions can be added. | Infinite content quality, useful density or unlimited hot data. |
| Total connected population | Regional ownership permits parallel work across regions. | Unlimited people interacting in the same market/battle. |
| Transaction throughput | Vendor publishes a reproducible database workload. | MMO player capacity, character cognition throughput or rendered crowd performance. |
| Storage | Current platform docs describe tiered storage. | Constant-time world scans or zero cost for cold data misses. |
| Reliability | Local transactional state, logs and available managed replication. | Immunity to application bugs, outages, duplicated reconnects or economic exploits. |

### Benchmark evidence, carefully bounded

The May 14, 2026 vendor benchmark reports **303,920 ± 4,712 transactions/s for TypeScript and 265,541 ± 940 for Rust** on a contended bank-transfer workload. The reported measurement used a 30-second warmup then five minutes, a single-node Standalone deployment, and 64 clients with up to 40 pipelined outstanding requests for SpacetimeDB. It is useful evidence about that workload and removing application/database overhead. It is not a BitCraft simulation or a head-to-head test against OpenLegend's proposed resident Rust core. The fact that TypeScript won that particular run also undercuts simplistic language-only explanations. [T19]

No verified current per-region player ceiling, busy-city capacity curve, representative p95/p99 latency envelope, server bill or production host topology was found. January's “tens or hundreds of thousands” statement is developer capability/ambition language, not an independently measured live result. [T13]

## 4. Persistence and simulation when players are absent

SpacetimeDB's commit log records ordered committed changes and supports recovery. Documentation distinguishes transaction execution from durability: buffering and fsync policy matter. In 2.0, confirmed reads became the default so subscription changes and successful results wait for durability; opting out trades that guarantee for latency. Do not assume BitCraft uses either mode without its client/configuration. [T20] [T21]

The public game source gives concrete examples of ongoing world processing:

- Growth has a scheduled loop whose period comes from authored parameters; it finds entries whose growth deadline has elapsed and replaces resources/placeables using the growth recipe. [T22]
- Building decay has a scheduled loop, consumes claim maintenance supplies, heals supported buildings and damages unsupported buildings, with no “a player is watching this building” gate in that inspected loop. [T23]
- The module initializes separate scheduled agents for regeneration, hunger, rent, claims, trade sessions, growth and cleanup. This is a family of different-rate activities, not evidence for one expensive universal tick. [T24]
- The inspected NPC loop runs every 300 seconds, manages traveler populations and ruin occupancy, relocates travelers and refreshes offers. The separate mob manager is responsible for AI entity control; server endpoints include batched enemy movement. [T25] [T26] [T13]

These findings support continuing time-based world processes independently of an observer. They do **not** show OpenLegend-style rich autonomous people with private autobiographical memory, needs, social interpretation, LLM deliberation or continuously detailed simulation everywhere. The term `agent` in this repository is often a scheduled maintenance system. A 300-second traveler loop also does not mean all NPC/mob actions happen only every five minutes.

For OpenLegend, the promising idea is to separate semantics from update frequency. A crop can retain its deadline, a shop its stock and orders, and a traveler its commitments without continuously reconstructing every representation. Whether an activity can safely advance from timestamps or lower detail depends on interactions and knowledge consequences. BitCraft provides mechanisms to study; it does not settle those semantics for our game.

## 5. Interest management, privacy and bandwidth

Subscriptions replicate matching whole rows, initially and then incrementally. Current docs recommend grouping subscriptions by lifetime and subscribing to a replacement before dropping the old one to retain common data. Distinct overlapping broad queries can still duplicate processing/serialization; automatic sync does not make every subscription cheap. [T14]

The May 2025 game announcement identified a previous chunk-crossing problem: requesting data already held by the client. Incremental subscriptions were intended to reduce those redundant transfers. [T06] The current SQL reference imposes restricted subscription shapes and index requirements; custom views can be expensive if their dependency/read sets are broad. [T27] [T28]

**Visibility is separate from efficiency.** A client requesting “things near me” is not itself an authorization rule. Tables are private by default; explicit public tables and caller-filtered views determine exposed data. Current RLS documentation recommends views rather than the experimental RLS feature. BitCraft's public code includes caller-scoped prospecting views, but this was not a comprehensive information-leak audit. [T29] [T30] [T31]

For OpenLegend, preserve separate server-owned permissions for perception, remembered information, concealed entities and other characters' inner state. Sending less data for performance and forbidding data for gameplay/privacy can use shared indexes, but they are different promises. Compare bandwidth, invalidation and per-client projection cost under actual observation patterns, rather than adopting public table subscriptions indiscriminately.

## 6. The most valuable failures to learn from

### June 23, 2025 launch postmortem

The team described missing optimizations in trade-finder/waystone queries that scanned enormous row volumes; bots had not opened those interfaces or followed the tutorial. Mob-monitor disconnects and undeliverable-message logging exposed stdout-lock contention, increasing reducer latency and feeding more disconnects. An apparent improvement from rolling back had been random, while that rollback removed optimizations relevant to real players' crafting. [T32]

**OpenLegend application:** workload realism matters more than raw actor count. Include public interfaces, crafting bursts, discovery, trade, reconnects and dense-area observation in any later qualification. Keep expensive logging/telemetry out of critical locks, and compare latency distributions and profiles before crediting a rollback. These are proposed qualification cases; this dossier does not claim they have been run in OpenLegend.

### August 14, 2026 reconnect investigation

Increasing an idle timeout helped some slow connections but exposed overlapping sessions: a new connection could open before the old one expired, and the stale disconnect signed out the now-reconnected character. The team changed connection tracking. The original simultaneous network failures remained unidentified in that report; it proposed off-site client error reporting and smoother reconnects. Large initial WebSocket/TCP messages could also delay heartbeat acknowledgement. [T33]

**OpenLegend application:** session identity and character identity must be separate. Exercise stale disconnects after a successful reconnect, and preserve bounded initial data loads with observable progress. Diagnose both ends of a connection. Do not turn “more generous timeout” into a presumed cure.

### September–November 2026 operational changes

- September 10: strict fortnightly updates temporarily relaxed to focus on larger fixes; the platform upgrade was described as nearly a year's jump. [T34]
- September 21: official Steam patch notes said moving 1.12→2.10 required extensive client changes because data delivery semantics changed. [T35]
- September 24: developer-reported ordinary-play memory reduction of **2.5–3 GB**, CPU fixes and combat animation improvements. These are reported reductions, not reproduced measurements. [T36]
- November 13: 1.0 fixes included cliff-edge rubberbanding, lost geometry precision in interiors, loading-screen/world-origin-shift behavior and inventory/collectible allocations. [T01]

**OpenLegend application:** stylized presentation does not remove client memory, geometry precision, stream-in and animation costs. Infrastructure upgrades can demand player-facing revalidation even when sold as internal changes. A deliberate stabilization interval can be more useful than maintaining a feature cadence that prevents root-cause work.

## 7. Source access, licensing and cost

The inspected public BitCraft repository remains the first-phase server-module release. Its README says it lacks the client and tools needed to connect as the game. The January roadmap's later sidecar/client releases should not be counted as completed merely because their target window passed. No complete downloadable self-hosted BitCraft stack was verified. [T05] [T13]

BitCraft's **source code** is under Apache-2.0. Its NOTICE explicitly excludes art, sound, music, world/procedural/balance data, lore, dialogue/UI wording, marks and network services, and says the NOTICE does not modify the Apache license. These facts make it a valuable code-reading reference without licensing the game's identity or content for OpenLegend. [T37] [T38]

SpacetimeDB is different: the inspected **v2.15.0** LICENSE.txt is BSL 1.1, with an additional use grant limited to no more than one production SpacetimeDB instance and excluding database-service offerings. It provides a later change to AGPL with a linking exception and alternative commercial arrangements. Do not conflate one database, one instance and one region, and do not describe self-hosted multi-instance deployment as unrestricted. Any adoption would require checking the exact chosen version/SDK/subdirectory terms; no code was imported. [T39]

The November 14 pricing page advertises Maincloud Free, Pro ($25/month), Team ($250/month) and custom Enterprise. Billing uses a shared resource-credit unit covering compute/query work, egress and table storage. The displayed equivalent allowances are alternatives consuming the same budget, not independent additive free allowances. Enterprise pricing mentions per-node production charges. These prices cannot estimate BitCraft's actual operating bill or OpenLegend's bill without measured workload and deployment assumptions. [T40]

## 8. Concrete adoption disposition

| Lesson | Suggested treatment for OpenLegend | Example/check that would make it concrete |
| --- | --- | --- |
| Keep authority close to its working state | Reinforces the residency principle under the conditional native proof; does not qualify the rejected current profile. | A craft command changes bounded rows/records and emits a bounded accepted delta without rebuilding the world. |
| Incremental observation and client updates | Carry into existing projection/attention owner. | Walking one chunk changes the relevant neighborhood, without retransmitting common nearby objects or private character state. |
| Keep regional work local | Evidence for staged distribution, not an immediate shard project. | A busy workshop usually changes one owner's state; remote transport uses an explicit ownership protocol. |
| Schedule by activity semantics | Compare against existing layered-simulation design. | Plant growth, hunger, combat and social deliberation have different urgency and evidence requirements. |
| Test the actual play mix and failures | Add concrete cases to existing qualification scope when appropriate. | Market search during crafting, joining a busy city, old connection closing after reconnection, a slow subscriber, interrupted transfer. |
| Observe workload, bytes and costs together | Add to existing performance evidence rather than a parallel metrics programme. | Report command latency, projection time, changed records, transmitted bytes, memory and recovery outcomes under the same workload. |
| Preserve discretion about adoption | No runtime or database migration from this research alone. | A future comparison must address the unresolved native-proof findings on representative workloads and total operational burden; a bank-transfer chart is insufficient. |

## 9. Death and respawn: code evidence

At the same pinned 1.0 commit, the death handler dismounts the player, clears combat targeting and drops the cargo-slot object into the world; it does not clear the ordinary inventory in that handler. After a configured delay, the respawn handler accepts a choice to return home or stay. Home restores maximum health and tries to sleep; staying sets health to 10. Both restore stamina/satiation and apply a configured temporary protection buff. Exact current delay and duration are not established here because their authored values were not inspected. This evidence supports the [systems chapter](01-systems-and-world.md). It is source inspection, not a played verification or a claim that no additional penalty exists elsewhere. [T41] [T42]

## 10. Annotated source register

All sources accessed November 14, 2026. BitCraft code links pin the inspected 1.0 commit unless stated otherwise. Developer reports establish what the developer said or shipped; numerical performance results remain vendor-reported unless explicitly identified as independently reproduced. Platform documentation may describe capabilities newer than BitCraft's inspected build.

| Source | Evidence and use |
| --- | --- |
| [T01: BitCraft Online 1.0 patch notes][T01] | release changes |
| [T02: BitCraft 1.0 public release commit][T02] | Release commit; timestamp and originating source revision |
| [T03: BitCraft Rust manifest][T03] | Full file read; Rust and exact bindings |
| [T04: SpacetimeDB 2.15 release][T04] | GitHub releases API; 2026-11-10 |
| [T05: BitCraft public server repository][T05] | scope and README |
| [T06: Early Access key features, part 1][T06] | 2025-05-16 |
| [T07: Spacetime scaling architecture][T07] | 2026-09-03 |
| [T08: BitCraft official FAQ][T08] | current Unity and release FAQ |
| [T09: Spacetime key architecture][T09] | host/module/table/transaction definitions |
| [T10: Reducer transaction semantics][T10] | mutation atomicity and isolation |
| [T11: Current architecture clarifications][T11] | current storage, Wasm/V8, context time/randomness |
| [T12: Inter-module messaging code][T12] | Full file fetched; message destinations and accumulated updates |
| [T13: Open-source rollout update][T13] | 2026-01-16; phases, sidecars, claims |
| [T14: Subscription lifecycle and performance][T14] | incremental caches and subscription lifetime guidance |
| [T15: Subscription transaction semantics][T15] | local cache transaction application |
| [T16: Inter-module processing and deduplication][T16] | Full file read; deduplication, responses, role gate |
| [T17: Player region transfer][T17] | Full fetched; inspected handoff and compensation |
| [T18: SpacetimeDB 2.14 async IDC release][T18] | API publication 2026-10-30 |
| [T19: Vendor benchmark and methodology][T19] | 2026-05-14; workload/method/claims |
| [T20: Commit-log format and recovery][T20] | durable ordered log/recovery |
| [T21: Protocol 2.0 migration guide][T21] | protocol 2.0/durability semantics |
| [T22: Resource growth scheduling][T22] | Full file read |
| [T23: Claim maintenance and building decay][T23] | Full file read |
| [T24: Scheduled system initialization][T24] | Full file read |
| [T25: Traveler NPC scheduling][T25] | Full file fetched; loop, population/ruins/trade logic inspected |
| [T26: Enemy movement batching][T26] | Full file read; movement batching |
| [T27: Subscription SQL restrictions][T27] | restricted subscription language/indexes |
| [T28: Views and dependency evaluation][T28] | read sets and incremental query differences |
| [T29: Table visibility][T29] | private/public table semantics |
| [T30: Experimental RLS and view guidance][T30] | experimental RLS; views preferred |
| [T31: Caller-scoped prospecting views][T31] | Full file read; caller-scoped prospecting data |
| [T32: Early Access launch postmortem][T32] | 2025-06-23 postmortem |
| [T33: Disconnection investigation][T33] | 2026-08-14 |
| [T34: Update cadence change][T34] | 2026-09-10 |
| [T35: September platform upgrade patch notes][T35] | Official September 21, 2026 upgrade notes; client delivery changes. Text verified in the official announcements feed; permalink resolved via SteamDB. |
| [T36: September performance patch][T36] | 2026-09-24 |
| [T37: BitCraft source license][T37] | Apache-2.0 text; source-code license |
| [T38: BitCraft NOTICE and content exclusions][T38] | Scope exclusions; separate content and service terms |
| [T39: SpacetimeDB 2.15 license][T39] | Tagged first 120 lines read; factual license summary only |
| [T40: Spacetime hosting prices][T40] | current plan/resource credit information |
| [T41: Player death handler][T41] | Full file read |
| [T42: Player respawn handler][T42] | Full file read |
| [OL1: Native simulation feature spec][OL1] | OpenLegend comparison baseline pinned to `a66a67e179ec9dfb7d6ea32aceb37de853cacc06`; conditional proof and rejected capacity profile. |
| [OL2: Native simulation technical design][OL2] | Same pinned revision; architecture, ownership boundaries and unentered gates. |

## Evidence limits

No direct play session or independent benchmark was performed. Exact live hosting costs, cluster topology and per-region capacity remain unknown. The inspected public release does not contain the full sidecar/client stack; the game's use of the latest platform storage and inter-database features is unverified. The region-loading description is historical, so current transition smoothness remains unverified. Unity is confirmed, while precise render-pipeline and shader claims from secondary translations remain unaccepted.

[T01]: https://bitcraftonline.com/news/bitcraft-online-1-0-patch-notes
[T02]: https://github.com/clockworklabs/BitCraftPublic/commit/85c972d8d9433560fb51a906424b74b7958ddf99
[T03]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/Cargo.toml
[T04]: https://github.com/clockworklabs/SpacetimeDB/releases/tag/v2.15.0
[T05]: https://github.com/clockworklabs/BitCraftPublic
[T06]: https://bitcraftonline.com/news/early-access-key-new-features-pt-1
[T07]: https://spacetimedb.com/blog/how-does-spacetime-scale
[T08]: https://bitcraftonline.com/about
[T09]: https://spacetimedb.com/docs/intro/key-architecture/
[T10]: https://spacetimedb.com/docs/functions/reducers/
[T11]: https://spacetimedb.com/docs/intro/misconceptions/
[T12]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/inter_module/mod.rs
[T13]: https://bitcraftonline.com/news/bitcraft-open-sourcing-update
[T14]: https://spacetimedb.com/docs/clients/subscriptions/
[T15]: https://spacetimedb.com/docs/clients/subscriptions/semantics/
[T16]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/inter_module/reducers.rs
[T17]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/inter_module/transfer_player.rs
[T18]: https://github.com/clockworklabs/SpacetimeDB/releases/tag/v2.14.0
[T19]: https://spacetimedb.com/blog/benchmarking
[T20]: https://spacetimedb.com/docs/reference/internals/commitlog/
[T21]: https://spacetimedb.com/docs/upgrade/
[T22]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/agents/growth_agent.rs
[T23]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/agents/building_decay_agent.rs
[T24]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/agents/mod.rs
[T25]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/agents/npc_ai_agent.rs
[T26]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/server/enemy_move.rs
[T27]: https://spacetimedb.com/docs/reference/sql/
[T28]: https://spacetimedb.com/docs/functions/views/
[T29]: https://spacetimedb.com/docs/tables/
[T30]: https://spacetimedb.com/docs/how-to/rls/
[T31]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/views/mod.rs
[T32]: https://bitcraftonline.com/news/early-access-day-2-update-the-server-saga
[T33]: https://bitcraftonline.com/news/update-on-disconnections-and-server-stability
[T34]: https://bitcraftonline.com/news/update-cadence-changes
[T35]: https://steamcommunity.com/games/3454650/announcements/detail/697650257439228782
[T36]: https://bitcraftonline.com/news/patch-notes-1-44
[T37]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/LICENSE
[T38]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/NOTICE
[T39]: https://github.com/clockworklabs/SpacetimeDB/blob/v2.15.0/LICENSE.txt
[T40]: https://spacetimedb.com/pricing
[T41]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_death.rs
[T42]: https://github.com/clockworklabs/BitCraftPublic/blob/85c972d8d9433560fb51a906424b74b7958ddf99/BitCraftServer/packages/game/src/game/handlers/player/player_respawn.rs
[OL1]: https://github.com/Macrofold/OpenLegend/blob/a66a67e179ec9dfb7d6ea32aceb37de853cacc06/docs/projects/native-simulation-core-feature-spec.md
[OL2]: https://github.com/Macrofold/OpenLegend/blob/a66a67e179ec9dfb7d6ea32aceb37de853cacc06/docs/projects/native-simulation-core-tech-design.md
