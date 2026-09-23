# Spatial world implementation tracker

**The checked subtasks below have native implementation evidence; the broader target and unverified gates remain open.** This tracker owns new 3D geometry, movement/navigation, tactical camera, and renderer-boundary delivery. The [behavior specification](../spatial-world.md) and [runtime contract](../../archive/07-technical-architecture/spatial-world-runtime.md) own requirements. Documentation alone is not implementation, fixture evidence, or live acceptance.

Keep existing ACT, CR/CH, EPR, AG, NC, INV, SL, production-data, and performance task IDs and valid states. Checked implementation work is separate from the test/acceptance tasks that remain open. Reference their specific contracts rather than making all of those roadmaps prerequisites. A native actor walking up a ramp does not depend on a full planning harness or new invention service. New spatial capabilities enter the existing action/admission and evidence paths.

## Implemented provider and remaining release gates

The initial implementation uses a dependency-free layered-surface A\* and finite analytic slab/wedge/box geometry, not the unqualified Recast/Rapier/ngraph stack. This is an explicit reversible scope choice for the current small public map; SW01 library qualification remains open. See [Architecture](../architecture.md#spatial-world-foundation) for current facts and [Verification](../verification.md#spatial-world-runtime) for actual results.

### Delivery ledger

**Implemented** describes shipped code; it does not imply every broader acceptance case passed. Partial parent tasks stay unchecked instead of hiding the remaining scope. Prior native/browser evidence remains in Verification; the scaling review adds manual runtime/build evidence only. New automated coverage is collected in [Spatial review regression TODOs](TODO.md#spatial-review-regression-todos), at the owner's request.

| Workstream | Implemented now                                                                                                                                                     | Remaining / activation condition                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SW01       | Renderer-independent native package and plain saved/query types; no new external dependency                                                                         | Recast/Rapier/ngraph qualification and automated import guards. Adopt a vendor backend when geometry/workload exceeds the native family, not solely because it appeared in the research shortlist.             |
| SW02       | Required XYZ, semantic support, heading/body profiles, native anchors/tolerances, schema-9 rejection of incompatible saves                                          | Full transform/locomotion schemas; `map.height` deliberately still means Z depth. Do not add a second altitude writer.                                                                                         |
| SW03       | Bounded slabs/filled ramps/boxes, stable support IDs, atomic layout replacement with occupant validation, elevated public starter scene                             | Arbitrary triangle/rotated shape families, native traversal links, fine-grained structural edits. Unsafe support removal is rejected.                                                                          |
| SW04       | Full-extent static AABB trees, exact ray/conservative upright-box sweeps, support queries and ID lookup, current action reach/line-of-effect predicates             | Generic capsule/convex interfaces, dynamic body broad phase beyond landing, broader tangent/overflow coverage.                                                                                                 |
| SW05       | Cached layered A\*, strict surface endpoints, on-demand support groups, sparse exact seams, weak-component rejection, reusable search scratch, native stance search | Tiled/arbitrary mesh navigation, hidden/remembered maps, broader stance coverage and accurate application-level budget/unavailable statuses. The current wrapper can collapse distinct failures into no route. |
| SW06       | Continuous supported 3D native movement, saved path progress and ordinary plan receipts with zero continuation inference                                            | Required-data preparation/worker boundary for heavier cold builds; no asynchronous preparation state is currently implemented.                                                                                 |
| SW07       | Current static-geometry checks, safe layout rejection, bounded dead/incapacitated bird descent, indexed landing footprints                                          | Ground/cruising actor avoidance and fairness, falling into occupied volumes, dynamic doors, support destruction and general fall consequences. Landing indexing is not crowd physics.                          |
| SW08       | Body-height sample vision, bounded frozen-pose cache, range-first 3D hearing/transmission, event origins, geometry/sense invalidation, private future-route removal | Muffled/unknown-source contacts and graded detail through EPR, room acoustics, concentrated exposure/audience scaling; EPR03 observer-private acquisition is not implemented by phase-local audience reuse.    |
| SW09       | Pure camera orbit/pitch/pan/zoom/projection/lock/level controls and local preference persistence                                                                    | Server-approved viewport/lease and D51 multi-view decision; broad touch/accessibility qualification.                                                                                                           |
| SW10       | Narrow WorldRenderer interface, camera controller, current sprite and simple-mesh assets, support anchoring/shadows, dirty visual updates                           | Separate minimal RenderWorldView, complete input extraction, no-GPU adapter coverage, directional rigs, model loader and arbitrary representation replacement.                                                 |
| SW11       | Actual-surface picking, level focus and presentation cutaways; no deletion of physical geometry                                                                     | Broader overlapping-alpha/depth/touch/restore acceptance. Private geometry cannot be introduced until SW05/SW09 disclosure is supported.                                                                       |
| SW12       | One prevalidated authored bird corridor, takeoff/cruise/landing/waits, native saved progress and recovery; landing checks do not ignore slab undersides             | Generated air graphs, general mixed-mode routing, alternate-perch choice/fairness, general loss-of-flight and body-clearance qualification.                                                                    |
| SW13       | Existing native content can use fallback sprites and simple meshes without changing mechanics                                                                       | Generic spatial invention, validated late sprite/model delivery, authoring and asset-epoch integration are not implemented by this slice. Existing recipe invention is independent.                            |
| SW14       | Focused native profiling, bounded query/search/cache policies and fixes to observed hot paths                                                                       | Spatial inspector metrics/overlays, sustained CPU/memory/GPU/population and mixed-world qualification. No scale certification.                                                                                 |
| SW15       | Same-version XYZ/support/path/bird state persistence and previous SQLite/manual-slot evidence                                                                       | New runtime families' saved state, future CPU/GPU callback fencing, viewport reauthorization and broader crash/late-asset coverage.                                                                            |
| SW16       | Previous 24 native fixtures and one browser scenario; current production build and manual application observations                                                  | Full scenario matrix, broader device/context-loss/accessibility/live authoring and automation of this review's cases. No test suites were run in this review.                                                  |

### Scaling next steps

- [x] **SW04.1a** Index full static extents and supports, short-circuit boolean occlusion, preserve ordered acoustic contributions, and reuse exact support lookup. Dynamic actor volumes remain a separate responsibility.
- [x] **SW05.1a** Remove all-height seam comparisons and add weak-component rejection; bound interaction support candidates before expensive reach/stance/path work. Keep actual geometry and route budgets authoritative.
- [x] **SW08.1a** Bind stable post-movement sight inputs, cap cache memory, invalidate on geometry/pose/sense/body changes, and reject out-of-range sound before occlusion. Mutable candidate queries remain uncached.
- [x] **SW07.2a** Use current step-local indexed landing footprints, including vertically distinct and differently named coplanar surfaces. Keep later moves reflected in that phase's index and reject underside-crossing flight.
- [x] **SW10.4a** Retain actor assets across geometry-only changes; avoid unchanged card/shadow transform writes and duplicate hover callbacks. Keep actual click queries immediate.
- [ ] **SW06.2a** Before increasing geometry/map limits or admitting dense authored scenes, qualify cold connected-graph preparation against the host responsiveness budget. On-demand support groups remove unrelated-floor work, but a blocked route among 28 co-located supports still took about 2.8 seconds in a diagnostic run. Prewarming/bounded preparation or a qualified alternative representation is required before expanding that workload. Preserve old measurements only as historical Verification evidence, not current capacity claims.
- [ ] **SW08.4a** Integrate EPR02/EPR03/EPR10 and PF population work for concentrated first exposure. Exact encounter-audience reuse and indexed experience admission reduce repeated traversal, but every genuine event/recipient still requires storage. EPR03 must remove the inappropriate external broadcast of observer acquisition without losing living-encounter or narration semantics. Qualify large memory-capable populations, persistence and all-to-all hotspots; do not drop evidence or weaken physical safety to hide overload.
- [ ] **SW14.3a** Qualify sustained moving/sensing populations and memory at the supported geometry bounds, including lots of co-located floors and repeated blocked landings. The current data contains only a few one-second advances and does not establish hundreds of intelligent actors, render FPS or long-session capacity.

- [x] **SW04.1b** Choose static-tree split axes by center variation, short-circuit boolean stance/sweep work and preserve complete ordered acoustic crossings. Exact geometry remains authoritative.
- [x] **SW05.1b** Build only potentially connected support groups; retain exact seam validation, zero-cost star connectivity at exact shared points, validated direct support changes, reverse-edge reuse and generation-stamped synchronous search scratch. Saved native routes and target support identities remain plain data.
- [x] **SW08.4b** Reuse encounter audiences only in their fixed-position phase and maintain source-ID membership inside the central experience mutation owner's draft. Preserve all event deliveries, owner/forgotten checks and invalidation; this does not complete private acquisition or general incremental sensing. See SR08–SR10 for deferred regression coverage.

Existing task IDs below retain the remaining broad requirements. No new model calls, world bus, second dynamics authority, hidden-map shortcut or old-save migration is justified by these optimizations.

## Delivery order and useful milestones

**Milestone A — a real elevated world:** SW01–SW06, the grounding portion of SW10, and the corresponding SW15/SW16 checks. An existing sprite actor follows a 3D route onto a deck, another remains underneath, and physical interaction cannot cross floors illegally. Flat gameplay still works in the new format.

**Milestone B — tactical presentation and consistent senses:** SW08–SW11 with SW14–SW16. Orbit, pitch, pan, projection changes, floor focus, cutaways, height-aware sight/hearing, picking, and sprite/model coexistence agree with authoritative state.

**Milestone C — the substantial first release:** SW07, SW12–SW13, and remaining cross-cutting gates. One bounded flying family, dynamic blocker/support handling, native recovery, saved progress, renderer isolation, and measured performance work together. Full volumetric flight, production-quality 3D characters, RVO crowds, room acoustics, and region streaming remain later work.

SW14–SW16 accompany each slice; they are not a final cleanup phase. No milestone requires paid inference to establish native correctness. Live art/agent evaluation remains separately authorized and budgeted.

## SW01 — Qualify the dependency stack and native boundary

**Owners:** server composition, domain boundary, client renderer. **Depends on:** none. **Touchpoints:** package manifests/lockfile, domain boundary tests, new narrow adapter modules. Reuse the current pinned Node/pnpm/PlayCanvas baseline unless an explicit upgrade is needed.

- [ ] **SW01.1** Prove Recast/Detour initialization and synchronous query operation under the actual server build. Exercise a sloped surface, two overlapping decks, one-way native connector, exact destination-surface binding, partial path, and exhausted query limits. Pin the tested core/generator/WASM versions together.
- [ ] **SW01.2** Prove Rapier shape-level ray, overlap, contact, and swept-body queries for the chosen capsule/box/ramp/terrain pairs. Verify collision normals, floor skin tolerance, transformed shapes, zero-length rays, start overlap, and finite failure reporting without advancing a second dynamics world.
- [ ] **SW01.3** Qualify `ngraph.path` for directed weighted air/connector routing. Verify returned path order, blocked edges, no-route, ties, nonnegative costs, and a zero/admissible heuristic. Do not assume a 2D example restricts graph coordinates or that a greedy variant is optimal.
- [ ] **SW01.4** Record dependency size, initialization, worker transfer, license/notice requirements, maintenance/source versions, and actual supported API coverage. Check current docs against the repository's pinned PlayCanvas API. Compare navcat only if a recorded Recast integration limitation warrants it; ship one ground provider, not two speculative backends.
- [ ] **SW01.5** Establish import-boundary tests: domain/protocol/shared spatial data contain no renderer SDK or navigation/physics runtime handles. WASM initialization, files, timers, and worker I/O remain outside pure transitions.

**Exit:** a small executable qualification harness has deterministic fixture outputs under the pinned environment; rejected features and remaining packaging limits are documented. Upstream demos or TypeScript compilation are not substitutes for these runs.

## SW02 — Introduce required 3D positions and semantic support

**Owners:** domain types, protocol, application validation. **Depends on:** SW01 interfaces. **Touchpoints:** `packages/domain/src/types.ts`, `packages/protocol/src/index.ts`, `data.ts`, `god-tools.ts`, route/input validators, saved-world validation, fixture builders.

- [x] **SW02.1** Introduce shared plain coordinate/bounds conventions and required Y. Preserve one authoritative `Entity.position`; add support/mode/heading/profile references without a second altitude writer. Differentiate screen points, vectors, destinations, and semantic surface IDs.
- [x] **SW02.2** Inventory every position reader/writer and every planar distance calculation throughout domain, server, protocol, client, tests, owner tools, spawning, revival/recovery, and logs. Replace each according to its actual meaning rather than mechanically adding Y to every `Math.hypot`.
- [ ] **SW02.3** Define units, actor support-anchor convention, native eye/ear/contact offsets, positive heading, static transforms, tolerances, and finite validation. Rename ambiguous new map metadata so vertical height and grid depth cannot be confused.
- [x] **SW02.4** Bump incompatible development save/transport interpretation. New flat fixtures explicitly set Y to zero. Reject old saves clearly; add no legacy migrations, optional-Y compatibility reader, silent reset, or permanent dual format.

**Exit:** all supported creation/mutation routes produce valid 3D state; same-XZ actors on different supports remain distinct. Invalid numbers/IDs/transforms fail without effects. Existing gameplay fixtures are updated, not removed to hide regressions.

## SW03 — Canonical finite geometry, surfaces, and mutation

**Owners:** domain spatial families and application publication. **Depends on:** SW02. **Touchpoints:** map/resource/body definitions, spatial mutation entrypoint, existing declaration/owner-edit boundaries.

- [ ] **SW03.1** Define bounded box/capsule/convex-ramp/triangle-patch families with support faces, slab thickness, modality masks, material references, and explicit bounds. Retain heightfields for base terrain while permitting independent stacked surfaces.
- [ ] **SW03.2** Implement stable walkable-surface and traversal-link identities. Keep semantic IDs independent of renderer meshes and Detour polygon/area IDs; define deletion and replacement semantics for linked actors/routes.
- [ ] **SW03.3** Centralize geometry add/change/remove through one authoritative mutation path that validates occupants, versions, affected bounds, and dependent invalidations. Distinguish transform, geometry, appearance, and disclosure changes.
- [x] **SW03.4** Build the elevation fixture described below from canonical geometry, not decorative sprites. Verify ramps, bridge top, underside clearance, walls, and floors have consistent visual/navigation/query sources.

**Exit:** cosmetic art replacement changes no physical record; geometry mutations are atomic and stale updates fail. Interactable supports have IDs and finite geometry. Unsupported forms and unsafe support removal are explicit until SW07 provides recovery.

## SW04 — Indexed geometry queries and 3D admission predicates

**Owners:** shared spatial/query adapter and domain callers. **Depends on:** SW01–SW03. **Touchpoints:** `packages/domain/src/spatial.ts`, `perception.ts`, kernel approach/reach checks, `response.ts`, owner placement validation.

- [ ] **SW04.1** Implement 3D broad-phase indexing over full extents with deduplication, stable ordering, and bounds for large objects. Separate immutable static data from dynamic transforms. Test origin-outside-but-volume-intersecting cases.
- [ ] **SW04.2** Implement pure snapshot-bound ray, support, overlap, and swept-volume adapters. Ensure candidate mutations within a transition are visible; a previous-world index or hidden mutable backend must not decide the result.
- [x] **SW04.3** Add action-specific contact/stance/line-of-effect predicates. Convert ranged range/occlusion to 3D without pretending the existing probabilistic shot family becomes a ballistic simulator.
- [ ] **SW04.4** Define overflow, unknown coverage, invalid shapes, equal hits, tangent contact, and penetration behavior. Incomplete mandatory queries never return “clear.” Keep diagnostic detail richer than actor-visible feedback where privacy requires it.

**Exit:** a ground actor cannot reach a high flyer or act through a deck, while a supported reachable stance works. Thin obstacles block swept motion. Shape-query backend failure cannot authorize an action.

## SW05 — Ground navigation and scoped route discovery

**Owners:** server navigation adapter, domain route contracts. **Depends on:** SW01–SW04. **Touchpoints:** current `findPath`, `Action.path`, target-position/approach logic, scene/nav derived data.

- [ ] **SW05.1** Build versioned navigation input from canonical geometry, with conservative clearance profiles and tiled invalidation. Keep rendering integrations out of authoritative generation.
- [x] **SW05.2** Implement surface-bound start/destination projection and finite interaction-stance search. Reject wrong-floor projection, overlarge snaps, inaccessible target centers, and unsupported native links. Native layered-provider tests cover this gate; a future Detour adapter still needs its own SW01 qualification.
- [ ] **SW05.3** Translate routes to saved semantic segments and genuine 3D surface-following samples. Normalize partial/no-route/budget/unavailable statuses and confirm destination arrival, not merely successful query return.
- [ ] **SW05.4** Enforce spatial-knowledge scope for route discovery/previews. Distinguish public starter terrain from hidden geometry; preserve remembered routes without silently exposing unobserved topology changes. Share caches only for equivalent permitted input digests.
- [ ] **SW05.5** Validate routing ties, one-way edges, slopes, headroom, disjoint surfaces, region edges, and partial paths across reload. Keep vendor handles disposable and explicitly remappable to semantic support.

**Exit:** upper and lower routes cannot swap endpoints; routes avoid known blocked geometry and unsupported links. Hidden stairs do not appear in an actor's preview. A partial corridor is never logged as arrival.

## SW06 — Native route following and time-safe preparation

**Owners:** domain action controller, `WorldService` native scheduling. **Depends on:** SW04–SW05. **Touchpoints:** `kernel.ts` movement/advance/approach/completion, command admission, CPU worker adapter, server time debt.

- [x] **SW06.1** Replace planar path following with 3D segment execution, support-constrained projection, finite sweeps, and native capability checks. Maintain one position writer and preserve work-start consumption semantics.
- [ ] **SW06.2** Keep normal route queries synchronous against prepared data. Add the typed spatial-not-ready path for required cache preparation with no partial domain effects; prepare outside the mutation transaction and resume/revalidate at the intended native boundary.
- [ ] **SW06.3** Qualify bounded Node worker generation/export/import where needed. Fence results by exact input digest, request identity, and load epoch; do not hold a database transaction while awaiting CPU work.
- [ ] **SW06.4** Make technical preparation independent of simulated need/action duration. Preserve simulation debt and show a technical preparation state at a required blocked boundary; never manufacture in-world waiting based on worker speed or drop elapsed simulation work silently.
- [x] **SW06.5** Connect route start/completion/block/interruption to existing action receipts and agency continuation. Native following and valid next steps purchase zero inference; do not use the AI director's thought cadence for navigation.

**Exit:** fast/slow cache preparation yields the same native result for identical accepted inputs, without double effects. Pausing, cancellation, new commands, and load races invalidate only appropriate pending work. Movement at every existing speed setting respects geometry.

## SW07 — Dynamic obstacles, conflicts, and support loss

**Owners:** domain geometry/movement/body owners. **Depends on:** SW03–SW06. **Touchpoints:** fixed-step staging, route revision checks, `living.ts`, native actor lifecycle, derived-nav invalidation.

- [ ] **SW07.1** Revalidate next segments against current geometry and invalidate only affected route dependencies. Distinguish structural rebuilding from supported temporary obstacle updates; appearance and ordinary actor footsteps never rebake static tiles.
- [ ] **SW07.2** Implement one deterministic local conflict policy for body sweeps/connector occupancy, including saved waiting age and stable tie-breaking. Test opposite-direction passage traffic and non-overlap without introducing a second crowd movement authority.
- [ ] **SW07.3** Add bounded native falling/landing state for supported ground/flight loss, with saved progress, swept collision, support acquisition, and body-effect integration. Define action interruption and retained resource/item ownership.
- [ ] **SW07.4** Test door closure, bridge removal, changed clearance, a disappearing perch, dead flyer, and failed rebuild. Unsafe unsupported changes reject before mutation; supported real changes cannot wait for art to become physical.

**Exit:** no walking across deleted support, airborne corpse frozen forever, collision overlap from simultaneous moves, or resource refund from a plan rewrite. Technical cache failure remains distinct from an observed physical blockage.

## SW08 — Height-aware sensory queries and consistent consumers

**Owners:** domain sensory production and server exposure consumers; EPR retains intake. **Depends on:** SW02–SW04. Integrate with existing event/perception routes without waiting for all EPR tasks.

- [ ] **SW08.1** Apply 3D eye/ear/source anchors and target extent sampling to visual geometry. Preserve sensory-owner detection/recognition/detail and historical evidence rules rather than returning every fact about a visible entity.
- [ ] **SW08.2** Add 3D sound distance and coarse wall/floor attenuation with distinct detection/localization/intelligibility outputs. Deduplicate crossed physical barriers and preserve event-time origins. Do not call normalized transmission dB or reuse visual LOS as hearing.
- [x] **SW08.3** Replace planar visibility/reach consumers consistently in `events.ts`, `observeActor`, server `view.ts`, action discovery/candidates, response admission, recall/exposure, and god tools. Reuse one scope-aware query service; no mixed old/new perception rules.
- [ ] **SW08.4** Feed scoped spatial/exposure changes into existing EPR/AG opportunities, preserving self-event deduplication, hysteresis, urgent native behavior, and no per-frame paid inference. Cross-link relevant EPR acceptance instead of copying its complete tracker.

**Exit:** a shout above can be heard indistinctly through a floor without revealing the speaker; old sound origins survive movement/deletion; scene, inspection, action admission, and actor context agree on their permitted evidence.

## SW09 — Camera rig, controls, and embodied view authorization

**Owners:** client interaction/camera, server view admission. **Depends on:** SW02, SW08 exposure contract, SW10 interface foundation. **Touchpoints:** `scene.ts`, `main.tsx`, input callbacks, PlayerProfile and view projection.

- [x] **SW09.1** Add plain camera state and pure orbit/pan/pitch/zoom/recenter controls, orthographic and perspective modes, optional heading snaps/locks, sprite-friendly pitch limits, and 3D focus. Keep camera heading independent of actor heading.
- [ ] **SW09.2** Preserve primary/context interactions with one gesture owner; add accessible button/keyboard/touch alternatives and reduced-motion behavior. Audit shortcut conflicts, drag-release commands, DPR/CSS scaling, focus loss, and narrow screens.
- [ ] **SW09.3** Implement coalesced camera-intent validation, monotonic view revisions, one active embodied-view lease, and bodily-LOS intersection. Pending camera expansion cannot display newly unauthorized entity details; coarse camera-side occlusion/cutaway filtering can only narrow bodily visibility. NPC senses remain camera-independent.
- [ ] **SW09.4** Save scoped camera preferences, validate selected focus after restore, and retain pause usability. Integrate the existing sensory hidden-tab/multi-view policy without silently deciding unresolved D51 alternatives.

**Exit:** orbit/pitch/pan work with current sprites and can be locked by profile; they never move the actor, reveal through body occlusion, spend inference per frame, or accidentally issue gameplay commands.

## SW10 — Renderer boundary and mixed representation

**Owners:** client renderer/art adapter. **Depends on:** SW02 and the existing art contract; SW03 geometry input for surfaces. **Touchpoints:** `scene.ts`, `art.ts`, `main.tsx`, renderer tests.

- [ ] **SW10.1** Extract a small `WorldRenderer` interface and plain authorized RenderWorldView mapping. Implement PlayCanvas behind it and use a no-GPU test renderer. Do not build a universal graphics abstraction or require a second real engine.
- [ ] **SW10.2** Separate camera/gesture logic from PlayCanvas scene ownership and React command submission. Keep all `pc.*` objects behind the adapter; preserve usable non-canvas inspection when rendering is unavailable.
- [ ] **SW10.3** Add visual representation bindings for current sprites, directional sprite/2D-rig extensions, procedural meshes, and a model asset. Anchor all to actual 3D entity positions/support, with presentation-only offsets and local animation state.
- [ ] **SW10.4** Implement camera-relative sprite facing and declared missing-direction fallbacks. Align terrain/deck meshes, support shadows, cutout/depth policies, and 3D interpolation without revealing hidden future routes. A separate numerical flight-height overlay remains optional follow-up; the actual altitude and support shadow are implemented.
- [ ] **SW10.5** Demonstrate one sprite actor beside one simple mesh/model in the elevation fixture; switch an existing entity's visual representation without changing its ID, body, position, support, capability, action, or inventory.

**Exit:** mixed art represents the same physical world. A visual-only change has no nav/physics effect. Orbit causes no image calls, duplicate textures, incorrect y=0 anchors, or plane-based false collision.

## SW11 — Surface picking, floor focus, and safe cutaways

**Owners:** client picking/presentation, server command admission. **Depends on:** SW03–SW04, SW09–SW10. **Touchpoints:** current `groundPoint`, `pick`, markers, status anchors, ActionContext/CommandInput.

- [x] **SW11.1** Replace y=0 ray-plane selection with authorized surface intersections and explicit destination support IDs. Implement clear upper/lower-floor disambiguation and marker/preview agreement with the server-selected stance.
- [x] **SW11.2** Add level grouping/focus and roof/upper-floor cutaway presentation without deleting physical geometry. Prevent hidden actor/asset/label payloads from being delivered as a shortcut to client culling.
- [ ] **SW11.3** Make sprite/mesh picking respect silhouette, depth, authorized exposure, and the active cutaway. Submit references/points, never renderer-authorized effects. Clear stale selections after geometry changes/load.
- [ ] **SW11.4** Test overlapping transparent sprites, occluded targets, sloping surfaces, multi-level structures, near-horizontal camera rays, touch selection, and keyboard non-canvas alternatives.

**Exit:** clicking the bridge never silently chooses the ground. Floor navigation changes the view only; a cutaway never changes collision/LOS or grants X-ray knowledge.

## SW12 — Bounded aerial navigation and native flight

**Owners:** server graph provider, domain locomotion/body. **Depends on:** SW01–SW07 and SW08 for exposure. **Touchpoints:** native animal controller, route contracts, body capability profiles, surface/air graph generation.

- [ ] **SW12.1** Define bounded 3D air regions/nodes/corridors, explicit altitude bands, vertical edges, clearance, and directed costs using the qualified graph adapter. Keep graph coverage limitations distinct from physical obstruction.
- [ ] **SW12.2** Implement one flight-capable animal profile and trusted graph construction for the fixture, including over/under geometry routes and blocked ceiling clearance. Do not make a sprite's appearance grant flight.
- [ ] **SW12.3** Implement native takeoff/cruise/climb/descent/landing transitions, selected support validation, occupancy checks, route interruptions, and supported holding/recovery behavior. Preserve real movement time and swept-volume safety.
- [ ] **SW12.4** Compose ground/perch and air segments through semantic connectors; no link teleports. Test death/lost capability, blocked landing, changed geometry, same-version mid-flight restore, and no inference while following a valid route.

**Exit:** one generated/procedural sprite creature visibly occupies real altitude, flies a valid 3D route, lands on the intended platform, and obeys the same range/perception/body rules as ground actors.

## SW13 — Invention and generated-art integration

**Owners:** spatial family adapters; INV and art owners retain admission/generation. **Depends on:** SW03–SW05, SW10; SW12 for invented flight profiles. Existing INV work is required only for routes that actually author new mechanics.

- [ ] **SW13.1** Add bounded spatial profile references and finite geometry/locomotion declarations to eligible native families through existing INV admission. Reject new executable fields, unsupported shapes, unbounded meshes, fake support, or model-authored authority.
- [ ] **SW13.2** Separate creator/actor geometry knowledge, mechanical placement, entity creation, and asynchronous visual creation. Installing a visual or opening an authoring conversation cannot create a surface, body, or flight capability.
- [ ] **SW13.3** Integrate late sprite/model delivery and representation fallback using existing versioned asset IDs. Bound payloads/URLs/extensions, retain provenance, and discard callbacks for old worlds/entities/visual revisions.
- [ ] **SW13.4** Exercise a fixture-admitted new object/creature with immediate fallback art and later sprite replacement. Real generative authoring quality is a separate capped acceptance gate; no paid generation is required for the native fixture.

**Exit:** newly admitted content uses the shared spatial rules; images cannot change hitboxes or introduce executable mechanics. Rendering failure cannot erase a valid physical object or grant an unsupported one.

## SW14 — Spatial diagnostics and measured performance

**Owners:** performance and spatial adapters. **Depends on:** each slice as it lands. **Touchpoints:** existing performance instrumentation and authorized god inspector.

- [ ] **SW14.1** Add bounded native metrics for broad/exact queries, route expansions, build/preparation queue, dirty tiles, cache digests, conflicts, exposure work, and preparation pauses. Separate unpaid CPU work, renderer work, and paid art/AI usage.
- [ ] **SW14.2** Add god-only overlays for supports/colliders, route segments and status, clearance, sensory rays, and air corridors. Ordinary overlays remain knowledge-scoped and may be approximate; debug access must not leak via shared DTOs.
- [ ] **SW14.3** Measure cold/warm scenes at existing speed settings, varying actor count, floors, moving bodies, sounds, generated asset diversity, and geometry edits. Report hardware, workload, sample duration, budgets, p50/p95/max, memory, and failures—not a single FPS claim.
- [ ] **SW14.4** Remove measured bottlenecks first. Gate BVHs, crowd steering, portal acoustics, streaming, and additional workers on recorded needs. Verify camera/animation changes do not cause nav rebuilds, whole-world scans, or inference calls.

**Exit:** maintainers can explain why a route was blocked versus pending or unknown, and identify native versus rendering cost. No unsupported population capacity or algorithm performance claim is inferred from upstream benchmarks.

## SW15 — Same-version save/load and recovery

**Owners:** spatial/domain state with existing SL/application owners. **Depends on:** each stateful slice; not deferred to the end. **Touchpoints:** `GameSaves`, `WorldService`, world validation, routes, caches, worker/resource lifecycle.

- [ ] **SW15.1** Include positions, support/mode/profile/geometry versions, accepted route segments/cursors, traversal/fall state, consequential conflict waiting, and spatial evidence in coherent capture. Keep SDK objects and GPU handles out of saves.
- [ ] **SW15.2** Rebuild derived indexes/nav data from pinned canonical inputs without changing a saved native route or choosing a new floor. Validate missing support/link/source records rather than silently snapping or resetting.
- [ ] **SW15.3** Fence CPU/GPU/AI callbacks by world/load epoch and relevant identity. Preserve current billing, revocation, forgotten evidence, and no automatic paid retries. Reauthorize camera views and clear abandoned-future projections.
- [ ] **SW15.4** Test mid-ramp, under/over bridge, queued preparation, mid-traversal, mid-flight, falling, changed-door, and obsolete-asset restoration. Reject incompatible development saves explicitly; do not add legacy conversions.

**Exit:** a coherent same-version load continues native work without duplicated effects or changed support, while retired callbacks and hidden future knowledge remain inaccessible.

## SW16 — Integrated native, browser, and optional live acceptance

**Owners:** maintainers across affected modules. **Depends on:** the relevant delivered slices.

- [ ] **SW16.1** Implement the scenario matrix below as focused domain/application fixtures, including property-style generated shape/point cases where useful. Fixtures use no network/provider calls and assert independent invariants rather than mirroring implementation branches.
- [x] **SW16.2** Run focused tests, formatting, typecheck/full repository checks, and browser checks for the delivered slice. This check records the prior initial-provider pass, not a rerun after the scaling review; new regression coverage remains in TODO. Record actual outputs, unrelated failures, and omissions in existing verification/status owners without marking all SW complete.
- [ ] **SW16.3** Run end-to-end browser cases for mixed assets, orbit/pitch/projection, floor picking, cutaway privacy, UI/input accessibility, pause/reload, and loss of renderer/context. Preserve the non-canvas interaction path.
- [ ] **SW16.4** Separately authorize any live agent/art evaluation. Verify a useful cross-level action/plan and a visually consistent generated asset, record total cost/latency and remaining failure modes, and do not treat those few examples as scale evidence.

**Exit:** completed tasks cite their own evidence; all untested behavior stays unchecked. The running README/architecture describes only delivered capabilities.

## Shared deterministic fixture

Construct a small world with base ground at Y=0, a deck top at Y=3 with finite thickness, a traversable ramp, an underpass, an opaque wall/opening, two differently sized body profiles, a perch, and two clear air heights. Exact dimensions must provide genuine under-deck headroom and a walkable ramp under the chosen clearance/slope profile. Keep all dimensions in explicit fixture data.

Add a separate hidden-geometry variant rather than assuming the public starter map tests knowledge isolation. Include a known but later unobservedly changed doorway for stale-memory routing. Deterministic canned visual assets are sufficient; a fixture-generated creature is not evidence of a live model inventing one.

## Integrated failure and behavior matrix

| ID  | Scenario                                         | Required observation                                                                                                     |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| S01 | Two actors at identical XZ on different supports | Different positions/supports; no cross-floor collision merge or automatic interaction                                    |
| S02 | Move onto deck through ramp                      | Continuous valid surface-following height and correct route/work completion                                              |
| S03 | Click upper/lower overlapping surfaces           | Explicit intended surface survives picking, API validation, path projection, and arrival                                 |
| S04 | Small versus large body in opening               | Shared navigation classes remain conservative; exact clearance enforces actual dimensions                                |
| S05 | Thin wall crossed at accelerated time            | Sweep blocks; no tunneling or discarded simulation debt                                                                  |
| S06 | Detour partial/node-limited result               | Partial/budget status, never arrival or physical-impossibility claim                                                     |
| S07 | Warm versus deliberately delayed cold cache      | Same native outcomes for identical accepted inputs; technical preparation affects wall latency, not hunger/work progress |
| S08 | Door closes after route selection                | Current geometry blocks affected segment; old goal/history survives                                                      |
| S09 | Two bodies enter a narrow passage                | Stable collision-free arbitration with bounded/fair reconsideration                                                      |
| S10 | Remove support / disable flight                  | Supported native fall/recovery or pre-admission rejection; no floating or duplicate items                                |
| S11 | High flying target above actor                   | Height changes reach/ranged range; no planar punching or harvesting                                                      |
| S12 | Shout from other floor                           | Detection may survive attenuation; identity/words/localization limited by evidence                                       |
| S13 | Source moves/deletes after sound                 | Historical audible origin unchanged; sustained source uses its actual current state                                      |
| S14 | Camera rotates around an opaque wall             | Body LOS still bounds evidence; NPC sight unchanged                                                                      |
| S15 | Roof cutaway and focused lower floor             | Only authorized content drawn/picked; physical floor remains active                                                      |
| S16 | Hidden staircase / unknown changed door          | No omniscient route shortcut or exact unseen blockage explanation                                                        |
| S17 | Sprite replaced with mesh mid-action             | Same body, action, support, identity, inventory, and native outcome                                                      |
| S18 | Rotate/pitch a single-view sprite                | Declared visual fallback; no image-generation storm or new body orientation                                              |
| S19 | Orbit/pan/context drag on scaled/touch UI        | No accidental move; controls and keyboard/non-canvas alternatives work                                                   |
| S20 | Mid-ramp/flight/fall save and reload             | Same supported continuation; no new random draw from rebuilding visuals/indexes                                          |
| S21 | Old worker/asset/AI result after load            | Epoch rejection and resource cleanup; no abandoned-future publication                                                    |
| S22 | Geometry-query overflow or backend failure       | No “clear” result; explicit technical stop/fallback with honest coverage                                                 |
| S23 | Existing native plan or Jev-selected known act   | Shared spatial validation; no required generative call to follow route                                                   |
| S24 | Unlisted action needs new spatial capability     | Existing INV deferral/admission boundary, never arbitrary geometry/effects from prose                                    |
| S25 | Sound mute / moving tactical camera              | Actor hearing and caption permission unchanged; exact hidden sound position not leaked                                   |
| S26 | Native regression suite in new flat format       | Hunting, inventory, work, conversations, pause, and same-version recovery still obey their owning contracts              |

## Later capabilities, explicitly outside this release

Track only concrete future gaps here once evidenced: full volumetric/SVO navigation, advanced local avoidance, moving platforms/vehicles, swimming, ballistic projectiles, complex structural collapse, room/portal acoustics, wide-world streaming, or arbitrary procedural rigs. Do not add these as prerequisites to the elevated-world milestones. Research experiments belong in the research backlog; unresolved product choices stay in open decisions.
