# Ranged counterplay and evasion

**Implemented on the Batch 06 branch, October 9, 2026.** These are bundled-world choices, with [native and database evidence](../../verification/rivals-and-contested-ground.md); independent-character and combined player qualification remain open. [NPC combat participation](lifecycle-and-protection.md#npc-combat-participation) supplies common permission rather than ranged geometry deciding eligibility.

## Ranged tools and preparation

Use existing compatible sling/bow definitions, finite ammunition, injury, range and accuracy values. The existing 18-game-second shot preparation remains the default for those current families; execution and ordinary choice facts use the installed handling preparation when one applies. Add authored flight speed: **0.5 metres per game second** for stone and **0.75 metres per game second** for arrows. At the installed normal 60:1 time rate, these are respectively 30 and 45 metres per real second. This is tuning for a coarse straight-flight game, not a physical claim about historical weapons. Range stays the actual installed launcher range; flight ends at contact or maximum range.

Holding prepared aim is allowed until canceled, interrupted or its prerequisites cease to be usable. It has no aim-duration accuracy bonus or automatic release deadline. It occupies the actor's existing physical-action lane and holds one projectile through normal claims. Movement cancels aim. No new aim-fatigue meter is added merely to justify a duration limit.

At release, clamp the existing base accuracy plus the applicable competence contribution to the supported probability range. One saved draw selects steady versus deviated aim. Steady aim uses the observed target point. Deviated aim uses a uniformly selected direction in the plane perpendicular to the shot and an offset of **two observed target capsule radii** at that point. The resulting direction is then fixed. These are two draws only for a deviated release, not per frame. A target moving into or out of the resulting ray can still change contact, so the accuracy field is described as **base aim steadiness**, not an eventual hit guarantee. No extra fleeing multiplier is applied after geometry already accounts for target movement; this replaces the previous 0.85 hunting modifier; AV03 competence now contributes to release steadiness.

The compiled base-world source owns this error law and its outcome wording; native release still owns permission, the ammunition debit and the resulting flight. Current launcher families bind to this one law. An installed alternative error distribution is not supported yet: add a qualified family/profile binding when a selected world needs one, preserving the common collision executor and saved random sequence. Moving the rule to its world source does not establish arbitrary ballistic extensibility. [Boundary review evidence](../../verification/rivals-and-contested-ground.md#world-and-engine-boundary-review--october-14-2026) preserves exact prior directions and draw counts.

The first flight family has point projectiles, straight travel and body/solid interception. It does not model arc drop, thickness-based penetration, ricochet or retained spent ammunition. A non-target body intercepts without injury; no collateral attack permission is inferred. CF02 extends AV02's original contact-only guard to the supported stone/arrow projectile impacts through that same resolver: use the incoming trajectory direction at contact, the shield's existing sector/reduction and one-interception limit. A shield grants no area immunity or interception of a shot aimed at someone else. This is a scoped expansion beyond AV02, not a second guard implementation. Tuning a different supported launcher must change authored definitions rather than branch on an enemy's identity.

## Evasion

The starting biped action permits a chosen destination up to **2 metres** away, traversed in **12 game seconds**, with **120 game seconds** between evasion commitments. At normal speed this is 0.2 seconds of movement and a 2-second repeat interval. Shorter selected distances use the same duration; no zero-distance action is admitted. Directional examples project onto the current supporting ground and stay within the same three-dimensional distance limit, including slopes. Collision and support remain authoritative throughout. Another body is an obstacle, not something to push through.

Player and character descriptions report the selected supported distance and installed duration/repeat interval from the same rule used by execution. The policy's qualitative wording carries no duplicate default numbers. Current-format continuation checks the captured profile, deadlines, speed and remaining direct path together; a changed waypoint cannot substitute another evasive destination. [Native caller/restoration evidence](../../verification/rivals-and-contested-ground.md#continued-native-collision-and-continuation-review--october-14-2026) includes a different 3.3-metre/seven-second/91-second profile without changing the starting world's tuning.

There are **no invulnerability frames**, no new stamina cost and no attack-damage bonus. A valid evasion can fail to escape an attack's actual reach. Normal walking stays available during the evasion repeat interval. Existing attack recovery survives switching to evasion, preventing it from becoming a way to remove weapon recovery. A canceled/interrupted committed evasion retains its repeat deadline; refusal before commitment spends nothing.

This world's actual health loss interrupts unreleased aim and evasive movement. Its compiled body-policy adapter selects that reaction; the existing body-effect owner cancels work, releases an unspent aim claim and retains committed evasion recovery. Different interruption laws need a supported binding under [EWF03](../../maintainers/extensible-world-foundation.md#ewf03--extract-default-body-and-need-policies-through-real-consumers); these native families do not yet select them from installed definitions.

These initial values should be assessed for useful choice, especially at the current accelerated clock and with keyboard/pointer input. Adjust through this same world owner when evidence shows a poor result; report the change and tradeoff. A small successful dodge does not establish optimal balance or universal reflex accessibility.

## Discovery and visible information

Use plain labels: **Aim at [target] with [tool]**, **Shoot**, **Cancel aim**, **Shoot once at [target] with [tool]**, and **Evade to [destination]**. Hunting can retain its world-authored purpose label while resolving to that same physical shot. Include relevant known distance, preparation, cost, observed health, actual tool and blocker, with optional detail for the other stats.

Release text says a shot was fired; impact text distinguishes observed target injury, shield prevention, scenery interception and a miss. Do not reveal an unseen interception location or body. A character knows their own evasion result and cooldown; an observer sees only what current perception permits. Existing final-blow review, PvP denial and inactive protection remain controlling.

Visible body condition reports the installed meter's name, projected value and bounds only when its disclosure and current perception permit it. It does not infer death from a displayed zero: an installed meter can use a different range, and its body policy can incapacitate rather than kill. Base-world Health retains its own authored death/return explanation. Evasion readiness uses the installed action label, and client controls use the supplied label rather than copying the world's action name.

## Maintained records

- Implementation: [CF02/CF03](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md).
- Limits: [RC01–RC07](../../limits/parallel-batch-06-rivals-and-contested-ground.md).
- Mechanisms: [batch 06 technical design](../../projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md).
