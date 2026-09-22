# Agent agency: thoughts, intentions, plans and open-ended action

**Specification status:** target behavior, not a statement that the runtime implements it. Delivery and acceptance belong to the [agency tracker](maintainers/agent-agency.md). The [runtime contract](../archive/07-technical-architecture/agent-agency-runtime.md) owns serialization, admission, scheduling and execution details.

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

A need is a native bodily condition. A desire is something the actor wants or imagines. A maintained goal is something the actor has chosen to keep pursuing across decisions. A plan is a proposed means of doing so. A running action is the authoritative work currently being performed. A social commitment is an obligation established by the relevant social rules. These distinctions allow each to change without pretending that the others changed too.

Hunger does not require creating “Satisfy hunger” every time it changes. Eating an available berry can be a native or immediate response with no durable goal. “Keep enough food for tomorrow” is a good candidate for a persistent goal because it matters beyond the present stimulus. “Understand why the shelter leaks” is also a goal, although its next useful action may be investigation rather than construction.

For example, a hungry actor carrying an edible berry may choose “Eat one berry” through Jev alone. After normal engine checks, native execution consumes the berry and applies its nutrition effect. No goal, written thought, speech, reflection or generative explanation is required. When native survival already handles eating adequately, even Jev is unnecessary. The [level-1 runtime contract](../archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation) defines selection and admission.

### What persists

Operational goals retain a short actor-authored objective, lifecycle state, relative priority and links to relevant plans or evidence. They can optionally identify a parent intention, a review cue or a supported completion condition. None of these optional links requires an actor to maintain a rigid hierarchy of all its motivations.

The actor may maintain several goals, including competing ones. An active goal can be temporarily blocked without being abandoned. A paused goal remains recallable. Completing a subgoal need not complete its parent. Achieving a goal can make other means unnecessary: receiving food can remove the reason to hunt now without erasing a longer-term interest in making a bow.

The engine may verify an observable condition such as possessing a crafted item. For subjective objectives such as “Make peace with Ada,” the actor may decide that it is satisfied, but that self-assessment is not proof of Ada's feelings. Store the distinction between actor-declared completion and engine-evidenced satisfaction.

### One operational source of truth

Accepted inner-world prose continues to hold identity, values, relationships, feelings and broad aspirations. No prescribed collection of belief or goal files is introduced. The active operational goal list has one authoritative owner; its prompt/UI representation is derived from that owner. Do not maintain independently writable copies in `actor.goal`, `actor.goals`, mind facets, a planner scratch file and a new queue.

Creator-authored initial goals seed the actor once. They are not reapplied at each cognition opportunity and do not prevent later revision. Historical initialization can remain part of provenance. Existing backstory and identity protection are not removed just because current goals become actor-maintained.

Changing a goal stops admitting further steps for an abandoned plan, but cancellation of work already in progress follows the native action's cancellation rules. It does not refund consumed resources by rewriting a sentence. Abandoning a private goal also cannot erase an outstanding promise to another actor.

A long-running action must not block meaningful reconsideration. For example, hunger during a day of house-building can make food the immediate pursuit and suspend the house plan without abandoning the longer-term goal. The actor can revise its foreground goal/plan and explicitly interrupt work; native emergency protection may also interrupt under its own policy. After eating, reconsider the suspended work against current conditions before resuming. The [physical work contract](../archive/07-technical-architecture/agent-agency-runtime.md#43-do-not-loop-executecommand-over-multiple-timed-actions) governs interruption and retained progress.

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
