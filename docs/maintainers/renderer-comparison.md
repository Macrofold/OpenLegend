# Shared presentation and renderer comparison — implementation tracker

## Current progress

The selected browser renderer design and independent preparation are complete. The [preparation record](../verification/renderer-preparation.md) inventories the PlayCanvas path, qualifies reusable cloth calculations and records current-format capture plus bounded native/app/full-art baseline evidence. The client remains PlayCanvas-only; the shared presentation controller, Three.js, switching, replay and matched comparative qualification are not delivered. This document owns remaining implementation, integration and evidence.

Source baseline: `Macrofold/OpenLegend` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. PlayCanvas remains the default while this project is implemented and evaluated. No matched Three.js performance result is claimed.

## Maintained records

- Behavior and scenarios: [feature specification](../projects/renderer-comparison-feature-spec.md).
- Contracts and detailed implementation: [technical design](../projects/renderer-comparison-tech-design.md).
- Limits and constraints: [RCP inventory](../limits/renderer-comparison.md).
- Repertoire selection: [whole-library review](../projects/renderer-comparison-repertoire-review.md).
- Current presentation: [world presentation](../world-presentation.md).
- Existing collection and interpretation: [browser profiling](performance-profiling.md#browser-frames-and-actual-walking), [measurement contract](../performance/measurement.md) and [OB01](../limits/observability.md#ob01--explicit-browser-performance-capture).
- Independent source/workload inventory and baseline evidence: [renderer preparation](../verification/renderer-preparation.md).

## Ownership and dependency order

The public `WorldRenderer` boundary stays with the browser client. One shared presentation controller owns behavior; native graphics resources belong to the selected backend. Domain simulation, native spatial authority, server projection, networking and React HUD remain their existing owners.

RCP owns the selected dual-backend extraction and comparison implementation. [SW10.1/SW10.2](spatial-world.md#sw10--renderer-boundary-and-mixed-representation) and [SW18.8](spatial-world.md#sw18--world-presentation-delivery) consume its shared boundary/input result; their other motion, refresh and representation requirements stay open. [SW11](spatial-world.md#sw11--surface-picking-floor-focus-and-safe-cutaways) retains broader exact picking/device acceptance. [V3D03/V3D05/V3D11](3d-pixel-art.md) retain general representation, rig/equipment and device qualification. Reuse matching evidence without duplicating those task bodies or marking an unfinished parent done.

Begin RCP01 → RCP02 → RCP03 and the narrow PlayCanvas view/camera/lifecycle boundary in RCP05. Start the RCP06 W0 probe as soon as that boundary and its required source/pose inputs are usable; do not wait for full cloth, lighting or material extraction to learn from the real second consumer. RCP04 and the complete RCP05 remain prerequisites for RCP07 parity. RCP08 follows usable backend lifecycles; full switching acceptance consumes RCP07. RCP09/RCP10 converge with parity and switching at RCP11; RCP12 evaluates the evidence. This is dependency order, not authorization for workers to depend on another parallel assignment's unfinished output.

### RCP-D01 — Complete and reconcile the selected design

- [x] Finish the feature specification, technical design, repertoire review, implementation breakdown and limits inventory; review their complete affected diff. Reconcile SW, V3D, profiling, engine research, navigation and selected design dispositions. Record actual open decisions without treating missing runtime evidence as missing design. **Done evidence:** a complete crosslinked design, consistent owners and dispositions, reviewed links/content and committed documentation. Design completion does not close the separately tracked runtime acceptance.

**Design evidence:** The complete design and affected-owner diff were reviewed against the pinned source and current contracts. Prettier 3.6.2 and focused new/changed relative-link and heading checks pass. The 42-file repertoire review records actual coverage; no runtime, benchmark or player result is claimed.

## RCP01 — Establish the baseline and exact workload

**Outcome:** a reproducible statement of what the current PlayCanvas path actually does and the smallest useful comparison input. **Dependencies:** RCP-D01 and executable-work authorization.

- [x] Inspect the actual current revision and callers, including `world-renderer.ts`, `scene.ts`, `scene-study.ts`, `scene-performance.ts`, current art settings and the pinned dependency. Inventory every public and study-only caller, including current/remembered presentation consumers; record source changes since the baseline before extraction. See the [independent inventory](../verification/renderer-preparation.md).
- [ ] Select W0 and the available W1–W4 scenarios from the feature specification, plus W5 lifecycle operations. Record exact permitted views, asset references, art/quality choices, camera/projection and required supported cues. Keep absent future gameplay explicit.
- [ ] Record baseline asset/pose/light/shadow/transparency/UI work and supported conservative versus exact picking behavior. Separate current delivery from V3D/SW acceptance still open.
- [x] Distinguish the current source baseline from selected-but-undelivered SPX/stealth controls and perception contracts. Consume any such scope actually integrated by implementation time; keep the remaining [SPX](stealth-player-experience.md) implementation and player acceptance with its owner rather than quietly making it a renderer prerequisite. Neither active runtime branch is integrated in the independent preparation.
- [ ] Observe the current PlayCanvas scene through the ordinary app and study. Retain representative still/moving evidence and meaningful interaction outcomes through existing evidence/asset owners.
- [ ] Define the comparison manifest and coverage checklist before implementing Three. Use the recording/run envelope in RCP-L03–L05; no arbitrary population requirement or paid generation.
- [x] Complete the independent preparation: repair the existing current Main capture fixture through its world-owned fresh-startup preparation, add optional camp-only capture while preserving seven-stop defaults, and record a reproducible local PlayCanvas baseline using the existing study/profiler. Both native capture modes, real-garment parity/cost, ordinary-app controls and full-art study/quality/lifecycle checks have [bounded evidence](../verification/renderer-preparation.md#end-of-implementation-evidence). This does not close the broader workload, publication or replay requirements above.

**Done evidence:** exact revision/settings/workload references; a usable baseline journey; declared coverage and known limitations. This is baseline evidence, not proof of scale or of which renderer wins.

**Independent preparation boundary:** refreshed base `origin/main` at `d2f03a1e434e83191620e734351a7edee0e24eae`, without stealth or Cognition Lab runtime integration. The linked preparation record owns the responsibility/consumer inventory and selected existing-study workload. Full W0–W5 manifests, ordinary-app plus study coverage and the replay comparison remain broader RCP work; a ten-second study diagnostic does not close those requirements.

**Current study gap:** the published pinned views omit current required player body dimensions and do not reach scene readiness. The local baseline explicitly selects fresh current views and current UI metadata; publish/reselect through existing asset owners before making that selection the shared comparison workload. Loopback preview needs an explicitly supported public-CDN delivery path. Do not add legacy conversion or silently substitute a release. The ordinary-app check uses native depictions; live full-art, lit-fire, captions, broader W0–W5 and resource/device acceptance remain open.

## RCP02 — Extract permitted views and reconciliation

**Outcome:** one shared owner decides what currently permitted and remembered things should be presented. **Dependencies:** RCP01.

- [ ] Keep the existing application-facing `WorldRenderer` and callbacks. Introduce the smallest internal visual projection needed by actual backend consumers; do not create a second server protocol or pass raw world state.
- [ ] Move world/timeline/player/access invalidation, appearance signatures, observed-versus-remembered handling, add/update/remove decisions and valid selection retention into shared presentation records.
- [ ] Preserve the distinction between true world/timeline/player/private-view replacement and same-character access renewal. Reauthorize renewed selection and clear obsolete transient/private information without rebuilding still-permitted public artwork or landscape solely for renewal.
- [ ] Establish one owner for displayed position/support and motion history. Engine transforms consume this state instead of becoming a second writable source.
- [ ] Preserve immutable source identity reuse and changed-record work. Reconcile membership at the view boundary; avoid serializing or cloning a whole scene each frame.
- [ ] Check a normal update, removal, appearance replacement, restored timeline and observer/control change through existing callers or a disposable no-GPU recording fixture. Reject stale async results and clear protected presentation promptly.

**Done evidence:** backend modules cannot inspect unrelated GameView state or invent disclosure; ordinary PlayCanvas behavior remains intact; SW10.1's selected extraction has concrete coverage. A recording fixture is a development consumer, not a third shipped renderer.

## RCP03 — Share camera, input and picking policy

**Outcome:** camera, pointer/keyboard gestures and semantic selection behave identically across backends. **Dependencies:** RCP02.

- [ ] Reuse `world-camera.ts` and the current preference owner. Move gesture state, modifiers, drag/click distinction, focus/visibility cancellation and callback dispatch out of PlayCanvas scene ownership.
- [ ] Define narrow ray/projection/visual-hit and representation-anchor bindings under technical design §5; share surface geometry and selection eligibility/order. Synchronize dirty camera/viewport matrices before immediate queries, without advancing animation or forcing a draw.
- [ ] Wire existing attack, targeting and construction callbacks through one input owner. Preserve surface IDs, body references and native validation; no hit from a renderer becomes authority.
- [ ] Reconnect DOM captions, status, blur and non-canvas inspection through plain projection results after the current native pose/transforms are applied. Preserve representation-specific anchor correction and caller-specific clipping; keep per-frame motion outside React state updates.
- [ ] Exercise select, orbit, pan, zoom, targeting, attack cancellation, placement/rotation/cancellation, overlapping targets, changed support, text focus and loss of focus. Confirm cancellation never commits a held action.

**Done evidence:** unchanged ordinary interactions through the current app, shared ownership with no duplicate listeners/callbacks, and explicit limitations for unqualified SW11 device/picking cases.

## RCP04 — Share asset, motion, cloth and light preparation

**Outcome:** reusable preparation and visual decisions have one implementation. **Dependencies:** RCP02; coordinate projection consumers with RCP03.

- [ ] Reuse `asset-files.ts`, exact selected releases and existing appearance/source mappings. Separate fetched source data from backend decoding and mutable GPU resources.
- [ ] Extract desired clip/transition, pause behavior, pose cadence, heading and absolute sample-time decisions. Use one shared presentation clock; native deltas derive from requested samples, not another wall clock. Preserve normal-session blending; installation/seek resets transient blending to the current requested clip/sample rather than reconstructing interrupted fade history.
- [ ] Extract pure scenery/perception/billboard geometry calculations where actually consumed; use stable typed arrays and dirty updates rather than per-vertex command objects.
- [ ] Extract the existing CPU cloth solver and quality choice where the selected assets need it. Execute native pose → current bone anchors → shared cloth step → changed vertex publication → drawing. Keep required anchor reads and mesh publication in adapters; one evaluated skeleton serves every pass and attachment.
- [x] Independently extract the useful pure cloth constraint pass, distance and size-tier calculations into `characters/cloth-solver.ts`, keeping the existing PlayCanvas consumer and operation order. Integration, contacts, anchors, clocks and vertex publication remain in `CapeCloth`; the complete solver criterion above stays open.
- [ ] Extract permitted light-source selection, retention preference, sunlight calculations and profile choices. Preserve current quality budgets through their owning inventory.
- [ ] Exercise paused/unpaused motion, a long frame gap, changing support, pose changes, late/failed assets, source replacement and light-set changes. Confirm source fetching is reused without sharing disposable native resources.

**Done evidence:** shared behavior/preparation modules have no renderer SDK dependency; each remaining engine-specific responsibility is explicit; the PlayCanvas consumer still depicts the selected workload.

## RCP05 — Isolate the PlayCanvas backend and effects

**Outcome:** the existing presentation runs through the new boundary without a regression. **Dependencies:** RCP03 for the initial narrow boundary; RCP04 for completion. The usable view/camera/lifecycle portion enables the RCP06 probe before this entire task is finished.

- [ ] Move native entities, camera application, decoder integration, meshes, materials, shadow/reveal layers, render targets and disposal behind the PlayCanvas backend.
- [ ] Preserve current art treatment, pixel-grid/coverage reconstruction, shadow filtering, sprite virtual depth, read-through, outlines and shader preparation. Share portable kernels only when their language/contracts fit; retain PC bindings and cache details locally.
- [ ] Retain the PlayCanvas native tick as sole scheduler. Implement phase admission → collector begin → prepare → native pose/cloth/matrices → shared afterPose → draw admission → collector end → afterFrame, including ticks without drawing. Use native postrender for actual submission counts. Prevent automatic/manual double animation; do not add a controller RAF or another render call.
- [ ] Expose actual API, declared feature coverage, device-ready versus scoped scene-ready, stop-now and disposal-settled states. Initial required artwork keeps the opaque loading/readiness gate; only already-supported runtime families use fallback. Track backend resources using existing ownership.
- [ ] Preserve suspension separately from world pause and disposal: cancel held input, retain resources, stop recurring draws, allow the existing one-shot fresh-view frame and apply privacy removals while suspended.
- [ ] Run the RCP01 ordinary journey and lifecycle checks against the extracted backend. Compare before/after extraction appearance and workload costs under the same retained profile; investigate a material regression before extending parity. An early limited Three probe does not close this task.

**Done evidence:** the default PlayCanvas app works through the adapter, with meaningful visual/interaction evidence and applicable local formatting/type/build checks. Shared presentation modules import neither renderer SDK; domain/server/protocol import no client renderer modules. Existing art approval, wider devices and uninterrupted frame-tail goals remain their owners' acceptance.

## RCP06 — Build the Three.js vertical slice

**Outcome:** a real second backend renders and interacts with W0 through shared behavior. **Dependencies:** RCP02/RCP03, the verified narrow PlayCanvas view/camera/lifecycle boundary from RCP05, and only the RCP04 source/pose inputs W0 consumes. Full cloth/material/light extraction and complete RCP05 are not prerequisites for this probe.

- [ ] Select an exact compatible Three.js release and required typings/addons; pin them through the existing package/lockfile owner. Start with `WebGLRenderer`/WebGL2. Do not add R3F, a physics package or a UI framework by default.
- [ ] Implement backend initialization, camera/projection, supported surface/scenery drawing, one sprite and one current GLB, source dimensions/pivots and native resource disposal.
- [ ] Connect shared camera/input/selection/overlays and asset/motion preparation. Implement the real decoder/skeleton path; do not use a static model as evidence for animated parity.
- [ ] Match W0's selected quality and required shadows/depth/picking. Keep unsupported effects visibly marked incomplete.
- [ ] Exercise late load, failed asset, changed scope and teardown, including removal while a load is pending.
- [ ] Feed actual second-consumer findings back into the smallest shared contract before completing broad extraction. Keep unsupported effects explicit; do not use the W0 probe to rank whole-scene speed.

**Done evidence:** W0 works in both backends with actual effective API/coverage recorded; failures remain explicit. No claim of whole-game parity or performance superiority.

## RCP07 — Complete current presentation parity

**Outcome:** both backends deliver the declared currently supported W1–W4 presentation. **Dependencies:** completed RCP04, RCP05 and RCP06.

- [ ] Port remaining native material/pass integration for the selected art treatment, pixel coverage, shadows, read-through/outline, supported effects, scenery instancing, animation and cloth.
- [ ] Check color-space/tone-mapping, output alpha, depth/stencil, filtering, transparency and shadow assumptions explicitly. A similarly named setting is not evidence of an equivalent result.
- [ ] Preserve recognizable people/equipment, normal-zoom action cues, changed construction and current/remembered imagery. Use the same source revisions and clip/pose schedule.
- [ ] Preserve one evaluated pose across color, shadows, reveal and attachments. Permit backend-specific batching/culling without reducing required work.
- [ ] Review moving-camera stability, overlapping subjects, day/night, near-plane changes and late replacement. Record scope-specific deviations and fix required ones before the parity gate closes.

**Done evidence:** a completed coverage matrix and representative motion/interaction evidence for both backends. Future art/rig families and new effects are not silently adopted; missing declared behavior keeps this task open.

## RCP08 — Deliver the selector and replacement lifecycle

**Outcome:** developers can compare the current session without duplicate renderers or unintended commands. **Dependencies:** RCP05 and RCP06; full-coverage acceptance also consumes RCP07.

- [ ] Add the selector to scene-study's existing measurement/source section and the live development-only `?artLab` panel. Move panel lifetime and pure settings out of the PlayCanvas-containing `art-treatment.ts` module into shared ownership so Three selection does not load an inactive PC backend. Show requested/actual API, status and disabled transitions; selection alone never starts profiling.
- [ ] Change the factory to accept a stable host owned by React or scene-study; the controller owns its canvases. Migrate layout, focus, context-currentness, event-target, resize/profiler and cleanup consumers together. Preserve active `#world`, entry-loading, accessibility, tabIndex and inert semantics.
- [ ] Preserve the authoritative connection, shared controller, valid camera/selection/settings and latest permitted view. Cancel held gestures before replacing the canvas.
- [ ] Disable replacement controls while one transition/disposal is in flight. The shared owner cancels/detaches world gestures; the backend stops its scheduler/native callbacks immediately. Await settled disposal and use a new canvas before activating the next backend; stale UI callbacks cannot prevent owned cleanup from draining.
- [ ] Fence initialization/download/parser results by active owner and exact view/appearance scope. A world/access change while loading must discard stale presentation.
- [ ] Expose initialization/disposal failure without relabeling fallback as the requested engine. Keep the opaque entry gate until required art/preparation and a completed device frame qualify the latest view. Preserve non-canvas UI; support explicit reopening/reload through the existing session.
- [ ] Exercise A→B→A, same-backend reselection, failure, scope change during loading, repeated transitions and full client destruction. Confirm no world reset, paid work or action commit results from switching.

**Done evidence:** W5 interaction and resource evidence, no duplicate active input/frame loop, no accumulating retired owner, and honest cleanup completion. Hot switching is not the timed benchmark route.

## RCP09 — Add bounded permitted presentation replay

**Outcome:** the same finite workload can drive either backend without variable server/AI timing. **Dependencies:** RCP02–RCP04 and RCP06.

- [ ] Extend scene-study with technical design §9’s manifest/record union: one initial permitted visual view, then shared presentation changes/events, explicit full-view resets and plain camera/display controls. Reuse the live controller application path; exclude callbacks and unrelated GameView data. Normalize transient state and hold replay time during readiness; include required cues in timeline events. Rebase only presentation scheduling fields and retain scheduled event ages during lag.
- [ ] Enforce the 120-second total timeline, 32 MiB UTF-8 and 10,000-record envelope before retaining an offending append. Reserve bounded manifest/final-status bytes inside that same allowance before recording, so reporting overflow cannot itself exceed the limit. Reuse immutable inputs and bounded encoding, not a full additional world copy.
- [ ] Drive replay from one monotonic epoch/cursor. Validate finite times and stable sequence, consume each due semantic record once, and finalize only after the terminal prepared tick. Record actual boundary/overshoot/lag; do not drop transitions, reset the clock at warm-up end or process missing work after collection stops.
- [ ] Make replay interaction read-only with respect to the server: recorded controls alter presentation, not actual gameplay. Block real world input/settings/hover repicking during playback while leaving Stop usable; record resulting display state only once. Stage movement only when labelled presentation-only.
- [ ] Bind live capture and unexported private inputs to their access/view owner. Stop and clear protected retained input on logout, observer replacement or access-scope loss/renewal. Use synthetic authored fixtures for deliberate scope-transition playback; no automatic export or sharing.
- [ ] Record semantic coverage separately from frame-dependent pose/draw/resource counts. Label excluded live projection/change-calculation costs; collect those through normal-client attribution. Lost records, incomplete capture or background interruption prevent a winner conclusion.
- [ ] Exercise normal completion, a budget boundary, out-of-date capture refusal, scope change and stop/restart using the existing study or a disposable scenario.

**Done evidence:** both backends consume the same complete input schedule; the replay remains bounded and semantically honest. It does not qualify live invention, native action admission or independent NPC choice.

## RCP10 — Extend profiling and comparison reports

**Outcome:** one existing capture/report path measures both backends with equivalent meanings. **Dependencies:** RCP05, RCP06 and RCP09.

- [ ] Extract backend-independent recorder/report semantics from `scene-performance.ts`; supply PC/Three collectors for actual native counters and supported GPU timing.
- [ ] Keep optional collection off by default. Implement §9’s exact phase lifecycle: stop constructor capture, warm up while stopped, stop/start in phase admission before that tick’s collector begin, and finalize after terminal draw admission/bookkeeping. Do not reset the replay or wait for pending GPU queries; preserve missing/discarded counts and immutable stopped reports.
- [ ] Record exact build/engine/addon/API versions, workload/asset identity, requested/effective settings, semantic coverage, actual phase clocks and collector state. Both engines consume one engine-neutral manifest; native operation counts may legitimately differ.
- [ ] Record presentation/browser callback intervals separately from actual draw/postrender intervals, counts and trailing time without a draw. GPU backpressure can skip drawing while callbacks remain responsive; submission is still not physical-screen proof.
- [ ] Preserve existing OB01 sample/histogram/query allowances rather than creating parallel limits. Label engine-specific resource counts/estimated bytes; never report unavailable GPU data as zero or estimates as exact VRAM.
- [ ] Add the documented `--renderer-comparison` mode to `scripts/performance/profile-browser.mjs`, dispatching before its live READY/sign-in/control/speed/resume/start-marker/gameplay path. Transfer the bounded manifest through the study import surface; preserve explicit loopback origin/new output checks and keep private content out of URLs. Enforce RCP-L04’s external preparation/playback/cleanup deadlines; preserve invalid slots, and stop the campaign if cleanup cannot settle.
- [ ] Launch one fresh production page at a time for exactly six scheduled ABBAAB attempts, with 10 seconds warm-up and 60 seconds measured by default inside the total 120-second envelope. Three valid runs per side qualify the campaign; an invalid slot remains visible and prevents a complete winner claim. Explicit new campaigns preserve prior evidence rather than auto-retrying.
- [ ] Separate cold and steady-state campaigns and recorded headed/headless/API launch conditions. Do not inherit the old driver's forced ANGLE Metal setting on another OS or treat headless timing as real-display smoothness.
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
