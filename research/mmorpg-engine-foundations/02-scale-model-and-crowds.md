# Scale model, physical crowds and dense encounters

[Collection](README.md) · [Sources](sources.md)

## There is no single player-count scaling problem

Separate connected humans, native bodies, autonomous decisions, independently active locations, candidate interactions, actual recipients, changed bytes and retained history. A thousand spectators can share physical computation but require substantial delivery. A thousand explorers can activate much more terrain and NPC life. A crowded battle combines several demanding dimensions.

Count each actual entity's authoritative progression once, not once per nearby human. Shared NPCs and compatible scene preparation offer amortization; independent conversations, personal evidence and real audience bytes still cost work. Human control does not automatically require a full autonomous model-decision budget for every avatar, nor does it remove the installed native/psychological responses. Measure the actual control and activity mix rather than multiply one small NPC-heavy scene by player count.

OpenLegend's cognition and memory differ from conventional MMO workloads, but this does not establish that every OpenLegend scene is heavier than every other game's scene. Jagex's cycle and population description is a useful contrast, not a conversion factor [S02].

## What physical exclusion actually buys

Assume bodies have a positive minimum occupied footprint, cannot overlap, inhabit a bounded number of vertical layers, and affect a bounded local radius. Nearby-body count then has a population-independent geometric bound. Indexed local interactions can approach linear total work as the world expands instead of every actor examining every other actor.

The constants still matter. Minimum body size, vehicles, attachments, piles, floors, movement during an interval and effect reach determine the bound. Tiny bodies, arbitrary summoning or unbounded influence require another envelope. Keep fictional rules in the authored world, not universal human-size engine constants.

For intuition only, at one person per square metre on one plane, a radius of 10 metres contains about 314 people and a radius of 30 metres about 2,827, away from crowd edges. Five thousand people occupy approximately a 71-by-71-metre square. These are hypothetical geometry calculations, not real-world crowd-safety guidance, selected body dimensions or game-capacity predictions.

Finite density therefore does not imply a small encounter. Contact, distant vision, speech, alarms and broad effects each need their own conservative candidate and actual-recipient model. In this planar example the candidate area grows with the square of radius.

## Local degree is not connected-component size

A line in which each person interacts with two neighbours can still connect the entire population. Contacts, attached bodies, structural forces, shared resources or synchronized effects can span many cells. Box2D's island discussion explains why connected groups matter for scheduling and sleeping [S08].

This does not make the entire group serial. Candidate discovery, independent calculations, suitable constraint batches and reductions may parallelize. Establish independence from the operation rather than from a grid boundary. Measure coupled-component size, propagation, boundary exchange and the ordered critical path alongside local density. Moving a tightly coupled encounter between machines can add more coordination than capacity.

## Visibility and delivery remain separate

Individual all-to-all updates among 5,000 people entail 24,995,000 directed sender-recipient relationships per update opportunity. That is not necessarily a packet count: selective delivery, change suppression, shared preparation and batching can reduce actual work. Batching alone cannot remove genuine recipient information or authorization costs.

Blizzard's Ahn'Qiraj account illustrates concentrated communication growth [S01]. Epic's replication graph illustrates reusable relevance preparation instead of repeating every actor-by-client test [S05]. For OpenLegend, share compatible objective geometry and source preparation, then preserve each observer's reception, identity, freshness and permissions. Shared computation is not shared knowledge.

Presentation detail, evidence precision and mechanical effect are separate. A distant body may be drawn cheaply without becoming nonexistent or immune to an admitted effect. Aggregate crowd perception, when selected by the world, must retain individual exceptions and source precision; it cannot manufacture an exact transcript or names afterward. Client interest filtering must not silently determine authoritative collision or attack eligibility.

## Player value and the first crowd candidate

**A busy place should create more possibilities for individuals.** A market or gathering can offer competing conversations, recognizable residents and local opportunities without every person interpreting every utterance. A player can seek someone out; that encounter becomes meaningful without upgrading the entire crowd to equally detailed deliberation. Attention and scenes, ordinary speech and the existing character-quality owners already supply the relevant foundations. Aggregate recognition is not permission to erase identity or bypass actual hearing.

**Space can contribute to play rather than merely ration compute.** Routes, sightlines and bodily obstruction can make approaching a speaker, protecting an entrance or moving supplies consequential. These are proposed uses of the existing spatial and campaign owners, not new mandatory combat or transport mechanics. Evaluate whether physical crowding creates understandable choices or merely frustrating body-blocking. Preserve escape routes and control; congestion is not a successful multiplayer experience because the server remains responsive.

**One shared event can support different useful roles without splitting its reality.** Existing shared-campaign designs can connect local opportunities to one consequential outcome. A distant participant need not receive every foreground detail to make a real contribution. This is not a substitute for testing a large shared hotspot, nor permission to create duplicate bosses or silently move friends into different copies. Likewise, purposeful distributed settlements can give exploration and return value; empty distance and forced dispersal are not capacity evidence.

**Proposed first movement comparison:** separate goal/navigation choice, advisory local avoidance, authoritative body clearance and any deliberately supported pushing. Start by evaluating occupancy-limited kinematic movement against the existing movement semantics, rather than assuming ordinary locomotion must solve a fully pushable rigid-body crowd. Compare reciprocal avoidance only where its assumptions fit. A cheap advisory choice never authorizes penetration, ignores a stationary blocker or commandeers human steering.

The physical owner must decide whether moving bodies exchange force or simply stop/slide when obstructed. Removing existing pushing would be a behavior change, not a free optimization. No such rule is selected here. Required contact handling must still cover the whole admitted motion interval and all relevant blockers. Stable resolution, refusal and useful recovery from a blocked route matter more than an attractive open-field demo.

ORCA demonstrates inexpensive reciprocal local avoidance under its assumptions [S10]. Uncooperative players, doors and mixed body sizes make those assumptions material; RVO2 explicitly warns that overly restrictive neighbour parameters can make avoidance unsafe [S11]. Do not use a capped advisory neighbour list as proof that authoritative collision is complete.

A first scoped design should cover two opposing flows, stationary blockers and an individual interaction during movement; include corners, larger bodies, vertical overlap or moving support when the supported family consumes them. Measure entry/exit, deadlock/replanning and representation maintenance, not just steady motion. The [dense-encounter brief](../../docs/maintainers/decisions/mmorpg-engine-foundations.md#dense-encounters-and-separate-fidelity-budgets) routes this proposal to existing owners.

## Preserve agency while reducing cognitive work

Existing plans, admitted continuations, native reactions and event/deadline-driven opportunities can continue without a fresh language-model decision every simulation step. Distinguish optional reflection, a required response with a deadline, and an accepted outcome that cannot be dropped. Direct conversation, a threat or a consequential commitment can require individual service in a large crowd.

Separate **world-authored limited attention** from **host overload**. A naturally crowded scene may have declared hearing/focus limits; a player must not be able to make a guard forget required evidence or lose an already-promised defense merely by creating load. Apply defined rules consistently, not a hidden global crowd flag. Optional scheduling must include fairness and aging so an unfocused resident does not starve indefinitely; delayed opportunities need revalidation, not an accumulated obligation to perform stale thoughts.

Detail changes are prospective. Reuse current state, personal history and existing continuation when focus changes; do not recreate the person, replay rewards or generate unexperienced memories. Base promotion on relevant interactions and dependencies, not just distance to a camera. Use bounded transition work and hysteresis where useful, include cold arrival and a sudden burst of direct demands, and make service pressure visible through the existing admission owner.

The selected compact-expression design saves work before full prose is generated while retaining independent contributions and interpretations. Other reductions in perception, social deliberation, combat or economic outcomes remain explicit comparisons with their current owners. They must name the observable change, the preserved individual cases and the quality evidence; “any compromise may be considered” does not mean every compromise is already adopted.

## Optimization order and geographical meaning

Remove repeated work first: maintained candidate indexes, dirty/due selection, compatible source preparation and genuinely changed permitted products. Then measure parallel work inside the encounter, including input copying, ordered merging and memory traffic. Race freedom alone does not establish deterministic outcomes [S09]. Evaluate cheaper representations or world rules explicitly rather than quietly skipping required work.

Spatial locality is useful immediately for queries and residency. Transparent same-host or cross-machine ownership can support one continuous shared encounter; it is not equivalent to capping a town, splitting a battle, instancing friends apart or forcing travel to spread load. Use transparent distribution when a measured bottleneck warrants its coordination cost. Reserve gameplay separation/admission compromises for an explicitly demonstrated operating problem after reasonable work reduction and within-encounter parallelism; a grid is not the explanation for why a larger encounter is impossible.

A vast world can reduce ordinary concentration but cannot guarantee avoidance of a capital, rare event or coordinated gathering. Qualify both dispersed and concentrated play. A blocked entrant still consumes connection and nearby-service resources; people queued outside are not supported active encounter capacity. Arrival fairness, safe waiting/return and existing obligations belong to the [capacity contract](../../docs/product-scalability/capacity-and-economics.md), not a second congestion policy here.

The conditional opportunity is substantial: if supported interactions, active working sets, required recipient detail and global coordination remain bounded or composable, additional resources can support more useful activity. Neither a 5,000-player complete OpenLegend battle nor its impossibility is established by the sources. Seek the largest quality-qualified envelope rather than assuming either infinite scaling or a small fixed cap.
