# Current Unreal and Unity runtime systems

| Research status             | Scope                                                                                              | Evidence cutoff |
| --------------------------- | -------------------------------------------------------------------------------------------------- | --------------- |
| Completed research snapshot | Current engine mechanisms, OpenLegend context, and relevant research frontiers; 13 linked chapters | 2026-10-23      |

This collection investigates **how current Unreal and Unity systems work**: what creates work, how it is organized and scheduled, what can be reused, what invalidates it, and what the result actually guarantees. It relates those mechanisms to OpenLegend's current implementation and intended engine/world scope. It is comparative research; accepted product decisions and implementation responsibilities remain in the repository's existing owners.

The verified released-engine baseline is **Unreal Engine 5.8.4** and **Unity 6.6, editor 6000.6.7f1**. Package versions and feature maturity are recorded separately. [Chapter 01](01-evidence-and-version-baseline.md) provides the release evidence, version policy, source classifications, and access limitations. Research publications are identified by their actual paper revision or presentation date, with their experimental conditions retained.

## Start here

Read [OpenLegend context and coverage](00-openlegend-context-and-coverage.md) first for the connection to the current code, intended systems, and qualified historical performance evidence. Then read [evidence and versions](01-evidence-and-version-baseline.md) before using any subsystem claim as a statement about a current engine release.

For the motivating observation/prediction workload, the most direct sequence is [simulation and perception](02-simulation-and-perception.md), [AI and navigation](03-ai-navigation-and-crowds.md), [physics and queries](04-physics-and-spatial-queries.md), [data and concurrency](05-data-concurrency-memory.md), and [profiling](10-profiling-and-verification.md). The remaining chapters matter because streaming, animation, networking, serialization, and content lifetimes can change the inputs, consumers, or validity of that work.

## Chapter map

| Chapter                                                                                             | Questions and mechanisms covered                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [00 — OpenLegend context and coverage](00-openlegend-context-and-coverage.md)                       | Current code versus target architecture; animal escape, perception, motion boundaries, historical profiles; a map from intended product systems to the research.                                                |
| [01 — Evidence and version baseline](01-evidence-and-version-baseline.md)                           | Exact release/patch provenance, independently versioned packages, maturity labels, current documentation drift, performance interpretation, and material actually inspected.                                    |
| [02 — Simulation and perception](02-simulation-and-perception.md)                                   | Tick phases and dependencies, fixed/frame clocks, catch-up, scheduled decisions, sight/hearing, candidate work, retained stimuli, deferred results, knowledge and fairness boundaries.                          |
| [03 — AI, navigation, and crowds](03-ai-navigation-and-crowds.md)                                   | Behavior Trees, StateTree, EQS, Unity Behavior, Smart Objects, neural inference/training, navigation construction and invalidation, asynchronous paths, avoidance, lane graphs, and population representations. |
| [04 — Physics and spatial queries](04-physics-and-spatial-queries.md)                               | Physics families, broad/narrow phases, filtering, contacts, sleeping, CCD, fixed/substeps, query completeness, characters, vehicles, 2D worlds, destruction, cloth, and soft bodies.                            |
| [05 — Data, concurrency, and memory](05-data-concurrency-memory.md)                                 | Actors/components, Mass, Entities, chunks/archetypes, structural changes, command buffers, dependency graphs, Jobs/Burst, ownership, synchronization, allocation, and collection.                               |
| [06 — World streaming and scale](06-world-streaming-and-scale.md)                                   | Spatial partitioning, residency, streaming sources, layers, HLOD, Fast Geometry Streaming, entity scenes, coordinates, population LOD, identity, unload/reactivation boundaries.                                |
| [07 — Networking, persistence, and replay](07-networking-persistence-and-replay.md)                 | Authority, replication/relevance, Iris, prediction versus anticipation, rollback, transport/admission, saves, serialization, identity restoration, replay, and determinism.                                     |
| [08 — Rendering, animation, and audio](08-rendering-animation-and-audio.md)                         | Render graphs, geometry, lighting/shadows, culling, batching, reconstruction, motion matching, pose budgets, rigging, VFX, sound graphs, voice budgets, spatial audio, and hearing semantics.                   |
| [09 — Content, tools, UI, and platforms](09-content-tools-ui-and-platforms.md)                      | Import/cooking and derived data, assets/dependencies, Addressables, procedural generation, terrain, generated-content boundaries, UI/input, accessibility, localization, browser/native/streamed execution.     |
| [10 — Profiling and verification](10-profiling-and-verification.md)                                 | Trace/timeline tools, CPU/GPU waits, allocation and retained memory, network instrumentation, profiling overhead, testing/capture tools, determinism limits, and interpretation of experiments.                 |
| [11 — Gameplay frameworks and semantic systems](11-gameplay-frameworks-and-semantic-systems.md)     | Abilities, effects, costs, attributes, tags, tasks, cancellation, features, definitions/registries, authored conversation, and the difference between reusable mechanics and world meaning.                     |
| [12 — Research frontiers and evidence boundaries](12-research-frontiers-and-evidence-boundaries.md) | Current motion-generation, embodied-agent, memory/action and multiagent papers; recent reconstruction, sensor/simulation and coroutine technical talks; methods and limits beyond shipping features.            |

Each subsystem chapter contains primary citations and a source register. Registers distinguish an inspected technical section from an abstract, API signature, search excerpt, transcript, or unavailable full presentation. They are evidence inventories, not a claim that every linked medium was consumed in full.

## Findings that connect the chapters

The following are **analytical comparisons across the cited chapters**, not proposed OpenLegend designs or measured OpenLegend outcomes.

### 1. Work has stages, and a budget usually constrains only some of them

Candidate discovery, exact evaluation, sorting, scheduling, completion callbacks, publication, and retention can have different costs and owners. An allowance on query testing does not automatically bound candidate generation or completion work. Similarly, a fast local movement choice can be surrounded by expensive observation or consequence processing. The engine comparison therefore follows complete lifecycles instead of equating one function's cost with the subsystem's cost. [Simulation and perception](02-simulation-and-perception.md), [AI and navigation](03-ai-navigation-and-crowds.md), [profiling](10-profiling-and-verification.md).

### 2. Reuse, deferral, approximation, and parallel execution are different operations

Reusing an answer requires validity conditions. Deferring it changes availability. Approximating it changes precision or coverage. Moving it to another processor changes placement and synchronization. Several can coexist, but they cannot be added together as if each removed all of the same work. In particular, requesting asynchronous work and immediately waiting for its answer can expose a dependency stall. [Physics and queries](04-physics-and-spatial-queries.md), [data and concurrency](05-data-concurrency-memory.md), [rendering and animation](08-rendering-animation-and-audio.md).

### 3. A pending answer is a meaningful state

A visibility query that has not completed, a partially computed path, a model output awaiting readback, and a completed negative result are different states. Work limits alone do not justify substituting one for another. The chapters preserve that distinction when discussing scheduling, cancellation, admission, and result consumers. Public APIs sometimes expose these states without establishing a complete worst-case latency or fairness guarantee; that limit is recorded. [Perception](02-simulation-and-perception.md), [AI execution and inference](03-ai-navigation-and-crowds.md), [network admission](07-networking-persistence-and-replay.md).

### 4. Visibility, relevance, awareness, and memory have different consumers

A camera's visible set, a connection's replicated set, an audio mix's selected voices, an observer's sensed state, and a character's remembered information are not interchangeable. The distinctions remain relevant even if these systems share spatial indexes or distance tests. Suppressing presentation work does not establish that an underlying event ceased to exist or that no character could learn about it. [Perception](02-simulation-and-perception.md), [networking](07-networking-persistence-and-replay.md), [audio](08-rendering-animation-and-audio.md), [semantic systems](11-gameplay-frameworks-and-semantic-systems.md).

### 5. Population scale depends on what each represented entity is doing

Stored entities, resident objects, rendered characters, pose evaluations, physics bodies, decision-makers, and independently retained histories are different populations. LOD and residency mechanisms act on particular representations or computations. A large visual crowd is not a measurement of the same number of continuously reasoning, physically interacting, persistently remembered participants. This also explains why counts from unrelated demonstrations cannot be converted directly into an OpenLegend capacity claim. [Data organization](05-data-concurrency-memory.md), [world scale](06-world-streaming-and-scale.md), [rendering](08-rendering-animation-and-audio.md).

### 6. Time is part of correctness, not just performance

Simulation progress, host wakes, physics steps, decision intervals, network ticks, animation playback, and asynchronous completion can use different clocks or cadences. Catch-up limits, buffering, partial rollback, interpolation, and delayed callbacks alter different parts of that timing. Smooth output does not prove that every intermediate mechanical consequence was evaluated. The research distinguishes throughput, response latency, temporal precision, and continuity rather than treating frame rate as their common substitute. [Simulation](02-simulation-and-perception.md), [physics](04-physics-and-spatial-queries.md), [network prediction](07-networking-persistence-and-replay.md), [motion research](12-research-frontiers-and-evidence-boundaries.md).

### 7. Persistence is more than serializing an object

Stored fields, restored references, object identity, network replay, agent recollection, and authoritative event history preserve different information. A format's ability to encode data does not itself specify reconstruction order, version compatibility, permissions, or which consequences occurred. The chapters examine these contracts without treating one engine's save API or a successful memory benchmark as a complete answer to persistent-world continuity. [Persistence and replay](07-networking-persistence-and-replay.md), [definitions and gameplay state](11-gameplay-frameworks-and-semantic-systems.md), [memory research](12-research-frontiers-and-evidence-boundaries.md).

### 8. Modern learned systems still have explicit boundaries

The recent papers expose concrete representations, input/output interfaces, control horizons, evaluation workloads, and unresolved limits. Motion synthesis, visual game control, memory use, and multiagent dialogue each demonstrate a particular capability. They do not collectively establish one production system with all of those guarantees. The research treats the environment and evaluation protocol as part of the result, and distinguishes an engine's inference runtime from the behavior of a model executed through it. [Learned controllers](03-ai-navigation-and-crowds.md), [recent primary research](12-research-frontiers-and-evidence-boundaries.md).

## Currency checks that matter when reading older material

The collection records concrete cases where a familiar description can be wrong for the current baseline. These are pointers to the detailed evidence, not additional feature recommendations:

| Area                            | What the chapter checks                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor versus package versions  | Launch defaults, later compatible patches, integrated core packages, and independently released tools are kept distinct. [01](01-evidence-and-version-baseline.md), [05](05-data-concurrency-memory.md), [09](09-content-tools-ui-and-platforms.md).                                                          |
| ECS lifecycle and allocation    | Current command-buffer identity/visibility semantics, managed-component status, and current versus future garbage-collector/runtime claims. [05](05-data-concurrency-memory.md).                                                                                                                              |
| Physics support and query modes | Legacy backend commentary, current collision-mode APIs, separate 2D APIs, and unsupported-package links surviving in current manuals. [04](04-physics-and-spatial-queries.md).                                                                                                                                |
| Feature maturity                | Release-specific status is checked separately for rendering, replication, inference, navigation, animation, and procedural tools. [03](03-ai-navigation-and-crowds.md), [07](07-networking-persistence-and-replay.md), [08](08-rendering-animation-and-audio.md), [09](09-content-tools-ui-and-platforms.md). |
| Browser capabilities            | Graphics support, native worker execution, managed threading, and remote video streaming are different claims. [05](05-data-concurrency-memory.md), [09](09-content-tools-ui-and-platforms.md).                                                                                                               |
| Research versions               | Revised papers, conference dates, accessible speaker notes, and actual transcript passages are recorded explicitly. [12](12-research-frontiers-and-evidence-boundaries.md).                                                                                                                                   |

A living manual can contain an old paragraph. A recent crawl can retrieve an old article. A released engine can include experimental features. Those distinctions are part of the findings, not incidental bibliography details.

## Scope, validation, and relationship to existing work

The [coverage map](00-openlegend-context-and-coverage.md) connects the engine study to OpenLegend's broader intended bodies, activities, ecology, construction, economy, relationships, institutions, communication, memory, and authored realities. Reusable engine machinery is separated from the domain-specific meaning of those systems. Commercial or community policy is not inferred from an unrelated engine API.

This is a documentation and primary-source research snapshot. No engine installation, runtime modification, fresh performance experiment, model training, provider call, or reproduction of a paper's experiment was performed. Independent review checked subsystem claims, timing/lifecycle distinctions, source provenance, and cross-chapter consistency. The report records inaccessible material rather than treating discovery as full inspection. It is comprehensive across the identified system families, while proprietary internals and uninspected media remain explicit evidence limits.

The previous [engine/platform research](../game-engines/README.md) and its recommendations remain separate. Accepted behavior and priorities remain in [architecture](../../docs/architecture.md), [engine/world boundaries](../../docs/engine-and-world-boundaries.md), [simulation time](../../docs/simulation-time.md), [performance](../../docs/performance.md), and [gameplay priorities](../../docs/repertoires/gameplay-priorities.md). This collection adds no adoption decision, implementation roadmap, backlog task, or benchmark authorization.
