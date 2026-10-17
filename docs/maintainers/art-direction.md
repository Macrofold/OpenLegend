# Art direction and study progress

This tracker is the entry point for visual work, individual studies and Mike's art-review decisions. The [creative brief](../../art-direction/final-board/creative-brief.md), [reference boards](../../art-direction/README.md) and [recorded decisions](../../art-direction/decisions.md) remain the aesthetic owners. A working asset or passing renderer check does not establish final style approval.

## Where the work lives

The active local art workspace is **[OpenLegend-art](/Users/mzw/Documents/ChatGPT/OpenLegend-art/README.md)**, beside the main game checkout under `/Users/mzw/Documents/ChatGPT/`. It contains editable art and dated milestone packages. This is its working location, not a claim that the files have been replicated off-device.

Repository responsibilities:

- `art-direction/`: creative brief, references, feedback and accepted visual decisions.
- `docs/maintainers/art/`: progress and exact source locations for individual art studies.
- [3D pixel-art tracker](3d-pixel-art.md): representation, import, animation/equipment, rendering and pipeline work (V3D01–V3D12).
- [Spatial presentation](spatial-world.md#sw18--world-presentation-delivery) and [performance](performance.md): lighting/depth/reveal correctness and measured runtime qualification.

The absolute source links are intentionally specific to Mike's computer and work across Git worktrees. On another machine, establish the local art location and update these links. A Git checkout does not supply these large editable study files. Only deliberately prepared runtime artifacts enter the game asset directories.

Reference repository documentation by repository-relative path, including from the local art workspace READMEs. Active file locations must use the stable art workspace, never a temporary Codex worktree or visualization directory. Old visualization aliases only preserve earlier links; they are not the source locations to record for future work.

## Reusable production methods

The [production handbook](../production-workflows/README.md) owns reusable development methods: [objects, bodies and animation](../production-workflows/assets-and-animation.md), [scenes, material recipes, lighting and interfaces](../production-workflows/scenes-and-interfaces.md), and [sound, motion and effects](../production-workflows/audio-and-feedback.md). Use a route for a particular study without treating every optional stage as required. Early visual exploration can discover a stronger idea while a rough playable version tests what the player can actually do.

Keep the brief, chosen references, editable source location, relevant tool/model versions, useful export settings and reviewed in-game result together in the existing study record. Record the visual or player-experience reason for the selection and the remaining repair work. For generated or third-party inputs, retain the source and applicable use terms. Large source assets continue to live in the established art workspace; a new asset database is not required by this guidance.

When a body, material, camera treatment or animation changes, identify the exports and views that need checking again. Develop a useful variation before treating a recipe as a production family. A coherent identity and an expressive action can justify the work even when the route does not reduce production time. [V3D](3d-pixel-art.md) continues to own technical family qualification and progressive appearances.

## Active studies

| Study             | Progress owner                       | Current state                                                                              | Next art decision                                                                                                                              |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Peacock mercenary | [Mercenary record](art/mercenary.md) | Editable 3D body/cape, idle/walk, simulated cloth, local viewer and game-scene pilot exist | Review moving gameplay-scale readability, cape contact and consistency with the creative brief; final style/production acceptance remains open |

## Maintaining progress

Give each new study one record under `art/` with its intent, source/viewer/Blender links, completed milestones, specific feedback, remaining art decisions and references to technical owners. Do not duplicate the V3D/SW/PF task bodies or treat successful integration as art approval.

Use `<study>/study/` for the active editable work and `<study>/snapshots/<date>-rN/` for immutable milestone packages. For a milestone, record the art revision, matching game commit when integrated, review result and remaining limitations. Update the study record when Mike accepts or rejects an artistic choice; reconcile any broader direction change in the existing creative brief/decision owner. Preserve earlier useful comparisons and provenance.
