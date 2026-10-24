# Emotional physiology and adaptive reappraisal — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Integrated design is complete; EP01–EP09 implementation and qualification remain open, with SA-D01 explicitly unapproved. | 2026-10-24 |

## Purpose and scope

People and creatures should respond to useful activity, danger, companionship, recovery and remembered loss. A person can flinch, remain afraid and still defend someone; a rescued companion can enjoy coming home while grieving; a hare can startle and escape without memory or AI. These are design targets, not qualified gameplay.

This general emotion system supplies specialist SAD-D's product contract under the binding [stealth feature](stealth-awareness-feature-spec.md) and [technical contracts](stealth-awareness-tech-design.md#emotions-and-reconsideration). It extends existing private appraisals and reuses [continuing lives](continuing-lives-tech-design.md), [combat/threat response](combat-and-threat-responses-tech-design.md) and cognition. It adds no parallel mind, action selector, mood store or work queue.

The inspected base is Macrofold/OpenLegend `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e` on `codex/design-stealth-00-contracts`. The [technical design](emotional-physiology-tech-design.md) owns schemas, algorithms, ordering and lifecycle; [base psychological reactions](../worlds/base/psychological-reactions.md) owns vocabulary and tuning. This document owns experience and observable acceptance. Implementation, model quality, capacity and enjoyment remain unqualified.

### Navigation

- [The experience worth building](#the-experience-worth-building)
- [Three meanings with three owners](#three-meanings-with-three-owners)
- [Fear, joy, grief and anger](#fear-joy-grief-and-anger)
- [People and bodies can differ](#people-and-bodies-can-differ)
- [Emotional review during ordinary life](#emotional-review-during-ordinary-life)
- [Knowledge, privacy and continuity](#knowledge-privacy-and-continuity)
- [Directly controlled characters: SA-D01](#directly-controlled-characters-sa-d01)
- [Six complete experience scenarios](#six-complete-experience-scenarios)
- [Repertoire coverage and ownership](#repertoire-coverage-and-ownership)
- [Acceptance and delivery](#acceptance-and-delivery)

## The experience worth building

A dangerous expedition, useful invention and return to ordinary life should belong to the same remembered world. People can interpret the day differently, keep doing useful things while feelings change, and later invite company, refuse another expedition or remember a particular joke. These continuations give player choices meaning beyond immediate task completion.

The [gameplay priorities](../repertoires/gameplay-priorities.md) remain authoritative: an understandable survival start, useful making, a defensible camp, differentiated people, cooperation and refusal, local danger, invention, exploration and remembered consequences. Emotion should make that loop more worthwhile without becoming another management burden.

### Selected payoffs

| Payoff | Playable contribution |
| --- | --- |
| Courage becomes legible | Someone can take a meaningful risk while afraid; composure and willingness to help remain independent. |
| Practical care matters | Cover, an open route, food or a watch handoff changes real circumstances and may support reassessment without guaranteeing a cure. |
| A shared day has several meanings | Participants retain their own evidence, values and interpretations. |
| Returning home has a payoff | Joy, relief and unresolved concerns can coexist during cooking, repair, conversation or rest. |
| Sensitivity can be enjoyable | Beauty, welcome, anticipation, music and chosen frightening entertainment can matter more to particular people. |
| Success remains successful | A defeated threat or solved burden need not be replaced with fresh danger, obligatory grief or emotional chores. |
| Familiar activities remain worthwhile | Mastery, expression, company and association can sustain enjoyment without constant novelty, stat rewards or endless relationship progression. |

### Player burden and tradeoffs

A frightened companion need not demand repeated reassurance; someone grieving may welcome company, decline it or enjoy an ordinary evening. Quiet feelings need no public monologue or dashboard of declining needs. Player feedback explains authorized bodily/mechanical consequences without revealing hidden people or claiming the human feels afraid.

The transparent maximum rule deliberately omits cumulative stress: many small causes do not arithmetically overwhelm one serious concern. Their separate meanings remain available. Joy and grief have worthwhile consequences without a general combat bonus or penalty.

### Foundation and delivery scope

Existing appraisals already supply exact sources, identities, stacking, qualitative/scaled values and varied lifetimes. Existing cognition owns preparation, accounting and publication. This design adds native bodily contributions, complete effective mechanics and independent bounded review through those owners.

World definitions select emotion vocabulary and policy; prose grants no mechanics. Cooking, music, rescue, rituals, housing and other example activities require their own admitted capabilities. Broad needs simulation, automatic personality development, unusual affect laws and complete animal ecology retain their separate scope. Qualification must use actually available activities and identify missing supporting work.

## Three meanings with three owners

| Meaning | Authoritative owner | Contract |
| --- | --- | --- |
| Native bodily reaction | Existing body/status/state-contribution owners | An exact committed cause can produce a short reaction on an applicable body, modified by installed physiology, conditions or mechanical traits. No AI or episodic memory is required. A model's declaration of calm cannot erase or extend it. |
| Interpreted emotion | Existing private appraisal owner | The character interprets permitted experience, memories, values and beliefs under an installed definition. Cause, sources, meaning, value and lifetime remain explicit. Another person's intent or performance cannot set it. |
| Effective mechanical state | Read-only effect/parameter composition | Supported consumers derive effects from the complete applicable bodily/appraised contributions. There is no independently writable global emotion or consumer-specific competing aggregate. |

One attack may support both bodily startle and later interpreted fear. The maximum composition rule avoids additive double counting. A body can react without an interpreter, and an interpreter can feel fear without a mammalian startle response.

### Native onset and bodily recovery

The surprise producer determines whether exact evidence and pre-contact circumstances satisfy the [shock contract](emotional-physiology-tech-design.md#ep-c05--native-bodily-reaction-admission-and-receipts). Failed defence, rear angle or the attacker's intention alone does not qualify. Admission binds the original cause and affected life; contact, guard, injury and occurrence wrappers cannot repeat onset.

Shock caused by an impact begins after that impact's defence/damage outcome and can affect later eligible checks. Injury, discomfort, impaired limbs and action commitments retain their separate effects. Installed composure may change a compatible body's reaction without revealing threats, choosing an action, erasing pain or settling private fear. The selected effect does not paralyse, turn or send the character fleeing; a future involuntary motor effect needs its own supported capability.

### Effective fear

Initial effective fear is **the strongest applicable contribution**, normalized under one installed channel. The [world policy](../worlds/base/psychological-reactions.md) and [technical query/parameter contract](emotional-physiology-tech-design.md#ep-c06--complete-effective-fear-and-parameter-resolution) own its calculation and coefficients.

Bodily, targetless and independently directed concerns retain their identities. Escaping one pursuer does not resolve another concern. The base projection includes all mapped active fear applicable to the body/control policy; a target label does not confine the penalty to attacking that target. No hidden distance or optional language-context filter decides mechanical relevance. Persistent fear may remain high after startle ends; native startle need not imply a private fear interpretation.

Fear affects supported accuracy and evasive effectiveness. **It does not automatically lower running or fleeing speed.** Preview, offered choices and admission use the same maximum new evasion distance; an excessive endpoint is refused before cost, not shortened. A legal admitted evasion keeps its endpoint, path and duration through later fear changes, without an extra dodge roll. Ordinary movement keeps its body, route, load, injury and action rules.

Mechanical reads require every applicable contribution. An incomplete read is unavailable, not zero fear; impact cannot wait for paid interpretation. Native curves change continuously. Thresholds may make review eligible under bounded policy, but are neither external causes nor mandatory calls.

### Time that players can understand

Author player-facing durations in **normal-play seconds**. Three seconds means three wall seconds at 1×, one at 3× and 0.375 at 8×. The shared simulation clock owns converted progress and expiry; speed is never applied twice.

Pause freezes progress. Saving halfway and reopening retains the remaining half without onset replay, offline recovery or catch-up reviews. Provider wall time cannot set lifetime. Exact appraisal rates and conversions belong to [base psychological reactions](../worlds/base/psychological-reactions.md).

## Fear, joy, grief and anger

World definitions select vocabulary, causes, representations, lifetimes, review permission and any mechanical mapping. These are authored fictional laws, not diagnoses or universal psychology. Omitted definitions grant no fallback emotion.

| Emotion | Meaning and representation | Consequence |
| --- | --- | --- |
| Fear | Personally understood harm, vulnerability, danger, uncertain escape or valued loss; source-linked scaled base appraisals with explicit direction/target rules | Declared accuracy/evasion effects can coexist with courage, useful work or full supported running speed. Other worlds may select supported lifetimes. |
| Joy | Welcome company, useful success, beauty, performance or ordinary enjoyment; source-linked positive appraisal with its own scale and lifetime | Can inform later interest, attention and chosen company. It grants no combat power, consent, loyalty, need fulfilment or compulsory expression. |
| Grief | Continuing meaning of a personally understood loss; existing persistent qualitative, cause-stacked representation | May coexist with happiness and useful work. No universal sadness meter, recovery deadline, direct combat penalty or periodic model duty. |
| Anger | A perceived wrong, obstruction, provocation or disregard; existing independently interpreted appraisal with its own source and lifetime | May inform demands or methods without compelling aggression. Resolution does not certify forgiveness, trust or repair. |

The [installed definitions](../../packages/domain/src/worlds/base/appraisals.ts) already distinguish experience-linked `wilderness:grief` from `wilderness:authored-grief`. Source-linked grief permits perceived/remembered causes and reflection creation, but not ordinary decision creation. Its selected independent review permission applies only to existing lawful records. Authored grief remains authored-only, with decision/reflection and AI review disabled. Exact installation/pin rules remain in the [world policy](../worlds/base/psychological-reactions.md) and technical design.

### Coexisting meanings

Relief, fear of pursuit and grief can coexist after a rescue; joy and worry can coexist after an apprentice's success. Admiring an enemy need not end opposition. Joy does not subtract from fear or grief, and laughter does not establish indifference.

Keep existing stacking semantics: a distinct eligible occurrence can create a new appraisal and supersede the prior target-stacked interpretation with history intact; reassessment revises the supplied existing record. Aliases and question ordering cannot create copies or competing writes.

### Native continuation and psychological change

Bodily recovery needs no psychological conclusion. Decaying appraisals follow authored curves; persistent and condition-dependent appraisals retain their own ending rules. Reaching zero ends that contribution without proving safety, courage, forgetting or encounter completion. A temporary feeling cannot silently become persistent.

Acquired evidence that an exit works, credible refuge, bodily recovery or changed understanding can support reassessment without guaranteeing its answer. Food may remove strain while an insult remains meaningful; objective safety may be unknown or distrusted. Grief may remain relevant without current attention, a new cause, a mandatory unhappy response or a scheduled mourning stage. Mere relevance changes no creation/review permission.

### Needs and development

The [needs catalogue](../repertoires/needs.md) owns desired conditions; [character design](compelling-characters-feature-spec.md) distinguishes body signals, appraisal, values, intention, plan, action and outcome. Food, protection, privacy and company can be available or fulfilled without prescribing their personal meaning. A meal need not satisfy every attachment, and a funeral can finish while grief continues.

Experience may inform confidence, interests or self-understanding through existing memory, belief and character authorship. Automatic trait progression, permanent personality development and broad needs simulation remain separate. Neither an emotion dashboard nor hidden optimization target is required. Repeated fear is not courage training, and harm need not impose growth or a moral lesson.

## People and bodies can differ

Personality should explain a particular person without scripting decisions. Follow [character authorship](compelling-characters-feature-spec.md), [agent agency](../agent-agency.md) and the [traits catalogue](../repertoires/traits.md); contextual tendencies, interests and values do not require global brave/cowardly/angry/cheerful types.

| Dimension | Useful variation and boundary |
| --- | --- |
| Bodily composure | Installed body/trait rules can alter native magnitude, recovery or supported effects; they cannot improve perception, settle fear or choose risk. |
| Courage and risk willingness | Values, beliefs, stakes and capabilities can make one risk worthwhile and another pointless. Shaking, strength and obedience are different. |
| Appraisal sensitivity | Beauty, welcome, pain, injustice or embarrassment may matter differently; sensitivity grants neither sensory acuity nor a uniformly negative outlook. |
| Temperament and persistence | Quick irritation, slow recovery, enthusiasm or restraint can inform interpretation; prose installs no multiplier, forced action or infinite lifetime. |
| Expression | Native cues and chosen presentation can be open, restrained, practised or misleading; they prove neither feeling nor consent. |
| Coping | Work, walking, company, privacy, humour, music or repair can supply experience. Actual outcomes matter; no activity guarantees relief or becomes universally optimal. |
| Development | Authorized changes to beliefs, tastes and self-understanding use their existing owners; this module awards no personality XP and requires no trauma. |

A calm voice can belong to someone afraid; quiet and demonstrative friends can feel equal joy. Someone may tolerate injury but fear dependence, prepare carefully for danger but dislike ceremonial attention, or enjoy fictional fright while refusing real risk. Familiar company, imperfect music, beautiful weather and satisfaction with a modest life offer positive specificity without a hidden wound.

### Native memoryless animals

A compatible animal can startle without language, episodic memory or a model. Its existing controller still owns orientation, avoidance, pursuit, escape and route choices. A hare's actual speed and routes enable native flight; startle ending does not end that choice, and fear does not slow running. Sensing, approaching, ranged hunting, burrowing, injury and locomotion retain their separate capabilities; no reflex identifies an unseen attacker.

A horse's reactions remain distinct from rider control, handling, space, rest, water and pain. Soothing intent cannot erase a condition or assign private calm; familiarity and learned handling matter only through supported capabilities.

### Synthetic and unfamiliar bodies

A synthetic character may lack mammalian startle while privately interpreting fear, joy or loss. Any synthetic reflex needs its own installed rule. A fan responding to exertion is bodily evidence, not a reliable anxiety display; a coloured mantle can combine native and deliberate signals without exposing private values.

Body shape, species, culture, controller and disposition remain separate. Horns do not imply anger, prey morphology does not imply cowardice, and composure does not establish superior character.

## Emotional review during ordinary life

**Emotional review is independently selectable.** It reconsiders supported feelings while the character continues walking, working, resting or waiting, without requiring a thought, speech, goal, plan revision or physical action. Requiring reflection to narrate the change would not satisfy this contract.

The [operation contract](emotional-physiology-tech-design.md#ep-c08--independently-selectable-emotional-review) reuses existing permitted snapshots/evidence, model accounting, budgets and publication. Its output changes only authorized emotion records; saying “I feel safer” is neither an admitted change nor chosen speech.

### A useful end-to-end flow

| Step | Required behavior |
| --- | --- |
| Experience | Native reactions proceed without AI; an eligible interpreter may appraise its own permitted evidence. |
| Continue | Existing work, goals and invitations keep their owners while feelings persist. |
| Become eligible | Material evidence, bodily/context change or an authored finite recovery/threshold opportunity can justify review, without determining its answer. |
| Admit and consider | Existing cognition can batch compatible feelings or reuse an already admitted request. The model chooses only supported outcomes for supplied feelings. |
| Publish and continue | Current authority and exact dependencies admit valid components; subsequent cognition/mechanics consume the accepted result. Delay or failure invents no emotion or action. |

### Eligibility without a maintenance loop

World policy selects supported triggers, adaptive intervals, urgency, spacing, hysteresis and bounded batching. Intense episodes may qualify sooner; important events, known safety, escape, separation, bodily changes and new evidence can matter. These are personally available changes or subscribed native boundaries, not an omniscient actor scan.

Quiet joy/grief needs no periodic work, and an omitted review policy enrolls nothing. Existing cognition limits apply to complete mandatory context, request size, budget and capacity. Overflow remains explicit; no required evidence is silently dropped and no separate queue, per-tick paid check or unbounded retry is created.

A threat's existing appraisal stage can include compatible due reviews without a third required call. Standalone review acknowledges only its emotional opportunity, leaving unanswered invitations, questions and threats available to their ordinary decision owner.

### Legitimate reassessment of the same cause

Ordinary same-cause reframe still cannot change a decaying value or restart its lifetime. The distinct reassessment operation preserves appraisal identity, original cause/source, family, target/stack and lifetime authority. Within the fixed original-cause horizon, a changed understanding may increase or reduce current intensity without inventing another attack. An unchanged answer renews nothing.

A real new occurrence uses existing creation/stacking semantics; escape or received testimony may provide additional exact support. A recall, paraphrase, renamed threat, request ID or self-authored notification is not a new external cause. Persistent feelings persist by explicit world definition, not repeated renewal of a temporary one.

### Anti-loop and no-change behavior

Each admitted support set has finite work; submitted failures and uncertain attempts count. A model cannot change its allowance or urgency. Review results, their receipts, derived notifications and subsequent reuse cannot purchase another review; a later real assault or independent evidence remains eligible.

Retain preserves emotional meaning, value, sources, lifetime and creation time without a new occurrence or spoken justification. Unknown and incomplete evidence are distinct outcomes. Under the selected base policy, retain, uncertainty or submitted failure makes unchanged support dormant immediately. Only accepted meaningful change can earn the next allowed timed follow-up. Expected recovery, decay crossings and timers cannot awaken that dormant support.

After exhaustion, native lifetime continues. Independently material evidence may permit another bounded support set without extending a decaying feeling's original horizon. Time, aliases and self-notifications never replenish it.

### Delay, failure and cancellation

Native curves continue while requests are delayed, unaffordable, unavailable, malformed or refused. A late proposed value ages from its captured assessment time; callback arrival cannot restore its earlier amount. Exact life, control, source and relevant changes fence publication. Paid attempts retain their actual accounting even when refused.

Valid independent components can succeed when another is stale. A later action-stage failure does not erase an accepted feeling, and failed review does not consume unrelated work. Pause, load and recovery preserve remaining lifetime and allowance without catch-up calls.

## Knowledge, privacy and continuity

### Current relevance is personal

Personally experienced circumstances, memory, beliefs and body context constrain interpretation. A clear exit may be unknown; unheard reassurance is unavailable; a remembered route may have uncertain current safety. Observation, testimony, inference and recollection remain distinguishable. Intense fear does not prove a threat exists, and anger does not validate an accusation.

Several exact sources can support one current meaning: the original attack, reached cover, a nearby ally and uncertain pursuit. Preparation cannot invent a combined event or borrow another observer's hidden knowledge. Cognitive relevance does not delete a durable concern or remove mapped active fear from the complete mechanical query; required relevant context cannot be replaced by a convenient display page.

### No mind reading or cross-character emotional writes

Attack, retreat, smile, laughter, silence and accepting help prove neither private feeling nor consent. Comfort, persuasion, intimidation, deception and performance operate through supported actions and actual received evidence. Recipients interpret independently; the initiator's intention cannot write their emotions.

A model may propose changes only for its authorized character and supplied exact evidence. Privacy applies to prompts, receipts, logs and inspection as well as prose. A visible mechanical consequence exposes no private amount or source. Magical/technological affect requires a separately admitted capability with exact authority, observability and lifecycle; a “fear spell” or “soothing voice” description grants none.

### Action choices preserve emotional continuity

Continuing work does not resolve feeling, attacking does not create anger, and defeating a threat does not forgive its source. Coping produces an actual experience—food, rest, a crossed barrier or an answer—that may support later interpretation without choosing it.

Review can change a feeling while the same goal and action continue. The ordinary decision owner may later use that feeling as context; review itself cannot choose a new action.

### Persistence, correction and forgetting

[Technical lifecycle](emotional-physiology-tech-design.md#ep-c09--persistence-recovery-and-correction) retains appraisals, permitted provenance, lifetime progress, review disposition and durable outcomes. Load continues them without replaying attacks, renewing joy, clearing grief or granting new review work.

Existing correction/forgetting rules still govern invalidation and disclosure. Erased evidence cannot be reconstructed from hidden history, and lost detail is not a new cause. New testimony can change current meaning without rewriting actual past experience or informing people who never received it. Retained exact definitions cannot be silently relabelled or reinterpreted, even after active feelings end.

### Presentation and observability

Use familiar language for authorized bodily effects and useful choices, without requiring an emotion dashboard. Others receive actual outward cues, which may communicate, conceal or misrepresent feeling.

Unconscious review needs no animation, thought bubble, speech turn or public action entry. Authorized inspection may expose its support and lifetime; operational failures remain diagnostics, not fictional thoughts. Player comprehension, native correctness, model quality, cost and enjoyment require separate evidence. Fluent narration proves none of them.

## Directly controlled characters: SA-D01

**Unresolved; requires Mike's product decision.** [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) covers interpreted-emotion creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control-transfer behavior during direct human control; the same authority question applies to fear and other interpreted feelings. No option is adopted here.

Native bodily startle and physical conditions apply equally to controlled and autonomous characters. A background model must not silently decide the human player's subjective fear, joy, anger, grief, desire or roleplay.

### Alternatives and recommended initial choice

| Alternative | Conditional product and tradeoff |
| --- | --- |
| A. Native body only during direct control | Native effects apply; autonomous interpreted-emotion creation/review is disabled and appraised-emotion mechanics are masked. This preserves subjective freedom with little extra interface/model burden, but player/NPC interpretation differs and retained-state transitions need truthful feedback. It supplies no persistent interpreted player fear. |
| B. Deterministic authored interpretation | Explicit native world rules create/reassess selected emotions from the character's own admitted evidence through existing appraisal authority. This supplies predictable persistent player mechanics without paid interpretation, but imposes a fictional condition that must be explained. Exact rules cannot be replaced by a label or freeform personality inference. |
| C. Explicitly opted-in model interpretation | The active player grants bounded interpretation for named families/consequences, using the same source, budget, lifetime and publication rules. This supports contextual roleplay, with explicit private-context consent, cost/uncertainty, revocation and transfer requirements. Movement, dialogue or unrelated AI assistance is not opt-in. |

**Recommend A initially**, pending approval. If persistent interpreted fear is selected for ordinary player mechanics, **prefer B over silent autonomous model appraisal**. C is an explicit alternative, not a fallback for a missing native rule. Choosing fear does not authorize joy, grief, anger or a needs simulation; selected families, consequences and grants must be explicit. Fictional conditions are not claims about the real human's psychology.

### Control transfer and retained state

Transfer invalidates private operations with stale actor/control authority. Same-life native bodily effects continue without erasing injury, replaying shock or altering completed outcomes.

Under conditional A, preceding NPC appraisals retain identity, provenance, history and native lifetime, while their emotional mechanics are masked and autonomous review stops. Authorized inspection may identify them as preceding appraisals, not new human-selected feelings. Masking/unmasking may immediately change effective fear and requires truthful visible feedback; it does not resolve, renew, recreate or extend the records.

On return to autonomy, surviving records apply at their naturally progressed values; ended records stay ended. Only a policy-permitted materially supported current opportunity can justify review. Transfers grant no fresh allowance or extended horizon, and repeated control toggling cannot buy indefinite reassessment.

Under B, declare the permitted native producer/families and how compatible retained appraisals apply without recasting their meaning or lifetime. Under C, consent belongs to the active controller and does not transfer automatically. Loss/revocation refuses pending publication; the selected post-revocation policy determines mechanical projection while preserving record integrity.

### Implementation gate

The decision must settle producer authority, families, mechanical application, human authorship, display, revocation and transfer together. Player interpretation remains blocked or available only under an explicitly selected authorized policy; omitted policy, prompts, fallback and restoration adopt no option.

Native body mechanics, autonomous interpretations, animals, maximum fear composition, time rules and bounded review can proceed independently. SA-D01 does not reopen those contracts.

## Six complete experience scenarios

These scenarios specify observable target behavior. Their physical and social activities must use actually admitted capabilities in the selected world. They are design acceptance material, not evidence that every illustrated capability or model response is implemented.

Unless an approved SA-D01 profile is explicitly under evaluation, interpreted emotions in these scenarios belong to eligible autonomous characters. Grief is an already lawfully admitted record: experience-linked grief uses the supported reflection path, and authored grief uses its authorized authoring path. Independent review revises only an existing definition-permitted record; it does not create grief or modify authored-grief. Descriptions such as relief, worry and exclusion express personal meaning without installing an additional emotion definition or producer.

### 1. Bring someone home while still afraid

An unexpected attack admits a startle on a rescuer's compatible body. The short bodily contribution begins natively at the correct boundary. A permitted interpretation may follow through the existing threat/appraisal path. The rescuer's values can make helping worthwhile even while their private fear remains high.

The player makes a real escape more useful: opens a gate, clears a route, provides cover or uses another admitted protective capability. Those actions change physical circumstances. The rescuer can defend, protect, create distance or escape through the existing choice and execution owners. Fear does not take away running speed or issue an action.

After separation, startle ends natively. Appraised fear of pursuit may remain. Personally available safety and bodily recovery can make a bounded review eligible while the rescuer continues walking or helping. One concern can lessen while fear of another pursuer remains. Delayed or unavailable model work does not stop native escape or invent calm.

The satisfying outcome is actual successful help, made more particular by the person choosing it despite concern. It does not require a bravery label, a zero-fear threshold or a permanent personality reward.

Repertoire anchors: [PB-181/182/188](../repertoires/psychology-behavior.md), [TR-142/143/155](../repertoires/traits.md), [ND-025/028](../repertoires/needs.md), [CR-082/258](../repertoires/combat-rescue.md).

### 2. The first meal after a real victory

The group returns to a defensible place with a useful reward. One person is joyful that a companion survived, another remains afraid after the escape, and someone grieves a loss. Actual food and unfinished work remain. The cook has an ordinary useful task, not a duty to repair every person's emotion.

The player can help cook, rest, repair something, invite company or give someone space using the available activities. Recipients interpret an actual invitation individually. Fear may decline during preparation through native progress or an eligible same-cause review. A character does not need to produce a thought or select a different goal for that private change.

The meal can be honestly pleasant while grief remains. A favourite bad song or familiar joke can matter because of the performer and occasion. Completing the meal gives no universal combat bonus and need not resolve every disagreement.

The place becomes worth returning to through particular shared experience. The local threat may remain defeated. Later play can come from exploration, a chosen project, mastery, friendship, rivalry or another useful invention without manufacturing a new disaster.

Repertoire anchors: [PB-092/176/199/202/213](../repertoires/psychology-behavior.md), [ND-195/264](../repertoires/needs.md), [RSH-339/342](../repertoires/relationships.md), [CB-202/282](../repertoires/characters-backstories.md), [ARL284](../repertoires/arts-leisure.md), [AD-226/227/235](../repertoires/adventure-discovery.md), [the household after victory](../repertoires/combinations.md).

### 3. A surprise celebration with several honest outcomes

A friend has concealed a celebration. Before the reveal, another character felt excluded. The reveal supplies new personally acquired evidence, and sudden noise may separately startle an applicable body. The old exclusion concern and the new celebration occurrence remain distinguishable.

The recipient might feel delighted, remain irritated about the deception, feel both or prefer a quieter gathering. The organizer's good intention cannot choose the result. A restrained response is not proof of unhappiness, and a smile does not prove trust has recovered.

The organizer can acquire actual words and outward cues. Learning a preference may make the next invitation more suitable without scripting gratitude or raising an approval score. A review can revise the earlier interpretation from supported evidence while preserving the old evening and other people's knowledge.

This scenario exercises native/appraised separation, several sources, privacy, source-specific correction and joy that has no required combat mechanic.

Repertoire anchors: [RSH-166](../repertoires/relationships.md), [PB-024/027/028](../repertoires/psychology-behavior.md), [ND-170](../repertoires/needs.md), [TR-005/011](../repertoires/traits.md).

### 4. Choosing to enjoy being frightened

An easily startled person chooses a horror story or performance with a friend. Honest descriptions and actual cues establish what is offered, and supported ordinary actions allow leaving or stopping. Startle, fear, excitement and enjoyment are distinct contributions and interpretations.

A bodily jump does not prove a wish to leave. Expressed enthusiasm does not prove absence of fear. The performer's intention does not certify harmlessness; an actual injury or threat keeps its physical effects and provenance even in a scene described as staged.

The pleasure may come from company, atmosphere, surprise, anticipation or knowing the storyteller. Sensitivity can therefore be valuable to an experience rather than a universally inferior trait. There is no automatic fear-resistance XP or reward for enduring unwanted distress.

This does not add a horror-production capability to the module. A qualification scene must use an actually supported performance or experience and preserve recipient agency.

Repertoire anchors: [RSH-303](../repertoires/relationships.md), [PB-195/238/267](../repertoires/psychology-behavior.md), [ARL196/200](../repertoires/arts-leisure.md), [TR-008/011/156](../repertoires/traits.md), [ACR-095](../repertoires/automation-creators.md).

### 5. The returned traveller and the memorial

A character believed a traveller dead and grieved on that basis. The traveller appears with enough personally received evidence to support correction. The current belief can change while the previous experience remains historically real.

The independent-review variant uses an existing experience-linked wilderness:grief record with the selected separate review permission. An authored-grief record remains outside AI review, even when the new evidence is compelling.

Joy, embarrassment about a memorial, irritation at poor communication and remaining concern can coexist. The review cannot rewrite the past, make an uncertain identity certain or give the correction to recipients who never acquired it. Actual commitments and other people's memories retain their owners.

A meaningful continuation could be an ordinary meal, a question, a chosen celebration or reluctance to trust another unexplained absence. No one response is scripted, and the scene need not force a full reconciliation.

This demonstrates why legitimate source-linked reassessment matters beyond combat: changing what an event means can produce play without creating a new fictional cause for the original feeling.

Repertoire anchors: [PB-043/272](../repertoires/psychology-behavior.md), [CB-220](../repertoires/characters-backstories.md), [HMY242/270](../repertoires/history-myth.md), [RSH-351](../repertoires/relationships.md).

### 6. Two bodies, neither a stereotype

A hare acquires an admitted sudden danger cue that also qualifies for its existing native response episode. Native physiology produces the supported reaction while the existing animal controller uses actual routes and its fast body to escape. A harmless abrupt cue can instead startle without requiring flight. There is no compulsory model call or autobiographical interpretation. The animal remains useful to observation, hunting and ecology because the same real movement constraints apply.

A synthetic character may lack that bodily reflex while fearing damage or the loss of a companion through a supported private interpreter. A fan increasing under load provides only the declared bodily evidence. A highly composed human can recover from startle quickly and still care more about a feared consequence than a visibly jumpier companion.

The differences encourage observation, preparation and chosen companionship. Body, control, knowledge and personal values remain independent rather than being inferred from a species or personality label.

Repertoire anchors: [BSP-101/208/260](../repertoires/bodies-species.md), [TR-143/155](../repertoires/traits.md), [PB-256/320](../repertoires/psychology-behavior.md), [CB-225/289](../repertoires/characters-backstories.md), [planetary-scifi world profile](../repertoires/worlds/planetary-scifi.md).

## Repertoire coverage and ownership

The following map locates emotionally relevant repertoire possibilities with their existing owners. The selected foundation supports several kinds of character experience without turning every psychological example into required implementation.

The repertoires remain proposal catalogues. A selected baseline emotion capability can support core independent people without promoting every grief ritual, alien inner law, personality detail or psychological example to a current implementation requirement. The central [README](../repertoires/README.md), [coverage](../repertoires/coverage.md) and [gameplay-priorities](../repertoires/gameplay-priorities.md) locate the selected emotion foundation without promoting every related repertoire possibility.

### Repertoire responsibilities

| Repertoire file | Applicable coverage | Selected boundary or existing owner |
| --- | --- | --- |
| [README](../repertoires/README.md) | Catalogue map, ownership, classifications and evidence | Preserve stable IDs, priority semantics and proposal status; integration owns central reconciliation |
| [Design foundation](../repertoires/design-foundation.md) | Motives, independent purposes, danger, power, pleasure and world tone | Useful activity and distinct people remain the purpose; no compulsory benevolence, remorse or growth |
| [Gameplay priorities](../repertoires/gameplay-priorities.md) | Entire first-game, selection, replay-value and completion policy | Serve actual survival/making/danger/return; pleasures need no stat bonus and psychological administration is not a prerequisite |
| [Coverage](../repertoires/coverage.md) | Core/Complete slices, category scope and optional worlds | Distinguish selected baseline from broad psychology depth; final integration owns broad mapping |
| [Selection and scale](../repertoires/selection-and-scale.md) | First evening, rescue, threat defeated, return and complexity budgets | Choose a small worthwhile scene; due work and bounded operating attention remain essential |
| [Psychology and behavior](../repertoires/psychology-behavior.md) | PB-003/013/024/092/181/182/188/202/213/267/271/272/320 | Primary meaning/conduct examples: delayed fear, brave action, joy during grief, individual interpretation and lasting safety |
| [Needs](../repertoires/needs.md) | ND-025/028/061/098/170/175/186/195/264/284 | Actual desired conditions and private appraisal differ; no dashboard or mandatory emotional maintenance |
| [Traits](../repertoires/traits.md) | TR-002/005/006/008/013/143/150/155/163 | Composure, sensitivity, contextual risks, expression and coping are independent; prose grants no mechanics |
| [Characters and backstories](../repertoires/characters-backstories.md) | CB-001/032/052/076/089/202/216/225/282/289 | Biographies supply particular interests and context, including happy lives; no decision scripts or mandatory trauma |
| [Relationships](../repertoires/relationships.md) | RSH-123/166/195/196/229/303/339/342/353 | Each participant interprets independently; care, affection, gratitude, grief and loyalty do not become one approval score |
| [Bodies and species](../repertoires/bodies-species.md) | BSP-017/042/044/045/101/151/208/260 | Native exact-body reactions, memoryless animals and synthetic diversity; no physiology-to-personality shortcut |
| [Combat and rescue](../repertoires/combat-rescue.md) | CR-078/081/082/084/130/205/206/258/282 | Existing threat and action owners retain choices; no duplicate morale meter, automatic flight or grief penalty |
| [Abilities and progression](../repertoires/abilities-progression.md) | AP-023/077/101/106/114/245/263/270 | Handling, listening, intimidation and care remain bounded attempts; skill does not write private emotion |
| [Actions](../repertoires/actions.md) | MND-01/05/12, CARE-11, SOC-07, LAW-11 | Emotional review is independently eligible and does not require a deliberate action, speech or ceremony |
| [Mechanics](../repertoires/mechanics.md) | MEC-159/164/172/177/180/189/270; appraisal/capability families | Keep source-linked appraisal and real effect resolution; pleasure, attachment and rescue are not automatic numeric reciprocity |
| [Adventure and discovery](../repertoires/adventure-discovery.md) | AD-142/161/226/227/235/304 | Real return, rewards and reunions matter; a place need not heal and old companions need no compulsory new mission |
| [Arts and leisure](../repertoires/arts-leisure.md) | ARL046/177/192/196/200/208/236/250/284 | Chosen sadness, horror, imperfect performance and beauty can be worthwhile; audience feelings remain independent |
| [Faith and ritual](../repertoires/faith-ritual.md) | FTH028/055/065/071/075/159/171/212/248 | Finite ceremonies do not finish grief; joy, privacy and declining forgiveness remain possible |
| [Magic](../repertoires/magic.md) | MG-084/129/131/141/144/147/195/204/220 | Affect magic requires explicit admitted capabilities; chosen expression and forced smiling do not prove private feeling |
| [Unusual realities](../repertoires/unusual-realities.md) | UNR-069/086/123/130/200/238/244 | Emotional weather, shared sensation and consumable courage remain separately selected laws with exact authority |
| [Technology](../repertoires/technology.md) | TE-160/273/296 and experiential interfaces | Sensory technology supplies experience, not thought access, guaranteed pleasure or unrelated need fulfilment |
| [Languages and knowledge](../repertoires/languages-knowledge.md) | LKN013/054/079/132 | Solitude, tone, deliberate signals and corrections require bounded interpretation rather than private access |
| [History and myth](../repertoires/history-myth.md) | HMY056/079/086/144/158/182/206/224/242/270 | A shared history can mean different things; correction preserves actual past experience and alternate history is not current fact |
| [Diplomacy and conflict](../repertoires/diplomacy-conflict.md) | DIP-009/058/079/091/209/214/234/268/282 | Cooperation and pleasure can precede affection or settled grievances; fear does not impose consent |
| [Institutions and politics](../repertoires/institutions-politics.md) | INS-062/089/119/201/208/264/281/300 | Institutions establish circumstances, duties and permissions, not private truth or compulsory emotional participation |
| [Automation and creators](../repertoires/automation-creators.md) | ACR-008/019/069/076/095/104/112/146/222 | Creator intent does not install emotional effects; staged danger retains actual physical consequences |
| [Ecology and weather](../repertoires/ecology-weather.md) | ECW-016/099/172/204/205/235 | Weather, sensory cues and paths supply actual experience; native learning remains its own selected scope |
| [Economy and logistics](../repertoires/economy-logistics.md) | ECON-040/148/208; valuation terminology | Meals and sensory works need no emotion currency; economic appraisal keeps its separate meaning |
| [Materials and resources](../repertoires/materials-resources.md) | MAT-130/138/151/185 | Supported physical/sensory effects do not silently erase memory, grief or distrust |
| [Objects](../repertoires/objects.md) | ITEM-029/035/132/165/195/215 | Keepsakes, instruments and comfort objects have personal meanings, not guaranteed calm or happiness |
| [Settlements and architecture](../repertoires/settlements-architecture.md) | ARC-013/133/139/140/167/235/244 | Actual quiet, routes, access and known history can support review; places cannot read wishes or guarantee safety beliefs |
| [Work and crafting](../repertoires/work-crafting.md) | WORK-011/071/076/126/131/154/208 | Useful work and performance supply real outcomes while emotional continuity remains private |
| [Simulation experiments](../repertoires/simulation-experiments.md) | SIM-113/149/196/206 and experimental limits | Shared success and different senses do not imply universal happiness; design examples are not empirical findings |
| [Combinations](../repertoires/combinations.md) | All 25 situations contextually reviewed; especially wolf at gate, rehearsal, alien meal, changing allegiance, quarry and household after victory | Compose selected owners into complete scenes without selecting every surrounding system |
| [Source atlas](../repertoires/source-atlas.md) | Research provenance and attribution | Preserve thematic-source meaning; this design adds no bibliographic completion claim |
| [Group 3 reading progress](../repertoires/group-3-reading-progress.md) | Psychology, needs, traits, characters and relationships ledger | Retain existing research status; feature coverage is not a new complete source reread |
| [Group 6 reading progress](../repertoires/group-6-reading-progress.md) | Expanded world/culture/material ledger | Cross-references do not alter research completion |
| [Group 7 research progress](../repertoires/group-7-research-progress.md) | Later research and synthesis ledger | Preserve provenance; no provider experiment or empirical psychology claim |
| [Medieval survival](../repertoires/worlds/medieval-survival.md) | Threewater cast, routes, convoy, fair and rites | Particular motives and native danger serve survival; culture and ritual do not prescribe emotions |
| [Living fantasy](../repertoires/worlds/living-fantasy.md) | Borrowed Dawn cast, bounded magic, history and partial prophecy | Explicit local laws, present pleasure and uncertain knowledge coexist; no unselected affect magic |
| [Modern life](../repertoires/worlds/modern-life.md) | Linden Reach cast, flood history and varied good lives | Particular bonds and interests supply play without demographic temperament stereotypes |
| [Planetary science fiction](../repertoires/worlds/planetary-scifi.md) | Veyra Reach bodies/senses and Nemei mantle | Species, culture and individual identity differ; visible patterns remain bounded evidence |

### Exact focused catalogue entries

These 28 entries carry the focused selected emotion boundaries. Their useful surrounding examples, stable IDs, priorities, levels and source attributions remain with their canonical catalogues.

| Catalogue | Entry IDs | Required interpretation |
| --- | --- | --- |
| [Psychology and behavior](../repertoires/psychology-behavior.md) | PB-013, PB-024, PB-092, PB-181, PB-188, PB-202 | Bodily context can support same-cause change; simultaneous meanings, honest joy, independent fear directions, delayed review and grief during pleasure remain possible |
| [Needs](../repertoires/needs.md) | ND-028, ND-061, ND-186, ND-264 | Actual protection/refuge differs from calm; mourning needs no periodic maintenance; shared activity has individual meanings |
| [Traits](../repertoires/traits.md) | TR-002, TR-005, TR-013, TR-143, TR-150 | Recovery/intensification remains bounded and source-linked; expression, contextual risk willingness and actual coping results differ |
| [Characters and backstories](../repertoires/characters-backstories.md) | CB-052, CB-202, CB-282 | The same history supports distinct interpretations, good afternoons and different chosen coping activities |
| [Relationships](../repertoires/relationships.md) | RSH-166, RSH-196, RSH-303, RSH-339 | Surprise does not force trust; grief company and chosen horror preserve agency; rescue gratitude can coexist with loss |
| [Bodies and species](../repertoires/bodies-species.md) | BSP-101, BSP-208, BSP-260 | Horse control, synthetic fear and native hare startle/escape preserve separate body, interpretation and controller owners |
| [Combat and rescue](../repertoires/combat-rescue.md) | CR-082, CR-205, CR-258 | Existing willingness has no extra morale meter; mourning has no forced closure; a trusted helper matters through actual help |

The retained “same event, two appraisals” worked example in psychology supplies the complementary ordinary-life case: a host welcomes a visitor while a cook worries about supplies and can also welcome the company. Actual food arriving may support review of the worry while preparation continues. No single scene mood or forced preference is required.

## Acceptance and delivery

### Product acceptance cases

These are future acceptance requirements as design. They have not been executed. The [technical design](emotional-physiology-tech-design.md) owns the EP-C11 lower-level race, source, timing, capability, persistence and scheduling cases; the [maintainer tracker](../maintainers/emotional-physiology.md) owns implementation work and evidence.

Use the scenarios' same producer and permission preconditions: autonomous eligible interpreters, lawfully admitted existing grief and no authored-grief AI review. The two explicitly controlled-character rows remain conditional on an approved SA-D01 policy; they cannot be used to select one implicitly.

| Case | Observable required result |
| --- | --- |
| Same attack, different people | Compatible native reactions can differ by installed physiology; personally supported fear/anger/no-change can differ by context without granting unseen knowledge |
| Brave while afraid | Supported fear may affect accuracy/evasion while rescue, defence or escape remains chosen through existing owners at supported movement speed |
| Many small causes | Exact causes remain distinct and the declared effective fear query uses the strongest applicable contribution without an independently writable total |
| Two directed dangers | Escape from one source does not clear another; each retains its direction and cause while the selected body projection includes all mapped active fear without a hidden target-distance filter |
| Startle before model completion | Native onset/recovery and physical outcomes occur without waiting for AI; applicable later appraisal may keep fear high |
| Shock ordering | A shock caused by an impact affects later eligible checks, never its own already-determined defence; cause wrappers do not duplicate onset |
| Quiet change during work | Eligible emotional reassessment can occur while goal, action and ordinary pending conversation continue |
| Delayed fear from the same cause | A legitimate reassessment changes supported intensity within the original-cause envelope without inventing another external event |
| Stable/no-change feeling | Native lifetime and meaning remain intact; no fresh occurrence, recursive notification or perpetual paid review is created |
| Bounded intensity review | Intense episodes may receive earlier eligible attention under policy while quiet feelings can remain dormant and total work stays bounded |
| Joy during grief | Both meanings can persist while a real activity is enjoyed; no cancellation, compulsory cure, combat bonus or mandatory mourning timer |
| Same performance, different meanings | Recipients can delight, worry, grieve or remain indifferent from their own evidence; the performer cannot select their private result |
| Body recovery and an old insult | Improved bodily condition can support a different current interpretation without erasing the original words or proving disrespect absent |
| Actual helper arrival | Real acquired help, routes and safety can support review; a familiar identity alone grants no capability, knowledge or guaranteed calm |
| Uncertain outward expression | Observers receive only supported cues/words and normal uncertainty; attack, retreat, smile and silence do not certify feelings or consent |
| Failed, delayed or stale request | Existing native progress and lifetime continue; no fabricated calm/action, stale overwrite, swallowed ordinary opportunity or unbounded retry |
| Correction, forgetting and reopen | Current authority and evidence rules apply; no reconstructed private source, fresh allowance, revived terminal record or offline wall-time catch-up |
| Three-second normal-play example | Speed and pause preserve the authored duration meaning, and save/load resumes the same remaining native contribution |
| Native hare and synthetic character | Memoryless native reaction and existing animal escape need no AI; a synthetic interpreter can fear without an uninstalled mammalian reflex |
| Direct human control | Native effects apply; player interpreted production/projection follows an approved explicit policy and transfer invalidates stale private authority |
| Controlled-character transition under conditional A | Masking/unmasking has truthful visible mechanical feedback, preserves records and native time, and grants no free review epoch |
| Whole playable continuation | A complete supported danger-and-return scene is understandable and worth choosing without a mandatory emotion-management chore |

Native deterministic acceptance establishes actual state, ordering and effects. Bound provider fixtures establish request/admission behavior, not natural interpretation quality. Controlled live evidence must establish that different characters select coherent different meanings and can continue useful activity without scripted outcomes. Human play evidence must separately establish understandable controls, worthwhile choices and acceptable interruption/operating burden. None is substituted by fluent narration.

### Combat and sensing integration

Consume [EP-C05–EP-C07 and EP-C12](emotional-physiology-tech-design.md#ep-c12--implementation-responsibilities): exact shock cause/result and target life, body applicability, complete effective fear, parameter resolution, ordered timing and native animal support. The producer supplies committed evidence; it cannot assign private fear or duplicate onset through outcome wrappers. Newly caused shock affects later eligible checks, never its own impact.

Keep authored normal-play duration and unrestricted running speed. [EP-C06](emotional-physiology-tech-design.md#ep-c06--complete-effective-fear-and-parameter-resolution) owns the exact ranged integration and excludes the alternate target-danger heuristic from simultaneous generalized fear mapping; there is no unresolved stacking choice.

### Integration agent contract

The integrated world policy, implementation tasks and cognition/continuing-life/threat consumers preserve one private appraisal owner, one actor-work owner and one threat decision pipeline. New reassessment reuses exact sources, existing operations and durable authority.

A later action-stage failure must preserve accepted emotion; emotion-only completion must preserve unrelated work. Keep SA-D01 blocked or explicitly selected and authorized through control transfer and restore. The producer-independent foundation can proceed separately. Detailed consumer responsibilities belong to [EP-C12](emotional-physiology-tech-design.md#ep-c12--implementation-responsibilities).

### Maintained records and scope completion

- Product contract: this document and the binding [shared stealth feature](stealth-awareness-feature-spec.md).
- Schemas, flows, anti-loop rules, timing, revisions, persistence, capability and acceptance design: [emotional-physiology technical design](emotional-physiology-tech-design.md).
- Authored vocabulary, policy and tuning: [base psychological reactions](../worlds/base/psychological-reactions.md).
- Implementation TODOs and evidence: [emotional-physiology maintainer tracker](../maintainers/emotional-physiology.md), EP01 definitions, EP02 native reactions, EP03 mechanical integration, EP04 reassessment, EP05 independent review, EP06 profiles/personality/player gate, EP07 lifecycle/privacy, EP08 integration and EP09 qualification.
- Limits: [feelings inventory](../limits/feelings.md), [cognition](../limits/cognition.md), [memory](../limits/memory.md) and [AI execution](../limits/ai-execution.md).
- Related owners: [agent agency](../agent-agency.md), [compelling characters](compelling-characters-feature-spec.md), [continuing lives](continuing-lives-tech-design.md) and [combat/threat responses](combat-and-threat-responses-tech-design.md).
- Cross-specialist integration: [stealth-awareness tracker](../maintainers/stealth-awareness.md) and [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters).

The selected general-emotion design is complete; broader needs-design items retain their unrelated scope. The project remains In progress while implementation, executable/performance qualification and player evidence are outstanding. SA-D01 remains open until Mike selects the player interpretation policy.
