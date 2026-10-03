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
