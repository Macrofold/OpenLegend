# 05 — Data layout, concurrency, and memory

Research reviewed on **2026-10-23**. This chapter explains mechanisms in Unreal Engine 5.8 and Unity 6.6; it does not propose an OpenLegend implementation. Current patch and evidence rules are recorded in [01 — Versions and evidence](01-evidence-and-version-baseline.md). The verified editor patches are Unreal **5.8.4** and Unity **6000.6.7f1**. Package documentation can describe a release family without proving the package versions resolved by every later editor patch.

## What the two engines separate

Updating many similar objects efficiently involves several independent decisions: which objects need work, how their data is stored, which calculations may run together, when a result becomes visible, and who releases the memory. An entity component system addresses some of these questions; it does not supply the world's rules, a database transaction, permission checks, or deterministic ordering of every effect.

Unreal's Mass and Unity's Entities both organize homogeneous data into batches. They coexist with their engines' object-oriented facilities. The relevant comparison is therefore between concrete data and execution paths, rather than a claim that one entire engine is an entity component system. In OpenLegend's context, a calculation over positions, a character's private recollection, and a committed change to the world are different consumers even if all three mention the same character. Their shared identity does not make their memory layout, access rights, or lifecycle identical. This paragraph is comparative analysis, not a proposed design.

### Version ledger for the runtime packages studied

The following is the **6000.6.0f1 release-note package matrix**, not a claim that these are the latest independently available releases. Integrated core packages track the editor; other packages have separate release histories. Unity's Entities package page explicitly describes the core-package version relationship. [Unity package matrix](https://unity.com/releases/editor/whats-new/6000.6.0f1); [Entities package status](https://docs.unity3d.com/6000.6/Documentation/Manual/com.unity.entities.html).

| Package or group | Recorded version |
| --- | --- |
| Collections; Entities; Entities Graphics; Unity Physics; Netcode for Entities; Transport | 6.6.0 |
| Burst | 2.0.0 |
| Addressables | 2.11.2 |
| Netcode for GameObjects | 2.13.2 |
| Character Controller | 1.4.5 |
| AI Navigation | 2.0.14 |
| Behavior | 1.0.16 |
| AI Inference, branded Sentis | 2.6.1 |
| ML-Agents | 4.1.0 |
| Input System | 1.20.0 |
| Test Framework | 1.8.0 |
| Performance Testing; UI Test Framework | 6.6.0 |
| Memory Profiler | 1.1.12 |
| Profile Analyzer | 1.4.0 |
| Multiplayer Play Mode; Dedicated Server | 3.0.0 |
| Multiplayer Tools | 2.2.10 |
| Multiplayer Services | 2.3.1 |
| Scriptable Build Pipeline | 3.0.3 |
| Project Auditor, added | 2.0.0 |

The verified **6000.6.7f1** patch separately updates Input System to **1.20.1**, Profile Analyzer to **1.4.2**, AI Navigation to **2.0.16**, and Multiplayer Services to **2.4.0**. This is patch-specific evidence; the package matrix above must not silently be relabeled as the complete resolved package set of that patch. [6000.6.7f1 release notes](https://unity.com/releases/editor/whats-new/6000.6.7f1).

## Unreal Mass: composition and batches

Mass represents data as **fragments**, associates fragments and zero-data tags with entities, and groups entities with the same composition into **archetypes**. Contiguous chunks make a processor's batch of relevant data available together. Processors perform operations over matching entities; chunk fragments hold information shared at that storage granularity. World-lifetime subsystems and the entity manager manage the surrounding lifecycle. Composition changes can relocate an entity, so `MassCommandBuffer` records changes for deferred application after a processing batch. A handle to an entity and a pointer into its current storage have different lifetimes. [Mass Entity overview](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine).

The newer **QueryExecutor** interface makes a processor's requirements explicit in types: mutable fragments, read-only subsystems, and tag requirements become part of the query declaration. It is an optional simplification of processor implementation, and still connects to the phase executor through an ordinary Mass processor. The documentation's possible future removal of that wrapper is not a shipped capability. This is an API for expressing work and access requirements, not evidence that arbitrary gameplay becomes faster or thread safe. [Simplified Mass processors](https://dev.epicgames.com/documentation/unreal-engine/simplified-mass-processor).

**Analysis.** Batch locality is most useful when many entities undergo the same operation over a small subset of fields. Highly individual interactions, pointer-heavy relationships, frequent composition changes, and transitions into heavier actor representations add different costs. Counting entities alone cannot establish capacity: two scenes with the same population can have very different query matches, component sizes, transition rates, and cross-entity dependencies.

## Unity Entities: storage, change tracking, and mutation

### Archetypes and chunk occupancy

Entities 6.6 also deprecates managed component and managed shared-component representations, with removal planned for a future version. The current migration guide identifies classes and structs containing managed references as affected. A tutorial that presents managed components as an equally current long-term alternative therefore needs this qualification; the deprecation does not mean those components have already been removed. [Entities 6.6 upgrade guide](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html).

In Entities 6.6, an archetype is an exact component-type combination. Chunks are **16 KiB** blocks containing component arrays and entity identifiers; the same array index identifies one entity's fields. Queries select matching archetypes. Deletion fills a gap with the last entity in the chunk, and an empty chunk can be released. Archetypes themselves remain for the lifetime of their world. Consequently, dense iteration is a property of this representation, while stable array positions are not. [Archetype concepts](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/concepts-archetypes.html).

Creating or destroying an entity, adding or removing a component, and changing a shared-component value are **structural changes**. They can move data between chunks and invalidate access held by running work. The documented immediate operations run on the main thread and require synchronization with affected jobs. Changing a normal component's value is a different operation; it need not change the entity's composition. [Structural changes](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/concepts-structural-changes.html).

### Deferred changes and a significant 6.6 documentation difference

An **entity command buffer** records commands now and plays them back later. Jobs can produce commands while a designated playback point applies structural work. This moves mutation to an explicit boundary; it does not remove relocation or synchronization costs.

The 6.6 manual now says that command-buffer creation and instantiation allocate **valid entity identifiers immediately**, while assigning chunk storage only at playback. Before playback, those entities cannot be accessed through normal entity-manager operations or queries. References can be stored or passed to another buffer, but the creating buffer must play back first. For instantiation, the root identifier is allocated first; linked child entities are created during playback. Older explanations centered on temporary negative identifiers and later remapping must not be assumed to describe this release. Separate buffers also avoid accidental interleaving of unrelated producers' sort keys. Editor safety checks are not a substitute for correct lifetimes in a shipping build. [Entities 6.6 command buffers](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-entity-command-buffers.html).

### Several meanings of “changed”

**Enableable components** let an entity retain storage while participating in queries as if a disabled component were absent. They are intended for frequently changing states; they avoid structural changes and can reduce the number of distinct archetypes. They do not imply that every infrequently changing condition should be represented this way. [Enableable component introduction](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/components-enableable-intro.html).

A query's **change filter** operates on whole chunks. It observes that a system declaring write access has run against a chunk, rather than comparing every component value. One potential writer can therefore make all entities in that chunk pass the filter. Shared-component filters select groups by shared values; enableable filters apply entity-level enabled state. Filters remain attached to a query until reset, and previously materialized arrays do not update when its filter changes. These details distinguish conservative work avoidance from a precise log of what happened to each character. [Entity query filters](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-entityquery-filters.html).

**Blob assets** are a complementary representation for immutable unmanaged data. Relative offsets make their internal references relocatable, and their immutability allows concurrent use by jobs and Burst. Managed references are excluded, and the API's by-reference access preserves those relative-address semantics. This suits shared read-only data; mutable character experience has different requirements. [Blob asset concepts](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/blob-assets-concept.html).

**Analysis.** Chunk-level change detection can safely overselect work, but it does not establish event identity, precise causation, or which person learned a fact. Likewise, an allocated identifier does not establish that an object is queryable, fully initialized, published, or durable. These are distinct milestones in a producer-to-consumer lifecycle.

## Task scheduling: dependency graphs and ownership

### Unreal's Tasks System

Unreal's Tasks System and TaskGraph share a backend scheduler and workers. A task can declare prerequisites; absent a dependency, execution order is not guaranteed. Nested tasks express completion dependencies: the parent is complete only after its own body and nested work finish. Pipes serialize access through a sequence of tasks. Dropping a task handle is not cancellation.

The current manual also records an important scheduling change: **oversubscription replaced busy waiting in 5.5**. Waiting can awaken additional standby threads, which park again after the oversubscription period and their current task finish. The tradeoff is additional thread memory in exchange for avoiding the old busy-waiting deadlock and latency problems. Dependencies still avoid blocking workers in the first place. A higher task priority influences scheduling; it does not prove a bounded completion time or define gameplay ordering. [Tasks System](https://dev.epicgames.com/documentation/unreal-engine/tasks-systems-in-unreal-engine).

### Unity Jobs and Burst

Unity's job system schedules work over native worker threads, with work stealing when a worker exhausts its own queue. Job data is copied when scheduled, while native containers expose shared backing memory. Jobs can be used without Entities; Burst is the compiler for a restricted, unmanaged subset of C#, rather than an automatic parallelizer for arbitrary managed object graphs. These are separate capabilities. [Job system overview](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-overview.html).

Scheduling takes place on the main thread. A scheduled job cannot simply be interrupted; completion is also the point at which ownership and safety bookkeeping are returned to the caller. Mutable static data lies outside the intended safety model. A dependency handle declares that a consumer must wait for a producer, and completing a dependency chain completes the work on which it depends. [Creating jobs](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-creating-jobs.html); [Job dependencies](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-job-dependencies.html).

Native-container access annotations matter: concurrent readers are allowed, while conflicting writers require ordering. Allocation lifetimes are explicit. `Temp` is short-lived and cannot be passed as a job field's allocation; `TempJob` must be disposed within four frames; `Persistent` supports longer lifetimes. These choices concern allocation and release costs, not permission to read unfinished work. [Native containers and allocators](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-native-container.html).

Entities system groups add another ordering layer. Creation constraints, update constraints, and destruction order are distinct. `UpdateBefore` and `UpdateAfter` apply among direct children of a group; hierarchical grouping determines the larger update sequence. Disposal reverses actual creation order. A system's place in that sequence is not itself proof that every asynchronous job it scheduled has finished. [System update order](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-update-order.html).

### Where concurrency moves costs

The following table is analysis of the preceding mechanisms, not measured performance results.

| Mechanism | Work it can avoid or overlap | Work or obligation that remains |
| --- | --- | --- |
| Contiguous component batches | Repeated object dispatch and unrelated field access | Query selection, sparse occupancy, relocation, cross-entity reads |
| Deferred structural commands | Immediate synchronization at every individual mutation | Buffer allocation, command ordering, playback, visibility delay |
| Dependency graph | A worker blocking while waiting for known prerequisite work | Accurate read/write declarations and a critical path through dependencies |
| Work stealing | Workers idle while another queue has runnable tasks | Scheduling overhead and limits from serial or conflicting work |
| Immutable shared data | Repeated copies and locks around unchanged data | Version/lifetime ownership and changes requiring a new representation |
| Lower-frequency work | Recomputing unchanged or low-detail results every frame | Temporal error, missed boundaries, and transition work when detail increases |

For autonomous worlds, a dependency can be more than a memory hazard: two simultaneous actions may compete for the same object, or one event may change what another character can perceive. Thread safety prevents unsafe access; it does not choose the world's rule for resolving those interactions. Determinism and authority are treated further in [07](07-networking-persistence-and-replay.md) and [10](10-profiling-and-verification.md).

## Garbage collection, native allocation, and residency

### Unreal UObject collection

Unreal's incremental reachability analysis is explicitly **Experimental** in the current documentation. It distributes part of UObject collection across frames with a **soft** time budget; the configured slice is not a hard frame-time guarantee. Its write barrier depends on references represented by `TObjectPtr`, including relevant references exposed by `FGCObject`. Leaving raw reflected references on a path that requires the barrier can allow a live object to be collected prematurely. Incremental reachability is not a general collector for all native allocations, and it does not imply that every phase of object destruction is incremental. [Incremental garbage collection](https://dev.epicgames.com/documentation/unreal-engine/incremental-garbage-collection-in-unreal-engine).

### Unity managed collection

Unity 6.6 documents the **Boehm–Demers–Weiser** collector. Incremental collection is the default on supported platforms: it spreads interruptions across frames, rather than reducing the total work by definition. Reference churn can require rescanning during incremental marking. The Web platform does **not** support incremental collection. A native-platform frame-time chart therefore cannot establish browser behavior. [Garbage collection modes](https://docs.unity3d.com/6000.6/Documentation/Manual/performance-incremental-garbage-collection.html).

Unity's September 2026 engineering article distinguishes reclaiming unreachable managed objects from reducing operating-system memory usage. Its current collector is conservative and non-moving: free areas may be reusable without compacting surviving objects or immediately returning pages to the OS. Fragmentation and large allocations can therefore matter even after collection. The article discusses CoreCLR as an ongoing transition, not proof that Unity 6.6 already uses a general-purpose compacting CoreCLR collector everywhere. [Understanding memory management](https://learn.unity.com/article/understanding-memory-management-in-unity).

**Analysis.** “Allocated,” “live,” “reserved,” “resident,” and “referenced by an asset bundle” answer different questions. A falling managed-object count does not prove falling browser or process memory. Pooling reduces some repeated allocation but deliberately retains capacity. An engine-native allocation's lifetime can also outlast the managed wrapper used to request it. The appropriate evidence identifies which owner retained which memory, rather than treating one counter as total world cost.

## The current browser boundary

Unity 6.6's Web documentation explicitly supports **native C/C++ multithreading and Burst-compiled jobs**, while standard managed C# threads remain unsupported. Native multithreading must be enabled, and the hosting context must satisfy secure-context and cross-origin-isolation requirements for shared memory. The manual lists COOP, COEP, and resource-policy headers; those deployment conditions are part of the capability. Managed timer callbacks and cancellation timeouts that rely on unsupported threads can fail to run. [Web multithreading introduction](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-intro.html).

Burst jobs use native worker execution when that Web capability is enabled. Jobs lacking Burst compilation run on the main thread; disabling native multithreading also brings execution back to the main thread. The documented minimum Burst version for this Web path is 1.8.26, while the 6.6.0 release matrix records Burst 2.0.0. These are a minimum requirement and a package baseline, respectively. [Burst multithreading on Web](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-burst.html).

This corrects a potentially misleading blanket statement that Unity Web is single-threaded. The supported subset matters, as does the distinction between asynchronous work and CPU parallelism. It does not establish that an OpenLegend browser client can assume Unity's native job scheduler, data model, or allocation behavior.

## Provenance and reading register

All sources below were inspected as text on 2026-10-23. Versioned documentation establishes the stated family, not a measured performance result. “Current” Epic pages may retain older examples; only the mechanisms actually supported by their text are used.

| Source | Date/version and medium | Material inspected and limits |
| --- | --- | --- |
| [Unity 6000.6.0f1](https://unity.com/releases/editor/whats-new/6000.6.0f1) | 2026-08-31; release notes | Relevant package matrix; not an exhaustive latest-package claim. |
| [Unity 6000.6.7f1](https://unity.com/releases/editor/whats-new/6000.6.7f1) | 2026-10-21; release notes | Patch date and package changes. |
| [Entities package](https://docs.unity3d.com/6000.6/Documentation/Manual/com.unity.entities.html) | Unity 6.6; manual | Core-package version relationship. |
| [Mass Entity](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine) | UE 5.8 page; manual | Data, queries, processors, deferred composition. |
| [QueryExecutor](https://dev.epicgames.com/documentation/unreal-engine/simplified-mass-processor) | UE 5.8 page; technical guide | Typed requirements and current processor wrapper. |
| [Archetypes](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/concepts-archetypes.html) | Entities 6.6.0; manual | Chunk layout and lifecycle. |
| [Upgrade guide](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/upgrade-guide.html) | Entities 6.6.0; migration reference | Managed-component deprecation; current compatibility distinction. |
| [Structural changes](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/concepts-structural-changes.html) | Entities 6.6.0; manual | Mutation categories and synchronization. |
| [Command buffers](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-entity-command-buffers.html) | Entities 6.6.0; manual | Immediate identifier allocation, delayed storage, producer safety. |
| [Enableable components](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/components-enableable-intro.html) | Entities 6.6.0; manual | Query membership without archetype movement. |
| [Query filters](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-entityquery-filters.html) | Entities 6.6.0; manual | Chunk-level potential-write tracking, filtering lifetime. |
| [Blob assets](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/blob-assets-concept.html) | Entities 6.6.0; manual | Immutability and relocatable references. |
| [Tasks System](https://dev.epicgames.com/documentation/unreal-engine/tasks-systems-in-unreal-engine) | UE 5.8 page; manual | Graphs, nested work, pipes, waits, oversubscription. |
| [Jobs overview](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-overview.html) | Unity 6.6; manual | Workers, work stealing, data access. |
| [Creating jobs](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-creating-jobs.html) | Unity 6.6; manual | Scheduling, completion, unsafe static access. |
| [Job dependencies](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-job-dependencies.html) | Unity 6.6; manual | Producer-consumer handles. |
| [Native containers](https://docs.unity3d.com/6000.6/Documentation/Manual/job-system-native-container.html) | Unity 6.6; manual | Access annotations and allocator lifetimes. |
| [System order](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/systems-update-order.html) | Entities 6.6.0; manual | Creation, grouped updates, disposal. |
| [Incremental UObject GC](https://dev.epicgames.com/documentation/unreal-engine/incremental-garbage-collection-in-unreal-engine) | UE 5.8 page; Experimental guide | Reachability slices and reference-barrier requirements. |
| [Unity GC modes](https://docs.unity3d.com/6000.6/Documentation/Manual/performance-incremental-garbage-collection.html) | Unity 6.6; manual | Incremental behavior, marking churn, Web exclusion. |
| [Unity memory article](https://learn.unity.com/article/understanding-memory-management-in-unity) | 2026-09-18; engineering article | Managed heap, OS memory, non-moving GC, prospective CoreCLR. |
| [Web threading](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-intro.html) | Unity 6.6; manual | Native/managed distinction and hosting prerequisites. |
| [Burst Web jobs](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-burst.html) | Unity 6.6; manual | Native execution versus main-thread fallback. |

No engine workload was executed for this chapter. No entity-count, latency, memory, or speedup claim is inferred from API availability.
