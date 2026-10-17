# Controllers, interaction and networking

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; device testing pending | Compares input capability, complete controller usability, browser transports and native networking tradeoffs. | 2026-10-15 |

## 1. Controller support is not a binary checkbox

There are at least four separate questions: can the operating system see the device; can the engine read it; can the game express every required action with it; and does the complete experience satisfy the target platform's usability requirements? A joystick moving a character proves only a small part of that chain.

The browser's [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) exposes common buttons and axes and connection information. Basic gamepad play is therefore possible with PlayCanvas, Babylon.js, Three.js or a native engine's web export. Availability of the API does not prove every model, connection type or mapping behaves identically.

The practical compatibility matrix includes operating system, browser, engine/package version, controller firmware, USB versus Bluetooth, and remapping layers such as Steam Input. Device discovery can depend on the user first interacting with the controller. Gamepad models that look identical to software may use different physical button layouts. Godot's [web-export guidance](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) explicitly discusses discovery and mapping problems.

### Capability comparison

| Need | Browser route | Native route | Open Legend consequence |
| --- | --- | --- | --- |
| Ordinary sticks, triggers and buttons | Common Gamepad API path | Engine/OS controller APIs | Feasible in both; validate actual devices |
| Rebinding and dead zones | Application/engine work | Action systems help | Must exist for gameplay and menus |
| Basic vibration | Browser/device dependent | Usually richer access, still device dependent | Optional enhancement, never sole feedback |
| Adaptive triggers, advanced haptics, lights, gyro | No portable assumption across browsers | Vendor/platform APIs or plugins may be needed | Qualify each feature separately |
| Unusual wheels, pedals or accessibility devices | Mapping and permission constraints | More integration options, not universal support | Test targeted devices; do not advertise blanket support |
| Controller-only text entry | On-screen keyboard, voice or designed alternatives | Platform keyboard integration or custom UI | Invention and conversation remain substantial UX work |
| Local multiplayer controllers | Input assignment and multiple views needed | Engine/platform facilities vary | Separate player identity/privacy from device index |

Browser [haptic actuator support](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator) is explicitly limited across popular browsers. Feature detection and graceful fallback are necessary. Do not equate that API with complete DualSense or console-native haptics. Equally, do not infer that native Unity or Godot automatically exposes every proprietary controller feature.

## 2. Engine input systems

**PlayCanvas:** the [GamePads API](https://api.playcanvas.com/engine/classes/GamePads.html) supplies polling, mapping and supported vibration access. Open Legend's current keyboard/mouse interface has not been audited for complete controller operation by this research. Engine capability is not implemented game behavior.

**Babylon.js and Three.js:** browser controller input can feed application commands. Rendering an input-controlled camera is only the beginning; player remapping, focus rules and menus remain part of the game. Browser XR controller input is a separate device path from an ordinary gamepad.

**Unity:** the [Input System gamepad documentation](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Gamepad.html) describes standard controls, rumble and device-specific distinctions. The inspected package documents weaker WebGL handling of Xbox and PlayStation-specific features. Those package-specific statements should not be expanded into a claim that no custom browser integration can vibrate a controller.

**Unreal:** [Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) provides actions, contexts, modifiers, dead zones and runtime remapping patterns. It is valuable for switching between movement, aiming and interface modes. It does not choose a usable interaction design on the team's behalf.

**Godot:** its [controller guide](https://docs.godotengine.org/en/stable/tutorials/inputs/controllers_gamepads_joysticks.html) documents SDL 3-based desktop support since 4.5, action mapping and different mobile/web implementations. Specialized force-feedback peripherals remain a separate concern. Some troubleshooting sections retain narrower platform claims, so model-specific promises require testing rather than extrapolating from one paragraph.

## 3. What full controller support would mean for Open Legend

This is a proposed evaluation journey, not a new approved feature specification. With the mouse disconnected, a player should be able to sign in, choose a world, move, inspect a person, select an action, fight or evade, manage nested inventory, craft, place a structure, converse, propose an invention, review its result, save where permitted, change settings, reconnect and quit.

The difficult cases are not reading a stick. They are selecting among overlapping objects, building on stacked surfaces, navigating large inventories, entering natural language, showing understandable button prompts, preserving focus after a panel refresh, and recovering from controller disconnection. A virtual mouse can be a fallback but should not be mistaken for a deliberately controller-friendly interface.

For voice input, microphone permission, transcription latency, cost, privacy and an alternative for players who cannot or do not wish to speak must be considered. A gamepad-first design must not make voice mandatory merely because typing is inconvenient. Captions, text size, contrast, reduced motion and non-color-only feedback remain relevant regardless of engine.

Valve's [hardware compatibility review](https://partner.steamgames.com/doc/steamhardware/compat) is a useful concrete reference for controller access, readable interfaces and compatibility. Passing an engine export step is not equivalent to passing that review.

## 4. Browser-specific interaction constraints

Fullscreen, pointer lock, audio playback and microphone/camera access have browser permission or user-activation rules. Those restrictions influence entry flows and recovery after focus loss, not whether a genre is fundamentally possible. A first-person browser game needs a clear way to capture and release the pointer; an escape key or browser gesture must not leave input stuck.

The [Godot web documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) illustrates these restrictions in a shipping engine. Treat its engine-specific implementation details separately from the underlying browser rules. Test non-English keyboards and input-method composition for dialogue and invention; Unity's [web limitations](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html) explicitly identify keyboard-layout mapping differences.

Native applications have fewer browser activation constraints but still need operating-system permissions, focus behavior and platform conventions. “Native” does not mean unrestricted access to every peripheral on mobile or console.

## 5. Transport choice: what the browser can and cannot send

| Route | Useful properties | Main limitation or cost | Appropriate use |
| --- | --- | --- | --- |
| HTTPS requests and server-sent events | Straightforward web infrastructure; request/response plus one-way updates | Ordered reliable delivery; reconnection and application queues need care | Commands, documents, inventories, modest-rate updates |
| WebSocket | Persistent bidirectional messages; broad support | Reliable ordered delivery; application backpressure needed | General real-time game messaging |
| WebTransport | Streams plus datagrams where supported | Server/proxy/browser compatibility and fallback design | Fresh motion samples alongside reliable outcomes |
| WebRTC data channels | Peer or server channels with configurable delivery behavior | Signaling, ICE, NAT traversal and possible relay costs | Real-time peer/server data and voice ecosystems |
| Native sockets and engine transports | More direct protocol choices and native SDK access | Security, NAT, loss recovery and operations still required | Games needing mature UDP-based engine networking |

[MDN's WebSocket reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) warns that the API does not provide automatic backpressure. A client that cannot consume updates fast enough needs bounded queues and an application policy. New positions may replace old positions; a confirmed item transfer or distinct spoken sentence cannot simply be discarded as obsolete.

[WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport) is marked Baseline 2026, newly available since March 2026, for current browser/device versions. It offers reliable streams and unreliable transport to an HTTP/3 server. Older clients and individual subfeatures still need qualification. The correct conclusion is no longer that browsers only offer reliable TCP-style gameplay, but also not that WebTransport can be enabled without server and deployment work.

[WebRTC data channels](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) expose a different real-time path. They are not arbitrary raw UDP sockets. A protocol built for a native engine's UDP transport does not become browser-compatible merely because both ultimately use a network.

Unity documents [browser socket restrictions](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-technical-overview.html). Native applications have more freedom, but no transport eliminates propagation delay, congestion, packet loss or the need to authenticate commands.

## 6. Server authority is a design, not a checkbox in an engine

Open Legend currently makes the server responsible for world outcomes. A new client can consume permitted views and submit intentions without moving the whole simulation into the graphics engine. The present interface can be inspected in [the client API](../../apps/client/src/api.ts); this research does not introduce another writable world state.

Unreal replication, Unity Netcode and Godot's high-level multiplayer are useful when both ends follow their expected object and protocol model. They are not interchangeable implementations of Open Legend's existing API. Unreal's [Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine) organizes which actors are replicated to connections. Unity's [Netcode for Entities](https://docs.unity3d.com/Packages/com.unity.netcode@1.10/manual/index.html) provides an entity-oriented networking stack. Godot's [high-level multiplayer documentation](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html) describes its own peers, RPCs and authority model.

There are two honest integration routes. Keep the existing server and build a client transport/presentation layer, or deliberately move selected authority into an engine-hosted server and define the boundary with the remaining services. Neither route makes memories, access control, persistence or AI coordination automatic.

For direct-action movement, prediction means showing likely local motion before confirmation; reconciliation corrects differences after the server responds. Interpolation smooths other entities between received samples. These techniques can improve feel while preserving server authority, but introduce specific failure cases: newly placed walls, stale navigation, rejected movement, rewound timelines and disconnected players. They need a designed protocol and actual network testing, not just faster rendering.

## 7. Multiplayer scale and security

A character's visible mesh and its private mind must not be treated as the same replication unit. Native and browser clients are both under a player's control. Never send another human's private thoughts, unseen inventories or hidden future paths merely because they are not drawn. Client culling is not authorization.

For each player, record entities disclosed, update frequency, bytes, serialization time and queue age. As a deliberately simplified calculation, 200 entities × 32 bytes × 20 updates per second is 128,000 bytes per second before headers, identifiers, reliability, compression or event data. Multiply by independently scoped viewers to see why relevance filtering matters. This is not the current Open Legend payload size or a bandwidth target.

Dense shared scenes can stress both per-viewer preparation and total network traffic. An enormous world with dispersed players can be easier than a smaller square containing everyone. An engine's published player-count example is evidence for that game's architecture and workload, not ours.

Browsers limit access to invasive native anti-cheat components; native builds may integrate platform-approved solutions. Neither is a substitute for server validation, rate limits, protected credentials and information minimization. This research does not claim anti-cheat certification for any route.

## 8. Cross-play, accounts and console obligations

Cross-play is not just making two clients connect to one IP address. It includes compatible game versions, account linkage, invitations, names, blocking, permissions, voice/text restrictions, content availability and recovery when a service is unavailable.

Microsoft's public [Xbox requirements](https://learn.microsoft.com/en-us/gaming/gdk/docs/store/policies/console/certification-requirements?view=gdk-2604) cover communication privileges and user-generated content, including reporting and handling restricted access. These are particularly important for a game with conversation and authored worlds. Other platforms have their own requirements; this research does not pretend to have reviewed confidential console SDK or certification materials.

A native engine can make access to platform integrations more practical. It cannot guarantee approval of the product's account, moderation or generative-content design.

## 9. Decision implications

Basic controller support is not a reason by itself to abandon the browser. A requirement for predictable advanced peripherals, first-class console distribution or a complete controller-first desktop experience strengthens the native case. The largest Open Legend input task is likely the interaction design for text-rich creation and complex world selection, which remains work under every engine.

Browser networking is capable enough for serious real-time games, but its transport and lifecycle constraints must be designed around. Native engine networking is attractive when its movement, physics and replication systems are adopted coherently. It provides much less automatic benefit when used only as a renderer in front of a custom server.

See [deployment routes](platforms-and-deployment.md), [performance and hardware](performance-and-hardware.md), and the [proposed comparison workload](benchmark-plan.md).
