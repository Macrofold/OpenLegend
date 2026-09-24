---
name: openlegend-playcanvas
description: >-
  Modify OpenLegend PlayCanvas rendering, cameras, picking, scene assets or resource lifecycles;
  not ordinary React-only UI.
---

# Preserve the renderer boundary

Start with [WorldRenderer](../../../apps/client/src/world-renderer.ts), the relevant [scene implementation](../../../apps/client/src/scene.ts), pure camera controller and [spatial contract](../../../docs/spatial-world.md). Consult the installed PlayCanvas version's official API; this is a code-based engine integration, not an instruction to adopt Editor-specific workflows or a new rendering framework.

React/gameplay exchange public DTOs, intentions and plain camera state. Keep PlayCanvas objects in the renderer. Picking identifies a target; the server validates the actual action. Preserve XYZ/support identity and coordinate conversions. Cutaways, appearance, interpolation and camera changes affect presentation, not physical authority or actor knowledge.

Make creation, replacement and destruction explicit for scene nodes, textures, materials, meshes, listeners, observers and pending loads. Reuse existing caches/reference ownership and reject late results for destroyed or superseded scenes. A cache hit must not preserve obsolete assets or private data.

Keep hot loops allocation-light with reused scratch objects where justified. Avoid full scene/asset rebuilds for local or camera-only changes and avoid React updates for unchanged per-frame values. Profile CPU, GPU, draws and asset work before adding pooling/batching; use the [performance skill](../openlegend-performance/SKILL.md) for substantial optimization.

Exercise the changed interaction in a real browser: camera projection/rotation/zoom as relevant, surface picking, drag-versus-click behavior, pause/state changes and teardown/recreation. Check focus/keyboard and narrow/reduced-motion behavior where UI is affected. Record visual/runtime limits honestly under [verification](../../rules/verification.md); a build does not verify graphics behavior. Reference artwork is not permission to ship an asset.
