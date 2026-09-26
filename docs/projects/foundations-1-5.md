# Foundation priorities 1–5 — design delivery map

**Design status:** all five feature/technical pairs and their implementation decompositions are drafted. They are proposed designs for review, not runtime delivery or implementation approval. **Branch:** `docs/foundations-priorities-1-5`, created directly from main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` on September 26, 2026. No active feature branch was merged or modified by this task; main is unchanged by these documentation commits.

**Scope:** comprehensive design and implementation planning for priorities 1–5 in [remaining foundational work](../maintainers/remaining-foundational-work.md). No runtime implementation, storage migration, permission change, paid execution or release-gate closure is part of this delivery. Existing cross-project contracts continue to own accepted behavior; focused trackers own all implementation status.

## Five separately usable projects

| Priority / project | Feature specification | Technical design | Detailed work and parent ownership |
| --- | --- | --- | --- |
| 1 — Shared state and contributions | [Behavior and acceptance](shared-state-contributions-feature-spec.md) | [Owners, claims, phases and lifecycle](shared-state-contributions-tech-design.md) | [SC01–SC08](../maintainers/state-contributions.md), refining EWF02–03 / INV-6.3; SL00 integration |
| 2 — Multiplayer authority | [Two-human and absence journeys](multiplayer-authority-feature-spec.md) | [Principals, control, private views and recovery](multiplayer-authority-tech-design.md) | [MP01.1–MP01.6 / MP04.1–MP04.4](../maintainers/multiplayer.md#priority-2-implementation-slices); BW13/BW14 and data/control owners |
| 3 — Persistent objects | [Tools, lots, bags and ownership](persistent-objects-feature-spec.md) | [Identity, placement, transactions and migration](persistent-objects-tech-design.md) | [PO01–PO09](../maintainers/persistent-objects.md), refining DF01/BW07; INV-6 / SL00 |
| 4 — Dependencies and work budgets | [Correct updates and bounded interactions](dependency-invalidation-feature-spec.md) | [Membership, generations and aggregate accounting](dependency-invalidation-tech-design.md) | [DI01–DI08](../maintainers/dependency-invalidation.md), refining EWF08; EPR/SW actual query/scheduling owners and PF |
| 5 — Appraisal and social continuity | [Persistent feelings and directional notes](appraisal-social-continuity-feature-spec.md) | [Causes, accepted publication, privacy and persistence](appraisal-social-continuity-tech-design.md) | [ACT07.1–ACT07.7 / ACT08.1–ACT08.4](../maintainers/actor-model.md#priority-5-implementation-slices); CR, EPR04, EWF and SL00 |

There are 46 detailed implementation/qualification slices across these owners; their individual checkboxes remain open. Child IDs are scoped to their linked tracker. In particular, state-contributions/SC01–SC08 does not replace similarly prefixed research work on another branch. Parent EWF/INV/DF/BW/MP/ACT gates retain their additional scope and existing completion history.

Each pair includes player/NPC/creator scenarios, current-source baseline, inherited policy, scope/non-goals, semantic owner map, typed operations and failure results, identity/revision/authority, lifecycle, canonical records and in-place migration, privacy, bounded work, implementation sequence, concrete acceptance evidence, alternatives and consequential choices. Work item bodies are not duplicated here.

## Source and branch research ledger

| Source inspected | How it informed the design / limit of the inspection |
| --- | --- |
| Root/path instructions; design, documentation, verification, performance and AI guidance | Paired project files, single semantic owners, explicit proposals, native verification/spending boundaries and preservation of existing work. |
| Remaining-foundations index; EWF, MP, ACT, production-data, base-world and invention trackers | Exact priority/scope and current parent ownership. Historical branch coverage remains historical, not a fresh all-branch audit. |
| Engine/world boundaries; world-module runtime; production records and delivery/scale; memory/knowledge; item and lifecycle contracts | Shared integrity versus world law, exact pins, current canonical records, privacy, save/in-place upgrades and accepted product behavior. |
| Main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041` selected native/application callers | `world-modules.ts`, native needs, item handling, knowledge/social/mind, WorldService/view, ActorWork, cognition maintenance, store/WorldRecords and record schema. Each design identifies the actual seam it extends; this was not a full repository code audit or runtime qualification. |
| Invention continuation `271ac5738a1afe5dca0f53b2dc1a89a5e7c11b93` | Refreshed head and current detailed invention tracker: existing workflow/drafts/receipts/authority must be reconciled through DF02, not recreated. No branch merge or complete implementation review was performed. |
| Hearing continuation `c4379246b8db98974de319e1f5315439ac8176bd` | Refreshed head and EPR tracker: occurrence-time scope, one intake, dirty-generation acknowledgment and evidence before paid admission retain their owners. |
| Cadence `edc6980f7634bf4088c259cb4dfd61f03bbb9ce9` | Refreshed head only. Detailed cadence/action/spatial reconciliation remains DF02 before overlapping implementation; no combined-capacity claim follows. |
| Primary external mechanism references in the technical designs | PostgreSQL constraints/locking, SQLite references, OIDC/OAuth/session/authorization guidance and named incremental computation. These support implementation mechanisms, not new gameplay policy or measured OpenLegend performance. |

Current code exposed concrete gaps that the plans address: single `local-player` and service-scoped views; definition-only item merging; separate current item/spatial representation requiring an explicit conversion; dirty-Boolean completion instead of generation acknowledgment; and native fear/discomfort with fixed decay, strongest-16 truncation and no stable appraisal `id`. Describing a gap does not establish a reproduced runtime bug or a passing fix.

## Cross-project implementation order

1. **Refresh the actual implementation base and reconcile overlapping code through DF02.** Preserve current main record/query/privacy work, relevant invention/hearing/action/cadence changes and exact admission/receipt behavior. This design branch does not authorize blindly merging those branches. Resolve genuine semantic conflicts before coding the affected slice.
2. **Establish the smallest contribution and authority contracts first.** SC01–SC04 make ownership/claims usable through current native consumers. MP01 can prove two humans against those or current finite resources; it does not wait for a complete nested-object system. Carry explicit scope and semantic change keys from each introducing slice.
3. **Build object identity and containment through the real tool/bag consumer.** PO uses the stable P1 claim boundary and P2 authority. Its canonical migration replaces current item/placement ownership in place; it does not redefine resource arithmetic or create a second inventory service.
4. **Introduce dependency metadata early; qualify it with concrete consumers.** DI01–DI03 may proceed alongside earlier projects. Conservative current invalidation remains until precise membership coverage is proved. DI04–DI07 integrate actual P1/P3/SW/EPR owners; EPR05 remains the scheduler implementation. Avoid circularly requiring the full P4 framework before those first consumers exist.
5. **Deliver appraisal and social continuity over current native/CR owners.** Basic ACT07 persistence and ACT08 subject-note views can proceed with existing change hooks. Advanced context/reflection uses the current publication boundary and later precise invalidation; neither live inference nor a universal emotion taxonomy is a prerequisite for native continuity.
6. **Join SL00 in every durable-state slice, then qualify combined behavior.** Register capture, current-record completeness, references, rebuilds, stale callbacks, privacy and non-rewindable authority/accounting as state is introduced. Individual fixture success does not replace the combined native/database/client failure scenarios or PF/D5 workload evidence.

## Explicit proposed engineering choices

| Concern | Proposed choice / boundary |
| --- | --- |
| Shared effects | Preserve current sequential native outcomes, then introduce explicit named compositional phases. Atomic resource groups by default; partial fulfillment only when advertised. Removing an effect never rolls back unrelated history. |
| Multiplayer | External standards-based authentication adapter and server sessions; explicit control takeover; one active embodiment/account/world in the v1 application policy; current scope at admission, commit and publication. No distributed service prerequisite. |
| Object model | Entity-backed lots, one tagged placement, individual equipment/containers, exact merge compatibility and historical lineage without actionable redirects. First bag uses authored packing load, not a new global encumbrance/physics model. |
| Dependencies | Mandatory query membership, old/new spatial coverage, revision-bound subscription/dirty acknowledgment and root-lineage aggregate budgets. Incomplete work is not absence; mandatory effects are never silently truncated. |
| Mental/social state | Extend the existing native appraisal owner; newly persistent state has no implicit decay. Relationship text remains directional subject knowledge. Typed optional reflection changes, not prose parsing, affect mechanical state. |
| Migration and privacy | Current identity-preserving in-place updates override older reset/no-migration prose. Current grants, control generations, forgetting and external accounting survive rewind; historical scope never becomes current permission. |

These are proposed implementation choices with rationale and alternatives in the relevant technical document. Future implementation approval should be recorded without turning this package into a second canonical policy store. Reconcile any changed accepted behavior into its proper owner as it is implemented—for example, the equipped-unit refinement in the base-world item contract.

## Decisions not required to block this package

No unresolved user decision was identified that prevents these five foundation designs. Existing residual choices remain with their owners: D03 numerical session/exit tuning; BW14/D07 human combat, indirect harm and recovery/property details; hosting identity-provider/domain and operational/security qualification; arbitrary G2 execution or regional distribution; and optional world-specific emotion vocabulary, physical encumbrance or legal ownership rules.

Do not silently resolve those future policies to make a foundation appear complete. A genuinely lossy populated-state conversion, unsupported source/lifecycle transition or unresolved cross-branch semantic conflict discovered during implementation must be surfaced before applying it.

## Review and verification boundary

The delivery review covers all five pairs, their cross-references, owner hierarchy, meaningful failure/lifecycle cases and preservation of pre-existing task statuses. Navigation is provided from the remaining-foundations and maintainer indexes. Significant documentation history records this as design work only.

No game/runtime code, storage or live permissions were changed. No automated suite, build, benchmark, provider call, two-human deployment or live characterization evaluation was run by this documentation task. Native/SQL/browser/hosted evidence remains explicitly assigned to the linked implementation slices and existing CI/release gates. Future implementers must refresh source heads and perform those checks rather than treating this packet as execution evidence.
