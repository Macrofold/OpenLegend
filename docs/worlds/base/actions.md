# Base-world action family facts

The bundled world's action families (gather, prepare, craft, cook, harvest, eat, equip, strike, hunt) run through existing native adapters. Facts about them that other engine code needs are declared once in `BASE_FAMILY_FACTS` in [`worlds/base/actions.ts`](../../../packages/domain/src/worlds/base/actions.ts), beside the family balance values, and read from there:

- **Item outputs:** gather, prepare, craft, cook and harvest leave items a later step may use. Gather, prepare, craft and cook record a single item receipt that a plain later step can take; harvest's several outputs are usable only through a named output port. Picking up is the engine's own single-receipt family. Plan validation and the AI instruction text read these lists, so an AI plan that asks a later step to use a harvest's item without a port is refused up front instead of failing when it runs.
- **Tool fields:** a request's chosen tool is kept when a strike uses it as its weapon, a hunt as its weapon or ammunition, or an equip as the item equipped.
- **Units per command:** each eat command handles one unit, so "eat 3" is three commands and keeps an exact amount of 3.
- **No pause once working:** strikes and hunts under way cannot pause for other work; they finish or are replaced.
- **Cooking:** turns one raw meat into one cooked meat. The kernel's admission, its produced item and the typed parser's output binding read this pair.

Balance values stay with their owners ([survival](survival.md), [combat](combat.md)). Older native adapters still contain some wording and item literals of their own; those are listed as remaining work in the [base-world tracker](../../maintainers/base-world.md).

Gathering choices use this world's authored description and the same best compatible carried-tool yield as native gathering, capped by the observed remaining supply. A learned technique or an uncarried tool does not increase the advertised yield. When a large inventory is shown as a page, choices identify the yield supported by the inspected possessions and disclose that omitted carried tools may change the final result; preparing choices does not rescan all possessions.

## Player-facing weapon commitments

The bundled player catalogue’s supplemental wording is authored beside `nativeActivityView` in `worlds/base/action-views.ts`. Ranged use may select an exact accessible carried launcher and compatible projectile without replacing equipped equipment. The shot consumes one projectile and takes the authored shot duration plus approach; the route length is unknown. A melee choice names its exact accessible weapon and requires equipping it first. Both are attempts whose range and line of effect are rechecked at impact; neither promises a hit or kill. These are existing native rules exposed by PG03, with no change to admission or NPC decision context. [Player action discovery](../../action-experience.md#ordinary-player-action-discovery) owns the presentation journey.

Complete player discovery exposes each permitted accessible offer/fuel lot, including contents; selected-item discovery binds that exact lot. Compact social/fuel builders retain their existing defaults for other consumers. This changes discovery coverage, not the authored transfer/fire rules or native admission. [Review evidence](../../verification/player-clarity-ui.md#requested-review-follow-up--october-4-2026) records exact later/nested lot discovery and actual fuel consumption.

Player cooking choices bind both the selected raw meat and a perceived fire; inventory enters that choice through **Explore uses and targets**. A fire going out causes native refusal rather than substitution. Fiber/cord preparation remains supply-based: it can consume across carried lots, which the player catalogue now explains. The inventory quantity check reuses the same carried-total query as native preparation; execution still checks reservations and all other prerequisites. No cooking or preparation rule changed.
