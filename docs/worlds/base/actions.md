# Base-world action family facts

The bundled world's action families (gather, prepare, craft, cook, harvest, eat, equip, strike, hunt) run through existing native adapters. Facts about them that other engine code needs are declared once in `BASE_FAMILY_FACTS` in [`worlds/base/actions.ts`](../../../packages/domain/src/worlds/base/actions.ts), beside the family balance values, and read from there:

- **Item outputs:** gather, prepare, craft, cook and harvest leave items a later step may use. Gather, prepare, craft and cook record a single item receipt that a plain later step can take; harvest's several outputs are usable only through a named output port. Picking up is the engine's own single-receipt family. Plan validation and the AI instruction text read these lists, so an AI plan that asks a later step to use a harvest's item without a port is refused up front instead of failing when it runs.
- **Tool fields:** a request's chosen tool is kept when a strike uses it as its weapon, a hunt as its weapon or ammunition, or an equip as the item equipped.
- **Units per command:** each eat command handles one unit, so "eat 3" is three commands and keeps an exact amount of 3.
- **No pause once working:** strikes and hunts under way cannot pause for other work; they finish or are replaced.
- **Cooking:** turns one raw meat into one cooked meat. The kernel's admission, its produced item and the typed parser's output binding read this pair.

Balance values stay with their owners ([survival](survival.md), [combat](combat.md)). Older native adapters still contain some wording and item literals of their own; those are listed as remaining work in the [base-world tracker](../../maintainers/base-world.md).
