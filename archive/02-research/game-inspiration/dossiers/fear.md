# F.E.A.R. — planning without a hand-authored transition for every situation

**Coverage: AI, planning, coordination and simulation research only. Reviewed October 14, 2026.** This is not a completed full-game R01–R15 dossier. The subject is the original F.E.A.R. architecture described by its developer in 2006, not every sequel or a newly audited executable.

[Topic synthesis](../synthesis/characters-companions-and-relationships.md) · [Research requirements](../research-requirements.md)

## Evidence and implementation boundary

Jeff Orkin's developer paper describes a small execution state machine beneath goal-oriented action planning. Developers supply goals, actions, prerequisites and effects; search constructs the action sequence. Shared working memory exposes facts across behaviors. Some checks require procedural evaluation rather than symbolic facts. A failed attempt can supply information that changes the next plan. The documented door example progresses through unsuccessful approaches to an alternative entrance. [F1, pp. 2–12]

The squad layer is **not entirely emergent coordination**. A coordinator forms squads, selects authored squad behaviors and issues orders; individual goals still participate in arbitration. This is a hybrid of explicit team direction and individual planning, not evidence that every apparent flanking maneuver arose independently. [F1, pp. 13–15]

The paper establishes historical implementation intent and developer-observed behavior. It does not establish open-ended personal understanding, long-term autobiographical memory, current hardware throughput or an OpenLegend performance result. The working-memory and squad diagrams were inspected in addition to the extracted text.

## What is intelligent, and what is authored?

The important distinction is between **authoring the language of possible action** and **authoring every sentence in that language**. A planner can combine understood means in a new order without possessing a broad understanding of the world. The authoring burden moves toward correct prerequisites, effects and costs; it does not disappear.

For OpenLegend, this suggests separating three questions:

| Question | Possible responsibility | Failure to avoid |
| --- | --- | --- |
| What is this person trying to accomplish, and why now? | Character cognition, with personal evidence and commitments. | A combat or survival priority silently becoming everyone's values. |
| Which known means could accomplish that chosen purpose? | A bounded planner or reusable procedure, where the world supports it. | Revealing an unknown method because the engine can calculate it. |
| What actually happens when the person attempts it? | The authoritative simulation. | Treating a planner's predicted effect as a committed outcome. |

These are proposed applications, not descriptions of new OpenLegend facilities.

## A complete hypothetical application

A person has chosen to deliver medicine before an agreed time. A blocked passage invalidates the selected route. Finding another ordinary route within the accepted time and danger allowance should not require reconsidering the person's friendship, profession and life goals.

Breaking into a neighbor's home is different. It may solve the same geometric problem, but adds a social cost that the original intention did not authorize. A planner that optimizes only travel time can produce a technically successful but personally incoherent solution. The character should reconsider rather than letting route repair choose whether trespassing is acceptable.

After arrival, medicine still has to be transferred through the real ownership and interaction rules. A failed delivery is evidence for the character, not permission to narrate success. Once the purpose is satisfied, the activity should finish rather than repeatedly searching for more deliveries. A later conversation can interpret the outcome without rewriting it.

## Transferable lessons and costs

**Borrow composition before bespoke exceptions.** Reusable action prerequisites and outcomes can reduce a growing list of special transitions. Start with methods the person actually knows and a small current activity; a general planner over every possible world action would introduce a much larger search and maintenance problem.

**Retain failure knowledge at the appropriate level.** A failed attempt can invalidate a particular route or assumption. It should not automatically teach a general law, establish another person's motive, or suppress all superficially similar attempts forever. Invalidation needs an object, place, method or condition precise enough to become useful later.

**Make coordinated intent explicit.** Cooperation benefits from knowing who accepted which role, what result is expected and what ends the agreement. A shared plan is not a shared mind: participants can refuse, withdraw, misunderstand or lack information known to the organizer.

**Do not mistake a small executor for a small total system.** Search, candidate preparation, world queries, coordination and debugging remain costs. Measure the complete decision path and the work avoided by retaining a valid plan, not merely the number of states in its executor.

## Counterexamples and evidence that would change the recommendation

A short fixed interaction can be simpler and more reliable than search. A genuinely novel social dilemma may require interpretation rather than more symbolic planning. A person with conflicting obligations may reasonably reject the shortest or most productive route.

The proposed transfer would be weakened if maintaining symbolic effects becomes more expensive than the repeated decisions it replaces, if the planner repeatedly offers unknown or unacceptable methods, or if useful alternatives are missed by aggressive candidate pruning. Compare those errors with a simpler reusable procedure before introducing broader planning infrastructure.

## Sources and remaining research boundary

**F1.** Jeff Orkin, *Three States and a Plan: The A.I. of F.E.A.R.*, GDC 2006, developer-authored paper. [PDF](https://www.gamedevs.org/uploads/three-states-plan-ai-of-fear.pdf). Read the architecture, working-memory, planning and squad sections; inspected the relevant diagrams. This pass does not claim a gameplay test, current source audit, measured player-perception effect, reception survey or modding investigation.

No implementation project or new engine policy is authorized by this dossier.
