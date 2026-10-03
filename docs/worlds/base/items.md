# Items, ground piles and possession

This specification owns the base world's item creation, portability, pickup and drop behavior. [INV-01/02](../../repertoires/actions.md#inv-possession-transfer-and-containment) are ordinary uses of an installed world capability, not invention or universally available foundation actions. The [action-capability contract](../../action-capabilities.md#12-manipulation-transfer-and-process-use) owns generic parameter binding and admission.

## Portability

**Portable** is a boolean property of an item definition, not a status effect, actor status, material tag or inference from its name. The installed item-handling mechanic consumes it. An absent property is not portable. All initial base-world inventory definitions are portable; its authored `defaultPortable` policy makes newly admitted inventory inventions portable too. A future bound-item mechanic may add separate acquisition/release constraints through the same handler, when needed.

The base world's handling policy enables pickup/drop for the `person` body profile, with reach 1.6 world units and one simulation second to collect a pile after approaching. These are authored defaults, not rights inherent to all creatures or worlds. The policy is saved with the world. Properties, scope, current body capability and actual quantities are rechecked at authoritative execution. UI labels grant no authority.

## Cordage manufacture and reuse

The trusted `base:cordage` family makes a homogeneous, portable cord item from two actual native prepared-fiber items with `fiber` and `flexible` properties. It takes 60 game seconds and produces one item, with `binding`/`flexible` properties and packing load one. [The shared authored rule](../../../packages/domain/src/worlds/base/items.ts) also supplies existing native cord preparation; neither path inherits extra input effects. The proposer chooses an eligible definition and bounded names/descriptions, with no strength, yield or other mechanical parameter.

Only the trusted compiler issues the `base:binding-material` interface, version 1, with one binding unit per physical item. The exact admitted producer, output, family and dependencies must still reproduce before a [woven container](camp-containers.md#first-family-rules) can consume it. Tags, names, copied metadata and finished weapons/containers are insufficient. The producer's fiber role stays native-only, so this is one supported manufacture-and-reuse edge rather than recursive crafting.

Learning or installing a technique creates no supplies and teaches only its inventor. Possession of verified cord permits consumption as binding without revealing or teaching a private manufacturing technique. The ordinary material and inventory views show the cord's actual name and supported use. Crafting consumes real accessible unclaimed stock at work start; cancellation does not refund it. Exact technique checks fence work start, completion and current-format reopening; missing/changed meaning refuses output or activation rather than guessing a replacement.

[NP03 evidence](../../verification/camp-life.md#np03--manufactured-material-reuse-october-3-2026) covers actual gathered/prepared stock, two names and container sizes, conservation/cancellation, private ingredients, forged/stale/malformed inputs, native alternate fiber, browser Apply/Craft/storage and PostgreSQL active-work reopening. It establishes native and supplied-proposal behavior; live model invention or autonomous chain selection is unqualified. [RF01](../../limits/inventions.md#rf01--world-owned-recipe-families) owns the finite interface scope and expansion trigger; [NP03](../../maintainers/next-priority-batch.md#np03--craft-with-an-invented-material) tracks delivery.

## Ground piles

A pile is a spatial entity holding item entities. Each active lot has one tagged placement: a world root, contained custody or an equipment attachment. Actor inventories, piles and admitted bags hold direct children without a second inventory list. Custody does not mean account authorship or legal ownership. Pickup/drop transfers existing quantities without creation or consumption. A complete unmerged transfer retains its identity; splitting allocates a new lot with lineage. Merge requires exact definition/unit pins, homogeneous state, matching ownership/provenance and no incompatible holds or active identity references. Individual objects and bags do not merge.

Several item types and multiple units may occupy one pile. Coincident placements on the same support merge; the initial positional tolerance is 0.01 world units. Nearby floors never share a pile. Removing the last stack removes the pile. Empty piles have no separate lifetime or inventory copy.

Visible piles expose their contents and quantities through ordinary perception. Unseen piles expose neither contents nor actions. Pile artwork disappears when the pile leaves the authorized view; it does not retain a last-seen ghost. This treats collection and loss of visibility alike without revealing which occurred. Hovering shows a bounded preview of the first eight stacks with an explicit count of the rest, placed to stay inside the viewport ([HV01](../../limits/interface.md#hv01)); **Look closer** (the In view detail) lists every visible stack, and **Pick Up ▸** searches every portable stack. The renderer overlaps representative item sprites into a small heap. Rendering uses up to 18 marks from the first 12 stacks and at most three marks per stack; this bounds artwork only, never stored quantities or the contents list. There is no falling-object solver, physical scattering or per-unit scene object.

## Pickup and drop

Right-click a visible pile. With one portable stack, **Pick Up** directly selects that stack. With multiple portable stacks, **Pick Up ▸** opens a searchable right-side pullout containing **Pick Up All** first, followed by each stack and its quantity. Nonportable contents remain visible but cannot be collected. Submenus support hover, click and keyboard interaction, with viewport-aware placement.

Pickup approaches through the existing supported movement path, then transfers the eligible selection. A single-stack request refers to its actual stack ID; Pick Up All means all eligible contents present at completion. Completion rechecks visibility, reach and availability. Another actor taking the contents first causes an explicit failure, never duplicated inventory. Canceling movement does not transfer items. Loss of handling or action capability cancels pending pickup; loss of locomotion cancels a required approach but does not prevent collection already within reach.

Inventory item details expose **Drop** and a whole-number quantity selector for portable items. Drop places that quantity at the actor's current supported location, only where the pile body can fit. Active work must stop first because it may hold material/equipment references. Equipping individualizes one unit; dropping the unequipped remainder leaves that unit equipped. Moving the selected unit detaches it. Player and NPC concrete action options use the same native commands. Ordinary pause, body and capability restrictions still apply.

## God creation

**God mode · Add item** in player inventory opens a searchable installed-item catalogue and quantity field. The existing character inventory editor remains available for other actors. **Add something ▸ Items** on the ground uses the same catalogue and creates a pile at the chosen support position. God mode may instantiate any installed item definition, including a nonportable one; it does not grant ordinary pickup permission, invent a new definition or call a model.

Creation is an explicit owner-authorized source operation. It accepts positive safe-integer quantities, checks the destination and commits through the ordinary world transaction. A repeated request ID with the same body cannot create another copy. No price, ingredient, discovery or ordinary acquisition requirement applies to this God tool.

## Persistence and extension

The woven bag has 24 integer packing-load units of
capacity, a load of 2 for the bag itself, and an admitted nesting-depth bound of 16. Its
contents, including nested bags, count toward enclosing capacity. Ordinary base materials
and newly admitted primitive item inventions have authored load 1; these are packing units,
not kilograms or a new global encumbrance law. Other worlds can supply different explicit
metadata. Unknown load cannot be assumed zero. Exact legacy native-definition bindings
preserve old definition bytes; unsupported old custom definitions require admitted metadata
before packing. Nonempty containers cannot be retired without a separate content disposition.

## Shared containers and active work

Reachable, visible world containers and piles are shared by default. An admitted container
access list can restrict which actors may open/use it; absence means unrestricted physical
access, while an empty list denies it. Restrictions apply through the containment chain.
Carried bags remain private to their custodian unless the outer carried bag explicitly grants
access. Handing items to another person is an offer that only they can accept
([social rules](social.md#offering-and-accepting-possessions)); moving items directly into
another person's carried inventory is refused. Neither path reads the recipient's possessions.
Declared ownership remains separate from these permissions and from human-private notes.
Creator controls can set/clear restrictions on world containers and their own carried bags;
ordinary actors cannot grant themselves access. This is a physical-access foundation, not a
lock-picking, trading or contested-ownership mechanic; consent to receive items is the offer
exchange above.

Ingredient, food, ammunition and tool discovery includes accessible nested possessions.
Equipping a nested tool moves it into the actor's equipment location through the same object
owner. Transfer, split, merge and drop may coexist with unrelated work; operations touching
active action dependencies or reservations, including descendants of a moved bag, reject.
Equipment changes retain their separate active-work restriction.

Inventory supports scoped direct-child pages, search, breadcrumbs, split/merge and explicit
container movement. Merge choices come from the whole current container, filtered by the merge
admission rules, not only the displayed page. A page must restart when contents, custody or
current access changes.
Declared ownership can be corrected through the authorized creator control without moving
the item or granting access. Clearing it retains a monotonic revision. Ordinary hidden bag
contents and load totals do not become public through the bag's appearance in a pile.
[PO01–PO09](../../maintainers/persistent-objects.md) records completed foundation evidence and separate capacity limits.

Inventories, pile positions/contents, item properties, handling policy and pending pickup work are saved together. The existing initializer supplies missing item-handling defaults and explicit portability without overwriting configured values. Future saved-state work follows the [development save policy](../../../AGENTS.md#development-save-policy).

Physical mass/volume, scattering, contested ownership/theft rules and additional pickup/drop restrictions require concrete mechanics. Freeform-language parameter binding belongs to the action foundation; it must call this same native transfer boundary rather than implement a second transfer path. Delivery dependencies and remaining work live only in the [tracker](../../maintainers/base-world.md).

The inventory panel refreshes when the player moves or its own inventory/context changes; use **Refresh** for newly nearby destinations or changes in a shared container. Every action rechecks current access and revisions. Constant background motion does not repeatedly clear an open inventory page.

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
- Manufactured material composition: [NP03](../../maintainers/next-priority-batch.md#np03--craft-with-an-invented-material), [INV-3/INV-6](../../maintainers/inventions-and-world-evolution.md#inv-6--composable-materials-assemblies-and-passive-world-processes) and [RF01](../../limits/inventions.md#rf01--world-owned-recipe-families).
