# Design follow-ups — user steering

This file preserves subsequent user input alongside the unchanged [original brief](original-brief.txt). Main-thread entries use U identifiers; the visual/engine side conversation uses V identifiers; the mechanics/construction side conversation uses M identifiers, ordered within each discussion. Product direction may be accepted here while implementation details remain proposals. U13 below explicitly authorized the initial implementation after the earlier documentation-only phase.

## U01 — starting in the wilderness

> Why start with the village instead of the wild?

This question prompted consideration of a resource-rich wilderness start instead of the assistant's initial village proposal. The question alone did not accept a complete alternative design.

## U02 — primitive society, survival, and accelerated time

> What's fiber exactly like grass? But yeah I generally like that idea. Make this a more primitive kind of society, not to the point where they're a village, but they are people with some survival knowledge, accessible resources, some possessions, etc. I don't know if the initial needs need to be that forgiving because I'm okay with agents living and dying while they figure out how to survive. I think time is one thing too. We probably need a way to have this game run at accelerated time. Maybe as a god I have that option to accelerate time at any point. But also the overall unit of time should be higher than the typical hour. Maybe 1 hour is 1 24-hour cycle, something like that, in terms of their work speed, the changing of their needs, the processing of the environment, their aging, and so on and so forth. Basic mechanics for gathering, eating, resting. A lot of the survival things that probably RimWorld has are kind of fundamental basics that maybe we just want to have built-in mechanics for to start.

Interpretation used in the updated archive:

- Accepted direction: primitive wilderness group, some survival knowledge, accessible resources and possessions, no initial village.
- Accepted correction: NPC survival need not be artificially forgiving; agents can live or die through their choices and circumstances.
- Accepted direction: seed dependable survival mechanics, explicitly including gathering, eating and resting.
- Desired capability: accelerated world time and creator/god speed control during play.
- Provisional tuning example: one real hour per 24-hour world day. Exact speed, seasons, lifespan, movement/conversation accommodations, and shared-world rules remain design questions.
- Unchanged: no game implementation; player revival and quality-of-life requirements from the original brief have not been revoked.

## U03 — Macrofold and richer agent memory

> Check out the Macrofold project in the parent folder. Do you think it would make sense to actually have each agent be a Macrofold workspace, so each agent can have its memories and everything within Macropod, or is that overkill? Would that get extremely pricey extremely quickly? How do we mitigate that? What are the trade-offs compared to the current method? Have we already thought through the technical implementation of how the memories would be stored? Ideally it's not just one text document, right, because we want to have more complex memory and access to information about their past, inner mind, and so on. That might require a whole kind of workspace.

This requests an evaluation of the sibling Macrofold project (directory `AgentCloud`) and a more concrete explanation of persistent minds. It reinforces rich structured memory beyond one text document. It does not select Macrofold or authorize game implementation. The [comparison](../02-research/macrofold-workspaces.md) and [storage proposal](../03-design-proposals/memory-storage-and-retrieval.md) distinguish inspected capabilities from recommendations.

## U04 — Vercel sandbox startup and token costs

> for macrofold this is with Vercel right. I also noticed start time for sandboxes takes a while, not sure how fixable that is. Thoughts? Also the costs you cited are not even counting LLM token costs right just compute?

The [Macrofold research document](../02-research/macrofold-workspaces.md#vercel-and-slow-startup) now separates provider boot from application startup phases, records code-level optimization candidates, and clarifies retail compute versus underlying vendor costs and model tokens. The user's observation is not yet a measured diagnosis. No optimization, benchmark or paid run was performed.

## V01 — visual evidence for Babylon.js

> What are some 2.5D games that are beautiful and made with Babylon JS? I'm looking at the Babylon JS library. The games are kind of ugly.

The follow-up research did not establish a convincing portfolio of finished Babylon.js games in the desired style. Small games and rendering demos are different evidence. This weakens the original recommendation's visual precedent; it does not establish a low visual ceiling for the engine.

## V02 — modern, grounded pixel art in a browser

> What are some alternatives then? I want this game to be beautiful to look at and browser-based. Especially beautiful pixel art. That seems to me to be the best route for 2.5D while also giving it a 3D structure and not making it too cartoony. I don't want it to be too cartoony. I want it to be compelling visuals that feel modern.

Accepted visual direction: browser delivery, beautiful detailed pixel art with genuine spatial depth, modern atmosphere and a grounded rather than strongly cartoon-like treatment. The assistant proposed pixel sprites in a 3D landscape, natural proportions/colors, atmospheric lighting and a controlled camera. Songs of Conquest and Octopath Traveler II were suggested as visual references, not browser-engine precedents or styles approved for exact imitation. Camera freedom, asset workflow, specific effects and performance budgets remain open.

## V03 — PlayCanvas and ownership of generative mechanics

> What is PlayCanvas? Is it open source? How well supported is it? What are some examples of projects that were popular and were made with it? And yeah is it potentially actually a good thing that we will build our own game engine and largely not use a prebuilt game engine (because that would pigeonhole us into certain mechanics that we're actually trying to own as custom scripts that are generative)? Or is that not the right way of thinking about it and something like Unity would actually allow for that level of flexibility?

The recommendation was to own the simulation and its scripting interface while reusing a mature engine for graphics, animation, input, audio and asset handling. PlayCanvas was favored for browser delivery and JavaScript/TypeScript integration. Unity remains capable of custom simulation; RimWorld's own object/time systems on Unity are a relevant precedent. Generated definitions and runtime executable code require different execution paths; language convenience does not remove validation or isolation needs.

## V04 — accept the recommendation and update documentation

> great, let's go with that recommendation. Let's update our docs with what we've discussed here and the important pieces that we'll want to keep in mind as we build

Recorded September 18, 2026 (America/New_York). Accepted planning direction: **PlayCanvas for the browser client, with an independent custom simulation and generative-rule interface**. This supersedes Babylon.js as the leading candidate. Preserve headless simulation, an independent simulation clock, renderer-independent data and versioned capabilities. Reuse engine infrastructure rather than building a complete graphics engine. The standalone TypeScript workflow is the proposed initial integration; the hosted editor, subscriptions, engine version, asset sources and exact camera still require selection. This request authorizes documentation updates, not game implementation, provisioning or purchases. See D02/D29 in the [decision register](../05-project/open-decisions.md).

## U08 — player controls

> Also I didn't discuss this and I'm not sure if you wrote anything down about it, but what about the player controls?
>
> Players should be able to walk around with WASD or the arrow keys and there should be key bindings to certain actions, like a key to press if they want to interact with an object. It should figure out what the nearest object is or they can click anywhere on the screen to interact.
>
> Or maybe we just start with the clicking mechanism to start because it's simpler: they click to move somewhere and then right-click to interact. That might just be simpler overall potentially. What do you think?

The assistant recommended complete mouse controls first: left-click ground to move, left-click a target to select, right-click for contextual actions, automatic approach when choosing an action, Escape to close or cancel, and visible actions for touchscreens and trackpads. WASD/arrow keys, E for a highlighted nearby target, and remappable shortcuts were proposed as later additions.

The user approved documenting that recommendation:

> Yes document those controls.

The [player controls](../03-design-proposals/world-and-player-experience.md#player-controls) now record this first-version direction and the planned keyboard additions. Navigation feedback, input focus and target highlighting are implementation guidance; exact tuning and camera controls remain open. This approval authorizes documentation, not game implementation.

## U09 — Macrofold with shared long-running workers

> what if macrofold supports long running workers that load in workspaces like that? seems like a valid use case for macrofold in general. Trying to see if using macrofold gains us anything (if it supports that) vs just home baking something for open legend

This asks for a conditional build-versus-reuse assessment. The [shared-worker proposal](../03-design-proposals/macrofold-shared-workers.md) revises the recommendation toward using Macrofold for ordinary reasoning if efficient pooled execution is available or worthwhile to build there. This is an assistant recommendation, not accepted adoption or implementation authorization. The inspected Macrofold runtime still uses a sandbox-per-run lifecycle.

## M01 — explain declarative composition

> "Declarative compositions of approved effects" explain your proposal for how this would work

The assistant explained a reusable construction recipe composed of supported material consumption, interruptible work, object creation, and environmental effects. It separated choosing a composition from implementing its component operations, and noted that the composition itself needs validation. This was an explanation, not an implemented language.

## M02 — evolving properties and modular homes

> Cool! It's a good starting point. "Describing something as “waterproof” only has a mechanical consequence when the supported shelter rules give that property meaning." and how would this mechanic be defined? This declarative template itself should be evolvable over time I think, like initially it's going to be missing a lot of properties that need to be defined later based on actions taken on it, like if someone tried to smash it, does it have a strength or integrity parameter or if someone tries to light it on fire does it have a flammability parameter, and does it have a wetness or dryness attribute that is dynamic.
>
> And say someone does “I could bind these branches together into a little house.” that should still find this lean-to. But then it should get additional properties that come with being a home, like maybe how many people can live in it comfortably, etc.
>
> But also i don't think a shelter should necessarily be one "thing", like they should be able to build walls and roofing separately maybe. Or is that too complicated? The thing is, what if they gain a family member and want to expand? it shouldn't have to evolve from a lean-to into a house and all of a sudden become a house. They should knock down a wall and expand it or something. They should be able to replace the walls with stone walls (which are harder to knock down). Thoughts?

The assistant proposed material definitions, construction properties, changing instance state, and derived behavior; versioned extension/migration of missing properties; persistent building parts; derived spaces and occupancy; and household meaning distinct from physical capabilities. A lean-to template becomes an editable construction plan. A simple grid/support model was recommended; detailed structural simulation was deferred.

## M03 — document the direction; script flexibility, semantic nuance, and fire

> Yes excellent. Document all of this. And maybe, potentially, to leave room for flexibility, parts of the declarative language should allow for arbitrary pointers to scripts.
>
> One question is: when we have this declarative language, will it leave room for semantic interactions that are more nuanced or expressive than what the declarative language captures?
>
> For example a wall may be combustible. A wall made out of wood may have pretty high combustibility but a single match with a tiny fire should not be able to light it on fire. A small twig that also has combustibility, however, should light on fire with the match.
>
> If, for example, you were to manage to light one log in the wooden wall, that fire should spread to nearby walls. The fire should get bigger and bigger and spread faster and faster as it grows. How do you think that should be represented?

Recorded September 19, 2026. Accepted documentation direction: evolving properties, dynamic material state, replaceable building parts, continuous expansion, and functional/social home meaning. Script pointers are explicitly tentative; the assistant proposes registered versioned script references with scoped effect outputs. Semantic extensibility and nuanced ignition/spread are requested design topics; the detailed thermal model and runtime remain proposals. [Evolving materials and construction](../03-design-proposals/evolving-materials-and-construction.md) and [heat/fire](../03-design-proposals/heat-and-fire.md) document the discussion. No game implementation or external changes are authorized by this documentation request.

## M04 — concern about simulation complexity

> I see you created a doc specifically for heat, ignition, and fire spread. This is just, obviously, one possible mechanic that requires, apparently, a pretty significant degree of explanation as to how this would work physically within the game. I'm curious what you think: is this going to very, very quickly get out of hand and how do we potentially mitigate that?
>
> "**The execution contract shouldn’t limit what someone can express.** It should establish how an interpreted action becomes a consistent consequence." agreed

The assistant acknowledged the risk of unbounded systems/properties and the excess depth of the initial fire exploration for a first release. It recommended coarse consistent models, reusable rule families, explicit limited connections between systems, shared script interfaces, semantic richness without unnecessary physics, and refinement tied to demonstrated gameplay value. The user accepts documenting that recommendation in M05.

## M05 — document scope control and world-level possibility rules

> yes excellent. makes sense. let's document what we discussed here in detail. Also let's start some docs specifying what should be the parameters of the world. I think every world should probably have a set of high-level parameters that define what can happen during typical gameplay and bound things. For example if someone tries to light something on fire, that mechanic can be invented, declared, and fleshed out on the fly. That's kind of the beauty of this emergent gameplay but at the same time we want to prevent impossible things from happening.
>
> If we say that an overall rule of the world is that this world mirrors real reality, then if someone tried to cast a magic spell to light a tree on fire, that shouldn't be allowed. The world classifier or the world decision-making engine should reject that and say, "You can't do that," or, with some humor or whatever in a friendly way, "You can't do that." Document that behavior too.

Recorded September 19, 2026. Accepted documentation direction: constrain complexity through coarse reusable systems and worthwhile refinements; give each world explicit parameters bounding ordinary gameplay and on-the-fly invention; reject effects inconsistent with its premise; explain rejection clearly and kindly, with optional light humor. The realistic-world/no-magical-ignition case is a required example, not a mandate that every future world use realism. The exact profile schema, classifier, numeric budgets, default preset, and admission/runtime policies remain proposals. [Complexity management](../03-design-proposals/simulation-scope-and-complexity.md) and [world parameters/feedback](../03-design-proposals/world-rules-and-parameters.md) contain the detailed design. Documentation only; no game implementation.

## M06 — review the core mechanic's unresolved risks

> Any other open questions we should discuss around how the mechanics are evolved and declared and how this remains flexible? This is one of the core mechanics of this entire game that makes it unique and also probably one of the biggest risks because of the enormous amount of complexity that it could give rise to. There are also enormous amounts of edge cases and situations that need to be accounted for in the game itself for any given moment to function correctly and be fun. Let's really think this through. What are your thoughts? What should we be thinking about here that we haven't discussed or flushed out yet?

The assistant reviewed discovery versus changing world laws; player/NPC design agency; object identity across changing uses; meaningful scoped effect APIs; combining simultaneous influences; generation latency versus simulated work; prompt-equivalence and legitimate powerful discoveries; and legible consequences. It proposed a cloak-as-roof scenario covering rain, extension, support removal, later wearing, knowledge differences, interruption, and restore. M07/M08 accept the recommendations with the clarifications below.

## M07 — discovery, AI-assisted creation, learning, and numeric systems

> yes i agree i think invention discovers the world. This requires that the world has a pretty good definition of what it is and what is allowed within it. I guess we may want to have a world creation flow where you define the parameters of the world. That should probably be an AI-assisted flow where the AI asks you questions and helps you flesh it out. By the time the world actually starts running, the world engine has a good enough grasp on what should and shouldn't be allowed. For example if I were to create a world and during the world creation flow I say, "This world behaves exactly like true reality," then the world engine doesn't really need to ask any other questions because it should be able to enforce that pretty well. If I were to say, "This world has a magical system," the world creator should probably ask me questions about:
>
> - what kind of magic system it is
> - what is allowed
> - what the fundamentals of the system are, and so on and so forth
>
> "Experimental rollout needs to respect the scope of the rule being introduced." what does this mean?
>
> "I would support broad goals while exposing a few meaningful choices: available materials, trade-offs, placement, intended use, and willingness to experiment. Routine execution can be automated once those choices are settled." I agree. I think wherever possible the world engine should invent those things and make the experience as seamless as possible for the player. It should make reasonable assumptions whenever possible and be sparing in asking the player questions about their requests. There should be cases where it can ask questions about the requests. It should just be done sparingly.
>
> "we still need to decide **how hypotheses, experiments, teaching, and successful practice become knowledge**." What do you mean by this? I think an NPC should gain knowledge when they observe something. Or experience it. Or hear about it. Through some sort of interaction.
>
> "My proposed default is narrow initial scope: supported material families, construction methods, conditions, and limits. Broader applicability can follow additional evidence." ok. And yes we should probably build up a good set of defaults over time. The world will not have everything well defined at the start but I think through my initial personal play of the game, we can define a lot of the more reasonable defaults. We can also have the AI try to enumerate a bunch of stuff that generally should be thought about when creating new rules, materials, objects, interactions, and so on.
>
> "Who determines the resulting moisture, condition, and support?" I think anything that can have an effect like this, that may have a threshold or whatever, should probably affect a number. If there's a wetness factor then drying should reduce it and observing rain should increase it. Perhaps past certain thresholds of wetness, something happens, like the wood rots or something. I don't know. Each state variable belonging to a responsible system makes sense, where other mechanics supply contributions or requests. That makes perfect sense. We should also have some way for the world to know when a mechanic is created, if a system also needs to be created (like a system that is represented by a state variable). And then when that system is created, it should probably decide on a few other ways that system can be influenced.
>
> **6. What players experience while a mechanic is being invented.**
>
> yes follow your recommendation
>
> i agree with all the rest

The assistant clarified that a familiar premise selects a substantial default library rather than promising perfect enforcement from one sentence; novel magic needs a few meaningful questions and visible assumptions. Physical applicability is separate from actor knowledge; testing a shared rule must not make identical objects obey different physics by player cohort. Learning occurs naturally from interaction with attribution and uncertainty. Actual rain changes object state; observation changes a character's knowledge. A responsible system combines numeric contributions; duration can matter as well as thresholds. New system definitions should identify likely influences without recursively implementing every related domain.

## M08 — document the decisions and anticipate undiscovered influences

> yes agreed with all of this. document it all!
>
> "Which existing actions or conditions increase or decrease it." i would just add, also what non-existing things could affect it even if those things weren't specified or "discovered" yet it should think about it a bit to preempt. But agreed it should not create every related subsystem.

Recorded September 19, 2026. Accepted direction: the M06/M07 recommendations and clarifications, plus bounded proactive consideration of plausible influences beyond the currently specified/implemented/discovered mechanics. Proposed representation: an influence record distinguishing admitted, anticipated, uncertain, and profile-forbidden relationships, with dependencies and later activation criteria. Thinking ahead does not activate a mechanic or reveal it to NPCs. [World creation and discovery](../03-design-proposals/world-creation-and-discovery.md) and [state systems/future influences](../03-design-proposals/state-systems-and-future-influences.md) detail the accepted direction and proposed implementation. This request authorizes documentation only.

## U10 — environment state and general AI workflows in Macrofold

> Would it also potentially make sense to store environment state in Macropod workspaces and run JEV inferences on top of that? What do you think? Is there a benefit to modularizing some of the other kinds of AI workflows into Macropod versus building our own kind of agent frameworks and control layers within Open Legend? Macropod, again, is our project, so we have full freedom to iterate on it and make any changes to support our use case for Open Legend. All the while, while doing that, we'll also be adding more functionality to Macropod for any other users of it as well.

The [AI-workflow and world-state proposal](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) treats the owned platform as extensible beyond its current runtime. It recommends considering generic lightweight inference, shared workers and versioned resources while Open Legend defines simulation and memory semantics. Macrofold may provide physical storage; its current workspace file API is not assumed to supply structured transactional state. This is exploration of reusable functionality, not implementation or adoption approval. Macrofold is the inspected product name; the user's wording is preserved above.

## U11 — detailed technical architecture and Macrofold implementation handoff

> Yeah seems like a big part of what we need to implement for Open Legend is a robust system for bringing the right content into the context for either Jev or agents or individual LLM calls.
>
> I'd like you to read the newest updated set of documents we've discussed a little bit more separately and write a little bit more down in the documentation for Open Legend and how we want to build it. I'd like you to especially think about:
>
> - the generative evolving declaration system, where every new interaction will potentially create new declarations and interactions to represent in the game engine and also for individual agents' interactions with the world
> - when Jev will be called, when LMs will be called, and when agents will be called
> - the tools that are available to us, including Macrofold, and the ability to architect, design, and implement Macrofold to our liking to support this in the best possible way while maintaining a reasonable separation of concerns (where Macrofold is a standalone service and can provide good abstractions in terms of AI agents and typed inference)
> - all of that, along with the traditional tools available to us, including direct LLM integrations, any available APIs, databases, standard programming, etc.
>
> I would like you to consider all of that and then consider everything that we've discussed that we want to implement within Open World so far, as well as considering any questions that we haven't answered yet and leaving room for future improvement, future changes, and future extensibility. I would also like you to always try to be modular so we can easily swap things out when and if decisions and parameters change. Considering all of that I would like you to propose an architecture in detail. In addition to what you've already written down for Open Legend, store that as technical architecture documentation and then also propose a detailed proposal of what we want to implement within Macrofold to support our use cases. Explain what kind of behavior specifically we will need in Macrofold. I am going to copy and paste that into another AI to go ahead and implement those things in Macrofold.

Recorded September 19, 2026; quote formatting normalized. This authorizes detailed documentation and a future implementation handoff, not game/platform implementation in this task. The [technical architecture set](../07-technical-architecture/README.md) covers context, routing, declaration evolution, conventional infrastructure, modular boundaries, open choices and verification. The [standalone Macrofold brief](../07-technical-architecture/macrofold-implementation-brief.md) specifies proposed platform behavior and implementation phases. "Open World" is treated as the existing Open Legend project. Recommendations remain proposals until accepted.

## U12 — outsider critique and architecture revision

> I want to review everything. I want you to review everything you just created and pretend you're an outsider. Critique yourself and make any adjustments that you think would make this:
>
> - more modular
> - robust
> - extensible
> - something that we can implement and sequence properly
> - something that is also technically feasible and allows for all of the functionality that we desire

Recorded September 19, 2026; quote formatting normalized. The [architecture review and delivery plan](../07-technical-architecture/review-and-delivery-plan.md) records the critique, changes, smaller initial slices, later feature gates and coverage. The system, context, declaration and Macrofold documents were revised directly. No implementation, benchmark or validation of runtime guarantees is implied by this review.

## M09 — clarify the first world-engine MVP

> Anything else we need to discuss and agree on here before we start the initial MVP implementation of just the very first version of this world engine?

The assistant proposed a small native/no-model checkpoint and a carrying-bundle composition. M10 corrects the implied first-playable boundary: internal engineering fixtures can remain small, but the first playable product must already contain live AI and useful emergent survival.

## M10 — live AI, generated tools, hunting, and pause from the first version

> How can it run without AI? The agent needs to constantly make decisions now and we need to be able to talk to the agent. I think that's a pretty key mechanic here. Creating the auto generation needs to be AI-generated so we need to be using Java and LLMs in the first version of this. Yeah I think pause and speed controls are good. We should definitely have those. Yeah I agree it should be paused while we're not playing it, at least for now. I generally agree with all the other stuff. I think I should be able to, in this first version, start to do some emergent stuff:
>
> - find some resources
> - create a sling
> - kill some animals with the sling
> - eat those animals
> - maybe make an arrow out of grass, wood, and bone and kill animals with that
>
> Should be able to do some stuff like that

The assistant accepted the correction: live decisions, NPC conversation and actual AI-generated mechanics belong in the first playable version. It explicitly interpreted “Java” as **Jev**, the semantic service under discussion, not a language selection. It proposed one small map/NPC, resource discovery, a generated sling recipe, equipment/ammunition, basic animal reactions/damage/death, finite harvesting, preparation/eating, and another invention using a shared projectile family, with bow-and-arrow as the candidate. Material suitability and a launcher still matter; plausible phrasing does not guarantee success.

The assistant distinguished continuous autonomous activity from model calls every tick: live LLMs handle conversation, goals, meaningful replanning and generation; Jev handles suitable bounded classifications; native code handles work, movement, needs and committed physical effects. No-model fixtures remain useful engineering tests, not the playable deliverable. Pause/speed and pausing while away were accepted, with no offline simulation and no scheduling autonomous AI while absent. Exact rates, operational limits, credentials and development spend remain unresolved. Detailed physics, large populations and G2 are deferred. The assistant did not implement or invoke paid services.

## M11 — document the revised MVP agreement

> Okay agreed. Document that.

Recorded September 19, 2026. This accepts documenting the M10 correction and the assistant's proposed small live-AI creative loop. The [first playable MVP](../05-project/first-playable-mvp.md) records scope, native versus generated responsibilities, absence behavior and acceptance evidence. The roadmap and technical delivery sequence distinguish internal checkpoints from the complete first playable milestone. Exact recipes/balance remain proposals, and the bow-and-arrow example retains its tentative status as the second-invention candidate. Documentation only; no game implementation or paid integration is authorized by this request.

## U13 — implement the first playable version

> Okay now I would like you to implement the first version of Open Legend. Read all the documentation that we've created in this repo to fully understand the project at hand and implement the first version, which is documented in a doc somewhere, first playable MVP Spec.

The user explicitly authorized implementation, emphasizing foundational generalizable primitives, modular replaceable components, evolving expressions/declarations/interactions, open-source code quality, useful comments and developer documentation. Native world/simulation logic should handle all suitable routine work; Jev should aggressively route, deflect and decide bounded cases before expensive inference; LLMs should still produce meaningful thoughts, complex decisions and new mechanics where needed. This supersedes prior documentation-only restrictions for Open Legend. It does not authorize modifying Macrofold, buying services or unlimited paid inference.

The executable version and remaining live-acceptance requirements are recorded in [implementation status](../05-project/implementation-status.md), [current architecture](../../docs/architecture.md) and [verification](../../docs/verification.md).
