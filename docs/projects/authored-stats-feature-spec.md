# World-authored stats, checks and consequences — product and behavior specification

| Status      | Current progress                                                                                  | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------ |
| Not started | Product and behavior proposals are documented; technical design and runtime delivery remain open. | 2026-10-03   |

**Status: proposed detailed behavior, October 3, 2026.** This develops ND03. Typed attributes and state ownership already have implemented foundations; configurable contested checks and the complete behavior proposed here remain future work. Technical design is deferred. Existing action, state, knowledge, invention, world-policy and accounting owners remain authoritative.

## 1. The experience and recommendation

A creator should be able to define a meaningful competence or trait, explain what it affects, and see it change a supported action's real outcome. A player should understand why a check occurs, what preparation can change, what is at stake and what actually happened. An NPC should face the same authored rules while retaining its own goals, knowledge and choices.

The recommendation is **to add an authored competence when it improves an activity players already want to do**. Start with one meaningful effect on an existing supported action. A predictable improvement in work, an applicable learned technique or a change to an action's existing uncertainty can be enough; a new dice system is optional. Preserve ordinary competence and let expertise feel rewarding. A displayed number or an elaborate rule editor alone does not deliver this experience.

The [accepted first playable](../../archive/05-project/first-playable-mvp.md) remains a live resident, conversation and memory, genuinely invented equipment, hunting and food, another supported invention, and pause/speed controls. This feature is not a prerequisite. Follow the package's [game-first delivery sequence](five-product-feature-specs.md#game-first-delivery-sequence) and [playability gates](five-product-feature-specs.md#playability-gates); do not delay the creative loop for generalized stats, roof checks, modifier accounting or progression.

A **rushed roof-patch method** remains an optional worked candidate for a later qualified shelter activity. Its careful and uncertain alternatives expose real time, material and opportunity costs. The reference 0–3 competence, 2d6 curve and outcomes below preserve useful research and arithmetic, but are not an adopted bundle or the minimum release. A different useful consumer, including one with deterministic effects, may be a better first choice. Do not add a second independent roll to an action that already resolves the same uncertainty.

**Product review revision:** the earlier proposal selected the roof and dice family as the first consumer. That proved a possible coherent rule, but did not establish that players wanted the extra decision, waiting or retries. This revision makes inclusion conditional on its contribution to play, and simplifies the proposed timing of modifiers. No current runtime behavior or accepted first-playable scope changes.

### 1.1 The player payoff must earn the rule

Choose the activity because it matters to a player's goal: getting food, making a useful invention, helping a companion, building a chosen camp or attempting a more ambitious plan. Explain what the competence adds to that activity and what the player can perceive or do differently. Greater reliability can itself be a satisfying payoff; every routine action need not remain a difficult choice.

For a checked method, identify the valued alternative that spending time or taking risk gives up. A correct probability table does not make repeated failed chores enjoyable. Compare the same situation with a simpler predictable rule. If the check mainly adds prompts, delay or a repeated instruction to try again, simplify or omit it. If uncertainty already produces a useful consequence such as a fleeing animal, reuse that action's rule instead of adding generic dice for their own sake. These are design hypotheses to evaluate in human play, not claims that this proposal has demonstrated fun.

## 2. Existing boundaries

The [accepted stat direction](../../archive/03-design-proposals/agents-and-social-simulation.md#player-designed-stats) permits authorized stat/effect authoring without hard-coded stat names. An ordinary action request does not authorize adding a stat. The [EWF foundation](../maintainers/extensible-world-foundation.md#ewf02--typed-state-providers-and-one-authoritative-value) supplies typed state and generic permitted presentation, while [state contributions](../maintainers/state-contributions.md) preserves one authoritative value and real sources/effects.

This specification adds product meaning to those foundations: when a check is warranted, how a selected value enters it, which outcomes are permitted, how participants learn the result and what retries mean. It does not reopen completed state work or claim that defining an attribute already implements checks.

Creator authority and a separately supported full-invention grant can authorize rule design within their scopes. Neither a stat name nor a model response grants that authority. Current permission support remains controlling. World rule authoring does not grant access to ungranted human-private values, histories or other people's funding.

## 3. Distinguish what a number means

| Kind of state               | Meaning                                                     | Example                                  | What it does not automatically do                                            |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Competence                  | Capability within an authored task domain                   | Practical craft rank                     | Grant a method the actor never learned, create tools or force wise choices   |
| Bodily property             | A supported physical characteristic                         | A world's strength measure               | Overrule actual reach, mass, support or the relevant physical action owner   |
| Resource                    | A quantity that can be gained or spent through real sources | Charge or mana                           | Become free because a roll succeeded                                         |
| Temporary condition         | A scoped influence with a cause and duration                | Impaired grip from an admitted condition | Stack indefinitely under renamed copies or become permanent without its rule |
| Descriptive trait or belief | Authored characterization or a person's interpretation      | Patient, suspicious, inexperienced       | Force speech, consent, friendship or a private mind state on another person  |
| Check result                | The outcome of one actual admitted uncertainty              | Patch secured; finishing required        | Become a universal success permission or a new permanent stat                |

The same displayed word can have different meanings in different worlds, but its actual definition must be unambiguous within its use. A resource and a competence called focus cannot silently share one writable value. Renaming a stat does not change its effects; changing its effects is a reviewed rule revision.

Missing, unknown, inapplicable and zero are different. A world can explicitly define untrained rank zero for applicable actors. It must not turn an absent optional attribute into zero on every creature or initialize a hidden skill merely because an action queried it. If required support is absent, identify the missing behavior or choose another already supported method.

## 4. When to check, and when not to

### 4.1 A check begins with a possible action

First establish the intended outcome, chosen method, applicable knowledge/capability, actual target, resources, reach, permissions and current conditions. A random result does not let an actor use an inaccessible tool, spend an empty resource, patch an absent roof or persuade a human into an agreement they did not choose.

Use a check when a supported method has meaningful unresolved uncertainty and the possible outcomes differ in a way that matters. The author must name those differences. If every result leads to the same state with a different adjective, the check adds delay and noise without gameplay value.

If success is assured under the selected rules, perform the actual work without unnecessary randomness. If the task is impossible under those rules, explain the permitted reason or let the character discover it through a real attempt where appropriate. Do not offer a lucky roll against a known physical impossibility. A secret prerequisite may remain unknown to the actor, but cannot become true because the dice were high.

### 4.2 Preserve routine competence

Eating accessible suitable food, walking an unobstructed known route and completing an established uncomplicated method should retain their existing behavior unless a particular authored family changes it. Do not add a check to every step because a stat exists. This would make everyday competence unreliable, multiply processing and encourage players to avoid ordinary actions.

A difficult, time-pressured or specifically variable method can legitimately use uncertainty. Its difficulty comes from actual supported conditions or an explicit world rule. It should not grow because the player succeeded recently, used eloquent language or is paying for a larger model. Optional hidden adaptive luck is not part of the proposed profile.

### 4.3 Stakes before commitment

Explain the meaningful outcomes before the human commits: this method is quicker if it goes well; it may need finishing; a setback consumes time but does not create a patch. Give a readable estimate when only part of the situation is known. Do not demand another confirmation for every routine roll after the player has already selected a clearly described method.

When an outcome could consume unusual resources, cause a new irreversible transformation or affect another participant, apply that action's actual review/participation rules. A generic roll button cannot approve unspecified downstream consequences. The actor can choose another method, prepare more, ask for help or stop.

## 5. Proposed reference rule: practical work

This section is an **optional worked proposal** for evaluating one possible checked method after shelters are useful. Its numbers and associated modifier/helper rules are not required for the initial game or for every future competence. Retain the arithmetic as a comparison tool; adoption depends on the player payoff in §1.1 and the qualification in §13.

### 5.1 Authored competence and modifier

The optional reference world would use an integer **Practical craft** competence from **0 to 3**: untrained, practiced, skilled and expert within the selected family. These descriptions explain a domain-specific scale, not a person's worth or overall intelligence. Applicable new actors receive an explicitly authored initial value; current characters are not silently reclassified or awarded ranks by their dialogue style.

For the reference check, add that rank to two independent fair six-sided dice and a net situational modifier from **−2 to +2**. The total modifier therefore ranges from **−2 to +5**. These are proposed tuning choices to qualify. Other stat names and supported scales can be authored, but a display range alone does not change the selected check profile.

The proposed outcome bands are:

- **10 or more:** complete the selected fast method cleanly.
- **7–9:** establish useful partial work that needs the declared finishing step.
- **6 or less:** the declared setback occurs; the intended completed effect does not.

Natural minimum/maximum dice have no separate automatic catastrophe or miracle in this profile. At sufficiently favorable modifiers, a setback can become impossible. That is an explicit consequence of the curve, not a reason to add a secret failure floor. If an author wants a different curve or rare failures, it must be a visible supported policy.

### 5.2 What one point changes

For fair independent dice, the exact distribution is finite and can be inspected without simulation or a model opinion. The table below is arithmetic for this proposed profile, rounded to one decimal percentage point. It is not evidence that these odds are enjoyable or balanced.

| Total modifier | Clean completion | Finishing required | Setback |
| -------------- | ---------------- | ------------------ | ------- |
| −2             | 2.8%             | 25.0%              | 72.2%   |
| −1             | 8.3%             | 33.3%              | 58.3%   |
| 0              | 16.7%            | 41.7%              | 41.7%   |
| +1             | 27.8%            | 44.4%              | 27.8%   |
| +2             | 41.7%            | 41.7%              | 16.7%   |
| +3             | 58.3%            | 33.3%              | 8.3%    |
| +4             | 72.2%            | 25.0%              | 2.8%    |
| +5             | 83.3%            | 16.7%              | 0.0%    |

The curve makes skill and preparation consequential, especially near its middle. A one-point change does not have the same effect everywhere, and the middle-outcome probability can rise and then fall. Creator tools should show the resulting distribution rather than describing every +1 as the same percentage improvement.

### 5.3 An optional worked consumer: a rushed patch

Let **T** be the authored positive work duration for the rushed patch under otherwise stable admitted conditions. It is a real world duration chosen by the method, not provider latency. The reference alternative, **careful patch**, takes **2T** and completes reliably when its actual prerequisites remain satisfied.

Both methods use the same appropriate patch materials and yield the same final supported repair. The rushed check distinguishes:

| Outcome            | Actual work and resources                                                                                          | Actual shelter result                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Clean completion   | After T, commit the normal patch transformation and its declared material use                                      | The named section receives the ordinary completed repair                                                  |
| Finishing required | After T, retain the actual staged patch/material and offer a further T of ordinary finishing work                  | No completed-repair coverage is granted until that finishing work completes; progress is retained         |
| Setback            | T has elapsed; no finished patch is created. Unconsumed stock remains its actual material and unused holds release | The existing roof stays in its actual prior condition, including any independent weather or damage change |

The staged result is a real unfinished work state, not a second copy of the cloth. Finishing does not require another uncertainty check under unchanged supported conditions. If the person leaves, preserve the staged material and release only the permissions/holds that the work policy says may end; no indefinite reservation of someone else's inventory is implied.

Choosing the rushed attempt initially authorizes its first T, not an undisclosed extra T. Finishing requires a new chosen action or an already accepted contingency that includes it. A human's silence at the result screen is not consent to more work. The expected-time comparison below assumes the actor deliberately finishes partial results.

A new event can invalidate any method: the target is removed, a needed support fails or a required tool becomes unavailable. Reconcile that event through the action owner. A successful check does not guarantee completion after prerequisites cease to hold, and a technical fault does not become a low dice result.

### 5.4 Why the careful alternative matters

The quick method should offer a choice, not compulsory gambling for basic shelter. A novice with no situational modifier has an expected **17T/7, approximately 2.43T**, to finish by repeating setbacks and completing each partial result, assuming unchanged conditions and immediate renewed attempts. At modifier +2 the same simplified calculation is **1.7T**. Careful work takes 2T under those assumptions.

These calculated examples explain the intended tradeoff: the novice can value certainty, while a skilled worker can often benefit from the faster method. They ignore changing rain, travel, contention, fatigue and opportunity costs, which can matter in actual play. No real money, throughput or measured player behavior is inferred from this arithmetic. The calculation also assumes each new setback attempt requires another T of actual work. If reusable preparation makes a legitimate repeat shorter, recalculate the complete activity; do not discard useful progress to preserve this illustrative formula.

Both T and the 2T relationship remain proposed world balance. Qualification must include the existing pause/speed controls and the player's actual competing goals. Saving simulated time may matter to a hunt or a promise; if it merely changes how long the player watches a timer, the proposed check has little value. A partial repair that gives no cover must still offer a worthwhile continuation rather than delaying a compulsory chore.

A skilled worker routinely preferring the fast method can be a legitimate reward for competence. Do not force equal method usage or add a failure floor to manufacture tension. Examine whether players value the methods in their situations, whether preparation creates useful choices, and whether failure leaves them wanting to act. If it does not, simplify the method or retain predictable work rather than secretly manipulating outcomes.

## 6. Preparation, assistance and modifiers

### 6.1 Bounded reasons, not bonus shopping

The optional practical-work candidate has two situational categories: **equipment suitability** and **working conditions/support**, each contributing −1, 0 or +1. Their sum supplies the −2 to +2 situation range. Each category recognizes at most one applicable favorable influence and one applicable adverse influence; the two cancel when both are present. Equivalent causes do not stack merely because they have several names or descriptions.

Ordinary appropriate tools satisfy prerequisites and contribute zero. An admitted improvement can supply the favorable equipment influence; an applicable impairment can supply the adverse one while the method remains possible. A required missing tool blocks that method instead of becoming a small penalty that luck can overcome.

The working category can recognize one genuinely participating helper or a qualified setup advantage, alongside an admitted difficulty such as unstable working conditions. Several spectators, repeated encouragement or ten equivalent decorations do not add ten bonuses. A truly different collaborative method can use a larger team after its own scope is qualified.

Every influence needs an actual source, applicable activity and lifetime. Destroyed, unequipped, expired or unreachable sources cannot keep supplying bonuses. An item's price, ornate name or generated adjective supplies no numerical advantage unless the admitted definition does. An authorized rule can deliberately make ritual meaning matter, but must identify how that cause becomes real in that world.

### 6.2 Assistance is actual participation

The optional rushed-patch candidate has one principal worker and at most one helper in its supported role. The helper must choose/accept the activity, be able to perform the role, reach the actual work and spend its required time. Being nearby or belonging to the same household is insufficient.

The helper's participation contributes through the working category, not by adding their entire competence again. Helping has an opportunity cost: they are unavailable for incompatible tasks. A human receives the actual request and makes their own choice. An NPC considers the request from its knowledge and goals; the scene cannot invent agreement to improve the principal worker's odds.

Show when help has become unavailable and what that means. A helper leaving does not cancel an already completed result or require a reroll. Before resolution, the method can continue without the benefit if still valid, or stop when the helper was a true prerequisite. Do not replace the missing helper with an invented anonymous resident.

### 6.3 Conditions at the consequential step

The optional patch candidate separates ordinary preparation from one clear **fastening step** that resolves the uncertainty at the end of the first T. Preparing material and positioning it remain reliable work with actual retained progress. At the fastening step, use the principal worker's applicable competence and the equipment, support and conditions that actually matter to performing that step. Bind those facts with its one result; later changes cannot revise it.

A helper earns the proposed benefit by actually performing the supported role for that step, such as holding the material while it is fastened. They need not remain present throughout unrelated gathering or waiting. Merely arriving for the result display grants nothing. If the required contribution or another prerequisite becomes unavailable before the step can resolve, continue without an optional benefit where valid, or interrupt the step and explain what is missing. Actual changes to the material or structure remain real.

Before the unresolved step, a player can improve equipment, wait for suitable conditions or arrange genuine help, and those improvements may legitimately change the prospects. Earlier difficulty does not leave a permanent numerical penalty after its cause and effects are gone. If that difficulty caused actual damage or consumed work, those consequences remain; changing a displayed modifier cannot repair them.

This replaces the earlier proposal that a favorable influence had to persist for all credited work while any adverse influence could count against the whole stage. That asymmetry added a condition-history rule and could make almost-complete help worthless without adding a useful player decision. The narrower step is an authored approximation, not a universal model of skilled work. A future method needing sustained collaboration must justify and explain that behavior in its own useful activity.

Pausing the activity earns no work time. The world itself advances or pauses under its existing time policy. Resuming retains actual preparation, materials, work and the unresolved attempt; it does not reveal a future result or create another draw. Reassigning the principal requires the action's supported work transition. Current competence and conditions are evaluated for the still-unperformed consequential step, rather than locking a worker's entire earlier situation to the project. Once that step resolves, its recorded outcome and rule remain fixed. Temporary effects that rewrite the enduring reference competence are outside this candidate; supported situational influences still need real causes and lifetimes.

## 7. One attempt, one result, actual consequences

### 7.1 The attempt lifecycle

The human or NPC chooses a supported method from the actual situation. Before work, the interface presents permitted stakes and prospects, never a preview of future dice. Starting binds the intended task, target, applicable rule and actual work. The actor performs the required stage. The check resolves once when that stage reaches its declared outcome point and the relevant action is still admissible.

In the optional patch candidate, randomness resolves once at the fastening step at the end of the first T. No dice result is revealed before the required work is earned. Canceling earlier preserves actual partial effort/state under the action rule and yields no sample to inspect. Resuming retained work preserves the same unresolved attempt; the conditions for its still-unperformed step follow §6.3. Reconnect and background transitions cannot create another result. Real preparation may improve an unresolved attempt's prospects, while canceling or relabeling a resolved attempt cannot change its outcome.

Commit only the actual supported outcome and its coupled material/state changes. If a required write or action is not valid, the product cannot display completed repair while failing to use its material, or consume material while creating no declared result. Technical failure preserves the last valid work/result state and follows recovery; it is not a fictional setback.

### 7.2 Retry means another real attempt

An unchanged request, new wording, double click, connection retry, caption replay or provider continuation does not create a new attempt. A completed result remains part of history. A staged partial result offers its finishing path; asking “try harder” does not turn it into a fresh free roll or a second patch.

A new attempt can be legitimate after a setback when the actor deliberately spends the method's actual time and resources again. Conditions need not change if repeated physical effort is itself a supported opportunity. The product must distinguish that from relabeling the same request. If a particular family models a fixed unknown property, such as whether an existing document contains a clue, retries do not rerandomize that property.

Some actions warrant retries only after new information, equipment or a changed situation. The authored family must say so, and the player should have a useful explanation. Do not impose one arbitrary global cooldown on every kind of uncertainty, or let a renamed target evade a family's actual attempt boundary.

Where the existing activity family supports it, an actor can choose a bounded physical retry plan with a goal, time/material allowance and interruption conditions. Each attempt remains actual work and uses the same result rules; it need not require a fresh model call merely to repeat a previously chosen method. This is distinct from retrying an uncertain paid provider operation, which remains governed by the existing no-automatic-paid-retry policy.

### 7.3 Save, restoration and rule changes

Same-version save/load and reconnect preserve resolved results and current attempt/work state. Loading a completed attempt does not roll it again. Explicitly rewinding to a point before an attempt follows the existing world's rewind policy; this specification does not promise that an authorized timeline rewind cannot change future history. It still cannot rewind external spending, permissions or private-data revocation.

Within one live timeline, movement between detailed/background play, server recovery and repeated observation do not grant additional draws. If a new rule revision affects an unfinished action, the action/law owner must either preserve its valid prior rule or make an explicit supported transition. Quietly applying a more favorable latest rule to a failed historical attempt is not allowed.

### 7.4 No universal critical miracle

The best dice result improves only the authored uncertainty within the permitted effect range. It cannot create an extra cloak, ignore a wall, reveal a secret with no knowledge path, override a protected target or invent consent. A worst result is likewise not permission for arbitrary catastrophe or punishment outside the declared stakes.

If a future world authors critical outcomes, each needs bounded actual consequences, clear conditions and an appropriate warning when stakes materially differ. A hidden critical failure added to retain tension would contradict the reference profile and should not be introduced as a technical balancing shortcut.

## 8. Threshold tasks and later opposed contests

### 8.1 Difficulty belongs to the chosen challenge

The reference family uses fixed outcome bands and authored situational categories. Another supported threshold profile may compare a result to a declared difficulty, but should not apply both an unexplained raised target and a penalty for the same cause. Define which differences represent chance, effect magnitude, risk and prerequisites; they are not interchangeable sliders.

An author's rule should be coherent across equivalent circumstances. Similar skill and equipment do not face secretly different odds because the model likes one character, the player used dramatic prose or the service is under load. Hidden facts can legitimately change a check where the action family uses them, while their disclosure remains scoped.

### 8.2 A single contested event

A later opposed family must resolve one shared contest with individually scoped choices and evidence. The proposed default is one independent draw under each participant's applicable admitted profile, then comparison of the resulting totals. Higher total wins the specific contested effect; a tie preserves the prior state for that attempt. There is no automatic repeated roll until somebody wins.

Each participant's relevant choice must be established before they learn the other's result. A defender may rely on an already admitted resistance/stance where that family supports it; the system need not invent a new decision merely to fill a form. A human's required new participation still comes from that human. One participant's refusal or missing permission does not count as a numerical defeat.

One optional later candidate is a bounded control contest over a movable held object, **only after the physical action, participation and custody effects are supported**. Both must be eligible to exert the relevant action; the shared outcome can change actual custody once, preserve it, or end without transfer. Title remains governed separately. The check cannot put the same object in both inventories, cause remote theft or bypass the world's protected participation rules.

On a tie, custody remains as it actually was and elapsed effort remains spent. Participants may make a new real choice, release the object or deliberately begin another supported attempt. Interruption by a third actor or changing geometry is a real event, not a reason to finalize a prewritten winner. Contests with more participants require a separately designed family, not an all-pairs tournament invented by the resolver.

### 8.3 Social uncertainty and consent

A persuasive request can affect an NPC's supported appraisal or willingness to consider an offer; it does not create an accepted purchase, promise, affection or human answer by itself. Some requests are willingly accepted without a roll; some are refused because they conflict with actual priorities or possibilities. A check is useful only in the remaining supported uncertainty.

The optional practical-work candidate does not include persuasion, seduction, coercion, fear or relationship scoring. A future social family must define what is uncertain, whose independent decision remains, which evidence matters and what actual outcome is permitted. It must preserve existing memory-based relationship descriptions and human control. A new charisma field cannot supply these behaviors by naming them.

Even in an explicitly authored supernatural world, mind-affecting capabilities require their own admitted scope and participation/privacy rules. This feature grants no general permission to access private thoughts or force humans to speak, consent or act. Statistical competence is not control authority.

## 9. Feedback, knowledge and accessible play

### 9.1 Explain the action before the arithmetic

The primary feedback is what changed: the patch is secure, the material is staged and needs finishing, or the attempt used time without completing the repair. Show remaining useful actions and actual material state. A dice animation can accompany the result but is not the authoritative evidence or the only accessible presentation.

For a human who wants detail, provide the permitted competence, applicable influences, selected rule, roll and outcome band in an expandable readable explanation. Keep arithmetic optional, keyboard accessible and available after transient feedback ends. Color, animation speed, sound and hover cannot be the only ways to understand success or a remaining obligation.

Do not force an extra modal for every roll or interrupt unrelated conversation with a full character sheet. A clearly chosen method can proceed and report its result through existing action/status surfaces. Longer-term comparisons and creator rule inspection can use the established Work/inspection surface.

Dice animation, a hidden tab and reviewing the result do not create a private world pause or change the already resolved event. Make the result readable afterward through permitted history, with animation reduction/skip available as presentation choices. New actions and shared time continue under their existing rules.

### 9.2 Exact odds when the character is allowed to know them

For a transparent practical task whose relevant facts are known, the player can inspect exact probabilities for the selected method. If important inputs are genuinely unknown or private, do not expose an exact computed percentage that reveals them. Provide a scoped estimate or say the outcome is uncertain and explain the known factors.

The underlying event still follows its actual rule. A less precise player forecast does not change the dice. Another observer may see the physical outcome without learning the worker's private competence, every modifier or the roll. Creator definition inspection similarly does not grant access to every participant's private values.

An informative failure can teach only what the attempted action actually exposes. Failing to persuade someone does not reveal their hidden motive. Failing to find a clue does not manufacture a false fact. Unsupported uncertainty should remain a gap rather than an omniscient explanatory sentence.

### 9.3 NPC reasoning and learning

NPCs receive useful permitted action consequences and prospects through the same knowledge/action owners as other activities. They can prefer careful work, accept risk under pressure or ask for help. A high competence does not make an NPC omniscient or force the best expected-value choice; character priorities and limited evidence still matter.

The service model used to choose an action is separate from the fictional stat. Spending more on optional reasoning does not raise the roll modifier, and budget pressure does not silently lower a character's skill. A finished check needs no new generative explanation unless one is useful and admitted.

The player can make meaningful progress by learning a method, inventing and keeping useful equipment, understanding an animal's behavior, becoming better prepared, building a chosen place or following through on a shared plan. NPCs can retain permitted experience and respond to the actual relationship. Those payoffs matter even without a level-up screen; each still requires its supported action, knowledge or relationship behavior.

Observed success/failure can become actual experience and evidence. This specification grants **no automatic numerical skill gain, experience-point award or personality rewrite**. ND04 and [action experience](../maintainers/action-experience.md) retain their respective progression and learning responsibilities. Numerical advancement should later reward worthwhile play through its own design, rather than being needed to make repeated low-value checks attractive.

## 10. Authoring the rule without programming

### 10.1 Define meaning and applicability

The creator describes the desired distinction: for example, practiced craftspeople should be more reliable when making a quick patch. The World Agent identifies an existing compatible competence/check family or explains the missing support. It should not create another stat for every synonym or infer that an existing appetite meter is an appropriate craft skill.

The reviewable definition explains the name and domain, applicable actors/actions, range and scale, initial values or explicit absence behavior, who can inspect/change values, and what can legitimately change them. A displayed stat may be descriptive only, but the interface must make that clear. A claim that it improves crafting needs an actual supported consumer.

An ordinary player can propose an idea or ask about a rule without acquiring creator powers. When creator or special-invention permission is required, use that existing authority. No natural-language phrasing, uploaded rule description or unknown field can bypass the boundary. A world rule cannot authorize itself to ignore current locks or external accounting.

### 10.2 Bind one meaningful action

For an initial useful competence, choose one existing supported action and show the actual difference it makes. A predictable effect is sufficient when that serves the activity. The tool should explain whether it is changing a duration, a supported method's applicability or an existing uncertainty, rather than making every stat a new roll.

If the optional practical-work candidate is selected, bind one competence to its finite method, actual prerequisites, duration, result profile and outcomes. Explain whether this adds an uncertain method or changes an existing one. Preserve the careful/native route; the worked fast method is an option for evaluation, not a default imposed on every world.

Show how each possible outcome affects time, resources, work progress and the target. Outcomes must cover the complete supported result range without gaps or contradictory simultaneous effects. A proposed low roll that destroys a material needs a real destruction outcome and appropriate stakes; the author cannot merely write “something bad happens” and delegate unlimited harm to narration.

The only curve developed in detail in this proposal is the finite two-die practical-work candidate; it is not current supported runtime behavior. Arbitrary weighted multi-stat formulas, exploding dice, open-ended reroll chains and unbounded pools remain outside this worked candidate. A creator can request another supported profile or keep a broader design as a draft. Arbitrary creativity is an authoring goal, not a promise of an already implemented general rule language.

### 10.3 Preview behavior and incentives

Provide exact outcome distributions for the supported profile and examples across the proposed stat range, modifier extremes, missing/inapplicable state and relevant actor families. Show the effective chance and consequence together. A 90% chance of a trivial result is not equivalent to a 90% chance of an irreversible change.

For practical work, compare careful and rushed methods under meaningful stable and changing cases. Include a novice with ordinary tools, an expert with help, a skilled worker under adverse conditions, an impossible prerequisite and repeated attempts. Explain when a modifier removes a result band or when two differently named bonuses are the same cause.

Creator evaluation can inspect authorized sample values in an isolated scenario. It does not grant live characters the sample's knowledge or alter their actual competence. No paid simulation is required to enumerate the reference dice distribution. New semantic explanations or broader evaluations still use existing bounded authoring admission.

### 10.4 Publish and revise coherently

The creator reviews the actual scope and selected candidate before consequential activation through the existing workshop/constitution path. A rule applies to its declared causal scope consistently. It does not give different hidden physics to release cohorts, different opponents or higher-paying players.

For a new stat in an existing world, explain which applicable characters receive which initial values and why, and which remain absent. Do not reconstruct precise lifelong skill histories from a few anecdotes. Existing human character state requires the applicable authority, and hidden histories cannot be copied into a public rule explanation.

Rebalancing changes future behavior through an explicit revision. Historical results retain their original meaning, spent materials remain spent, and existing partial work follows its valid pinned rule or declared transition. Removing a required definition must not strand work silently or make every missing value zero. Preserve actual state and offer a coherent repair/migration decision through the existing owners.

## 11. Economics, incentives and performance

### 11.1 Repetition is part of the design

At modifier zero, the reference chance of at least useful partial progress on one attempt is 7/12. If unchanged independent retries were free, the chance of reaching that outcome within three tries would be about 92.8%, and within five about 98.7%. This is mathematical sensitivity, not measured player behavior. It shows why single-roll difficulty is a poor economic boundary by itself.

Real attempts consume actual time and sometimes authored resources. Partial progress supplies its own finishing route. Fixed hidden world facts do not rerandomize. Those distinctions let repetition be meaningful without requiring a punitive universal retry ban. A player who prepares a better method can legitimately improve outcomes; cosmetic wording cannot provide the preparation.

The optional practical-work candidate creates no bonus loot, currency, skill points or extra materials for a high roll. More efficient work can still have real economic value: a skilled resident can free time for other tasks. That benefit must arise from actual work, knowledge and available inputs, not a background summary granting production beyond its resource supply.

### 11.2 Avoid per-step randomness and reaction storms

Use one check at a meaningful admitted stage. Do not roll once per frame, knot, sentence fragment or observer. A task's T duration does not create a stream of independent chance events merely because the simulation processes time in smaller pieces. Distinct legitimately risky stages can have distinct checks only when the authored method specifies their real stakes and bounded work.

One shared result can supply appropriately scoped evidence to multiple observers. It need not cause a fresh model response, permanent autobiographical paragraph and social appraisal in everyone nearby. Preserve actual consequential learning and obligations through existing attention/memory owners, with optional interpretation selected for relevance.

Dice resolution and basic result explanation can be ordinary admitted computation. They do not require paid generative inference or a purchase of new luck; they still contribute to the world's real execution workload. Expensive semantic interpretation belongs at a useful authoring or decision boundary, not in the repeated mechanical roll.

### 11.3 Bound the surrounding work

Cost can grow through available actions, modifier sources, eligible participants, outcome effects, retries, histories and repeated probability previews. Select relevant supported sources before expensive interpretation. The optional two-category/one-helper candidate gives a concrete evaluation scope without making that entire scope a release requirement or a universal limit on group work.

Use actual world/action capacity admission before accepting unsupported new work. Repeated authoring variants share the existing objective and funding scope; repeated world actions retain their actual costs and consequences. Do not silently lower competence, alter dice or omit a loser's effect under load. Required-service failure uses the existing coherent operational boundary.

Observe which choices players actually make and why. Excessively forgiving failure can turn a risky method into the only rational option; excessive setbacks can make a skill system feel like mandatory delay. Published expected time is useful but incomplete: deadlines, risk tolerance, available helpers and current needs can change what is worthwhile. Tune disclosed rules from those cases rather than assuming one expected-value optimum supplies good play.

### 11.4 Streaks and assistance should remain honest

Fair independent dice can produce streaks. The reference rule does not secretly modify outcomes after success or failure, even to make the sequence feel fairer. If a future world offers an explicit assistance/luck policy, it needs a disclosed scope, interaction with every affected participant and a separate probability/economic review.

A paid model tier, a subscription, a new device, repeated reloads or attention changes must not buy a better random outcome. Funding may support more legitimate optional activity, as described by the continuing-lives policy, but equal admitted tests use the same world rule. A service problem is never explained as a character's bad luck.

## 12. Concrete scenarios and expected behavior

### ST-J01 — An ordinary task remains ordinary

A practiced resident eats available food or performs an established uncomplicated preparation. The new competence definition does not insert a roll. Actual prerequisites and resources still apply. The player encounters uncertainty when choosing a specifically uncertain method, not because every daily action has been reclassified as a skill challenge.

### ST-J02 — A novice chooses a careful repair

The player can see that the careful patch takes longer than a clean rushed result but avoids the reference method's setbacks when its prerequisites remain valid. They choose it, spend real time and materials and receive the ordinary patch. No hidden fumble is added to manufacture tension.

### ST-J03 — An expert makes a rushed patch

An expert with qualifying equipment and help reaches modifier +5. The declared curve allows clean or finishing-required outcomes, with no setback. The result stays within actual supported repair and material use. Even the best roll cannot extend the roof beyond the patch's physical area.

### ST-J04 — Partial success offers a real continuation

The first T produces staged material and a finishing requirement. The player can inspect it, deliberately finish, leave it for later or choose a supported dismantling/revision. The roof does not receive completed repair yet, and the same cloth is not also available as an intact loose item. Silence does not authorize the extra T.

### ST-J05 — A setback can be retried honestly

After T, the rushed attempt has not completed the patch. Unconsumed supplies remain and the existing roof reflects any real intervening rain or damage. The player can spend another real attempt, choose careful work or change circumstances. Rephrasing the original action and refreshing its result return the same recorded setback.

### ST-J06 — A helper leaves

The helper carries material to the site, then leaves before the fastening step. That real preparation remains useful, but does not supply the different fastening contribution. The worker can perform the still-valid step alone, ask for real help or postpone it. Conversely, a helper who actually performs the fastening role need not have attended all earlier preparation. The game does not invent participation or erase useful work because the helper's availability changed.

### ST-J07 — Ten names describe one advantage

The player calls a tool blessed, masterwork, precision-made and lucky without a corresponding admitted definition. None adds a bonus. Multiple valid descriptions of the same source still contribute once. A genuine different method or supported source can change the situation through the published category rules.

### ST-J08 — A missing prerequisite is not bad luck

The selected patch needs reachable material and a supported attachment. If either is absent, the action is unavailable or interrupted under its rule. A maximum roll cannot conjure cloth or anchor it to nothing. A failed provider request is similarly reported as service failure, never as a low result.

### ST-J09 — The player cancels before the outcome

The player stops during ordinary preparation. No future dice result has been exposed or resolved for browsing. Actual prepared material and spent work remain. They can replace an impaired tool or arrange a helper before performing the unresolved fastening step, legitimately improving its prospects. Damage already done stays real. If a check has already resolved, canceling its presentation does not erase it, refund elapsed time or offer a new sample.

### ST-J10 — Reconnect while the result is being shown

The completed patch result, work and material outcome are recovered once. A dice animation can replay visually only as a representation of that result. The action is not performed again, no extra material is consumed and no fresh random result is created.

### ST-J11 — A hidden factor affects a challenge

A future qualified task has a private relevant input. The actor's forecast names known factors and its uncertainty instead of disclosing an exact hidden-value probability. The actual rule remains consistent. Another observer can see the result without learning a private stat or the source of every modifier.

### ST-J12 — A creator changes the scale

The creator revises Practical craft's range or replaces the check profile. The proposal shows changed odds, affected actors and unfinished work. Out-of-range or missing values need explicit handling; they do not silently become the strongest value or zero. Old results retain their old meaning, and publication follows actual permissions and law-change rules.

### ST-J13 — A later opposed contest ties

Two eligible participants perform the supported control contest. Totals tie, so actual custody remains unchanged and effort remains spent. There is one shared outcome with scoped evidence. No automatic tie-break loop runs, and neither party sees the other's result before making a required consequential choice.

### ST-J14 — A high social stat meets a refusal

An ordinary human declines an offer. No charisma result signs the agreement, transfers their goods or supplies their speech. A future NPC social method can influence only its supported uncertainty and preserves the difference between willingness, an offer and a completed commitment. The practical-work release claims no social-check capability.

### ST-J15 — Background work meets a rule boundary

A quiet resident completes the admitted first T while no human watches. The same check and effects apply. Arrival does not reroll it or change competence. A later detailed interaction sees the actual patch/partial state through permitted observation, not a freshly generated outcome tailored to the visitor.

### ST-J16 — A player tries to farm skill points

Repeating harmless attempts produces the actual work and evidence those attempts warrant. It does not automatically increase rank, award currency or manufacture a permanent narrative achievement. If a future progression family is adopted, it must separately address what meaningful practice and repeated success can change.

### ST-J17 — The world is under service pressure

Optional new explanations or authoring stop under their real budget. Already admitted native checks follow the same rule and have the same consequences. Required-service failure uses the disclosed shared recovery boundary. Skill, outcome bands and opponents' resistance do not change to save a model call.

### ST-J18 — The repair competes with a plan the player cares about

After the relevant hunting and shelter activities are qualified, a player wants to join a companion hunting an animal they have spotted. They also want to protect supplies at their chosen camp. They can move important stock under existing cover and depart, finish a dependable repair first, request help that occupies the companion's time, or leave the current arrangement alone. If the optional rushed method has earned inclusion, it provides another choice with known prospects and costs.

The companion considers an actual request; help is not assumed. A setback can make the player reconsider the hunt, do the reliable finishing work where available, or pursue another goal. It must not force repeated rolls before ordinary play can continue. The player may prefer improving the camp, talking or exploring to this hunt at all. A designer-supplied timer or required repair objective is unnecessary. The proposed enjoyment comes from a chosen plan, useful alternatives and adapting together; whether the check improves that experience remains a playtest question.

## 13. Delivery and qualification

**First preserve the accepted playable game.** Deliver and qualify the existing creative/survival loop under its current owners. Generalized stats, this curve and the roof candidate add no prerequisites. Already delivered typed-state foundations remain useful and are not reset by this change in product priority.

**Stage 1: one useful authored competence, when needed.** Select an existing activity where a visible difference in capability improves the experience. A predictable effect can be the complete initial result. Explain what the player gains, how the difference is discovered, and how it affects a valued goal or cooperation. Include actual resources, permitted feedback, interruption and current-format restoration through the existing owners. A stat bar, differently named duplicate competence or proof that formulas evaluate does not establish useful play.

**Stage 2: one optional checked method, if it improves the activity.** Compare it with the simpler version in the same complete situation. The roof candidate is available only after shelter play itself is useful; another existing consumer may be preferable. Define the narrow consequential step, meaningful outcomes, preparation and one-result continuity. Add assistance only if that real collaborative role improves the chosen method. If failure mainly adds repeated instructions or waiting, revise or omit the check. Do not require the whole reference bundle before releasing a useful simpler competence.

**Later expansion follows an actual need.** Another competence, curve, world variation, opposed action or social family is not a mandatory next stage. Select it for an activity people or creators want and that the current design cannot serve well. A physical contest still needs actual participation and custody behavior before any roll can affect it. Numerical progression and personality change retain their own owners; they are not prerequisites for useful learning, invention or relationship progress.

Behavioral acceptance uses the package's [playability gates](five-product-feature-specs.md#playability-gates). Can players understand the activity, pursue a goal they care about, notice the competence's value and decide what to do after an unfavorable result? Do the new rules improve that experience compared with a simpler version? Include people new to the game and capable optimizers, actual pause/speed settings, changing conditions and a player who declines the risky method entirely. Competence may legitimately make one method preferable; equal choice rates and persistent failure chances are not requirements. Repeated attempts alone do not prove enjoyment.

For any selected checked method, mathematical acceptance checks the finite distribution and every result band. Behavioral acceptance follows actual resources, time, custody, permitted evidence, useful continuation and accessible presentation. Economic acceptance compares the complete activity, including preparation, helper opportunity cost, failed attempts and work forgone. Explanations and arithmetic remain optional to read, and ordinary resolution does not need model calls. These are proposed qualification requirements; only the illustrative arithmetic was calculated during the original documentation work. This review adds no runtime, balance or human-playtest evidence.

## 14. Research and the resulting choices

Research accessed October 3, 2026. Rules establish examples of deliberate game design; developer posts establish the stated version's intentions or corrections. Neither proves a universal preference or Open Legend's balance. The studies below have different tasks and populations; they do not collectively demonstrate that adding more chance makes a game better. The implications for this proposal are design inferences.

| Reference and primary source                                                                                                                                                                                                                                                                                                               | Evidence and limits                                                                                                                                                                                                                                                                                                    | Consequence for this design                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST-R01 — [Wizards of the Coast, D&D SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), May 1, 2025, especially printed pp. 6–8 and 182–184                                                                                                                                                               | Ability checks address meaningful uncertainty; repeated advantage sources and proficiency have stacking rules; assistance needs an applicable contribution. NPC Influence distinguishes willingness, refusal and hesitation. Automatic natural-20/1 outcomes in the cited rules concern attack rolls, not every check. | Separate eligibility, ability, preparation and consequence. Do not import universal critical failures or rules that turn another human's refusal into agreement.                                                           |
| ST-R02 — [Evil Hat, Fate Condensed: Taking Action, Rolling the Dice](https://fate-srd.com/fate-condensed/taking-action-rolling-dice), 2020 rules; online page undated                                                                                                                                                                      | Fiction establishes what can be attempted; straightforward unopposed actions can succeed without rolling. Outcome grades and costly success depend on the action. Table negotiation, post-roll invokes and narrative declarations belong to its tabletop contract.                                                     | Keep reliable work reliable. Define each grade's actual effect and who can choose an additional cost, without granting authority to invent material or consent.                                                            |
| ST-R03 — [John Harper, Blades in the Dark: Action Roll](https://bladesinthedark.com/action-roll), original SRD; page undated                                                                                                                                                                                                               | The procedure distinguishes goal, position, effect and outcome. Ordinary expected actions need not roll. Its highest-of-d6-pool resolution is not 2d6 addition, and the player's roll also resolves NPC effects.                                                                                                       | Distinguish likelihood, danger and attainable result. Do not import player-facing asymmetry into independently acting people.                                                                                              |
| ST-R04 — [Blades in the Dark: Teamwork](https://bladesinthedark.com/teamwork), original SRD; page undated                                                                                                                                                                                                                                  | Direct assistance, group action and setup are different; aid requires a described contribution and coordination. A direct helper incurs a cost, and the rule limits direct aid to one helper.                                                                                                                          | Make help a chosen activity with real time and eligibility. The proposed one-helper boundary is an initial scope, not proof that all useful collaboration has only two people.                                             |
| ST-R05 — [Mark Seifter, Critical Hits and Critical Failures](https://cdn.paizo.com/blog/critical-hits-and-critical-failures), March 30, 2018                                                                                                                                                                                               | This is a Pathfinder **Playtest** design article, not current Remaster rules. It explains action-specific degrees and cases without a distinct critical effect. Its claims about less wasted play are designer reasoning, not measured enjoyment.                                                                      | Use intermediate effects where they help the particular action. Do not invent a unique catastrophe or miracle merely to populate every possible grade.                                                                     |
| ST-R06 — [LaTorra and Koebel, Dungeon World: Playing the Game](https://github.com/Sagelt/Dungeon-World/blob/master/text/Playing_the_Game.xml), original-edition author repository, accessed October 3, 2026                                                                                                                                | Fictional triggers lead to actual effects; most moves use 2d6 plus a modifier with 10+, 7–9 and lower bands. Equipment can alter feasibility. GM-selected trouble and XP for misses are separate rules. This is not the second-edition beta.                                                                           | The reference curve has a real published precedent. Adopt neither arbitrary consequences nor automatic failure XP; qualify each result through the actual work family.                                                     |
| ST-R07 — [ZA/UM, On Active Skill Checks](https://discoelysium.com/devblog/2016/10/06/active-skill-checks), October 6, 2016                                                                                                                                                                                                                 | The pre-release account describes attempted actions, changed skill/circumstances reopening checks and fleeting opportunities with authored failure paths. It is not a full description of shipped Disco Elysium or measured player behavior.                                                                           | Explain what makes another attempt legitimate. Incomplete physical work, a fixed unknown fact and a lost opportunity need different retry behavior.                                                                        |
| ST-R08 — [Larian, Community Update #13: Breadth & Depth](https://store.steampowered.com/news/posts/?appids=1086940&enddate=1626361134&feed=steam_community_announcements), July 8, 2021                                                                                                                                                    | The Early Access preview describes preparation, applicable spells/bonuses, nested explanations and multiplayer teammates deciding whether to contribute. Its reroll resource and background rewards are game-specific. Not every listed spell consumes a slot.                                                         | Let players understand preparation and request real help. Preserve the contributor's choice and actual resource cost. A proposed Open Legend check does not automatically include purchased rerolls or background rewards. |
| ST-R09 — [Larian, Patch 5 Now Live](https://baldursgate3.game/news/patch-5-now-live_99), November 30, 2023                                                                                                                                                                                                                                 | Specific fixes preserve a saved roll-result screen, handle a target destroyed during lockpicking and correct duplicate bonuses, misleading logs and a journal reference to unpromised help. This does not prohibit loading an earlier save or prove every related defect was solved.                                   | One completed attempt needs one consistent result across work, presentation and history. Reconnect, target changes and help records deserve explicit scenarios.                                                            |
| ST-R10 — [Power et al., Lost at the Edge of Uncertainty](https://www-users.york.ac.uk/paul.cairns/pubs/Power_IJHCS_18.pdf), online September 10, 2018                                                                                                                                                                                      | A questionnaire study and small puzzle experiment distinguish forms of felt uncertainty. The participants and tasks do not establish an optimal random success rate or that confusion is enjoyable.                                                                                                                    | Evaluate understanding of choices separately from uncertainty about outcomes. Clear consequences and permitted explanations should survive even when the result is unknown.                                                |
| ST-R11 — [Shen, Hsee and Talloen, The Fun and Function of Uncertainty](https://ckhsee-game.oss-cn-hongkong.aliyuncs.com/papers/FunFunctionUncertainty.pdf), online 2018 / journal issue June 2019; [publication record](https://research.cuhk.edu.hk/en/publications/the-fun-and-function-of-uncertainty-uncertain-incentives-reinforc-2/) | Four experiments found uncertain incentives can encourage repetition in specific exercise, practice and purchasing tasks, with resolution-timing and initial-participation boundaries. Increased repetition is not proof of enjoyable play or healthy long-term motivation.                                            | Do not optimize roll counts or treat repeated attempts as sufficient success. Give repeated work an actual purpose, known cost and stopping conditions.                                                                    |
| ST-R12 — [Goodman, Perez-Liebana and Lucas, Seeding for Success](https://tabletopgames.ai/assets/pdf/Goodman2025SeedingForSuccess.pdf), 2025; [March 4 preprint record](https://arxiv.org/abs/2503.02686)                                                                                                                                  | Computational comparisons across fifteen tabletop games separate game randomness from agent decision variation. Weaker agents can miss strategic effects found by stronger agents. This does not measure human enjoyment or prescribe a universal curve.                                                               | Evaluate whole work loops with capable optimizers as well as ordinary play. Equal dice do not establish equal opportunities or sustainable resource economics.                                                             |
| ST-R13 — [Hertwig et al., Decisions from Experience and the Effect of Rare Events in Risky Choice](https://www.researchgate.net/publication/8438625_Decisions_from_Experience_and_the_Effect_of_Rare_Events_in_Risky_Choice), August 2004, author-uploaded paper                                                                           | In monetary choices, decisions from sampled outcomes differed from decisions using described probabilities; limited samples often missed rare outcomes. This is not a game-enjoyment study, and numerical disclosure alone is not a demonstrated cure for bias.                                                        | Provide permitted odds and meaningful consequence explanations. A few personal attempts cannot establish that a declared rare result is impossible or that a streak proves the rule changed.                               |
| ST-R14 — [Abuhamdeh, Csikszentmihalyi and Jalal, Enjoying the Possibility of Defeat](https://www.researchgate.net/publication/266145593_Enjoying_the_possibility_of_defeat_Outcome_uncertainty_suspense_and_intrinsic_motivation), online September 2014 / issue February 2015, author-uploaded paper                                      | Small undergraduate Wii-contest experiments linked closer controlled contests with suspense and replay preference. They did not test household chores, random crafting checks or an open persistent world.                                                                                                             | Give uncertainty a place in selected consequential choices. Do not use this as permission to add routine failures or secretly adjust live results to manufacture drama.                                                    |
| ST-R15 — [Banuri, Danková and Keefer, An Experimental Test of Gaming Incentives](https://ueaeprints.uea.ac.uk/id/eprint/97591/), 2024; [accepted manuscript](https://ueaeprints.uea.ac.uk/id/eprint/97591/1/Feedback_effort_draft_v15.0_clean.pdf)                                                                                         | A student decoding task found different repeated-effort effects under flat and piece-rate pay. Ceiling effects and a nonsignificant interaction limit broad conclusions about rewards and motivation. It is not evidence that points always harm intrinsic enjoyment.                                                  | Treat reward/progression incentives as their own design. Measure useful outcomes and participation quality rather than assuming a numerical reward makes repeated checks valuable.                                         |
| ST-R16 — [Thue et al., A Computational Model of Perceived Agency in Video Games](https://ojs.aaai.org/index.php/AIIDE/article/download/12437/12296/15965), October 9, 2011                                                                                                                                                                 | The randomized adaptive-versus-fixed agency comparison was nonsignificant. A favorable secondary regrouping did not establish improved fun. The abstract alone would overstate support for adaptation.                                                                                                                 | Preserve consequential choice directly. Do not claim that matching likely preferences or manipulating outcomes necessarily improves agency or enjoyment.                                                                   |
| ST-R17 — [Zhang et al., Effect of Input-output Randomness on Gameplay Satisfaction in Collectable Card Games](https://arxiv.org/pdf/2107.08437), July 18, 2021 preprint                                                                                                                                                                    | In a small eighteen-participant study, the input intervention added mystery cards outside the chosen deck; ordinary shuffling remained in all modes. Output-randomness effects were nonsignificant.                                                                                                                    | Protect the player's meaningful preparation. Do not generalize this narrow result into a law that all randomness before a choice is worse than randomness after it.                                                        |

The converging design lesson is to make uncertain action understandable and consequential. The evidence does not select 0–3 ranks, the two modifier categories, T, the careful-work ratio or any economic reward. Those remain explicit proposals. A successful prototype must demonstrate actual material outcomes, useful choices and affordable complete work, not just familiar dice or persuasive narration.

## 15. Alternatives, recommended decisions and remaining choices

**Keep predictable work as the starting recommendation.** If the chosen activity does not benefit from a new uncertain method, retain its dependable behavior. Authored competence can still affect a supported duration or technique and reward specialization. Uncertainty can later serve a useful risk, but does not earn inclusion merely by making repeated work vary.

**Use a d20 threshold or another curve.** A flat die makes equal additive increments easier to compare away from its boundaries and can suit worlds with different granularity. The reference 2d6 curve concentrates ordinary outcomes and makes preparation near the middle influential. Neither is inherently more realistic. Choose the experience and inspect the full distribution before adopting a profile; do not make creators learn several profiles to produce their first useful task.

**Add broad weighted stats or arbitrary dice expressions immediately.** This would increase expressiveness but make descriptions, balance, modifier interactions and meaningful outcome coverage harder to review. One useful competence effect can demonstrate authorship without a formula puzzle or unbounded random work. Expand only for a concrete activity that the simpler supported design cannot serve.

**Always make failure advance the goal.** Retained progress can keep play moving, but a universal rule would erase meaningful setbacks or invent resources. The reference partial retains real work; its setback spends time without completing a patch. Both can lead to a useful next choice. A failed chance need not grant a hidden reward or force a disaster for the scene to remain interesting.

The recommendation for adoption is a useful competence effect on one already worthwhile activity, with the simplest supported behavior that delivers its payoff. Keep exact disclosure conditional on knowledge, ordinary resolution free of model inference, and human choices and actual resources intact. The roof, 2d6 curve, two categories and helper role remain an optional worked candidate, rather than one package that must be built before the feature counts.

Before implementing a checked method, select its player purpose and consumer, explain the opportunity cost and meaningful recovery, and compare it with predictable work. If the roof candidate is selected, qualify its applicable actors/values, materials, positive T, fastening step, real influences and complete finishing behavior. The 2T relationship is an explicit tuning hypothesis; the no-setback result at +5 can remain a legitimate benefit of expertise. Neither requires adopting the candidate. Opposed contests need a separately justified activity before implementation.

The roof dependency applies only to the optional roof example. The existing typed-state foundation, another useful competence effect and other world openings need not wait for shelters or generalized dice. The product review changes the earlier first-consumer recommendation because a consistent worked example is not sufficient evidence of a desirable game feature. Keep the research and arithmetic available for a future decision; do not convert their completeness into implementation priority.

## Maintained records

- Package and sequence: [five product specifications](five-product-feature-specs.md).
- Design need: [ND03](../maintainers/needs-design.md#nd03--world-authored-stats-checks-and-their-effects). [ND04](../maintainers/needs-design.md#nd04--experience-shaped-personality-and-practical-skill-growth) retains numerical progression and personality policy.
- Existing delivery owners: [EWF02/EWF04](../maintainers/extensible-world-foundation.md), [INV](../maintainers/inventions-and-world-evolution.md), [AC08–AC10](../maintainers/action-capabilities.md) and [state contributions](../maintainers/state-contributions.md). No existing delivered checkbox is reopened or counted as completion of this consumer.
- Proposed scope and tuning: [authored-stat limits](../limits/authored-stats.md), alongside shared [state-effect](../limits/state-effects.md), [invention](../limits/inventions.md), [action-experience](../limits/action-experience.md) and [product-scalability](../limits/product-scalability.md) inventories.
- Current contracts: [state effects](../status-effects.md), [agency](../agent-agency.md), [world constitution](../world-constitution.md), [engine/world boundaries](../engine-and-world-boundaries.md) and [action experience](../action-experience.md).
- Related consumers: [editable shelters](editable-shelters-feature-spec.md), [continuing lives](continuing-lives-feature-spec.md), [attention and scenes](attention-and-scenes-feature-spec.md) and [world creation](world-creation-feature-spec.md).
- Technical design, implementation, playable balance and measured capacity remain open. This document qualifies a product proposal and its illustrative arithmetic, not shipped check behavior.
