# Design follow-ups — user steering

This file preserves subsequent user input alongside the unchanged [original brief](original-brief.txt). Main-thread entries use U identifiers; the visual/engine side conversation uses V identifiers, ordered within that discussion. Product direction may be accepted here while implementation details remain proposals. No implementation has been requested.

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

## U10 — environment state and general AI workflows in Macrofold

> Would it also potentially make sense to store environment state in Macropod workspaces and run JEV inferences on top of that? What do you think? Is there a benefit to modularizing some of the other kinds of AI workflows into Macropod versus building our own kind of agent frameworks and control layers within Open Legend? Macropod, again, is our project, so we have full freedom to iterate on it and make any changes to support our use case for Open Legend. All the while, while doing that, we'll also be adding more functionality to Macropod for any other users of it as well.

The [AI-workflow and world-state proposal](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) treats the owned platform as extensible beyond its current runtime. It recommends considering generic lightweight inference, shared workers and versioned resources while Open Legend defines simulation and memory semantics. Macrofold may provide physical storage; its current workspace file API is not assumed to supply structured transactional state. This is exploration of reusable functionality, not implementation or adoption approval. Macrofold is the inspected product name; the user's wording is preserved above.
