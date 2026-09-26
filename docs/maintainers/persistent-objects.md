# Persistent objects — DF01 / BW07 subtracker

**Status:** all implementation/qualification items below remain open. This decomposes [DF01](production-data.md) and [BW07](base-world.md), coordinated with INV-6, P1 claims, P2 authority and SL00. It does not create a competing inventory or ownership roadmap. [Feature specification](../projects/persistent-objects-feature-spec.md) and [technical design](../projects/persistent-objects-tech-design.md) own the proposed project.

Obtain design approval before coding. Reconcile DF02 and the relevant action/invention branches first where paths overlap; retain their current receipts and semantic owners. Each new state owner must join SL00 in its introducing slice.

## PO01 — Inventory, spatial and reference audit

- [ ] Map `world.items`, definition-only merges, `addItem`, pickup/drop/equip/craft/eat/harvest, direct entity-position assumptions, body/spatial queries, editor/context/views and current canonical record codecs.
- [ ] Audit active process/equipment/reservation and historical references to item IDs; distinguish a lot from an already individualized object. Inspect actual entity/item ID collisions and quantity precision without resetting worlds.
- [ ] Record exact bases, unchanged base-world pickup/portability semantics, intentional equipped-unit refinement and a representative native baseline.

**Dependencies:** DF02 for overlapping code. **Exit:** complete source/owner/referrer map and supported migration shape; unknown referrers or collisions remain explicit blockers to conversion, not guessed aliases.

## PO02 — One entity/lot/placement owner and in-place conversion

- [ ] Evolve `sim_items` into entity-backed item components, extend `sim_placements` to one tagged world/contained/attached record and keep geometry separate. Remove duplicate writable item/location representations at cutover.
- [ ] Add required scoped identity uniqueness and semantic-reference constraints; keep physical containment independent of RecordNode structural cascade FKs.
- [ ] Preserve IDs, quantities, definitions, custody, current geometry and typed equipment/process references in a checked source-revision migration. Verify before atomically switching readers/writers; reject unsupported conversion with the old world intact.

**Dependencies:** PO01; current data migration and SL00 owner. **Exit:** native world roots and contained objects have coherent placement without fake XYZ or a second inventory list; both database adapters preserve all existing supported state.

## PO03 — Lot operations, identity and lineage

- [ ] Implement strict split/merge/individualize operations with safe quantities, exact definition/unit/state/provenance compatibility and explicit individual status.
- [ ] Preserve whole unmerged identities, create deterministic split IDs, and retire merged/consumed sources with scoped lineage. No automatic actionable successor alias.
- [ ] Move all definition-only merge bypasses to the same validator; reject incompatible active references, containers, equipment and reservations unless the owning operation supports rebinding.

**Dependencies:** PO02; P1 claim envelope. **Exit:** totals remain conserved across compatible operations; unique state and retained references survive, while stale mutable references reject honestly.

## PO04 — Atomic custody and individual equipment

- [ ] Route pickup/drop/transfer/equip/unequip through one transaction with current P2 scope, revisions, portability, reach, capability and source/destination validation.
- [ ] Individualize one equipped unit from a stack and preserve ordinary gathering-tool use. Reconcile the base-world item spec's equipped-stack behavior explicitly.
- [ ] Retain Pick Up All's eligible-at-completion selection and all-or-nothing default; couple quantity/placement/attachment/receipt updates and ambiguous-acknowledgement recovery.

**Dependencies:** PO03; existing action owner and BW05 branch integration. **Exit:** exact equipped unit follows custody, retries do not duplicate transfer, and real two-human last-item competition uses the same native boundary.

## PO05 — One useful nested finite-capacity container

- [ ] Add the portable bag/container capability through existing native definition admission, with explicit authored packing-load compatibility and finite capacity. Do not impose new global actor encumbrance.
- [ ] Implement bounded ancestor cycle/depth/slot checks, nested load accounting, net shared-ancestor updates and source-revisioned derived load summaries.
- [ ] Make whole-container movement change the root and affected ancestors rather than every descendant's persisted position. Keep contained contents out of independent spatial participation unless an actual exposed-attachment rule applies.

**Dependencies:** PO02–PO04. **Exit:** an ordinary bag with food/tool content can nest/move/use/save; self/ancestor cycles, occupied slots, unknown load and overflow fail without partial movement or lost contents.

## PO06 — Ownership, work and removal integration

- [ ] Support the explicit declared-owner consumer with distinct custody/access/author rights and permitted editor/inspection; do not infer legal title from old `ownerId`.
- [ ] Integrate craft/consume/output/reservation operations with P1 and existing native progress. Moving or splitting a reserved source must not steal another process's allocation.
- [ ] Block nonempty retirement without an admitted disposition; retain tombstone/lineage/pins for references. Supply INV-5 activation/retirement dependencies, not a second installer or invented destruction policy.

**Dependencies:** PO03–PO05; P1; INV/EWF07. **Exit:** declared owner differs from current holder when authored, interrupted work preserves actual inputs/outputs, and container deletion cannot cascade away possessions.

## PO07 — Scoped UI, context and action discovery

- [ ] Extend existing item/detail/action surfaces with individual/container state, permitted location/ownership and useful capacity/compatibility failures.
- [ ] Add bounded direct-child pages, breadcrumbs and searchable complete access; keep renderer artwork limits separate from stored content. Fence pages/caches by container, timeline and current disclosure.
- [ ] Use the existing action/freeform/world-agent binding and admission route. Reject hidden descendant counts/IDs/packing totals and avoid hover/read-triggered provider calls.

**Dependencies:** PO04–PO06; MP01 and existing catalogue/knowledge owners. **Exit:** real ordinary clients can navigate/use all authorized contents without private payload leaks or an alternate mutation path.

## PO08 — Save, inactivity and cold continuity

- [ ] Join active lots/placements, required cold tombstones/lineage, reservations, container state and exact pins to SL00 consistent capture and restore.
- [ ] Validate complete reference/cycle/quantity/equipment invariants before installation; rebuild derived indexes/summaries, preserve current privacy/accounting and reject stale callbacks.
- [ ] Integrate P2 human inactive roots without activating carried children or granting protection to detached world property. Exercise return and changed geometry.

**Dependencies:** introducing state slices above; MP04; SL00. **Exit:** restart/restore during nested work preserves one object graph, actual progress and possessions; unavailable data cannot be silently dropped.

## PO09 — Native, database, UI and performance qualification

- [ ] Exercise every acceptance case in the paired docs using disposable worlds and zero provider budget, including opposing nested moves, shared ancestors, cold retired references, active-equipment migration and failed multi-item work.
- [ ] Compare row/quantity/reference/pin totals across commits and both database adapters; inspect browser/network behavior for large and private containers.
- [ ] Measure bounded child lookup, ancestor work, root movement, index rebuild, history residency, save/capture size and contention under PF's mixed workload. Record current behavior in Architecture, actual evidence in Verification and unresolved regression/hosted gates here; retain CI and default no-suite instructions.

**Dependencies:** PO01–PO08. **Exit:** the real tool/bag/stack loops and meaningful failures are evidenced; this does not close arbitrary construction, D6 cross-region transfer or first-release scale qualification.
