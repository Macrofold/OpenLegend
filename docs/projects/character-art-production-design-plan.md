# Character-art production — design work plan

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Source research and ownership review are underway; the detailed workflow and documentation reconciliation are not yet complete. | 2026-10-31 |

## Authorized outcome

Design a practical, economical route from an approved character idea to editable art, correctly deforming and animated exports, and a reviewable OpenLegend game result. This assignment delivers research, feature/technical design, executable artist instructions, repertoire review and affected maintainer reconciliation. It does not produce assets, qualify generators, implement runtime systems, purchase services or change the selected art direction.

Base: GitHub `Macrofold/OpenLegend`, `main` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. Work branch: `design/character-art-workflows-20261031`. No local checkout is involved. Commit task changes at least every five minutes while they remain uncommitted.

## Scope and ownership

- Preserve the [current visual requirements](../../art-direction/decisions.md#current-visual-requirements--october-16-2026), [creative brief](../../art-direction/final-board/creative-brief.md), existing starting-world content and native gameplay authority.
- Reuse the [production handbook](../production-workflows/README.md), [Standard/Higgsfield flows](../production-workflows/art-flows/README.md), [production-package procedure](../production-workflows/art-flows/production.md) and [asset/animation workflow](../production-workflows/assets-and-animation.md). Add detailed guidance only where it changes an actual production decision or supplies missing execution instructions.
- The existing [3D feature specification](3d-pixel-art-feature-spec.md), [technical design](3d-pixel-art-tech-design.md), [appearance families](3d-pixel-art-appearance-families.md), [V3D tracker](../maintainers/3d-pixel-art.md) and [asset storage](game-asset-storage-feature-spec.md) retain runtime, family, acceptance and publication ownership. Do not design a second generator service, asset database, animation authority or general orchestration system.
- Review all [repertoire catalogue areas](../repertoires/README.md#catalogue-map), their shared selection guidance and four proposed world families for useful production scenarios and missing visual/acting considerations. Preserve stable IDs, full emotional range, existing priorities and the distinction between proposals and installed world rules. Make only justified changes.

## Work sequence and completion checks

1. Read applicable instructions and relevant current contracts; identify exactly what existing guidance already covers. Record source access limits and distinguish user-transcript claims, primary professional practice, vendor claims and OpenLegend design judgments.
2. Research character design, source construction, targeted generation/repair, materials, deformation, animation, export and game-scale review. Prefer original studio/artist explanations and official technical documentation. Do not translate a tutorial's timing or polygon settings into project promises.
3. Specify production decisions and junior-executable steps: brief and identity, representative sample, part boundaries, source selection, fitting, early motion proof, UV/material work, skinning, animation and interruptions, optional secondary motion, final export/reimport, actual-game acceptance, useful variation, preservation and revision dependencies.
4. Reconcile the feature/technical design and operational guidance without duplicating current runtime contracts. State required passes, measurements, human review, failure recovery, dependencies and remaining empirical choices separately.
5. Map repertoire coverage and selected examples to the workflow. Add only missing useful guidance or examples; do not turn the full catalogue into a mandatory asset list or introduce unselected gameplay mechanics.
6. Update the existing focused maintainer owners, necessary navigation and consequential decision history. Close only fully specified design scope. Leave generation, artistic approval, integration, device/crowd and player evidence open where unperformed.
7. Review all changed content and links, inspect the final diff for lost requirements/duplication, and verify the branch and committed scope. Documentation-only checks do not require game startup, paid calls or GitHub Actions.

## Questions being resolved by the design

- Which separations improve generation/editing, which support deformation, and which correspond to genuinely removable game equipment?
- When does a direct generated mesh suffice, and what specific failure justifies reconstruction or high-detail baking?
- Which character differences support recognition and lived experience without disclosing hidden personality or manufacturing world events?
- What is the smallest complete production proof and meaningful revision that supports reuse, rather than another isolated attractive model?
- What existing design preparation can actually close, and which broader family/runtime qualifications must remain open?

No new consequential owner decision is assumed. Tool/provider selection, output quality, asset rights and runtime costs require the specified execution evidence; they will not be reported as measured by this documentation assignment.
