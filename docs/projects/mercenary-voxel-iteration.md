# Mercenary — authored voxel iteration

| Status      | Current progress                                                                                        | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | A new fixed-block mercenary is being authored and integrated while the earlier model remains available. | 2026-10-14   |

## Authorized outcome and owners

Mike rejected the earlier mercenary's small displayed size, camera-dependent pixels, unreadable face and clothing/body intersections. Create a new iteration; retain the original GLB, renderer and editable study. This is one bundled art revision, not approval for the general generated-appearance pipeline. [MER06](../maintainers/art/mercenary.md) and [V3D01](../maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision) own art progress and remaining style acceptance.

The authoring script and editable Blender source own permanent block placement/color. A separate trusted GLB supplies rigid articulated parts. The client representation owns loading, poses, lighting, shadows, selection/reveal and disposal. The existing scoped `mercenary-model` appearance selects the new iteration without changing the character's identity, native body, world rules, saves or equipment. [World presentation](../world-presentation.md#animated-character-pixels) owns delivered presentation behavior.

## Approach, risk and decisions

Estimated 500–800 changed logic lines excluding tests, primarily authoring and client representation. Moderate art/animation/lifecycle risk; no new authorization, storage or provider boundary. Author intentionally placed cubic cells with a fixed 0.025 m edge and approximately 2.1 m overall height, matching the other living characters' authored artwork height. Preserve adult proportions and the original bearded face, dark hair, mail, quilted/leather layers, wraps and rust-red/gold cape. Eyes, brows, nose, mouth/beard and embroidery are explicit colored blocks rather than detail inferred by lowering image resolution.

Only exposed cell faces are exported, grouped by rigid moving part with one opaque vertex-color material. No per-cell scene objects, camera-dependent reconstruction, texture sampling, screen-image pixelation or geometry level changes on zoom. Garments occupy solid cells; covered skin is absent. Overlapping cuffs and designed motion limits cover articulated joints. The cape has real thickness and clearance; bounded rigid movement replaces thin simulated fabric for this iteration. Tradeoff: folds do not behave as freely flowing cloth. The earlier simulation is preserved as the comparison asset.

## Complete implementation plan

1. Inspect previous art/rendering, retain old inputs, and refresh the development base. Base selected from the verified repository default: `https://github.com/Macrofold/OpenLegend.git`, `origin/main@57a2977e22bab3f7293caa4a176c9ef4ba800751`.
2. Author the new voxel geometry, face and garment colors, inspect front/back/profile, export editable Blender plus standalone GLB and reproducible source/provenance. No Meshy or image-provider calls are needed.
3. Integrate through the existing mercenary appearance. Load the trusted asset once per scene, share geometry/materials, animate rigid limbs from permitted movement, and retain sprite fallback for loading/failure/unsupported poses. Reuse existing character depth/stencil, reveal, selection and shadows. Dispose actor bindings before shared resources and fence late loads.
4. Verify the actual browser scene at ordinary and close zoom, paused orbit, perspective/orthographic projection, walking/stopping, daylight/firelight, selection/occlusion, sprite fallback and teardown/recreation. Confirm geometry/color counts remain invariant under camera changes. Use a disposable native world or public-view scenario without private saves/provider calls. Run relevant existing camera checks where feasible, TypeScript, production build and changed-file formatting; inspect the whole diff and fix in-scope findings.
5. Reconcile current behavior, asset limits, art tracker and actual evidence. Commit completed changes locally; do not push or merge. Broader style approval, arbitrary pose/equipment families and crowd/device qualification remain with their existing owners.

## Performance and completion

Cost grows with rendered characters × exposed faces/rigid parts × lights/shadow/reveal passes. Authoring removes hidden cell faces once; GLB decoding and immutable material/geometry preparation are shared per scene. Actor changes update only a fixed set of part transforms; camera motion never invalidates or rebuilds the model. Entity replacement/disposal invalidates only that actor; scene destruction releases shared resources. Measure asset vertices/triangles/parts, load time and matched browser frame/draw/resource counters through the actual renderer; distinguish software-backend evidence from hardware performance claims.

Completion requires the new visible game model, preserved prior model, readable authored face, invariant blocks under zoom/orbit, representative garment coverage, verified lifecycle/fallback, accurate documentation, full affected-diff review and local commits. Mike's final aesthetic acceptance remains explicit rather than inferred from developer visual checks.
