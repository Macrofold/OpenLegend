# Targeted actions

## Equipped contact strikes

An installed item definition may declare finite damage, accuracy, contact range, inner approach distance, wind-up and recovery values. The public intention adds `itemId` to the strike's `definitionId` and `targetId`; the server binds it as the native `weaponItemId`. The exact accessible item must be held compatibly, with its current definition/version and a declared melee equipment use. Discovery and execution require that same use; a strike profile alone cannot grant it. An explicit `autoEquip` choice equips that item and stows only declared conflicts in the same transaction; admission checks their current reservations first and reports the change. These are validated data within a trusted family, not generated code or universal world balance.

At the end of wind-up the domain checks capability, target life/sight, line of effect and reach. A physically eligible attempt draws once from saved world randomness; an out-of-range/obstructed attempt misses without drawing. A hit resolves current contact defense and commits body effects once. Both outcomes emit `struck` with the actual hit/reason and the actor’s own awareness; the exact contact-injury/prevention report is disclosed only to the injured participant. Other health views and observed action effects still obey the installed health definition’s disclosure policy; merely seeing a body does not disclose private health. The saved recovery phase and actor deadline survive cancellation; switching to another melee or ranged attack cannot bypass that deadline. A dead/lost target or unavailable weapon stops unfinished work truthfully.

Current-format persistence retains exact references, phase, outcome and recovery timing. Reopening after impact cannot reroll or repeat damage. Each action performs one attempt; chosen short plans may repeat it without inference between steps. Completing the sequence records a private result but never completes a broad survival goal. [Base combat](worlds/base/combat.md), [AC09.6](maintainers/action-capabilities.md#ac09--expand-ordinary-use-through-domain-owned-families) and [verification](verification/embodied-survival.md) distinguish mechanics from unqualified spontaneous hunting.

## Finite chosen contact defense

A guard binds an exact compatible held item, its current profile, the defender’s physical life, fixed body facing and absolute simulation deadlines. A visible target supplies the initial direction only; guard never tracks an unseen attacker. Human commands, NPC choices and finite plan invocations use the same admission and physical action owner. Replacement ends readiness, and repeated requests cannot extend an active guard.

After an otherwise lawful connecting contact, one pure calculation determines prevented and remaining injury from current equipment, timing and source geometry. That attack consumes the one interception, commits body recovery and applies injury through the ordinary body owner once. Recovery survives Stop, movement and equipment changes while granting no protection; death/replacement life clears the retired body’s continuation. An expired restored guard cannot protect before its next continuation step. Projectiles and other hazards bypass this contact-only capability.

The [bundled shield profile](worlds/base/shield-defense.md) owns balance and wording; [AV02 evidence](verification/shield-defense.md) records actual manufacture, menu, injury, interruption and same-format return checks. Guarding supplies neither harmful-action permission nor attacker identity.

## Targeted strikes

A targeted strike is a finite trusted native action family. The [base-world combat specification](worlds/base/combat.md) owns the bundled Punch definition and balance; its authored data lives in `packages/domain/src/worlds/base/strikes.ts`.

The public intention is `{type: "strike", definitionId: "punch", targetId: "entity-id"}`. The server supplies actor and command identity. Clients cannot submit damage, range or executable behavior. The attacker needs a supported ground stance and a strike compatible with its body plan. Non-biped bodies additionally need that exact natural strike explicitly granted; the bundled stag consumes this support under its [authored encounter rules](worlds/base/first-threat-encounter.md). Targets must be living and currently perceived; human protection still controls harmful admission. Both people and animals can be supported targets. No weapon is required; equipping a weapon does not modify a punch.

Admission uses the normal command boundary. If out of reach and automatic approach is enabled, the actor follows the existing supported approach path. Moving targets reuse existing endpoint validation and replanning; an unreachable or vanished target ends the action. With automatic approach disabled, an out-of-range command is rejected. One command schedules one strike, with no automatic repeated attacks. Stop or replacement commands cancel unfinished work.

At impact, the domain rechecks target life, definition/version, range and line of effect through the shared spatial query. A target that leaves reach during wind-up is missed without damage; it does not silently restart pursuit. Contact injury goes through the shared contact-impact calculation and then `commitBodyEffects`, so susceptibility, injury, health clamping, incapacity/death and dependent work cancellation retain one authority. The committed `struck` event retains the authoritative injury result and projects only perceivable facts to observers; native appraisal associates harmful strikes with the attacker. Surviving ordinary prey use the existing flee response; a territorial animal instead reacts through its installed policy, using perceived evidence without running both movement controllers.

Active work saves its definition ID/version, target, path and remaining time through the existing serializable action state. Loading rejects an unknown or changed active strike definition. Same-version work resumes without replaying committed hits. Command receipts retain duplicate protection. This additive family does not reinterpret existing action state or add migrations.

Natural-strike definitions are validated installed world data; equipped profiles are validated installed item data. User/generated strike declarations and general effect scripting remain unsupported. The extension seam is the typed profile and native executor. World-specific balance, armor, attack combinations and natural attacks beyond the supported body/profile family remain separate extensions.

## Presentation

The server projects an active strike's animation kind, progress and horizontal direction, and explicit `null` on completion/cancellation. Null is essential for merged player deltas: JSON omits undefined values and would otherwise leave the previous animation attached. The descriptor exposes neither private plans nor target identity.

Equipped strikes project their tool and authoritative wind-up/recovery phase. Recovery uses the attacker’s public heading rather than tracking an unseen escaping target. The same cached arm frames show the swing and return; bespoke knife artwork remains outside this slice.

The renderer uses cached pixel-sprite frames that replace the character's hanging arm with a bent guard, extension and contact pose. It faces the sprite toward the target's screen direction and uses a 180ms visual recovery to return to idle after the authoritative descriptor clears. Pausing freezes presentation. There are no separate arm/fist meshes. Rendering never applies damage, predicts success or controls completion.

## Discovery

Player target menus/catalogue and the NPC action candidates read the trusted definitions. Availability and final effects remain subject to domain admission. Offering Punch does not require a character to choose violence or introduce a native aggression controller. The catalogue explains reach, damage, timing and one-strike behavior.

Targeted menu labels put the target before the weapon, for example **Attack hare with Knife** or **Punch hare**. Compact menu labels use bare observer and weapon names under the shared [naming contract](entity-names.md). Weapon names are preserved, including names of invented weapons; the bundled world owns the weapon-action wording.

Implementation facts are in [Architecture](architecture.md#targeted-strikes); observations are in [Verification](verification/physical-actions.md#targeted-punch-runtime). Deferred validation lives in [TODO](maintainers/TODO.md#targeted-strike-validation).
