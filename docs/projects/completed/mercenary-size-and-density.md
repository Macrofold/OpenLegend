# Mercenary — size and surface-pixel correction

| Status    | Current progress                                                                                                 | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Corrected world proportions and coarse surface paint passed scoped visual, identity and texture-lifetime checks. | 2026-10-15   |

## Scope and plan

[MER11](../../maintainers/art/mercenary.md#size-and-surface-pixel-correction) records Mike’s report that the restored original looks twice as large as the other people and its pixel resolution is too high. Keep the original model, face, animation and separate fabric cape; preserve all earlier art. This revises the previous [original-model refinement](mercenary-original-refinement.md)'s 1.6 display enlargement and full-resolution diffuse-texture decision. No native body, world, save, protocol, camera-control or startup behavior changes are needed. The existing startup command is `PORT=3211 pnpm dev`, serving the client/game at the same address.

Continue on `codex/mercenary-original-refinement` in `/Users/mzw/.codex/worktrees/415f/OpenLegend`, starting at `ab0de7555727c6e194d8c8e5c4c5d411a79dea5f`. The verified/fetched repository default remains `https://github.com/Macrofold/OpenLegend.git`, `origin/main@0c12398e32e7c9578e18de07bbe79d39b4827208`; reconciliation changes no commits. Preserve unrelated research documents/edits. No new branch, worktree, push or merge.

Estimated 40–80 changed runtime logic lines in the existing actor/material owners. Moderate visual/resource-lifetime risk; no new rendering pass or repeated texture conversion. Implementation:

1. Reduce fixed display scale from 1.6 to a candidate 1.1 (2.035 m tall, 1.045 m conservative cape width). Existing cloth lengths/clearance/gravity already derive from this scale. Compare low/default camera pitch beside people and props; upright geometry naturally foreshortens while other people's artwork faces the camera. Do not compensate by resizing with the view.
2. Prepare faithful, fixed-density diffuse texture copies once per source map/scene, initially 192×192 body and 192×288 cape, preserving aspect ratio. Average source detail once, retain colors and nearest magnification, with mip filtering at distance. This approximates neighboring artwork's surface density while giving the original head about 16 painted cells. No palette classification, self-emission, color-frame pixelation or new paid assets.
3. Share prepared textures across material/actor instances. Release visibility/outline/material borrowers before owned prepared textures; source GLB textures remain asset-owned. Reject unsupported preparation through the existing sprite fallback rather than silently restoring high density.
4. Exercise ordinary low/default-pitch normal/close front/profile/back, both eyes and UV seams, smooth cape outline with coarse embroidery, actual Walk/stop/pause, zoom/orbit texture identity and fixed density. Check shared materials, selection/read-through, fallback/delayed replacement, repeated replacement and teardown because prepared texture ownership changes. Reuse unchanged skin/cloth/controller evidence; do not repeat unrelated game qualification or private animation seeking.
5. Run TypeScript, production build, changed-file formatting, complete affected-diff review and local links. Reconcile current presentation/limits/art tracker and focused evidence, then commit all task changes locally. Raw images/logs stay outside Git. No new automated tests by default.

## Performance and completion

Cost grows with visible model fragments/light passes as before. Two small diffuse texture copies are shared scene preparation; actor creation and camera/movement frames never resample them. Source-map replacement or scene destruction invalidates this reuse. Sample actual prepared dimensions/IDs, GPU byte counters through replacement/destruction and one bounded renderer scene. No crowd/device headroom claim follows from synchronized frames.

Complete when the mercenary has tall-person world proportions without the former oversized width/height, clearly coarse surface paint with both eyes preserved, stable camera-independent texture density, correct lighting/cape/visibility behavior and owned-resource cleanup, plus scoped checks/docs/review/local commits. Mike's final style approval and broader pipeline/rights/equipment/population/device gates remain separate. Disposable native fixture only, `AI_BUDGET_USD=0`; no provider calls planned, additional/cumulative task cost $0.

## Completion

Fixed scale 1.1 was retained after actual low/default-pitch comparison: slight tallness at low view, natural foreshortening beside camera-facing artwork at the steep default. Body 192×192/cape192×288 paint retains both eyes, colors and visible coarse detail without increasing stored resolution during camera changes. Shared prepared texture identity and stable replacement/destruction counters were verified; original sources remain intact. [Final evidence](../../verification/mercenary-default.md#size-and-surface-pixel-correction--october-15-2026) records the representative views, resource checks and explicit limits.

TypeScript/build/formatting/references and affected-diff review passed. Owned fixture/browser/database/cache are closed; no private save or paid provider was used. Additional/cumulative provider cost $0. All agreed scope is complete with no open developer questions. Final creator acceptance and broader production gates remain outside this correction; no push/merge.
