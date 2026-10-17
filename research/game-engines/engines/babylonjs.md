# Babylon.js dossier

| Research status                                             | Progress                                                                                         | Last updated |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------ |
| Completed desk research; comparative performance unmeasured | Assesses a substantial web alternative and separately qualifies Babylon Native's preview status. | 2026-10-15   |

## Position in the shortlist

Babylon.js is the most important direct browser alternative to compare with PlayCanvas. Its rendering, inspection and visual-authoring facilities make it a serious candidate, not a token inclusion. The question is whether those facilities materially reduce the cost of Open Legend's required scenes and live-content workflow.

The public site presents Babylon.js 9.0 during this review. Package versions, physics integrations and browser backends must be pinned together in any trial. A current feature catalogue is not evidence that every backend or native host exposes the same capability.

## Performance and hardware

Babylon supports WebGL and WebGPU paths. Its [WebGPU documentation](https://doc.babylonjs.com/setup/support/webGPU) describes the modern backend. A browser-native architecture can preserve direct integration with the existing TypeScript application and server, but cannot bypass browser resource, permission or lifecycle constraints.

The engine offers several object-representation choices. [Thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/) avoid a full JavaScript object per repeated instance, but the group has coarse visibility behavior and dynamic insertion/removal tradeoffs. They are particularly useful for appropriate repeated scenery, not proof of inexpensive unique characters with independent animation and equipment.

[Scene optimization guidance](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/) includes freezing unchanged work, managing active meshes and using inspection tools. Such optimizations require correct invalidation. Freezing a transform, material or visibility set that later changes can make a dynamic authored world wrong rather than faster.

For Open Legend, benchmark static scenery separately from moving people, newly created structures and constantly changing selections. A browser engine that excels at a static viewer can still need substantial work for a mutable game. Conversely, a richer inspector and material workflow can save meaningful engineering time even without a higher peak frame rate.

## Rendering and special effects

Babylon's [feature specifications](https://www.babylonjs.com/specifications/) cover a broad 3D feature set, including materials, animation, lighting, particles and asset loading. Its public tooling includes visual material, geometry, particle and render-graph editors. These are concrete production alternatives to writing every effect directly in code.

Feature coverage must be qualified per backend. GPU compute, texture formats, advanced material features and device support can change the practical result. A WebGL fallback cannot necessarily reproduce every WebGPU algorithm at the same cost.

Do not infer Unreal-equivalent production from a long list of rendering techniques. The relevant test is whether a supported pipeline can deliver our animated characters, editable environment, readable visibility and live asset changes efficiently. Effects that are individually attractive can still exceed the pixel budget when layered together.

## Gameplay, physics and networking

Babylon can be used as the visual/interaction client of the existing server. It does not require rewriting the simulation or treating the browser as authoritative. Any physics package selected for local cosmetic behavior must be kept distinct from the server's authoritative physical rules.

Networking still requires a deliberate transport and message model. The engine's 3D capabilities do not supply Open Legend's permission scopes, durable commands, character privacy or timeline recovery. These should remain owned by the current server unless separately redesigned.

A migration from PlayCanvas would replace scene construction, materials, picking, animation/resource lifecycles and custom visibility/shadow work. That can be justified by a better required feature or lower production cost, not merely by a different API style. Existing TypeScript familiarity is an integration benefit, but not a performance measurement.

## Controllers and interface

The browser's Gamepad and related input APIs remain available. Complete controller interaction is application work: camera/control modes, object selection, rebinding, focus, text entry and haptic fallbacks. The shared [controller chapter](../controllers-and-networking.md) applies.

An HTML/React interface can remain around a Babylon-rendered world. That is potentially valuable for Open Legend's text-heavy surfaces and web accessibility tooling. It does not automatically preserve correct screen-space selection, captions or panel/world interaction when the renderer changes.

## Live content and production

Runtime asset loading and inspectable material/geometry pipelines make Babylon a plausible fit for a world that changes after launch. A prototype should use newly produced files, not only prearranged samples, and verify actual animation, material compatibility, memory bounds and disposal.

Visual authoring tools can shorten effect development. Their output must still be validated and integrated into the game's asset policy. An untrusted generated material graph is not entitled to unlimited GPU work, network fetches or executable authority.

The appeal is a relatively direct web-application integration with more ready-made graphics tooling than a minimal rendering library. The cost is learning a new engine and rebuilding renderer-specific behavior without automatically improving server scalability or gaining a complete native console pipeline.

## Babylon Native is not a desktop wrapper

[Babylon Native](https://www.babylonjs.com/native/) runs Babylon-oriented code in a native application using native technologies and permits different UI hosts. The public page still labels the offering a preview. This is materially different from placing a web page inside Electron, but it is also not evidence of fully interchangeable browser/native behavior across every feature and target.

For Open Legend, it is an interesting route to preserve more JavaScript investment while accessing native rendering. Treat it as a separate candidate requiring its own packaging, input, networking, asset, extension and supported-platform qualification. Do not assume that the existing DOM-based React interface transfers to every native UI host unchanged.

A strategic commitment would require evidence that the exact needed Babylon Native facilities are stable enough, maintained for the target platforms and economical to debug. The preview route should not be used as an unqualified promise of eventual console delivery.

## Licensing and economics

Babylon.js is distributed under Apache-2.0; verify engine and plugin notices from the [official repository](https://github.com/BabylonJS/Babylon.js) for the selected release. A permissive engine does not change Open Legend's AGPL code license. Native host components and commercial assets need separate review.

No renderer switch avoids hosting, AI, bandwidth or content-production costs. A seemingly free migration can still consume substantial engineering effort reproducing visibility, shadows, resource ownership and integration already required by the game.

## Best uses and reasons to reject it

Choose Babylon when its specific graphics, inspection or authoring facilities demonstrably improve a browser-first product, or when a qualified Babylon Native path uniquely fits the desired architecture. It deserves a matched test if PlayCanvas's tooling or renderer behavior becomes a concrete obstacle.

Do not switch solely because both engines have large feature lists and Babylon's looks longer. Reject the route when the required native/platform support remains unqualified or the migration reproduces equivalent behavior without reducing a measured bottleneck or development burden.

**Research judgment:** Babylon is the strongest direct web challenger. It could beat PlayCanvas on the actual required workflow; this research contains no comparative result proving either one wins. Its native preview is worth tracking as a distinct option, not assuming as a guaranteed escape hatch.
