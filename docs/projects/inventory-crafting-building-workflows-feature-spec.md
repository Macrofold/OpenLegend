# Inventory, crafting and building workflows — follow-on feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | The follow-on design and delivery breakdown are prepared; implementation and gameplay qualification have not begun. | 2026-10-14 |

**Requested by Mike, October 14, 2026. Design/documentation authorization only.** This is a scoped follow-on to delivered inventory, activity and open-shelter foundations, not their replacement. It develops the interaction extensions of [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) and [ND07](../maintainers/needs-design.md#nd07--editable-buildings-that-become-usable-homes). It neither closes those broader entries nor selects new household, combat, loss or construction laws.

## Maintained records

- Implementation, dependencies and outstanding acceptance: [ICB01–ICB07](../maintainers/inventory-crafting-building-workflows.md).
- Technical contracts and integration: [technical design](inventory-crafting-building-workflows-tech-design.md).
- Proposed scope and work limits: [workflow inventory](../limits/inventory-crafting-building-workflows.md), with the shared limits linked there.
- Current behavior: [inventory handbook](../ui-ux/inventory.md), [action records and activities](../action-experience.md), [base-world items](../worlds/base/items.md), [shelter feature](editable-shelters-feature-spec.md) and [shelter delivery](../maintainers/editable-shelters.md).

## 1. Purpose and the distinction from the Rust evidence gap

A player should be able to find a useful object, understand what it enables, make a small chosen set of things, put the results where intended, and improve a shelter without repeatedly reconstructing the same choices or accidentally losing property. Preparation, location, scarce supplies and consequences remain gameplay. Repeated selection, unstable controls and ambiguous completion should not be extra obstacles.

The earlier missing evidence concerned **our observation of complete current-version Rust interactions**. It was not a diagnosis that Open Legend lacked inventory or construction. Creating this design does not close that research gap. The design uses the research's qualified lessons and inspected Open Legend owners, not an assumed current Rust screen sequence.

The smallest useful release completes two ordinary-player journeys: **possessions → known recipe → finite work list → actual output → chosen storage/equipment**, and **shelter draft → checked placement → real construction → use → replacement or reclaim**. Existing single-action routes remain available; someone making one cord should not have to construct a work list first.

## 2. What already exists and what is new

Baseline inspected: published `Macrofold/OpenLegend/main` at `1cf678802d62652d8dd466776d4b95a9d0d19166`. This was a focused source/design/tracker inspection, not a new gameplay test or whole-repository implementation audit.

| Area | Existing design and delivered subset | Follow-on addition |
| --- | --- | --- |
| Inventory and exact movement | [PW04](../maintainers/parallel-batch-01-playable-week.md#pw04--inventory-for-exact-camp-tasks) and [inventory guidance](../ui-ux/inventory.md) cover scoped search, direct-child pages, exact quantities, destination selection, native comparison and retained drafts. Wider qualification remains open. | Carry the same exact selection through recipe, work and result handoffs; make planned versus owned quantities and disposition clearer. |
| Crafting and activities | [Completed action-experience design](completed/action-experience-feature-spec.md), [current activity contract](../action-experience.md) and existing recipe details supply native manufacture, finite sequences, actual output binding, interruption and persistence. | A normal-player finite crafting-list presentation and revision-checked editing of its not-yet-started independent suffix. Existing diagnostic action states are not themselves that complete interaction. |
| Equipment | [Compatible held equipment](../worlds/base/items.md#compatible-held-equipment) already individualizes a unit, checks body ports and atomically stows conflicts into carried possessions. [Barter](../worlds/base/items.md#shared-containers-and-active-work) already demonstrates final-net-capacity reasoning. | Explicit displaced-item destinations, and one reviewed immediate equipment exchange through those same custody/equipment owners. This is not a repair claim that ordinary Equip currently loses items. |
| Building | [The shelter pair](editable-shelters-tech-design.md) and [SH01–SH06](../maintainers/editable-shelters.md) deliver flat one/two-bay and single-bay lean-to construction, preview, interrupted work, replacement, use and reclaim. October 14 already invalidates reviews when selected material facts change. | A complete task-oriented placement/check/correction presentation with deliberate site picking, supported alignment aids and an explicit material/destination review for alterations. Do not rebuild the existing evaluator or repeat delivered free-quantity fixes. |

The old project documents retain their completion history and unsatisfied acceptance. This new pair owns only the additions above. The task tracker maps implementation modules back to those owners rather than reopening their original assignments.

## 3. The player-facing workspace

Keep the current independently opened Inventory and Crafting panels, shared narrow-screen sheet, world view, visual theme and camera controls. Add connected task views, not a permanent full-screen management dashboard or a second inventory.

| View | Essential information | Deliberate actions |
| --- | --- | --- |
| Selected possession | Exact object and location, total/usable quantity, known characteristics, relevant current equipment | Inspect, compare, move, ordinary supported use; open a related known recipe only when that relation is permitted |
| Known recipe | What it makes, knowledge/support status, declared tools or station, ingredient needs versus currently usable stock, work and interruption consequences | Craft now; choose count and Add to work list; return without losing the source selection |
| Crafting work list | Not started/current/finished entries, exact requested counts, dependency links, known shortages, current native work and actual results | Review and start; edit eligible pending entries; stop under the owning action's rules; inspect outputs |
| Transfer/equipment review | Source, selected quantities, candidate equipment places, every displaced object and chosen destination, relevant final capacity | Confirm the named operation; change destination; cancel the draft |
| Construction review | Intended place/surface/orientation, actual part footprint, check status, required/free materials, work, supported use and any released parts | Pick or adjust site; Check placement; Start; later inspect, replace, extend, stop or reclaim |

Changing panels or width preserves the exact task, selection, quantity text and return position while the same authorized client scope remains active. Back is navigation, not a mutation or cancellation of already running work. A retained draft is never treated as a fresh permission check.

Recipe descriptions say **Makes** or **Planned output** before execution. **Made**, **Moved** and **Equipped** identify actual committed results. Known output properties can be described confidently without pretending the object already exists. An unknown value is not zero, and a future output is not available stock.

## 4. Known recipes and a finite crafting work list

### 4.1 Select and review

The player chooses a personally known, installed recipe and a positive finite count. Adding an entry changes a private draft only: it neither teaches a method, reserves supplies, starts work nor calls a model. List entries preserve stable identity and order while quantities or availability refresh. Search remains scoped and complete through explicit continuation rather than silently searching only visible rows.

Recipe detail separates **knowledge**, **installed capability**, **declared tools/station**, **materials**, **work** and **output**. Show only prerequisites the selected family actually has; do not add a workbench requirement to a recipe that needs none. Possessing a product does not reveal a private recipe for making it. Existing authoring/invention remains a separately chosen route.

For ingredients, distinguish total holdings, units unavailable because of other work, usable units and units expected from an earlier chosen step. The list may explain an eventual shortage without refusing a useful first step. Review states clearly when only the next step is currently executable; accepting that review does not guarantee the whole list will finish.

### 4.2 Execute through ordinary activity

**Start work list** submits the finite selection to the existing actor plan. It uses the character's existing physical work capacity, recipe knowledge, time, consumption and cancellation rules. If the character is already occupied, show the current work and its supported finish/stop/interrupt choices; adding a draft entry must not silently replace that work.

Each step rechecks its actual prerequisites at admission and its family-required effect boundaries. Only that native step creates its normal material commitments. The entire list does not lock future supplies. Actual output references can feed a later selected crafting step; the interface labels that dependency rather than binding a nonexistent object or reusing a historical output ID.

The initial list supports qualified ordinary manufacture through existing finite invocation/sequence/repeat controls. It does not add automatic gathering, buying, research, travel to an unchosen station, indefinite production, a second worker, or new NPC goals. A family whose continuation or output disposition cannot satisfy this contract is shown as unsupported for the list while its legitimate ordinary action remains available.

### 4.3 Change, stop and recover

Before Start, entries can be changed freely. After Start, completed work and the running native step are fixed facts. The player may remove, change counts or move **not-yet-started independent entries** in a revision-checked review. A dependent entry cannot move before its producer or survive removal of its required producer without a new valid binding. Refuse an invalid edit with its reason; never quietly change its purpose.

Editing the pending suffix does not restart the current craft, refund spent inputs, clear recovery, replay outputs or release another operation's claims. Stop uses the existing native cancellation/interrupt behavior and explains what remains. A craft that consumes inputs at start still does so; this proposal does not adopt Rust's historical queue-reordering penalty or invent free pause/resume for that craft.

A shortage, changed recipe or unavailable destination stops at the relevant boundary, retains completed results and offers a worthwhile next choice: inspect, obtain supplies by ordinary play, remove remaining work, or explicitly resume/restart what is supported. It does not repeatedly retry, substitute another item, invoke paid invention or skip the blocked entry automatically.

Closing a panel does not stop an accepted list. **Leaving the game still follows the current departure policy**, which cancels unfinished human work; this is not offline production. Reopening is read-only. A server restart restores saved progress under existing participation and pause rules without replaying completed steps. A lost acknowledgement is reconciled against the original request before another start.

## 5. Loot, transfer and equipment disposition

### 5.1 Use the existing acquisition rules

A found object, a visible pile, an inspected container and another person's private inventory are different access situations. Keep the current Take/Pick Up/Move meanings, including timed approach and current Pick Up All behavior. This design does not redefine the latter as a frozen selection or change who can loot a corpse. The new exact review applies to a deliberately selected item/quantity; it does not silently replace existing commands.

Keep the source visible while choosing a destination. A failed or incomplete read is not an empty container. If goods move, access changes or a destination fills, preserve the draft but discard the old actionable review and require a fresh valid choice. After success, show actual quantity and destination, preserve sensible neighboring focus and offer the next supported action on the actual result.

### 5.2 Choose where replaced equipment goes

Ordinary Equip retains its existing safe conflict-stowing behavior. The follow-on adds a deliberate **Equip and stow…** review when the player wants a particular destination. It shows the incoming unit, source, occupied body places, all conflicting equipped items, and where each will end up. The player need not know internal body-port identifiers.

**Constructed example using the current packing model:** a full bag contains a one-load-unit knife; a different one-load-unit knife is equipped. The player chooses to equip the bag's knife and put the old knife into the space it leaves. The final bag load is unchanged. Validate that final arrangement as one immediate operation rather than demand impossible temporary room or silently drop the old knife.

The initial combined exchange is limited to already accessible sources and destinations whose owning native operations are immediate and compatible. A ground pickup requiring an approach/collection interval remains **Take, then equip** as separately visible steps; the combined command must not erase its cost. Compatible clothing or other equipment is supported only through an actually installed equipment family, not an invented universal armor grid.

Before mutation, validate the complete exchange: all access, body compatibility, current work, reservations, quantity/identity, containment and final capacity. Either the immediate exchange commits completely or it changes nothing. A refusal leaves the previously equipped item equipped. No automatic dropping, deletion, selling, recycling or grant expansion resolves a conflict. Partial stock individualization retains real lineage and records the actual chosen unit.

## 6. Place, check and build

### 6.1 Deliberate placement, not an accidental move

**Pick site** enters a visibly named placement mode. A world click in that mode chooses the draft position and support surface; it does not walk the character or start construction. Escape cancels that mode before dismissing its parent panel. Existing numeric/surface controls and focusable orientation/nudge controls provide a non-drag route. Keep current camera gestures and reduced-motion behavior.

Offer alignment assistance only for the selected family's supported layout or currently permitted compatible attachment anchors. The resulting snapped position is visible and can be adjusted or the aid disabled. Snapping never changes the world's coordinate model, invents a supporting surface, exposes an unseen structure or broadens the family's supported orientations. It helps choose a candidate; it does not certify it.

### 6.2 A preview tells the truth about what has been checked

Distinguish **Draft / Not checked**, **Checking**, **Last checked**, **Blocked**, **Changed since check**, and **Check failed** in text as well as appearance. A locally moved outline immediately loses its old validity indication. Relevant material, permission, family, geometry or occupancy changes also invalidate the prior review. Do not clear the player's intended arrangement merely because it now needs another check.

**Check placement** uses the existing native evaluator. Present its permitted blockers and a supported remedy: choose another part, resolve insufficient free units, select a supported surface, adjust orientation, clear a known obstruction or obtain appropriate authority. Unknown or hidden blockers get a truthful general explanation, not an outline or identity the character could not know.

The footprint and any shown useful area come from the actual supported part/body geometry. A graphic cannot promise walkable roofing, a dry interior, room for a person or a reachable fastening that the selected family has not calculated. Start rechecks current conditions; a successful earlier review is not a reservation of empty space.

### 6.3 Work is a physical change

Before Start, show the actual parts/units, free versus already committed stock, current expected work and relevant use/coverage consequences. After Start, show actual native phases and installed parts. Someone occupying the site or removing access can stop the next effect even after a valid preview. Previously installed parts retain their actual identity and condition; there is no optimistic completed house while the server is still deciding.

## 7. Replace, correct and reclaim

In this release **upgrade means an admitted replacement or extension**, not Rust-style wood/stone/metal tiers. Name the concrete operation: Replace cover, Extend shelter, Take down or Reclaim. Show before/after layout, supported differences, incoming materials, outgoing parts and their real destinations. Unknown durability or permeability must not become an invented improvement score.

Keep the current **keep covered** constraint meaningful. If compatible replacement cannot maintain the required coverage or fit its temporary layers, refuse that plan and explain a separately reviewed alternative. Do not silently remove the constraint. Existing limitations such as unsupported perpendicular overlapping slopes remain enforced.

A mistake has different remedies at different stages. Moving an uncommitted draft is free. Stopping real work preserves completed phases and follows native interruption costs. Altering or reclaiming committed parts uses the existing physical operations, permissions, work and disposition rules. An Undo label is allowed only for a genuinely reversible local draft; it cannot refund already consumed cord or reset a wet cloak to pristine condition.

A reclaim destination that has become full or inaccessible blocks the relevant operation without secretly destroying or relocating the part. Where the existing family deliberately lowers supported parts to the world, name that outcome before a chosen operation and retain its actual recovery rules. No new raid, decay, ownership shield or automatic home designation is introduced.

## 8. Acceptance situations

These are future verification scenarios, not observed results from this design task. ICB07 owns execution and evidence, while parent trackers retain their broader unfinished programs.

| Situation | Required outcome |
| --- | --- |
| Make something useful and use it | Select a known tool recipe, review real supplies, start a finite list, inspect the actual completed tool and reach ordinary Equip/Use without losing its identity or conflating a plan with inventory. |
| Partly held materials | With six relevant units and four held for other work, show two usable. A first admitted craft may succeed; an explicitly disclosed later shortage stops without stealing held supplies or replaying the first output. |
| Interrupted list and edited suffix | Finish one step, start another, edit a later independent entry and reject an invalid producer/dependent reorder. Current elapsed work and completed output remain unchanged; Stop explains actual committed costs. |
| Full bag equipment exchange | Exchange the two equal-load knives above, then test changed access, a newly reserved conflict and a no-longer-fitting destination. Success is complete; refusal leaves equipment and bags unchanged. A timed ground pickup still takes its ordinary time. |
| Placement changes while reviewed | Check a valid place, then change a selected material or introduce an occupant. The draft remains, the old success indication cannot authorize Start, and native admission independently rejects a stale attempt. Hidden obstruction details remain private. |
| Build, use, change and recover | Build an admitted shelter with finite stock, stop after a real phase, resume through the existing rules, use the place, replace a cover with reviewed destinations, and reclaim the same conditioned material. Refuse an unfulfillable keep-covered or capacity constraint. |
| Reconnection, failure and another world | Duplicate/lost acknowledgements, transport loss, manual pause, ordinary departure, same-format restart and a new timeline cannot duplicate effects or leak old private facts. A world omitting building or a recipe family offers no invented fallback. |

Perform the ordinary and meaningful refusal journeys through actual player UI and native/server/database callers. Include keyboard-only and no-drag use, short/narrow layouts, enlarged text, duplicate names, late reads and input isolation. A controlled scenario establishes mechanics, not general enjoyment or accessibility certification. Record participant understanding and unnecessary repeated actions when practical; do not invent success percentages.

## 9. Evidence and interpretation

The [Rust dossier](https://github.com/Macrofold/OpenLegend/blob/5b1af798987b66bc41f9134fb8f23e452d7f0866/archive/02-research/game-inspiration/dossiers/rust.md) and [visual atlas](https://github.com/Macrofold/OpenLegend/blob/5b1af798987b66bc41f9134fb8f23e452d7f0866/archive/02-research/game-inspiration/dossiers/rust-visual-atlas.md) are pinned because research PR #30 is separate and was unmerged at this design's source check. Historical images and current rule descriptions have different evidentiary value.

| Research contribution | Application here | Limit or alternative |
| --- | --- | --- |
| Crafting separates knowledge, means, inputs and output; historical Quick Craft and detailed recipe screens serve different decisions | Keep Craft now and a deliberate finite-list route; explain exact prerequisites and planned output | Do not add unnecessary stations, recipe trees or list ceremony to a simple action |
| Inventory movement and equipment swaps need understandable destinations; cosmetic entitlement is not physical custody | Explicit material/slot/destination review and actual receipts | Retain the existing simpler Equip default; no global slot cap or cosmetic-system work |
| Snapping can remove alignment friction while location and resource choices remain consequential | Optional family-scoped placement assistance with native check and manual controls | A familiar-looking ghost is not proof of physical validity or accessibility |
| Stable targets, clear interruption and actual continuation matter more than clicks alone | Stable pending entries and checked-state invalidation without lost drafts | Do not copy a historical control delay, reorder penalty or an unsupported current Rust binding |
| Comfortable homes and meaningful recovery can remain achievements | Useful shelter and honest reclaim without new maintenance pressure | No inference that PvP, wipes or involuntary offline loss are necessary |

Our recommendation is to deliver these ordinary workflows before broader bulk looting, permanent loadout collections, unrestricted building or factory automation. That is a scope choice for this follow-on, not a reprioritization of unrelated approved work or a claim that research has proven the optimal design.

## 10. Scope decisions and implementation boundary

Retain one physical work lane, existing recipe/knowledge and custody owners, installed-world restrictions, actual time/costs, current participation/death/pause behavior, and present visual/input conventions. Add only the task presentation, necessary exact preview/projection facts, pending-list control and destination-aware immediate exchange described here. No new model call, private storage service, engine-wide crafting queue, universal inventory capacity or broad construction solver is selected.

No further product answer is required to write this scoped design. Runtime implementation remains a separate authorization. At implementation start, recheck the inspected baseline and reuse any additions already delivered; unexpected semantic conflicts require resolution rather than duplicating owners or weakening these requirements.
