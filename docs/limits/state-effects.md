# Shared state, resources and effects: limits and constraints

[Feature contract](../status-effects.md) · [Implementation work](../maintainers/state-contributions.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [state-owners.ts](../../packages/domain/src/state-owners.ts), [resource-claims.ts](../../packages/domain/src/resource-claims.ts), [state-contributions.ts](../../packages/domain/src/state-contributions.ts), [world-modules.ts](../../packages/domain/src/world-modules.ts).

## LA119

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A world can define at most 32 character attributes (named properties such as hunger or energy), and each character can hold at most 32 attribute values.

**Reason / tradeoff:** Removed thirty-two-definition and thirty-two-actor-attribute ceilings. Supported implementations, exact saved dependencies and valid values remain required.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Completed removals**.

## LA123

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A character property represented by named categories rather than a number can have only 1–16 possible values.

**Reason / tradeoff:** Removed the sixteen-category ceiling. Category definitions must still be nonempty, unique and contain the selected value.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Completed removals**.

## LA124

**Historical — needs recheck · Restrictiveness: Liberal.**

The minimum and maximum of a numeric character property cannot exceed a magnitude of 1 billion, and the quantity supplied by a source that refills a character property cannot exceed 1 billion.

**Reason / tradeoff:** Retain finite numeric validation and verify that supported mechanics handle the allowed magnitudes without arithmetic or processing problems.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Review**.

## LA125

**Historical — needs recheck · Restrictiveness: Very safe.**

A refillable character property, such as hunger or energy can drain or refill at no more than 100 units per second, and one refill action can last no more than 3,600 seconds.

**Reason / tradeoff:** Review these rates and durations as authored mechanics, with explicit processing checks rather than unexplained universal numbers.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Review**.

## LA126

**Historical — needs recheck · Restrictiveness: Safe.**

Attribute names, action labels and category names are limited to 64 characters; unit labels to 24; descriptions explaining why a character needs to restore a depleted property to 160.

**Reason / tradeoff:** Keep labels readable while expanding descriptions that otherwise lose information required by the player or character model.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Expand**.

## LA127

**Removed — current foundation · Restrictiveness: — (removed).**

The former 128 status-definition count ceiling is gone. Definitions still require supported contracts and aggregate native-work admission.

**Reason / tradeoff:** Definition count alone is a poor estimate of actual simulation cost.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA128

**Historical — needs recheck · Restrictiveness: Safe.**

One status-effect condition may contain at most 128 individual checks and combinations of checks, nested no deeper than 12 levels.

**Reason / tradeoff:** Keep a complexity bound so a deeply nested authored condition cannot monopolize validation or simulation time.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Keep**.

## LA129

**Historical — needs recheck · Restrictiveness: Safe.**

One status effect can contain at most 32 ongoing operations and list at most 32 reasons that interrupt it.

**Reason / tradeoff:** Expand richer effects only while keeping the cost of evaluating an active effect predictable.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Expand**.

## LA130

**Historical — needs recheck · Restrictiveness: Safe.**

A status effect's delay before reactivation can be configured only from 0 to 86,400 game seconds.

**Reason / tradeoff:** Review whether the world needs delays longer than a day; this maximum is not a necessary rule of status-effect execution.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Review**.

## LA131

**Historical — needs recheck · Restrictiveness: Liberal.**

A status effect can change a numeric attribute by at most 1,000,000 units in either direction per game second.

**Reason / tradeoff:** Check allowed rates against the arithmetic and behavior of each supported attribute, rather than assuming a large finite number is always safe.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Review**.

## LA132

**Historical — needs recheck · Restrictiveness: Safe.**

Status-effect labels default to 256 characters; interruption names allow 64, floating particle text 32 and activation/deactivation narration 512.

**Reason / tradeoff:** Keep display-specific lengths but expand text that must explain an effect correctly, with matching validation throughout the workflow.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Expand**.

## LA134

**Historical — needs recheck · Restrictiveness: Safe.**

One request to change a character's bodily state directly may contain at most 64 changes, each with magnitude no greater than 100.

**Reason / tradeoff:** Allow larger valid transactions only after checking body-state validation and keeping all dependent changes consistent.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Expand**.

## LA135

**Historical — needs recheck · Restrictiveness: Very safe.**

One owner-editor request may change at most 32 character attributes.

**Reason / tradeoff:** Expand editor transaction capacity when needed without bypassing attribute validation or partially saving an invalid batch.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Expand**.

## ST01

**Reported · Restrictiveness: Very safe.**

The new state API supports **replacement and numeric increment**, using the existing number/category types. No general structured values or custom reducers.

**Reason / tradeoff:** Keep mutations typed and deterministic; structured state/reducers need supported owners.

## ST02

**Reported · Restrictiveness: Very safe.**

Resource operations support only **numeric reservoirs, replenishment supplies, gathering supplies and items**.

**Reason / tradeoff:** Integrate only resource families with current consumers; new families need explicit debit/credit semantics.

## ST03

**Reported · Restrictiveness: Medium.**

Transfers require the **same definition ID, version and hash**. Matching units alone do not establish compatibility; conversions are unsupported.

**Reason / tradeoff:** Prevent accidental conversion across differing semantics; compatibility beyond exact pins needs a conversion policy.

## ST04

**Reported · Restrictiveness: Very safe.**

Maximum **256 operations per atomic resource group** and **256 groups per phase**.

**Reason / tradeoff:** Bound atomic group validation and phase admission; exact counts are chosen operational envelopes.

## ST05

**Reported · Restrictiveness: Very safe.**

Partial fulfillment supports **one transfer operation only**. No proportionally fulfilled multi-resource recipe or partial consumption-only group.

**Reason / tradeoff:** One transfer has an unambiguous partial amount; multi-resource proportional fulfillment needs policy.

## ST06

**Reported · Restrictiveness: Very safe.**

Resource groups read starting balances: **outputs cannot fund another operation in the same phase**. Groups receive resources in the supplied trusted order; no fairness allocator.

**Reason / tradeoff:** Prevent cyclic same-phase funding and keep deterministic allocation; fairness is a separate scheduling choice.

## ST07

**Reported · Restrictiveness: Very safe.**

The generic resource API cannot credit item stacks or gathering supplies. Those require their separate creation/movement operations.

**Reason / tradeoff:** Preserve inventory/gathering identity owners rather than synthesizing objects through a numeric balance API.

## ST08

**Reported · Restrictiveness: Very safe.**

Resources that **continuously drain cannot be reserved**. Reservations otherwise require a living actor’s action or admitted process.

**Reason / tradeoff:** A continuously changing balance needs future-rate accounting to support a reliable hold.

## ST09

**Reported · Restrictiveness: Too liberal.**

Completed reservation receipts remain in memory and count against retained-memory budgets. **Long-running receipt accumulation can eventually prevent further admission.**

**Reason / tradeoff:** Retain idempotency evidence; receipts lack a cold-retention path, so completed work can consume new-work capacity.

## ST10

**Reported · Restrictiveness: Very safe.**

Independently overlapping effects currently support **blocking actor capabilities only**, not numeric buffs, multipliers or general combined effects.

**Reason / tradeoff:** Deliver independently owned capability blockers first; arithmetic composition needs ordering/combination rules.

## ST11

**Reported · Restrictiveness: Very safe.**

Those effects target actors, cannot occupy the actor’s action, and cannot automatically activate through that definition.

**Reason / tradeoff:** Keep contributions independent of exclusive action ownership; broader targeting/activation needs integration.

## ST12

**Reported · Restrictiveness: Very safe.**

Their lifetimes are limited to **explicit removal, a fixed duration, or continued source participation**. Refresh cannot change the source/lifetime family or revive an ended instance.

**Reason / tradeoff:** Provide explicit bounded lifecycle families without reviving ended instance identity.

## ST13

**Reported · Restrictiveness: Very safe.**

Source-sustained effects stop when the source is retired, dies if it is an actor, or its containing character leaves active participation.

**Reason / tradeoff:** Sustained effects require an active participating source; other persistence policies need authored support.

## ST14

**Reported · Restrictiveness: Very safe.**

**Contained/attached objects cannot run the existing continuous status-effect processing.**

**Reason / tradeoff:** Current continuous-effect scheduler traverses placed entities; inventory effects need explicit integration.

## ST15

**Reported · Restrictiveness: Medium.**

An effect definition cannot be changed, disabled or removed while retained effect records reference its exact definition—even after those effects ended. Certain direct APIs also require complete historical records to be loaded first.

**Reason / tradeoff:** Preserve exact historical interpretation; immutable version retention could allow future versions without freezing authoring.
