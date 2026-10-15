# Shadows of Doubt — routine activity becomes discoverable evidence

**G159 · Topic-only AI, memory and simulation research · October 14, 2026.** This supplies focused evidence for a previously queued subject; it does not complete its full-game R01–R15 research pass. The main implementation source below is explicitly a **2018 prototype**, not a verified description of the shipped game's current controller.

[Main NPC guide](../synthesis/characters-companions-and-relationships.md) · [Pass inventory](../research-progress-intelligent-simulation-2026-10-14.md)

## What the primary source establishes

Cole Jefferies describes hundreds of citizens with daily journeys, work, food and leisure preferences. The prototype calculated ordinary daily activities in a batch before the day, then recalculated exceptional deviations during play. It also recorded sightings through visibility checks. Witness memories could lose temporal precision, with recognition and circumstances influencing retention. The same post says lying still needed detailed exploration: that idea is not counted as a demonstrated complete deception system. Its police-department management framing also differs from the later game's presentation. [SD1]

This is unusually relevant because the ordinary activity is not just visual ambience. The author explicitly connects it to finding witnesses and reconstructing an investigation. But the prototype's assumption that only a handful of people need concurrent deviations is a workload assumption, not a general guarantee. A citywide emergency could invalidate it.

## What to borrow, and what not to assume

**Amortize a decision over ordinary activity.** Choosing a bounded routine can avoid selecting each destination or work step independently. For OpenLegend, the routine should express a character's adopted intention rather than a universally compulsory occupation schedule. A later choice can change its importance even when all physical prerequisites still hold.

**Retain the causal trail that the experience needs.** An investigation requires more than a plausible answer when questioned. Who was where, what was observable, which person noticed it and what they later say are distinct facts. The underlying event can remain exact while a person's recollection becomes uncertain. A generated testimony should not retroactively create the sighting it claims to recall.

**Treat expensive exceptions as an explicit budget risk.** Precomputation works best while its assumptions remain stable. Frequent player interaction, public danger or a relationship conflict can change many plans together. Compare ordinary throughput with those bursts; an average day is not sufficient qualification.

**Do not import a global observation loop unchanged.** The reported sighting approach makes the authoring intention clear, but it does not establish a scalable all-pairs solution. A spatial candidate query could reduce repeated comparisons while preserving actual visibility checks. This is our engineering hypothesis, not a claim that the later game uses that exact method.

## A hypothetical OpenLegend encounter

A person stops at a workshop on the way to an agreed meeting. Another person briefly sees them carrying an unfamiliar object. The meeting is missed after a real interruption. Later, the witness can describe only what was actually visible, with their own uncertainty; they cannot identify the object's hidden owner or explain why the traveler was delayed.

The traveler may apologize, offer evidence, refuse to discuss the interruption or conclude that the agreement was unreasonable. The other participant can interpret the delay differently. A cheap routine provides the ordinary continuity; remembered evidence and cognition make this particular deviation meaningful.

Returning to work the next day need not erase the episode, and retaining the episode need not force every later conversation to mention it. The important test is whether the relevant experience can affect a later choice when it matters.

## Costs and contrary cases

A detailed witness simulation may be unnecessary for an anonymous decorative crowd. Conversely, a few highly consequential people may justify more precise activity and evidence than a large undifferentiated population. Do not use the same fidelity label for both promises.

The useful unit of optimization is the represented consequence, not only the number of moving citizens. Advancing a day rapidly must preserve the times when another participant could interact or intervene. When a cheaper model does not represent an exact encounter, later narration should not pretend that it did.

## Source and coverage boundary

**SD1.** Cole Jefferies, *Shadows of Doubt DevBlog 8: Simulating a City*, September 15, 2018. [Developer post](https://colepowered.com/shadows-of-doubt-devblog-8-simulating-a-city/). The complete main article was read. Its timing figures, sighting rules and planned deception concern that prototype; no current executable, source code, player study or performance benchmark was inspected.

Full mechanics, release evolution, critical/player reception, production history and modding remain outside this topic-only pass. No new OpenLegend schedule, forgetting policy or investigation subsystem is approved here.
