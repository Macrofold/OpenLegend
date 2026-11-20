# Inventory, crafting and building — follow-on delivery

**Design prepared October 14, 2026; implementation not authorized by the design-only request and not started.** This is the single detailed task breakdown for the new cross-surface additions. [Feature specification](../projects/inventory-crafting-building-workflows-feature-spec.md) · [Technical design](../projects/inventory-crafting-building-workflows-tech-design.md) · [Limits](../limits/inventory-crafting-building-workflows.md).

The existing [PW04 inventory](parallel-batch-01-playable-week.md#pw04--inventory-for-exact-camp-tasks), [action/learning](action-experience.md), [PO custody/equipment](persistent-objects.md), [SH shelter](editable-shelters.md) and [UIUX qualification](ui-ux.md) owners retain delivered scope, old task IDs and broader open acceptance. Parent design references are [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) and [ND07](needs-design.md#nd07--editable-buildings-that-become-usable-homes); these modules do not close either entire entry.

**Baseline:** published main `1cf678802d62652d8dd466776d4b95a9d0d19166`. The source audit found delivered foundations, so Mike's requested additions receive a new follow-on pair rather than a rewritten original implementation plan. Rust research remains independently pinned in the feature specification. Writing these documents does not complete the missing Rust screenshot sequences.

## ICB01 — Coherent item, recipe and result handoff

**Owners:** existing Inventory/Crafting UI, PW04, AC/recipe projection and UIUX. **Depends on:** current scoped inventory and recipe/admission APIs. **Design:** [recipe facts](../projects/inventory-crafting-building-workflows-tech-design.md#3-recipe-facts-and-workflow-handoff).

- [ ] Extend selected permitted recipe facts with correctly sourced usable versus held units, declared prerequisites and planned output; trace the actual producer before relabeling the current available field. Keep knowledge and installation distinct.
- [ ] Preserve exact object/source/count, reading position and scope across Inventory → Crafting → work/result → Inventory; reuse existing components and narrow-sheet behavior. Keep Craft now as a simple route.
- [ ] Distinguish Makes/Planned from actual Made/Moved/Equipped receipts, including a merged output and unknown properties. Add bounded selected-detail reads without expanding all recipes against all stock.
- [ ] Verify native-projected facts and actual UI on one known tool/cord activity, a partly held lot, an unknown/private recipe and an omitted family. Fix in-scope failures and reconcile the owning inventory/recipe guidance.

**Exit:** a person can inspect a known method and follow its actual result without mistaking planned or reserved items for usable possessions; the existing one-action path remains usable.

## ICB02 — Finite crafting list on the existing actor plan

**Owners:** AC/AE/AG plan and native recipe owners, server publication/SL, Crafting UI. **Depends on:** ICB01. **Design:** [finite list and edits](../projects/inventory-crafting-building-workflows-tech-design.md#4-finite-crafting-list-and-suffix-editing).

- [ ] Compile explicit known-recipe/count entries and producer dependencies to the existing bounded composition; retain stable row/node mapping in that same plan owner. Drafting creates no claims or effects.
- [ ] Add ordinary-player work-list status and exact start/suffix-edit requests. Edit only eligible pending independent work against current plan revision; preserve current-step progress and actual completed outputs.
- [ ] Reuse native per-step resource, installed-support, body, tool/station, output and cancellation checks. Explain known future shortages, refusal, unsupported continuation and interruption cost without auto-retry or hidden substitution.
- [ ] Integrate any new plan metadata with current-format validation, PostgreSQL capture/restore, participation/departure and original-receipt recovery. No separate scheduler, queue table or offline-work permission.
- [ ] Exercise count/shape overflow, a stale edit during step completion, invalid producer reorder, consumed-material Stop, partial success, same-format restart and ordinary departure through actual callers and UI.

**Exit:** a finite selected list completes or stops truthfully; no extra craft, refund, duplicated product or resurrected canceled activity occurs. Current single-step manufacture and independent NPC choices are unchanged.

## ICB03 — Exact acquisition and transfer continuation

**Owners:** PO04/PO07/PO10, native handling/AC, Inventory and destination picker. **Depends on:** ICB01. **Design:** [existing command boundary](../projects/inventory-crafting-building-workflows-tech-design.md#51-preserve-current-commands).

- [ ] Keep the selected source/quantity visible while choosing a destination and while the receipt is uncertain; hand off only the actual resulting identity/quantity after success.
- [ ] Retain current Take/Pick Up/Move and Pick Up All semantics. Preserve timed approach/collection and current container/corpse access; do not turn the new review into a stealth rules change.
- [ ] On full/inaccessible/changed destination or partial/failed discovery, retain the draft but remove stale execution authority; supply fresh inspect/refresh/narrowing routes and sensible focus.
- [ ] Qualify one nested transfer and one timed ground pickup, lost acknowledgement, same-name objects, changed shared contents and permission loss. Reuse already valid PW04 evidence where assumptions match.

**Exit:** acquisition to useful storage is a recoverable exact task, without unreviewed drop, duplicate transfer, private inventory disclosure or erased handling time.

## ICB04 — Chosen destinations for equipment replacement

**Owners:** PO custody/equipment/capacity, installed body/item rules, AC and server transaction, Inventory comparison/review. **Depends on:** ICB03. **Design:** [compound immediate exchange](../projects/inventory-crafting-building-workflows-tech-design.md#52-compound-immediate-operation).

- [ ] Derive all actual equipment conflicts and permissible immediate destinations through existing owners. Review incoming unit/source, body places, displaced items and final capacity; preserve ordinary Equip's existing default stowing.
- [ ] Reuse or extract final-placement preflight with exact authority, claims, condition, nesting and net ancestor loads. Commit one immediate exchange through the existing command draft/publication, not a client sequence of unequip/move/equip calls.
- [ ] Preserve individualization/lineage and exact receipts. Timed or unsupported acquisition stays in the ordinary separate route; revision-bound exchange is not silently added to reusable crafting methods.
- [ ] Prove the full-bag equal-load knife exchange, two-hand conflicts, a larger displaced load that cannot fit, active-work refusal, access revocation, forged/stale review, duplicate receipt and injected publication rollback; inspect actual inventory/equipment after failure.

**Exit:** a reviewed compatible immediate exchange commits entirely or leaves everything unchanged, including previously equipped gear. There is no new global inventory cap, free timed action or automatic ground fallback.

## ICB05 — Site selection and truthful placement checks

**Owners:** SH02, SW geometry/renderer boundary, current Construction UI and UIUX. **Depends on:** ICB01. **Design:** [construction draft and check](../projects/inventory-crafting-building-workflows-tech-design.md#6-construction-draft-check-and-disposition).

- [ ] Add deliberate Pick site and supported alignment/nudge controls using exact surface/orientation meanings, with optional manual adjustment and keyboard/no-drag operation. Consume placement clicks without moving the character.
- [ ] Reuse the SH evaluator, permitted shapes and material facts. Distinguish draft/checking/last-checked/blocked/stale/failed states with text, preserve intended layout, and make supported remedies reachable.
- [ ] Invalidate reviews on the complete material/permission/family/geometry dependencies; accept only the latest matching check. Bound pending checks and avoid another polling loop or per-frame server evaluation.
- [ ] Exercise held-but-still-eligible stock, different supported headings/surfaces, occupant arrival, lost permission, hidden blockers, delayed checks, Escape/lost capture and actual Start revalidation. Keep existing shape/contact limits intact.

**Exit:** a player can choose, understand and correct a candidate without false validity, hidden-state disclosure or unintended movement/construction.

## ICB06 — Explicit replacement, correction and reclaim

**Owners:** SH01/SH02/SH05, PO material/custody, current construction phases and UI. **Depends on:** ICB05. **Design:** [replacement and correction](../projects/inventory-crafting-building-workflows-tech-design.md#64-replacement-and-correction).

- [ ] Show actual before/after use/coverage where supported, exact incoming and outgoing materials, required work, keep-covered constraint and every relevant disposition. Use Replace/Extend, not an invented construction-tier ladder.
- [ ] Keep local draft reversal separate from stopping real work and changing installed parts; use existing admission, reachable work stances and phase interruption without free refunds or pristine salvage.
- [ ] Revalidate complete incoming/released-material authority and destination capacity before each owning effect. A stale destination or unsupported keep-covered alternative cannot silently lower the guarantee or scatter possessions.
- [ ] Complete build → stop after an installed phase → resume/use → compatible replacement → conditioned reclaim, plus full destination, occupied replacement, partial stock and unsupported overlap refusals. Retain valid SH evidence instead of restarting its whole qualification program.

**Exit:** the player can change a useful shelter and recover real materials with predictable costs, condition and destinations; existing broader homes/scale work remains open.

## ICB07 — Combined qualification and publication

**Owners:** implementing module owners, existing UIUX/PO/SH/AC/SL verification owners. **Depends on:** ICB01–ICB06 for the complete feature claim. **Design:** [acceptance situations](../projects/inventory-crafting-building-workflows-feature-spec.md#8-acceptance-situations) and [verification contract](../projects/inventory-crafting-building-workflows-tech-design.md#9-verification-and-contract-reconciliation).

- [ ] Run both complete ordinary-player journeys and their meaningful failure paths through native/server/UI callers, rather than validating only isolated cards. Include different allowed recipe/handling meaning and omission.
- [ ] Verify exact conservation, phase/output identity, persistence, lost-acknowledgement recovery, manual pause versus ordinary departure, actor/access/timeline replacement and independently permitted observers using disposable PostgreSQL worlds.
- [ ] Qualify keyboard/no-drag, long and duplicate names, short/narrow/enlarged text, focus/reading continuity, child popups, canceled gestures and composer/world-input isolation. State unrun assistive-device or uncoached-user evidence explicitly.
- [ ] Measure complete reads/commands/checks with realistic stock, nested containers, finite plan limits and concentrated geometry changes, including cold preparation and retained growth. Keep incomplete/budget-exhausted results truthful; do not claim broad capacity from warm small fixtures.
- [ ] Review the complete affected diff; fix introduced issues; reconcile actual current contracts, limits and relevant parent references. Record evidence in existing reports, update both project status tables together, and close only demonstrated criteria. Complete required CI before merge readiness.

**Exit:** the selected follow-on is implemented, integrated, documented and qualified at its stated scope. Research reading, a design pair, a screenshot, compilation or isolated success alone cannot complete this item.

## Progress and boundaries

All implementation items above are intentionally unchecked. No existing parent checkbox has been changed. Design preparation includes source/tracker inspection, the paired behavioral/technical proposal and this dependency breakdown; no application run, paid model call, new test suite or gameplay measurement was performed. On implementation authorization, refresh the actual base and reuse work already delivered in parallel. No prerequisite requires merging research PR #30 or completing all 35 research topics.
