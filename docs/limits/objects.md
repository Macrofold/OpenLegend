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

**Changed · Restrictiveness: Safe.**

Transfer/split/merge/drop no longer require all work to stop. Moves reject active action dependencies and reserved descendants. Equip/unequip still require a free actor.

**Reason / tradeoff:** Unrelated rearrangement should not interrupt work; equipment substitution has separate live-action semantics. [Contract](../worlds/base/items.md).

## OB12

**Changed · Restrictiveness: Safe.**

Visible reachable world containers/piles are shared by default. Explicit actor lists restrict access through ancestors; carried bags require custody or a grant on the outer carried bag. Handing items to another person requires their acceptance of an offer ([BW11](base-world.md#bw11)); direct deposit into another actor's carried inventory is refused. Neither path inspects the recipient's possessions. Creator editing is limited to world containers and the creator's own carried bags. Access lists allow 100 actors; absence means shared and an empty list denies everyone.

**Reason / tradeoff:** Enable ordinary sharing while keeping physical access separate from title and human-private data. A bounded explicit grant list supports the release population; roles, locks and trading need authored consumers. The former custody-only/no-giving rule is removed.

**Changed 2026-09-28:** the unilateral deposit into a reachable living person (E04/R03, 2026-09-26) was replaced by consent-aware offers, following Mike's rule that nothing changes hands without acceptance ([camp fire and sharing decision 6](../projects/camp-fire-and-sharing.md#decisions)). Privacy is unchanged. [Contract](../worlds/base/items.md).

## OB13

**Removed · Restrictiveness: Safe.**

Ingredient, food, ammunition and tool discovery includes accessible nested possessions. No direct-inventory-only restriction remains for those consumers.

**Reason / tradeoff:** Packing useful items should not make them unusable. Indexed child traversal respects access restrictions and existing nesting/capacity rules. Equipping extracts the tool through the authoritative move owner. [Contract](../worlds/base/items.md).

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

Inventory page: **40 results**, scanning at most **200 entries** before continuation. The same windows bound merge-target lookups ([QU05](#qu05)).

**Reason / tradeoff:** Bound projected page and scan work while exposing continuation.

## QU04

**Reported · Restrictiveness: Safe.**

Inventory search matches definition names within the **current container only**.

**Reason / tradeoff:** Avoid recursive inventory search cost/semantics in the first UI.

## QU05

**Removed — implemented 2026-09-28 · Restrictiveness: — (removed).**

The inventory merge control formerly offered targets from the **current page only**, filtered by definition alone. Selecting a lot now asks the server for merge targets across the **whole current container** through `/api/inventory` with `mergeSourceId`: the same [QU03](#qu03) windows (40 results, at most 200 children scanned, explicit “Search more lots” continuation) list only lots that pass the merge admission rules mirrored in `mergeTargetAvailable` (same direct container, equivalent free lots, same definition version and declared owner, no reservations, state or ongoing work). Move destinations are omitted from these responses.

**Remaining controls:** merging stays within one direct container; the merge command still rechecks handling, access and revisions; a changed container revision restarts the page. Implementation: [inventory-view.ts](../../apps/server/src/inventory-view.ts), [object-access.ts](../../packages/domain/src/object-access.ts).

## QU06

**Reported · Restrictiveness: Safe.**

Compact game snapshot: **60 accessible possession entries**, including nested items.

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

## CC01 — Proposed invented camp containers

**Current native tuning; full qualification pending · Restrictiveness: Very safe.** [PW03](../maintainers/next-playable-week.md#pw03--craftable-containers-and-camp-supplies) supports one new generated family: a portable woven container assembled from two native material roles. The [authored world rules](../worlds/base/camp-containers.md#first-family-rules) own its initial quantity, capacity, empty-load and work formulas. Those give 8–32 packing-load units of capacity; each craft creates one individual container, and current global/definition nesting limits still apply. A malformed or unsupported design is refused before installation; overflow on a later transfer remains an ordinary capacity refusal.

**Reason / tradeoff:** A finite, useful nonweapon consumer exercises invention without pretending to implement buildings, liquids, preservation or arbitrary material simulation. The size envelope is initial world tuning; native checks exercise both endpoints and capacity refusal. Different size/name/material choices must pass the same validator; no privileged exact basket recipe is installed to force success. Broader family composition remains INV-owned.

**Unchanged no-limit dimension:** actors currently have no finite total carrying-load allowance; this family does not add one. It does not reduce the number of stored items to make inventory faster. Per-container capacity, indexed/paged reads, access/claims, native-work admission and OB01/OB02 remain separate controls. Retained item growth still needs its existing storage/performance qualification; carrying a bag is organization, not an encumbrance advantage. [October 2 evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026) distinguishes native family/custody checks from outstanding live/browser/integration acceptance.
