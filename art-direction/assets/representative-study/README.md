# Representative Blender study

**Current art target:** beautiful dimensional pixel art with believable proportions; visibly low-poly, blocky, cutesy and big-head/small-body designs are excluded by the [current visual requirements](../../decisions.md#current-visual-requirements--october-16-2026). Retained source assets, alternatives and their credits document the study; their presence is not style approval. This preference update does not replace assets or alter their licenses.

**Artwork rejected October 16, 2026.** Retained for comparison and source history; the [comprehensive replacement strategy](../../../docs/projects/3d-pixel-art-first-scene-plan.md#proposed-replacement-study--october-16-2026) owns the next art work. The technical export and inspector observations below do not establish artistic acceptance.

Thirty original static GLBs, three alternatives in each of ten families, accompany these three editable Blender files. The [study report](../../../docs/verification/representative-art-study.md) records working selections, actual visual revisions, checks and limits. Existing game assets and earlier trials remain preserved.

Open `/art-study.html` on the development/game host, or run the standalone client preview from the repository root:

```sh
pnpm exec vite --config apps/client/vite.config.ts --host 127.0.0.1 --port 5174
```

Then visit `http://127.0.0.1:5174/art-study.html`. The study needs no database, world save, Meshy account or paid provider. The game’s developer art panel also links to it. Compare three choices or the working selection, orbit with a drag or arrow keys, zoom with the wheel/buttons, and switch lighting, projection and whole-body/detail/closer-scale/game-camera framing. Game camera uses the ordinary game defaults; Closer scale preserves the enlarged art comparison. The selected people remain close-view proposals: their faces are not reliably readable at the current default game scale. Static views render on demand; turntable motion is opt-in and respects reduced motion. Each asset card downloads the GLB and its editable Blender source.

## Reproduce

Blender 5.2.2 authored these files. From the repository root, run each group separately, replacing `nature` with `objects` or `people`:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --offline-mode --threads 4 --python-exit-code 1 --python scripts/prepare-study-nature.py
```

The scripts construct original geometry and explicitly painted palette cells. They write embedded-texture GLBs, separate source PNGs and a catalog under `apps/client/src/props/art-study/<group>/`, plus the editable group `.blend` here. The common export helper joins temporary evaluated copies for runtime efficiency while retaining independently editable source pieces. Catalogs record exact source, script and GLB hashes, bounds, evaluated triangle counts, texture sizes and recommendations. Run changed-file Prettier on catalogs after regeneration; formatting does not alter the recorded asset hashes. Native Blender output uses metres and the export converts to glTF Y-up.

All three sources and their new geometry/paint are original OpenLegend contributions under **AGPL-3.0-only**. No reference-game artwork, original mercenary geometry or downloaded CC0 model is embedded in this study. The previously downloaded library sources retain their own licenses elsewhere.

These are comparative visual assets: people are static poses, armor is a visual outfit, and chests have closed lids. They do not add animations, equipped-item attachment, opening mechanics, collision bodies or cloth simulation. Fixed texture cells remain attached to the surfaces; mip filtering reduces distant aliasing, and normal screen coverage can still change at moving silhouettes. Human art approval and wider-device stability remain separate from successful export.
