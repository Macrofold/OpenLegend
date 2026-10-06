# Ranged counterplay and evasion

**Proposed, October 6, 2026.** These are bundled-world choices for [batch 06](../../projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md), not current mechanics or universal engine rules. NPC combat participation is separately unanswered; this profile does not broaden today's permitted targets.

## Ranged tools and preparation

Use existing compatible sling/bow definitions, finite ammunition, injury, range and accuracy values. The existing 18-game-second shot preparation remains the default for those current families. Add authored flight speed: **0.5 metres per game second** for stone and **0.75 metres per game second** for arrows. At the installed normal 60:1 time rate, these are respectively 30 and 45 metres per real second. This is tuning for a coarse straight-flight game, not a physical claim about historical weapons. Range stays the actual installed launcher range; flight ends at contact or maximum range.

Holding prepared aim is allowed until canceled, interrupted or its prerequisites cease to be usable. It has no aim-duration accuracy bonus or automatic release deadline. It occupies the actor's existing physical-action lane and holds one projectile through normal claims. Movement cancels aim. No new aim-fatigue meter is added merely to justify a duration limit.

At release, clamp the existing base accuracy plus the applicable competence contribution to the supported probability range. One saved draw selects steady versus deviated aim. Steady aim uses the observed target point. Deviated aim uses a uniformly selected direction in the plane perpendicular to the shot and an offset of **two observed target capsule radii** at that point. The resulting direction is then fixed. These are two draws only for a deviated release, not per frame. A target moving into or out of the resulting ray can still change contact, so the accuracy field is described as **base aim steadiness**, not an eventual hit guarantee. No extra fleeing multiplier is applied after geometry already accounts for target movement; this replaces the current 0.85 hunting modifier and must be reconciled with AV03's prior calculation.

The first flight family has point projectiles, straight travel and body/solid interception. It does not model arc drop, thickness-based penetration, ricochet or retained spent ammunition. A non-target body intercepts without injury; no collateral attack permission is inferred. Compatible shield protection consumes the existing chosen guard through AV02's resolver. Tuning a different supported launcher must change authored definitions rather than branch on an enemy's identity.

## Evasion

The starting biped action permits a chosen destination up to **2 metres** away, traversed in **12 game seconds**, with **120 game seconds** between evasion commitments. At normal speed this is 0.2 seconds of movement and a 2-second repeat interval. Shorter selected distances use the same duration; no zero-distance action is admitted. Collision and support remain authoritative throughout. Another body is an obstacle, not something to push through.

There are **no invulnerability frames**, no new stamina cost and no attack-damage bonus. A valid evasion can fail to escape an attack's actual reach. Normal walking stays available during the evasion repeat interval. Existing attack recovery survives switching to evasion, preventing it from becoming a way to remove weapon recovery. A canceled/interrupted committed evasion retains its repeat deadline; refusal before commitment spends nothing.

These initial values should be assessed for useful choice, especially at the current accelerated clock and with keyboard/pointer input. Adjust through this same world owner when evidence shows a poor result; report the change and tradeoff. A small successful dodge does not establish optimal balance or universal reflex accessibility.

## Discovery and visible information

Use plain labels: **Aim at [target] with [tool]**, **Shoot**, **Cancel aim**, **Shoot once at [target] with [tool]**, and **Evade to [destination]**. Hunting can retain its world-authored purpose label while resolving to that same physical shot. Include relevant known distance, preparation, cost, observed health, actual tool and blocker, with optional detail for the other stats.

Release text says a shot was fired; impact text distinguishes observed target injury, shield prevention, scenery interception and a miss. Do not reveal an unseen interception location or body. A character knows their own evasion result and cooldown; an observer sees only what current perception permits. Existing final-blow review, PvP denial and inactive protection remain controlling.

## Maintained records

- Implementation: [CF02/CF03](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md).
- Limits: [RC01–RC06](../../limits/parallel-batch-06-rivals-and-contested-ground.md).
- Mechanisms: [batch 06 technical design](../../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md).
