# Sources, evidence quality and maintenance

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed source review | Records primary-source coverage, version-sensitive corrections and the limits of the research evidence. | 2026-10-15 |

## Evidence standard

External technical claims in this collection use official engine documentation, browser/API documentation, platform-holder requirements, vendor license terms or first-party engineering guidance. Detailed sources are linked beside the relevant claims in each chapter. This register highlights the most decision-sensitive references; it is not a replacement for those inline citations.

Official documentation establishes that a mechanism is supported or restricted in a described configuration. It does not prove that Open Legend meets a frame-time, population or production target. Vendor feature lists and demonstrations are not treated as matched comparative benchmarks. The collection contains no newly measured engine performance, hardware qualification, legal clearance or confidential console evidence.

All external sources were reviewed for this research on **October 15, 2026**. Some documentation URLs are moving stable/current pages. Versioned URLs are used where available; the selected implementation must recheck exact editor, package, renderer and platform versions. Access date is not the same as publication or release date.

## Repository basis

The research base is GitHub `Macrofold/OpenLegend`, `refs/heads/main` at `02faa5f82ecd9357ad4b7c775ed29aab7a346da4`. Important repository sources are [AGENTS](../../AGENTS.md), [licensing](../../LICENSING.md), [architecture](../../docs/architecture.md), [performance](../../docs/performance.md), [gameplay priorities](../../docs/repertoires/gameplay-priorities.md), [the client package](../../apps/client/package.json), [the renderer boundary](../../apps/client/src/world-renderer.ts) and [client/server communication](../../apps/client/src/api.ts).

These documents distinguish actual implementation from planned extensibility and larger-scale qualification. The engine research does not promote a target architecture or an old benchmark into a claim that it has been delivered at scale.

## Version-sensitive findings to preserve

| Finding | Primary evidence | Qualification |
| --- | --- | --- |
| Unity 6.6 can execute Burst-compiled jobs in parallel on the web | [Burst web multithreading](https://docs.unity3d.com/6000.6/Documentation/Manual/web-multithreading-burst.html) | Requires Burst 1.8.26+, settings and hosting prerequisites; ordinary managed threads remain unsupported |
| Unity 6.6 lists URP WebGPU support without the older experimental matrix label | [6.6 pipeline matrix](https://docs.unity3d.com/6000.6/Documentation/Manual/render-pipelines-feature-comparison.html) | The [6.3 matrix](https://docs.unity3d.com/6000.3/Documentation/Manual/render-pipelines-feature-comparison.html) differs; HDRP is not a web route |
| Godot's current Compatibility renderer includes glow and SSAO | [Renderer comparison](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html) | It still lacks several Forward+ features and is not a WebGPU renderer |
| Godot 4 web export is not native feature parity | [Web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | WebGL 2/Compatibility and documented C# export restriction remain relevant |
| Current Unreal Nanite includes skeletal-mesh support | [Nanite documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine) | Material/deformation/workflow limits remain; this is not a character-simulation speedup |
| Unreal can import through a runtime Interchange route | [Interchange importing](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-assets-using-interchange-in-unreal-engine) | The documented Blueprint runtime path excludes skeletal meshes/animation; do not generalize beyond that path |
| WebTransport is newly Baseline 2026 | [MDN WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) | Older browsers/devices and individual capabilities still need qualification |
| Babylon Native remains separately qualified | [Native product page](https://www.babylonjs.com/native/) | Public page labels it a preview; do not assume console/native feature parity |
| Unity's Runtime Fee is cancelled, not a current charge | [Current pricing explanation](https://unity.com/products/pricing-updates) | Subscription eligibility and other terms still apply |

## Browser and hardware references

[MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) and [Chrome's overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) describe GPU rendering/compute opportunities. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) covers practical resource and synchronization concerns. [Adapter requests](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter) distinguish preferences from guarantees.

[Emscripten pthreads](https://emscripten.org/docs/porting/pthreads.html) is the primary source for the WebAssembly threading deployment discussion. [Browser lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) and [storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) support the distinction between a browser's managed resource environment, persistent storage and RAM.

No universal browser slowdown percentage, RAM ceiling, maximum character count or polygon limit is inferred from these sources.

## Input and networking references

Browser input uses [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) and the separately qualified [haptic actuator](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator). Engine-specific references include [PlayCanvas GamePads](https://api.playcanvas.com/engine/classes/GamePads.html), [Unity Input System](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Gamepad.html), [Unreal Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) and [Godot controllers](https://docs.godotengine.org/en/stable/tutorials/inputs/controllers_gamepads_joysticks.html).

Transport references are [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), [WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) and [WebRTC data channels](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel). Engine networking references include [Unreal Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine), [Unity Netcode for Entities](https://docs.unity3d.com/Packages/com.unity.netcode@1.10/manual/index.html) and [Godot high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html).

These sources establish available mechanisms. Complete controller usability, latency tolerance, private-information handling and shared-world capacity require application-level evidence.

## Engine production and performance references

For PlayCanvas, the [engine overview](https://developer.playcanvas.com/user-manual/engine/), [graphics overview](https://developer.playcanvas.com/user-manual/graphics/), [optimization guidance](https://developer.playcanvas.com/user-manual/optimization/guidelines/) and [instancing guide](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/) distinguish supported features from costs and representation constraints.

For Babylon, use the [specifications](https://www.babylonjs.com/specifications/), [scene optimization](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/), [thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/) and [WebGPU support](https://doc.babylonjs.com/setup/support/webGPU) alongside the separate Native page. For Three.js, the [WebGPU renderer](https://threejs.org/docs/pages/WebGPURenderer.html) and [glTF loader](https://threejs.org/docs/pages/GLTFLoader.html) provide concrete API evidence rather than a claim of a complete game production stack.

Unity's [Burst](https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html), [Entities](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/index.html), [runtime glTF loading](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.14/manual/ImportRuntime.html) and [Addressables](https://docs.unity3d.com/Packages/com.unity.addressables@2.7/manual/RemoteContentDistribution.html) cover distinct execution/content routes. Their separate package versions are not a tested combined configuration.

Unreal references include [MassEntity](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine), [Lumen performance](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-performance-guide-for-unreal-engine), [Niagara](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine), [World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine), [cooking](https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-in-unreal-engine) and [Pixel Streaming](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine). [AMD's engineering guide](https://gpuopen.com/learn/unreal-engine-performance-guide/) informs measurement discipline, not a ranking against other engines.

Godot references include [lower-level server APIs](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html), [MultiMesh](https://docs.godotengine.org/en/stable/tutorials/performance/using_multimesh.html), [thread safety](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html), [Jolt](https://docs.godotengine.org/en/stable/tutorials/physics/using_jolt_physics.html), [mesh LOD](https://docs.godotengine.org/en/stable/tutorials/3d/mesh_lod.html), [occlusion](https://docs.godotengine.org/en/stable/tutorials/3d/occlusion_culling.html) and [runtime files](https://docs.godotengine.org/en/stable/tutorials/io/runtime_file_loading_and_saving.html).

## Platform and licensing references

[Electron's process model](https://www.electronjs.org/docs/latest/tutorial/process-model) and [Tauri webview versions](https://v2.tauri.app/reference/webview-versions/) distinguish wrappers from native rendering engines. [Valve hardware compatibility](https://partner.steamgames.com/doc/steamhardware/compat), [Xbox public requirements](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/console/certification-requirements?view=gdk-2604), [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Godot console guidance](https://godotengine.org/consoles/) inform platform risk without claiming confidential approval.

License references include [Unreal's EULA](https://www.unrealengine.com/eula/unreal), [Unity's Editor Software Terms](https://unity.com/legal/editor-terms-of-service/software), [Godot's license](https://godotengine.org/license/), [Babylon's license](https://github.com/BabylonJS/Babylon.js/blob/master/license.md), [Three.js's license](https://github.com/mrdoob/three.js/blob/dev/LICENSE) and the repository's own licensing guide. The [other-candidate screen](engines/other-candidates.md) supplies primary sources for Bevy, O3DE, Stride, Flax, Defold, Phaser and Roblox.

Legal compatibility is explicitly unresolved where the exact distributed combination has not been reviewed. A link to a license is not a legal opinion or permission to change it.

## Review findings and limitations

The review corrected a Unity-version mismatch: the 6.3 experimental WebGPU matrix label must not be attributed to 6.6. It also retained the distinctions between ordinary managed threads and Burst jobs, current Nanite skeletal support and runtime importer limitations, and native Godot features versus web export.

Public documentation sometimes contains partially stale paragraphs even within a current page. Where statements conflict, the collection narrows the claim to the documented route/version instead of extrapolating. Package-specific gamepad limitations and engine-specific audio restrictions are not generalized into universal browser impossibility.

No comparative port, device benchmark, controller certification, live generative quality evaluation, legal review or closed-platform SDK validation was completed. The proposed [benchmark plan](benchmark-plan.md) is the next evidence step, not a substitute for those results.

## Refresh triggers

Recheck this collection before selecting a shipping editor/package version, adopting a new renderer, making a platform promise, changing license structure or approving a major migration. Also refresh affected sections when required gameplay shifts toward direct-action combat, larger visible crowds, new generated asset families, console release or mobile-first operation.

Preserve dated findings and record what changed. Do not silently promote a preview feature, a vendor target or an isolated demo into verified Open Legend capacity. Keep implementation status in the canonical architecture/performance owners, and use this folder for research and decision evidence.
