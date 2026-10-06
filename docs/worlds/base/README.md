# Open Legend base world

This directory owns the accepted rules and authored content of Open Legend's bundled world. New discussions of its balance, named mechanics, items, creatures and defaults belong here. Engine specifications link here rather than duplicating those rules. Current implementation facts remain in [Architecture](../../architecture.md), evidence in [Verification](../../verification.md), and delivery work in the [base-world tracker](../../maintainers/base-world.md).

## Mechanics

- [Starting wilderness, terrain and population](landscape.md)
- [Items, ground piles and possession](items.md)
- [Inventable tools and ammunition](invention-families.md) — authored material rules, parameters and real consumers for the existing four invention families.
- [Inventable camp containers](camp-containers.md) — implemented finite woven-container family and ordinary storage; broader live voluntary integration remains unqualified.
- [Chosen camp supplies and fire watches](camp-routines.md) — implemented finite methods and explicitly selected one-session care; uncoached/live integration remains open, with no automatic goals or learned conditional policies.
- [Light canopies and useful shelter](editable-shelters.md) — proposed finite materials, two arrangements, reversible work and nonpunitive moisture for DG13; runtime remains open.
- [Sling handling, practice and coaching](practical-competence.md) — proposed finite competence gain, real quiet practice and voluntary instruction for DG14; runtime remains open.
- [Optional connection-study outing](connection-study-outing.md) — proposed finite study-world preparation and ordinary self-care; no study operation or ordinary-world reset is authorized.
- [Sleep and waking](sleep.md)
- [Body, senses and survival](survival.md)
- [Combat](combat.md)
- [Knowledge and observer identity](knowledge.md)
- [After you left at camp](story-perspectives.md) — proposed optional historical craft glimpse for DG15, with explicitly selected external disclosure; current cutaways remain disabled.
- [Relationships, feelings and promises](social.md)
- [Finite continuing communities](continuing-communities.md) — DG17's proposed current-clock supplies, horizon and qualification; no overnight service is adopted.
- [Something worth showing](social-gatherings.md) — DG18's proposed ordinary gathering and later gist/busy-camp workload; current hearing remains authoritative.
- [Supplies worth keeping](changing-supplies.md) — DG19's proposed food condition, preservation work and finite renewing patches; current food and resource rules remain unchanged.

## Code boundary

The corresponding bundled content lives in `packages/domain/src/worlds/base/`: world/actor initialization, initial map and flight routes, item/preparation definitions, creation categories/templates, body and attribute/sense defaults, physiology, strike definitions, fire care (`fire.ts`), item-handling defaults and status-effect/trait configuration. YAML and generated JSON stay together under its `config/` directory; generators and reusable validators stay outside. The pure domain reads generated data, never YAML or filesystem APIs.

Generic engine code owns command authority, identity, saved state, atomic transfers, spatial queries, registered effect execution and observation boundaries. Temporary public composition exports preserve existing imports while referring to the single base-world owner; they are not duplicate definitions. Visual assets remain in the renderer, and never grant mechanics.

The base world is bundled now and is intended to become an ordinary externally supplied world package. This directory split does not claim that external package loading, arbitrary scripts or replacement physiology are implemented. Existing native host adapters and finite action families still contain compatibility constraints. Extend their existing registration boundary as concrete world consumers require it; do not add a parallel loader or action registry in anticipation.

## Creation categories

God-mode **Add something** groups the creation catalogue into **Items**, **Actors** and **Environment**. Item subcategories remain material, food, equipment and ammunition in inventory. Actors includes people and animals; Environment includes resource sources and placed features. Every placeable catalogue entry belongs to one top-level category. These are navigation metadata, not mutually exclusive engine component types or permissions.

Known items include installed generated definitions. A resource source such as a berry bush is Environment; the harvested berries are Items. “Object” is the general term, not another overlapping menu category.

Lifecycle policies: [logout, protection, ghosts and lethal consequences](lifecycle-and-protection.md) (accepted targets; BW13–BW15).

## Maintained records

- Implementation: [Feature tasks](../../maintainers/base-world.md).
- Limits and constraints: [Bundled-world defaults inventory](../../limits/base-world.md).
- [Navigation behavior](navigation.md) — bundled follow tuning and its current boundaries.
- [Typed-request wording](typed-requests.md) — the words the free typed-request reader uses for this world's things and missing actions.
- [Action family facts](actions.md) — what engine code reads about the bundled families (item outputs, tool fields, pausing, cooking).
- [Time](time.md) — clock fidelity and the named stopping times (dawn, dusk).
