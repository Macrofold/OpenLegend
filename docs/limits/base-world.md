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

## BW07

**Current — implemented September 27 · Restrictiveness: Medium.** Fullness remains 0–100, with labels at **below 40 hungry, below 30 very hungry, below 20 famished, below 10 starving**; at zero, the existing starvation health loss becomes active. The current decay/damage rates are preserved. A **2-point recovery margin** is used to rearm a notified threshold; displayed labels still follow exact current values. Worsening to a previously unnotified severity is immediate. Retain D54's provisional **one simulated hour** between persistent critical-condition review opportunities, beginning below 20; coalesce missed deadlines and admit paid work separately. Native condition checks exercise these values; they are not measured optimal tuning.

**Reason / tradeoff:** Communicate escalating bodily urgency without one event/model call per decrement or repeated boundary jitter. The margin may delay a repeat notification after small recovery; it cannot hide a worse band or remove current facts from context. The simulated-hour opportunity may be too slow or frequent at some speeds; [D54](../../archive/05-project/open-decisions.md#perception-and-attention) retains production cadence/habituation/capacity tuning. Real-time spending remains independently enforced.

**Removed:** The former below-38 automatic eating and below-42 berry seeking thresholds selected behavior for the person controller. Those choices and their food-specific cognition protection are removed, with no replacement forced-action thresholds. They previously provided inexpensive deterministic survival; removing them permits autonomous choice but can leave an NPC hungry or dying during unavailable cognition. Native physiology, ordinary food actions and incapacity protections remain. [Design](../projects/embodied-survival-tech-design.md#body-descriptions-and-transition-lifecycle) · [EPR04](../maintainers/events-perception-and-reactions.md#epr04--private-internal-threshold-events-and-native-protection).

## BW08

**Current — provisional knife tuning, September 27 · Restrictiveness: Medium.** One ordinary equipped contact-strike profile is the first weapon family. The starter knife has **8 injury per hit, 0.75 eligible-hit probability, 1.3 world-unit maximum interaction-anchor reach, 0.8-unit approach distance, 6 simulation-second wind-up and 18-second recovery**. An uninterrupted in-range cycle therefore takes 24 simulation seconds, with expected stationary damage **0.25 per simulation second** before other effects. At 60:1 speed that cycle is 0.4 wall seconds; provider latency and approach time are additional. These are authored balance values, not real-world weapon measurements or observed DPS.

**Reason / tradeoff:** A faster useful tool with real misses and a short reach makes general equipped melee playable while retaining spatial failure. The inner stance gives a moving target some margin during wind-up; native trials reached hares/deer and repeated explicit attempts against fleeing deer; live Jev hunting and visual acceptance remain unqualified. Keep their existing health/movement rules. Invalid geometry blocks the action rather than relaxing collision or range. New authored profiles can vary values; special effects, armor, stamina, skill scaling and arbitrary generated weapon algorithms are outside this family. Existing punch and launchers retain their behavior.

Each chosen action performs one strike. Repetition uses the existing bounded plan, not an infinite autoattack or hunting loop; a dead target blocks subsequent queued strikes without completing a survival goal. Cancellation cannot remove committed attack recovery. [Melee contract](../projects/embodied-survival-tech-design.md#equipped-melee-contract) · [AC09.6](../maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families).

## BW09

**Current — starter scenario, September 27 · Restrictiveness: Medium.** New bundled-world starts give **one knife each to Mike and Ada only**, Ada **35/100 fullness**, her existing healthy/rested body, a consistent authored biography and **zero initial operational goals**. The starters' carried berries are removed and the two nearby berry patches start at zero with truthful depleted presentation. Retain existing animals, camp equipment and nonfood materials. Omitted goal defaults for other authored starts need not change; an explicitly empty goal list must stay empty.

**Reason / tradeoff:** A lean camp makes the requested survival decision observable sooner without telling Ada what to choose. This owner-approved difficulty/content change replaces Ada fullness 66, three berries per starter and full nearby berry patches. It does not guarantee hunting or demonstrate behavior when easy food is available. Qualification must include food-present comparisons. No existing save is reseeded or reset; no other character gains a knife through generic creation. [Starting scene](../projects/embodied-survival-feature-spec.md#proposed-starting-scene) · [BW18](../maintainers/base-world.md#bw18--ada-and-the-lean-starting-camp).
