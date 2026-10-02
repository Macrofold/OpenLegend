# Default mercenary character evidence

September 28, 2026. Scope: the owner-selected mercenary study as a separate default NPC, live animation/cloth, fixed character pixels and actual-depth compositing. [Plan](../projects/mercenary-scene-pilot.md), [current presentation](../world-presentation.md#animated-character-pixels), [bounds](../limits/3d-pixel-art.md#a3d15--bundled-mercenary-pilot), and remaining [V3D01/V3D05/V3D11 work](../maintainers/3d-pixel-art.md). This does not qualify the general generated-art pipeline.

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
