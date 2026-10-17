# Combat

## Equipped melee

The knife is an installed item profile consumed by the general contact-strike family. It must be held as an exact compatible item; an offered attack can atomically equip it and show which conflicting items were put away. Each chosen action approaches once, winds up, resolves one hit/miss and recovers. [BW08](../../limits/base-world.md#bw08) owns the numerical balance. The normal player/NPC/plan admission path binds the exact item and target; neither hunger nor an animal's presence selects it automatically.

A miss produces a real `struck` outcome and the attacker's private awareness, including why no damage occurred. Surviving prey can flee after the attempt. Another strike needs another chosen action or an explicitly admitted plan step. Native moving-prey, alternate-profile and restore checks pass; [live Jev-only hunting and miss-aware retries are demonstrated](../../verification/embodied-survival.md#minimal-context-and-equipment-derived-hunting). Visual acceptance and broader behavioral reliability remain open under [AG13](../../maintainers/agent-agency.md#ag13--embodied-survival-demonstration).

The base world's initial unarmed strike is **Punch**: definition `punch`, version 1, reach 1.3 world units, automatic approach, 30 simulation seconds of wind-up, 5 injury damage and `punch` presentation. At the base clock its wind-up is half a real second. It requires a supported biped and a living, perceived target. Equipping a weapon does not modify this strike.

The authored definition lives in `packages/domain/src/worlds/base/strikes.ts`. These are base-world balance choices. The [targeted-strike runtime](../../targeted-actions.md) owns admission, approach, hit revalidation, body effects, persistence and presentation. This initial mechanic specifies one strike, not autonomous aggression or repeated attacks.

## Chosen contact defense

The [shield profile](shield-defense.md) owns compatible hand use, ordinary manufacture, finite guard timing, coverage and reduction. Knife and shield may remain held together, but guarding and striking are separate chosen actions. Contact strikes and the territorial stag use one injury calculation after ordinary hit legality; the body owner then applies susceptibility, scars, clamping, interruption and death once. A successful guard consumes one contact and starts recovery; missed, late or uncovered blows receive no reduction. Supported straight projectiles consume that same guard from their actual incoming direction; unrelated bodily hazards receive no shield reduction.

The exact contact-injury/prevention report is participant-private; observers receive only their perceivable physical account. Public health views and recorded observed health effects still follow the installed health definition’s disclosure policy. Guarding grants no PvP consent or hidden attacker identity. [AV02 evidence](../../verification/shield-defense.md) separates actual native/browser outcomes from untested model preference and wider combat qualification.

## Accepted lethal-action direction

Human-issued supported strikes/hunts/shot releases currently require [one exact potentially lethal attack confirmation](player-danger.md#final-blow-confirmation), and the [territorial stag](first-threat-encounter.md) uses an explicitly granted natural-contact profile through the same attack owner. Player death uses [corpse/half-type/scar continuity](player-death.md); NPC and animal deaths persist without ordinary revival. The October 17 selected revision permits human PvP and actual projectile collateral under [world participation](lifecycle-and-protection.md#human-conflict-and-recovery) and [contact consequences](ranged-counterplay.md#selected-contact-consequences); implementation remains CTR01. Broader indirect hazards, rescue and property policy remain BW14/D07; NPC ghosts/ordinary revival remain BW15. These are installed world choices rather than universal strike laws.

## Selected threat and encounter continuity

**Selected October 17, 2026; not yet implemented.** The [combat-response project](../../projects/combat-and-threat-responses-feature-spec.md) extends the current physical actions and Command-click implementation. A short encounter concerns particular physical participants and personally available evidence. It is not a global combat flag, moral judgement, relationship score or permission to act.

### Separate facts the player can understand

| Fact | What establishes it | What it does not imply |
| --- | --- | --- |
| Selected or hovered person | Local inspection or pointer input | An attack, a warning to that person, or hostility. |
| My chosen attack | My successfully admitted exact attack/aim command | A hit, repeated attacks, or another person's awareness. |
| An observed attack directed at me | Personally exposed preparation, approach, release or contact directed at this physical body | Knowledge of a private plan, another target's danger or an unseen shooter's identity. |
| A recent hostile occurrence | An observed directed attempt, including a miss or shield interception, or a known source of injury | Permanent aggression or the character's chosen reaction. |
| Someone has withdrawn | Personally observed cessation/separation or loss of sight | Surrender, forgiveness, certainty that they are safe, or permission to pursue. |
| My feeling or chosen purpose | My admitted appraisal or independent decision | A publicly readable target lock or an automatic attack. |

Maintain these facts per ordered pair of exact physical lives. Several opponents can be relevant at once. Ada attacking a wolf does not make her an attacker of Mike; Mike selecting Ada does not alarm her. Unknown-source impact can create urgent personal danger without naming a nearby innocent person. The person may interpret motive or accident through cognition; native evidence never labels someone evil or guilty.

### Recent-hostility grace

The bundled world selects **600 game seconds**, ten real seconds at its normal 60:1 clock, of contextual continuity after the last personally observed hostile occurrence or the observed end of an active directed attack. An ongoing personally observed attack or one's own admitted current attack remains current regardless of that deadline. A new observed attempt, miss, block or hit renews the relevant pair; ordinary proximity, hovering, merely thinking about retaliation and repeated reads do not. A lost-sight transition starts the grace from the last time the directed activity was actually known; it does not keep refreshing an invisible attacker.

Use simulation time. Pause freezes the interval; faster playback consumes it faster; server downtime spends none. The literal 600 lives in the installed world profile, not the client or generic scheduler. It is a presentation/short-term encounter parameter, not an emotional decay duration, pursuit budget, human participation permission or final-blow authorization.

Incoming evidence and my own offensive preference have separate deadlines. My accepted offense remains current while its actual action/commitment remains active; when it ends, retain its exact method for the same 600 game seconds unless I explicitly end that intent. An accepted new attack clears the deliberate Speak override; a refused attempt does not. On expiry, retire only the expired preference when no corresponding current attack or explicitly selected still-valid commitment retains it. Keep ordinary remembered evidence and appraisals under their own retention. Ending this encounter never wipes a grudge; a grudge alone never permanently turns every conversation shortcut into Attack.

### Contextual action decision table

The existing installed context-action catalogue remains the sole source of action priority, label, tool and exact bindings. The Command shortcut, object actions and keyboard-accessible equivalent use that same answer. Evaluate the following rows **in order; the first applicable row chooses the action family**. Within that family, the installed stable ordering breaks exact-method ties. A temporary blocker is evaluated after family selection and never causes fallback to a different family.

| Priority | Current personally available situation for this target | Primary contextual action |
| --- | --- | --- |
| 1 | Target dies, leaves physical participation, changes physical life, is no longer currently perceived or is otherwise unavailable to the old binding | Invalidate the old preview. Offer only currently permitted actions for the actual observed object/body, if any; no remembered live-target attack or hidden position. |
| 2 | A deliberate Speak override for this controller and pair still matches the latest hostile-evidence revision | Speak, opening an editable draft. Ordinary movement, the existing grace deadline and an already known attack do not revoke this choice. |
| 3 | My held aim at this exact life with its claimed ammunition, without that override | Release that held shot, with any required review; never Aim again or silently change tool/target. |
| 4 | This visible person has a current/recent observed attack directed at me, or I retain my own admitted offensive preference for this pair | Prefer the retained exact attack method when supported; otherwise select the disclosed world default below. One click requests one action. |
| 5 | Berry bush with an ordinary useful gathering action | Gather the authored resource. |
| 6 | Ordinary living person without an applicable earlier row | Speak, opening an editable draft. Merely seeing this person attack somebody else does not create a directed attack against me. |
| 7 | Another object or available action family | Use the existing installed ordinary contextual ranking. |

After choosing an attack/release family, a temporary recovery, work, range or ammunition-claim blocker keeps that exact action visible and disabled with its actual reason; no automatic queue or fallback to Speak. If there is no currently supported attack method, show the combat action as unavailable and expose the ordinary full menu. A permanently invalid retained method may be replaced only by the disclosed default in a fresh preview; an already held gesture remains stale. A separately chosen protective purpose may establish my own involvement only through its actual admitted offensive action, not by witnessing a fight alone.

When entering a pair's combat preference without a retained method, prefer an already held compatible ordinary contact weapon, then a granted unarmed strike. Do not automatically equip a different weapon, draw ammunition or choose a lethal method merely because it has a larger numeric priority. If only a supported ranged attack is available, show its exact tool, ammunition and preparation explicitly before it can become the shortcut. The installed profile may choose a different default; all surfaces consume the same selection. Explicit full-menu choice remains available for every admitted alternative.

An attack that normally includes approach must say **Approach and strike…** when approach is necessary and permitted. Prefer no undisclosed pursuit. One Command-click means one admitted action: key/button holding does not repeat and recovery clicks do not form a queue. An explicit future repeat-attack feature would require its own selected commitment and cancellation controls.

### Predictable gestures and ending intent

Capture the exact displayed target/life, action, tool/ammunition and applicable preferred-choice identity at primary-button down. If any consequential binding or the meaning of the preferred action changes before release/serialized admission, refuse the old shortcut and refresh its explanation. Never turn a displayed Speak into an attack, a displayed punch into a shot, or an attack on one body into an attack on its successor. The implemented preferred-choice guard and receipt recovery already supply this foundation; extend them rather than add a second command path. Explicit lethal confirmation remains an independently reviewed exact intention.

Releasing Command ends only the shortcut overlay; changing selection ends only inspection. Neither changes world conduct. An ordinary move away ends unreleased work through existing replacement rules but can leave recent hostile context for a later counterattack. An explicit **Stop attacking this person** ends one's future offensive commitment and clears the retained offensive method and its own recent deadline; it cannot recall released flight, erase recovery, hide actual incoming hostility or make the other person peaceful. The full menu can deliberately open Speak during recent hostility. Retain that deliberate social override until the next fresh personally observed hostile occurrence or an explicit new attack, so the interface does not fight the player's decision to talk. This override belongs to that controller and pair, not to the target's mind. Opening a speech draft is not itself cancellation of existing physical work: its ordinary compatible-action semantics remain visible. Use Stop attacking to cancel an unreleased offensive commitment; already released effects and incoming evidence remain authoritative.

Expiry alone changes the default on the next fresh preview; it never substitutes an action under a held gesture. Withdrawal, words of surrender or a claimed accident can be evidence for a new decision, but do not grant automatic damage immunity. Any materially changed visible body state invalidates the old shortcut before another damaging action. The player can still choose an allowed explicit action after reviewing the new situation.

### Character and animal responses

The [personal response catalogue](threat-response-options.md) defines flexible chosen purposes and Ada's required self-defense baseline. [Psychological reactions](psychological-reactions.md) owns the source-linked feeling profile. A purpose can end or change when the aggressor leaves, when a strike resolves or when the person's own situation changes; [CTR08](../../maintainers/combat-and-threat-responses.md) specifies exactly which meaningful transitions wake a decision. No UI grace timer chooses Ada's behavior.

The [native animal response profile](animal-responses.md) instead supplies efficient multi-danger escape, retained refuges and species movement, with no model calls. An animal may classify all perceived humans as possible danger during alarm without accusing all of them of attacking it. Territorial action and escape share one physical owner.

## Maintained records

- Implementation: [Action capabilities](../../maintainers/action-capabilities.md), [batch 06](../../maintainers/parallel-batch-06-rivals-and-contested-ground.md), and [CTR01–CTR10](../../maintainers/combat-and-threat-responses.md).
- Limits: [Base-world combat](../../limits/base-world.md), [ranged/evasion](../../limits/parallel-batch-06-rivals-and-contested-ground.md), and [threat-response limits](../../limits/combat-and-threat-responses.md).
- Design: [Feature specification](../../projects/combat-and-threat-responses-feature-spec.md), [technical design](../../projects/combat-and-threat-responses-tech-design.md).

