# Agent agency: thoughts, intentions, plans and open-ended action

## Current embodied-survival integration

Ada starts with authored identity and factual body knowledge, without an operational goal or fallback survival slogan. Private bodily opportunities, scoped possessions and actual outcomes enter decisions. Installed capabilities describe what a tool can do; active goals and admitted interests determine relevance without a native hunger-to-food/tool/animal mapping. Automatic person-controller eating/berry seeking and their food-specific cognition protection are removed.

Known choices can execute through Jev selection and ordinary native admission. An offered exact equip-then-strike sequence is one selectable means, not an automatically assigned goal. Completion or failure supplies new private evidence naming each completed or blocked command and its recorded outcome. A miss remains an unsuccessful attack outcome even when the chosen attempt has finished; no bare sequence-completion marker stands in for those details. Intermediate movement and plan steps need no model call. Jev-only mode cannot invent novel goal prose. [Complete meals](verification/embodied-survival.md#complete-jev-only-meals) now have actual evidence through separate choices after each outcome; this is not a reusable learned method or automatic food plan. [Provider policy](ai-providers.md#jev-only-execution), [the implementation plan](projects/embodied-survival-tech-design.md), and [AG13](maintainers/agent-agency.md#ag13--embodied-survival-demonstration) track demonstrated Jev-only meals and remaining broader qualification.

Possessions use shared immutable definition descriptions plus current quantity/equipment. Required tool references survive optional selection. Explicit `inspect-inventory` reads own accessible items in revision-bound pages, with no automatic paid pagination. Oversized inventory preparation retains a disclosed page and bound tools so inspection remains possible; it does not claim exhaustive semantic search. [CG04](limits/cognition.md#cg04) records bounds and measured remaining scan cost.

## Spatial movement dependency

Plans reference the [spatial destination and native route contract](../archive/07-technical-architecture/spatial-world-runtime.md). A blocked route, inaccessible stance or flying target can change the current means without deleting a goal. Native traversal and level-1 selected actions share fresh spatial admission; navigation/cache preparation is not an invented action or a mandatory LLM decision. [SW05–SW08](maintainers/spatial-world.md) supplies ground integration; flight-specific cases add SW12 only.

**Specification status:** target behavior, not a statement that the runtime implements it. Delivery and acceptance belong to the [agency tracker](maintainers/agent-agency.md). The [runtime contract](../archive/07-technical-architecture/agent-agency-runtime.md) owns serialization, admission, scheduling and execution details.

Agency is the standard operational-controller contract, not a requirement that every organism maintain verbal thoughts or goals. [Engine/world boundaries](engine-and-world-boundaries.md#8-minds-agency-and-behavior) allows other compatible controllers while preserving native authority and the existing player/actor permission boundary.

Future admitted mental effects require a [dedicated target-owner operation](../archive/07-technical-architecture/world-module-runtime.md#fictional-mental-effects-and-operational-ownership). Ordinary self-authored goal operations remain actor-bound and cannot be forged by another actor; no compulsion is enabled.

## 1. Purpose and ownership

An actor should be able to notice an opportunity, have an idea, decide to pursue it, try something not listed in a menu, and adapt to what actually happens. An action shortlist helps the actor choose; it does not define the limits of the actor's imagination. The engine remains the authority over permitted operations, physical effects, resource use and time.

This document owns the behavioral meaning of a decision, optional response composition, operational goals and plans, and the character-side experience of proposing a new method. It does not replace [memory architecture](memory-architecture.md), [conversations and narration](narration-and-conversations.md), or [declarations and world evolution](../archive/07-technical-architecture/declarations-and-evolution.md). Those remain the owners of memory/awareness, communication/narration, and mechanical invention/admission respectively. The technical contract divides responsibilities beneath this behavioral specification rather than defining a second behavior system.

The desired result is **expressive proposals plus persistent, revisable pursuit plus trustworthy consequences**. It is not an LLM interpreting arbitrary prose as executable physics, and not a new requirement that every animal think in words.

## 2. A decision may produce nothing, one thing, or several things

At an admitted cognition opportunity, an actor may speak, attempt actions, have private thoughts, create or revise goals, arrange a plan, or propose an invention. Any combination is allowed. Each category can occur more than once within the response's advertised total limits. There is no required thought, explanation, utterance, action, goal or plan.

An empty response means **no new intervention**. It does not cancel ongoing work, clear goals, mean the actor perceived nothing, or constitute a provider failure. An actor gathering useful material can continue gathering while declining to narrate another thought about it. Declining an invitation can be an utterance without a plan. Quietly changing a personal objective need not produce a public event.

Multiple requested actions are not simultaneous completed actions. For example, an actor may choose to gather material, prepare a binding and craft an item in one decision, but the body performs the necessary work in sequence. The runtime distinguishes requesting a sequence from starting each action and from completing it. Speech and a private thought can accompany work where the actor's capabilities and the current activity permit it.

### Mental and external operations

The conceptual distinction is visibility and authority, not an inheritance hierarchy called `Action`:

| Kind                    | Meaning                                                                                              | What it does not imply                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Private thought         | A brief character-authored interpretation, hypothesis, feeling or observation of its own mental life | A public event, a new world fact, or the model's hidden reasoning trace                    |
| Goal operation          | A choice to maintain, revise, suspend, finish or abandon an intention                                | A promise to someone else, successful execution, or a mandatory task for every bodily need |
| Plan operation          | A revisable choice of means and a small executable next portion                                      | A prophecy, a globally valid schedule, or permission to control another actor              |
| Invention proposal      | A proposed purpose and method submitted for the world's existing invention process                   | An installed mechanic, a learned skill, a spawned object or a commitment to build          |
| External action attempt | A request for the actor to do something in the world                                                 | Permission to bypass mechanics or claim the desired result                                 |
| Speech                  | An external communicative act processed by conversation and perception rules                         | Guaranteed hearing, understanding, agreement, belief or fulfillment of a promise           |

Speech can therefore be an external-action subtype in the domain without losing its specialized conversation APIs or presentation. A physical action may create an audible event without being speech. Thinking remains private even though it changes stored actor state.

A character is allowed to be mistaken or dishonest. “I built a bow” can be a lie in dialogue; it cannot become a `crafted` receipt or create an item. A belief about another character is not that character's private state. The engine validates the authority and consequences of an operation, not the objective truth of every fictional thought.

## 3. Goals are useful structure, not the whole mind

Use **goal** in player-facing language and **intention** when it helps distinguish maintained pursuit from passing desire. These refer to the same operational record, not two databases.

A need can concern the body or a psychological dimension of the authored person, such as contact, belonging or enjoyment. Current native bodily conditions already have world-owned mechanics; broader psychological need behavior is an [accepted product target with open integration work](projects/compelling-characters-feature-spec.md#needs-experience-and-choice), not a claim that new meters are implemented. A desire is something the actor wants or imagines. A maintained goal is something the actor has chosen to keep pursuing across decisions. A plan is a proposed means of doing so. A running action is the authoritative work currently being performed. A social commitment is an obligation established by the relevant social rules. These distinctions allow each to change without pretending that the others changed too.

Hunger does not require creating “Satisfy hunger” every time it changes. Eating an available berry can be a native or immediate response with no durable goal. “Keep enough food for tomorrow” is a good candidate for a persistent goal because it matters beyond the present stimulus. “Understand why the shelter leaks” is also a goal, although its next useful action may be investigation rather than construction.

For example, a hungry actor carrying an edible berry may choose “Eat one berry” through Jev alone. After normal engine checks, native execution consumes the berry and applies its nutrition effect. No goal, written thought, speech, reflection or generative explanation is required. Once an eating action is chosen, its execution needs no further inference. This world no longer chooses feeding through a native person controller. The [level-1 runtime contract](../archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation) defines selection and admission.

### What persists

Operational goals retain a short actor-authored objective, lifecycle state, relative priority and links to relevant plans or evidence. They can optionally identify a parent intention, a review cue or a supported completion condition. None of these optional links requires an actor to maintain a rigid hierarchy of all its motivations.

The actor may maintain several goals, including competing ones. An active goal can be temporarily blocked without being abandoned. A paused goal remains recallable. Completing a subgoal need not complete its parent. Achieving a goal can make other means unnecessary: receiving food can remove the reason to hunt now without erasing a longer-term interest in making a bow.

The engine may verify an observable condition such as possessing a crafted item. For subjective objectives such as “Make peace with Ada,” the actor may decide that it is satisfied, but that self-assessment is not proof of Ada's feelings. Store the distinction between actor-declared completion and engine-evidenced satisfaction.

### One operational source of truth

Accepted inner-world prose continues to hold identity, values, relationships, feelings and broad aspirations. No prescribed collection of belief or goal files is introduced. The active operational goal list has one authoritative owner; its prompt/UI representation is derived from that owner. Do not maintain independently writable copies in `actor.goal`, `actor.goals`, mind facets, a planner scratch file and a new queue.

Creator-authored initial goals seed the actor once. They are not reapplied at each cognition opportunity and do not prevent later revision. Historical initialization can remain part of provenance. Existing backstory and identity protection are not removed just because current goals become actor-maintained.

Changing a goal stops admitting further steps for an abandoned plan, but cancellation of work already in progress follows the native action's cancellation rules. It does not refund consumed resources by rewriting a sentence. Abandoning a private goal also cannot erase an outstanding promise to another actor.

A long-running action must not block meaningful reconsideration. For example, hunger during a day of house-building can make food the immediate pursuit and suspend the house plan without abandoning the longer-term goal. The actor can revise its foreground goal/plan and explicitly interrupt work; native emergency protection may also interrupt under its own policy. After eating, reconsider the suspended work against current conditions before resuming. The [physical work contract](../archive/07-technical-architecture/agent-agency-runtime.md#43-do-not-loop-executecommand-over-multiple-timed-actions) governs interruption and retained progress.

### Whole-character behavior

[Compelling characters](projects/compelling-characters-feature-spec.md) makes the connection between inner experience and actual pursuit explicit. Bodily relief, meaningful contact, disappointment, enjoyment or a changed interpretation must be able to affect what the character chooses next. A completed purpose must not regenerate indefinitely from old prompt text. Useful repetition, quiet pleasure, independent interests and credible refusal are legitimate; random novelty and a perpetual hunt/cook cycle are not substitutes for a life.

[CE04/CE05](maintainers/character-experience.md) coordinates the relevant AG/CR/ACT/world work and [complete episode evaluation](projects/compelling-characters-feature-spec.md#complete-behavioral-flows). This is an early product target with open qualification, not a new planner, mandatory thought loop or permission to control a human character. AG12 remains the behavioral/cost owner; its actual evidence must connect a permitted experience to chosen activity, real consequences and later continuation or stopping.

## 4. Plans preserve continuity without prescribing a life

An actor can plan only as far as is useful. Preserve a brief approach and a bounded **next portion of the plan**, rather than expanding an entire imagined future into hundreds of actions.

A plan may contain ready actions, a short sequence with success dependencies, or a wait for an actual result. Unknown portions remain unknown. “Find suitable binding material” need not already identify the exact bush. “Ask Ada for help” cannot include a fabricated step in which Ada agrees. A future intention can survive while its current approach is blocked or replaced.

Execution resumes from actual action receipts and new observations. No model call is required to repeat a still-valid native work step. Reconsideration is useful when a relevant assumption fails, a better opportunity appears, the actor changes its mind, an awaited result arrives, or an adopted review cue is reached. It is not required for every tick, every footstep, or every newly stored thought.

Once the actor knows a technique, native bookkeeping may enumerate the missing inputs for that technique. This is not the world inventing the technique for the actor. Before the method exists or is learned, a generic resource planner must not disclose its solution from a hidden recipe catalogue.

Plans may be useful without being optimal. Actors can pursue aesthetic, social, exploratory or eccentric goals, not just maximize nutrition. The engine's authority over possible actions is separate from the controller's preference for sensible behavior. Prototype survival prioritization is a controller policy, not a claim that hunger makes all other thoughts physically impossible.

## 5. Trying something outside the shortlist

The actor can describe a desired attempt in ordinary language, with relevant known targets and a proposed method where available. The application resolves the attempt into one of the supported outcomes defined in the runtime contract.

Often no new mechanic is needed. “Get closer to the branches so I can collect them” can ground to movement and gathering. A different verb does not by itself justify a new permanent action definition. Conversely, renaming “gather” cannot make an unsupported action work: “Gather a mountain into my pocket” still lacks a permitted physical implementation.

When an attempt needs new mechanics, it can become an invention request. When it needs an unknown prerequisite, it can become an investigation or clarification. When the engine does not support the requested capability, the result says so without inventing success. A temporary obstacle, an unknown fact, a forbidden world premise and an unsupported engine capability are different situations.

This open route is available even when the immediate feasible-action shortlist is empty or was omitted as irrelevant. It is subject to normal actor capability, scope, budget and policy limits. A routing or attention model selecting existing candidates is not authorized to abolish the proposal route.

The initial approach option moves once to a reachable location near a currently perceived entity, using the existing native movement command and body admission. It is available independently of hand/tool capability. Targets sharing a destination remain distinct choices. The offered description must distinguish this from continuously following a moving entity; the separate native visual-follow activity now maintains proximity until cancellation, interruption or lost sight. Richer tracking senses, stealth and formation relations remain later work.

An expressive fallback is not a loophole. The system must not replace an unsupported consequential action with prose that claims it happened. A nod may be a supported expression. Building a bridge cannot be rendered as a completed, effect-free “expression” when no bridge was built.

## 6. Actor-led invention

The actor supplies the idea and proposed method; the world evaluates it through the shared invention workflow. The world may help clarify what the actor is proposing, but it does not quietly solve the invention and attribute that solution to the actor.

### 6.1 The actor proposes a mechanism

Actors may speculate from general model knowledge, guided by their profile description, traits and backstory. Describing a character as weak at mathematics is sufficient initial behavioral guidance; it makes sophisticated invention less likely rather than enforcing a hard knowledge boundary. No separate technology-era or intelligence gate is required initially. Speculation must not masquerade as observed, taught or privately retrieved game knowledge, and every proposed method still passes the shared world/capability validation.

An initial thought may be as incomplete as “I need a way to hit prey from farther away.” A request to invent can carry purpose, intended operation, proposed materials and construction steps, including uncertainty. Supplying a complete proposal in the first decision avoids a mandatory extra model call.

When the proposal is incomplete, a bounded private continuation can ask a neutral question such as “How do you propose to make it?” The answer comes from the actor's permitted context and hypotheses. The prompt must not contain an omniscient answer such as “The correct recipe is wood and cord; now rediscover it.”

The clarification is an application interaction, not necessarily an audible conversation with a god. It creates no witnessable scene unless a separate in-world communication actually occurs.

### 6.2 The world validates without becoming an answer oracle

The actor should recognize its own proposed method in the result and be able to accept, revise or decline a substantive substitution. Validation feedback is not lived evidence that an experiment occurred. [Actor-authored methods and private invention](../archive/07-technical-architecture/declarations-and-evolution.md#actor-authored-methods-and-private-invention) owns compiler fidelity, scoped feedback, authority and the shared request outcomes. NPCs gain no creator workshop or god-mode permissions through this flow.

### 6.3 Four separate results

A method can be admitted as an executable definition. An actor can learn or originate that method under discovery rules. An item can later be crafted through work and resource consumption. Proficiency can change only through whatever learning/skill mechanics actually exist.

None is a synonym for the others. An actor can conceive a difficult design it cannot yet make. The runtime must not invent a universal crafting-skill rule where the current family has none; later proficiency requirements belong to the relevant mechanical family and learning design.

An admitted idea need not become public. The inventor receives an actor-scoped result. Other actors learn through authorized teaching, observation or other supported channels, not by hearing the global registry update. Definition reuse and intellectual authorship also remain distinct: installing equivalent mechanics once does not require disclosing another actor's private discovery.

### 6.4 What happens after invention

A resolved invention provides a new cognition opportunity, not a compulsory goal or craft command. Three normal outcomes are possible:

- The actor chooses to pursue the result now, perhaps creating a goal and a plan.
- The actor learns it but does something else, keeps it for later, or abandons the original idea.
- A previously and explicitly authorized plan continues through its next eligible native step after fresh checks; another model call is unnecessary solely to repeat that authorization.

The third case requires genuine prior intent. The mere act of submitting a design is not advance permission to consume resources or build an item. The system coalesces the result with other relevant new information rather than automatically creating a separate expensive deliberation for every stage of authoring.

## 7. Worked example: hunger, prey and a bow

This is a behavioral scenario, not a canned recipe or a required route for every hungry actor.

**Opportunity.** The actor notices its fullness declining and perceives prey. It may eat food already in its possession, continue an adequate native food-seeking action, ask someone for food, or consider a longer-term solution. It need not wait until an emergency threshold before thinking ahead.

**Idea.** The actor thinks a flexible branch and a tensioned binding might propel a projectile. It can submit that proposed mechanism immediately, or first request invention and supply its method after neutral clarification. A bow alone is not assumed to solve ammunition, hunting, harvesting, cooking or eating.

**Validation.** The invention service checks the proposal against the supported launcher family, known/permitted material references and world policy. “Fiber” is not silently replaced with finished cord if that changes an essential construction step. Any necessary preparation must be known or proposed. Unsupported assumptions return honestly. The engine does not spawn a bow when it accepts the design.

**Optional commitment.** On receiving the accepted technique, the actor can adopt “Make a hunting bow” as a goal, keep only a short next plan portion, or decide its hunger makes immediate foraging more useful. It may also maintain “Improve our food supply” as a broader aim. No forced goal-setting call is inserted.

**Execution.** The actor gathers reachable material, performs supported preparation and crafts through the native action system. Actual receipts update plan progress. Another actor taking the material, a path becoming unavailable or a change in the actor's priorities may block or redirect the next step. The actor does not keep issuing all future commands from an outdated prompt.

**Use and revision.** A usable bow still requires a supported projectile and a valid hunt. A missed shot is an outcome, not a reason to rewrite the previous shot as successful. Obtaining food may finish the immediate need-related pursuit while leaving longer-term intentions intact. A poor result can motivate practice, a different method or abandoning the approach.

The same loop applies to a proposed shelter repair, a carrying device or a signaling technique when their trusted families exist. A boat is not automatically supported merely because the actor can describe one; buoyancy, containment and propulsion would need appropriate admitted mechanics.

## 8. Attention and initiation

Attention receives both bottom-up opportunities and top-down interests. A loud event, a change in need, an awaited result, an unfinished conversation or a material relevant to an adopted plan can matter. Evidence must first be perceptible or otherwise available to this actor; relevance never creates access.

The current task, active physical work, important obligations and new relevant results should not disappear because a large collection of decorative objects consumes the context budget. Nor should the current goal monopolize attention so completely that the actor ignores danger, counterevidence or an unexpectedly good opportunity.

An internal goal edit can refresh derived interests without causing another LLM call immediately. A newly stored private thought does not automatically become its own significant-event trigger. An actor can hold a stable intention for a long time without constantly rephrasing it.

Physiological urgency should protect timely native behavior. It should not categorically prevent a conscious actor from considering a solution when the native controller has no adequate one. Incapacitation and lack of a granted cognition capability remain different from hunger. Exact need bands and reminder cadence remain owned by the existing cognition policy and open decision D54.

## 9. The intended 80/20

The first useful system needs optional decisions, private persistent intentions, a short revisable plan, an open attempt route, actor-led proposals into the existing invention authority, and feedback that can change later behavior. These provide a practical approximation of continuity, anticipation and adaptation without simulating a brain.

Do not make that release wait for a universal utility model, full belief logic, learned reinforcement policies, a new distributed event broker, arbitrary generated code, universal skill simulation or detailed neural modules. Ordinary animals may remain inexpensive native actors. Cognition-enabled animals use their granted capabilities and embodiment rather than acquiring human anatomy or speech by implication.

The [research archive](../archive/02-research/agency-cognition-and-planning.md) explains the inspirations and their limits. Its psychological analogies are not claims that the implementation reproduces human or animal consciousness.

## Maintained records

- Implementation: [Agency tasks](maintainers/agent-agency.md); [cognition tasks](maintainers/cognition-redesign.md).
- Limits and constraints: [Cognition and action selection inventory](limits/cognition.md).

## Learned activities and action history

The existing plan can now execute a personally acquired finite nested method and expose only its remaining work at reconsideration. Actual native outcomes, partial products and committed costs remain recorded across interruption and restore. [Action records and learned activities](action-experience.md) owns learning, shared structure/private support, projections and limits; its delivery does not close every broader agency lifecycle or capability target.

## Explicitly chosen one-session activities

An installed closed request can select a finite activity through the existing plan and physical action lane. Choosing it is separate from adopting a goal, learning its method or choosing to repeat it later. Idle/no-new-work choices and other supported actions remain available. Current automatic method learning remains an eligible NPC's optional retention decision; no camp goal or successful method is preloaded.

A chosen watch preserves its absolute stopping time, actual receipts, independent attempt/spending counters and interrupted-attendance record across suspension and current-format restart. A suspended native fuel step restarts as a new attempt without refunding committed costs or replaying completed transfers. Private remaining-work text and one terminal report disclose the chosen deadline, actual attempts and spending, any interrupted attendance and retained transfers. Stop cancels remaining attendance through the existing action owner; a unit already taken from a cache remains a real possession. [Action records](action-experience.md#selected-execution-and-inspection) owns these control and evidence details.

The first bundled camp watch refuses enqueue while the actor has active or blocked work. Its deadline cannot grant authority to cancel unrelated queued work. Adding unrelated queued work while a watch is active is also refused: the actor must finish that watch or explicitly choose replace or interrupt under the existing cancellation/suspension rules. This is a scoped first-watch restriction, not a general prohibition on enqueuing finite activities. [Camp routines](worlds/base/camp-routines.md) owns the authored behavior; [PW10](maintainers/parallel-batch-01-playable-week.md#pw10--chosen-camp-activities-and-reusable-finite-methods) retains browser, voluntary choice/retention/reuse and integration acceptance. No broad autonomy or learning project is closed by this slice.
