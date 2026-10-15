# Item and building workflow limits and boundaries

**Status: proposed follow-on, October 14, 2026. No runtime limit has changed.** [Feature specification](../projects/item-and-building-workflows-feature-spec.md) · [Technical design](../projects/item-and-building-workflows-tech-design.md) · [IWB tasks](../maintainers/item-and-building-workflows.md).

The project consumes shared [interface](interface.md), [object](objects.md), [activity](action-experience.md), [construction](editable-shelters.md), [spatial](spatial.md) and [persistence](persistence.md) allowances; those owners retain their exact values. The entries below describe only the follow-on's choices. Authorization, identity, truthful receipts and material atomicity are integrity obligations, not tuning limits.

<a id="iwb-l01"></a>

## IWB-L01 — One finite attended manufacturing list

**Proposed; Safe.** One selected actor uses its existing physical activity lane, with finite ordered manufacturing entries and explicit positive craft counts. No second active queue, infinite repeat, automatic gathering/purchasing, remote labor or offline-production exception. This keeps the first useful task understandable and composes the existing plan owner. It can exclude legitimate future factory/logistics work; that requires a separately scoped process/adapter, not a larger hidden queue. IWB03 owns delivery. Ordinary single-craft actions remain usable without a list.

<a id="iwb-l02"></a>

## IWB-L02 — Bound preparation before expansion

**Proposed; Safe, exact shared allowances retained.** Draft and accepted lists must fit the native activity representation's existing node/depth/repetition/serialized-work allowances. Validate total size/count before expanding craft repetitions or hydrating candidate stock. Rejection preserves the editable list and explains the exceeded operation envelope; no silent truncation or automatic split into independently executing jobs. IWB01/IWB03 must use one owning limit source in UI, request validation and execution. No new maximum inventory size or number of lifetime crafts is selected. Large finite counts are a reachable growth path even for a short list and need measured refusal before allocation.

<a id="iwb-l03"></a>

## IWB-L03 — Explicit own-possession equipment disposition

**Proposed; Medium.** The first compound equip/stow operation starts with an already held accessible candidate and stows conflicts in the actor's own accessible possessions/containers. Ground pickup, gifts, barter and another person's storage remain separate tasks. This restricts convenience but keeps a single ordinary equipment transaction honest; a timed approach cannot be hidden inside its all-or-nothing promise. Capacity comes from the installed packing/body rules, with final net loads, not a new global slot cap. IWB02 owns delivery; ordinary Equip's existing defaults remain.

<a id="iwb-l04"></a>

## IWB-L04 — Existing qualified construction arrangements

**Proposed; Very safe for construction breadth.** Refinement is limited to currently qualified family arrangements and native operations, initially flat one/two-bay and the single-bay lean-to. Alignment honors that family's actual anchors/headings. This excludes new walls, doors, arbitrary rotations, grade upgrades, structural-failure models and free demolition. The restriction avoids claiming missing physics from a visual preview; a new arrangement needs its own SH/ND07 geometry and interaction qualification. No universal grid or new upkeep/raid rule is selected. IWB05 owns this interface scope; shared SH restrictions remain in their existing inventory.

<a id="iwb-l05"></a>

## IWB-L05 — Latest-draft optional preview and scoped discovery

**Proposed; Safe.** Each active editing context permits one in-flight optional preview and one replaceable latest requested draft; newer intent supersedes queued optional work, never a committed effect. Stop/await obsolete work as supported before dispatching the replacement; stale replies cannot publish. This bounds pointer-driven backlog but may require a brief wait under slow preparation. Existing native geometry/resource work allowances remain in force. A visible result cap is not a bound on examined candidates: inventory/destination discovery stays scoped and continued, exact selections use exact lookup, and recipe preparation shares quantities within the permitted read. No new world-wide discovery or cross-product scan of every recipe, object and placement is authorized. IWB01/IWB05/IWB07 own implementation and measurement.

<a id="iwb-l06"></a>

## IWB-L06 — No additional possession cap, output buffer or shadow history

**Proposed no additional product cap; Medium for selected workflow, unqualified for population scale.** This project adds no total stored-item limit, Rust-style backpack grid, queue-owned produced-item buffer or duplicate item/history collection. Real outputs stay with their existing native custody owner; completed program history uses the current activity/record retention and paging rules. Retained private drafts use the existing scoped draft lifecycle and the finite list-size envelope, not an unbounded new browser history. Growing ordinary possessions and durable history remain bounded per operation by their existing owners, not by this presentation scope; their total population/storage qualification is unchanged. Full output storage gives an honest separate failure, not discarded products or hidden capacity. IWB04/IWB06 retain these boundaries.

## Reconsideration

These are design choices, not empirically optimal values or new entries closing the limits-audit backlog. Reconsider a boundary only for a selected supported use case and measured burden: larger finite craft plans, a real automatic transport activity, another body/packing rule, a new qualified structure or a demonstrated preview backlog. Keep the current world's rules and exact shared allowances until their owning design is deliberately changed. No arbitrary latency, click-count, monetary, recipe-cost or material-refund target is introduced here.
