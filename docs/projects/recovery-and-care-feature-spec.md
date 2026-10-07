# Recover from harm and return to play

| Status      | Current progress                                                                                                      | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | DG21 product proposal complete; adoption, technical design and runtime qualification remain open under CARE01–CARE05. | 2026-10-06   |

This specifies the product behavior for DG21 and the first selected ND05 care loop. It is a proposal, not a change to installed physiology. The [world profile](../worlds/base/recovery-and-care.md) owns the proposed wilderness values and applicability; [CARE01–CARE05](../maintainers/recovery-and-care.md) owns staged delivery. This assignment deliberately contains no technical design.

## 1. What care should contribute to the game

A player survives a frightening encounter, gets back to a familiar place, catches their breath, and decides whether to try again, change equipment, find company or do something else. Recovering should close that episode and restore possibilities. It should not turn every successful retreat into a second compulsory expedition for medical supplies.

The first delivery is **Recover at camp**: a short, consciously chosen period of awake recovery near an existing rest spot. It removes ordinary bodily damage and injury-related slowing. It preserves hunger, tiredness, death scars, possessions and what happened. The person can talk and inspect the world during recovery. They cannot simultaneously walk, fight, gather or do other physical work. A camp is a place to recover, not a zone of invulnerability.

The later field-care option makes a real prepared fiber useful when returning to camp would interrupt a wanted journey. A person can dress their own injuries or accept one willing helper's treatment. Assistance supplies actual materials and effort; it does not create a compulsory healer role, a relationship reward or control over the patient. A helper can matter because they brought the useful thing and chose to stop, not because self-care has been made artificially ineffective. [CARE-R01](#care-r01--credible-self-care), [CARE-R06](#care-r06--consequences-and-recovery-options).

The ambition includes more distinctive injuries, illness, rescue and lasting adaptation. Those are separate opportunities. The first loop uses the current body, rather than adding bleeding, infection, anatomy and diagnosis merely to make the title sound comprehensive. A future illness must produce a different worthwhile choice and a complete path back to play. Ordinary health recovery is already a useful missing capability.

### The question that decides whether this works

After an injury, can the player understand their condition, choose a practical response, and resume something they want to do? A mechanically correct treatment that consumes most of the outing in travel, ingredient gathering and idle waiting fails this product goal. Conversely, a short recovery is not too shallow merely because it has few buttons. The encounter, retreat, company and next decision supply much of the episode's depth. Larian's explicit rest-frequency adjustment is relevant to this judgment, while establishing no optimal duration for Open Legend. [CARE-R07](#care-r07--protect-the-adventure).

## 2. Current reality and the exact gap

This branch intentionally descends from the earlier five-design branch. The source audit also inspected newer main at [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425). Newer main's death and danger implementation is the dependency baseline for this proposal, although that runtime has not been merged into this branch. Older branch descriptions of living collapse and camp recovery are superseded context, not rules to restore.

The inspected implementation has a health amount, one undifferentiated injury amount and native injury/healing effects. It has biped, quadruped and avian body plans, without independently injured organs or limbs. Injury lowers health and slows movement. Quiet starvation or exhaustion can lower health without adding injury. Native healing can raise health and reduce injury, but the existence of an effect does not supply an ordinary recovery action. [Current survival](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/survival.md).

Eating replenishes food; sleeping replenishes energy. Neither currently restores health. All bundled living controllers die at zero health. Human Continue creates a new physical life under the retained identity, with full ordinary physiology, some possessions left on the separate corpse, and a removable death scar. Treat Scar already spends one prepared fiber and ten normal real seconds at camp to remove one scar count. It does not heal ordinary damage. The bundled world's former collapse-recovery service is no longer installed. [Current death and treatment](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-death.md).

Thus the new need is recovery **before death**, not a replacement resurrection or a duplicate scar system. Human death, creator revival, NPC mortality and future ghosts remain their existing owners' work. A dressing cannot revive a body, undo a completed death or remove a scar by implication.

Visible health is public under the current world policy. Food and energy are private. The new interface must not use a helper's curiosity to disclose the patient's private meters. Two source-description inconsistencies found on newer main—the remaining collapse wording in the health attribute and an older person-health exclusion in BW09—need reconciliation with actual selected behavior during CARE01. They are wording defects, not evidence that death or public visible health remains undecided.

The initial threat encounter supplies a real consumer: a stag hit inflicts 18 injury on an ordinary healthy human, leaving 82 health and 91% of nominal walking speed before other modifiers. That stag currently attacks eligible human-controlled bodies, not resident NPCs. Care does not silently expand enemy targeting to create patients. [Threat contract](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/first-threat-encounter.md).

The repertoire ranks applying a known fictional treatment and resting somewhere that supports recovery as Core, while uncertain fever and deeper reserve physiology are later detail. Those rankings support this modest first activity; they do not require every example in the archived body graph. [Care repertoire](../repertoires/combat-rescue.md#care-recovery-and-continuing-lives), [body repertoire](../repertoires/bodies-species.md#injury-and-recovery), [archived physical state](../../archive/03-design-proposals/agents-and-social-simulation.md#physical-state).

## 3. The first complete human journey

The player was trying to reach a viewpoint, gather something useful or investigate a threat. Harm interrupts that intention. The visible health change and movement consequence explain why another attempt is riskier. The interface does not invent an infection, broken leg or prognosis from the generic injury value.

Selecting the character or an observed campfire offers **Recover at camp** when the selected world supports it. The read identifies the actual rest spot, the bodily result and the duration. A missing campfire, remaining distance or incompatible physical state has an actor-safe explanation and an ordinary remedy where one exists. Discoverability must include the normal character/action surface and keyboard route; an undocumented phrase is insufficient.

At the camp, the player starts one recovery action. It takes the [profile's short finite interval](../worlds/base/recovery-and-care.md#camp-recovery), uses no item, and restores ordinary health and injury on valid completion. Recovery is an abstraction of tending and resting a living wilderness body. It is not a claim that a particular plant or bandage instantly cures real injuries.

The progress indicator means that this chosen work is underway. The player remains awake, can listen, speak, inspect equipment and decide what to do next. Closing its panel does not cancel the action. Choosing movement or incompatible physical work does cancel it through the normal action replacement behavior. Opening inventory or typing a sentence does not. A player who wants to eat or sleep first can stop recovery and do so.

There is no second confirmation when the interval ends. One committed outcome restores health and removes ordinary injury-related slowing, up to this body's supported maximum. It names any remaining scar and keeps private need feedback private. It does not announce “fully healthy” if that wording would conceal a scar, hunger, tiredness or another independently supported condition.

The player now has options: continue the journey, change approach, invite someone, stay at camp, or leave the game. No quest completion, gratitude scene or immediate repeat encounter is mandatory. The game should permit a character to say, in effect, “That was enough for today.”

## 4. What recovery means, including uncertainty

The initial supported body is the bundled living human body with ordinary health and injury, regardless of whether a person or a human player controls it. The human's own recovery is the first delivery to qualify. Resident use is a separately qualified choice through the same real action, not a scripted healing rule. Native animals and the contrasting clockwork world do not acquire human care merely because they have an integrity value.

Camp recovery addresses **both ordinary health loss and ordinary injury**. It can therefore remedy a health deficit left by earlier starvation after the immediate food problem has been addressed. It cannot be a replacement food or energy source. Both applicable need values must stay above zero throughout the finite activity. A need reaching zero stops the attempt and supplies the patient an honest reason. The helper, if any, only learns the permitted refusal, such as “not ready for this treatment,” unless the patient chooses to explain more.

If the patient's current known ordinary need rates already imply reaching zero at or before completion, refuse start and explain what to address first. This avoids repeatedly beginning a treatment that current bodily state already makes impossible. It is a present prerequisite using known rates, not an omniscient forecast of danger. Helpers receive no private numerical values through that check.

This is deliberately a coarse fictional recovery rule. A positive fullness amount is not evidence of balanced nutrition; a full health bar is not a complete medical diagnosis. There is no hidden quality roll, exact vitamin requirement, mandatory sleep beforehand or newly invented safe-health threshold. The current game already abstracts bodily integrity. The design spends its complexity on readable consequences and actual choices.

An existing scar remains a distinct limitation. Removing ordinary injury can improve walking while a stiff-leg scar still slows the person. The detail should explain that distinction in plain language. The player should not repeat Recover hoping that a concealed probability eventually removes the scar. Existing Treat Scar remains the supported route for that separate condition.

Actual injury, observed injury, reported pain and a belief about its cause remain different evidence. The current visible health policy permits a helper to observe injury severity as the game presents it. It does not permit them to read private needs, thoughts, medical hypotheses or distant bodily state. A character may say “I think the fall hurt my leg,” but the game does not create a localized leg condition from that sentence.

No diagnosis test is necessary for the first treatment. Compatibility is known from the authored method and supported body. Later uncertainty must give the patient reasonable observable grounds to choose among actions; it cannot simply hide whether a button spends the correct scarce item. [CARE-R05](#care-r05--maintenance-is-a-choice), [CARE-R06](#care-r06--consequences-and-recovery-options), [CARE-R08](#care-r08--different-kinds-of-help).

## 5. Starting, stopping and returning

A preview answers whether the exact person can start at the selected spot now. It checks permitted knowledge, actual reach, current life, care eligibility and incompatible work. It must account for any work the person explicitly chooses to replace. Reading that answer changes nothing: it does not end work, reserve a body, spend material or advance recovery. Actual start and completion use the current situation. This consumes the existing [availability rule](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/action-capabilities.md#action-availability-and-temporary-execution).

Recovery has one successful completion, not a series of tiny heals. Interrupting before it finishes preserves the prior body state except for other actual events that occurred. No partial health is granted and no camp material is lost. Restart begins the short interval again. This matches the small first activity and avoids a new recovery meter. If repeated interruption proves frustrating, reconsider the treatment timing before adding a detailed wound-progress model.

An actual incoming damaging effect interrupts recovery. So do death, loss of the selected spot or reach, movement, admitted incompatible work, entering unavailable participation, and either applicable need reaching zero. A rejected command does not cancel valid care. The method does not search for every hidden enemy to declare a place “safe.” A distant possible threat is not an omniscient start refusal. An attack that actually lands matters, and the camp grants no immunity. Damage due at the completion boundary interrupts before healing. Other continuing conditions are not cured by implication.

A person can be killed before the completion. Their earlier recovery attempt cannot heal the corpse or the successor created by Continue. Current physical-life identity, time and action ownership decide that boundary. Existing effects due before an endpoint settle before checking the endpoint's valid result; the feature must not let a late completion revive a body that was already dead.

Saving retains the current body, selected care, elapsed valid work and any exact material claim. Current-format restore preserves this coupled state once. Pause stops game-time progress; reopening a panel does not repeat the effect. Participation departure ends unfinished human care under the current departure policy. Reconnecting does not accumulate care credit for absence or restart it without a new choice. The existing protected departure and whole-world hold policies remain controlling.

The ordinary ten-second care does not depend on an unattended service or a new clock. If an explicitly offered later service supports resident care while humans are absent, it must separately satisfy that service's participation, funding and interruption terms. No model failure fabricates care, consent or healing.

## 6. Field treatment and a willing helper

Field dressing is independently selectable after camp recovery is useful. It offers a concrete benefit: use a real prepared fiber to recover where the person has stopped, rather than walking back to camp. It has the same finite duration and ordinary outcome as camp recovery. A lone player can use it. A helper is never a required class or membership gate.

The player sees **Dress injuries here**, one actual prepared fiber, the selected body, the expected time and the remaining non-treated conditions. The material must be unreserved and directly carried under the chosen first scope. A nested fiber is reachable through the normal inventory route; the action does not silently take a friend's supplies or an unseen cache. Broader exact nested-source selection can later use the existing inventory consumer, without a new medical inventory system.

The first offered dressing must be useful: it needs an ordinary health or injury deficit. A healthy target cannot spend an item for healing experience or create a treatment-completion reward. There is no medical skill progression, automatic gratefulness, favor currency or numerical trust gain in this proposal.

For assistance, the helper proposes treatment to one nearby awake person. The proposal names the actual method, result, duration and supplier. Both people must be able to understand and assent to this treatment. The patient can accept, refuse, leave it unanswered or ask for a different help through ordinary conversation. The helper's offer is not acceptance by the patient, and the patient's request is not an order to the helper.

Acceptance concerns this one person, physical life, method and material arrangement. It grants no body editing, inventory inspection, standing care permission or right to continue after refusal. The first helper supplies the fiber from their own carried possession; a patient wishing to supply it can make a separate ordinary accepted handover beforehand. This keeps an exact useful first assisted activity without inventing remote withdrawals from another person's bag.

Once both choose to begin within reach, the helper performs the physical work and the patient remains still and awake. Both may speak and inspect. Both must remain living, present, capable and willing; their own applicable food/energy prerequisites apply independently and privately. Either may stop, move away or choose incompatible physical work, ending the attempt for both. There is one active care activity per body, preventing stacked helpers from multiplying the result. A person already being treated is not secretly reserved by the first unsolicited offer.

Only valid completion consumes the bound fiber and changes the patient's body together. An unavailable or changed lot, lost reach, withdrawn agreement, harm, death or stale completion yields no dressing benefit and spends no substitute lot. Prior speech and the fact that someone tried to help remain real events. No refund erases a completed treatment; no retry duplicates it.

An NPC can decline treatment for reasons grounded in its actual situation, trust, intentions or understanding. It can also offer help for its own reasons and later resent the interruption. Its consent and response use ordinary scoped cognition; they are not fixed medical scripts. A successful treatment is evidence the person may interpret. It does not mandate forgiveness, friendship, romantic affection or reciprocal service.

An unconscious patient, animal handling, coerced treatment, transport, rescue from lethal incapacity and ordinary revival are outside the first assisted method. Those need their own actual bodily and consent behavior. Their absence does not justify inventing a polite “yes” for someone who cannot assent.

## 7. Economics and pacing

The selected camp method costs **600 game seconds, or ten real seconds at normal speed**, plus retreat and whatever ordinary food/rest preparation is actually needed. It consumes no material. The same interval uses about 1.8 fullness and 0.9 energy under current ordinary active-work rates. These calculations exclude approach, reading, decision latency and any other actions. They are arithmetic, not observed completion times. [Profile economics](../worlds/base/recovery-and-care.md#complete-cost-and-balancing).

This low friction is intentional. The player already paid for harm through risk, lost health and a possible retreat. Every minor hit does not need another material tax. Scar treatment already competes for prepared fibers with cord, bags, arrows and fire starting. Field dressing adds a useful optional use for that material without making a missing fiber an ordinary health-recovery trap.

Full recovery has a fixed short time rather than three repeated partial-treatment clicks. This may encourage someone to accept additional risk before returning. The visible health consequence makes that a readable decision. No benefit increases past full health, and cancelling, splitting supplies or alternating helpers cannot create value. There is no extra daily allowance or artificial cooldown.

A camp close to an encounter may support repeated attempts. That is acceptable if the encounter remains interesting and the player learns or chooses differently. Do not add a long medical lockout to compensate for an unrewarding encounter, a bad spawn location or a threat that immediately attacks on arrival. Evaluate the actual travel and re-engagement under the encounter owner.

Camp recovery removes health damage as a reason to prefer dying while already at camp. It cannot honestly eliminate every incentive for deliberate death: current Continue also relocates the player and replenishes food and energy. Those existing tradeoffs remain with death and ordinary-session pacing. Do not quietly change corpse loss, death scars, hunger or Continue to claim that this care proposal solved them.

The first implementation should compare a survived hit, repeated hits with a voluntary retreat, a low-supply return and a cautious player who declines more danger. The relevant observation is the proportion of the full episode spent doing something wanted versus acquiring permission to resume it. No arbitrary satisfaction percentage or compulsory research study is added before a small playable implementation.

## 8. Keeping care inexpensive to run

The current body, action, elapsed-time, item and participation owners should carry this modest activity. A body part graph, hospital scheduler, generic treatment planner and dedicated provider loop are unnecessary for its product behavior. Another world can replace the camp and method through supported authored capabilities; this does not require the whole body-policy extraction to be completed first.

Nothing needs a fresh model decision at every progress increment, health point or animation frame. A chosen recovery can finish natively. Speech, requests, actual danger and a meaningful completed or interrupted treatment can supply ordinary attention evidence. A numerical change does not require a paid narrated sentence for every viewer.

One person's single activity is small, but a page of treatment results does not bound all discovery work. Many people, possible helpers, places, inventory lots, invitations and retained events can still grow. The design requires actor-scoped discovery, shared spatial/item queries, finite pending-work admission and honest continuation. It does not select a new world-population ceiling or erase old outcomes to keep a panel small. [Care limits](../limits/recovery-and-care.md) records these no-bound paths and shared owners.

Hosted capacity, model quality, accessibility under actual play and end-to-end latency remain unmeasured. Existing [first-threat evidence](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/verification/first-threat-encounter.md) qualifies its recorded native and browser behaviors, not the new recovery experience or unlimited crowded care.

## 9. First illness only when it adds a different worthwhile decision

Keep the first injury activity independent of illness. A later authored condition can be selected when a creator has a wanted episode that ordinary health recovery cannot express: for example a known exposure with a gradual, observable limitation and a genuinely different preparation or treatment choice. That is an example of the selection test, not an installed random sickness rule.

Before offering such a condition, its design must name actual exposure, who is susceptible, how it develops, what each actor can observe, what remains uncertain, every functional consequence, the complete untreated course, and every supported response. It must account for supplies, treatment refusal, interrupted work, re-exposure, ongoing need loss, final recovery and interaction with death. A meaningful waiting option and a credible solo response deserve explicit consideration.

If an illness can kill, spread, permanently alter ability, invalidate a planned return or affect a protected absent human, those are new consequential choices. They require the applicable world/lifecycle decisions before adoption. A later condition must not appear in this first loop through random complication text or a universal “untreated injuries get infected” assumption.

The smallest successful extension might be one condition with no transmission, not an ecology. Detailed organs, tests, drugs, immunity, long-term disability accommodation and institutional medicine remain possible repertoire work. None becomes a prerequisite because a care menu exists.

## 10. Scenarios and acceptance boundaries

| Scenario                        | Required experience and actual outcome                                                                                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First survived stag hit         | The player sees injury and reduced capability, reaches a known camp, chooses recovery, retains conversational participation and returns to their wanted activity. No fiber is required.                                                                                                        |
| Almost healthy after a mild hit | One short action is sufficient; no sequence of top-up clicks, hidden minimum injury or wasteful consumable requirement.                                                                                                                                                                        |
| Hungry and wounded              | The owner sees the actual food issue. Recover does not feed them; an ongoing zero-need state refuses/stops it. Eating first makes subsequent health recovery possible.                                                                                                                         |
| Scar plus new injury            | Ordinary health/injury improve; the scar remains named and separately treatable. Repeating Recover has no hidden scar-removal chance.                                                                                                                                                          |
| New threat during care          | An actual hit stops care and applies its real damage. The method neither searches hidden enemies nor grants protection at camp.                                                                                                                                                                |
| Stop to join a conversation     | Talking alone can continue with care; walking or another physical activity stops it. Closing a panel has no bodily effect.                                                                                                                                                                     |
| Save, pause, leave and return   | Same-format save retains actual coupled state; pause gives no progress; departure stops unfinished human care. Restore applies current participation interruption before any continuation, so a human's saved work need not resume. Return cannot duplicate success or accumulate absent work. |
| Field dressing by self          | A real selected fiber trades material for avoiding the retreat. Only valid completion spends it and restores the supported body.                                                                                                                                                               |
| Help accepted, then refused     | Either participant can end the attempt. No supply is spent, no effect is granted, and no social consent persists by implication.                                                                                                                                                               |
| Two helpers or changed supplies | One admitted treatment can occupy the patient. Offers do not reserve them; altered material cannot be silently substituted or spent twice.                                                                                                                                                     |
| Patient dies before completion  | Death remains real. Pending work cannot heal a corpse, a continued life or a revived successor.                                                                                                                                                                                                |
| Resident has other priorities   | The same supported recovery/help choices are available when applicable, but the resident may decline or choose something else without fabricated healing.                                                                                                                                      |
| Different authored world        | Unsupported biology/rest methods stay unavailable; a machine does not consume wilderness fiber to repair itself by analogy.                                                                                                                                                                    |

CARE01 qualifies the complete first human camp journey. CARE02 carries readable control and lifecycle behavior for each enabled activity; CARE05 includes independent resident choice when that use is offered. CARE03 separately qualifies field self-care and assisted care, including both participants' independent choices. CARE04 owns a selected future condition; it is not a release gate for earlier care. CARE05 reviews economics, exposure and complete-context qualification for the actually selected stage.

## 11. Research and its limits

All sources below are primary developer/rules publications retrieved October 6, 2026. Historical notes establish the stated design at publication, not its current balance or universal player approval. Each inference is this proposal's judgment.

### CARE-R01 — Credible self-care

[Ludeon, “Alpha 17 — On the Road released!”, May 24, 2017](https://ludeon.com/blog/2017/05/alpha-17-on-the-road-released/). The update added self-tending with reduced effectiveness and urgency-aware doctor priorities. **Inference:** a capable person should retain a credible solo response while help can have actual value. Open Legend uses supplies, location and willing effort, without copying an effectiveness penalty or colony-wide job assignment.

### CARE-R02 — Count preparation and remove repeated interaction

[Ludeon, “Update 1.3.3159 improves caravans, biosculpters, archonexus, and more”, October 23, 2021](https://ludeon.com/blog/2021/10/update-1-3-3159-improves-caravans-biosculpters-archonexus-and-more/). It simplified starting a treatment cycle, displayed treatment progress, and improved patients' access to food/medicine carried by pack animals. **Inference:** the whole preparation journey and readable remaining work matter. The first care uses existing inventory routes and one completion; it does not copy automatic patient feeding.

### CARE-R03 — Injury should change a readable ability

[The Indie Stone, “Advanced Zedonometry”, May 16, 2019](https://projectzomboid.com/blog/news/2019/05/advanced-zedonometry/). This development update describes light/heavy limping and serious leg injury preventing running, while acknowledging balancing remained. **Inference:** a functional consequence makes injury understandable. Open Legend starts with its actual slowing rather than inventing body-part consequences; the source does not prove slow travel is enjoyable.

### CARE-R04 — Put the response beside the problem

[The Indie Stone, “Build 35 released!”, December 2016](https://projectzomboid.com/blog/news/2016/12/build-35-released/). It describes pain-related sleep disruption, rest-place sleep quality and automatic use of first-aid equipment from the first-aid panel. **Inference:** expose the relevant treatment where the condition is inspected. Do not import a circular pain/sleep/supply trap or assume that first-aid automation should override Open Legend's explicit choices.

### CARE-R05 — Maintenance is a choice

[Iron Gate, Valheim FAQ, undated](https://www.valheimgame.com/faq/). Food changes total health and stamina without being necessary merely to stay alive. **Inference:** additional survival detail need not always be another compulsory drain. Open Legend retains its own hunger law; the comparison supports declining a new routine medical-maintenance burden.

### CARE-R06 — Consequences and recovery options

[Hinterland Support, “Sprain Improvements”, describing the May 2019 Steadfast Ranger update](https://hinterlandgames.zendesk.com/hc/en-us/articles/360027630272-Sprain-Improvements). It distinguishes slope/risk warnings, wrist/ankle consequences, pain relief, bandaging and rest recovery. **Inference:** say what an option actually remedies and provide understandable alternatives. Open Legend does not need to copy separate pain items or every injury category to make that distinction.

### CARE-R07 — Protect the adventure

[Larian, “Community Update #11 — Inspiration, Freedom & Pacifism”, December 2, 2020](https://baldursgate3.game/news/community-update-11-inspiration-freedom-pacifism_17). During Early Access it increased short rests between long rests from one to two, explicitly to permit more uninterrupted adventuring. **Inference:** evaluate recovery cadence by the wanted play it enables. This does not import a rest quota, party control or turn-based rules.

### CARE-R08 — Different kinds of help

[Wizards of the Coast, 2024 Basic Rules, “Damage and Healing”](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game#DamageandHealing). The rules distinguish healing, stabilization while unconscious and death, and cap healing at maximum hit points. **Inference:** name the exact treatment outcome rather than promising every kind of recovery. Open Legend's current zero-health death remains; no D&D-style unconscious state is introduced.

## 12. Gameplay critique and delivery order

The largest simplification is making ordinary camp recovery complete on its own. A compulsory consumable would create a chore at the moment the player had already succeeded in escaping. A slower free alternative would largely charge supplies to skip waiting. The selected short material-free camp method offers a practical route; optional field dressing makes materials useful through location.

Full recovery in one short action avoids repeated clinical bookkeeping. It is deliberately forgiving about ordinary injury while keeping encounter consequences, retreat, hunger, tiredness, scars and current mortality. The first implementation should improve a real adventure already worth attempting. Care must not become the reason to add arbitrary hazards or repeatedly wound an NPC.

A helper's independent willingness is meaningful only when it occurs within a life with other concerns. Do not make assisted care an initial dependency or require guaranteed grateful dialogue to declare a human recovery successful. A useful human activity can ship before broader resident or illness qualification.

If the full episode is dominated by camp commuting, first improve the encounter, rest-place distribution or field choice with their existing owners. If supplies become scarce merely because every new subsystem uses prepared fiber, review total demand rather than adding free mysterious medicine. If the ten-second action is still dull friction, shorten or integrate it deliberately; a more elaborate injury model is not the default cure.

No research or specification proves enjoyment. This product proposal nominates a small activity worth implementing and observing, while leaving all new runtime and experiential claims open.

## Maintained records

- Implementation: [CARE01–CARE05](../maintainers/recovery-and-care.md), under [ACT04](../maintainers/actor-model.md#tasks) and [BW14](../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery).
- Limits and constraints: [Recovery and care](../limits/recovery-and-care.md); shared [body rules](../limits/base-world.md), [native work](../limits/native-work.md), [state](../limits/state-effects.md), [items](../limits/objects.md), [persistence](../limits/persistence.md) and [cognition](../limits/cognition.md).
- Related contracts: [proposed world profile](../worlds/base/recovery-and-care.md), [current inspected death law](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-death.md), [compelling characters](compelling-characters-feature-spec.md), [design register](../maintainers/needs-design.md#dg21--injury-illness-and-useful-care).
