# Engines, art direction, perception, and audio

Status: researched evidence supporting the **accepted PlayCanvas/custom-simulation and grounded pixel-art direction** in V02–V04. Camera, art production, engine version and editor workflow remain open; no implementation or subscription has been approved. Research checked September 18, 2026, America/New_York / September 19 UTC. Live documentation may change; version-specific limitations below describe the cited documentation.

## 1. Accepted starting direction

**Accepted:** use PlayCanvas for browser presentation with an independent custom simulation and generative-rule interface. This supersedes the initial Babylon.js recommendation. Favor beautiful detailed pixel sprites/textures in a 3D landscape, grounded proportions and modern atmospheric lighting. The proposed first workflow is standalone TypeScript with a fixed elevated camera plus pan/zoom; editor use and camera freedom remain open. Prove one compelling wilderness scene early, before broad asset production. [Visual direction and review criteria](../03-design-proposals/visual-direction.md)

“2.5D” here means a genuine spatial model with positions, heights, obstacle shapes, and facing directions, presented with limited camera movement and simplified assets. It does not mean that fire, hearing, construction, or injuries must be fake in the simulation. A sprite can represent an actor whose server-side body has many injured parts; a tree billboard can represent combustible material, fuel, moisture, and ownership.

The selected engine does not prescribe hunger, crafting, institutions or inventions. Reuse graphics, input, animation, audio and asset facilities while implementing those mechanics ourselves. Camera and asset workflow still strongly affect cost: free rotation demands more sprite directions or a different asset technique. Resolve that before building an animation library. A weak matching showcase is not proof that a renderer cannot make beautiful art, and a strong showcase does not supply a repeatable production pipeline.

## 2. Engine comparison

These are suitability judgments for Open Legend, not general rankings or benchmark results.

| Candidate | Verified capability or constraint | Project fit and cost of the choice |
|---|---|---|
| **Babylon.js** | Its feature inventory includes scene management, sprites, particles, animation, picking, Web Audio, WebGL/WebGPU, and optional Havok integration. [Official specifications](https://www.babylonjs.com/specifications/) | Superseded initial candidate. Research did not establish a strong finished-game portfolio in the user's desired 2.5D pixel-art style; that is an evidence limit, not a demonstrated visual ceiling. Remains technically viable if later evidence warrants reconsideration. |
| **Three.js** | `WebGPURenderer` falls back to WebGL2, but its manual still labels it experimental. Existing custom shaders and `EffectComposer` effects require migration to its newer material/postprocessing system. The manual recommends `WebGLRenderer` for purely WebGL2 applications. [Renderer guide](https://threejs.org/manual/pages/webgpurenderer) | Attractive when precise rendering control and web tooling matter. Open Legend would assemble more game systems around it. Choose it if the team knows it well or the first scene is deliberately small. Do not make experimental GPU features part of the minimum device requirement. |
| **PlayCanvas** | MIT-licensed JavaScript engine with TypeScript support, WebGL2/WebGPU, sprites, animation, input, audio and asset loading. Standalone and editor-based workflows are supported. [Engine repository](https://github.com/playcanvas/engine), [integration choices](https://developer.playcanvas.com/user-manual/engine/) | Accepted direction. Browser/TypeScript fit and reusable infrastructure are the rationale, not a proven visual or performance advantage. Hosted editor adoption, actual engine version and target-browser behavior remain separate choices. |
| **Godot web** | Current stable docs describe WebAssembly/WebGL2 Compatibility exports, no Godot 4 C# web export, and single-threaded export as default. Threaded exports need cross-origin isolation. Sample-mode web audio has effect and positional limitations; Stream mode changes the latency tradeoff. [Web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | Good candidate for an editor-centered, sprite-heavy game. Browser voice integration and export behavior deserve an early feasibility check. Do not select Godot assuming its desktop rendering/audio feature set carries unchanged into a browser. |
| **Unity web** | Unity 6.0 documents no native IP sockets, limited Web Audio support, a single C# thread, no dynamic code generation through `Reflection.Emit`, and possible physics differences between Web and other platforms. [Unity 6.0 technical limitations](https://docs.unity3d.com/6000.0/Documentation/Manual/webgl-technical-overview.html) | Fully custom simulation remains possible; Ludeon documents its own object/time systems on Unity. Generated definitions can be interpreted as data; new executable algorithms can use an interpreter, JavaScript bridge or external service. These are runtime tradeoffs, not restrictions to predefined mechanics. Recheck the selected Unity release before reconsideration. [Ludeon FAQ](https://ludeon.com/blog/faq/) |
| **Unreal with Pixel Streaming** | Unreal renders on a remote machine and streams encoded frames/audio to a browser, which sends input back. This is a different deployment model from browser-local rendering. [Pixel Streaming overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-pixel-streaming-in-unreal-engine) | Keep for a later high-fidelity client, installation, or premium experiment if measured demand justifies it. GPU rendering and video delivery become recurring infrastructure work. Multiple viewers of one camera do not establish capacity for thousands of independently controlled viewpoints. |

Epic describes its streaming servers as reference implementations, says a complete scaling solution is outside the provided scope, and notes that the old matchmaker was deprecated in UE 5.5. Its hosting guide also covers TURN and GPU/encoding considerations. Therefore, “Unreal can run in a browser” does not imply a cheap, ready-made massive multiplayer web deployment. [Epic hosting and networking guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/hosting-and-networking-guide-for-pixel-streaming-in-unreal-engine)

**Current evaluation rule:** start with PlayCanvas and test the required look, workflow and browser performance. Compare a fallback only when a concrete blocker warrants it. No research here establishes a performance winner, and the accepted choice is not a claim that other engines constrain generative mechanics.

### PlayCanvas licensing, maintenance and production evidence

The engine is MIT licensed. Its editor **frontend** was also released under MIT on July 30, 2025; that frontend connects to PlayCanvas's backend and is not the whole hosted service. The hosted editor offers free and paid plans. Engine-only development does not require a hosted-editor subscription. No account, subscription or self-hosted editor setup is selected for Open Legend. [Engine license](https://github.com/playcanvas/engine/blob/main/LICENSE), [editor announcement](https://blog.playcanvas.com/playcanvas-editor-frontend-is-now-open-source/), [editor plans](https://playcanvas.com/plans)

The September 2026 release history shows continuing feature work and fixes, including releases on September 4, 8 and 11. Public code, issues, examples, documentation and community channels support its use as an established specialist engine. This is maintenance evidence, not an SLA, future-support guarantee or proof of Open Legend workload capacity. Expect a narrower ecosystem than Unity when budgeting integration and learning effort. [Release history](https://github.com/playcanvas/engine/releases), [developer documentation](https://developer.playcanvas.com/user-manual/engine/)

| Published project | Evidence and relevance | Limitation |
|---|---|---|
| Venge.io | Multiplayer browser shooter in the [2021 PlayCanvas showcase](https://blog.playcanvas.com/playcanvas-showcase-2021/) | Production precedent, not a pixel-art reference or measured current audience |
| Ready Chef Go! | Mojiworks' Snapchat cooking game in the same showcase; a [PickFu customer case study](https://www.pickfu.com/case-studies/mojiworks-ready-chef-go) reports more than 70 million players historically | Attributed historical reach, not current active users or independently measured capacity |
| Mini Royale: Nations | Faraway game in the [2022 showcase](https://blog.playcanvas.com/our-2022-developer-showreel-is-live/) | Multiplayer production precedent; no popularity figure verified here |
| Bitmoji Party / Bitmoji Paint | Snap games in the [2021 showcase](https://blog.playcanvas.com/playcanvas-showcase-2021/) | Published social-game precedent; no current availability or art-style equivalence implied |

The desired visual references are [Songs of Conquest](https://www.songsofconquest.com/) and [Octopath Traveler II](https://www.square-enix-games.com/en_US/home/octopath-traveler-ii-ochette-castti-character-trailer). They demonstrate the aesthetic target, not PlayCanvas/browser delivery. No matching finished PlayCanvas pixel-art game has been verified as a production template for Open Legend.

## 3. Do ambitious environmental features require an AAA engine?

No, for the proposed game logic. They might justify one if high-fidelity physical destruction, cinematic rendering, or accurate acoustic simulation becomes the central experience. Those are different requirements from a credible world that understands materials and consequences.

Use three layers:

1. **Meaning:** an action targets an object or actor under particular conditions; novel requests can receive semantic interpretation.
2. **Authoritative simulation:** validated rules update quantities and relationships over time. This determines whether the tree burns, the roof loses support, or the listener notices a sound.
3. **Presentation:** the renderer selects animations, particles, sounds, shaders, and replacement assets to communicate those results.

| Feature | Useful first simulation | Useful first presentation | Later expansion and actual difficulty |
|---|---|---|---|
| Fire | Ignition preconditions; fuel, moisture, burn rate, heat, damage; neighboring combustible objects | Shared fire emitter, smoke, tint, intact/scorched/charred/ash stages | Wind and heat grids, indoor smoke, suppression, weather. Main challenge is bounded spread and consistent material rules, not purchasing a particular renderer. |
| Sound | Event position, loudness class, distance, hearing ability; one obstruction test | Distance attenuation, stereo positioning, low-pass filter behind a wall | Rooms/portals, multiple barriers, reverberation and diffraction approximations. Exact wave simulation is a separate research scope. |
| Light | Time of day, local illumination score, line of sight, darkness penalties | Ambient/day-night colors and a few local lights | Shadowed visibility, volumetrics, indirect lighting. Rendered brightness should not itself become the authoritative stealth rule. |
| Destruction | Integrity thresholds, material, attachment/support graph, debris resource result | Swap wall to damaged wall or rubble; optional local debris | Arbitrary cutting, fracturing, stability and falling structures. Adds geometry, networking, navigation, and exploit complexity. |
| Movement/contact | Navigation grid or mesh, simple shapes, occupancy and reach checks | Walk cycles, eased movement, short reaction animations | Vehicles, ropes, ragdolls, climbing, swimming. Add specific physical systems only when demanded by play. |
| Bodies/injuries | Named body regions, protection, injury severity, healing/status effects | Limp, posture, icon, clothing damage, PG reaction | Detailed anatomical simulation does not require visible anatomical meshes. High-fidelity contact animation is an independent content expense. |

For the tree example, accepting “light the tree” can create a validated burning process. The process updates fuel and integrity on scheduled simulation steps; a client observes `burning` and selects an existing fire effect. No model has to decide every flame, every frame, or every tick. A visual emitter must never be the source of damage. A model proposing “this looks wooden” must not silently replace the registered material or invent missing fuel.

Physics can remain narrow: simple collision and ray tests, with cosmetic client debris. If later gameplay depends on the trajectory of a falling beam, that trajectory becomes authoritative and needs server-side simulation and reconciliation. Buying an engine does not remove those consistency requirements.

## 4. Art direction: pixel art versus low-poly 3D

The user has chosen a grounded, modern pixel-art direction. The following alternatives document production tradeoffs, not an unresolved vote on the desired look or measured claims about a particular generative model. Camera freedom and the method of creating pixel assets remain open.

| Direction | Strength | Hidden workload | Best use here |
|---|---|---|---|
| Fixed-camera pixel billboards | Strong silhouettes, readable groups, small initial motion vocabulary, approachable mood | Directional frames, depth sorting, shadows, held-item alignment, overlapping actors | Initial wilderness scene if fixed camera is acceptable |
| Freely rotating pixel billboards | A spatial feeling while retaining drawn characters | Sprites expose flatness; more viewing directions; feet/props can drift; closeups reveal missing detail | Only after an angle/animation test shows acceptable results |
| Low-poly 3D with reusable rigs | One mesh can face any direction; motion and attachments can be reused; lighting is coherent | Rigging, weights, topology, UVs, animation cleanup, polygon/material budgets | Prefer if camera freedom or equipment variety dominates |
| Pixel-styled 3D | Reusable geometry with a deliberate low-resolution appearance | Pixel-grid stability, aliasing, lighting/shadow art direction; not automatically cheaper | A compromise worth a small later comparison |
| Full high-fidelity 3D | Strong closeup embodiment and cinematic effects | Large art, animation, performance and hosting demands | Deferred unless this becomes the product's central appeal |

Pixel art is not automatically easier to generate **as a production asset system**. A pleasing single image is easier than a consistent animation family. A character with 8 directions, 6 actions and 8 frames per action has 384 frame positions before outfits or equipment. This is illustrative arithmetic, not a required target. Generated frames may alter proportions, eye positions, lighting, costume details, scale, or pixel density. Mirroring can incorrectly swap a one-sided injury or a held item.

Low-poly assets have different hurdles, but a clean shared skeleton can amortize animation across many people. A fixed-camera game can even render sprite sheets from a small 3D asset family, trading initial 3D setup for repeatable angles and lighting. This option is especially relevant for clothing and age variation. Neither direction removes the need for human review and technical validation.

**Accepted tone and proposed production brief:** a beautiful, grounded natural clearing with people, possessions, usable plants, natural cover and improvised structures as they are built; detailed pixel texture, natural proportions, clear silhouettes, restrained earth colors, expressive posture, and atmospheric weather/time-of-day changes. Avoid exaggerated toy-like character styling. Distinguish objects by shape as well as color. Keep dialogue text readable independently of the scene resolution. A pixelation filter alone is insufficient. PG representation can communicate illness, death, affection, and childbirth through transitions, staging, and text without explicit animations. The [visual direction](../03-design-proposals/visual-direction.md) defines the first scene and review criteria.

Start with idle, walk, talk, use/reach, rest, and hurt reactions. Let the same use gesture support chopping, eating, crafting, and opening until a distinct animation improves comprehension. Do not promise arbitrary generated motion. “You start constructing a trap” can initially use existing hand motion and construction stages.

## 5. Asset protocol and generation workflow

Asset references should be data, not hardwired names embedded in rule scripts. Define an asset manifest containing:

- Stable asset ID, immutable version/content hash, family, style revision, and source/provenance.
- License/usage record, attribution requirement, generator/model/version where applicable, reviewer, and approval status. Do not assume generated or downloaded means unrestricted use.
- Scale, pivot, bounding volume, orientation convention, socket/attachment names, and atlas or model references.
- Available animation names and transitions, effect parameters, visual state mappings, accessibility alternatives, and fallback asset.
- Download size, texture/material/geometry budgets, supported renderer features, and validation result.

For sprites, use consistent grid size, palette, frame registration, directions, and animation tags. Aseprite provides sprite-sheet import/export and exporting by frame tags; it is an authoring/packaging tool, not a guarantee of generated-frame consistency. [Aseprite sprite-sheet documentation](https://www.aseprite.org/docs/sprite-sheet/)

For 3D delivery, prefer a constrained glTF/GLB pipeline rather than proprietary scene formats as the only reusable asset. glTF is designed for runtime asset delivery; it does not encode Open Legend's simulation rules or make every engine's materials/physics interchangeable. [Khronos glTF overview](https://www.khronos.org/gltf/)

The proposed generation path is: gameplay requests a capability → registry finds a compatible existing family → use its fallback immediately → queue missing asset work → validate technical budgets and content → review a preview → publish a new manifest version → clients fetch it asynchronously. A missing dragon asset can initially use an explicitly labeled placeholder creature; it must not freeze the simulation or show a misleadingly safe silhouette during a dangerous encounter.

New art should never install executable world rules merely because it has “fire” in its filename. Conversely, a new rule should not require generating every visual before it can be tested in a private development world. Separate mechanic approval, asset approval, and release version so either can be rolled back. Existing objects retain their mechanic/version identity until an explicit migration.

## 6. Spatial audio and readable conversation

Spatial audio has two problems: **who is entitled to receive an utterance**, and **how that utterance sounds at a position**. The server's perception policy determines the first; the client audio graph handles the second. Web Audio's `PannerNode` supports positional/directional audio processing, so basic spatial playback does not require Unreal. Walls and rooms still require application logic; a panner is not an acoustic propagation solver. [MDN PannerNode](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode)

Proposed order: typed speech with overhead text and local event history; cached/generated NPC speech for nearby players; opt-in push-to-talk and transcription; human proximity voice; then wall muffling and richer acoustic zones. Keep subtitles and text interaction usable throughout. Microphone capture requires a secure context and user permission, and denial must leave a functioning text path. [MDN microphone capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

Give an utterance an ID, speaker, location, audience policy, start/end/cancel state, and text/audio association. Agents near a spoken sentence receive one semantic observation, not a separate expensive transcription per listener. Apply perception filtering before adding it to memory. Separate heard words from indistinct noise and inferred emotion. Phone calls are a deliberate remote channel with their own recipients; they do not extend ordinary earshot.

Voice streaming, permission enforcement, media cost, and scaling are discussed in [Hosting and scale](hosting-and-scale.md). Avoid generating hundreds of simultaneous NPC audio streams: prioritize conversation participants, nearby salient speech, and important events; use text or silence for distant background activity.

## 7. Migration boundaries and research gates

Keep stable IDs, coordinates/units, action/event schemas, asset manifests, and perception results independent of rendering-engine classes. Keep the browser's scene graph out of database records. The browser sends intentions and receives permitted state; it does not decide that a hit killed someone. Prefer recorded simulation fixtures that a replacement client can display.

This makes replacement possible, not free. Replacing PlayCanvas requires scene/input/material/effect/UI integration work. Billboard-to-low-poly requires rigs, attachments, camera choices, animation and art budgets. Browser-to-Unreal requires an entirely new client integration and possibly a new delivery model. Keep protocol adapters narrow, but do not build three rendering backends in advance.

Before broad asset production, resolve camera freedom, minimum devices and desired art authorship. After implementation authorization, first prove a small PlayCanvas wilderness scene with terrain height, vegetation, water, a character/tool animation family, daylight/dusk and camera movement. Review beauty and grounded tone as well as pixel stability, depth ordering, readability, frame-time percentiles, download/memory use and cleanup hours. Then extend to crowded conversation and environmental effects. A two-person voice test belongs with the voice decision, not as a prerequisite to the visual proof. R01/R02 validate the selected direction; reconsider the engine only if evidence warrants it.
