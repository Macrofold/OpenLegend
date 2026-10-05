# Inventable tools and ammunition

This page owns the bundled world's four original recipe families: sling-like launchers, bow-like launchers, arrows and gathering tools. Their authored code owner is `packages/domain/src/worlds/base/recipe-families.ts`, which also assembles the trusted family catalogue. The installed catalogue additionally includes [woven containers](camp-containers.md) and [manufactured cordage](items.md#cordage-manufacture-and-reuse), whose rules remain with those world-owned sources. These are families of designs, not finished recipes seeded into the world.

A proposer chooses a family, actual material definitions and quantities, technique and item descriptions, and that family's editable parameters. The engine validates those choices against the exact family installed in the world, then compiles the item components. Item properties, ammunition compatibility and other native effects cannot be supplied as arbitrary candidate fields. A renamed design retains the same mechanics.

## Material and work rules

Each of these four families accepts two through six distinct material roles, one through eight items per role, and at most twenty items altogether. Required roles must be present; additional supported roles may be included. A role occurs only once, so a larger amount is expressed as its quantity. The six available roles are binding, body, pouch, shaft, point and fletching. Binding requires the material's binding property, body requires flexibility, pouch requires pouch suitability, shaft requires shaft suitability, point requires point suitability, and fletching requires fiber.

The four families on this page still accept only available native materials and reject invented outputs, materials with nutrition, and raw meat. Positive manufactured-material admission is already implemented for the separate [woven-container binding role](camp-containers.md#first-family-rules), but it does not make manufactured cord eligible for these weapon/tool roles. Each consuming role must explicitly accept a trusted material interface; a name, inherited property or copied certificate is not sufficient. This is a bundled-world restriction, not a universal ban on using an invention as material.

The proposer selects an integer crafting duration from 48 through 480 game seconds. Ordinary work expenditure applies. Materials are spent when crafting starts; interruption does not refund them. Completion produces one item. Admission records the technique and teaches its inventor, without crafting an item or teaching every character.

## Supported families

| Family              | Required materials                              | Editable mechanical parameters                                               | Supported use and limitation                                                                                                                           |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sling-like launcher | Binding and pouch                               | Damage 10–20 health points; range 3–7 metres; base accuracy 0.6–0.9          | Uses native stone ammunition for animal hunting. No general projectile solver or new hit effect.                                                       |
| Bow-like launcher   | A flexible body that is also rigid, and binding | Damage 16–28 health points; range 4–10 metres; base accuracy 0.6–0.9         | Uses compatible arrows for animal hunting. No generated trajectory solver.                                                                             |
| Arrow ammunition    | Shaft, point and fiber fletching                | Damage bonus 0–5 health points                                               | One projectile per completed craft, consumed by a compatible bow. No new damage operation.                                                             |
| Gathering tool      | A flexible body that is also rigid, and binding | One existing native gathered resource; integer maximum batch yield 2–4 items | The best compatible carried tool applies, limited by remaining source stock. Tools do not stack and need no equip action. No wear or container effect. |

A resolved shot consumes one compatible projectile whether it hits or misses. Fleeing modifies the launcher's base accuracy. The compiler derives launcher mechanism and ammunition type from the selected family. It derives item properties from the union of admitted material properties, omits food and fuel, and adds the projectile property for arrows. The previous proposal format allowed a chosen supported subset of those properties; the current format gives that decision to the trusted family compiler. The native craft, hunt and gathering behavior is retained.

A gathering source can later disappear without erasing the learned technique. New gathering-tool admission requires an existing source for the selected native resource; restoration checks the retained exact resource definition and compiled meaning. The absence of a current source affects available gathering actions rather than whether the saved recipe can reopen.

The gathered-resource parameter is declared as an item-definition reference in the trusted family metadata. Character-scoped requests check that reference against the character's permitted definitions before native validation looks for resource definitions or sources. This keeps validation errors from revealing hidden resources. The same declaration supplies permitted editor choices and requires the compiler to capture the exact referenced definition as a saved dependency. This metadata is part of the family pin, separate from the standard provider JSON Schema.

## Installed meaning and remaining limits

Each installed world selects exact family pins in its existing module manifest. Each admitted recipe retains its validated candidate, exact family, material/resource and item-handling policy dependency pins, compiled crafting fields and readable facts. Missing or changed required pins, old candidate formats, forged effects and unsupported parameters fail explicitly. Same-format reopening does not generate again or silently substitute another family.

Ordinary compatible invention keeps automatic admission. The creator workshop keeps its exact review and separate Apply operation. Neither installation path crafts the output, grants new permissions or changes an active recipe in place. Broader invented-input composition, active world-law changes, arbitrary item components and external world-package loading remain under their existing owners.

## Known equipment characteristics

Inventory comparisons use authored field names and units from the actual item definition, after the existing knowledge and access checks. Invented items use their recipe's retained compiled facts. The native knife exposes damage, range and accuracy; the woven bag exposes capacity and packing requirement; native stones expose their damage bonus. Comparable keys and units allow comparison with the actual equipped item without a universal score. Native metadata points only to supported scalar item components; missing values remain unknown, represented as null, rather than becoming zero. Labels and metadata are part of the item's exact definition pin, and no separate writable statistic is introduced.

## Maintained records

- Implementation: [PW02](../../maintainers/parallel-batch-01-playable-week.md#pw02--world-owned-invention-families-and-one-admission-path), [INV-3](../../maintainers/inventions-and-world-evolution.md#inv-3--expand-beyond-the-three-recipes-through-registered-families) and [EWF](../../maintainers/extensible-world-foundation.md).
- Limits and constraints: [RF01](../../limits/inventions.md#rf01--world-owned-recipe-families).
- Technical contract: [family definitions](../../projects/parallel-batch-01-playable-week-tech-design.md#pw02--family-definitions-not-engine-recipe-switches).

Bundled playtest milestone wording and recipe/equipment completion rules are authored in `playtest.ts`. The server projects and records those rules instead of repeating sling/bow/arrow checks. This is a localized bundled-world presentation seam, not a general world-package progression loader.
