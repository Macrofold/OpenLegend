# Character-art production — design scope and repertoire review

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Professional-source research and the existing workflow are being reconciled into executable production guidance; repertoire coverage and final review remain open. | 2026-10-31 |

This is a **design-only assignment**, not asset production or runtime implementation. It records the scope, source-to-design decisions and repertoire review for the refinement of the existing [3D feature specification](3d-pixel-art-feature-spec.md), [technical design](3d-pixel-art-tech-design.md) and [asset/animation workflow](../production-workflows/assets-and-animation.md). Those documents retain product, technical and operational ownership. [V3D](../maintainers/3d-pixel-art.md) retains implementation and qualification. No second character system, asset database or automatic generation service is proposed.

## Assignment and inspected baseline

Mike requested comprehensive research and design following the supplied [character-production video](https://www.youtube.com/watch?v=VeOU0FnTjjc), including step-by-step artist/developer guidance, repertoire review, accurate design dispositions and maintained task coverage. The supplied transcript is the source for the video's stated methods and timings; those statements are not independently measured results.

Repository baseline: `Macrofold/OpenLegend`, `main` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. Working branch: `docs/character-art-production-20261031`. Root instructions were read at that revision. Runtime logic affected: **zero lines**. The meaningful risk is contradictory documentation, loss of established art direction, invented tool support or falsely closing implementation/visual acceptance—not a runtime migration.

## Intended decisions

1. Distinguish parts generated independently, editable source objects and pieces that must remain separate in the game. Choose each boundary for a concrete quality, revision, fit or equipment need.
2. Prefer the least destructive useful route: reuse a compatible source; refine direct generated geometry; repair a local region; reconstruct topology or bake detailed surfaces only when they solve an observed requirement.
3. Start with the intended playable encounter and recognizable identity. Validate shape and rough action early, before costly surface polish or population expansion. Preserve grounded proportions and the existing dimensional pixel-art direction.
4. Specify actual source, fitting, material, rig, animation, export and review handoffs so a junior contributor can diagnose a failure and return to the responsible source rather than regenerate unrelated work.
5. Keep authored appearance, actual equipment/actions and permitted character information distinct. Artwork must not manufacture mechanical success, private knowledge, new anatomy or remembered history.
6. Qualify the complete exported result and a meaningful revision in the intended game context. A provider preview, attractive still, automatic rig or fast generation is not production, performance or enjoyment evidence.

These are the questions being resolved, not claims that their implementation or asset trials have run. Provider selection, numerical production budgets and final art acceptance remain evidence-dependent within their existing owners; the design must explain how to resolve them without inventing universal values.

## Execution and reconciliation plan

| Stage | Work | Completion evidence |
| --- | --- | --- |
| Establish existing ownership | Read the applicable art requirements, production routes, 3D pair/families, focused tracker and needs-design disposition. | Preserve current contracts; identify only missing operational detail. |
| Research professional practice | Use first-party studio explanations, professional artists' own instruction and official authoring/runtime documentation. Separate vendor claims, demonstrated examples and OpenLegend design judgment. | Bounded source record with access limits and a route from each retained finding to guidance. |
| Review repertoires | Review every repertoire domain and world proposal for art-production implications, then inspect relevant concrete examples. | Coverage map, selected useful cases and explicit unchanged/deferred dispositions; no claim of re-verifying every historical source. |
| Complete the design | Refine the existing feature/technical pair and provide one operational home for the detailed character-production recipe. | Inputs, steps, outputs, failure/repair paths, compatibility boundaries, revision dependencies and acceptance are executable without a new workflow platform. |
| Reconcile tracked work | Extend existing V3D/art owners and update any genuinely overlapping design preparation. | Completed design is distinct from unrun art, integration, device and player qualification; unrelated ND umbrellas remain open. |
| Review and finish | Inspect the entire affected diff, verify internal references and conversation coverage, and correct contradictions or duplicate ownership. | All task changes committed on the named branch; honest handoff of design decisions, evidence and remaining execution. |

## Scope boundaries

The selected work does not change the renderer, camera defaults, world laws, character cognition, paid-service choice, existing runtime import contract or source rights. It does not mandate full cloth physics, facial rigs, high-poly baking, a fixed polygon/frame-rate budget or one generated model for every resident. It does not turn fictional repertoire possibilities into a release checklist.

The existing Standard/Higgsfield flow boundaries remain: **study**, **production package**, and explicitly authorized **game integration** are different deliverables. This assignment designs their character-production handoff; it does not execute either paid flow.

## Current remaining work

Professional-source interpretation, the repertoire coverage map, detailed production procedure, affected feature/technical and tracker reconciliation, and final documentation review remain in progress. No paid asset generation, runtime test, population benchmark or human art acceptance has been performed by this assignment.
