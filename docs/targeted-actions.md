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

## Scaling and navigation-result integration

The [source audit SCA31](scaling/current-code-audit.md#sca31) identifies a current shared-wrapper limitation: `findPath` returns a route only for `reached`, and bounded approach attempts otherwise return `null`. That value alone cannot distinguish unavailable coverage, exhausted work, partial search and proved unreachability. The unreachable-target behavior above must not be used to label an incomplete technical search as a discovered physical impossibility.

[SW05/SW06](maintainers/spatial-world.md) and [AG05/action capabilities](maintainers/action-capabilities.md) retain the end-to-end correction: carry typed route outcomes into admission, ongoing actions, plans and UI. A deferred route is not successful arrival, cannot consume materials or deal damage early, and must not erase a longer-term goal merely because a cache or work slice is unavailable. Work limits remain useful; removing all bounds is not the fix.

For growing populations, qualify many simultaneous approach requests, a moved target, changed support/occlusion, exhausted stance attempts and one actor whose route genuinely does not exist. Measure candidate creation, exact stance tests, repeated route requests and longest native transition, not only the final A* call. [PF/SW](maintainers/scaling.md#existing-work-remains-in-its-existing-owner) own these measurements.

Future longer-range, area, non-biped or cross-region strikes must declare their actual target/effect reach and dependency/ownership contract through [SC13](maintainers/scaling.md#sc13) and existing INV/EWF/SW owners. The current native strike does not establish scalable crowd collision, a distributed combat solver, or client authority over impacts. No balance or runtime behavior changes are delivered by this section.

### Massive-scale research: staged action work

[Physics/navigation](../archive/02-research/massive-scale/domains/physics-navigation.md), [persistence](../archive/02-research/massive-scale/domains/persistence-consistency.md) and the [benchmark plan](../archive/02-research/massive-scale/benchmark-plan.md) inform these gates. The existing strike and its tests remain owned above; this is not a new combat backlog.

| Stage/consumer | Specific owner work | Exit applied to targeted actions |
|---|---|---|
| NOW/G1 current route/admission path | SW05/SW06/AG05, SC15.2/15.3 and SF03/SF04 | Incomplete search remains distinct; local candidate/resource work does not grow with unrelated scenery; exact impact and duplicate receipts remain correct. |
| G1 process-record migration | [D1-MS03](maintainers/production-data.md#d1-ms03), [D1-MS04](maintainers/production-data.md#d1-ms04), SC14.1 | Remaining work, target/pinned definition and already-consumed inputs survive selective load/restart without repeating a strike. |
| Before any new area/body family | SC13.1–SC13.4 and the actual INV/SW family | Expanded targets, physical extent and required witnesses have a finite supported work/authority contract, not client-authored damage. |
| LATER/G3 cross-owner combat | [LT-R06](maintainers/scaling-long-term/regions.md#lt-r06), LT-R07/LT-R09 | Designated interaction authority, time/fairness and transfer faults are proven before a border-crossing attack is offered. |

A local tactical strike does not need a general distributed combat or rollback solver. A future lag-compensation experiment cannot rewind previously disclosed speech, trades or private evidence without a separate explicit contract.
