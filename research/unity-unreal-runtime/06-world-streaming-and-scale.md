# 06 — World streaming, representation, and simulation scale

Research reviewed on **2026-10-23**, against the release families established in [01](01-evidence-and-version-baseline.md). This chapter studies how the engines limit resident content and active work. It contains no proposed OpenLegend architecture and no measured capacity claim.

## Several different meanings of “the world is loaded”

An authored place can exist in saved data while its meshes are absent from memory. Its meshes can be visible as a distant proxy while detailed actors are absent. An actor can exist on a server while being irrelevant to one network connection. A character can remember an event even after the place where it happened is unloaded. These are different lifecycles.

The table is an analytical distinction used throughout this chapter. It does not assert that either engine supplies all of these semantics automatically.

| Concern               | Question it answers                                                                 | What it cannot establish by itself                              |
| --------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Content residency     | Which scene, geometry, texture, and other asset data occupies memory?               | Whether the world's changes were durably saved                  |
| Representation detail | Is an object represented by a full actor, an instance, a proxy, or nothing visible? | Whether its mechanical behavior continues correctly             |
| Simulation detail     | Which calculations run, and how frequently or accurately?                           | Which client or character may know their results                |
| Network relevance     | Which connection receives which replicated objects and updates?                     | A complete model of perception, secrecy, or remembered evidence |
| Persistence           | Which identities and changes survive unloading or restarting?                       | That the original actors, jobs, or pointers remain valid        |

This separation matters to OpenLegend's combination of persistent authored places and autonomous characters. A rendering or bandwidth optimization does not, by itself, explain what an absent character does over elapsed world time.

## Unreal World Partition

### Cell selection and streaming sources

World Partition stores a world as a persistent level with streamable cells. Streaming sources, including player controllers and explicitly placed sources, request nearby content. Sources carry shapes, priorities, and target states: loaded versus activated. Overlapping sources resolve to the highest relevant priority and target state. A source can prepare a destination before a teleport, with completion queried separately from the request. Actor references can cause actors to be bundled and loaded together; spatial proximity alone therefore does not determine residency. Actors marked non-spatially loaded remain governed by their data-layer eligibility. [World Partition](https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine).

**Freshness qualification.** The overview still contains Runtime Spatial Hash examples and describes a default 2D hash. The current API also exposes Runtime Hash Set partitions, including **Loose Hierarchical Grid** configuration with cell size, origin, and 2D mode, and partition descriptors that connect a main partition to HLOD layers. This report does not promote the overview's older default wording into a claim about the preferred configuration for every 5.8 project. [Runtime partition grid API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/URuntimePartitionLHGrid); [Partition descriptors](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FRuntimePartitionDesc).

### Data Layers and HLOD

**Data Layer assets** describe project-level layer identity and type; **instances** hold world-specific use of those layers. Editor layers organize work. Runtime layers can change which sets are loaded or activated in response to gameplay. Loaded and activated are distinct states: content can be resident without being visible. Shared assets assigned across many runtime layers can worsen streaming cost, so a conceptual layer is not an independent memory compartment. The page retains older migration examples; its current runtime concepts are used here without treating those examples as 5.8 release changes. [Data Layers](https://dev.epicgames.com/documentation/unreal-engine/world-partition---data-layers-in-unreal-engine).

**Hierarchical level of detail (HLOD)** can show proxy geometry for unloaded cells. Its layers support instancing, merged meshes, or simplified merged meshes, with their own loading ranges and hierarchy. This addresses visual continuity and draw submission; the proxy is not evidence that the original actors' gameplay is executing. [World Partition HLOD](https://dev.epicgames.com/documentation/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine).

**Analysis.** Streaming is a pipeline, not a single disk read. Selecting files, resolving dependencies, creating runtime objects, registering collision and rendering resources, applying saved changes, and publishing usable content can have different completion points. Fast travel and a dense concentration of actors stress that transition even when the final steady-state resident set is modest. Several viewers moving apart can also increase the union of required cells; a distance limit around one viewer does not bound a server's total resident world.

### Fast Geometry Streaming: current, but Experimental

The 5.8 plugin index explicitly marks **Fast Geometry Streaming** Experimental and describes extraction and conversion of partitioned-world geometry to improve streaming. Its published transformer settings expose allowed and disallowed actor/component classes, exclusions for actors containing certain components, and optional surrogate components linked to physics bodies. This is a selective transformation with compatibility boundaries, rather than transparent acceleration of every actor. [Plugin status](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/FastGeoStreaming); [Transformer settings](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/FastGeoStreaming/UFastGeoTransformerSettings).

The current transform-storage API exposes automatic, compressed, and full representations. Automatic selection checks allowed position, rotation, and scale error; compressed storage uses `FTransform3f`, while full storage uses `FMatrix`. Memory footprint and precision are therefore explicit parts of the mechanism. These declarations establish available controls, not a measured speedup or proof that every collision integration works. [Instance storage modes](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/FastGeoStreaming/EFastGeoInstanceStorageMode).

Epic's June 2026 [Fast Geometry Streaming Guide](https://dev.epicgames.com/community/learning/knowledge-base/zqzP/unreal-engine-fast-geometry-streaming-guide) was discovered and dated, but its article body was unavailable through the retrieval interface. The readable API evidence above supports the bounded description; this research does not claim to have consumed the full guide or its videos.

## Significance and actor detail

### Ranking is separate from reducing work

Unreal's **Significance Manager** evaluates registered objects relative to supplied viewpoints and caches their scores. It does not improve performance by itself. A project supplies the scoring function and the behavior that changes after scoring. Across multiple viewpoints, the default result is the highest significance; ascending configuration uses the lowest. Evaluation can run in parallel, while sequential post-processing can consume a sorted order. The caller explicitly invokes updates; this is not an automatically running global budget. Consequently, scoring and registration have their own costs, and thread-safe evaluation remains a requirement. [Significance Manager](https://dev.epicgames.com/documentation/unreal-engine/significance-manager-in-unreal-engine).

### Mass separates three kinds of detail

MassGameplay distinguishes representation, simulation, and replication LOD. Representation may be a high-detail actor, low-detail actor, instanced static mesh, or no visible object, with pooling across transitions. Simulation LOD groups entities for variable-frequency processing. Replication LOD is evaluated per entity **and per connection**. Its four tiers and per-tier counts are control mechanisms; they do not demonstrate equivalent gameplay at all tiers. The overview retains an explicit 5.1 sentence about replication maturity, so that sentence alone is not used to establish current status. [MassGameplay overview](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-gameplay-in-unreal-engine).

The UE 5.8-targeted PersistenceLab sample identifies Mass Entity as production ready, while Mass gameplay/AI and Instanced Actors remain Experimental. This is narrower and more current evidence than assuming the maturity of every Mass plugin from the core framework's status. [PersistenceLab README](https://github.com/ZKShao-EpicGames/Sample-PersistenceLab).

### Instanced Actors and representation transitions

The current **Instanced Actors Manager** API describes regional managers that use Mass for distant instances and server-authoritative actor spawning near players. Managers also participate in replication and persistence. Offline population gives client and server a common stable instance dataset that can be referenced by index. That specific identity scheme depends on the shared dataset; it is not proof that an arbitrary mutable entity index is a durable world identifier. [Instanced Actors Manager](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/InstancedActors/AInstancedActorsManager).

**Analysis.** When a detailed actor is removed, any mutable information stored only inside that actor would disappear with it. Restoring the correct health, ownership, ongoing action, or remembered experience therefore requires evidence about where each value lives through the transition. A visual swap alone proves none of those properties. The persistence chapter examines Epic's current sample precisely because it makes some of that transfer explicit. Conversely, keeping a lightweight record alive does not show that it simulates the same interactions as the detailed actor.

## Unity Entities scene streaming

### Resolving metadata before loading content

Baking produces an entity-scene file whose header describes sections, bundle dependencies, and optional custom metadata. Loading first resolves that header and creates **scene and section meta entities**; loading section content is a later phase. Metadata can therefore remain available when the content itself is absent. Custom section metadata is authored during baking, making it possible for a caller to inspect information needed for a loading decision without materializing all scene entities. [Scene metadata](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-meta-entities.html).

`SceneSystem.LoadSceneAsync` normally starts an asynchronous operation and returns its meta entity. Flags can resolve metadata without automatically loading content, force a synchronous load, or request another instance. Unloading normally removes section content while retaining metadata for reuse. A GUID-only reference also has a build boundary: unlike a `SubScene` or `EntitySceneReference`, it does not by itself ensure the scene is included in a player build. A successful Editor load therefore does not prove the built application contains the required files. [Loading scenes](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-loading-scenes.html).

### Section dependencies and ownership

Entities scene sections have a scene GUID and section number. Section 0 must load before other sections and unload after them. Serialized entity references may point within the same section or into section 0; unsupported cross-section references become null on load. Instantiated entity prefabs inherit their section membership, so unloading that section also destroys associated instances unless that membership has been deliberately removed. Open subscenes in the Editor place all entities in section 0, another reason that editing-time behavior can conceal streaming-boundary problems. [Scene sections](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-scene-sections.html).

### Per-instance preparation in 6.6

Each section loads into a separate **streaming world**. `ProcessAfterLoadGroup` can transform its loaded entities before they move into the main world. The current `RequestSceneLoaded.ImportEntity` mechanism copies per-instance data from a source entity into that streaming world. The original must survive until loading completes. The imported copy moves into the main world unless consumed and destroyed during preparation; otherwise its lifecycle follows the loaded section. The former managed `PostLoadCommandBuffer` mechanism is deprecated. This matters because older streaming examples can describe a different ownership path and omit the extra copied entity. [Scene instancing](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-scene-instancing.html).

**Analysis.** This is a concrete separation between an authored file, an in-progress loading context, and active runtime entities. It offers controlled preparation, but the documented move into the main world is not a database commit or a guarantee that private data is suitable for every observer. The same point applies to scene metadata: inexpensive availability does not establish permission to disclose it.

## Addressables: logical release and actual memory

Addressables **4.1.1** distinguishes asset and directory lifetimes; [chapter 09](09-content-tools-ui-and-platforms.md#3-current-unity-addressables-changes-the-usual-bundle-only-account) records those contracts. Its memory guide also identifies unload/reload churn after releasing a bundle's last user, and stricter content/Player matching when TypeTrees are removed. [Current asset memory management](https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/memory-assets.html).

In AssetBundle builds, shared non-Addressable dependencies can be copied into several bundles. Making the dependency explicitly Addressable changes that ownership; loading an asset can still bring in other bundles through the containing bundle's dependency graph. Content-directory builds automatically deduplicate shared content within the build. These are different packaging and residency behaviors, so a bundle-only account does not describe every current Addressables configuration. [Current asset dependencies](https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/AssetDependencies.html).

**Analysis.** Logical objects, bundle dependencies, shared textures, and runtime allocations form different ownership graphs. A region unload can succeed while much of its asset memory remains shared elsewhere. Conversely, aggressive unloading can lower one snapshot's memory while increasing later I/O and reconstruction. Peak transition memory, retained memory after settling, and repeated traversal cost answer different performance questions.

## Coordinate range is not simulated population

Unreal's Large World Coordinates documentation describes double-precision core types and specialized representations in rendering and Niagara. It also warns about precision loss when crossing back to floats. The page still carries Beta and early UE5 migration wording, so its status text is recorded with that provenance limitation. Its enormous illustrative world bound is not evidence that such a world can be populated, streamed, simulated, networked, or saved at useful rates. [Large World Coordinates](https://dev.epicgames.com/documentation/unreal-engine/large-world-coordinates-in-unreal-engine-5).

The following are independent scaling dimensions, not interchangeable measures of “large world”:

- **Geographic extent:** coordinate precision and the size of spatial lookup structures.
- **Resident density:** the amount of content and interaction data simultaneously needed in one area.
- **Transition rate:** how often cells, actors, collision, or representations must be created and removed.
- **Active simulation:** the entities, interactions, and mechanical boundaries processed over elapsed world time.
- **Observer diversity:** how many different regions, relevance sets, and private views must be maintained.
- **Retained history:** how much experience, persistence, or replay data accumulates even when the current scene stays small.

These distinctions explain why a crowd demonstration, a fast terrain flythrough, and a persistent autonomous world provide different evidence. None substitutes for the others. In particular, a lower-frequency actor update can reduce CPU work while changing timing, interactions, or event ordering; equivalent world behavior requires evidence beyond visual plausibility.

## Provenance and reading register

All content was inspected on 2026-10-23 unless explicitly marked as unavailable. APIs establish available types and controls; they do not establish undocumented internal algorithms or production performance.

| Source                                                                                                                                | Version/date and medium                              | Inspected content and limits                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [World Partition](https://dev.epicgames.com/documentation/unreal-engine/world-partition-in-unreal-engine)                             | UE 5.8 page; manual                                  | Sources, dependencies, target states; older default-hash examples qualified.                     |
| [Loose Hierarchical Grid](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/URuntimePartitionLHGrid)           | UE 5.8; API                                          | Runtime Hash Set grid controls; no universal-default claim.                                      |
| [Partition descriptors](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FRuntimePartitionDesc)               | UE 5.8; API                                          | Main partition and HLOD configuration.                                                           |
| [Data Layers](https://dev.epicgames.com/documentation/unreal-engine/world-partition---data-layers-in-unreal-engine)                   | UE 5.8 page; manual                                  | Runtime states, asset/instance separation, dependency cost.                                      |
| [HLOD](https://dev.epicgames.com/documentation/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine)         | UE 5.8 page; manual                                  | Proxy purpose and layer types; rendering detail belongs in the rendering chapter.                |
| [FastGeo plugin](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/FastGeoStreaming)                        | UE 5.8; plugin index                                 | Experimental status and purpose.                                                                 |
| [FastGeo settings](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/FastGeoStreaming/UFastGeoTransformerSettings)    | UE 5.8; API                                          | Conversion eligibility and physics surrogates.                                                   |
| [FastGeo storage](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/FastGeoStreaming/EFastGeoInstanceStorageMode)     | UE 5.8; API                                          | Precision/storage alternatives.                                                                  |
| [FastGeo guide](https://dev.epicgames.com/community/learning/knowledge-base/zqzP/unreal-engine-fast-geometry-streaming-guide)         | 2026-06-10; engineering guide                        | Title/date discovered; body unavailable, not claimed as read.                                    |
| [Significance Manager](https://dev.epicgames.com/documentation/unreal-engine/significance-manager-in-unreal-engine)                   | UE 5.8 page; manual                                  | Evaluation, multiple viewpoints, callbacks, explicit updates.                                    |
| [MassGameplay](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-gameplay-in-unreal-engine)                      | UE 5.8 page with legacy 5.1 prose; manual            | Three LOD consumers and representation lifecycle.                                                |
| [PersistenceLab](https://github.com/ZKShao-EpicGames/Sample-PersistenceLab)                                                           | UE 5.8.0 sample; Unreal Fest Chicago 2026 companion  | README inspected; plugin maturity distinctions, not a shipped-world benchmark.                   |
| [Instanced Actors Manager](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/InstancedActors/AInstancedActorsManager) | UE 5.8; API                                          | Regional instances, authoritative spawning, shared offline dataset.                              |
| [Scene metadata](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-meta-entities.html)                        | Entities 6.6.0; manual                               | Resolve phase, metadata, dependencies.                                                           |
| [Scene loading](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-loading-scenes.html)                        | Entities 6.6.0; manual                               | Request/completion, build inclusion, retained metadata.                                          |
| [Scene sections](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-scene-sections.html)                       | Entities 6.6.0; manual                               | Reference limits and unload ownership.                                                           |
| [Scene instancing](https://docs.unity3d.com/Packages/com.unity.entities@6.6/manual/streaming-scene-instancing.html)                   | Entities 6.6.0; manual                               | Streaming-world preparation, ImportEntity lifecycle, deprecated predecessor.                     |
| [Current asset memory management](https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/memory-assets.html)             | Addressables 4.1.1; manual                           | Bundle/content-directory lifetimes, churn and TypeTree compatibility.                            |
| [Current asset dependencies](https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/AssetDependencies.html)              | Addressables 4.1.1; manual                           | Bundle dependency loading, duplicated implicit dependencies and content-directory deduplication. |
| [Large World Coordinates](https://dev.epicgames.com/documentation/unreal-engine/large-world-coordinates-in-unreal-engine-5)           | UE 5.8 page retaining early UE5/Beta wording; manual | Precision boundaries; maturity wording treated cautiously.                                       |

No engine or browser benchmark was run. The unavailable FastGeo guide is an explicit evidence gap, and no claims about its uninspected implementation or performance depend on it.
