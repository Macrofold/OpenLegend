# Default mercenary character evidence

September 28, 2026. Scope: the owner-selected mercenary study as a separate default NPC, live animation/cloth, fixed character pixels and actual-depth compositing. [Plan](../projects/completed/mercenary-scene-pilot.md), [current presentation](../world-presentation.md#animated-character-pixels), [bounds](../limits/3d-pixel-art.md#a3d15--bundled-mercenary-pilot), and remaining [V3D01/V3D05/V3D11 work](../maintainers/3d-pixel-art.md). This does not qualify the general generated-art pipeline.

## Environment and checks

Local macOS, Codex in-app Chromium/WebGL2, actual 1920×1080 framebuffer, Detailed shadows. Used a private production client build and disposable PostgreSQL cluster/database, ordinary WorldService projection/commands and the real client. The user's running server and saved world were not replaced. Temporary diagnostic controls were excluded from the delivered production build. Native verification used `AI_BUDGET_USD=0`; no provider/Jev requests were made (additional and cumulative task cost $0).

- Existing domain `kernel.test.ts`, `authoritative pure world`: 5 passed, 13 skipped.
- Existing server `world-service.test.ts`, `preserves independent settings and half speed across PostgreSQL restart|public projection`: 3 passed, 10 skipped. The privacy fixture now explicitly seeds its private goal because authored residents may begin without goals; its assertions remain intact.
- Bounded native projection/restart scenario: Ada and player preserved, additional mercenary present with model appearance, private biography absent from public projection, appearance and separate NPC preserved after PostgreSQL restart.
- TypeScript, production TypeScript/Vite build to private output, generated configuration check and changed-file formatting: passed. No unfiltered suite or CI result is claimed.

## Actual client observations

The normal root route shows Mike, Ada and the separate mercenary without a URL flag. Walk is driven by a native movement command; heading, camera orbit, paused animation/cloth and elevated ramp support were inspected. Sunlit and nighttime firelit views and Detailed/Economy switching rendered the model. Ramp verification establishes inherited support height, not slope-aware foot IK.

The model's color and depth textures remain 128×192 while zoom changes the displayed rectangle. Orthographic and perspective cameras were exercised. The final shared-shadow path was checked with a thin opaque slab crossing the character: the upper body remains in front while the legs below are occluded. Authorized read-through uses the same coarse image/depth, not a full-resolution replacement. Model picking opens the ordinary object actions; it is conservative mesh-bounds picking, not exact skinned silhouette picking.

Unsupported action state restores the sprite; removal of observation disables the live model, cloth and casters. A deliberately rejected asset load retains the sprite. Repeated replacement, including during initial settling, released skin textures, layers and character targets after the asset fix. One matched replacement sequence retained 62 textures, 89 buffers and 93,450,632 engine-accounted GPU bytes; these are steady-state counters, not a driver-memory total or peak-memory guarantee. Paused cloth steps remained fixed after preparation.

The integration found and corrected two resource/preparation problems: original unused two-sided cape skins over-retained shared skin references in the pinned engine, and a fixed asset URL could retain stale cached bytes. The prepared GLB removes those unused skin bindings, and Vite now gives the asset a content-hashed URL. Original source study files are unchanged. Initial cloth settling is bounded to three steps per frame with the sprite retained until the handoff.

## Measured cost and limits

The initial second-camera approach repeated the world directional-shadow pass. Reusing the world camera's shadow results removed 54 redundant draws in a matched intermediate scene (211 → 157). Color/depth sampling runs after the existing shadow passes and restores camera projection and tone/gamma state before world rendering.

Final paired sample: paused default placement at 08:00, 1080p, Detailed, one fire, 60 warm frames followed by 180 GPU samples per mode. Same camera/world, model versus its sprite fallback:

| Representation         | Median GPU ms | p95 GPU ms | Draws | Median displayed-frame interval ms |
| ---------------------- | ------------: | ---------: | ----: | ---------------------------------: |
| Animated model, paused |         14.32 |      17.75 |   155 |                               33.2 |
| Sprite fallback        |          7.13 |       8.94 |   127 |                               31.7 |

This local comparison adds roughly 7.2 ms median GPU time. It is not free merely because the character image is small: the body still has geometry, skinning and real shadow draws. Earlier paired samples varied with scene and host load (about 11.5 vs 6.2 ms). Displayed intervals were affected by host contention; do not convert these GPU numbers into a promised game FPS or simulation speed.

A separate 80-step cloth sample measured 1.9 ms median / 2.2 ms p95 per simulation step. This excludes the rest of the frame and can occur up to three times per displayed frame. It is not a moving-crowd budget. Static lookup/collider work was reduced, but further asset simplification and matched moving multi-character measurements remain necessary before crowd adoption. Physical lower-end hardware, the combined eight-fire/3× workload with this character, extreme poses, cloth self-contact, modular equipment and production rights/style acceptance remain unqualified in [V3D01](../maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision).

New base worlds contain this authored NPC. Existing worlds are not silently reseeded or reset; no migration or legacy reader was introduced.

## Integration smoke — October 1, 2026

Refreshed and rebased `codex/shadow-quality` onto `Macrofold/OpenLegend origin/main@0382be76648879cf8a8397ad6c3534b4431916f5`, producing `57012a04` before the hearing-test/documentation corrections. Patch comparison preserved the earlier renderer work; main's newer background-save and action-record owners remain intact. Route admission still reads unchanged body/geometry; its comment now acknowledges the added activity bookkeeping. Reconciliation retained both sides' documentation entries and removed leftover conflict markers.

Native verification used Node 24.13.0, disposable loopback PostgreSQL 14, zero AI allowance and no inherited provider credentials. Production TypeScript/Vite build to a private output, full TypeScript and changed-file formatting passed. The existing `camera.spec.ts` and `spatial-world.spec.ts` both passed using installed Chrome 154.0.8037.93, ANGLE Metal on Apple M1 Pro and an actual **1920×1080** framebuffer. The pinned Playwright browser was absent, so these results qualify the installed Chrome backend, not that unavailable binary. Checks include real camera drag/cancel/context-menu input, exact elevated-surface picking, native ramp arrival, perspective/floor controls, rotation lock, pan without unintended commands and reload. Existing domain spatial/kernel checks also pass (27 tests); [hearing details](hearing-main-integration.md#floor-hearing-regression--october-1-2026).

A temporary instrumented production build exposes only the scene/engine handles to a local ad-hoc harness; it is outside the delivered build and repo. It runs the real server/client against a fresh disposable world, then supplies public DTO fixtures for otherwise unavailable overlap cases. The recorded sample results are summarized below; generated measurements are kept outside Git:

- Two fresh browser contexts reached the canvas-ready signal in **622/731 ms** and visible, settled model in **1,213/1,336 ms**. These share one browser/GPU process and warm OS caches; they are not independent cold-process distributions or a startup latency guarantee.
- Detailed/Economy changes, orthographic/perspective, low camera orbit and close view rendered successfully. Two overlapping model characters and sprites crossed a thin opaque slab: visible upper bodies remained in front, lower bodies were hidden with reveal off and shown only with reveal enabled. Both model targets stayed 128×192. Screenshots were visually inspected; this is representative depth agreement, not exhaustive pixel-level coverage.
- A direct near-plane crossing suppressed the behind-camera model image, reveal and render pass, then recovered finite projection values. Revoking one model's observation disabled its live image, reveal pass and shadow casters immediately.
- Five sprite/model replacement cycles retained **62 textures, 89 buffers, 11 layer-list entries, one character before-pass and 93,451,208 engine-accounted GPU bytes**. These are stable endpoint counters, not peak/driver memory or long-session leak proof.
- Deliberately aborting the model request preserved the sprite; model failure was reported after about **6.8 seconds**, including loader retries. No uncaught browser exceptions or provider calls occurred. Expected blocked-asset warnings and Canvas2D readback advisories are retained in the sample record.

The fixture servers/browser and owned database cluster were stopped afterward; no user save or normal running server was replaced. Additional and cumulative task Jev cost: **$0**. Hardware/crowd acceptance is still [V3D11](../maintainers/3d-pixel-art.md#v3d11--performance-devices-and-accessibility), extended cold/reveal coverage [SW18.16](../maintainers/spatial-world.md#sw18--world-presentation-delivery), and sustained command/storage stress PF00/PF11. This smoke run does not renew or extend the older eight-fire sprite throughput result to the mercenary workload.

## Art workspace relocation — October 1, 2026

Moved the editable study to `/Users/mzw/Documents/ChatGPT/OpenLegend-art/mercenary/study/`, private job records to its sibling directory, and the dated package to `mercenary/snapshots/2026-10-01-r1/`. SHA-256 inventories matched before/after for all 60 study files, four private-record files and four package files. Original visualization paths remain symlinks to the new locations. Source/art bytes and the dated ZIP were unchanged; new workspace READMEs provide navigation.

A temporary loopback server served only the relocated `study/` directory. Installed Chrome loaded the model, reached `window.mercenary.ready`, and selected the Walk animation without uncaught page errors or failed requests. The browser/server were stopped after the check. This validates the relocated isolated viewer, not new game performance or final art acceptance. Repository/local link checks, focused formatting and diff review passed. [Art progress](../maintainers/art/mercenary.md) owns the new source links and remaining art review. No provider calls; additional and cumulative task Jev cost $0.

## Authored voxel iteration — October 14, 2026

**Art direction rejected after these checks.** Mike rejected the first block figure as ugly and asked for a result closer to the original 3D model. The recorded renderer/geometry checks remain valid for that prototype; they do not establish acceptable art. [MER09](../maintainers/art/mercenary.md#rejected-first-block-figure-and-new-sculpted-iteration) and the [reopened plan](../projects/mercenary-voxel-iteration.md#revised-art-direction-after-explicit-rejection) own the replacement.

Mike rejected camera-dependent sampled pixels, lost facial detail, small apparent height and thin clothing/body intersections. The new iteration constructs permanent colored cubic cells rather than voxelizing or rasterizing the previous mesh. The original GLB, renderer, cloth, external Blender study and dated package remain intact. [MER08](../maintainers/art/mercenary.md) owns sources/creator acceptance; [A3D16](../limits/3d-pixel-art.md#a3d16--authored-block-mercenary) owns the delivered art envelope, and [world presentation](../world-presentation.md#animated-character-pixels) describes current behavior.

### Source and geometry checks

The reproducible authoring script and editable Blender source produce a standalone GLB with 21,613 intentionally placed source cells, explicit eyes/brows/nose/beard/hair, quilted clothes, mail, wraps, leather and gold peacock embroidery. Only exposed faces are exported; same-color coplanar face merging changes no solid shape or paint. An independent parse verified finite positions, 11,780 exported vertices, 5,890 triangles, 11 mesh primitives, one material, 467,296 bytes, and no textures, skins, clips, cameras, lights or external dependencies. Source/GLB/Blender digests match the provenance record; GLB SHA-256 is `533922d6d0b3c8f372c1f583aefac7e60f241f21c2b69a72664bd22a5ce93d41`.

Every body part passed solid-cell connectivity. The cape is two source cells thick. A 360-phase geometric check over the delivered rigid walking angles and visual leg lift found no conservative cape/body overlap candidates and no boot corner below support beyond floating-point zero (minimum about −4.1e−16 m). Maximum source-unit lift was 0.0280504 m. Front/back/profile/face Blender renders were inspected. These are authored-volume checks for the finite gait, not arbitrary cloth, equipment, sloped-foot or physical gameplay collision qualification.

The source model is 2.10 m with 0.025 m cells. The fixed uniform game scale is 1.4: 2.94 m presentation height, 1.26 m width and 0.035 m blocks. Normal elevated-view comparison beside the existing people informed that scale; lower-pitch views can make him appear larger. Sprite artwork faces the camera, whereas his 3D body remains upright. No native body dimension changed, and no camera-dependent scale adjustment was added.

### Actual renderer and interaction

Checked the real `WildernessScene` against a fresh disposable PostgreSQL starting-world projection, native-only configuration and zero AI allowance. A temporary loopback viewer imported the actual client source and used permitted public views for controlled movement, lighting, condition and appearance cases. Chrome **155.0.8059.40**, Apple M1 Pro, **ANGLE Metal**, 1440×960 framebuffer; a resize case used 1280×720. Source transforms were explicitly refreshed after an early preview cache retained older code; those stale intermediate results are not final evidence.

- Ordinary play, close front/profile/back, orthographic/perspective and distant perspective zoom retained the same mesh identities, 11,780 vertices, 5,890 triangles and fixed 0.035 m cells. Paused orbit did not change authored blocks/colors. Screenshots were visually inspected; ordinary raster edges and lighting still vary with the camera.
- Daylight and firelight rendered the explicit face, mail, solid clothes and cape. Walking moved rigid parts; pause kept the same walking phase across 30 further frames. A dead body used its sprite representation. Final creator style approval remains open.
- Selection retained the nearest clothing surface. A controlled opaque scenery block hid the lower body with read-through off; enabling read-through showed the correct nearest garments/limbs. The depth-only pass stayed active while actual reveal strength faded (0.314 in the recorded intermediate sample), then stopped at zero. The target resized from 1440×960 to 1280×720. This fixture proves renderer layering, not a new physical obstruction or sight grant.
- Blocking the GLB with 404 responses ended in explicit failure with the sprite retained. The engine made six free asset-fetch attempts; no provider retry or spending was involved. Delaying the asset until after replacement by the sprite left the old actor disposed, with no node and no before-pass reattached.
- Four model/sprite replacement cycles retained 13 scene asset entries, one model before-pass and identical engine-accounted texture/vertex/index bytes (63,534,428 / 2,623,440 / 234,012). Full scene destruction cleared vertex/index/uniform counters to zero and left 150,232 accounted texture bytes; remount loaded normally. These are stable endpoint counters, not driver memory or long-session leak proof.

Review found and fixed rear-surface overpainting in selection/read-through, mismatch between rendered/pickable reveal strength/width, soles entering the floor and stale depth during reveal fade. Browser evidence also caught an engine draw-list branch mismatch missed by initial source inspection; direct borrowed-mesh drawing now exercises the actual supported pinned API.

### Cost, static checks and limits

One fresh-page source-viewer load reached ready art in **2,222 ms**, with warm OS/provider-free local assets. One matched paused scene, daylight, reveal off, 30 warm frames then 60 animation-frame samples per representation:

| Representation           | Median frame interval | p95 frame interval | Total draws |
| ------------------------ | --------------------: | -----------------: | ----------: |
| Authored block mercenary |               16.7 ms |            17.6 ms |         365 |
| Its sprite fallback      |               16.7 ms |            17.6 ms |         322 |

These displayed intervals are limited by synchronization and do not measure GPU headroom or qualify crowds/low-end hardware. The extra 43 draws include ordinary geometry and world shadows. No matched performance comparison against the old sampled model was run; older GPU/cloth measurements above retain their own environments and cannot establish a speedup for this workload.

TypeScript, production build and changed-file formatting passed. The existing focused camera gesture test passed on installed Chrome/Metal (17.3 s test, 24.8 s run) with a temporary 20 s startup expectation. Its initial default SwiftShader/5 s startup attempt timed out before the already-rendering interface became available; the trace showed the time controls later appearing. This is a fixture/backend qualification difference, not a promised startup deadline or a test-source change. No new automated tests, broad suite, dependency changes, user-save reset or paid calls were made.

The fixture hosts and isolated browser were stopped; known owned databases were dropped. One failed setup allocated a database without logging its identity; it was left intact because ownership could not be proven among pre-existing fixture databases. Generated screenshots/logs/harnesses remain outside Git. Additional and cumulative task Jev cost **$0**. MER05/MER07 retain creator style approval; V3D05/V3D11 retain broader poses, equipment, exact silhouette picking, moving populations and device qualification.

## Sculpted source-guided iteration — October 14, 2026

Mike rejected the first block figure as ugly and asked for a much closer likeness to the original 3D model. This revision preserves both earlier art sets. The original standing body's geometry and bone landmarks plus the fitted cape rest geometry guide offline solid-cell construction; anatomical material regions, restrained eyes/brows/mouth, warm hair/beard and two-peacock cape embroidery are deliberately repainted. No original texture colors or camera image are sampled. The shipped asset is an ordinary immutable vertex-color mesh. [MER09](../maintainers/art/mercenary.md#rejected-first-block-figure-and-new-sculpted-iteration), [current presentation](../world-presentation.md#animated-character-pixels) and [A3D17](../limits/3d-pixel-art.md#a3d17--sculpted-source-guided-mercenary) own source progress, current behavior and its limits.

The finer cells and actual anatomy replace the first figure's cuboid body sections, slab-like hands, horizontal cape throw, large eyes and chunky buckles. Developer inspection compares actual front/back/profile/face renders with the source study; this establishes what was inspected, not Mike's aesthetic approval. The imported source anatomy remains derivative study material with unqualified production rights.

### Fit finding before final export

The first source-shaped candidate (`76c79c177af1ee73c374704da6c13f7c76c351229172b0b16c676d94790eb3a7`) contained 124,215 cells and 69,754 triangles. A 360-phase solid-cell check found moving left-upper-arm/cape intersections in 358 poses, up to 649 intersecting arm cells; smaller forearm, thigh and shin contacts also occurred. These are volume contacts, not a count of visible incorrect pixels, but they invalidate a blanket garment-clearance claim. Standing-pose subtraction alone was insufficient. Connectivity checking also found 39 cells outside their parts' largest connected solids. These findings required source correction and new artifact checks before completion. The actual boot-bound gait calculation kept the lowest sole corner at support, with maximum source lift about 0.02830 m; that result does not qualify cape fit or arbitrary poses.

Additional provider/Jev cost for this revision is $0; cumulative task provider/Jev cost is $0. No Meshy, image-provider or other paid call was made. Original files and the rejected first figure were preserved; no private save was reset. Runtime checks use the disposable native PostgreSQL fixture and browser setup described above.
