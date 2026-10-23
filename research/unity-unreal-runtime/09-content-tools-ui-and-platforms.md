# Content creation, asset lifecycles, UI, and platforms

| Research status                                                      | Evidence cut                                                                                     | Scope                                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Complete source synthesis; no engine execution or platform benchmark | 2026-10-23; Unreal Engine 5.8 and Unity 6.6, with separately versioned packages identified below | Procedural content, importing and building assets, runtime ownership, UI/input, accessibility/localization, editor tooling, and browser delivery |

This chapter studies how authored or generated material becomes usable runtime content, and how a player interacts with its presentation. It makes no engine selection or proposed OpenLegend design. Release-channel verification is centralized in the [version baseline](01-evidence-and-version-baseline.md); rendering and animation are covered in [chapter 08](08-rendering-animation-and-audio.md).

The repository's [engine/world boundaries](../../docs/engine-and-world-boundaries.md) and [architecture](../../docs/architecture.md) distinguish authored reality, world state, presentation, and authority. Those distinctions are important when interpreting engine terminology. A generated tree mesh, an instantiated tree object, a persistent individual plant, and a character's knowledge of that plant are different outputs. The mechanisms below often produce only one of them. Statements labeled **research interpretation** explain this distinction without prescribing new systems.

## 1. Procedural content: the output contract matters

### Unreal's PCG data and execution model

Unreal's Procedural Content Generation framework represents spatial content with points carrying transforms, bounds, color, density, steepness, seeds, and additional attributes. Graph operations sample, filter, transform, and combine that data before producing outputs such as spawned meshes. Geometry Script interoperability adds ways to sample meshes. The editor's debug tree and attribute view expose intermediate data, which matters because an apparently wrong final forest can originate in sampling, filtering, attribute propagation, or spawning. This is an extensible content-processing model; a point's user-defined attributes do not themselves establish persistent gameplay semantics. [C01]

PCG has non-partitioned, partitioned, hierarchical, and runtime generation modes. Partitioning bounds work by cells; hierarchy evaluates broad features on larger grids and detail on smaller grids. Cached data flows from larger grids to smaller ones, while unbounded work can run once before subdivision. Runtime generation schedules around generation sources such as players or cameras, using distance/view priority and optional frustum selection. A cleanup radius larger than the generation radius provides hysteresis. Hierarchical outputs can overlap, making bounds filtering relevant. [C02]

**Research interpretation.** A near-camera generation radius answers when detailed output is worth producing. It does not establish when the underlying world begins to exist. Likewise, cleaning up generated instances is an ownership decision about those instances; it does not inherently erase the world facts they represent. Whether two runs reconstruct the same persistent identities is an additional contract, not a consequence of having a random seed field.

### GPU PCG and the cost of obtaining its inputs

PCG GPU processing remains **Beta** in the current documentation. Consecutive supported nodes are grouped into a compute graph; GPU implementations include point copying, spawning paths, and custom HLSL. Graph setup and CPU/GPU transfer can outweigh savings for small workloads. Landscape sampling illustrates the data boundary: CPU collision data can be uploaded, Runtime Virtual Textures can be sampled if resident, or landscape textures can be generated directly on the GPU. Virtual-texture sampling needs appropriate priming and spatial resolution or it can read incomplete data. Some grass-map workflows can skip CPU readback. [C03]

The research distinction is between computation and data availability. Moving an operation to the GPU does not guarantee that the required source data is already there, at sufficient resolution, or current. Avoiding readback is a substantial difference when the output is only a renderable population. An authoritative CPU consumer would introduce a different synchronization requirement. The documentation does not establish bit-identical CPU/GPU procedural results or general persistence guarantees.

### Mesh Terrain and procedural vegetation are separate experimental systems

Unreal 5.8's **Experimental Mesh Terrain** represents terrain with meshes rather than only a heightfield, enabling overhangs, tunnels, and variable geometric density. It distinguishes the base data, an editor preview affected by non-destructive modifiers, and compiled runtime sections. Vertex weight channels become texture-array data in the compiled representation. Thus the editing representation and delivered runtime data are not the same object. [C04]

The creation guide requires a World Partition level. It also states that a changed terrain section is recalculated as a whole, so a small edit's cost depends on section size. Mesh/heightmap conversion, remeshing, sculpting, and painting participate in that editing workflow. Water integration is partial; not every terrain-carving behavior translates. These qualifications matter before interpreting “mesh terrain” as arbitrary, inexpensive, continuously editable runtime topology. [C05]

The **Experimental Procedural Vegetation Editor (PVE)** is PCG-based asset authoring. Its growth, grafting, and imported-mesh workflows produce structures that feed mesh construction and foliage distribution. Nanite-oriented output can include instancing, skinning, and distant representations. Only exported assets are placed in the world; the graph preview itself is not the placed world asset. The 5.8 documentation explicitly says PVE assets from 5.7 are incompatible with its substantially revised architecture. This is a concrete compatibility limit, not merely a generic warning attached to an experimental feature. [C06]

**Research interpretation.** A pseudo-botanical generator can produce convincing branching structure without modeling a persistent ecosystem. Asset growth parameters alone do not establish energy budgets, reproduction, disease, competition, ownership, historical age, or changes caused by characters. The evidence supports the content-creation mechanism, not those additional ecological semantics.

### Unity's lower-level generation and editing tools

Unity's writable MeshData API permits jobs to fill mesh vertex/index data and submesh descriptions, followed by applying the data to Mesh objects and disposing of the temporary array. Allocating multiple meshes in one MeshDataArray reduces per-allocation tracking and safety overhead. This supplies a supported route for parallel geometry construction; it does not make dependent colliders, materials, world identity, or persistence automatic. [C07]

Unity 6.6 lists Splines **2.9.1** for curves and paths used in shapes, trajectories, or object behaviors. [C08] ProBuilder **6.1** provides editor geometry creation/editing, UV work, colors, collision meshes, export, and a C# API for custom tools. [C09] These tools occupy different levels: a spline describes a spatial relationship, a mesh API constructs geometry, and an editor modeling tool supports authoring. Neither their coexistence nor Unreal's unified PCG interface proves equivalence of runtime scheduling, determinism, or persistent-world behavior.

## 2. Content has several lifecycles

The following table is an analytical classification of the mechanisms studied here. The categories prevent similarly named operations from being treated as interchangeable.

| Stage                    | Concrete concern                                                 | What successful completion does not establish                        |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| Authored source          | DCC files, textures, text, procedural graphs, source definitions | That the file is valid, trusted, or runtime-ready                    |
| Import                   | Format conversion, dependency discovery, importer settings       | That every platform can load the original source format at runtime   |
| Derived-data build       | Shaders, compressed/processed data, compiled terrain             | That the derived cache is authoritative or permanently retained      |
| Content packaging        | Local archives, content directories, bundles/chunks, catalogs    | That dependencies are resident or instances exist                    |
| Runtime loading          | Asynchronous I/O, dependency resolution, reference ownership     | That the loaded asset has been instantiated or has gameplay identity |
| Instance lifetime        | Objects referring to shared assets, activation and destruction   | That the underlying asset can be unloaded immediately                |
| Persistent world history | Stable identity and consequential changes                        | That visual content can reconstruct every saved semantic fact        |

The engine documentation below directly describes the first six categories. The final category is included to mark an evidence boundary relevant to OpenLegend, not to claim the engines lack save systems or to propose one.

### Unreal Interchange: import is a pipeline, not a single file read

Interchange translates source data into intermediate nodes, applies a configurable pipeline stack, then uses factories to create assets. Its asynchronous, extensible organization separates format interpretation from asset production. Reimport preserves pipeline choices and exposes certain material or skeleton conflicts. The documented runtime Blueprint texture-import example has a narrower capability than the whole framework: it does not support skeletal meshes or animation data, and packaged applications need the appropriate Interchange content cooked. [C10]

**Provenance caution.** The same guide contains format-specific experimental and availability statements that need release-specific corroboration. They are not used here to make a blanket claim that every FBX, USD, or glTF path has the same 5.8 maturity. A runtime texture example also cannot establish general runtime ingestion of arbitrary DCC scenes. Authoring import, reimport, and runtime import have different dependencies and coverage.

### Unreal Asset Manager: identity, grouping, and loading

Unreal's Asset Manager runs in editor and packaged contexts. Primary assets have type/name identifiers and can be explicitly loaded or unloaded; secondary assets are ordinarily reached through dependencies. Asset bundles group soft references for selected uses of a primary asset. They are logical reference groups, not Unity AssetBundle archive files. Runtime registration can add primary assets and bundle information, while auditing, cooking, and chunking address distribution and ownership. [C11]

**Research interpretation.** A stable asset identifier identifies reusable content. It is not automatically an identity for each world instance that uses that content. Loading one chair mesh can serve many chairs with distinct ownership, damage, or history; unloading that mesh does not itself answer what those chairs mean in the persistent world.

### Derived Data Cache: disposable work products

Unreal's Derived Data Cache (DDC) stores regenerable results such as processed assets and shaders. A hierarchy checks faster caches before slower ones, promotes found data, and generates missing data before populating caches asynchronously. Zen is the default local DDC backend. Its local/shared service uses asynchronous HTTP and is intended for trusted network contexts; authenticated Cloud DDC has a different deployment/security boundary. The documentation distinguishes this from older archive-based backends. [C12]

The useful mechanism is avoiding repeated derivation, not treating a cache as source-of-truth storage. Cache eviction, source revision, importer changes, or platform changes can require regeneration. Build caches, packaged content, runtime asset residency, and a saved world are separate lifetimes. This is a research interpretation of regenerability and ownership, not a storage proposal for OpenLegend.

### Unity import dependencies and repeated refresh work

Unity's Asset Database refresh discovers changes, imports/compiles code, conditionally reloads the domain, imports non-code assets, runs postprocessing, and hot-reloads results. Static dependencies include importer identity/version and build target. Dynamic dependencies are discovered during import and can include source content or conditional global settings such as color space, graphics API, and compression. Generating new files or changing dependencies during processing can restart the refresh loop. [C13]

This explains why importer behavior matters to iteration time independently of final runtime performance. It also means that an Editor import API is not evidence that a standalone player can ingest arbitrary source formats. The observed output may require editor-only importers, build-time transformations, or a specific target configuration.

## 3. Current Unity Addressables changes the usual bundle-only account

### Default package and latest compatible package are different facts

The Unity 6.6 package catalog identifies Addressables **2.11.2** as the editor's released/default entry while also listing **4.1.1** as a compatible released version. These are separate version claims; this section deliberately studies the newer compatible package and identifies its API family. [C14] Its changelog dates 4.1.1 to **2026-09-29**. [C18] A guide written exclusively around the older package cannot silently be applied to this version's content-directory workflow.

### AssetBundles and content directories

Addressables 4.1 supports two content build systems. Content directories, introduced in 4.0, use hashed content files with optional archive packing and currently support **local content only**. The systems differ in dependency accounting and delivery capabilities. [C15]

| Property                                | AssetBundle build                                      | Content-directory build                         |
| --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Dependency granularity                  | Bundles and their dependency graph                     | Individual assets                               |
| Content boundary                        | Explicit bundle/group packing                          | Content-directory/root-asset build              |
| Remote content in the inspected version | Supported                                              | Not supported                                   |
| Shared dependency handling              | Depends on packing and grouping                        | Implicit deduplication within the content build |
| Cross-system sharing                    | Can duplicate content when mixed with the other system | Same limitation                                 |

The table summarizes the same build-system source and should not be read as an engine recommendation. In particular, per-asset dependency accounting does not imply that every storage read is an isolated tiny file or that remote content gets the same behavior.

Unity's underlying Content Directories documentation separates a player/bootstrap build from the content build. Root assets define the content closure; `Loadable<T>` and `LoadableSceneId` express explicit on-demand references that remain included in that closure. Hash-based files and dependency metadata support this separation. Inclusion in a build, registration of its directory, and actual asset loading are therefore distinct events. [C17]

### Reference counting and the point at which memory can return

Addressables associates references with load operations and expects corresponding releases. Reaching zero makes an asset eligible for unloading, but actual memory lifetime depends on the backing system. AssetBundle content can remain until its bundle's lifetime permits release. Content-directory assets can unload individually when unreferenced; the directory registration itself remains until Addressables shutdown. Addressables 4.1 also exposes operation reference counts for diagnosis, alongside its profiler's asset/dependency information. [C16]

**Research interpretation.** This distinguishes three questions often collapsed into “loaded”: whether a catalog/directory is known, whether asset data is resident, and whether a live instance still refers to it. It also separates logical references from operating-system memory immediately falling. Neither a reference-count diagram nor an asset-loading API supplies world persistence, authorization, or semantic deduplication.

## 4. Shader preparation trades build cost against runtime cost

Unity 6.6 URP Shader Build Settings can replace selected keyword variant sets with dynamic branches. The documented built-in sets include fog and reflection-probe blending/box projection. Custom shader code must use runtime branching for this mechanism; a preprocessor branch that removes code at compilation is a different operation. Fewer shader variants can reduce compilation/build pressure, but dynamic branches can hurt runtime performance on some older mobile GPUs. [C19]

This is a concrete example of moving cost rather than universally removing it. A smaller set of compiled programs and a cheaper running shader are separate outcomes. Build/import throughput also has different bottlenecks from runtime streaming, even when both involve the same asset. No compilation benchmark or device-specific branch-cost measurement was performed for this report.

## 5. UI: retained structure, invalidation, and visible-item work

### Slate/UMG invalidation

Unreal's UI invalidation caches hierarchy, layout, and paint work. Different changes invalidate different portions of that work; changing children can require broader reconstruction than changing paint. Global invalidation makes the window the caching root and disables nested Invalidation Boxes. Retainer Panels render to textures and can reduce draw calls or spread updates over frames, but add memory and expensive repaint work. Volatile widgets avoid stale paint caching for frequently changing output while still benefiting from suitable surrounding layout caches. [C20]

The performance question is consequently what changes, how far invalidation propagates, and whether a cache remains useful. “A retained UI” alone says little about a screen that reconstructs its children or mutates layout every frame. Likewise, rendering a panel less frequently changes visible freshness; it does not justify delaying the authoritative transaction that the panel displays.

### Unity UI Toolkit

UI Toolkit maintains a retained visual tree. UXML describes structure, USS supplies styling, Flexbox-based layout organizes elements, and events propagate through the hierarchy. The same family supports editor and runtime interfaces. [C21] This is an engine UI representation; similarity to web markup/styles does not make its visual tree the browser's DOM or provide browser accessibility behavior automatically.

Runtime data binding has explicit modes: two-way, target-only, source-only, and one-time until invalidated. Update triggers can use every-frame updates, change detection, or manual dirty marking; if a binding cannot detect changes, a nominal change-detection configuration can fall back to every-frame processing. “Data bound” is therefore not evidence of event-only work. [C22]

ListView virtualizes its visible elements, recycling and binding them as the visible range changes. Fixed- and dynamic-height modes have different layout requirements. Refreshing changed items is distinct from rebuilding the entire view; changes to creation/destruction callbacks or the data-source type can require a rebuild. [C23] Virtualization bounds view work, while the underlying collection and its meaning remain separate.

Current Unity 6.6 documentation also supports **UI Toolkit world-space UI**, with Panel Settings and input configured for panels positioned among 2D/3D scene objects. An older assertion that UI Toolkit supports only screen overlays is incomplete for this baseline. [C24] Spatial placement adds visibility, scale, and interaction concerns; it does not itself make the interface readable or accessible.

## 6. Input: device signals, interpreted intent, and focus

Unreal Enhanced Input represents actions as typed assets and combines them with mapping contexts, modifiers, and triggers. Contexts can be added/removed and prioritized for a local player. Trigger events distinguish stages such as starting, ongoing evaluation, triggering, completion, and cancellation. This lets the same physical control carry different meanings under different interaction contexts. [C25]

CommonUI addresses a related but separate layer: styled widgets, focus and input routing across layered interfaces, controller-specific prompts, and directional gamepad navigation. [C26] A valid action mapping does not by itself establish which modal screen receives the action, whether focus is visible, or whether a controller prompt matches the active device.

Unity Input System **1.20.1** actions abstract intent from device controls. Bindings can cover multiple devices, deliver callbacks or polled values, and support runtime rebinding. The action system is documented for runtime rather than EditorWindow input. [C27] Package version and interaction context matter when reusing examples; an editor extension and an in-game input layer are not necessarily interchangeable consumers.

**Research interpretation.** Input systems translate device activity into local intent. They do not establish server authorization, ownership, action feasibility, or protection against stale state. Those distinctions remain relevant whether the player uses a keyboard, touch, a controller, assistive technology, or a streamed browser session. No new OpenLegend command interface is proposed here.

## 7. Accessibility and localization have their own data

### Screen-reader support is not inferred from appearance

Unreal's screen-reader integration is marked **Experimental**. The current guide describes third-party Windows readers and iOS VoiceOver, accessible behavior for common UMG widgets, summaries/labels, custom text, and exclusion from the accessible tree. Custom Slate widgets can supply an accessibility adapter. These mechanisms describe exposure to assistive technology; they are not a general certification of accessibility or legal compliance. [C28]

Unity 6.6's Accessibility module is enabled by default and lists Android TalkBack, iOS VoiceOver, Windows Narrator, and macOS VoiceOver. Its accessibility hierarchy is supplied through nodes with labels, values, roles, state, and relationships; it is **not automatically derived from every UI tree or scene object**. The module can also expose system preferences such as font scaling, bold text, and captions. Older descriptions limiting Unity's native screen-reader integration to mobile are incomplete for this version. [C29]

The module's architecture batches native events through Update and can refresh node frames in LateUpdate when a window moves/resizes. Registration and deregistration have explicit lifecycles. Much work is conditional on active accessibility features or changed information, but that does not establish zero cost in every configuration. [C30]

**Research interpretation.** A visual label, a screen-reader label, a tooltip, a subtitle, and an in-world sign can expose the same fact through different channels. Hiding pixels does not automatically remove the fact from an independently supplied accessibility tree. Conversely, making an object visible does not provide a useful label or navigation order. The evidence supports analyzing these representations separately; it does not prescribe an OpenLegend accessibility implementation.

### Localization covers catalogs, assets, and formatting

Unreal's localization pipeline gathers source text into manifests and culture-specific archives, then compiles runtime localization resources. String tables allow authored strings to be referenced from multiple places. Editor and game localization targets are distinct, and changing a translation source does not change the runtime resource until compilation. [C31]

Unity 6.6 lists Localization **1.5.13**. It covers localized strings and assets, pseudolocalization, and interchange with tools through formats such as CSV/XLIFF. [C32] Its Smart Strings use SmartFormat for named placeholders, plurals, gender-dependent variations, lists, and conditional formatting. Formatting rules can therefore express language variation beyond substituting a fixed word sequence. [C33]

**Research interpretation.** These mechanisms establish authored-content localization and grammatical formatting. They do not by themselves translate arbitrary runtime-generated dialogue, decide what a character may disclose, or ensure that a translated paraphrase preserves a private factual constraint. Audio, subtitles, logs, accessibility metadata, and generated speech can require the same semantic care even when their localization pipelines differ. This is an evidence boundary, not a proposed language-generation service.

## 8. Content and UI tooling: graph editing is not graph execution

Unity's current Graph Toolkit provides a front end for custom node-graph authoring, including UI and extensibility. It can compile graphs into runtime data models, but it **does not include a runtime execution backend**. A project-specific node diagram is therefore not automatically a scheduler, interpreter, or simulation engine. [C34]

This distinction applies broadly when comparing Blueprint-like visual programming, material graphs, PCG graphs, animation graphs, and custom editor graphs. They may share a visual vocabulary while differing in evaluation order, data ownership, mutation permissions, persistence, and execution target. A line between two nodes is not enough evidence to conclude that two graph systems have the same semantics.

Unreal Slate Insights records widget updates, paints, invalidations, and reasons, making broad rebuilds diagnosable at the UI hierarchy level. [C35] Unity UI Toolkit Debugger inspects the live visual tree, styles, and state. Its live inline style edits are exploratory: they are not persisted to authored assets and can disappear when the UI regenerates. [C36] Together with PCG's intermediate-data inspection, these are examples of domain-specific observability rather than substitutes for the report's separate profiling/testing chapter.

## 9. Browser and platform constraints changed materially in Unity 6.6

### WebGPU is production-ready, with specific limits

Unity's official 6.6 announcement identifies WebGPU as production-ready, with compute-based workloads, indirect rendering, GPU skinning, and VFX Graph support. WebGL2 remains the default, while an opted-in WebGPU build can fall back to it. The same release adds progressive asset loading that initially downloads the first scene and streams later scenes/dependencies through the existing scene/addressable APIs. These are release-specific capabilities, not proof that every browser/device executes every path. [C37]

The versioned WebGPU feature list excludes asynchronous compute, dynamic resolution, and cubemap arrays. [C38] Its limitations page additionally rules out synchronous GPU readback and directs supported reads through asynchronous APIs. It documents shader-language restrictions, including requirements for uniform barrier control flow and limitations on wave/quad operations and integer/precision types. Storage formats and buffer capabilities also differ from native backends. [C39]

**Research interpretation.** “Compute shaders work” does not imply that asynchronous GPU queues, immediate CPU access to GPU results, or a desktop shader's entire feature set work. Fallback support also does not make a compute-dependent workload available on a fallback backend. The supported feature matrix, data movement, and chosen rendering path remain part of the evidence needed for a platform claim.

### WebAssembly memory and threading

Unity's Wasm64 documentation specifies a **16 GB** linear-memory limit for its Web target, tied to the JavaScript API, and describes pointer/code-size/runtime costs associated with 64-bit memory addressing. Larger theoretical memory does not guarantee that a device will allocate it or that a tab can use it comfortably. [C40]

The current prerequisites list desktop Chrome/Edge 128+ and Firefox 129+, and Android Chrome/Edge 146+ and Firefox 148+. Safari 26.5 is listed as lacking 64-bit WebAssembly support. These are the document's versioned compatibility statements as of this evidence cut, not independently tested results or permanent promises about future browser versions. [C41]

Unity 6.6's Web technical overview makes an important distinction: managed C# threads remain unsupported, while native C/C++ and **Burst-compiled C# jobs** can use threading. It also documents ahead-of-time restrictions, restricted raw networking, and a Web Audio backend with a narrower audio feature set than native platforms. An unqualified “Unity Web is single-threaded” statement is stale; an unqualified “all C# threading works” statement is also incorrect. [C42]

The relevant analytical unit is consequently a particular code path and execution environment. Native jobs, managed objects, browser APIs, GPU commands, and user-interface event handling do not inherit identical concurrency or memory behavior merely because they share an application.

### Unreal Pixel Streaming is a different execution arrangement

Pixel Streaming runs Unreal on a remote machine, renders and encodes audio/video there, and delivers the stream through WebRTC while returning user input. Signalling and connectivity infrastructure, including STUN/TURN where needed, establish the session. [C43] That places rendering workload, media encoding, network delay, and remote capacity in a different location from a WebAssembly build rendering locally in the browser. This is a topology distinction, not a comparative performance measurement or hosting proposal.

Pixel Streaming 2 changes the plugin/API boundary by abstracting its internal WebRTC implementation. Its migration documentation covers changed C++/Blueprint/configuration surfaces, and its external infrastructure must match the engine/plugin version. An old launch-argument or public-WebRTC-type example cannot be assumed to apply unchanged. [C44]

**Provenance caution.** The general Pixel Streaming overview retains older HTML5-export language. It is used here only for the documented streaming topology, corroborated by the current Pixel Streaming 2 guide, not to assert that the old export path is a current supported Unreal browser build. No video latency, concurrent-user capacity, encoder density, or cloud price has been measured or inferred from historical demonstration tables.

## 10. What this evidence establishes—and leaves separate

The following are research conclusions from the mechanisms above, not adoption decisions:

- Procedural generation has several outputs: spatial samples, meshes, placement instances, compiled terrain, or asset files. Their lifecycle and stability differ from persistent semantic identities.
- Current asset systems optimize different ownership boundaries. Import dependency tracking, disposable derived caches, package dependencies, operation references, and instance references each answer a different question.
- UI work can be reduced by caching and visible-item recycling, but mutation frequency and invalidation range still determine cost. Accessibility and localization add representations with explicit lifecycles of their own.
- Input mapping provides interpreted intent; it does not prove that an action is authorized or causally valid in a shared world.
- Modern browser support is broader than older engine documentation suggests, but managed threading, native jobs, GPU features, memory limits, and streamed rendering remain distinct capabilities.
- Current-version headers require content-level scrutiny. Experimental status, stale prose, package defaults, newer compatible releases, and backend-specific exclusions all materially change what a source can support.

The inspected sources do not establish an OpenLegend content scale, population limit, build duration, interaction latency, deterministic procedural-world guarantee, or cross-platform performance result. They provide mechanisms and limitations against which such a claim could later be evaluated. No implementation plan, engine migration, or benchmark program is proposed in this chapter.

## 11. Provenance and source register

Every source below was inspected on **2026-10-23**. Epic's “live 5.8” pages showed the current documentation branch but usually supplied no revision date. Unity's “6.6” sources are pinned to the 6000.6 manual/API, generally built on 2026-10-21 or 22; the Wasm64 prerequisites page showed 2026-10-16. A documentation build date is not proof that every paragraph was newly authored. Package versions and release dates are identified separately. Relevant text/tables were read; no sample project, video, or engine binary was executed for this chapter.

| ID  | Source and current scope                                       | Medium; evidence and limits                                                                    |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| C01 | [PCG overview][C01], live 5.8                                  | Epic guide; point data, graph operations and intermediate inspection                           |
| C02 | [PCG generation modes][C02], live 5.8                          | Epic guide; partition/hierarchy/runtime scheduling and cleanup                                 |
| C03 | [PCG GPU processing][C03], live 5.8                            | Epic guide; Beta, compute grouping, transfer and terrain-data residency                        |
| C04 | [Mesh Terrain][C04], live 5.8                                  | Epic guide; Experimental, authoring and compiled representations                               |
| C05 | [Crafting Mesh Terrain][C05], live 5.8                         | Epic guide; partition dependency, whole-section recomputation, partial water integration       |
| C06 | [Procedural Vegetation Editor][C06], live 5.8                  | Epic guide; Experimental authoring, exported assets, 5.7 incompatibility                       |
| C07 | [Mesh.AllocateWritableMeshData][C07], 6.6                      | Unity API; job-accessible mesh construction and allocation ownership                           |
| C08 | [Splines package][C08], 6.6 catalog: 2.9.1                     | Unity package catalog; version and scope only, detailed package page unavailable               |
| C09 | [ProBuilder manual][C09], 6.1                                  | Unity package manual; editor geometry/UV tools and C# extension API                            |
| C10 | [Importing using Interchange][C10], live 5.8                   | Epic guide; pipeline/reimport and narrow runtime example; broad format-status claims excluded  |
| C11 | [Asset Management][C11], live 5.8                              | Epic guide; primary identifiers, soft-reference bundles, runtime ownership                     |
| C12 | [Derived Data Cache][C12], live 5.8                            | Epic guide; cache hierarchy and backend boundaries; no deployment performed                    |
| C13 | [Refreshing the Asset Database][C13], 6.6                      | Unity manual; import stages, dependencies and refresh-loop restarts                            |
| C14 | [Addressables package catalog][C14], 6.6                       | Unity catalog; default 2.11.2 versus compatible 4.1.1                                          |
| C15 | [Addressables content build systems][C15], 4.1.1               | Unity manual; per-asset directories versus bundles, local/remote limits                        |
| C16 | [Addressables asset memory][C16], 4.1.1                        | Unity manual; reference counts, asset/directory lifetimes and diagnostics                      |
| C17 | [Content Directories introduction][C17], 6.6                   | Unity manual; root assets, on-demand references, build separation                              |
| C18 | [Addressables changelog][C18], 4.1.1 released 2026-09-29       | Unity release record; exact package date, not a performance source                             |
| C19 | [URP shader variants and dynamic branching][C19], 6.6          | Unity manual; supported keyword sets and build/runtime tradeoff                                |
| C20 | [Slate/UMG invalidation][C20], live 5.8                        | Epic guide; hierarchy/layout/paint caches and retainer costs                                   |
| C21 | [UI Toolkit introduction][C21], 6.6                            | Unity manual; retained visual tree, UXML/USS and events                                        |
| C22 | [Runtime binding modes and update triggers][C22], 6.6          | Unity manual; every-frame fallback and manual invalidation                                     |
| C23 | [ListView][C23], 6.6                                           | Unity manual; recycling, item refresh and view rebuild                                         |
| C24 | [World-space UI][C24], 6.6                                     | Unity manual; current UI Toolkit world-space capability                                        |
| C25 | [Enhanced Input][C25], live 5.8                                | Epic guide; actions, contexts, modifiers and trigger lifecycle                                 |
| C26 | [CommonUI][C26], live 5.8                                      | Epic overview; focus/routing, styling and controller navigation                                |
| C27 | [Input System actions][C27], 1.20.1                            | Unity package manual; abstract input, callbacks/polling and rebinding                          |
| C28 | [Screen readers][C28], live 5.8                                | Epic guide; Experimental, exposed widget metadata and platform scope                           |
| C29 | [Accessibility module introduction][C29], 6.6                  | Unity manual; desktop/mobile readers and explicit semantic hierarchy                           |
| C30 | [Accessibility module architecture][C30], 6.6                  | Unity manual; event/frame updates and node registration lifetime                               |
| C31 | [Localization overview][C31], live 5.8                         | Epic guide; gather/archive/compile and separate localization targets                           |
| C32 | [Localization package][C32], 6.6 catalog: 1.5.13               | Unity catalog; localized strings/assets and exchange capabilities                              |
| C33 | [Smart Strings][C33], 1.5                                      | Unity package manual; grammatical formatting, not machine translation                          |
| C34 | [Graph Toolkit][C34], 6.6                                      | Unity manual; graph-authoring front end without runtime executor                               |
| C35 | [Slate Insights][C35], live 5.8                                | Epic guide; widget invalidation/paint/update inspection                                        |
| C36 | [UI Toolkit Debugger][C36], 6.6                                | Unity manual; live inspection and non-persistent experimental style edits                      |
| C37 | [Unity 6.6 release announcement][C37], 2026-09-01              | Official staff post; WebGPU production status and progressive asset loading; comments excluded |
| C38 | [WebGPU features][C38], 6.6                                    | Unity feature matrix; supported and absent graphics capabilities                               |
| C39 | [WebGPU limitations][C39], 6.6                                 | Unity manual; readback, shaders, buffer/format restrictions                                    |
| C40 | [64-bit WebAssembly support][C40], 6.6                         | Unity manual; memory ceiling and representation overhead                                       |
| C41 | [64-bit WebAssembly prerequisites][C41], 6.6; build 2026-10-16 | Unity compatibility table; browser versions, no independent device tests                       |
| C42 | [Web technical limitations][C42], 6.6                          | Unity manual; managed versus native/Burst threading, AOT, networking, audio                    |
| C43 | [Pixel Streaming overview][C43], live 5.8                      | Epic guide; remote rendering/WebRTC topology; stale HTML5-export wording excluded              |
| C44 | [Pixel Streaming 2 overview][C44], live 5.8                    | Epic migration guide; API abstraction and version-matched infrastructure                       |

[C01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview
[C02]: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-pcg-generation-modes-in-unreal-engine
[C03]: https://dev.epicgames.com/documentation/unreal-engine/using-pcg-with-gpu-processing-in-unreal-engine?lang=en-US
[C04]: https://dev.epicgames.com/documentation/unreal-engine/mesh-terrain-in-unreal-engine
[C05]: https://dev.epicgames.com/documentation/unreal-engine/crafting-mesh-terrain-in-unreal-engine
[C06]: https://dev.epicgames.com/documentation/unreal-engine/procedural-vegetation-editor-in-unreal-engine
[C07]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Mesh.AllocateWritableMeshData.html
[C08]: https://docs.unity3d.com/6000.6/Documentation/Manual/com.unity.splines.html
[C09]: https://docs.unity3d.com/Packages/com.unity.probuilder@6.1/manual/index.html
[C10]: https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-assets-using-interchange-in-unreal-engine
[C11]: https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine
[C12]: https://dev.epicgames.com/documentation/unreal-engine/using-derived-data-cache-in-unreal-engine?lang=en-US
[C13]: https://docs.unity3d.com/6000.6/Documentation/Manual/AssetDatabaseRefreshing.html
[C14]: https://docs.unity.com/en-us/engine/6000.6/manual/packages-list/packages-all/pack-safe/com-unity-addressables
[C15]: https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/content-build-systems.html
[C16]: https://docs.unity3d.com/Packages/com.unity.addressables@4.1/manual/memory-assets.html
[C17]: https://docs.unity3d.com/6000.6/Documentation/Manual/content-directories-introduction.html
[C18]: https://docs.unity3d.com/Packages/com.unity.addressables@4.1/changelog/CHANGELOG.html
[C19]: https://docs.unity3d.com/6000.6/Documentation/Manual/urp/shader-stripping-fog.html
[C20]: https://dev.epicgames.com/documentation/en-us/unreal-engine/invalidation-in-slate-and-umg-for-unreal-engine
[C21]: https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/introduction-ui-toolkit.html
[C22]: https://docs.unity3d.com/6000.6/Documentation/Manual/UIE-runtime-binding-mode-update.html
[C23]: https://docs.unity3d.com/6000.6/Documentation/Manual/UIE-uxml-element-ListView.html
[C24]: https://docs.unity3d.com/6000.6/Documentation/Manual/ui-systems/world-space-ui.html
[C25]: https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine
[C26]: https://dev.epicgames.com/documentation/en-us/unreal-engine/common-ui-plugin-for-advanced-user-interfaces-in-unreal-engine
[C27]: https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/manual/Actions.html
[C28]: https://dev.epicgames.com/documentation/en-us/unreal-engine/supporting-screen-readers-in-unreal-engine
[C29]: https://docs.unity.com/en-us/engine/6000.6/manual/accessibility/module-intro
[C30]: https://docs.unity.com/en-us/engine/6000.6/manual/accessibility/module-architecture
[C31]: https://dev.epicgames.com/documentation/unreal-engine/localization-overview-for-unreal-engine?lang=en-US
[C32]: https://docs.unity3d.com/6000.6/Documentation/Manual/com.unity.localization.html
[C33]: https://docs.unity3d.com/Packages/com.unity.localization@1.5/manual/Smart/SmartStrings.html
[C34]: https://docs.unity3d.com/6000.6/Documentation/Manual/gtk/gtk-index.html
[C35]: https://dev.epicgames.com/documentation/en-us/unreal-engine/slate-insights-in-unreal-engine
[C36]: https://docs.unity3d.com/6000.6/Documentation/Manual/UIE-ui-debugger.html
[C37]: https://discussions.unity.com/t/unity-6-6-is-now-available/1735357
[C38]: https://docs.unity3d.com/6000.6/Documentation/Manual/WebGPU-features.html
[C39]: https://docs.unity3d.com/6000.6/Documentation/Manual/WebGPU-limitations.html
[C40]: https://docs.unity3d.com/6000.6/Documentation/Manual/wasm-64bit-support.html
[C41]: https://docs.unity3d.com/6000.6/Documentation/Manual/wasm-64bit-prereq.html
[C42]: https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html
[C43]: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine
[C44]: https://dev.epicgames.com/documentation/unreal-engine/pixel-streaming-2-overview-in-unreal-engine
