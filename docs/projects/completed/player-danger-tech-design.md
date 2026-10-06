# Player Danger — technical design

| Status    | Current progress                                                                                                                                       | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | Selected runtime, documentation, required review and focused native/service/browser verification are delivered; broader qualification remains tracked. | 2026-10-04   |

## Scope, source and implementation plan

Implementation uses refreshed `origin/main` d36ec3bd and the integrated [authorized first-threat plan](first-threat-encounter-tech-design.md#conditional-implementation-breakdown). Mike's revisions remove unimplemented enrollment/entry guards, guaranteed warning timers and automatic retreat; add true death/scars and simulated departure exposure; retain cooperative PvP and inactive protection. This is now delivered execution, not the earlier zero-logic design draft. The full combined risk/estimate and exact owners are in the parent technical design.

## Existing owners and changed contracts

Authored objects/ordinary perception supply a finite sign cluster and posture without a hidden danger score. The existing action/animal phase and `territorial-threat.ts` use actual sight, body eligibility, finite deadlines and current geometry. `combat-consent.ts` and authenticated WorldService bind one supported strike/hunt commitment; existing body/attack owners perform effects. Domain participation and simulation boundaries save one game-time exposure per exit attempt. Server authority retains login/control identity and serialized commits; it does not supply a wall-clock combat timer. Protocol/client render permitted facts with existing modal/action/scene surfaces.

All policy, eligibility/tuning and words come from bundled-world definitions. Natural capability is explicit, not species/name magic. Human-issued supported attacks carry trusted human initiation from the server even when controlling a speaking NPC; public/generated input cannot grant that authority. Native environmental/creator effects remain distinct, and unsupported new indirect attacks are not admitted as encounter tactics.

## Departure ordering and restoration

Loss of the final controlling presence creates/reuses an authoritative exit attempt and fixes `world.simTime + installed exposure`. Interrupt unfinished human work, plans/rest/conversation through existing owners and preserve already committed costs. Keep the body fully participating/targetable while fading, even without earlier engagement. The lone fade keeps normal simulation active. Pause, maintenance, path preparation and downtime advance no exposure; operational wall expiry cannot override remaining game time.

The saved deadline joins existing temporal boundaries. Integrate continuous effects over the exposed preceding interval, finish inactive departure, then consider discrete impact/completion at that instant. Existing `TIME_EPSILON` handles accumulated floating-point residue so tied work cannot slip before protection; it is numerical resolution, not an additional world grace. A fatal prior effect delegates to the sole Player Death owner. Expiry never resurrects the body, protects corpse loot or refunds wounds.

Authenticated returned control cancels the pending fade under the same body/life. Duplicate absence messages do not restart it; a later genuine return/departure receives fresh exposure. Multiple tabs share one lease/body and stale generations cannot return or act for an old life. Restart preserves the coupled simulation deadline and remaining exposure, creates no downtime combat and discards unconsumed attack reviews. Existing checked return placement remains; dead characters get explicit Continue, not implicit revival.

## Final-blow authority and projection

Admission resolves exact native/profile/tool/ammunition and checks conservative injury. Review stores one ephemeral token per actor, original input digest, current scope/generation, source/target life and exact attack commitment, with existing capacity and 60-real-second expiry. No preview effects, random draw, target lock, paid work or supply debit occurs. Native action records carry accepted authority and ordinary pins; durable command receipts make retries exactly once. New-source/target/tool/profile/scar/control/world invalidates; confirmed health-only consequences remain covered. An unconfirmed attack newly lethal stops before remaining ammo/damage.

The modal consumes the existing world-authored activity facts and observed name; it introduces no second weapon policy, hidden relationship list or private intent. Base animal/character health is currently public; private-health worlds need an explicit disclosure policy before conditional review reuse. Cancel/Escape cannot act behind the dialog, and stale asynchronous offers are ignored after life/scope changes. Death owns its private item snapshot and no live corpse view. Fade is presentation of saved simulation progress, with no gradual mechanical immunity.

## Costs, persistence and verification

Native signs/controller/effects need zero model calls; no separate absent-player scheduler, footprint history, target scan or SQL write per pose exists. Locally filtered candidate selection, existing work admission and one route/action remain finite; wider dense capacity is explicitly unqualified. Current-format records/validation update together without old compatibility. Actual service/native/browser checks and capacity failure belong to the [focused report](../../verification/first-threat-encounter.md), not a second checklist here.

## Maintained records

- Implementation: [PG05](../../maintainers/parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design), [BW14](../../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery), [DG07/ND11](../../maintainers/needs-design.md#dg07--human-participation-and-recoverable-conflict), [MP04](../../maintainers/multiplayer.md#mp041--participation-and-bounded-exit-contract).
- Limits and constraints: [FT01–FT07](../../limits/base-world.md#ft01--proposed-first-threat-scope-and-reward), [native work](../../limits/native-work.md), [objects](../../limits/objects.md), [persistence](../../limits/persistence.md).
- Related contract/design: [Current authored encounter](../../worlds/base/first-threat-encounter.md), [lifecycle/protection](../../worlds/base/lifecycle-and-protection.md), [verification](../../verification/first-threat-encounter.md), [D07/PS-D01 decision record](../../../archive/05-project/open-decisions.md#pg05--proposed-first-encounter-choices).

- Related counterpart: [Feature specification](player-danger-feature-spec.md).
