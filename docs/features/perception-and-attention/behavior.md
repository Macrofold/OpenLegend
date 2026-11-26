# Perception and attention — behavior

This document specifies the desired common behavior. [Authoring](authoring.md) defines the supported ways to express it; the [scenario collection](scenarios-and-acceptance.md) defines concrete acceptance cases. Numerical settings are owned by the [base-world profile](../../worlds/base/perception-and-attention.md), not by the engine.

## 1. Purpose and scope

Characters should notice consequential changes, maintain useful activities, and offer believable opportunities for distraction, stealth, rescue, cooperation and discovery. A person can notice an arrival without continuously following the visitor. The same person can later notice the visitor taking a dangerous action because that is new evidence with a new consequence.

The feature covers personally received changes, interests and active commitments; admission and ranking of closer observation; meaningful interruption and bounded assessment; combinations of cues; continuing conditions; and honest continuation and recollection. It supports autonomous people, native creatures or machines, and directly controlled characters through their actual capabilities.

The feature does not implement new senses, combustion, theft law, morality, combat, crafting loss, personality or model inference. It consumes supported evidence and actions from those owners. It does not require every NPC to think about every event or every world to have human sight, hearing, jobs or autobiographical memory.

## 2. Terms, inputs and outputs

| Term | Meaning |
| --- | --- |
| Occurrence | Something that actually happens, such as an impact, utterance or state transition. Its hidden causes are not automatically known. |
| Received observation | The facts a particular character acquires through an available sense, bodily channel or permitted communication, with actual time, source association and uncertainty. |
| Candidate | Something to which useful attention can be directed: a person, object, part, workpiece, occurrence, direction, region, received group or tentative situation. An entity identity is not required. |
| Concern | An actual reason this character cares: their bodily safety, accepted work, chosen watch, known responsibility, expressed interest, expected reply or useful opportunity. A biography sentence alone is not a continuously monitored condition. |
| Attention reason | A supported relationship between a candidate and a concern or striking cue, with priority, requested observation, evidence and an ending rule. |
| Brief demand | A finite need to register or check a cue. Serving it does not imply sustained tracking. |
| Continuing demand | A need to maintain useful current detail while a supported situation or accepted commitment remains applicable. |
| Assessment | Accepted finite work to check evidence or consider alternatives, with explicit continuation and ending conditions. It is not the elapsed time taken by a model service. |
| Interpretation | The character's potentially mistaken account of what observations mean. It remains distinct from a directly received fact. |

### Inputs

The feature may use only:

- Personally received facts, their original occurrence and acquisition times, supported location/bearing, independently supported source associations, observed participants, uncertainty, and known changes or continuity.
- The observer's current capabilities and actual physical coverage; present observation needs and already accepted work, goals, methods, watches and response contingencies.
- Personally available relationships, permissions, expertise, expectations and dispositions, where their owning feature supports the relevant meaning.
- Installed world definitions for perceptible cues, supported meanings, priorities, condition lifecycles, method availability and finite resource allowances.
- The actual passage of the world's time and the expiry, correction, loss or withdrawal of relevant support.

An attention rule cannot read an unseen destination, an object's secret quality, a character's private plan, an unrecognized person's canonical identity or another witness's private observations. A world may explicitly grant another sense or information-sharing capability; that capability must actually supply the evidence first.

### Outputs

The possible outputs are independent:

| Output | Required meaning |
| --- | --- |
| Notice | A personally acquired fact or event. It can exist without closer observation, new thought or lasting memory. |
| Current reason | Why closer observation could help, with evidence, priority, demanded detail and validity. |
| Selection, continuation or release of detail | Which eligible candidates currently receive optional detailed observation/retention, and why. |
| Matched condition | One supported watch occurrence or continuing-condition transition, including unknown/incomplete outcomes where appropriate. |
| Reconsideration opportunity | A meaningful unresolved choice for the observer's existing controller. This is not a promise of a paid call or a particular answer. |
| Accepted response | A choice admitted through ordinary agency: continue, orient, assess, investigate, speak, help, retreat, pursue or another supported action. |
| Personal account | Only actual acquired evidence, acknowledged gaps and the character's distinct interpretations, under the memory owner. |

The observer may receive none, one or several of these outputs. A notice does not automatically produce all later outputs. A repeated position update may refresh useful steering without creating a new decision or permanent memory.

## 3. Acquisition comes before optional attention

Physical sensing determines what is available. The attention system cannot increase a sense's range, see through cover, understand unheard words or acquire the past. Required bodily consequences, exact directed communication and other mandatory evidence retain their existing owners even when optional detail is occupied.

Broad awareness and sustained detail differ. Broad current evidence may include a person at the counter. Detailed tracking may retain their received movement while a pursuit or meaningful watch needs it. When that reason ends, ordinary background presence does not keep consuming detailed tracking merely because it is the highest remaining candidate.

Ordinary event/history eligibility is not suppressed just because a character is busy. The rejected busy-worker experiment is not reinstated. This distinction also does not require an exhaustive movement history for every visible body: continuous route retention has its own selected-detail requirement. A witness can retain a supported opening, greeting or injury while having no record of the intervening ordinary movement.

A change to the observer or surroundings can matter as much as movement by a subject. Turning, waking, a changed sense, a door opening, changing light or an obstruction moving can expose a stationary person. The new fact is what is now acquired; earlier unseen activity is not backfilled.

### Evidence quality

Detection, localization, classification, recognition and understanding are separate. Hearing a blast without knowing its source can be highly attention-worthy. Seeing a cup in excellent detail can be unimportant.

Better evidence can support a stronger or more specific reason: the observer may distinguish flames from reflected light, a hand opening a lid from a lid already open, or a familiar guard calling for help from unintelligible shouting. This changes what the observer can conclude. There is no general bonus merely for “seeing clearly.”

Confidence is not universal multiplication by a probability. Uncertain but potentially severe danger can justify checking or precaution. Identifying a culprit, attacking someone or accusing them still requires that action's own evidence and agency judgment. A weakly localized warning never becomes an exact target because its priority is high.

## 4. Reasons replace arbitrary accumulated points

### One common ranking

Each active supported reason receives a priority from the installed world policy. A candidate's priority is the **maximum priority of its active reasons**. There is no addition for the number of updates, descriptors, matching definitions or witnesses elsewhere.

Priority means “how valuable or time-sensitive is the next useful observation of this candidate?” It is not probability, moral judgment, affection, hostility, narrative importance or the value of an entire future action.

A reason identifies:

- The candidate and the personally supported observation that makes it applicable.
- Any actual concern or accepted work it serves.
- What useful information is sought: register the occurrence, check an uncertainty, update a moving target, observe a work state or maintain a supported warning.
- Whether that demand is brief or continuing, what makes it eligible, and the conditions for acknowledgement, expiry, suspension or clearance.
- Its priority and whether a response opportunity is imminent enough to bypass ordinary focus stability.
- What would constitute meaningful new evidence or escalation after a prior response.

These meanings must be inspectable. A number without a source-supported explanation is insufficient.

### Reusable sources of relevance

| Reason family | What establishes it | Examples |
| --- | --- | --- |
| Immediate harm or danger | Personally supported injury, dangerous exposure, imminent contact or another installed hazard interpretation | Someone burning nearby; an arrow entering a supported danger scope; a companion falling. |
| Accepted work needs information | Actual work binds a subject, result, place or opportunity | A pursued person; the current workpiece; an expected recipient arriving. |
| Something affects a protected interest | An observed interaction concerns an actually bound subject or place | Opening watched supplies; approaching a protectee; damage to a defended gate. |
| Personally meaningful communication | Acquired address, understood request, known signal or reply connected to a supported concern | An ally asks for help; a customer answers; a warning interrupts work. |
| An opportunity is closing | A supported process or observation supplies a known response window or consequence | A temporary opening in a defense; a supported material process reaches a useful state; a route is about to become unavailable. |
| Striking or unexpected change | Received intensity/change and the observer's supported expectation make a brief check useful | A distant blast; a sudden collapse; an unfamiliar mechanical noise. |
| Positive interest or discovery | An actual interest or a finite opportunity to inspect unfamiliar surroundings | A useful demonstration; unusual wildlife; a striking view; a sought tool. |

A merchant who starts pursuing a thief uses the same pursuit reason as a guard. A guard making a tool uses the same workpiece reason as a craftsperson. Adding a new sword, recipe or container does not require a new occupation-specific attention algorithm.

The priorities may change when relevant circumstances change. Chasing a nuisance and stopping a person visibly about to injure someone have different stakes. An expected authorized opening can satisfy a watch without implying a problem. A statement that an act is urgent cannot create a deadline the mechanic does not expose.

### Immediacy and the counter example

An immediate change matters because it affects an accepted concern now or closes a real opportunity to respond. A watched container opening supplies a state transition; the watch supplies personal relevance; a supported risk of loss or immediate harmful interaction can supply a more urgent reason.

There is no unexplained “near the counter” addition. Nearness can matter through supported reach, time to contact, actual interaction, or perception. Simply standing nearby is neither theft nor urgency. If no consequence or response window is known, the observer has a relevant observed change, not an invented emergency.

### Same cause, different support

A hand moving, a lid rising and an observed closed-to-open transition may support one opening. Multiple observations can establish who acted and what changed without adding three task-relevance bonuses.

Separate reasons remain available. The opening can match a watch and expose a dangerous process. The candidate uses the stronger current priority; ending the danger does not erase a still-valid watch. Independent accepted tasks each retain their required completion or notification even if attention computation is shared.

Independent evidence can strengthen a conclusion by supporting a more consequential interpretation. A help call and compatible fighting sounds may support an emergency reason stronger than either isolated cue. The result is one supported reason with its evidence, not an unbounded sum of sound events.

## 5. Eligibility, capacity and stable selection

### Being highest is not enough

A candidate is eligible for optional detail only while a useful declared demand exists and the required observation is possible or meaningfully investigable. Background motion may be noticed without any sustained-detail demand. Empty detail capacity may remain empty.

A newly seen unfamiliar object can receive a brief discovery opportunity without any predeclared personal interest. This gives characters a way to encounter unexpected possibilities. It is finite and does not itself guarantee reflection, a reply, learning or permanent retention.

A reason that only asks to register an already received fact can be satisfied without taking a continuing tracking slot. A reason asking for further inspection can offer an actual observation method. Satisfying the demand ends its special claim; unchanging presence does not automatically renew it.

### Capacity

The observer's installed profile supplies finite detailed-observation capacity. There is no universal one-subject limit, and this design does not change the native branch's ten-subject example into one. Multiple selected candidates can coexist when the observer's senses and real work permit it.

A capacity slot does not prove simultaneous physical coverage. Following two people visually may be possible while both occupy the supported view; monitoring opposite directions may require turns and honest gaps. Hearing a sound can coexist with seeing a runner. A requested observation that needs an incompatible turn must pass ordinary action admission.

Mandatory physical effects and required personal evidence do not compete for optional slots. If more genuinely important subjects exist than can be examined, the character has incomplete detail. Priority cannot create additional eyes, exact knowledge or a fictional absence.

### Replacement

The selected world specifies an ordinary replacement margin. Existing useful detail survives near-equal fluctuations. A meaningfully stronger challenger can replace the lowest-priority compatible optional allocation; an immediate supported emergency bypasses ordinary inertia. Equal ordinary priorities favor continuity; pending comparable demands receive fair opportunities when the current demand is served or ends.

No minimum hold delays registration of new evidence, bodily protection, urgent communication or an independently due native reaction. There is no universal two-second attention-switch timer. If a world chooses an optional dwell/stability rule, its scope and urgent bypass must be explicit.

Selection uses current reasons, not a running score total. An unchanged runner does not gain priority by moving at a higher update rate. Re-ranking is warranted by a changed reason, eligibility, coverage, concern or deadline—not merely because another simulation interval passed.

### Discovery and fairness

Quiet novelty must remain discoverable during compatible spare capacity or genuinely free intervals. It must not eventually outrank an ongoing emergency through an unlimited age bonus.

A discovery allowance is an allowance for optional work, not an untouchable physical-observation slot during danger. When urgent work occupies all available detail, discovery can wait. Its waiting status neither buys recurring paid thought nor promises examination before departure. This intentionally permits a meaningful surprise to consume all optional detail when necessary.

## 6. Distraction changes opportunities, not goals automatically

Suppose a pursuit has priority 68 and an explosion has priority 75. If the installed replacement policy admits the brief demand, the blast can receive closer consideration promptly. The guard's pursuit remains accepted work. The guard may continue running while listening, keep both subjects in detail, choose a compatible glance, or choose a finite assessment.

The score does not issue movement toward the explosion. Nor does it mean the guard ignores the runner. A new action follows only from an already accepted conditional response, a fresh decision, an installed native controller, or an independently supported involuntary bodily effect.

For reasoning NPCs, an installed response policy is explicit accepted behavior, not a secret command encoded in perception. For example, a pursuit method may include “on a credible unrelated emergency, briefly assess; on expiry, resume if the original pursuit is still viable.” Its actual condition, movement effect and fallback must be part of the admitted method. A free-form goal to be responsible does not silently install that policy.

### A serious interruption

A recognized guard's intelligible call for urgent help can connect to a known duty or relationship. Compatible battle sounds can strengthen an interpretation that someone needs assistance. This may justify abandoning a nuisance pursuit, asking another guard to take over, warning others, moving to a vantage point, or helping directly.

Another observer may choose differently. A civilian may retreat. A guard already stopping an imminent killing may continue that intervention. A mercenary may demand an explanation. These are choices informed by attention, not different sensory truths or occupation-specific ranking algorithms.

### Losing the original target

If a real turn or obstruction removes the runner from supported sight, steering can use only still-valid received position/motion and the selected last-seen policy. It cannot use the hidden turn behind a stall. A later broad sighting can provide new evidence; it cannot reconstruct the gap.

Attention loss and sensory loss are distinct. Releasing optional detailed retention does not itself erase current broad visibility. Conversely, retaining a pursuit reason does not keep the target visually available through a wall.

If the target is reacquired, association must be supported. Similar clothing or proximity alone does not silently replace the pursued person with another person.

### When a distraction ends

The brief blast demand ends when served or expired. It remains a noticed occurrence if the memory owner retains it. A still-supported fire, help request, blocked escape or unresolved dangerous situation can maintain its own reason.

The original activity resumes only under its accepted continuation and current validity. Actual interruption effects, changed tools/resources, elapsed deadlines, lost contact and new circumstances still apply. The character may decide to let a nuisance go; a lower attention score does not retroactively create that choice.

## 7. Surprise, assessment and thinking

These are different:

| Event | Meaning and consequence |
| --- | --- |
| Unexpected cue | It differs from a supported expectation and may earn a brief attention demand. It need not induce fear or a bodily penalty. |
| Native startle or other bodily response | The installed body/emotion law acts on its supported cause, independently of a model response. Existing startle does not itself paralyse, turn or send a person running. |
| Registering danger | The preparedness owner records the supported warning according to its own timing and scope. This does not itself choose defense. |
| Assessment | The character has actually chosen finite work to acquire/check information or reconsider a course. |
| Deliberate decision | The controller considers permitted alternatives and may choose to continue, change, decline or do nothing. |
| Technical service wait | Queueing, network or model latency. It never secretly sets fictional surprise or assessment duration. |

### Assessment contract

An assessment must define its question, permitted focus/region, compatible observation method, original deadline, suspension/continuation terms and fallback.

1. **Admission:** the actor newly chooses the assessment or a previously accepted contingency activates it. Actual action rules decide whether running continues, slows, stops or cannot be interrupted yet. Hearing alone is not admission.
2. **During assessment:** sensing, movement already permitted to continue, native protection and physical consequences continue. A guard who looks away can lose the runner. Merely thinking does not require standing still.
3. **Early completion:** a sufficient supported answer or an accepted useful response can end the assessment before its deadline. It is not a compulsory cinematic delay.
4. **Interruption:** a new immediate threat, Stop, loss of required capability, revoked authority or incompatible work ends or changes it under the action owner. An incoming arrow is not forced to wait for a thinking timer.
5. **Expiry:** apply the accepted fallback once. Resume still-valid work if that was chosen; otherwise finish the assessment with the uncertainty retained. Do not invent an investigation destination.
6. **Unavailable decision service:** finite native observation and fallback still run. Provider failure, no funds or no capacity is not a private choice to ignore the incident. It does not renew the assessment or automatically retry a call.
7. **Late answer:** any later proposed action must still be useful and valid for current evidence and work. It cannot make the actor stand still retrospectively or replay a completed interruption.

The bundled profile supplies a short assessment default. Existing look/listen/inspect methods retain their actual turn, dwell and capability requirements. An assessment deadline does not certify that an unfinished inspection succeeded.

### Direct control

The human controls voluntary movement, camera, speech, interpretation and action. Important cues can be presented and actual authored bodily effects can apply, but attention does not silently seize the camera, cancel an input, impose fear, select a target, reveal an enemy or choose a rescue.

Automatic focus presentation must preserve permitted information and offer accessible alternatives. A sound cue's visual equivalent must retain its actual uncertainty rather than draw an exact marker on an unknown source.

## 8. Several cues and a tentative situation

The observer can associate cues when the supported relationship makes sense:

- Received regions or bearings overlap at compatible times.
- The observer recognizes a shared person, workpiece, place or ongoing activity.
- Actually understood words refer to a known place, person or incident.
- An installed bounded pattern or an independently admitted interpretation establishes a fallible connection.

The server's hidden encounter identifier, source coordinates or true causal relationship cannot establish that association for the observer.

For a help call plus battle-like sounds, the output may be “possible fighting near the gate; someone requested help.” It does not reveal the attackers, exact numbers, which side is justified, whether the speaker is truthful, or an unheard sentence. A known voice's request remains a claim by that speaker.

### Corroboration and conflict

The pattern must say which distinct supporting observations are needed and what conclusion they permit. A repeated rendering of one scream is not another witness. Hearing and seeing one impact can improve localization or classification but do not count as two independent attacks.

Compatible independent cues may raise a hypothesis to a more urgent category. Conflicting directions or times preserve separate possibilities unless another supported link resolves them. Missing a second cue means the stronger combined conclusion is unavailable; it does not invalidate the first cue.

Different witnesses can form different hypotheses. Testimony can add a reported claim through actual communication; it does not transfer the speaker's sensory certainty. A later disproof revises the interpretation and its derived reasons while preserving the original honestly heard/seen events, subject to ordinary correction rules.

### Bounded hypotheses

A brief possibility cannot reserve attention indefinitely. It ends on answer, supported disproof, completed/declined response, expiry or loss of the underlying concern. A chosen search may continue within its own finite scope using last-known evidence.

Expiry or incomplete checking means unresolved or stale, not false or safe. New independent evidence, meaningful escalation or a changed commitment may reopen the question. Time passing alone does not create another fresh emergency or periodic model call.

## 9. Repetition and continuing conditions

An occurrence and an ongoing condition have different lifecycles. An opening is a change; being open is a state. Repeated samples of an open box do not create more openings. A second witnessed closing and reopening is a new occurrence.

A continuing condition has true, false and unknown outcomes:

- First supported truth follows the condition's initial reporting policy.
- Continued truth maintains the same condition and updates useful support without repeating onset.
- Supported escalation can create a new response need while preserving the same underlying condition.
- Supported false/clear evidence starts any authored clear interval.
- Missing coverage, partial checks or exhausted optional analysis is unknown. It cannot clear or rearm the condition.
- Rearming requires the declared supported clearance; returning to view or loading a save alone does not satisfy it.
- Ending the concern releases future monitoring. This ends the watch, not the world condition or past evidence.

Changes to either participant can affect an approach. A moving protectee approaching a stationary hazard is as relevant as a hazard approaching the protectee. The meaning still depends on received relative evidence, not hidden routes.

### Repeated distractions

Suppress duplicate brief demands once they have been served. If the character has actually learned that a recurring signal is harmless or expected, an applicable interpretation can reduce the next redundant interruption. The system cannot use secret knowledge of a decoy's creator or intention to immunize the NPC.

Habituation does not suppress real consequences. A fresh injury, a closer threat, a new victim, a changed escape route, materially different words or a meaningful escalation can demand attention. A known continuing fire retains its danger reason after novelty is gone.

Two players cannot buy unlimited fresh priority by making the same sound repeatedly. They can create genuinely new evidence at a new place or use a credible new tactic. The outcome depends on what the observer can distinguish; changing an internal object ID alone is not fictional novelty.

## 10. Continuation, records and failure

### Concerns and work

Starting, completing, canceling or replacing accepted work changes the reasons it supports. Changing permission, a known obligation or an observed work result can change interpretation even if no body moves. Revocation ends future authority; it does not undo an already committed physical effect.

A subject leaving or becoming unobservable removes unavailable live detail. A last-known region, remembered request or finite investigation can remain meaningful. No continuing reason guarantees current coordinates.

Observation methods retain their existing finite deadlines. Focus changes, control handoff, reconnect and repeated instructions do not silently renew a watch. A requested extension requires actual acceptance through the owning method.

### Memory and learning

Record actual source distinctions: observed action, current aftermath, heard testimony and personal inference. Being next to an open box later does not prove who opened it. A spectator may recount the opening without knowing the whole chase.

Detailed history starts with real acquired support when selection begins; it does not import another witness's earlier track. Learning from a demonstration grants only what the knowledge owner permits. Watching a device work does not automatically reveal its internal design or manufacturing method.

Attention selection itself is not a lasting-memory reason. Memory pressure, forgetting and correction keep their separate rules. Omitted optional detail is explicit where a later account would otherwise imply complete coverage.

### Persistence and time

Saving and restoring preserve active concerns, accepted work, original deadlines, satisfied occurrences, continuing-condition state, incomplete coverage and admitted response outcomes. Restoration is not a new opening, a fresh alarm, another help request or a renewed free opportunity. Current sensory support must still meet the owning sense's restoration rules.

Pause freezes game-time lifetimes. Acceleration advances the same world time; it does not silently multiply opportunities or grant extra observations between samples. Technical timeouts retain their distinct host-time meaning.

Definition changes preserve historical evidence. They affect future monitoring under explicit activation terms and cannot reinterpret a previous unheard act as witnessed. Removing a required capability makes dependent work unavailable rather than silently substituting another sense or meaning.

### Capacity and unavailable capabilities

Required physical outcomes and permitted mandatory acquisition remain intact under optional attention pressure. Optional checking may be incomplete or deferred; that must not be reported as a completed negative search or intentional disregard.

Voluntary watches that cannot be supported within their declared scope must be refused before acceptance, or offered a narrower scope requiring acceptance. The system must not promise coverage and quietly discard matches. Unexpected failure after acceptance yields explicit incomplete/failed coverage, preserves committed results and follows the accepted continuation.

No model service is necessary to receive evidence, apply an already selected native continuation or expire a completed brief demand. Rich new interpretations can await an independently justified decision. Outages preserve the distinction between unknown, declined, not yet considered and technically unavailable.

## 11. Functional performance requirements

Adding definitions irrelevant to an observation must not make each witness evaluate those definitions. Adding fifty wound interpretations must add no wound-specific work to an ordinary walk. A new definition about another watched object must not be considered merely because both objects are containers.

Work may grow with actual sensory candidates, real recipients, affected active concerns, supported cue combinations and distinct required results. A crowded battle can legitimately cost more than an empty road. A larger installed catalogue can cost more to load, validate and store; that does not authorize recurring catalogue scans.

Normal pursuit must update useful current observations without reselecting the pursuit, rebuilding unchanged appearance, rereading full history or invoking a model on each movement. Only supported current observations may steer it. The selected world's [fast-pursuit target](../../worlds/base/perception-and-attention.md#responsive-pursuit) applies to admitted pursuit work, not every visible subject.

Increasing expressive content, witness count, active-interest count and cue rate are separate acceptance dimensions. The [technical design](../../projects/perception-and-attention-tech-design.md) specifies mechanisms and honest complexity; the [scenario collection](scenarios-and-acceptance.md) specifies the gameplay and growth comparisons. No speedup or population capacity is established by this specification.

## Maintained records

[Collection, decisions and dependencies](README.md) · [Authoring](authoring.md) · [Acceptance](scenarios-and-acceptance.md) · [Implementation](../../maintainers/events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance) · [Limits](../../limits/perception-and-attention.md) · [Technical design](../../projects/perception-and-attention-tech-design.md)
