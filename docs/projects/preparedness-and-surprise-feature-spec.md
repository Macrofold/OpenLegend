# Preparedness and surprise — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Specialist design is complete; coordinated implementation and gameplay qualification remain open in SUR01–SUR09. | 2026-10-22 |

## Purpose and scope

A useful warning, a guarded entrance or a companion's intervention should change a battle even when nobody identifies the attacker. Conversely, recognizing a familiar person should not make an unexpected betrayal harmless. Surprise is a consequence of a threat reaching a character before relevant anticipation or preparation exists, assessed separately from whether their defense succeeds.

This is specialist **F / Prompt 6** of [stealth and awareness](stealth-awareness-tech-design.md#threat-preparedness-and-surprise). It completes the selected preparedness/surprise design within [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity), not ND11's wider recovery, rescue, indirect-harm or afterlife work. The [technical design](preparedness-and-surprise-tech-design.md) owns exact contracts, chronology, examples and acceptance cases; [base combat policy](../worlds/base/combat.md#preparedness-policy) owns the selected world rules and numerical tuning.

**Design only.** No application implementation, executable tests, balance measurement, player study or specialist-branch merge is delivered. Current attack, flight, guard, evasion, encounter and body-effect owners are retained. This module supplies surprise eligibility, once-only damage application and an eligible native startle cause. Perception, emotional amounts, new knowledge, chosen responses and physical combat remain their existing owners.

The design consumes the completed A–E documents at the [pinned specialist revisions](preparedness-and-surprise-tech-design.md#source-baseline-and-specialist-dependencies). Branch number and specialty letter differ: branch 02 is emotion D, 03 is vision B and 04 is acoustics C. Studying a branch does not import its files or establish runtime integration.

## What makes this useful and distinctive

The ordinary alternative is already capable: approach, strike or shoot, defend, move and recover. Preparation earns its extra attention when it protects a worker, makes an unknown approach manageable, allows a valuable load to escape, or changes whether someone risks confronting another person. No mandatory stealth minigame, repeated vigilance click or compulsory preparation ritual is added.

The most valuable interactions combine several ordinary systems:

- **Warnings remain useful when escape is impossible.** A carrier can understand an approaching arrow but lack time or space to move. The ordinary hit can occur without extra surprise damage.
- **Good preparation can win cleanly.** A shield at an entrance and a received warning can defeat an ambush. The game does not manufacture another threat or invalidate the plan to preserve artificial difficulty.
- **Protection belongs to the person who actually takes the risk.** A prepared companion intercepting an arrow uses their own preparedness and protection. An uninformed bystander cannot inherit the intended target's readiness.
- **Trust matters without becoming a combat statistic.** A friendly person can betray someone. Subsequent fear, accusations, forgiveness and changed relationships arise through actual evidence and independent interpretation.
- **Breaking contact creates choices.** Hiding can remove current target information and enable escape without instantly making an opponent unwary. A later genuinely unwary encounter can become another ambush.
- **Useful invention changes circumstances.** Existing supported padding, lights, barriers, signals and decoys can alter warning or preparation. They do not directly set a hidden surprise flag.
- **Hunting remains a complete activity.** An animal can notice an approach and escape without a model call. A successful hunt still needs obtainable equipment, recovery, harvesting and the existing useful food outcome; double damage alone does not establish enjoyable hunting.

These are selected design/qualification scenarios. Some composing content has separate implementation prerequisites. Mechanical correctness, uncoached usefulness and balance are separate acceptance gates.

## Four questions, four answers

| Question | Meaning | Owner |
| --- | --- | --- |
| What reached this character? | Actually acquired sight, sound, felt contact or understood warning, at its original precision and time. | Perspective/perception A, with physical B/C producers |
| Did the character have time and bodily capacity to register the threat, or maintain relevant preparation? | A native, bounded expectation or actual accepted method; no model response is required. | Existing personal encounters plus E's captured active work |
| Could the character avoid or reduce this hit? | Actual path, reach, collision, shield direction/timing and already admitted evasion. | Existing combat, spatial and body owners |
| How does the experience affect them? | Native startle and any later personally supported emotion, with its own composure and mechanical rules. | Emotional physiology D |

A failed defense answers only the third question. It does not prove a lack of warning.

### Registering danger is minimal preparation

The selected world provides a short native registration interval after a definite, personally acquired threat cue. It represents the body's minimal anticipation of an incoming threat, not a dodge, turn, shield raise, intention, thought or emotion. During that interval, a warning has arrived but preparedness has not yet formed. After uninterrupted eligible registration, the character can expect the attack even if they cannot move.

This is F's refinement of frozen SC11 through the existing encounter owner: **warning receipt alone is insufficient; actual registration with the supported bodily state must complete**. It adds no preparation family to E and no compelled action. Memoryless animals, autonomous people and directly controlled people use the same native rule where their installed bodies support it. Action restrictions, low movement speed, fear or a busy model do not substitute for inability to register.

The [world policy](../worlds/base/combat.md#preparedness-policy) selects the initial registration and deliberate-preparation lead times, retention and quiet-settling interval. These are gameplay tuning hypotheses, not measured universal human reaction times. Neither provider latency, browser rendering nor the player's reading time is substituted for simulated registration.

### Two ways to be prepared

1. **Registered relevant warning.** A perceived directed attack, an actually understood scoped warning, admitted danger interpretation or felt attack supplies supported expectation after registration. The scope and original uncertainty remain intact.
2. **Maintained relevant preparation.** A finite accepted watch, ready guard or another supported physical method can anticipate a specified threat without any prior attacker sighting. Actual fulfillment, coverage and lead time matter; a proposal or ordinary glance does not suffice.

Directly received evidence of an attack against oneself supports short-lived expectation of ordinary physical assault, including another attacker. This prevents a crowd from obtaining a fresh surprise bonus simply by changing attacker identity. It is personal, evidence-backed and finite, not a global combat state. A mere stranger, general reputation for danger, nearby unrelated combat, fear, or a declaration of permanent vigilance does not establish it.

My own attack initially prepares me only for its relevant opponent/approach. A hunter aiming at a deer does not thereby become prepared for an ally's betrayal. Merely witnessing somebody attack someone else is not a directed attack against me. It can support a deliberately chosen precaution or a subsequently admitted scoped danger interpretation.

### What does not establish surprise

A rear angle, hidden face, unknown name, temporary loss of sight, failed guard, slow body, bad accuracy, blocked escape route or inability to dodge a fast expected projectile is insufficient. These can change ordinary combat or information, but do not automatically grant the multiplier.

Seeing a person is likewise not enough to prevent surprise. Their readable physical preparation, a relevant warning or an actually maintained method must provide the missing anticipation. The system cannot infer a warning from a hidden action label, future target, queued command or eventual injury.

## Chronology players can rely on

| Stage | Consequence for surprise |
| --- | --- |
| Attack selected, proposed or refused | No warning, attack consequence or preparation is invented. |
| Attack admitted; approach begins | The attacker has actual work. Other people receive only physical evidence they actually acquire. |
| Wind-up or aiming | A real visible weapon/body preparation may warn; seeing an idle carrier or knowing their identity does not. |
| Irreversible melee attempt or projectile release | Attack-side damage/profile/permission facts are fixed at their existing boundary. Victim surprise is not permanently decided at release. |
| Projectile flight | Personally acquired flight, a real emitted travel cue or a received warning may allow registration. The shooter may remain unknown. |
| Immediately before actual outcome | Settle due native work, capture this actual victim's prior evidence and preparation, then evaluate surprise separately from defense. |
| Miss, block, interception or hit | Preserve the physical result. The first designated outcome spends its amplification opportunity, including a miss, block or zero-damage contact; it cannot create damage or reserve the bonus for a later hit. |
| Contact, injury and new startle | Commit through existing owners. This contact's own evidence and shock cannot alter its own earlier classification or mechanics. |
| Later attacks | They may use genuinely earlier acquired warning and effects, with the required elapsed registration time. |

A projectile uses the actual collision victim's information. A guarded original target cannot protect an unaware bystander through a shared flag, and an unaware original target cannot impose their surprise on a prepared interceptor. A released projectile continues under its existing policy if the archer dies, leaves or changes control.

The acoustic specialist initially has instantaneous direct-path sound, not sound travel delay. A flight warning requires an actual visual acquisition or implemented authored release/flight source. Contact sound comes after contact; no future sound or invented whoosh supplies earlier warning.

## Attack consequences

### Damage and defense

The initial selected world multiplies a qualifying direct-contact injury component by **2**, once at the shared contact calculation, before shield reduction and bodily susceptibility/scars. It does not multiply final capped health loss, create a second hit roll, ignore a shield, add armor penetration, cancel recovery or amplify unrelated continuing harm.

A ready shield can still reduce surprising contact where its actual coverage allows. Usually a maintained relevant guard itself prevents surprise; other protection can remain effective without anticipation. An expired or already consumed guard may leave the character expecting the next blow while unable to block it.

The inspected pipeline has no separate general armor stage. Existing protection/susceptibility remains authoritative. A later armor family must declare its placement within the same damage calculation; this design does not implement armor.

One native attack execution owns its eligible direct-damage slot per actual victim physical life. The technical design defines first-attempt/contact consumption and multi-contact/burst extension requirements. Replaying contact, publishing injury or replacing an action cannot apply the modifier again. Independent attacks have independent damage outcomes; an exactly simultaneous volley is not collapsed into one attack.

### Startle and emotion

An unexpected physical attack contact supplies D's native `unexpected-attack-contact` cause, including a real shield contact with no health loss. An entirely unperceived miss cannot produce a private bodily hint that reveals an unseen attack. A perceived near miss can instead qualify through A/C's real abrupt-cue route.

F supplies the cause, not the emotion amount or duration. D owns composure, bodily susceptibility, onset receipts, maximum aggregation with applicable fear, accuracy and new-evasion-distance modifiers. Fear does not automatically slow walking, running or flight, or force a human character to flee. Surprise supplies no additional accuracy/evasion penalty of its own.

A new shock from this contact cannot affect this same contact. An earlier abrupt cue can already have caused shock. Distinct genuine causes remain distinct under D; their wrappers and repetitions do not create new onsets.

## Continuity, uncertainty and reset

Relevant attack expectation persists briefly after the last genuinely fresh supporting occurrence or the end of a continuously confirmed threat. The world then requires a quiet settling interval. A method can postpone a source/region/approach warning's settling only when it covers that entire same scope. Deliberate work never prolongs broad self-assault expectation; it supplies its own current coverage instead. Source and scope remain personal; no hidden opponent position is tracked.

Stop ends current guard/watch work immediately. It does not erase registered attack evidence. Changing the preferred action to Speak, briefly hiding, turning a camera, changing weapons, crossing an exposure boundary, reconnecting or replaying a command cannot reset an encounter.

Evidence-free watch coverage ends with its actual method. Past scan directions cannot be accumulated into an all-direction shield against surprise. A real prior warning can continue independently of the ended watch, under its own finite terms. Moving or rotating does not rotate an old sound bearing or refresh its observation time.

A genuinely quiet return can be surprising again after continuity and settling end. Leaving and returning is not itself proof of reset: the defender may still maintain a relevant method or have received a new warning. Conversely, lifelong acquaintance or an old grudge supplies no permanent physical readiness.

Ordinary rest currently blocks perception. Its capability restriction prevents new registration and current watch fulfillment; injury waking happens after the waking contact. No sound-triggered waking, dream awareness or new unconsciousness mechanic is added. Incapacity or immobility alone is not a sensory blackout: use actual installed restrictions, not an invented requirement to move or act.

Correction/forgetting removes future support through the existing encounter/evidence owner. It does not reverse committed harm or shock. A new body/life receives no old bodily preparation or pending registration. Same-life control transfer preserves physical consequences and already registered personal evidence while retiring controller-owned pending choices under their ordinary rules.

## Required experience scenarios

| Scenario | Useful outcome and meaningful failure |
| --- | --- |
| **Unknown doorway** | A fulfilled anticipation/guard at the entrance prevents surprise from the covered approach without identifying a hidden attacker. An uncovered approach or unfulfilled method can still fail. |
| **Arrow warning** | A flight cue arrives early enough to register but too late to dodge. The hit uses ordinary injury, proving information and mobility are separate. |
| **Trusted visitor** | Mere familiarity does not protect an unwary recipient. A genuinely observed wind-up can; hidden weapon intent cannot. The event supplies later personal evidence without forcing a relationship judgement. |
| **Busy rescuer** | A worker receives warning while action or cognition is busy. Native registration proceeds; choosing to move, guard or continue remains separate. |
| **Prepared interceptor** | A companion takes the actual projectile contact using their own warning and shield. Their choice can save someone without learning the archer's name. |
| **Two attackers** | Independent attacks arriving before any warning can register may both qualify. Once actual attack evidence has registered, changing attacker identity alone does not renew the bonus. |
| **Break contact and escape** | Losing sight ends live targeting. A quick return does not erase expectation; a genuinely quiet later return may qualify. The player can instead leave with their objective. |
| **Noisy diversion** | A real noise can attract a chosen investigation or abrupt startle. If actually registered as danger, it may also prepare the listener: the diversion can open an escape route while sacrificing surprise damage. Noise alone does not prove an enemy exists, erase other warnings or turn every person. |
| **Wary animal** | Actual animal sensing/alert work can prevent surprise without memory or an AI call. A missed ambush can become flight and a choice to abandon pursuit. |
| **Rest and replacement life** | A resting body's first injuring contact uses its pre-wake state. A later revived/replaced life does not inherit its predecessor's surprise receipts or unfinished bodily work. |
| **Pause and speed** | The same simulated chronology has the same result at 1×/3×/8×, across pause and same-format save/reload. No wall-time latency creates warning or spends reaction time. |
| **Fair shared play** | Private readiness never appears in attack previews. Existing harmful-action permissions and potentially lethal confirmation include the possible amplified harm without becoming an awareness oracle. |

The [technical acceptance matrix](preparedness-and-surprise-tech-design.md#acceptance-scenarios) expands positive, negative and adversarial cuts, including exact equality, duplicate causes and incomplete work. SUR09 retains real gameplay and performance evidence; these scenarios are not reported test passes.

## Repertoire integration

The review covered all **42** files under `docs/repertoires/` at the frozen base (6,251,825 Git-tree bytes): catalogue domains and relevant entries with context, all 25 combination scenes, the optional world profiles' scope, and the existing shared stealth/combat audits. This is not a claim to reread every unrelated proposal or redo external research. The [shared audit](stealth-awareness-repertoire-review.md) remains the collection-wide review owner.

| Existing material | Selected connection |
| --- | --- |
| [Combat/rescue](../repertoires/combat-rescue.md): CR-050/051/058/064/065/069/077/078/084/244/248/253/256 | Real facing and escape lanes, voluntary interposition, bounded entrance defense, warning without identity, recoverable ambush, burst and simultaneous-contact chronology |
| [Abilities](../repertoires/abilities-progression.md): AP-049–052/245/255/261 | Competence stays distinct from anticipation; acknowledged watch handoff; intermittent checks preserve uncertainty rather than continuous sight |
| [Mechanics](../repertoires/mechanics.md): MEC-012/018/083/094/247/252/263–266/268/270 | Setup/release, actual decoys, replay and recovery integrity, busy actors with choices, affection/readiness/allegiance separated |
| [Traits](../repertoires/traits.md): TR-006/141–147/151–156/158–159; [psychology](../repertoires/psychology-behavior.md): PB-008/010/181/188/195 | Contextual calm, courage and attention; no trait-text immunity, invented confidence score or forced fear |
| [Relationships](../repertoires/relationships.md): RSH-146/162/166/172–176/278/282/284 | Actual warning/handoff, harmless surprise, betrayal and protective disagreement without forced trust effects |
| [Adventure](../repertoires/adventure-discovery.md): AD-046/051/058/254/311–312; [bodies](../repertoires/bodies-species.md): BSP-044–046/056/260 | Complete hunting reward, real refuge, identity uncertainty, differing senses and native animals |
| [Signals](../repertoires/languages-knowledge.md): LKN037/134/234/273–274; [delegation](../repertoires/automation-creators.md): ACR-051/054/055/059–060 | Accessible actually received warnings, dated information, finite watch, voluntary relief and local knowledge |

Reuse **The toll tower at dawn**, **The companion who changes sides**, **The quarry that learns**, **The wolf at the school gate**, and **The household after the victory** in [combinations](../repertoires/combinations.md). Their objectives and aftermath make warning/preparation valuable beyond damage optimization. Existing materials, architecture, logistics, institutions, arts and optional realities provide composing context; this module does not promote their unrelated capabilities into delivery requirements.

No new numbered repertoire entries or priority changes are needed. Final collection navigation and broad Psychology-priority reconciliation remain SAD-I's existing assignment.

## Prompt 7 and integration handoff

Prompt 7 consumes the [typed disclosure contract](preparedness-and-surprise-tech-design.md#prompt-7-interface) for the controlled character's accepted preparation, noticed warning and actual aftermath. It must distinguish **preparing**, **maintaining**, **ended**, **not enough information**, and a real **caught off guard** result without exposing someone else's readiness. No guaranteed-surprise preview, enemy alert bar, hidden attacker marker or automatic key binding is selected here.

A supplies exact acquired facts and correction. B/C supply actual physical preparation/flight cues and achieved coverage. E supplies its existing immutable preparation port. D supplies native reaction receipts and effective parameters. CTR retains encounter/contact/permissions and independent character acceptance. All current-format readers/writers must change together before enabling the world policy.

**Unresolved product decision:** [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters), controlled-character interpreted emotion, remains with D. It does not block native surprise/startle or select whether retained NPC appraisals affect a newly human-controlled character. **Integration gate:** A's proposed family-specific evidence revision amendment SA-D02 and F's proposed E current-method-start extension SA-D03 must be resolved in shared integration. F preserves the frozen EvidenceRef and preparation contracts and records both proposals explicitly. B/A's permitted incoming-flight producer and A/SPK's ordinary understood current-warning producer are required implementation handoffs. There is no additional unresolved F product choice. Numerical tuning and uncoached enjoyment remain unqualified, with adjustment points and delivery tasks recorded.

## Maintained records

- Implementation and acceptance: [SUR01–SUR09](../maintainers/preparedness-and-surprise.md).
- Limits and tradeoffs: [Preparedness and surprise inventory](../limits/preparedness-and-surprise.md).
- Mechanism, source pins and exact paper cases: [Technical design](preparedness-and-surprise-tech-design.md).
- Authored rules: [Base combat](../worlds/base/combat.md#preparedness-policy).
- Cross-project delivery: [SA/SAD-F/SAI-F](../maintainers/stealth-awareness.md), [CTR](../maintainers/combat-and-threat-responses.md).
