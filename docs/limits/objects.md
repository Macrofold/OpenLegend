# Objects, inventory and equipment: limits and constraints

[Feature contract](../projects/completed/persistent-objects-feature-spec.md) · [Implementation work](../maintainers/persistent-objects.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [objects.ts](../../packages/domain/src/objects.ts), [inventory-view.ts](../../apps/server/src/inventory-view.ts).

## OB01

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

**16 levels of containment globally.** Individual container definitions can choose a smaller maximum, but cannot exceed 16.

**Reason / tradeoff:** Bound ancestor traversal and validation; depth 16 is an implementation ceiling, not a physical law.

## OB02

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

**One additive packing model:** positive integer capacity; nonnegative integer load per item. Nested contents count toward every enclosing container. No fractional capacity, unlimited containers, separate weight/volume limits or alternative packing rules. Items whose packing load is unknown are refused by capacity-limited containers; fit cannot be established.

**Reason / tradeoff:** Provide one predictable packing rule; weight/volume, fractional and unlimited capacities need authored semantics.

## OB04

**Current — source rechecked 2026-10-15 · Restrictiveness: Very safe.**

**Only item entities can be contained or attached.** Actors cannot be passengers inside this model. Ordinary inventory parents must be actors, ground piles or container items. The selected construction family also attaches admitted item parts to an assembly root through its own slot, local-position and exact-definition checks ([OB05](#ob05)); an assembly root is not a general inventory destination.

**Reason / tradeoff:** Keep ordinary inventory and construction attachments with their respective native owners; passengers need a separate supported containment contract. [Placement validation](../../packages/domain/src/objects.ts) · [Construction attachment](../../packages/domain/src/assemblies.ts).

## OB05

**Changed October 6, 2026 · Restrictiveness: Medium.**

**Removed single-slot restriction; current admitted body-port equipment and selected shelter attachments.** One item may occupy multiple places declared by its pinned equipment profile, and compatible items may remain held together. Missing body ports or overlapping occupied ports refuse before effects. There is no engine-fixed number of hands or saved equipment mirror. AV04 adds exact local attachments for the [selected flat canopy family](editable-shelters.md); broader assemblies remain unsupported. One physical parent remains a placement invariant.

**Reason / tradeoff:** AV02 replaces the former single `equipment` slot so a knife and shield can coexist and one two-handed launcher can conflict with both. A rebuilt attachment subset bounds warm lookups by held items, rather than all carried supplies; it is not saved authority. Extension needs a real authored body/equipped consumer and its permissions. [World profile](../worlds/base/shield-defense.md#compatible-equipment), [native/browser/SQL and isolated lookup evidence](../verification/shield-defense.md).

## OB06

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

**Containers always have individual identities and quantity 1.** Even empty identical bags cannot stack; creation accepts one bag per operation.

**Reason / tradeoff:** Container identity owns its contents; stacking empty bags needs an explicit identity merge/split policy.

## OB07

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Equipping separates one unit from a stack and **permanently makes it individual**. Unequipping does not make it stackable again.

**Reason / tradeoff:** Avoid destroying referenced equipment identity; reversible restacking needs reference-aware eligibility.

## OB08

**Current — selected material extension · Restrictiveness: Very safe.**

Split/merge supports stateless homogeneous stacks and the selected material family's explicitly admitted copying/comparison of per-item values. Splits preserve those values; merges require matching values. Other per-instance attributes, mechanism state, status state, reservations or references from active effects can still prevent it. The material family also owns bag refusal: base coverings and prepared fibers with weather state remain barred from bags, while a selected dry material may permit storage without acquiring contained weather behavior. [Current-format validation](../save-and-load.md#current-format-validation) requires initial values and validates any present optional material value.

**Reason / tradeoff:** The former stateless-only description is superseded by the qualified material exception. Preserve individual state and reservations while allowing that consumer to declare equivalence and containment. Generic inventory does not infer these rules from shelter roles. Broader state/reference transfers still require their owning operation. [Full review](../verification/world-engine-boundaries.md#requested-full-review--october-14-2026) preserves the base refusal and checks permitted dry storage/reopening.

[DG19 / CS02](../maintainers/changing-supplies.md#cs02--food-condition-follows-the-real-material) proposes one concrete richer consumer, including preservation input/output condition and last-unit retirement under OB14. That proposal does not remove these current restrictions until the shared operation and complete ordinary behavior are delivered. Its selected limits are in [CS-L07](changing-supplies.md#cs-l07--preserve-differences-without-multiplying-busywork).

## OB09

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

Merge requires exact matching definitions, units and ownership records—including ownership provenance/revision. No conversion or reference-rebinding policy.

**Reason / tradeoff:** Avoid merging incompatible identity, units or ownership history; conversions/rebinding need separate semantics.

## OB10

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The split command creates the result **in the same container**. Explicit merge takes the **whole selected stack**, with both stacks in the same container.

**Reason / tradeoff:** Keep the first exact stack operations local and atomic; partial cross-container merges are not yet exposed.

## OB11

**Changed · Restrictiveness: Safe.**

Transfer/split/merge/drop no longer require all work to stop. Moves reject active action dependencies and reserved descendants. Equip/unequip still require a free actor.

**Reason / tradeoff:** Unrelated rearrangement should not interrupt work; equipment substitution has separate live-action semantics. [Contract](../worlds/base/items.md).

## OB12

**Changed · Restrictiveness: Safe.**

Visible reachable world containers/piles are shared by default. Explicit actor lists restrict access through ancestors; carried bags require custody or a grant on the outer carried bag. Handing items to another person requires their acceptance of an offer ([BW11](base-world.md#bw11)); direct deposit into another actor's carried inventory is refused. Choices expose only explicitly disclosed terms; native acceptance privately checks the two named lots, never publishes the recipient's stock. Creator editing is limited to world containers and the creator's own carried bags. Access lists allow 100 actors; absence means shared and an empty list denies everyone.

**Reason / tradeoff:** Enable ordinary sharing while keeping physical access separate from title and human-private data. A bounded explicit grant list supports the release population; roles and locks need authored consumers. PX02 now supplies immediate reciprocal barter through the same custody owner; its first-family bounds belong to BW11. The former custody-only/no-giving rule is removed. Reciprocal placement evaluates final net loads rather than rejecting a fictional one-sided intermediate. It retains distinct transferred lots; gifts retain ordinary merging. Existing capacity, nesting, work and privacy checks remain ([evidence](../verification/reciprocal-barter.md)).

**Changed 2026-09-28:** the unilateral deposit into a reachable living person (E04/R03, 2026-09-26) was replaced by consent-aware offers, following Mike's rule that nothing changes hands without acceptance ([camp fire and sharing decision 6](../projects/completed/camp-fire-and-sharing.md#decisions)). Privacy is unchanged. [Contract](../worlds/base/items.md).

## OB13

**Removed · Restrictiveness: Safe.**

Ingredient, food, ammunition and tool discovery includes accessible nested possessions. No direct-inventory-only restriction remains for those consumers.

**Reason / tradeoff:** Packing useful items should not make them unusable. Indexed child traversal respects access restrictions and existing nesting/capacity rules. Equipping extracts the tool through the authoritative move owner. [Contract](../worlds/base/items.md).

## OB14

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Nonempty containers cannot be retired. Objects carrying unsupported per-instance state also cannot be retired through ordinary consumption. No spill/scatter policy.

**Reason / tradeoff:** Prevent orphaning contents or per-instance state; spill/scatter needs an authored disposal rule.

## OB15

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

Declared ownership supports **one named holder or no holder**, with `public` or `custodian` disclosure; the latter follows physical custody, not a general arbitrary private audience. No shared ownership or competing claims are admitted. The creator ownership editor requires current create authority and an item in the controlled character’s custody; declaring title neither transfers the item nor grants physical access. [Declaration](../../packages/domain/src/objects.ts) · [Editor admission](../../apps/server/src/world-service.ts).

**Reason / tradeoff:** Simple ownership declarations preserve separation from physical custody; shared/contested claims need another model.

## OB16

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The older creator inventory editor cannot change a type’s total when it represents multiple stacks, individual objects or explicitly owned objects.

**Reason / tradeoff:** A type-total editor cannot safely select which distinct identity/ownership records to destroy.

## OB17 — English name presentation

**Implemented, 2026-10-03 · Restrictiveness: Very safe.** [Entity naming](../entity-names.md) supports English count, proper, plural and mass nouns, with an authored `a/an` pronunciation override. Callers choose no article, an indefinite article or a definite article. English sound heuristics are not a pronunciation dictionary; ambiguous names require the override. Multilingual inflection and number-based pluralization are outside this delivery.

**Reason / tradeoff:** One small shared formatter fixes readable naming without making world vocabulary an engine law or introducing a general localization framework. World content supplies names and grammatical forms. Other languages need an explicit product request.

**Unchanged no-limit dimensions:** formatting adds no entity, item, memory, query or action cap and no provider work. Existing name-length, observer and context budgets still apply; [CG01](cognition.md#cg01) and [KG01](memory.md#kg01) retain their broader preparation-growth constraints. [Native, PostgreSQL and browser evidence](../verification/entity-names.md) establishes presentation/current-format integrity, not new capacity qualification.

## QU02

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct-contents query admits page sizes from **1 to 201**, defaulting to 201 so callers can retain a continuation lookahead. This bounds returned child IDs, not initial construction or rebuilding of the shared object index. [Query owner](../../packages/domain/src/queries.ts) · [Index owner](../../packages/domain/src/objects.ts).

**Reason / tradeoff:** Bound one contents query, including continuation lookahead.

## QU03

**Reported · Restrictiveness: Safe.**

Inventory page: **40 displayed groups**, scanning at most **200 groups** before continuation. Building those groups initially examines all direct contents, and is cached only while the contents revision, installed definitions and exact changed-member evidence remain valid. This is full-container preparation outside the page scan bound, not a storage limit. Grouped move/drop uses at most **16 physical source objects** under the existing native stock-operation allowance; larger requests refuse as a whole and ask for a smaller amount. The group token binds actor/world/timeline/container revision and native admission resolves exact members without copying every ID into the page. [Current grouping evidence](../verification/player-experience-inventory.md). The same windows bound merge-target lookups ([QU05](#qu05)) and NP04 camp-role/storage discovery. Material discovery traverses accessible own nested storage or only the selected ground supply’s current admitted inspection page; it is not an unscoped all-belongings contents search. A spatial page may materialize 201 candidates for lookahead while examining at most 200; multi-phase storage preparation is measured separately. Cold index construction, first-use queried-cell membership preparation and native selected-bag admission remain outside the page examination bound. Ordered roots and physical/inventory evidence in the queried conservative cells permit continuation across unrelated needs/fuel/time changes and movement outside those cells; local movement/content changes, changed ordinals, observer/geometry or scope require refresh. These limits do not cap stored objects. [IW01](interface.md#iw01--inventory-task-workspace) and [NP04 evidence](../verification/camp-life.md#np04--camp-supply-discovery-october-3-2026).

**Reason / tradeoff:** Bound projected page and scan work while exposing continuation.

## QU04

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Inventory search case-folds and matches the **definition name within the current container only**, not arbitrary item-instance names or recursively unopened contents. It continues through the QU03 scan windows, including empty windows with more children. Merge-target mode uses exact native merge eligibility instead of this text filter. [Page owner](../../apps/server/src/inventory-view.ts).

**Reason / tradeoff:** Avoid recursive inventory search cost/semantics in the first UI.

## QU05

**Removed — implemented 2026-09-28 · Restrictiveness: — (removed).**

The inventory merge control formerly offered targets from the **current page only**, filtered by definition alone. Selecting a lot now asks the server for merge targets across the **whole current container** through `/api/inventory` with `mergeSourceId`: the same [QU03](#qu03) windows (40 results, at most 200 children scanned, explicit “Search more lots” continuation) list only lots that pass the merge admission rules mirrored in `mergeTargetAvailable` (same direct container, equivalent free lots, same definition version and declared owner, no reservations, unsupported state or ongoing work). The selected material exception follows [OB08](#ob08). Move destinations are omitted from these responses.

**Remaining controls:** merging stays within one direct container; the merge command still rechecks handling, access and revisions; a changed container revision restarts the page. Implementation: [inventory-view.ts](../../apps/server/src/inventory-view.ts), [object-access.ts](../../packages/domain/src/object-access.ts).

## QU06

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The compact game snapshot projects the first **60 accessible possession entries**, including nested items, from the already assembled observation inventory. That is an output limit, not a bound on all inventory preparation, carried objects or available actions; the full-detail inventory uses its paginated path. [Projection](../../apps/server/src/view.ts) · [Possession traversal](../../packages/domain/src/object-access.ts).

**Reason / tradeoff:** Keep routine snapshots compact; paginated inventory is the full-detail path.

## QU07

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

A selected-container decision supplies at most **24 admitted take/pack suggestions in total**, taking from the inspected page before considering packing accessible own inventory. Separately, at most **16 accessible known containers** receive inspect suggestions. Omitted known choices receive a coverage notice and can still be selected explicitly. The 24 bound counts accepted suggestions, not inspected candidates or native previews: many refused candidates can be examined before it is reached. [Context owner](../../apps/server/src/context.ts).

**Reason / tradeoff:** Keep supplied choices finite without reporting an unexamined prefix as empty storage or impossibility. This is not a complete CPU/preparation bound or a new restriction on the number of containers.

## QU08

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Object history returns **40 entries per page**, querying 41 for continuation, for split/merge/consumption whose occurrence-time custodian matches the requesting character. Pages sort and continue by lineage-record slot, not a promised wall-clock chronology. Current authority is checked before and after the awaited history read; current possession or declared ownership alone does not grant historical custody. A named successor remains descriptive, never an actionable redirect. [History query](../../apps/server/src/world-records.ts) · [Request scope](../../apps/server/src/inventory-view.ts).

**Reason / tradeoff:** Bound page size and expose only the requester’s permitted custody evidence.

## PB02

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Inventory search: **160 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Request validation](../../apps/server/src/http.ts).

## PB03

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Inventory/history cursor: **3,000 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Request validation](../../apps/server/src/http.ts).

## CC01 — Proposed invented camp containers

**Current native tuning; broader qualification pending · Restrictiveness: Very safe.** [PW03](../maintainers/parallel-batch-01-playable-week.md#pw03--craftable-containers-and-camp-supplies) supports a portable woven container from native pouch material and native binding; [NP03](../maintainers/parallel-batch-02-foundations-and-usability.md#np03--craft-with-an-invented-material) additionally permits exact certified manufactured binding in that role only. The [authored world rules](../worlds/base/camp-containers.md#first-family-rules) retain the quantity, capacity, empty-load and work formulas, giving 8–32 packing-load units of capacity and one individual container per craft. Current global/definition nesting limits still apply. Cord manufacture is separate completed work; container crafting neither duplicates cord units nor charges preparation again. A malformed/forged/stale design is refused before installation or debit; overflow remains an ordinary capacity refusal. [NP03 evidence](../verification/camp-life.md#np03--manufactured-material-reuse-october-3-2026) covers both sizes, native capacity refusal, browser manufacture/packing/retrieval and current-format reuse; broader live/model/large-content qualification remains open.

**Reason / tradeoff:** A finite, useful nonweapon consumer exercises invention without pretending to implement buildings, liquids, preservation or arbitrary material simulation. The size envelope is initial world tuning; native checks exercise both endpoints and capacity refusal. Different size/name/material choices must pass the same validator; no privileged exact basket recipe is installed to force success. Broader family composition remains INV-owned.

**Unchanged no-limit dimension:** actors currently have no finite total carrying-load allowance; this family does not add one. It does not reduce the number of stored items to make inventory faster. Per-container capacity, indexed/paged reads, access/claims, native-work admission and OB01/OB02 remain separate controls. Retained item growth still needs its existing storage/performance qualification; carrying a bag is organization, not an encumbrance advantage. [October 2 evidence](../verification/camp-life.md#engineer-3--containers-and-chosen-activities-october-2-2026) distinguishes native family/custody checks from outstanding live/browser/integration acceptance.
