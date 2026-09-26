# Open Legend base world

This directory owns the accepted rules and authored content of Open Legend's bundled world. New discussions of its balance, named mechanics, items, creatures and defaults belong here. Engine specifications link here rather than duplicating those rules. Current implementation facts remain in [Architecture](../../architecture.md), evidence in [Verification](../../verification.md), and delivery work in the [base-world tracker](../../maintainers/base-world.md).

## Mechanics

- [Items, ground piles and possession](items.md)
- [Sleep and waking](sleep.md)
- [Body, senses and survival](survival.md)
- [Combat](combat.md)
- [Knowledge and observer identity](knowledge.md)

## Code boundary

The corresponding bundled content lives in `packages/domain/src/worlds/base/`: world/actor initialization, initial map and flight routes, item/preparation definitions, creation categories/templates, body and attribute/sense defaults, physiology, strike definitions, item-handling defaults and status-effect/trait configuration. YAML and generated JSON stay together under its `config/` directory; generators and reusable validators stay outside. The pure domain reads generated data, never YAML or filesystem APIs.

Generic engine code owns command authority, identity, saved state, atomic transfers, spatial queries, registered effect execution and observation boundaries. Temporary public composition exports preserve existing imports while referring to the single base-world owner; they are not duplicate definitions. Visual assets remain in the renderer, and never grant mechanics.

The base world is bundled now and is intended to become an ordinary externally supplied world package. This directory split does not claim that external package loading, arbitrary scripts or replacement physiology are implemented. Existing native host adapters and finite action families still contain compatibility constraints. Extend their existing registration boundary as concrete world consumers require it; do not add a parallel loader or action registry in anticipation.

## Creation categories

God-mode **Add something** groups the creation catalogue into **Items**, **Actors** and **Environment**. Item subcategories remain material, food, equipment and ammunition in inventory. Actors includes people and animals; Environment includes resource sources and placed features. Every placeable catalogue entry belongs to one top-level category. These are navigation metadata, not mutually exclusive engine component types or permissions.

Known items include installed generated definitions. A resource source such as a berry bush is Environment; the harvested berries are Items. “Object” is the general term, not another overlapping menu category.

Lifecycle policies: [logout, protection, ghosts and lethal consequences](lifecycle-and-protection.md) (accepted targets; BW13–BW15).

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
