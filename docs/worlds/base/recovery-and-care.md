# Wilderness injuries, recovery and care

**Selected design, not installed behavior.** Reconciled 2026-10-25 against `18cf5d285`. The [feature specification](../../projects/recovery-and-care-feature-spec.md) owns the experience; [technical design](../../projects/recovery-and-care-tech-design.md) owns execution; [CARE](../../maintainers/recovery-and-care.md) owns delivery. This file is the single authored-policy/tuning specification. All new values are reversible design defaults, not measured balance or medical advice. Current [death, Continue and death-scar treatment](player-death.md) remain installed; individual injuries and the care methods here remain unimplemented.

## Authorship and compatible bodies

Author these definitions under `packages/domain/src/worlds/base/` and install them through the selected world. Do not repeat injury names, attack-kind mappings, organs, treatment rules or numerical values in engine, server, protocol, client or model prompts. Public explanations and ordinary choices derive from the same definitions.

The initial profile supplies ordinary human bodies with the complete catalogue. Quadrupeds and avians receive the compatible external-injury catalogue and movement effects through their own profiles; they do not inherit the human kidney/concussion selection rows. Humans controlled by players or residents have identical physical eligibility and probabilities. No predator targeting or attack permissions change merely to create injured actors.

Supported injury-profile tags describe compatibility, not body slots. Initial human tags enable `human-internal`, `human-head`, `external-tissue` and `locomotion`; animal profiles enable `external-tissue` and `locomotion`. Each selected definition must have a real consumer: an energy/work effect cannot be the sole consequence for a body with no corresponding operation. For the installed flesh-bodied profiles, existing fullness/energy and ordinary movement supply those consumers. A profile without supported channels must omit that candidate or author a different effect; no silent inert wound.

Animal self-directed care/handling is not added. Every selected animal injury has a natural course, including fractures and severe bleeding, under the overrides below; surviving wildlife is not permanently damaged merely because no animal-care activity is selected. Ordinary voluntary human treatment does not imply animal consent/handling. Animal treatment/rescue is a separately designed expansion, not a fabricated NPC action. Qualify injured native travel/escape rather than treating animals as human UI fixtures.

## Causal selection

### Location and damage form

For an actual projectile contact, compute normalized height `h = clamp((contactY - bodyMinY) / (bodyMaxY - bodyMinY), 0, 1)` using the struck body's authoritative effective bounds at that contact. Reject an invalid profile/bounds during ordinary owning admission; do not invent a precise region from invalid geometry. These coarse bands are fictional collision classification, not posed anatomy:

| Profile   | Coarse regions                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| Human     | `legs` for `h < 0.40`; `trunk` for `0.40 <= h < 0.82`; `head` for `h >= 0.82`.                                  |
| Quadruped | `legs` for `h < 0.35`; otherwise `trunk`. No face/head claim from a body lacking authoritative forward anatomy. |
| Avian     | `legs` for `h < 0.25`; otherwise `trunk`. No left/right wing or organ claim.                                    |

A coarse human region called `legs` does not identify a side. A future explicit injury definition may carry “left leg” when supported contact evidence exists; today's reader must not invent it. Body shape/height changes use current contact bounds. Standing art, animation and camera angle are not injury authority. The selected center aim normally points at trunk; actual intercepted contacts still use actual struck bounds.

Current melee/threat attacks without measured contact points explicitly supply `trunk`. A future installed attack/hazard can supply a supported authored coarse region; client prose cannot. Missing location remains absent and uses only location-independent compatible candidates. Do not randomly invent a limb to make an otherwise unsupported injury selectable.

Damage form is explicit installed attack/ammunition data: ordinary knife contact uses `cutting`; spear uses `penetrating`; unarmed, club, hammer, stag contact and stone projectiles use `blunt`; arrow projectiles use `penetrating`. Generated ranged equipment inherits the admitted ammunition/contact profile, never a guessed name. The supported generic fallback for external physical trauma is `unspecified`, whose only initial candidate is a contusion. A mixed or directional attack family needs an explicit future row; no new attack-mode controls are selected here.

### Severity and chance

Let `D` be effective health-damaging potency after guard/armor, execution modifiers and susceptibility, before the remaining-health clamp. Let `H` be this body's current supported maximum health at impact. `q = D/H`. Actual health loss is recorded independently. A lethal hit can produce a severe injury in old-life history even when its victim had very little health left. Blocked/zero-potency contact and non-trauma damage never enter this selection.

| Damage fraction q  | Severity            | Chance of one injury |
| ------------------ | ------------------- | -------------------- |
| `< 0.05`           | No sustained injury | 0                    |
| `0.05 <= q < 0.15` | Minor               | 0.35                 |
| `0.15 <= q < 0.30` | Serious             | 0.60                 |
| `q >= 0.30`        | Severe              | 1                    |

Filter candidates by body, region, damage form and severity before selection. Use positive integer weights, stable definition-ID order and the existing saved random source. The technical contract fixes random draw/commit ordering. An empty compatible pool means ordinary health damage only; installation validation must flag a missing pool for a profile explicitly promising one. No late random reroll on save/load or action retry.

Candidate weights are relative within the eligible rows, not probabilities across impossible injuries:

| Damage form        | Candidate     | Weight and eligibility                                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------ |
| Blunt              | Contusion     | 8 minor, 4 serious, 2 severe; any compatible external tissue/location, including unavailable location. |
| Blunt              | Sprain        | 2 minor, 3 serious, 1 severe; `legs` and locomotion only.                                              |
| Blunt              | Fracture      | 3 serious, 5 severe; `legs` or `trunk`; no minor fracture.                                             |
| Blunt              | Concussion    | 2 minor, 4 serious, 5 severe; human `head` only.                                                       |
| Blunt              | Kidney trauma | 2 severe; human `trunk` only.                                                                          |
| Cutting            | Laceration    | 10 in every band; external tissue.                                                                     |
| Penetrating        | Puncture      | 8 in every band; external tissue.                                                                      |
| Penetrating        | Fracture      | 1 serious/severe; `legs` or `trunk`.                                                                   |
| Penetrating        | Kidney trauma | 2 serious/severe; human `trunk` only.                                                                  |
| Unspecified trauma | Contusion     | 1 in every band; external tissue.                                                                      |

One eligible contact creates at most one injury instance in this initial profile. A puncture that selects kidney trauma is one injury with that family's effects; do not also add a generic puncture automatically. Future tissue-through-penetration may explicitly emit several causal injuries. Different hits never share a wound merely because their names match. Periodic bleeding, needs damage and healing never select new injuries.

## Injury catalogue

Values below are per injury. Severity is a label on that injury, not a global meter. All times are **participating game seconds**; divide by the current normal factor of 60 for approximate real seconds. Pause and protected absence give no credit. Food, sleep or full health do not remove injuries implicitly.

Channels: `M` is a movement penalty fraction; `W` a finite physical-work-rate penalty; `E` extra active energy expenditure; `R` extra ordinary camp-health-recovery work. Numbers in the table are percentages. Profiles own which authored action/locomotion consumers use those channels; their exact application is in the technical design.

| Family        | Minor / serious / severe initial effects                                                      | Untreated course                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contusion     | `E 5 / 10 / 15`                                                                               | Resolve after `1,800 / 7,200 / 14,400`.                                                                                                                                                                                                     |
| Laceration    | `W 5 / 10 / 15`; bleeding `1 / 2 / 3`                                                         | Minor: bleeding stops after 1,800, then resolve after another 1,800. Serious: bleeding stops after 3,600, then resolve after another 10,800. Severe: bleeding and wound persist until stabilized; after stabilization resolve after 36,000. |
| Puncture      | `E 10 / 15 / 20`; bleeding `1 / 2 / 3`                                                        | Minor: bleeding stops after 1,800, then resolve after another 5,400. Serious: bleeding stops after 3,600, then resolve after another 18,000. Severe: persistent until stabilized; after stabilization resolve after 43,200.                 |
| Sprain        | `M 10 / 20 / 30`                                                                              | Resolve after `3,600 / 14,400 / 28,800`.                                                                                                                                                                                                    |
| Fracture      | Minor unavailable. Serious/severe `legs`: `M 20 / 30`; `trunk`: `E 20 / 30` plus `W 10 / 15`. | Persist until supported or camp convalescence starts a recovery course. An injury name may say leg or rib fracture, but does not assert a particular limb side or individual rib.                                                           |
| Concussion    | `W 10 / 20 / 30`                                                                              | Resolve after `3,600 / 10,800 / 21,600`. No camera, text, consent, personality, thought or speech impairment.                                                                                                                               |
| Kidney trauma | Minor unavailable. Serious/severe `E 20 / 30` and `R 50 / 100`.                               | Persist until camp convalescence starts recovery. No automatic internal bleeding, infection, diet or excretion subsystem is inferred.                                                                                                       |

Animal overrides are explicit selected profile data, not player-versus-NPC exceptions. Human residents retain the human rules:

| Quadruped / avian override             | Rule                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Laceration after/still during bleeding | Use `E 5 / 10 / 15` instead of `W`; native travel/escape/flight/feeding already consume the selected active-energy operation.                                |
| Laceration/puncture blood loss         | Bleeding contributions `1 / 1 / 2`; natural clot at `600 / 900 / 900` for minor/serious/severe. Use the ordinary stable-family recovery durations afterward. |
| Unsupported fracture                   | Natural resolution after `43,200 / 86,400` serious/severe; retain the listed impairment during that course. No mandatory human treatment action.             |

This keeps severe wounds meaningful at smaller animal health scales without requiring invisible doctors or indefinite disabled wildlife. It does not prevent lethal blood loss or guarantee any injured quarry survives. No kidney or concussion candidates are installed for these initial animal profiles.

An effect's apparent medical realism is not the design's validation standard: these are stylized fictional consequences, chosen for comprehensible play. Kidney trauma makes exertion and ordinary recovery harder; a cutting wound bleeds; a leg injury affects travel. No purported real-world treatment guidance belongs in player copy.

### Stages and recovery work

Implement exactly these semantic stages, using family-specific installed stage IDs/effects rather than a universal engine injury enum:

- **Recovering without treatment:** contusion, sprain and concussion use one timed stage with the listed effects until resolution.
- **Bleeding wound:** laceration/puncture start fresh. Minor/serious have the natural clot transition above; severe has no natural deadline. The stable stage has identical nonbleeding effects and its listed recovery time. Pressure selects that stable stage immediately.
- **Dressed wound:** no bleeding; half the family's nonbleeding penalty. Recovery durations are laceration `900 / 3,600 / 9,000`, puncture `1,800 / 5,400 / 10,800` for minor/serious/severe.
- **Unsupported fracture:** persistent listed penalty. Support selects a healing stage with half the penalty for `21,600 / 43,200` serious/severe. Material-free camp convalescence selects the same half penalty with the slower `43,200 / 86,400` course.
- **Internal injury:** persistent initial kidney effects. Convalescence clears its `R` penalty, halves its `E` penalty and starts a `21,600 / 43,200` serious/severe recovery course.
- **Camp care for temporary injuries:** contusion/sprain/concussion switch to half penalty with half their initial natural duration. Laceration/puncture switch to no bleeding, half penalty and half the complete untreated course including natural clotting where present (severe uses its full post-stabilization course): laceration `1,800 / 7,200 / 18,000`; puncture `3,600 / 10,800 / 21,600`.

A useful transition never moves an already nearer natural resolution later. Compute the remaining natural time to resolution through the current pinned stage chain; infinity means no automatic resolution. The target stage's remaining work is `min(target duration, old remaining natural course)`. Credit any difference into the new stage's elapsed-work field; record actual treatment time separately. Stabilizing early uses this same rule: it may shorten the untreated course, never extend it. This is deterministic state transition work, not elapsed off-screen time.

Do not offer a method when its exact result cannot improve the selected current stage, bleeding or remaining course at its quoted completion. Use the pinned natural course and the fixed care duration for this preview: a wound predicted to finish healing before care ends is not a useful target; pressure that would finish after natural clotting is not useful stabilization. Minor contusions therefore recover naturally before the longer convalescence activity can help. This is a known native deadline comparison, not a prediction of future attacks. Repeating pressure on an already stabilized wound, dressing an already dressed wound, re-convalescing a convalescing injury and topping up an already supported fracture are unavailable. A faster supported-fracture method may replace a slower convalescing fracture once if the exact preview shortens its course; no renewed material/timer loop. Natural resolution removes the instance's mechanical contribution but preserves its historical identity.

### Combining effects and bleeding

For each channel, sum applicable current injury contributions, then apply the world bound once:

| Combined channel           | Selected bound                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Movement penalty           | At most 0.40; multiply ordinary movement speed by `1 - penalty`, then compose the existing independent scar factor once.                                                                                                                                                                                                                                                                                         |
| Physical work penalty      | At most `1/3`; multiply eligible remaining-work throughput by `1 - penalty`. Care, speech, real-time gestures, passive clocks and pure cooldowns are excluded.                                                                                                                                                                                                                                                   |
| Extra active energy        | At most 0.50; multiply the selected existing active drain by `1 + extra`. Bind this to the installed `wilderness:energy-expenditure` active-work branch, currently `-0.0015` per game second. Leave its idle `-0.0005` branch and sleep recovery unchanged. Active work already includes actor actions, unsupported/free-flight motion and native animal episodes; no new drain is created on bodies without it. |
| Extra health-recovery work | At most 1.00; camp recovery throughput is `1 / (1 + extra)`. Other care methods are exempt.                                                                                                                                                                                                                                                                                                                      |
| Bleeding                   | Sum active wound bleeding amounts, at most 3 health per pulse. One pulse every 300 participating game seconds, first due 300 after the episode starts.                                                                                                                                                                                                                                                           |

These are injury-channel bounds, not promises of invulnerability, minimum total speed under all other world effects, or a wound-count cap. The UI shows the actual combined rate. Applying several injuries must not multiply each percentage successively or floor/round each blood-loss contribution independently.

The shared bleeding clock retains phase when wounds are added or individually stabilized; it ends when the final bleeding wound stops. Each pulse uses contributions active immediately before that pulse: a new wound can contribute at an already imminent pulse, but never to earlier pulses. No fractional catch-up accumulator is implied. All contributing IDs and actual health loss remain causal evidence. Due blood loss settles before same-time natural clotting/treatment, then lifecycle, then nonlethal recovery transitions. No elapsed interval can be charged twice. A severe bleeding wound can kill; ordinary free pressure remains the immediate response, not a hidden grace period or automatic defense.

## Treatment methods

All ordinary humans know these basic self-care methods in the selected opening; ordinary residents may choose the same methods. Use the existing installed knowledge/availability owner, not parser-only secret commands. Nobody must first get injured to learn basic first aid. The doctor example is a willing known-method performer with actual resources; there is no inherent potency or speed bonus for a role name or assistance.

A treatment can target one injury or the exact eligible group shown in its preview. **Group treatment is one finite activity with the same method duration, not duration multiplied by injury count.** This deliberate abstraction avoids per-wound chores; resources remain per actually treated injury. Group effects and material costs commit once at completion, with no partial cure or materials spent earlier. The selected set is fixed; later injuries do not join. Native operation/claim admission still accounts for every selected record and input. An oversized request offers an explicit smaller selection rather than silently truncating or discarding wounds.

| Method                | Duration in game seconds                                                      | Site / exact resources                                                                               | Result per selected injury                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apply pressure        | 180 (3 normal real seconds)                                                   | Anywhere with valid stationary support; no item                                                      | Fresh bleeding laceration/puncture → stable; no ordinary health restored. Applies to all selected currently bleeding wounds without a per-wound timer.                |
| Dress wounds          | 600 (10 normal real seconds)                                                  | Field or camp; 1 prepared-fiber unit per still-useful selected laceration/puncture                   | Dressed stage: bleeding stops, impairment halves, shorter recovery as above.                                                                                          |
| Support fractures     | 900 (15 normal real seconds)                                                  | Field or camp; 1 `wood` (supple branch) and 1 prepared-fiber unit per still-useful selected fracture | Supported healing stage. Inputs are consumed abstractions of bracing, not new equipped splint objects or bonus resources returned later.                              |
| Tend injuries at camp | 1,800 (30 normal real seconds)                                                | Actual cold or lit known campfire within 2.2 units; no item                                          | Selected compatible injuries enter their camp-care recovery stages. May group different families in one activity; no ordinary health refill.                          |
| Recover at camp       | 600 authored work seconds (10 normal real seconds before injury rate effects) | Actual cold or lit known campfire within 2.2 units; no item                                          | On valid completion restore ordinary health to this body's current maximum; no wound/need/scar removal. `R` may lengthen this work up to 1,200 participating seconds. |

Prepared fiber uses the existing real prepared-fiber definition/knowledge route, and `wood` the existing supple-branch source. The selected first-playable opening already owns obtainable raw fiber, cleaning, branches and camp construction. Integration must verify actual reachable stock, knowledge and allowed materials; do not add an isolated medical demo or a hidden free supply grant. Care supplies compete with crafting, arrows, fire and scar treatment.

Resource claims use actual unreserved accessible sources from the performer's inventory, including supported nested containment, through current item/custody/permission owners. A method does not force moving every fiber out of a pouch just to repeat an already supported source query. Patient-supplied materials require an ordinary accepted handover first. No consent-to-care implies a bag search. Claim exact units; another lot is not a silent substitute at completion.

If an injury resolves naturally while care runs, exclude its benefit and material use; keep the originally quoted work. Compatible monotone natural stage changes may still receive the originally consented method with no increased cost. If all targets resolve, end truthfully with no consumed input or fictitious healing reward. Unrelated authored edits, changed life, incompatible stages or changed supplies invalidate completion. All remaining changes and corresponding consumption are atomic; prior actual events remain.

### Eligibility and interruption

Self-care and help require living, awake, physically participating humans able to undertake the selected action, with stationary support. Care does not add an immobile/unconscious state or forbid useful conversation. Assisted care uses one helper and one patient within 2.2 units, both consenting and occupying physical-work participation through the care extension of the existing action/cooperation owner. New offers reserve neither. The patient initiates the exact request and deliberately shares only the selected injury/method facts and maximum resource requirements with the chosen helper. The helper selects their own exact authorized lots and may choose the explicit **Accept and start treatment** action; generic cooperation Accept is unchanged. The patient must still be idle and ready: the request does not authorize cancelling work they chose afterward. An unsolicited helper offers in ordinary speech, leaving the patient to select and request actual care. Both can stop directly, even while paused. Actual material/reach/grant revalidation is required at completion.

Camp health recovery additionally requires a real health deficit and strictly positive fullness/energy throughout. Refuse if known current rates predict either reaches zero by completion, using the actual injury-modified duration/expenditure, not the old fixed example. At the unchanged baseline 600 seconds uses 1.8 fullness and 0.9 energy; these are derived examples, not new thresholds. The owner sees the precise unmet need; a helper receives an actor-safe explanation. Burning or current bleeding precludes ordinary health recovery because its continuing damage would interrupt it; surface the actual self-care option first. No hidden-enemy search declares a camp safe.

Pressure, dressing, supporting and convalescence require no positive-food/energy threshold. Ordinary depletion and zero-need damage continue, so death can still prevent completion. Existing wound bleeding or needs damage does not cancel these injury treatments. New external trauma, active burning damage, death, real departure/unavailability, movement, lost site/reach, admitted incompatible physical work, withdrawn consent or invalid required inputs ends unfinished care. An invalid command, closed panel, speech or inspection does not. Own ongoing bleed must never make its treatment impossible.

No method restores hunger/energy, removes a death scar, extinguishes fire, revives a corpse, creates a camp, teleports, cancels an attack or protects a patient from harm. Material-free recovery and convalescence are deliberately available without a bed, roof, fire fuel, skill roll or helper. A cold campfire suffices; camp construction remains ordinary play, not a care action side effect.

## What people know

The patient's current injury names, severities, stages, combined mechanical effects and actual treatment routes are readable to that patient. This is a selected game-information rule, not claimed real-world self-diagnosis. It does not reveal an unseen attacker, weapon, hidden trajectory or exact organ intersection absent recorded evidence.

Others see current public health plus permitted signs: fresh laceration/puncture bleeding is visible while actually observable; a locomotion injury with a current movement penalty can supply an authored observation of limping during observed movement. This is observation text, not a requirement for a new gait animation on every character. A hidden kidney injury or concussion does not disclose its exact label through the generic inspection/action catalogue. Numeric private energy and prognosis stay private. Directly consenting to a treatment request can share the selected condition's required facts with that helper; it does not publish the whole injury list or future health changes.

Owner detail ordering: bleeding first, then persistent untreated injuries, then other recovering injuries; severity descending, acquisition time ascending, exact ID for ties. Compact display may group equal names but must expose individual causes/selection through the full list. Default detail pages show 20 records with explicit continuation and stable cursor; this is a display size, not an injury/query-work cap. Aggregate current effects and urgent treatment availability are complete even when the list is paged.

Record actual cause, effects, stage transitions, treatment, interruption, resolution and lifecycle end through existing committed events and permitted structured experience. Ordinary introspection can reveal one's current condition after forgetting its cause, without restoring forgotten attacker facts. Healing does not erase the event. Helpful or harmful events can matter to a character's later interpretation without mandatory gratitude, trust, romance or aggression changes. No medical model loop, diagnosis lottery or paid per-pulse narration is selected.

## Time, continuity and contrasting worlds

Use participating simulation time. Pause freezes progress; protected absent humans accrue neither bleeding nor recovery, and no process downtime is credited. Existing vulnerable departure/fade behavior remains authoritative before protection. Real departure cancels unfinished care but preserves the injury's current course. Same-format restore retains coupled clocks/work/materials and rebuilds derived preparation; disconnected browser transports do not invent departure or replay effects.

Death ends active injury mechanics and preserves the old-life record for history and permitted corpse inspection. Continue's new physical life starts without the old wounds; existing death scars still apply. Creator Revive already advances physical life and restores ordinary physiology: preserve that privileged full-restoration meaning, with no old injury mechanics carried across the life change. End reasons distinguish death/creator restoration from treatment or natural healing. Ordinary care does not acquire creator powers. No loss/return of attacker, item, memory or renderer object changes an injury's lifetime.

A contrasting authored machine fixture uses independently retained damaged actuators, optional module-location evidence, reduced movement and finite repair from appropriate material. Repair resolves the selected condition; it does not require a new charge/recharge subsystem. It has no obligatory flesh, kidney, bleeding, fullness, campfire or human death rule. This proves supported operations and world selection, not a second production world or permission to implement arbitrary scripts. Detailed external module loading and fully optional physiology remain existing EWF work.

## Complete cost and balancing

At 60:1, a material-free pressure action is 3 seconds, dressing 10, support 15 and convalescence 30. A normal full health recovery is 10 seconds, up to 20 under the selected internal-injury channel cap. Passive courses range from brief minor impairments to minutes of continued play; they are not time the player must stare at a medical panel. A severe supported fracture's 43,200-second course is 12 normal real minutes; material-free convalescence uses 24. These are arithmetic, not measured human completion times.

A normal 18-potency stag hit against 100 maximum health falls into the serious band with a 60% wound chance, while actual health loss still follows the current hit/defense result. No automatic slowdown occurs when the selected injury has no movement effect. Three independent hits may leave three different conditions; the combined-channel bounds and group-care abstraction avoid three mandatory identical progress bars. Full ordinary health does not assert full recovery from those conditions.

Qualify solo recovery from low stock and from a pre-camp opening; enough ordinary capability to obtain food, raw fiber/branches and build a camp must remain. If the route becomes impractical, adjust injury/world pacing and accessible ordinary supply within its owner; do not add an unmentioned free clinic. Compare survival/care with current Continue consequences honestly. The death owner still governs relocation, replenished needs, possessions and death scars.

No random infection, recurrent bandage wear, recurring treatment roster, pain meter, food quality penalty, medical-experience farm, compulsory helper or paid treatment service is part of this first profile. CARE04 retains separately selected illness; precision anatomy, animal handling, surgery and rescue have their own future prerequisites. Actual play and scale measurements remain open.

## Maintained records

- Work: [CARE00–CARE08](../../maintainers/recovery-and-care.md); selected design: [DG21 / ND05](../../maintainers/needs-design.md#dg21--injury-illness-and-useful-care).
- Behavior and mechanism: [feature specification](../../projects/recovery-and-care-feature-spec.md), [technical design](../../projects/recovery-and-care-tech-design.md).
- Constraints and reconsideration: [Care inventory](../../limits/recovery-and-care.md); [state effects](../../limits/state-effects.md), [native work](../../limits/native-work.md), [persistence](../../limits/persistence.md).
- Existing world contracts: [survival](survival.md), [death/scars](player-death.md), [first-playable supplies and making](first-playable-survival.md), [sleep](sleep.md).
