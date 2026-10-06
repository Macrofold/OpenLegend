# Held shields and chosen defense

**Proposed base-world rules, October 5, 2026; not implemented.** [AV02](../../maintainers/parallel-batch-05-adventure-defense-and-home.md#av02--shield-defense-and-compatible-equipment) owns this first defensive consumer. Native authority and exact attachment are generic; these body slots, timings and combat laws belong to this world.

## Compatible equipment

Applicable people have a main-hand and an off-hand equipment port. A knife or existing one-handed gathering tool uses the main hand. A shield uses the off hand. The selected spear and current sling/bow launcher profiles require both hands; equipping one removes conflicting held equipment into carried custody atomically, without moving it to the ground or changing ownership. These are explicit definition capabilities, not deductions from names. A nonperson body without these authored ports does not acquire human equipment by default.

The engine represents one physical attachment per item and derives occupied ports from its admitted profile. The base-world definitions provide the port labels, compatible tool uses and occupied-port requirements. Future clothing consumes that same attachment mechanism with its own port and permissions; it does not mean shields introduce every future armor slot.

Choosing a weapon action can still auto-equip its exact item. Show **Auto-equip; put away Shield** when that is the actual consequence. An unavailable/conflicting reserved item blocks before either item changes. Equipping never duplicates an individualized unit. Knife and shield can remain equipped together, but guarding and attacking are separate chosen physical actions.

## One practical shield

Offer a known wooden-shield method using three wood and two cord, producing one shield after 240 game seconds. Give applicable starting characters this ordinary recipe knowledge through the authored knowledge source; do not spawn a shield in everyone's bag or pretend the known recipe was invented live. It has packing load 3. Reuse current material roles/admission and expose a finite shield family for compatible newly admitted definitions.

The shield profile supports contact injury defense only. Its authored guard reduces injury by one half when the actual incoming contact is in the front 120-degree horizontal sector and the guard is active. It supplies no protection against starvation, exhaustion, unmodeled falls, heat, projectiles or every status contribution named damage. There is no second block probability or reroll; a late, wrong-facing or unavailable shield fails the guard conditions. Existing attack accuracy still determines whether a blow connects.

Finite family authoring may vary the reduction from 0.25 to 0.6 and the sector from 90 to 140 degrees. The first known shield uses 0.5 and 120 degrees. Duration and action-channel rules remain this world's guard law, not candidate-provided executable behavior. A different admitted profile must affect the actual outcome and displayed explanation, proving the known shield is not a hard-coded exception.

## Guard one incoming contact

**Guard with Shield** accepts a chosen visible target or an explicit permitted facing direction. It spends 15 game seconds preparing, remains ready for at most 180 game seconds, and recovers for 60 game seconds after intercepting the first otherwise valid contact hit or after the readiness window expires. At the current normal 60:1 clock those phases are 0.25, up to 3, and 1 real second; simulation time owns them. Pausing freezes the action, not a separate browser timer.

The action does not automatically follow an unseen target, move the defender or turn toward hidden incoming damage. Initial facing comes from the selected observed direction; a later explicit turn must use an actual supported orientation command and the same current facing used for geometry. Starting movement or an offensive action cancels guard readiness under normal action replacement. Guard is not a parallel invulnerability flag while another full physical action proceeds.

At contact resolution, use the attack's actual source position, defender position/facing, current equipment and action phase. A geometric front-sector match alone does not create a hit: range, sight, consent and the original attack's other requirements remain. A miss spends no defense interception and leaves the ready window running. A connecting compatible front attack consumes this guard's one interception and applies reduced injury once. A rear or incompatible hit applies ordinary injury and uses the normal interruption rule; it gains no reduction and may end the guard.

The result can say “Shield blocked 9 of 18 injury; you lost 9 health.” If an observer is not permitted to know an exact value or attacker identity, use the permitted physical account instead. A prevented component and actual health change belong to one action result, not two attacks. Existing death/incapacity rules use the final actual injury.

No passive auto-guard, endless held stance, stamina meter, shield wear, parry stun, counterattack, projectile interception or new PvP permission is introduced. A finite guard makes defense an action with a time/opportunity cost while keeping walking away a legitimate option. Expansion needs a useful encounter that this scope cannot express.

## Maintained records

- Delivery: [AV02](../../maintainers/parallel-batch-05-adventure-defense-and-home.md#av02--shield-defense-and-compatible-equipment).
- Mechanism and UI: [technical definition](../../projects/parallel-batch-05-adventure-defense-and-home-tech-design.md#av02--equipment-and-one-contact-defense-owner).
- Limits: [AV-L02](../../limits/parallel-batch-05-adventure-defense-and-home.md#av-l02--equipment-and-finite-contact-guard); existing [combat](combat.md) and [lifecycle](lifecycle-and-protection.md) retain their authority.
