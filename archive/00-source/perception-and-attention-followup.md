# Perception and attention follow-up

Recorded September 19, 2026. This is a faithful **summary, not a verbatim transcript**, of the user's follow-up after the time-controls work. Requirements F62–F67 and decisions D51–D54 track it. The [perception and attention proposal](../07-technical-architecture/perception-and-attention.md) distinguishes these requests from suggested implementation choices.

The user explicitly ends with: “Let's document all of this. Don't implement it yet.”

## Requested direction

- Explain how visible and audible exposure currently work and whether their range is limited.
- Add a toggleable player indication of sight and hearing. A light dotted perimeter was suggested, then gradients for hearing and possibly vision. A circle is sufficient initially, with flexible shapes later for walls and other obstacles. Being inside a house should reduce hearing beyond its walls.
- Make distance affect what can be perceived: nearby objects can be inspected in detail, medium-distance objects less so, and distant objects only coarsely. Sound weakens with distance; a decibel-like representation is one possibility.
- Give every object a visual footprint and description. Standard objects such as trees can share descriptions; distinctive instance states need appropriate descriptions. Provide close, medium and distant text, and make only the exposure-appropriate description accessible to the character or agent.
- Represent audible footprints primarily as events/actions, such as smashing a window, rather than requiring every sound to belong to an enduring object. Some effects may also be attached to objects.
- Support state properties with parameters, such as how much a tree is burning, or a chopped-down tree. Fire could be a separately represented effect attached to the tree. These are alternatives to explore, not a settled schema.
- Load the appropriate visual and audible evidence into character context. New exposure should create a semantic decision opportunity where appropriate, with Jev deciding whether to react or think; avoid hundreds of calls as ordinary objects enter and leave view.
- People/other agents entering view should always create decision points. Mundane objects generally should not, unless relevant to current priorities. A tree should become interesting when seeking wood.
- Support arbitrary new goals, actions and intentions rather than a predetermined vocabulary. Maintain a semantic index of world objects, updated as objects are added or change, and use semantic search to discover what is relevant when an intent changes. Events and other information may also deserve indexing. The user moved from an object cache idea toward an index; the resulting attention subscriptions remain a proposed implementation.
- Physical and emotional need threshold crossings should create decision points. Persistent serious need should recur; the example was below 20% hunger and a thought at least every hour. The proposal must clarify meter direction, simulated time, and how reminders interact with paid-call limits.
- Make the visual field broad and aligned with the player's experience: on-screen things within the character's line of sight should be visible to the character; off-screen things or things the player cannot see should not supply current visual knowledge.

## Not settled by the request

Exact ranges, detail thresholds, acoustic units, overlay colors/defaults, camera/zoom limits, background-play perception, semantic index implementation, batching/cooldowns and the frequency of paid thoughts remain design choices. The request does not authorize runtime changes, new services, embeddings or paid inference. The proposal records recommendations and unresolved tradeoffs rather than presenting them as implemented behavior.

## Subsequent request: implement a visual experiment

Later on September 19, the user asked to remove the visible right-click menu title and experiment with heavily blurred scenery beyond a clear vision boundary instead of abruptly disappearing objects. They explicitly rejected darkness as the indicator, requested substantially greater sight range so ordinary on-screen objects are generally visible, and deferred detailed line of sight. This authorizes the limited runtime experiment documented in [architecture](../../docs/architecture.md); the broader attention, semantic description and acoustic proposals above remain future work. The chosen 28-unit radius and blur transition are implementation tuning choices, not user-specified constants.
