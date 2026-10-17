# Nature pixel-art study

**Current art target:** beautiful dimensional pixel art with believable proportions; visibly low-poly, blocky, cutesy and big-head/small-body designs are excluded by the [current visual requirements](../../../../../../art-direction/decisions.md#current-visual-requirements--october-16-2026). Retained source assets, alternatives and their credits document the study; their presence is not style approval. This preference update does not replace assets or alter their licenses.

Twelve original, static Blender assets provide three retained geometry/paint
alternatives each for rock, broadleaf, conifer and berry bush. These are authored
study appearances, not new world objects, physical geometry or gameplay rules.
All geometry and paint here are first-party **AGPL-3.0-only**; no downloaded mesh,
texture or third-party reference artwork was copied into this set. The earlier
procedural and licensed-library assets remain separate and preserved.

## Reproduce

From the repository root, with Blender 5.2.2 LTS:

```sh
PYTHONDONTWRITEBYTECODE=1 /Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --disable-autoexec --offline-mode --threads 4 \
  --python-exit-code 1 --python scripts/prepare-study-nature.py
```

The [authoring script](../../../../../../scripts/prepare-study-nature.py) uses the
shared offline exporter. It writes these GLBs/PNGs and `catalog.json`, plus the
packed, editable [nature.blend](../../../../../../art-direction/assets/representative-study/nature.blend).
Exports are in metres at the origin, with ground height zero. Blender Z-up,
front −Y becomes glTF Y-up, front +Z. Only the editable source display is spaced
into rows after export. The catalog records source/script/GLB hashes, bounds,
source geometry counts, paint density and working recommendations.

For the small CPU preview, append
`-- --draft --render /private/tmp/openlegend-nature-draft.png`. This writes only
the three natural draft subjects and replaces the source/catalog, so run the
complete command again to restore all twelve. Rendering uses four CPU threads;
it does not request GPU rendering or a provider. On this Mac, sandboxed Blender
startup failed during Metal-device detection; the successful local runs required
the authorized unsandboxed invocation. No paid call was made.

## Designs and working choices

- **Natural:** a single worn rock, full asymmetric broadleaf boughs, fuller
  evergreen sprays and a rooted berry bush. Connected shaded leaf fields leave
  quiet areas between brighter leaf-pair groups.
- **Graphic:** paired rock forms, more angular interlocking crowns, flatter
  evergreen sprays and a three-cane bush. Stronger stepped accents expose the
  alternative construction rather than merely tinting the natural geometry.
- **Open:** layered stone, fewer separated broadleaf/evergreen groups and a
  spreading bush with exposed canes. Pale bark and larger gaps provide a lighter
  silhouette.

After inspecting all three actual browser GLBs per family and the early/revised
CPU drafts, the working choices remain:

- `rock-natural`: the single worn silhouette is clearer than the paired cluster
  and less stack-like than the layered stone.
- `broadleaf-natural`: its asymmetric, fuller crown reads as one tree; the other
  options expose more separate plates. This better balances fullness and quiet
  areas, although the rounded bough construction remains visible.
- `conifer-open`: fewer separated sprays expose branches and preserve the
  evergreen silhouette with less overlap than the fuller alternative.
- `berry-bush-natural`: four fruit groups remain readable within a full bush;
  the open alternative resembles separate leaves on canes more strongly.

These are autonomous study selections, not Mike's final art approval. They follow
the [creative brief](../../../../../../art-direction/final-board/creative-brief.md):
organic readable groups, deliberately placed material detail and quiet areas.

## Materials and geometry

Foliage is closed shaped geometry with branch gaps. There are no tiny leaf cards
or alpha holes. Explicit, connected palette cells describe leaf pairs, bark
grain, stone planes/fissures and clustered berries; there is no random texture
noise or screen-space pixelation. All source alpha is 255. Fixed planar UVs are
authored once at 24 painted pixels/metre for natural/open foliage, 28 for graphic
foliage, 48 for bark/stone and 96 for the small fruit. Each variant retains three
64² atlases and one 16² berry atlas. GLBs request nearest magnification and
trilinear mip minification, separately from the source artwork.

| Family     | Variant | Triangles | Runtime vertices | Height, m | GLB bytes |
| ---------- | ------- | --------- | ---------------- | --------- | --------- |
| Rock       | Natural | 68        | 126              | 0.6395    | 6,820     |
| Rock       | Graphic | 136       | 252              | 0.5947    | 11,264    |
| Rock       | Open    | 204       | 378              | 0.5849    | 15,700    |
| Broadleaf  | Natural | 1,630     | 1,514            | 4.0682    | 63,592    |
| Broadleaf  | Graphic | 1,390     | 1,291            | 4.2035    | 55,036    |
| Broadleaf  | Open    | 1,344     | 1,258            | 4.1520    | 53,660    |
| Conifer    | Natural | 4,414     | 4,018            | 4.1279    | 160,436   |
| Conifer    | Graphic | 3,694     | 3,322            | 4.1279    | 133,864   |
| Conifer    | Open    | 3,592     | 3,245            | 4.1279    | 130,748   |
| Berry bush | Natural | 2,200     | 1,958            | 1.0041    | 82,680    |
| Berry bush | Graphic | 1,506     | 1,330            | 0.9860    | 58,436    |
| Berry bush | Open    | 1,650     | 1,469            | 0.9929    | 63,708    |

Runtime vertex counts include UV/normal splits and differ from the editable
source counts in the catalog. Each GLB has one mesh with one material part for
rock, two for either tree and three for a bush; shadow/other passes can draw
those parts again. The twelve GLBs total **835,944 bytes**, the source Blend
**423,813 bytes**, and the twelve source atlases **150,528 base RGBA bytes**.
These are file/base-image counts, not compressed transfer, decoded heap or GPU
residency estimates.

Static inspection of the actual GLBs confirmed finite positions/normals/UVs,
valid indices, source-matching triangle counts, ground-seated bounds within
0.0000005 m of the catalog, embedded images, the intended samplers and no skin or
animation data. Every retained PNG is fully opaque and preserves its intended
sRGB palette bytes. Catalog hashes match the outputs and authoring files.

## Limits

Rounded foliage masses and stepped conifer tiers remain simplified and visible;
paint can still read as patches at some distances. The layered rock comparison
is deliberately stack-like. Planar UV seams and repeating paint can be visible.
Fixed paint does not make rasterized silhouette, shadow or texture edges
immutable under camera movement. This set supplies useful alternatives and
actual source files; it does not establish zero shimmer, final art acceptance,
animation coverage or production scene/population performance.
