# Perception and attention — authoring and supported conditions

This document defines the functional authoring contract for the [attention behavior](behavior.md). It describes what a world or a character can request, what evidence that request requires, and what the result means. Algorithms and runtime representation belong to the [technical design](../../projects/perception-and-attention-tech-design.md).

## 1. Generality through reusable meanings

The system must support new content by combining a small vocabulary of actual observations, relationships, concerns and responses. It must not require a new trigger for each named container, sword, recipe, occupation or story.

For example, “notice a change to the subject I am guarding” can apply to a cashbox, a gate, supplies, a prisoner or a workpiece when the relevant observable changes exist. “A preventable consequence is becoming imminent” can apply to a supported attack, a rescue opportunity or a material process. Those cases differ in evidence, consequence and available response; they do not need separate perception systems.

The same definitions serve two distinct uses:

- **Installed general behavior:** supported sensory capture, native hazard handling, recognized communication or a creature's actual response policy.
- **Bound personal concerns:** a chosen pursuit, finite watch, protected person/place, expected outcome, admitted sensitivity or practical interest with supported observable conditions.

An installed template does not mean every character monitors it continuously. A personal concern becomes active through an actual owning capability, accepted work or explicitly authored character policy. Ending that owner ends the concern's future monitoring.

Rich prose remains useful. “I want to become a great shipbuilder” can guide a later decision without continuously classifying every event in the world against that sentence. “Notify me when this observed plank cracks during my current test” has a specific supported condition. The game must distinguish those promises clearly.

## 2. What a definition must specify

| Field of meaning | Required definition |
| --- | --- |
| Purpose | What useful observation, decision or supported response this concern serves. |
| Eligible owner | Which installed capability, active work, duty, accepted instruction or sensitivity can activate it. |
| Roles | Permitted bindings such as self, chosen target, protectee, watched subject/part, workpiece, known area or expected speaker/result. |
| Observable input | Which personally received event, state, relation, communication or body/work result can support a match. |
| Evidence requirement | Required detection, classification, association, recognition, understanding, localization, coverage and freshness. Missing values are unknown. |
| Condition | A supported occurrence, state, comparison, relationship or bounded composition. |
| Attention target | The supported subject of useful observation, including an anonymous occurrence, region or situation when identity is unavailable. |
| Priority | The installed mapping from supported meaning and actual concern to reason priority; never an unexplained bonus per sample. |
| Demand | Brief registration/check or continuing detail, what serves it, and what remains unresolved afterward. |
| Lifecycle | Initial-state treatment, onset, meaningful update/escalation, clear/rearm conditions, original deadline and terminal outcomes as applicable. |
| Consequence of matching | Record/report a match, offer consideration, or invoke an independently admitted prepared-response condition. A match itself grants no new action authority. |
| Supported scope | The limits of the observation, condition complexity and live combinations the request can actually sustain. |

Every field may have a documented installed default. An omitted consequential field cannot acquire an undisclosed runtime guess. Numeric observations include their units; an authored threshold must be compatible with the supplied measurement.

### Roles preserve perspective

A role binds what the character can legitimately refer to. A watch may use an unidentified doorway, a known location, a currently distinguishable stranger or a recognized person. It need not require a canonical name.

When a condition refers to an opener, speaker or attacker, the role remains unknown unless personally supported association exists. If the merchant hears a lid and sees the box but not the hand, the box or opening is a valid attention target. The invisible opener is not.

A named role does not disclose current position. Knowing who a person is and where they were last seen is enough to ask about them, but not to track their unseen movement.

## 3. Supported condition families

The first general system supports the following forms through available trusted observations. A world may omit a family or provide a different sense. Unsupported input remains an explicit capability gap.

| Family | Meaning | Useful contrasting applications |
| --- | --- | --- |
| Received occurrence | One actually acquired event or transition, with its own identity and provenance | An impact; an intelligible warning; an observed opening; an action's supported result. |
| Current received state | A supported state holds now, without claiming when it began | A person is in the watched region; the gate is currently open; a workpiece is visibly damaged. |
| Change to a bound role | An observed action or change affects the subject, part, place or result of an active concern | Supplies being accessed; an ally losing support; the current test piece changing state. |
| Relative relationship | Personally supported separation, closing, entry, support, contact or another registered relationship meets its declared condition | Someone closes on self or a protectee; a moving traveler nears an observed drop; an object enters a watched opening. |
| Understood communication or learned signal | Actual received content has a supported meaning for this observer | Direct address; a request; an expected reply; a known alarm pattern. |
| Known opportunity or consequence | The owning activity or supported observation provides a relevant state and response window | A supported craft process needs intervention; a route becomes available briefly; a rescue step is blocked. |
| Bounded combination | A finite conjunction, alternative or sequence of personally supported facts, with declared relationships and time windows | Help call plus compatible battle sounds; smoke plus people fleeing; unusual machine noise plus observed damage. |
| Expected result or absence | A declared expectation is checked at its deadline with enough evidence to establish success, failure or unknown | A promised arrival not observed during an actually covered watch; an expected work result absent from a completed examination. |
| Brief unfamiliar or striking cue | A finite check of actually acquired change under the world's sensory/novelty policy | An unexpected blast; unusual wildlife; an unfamiliar device performing a visible effect. |

The family must distinguish an observed crossing from simply observing the subject inside a boundary. A predicted contact is a supported estimate with assumptions, not a completed collision. A material timer belongs to the material process; attention cannot create one.

### Supported comparisons and composition

Definitions may use exact supported equality/membership; numeric or spatial comparisons with units and declared uncertainty behavior; finite all/any alternatives; supported negation; and finite ordered or unordered cue combinations.

All clauses retain their evidence requirements. An all-condition is true only when all required clauses have current support. It is false when a required clause is supported false, otherwise unknown. An any-condition is true when a clause is supported true; false requires supported falsity of every alternative, otherwise it is unknown. Negation maps supported true to false and supported false to true; unknown remains unknown.

Time itself can make an observation stale or a check due. It cannot establish an unseen absence or clearance. A deadline for “the messenger did not arrive” yields unknown if the watcher slept or lacked the necessary coverage.

Composition cannot grant a new sense, infer a hidden identity through equality of private source IDs, search everyone's memories, or treat prose as an executable condition. Additional supported forms can be added through their proper capability owner.

## 4. Occurrences and continuing-condition lifecycle

### Discrete occurrence

One acquired occurrence can satisfy each relevant accepted obligation once. Multiple views of the same occurrence may refine its evidence, but cannot repeat its notification or prepared action. Separate actually witnessed occurrences remain separate, even when they concern the same subject.

For a closed-to-open rule, the observation family must expose an opening transition. Seeing an already open box establishes current state. It does not satisfy a rule that specifically requires witnessing the opening.

### Initial state

A current-state watch explicitly chooses one of:

- **Report current:** immediately report an already supported true state as current, without inventing an onset or crossing.
- **Changes only:** establish the available baseline without reporting pre-existing truth. Wait for the declared later supported change.

The bundled default for a level watch is report current. A request to catch a specific future event remains event-based. The authoring surface must not silently substitute one for the other.

If initial coverage is unknown, later acquisition of truth can be reported as newly known current state where the definition permits it. It cannot be described as a witnessed arrival, opening or crossing without supporting transition evidence. A changes-only condition that requires such a transition remains unmatched until it is actually witnessed.

### Continuing condition

| State/change | Required behavior |
| --- | --- |
| Supported false to supported true | Start one condition episode and offer its defined onset result. |
| True remains true | Maintain the same episode; update useful support and demanded detail without repeated onset. |
| Meaningful supported escalation | Update the reason and allow the declared reconsideration; do not pretend the whole condition restarted. |
| True becomes unknown | Preserve uncertainty and prior outcome; release unsupported live claims. No clearance or rearm. |
| Supported clear evidence begins | Begin the installed clear interval. Interrupted or insufficient clear support cancels that clearance attempt. |
| Supported clearance completes | End the continuing reason and permit a future supported onset. |
| Concern ends, expires or is revoked | End future monitoring with the actual termination reason, without declaring the world condition false. |

An acknowledged continuing danger can remain high-priority observation without producing another paid decision. Once the observer has chosen a sufficient continuation, equivalent evidence does not reopen that same choice. New support, a changed result, a blocked continuation or escalation can.

## 5. Combining cues into a possible situation

A pattern declares:

- The required distinct cues and which refinements of one occurrence count as the same support.
- A finite relationship: a common personally associated subject/place, compatible received regions/bearings, understood reference, or a defined signal sequence.
- A finite window measured using actual occurrence/acquisition semantics; delayed presentation cannot make old events contemporaneous.
- The permitted conclusion, its uncertainty, the attention demand, and the conditions that end or invalidate it.
- Whether opposite cue order is allowed. An unordered combination cannot secretly require the first implementation's arrival order.

For “a help request and sounds consistent with fighting,” either cue may arrive first within the declared window. Compatible bearing alone supports a possible relationship; it does not prove the caller is a combatant. If the request explicitly names a personally known place, that received reference may support association even when its bearing is unavailable. The observer must still preserve the request as testimony.

Two unlocalized sounds with no known link are insufficient for this native combination. They remain separate evidence that a later independently justified thought may interpret. A native pattern must not pretend to perform unlimited commonsense scene understanding.

A second cue may support a more serious category and therefore a higher reason priority. Its score is not added to the first. A third copy of the same sound cannot raise the result again. New supported severity, an additional victim or another distinct consequence can change the situation.

A derived interpretation cannot continuously renew itself by matching its own words or outputs. Further interpretation needs genuinely new support or an independently justified decision. Contradiction can weaken or withdraw a hypothesis without deleting the actual sounds or statements that were received.

## 6. Worked definitions

These are human-readable specifications, not executable schema syntax. A creator should be able to request them in ordinary language, inspect their actual supported scope and accept the result through the existing authoring permission system.

### A. Notice access to the subject I am guarding

| Field | Meaning |
| --- | --- |
| Active owner | An accepted finite watch of a supported object or part. |
| Input | A personally observed closed-to-open transition or other explicitly selected access event. |
| Binding | The event affects the actual watched subject. |
| Attend to | The associated actor only if the watcher acquired that association; otherwise the object or occurrence. |
| Reason | The watched subject has changed in a way the accepted watch asks to report or inspect. |
| Lifecycle | Once for that witnessed access occurrence; future witnessed occurrences remain distinct. |
| Choice | Continue, ask, inspect, intervene or another supported response according to actual permission, concern and evidence. No automatic theft verdict. |

This also applies to a guarded gate or test enclosure if its owner supplies the relevant observed change. It does not require the watcher to have already tracked every possible interacting person.

### B. Someone is closing on the person I am protecting

| Field | Meaning |
| --- | --- |
| Active owner | An accepted concern for the protectee with a defined observation/response scope. |
| Input | Compatible-time received positions/extents and supported change in separation; unknown data stays unknown. |
| Binding | Protectee and received nearby subject, whether either one moved. |
| Meaning | A supported approach, not proof of hostile intention. Additional attack or danger evidence can make it urgent. |
| Lifecycle | One continuing episode; updates maintain it; supported clearance rearms it. |
| Choice | Keep monitoring, change position, ask, warn, defend or continue, through existing agency. |

Changing the anchor to self, a workpiece or a watched place reuses the relationship where that family supports it. A static world-coordinate sphere must not replace a moving protectee without the author knowing.

### C. A possible emergency near the gate

| Field | Meaning |
| --- | --- |
| Active owner | The world's supported emergency-check policy, plus this observer's actual duty or accepted concern where applicable. |
| Inputs | An understood request for help and separately acquired combat-compatible sound, in either order. |
| Relationship | Compatible personally received location/bearing or an understood reference to the known gate within the declared time window. |
| Conclusion | Possible fighting and a request for help near the gate; neither known attackers nor proof of the speaker's account. |
| Demand | Prompt finite assessment; continuing monitoring only while a supported unresolved concern or chosen investigation warrants it. |
| Choice | Actual alternatives remain open. A prepared assessment may activate; movement toward the gate requires accepted action and a supported destination. |

Smoke plus fleeing people and a machine noise plus visible damage use the same composition forms with different supplied observations and permitted conclusions.

### D. Attend to the useful stage of my current work

| Field | Meaning |
| --- | --- |
| Active owner | A supported current task with an actually exposed process state or result. |
| Input | The workpiece enters a declared useful/dangerous state, or an admitted result becomes available. |
| Urgency | Comes from that process's actual response window and consequence; no window means no invented timing pressure. |
| Demand | Maintain useful observation or notify once, as chosen. |
| Outcome | The actual action determines success, interruption, quality, resource consumption and resumption. Attention creates none of those effects. |

Ordinary making remains useful without a concentration minigame. The initial clay and fishing designs do not acquire overheating or bite-response failures through this example.

### E. Briefly examine something unfamiliar or personally useful

The world's optional discovery policy offers finite examination of a newly acquired description or phenomenon. An actual interest may strengthen it. No named profession/object list is required to give an unfamiliar invention a chance to be noticed. Examination does not grant a recipe, reward, friendship or repeated free reflection.

### F. A different sense and mind

A vibration-sensitive creature detects a supported surface disturbance near its occupied shelter. Its installed policy can briefly examine or retreat using its actual sensory and movement capabilities. The same occurrence, concern, priority and lifecycle concepts apply without visual appearance, understood speech, human fear, a private biography or a model call.

## 7. Authoring, unsupported requests and changing definitions

The creator receives a clear account of what will be watched, which evidence is required, the response the rule may request, its lifespan and material scope restrictions. Diagnostics may show priority/reasons to the authorized creator; ordinary players do not receive NPC private concerns or raw scores.

If a requested behavior exceeds supported observations or composition:

1. Explain exactly what cannot be monitored or concluded.
2. Preserve the previous installed behavior.
3. Offer a supported narrower request, or keep the richer sentence as a goal/interpretation for later thought.
4. Require acceptance before substituting a narrower behavior. Never claim the original continuous monitoring is active.

“Add it without Rust” means an author can configure or compose capabilities the game already exposes. It does not mean inventing evidence or executable effects with prose. If a container has no perceptible lid or opener, the attention definition cannot manufacture them. The container/sense owner must first provide that capability. The same boundary applies regardless of the language used to implement the engine.

A definition change must state whether existing active work retains its admitted terms or is explicitly replaced/cancelled. Historical observations retain their original meaning. Future bindings use the new supported definition. Existing true state is handled using the initial-state policy, not replayed as an occurrence.

Save/load, reconnect and rebuilding available authoring choices do not renew a definition, watch, clear interval or response opportunity. Ending a definition removes future monitoring authority; actual committed action outcomes and personal history remain with their respective owners.

## 8. Expressiveness and cost requirements

There is no fixed maximum number of named world content definitions imposed by this feature. Supported installation and resource capacity remain finite. Adding unrelated definitions must add zero per-definition tests to an unrelated received change, including when those definitions share a broad family such as movement or container state.

The first supported authoring envelope is explicit in [PA-L02 and PA-L03](../../limits/perception-and-attention.md). It permits useful combinations while preventing unrestricted history searches, unbounded “anything anywhere” monitoring or recursively self-triggering interpretation. Those bounds apply to supported continuous authoring, not to how many things exist or how many people may legitimately witness an occurrence.

A request with too broad a continuously active condition must be rejected or narrowed before acceptance. Do not silently fall back to evaluating every installed definition, asking a model about each observation, or promising coverage that will later be dropped.

Many genuinely affected watches or recipients can require proportionate work. Sharing a computation never merges their knowledge or erases their independent obligations. Optional incomplete analysis stays unknown, while required physical effects and permitted personal evidence retain their separate guarantees.

## Maintained records

[Feature scope](README.md) · [Behavior](behavior.md) · [Scenarios and acceptance](scenarios-and-acceptance.md) · [Implementation](../../maintainers/events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance) · [Limits](../../limits/perception-and-attention.md) · [Technical counterpart](../../projects/perception-and-attention-tech-design.md)
