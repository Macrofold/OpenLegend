# Character-art production — design work plan

| Status | Current progress | Last updated |
| --- | --- | --- |
| Blocked | Research, paired design, repertoire mapping and reconciliation are complete; repository-pinned formatting verification remains unrun because the formatter is unavailable. | 2026-11-05 |

## Authorized outcome

Design a practical, economical route from an approved character idea to editable art, correctly deforming and animated exports, and a reviewable OpenLegend game result. This assignment delivers research, feature/technical design, executable artist instructions, repertoire review and affected maintainer reconciliation. It does not produce assets, qualify generators, implement runtime systems, purchase services or change the selected art direction.

Base: GitHub `Macrofold/OpenLegend`, `main` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. Work branch: `design/character-art-workflows-20261031`. No local Git checkout or worktree was created or switched. Repository operations use the GitHub connector; `main` is not a write target. Commit task changes at least every five minutes while they remain uncommitted.

## Scope and ownership

- Preserve the [current visual requirements](../../art-direction/decisions.md#current-visual-requirements--october-16-2026), [creative brief](../../art-direction/final-board/creative-brief.md), existing starting-world content and native gameplay authority.
- Reuse the [production handbook](../production-workflows/README.md), [Standard/Higgsfield flows](../production-workflows/art-flows/README.md), [production-package procedure](../production-workflows/art-flows/production.md) and [asset/animation workflow](../production-workflows/assets-and-animation.md). Detailed production choices and steps have one owner in the [feature specification](character-art-production-feature-spec.md) and [execution guide](character-art-production-tech-design.md).
- The existing [3D feature specification](3d-pixel-art-feature-spec.md), [technical design](3d-pixel-art-tech-design.md), [appearance families](3d-pixel-art-appearance-families.md), [V3D tracker](../maintainers/3d-pixel-art.md) and [asset storage](game-asset-storage-feature-spec.md) retain runtime, family, acceptance and publication ownership. No second generator service, asset database, animation authority or general orchestration system is designed.
- The [repertoire application review](../research/character-art-production/repertoire-review.md) covers all 28 catalogue areas and four proposed world families through their introductions, ownership, domain maps and directly relevant examples. It is not a line-by-line audit of every entry. Existing content already supplies useful breadth, so no additional catalogue entries, numerical priorities, counts or world canon are necessary.

## Delivered decisions and records

The paired design distinguishes generation/editing boundaries, deformation boundaries and genuinely removable game equipment. It selects direct refinement when adequate, local reconstruction for actual failures, and high-detail baking only for visible or production value. Rough fit and motion precede expensive dependent polish. A functional prototype serves early gameplay questions; polished work continues from the same retained source without lowering rights, required state coverage or export correctness.

The execution guide supplies vocabulary, roles, source/rights preparation, coverage sheets, part fitting, geometry repair, rough rigging, UV/material/face work, complete-action animation, optional secondary movement, actual export/reimport, conditional game integration, useful revision, a worked face repair, dependency checks and preservation. It separates required passes, measurements, human judgment and unavailable capabilities. Existing runtime contracts remain linked rather than redefined.

The [source study](../research/character-art-production/README.md) records the supplied transcript and professional/tool documentation with access and evidence limits. It retains the video's manual finishing, approximate timing, commercial context and high-detail alternative, without selecting a vendor or promising economical populations. Appearance can suggest character without disclosing a private mind; deliberate concealment and adopted transformations remain compatible with the readability goal.

[CAP00](../maintainers/art-direction.md#character-production-follow-through) records **Done — designed** for the selected offline decisions. CAP01 remains the unrun production proof. The broader [needs-design disposition](../maintainers/needs-design.md#ai-assisted-game-production-research-and-design-integration) already calls the appearance pipeline designed and retains its implementation/qualification gaps; it is accurate and was not rewritten merely to add a completed umbrella. The [decision history](../changelog/2026/2026-11-02.md#november-5--character-art-production) and project/workflow navigation make this scope discoverable.

## Verification and remaining work

Manual content and new-link/anchor review covers the paired design, source and repertoire records, workflow integration, task dispositions and navigation. The branch-wide comparison against the named base confirms documentation-only changes; the affected existing-file changes preserve unrelated requirements. Review includes the difference between staged art and autonomous behavior, ordinary wear and claimed history, authoring parts and runtime objects, required state coverage and optional polish, and completed design versus unrun delivery.

**Unrun required check:** repository-pinned Prettier `3.6.2` on the changed Markdown files. The environment has no installed copy; the attempted package/CDN retrieval routes were unavailable. No formatter pass, local full-check pass or fully verified merge readiness is claimed. This is a tooling/verification gap, not an unresolved art-design decision. When that check can run, format only task-changed files, inspect any resulting diff and commit the corrections; do not run unrelated game or hosted verification to compensate. File this design-only work plan under the completed-project policy only after its remaining verification is satisfied, repairing incoming links together.

No new automated tests, game startup, GitHub Actions, asset generation or paid calls were run or required for this documentation design. External task spending is $0. Actual production rights, tool output quality, finishing/revision effort, artistic acceptance, runtime family/device performance and player appeal remain unmeasured under CAP01 and their existing owners. Their future execution is not part of this design-only assignment.

## Open decisions

None blocks the selected design. Future production must select the subject and necessary variation, verify exact input/output rights, inspect actual available tools and identify its supported consumer. Changes to the accepted identity, art direction, gameplay behavior, publication permission or spending beyond authorization still require their established owner. These execution inputs are not permission to restart the whole design or silently adopt a provider.
