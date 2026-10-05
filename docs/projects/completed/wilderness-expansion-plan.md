# A larger, fuller starting wilderness

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Expanded content, procedural artwork, native/persistence/browser checks and affected-diff review are finished. | 2026-10-04   |

## Scope and decisions

Expand the default starting world from 28×24 to about five times its area, so ordinary camera framing shows a place within the wilderness rather than the entire map. Replace the conspicuous rectangular clearing edge with a softly joined forest floor and uneven forest perimeter. Retain finite engine extents; infinite streaming would be a new mechanic outside this request. Preserve the camp/lookout and their ordinary interactions, add scattered resource patches and rocks, vary elevation with existing connected planar supports, and place more hares/deer plus wolves and bears farther from camp.

All placement, population, density and terrain tuning belongs to `packages/domain/src/worlds/base/`. Wolves and bears reuse native animal movement/injury/death and existing quadruped clearance; this does not introduce predation or aggression. Sprite assets use the same original procedural Canvas method as existing scenery and animals, not the mercenary model or external/reference art. Existing saved worlds are not reseeded or reset.

Estimated affected logic: 600–900 lines. Risk is moderate: public static scenery crosses saved geometry and renderer ownership; new ground patches must remain traversable and agree with images. No provider calls or new dependencies are needed. Additional Jev cost and task total are $0.

## Implementation and ownership

1. Continue the existing unpublished branch in `/Users/mzw/.codex/worktrees/54e5/OpenLegend`, reconciled with exact local `main` `84bb148d72ab4378067018d1e34b51a05bc88878`. Preserve the earlier feedback/lifecycle work. The main checkout receives no edits.
2. Add a narrow public static-scenery description to spatial layout: trusted appearance key, stable identity, seed, position and size. It grants no collision, action or hidden information. Validate current finite data once, carry it through existing saved geometry and public projection, and keep native physical surfaces/blockers separate.
3. Author larger terrain, connected low rises, irregular river/forest margins, varied trees, boulders, shrubs, material/food patches and wildlife in the bundled world. Reuse existing finite body and resource families. Preserve stable starting camp placements and paths.
4. Render actual ground surfaces with coherent world-space texture coordinates. Blend the perimeter into matching surrounding terrain. Consume declared scenery; reuse shared art/materials and batch decorative cards, with explicit resource cleanup and no per-tree React work. Add original wolf/bear and tree-shape artwork.
5. Verify generated worlds, current-format validation/JSON and PostgreSQL restoration, an actual route across the rise, ordinary gathering and wildlife lifecycle. Use selected existing checks, TypeScript, production/configuration and targeted formatting. Inspect the world through actual browser movement/camera/zoom, including different tree shapes, remote wildlife, elevated terrain and remembered presentation.
6. Measure the expanded world's native advancement, cold scene preparation and browser rendering with stated setup/limits. Reconcile spatial/presentation/base-world documentation and limits, inspect the complete affected diff, fix in-scope issues, mark the project completed and commit all changes.

## Completion criteria

Every requested kind of content is present in a deterministic new world; the default view cannot contain its extent, there is no conspicuous rectangular clearing border, and elevations match native support/navigation. Ordinary actions, animal movement/body handling and same-format persistence remain coherent. Public scenery is reusable presentation data, not a second physical authority. Actual native/browser checks and bounded cost observations are recorded honestly; no new animal mechanic or infinite-world capability is claimed.

## Completion evidence

[BW24](../../maintainers/base-world.md#bw24--fuller-starting-wilderness) records delivery; [the focused report](../../verification/wilderness-expansion.md) records actual native movement/gathering/body handling, four-seed current-format validation, PostgreSQL close/reopen, browser camera/picking/rebuild/continuation and bounded costs. [World content](../../worlds/base/landscape.md) and [public scenery](../../spatial-world.md#static-scenery) own current behavior and limits. No provider calls were made; additional Jev cost and task total are $0.

The subsequent [completed implementation review](embodied-feedback-review-plan.md) corrected joined-terrain animal movement and overhead feedback correctness/rendering. [Review evidence](../../verification/embodied-feedback.md#implementation-review--october-4-2026) records the fixes and their limits; the original delivered scope remains complete.
