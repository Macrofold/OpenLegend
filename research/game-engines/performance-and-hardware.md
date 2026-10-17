# Performance and hardware: what actually limits the game

| Research status                          | Progress                                                                                                    | Last updated |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------ |
| Completed desk research; not a benchmark | Separates simulation, delivery and presentation costs, and identifies hardware-dependent limits to measure. | 2026-10-15   |

## 1. The central distinction

A million objects stored in a world, ten thousand characters currently simulated, two hundred characters relevant to one player, and fifty characters visible in one frame are four different workloads. None establishes the cost of the others. Numbers in this document are illustrative unless explicitly attributed; they are not Open Legend capacity claims.

The client engine does not impose a direct population ceiling on a remotely hosted simulation. The browser still has to process the information it receives and draw the scene. The useful architectural goal is therefore: server work follows actual world activity; network work follows each player's permitted information; rendering work follows the visible scene and chosen quality. Open Legend's current [performance contract](../../docs/performance.md) separates these responsibilities. It also explicitly says that physical entities currently reside in one simulation process and that regional residency remains future work. Separation is real; unlimited scale is not established.

A locally hosted server is different from a remotely hosted server. Running a browser, Node, a database and development tools on the same laptop makes them compete for the same processor, memory, power and cooling. Moving only the client to native does not remove that competition. Conversely, retaining a browser client does not prevent moving server computation to different machines or implementing a measured hot path in another language.

### Workload dimensions to record separately

| Dimension                 | Examples of cost                                                 | Main owner                          |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| Stored world size and age | Database indexes, retained histories, asset catalogues, backups  | Server/storage                      |
| Actively changing objects | Motion, needs, construction, combat, resource changes            | Simulation                          |
| Interaction density       | Who sees/hears whom, collisions, local decisions                 | Simulation and observation delivery |
| Connected people          | Authentication, permitted views, serialization, outbound traffic | Server/network                      |
| Visible characters        | Pose evaluation, skinning, clothing, equipment, shadows          | Client CPU/GPU                      |
| Visible environment       | Geometry, materials, lights, transparency, streaming             | Client CPU/GPU/storage              |
| Interface activity        | Inventories, captions, inspection, text shaping, layout          | Client CPU                          |
| Generative work           | Model latency, queueing, token/image cost, asset preparation     | AI services and content pipeline    |

The most important scaling question is not simply how many characters exist. It is how many distinct relationships and changes must be processed. Checking every character against every other character has quadratic candidate growth. Spatial filtering can reduce candidates, but a genuinely dense gathering still creates real work. An engine migration cannot make every meaningful interaction disappear.

## 2. Frame rate, responsiveness and simulation speed are different

A display target of 60 frames per second gives approximately 16.67 milliseconds between frames; 120 gives 8.33; 30 gives 33.33. These are arithmetic budgets, not claims about an engine. A responsive interface can acknowledge a click before the server confirms an action. That acknowledgment is not proof that the craft, move or attack succeeded.

A useful diagnostic approximation is that steady frame throughput is limited by the slowest overlapping stage: client CPU preparation, GPU rendering or presentation. Input-to-photon latency includes queueing and can increase even when average frame rate looks good. Server confirmation adds network transit, admission, world calculation and required durable writes. Do not simply add CPU and GPU frame counters as though no work overlaps, or treat FPS as the only latency metric.

AMD's [Unreal performance guide](https://gpuopen.com/learn/unreal-engine-performance-guide/) recommends controlled builds, repeatable scenes, noise reduction and separating CPU from GPU limits. Its guidance is useful methodology, not a cross-engine ranking. A GPU-saturated scene will not necessarily improve when JavaScript submission becomes cheaper. A server-limited action will not necessarily improve when a new graphics card doubles rendering throughput.

**Measure tails and interruptions:** frame-time percentiles, longest hitches, shader compilation, garbage collection, loading spikes, first interaction, reconnect, and long-session memory growth. A locked 60 FPS counter can conceal different amounts of headroom. An uncapped empty scene can produce an impressive number without qualifying useful gameplay.

## 3. What the GPU actually does

Browser 3D uses the player's GPU. WebGPU exposes rendering and compute through a security-conscious abstraction over the machine's graphics stack; it does not emulate every pixel in JavaScript. [MDN's WebGPU overview](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) describes the execution model and compute support. WebGL 2 is an older raster-oriented interface with a broad installed base.

A browser can display high-resolution textures, physically based materials, animated models, dynamic shadows, particles and sophisticated post-processing. Whether a particular combination runs well depends on the hardware, implementation and scene. Resolution is not visual complexity: increasing 1920×1080 output to 3840×2160 creates four times the pixels, but does not necessarily quadruple CPU work or total frame time.

WebGPU can reduce submission overhead and enable algorithms that keep more work on the GPU. It does not abolish memory bandwidth, texture sampling, overdraw, synchronization or power limits. The [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) explains the opportunities; no general percentage of native performance follows from it.

### Common GPU bottlenecks

**Too many pixels shaded.** Transparent smoke, foliage, overlapping sprites, read-through effects and full-screen passes can shade the same pixel repeatedly. A low polygon count does not guarantee a cheap frame.

**Too many shadow views.** Shadowed lights create additional rendering work. A light without shadows and a light with high-resolution dynamic shadows are not equivalent. Particle count alone says little about the cost of a smoky fire that covers half the screen.

**Too much geometry or animation data.** Mesh detail, skinning, morphs, hair and equipment all matter. Distant representations can be simpler without changing server-side character knowledge or behavior.

**Too much bandwidth and synchronization.** Uploading large buffers every frame or reading GPU results back synchronously can stall an otherwise capable renderer. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) discusses resource budgeting, batching and operations that cause synchronization.

These limits exist natively too. Native engines generally offer more direct control and more integrated solutions, not immunity.

## 4. CPU organization can dominate before the GPU is full

The client must decode updates, maintain its permitted view, choose visible objects, prepare animation, update transforms, perform picking, lay out interface elements and submit drawing commands. A fast remote simulation does not make those tasks free.

JavaScript can run efficient numeric loops and use typed arrays. Excess allocations and large numbers of independently managed objects can create avoidable overhead. PlayCanvas's [optimization guidance](https://developer.playcanvas.com/user-manual/optimization/guidelines/) identifies per-draw CPU cost, shader variation, skinned bounds and garbage collection as distinct concerns. Its example draw-call suggestions are rough device guidance, not modern universal engine ceilings.

C++, Rust and suitably compiled C# offer additional options for data layout, vectorization and native libraries. They do not automatically repair a quadratic algorithm, too many object callbacks or a design that copies an entire world for one move. Data-oriented organization means arranging similar data so useful work can be performed in contiguous batches. It is a technique, not a guarantee attached to the letters ECS.

Unity's [Burst compiler](https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html) compiles a supported subset of C# into optimized CPU code. [Entities](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/index.html) supplies a data-oriented entity architecture. Unreal's [MassEntity](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine) provides a comparable class of data-oriented tools. Using these effectively requires organizing work for them; installing the engine does not convert Open Legend's existing server.

Godot exposes [lower-level engine servers](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html) that can bypass scene-node overhead. Here, “server” means an internal rendering or physics API, not an internet server. The same distinction matters when evaluating claims about large object counts.

## 5. Parallelism: neither “browser is single-threaded” nor “native uses every core” is correct

Ordinary JavaScript execution within one event loop is not the whole browser. Workers execute separately. Shared-memory WebAssembly threading is possible with appropriate build and hosting support. [Emscripten's pthread documentation](https://emscripten.org/docs/porting/pthreads.html) describes worker-based threads, deployment prerequisites and practical constraints. Cross-origin isolation is particularly relevant to shared memory; ordinary independent workers are not all subject to the same requirement.

A worker can decode assets or calculate suitable numeric tasks, but transferring or copying large inputs can outweigh the benefit. Work must have a clear owner, cancellation, bounded queues and an efficient handoff. Merely writing asynchronous code does not move CPU work to another core.

Engine support is version-specific. Unity 6.6 documents [parallel Burst jobs on the web](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-burst.html), while ordinary managed C# threads remain unsupported. This is more capable than a blanket reading of older Unity web limitations suggests. Godot supports multithreading, but its [thread-safe API guide](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html) warns that the active scene tree is not generally safe to mutate from arbitrary threads.

Native code also pays for synchronization, contention, cache misses and serial dependencies. More threads are not a substitute for less unnecessary work. A server writer that deliberately preserves ordered effects cannot simply execute conflicting mutations simultaneously without changing its architecture.

## 6. Memory is several budgets, not one number

Separate download size, compressed cache size, decoded CPU memory, JavaScript or managed heaps, WebAssembly linear memory, GPU textures/buffers, and temporary preparation memory. A small compressed asset can become much larger after decoding. A GPU texture may exist alongside a CPU copy and temporary upload buffers.

For scale intuition, an uncompressed 4096×4096 RGBA8 texture contains 64 MiB before mipmaps. A full ideal mip chain adds roughly one third. Four such maps for one unique material approach 341 MiB before other resources. These are arithmetic examples, not a recommendation to allocate that much or a statement about compressed GPU formats.

There is no trustworthy universal claim that “the browser has a 2 GB limit.” Address-space constraints of a particular WebAssembly build, browser process policies, device limits and available memory are different things. Storage quotas are also not RAM limits. [MDN's storage guide](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) distinguishes browser storage systems, best-effort eviction and persistent storage.

Native applications have more explicit resource-management options, but operating systems can still terminate them under pressure. GPU memory exhaustion, device loss and driver bugs remain possible. A robust client needs resource disposal, bounded caches, lower-quality alternatives and restoration behavior on every platform.

## 7. Hardware classes change the sensible renderer

### Integrated graphics and unified-memory machines

CPU and GPU often share memory bandwidth and a power envelope. A CPU-heavy simulation running locally can reduce graphics headroom; a GPU-heavy effect can compete with asset processing. A unified memory architecture does not mean unlimited memory or zero-cost movement between every API and representation.

### Discrete desktop graphics

A stronger GPU permits more graphics work but does not fix client main-thread stalls. Transfers between CPU and GPU memory, shader compilation and display synchronization still matter. Browser [adapter selection](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter) accepts a power preference, not a promise that the requested physical GPU will be used.

### Phones and handhelds

A short cold benchmark can overestimate sustained performance. Heat, battery mode, resolution, memory pressure and background applications affect the result. Test unplugged and warmed devices, not only a development machine on mains power. A small screen can reduce output requirements, but a high-density display can also request an unexpectedly expensive render resolution.

### Consoles

A narrower hardware matrix helps targeted optimization. It does not turn a heavy feature into a free feature, and different console generations or handheld modes are separate targets. Native engine console support includes platform-specific integration and approval; it is not equivalent to a retail console's browser being a supported distribution target. See [platforms and deployment](platforms-and-deployment.md).

## 8. Quality tiers should not change game truth

Visual level of detail can simplify a faraway person's mesh, reduce animation sampling, share materials, reduce shadows or use an impostor. The server can retain the same identity and consequences. This is different from silently ceasing to simulate a meaningful character.

Culling hidden geometry is also different from withholding secret information. Client-side culling cannot protect a secret already sent to the client. The simulation must decide what a player is entitled to learn; the renderer decides how to draw that information.

An Open Legend quality tier should preserve readable combat, usable entrances, correct picking, construction boundaries, required captions and perceived evidence. A speedup that removes important gameplay information is a different product, not a like-for-like optimization.

## 9. What would justify native development on performance grounds?

A native route has a strong case when a required experience repeatedly exceeds client CPU, memory or graphics budgets on the target hardware even after sensible scene organization; when the needed graphics features lack a supported web path; or when a native engine's integrated animation, streaming and profiling tools substantially reduce the work necessary to reach the target.

A switch has a weak performance case when the observed bottleneck is server history processing, database access, AI latency, poor network relevance filtering, or an inefficient scene representation that will simply be reimplemented unchanged.

The conclusion is not that browsers and native engines are equal. It is that the size of the difference must be established for the actual bottleneck. [The benchmark plan](benchmark-plan.md) defines two comparisons: a matched common-feature workload, and each engine's best practical implementation of the required experience. Neither has been run in this research.
