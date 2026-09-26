# Foundation priorities 1–5 — design delivery map

**Scope:** documentation and implementation planning only. No runtime implementation, branch integration, permission changes, paid execution or release-gate closure is authorized by this design task. The five priorities come from [remaining foundational work](../maintainers/remaining-foundational-work.md). Base inspected: `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` on September 26, 2026. This branch starts directly from that refreshed main; it does not merge any active feature branch.

## Required deliverables

Each project has a separate feature specification and technical design, following the repository design workflow. These project documents own proposed scope and implementation choices; existing cross-project contracts continue to own accepted behavior. Detailed executable work stays in the focused maintainer trackers, not in this index.

| Priority | Project prefix under `docs/projects/` | Implementation owners |
| --- | --- | --- |
| 1 | `shared-state-contributions` | EWF02–03; INV-6; SL00 |
| 2 | `multiplayer-authority` | MP01/MP04; BW13/BW14; current data/control owners |
| 3 | `persistent-objects` | DF01; BW07; INV-6; SL00 |
| 4 | `dependency-invalidation` | EWF08; native SW/EPR scheduling/query owners; PF |
| 5 | `appraisal-social-continuity` | ACT07/ACT08; CR knowledge/mind publication; EPR04; SL00 |

For every pair complete: real player/NPC/creator scenarios; current-code and related-branch baseline; inherited decisions; scope and non-goals; owner and data-flow map; concrete typed operations and rejection outcomes; identity, revisions and authority; initialization/continuation/cancellation/removal; current-record persistence and in-place upgrades; privacy and permitted inspection; aggregate performance boundaries; two unlike consumers where relevant; staged implementation with linked stable work IDs; manual/native verification and concrete exit criteria; alternatives and unresolved consequential decisions.

## Research and design execution

Read root and applicable path guidance; the documentation/design/performance/AI rules as relevant; current focused trackers and their canonical owners; current implemented call paths and persistence records; and related pushed feature handoffs before prescribing integration. Branch coverage in the foundation index is historical, not current runtime evidence.

Design the five contracts together but deliver independently usable documents. Preserve one writer and semantic owner, exact definition pins, actor-scoped evidence, no automatic paid retries, and distinct gameplay versus external authority. Use current save/load's identity-preserving in-place development upgrades when older prose conflicts. Do not introduce services, arbitrary scripts, generic writable graphs, new universal emotion taxonomies or speculative empty tables.

Resolve routine reversible engineering choices in the designs with reasons. Raise a consequential user choice immediately when it blocks a foundation; do not use unrelated future PvP tuning, hosting vendor selection or emotion taxonomies to block supported core contracts. Clearly identify proposed choices rather than treating this task as implementation approval.

## Completion audit

Before handoff, all ten project files must exist and cross-link their partner and focused work items. Reconcile the foundation index, affected focused trackers and significant documentation history. Review every changed file for contradictions, duplicate authority, lost tasks and implementation claims. Verify relative links/anchors and the remote branch contents. Keep all unimplemented and unverified runtime criteria open. Report the exact delivered commit, files, consequential choices, actual checks and remaining questions.

Design status: research and drafting in progress. Implementation status remains solely in the focused trackers.
