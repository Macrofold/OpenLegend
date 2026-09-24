# Items, ground piles and possession

This specification owns the base world's item creation, portability, pickup and drop behavior. [INV-01/02](../../repertoires/actions.md#inv-possession-transfer-and-containment) are ordinary uses of an installed world capability, not invention or universally available foundation actions. The [action-capability contract](../../action-capabilities.md#12-manipulation-transfer-and-process-use) owns generic parameter binding and admission.

## Portability

**Portable** is a boolean property of an item definition, not a status effect, actor status, material tag or inference from its name. The installed item-handling mechanic consumes it. An absent property is not portable. All initial base-world inventory definitions are portable; its authored `defaultPortable` policy makes newly admitted inventory inventions portable too. A future bound-item mechanic may add separate acquisition/release constraints through the same handler, when needed.

The base world's handling policy enables pickup/drop for the `person` body profile, with reach 1.6 world units and one simulation second to collect a pile after approaching. These are authored defaults, not rights inherent to all creatures or worlds. The policy is saved with the world. Properties, scope, current body capability and actual quantities are rechecked at authoritative execution. UI labels grant no authority.

## Ground piles

A pile is a spatial entity holding ordinary item stacks. A stack has exactly one custody location: an actor inventory or a pile. Custody does not mean account authorship or legal ownership. Pickup/drop transfers existing quantities without creation or consumption. A complete unmerged transfer retains the stack identity; splitting allocates a new stack. Compatible stacks merge. The current item model has definition and quantity but no per-instance damage or enchantments; future instance state must participate in merge compatibility before introduction.

Several item types and multiple units may occupy one pile. Coincident placements on the same support merge; the initial positional tolerance is 0.01 world units. Nearby floors never share a pile. Removing the last stack removes the pile. Empty piles have no separate lifetime or inventory copy.

Visible piles expose their contents and quantities through ordinary perception. Unseen piles expose neither contents nor actions. Hovering lists all visible contents; inspection also provides a structured list. The renderer overlaps representative item sprites into a small heap. Rendering uses up to 18 marks from the first 12 stacks and at most three marks per stack; this bounds artwork only, never stored quantities or the contents list. There is no falling-object solver, physical scattering or per-unit scene object.

## Pickup and drop

Right-click a visible pile. With one portable stack, **Pick Up** directly selects that stack. With multiple portable stacks, **Pick Up ▸** opens a searchable right-side pullout containing **Pick Up All** first, followed by each stack and its quantity. Nonportable contents remain visible but cannot be collected. Submenus support hover, click and keyboard interaction, with viewport-aware placement.

Pickup approaches through the existing supported movement path, then transfers the eligible selection. A single-stack request refers to its actual stack ID; Pick Up All means all eligible contents present at completion. Completion rechecks visibility, reach and availability. Another actor taking the contents first causes an explicit failure, never duplicated inventory. Canceling movement does not transfer items.

Inventory item details expose **Drop** and a whole-number quantity selector for portable items. Drop places that quantity at the actor's current supported location. Active work must stop first because it may hold material/equipment references. Dropping the entire equipped stack clears its equipment reference; a partial drop leaves the retained stack equipped. Player and NPC concrete action options use the same native commands. Ordinary pause, body and capability restrictions still apply.

## God creation

**God mode · Add item** in player inventory opens a searchable installed-item catalogue and quantity field. The existing character inventory editor remains available for other actors. **Add something ▸ Items** on the ground uses the same catalogue and creates a pile at the chosen support position. God mode may instantiate any installed item definition, including a nonportable one; it does not grant ordinary pickup permission, invent a new definition or call a model.

Creation is an explicit owner-authorized source operation. It accepts positive safe-integer quantities, checks the destination and commits through the ordinary world transaction. A repeated request ID with the same body cannot create another copy. No price, ingredient, discovery or ordinary acquisition requirement applies to this God tool.

## Persistence and extension

Inventories, pile positions/contents, item properties, handling policy and pending pickup work are saved together. Existing development worlds acquire missing item-handling defaults and explicit portability in place; unrelated state and identity survive. Existing configured values are not overwritten. See the [active development policy](../../save-and-load.md#active-development-policy).

Weight/capacity, containers within containers, physical scattering, ownership/theft rules and separate pickup/drop restrictions require concrete mechanics. Freeform-language parameter binding belongs to the action foundation; it must call this same native transfer boundary rather than implement a second transfer path. Delivery dependencies and remaining work live only in the [tracker](../../maintainers/base-world.md).
