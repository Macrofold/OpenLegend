# Scale model, physical crowds and dense encounters

[Collection](README.md) · [Sources](sources.md)

## There is no single player-count scaling problem

Track connected humans, actively simulated characters, independently active locations, candidate interaction pairs, actual recipients, changed bytes, retained history and external decisions separately. A thousand people watching one quiet scene can share substantial physical computation but incur substantial delivery cost. A thousand people exploring independently can activate far more terrain, navigation and NPC life. A crowded battle combines many of the worst dimensions.

Heavy NPC cognition makes OpenLegend's workload different from conventional MMO examples. It does not justify the empirical claim that every OpenLegend workload is heavier than every other game's workload. NPCs, replicated objects, online accounts and model calls are not interchangeable units. Jagex's published cycle and population description is a useful contrast, not a conversion factor for OpenLegend capacity [S02].

## What physical exclusion actually buys

Assume, provisionally, that bodies have a positive minimum occupied footprint, cannot overlap, inhabit a bounded number of vertical layers, and affect only a bounded local radius. Under these assumptions, the number of nearby bodies has a population-independent upper bound determined by geometry. Indexed local interactions can then approach linear total work as the world expands, instead of every actor examining every other actor.

That is a useful architectural opportunity. It is not enough to say “people cannot fit.” The bound depends on minimum body size, attachments, vehicles, piles and multiple floors, motion during the interval, effect reach, and the exact query. A fictional world with tiny bodies, arbitrary summoning or unbounded influence needs a different envelope. Keep these rules in the authored world; do not make human dimensions universal engine constants.

For intuition only, at a hypothetical density of one person per square metre on one plane, a radius of 10 metres contains about 314 people and a radius of 30 metres about 2,827, away from crowd edges. Five thousand people occupy about a 71-by-71-metre square at that density. These are geometry illustrations, not safe real-world crowd guidance, selected body dimensions or predicted game performance. Finite physical density can still leave thousands within a visual or audible region.

The radius matters quadratically in this planar example. Reducing the cost of contact checks does not automatically reduce the cost of receiving a speech, seeing a distant army, hearing an alarm, or resolving a broad magical effect. Each family needs its own conservative candidate and actual-recipient model.

## Local degree is not connected-component size

Imagine a line of people, each interacting only with two neighbours. Every person's local degree is small, but the line can connect the entire population. Chains of collision constraints, attached bodies, structural forces, resource dependencies or synchronized effects can similarly span many cells.

Box2D's island discussion explains why connected constraint groups matter for scheduling and sleep/wake behavior [S08]. This does not imply that a large connected group must execute entirely serially. Broad-phase work, independent calculations, reductions and suitable substeps may still parallelize. It means independence must be established from the operation, not inferred from a grid boundary.

Consequently, evaluate the largest coupled component, dependency propagation distance, boundary exchange, and critical ordered phase as well as actors per square metre. A partition that reduces actors per owner but increases synchronization can be slower than keeping the encounter on one well-utilized machine.

## Visibility and delivery remain separate

If every one of 5,000 people needs an individual update about every other person, there are 24,995,000 directed sender-recipient pairs for one update opportunity. This is arithmetic, not a claim that the game must transmit that many packets: aggregation, interest management, change suppression and shared preparation can reduce actual work substantially. Batching packets alone does not remove all per-recipient information or authorization costs.

Blizzard's Ahn'Qiraj account directly illustrates the importance of communication fan-out and choosing what is communicated when, rather than expecting hardware alone to absorb concentrated population [S01]. Epic's replication graph demonstrates reusable relevance preparation instead of repeated actor-by-client selection [S05]. Neither grants permission to share one person's private knowledge with another.

For OpenLegend, share objective geometry or other receiver-independent preparation when valid. Then apply each consumer's reception, identity, freshness and permission rules. Shared computation is not shared perception. A common crowd representation, should one be adopted, must preserve individual exceptions and avoid retroactively inventing exact observations.

## A productive order for crowd work

First remove repeated work without changing what happens: maintain candidate indexes, avoid rebuilding identical scene inputs per observer, reuse compatible immutable data, and send only genuinely changed permitted products. Keep detailed action continuation separate from optional deliberation and presentation cadence.

Next investigate parallel work within the encounter, not only across distant areas. Measure where useful tasks exist, how much data they read, what must be ordered, and whether memory traffic or shared publication becomes the limit. Stable deterministic merges are preferable to making results depend on thread completion order; race freedom alone is insufficient [S09].

Then evaluate cheaper representations for explicitly selected behavior. Possible examples include lower-detail distant crowd presentation, compact background communication, less frequent optional reflection, or a cheaper movement-avoidance family. Each is a separate behavior or fidelity choice with its own owner. Do not combine all of them into a single hidden “crowd mode.”

Finally consider a measured admission or gameplay fallback when the optimized, supported workload still exceeds its envelope. This is a sequence of engineering options, not a requirement to exhaust every conceivable optimization before shipping a smaller enjoyable game.

## Crowd motion is a narrow subsystem, not a complete scale solution

ORCA provides a useful example of inexpensive reciprocal local avoidance and large-agent demonstrations [S10]. Its assumptions matter: human players may deliberately refuse cooperative motion, collide, block doors or create adversarial configurations. The RVO2 documentation explicitly warns that restrictive neighbour settings can undermine avoidance safety [S11]. A neighbour cap is not a correctness-preserving optimization merely because it makes work bounded.

A future movement comparison should distinguish navigation towards a goal, local avoidance, authoritative nonpenetration, contact consequences and player control. They need not use one algorithm. Keep actual collision and valid input admission authoritative even when optional planning becomes cheaper. A crowd demo with simple discs and no personal memory does not establish a complete OpenLegend encounter.

Assess narrow corridors, opposing flows, stationary blockers, large bodies, queues turning back, moving platforms, corners, vertical overlap and entry from a cold region. Include the cost of maintaining the representation and recovering from deadlock, not only steady movement in an open field. These are qualification scenarios, not a request to implement their mechanics here.

## Preserve agency while reducing cognitive work

A crowd does not require everyone to generate a fresh natural-language decision every simulation step. Existing plans, admitted continuations, native reactions and event/deadline-driven opportunities can keep working while optional thinking waits. The foundation must distinguish a missed optional opportunity from a delayed required response and from an accepted outcome that cannot be dropped.

Do not turn off all perception or cognition indiscriminately. A nearby threat, direct conversation, significant commitment or newly acquired evidence may require individual service even amid a crowd. The engine must support the selected world's priority and fallback rules without assuming that every expensive process is equally urgent or every background NPC is disposable.

Reducing full-prose generation before it happens can save provider work. Generating the same dialogue and summarizing it afterward does not. The existing compact-expression design already owns the selected version of this idea. Any broader approximate social, combat or economic outcome remains a proposal, with prospective transitions and honest uncertainty rather than invented exact history.

## Vast geography and physical congestion

A world with many valuable places can reduce routine concentration. It cannot guarantee that players will avoid a capital, market, rare event or coordinated siege. Design both dispersed and concentrated workloads; one is not a substitute for the other.

Physical occupancy can make movement and crowd behavior legible, but it can also turn overload into body-blocking, unusable entrances or griefing. A physically blocked player may still consume connection, nearby perception, queue and AI resources. Congestion is not successful capacity merely because the additional players are standing outside a door.

Later arrival/admission design may reserve destination capacity, preserve a safe waiting or return state, and avoid starving residents or reconnecting participants. Such policies need explicit participation and fairness decisions. The present research selects no queue, loading screen, forced teleport, fixed sector cap or artificial wall.

## Geography is useful without being the only solution

Use spatial locality early for candidate selection and data residency. Use multicore execution wherever calculations are genuinely independent, including within a busy place. Use authority cells when their ownership/lifecycle benefits are consumed. Add machines when the complete workload justifies their communication and coordination costs. These are distinct steps, not alternatives that require proving all others impossible.

The strongest conditional scalability claim is therefore: if the world's supported interactions, active working sets, recipient detail and required global coordination remain bounded or suitably composable, added resources can support substantially more useful activity. The conditions must be demonstrated. No source reviewed here proves either a 5,000-player OpenLegend battle or that it is impossible.
