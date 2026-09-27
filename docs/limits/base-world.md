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

Definitions are installed, not universally enrolled. Only compatibility damage reactions run by default; actor processes and other causes require admission. See [current social behavior](../worlds/base/social.md#feelings) and [FL16](feelings.md#fl16) for the narrower authoring UI.

## BW03

**Reported · Restrictiveness: Medium.**

The bundled return fallback is **`(11, 0, 13)` on terrain**. [Policy](../../packages/domain/src/worlds/base/participation.ts)

**Reason / tradeoff:** Authored safe return site for the bundled map; other worlds supply their own.

## BW04

**Current — source-inspected 2026-09-26 · Restrictiveness: Very safe.**

Native promise admission recognizes committed self-attributed English speech beginning `I promise to` with content. Only the exact gathering form resolving one item definition obtains an automatic completion binding. Admission stops at **16 unresolved commitment records per actor**. Revisioned amendments exist through the actor API, but there is no dedicated management UI.

**Reason / tradeoff:** A small native speech/evidence slice bounds retained obligations without assuming general language comprehension or agreed contracts. The parser and count cap currently live in [commitments.ts](../../packages/domain/src/commitments.ts), not an authored configuration. [BW17](../maintainers/base-world.md#bw17--readable-promises-and-commitment-management) must expose supported/refused cases honestly and review the policy seam before expansion. No cap removal or new promise semantics are approved here.

## BW05

**Current — source-inspected 2026-09-26 · Restrictiveness: Very safe.**

Native objective relations support only **parent and sibling**. The creator API records immutable facts; there is no correction/deletion operation or client family panel. General relation vocabulary and a player-facing disclosure policy are not implemented by this primitive. The creator operation can grow the stored fact collection; its duplicate/parent-cycle validation scans those facts and declares no local total-fact cap. The rating above describes the restricted vocabulary, not a qualified growth envelope. BW16 must assess reachable graph size and bounded projection/validation work before expanding use.

**Reason / tradeoff:** Preserve a small objective-fact slice independently of personal opinions; its fixed vocabulary/topology are v1 world specializations, not universal engine rules. Source: [social.ts](../../packages/domain/src/social.ts). [BW16](../maintainers/base-world.md#bw16--family-authoring-and-inspection) owns proposed UI and boundary review; correction/disclosure require a decision first.

## BW06

**Current — native-action integration source review, 2026-09-26 · Restrictiveness: Medium.**

Visual follow defaults to three world units, accepts 1.5–12 units, resumes after a 0.75-unit margin, and refreshes a moved target's route after four game seconds and one unit of displacement. Empty paths can request a route immediately. It requires current sight and a living active actor, ends on lost support/capability/target, and has no stealth, scent or time-of-day termination. Follow must be the last generated step because it has no promised natural completion.

**Reason / tradeoff:** A finite authored proximity activity with hysteresis avoids route churn. These are base-world tuning choices, not universal pursuit laws. [Authored rules](../../packages/domain/src/worlds/base/navigation.ts), [AC05](../maintainers/action-capabilities.md#ac05--target-relative-ongoing-navigation).
