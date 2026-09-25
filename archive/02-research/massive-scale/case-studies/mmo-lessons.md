# Case studies: what successful games actually teach OpenLegend

[Research index](../README.md) · [Source registry](../sources.md) · These are documented examples plus explicitly labeled applications, not reconstructed proprietary source code. Historic operational details are dated; they are not assertions about the games' current deployments.

## 1. Old School RuneScape: useful world-sized authority, real workload profiling

**Documented evidence.** Jagex's 7 August 2025 infrastructure article describes each world server simulating Gielinor, with tens of thousands of NPCs and up to 2,000 players. A game tick lasts 0.6 seconds, but the team seeks much shorter and consistent processing. It discusses regional virtual machines, CPU-overcommit contention, a top-200 expensive-script list, and an unexpectedly costly Gemstone Crab. Cloud-hosted worlds were a plan at that date. [S08](../sources.md#s08)

**Interpretation for OpenLegend.** Whole-world authority is not inherently a toy architecture. It is a useful unit of ordering, persistence and placement when its workload fits. The mistake would be to treat a proven shape as a transferable population number: OpenLegend's agent deliberation, private evidence, mutable geometry and authored mechanics impose different costs.

A lower-frequency authoritative loop can coexist with smooth browser presentation. That does not mean a 600 ms processing stall is acceptable, or that the engine should adopt RuneScape's cadence. OpenLegend already has a different simulated-time contract. Measure native execution, durable acknowledgment and rendering separately.

Content must participate in performance governance. A creator's new spell, a popular trading practice or a widely deployed creature can become a dominant cost after release. Proposed response: attribute execution, spatial queries, event recipients and paid work to the admitted mechanic family and version. Review expensive and rapidly growing families, not merely the slowest application endpoint.

**Experiment to borrow.** Maintain representative busy-market, combat, crafting and quiet-world workloads. Test multiple worlds sharing a host with explicit headroom; inspect scheduling delay as well as in-process CPU. Compare a newly popular mechanic against the same population before its introduction. Do not infer safe placement from nominal virtual CPU counts alone.

**Do not borrow blindly.** The server's advertised NPC population does not describe how many NPCs perform open-ended reasoning, retain private autobiographies or interact simultaneously. Nor does historical browser delivery prescribe modern transport or rendering choices.

## 2. World of Warcraft: population placement is part of game design

**Documented evidence.** Blizzard's May 2012 cross-realm-zone announcement explains combining populations in underpopulated areas while preserving home-realm social identity, using multiple copies for crowded zones, and moving a party into a common instance. Its then-described economic/trading boundaries did not simply merge every realm into one market. [S09](../sources.md#s09)

**Interpretation for OpenLegend.** Identity, social continuity, interaction placement and economic scope can be separate concepts. Design those concepts explicitly even while they happen to share one local world today. Otherwise an eventual placement change can accidentally rename actors, duplicate resources or separate friends.

Instancing is not merely an implementation detail in a world built around persistent agents. When two copies contain “Ada,” are they the same person, separate people with shared origin, or temporary presentations of one authority? Who remembers a conversation held in only one copy? Can a resource exist in both? These questions must be answered before cloning a scene to relieve load.

A persistent village might therefore remain a single authority, while expeditions or creator-owned worlds use explicit separate timelines. That is one candidate product design, not a recommendation to add instances everywhere. The important foundation is identity and provenance that can express the choice honestly.

**Experiment to borrow.** Move a party among two explicitly separate scenes, preserving account identity and the agreed character policy. Check that history, control and resources follow only where intended. Show players when they are not sharing the same reality rather than silently giving inconsistent evidence.

**Evidence limit.** The cited article describes a historical player-facing feature. It does not disclose a complete database layout, modern shard algorithm, server process model or current economic rules. Emulator implementations would not fill that evidentiary gap as first-party production evidence.

## 3. EVE Online: a dense hotspot needs an explicit overload experience

**Documented evidence.** CCP's 2011 time-dilation explanation describes deliberately slowing simulation progress when work exceeds processing capacity rather than allowing an uncontrolled backlog. The 2012 Burn Jita account describes operational preparation and different workload profiles around a major event. These are dated first-person engineering accounts, not current universal player limits. [S10](../sources.md#s10), [S11](../sources.md#s11)

**Interpretation for OpenLegend.** One shared universe does not imply one arbitrarily parallel interaction. A crowded battlefield, busy marketplace and mass conversation can stress different owners even at the same population. Geography, shared resources and sensory fanout determine useful partitioning boundaries.

Time dilation is a possible product choice, but OpenLegend's clocks make it complicated. Physical motion, hunger, active promises, incoming cross-sector effects and provider deadlines do not all use the same time domain. A slowed region cannot independently pretend that an immediately adjacent unslowed region has not advanced. Real billing and a model's wall-clock timeout must not be multiplied with fictional time.

Before considering dilation, establish which causal island shares the altered clock and how interactions cross its boundary. Another choice could be explicit admission, distributed event locations or a capped interactive core with separately authorized spectators. None should be silently introduced as an optimization.

**Experiment to borrow.** Reproduce a hotspot with both combat and noncombat activity, plus neighbors receiving migrations and messages. Test reservation queues, altered traffic patterns and recovery. Measure achieved simulation time, command latency, interaction completeness and neighboring-world health. Decide overload behavior before the live event, not during data loss.

## 4. Factorio: removing work can matter more than parallelizing it

**Documented evidence.** The developers' 2024 optimization account describes avoiding updates for inactive systems and replacing repeated radar-related work with chunk-level bookkeeping. It also illustrates how actual player-created configurations expose costs that ordinary expectations miss. [S12](../sources.md#s12)

**Interpretation for OpenLegend.** A million persisted objects should not imply a million per-step callbacks. A completed building, an inert rock and a sleeping process can have stable durable identity while receiving no work until a relevant change or deadline.

The same principle applies to awareness and memories: unchanged conditions need not create another permanent episode or another model completion. However, whether an NPC has a continuing reason to reconsider is a semantic decision. Eliminate redundant computation while preserving required reminders, observations and continuity.

Use compact family-specific iteration where profiling warrants it. An immutable rule definition can be shared across many instances; mutable fuel, ownership and action state cannot. Measure allocation, cache behavior and finalization rather than assuming that an entity-component-system rewrite automatically improves them.

**Experiment to borrow.** Hold active processes constant while increasing dormant objects. Required active work should remain close to constant apart from deliberate index maintenance and a bounded working-set effect. Then activate a large subset simultaneously and measure the wake burst. A system that is cheap only while nothing changes is not yet qualified.

## 5. Unreal Replication Graph: share relevance work without sharing private knowledge

**Documented evidence.** Epic documents persistent replication structures that can share work among connections, rather than repeatedly evaluating every actor independently for every recipient. [S06](../sources.md#s06)

**Interpretation for OpenLegend.** Reuse public geometry, immutable source descriptions, spatial candidate lists and common encoded fragments. Keep the observer-specific permission and evidence step separate. Two people in the same square may have different senses, recognition or access to an object.

An implementation can share a conservative cell candidate set and then run exact per-observer tests. It can reuse the source utterance bytes while recording distinct intelligibility and acquisition. It cannot reuse an NPC's private context simply because another NPC is nearby.

**Experiment to borrow.** Compare per-recipient rebuilding with shared candidate structures under movement and geometry edits. Verify exact authorized results against a reference path. Include boundary churn and cold joins, where maintaining shared structures and sending new baselines may dominate steady-state deltas.

## 6. VALORANT and snapshot interpolation: responsiveness has multiple layers

**Documented evidence.** Riot's netcode discussion and Fiedler's interpolation treatment explain complementary approaches to server authority, prediction, buffering and visual smoothness. [S13](../sources.md#s13), [S14](../sources.md#s14)

**Interpretation for OpenLegend.** A player can see a destination marker and predicted motion immediately while the server remains responsible for reach, collision and consumption. A remote actor can animate between authoritative samples. A trade or new recipe cannot become valid simply because the browser predicted it.

Keep reliable event identity apart from replaceable transforms. Reconciliation should correct presentation without silently repeating a command. A world restore invalidates old baselines and speculative UI state through an explicit timeline change.

**Experiment to borrow.** Measure input-to-feedback, command-to-commit, commit-to-client and correction magnitude under jitter. Choose interpolation/prediction only after observing the tactical control style. Do not adopt shooter tick rates or rewind the entire social world for latency compensation.

## 7. Halo services and Orleans: durable identity is useful; actor activation is not a transaction

**Documented evidence.** The Orleans technical report discusses game backend services, including Halo presence, alongside application-controlled persistence and failure-time activation behavior. The separate Halo conference session is an additional primary lead, but its video was not reviewed. [S05](../sources.md#s05), [S61](../sources.md#s61)

**Interpretation for OpenLegend.** An actor-like abstraction can make a world, session or agent easy to address independently of its current machine. That does not require one operating-system process per NPC or a network RPC for every local body update.

Treat a runtime activation as a host for work, not sufficient proof of exclusive persistent ownership. Conserved state needs a storage-enforced generation or equivalent transactional owner check. Keep presence data reconstructible where its contract allows, while inventory and accepted promises require stronger durability.

**Experiment to borrow.** Start two would-be owners under a delayed failure detector. Only one may advance the authoritative head; the old one must fail after takeover. Repeat a command after a lost acknowledgment and verify one effect. This tests the game's guarantee rather than the framework's name.

## 8. RING and Sirikata: interest need not be a single circular radius

**Documented evidence.** RING studies visibility-based communication. Sirikata proposes distributed queries informed by visible size rather than a universal short-distance restriction. [S49](../sources.md#s49), [S50](../sources.md#s50)

**Interpretation for OpenLegend.** A mountain, tower or large fire may matter at a distance where a small object does not. Candidate selection can use extent and permitted significance without creating an all-world detailed feed. This is particularly relevant to an elevated world with user-authored structures.

Keep the sensory owner decisive. A visible distant silhouette does not reveal its contents, exact private identity or occupants. A large structure can have coarse public presentation and separately authorized local interaction detail without two physical authorities.

**Experiment to borrow.** Add one enormous landmark, many small local items and a secret interior. Measure horizon delivery and exact nearby interaction separately. Move and edit the landmark to test invalidation. Do not accidentally exclude a giant object because its center lies outside the usual query radius.

## Combined lesson

The common lesson is not a specific engine, database or tick frequency. It is **a clear unit of authority, deliberate population/interaction boundaries, shared work where valid, and measurements driven by actual content**.

For OpenLegend, the most credible progression remains one recoverable multiplayer world, a fleet of independently placed worlds, and only then a separately proven strategy for a particularly hot world. Browser delivery, AI-rich characters and evolving mechanics add their own budgets at every stage. The [research panel](research-panel.md) explains why impressive population numbers elsewhere cannot substitute for those measurements.
