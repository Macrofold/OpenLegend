# Natural-source replacements

Recorded October 17, 2026 EDT on `codex/starting-scene-pixel-art`, baseline `7aee6638c`, in `/Users/mzw/.codex/worktrees/415f/OpenLegend`. The explicit development base remains local `codex/mercenary-original-refinement@1438ea13749d4acc7a852843d8677f687dbdd931` in repository `origin` / `https://github.com/Macrofold/OpenLegend.git`. No branch/worktree switch, rebase, merge or push occurred. External settled/reserved/uncertain spending is **$0 / $0 / $0**, within Mike's $25 cap.

## Delivered decisions

The remaining inventoried Quaternius scenery, deer/stag/wolf, resource plants and equipment recommendations now have natural-proportion replacements. [Sources, exact licenses, preparation and retained inputs](../../art-direction/assets/source-study/natural-replacements.md) own the source inventory. Three finishes and original controls remain available for each changed family. The former models remain explicit retained comparisons.

Poly Haven supplies natural forms and material distinctions; it does not provide every required animal or piece of equipment. CDmir/TinyWorlds supplies deer anatomy and motion, yd supplies archery, Wildfire Games supplies the wolf, and Pablo Lizardo/Jarrhead supply the leather pack. The Wildfire box-shaped pack was rejected after actual rendering; the licensed Sintel pack replaces it. Earlier untextured deer, sparse crowns, four-plant shrub rows, pale shrub colors and invalid pack UV exports remain archived as rejected trials.

The ordinary scene selects the new sources without changing saved appearances, bodies, placements, collision, cover, quantities or behavior. A finite presentation mapping replaces only affected models when its source selector changes. Prior sources remain selectable. Inspector labels distinguish retained families, shared tree controls resolve to the correct source directory, and creator/license credit accompanies downloads. The arrow's source orientation is corrected before normalizing its actual length. No new equipment functionality is implied by the inspector.

The mercenary, ordinary adult scale, existing 30/60 samples-per-metre treatment, held-12 motion and survival lighting remain unchanged. The pale-barked tree is an adaptation of the broadleaf source; the riverside clump uses tall grass. Source-driven pixels remain sampled rendering rather than permanent cubic geometry. This delivery does not claim zero shimmer, production animation for every action, final creator acceptance or a new general asset pipeline. The previously tracked bear replacement remains separate and unresolved.

## Measured scene cost

Physical Apple M1 Pro, WebGL2, 1231 × 468 framebuffer, pixel ratio 1, Economy shadows, same camp focus/yaw/framing/daylight, staged walking, no orbit for the matched pair. Both source choices had been loaded in the same renderer; the approximately 125 MB count therefore includes retained comparison resources. These are two ten-second samples, not crowd/device qualification.

| Metric                                 |  Previous sources | Natural replacements |
| -------------------------------------- | ----------------: | -------------------: |
| Frame median / p95                     |     9.3 / 17.5 ms |       16.6 / 17.6 ms |
| Frame p99 / maximum                    |    41.0 / 92.5 ms |      41.4 / 108.0 ms |
| GPU-pass median / p95                  | 7.354 / 11.659 ms |   10.615 / 12.240 ms |
| Draw median / p95                      |         658 / 664 |            713 / 719 |
| Counted texture + vertex + index bytes |       125,047,302 |          125,050,374 |

The new source geometry costs about **3.26 ms median GPU time and 55 draws** in this matched view. Its frame p95 is similar, but tails remain above a strict 60 Hz budget. This is an explicit visual-quality tradeoff, not a performance improvement. Separate moving-camera evidence is retained; its changing view is not used for the matched comparison. The natural-only cold scene counted 120,954,550 bytes; this is a different cache state, not a directly comparable memory reduction.

Trees are prepared offline from a roughly two-million-triangle source into approximately 34,441 triangles per selected tree; the existing 30,000-triangle fir remains. Selected two-stem shrubs have about 10,000 triangles; grass has 1,257, wolves 4,176, deer 4,784 and stag 4,924. Sources and materials are shared; the change adds no per-object capture or per-frame mesh generation. The pack shares two surfaces instead of nine identical material graphs. Large original controls remain optional inspector downloads, not gameplay loads.

## Verification and limits

- Final `pnpm typecheck` and `pnpm build` passed; the build completed in 15.65 seconds with its large-chunk warning. Python AST parsing passed for all four new recipes and the scenery compiler. The full affected executable diff, changed-file formatting and whitespace checks passed.
- Actual inspector views cover all selected source families, multiple coats/finishes and retained choices. Saved wolf, doe and stag recordings were inspected across changing source Run poses and camera angles, without detached/exploded skin. These short recordings do not qualify every native animal action or establish complete orbit stability.
- The 90 distinct exported GLBs passed 91 catalog-reference checks (the broadleaf original is shared with pale bark), covering source/recipe/helper/output hashes, all 20 selection mappings, finite attributes, triangle indices, embedded textures/buffers, valid material UV bindings, normalized skin weights, Idle/Run clips, attribution and file-size limits.
- Actual scene comparisons cover daylight, low sun and dusk, woodland/camp views and gathered berries. All three fruit-free exports retain byte-identical plant surface geometry/attributes while removing the fruit surface. Natural → previous → natural switching was exercised in the same renderer. A clean renderer reload restored all visible animals/props, with five natural scenery templates, no pending source loads, one fire effect source and 120,755,526 counted resource bytes. No browser warnings/errors were reported during that reload inspection. Final credit text was verified after restarting the preview server to clear its cached module.

The archive preserves [all meaningful captures, rejected trials and measurements](../../art-direction/studies/2026-10-17-natural-replacements/README.md). Gallery media/links and archive checksums were checked; its `file://` browser preview was blocked by browser policy, so no rendered-gallery layout pass is claimed. The underlying inspector/scene media were inspected directly. The measured pair is a warm reuse check; the clean reload is a resource/readiness check, not a cold-start latency benchmark. The natural scenery bundle is about 17.54 MB uncompressed / 4.22 MB gzip; cold parsing/loading still belongs to the existing initial-load qualification gap. No automated test suite was added, no game save/database was reset, and no paid provider was called.

The wider bear, arbitrary animation/equipment, renderer/backend/device and population gates retain their existing [V3D owners](../maintainers/3d-pixel-art.md). The current task does not waive them or reclassify them as newly delivered.
