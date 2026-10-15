# Mercenary — original-model refinement

| Status    | Current progress                                                                                                             | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Original animated mercenary restored with preserved artwork, tall-adult scale, moving cape and scoped browser qualification. | 2026-10-14   |

## Authorized outcome

Mike prefers the original model from before the block experiments and requests cleanup plus a taller, world-appropriate displayed size. Preserve the original GLB/source and both block trials. This supersedes using either block figure as the default; it does not approve a general art pipeline or require literal cubic anatomy. [MER10](../../maintainers/art/mercenary.md#original-model-refinement) owns the revision; [world presentation](../../world-presentation.md#animated-character-pixels) owns current behavior.

Continue in `/Users/mzw/.codex/worktrees/415f/OpenLegend` on `codex/mercenary-original-refinement`, branched from the preserved `codex/mercenary-voxel-art` checkpoint `631835866`. Base: `https://github.com/Macrofold/OpenLegend.git`, verified default `origin/main@0c12398e32e7c9578e18de07bbe79d39b4827208`. Rebase applied all nine existing commits unchanged, without conflicts; `git range-diff` confirms equivalent patches. The main checkout is unaffected.

## Scope, owners and decisions

Estimated 200–400 changed runtime logic lines, excluding tests, mostly the existing model actor/material/cloth owners and nearest-surface depth support. Moderate rendering/cloth/lifecycle risk; no domain, protocol, persistence, native body dimensions or action changes. No provider calls or new assets are required.

Use the original animated GLB, its authored face, outfit and separate moving cape. Remove destructive runtime atlas reduction/recoloring and the additional low-resolution character image from this default representation; geometry and fixed source artwork draw directly in the existing world renderer. Inspect source emission explicitly so material cleanup does not make clothing self-lit. Reuse existing selection/read-through, shadows and sprite fallback, adapting nearest-surface protection to actual skinned geometry. Preserve the old sampled renderer as a study artifact, not a second active compatibility path.

Choose one camera-independent uniform display scale by comparing actual visible silhouettes with the current people and nearby world props at ordinary camera pitch; the mercenary should read as a tall adult. A starting value around 1.6 is a comparison candidate, not an accepted final value. Scale all world-space cape constraint lengths, tether distances, collision radii and ground allowance consistently. Source-space chest contact remains source-space because its bone transformations already apply scale. Preserve dark lining and fix any demonstrated coverage defects within Idle/Walk; no general garment physics, arbitrary poses or sloped-foot-placement project.

## Implementation and verification

1. Restore the original model factory through the existing scoped appearance; retain both previous art sets and original GLB bytes.
2. Preserve original textures/material detail, direct rendering and truthful world lighting. Reuse shared scene resources; borrowed skinned depth/reveal meshes share the original skin owner and are released before assets/materials. Fence delayed loads after replacement.
3. Make cloth size consistent with the model and inspect actual standing/walking coverage, front/back/profile, stopping and pause. Correct exposed body/garment defects found by these checks without adding unrelated systems.
4. Compare normal/close views, orthographic/perspective orbit, daylight/firelight and nearby people/world objects. Check selection/occlusion/read-through/fade, resize, hidden/unsupported sprite fallback, failed/delayed loads and destruction/remount using the existing disposable public-view fixture with `AI_BUDGET_USD=0`.
5. Run TypeScript, production build, changed-file formatting and complete affected-diff review. Reuse unchanged camera-interaction evidence; record actual new source/frame/resource observations and limits. Reconcile current specs/limits/trackers/evidence and commit all task changes locally. No push/merge.

## Performance and completion

Cost grows with visible characters × original skinned geometry × light/shadow/reveal passes, plus each character's bounded 366-particle cape solver. Share GLB decoding and prepared materials once per scene; cache no camera image. Actor pose/cloth changes update only that actor; heading/zoom never regenerate or classify textures. Scene replacement invalidates its asset/material preparation; removal disposes actor effects and cloth before shared resources. Measure actual single-character frame/draw/resource counters and replacement/teardown behavior; do not infer crowd or low-end qualification.

Completion means the preferred original art is visible in the game, its face/material detail survives cleanup, the mercenary reads as tall beside existing people/world objects, representative Idle/Walk cloth coverage and lifecycle checks pass, all agreed documentation/review/checks are complete and changes are locally committed. Creator style approval, imported-model production rights and general pose/device/population qualification retain their separate owners. Additional provider/Jev cost is $0; cumulative task cost is $0 at planning.

## Review corrections before qualification

The first browser attempt was invalid: a frozen canvas and repeated skin-texture errors prevented visual or timing conclusions. Independent review found that assigning a new root scale overwrote the GLB’s 0.01 unit conversion, and disabling the skinned root during settling destroyed skins already borrowed by effect meshes. The implementation now multiplies the authored scale, keeps the rig enabled while hiding its meshes/stopping animation, and refreshes borrowed effect/depth skins after an ancestor is re-enabled. Fresh source/browser evidence must confirm these corrections; the invalid screenshots/counters are not qualification.

## Completion

The fixed 1.6 scale was selected after ordinary-camera comparison: approximately 146 opaque head-to-sole pixels against 130 for the nearby blue-clothed person, about 12% taller. Source art and all three GLBs retain their bytes; the face, separate cape and original Idle/Walk remain. Paused attachment preserves the frozen cape while position/heading changes, and visibility effects follow recreated source skins.

[Final evidence](../../verification/mercenary-default.md#original-model-refinement--october-14-2026) records fresh-source camera/source stability, natural walking/stop/pause, sampled coverage/lighting, resize, failed/delayed loads, ancestor re-enable and replacement/teardown; TypeScript, build, changed-file formatting, references and affected-diff review passed. No provider calls; additional and cumulative cost $0. All agreed implementation/verification work is complete. The broader moving-population/style/rights/device gates are unchanged and are not claimed complete by this revision. No open developer questions or remaining agreed work; no push/merge.
