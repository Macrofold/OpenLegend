# Platforms and deployment routes

| Research status         | Progress                                                                                                     | Last updated |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed desk research | Compares local web rendering, native applications, wrappers, consoles, cloud streaming and server placement. | 2026-10-15   |

## 1. Engine and platform are separate decisions

A Unity web build and Unity native build share some tools and content but not all runtime capabilities. Godot native and Godot web use materially different renderer options. Unreal streamed to a browser is a native application running elsewhere. A desktop wrapper around a PlayCanvas page is still using a web renderer unless a separate native integration replaces it.

Make the deployment decision explicit before comparing engines. Otherwise a native-only effect can be incorrectly credited to a browser route, or the convenience of browser access can be incorrectly credited to a GPU-streaming service without its operating costs.

## 2. Local rendering in a browser

The player downloads code and assets, and their device renders the world. The server can remain authoritative for simulation. This can reduce initial installation friction and make shared-world links convenient; those are product hypotheses to validate with actual players, not guaranteed adoption or revenue advantages.

The costs include browser/device variability, resource-management constraints, permission and activation rules, background lifecycle behavior and the need to load enough content promptly. [Page lifecycle guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) explains freezing and discarding. These are client events, not a technical requirement that a remotely hosted world stop existing.

Browser caching can reduce later downloads. [Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) vary by storage policy and browser; a cache is not a guaranteed permanently installed asset directory. A PWA can improve installation/offline presentation, but cannot grant arbitrary native APIs or make external AI services available without a network.

A broad fallback tier must be deliberately designed. Unsupported WebGPU, compressed texture formats or optional effects need either a qualified alternative or a clear minimum requirement. Feature detection should not silently put players into a visually broken world.

**Best fit:** easy shared access, rich web interfaces, moderate download requirements and a scene that fits the target browser hardware. **Weak fit:** mandatory low-level peripherals, deeply native platform services or a minimum visual workload with no acceptable portable web path.

## 3. Native desktop

A native client can use the engine's native graphics and input paths, local files and supported platform SDKs. That creates more optimization and integration options. It also adds installers, signed builds, updates, crash reporting and an operating-system/device compatibility matrix.

Windows, macOS and Linux are not one graphics target. Drivers, graphics APIs, CPU architectures and store requirements differ. An effect available on a Windows discrete GPU may have a different implementation or cost on an integrated Mac or Linux handheld. Native testing must specify the actual build and backend.

For Open Legend, native desktop is a credible performance-first primary route without requiring the server to move into the same engine. The stronger case is access to required client capabilities and production tools. The weaker case is merely hoping that a native executable fixes server computation.

A self-contained offline game is additional scope. The current local Open Legend setup uses Node and PostgreSQL/pgvector, and live AI routes use external services. Packaging a native renderer does not remove those requirements. A local server bundle, an alternative storage arrangement or local AI would each require its own evaluated design; this research does not authorize any of them. See the current [run instructions](../../README.md).

## 4. Desktop and mobile wrappers

[Electron](https://www.electronjs.org/docs/latest/tutorial/process-model) bundles Chromium and a native host with Node-oriented integration. It can standardize more of the runtime and support a desktop shell, but the ordinary renderer remains Chromium-based. More native privileges also create a security boundary: untrusted world content must not inherit file or process access through an overly broad bridge.

[Tauri](https://v2.tauri.app/reference/webview-versions/) uses platform webviews. Its smaller host architecture does not guarantee the same browser features, GPU behavior or performance on every operating system. A wrapper can change packaging and integration without changing the fundamental rendering workload.

A native graphics host such as Babylon Native is a different route from these wrappers. Evaluate its actual supported APIs and maturity separately. Do not group every application containing JavaScript into a single “browser performance” category.

**Decision rule:** choose a wrapper to solve distribution or native-integration needs it actually addresses. Do not describe it as a proven graphics-performance migration without measurement.

## 5. Mobile native and mobile web

Mobile adds touch controls, safe areas, memory pressure, thermal throttling, battery budgets, interruptions, input-method keyboards and variable connections. A brief cold run on a flagship device does not qualify a long session on the minimum supported phone.

Native mobile can provide more direct platform integration, but engine feature availability still depends on the selected renderer and hardware. Browser mobile can lower access friction, but its lifecycle and memory environment needs explicit qualification. An attractive desktop browser demo proves neither route is ready.

Application-store policy is separate from what a runtime can technically load. Apple's [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) include conditions for user-generated content and for software such as HTML5/JavaScript mini-games and streaming games. The existence of those categories does not mean arbitrary downloaded executable behavior is unrestricted, and it is inaccurate to claim that all remotely delivered game content is categorically prohibited.

For Open Legend, the text-rich authoring journey is as important as 3D rendering on a phone. Small screens and software keyboards may require a deliberately different creator experience. That is product work under every engine.

## 6. Consoles

A console is a managed platform with approved development tools and release requirements, not just a fixed PC. Native engine platform support, platform-holder approval, account/communication services, controller conventions, content policy and certification all matter.

Unity lists console publishing among its paid-plan capabilities. Godot's [console guidance](https://godotengine.org/consoles/) describes approved developers and third-party porting/middleware routes rather than distributing restricted console templates in the public engine. These are different commercial/support arrangements, not a simple possible/impossible distinction.

Microsoft's public [Xbox certification requirements](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/console/certification-requirements?view=gdk-2604) make communication permissions and user-generated content relevant to the release design. A game with invented worlds and open conversation needs a serious account, reporting and access-control plan. This research did not access confidential SDKs or claim approval on any console.

A console's retail browser is not a substitute for a supported game distribution path. Conversely, using an open engine does not inherently rule out consoles. The actual exporter, SDK, support agreement, license compatibility and product policies determine feasibility.

**Open Legend consequence:** a hard first-release console requirement strengthens the case for a proven native platform workflow and early rights review. Console possibility by itself does not justify discarding the browser before that requirement is chosen.

## 7. Handheld PCs and Steam Deck-class devices

A handheld PC combines desktop software with a tighter power/display/input budget. A game can launch yet still be uncomfortable to use because of tiny text, awkward launchers or controller gaps. Valve's [hardware compatibility guidance](https://partner.steamgames.com/doc/steamhardware/compat) is a useful public checklist.

Test actual controller-only operation, keyboard invocation, readable inventory/invention text, suspend/resume, authentication and sustained performance at realistic power settings. Native or wrapped web software both need these checks. “Runs through a compatibility layer” is not the same as “verified good experience.”

## 8. Cloud-rendered streaming

[Unreal Pixel Streaming](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine) demonstrates the route: the remote host renders, encodes and streams the image; the user's browser decodes it and sends input. This can reach devices unable to render the original scene locally.

The operator now budgets GPU rendering, encoding, session scheduling, bandwidth and regional capacity. Latency includes input transit, remote processing and video delivery. Visual compression can affect small text, fine foliage and fast motion; its practical acceptability must be tested. Server simulation can be shared, but independent views still require rendering resources.

A simple cost model is useful without inventing provider prices: session cost equals allocated GPU/host time plus video egress, relay, storage and operations. At an illustrative 15 megabits per second, video alone transfers about 6.75 decimal gigabytes per hour before overhead. This arithmetic is not a required bitrate or a quoted cloud price.

Streaming is credible for optional high-end access, demonstrations or managed contexts with suitable networks. It is a weaker default when operating cost, offline use or latency-sensitive control is central. It preserves a URL entry point but not the economics or client independence of local browser rendering.

## 9. XR and specialized hardware

XR is not automatically part of Open Legend's current scope. It would add low-latency head tracking, stereo/multiview rendering, motion-controller interaction, comfort and headset-specific performance targets. Engine XR support should be evaluated for the exact device and runtime rather than inferred from ordinary gamepad support.

The same applies to steering wheels, eye tracking and advanced haptics: choose the required device behavior first, then verify API, driver, engine and platform support. Optional integrations should have usable fallbacks; required integrations narrow the supported platform set.

## 10. Server placement is independent of presentation placement

The main architectural options are: a remote shared authoritative server, a local server on the player's machine, an engine-native dedicated server, or a deliberate hybrid. Each has different operational, privacy, offline and synchronization consequences.

Running headless removes drawing, not simulation, database or AI cost. A native dedicated server can be useful when engine-native movement/physics is central. A custom server can be useful for Open Legend's persistent authored rules and history. Neither requires every connected client to use the same rendering technology if the protocol is deliberately maintained.

Multiple clients increase maintenance and compatibility work. Do not keep both indefinitely merely to avoid deciding. The recommended architecture and conditions for choosing a primary route are in [the unified assessment](open-legend-assessment.md).
