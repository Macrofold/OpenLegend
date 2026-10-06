# Batch 06 — Rivals and contested ground constraints

Mechanics/content entries are **Proposed**; NPC combat participation is an **accepted target**. Runtime evidence is inspected main `0a3ab79b` plus PG02 at `b1357b37`, October 6, 2026. No runtime limit changes in this planning task. [Feature](../projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md), [design](../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md), [implementation tracker](../maintainers/parallel-batch-06-rivals-and-contested-ground.md). Existing [native work](native-work.md), [spatial](spatial.md), [objects](objects.md), [cognition](cognition.md), [persistence](persistence.md) and [base-world](base-world.md) inventories remain their shared limits' owners.

## RC01 — Straight, finite, single-target projectiles

**Restrictiveness: Balanced for the selected first flight; unqualified in play.** A released point projectile travels straight to first solid/body contact or its installed range. Only the exact authorized target can receive damage; another body stops it without injury. No collateral harm, arc, ricochet, penetration or recoverable ammunition. These explicit supported-family restrictions preserve existing indirect-harm policy and avoid promising a universal ballistic model. Expansion requires a selected use case and any necessary D07 decision, not a new weapon name.

## RC02 — Preparation, speed and aim error

**Restrictiveness: Unknown pending play evidence.** Values and release-error distribution have one owner in [world tuning](../worlds/base/ranged-counterplay.md#ranged-tools-and-preparation). Current family preparation remains 18 game seconds; stone/arrow speed is proposed at 0.5/0.75 metres per game second, with definition range and accuracy controlling individual tools. Invalid profiles refuse before admission. Steadiness no longer promises final hit probability; geometry replaces the old fleeing modifier. AV03's competence consumer must reconcile this explicitly. No numerical cap on world population or stored history is introduced by these balance choices.

## RC03 — Held aim and active flight growth

**No independent held-aim duration limit; Balanced for scope.** One actor's physical lane and exact one-projectile claim limit that actor's held aim. It cannot auto-fire, multiply claims or bypass interruption. Flight lasts at most range divided by speed, but the number of actors firing concurrently is not bounded by that fact. Use existing native work admission and indexed collision queries; do not drop active projectiles or skip collisions when work is unavailable. Candidate bodies/solids in a dense swept region can grow; output count does not establish a cheap query. Selected encounter and larger simultaneous-shot work need measurement; world-scale capacity remains unqualified.

## RC04 — Evasion without immunity

**Restrictiveness: Unknown pending play evidence.** The [world profile](../worlds/base/ranged-counterplay.md#evasion) owns the biped's 2-metre limit, 12-game-second motion and 120-game-second repeat interval. Refuse unsupported destinations before commitment; dynamic blockage stops at an actual valid position. No immunity, push, stamina meter or attack bonus. This adds a tactical option without making a new resource loop compulsory. Change reach/timing only in the authored profile with relevant evidence, not in renderer or AI text.

## RC05 — Mortal NPCs and voluntary help

**Accepted participation target; proposed bounded consumer.** Mike's October 6 answer permits hostile NPCs to kill other NPCs, including Ada. [Lifecycle/protection](../worlds/base/lifecycle-and-protection.md#npc-combat-participation) owns the policy and preserved PvP/inactivity/death boundaries. CF01 implements it; the existing stag's player-only behavior remains separately authored. No NPC immunity or automatic revival is selected.

CF04's supported request names two participants and one currently perceived opponent/life, reusing the existing social-offer expiry. **Balanced for one voluntary combat episode**, not a universal party-size/population limit. Acceptance grants a purpose, not remote control or free access to private evidence. Interposition, ally damage transfer, remote orders and compulsory obedience are unsupported. Expand only for a chosen cooperative experience, with concrete consent/authority design; do not enlarge stored parties or model context as a shortcut. Current requests use existing admission/indexing; retained history and broader social growth remain unqualified.

## RC06 — Evidence, memory and retained outcomes

**No new retained-data cap; growth remains with current owners.** Projectiles terminate into ordinary events/action records, not a new indefinitely retained flight log. Actor history, memories, defeated identities, loot and future site consequences can still grow with play; existing paging/retention/work policies apply and this batch establishes no scale proof. Model context receives relevant permitted evidence, not every battle or every hidden target. No omniscient opponent timeline or hard-coded automatic retaliation is selected.

## RC07 — One finite authored contested destination

**Balanced for the selected encounter; balance and enjoyment unqualified.** [World content](../worlds/base/contested-watchpost.md) owns the two initial occupants, loadouts, exact bow profile and cache stock. These are new-start content quantities, not global actor/memory caps or proof of populated-world capacity. No refill, replacement enemy, reset-on-return or secondary loot drop. Both approaches use supported ground-level geometry; upper floors, sieges, raids, toll services and property law are not selected.

The explicitly seeded initial goals establish a scene; they do not prove spontaneously invented motivation. Opponent/companion behavior still requires real independent choices through general owners. Expand destinations or tactics when the first encounter supplies meaningful choices and a useful aftermath; do not grow a population merely to hide poor decisions behind scripted attacks. Preserve the first-threat dense-scene failure and measure the chosen workload without reducing required facts or silencing actors to claim scale.
