# World-authored stats, checks and consequences — product and behavior specification

**Status: proposed detailed behavior, October 3, 2026.** This develops ND03. Typed attributes and state ownership already have implemented foundations; configurable contested checks and the complete behavior proposed here remain future work. Technical design is deferred. Existing action, state, knowledge, invention, world-policy and accounting owners remain authoritative.

## 1. The experience and recommendation

A creator should be able to define a meaningful competence or trait, explain what it affects, and see it change a supported action's real outcome. A player should understand why a check occurs, what preparation can change, what is at stake and what actually happened. An NPC should face the same authored rules while retaining its own goals, knowledge and choices.

The recommendation is **a small authored check family for consequential uncertainty in finite practical work**, with explicit prerequisites, a known result distribution, bounded modifiers and actual outcome behavior. Keep ordinary reliable work reliable. Add opposed contests only after the first family is useful and coherent. A dice interface without a real effect is not the feature; a fluent claim of success cannot substitute for one.

The first proposed consumer is a new **rushed roof-patch method**, following the shelter family's qualification. It offers a choice between careful predictable work and faster uncertain work. The check can save time, require finishing or produce a setback, while preserving actual materials and the same final patch behavior. It does not silently randomize all current crafting, fire lighting, recovery, movement or combat.

This choice makes the system's value testable. Skill changes the attractiveness of a method; preparation matters; failure has a concrete cost; and no outcome needs a model to invent a reward or rewrite physics. Later worlds can author different competences, dice profiles and consequences through supported families. The initial scale and curve are one world design, not the definition of all possible minds or realities.

## 2. Existing boundaries

The [accepted stat direction](../../archive/03-design-proposals/agents-and-social-simulation.md#player-designed-stats) permits authorized stat/effect authoring without hard-coded stat names. An ordinary action request does not authorize adding a stat. The [EWF foundation](../maintainers/extensible-world-foundation.md#ewf02--typed-state-providers-and-one-authoritative-value) supplies typed state and generic permitted presentation, while [state contributions](../maintainers/state-contributions.md) preserves one authoritative value and real sources/effects.

This specification adds product meaning to those foundations: when a check is warranted, how a selected value enters it, which outcomes are permitted, how participants learn the result and what retries mean. It does not reopen completed state work or claim that defining an attribute already implements checks.

Creator authority and a separately supported full-invention grant can authorize rule design within their scopes. Neither a stat name nor a model response grants that authority. Current permission support remains controlling. World rule authoring does not grant access to ungranted human-private values, histories or other people's funding.

## 3. Distinguish what a number means

| Kind of state | Meaning | Example | What it does not automatically do |
| --- | --- | --- | --- |
| Competence | Capability within an authored task domain | Practical craft rank | Grant a method the actor never learned, create tools or force wise choices |
| Bodily property | A supported physical characteristic | A world's strength measure | Overrule actual reach, mass, support or the relevant physical action owner |
| Resource | A quantity that can be gained or spent through real sources | Charge or mana | Become free because a roll succeeded |
| Temporary condition | A scoped influence with a cause and duration | Impaired grip from an admitted condition | Stack indefinitely under renamed copies or become permanent without its rule |
| Descriptive trait or belief | Authored characterization or a person's interpretation | Patient, suspicious, inexperienced | Force speech, consent, friendship or a private mind state on another person |
| Check result | The outcome of one actual admitted uncertainty | Patch secured; finishing required | Become a universal success permission or a new permanent stat |

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

### 5.1 Authored competence and modifier

The reference world uses an integer **Practical craft** competence from **0 to 3**: untrained, practiced, skilled and expert within the selected family. These descriptions explain a domain-specific scale, not a person's worth or overall intelligence. Applicable new actors receive an explicitly authored initial value; current characters are not silently reclassified or awarded ranks by their dialogue style.

For the reference check, add that rank to two independent fair six-sided dice and a net situational modifier from **−2 to +2**. The total modifier therefore ranges from **−2 to +5**. These are proposed tuning choices to qualify. Other stat names and supported scales can be authored, but a display range alone does not change the selected check profile.

The proposed outcome bands are:

- **10 or more:** complete the selected fast method cleanly.
- **7–9:** establish useful partial work that needs the declared finishing step.
- **6 or less:** the declared setback occurs; the intended completed effect does not.

Natural minimum/maximum dice have no separate automatic catastrophe or miracle in this profile. At sufficiently favorable modifiers, a setback can become impossible. That is an explicit consequence of the curve, not a reason to add a secret failure floor. If an author wants a different curve or rare failures, it must be a visible supported policy.

### 5.2 What one point changes

For fair independent dice, the exact distribution is finite and can be inspected without simulation or a model opinion. The table below is arithmetic for this proposed profile, rounded to one decimal percentage point. It is not evidence that these odds are enjoyable or balanced.

| Total modifier | Clean completion | Finishing required | Setback |
| --- | --- | --- | --- |
| −2 | 2.8% | 25.0% | 72.2% |
| −1 | 8.3% | 33.3% | 58.3% |
| 0 | 16.7% | 41.7% | 41.7% |
| +1 | 27.8% | 44.4% | 27.8% |
| +2 | 41.7% | 41.7% | 16.7% |
| +3 | 58.3% | 33.3% | 8.3% |
| +4 | 72.2% | 25.0% | 2.8% |
| +5 | 83.3% | 16.7% | 0.0% |

The curve makes skill and preparation consequential, especially near its middle. A one-point change does not have the same effect everywhere, and the middle-outcome probability can rise and then fall. Creator tools should show the resulting distribution rather than describing every +1 as the same percentage improvement.

### 5.3 The first actual consumer: a rushed patch

Let **T** be the authored positive work duration for the rushed patch under otherwise stable admitted conditions. It is a real world duration chosen by the method, not provider latency. The reference alternative, **careful patch**, takes **2T** and completes reliably when its actual prerequisites remain satisfied.

Both methods use the same appropriate patch materials and yield the same final supported repair. The rushed check distinguishes:

| Outcome | Actual work and resources | Actual shelter result |
| --- | --- | --- |
| Clean completion | After T, commit the normal patch transformation and its declared material use | The named section receives the ordinary completed repair |
| Finishing required | After T, retain the actual staged patch/material and offer a further T of ordinary finishing work | No completed-repair coverage is granted until that finishing work completes; progress is retained |
| Setback | T has elapsed; no finished patch is created. Unconsumed stock remains its actual material and unused holds release | The existing roof stays in its actual prior condition, including any independent weather or damage change |

The staged result is a real unfinished work state, not a second copy of the cloth. Finishing does not require another uncertainty check under unchanged supported conditions. If the person leaves, preserve the staged material and release only the permissions/holds that the work policy says may end; no indefinite reservation of someone else's inventory is implied.

A new event can invalidate any method: the target is removed, a needed support fails or a required tool becomes unavailable. Reconcile that event through the action owner. A successful check does not guarantee completion after prerequisites cease to hold, and a technical fault does not become a low dice result.

### 5.4 Why the careful alternative matters

The quick method should offer a choice, not compulsory gambling for basic shelter. A novice with no situational modifier has an expected **17T/7, approximately 2.43T**, to finish by repeating setbacks and completing each partial result, assuming unchanged conditions and immediate renewed attempts. At modifier +2 the same simplified calculation is **1.7T**. Careful work takes 2T under those assumptions.

These calculated examples explain the intended tradeoff: the novice can value certainty, while a skilled worker can often benefit from the faster method. They ignore changing rain, travel, contention, fatigue and opportunity costs, which can matter in actual play. No real money, throughput or measured player behavior is inferred from this arithmetic.

Both T and the 2T relationship remain proposed world balance. Qualification should ask whether time pressure is meaningful, whether partial work is understandable and whether preparation overwhelms competence. If the fast option dominates every real situation or is never useful, revise the openly authored tuning rather than secretly manipulating outcomes.

## 6. Preparation, assistance and modifiers

### 6.1 Bounded reasons, not bonus shopping

The initial practical-work family has two situational categories: **equipment suitability** and **working conditions/support**, each contributing −1, 0 or +1. Their sum supplies the −2 to +2 situation range. Each category recognizes at most one applicable favorable influence and one applicable adverse influence; the two cancel when both are present. Equivalent causes do not stack merely because they have several names or descriptions.

Ordinary appropriate tools satisfy prerequisites and contribute zero. An admitted improvement can supply the favorable equipment influence; an applicable impairment can supply the adverse one while the method remains possible. A required missing tool blocks that method instead of becoming a small penalty that luck can overcome.

The working category can recognize one genuinely participating helper or a qualified setup advantage, alongside an admitted difficulty such as unstable working conditions. Several spectators, repeated encouragement or ten equivalent decorations do not add ten bonuses. A truly different collaborative method can use a larger team after its own scope is qualified.

Every influence needs an actual source, applicable activity and lifetime. Destroyed, unequipped, expired or unreachable sources cannot keep supplying bonuses. An item's price, ornate name or generated adjective supplies no numerical advantage unless the admitted definition does. An authorized rule can deliberately make ritual meaning matter, but must identify how that cause becomes real in that world.

### 6.2 Assistance is actual participation

The initial rushed-patch method has one principal worker and at most one helper in its supported role. The helper must choose/accept the activity, be able to perform the role, reach the actual work and spend its required time. Being nearby or belonging to the same household is insufficient.

The helper's participation contributes through the working category, not by adding their entire competence again. Helping has an opportunity cost: they are unavailable for incompatible tasks. A human receives the actual request and makes their own choice. An NPC considers the request from its knowledge and goals; the scene cannot invent agreement to improve the principal worker's odds.

Show when help has become unavailable and what that means. A helper leaving does not cancel an already completed result or require a reroll. Before resolution, the method can continue without the benefit if still valid, or stop when the helper was a true prerequisite. Do not replace the missing helper with an invented anonymous resident.

### 6.3 Conditions over the work stage

For the reference method, the competence used is the applicable value at the start of the declared fastening stage. A later authorized competence change affects later stages/attempts, not a completed or already bound test. Rule revisions follow the existing live-change policy; they cannot rewrite old outcomes.

The initial family treats competence as the authored enduring rank. Temporary advantages use the two situational categories; temporary effects that rewrite the competence itself are not included. A later family adding them must define their lifetime across work explicitly, rather than preserving an expired bonus through an incidental snapshot.

Equipment and help must qualify throughout that stage to earn their favorable category. The reference method uses the least favorable applicable condition reached during the stage for a changing working condition; this is a deliberately conservative authored approximation. A momentary display flicker is not a world condition, and only the family's admitted causes/thresholds count. This avoids obtaining a whole-stage bonus by equipping an item or briefly joining at the final instant.

The creator can inspect that temporal rule and later author a different supported one for another method. It is not a universal rule for every check. If the conditions invalidate the action itself, use interruption rather than squeezing physical impossibility into the modifier range. A changed situation is not permission to discard an already resolved result and ask for a luckier one.

## 7. One attempt, one result, actual consequences

### 7.1 The attempt lifecycle

The human or NPC chooses a supported method from the actual situation. Before work, the interface presents permitted stakes and prospects, never a preview of future dice. Starting binds the intended task, target, applicable rule and actual work. The actor performs the required stage. The check resolves once when that stage reaches its declared outcome point and the relevant action is still admissible.

In the reference patch method, randomness is resolved at the end of the first T work stage. No dice result is revealed before that stage is earned. Canceling earlier preserves actual partial effort/state under the action rule and yields no sample to inspect. It is not an economical way to search future outcomes. After resolution, reconnecting or reopening the result shows that same outcome.

Commit only the actual supported outcome and its coupled material/state changes. If a required write or action is not valid, the product cannot display completed repair while failing to use its material, or consume material while creating no declared result. Technical failure preserves the last valid work/result state and follows recovery; it is not a fictional setback.

### 7.2 Retry means another real attempt

An unchanged request, new wording, double click, connection retry, caption replay or provider continuation does not create a new attempt. A completed result remains part of history. A staged partial result offers its finishing path; asking “try harder” does not turn it into a fresh free roll or a second patch.

A new attempt can be legitimate after a setback when the actor deliberately spends the method's actual time and resources again. Conditions need not change if repeated physical effort is itself a supported opportunity. The product must distinguish that from relabeling the same request. If a particular family models a fixed unknown property, such as whether an existing document contains a clue, retries do not rerandomize that property.

Some actions warrant retries only after new information, equipment or a changed situation. The authored family must say so, and the player should have a useful explanation. Do not impose one arbitrary global cooldown on every kind of uncertainty, or let a renamed target evade a family's actual attempt boundary.

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

The first candidate is a bounded control contest over a movable held object, **only after the physical action, participation and custody effects are supported**. Both must be eligible to exert the relevant action; the shared outcome can change actual custody once, preserve it, or end without transfer. Title remains governed separately. The check cannot put the same object in both inventories, cause remote theft or bypass the world's protected participation rules.

On a tie, custody remains as it actually was and elapsed effort remains spent. Participants may make a new real choice, release the object or deliberately begin another supported attempt. Interruption by a third actor or changing geometry is a real event, not a reason to finalize a prewritten winner. Contests with more participants require a separately designed family, not an all-pairs tournament invented by the resolver.

### 8.3 Social uncertainty and consent

A persuasive request can affect an NPC's supported appraisal or willingness to consider an offer; it does not create an accepted purchase, promise, affection or human answer by itself. Some requests are willingly accepted without a roll; some are refused because they conflict with actual priorities or possibilities. A check is useful only in the remaining supported uncertainty.

The initial practical-work family does not implement persuasion, seduction, coercion, fear or relationship scoring. A future social family must define what is uncertain, whose independent decision remains, which evidence matters and what actual outcome is permitted. It must preserve existing memory-based relationship descriptions and human control. A new charisma field cannot supply these behaviors by naming them.

Even in an explicitly authored supernatural world, mind-affecting capabilities require their own admitted scope and participation/privacy rules. This feature grants no general permission to access private thoughts or force humans to speak, consent or act. Statistical competence is not control authority.

## 9. Feedback, knowledge and accessible play

### 9.1 Explain the action before the arithmetic

The primary feedback is what changed: the patch is secure, the material is staged and needs finishing, or the attempt used time without completing the repair. Show remaining useful actions and actual material state. A dice animation can accompany the result but is not the authoritative evidence or the only accessible presentation.

For a human who wants detail, provide the permitted competence, applicable influences, selected rule, roll and outcome band in an expandable readable explanation. Keep arithmetic optional, keyboard accessible and available after transient feedback ends. Color, animation speed, sound and hover cannot be the only ways to understand success or a remaining obligation.

Do not force an extra modal for every roll or interrupt unrelated conversation with a full character sheet. A clearly chosen method can proceed and report its result through existing action/status surfaces. Longer-term comparisons and creator rule inspection can use the established Work/inspection surface.

### 9.2 Exact odds when the character is allowed to know them

For a transparent practical task whose relevant facts are known, the player can inspect exact probabilities for the selected method. If important inputs are genuinely unknown or private, do not expose an exact computed percentage that reveals them. Provide a scoped estimate or say the outcome is uncertain and explain the known factors.

The underlying event still follows its actual rule. A less precise player forecast does not change the dice. Another observer may see the physical outcome without learning the worker's private competence, every modifier or the roll. Creator definition inspection similarly does not grant access to every participant's private values.

An informative failure can teach only what the attempted action actually exposes. Failing to persuade someone does not reveal their hidden motive. Failing to find a clue does not manufacture a false fact. Unsupported uncertainty should remain a gap rather than an omniscient explanatory sentence.

### 9.3 NPC reasoning and learning

NPCs receive useful permitted action consequences and prospects through the same knowledge/action owners as other activities. They can prefer careful work, accept risk under pressure or ask for help. A high competence does not make an NPC omniscient or force the best expected-value choice; character priorities and limited evidence still matter.

The service model used to choose an action is separate from the fictional stat. Spending more on optional reasoning does not raise the roll modifier, and budget pressure does not silently lower a character's skill. A finished check needs no new generative explanation unless one is useful and admitted.

Observed success/failure can become actual experience and evidence. This specification grants **no automatic numerical skill gain, experience-point award or personality rewrite**. ND04 and [action experience](../maintainers/action-experience.md) retain their respective progression and learning responsibilities. Repeating cheap checks cannot farm progression that this feature never promised.

## 10. Authoring the rule without programming

### 10.1 Define meaning and applicability

The creator describes the desired distinction: for example, practiced craftspeople should be more reliable when making a quick patch. The World Agent identifies an existing compatible competence/check family or explains the missing support. It should not create another stat for every synonym or infer that an existing appetite meter is an appropriate craft skill.

The reviewable definition explains the name and domain, applicable actors/actions, range and scale, initial values or explicit absence behavior, who can inspect/change values, and what can legitimately change them. A displayed stat may be descriptive only, but the interface must make that clear. A claim that it improves crafting needs an actual supported consumer.

An ordinary player can propose an idea or ask about a rule without acquiring creator powers. When creator or special-invention permission is required, use that existing authority. No natural-language phrasing, uploaded rule description or unknown field can bypass the boundary. A world rule cannot authorize itself to ignore current locks or external accounting.

### 10.2 Bind one meaningful action

For the first family, choose one competence and one finite work method, its actual prerequisites, duration, result profile and outcomes. The tool should explain whether it is defining a new uncertain method or changing an existing one. Default to adding the explicit optional fast method; do not replace the careful/native route incidentally.

Show how each possible outcome affects time, resources, work progress and the target. Outcomes must cover the complete supported result range without gaps or contradictory simultaneous effects. A proposed low roll that destroys a material needs a real destruction outcome and appropriate stakes; the author cannot merely write “something bad happens” and delegate unlimited harm to narration.

The initial supported curve is the finite two-die practical-work profile. Arbitrary weighted multi-stat formulas, exploding dice, open-ended reroll chains and unbounded pools remain outside this first scope. A creator can request another supported profile or keep a broader design as a draft. Arbitrary creativity is an authoring goal, not a promise of an already implemented general rule language.

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

The first family creates no bonus loot, currency, skill points or extra materials for a high roll. More efficient work can still have real economic value: a skilled resident can free time for other tasks. That benefit must arise from actual work, knowledge and available inputs, not a background summary granting production beyond its resource supply.

### 11.2 Avoid per-step randomness and reaction storms

Use one check at a meaningful admitted stage. Do not roll once per frame, knot, sentence fragment or observer. A task's T duration does not create a stream of independent chance events merely because the simulation processes time in smaller pieces. Distinct legitimately risky stages can have distinct checks only when the authored method specifies their real stakes and bounded work.

One shared result can supply appropriately scoped evidence to multiple observers. It need not cause a fresh model response, permanent autobiographical paragraph and social appraisal in everyone nearby. Preserve actual consequential learning and obligations through existing attention/memory owners, with optional interpretation selected for relevance.

Dice resolution and basic result explanation can be ordinary admitted computation. They do not require paid generative inference or a purchase of new luck; they still contribute to the world's real execution workload. Expensive semantic interpretation belongs at a useful authoring or decision boundary, not in the repeated mechanical roll.

### 11.3 Bound the surrounding work

Cost can grow through available actions, modifier sources, eligible participants, outcome effects, retries, histories and repeated probability previews. Select relevant supported sources before expensive interpretation. The first two-category/one-helper family gives a concrete qualification scope without claiming a universal limit on all future group work.

Use actual world/action capacity admission before accepting unsupported new work. Repeated authoring variants share the existing objective and funding scope; repeated world actions retain their actual costs and consequences. Do not silently lower competence, alter dice or omit a loser's effect under load. Required-service failure uses the existing coherent operational boundary.

Observe which choices players actually make and why. Excessively forgiving failure can turn a risky method into the only rational option; excessive setbacks can make a skill system feel like mandatory delay. Published expected time is useful but incomplete: deadlines, risk tolerance, available helpers and current needs can change what is worthwhile. Tune disclosed rules from those cases rather than assuming one expected-value optimum supplies good play.

### 11.4 Streaks and assistance should remain honest

Fair independent dice can produce streaks. The reference rule does not secretly modify outcomes after success or failure, even to make the sequence feel fairer. If a future world offers an explicit assistance/luck policy, it needs a disclosed scope, interaction with every affected participant and a separate probability/economic review.

A paid model tier, a subscription, a new device, repeated reloads or attention changes must not buy a better random outcome. Funding may support more legitimate optional activity, as described by the continuing-lives policy, but equal admitted tests use the same world rule. A service problem is never explained as a character's bad luck.
