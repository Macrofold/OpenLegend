# Targeted actions

## Targeted strikes

A targeted strike is a finite trusted native action family. The [base-world combat specification](worlds/base/combat.md) owns the bundled Punch definition and balance; its authored data lives in `packages/domain/src/worlds/base/strikes.ts`.

The public intention is `{type: "strike", definitionId: "punch", targetId: "entity-id"}`. The server supplies actor and command identity. Clients cannot submit damage, range or executable behavior. The current family requires a supported biped attacker on a supported ground stance and another living, currently perceived actor as target. It supports both people and animals as targets. No weapon is required; equipping a weapon does not modify a punch.

Admission uses the normal command boundary. If out of reach and automatic approach is enabled, the actor follows the existing supported approach path. Moving targets reuse existing endpoint validation and replanning; an unreachable or vanished target ends the action. With automatic approach disabled, an out-of-range command is rejected. One command schedules one strike, with no automatic repeated attacks. Stop or replacement commands cancel unfinished work.

At impact, the domain rechecks target life, definition/version, range and line of effect through the shared spatial query. A target that leaves reach during wind-up is missed without damage; it does not silently restart pursuit. Damage goes through `commitBodyEffects`, so susceptibility, injury, health clamping, incapacity/death and dependent work cancellation retain one authority. The committed `struck` event reports actual damage and is significant perceived evidence; native appraisal associates harmful strikes with the attacker. Surviving animals use the existing flee response.

Active work saves its definition ID/version, target, path and remaining time through the existing serializable action state. Loading rejects an unknown or changed active strike definition. Same-version work resumes without replaying committed hits. Command receipts retain duplicate protection. This additive family does not reinterpret existing action state or add migrations.

The first implementation registers trusted definitions in code. It does not yet admit user/generated strike declarations or a general effect scripting language. The extension seam is this typed definition plus the native strike executor; add definition validation/module registration when a real world-authoring consumer requires it. Combat balance, armor, attack combinations and non-biped attacks remain separate extensions.

## Presentation

The server projects an active strike's animation kind, progress and horizontal direction, and explicit `null` on completion/cancellation. Null is essential for merged player deltas: JSON omits undefined values and would otherwise leave the previous animation attached. The descriptor exposes neither private plans nor target identity.

The renderer uses cached pixel-sprite frames that replace the character's hanging arm with a bent guard, extension and contact pose. It faces the sprite toward the target's screen direction and uses a 180ms visual recovery to return to idle after the authoritative descriptor clears. Pausing freezes presentation. There are no separate arm/fist meshes. Rendering never applies damage, predicts success or controls completion.

## Discovery

Player target menus/catalogue and the NPC action candidates read the trusted definitions. Availability and final effects remain subject to domain admission. Offering Punch does not require a character to choose violence or introduce a native aggression controller. The catalogue explains reach, damage, timing and one-strike behavior.

Implementation facts are in [Architecture](architecture.md#targeted-strikes); observations are in [Verification](verification.md#targeted-punch-runtime). Deferred validation lives in [TODO](maintainers/TODO.md#targeted-strike-validation).
