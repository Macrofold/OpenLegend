# Shared world presentation and renderer comparison

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The selected design is being reconciled; runtime extraction, the Three.js backend and comparative qualification are not implemented. | 2026-10-31 |

## 1. Purpose and selected direction

Open Legend needs an attractive, readable and responsive inhabited world: people worth recognizing, danger the player can understand, useful things they can invent, and a place they can change and want to return to. The renderer supports that experience. A beautiful still image, an engine logo or a higher FPS number with missing work does not establish it.

Build **one shared presentation implementation with two browser rendering backends**, PlayCanvas and Three.js. Keep the existing authoritative simulation, permitted server projections, React interface and player intentions. Share presentation decisions and calculations; let each backend own its graphics objects and efficient rendering. Provide a developer renderer selector and a repeatable, single-renderer comparison route. PlayCanvas remains the ordinary default while the comparison is built and measured.

This is a selected design, not a migration decision or a claim that Three.js is faster. The task delivering these documents authorizes documentation; executable implementation remains a subsequent authorized task. [RCP](../maintainers/renderer-comparison.md) owns that implementation and evidence.

### Product priorities

The [first playable world](../worlds/base/playable-openings.md#first-playable-game-target) and [gameplay priorities](../repertoires/gameplay-priorities.md) remain controlling. Complete useful survival, making, camp, exploration, opposition, recovery, independent people and practical invention. Do not make two complete renderer ecosystems a prerequisite for developing those activities. Deliver a representative comparison slice, expand it through the actual currently supported presentation, then decide what continued dual support earns.

The [current visual requirements](../../art-direction/decisions.md#current-visual-requirements--october-16-2026) remain the art target: dimensional pixel art, natural proportions, recognizable expressive people, purposeful light, readable material groups and a living wilderness with emotional range. “Modern graphics” means accomplished art, stable motion, convincing depth, responsive controls and sufficient performance. It does not select photorealism, visible low-poly geometry, a new interface theme or expensive effects regardless of their benefit.

## 2. What exists and what this project adds

Source baseline: `Macrofold/OpenLegend` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`.

| Area | Existing baseline | Selected addition |
| --- | --- | --- |
| Application boundary | `WorldRenderer` exposes permitted views, camera, picking, settings and callbacks without PlayCanvas types; the factory always creates `WildernessScene`. | Keep that caller-facing boundary; put a shared presentation controller and replaceable backend behind it. |
| Shared behavior | Camera math, support-aware motion, asset fetching and much DOM caption/status behavior already have independent owners. | Extract the remaining input, reconciliation, visibility, light selection, pose scheduling and reusable geometry/math from the PlayCanvas scene. |
| Rendering | The client pins PlayCanvas 2.22.2 and uses its existing WebGL-oriented scene, materials, effects, animation and profiling. | Implement a separately pinned Three.js `WebGLRenderer` backend first; preserve the same required presentation. |
| Comparison | Scene studies and optional profiling exist; the engine research plan describes matched and best-practical comparisons. | Reuse those surfaces for a backend selector, permitted-view replay, equivalent instrumentation and interpretable reports. |
| Evidence | Existing PlayCanvas studies qualify only their recorded workloads; no matched Three.js result exists. | Require behavior/quality equivalence before attributing performance differences; retain actual versions, settings, workload and coverage. |

This does not change native collision, navigation, AI, authority, discovery, world rules or save semantics. Rendering an opening does not make it traversable. Showing a shadow does not establish native sight. A remembered image does not become a currently visible target.

## 3. The experience worth improving

### 3.1 Recognize people and read their actions

A player walking into camp should distinguish the people they know, see who is moving or occupied, and understand an approach, attack, retreat or refusal through the supported cues. Camera motion, held animation poses, equipment, captions, selection and occluding scenery must agree. Preserve recognizable silhouettes and gear at normal play zoom; a close-up beauty shot cannot compensate for unreadable ordinary play.

The renderer may depict only supplied action/appearance information. It must not invent a character's intention, loyalty, fear, injury or knowledge. Richer expressions are later consumers of actual permitted presentation data, not a new psychology implementation in this project.

### 3.2 Make creation visibly rewarding

The player can place a real supported wall, alter a camp layout, use a useful invented object and later recognize the result. Reuse source dimensions, meaningful materials and silhouettes. Keep placement feedback, the committed shape, picking and the native geometry aligned. A pending or unavailable custom asset has a usable existing fallback; imagery arriving late replaces presentation without changing identity or function.

One recognizable finished change is more valuable than an inventory of decorative graphics features. The comparison must include replacement, alteration and return, rather than only a static stock scene. It does not require new construction mechanics or a paid generation call to obtain a renderer fixture.

### 3.3 Let beauty invite exploration

Light, layered scenery, a distinctive landmark and a pleasing arrangement can be rewards themselves. Preserve understandable routes and actual known destinations while allowing quiet beauty, warmth, darkness and danger. Selected read-through and captions should help interaction without covering the world in permanent labels.

A camera reveal is not a knowledge grant. A direction-only sound cannot acquire an exact hidden source model through a rendering optimization or debug overlay.

### 3.4 Make consequences visible on return

After an outing, the same camp and objects can carry real alterations, depleted resources, a moved possession or a changed permitted encounter. Render current facts and remembered facts according to their existing owners. Do not fabricate wear, blood, damage, footprints or history that implies an uncommitted event. Decorative variation can remain decorative when it does not falsely communicate gameplay state.

[The repertoire review](renderer-comparison-repertoire-review.md) records the catalogue coverage, concrete entry choices, useful refinements and unselected possibilities. It adds no parallel gameplay backlog.

## 4. Supported developer journeys

### 4.1 Compare appearance while keeping the current session

1. Open the existing developer scene-study or opted-in profiling controls and choose a renderer. Ordinary players do not need to understand graphics frameworks.
2. See the requested renderer and graphics API, and the actual active combination. Initially the supported combinations are PlayCanvas/WebGL2 and Three.js/WebGL2. Unsupported combinations remain unavailable with a reason.
3. Switching cancels held pointer/keyboard gestures through their existing cancellation owner before detaching the old canvas. It must not commit an attack, movement or construction operation as a side effect.
4. The authoritative session and React interface remain. Preserve valid camera state, selected entity, presentation quality and the latest permitted view. Preserve applicable UI drafts and reading position through their existing owners.
5. The old backend stops drawing immediately. Release its resources and replace its canvas before activating the new backend. A short loading gap is acceptable; simultaneous rendering and an instant seamless transition are not requirements.
6. The new backend draws the current permitted state. It does not replay stale action effects, invent motion through an unobserved gap, request a new world or issue paid work.
7. If initialization fails, retain the ordinary non-canvas interface and a recoverable developer state. The previous renderer can be explicitly reopened from the same permitted presentation state. Report the failure instead of silently labelling a different backend as the requested one.

Changing renderer is presentation-only. It neither resets the world nor freezes the simulation. A latest view received during loading supersedes the earlier display; scope changes clear protected presentation immediately. The selector is serialized while replacement settles, avoiding accumulating hidden renderers or parsers.

### 4.2 Run a meaningful comparison

1. Choose a named current-version workload and fixed quality profile in the existing study/profiling workflow.
2. Validate its permitted inputs, source asset revisions, expected activity and required feature coverage before recording timings.
3. Launch one renderer in a fresh page/canvas. Load the same prepared workload, use the same camera path and settings, and distinguish first-use work from steady-state work.
4. Run the other renderer separately on the same device/browser/build conditions. Alternate run order and repeat; retain every valid run and the reasons for exclusions.
5. Inspect visual and behavioral equivalence. A missing character, shadow, pose update, effect, asset or view transition makes the affected comparison incomplete.
6. Review frame-time distributions, stalls, CPU attribution, available GPU measurements, loading, response and retained resources. State uncertainty and workload limits.
7. Follow with a real live session through the normal server/client path. Replay establishes presentation cost and repeatability; it cannot prove independent AI behavior, network responsiveness, usefulness of invention or player enjoyment.

The hot selector serves visual and lifecycle comparison. Clean sequential launches serve timing. Running both renderers at once, whether on two canvases or in competing tabs, does not qualify their standalone performance.

### 4.3 Change one shared behavior

A developer changes camera recovery, selection policy, animation cadence or permitted-image handling once in its shared owner. Both backends receive that meaning. A backend can optimize batching, light/shadow execution, resource layout or shader preparation without changing what the player is allowed to see or do. A new graphic effect can be backend-specific while experimental; its unsupported status is explicit until an equivalent path is delivered.

## 5. Required coverage and useful workloads

The workload manifest records exact inputs and counts; these scenarios are selection criteria, not invented capacity claims. Use existing scene-study views and current asset releases first. Added scenes use actual supported state. A replay containing staged movement is labelled presentation-only.

| Workload | Activity and payoff | Required visual/behavior coverage | Evidence boundary |
| --- | --- | --- | --- |
| W0: Small compatibility scene | Walk, orbit, select and inspect beside a model, sprite, scenery and raised support. | Correct XYZ/support picking, occlusion, current/remembered distinction, camera and overlays, fallback-to-loaded representation. | First adapter gate; not proof of a playable opening. |
| W1: Inhabited camp | Approach recognizable people, see motion/equipment, select a resident, read speech and an ongoing action. | Moving and still poses, overlap, captions/status, read-through, light/shadow and normal play zoom. | Use actual available people/assets; future first-playable cast remains FPV scope. |
| W2: Woodland outing | Follow a route, turn the camera, encounter foliage/raised ground, enter and leave the scene. | Loading/reuse, depth/alpha, movement, pixel stability, route/support accuracy, no hidden-source reveal. | No new streaming-world system is required. |
| W3: Making a place | Preview, place/alter a supported shape, change an appearance, leave and return. | Shared placement policy, real geometry alignment, changed work only, asset cancellation/replacement and recognizable result. | Authored replay does not qualify live invention or construction admission. |
| W4: Readable danger and darkness | Track a permitted moving target, aim, see supported action cues, retreat past cover under different light. | Displayed pose/aim consistency, selected-vs-physical target distinction, shared light selection, stable shadows and input cancellation. | Do not simulate hit authority or invent NPC decisions in a renderer. |
| W5: Repeated transitions | Repeat scene entry/replacement, pause/resume, resize, asset failure and renderer replacement. | Stop/disposal ownership, bounded retention, current scope, functional recovery and ordinary non-canvas UI. | Lifecycle/resource qualification; frame timing during replacement is separate. |

Every initial comparison includes W0 plus the currently available parts of W1–W4 and W5. Missing coverage is named; narrower evidence never becomes “whole game parity.” First-playable-only mechanics are added when their existing owners deliver them. Their absence does not force a renderer project to reimplement those systems or falsely close FPV.

For load growth, reuse existing scene-performance workloads and their actual objects/animations/activity. Start from a normal scene; increase the measured dimension deliberately. Count animated bodies, evaluated bones, material groups, transparent layers, shadow casters, lights and changed records rather than only total entities. There is no new universal population ceiling or automatic “three times” acceptance claim.

## 6. Comparison modes

### Matched presentation baseline

Use the same projected input timeline, asset revisions, camera/projection, viewport and internal render resolution, art treatment, pose cadence, required light/shadow coverage, transparency, UI and update schedule. Internal draw calls need not be identical: batching is an implementation choice. The rendered meaning and quality must be equivalent enough for the stated question.

Start with PlayCanvas/WebGL2 versus Three.js/WebGLRenderer/WebGL2. An API mismatch is a separate product comparison, not isolated evidence that one engine is faster. Requested and effective API/pipeline always appear in results. Unsupported features, fallback and quality substitutions are visible in the manifest/report.

### Best practical presentation

After the matched baseline, permit engine-specific improvements while preserving the same required player experience and art target. Record the changed implementation, quality difference, device coverage, engineering effort, dependency burden and maintainability. A faster result that damages moving-character readability or removes meaningful world detail does not win by FPS alone.

### Graphics/API exploration

WebGPU, compute, indirect drawing, different anti-aliasing, screen-space illumination and richer post-processing are explicit experiments when a real workload or visual goal justifies them. They do not gate the initial comparison. A graphics-heavy future remains possible on either engine; [the technical design](renderer-comparison-tech-design.md#12-engine-capabilities-and-ecosystem-decisions) explains the distinct integration paths.

## 7. Quality and performance acceptance

| Obligation | Classification | What completion means |
| --- | --- | --- |
| Shared authority and interaction semantics | Required pass | No private/current-state disclosure, invented native effects, changed camera/gesture meaning, incorrect support picking or duplicate commands. |
| Supported visual coverage | Required pass | All declared coverage works on both backends, including motion, depth, loaded/fallback assets and current/remembered images; deviations are fixed or the scope remains incomplete. |
| Switch/replacement lifecycle | Required pass | Old drawing/input stops, disposal settles or a recoverable failure is exposed, and stale work cannot affect the replacement. |
| Valid matched capture | Required pass | The report demonstrates equal required activity, real effective settings, complete timeline processing and truthful missing data. Invalid comparisons are rejected, not ranked. |
| Performance on selected devices | Required measurement | Report repeated frame distributions, hitch/loading/response behavior, resources and variance. A slow honest result is useful evidence, not automatic project failure. |
| Existing 3×/wider-device goals | Existing owner requirement | Those independent gates remain with scene-performance/V3D/FPV owners; this project does not close them with a smaller replay. |
| Art and ordinary play readability | Human acceptance | Review normal-speed motion and interaction as well as stills against accepted art direction; record who reviewed what and remaining concerns. |
| Fun, useful invention and independent people | Existing gameplay acceptance | Use real player/AI activity through FPV and subsystem owners. Renderer fixtures provide no substitute. |
| Optional GPU/new-effect experiments | Exploration | A bounded question and honest result; no new feature commitment or production support promise follows automatically. |

Use 60 Hz/16.67 ms as a comparison reference where the actual display supports it, not a universal hardware promise or an instruction to clamp the application. Report actual display cadence and uncapped CPU/GPU headroom where measurable. A stable 60 FPS readout can hide substantial cost differences; p95/p99 and repeated stalls matter. Do not add CPU and GPU durations as though they could not overlap.

## 8. Scope, simplicity and non-goals

- One browser game and one shared authoritative world. No second simulation, network protocol, physics engine, UI framework or universal scene graph.
- Two backends for a real comparison, introduced incrementally. No fixed shared-code percentage, tiny-adapter promise, universal renderer winner or permanent dual-maintenance commitment.
- Reuse the existing profiler and study surface. No new telemetry service, benchmark database, CI campaign or separate developer application.
- Keep PlayCanvas's current path working during extraction, then remove superseded mixed ownership. Do not preserve an old implementation solely for compatibility.
- No Unity/Unreal/Godot port, native/console/offline product selection, hosted PlayCanvas Editor adoption or React Three Fiber rewrite.
- No art-direction reset, new asset-buying/generation campaign, automatic LOD/streaming framework, GPU gameplay authority or gratuitous visual effects.
- Current-version data only. There are zero users; incompatible development captures/settings may be rejected and recreated. Existing external asset/credential preservation and current-format integrity still apply.

## 9. Staged delivery and decisions

1. Record the existing baseline and freeze a small named workload.
2. Extract shared presentation behind the working PlayCanvas path; verify its ordinary consumers before introducing a second engine.
3. Add a Three.js vertical slice and use it to refine only real adapter needs.
4. Complete currently supported presentation and safe developer switching.
5. Add bounded replay and equivalent existing-profiler collectors; run the matched and live comparisons.
6. Review whether to keep PlayCanvas as default, change the default, or maintain a limited comparison backend. Expand support only where measured benefit or concrete development advantage justifies its recurring cost.

No unanswered product decision blocks the specified initial slice. Exact dependency pins, capture manifests and available measurement machines are execution inputs recorded before their runs, not excuses to invent measurements. Later choices about the default renderer, ongoing dual support and a WebGPU product path require the resulting evidence; they do not block this design or imply that migration is already selected.

## Maintained records

- Implementation and acceptance: [RCP tracker](../maintainers/renderer-comparison.md).
- Limits and constraints: [renderer comparison inventory](../limits/renderer-comparison.md); existing [observability](../limits/observability.md), [spatial](../limits/spatial.md), [3D art](../limits/3d-pixel-art.md) and [interface](../limits/interface.md) limits retain their owners.
- Mechanism and step-by-step delivery: [technical design](renderer-comparison-tech-design.md).
- Repertoire selection: [whole-library review](renderer-comparison-repertoire-review.md).
- Current behavior: [world presentation](../world-presentation.md), [spatial contract](../spatial-world.md#renderer-boundary), [SW10](../maintainers/spatial-world.md#sw10--renderer-boundary-and-mixed-representation).
- Comparison context: [engine benchmark plan](../../research/game-engines/benchmark-plan.md); broader platform selection remains outside this project.
