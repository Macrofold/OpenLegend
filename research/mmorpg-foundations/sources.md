# Primary sources and evidence limits

Checked **2026-11-09**. Publication dates below describe the source, not the date of a newly verified deployment. Living documentation can change; this register records the inspected section and supported claim. No inaccessible full talk, benchmark, proprietary source or uninspected PDF is treated as read. External examples establish mechanisms and failure modes, not OpenLegend capacity. Recommendations in this corpus are analysis drawn from these sources and the pinned repository baseline.

## S01

**AWS, “Host persistent world games on Amazon GameLift Servers,” June 18, 2025.** [Article](https://aws.amazon.com/blogs/gametech/host-persistent-world-games-on-amazon-gamelift-servers/).

Inspected lifecycle, session mapping and persistence guidance. Persistent world records and routing must outlive an individual hosting session. Its example hosting and database choices are examples, not a measured thousand-player simulation or an adopted OpenLegend stack. An idle-session teardown example does not settle autonomous NPC advancement policy.

## S02

**AWS, Amazon GameLift Servers FAQ, current page checked November 9, 2026.** [FAQ](https://aws.amazon.com/gamelift/servers/faqs/), sections on persistent sessions and player limits. Cross-check: [CreatePlayerSession API](https://docs.aws.amazon.com/gameliftservers/latest/apireference/API_CreatePlayerSession.html).

Managed player-session functionality is limited to 200 players per game session; the FAQ distinguishes custom session management and recommends custom EC2/ECS/EKS solutions for partitioned MMOs with thousands of players. This is not a 200-player limit on EC2 hardware, a whole fleet, or every use of GameLift. Recheck before product selection.

## S03

**Agones, “Scheduling and Autoscaling,” current documentation.** [Manual](https://agones.dev/site/docs/advanced/scheduling-and-autoscaling/).

Inspected allocation versus pod placement versus scale-down, packed scheduling, protection against eviction during gameplay, and cloud autoscaler integration including GKE. It manages server-process/fleet placement; it does not implement OpenLegend's cell authority, coherent clock, persistent state or AI job migration. No Agones/GKE adoption is selected.

## S04

**CCP, “Introducing Time Dilation (TiDi),” April 22, 2011.** [Developer article](https://www.eveonline.com/news/view/introducing-time-dilation-tidi).

Historical explanation of accumulated server work and deliberate coherent slowdown. Useful evidence that overload behavior affects game semantics. Its timing policy and historical internal performance proportions are not OpenLegend settings or a current EVE benchmark.

## S05

**CCP, “Server Deep Dive — The Power of Pretty,” February 19, 2025.** [Developer article](https://www.eveonline.com/news/view/paint-your-ship-red-and-make-it-faster).

Inspected simulation-frame, spatial fan-out and cosmetic delivery discussion. Separating cosmetics from simulation required additional location tracking and internal traffic. Its cosmetic traffic demonstration does not establish a corresponding speedup for authoritative physical simulation, NPC cognition or large-battle mechanics; the article's closing future questions are not shipped capabilities.

## S06

**Jagex, “More Worlds, More Power: The Road To Greater Capacity,” August 7, 2025.** [Infrastructure report](https://secure.runescape.com/m=news/more-worlds-more-power-the-road-to-greater-capacity?oldschool=1).

Inspected per-world hosting and shared-infrastructure constraints. Adding worlds also required work on underlying infrastructure. Plans for cloud-hosted worlds in this historical report are not proof of their present rollout status. OSRS populations and cycles are not equivalent to OpenLegend's independent sensory/evidence/cognition workload.

## S07

**ArenaNet, “Introducing the Megaserver System,” April 2014 feature announcement.** [Official description](https://www.guildwars2.com/en/news/introducing-the-megaserver-system/).

Describes assigning players among map copies using social and population considerations. Relevant contrast: distributing interchangeable map populations does not reconcile distinct persistent histories. The announcement's prototype/simulation numbers are not current capacity measurements and are not carried into OpenLegend estimates.

## S08

**Raph Koster, original UO lead designer, “Did players destroy the UO ecology?”, page updated August 28, 2024.** [Firsthand correction](https://www.raphkoster.com/games/snippets/did-players-destroy-the-uo-ecology/).

Separates expensive radial search/pathfinding from the closed-economy resource-hoarding problem, and describes a substantial multiserver rearchitecture as expected concurrency expanded. This is a firsthand retrospective, not a surviving production profiler or complete specification. Do not repeat the simplified story that players merely killed everything and therefore all simulation failed.

## S09

**Wube, “Friday Facts #364 — 1.1 stable,” January 29, 2021.** [Developer report](https://www.factorio.com/blog/post/fff-364).

Inspected multithreaded belts, independent transport groups and wake-up issues. Useful evidence for dependency-aware parallelism and deterministic integration. Factorio's lockstep factory workload and independent-group structure do not establish a suitable general MMORPG scheduler.

## S10

**Epic, “Replication Graph,” current Unreal documentation.** [Manual](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine).

Persistent nodes and reusable candidate lists avoid repeating every actor/client relevance calculation. The example replicated-actor count is not a count of independent reasoning NPCs. Network relevance is not personal perception, memory permission or simulation existence.

## S11

**Epic, “World Partition,” current Unreal documentation.** [Manual](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine).

Inspected grid-based streaming and streaming-source semantics. It supplies an example of residency management rather than proof that one persistent autonomous simulation is distributed across machines. A player-driven streaming source is not sufficient by itself for continuing NPC obligations.

## S12

**Epic, “Large World Coordinates,” current Unreal documentation.** [Manual](https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-in-unreal-engine-5).

Inspected double-precision changes across systems and warnings about narrower interface conversions. The relevant lesson is whole-path numeric precision, not adoption of Unreal, its advertised maximum extent or a universal requirement to make every field a double.

## S13

**Godot, “Large world coordinates,” stable documentation.** [Manual](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html).

Explains loss of floating-point resolution away from the origin and differences between scalar and vector representation. Its recommended coordinate ranges are Godot examples, not safe operating limits for OpenLegend's particular collision tolerances and providers.

## S14

**Google SRE book, “Handling Overload.”** [Chapter](https://sre.google/sre-book/handling-overload/).

Inspected resource-sensitive capacity, overload and the weakness of request count as a cost proxy. Web-service degradation examples are not permission to return false physical results or discard accepted gameplay effects.

## S15

**Google SRE book, “Addressing Cascading Failures.”** [Chapter](https://sre.google/sre-book/addressing-cascading-failures/).

Inspected resource exhaustion, retry/queue feedback and loss of useful throughput during overload. Relevant to shared hosts, database/provider stalls and reconnect storms. No quantitative reserve or autoscaling threshold is transferred from its examples.

## S16

**David Yanacek / Amazon Builders' Library, “Avoiding insurmountable queue backlogs,” December 5, 2019.** [Article](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/) (redirects to AWS Builder Center).

Inspected backlog modes, latency and usefulness of delayed results. A durable queue can preserve work while making recovery prohibitively slow. It does not justify a new broker for OpenLegend, automatic replay of paid inference, or dropping accepted authoritative effects.

## S17

**PostgreSQL 18, “Table Partitioning.”** [Versioned manual](https://www.postgresql.org/docs/18/ddl-partitioning.html).

Inspected partition-key and unique/primary-key restrictions. Physical partitioning must fit actual query/identity semantics; it is not a substitute for world-scoped keys. No partition-per-world, distributed SQL, or database migration is selected here.

## S18

**PostgreSQL 18, “Multicolumn Indexes.”** [Versioned manual](https://www.postgresql.org/docs/18/indexes-multicolumn.html).

Inspected leading-column constraints and scan behavior, including documented skip-scan qualifications. World/owner/time query shape and data distribution must be measured; a LIMIT or an index's mere existence does not prove bounded examined work.

## S19

**PostgreSQL 18, “Routine Vacuuming.”** [Versioned manual](https://www.postgresql.org/docs/18/routine-vacuuming.html).

Inspected MVCC old-row reclamation, ordinary vacuum versus FULL, and I/O implications. Logical deletion, reusable database space and space returned to the operating system differ. This is a reason to include maintenance and mature-world storage in qualification, not to schedule disruptive FULL vacuum as a default.

## Repository evidence

The [baseline chapter](01-baseline-and-existing-coverage.md) records inspected source paths/ranges and the unavailable implementation branch. Current source is pinned to `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977`; older source hashes and benchmarks inside the native design keep their own provenance. The [native design](../../docs/projects/native-simulation-core-tech-design.md), [product principles](../../docs/product-scalability/README.md), [scheduling contract](../../docs/performance/scheduling.md), [record ownership](../../apps/server/src/world-record-schema.ts), and [earlier regional architecture](../../archive/07-technical-architecture/data-delivery-and-scale.md) are the principal internal references.

## Research limits

No claim here reproduces a studio's benchmark or proves its proprietary server internals. Current provider limits were checked, but cloud pricing, availability by region and rollout status were not exhaustively inventoried because no provisioning choice is being made. Prior-chat retrieval is partial. A new design must recheck changed APIs and reconcile the actual implementation branch. Those limits do not prevent the immediate interface and lifecycle recommendations; they prevent false claims of achieved scale or completed implementation.
