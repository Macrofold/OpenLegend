# Small-subject detail and grounded atmosphere

**Current follow-up:** [Coarser detail and open foliage](#coarser-detail-and-open-foliage--october-17-2026) supersedes the 40/120 detail choice below. The earlier delivery, measurements and rejected choices remain historical evidence.

Recorded October 17, 2026 UTC on `codex/starting-scene-pixel-art`, task baseline `c30bf2758`, in `/Users/mzw/.codex/worktrees/415f/OpenLegend`. The explicit development base remains local `codex/mercenary-original-refinement@1438ea13749d4acc7a852843d8677f687dbdd931` in `https://github.com/Macrofold/OpenLegend.git`; no branch/worktree switch, rebase, merge or push occurred. This implements the independent parts of the [feedback iteration](../projects/3d-pixel-art-first-scene-plan.md#small-subject-clarity-and-survival-atmosphere--october-16-2026); replacement-bear acquisition remains blocked on source access.

## Decisions and actual delivery

- Small imported subjects now use three times the ordinary fixed sampling density: 120 samples/metre versus 40 for ordinary people/scenery, limited by the display. Normalized source bounds with a longest extent of at most 1.6 m select the finer group once during material preparation. This finite presentation calibration changes neither anatomy nor world dimensions. The mercenary remains 2.035 m beside 1.85 m adults.
- One existing final compositor handles both densities, using opaque alpha tags and separate color contributions. There is no per-small-object capture, extra geometry pass or adaptive source repainting. Blended copies preserve opacity. The alpha-capable HDR target costs memory; all earlier treatments remain selectable. This is sampled 3D artwork, not permanent voxel geometry or a universal no-shimmer guarantee.
- The survival atmosphere lowers saturation/bloom and uses cooler, darker ambient light while retaining sunlight and local firelight. An initial nearly black dusk was rejected and archived; the revised setting keeps surrounding people/river/trees readable. Previous bright woodland remains a control. Changing atmosphere now relights immediately through the scene owner, without needing another world update.
- Four real Poly Haven CC0 sources supply twelve finished comparisons plus four original controls and four editable Blender files. The **clear chest** is the new crate presentation choice; **quiet boulder**, **clear fern** and **clear fallen log** are inspector recommendations only. The fern's broad planar leaves remain weaker than the rock/chest and are not adopted into woodland scenery. These are source-form/albedo adaptations with designed pixel rendering, not claims of newly hand-painted textures or a replacement for every existing low-poly asset.

| Source                                                     | Selected derivative geometry | Albedo     | Integration                                  |
| ---------------------------------------------------------- | ---------------------------: | ---------- | -------------------------------------------- |
| [Treasure Chest](https://polyhaven.com/a/treasure_chest)   |             13,996 triangles | clear 512² | Existing crate appearance and inspector      |
| [Boulder 01](https://polyhaven.com/a/boulder_01)           |              9,000 triangles | quiet 256² | Inspector; no new obstacle                   |
| [Fern 02](https://polyhaven.com/a/fern_02)                 |              2,384 triangles | clear 512² | One complete source specimen; inspector only |
| [Dead Tree Trunk](https://polyhaven.com/a/dead_tree_trunk) |             12,000 triangles | clear 512² | Fallen log, about 2.1 m long; inspector only |

The boulder initially resisted simplification because coincident source vertices left disconnected boundaries. Welding at 0.00001 m before reduction preserved per-corner UVs and allowed the actual 9,000-triangle export. The recipe now checks evaluated triangle counts, not polygon counts. Disconnected normal/ORM image nodes were removed so catalog texture accounting matches exported textures. Clear/quiet/weathered options and originals remain preserved. [Credits](../../apps/client/src/props/ATTRIBUTION.md), [acquisition hashes](../../art-direction/assets/source-study/polyhaven-sources.json) and [reproduction](../../art-direction/assets/source-study/README.md#poly-haven-detail-study--october-17-2026-utc) distinguish sources from modifications.

The complete collection is now **45 families, 135 alternatives, 42 source controls, 24 editable Blender files and 219 GLBs / 273,063,156 bytes**. The new sixteen GLBs add 22,740,960 bytes, largely original controls; these are separate review/download choices, not simultaneous gameplay residency. No dependency, server/domain/protocol, saved world, action, collision or light-authority change was made. No external paid call, purchase or upload occurred: settled, reserved and uncertain external spending are each $0.

## Preservation and visual evidence

[The dated review](../../art-direction/studies/2026-10-17-detail-and-atmosphere/README.md) links every new capture and recommendation. [The historical archive](../../art-direction/studies/README.md) contains all 331 recoverable earlier files: 278 PNGs, 32 WebMs, 14 MP4s, one JPEG and six supporting HTML/JSON/Markdown files, totaling 214,545,633 bytes. Every copied byte hash matches; original files remain untouched. This does not invent screenshots for earlier views that were never captured. Download filenames now include UTC timestamps and comparison settings to prevent overwriting successive iterations.

Actual in-app WebGL2 inspection covered all four new three-way comparisons, bird close/game framing, rotation, existing source/variant controls and camp daylight/low sun/dusk. The finer bird retains recognizable head/beak/tail detail in the matched close image. At the normal game camera it still occupies only a few display pixels: neither density nor a more detailed mesh can reveal nonexistent screen area. All body dimensions remain honest. The archived bird rotation and moving camp retain sampled edge/shadow changes; they are review evidence, not certification that every thin/grazing surface is stable.

## Complete-frame comparison

Two warm ten-second camp measurements used the same new chest, 36 presented entities, 1,250 scenery records, Economy shadows, 1231×468 framebuffer, orthographic zoom 5.5/pitch 0.68, staged walking and slow orbit. Device: the existing M1 Pro/32 GiB in-app WebGL2 session, display DPR2 capped to render DPR1. The controls reset the camp camera; asset loading had completed. No GPU-driver memory or cold-start capacity claim follows.

| Profile                                   | Completed samples | Frame median / p95 / p99 / max (ms) | Median submitted draws | Counted texture + vertex + index bytes |
| ----------------------------------------- | ----------------: | ----------------------------------- | ---------------------: | -------------------------------------: |
| Fine small subjects + survival            |               756 | 16.0 / 17.5 / 24.6 / 25.8           |                    673 |                            104,481,556 |
| Shared density + previous bright woodland |               703 | 16.0 / 18.6 / 25.8 / 42.6           |                    672 |                            101,413,496 |

Durations were 10,000.1 and 10,020.8 ms respectively, both with zero unrendered tail. Median CPU update/render-submission costs were 1.5/9.4 ms and 1.5/10.0 ms; median summed GPU pass timers 6.215083 and 6.364541 ms. GPU pass sums are not wall-clock frame duration. About 3.07 MB additional counted memory is consistent with retaining the alpha classification channel. Similar draw counts support no added geometry pass. The faster sample does **not** prove an optimization; timing variation and sequential comparisons prevent that conclusion. Neither run qualifies strict uninterrupted 60 Hz, crowds, smaller devices or cold startup; prior V3D01.13/V3D11 gaps remain.

## Source access and remaining work

The current bear is still the earlier angular madtrollstudio derivative. [Brown Bear by andrejsharapov](https://sketchfab.com/3d-models/brown-bear-a4e5d1b3e1444aa7852b047b71c35368) is listed under CC BY 4.0 and is a higher-detail Meshy-derived candidate, not qualified artwork; its 434.1k source triangles would require offline reduction and rig/pose review. Downloading requires Sketchfab login, requested from Mike while independent work continued. No authenticated download was attempted without access.

A formerly indexed WildMesh download was deleted. The [current 13.6k animated demo](https://sketchfab.com/3d-models/bear-realistic-3d-model-demo-free-8ba2b39b31474ddd96d95d47119250b1) explicitly lists **CC Attribution-NonCommercial**, despite its free-download marketing; it was excluded from game assets. Do not infer commercial rights or the demo's animation set from its full-pack advertisement. A better silhouette/source still needs acquisition, three preserved finishes, motion/scale review and integration before the bear request is complete. No superficial smoothing pass is presented as that replacement.

## Verification

All sixteen new GLBs passed embedded-resource, SHA-256, exact exported triangle-count and finite-vertex checks. Four editable-source/recipe hashes match their catalogs. All 331 historical archive size/hash checks passed. Blender 5.2.2 LTS imported/exported the sources locally with automatic scripts/network disabled; browser imports supplied the actual rendered inspection. After the immediate-relighting correction, `pnpm typecheck` and `pnpm build` both passed. Browser inspection confirmed the bright→survival atmosphere changes immediately on the held lookout view, the source control remains available, and the same chest gains construction detail when switching from shared to fine density. The whole affected runtime/recipe/documentation diff was reviewed. Pinned formatting and local Markdown target checks passed; capture and source hashes were verified. No broad game/database/provider suite was run because native behavior and persistence were unchanged. No claim of arbitrary context-loss or lower-end-device qualification is made.

## Coarser detail and open foliage — October 17, 2026

Recorded 2026-10-17 01:44 UTC, baseline `89e94a3b8`, same branch/checkout and explicit development base above. Mike found the preceding detail too fine, pale patches misleading, and tree crowns opaque/flat with excessive self-shadow. This finite revision is implemented; broader art acceptance and the separately blocked bear replacement remain open.

### Changes and diagnosis

- Ordinary density changes from **40 to 30 samples/metre**, and small subjects from **120 to 60**. The existing compositor uses a 2× allowance instead of 3×; there is no additional geometry pass or per-object capture. Previous choices remain available. Adult/mercenary dimensions and all native world rules remain unchanged.
- The old pine used solid green sheets: light adjustments alone could not open the crown. [Poly Haven Fir Sapling Medium](https://polyhaven.com/a/fir_sapling_medium), CC0, supplies real branches and gaps. Three finishes and a normalized original are retained; quiet is the current conifer choice. Blind triangle reduction lost needles, and the next atlas-based attempt produced black bleed. Both failures are archived. Final preparation retains/broadens whole needle groups, paints fixed greens and uses fixed canopy normals, with no camera-dependent repainting.
- Leaf materials use a wrapped diffuse response and stronger ambient contribution while retaining ordinary shadow visibility. This approximates the light gathered by a leaf cluster; it is not physical subsurface scattering or simulated light transmission. Other existing crown forms receive grouped greens. Broadleaf/birch geometry remains the previous source, with its remaining form limitations.
- Pale patches had several contributors. Birch paint had nearly white plateaus; repeated ground-color contrast resembled illumination. Both are subdued. The metalness material workflow ignored the old specular-RGB setting, so its effective specularity factor is now restrained. This correction alone did not remove the pale bark, which is why the paint was corrected too. The whole scene was not simply darkened.

The four new GLBs total **30,142,976 bytes**, including the 24,607,284-byte original control. Each finished fir contains **30,000 triangles**; the original contains **420,822**. The scene compiler bakes texture transforms and joins compatible live/dead bark after their UV transforms, retaining two material parts per fir. Color, shadows and camera-obstruction tests share the prepared positions/indices and applicable source alpha. Distinct material identities preserve both tree comparisons when loaded together. All preparation is offline; runtime uses the existing shared meshes, instancing, material and shadow owners.

The source-study collection now has **46 families, 138 alternatives, 43 original controls, 25 editable Blender files and 223 GLBs / 303,206,132 bytes**. These are separately selected assets, not simultaneous gameplay residency. No new dependency, provider, save, gameplay placement, collision, body-size or authorization change occurred. Additional settled, reserved and uncertain external spending are each $0; the task remains within Mike's $25 authorization.

### Visual and implementation checks

[This round's archive](../../art-direction/studies/2026-10-17-foliage-and-detail/README.md) retains 20 captures, including previous/B/C comparisons, all three finishes, original/rear views, chest density choices, bird close view, final daylight/low sun/dusk and an eight-second moving camp. The final fir has separated boughs rather than solid tiers; fixed greens remain attached in the inspected front/rear directions. The balanced chest retains latch/band construction with larger pixels. Bird close detail is reduced and normal-game footprint remains display-limited. Recorded orbit frames retain sampled silhouette/shadow changes: this is not a universal no-shimmer claim.

Actual in-app WebGL2 checks exercised treatment switching, orthographic/perspective and closer framing, renderer reload, overlapping woodland scenery and light changes. No warning/error console entries appeared in the final inspected scene. Existing source-alpha/camera-obstruction/shadow consumers were reviewed together; the new needle gaps use geometry rather than a separate transparency trick.

All four final exports passed exact hashes, embedded-resource, finite position/normal, normal-length, triangle-count and index-bound checks. Source/recipe/helper/editable-file hashes match; all eight acquired source files and compiled-output provenance match. Compiled shapes have finite arrays, valid material/texture references and existing normalized caller-owned envelopes. Fir geometry uses two parts; previous/current material keys do not collide. Both changed Python files pass syntax parsing. `pnpm typecheck` and `pnpm build` pass; the existing large-chunk build warning remains. Changed-file formatting, local documentation links, capture hashes and the complete affected code/documentation diff were checked. No unrelated native-game/database/provider suite was run.

### Final matched moving-scene cost

Two sequential ten-second windows used the same M1 Pro/32 GiB WebGL2 session, DPR2 capped to render DPR1, **1231×468** framebuffer, Economy shadows, ordinary orthographic camera (zoom 5.5/pitch 0.68), daylight, staged walking, slow orbit, 36 presented entities and 1,250 scenery records. All assets were ready; the separate inspector and offline exports/build were finished. Both tree choices were warm in the shared scene cache.

| Measurement                             | Previous 40/120 + original trees |     Current 30/60 + open fir |
| --------------------------------------- | -------------------------------: | ---------------------------: |
| Completed interval samples / duration   |                778 / 10,010.1 ms |            634 / 10,019.0 ms |
| Frame median / p95 / p99 / max          |     14.9 / 18.2 / 24.8 / 50.0 ms | 16.6 / 25.3 / 26.6 / 57.2 ms |
| CPU update median / p95                 |                     1.3 / 3.3 ms |                 1.3 / 3.2 ms |
| CPU render submission median / p95      |                     5.8 / 6.9 ms |                 5.5 / 6.1 ms |
| Summed GPU passes median / p95          |             6.1165 / 8.943708 ms |      8.406125 / 11.198416 ms |
| Submitted draws median / p95            |                        672 / 682 |                    671 / 680 |
| Counted texture + vertex + index memory |                107,258,028 bytes |            107,258,028 bytes |

Both windows had zero unrendered tail. Memory includes both cached alternatives and is not an isolated per-choice comparison. GPU pass sums are not wall-clock frame duration. Combining redundant bark parts removed the preliminary extra draws, but the open fir still adds geometry cost: about **2.29 ms more median GPU time** in these samples. Sequential timing variation prevents a universal causal/performance claim. The current p95 **does not qualify uninterrupted 60 Hz**. Denser forests, cold loading, lower-end devices and arbitrary-view motion stability remain broader qualification gaps; the saved results do not close them.
