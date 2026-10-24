# Preparedness and surprise — feature specification

| Status      | Current progress                                                                                          | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Specialist design is complete; SUR01–SUR09 retain implementation, integration and gameplay qualification. | 2026-10-23   |

## Purpose and scope

A warning, guarded entrance or companion's intervention should change a battle even when nobody identifies the attacker. Recognizing a familiar person should not make an unexpected betrayal harmless. Surprise occurs when a threat reaches a character before relevant anticipation or preparation exists, independently of whether their defense succeeds.

This is specialist **F / Prompt 6** of [stealth and awareness](stealth-awareness-tech-design.md#threat-preparedness-and-surprise). It completes the selected preparedness/surprise design within [ND11](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity), leaving wider recovery, rescue, indirect harm and afterlife work with their owners. [Base combat](../worlds/base/combat.md#preparedness-policy) owns world rules and tuning; the [technical design](preparedness-and-surprise-tech-design.md) owns contracts, algorithms, exact examples and acceptance coverage.

**Design only.** This module qualifies surprise, applies its once-only damage consequence through existing combat and supplies a native startle cause. Perception, knowledge, emotion, chosen responses and physical combat retain their owners. The integrated documents establish the intended contracts. Runtime implementation, executable tests and balance/player evidence remain open; the technical design records the [existing owners and dependencies](preparedness-and-surprise-tech-design.md#source-baseline-and-specialist-dependencies).

## What makes this useful and distinctive

Ordinary combat already offers approach, strike/shoot, defense, movement and recovery. Preparation earns its attention cost when it protects a worker, makes an unknown approach manageable, lets a valuable load escape or changes whether someone risks a confrontation. It must not become a mandatory stealth minigame, vigilance click or pre-fight ritual.

- **Warnings help even when escape is impossible.** A burdened carrier can register an incoming arrow yet lack time or space to move. The hit then causes ordinary damage without the surprise increase.
- **Preparation can win cleanly.** A shield at an entrance and a received warning can defeat an ambush. Success needs no manufactured counter-threat.
- **Protection belongs to the person taking the risk.** A companion intercepting an arrow uses their own preparation and protection; an uninformed bystander cannot inherit another person's readiness.
- **Trust matters through actual experience.** Friendly betrayal can surprise. Accusations, fear, forgiveness and changed relationships arise through evidence and independent interpretation, without a combat trust statistic.
- **Breaking contact creates choices.** Hiding can remove current target information and permit escape without instantly making a pursuer unwary. A later quiet return can support another ambush.
- **Invention changes circumstances.** Supported padding, lights, barriers, signals and decoys can alter warnings or preparation. They do not directly set a surprise flag.
- **Hunting has a useful outcome.** An animal can notice danger and escape without a model call. A successful hunt still needs obtainable equipment, recovery, harvesting and useful food; double damage alone does not make hunting enjoyable.

These are selected design and playability scenarios, with composing content subject to its own prerequisites. Mechanical correctness, uncoached usefulness and balance are separate acceptance gates.

## Four questions, four answers

| Question                              | Meaning                                                                                                   | Owner                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| What reached this character?          | Personally acquired sight, sound, felt contact or understood warning, at its original precision/time.     | Perspective A and physical B/C producers                |
| Was there sufficient anticipation?    | Registered relevant warning or a genuinely maintained method, with the required bodily capacity and lead. | Existing personal encounters and E's active preparation |
| Could this hit be avoided or reduced? | Actual reach, path, collision, shield coverage and admitted evasion.                                      | Existing combat, spatial and body owners                |
| How does the experience affect them?  | Native startle and later supported emotion, including composure and mechanical adjustments.               | Emotional physiology D                                  |

A failed defense answers only the third question; it does not prove inadequate warning.

### Registering danger is minimal preparation

The world gives a definite personally acquired threat cue a short native registration interval. After uninterrupted eligible registration, the character expects that threat even if unable to dodge. This creates no forced turn, shield raise, decision, thought or emotion. Warning receipt alone is not yet preparedness.

Memoryless animals, autonomous people and controlled people use the same rule where their bodies support it. A busy model, action restriction or inability to move does not prevent an aware body from registering danger. Provider latency, browser rendering and player reading time never substitute for simulated reaction time. The [authored intervals](../worlds/base/combat.md#preparedness-policy) are gameplay hypotheses, not measured physiological constants.

### Two ways to be prepared

1. **Registered relevant expectation.** A perceived directed attack, understood current scoped warning, admitted danger interpretation or felt attack provides finite expectation. A real confirming attack or committed offense can preserve anticipation already earned for that same scope.
2. **Maintained relevant preparation.** A finite accepted watch, ready guard or another supported method anticipates its actual covered threat without requiring a prior attacker sighting. Fulfillment and lead matter; a proposal or ordinary glance is insufficient.

An attack personally directed at oneself can establish short-lived expectation of ordinary physical assault, including another attacker. This prevents a crowd from renewing surprise merely by changing identities. Nearby unrelated combat, general reputation, fear or a declaration of permanent vigilance does not provide universal readiness.

One's own offensive work anticipates its genuine opponent/approach. Actual mature commitment can preserve that expectation through recovery, when a counterattack may be expected but hard to defend. A hunter aiming at a deer is not thereby prepared for an ally's betrayal. Witnessing an attack on someone else can inform a chosen precaution or admitted scoped interpretation; it is not automatically an attack on the witness.

### What does not establish surprise

Rear angle, unfamiliarity, starting combat with a previously unknown person, temporary loss of sight, failed guard, poor accuracy, slow movement, blocked escape and inability to dodge a fast expected attack are insufficient. Conversely, merely seeing or recognizing a person does not establish anticipation. A readable physical preparation, relevant warning or maintained method must supply it; hidden action labels, queued targets and eventual injury cannot.

## Chronology players can rely on

| Stage                            | Consequence                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proposed/refused attack          | No warning or preparation is invented.                                                                                                                         |
| Admitted approach                | Others receive only physical evidence they actually acquire.                                                                                                   |
| Wind-up/aim                      | Readable weapon/body preparation may warn; an idle armed person or familiar identity alone does not.                                                           |
| Melee attempt/projectile release | Existing permission and attacker mechanics apply. Flight does not freeze the victim's surprise at release.                                                     |
| Flight                           | Personally perceived motion, an actual authored travel cue or understood warning can allow registration while the shooter remains unknown.                     |
| Before outcome consequences      | Settle due work and capture the actual victim's prior information/preparation. Evaluate expectedness separately from hit/defense.                              |
| Miss/block/interception/hit      | Preserve the ordinary result. The designated opportunity is spent even on miss, block or zero injury; it cannot create damage or be saved for a better result. |
| Contact/injury/startle           | Commit through existing owners. This impact's own evidence or shock cannot change its earlier classification or mechanics.                                     |
| Later attacks                    | Use genuinely earlier evidence/effects with the required elapsed registration time.                                                                            |

Every projectile uses its actual collision victim's information. A prepared intended target does not protect an unwary bystander; an unwary intended target does not impose surprise on a prepared interceptor. Released flight retains its ordinary consequences after the shooter dies, leaves or changes control.

C's initial direct sound is instantaneous. No generic whoosh or sound travel delay is invented: flight warning needs actual visual evidence or an implemented authored release/travel sound. Impact sound comes too late to warn of that same impact.

## Attack consequences

### Damage and defense

The initial world rule applies **2×** once to qualifying direct-contact injury, before shield reduction and bodily susceptibility/scars. Existing hit, protection, rounding, health limits and recovery remain authoritative. It neither amplifies final capped health loss nor adds armor penetration, another hit roll or continuing poison/fire damage.

A physically eligible shield can reduce surprising contact. Usually a maintained matching guard itself prevents surprise; a consumed/expired guard can leave registered expectation without physical protection. Current combat has no separate general armor stage. Future armor or multi-contact attacks must define their place in the same damage/consumption owners before opting in, without adding their unused machinery now.

Each supported attack's existing terminal outcome records its once-only consequence for the actual victim life. Independent simultaneous attacks retain independent outcomes. Replay and event wrappers cannot amplify twice. [Technical consumption rules](preparedness-and-surprise-tech-design.md#designated-outcomes-and-multiple-contacts) cover current families and the explicit future-family boundary.

### Startle and emotion

A surprising actual body/own-shield contact supplies D's native unexpected-contact cause, including zero health loss. An entirely unperceived miss gives no private hint of an unseen attack. A perceived near miss can qualify through A/C's actual abrupt-cue route.

D owns composure, reaction strength/duration, fear aggregation, accuracy and new-evasion-distance adjustments. F adds no second penalty. Fear does not automatically slow walking/running/flight or force a person to flee. The contact's new shock cannot affect that same contact; earlier real cues can already have caused shock. Distinct causes remain distinct, while repeated wrappers do not create new onsets.

## Continuity, uncertainty and reset

Registered warning remains relevant for a finite interval after fresh support, followed by quiet settling. Brief occlusion, weapon swaps, choosing Speak, changing camera or reconnecting cannot erase it. A known opponent remains expected across a short loss of sight in an ongoing fight. Genuine quiet can eventually make a later attack surprising again; lifelong acquaintance or an old grudge cannot keep someone ready forever.

Maintained preparation protects only its actual current scope. Ending an unused watch leaves no stored sectors, so scanning directions cannot accumulate all-direction protection. A real attack can preserve already mature matching expectation when it consumes a guard; broader newly learned danger still needs registration. Only fully matching scoped work can postpone that scope's settling. Deliberate work alone cannot prolong broad recently attacked expectation.

Ordinary rest currently blocks perception and retires bodily readiness; waking contact is assessed before injury wakes the body. Waking needs fresh threat support or newly fulfilled preparation. No sound-triggered waking, dream awareness or new unconsciousness subsystem is added. Immobility or incapacity alone is not a sensory blackout: actual supported body restrictions govern.

Correction removes dependent future support without undoing committed harm or shock. A new physical life inherits no bodily preparation or unfinished registration. Same-life control transfer preserves valid physical consequences/evidence while its existing owners end inappropriate pending choices. Transport reconnect alone is not bodily departure. Exact transitions and timing belong to the [technical lifecycle](preparedness-and-surprise-tech-design.md#sur-c03--warning-lifecycle-and-finite-expectation).

## Required experience scenarios

| Scenario                 | Useful outcome and meaningful failure                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown doorway          | Fulfilled anticipation/guard prevents surprise from its covered entrance without identifying the attacker; an uncovered path/height can still fail.      |
| Arrow warning            | Warning registers too late to dodge but early enough to prevent extra surprise injury.                                                                   |
| Trusted visitor          | Familiarity does not protect against betrayal; a genuinely perceived wind-up can. Later relationship judgement remains independent.                      |
| Busy rescuer             | Native registration works while action/cognition is busy; moving, defending or continuing remains a separate choice.                                     |
| Prepared interceptor     | A companion takes the real contact using their own warning and protection, without needing the archer's identity.                                        |
| Multiple attackers       | Early independent hits can qualify together; after attack evidence registers, identity changes alone do not renew surprise.                              |
| Break contact and escape | Losing sight removes live targeting; a quick return does not erase expectation. Leaving with the objective can be the successful outcome.                |
| Noisy diversion          | Actual investigation can open a route, while registered danger may sacrifice surprise damage. Noise neither proves an enemy nor forces everyone to turn. |
| Wary animal              | Actual sensing/native alertness can prevent surprise without memory or a model call; a failed hunt can become flight and a decision to stop pursuit.     |
| Rest/new life            | Waking injury uses the pre-wake state. A replacement life receives no predecessor's preparation or receipts.                                             |
| Pause/speed/save         | Identical simulated chronology has the same result at 1×/3×/8× and across pause/current-format reload.                                                   |
| Fair shared play         | Private readiness never appears in previews. Permission/lethal review accounts for possible amplified harm without revealing hidden awareness.           |

[Technical acceptance](preparedness-and-surprise-tech-design.md#acceptance-scenarios) covers positive, negative and adversarial boundaries. These are qualification requirements, not reported passes; existing scenarios can cover multiple assertions.

## Repertoire integration

Review covered all 42 repertoire file scopes and relevant entries, all 25 combination scenes, optional world profiles and existing stealth/combat audits. It does not claim a reread of every unrelated proposal or new external research. The [shared audit](stealth-awareness-repertoire-review.md) remains the collection-wide owner.

| Existing material                                                                                                                                      | Selected connection                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Combat/rescue](../repertoires/combat-rescue.md): CR-050/051/058/064/065/069/077/078/084/244/248/253/256                                               | Facing/escape lanes, voluntary interposition, entrance defense, warning without identity, recoverable ambush and simultaneous-contact chronology |
| [Abilities](../repertoires/abilities-progression.md): AP-049–052/245/255/261                                                                           | Competence distinct from anticipation; acknowledged watch handoff; intermittent checks preserve uncertainty                                      |
| [Mechanics](../repertoires/mechanics.md): MEC-012/018/083/094/247/252/263–266/268/270                                                                  | Setup/release, real decoys, recovery/replay integrity, busy actors with choices, affection/readiness/allegiance separated                        |
| [Traits](../repertoires/traits.md): TR-006/141–147/151–156/158–159; [psychology](../repertoires/psychology-behavior.md): PB-008/010/181/188/195        | Contextual calm/courage/attention; no trait-text immunity, confidence meter or forced fear                                                       |
| [Relationships](../repertoires/relationships.md): RSH-146/162/166/172–176/278/282/284                                                                  | Actual warning/handoff, harmless surprise, betrayal and protective disagreement without forced trust effects                                     |
| [Adventure](../repertoires/adventure-discovery.md): AD-046/051/058/254/311–312; [bodies](../repertoires/bodies-species.md): BSP-044–046/056/260        | Complete hunting reward, refuge, identity uncertainty, differing senses and native animals                                                       |
| [Signals](../repertoires/languages-knowledge.md): LKN037/134/234/273–274; [delegation](../repertoires/automation-creators.md): ACR-051/054/055/059–060 | Accessible received warnings, dated information, finite watch, voluntary relief and local knowledge                                              |

Use **The toll tower at dawn**, **The companion who changes sides**, **The quarry that learns**, **The wolf at the school gate**, and **The household after the victory** in [combinations](../repertoires/combinations.md). Their objectives/aftermath make preparation valuable beyond damage optimization. Materials, architecture, logistics, institutions, arts and optional realities provide context without becoming F requirements. The central [coverage](../repertoires/coverage.md) and [priorities](../repertoires/gameplay-priorities.md) retain the broader scope; these combinations need no additional numbered entry.

## Prompt 7 and integration handoff

Prompt 7 consumes the [semantic disclosure contract](preparedness-and-surprise-tech-design.md#prompt-7-interface): own accepted preparation, noticed/registered warning and permitted aftermath. Distinguish preparing, maintaining, ended, not enough information and actual caught-off-guard contact. Controls/accessible wording remain G's work. No enemy-readiness bar, guaranteed-surprise preview, hidden-source marker or automatic key binding is selected.

A supplies exact acquired facts/correction; B/C actual physical cues/coverage; E complete current preparation; D native reactions and effective parameters. CTR retains encounters, contact, permissions and independent-character acceptance. Current readers/writers must agree before enabling the policy. Required B/A incoming-flight and A/SPK ordinary understood-warning producers need real end-to-end qualification.

[SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) remains open for controlled-character interpreted-emotion creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control-transfer behavior. Native surprise/startle is independent. [SA-D02](../../archive/05-project/open-decisions.md#sa-d02--evidence-source-revision-representation) preserves exact family-owned evidence revisions, and [SA-D03](../../archive/05-project/open-decisions.md#sa-d03--preparation-lead-after-native-phase-transition) preserves actual physical-method starts. These technical choices are settled; their adapters, tuning and enjoyment remain unqualified implementation work.

## Maintained records

- Implementation and acceptance: [SUR01–SUR09](../maintainers/preparedness-and-surprise.md).
- Limits/tradeoffs: [Preparedness inventory](../limits/preparedness-and-surprise.md).
- Exact contracts, source pins and cases: [Technical design](preparedness-and-surprise-tech-design.md).
- Authored rules: [Base combat](../worlds/base/combat.md#preparedness-policy).
- Cross-project delivery: [SA/SAD-F/SAI-F](../maintainers/stealth-awareness.md), [CTR](../maintainers/combat-and-threat-responses.md).
