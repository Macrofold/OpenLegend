# Character visibility and target feedback

## October 3, 2026 — Isolated implementation

Implementation was exercised on `codex/character-visibility`, based on local `main` at `b50ec6ce75f260d68c18ec99d767982c65b0fccb`; fetched `origin/main` matched that commit. The primary checkout and its running server were left untouched. [SW18.17](../maintainers/spatial-world.md#sw18--world-presentation-delivery) owns scoped completion; [the presentation contract](../world-presentation.md#selection-and-hover) owns behavior.

## Setup and scope

The actual PlayCanvas renderer ran in a separate browser tab at 1280×720, using a temporary fixture outside Git. A separate production server and disposable PostgreSQL database supplied the existing public character projection. The fixture repositioned those public entities and added a camera wall to create repeatable overlaps; it did not change a real save or qualify bodily sight through that wall. AI spending was disabled and the simulation paused. Additional and cumulative provider cost: **$0**.

The production game UI was checked separately for In view inspection of the permitted campfire and Escape returning to the list. Synthetic projection changes exercised lost sight and remembered images. No new automated tests or generated evidence artifacts were committed.

## Observed behavior

- An unselected fire remained behind both an ordinary sprite person and the live pixel-rendered animated character. Flames outside the character silhouette remained visible normally. Selecting the fire drew it fully in front of either person and the camera wall; clearing selection restored depth ordering.
- With both the fire and person behind scenery, the person remained readable without fire pixels painting over its silhouette. An initial faint overlap at the person's faded edge prompted a full-alpha, color-free character protection pass; the final wall check passed. Turning read-through off hid the obscured targets, while the perceived selected fire retained foreground presentation.
- Left- and right-clicking a remembered fire each produced “Mike can't see this.” The recorded callbacks contained refusal, with no movement, selection or contextual target. Removing the currently selected fire from the current projection cleared selection. Completely undisclosed targets were not introduced into the public projection.
- Hover outlines followed sprite head/arms/legs, the animated body's cape/legs and the crate shape. A final unselected-person sample began at **1.0109 seconds** and completed the fade at **1.2536 seconds**. Earlier onset measured **1.0128 seconds**. Reduced motion retained the delay and switched directly to full opacity; a background-tab sample had onset and full opacity on the same frame at **1.6081 seconds**, so it does not establish precise foreground timing.
- Leaving, blur/cancellation and a native canvas drag removed the outline. The drag issued no movement command. Perspective changes, target changes and repeated world rebuilds retained working presentation; the layer count settled at 21 sublayer entries after the animated model loaded, rather than accumulating layers.

## Cost and lifecycle

For a single-mesh crate, activating the outline changed the measured draw count from **117 to 121**, returning to **117** after cancellation. That is one mask draw, two dilation draws and one blend draw. Sampled warm mean frame times were approximately **8.33–8.34 ms** with and without an outline; other short samples ranged higher under host contention. These observations establish bounded additional work, not a causal frame-rate improvement or sustained capacity.

A smoke check with 40 additional projected sprite people recorded **242 draws**, one current outline copy and unchanged settled layer count. It does not qualify a dense moving world, sustained gameplay or lower-end devices. The outline owns two reusable canvas-sized color targets and mask depth; character protection adds eligible-character submissions without a target-by-occluder CPU matrix.

Destroying the renderer with a selected fire and active crate outline released both outline render targets, all mask copies/materials and all added presentation/model layers. Only the original world/depth/skybox/immediate/UI layers remained in the captured composition; no browser errors were logged. Repeated rebuild checks preceded this teardown check.

## Static checks and remaining limits

Pinned Prettier checks passed for all 18 changed/new files; `git diff --check` and relative documentation file-target checks also passed.

`pnpm typecheck`, `pnpm build` and the three existing `apps/client/src/world-camera.test.ts` checks passed. Production build retained the existing PlayCanvas `node:worker_threads` externalization and large-chunk warnings. Browser error logs were empty during rendering and actual game inspection checks; existing development shader-chunk version warnings remain outside this change.

The animated model still uses conservative per-mesh bounds for picking; its visual outline uses the actual sampled silhouette. Exact model picking and broader overlap/cutaway coverage remain under SW11.3/SW11.4. Physical lower-end devices, cold startup and sustained renderer capacity remain SW18.16. The full test suite, full `pnpm run check`, live-provider behavior and multiplayer gameplay were not run for this rendering change.
