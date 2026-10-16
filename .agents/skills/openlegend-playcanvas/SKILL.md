---
name: openlegend-playcanvas
description: >-
  Author, integrate or review OpenLegend scene assets, offline 3D export/inspection tools, PlayCanvas
  rendering, cameras, picking or resource lifecycles; not prose mentions or ordinary React-only UI.
---

# Preserve the renderer boundary

For renderer integration, start with [WorldRenderer](../../../apps/client/src/world-renderer.ts), the relevant [scene implementation](../../../apps/client/src/scene.ts), pure camera controller and [spatial contract](../../../docs/spatial-world.md). For asset authoring/export or inspection, start with the actual authoring/export/import owners, applicable [world presentation](../../../docs/world-presentation.md) sections and the selected world's accepted art criteria ([bundled-world decisions](../../../art-direction/decisions.md)); do not preload the research archive. Consult the installed PlayCanvas version's official API when using it; this is a code-based engine integration, not an instruction to adopt Editor-specific workflows or a new rendering framework.

For new or changed asset data, check the final runtime export or reimport as well as the editable source: consumer units/scale, intended anchor, bounds, UV/image attachment and outward surfaces. Double-sided shading can conceal invalid face winding. For artwork or preview changes, judge proportions, pixel density and facial readability at the actual gameplay camera, framebuffer and sampling beside existing subjects. Reuse camera defaults and label enlarged inspection views distinctly. Fit previews using the current camera orientation/projection and depth, rather than world-axis dimensions alone.

Before changing floor focus, level visibility or cutaways, read [Levels and cutaways](../../../docs/spatial-world.md#levels-and-cutaways); for picking or submitted destinations, read [Picking and controls](../../../docs/spatial-world.md#picking-and-controls). Use actual support surfaces and geometry, including raised, sloping and stacked surfaces, rather than treating a level's nominal camera height as its physical floor. These presentation contracts apply even when physical execution is unchanged.

React/gameplay exchange public DTOs, intentions and plain camera state. Keep PlayCanvas objects in the renderer. Picking identifies a target; the server validates the actual action. Preserve XYZ/support identity and coordinate conversions. Cutaways, appearance, interpolation and camera changes affect presentation, not physical authority or actor knowledge.

Make creation, replacement and destruction explicit for scene nodes, textures, materials, meshes, listeners, observers and pending loads. Reuse existing caches/reference ownership and reject late results for destroyed or superseded scenes. A cache hit must not preserve obsolete assets or private data. Distinguish requesting destruction from completion of deferred cleanup; verify surviving replacements after cleanup finishes.

Keep hot loops allocation-light with reused scratch objects where justified. Avoid full scene/asset rebuilds for local or camera-only changes and avoid React updates for unchanged per-frame values. For static inspection views, invalidate rendering on actual visual changes and measure rendered frames separately from application update ticks. Profile CPU, GPU, draws and asset work before adding pooling/batching.

Exercise the changed interaction in a real browser: camera projection/rotation/zoom as relevant, surface picking, drag-versus-click behavior, pause/state changes and teardown/recreation. After browser history restoration, verify the rendered result as well as restored controls. Check focus/keyboard and narrow/reduced-motion behavior where UI is affected. Record visual/runtime limits honestly under [verification](../../rules/verification.md); a build does not verify graphics behavior. Reference artwork is not permission to ship an asset.
