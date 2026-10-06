# Batch 06 — Rivals and contested ground constraints

All entries are **Proposed**, inspected against main `0a3ab79b` on October 6, 2026. No runtime limit changes in this planning task. [Feature](../projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md), [design](../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md), [implementation tracker](../maintainers/parallel-batch-06-rivals-and-contested-ground.md). Existing [native work](native-work.md), [spatial](spatial.md), [objects](objects.md), [cognition](cognition.md), [persistence](persistence.md) and [base-world](base-world.md) inventories remain their shared limits' owners.

## RC01 — Straight, finite, single-target projectiles

**Restrictiveness: Balanced for the selected first flight; unqualified in play.** A released point projectile travels straight to first solid/body contact or its installed range. Only the exact authorized target can receive damage; another body stops it without injury. No collateral harm, arc, ricochet, penetration or recoverable ammunition. These explicit supported-family restrictions preserve existing indirect-harm policy and avoid promising a universal ballistic model. Expansion requires a selected use case and any necessary D07 decision, not a new weapon name.

## RC02 — Preparation, speed and aim error

**Restrictiveness: Unknown pending play evidence.** Values and release-error distribution have one owner in [world tuning](../worlds/base/ranged-counterplay.md#ranged-tools-and-preparation). Current family preparation remains 18 game seconds; stone/arrow speed is proposed at 0.5/0.75 metres per game second, with definition range and accuracy controlling individual tools. Invalid profiles refuse before admission. Steadiness no longer promises final hit probability; geometry replaces the old fleeing modifier. AV03's competence consumer must reconcile this explicitly. No numerical cap on world population or stored history is introduced by these balance choices.

## RC03 — Held aim and active flight growth

**No independent held-aim duration limit; Balanced for scope.** One actor's physical lane and exact one-projectile claim limit that actor's held aim. It cannot auto-fire, multiply claims or bypass interruption. Flight lasts at most range divided by speed, but the number of actors firing concurrently is not bounded by that fact. Use existing native work admission and indexed collision queries; do not drop active projectiles or skip collisions when work is unavailable. Candidate bodies/solids in a dense swept region can grow; output count does not establish a cheap query. Selected encounter and larger simultaneous-shot work need measurement; world-scale capacity remains unqualified.

## RC04 — Evasion without immunity

**Restrictiveness: Unknown pending play evidence.** The [world profile](../worlds/base/ranged-counterplay.md#evasion) owns the biped's 2-metre limit, 12-game-second motion and 120-game-second repeat interval. Refuse unsupported destinations before commitment; dynamic blockage stops at an actual valid position. No immunity, push, stamina meter or attack bonus. This adds a tactical option without making a new resource loop compulsory. Change reach/timing only in the authored profile with relevant evidence, not in renderer or AI text.

## RC05 — Enemy and companion scope remains undecided

**Restrictiveness: Not assessable until the owner answer.** CF01/CF04/CF05 are not specified or ready to dispatch. Existing resident exclusion in the stag policy is not adopted as a universal combat limitation, and this plan does not silently remove it. [The pending participation decision](../../archive/05-project/open-decisions.md#batch-06--npc-combat-participation) must precede dependent design. Existing PvP, inactivity and death rules remain in their owners.

## RC06 — Evidence, memory and retained outcomes

**No new retained-data cap; growth remains with current owners.** Projectiles terminate into ordinary events/action records, not a new indefinitely retained flight log. Actor history, memories, defeated identities, loot and future site consequences can still grow with play; existing paging/retention/work policies apply and this batch establishes no scale proof. Model context receives relevant permitted evidence, not every battle or every hidden target. No omniscient opponent timeline or hard-coded automatic retaliation is selected.
