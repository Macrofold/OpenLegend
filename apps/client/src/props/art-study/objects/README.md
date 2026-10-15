# Representative objects study

Original OpenLegend Blender models and hand-authored pixel patterns, licensed
AGPL-3.0-only with the repository. No downloaded model, provider output or
third-party image is used in these objects.

`scripts/prepare-study-objects.py` creates three travel chests, three arming
swords and three wooden shields. The quiet, crafted and graphic alternatives
change construction and silhouette as well as the artwork. The working
recommendation is the crafted chest and sword: readable joints, fitted hardware
and selected bright metal against quieter wood and leather. The quiet round
shield is recommended for its clear, rustic silhouette.

The chest is roughly 0.9 metres wide; the sword is roughly 1 metre long. Every
export stands at ground height zero, uses metres and faces glTF positive Z.
The editable source is
`art-direction/assets/representative-study/objects.blend`. It retains individual
construction pieces, grouped and spaced for inspection. The GLBs contain only
the selected object, with no review floor, lights or camera.

Wood grain is deliberate joined pixel clusters at 32 texels per metre, and iron
uses 64 texels per metre. The narrow sword blade deliberately has a denser fixed
32 × 128 artwork layout so the blade edge, fuller and reflection remain clear.
Camera motion changes neither the artwork nor the geometry. Nearest
magnification preserves the authored cells; filtered minification controls their
coverage at a distance. Small bevels, closed lid sections, blade thickness and
the shield backing are real geometry.

These are visual studies. They add no inventory, equipment, combat, storage or
shield behavior to the game.

Rebuild with the local Blender installation:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --disable-autoexec --python-exit-code 1 --python scripts/prepare-study-objects.py
```

For a small authoring review, add
`-- --draft --render /private/tmp/openlegend-objects-draft.png`. That exports only
the crafted chest and sword; rerun without `--draft` for the full catalog.
For a source comparison of one family, add
`-- --render-family shield --render /private/tmp/openlegend-shields.png`.
Add `--rear` to inspect the back straps, handles and hinges.
