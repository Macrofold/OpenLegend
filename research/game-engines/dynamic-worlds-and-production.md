# Dynamic worlds, generated content and production workflow

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research | Identifies the engine capabilities needed for live invention, generated visuals and a maintainable production pipeline. | 2026-10-15 |

## 1. Open Legend has two kinds of engine

The graphics/game-client engine controls presentation, input and selected local facilities. Open Legend's authored-world runtime controls admitted rules, character knowledge, consequences and persistence. These responsibilities can share a process or communicate across a network, but choosing Unreal, Unity or Godot does not merge their meanings automatically.

The current [engine/world boundary](../../docs/engine-and-world-boundaries.md) and [implemented architecture](../../docs/architecture.md) remain authoritative. This research proposes evaluation criteria, not new gameplay laws or permission to run generated code.

The central product test is a useful invention that becomes real in the world, can be inspected and used, affects another character through permitted observation, and remains consistent after reconnect. A beautiful generated image or a named object with no mechanical effect is not enough. The [gameplay priorities](../../docs/repertoires/gameplay-priorities.md) explicitly distinguish that premise from a generic survival checklist.

## 2. Four distinct content capabilities

**New parameters:** change supported colors, dimensions, material properties or other bounded values. Usually the narrowest technical route, but values still need validation and gameplay meaning.

**New compositions:** combine existing supported pieces into a new tool, structure or visual arrangement. This can create meaningful novelty without downloading new executable code. The physical, visual and interaction representations must agree.

**New assets:** fetch new textures, meshes, audio or animation after the application ships. This needs a runtime importer and a supported format profile, not just an editor import button.

**New algorithms:** introduce behavior that the trusted runtime cannot currently express. This is a fundamentally different security, determinism, licensing and platform question. A generated script should not receive ambient host privileges simply because it came from an AI.

An engine that handles the third category well may still offer no safe answer to the fourth. Conversely, meaningful invention can exist through the first two without pretending to simulate arbitrary new physics.

## 3. Editor import versus runtime import versus prepared downloads

Editor import can perform expensive processing before distribution. A runtime importer must handle files while the player is using the application. A prepared asset bundle can be downloaded later, but generally still needs a build/preparation pipeline that understands the target engine/platform.

Godot documents [runtime file loading](https://docs.godotengine.org/en/stable/tutorials/io/runtime_file_loading_and_saving.html), including exported-game model loading. Unity's [glTFast runtime importer](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.14/manual/ImportRuntime.html) is another concrete route, while [Addressables](https://docs.unity3d.com/Packages/com.unity.addressables@2.7/manual/RemoteContentDistribution.html) addresses prepared content distribution. Three.js exposes [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

Unreal's [Interchange runtime workflow](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-assets-using-interchange-in-unreal-engine) is significant, but its documented Blueprint path excludes skeletal meshes and animation. That route-specific limitation must be tested before promising arbitrary live generated characters. It is not a blanket statement that all Unreal runtime importing is impossible.

The relevant comparison is therefore a matrix of actual content families: static mesh, skeletal mesh, animation, morphs, materials, textures, audio and collisions. “Supports glTF” is too coarse if the required extension or animation path is missing.

## 4. The complete live-asset journey

A candidate client should receive a newly admitted visual description or asset reference, fetch only authorized resources, bound bytes and decoded complexity, prepare the representation, show a useful pending/failure state, install it without replacing authoritative gameplay, and release it correctly when the world or access changes.

Qualify cancellation and late completion. A player who changes worlds must not receive the previous world's private asset or accidentally attach an old model to a new entity. A server rejection must not leave a locally usable object. A corrupt image or unusually large mesh must fail explicitly without exhausting the client.

Measure first-use cost as well as warm rendering: network fetch, decompression, mesh processing, texture upload, shader preparation, animation setup and temporary memory. Ten thousand cheap reused objects and ten thousand unique freshly decoded objects are different workloads.

A portable asset representation improves flexibility but does not provide identical appearance automatically. Coordinate conventions, units, material models, transparency, texture color spaces, animation rigging and renderer features need a documented profile. The prototype should show a real imported object in the actual lighting and interaction system, not only a neutral model viewer.

## 5. Dynamic geometry changes more than appearance

A newly built wall can affect collision, navigation, sight, sound and rendering. These consumers should derive from the accepted world definition rather than maintain competing writable truths. Client visual loading must not decide when a wall becomes mechanically real.

Native engines can supply powerful navigation and physics tools, but rebuilding geometry has cost. Browser engines can also display changing geometry, but server-derived collision and routes still need preparation. Neither a navmesh plugin nor a renderer's terrain tool establishes arbitrary real-time structural simulation.

A high-quality prepared environment and an unrestricted editable environment can need different algorithms. Precomputed visibility, baked lighting, frozen scene optimizations and cached navigation require correct invalidation. This is a major reason to benchmark Open Legend's live changes rather than a static engine demo.

## 6. Character production is a distinct investment

A detailed character requires more than polygons: rigging, usable animation, transitions, equipment attachment, material consistency, body proportions and readable interactions. A high-end engine may offer extensive tools, but a generated mesh is not automatically a production-ready actor.

For scale, separate close-up characters from distant representations. A distant character can use cheaper visual animation while preserving its identity and server-side activity. Never silently change what the character knows or what actions are possible just to meet a rendering target.

The strongest native-engine argument may be production throughput rather than raw FPS: fewer custom tools for expressive movement, interaction and effects. The strongest browser/open-runtime argument may be immediate data integration and simpler delivery of new content. Both need an actual authoring task to compare.

## 7. Effects, physics and audio must retain semantic boundaries

A visual flame, fog volume or rain effect is not the authoritative process that consumes fuel, blocks perception or wets an item. It can be rendered differently at lower quality while preserving meaningful feedback. Some visual effects may need conservative fallbacks so players cannot gain an advantage by disabling them.

Local cloth and ragdolls can be decorative when their positions have no game consequences. Once they block movement, damage someone or determine possession, they need a defined authoritative owner. Running a fast but divergent local simulation can make a game feel responsive while making its outcomes inconsistent.

Audio is similarly split between presentation and knowledge. A spatial audio renderer is not automatically the rule that decides what a character heard. Engine or browser audio limitations should be evaluated against audible gameplay cues, captions and accessibility, not just cinematic fidelity.

## 8. Development with AI and automation

Text-based code, inspectable assets and command-line builds can make automated changes easier to review. Visual editors can make spatial and animation work easier for humans. These are complementary, not mutually exclusive advantages.

Do not use “AI writes C++” as evidence that an engine port has negligible cost. The difficult work includes deciding the correct ownership, testing the real control path, inspecting generated assets, measuring stalls and recovering from partial failure. An assistant editing scene files without seeing the exported application has not verified the player experience.

Engine-specific AI/MCP integrations should be evaluated for actual available tools, permissions, observability and cost. A plugin advertisement is not proof that it can safely complete Open Legend's invention workflow. Generated code and downloaded plugins remain untrusted until admitted under the project's rules.

## 9. Production maintainability and vendor dependence

Record the exact editor, renderer, package, shader and asset-import versions. Upgrades can affect output, controller behavior, performance and format support. Keep a small reproducible qualification scene and preserve measured evidence rather than assuming semantic-version compatibility proves rendering equivalence.

An open engine makes source inspection and fixes possible, but maintaining a fork has ongoing cost. A proprietary engine can reduce custom tooling, but its terms, supported platforms and package roadmap become external dependencies. A low-level library gives maximum architectural freedom while making more surrounding infrastructure the team's responsibility.

Portable authored definitions and server authority can preserve strategic options without inventing an unused abstraction framework. Keep interfaces narrow and motivated by real consumers. A speculative universal renderer wrapper should not become a prerequisite for an actual playable test.

## 10. Selection implications

For Open Legend, runtime-generated content and authoritative authored behavior should be first-class selection criteria alongside visible crowd performance. An engine with outstanding prepared-scene graphics can still be a poor fit if every meaningful invention requires a rebuild or unsafe executable extension.

The comparative task should therefore include both a dense playable scene and a live content journey in an exported application. It must preserve private information, exact outcomes and cancellation. [The benchmark plan](benchmark-plan.md) defines that evidence without claiming it has been collected.
