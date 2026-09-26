# Persistent objects, custody, ownership and containment — feature specification

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. Priority 3. [Technical design](persistent-objects-tech-design.md) defines storage and algorithms; [PO01–PO09](../maintainers/persistent-objects.md) decomposes DF01/BW07 and coordinates INV-6/SL00. [Foundation package](foundations-1-5.md) applies.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Outcome

A particular object remains the same object when picked up, equipped, placed in a bag, given to someone else, dropped, used in supported construction or restored from a save. Homogeneous material can remain an efficient stack; individually meaningful state must not be erased by merging it with a superficially similar item.

There is one physical placement per active object, one authoritative quantity per lot, and an explicit distinction among custody, declared fictional ownership, account authorship and permission to perform an action. A bag does not duplicate its contents when moved, and being its fictional owner does not automatically disclose everything its current holder knows.

## 2. Existing behavior and inherited contracts

At main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`, [item-handling.ts](../../packages/domain/src/item-handling.ts) supports ordinary stacks, actor/pile custody, whole/partial transfers and equipment cleanup. Current merging compares definition identity; depleted stacks are removed. [Current records](../../apps/server/src/world-record-schema.ts) already persist `sim_items`, `sim_entities`, `sim_placements` and geometry separately. This project evolves those records rather than introducing a parallel inventory database.

[Base-world items](../worlds/base/items.md), [action capabilities](../action-capabilities.md#12-manipulation-transfer-and-process-use), [production possessions](../../archive/07-technical-architecture/production-data-model.md#6-possessions-inventory-resources-and-construction), [save/load](../save-and-load.md) and [declaration lifecycle](../../archive/07-technical-architecture/declarations-and-evolution.md) remain governing contracts. Current native pickup approach/reach, portability and final-state validation remain intact. Pick Up All continues to mean eligible contents at completion, not a stale list captured when a menu opened.

## 3. Concrete journeys

### A. One tool, many locations

An actor crafts or selects a portable gathering tool, equips one actual unit, uses the existing supported tool effect, unequips it and hands or drops it into a container. Inspection, future action references and save/reload identify the same unit. Any admitted per-instance state travels with it; another tool of the same definition is not silently substituted.

When equipping from a homogeneous multi-unit stack, the new operation selects/individualizes one unit atomically. The remaining units remain a stack. This is an explicit refinement of the current equipped-stack model: dropping some unequipped remainder does not unequip the selected tool, and transferring that exact equipped unit clears or changes its attachment through the same operation. Do not add durability, enchantments or a new combat system merely to demonstrate identity.

### B. A real bag with finite authored capacity

A character puts tools and food into a portable bag, then places that bag in another supported container. Moving the outer bag moves the contents' effective location without rewriting their identities or copying their inventory. The bag itself is an individual entity with a container capability, not a stackable counter concealing many separate interiors.

The first consumer uses an explicit authored packing-load rule, not a claim to simulate physical mass. Definitions supply the admitted load contribution; the bag has a finite configured limit. Nested contents count under the selected rule. Unknown packing compatibility is not free capacity. The ordinary actor inventory is not suddenly given a new weight penalty by this project.

A bag cannot contain itself or one of its ancestors. An occupied equipment slot cannot hold two objects. Putting too much into a bag fails without moving part of the selection unless an explicitly supported partial operation was chosen. The UI explains permitted capacity/compatibility blockers.

### C. Split, merge and remember

Ten equivalent stones split into lots of four and six. The original lot is debited and the new lot receives a fresh identity in one transaction. Merging compatible free lots preserves quantity and records retirement/lineage for the consumed identity. A retained observation about the earlier lot remains understandable.

A named/individualized tool, a container with its own state, an equipped unit, a reserved ingredient or items with incompatible definition/state/provenance cannot be casually merged. Old actionable references to retired lots fail as stale; a historical lineage link does not let an old “use this item” command spend a different current object.

### D. Custody and ownership differ

A creator or supported world rule may record that a tool's declared fictional owner is Ada while Bo currently carries it. Inspection distinguishes the two only where disclosure allows. Moving the tool changes custody, not automatically its declared owner. Changing the declared owner does not teleport it.

The current `ownerId` field means custody and must not be migrated into a claim of legal ownership. Unstated ownership stays unstated. The first slice supports explicit admitted ownership metadata and authorized editing/inspection; contested title, theft judgments, trade consent and inheritance require their own world rules. Account-level invention authorship and redistribution rights never become physical custody.

### E. Work is interrupted or contested

A recipe reserves ingredients, then another request attempts to move or consume them. Current reservations and action policy decide admission, with one atomic result. Cancellation releases unused reservations; completed consumption is not refunded. A failed action cannot leave its ingredients debited and its output missing.

Two humans pick up the last food or bag. One receives the real object; the other sees a stale/unavailable outcome. A lost response and retry cannot duplicate either the bag or its nested contents. P2 supplies current principals/control; the same mechanical transaction is used by native NPC actions.

### F. Save, removal and inactivity

Save during nested containment, partial crafting or equipped work. Restart/restore retains exact identities, quantities, placements, reservations and definition pins. Missing references or a containment cycle reject installation before replacing the current world.

Retiring a container cannot erase its contents by database cascade. The operation must use an admitted explicit disposition—empty it, move contents to an allowed destination, or block retirement. Consuming or destroying an object records its lifecycle/lineage while required history still refers to it; it does not leave an interactable ghost.

An inactive human's carried containment root follows the accepted protected-body lifecycle, without independently simulating hidden possessions as loose world targets. Detached buildings and property remain subject to world rules; this project does not create offline property protection.

## 4. Interaction and authoring requirements

Object details expose instance identity where useful, definition/version, current permitted location, quantity, equipment/container state and distinct known ownership. The ordinary interface shows names and useful distinctions rather than raw database keys. Tools receive stable server-bound references under the same disclosure rules.

Container navigation uses bounded pages/breadcrumbs with search or continuation for large inventories. Presentation limits never discard stored contents or make an authorized item permanently inaccessible. Closed/private contents are not leaked through counts, capacity explanations, hover artwork or action previews. Whether another person's contents are accessible is an admitted world access rule, not a client toggle.

Use existing pickup/drop/equip/crafting commands and the action catalogue, with family-specific container transfer bindings. Do not create a second repertoire, a browser-side inventory mutation path or a new invention language. Creator definition editing uses the existing draft/admission/activation workflow. The first bag and tool consumer may be seeded native definitions; arbitrary live-generated container families remain INV release work unless their complete workflow is qualified.

## 5. Stages and non-goals

**Stage 1:** preserve current objects/stacks while unifying identity and placement ownership through checked in-place migration. Keep public XYZ views working without giving contained objects a fake independent position.

**Stage 2:** implement stable lot operations, lifecycle/lineage, resource claims and individual equipment selection. Preserve current pickup/drop semantics and successful native gathering.

**Stage 3:** add one useful portable bag with finite packing-load capacity, nesting, correct aggregate updates and safe retirement. Demonstrate distinct declared ownership without inventing a legal system.

**Stage 4:** integrate all permitted views/actions, save/lifecycle/invention dependencies and the two-human contention proof; qualify current-record performance.

Out of scope: full encumbrance simulation, scattering/falling inventory physics, rigid-body assemblies, general construction destruction, economic ownership law, arbitrary scripts, distributed cross-region transfer and exhaustive material properties. Stable attachment ports are included only for the existing equipment consumer; general structural supports stay with spatial/INV owners.

## 6. Acceptance

PO01–PO09 must demonstrate an individual tool and nested finite-capacity bag through actual ordinary actions, not only database rows. Required cases: full and partial stack transfer; individualization and equipment; exact/unequal merge compatibility; retired reference; last-item race; same-ID retry; unknown load; capacity exceeded; same/ancestor container cycle; shared old/new ancestor capacity; reserved-item conflict; failed crafting; nonempty-container removal; large permitted contents; hidden contents; restart/restore with pending work; and inactive human belongings.

Quantity totals and admitted sources/sinks reconcile at each committed step. Every active physical object has one valid placement; every retained reference has a current target or explicit lifecycle/lineage outcome. Moving one container should not require a persistent position write for every descendant. Measure both database behavior and client lists; a native proof does not qualify hosted scale.

## 7. Decisions and questions

Accepted defaults: quantity-one individual containers/equipped units, explicit merge equivalence rather than definition-only merging, no automatic actionable aliasing after retirement, authored packing-load capacity for the first bag, no new actor encumbrance, and declared ownership separate from custody. Update the base-world item contract alongside implementation of its intentional equipped-unit refinement.

**Blocking product questions: none for this foundation.** New theft/trade/destruction policies and physical weight balancing are not silently decided here. A real migration collision or unsupported disposition must be resolved before conversion/retirement, with the original state preserved.

## Maintained records

- Implementation: [Feature tasks](../maintainers/persistent-objects.md).
- Limits and constraints: [Objects, inventory and equipment inventory](../limits/objects.md).
