# Crowds and individually simulated actors

| Research status                                      | Progress                                                                                                                                                                 | Last updated |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed research panel; no implementation selected | Primary-source investigation of UEBS2, crowd navigation, individual simulation, cognition and execution costs; implications connected to existing Open Legend contracts. | 2026-10-23   |

## Main finding

**A large population can consist of real, distinct individuals without performing a complete, independent deliberation and path search for every individual on every frame.** Sharing executable rules, terrain calculations or processing batches does not inherently merge identities, memories, goals or outcomes. The crucial distinction is between sharing work that is equivalent and replacing meaningful individual differences with an approximation.

Ultimate Epic Battle Simulator 2 is a useful example of the first possibility. Its developer describes separate health, positions, enemies and decisions in a GPU-resident crowd pipeline. Its public material also documents narrow navigation geometry, very cheap distant meshes and approximated mass ragdolls. It does **not** disclose enough to identify its exact route-search, targeting or simulation-scheduling algorithms. Claims that it definitely uses flow fields, independent A\* per soldier, Unity ECS, behavioral LOD, or one collective army mind would exceed the evidence. See the [UEBS2 dossier](uebs2.md) and its [primary developer explanation](https://steamcommunity.com/app/1468720/discussions/0/3110267314129208740/).

The broader research is encouraging for Open Legend's ambition of hundreds of meaningful actors. It is not evidence that Open Legend already meets that capacity, or that hundreds of large-model characters can deliberate continuously at game-frame rates. Population, active interactions, decision cadence, hardware, and the behavioral promises being preserved all matter.

The payoff is more than a larger visible crowd: individual animals can become recognizable inhabitants, established intentions can make people dependable, and different witnesses can make discovery and intervention worthwhile. These are [hypothetical gameplay opportunities](open-legend-implications.md#what-larger-populations-could-add-to-play), with evidence questions beyond speed. Sophistication can vary during the same individual's life; this research does not assume permanent classes of rich named characters and simple background characters. The [research-to-design map](open-legend-implications.md#7-research-to-design-map) routes the findings into existing completed designs and unfinished qualification without another architecture or backlog.

## Reading guide

| Question                                                                                 | Research document                                                                  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| What is actually known about UEBS2, and what is inference?                               | [UEBS2 evidence](uebs2.md)                                                         |
| How can units have separate destinations without separate complete searches every frame? | [Navigation and local motion](navigation-and-local-motion.md)                      |
| How do games preserve, simplify, generate or aggregate individuals?                      | [Games and individual simulation](games-and-individual-simulation.md)              |
| What do scientific agent simulations and LLM societies actually demonstrate?             | [Cognition and agent systems](cognition-and-agent-systems.md)                      |
| What do batching, GPU execution, animation LOD and browser APIs each contribute?         | [Execution, rendering and browser constraints](execution-rendering-and-browser.md) |
| What lessons and unresolved questions matter to the existing project?                    | [Open Legend implications](open-legend-implications.md)                            |
| How should the impressive numbers and source quality be interpreted?                     | [Evidence and performance guide](evidence-and-performance.md)                      |

## What “independent” needs to mean

The following distinctions are analytical, not a claim that every surveyed system implements all of them.

| Commitment                    | Example                                                     | What can remain shared or inexpensive                                                       |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Individual identity           | The same injured animal remains identifiable tomorrow       | Storage and update machinery                                                                |
| Individual state and history  | Two animals have different hunger, injuries and experiences | Common rules applied to different inputs                                                    |
| Individual intention          | One person travels home while another seeks food            | Previously computed route segments or a retained activity                                   |
| Individual reaction           | A nearby threat changes one actor's behavior                | Local tests and a common reaction policy                                                    |
| Individual cognition          | A decision uses that person's knowledge and commitments     | Scheduling, execution infrastructure and unchanged contextual facts, where semantics permit |
| Fully independent computation | Everyone recomputes every answer from scratch               | This is a much stronger and usually unnecessary requirement                                 |

Five commonly conflated economies make different promises:

1. **Batching** organizes many separate calculations efficiently.
2. **Reuse** avoids recomputing an answer that remains valid for the relevant actors.
3. **Reduced frequency** keeps a result or activity until reconsideration is needed; this can change responsiveness or outcomes.
4. **Approximation or aggregation** simplifies an answer or represents several agents collectively; this can discard individual information.
5. **Presentation detail** changes what is drawn, animated or transmitted; it need not change simulation truth.

These are not interchangeable. A 100-triangle distant soldier can still have unique health. A procedurally generated biography can be convincing without having existed before inspection. A real remembered intention can guide many seconds of cheap movement. The dossiers identify which kind of claim each source supports.

## The strongest lessons across the research

**Share geographical work where the question is genuinely shared.** Supreme Commander 2's firsthand engineering account describes cached flow-field tiles, high-level graph search and individual steering. Factorio's developer reports describe avoiding unnecessary searches, caching successful and failed work, and using a terrain hierarchy to guide detailed search. These preserve individual units while reducing redundant computation. They do not establish UEBS2's algorithm. [Navigation dossier](navigation-and-local-motion.md); [game case studies](games-and-individual-simulation.md).

**Retain an intention while inexpensive behavior carries it out.** The Sims separates simulation decisions from frequent path following and animation. Lyfe agents retain a high-level option until lower-cost termination conditions call for reconsideration. These are different systems, but both challenge the assumption that visible continuous action requires continuous expensive thought. [Game case studies](games-and-individual-simulation.md); [cognition dossier](cognition-and-agent-systems.md).

**Give each performance figure a workload and a clock.** A brain update, a collision-avoidance step, a five-minute social decision round and a complete rendered frame are different measurements. Scientific simulations can retain billions of individual numerical agents while taking tens of seconds per iteration. Large LLM societies can operate faster than their modeled social clock while individual calls still take minutes. [Evidence guide](evidence-and-performance.md).

**Density and coupling can matter more than total population.** A thousand dispersed animals with small neighborhoods can present a different problem from a hundred actors competing at one doorway. Spatial search reduces candidate discovery; it cannot remove genuine interactions. Local avoidance alone does not guarantee arrival, fair access to a destination, or coherent social behavior. [Navigation dossier](navigation-and-local-motion.md).

**Preserve the distinctions the game promises.** S.T.A.L.K.E.R.'s coarse remote individuals, Project Zomboid's historical group-level animal representation, and Watch Dogs: Legion's creation of missing identities on inspection make different commitments. They are useful comparisons, not interchangeable definitions of a continuously simulated person. [Game case studies](games-and-individual-simulation.md).

## Scope and project status

This is a research panel, based on public developer material, official documentation, original papers and a separately identified public crowd-code example. It did not run UEBS2, execute third-party code, benchmark Open Legend, purchase services, or change runtime code. Historical statements are dated; inaccessible talks and undisclosed internals remain explicit limitations.

Project comparisons use `Macrofold/OpenLegend` main at `d1299aaf7cd834efbc9937e31c81efa3773b8418`. Current behavior and accepted policy remain owned by [architecture](../../docs/architecture.md), [performance](../../docs/performance.md), and [maintainer performance qualification](../../docs/maintainers/performance.md). This collection neither selects an engine migration nor closes population-capacity work. The [existing engine/hardware research](../game-engines/performance-and-hardware.md) provides complementary platform context.
