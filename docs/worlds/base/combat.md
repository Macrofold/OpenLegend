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

Human-issued supported strikes/hunts/shot releases currently require [one exact potentially lethal attack confirmation](player-danger.md#final-blow-confirmation), and the [territorial stag](first-threat-encounter.md) uses an explicitly granted natural-contact profile through the same attack owner. Player death uses [corpse/half-type/scar continuity](player-death.md); NPC and animal deaths persist without ordinary revival. The October 17 selected revision permits human PvP and actual projectile collateral under [world participation](lifecycle-and-protection.md#human-conflict-and-recovery) and [contact consequences](ranged-counterplay.md#selected-contact-consequences); CTR01's policy/contact foundations are implemented, while complete caller/disclosure/persistence qualification remains open. Broader indirect hazards, rescue and property policy remain BW14/D07; NPC ghosts/ordinary revival remain BW15. These are installed world choices rather than universal strike laws.

## Selected awareness, preparedness and surprise

**Accepted target; runtime delivery remains open in [SUR01–SUR09](../../maintainers/preparedness-and-surprise.md).** The [feature specification](../../projects/preparedness-and-surprise-feature-spec.md) describes the experience; the [technical design](../../projects/preparedness-and-surprise-tech-design.md) refines frozen SC11–SC14 through existing encounter/contact/body owners. Surprise concerns an unexpected threat reaching a body, independently of whether defense succeeds. The contextual-action grace below is a different rule.

### Preparedness policy

The authored source is `BASE_BODY_POLICY.combat.encounters` in `packages/domain/src/worlds/base/body-policy.ts`, with generic validation in `packages/domain/src/body-policy.ts`. Consumers read that source; engine, client and prompts do not repeat defaults. All durations are normal-speed real seconds, converted once through the installed clock. These initial values are gameplay hypotheses, not measured reaction science or verified balance.

| Policy field | Initial value | Meaning |
| --- | --- | --- |
| `surpriseDamageMultiplier` | 2 | Apply once to eligible nominal direct injury before shield/protection and bodily susceptibility/scars. |
| `warningRegistrationSeconds` | 0.20 | Uninterrupted eligible interval after actual personally acquired warning before native anticipation exists. |
| `deliberatePreparationSeconds` | 0.20 | Lead from actual physical method start for guard/aim/strike/evasion; from achieved fulfillment for observation/native-alert. Current fulfillment and stricter native readiness still apply. |
| `warningRetentionSeconds` | 6 | Retain supported expectation after its last fresh warning or actual continuous-confirmation boundary. |
| `unwarySettleSeconds` | 2 | Additional quiet interval. Fully matching scoped work may postpone scoped settling, never broad assault expectation. |
| `outcomeRule` | First designated direct outcome per execution and actual victim life | Miss, block or zero injury spends the opportunity. Current melee/terminal projectiles use existing outcomes; future families follow the technical extension gate. |
| `fearInteraction` | D's existing parameter boundaries | No second surprise accuracy/evasion/Composure factor, damage-resistance change or movement penalty. |

At the current 60:1 normal clock, the two leads are 12 simulation seconds, retention 360 and settling 120. Admitted work/warning retains its clock binding; 3×/8× advances it faster and pause spends none. Supported clock edits use SC13's explicit settle/revalidate/rebind path, never an implicit second conversion.

**Registration.** The exact living, participating body must have no general-perception capability block throughout registration. Memory, cognition, available actions, locomotion and current sight of the source are not prerequisites. A restrained but aware person can expect an unavoidable hit. Registration creates anticipation only: no forced pose, chosen action, thought or feeling. Prose declarations, model completion and wall time cannot supply it.

| Personally acquired/admitted basis | Supported expectation |
| --- | --- |
| Readable preparation/release/attempt directed at this body, felt attack, or acquired incoming-flight motion proof | Finite ordinary physical-assault expectation, including unknown/multiple attackers. A permitted exact source or approach can also retain narrow continuity. |
| Understood current scoped danger claim or supported current region-danger interpretation | Ordinary-assault anticipation within its original region/approach, preserving testimony and uncertainty. A false alarm can prepare someone without establishing that an enemy exists. |
| Own actual offensive method and irreversible attempt/release | Its genuine opponent/approach only. Mature commitment preserves that expectation through recovery; immature commitment begins ordinary registration. Mere approach, proposal/cancellation or recovery supplies none. |
| Fulfilled anticipation, ready guard or qualified native alert | Actual maintained scope, threat kind, physical coverage and lifetime, without requiring attacker identity. |
| Familiarity, friendship, weapon possession, general reputation, raw fear, old grudge or subthreshold noise | No preparedness alone. A received suspicious cue can inform chosen anticipation or a later admitted danger interpretation. |

F consumes permitted typed meaning; it does not parse arbitrary speech, invent threat interpretation or read hidden targets. The technical claim allowlist requires actual understanding and current bounded scope. Seeing an attack on someone else is not automatically a directed threat to oneself. Betrayal can surprise an otherwise unwary person; changing allegiance during already anticipated assault does not guarantee another physical multiplier. Novel/environmental hazard families receive no implicit rule.

**Maintained preparation.** Actual fulfillment, coverage and earned lead govern every method. A guard uses body/shield facing, not head or camera direction, and becomes eligible at the later of native readiness and method-start-plus-lead; the delays are not added. Guard and compatible head watch can share an action while retaining independent timing. Watch uses only active fulfilled focus. Ordinary looking/listening and unvisited scan directions give no anticipation. Aim/strike is scoped to the actual opponent; blocked locomotion alone does not negate an animal's fulfilled alertness.

**Continuity.** Retention and quiet settling are six plus two seconds, with no qualifying support at the final endpoint. Fresh matching warning renews already registered meaning without an artificial gap; stale publication cannot. Actual continuous observation can sustain its supported threat. Only work covering an entire source/region/approach warning can postpone that scope's settling. Broad self-assault expectation is renewed only by actual fresh attack evidence or continuous directed-threat confirmation, not unrelated work.

A real acquired attack can preserve already mature matching preparation when it consumes a guard; newly learned broader danger still needs registration. Narrow known-opponent expectation prevents brief rear movement or occlusion from resetting an ongoing fight. Stop ends current methods, not independent registered warning. Ending an unused watch leaves no residual sectors. Weapon swaps, preferred Speak, exposure replacement and reconnect do not reset another body's evidence.

**Readiness changes.** Rest's general-perception block retires pending and registered bodily preparedness; waking requires fresh acquired/confirmed threat or newly fulfilled preparation. Injury wakes only after its waking contact. No sound wake or new unconsciousness mechanics are added. New physical life retires bodily continuation. Same-life control changes preserve valid bodily evidence unless an actual life/perception/participation-ending transition occurs; transport reset alone is not such a transition. Correction removes dependent future support without undoing committed harm or shock.

**Consequences and permission.** Capture the actual victim before contact mutation. Apply the factor once through the existing damage path, then commit D's eligible unexpected-contact cause with the outcome; impact evidence cannot warn against itself. A wholly unseen miss produces neither invented damage nor contact shock. D owns composure, fear, reaction amounts and parameter sampling. Its selected `conditionAdjustment: none` prevents stacking generalized fear with the alternative `danger-or-return` heuristic. Fear does not automatically slow running. SA-D01 remains open for controlled-character interpreted-emotion creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control-transfer behavior.

Precommit potentially lethal review includes maximum permitted amplified harm independently of private victim readiness. A released shot keeps its existing contact policy without a second target review; each actual collateral/intercepting victim uses their own preparation. Current armor/protection/recovery rules remain authoritative.

Exact algorithms, body/policy invalidation, half-open boundaries and supported extension semantics: [technical design](../../projects/preparedness-and-surprise-tech-design.md). Tuning rationale and adjustment points: [SUR-L01–SUR-L05](../../limits/preparedness-and-surprise.md).

## Emotional mechanics

[Emotional physiology](../../projects/emotional-physiology-feature-spec.md) selects the general emotion system, with numerical rules authored once in [psychological reactions](psychological-reactions.md). Effective fear takes the strongest applicable normalized native/appraised contribution. Independent concerns retain their personal source/target meaning; many small causes do not sum into a new fear total. Short bodily startle needs no AI or identified source, while interpreted fear may last after it fades. Native animals use the same applicable body rule and their own existing response controller.

The selected accuracy factor is consumed once per attack attempt. The implementation joins the current recovery-phase melee probability and the separate one-phase Punch/natural-strike completion into one resolver. Ranged combat and practice apply shooter physiology before the existing release-steadiness sample and freeze the selected direction; exact swept collision resolves contact without another fear roll. The selected ranged condition adjustment is `none`; its optional `danger-or-return` target-alarm shortcut is mutually exclusive with this generalized fear composition.

Fear reduces the maximum reach offered for a **new evasion**, with an over-reach destination refused before costs. An admitted evade keeps its endpoint, path, speed and duration. Ordinary running and fleeing speed remain unchanged, and no intensity chooses fight or flight. Menus, previews and native admission use the same supported parameter answer. The numerical penalty, applicability and startle curve stay in the psychological-reactions policy rather than separate combat constants.

An independently eligible emotional review can reconsider existing supported fear without selecting another response or inventing a new attack. Same-cause reassessment retains the original source and its authored horizon; ordinary decaying reframe and no-change cannot restart the feeling. Compatible review work can share the threat pipeline's first stage, while the character's actual response remains a separate choice. [Time and lifecycle](../../projects/stealth-awareness-tech-design.md#time-and-lifecycle) own normal-play duration conversion, original deadlines and exact life continuation. [SA-D01](../../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) retains the unresolved longer-lasting interpretation policy for directly controlled characters; native bodily conditions apply equally. These designed effects remain pending implementation and do not claim the current numerical strike/guard profiles already include them.

## Selected threat and encounter continuity

**Accepted October 17, 2026 target with partial implementation.** Personal encounter records, observed attack-preparation cues and native response foundations are present; [CTR](../../maintainers/combat-and-threat-responses.md) distinguishes their delivered subsets from remaining implementation and qualification. The [combat-response project](../../projects/combat-and-threat-responses-feature-spec.md) extends the physical actions and Command-click implementation; its contextual UI completion remains separately tracked. A short encounter concerns particular physical participants and personally available evidence. It is not a global combat flag, moral judgement, relationship score or permission to act.

### Separate facts the player can understand

| Fact | What establishes it | What it does not imply |
| --- | --- | --- |
| Selected or hovered person | Local inspection or pointer input | An attack, a warning to that person, or hostility. |
| My chosen attack | My successfully admitted exact attack/aim command | A hit, repeated attacks, or another person's awareness. |
| An observed attack directed at me | A personally exposed committed attack cue or actual contact under the selected disclosure rule | Knowledge of a private plan, another target's danger or an unseen shooter's identity. |
| A recent hostile occurrence | An observed directed attempt, including a miss or shield interception, or a known source of injury | Permanent aggression or the character's chosen reaction. |
| Someone has withdrawn | Personally observed cessation/separation or loss of sight | Surrender, forgiveness, certainty that they are safe, or permission to pursue. |
| My feeling or chosen purpose | My admitted appraisal or independent decision | A publicly readable target lock or an automatic attack. |

Maintain these facts per ordered pair of exact physical lives. Several opponents can be relevant at once. Ada attacking a wolf does not make her an attacker of Mike; Mike selecting Ada does not alarm her. Unknown-source impact can create urgent personal danger without naming a nearby innocent person. The person may interpret motive or accident through cognition; native evidence never labels someone evil or guilty.

### Readable attack cues

**Selected sensing integration; the current target-based cue projection does not yet implement this received-pose contract.** CTR02 must replace that projection and qualify the physical producer through B/A before claiming this disclosure boundary works.

Apply the existing [personal recognition/reference contract](../../identity-and-references.md#contract) when associating a current cue with a remembered opponent, offensive preference or deliberate Speak override. Continuous observation or supported recognition must establish that association. A hidden native body/action ID or an old occurrence receipt cannot identify a newly exposed stranger. The same-known-aim continuity below therefore applies to an actually recognized opponent such as known Ada; an unfamiliar new exposure supplies only its fresh permitted cue. Retain old history separately without projecting its accusation or preference onto the new exposure.

The bundled world makes **physically expressed attack preparation, held aim and release** readable only through B's measured pose/motion and A's actually acquired support. An authored body/weapon pose can support the world's preparation interpretation; a private action ID, phase, selected target or intention cannot. A body-directed association additionally needs received geometry that uniquely supports that body's threatened approach. Both merely being visible is insufficient, and aligned bodies retain ambiguous direction unless the actual received preparation/trajectory distinguishes them. The observer may use its own current body geometry without separately seeing itself; other bodies require permitted exact-life/location support. Unknown names retain ordinary observer-scoped naming. General weapon pose or a direction with no unique body association remains scoped possible danger, with no exact chosen-target claim.

A's [received physical configuration](../../projects/perspective-perception-tech-design.md#received-physical-motion-and-configuration) supplies `observed-axis` from two same-sample permitted part locations. It is unoriented unless a received asymmetric form/tip-grip detail supplies direction; `observed-motion` can separately supply received movement direction. Neither private attachment/weapon state nor body facing can fill missing directional support. Preserve measured uncertainty and actual acquisition when deriving the threatened approach.

| Actual activity | Personally available meaning | Effect on incoming encounter evidence |
| --- | --- | --- |
| Selection, private proposed/queued attack, or movement/approach before attack preparation | Only the ordinary permitted movement/activity; no readable directed commitment yet. | No new directed-attack association. The performer's own admitted offensive preference is independent. |
| Current Punch, equipped melee or supported natural-strike preparation | Observed strike preparation with its received direction; a body-directed association only when the physical support uniquely establishes it. | First acquisition of a supported body-directed threat establishes that incoming association. Witnesses receive only the same supported direction/body relation, never the private selected target. |
| Current ranged preparation or held aim | Observed aimed-weapon pose and supported approach; ambiguous or hidden body association remains general scoped danger. | Establish or maintain that directed preparation association. Continued preparation/aim in the same known commitment does not produce new hostility on every phase or projection update. |
| Actual release and personally observed projectile continuation | The acquired physical release/flight and its permitted source, direction and supported body-directed association; no intended-target metadata. | A newly witnessed directed release is fresh hostile evidence. End the matching aim association and retain any separately observed flight association through its actual lifetime. |
| Actual attempt/contact, including miss, shield interception or collateral injury | The real personally observed/experienced outcome and only its known source; intended and actually contacted bodies remain distinct. | A fresh qualifying outcome can update the actual affected pair. Anonymous impact stays anonymous; the contacted bystander is not retrospectively described as the intended target. |
| Recovery, cancellation, ending, guard or unrelated movement | The observed ending or current nonoffensive activity, without a new target declaration. | End only the matching known preparation association when appropriate. Preserve other attacks, observed flight and recent grace; these phases alone create no fresh hostility. |

Use existing permitted activity/event presentation for the acquired cue, with wording such as **Ada raises a weapon in your direction** only when the physical support warrants it. This reports observed conduct, without asserting motive or the private chosen target. Humanlike cognition and native animals consume the same permitted physical evidence. The generic animation descriptor remains target-free; the world danger adapter derives its scoped/body-directed relation solely from the received primitives. No global target-lock display or private action-state projection is added.

Renewed visibility of the **same already known preparation/aim commitment** restores its observed-active association but is not a new hostile occurrence and does not clear a deliberate Speak override. Use the existing admitted observation/occurrence identity to establish prior exposure, even if the short UI grace already expired. A first observation of previously unknown directed preparation, a new commitment, a newly witnessed release or a fresh qualifying outcome can advance hostility. When renewed exposure later ends, use the actual last-known boundary for grace; neither repeated visibility updates nor incidental phase rendering renew it. Private plans and ordinary approach remain undisclosed even when the server knows their eventual target.

Actual physical contact is personally felt even when the performer cannot be
seen. The recipient retains the impact and their own bodily result; an unseen
performer, weapon and location remain unidentified. Their personal danger record
and any native interpretation preserve that uncertainty. Merely observing another
person does not disclose that person's private danger records or chosen methods.

### Recent-hostility grace

The bundled world selects **600 game seconds**, ten real seconds at its normal 60:1 clock, of contextual continuity after the last personally observed hostile occurrence or the observed end of an active directed attack. An ongoing personally observed attack or one's own admitted current attack remains current regardless of that deadline. A new observed attempt, miss, block or hit renews the relevant pair; ordinary proximity, hovering, merely thinking about retaliation and repeated reads do not. A lost-sight transition starts the grace from the last time the directed activity was actually known; it does not keep refreshing an invisible attacker.

Use simulation time. Pause freezes the interval; faster playback consumes it faster; server downtime spends none. The literal 600 lives in the installed world profile, not the client or generic scheduler. It is a presentation/short-term encounter parameter, not an emotional decay duration, pursuit budget, human participation permission or final-blow authorization.

Incoming evidence and my own offensive preference have separate deadlines. My accepted offense remains current while its actual action/commitment remains active; when it ends, retain its exact method for the same 600 game seconds unless I explicitly end that intent. An accepted new attack clears the deliberate Speak override; a refused attempt does not. On expiry, retire only the expired preference when no corresponding current attack or explicitly selected still-valid commitment retains it. Keep ordinary remembered evidence and appraisals under their own retention. Ending this encounter never wipes a grudge; a grudge alone never permanently turns every conversation shortcut into Attack.

The deliberate Speak override has its own selected lifetime: ordinary grace expiry cannot delete it. Retain the minimal pair/preference record while the override is valid, so the same known aim reappearing after expiry does not change the chosen social action. Fresh hostile evidence, a newly admitted own attack or the actual authority/life-removal rules can still clear it. This retains an explicit control preference, not the whole expired attack history.

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

