# Connected sight and hearing areas

| Status    | Current progress                                                                                       | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | Connected outlines, faint fills, thin lines and short labels passed native, browser and static checks. | 2026-10-03   |

## Scope and decisions

Make the sight boundary continuous around the displayed visible area, add a very faint interior tint to sight and hearing, halve existing line widths, and shorten player labels. Stay on local `main`, preserve unrelated edits and commit only this task. Senses, private information, world rules, camera controls and saved game state are unchanged.

The previous independent contour matching deliberately left gaps. This change replaces it with one bounded sampled surface mesh whose exterior edges provide the outline; fills and outlines therefore describe the same area. Keep native sight/sound classification, public-geometry disclosure, height/support checks, separate visible patches and existing invalidation. Do not connect across blocked or discontinuous support simply to hide a gap. Hearing remains dashed; only the outer area of each sense gets a fill, so nested bands do not accumulate tint.

## Implementation and risks

Approximately 250 changed client logic lines across the field calculation and PlayCanvas presentation. Main risks are filling occluded ground, crossing stacked surfaces, false closure at map edges, extra calculation cost and leaking graphics after disable/replacement.

1. Reuse the current 128-ray/32-step surface samples and eight-step crossing refinement. Clip sampled triangles against each sensory band, reject unsupported/blocked interiors, and derive shared mesh boundary edges instead of matching isolated crossings.
2. Render faint, depth-tested, non-pickable outer fills; use 0.0375m line cores with existing proportional halos. Preserve teardown, scheduled rebuilds and camera-only cache reuse.
3. Replace technical hover explanations with short sight/speech labels. Reconcile the current spatial specification, display limits, maintainer entry and verification report.
4. Review only affected changes, run changed-file formatting, typecheck/build and native geometry scenarios. Inspect actual browser graphics and toggle behavior; measure field build cost against the prior calculation on matching inputs. Keep screenshots/raw data outside Git.

## Completion criteria

Sight outlines are closed around filled patches without crossing blocked interiors; hearing dashes and both faint fills are visible; outlines are half their prior width; labels contain no dot separators or internal display terminology. Hidden geometry and disabled senses still produce no field. Height discontinuities remain excluded, camera motion does not rebuild the field, and disabling clears graphics. Document actual evidence and remaining device/sampling limitations, then commit only task-owned files and archive this plan.

## Delivered evidence and follow-up

[Native/browser measurements](../../verification/perception-overlays.md#connected-outlines-and-faint-fills--october-3-2026) record closure, clipping, visibility, toggle removal and camera cache reuse. Changed-file formatting, typecheck and production build passed. The added changed-pose calculation cost is tracked under [SW09.4b](../../maintainers/spatial-world.md#sw09--camera-rig-controls-and-embodied-view-authorization); sustained-movement and low-end hardware qualification remain separate from this completed display scope.
