# Shared presentation and renderer comparison — implementation tracker

## Current progress

The selected browser renderer design is under review. The existing client remains PlayCanvas-only; shared extraction, a Three.js backend, a switcher and matched comparative qualification are not delivered. This document owns the remaining implementation, integration and evidence. Documentation completion does not authorize executable work or decide the ordinary renderer default.

Source baseline: `Macrofold/OpenLegend` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. PlayCanvas remains the default while this project is implemented and evaluated. No matched Three.js performance result is claimed.

## Maintained records

- Behavior and scenarios: [feature specification](../projects/renderer-comparison-feature-spec.md).
- Contracts and detailed implementation: [technical design](../projects/renderer-comparison-tech-design.md).
- Limits and constraints: [RCP inventory](../limits/renderer-comparison.md).
- Repertoire selection: [whole-library review](../projects/renderer-comparison-repertoire-review.md).
- Current presentation: [world presentation](../world-presentation.md).
- Existing collection and interpretation: [browser profiling](performance-profiling.md#browser-frames-and-actual-walking), [measurement contract](../performance/measurement.md) and [OB01](../limits/observability.md#ob01--explicit-browser-performance-capture).

## Ownership and dependency order

The public `WorldRenderer` boundary stays with the browser client. One shared presentation controller owns behavior; native graphics resources belong to the selected backend. Domain simulation, native spatial authority, server projection, networking and React HUD remain their existing owners.

RCP owns the selected dual-backend extraction and comparison implementation. [SW10.1/SW10.2](spatial-world.md#sw10--renderer-boundary-and-mixed-representation) and [SW18.8](spatial-world.md#sw18--world-presentation-delivery) consume its shared boundary/input result; their other motion, refresh and representation requirements stay open. [SW11](spatial-world.md#sw11--surface-picking-floor-focus-and-safe-cutaways) retains broader exact picking/device acceptance. [V3D03/V3D05/V3D11](3d-pixel-art.md) retain general representation, rig/equipment and device qualification. Reuse matching evidence without duplicating those task bodies or marking an unfinished parent done.

Implementation order is RCP01 → RCP02 → RCP03/RCP04 → RCP05 → RCP06 → RCP07, with RCP08 after both backend lifecycles exist. RCP09 and RCP10 consume the shared controller and backend contracts and converge with RCP07/RCP08 at RCP11. RCP12 evaluates the evidence. This is dependency order, not authorization for parallel work that depends on another worker's unfinished output.

### RCP-D01 — Complete and reconcile the selected design

- [ ] Finish the feature specification, technical design, repertoire review, implementation breakdown and limits inventory; review their complete affected diff. Reconcile SW, V3D, profiling, engine research, navigation and selected design dispositions. Record actual open decisions without treating missing runtime evidence as missing design. **Done evidence:** a complete crosslinked design, consistent owners and dispositions, reviewed links/content and committed documentation. All RCP01–RCP12 implementation/evidence checkboxes remain open.

## RCP01 — Establish the baseline and exact workload

**Outcome:** a reproducible statement of what the current PlayCanvas path actually does and the smallest useful comparison input. **Dependencies:** RCP-D01 and executable-work authorization.

- [ ] Inspect the actual current revision and callers, including `world-renderer.ts`, `scene.ts`, `scene-study.ts`, `scene-performance.ts`, current art settings and the pinned dependency. Record changes since the design baseline rather than assuming old source details still hold.
- [ ] Select W0 and the available W1–W4 scenarios from the feature specification, plus W5 lifecycle operations. Record exact permitted views, asset references, art/quality choices, camera/projection and required supported cues. Keep absent future gameplay explicit.
- [ ] Record baseline asset/pose/light/shadow/transparency/UI work and supported conservative versus exact picking behavior. Separate current delivery from V3D/SW acceptance still open.
- [ ] Observe the current PlayCanvas scene through the ordinary app and study. Retain representative still/moving evidence and meaningful interaction outcomes through existing evidence/asset owners.
- [ ] Define the comparison manifest and coverage checklist before implementing Three. Use the recording/run envelope in RCP-L03–L05; no arbitrary population requirement or paid generation.

**Done evidence:** exact revision/settings/workload references; a usable baseline journey; declared coverage and known limitations. This is baseline evidence, not proof of scale or of which renderer wins.

## RCP02 — Extract permitted views and reconciliation

**Outcome:** one shared owner decides what currently permitted and remembered things should be presented. **Dependencies:** RCP01.

- [ ] Keep the existing application-facing `WorldRenderer` and callbacks. Introduce the smallest internal visual projection needed by actual backend consumers; do not create a second server protocol or pass raw world state.
- [ ] Move world/timeline/player/access invalidation, appearance signatures, observed-versus-remembered handling, add/update/remove decisions and valid selection retention into shared presentation records.
- [ ] Establish one owner for displayed position/support and motion history. Engine transforms consume this state instead of becoming a second writable source.
- [ ] Preserve immutable source identity reuse and changed-record work. Reconcile membership at the view boundary; avoid serializing or cloning a whole scene each frame.
- [ ] Check a normal update, removal, appearance replacement, restored timeline and observer/control change through existing callers or a disposable no-GPU recording fixture. Reject stale async results and clear protected presentation promptly.

**Done evidence:** backend modules cannot inspect unrelated GameView state or invent disclosure; ordinary PlayCanvas behavior remains intact; SW10.1's selected extraction has concrete coverage. A recording fixture is a development consumer, not a third shipped renderer.

## RCP03 — Share camera, input and picking policy

**Outcome:** camera, pointer/keyboard gestures and semantic selection behave identically across backends. **Dependencies:** RCP02.

- [ ] Reuse `world-camera.ts` and the current preference owner. Move gesture state, modifiers, drag/click distinction, focus/visibility cancellation and callback dispatch out of PlayCanvas scene ownership.
- [ ] Define narrow ray/projection/visual-hit bindings; share surface geometry and selection eligibility/order. Keep backend-specific alpha/depth/model geometry queries consistent with what that backend actually draws.
- [ ] Wire existing attack, targeting and construction callbacks through one input owner. Preserve surface IDs, body references and native validation; no hit from a renderer becomes authority.
- [ ] Reconnect DOM captions, status, blur and non-canvas inspection through plain projection results. Keep per-frame motion outside React state updates.
- [ ] Exercise select, orbit, pan, zoom, targeting, attack cancellation, placement/rotation/cancellation, overlapping targets, changed support, text focus and loss of focus. Confirm cancellation never commits a held action.

**Done evidence:** unchanged ordinary interactions through the current app, shared ownership with no duplicate listeners/callbacks, and explicit limitations for unqualified SW11 device/picking cases.

## RCP04 — Share asset, motion, cloth and light preparation

**Outcome:** reusable preparation and visual decisions have one implementation. **Dependencies:** RCP02; coordinate projection consumers with RCP03.

- [ ] Reuse `asset-files.ts`, exact selected releases and existing appearance/source mappings. Separate fetched source data from backend decoding and mutable GPU resources.
- [ ] Extract desired clip/transition, pause behavior, pose cadence, heading and sample-time decisions. Use one shared presentation clock; distinguish it from authoritative simulation time and browser wall-clock measurement.
- [ ] Extract pure scenery/perception/billboard geometry calculations where actually consumed; use stable typed arrays and dirty updates rather than per-vertex command objects.
- [ ] Extract the existing CPU cloth solver and quality choice where the selected assets need it. Keep only required animated-anchor reads and mesh publication in adapters; one evaluated skeleton serves every pass and attachment.
- [ ] Extract permitted light-source selection, retention preference, sunlight calculations and profile choices. Preserve current quality budgets through their owning inventory.
- [ ] Exercise paused/unpaused motion, a long frame gap, changing support, pose changes, late/failed assets, source replacement and light-set changes. Confirm source fetching is reused without sharing disposable native resources.

**Done evidence:** shared behavior/preparation modules have no renderer SDK dependency; each remaining engine-specific responsibility is explicit; the PlayCanvas consumer still depicts the selected workload.

## RCP05 — Isolate the PlayCanvas backend and effects

**Outcome:** the existing presentation runs through the new boundary before the second engine is added. **Dependencies:** RCP03 and RCP04.

- [ ] Move native entities, camera application, decoder integration, meshes, materials, shadow/reveal layers, render targets and disposal behind the PlayCanvas backend.
- [ ] Preserve current art treatment, pixel-grid/coverage reconstruction, shadow filtering, sprite virtual depth, read-through, outlines and shader preparation. Share portable kernels only when their language/contracts fit; retain PC bindings and cache details locally.
- [ ] Establish exactly one scheduler and shared clock. Preserve the actual pinned application's render/update lifecycle without introducing private renderer monkey patches.
- [ ] Expose actual API, declared feature coverage, readiness, stop-now and disposal-settled states. Track backend resources using existing ownership.
- [ ] Run the RCP01 ordinary journey and lifecycle checks against the extracted backend. Compare the same retained visual profile and investigate a concrete regression before adding Three.

**Done evidence:** the default PlayCanvas app works through the adapter, with meaningful visual/interaction evidence and applicable local formatting/type/build checks. Existing art approval, wider devices and uninterrupted frame-tail goals remain their owners' acceptance.

## RCP06 — Build the Three.js vertical slice

**Outcome:** a real second backend renders and interacts with W0 through shared behavior. **Dependencies:** RCP05.

- [ ] Select an exact compatible Three.js release and required typings/addons; pin them through the existing package/lockfile owner. Start with `WebGLRenderer`/WebGL2. Do not add R3F, a physics package or a UI framework by default.
- [ ] Implement backend initialization, camera/projection, supported surface/scenery drawing, one sprite and one current GLB, source dimensions/pivots and native resource disposal.
- [ ] Connect shared camera/input/selection/overlays and asset/motion preparation. Implement the real decoder/skeleton path; do not use a static model as evidence for animated parity.
- [ ] Match W0's selected quality and required shadows/depth/picking. Keep unsupported effects visibly marked incomplete.
- [ ] Exercise late load, failed asset, changed scope and teardown, including removal while a load is pending.

**Done evidence:** W0 works in both backends with actual effective API/coverage recorded; failures remain explicit. No claim of whole-game parity or performance superiority.

## RCP07 — Complete current presentation parity

**Outcome:** both backends deliver the declared currently supported W1–W4 presentation. **Dependencies:** RCP06.

- [ ] Port remaining native material/pass integration for the selected art treatment, pixel coverage, shadows, read-through/outline, supported effects, scenery instancing, animation and cloth.
- [ ] Check color-space/tone-mapping, output alpha, depth/stencil, filtering, transparency and shadow assumptions explicitly. A similarly named setting is not evidence of an equivalent result.
- [ ] Preserve recognizable people/equipment, normal-zoom action cues, changed construction and current/remembered imagery. Use the same source revisions and clip/pose schedule.
- [ ] Preserve one evaluated pose across color, shadows, reveal and attachments. Permit backend-specific batching/culling without reducing required work.
- [ ] Review moving-camera stability, overlapping subjects, day/night, near-plane changes and late replacement. Record scope-specific deviations and fix required ones before the parity gate closes.

**Done evidence:** a completed coverage matrix and representative motion/interaction evidence for both backends. Future art/rig families and new effects are not silently adopted; missing declared behavior keeps this task open.

## RCP08 — Deliver the selector and replacement lifecycle

**Outcome:** developers can compare the current session without duplicate renderers or unintended commands. **Dependencies:** RCP05 and RCP06; full-coverage acceptance also consumes RCP07.

- [ ] Add the selector to the existing study/opted-in diagnostic surface. Show requested and actual renderer/API and unavailable combinations; ordinary gameplay keeps PlayCanvas as default.
- [ ] Preserve the authoritative connection, shared controller, valid camera/selection/settings and latest permitted view. Cancel held gestures before replacing the canvas.
- [ ] Disable replacement controls while one transition/disposal is in flight. Stop old drawing/input immediately, await settled disposal and use a new canvas before activating the next backend.
- [ ] Fence initialization/download/parser results by active owner and exact view/appearance scope. A world/access change while loading must discard stale presentation.
- [ ] Expose initialization/disposal failure without relabeling fallback as the requested engine. Preserve non-canvas UI; support explicit reopening/reload through the existing session.
- [ ] Exercise A→B→A, same-backend reselection, failure, scope change during loading, repeated transitions and full client destruction. Confirm no world reset, paid work or action commit results from switching.

**Done evidence:** W5 interaction and resource evidence, no duplicate active input/frame loop, no accumulating retired owner, and honest cleanup completion. Hot switching is not the timed benchmark route.

## RCP09 — Add bounded permitted presentation replay

**Outcome:** the same finite workload can drive either backend without variable server/AI timing. **Dependencies:** RCP02–RCP04 and RCP06.

- [ ] Extend the existing scene-study path with the current-version manifest and ordered permitted view/control timeline. Store no raw authoritative world or ungranted private data.
- [ ] Enforce duration, encoded bytes and record count before retaining an offending append; expose truncation/incomplete coverage. Reuse immutable inputs and bounded encoding, not a full additional world copy.
- [ ] Drive replay from one monotonic epoch and shared controller clock. Process each due meaningful record once in order; retain speech/removal/scope transitions when visual transforms can coalesce.
- [ ] Make replay interaction read-only with respect to the server: recorded controls alter presentation, not actual gameplay. Stage movement only when labelled presentation-only.
- [ ] Record actual processed records, final cursor, elapsed playback and lag. A lost record, incomplete capture or background interruption prevents a winner conclusion.
- [ ] Exercise normal completion, a budget boundary, out-of-date capture refusal, scope change and stop/restart using the existing study or a disposable scenario.

**Done evidence:** both backends consume the same complete input schedule; the replay remains bounded and semantically honest. It does not qualify live invention, native action admission or independent NPC choice.

## RCP10 — Extend profiling and comparison reports

**Outcome:** one existing capture/report path measures both backends with equivalent meanings. **Dependencies:** RCP05, RCP06 and RCP09.

- [ ] Extract backend-independent recorder/report semantics from `scene-performance.ts`; supply PC/Three collectors for actual native counters and supported GPU timing.
- [ ] Keep optional collection off by default and skip its preparation when disabled. Bind async measurements to the exact recording session and discard invalid/disjoint/context-lost samples explicitly.
- [ ] Record exact build/engine/addon/API versions, workload/asset identity, requested/effective settings, activity/coverage, actual phase clocks and collector state.
- [ ] Preserve existing OB01 sample/histogram/query allowances rather than creating parallel limits. Label engine-specific resource counts/estimated bytes; never report unavailable GPU data as zero or estimates as exact VRAM.
- [ ] Support clean single-renderer production launches, explicit warm-up and measured windows, three valid runs per side in the prescribed interleaved order, and cold/steady-state separation.
- [ ] Generate comparison results only after coverage/equivalence validation; include all runs, variance, exclusions, remaining limitations and matched versus best-practical mode.
- [ ] Check Stop, late results, context loss/restoration and invalid/unequal work. Confirm raw/presentation/server attribution is not conflated and CPU/GPU durations are not added.

**Done evidence:** truthful bounded reports for both collectors and a rejected incomplete/unequal case. Sampling runs identify cost; separate unprofiled observations qualify smoothness.

## RCP11 — Qualify the integrated comparison

**Outcome:** useful evidence covers correctness, rendering, replacement, actual work and performance limits. **Dependencies:** RCP07–RCP10.

- [ ] Run W0–W5's declared supported coverage through both production backends; inspect ordinary-size stills, motion and actual interactions.
- [ ] Complete repeated matched captures on available documented hardware. Record startup, shader/asset first use, frame distributions/hitches, meaningful response, resource trends and run variance.
- [ ] Follow replay with a normal same-server journey containing accepted movement, selection/inspection, supported action/placement, speech and changed state. Record refusals and actual successful work; variable live activity is not a controlled renderer timing pair.
- [ ] Exercise repeated switches/world changes and cold/late asset handling, scope revocation, pause/resume and resize. Attribute current resource growth rather than merely observing a bounded initial sample.
- [ ] Use existing checks and representative manual/disposable scenarios under [Verification](../../.agents/rules/verification.md). Run focused applicable local formatting/type/build checks; do not author new automated tests unless Mike asks.
- [ ] Separate required passes, required measurements, exploration and human art/play acceptance. Missing physical-device access remains a gap; a slow honest result satisfies measurement, not an independent existing smoothness target.

**Done evidence:** bounded durable evidence with exact revision/environment/workload, complete meaningful activity, resolved required-pass failures and clearly retained human/device limitations. Crosslink only the particular SW/V3D requirements actually qualified.

## RCP12 — Decide the default and ongoing support from evidence

**Outcome:** the comparison leads to a practical product/maintenance decision. **Dependencies:** RCP11.

- [ ] Compare matched baseline and any justified best-practical candidates across responsiveness, moving quality, loading, resources, device coverage, implementation effort and maintenance cost.
- [ ] Identify whether any observed bottleneck belongs to shared client work, backend execution, server/transport or instrumentation. Do not attribute a confounded API/quality difference solely to the engine.
- [ ] Recommend staying with PlayCanvas, adopting Three, retaining a bounded comparison backend or retiring an uneconomical path, with the actual tradeoffs and evidence limits.
- [ ] Obtain Mike's decision before changing the ordinary default or making a new ongoing support commitment. This is a post-measurement product choice, not an unanswered prerequisite for the current design.
- [ ] Reconcile the chosen supported matrix, dependency/code owners, limits, research guidance and residual evidence. Remove superseded ownership when authorized; do not keep compatibility-only implementations or old capture readers.

**Done evidence:** the explicit decision and supporting measurements/quality judgment are linked, current support is truthful, and concrete remaining work has its existing owner.

## Verification and completion boundaries

This tracker creates no automatic paid calls, hardware purchase, browser campaign or new test-authoring authorization. Design review needs content/link consistency; runtime tasks use the existing local verification policy after implementation is authorized. No CI dispatch is part of this project.

The design can complete under RCP-D01 while runtime RCP01–RCP12 remains open. The project cannot be called delivered merely because an adapter draws the scene. Conversely, a valid comparison that finds no compelling migration advantage is a useful outcome; the project does not require Three.js to win.

