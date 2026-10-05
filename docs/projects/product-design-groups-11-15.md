# Product designs for groups 11–15

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Research and product design are underway for five groups; no runtime implementation or study operation is authorized by this document. | 2026-10-05 |

## Scope and working baseline

This assignment continues the design queue in [Needs design](../maintainers/needs-design.md), one group at a time. It develops detailed product behavior, scenarios, economics, failure handling and playable delivery stages. The requested scope deliberately stops before technical designs and implementation.

The branch is codex/product-design-groups-11-15-20261005, based on Macrofold/OpenLegend main at d36ec3bd66f9b317748147003cc174f58cfd5642. Earlier groups have separate, unmerged proposal branches; their designs are useful context, not delivered capabilities on this baseline.

The [gameplay priorities](../repertoires/gameplay-priorities.md), [engine/world boundary](../engine-and-world-boundaries.md), [feature documentation rules](../feature-documentation.md) and current root instructions govern every proposal. A feature must lead to a worthwhile experience, reveal its actual consequences, and preserve authority, private information and real spending. The study and story perspective are optional product choices, not prerequisites for a playable adventure.

## Five deliverables

| Queue group | Product behavior owner | Design state |
| --- | --- | --- |
| DG11 — Evidence for a selected well-being objective | [Optional connection study](wellbeing-evidence-feature-spec.md) | Research and drafting |
| DG12 — Create a world and reuse an invention | [Existing world creation specification](world-creation-feature-spec.md) | Current proposal to be read and deepened |
| DG13 — Editable shelter and useful places | [Existing shelter specification](editable-shelters-feature-spec.md) | Current proposal to be read and deepened |
| DG14 — Useful competence and practice | [Existing authored stats specification](authored-stats-feature-spec.md) | Current proposal to be read and deepened |
| DG15 — An optional story perspective | Story perspective specification to follow | Pending |

The three existing feature specifications remain their behavior owners. This overview does not create competing versions or replace their unresolved implementation work. Each design records primary-source research, what the evidence actually supports, what remains an inference, concrete player journeys, graceful failure, finite work and retention choices, and criteria for deciding whether the feature deserves expansion.

## Delivery and review

Finish each group’s product proposal and a critical review before starting the next. Commit unfinished checkpoints honestly whenever task edits approach five minutes without a commit. Reconcile the relevant trackers, limits, queue and navigation in the same task. Preserve historical evidence and completed task entries.

The final review asks whether the game is fun without the proposed system, whether the first stage adds enough value to justify its cost, whether the proposed rewards encourage interesting play or repetitive chores, and whether a smaller complete experience would be better. Delivery order follows real dependencies and player value; numerical queue order is the writing order, not a requirement that every preceding feature ship first.

Verification is documentation review: affected differences, maintained source ownership, internal references, citation accuracy, status and limits consistency, and the repository’s Markdown formatter. No game, load, provider or participant experiment is claimed from writing these documents.

## Maintained records

Implementation tasks remain in the focused trackers linked by each feature. Feature limits remain in the corresponding inventories; this overview adds no runtime or storage limit. [Needs design](../maintainers/needs-design.md) owns the queue and [the maintainer index](../maintainers/README.md) locates actual delivery work.
