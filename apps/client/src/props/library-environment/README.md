# CC0 environment comparison assets

These eight prepared appearance templates are alternatives for existing scenery.
They add no world records, collision, bodies, resources or navigation. The original
procedural scenery remains available. This is an art comparison, not creator
acceptance or a measured population/performance guarantee.

- **Kenney Nature Kit 2.1:** broadleaf, slender tree and shrub geometry.
- **Kenney Survival Kit 2.0:** conifer geometry and its source color atlas.
- **Quaternius Stylized Nature MegaKit Standard:** broadleaf, conifer, slender tree
  and shrub geometry. The actual free archive contains 68 of 116 models. Its
  included `License_Standard.txt` explicitly grants CC0; this records that exact
  archive grant rather than assuming a site-wide license.

The literal source licenses are retained beside `scenery.json`. `provenance.json`
records official source/download URLs, archive hashes, selected model hashes,
triangle counts, original bounds, texture preparation and the final artifact hash.
Quaternius's stable free-download endpoint resolves a temporary CDN download URL;
no purchase or paid request was made. All three source archives remain outside Git.

## Preparation

From the repository root, using Python with Pillow and the pinned pnpm formatter:

```sh
python3 scripts/prepare-library-environment.py \
  --nature /absolute/path/kenney_nature-kit.zip \
  --survival /absolute/path/kenney_survival-kit.zip \
  --quaternius /absolute/path/quaternius_stylized-nature-megakit-standard.zip \
  --output apps/client/src/props/library-environment
```

The recipe accepts only the recorded archives and selected static triangle models.
It preserves source topology, texture coordinates and authored normals, applies
node translations and fits each appearance to centered width/depth at most one and
bottom-anchored height one. The existing caller supplies its unchanged envelope.
The inverse-transpose normal adjustment follows that normalization. Source normal
maps and metallic response are omitted for this controlled material comparison.

## Data contract

`variants.kenney` and `variants.quaternius` contain `tree-broadleaf`,
`tree-conifer`, `tree-birch` and `woodland-shrub`. Every appearance has
`bounds: { min: [x,y,z], max: [x,y,z] }` and material-separated `parts` with flat
`positions`, `normals`, `uvs`, float RGBA `colors`, `indices` and a `material` ID.
The birch alternative uses a slender common-tree structure; pale painted bark is
an explicit artistic approximation, not a botanical birch asset.

Materials provide linear `baseColor`, `doubleSided`, `alphaCutoff` and optional
`texture`/`paintedTexture` IDs. Each shared texture has `width`, `height` and byte
`rgba` arrays, at most 128×128. Texture RGB is sRGB. UVs retain glTF's top-left
origin exactly; rows run top-to-bottom. Upload with `flipY: false`, and use that
same row convention for alpha-aware pointer checks.

Source-color and optional painted RGB maps are separate. Their alpha bytes are
identical: alpha is filtered independently and its area above the original cutoff
is preserved within the recorded error. Painted leaf plates, bark strips and pale
birch marks are connected authored regions with quiet areas; no per-frame or
per-texel random noise is introduced. Fine leaves, shadow edges and distance
filtering still require the actual moving-camera comparison.
