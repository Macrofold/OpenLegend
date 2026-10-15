# Item and building workflows — technical design

| Status      | Current progress                                                                                                                | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Follow-on contracts remain unimplemented; the existing shared recipe wording is corrected separately in the imported UI review. | 2026-10-15   |

Counterpart: [feature specification](item-and-building-workflows-feature-spec.md). Parent needs: [ND13](../maintainers/needs-design.md#nd13--stable-action-recommendations-and-complete-control-customization) for usable item/manufacturing controls and [ND07](../maintainers/needs-design.md#nd07--editable-buildings-that-become-usable-homes) for supported shelter refinement. This is an additive delivery project, not a replacement for the implemented PW04/PW11, native activity or SH foundations.

## Maintained records

- Module tasks and acceptance ownership: [IWB01–IWB07](../maintainers/item-and-building-workflows.md).
- Proposed bounds and retained shared limits: [IWB inventory](../limits/item-and-building-workflows.md).
- Current integrity contracts: [action admission](../action-capabilities.md#action-availability-and-temporary-execution), [continuation and identity](../save-and-load.md#continuation-and-identity), [complete-operation authorization](../engine-and-world-boundaries.md#complete-operation-authorization), [private retrieval](../memory-architecture.md#private-retrieval-fencing) and [physical interaction](../spatial-world.md#physical-interaction-design-checks).

## 1. Baseline, scope and architecture decision

The project is based on published `Macrofold/OpenLegend` main `57a2977e22bab3f7293caa4a176c9ef4ba800751`. The initial design-owner audit at its parent `b72e9d9aab8072eb1b5ae9d25f620a4421509148` established existing delivery; the newer foundation continuity/privacy contracts remain controlling. Current source excerpts inspected include `inventory.tsx`, the complete `recipe-details.tsx`, and the construction component's state/read/preview entrypoints. This is targeted design discovery, not a complete current code or runtime audit. Source names below identify existing owners or clearly marked proposed changes, not assertions that an unimplemented API already exists.

Use the existing native action, custody, equipment, construction, activity-plan and saved-record owners. Add task-specific presentation and narrowly scoped operations only where those owners lack the required contract. The browser never decides actual capacity, structural support, recipe cost or permission. No additional job service, event bus, writable inventory mirror, universal interaction framework or second construction graph is needed.

This design changes no recipe, body, packing, loss or building policy by itself. Installed definitions own their names, requirements, units, recipes, compatible body places, supported shapes and effects. A different world can omit these capabilities or install materially different definitions. The generic substrate supplies selection, admission, execution, current-format persistence and permitted presentation. No client switch on a Rust item or bundled recipe name is justified.

## 2. Existing owners and affected callers

**Item task and destination presentation:** `apps/client/src/ui/inventory.tsx`, `inventory-controls.tsx`, `inventory-destinations.tsx` and the [inventory handbook](../ui-ux/inventory.md). Reuse exact selection, quantity text, scoped readers and destination controls. Add connected return paths and compound equip/stow review without duplicating the inventory store.

**Recipe details and ordinary craft entry:** `apps/client/src/ui/recipe-details.tsx`, `inventions.tsx` and PW11 ordinary recipe inspection. The existing shared detail now says **Makes** for expected output; the follow-on adds actual produced-output presentation and a finite list entry point. Creator Work editing/Approve/Apply is not this queue.

**Inventory/current action facts:** `apps/server/src/inventory-view.ts`, `action-catalogue.ts` and existing API/command dispatch. Extend permitted task facts and shared native preparation; maintain ordinary inventory, contextual and NPC callers when shared facts change.

**Custody, packing and body equipment:** `packages/domain/src/objects.ts`, `item-handling.ts` and selected world handling/equipment definitions. Add explicit final stow destinations to the existing equip transaction. Reuse the same eligibility, conflict, quantity and final-load checks.

**Chosen finite work and outcomes:** `packages/domain/src/activity-execution.ts`, `action-experience.ts`, existing ActorPlan and native craft implementation. Admit a player-selected manufacturing program; edit only a pending suffix and support a pause at the next craft boundary. No second executor.

**Shelter form and preview:** `apps/client/src/ui/construction.tsx`, `packages/protocol/src/construction.ts` and the existing renderer preview-shape boundary. Preserve existing preview callback, plan/site/heading/material selections and family operations. Refine status, blockers and correction controls.

**Real construction and geometry:** the [shelter technical owner](editable-shelters-tech-design.md), [world profile](../worlds/base/editable-shelters.md) and domain/spatial/assembly owners. Reuse pure edit evaluation and admitted phases. Missing presentation facts are added at that owner; no React geometry simulation or extra saved transforms.

**Authoritative commit, replay and current records:** `apps/server/src/world-service.ts`, existing command receipts, `world-record-schema.ts`, `store.ts` and `game-saves.ts`. Save accepted work through existing catalog/transactions. Reconcile original outcomes before a new action; retain current authority across disclosure waits.

**Client identity and lifecycle:** existing API/private-draft ownership and connected world presentation, with [FRL05](../maintainers/ui-ux.md#future-improvements-from-the-foundation-review). Share a focused helper only where these real callers need it. Keep draft identity, read authority and world-render lifecycle separate.

Direct inventory transactions are not all reusable activity leaves today. Do not infer automatic transport from the existence of a generic finite plan. The selected crafting list contains native manufacturing; moving/equipping its products is a separate deliberate command. A future transport adapter requires its own supported invocation contract and qualification.

## 3. Task state and permitted preparation

### Three distinct records of meaning

**Draft:** owned by the existing scoped client-draft mechanism. It contains the selected task, exact item/definition references or explicitly selected supply semantics, input text, source/destination, intended arrangement and pending list order. It is neither authority nor reserved stock. Keep benign same-character renewal independent of its identity; genuine account/actor/world/timeline replacement clears or re-scopes it before any private rendering.

**Prepared review:** a read-only result bound to the exact draft and current relevant dependencies. It contains safe display facts, native support/availability, disclosable blockers, quantity/capacity/equipment effects and any checked construction shapes. Reuse existing exact preparation identities; a client digest is not a capability. Inputs, selected definition pins, custody, holds, current knowledge/access and relevant geometry can invalidate it. A failed or incomplete read cannot retain a selectable success result.

**Accepted execution/outcome:** authoritative existing command receipt and, for timed lists/builds, the existing native activity/phase record. It owns execution cursor, actually committed output references and interruptions. A browser optimistic state cannot advance it. An acknowledgement that work started is distinct from a terminal outcome that items were made or moved.

These are conceptual contracts for existing owners, not three new global tables or independent schema versions.

### Exact reads and disclosure

A task detail read starts from the authenticated actor, permitted selected item/container/recipe and current world timeline. Use exact lookup for a known selected identity; use the established bounded discovery route for lists. Preserve current versus last-inspected facts explicitly. Resolve native usable quantities through the reservation owner once per compatible read rather than recomputing totals independently in each component.

Opening list rows does not teach methods, read inscriptions, inspect unopened nested contents or acquire private history. Reuse the actual deliberate inspection route for those effects. Private reference/custody preparation and every awaited read recheck current disclosure immediately before return. An old result can be structurally valid but no longer disclosable after access, privacy, actor or timeline changes.

A combined review shows only permitted consequences. A concealed obstruction may cause a generic inability to complete the placement without naming the unseen actor. An inaccessible stow destination cannot leak its load or contents through the refusal. Search/filter/hover/pointer preview never broaden the admitted inspection scope.

### Review/commit agreement

Both the read-only review and actual command call the same native prerequisites and final-layout calculation. Each real effect rechecks current authority and relevant mutable dependencies. Keep exact reviewed candidate/destinations; a changed world yields a fresh refusal/review, not a substituted item, guessed floor, smaller quantity or relaxed keep-covered instruction.

Do not perform a speculative full command or allocate physical IDs simply to render every row. Use pure prerequisites and selected preparation where available; retained existing disposable preview semantics are not generalized into repeated whole-world copies.

## 4. Finite manufacturing list on the existing activity executor

### Admission and bindings

Add a bounded player request to the existing requested-activity path. Its logical payload identifies the current actor/control/timeline through server context, an operation identity, an expected current plan/revision for edits, and the finite ordered native manufacturing entries. Each entry identifies a known compatible recipe/version, number of crafts and its native argument bindings. Display labels and costs come from the installed definition, not the browser payload.

Use the existing native program representation, finite repeat support, invocation codecs and output binding rules. Validate bounded structure and encoded size before expanding counts or preparing every repetition. A positive integer craft count is not permission to build an unbounded expanded array. Entries cannot contain executable prose, arbitrary commands, private target references, invented recipe grants or silently generated ingredient acquisition.

Separate structural/dependency validation from current-step availability. At list admission, validate the whole supported finite program and its definition/reference shape, then check whether the first action can start. Later supported dependencies may refer to earlier real outputs or native supply selection; they are not required to exist at admission. Compute aggregate known requirements without double-allocating stock, and label uncertainty rather than predicting a future world.

Future entries make no new long-lived material reservation. Starting each craft invokes the existing action owner, which acquires the holds or consumes inputs at its actual defined phase. If the current executor cannot represent a requested dependency, refuse that composition explicitly; do not add an alternate crafting loop in the client. Actual outputs bind only after the owning commit and retain exact lot/individual identity and lineage through supported native rules.

### Execution controls and races

One actor continues using its existing physical lane and native scheduling. List progress is derived from the current program cursor and committed occurrences. Pending entries are a suffix of that program, not a separately polled authoritative queue.

For **Pause after this craft**, record a boundary-stop request with the existing current plan identity/revision. Serialize it with native step completion: if completion already won and the next craft started, report that actual current craft and apply the boundary stop to it; never pretend the previous craft is still running. If no craft is active, stop dispatching the next one immediately. This is a new narrowly scoped plan-control addition, not a promise of mid-action suspension for every family.

A pending-suffix edit is serialized against the current execution frontier. Recheck the expected plan/revision and exactly which entries remain unstarted. A craft that started while the player was editing cannot be edited, removed or reprioritized retroactively. Refuse the stale edit, retain the lawful draft and return the actual frontier. Pending producer/consumer ordering remains valid. Completed occurrences and the active leaf's progress are immutable to this edit.

**Stop current work** delegates to ordinary cancellation, preserving committed materials, partial structures and actual products as their owners specify. Clear the corresponding pending continuation so an intentional stop cannot start another craft. Never refund a consumed input because it was displayed in a list. A paused still-valid program resumes after revalidation; a cancelled leaf needs a fresh attempt. A failure ends this selected automatic continuation and requires an explicit review of the remainder, rather than background retry or silently skipping prerequisites.

### Outputs and follow-through

The owning craft publishes outputs at its existing native destination and records actual ports/quantities. The task projection exposes those actual products only under current disclosure. The UI's follow-through action binds the actual result reference, including a split/individual output, rather than searching by display name.

Initial output handling has **no automatic Move/Equip leaf and no output escrow**. The player deliberately chooses an ordinary next task. An output can be made successfully and later become unavailable or fail to fit a selected bag; maintain the crafting result while showing the separate move result. Where a recipe itself has a native destination/capacity rule, that rule still governs its own start/completion. The new UI cannot weaken it or create a buffer to avoid the failure.

The shared recipe's **Makes** wording is already corrected by the [imported-interface review](../verification/ui-implementation-review.md), independently of IWB delivery. Preserve it across reused recipe details. Qualify the new produced-output presentation with ordinary recipes and creator inspection without changing creator approvals or leaking private recipe provenance.

## 5. Compound equip-and-stow at the custody owner

Extend the existing equip command only with an optional explicit disposition for its actual conflicting equipment. The default ordinary path remains unchanged. The candidate must already be in this actor's accessible possessions; a ground pickup or social transfer is a separate action with its own timeline and receipt.

1. Resolve the candidate's exact live definition/quantity/placement, compatible body ports and current conflict set. Check installed support, actor capability and existing active-work/hold restrictions.
2. Resolve a destination for every displaced individual using the existing carried default or the user's explicit own-container choices. Refuse unknown, inaccessible, cyclic or extraneous bindings; do not silently ignore an undisposed conflict.
3. Prepare the **final** one-placement-per-item arrangement. Individualize only the selected unit when necessary; retain unaffected remainder and equipment. Calculate final ancestor/container loads from the native packing rules, accounting for the candidate leaving its bag and every conflict arriving or leaving.
4. Check the complete operation's authority, exact references, condition and reservations before publication. A full bag with a sufficient net release can succeed; an incompatible final layout cannot.
5. Commit all equipment/custody changes and the ordinary result atomically through the same native command transaction, or commit none. Update existing derived indexes/projections; do not write an independent equipped-item field.

Logical atomicity here concerns the existing ordinary equipment operation; it does not bypass authored work duration or allow instant remote movement. If a selected equipment family requires multiple timed effects, it must expose an honest phased contract rather than be mislabeled as this atomic swap. The initial consumer uses the currently supported equipment behavior.

The review supplies the same candidate/conflict/destination and native load effects; the client performs no duplicate subtraction or compatibility formula. Detailed outcomes distinguish admitted equip/stow, current refusal and unconfirmed publication. No implicit ground drop, recipient transfer, salvage, equip-all or best-gear heuristic is introduced. Existing gift/barter and construction claims remain protected through shared custody routes.

## 6. Construction review and correction on existing phases

`Construction` already stores the intended operation, site, heading, arrangement and exact material selections and already sends checked shapes through a renderer preview callback. Keep that boundary. Extend its read-only projection with the safe facts needed to distinguish unsupported, checking, incomplete, blocked and checked-for-this-draft results; do not create a second source of positions or structural truth.

Placement edits invalidate the exact review. Coalesce transient requests so a rapidly moving pointer cannot build an unlimited server queue; one latest requested draft supersedes older optional work. Cancellation or stale results cannot resurrect an earlier green ghost. Hiding/disconnecting removes the ghost; a permitted retained draft can later request new facts. Use the same semantic input state for pointer and named keyboard/non-drag controls.

Native preparation covers the entire actual part/body extents, thickness, intended support, attachment contacts, working stances, clearance and complete selected construction grants. Legitimate family-defined contact is not permission to ignore the containing structure or an unrelated blocker. Flat/sloped arrangements and neighboring structures require the existing exact query support; no raster snap is evidence of physical fit. Actual admission/effect phases check the current geometry again.

The reviewed command is built from the exact plan, not reread from changed uncontrolled fields at Submit. Relevant material usability, definition, authority or geometry changes invalidate the prior checked state but preserve the intended draft where disclosure permits. Simulation clock changes alone should not rebuild untimed geometry; actual timed material conditions remain dependencies where used.

**Correction** has two paths. Draft Back/Cancel changes no material. A postcommit replacement/extension/dismantle is a fresh supported native construction edit with real phases, reclaimed output destinations, temporary coverage and condition continuity. Use the existing keep-covered constraint and safe partial-work disposition; do not implement a universal rollback or duplicate saved salvage list.

A resulting structure's geometry changes through its actual assembly/placement owners and invalidates navigation/permitted views through existing revisions. Rebuild derived worker/GPU representations after restore; never persist those handles. No new physical shape, arbitrary rotation, occupied-building demolition, automatic decay or ownership shield is authorized by this presentation project.

## 7. Persistence, receipts and interruption

Accepted manufacturing-list content, current execution frontier and requested boundary pause belong to the existing saved actor-plan/activity records. Extend the current record codec/validation only for genuinely new control data and update all current callers together. Pending edits are not a new schedule database. Completed products, exact occurrences and material origins retain their existing owners. Full validation checks both active record → action and action → record relationships, with exact installed support for continuation.

Client drafts use the existing private scope/retention owner. Do not put quantities, private contents, actor plans or transient target references in shared URLs or telemetry. A temporary pointer gesture, selected ghost and cached green result are not durable gameplay. Retained draft intent after a current-format restore does not retain execution permission; a changed timeline must be freshly scoped and checked before submission.

The current pause/presence/lifecycle contract governs accepted work. Closing an ordinary task panel is not itself cancellation, while an actual human departure/load reconciliation can cancel unfinished physical work according to the existing world policy. No offline catch-up, human task resumption after death or revival of a terminal program is inferred from a saved pending list. Keep authentic uninterrupted native progress separate from an explicit new attempt.

For every new list-start/edit/control or equip/stow write, use the existing command operation/receipt boundary. Resolve an identical recorded outcome before attempting a new operation; conflicting content under one identity refuses. Recheck current disclosure after any await. The client first reconciles an unconfirmed write instead of issuing a new request ID. A terminal result retained after a gameplay rewind reports historical effects without permitting them to run on the replacement timeline.

Follow the root [development save policy](../../AGENTS.md#development-save-policy): current-format validation and coordinated current schema changes, no legacy reader, migration, compatibility alias or feature-specific save version. This design task resets no development data.

## 8. Cost, query growth and extension seams

**Item/destination review.** Growth comes from direct contents, nesting/ancestors and relevant destinations on explicit open/refresh. Reuse permitted indexes, exact selected identity and one reservation/load view per compatible read; invalidate access, custody, holds and relevant material changes. Measure complete cold/warm task calls, visited candidates, payload and browser cost. Returned-row count alone is insufficient.

**Manufacturing review.** Growth comes from selected entries, repeated craft counts, recipe requirements and candidate stock. Validate size/count before expansion and reuse immutable recipe facts plus a compatible free-stock snapshot. Exact definition, knowledge and resource changes invalidate it. Measure valid and impossible shared-input lists, multi-output/dependent entries and oversized finite-count rejection before allocation.

**Native continuation.** The growing source is one current actor program and its next due transition. Use the existing scheduler/frontier rather than scanning all future entries or all actors' lists every tick. Measure start, phase completion, the boundary-pause/edit race, cancellation and current-format reopen through real callers.

**Equip/stow.** Work grows with actual conflicting equipment, selected containers/ancestors and affected loads. Reuse equipment/placement/custody queries and one complete native final-layout preparation. Measure full-to-full net-valid and impossible cases, deeper nesting and held/changed items, including final commit and publication.

**Construction preview.** Work grows with the selected assembly/parts, conservative local geometry candidates and rapid editing. Bound optional requests to one in flight plus the latest replacement, using existing geometry preparation and real relevant revisions. Measure blocked/valid flat and slope, concentrated edits, occupied working stances, cold preparation and renderer disposal.

Use [IWB-L02](../limits/item-and-building-workflows.md#iwb-l02), [IWB-L05](../limits/item-and-building-workflows.md#iwb-l05) and the owning existing action/object/interface/spatial allowances. No new total item cap or performance guarantee is selected. A bounded result page must not repeatedly scan or hydrate the full world. Future exact APIs should share native prerequisite owners, not copy their logic into each UI consumer. Optional reading/preview cannot create a new technical pause for the entire world; genuine required preparation at action start follows the existing service contract.

Reuse the existing privacy/identity helper only when the two actual consumers need identical behavior, as FRL05 requires. Do not generalize four task panels into an all-purpose mutable workflow engine. A future world with a different packing metric, body layout or manufacturing output cardinality should use the same narrow contracts; a missing native behavior stays unsupported rather than being interpreted by generated code.

## 9. Implementation modules and verification boundary

**IWB01 — ND13 / ND07:** shared exact-task facts and scoped draft/read/outcome continuity, with no new authority owner. Depends on existing PW04/PW11/SH/native foundations.

**IWB02 — ND13:** native equip/stow destination operation, final-load review and connected equipment controls. Depends on IWB01.

**IWB03 — ND13:** bounded player manufacturing-list admission, pending-suffix editing and boundary-pause lifecycle. Depends on IWB01 and existing activity execution.

**IWB04 — ND13:** list UI, prospective-versus-produced language and explicit output follow-through. Depends on IWB03.

**IWB05 — ND07:** current construction preview/blocker/correction refinement with ordinary use/return. Depends on IWB01 and existing SH phases.

**IWB06 — ND13 / ND07:** connected task transitions, exact write reconciliation and current-format lifecycle integration. Depends on IWB02, IWB04 and IWB05.

**IWB07 — ND13 / ND07:** complete selected journeys, focused work-growth measurements and final documentation reconciliation. Depends on IWB06; checks also accompany each preceding slice.

The [tracker](../maintainers/item-and-building-workflows.md) owns checkboxes, scoped delivery and concrete exits. No module is complete because a design paragraph exists. No shared foundation release gate is closed by this table.

This task changes **zero runtime logic lines**. Later implementation is a multi-owner change whose largest risks are compound custody, timed list edits and disclosure/continuation, not appearance. Reassess the concrete code size and smallest checks per module before coding rather than invent a precise line estimate from document length. IWB02 and IWB05 can proceed independently once IWB01's shared contracts are settled; IWB03/04 share activity/projection code and need one coordinated owner.

Select existing focused native/database/browser checks where they exercise the changed caller, plus small manual scenarios for uncovered cases under the repository verification policy. Do not introduce a blanket new suite as a design prerequisite. Future qualification must include a meaningful failure as well as the happy path, actual pointer/keyboard/no-drag behavior, current-format PostgreSQL recovery and privacy races. Record code/native, supplied-fixture, real browser, performance and uncoached human evidence separately. No runtime, accessibility, Rust footage or benchmark result is claimed here.
