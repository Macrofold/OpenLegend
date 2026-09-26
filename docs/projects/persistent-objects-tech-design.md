# Persistent objects, custody, ownership and containment — technical design

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. [Feature specification](persistent-objects-feature-spec.md) owns behavior. [PO01–PO09](../maintainers/persistent-objects.md) refines DF01/BW07; P1 owns claims, P2 current authority, P4 dependency invalidation, and SL00 consistent capture.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Concrete baseline and migration consequence

Inspected main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`: [item-handling.ts](../../packages/domain/src/item-handling.ts) stores `ItemInstance { id, ownerId, definitionId, quantity }`, indexes immutable custody snapshots and merges by definition. Full unmerged movement preserves the ID; exhausted merged sources are deleted. `ownerId` is physical custody, not legal title. [world-record-schema.ts](../../apps/server/src/world-record-schema.ts) already has `sim_items` with indexed item/owner/definition/quantity, `sim_entities`, `sim_placements` and `sim_entity_geometry`. [WorldRecords](../../apps/server/src/world-records.ts) owns canonical record extraction and the world revision fence.

Important implementation fact: record IDs are storage-path identities, while entity/item IDs are domain identities. Current RecordNode parent FKs express owned storage subrecords. They must not become physical containment FKs with cascade deletion. A bag's contents are independent entities, not owned JSON children destroyed when the bag row is deleted.

Use the [production possessions model](../../archive/07-technical-architecture/production-data-model.md#6-possessions-inventory-resources-and-construction) and [base-world items](../worlds/base/items.md). Evolve current records in place; do not add a second inventory JSON list, spatial position or item registry. The new object model requires explicit adaptation of code that assumes every entity has an independent XYZ position.

## 2. Identity and canonical representation

Every independently persistent physical item or homogeneous lot becomes an entity with an item component. A quantity-one tool or bag is an individual lot. A stack is one entity representing equivalent units, not many fabricated hidden per-unit IDs. Definitions remain immutable pinned mechanics; instances retain their own identity and state.

Proposed domain structure:

```ts
type Placement =
  | { mode: 'world'; position: XYZ; supportRef: string; revision: number }
  | { mode: 'contained'; parentEntityId: string; slot?: string; revision: number }
  | { mode: 'attached'; parentEntityId: string; portId: string; revision: number };

interface ItemLot {
  definitionPin: DefinitionPin;
  quantityQuanta: number;
  unitPin: DefinitionPin;
  individuality: 'homogeneous' | 'individual';
  stateRevision: number;
}

interface ContainerCapability {
  definitionPin: DefinitionPin;
  inventoryRevision: number;
  subtreeRevision: number;
}
```

These are proposed internal names; integrate with existing entity/component and pin types rather than duplicate them. Active physical entities have exactly one placement. Body geometry/heading remain their existing capability. Contained items do not carry a fake authoritative world position. Read-only spatial projections resolve their root placement when needed; renderer/public DTOs may continue presenting XYZ for eligible visible objects.

Refactor `sim_placements` into the sole tagged placement owner, moving existing world position/support bindings through a checked conversion. Remove the old writable position/support representation at cutover. Keep `sim_entity_geometry` for body/shape/heading, not a second location. Adapt domain spatial accessors, movement, perception, navigation and edits to query/update that owner. Preserve current root-object movement and geometry outcomes; this is not a new physics solver.

Active items keep positive safe-integer quantity. Retirement removes availability and the active item component while retaining an entity lifecycle tombstone and lineage/receipt references; do not keep a zero-quantity interactable item. Cold retired history is queried through scoped repositories, not scanned as active simulation objects. SL00 must capture that cold continuity as well as the loaded working set.

## 3. Storage changes and indexes

Extend current record ownership as follows; exact migration version is selected after DF02 reconciliation, not hard-coded against a moving branch:

| Existing/new logical record         | Required change and access path                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sim_entities`                      | Preserve domain identity; distinguish active versus retired physical identity. Validate and uniquely index `(world_id, entity_id)` before semantic references use it.                                      |
| `sim_items`                         | Reparent the active lot component to its entity; retain definition/unit pins, checked quantity and individual/homogeneous state. Retire the top-level independently writable `world.items` representation. |
| `sim_placements`                    | One row per active physical entity; tagged world/contained/attached fields with row-local exclusivity checks; indexes on parent/slot and attachment parent/port.                                           |
| `sim_entity_geometry`               | Shape/body data only; no independently writable duplicate support/location.                                                                                                                                |
| Consumed container records          | Pinned policy and inventory/subtree revisions; a transactionally maintained load summary is derived, never independently editable.                                                                         |
| Consumed ownership-interest records | Initially only explicit declared ownership required by this consumer; world-entity holder, kind, source/receipt and revision. No inferred account-title or speculative financial ownership tables.         |
| Lineage/retirement records          | Source/successor identities, operation kind, quantity/unit and commit/receipt; indexed source and destination lookup. Preserve historical identity without actionable redirection.                         |
| Reservations/transfers              | Reuse P1's resource owner and records; do not introduce inventory-specific balances or reservations.                                                                                                       |

Storage structural `parent_id` is distinct from semantic `parentEntityId`. Physical containment references use world-local identity and restrictive deletion semantics. SQL checks enforce within-row placement alternatives and scalar bounds; acyclicity, capacity and coupled transfer require the same transactional domain validator. Current `CREATE TABLE IF NOT EXISTS` generation alone does not migrate existing FKs, columns or indexes.

Do not serialize an inventory list on the actor/container. Inventory is a bounded query over placement. For hot domain work, maintain immutable-snapshot indexes keyed by canonical revisions; rebuild safely after load. Preserve the current optimization of avoiding stale cached reads on mutable/Immer drafts.

## 4. Operation surface and authority

Reuse native action admission and the current catalogue/freeform action foundation. Supported operations are explicit `transferLot`, `splitLot`, `mergeLots`, `individualizeForEquip`, `attach/detach`, and family-specific create/consume/output operations. Each has an operation ID, expected source/destination revisions, current actor/principal scope and typed target bindings. No generic “move any entity anywhere” API is exposed to ordinary players.

Creator spawn remains INV's authorized source operation; crafting/harvesting consume and create through declared rules. An authorized declared-ownership edit changes only that interest record. Physical access, portability, reach, body capability, action occupation, source claims and destination access are separate validations.

Ordinary transfers do not adjudicate theft. The first admitted container access policy can permit its current custodian and explicit approved operations; unknown access is denied. World rules may later authorize other transfers. A creator's account authorship does not grant character recognition, physical custody or another human's private contents.

Results include actual moved/consumed quantity, surviving/new/retired identities, placement revisions and sanitized fulfillment/failure. Returning a lineage link is not permission to act on its successor. An old command addressing a consumed/merged lot returns retired/stale or its existing receipt; it never silently targets whatever now resembles that object.

## 5. Atomic transfer algorithm

1. Resolve current permitted actor, item and source/destination roots. Validate world/timeline/control, expected revisions, definition pins, portability/access, reach and action state. For Pick Up All, select eligible current contents at completion as required by the base-world contract.
2. Build a bounded affected set: selected lots, existing holds, destination merge candidates, source/destination ancestor paths, relevant equipment/slots and definition/capacity pins. Do not discover an unbounded descendant set during commit.
3. Check cycles by walking the destination ancestor chain: destination cannot be the source item or inside its subtree. Enforce the admitted ancestry-depth bound as an operational/definition compatibility boundary, not silent flattening. Validate current ancestor revisions under the writer.
4. Compute the complete proposed quantity/placement/attachment/merge plan. P1 acquires required free quantities; other processes' holds are unavailable. Calculate every affected capacity and slot change before mutation.
5. Commit the full plan through one domain draft and the existing world transaction: quantities, identity creation/retirement, placements, equipment, capacity revisions, reservations, discrete transfer evidence, required events, receipt and invalidation. SQL publication checks the world/row fences. No user/provider/network work occurs while locks are held.
6. Publish only the committed permitted outcome. Ambiguous acknowledgement resolves the original receipt. Failure anywhere before commit leaves all selected items and quantities untouched.

Lock/update affected identities in a deterministic order, not caller-supplied order. Two opposing bag moves cannot evade a cycle check through independently committed halves. With one writer, native planning is serialized; database fences still protect restart and stale workers. Cross-region distributed transfer is deliberately not implemented here.

## 6. Split, merge, individualization and references

A proper split requires `0 < requested < available source quantity` with free-quantity/hold rules. Allocate one saved deterministic identity for the output, debit the source and record lineage in the same commit. A whole unmerged move preserves the original ID instead of manufacturing a split. Holds stay on their original units unless the owning process explicitly supports rebinding; ordinary splitting does not move another process's reservation.

Merge equivalence includes exact item/mechanic/unit pins, admitted homogeneous state, quality/conditions where present, individuality, ownership/provenance obligations and active reference constraints. A digest is a lookup accelerator; compare the canonical relevant payload before accepting equivalence. Containers and individually meaningful objects are not mergeable in v1. Equipped, attached, reserved or otherwise identity-bound inputs reject merge unless a later family supplies an explicit supported rebinding operation.

Use one surviving lot and retire each consumed source with lineage. Do not overwrite a source's full historical identity with a mutable alias. Definition-only `addItem`/pickup/drop/craft merge paths must all move to this rule; fixing only the container UI would leave a bypass.

Equipping from a multi-unit homogeneous lot individualizes one unit and binds the exact resulting entity to the existing equipment port. Preserve quantity and return the new selected identity. On migration, existing equipped stacks require a typed reference audit: preserve the original bulk ID, materialize the selected unit with deterministic lineage, and rebind only explicitly understood active equipment/process references. Unknown or incompatible active references block that conversion rather than being guessed. Single-unit equipment retains its identity unchanged.

Existing base behavior must be reconciled explicitly: current partial dropping of an equipped stack becomes dropping the unequipped remainder, while moving the selected unit detaches it. No new tool wear is required; the real gathering modifier and the bag's container component establish individual identity consumers.

## 7. Capacity, nesting and efficient movement

The first bag family consumes authored integer packing-load units. It declares a finite capacity and compatible item-load metadata. The metric is labeled as packing load, not invented kilograms or physically derived volume. Unknown/nonapplicable packing metadata cannot be treated as zero. Existing actor inventories retain their current capacity policy; adding a bag does not impose new global encumbrance.

Compute subtree load from the item's admitted own load plus included contents under the pinned policy. A nested bag does not hide its children's load when the outer bag's rule includes them. Keep this algebra a finite reviewed capacity provider, not an arbitrary expression interpreter. Use checked integer arithmetic and explicit capacity failure; no automatic content deletion, repacking or partial Pick Up All.

Maintain load summaries transactionally along affected ancestor paths. Each summary binds to the container's subtree revision and capacity/definition pins. A canonical child mutation bumps ancestors and updates/invalidate summaries in the same commit. A stale or unavailable summary cannot authorize capacity; recompute through a bounded validated query or refuse/defer admission safely. Shared ancestors receive the net delta once, avoiding double counting when moving between sibling bags.

Moving a whole bag changes its root placement and old/new ancestor aggregates, not every child's stored XYZ. The bag's subtree is unchanged; effective location is derived through ancestry. Spatial broad-phase participation belongs to actual exposed/world roots and supported attachments, not every hidden content item. P4 receives old/new root scopes plus inventory/subtree revisions. Exposing contents through an authorized inspection does not make them independently visible or targetable at a fabricated position.

A future real mass/volume/assembly provider must define its own metric and qualified spatial effects. Supporting typed capacity metadata is not a completed rigid-body or structural-stability model.

## 8. Removal, processing and ownership lifecycle

A nonempty container cannot disappear through cascade deletion. V1 default is to reject retirement until an admitted explicit content-disposition operation succeeds. Empty removal, ordinary consumption, destruction and world reset have separate authorized paths. A destruction mechanic that scatters, transforms or destroys contents requires its own approved rule; this project does not assume it.

Craft/eat/harvest/reservoir output operations use P1 claims, native progress and atomic results. Cancellation releases unused holds, preserves consumed inputs and does not double-credit outputs. Items bound to unsupported running work cannot be moved by bypassing the action owner. Definition retirement retains pins for objects, processes, retained saves and required history; INV-5 owns supported transformation.

Declared ownership is an optional factual interest under an admitted world policy. Migration of old `ownerId` creates custody placement only. The first consumed ownership operation is an explicitly authorized declaration/correction, with independent holder and disclosure; it neither moves the object nor invents theft, trade or inheritance rights. Multiple contested claims/shares are deferred until a real consumer exists.

P2 inactive human participation suppresses the carried root's active bodily/world targeting as specified by lifecycle policy. Containment must not independently reactivate those possessions. Detached structures remain world objects; no offline protection follows from a holder/account relationship.

## 9. Identity-preserving migration and save/load

PO02 quiesces the current writer and validates source record revision. Promote current item IDs to entity identities, checking collisions with existing entity IDs first. Preserve current definitions, quantities, owner-as-custody, pile geometry, equipment, pending actions, holds, histories and receipts. Collision or unknown references produce a report with the original world untouched; no automatic renaming/reset is authorized.

Convert actor/pile custody into placement, existing root XYZ/support into the single placement representation, and current equipped references through the reviewed individualization plan. Rebuild dialect-specific schema/FKs/indexes with the current migration machinery, verify row/quantity/reference totals and switch canonical record ownership atomically. Old writable `world.items` and duplicate location fields are removed after verified cutover; an export/view projection is not a competing owner.

Do not invent legal ownership, character recognition or item damage during migration. Missing newly applicable state follows explicit admitted initialization; an unsupported instance remains unavailable for that mechanic until initialized. Keep source checksums, conversion receipt and exact definition bytes; retain rollback before publication. After new writes, rollback requires a real reverse migration or authorized restore, never reopening stale source state silently.

SL00 capture includes active entities/lots/placements, cold lifecycle and lineage required by retained references, container state/summaries or rebuild inputs, holds, processes and pins. Restore validates cycles, positive live quantities, required definitions, valid equipment and complete references before installing, then rebuilds derived indexes. Current grants/forgetting/accounting and new timeline fences remain outside rewind. No missing-data fallback may drop a bag, an ingredient or a child's identity.

## 10. Views, work bounds and evidence

Inventory/context/detail callers query permitted direct children with stable continuation tied to container/timeline/disclosure revision. Changed contents either use documented live-page semantics or require restart; never claim a complete snapshot from inconsistent pages. Public pile behavior remains as authored, but private containers must not reveal counts or packing totals through hidden rows. A visible container is not authorization to enumerate all descendants.

Use existing searchable menus and detail panels, with breadcrumbs and explicit capacity/compatibility feedback. Large lists remain fully accessible via pages/search; renderer artwork caps do not cap storage. World-agent tools use the same typed reads and candidate operations, and no hover/read triggers paid work. Reconcile the action-foundation branch before adding typed bindings; do not create another action registry.

Complexity targets: direct child query proportional to returned page; cycle/ancestor validation proportional to bounded depth; root bag movement proportional to affected ancestor paths and explicit exposed attachments, not all descendants; active mutation proportional to selected lots/claims. Instrument pathological wide/deep containers, many equivalent stacks, mature retired history, contention and save/capture size. Budget exhaustion is an explicit failure, not proof that contents do not exist.

[PO01–PO09](../maintainers/persistent-objects.md) supplies ordered work. Planning envelope: approximately 2,500–5,000 production logic lines across domain item/spatial adapters, canonical records/migrations, action/context and client views; PO01 must refine this with the actual direct-position and inventory caller audit.

Required native/manual evidence includes all feature scenarios, both SQL adapters, failed multi-item transfer, opposing nested moves, ancestor capacity changes, reservation interference, dropped acknowledgements, migration with active equipment, nonempty retirement, delayed old references and restore. Compare total quantities and pins before/after each committed operation. Record network privacy and real browser list behavior separately from native invariants. Follow default verification rules: no newly authored/run automated suites, no paid execution required, CI/deferred regression coverage remains open.

## 11. Alternatives and primary mechanism references

Rejected: keeping independent inventory arrays; copying XYZ into every carried descendant; merging by definition alone; making lineage an actionable redirect; using record-tree cascade as containment; deriving title from custody; deleting contents on capacity/removal failure; and implementing physical mass/rigid-body simulation before a useful bag.

Proposed design uses entity-backed lots, one tagged placement, exact merge compatibility, explicit lifecycle/lineage, bounded ancestor updates and current transactions. No blocking product choice remains; new legal/property/destruction semantics require separate world decisions.

Consulted September 26, 2026: PostgreSQL [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) explains why a row CHECK is not a cross-row graph invariant; [locking](https://www.postgresql.org/docs/18/explicit-locking.html) informs stable short transaction ordering; SQLite [foreign keys](https://www.sqlite.org/foreignkeys.html) supplies adapter-specific enforcement/migration considerations. Those mechanisms support, rather than replace, native containment and capacity validation.

## Maintained records

- Implementation: [Feature tasks](../maintainers/persistent-objects.md).
- Limits and constraints: [Objects, inventory and equipment inventory](../limits/objects.md).
