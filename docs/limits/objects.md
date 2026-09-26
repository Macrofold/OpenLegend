# Objects, inventory and equipment: limits and constraints

[Feature contract](../projects/persistent-objects-feature-spec.md) · [Implementation work](../maintainers/persistent-objects.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [objects.ts](../../packages/domain/src/objects.ts), [inventory-view.ts](../../apps/server/src/inventory-view.ts).

## OB01

**Reported · Restrictiveness: Very safe.**

**16 levels of containment globally.** Individual container definitions can choose a smaller maximum, but cannot exceed 16.

**Reason / tradeoff:** Bound ancestor traversal and validation; depth 16 is an implementation ceiling, not a physical law.

## OB02

**Reported · Restrictiveness: Very safe.**

**One additive packing model:** positive integer capacity; nonnegative integer load per item. Nested contents count toward every enclosing container. No fractional capacity, unlimited containers, separate weight/volume limits or alternative packing rules. Items whose packing load is unknown are refused by capacity-limited containers; fit cannot be established.

**Reason / tradeoff:** Provide one predictable packing rule; weight/volume, fractional and unlimited capacities need authored semantics.

## OB04

**Reported · Restrictiveness: Very safe.**

**Only item entities can be contained or attached.** Actors cannot be passengers inside this model. Parents must be actors, ground piles or container items.

**Reason / tradeoff:** Keep first inventory delivery limited to items; passengers need a separate supported containment contract.

## OB05

**Reported · Restrictiveness: Very safe.**

Attachment supports only the existing `equipment` slot; no general attachment points or assemblies. One physical parent remains a placement invariant.

**Reason / tradeoff:** Preserve unique physical placement; the single equipment slot is the discretionary supported-feature boundary.

## OB06

**Reported · Restrictiveness: Very safe.**

**Containers always have individual identities and quantity 1.** Even empty identical bags cannot stack; creation accepts one bag per operation.

**Reason / tradeoff:** Container identity owns its contents; stacking empty bags needs an explicit identity merge/split policy.

## OB07

**Reported · Restrictiveness: Very safe.**

Equipping separates one unit from a stack and **permanently makes it individual**. Unequipping does not make it stackable again.

**Reason / tradeoff:** Avoid destroying referenced equipment identity; reversible restacking needs reference-aware eligibility.

## OB08

**Reported · Restrictiveness: Very safe.**

Split/merge supports **stateless homogeneous stacks only**. Per-instance attributes, mechanism state, status state, reservations or references from active effects can prevent it.

**Reason / tradeoff:** Preserve individual state and reservations; richer stack behavior needs explicit state/reference transfer rules.

## OB09

**Reported · Restrictiveness: Medium.**

Merge requires exact matching definitions, units and ownership records—including ownership provenance/revision. No conversion or reference-rebinding policy.

**Reason / tradeoff:** Avoid merging incompatible identity, units or ownership history; conversions/rebinding need separate semantics.

## OB10

**Reported · Restrictiveness: Very safe.**

The split command creates the result **in the same container**. Explicit merge takes the **whole selected stack**, with both stacks in the same container.

**Reason / tradeoff:** Keep the first exact stack operations local and atomic; partial cross-container merges are not yet exposed.

## OB11

**Reported · Restrictiveness: Very safe.**

Transfer/split/merge and equip/unequip require **all current actor work to stop**, even when that work is unrelated.

**Reason / tradeoff:** Conservative busy-state gate avoids action dependencies; unrelated work could eventually coexist.

## OB12

**Reported · Restrictiveness: Very safe.**

Ordinary container operations work only within **your character’s possessions**. No direct giving, shared-container access or opening someone else’s bag.

**Reason / tradeoff:** Custody-scoped operations avoid inventing access grants; sharing/trade need explicit authorization paths.

## OB13

**Reported · Restrictiveness: Very safe.**

Existing eating, crafting, ammunition and tool selection use **direct inventory**, not recursive bag contents. Items must be unpacked.

**Reason / tradeoff:** Existing consumers resolve immediate possessions; recursive selection has not been integrated.

## OB14

**Reported · Restrictiveness: Very safe.**

Nonempty containers cannot be retired. Objects carrying unsupported per-instance state also cannot be retired through ordinary consumption. No spill/scatter policy.

**Reason / tradeoff:** Prevent orphaning contents or per-instance state; spill/scatter needs an authored disposal rule.

## OB15

**Reported · Restrictiveness: Medium.**

Declared ownership supports **one holder or no holder**, with public/private disclosure. No shared ownership or competing claims. Its editor only operates on items currently in your character’s custody.

**Reason / tradeoff:** Simple ownership declarations preserve separation from physical custody; shared/contested claims need another model.

## OB16

**Reported · Restrictiveness: Very safe.**

The older creator inventory editor cannot change a type’s total when it represents multiple stacks, individual objects or explicitly owned objects.

**Reason / tradeoff:** A type-total editor cannot safely select which distinct identity/ownership records to destroy.

## QU02

**Reported · Restrictiveness: Safe.**

Direct-contents query: **201 entries maximum**, including lookahead.

**Reason / tradeoff:** Bound one contents query, including continuation lookahead.

## QU03

**Reported · Restrictiveness: Safe.**

Inventory page: **40 results**, scanning at most **200 entries** before continuation.

**Reason / tradeoff:** Bound projected page and scan work while exposing continuation.

## QU04

**Reported · Restrictiveness: Safe.**

Inventory search matches definition names within the **current container only**.

**Reason / tradeoff:** Avoid recursive inventory search cost/semantics in the first UI.

## QU05

**Reported · Restrictiveness: Safe.**

Inventory merge UI offers targets from the **current page only**.

**Reason / tradeoff:** Reuse displayed candidates; a valid matching stack on a later page cannot be chosen yet.

## QU06

**Reported · Restrictiveness: Safe.**

Compact game snapshot: **60 direct inventory entries**.

**Reason / tradeoff:** Keep routine snapshots compact; paginated inventory is the full-detail path.

## QU07

**Reported · Restrictiveness: Safe.**

AI container-action suggestions: **24**.

**Reason / tradeoff:** Keep model action context small; relevant actions beyond the prefix may be omitted.

## QU08

**Reported · Restrictiveness: Safe.**

Object history: **40 entries/page**, covering split/merge/consumption in the requesting character’s historical custody.

**Reason / tradeoff:** Bound page size and expose only the requester’s permitted custody evidence.

## PB02

**Reported · Restrictiveness: Safe.**

Inventory search: **160 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).

## PB03

**Reported · Restrictiveness: Safe.**

Inventory/history cursor: **3,000 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/protocol/src/index.ts).
