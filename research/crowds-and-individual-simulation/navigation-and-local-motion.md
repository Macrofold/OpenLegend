# Navigation and local motion for many individual actors

| Research status | Progress | Last updated |
| --- | --- | --- |
| Completed desk research; not a benchmark | Examines shared navigation, individual steering, joint planning and their limits. No Open Legend implementation is selected. | 2026-10-23 |

## 1. Individual actors can share navigation work

An individually simulated character does not need to calculate a complete route every displayed frame. It needs a movement decision appropriate to its own state and objective. Those are different requirements.

Consider animals approaching a watering hole. Their identities, hunger, injuries, relationships and positions can remain distinct while they reuse an answer to “how do I get through this valley?” Each animal can still respond differently to a nearby predator or another animal blocking its immediate movement. Shared geographical computation does not require shared desires or a single collective body.

There are several separate meanings of independence:

| Property | What it preserves | What can still be shared |
| --- | --- | --- |
| Persistent identity | One actor remains the same actor over time | Storage layout and execution machinery |
| Individual state | Different positions, attributes, memories and current activities | Rules operating on those values |
| Individual objectives | Different actors can want different outcomes | Intermediate route segments and terrain knowledge, when equivalent |
| Individual reactions | Nearby actors can choose different immediate movements | A steering algorithm or learned policy |
| Independent computation | Each actor solves everything separately | Very little; this is a stronger requirement than individuality itself |

The primary sources below demonstrate different combinations. Supreme Commander 2 shares route calculations while steering separate units. ORCA computes separate velocities from local interactions. Continuum Crowds deliberately derives motion from fields for groups with common goals. These are materially different compromises; none establishes UEBS2's undisclosed algorithms. The [UEBS2 dossier](uebs2.md) separates that game's disclosures from inference.

**Research inference:** the useful question is which differences between actors affect the answer. Reusing an equivalent calculation preserves those differences. Replacing different answers with one group average can remove them. “Batching” alone does not identify which operation occurred.

## 2. Pathfinding, avoidance and arrival are different problems

| Responsibility | Question it answers | Typical limitation when treated alone |
| --- | --- | --- |
| Goal selection | What does this actor want to do? | Choosing a destination does not establish a feasible route |
| Global navigation | Which terrain, passages and intermediate locations lead there? | A route can become crowded or temporarily blocked |
| Local steering and avoidance | Which immediate movement works around nearby bodies? | Locally safe movement can stall without reaching the goal |
| Arrival and interaction | Where can this actor stand, wait or use the destination? | Several actors may compete for one usable place |
| Joint planning through time | Which combination of routes avoids mutual conflicts? | Stronger coordination can require much more computation |
| Locomotion and presentation | How is movement physically and visually expressed? | Smooth animation does not establish correct navigation |

The distinction between global navigation and local avoidance is explicit in the [ORCA paper](https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf): its office agents receive preferred velocities following globally planned routes. The avoidance method does not choose those routes for them.

An actor moving around another actor has not necessarily invalidated its entire journey. Likewise, a target shifting a short distance may only change the final approach. Conversely, getting into the correct room does not decide who occupies the one free position beside an object. These distinctions explain both the opportunities for reuse and the difficulties that remain after global route searches become cheap.

## 3. Supreme Commander 2: cached flow fields with individual steering

Elijah Emerson's firsthand [Game AI Pro chapter](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf), published in 2013, describes SC2's tiled flow fields. A* searches a graph of passages between sectors. Cached tiles then provide directions through the local terrain, and individual units steer using them. Tiles are associated with exit portals, allowing reuse even across different final destinations. Different movement capabilities require different cost data.

An unobstructed final goal permits direct steering. A moving goal causes its tile to be rebuilt; crossing a sector boundary also revises the higher-level route, retaining reusable tiles. Changed terrain marks affected data dirty. Prioritized rebuilding is spread over time. Units can slide or be displaced without immediately requesting a complete replacement path.

This is a clear example of route reuse preserving individual motion. The chapter discusses hundreds to thousands of agents but supplies no reproducible hardware/FPS benchmark. **GPU field construction appears as future work**, so this source does not establish GPU pathfinding in shipped SC2.

Emerson also [linked a Planetary Annihilation development stream in a March 2013 answer](https://gamedev.stackexchange.com/questions/387/how-does-flow-field-pathfinding-work). That establishes a firsthand research lead; the stream was not reviewed here, so it is not used to reconstruct PA's final implementation.

### What can prevent reuse?

The following is analysis of the shared-question principle, not a restriction stated for every flow-field implementation. Two actors can share geographical work when the relevant world representation and movement costs agree. Different body clearances, terrain permissions, goals, danger preferences or knowledge can make their questions different.

A person who fears a bridge and another who does not may prefer different routes. A person unaware of a passage should not silently acquire knowledge of it through a shared answer. Common intermediate passages can still permit reuse even when final destinations differ, but a crowd with many distinct objectives generally provides less obvious sharing than an army attacking one location.

## 4. Two different ways to produce believable collective motion

### Boids: individual local rules

Craig Reynolds' [Boids explanation](https://www.red3d.com/cwr/boids/) describes the model developed in 1986 and published in 1987. Each boid reacts to nearby flockmates through separation, alignment and cohesion. Behavior uses a distance-and-angle neighborhood rather than requiring a global flock plan. Collective shapes emerge from individual reactions.

Reynolds contrasts naive all-pairs neighborhood discovery with spatially organized search that can approach linear scaling. This depends on useful locality; it is not a worst-case promise for every density. Boids establishes that simple individual rules can create convincing movement. It does not, by itself, supply hunger, memory, resource competition, predation, social identity or complete routing around difficult obstacles.

For animals, this is a particularly useful conceptual result: complicated-looking motion need not imply expensive deliberation. The additional behaviors required to make those animals meaningful remain separate research questions.

### Continuum Crowds: shared fields for common-goal groups

[Continuum Crowds](https://grail.cs.washington.edu/projects/crowd-flows/78-treuille.pdf), by Treuille, Cooper and Popović at SIGGRAPH 2006, explicitly targets groups with common goals rather than distinctly different intentions for every person. Individual positions move through a field influenced by density and obstacles. This is an intentional group-level approximation of movement decisions. Finite grid resolution can allow overlaps, so the implementation adds pairwise distance correction, itself imperfect.

Its historical simulator updated at 2–5 steps per second on a 3.4 GHz Pentium with a Quadro FX 3400. A concurrent renderer interpolated at 24 FPS, or 12 FPS in the 10,000-person example. Those figures are not current capacity estimates. They demonstrate that smooth presentation can coexist with substantially less frequent simulation updates, and that visible people do not establish independent route reasoning.

## 5. ORCA and ClearPath: separate decisions, parallel execution

### ORCA and the boundary of a local guarantee

The original [ORCA research](https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf), presented at ISRR 2009 and published in 2011, allocates reciprocal avoidance responsibility and solves a small velocity-selection problem per agent. Its guarantees depend on simplified shapes, holonomic movement, accurate positions and velocities, and cooperative adherence. Dense constraints can be infeasible; a fallback can sacrifice the preferred direction. Applying realistic turning or acceleration limits afterward removes the original strict guarantee.

The authors report 5,000 agents on eight 2.66 GHz Xeon Clovertown cores: 8 ms for all collision-avoidance linear programs in a circle scenario, and 15.6 ms to update the office agents. These are avoidance/agent-update measurements, not complete game frames with rich cognition.

[RVO2's official version 2.0 documentation](https://gamma-web.iacs.umd.edu/RVO2/documentation/2.0/whatsnew.html) reinforces the boundary: applications supply preferred velocities, and the earlier global-roadmap facility was removed. The library retains kd-tree neighbor searching. An avoidance library is therefore not automatically a full navigation or behavior system.

### ClearPath and a misleading performance headline to avoid

[ClearPath](https://gamma-web.iacs.umd.edu/CA/ClearPath.pdf), published at SCA 2009, uses vector instructions and threads for local collision avoidance while retaining each agent's separate problem. Dense regions generate more work, so the implementation distributes small tasks dynamically rather than simply assigning equal agent counts to each thread.

The paper reports 10,000 agents at 36 FPS on an actual quad-core Xeon X5460 running at 3.14 GHz. Its much larger or faster Larrabee examples come from a **cycle-accurate architecture simulator**, not observed GPU hardware. Its comparison table explicitly warns that different scenarios, behavior models and machines prevent fair direct rankings. Conservative avoidance can also miss an available route; collision avoidance is not proof of eventual arrival.

These examples matter because parallel work and individualized results coexist. They do not demonstrate the cost of persistent memories or broad cognition, covered in [cognition and agent systems](cognition-and-agent-systems.md).

## 6. Distinct destinations at scale: warehouse multi-agent planning

When many actors must reach different places without occupying conflicting positions at conflicting times, the problem changes. Warehouse robotics research makes this distinction especially visible. Its goals and movement rules are usually more constrained than those of an open-world character, while its coordination requirements can be stronger than a crowd renderer's.

### Rolling-Horizon Collision Resolution

Li and colleagues' [AAAI 2021 RHCR paper](https://jiaoyangli.me/files/2021-AAAI-2.pdf) resolves conflicts over a finite future window, executes part of the plan, and replans. This avoids settling distant conflicts that later assignments could invalidate. Agents have separately changing destinations.

The paper reports up to 1,000 agents in simulated warehouses. Its 1,000-agent sorting case uses directed traffic, PBS, a planning horizon of five steps and replanning every five steps; each planning call averages 10.97 seconds on an EC2 m4.xlarge with 16 GB memory. This is not a 1,000-agent interactive-game benchmark. The method also gives up completeness and optimality: maximizing total throughput can indefinitely disadvantage one agent.

The transferable observation is that planning horizon, fairness and guarantees are separate variables. A short-horizon method can retain individual destinations while deliberately limiting how much of their shared future is solved at once.

### SILLM: shared learned behavior with individual actions

[SILLM](https://arxiv.org/abs/2410.21415), a 2024 preprint published at ICRA 2025, combines imitation learning, spatial communication, heuristic collision resolution and global guidance. Shared policy parameters produce different actions from individual observations. Its tests use synchronized movement on four-neighbor grids; “throughput” means goals completed per simulated step.

The paper reports 10,000 virtual agents at a mean 0.349 seconds per planning step; a dynamic-guidance-only variant takes 0.721 seconds. The headline variant selects guidance by map. Training hardware is documented, but the retrieved text does not clearly specify the main evaluation allocation. The physical demonstration uses 10 robots alongside a separate 100-virtual-robot example, not 10,000 physical machines.

This illustrates shared learned computation with individual destinations. It does not demonstrate general cognition or establish a real-time game budget. It also shows why a learned policy's headline result must be attributed to the complete surrounding system, including its conflict-resolution machinery.

## 7. Where efficient crowds still fail

The table combines consequences visible across the cited studies with explicit analytical deductions. It describes questions to investigate, not a proposed Open Legend implementation.

| Condition | Why it changes the problem |
| --- | --- |
| Many agents in one small area | A spatial query can still return most of the population; locality stops saving much work |
| Opposing traffic through a narrow passage | Separate locally reasonable decisions can impede one another; some coordination may be necessary |
| Many actors approaching one exact destination | Reaching the vicinity does not allocate standing space or access to the destination |
| Many unique goals or movement constraints | Fewer route questions are equivalent, reducing straightforward cache reuse |
| Rapidly changing terrain or threats | Previously valid navigation may require repeated invalidation and rebuilding |
| Nonreciprocal or physically constrained movement | Local-avoidance assumptions can fail when an actor cannot or will not take its expected share of avoidance |
| Strong fairness or arrival guarantees | High total flow does not ensure that every particular individual eventually succeeds |
| Large perception neighborhoods | Candidate interactions increase even if the movement calculation itself stays simple |

### Spatial indexing changes the search, not the number of real interactions

For reasoning about cost, let \(N\) be the actor count and \(k\) the average number of candidate neighbors. Local interaction work often resembles \(N k\), in addition to maintaining the index. If density keeps \(k\) modest, increasing the population over a larger landscape can remain manageable. If everyone gathers in one neighborhood, \(k\) can grow with \(N\), approaching quadratic interaction work again. This is analytical bookkeeping, not an Open Legend measurement.

An arbitrary limit on examined neighbors changes which interactions are considered. Depending on the behavior, that can alter fairness, perception, physical response or avoidance guarantees. It should not be described as a costless optimization. Exact distance, visibility and relevance are also different filters: being nearby does not automatically mean visible, recognized or behaviorally important.

### Destination behavior deserves separate attention

Dru Erridge's firsthand [2018 account of The Maestros](https://www.gamedeveloper.com/programming/group-pathfinding-movement-in-rts-style-games) describes how individually shortest routes converged at corners and destinations, creating congestion. Formation offsets and pushing rules generated further edge cases. Updating navigation obstacles for moving units became impractical with a few hundred units in that particular UDK implementation. This is a qualitative developer observation, not a universal engine capacity limit.

The broader consequence is that path length alone is an incomplete quality measure. An actor may take a slightly longer route and arrive more reliably. A visually busy crowd may conceal actors making no useful progress. A flock passing through open terrain and named characters competing for a specific object therefore require different scrutiny.

## 8. What this research establishes for Open Legend

The evidence supports three observations without selecting a solution.

First, **persistent individuality is compatible with substantial shared execution and shared navigation**. Independent identities do not require redundant global searches. Different parameters and local inputs can produce varied behavior through the same rules.

Second, **movement sophistication and cognitive sophistication are different costs**. A large crowd can have convincing motion with limited decision state. Preserving individual memories, beliefs, relationships and knowledge introduces additional work that these navigation experiments do not measure. Conversely, a character need not repeatedly reconsider a stable intention merely because its position is changing.

Third, **the difficult cases depend on semantics as well as scale**. A loose flock, dense combat, a queue, a named character pursuing a private goal, and several actors interacting with one unique resource expose different limits. Claims about capacity must specify which of these interactions are preserved and what errors are acceptable.

Useful unresolved research questions include how much navigation information is genuinely equivalent across actors, which events invalidate an existing intention or route, how localized congestion affects the worst frame, and which arrival or fairness guarantees matter to the experience. The [Open Legend implications](open-legend-implications.md) connects these questions to the project's existing contracts. [Execution and rendering](execution-rendering-and-browser.md) separately examines how smooth presentation and computational layout affect the budget.

## 9. Evidence limits

All performance figures are author-reported results for the stated workloads; this study ran no benchmark. No result establishes Open Legend's present capacity or transfers automatically to browser execution. Primary Total War and Age of Empires IV talk materials were located, but retrieval did not provide enough readable technical detail to reconstruct their algorithms responsibly. They are follow-up leads rather than evidence used for the conclusions above.
