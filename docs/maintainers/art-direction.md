# Art direction and study progress

**Latest preference:** follow the [current visual requirements](../../art-direction/decisions.md#current-visual-requirements--october-16-2026): beautiful dimensional pixel art with believable proportions; reject visibly low-poly, blocky, cutesy and big-head/small-body art. Mike praised the latest study’s improvement, then explicitly narrowed source/style selection; that does not close the remaining art or motion acceptance checks.

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

## Active studies

**First-scene direction agreed:** the [focused plan](../projects/3d-pixel-art-first-scene-plan.md) and [V3D01.1–V3D01.12](3d-pixel-art.md#first-scene-delivery-and-experiment-tasks) now define an art revision of the existing starting scene, controlled visual comparisons and authored/generated production proof. Preserve the existing playtest content; add only justified missing demonstration subjects. The October 16 [source-based replacement study](../verification/source-based-starting-study.md) now supplies 41 families with three alternatives, the original mercenary, complete existing-world scene/light comparisons and measured moving review. Working rendering choices are implemented; creator acceptance and the documented visual/initial-load limits remain open. Prior MER/scene experiments retain their separate historical evidence. The [October 17 detail/atmosphere increment](../verification/small-subject-art-and-atmosphere.md) expands the collection to 45 families, adopts finer small-subject pixels and a Poly Haven chest, preserves all recoverable captures, and leaves bear acquisition explicitly pending.

**Reference research completed October 14:** [Dimensional pixel-art research](../../art-direction/research/3d-pixel-worlds/README.md) includes 34 locally saved images, source evidence, rendering explanations and generative-workflow implications. Garbage Country and The Last Night strengthen the environment/finish targets; EthrA's environment is liked with richer characters requested. The [decision record](../../art-direction/decisions.md#dimensional-pixel-art-references--october-14-2026) separates confirmed preferences from proposed techniques. The [realtime follow-up](../../art-direction/research/3d-pixel-worlds/realtime-pixel-rendering.md) adds t3ssel8r’s endorsed character, lighting/grass/VFX techniques, texel stability, animation/tool research, all supplied video links and the additional transcripts. The proposed first comparison now uses designed realtime pixel shading; painted surface detail remains available. This research does not close a study's visual approval or V3D01's moving comparison.

| Study             | Progress owner                       | Current state                                                                              | Next art decision                                                                                                                              |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Peacock mercenary | [Mercenary record](art/mercenary.md) | Editable 3D body/cape, idle/walk, simulated cloth, local viewer and game-scene pilot exist | Review moving gameplay-scale readability, cape contact and consistency with the creative brief; final style/production acceptance remains open |

## Maintaining progress

Give each new study one record under `art/` with its intent, source/viewer/Blender links, completed milestones, specific feedback, remaining art decisions and references to technical owners. Do not duplicate the V3D/SW/PF task bodies or treat successful integration as art approval.

Use `<study>/study/` for the active editable work and `<study>/snapshots/<date>-rN/` for immutable milestone packages. For a milestone, record the art revision, matching game commit when integrated, review result and remaining limitations. Update the study record when Mike accepts or rejects an artistic choice; reconcile any broader direction change in the existing creative brief/decision owner. Preserve earlier useful comparisons and provenance.
