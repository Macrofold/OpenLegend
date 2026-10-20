# Emotional physiology and adaptive reappraisal — feature specification

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Detailed feature design is specified and pending final review; implementation has not started. | 2026-10-20 |

## Purpose and scope

People and creatures should respond to a lived world in ways that make useful activity, danger, companionship, recovery and remembered loss matter. A composed person can flinch, remain afraid and still defend someone. A rescued person can enjoy coming home while grieving a loss. A hare can startle and escape without language, autobiographical memory or a model request. These are target experiences, not claims of qualified current gameplay.

This is a general emotion-system design. It specifies specialist SAD-D's product contract under the binding [stealth-awareness feature specification](stealth-awareness-feature-spec.md) and [technical contracts](stealth-awareness-tech-design.md#emotions-and-reconsideration). It extends the existing private appraisal/social-continuity foundation and reuses the [continuing-lives](continuing-lives-tech-design.md) and [combat/threat-response](combat-and-threat-responses-tech-design.md) owners. It does not establish a parallel mind, action selector, global mood record or work queue.

The source-reviewed baseline is Macrofold/OpenLegend at exact pushed commit a3d40b4d71e29d6504e9f3fcc21e76344a0a284e on codex/design-stealth-00-contracts. This assignment is documentation only. Implementation, executable acceptance, provider quality, operational capacity and player enjoyment remain unqualified. The [technical design](emotional-physiology-tech-design.md) owns schemas, algorithms, ordering and authoritative lifecycle. [Base psychological reactions](../worlds/base/psychological-reactions.md) owns selected vocabulary, scales, coefficients, curves and review tuning. This feature document owns the promised experience, product boundaries and observable acceptance.

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
- [Acceptance and delivery handoff](#acceptance-and-delivery-handoff)

## The experience worth building

Open Legend can make a dangerous expedition, a useful invention and the return to ordinary life part of the same remembered world. Particular people can want different outcomes, interpret the same occurrence differently and keep doing useful things while their feelings change. A person worth protecting can later invite company, refuse another expedition, admire a practical solution or remember a particular joke. Those continuations give the player's choices meaning beyond completing the immediate task.

The [gameplay priorities](../repertoires/gameplay-priorities.md) remain the selection authority: an understandable survival start, useful making, a defensible camp, differentiated people, actual cooperation and refusal, local animal and human danger, useful invention, worthwhile exploration and remembered consequences. The emotion foundation must help complete that playable loop. Its value should be visible in an escape that works, a companion who acts for a personal reason, a good evening that feels earned, and a place the player voluntarily returns to.

### Selected payoffs

| Payoff | What makes it playable | What the emotion module contributes |
| --- | --- | --- |
| Courage becomes legible | Someone can undertake a meaningful risk with real capabilities while afraid | Fear can remain true without removing the existing choices; bodily composure and willingness to help are independent |
| Practical care matters | Opening a route, giving cover, sharing food or completing a watch handoff changes actual circumstances | Personally available safety, bodily recovery and help can support reassessment; useful work has an emotional consequence without becoming a guaranteed cure |
| Different people remember the same day differently | A shared expedition can be joyful, frightening, disappointing and worthwhile to different participants | Each person retains their own sources, values, meanings and private interpretation |
| Returning home has a payoff | The camp is safer, a useful reward is available and the group can choose an ordinary evening | Joy, relief and persistent concerns can coexist during cooking, repair, conversation or rest |
| Sensitivity can be enjoyable | Beauty, welcome, music, anticipation and chosen frightening entertainment can matter to particular people | Appraisal is broader than threat; sensitivity does not mean a universal disadvantage |
| Success can remain successful | A defeated threat stays defeated and a solved recurring burden frees attention | Emotional continuity does not manufacture fresh danger, obligatory grief or another maintenance task to keep the world moving |
| Familiar activities remain worthwhile | Mastery, execution, expression, company and remembered associations can change the meaning of a repeated activity | Enjoyment need not depend on constant novelty, a hidden stat reward or endless relationship progression |

These are opportunities created by composing selected existing owners. This module does not itself implement cooking, music, physical rescue, a new ritual system, housing, a complete animal ecology or every activity used in an example. A future implementation must use actually admitted capabilities in its qualification scene and label unavailable supporting activities as separate work.

### Player burden and tradeoffs

The player should be able to continue playing while a companion's feelings remain unresolved. A frightened person need not demand repeated reassurance. Someone grieving can welcome an invitation, decline it or enjoy ordinary company; the game need not assign the player a recovery checklist. Quiet feelings can remain meaningful without periodic model requests, public monologues or a dashboard of declining needs.

The selected maximum rule for mechanical fear is intentionally transparent. Several small causes do not automatically overpower one serious concern by arithmetic accumulation. This sacrifices a general cumulative-stress model, which is outside the selected scope. Direction, context and exact source identity still distinguish the concerns, and distinct new danger can support a new interpretation through the existing appraisal owner.

Numerical fear gives supported mechanical consumers a usable amount. It does not make joy, grief, affection or courage require the same scale or effect. Joy's payoff can be voluntary enjoyment and later interest. Grief's payoff can be meaningful continuity. Their absence of a general combat bonus or penalty is intentional.

Player feedback must explain an applicable bodily or selected mechanical condition without revealing hidden people, motives or feelings. A player can understand that a brief startle currently affects precision; that feedback need not name an unseen attacker or claim the human feels afraid. Any proposed player interpretation policy requires the explicit [SA-D01 decision](#directly-controlled-characters-sa-d01).

### Foundation and delivery scope

| Scope | Status and owner | This feature's obligation |
| --- | --- | --- |
| Private, source-linked appraisals | Existing domain foundation with definition pins, source/cause identity, qualitative/scaled values, stacking and lifetime semantics | Preserve these owners and their delivered authority; extend them for legitimate bounded reassessment |
| Cognition preparation and publication | Existing actor opportunities, snapshots, accounting and serialized publication | Add an independently selectable emotional-review operation using those owners |
| Immediate native bodily reaction | Selected design requiring implementation on body/status contributions | Support applicable exact-life reactions without an appraisal or model requirement |
| Effective emotional mechanics | Selected design requiring integration with actual parameter/effect consumers | Derive complete applicable fear under one installed rule; reconcile existing overlapping threat penalties |
| Emotional vocabulary and tuning | Authored world policy, installed through current capability/definition ownership | Select supported families explicitly; prose labels do not install mechanics |
| Joy, grief, coping and social scenarios | Product examples using the selected foundation and separately admitted activities | Demonstrate distinct meanings and useful continuation; do not claim every example is already playable |
| Broad needs simulation, automatic personality development and unusual affect laws | Separate selected projects or repertoire options | Preserve extension boundaries without making them dependencies of this foundation |

## Three meanings with three owners

| Meaning | Authoritative owner | Inputs and required behavior | Boundary |
| --- | --- | --- | --- |
| Native bodily reaction | Existing body/status/state-contribution owners | An exact eligible committed cause can produce a short reaction on an applicable body. Installed physiology, conditions and mechanical traits can change magnitude, recovery or supported effects. No AI or episodic memory is required. | A bodily reaction is not a belief, a private appraisal or a chosen action. A model cannot extend or erase it by saying the person has calmed down. |
| Interpreted emotion | Existing private appraisal owner | The character interprets their own permitted experiences, memories, values and beliefs under an installed definition. Original cause, source binding, meaning, value and lifetime remain explicit. | Another person's intention, speech or performance cannot set this state. Reinterpretation cannot invent a new historical occurrence. |
| Effective mechanical state | Read-only composition through existing effect/parameter owners | Query active eligible bodily and appraised contributions for a declared mechanical context, then resolve the installed channel and modifiers. | The result is not another independently writable emotion. A consumer cannot choose a private interpretation or apply its own competing aggregate. |

The same attack can legitimately support both a bodily startle and a later interpreted fear. They remain separate contributions because they mean different things and have different owners. The mechanical composition rule prevents accidental additive double-counting. An actor can have an applicable body without an interpreter, an interpreter without a mammalian startle response, or both.

### Native onset and bodily recovery

A sudden unexpected assault can produce an immediate short reaction from an applicable body. The surprise producer owns deciding whether its exact evidence and pre-contact circumstances satisfy the agreed shock contract. An ordinary failed defence, rear angle or the attacker's desire to surprise does not by itself establish that contract. Native admission binds the committed original cause and target life; equivalent contact, guard, injury or occurrence wrappers do not produce repeated onsets from the same original cause.

The bodily contribution begins at the agreed committed transition. A startle created by an impact cannot worsen defence against that same impact after its outcome has already been determined. It can affect later eligible checks while active. Existing injury, discomfort, impaired limbs, travel constraints and action commitments retain their own causes and effects.

A highly composed compatible body may have a smaller or shorter reaction. That does not reveal an unseen threat, make the character fearless, erase pain or choose a response. The selected base effect does not create paralysis, involuntary turning, an automatic destination or mandatory flight. If a world later selects a distinct involuntary motor effect, it needs an explicit supported bodily capability and a separately reviewed contract.

### Effective fear

The selected initial aggregation family is **the strongest applicable contribution**. Keep the independent active sources; determine which sources apply to the current consumer and context; normalize them under the installed channel; take their maximum. The [world policy](../worlds/base/psychological-reactions.md) and [technical design](emotional-physiology-tech-design.md) own the exact query and coefficient contracts.

The underlying records distinguish a general bodily reaction, a targetless concern and fear directed toward a personally identified subject. Escaping one pursuer does not resolve fear of another. The selected base mechanical projection includes all mapped active fear applicable to the current body and control policy; a target label does not restrict the penalty to attacks against that target. There is no hidden distance-to-threat or optional cognitive-relevance filter. Future applicability rules require an explicit supported world/channel contract rather than a model's retrospective choice of whichever number produces a dramatic outcome.

Persistent applicable appraised fear can keep the mechanically effective fear high after startle ends. Conversely, a person can be physically startled without an interpreted fear record. The channel name “fear” does not turn a memoryless animal's bodily contribution into a claim about its private human-like interpretation.

The initial base mechanical consumers are accuracy and evasive effectiveness. **Fear does not automatically lower ordinary running or fleeing speed.** The selected evasion effect reduces maximum newly offered/admitted distance. Preview, offered choices and admission use the same limit; an endpoint outside it is refused before cost rather than silently shortened. Once a legal evasion is admitted, its endpoint, path and duration remain fixed under the existing action owner: later fear cannot slow it, move it or add a dodge roll. Ordinary movement retains the speed established by the body, travel mode, route, load, injury and current action. The emotion channel cannot choose movement, turn the character, reduce all action capabilities or duplicate an existing physical penalty.

Mechanical reads require the complete applicable working set. A short display/reflection page is not proof that additional relevant fear is absent. Missing required preparation is an explicit incomplete/deferred condition under the technical contract; consumers cannot treat it as zero fear or wait for a paid interpretation inside an impact.

The effective amount can fall natively as a bodily or decaying contribution falls. A threshold crossing can make review eligible under policy, but the crossing itself is neither an external event nor a mandatory paid call. Hysteresis and bounded support accounting prevent repeated oscillation from buying repeated reconsideration.

### Time that players can understand

Newly authored player-facing durations use **normal-play seconds**. A provisional three-second startle means three normal-speed wall seconds at 1×, one wall second at 3× and 0.375 wall seconds at 8×. Authoring and saving preserve this meaning; the existing simulation clock owns converted authoritative progress and expiry.

Pause freezes simulation progress. Saving halfway through a reaction and reopening resumes the remaining portion, rather than creating a new onset or applying offline wall-clock recovery. Speed changes accelerate the same simulation interval and do not multiply a duration twice. A provider request's elapsed wall time does not decide emotional recovery. Exact appraisal decay values and their explicit unit conversion belong in [base psychological reactions](../worlds/base/psychological-reactions.md), not duplicated numbers in this feature document.

## Fear, joy, grief and anger

World definitions select the vocabulary, supported causes, value kinds, lifetime families, review policy and any mechanical channel. These are fictional authored rules, not diagnoses or empirical claims about universal human psychology. A definition omitted from a world grants no operation and no fallback emotion.

| Emotion | Personally meaningful interpretation | Selected or illustrative representation | Consequence and intentional limit |
| --- | --- | --- | --- |
| Fear | Possible harm, vulnerability, a dangerous person, an uncertain exit or a valued loss | The base profile uses source-linked scaled appraisals with explicit direction/target rules; supported worlds may select other lifetime families | Applicable fear can affect declared accuracy/evasion. The person still chooses through the existing decision owner and can act courageously, continue work or flee at their supported running speed. |
| Joy | Welcome company, a useful success, a particular performance, beauty or an ordinary activity worth enjoying | A world-supported source-linked positive appraisal with its authored scale and lifetime; the selected joy policy retains its own cause semantics | It can matter to later interest, attention or chosen company. It does not create combat power, consent, loyalty, automatic need fulfilment or a compulsory cheerful expression. |
| Grief | Continuing meaning of a personally understood loss | A persistent qualitative profile is the meaningfully different third-emotion example where installed; current reminders and relevance determine when it needs attention | The concern can persist through ordinary happiness. No universal sadness meter, fixed recovery deadline, direct combat penalty or periodic model duty is assumed. |
| Anger | Perceived wrong, obstruction, provocation, disregard or another world-supported personal meaning | Preserve the existing independently interpreted fear/anger foundation and its own value, target/cause and lifetime policy | It can influence chosen demands and methods without compelling aggression. Resolve does not certify forgiveness, trust or repair of the underlying harm. |

### Coexisting meanings

A rescue can create relief, gratitude, fear of pursuit and grief for a lost possession. A successful apprentice can feel joy and worry about new expectations. Someone can admire an enemy's performance while remaining opposed to them. These meanings retain their own support instead of being reduced to a positive-versus-negative balance.

Joy does not subtract from fear or grief. Grief does not forbid real pleasure. A character laughing during relief does not thereby feel indifferent to a loss. When a mechanical check needs fear, it reads the declared applicable fear channel; it does not average every emotion into mood.

For several causes within an existing appraisal family, preserve the family's established stacking semantics. A distinct new source may use the existing creation path and, for target stacking, supersede the prior active interpretation while preserving its historical outcome. An internal reassessment revises the exact supplied existing record. A batch cannot create several differently named copies of one cause or make question order decide a shared record's final value.

### Native continuation and psychological change

A body can recover from its short reaction without any psychological conclusion. A decaying appraisal follows its authored curve between admitted changes. A persistent or condition-dependent appraisal follows its selected lifetime family; absence of periodic review does not mean its intensity must decline.

Psychological reassessment concerns the current meaning or amount of supported feelings. Learning that an exit works, reaching a credible refuge, recovering from hunger or recognizing what an earlier event meant can support change. None of those circumstances guarantees a particular emotional answer. Food can remove bodily strain while an insult remains an insult. A safe place can exist before the character knows or trusts it. Feeling calm is not proof that danger has ended.

An authored temporary fear reaching zero means that contribution ended. It does not prove courage, safety, forgetting or completion of the encounter. An installed persistent fear can remain mechanically applicable without continuing model work. A temporary feeling cannot silently become a persistent family when a model would prefer more time.

Grief provides a useful counterexample to treating every feeling as an expiring meter. A loss can remain important even when it is not the current focus. A reminder may make it relevant to a decision or a permitted review; it does not require a daily stage of mourning, a new external cause for the original loss or a mandatory unhappy response.

### Needs and development

The [needs catalogue](../repertoires/needs.md) owns desired conditions, while the [character design](compelling-characters-feature-spec.md) distinguishes needs/body signals, appraisal, values, intention, plan, action and outcome. This feature preserves those boundaries. Protection, a usable exit, food, privacy and company are conditions or affordances; their actual fulfilment and a person's interpretation are separate.

A joyful meal need not satisfy every attachment. A private hour can be welcome without solving a relationship. A funeral can finish while grief continues. Neither a universal needs dashboard nor a hidden emotional optimization target is required.

Meaningful experiences may inform later confidence, interests or self-understanding under existing memory, belief and character authorship. Automatic personality development, permanent trait progression and broad needs simulation remain separate work. Repeatedly frightening a character must not become a shortcut to universal courage, and surviving harm does not require a moral lesson or a predetermined growth arc.

## People and bodies can differ

Descriptions of personality should make an individual understandable without becoming a decision procedure. This follows [compelling characters](compelling-characters-feature-spec.md), [agent agency](../agent-agency.md) and the [traits catalogue](../repertoires/traits.md). Select contextual tendencies, present interests and values; do not require hardcoded labels such as one global brave, cowardly, angry or cheerful type.

| Dimension | Ownership and useful variation | Independence to preserve |
| --- | --- | --- |
| Bodily composure | Installed body or mechanical trait definitions may alter native reaction magnitude, recovery and explicitly supported effects | It does not improve perception, settle private fear or decide willingness to risk something |
| Courage and risk willingness | Values, beliefs, actual stakes, capabilities and the existing choice owner can make one risk worthwhile and another pointless | A character can shake while helping; fear, physical strength and obedience are different |
| Appraisal sensitivity | Personal context can make beauty, welcome, pain, injustice, danger or embarrassment matter differently | Sensitivity does not grant sensory acuity, hidden information or a universally negative outlook |
| Temperament and persistence | Authored tendencies can support quick irritation, slow recovery, strong anticipation, warm enthusiasm or restrained interest | Prose alone installs no numerical multiplier, forced response or infinite lifetime |
| Expression | Supported bodily cues and separately chosen speech/presentation can be open, restrained, practised, misleading or uncertain | An outward signal does not prove its corresponding private feeling, truth or consent |
| Coping | Available work, walking, company, privacy, humour, music, preparation or practical repair can be chosen according to the person and situation | An action's actual outcome supplies evidence; no one coping activity guarantees relief or becomes the universal best action |
| Development | Authorized changes to beliefs, tastes and self-understanding can follow particular experience through their existing owners | The emotion module does not edit biography, award personality XP or require trauma for an interesting person |

A calm voice can belong to someone frightened. A demonstrative character can show joy that a quieter friend feels just as strongly. Someone may tolerate injury and fear dependence, prepare carefully for danger yet dislike ceremonial attention, or enjoy frightening entertainment while refusing an unnecessary real risk. These combinations are coherent without custom scripts for each personality.

Positive specificity matters. A cook who enjoys familiar company, an amateur who likes making imperfect music, a person satisfied with a modest local life and someone who notices beautiful weather can create meaningful invitations and continuations. They need not be supplied with a hidden wound or an unresolved deficiency to remain interesting.

### Native memoryless animals

A compatible animal can startle from an admitted native cause without language, an episodic memory record or a model call. Its existing native behaviour owner continues to own avoidance, orientation, escape, pursuit and route choices. The emotion feature supplies the body contribution and its supported mechanical query, not a new animal decision pipeline.

For the hare example, sudden danger can produce native startle while its real body and controller use rapid running and narrow routes. The end of startle does not automatically end flight, and active fear does not lower running speed. Approaching, hunting from range, burrowing, injury and locomotion must use their separately admitted capabilities. An animal's knowledge is still limited by actual acquired cues; the native reaction does not identify an unseen attacker.

A horse's applicable reaction and response remain separate from a rider's supported control, handling, space, rest, water and pain. Soothing intent cannot directly set the horse's private fear or erase a physical condition. Learned handling or familiarity can matter only through actually selected native or learned capabilities.

### Synthetic and unfamiliar bodies

A character with a synthetic body may lack mammalian startle while having a supported private interpretation of fear, joy or loss. A separately installed synthetic reflex may have its own declared applicability and physical response. The label “synthetic” neither requires emotional absence nor installs an equivalent human reaction.

A chassis fan increasing under exertion is an observable body fact if that body declares it, not a reliable anxiety display. A coloured mantle can mix deliberate signals with native bodily changes under a world's explicit rules; familiarity can support uncertain interpretation without providing direct access to private values.

Body shape, species, culture, controller and personal disposition are separate. Horns do not establish anger, prey morphology does not establish cowardice, and mechanical composure does not imply superior character. Worlds select compatible physiology and supported affect laws through installed definitions.

## Emotional review during ordinary life

**Emotional review is an independently selectable operation.** It reconsiders supported feelings without requiring a deliberate thought, new speech act, goal selection, plan revision or physical action. The character can keep walking, preparing a meal, working, resting or waiting for an answer while a permitted review changes a private interpretation.

The operation shares actor snapshots, exact evidence bindings, model execution accounting, budgets and publication authority with existing cognition. Its distinct output contract is emotion-only. It must not be implemented by requiring the ordinary reflection operation to produce a thought that merely narrates the desired change. A model's sentence “I feel safer now” is not itself an admitted state change, external event or chosen speech.

### A useful end-to-end flow

| Step | Product behavior | Required boundary |
| --- | --- | --- |
| A real cause is experienced | A bodily response may occur natively; an eligible person may interpret permitted evidence through the existing appraisal path | Native progress does not wait for AI, and the interpretation remains private and individually supported |
| The character continues | Existing physical actions, plans and invitations remain owned by their current systems | A strong emotion does not automatically stop useful work or select a new goal |
| A permitted reason becomes eligible | Important evidence, bodily change, changed perceived safety, successful escape, separation, an admitted threshold or bounded recovery interval can matter | Eligibility is not a model call and is not proof of the emotion's eventual answer |
| Existing cognition admits an opportunity | Multiple compatible feelings can share a bounded character review and reuse an already admitted cognition opportunity | No second queue, per-frame actor scan or mandatory third threat-response call |
| The model considers the supplied feelings | It can retain, reduce, resolve or otherwise validly reassess each supplied feeling, including uncertainty | It cannot invent sources, set another character's feelings, rewrite a goal or increase its own allowance |
| Native authority validates publication | Exact source, life, controller, policy, appraisal and review authority determine whether each component is still valid | A delayed result cannot overwrite changed circumstances or retroactively affect an earlier physical outcome |
| The character continues with accepted state | Later authorized cognition and mechanics use the actual admitted result and its lifetime | No-change, failure or delay does not fabricate calm, action, speech or a new emotional occurrence |

### Eligibility without a maintenance loop

Review policy is world-configurable through supported native families. The authored policy specifies material eligibility reasons, intervals where appropriate, urgency, positive spacing, cooldown/hysteresis, bounded work and how several feelings share a character opportunity. Exact selected values belong to [base psychological reactions](../worlds/base/psychological-reactions.md).

An intense episode may warrant more frequent review than a quiet one. Mechanically significant band changes can make review eligible. Important new events, changed safety, altered bodily conditions, separation, successful escape, elapsed recovery and new evidence can also warrant it. These triggers use the character's permitted context and subscribed native boundaries, not an omniscient global scan.

Stable joy or a dormant grief concern needs little or no periodic model work. A feeling with no independent review policy is not automatically enrolled. A scheduled interval is finite work associated with exact support; it does not require checking the same emotion forever because time still passes.

The review remains within existing bounded cognition admission. Multiple feelings can share one request, with a complete mandatory context set and explicit handling for work that does not fit. Budget denial, missing capability or incomplete evidence cannot be repaired by opening another queue, silently dropping required concerns or buying an unbounded retry.

An existing threat opportunity can incorporate compatible due emotion work in its already selected appraisal stage. There is no new compulsory appraisal stage before the existing threat decision. A standalone review acknowledges only its captured emotional opportunity; it must not consume an unanswered invitation, advance the ordinary evidence-consumption position or make an unhandled threat disappear.

### Legitimate reassessment of the same cause

The existing decaying-appraisal reframe restriction is preserved: an ordinary same-cause reframe cannot change intensity or restart a lifetime. This feature selects a distinct, admitted reassessment operation on the existing owner.

A reassessment keeps the exact appraisal, original cause, source binding, family, target/stack identity and original lifetime authority. It may revise the current amount or meaning only within the offered policy and captured support. For a decaying family, the original-cause horizon remains fixed. A later understanding of an existing danger can increase supported fear within that envelope without pretending that a second attack occurred. An unchanged answer does not quietly renew the curve.

A distinct new eligible occurrence still uses the existing creation path and stacking semantics. A successful escape or new report can supply new evidence with its own actual provenance. An internal review is not a new external cause. A renamed threat, new request ID, rephrased summary, repeated recall or self-authored emotional notification cannot manufacture a fresh occurrence.

This distinction permits delayed fear after a rescue and changing irritation after bodily recovery. It also prevents unchanged concern from surviving indefinitely through repeated paraphrase. A persistent family remains persistent because the world explicitly selected that family, not because an AI kept refreshing a temporary one.

### Anti-loop and no-change behavior

Each admitted support set and opportunity has finite work. Submitted attempts, including uncertain or unsuccessful attempts, follow the policy's accounting. A model cannot extend that allowance, select its own urgency or create a new support epoch by describing the same situation differently.

The exact receipt and emotional notification produced by a review cannot make the same review newly eligible. Suppression is scoped to those derived receipts; it must not suppress a later actual assault, newly received evidence or another independently relevant event. Reusing the result in an existing threat or ordinary decision does not buy another review.

No-change is a successful meaningful answer when supported. It preserves emotional value, source, lifetime, creation time and meaning; only the appropriate operation bookkeeping changes. It does not emit a fresh emotional occurrence, alter unrelated decisions or require a spoken justification. “I cannot tell” and insufficient evidence remain distinguishable from successful retention.

Under the selected base policy, retain, uncertainty or a submitted failure makes that unchanged support dormant immediately, even if a numerical attempt cap has not been reached. Only a meaningfully changed accepted result can use the next permitted unchanged-support timed follow-up. A later timer, expected recovery of the same startle, native decay crossing or derived notification cannot wake that dormant support. Material independent evidence or a separately experienced bodily/context transition still uses the exact bounded eligibility rule.

When the finite unchanged-support allowance is exhausted, the feeling can continue under its native lifetime with review dormant. A material new permitted support set can justify another bounded opportunity if the installed policy allows it. It cannot extend the original-cause horizon of a decaying appraisal. Continuing actual danger can support distinct new occurrences; simulated time, aliases and self-notifications cannot substitute for them.

### Delay, failure and cancellation

Native bodily progress and admitted lifetimes continue coherently while model work is delayed or unavailable. Lack of funds, capacity limits, provider failure, malformed output, lost authority, stale evidence, uncertainty or a no-change answer cannot create calm, fear, a goal or physical action. A paid request retains its actual accounting even if publication is refused.

Independent valid feeling components may be admitted under the technical batch contract while stale or unsupported components receive explicit dispositions. A committed private feeling does not imply that a later action-selection stage succeeded. Conversely, a failed emotion-only review cannot swallow unrelated ordinary work.

Publication uses the current actor life, controller authority, definition pins, exact source and relevant semantic revisions. Progress of a native curve is handled by the authoritative time contract; a late provider result does not restore its earlier proposed amount at the later wall-clock completion time. Saving, pausing, reloading or reclaiming work does not replenish opportunities or create catch-up calls.

## Knowledge, privacy and continuity

### Current relevance is personal

A character can respond only to permitted personally experienced circumstances, memories, beliefs and body context. An exit being objectively clear is different from the character having acquired evidence that it is clear. An unheard reassurance is unavailable. A known route can be remembered while its current safety remains uncertain.

Emotion can be intense despite uncertainty. Fear of a possible threat is not proof that the threat exists, and anger based on a mistaken report does not make the accusation true. A private interpretation must preserve the relevant distinction between observation, testimony, inference, recollection and uncertainty.

Several sources can contribute to current meaning. The actor can remember the original attack, have actually reached cover, know an ally is nearby and remain uncertain about pursuit. A bounded review supplies the permitted relevant set with exact bindings. It does not manufacture a synthetic combined event or use a distant observer's hidden knowledge to complete the story.

Current-context relevance is not deletion. A grief concern can be durable while absent from a practical local question, and a directed fear need not enter every unrelated language question. That cognitive selection does not remove mapped active fear from the selected mechanical projection. Mechanical consumers require the complete body/control-applicable set independently, and ordinary cognition must receive its own relevant admitted meanings rather than a convenience page being treated as completeness.

### No mind reading or cross-character emotional writes

Physical action, speech, facial presentation, silence, a chosen smile or a model explanation never proves a corresponding private feeling. An attack does not prove anger; retreat does not prove fear; laughter does not prove joy or indifference; accepting practical help does not prove trust or consent.

The initiating actor can attempt comfort, persuasion, intimidation, deception or an enjoyable performance only through actually supported actions. Recipients acquire the real words, events and outward cues that their senses disclose, then interpret them independently. The speaker's intention cannot write their private appraisals.

A model can propose emotional changes only for the exact character whose authorized private snapshot and bound evidence were supplied. Audience and publication rules apply to prompts, receipts, logs and inspection as well as final prose. A private amount or source does not become visible to bystanders because a mechanical effect exists.

Other worlds may select explicit magical or technological effects on feeling. Those require a separately admitted capability, exact effect authority, observability and lifecycle. A description such as “soothing voice,” “fear spell,” “emotional weather” or “happiness device” alone is not such a capability and does not grant private writes to the initiating model.

### Action choices preserve emotional continuity

Continuing an action does not mean an emotion has ended. Choosing an attack does not create anger automatically. Fleeing does not force a fear record, and stopping a threat does not automatically forgive its source. A brave action can occur during strong fear, and a quiet character can enjoy company without expressing delight.

A coping choice creates an actual result that may later be relevant. Completing a meal, resting a sore body, successfully crossing a barrier or receiving an answer can support a changed interpretation. The action does not claim that interpretation on the actor's behalf.

Emotional review may change a private amount while the same goal, plan and action continue. If the resulting feeling later becomes relevant to a new choice, the existing decision owner receives it as context and chooses freely. Review itself has no authority to create that new choice.

### Persistence, correction and forgetting

Current-format persistence retains canonical appraisals, source lineage, interpretation authority, native lifetime progress, review disposition and durable receipts under their existing owners. Loading continues the accepted state; it does not replay an attack, refresh joy, clear grief, restart a startle or grant a fresh review allowance.

Source correction and forgetting follow the existing appraisal/experience privacy and invalidation policies. Review must not narrow those policies, reconstruct erased evidence from hidden shared history or treat loss of detailed recollection as a new cause. Exact retained authorized lineage can support only what the owner permits.

A correction can change current meaning without rewriting an actual past occurrence. If a traveller believed dead returns, received evidence may change the belief and current grief, while the historically experienced loss remains part of what occurred unless an authorized owner separately corrects or removes its records. Other people do not receive the correction merely because one person did.

World definition changes retain immutable meaning and current installation constraints. Resolving an active feeling does not by itself free a retained historical pin to be silently reinterpreted. A new scale cannot be applied to old amounts by relabelling a definition. The [technical design](emotional-physiology-tech-design.md) and [feelings limits](../limits/feelings.md) own these lifecycle requirements.

### Presentation and observability

Ordinary play should communicate supported consequences and opportunities in familiar terms. The affected player can see an authorized bodily condition and its relevant mechanical effect without an obligatory emotion dashboard. Another actor sees only acquired outward evidence. A separate deliberate expression can communicate a feeling, conceal it or be misunderstood.

An unconscious emotional review does not require a public animation, thought bubble, speech turn or action log entry. Separately authorized inspection can expose its current record, support and lifecycle for diagnosis or creation. Operational failures belong in appropriate existing diagnostics; they should not become fictional evidence that a character had a thought or changed their mind.

Player understanding, native correctness, model behavior and cost are separate qualification questions. A fluent explanation is not proof that a value changed, and a correct internal receipt is not proof that the scene is enjoyable.

## Directly controlled characters: SA-D01

**Unresolved product decision requiring Mike's approval.** The existing [SA-D01 record](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) covers longer-lasting interpreted fear for directly controlled characters. This general design makes its consequences for other supported interpreted feelings explicit. No option is silently adopted by this document.

Native applicable bodily startle and physical conditions apply equally to player-controlled and autonomous actors. The issue is who may author or maintain the fictional character's longer-lasting interpretation while a human directly controls them. No background model may silently decide the human player's subjective fear, joy, anger, grief, desire or intended roleplay.

### Alternatives and recommended initial choice

| Alternative | Precise conditional product | Advantages | Costs and implementation consequences |
| --- | --- | --- | --- |
| A. Native body only during direct control | Native bodily/physical reactions apply. Autonomous creation and reassessment of the controlled character's private interpreted feelings are disabled. Appraised-emotion contributions are excluded from that character's effective emotional mechanics during direct control. | Keeps immediate embodied stakes and preserves the human's interpretive freedom with the least additional interface or model burden | Player and NPC interpreted mechanics differ. Existing appraisals require explicit masking during control, continued native lifetime handling and visible transition feedback. This option does not provide persistent interpreted player fear. |
| B. Deterministic authored interpretation | Explicitly selected native world rules create/reassess supported appraisals from the controlled character's own admitted evidence, through the same appraisal authority. No autonomous model supplies those interpretations. | Makes authored longer-lasting player fear and its mechanical consequences predictable and available without a paid psychological call | The world imposes a fictional emotional condition. The rule, scope and mechanical consequences must be clear to the player. Rules need exact evidence, control and source admission; a label cannot stand in for an implemented producer. Broad freeform personality interpretation is unavailable. |
| C. Explicitly opted-in model interpretation | The player grants bounded model interpretation for named supported families and consequences under the existing controller/consent owner. Reviews still obey the same source, budget, lifetime and publication rules. | Supports an AI-interpreted roleplaying character with more individual contextual meaning | Requires explicit consent, clear revocation and control-transfer semantics, authorized private context and acceptance of model uncertainty/cost. Opt-in must not be inferred from ordinary movement, dialogue or enabling unrelated AI assistance. |

**Recommended initial choice: A, native body only during direct control.** It establishes common bodily stakes while the player keeps subjective roleplay authority, and allows the native/NPC foundation to be implemented independently. This is a recommendation pending approval.

The shared contract's conditional recommendation remains: **if Mike selects persistent interpreted fear as part of ordinary player mechanics, prefer B, deterministic authored interpretation, over silently enabling autonomous model appraisal.** C remains an explicit optional product alternative, not a fallback when B lacks a rule.

Choosing B or C for fear does not automatically authorize interpreted joy, grief, anger or a universal needs model. The selected families, user-facing meaning, consequences and grants must be explicit. A fictional authored condition must not be presented as an inference about the real human's psychology.

### Control transfer and retained state

Control changes invalidate in-flight private operations whose actor/control authority no longer matches. Native bodily reactions already admitted for the same physical life continue on their coherent simulation timeline. A transfer cannot erase an injury, repeat a shock cause or retroactively change a completed outcome.

For conditional option A, existing NPC appraisals retain their canonical identity, provenance and historical outcomes. Their native lifetime continues while the character is directly controlled, but their emotional mechanical projection is masked and no autonomous emotional review runs. Authorized inspection may identify them as the character's preceding appraisals; it must not relabel them as a new human-selected feeling.

Masking at takeover and unmasking at return to autonomy can change the effective mechanical fear even when the underlying record did not change. That is a deliberate consequence of this option and requires visible, truthful control-transition feedback. The transition does not delete, resolve, renew, re-create or extend the records. It creates no free review epoch and does not reset the original-cause horizon or attempt allowance.

On return to autonomy, retained live appraisals can again be applicable under the selected autonomous policy, using their current naturally progressed value. Ended records stay ended. A material exact current-context/control-authority opportunity may support a bounded review only if the installed world policy permits it. Time alone continues native curves; repeated control toggling cannot purchase indefinite reassessment.

For B, the newly controlling policy admits only its selected deterministic producer and families. Existing compatible records retain their meanings and lifetimes; any inclusion/exclusion of a family at transfer must be declared, rather than silently recasting an NPC's interpretation. For C, opt-in belongs to the active human/controller grant and does not transfer automatically from a previous controller. Losing or revoking that grant refuses pending model publication; the explicitly selected post-revocation profile determines projection while retaining record and lifetime integrity.

The eventual decision must settle producer authority, selected families, applicable mechanical projection, human authorship, display, revocation and transfer together. The native bodily, autonomous-character, animal and shared mechanical contracts can be completed without selecting the player psychological producer.

### Implementation gate

The integration agent can implement the producer-independent bodily and mechanical contracts. Player-appraisal acquisition/review remains blocked until the decision is accepted, or must be available only through an explicitly configured and authorized policy whose selection is visible. An omitted policy never silently means model interpretation. No provider fallback, default prompt or save restoration may adopt A, B or C on Mike's behalf.

The unresolved decision is narrow: it does not reopen native startle, independently interpreted NPC feelings, maximum applicable fear composition, time semantics, the existing threat decision owner or bounded emotional review. Their designs and implementation TODOs can proceed independently.

## Six complete experience scenarios

These scenarios specify observable target behavior. Their physical and social activities must use actually admitted capabilities in the selected world. They are design acceptance material, not evidence that every illustrated capability or model response is implemented.

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

Joy, embarrassment about a memorial, irritation at poor communication and remaining concern can coexist. The review cannot rewrite the past, make an uncertain identity certain or give the correction to recipients who never acquired it. Actual commitments and other people's memories retain their owners.

A meaningful continuation could be an ordinary meal, a question, a chosen celebration or reluctance to trust another unexplained absence. No one response is scripted, and the scene need not force a full reconciliation.

This demonstrates why legitimate source-linked reassessment matters beyond combat: changing what an event means can produce play without creating a new fictional cause for the original feeling.

Repertoire anchors: [PB-043/272](../repertoires/psychology-behavior.md), [CB-220](../repertoires/characters-backstories.md), [HMY242/270](../repertoires/history-myth.md), [RSH-351](../repertoires/relationships.md).

### 6. Two bodies, neither a stereotype

A hare encounters an admitted sudden cue. Native physiology produces the supported reaction while the existing animal controller uses actual routes and its fast body to escape. There is no compulsory model call or autobiographical interpretation. The animal remains useful to observation, hunting and ecology because the same real movement constraints apply.

A synthetic character may lack that bodily reflex while fearing damage or the loss of a companion through a supported private interpreter. A fan increasing under load provides only the declared bodily evidence. A highly composed human can recover from startle quickly and still care more about a feared consequence than a visibly jumpier companion.

The differences encourage observation, preparation and chosen companionship. Body, control, knowledge and personal values remain independent rather than being inferred from a species or personality label.

Repertoire anchors: [BSP-101/208/260](../repertoires/bodies-species.md), [TR-143/155](../repertoires/traits.md), [PB-256/320](../repertoires/psychology-behavior.md), [CB-225/289](../repertoires/characters-backstories.md), [planetary-scifi world profile](../repertoires/worlds/planetary-scifi.md).

## Repertoire coverage and ownership

The review covers the inventory and applicable content of all **42 repertoire Markdown files** at the source-reviewed baseline, with detailed focus on psychology/behavior, needs, traits, characters/personalities, relationships, bodies, combat and gameplay priorities. Cross-catalogue review identifies emotionally relevant entries and their actual owners. It is not a claim to revalidate every sentence of all proposals, repeat the bibliographic programme or measure player enjoyment.

The repertoires remain proposal catalogues. A selected baseline emotion capability can support core independent people without promoting every grief ritual, alien inner law, personality detail or psychological example to a current implementation requirement. Central [README](../repertoires/README.md), [coverage](../repertoires/coverage.md) and [gameplay-priorities](../repertoires/gameplay-priorities.md) reconciliation belongs to final integration, including any broad selected-scope links; this specialist does not rerank the catalogues.

### All-file relevance map

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

## Acceptance and delivery handoff

### Product acceptance cases

These are future acceptance requirements as design. They have not been executed. The [technical design](emotional-physiology-tech-design.md) owns the EP-C11 lower-level race, source, timing, capability, persistence and scheduling cases; the [maintainer tracker](../maintainers/emotional-physiology.md) owns implementation work and evidence.

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

### Surprise designer contract

The surprise designer consumes this module's native shock cause/result, body applicability, derived effective fear query, stat-modifier resolution, time ordering and animal support, as fully specified in the [technical design](emotional-physiology-tech-design.md) and its EP-C12 handoff.

The producer supplies exact committed evidence and target life under the shared contract; it does not assign private fear or create duplicate bodily onsets through outcome wrappers. The body owner applies an installed native rule. Effective fear is read-only and scoped to the later eligible mechanical check. The same surprise can have different later interpretations, and the native animal path never depends on a human-like memory or model request.

The provisional duration remains authored in normal-play time. Fear does not automatically slow running or choose an escape. Existing ranged danger/return-fire and other overlapping penalties must be reconciled by their actual stat owners so the same emotional effect is not applied twice.

### Integration agent contract

Final integration reconciles the canonical feature/technical/world/limits/tracker links, shared ND11/ND19 selected scope, current cognition/continuing-life/threat consumers and the broader repertoire indexes. It must preserve source-linked appraisal creation/reframe/resolve semantics while adding the distinct reassessment operation and its durable authority.

There is one existing threat decision pipeline, one coalesced actor work owner and one private appraisal owner. Emotional review reuses compatible opportunities and accounting while retaining its own operation acknowledgement. Integration must preserve actual accepted emotional changes when a later action stage fails and preserve unrelated work when an emotion-only operation completes.

The unresolved SA-D01 producer remains blocked or explicitly configured and authorized. It cannot be decided accidentally by a default prompt, a missing producer, a control transfer or save restoration. The producer-independent native and mechanical foundation does not depend on that decision.

### Maintained records and scope completion

- Product contract: this document and the binding [shared stealth feature](stealth-awareness-feature-spec.md).
- Schemas, flows, anti-loop rules, timing, revisions, persistence, capability and acceptance design: [emotional-physiology technical design](emotional-physiology-tech-design.md).
- Authored vocabulary, policy and tuning: [base psychological reactions](../worlds/base/psychological-reactions.md).
- Implementation TODOs and evidence: [emotional-physiology maintainer tracker](../maintainers/emotional-physiology.md), EP01 definitions, EP02 native reactions, EP03 mechanical integration, EP04 reassessment, EP05 independent review, EP06 profiles/personality/player gate, EP07 lifecycle/privacy, EP08 integration and EP09 qualification.
- Limits: [feelings inventory](../limits/feelings.md), [cognition](../limits/cognition.md), [memory](../limits/memory.md) and [AI execution](../limits/ai-execution.md).
- Related owners: [agent agency](../agent-agency.md), [compelling characters](compelling-characters-feature-spec.md), [continuing lives](continuing-lives-tech-design.md) and [combat/threat responses](combat-and-threat-responses-tech-design.md).
- Cross-specialist integration: [stealth-awareness tracker](../maintainers/stealth-awareness.md) and [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters).

The selected design can complete its explicit emotion slices of broader “needs design” items without marking their unrelated scope complete. This feature's status remains in progress until final review and reconciliation finish. Completing that design is distinct from implementation, executable acceptance, performance qualification or proof of player enjoyment. SA-D01 remains clearly open until Mike selects the player interpretation policy.
