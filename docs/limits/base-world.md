# Bundled-world defaults: limits and constraints

[Feature contract](../worlds/base/README.md) · [Implementation work](../maintainers/base-world.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [items.ts](../../packages/domain/src/worlds/base/items.ts), [appraisals.ts](../../packages/domain/src/worlds/base/appraisals.ts), [participation.ts](../../packages/domain/src/worlds/base/participation.ts).

## BW01

**Reported · Restrictiveness: Medium.**

Woven bag: **24 capacity, 2 own load, maximum nesting 16**; other bundled items and newly generated items default to **1 packing unit**. These values live in [base-world content](../../packages/domain/src/worlds/base/items.ts).

**Reason / tradeoff:** Initial bundled bag balance and default packing content; another world can choose different supported values.

## BW02

**Reported · Restrictiveness: Medium.**

New default feeling policies include persistent grief, condition-sustained restlessness and **30-second calm**. Fear/discomfort gained notification thresholds **0.5, 0.2 and 0**; their existing intensity/decay rules were preserved. [World policies](../../packages/domain/src/worlds/base/appraisals.ts)

**Reason / tradeoff:** Authored emotional pacing examples, not universal engine laws.

## BW03

**Reported · Restrictiveness: Medium.**

The bundled return fallback is **`(11, 0, 13)` on terrain**. [Policy](../../packages/domain/src/worlds/base/participation.ts)

**Reason / tradeoff:** Authored safe return site for the bundled map; other worlds supply their own.
