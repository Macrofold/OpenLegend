# PlayCanvas dossier

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; comparative performance unmeasured | Evaluates PlayCanvas on its own merits, not as the incumbent that must be defended. | 2026-10-15 |

## Position in the shortlist

PlayCanvas is a credible game-oriented browser engine, not merely a lightweight drawing library. Its strongest case for Open Legend is a web-first product combining a real-time world with a substantial HTML interface and live data-driven content. Its weakest case is a native/console-first product whose required graphics, input or production tools repeatedly exceed the economical web route.

Open Legend currently pins PlayCanvas 2.22.2 in [the client package](../../../apps/client/package.json). Current public documentation and API examples may describe later releases. An available engine feature is neither evidence that the pinned version includes it nor proof that Open Legend enables or qualifies it.

## Performance and hardware

PlayCanvas submits rendering to the player's GPU through browser graphics APIs. Its documented browser route defaults to WebGL 2, with a separately requested WebGPU path and fallback behavior. Device/OS/browser support must be checked together. [Supported browsers and backends](https://developer.playcanvas.com/user-manual/engine/supported-browsers/).

The current graphics overview labels WebGPU beta. That is not a reason to dismiss it, but it is a reason to test custom materials, shadows, fallback, device loss and target hardware rather than assume a painless switch. A newer backend can help submission-heavy or compute-suitable work; it will not solve excessive overdraw or server database latency.

[Hardware instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/) can render many repeated meshes efficiently. The documented implementation does not individually frustum-cull instances by default. Spatial grouping therefore matters: one giant group can keep unnecessary work visible. Unique animated characters with different equipment are not equivalent to repeated rocks.

The [optimization guidance](https://developer.playcanvas.com/user-manual/optimization/guidelines/) covers draw submission, shader variants, skinning-related work, allocation and pixel cost. Its numerical rules of thumb should be treated as workload/device advice, not absolute limits. For Open Legend, measure the combination of lit sprites, animated meshes, shadows, captions, selection and construction rather than one isolated primitive count.

## Rendering and effects

The engine includes physically based rendering, animation, lighting and shadows, particles, post-processing, compressed textures and modern GPU facilities. [Graphics overview](https://developer.playcanvas.com/user-manual/graphics/). This makes an attractive 3D world possible without a native migration.

The tradeoff is not “no special effects.” It is how much of the required effect/asset workflow is integrated and performant on the broadest supported browser path. High-end native ray-traced rendering, elaborate hair or cloth workflows and cinematic character production should not be assumed equivalent to Unreal's specialized stack merely because both can draw a convincing example.

For dynamic authored worlds, effects should be bounded presentations of admitted behavior. A generated explosion can select supported visual parameters; it should not introduce unbounded shader work or client-authoritative damage. Quality tiers can simplify the effect while preserving its gameplay meaning.

## Gameplay and networking

PlayCanvas does not inherently restrict Open Legend to a small simulation, turn-based play or flat terrain. The current server owns outcomes and already has an independent spatial model. A different renderer will not change the number of character interactions the server must calculate.

Real-time browser transports can support action games, but prediction, interpolation, reconciliation and loss handling are application responsibilities. Keeping the current HTTP/SSE path is one implementation choice, not the full limit of browser networking. Conversely, choosing WebTransport does not automatically provide a complete game protocol. See [controllers and networking](../controllers-and-networking.md).

The simulation should send only information the player may receive. Client culling, a fog shader and hidden DOM elements cannot protect secret state already delivered to the browser.

## Controllers, interface and accessibility

The [GamePads API](https://api.playcanvas.com/engine/classes/GamePads.html) supplies gamepad integration. Browser support for device-specific haptics and peripherals remains variable. Full controller support still needs action mapping, rebinding, menu focus, text entry, disconnection handling and a usable selection model.

A genuine advantage is the ability to combine the 3D view with ordinary web interface technology. For Open Legend's inventories, conversation, invention review and world creation, this can reduce custom interface infrastructure. It does not make the existing interface controller-complete or automatically accessible; that has not been established by this research.

## Runtime content and production workflow

The engine can be used directly from code or through its separate editor. The [engine overview](https://developer.playcanvas.com/user-manual/engine/) explicitly supports standalone use and describes its MIT license. Open Legend currently uses a code-based integration; the hosted editor is an optional different workflow, not a dependency we must adopt.

A browser-first asset pipeline is a plausible fit for models and textures fetched after a world changes. Every required format/extension, animation and material still needs a runtime compatibility test. Asset arrival, texture decoding, shader preparation, temporary memory and cancellation can create stalls even when steady rendering is fast.

This route keeps JavaScript/TypeScript integration and text-based application tooling straightforward. The counterweight is custom production work: world streaming policy, advanced character pipelines, authoring tools and specialized effects may need more team ownership than in a full native editor ecosystem. Evaluate the actual tools needed, not just language familiarity.

## Platforms and costs

Browser deployment supports quick entry without a conventional installation, subject to download size, device support and connection quality. A PWA or desktop wrapper can add packaging and lifecycle integration, but does not automatically turn the renderer into an unrestricted native engine. Console release is not established merely because a retail console contains a browser.

The MIT engine license is distinct from hosted editor/service pricing and third-party asset rights. It fits more naturally with the current AGPL code policy than incorporating a proprietary engine runtime, while still requiring notices and dependency review. See [licensing and cost](../licensing-and-cost.md).

## Best uses and reasons to reject it

Use PlayCanvas when local browser rendering and a rich web interface are actual product advantages, the visual workload can be organized within the target budget, and the team accepts responsibility for missing production infrastructure.

Reject it when a required native/console experience has no economically credible web path, when sustained client performance repeatedly misses targets for platform-level reasons, or when rebuilding tools costs more than the access benefits are worth. Existing code investment is not an independent reason to stay.

**Research judgment:** PlayCanvas remains the leading browser-game baseline for this project, but not a proven best overall route. Its position should survive a fair browser-engine comparison and a native-client trial. A server bottleneck alone does not disqualify it; a browser-specific failure in the required scene can.
