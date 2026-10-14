# Item and building workflows — follow-on delivery

**Status: design prepared; implementation not started. Reviewed October 14, 2026.** Mike requested a design and task breakdown for the additions beyond existing inventory, recipe and shelter delivery. A later implementation go-ahead is still required. The source baseline is published main `57a2977e22bab3f7293caa4a176c9ef4ba800751`.

[Feature specification](../projects/item-and-building-workflows-feature-spec.md) · [Technical design](../projects/item-and-building-workflows-tech-design.md) · [Limits](../limits/item-and-building-workflows.md) · [UI follow-through](ui-ux.md) · [Maintainer index](README.md)

This is the sole detailed implementation tracker for this follow-on. Parent needs remain [ND13](needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) and [ND07](needs-design.md#nd07--editable-buildings-that-become-usable-homes); no new competing design register or replacement of completed PW04/PW11/SH work is created. Their incomplete broader acceptance stays in those owners. The quoted Rust capture gap remains a research limit, not an OpenLegend feature or test failure.

## Design preparation

- [x] Inspect current inventory/recipe/construction owners and distinguish delivered foundations from prospective additions and existing qualification gaps.
- [x] Prepare paired feature/technical documents with exact actor/item/material consequences, world boundaries, current-format continuation, privacy and performance design.
- [x] Break implementation into the modules below with dependencies, exits and explicit limits. These design checks do not mark any runtime task complete.

## IWB01 — Exact task facts and continuity

**Parent:** ND13 and ND07. **Owners:** existing inventory/action projections, private-draft/read scopes, family fact descriptors and UI controls. **Dependencies:** the current integrated PW04/PW11/SH foundations, not completion of their unrelated broad programs.

- [ ] Add only missing native task facts: exact selected subject/source/destination, total versus currently usable quantity, expected consequences, permitted blocker and relevant freshness. Reuse existing quantity, compatibility, permission and geometry preparation.
- [ ] Preserve task intent through nested inspection, return navigation, panel adaptation and same-character control renewal while invalidating stale or revoked read facts separately. Apply the current foundation scope distinctions; do not duplicate their repairs.
- [ ] Separate draft, checking, checked, stale/failed, accepted work, completed outcome and unconfirmed write. Keep names stable under refresh and provide accessible non-hover explanations and non-drag controls.
- [ ] Qualify one actual item task and one construction draft with a partially reserved lot, failed/late read and true scope replacement. Verify inspection neither mutates possessions nor grants unread knowledge.

**Exit:** both callers can retain a lawful intention while refusing stale action facts, with the same native prerequisites used at review and submit. A new shared helper is warranted only at the demonstrated shared seam identified by FRL05.

## IWB02 — Equip and stow without accidental loss

**Parent:** ND13. **Owners:** native custody/equipment and inventory task UI. **Dependencies:** IWB01. **Behavior:** [equipment journey](../projects/item-and-building-workflows-feature-spec.md#5-replace-equipment-with-a-visible-disposition-for-conflicts).

- [ ] Extend the existing ordinary equip transaction with explicit own-container destinations for every actual conflicting item; retain the current default equip behavior.
- [ ] Preflight complete final placements and ancestor loads, accounting for the candidate leaving its bag. Preserve exact individualization/remainders, condition, held inputs, compatible body places and complete authority.
- [ ] Present candidate, displaced items and destinations together; commit all or nothing, with no auto-drop, substitute item, remote ground acquisition or implicit gift.
- [ ] Exercise a full-bag net-valid swap, genuinely insufficient final room, stale conflict set, access change and active-work refusal through native and actual UI callers. Reconcile a lost result once.

**Exit:** a valid reviewed swap leaves each real item in exactly one intended place; every refused compound swap leaves equipment and stock unchanged. Existing barter is reused as an integrity reference, not a second equip implementation.

## IWB03 — Finite manufacturing-list execution

**Parent:** ND13. **Owners:** existing requested-activity/ActorPlan, native crafting, invocation codecs and action occurrences. **Dependencies:** IWB01 and existing finite native execution.

- [ ] Admit bounded ordered recipe entries and explicit craft counts through the existing native plan path. Reject oversized structure before expansion, unknown recipes and unsupported bindings without inventing inputs or commands.
- [ ] Validate aggregate known/shared-input requirements while checking only the current step for present execution; bind future products from real output receipts. Pending entries acquire no new stock holds.
- [ ] Add serialized pending-suffix editing and Pause after this craft, fencing the current frontier/revision. Preserve the active leaf and completed occurrences; refuse consumer-before-producer ordering.
- [ ] Delegate Stop to actual cancellation, clear future automatic continuation, retain sunk costs/products and distinguish paused resume from a new attempt after cancellation. Failures require explicit review, not automatic skip/retry.
- [ ] Exercise completion-versus-pause/edit races, partially completed lists, changed definitions/support, missing future inputs and same-operation recovery. Update existing current record/validation owners for new control data together.

**Exit:** exactly the chosen finite supported work runs through the original executor, no completed craft is replayed, and stopping cannot start another queued craft. No second manufacturing scheduler or offline-production policy exists.

## IWB04 — Crafting UI and actual output follow-through

**Parent:** ND13. **Owners:** ordinary recipe details/inventions and task-specific list presentation. **Dependencies:** IWB03.

- [ ] Preserve Craft once; add list preparation, stable pending rows, batch-count language, shared-resource review, named reorder/remove and separate active/pending/completed displays.
- [ ] Use Makes/Expected result before manufacture and Produced only for a committed outcome. Review all callers of the shared recipe component, including creator views, without changing their permissions.
- [ ] Link the real completed product to Inspect, ordinary Equip and explicit Choose storage. A refused storage move keeps the product and reports the separate failure; no hidden buffer or repeat Craft.
- [ ] Exercise an ordinary known tool/material chain, a materially different supported output shape, changed availability, blank count drafts, stopped work and a full destination using real native outcomes.

**Exit:** a player can make a chosen finite amount and use or deliberately store the actual products without confusing a recipe description, a started request and completed work. Automatic inventory transport and new learned knowledge are not implied.

## IWB05 — Supported shelter placement and correction

**Parent:** ND07. **Owners:** current construction component/projection, SH native phases, spatial queries and renderer preview boundary. **Dependencies:** IWB01; existing flat/two-bay and lean-to support.

- [ ] Refine the existing plan/shape preview rather than add another building engine. Preserve exact site, orientation and materials; distinguish unchecked/checking/incomplete/blocked/checked states without color-only meaning.
- [ ] Add safe actionable native blocker facts and supported alignment/non-drag controls. Coalesce stale optional previews; preserve drafts on changed inputs while requiring a fresh check.
- [ ] Join Build/Stop/Resume with the real phased results and supported Replace/Extend/Take down/Dismantle controls. Explain spare materials, reclaim destinations, retained partial work and temporary exposure; preserve keep-covered constraints.
- [ ] Exercise a corrected blocked placement, actual rest/belonging/leave/return, flat versus slope, occupied/reach/support failure, material condition and full reclaim destination. Verify hidden blockers disclose no unpermitted identity.

**Exit:** the player can correct a draft and later revise a real supported shelter, with exact material and geometry consequences. No free postcommit Undo, new grade ladder, walls/doors, decay or raiding is added. Wider SH qualification is neither duplicated nor closed.

## IWB06 — Complete task transitions and recovery

**Parent:** ND13 and ND07. **Owners:** existing command/API receipts, scoped UI and current-format activity/storage owners. **Dependencies:** IWB02, IWB04 and IWB05.

- [ ] Connect inventory → known recipe/list → produced item → explicit equipment/storage → supported shelter use/revision without losing lawful selection, unfinished text or actual result identity.
- [ ] Apply current pause, human departure, death, control renewal and gameplay-restore rules. Distinguish a retained private draft from active work and fresh disclosure authority; introduce no automatic offline execution.
- [ ] Reconcile original uncertain writes before new requests; prevent duplicate items/equipment changes, stale-timeline replies, revived cancelled lists and cross-actor/private-content leaks.
- [ ] Verify current-format PostgreSQL reopen and manual save/restore for admitted partial work plus a failed or unconfirmed command, with a separately authorized observer and an access change during an awaited read.

**Exit:** each supported journey resumes or stops according to the actual existing lifecycle, with one truthful outcome and no new authority granted by retained UI state. Old compatibility formats are not introduced.

## IWB07 — Selected release qualification and documentation

**Parent:** ND13 and ND07. **Dependencies:** IWB06; checks also accompany each introducing module.

- [ ] Complete every [acceptance journey](../projects/item-and-building-workflows-feature-spec.md#8-acceptance-journeys) through actual ordinary callers. Use existing focused tests where suitable and proportionate manual/ad-hoc scenarios where not; do not replace this with a broad unrelated suite.
- [ ] Exercise pointer and keyboard/no-drag, long/duplicate labels, desktop/narrow/short layouts, real text enlargement, cancellation/focus return and input isolation. Record native IME/assistive-device gaps separately, not as passed because a control library was used.
- [ ] Measure the [selected growth paths](../projects/item-and-building-workflows-tech-design.md#8-cost-query-growth-and-extension-seams): cold/warm preparation, candidates and allocations before result selection, full native commit/publication and browser response. Include invalid shared-input plans, large finite counts and concentrated placement changes.
- [ ] Review complete affected diff and current producer-to-consumer paths; reconcile current contracts, exact delivered status, limits and the existing owner-specific verification reports. Retain inherited qualification gaps not exercised here.
- [ ] Record an ordinary player-understanding observation separately from scripted correctness; absent uncoached human evidence remains an explicit limitation, not a invented proof of enjoyment.

**Exit:** all selected module contracts and their required ordinary/failure behavior have real evidence, all task changes are committed, and the handoff distinguishes delivered scope from unmeasured usability/scale. Do not mark the entire inventory, shelter or broader ND program complete.

## Integration order and scope control

Settle IWB01 first. IWB02 and IWB05 can proceed independently; IWB03 precedes IWB04. Coordinate shared native plan/protocol/draft files rather than assigning overlapping writers. IWB06 joins the complete journeys and IWB07 closes only this project's release evidence. A small first release may ship item review/equipment before the other modules, without declaring the whole project done.

Existing defects discovered during implementation stay in the semantic owner's tracker, with a dependency here when they block a module. Broad loadouts, automatic logistics, new building shapes, forced PvP loss, unpaid/offline work and new content families are not catch-all tasks under this project. The design introduces no new billing, provider calls or implementation spending authorization.
