# Three.js dossier

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; comparative performance unmeasured | Evaluates a programmable rendering-library route rather than treating it as a complete native game engine. | 2026-10-15 |

## Position in the shortlist

Three.js is a credible option when the team deliberately wants to own a custom presentation architecture around a capable rendering library. It is especially relevant to a server-driven world with bespoke interface and asset behavior. Its lower-level flexibility is both the attraction and the cost.

The important comparison is not whether Three.js can draw the world—it can support substantial 3D rendering—but how much animation, scene management, effect tooling, input, physics integration and production infrastructure the team would need to assemble and maintain.

## Performance and hardware

The current [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) prefers WebGPU when available and can fall back to WebGL 2. This is a useful backend path, not a promise that all custom effects and algorithms behave identically on both.

A custom architecture can avoid unnecessary object processing and arrange rendering around Open Legend's actual permitted views. It can also accidentally recreate a slower scene graph, duplicate caches or introduce excessive buffer uploads. A rendering library is not automatically faster than a fuller engine; its smaller scope merely gives the application more responsibility for the work surrounding rendering.

For repeated objects, batching/instancing and correct bounds matter. For personalized characters, animation evaluation, skinning, equipment and materials matter. A benchmark of static meshes cannot answer the character-population question. Browser CPU, GPU, memory and lifecycle constraints remain those described in [performance and hardware](../performance-and-hardware.md).

## Rendering and special effects

Three.js supports substantial model and material workflows and a programmable renderer. The current renderer's node-oriented facilities can support modern effects, while custom shaders and backend differences require careful qualification. Do not assume shaders written for another engine transfer directly.

The [glTF loader](https://threejs.org/docs/pages/GLTFLoader.html) documents a concrete runtime model-loading path and supported extensions. A practical Open Legend asset profile should specify required extensions, textures, animations and failure behavior rather than accept every file advertised as glTF.

The tradeoff is greatest in production: an individually impressive custom effect is not a complete toolchain for producing, previewing, validating and optimizing many effects across devices. A small library may be an excellent foundation when that toolchain is intentionally part of the team's product. It is less attractive when the goal is to stop building graphics infrastructure.

## Gameplay and networking

Three.js does not replace Open Legend's rules, world authority or persistence. The existing server can remain the source of game outcomes. Physics, navigation and real-time networking must be selected and integrated separately where the client needs them.

That separation can be architecturally clean. It also means that choosing Three.js does not deliver an action-game movement stack, multiplayer prediction, a save system or large-world residency by itself. A bespoke engine assembled from libraries must be compared on its whole maintenance cost, not only the renderer's package size.

Neither rich gameplay nor complex simulation is categorically excluded. The limitation is available engineering effort and client resource budgets, rather than a list of forbidden genres.

## Controllers and interface

Browser gamepad, keyboard, pointer, touch and supported XR APIs can be integrated with application commands. Rebinding, control contexts, advanced-device fallbacks and menu navigation remain the game's responsibility. A 3D library's input sample is not complete controller support.

Three.js can coexist with an HTML interface and React-based application architecture. A React renderer integration is an additional dependency and design choice; it does not mean per-frame simulation should trigger broad interface reconciliation. Keep high-frequency visual work separate from ordinary UI updates where appropriate.

## Runtime creation and resource ownership

Runtime model loading is a natural part of the library's use. That is favorable for live generated visuals, but the team must own the complete lifecycle: download cancellation, decoder work, geometry/texture limits, material policy, scene replacement, GPU disposal and late results after a world changes.

Generated appearance remains non-authoritative. A mesh's visual dimensions do not independently authorize physical passage, damage or construction. The server's admitted definitions should provide the relevant mechanical meaning.

A custom renderer can expose exactly the visual capabilities desired by the World Agent. It also risks turning every new visual family into custom engine development. Measure that burden against PlayCanvas/Babylon and native alternatives before selecting this route.

## Platforms, licensing and workflow

The [official Three.js project](https://github.com/mrdoob/three.js) is MIT-licensed. Its ordinary browser usage does not provide a turnkey native console port. Desktop/mobile wrappers retain their own web-runtime and platform constraints; see [deployment routes](../platforms-and-deployment.md).

Text-based code and a broad JavaScript tooling environment can be convenient for automated development. They do not eliminate the need for real-device rendering checks. Source access and library modularity offer control, while long-term integration, effect tools and asset preparation become more directly the project's responsibility.

## Best uses and reasons to reject it

Choose Three.js when custom rendering is a deliberate strategic capability and the team can justify assembling the surrounding game-client systems. It can be particularly suitable for unusual visualization, a highly specialized scene representation or a world whose interaction model differs substantially from conventional engines.

Reject it when the objective is primarily to reduce custom engine work, gain native platform integrations or obtain a mature integrated animation/effects workflow. Replacing one browser renderer with a library is not an automatic solution to browser limits.

**Research judgment:** viable, but not the leading Open Legend route today. It needs a specific architectural advantage that PlayCanvas or Babylon cannot provide economically. No such decisive advantage or matched performance result has been established here.
